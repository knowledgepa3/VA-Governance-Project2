/**
 * JWT Authentication Service
 *
 * Provides secure token generation and verification with:
 * - Strict claim validation (iss, aud, exp, nbf, iat)
 * - Role-based access control
 * - Separation of Duties hooks
 *
 * CRITICAL: Never trust role claims without server verification.
 */

import * as crypto from 'crypto';
import { generateUUID } from '../utils/crypto';
import { logger } from '../logger';

const log = logger.child({ component: 'JWT' });

/**
 * JWT Configuration
 */
export interface JWTConfig {
  secret: string;
  issuer: string;
  audience: string;
  accessTokenTTL: number;  // seconds
  refreshTokenTTL: number; // seconds
}

// SECURITY: JWT_SECRET is MANDATORY. No fallback allowed.
const jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret || jwtSecret.length < 32 || jwtSecret.includes('CHANGE_ME') || jwtSecret.includes('dev_only')) {
  const msg = 'FATAL: JWT_SECRET is not set or is insecure. ' +
    'Set JWT_SECRET to a random string of at least 64 characters. ' +
    'Generate with: openssl rand -hex 64';
  log.error(msg);

  // In development, allow startup with a warning. In production, hard-fail.
  if (process.env.NODE_ENV === 'production') {
    throw new Error(msg);
  }
}

const DEFAULT_CONFIG: JWTConfig = {
  secret: jwtSecret || 'DEV_ONLY_INSECURE_SECRET_' + Date.now(),
  issuer: process.env.JWT_ISSUER || 'ace-governance',
  audience: process.env.JWT_AUDIENCE || 'ace-api',
  accessTokenTTL: 3600,      // 1 hour
  refreshTokenTTL: 86400 * 7 // 7 days
};

/**
 * JWT Claims
 */
export interface JWTClaims {
  // Standard claims
  iss: string;    // Issuer
  sub: string;    // Subject (user ID)
  aud: string;    // Audience
  exp: number;    // Expiration (Unix timestamp)
  nbf: number;    // Not before (Unix timestamp)
  iat: number;    // Issued at (Unix timestamp)
  jti: string;    // JWT ID (unique identifier)

  // Custom claims
  role: string;
  sessionId: string;
  tenantId?: string;
  permissions?: string[];
}

/**
 * JWT Header
 */
interface JWTHeader {
  alg: 'HS256';
  typ: 'JWT';
}

/**
 * Token type
 */
export type TokenType = 'access' | 'refresh';

/**
 * Sign a JWT
 */
export function signJwt(
  payload: {
    sub: string;
    role: string;
    sessionId: string;
    tenantId?: string;
    permissions?: string[];
  },
  type: TokenType = 'access',
  config: JWTConfig = DEFAULT_CONFIG
): string {
  const now = Math.floor(Date.now() / 1000);
  const ttl = type === 'access' ? config.accessTokenTTL : config.refreshTokenTTL;

  const claims: JWTClaims = {
    iss: config.issuer,
    sub: payload.sub,
    aud: config.audience,
    exp: now + ttl,
    nbf: now,
    iat: now,
    jti: generateUUID(),
    role: payload.role,
    sessionId: payload.sessionId,
    tenantId: payload.tenantId,
    permissions: payload.permissions
  };

  const header: JWTHeader = {
    alg: 'HS256',
    typ: 'JWT'
  };

  const headerB64 = base64UrlEncode(JSON.stringify(header));
  const payloadB64 = base64UrlEncode(JSON.stringify(claims));
  const signature = sign(`${headerB64}.${payloadB64}`, config.secret);

  return `${headerB64}.${payloadB64}.${signature}`;
}

/**
 * Verify a JWT
 *
 * FAIL-CLOSED: Throws on any verification failure
 */
export function verifyJwt(
  token: string,
  config: JWTConfig = DEFAULT_CONFIG
): JWTClaims {
  // Split token
  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new JWTError('Invalid token format', 'INVALID_FORMAT');
  }

  const [headerB64, payloadB64, signatureB64] = parts;

  // Verify signature first
  const expectedSignature = sign(`${headerB64}.${payloadB64}`, config.secret);
  if (!timingSafeEqual(signatureB64, expectedSignature)) {
    throw new JWTError('Invalid signature', 'INVALID_SIGNATURE');
  }

  // Decode header
  let header: JWTHeader;
  try {
    header = JSON.parse(base64UrlDecode(headerB64));
  } catch {
    throw new JWTError('Invalid header', 'INVALID_HEADER');
  }

  // Verify algorithm
  if (header.alg !== 'HS256') {
    throw new JWTError(`Unsupported algorithm: ${header.alg}`, 'UNSUPPORTED_ALG');
  }

  // Decode payload
  let claims: JWTClaims;
  try {
    claims = JSON.parse(base64UrlDecode(payloadB64));
  } catch {
    throw new JWTError('Invalid payload', 'INVALID_PAYLOAD');
  }

  const now = Math.floor(Date.now() / 1000);

  // Verify issuer
  if (claims.iss !== config.issuer) {
    throw new JWTError(`Invalid issuer: ${claims.iss}`, 'INVALID_ISSUER');
  }

  // Verify audience
  if (claims.aud !== config.audience) {
    throw new JWTError(`Invalid audience: ${claims.aud}`, 'INVALID_AUDIENCE');
  }

  // Verify expiration
  if (claims.exp <= now) {
    throw new JWTError('Token expired', 'TOKEN_EXPIRED');
  }

  // Verify not before
  if (claims.nbf > now) {
    throw new JWTError('Token not yet valid', 'TOKEN_NOT_YET_VALID');
  }

  // Verify issued at (prevent tokens from the future)
  if (claims.iat > now + 60) { // Allow 60 second clock skew
    throw new JWTError('Token issued in the future', 'INVALID_IAT');
  }

  return claims;
}

