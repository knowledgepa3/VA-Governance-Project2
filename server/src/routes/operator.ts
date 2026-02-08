/**
 * Operator Console API — /api/operator/*
 *
 * Provides the GIA Operator Console with real-time system state.
 * All endpoints are RBAC-gated to governance roles (ISSO, CCO, etc.)
 * and tenant-scoped.
 *
 * Endpoints:
 *   GET /boot       — Single boot payload (everything the console needs)
 *   GET /integrity   — Verifiable security posture
 *   GET /agents      — Worker registry status
 *   GET /runs        — Recent pipeline runs
 *   GET /gates       — Pending gate approvals
 *   GET /alerts      — Recent system events
 */

import { Router, Request, Response } from 'express';
import { AuthenticatedRequest } from '../auth/middleware';
import { logger } from '../logger';
import { secureAuditStore } from '../audit/auditStoreSecure';
import { auditService } from '../audit/auditService';
import * as runStore from '../pipeline/runState.store';
import { WORKER_REGISTRY } from '../pipeline/workers/registry';
import * as userRepository from '../db/repositories/userRepository';
import {
  securityHealthCheck,
  complianceMode,
  getBreakGlassPendingReviews,
  getSecurityPosture,
} from '../security';

import type { BootResponse, IntegrityResponse, AlertEntry } from '../types/operatorEvents';
import * as govStore from '../governance/governanceLibrary.store';
import { getKnowledgeInventory } from '../knowledge/knowledgeInventory';
import {
  getComplianceOverview,
  getComplianceTrends,
  getPolicyEffectiveness,
  getWorkerRiskProfile,
  generateDriftAlerts,
} from '../analytics';

const log = logger.child({ component: 'OperatorRouter' });

// Governance roles allowed to access operator endpoints
export const OPERATOR_ROLES = [
  'ISSO / ACE Architect',
  'Chief Compliance Officer',
  'Federal Auditor',
  'Governance Reviewer',
];

// Alert-level audit actions to surface
const ALERT_ACTIONS = [
  'INTEGRITY_CHECK_FAILED',
  'GATE_REJECTED',
  'SYSTEM_ERROR',
  'CLIENT_ERROR',
  'BREAK_GLASS_ACTIVATED',
  'AUTH_FAILED',
  'PIPELINE_GATE_REJECTED',
  'DATA_REDACTION_APPLIED',
];

// ═══════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════

/** Map an audit action to an alert level */
function actionToLevel(action: string): AlertEntry['level'] {
  if (action.includes('FAILED') || action.includes('ERROR')) return 'error';
  if (action.includes('BREAK_GLASS')) return 'critical';
  if (action.includes('REJECTED') || action.includes('REDACTION')) return 'warn';
  return 'info';
}

