/**
 * Pack Runtime - Policy Enforcement Layer
 *
 * Connects pack policy definitions to actual enforcement.
 */

// Core enforcement
export {
  PackPolicyEnforcer,
  policyEnforcer,
  isActionAllowed,
  enforceOrThrow,
  type EnforcementContext,
  type EnforcementResult,
  type PolicyEvaluationResult,
  type EnforcementAuditRecord
} from './policyEnforcer';

// Federal BD Pack integration
export {
  BD_ACTIONS,
  enforceDataSource,
  enforceWinProbabilityReview,
  enforceBidDecisionApproval,
  enforceHighValueEscalation,
  logCompetitorAnalysis,
  enforceTeamingReview,
  checkDeadlineWarning,
  enforceOpportunityAnalysis,
  demoEnforcement
} from './bdIntegration';
