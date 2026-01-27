/**
 * Append-Only Audit Store
 *
 * Provides persistent, append-only storage for audit events.
 * This is a file-based implementation for development/MVP.
 * Swap with Postgres/DynamoDB for production.
 *
 * CRITICAL: Write failures MUST propagate - never fail silently.
 */

import * as fs from 'fs';
import * as path from 'path';
import { logger } from '../logger';

const log = logger.child({ component: 'AuditStore' });

export interface AuditStoreConfig {
  baseDir: string;
  filePrefix: string;
  rotateDaily: boolean;
  maxFileSize: number;  // bytes
}

const DEFAULT_CONFIG: AuditStoreConfig = {
  baseDir: process.env.AUDIT_LOG_DIR || './audit-logs',
  filePrefix: 'audit',
  rotateDaily: true,
  maxFileSize: 100 * 1024 * 1024  // 100MB
};

class AuditStore {
  private config: AuditStoreConfig;
  private currentFile: string | null = null;
  private writeStream: fs.WriteStream | null = null;
  private isInitialized = false;

  constructor(config: Partial<AuditStoreConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Initialize the audit store
   * MUST be called before any writes
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      // Ensure directory exists
      await fs.promises.mkdir(this.config.baseDir, { recursive: true });

      // Open current log file
      await this.openLogFile();

      this.isInitialized = true;
      log.info('Audit store initialized', { baseDir: this.config.baseDir });
    } catch (error) {
      log.error('Failed to initialize audit store', {}, error as Error);
      throw new Error(`Audit store initialization failed: ${(error as Error).message}`);
    }
  }

  /**
   * Append a line to the audit log
   * Returns only after write is confirmed
   *
   * FAIL-CLOSED: Throws on any write error
   */
  async appendLine(jsonl: string): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('Audit store not initialized');
    }

    // Check for rotation
    await this.checkRotation();

    return new Promise((resolve, reject) => {
      if (!this.writeStream) {
        reject(new Error('Write stream not available'));
        return;
      }

      const line = jsonl.endsWith('\n') ? jsonl : jsonl + '\n';

      // Write and wait for confirmation
      const canContinue = this.writeStream.write(line, 'utf8', (error) => {
        if (error) {
          log.error('Audit write failed', {}, error);
          reject(new Error(`Audit write failed: ${error.message}`));
        } else {
          resolve();
        }
      });

      // Handle backpressure
      if (!canContinue) {
        this.writeStream.once('drain', () => {
          // Write completed after drain
        });
      }
    });
  }

  /**
   * Flush all pending writes to disk
   */
  async flush(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.writeStream) {
        resolve();
        return;
      }

      // End the stream and wait for all writes to complete
      this.writeStream.end(() => {
        // Reopen the stream for future writes
        this.openLogFile()
          .then(() => resolve())
          .catch(reject);
      });
    });
  }

  /**
   * Read all audit entries (for verification)
   * Returns entries in order
   */
  async readAll(): Promise<string[]> {
    const files = await this.getLogFiles();
    const entries: string[] = [];

    for (const file of files) {
      const content = await fs.promises.readFile(file, 'utf8');
      const lines = content.split('\n').filter(line => line.trim());
      entries.push(...lines);
    }

    return entries;
  }

  /**
   * Read entries from a specific date range
   */
  async readRange(from: Date, to: Date): Promise<string[]> {
    const files = await this.getLogFiles();
    const entries: string[] = [];

    for (const file of files) {
      // Check if file is in date range based on filename
      const fileName = path.basename(file);
      const dateMatch = fileName.match(/(\d{4}-\d{2}-\d{2})/);

      if (dateMatch) {
        const fileDate = new Date(dateMatch[1]);
        if (fileDate < from || fileDate > to) {
          continue;
        }
      }

      const content = await fs.promises.readFile(file, 'utf8');
      const lines = content.split('\n').filter(line => {
        if (!line.trim()) return false;

        try {
          const entry = JSON.parse(line);
          const entryDate = new Date(entry.ts);
          return entryDate >= from && entryDate <= to;
        } catch {
          return false;
        }
      });

      entries.push(...lines);
    }

    return entries;
  }

  /**
   * Get the current log file path
   */
  getCurrentFilePath(): string | null {
    return this.currentFile;
  }

  /**
   * Close the store (for graceful shutdown)
   */
  async close(): Promise<void> {
    if (this.writeStream) {
      return new Promise((resolve) => {
        this.writeStream!.end(() => {
          this.writeStream = null;
          this.currentFile = null;
          this.isInitialized = false;
          resolve();
        });
      });
    }
  }

  // Private methods

  private async openLogFile(): Promise<void> {
    const fileName = this.generateFileName();
    const filePath = path.join(this.config.baseDir, fileName);

    // Close existing stream if open
    if (this.writeStream) {
      await new Promise<void>((resolve) => {
        this.writeStream!.end(resolve);
      });
    }

    // Open new stream in append mode
    this.writeStream = fs.createWriteStream(filePath, {
      flags: 'a',
      encoding: 'utf8',
      mode: 0o600  // Read/write for owner only
    });

    // Handle stream errors
    this.writeStream.on('error', (error) => {
      log.error('Audit stream error', {}, error);
      // This is critical - we need to know if writes are failing
      process.emit('uncaughtException', error);
    });

    this.currentFile = filePath;
  }

  private generateFileName(): string {
    const date = new Date().toISOString().split('T')[0];
    return `${this.config.filePrefix}-${date}.jsonl`;
  }

  private async checkRotation(): Promise<void> {
    if (!this.currentFile) {
      await this.openLogFile();
      return;
    }

    // Check daily rotation
    if (this.config.rotateDaily) {
      const currentDate = new Date().toISOString().split('T')[0];
      const expectedFileName = `${this.config.filePrefix}-${currentDate}.jsonl`;
      const currentFileName = path.basename(this.currentFile);

      if (currentFileName !== expectedFileName) {
        log.info('Rotating audit log (daily)', {
          oldFile: currentFileName,
          newFile: expectedFileName
        });
        await this.openLogFile();
        return;
      }
    }

    // Check size-based rotation
    try {
      const stats = await fs.promises.stat(this.currentFile);
      if (stats.size >= this.config.maxFileSize) {
        const timestamp = Date.now();
        const rotatedName = this.currentFile.replace('.jsonl', `-${timestamp}.jsonl`);
        await fs.promises.rename(this.currentFile, rotatedName);

        log.info('Rotating audit log (size)', {
          oldFile: this.currentFile,
          newFile: rotatedName,
          size: stats.size
        });

        await this.openLogFile();
      }
    } catch (error) {
      // File might not exist yet
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw error;
      }
    }
  }

  private async getLogFiles(): Promise<string[]> {
    const files = await fs.promises.readdir(this.config.baseDir);
    return files
      .filter(f => f.startsWith(this.config.filePrefix) && f.endsWith('.jsonl'))
      .map(f => path.join(this.config.baseDir, f))
      .sort();
  }
}

// Singleton instance
export const auditStore = new AuditStore();

export default auditStore;
