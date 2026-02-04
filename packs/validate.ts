/**
 * Pack Manifest Validation
 *
 * Runtime validation for pack manifests using Zod schemas.
 * Provides human-readable error messages for invalid manifests.
 */

import { z } from 'zod';
import { PackType, PackCategory, PackManifest } from './types';

// =============================================================================
// ZOD SCHEMAS
// =============================================================================

/**
 * Threshold configuration schema
 */
const ThresholdConfigSchema = z.object({
  id: z.string().min(1, 'Threshold ID is required'),
  name: z.string().min(1, 'Threshold name is required'),
  description: z.string(),
  type: z.enum(['number', 'percentage', 'duration', 'count']),
  defaultValue: z.number(),
  min: z.number().optional(),
  max: z.number().optional(),
  currentValue: z.number().optional()
}).refine(
  (data) => {
    if (data.min !== undefined && data.max !== undefined) {
      return data.min <= data.max;
    }
    return true;
  },
  { message: 'Threshold min must be less than or equal to max' }
).refine(
  (data) => {
    if (data.min !== undefined && data.defaultValue < data.min) return false;
    if (data.max !== undefined && data.defaultValue > data.max) return false;
    return true;
  },
  { message: 'Threshold default value must be within min/max range' }
);

/**
 * Policy trigger schema
 */
const PolicyTriggerSchema = z.object({
  type: z.enum(['action', 'data_pattern', 'threshold', 'schedule', 'event']),
  config: z.record(z.any())
});

/**
 * Policy action schema
 */
const PolicyActionSchema = z.object({
  type: z.enum(['block', 'require_approval', 'log', 'alert', 'redact', 'escalate']),
  config: z.record(z.any()).optional()
});

/**
 * Policy definition schema
 */
const PolicyDefinitionSchema = z.object({
  id: z.string().min(1, 'Policy ID is required'),
  name: z.string().min(1, 'Policy name is required'),
  description: z.string().min(10, 'Policy description must be at least 10 characters'),
  classification: z.enum(['MANDATORY', 'ADVISORY', 'INFORMATIONAL']),
  triggers: z.array(PolicyTriggerSchema).min(1, 'At least one trigger is required'),
  actions: z.array(PolicyActionSchema).min(1, 'At least one action is required'),
  enabledByDefault: z.boolean(),
  canDisable: z.boolean(),
  thresholds: z.array(ThresholdConfigSchema).optional()
}).refine(
  (data) => {
    // Mandatory policies should not be disableable
    if (data.classification === 'MANDATORY' && data.canDisable) {
      return false;
    }
    return true;
  },
  { message: 'MANDATORY policies cannot have canDisable: true' }
);

/**
 * Workflow definition schema
 */
const WorkflowDefinitionSchema = z.object({
  id: z.string().min(1, 'Workflow ID is required'),
  name: z.string().min(1, 'Workflow name is required'),
  description: z.string(),
  entryPoint: z.string().min(1, 'Workflow entry point is required'),
  requiredPermissions: z.array(z.string()),
  inputSchema: z.record(z.any()).optional(),
  outputSchema: z.record(z.any()).optional()
});

/**
 * Component definition schema
 */
const ComponentDefinitionSchema = z.object({
  id: z.string().min(1, 'Component ID is required'),
  name: z.string().min(1, 'Component name is required'),
  location: z.enum(['dashboard', 'sidebar', 'settings', 'standalone']),
  component: z.string().min(1, 'Component file path is required'),
  icon: z.string().optional(),
  requiredPermissions: z.array(z.string()).optional(),
  route: z.string().optional()
}).refine(
  (data) => {
    // Standalone components must have a route
    if (data.location === 'standalone' && !data.route) {
      return false;
    }
    return true;
  },
  { message: 'Standalone components must specify a route' }
);

/**
 * Endpoint definition schema
 */
const EndpointDefinitionSchema = z.object({
  method: z.enum(['GET', 'POST', 'PUT', 'DELETE', 'PATCH']),
  path: z.string().startsWith('/', 'Endpoint path must start with /'),
  handler: z.string().min(1, 'Handler file is required'),
  requiredPermissions: z.array(z.string()).optional()
});

/**
 * Job definition schema
 */
const JobDefinitionSchema = z.object({
  id: z.string().min(1, 'Job ID is required'),
  name: z.string().min(1, 'Job name is required'),
  schedule: z.string().min(1, 'Cron schedule is required'),
  handler: z.string().min(1, 'Handler file is required'),
  enabledByDefault: z.boolean()
});

/**
 * Report definition schema
 */
const ReportDefinitionSchema = z.object({
  id: z.string().min(1, 'Report ID is required'),
  name: z.string().min(1, 'Report name is required'),
  description: z.string(),
  template: z.string().min(1, 'Template file is required'),
  formats: z.array(z.enum(['pdf', 'html', 'json', 'csv'])).min(1, 'At least one format is required')
});

