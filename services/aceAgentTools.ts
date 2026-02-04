/**
 * ACE Agent Tools - Governed Capabilities for the ACE Assistant
 *
 * These tools allow the ACE Agent to:
 * - Manage client cases
 * - Run governed bundle packs
 * - Summarize evidence
 * - Draft communications
 *
 * CRITICAL: All tools inherit ACE governance automatically.
 * The agent cannot bypass domain restrictions, gates, or stop conditions.
 *
 * TOOL PATTERN:
 * Each tool has:
 * - name: Identifier for the tool
 * - description: What it does (shown to the agent)
 * - parameters: What inputs it needs
 * - execute: The actual implementation
 * - governance: What ACE controls apply
 */

import {
  caseManager,
  Case,
  ClaimType,
  CaseStatus,
  CasePriority,
  CLAIM_TYPE_LABELS,
  CLAIM_TYPE_BUNDLES
} from './caseManager';
import { BUNDLE_PACKS, BundlePack } from './bundlePacks';
import { ExecutionResult, EvidenceRecord } from './browserAutomationAgent';
import { mcpBridge } from './mcpBridge';

// ============================================================================
// TOOL DEFINITIONS
// ============================================================================

export interface AgentTool {
  name: string;
  description: string;
  parameters: ToolParameter[];
  execute: (params: Record<string, any>) => Promise<ToolResult>;
  requiresConfirmation?: boolean;  // If true, agent must confirm before executing
  governance?: {
    auditLog: boolean;             // Log this action
    requiresHumanApproval?: boolean;
  };
}

export interface ToolParameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  description: string;
  required: boolean;
  enum?: string[];
}

export interface ToolResult {
  success: boolean;
  data?: any;
  message: string;
  error?: string;
}

// ============================================================================
// CASE MANAGEMENT TOOLS
// ============================================================================

export const createCaseTool: AgentTool = {
  name: 'create_case',
  description: 'Create a new client case for VA claims research. Use this when a new client needs help with a disability claim.',
  parameters: [
    { name: 'clientName', type: 'string', description: 'Full name of the client', required: true },
    { name: 'clientEmail', type: 'string', description: 'Client email address', required: true },
    { name: 'claimType', type: 'string', description: 'Type of claim', required: true,
      enum: Object.keys(CLAIM_TYPE_LABELS) },
    { name: 'conditions', type: 'array', description: 'Specific conditions (e.g., ["PTSD", "Back pain"])', required: false },
    { name: 'servicePeriod', type: 'object', description: 'Service dates {start: "2008", end: "2012"}', required: false },
    { name: 'deployments', type: 'array', description: 'Deployment locations (e.g., ["Iraq", "Afghanistan"])', required: false },
    { name: 'notes', type: 'string', description: 'Additional notes about the case', required: false },
    { name: 'priority', type: 'string', description: 'Case priority', required: false, enum: ['low', 'normal', 'high', 'urgent'] }
  ],
  governance: { auditLog: true },
  execute: async (params) => {
    try {
      const newCase = caseManager.createCase({
        clientName: params.clientName,
        clientEmail: params.clientEmail,
        claimType: params.claimType as ClaimType,
        conditions: params.conditions,
        servicePeriod: params.servicePeriod,
        deployments: params.deployments,
        notes: params.notes,
        priority: params.priority as CasePriority
      });

      return {
        success: true,
        data: newCase,
        message: `Created case #${newCase.id.split('-')[1]} for ${params.clientName} (${CLAIM_TYPE_LABELS[params.claimType as ClaimType]})`
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to create case',
        error: String(error)
      };
    }
  }
};

export const getCaseTool: AgentTool = {
  name: 'get_case',
  description: 'Get details of a specific case by ID',
  parameters: [
    { name: 'caseId', type: 'string', description: 'The case ID', required: true }
  ],
  governance: { auditLog: false },
  execute: async (params) => {
    const caseData = caseManager.getCase(params.caseId);
    if (!caseData) {
      return {
        success: false,
        message: `Case ${params.caseId} not found`
      };
    }
    return {
      success: true,
      data: caseData,
      message: `Found case for ${caseData.clientName}`
    };
  }
};

