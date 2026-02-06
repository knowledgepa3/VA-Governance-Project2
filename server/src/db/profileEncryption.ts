/**
 * Profile Encryption — AES-256-GCM
 *
 * Encrypts SensitiveProfile JSON blobs before storing in PostgreSQL.
 * Each encrypted record includes: IV (12 bytes) + AuthTag (16 bytes) + Ciphertext.
 * All encoded as a single base64 string.
 *
 * Key derivation:
 *   1. PROFILE_ENCRYPTION_KEY env var (preferred — 32-byte hex)
 *   2. Derived from JWT_SECRET via SHA-256 (fallback)
 */

import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  createHash,
} from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;    // GCM recommended
const TAG_LENGTH = 16;   // GCM auth tag

// ---------------------------------------------------------------------------
// Key management
// ---------------------------------------------------------------------------

let encryptionKey: Buffer | null = null;

function getKey(): Buffer {
  if (encryptionKey) return encryptionKey;

  const explicit = process.env.PROFILE_ENCRYPTION_KEY;
  if (explicit && explicit.length >= 64) {
    // Hex-encoded 32-byte key
    encryptionKey = Buffer.from(explicit.substring(0, 64), 'hex');
    return encryptionKey;
  }

  // Derive from JWT_SECRET
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret || jwtSecret.length < 32) {
    throw new Error(
      '[ProfileEncryption] No encryption key available. Set PROFILE_ENCRYPTION_KEY or ensure JWT_SECRET >= 32 chars.'
    );
  }

  // SHA-256 the JWT secret to get a 32-byte key
  encryptionKey = createHash('sha256').update(jwtSecret).digest();
  return encryptionKey;
}

// ---------------------------------------------------------------------------
// Encrypt
// ---------------------------------------------------------------------------

export function encryptProfile(data: object): { encrypted: string; hash: string } {
  const key = getKey();
  const iv = randomBytes(IV_LENGTH);
  const plaintext = JSON.stringify(data);

  const cipher = createCipheriv(ALGORITHM, key, iv, { authTagLength: TAG_LENGTH });
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  // Pack: IV (12) + AuthTag (16) + Ciphertext
  const packed = Buffer.concat([iv, authTag, ciphertext]);
  const encrypted = packed.toString('base64');

  // Integrity hash of the plaintext (for verification without decryption)
  const hash = createHash('sha256').update(plaintext).digest('hex');

  return { encrypted, hash };
}

// ---------------------------------------------------------------------------
// Decrypt
// ---------------------------------------------------------------------------

export function decryptProfile(encrypted: string): object {
  const key = getKey();
  const packed = Buffer.from(encrypted, 'base64');

  if (packed.length < IV_LENGTH + TAG_LENGTH + 1) {
    throw new Error('[ProfileEncryption] Encrypted data too short');
  }

  const iv = packed.subarray(0, IV_LENGTH);
  const authTag = packed.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
  const ciphertext = packed.subarray(IV_LENGTH + TAG_LENGTH);

  const decipher = createDecipheriv(ALGORITHM, key, iv, { authTagLength: TAG_LENGTH });
  decipher.setAuthTag(authTag);

  const plaintext = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]).toString('utf8');

  return JSON.parse(plaintext);
}
