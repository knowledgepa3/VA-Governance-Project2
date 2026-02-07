/**
 * Rate Limiter with Enterprise Features
 *
 * Features:
 * - Per-endpoint rate limits
 * - Per-user and per-tenant limits
 * - Sliding window algorithm
 * - Compliance-mode aware multipliers
 * - Audit integration for limit violations
 *
 * Applied to: /api/ai/*, /api/actions/*, /api/errors/*
 */

import { Request, Response, NextFunction } from 'express';
import { logger } from '../logger';
import { complianceMode } from './complianceMode';
import { secureAuditStore } from '../audit/auditStoreSecure';

const log = logger.child({ component: 'RateLimiter' });

/**
 * Rate limit configuration per endpoint
 */
export interface RateLimitConfig {
  windowMs: number;        // Time window in milliseconds
  maxRequests: number;     // Max requests per window
  keyGenerator?: (req: Request) => string;  // Custom key generator
  skipFailedRequests?: boolean;
  skipSuccessfulRequests?: boolean;
  message?: string;
}

/**
 * Rate limit entry
 */
interface RateLimitEntry {
  count: number;
  resetAt: number;
  firstRequest: number;
}

/**
 * Default rate limits by endpoint pattern
 */
const DEFAULT_LIMITS: Record<string, RateLimitConfig> = {
  // AI endpoints - most expensive
  '/api/ai': {
    windowMs: 60 * 1000,  // 1 minute
    maxRequests: 20,      // 20 requests per minute
    message: 'AI rate limit exceeded. Please wait before making more requests.'
  },

  // Action gateway - needs protection
  '/api/actions': {
    windowMs: 60 * 1000,
    maxRequests: 60,
    message: 'Action rate limit exceeded.'
  },

  // Approval endpoints - moderate
  '/api/actions/approve': {
    windowMs: 60 * 1000,
    maxRequests: 30,
    message: 'Approval rate limit exceeded.'
  },

  // Error reporting - allow more for debugging
  '/api/errors': {
    windowMs: 60 * 1000,
    maxRequests: 100,
    message: 'Error reporting rate limit exceeded.'
  },

  // Redaction scanning
  '/api/redaction': {
    windowMs: 60 * 1000,
    maxRequests: 30,
    message: 'Redaction scan rate limit exceeded.'
  },

  // Onboarding — handled by createOnboardingRateLimiter() (multi-key)
  // This entry is a fallback if the dedicated middleware isn't applied
  '/api/onboarding': {
    windowMs: 15 * 60 * 1000,
    maxRequests: 5,
    message: 'Too many configuration requests. Please wait before trying again.'
  },

  // Audit endpoints - restrict heavily
  '/api/audit': {
    windowMs: 60 * 1000,
    maxRequests: 10,
    message: 'Audit query rate limit exceeded.'
  },

  // Auth login - prevent brute force
  '/api/auth/login': {
    windowMs: 15 * 60 * 1000,  // 15 minutes
    maxRequests: 10,            // 10 attempts per 15 min
    message: 'Too many login attempts. Please wait.'
  },

  // Auth registration - strict to prevent abuse
  '/api/auth/register': {
    windowMs: 60 * 60 * 1000,  // 1 hour
    maxRequests: 3,             // 3 registrations per hour per IP
    message: 'Too many registration attempts. Please try again later.'
  },

  // Auth general fallback
  '/api/auth': {
    windowMs: 15 * 60 * 1000,
    maxRequests: 10,
    message: 'Too many authentication attempts. Please wait.'
  },

  // Default for unmatched
  'default': {
    windowMs: 60 * 1000,
    maxRequests: 100,
    message: 'Rate limit exceeded.'
  }
};

/**
 * Sliding Window Rate Limiter
 */
