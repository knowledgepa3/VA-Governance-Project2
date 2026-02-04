/**
 * Federal BD Pack - Runtime Integration
 *
 * Connects the Federal BD Pack policies to the BD Workforce.
 * This is the "proof pack" integration that makes demos real.
 *
 * Enforcement Points:
 * 1. Data source verification (no mock in production)
 * 2. Win probability review (human review for low probability)
 * 3. Bid decision approval (manager approval required)
 * 4. High value escalation (executive approval for $5M+)
 * 5. Competitor analysis logging
 * 6. Teaming recommendation review
 * 7. Deadline warnings
 */

import { policyEnforcer, EnforcementResult, EnforcementContext } from './policyEnforcer';
import { packRegistry } from '../registry';
import { packConfigService } from '../configService';

// =============================================================================
// BD-SPECIFIC ACTION TYPES
// =============================================================================

export const BD_ACTIONS = {
  // Data operations
  FETCH_SAM_DATA: 'bd.fetch_sam_data',
  FETCH_USASPENDING_DATA: 'bd.fetch_usaspending_data',
  USE_MOCK_DATA: 'bd.use_mock_data',

  // Analysis operations
  ANALYZE_OPPORTUNITY: 'bd.analyze_opportunity',
  ANALYZE_COMPETITORS: 'bd.analyze_competitors',
  CALCULATE_WIN_PROBABILITY: 'bd.calculate_win_probability',
  GENERATE_TEAMING_RECOMMENDATIONS: 'bd.generate_teaming_recommendations',

  // Decision operations
  MAKE_BID_DECISION: 'bd.make_bid_decision',
  ESCALATE_HIGH_VALUE: 'bd.escalate_high_value',
  OVERRIDE_ADVISORY: 'bd.override_advisory',

  // Export operations
  EXPORT_DECISION_MEMO: 'bd.export_decision_memo',
  EXPORT_EVIDENCE_PACK: 'bd.export_evidence_pack'
} as const;

// =============================================================================
// ENFORCEMENT HOOKS
// =============================================================================

/**
 * Enforce data source policy
 * Blocks mock data in production + strict mode
 */
export async function enforceDataSource(
  dataSource: 'API' | 'SCRAPE' | 'MOCK',
  sourceSystem: 'samGov' | 'usaSpending',
  actor: { userId: string; role: string }
): Promise<EnforcementResult> {
  const isDemo = process.env.ACE_DEMO_MODE === 'true';
  const isStrict = process.env.ACE_STRICT_MODE === 'true';

  const result = await policyEnforcer.enforce({
    actionType: dataSource === 'MOCK' ? BD_ACTIONS.USE_MOCK_DATA : BD_ACTIONS.FETCH_SAM_DATA,
    actor,
    data: {
      dataSource: { [sourceSystem]: dataSource },
      isDemo,
      isStrict
    },
    environment: {
      mode: isDemo ? 'demo' : 'production',
      strictMode: isStrict
    }
  });

  // In strict mode + production, mock data is blocked
  if (!isDemo && isStrict && dataSource === 'MOCK') {
    return {
      ...result,
      decision: 'BLOCK',
      blockingPolicy: {
        packId: 'federal-bd',
        policyId: 'data-source-verification',
        policyName: 'Data Source Verification',
        reason: 'Mock data not permitted in production with strict mode enabled'
      }
    };
  }

  return result;
}

/**
 * Enforce win probability review
 * Advisory: recommends human review for low probability opportunities
 */
