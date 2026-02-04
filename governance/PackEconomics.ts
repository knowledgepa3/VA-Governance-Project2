/**
 * PACK ECONOMICS v1.0.0
 *
 * Track ROI, time savings, and value generation from Job Pack usage.
 * Enables "this pack saved 40 hours" type metrics for sales and reporting.
 *
 * Key Metrics:
 * - Time saved per execution
 * - Cost avoided (manual labor cost)
 * - Error reduction
 * - Compliance value (audit time saved)
 * - Pack reuse multiplier
 */

// =============================================================================
// ECONOMIC CONFIGURATION
// =============================================================================

export interface EconomicConfig {
  // Labor costs (used for savings calculations)
  labor_cost_per_hour: number;        // Default: $75/hr
  senior_labor_cost_per_hour: number; // Default: $150/hr (for compliance work)

  // Time estimates
  default_manual_time_minutes: number;  // Default: 30 min per task
  compliance_audit_time_hours: number;  // Default: 4 hrs per audit

  // Currency
  currency: string;                   // Default: 'USD'
  currency_symbol: string;            // Default: '$'
}

export const DEFAULT_ECONOMIC_CONFIG: EconomicConfig = {
  labor_cost_per_hour: 75,
  senior_labor_cost_per_hour: 150,
  default_manual_time_minutes: 30,
  compliance_audit_time_hours: 4,
  currency: 'USD',
  currency_symbol: '$'
};

// =============================================================================
// EXECUTION ECONOMICS
// =============================================================================

export interface ExecutionEconomics {
  execution_id: string;
  pack_id: string;
  pack_version: string;

  // Timing
  executed_at: string;
  duration_ms: number;

  // Task-specific time savings
  manual_equivalent_minutes: number;  // How long this would take manually
  time_saved_minutes: number;         // manual_equivalent - actual_duration

  // Cost savings
  labor_cost_saved: number;           // time_saved * labor_rate
  error_cost_avoided: number;         // Estimated cost of manual errors avoided
  compliance_value: number;           // Value of audit-ready evidence

  // Quality metrics
  fields_extracted: number;
  confidence_score: number;           // Average confidence across fields
  errors_prevented: number;           // Estimated errors that would occur manually
}

export interface PackEconomicsSummary {
  pack_id: string;
  pack_version: string;
  analysis_period: {
    start: string;
    end: string;
  };

  // Execution metrics
  total_executions: number;
  successful_executions: number;
  success_rate: number;

  // Time savings
  total_time_saved_hours: number;
  average_time_saved_minutes: number;
  manual_equivalent_hours: number;

  // Cost savings
  total_labor_cost_saved: number;
  total_error_cost_avoided: number;
  total_compliance_value: number;
  total_value_generated: number;

  // Efficiency metrics
  automation_efficiency: number;      // Ratio of automated time to manual time
  roi_multiplier: number;             // Value generated / cost of pack

  // Reuse metrics
  executions_per_day: number;
  projected_annual_savings: number;
}

// =============================================================================
// PACK PRICING MODEL
// =============================================================================

export interface PackPricing {
  pack_id: string;

  // Pricing tiers
  pricing_model: 'FREE' | 'PER_EXECUTION' | 'MONTHLY' | 'ANNUAL' | 'ENTERPRISE';

  // Pricing details
  base_price?: number;                // For MONTHLY/ANNUAL
  per_execution_price?: number;       // For PER_EXECUTION
  included_executions?: number;       // Executions included in base price

  // Volume discounts
  volume_tiers?: {
    min_executions: number;
    discount_percent: number;
  }[];

  // Enterprise pricing
  enterprise_contact?: boolean;       // "Contact us for pricing"

  // Value-based pricing inputs
  estimated_time_saved_minutes: number;
  estimated_error_reduction_percent: number;

  // ROI calculation
  breakeven_executions?: number;      // Executions needed to break even
}

// =============================================================================
// LICENSE TRACKING
// =============================================================================

export interface PackLicense {
  license_id: string;
  pack_id: string;
  pack_version: string;

  // Licensee
  organization_id: string;
  organization_name: string;

  // License terms
  license_type: 'TRIAL' | 'STANDARD' | 'PROFESSIONAL' | 'ENTERPRISE';
  starts_at: string;
  expires_at?: string;              // Undefined = perpetual

