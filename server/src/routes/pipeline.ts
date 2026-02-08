/**
 * Pipeline API Routes
 *
 * Endpoints for the GIA execution layer:
 * - Upload documents (multer)
 * - Compile pipeline → spawn plan
 * - Execute spawn plan (Supervisor)
 * - Gate approval/rejection
 * - Run status + evidence download
 *
 * All endpoints require authentication and are tenant-scoped.
 */

import { Router, Request, Response } from 'express';
import multer from 'multer';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import Anthropic from '@anthropic-ai/sdk';

import { requireAuth, AuthenticatedRequest } from '../auth/middleware';
import { compilePipeline, CompileRequest } from '../pipeline/packCompiler';
import { SpawnPlan, hashSpawnPlan, WorkerOutput } from '../pipeline/spawnPlan.schema';
import * as runStore from '../pipeline/runState.store';
import { startExecution, resumeAfterGate, SupervisorConfig } from '../pipeline/supervisor';
import { secureAuditStore } from '../audit/auditStoreSecure';
import { generateUUID } from '../utils/crypto';
import { logger } from '../logger';

const log = logger.child({ component: 'PipelineRouter' });

// ═══════════════════════════════════════════════════════════════════
// WORKSPACE DIRECTORY
// All pipeline artifacts scoped to /workspace/run/<runId>/
// ═══════════════════════════════════════════════════════════════════

const WORKSPACE_ROOT = process.env.PIPELINE_WORKSPACE || '/tmp/gia-workspace';

