/**
 * Pack Configuration Service
 *
 * Manages pack configuration, provides runtime access to pack settings,
 * and handles configuration persistence.
 */

import { packRegistry } from './registry';
import {
  InstalledPack,
  PackManifest,
  ConfigField,
  PolicyDefinition,
  ThresholdConfig
} from './types';

// =============================================================================
// CONFIGURATION SERVICE
// =============================================================================

export class PackConfigService {
  private static instance: PackConfigService;

  private constructor() {}

  static getInstance(): PackConfigService {
    if (!PackConfigService.instance) {
      PackConfigService.instance = new PackConfigService();
    }
    return PackConfigService.instance;
  }

  // ===========================================================================
  // CONFIGURATION ACCESS
  // ===========================================================================

  /**
   * Get a configuration value for a pack
   */
  getConfigValue<T = any>(packId: string, fieldId: string): T | undefined {
    const installed = packRegistry.getInstalledPack(packId);
    if (!installed) return undefined;
    return installed.configuration[fieldId] as T;
  }

  /**
   * Get all configuration for a pack
   */
  getPackConfig(packId: string): Record<string, any> | undefined {
    const installed = packRegistry.getInstalledPack(packId);
    return installed?.configuration;
  }

  /**
   * Set a configuration value
   */
  async setConfigValue(packId: string, fieldId: string, value: any): Promise<boolean> {
    return packRegistry.updateConfiguration(packId, { [fieldId]: value });
  }

  /**
   * Set multiple configuration values
   */
  async setConfigValues(packId: string, values: Record<string, any>): Promise<boolean> {
    return packRegistry.updateConfiguration(packId, values);
  }

  // ===========================================================================
  // CONFIGURATION UI HELPERS
  // ===========================================================================

  /**
   * Get configuration form structure for a pack
   */
  getConfigForm(packId: string): ConfigFormData | undefined {
    const installed = packRegistry.getInstalledPack(packId);
    if (!installed) return undefined;

    return {
      packId,
      packName: installed.manifest.name,
      sections: installed.manifest.configuration.sections.map(section => ({
        id: section.id,
        title: section.title,
        description: section.description,
        fields: section.fields.map(field => ({
          ...field,
          currentValue: installed.configuration[field.id] ?? field.defaultValue
        }))
      }))
    };
  }

  /**
   * Get policy configuration for a pack
   */
  getPolicyConfig(packId: string): PolicyConfigData | undefined {
    const installed = packRegistry.getInstalledPack(packId);
    if (!installed) return undefined;

    const policies = installed.manifest.provides.policies || [];

    return {
      packId,
      packName: installed.manifest.name,
      policies: policies.map(policy => ({
        id: policy.id,
        name: policy.name,
        description: policy.description,
        classification: policy.classification,
        enabled: installed.enabledPolicies.includes(policy.id),
        canDisable: policy.canDisable,
        thresholds: policy.thresholds?.map(t => ({
          ...t,
          currentValue: t.currentValue ?? t.defaultValue
        }))
      }))
    };
  }

  // ===========================================================================
  // POLICY MANAGEMENT
  // ===========================================================================

  /**
   * Check if a policy is enabled
   */
  isPolicyEnabled(packId: string, policyId: string): boolean {
    const installed = packRegistry.getInstalledPack(packId);
    if (!installed) return false;
    return installed.enabledPolicies.includes(policyId);
  }

  /**
   * Enable a policy
   */
  enablePolicy(packId: string, policyId: string): boolean {
    return packRegistry.setPolicyEnabled(packId, policyId, true);
  }

  /**
   * Disable a policy
   */
  disablePolicy(packId: string, policyId: string): boolean {
    return packRegistry.setPolicyEnabled(packId, policyId, false);
  }

  /**
   * Get a threshold value
   */
  getThreshold(packId: string, policyId: string, thresholdId: string): number | undefined {
    const installed = packRegistry.getInstalledPack(packId);
    if (!installed) return undefined;

    const policy = installed.manifest.provides.policies?.find(p => p.id === policyId);
    if (!policy) return undefined;

    const threshold = policy.thresholds?.find(t => t.id === thresholdId);
    return threshold?.currentValue ?? threshold?.defaultValue;
  }

  /**
   * Set a threshold value
   */
  setThreshold(packId: string, policyId: string, thresholdId: string, value: number): boolean {
    return packRegistry.updateThreshold(packId, policyId, thresholdId, value);
  }

  // ===========================================================================
  // VALIDATION
  // ===========================================================================

