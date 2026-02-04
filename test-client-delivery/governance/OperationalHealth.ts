/**
 * OPERATIONAL HEALTH v1.0.0
 *
 * Monitor pack health, detect drift, and track execution history.
 *
 * Features:
 * - UI Anchor Health Checks (detect site changes)
 * - Pack Drift Detection (version tracking, alerts)
 * - Repeated Runs Tracking (execution history, metrics)
 * - Health Scoring and Alerts
 */

import * as crypto from 'crypto';

// =============================================================================
// UI ANCHOR HEALTH
// =============================================================================

export interface UIAnchorCheck {
  anchor_name: string;
  anchor_type: string;
  anchor_value: string;

  // Check result
  status: 'FOUND' | 'NOT_FOUND' | 'CHANGED' | 'TIMEOUT' | 'ERROR';
  found_value?: string;       // Actual value found (if different)

  // Timing
  checked_at: string;
  response_time_ms: number;

  // Historical
  last_known_good?: string;   // Last time this anchor was confirmed working
  failure_count: number;      // Consecutive failures
}

export interface UIHealthReport {
  pack_id: string;
  domain: string;
  checked_at: string;

  // Overall status
  health_score: number;       // 0-100
  status: 'HEALTHY' | 'DEGRADED' | 'BROKEN' | 'UNKNOWN';

  // Anchor results
  total_anchors: number;
  anchors_found: number;
  anchors_missing: number;
  anchors_changed: number;

  // Details
  anchor_checks: UIAnchorCheck[];

  // Recommendations
  recommendations: string[];

  // Alert level
  alert_level: 'NONE' | 'WARNING' | 'CRITICAL';
}

/**
 * Simulate UI anchor health check (in production, would actually fetch pages)
 */
export function checkUIAnchors(
  packId: string,
  domain: string,
  anchors: Array<{ name: string; type: string; value: string; fallback?: string }>,
  simulatedResults?: Map<string, 'FOUND' | 'NOT_FOUND' | 'CHANGED'>
): UIHealthReport {
  const now = new Date().toISOString();
  const checks: UIAnchorCheck[] = [];

  let found = 0;
  let missing = 0;
  let changed = 0;

  for (const anchor of anchors) {
    // In production, this would actually check the page
    // For now, use simulated results or default to FOUND
    const status = simulatedResults?.get(anchor.name) || 'FOUND';

    const check: UIAnchorCheck = {
      anchor_name: anchor.name,
      anchor_type: anchor.type,
      anchor_value: anchor.value,
      status,
      checked_at: now,
      response_time_ms: Math.floor(Math.random() * 500) + 100,
      failure_count: status === 'FOUND' ? 0 : 1
    };

    if (status === 'FOUND') found++;
    else if (status === 'NOT_FOUND') missing++;
    else if (status === 'CHANGED') changed++;

    checks.push(check);
  }

  // Calculate health score
  const healthScore = Math.round((found / anchors.length) * 100);

  // Determine status
  let status: UIHealthReport['status'] = 'HEALTHY';
  if (healthScore < 50) status = 'BROKEN';
  else if (healthScore < 80) status = 'DEGRADED';

  // Generate recommendations
  const recommendations: string[] = [];
  if (missing > 0) {
    recommendations.push(`${missing} UI anchors not found - page structure may have changed`);
  }
  if (changed > 0) {
    recommendations.push(`${changed} UI anchors have different values - verify correct elements`);
  }
  if (status === 'BROKEN') {
    recommendations.push('Pack requires immediate attention - site may have been redesigned');
  }

  // Alert level
  let alertLevel: UIHealthReport['alert_level'] = 'NONE';
  if (status === 'BROKEN') alertLevel = 'CRITICAL';
  else if (status === 'DEGRADED') alertLevel = 'WARNING';

  return {
    pack_id: packId,
    domain,
    checked_at: now,
    health_score: healthScore,
    status,
    total_anchors: anchors.length,
    anchors_found: found,
    anchors_missing: missing,
    anchors_changed: changed,
    anchor_checks: checks,
    recommendations,
    alert_level: alertLevel
  };
}

// =============================================================================
// DRIFT DETECTION
// =============================================================================

export interface PackVersion {
  version: string;
  hash: string;
  released_at: string;
  changelog?: string;
  breaking_changes?: string[];
}

