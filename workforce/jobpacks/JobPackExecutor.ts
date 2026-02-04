/**
 * JOB PACK EXECUTOR
 *
 * Executes Job Packs with:
 * - MAI boundary enforcement
 * - Escalation trigger detection
 * - Evidence capture at milestones
 * - Audit trail generation
 */

import {
  JobPack,
  ProcedureStep,
  EscalationTrigger,
  MicroSOP,
  validateJobPack,
  isActionAllowed,
  checkEscalation
} from './JobPackSchema';

// =============================================================================
// TYPES
// =============================================================================

export interface ExecutionContext {
  pack: JobPack;
  session_id: string;
  started_at: string;
  environment_mode: 'DEMO' | 'PROD';
  current_url?: string;
  action_count: number;
  screenshots_captured: string[];
  escalations: EscalationTrigger[];
  audit_log: AuditLogEntry[];
}

export interface AuditLogEntry {
  timestamp: string;
  action: string;
  step_id?: string;
  mai_level: string;
  result: 'success' | 'failure' | 'skipped' | 'escalated';
  details?: string;
  evidence_captured?: string;
}

export interface ExecutionResult {
  success: boolean;
  context: ExecutionContext;
  outputs: Record<string, any>;
  errors: string[];
  warnings: string[];
}

export interface StepResult {
  success: boolean;
  skipped: boolean;
  escalated: boolean;
  evidence?: string;
  error?: string;
}

// =============================================================================
// EXECUTOR CLASS
// =============================================================================

export class JobPackExecutor {
  private context: ExecutionContext;
  private browserInterface: any; // MCP browser tools

  constructor(pack: JobPack, browserInterface: any, environmentMode: 'DEMO' | 'PROD' = 'DEMO') {
    // Validate pack before use
    const validation = validateJobPack(pack);
    if (!validation.valid) {
      throw new Error(`Invalid Job Pack: ${validation.errors.join(', ')}`);
    }

    this.context = {
      pack,
      session_id: `session_${Date.now()}`,
      started_at: new Date().toISOString(),
      environment_mode: environmentMode,
      action_count: 0,
      screenshots_captured: [],
      escalations: [],
      audit_log: []
    };

    this.browserInterface = browserInterface;
  }

  // ===========================================================================
  // ACTION PERMISSION CHECK
  // ===========================================================================

  /**
   * Check if an action is allowed before executing
   */
  async checkPermission(action: string): Promise<{
    allowed: boolean;
    requires_approval: boolean;
    reason?: string;
  }> {
    const result = isActionAllowed(this.context.pack, action);

    this.log({
      timestamp: new Date().toISOString(),
      action: `permission_check:${action}`,
      mai_level: result.mai_level || 'UNKNOWN',
      result: result.allowed ? 'success' : 'failure',
      details: result.reason
    });

    return {
      allowed: result.allowed,
      requires_approval: result.requires_approval,
      reason: result.reason
    };
  }

  // ===========================================================================
  // ESCALATION CHECK
  // ===========================================================================

  /**
   * Check if current state triggers an escalation
   */
  async checkForEscalation(pageContent: string): Promise<EscalationTrigger | null> {
    for (const trigger of this.context.pack.escalation.triggers) {
      if (pageContent.toLowerCase().includes(trigger.condition.toLowerCase())) {
        this.context.escalations.push(trigger);

        this.log({
          timestamp: new Date().toISOString(),
          action: `escalation_triggered:${trigger.trigger_id}`,
          mai_level: 'MANDATORY',
          result: 'escalated',
          details: trigger.description
        });

        return trigger;
      }
    }
    return null;
  }

  // ===========================================================================
  // STEP EXECUTION
  // ===========================================================================

  /**
   * Execute a single procedure step
   */
  async executeStep(step: ProcedureStep): Promise<StepResult> {
    // Check action count limit
    if (this.context.action_count >= this.context.pack.constraints.max_actions_per_session) {
      return {
        success: false,
        skipped: false,
        escalated: true,
        error: 'Maximum actions per session exceeded'
      };
    }

    // Check permission
    const actionType = step.action.split(':')[0];
    const permission = await this.checkPermission(actionType);

    if (!permission.allowed) {
      this.log({
        timestamp: new Date().toISOString(),
        action: step.action,
        step_id: step.step_id,
        mai_level: step.mai_level,
        result: 'failure',
        details: `Action not allowed: ${permission.reason}`
      });

      return {
        success: false,
        skipped: false,
        escalated: false,
        error: permission.reason
      };
    }

    // If requires approval for MANDATORY level, pause
    if (step.mai_level === 'MANDATORY' || permission.requires_approval) {
      this.log({
        timestamp: new Date().toISOString(),
        action: step.action,
        step_id: step.step_id,
        mai_level: 'MANDATORY',
        result: 'escalated',
        details: 'Action requires human approval'
      });

      return {
        success: false,
        skipped: false,
        escalated: true,
        error: 'Human approval required for this action'
      };
    }

    // Execute with retry logic
    let attempts = 0;
    const maxRetries = step.max_retries || this.context.pack.constraints.max_retries_per_step;

    while (attempts <= maxRetries) {
      try {
        // This would call the actual MCP browser tools
        // await this.browserInterface.execute(step.action, step.ui_anchor);

        this.context.action_count++;

        this.log({
          timestamp: new Date().toISOString(),
          action: step.action,
          step_id: step.step_id,
          mai_level: step.mai_level,
          result: 'success',
          details: `Attempt ${attempts + 1} succeeded`
        });

        return {
          success: true,
          skipped: false,
          escalated: false
        };

      } catch (error: any) {
        attempts++;

        if (attempts > maxRetries) {
          // Handle failure based on step.on_failure
          if (step.on_failure === 'escalate') {
            return {
              success: false,
              skipped: false,
              escalated: true,
              error: error.message
            };
          } else if (step.on_failure === 'skip') {
            return {
              success: false,
              skipped: true,
              escalated: false
            };
          } else if (step.on_failure === 'abort') {
            throw new Error(`Step ${step.step_id} failed and requires abort: ${error.message}`);
          }
        }
      }
    }

    return {
      success: false,
      skipped: false,
      escalated: false,
      error: 'Max retries exceeded'
    };
  }

