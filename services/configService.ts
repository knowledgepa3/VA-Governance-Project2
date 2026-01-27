/**
 * Configuration Service for ACE Governance Platform
 *
 * Provides environment-specific configuration with:
 * - Development/Staging/Production profiles
 * - Runtime configuration updates
 * - Feature flags
 * - Rate limiting configuration
 */

import { logger } from './logger';
import { AgentRole, MAIClassification } from '../types';

export type Environment = 'development' | 'staging' | 'production';

export interface RateLimitConfig {
  requestsPerMinute: number;
  requestsPerHour: number;
  maxConcurrentAgents: number;
  burstLimit: number;
}

export interface GovernanceConfig {
  approvalTimeoutMs: number;
  mandatoryGateAgents: AgentRole[];
  requireSeparationOfDuties: boolean;
  allowRoleSwitching: boolean;
  maxAuditLogSize: number;
}

export interface SecurityConfig {
  enableBrowserApiCalls: boolean;  // Should be false in production
  apiProxyEndpoint: string;
  enableDebugLogging: boolean;
  allowedDomains: string[];
  blockedDomains: string[];
  requireHttps: boolean;
}

export interface FeatureFlags {
  enablePlaybookEngine: boolean;
  enableBrowserAutomation: boolean;
  enableBDWorkforce: boolean;
  enablePIITransparency: boolean;
  enableRealTimeAudit: boolean;
}

export interface AppConfig {
  environment: Environment;
  version: string;
  rateLimit: RateLimitConfig;
  governance: GovernanceConfig;
  security: SecurityConfig;
  features: FeatureFlags;
}

// Default configurations per environment
const CONFIGS: Record<Environment, AppConfig> = {
  development: {
    environment: 'development',
    version: '1.0.0-dev',
    rateLimit: {
      requestsPerMinute: 60,
      requestsPerHour: 1000,
      maxConcurrentAgents: 10,
      burstLimit: 20
    },
    governance: {
      approvalTimeoutMs: 3600000, // 1 hour
      mandatoryGateAgents: [
        AgentRole.GATEWAY,
        AgentRole.QA,
        AgentRole.REPORT
      ],
      requireSeparationOfDuties: false, // Relaxed for dev
      allowRoleSwitching: true,
      maxAuditLogSize: 10000
    },
    security: {
      enableBrowserApiCalls: true, // OK for dev only
      apiProxyEndpoint: 'http://localhost:3001/api',
      enableDebugLogging: true,
      allowedDomains: ['*'],
      blockedDomains: [],
      requireHttps: false
    },
    features: {
      enablePlaybookEngine: true,
      enableBrowserAutomation: true,
      enableBDWorkforce: true,
      enablePIITransparency: true,
      enableRealTimeAudit: true
    }
  },

  staging: {
    environment: 'staging',
    version: '1.0.0-staging',
    rateLimit: {
      requestsPerMinute: 30,
      requestsPerHour: 500,
      maxConcurrentAgents: 5,
      burstLimit: 10
    },
    governance: {
      approvalTimeoutMs: 1800000, // 30 minutes
      mandatoryGateAgents: [
        AgentRole.GATEWAY,
        AgentRole.QA,
        AgentRole.REPORT
      ],
      requireSeparationOfDuties: true,
      allowRoleSwitching: true, // For testing
      maxAuditLogSize: 50000
    },
    security: {
      enableBrowserApiCalls: false,
      apiProxyEndpoint: 'https://staging-api.ace-governance.com/api',
      enableDebugLogging: true,
      allowedDomains: ['staging.ace-governance.com', 'sam.gov'],
      blockedDomains: ['va.gov', 'login.gov'], // Block production gov sites
      requireHttps: true
    },
    features: {
      enablePlaybookEngine: true,
      enableBrowserAutomation: true,
      enableBDWorkforce: true,
      enablePIITransparency: true,
      enableRealTimeAudit: true
    }
  },

  production: {
    environment: 'production',
    version: '1.0.0',
    rateLimit: {
      requestsPerMinute: 20,
      requestsPerHour: 200,
      maxConcurrentAgents: 3,
      burstLimit: 5
    },
    governance: {
      approvalTimeoutMs: 3600000, // 1 hour
      mandatoryGateAgents: [
        AgentRole.GATEWAY,
        AgentRole.EVIDENCE,
        AgentRole.QA,
        AgentRole.REPORT
      ],
      requireSeparationOfDuties: true,
      allowRoleSwitching: false, // Requires re-auth in production
      maxAuditLogSize: 1000000
    },
    security: {
      enableBrowserApiCalls: false, // CRITICAL: Must be false
      apiProxyEndpoint: 'https://api.ace-governance.com/api',
      enableDebugLogging: false,
      allowedDomains: ['ace-governance.com', 'sam.gov', 'usaspending.gov'],
      blockedDomains: ['va.gov', 'login.gov', 'benefits.va.gov'],
      requireHttps: true
    },
    features: {
      enablePlaybookEngine: true,
      enableBrowserAutomation: false, // Requires additional approval
      enableBDWorkforce: true,
      enablePIITransparency: true,
      enableRealTimeAudit: true
    }
  }
};

