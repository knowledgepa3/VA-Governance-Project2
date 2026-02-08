/**
 * Policy Router — Context-Aware Policy Routing Engine
 *
 * Wraps queryEffectivePolicies() with analytics-driven context enrichment.
 * Uses Phase 3 compliance analytics (Bayesian risk, drift alerts) to
 * intelligently determine which policies apply to a given execution context.
 *
 * Routing logic:
 *   1. Call queryEffectivePolicies() for base policy set (existing behavior)
 *   2. Call getWorkerRiskProfile() to get Bayesian risk per worker type
 *   3. Call generateDriftAlerts() to get active drift alerts
 *   4. Risk enrichment: If worker type has >30% Bayesian risk for a control
 *      family, auto-include that family's MANDATORY policies
 *   5. Drift escalation: If a control family has an active drift alert,
 *      escalate its policies from ADVISORY → MANDATORY treatment
 *   6. Return enriched policy set with routing context
 *
 * Invariants:
 *   - Fail-open: if analytics unavailable, falls back to basic queryEffectivePolicies()
 *   - Read-only against analytics — never writes to pipeline_runs
 *   - All analytics calls are non-blocking (Promise.allSettled)
 *   - Existing 18 base policies remain unchanged
 */

import * as govStore from './governanceLibrary.store';
import type { GovernancePolicy, PolicyQueryContext } from './governanceLibrary.schema';
import { getWorkerRiskProfile, generateDriftAlerts } from '../analytics';
import type { WorkerRiskEntry, DriftAlert } from '../analytics';
import { logger } from '../logger';

const log = logger.child({ component: 'PolicyRouter' });

// ═══════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════

export interface RoutingContext {
  /** Bayesian risk scores per control family for the worker type */
  riskEnrichment: Record<string, number>;
  /** Control families with active drift alerts */
  activeAlerts: string[];
  /** Control families where risk > 30% (escalated) */
  escalatedFamilies: string[];
  /** Human-readable explanation of routing decisions */
  routingDecision: string;
  /** Number of policies added via risk enrichment */
  enrichedPoliciesAdded: number;
  /** Whether analytics data was available */
  analyticsAvailable: boolean;
}

export interface RoutedPolicies {
  policies: GovernancePolicy[];
  routingContext: RoutingContext;
}

// ═══════════════════════════════════════════════════════════════════
// THRESHOLDS
// ═══════════════════════════════════════════════════════════════════

/** Bayesian risk threshold — worker types above this get extra MANDATORY policies */
const RISK_ESCALATION_THRESHOLD = 30; // percent

/** Drift alert severity threshold — alerts at or above this trigger escalation */
const DRIFT_SEVERITY_THRESHOLD: DriftAlert['severity'][] = ['medium', 'high'];

// ═══════════════════════════════════════════════════════════════════
// MAIN ROUTER
// ═══════════════════════════════════════════════════════════════════

/**
 * Route policies with analytics-driven context enrichment.
 *
 * Fail-open: if any analytics call fails, falls back to base
 * queryEffectivePolicies() with a minimal routing context.
 */
