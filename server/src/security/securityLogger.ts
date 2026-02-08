/**
 * Security Logger — Structured audit-grade logging for public endpoints
 *
 * Separates security events from product logs. Every field is either:
 * - Non-PII (domain, match_type, status_code)
 * - Hashed (ip, email, tenant)
 *
 * Never logs raw PII. Uses fingerprint() for all identifiers.
 */

import { logger } from '../logger';
import { fingerprint } from '../utils/crypto';

const securityLog = logger.child({ channel: 'security' });

export type MatchType = 'DIRECT_MATCH' | 'LLM_CLASSIFIED' | 'CUSTOM_DESIGNED' | 'FALLBACK' | 'CANNOT_CLASSIFY' | 'DENIED';

export interface OnboardingSecurityEvent {
  request_id: string;
  ip_hash: string;
  org_hash: string;
  identifier_hash: string;
  domain_requested: string;
  governance_level: string;
  match_type: MatchType;
  matched_workforce: string | null;
  rate_limit: {
    allowed: boolean;
    key_triggered?: string;
    retryAfter?: number;
  };
  evidence?: {
    hash: string;
    signature: string;
  };
  latency_ms: number;
  status_code: number;
}

/**
 * Log an onboarding request with all security-relevant fields.
 * All identifiers are hashed before logging.
 */
export function logOnboardingRequest(event: OnboardingSecurityEvent): void {
  securityLog.audit('ONBOARDING_REQUEST', event as unknown as Record<string, unknown>);
}

/**
 * Log a rate limit decision.
 */
export function logRateLimitDecision(params: {
  request_id: string;
  ip_hash: string;
  key_triggered: string;
  retryAfter: number;
  path: string;
}): void {
  securityLog.warn('RATE_LIMIT_TRIGGERED', params as unknown as Record<string, unknown>);
}

/**
 * Log a bot detection event (honeypot or timing).
 */
export function logBotDetection(params: {
  request_id: string;
  ip_hash: string;
  detection_type: 'honeypot' | 'timing' | 'body_size';
  path: string;
}): void {
  securityLog.warn('BOT_DETECTED', params as unknown as Record<string, unknown>);
}

/**
 * Hash an IP address for logging (not reversible).
 */
export function hashIp(ip: string | undefined): string {
  return fingerprint(ip || 'unknown', 12);
}

/**
 * Hash an email for logging (not reversible).
 */
export function hashEmail(email: string): string {
  return fingerprint(email.toLowerCase(), 12);
}

/**
 * Hash an organization identifier for logging.
 */
export function hashOrg(org: string, emailDomain: string): string {
  return fingerprint(`${org}:${emailDomain}`, 12);
}

export { securityLog };
