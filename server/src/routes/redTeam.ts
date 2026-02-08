/**
 * Red Team API Routes — /api/red-team/*
 *
 * Provides red team probe execution and finding management.
 * All endpoints are RBAC-gated to governance roles.
 *
 * Endpoints:
 *   POST /run          — Trigger server-side red team scan
 *   GET  /findings     — List findings with filters
 *   PATCH /findings/:id — Update finding lifecycle status
 *   GET  /stats        — Summary statistics
 *   POST /ingest       — Ingest console-side results
 */

import { Router, Request, Response } from 'express';
import { AuthenticatedRequest } from '../auth/middleware';
import { logger } from '../logger';
import {
  executeRedTeamRun,
  ingestConsoleFindings,
  queryFindings,
  updateFindingStatus,
  getRedTeamStats,
  getFinding,
} from '../redTeaming';
import type { FindingStatus, FindingSeverity, ConsoleProbeResult } from '../redTeaming';

const log = logger.child({ component: 'RedTeamRouter' });

export function createRedTeamRouter(): Router {
  const router = Router();

  // ─────────────────────────────────────────────────────────────────
  // POST /run — Trigger server-side red team scan
  // ─────────────────────────────────────────────────────────────────
  router.post('/run', async (req: Request, res: Response) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const tenantId = authReq.tenantId || 'default';
      const { probeFilter } = req.body || {};

      // Extract auth token from the request to pass to Claude proxy
      const authToken = req.headers.authorization?.replace('Bearer ', '') || '';

      log.info('Red team run triggered', { tenantId, probeFilter });

      const result = await executeRedTeamRun({
        tenantId,
        authToken,
        probeFilter: probeFilter || [],
      });

      res.json({
        success: true,
        ...result,
      });
    } catch (error) {
      log.error('Red team run failed', {}, error as Error);
      res.status(500).json({
        error: 'Red team run failed',
        message: (error as Error).message,
      });
    }
  });

  // ─────────────────────────────────────────────────────────────────
  // GET /findings — List findings with filters
  // ─────────────────────────────────────────────────────────────────
  router.get('/findings', async (req: Request, res: Response) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const tenantId = authReq.tenantId || 'default';

      const {
        status,
        severity,
        probeCategory,
        controlFamily,
        targetWorker,
        limit,
      } = req.query;

      const findings = await queryFindings(tenantId, {
        status: status as FindingStatus | undefined,
        severity: severity as FindingSeverity | undefined,
        probeCategory: probeCategory as string | undefined,
        controlFamily: controlFamily as string | undefined,
        targetWorker: targetWorker as string | undefined,
        limit: limit ? parseInt(limit as string, 10) : undefined,
      });

      res.json({
        findings,
        count: findings.length,
      });
    } catch (error) {
      log.error('Failed to list findings', {}, error as Error);
      res.status(500).json({ error: 'Failed to list findings' });
    }
  });

  // ─────────────────────────────────────────────────────────────────
  // PATCH /findings/:id — Update finding lifecycle status
  // ─────────────────────────────────────────────────────────────────
  router.patch('/findings/:id', async (req: Request, res: Response) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const tenantId = authReq.tenantId || 'default';
      const { id } = req.params;
      const { status, remediationNote, remediationEvidenceId } = req.body;

      if (!status) {
        res.status(400).json({ error: 'status is required' });
        return;
      }

      const validStatuses: FindingStatus[] = ['discovered', 'in_review', 'remediated', 'verified'];
      if (!validStatuses.includes(status)) {
        res.status(400).json({
          error: `Invalid status. Valid: ${validStatuses.join(', ')}`,
        });
        return;
      }

      const updated = await updateFindingStatus(id, tenantId, status, {
        reviewedBy: authReq.userId,
        remediationNote,
        remediationEvidenceId,
      });

      if (!updated) {
        // Check if finding exists
        const existing = await getFinding(id, tenantId);
        if (!existing) {
          res.status(404).json({ error: 'Finding not found' });
        } else {
          res.status(400).json({
            error: `Cannot transition from '${existing.status}' to '${status}'`,
            currentStatus: existing.status,
            hint: status === 'verified' ? 'verified requires remediationEvidenceId' : undefined,
          });
        }
        return;
      }

      res.json({ finding: updated });
    } catch (error) {
      log.error('Failed to update finding', {}, error as Error);
      res.status(500).json({ error: 'Failed to update finding' });
    }
  });

  // ─────────────────────────────────────────────────────────────────
  // GET /stats — Summary statistics
  // ─────────────────────────────────────────────────────────────────
  router.get('/stats', async (req: Request, res: Response) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const tenantId = authReq.tenantId || 'default';

      const stats = await getRedTeamStats(tenantId);
      res.json(stats);
    } catch (error) {
      log.error('Failed to get red team stats', {}, error as Error);
      res.status(500).json({ error: 'Failed to get stats' });
    }
  });

  // ─────────────────────────────────────────────────────────────────
  // POST /ingest — Ingest console-side red team results
  // ─────────────────────────────────────────────────────────────────
  router.post('/ingest', async (req: Request, res: Response) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const tenantId = authReq.tenantId || 'default';
      const { results } = req.body;

      if (!Array.isArray(results)) {
        res.status(400).json({ error: 'results must be an array of probe results' });
        return;
      }

      const outcome = await ingestConsoleFindings(
        tenantId,
        results as ConsoleProbeResult[],
      );

      res.json({
        success: true,
        ...outcome,
      });
    } catch (error) {
      log.error('Failed to ingest console findings', {}, error as Error);
      res.status(500).json({ error: 'Failed to ingest findings' });
    }
  });

  return router;
}
