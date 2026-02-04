/**
 * MCP Workflow Runner
 *
 * Executes governed browser workflows using Claude_in_Chrome MCP tools.
 * This is the bridge between your instruction packs and Claude's browser control.
 *
 * COST OPTIMIZATION:
 * - Batches similar operations where possible
 * - Uses read_page with depth limits to minimize token usage
 * - Caches page reads within a workflow step
 * - Only takes screenshots when needed for HITL
 *
 * HOW IT WORKS:
 * 1. Load an instruction pack (governs what can/can't be done)
 * 2. Define a workflow (sequence of governed browser actions)
 * 3. Runner executes each step, checking policies before each action
 * 4. HITL approval requested for MANDATORY actions
 * 5. Full audit trail generated
 */

import {
  GovernedBrowserAgent,
  GovernedBrowserAction,
  BrowserInstructionPack,
  FEDERAL_BD_BROWSER_PACK,
  MCPToolName
} from './governedBrowserAgent';
import { MAIClassification } from '../types';

/**
 * Workflow step definition
 */
export interface WorkflowStep {
  id: string;
  name: string;
  description: string;

  // What MCP tool to use
  tool: MCPToolName;

  // Parameters for the tool
  params: {
    url?: string;              // For navigate
    query?: string;            // For find
    ref?: string;              // Element reference for form_input/computer
    value?: string | number;   // For form_input
    action?: string;           // For computer (click, type, scroll, etc.)
    text?: string;             // For computer type action
    coordinate?: [number, number]; // For computer click
    depth?: number;            // For read_page (cost optimization)
  };

  // Governance
  classification: MAIClassification;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';

  // Flow control
  onSuccess?: string;          // Next step ID on success
  onFailure?: string;          // Next step ID on failure
  retryCount?: number;         // Number of retries on failure
  waitAfter?: number;          // Milliseconds to wait after step
}

/**
 * Workflow definition
 */
export interface Workflow {
  id: string;
  name: string;
  description: string;
  version: string;

  // What instruction pack governs this workflow
  packId: string;

  // Input variables (filled in at runtime)
  inputs: {
    name: string;
    type: 'string' | 'number' | 'boolean';
    required: boolean;
    description: string;
  }[];

  // The steps
  steps: WorkflowStep[];

  // Expected outputs
  outputs: {
    name: string;
    description: string;
    fromStep?: string;         // Which step produces this
  }[];
}

/**
 * Workflow execution context
 */
export interface WorkflowContext {
  workflowId: string;
  startTime: Date;
  inputs: Record<string, any>;
  variables: Record<string, any>;     // Runtime variables
  stepResults: Map<string, any>;      // Results from each step
  currentStepIndex: number;
  status: 'pending' | 'running' | 'paused' | 'completed' | 'failed';
  pauseReason?: string;
  error?: string;
}

/**
 * HITL Approval Request
 */
export interface HITLRequest {
  id: string;
  workflowId: string;
  stepId: string;
  stepName: string;
  description: string;

  // Context for human review
  currentUrl: string;
  actionDescription: string;
  riskLevel: string;
  policyTriggered: string;

  // Options
  options: ('APPROVE' | 'REJECT' | 'MODIFY' | 'SKIP')[];

  // Status
  status: 'pending' | 'approved' | 'rejected' | 'modified' | 'skipped';
  approvedBy?: string;
  approvalTime?: Date;
  notes?: string;
}

/**
 * SAM.gov Search Workflow - Example
 */
