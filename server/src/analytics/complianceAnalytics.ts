/**
 * Compliance Analytics Engine — Feedback Loop + ML Scoring
 *
 * Three layers:
 *   1. CAPTURE — Records per-requirement compliance metrics from sealed runs
 *   2. AGGREGATION — SQL queries for pass rates, trends, effectiveness
 *   3. ML SCORING — Pure statistical functions (EMA, z-score, Bayesian risk)
 *
 * Invariants:
 *   - Capture is fire-and-forget: failure never blocks pipeline execution
 *   - All queries are read-only against compliance_metrics + pipeline_runs
 *   - ML scoring is pure math: no external APIs, no model files, no dependencies
 *   - Sealed runs are never modified
 */

import { query } from '../db/connection';
import { logger } from '../logger';
import type { EvidenceBundle } from '../pipeline/evidenceBundler';
import type { SpawnPlan, WorkerOutput } from '../pipeline/spawnPlan.schema';
import { getOpenFindingCounts, getWorkerFindingCounts } from '../redTeaming/redTeamStore';

const log = logger.child({ component: 'ComplianceAnalytics' });

// ═══════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════

export interface ComplianceMetricRow {
  id: string;
  runId: string;
  tenantId: string;
  policyId: string;
  controlFamily: string;
  requirementId: string;
  workerType: string;
  workerNodeId: string;
  domain: string;
  riskLevel: string;
  maiLevel: string;
  passed: boolean;
  checkType: string;
  reason: string | null;
  tokensUsed: number;
  durationMs: number;
  predictedPass: boolean | null;
  predictionConfidence: number | null;
  capturedAt: string;
}

export interface ComplianceOverview {
  complianceRate: number;
  complianceTrend: 'improving' | 'stable' | 'declining';
  totalMetricsRecorded: number;
  anomaliesDetected: number;
  topRiskFamily: string | null;
  policyEffectivenessAvg: number;
  byControlFamily: Array<{
    controlFamily: string;
    total: number;
    passed: number;
    rate: number;
    trend: 'improving' | 'stable' | 'declining';
    riskScore: number;
  }>;
  recentWindow: {
    days: number;
    checks: number;
    passRate: number;
  };
}

export interface ComplianceTrendPoint {
  date: string;
  total: number;
  passed: number;
  rate: number;
  anomaly: boolean;
}

export interface PolicyEffectivenessEntry {
  policyId: string;
  title: string;
  controlFamily: string;
  totalChecks: number;
  totalPassed: number;
  failRate: number;
  effectivenessScore: number;
  trend: 'improving' | 'stable' | 'declining';
}

export interface WorkerRiskEntry {
  workerType: string;
  totalChecks: number;
  failRate: number;
  avgTokens: number;
  avgDurationMs: number;
  bayesianRisk: number;
  topFailFamily: string | null;
  /** Open red team findings targeting this worker (added Phase 5) */
  openRedTeamFindings: number;
}

export interface DriftAlert {
  id: string;
  type: 'anomaly' | 'drift' | 'degradation';
  severity: 'low' | 'medium' | 'high';
  controlFamily: string;
  message: string;
  zScore: number;
  currentRate: number;
  baselineRate: number;
  detectedAt: string;
}

// ═══════════════════════════════════════════════════════════════════
// LAYER 1: METRICS CAPTURE (fire-and-forget)
// ═══════════════════════════════════════════════════════════════════

/**
 * Capture compliance metrics from a sealed pipeline run.
 * Called after sealRun() — extracts per-requirement results from
 * POLICY_COMPLIANCE artifacts and batch-inserts into compliance_metrics.
 *
 * Fire-and-forget: errors are logged, never thrown.
 */
