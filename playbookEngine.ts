/**
 * ACE Playbook Engine
 * Universal browser automation with tight MAI governance
 *
 * Enables:
 * - Industry-agnostic workflow automation
 * - Job-level task sequences
 * - Chrome extension "skill packs"
 * - Tight governance boundaries
 *
 * Use Cases:
 * - Procurement: RFP research, vendor validation, compliance checks
 * - Legal: Case research, document review, docket monitoring
 * - HR: Candidate screening, background checks, offer letter prep
 * - Compliance: Audit trails, regulatory research, reporting
 * - Healthcare: Claims processing, prior auth, eligibility verification
 */

import { GovernedBrowserAgent, BrowserAgentConfig, ChromeExtensionConfig } from './browserAgent';
import { MAIClassification } from './types';

/**
 * Playbook Step - Individual action in a workflow
 */
export interface PlaybookStep {
  id: string;
  instruction: string;
  expectedOutcome: string;
  classification: MAIClassification;
  maxRetries?: number;
  timeout?: number;
  variables?: Record<string, string>;
  conditions?: {
    skipIf?: string;
    requireIf?: string;
  };
}

/**
 * Industry Pack - Pre-configured extensions for specific domains
 */
export interface IndustryPack {
  id: string;
  name: string;
  description: string;
  extensions: ChromeExtensionConfig[];
  playbooks: string[];
}

/**
 * Playbook - Reusable workflow definition
 */
export interface Playbook {
  id: string;
  name: string;
  description: string;
  industry: string;
  jobRole: string;
  version: string;
  steps: PlaybookStep[];
  requiredExtensions: string[];
  defaultClassification: MAIClassification;
  estimatedDuration?: string;
  tags: string[];
  variables?: {
    name: string;
    description: string;
    required: boolean;
    default?: string;
  }[];
}

/**
 * Playbook Execution Context
 */
export interface PlaybookContext {
  playbookId: string;
  agentId: string;
  variables: Record<string, string>;
  currentStep: number;
  totalSteps: number;
  status: 'pending' | 'running' | 'paused' | 'completed' | 'failed';
  startTime?: Date;
  endTime?: Date;
  results: Record<string, any>;
  approvals: Array<{
    stepId: string;
    approved: boolean;
    timestamp: Date;
    approver: string;
  }>;
}

/**
 * Playbook Engine - Executes playbooks with tight governance
 */
export class PlaybookEngine {
  private playbooks: Map<string, Playbook> = new Map();
  private industryPacks: Map<string, IndustryPack> = new Map();
  private executions: Map<string, PlaybookContext> = new Map();

  /**
   * Register a playbook
   */
  registerPlaybook(playbook: Playbook) {
    this.playbooks.set(playbook.id, playbook);
    console.log(`✓ Registered playbook: ${playbook.name} (${playbook.industry}/${playbook.jobRole})`);
  }

  /**
   * Register an industry pack
   */
  registerIndustryPack(pack: IndustryPack) {
    this.industryPacks.set(pack.id, pack);
    console.log(`✓ Registered industry pack: ${pack.name}`);
  }

  /**
   * Load playbook from JSON
   */
  loadPlaybookFromJSON(json: string): Playbook {
    const playbook = JSON.parse(json) as Playbook;
    this.registerPlaybook(playbook);
    return playbook;
  }

  /**
   * Get playbooks by industry
   */
  getPlaybooksByIndustry(industry: string): Playbook[] {
    return Array.from(this.playbooks.values())
      .filter(pb => pb.industry === industry);
  }

  /**
   * Get playbooks by job role
   */
  getPlaybooksByJobRole(jobRole: string): Playbook[] {
    return Array.from(this.playbooks.values())
      .filter(pb => pb.jobRole === jobRole);
  }

