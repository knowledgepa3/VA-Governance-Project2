/**
 * Egress Control - Domain/URL Allowlist Enforcement
 *
 * Controls what external resources agents can access:
 * - Domain allowlist/blocklist
 * - URL pattern validation
 * - Per-tenant egress policies
 * - Protocol enforcement (HTTPS only in production)
 *
 * CRITICAL: All external navigation MUST go through this filter
 */

import { logger } from '../logger';
import { complianceMode } from './complianceMode';
import { secureAuditStore } from '../audit/auditStoreSecure';

const log = logger.child({ component: 'EgressControl' });

/**
 * Egress policy decision
 */
export interface EgressDecision {
  allowed: boolean;
  reason: string;
  sanitizedUrl?: string;
  warnings?: string[];
}

/**
 * Egress policy configuration
 */
export interface EgressPolicy {
  // Allow mode: 'allowlist' (only listed allowed) or 'blocklist' (only listed blocked)
  mode: 'allowlist' | 'blocklist';

  // Domain lists
  allowedDomains: string[];
  blockedDomains: string[];

  // Pattern lists (regex)
  allowedPatterns: RegExp[];
  blockedPatterns: RegExp[];

  // Protocol enforcement
  allowHttp: boolean;
  allowDataUrls: boolean;

  // URL validation
  maxUrlLength: number;
  blockQueryParams: string[];  // Sensitive params to strip

  // Rate limiting (per domain)
  maxRequestsPerDomain: number;
  domainRateLimitWindowMs: number;
}

/**
 * Default blocked domains (always blocked regardless of policy)
 */
const ALWAYS_BLOCKED_DOMAINS = [
  'localhost',
  '127.0.0.1',
  '0.0.0.0',
  '169.254.169.254',  // AWS metadata
  'metadata.google.internal',
  '*.internal',
  '*.local',
  '*.onion'
];

/**
 * Dangerous URL patterns
 */
const DANGEROUS_PATTERNS = [
  /javascript:/i,
  /data:text\/html/i,
  /vbscript:/i,
  /file:/i,
  /<script/i,
  /on\w+\s*=/i,  // Event handlers
  /&#/,           // HTML entities (potential XSS)
  /%3C/i,         // URL encoded <
  /%3E/i          // URL encoded >
];

/**
 * Default egress policy
 */
const DEFAULT_POLICY: EgressPolicy = {
  mode: 'blocklist',
  allowedDomains: [],
  blockedDomains: [
    '*.ru',
    '*.cn',
    '*.ir',
    '*.kp',
    'pastebin.com',
    'hastebin.com',
    '*.telegram.org',
    'discord.com',
    '*.discord.gg'
  ],
  allowedPatterns: [],
  blockedPatterns: DANGEROUS_PATTERNS,
  allowHttp: false,
  allowDataUrls: false,
  maxUrlLength: 2048,
  blockQueryParams: ['password', 'token', 'secret', 'api_key', 'apikey', 'auth'],
  maxRequestsPerDomain: 100,
  domainRateLimitWindowMs: 60 * 1000
};

/**
 * FedRAMP-compliant policy (very restrictive)
 */
const FEDRAMP_POLICY: EgressPolicy = {
  mode: 'allowlist',
  allowedDomains: [
    '*.va.gov',
    '*.cms.gov',
    '*.ssa.gov',
    '*.usa.gov',
    '*.gsa.gov',
    'api.anthropic.com'
  ],
  blockedDomains: [],
  allowedPatterns: [],
  blockedPatterns: DANGEROUS_PATTERNS,
  allowHttp: false,
  allowDataUrls: false,
  maxUrlLength: 1024,
  blockQueryParams: ['password', 'token', 'secret', 'api_key', 'apikey', 'auth', 'ssn', 'dob'],
  maxRequestsPerDomain: 50,
  domainRateLimitWindowMs: 60 * 1000
};

/**
 * Per-tenant policy overrides
 */
const tenantPolicies: Map<string, Partial<EgressPolicy>> = new Map([
  ['gov-va', {
    mode: 'allowlist',
    allowedDomains: [
      '*.va.gov',
      '*.cms.gov',
      '*.ssa.gov',
      'api.anthropic.com',
      'api.openai.com'
    ]
  }]
]);