/**
 * Evidence template definition schema
 */
const EvidenceTemplateDefinitionSchema = z.object({
  id: z.string().min(1, 'Evidence template ID is required'),
  name: z.string().min(1, 'Evidence template name is required'),
  description: z.string(),
  schema: z.string().min(1, 'Schema file is required')
});

/**
 * Pack provides schema
 */
const PackProvidesSchema = z.object({
  policies: z.array(PolicyDefinitionSchema).optional(),
  workflows: z.array(WorkflowDefinitionSchema).optional(),
  components: z.array(ComponentDefinitionSchema).optional(),
  endpoints: z.array(EndpointDefinitionSchema).optional(),
  jobs: z.array(JobDefinitionSchema).optional(),
  reports: z.array(ReportDefinitionSchema).optional(),
  evidenceTemplates: z.array(EvidenceTemplateDefinitionSchema).optional()
}).refine(
  (data) => {
    // Pack must provide at least something
    const hasContent =
      (data.policies?.length || 0) > 0 ||
      (data.workflows?.length || 0) > 0 ||
      (data.components?.length || 0) > 0 ||
      (data.endpoints?.length || 0) > 0 ||
      (data.jobs?.length || 0) > 0 ||
      (data.reports?.length || 0) > 0 ||
      (data.evidenceTemplates?.length || 0) > 0;
    return hasContent;
  },
  { message: 'Pack must provide at least one policy, workflow, component, endpoint, job, report, or evidence template' }
);

/**
 * Control mapping schema
 */
const ControlMappingSchema = z.object({
  controlId: z.string().min(1, 'Control ID is required'),
  controlName: z.string().min(1, 'Control name is required'),
  implementation: z.string().min(10, 'Implementation description must be at least 10 characters'),
  evidence: z.array(z.string()).optional()
});

/**
 * Compliance mapping schema
 */
const ComplianceMappingSchema = z.object({
  framework: z.string().min(1, 'Framework name is required'),
  version: z.string().optional(),
  controls: z.array(ControlMappingSchema).min(1, 'At least one control mapping is required')
});

/**
 * Configuration field schema
 */
const ConfigFieldSchema = z.object({
  id: z.string().min(1, 'Field ID is required'),
  label: z.string().min(1, 'Field label is required'),
  description: z.string().optional(),
  type: z.enum(['text', 'number', 'boolean', 'select', 'multiselect', 'textarea', 'json']),
  defaultValue: z.any(),
  currentValue: z.any().optional(),
  required: z.boolean().optional(),
  validation: z.object({
    min: z.number().optional(),
    max: z.number().optional(),
    pattern: z.string().optional(),
    message: z.string().optional()
  }).optional(),
  options: z.array(z.object({
    value: z.any(),
    label: z.string()
  })).optional(),
  showWhen: z.object({
    field: z.string(),
    equals: z.any()
  }).optional()
}).refine(
  (data) => {
    // Select/multiselect must have options
    if ((data.type === 'select' || data.type === 'multiselect') && (!data.options || data.options.length === 0)) {
      return false;
    }
    return true;
  },
  { message: 'Select and multiselect fields must have options defined' }
);

/**
 * Configuration section schema
 */
const ConfigSectionSchema = z.object({
  id: z.string().min(1, 'Section ID is required'),
  title: z.string().min(1, 'Section title is required'),
  description: z.string().optional(),
  fields: z.array(ConfigFieldSchema)
});

/**
 * Pack configuration schema
 */
const PackConfigurationSchema = z.object({
  sections: z.array(ConfigSectionSchema)
});

/**
 * Pack dependency schema
 */
const PackDependencySchema = z.object({
  packId: z.string().min(1, 'Dependency pack ID is required'),
  version: z.string().min(1, 'Dependency version is required'),
  required: z.boolean()
});

/**
 * Pack hooks schema
 */
const PackHooksSchema = z.object({
  preInstall: z.string().optional(),
  postInstall: z.string().optional(),
  preUninstall: z.string().optional(),
  postUninstall: z.string().optional(),
  onConfigChange: z.string().optional(),
  onUpgrade: z.string().optional()
});

/**
 * Semver version pattern
 */
const semverPattern = /^\d+\.\d+\.\d+(-[a-zA-Z0-9]+(\.[a-zA-Z0-9]+)*)?$/;

/**
 * Complete Pack Manifest Schema
 */