export interface DriftReport {
  pack_id: string;
  current_version: string;
  current_hash: string;

  // Version status
  latest_version?: string;
  versions_behind: number;
  has_breaking_changes: boolean;

  // Hash status
  hash_matches_registry: boolean;
  registry_hash?: string;

  // Drift details
  drift_detected: boolean;
  drift_type: 'NONE' | 'VERSION_BEHIND' | 'HASH_MISMATCH' | 'UNREGISTERED';
  drift_severity: 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

  // Timeline
  checked_at: string;
  last_updated?: string;
  days_since_update?: number;

  // Recommendations
  recommendations: string[];
}

/**
 * Check for pack drift
 */
export function checkDrift(
  packId: string,
  currentVersion: string,
  currentHash: string,
  registry?: {
    latest_version: string;
    latest_hash: string;
    versions: PackVersion[];
  }
): DriftReport {
  const now = new Date().toISOString();
  const recommendations: string[] = [];

  // Default: no registry info
  if (!registry) {
    return {
      pack_id: packId,
      current_version: currentVersion,
      current_hash: currentHash,
      versions_behind: 0,
      has_breaking_changes: false,
      hash_matches_registry: false,
      drift_detected: true,
      drift_type: 'UNREGISTERED',
      drift_severity: 'MEDIUM',
      checked_at: now,
      recommendations: ['Pack is not in registry - consider registering for version tracking']
    };
  }

  // Check version difference
  const currentIdx = registry.versions.findIndex(v => v.version === currentVersion);
  const latestIdx = registry.versions.findIndex(v => v.version === registry.latest_version);
  const versionsBehind = currentIdx >= 0 && latestIdx >= 0 ? currentIdx - latestIdx : 0;

  // Check for breaking changes in newer versions
  let hasBreakingChanges = false;
  if (versionsBehind > 0) {
    const newerVersions = registry.versions.slice(latestIdx, currentIdx);
    hasBreakingChanges = newerVersions.some(v => v.breaking_changes && v.breaking_changes.length > 0);
  }

  // Check hash
  const registryVersion = registry.versions.find(v => v.version === currentVersion);
  const hashMatches = registryVersion?.hash === currentHash;

  // Determine drift
  let driftDetected = false;
  let driftType: DriftReport['drift_type'] = 'NONE';
  let driftSeverity: DriftReport['drift_severity'] = 'NONE';

  if (!hashMatches && registryVersion) {
    driftDetected = true;
    driftType = 'HASH_MISMATCH';
    driftSeverity = 'CRITICAL';
    recommendations.push('Pack hash does not match registry - pack may have been modified');
  } else if (versionsBehind > 0) {
    driftDetected = true;
    driftType = 'VERSION_BEHIND';

    if (hasBreakingChanges) {
      driftSeverity = 'HIGH';
      recommendations.push(`Pack is ${versionsBehind} versions behind with breaking changes`);
    } else if (versionsBehind >= 3) {
      driftSeverity = 'MEDIUM';
      recommendations.push(`Pack is ${versionsBehind} versions behind - consider updating`);
    } else {
      driftSeverity = 'LOW';
      recommendations.push(`Pack is ${versionsBehind} version(s) behind`);
    }
  }

  // Calculate days since update
  let daysSinceUpdate: number | undefined;
  if (registryVersion) {
    const releaseDate = new Date(registryVersion.released_at);
    daysSinceUpdate = Math.floor((Date.now() - releaseDate.getTime()) / (1000 * 60 * 60 * 24));

    if (daysSinceUpdate > 90) {
      recommendations.push(`Pack version is ${daysSinceUpdate} days old - check for updates`);
    }
  }

  return {
    pack_id: packId,
    current_version: currentVersion,
    current_hash: currentHash,
    latest_version: registry.latest_version,
    versions_behind: versionsBehind,
    has_breaking_changes: hasBreakingChanges,
    hash_matches_registry: hashMatches,
    registry_hash: registryVersion?.hash,
    drift_detected: driftDetected,
    drift_type: driftType,
    drift_severity: driftSeverity,
    checked_at: now,
    last_updated: registryVersion?.released_at,
    days_since_update: daysSinceUpdate,
    recommendations
  };
}

// =============================================================================
// EXECUTION HISTORY
// =============================================================================

