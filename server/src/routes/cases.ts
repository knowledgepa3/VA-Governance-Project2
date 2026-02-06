/**
 * Cases REST Router
 *
 * Full CRUD for VA claim cases. Tenant-scoped.
 * Profile endpoints require elevated roles (PII access).
 *
 * All endpoints require JWT authentication via requireAuth middleware.
 */

import { Router, Request, Response } from 'express';
import { requireAuth, requireRole, AuthenticatedRequest } from '../auth/middleware';
import * as caseRepo from '../db/repositories/caseRepository';
import { logger } from '../logger';

const log = logger.child({ component: 'CasesRouter' });

// Roles allowed to access encrypted profiles (PII/PHI)
const PROFILE_ROLES = ['ISSO / ACE Architect', 'Security Analyst', 'Forensic SME'];

export function createCasesRouter(): Router {
  const router = Router();

  // All case endpoints require auth
  router.use(requireAuth);

  // -------------------------------------------------------------------------
  // POST /api/cases — Create a new case
  // -------------------------------------------------------------------------
  router.post('/', async (req: Request, res: Response) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const { claimType, conditionCount, priority, profileData } = req.body;

      if (!claimType) {
        res.status(400).json({ error: 'claimType is required' });
        return;
      }

      const shell = await caseRepo.createCase(
        { claimType, conditionCount, priority, profileData },
        authReq.userId,
        authReq.tenantId
      );

      log.info('Case created', { caseId: shell.id, alias: shell.case_alias, userId: authReq.userId });
      res.status(201).json(shell);
    } catch (err: any) {
      log.error('Failed to create case', {}, err);
      res.status(500).json({ error: 'Failed to create case' });
    }
  });

  // -------------------------------------------------------------------------
  // GET /api/cases — List case shells
  // -------------------------------------------------------------------------
  router.get('/', async (req: Request, res: Response) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const { status, priority, limit, offset } = req.query;

      const shells = await caseRepo.listCaseShells(authReq.tenantId, {
        status: status as string,
        priority: priority as string,
        limit: limit ? parseInt(limit as string) : undefined,
        offset: offset ? parseInt(offset as string) : undefined,
      });

      res.json({ cases: shells, count: shells.length });
    } catch (err: any) {
      log.error('Failed to list cases', {}, err);
      res.status(500).json({ error: 'Failed to list cases' });
    }
  });

  // -------------------------------------------------------------------------
  // GET /api/cases/stats — Dashboard statistics
  // -------------------------------------------------------------------------
  router.get('/stats', async (req: Request, res: Response) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const stats = await caseRepo.getCaseStats(authReq.tenantId);
      res.json(stats);
    } catch (err: any) {
      log.error('Failed to get case stats', {}, err);
      res.status(500).json({ error: 'Failed to get case stats' });
    }
  });

  // -------------------------------------------------------------------------
  // GET /api/cases/:id — Get case shell
  // -------------------------------------------------------------------------
  router.get('/:id', async (req: Request, res: Response) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const shell = await caseRepo.getCaseShell(req.params.id, authReq.tenantId);

      if (!shell) {
        res.status(404).json({ error: 'Case not found' });
        return;
      }

      // Include bundle runs
      const bundleRuns = await caseRepo.getBundleRuns(req.params.id);
      res.json({ ...shell, bundleRuns });
    } catch (err: any) {
      log.error('Failed to get case', {}, err);
      res.status(500).json({ error: 'Failed to get case' });
    }
  });

  // -------------------------------------------------------------------------
  // GET /api/cases/:id/profile — Get decrypted sensitive profile (elevated roles)
  // -------------------------------------------------------------------------
  router.get('/:id/profile',
    requireRole(...PROFILE_ROLES),
    async (req: Request, res: Response) => {
      try {
        const authReq = req as AuthenticatedRequest;
        const profile = await caseRepo.getCaseProfile(req.params.id, authReq.tenantId);

        if (!profile) {
          res.status(404).json({ error: 'Profile not found' });
          return;
        }

        log.info('Profile accessed', {
          caseId: req.params.id,
          userId: authReq.userId,
          role: authReq.role,
        });

        res.json(profile);
      } catch (err: any) {
        log.error('Failed to get profile', {}, err);
        res.status(500).json({ error: 'Failed to get profile' });
      }
    }
  );

  // -------------------------------------------------------------------------
  // PUT /api/cases/:id — Update case shell
  // -------------------------------------------------------------------------
  router.put('/:id', async (req: Request, res: Response) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const shell = await caseRepo.updateCaseShell(req.params.id, req.body, authReq.tenantId);

      if (!shell) {
        res.status(404).json({ error: 'Case not found' });
        return;
      }

      res.json(shell);
    } catch (err: any) {
      log.error('Failed to update case', {}, err);
      res.status(500).json({ error: 'Failed to update case' });
    }
  });

  // -------------------------------------------------------------------------
  // PUT /api/cases/:id/profile — Update sensitive profile (elevated roles)
  // -------------------------------------------------------------------------
  router.put('/:id/profile',
    requireRole(...PROFILE_ROLES),
    async (req: Request, res: Response) => {
      try {
        const authReq = req as AuthenticatedRequest;
        const success = await caseRepo.updateCaseProfile(req.params.id, req.body, authReq.tenantId);

        if (!success) {
          res.status(404).json({ error: 'Case not found' });
          return;
        }

        log.info('Profile updated', {
          caseId: req.params.id,
          userId: authReq.userId,
        });

        res.json({ updated: true });
      } catch (err: any) {
        log.error('Failed to update profile', {}, err);
        res.status(500).json({ error: 'Failed to update profile' });
      }
    }
  );

  // -------------------------------------------------------------------------
  // PATCH /api/cases/:id/status — Status transition
  // -------------------------------------------------------------------------
  router.patch('/:id/status', async (req: Request, res: Response) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const { status } = req.body;

      if (!status) {
        res.status(400).json({ error: 'status is required' });
        return;
      }

      const shell = await caseRepo.updateStatus(req.params.id, status, authReq.tenantId);

      if (!shell) {
        res.status(404).json({ error: 'Case not found' });
        return;
      }

      log.info('Case status updated', {
        caseId: req.params.id,
        status,
        userId: authReq.userId,
      });

      res.json(shell);
    } catch (err: any) {
      log.error('Failed to update status', {}, err);
      res.status(500).json({ error: 'Failed to update status' });
    }
  });

  // -------------------------------------------------------------------------
  // POST /api/cases/:id/bundle-runs — Start a bundle run
  // -------------------------------------------------------------------------
  router.post('/:id/bundle-runs', async (req: Request, res: Response) => {
    try {
      const { bundleId, bundleName } = req.body;

      if (!bundleId || !bundleName) {
        res.status(400).json({ error: 'bundleId and bundleName required' });
        return;
      }

      const run = await caseRepo.startBundleRun(req.params.id, bundleId, bundleName);
      res.status(201).json(run);
    } catch (err: any) {
      log.error('Failed to start bundle run', {}, err);
      res.status(500).json({ error: 'Failed to start bundle run' });
    }
  });

  // -------------------------------------------------------------------------
  // PUT /api/cases/:id/bundle-runs/:runId — Complete a bundle run
  // -------------------------------------------------------------------------
  router.put('/:id/bundle-runs/:runId', async (req: Request, res: Response) => {
    try {
      const { status, result, evidenceCount } = req.body;

      const run = await caseRepo.completeBundleRun(
        req.params.runId,
        status || 'completed',
        result || null,
        evidenceCount || 0
      );

      if (!run) {
        res.status(404).json({ error: 'Bundle run not found' });
        return;
      }

      res.json(run);
    } catch (err: any) {
      log.error('Failed to complete bundle run', {}, err);
      res.status(500).json({ error: 'Failed to complete bundle run' });
    }
  });

  // -------------------------------------------------------------------------
  // POST /api/cases/:id/communications — Add communication entry
  // -------------------------------------------------------------------------
  router.post('/:id/communications', async (req: Request, res: Response) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const { type, direction, subject, content } = req.body;

      if (!type || !direction || !content) {
        res.status(400).json({ error: 'type, direction, and content required' });
        return;
      }

      await caseRepo.addCommunication(
        req.params.id,
        { type, direction, subject, content, attachments: req.body.attachments },
        authReq.tenantId
      );

      res.status(201).json({ added: true });
    } catch (err: any) {
      log.error('Failed to add communication', {}, err);
      res.status(500).json({ error: 'Failed to add communication' });
    }
  });

  return router;
}
