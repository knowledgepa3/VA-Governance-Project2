/**
 * ACE Governance Pack System - Type Definitions
 *
 * Defines the schema for governance packs, instruction packs,
 * and the pack management system.
 *
 * Pack Types:
 * - Governance Pack: Full industry-specific workflow + policies
 * - Instruction Pack: Focused policy module (add-on)
 */

// =============================================================================
// PACK IDENTIFICATION
// =============================================================================

/**
 * Pack type classification
 */
export enum PackType {
  /** Full governance pack with workflows, policies, UI components */
  GOVERNANCE = 'governance',

  /** Focused policy module that augments governance packs */
  INSTRUCTION = 'instruction'
}

/**
 * Pack category for organization
 */
export enum PackCategory {
  FEDERAL = 'federal',
  HEALTHCARE = 'healthcare',
  FINANCIAL = 'financial',
  LEGAL = 'legal',
  SECURITY = 'security',
  HR = 'hr',
  GENERAL = 'general'
}

/**
 * Pack status in the registry
 */
export enum PackStatus {
  /** Available for installation */
  AVAILABLE = 'available',

  /** Currently installed and active */
  INSTALLED = 'installed',

  /** Installed but disabled */
  DISABLED = 'disabled',

  /** Update available */
  UPDATE_AVAILABLE = 'update_available',

  /** Not compatible with current platform version */
  INCOMPATIBLE = 'incompatible'
}

// =============================================================================
// PACK MANIFEST
// =============================================================================

/**
 * Pack manifest - the definition file for a pack
 */
export interface PackManifest {
  /** Unique pack identifier (e.g., "federal-bd", "pii-shield") */
  id: string;

  /** Human-readable name */
  name: string;

  /** Pack type */
  type: PackType;

  /** Category for organization */
  category: PackCategory;

  /** Semantic version (e.g., "1.0.0") */
  version: string;

  /** Short description (1-2 sentences) */
  description: string;

  /** Long description with features */
  longDescription?: string;

  /** Author/vendor */
  author: {
    name: string;
    email?: string;
    url?: string;
  };

  /** License type */
  license: 'proprietary' | 'perpetual' | 'subscription';

  /** Pricing info (for display) */
  pricing?: {
    type: 'free' | 'paid' | 'contact';
    perpetual?: number;
    annual?: number;
  };

  /** Platform compatibility */
  compatibility: {
    /** Minimum platform version required */
    platformVersion: string;

    /** Maximum platform version (optional) */
    maxPlatformVersion?: string;
  };

  /** Dependencies on other packs */
  dependencies?: PackDependency[];

  /** Packs that conflict with this one */
  conflicts?: string[];

  /** What the pack provides */
  provides: PackProvides;

  /** Compliance frameworks this pack supports */
  compliance?: ComplianceMapping[];

  /** Configuration schema */
  configuration: PackConfiguration;

  /** Installation hooks */
  hooks?: PackHooks;

  /** Documentation links */
  documentation?: {
    readme?: string;
    quickStart?: string;
    configuration?: string;
    api?: string;
  };

  /** Tags for search */
  tags?: string[];

  /** Icon (base64 or URL) */
  icon?: string;
}

/**
 * Dependency on another pack
 */
export interface PackDependency {
  /** Pack ID */
  packId: string;

  /** Version requirement (semver range) */
  version: string;

  /** Is this required or optional? */
  required: boolean;
}

/**
 * What the pack provides when installed
 */
export interface PackProvides {
  /** MAI policies defined by this pack */
  policies?: PolicyDefinition[];

  /** Workflows provided */
  workflows?: WorkflowDefinition[];

  /** UI components/pages */
  components?: ComponentDefinition[];

  /** API endpoints */
  endpoints?: EndpointDefinition[];

  /** Scheduled jobs */
  jobs?: JobDefinition[];

  /** Report templates */
  reports?: ReportDefinition[];

  /** Evidence pack templates */
  evidenceTemplates?: EvidenceTemplateDefinition[];
}

// =============================================================================
// POLICY DEFINITIONS
// =============================================================================

/**
 * MAI Policy definition within a pack
 */
export interface PolicyDefinition {
  /** Unique policy ID within pack */
  id: string;

  /** Human-readable name */
  name: string;

  /** Description */
  description: string;

  /** MAI classification */
  classification: 'MANDATORY' | 'ADVISORY' | 'INFORMATIONAL';

  /** What triggers this policy */
  triggers: PolicyTrigger[];

  /** Actions when policy is triggered */
  actions: PolicyAction[];

  /** Is this policy enabled by default? */
  enabledByDefault: boolean;

  /** Can user disable this policy? */
  canDisable: boolean;

  /** Configurable thresholds */
  thresholds?: ThresholdConfig[];
}

export interface PolicyTrigger {
  /** Trigger type */
  type: 'action' | 'data_pattern' | 'threshold' | 'schedule' | 'event';

  /** Trigger configuration */
  config: Record<string, any>;
}

export interface PolicyAction {
  /** Action type */
  type: 'block' | 'require_approval' | 'log' | 'alert' | 'redact' | 'escalate';

  /** Action configuration */
  config?: Record<string, any>;
}

export interface ThresholdConfig {
  /** Threshold ID */
  id: string;

  /** Display name */
  name: string;

  /** Description */
  description: string;

  /** Data type */
  type: 'number' | 'percentage' | 'duration' | 'count';

  /** Default value */
  defaultValue: number;

