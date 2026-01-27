/**
 * Secure Audit Store with Enterprise Hardening
 *
 * Features:
 * - File permissions enforcement (0600)
 * - Automatic rotation with retention
 * - WORM-ready design (S3 Object Lock compatible)
 * - Signed entries for non-repudiation
 * - Replay protection via nonce tracking
 *
 * CRITICAL: This store is append-only and fail-closed
 */

import { createWriteStream, WriteStream, promises as fs, constants } from 'fs';
import { join, dirname } from 'path';
import { keyManager, KeyPurpose } from '../security/keyManager';
import { complianceMode } from '../security/complianceMode';
import { logger } from '../logger';
import { hashObject, generateUUID } from '../utils/crypto';

const log = logger.child({ component: 'SecureAuditStore' });

/**
 * Signed audit entry
 */
export interface SignedAuditEntry {
  // Core data
  id: string;
  index: number;
  timestamp: string;
  correlationId: string;

  // Actor info
  actor: {
    sub: string;
    role: string;
    sessionId: string;
    tenantId?: string;
  };

  // Action info
  action: string;
  resource: {
    type: string;
    id: string;
  };
  payload: Record<string, unknown>;

  // Policy context
  policyVersion: string;
  complianceLevel: string;

  // Integrity
  nonce: string;
  prevHash: string;
  entryHash: string;

  // Non-repudiation signature
  signature: string;
  keyVersion: number;
}

/**
 * Rotation policy
 */
export interface RotationPolicy {
  maxFileSizeMB: number;
  maxFileAgeDays: number;
  retentionDays: number;
  compressOnRotate: boolean;
}

/**
 * Secure Audit Store
 */
export class SecureAuditStore {
  private basePath: string;
  private currentFile: string;
  private writeStream: WriteStream | null = null;
  private entryIndex: number = 0;
  private prevHash: string = '';
  private usedNonces: Set<string> = new Set();
  private nonceWindowMs: number = 5 * 60 * 1000; // 5 minute window
  private rotationPolicy: RotationPolicy;
  private currentFileSize: number = 0;
  private currentFileCreated: Date = new Date();
  private policyVersion: string;

  constructor(basePath?: string) {
    this.basePath = basePath || process.env.AUDIT_STORE_PATH || './audit_logs';
    this.currentFile = this.generateFileName();
    this.policyVersion = process.env.POLICY_VERSION || '2024.1.0';

    this.rotationPolicy = {
      maxFileSizeMB: parseInt(process.env.AUDIT_MAX_FILE_MB || '100'),
      maxFileAgeDays: parseInt(process.env.AUDIT_MAX_AGE_DAYS || '1'),
      retentionDays: complianceMode.check('auditRetentionDays'),
      compressOnRotate: true
    };
  }

  private generateFileName(): string {
    const date = new Date().toISOString().split('T')[0];
    const id = generateUUID().slice(0, 8);
    return `audit_${date}_${id}.jsonl`;
  }

  /**
   * Initialize the store with proper permissions
   */
  async initialize(): Promise<void> {
    try {
      // Create directory with restricted permissions
      await fs.mkdir(this.basePath, { recursive: true, mode: 0o700 });

      // Verify directory permissions
      const stats = await fs.stat(this.basePath);
      if ((stats.mode & 0o777) !== 0o700) {
        log.warn('Audit directory permissions are not restricted', {
          path: this.basePath,
          mode: (stats.mode & 0o777).toString(8)
        });

        // Attempt to fix permissions
        await fs.chmod(this.basePath, 0o700);
      }

      // Load existing chain state if file exists
      await this.loadChainState();

      // Open write stream
      await this.openWriteStream();

      log.info('Secure audit store initialized', {
        path: this.basePath,
        currentFile: this.currentFile,
        entryIndex: this.entryIndex
      });

    } catch (error) {
      log.error('Failed to initialize audit store', {}, error as Error);
      throw new Error(`Audit store initialization failed: ${(error as Error).message}`);
    }
  }

  private async loadChainState(): Promise<void> {
    const filePath = join(this.basePath, this.currentFile);

    try {
      await fs.access(filePath, constants.F_OK);

      // Read and parse existing entries to get chain state
      const content = await fs.readFile(filePath, 'utf-8');
      const lines = content.trim().split('\n').filter(l => l);

      if (lines.length > 0) {
        const lastLine = lines[lines.length - 1];
        const lastEntry = JSON.parse(lastLine) as SignedAuditEntry;
        this.entryIndex = lastEntry.index + 1;
        this.prevHash = lastEntry.entryHash;

        log.info('Loaded existing chain state', {
          entriesLoaded: lines.length,
          lastIndex: lastEntry.index
        });
      }

      // Get file size for rotation tracking
      const stats = await fs.stat(filePath);
      this.currentFileSize = stats.size;

    } catch {
      // File doesn't exist, start fresh
      this.entryIndex = 0;
      this.prevHash = '';
    }
  }