export const listCasesTool: AgentTool = {
  name: 'list_cases',
  description: 'List all cases, optionally filtered by status',
  parameters: [
    { name: 'status', type: 'string', description: 'Filter by status', required: false,
      enum: ['new', 'researching', 'evidence-ready', 'review', 'complete', 'on-hold'] },
    { name: 'limit', type: 'number', description: 'Maximum number of cases to return', required: false }
  ],
  governance: { auditLog: false },
  execute: async (params) => {
    let cases = params.status
      ? caseManager.getCasesByStatus(params.status as CaseStatus)
      : caseManager.getAllCases();

    if (params.limit) {
      cases = cases.slice(0, params.limit);
    }

    return {
      success: true,
      data: cases,
      message: `Found ${cases.length} case(s)${params.status ? ` with status "${params.status}"` : ''}`
    };
  }
};

export const updateCaseStatusTool: AgentTool = {
  name: 'update_case_status',
  description: 'Update the status of a case',
  parameters: [
    { name: 'caseId', type: 'string', description: 'The case ID', required: true },
    { name: 'status', type: 'string', description: 'New status', required: true,
      enum: ['new', 'researching', 'evidence-ready', 'review', 'complete', 'on-hold'] },
    { name: 'note', type: 'string', description: 'Note explaining the status change', required: false }
  ],
  governance: { auditLog: true },
  execute: async (params) => {
    const updated = caseManager.updateStatus(
      params.caseId,
      params.status as CaseStatus,
      params.note
    );

    if (!updated) {
      return {
        success: false,
        message: `Case ${params.caseId} not found`
      };
    }

    return {
      success: true,
      data: updated,
      message: `Updated case ${params.caseId} status to "${params.status}"`
    };
  }
};

export const searchCasesTool: AgentTool = {
  name: 'search_cases',
  description: 'Search cases by client name, email, or notes',
  parameters: [
    { name: 'query', type: 'string', description: 'Search query', required: true }
  ],
  governance: { auditLog: false },
  execute: async (params) => {
    const results = caseManager.searchCases(params.query);
    return {
      success: true,
      data: results,
      message: `Found ${results.length} case(s) matching "${params.query}"`
    };
  }
};

export const getCaseStatsTool: AgentTool = {
  name: 'get_case_stats',
  description: 'Get statistics about all cases',
  parameters: [],
  governance: { auditLog: false },
  execute: async () => {
    const stats = caseManager.getCaseStats();
    return {
      success: true,
      data: stats,
      message: `Total: ${stats.total} cases. New: ${stats.byStatus.new}, Researching: ${stats.byStatus.researching}, Ready: ${stats.byStatus['evidence-ready']}, Complete: ${stats.completedThisWeek} this week`
    };
  }
};

// ============================================================================
// RESEARCH TOOLS
// ============================================================================

export const listBundlesTool: AgentTool = {
  name: 'list_bundles',
  description: 'List available research bundle packs',
  parameters: [
    { name: 'category', type: 'string', description: 'Filter by category', required: false,
      enum: ['va-claims', 'bd-capture', 'compliance', 'research'] }
  ],
  governance: { auditLog: false },
  execute: async (params) => {
    let bundles = BUNDLE_PACKS;
    if (params.category) {
      bundles = bundles.filter(b => b.category === params.category);
    }

    const summaries = bundles.map(b => ({
      id: b.id,
      name: b.name,
      description: b.description,
      category: b.category,
      tabs: b.tabs.length,
      complexity: b.complexity,
      estimatedDuration: b.estimatedDuration
    }));

    return {
      success: true,
      data: summaries,
      message: `Found ${bundles.length} bundle pack(s)`
    };
  }
};

