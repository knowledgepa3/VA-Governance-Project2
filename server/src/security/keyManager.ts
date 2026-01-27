/**
 * Key Management Service Abstraction
 *
 * Provides a unified interface for cryptographic key management that can:
 * - Use local secrets in development
 * - Integrate with AWS KMS, Azure Key Vault, HashiCorp Vault in production
 * - Support key rotation without code changes
 * - Audit all key access
 *
 * CRITICAL: Never log or expose key material
 */

import { createHmac, createSign, createVerify, generateKeyPairSync, randomBytes } from 'crypto';
import { logger } from '../logger';

const log = logger.child({ component: 'KeyManager' });

/**
 * Key purposes - enforces key separation
 */
export enum KeyPurpose {
  JWT_SIGNING = 'jwt_signing',
  AUDIT_SIGNING = 'audit_signing',
  DATA_ENCRYPTION = 'data_encryption',
  API_AUTH = 'api_auth'
}

/**
 * Key metadata (never includes the actual key)
 */
export interface KeyMetadata {
  keyId: string;
  purpose: KeyPurpose;
  algorithm: string;
  createdAt: string;
  rotatedAt?: string;
  expiresAt?: string;
  version: number;
}

/**
 * Key provider interface - implement for different backends
 */
export interface KeyProvider {
  name: string;

  // Get current key for purpose
  getKey(purpose: KeyPurpose): Promise<Buffer>;

  // Get specific key version (for verification of old signatures)
  getKeyVersion(purpose: KeyPurpose, version: number): Promise<Buffer | null>;

  // Get key metadata
  getMetadata(purpose: KeyPurpose): Promise<KeyMetadata>;

  // Rotate key (returns new version)
  rotateKey(purpose: KeyPurpose): Promise<number>;

  // Health check
  isHealthy(): Promise<boolean>;
}

/**
 * Local file-based key provider (for development)
 * In production, replace with KMS provider
 */
class LocalKeyProvider implements KeyProvider {
  name = 'local';
  private keys: Map<string, { key: Buffer; metadata: KeyMetadata }[]> = new Map();

  constructor() {
    this.initializeKeys();
  }

  private initializeKeys() {
    // Initialize from environment or generate
    for (const purpose of Object.values(KeyPurpose)) {
      const envKey = process.env[`${purpose.toUpperCase()}_KEY`];
      const key = envKey
        ? Buffer.from(envKey, 'base64')
        : randomBytes(32);

      const metadata: KeyMetadata = {
        keyId: `local_${purpose}_v1`,
        purpose,
        algorithm: 'HS256',
        createdAt: new Date().toISOString(),
        version: 1
      };

      this.keys.set(purpose, [{ key, metadata }]);
    }

    log.info('Local key provider initialized', {
      purposes: Object.values(KeyPurpose)
    });
  }

  async getKey(purpose: KeyPurpose): Promise<Buffer> {
    const versions = this.keys.get(purpose);
    if (!versions || versions.length === 0) {
      throw new Error(`No key found for purpose: ${purpose}`);
    }
    // Return latest version
    return versions[versions.length - 1].key;
  }

  async getKeyVersion(purpose: KeyPurpose, version: number): Promise<Buffer | null> {
    const versions = this.keys.get(purpose);
    if (!versions) return null;
    const found = versions.find(v => v.metadata.version === version);
    return found?.key || null;
  }

  async getMetadata(purpose: KeyPurpose): Promise<KeyMetadata> {
    const versions = this.keys.get(purpose);
    if (!versions || versions.length === 0) {
      throw new Error(`No key found for purpose: ${purpose}`);
    }
    return versions[versions.length - 1].metadata;
  }

  async rotateKey(purpose: KeyPurpose): Promise<number> {
    const versions = this.keys.get(purpose) || [];
    const newVersion = versions.length + 1;
    const newKey = randomBytes(32);

    const metadata: KeyMetadata = {
      keyId: `local_${purpose}_v${newVersion}`,
      purpose,
      algorithm: 'HS256',
      createdAt: new Date().toISOString(),
      version: newVersion
    };

    versions.push({ key: newKey, metadata });
    this.keys.set(purpose, versions);

    log.audit('Key rotated', {
      purpose,
      newVersion,
      keyId: metadata.keyId
    });

    return newVersion;
  }

  async isHealthy(): Promise<boolean> {
    return this.keys.size > 0;
  }
}

/**
 * AWS KMS provider stub (implement for production)
 */
class AWSKMSProvider implements KeyProvider {
  name = 'aws_kms';
  private keyArns: Map<KeyPurpose, string>;

  constructor(keyArns: Record<KeyPurpose, string>) {
    this.keyArns = new Map(Object.entries(keyArns) as [KeyPurpose, string][]);
  }

  async getKey(purpose: KeyPurpose): Promise<Buffer> {
    // In real implementation:
    // const kms = new KMSClient({ region: process.env.AWS_REGION });
    // const response = await kms.send(new GenerateDataKeyCommand({ KeyId: arn }));
    // return response.Plaintext;
    throw new Error('AWS KMS provider not implemented - use local provider for development');
  }