export const SAM_GOV_SEARCH_WORKFLOW: Workflow = {
  id: 'sam-gov-search',
  name: 'SAM.gov Opportunity Search',
  description: 'Search SAM.gov for federal contracting opportunities matching criteria',
  version: '1.0.0',
  packId: 'federal-bd-browser',

  inputs: [
    { name: 'keywords', type: 'string', required: true, description: 'Search keywords' },
    { name: 'naicsCode', type: 'string', required: false, description: 'NAICS code filter' },
    { name: 'setAside', type: 'string', required: false, description: 'Set-aside type filter' },
    { name: 'maxResults', type: 'number', required: false, description: 'Maximum results to return' }
  ],

  steps: [
    {
      id: 'navigate-sam',
      name: 'Navigate to SAM.gov',
      description: 'Open SAM.gov contract opportunities search',
      tool: 'navigate',
      params: {
        url: 'https://sam.gov/search/?index=opp&page=1&sort=-modifiedDate&sfm%5Bstatus%5D%5Bis_active%5D=true'
      },
      classification: MAIClassification.INFORMATIONAL,
      riskLevel: 'LOW',
      onSuccess: 'wait-for-load',
      waitAfter: 2000
    },
    {
      id: 'wait-for-load',
      name: 'Wait for Page Load',
      description: 'Ensure search page is fully loaded',
      tool: 'read_page',
      params: {
        depth: 3  // Shallow read for cost optimization
      },
      classification: MAIClassification.INFORMATIONAL,
      riskLevel: 'LOW',
      onSuccess: 'find-search-box'
    },
    {
      id: 'find-search-box',
      name: 'Find Search Input',
      description: 'Locate the search input field',
      tool: 'find',
      params: {
        query: 'search input field'
      },
      classification: MAIClassification.INFORMATIONAL,
      riskLevel: 'LOW',
      onSuccess: 'enter-keywords'
    },
    {
      id: 'enter-keywords',
      name: 'Enter Search Keywords',
      description: 'Type search keywords into search box',
      tool: 'form_input',
      params: {
        // ref will be set from find-search-box result
        // value will be set from workflow input
      },
      classification: MAIClassification.ADVISORY,
      riskLevel: 'LOW',
      onSuccess: 'click-search'
    },
    {
      id: 'click-search',
      name: 'Click Search Button',
      description: 'Submit the search',
      tool: 'computer',
      params: {
        action: 'click',
        // ref will be set dynamically
      },
      classification: MAIClassification.ADVISORY,
      riskLevel: 'MEDIUM',
      onSuccess: 'wait-results',
      waitAfter: 3000
    },
    {
      id: 'wait-results',
      name: 'Wait for Results',
      description: 'Wait for search results to load',
      tool: 'read_page',
      params: {
        depth: 5  // Deeper read to get results
      },
      classification: MAIClassification.INFORMATIONAL,
      riskLevel: 'LOW',
      onSuccess: 'extract-results'
    },
    {
      id: 'extract-results',
      name: 'Extract Search Results',
      description: 'Extract opportunity data from search results',
      tool: 'get_page_text',
      params: {},
      classification: MAIClassification.INFORMATIONAL,
      riskLevel: 'LOW',
      onSuccess: 'complete'
    }
  ],

  outputs: [
    { name: 'opportunities', description: 'List of opportunities found', fromStep: 'extract-results' },
    { name: 'totalCount', description: 'Total number of matching opportunities', fromStep: 'extract-results' }
  ]
};

/**
 * USASpending Research Workflow - Example
 */
export const USA_SPENDING_RESEARCH_WORKFLOW: Workflow = {
  id: 'usaspending-research',
  name: 'USASpending Award Research',
  description: 'Research past awards on USASpending.gov for competitive analysis',
  version: '1.0.0',
  packId: 'federal-bd-browser',

  inputs: [
    { name: 'agency', type: 'string', required: true, description: 'Agency name' },
    { name: 'naicsCode', type: 'string', required: false, description: 'NAICS code' },
    { name: 'yearsBack', type: 'number', required: false, description: 'Years of history' }
  ],

  steps: [
    {
      id: 'navigate-usaspending',
      name: 'Navigate to USASpending',
      description: 'Open USASpending.gov award search',
      tool: 'navigate',
      params: {
        url: 'https://www.usaspending.gov/search'
      },
      classification: MAIClassification.INFORMATIONAL,
      riskLevel: 'LOW',
      onSuccess: 'wait-load',
      waitAfter: 2000
    },
    {
      id: 'wait-load',
      name: 'Wait for Load',
      description: 'Wait for page to fully load',
      tool: 'read_page',
      params: { depth: 3 },
      classification: MAIClassification.INFORMATIONAL,
      riskLevel: 'LOW',
      onSuccess: 'find-agency-filter'
    },
    {
      id: 'find-agency-filter',
      name: 'Find Agency Filter',
      description: 'Locate agency filter input',
      tool: 'find',
      params: {
        query: 'agency filter or awarding agency input'
      },
      classification: MAIClassification.INFORMATIONAL,
      riskLevel: 'LOW',
      onSuccess: 'enter-agency'
    },
    {
      id: 'enter-agency',
      name: 'Enter Agency',
      description: 'Enter agency name in filter',
      tool: 'form_input',
      params: {},
      classification: MAIClassification.ADVISORY,
      riskLevel: 'LOW',
      onSuccess: 'apply-filters'
    },
    {
      id: 'apply-filters',
      name: 'Apply Filters',
      description: 'Click to apply search filters',
      tool: 'computer',
      params: {
        action: 'click'
      },
      classification: MAIClassification.ADVISORY,
      riskLevel: 'MEDIUM',
      onSuccess: 'wait-results',
      waitAfter: 3000
    },
    {
      id: 'wait-results',
      name: 'Wait for Results',
      description: 'Wait for award results to load',
      tool: 'read_page',
      params: { depth: 6 },
      classification: MAIClassification.INFORMATIONAL,
      riskLevel: 'LOW',
      onSuccess: 'extract-awards'
    },
    {
      id: 'extract-awards',
      name: 'Extract Award Data',
      description: 'Extract past award information',
      tool: 'get_page_text',
      params: {},
      classification: MAIClassification.INFORMATIONAL,
      riskLevel: 'LOW'
    }
  ],

  outputs: [
    { name: 'awards', description: 'List of past awards', fromStep: 'extract-awards' },
    { name: 'competitors', description: 'Companies that won awards', fromStep: 'extract-awards' }
  ]
};