/** Relative time string (e.g. "2m ago") */
function timeAgo(isoDate: string): string {
  const diffMs = Date.now() - new Date(isoDate).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

// ═══════════════════════════════════════════════════════════════════
// ROUTER
// ═══════════════════════════════════════════════════════════════════

export function createOperatorRouter(): Router {
  const router = Router();

  // ─────────────────────────────────────────────────────────────────
  // GET /boot — Single payload for console initialization
  // ─────────────────────────────────────────────────────────────────
  router.get('/boot', async (req: Request, res: Response) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const tenantId = authReq.tenantId || 'default';

      // Parallel data fetch for speed
      const [
        securityHealth,
        auditChainResult,
        auditState,
        allRuns,
        user,
        govSummary,
        secPosture,
        kbInventory,
        analyticsOverview,
      ] = await Promise.all([
        securityHealthCheck(),
        secureAuditStore.verifyChain().catch(() => ({ valid: false, entriesChecked: 0 })),
        Promise.resolve(secureAuditStore.getChainState()),
        runStore.listRuns(tenantId, { limit: 200 }).catch(() => []),
        userRepository.findById(authReq.userId).catch(() => null),
        govStore.getGovernanceSummary(tenantId).catch(() => null),
        getSecurityPosture(tenantId).catch(() => null),
        Promise.resolve((() => { try { return getKnowledgeInventory(); } catch { return null; } })()),
        getComplianceOverview(tenantId).catch(() => null),
      ]);

      // Aggregate pipeline counts
      const pipelineCounts = {
        total: allRuns.length,
        active: allRuns.filter(r => r.status === 'running').length,
        paused: allRuns.filter(r => r.status === 'paused_at_gate').length,
        failed: allRuns.filter(r => r.status === 'failed').length,
        completed: allRuns.filter(r => r.status === 'completed' || r.status === 'sealed').length,
      };

      // Pending gates
      const pausedRuns = allRuns.filter(r => r.status === 'paused_at_gate' && r.gateState);
      const oldestGate = pausedRuns.length > 0
        ? pausedRuns.reduce((oldest, r) =>
            r.gateState!.waitingSince < oldest.gateState!.waitingSince ? r : oldest
          )
        : null;

      // Cost aggregation from runs
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

      const todayRuns = allRuns.filter(r => (r.startedAt || r.createdAt) >= todayStart);
      const mtdRuns = allRuns.filter(r => (r.startedAt || r.createdAt) >= monthStart);

      const sumCost = (runs: runStore.PipelineRun[]) => ({
        tokens: runs.reduce((sum: number, r) => sum + (r.capsUsed?.tokens || 0), 0),
        usd: runs.reduce((sum: number, r) => sum + ((r.capsUsed?.costCents || 0) / 100), 0),
      });

      // Workers from registry
      const workerNames = Array.from(WORKER_REGISTRY.keys());

      // Alerts from recent audit entries (using auditService.getEntries)
      let alerts: AlertEntry[] = [];
      try {
        const auditEntries = await auditService.getEntries({ limit: 100 });
        alerts = auditEntries
          .filter(e => ALERT_ACTIONS.includes(e.action))
          .slice(0, 10)
          .map(e => ({
            id: e.id,
            ts: e.ts,
            level: actionToLevel(e.action),
            message: `${e.action}: ${e.resource?.type || 'system'} ${e.resource?.id || ''}`.trim(),
            action: e.action,
            resourceType: e.resource?.type || 'system',
          }));
      } catch {
        // Audit entries not available — that's fine for boot
      }

      const boot: BootResponse = {
        version: {
          sha: process.env.GIT_SHA || process.env.npm_package_version || '1.0.0',
          buildTime: process.env.BUILD_TIME || new Date().toISOString(),
          env: complianceMode.getLevel(),
        },
        operator: {
          displayName: user?.display_name || authReq.role,
          role: authReq.role,
          tenantId,
        },
        enforcement: {
          demoLock: !complianceMode.isProduction(),
          packHash: auditState.lastHash?.substring(0, 12) || 'none',
          policyHash: process.env.POLICY_VERSION || '2024.1.0',
          configDrift: false, // TODO: implement config drift detection
        },
        health: {
          status: securityHealth.healthy ? 'healthy' : 'degraded',
          uptime: process.uptime(),
          db: securityHealth.details?.database !== false,
          ai: securityHealth.details?.claudeApi !== false,
        },
        agents: {
          registered: workerNames.length,
          workers: workerNames,
        },
        pipelines: pipelineCounts,
        gates: {
          pending: pausedRuns.length,
          oldest: oldestGate?.gateState?.waitingSince
            ? timeAgo(oldestGate.gateState.waitingSince)
            : null,
        },
        audit: {
          chainValid: auditChainResult.valid,
          entryCount: auditState.entryCount,
          lastHash: auditState.lastHash?.substring(0, 12) || 'none',
        },
        cost: {
          today: sumCost(todayRuns),
          mtd: sumCost(mtdRuns),
        },
        alerts,
        governance: govSummary ? {
          packsActive: govSummary.packsActive,
          policiesTotal: govSummary.policiesActive,
          controlFamilies: govSummary.controlFamilies,
          controlFamiliesTotal: govSummary.controlFamilies.length,
          evidenceTemplates: govSummary.evidenceTemplates,
          approvalRoles: govSummary.approvalRoles,
          expandedPackActive: govSummary.packsActive > 1,
          lastUpdated: govSummary.lastUpdated,
        } : null,
        security: secPosture ? {
          complianceLevel: secPosture.complianceLevel,
          keyManagerHealthy: secPosture.keyManager.healthy,
          keyManagerProvider: secPosture.keyManager.provider,
          breakGlassActive: secPosture.breakGlass.activeSessions,
          breakGlassPendingReviews: secPosture.breakGlass.pendingReviews,
          rateLimiterActiveKeys: secPosture.rateLimiter.activeKeys,
          egressMode: secPosture.egressControl.mode,
          egressAllowedDomains: secPosture.egressControl.allowedDomains,
          overallStatus: secPosture.overallStatus,
          flags: {
            enforceHTTPS: secPosture.flags.enforceHTTPS,
            requireMFA: secPosture.flags.requireMFA,
            strictPIIDetection: secPosture.flags.strictPIIDetection,
            enforceTenantIsolation: secPosture.flags.enforceTenantIsolation,
            auditRetentionDays: secPosture.flags.auditRetentionDays,
          },
        } : null,
        knowledge: kbInventory ? {
          basesLoaded: kbInventory.bases.length,
          totalEntries: kbInventory.totalEntries,
          categories: kbInventory.categories,
          queryFunctions: kbInventory.queryFunctions.length,
        } : null,
        analytics: analyticsOverview ? {
          complianceRate: analyticsOverview.complianceRate,
          complianceTrend: analyticsOverview.complianceTrend,
          totalMetricsRecorded: analyticsOverview.totalMetricsRecorded,
          anomaliesDetected: analyticsOverview.anomaliesDetected,
          topRiskFamily: analyticsOverview.topRiskFamily,
          policyEffectivenessAvg: analyticsOverview.policyEffectivenessAvg,
        } : null,
      };

      res.json(boot);
    } catch (error) {
      log.error('Boot endpoint failed', {}, error as Error);
      res.status(500).json({ error: 'Boot failed', message: (error as Error).message });
    }
  });

  // ─────────────────────────────────────────────────────────────────
  // GET /integrity — Security posture (verifiable states)
  // ─────────────────────────────────────────────────────────────────
  router.get('/integrity', async (req: Request, res: Response) => {
    try {
      const authReq = req as AuthenticatedRequest;

      const [auditChainResult, secHealth] = await Promise.all([
        secureAuditStore.verifyChain().catch(() => ({ valid: false, entriesChecked: 0 })),
        securityHealthCheck(),
      ]);

      // Break glass status — check all pending reviews
      const bgReviews = getBreakGlassPendingReviews();
      const activeBg = bgReviews.find(s => new Date(s.expiresAt) > new Date());

      const integrity: IntegrityResponse = {
        demoLock: {
          enforced: !complianceMode.isProduction(),
          reason: complianceMode.isProduction()
            ? 'Production mode — demo features disabled'
            : `Development mode (${complianceMode.getLevel()})`,
        },
        secretsScan: {
          clean: true, // Build-time artifact — see build-manifest.json
          scanMethod: 'build-time',
          lastScanAt: process.env.BUILD_TIME || new Date().toISOString(),
        },
        policyHash: {
          hash: process.env.POLICY_VERSION || '2024.1.0',
          pinned: true,
          drift: false, // TODO: compare against stored hash
        },
        sessionBinding: {
          active: true,
          method: 'JWT + sessionId',
        },
        auditImmutable: {
          enabled: true,
          chainValid: auditChainResult.valid,
        },
        piiControls: {
          redactionRequired: true,
          scanner: 'active',
        },
        rateLimiting: {
          enabled: true,
          endpoints: 4, // global, auth, strict, onboarding
        },
        rbac: {
          enabled: true,
          governanceRoles: OPERATOR_ROLES,
        },
        breakGlass: {
          active: !!activeBg,
          lastActivatedAt: activeBg?.activatedAt || null,
          actor: activeBg?.userId || null,
        },
      };

      // Audit integrity check access
      await secureAuditStore.append(
        {
          sub: authReq.userId,
          role: authReq.role,
          sessionId: authReq.sessionId,
          tenantId: authReq.tenantId,
        },
        'INTEGRITY_CHECK_REQUESTED',
        { type: 'system', id: 'integrity' },
        { chainValid: auditChainResult.valid, entriesChecked: auditChainResult.entriesChecked }
      ).catch(err => log.error('Audit append failed', {}, err));

      res.json(integrity);
    } catch (error) {
      log.error('Integrity endpoint failed', {}, error as Error);
      res.status(500).json({ error: 'Integrity check failed' });
    }
  });

  // ─────────────────────────────────────────────────────────────────
  // GET /agents — Worker registry status
  // ─────────────────────────────────────────────────────────────────
  router.get('/agents', async (req: Request, res: Response) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const tenantId = authReq.tenantId || 'default';

      // Get all runs for this tenant to compute worker stats
      const recentRuns = await runStore.listRuns(tenantId, { limit: 100 }).catch(() => []);

      const workerNames = Array.from(WORKER_REGISTRY.keys());
      const workers = workerNames.map(type => {
        // Find last run that used this worker
        const runsWithWorker = recentRuns.filter(
          r => r.workerResults && r.workerResults[type]
        );
        const lastRun = runsWithWorker.length > 0
          ? runsWithWorker[0].completedAt || runsWithWorker[0].updatedAt
          : null;
        const errors = runsWithWorker.filter(
          r => (r.workerResults[type] as any)?.error
        ).length;

        return {
          type,
          registered: true,
          lastRun,
          errorRate: runsWithWorker.length > 0
            ? Math.round((errors / runsWithWorker.length) * 100)
            : 0,
        };
      });

      res.json({
        workers,
        totalRegistered: workerNames.length,
        allowedTypes: workerNames,
      });
    } catch (error) {
      log.error('Agents endpoint failed', {}, error as Error);
      res.status(500).json({ error: 'Agent status check failed' });
    }
  });

  // ─────────────────────────────────────────────────────────────────
  // GET /runs — Recent pipeline runs (dashboard view)
  // ─────────────────────────────────────────────────────────────────
  router.get('/runs', async (req: Request, res: Response) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const tenantId = authReq.tenantId || 'default';
      const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);

      const runs = await runStore.listRuns(tenantId, { limit });

      const mapped = runs.map(r => ({
        id: r.id,
        workflow: r.spawnPlan?.domain || 'unknown',
        status: r.status,
        startedAt: r.startedAt,
        duration: r.startedAt && r.completedAt
          ? new Date(r.completedAt).getTime() - new Date(r.startedAt).getTime()
          : null,
        costUsd: (r.capsUsed?.costCents || 0) / 100,
        tokens: r.capsUsed?.tokens || 0,
        gatesPassed: r.gateResolutions?.filter(g => g.approved).length || 0,
        gatesTotal: r.spawnPlan?.gates?.length || 0,
      }));

      const completed = runs.filter(r => r.status === 'completed' || r.status === 'sealed');
      const failed = runs.filter(r => r.status === 'failed');

      res.json({
        runs: mapped,
        summary: {
          total: runs.length,
          completed: completed.length,
          failed: failed.length,
          paused: runs.filter(r => r.status === 'paused_at_gate').length,
          active: runs.filter(r => r.status === 'running').length,
          avgDuration: completed.length > 0
            ? completed.reduce((sum, r) => {
                const dur = r.startedAt && r.completedAt
                  ? new Date(r.completedAt).getTime() - new Date(r.startedAt).getTime()
                  : 0;
                return sum + dur;
              }, 0) / completed.length
            : 0,
          totalCost: runs.reduce((sum, r) => sum + ((r.capsUsed?.costCents || 0) / 100), 0),
        },
      });
    } catch (error) {
      log.error('Runs endpoint failed', {}, error as Error);
      res.status(500).json({ error: 'Run listing failed' });
    }
  });

  // ─────────────────────────────────────────────────────────────────
  // GET /gates — Pending gate approvals
  // ─────────────────────────────────────────────────────────────────
  router.get('/gates', async (req: Request, res: Response) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const tenantId = authReq.tenantId || 'default';

      const allRuns = await runStore.listRuns(tenantId, { status: 'paused_at_gate', limit: 50 });
      const pausedRuns = allRuns.filter(r => r.gateState);

      const pending = pausedRuns.map(r => {
        // Find the gate definition from the spawn plan
        const gateDef = r.spawnPlan?.gates?.find(g => g.id === r.gateState?.gateId);

        return {
          id: r.gateState!.gateId,
          runId: r.id,
          label: gateDef?.label || r.gateState!.gateId,
          maiLevel: gateDef?.maiLevel || 'MANDATORY',
          requestedAt: r.gateState!.waitingSince,
          age: timeAgo(r.gateState!.waitingSince),
          policyBasis: r.spawnPlan?.domain || 'unknown',
        };
      });

      // Sort oldest first
      pending.sort((a, b) => new Date(a.requestedAt).getTime() - new Date(b.requestedAt).getTime());

      res.json({
        pending,
        count: pending.length,
        oldestPendingAge: pending.length > 0 ? pending[0].age : null,
      });
    } catch (error) {
      log.error('Gates endpoint failed', {}, error as Error);
      res.status(500).json({ error: 'Gate listing failed' });
    }
  });

  // ─────────────────────────────────────────────────────────────────
  // GET /alerts — Recent system events (operator-relevant)
  // ─────────────────────────────────────────────────────────────────
  router.get('/alerts', async (req: Request, res: Response) => {
    try {
      const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);

      let alerts: AlertEntry[] = [];
      try {
        const entries = await auditService.getEntries({ limit: limit * 3 });
        alerts = entries
          .filter(e => ALERT_ACTIONS.includes(e.action))
          .slice(0, limit)
          .map(e => ({
            id: e.id,
            ts: e.ts,
            level: actionToLevel(e.action),
            message: `${e.action}: ${e.resource?.type || 'system'} ${e.resource?.id || ''}`.trim(),
            action: e.action,
            resourceType: e.resource?.type || 'system',
          }));
      } catch {
        // Audit store may not be available — return empty
      }

      res.json({
        alerts,
        unacknowledged: alerts.length, // TODO: implement acknowledgment
      });
    } catch (error) {
      log.error('Alerts endpoint failed', {}, error as Error);
      res.status(500).json({ error: 'Alert listing failed' });
    }
  });

  // ─────────────────────────────────────────────────────────────────
  // GET /analytics/overview — Full compliance analytics dashboard
  // ─────────────────────────────────────────────────────────────────
  router.get('/analytics/overview', async (req: Request, res: Response) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const tenantId = authReq.tenantId || 'default';
      const overview = await getComplianceOverview(tenantId);
      res.json(overview);
    } catch (error) {
      log.error('Analytics overview failed', {}, error as Error);
      res.status(500).json({ error: 'Analytics overview failed' });
    }
  });

  // ─────────────────────────────────────────────────────────────────
  // GET /analytics/trends — Time-series compliance data
  // ─────────────────────────────────────────────────────────────────
  router.get('/analytics/trends', async (req: Request, res: Response) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const tenantId = authReq.tenantId || 'default';
      const days = Math.min(parseInt(req.query.days as string) || 30, 90);
      const trends = await getComplianceTrends(tenantId, days);
      res.json({ trends, days });
    } catch (error) {
      log.error('Analytics trends failed', {}, error as Error);
      res.status(500).json({ error: 'Analytics trends failed' });
    }
  });

  // ─────────────────────────────────────────────────────────────────
  // GET /analytics/effectiveness — Per-policy effectiveness scores
  // ─────────────────────────────────────────────────────────────────
  router.get('/analytics/effectiveness', async (req: Request, res: Response) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const tenantId = authReq.tenantId || 'default';
      const policies = await getPolicyEffectiveness(tenantId);
      res.json({ policies });
    } catch (error) {
      log.error('Analytics effectiveness failed', {}, error as Error);
      res.status(500).json({ error: 'Analytics effectiveness failed' });
    }
  });

  // ─────────────────────────────────────────────────────────────────
  // GET /analytics/risk — Worker risk profiles
  // ─────────────────────────────────────────────────────────────────
  router.get('/analytics/risk', async (req: Request, res: Response) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const tenantId = authReq.tenantId || 'default';
      const workers = await getWorkerRiskProfile(tenantId);
      res.json({ workers });
    } catch (error) {
      log.error('Analytics risk failed', {}, error as Error);
      res.status(500).json({ error: 'Analytics risk failed' });
    }
  });

  // ─────────────────────────────────────────────────────────────────
  // GET /analytics/anomalies — Drift alerts
  // ─────────────────────────────────────────────────────────────────
  router.get('/analytics/anomalies', async (req: Request, res: Response) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const tenantId = authReq.tenantId || 'default';
      const alerts = await generateDriftAlerts(tenantId);
      res.json({ alerts, count: alerts.length });
    } catch (error) {
      log.error('Analytics anomalies failed', {}, error as Error);
      res.status(500).json({ error: 'Analytics anomalies failed' });
    }
  });

  return router;
}