export async function routePolicies(
  tenantId: string,
  context: PolicyQueryContext,
): Promise<RoutedPolicies> {
  // Step 1: Base policy query (existing behavior — always runs)
  let basePolicies: GovernancePolicy[];
  try {
    basePolicies = await govStore.queryEffectivePolicies(tenantId, context);
  } catch (err) {
    log.warn('Base policy query failed — returning empty set', {
      error: (err as Error).message,
    });
    return {
      policies: [],
      routingContext: emptyRoutingContext('Base query failed — no policies'),
    };
  }

  // Step 2: Fetch analytics context (non-blocking, fail-open)
  const [riskResult, driftResult] = await Promise.allSettled([
    getWorkerRiskProfile(tenantId),
    generateDriftAlerts(tenantId),
  ]);

  const workerRisk = riskResult.status === 'fulfilled' ? riskResult.value : null;
  const driftAlerts = driftResult.status === 'fulfilled' ? driftResult.value : null;
  const analyticsAvailable = workerRisk !== null || driftAlerts !== null;

  // If no analytics available, return base policies with minimal context
  if (!analyticsAvailable) {
    log.debug('No analytics available — returning base policies only', {
      basePolicies: basePolicies.length,
    });
    return {
      policies: basePolicies,
      routingContext: emptyRoutingContext(
        `Base query returned ${basePolicies.length} policies (no analytics enrichment)`,
      ),
    };
  }

  // Step 3: Compute risk enrichment for the requesting worker type
  const riskEnrichment: Record<string, number> = {};
  const escalatedFamilies: string[] = [];

  if (workerRisk && context.workerType) {
    const workerProfile = workerRisk.find(w => w.workerType === context.workerType);
    if (workerProfile && workerProfile.bayesianRisk > RISK_ESCALATION_THRESHOLD) {
      // This worker type has high overall risk — escalate its top fail family
      if (workerProfile.topFailFamily) {
        riskEnrichment[workerProfile.topFailFamily] = workerProfile.bayesianRisk;
        escalatedFamilies.push(workerProfile.topFailFamily);
      }
    }

    // Also check per-family risk from all workers to build a risk map
    for (const profile of workerRisk) {
      if (profile.topFailFamily && profile.bayesianRisk > RISK_ESCALATION_THRESHOLD) {
        riskEnrichment[profile.topFailFamily] = Math.max(
          riskEnrichment[profile.topFailFamily] || 0,
          profile.bayesianRisk,
        );
      }
    }
  }

  // Step 4: Process drift alerts
  const activeAlerts: string[] = [];
  if (driftAlerts) {
    for (const alert of driftAlerts) {
      if (DRIFT_SEVERITY_THRESHOLD.includes(alert.severity)) {
        activeAlerts.push(alert.controlFamily);
        // Drift-alerted families get escalated too
        if (!escalatedFamilies.includes(alert.controlFamily)) {
          escalatedFamilies.push(alert.controlFamily);
        }
      }
    }
  }

  // Step 5: Fetch additional MANDATORY policies for escalated families
  let enrichedPoliciesAdded = 0;
  const basePolicyIds = new Set(basePolicies.map(p => p.id));
  const enrichedPolicies = [...basePolicies];

  if (escalatedFamilies.length > 0) {
    // Query MANDATORY policies for each escalated family
    for (const family of escalatedFamilies) {
      try {
        const familyPolicies = await govStore.queryEffectivePolicies(tenantId, {
          controlFamily: family,
          maiLevel: 'MANDATORY',
        });

        for (const policy of familyPolicies) {
          if (!basePolicyIds.has(policy.id)) {
            enrichedPolicies.push(policy);
            basePolicyIds.add(policy.id);
            enrichedPoliciesAdded++;
          }
        }
      } catch (err) {
        log.warn('Failed to fetch escalated family policies — skipping', {
          family,
          error: (err as Error).message,
        });
      }
    }
  }

  // Step 6: Build routing decision explanation
  const decisions: string[] = [];
  decisions.push(`Base query: ${basePolicies.length} policies`);

  if (escalatedFamilies.length > 0) {
    decisions.push(`Risk-escalated families: [${escalatedFamilies.join(', ')}]`);
  }
  if (activeAlerts.length > 0) {
    decisions.push(`Active drift alerts: [${activeAlerts.join(', ')}]`);
  }
  if (enrichedPoliciesAdded > 0) {
    decisions.push(`+${enrichedPoliciesAdded} MANDATORY policies added via enrichment`);
  }
  decisions.push(`Total: ${enrichedPolicies.length} policies`);

  const routingContext: RoutingContext = {
    riskEnrichment,
    activeAlerts,
    escalatedFamilies,
    routingDecision: decisions.join(' → '),
    enrichedPoliciesAdded,
    analyticsAvailable: true,
  };

  log.info('Policy routing completed', {
    basePolicies: basePolicies.length,
    enrichedTotal: enrichedPolicies.length,
    escalatedFamilies,
    activeAlerts: activeAlerts.length,
    enrichedAdded: enrichedPoliciesAdded,
  });

  return {
    policies: enrichedPolicies,
    routingContext,
  };
}

// ═══════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════

function emptyRoutingContext(decision: string): RoutingContext {
  return {
    riskEnrichment: {},
    activeAlerts: [],
    escalatedFamilies: [],
    routingDecision: decision,
    enrichedPoliciesAdded: 0,
    analyticsAvailable: false,
  };
}