  async getKeyVersion(purpose: KeyPurpose, version: number): Promise<Buffer | null> {
    throw new Error('AWS KMS provider not implemented');
  }

  async getMetadata(purpose: KeyPurpose): Promise<KeyMetadata> {
    throw new Error('AWS KMS provider not implemented');
  }

  async rotateKey(purpose: KeyPurpose): Promise<number> {
    // KMS handles rotation automatically
    throw new Error('AWS KMS provider not implemented');
  }

  async isHealthy(): Promise<boolean> {
    // Check KMS connectivity
    return false;
  }
}

/**
 * HashiCorp Vault provider stub (implement for production)
 */
class VaultProvider implements KeyProvider {
  name = 'vault';

  constructor(private vaultAddr: string, private mountPath: string) {}

  async getKey(purpose: KeyPurpose): Promise<Buffer> {
    throw new Error('Vault provider not implemented');
  }

  async getKeyVersion(purpose: KeyPurpose, version: number): Promise<Buffer | null> {
    throw new Error('Vault provider not implemented');
  }

  async getMetadata(purpose: KeyPurpose): Promise<KeyMetadata> {
    throw new Error('Vault provider not implemented');
  }

  async rotateKey(purpose: KeyPurpose): Promise<number> {
    throw new Error('Vault provider not implemented');
  }

  async isHealthy(): Promise<boolean> {
    return false;
  }
}

/**
 * Key Manager - singleton that wraps the active provider
 */
class KeyManager {
  private provider: KeyProvider;
  private cache: Map<string, { key: Buffer; expiresAt: number }> = new Map();
  private readonly CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

  constructor() {
    // Select provider based on environment
    const providerType = process.env.KEY_PROVIDER || 'local';

    switch (providerType) {
      case 'aws_kms':
        this.provider = new AWSKMSProvider({
          [KeyPurpose.JWT_SIGNING]: process.env.KMS_JWT_KEY_ARN!,
          [KeyPurpose.AUDIT_SIGNING]: process.env.KMS_AUDIT_KEY_ARN!,
          [KeyPurpose.DATA_ENCRYPTION]: process.env.KMS_DATA_KEY_ARN!,
          [KeyPurpose.API_AUTH]: process.env.KMS_API_KEY_ARN!
        });
        break;

      case 'vault':
        this.provider = new VaultProvider(
          process.env.VAULT_ADDR!,
          process.env.VAULT_MOUNT_PATH || 'secret'
        );
        break;

      default:
        this.provider = new LocalKeyProvider();
    }

    log.info('Key manager initialized', { provider: this.provider.name });
  }

  /**
   * Get key for purpose (cached)
   */
  async getKey(purpose: KeyPurpose): Promise<Buffer> {
    const cacheKey = `${purpose}_current`;
    const cached = this.cache.get(cacheKey);

    if (cached && cached.expiresAt > Date.now()) {
      return cached.key;
    }

    const key = await this.provider.getKey(purpose);
    this.cache.set(cacheKey, {
      key,
      expiresAt: Date.now() + this.CACHE_TTL_MS
    });

    return key;
  }

  /**
   * Get specific key version
   */
  async getKeyVersion(purpose: KeyPurpose, version: number): Promise<Buffer | null> {
    return this.provider.getKeyVersion(purpose, version);
  }

  /**
   * Get key metadata
   */
  async getMetadata(purpose: KeyPurpose): Promise<KeyMetadata> {
    return this.provider.getMetadata(purpose);
  }

  /**
   * Sign data with HMAC
   */
  async signHMAC(purpose: KeyPurpose, data: string): Promise<string> {
    const key = await this.getKey(purpose);
    const hmac = createHmac('sha256', key);
    hmac.update(data);
    return hmac.digest('hex');
  }

  /**
   * Verify HMAC signature
   */
  async verifyHMAC(purpose: KeyPurpose, data: string, signature: string): Promise<boolean> {
    const expected = await this.signHMAC(purpose, data);
    // Timing-safe comparison
    if (expected.length !== signature.length) return false;
    let result = 0;
    for (let i = 0; i < expected.length; i++) {
      result |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
    }
    return result === 0;
  }

  /**
   * Rotate a key
   */
  async rotateKey(purpose: KeyPurpose): Promise<number> {
    // Clear cache for this purpose
    this.cache.delete(`${purpose}_current`);

    const newVersion = await this.provider.rotateKey(purpose);

    log.audit('Key rotation completed', { purpose, newVersion });

    return newVersion;
  }

  /**
   * Health check
   */
  async isHealthy(): Promise<boolean> {
    return this.provider.isHealthy();
  }

  /**
   * Get provider name
   */
  getProviderName(): string {
    return this.provider.name;
  }
}

// Singleton instance
export const keyManager = new KeyManager();

export default keyManager;