class SlidingWindowRateLimiter {
  private store: Map<string, RateLimitEntry> = new Map();
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    // Cleanup expired entries every minute
    this.cleanupInterval = setInterval(() => this.cleanup(), 60 * 1000);
  }

  /**
   * Check if request is allowed
   */
  isAllowed(key: string, config: RateLimitConfig): {
    allowed: boolean;
    remaining: number;
    resetAt: number;
  } {
    const now = Date.now();
    const entry = this.store.get(key);

    // Apply compliance mode multiplier
    const multiplier = complianceMode.check('rateLimitMultiplier');
    const maxRequests = config.maxRequests * multiplier;

    if (!entry || now >= entry.resetAt) {
      // New window
      this.store.set(key, {
        count: 1,
        resetAt: now + config.windowMs,
        firstRequest: now
      });

      return {
        allowed: true,
        remaining: maxRequests - 1,
        resetAt: now + config.windowMs
      };
    }

    // Existing window
    if (entry.count >= maxRequests) {
      return {
        allowed: false,
        remaining: 0,
        resetAt: entry.resetAt
      };
    }

    // Increment count
    entry.count++;
    this.store.set(key, entry);

    return {
      allowed: true,
      remaining: maxRequests - entry.count,
      resetAt: entry.resetAt
    };
  }

  /**
   * Get current usage
   */
  getUsage(key: string): { count: number; resetAt: number } | null {
    const entry = this.store.get(key);
    if (!entry || Date.now() >= entry.resetAt) {
      return null;
    }
    return { count: entry.count, resetAt: entry.resetAt };
  }

  /**
   * Reset a specific key (for testing or admin)
   */
  reset(key: string): void {
    this.store.delete(key);
  }

  /**
   * Cleanup expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, entry] of this.store.entries()) {
      if (now >= entry.resetAt) {
        this.store.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      log.debug('Rate limiter cleanup', { entriesRemoved: cleaned });
    }
  }

  /**
   * Shutdown cleanup
   */
  shutdown(): void {
    clearInterval(this.cleanupInterval);
  }
}

// Singleton limiter
const limiter = new SlidingWindowRateLimiter();

/**
 * Generate rate limit key
 */
function generateKey(req: Request, config: RateLimitConfig): string {
  if (config.keyGenerator) {
    return config.keyGenerator(req);
  }

  // Default: combine IP, user ID, and tenant ID
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const userId = (req as any).userId || 'anonymous';
  const tenantId = (req as any).tenantId || 'default';
  const path = getPathPattern(req.path);

  return `${tenantId}:${userId}:${ip}:${path}`;
}

/**
 * Get path pattern for rate limiting
 */
function getPathPattern(path: string): string {
  // Normalize path to pattern
  // /api/ai/chat -> /api/ai
  // /api/actions/123/approve -> /api/actions/approve

  const parts = path.split('/').filter(Boolean);

  // Keep first 3 parts, skip IDs (numeric or UUID-like)
  const normalized = parts
    .slice(0, 4)
    .filter(p => !/^[0-9a-f-]{8,}$/i.test(p))
    .join('/');

  return '/' + normalized;
}

/**
 * Find matching rate limit config
 */
function findConfig(path: string): RateLimitConfig {
  const pattern = getPathPattern(path);

  // Check exact match first
  if (DEFAULT_LIMITS[pattern]) {
    return DEFAULT_LIMITS[pattern];
  }

  // Check prefix match
  for (const [key, config] of Object.entries(DEFAULT_LIMITS)) {
    if (key !== 'default' && pattern.startsWith(key)) {
      return config;
    }
  }

  return DEFAULT_LIMITS['default'];
}

/**
 * Rate limiter middleware factory
 */
export function createRateLimiter(customConfig?: Partial<RateLimitConfig>) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    // Check if rate limiting can be bypassed (dev only)
    if (complianceMode.check('allowRateLimitBypass')) {
      const bypassHeader = req.headers['x-rate-limit-bypass'];
      if (bypassHeader === process.env.RATE_LIMIT_BYPASS_KEY) {
        log.debug('Rate limit bypassed', { path: req.path });
        next();
        return;
      }
    }

    // Get config for this path
    const baseConfig = findConfig(req.path);
    const config = { ...baseConfig, ...customConfig };

    // Generate key
    const key = generateKey(req, config);

    // Check rate limit
    const result = limiter.isAllowed(key, config);

    // Set rate limit headers
    res.setHeader('X-RateLimit-Limit', config.maxRequests * complianceMode.check('rateLimitMultiplier'));
    res.setHeader('X-RateLimit-Remaining', result.remaining);
    res.setHeader('X-RateLimit-Reset', Math.ceil(result.resetAt / 1000));

    if (!result.allowed) {
      // Log the violation
      log.warn('Rate limit exceeded', {
        key: key.slice(0, 50),
        path: req.path,
        resetAt: new Date(result.resetAt).toISOString()
      });

      // Audit the violation
      await secureAuditStore.append(
        {
          sub: (req as any).userId || 'anonymous',
          role: (req as any).role || 'anonymous',
          sessionId: (req as any).sessionId || 'none',
          tenantId: (req as any).tenantId
        },
        'RATE_LIMIT_EXCEEDED',
        { type: 'endpoint', id: req.path },
        {
          ip: req.ip,
          userAgent: req.headers['user-agent'],
          resetAt: result.resetAt
        }
      ).catch(err => {
        log.error('Failed to audit rate limit violation', {}, err);
      });

      res.setHeader('Retry-After', Math.ceil((result.resetAt - Date.now()) / 1000));
      res.status(429).json({
        error: config.message,
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfter: Math.ceil((result.resetAt - Date.now()) / 1000)
      });
      return;
    }

    next();
  };
}