class ConfigService {
  private config: AppConfig;
  private overrides: Partial<AppConfig> = {};
  private log = logger.child('ConfigService');

  constructor() {
    // Determine environment
    const env = this.detectEnvironment();
    this.config = { ...CONFIGS[env] };
    this.log.info(`Configuration loaded for environment: ${env}`);
  }

  /**
   * Detect current environment
   */
  private detectEnvironment(): Environment {
    // Check for explicit environment variable
    if (typeof process !== 'undefined' && process.env) {
      const envVar = process.env.NODE_ENV || process.env.VITE_ENV;
      if (envVar === 'production') return 'production';
      if (envVar === 'staging') return 'staging';
    }

    // Check URL for staging/production patterns
    if (typeof window !== 'undefined') {
      const hostname = window.location.hostname;
      if (hostname.includes('staging')) return 'staging';
      if (hostname.includes('localhost') || hostname.includes('127.0.0.1')) return 'development';
      if (hostname.includes('ace-governance.com')) return 'production';
    }

    return 'development';
  }

  /**
   * Get full configuration
   */
  getConfig(): AppConfig {
    return { ...this.config, ...this.overrides };
  }

  /**
   * Get specific configuration section
   */
  getRateLimitConfig(): RateLimitConfig {
    return this.getConfig().rateLimit;
  }

  getGovernanceConfig(): GovernanceConfig {
    return this.getConfig().governance;
  }

  getSecurityConfig(): SecurityConfig {
    return this.getConfig().security;
  }

  getFeatureFlags(): FeatureFlags {
    return this.getConfig().features;
  }

  /**
   * Check if a feature is enabled
   */
  isFeatureEnabled(feature: keyof FeatureFlags): boolean {
    return this.getFeatureFlags()[feature];
  }

  /**
   * Check if agent requires mandatory gate
   */
  isMandatoryGate(agentRole: AgentRole): boolean {
    return this.getGovernanceConfig().mandatoryGateAgents.includes(agentRole);
  }

  /**
   * Get effective classification (enforce mandatory for critical agents)
   */
  getEffectiveClassification(
    agentRole: AgentRole,
    configuredClassification: MAIClassification
  ): MAIClassification {
    // Always enforce MANDATORY for critical agents regardless of config
    if (this.isMandatoryGate(agentRole)) {
      return MAIClassification.MANDATORY;
    }
    return configuredClassification;
  }

  /**
   * Check if domain is allowed
   */
  isDomainAllowed(domain: string): boolean {
    const security = this.getSecurityConfig();

    // Check blocked list first
    if (security.blockedDomains.some(d => domain.includes(d))) {
      return false;
    }

    // Check allowed list
    if (security.allowedDomains.includes('*')) {
      return true;
    }

    return security.allowedDomains.some(d => domain.includes(d));
  }

  /**
   * Apply runtime overrides (for testing/debugging)
   */
  applyOverrides(overrides: Partial<AppConfig>): void {
    if (this.config.environment === 'production') {
      this.log.warn('Attempting to apply config overrides in production - ignoring');
      return;
    }

    this.overrides = { ...this.overrides, ...overrides };
    this.log.info('Configuration overrides applied', { overrides });
  }

  /**
   * Clear runtime overrides
   */
  clearOverrides(): void {
    this.overrides = {};
    this.log.info('Configuration overrides cleared');
  }

  /**
   * Validate current configuration
   */
  validateConfig(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    const config = this.getConfig();

    // Security checks
    if (config.environment === 'production') {
      if (config.security.enableBrowserApiCalls) {
        errors.push('CRITICAL: Browser API calls must be disabled in production');
      }
      if (config.security.enableDebugLogging) {
        errors.push('WARNING: Debug logging should be disabled in production');
      }
      if (!config.security.requireHttps) {
        errors.push('CRITICAL: HTTPS must be required in production');
      }
      if (!config.governance.requireSeparationOfDuties) {
        errors.push('CRITICAL: Separation of Duties must be enabled in production');
      }
    }

    // Rate limit sanity checks
    if (config.rateLimit.requestsPerMinute > 100) {
      errors.push('WARNING: Rate limit per minute seems high');
    }

    return {
      valid: errors.filter(e => e.startsWith('CRITICAL')).length === 0,
      errors
    };
  }

  /**
   * Export configuration for debugging
   */
  exportConfig(): string {
    const config = this.getConfig();
    // Redact sensitive information
    const safeConfig = {
      ...config,
      security: {
        ...config.security,
        apiProxyEndpoint: '[REDACTED]'
      }
    };
    return JSON.stringify(safeConfig, null, 2);
  }
}

// Singleton instance
export const configService = new ConfigService();

// Export class for testing
export { ConfigService };