export interface ExecutionRecord {
  execution_id: string;
  pack_id: string;
  pack_version: string;
  pack_hash: string;

  // Timing
  started_at: string;
  completed_at?: string;
  duration_ms?: number;

  // Status
  status: 'RUNNING' | 'SUCCESS' | 'FAILED' | 'ESCALATED' | 'ABORTED' | 'TIMEOUT';
  exit_reason?: string;

  // Metrics
  actions_attempted: number;
  actions_succeeded: number;
  actions_failed: number;
  escalations: number;

  // Evidence
  evidence_bundle_id?: string;
  evidence_sealed: boolean;

  // Environment
  environment: 'DEMO' | 'STAGING' | 'PRODUCTION';
  operator_id?: string;
}

export interface ExecutionHistory {
  pack_id: string;
  records: ExecutionRecord[];

  // Aggregated metrics
  total_executions: number;
  total_successful: number;
  total_failed: number;
  success_rate: number;

  // Time metrics
  average_duration_ms: number;
  min_duration_ms: number;
  max_duration_ms: number;

  // Trends
  executions_last_24h: number;
  executions_last_7d: number;
  executions_last_30d: number;

  // Health indicators
  recent_failure_rate: number;   // Last 10 executions
  consecutive_failures: number;

  // Alerts
  health_status: 'HEALTHY' | 'WARNING' | 'CRITICAL';
  alerts: string[];
}

/**
 * Create execution history from records
 */
export function buildExecutionHistory(
  packId: string,
  records: ExecutionRecord[]
): ExecutionHistory {
  if (records.length === 0) {
    return {
      pack_id: packId,
      records: [],
      total_executions: 0,
      total_successful: 0,
      total_failed: 0,
      success_rate: 0,
      average_duration_ms: 0,
      min_duration_ms: 0,
      max_duration_ms: 0,
      executions_last_24h: 0,
      executions_last_7d: 0,
      executions_last_30d: 0,
      recent_failure_rate: 0,
      consecutive_failures: 0,
      health_status: 'HEALTHY',
      alerts: []
    };
  }

  const sorted = [...records].sort((a, b) =>
    new Date(b.started_at).getTime() - new Date(a.started_at).getTime()
  );

  const successful = records.filter(r => r.status === 'SUCCESS').length;
  const failed = records.filter(r => ['FAILED', 'ABORTED', 'TIMEOUT'].includes(r.status)).length;
  const successRate = records.length > 0 ? successful / records.length : 0;

  // Duration metrics
  const durations = records.filter(r => r.duration_ms).map(r => r.duration_ms!);
  const avgDuration = durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : 0;
  const minDuration = durations.length > 0 ? Math.min(...durations) : 0;
  const maxDuration = durations.length > 0 ? Math.max(...durations) : 0;

  // Time-based counts
  const now = Date.now();
  const last24h = records.filter(r => now - new Date(r.started_at).getTime() < 24 * 60 * 60 * 1000).length;
  const last7d = records.filter(r => now - new Date(r.started_at).getTime() < 7 * 24 * 60 * 60 * 1000).length;
  const last30d = records.filter(r => now - new Date(r.started_at).getTime() < 30 * 24 * 60 * 60 * 1000).length;

  // Recent failure rate (last 10)
  const recent10 = sorted.slice(0, 10);
  const recentFailures = recent10.filter(r => ['FAILED', 'ABORTED', 'TIMEOUT'].includes(r.status)).length;
  const recentFailureRate = recent10.length > 0 ? recentFailures / recent10.length : 0;

  // Consecutive failures
  let consecutiveFailures = 0;
  for (const record of sorted) {
    if (['FAILED', 'ABORTED', 'TIMEOUT'].includes(record.status)) {
      consecutiveFailures++;
    } else {
      break;
    }
  }

  // Health status and alerts
  const alerts: string[] = [];
  let healthStatus: ExecutionHistory['health_status'] = 'HEALTHY';

  if (consecutiveFailures >= 5) {
    healthStatus = 'CRITICAL';
    alerts.push(`${consecutiveFailures} consecutive failures - pack may be broken`);
  } else if (consecutiveFailures >= 3) {
    healthStatus = 'WARNING';
    alerts.push(`${consecutiveFailures} consecutive failures - investigate issues`);
  }

  if (recentFailureRate > 0.5) {
    healthStatus = healthStatus === 'CRITICAL' ? 'CRITICAL' : 'WARNING';
    alerts.push(`High recent failure rate: ${(recentFailureRate * 100).toFixed(0)}%`);
  }

  if (avgDuration > 300000) { // 5 minutes
    alerts.push(`Average execution time is high: ${(avgDuration / 60000).toFixed(1)} minutes`);
  }

  return {
    pack_id: packId,
    records: sorted,
    total_executions: records.length,
    total_successful: successful,
    total_failed: failed,
    success_rate: Math.round(successRate * 1000) / 1000,
    average_duration_ms: Math.round(avgDuration),
    min_duration_ms: minDuration,
    max_duration_ms: maxDuration,
    executions_last_24h: last24h,
    executions_last_7d: last7d,
    executions_last_30d: last30d,
    recent_failure_rate: Math.round(recentFailureRate * 1000) / 1000,
    consecutive_failures: consecutiveFailures,
    health_status: healthStatus,
    alerts
  };
}