/**
 * Global rate limiter (apply to all routes)
 */
export const globalRateLimiter = createRateLimiter();

/**
 * Strict rate limiter for sensitive endpoints
 */
export const strictRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 10
});

/**
 * Auth rate limiter (anti-brute-force)
 */
export const authRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  maxRequests: 5,
  message: 'Too many login attempts. Please try again later.'
});

/**
 * Multi-key rate limiter for onboarding (public endpoint).
 *
 * Checks 3 independent keys — blocked if ANY exceeds:
 * - ip:{hash}        → 5 per 15 min (coarse, handles botnets)
 * - org:{hash}       → 3 per 15 min (fair use per company / NAT-safe)
 * - ident:{hash}     → 2 per 15 min (abuse control per individual)
 *
 * Requires parsed body to extract org + email for hashing.
 */
export function createOnboardingRateLimiter() {
  const windowMs = 15 * 60 * 1000; // 15 minutes

  const keys: Array<{
    name: string;
    maxRequests: number;
    extract: (req: Request) => string;
  }> = [
    {
      name: 'ip',
      maxRequests: 5,
      extract: (req) => {
        const ip = req.ip || req.socket.remoteAddress || 'unknown';
        return `ip:${ip}:onboarding`;
      }
    },
    {
      name: 'org',
      maxRequests: 3,
      extract: (req) => {
        const org = String(req.body?.organization || '').toLowerCase().trim();
        const email = String(req.body?.email || '').toLowerCase().trim();
        const emailDomain = email.split('@')[1] || 'unknown';
        // Hash org+domain so NAT users from different orgs aren't grouped
        const { createHash } = require('crypto');
        const hash = createHash('sha256').update(`${org}:${emailDomain}`).digest('hex').slice(0, 16);
        return `org:${hash}:onboarding`;
      }
    },
    {
      name: 'ident',
      maxRequests: 2,
      extract: (req) => {
        const email = String(req.body?.email || '').toLowerCase().trim();
        const { createHash } = require('crypto');
        const hash = createHash('sha256').update(email).digest('hex').slice(0, 16);
        return `ident:${hash}:onboarding`;
      }
    }
  ];

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const config: RateLimitConfig = { windowMs, maxRequests: 5, message: 'Too many configuration requests. Please wait before trying again.' };

    for (const keyDef of keys) {
      const key = keyDef.extract(req);
      const result = limiter.isAllowed(key, { ...config, maxRequests: keyDef.maxRequests });

      if (!result.allowed) {
        const retryAfter = Math.ceil((result.resetAt - Date.now()) / 1000);

        log.warn('Onboarding rate limit exceeded', {
          key_type: keyDef.name,
          key: key.slice(0, 30),
          path: req.path,
          resetAt: new Date(result.resetAt).toISOString()
        });

        await secureAuditStore.append(
          { sub: 'anonymous', role: 'onboarding', sessionId: 'rate-limit', tenantId: 'pre-signup' },
          'RATE_LIMIT_EXCEEDED',
          { type: 'endpoint', id: '/api/onboarding/configure' },
          { key_type: keyDef.name, retryAfter }
        ).catch(() => {});

        res.setHeader('Retry-After', retryAfter);
        res.status(429).json({
          error: config.message,
          code: 'RATE_LIMIT_EXCEEDED',
          retryAfter,
          keyType: keyDef.name,
        });
        return;
      }
    }

    next();
  };
}

/**
 * Get rate limiter instance for monitoring
 */
export function getRateLimiterStats(): {
  activeKeys: number;
} {
  return {
    activeKeys: (limiter as any).store.size
  };
}

export default createRateLimiter;