export const getRecommendedBundlesTool: AgentTool = {
  name: 'get_recommended_bundles',
  description: 'Get recommended bundle packs for a claim type',
  parameters: [
    { name: 'claimType', type: 'string', description: 'Type of claim', required: true,
      enum: Object.keys(CLAIM_TYPE_LABELS) }
  ],
  governance: { auditLog: false },
  execute: async (params) => {
    const bundles = caseManager.getRecommendedBundles(params.claimType as ClaimType);
    return {
      success: true,
      data: bundles.map(b => ({
        id: b.id,
        name: b.name,
        description: b.description,
        tabs: b.tabs.map(t => t.name),
        governance: {
          allowedDomains: b.governance.allowedDomains,
          stopConditions: b.governance.stopConditions
        }
      })),
      message: `Recommended ${bundles.length} bundle(s) for ${CLAIM_TYPE_LABELS[params.claimType as ClaimType]}`
    };
  }
};

export const runBundleForCaseTool: AgentTool = {
  name: 'run_bundle_for_case',
  description: 'Run a research bundle pack for a case. This will gather evidence from governed sources.',
  parameters: [
    { name: 'caseId', type: 'string', description: 'The case ID', required: true },
    { name: 'bundleId', type: 'string', description: 'The bundle pack ID to run', required: true }
  ],
  requiresConfirmation: true,
  governance: {
    auditLog: true,
    requiresHumanApproval: false  // Gates within bundle will handle approval
  },
  execute: async (params) => {
    const caseData = caseManager.getCase(params.caseId);
    if (!caseData) {
      return {
        success: false,
        message: `Case ${params.caseId} not found`
      };
    }

    const bundle = BUNDLE_PACKS.find(b => b.id === params.bundleId);
    if (!bundle) {
      return {
        success: false,
        message: `Bundle ${params.bundleId} not found`
      };
    }

    // Start the bundle run
    const bundleRun = caseManager.startBundleRun(params.caseId, params.bundleId);
    if (!bundleRun) {
      return {
        success: false,
        message: 'Failed to start bundle run'
      };
    }

    // Emit request for MCP execution
    // This will be picked up by the browser automation system
    mcpBridge.emit('execution:request', {
      type: 'bundle',
      caseId: params.caseId,
      bundleRunId: bundleRun.id,
      bundleId: bundle.id,
      bundleName: bundle.name,
      tabs: bundle.tabs.map(t => ({
        id: t.id,
        name: t.name,
        role: t.role,
        startUrl: t.startUrl,
        domain: t.domain
      })),
      workflow: bundle.workflow,
      governance: bundle.governance,
      message: `Running ${bundle.name} for case ${params.caseId}`
    });

    return {
      success: true,
      data: {
        bundleRunId: bundleRun.id,
        bundleName: bundle.name,
        status: 'running',
        tabs: bundle.tabs.map(t => t.name),
        governance: {
          allowedDomains: bundle.governance.allowedDomains,
          stopConditions: bundle.governance.stopConditions
        }
      },
      message: `Started "${bundle.name}" for ${caseData.clientName}. Opening ${bundle.tabs.length} governed tabs.`
    };
  }
};

// ============================================================================
// EVIDENCE TOOLS
// ============================================================================