  /**
   * Execute a playbook with a browser agent
   */
  async executePlaybook(
    playbookId: string,
    variables: Record<string, string>,
    config: {
      agentId: string;
      industryPack?: string;
      onProgress?: (context: PlaybookContext) => void;
      onApprovalRequired?: (step: PlaybookStep, screenshot: string) => Promise<boolean>;
      onComplete?: (context: PlaybookContext) => void;
    }
  ): Promise<PlaybookContext> {
    const playbook = this.playbooks.get(playbookId);
    if (!playbook) {
      throw new Error(`Playbook not found: ${playbookId}`);
    }

    // Initialize execution context
    const context: PlaybookContext = {
      playbookId,
      agentId: config.agentId,
      variables,
      currentStep: 0,
      totalSteps: playbook.steps.length,
      status: 'running',
      startTime: new Date(),
      results: {},
      approvals: []
    };

    this.executions.set(config.agentId, context);

    // Load extensions from industry pack if specified
    let extensions: ChromeExtensionConfig[] = [];
    if (config.industryPack) {
      const pack = this.industryPacks.get(config.industryPack);
      if (pack) {
        extensions = pack.extensions;
      }
    }

    // Build task description from playbook steps
    const taskDescription = this.buildTaskDescription(playbook, variables);

    // Configure browser agent
    const agentConfig: BrowserAgentConfig = {
      agentId: config.agentId,
      task: taskDescription,
      classification: playbook.defaultClassification,
      extensions,
      onProgress: (status) => {
        console.log(`[${config.agentId}] ${status}`);
        if (config.onProgress) {
          config.onProgress(context);
        }
      },
      onApprovalRequired: async (action, screenshot) => {
        const currentStep = playbook.steps[context.currentStep];

        // Record approval request
        const approved = config.onApprovalRequired
          ? await config.onApprovalRequired(currentStep, screenshot)
          : false;

        context.approvals.push({
          stepId: currentStep.id,
          approved,
          timestamp: new Date(),
          approver: 'human-overseer'
        });

        return approved;
      },
      onComplete: (result) => {
        context.status = 'completed';
        context.endTime = new Date();
        context.results = result;

        if (config.onComplete) {
          config.onComplete(context);
        }
      }
    };

    // Execute with browser agent
    const agent = new GovernedBrowserAgent(agentConfig);
    await agent.initialize();

    try {
      await agent.execute();
      context.status = 'completed';
    } catch (error) {
      context.status = 'failed';
      context.results.error = String(error);
    } finally {
      await agent.close();
      context.endTime = new Date();
    }

    return context;
  }

  /**
   * Execute multiple playbooks in parallel (workforce pattern)
   */
  async executeWorkforce(
    tasks: Array<{
      playbookId: string;
      variables: Record<string, string>;
      agentId: string;
      industryPack?: string;
    }>,
    config: {
      onProgress?: (contexts: PlaybookContext[]) => void;
      onApprovalRequired?: (agentId: string, step: PlaybookStep, screenshot: string) => Promise<boolean>;
      onComplete?: (contexts: PlaybookContext[]) => void;
    }
  ): Promise<PlaybookContext[]> {
    console.log(`🚀 Spawning workforce: ${tasks.length} agents`);

    const executions = await Promise.all(
      tasks.map(task =>
        this.executePlaybook(task.playbookId, task.variables, {
          agentId: task.agentId,
          industryPack: task.industryPack,
          onProgress: (ctx) => {
            if (config.onProgress) {
              const allContexts = tasks.map(t => this.executions.get(t.agentId)!);
              config.onProgress(allContexts);
            }
          },
          onApprovalRequired: async (step, screenshot) => {
            if (config.onApprovalRequired) {
              return await config.onApprovalRequired(task.agentId, step, screenshot);
            }
            return false;
          }
        })
      )
    );

    if (config.onComplete) {
      config.onComplete(executions);
    }

    return executions;
  }

  /**
   * Build task description from playbook
   */
  private buildTaskDescription(playbook: Playbook, variables: Record<string, string>): string {
    let description = `${playbook.name}\n\n`;
    description += `Industry: ${playbook.industry}\n`;
    description += `Job Role: ${playbook.jobRole}\n\n`;
    description += `Steps:\n`;

    playbook.steps.forEach((step, index) => {
      let instruction = step.instruction;

      // Replace variables
      Object.entries(variables).forEach(([key, value]) => {
        instruction = instruction.replace(`\${${key}}`, value);
      });

      description += `${index + 1}. ${instruction}\n`;
      description += `   Expected: ${step.expectedOutcome}\n`;
      description += `   Classification: ${step.classification}\n\n`;
    });

    return description;
  }

  /**
   * Get execution context
   */
  getExecutionContext(agentId: string): PlaybookContext | undefined {
    return this.executions.get(agentId);
  }

