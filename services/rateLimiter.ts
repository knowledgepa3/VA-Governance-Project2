/**
 * Rate Limiter Service for ACE Governance Platform
 *
 * Implements token bucket algorithm for API rate limiting.
 * Prevents abuse and ensures fair resource usage.
 */

import { logger } from './logger';
import { configService } from './configService';

interface TokenBucket {
  tokens: number;
  lastRefill: number;
}

interface RateLimitResult {
  allowed: boolean;
  remainingTokens: number;
  resetTime: number;
  retryAfterMs?: number;
}

class RateLimiter {
  private buckets: Map<string, TokenBucket> = new Map();
  private log = logger.child('RateLimiter');

  /**
   * Try to consume a token for a request
   */
  tryConsume(key: string = 'default', tokens: number = 1): RateLimitResult {
    const config = configService.getRateLimitConfig();
    const now = Date.now();

    // Get or create bucket
    let bucket = this.buckets.get(key);
    if (!bucket) {
      bucket = {
        tokens: config.requestsPerMinute,
        lastRefill: now
      };
      this.buckets.set(key, bucket);
    }

    // Refill tokens based on time elapsed
    const elapsed = now - bucket.lastRefill;
    const refillRate = config.requestsPerMinute / 60000; // tokens per ms
    const tokensToAdd = Math.floor(elapsed * refillRate);

    if (tokensToAdd > 0) {
      bucket.tokens = Math.min(
        config.requestsPerMinute + config.burstLimit,
        bucket.tokens + tokensToAdd
      );
      bucket.lastRefill = now;
    }

    // Try to consume tokens
    if (bucket.tokens >= tokens) {
      bucket.tokens -= tokens;

      this.log.debug('Rate limit token consumed', {
        key,
        tokensConsumed: tokens,
        remainingTokens: bucket.tokens
      });

      return {
        allowed: true,
        remainingTokens: bucket.tokens,
        resetTime: now + (60000 - elapsed)
      };
    }

    // Rate limited
    const retryAfterMs = Math.ceil((tokens - bucket.tokens) / refillRate);

    this.log.warn('Rate limit exceeded', {
      key,
      tokensRequested: tokens,
      tokensAvailable: bucket.tokens,
      retryAfterMs
    });

    return {
      allowed: false,
      remainingTokens: bucket.tokens,
      resetTime: now + retryAfterMs,
      retryAfterMs
    };
  }

  /**
   * Check if a request would be allowed (without consuming)
   */
  check(key: string = 'default', tokens: number = 1): boolean {
    const bucket = this.buckets.get(key);
    if (!bucket) return true;

    const config = configService.getRateLimitConfig();
    const now = Date.now();
    const elapsed = now - bucket.lastRefill;
    const refillRate = config.requestsPerMinute / 60000;
    const currentTokens = Math.min(
      config.requestsPerMinute + config.burstLimit,
      bucket.tokens + Math.floor(elapsed * refillRate)
    );

    return currentTokens >= tokens;
  }

  /**
   * Get current token count for a key
   */
  getTokens(key: string = 'default'): number {
    const bucket = this.buckets.get(key);
    if (!bucket) {
      return configService.getRateLimitConfig().requestsPerMinute;
    }

    const config = configService.getRateLimitConfig();
    const now = Date.now();
    const elapsed = now - bucket.lastRefill;
    const refillRate = config.requestsPerMinute / 60000;

    return Math.min(
      config.requestsPerMinute + config.burstLimit,
      bucket.tokens + Math.floor(elapsed * refillRate)
    );
  }

  /**
   * Reset rate limit for a key
   */
  reset(key: string = 'default'): void {
    this.buckets.delete(key);
    this.log.info('Rate limit reset', { key });
  }

  /**
   * Reset all rate limits
   */
  resetAll(): void {
    this.buckets.clear();
    this.log.info('All rate limits reset');
  }

  /**
   * Get stats for all buckets
   */
  getStats(): Record<string, { tokens: number; lastRefill: string }> {
    const stats: Record<string, { tokens: number; lastRefill: string }> = {};

    this.buckets.forEach((bucket, key) => {
      stats[key] = {
        tokens: this.getTokens(key),
        lastRefill: new Date(bucket.lastRefill).toISOString()
      };
    });

    return stats;
  }
}

/**
 * Concurrent request limiter
 */
class ConcurrentLimiter {
  private active: Map<string, number> = new Map();
  private log = logger.child('ConcurrentLimiter');

  /**
   * Try to acquire a slot for concurrent execution
   */
  tryAcquire(key: string = 'default'): boolean {
    const config = configService.getRateLimitConfig();
    const current = this.active.get(key) || 0;

    if (current >= config.maxConcurrentAgents) {
      this.log.warn('Concurrent limit reached', {
        key,
        current,
        max: config.maxConcurrentAgents
      });
      return false;
    }

    this.active.set(key, current + 1);
    this.log.debug('Concurrent slot acquired', {
      key,
      current: current + 1,
      max: config.maxConcurrentAgents
    });

    return true;
  }

  /**
   * Release a concurrent slot
   */
  release(key: string = 'default'): void {
    const current = this.active.get(key) || 0;
    if (current > 0) {
      this.active.set(key, current - 1);
      this.log.debug('Concurrent slot released', {
        key,
        current: current - 1
      });
    }
  }

  /**
   * Get current concurrent count
   */
  getCount(key: string = 'default'): number {
    return this.active.get(key) || 0;
  }

  /**
   * Check if slot is available
   */
  isAvailable(key: string = 'default'): boolean {
    const config = configService.getRateLimitConfig();
    const current = this.active.get(key) || 0;
    return current < config.maxConcurrentAgents;
  }
}

// Singleton instances
export const rateLimiter = new RateLimiter();
export const concurrentLimiter = new ConcurrentLimiter();

// Export classes for testing
export { RateLimiter, ConcurrentLimiter };

/**
 * Rate limit decorator for async functions
 */
export function withRateLimit<T extends (...args: unknown[]) => Promise<unknown>>(
  fn: T,
  key: string = 'default'
): T {
  return (async (...args: Parameters<T>) => {
    const result = rateLimiter.tryConsume(key);

    if (!result.allowed) {
      throw new Error(`Rate limit exceeded. Retry after ${result.retryAfterMs}ms`);
    }

    return fn(...args);
  }) as T;
}

/**
 * Concurrent limit decorator for async functions
 */
export function withConcurrentLimit<T extends (...args: unknown[]) => Promise<unknown>>(
  fn: T,
  key: string = 'default'
): T {
  return (async (...args: Parameters<T>) => {
    if (!concurrentLimiter.tryAcquire(key)) {
      throw new Error('Concurrent execution limit reached. Please wait.');
    }

    try {
      return await fn(...args);
    } finally {
      concurrentLimiter.release(key);
    }
  }) as T;
}