export const createEvidencePackageTool: AgentTool = {
  name: 'create_evidence_package',
  description: 'Create an evidence package from completed bundle runs',
  parameters: [
    { name: 'caseId', type: 'string', description: 'The case ID', required: true },
    { name: 'name', type: 'string', description: 'Name for the evidence package', required: true },
    { name: 'description', type: 'string', description: 'Description of what evidence is included', required: false },
    { name: 'bundleRunIds', type: 'array', description: 'IDs of bundle runs to include', required: false }
  ],
  governance: { auditLog: true },
  execute: async (params) => {
    const caseData = caseManager.getCase(params.caseId);
    if (!caseData) {
      return {
        success: false,
        message: `Case ${params.caseId} not found`
      };
    }

    // If no bundle runs specified, use all completed ones
    const runIds = params.bundleRunIds ||
      caseData.bundleRuns
        .filter(r => r.status === 'completed')
        .map(r => r.id);

    if (runIds.length === 0) {
      return {
        success: false,
        message: 'No completed bundle runs to package'
      };
    }

    const pkg = caseManager.createEvidencePackage(
      params.caseId,
      params.name,
      params.description || `Evidence package for ${caseData.clientName}`,
      runIds
    );

    if (!pkg) {
      return {
        success: false,
        message: 'Failed to create evidence package'
      };
    }

    return {
      success: true,
      data: {
        packageId: pkg.id,
        name: pkg.name,
        evidenceCount: pkg.evidenceItems.length,
        hash: pkg.packageHash
      },
      message: `Created evidence package "${pkg.name}" with ${pkg.evidenceItems.length} items. Hash: ${pkg.packageHash.substring(0, 24)}...`
    };
  }
};

export const summarizeEvidenceTool: AgentTool = {
  name: 'summarize_evidence',
  description: 'Get a summary of evidence gathered for a case',
  parameters: [
    { name: 'caseId', type: 'string', description: 'The case ID', required: true }
  ],
  governance: { auditLog: false },
  execute: async (params) => {
    const caseData = caseManager.getCase(params.caseId);
    if (!caseData) {
      return {
        success: false,
        message: `Case ${params.caseId} not found`
      };
    }

    const completedRuns = caseData.bundleRuns.filter(r => r.status === 'completed');
    const totalEvidence = completedRuns.reduce((sum, r) => sum + r.evidenceCount, 0);

    const evidenceByType: Record<string, number> = {};
    const sources: Set<string> = new Set();

    completedRuns.forEach(run => {
      if (run.result?.evidence) {
        run.result.evidence.forEach(e => {
          evidenceByType[e.type] = (evidenceByType[e.type] || 0) + 1;
          if (e.source_url) {
            try {
              sources.add(new URL(e.source_url).hostname);
            } catch {}
          }
        });
      }
    });

    return {
      success: true,
      data: {
        caseId: caseData.id,
        clientName: caseData.clientName,
        claimType: CLAIM_TYPE_LABELS[caseData.claimType],
        bundleRunsCompleted: completedRuns.length,
        totalEvidenceItems: totalEvidence,
        evidenceByType,
        sources: Array.from(sources),
        packagesCreated: caseData.evidencePackages.length
      },
      message: `Case ${caseData.clientName}: ${completedRuns.length} research runs completed, ${totalEvidence} evidence items from ${sources.size} sources`
    };
  }
};

// ============================================================================
// COMMUNICATION TOOLS
// ============================================================================

export const addNoteToCaseTool: AgentTool = {
  name: 'add_note_to_case',
  description: 'Add a note to a case communication log',
  parameters: [
    { name: 'caseId', type: 'string', description: 'The case ID', required: true },
    { name: 'content', type: 'string', description: 'Note content', required: true }
  ],
  governance: { auditLog: true },
  execute: async (params) => {
    const updated = caseManager.addCommunication(params.caseId, {
      type: 'note',
      direction: 'internal',
      content: params.content
    });

    if (!updated) {
      return {
        success: false,
        message: `Case ${params.caseId} not found`
      };
    }

    return {
      success: true,
      data: { caseId: params.caseId },
      message: `Added note to case ${params.caseId}`
    };
  }
};

