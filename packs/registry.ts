/**
 * ACE Pack Registry
 *
 * Manages the catalog of available packs and their installation state.
 * Handles pack discovery, installation, updates, and removal.
 */

import {
  PackManifest,
  PackType,
  PackCategory,
  PackStatus,
  InstalledPack,
  PackRegistryEntry,
  PackDependency
} from './types';

// =============================================================================
// REGISTRY STORAGE (In-memory for now, DB in production)
// =============================================================================

/** Available packs in the registry */
const availablePacks = new Map<string, PackRegistryEntry>();

/** Installed packs */
const installedPacks = new Map<string, InstalledPack>();

// =============================================================================
// PACK REGISTRY CLASS
// =============================================================================

export class PackRegistry {
  private static instance: PackRegistry;

  private constructor() {
    // Load built-in packs
    this.loadBuiltInPacks();
  }

  static getInstance(): PackRegistry {
    if (!PackRegistry.instance) {
      PackRegistry.instance = new PackRegistry();
    }
    return PackRegistry.instance;
  }

  // ===========================================================================
  // DISCOVERY
  // ===========================================================================

  /**
   * Get all available packs
   */
  getAvailablePacks(): PackRegistryEntry[] {
    return Array.from(availablePacks.values());
  }

  /**
   * Get available packs by type
   */
  getPacksByType(type: PackType): PackRegistryEntry[] {
    return this.getAvailablePacks().filter(p => p.manifest.type === type);
  }

  /**
   * Get available packs by category
   */
  getPacksByCategory(category: PackCategory): PackRegistryEntry[] {
    return this.getAvailablePacks().filter(p => p.manifest.category === category);
  }

  /**
   * Search packs by query
   */
  searchPacks(query: string): PackRegistryEntry[] {
    const q = query.toLowerCase();
    return this.getAvailablePacks().filter(p =>
      p.manifest.name.toLowerCase().includes(q) ||
      p.manifest.description.toLowerCase().includes(q) ||
      p.manifest.tags?.some(t => t.toLowerCase().includes(q))
    );
  }

  /**
   * Get a specific pack by ID
   */
  getPack(packId: string): PackRegistryEntry | undefined {
    return availablePacks.get(packId);
  }

  // ===========================================================================
  // INSTALLATION
  // ===========================================================================

  /**
   * Get all installed packs
   */
  getInstalledPacks(): InstalledPack[] {
    return Array.from(installedPacks.values());
  }

  /**
   * Get installed pack by ID
   */
  getInstalledPack(packId: string): InstalledPack | undefined {
    return installedPacks.get(packId);
  }

  /**
   * Check if a pack is installed
   */
  isInstalled(packId: string): boolean {
    return installedPacks.has(packId);
  }

  /**
   * Install a pack
   */
  async installPack(
    packId: string,
    installedBy: string,
    configuration?: Record<string, any>
  ): Promise<InstallResult> {
    const entry = availablePacks.get(packId);
    if (!entry) {
      return {
        success: false,
        error: `Pack not found: ${packId}`
      };
    }

    // Check if already installed
    if (installedPacks.has(packId)) {
      return {
        success: false,
        error: `Pack already installed: ${packId}`
      };
    }

    // Check dependencies
    const depCheck = await this.checkDependencies(entry.manifest);
    if (!depCheck.satisfied) {
      return {
        success: false,
        error: `Missing dependencies: ${depCheck.missing.join(', ')}`
      };
    }

    // Check conflicts
    const conflictCheck = this.checkConflicts(entry.manifest);
    if (conflictCheck.hasConflicts) {
      return {
        success: false,
        error: `Conflicts with installed packs: ${conflictCheck.conflicts.join(', ')}`
      };
    }

    // Run pre-install hook
    if (entry.manifest.hooks?.preInstall) {
      try {
        await this.runHook(entry.manifest.hooks.preInstall, entry.manifest);
      } catch (error) {
        return {
          success: false,
          error: `Pre-install hook failed: ${error}`
        };
      }
    }

    // Build default configuration
    const defaultConfig = this.buildDefaultConfiguration(entry.manifest);
    const finalConfig = { ...defaultConfig, ...configuration };

    // Create installed pack record
    const installed: InstalledPack = {
      manifest: entry.manifest,
      status: PackStatus.INSTALLED,
      installedAt: new Date(),
      installedBy,
      configuration: finalConfig,
      enabledPolicies: entry.manifest.provides.policies
        ?.filter(p => p.enabledByDefault)
        .map(p => p.id) || [],
      disabledPolicies: entry.manifest.provides.policies
        ?.filter(p => !p.enabledByDefault)
        .map(p => p.id) || [],
      metrics: {
        lastActivity: new Date(),
        policyExecutions: 0,
        workflowExecutions: 0,
        errorsLast24h: 0
      }
    };

    installedPacks.set(packId, installed);

    // Run post-install hook
    if (entry.manifest.hooks?.postInstall) {
      try {
        await this.runHook(entry.manifest.hooks.postInstall, entry.manifest);
      } catch (error) {
        console.warn(`Post-install hook warning: ${error}`);
      }
    }

    console.log(`[PackRegistry] Installed pack: ${packId} v${entry.manifest.version}`);

    return {
      success: true,
      pack: installed
    };
  }