  // Usage limits
  max_executions?: number;          // Undefined = unlimited
  max_users?: number;
  environments_allowed: ('DEMO' | 'STAGING' | 'PRODUCTION')[];

  // Certification requirements
  min_certification_level: number;  // What level this license requires

  // Usage tracking
  executions_used: number;
  last_execution_at?: string;

  // Status
  status: 'ACTIVE' | 'EXPIRED' | 'SUSPENDED' | 'REVOKED';
}

// =============================================================================
// CALCULATION FUNCTIONS
// =============================================================================

/**
 * Calculate economics for a single execution
 */
export function calculateExecutionEconomics(
  executionId: string,
  packId: string,
  packVersion: string,
  durationMs: number,
  fieldsExtracted: number,
  avgConfidence: number,
  manualEquivalentMinutes?: number,
  config: EconomicConfig = DEFAULT_ECONOMIC_CONFIG
): ExecutionEconomics {
  const manualMinutes = manualEquivalentMinutes || config.default_manual_time_minutes;
  const actualMinutes = durationMs / 60000;
  const timeSaved = Math.max(0, manualMinutes - actualMinutes);

  // Labor cost saved
  const laborCostSaved = (timeSaved / 60) * config.labor_cost_per_hour;

  // Error cost avoided (assume 5% error rate manually, $50 per error)
  const manualErrorRate = 0.05;
  const errorCostPerError = 50;
  const errorsPrevented = Math.floor(fieldsExtracted * manualErrorRate);
  const errorCostAvoided = errorsPrevented * errorCostPerError;

  // Compliance value (sealed evidence saves audit time)
  const auditTimeSavedMinutes = 15; // 15 min of audit time per execution
  const complianceValue = (auditTimeSavedMinutes / 60) * config.senior_labor_cost_per_hour;

  return {
    execution_id: executionId,
    pack_id: packId,
    pack_version: packVersion,
    executed_at: new Date().toISOString(),
    duration_ms: durationMs,
    manual_equivalent_minutes: manualMinutes,
    time_saved_minutes: timeSaved,
    labor_cost_saved: Math.round(laborCostSaved * 100) / 100,
    error_cost_avoided: Math.round(errorCostAvoided * 100) / 100,
    compliance_value: Math.round(complianceValue * 100) / 100,
    fields_extracted: fieldsExtracted,
    confidence_score: avgConfidence,
    errors_prevented: errorsPrevented
  };
}

/**
 * Calculate summary economics for a pack
 */
export function calculatePackEconomics(
  packId: string,
  packVersion: string,
  executions: ExecutionEconomics[],
  packCost: number = 0,
  config: EconomicConfig = DEFAULT_ECONOMIC_CONFIG
): PackEconomicsSummary {
  if (executions.length === 0) {
    return {
      pack_id: packId,
      pack_version: packVersion,
      analysis_period: { start: '', end: '' },
      total_executions: 0,
      successful_executions: 0,
      success_rate: 0,
      total_time_saved_hours: 0,
      average_time_saved_minutes: 0,
      manual_equivalent_hours: 0,
      total_labor_cost_saved: 0,
      total_error_cost_avoided: 0,
      total_compliance_value: 0,
      total_value_generated: 0,
      automation_efficiency: 0,
      roi_multiplier: 0,
      executions_per_day: 0,
      projected_annual_savings: 0
    };
  }

  // Sort by date
  const sorted = [...executions].sort((a, b) =>
    new Date(a.executed_at).getTime() - new Date(b.executed_at).getTime()
  );

  const startDate = sorted[0].executed_at;
  const endDate = sorted[sorted.length - 1].executed_at;

  // Aggregate metrics
  const totalTimeSavedMinutes = executions.reduce((sum, e) => sum + e.time_saved_minutes, 0);
  const totalManualMinutes = executions.reduce((sum, e) => sum + e.manual_equivalent_minutes, 0);
  const totalLaborSaved = executions.reduce((sum, e) => sum + e.labor_cost_saved, 0);
  const totalErrorAvoided = executions.reduce((sum, e) => sum + e.error_cost_avoided, 0);
  const totalComplianceValue = executions.reduce((sum, e) => sum + e.compliance_value, 0);

  const totalValue = totalLaborSaved + totalErrorAvoided + totalComplianceValue;

  // Calculate days in period
  const daysDiff = Math.max(1, (new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24));
  const executionsPerDay = executions.length / daysDiff;

  // ROI
  const roiMultiplier = packCost > 0 ? totalValue / packCost : Infinity;

  // Automation efficiency
  const totalActualMinutes = executions.reduce((sum, e) => sum + (e.duration_ms / 60000), 0);
  const automationEfficiency = totalManualMinutes > 0 ? totalManualMinutes / totalActualMinutes : 0;

  return {
    pack_id: packId,
    pack_version: packVersion,
    analysis_period: { start: startDate, end: endDate },
    total_executions: executions.length,
    successful_executions: executions.length, // Assuming all passed executions are successful
    success_rate: 1.0,
    total_time_saved_hours: Math.round((totalTimeSavedMinutes / 60) * 100) / 100,
    average_time_saved_minutes: Math.round((totalTimeSavedMinutes / executions.length) * 100) / 100,
    manual_equivalent_hours: Math.round((totalManualMinutes / 60) * 100) / 100,
    total_labor_cost_saved: Math.round(totalLaborSaved * 100) / 100,
    total_error_cost_avoided: Math.round(totalErrorAvoided * 100) / 100,
    total_compliance_value: Math.round(totalComplianceValue * 100) / 100,
    total_value_generated: Math.round(totalValue * 100) / 100,
    automation_efficiency: Math.round(automationEfficiency * 100) / 100,
    roi_multiplier: Math.round(roiMultiplier * 100) / 100,
    executions_per_day: Math.round(executionsPerDay * 100) / 100,
    projected_annual_savings: Math.round(totalValue * (365 / daysDiff) * 100) / 100
  };
}

