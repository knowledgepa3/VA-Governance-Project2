/**
 * ACE Governance Platform - Server Entry Point
 *
 * Enterprise-ready server with:
 * - Claude API proxy (with audit)
 * - Action Gateway (with approval workflow)
 * - Audit ledger (hash-chained, signed)
 * - Authentication and SOD enforcement
 * - Rate limiting, tenant isolation, egress control
 * - Break-glass emergency access
 * - Compliance modes (dev/staging/prod/fedramp)
 *
 * CRITICAL: This server is the ONLY way agents can:
 * - Call AI models
 * - Execute actions
 * - Access protected resources
 */

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';

import { logger, correlationMiddleware } from './logger';
import { auditService } from './audit/auditService';
import { secureAuditStore } from './audit/auditStoreSecure';
import { createClaudeProxyRouter } from './ai/claudeProxy';
import { createActionGatewayRouter } from './gateway/actionGateway';
import { createRedactionRouter } from './gateway/redactionScanner';
import { createOnboardingRouter } from './routes/onboarding';
import { requireAuth, requireRole, AuthenticatedRequest } from './auth/middleware';
import { signJwt } from './auth/jwt';
import { generateUUID } from './utils/crypto';
import { initialize as initDb, shutdown as shutdownDb } from './db/connection';
import * as userRepository from './db/repositories/userRepository';
import { createCasesRouter } from './routes/cases';
import { createAuthRouter } from './routes/auth';
import { createPipelineRouter } from './routes/pipeline';
import { createOperatorRouter } from './routes/operator';
import * as tenantRepository from './db/repositories/tenantRepository';

// Security modules
import {
  initializeSecurity,
  securityHealthCheck,
  globalRateLimiter,
  authRateLimiter,
  strictRateLimiter,
  createOnboardingRateLimiter,
  tenantIsolationMiddleware,
  breakGlassMiddleware,
  complianceMode,
  isProduction,
  activateBreakGlass,
  deactivateBreakGlass,
  getBreakGlassPendingReviews,
  completeBreakGlassReview,
  BreakGlassReason,
  checkEgress,
  getTenantPolicy
} from './security';

const log = logger.child({ component: 'Server' });

const app = express();
const PORT = process.env.PORT || 3001;

// Security middleware - order matters!
app.use(helmet({
  contentSecurityPolicy: complianceMode.check('enforceCSP') ? undefined : false,
  hsts: complianceMode.check('enforceHTTPS')
}));

app.use(cors({
  origin: complianceMode.isProduction()
    ? process.env.CORS_ORIGIN
    : (process.env.CORS_ORIGIN || 'http://localhost:5173'),
  credentials: true
}));

// Body parsing
app.use(express.json({ limit: '10mb' })); // 10mb for multimodal payloads (base64 images)

// Correlation ID middleware (MUST be first after body parsing)
app.use(correlationMiddleware);

// Global rate limiting
app.use(globalRateLimiter);

// Break-glass context (attaches session if active)
app.use(breakGlassMiddleware);

// Health check (no auth required)
app.get('/health', async (req, res) => {
  const security = await securityHealthCheck();

  res.json({
    status: security.healthy ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    complianceLevel: complianceMode.getLevel(),
    security: security.details
  });
});

// Authentication endpoint — validates credentials against PostgreSQL
app.post('/api/auth/login',
  authRateLimiter,  // Anti-brute-force
  async (req, res) => {
    const { email, password, userId, role, tenantId } = req.body;

    // ------------------------------------------------------------------
    // Primary path: email + password (validated against users table)
    // ------------------------------------------------------------------
    if (email && password) {
      try {
        const user = await userRepository.verifyPassword(email, password);
        if (!user) {
          res.status(401).json({ error: 'Invalid credentials', code: 'INVALID_CREDENTIALS' });
          return;
        }

        const sessionId = generateUUID();
        const token = signJwt({
          sub: user.id,
          role: user.role,
          sessionId,
          tenantId: user.tenantId,
          permissions: user.permissions
        });

        await secureAuditStore.append(
          { sub: user.id, role: user.role, sessionId, tenantId: user.tenantId },
          'AUTH_LOGIN',
          { type: 'session', id: sessionId },
          { tenantId: user.tenantId, authMethod: 'password' }
        );

        log.info('User logged in', { userId: user.id, email: user.email, role: user.role, sessionId });

        res.json({
          token,
          sessionId,
          tenantId: user.tenantId,
          expiresIn: 3600,
          user: {
            id: user.id,
            email: user.email,
            displayName: user.displayName,
            role: user.role,
          }
        });
        return;
      } catch (dbErr: any) {
        log.error('Login error (DB)', {}, dbErr);
        res.status(500).json({ error: 'Authentication service unavailable' });
        return;
      }
    }

    // ------------------------------------------------------------------
    // Legacy path: userId + role (backward compatible — deprecation warning)
    // ------------------------------------------------------------------
    if (userId && role) {
      log.warn('Legacy login used (userId/role). Migrate to email/password.', { userId });

      const effectiveTenantId = tenantId || 'default';
      const sessionId = generateUUID();

      const token = signJwt({
        sub: userId,
        role,
        sessionId,
        tenantId: effectiveTenantId
      });

      await secureAuditStore.append(
        { sub: userId, role, sessionId, tenantId: effectiveTenantId },
        'AUTH_LOGIN',
        { type: 'session', id: sessionId },
        { tenantId: effectiveTenantId, authMethod: 'legacy' }
      );

      log.info('User logged in (legacy)', { userId, role, sessionId });

      res.json({
        token,
        sessionId,
        tenantId: effectiveTenantId,
        expiresIn: 3600
      });
      return;
    }

    res.status(400).json({ error: 'email and password required' });
  }
);