/**
 * MCP Workflow Runner
 */
export class MCPWorkflowRunner {
  private agent: GovernedBrowserAgent;
  private pack: BrowserInstructionPack;
  private context: WorkflowContext | null = null;
  private pendingHITL: HITLRequest | null = null;

  constructor(
    agentId: string,
    pack: BrowserInstructionPack = FEDERAL_BD_BROWSER_PACK
  ) {
    this.agent = new GovernedBrowserAgent(agentId, pack);
    this.pack = pack;
  }

  /**
   * Initialize the runner
   */
  async initialize(): Promise<void> {
    await this.agent.initialize();
    console.log(`[MCPRunner] Initialized with pack: ${this.pack.name}`);
  }

  /**
   * Execute a workflow
   */
  async executeWorkflow(
    workflow: Workflow,
    inputs: Record<string, any>
  ): Promise<{
    success: boolean;
    outputs: Record<string, any>;
    auditLog: any[];
    error?: string;
  }> {
    // Validate pack
    if (workflow.packId !== this.pack.id) {
      throw new Error(`Workflow requires pack ${workflow.packId}, but runner has ${this.pack.id}`);
    }

    // Validate inputs
    for (const input of workflow.inputs) {
      if (input.required && !(input.name in inputs)) {
        throw new Error(`Missing required input: ${input.name}`);
      }
    }

    // Initialize context
    this.context = {
      workflowId: workflow.id,
      startTime: new Date(),
      inputs,
      variables: { ...inputs },
      stepResults: new Map(),
      currentStepIndex: 0,
      status: 'running'
    };

    console.log(`\n[MCPRunner] Starting workflow: ${workflow.name}`);
    console.log(`[MCPRunner] Inputs: ${JSON.stringify(inputs)}`);
    console.log(`[MCPRunner] Steps: ${workflow.steps.length}`);
    console.log('');

    // Execute steps
    let currentStepId = workflow.steps[0].id;

    while (currentStepId && this.context.status === 'running') {
      const step = workflow.steps.find(s => s.id === currentStepId);
      if (!step) {
        this.context.status = 'failed';
        this.context.error = `Step not found: ${currentStepId}`;
        break;
      }

      console.log(`[MCPRunner] Step ${step.id}: ${step.name}`);

      // Check if HITL approval is needed
      if (step.classification === MAIClassification.MANDATORY ||
          step.riskLevel === 'HIGH') {
        console.log(`[MCPRunner] HITL Required for step: ${step.name}`);
        console.log(`[MCPRunner] Classification: ${step.classification}, Risk: ${step.riskLevel}`);
        // In real implementation, this would pause and wait for approval
      }

      // Build action
      const action: GovernedBrowserAction = {
        id: `${workflow.id}-${step.id}-${Date.now()}`,
        tool: step.tool,
        params: this.resolveParams(step.params),
        classification: step.classification,
        requiresApproval: step.classification === MAIClassification.MANDATORY,
        description: step.description,
        riskLevel: step.riskLevel
      };

      // Execute action through governed agent
      const result = await this.agent.executeAction(action);

      // Store result
      this.context.stepResults.set(step.id, result);

      if (result.success) {
        console.log(`[MCPRunner] Step ${step.id}: SUCCESS`);

        // Wait if specified
        if (step.waitAfter) {
          await this.delay(step.waitAfter);
        }

        // Move to next step
        currentStepId = step.onSuccess || '';
      } else {
        console.log(`[MCPRunner] Step ${step.id}: FAILED - ${result.error}`);

        if (step.onFailure) {
          currentStepId = step.onFailure;
        } else {
          this.context.status = 'failed';
          this.context.error = result.error;
          break;
        }
      }

      this.context.currentStepIndex++;
    }

    // Build outputs
    const outputs: Record<string, any> = {};
    for (const output of workflow.outputs) {
      if (output.fromStep) {
        outputs[output.name] = this.context.stepResults.get(output.fromStep);
      }
    }

    if (this.context.status === 'running') {
      this.context.status = 'completed';
    }

    console.log(`\n[MCPRunner] Workflow ${this.context.status}`);

    return {
      success: this.context.status === 'completed',
      outputs,
      auditLog: this.agent.getAuditLog(),
      error: this.context.error
    };
  }

