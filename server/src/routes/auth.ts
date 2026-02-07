/**
 * Auth Routes — Registration + Future Auth Endpoints
 *
 * POST /api/auth/register — Self-service signup (free tier)
 *
 * Flow:
 * 1. Validate input (email, password, displayName, organizationName)
 * 2. Check email uniqueness
 * 3. Create tenant (free tier, 50 AI queries/month)
 * 4. Create user with domain-based default role
 * 5. Issue JWT (user is logged in immediately)
 * 6. Audit: USER_REGISTERED
 */

import { Router, Request, Response } from 'express';
import { generateUUID } from '../utils/crypto';
import { signJwt } from '../auth/jwt';
import * as userRepository from '../db/repositories/userRepository';
import * as tenantRepository from '../db/repositories/tenantRepository';
import { registerTenant as registerTenantInMemory } from '../security/tenantIsolation';
import { secureAuditStore } from '../audit/auditStoreSecure';
import { logger } from '../logger';

const log = logger.child({ component: 'AuthRoutes' });

// ---------------------------------------------------------------------------
// Validation helpers
// ---------------------------------------------------------------------------

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_MIN_LENGTH = 8;

function validateRegistration(body: any): { valid: boolean; error?: string } {
  const { email, password, displayName, organizationName } = body;

  if (!email || !password || !displayName || !organizationName) {
    return { valid: false, error: 'email, password, displayName, and organizationName are required' };
  }

  if (typeof email !== 'string' || !EMAIL_RE.test(email.trim())) {
    return { valid: false, error: 'Invalid email address' };
  }

  if (typeof password !== 'string' || password.length < PASSWORD_MIN_LENGTH) {
    return { valid: false, error: `Password must be at least ${PASSWORD_MIN_LENGTH} characters` };
  }

  // Require at least one letter and one number
  if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
    return { valid: false, error: 'Password must contain at least one letter and one number' };
  }

  if (typeof displayName !== 'string' || displayName.trim().length < 2) {
    return { valid: false, error: 'Display name must be at least 2 characters' };
  }

  if (typeof organizationName !== 'string' || organizationName.trim().length < 2) {
    return { valid: false, error: 'Organization name must be at least 2 characters' };
  }

  return { valid: true };
}

/**
 * Map a domain/workforce type to a default user role.
 */
function defaultRoleForDomain(domainType?: string): string {
  if (!domainType) return 'VIEWER';

  const d = domainType.toUpperCase();
  if (d.includes('VA') || d.includes('CLAIM')) return 'Security Analyst';
  if (d.includes('BD') || d.includes('BUSINESS') || d.includes('CAPTURE')) return 'BD Manager';
  if (d.includes('FINANCE') || d.includes('AUDIT') || d.includes('ACCOUNTING')) return 'Federal Auditor';
  if (d.includes('LEGAL') || d.includes('COMPLIANCE')) return 'Chief Compliance Officer';
  return 'VIEWER';
}

/**
 * Generate a tenant ID from the organization name.
 * e.g. "Acme Corp" → "acme-corp"
 */
function tenantIdFromOrg(orgName: string): string {
  return orgName
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 50) || 'tenant';
}

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

export function createAuthRouter(): Router {
  const router = Router();

  /**
   * POST /register — Self-service account creation
   */
  router.post('/register', async (req: Request, res: Response) => {
    const validation = validateRegistration(req.body);
    if (!validation.valid) {
      res.status(400).json({ error: validation.error, code: 'VALIDATION_ERROR' });
      return;
    }

    const {
      email,
      password,
      displayName,
      organizationName,
      setupId,
      domainType,
    } = req.body;

    const normalizedEmail = email.toLowerCase().trim();

    try {
      // 1. Check email uniqueness
      const existing = await userRepository.findByEmail(normalizedEmail);
      if (existing) {
        res.status(409).json({ error: 'An account with this email already exists', code: 'EMAIL_EXISTS' });
        return;
      }

      // 2. Create tenant
      const tenantId = tenantIdFromOrg(organizationName) + '-' + generateUUID().slice(0, 8);
      const userId = generateUUID();

      let tenant;
      try {
        tenant = await tenantRepository.createTenant({
          id: tenantId,
          name: organizationName.trim(),
          tier: 'free',
          ownerUserId: userId,
          setupId: setupId || null,
          domainType: domainType || null,
          features: ['basic'],
          aiQueriesLimit: 50,
        });
      } catch (dbErr: any) {
        // If tenants table doesn't exist yet (migration pending), fall back
        if (dbErr.code === '42P01') {
          log.warn('Tenants table not found — using in-memory fallback');
          await registerTenantInMemory({
            tenantId,
            tenantName: organizationName.trim(),
            tier: 'free',
            dataRegion: 'us-east-1',
            isolationLevel: 'shared',
            features: new Set(['basic']),
          }, 'system');
        } else {
          throw dbErr;
        }
      }

      // Also register in the in-memory registry (for tenant isolation middleware)
      await registerTenantInMemory({
        tenantId,
        tenantName: organizationName.trim(),
        tier: 'free',
        dataRegion: 'us-east-1',
        isolationLevel: 'shared',
        features: new Set(['basic']),
      }, userId).catch(() => {
        // Already registered (from fallback above) — OK
      });

      // 3. Create user
      const role = defaultRoleForDomain(domainType);
      const user = await userRepository.createUser({
        id: userId,
        email: normalizedEmail,
        displayName: displayName.trim(),
        password,
        role,
        tenantId,
        permissions: [],
      });

      // 4. Issue JWT
      const sessionId = generateUUID();
      const token = signJwt({
        sub: user.id,
        role: user.role,
        sessionId,
        tenantId: user.tenantId,
        permissions: user.permissions,
      });

      // 5. Audit
      await secureAuditStore.append(
        { sub: user.id, role: user.role, sessionId, tenantId: user.tenantId },
        'USER_REGISTERED',
        { type: 'user', id: user.id },
        {
          email: normalizedEmail,
          organizationName: organizationName.trim(),
          tenantId,
          setupId: setupId || null,
          domainType: domainType || null,
          tier: 'free',
        }
      );

      log.info('User registered', {
        userId: user.id,
        email: user.email,
        tenantId,
        role: user.role,
      });

      // 6. Response
      res.status(201).json({
        token,
        sessionId,
        expiresIn: 3600,
        user: {
          id: user.id,
          email: user.email,
          displayName: user.displayName,
          role: user.role,
        },
        tenant: {
          id: tenantId,
          name: organizationName.trim(),
          tier: 'free',
          aiQueriesLimit: 50,
        },
      });
    } catch (err: any) {
      // Handle unique constraint violation (race condition on email)
      if (err.code === '23505' && err.constraint?.includes('email')) {
        res.status(409).json({ error: 'An account with this email already exists', code: 'EMAIL_EXISTS' });
        return;
      }

      log.error('Registration failed', { email: normalizedEmail }, err);
      res.status(500).json({ error: 'Registration failed. Please try again.', code: 'INTERNAL_ERROR' });
    }
  });

  return router;
}