/**
 * Calculate breakeven point for a pack
 */
export function calculateBreakeven(
  pricing: PackPricing,
  config: EconomicConfig = DEFAULT_ECONOMIC_CONFIG
): number {
  if (pricing.pricing_model === 'FREE') return 0;

  const valuePerExecution =
    ((pricing.estimated_time_saved_minutes / 60) * config.labor_cost_per_hour) +
    (pricing.estimated_error_reduction_percent / 100 * 50); // Assume $50 per error

  if (pricing.pricing_model === 'PER_EXECUTION' && pricing.per_execution_price) {
    // Never break even if per-execution cost > value
    if (pricing.per_execution_price >= valuePerExecution) return Infinity;
    return 1; // First execution is breakeven
  }

  if ((pricing.pricing_model === 'MONTHLY' || pricing.pricing_model === 'ANNUAL') && pricing.base_price) {
    return Math.ceil(pricing.base_price / valuePerExecution);
  }

  return 0;
}

/**
 * Check license validity
 */
export function checkLicense(license: PackLicense): {
  valid: boolean;
  reasons: string[];
  executionsRemaining?: number;
} {
  const reasons: string[] = [];

  // Check status
  if (license.status !== 'ACTIVE') {
    reasons.push(`License status: ${license.status}`);
  }

  // Check expiration
  if (license.expires_at) {
    const expiry = new Date(license.expires_at);
    if (expiry < new Date()) {
      reasons.push(`License expired on ${license.expires_at}`);
    }
  }

  // Check execution limit
  let executionsRemaining: number | undefined;
  if (license.max_executions !== undefined) {
    executionsRemaining = license.max_executions - license.executions_used;
    if (executionsRemaining <= 0) {
      reasons.push(`Execution limit reached (${license.max_executions})`);
    }
  }

  return {
    valid: reasons.length === 0,
    reasons,
    executionsRemaining
  };
}

/**
 * Record license usage
 */
export function recordUsage(license: PackLicense): PackLicense {
  return {
    ...license,
    executions_used: license.executions_used + 1,
    last_execution_at: new Date().toISOString()
  };
}

// =============================================================================
// REPORTING
// =============================================================================

/**
 * Generate economics report
 */
