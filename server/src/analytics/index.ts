/**
 * Analytics Module Exports
 *
 * Compliance feedback loop + ML scoring engine.
 * Phase 5: getWorkerRiskProfile + generateDriftAlerts now enriched
 * with red team findings (risk boost + drift synthesis).
 */

// Capture (fire-and-forget, called from supervisor)
export { captureRunMetrics } from './complianceAnalytics';

// Aggregation (called from operator routes)
export {
  getComplianceOverview,
  getComplianceTrends,
  getPolicyEffectiveness,
  getWorkerRiskProfile,
  generateDriftAlerts,
} from './complianceAnalytics';

// ML Scoring (pure functions, exported for testing)
export {
  ema,
  zScore,
  bayesianRisk,
  scorePolicyEffectiveness,
} from './complianceAnalytics';

// Types
export type {
  ComplianceOverview,
  ComplianceTrendPoint,
  PolicyEffectivenessEntry,
  WorkerRiskEntry,
  DriftAlert,
} from './complianceAnalytics';
