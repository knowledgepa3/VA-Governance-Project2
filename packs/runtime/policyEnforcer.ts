/**
 * Pack Policy Enforcer
 *
 * Bridges Pack policies to the MAI Runtime for real enforcement.
 * This is what makes pack policies actually DO something.
 *
 * Architecture:
 *   Pack Manifest (declares policies)
 *        ↓
 *   Policy Enforcer (this file)
 *        ↓
 *   MAI Runtime (enforces decisions)
 *        ↓
 *   Audit Log (records everything)
 */

import { packRegistry } from '../registry';
import { packConfigService } from '../configService';
import {
  PolicyDefinition,
  PackStatus,
  InstalledPack,
  ThresholdConfig
} from '../types';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Enforcement context - what's being evaluated
 */
export interface EnforcementContext {
  /** Type of action being attempted */
  actionType: string;

  /** Actor performing the action */
  actor: {
    userId: string;
    role: string;
    sessionId?: string;
  };

  /** Resource being acted upon */
  resource?: {
    type: string;
    id: string;
    name?: string;
  };

  /** Relevant data for policy evaluation */
  data?: Record<string, any>;

  /** Environment context */
  environment: {
    mode: 'production' | 'demo';
    strictMode: boolean;
  };
}

/**
 * Enforcement result - what the policy decided
 */
export interface EnforcementResult {
  /** Overall decision */
  decision: 'ALLOW' | 'BLOCK' | 'REQUIRE_APPROVAL' | 'ALERT';

  /** Policies that were evaluated */
  evaluatedPolicies: PolicyEvaluationResult[];

  /** Blocking policy (if blocked) */
  blockingPolicy?: {
    packId: string;
    policyId: string;
    policyName: string;
    reason: string;
  };

  /** Required approvals (if any) */
  requiredApprovals?: {
    packId: string;
    policyId: string;
    approverRole: string;
    reason: string;
  }[];

  /** Alerts generated (for ADVISORY/INFORMATIONAL) */
  alerts?: {
    packId: string;
    policyId: string;
    message: string;
    level: 'info' | 'warning';
  }[];

  /** Audit record of this evaluation */
  auditRecord: EnforcementAuditRecord;
}

/**
 * Individual policy evaluation result
 */
export interface PolicyEvaluationResult {
  packId: string;
  policyId: string;
  policyName: string;
  classification: 'MANDATORY' | 'ADVISORY' | 'INFORMATIONAL';
  triggered: boolean;
  decision: 'ALLOW' | 'BLOCK' | 'REQUIRE_APPROVAL' | 'ALERT' | 'LOG';
  reason?: string;
  thresholdsChecked?: {
    thresholdId: string;
    thresholdValue: number;
    actualValue: number;
    passed: boolean;
  }[];
}

/**
 * Audit record of enforcement
 */
export interface EnforcementAuditRecord {
  timestamp: string;
  enforcementId: string;
  actionType: string;
  actor: { userId: string; role: string };
  decision: string;
  policiesEvaluated: number;
  policiesTriggered: number;
  blockedBy?: string;
  duration: number;
}

// =============================================================================
// POLICY ENFORCER SERVICE
// =============================================================================

export class PackPolicyEnforcer {
  private static instance: PackPolicyEnforcer;
  private enforcementLog: EnforcementAuditRecord[] = [];

  private constructor() {}

  static getInstance(): PackPolicyEnforcer {
    if (!PackPolicyEnforcer.instance) {
      PackPolicyEnforcer.instance = new PackPolicyEnforcer();
    }
    return PackPolicyEnforcer.instance;
  }