export function generateEconomicsReport(
  summary: PackEconomicsSummary,
  config: EconomicConfig = DEFAULT_ECONOMIC_CONFIG
): string {
  const { currency_symbol: $ } = config;

  return `
╔═══════════════════════════════════════════════════════════════╗
║                    PACK ECONOMICS REPORT                      ║
╠═══════════════════════════════════════════════════════════════╣
║  Pack:          ${summary.pack_id.padEnd(45)}║
║  Version:       ${summary.pack_version.padEnd(45)}║
║  Period:        ${summary.analysis_period.start.substring(0, 10)} to ${summary.analysis_period.end.substring(0, 10).padEnd(24)}║
╠═══════════════════════════════════════════════════════════════╣
║                                                               ║
║  EXECUTION METRICS                                            ║
║  ────────────────────────────────────────────────────────────║
║    Total Executions:        ${summary.total_executions.toString().padEnd(33)}║
║    Success Rate:            ${(summary.success_rate * 100).toFixed(1).padEnd(32)}%║
║    Executions/Day:          ${summary.executions_per_day.toFixed(2).padEnd(33)}║
║                                                               ║
║  TIME SAVINGS                                                 ║
║  ────────────────────────────────────────────────────────────║
║    Total Time Saved:        ${summary.total_time_saved_hours.toFixed(1).padEnd(28)} hrs║
║    Avg Time Saved/Run:      ${summary.average_time_saved_minutes.toFixed(1).padEnd(28)} min║
║    Manual Equivalent:       ${summary.manual_equivalent_hours.toFixed(1).padEnd(28)} hrs║
║    Automation Efficiency:   ${summary.automation_efficiency.toFixed(1).padEnd(33)}x║
║                                                               ║
║  FINANCIAL VALUE                                              ║
║  ────────────────────────────────────────────────────────────║
║    Labor Cost Saved:        ${$}${summary.total_labor_cost_saved.toFixed(2).padEnd(31)}║
║    Error Cost Avoided:      ${$}${summary.total_error_cost_avoided.toFixed(2).padEnd(31)}║
║    Compliance Value:        ${$}${summary.total_compliance_value.toFixed(2).padEnd(31)}║
║                            ─────────────────────────────────── ║
║    TOTAL VALUE:             ${$}${summary.total_value_generated.toFixed(2).padEnd(31)}║
║                                                               ║
║  PROJECTIONS                                                  ║
║  ────────────────────────────────────────────────────────────║
║    Annual Savings:          ${$}${summary.projected_annual_savings.toFixed(2).padEnd(31)}║
║    ROI Multiplier:          ${summary.roi_multiplier === Infinity ? '∞' : summary.roi_multiplier.toFixed(1) + 'x'.padEnd(32)}║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
`.trim();
}

/**
 * Generate license summary
 */
export function generateLicenseSummary(license: PackLicense): string {
  const status = checkLicense(license);
  const statusIcon = status.valid ? '✅' : '❌';

  return `
╔═══════════════════════════════════════════════════════════════╗
║                      LICENSE SUMMARY                          ║
╠═══════════════════════════════════════════════════════════════╣
║  License ID:    ${license.license_id.substring(0, 40).padEnd(45)}║
║  Pack:          ${license.pack_id.padEnd(45)}║
║  Organization:  ${license.organization_name.padEnd(45)}║
║  Status:        ${statusIcon} ${license.status.padEnd(42)}║
╠═══════════════════════════════════════════════════════════════╣
║  License Type:  ${license.license_type.padEnd(45)}║
║  Starts:        ${license.starts_at.substring(0, 10).padEnd(45)}║
║  Expires:       ${(license.expires_at?.substring(0, 10) || 'Never').padEnd(45)}║
╠═══════════════════════════════════════════════════════════════╣
║  USAGE                                                        ║
║    Executions:      ${`${license.executions_used}${license.max_executions ? '/' + license.max_executions : ' (unlimited)'}`.padEnd(41)}║
║    Remaining:       ${(status.executionsRemaining?.toString() || 'Unlimited').padEnd(41)}║
║    Environments:    ${license.environments_allowed.join(', ').padEnd(41)}║
╚═══════════════════════════════════════════════════════════════╝
${!status.valid ? '\n⚠️ LICENSE ISSUES:\n' + status.reasons.map(r => `  • ${r}`).join('\n') : ''}
`.trim();
}

export default {
  DEFAULT_ECONOMIC_CONFIG,
  calculateExecutionEconomics,
  calculatePackEconomics,
  calculateBreakeven,
  checkLicense,
  recordUsage,
  generateEconomicsReport,
  generateLicenseSummary
};