  /**
   * Validate a configuration value against field rules
   */
  validateField(field: ConfigField, value: any): ValidationResult {
    const errors: string[] = [];

    // Required check
    if (field.required && (value === undefined || value === null || value === '')) {
      errors.push(`${field.label} is required`);
      return { valid: false, errors };
    }

    // Skip further validation if no value and not required
    if (value === undefined || value === null) {
      return { valid: true, errors: [] };
    }

    // Type-specific validation
    switch (field.type) {
      case 'number':
        if (typeof value !== 'number' || isNaN(value)) {
          errors.push(`${field.label} must be a number`);
        } else {
          if (field.validation?.min !== undefined && value < field.validation.min) {
            errors.push(`${field.label} must be at least ${field.validation.min}`);
          }
          if (field.validation?.max !== undefined && value > field.validation.max) {
            errors.push(`${field.label} must be at most ${field.validation.max}`);
          }
        }
        break;

      case 'text':
      case 'textarea':
        if (typeof value !== 'string') {
          errors.push(`${field.label} must be text`);
        } else if (field.validation?.pattern) {
          const regex = new RegExp(field.validation.pattern);
          if (!regex.test(value)) {
            errors.push(field.validation.message || `${field.label} format is invalid`);
          }
        }
        break;

      case 'boolean':
        if (typeof value !== 'boolean') {
          errors.push(`${field.label} must be true or false`);
        }
        break;

      case 'select':
        if (!field.options?.some(opt => opt.value === value)) {
          errors.push(`${field.label} has an invalid selection`);
        }
        break;

      case 'multiselect':
        if (!Array.isArray(value)) {
          errors.push(`${field.label} must be an array`);
        } else {
          const validValues = field.options?.map(opt => opt.value) || [];
          if (!value.every(v => validValues.includes(v))) {
            errors.push(`${field.label} contains invalid selections`);
          }
        }
        break;

      case 'json':
        if (typeof value === 'string') {
          try {
            JSON.parse(value);
          } catch {
            errors.push(`${field.label} must be valid JSON`);
          }
        }
        break;
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  // ===========================================================================
  // EXPORT/IMPORT
  // ===========================================================================

  /**
   * Export pack configuration to JSON
   */
  exportConfig(packId: string): string | undefined {
    const installed = packRegistry.getInstalledPack(packId);
    if (!installed) return undefined;

    const exportData = {
      packId: installed.manifest.id,
      packVersion: installed.manifest.version,
      exportedAt: new Date().toISOString(),
      configuration: installed.configuration,
      enabledPolicies: installed.enabledPolicies,
      disabledPolicies: installed.disabledPolicies
    };

    return JSON.stringify(exportData, null, 2);
  }

  /**
   * Import pack configuration from JSON
   */
  async importConfig(packId: string, configJson: string): Promise<ImportResult> {
    try {
      const importData = JSON.parse(configJson);

      // Validate it's for the right pack
      if (importData.packId !== packId) {
        return {
          success: false,
          error: `Configuration is for pack "${importData.packId}", not "${packId}"`
        };
      }

      // Apply configuration
      const configSuccess = await packRegistry.updateConfiguration(packId, importData.configuration);
      if (!configSuccess) {
        return {
          success: false,
          error: 'Failed to apply configuration'
        };
      }

      // Apply policy states
      for (const policyId of importData.enabledPolicies || []) {
        packRegistry.setPolicyEnabled(packId, policyId, true);
      }
      for (const policyId of importData.disabledPolicies || []) {
        packRegistry.setPolicyEnabled(packId, policyId, false);
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: `Invalid configuration JSON: ${error}`
      };
    }
  }

  /**
   * Reset pack to default configuration
   */
  async resetToDefaults(packId: string): Promise<boolean> {
    const installed = packRegistry.getInstalledPack(packId);
    if (!installed) return false;

    // Build default config
    const defaultConfig: Record<string, any> = {};
    for (const section of installed.manifest.configuration.sections) {
      for (const field of section.fields) {
        defaultConfig[field.id] = field.defaultValue;
      }
    }

    // Apply default config
    const success = await packRegistry.updateConfiguration(packId, defaultConfig);
    if (!success) return false;

    // Reset policy states
    const policies = installed.manifest.provides.policies || [];
    for (const policy of policies) {
      packRegistry.setPolicyEnabled(packId, policy.id, policy.enabledByDefault);
    }

    return true;
  }
}

// =============================================================================
// TYPES
// =============================================================================

export interface ConfigFormData {
  packId: string;
  packName: string;
  sections: {
    id: string;
    title: string;
    description?: string;
    fields: (ConfigField & { currentValue: any })[];
  }[];
}

export interface PolicyConfigData {
  packId: string;
  packName: string;
  policies: {
    id: string;
    name: string;
    description: string;
    classification: string;
    enabled: boolean;
    canDisable: boolean;
    thresholds?: (ThresholdConfig & { currentValue: number })[];
  }[];
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export interface ImportResult {
  success: boolean;
  error?: string;
}

// =============================================================================
// SINGLETON EXPORT
// =============================================================================

export const packConfigService = PackConfigService.getInstance();
export default packConfigService;
