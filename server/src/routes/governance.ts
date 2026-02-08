/**
 * Governance Library API — /api/governance/*
 *
 * Exposes the Governance Library to the operator console and runtime workers.
 * All endpoints are RBAC-gated to governance roles and tenant-scoped.
 *
 * Endpoints:
 *   GET  /packs              — List governance packs
 *   GET  /packs/:id          — Single pack details
 *   GET  /policies           — List policies (filterable)
 *   GET  /policies/:id       — Single policy with evidence templates
 *   GET  /query              — Runtime query (what applies to worker X in domain Y?)
 *   GET  /evidence-templates — List evidence templates
 *   GET  /approval-roles     — List approval roles
 *   POST /seed               — Seed base governance pack (idempotent, ISSO only)
 *   GET  /summary            — Dashboard summary data
 */

import { Router, Request, Response } from 'express';
import { AuthenticatedRequest } from '../auth/middleware';
import { logger } from '../logger';
import * as govStore from '../governance/governanceLibrary.store';
import { seedGovernanceLibrary } from '../governance/governanceLibrary.seed';
import type { PolicyQueryContext } from '../governance/governanceLibrary.schema';

const log = logger.child({ component: 'GovernanceRouter' });

// ═══════════════════════════════════════════════════════════════════
// ROUTER FACTORY
// ═══════════════════════════════════════════════════════════════════