export async function enforceWinProbabilityReview(
  winProbability: number,
  opportunityId: string,
  actor: { userId: string; role: string }
): Promise<EnforcementResult> {
  // Get threshold from pack config (default 30%)
  const threshold = packConfigService.getConfigValue('federal-bd', 'win-probability-threshold') ?? 30;

  const result = await policyEnforcer.enforce({
    actionType: BD_ACTIONS.CALCULATE_WIN_PROBABILITY,
    actor,
    data: {
      winProbability,
      opportunityId,
      threshold
    },
    resource: {
      type: 'opportunity',
      id: opportunityId
    },
    environment: {
      mode: process.env.ACE_DEMO_MODE === 'true' ? 'demo' : 'production',
      strictMode: process.env.ACE_STRICT_MODE === 'true'
    }
  });

  // Add specific alert for low probability
  if (winProbability < threshold) {
    return {
      ...result,
      decision: result.decision === 'BLOCK' ? 'BLOCK' : 'ALERT',
      alerts: [
        ...(result.alerts || []),
        {
          packId: 'federal-bd',
          policyId: 'win-probability-review',
          message: `Win probability (${winProbability}%) is below threshold (${threshold}%). Human review recommended before proceeding.`,
          level: 'warning'
        }
      ]
    };
  }

  return result;
}

/**
 * Enforce bid decision approval
 * Mandatory: manager approval required for bid decisions
 */
export async function enforceBidDecisionApproval(
  opportunityId: string,
  bidDecision: string,
  estimatedValue: number,
  actor: { userId: string; role: string }
): Promise<EnforcementResult> {
  const result = await policyEnforcer.enforce({
    actionType: BD_ACTIONS.MAKE_BID_DECISION,
    actor,
    data: {
      opportunityId,
      bidDecision,
      estimatedValue
    },
    resource: {
      type: 'opportunity',
      id: opportunityId
    },
    environment: {
      mode: process.env.ACE_DEMO_MODE === 'true' ? 'demo' : 'production',
      strictMode: process.env.ACE_STRICT_MODE === 'true'
    }
  });

  // Bid decisions always require approval
  if (result.decision === 'ALLOW') {
    return {
      ...result,
      decision: 'REQUIRE_APPROVAL',
      requiredApprovals: [
        {
          packId: 'federal-bd',
          policyId: 'bid-decision-approval',
          approverRole: 'bd_manager',
          reason: 'All bid decisions require BD Manager approval'
        }
      ]
    };
  }

  return result;
}

/**
 * Enforce high value escalation
 * Mandatory: executive approval for opportunities over threshold
 */
export async function enforceHighValueEscalation(
  opportunityId: string,
  estimatedValue: number,
  actor: { userId: string; role: string }
): Promise<EnforcementResult> {
  // Get threshold from pack config (default $5M)
  const threshold = packConfigService.getConfigValue('federal-bd', 'high-value-threshold') ?? 5000000;

  const result = await policyEnforcer.enforce({
    actionType: BD_ACTIONS.ESCALATE_HIGH_VALUE,
    actor,
    data: {
      opportunityId,
      estimatedValue,
      threshold,
      high_value: estimatedValue >= threshold
    },
    resource: {
      type: 'opportunity',
      id: opportunityId
    },
    environment: {
      mode: process.env.ACE_DEMO_MODE === 'true' ? 'demo' : 'production',
      strictMode: process.env.ACE_STRICT_MODE === 'true'
    }
  });

  // Require executive approval for high value
  if (estimatedValue >= threshold) {
    return {
      ...result,
      decision: 'REQUIRE_APPROVAL',
      requiredApprovals: [
        ...(result.requiredApprovals || []),
        {
          packId: 'federal-bd',
          policyId: 'high-value-escalation',
          approverRole: 'executive',
          reason: `Opportunity value ($${(estimatedValue / 1000000).toFixed(1)}M) exceeds threshold ($${(threshold / 1000000).toFixed(1)}M). Executive approval required.`
        }
      ]
    };
  }

  return result;
}

/**
 * Log competitor analysis
 * Informational: logs all competitor analysis for audit
 */