  /**
   * Uninstall a pack
   */
  async uninstallPack(packId: string): Promise<UninstallResult> {
    const installed = installedPacks.get(packId);
    if (!installed) {
      return {
        success: false,
        error: `Pack not installed: ${packId}`
      };
    }

    // Check if other packs depend on this one
    const dependents = this.findDependentPacks(packId);
    if (dependents.length > 0) {
      return {
        success: false,
        error: `Cannot uninstall: other packs depend on this: ${dependents.join(', ')}`
      };
    }

    // Run pre-uninstall hook
    if (installed.manifest.hooks?.preUninstall) {
      try {
        await this.runHook(installed.manifest.hooks.preUninstall, installed.manifest);
      } catch (error) {
        return {
          success: false,
          error: `Pre-uninstall hook failed: ${error}`
        };
      }
    }

    installedPacks.delete(packId);

    // Run post-uninstall hook
    if (installed.manifest.hooks?.postUninstall) {
      try {
        await this.runHook(installed.manifest.hooks.postUninstall, installed.manifest);
      } catch (error) {
        console.warn(`Post-uninstall hook warning: ${error}`);
      }
    }

    console.log(`[PackRegistry] Uninstalled pack: ${packId}`);

    return { success: true };
  }

  /**
   * Enable/disable a pack
   */
  setPackEnabled(packId: string, enabled: boolean): boolean {
    const installed = installedPacks.get(packId);
    if (!installed) return false;

    installed.status = enabled ? PackStatus.INSTALLED : PackStatus.DISABLED;
    installed.updatedAt = new Date();
    return true;
  }

  // ===========================================================================
  // CONFIGURATION
  // ===========================================================================

  /**
   * Update pack configuration
   */
  async updateConfiguration(
    packId: string,
    configuration: Record<string, any>
  ): Promise<boolean> {
    const installed = installedPacks.get(packId);
    if (!installed) return false;

    // Validate configuration
    const validation = this.validateConfiguration(installed.manifest, configuration);
    if (!validation.valid) {
      console.error(`[PackRegistry] Invalid configuration:`, validation.errors);
      return false;
    }

    installed.configuration = { ...installed.configuration, ...configuration };
    installed.updatedAt = new Date();

    // Run config change hook
    if (installed.manifest.hooks?.onConfigChange) {
      try {
        await this.runHook(installed.manifest.hooks.onConfigChange, installed.manifest);
      } catch (error) {
        console.warn(`Config change hook warning: ${error}`);
      }
    }

    return true;
  }

  /**
   * Enable/disable a policy within a pack
   */
  setPolicyEnabled(packId: string, policyId: string, enabled: boolean): boolean {
    const installed = installedPacks.get(packId);
    if (!installed) return false;

    // Check if policy exists and can be disabled
    const policy = installed.manifest.provides.policies?.find(p => p.id === policyId);
    if (!policy) return false;
    if (!enabled && !policy.canDisable) return false;

    if (enabled) {
      installed.disabledPolicies = installed.disabledPolicies.filter(id => id !== policyId);
      if (!installed.enabledPolicies.includes(policyId)) {
        installed.enabledPolicies.push(policyId);
      }
    } else {
      installed.enabledPolicies = installed.enabledPolicies.filter(id => id !== policyId);
      if (!installed.disabledPolicies.includes(policyId)) {
        installed.disabledPolicies.push(policyId);
      }
    }

    installed.updatedAt = new Date();
    return true;
  }