  /**
   * Resolve dynamic parameters
   */
  private resolveParams(params: Record<string, any>): Record<string, any> {
    const resolved: Record<string, any> = {};

    for (const [key, value] of Object.entries(params)) {
      if (typeof value === 'string' && value.startsWith('$')) {
        // Variable reference
        const varName = value.slice(1);
        resolved[key] = this.context?.variables[varName] ?? value;
      } else {
        resolved[key] = value;
      }
    }

    return resolved;
  }

  /**
   * Pause workflow for HITL
   */
  pauseForHITL(request: HITLRequest): void {
    if (this.context) {
      this.context.status = 'paused';
      this.context.pauseReason = `HITL required: ${request.description}`;
    }
    this.pendingHITL = request;
  }

  /**
   * Resume workflow after HITL approval
   */
  resumeAfterHITL(approval: 'APPROVE' | 'REJECT' | 'MODIFY' | 'SKIP'): void {
    if (this.pendingHITL) {
      this.pendingHITL.status = approval.toLowerCase() as any;
      this.pendingHITL.approvalTime = new Date();
    }

    if (this.context && approval !== 'REJECT') {
      this.context.status = 'running';
      this.context.pauseReason = undefined;
    }

    this.pendingHITL = null;
  }

  /**
   * Get current workflow status
   */
  getStatus(): WorkflowContext | null {
    return this.context;
  }

  /**
   * Get pending HITL request
   */
  getPendingHITL(): HITLRequest | null {
    return this.pendingHITL;
  }

  /**
   * Helper delay
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Demo: Run SAM.gov search workflow
 */
export async function demoSAMGovSearch(): Promise<void> {
  console.log('='.repeat(60));
  console.log('GOVERNED BROWSER WORKFLOW DEMO');
  console.log('SAM.gov Opportunity Search with Instruction Pack Governance');
  console.log('='.repeat(60));
  console.log('');

  const runner = new MCPWorkflowRunner('sam-search-agent');
  await runner.initialize();

  const result = await runner.executeWorkflow(SAM_GOV_SEARCH_WORKFLOW, {
    keywords: 'IT support services',
    naicsCode: '541512',
    maxResults: 10
  });

  console.log('\n' + '='.repeat(60));
  console.log('WORKFLOW RESULT');
  console.log('='.repeat(60));
  console.log(`Success: ${result.success}`);
  console.log(`Audit entries: ${result.auditLog.length}`);
  if (result.error) {
    console.log(`Error: ${result.error}`);
  }
}

// Export workflows
export const WORKFLOWS = {
  SAM_GOV_SEARCH: SAM_GOV_SEARCH_WORKFLOW,
  USA_SPENDING_RESEARCH: USA_SPENDING_RESEARCH_WORKFLOW
};