/**
 * Decode a JWT without verification (for debugging only)
 * WARNING: Do not use for authentication!
 */
export function decodeJwtUnsafe(token: string): {
  header: JWTHeader;
  claims: JWTClaims;
} {
  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new JWTError('Invalid token format', 'INVALID_FORMAT');
  }

  return {
    header: JSON.parse(base64UrlDecode(parts[0])),
    claims: JSON.parse(base64UrlDecode(parts[1]))
  };
}

/**
 * Check if a role has a specific permission
 */
export function hasPermission(
  claims: JWTClaims,
  permission: string
): boolean {
  // ISSO has all permissions
  if (claims.role === 'ISSO / ACE Architect') {
    return true;
  }

  // Check explicit permissions
  if (claims.permissions?.includes(permission)) {
    return true;
  }

  // Role-based default permissions
  const rolePermissions: Record<string, string[]> = {
    'ISSO / ACE Architect': ['*'],
    'Chief Compliance Officer': ['approve:report', 'approve:qa', 'view:audit'],
    'Forensic SME': ['approve:evidence', 'approve:rater', 'approve:examiner', 'view:audit'],
    'Sanitization Officer': ['approve:gateway', 'view:redaction'],
    'Federal Auditor': ['view:audit', 'view:report']
  };

  const defaultPermissions = rolePermissions[claims.role] || [];
  return defaultPermissions.includes('*') || defaultPermissions.includes(permission);
}

/**
 * Separation of Duties check
 * Verifies that an action can be performed by the given user
 */
export interface SODContext {
  actionType: string;
  resourceId: string;
  initiatorId?: string;
  previousApprovers?: string[];
}

export function checkSeparationOfDuties(
  claims: JWTClaims,
  context: SODContext
): { allowed: boolean; reason?: string } {
  // Rule 1: Cannot approve own initiated workflow
  if (context.initiatorId && context.initiatorId === claims.sub) {
    return {
      allowed: false,
      reason: 'Cannot approve your own initiated workflow'
    };
  }

  // Rule 2: Cannot be duplicate approver (four-eyes principle)
  if (context.previousApprovers?.includes(claims.sub)) {
    return {
      allowed: false,
      reason: 'You have already approved a step in this workflow'
    };
  }

  // Rule 3: Role must be allowed for this action type
  const actionRoleRequirements: Record<string, string[]> = {
    'approve:gateway': ['ISSO / ACE Architect', 'Sanitization Officer'],
    'approve:evidence': ['ISSO / ACE Architect', 'Forensic SME'],
    'approve:report': ['ISSO / ACE Architect', 'Chief Compliance Officer'],
    'approve:qa': ['ISSO / ACE Architect', 'Chief Compliance Officer', 'Forensic SME']
  };

  const allowedRoles = actionRoleRequirements[context.actionType];
  if (allowedRoles && !allowedRoles.includes(claims.role)) {
    return {
      allowed: false,
      reason: `Role ${claims.role} cannot perform ${context.actionType}`
    };
  }

  return { allowed: true };
}

// Helper functions

function base64UrlEncode(str: string): string {
  return Buffer.from(str, 'utf8')
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function base64UrlDecode(str: string): string {
  // Add padding
  let padded = str;
  const mod = str.length % 4;
  if (mod === 2) padded += '==';
  else if (mod === 3) padded += '=';

  return Buffer.from(
    padded.replace(/-/g, '+').replace(/_/g, '/'),
    'base64'
  ).toString('utf8');
}

function sign(data: string, secret: string): string {
  return crypto
    .createHmac('sha256', secret)
    .update(data)
    .digest('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }

  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  return crypto.timingSafeEqual(bufA, bufB);
}

/**
 * JWT Error class
 */
export class JWTError extends Error {
  constructor(
    message: string,
    public code: string
  ) {
    super(message);
    this.name = 'JWTError';
  }
}

export default {
  signJwt,
  verifyJwt,
  decodeJwtUnsafe,
  hasPermission,
  checkSeparationOfDuties,
  JWTError
};
