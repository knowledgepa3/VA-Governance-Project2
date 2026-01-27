/**
 * Cryptographic utilities for ACE Governance Platform
 *
 * Provides tamper-evident hashing for audit logs and evidence packs.
 * Uses SHA-256 with hash chaining for integrity verification.
 */

// Browser-compatible crypto API
const getCrypto = (): Crypto => {
  if (typeof window !== 'undefined' && window.crypto) {
    return window.crypto;
  }
  // Node.js environment fallback
  throw new Error('Crypto API not available');
};

/**
 * Generate SHA-256 hash of data
 */
export async function sha256(data: string): Promise<string> {
  const crypto = getCrypto();
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Generate a chained hash (includes previous hash for tamper detection)
 */
export async function chainedHash(
  data: string,
  previousHash: string,
  index: number
): Promise<string> {
  const payload = JSON.stringify({
    index,
    data,
    previousHash,
    timestamp: new Date().toISOString()
  });
  return sha256(payload);
}

/**
 * Verify a hash chain is intact
 */
export async function verifyHashChain(
  entries: Array<{ data: string; hash: string; previousHash: string; index: number }>
): Promise<{ valid: boolean; brokenAt?: number }> {
  let expectedPreviousHash = '';

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];

    // Check previous hash matches
    if (entry.previousHash !== expectedPreviousHash) {
      return { valid: false, brokenAt: i };
    }

    // Verify current hash
    const computedHash = await chainedHash(entry.data, entry.previousHash, entry.index);
    if (computedHash !== entry.hash) {
      return { valid: false, brokenAt: i };
    }

    expectedPreviousHash = entry.hash;
  }

  return { valid: true };
}

/**
 * Generate a random UUID for correlation IDs
 */
export function generateUUID(): string {
  const crypto = getCrypto();
  return crypto.randomUUID();
}

/**
 * Generate a secure random token
 */
export async function generateSecureToken(length: number = 32): Promise<string> {
  const crypto = getCrypto();
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array).map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Hash sensitive data for storage (one-way)
 */
export async function hashSensitiveData(data: string, salt: string): Promise<string> {
  return sha256(salt + data + salt);
}