/**
 * Domain request tracking for rate limiting
 */
const domainRequests: Map<string, { count: number; resetAt: number }> = new Map();

/**
 * Get effective policy for tenant
 */
function getPolicy(tenantId?: string): EgressPolicy {
  // FedRAMP mode overrides everything
  if (complianceMode.isFedRAMP()) {
    return FEDRAMP_POLICY;
  }

  // Start with default
  let policy = { ...DEFAULT_POLICY };

  // Apply tenant overrides
  if (tenantId && tenantPolicies.has(tenantId)) {
    const tenantOverride = tenantPolicies.get(tenantId)!;
    policy = { ...policy, ...tenantOverride };
  }

  // Production mode enforcements
  if (complianceMode.isProduction()) {
    policy.allowHttp = false;
    policy.allowDataUrls = false;
  }

  return policy;
}

/**
 * Extract domain from URL
 */
function extractDomain(url: string): string | null {
  try {
    const parsed = new URL(url);
    return parsed.hostname.toLowerCase();
  } catch {
    return null;
  }
}

/**
 * Check if domain matches pattern (supports wildcards)
 */
function domainMatches(domain: string, pattern: string): boolean {
  // Handle wildcard patterns like *.example.com
  if (pattern.startsWith('*.')) {
    const suffix = pattern.slice(2);
    return domain === suffix || domain.endsWith('.' + suffix);
  }

  // Exact match
  return domain === pattern;
}

/**
 * Check domain rate limit
 */
function checkDomainRateLimit(domain: string, policy: EgressPolicy): boolean {
  const now = Date.now();
  const key = domain;
  const entry = domainRequests.get(key);

  if (!entry || now >= entry.resetAt) {
    domainRequests.set(key, { count: 1, resetAt: now + policy.domainRateLimitWindowMs });
    return true;
  }

  if (entry.count >= policy.maxRequestsPerDomain) {
    return false;
  }

  entry.count++;
  domainRequests.set(key, entry);
  return true;
}

/**
 * Sanitize URL (remove sensitive params)
 */
function sanitizeUrl(url: string, policy: EgressPolicy): string {
  try {
    const parsed = new URL(url);

    // Remove blocked query params
    for (const param of policy.blockQueryParams) {
      parsed.searchParams.delete(param);
    }

    return parsed.toString();
  } catch {
    return url;
  }
}

/**
 * Check if URL is allowed - THE ENFORCEMENT POINT
 */
