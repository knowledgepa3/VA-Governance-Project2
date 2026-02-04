/**
 * Run Journal Service
 *
 * The "missing middle layer" between raw execution telemetry and final deliverable.
 * Captures operator synthesis, gate reviews, scope directives, and human patches.
 *
 * This is where expert judgment adds real value - the system does heavy lifting,
 * but operator synthesis makes it defensible.
 */

import { AgentRole, MAIClassification } from '../types';

// ============================================================================
// TYPES
// ============================================================================

export interface GateReview {
  id: string;
  timestamp: string;
  gateId: string;
  stepId: number;
  agentRole: AgentRole;
  classificationType: MAIClassification;

  // What the system produced
  systemRationale: string;
  riskFactors: string[];
  evidenceProduced: string[];
  keyFindings: string[];

  // Operator synthesis (your notes)
  whatHappened: string;           // 1-2 line summary
  whatIApproved: string;          // Your approval note
  scopeImpact: 'expanded' | 'narrowed' | 'unchanged' | 'flagged';
  followUp?: string;              // Optional follow-up needed

  // Decision
  decision: 'approved' | 'rejected' | 'approved_with_notes';
  approvedBy: string;
  approvalTime: string;
}

export interface ScopeDirective {
  id: string;
  createdAt: string;
  createdBy: string;
  sourceGateId?: string;          // Which gate triggered this directive

  // Directive content
  type: 'source_restriction' | 'scope_limit' | 'extraction_focus' | 'action_prohibition' | 'custom';
  directive: string;              // The actual instruction
  rationale: string;              // Why this directive exists

  // Scope
  appliesTo: AgentRole[] | 'all';
  priority: 'must' | 'should' | 'may';

  // Status
  active: boolean;
  expiresAfterRun?: boolean;      // One-time directive
}

export interface HumanPatch {
  id: string;
  timestamp: string;
  patchedBy: string;

  // What's being patched
  evidencePackageHash: string;
  targetField: string;
  targetAgent: AgentRole;

  // The patch
  originalValue: any;
  correctedValue: any;
  patchReason: string;

  // Integrity
  patchHash: string;

  // Classification
  patchType: 'correction' | 'addition' | 'removal' | 'flag' | 'context';
}

export interface RunJournalEntry {
  id: string;
  runId: string;
  caseId: string;

  // Run metadata
  startTime: string;
  endTime?: string;
  status: 'in_progress' | 'completed' | 'aborted' | 'paused';

  // Pack/Policy info
  packVersion: string;
  policyHash: string;
  workforceType: string;

  // Timeline
  steps: StepRecord[];
  gateReviews: GateReview[];

  // Evidence tracking
  evidenceArtifacts: EvidenceArtifact[];
  extractedFields: Record<string, any>;

  // Operator layer
  scopeDirectives: ScopeDirective[];
  humanPatches: HumanPatch[];
  operatorNotes: string;          // Free-form notes section

  // Final summary
  runSummary?: RunSummary;
}

export interface StepRecord {
  stepNumber: number;
  agentRole: AgentRole;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  startTime?: string;
  endTime?: string;
  duration?: number;
  tokenUsage?: { input: number; output: number };
  classification: MAIClassification;
  gateTriggered: boolean;
  autoApproved: boolean;
}

export interface EvidenceArtifact {
  id: string;
  name: string;
  type: string;
  hash: string;
  size: number;
  producedBy: AgentRole;
  timestamp: string;
  tags: string[];
}

export interface RunSummary {
  totalSteps: number;
  completedSteps: number;
  gatesEncountered: number;
  gatesApproved: number;
  gatesRejected: number;
  autoApprovedGates: number;
  directivesApplied: number;
  humanPatchesApplied: number;
  totalTokens: { input: number; output: number };
  totalDuration: number;
  finalStatus: 'success' | 'partial' | 'failed';
  qualityScore?: number;
}

// ============================================================================
// SERVICE
// ============================================================================