export async function logCompetitorAnalysis(
  opportunityId: string,
  competitorsAnalyzed: string[],
  actor: { userId: string; role: string }
): Promise<EnforcementResult> {
  return policyEnforcer.enforce({
    actionType: BD_ACTIONS.ANALYZE_COMPETITORS,
    actor,
    data: {
      opportunityId,
      competitorsAnalyzed,
      competitorCount: competitorsAnalyzed.length
    },
    resource: {
      type: 'opportunity',
      id: opportunityId
    },
    environment: {
      mode: process.env.ACE_DEMO_MODE === 'true' ? 'demo' : 'production',
      strictMode: process.env.ACE_STRICT_MODE === 'true'
    }
  });
}

/**
 * Enforce teaming recommendation review
 * Advisory: human review recommended for teaming suggestions
 */
export async function enforceTeamingReview(
  opportunityId: string,
  recommendedPartners: string[],
  actor: { userId: string; role: string }
): Promise<EnforcementResult> {
  const result = await policyEnforcer.enforce({
    actionType: BD_ACTIONS.GENERATE_TEAMING_RECOMMENDATIONS,
    actor,
    data: {
      opportunityId,
      recommendedPartners,
      partnerCount: recommendedPartners.length
    },
    resource: {
      type: 'opportunity',
      id: opportunityId
    },
    environment: {
      mode: process.env.ACE_DEMO_MODE === 'true' ? 'demo' : 'production',
      strictMode: process.env.ACE_STRICT_MODE === 'true'
    }
  });

  // Add advisory alert
  if (recommendedPartners.length > 0) {
    return {
      ...result,
      alerts: [
        ...(result.alerts || []),
        {
          packId: 'federal-bd',
          policyId: 'teaming-recommendation-review',
          message: `${recommendedPartners.length} teaming partners recommended. Human review suggested before outreach.`,
          level: 'info'
        }
      ]
    };
  }

  return result;
}

/**
 * Check deadline warning
 * Informational: alerts on approaching deadlines
 */
export async function checkDeadlineWarning(
  opportunityId: string,
  deadline: Date,
  actor: { userId: string; role: string }
): Promise<EnforcementResult> {
  // Get warning threshold from pack config (default 7 days)
  const warningDays = packConfigService.getConfigValue('federal-bd', 'deadline-warning-days') ?? 7;

  const now = new Date();
  const daysToDeadline = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  const result = await policyEnforcer.enforce({
    actionType: BD_ACTIONS.ANALYZE_OPPORTUNITY,
    actor,
    data: {
      opportunityId,
      deadline: deadline.toISOString(),
      daysToDeadline,
      warningThreshold: warningDays
    },
    resource: {
      type: 'opportunity',
      id: opportunityId
    },
    environment: {
      mode: process.env.ACE_DEMO_MODE === 'true' ? 'demo' : 'production',
      strictMode: process.env.ACE_STRICT_MODE === 'true'
    }
  });

  // Add deadline alert if approaching
  if (daysToDeadline <= warningDays && daysToDeadline > 0) {
    return {
      ...result,
      alerts: [
        ...(result.alerts || []),
        {
          packId: 'federal-bd',
          policyId: 'deadline-warning',
          message: `Deadline approaching: ${daysToDeadline} days remaining (${deadline.toLocaleDateString()})`,
          level: daysToDeadline <= 3 ? 'warning' : 'info'
        }
      ]
    };
  } else if (daysToDeadline <= 0) {
    return {
      ...result,
      alerts: [
        ...(result.alerts || []),
        {
          packId: 'federal-bd',
          policyId: 'deadline-warning',
          message: `DEADLINE PASSED: ${deadline.toLocaleDateString()}`,
          level: 'warning'
        }
      ]
    };
  }

  return result;
}

// =============================================================================
// COMBINED ENFORCEMENT
// =============================================================================

/**
 * Full opportunity analysis enforcement
 * Runs all relevant policies for a BD opportunity analysis
 */