  /** Minimum allowed */
  min?: number;

  /** Maximum allowed */
  max?: number;

  /** Current value (set at runtime) */
  currentValue?: number;
}

// =============================================================================
// WORKFLOW DEFINITIONS
// =============================================================================

export interface WorkflowDefinition {
  /** Workflow ID */
  id: string;

  /** Name */
  name: string;

  /** Description */
  description: string;

  /** Entry point file */
  entryPoint: string;

  /** Required permissions to execute */
  requiredPermissions: string[];

  /** Input schema */
  inputSchema?: Record<string, any>;

  /** Output schema */
  outputSchema?: Record<string, any>;
}

// =============================================================================
// COMPONENT DEFINITIONS
// =============================================================================

export interface ComponentDefinition {
  /** Component ID */
  id: string;

  /** Display name */
  name: string;

  /** Where this component appears */
  location: 'dashboard' | 'sidebar' | 'settings' | 'standalone';

  /** Component file path */
  component: string;

  /** Icon */
  icon?: string;

  /** Required permissions to view */
  requiredPermissions?: string[];

  /** Route path (if standalone) */
  route?: string;
}

// =============================================================================
// OTHER DEFINITIONS
// =============================================================================

export interface EndpointDefinition {
  /** HTTP method */
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

  /** Route path */
  path: string;

  /** Handler file */
  handler: string;

  /** Required permissions */
  requiredPermissions?: string[];
}

export interface JobDefinition {
  /** Job ID */
  id: string;

  /** Name */
  name: string;

  /** Cron schedule */
  schedule: string;

  /** Handler file */
  handler: string;

  /** Is enabled by default? */
  enabledByDefault: boolean;
}

export interface ReportDefinition {
  /** Report ID */
  id: string;

  /** Name */
  name: string;

  /** Description */
  description: string;

  /** Template file */
  template: string;

  /** Output formats */
  formats: ('pdf' | 'html' | 'json' | 'csv')[];
}

export interface EvidenceTemplateDefinition {
  /** Template ID */
  id: string;

  /** Name */
  name: string;

  /** Description */
  description: string;

  /** Schema file */
  schema: string;
}

// =============================================================================
// COMPLIANCE MAPPING
// =============================================================================

export interface ComplianceMapping {
  /** Framework name */
  framework: string;

  /** Framework version */
  version?: string;

  /** Control mappings */
  controls: ControlMapping[];
}

export interface ControlMapping {
  /** Control ID (e.g., "AC-2", "164.308(a)(1)") */
  controlId: string;

  /** Control name */
  controlName: string;

  /** How this pack addresses the control */
  implementation: string;

  /** Evidence this pack generates */
  evidence?: string[];
}

// =============================================================================
// CONFIGURATION
// =============================================================================

export interface PackConfiguration {
  /** Configuration sections */
  sections: ConfigSection[];
}

export interface ConfigSection {
  /** Section ID */
  id: string;

  /** Section title */
  title: string;

  /** Description */
  description?: string;

  /** Configuration fields */
  fields: ConfigField[];
}

export interface ConfigField {
  /** Field ID */
  id: string;

  /** Display label */
  label: string;

  /** Help text */
  description?: string;

  /** Field type */
  type: 'text' | 'number' | 'boolean' | 'select' | 'multiselect' | 'textarea' | 'json';

  /** Default value */
  defaultValue: any;

  /** Current value (set at runtime) */
  currentValue?: any;

  /** Is this field required? */
  required?: boolean;

  /** Validation rules */
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    message?: string;
  };

  /** Options for select/multiselect */
  options?: { value: any; label: string }[];

  /** Show this field only when condition is met */
  showWhen?: {
    field: string;
    equals: any;
  };
}

// =============================================================================
// HOOKS
// =============================================================================

export interface PackHooks {
  /** Run before installation */
  preInstall?: string;

  /** Run after installation */
  postInstall?: string;

  /** Run before uninstall */
  preUninstall?: string;

  /** Run after uninstall */
  postUninstall?: string;

  /** Run on configuration change */
  onConfigChange?: string;

  /** Run on upgrade */
  onUpgrade?: string;
}

// =============================================================================
// INSTALLED PACK STATE
// =============================================================================

/**
 * Represents an installed pack instance
 */
export interface InstalledPack {
  /** Pack manifest */
  manifest: PackManifest;

  /** Installation status */
  status: PackStatus;

  /** When installed */
  installedAt: Date;

  /** When last updated */
  updatedAt?: Date;

  /** Who installed it */
  installedBy: string;

  /** Current configuration values */
  configuration: Record<string, any>;

  /** Enabled policies (by ID) */
  enabledPolicies: string[];

  /** Disabled policies (by ID) */
  disabledPolicies: string[];

  /** Runtime metrics */
  metrics?: {
    lastActivity?: Date;
    policyExecutions?: number;
    workflowExecutions?: number;
    errorsLast24h?: number;
  };
}

// =============================================================================
// PACK REGISTRY
// =============================================================================

/**
 * Pack registry entry (available packs)
 */
export interface PackRegistryEntry {
  /** Pack ID */
  id: string;

  /** Latest version */
  latestVersion: string;

  /** All available versions */
  versions: string[];

  /** Manifest for latest version */
  manifest: PackManifest;

  /** Download URL */
  downloadUrl?: string;

  /** Is this a built-in pack? */
  builtIn: boolean;

  /** Installation count */
  installCount?: number;

  /** Rating */
  rating?: number;
}