  /**
   * Export playbook to JSON
   */
  exportPlaybook(playbookId: string): string {
    const playbook = this.playbooks.get(playbookId);
    if (!playbook) {
      throw new Error(`Playbook not found: ${playbookId}`);
    }
    return JSON.stringify(playbook, null, 2);
  }
}

/**
 * Playbook Library - Pre-built industry packs and playbooks
 */
export class PlaybookLibrary {
  static getProcurementPack(): IndustryPack {
    return {
      id: 'procurement-pack',
      name: 'Procurement & Sourcing',
      description: 'Tools for RFP research, vendor validation, compliance checks',
      extensions: [
        { name: 'PDF Processor', path: './extensions/pdf-processor', enabled: true },
        { name: 'Spreadsheet Extractor', path: './extensions/spreadsheet', enabled: true },
        { name: 'Vendor Database Connector', path: './extensions/vendor-db', enabled: true }
      ],
      playbooks: ['rfp-research', 'vendor-validation', 'price-comparison']
    };
  }

  static getCompliancePack(): IndustryPack {
    return {
      id: 'compliance-pack',
      name: 'Compliance & Audit',
      description: 'Tools for regulatory research, audit trails, reporting',
      extensions: [
        { name: 'Regulation Tracker', path: './extensions/reg-tracker', enabled: true },
        { name: 'Evidence Collector', path: './extensions/evidence', enabled: true },
        { name: 'Audit Logger', path: './extensions/audit-log', enabled: true }
      ],
      playbooks: ['regulatory-research', 'compliance-check', 'audit-trail']
    };
  }

  static getLegalPack(): IndustryPack {
    return {
      id: 'legal-pack',
      name: 'Legal Research & Case Management',
      description: 'Tools for case research, document review, docket monitoring',
      extensions: [
        { name: 'Legal Citation Finder', path: './extensions/citations', enabled: true },
        { name: 'Document Comparison', path: './extensions/doc-compare', enabled: true },
        { name: 'Docket Monitor', path: './extensions/docket', enabled: true }
      ],
      playbooks: ['case-research', 'document-review', 'precedent-search']
    };
  }

  static getHRPack(): IndustryPack {
    return {
      id: 'hr-pack',
      name: 'Human Resources',
      description: 'Tools for candidate screening, background checks, offer prep',
      extensions: [
        { name: 'Resume Parser', path: './extensions/resume-parser', enabled: true },
        { name: 'LinkedIn Connector', path: './extensions/linkedin', enabled: true },
        { name: 'Background Check API', path: './extensions/background', enabled: true }
      ],
      playbooks: ['candidate-screening', 'background-check', 'offer-letter-prep']
    };
  }

  static getSamplePlaybook(): Playbook {
    return {
      id: 'rfp-research',
      name: 'RFP Research & Analysis',
      description: 'Research government RFPs, extract requirements, assess fit',
      industry: 'Procurement',
      jobRole: 'Procurement Specialist',
      version: '1.0.0',
      defaultClassification: MAIClassification.ADVISORY,
      tags: ['rfp', 'research', 'procurement', 'government'],
      variables: [
        { name: 'RFP_NUMBER', description: 'RFP/Solicitation Number', required: true },
        { name: 'AGENCY', description: 'Government Agency', required: false, default: 'All' }
      ],
      steps: [
        {
          id: 'step-1',
          instruction: 'Navigate to SAM.gov and search for RFP ${RFP_NUMBER}',
          expectedOutcome: 'RFP listing displayed',
          classification: MAIClassification.INFORMATIONAL,
          maxRetries: 3
        },
        {
          id: 'step-2',
          instruction: 'Download RFP documents (PDF, attachments)',
          expectedOutcome: 'All documents downloaded',
          classification: MAIClassification.ADVISORY,
          maxRetries: 2
        },
        {
          id: 'step-3',
          instruction: 'Extract key requirements: deadline, budget, technical specs',
          expectedOutcome: 'Structured data captured',
          classification: MAIClassification.INFORMATIONAL
        },
        {
          id: 'step-4',
          instruction: 'Generate fit assessment memo',
          expectedOutcome: 'Memo created with recommendations',
          classification: MAIClassification.ADVISORY
        }
      ],
      requiredExtensions: ['pdf-processor', 'spreadsheet', 'vendor-db'],
      estimatedDuration: '5-10 minutes'
    };
  }
}