// ═══════════════════════════════════════════════════════════════════
// PUBLIC PRE-AUTH ROUTES
// Constrained capability: no privileged actions, no sensitive data,
// strict input/output schema, no tool execution, no internal system
// access. Rate limited + security logged.
// ═══════════════════════════════════════════════════════════════════
const PUBLIC_ROUTES = ['/auth/', '/errors/report', '/onboarding/'];
const isPublicRoute = (path: string) =>
  PUBLIC_ROUTES.some(r => path.startsWith(r) || path === r);

// Auth on all /api routes (public routes skip)
app.use('/api', (req, res, next) => {
  if (isPublicRoute(req.path)) return next();
  if (req.path === '/ai/health') return next();
  requireAuth(req, res, next);
});

// Tenant isolation on all /api routes (public routes skip)
app.use('/api', (req, res, next) => {
  if (isPublicRoute(req.path)) return next();
  tenantIsolationMiddleware(req, res, next);
});

// Auth routes: registration (public, rate-limited)
app.use('/api/auth', express.json({ limit: '4kb' }));
app.use('/api/auth', createAuthRouter());

// Onboarding: hard body size cap (8KB for wishlist payloads) + multi-key rate limiter + route
app.use('/api/onboarding', express.json({ limit: '8kb' }));
app.use('/api/onboarding', createOnboardingRateLimiter());
app.use('/api/onboarding', createOnboardingRouter());

// Claude API proxy
app.use('/api/ai', createClaudeProxyRouter());

// Action Gateway
app.use('/api/actions', createActionGatewayRouter());

// Redaction Scanner (PII/PHI detection)
app.use('/api/redaction', createRedactionRouter());

// Case Management (CRUD with PostgreSQL persistence)
app.use('/api/cases', createCasesRouter());

// Pipeline Execution (Pack Compiler + Supervisor + Workers)
app.use('/api/pipeline', createPipelineRouter());

// Operator Console (RBAC-gated to governance roles)
app.use('/api/operator',
  requireAuth,
  requireRole(
    'ISSO / ACE Architect',
    'Chief Compliance Officer',
    'Federal Auditor',
    'Governance Reviewer'
  ),
  createOperatorRouter()
);

// Audit endpoints
app.get('/api/audit/entries',
  requireAuth,
  requireRole('ISSO / ACE Architect', 'Chief Compliance Officer', 'Federal Auditor'),
  async (req, res) => {
    const { from, to, action, limit } = req.query;

    const entries = await auditService.getEntries({
      from: from ? new Date(from as string) : undefined,
      to: to ? new Date(to as string) : undefined,
      action: action as string,
      limit: limit ? parseInt(limit as string) : 100
    });

    res.json({ entries, count: entries.length });
  }
);

app.get('/api/audit/verify',
  requireAuth,
  requireRole('ISSO / ACE Architect'),
  async (req, res) => {
    const result = await secureAuditStore.verifyChain();

    const authReq = req as AuthenticatedRequest;
    await secureAuditStore.append(
      {
        sub: authReq.userId,
        role: authReq.role,
        sessionId: authReq.sessionId,
        tenantId: authReq.tenantId
      },
      result.valid ? 'INTEGRITY_CHECK_PASSED' : 'INTEGRITY_CHECK_FAILED',
      { type: 'audit_chain', id: 'primary' },
      { entriesChecked: result.entriesChecked, brokenAt: result.brokenAt }
    );

    res.json(result);
  }
);

app.get('/api/audit/state',
  requireAuth,
  requireRole('ISSO / ACE Architect'),
  (req, res) => {
    const state = secureAuditStore.getChainState();
    res.json(state);
  }
);

// Break-glass endpoints
app.post('/api/break-glass/activate',
  requireAuth,
  strictRateLimiter,
  async (req, res) => {
    const authReq = req as AuthenticatedRequest;
    const { reason, justification, mfaToken } = req.body;

    if (!reason || !justification) {
      res.status(400).json({ error: 'reason and justification required' });
      return;
    }

    const result = await activateBreakGlass(
      authReq.userId,
      authReq.role,
      authReq.tenantId,
      reason as BreakGlassReason,
      justification,
      mfaToken
    );

    if ('error' in result) {
      res.status(403).json(result);
      return;
    }

    res.json({
      sessionId: result.id,
      expiresAt: result.expiresAt,
      message: 'Break-glass activated. All actions will be audited at forensic level.'
    });
  }
);

