/**
 * Structured Logging Service for ACE Governance Platform
 *
 * Provides correlation IDs, severity levels, and audit-grade logging.
 * All logs include context for forensic analysis.
 */

import { generateUUID } from './crypto';

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  CRITICAL = 4,
  AUDIT = 5  // Special level for audit events (always logged)
}

export interface LogEntry {
  timestamp: string;
  level: string;
  correlationId: string;
  sessionId: string;
  userId?: string;
  component: string;
  message: string;
  context?: Record<string, unknown>;
  stackTrace?: string;
}

export interface LoggerConfig {
  minLevel: LogLevel;
  enableConsole: boolean;
  enableRemote: boolean;
  remoteEndpoint?: string;
  sessionId: string;
}

class Logger {
  private config: LoggerConfig;
  private correlationId: string;
  private buffer: LogEntry[] = [];
  private flushInterval: ReturnType<typeof setInterval> | null = null;

  constructor() {
    this.correlationId = generateUUID();
    this.config = {
      minLevel: LogLevel.INFO,
      enableConsole: true,
      enableRemote: false,
      sessionId: generateUUID()
    };

    // Flush buffer periodically
    this.flushInterval = setInterval(() => this.flush(), 5000);
  }

  /**
   * Configure the logger
   */
  configure(config: Partial<LoggerConfig>) {
    this.config = { ...this.config, ...config };
  }

  /**
   * Set correlation ID for request tracing
   */
  setCorrelationId(id: string) {
    this.correlationId = id;
  }

  /**
   * Get current correlation ID
   */
  getCorrelationId(): string {
    return this.correlationId;
  }

  /**
   * Generate a new correlation ID (for new requests)
   */
  newCorrelationId(): string {
    this.correlationId = generateUUID();
    return this.correlationId;
  }

  /**
   * Create a child logger with inherited correlation ID
   */
  child(component: string): ComponentLogger {
    return new ComponentLogger(this, component);
  }

  /**
   * Core logging function
   */
  private log(
    level: LogLevel,
    component: string,
    message: string,
    context?: Record<string, unknown>,
    error?: Error
  ) {
    if (level < this.config.minLevel && level !== LogLevel.AUDIT) {
      return;
    }

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: LogLevel[level],
      correlationId: this.correlationId,
      sessionId: this.config.sessionId,
      component,
      message,
      context,
      stackTrace: error?.stack
    };

    // Add to buffer for remote sending
    this.buffer.push(entry);

    // Console output
    if (this.config.enableConsole) {
      const style = this.getConsoleStyle(level);
      const prefix = `[${entry.timestamp}] [${entry.level}] [${entry.correlationId.slice(0, 8)}] [${component}]`;

      if (level >= LogLevel.ERROR) {
        console.error(style, prefix, message, context || '', error || '');
      } else if (level === LogLevel.WARN) {
        console.warn(style, prefix, message, context || '');
      } else {
        console.log(style, prefix, message, context || '');
      }
    }

    // Immediate flush for critical/audit events
    if (level >= LogLevel.CRITICAL || level === LogLevel.AUDIT) {
      this.flush();
    }
  }

  private getConsoleStyle(level: LogLevel): string {
    switch (level) {
      case LogLevel.DEBUG: return 'color: gray';
      case LogLevel.INFO: return 'color: blue';
      case LogLevel.WARN: return 'color: orange';
      case LogLevel.ERROR: return 'color: red';
      case LogLevel.CRITICAL: return 'color: red; font-weight: bold';
      case LogLevel.AUDIT: return 'color: purple; font-weight: bold';
      default: return '';
    }
  }

  /**
   * Flush log buffer to remote endpoint
   */
  async flush() {
    if (!this.config.enableRemote || !this.config.remoteEndpoint || this.buffer.length === 0) {
      return;
    }

    const entries = [...this.buffer];
    this.buffer = [];

    try {
      await fetch(this.config.remoteEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ logs: entries })
      });
    } catch (error) {
      // Re-add to buffer on failure
      this.buffer = [...entries, ...this.buffer];
      console.error('Failed to flush logs to remote:', error);
    }
  }

  /**
   * Get all buffered logs (for debugging/export)
   */
  getBuffer(): LogEntry[] {
    return [...this.buffer];
  }

  /**
   * Cleanup
   */
  destroy() {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
    }
    this.flush();
  }

  // Convenience methods
  debug(component: string, message: string, context?: Record<string, unknown>) {
    this.log(LogLevel.DEBUG, component, message, context);
  }

  info(component: string, message: string, context?: Record<string, unknown>) {
    this.log(LogLevel.INFO, component, message, context);
  }

  warn(component: string, message: string, context?: Record<string, unknown>) {
    this.log(LogLevel.WARN, component, message, context);
  }

  error(component: string, message: string, context?: Record<string, unknown>, error?: Error) {
    this.log(LogLevel.ERROR, component, message, context, error);
  }

  critical(component: string, message: string, context?: Record<string, unknown>, error?: Error) {
    this.log(LogLevel.CRITICAL, component, message, context, error);
  }

  audit(component: string, message: string, context?: Record<string, unknown>) {
    this.log(LogLevel.AUDIT, component, message, context);
  }
}

/**
 * Component-specific logger with preset component name
 */
class ComponentLogger {
  constructor(private parent: Logger, private component: string) {}

  debug(message: string, context?: Record<string, unknown>) {
    this.parent.debug(this.component, message, context);
  }

  info(message: string, context?: Record<string, unknown>) {
    this.parent.info(this.component, message, context);
  }

  warn(message: string, context?: Record<string, unknown>) {
    this.parent.warn(this.component, message, context);
  }

  error(message: string, context?: Record<string, unknown>, error?: Error) {
    this.parent.error(this.component, message, context, error);
  }

  critical(message: string, context?: Record<string, unknown>, error?: Error) {
    this.parent.critical(this.component, message, context, error);
  }

  audit(message: string, context?: Record<string, unknown>) {
    this.parent.audit(this.component, message, context);
  }
}

// Singleton instance
export const logger = new Logger();

// Export for testing
export { Logger, ComponentLogger };