export function createGovernanceRouter(): Router {
  const router = Router();

  // ─────────────────────────────────────────────────────────────
  // GET /packs — List governance packs
  // ─────────────────────────────────────────────────────────────
  router.get('/packs', async (req: Request, res: Response) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const tenantId = authReq.tenantId || 'default';

      const packType = req.query.type as string | undefined;
      const sourceFramework = req.query.framework as string | undefined;

      const packs = await govStore.listPacks(tenantId, { packType, sourceFramework });

      res.json({
        packs,
        total: packs.length,
      });
    } catch (err: any) {
      log.error('Failed to list packs', { error: err.message });
      res.status(500).json({ error: 'Failed to list governance packs' });
    }
  });

  // ─────────────────────────────────────────────────────────────
  // GET /packs/:id — Single pack details
  // ─────────────────────────────────────────────────────────────
  router.get('/packs/:id', async (req: Request, res: Response) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const tenantId = authReq.tenantId || 'default';

      const pack = await govStore.getPack(req.params.id, tenantId);
      if (!pack) {
        res.status(404).json({ error: 'Pack not found' });
        return;
      }

      // Also get policy count by family
      const policies = await govStore.listPolicies(tenantId, { packId: pack.id });
      const familyBreakdown: Record<string, number> = {};
      for (const p of policies) {
        familyBreakdown[p.controlFamily] = (familyBreakdown[p.controlFamily] || 0) + 1;
      }

      res.json({
        pack,
        policies: policies.length,
        familyBreakdown,
      });
    } catch (err: any) {
      log.error('Failed to get pack', { error: err.message });
      res.status(500).json({ error: 'Failed to get governance pack' });
    }
  });

  // ─────────────────────────────────────────────────────────────
  // GET /policies — List policies (filterable)
  // ─────────────────────────────────────────────────────────────
  router.get('/policies', async (req: Request, res: Response) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const tenantId = authReq.tenantId || 'default';

      const filters = {
        controlFamily: req.query.controlFamily as string | undefined,
        maiLevel: req.query.maiLevel as string | undefined,
        riskLevel: req.query.riskLevel as string | undefined,
        packId: req.query.packId as string | undefined,
        workerType: req.query.workerType as string | undefined,
        domain: req.query.domain as string | undefined,
        limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 100,
        offset: req.query.offset ? parseInt(req.query.offset as string, 10) : 0,
      };

      const policies = await govStore.listPolicies(tenantId, filters);

      res.json({
        policies,
        total: policies.length,
        filters: {
          controlFamily: filters.controlFamily || null,
          maiLevel: filters.maiLevel || null,
          riskLevel: filters.riskLevel || null,
        },
      });
    } catch (err: any) {
      log.error('Failed to list policies', { error: err.message });
      res.status(500).json({ error: 'Failed to list governance policies' });
    }
  });

  // ─────────────────────────────────────────────────────────────
  // GET /policies/:id — Single policy with evidence + approval roles
  // ─────────────────────────────────────────────────────────────
  router.get('/policies/:id', async (req: Request, res: Response) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const tenantId = authReq.tenantId || 'default';

      const policy = await govStore.getPolicy(req.params.id, tenantId);
      if (!policy) {
        res.status(404).json({ error: 'Policy not found' });
        return;
      }

      // Get evidence templates for this policy
      const evidenceTemplates = await govStore.getEvidenceTemplates(policy.id, tenantId);

      // Get applicable approval roles
      const approvalRoles = await govStore.getApprovalRolesForPolicy(
        policy.riskLevel,
        policy.maiLevel,
        tenantId
      );

      res.json({
        policy,
        evidenceTemplates,
        approvalRoles,
      });
    } catch (err: any) {
      log.error('Failed to get policy', { error: err.message });
      res.status(500).json({ error: 'Failed to get governance policy' });
    }
  });

  // ─────────────────────────────────────────────────────────────
  // GET /query — Runtime query (THE KEY ENDPOINT)
  // Workers/supervisor call this: "What applies to me right now?"
  // ─────────────────────────────────────────────────────────────
  router.get('/query', async (req: Request, res: Response) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const tenantId = authReq.tenantId || 'default';

      // Build context — strip undefined values and cast to PolicyQueryContext
      const rawContext: Record<string, string | undefined> = {
        workerType: req.query.workerType as string | undefined,
        domain: req.query.domain as string | undefined,
        controlFamily: req.query.controlFamily as string | undefined,
        maiLevel: req.query.maiLevel as string | undefined,
        riskLevel: req.query.riskLevel as string | undefined,
      };
      const context = Object.fromEntries(
        Object.entries(rawContext).filter(([_, v]) => v !== undefined)
      ) as PolicyQueryContext;

      const policies = await govStore.queryEffectivePolicies(tenantId, context);

      res.json({
        policies,
        count: policies.length,
        context,
        queriedAt: new Date().toISOString(),
      });
    } catch (err: any) {
      log.error('Failed to query policies', { error: err.message });
      res.status(500).json({ error: 'Failed to query effective policies' });
    }
  });

  // ─────────────────────────────────────────────────────────────
  // GET /evidence-templates — List evidence templates
  // ─────────────────────────────────────────────────────────────
  router.get('/evidence-templates', async (req: Request, res: Response) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const tenantId = authReq.tenantId || 'default';

      const filters = {
        policyId: req.query.policyId as string | undefined,
        controlFamily: req.query.controlFamily as string | undefined,
      };

      const templates = await govStore.listEvidenceTemplates(tenantId, filters);

      res.json({
        templates,
        total: templates.length,
      });
    } catch (err: any) {
      log.error('Failed to list evidence templates', { error: err.message });
      res.status(500).json({ error: 'Failed to list evidence templates' });
    }
  });

  // ─────────────────────────────────────────────────────────────
  // GET /approval-roles — List approval roles
  // ─────────────────────────────────────────────────────────────
  router.get('/approval-roles', async (req: Request, res: Response) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const tenantId = authReq.tenantId || 'default';

      const roles = await govStore.getApprovalRoles(tenantId);

      res.json({
        roles,
        total: roles.length,
      });
    } catch (err: any) {
      log.error('Failed to list approval roles', { error: err.message });
      res.status(500).json({ error: 'Failed to list approval roles' });
    }
  });

  // ─────────────────────────────────────────────────────────────
  // POST /seed — Seed base governance pack (ISSO only, idempotent)
  // ─────────────────────────────────────────────────────────────
  router.post('/seed', async (req: Request, res: Response) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const tenantId = authReq.tenantId || 'default';

      // Additional RBAC: seed requires ISSO specifically
      if (authReq.role !== 'ISSO / ACE Architect') {
        res.status(403).json({
          error: 'Governance library seed requires ISSO / ACE Architect role',
        });
        return;
      }

      const result = await seedGovernanceLibrary(tenantId);

      if (result.policiesCreated === 0) {
        res.json({
          message: 'Governance library already seeded',
          packId: result.packId,
          alreadySeeded: true,
        });
        return;
      }

      log.info('Governance library seeded', {
        tenantId,
        packId: result.packId,
        policies: result.policiesCreated,
        templates: result.templatesCreated,
        roles: result.rolesCreated,
      });

      res.json({
        message: 'Governance library seeded successfully',
        ...result,
        alreadySeeded: false,
      });
    } catch (err: any) {
      log.error('Failed to seed governance library', { error: err.message });
      res.status(500).json({ error: 'Failed to seed governance library' });
    }
  });

  // ─────────────────────────────────────────────────────────────
  // GET /summary — Dashboard summary data
  // ─────────────────────────────────────────────────────────────
  router.get('/summary', async (req: Request, res: Response) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const tenantId = authReq.tenantId || 'default';

      const summary = await govStore.getGovernanceSummary(tenantId);

      res.json(summary);
    } catch (err: any) {
      log.error('Failed to get governance summary', { error: err.message });
      res.status(500).json({ error: 'Failed to get governance summary' });
    }
  });

  return router;
}