export async function enforceOpportunityAnalysis(
  opportunity: {
    id: string;
    title: string;
    estimatedValue: number;
    deadline: Date;
    winProbability?: number;
    dataSource?: {
      samGov: 'API' | 'SCRAPE' | 'MOCK';
      usaSpending: 'API' | 'SCRAPE' | 'MOCK';
    };
  },
  actor: { userId: string; role: string }
): Promise<{
  canProceed: boolean;
  requiresApproval: boolean;
  approvalTypes: string[];
  alerts: string[];
  blockReason?: string;
}> {
  const results: EnforcementResult[] = [];

  // 1. Check data source
  if (opportunity.dataSource) {
    results.push(await enforceDataSource(
      opportunity.dataSource.samGov,
      'samGov',
      actor
    ));
    results.push(await enforceDataSource(
      opportunity.dataSource.usaSpending,
      'usaSpending',
      actor
    ));
  }

  // 2. Check deadline
  results.push(await checkDeadlineWarning(
    opportunity.id,
    opportunity.deadline,
    actor
  ));

  // 3. Check win probability if available
  if (opportunity.winProbability !== undefined) {
    results.push(await enforceWinProbabilityReview(
      opportunity.winProbability,
      opportunity.id,
      actor
    ));
  }

  // 4. Check high value escalation
  results.push(await enforceHighValueEscalation(
    opportunity.id,
    opportunity.estimatedValue,
    actor
  ));

  // Aggregate results
  let canProceed = true;
  let requiresApproval = false;
  const approvalTypes: string[] = [];
  const alerts: string[] = [];
  let blockReason: string | undefined;

  for (const result of results) {
    if (result.decision === 'BLOCK') {
      canProceed = false;
      blockReason = result.blockingPolicy?.reason;
    }

    if (result.decision === 'REQUIRE_APPROVAL') {
      requiresApproval = true;
      for (const approval of result.requiredApprovals || []) {
        if (!approvalTypes.includes(approval.approverRole)) {
          approvalTypes.push(approval.approverRole);
        }
      }
    }

    for (const alert of result.alerts || []) {
      alerts.push(alert.message);
    }
  }

  return {
    canProceed,
    requiresApproval,
    approvalTypes,
    alerts,
    blockReason
  };
}

// =============================================================================
// DEMO HELPER
// =============================================================================

/**
 * Demo function to show enforcement in action
 */
export async function demoEnforcement(): Promise<void> {
  const actor = { userId: 'demo-user', role: 'analyst' };

  console.log('\n=== Federal BD Pack - Policy Enforcement Demo ===\n');

  // 1. Mock data in strict mode
  console.log('1. Testing mock data in production (strict mode)...');
  const mockResult = await enforceDataSource('MOCK', 'samGov', actor);
  console.log(`   Decision: ${mockResult.decision}`);
  if (mockResult.blockingPolicy) {
    console.log(`   Blocked by: ${mockResult.blockingPolicy.policyName}`);
  }

  // 2. Low win probability
  console.log('\n2. Testing low win probability (25%)...');
  const winProbResult = await enforceWinProbabilityReview(25, 'OPP-001', actor);
  console.log(`   Decision: ${winProbResult.decision}`);
  for (const alert of winProbResult.alerts || []) {
    console.log(`   Alert: ${alert.message}`);
  }

  // 3. High value opportunity
  console.log('\n3. Testing high value opportunity ($7.5M)...');
  const highValueResult = await enforceHighValueEscalation('OPP-002', 7500000, actor);
  console.log(`   Decision: ${highValueResult.decision}`);
  for (const approval of highValueResult.requiredApprovals || []) {
    console.log(`   Requires approval from: ${approval.approverRole}`);
  }

  // 4. Approaching deadline
  console.log('\n4. Testing approaching deadline (3 days)...');
  const threeDaysFromNow = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
  const deadlineResult = await checkDeadlineWarning('OPP-003', threeDaysFromNow, actor);
  for (const alert of deadlineResult.alerts || []) {
    console.log(`   Alert: ${alert.message}`);
  }

  console.log('\n=== Demo Complete ===\n');
}
