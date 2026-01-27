/**
 * Cryptographic Utilities - Server-Side
 *
 * Provides deterministic hashing with canonicalized JSON.
 * This ensures hash consistency across different systems.
 *
 * CRITICAL: All hashing MUST use canonicalize() first to ensure
 * deterministic output regardless of object key order.
 */

import { createHash, randomUUID, randomBytes } from 'crypto';

/**
 * SHA-256 hash of a string or buffer
 */
export function sha256Hex(input: string | Buffer): string {
  return createHash('sha256').update(input).digest('hex');
}

/**
 * Canonicalize an object to a deterministic JSON string
 *
 * Rules:
 * - Keys are sorted alphabetically (recursively)
 * - No whitespace variability
 * - Handles nested objects and arrays
 * - Null/undefined handled consistently
 *
 * This prevents hash inconsistencies from JSON.stringify() key ordering
 */
export function canonicalize(obj: unknown): string {
  if (obj === null) {
    return 'null';
  }

  if (obj === undefined) {
    return 'undefined';
  }

  if (typeof obj === 'string') {
    return JSON.stringify(obj);
  }

  if (typeof obj === 'number' || typeof obj === 'boolean') {
    return String(obj);
  }

  if (Array.isArray(obj)) {
    const items = obj.map(item => canonicalize(item));
    return '[' + items.join(',') + ']';
  }

  if (typeof obj === 'object') {
    const sortedKeys = Object.keys(obj).sort();
    const pairs = sortedKeys.map(key => {
      const value = (obj as Record<string, unknown>)[key];
      // Skip undefined values in objects (like JSON.stringify does)
      if (value === undefined) {
        return null;
      }
      return JSON.stringify(key) + ':' + canonicalize(value);
    }).filter(Boolean);
    return '{' + pairs.join(',') + '}';
  }

  // For functions, symbols, etc. - convert to string representation
  return JSON.stringify(String(obj));
}

/**
 * Hash an object using canonicalized JSON
 * This is the primary function for creating deterministic hashes
 */
export function hashObject(obj: unknown): string {
  return sha256Hex(canonicalize(obj));
}

/**
 * Create a chained hash that includes the previous hash
 * Used for tamper-evident audit logs
 */
export function chainedHash(
  data: unknown,
  prevHash: string,
  index: number
): string {
  const payload = {
    index,
    data: canonicalize(data),
    prevHash,
    timestamp: new Date().toISOString()
  };
  return hashObject(payload);
}

/**
 * Verify a hash matches the expected value for given data
 */
export function verifyHash(data: unknown, expectedHash: string): boolean {
  const computed = hashObject(data);
  // Use timing-safe comparison to prevent timing attacks
  return timingSafeEqual(computed, expectedHash);
}

/**
 * Timing-safe string comparison
 * Prevents timing attacks by always comparing all characters
 */
export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    // Still do a comparison to maintain constant time
    const dummy = 'x'.repeat(a.length);
    let result = 0;
    for (let i = 0; i < a.length; i++) {
      result |= a.charCodeAt(i) ^ dummy.charCodeAt(i);
    }
    return false;
  }

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

/**
 * Generate a cryptographically secure UUID
 */
export function generateUUID(): string {
  return randomUUID();
}

/**
 * Generate a secure random token (hex encoded)
 */
export function generateSecureToken(bytes: number = 32): string {
  return randomBytes(bytes).toString('hex');
}

/**
 * Hash sensitive data with a salt (for storage, not comparison)
 */
export function hashWithSalt(data: string, salt: string): string {
  return sha256Hex(salt + data + salt);
}

/**
 * Create a fingerprint of data (shorter hash for display/logging)
 * NOT for security purposes - just for human-readable identification
 */
export function fingerprint(data: unknown, length: number = 8): string {
  return hashObject(data).slice(0, length);
}