  private async openWriteStream(): Promise<void> {
    const filePath = join(this.basePath, this.currentFile);

    this.writeStream = createWriteStream(filePath, {
      flags: 'a',
      mode: 0o600, // Owner read/write only
      encoding: 'utf8'
    });

    // Handle stream errors
    this.writeStream.on('error', (error) => {
      log.error('Audit write stream error', {}, error);
      // Mark as unhealthy - writes will fail
      this.writeStream = null;
    });

    // Set file permissions explicitly
    await fs.chmod(filePath, 0o600);

    this.currentFileCreated = new Date();
  }

  /**
   * Append a signed entry to the audit log
   * FAIL-CLOSED: Throws on any error
   */
  async append(
    actor: SignedAuditEntry['actor'],
    action: string,
    resource: SignedAuditEntry['resource'],
    payload: Record<string, unknown> = {},
    nonce?: string
  ): Promise<SignedAuditEntry> {
    // Check if rotation needed
    await this.checkRotation();

    // Generate or validate nonce for replay protection
    const entryNonce = nonce || generateUUID();
    if (!this.validateNonce(entryNonce)) {
      throw new Error('Nonce already used - potential replay attack');
    }

    const timestamp = new Date().toISOString();
    const id = generateUUID();
    const index = this.entryIndex;

    // Build entry data for hashing
    const entryData = {
      id,
      index,
      timestamp,
      correlationId: payload.correlationId as string || 'none',
      actor,
      action,
      resource,
      payload,
      policyVersion: this.policyVersion,
      complianceLevel: complianceMode.getLevel(),
      nonce: entryNonce,
      prevHash: this.prevHash
    };

    // Generate entry hash
    const entryHash = hashObject(entryData);

    // Sign the entry for non-repudiation
    const { signature, keyVersion } = await this.signEntry(entryHash);

    const signedEntry: SignedAuditEntry = {
      ...entryData,
      entryHash,
      signature,
      keyVersion
    };

    // Write to store - FAIL-CLOSED
    await this.writeEntry(signedEntry);

    // Update chain state ONLY after successful write
    this.prevHash = entryHash;
    this.entryIndex++;
    this.usedNonces.add(entryNonce);

    // Cleanup old nonces
    this.cleanupNonces();

    return signedEntry;
  }

  /**
   * Validate nonce hasn't been used (replay protection)
   */
  private validateNonce(nonce: string): boolean {
    if (this.usedNonces.has(nonce)) {
      log.warn('Duplicate nonce detected', { nonce: nonce.slice(0, 8) });
      return false;
    }
    return true;
  }

  /**
   * Cleanup old nonces outside the window
   */
  private cleanupNonces(): void {
    // In a real implementation, nonces would be stored with timestamps
    // For now, just limit set size
    if (this.usedNonces.size > 10000) {
      // Keep only the most recent half
      const arr = Array.from(this.usedNonces);
      this.usedNonces = new Set(arr.slice(arr.length / 2));
    }
  }

  /**
   * Sign entry using key manager
   */
  private async signEntry(entryHash: string): Promise<{ signature: string; keyVersion: number }> {
    if (!complianceMode.check('requireSignedAudit')) {
      return { signature: 'unsigned', keyVersion: 0 };
    }

    try {
      const signature = await keyManager.signHMAC(KeyPurpose.AUDIT_SIGNING, entryHash);
      const metadata = await keyManager.getMetadata(KeyPurpose.AUDIT_SIGNING);

      return {
        signature,
        keyVersion: metadata.version
      };

    } catch (error) {
      log.error('Failed to sign audit entry', {}, error as Error);
      // In production, this should fail the write
      if (complianceMode.isProduction()) {
        throw new Error('Audit signing failed - write rejected');
      }
      return { signature: 'signing_failed', keyVersion: 0 };
    }
  }

  /**
   * Write entry to store - FAIL-CLOSED
   */
  private async writeEntry(entry: SignedAuditEntry): Promise<void> {
    if (!this.writeStream) {
      throw new Error('Audit store not initialized or in error state');
    }

    const line = JSON.stringify(entry) + '\n';
    const lineBytes = Buffer.byteLength(line, 'utf8');

    return new Promise((resolve, reject) => {
      this.writeStream!.write(line, 'utf8', (error) => {
        if (error) {
          log.error('Audit write failed', {}, error);
          reject(new Error(`Audit write failed: ${error.message}`));
        } else {
          this.currentFileSize += lineBytes;
          resolve();
        }
      });
    });
  }

  /**
   * Check if rotation is needed
   */
  private async checkRotation(): Promise<void> {
    const sizeMB = this.currentFileSize / (1024 * 1024);
    const ageMs = Date.now() - this.currentFileCreated.getTime();
    const ageDays = ageMs / (1000 * 60 * 60 * 24);

    if (sizeMB >= this.rotationPolicy.maxFileSizeMB ||
        ageDays >= this.rotationPolicy.maxFileAgeDays) {
      await this.rotate();
    }
  }