  /**
   * Enforce all applicable policies for an action
   * THIS IS THE MAIN ENFORCEMENT POINT
   */
  async enforce(context: EnforcementContext): Promise<EnforcementResult> {
    const startTime = Date.now();
    const enforcementId = `enf-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const evaluatedPolicies: PolicyEvaluationResult[] = [];
    const requiredApprovals: EnforcementResult['requiredApprovals'] = [];
    const alerts: EnforcementResult['alerts'] = [];

    let overallDecision: EnforcementResult['decision'] = 'ALLOW';
    let blockingPolicy: EnforcementResult['blockingPolicy'] | undefined;

    // Get all installed and enabled packs
    const installedPacks = packRegistry.getInstalledPacks()
      .filter(p => p.status === PackStatus.INSTALLED);

    // Evaluate each pack's policies
    for (const pack of installedPacks) {
      const policies = pack.manifest.provides.policies || [];

      for (const policy of policies) {
        // Skip disabled policies
        if (!pack.enabledPolicies.includes(policy.id)) {
          continue;
        }

        // Evaluate this policy
        const result = await this.evaluatePolicy(pack, policy, context);
        evaluatedPolicies.push(result);

        if (result.triggered) {
          // Handle based on classification
          switch (policy.classification) {
            case 'MANDATORY':
              if (result.decision === 'BLOCK') {
                overallDecision = 'BLOCK';
                blockingPolicy = {
                  packId: pack.manifest.id,
                  policyId: policy.id,
                  policyName: policy.name,
                  reason: result.reason || policy.description
                };
              } else if (result.decision === 'REQUIRE_APPROVAL') {
                if (overallDecision !== 'BLOCK') {
                  overallDecision = 'REQUIRE_APPROVAL';
                }
                const approverRole = this.getApproverRole(policy);
                requiredApprovals.push({
                  packId: pack.manifest.id,
                  policyId: policy.id,
                  approverRole,
                  reason: result.reason || policy.description
                });
              }
              break;

            case 'ADVISORY':
              if (overallDecision === 'ALLOW') {
                overallDecision = 'ALERT';
              }
              alerts.push({
                packId: pack.manifest.id,
                policyId: policy.id,
                message: result.reason || policy.description,
                level: 'warning'
              });
              break;

            case 'INFORMATIONAL':
              alerts.push({
                packId: pack.manifest.id,
                policyId: policy.id,
                message: result.reason || policy.description,
                level: 'info'
              });
              break;
          }
        }
      }
    }

    // Create audit record
    const auditRecord: EnforcementAuditRecord = {
      timestamp: new Date().toISOString(),
      enforcementId,
      actionType: context.actionType,
      actor: { userId: context.actor.userId, role: context.actor.role },
      decision: overallDecision,
      policiesEvaluated: evaluatedPolicies.length,
      policiesTriggered: evaluatedPolicies.filter(p => p.triggered).length,
      blockedBy: blockingPolicy?.policyId,
      duration: Date.now() - startTime
    };

    this.enforcementLog.push(auditRecord);

    return {
      decision: overallDecision,
      evaluatedPolicies,
      blockingPolicy,
      requiredApprovals: requiredApprovals.length > 0 ? requiredApprovals : undefined,
      alerts: alerts.length > 0 ? alerts : undefined,
      auditRecord
    };
  }

  /**
   * Evaluate a single policy against context
   */
  private async evaluatePolicy(
    pack: InstalledPack,
    policy: PolicyDefinition,
    context: EnforcementContext
  ): Promise<PolicyEvaluationResult> {
    const result: PolicyEvaluationResult = {
      packId: pack.manifest.id,
      policyId: policy.id,
      policyName: policy.name,
      classification: policy.classification,
      triggered: false,
      decision: 'ALLOW'
    };

    // Check each trigger
    for (const trigger of policy.triggers) {
      const triggered = await this.checkTrigger(trigger, context, pack);

      if (triggered) {
        result.triggered = true;

        // Determine decision based on actions
        for (const action of policy.actions) {
          switch (action.type) {
            case 'block':
              result.decision = 'BLOCK';
              result.reason = action.config?.message || policy.description;
              break;

            case 'require_approval':
              if (result.decision !== 'BLOCK') {
                result.decision = 'REQUIRE_APPROVAL';
                result.reason = action.config?.message || policy.description;
              }
              break;

            case 'alert':
            case 'escalate':
              if (result.decision === 'ALLOW') {
                result.decision = 'ALERT';
                result.reason = action.config?.message || policy.description;
              }
              break;

            case 'log':
              if (result.decision === 'ALLOW') {
                result.decision = 'LOG';
              }
              break;
          }
        }

        // Check thresholds if present
        if (policy.thresholds) {
          result.thresholdsChecked = await this.checkThresholds(
            policy.thresholds,
            context,
            pack.manifest.id
          );
        }

        break; // First matching trigger is enough
      }
    }

    return result;
  }

  /**
   * Check if a trigger condition is met
   */
  private async checkTrigger(
    trigger: { type: string; config: Record<string, any> },
    context: EnforcementContext,
    pack: InstalledPack
  ): Promise<boolean> {
    switch (trigger.type) {
      case 'action':
        // Check if action type matches
        const actions = trigger.config.actions || [];
        return actions.includes(context.actionType);

      case 'data_pattern':
        // Check if data matches pattern
        const patterns = trigger.config.patterns || [];
        return this.matchDataPatterns(patterns, context.data);

      case 'threshold':
        // Check threshold condition
        return this.checkThresholdTrigger(trigger.config, context, pack.manifest.id);

      case 'event':
        // Check if event matches
        const events = trigger.config.events || [];
        return events.includes(context.actionType);

      default:
        return false;
    }
  }

  /**
   * Check data against patterns
   */
  private matchDataPatterns(patterns: string[], data?: Record<string, any>): boolean {
    if (!data) return false;

    const dataStr = JSON.stringify(data).toLowerCase();

    for (const pattern of patterns) {
      // Simple pattern matching - could be enhanced with regex
      if (dataStr.includes(pattern.toLowerCase())) {
        return true;
      }

      // Special pattern handlers
      switch (pattern) {
        case 'mock_data':
          if (data.dataSource?.samGov === 'MOCK' || data.dataSource?.usaSpending === 'MOCK') {
            return true;
          }
          break;

        case 'high_value':
          if (data.estimatedValue && data.estimatedValue > 5000000) {
            return true;
          }
          break;

        case 'low_win_probability':
          if (data.winProbability && data.winProbability < 30) {
            return true;
          }
          break;
      }
    }

    return false;
  }

  /**
   * Check threshold trigger condition
   */
  private checkThresholdTrigger(
    config: Record<string, any>,
    context: EnforcementContext,
    packId: string
  ): boolean {
    const field = config.field;
    const operator = config.operator;
    const thresholdId = config.threshold;

    // Get threshold value from config
    const thresholdValue = packConfigService.getConfigValue(packId, thresholdId);
    if (thresholdValue === undefined) return false;

    // Get actual value from context
    const actualValue = this.getFieldValue(field, context.data);
    if (actualValue === undefined) return false;

    // Compare
    switch (operator) {
      case '>': return actualValue > thresholdValue;
      case '>=': return actualValue >= thresholdValue;
      case '<': return actualValue < thresholdValue;
      case '<=': return actualValue <= thresholdValue;
      case '==': return actualValue === thresholdValue;
      case '!=': return actualValue !== thresholdValue;
      default: return false;
    }
  }

  /**
   * Check policy thresholds
   */
  private async checkThresholds(
    thresholds: ThresholdConfig[],
    context: EnforcementContext,
    packId: string
  ): Promise<PolicyEvaluationResult['thresholdsChecked']> {
    const results: PolicyEvaluationResult['thresholdsChecked'] = [];

    for (const threshold of thresholds) {
      const thresholdValue = threshold.currentValue ?? threshold.defaultValue;
      const actualValue = this.getFieldValue(threshold.id, context.data) || 0;

      results.push({
        thresholdId: threshold.id,
        thresholdValue,
        actualValue,
        passed: actualValue >= thresholdValue
      });
    }

    return results;
  }

  /**
   * Get field value from data
   */
  private getFieldValue(field: string, data?: Record<string, any>): number | undefined {
    if (!data) return undefined;

    // Support nested fields with dot notation
    const parts = field.split('.');
    let value: any = data;

    for (const part of parts) {
      if (value && typeof value === 'object' && part in value) {
        value = value[part];
      } else {
        return undefined;
      }
    }

    return typeof value === 'number' ? value : undefined;
  }

  /**
   * Get approver role from policy action config
   */
  private getApproverRole(policy: PolicyDefinition): string {
    for (const action of policy.actions) {
      if (action.type === 'require_approval' && action.config?.approverRole) {
        return action.config.approverRole;
      }
      if (action.type === 'escalate' && action.config?.to) {
        return action.config.to;
      }
    }
    return 'manager'; // Default
  }

  /**
   * Record approval for an enforcement decision
   */
  async recordApproval(
    enforcementId: string,
    approved: boolean,
    approver: { userId: string; role: string },
    justification?: string
  ): Promise<void> {
    const record: EnforcementAuditRecord = {
      timestamp: new Date().toISOString(),
      enforcementId: `${enforcementId}-approval`,
      actionType: 'approval',
      actor: approver,
      decision: approved ? 'APPROVED' : 'REJECTED',
      policiesEvaluated: 0,
      policiesTriggered: 0,
      duration: 0
    };

    this.enforcementLog.push(record);
  }

  /**
   * Get enforcement log
   */
  getEnforcementLog(): EnforcementAuditRecord[] {
    return [...this.enforcementLog];
  }

  /**
   * Clear enforcement log (for testing)
   */
  clearEnforcementLog(): void {
    this.enforcementLog = [];
  }
}

// =============================================================================
// CONVENIENCE FUNCTIONS
// =============================================================================

/**
 * Quick check if an action is allowed
 */
export async function isActionAllowed(
  actionType: string,
  actor: { userId: string; role: string },
  data?: Record<string, any>
): Promise<{ allowed: boolean; reason?: string }> {
  const enforcer = PackPolicyEnforcer.getInstance();

  const result = await enforcer.enforce({
    actionType,
    actor,
    data,
    environment: {
      mode: process.env.ACE_DEMO_MODE === 'true' ? 'demo' : 'production',
      strictMode: process.env.ACE_STRICT_MODE === 'true'
    }
  });

  return {
    allowed: result.decision === 'ALLOW' || result.decision === 'ALERT',
    reason: result.blockingPolicy?.reason
  };
}

/**
 * Enforce with automatic blocking
 * Throws error if action is blocked
 */
export async function enforceOrThrow(
  actionType: string,
  actor: { userId: string; role: string },
  data?: Record<string, any>
): Promise<EnforcementResult> {
  const enforcer = PackPolicyEnforcer.getInstance();

  const result = await enforcer.enforce({
    actionType,
    actor,
    data,
    environment: {
      mode: process.env.ACE_DEMO_MODE === 'true' ? 'demo' : 'production',
      strictMode: process.env.ACE_STRICT_MODE === 'true'
    }
  });

  if (result.decision === 'BLOCK') {
    const error = new Error(
      `Action blocked by policy: ${result.blockingPolicy?.policyName} - ${result.blockingPolicy?.reason}`
    );
    (error as any).enforcementResult = result;
    throw error;
  }

  return result;
}

// =============================================================================
// SINGLETON EXPORT
// =============================================================================

export const policyEnforcer = PackPolicyEnforcer.getInstance();
export default policyEnforcer;
