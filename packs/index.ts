/**
 * ACE Pack System
 *
 * Exports all pack-related modules for the governance pack system.
 *
 * Usage:
 *   import { packRegistry, packConfigService, PackType } from './packs';
 */

// =============================================================================
// TYPE EXPORTS
// =============================================================================

export {
  // Enums
  PackType,
  PackCategory,
  PackStatus,

  // Core interfaces
  PackManifest,
  PackDependency,
  PackProvides,

  // Policy types
  PolicyDefinition,
  PolicyTrigger,
  PolicyAction,
  ThresholdConfig,

  // Workflow types
  WorkflowDefinition,

  // Component types
  ComponentDefinition,

  // Other definition types
  EndpointDefinition,
  JobDefinition,
  ReportDefinition,
  EvidenceTemplateDefinition,

  // Compliance types
  ComplianceMapping,
  ControlMapping,

  // Configuration types
  PackConfiguration,
  ConfigSection,
  ConfigField,

  // Hook types
  PackHooks,

  // State types
  InstalledPack,
  PackRegistryEntry
} from './types';

// =============================================================================
// SERVICE EXPORTS
// =============================================================================

export {
  PackRegistry,
  packRegistry,
  InstallResult,
  UninstallResult
} from './registry';

export {
  PackConfigService,
  packConfigService,
  ConfigFormData,
  PolicyConfigData,
  ValidationResult,
  ImportResult
} from './configService';

// =============================================================================
// VALIDATION EXPORTS
// =============================================================================

export {
  PackManifestSchema,
  validateManifest,
  validateManifestJson,
  validateComplianceCoverage,
  formatValidationErrors,
  PACK_AUDIT_EVENTS,
  type ValidationError,
  type ValidationResult as ManifestValidationResult,
  type PackAuditEvent
} from './validate';

// =============================================================================
// EVIDENCE BUNDLE EXPORTS
// =============================================================================

export {
  EvidenceBundleService,
  evidenceBundleService,
  generateEvidenceBundle,
  exportEvidenceBundleJson,
  generateComplianceSummary,
  type EvidenceBundle,
  type EvidenceBundleOptions,
  type BundleMetadata,
  type ConfigurationEvidence,
  type PolicyEvidence,
  type ComplianceEvidence,
  type AuditEvidence,
  type IntegrityEvidence
} from './evidenceBundle';

// =============================================================================
// BUILT-IN PACK MANIFESTS
// =============================================================================

// Governance Packs (Full industry solutions)
export { federalBDManifest } from './governance/federal-bd/manifest';

// Instruction Packs (Focused policy modules)
export { ecvProtocolManifest } from './instruction/ecv-protocol/manifest';
export { maiFrameworkManifest } from './instruction/mai-framework/manifest';
export { auditDefenseManifest } from './instruction/audit-defense/manifest';

// =============================================================================
// RUNTIME ENFORCEMENT EXPORTS
// =============================================================================

export {
  // Core enforcement
  PackPolicyEnforcer,
  policyEnforcer,
  isActionAllowed,
  enforceOrThrow,
  type EnforcementContext,
  type EnforcementResult,
  type PolicyEvaluationResult,
  type EnforcementAuditRecord,

  // Federal BD Pack integration
  BD_ACTIONS,
  enforceDataSource,
  enforceWinProbabilityReview,
  enforceBidDecisionApproval,
  enforceHighValueEscalation,
  logCompetitorAnalysis,
  enforceTeamingReview,
  checkDeadlineWarning,
  enforceOpportunityAnalysis,
  demoEnforcement
} from './runtime';

// =============================================================================
// PACK INITIALIZATION
// =============================================================================

/**
 * Initialize the pack system with built-in packs
 */
export function initializePackSystem(): void {
  console.log('[PackSystem] Initializing...');

  // Import and register built-in packs
  const { federalBDManifest } = require('./governance/federal-bd/manifest');

  // Register Federal BD Pack
  packRegistry.registerPack(federalBDManifest, true);

  console.log('[PackSystem] Initialization complete');
}

// =============================================================================
// CONVENIENCE FUNCTIONS
// =============================================================================

/**
 * Get all installed governance packs
 */
export function getInstalledGovernancePacks() {
  return packRegistry.getInstalledPacks()
    .filter(p => p.manifest.type === PackType.GOVERNANCE);
}

/**
 * Get all installed instruction packs
 */
export function getInstalledInstructionPacks() {
  return packRegistry.getInstalledPacks()
    .filter(p => p.manifest.type === PackType.INSTRUCTION);
}

/**
 * Get packs by compliance framework
 */
export function getPacksByFramework(framework: string) {
  return packRegistry.getAvailablePacks()
    .filter(p => p.manifest.compliance?.some(c =>
      c.framework.toLowerCase().includes(framework.toLowerCase())
    ));
}

/**
 * Get all enabled policies across installed packs
 */
export function getAllEnabledPolicies() {
  const policies: Array<{
    packId: string;
    packName: string;
    policy: PolicyDefinition;
  }> = [];

  for (const installed of packRegistry.getInstalledPacks()) {
    if (installed.status !== PackStatus.INSTALLED) continue;

    for (const policyId of installed.enabledPolicies) {
      const policy = installed.manifest.provides.policies?.find(p => p.id === policyId);
      if (policy) {
        policies.push({
          packId: installed.manifest.id,
          packName: installed.manifest.name,
          policy
        });
      }
    }
  }

  return policies;
}

/**
 * Check if any mandatory policy would block an action
 */
export function checkMandatoryPolicies(actionType: string, context: Record<string, any>): {
  blocked: boolean;
  blockingPolicies: Array<{ packId: string; policyId: string; reason: string }>;
} {
  const blockingPolicies: Array<{ packId: string; policyId: string; reason: string }> = [];

  const enabledPolicies = getAllEnabledPolicies();

  for (const { packId, policy } of enabledPolicies) {
    if (policy.classification !== 'MANDATORY') continue;

    // Check if this policy's triggers match the action
    for (const trigger of policy.triggers) {
      if (trigger.type === 'action' && trigger.config.actions?.includes(actionType)) {
        // Check if the policy would block
        const blockAction = policy.actions.find(a => a.type === 'block');
        if (blockAction) {
          blockingPolicies.push({
            packId,
            policyId: policy.id,
            reason: policy.description
          });
        }
      }
    }
  }

  return {
    blocked: blockingPolicies.length > 0,
    blockingPolicies
  };
}

// =============================================================================
// PACK TYPE IMPORTS (for dynamic loading)
// =============================================================================

import { PackType, PackStatus, PolicyDefinition } from './types';
import { packRegistry } from './registry';