  /**
   * Update a threshold value
   */
  updateThreshold(packId: string, policyId: string, thresholdId: string, value: number): boolean {
    const installed = installedPacks.get(packId);
    if (!installed) return false;

    const policy = installed.manifest.provides.policies?.find(p => p.id === policyId);
    if (!policy) return false;

    const threshold = policy.thresholds?.find(t => t.id === thresholdId);
    if (!threshold) return false;

    // Validate range
    if (threshold.min !== undefined && value < threshold.min) return false;
    if (threshold.max !== undefined && value > threshold.max) return false;

    threshold.currentValue = value;
    installed.updatedAt = new Date();
    return true;
  }

  // ===========================================================================
  // HELPERS
  // ===========================================================================

  private async checkDependencies(manifest: PackManifest): Promise<{
    satisfied: boolean;
    missing: string[];
  }> {
    const missing: string[] = [];

    for (const dep of manifest.dependencies || []) {
      if (dep.required && !installedPacks.has(dep.packId)) {
        missing.push(dep.packId);
      }
    }

    return {
      satisfied: missing.length === 0,
      missing
    };
  }

  private checkConflicts(manifest: PackManifest): {
    hasConflicts: boolean;
    conflicts: string[];
  } {
    const conflicts: string[] = [];

    for (const conflictId of manifest.conflicts || []) {
      if (installedPacks.has(conflictId)) {
        conflicts.push(conflictId);
      }
    }

    return {
      hasConflicts: conflicts.length > 0,
      conflicts
    };
  }

  private findDependentPacks(packId: string): string[] {
    const dependents: string[] = [];

    for (const [id, installed] of installedPacks) {
      const deps = installed.manifest.dependencies || [];
      if (deps.some(d => d.packId === packId && d.required)) {
        dependents.push(id);
      }
    }

    return dependents;
  }

  private buildDefaultConfiguration(manifest: PackManifest): Record<string, any> {
    const config: Record<string, any> = {};

    for (const section of manifest.configuration.sections) {
      for (const field of section.fields) {
        config[field.id] = field.defaultValue;
      }
    }

    return config;
  }

  private validateConfiguration(
    manifest: PackManifest,
    config: Record<string, any>
  ): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    for (const section of manifest.configuration.sections) {
      for (const field of section.fields) {
        const value = config[field.id];

        // Check required
        if (field.required && (value === undefined || value === null || value === '')) {
          errors.push(`${field.label} is required`);
          continue;
        }

        // Check validation rules
        if (field.validation && value !== undefined) {
          if (field.validation.min !== undefined && value < field.validation.min) {
            errors.push(`${field.label} must be at least ${field.validation.min}`);
          }
          if (field.validation.max !== undefined && value > field.validation.max) {
            errors.push(`${field.label} must be at most ${field.validation.max}`);
          }
          if (field.validation.pattern) {
            const regex = new RegExp(field.validation.pattern);
            if (!regex.test(String(value))) {
              errors.push(field.validation.message || `${field.label} format is invalid`);
            }
          }
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  private async runHook(hookPath: string, manifest: PackManifest): Promise<void> {
    // In production, this would dynamically import and run the hook
    console.log(`[PackRegistry] Running hook: ${hookPath} for pack ${manifest.id}`);
  }

  // ===========================================================================
  // BUILT-IN PACKS
  // ===========================================================================

  private loadBuiltInPacks(): void {
    // Register built-in packs (we'll add the actual manifests)
    // This is called on initialization
    console.log('[PackRegistry] Loading built-in packs...');
  }

  /**
   * Register a pack in the registry
   */
  registerPack(manifest: PackManifest, builtIn: boolean = false): void {
    const entry: PackRegistryEntry = {
      id: manifest.id,
      latestVersion: manifest.version,
      versions: [manifest.version],
      manifest,
      builtIn,
      installCount: 0
    };

    availablePacks.set(manifest.id, entry);
    console.log(`[PackRegistry] Registered pack: ${manifest.id} v${manifest.version}`);
  }
}

// =============================================================================
// RESULT TYPES
// =============================================================================

export interface InstallResult {
  success: boolean;
  error?: string;
  pack?: InstalledPack;
}

export interface UninstallResult {
  success: boolean;
  error?: string;
}

// =============================================================================
// SINGLETON EXPORT
// =============================================================================

export const packRegistry = PackRegistry.getInstance();
export default packRegistry;