/**
 * Add execution record to history
 */
export function recordExecution(
  history: ExecutionHistory,
  record: ExecutionRecord
): ExecutionHistory {
  const newRecords = [record, ...history.records];
  return buildExecutionHistory(history.pack_id, newRecords);
}

// =============================================================================
// COMBINED HEALTH DASHBOARD
// =============================================================================

export interface HealthDashboard {
  pack_id: string;
  generated_at: string;

  // Overall health
  overall_score: number;          // 0-100
  overall_status: 'HEALTHY' | 'WARNING' | 'CRITICAL';

  // Component scores
  ui_health_score: number;
  drift_score: number;
  execution_score: number;

  // Component statuses
  ui_health: UIHealthReport | null;
  drift: DriftReport | null;
  execution_history: ExecutionHistory | null;

  // Aggregated alerts
  alerts: {
    level: 'WARNING' | 'CRITICAL';
    source: 'UI_HEALTH' | 'DRIFT' | 'EXECUTION';
    message: string;
  }[];

  // Action items
  action_items: {
    priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    action: string;
    reason: string;
  }[];
}

/**
 * Generate combined health dashboard
 */
export function generateHealthDashboard(
  packId: string,
  uiHealth: UIHealthReport | null,
  drift: DriftReport | null,
  executionHistory: ExecutionHistory | null
): HealthDashboard {
  const now = new Date().toISOString();
  const alerts: HealthDashboard['alerts'] = [];
  const actionItems: HealthDashboard['action_items'] = [];

  // Calculate component scores
  const uiScore = uiHealth?.health_score ?? 100;
  const driftScore = drift ? (drift.drift_detected ? (drift.drift_severity === 'CRITICAL' ? 0 : drift.drift_severity === 'HIGH' ? 40 : drift.drift_severity === 'MEDIUM' ? 70 : 90) : 100) : 100;
  const execScore = executionHistory ? Math.round(executionHistory.success_rate * 100) : 100;

  // Overall score (weighted average)
  const overallScore = Math.round((uiScore * 0.3) + (driftScore * 0.2) + (execScore * 0.5));

  // Determine overall status
  let overallStatus: HealthDashboard['overall_status'] = 'HEALTHY';
  if (overallScore < 50) overallStatus = 'CRITICAL';
  else if (overallScore < 80) overallStatus = 'WARNING';

  // Collect alerts from UI health
  if (uiHealth?.alert_level === 'CRITICAL') {
    alerts.push({ level: 'CRITICAL', source: 'UI_HEALTH', message: `UI health critical: ${uiHealth.anchors_missing} anchors missing` });
    actionItems.push({ priority: 'CRITICAL', action: 'Update UI anchors', reason: 'Site structure has changed' });
  } else if (uiHealth?.alert_level === 'WARNING') {
    alerts.push({ level: 'WARNING', source: 'UI_HEALTH', message: `UI health degraded: ${uiHealth.anchors_missing} anchors missing` });
    actionItems.push({ priority: 'HIGH', action: 'Review UI anchors', reason: 'Some elements not found' });
  }

  // Collect alerts from drift
  if (drift?.drift_severity === 'CRITICAL') {
    alerts.push({ level: 'CRITICAL', source: 'DRIFT', message: drift.recommendations[0] || 'Critical drift detected' });
    actionItems.push({ priority: 'CRITICAL', action: 'Investigate pack integrity', reason: 'Hash mismatch detected' });
  } else if (drift?.drift_severity === 'HIGH' || drift?.drift_severity === 'MEDIUM') {
    alerts.push({ level: 'WARNING', source: 'DRIFT', message: drift.recommendations[0] || 'Pack is outdated' });
    actionItems.push({ priority: 'MEDIUM', action: 'Update pack version', reason: `${drift.versions_behind} versions behind` });
  }

  // Collect alerts from execution history
  if (executionHistory?.health_status === 'CRITICAL') {
    alerts.push({ level: 'CRITICAL', source: 'EXECUTION', message: executionHistory.alerts[0] || 'Execution failures critical' });
    actionItems.push({ priority: 'CRITICAL', action: 'Investigate execution failures', reason: 'Multiple consecutive failures' });
  } else if (executionHistory?.health_status === 'WARNING') {
    alerts.push({ level: 'WARNING', source: 'EXECUTION', message: executionHistory.alerts[0] || 'Execution issues detected' });
    actionItems.push({ priority: 'HIGH', action: 'Review execution logs', reason: 'Elevated failure rate' });
  }

  return {
    pack_id: packId,
    generated_at: now,
    overall_score: overallScore,
    overall_status: overallStatus,
    ui_health_score: uiScore,
    drift_score: driftScore,
    execution_score: execScore,
    ui_health: uiHealth,
    drift,
    execution_history: executionHistory,
    alerts,
    action_items: actionItems.sort((a, b) => {
      const priority = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
      return priority[a.priority] - priority[b.priority];
    })
  };
}