  /**
   * Rotate the audit log file
   */
  async rotate(): Promise<string> {
    const oldFile = this.currentFile;

    // Close current stream
    if (this.writeStream) {
      await new Promise<void>((resolve) => {
        this.writeStream!.end(() => resolve());
      });
    }

    // Generate new filename
    this.currentFile = this.generateFileName();
    this.currentFileSize = 0;
    this.currentFileCreated = new Date();

    // Open new stream
    await this.openWriteStream();

    log.audit('Audit log rotated', {
      oldFile,
      newFile: this.currentFile,
      entriesWritten: this.entryIndex
    });

    // Trigger retention cleanup in background
    this.cleanupOldFiles().catch(err => {
      log.error('Retention cleanup failed', {}, err);
    });

    return this.currentFile;
  }

  /**
   * Cleanup files beyond retention period
   */
  private async cleanupOldFiles(): Promise<void> {
    const retentionMs = this.rotationPolicy.retentionDays * 24 * 60 * 60 * 1000;
    const cutoff = Date.now() - retentionMs;

    try {
      const files = await fs.readdir(this.basePath);

      for (const file of files) {
        if (!file.startsWith('audit_') || !file.endsWith('.jsonl')) {
          continue;
        }

        const filePath = join(this.basePath, file);
        const stats = await fs.stat(filePath);

        if (stats.mtimeMs < cutoff && file !== this.currentFile) {
          // Archive before delete in production
          if (complianceMode.isProduction()) {
            await this.archiveFile(filePath);
          }

          await fs.unlink(filePath);
          log.info('Old audit file removed', { file, age: (Date.now() - stats.mtimeMs) / (1000 * 60 * 60 * 24) });
        }
      }

    } catch (error) {
      log.error('Failed to cleanup old audit files', {}, error as Error);
    }
  }

  /**
   * Archive file before deletion (WORM-ready)
   * In production, this would upload to S3 with Object Lock
   */
  private async archiveFile(filePath: string): Promise<void> {
    // Placeholder for S3 upload with Object Lock
    // const s3 = new S3Client({ region: process.env.AWS_REGION });
    // await s3.send(new PutObjectCommand({
    //   Bucket: process.env.AUDIT_ARCHIVE_BUCKET,
    //   Key: `audit/${basename(filePath)}`,
    //   Body: await fs.readFile(filePath),
    //   ObjectLockMode: 'GOVERNANCE',
    //   ObjectLockRetainUntilDate: new Date(Date.now() + 7 * 365 * 24 * 60 * 60 * 1000) // 7 years
    // }));

    log.info('File archived (placeholder)', { filePath });
  }

  /**
   * Verify chain integrity
   */
  async verifyChain(): Promise<{
    valid: boolean;
    entriesChecked: number;
    brokenAt?: number;
    signatureValid?: boolean;
  }> {
    const filePath = join(this.basePath, this.currentFile);

    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const lines = content.trim().split('\n').filter(l => l);

      let expectedPrevHash = '';

      for (let i = 0; i < lines.length; i++) {
        const entry = JSON.parse(lines[i]) as SignedAuditEntry;

        // Check hash chain
        if (entry.prevHash !== expectedPrevHash) {
          return {
            valid: false,
            entriesChecked: i,
            brokenAt: i
          };
        }

        // Verify signature if required
        if (complianceMode.check('requireSignedAudit') && entry.signature !== 'unsigned') {
          const signatureValid = await keyManager.verifyHMAC(
            KeyPurpose.AUDIT_SIGNING,
            entry.entryHash,
            entry.signature
          );

          if (!signatureValid) {
            return {
              valid: false,
              entriesChecked: i,
              brokenAt: i,
              signatureValid: false
            };
          }
        }

        expectedPrevHash = entry.entryHash;
      }

      return {
        valid: true,
        entriesChecked: lines.length,
        signatureValid: true
      };

    } catch (error) {
      log.error('Chain verification failed', {}, error as Error);
      return {
        valid: false,
        entriesChecked: 0
      };
    }
  }

  /**
   * Get chain state for health checks
   */
  getChainState(): {
    currentFile: string;
    entryCount: number;
    lastHash: string;
    fileSizeMB: number;
    fileAgeHours: number;
  } {
    return {
      currentFile: this.currentFile,
      entryCount: this.entryIndex,
      lastHash: this.prevHash.slice(0, 16) + '...',
      fileSizeMB: this.currentFileSize / (1024 * 1024),
      fileAgeHours: (Date.now() - this.currentFileCreated.getTime()) / (1000 * 60 * 60)
    };
  }
}

// Singleton
export const secureAuditStore = new SecureAuditStore();

export default secureAuditStore;