export async function checkEgress(
  url: string,
  context: {
    userId: string;
    tenantId?: string;
    action: string;
    agentId?: string;
  }
): Promise<EgressDecision> {
  const policy = getPolicy(context.tenantId);
  const warnings: string[] = [];

  // Basic validation
  if (!url || typeof url !== 'string') {
    return { allowed: false, reason: 'Invalid URL' };
  }

  // Length check
  if (url.length > policy.maxUrlLength) {
    return { allowed: false, reason: 'URL exceeds maximum length' };
  }

  // Check for dangerous patterns
  for (const pattern of policy.blockedPatterns) {
    if (pattern.test(url)) {
      log.warn('Dangerous URL pattern detected', {
        url: url.slice(0, 100),
        pattern: pattern.toString()
      });

      await secureAuditStore.append(
        { sub: context.userId, role: 'agent', sessionId: 'egress', tenantId: context.tenantId },
        'EGRESS_BLOCKED_DANGEROUS',
        { type: 'url', id: url.slice(0, 100) },
        { pattern: pattern.toString(), action: context.action }
      );

      return { allowed: false, reason: 'URL contains dangerous patterns' };
    }
  }

  // Parse URL
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    // Try adding https
    try {
      parsed = new URL('https://' + url);
      warnings.push('Protocol added: https://');
    } catch {
      return { allowed: false, reason: 'Invalid URL format' };
    }
  }

  // Protocol check
  if (parsed.protocol === 'http:' && !policy.allowHttp) {
    if (complianceMode.isProduction()) {
      return { allowed: false, reason: 'HTTP not allowed in production' };
    }
    warnings.push('HTTP is insecure, consider using HTTPS');
  }

  if (parsed.protocol === 'data:' && !policy.allowDataUrls) {
    return { allowed: false, reason: 'Data URLs not allowed' };
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    return { allowed: false, reason: `Protocol not allowed: ${parsed.protocol}` };
  }

  const domain = parsed.hostname.toLowerCase();

  // Check always-blocked domains
  for (const blocked of ALWAYS_BLOCKED_DOMAINS) {
    if (domainMatches(domain, blocked)) {
      log.warn('Internal/reserved domain blocked', { domain });
      return { allowed: false, reason: 'Access to internal resources not allowed' };
    }
  }

  // Apply policy mode
  if (policy.mode === 'allowlist') {
    // Only allowed domains are permitted
    const isAllowed = policy.allowedDomains.some(d => domainMatches(domain, d));

    if (!isAllowed) {
      log.warn('Domain not in allowlist', { domain, tenantId: context.tenantId });

      await secureAuditStore.append(
        { sub: context.userId, role: 'agent', sessionId: 'egress', tenantId: context.tenantId },
        'EGRESS_BLOCKED_ALLOWLIST',
        { type: 'domain', id: domain },
        { action: context.action }
      );

      return { allowed: false, reason: `Domain not in allowlist: ${domain}` };
    }
  } else {
    // Blocklist mode - check if blocked
    const isBlocked = policy.blockedDomains.some(d => domainMatches(domain, d));

    if (isBlocked) {
      log.warn('Domain is blocklisted', { domain, tenantId: context.tenantId });

      await secureAuditStore.append(
        { sub: context.userId, role: 'agent', sessionId: 'egress', tenantId: context.tenantId },
        'EGRESS_BLOCKED_BLOCKLIST',
        { type: 'domain', id: domain },
        { action: context.action }
      );

      return { allowed: false, reason: `Domain is blocklisted: ${domain}` };
    }
  }

  // Check domain rate limit
  if (!checkDomainRateLimit(domain, policy)) {
    log.warn('Domain rate limit exceeded', { domain });

    await secureAuditStore.append(
      { sub: context.userId, role: 'agent', sessionId: 'egress', tenantId: context.tenantId },
      'EGRESS_RATE_LIMITED',
      { type: 'domain', id: domain },
      { action: context.action }
    );

    return { allowed: false, reason: 'Rate limit exceeded for domain' };
  }

  // Sanitize URL
  const sanitizedUrl = sanitizeUrl(parsed.toString(), policy);

  if (sanitizedUrl !== parsed.toString()) {
    warnings.push('Sensitive parameters removed from URL');
  }

  // Audit the allowed egress
  await secureAuditStore.append(
    { sub: context.userId, role: 'agent', sessionId: 'egress', tenantId: context.tenantId },
    'EGRESS_ALLOWED',
    { type: 'url', id: domain },
    {
      action: context.action,
      agentId: context.agentId,
      hasWarnings: warnings.length > 0
    }
  );

  return {
    allowed: true,
    reason: 'URL passed egress checks',
    sanitizedUrl,
    warnings: warnings.length > 0 ? warnings : undefined
  };
}

/**
 * Add domain to tenant allowlist
 */
export function addToAllowlist(tenantId: string, domain: string): void {
  const current = tenantPolicies.get(tenantId) || {};
  const allowedDomains = current.allowedDomains || [];

  if (!allowedDomains.includes(domain)) {
    allowedDomains.push(domain);
    tenantPolicies.set(tenantId, { ...current, allowedDomains });

    log.audit('Domain added to allowlist', { tenantId, domain });
  }
}

/**
 * Remove domain from tenant allowlist
 */
export function removeFromAllowlist(tenantId: string, domain: string): void {
  const current = tenantPolicies.get(tenantId);
  if (!current?.allowedDomains) return;

  current.allowedDomains = current.allowedDomains.filter(d => d !== domain);
  tenantPolicies.set(tenantId, current);

  log.audit('Domain removed from allowlist', { tenantId, domain });
}

/**
 * Get current policy for tenant (for admin UI)
 */
export function getTenantPolicy(tenantId?: string): EgressPolicy {
  return getPolicy(tenantId);
}

export default {
  checkEgress,
  addToAllowlist,
  removeFromAllowlist,
  getTenantPolicy
};