// =============================================================================
// REPORTING
// =============================================================================

/**
 * Generate health dashboard report
 */
export function generateHealthReport(dashboard: HealthDashboard): string {
  const statusIcon = dashboard.overall_status === 'HEALTHY' ? '✅' :
                     dashboard.overall_status === 'WARNING' ? '⚠️' : '🚨';

  const scoreBar = (score: number) => {
    const filled = Math.round(score / 10);
    return '█'.repeat(filled) + '░'.repeat(10 - filled);
  };

  let report = `
╔═══════════════════════════════════════════════════════════════╗
║                    HEALTH DASHBOARD                           ║
╠═══════════════════════════════════════════════════════════════╣
║  Pack:          ${dashboard.pack_id.padEnd(45)}║
║  Generated:     ${dashboard.generated_at.substring(0, 19).padEnd(45)}║
║  Status:        ${statusIcon} ${dashboard.overall_status.padEnd(42)}║
╠═══════════════════════════════════════════════════════════════╣
║                                                               ║
║  HEALTH SCORES                                                ║
║  ────────────────────────────────────────────────────────────║
║    Overall:     ${scoreBar(dashboard.overall_score)} ${dashboard.overall_score.toString().padStart(3)}%║
║    UI Health:   ${scoreBar(dashboard.ui_health_score)} ${dashboard.ui_health_score.toString().padStart(3)}%║
║    Pack Drift:  ${scoreBar(dashboard.drift_score)} ${dashboard.drift_score.toString().padStart(3)}%║
║    Executions:  ${scoreBar(dashboard.execution_score)} ${dashboard.execution_score.toString().padStart(3)}%║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
`.trim();

  if (dashboard.alerts.length > 0) {
    report += '\n\n🚨 ALERTS:\n';
    for (const alert of dashboard.alerts) {
      const icon = alert.level === 'CRITICAL' ? '🔴' : '🟡';
      report += `  ${icon} [${alert.source}] ${alert.message}\n`;
    }
  }

  if (dashboard.action_items.length > 0) {
    report += '\n📋 ACTION ITEMS:\n';
    for (const item of dashboard.action_items) {
      const icon = item.priority === 'CRITICAL' ? '🔴' :
                   item.priority === 'HIGH' ? '🟠' :
                   item.priority === 'MEDIUM' ? '🟡' : '🟢';
      report += `  ${icon} [${item.priority}] ${item.action}\n`;
      report += `     └─ ${item.reason}\n`;
    }
  }

  return report;
}

export default {
  // UI Health
  checkUIAnchors,

  // Drift Detection
  checkDrift,

  // Execution History
  buildExecutionHistory,
  recordExecution,

  // Dashboard
  generateHealthDashboard,
  generateHealthReport
};