export const PackManifestSchema = z.object({
  id: z.string()
    .min(1, 'Pack ID is required')
    .regex(/^[a-z][a-z0-9-]*$/, 'Pack ID must be lowercase, start with a letter, and contain only letters, numbers, and hyphens'),

  name: z.string()
    .min(3, 'Pack name must be at least 3 characters')
    .max(100, 'Pack name must be at most 100 characters'),

  type: z.nativeEnum(PackType),
  category: z.nativeEnum(PackCategory),

  version: z.string()
    .regex(semverPattern, 'Version must be valid semver (e.g., 1.0.0, 2.1.0-beta)'),

  description: z.string()
    .min(20, 'Description must be at least 20 characters')
    .max(500, 'Description must be at most 500 characters'),

  longDescription: z.string().optional(),

  author: z.object({
    name: z.string().min(1, 'Author name is required'),
    email: z.string().email('Invalid author email').optional(),
    url: z.string().url('Invalid author URL').optional()
  }),

  license: z.enum(['proprietary', 'perpetual', 'subscription']),

  pricing: z.object({
    type: z.enum(['free', 'paid', 'contact']),
    perpetual: z.number().positive().optional(),
    annual: z.number().positive().optional()
  }).optional(),

  compatibility: z.object({
    platformVersion: z.string().regex(semverPattern, 'Platform version must be valid semver'),
    maxPlatformVersion: z.string().regex(semverPattern, 'Max platform version must be valid semver').optional()
  }),

  dependencies: z.array(PackDependencySchema).optional(),
  conflicts: z.array(z.string()).optional(),

  provides: PackProvidesSchema,
  compliance: z.array(ComplianceMappingSchema).optional(),
  configuration: PackConfigurationSchema,
  hooks: PackHooksSchema.optional(),

  documentation: z.object({
    readme: z.string().optional(),
    quickStart: z.string().optional(),
    configuration: z.string().optional(),
    api: z.string().optional()
  }).optional(),

  tags: z.array(z.string()).optional(),
  icon: z.string().optional()
});

// =============================================================================
// VALIDATION FUNCTIONS
// =============================================================================

export interface ValidationError {
  path: string;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  manifest?: PackManifest;
}

/**
 * Validate a pack manifest
 */
export function validateManifest(manifest: unknown): ValidationResult {
  try {
    const result = PackManifestSchema.safeParse(manifest);

    if (result.success) {
      return {
        valid: true,
        errors: [],
        manifest: result.data as PackManifest
      };
    }

    // Convert Zod errors to human-readable format
    const errors: ValidationError[] = result.error.errors.map(err => ({
      path: err.path.join('.') || 'root',
      message: err.message
    }));

    return {
      valid: false,
      errors
    };
  } catch (error) {
    return {
      valid: false,
      errors: [{
        path: 'root',
        message: `Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      }]
    };
  }
}

/**
 * Format validation errors for display
 */
export function formatValidationErrors(errors: ValidationError[]): string {
  if (errors.length === 0) return 'No errors';

  const lines = ['Pack manifest validation failed:', ''];

  for (const error of errors) {
    lines.push(`  • ${error.path}: ${error.message}`);
  }

  return lines.join('\n');
}

/**
 * Validate manifest from JSON string
 */
export function validateManifestJson(json: string): ValidationResult {
  try {
    const parsed = JSON.parse(json);
    return validateManifest(parsed);
  } catch (error) {
    return {
      valid: false,
      errors: [{
        path: 'json',
        message: `Invalid JSON: ${error instanceof Error ? error.message : 'Parse error'}`
      }]
    };
  }
}

/**
 * Check if a manifest has all required policies for a compliance framework
 */
export function validateComplianceCoverage(
  manifest: PackManifest,
  framework: string,
  requiredControls: string[]
): { complete: boolean; missing: string[] } {
  const compliance = manifest.compliance?.find(c =>
    c.framework.toLowerCase() === framework.toLowerCase()
  );

  if (!compliance) {
    return {
      complete: false,
      missing: requiredControls
    };
  }

  const coveredControls = new Set(compliance.controls.map(c => c.controlId));
  const missing = requiredControls.filter(c => !coveredControls.has(c));

  return {
    complete: missing.length === 0,
    missing
  };
}

// =============================================================================
// AUDIT EVENT TYPES FOR PACK OPERATIONS
// =============================================================================

export const PACK_AUDIT_EVENTS = {
  PACK_INSTALL: 'pack.install',
  PACK_UNINSTALL: 'pack.uninstall',
  PACK_VERIFY: 'pack.verify',
  PACK_CONFIG_UPDATED: 'pack.config.updated',
  PACK_POLICY_TOGGLED: 'pack.policy.toggled',
  PACK_THRESHOLD_UPDATED: 'pack.threshold.updated',
  PACK_VALIDATION_FAILED: 'pack.validation.failed'
} as const;

export type PackAuditEvent = typeof PACK_AUDIT_EVENTS[keyof typeof PACK_AUDIT_EVENTS];