class RunJournalService {
  private static instance: RunJournalService;
  private currentJournal: RunJournalEntry | null = null;
  private journalHistory: RunJournalEntry[] = [];
  private globalDirectives: ScopeDirective[] = [];

  private constructor() {
    this.loadFromStorage();
  }

  static getInstance(): RunJournalService {
    if (!RunJournalService.instance) {
      RunJournalService.instance = new RunJournalService();
    }
    return RunJournalService.instance;
  }

  // -------------------------------------------------------------------------
  // Journal Lifecycle
  // -------------------------------------------------------------------------

  startNewRun(caseId: string, workforceType: string, packVersion: string = '1.0.0'): RunJournalEntry {
    const runId = `RUN-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

    this.currentJournal = {
      id: `JOURNAL-${runId}`,
      runId,
      caseId,
      startTime: new Date().toISOString(),
      status: 'in_progress',
      packVersion,
      policyHash: this.generateHash(`${packVersion}-${Date.now()}`),
      workforceType,
      steps: [],
      gateReviews: [],
      evidenceArtifacts: [],
      extractedFields: {},
      scopeDirectives: [...this.globalDirectives.filter(d => d.active)], // Include active global directives
      humanPatches: [],
      operatorNotes: ''
    };

    this.saveToStorage();
    return this.currentJournal;
  }

  completeRun(finalStatus: 'success' | 'partial' | 'failed' = 'success'): RunJournalEntry | null {
    if (!this.currentJournal) return null;

    this.currentJournal.endTime = new Date().toISOString();
    this.currentJournal.status = 'completed';
    this.currentJournal.runSummary = this.generateRunSummary(finalStatus);

    // Archive to history
    this.journalHistory.unshift(this.currentJournal);
    if (this.journalHistory.length > 50) {
      this.journalHistory = this.journalHistory.slice(0, 50);
    }

    // Clear one-time directives
    this.currentJournal.scopeDirectives = this.currentJournal.scopeDirectives.filter(
      d => !d.expiresAfterRun
    );

    const completedJournal = { ...this.currentJournal };
    this.saveToStorage();

    return completedJournal;
  }

  abortRun(reason?: string): void {
    if (!this.currentJournal) return;

    this.currentJournal.endTime = new Date().toISOString();
    this.currentJournal.status = 'aborted';
    this.currentJournal.operatorNotes += `\n\n[ABORTED] ${reason || 'User terminated'}`;

    this.journalHistory.unshift(this.currentJournal);
    this.currentJournal = null;
    this.saveToStorage();
  }

  // -------------------------------------------------------------------------
  // Step Tracking
  // -------------------------------------------------------------------------

  recordStepStart(stepNumber: number, agentRole: AgentRole, classification: MAIClassification): void {
    if (!this.currentJournal) return;

    const step: StepRecord = {
      stepNumber,
      agentRole,
      status: 'running',
      startTime: new Date().toISOString(),
      classification,
      gateTriggered: false,
      autoApproved: false
    };

    this.currentJournal.steps.push(step);
    this.saveToStorage();
  }

  recordStepComplete(
    stepNumber: number,
    tokenUsage?: { input: number; output: number },
    gateTriggered: boolean = false,
    autoApproved: boolean = false
  ): void {
    if (!this.currentJournal) return;

    const step = this.currentJournal.steps.find(s => s.stepNumber === stepNumber);
    if (step) {
      step.status = 'completed';
      step.endTime = new Date().toISOString();
      step.duration = step.startTime
        ? new Date().getTime() - new Date(step.startTime).getTime()
        : 0;
      step.tokenUsage = tokenUsage;
      step.gateTriggered = gateTriggered;
      step.autoApproved = autoApproved;
    }

    this.saveToStorage();
  }

  recordStepFailed(stepNumber: number, error?: string): void {
    if (!this.currentJournal) return;

    const step = this.currentJournal.steps.find(s => s.stepNumber === stepNumber);
    if (step) {
      step.status = 'failed';
      step.endTime = new Date().toISOString();
    }

    if (error) {
      this.currentJournal.operatorNotes += `\n[STEP ${stepNumber} FAILED] ${error}`;
    }

    this.saveToStorage();
  }

  // -------------------------------------------------------------------------
  // Gate Reviews (The Key Part!)
  // -------------------------------------------------------------------------

  recordGateReview(review: Omit<GateReview, 'id' | 'timestamp' | 'approvalTime'>): GateReview | null {
    // Gracefully handle missing journal - don't throw, just log and return null
    if (!this.currentJournal) {
      console.warn('[RunJournal] No active journal - gate review not recorded');
      return null;
    }

    const fullReview: GateReview = {
      ...review,
      id: `GATE-${Date.now()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`,
      timestamp: new Date().toISOString(),
      approvalTime: new Date().toISOString()
    };

    this.currentJournal.gateReviews.push(fullReview);
    this.saveToStorage();

    return fullReview;
  }

  // Quick gate approval with minimal notes
  quickApproveGate(
    stepId: number,
    agentRole: AgentRole,
    classification: MAIClassification,
    approvedBy: string,
    note?: string
  ): GateReview {
    return this.recordGateReview({
      gateId: `${agentRole}-${stepId}`,
      stepId,
      agentRole,
      classificationType: classification,
      systemRationale: 'See agent output for details',
      riskFactors: [],
      evidenceProduced: [],
      keyFindings: [],
      whatHappened: `Step ${stepId} completed by ${agentRole}`,
      whatIApproved: note || 'Approved - output acceptable',
      scopeImpact: 'unchanged',
      decision: 'approved',
      approvedBy
    });
  }

  // Detailed gate review with full annotation
  detailedGateReview(
    stepId: number,
    agentRole: AgentRole,
    classification: MAIClassification,
    approvedBy: string,
    details: {
      whatHappened: string;
      whatIApproved: string;
      scopeImpact: GateReview['scopeImpact'];
      riskFactors?: string[];
      keyFindings?: string[];
      followUp?: string;
      decision?: GateReview['decision'];
    }
  ): GateReview {
    return this.recordGateReview({
      gateId: `${agentRole}-${stepId}`,
      stepId,
      agentRole,
      classificationType: classification,
      systemRationale: 'See agent output for details',
      riskFactors: details.riskFactors || [],
      evidenceProduced: [],
      keyFindings: details.keyFindings || [],
      whatHappened: details.whatHappened,
      whatIApproved: details.whatIApproved,
      scopeImpact: details.scopeImpact,
      followUp: details.followUp,
      decision: details.decision || 'approved',
      approvedBy
    });
  }

  // -------------------------------------------------------------------------
  // Scope Directives
  // -------------------------------------------------------------------------

  addDirective(directive: Omit<ScopeDirective, 'id' | 'createdAt'>): ScopeDirective {
    const fullDirective: ScopeDirective = {
      ...directive,
      id: `DIR-${Date.now()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`,
      createdAt: new Date().toISOString()
    };

    if (this.currentJournal) {
      this.currentJournal.scopeDirectives.push(fullDirective);
    }

    // Also add to global if not run-specific
    if (!directive.expiresAfterRun) {
      this.globalDirectives.push(fullDirective);
    }

    this.saveToStorage();
    return fullDirective;
  }

  // Convenience methods for common directives
  addSourceRestriction(sources: string[], createdBy: string, rationale: string): ScopeDirective {
    return this.addDirective({
      createdBy,
      type: 'source_restriction',
      directive: `Only use: ${sources.join(', ')}`,
      rationale,
      appliesTo: 'all',
      priority: 'must',
      active: true
    });
  }

  addScopeLimit(limit: string, createdBy: string, rationale: string): ScopeDirective {
    return this.addDirective({
      createdBy,
      type: 'scope_limit',
      directive: limit,
      rationale,
      appliesTo: 'all',
      priority: 'should',
      active: true
    });
  }

  addExtractionFocus(fields: string[], createdBy: string): ScopeDirective {
    return this.addDirective({
      createdBy,
      type: 'extraction_focus',
      directive: `Extract only: ${fields.join(', ')}`,
      rationale: 'Focused extraction for efficiency',
      appliesTo: 'all',
      priority: 'should',
      active: true
    });
  }

  addActionProhibition(action: string, createdBy: string, rationale: string): ScopeDirective {
    return this.addDirective({
      createdBy,
      type: 'action_prohibition',
      directive: `Do NOT: ${action}`,
      rationale,
      appliesTo: 'all',
      priority: 'must',
      active: true
    });
  }

  deactivateDirective(directiveId: string): void {
    if (this.currentJournal) {
      const directive = this.currentJournal.scopeDirectives.find(d => d.id === directiveId);
      if (directive) directive.active = false;
    }

    const globalDirective = this.globalDirectives.find(d => d.id === directiveId);
    if (globalDirective) globalDirective.active = false;

    this.saveToStorage();
  }

  getActiveDirectives(): ScopeDirective[] {
    const directives: ScopeDirective[] = [];

    // Add global directives
    directives.push(...this.globalDirectives.filter(d => d.active));

    // Add run-specific directives (if any)
    if (this.currentJournal) {
      const runSpecific = this.currentJournal.scopeDirectives.filter(
        d => d.active && !directives.find(g => g.id === d.id)
      );
      directives.push(...runSpecific);
    }

    return directives;
  }

  // Format directives for agent prompts
  formatDirectivesForAgent(agentRole: AgentRole): string {
    const applicable = this.getActiveDirectives().filter(
      d => d.appliesTo === 'all' || d.appliesTo.includes(agentRole)
    );

    if (applicable.length === 0) return '';

    const lines = [
      '## OPERATOR DIRECTIVES',
      'The following constraints have been set by the human operator:',
      ''
    ];

    const mustDo = applicable.filter(d => d.priority === 'must');
    const shouldDo = applicable.filter(d => d.priority === 'should');
    const mayDo = applicable.filter(d => d.priority === 'may');

    if (mustDo.length > 0) {
      lines.push('**MUST:**');
      mustDo.forEach(d => lines.push(`- ${d.directive}`));
      lines.push('');
    }

    if (shouldDo.length > 0) {
      lines.push('**SHOULD:**');
      shouldDo.forEach(d => lines.push(`- ${d.directive}`));
      lines.push('');
    }

    if (mayDo.length > 0) {
      lines.push('**MAY:**');
      mayDo.forEach(d => lines.push(`- ${d.directive}`));
      lines.push('');
    }

    return lines.join('\n');
  }

  // -------------------------------------------------------------------------
  // Human Patches
  // -------------------------------------------------------------------------

  addHumanPatch(patch: Omit<HumanPatch, 'id' | 'timestamp' | 'patchHash'>): HumanPatch | null {
    // Gracefully handle missing journal
    if (!this.currentJournal) {
      console.warn('[RunJournal] No active journal - human patch not recorded');
      return null;
    }

    const fullPatch: HumanPatch = {
      ...patch,
      id: `PATCH-${Date.now()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`,
      timestamp: new Date().toISOString(),
      patchHash: this.generateHash(JSON.stringify(patch))
    };

    this.currentJournal.humanPatches.push(fullPatch);
    this.saveToStorage();

    return fullPatch;
  }

  // Convenience method for correcting a field
  correctField(
    targetAgent: AgentRole,
    targetField: string,
    originalValue: any,
    correctedValue: any,
    reason: string,
    patchedBy: string
  ): HumanPatch {
    return this.addHumanPatch({
      patchedBy,
      evidencePackageHash: this.currentJournal?.policyHash || 'unknown',
      targetField,
      targetAgent,
      originalValue,
      correctedValue,
      patchReason: reason,
      patchType: 'correction'
    });
  }

  // Add missing context
  addContext(
    targetAgent: AgentRole,
    contextField: string,
    contextValue: any,
    reason: string,
    patchedBy: string
  ): HumanPatch {
    return this.addHumanPatch({
      patchedBy,
      evidencePackageHash: this.currentJournal?.policyHash || 'unknown',
      targetField: contextField,
      targetAgent,
      originalValue: null,
      correctedValue: contextValue,
      patchReason: reason,
      patchType: 'addition'
    });
  }

  // Flag something for review
  flagForReview(
    targetAgent: AgentRole,
    targetField: string,
    flagReason: string,
    flaggedBy: string
  ): HumanPatch {
    return this.addHumanPatch({
      patchedBy: flaggedBy,
      evidencePackageHash: this.currentJournal?.policyHash || 'unknown',
      targetField,
      targetAgent,
      originalValue: 'flagged',
      correctedValue: 'needs_review',
      patchReason: flagReason,
      patchType: 'flag'
    });
  }

  // -------------------------------------------------------------------------
  // Evidence Tracking
  // -------------------------------------------------------------------------

  recordEvidence(artifact: Omit<EvidenceArtifact, 'id' | 'timestamp' | 'hash'>): void {
    if (!this.currentJournal) return;

    const evidence: EvidenceArtifact = {
      ...artifact,
      id: `EV-${Date.now()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`,
      timestamp: new Date().toISOString(),
      hash: this.generateHash(`${artifact.name}-${artifact.size}-${Date.now()}`)
    };

    this.currentJournal.evidenceArtifacts.push(evidence);
    this.saveToStorage();
  }

  recordExtractedField(fieldName: string, value: any, source: AgentRole): void {
    if (!this.currentJournal) return;

    this.currentJournal.extractedFields[fieldName] = {
      value,
      source,
      extractedAt: new Date().toISOString()
    };

    this.saveToStorage();
  }

  // -------------------------------------------------------------------------
  // Operator Notes
  // -------------------------------------------------------------------------

  addOperatorNote(note: string): void {
    if (!this.currentJournal) return;

    const timestamp = new Date().toLocaleTimeString();
    this.currentJournal.operatorNotes += `\n[${timestamp}] ${note}`;
    this.saveToStorage();
  }

  setOperatorNotes(notes: string): void {
    if (!this.currentJournal) return;

    this.currentJournal.operatorNotes = notes;
    this.saveToStorage();
  }

  // -------------------------------------------------------------------------
  // Export & Reporting
  // -------------------------------------------------------------------------

  getCurrentJournal(): RunJournalEntry | null {
    return this.currentJournal;
  }

  getJournalHistory(): RunJournalEntry[] {
    return this.journalHistory;
  }

  exportAsMarkdown(): string {
    if (!this.currentJournal) return '# No Active Run\n\nStart a new run to generate a journal.';

    const j = this.currentJournal;
    const lines: string[] = [];

    // Header
    lines.push(`# Run Journal: ${j.runId}`);
    lines.push('');
    lines.push(`**Case ID:** ${j.caseId}`);
    lines.push(`**Workforce:** ${j.workforceType}`);
    lines.push(`**Pack Version:** ${j.packVersion}`);
    lines.push(`**Policy Hash:** \`${j.policyHash}\``);
    lines.push(`**Started:** ${new Date(j.startTime).toLocaleString()}`);
    if (j.endTime) {
      lines.push(`**Ended:** ${new Date(j.endTime).toLocaleString()}`);
    }
    lines.push(`**Status:** ${j.status.toUpperCase()}`);
    lines.push('');

    // Step Timeline
    lines.push('## Step Timeline');
    lines.push('');
    lines.push('| Step | Agent | Status | Duration | Gate | Auto |');
    lines.push('|------|-------|--------|----------|------|------|');
    j.steps.forEach(step => {
      const duration = step.duration ? `${(step.duration / 1000).toFixed(1)}s` : '-';
      const gate = step.gateTriggered ? '✓' : '-';
      const auto = step.autoApproved ? '⚡' : '-';
      lines.push(`| ${step.stepNumber} | ${step.agentRole} | ${step.status} | ${duration} | ${gate} | ${auto} |`);
    });
    lines.push('');

    // Gates Encountered
    if (j.gateReviews.length > 0) {
      lines.push('## Gate Reviews');
      lines.push('');
      j.gateReviews.forEach(gate => {
        lines.push(`### ${gate.gateId} (Step ${gate.stepId})`);
        lines.push(`- **Agent:** ${gate.agentRole}`);
        lines.push(`- **Classification:** ${gate.classificationType}`);
        lines.push(`- **Decision:** ${gate.decision}`);
        lines.push(`- **Approved By:** ${gate.approvedBy}`);
        lines.push(`- **What Happened:** ${gate.whatHappened}`);
        lines.push(`- **What I Approved:** ${gate.whatIApproved}`);
        lines.push(`- **Scope Impact:** ${gate.scopeImpact}`);
        if (gate.followUp) {
          lines.push(`- **Follow-up:** ${gate.followUp}`);
        }
        if (gate.riskFactors.length > 0) {
          lines.push(`- **Risk Factors:** ${gate.riskFactors.join(', ')}`);
        }
        lines.push('');
      });
    }

    // Scope Directives
    if (j.scopeDirectives.length > 0) {
      lines.push('## Scope Directives');
      lines.push('');
      j.scopeDirectives.forEach(dir => {
        const status = dir.active ? '✓ Active' : '✗ Inactive';
        lines.push(`- **[${dir.priority.toUpperCase()}]** ${dir.directive} (${status})`);
        lines.push(`  - *Rationale:* ${dir.rationale}`);
      });
      lines.push('');
    }

    // Human Patches
    if (j.humanPatches.length > 0) {
      lines.push('## Human Patches');
      lines.push('');
      j.humanPatches.forEach(patch => {
        lines.push(`### ${patch.id} (${patch.patchType})`);
        lines.push(`- **Target:** ${patch.targetAgent} → ${patch.targetField}`);
        lines.push(`- **Original:** \`${JSON.stringify(patch.originalValue)}\``);
        lines.push(`- **Corrected:** \`${JSON.stringify(patch.correctedValue)}\``);
        lines.push(`- **Reason:** ${patch.patchReason}`);
        lines.push(`- **Patched By:** ${patch.patchedBy}`);
        lines.push(`- **Hash:** \`${patch.patchHash}\``);
        lines.push('');
      });
    }

    // Evidence Artifacts
    if (j.evidenceArtifacts.length > 0) {
      lines.push('## Evidence Artifacts');
      lines.push('');
      lines.push('| Name | Type | Size | Producer | Hash |');
      lines.push('|------|------|------|----------|------|');
      j.evidenceArtifacts.forEach(ev => {
        lines.push(`| ${ev.name} | ${ev.type} | ${ev.size} | ${ev.producedBy} | \`${ev.hash.slice(0, 8)}...\` |`);
      });
      lines.push('');
    }

    // Extracted Fields
    const fieldCount = Object.keys(j.extractedFields).length;
    if (fieldCount > 0) {
      lines.push('## Extracted Fields');
      lines.push('');
      Object.entries(j.extractedFields).forEach(([field, data]: [string, any]) => {
        lines.push(`- **${field}:** ${JSON.stringify(data.value).slice(0, 100)}${JSON.stringify(data.value).length > 100 ? '...' : ''}`);
        lines.push(`  - *Source:* ${data.source} at ${data.extractedAt}`);
      });
      lines.push('');
    }

    // Operator Notes
    if (j.operatorNotes.trim()) {
      lines.push('## Operator Notes');
      lines.push('');
      lines.push(j.operatorNotes.trim());
      lines.push('');
    }

    // Summary
    if (j.runSummary) {
      lines.push('## Run Summary');
      lines.push('');
      lines.push(`- **Steps:** ${j.runSummary.completedSteps}/${j.runSummary.totalSteps}`);
      lines.push(`- **Gates:** ${j.runSummary.gatesApproved} approved, ${j.runSummary.gatesRejected} rejected, ${j.runSummary.autoApprovedGates} auto-approved`);
      lines.push(`- **Directives Applied:** ${j.runSummary.directivesApplied}`);
      lines.push(`- **Human Patches:** ${j.runSummary.humanPatchesApplied}`);
      lines.push(`- **Total Tokens:** ${j.runSummary.totalTokens.input} in / ${j.runSummary.totalTokens.output} out`);
      lines.push(`- **Duration:** ${(j.runSummary.totalDuration / 1000).toFixed(1)}s`);
      lines.push(`- **Final Status:** ${j.runSummary.finalStatus.toUpperCase()}`);
      lines.push('');
    }

    // Footer
    lines.push('---');
    lines.push(`*Generated by ACE Run Journal Service at ${new Date().toISOString()}*`);

    return lines.join('\n');
  }

  exportAsJSON(): string {
    return JSON.stringify(this.currentJournal, null, 2);
  }

  // -------------------------------------------------------------------------
  // Private Helpers
  // -------------------------------------------------------------------------

  private generateRunSummary(finalStatus: 'success' | 'partial' | 'failed'): RunSummary {
    if (!this.currentJournal) throw new Error('No journal');

    const j = this.currentJournal;
    const totalTokens = j.steps.reduce(
      (acc, step) => ({
        input: acc.input + (step.tokenUsage?.input || 0),
        output: acc.output + (step.tokenUsage?.output || 0)
      }),
      { input: 0, output: 0 }
    );

    const totalDuration = j.steps.reduce((acc, step) => acc + (step.duration || 0), 0);

    return {
      totalSteps: j.steps.length,
      completedSteps: j.steps.filter(s => s.status === 'completed').length,
      gatesEncountered: j.gateReviews.length,
      gatesApproved: j.gateReviews.filter(g => g.decision === 'approved' || g.decision === 'approved_with_notes').length,
      gatesRejected: j.gateReviews.filter(g => g.decision === 'rejected').length,
      autoApprovedGates: j.steps.filter(s => s.autoApproved).length,
      directivesApplied: j.scopeDirectives.filter(d => d.active).length,
      humanPatchesApplied: j.humanPatches.length,
      totalTokens,
      totalDuration,
      finalStatus
    };
  }

  private generateHash(input: string): string {
    // Simple hash for demo - in production use crypto
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
      const char = input.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16).padStart(8, '0').toUpperCase();
  }

  private saveToStorage(): void {
    try {
      localStorage.setItem('ace_run_journal', JSON.stringify(this.currentJournal));
      localStorage.setItem('ace_journal_history', JSON.stringify(this.journalHistory.slice(0, 10)));
      localStorage.setItem('ace_global_directives', JSON.stringify(this.globalDirectives));
    } catch (e) {
      console.warn('[RunJournal] Failed to save to storage:', e);
    }
  }

  private loadFromStorage(): void {
    try {
      const journal = localStorage.getItem('ace_run_journal');
      const history = localStorage.getItem('ace_journal_history');
      const directives = localStorage.getItem('ace_global_directives');

      if (journal) this.currentJournal = JSON.parse(journal);
      if (history) this.journalHistory = JSON.parse(history);
      if (directives) this.globalDirectives = JSON.parse(directives);
    } catch (e) {
      console.warn('[RunJournal] Failed to load from storage:', e);
    }
  }

  clearStorage(): void {
    this.currentJournal = null;
    this.journalHistory = [];
    this.globalDirectives = [];
    localStorage.removeItem('ace_run_journal');
    localStorage.removeItem('ace_journal_history');
    localStorage.removeItem('ace_global_directives');
  }
}

// Export singleton
export const runJournal = RunJournalService.getInstance();

// Export types for UI components
export type { RunJournalService };