function ensureWorkspaceDir(runId: string, subdir?: string): string {
  const dir = subdir
    ? path.join(WORKSPACE_ROOT, 'run', runId, subdir)
    : path.join(WORKSPACE_ROOT, 'run', runId);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

// ═══════════════════════════════════════════════════════════════════
// MULTER — Document upload with size + type limits
// ═══════════════════════════════════════════════════════════════════

const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/tiff',
  'text/plain',
  'text/csv',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // docx
  'application/msword', // doc
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

const upload = multer({
  storage: multer.memoryStorage(), // Buffer in memory, write to workspace after validation
  limits: { fileSize: MAX_FILE_SIZE, files: 10 },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file type: ${file.mimetype}`));
    }
  },
});

// ═══════════════════════════════════════════════════════════════════
// CLAUDE CLIENT (for Supervisor worker calls)
// ═══════════════════════════════════════════════════════════════════

const apiKey = process.env.ANTHROPIC_API_KEY;
const anthropic = apiKey ? new Anthropic({ apiKey }) : null;

// ═══════════════════════════════════════════════════════════════════
// ROUTER
// ═══════════════════════════════════════════════════════════════════

export function createPipelineRouter(): Router {
  const router = Router();
  router.use(requireAuth);

  // ─── POST /upload ──────────────────────────────────────────
  // Upload document(s) for a pipeline run
  router.post('/upload', upload.array('documents', 10), async (req: Request, res: Response) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const { runId } = req.body;

      if (!runId) {
        res.status(400).json({ error: 'runId is required' });
        return;
      }

      const files = req.files as Express.Multer.File[];
      if (!files || files.length === 0) {
        res.status(400).json({ error: 'No files uploaded' });
        return;
      }

      // Ensure workspace directory exists
      const uploadDir = ensureWorkspaceDir(runId, 'uploads');
      const documentRefs = [];

      for (const file of files) {
        const docId = generateUUID();
        const contentHash = crypto.createHash('sha256').update(file.buffer).digest('hex');
        const storageKey = path.join(uploadDir, `${docId}_${file.originalname}`);

        // Write to workspace
        fs.writeFileSync(storageKey, file.buffer);

        // Store reference in DB
        await runStore.addDocument(docId, runId, authReq.tenantId, {
          filename: file.originalname,
          mimeType: file.mimetype,
          sizeBytes: file.size,
          contentHash,
          storageKey,
        }, req.body.caseId);

        documentRefs.push({
          docId,
          filename: file.originalname,
          mimeType: file.mimetype,
          contentHash,
          sizeBytes: file.size,
        });
      }

      log.info('Documents uploaded', {
        runId,
        count: files.length,
        userId: authReq.userId,
      });

      res.json({ uploaded: documentRefs, count: documentRefs.length });
    } catch (error) {
      log.error('Upload failed', {}, error as Error);
      res.status(500).json({ error: 'Upload failed' });
    }
  });

  // ─── POST /compile ─────────────────────────────────────────
  // Compile pipeline config → spawn plan
  router.post('/compile', async (req: Request, res: Response) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const { pipeline, caseId, documents } = req.body;

      if (!pipeline || !pipeline.domain || !pipeline.governanceLevel) {
        res.status(400).json({ error: 'pipeline with domain and governanceLevel required' });
        return;
      }

      const compileRequest: CompileRequest = {
        pipeline: {
          roles: pipeline.roles || [],
          domain: pipeline.domain,
          governanceLevel: pipeline.governanceLevel,
          constraints: pipeline.constraints || [],
          inputs: pipeline.inputs || [],
          outputs: pipeline.outputs || [],
        },
        caseId,
        documents: documents || [],
      };

      const result = compilePipeline(compileRequest);

      // Create a pending run in the DB
      const runId = generateUUID();
      const run = await runStore.createRun(
        runId,
        result.plan,
        result.planHash,
        authReq.tenantId,
        caseId,
      );

      // Audit
      await secureAuditStore.append(
        {
          sub: authReq.userId,
          role: authReq.role,
          sessionId: authReq.sessionId,
          tenantId: authReq.tenantId,
        },
        'PIPELINE_COMPILED',
        { type: 'pipeline_run', id: runId },
        {
          planHash: result.planHash,
          domain: pipeline.domain,
          nodeCount: result.plan.nodes.length,
          gateCount: result.plan.gates.length,
          governanceLevel: pipeline.governanceLevel,
        },
      ).catch(err => log.error('Audit append failed', {}, err));

      log.info('Pipeline compiled', {
        runId,
        planHash: result.planHash,
        nodes: result.plan.nodes.length,
        gates: result.plan.gates.length,
        domain: pipeline.domain,
      });

      res.json({
        runId,
        planHash: result.planHash,
        plan: result.plan,
        status: run.status,
      });
    } catch (error) {
      log.error('Compile failed', {}, error as Error);
      res.status(500).json({ error: 'Pipeline compilation failed' });
    }
  });

  // ─── POST /execute ─────────────────────────────────────────
  // Start executing a compiled spawn plan
  router.post('/execute', async (req: Request, res: Response) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const { runId } = req.body;

      if (!runId) {
        res.status(400).json({ error: 'runId is required' });
        return;
      }

      if (!anthropic) {
        res.status(503).json({ error: 'ANTHROPIC_API_KEY not configured' });
        return;
      }

      // Load the run
      const run = await runStore.getRun(runId, authReq.tenantId);
      if (!run) {
        res.status(404).json({ error: 'Run not found' });
        return;
      }

      if (run.status !== 'pending') {
        res.status(400).json({ error: `Run is "${run.status}", expected "pending"` });
        return;
      }

      // Build supervisor config
      const config = buildSupervisorConfig(authReq, anthropic);

      // Audit
      await secureAuditStore.append(
        {
          sub: authReq.userId,
          role: authReq.role,
          sessionId: authReq.sessionId,
          tenantId: authReq.tenantId,
        },
        'PIPELINE_EXECUTION_STARTED',
        { type: 'pipeline_run', id: runId },
        { planHash: run.spawnPlanHash },
      ).catch(err => log.error('Audit append failed', {}, err));

      // Start execution (may return paused_at_gate)
      const result = await startExecution(run, config);

      res.json(result);
    } catch (error) {
      log.error('Execution failed', {}, error as Error);
      res.status(500).json({ error: 'Pipeline execution failed' });
    }
  });

  // ─── GET /:id/status ───────────────────────────────────────
  // Get current run state + progress
  router.get('/:id/status', async (req: Request, res: Response) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const run = await runStore.getRun(req.params.id, authReq.tenantId);

      if (!run) {
        res.status(404).json({ error: 'Run not found' });
        return;
      }

      // Return run state with plan summary (not full plan for perf)
      res.json({
        id: run.id,
        status: run.status,
        currentNode: run.currentNode,
        gateState: run.gateState,
        capsUsed: run.capsUsed,
        error: run.error,
        evidenceBundleId: run.evidenceBundleId,
        gateResolutions: run.gateResolutions,
        startedAt: run.startedAt,
        completedAt: run.completedAt,
        plan: {
          planId: run.spawnPlan.planId,
          domain: run.spawnPlan.domain,
          nodes: run.spawnPlan.nodes.map(n => ({
            id: n.id,
            type: n.type,
            label: n.label,
            maiLevel: n.maiLevel,
          })),
          gates: run.spawnPlan.gates.map(g => ({
            id: g.id,
            afterNode: g.afterNode,
            label: g.label,
          })),
          caps: run.spawnPlan.caps,
        },
        workerResults: Object.fromEntries(
          Object.entries(run.workerResults).map(([k, v]) => [k, {
            status: (v as any).status,
            summary: (v as any).summary,
            tokensUsed: (v as any).tokensUsed,
            durationMs: (v as any).durationMs,
          }])
        ),
      });
    } catch (error) {
      log.error('Status check failed', {}, error as Error);
      res.status(500).json({ error: 'Failed to get run status' });
    }
  });

  // ─── POST /:id/gate/:gateId/resolve ────────────────────────
  // Approve or reject a gate
  router.post('/:id/gate/:gateId/resolve', async (req: Request, res: Response) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const { approved, rationale } = req.body;

      if (typeof approved !== 'boolean') {
        res.status(400).json({ error: 'approved (boolean) is required' });
        return;
      }

      const run = await runStore.getRun(req.params.id, authReq.tenantId);
      if (!run) {
        res.status(404).json({ error: 'Run not found' });
        return;
      }

      if (run.status !== 'paused_at_gate') {
        res.status(400).json({ error: `Run is "${run.status}", expected "paused_at_gate"` });
        return;
      }

      if (run.gateState?.gateId !== req.params.gateId) {
        res.status(400).json({ error: `Run is paused at gate "${run.gateState?.gateId}", not "${req.params.gateId}"` });
        return;
      }

      // Resolve the gate
      const resolved = await runStore.resolveGate(
        req.params.id,
        authReq.tenantId,
        req.params.gateId,
        approved,
        authReq.userId,
        rationale,
      );

      // Audit
      await secureAuditStore.append(
        {
          sub: authReq.userId,
          role: authReq.role,
          sessionId: authReq.sessionId,
          tenantId: authReq.tenantId,
        },
        approved ? 'PIPELINE_GATE_APPROVED' : 'PIPELINE_GATE_REJECTED',
        { type: 'pipeline_run', id: req.params.id },
        { gateId: req.params.gateId, rationale },
      ).catch(err => log.error('Audit append failed', {}, err));

      log.info('Gate resolved', {
        runId: req.params.id,
        gateId: req.params.gateId,
        approved,
        resolvedBy: authReq.userId,
      });

      if (!approved) {
        res.json({ status: 'failed', message: 'Gate rejected — run terminated' });
        return;
      }

      // If approved, resume execution
      if (!anthropic) {
        res.status(503).json({ error: 'ANTHROPIC_API_KEY not configured' });
        return;
      }

      const updatedRun = await runStore.getRun(req.params.id, authReq.tenantId);
      if (!updatedRun) {
        res.status(404).json({ error: 'Run not found after gate resolution' });
        return;
      }

      const config = buildSupervisorConfig(authReq, anthropic);
      const result = await resumeAfterGate(updatedRun, config);

      res.json(result);
    } catch (error) {
      log.error('Gate resolution failed', {}, error as Error);
      res.status(500).json({ error: 'Gate resolution failed' });
    }
  });

  // ─── GET /:id/evidence ─────────────────────────────────────
  // Download sealed evidence bundle
  router.get('/:id/evidence', async (req: Request, res: Response) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const run = await runStore.getRun(req.params.id, authReq.tenantId);

      if (!run) {
        res.status(404).json({ error: 'Run not found' });
        return;
      }

      if (run.status !== 'completed' && run.status !== 'sealed') {
        res.status(400).json({ error: `Evidence only available for completed/sealed runs (current: ${run.status})` });
        return;
      }

      // Build the evidence package from worker results + gate resolutions
      res.json({
        runId: run.id,
        planHash: run.spawnPlanHash,
        status: run.status,
        capsUsed: run.capsUsed,
        gateResolutions: run.gateResolutions,
        workerResults: run.workerResults,
        evidenceBundleId: run.evidenceBundleId,
        plan: run.spawnPlan,
      });
    } catch (error) {
      log.error('Evidence download failed', {}, error as Error);
      res.status(500).json({ error: 'Failed to retrieve evidence' });
    }
  });

  // ─── GET /runs ─────────────────────────────────────────────
  // List pipeline runs for the current tenant
  router.get('/runs', async (req: Request, res: Response) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const { caseId, status, limit, offset } = req.query;

      const runs = await runStore.listRuns(authReq.tenantId, {
        caseId: caseId as string,
        status: status as string,
        limit: limit ? parseInt(limit as string) : undefined,
        offset: offset ? parseInt(offset as string) : undefined,
      });

      res.json({
        runs: runs.map(r => ({
          id: r.id,
          caseId: r.caseId,
          status: r.status,
          planHash: r.spawnPlanHash,
          domain: r.spawnPlan.domain,
          nodeCount: r.spawnPlan.nodes.length,
          gateCount: r.spawnPlan.gates.length,
          capsUsed: r.capsUsed,
          startedAt: r.startedAt,
          completedAt: r.completedAt,
          createdAt: r.createdAt,
        })),
        count: runs.length,
      });
    } catch (error) {
      log.error('List runs failed', {}, error as Error);
      res.status(500).json({ error: 'Failed to list runs' });
    }
  });

  return router;
}

// ═══════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════

function buildSupervisorConfig(
  authReq: AuthenticatedRequest,
  client: Anthropic,
): SupervisorConfig {
  return {
    tenantId: authReq.tenantId,

    claudeProxy: async (systemPrompt, userMessage, options) => {
      const response = await client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 8192,
        system: systemPrompt,
        messages: [{ role: 'user', content: userMessage }],
      });

      const textBlock = response.content.find((c: any) => c.type === 'text');
      const content = textBlock && textBlock.type === 'text' ? textBlock.text : '';

      return {
        content,
        tokensUsed: {
          input: response.usage?.input_tokens || 0,
          output: response.usage?.output_tokens || 0,
        },
      };
    },

    readDocument: async (docId: string) => {
      const doc = await runStore.getDocument(docId, authReq.tenantId);
      if (!doc) throw new Error(`Document "${docId}" not found`);

      try {
        const content = fs.readFileSync(doc.storageKey, 'utf-8');
        return { content, filename: doc.filename, mimeType: doc.mimeType };
      } catch {
        // For binary files (PDFs, images), return a placeholder
        return {
          content: `[Binary file: ${doc.filename} (${doc.mimeType}, ${doc.sizeBytes} bytes)]`,
          filename: doc.filename,
          mimeType: doc.mimeType,
        };
      }
    },

    writeArtifact: async (runId: string, filename: string, data: string | Buffer) => {
      // IO Safety: validate filename
      if (filename.includes('..') || filename.startsWith('/') || filename.includes('\\')) {
        throw new Error(`IO safety violation: invalid artifact filename "${filename}"`);
      }

      const artifactDir = ensureWorkspaceDir(runId, 'artifacts');
      const filePath = path.join(artifactDir, filename);

      if (typeof data === 'string') {
        fs.writeFileSync(filePath, data, 'utf-8');
      } else {
        fs.writeFileSync(filePath, data);
      }

      return filePath;
    },
  };
}