export async function captureRunMetrics(
  runId: string,
  tenantId: string,
  plan: SpawnPlan,
  workerResults: Record<string, WorkerOutput>,
  bundle: EvidenceBundle,
): Promise<number> {
  try {
    // Find all POLICY_COMPLIANCE artifacts in the bundle
    const complianceArtifacts = bundle.artifacts.filter(
      a => a.artifactType === 'POLICY_COMPLIANCE'
    );

    if (complianceArtifacts.length === 0) {
      log.debug('No compliance artifacts in bundle — skipping metrics capture', { runId });
      return 0;
    }

    let rowsInserted = 0;

    for (const artifact of complianceArtifacts) {
      const nodeId = artifact.sourceNode || 'unknown';
      const node = plan.nodes.find(n => n.id === nodeId);
      const workerOutput = workerResults[nodeId];

      // Parse compliance records from the artifact description
      // The actual records are in the evidence bundle data, but we can reconstruct
      // from the stored worker results and the policy query context
      // For now, we extract what we need from workerResults metadata
      const complianceData = extractComplianceFromArtifact(artifact, nodeId, plan);

      for (const record of complianceData) {
        for (const req of record.requirements) {
          const metricId = `CM-${runId}-${nodeId}-${record.policyId}-${req.requirementId}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

          try {
            await query(
              `INSERT INTO compliance_metrics
               (id, run_id, tenant_id, policy_id, control_family, requirement_id,
                worker_type, worker_node_id, domain, risk_level, mai_level,
                passed, check_type, reason, tokens_used, duration_ms)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
               ON CONFLICT (id) DO NOTHING`,
              [
                metricId,
                runId,
                tenantId,
                record.policyId,
                record.controlFamily,
                req.requirementId,
                node?.type || 'unknown',
                nodeId,
                plan.domain || '',
                record.riskLevel || 'LOW',
                record.maiLevel || 'INFORMATIONAL',
                req.passed,
                req.checkType || 'automated',
                req.reason || null,
                workerOutput?.tokensUsed || 0,
                workerOutput?.durationMs || 0,
              ]
            );
            rowsInserted++;
          } catch (insertErr) {
            log.warn('Failed to insert compliance metric row', {
              runId, nodeId, policyId: record.policyId, error: (insertErr as Error).message
            });
          }
        }
      }
    }

    log.info('Compliance metrics captured', { runId, rowsInserted });
    return rowsInserted;
  } catch (err) {
    log.warn('Compliance metrics capture failed (non-blocking)', {
      runId, error: (err as Error).message
    });
    return 0;
  }
}

/**
 * Extract compliance records from a POLICY_COMPLIANCE artifact.
 * The artifact description contains summary info; we reconstruct structured data.
 */
function extractComplianceFromArtifact(
  artifact: EvidenceBundle['artifacts'][0],
  nodeId: string,
  plan: SpawnPlan,
): Array<{
  policyId: string;
  controlFamily: string;
  riskLevel: string;
  maiLevel: string;
  requirements: Array<{ requirementId: string; passed: boolean; checkType: string; reason: string }>;
}> {
  // The description format from evidenceBundler: "Policy compliance for {nodeId}: {n} checked, {m} passed"
  // The actual detailed records are stored in the sealed bundle's artifact data.
  // Since we have the contentHash but not the raw data in the bundle object,
  // we parse what we can from the description and create a summary record.
  //
  // In practice, the supervisor also stores compliance records in workerResults metadata.
  // For the metrics table, we need a representative record per policy checked.

  const desc = artifact.description || '';
  const match = desc.match(/(\d+) checked, (\d+) passed/);
  const totalChecked = match ? parseInt(match[1], 10) : 0;
  const totalPassed = match ? parseInt(match[2], 10) : 0;

  if (totalChecked === 0) return [];

  // Create a summary record — one entry per policy
  // The actual policy IDs come from the governance query at execution time
  // We create a representative metric with the available info
  return [{
    policyId: `aggregate-${nodeId}`,
    controlFamily: 'AGGREGATE',
    riskLevel: 'MEDIUM',
    maiLevel: 'ADVISORY',
    requirements: Array.from({ length: totalChecked }, (_, i) => ({
      requirementId: `req-${i + 1}`,
      passed: i < totalPassed,
      checkType: 'automated',
      reason: i < totalPassed ? 'Passed' : 'Failed',
    })),
  }];
}

// ═══════════════════════════════════════════════════════════════════
// LAYER 2: AGGREGATION QUERIES
// ═══════════════════════════════════════════════════════════════════

/**
 * Comprehensive compliance overview for operator dashboard.
 */
export async function getComplianceOverview(tenantId: string): Promise<ComplianceOverview> {
  // Parallel queries for speed
  const [totalResult, familyResult, recentResult, anomalyResult] = await Promise.all([
    // Overall pass rate
    query(
      `SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE passed) as passed
       FROM compliance_metrics WHERE tenant_id = $1`,
      [tenantId]
    ),
    // By control family
    query(
      `SELECT control_family,
              COUNT(*) as total,
              COUNT(*) FILTER (WHERE passed) as passed
       FROM compliance_metrics
       WHERE tenant_id = $1
       GROUP BY control_family
       ORDER BY COUNT(*) DESC`,
      [tenantId]
    ),
    // Recent window (last 7 days)
    query(
      `SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE passed) as passed
       FROM compliance_metrics
       WHERE tenant_id = $1 AND captured_at > now() - INTERVAL '7 days'`,
      [tenantId]
    ),
    // Anomaly check: families with recent pass rate <80% of all-time average
    query(
      `WITH baseline AS (
         SELECT control_family,
                COUNT(*) as total,
                COUNT(*) FILTER (WHERE passed) as passed
         FROM compliance_metrics
         WHERE tenant_id = $1
         GROUP BY control_family
       ),
       recent AS (
         SELECT control_family,
                COUNT(*) as total,
                COUNT(*) FILTER (WHERE passed) as passed
         FROM compliance_metrics
         WHERE tenant_id = $1 AND captured_at > now() - INTERVAL '7 days'
         GROUP BY control_family
       )
       SELECT b.control_family,
              CASE WHEN b.total > 0 THEN b.passed::float / b.total ELSE 1 END as baseline_rate,
              CASE WHEN r.total > 0 THEN r.passed::float / r.total ELSE 1 END as recent_rate,
              r.total as recent_total
       FROM baseline b
       LEFT JOIN recent r ON b.control_family = r.control_family
       WHERE r.total > 0
         AND b.total > 5
         AND (r.passed::float / NULLIF(r.total, 0)) < 0.8 * (b.passed::float / NULLIF(b.total, 0))`,
      [tenantId]
    ),
  ]);

  const total = parseInt(totalResult.rows[0]?.total || '0', 10);
  const passed = parseInt(totalResult.rows[0]?.passed || '0', 10);
  const overallRate = total > 0 ? Math.round((passed / total) * 100) : 100;

  const recentTotal = parseInt(recentResult.rows[0]?.total || '0', 10);
  const recentPassed = parseInt(recentResult.rows[0]?.passed || '0', 10);
  const recentRate = recentTotal > 0 ? Math.round((recentPassed / recentTotal) * 100) : 100;

  // Determine trend: compare recent rate to overall rate
  const trend = determineTrend(recentRate, overallRate);

  // Build family breakdown with trends and risk scores
  const byControlFamily = familyResult.rows.map((row: any) => {
    const fTotal = parseInt(row.total, 10);
    const fPassed = parseInt(row.passed, 10);
    const fRate = fTotal > 0 ? Math.round((fPassed / fTotal) * 100) : 100;
    return {
      controlFamily: row.control_family,
      total: fTotal,
      passed: fPassed,
      rate: fRate,
      trend: determineTrend(fRate, overallRate) as 'improving' | 'stable' | 'declining',
      riskScore: Math.round(bayesianRisk(fTotal - fPassed, fTotal) * 100),
    };
  });

  // Find top risk family
  const topRisk = byControlFamily
    .filter(f => f.total > 0)
    .sort((a, b) => b.riskScore - a.riskScore)[0];

  // Policy effectiveness: average across families
  const effectivenessScores = byControlFamily.map(f =>
    scorePolicyEffectiveness(f.total, f.total - f.passed, f.trend === 'declining' ? -1 : f.trend === 'improving' ? 1 : 0)
  );
  const avgEffectiveness = effectivenessScores.length > 0
    ? Math.round(effectivenessScores.reduce((s, e) => s + e, 0) / effectivenessScores.length)
    : 100;

  return {
    complianceRate: overallRate,
    complianceTrend: trend,
    totalMetricsRecorded: total,
    anomaliesDetected: anomalyResult.rows.length,
    topRiskFamily: topRisk?.controlFamily || null,
    policyEffectivenessAvg: avgEffectiveness,
    byControlFamily,
    recentWindow: {
      days: 7,
      checks: recentTotal,
      passRate: recentRate,
    },
  };
}

/**
 * Daily compliance trend data over a time window.
 */
export async function getComplianceTrends(
  tenantId: string,
  days: number = 30,
): Promise<ComplianceTrendPoint[]> {
  const result = await query(
    `SELECT DATE(captured_at) as day,
            COUNT(*) as total,
            COUNT(*) FILTER (WHERE passed) as passed
     FROM compliance_metrics
     WHERE tenant_id = $1
       AND captured_at > now() - ($2 || ' days')::INTERVAL
     GROUP BY DATE(captured_at)
     ORDER BY day ASC`,
    [tenantId, days.toString()]
  );

  if (result.rows.length === 0) return [];

  // Calculate rolling stats for anomaly detection
  const rates = result.rows.map((row: any) => {
    const t = parseInt(row.total, 10);
    const p = parseInt(row.passed, 10);
    return t > 0 ? p / t : 1;
  });

  const mean = rates.reduce((s, r) => s + r, 0) / rates.length;
  const stdDev = Math.sqrt(rates.reduce((s, r) => s + (r - mean) ** 2, 0) / rates.length);

  return result.rows.map((row: any, idx: number) => {
    const t = parseInt(row.total, 10);
    const p = parseInt(row.passed, 10);
    const rate = t > 0 ? Math.round((p / t) * 100) : 100;
    const z = zScore(rates[idx], mean, stdDev);

    return {
      date: row.day,
      total: t,
      passed: p,
      rate,
      anomaly: Math.abs(z) > 2.0,
    };
  });
}

/**
 * Per-policy effectiveness scores.
 */
export async function getPolicyEffectiveness(tenantId: string): Promise<PolicyEffectivenessEntry[]> {
  const result = await query(
    `SELECT cm.policy_id,
            cm.control_family,
            COUNT(*) as total_checks,
            COUNT(*) FILTER (WHERE cm.passed) as total_passed
     FROM compliance_metrics cm
     WHERE cm.tenant_id = $1
     GROUP BY cm.policy_id, cm.control_family
     ORDER BY COUNT(*) DESC
     LIMIT 50`,
    [tenantId]
  );

  // Get recent rates for trend calculation
  const recentResult = await query(
    `SELECT policy_id,
            COUNT(*) as total,
            COUNT(*) FILTER (WHERE passed) as passed
     FROM compliance_metrics
     WHERE tenant_id = $1 AND captured_at > now() - INTERVAL '7 days'
     GROUP BY policy_id`,
    [tenantId]
  );

  const recentMap = new Map<string, { total: number; passed: number }>();
  for (const row of recentResult.rows) {
    recentMap.set(row.policy_id, {
      total: parseInt(row.total, 10),
      passed: parseInt(row.passed, 10),
    });
  }

  return result.rows.map((row: any) => {
    const totalChecks = parseInt(row.total_checks, 10);
    const totalPassed = parseInt(row.total_passed, 10);
    const failRate = totalChecks > 0 ? (totalChecks - totalPassed) / totalChecks : 0;

    const recent = recentMap.get(row.policy_id);
    const recentRate = recent && recent.total > 0
      ? recent.passed / recent.total
      : totalChecks > 0 ? totalPassed / totalChecks : 1;
    const overallRate = totalChecks > 0 ? totalPassed / totalChecks : 1;
    const trendDir = determineTrend(Math.round(recentRate * 100), Math.round(overallRate * 100));

    const trendNum = trendDir === 'declining' ? -1 : trendDir === 'improving' ? 1 : 0;

    return {
      policyId: row.policy_id,
      title: row.policy_id, // We don't join to governance_policies here for speed
      controlFamily: row.control_family,
      totalChecks,
      totalPassed,
      failRate: Math.round(failRate * 100),
      effectivenessScore: scorePolicyEffectiveness(totalChecks, totalChecks - totalPassed, trendNum),
      trend: trendDir,
    };
  });
}

/**
 * Worker risk profiles — failure patterns per worker type.
 */
export async function getWorkerRiskProfile(tenantId: string): Promise<WorkerRiskEntry[]> {
  const result = await query(
    `SELECT worker_type,
            COUNT(*) as total_checks,
            COUNT(*) FILTER (WHERE NOT passed) as failures,
            AVG(tokens_used) as avg_tokens,
            AVG(duration_ms) as avg_duration,
            MODE() WITHIN GROUP (ORDER BY control_family) FILTER (WHERE NOT passed) as top_fail_family
     FROM compliance_metrics
     WHERE tenant_id = $1
     GROUP BY worker_type
     ORDER BY COUNT(*) FILTER (WHERE NOT passed) DESC`,
    [tenantId]
  );

  // Phase 5: Get red team finding counts per worker for risk boost
  const workerFindings = await getWorkerFindingCounts(tenantId).catch(() => []);
  const findingsMap = new Map<string, { targetWorker: string; total: number; critical: number; high: number }>(
    workerFindings.map(wf => [wf.targetWorker, wf] as [string, typeof wf])
  );

  return result.rows.map((row: any) => {
    const total = parseInt(row.total_checks, 10);
    const failures = parseInt(row.failures, 10);
    let risk = Math.round(bayesianRisk(failures, total) * 100);

    // Phase 5: Red team risk boost — each open HIGH/CRITICAL finding adds +5%
    // Capped at +30% boost, total capped at 95%
    const wfData = findingsMap.get(row.worker_type);
    const openFindings = wfData ? (wfData.critical + wfData.high) : 0;
    const redTeamBoost = Math.min(openFindings * 5, 30);
    risk = Math.min(risk + redTeamBoost, 95);

    return {
      workerType: row.worker_type,
      totalChecks: total,
      failRate: total > 0 ? Math.round((failures / total) * 100) : 0,
      avgTokens: Math.round(parseFloat(row.avg_tokens) || 0),
      avgDurationMs: Math.round(parseFloat(row.avg_duration) || 0),
      bayesianRisk: risk,
      topFailFamily: row.top_fail_family || null,
      openRedTeamFindings: wfData?.total || 0,
    };
  });
}

/**
 * Generate drift alerts — compare recent compliance rates against baseline.
 */
export async function generateDriftAlerts(tenantId: string): Promise<DriftAlert[]> {
  const result = await query(
    `WITH baseline AS (
       SELECT control_family,
              COUNT(*) as total,
              COUNT(*) FILTER (WHERE passed) as passed,
              STDDEV(CASE WHEN passed THEN 1.0 ELSE 0.0 END) as std_dev
       FROM compliance_metrics
       WHERE tenant_id = $1
       GROUP BY control_family
       HAVING COUNT(*) >= 5
     ),
     recent AS (
       SELECT control_family,
              COUNT(*) as total,
              COUNT(*) FILTER (WHERE passed) as passed
       FROM compliance_metrics
       WHERE tenant_id = $1 AND captured_at > now() - INTERVAL '3 days'
       GROUP BY control_family
       HAVING COUNT(*) >= 2
     )
     SELECT b.control_family,
            b.total as baseline_total,
            b.passed as baseline_passed,
            b.std_dev,
            r.total as recent_total,
            r.passed as recent_passed
     FROM baseline b
     JOIN recent r ON b.control_family = r.control_family`,
    [tenantId]
  );

  const alerts: DriftAlert[] = [];

  for (const row of result.rows) {
    const baselineRate = parseInt(row.baseline_total, 10) > 0
      ? parseInt(row.baseline_passed, 10) / parseInt(row.baseline_total, 10)
      : 1;
    const recentRate = parseInt(row.recent_total, 10) > 0
      ? parseInt(row.recent_passed, 10) / parseInt(row.recent_total, 10)
      : 1;
    const stdDev = parseFloat(row.std_dev) || 0;

    const z = zScore(recentRate, baselineRate, stdDev);

    // Only alert on significant deviations
    if (Math.abs(z) > 2.0) {
      const severity = Math.abs(z) > 3.0 ? 'high' : Math.abs(z) > 2.5 ? 'medium' : 'low';
      const type = z < -2.0 ? 'degradation' : 'anomaly';

      alerts.push({
        id: `DRIFT-${row.control_family}-${Date.now()}`,
        type,
        severity,
        controlFamily: row.control_family,
        message: `${row.control_family}: compliance rate ${z < 0 ? 'dropped' : 'spiked'} to ${Math.round(recentRate * 100)}% (baseline: ${Math.round(baselineRate * 100)}%, z=${z.toFixed(2)})`,
        zScore: parseFloat(z.toFixed(2)),
        currentRate: Math.round(recentRate * 100),
        baselineRate: Math.round(baselineRate * 100),
        detectedAt: new Date().toISOString(),
      });
    }
  }

  // Phase 5: Synthesize drift alerts from open red team findings
  // Open HIGH/CRITICAL findings by control family → degradation alerts
  // policyRouter already escalates families with medium/high drift alerts,
  // so this integration triggers automatic policy escalation with zero router changes.
  try {
    const openFindings = await getOpenFindingCounts(tenantId);
    for (const finding of openFindings) {
      if (finding.severity !== 'HIGH' && finding.severity !== 'CRITICAL') continue;
      if (!finding.controlFamily) continue;

      const severity = finding.severity === 'CRITICAL' ? 'high' : 'medium';

      alerts.push({
        id: `RT-DRIFT-${finding.controlFamily}-${Date.now()}`,
        type: 'degradation',
        severity,
        controlFamily: finding.controlFamily,
        message: `Red team: ${finding.count} open ${finding.severity} finding(s) in ${finding.controlFamily} — adversarial vulnerability detected`,
        zScore: severity === 'high' ? -3.5 : -2.5, // Synthetic z-score for ranking
        currentRate: 0, // Not rate-based — finding-based
        baselineRate: 100,
        detectedAt: new Date().toISOString(),
      });
    }
  } catch (err) {
    log.debug('Red team drift synthesis skipped', { error: (err as Error).message });
  }

  return alerts.sort((a, b) => Math.abs(b.zScore) - Math.abs(a.zScore));
}

// ═══════════════════════════════════════════════════════════════════
// LAYER 3: ML SCORING (pure statistical functions)
// ═══════════════════════════════════════════════════════════════════

/**
 * Exponential Moving Average — weights recent observations more heavily.
 * α = 0.3 gives moderate responsiveness to recent changes.
 */
export function ema(current: number, previous: number, alpha: number = 0.3): number {
  return alpha * current + (1 - alpha) * previous;
}

/**
 * Z-Score — measures how many standard deviations a value is from the mean.
 * |z| > 2.0 = anomaly (>95th percentile deviation).
 */
export function zScore(value: number, mean: number, stdDev: number): number {
  if (stdDev === 0) return 0;
  return (value - mean) / stdDev;
}

/**
 * Bayesian Risk Prediction — P(fail | context) with Laplace smoothing.
 * Returns probability of failure (0.0 to 1.0).
 * Laplace smoothing (+1/+2) prevents zero probabilities and provides
 * a conservative prior when data is sparse.
 */
export function bayesianRisk(failures: number, total: number): number {
  return (failures + 1) / (total + 2);
}

/**
 * Policy Effectiveness Score — 0 to 100.
 * Higher score = policy is finding real issues AND improving over time.
 * Lower score = policy either rubber-stamps everything or catches too much.
 *
 * Formula: 100 * (1 - |failRate - optimalFailRate|) * trendBonus
 * Optimal fail rate ~5-15% (catches real issues without being a blocker)
 * Trend bonus: +10% if improving, -10% if declining
 */
export function scorePolicyEffectiveness(
  totalChecks: number,
  totalFails: number,
  trendDirection: number, // -1 declining, 0 stable, +1 improving
): number {
  if (totalChecks === 0) return 100; // No data = assume effective

  const failRate = totalFails / totalChecks;

  // Optimal fail rate is 5-15% — too low means rubber-stamp, too high means blocker
  const optimalCenter = 0.10;
  const deviation = Math.abs(failRate - optimalCenter);

  // Base score: how close to optimal
  const baseScore = Math.max(0, 100 * (1 - deviation * 5)); // Penalize deviation

  // Trend adjustment
  const trendBonus = trendDirection * 10;

  // Data confidence: more checks = more reliable score
  const confidenceMultiplier = Math.min(1, totalChecks / 20);

  // Blend: weight toward 75 (neutral) when low confidence
  const blended = baseScore * confidenceMultiplier + 75 * (1 - confidenceMultiplier);

  return Math.min(100, Math.max(0, Math.round(blended + trendBonus)));
}

/**
 * Determine trend direction by comparing recent rate to baseline.
 * Uses a 5-percentage-point threshold to avoid noise.
 */
function determineTrend(recentRate: number, baselineRate: number): 'improving' | 'stable' | 'declining' {
  const diff = recentRate - baselineRate;
  if (diff > 5) return 'improving';
  if (diff < -5) return 'declining';
  return 'stable';
}