app.post('/api/break-glass/deactivate',
  requireAuth,
  async (req, res) => {
    const authReq = req as AuthenticatedRequest;
    const { sessionId } = req.body;

    const success = await deactivateBreakGlass(sessionId, authReq.userId);

    if (success) {
      res.json({ message: 'Break-glass deactivated' });
    } else {
      res.status(404).json({ error: 'Session not found' });
    }
  }
);

app.get('/api/break-glass/pending-reviews',
  requireAuth,
  requireRole('ISSO / ACE Architect', 'Chief Compliance Officer'),
  (req, res) => {
    const reviews = getBreakGlassPendingReviews();
    res.json({ reviews, count: reviews.length });
  }
);

app.post('/api/break-glass/review',
  requireAuth,
  requireRole('ISSO / ACE Architect', 'Chief Compliance Officer'),
  async (req, res) => {
    const authReq = req as AuthenticatedRequest;
    const { sessionId, notes, approved } = req.body;

    const success = await completeBreakGlassReview(
      sessionId,
      authReq.userId,
      notes,
      approved
    );

    if (success) {
      res.json({ message: 'Review completed' });
    } else {
      res.status(404).json({ error: 'Session not found' });
    }
  }
);

// Egress control endpoint (for agents to check URLs)
app.post('/api/egress/check',
  requireAuth,
  async (req, res) => {
    const authReq = req as AuthenticatedRequest;
    const { url, action } = req.body;

    if (!url) {
      res.status(400).json({ error: 'url required' });
      return;
    }

    const decision = await checkEgress(url, {
      userId: authReq.userId,
      tenantId: authReq.tenantId,
      action: action || 'navigate',
      agentId: req.body.agentId
    });

    res.json(decision);
  }
);

app.get('/api/egress/policy',
  requireAuth,
  (req, res) => {
    const authReq = req as AuthenticatedRequest;
    const policy = getTenantPolicy(authReq.tenantId);

    res.json({
      mode: policy.mode,
      allowedDomains: policy.allowedDomains,
      allowHttp: policy.allowHttp
    });
  }
);

// Client error reporting endpoint (no auth required for error reporting)
app.post('/api/errors/report', async (req, res) => {
  const {
    correlationId,
    timestamp,
    errorType,
    component,
    message,
    stackFingerprint,
    componentStackFingerprint,
    userAgent,
    url
  } = req.body;

  if (!correlationId || !message) {
    res.status(400).json({ error: 'correlationId and message required' });
    return;
  }

  log.warn('Client error reported', {
    correlationId,
    errorType,
    component,
    messageFingerprint: message.slice(0, 50),
    url,
    userAgent: userAgent?.slice(0, 100)
  });

  await secureAuditStore.append(
    { sub: 'client', role: 'anonymous', sessionId: correlationId },
    'CLIENT_ERROR',
    { type: 'error_report', id: correlationId },
    {
      errorType,
      component,
      timestamp,
      url
    }
  ).catch(err => {
    log.error('Failed to audit client error', {}, err);
  });

  res.json({ received: true, correlationId });
});

// Compliance info endpoint
app.get('/api/compliance/info',
  requireAuth,
  requireRole('ISSO / ACE Architect', 'Chief Compliance Officer'),
  (req, res) => {
    const report = complianceMode.getComplianceReport();
    res.json(report);
  }
);

// Error handling middleware
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  log.error('Unhandled error', {
    path: req.path,
    method: req.method
  }, err);

  // Don't expose error details in production
  const errorResponse = complianceMode.check('exposeInternalErrors')
    ? { error: err.message, stack: err.stack }
    : { error: 'Internal server error' };

  res.status(500).json({
    ...errorResponse,
    correlationId: res.getHeader('x-correlation-id')
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not found',
    path: req.path
  });
});

// Start server
async function start() {
  try {
    // Initialize database connection and run migrations
    await initDb();
    log.info('Database initialized');

    // Load tenant cache from PostgreSQL (after migrations)
    await tenantRepository.loadCache().catch(err => {
      log.warn('Tenant cache load skipped (table may not exist yet)', { error: err.message });
    });

    // Initialize security modules
    await initializeSecurity();
    log.info('Security modules initialized');

    // Initialize audit services
    await auditService.initialize();
    await secureAuditStore.initialize();
    log.info('Audit services initialized');

    // Start listening
    app.listen(PORT, () => {
      log.info('Server started', {
        port: PORT,
        env: process.env.NODE_ENV || 'development',
        complianceLevel: complianceMode.getLevel()
      });
      console.log(`ACE Governance Server running on port ${PORT}`);
      console.log(`Compliance Level: ${complianceMode.getLevel()}`);
    });
  } catch (error) {
    log.error('Failed to start server', {}, error as Error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  log.info('Received SIGTERM, shutting down...');
  await shutdownDb().catch(() => {});
  process.exit(0);
});

process.on('SIGINT', async () => {
  log.info('Received SIGINT, shutting down...');
  await shutdownDb().catch(() => {});
  process.exit(0);
});

start();

export default app;