  // ===========================================================================
  // SOP EXECUTION
  // ===========================================================================

  /**
   * Execute a Micro SOP
   */
  async executeSOP(sop: MicroSOP): Promise<{
    success: boolean;
    steps_completed: number;
    steps_skipped: number;
    escalated: boolean;
    error?: string;
  }> {
    let stepsCompleted = 0;
    let stepsSkipped = 0;

    this.log({
      timestamp: new Date().toISOString(),
      action: `sop_start:${sop.sop_id}`,
      mai_level: 'INFORMATIONAL',
      result: 'success',
      details: sop.title
    });

    for (const step of sop.steps) {
      const result = await this.executeStep(step);

      if (result.escalated) {
        return {
          success: false,
          steps_completed: stepsCompleted,
          steps_skipped: stepsSkipped,
          escalated: true,
          error: result.error
        };
      }

      if (result.skipped) {
        stepsSkipped++;
      } else if (result.success) {
        stepsCompleted++;
      } else {
        // Step failed and wasn't skipped
        return {
          success: false,
          steps_completed: stepsCompleted,
          steps_skipped: stepsSkipped,
          escalated: false,
          error: result.error
        };
      }
    }

    // Capture evidence on success
    for (const evidence of sop.evidence_on_success) {
      if (evidence.required) {
        // Capture evidence
        this.context.screenshots_captured.push(`${sop.sop_id}_${evidence.capture_type}`);
      }
    }

    this.log({
      timestamp: new Date().toISOString(),
      action: `sop_complete:${sop.sop_id}`,
      mai_level: 'INFORMATIONAL',
      result: 'success',
      details: `Completed ${stepsCompleted} steps, skipped ${stepsSkipped}`
    });

    return {
      success: true,
      steps_completed: stepsCompleted,
      steps_skipped: stepsSkipped,
      escalated: false
    };
  }

  // ===========================================================================
  // LOGGING
  // ===========================================================================

  private log(entry: AuditLogEntry): void {
    this.context.audit_log.push(entry);
  }

  // ===========================================================================
  // GETTERS
  // ===========================================================================

  getAuditLog(): AuditLogEntry[] {
    return this.context.audit_log;
  }

  getContext(): ExecutionContext {
    return this.context;
  }

  getEscalations(): EscalationTrigger[] {
    return this.context.escalations;
  }
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Load a Job Pack from file
 */
export function loadJobPack(filePath: string): JobPack {
  const fs = require('fs');
  const content = fs.readFileSync(filePath, 'utf-8');
  const pack = JSON.parse(content) as JobPack;

  const validation = validateJobPack(pack);
  if (!validation.valid) {
    throw new Error(`Invalid Job Pack at ${filePath}: ${validation.errors.join(', ')}`);
  }

  return pack;
}

/**
 * Generate execution summary for audit
 */
export function generateExecutionSummary(context: ExecutionContext): string {
  const summary = `
# Job Pack Execution Summary

**Pack ID:** ${context.pack.pack_id}
**Session ID:** ${context.session_id}
**Started:** ${context.started_at}
**Environment:** ${context.environment_mode}

## Statistics
- Total Actions: ${context.action_count}
- Screenshots Captured: ${context.screenshots_captured.length}
- Escalations: ${context.escalations.length}
- Audit Log Entries: ${context.audit_log.length}

## Escalations
${context.escalations.length === 0 ? 'None' :
  context.escalations.map(e => `- [${e.severity}] ${e.trigger_id}: ${e.description}`).join('\n')}

## Action Summary by MAI Level
- INFORMATIONAL: ${context.audit_log.filter(e => e.mai_level === 'INFORMATIONAL').length}
- ADVISORY: ${context.audit_log.filter(e => e.mai_level === 'ADVISORY').length}
- MANDATORY: ${context.audit_log.filter(e => e.mai_level === 'MANDATORY').length}

## Outcome
- Successful: ${context.audit_log.filter(e => e.result === 'success').length}
- Failed: ${context.audit_log.filter(e => e.result === 'failure').length}
- Skipped: ${context.audit_log.filter(e => e.result === 'skipped').length}
- Escalated: ${context.audit_log.filter(e => e.result === 'escalated').length}
`;

  return summary;
}

export default {
  JobPackExecutor,
  loadJobPack,
  generateExecutionSummary
};