export const draftClientEmailTool: AgentTool = {
  name: 'draft_client_email',
  description: 'Draft an email to send to the client about their case',
  parameters: [
    { name: 'caseId', type: 'string', description: 'The case ID', required: true },
    { name: 'emailType', type: 'string', description: 'Type of email', required: true,
      enum: ['intake_confirmation', 'research_complete', 'evidence_ready', 'follow_up', 'custom'] },
    { name: 'customContent', type: 'string', description: 'Custom content for the email', required: false }
  ],
  governance: { auditLog: true },
  execute: async (params) => {
    const caseData = caseManager.getCase(params.caseId);
    if (!caseData) {
      return {
        success: false,
        message: `Case ${params.caseId} not found`
      };
    }

    let subject = '';
    let body = '';

    switch (params.emailType) {
      case 'intake_confirmation':
        subject = `Your VA Claims Case Has Been Created - ${caseData.id}`;
        body = `Dear ${caseData.clientName},

Thank you for reaching out. We have created a case for your ${CLAIM_TYPE_LABELS[caseData.claimType]} claim.

Case ID: ${caseData.id}
Conditions: ${caseData.conditions.join(', ') || 'To be discussed'}

We will begin researching the relevant regulations, eligibility requirements, and current compensation rates for your claim.

You will receive an update once our research is complete.

Best regards,
ACE VA Claims Support`;
        break;

      case 'research_complete':
        const evidenceCount = caseData.bundleRuns.reduce((sum, r) => sum + r.evidenceCount, 0);
        subject = `Research Complete for Your VA Claim - ${caseData.id}`;
        body = `Dear ${caseData.clientName},

Great news! We have completed the initial research for your ${CLAIM_TYPE_LABELS[caseData.claimType]} claim.

Summary:
- Research runs completed: ${caseData.bundleRuns.filter(r => r.status === 'completed').length}
- Evidence items gathered: ${evidenceCount}
- Sources consulted: VA.gov, eCFR (38 CFR), and other official sources

We are now preparing your evidence package for review.

Best regards,
ACE VA Claims Support`;
        break;

      case 'evidence_ready':
        const latestPackage = caseData.evidencePackages[caseData.evidencePackages.length - 1];
        subject = `Your Evidence Package is Ready - ${caseData.id}`;
        body = `Dear ${caseData.clientName},

Your evidence package is ready for your ${CLAIM_TYPE_LABELS[caseData.claimType]} claim.

${latestPackage ? `Package: ${latestPackage.name}
Evidence items: ${latestPackage.evidenceItems.length}
Package hash (for verification): ${latestPackage.packageHash.substring(0, 32)}...` : ''}

Please review the attached evidence package and let us know if you have any questions.

Best regards,
ACE VA Claims Support`;
        break;

      case 'follow_up':
        subject = `Following Up on Your VA Claim - ${caseData.id}`;
        body = `Dear ${caseData.clientName},

We wanted to follow up on your ${CLAIM_TYPE_LABELS[caseData.claimType]} claim (Case ID: ${caseData.id}).

Please let us know if you have any questions or need additional assistance.

Best regards,
ACE VA Claims Support`;
        break;

      case 'custom':
        subject = `Update on Your VA Claim - ${caseData.id}`;
        body = params.customContent || `Dear ${caseData.clientName},

[Custom message content]

Best regards,
ACE VA Claims Support`;
        break;
    }

    return {
      success: true,
      data: {
        to: caseData.clientEmail,
        subject,
        body,
        caseId: caseData.id
      },
      message: `Drafted ${params.emailType} email for ${caseData.clientName}. Ready to review and send.`
    };
  }
};

// ============================================================================
// EXPORT ALL TOOLS
// ============================================================================

export const ACE_AGENT_TOOLS: AgentTool[] = [
  // Case Management
  createCaseTool,
  getCaseTool,
  listCasesTool,
  updateCaseStatusTool,
  searchCasesTool,
  getCaseStatsTool,

  // Research
  listBundlesTool,
  getRecommendedBundlesTool,
  runBundleForCaseTool,

  // Evidence
  createEvidencePackageTool,
  summarizeEvidenceTool,

  // Communication
  addNoteToCaseTool,
  draftClientEmailTool
];

export const getToolByName = (name: string): AgentTool | undefined => {
  return ACE_AGENT_TOOLS.find(t => t.name === name);
};

export const getToolDescriptions = (): string => {
  return ACE_AGENT_TOOLS.map(t =>
    `- ${t.name}: ${t.description}`
  ).join('\n');
};
