/**
 * Playbook JSON Schema + Validator
 *
 * Strict schema enforcement for playbooks.
 * This is what makes "universal + tight" believable.
 *
 * Every playbook MUST:
 * - Define allowed/blocked domains
 * - Specify classification per step
 * - Declare required evidence outputs
 * - Include compliance boundaries
 */

import { MAIClassification } from './types';
import { ActionType } from './maiRuntime';

/**
 * Step types - explicit action categories
 */
export enum StepType {
  NAVIGATE = 'NAVIGATE',           // Go to a URL
  EXTRACT = 'EXTRACT',             // Extract data from page
  VERIFY = 'VERIFY',               // Verify data against criteria
  SUMMARIZE = 'SUMMARIZE',         // Generate summary/report
  REQUEST_HUMAN_ACTION = 'REQUEST_HUMAN_ACTION', // Ask human to perform action
  DOWNLOAD = 'DOWNLOAD',           // Download file
  SCREENSHOT = 'SCREENSHOT',       // Capture screenshot
  WAIT = 'WAIT'                    // Wait for page/condition
}

/**
 * Evidence output requirement
 */
export interface EvidenceRequirement {
  id: string;
  type: 'document' | 'data' | 'screenshot' | 'report' | 'timeline';
  required: boolean;
  description: string;
  format?: string; // e.g., 'json', 'pdf', 'csv'
  validation?: {
    schema?: Record<string, any>;
    requiredFields?: string[];
  };
}

/**
 * Compliance boundary definition
 */
export interface ComplianceBoundary {
  noAuthentication: boolean;        // No login/auth allowed
  noCaptcha: boolean;               // No CAPTCHA interaction
  noFinalSubmission: boolean;       // No form submissions
  requiresConsent: boolean;         // User consent required
  requiresAttestation: boolean;     // Human attestation required
  lawfulBasis?: string;             // Legal basis for processing (GDPR, etc.)
  dataClassification?: 'public' | 'internal' | 'confidential' | 'restricted';
  retentionPolicy?: string;         // How long to keep evidence
}

/**
 * Domain policy
 */
export interface DomainPolicy {
  allowedDomains: string[];         // Only these domains allowed
  blockedDomains: string[];         // These domains explicitly blocked
  requireApprovalFor: string[];     // These domains require approval
}

/**
 * Playbook step with strict schema
 */
export interface PlaybookStepSchema {
  id: string;
  stepType: StepType;
  instruction: string;
  expectedOutcome: string;
  classification: MAIClassification;

  // Action details
  action?: {
    type: ActionType;
    target?: string;
    value?: string;
  };

  // Domain restrictions for this step
  allowedDomains?: string[];

  // Evidence to collect
  evidenceOutputs?: string[]; // IDs of evidence requirements

  // Conditions
  conditions?: {
    skipIf?: string;
    requireIf?: string;
    requiresConsent?: boolean;
    requiresAttestation?: boolean;
  };

  // Retry policy
  maxRetries?: number;
  timeout?: number;
}

/**
 * Skill pack manifest
 */
export interface SkillPackManifest {
  id: string;
  name: string;
  version: string;

  // Permissions required
  permissions: {
    tabs?: boolean;
    downloads?: boolean;
    clipboard?: boolean;
    network?: boolean;
    storage?: boolean;
  };

  // Domain restrictions
  allowedDomains: string[];

  // Data handling
  dataClassification: 'public' | 'internal' | 'confidential' | 'restricted';

  // Logging requirements
  loggingHooks: {
    onAction: boolean;
    onDataAccess: boolean;
    onNetworkRequest: boolean;
  };

  // Extension paths
  extensions: Array<{
    name: string;
    path: string;
    enabled: boolean;
  }>;
}

/**
 * Complete playbook schema
 */
export interface PlaybookSchema {
  $schema: string;
  id: string;
  name: string;
  description: string;
  version: string;

  // Categorization
  industry: string;
  jobRole: string;
  tags: string[];

  // Compliance
  complianceBoundaries: ComplianceBoundary;
  domainPolicy: DomainPolicy;

  // Evidence requirements
  evidenceRequirements: EvidenceRequirement[];

  // Steps
  steps: PlaybookStepSchema[];

  // Skill packs
  requiredSkillPacks: string[];

  // Variables
  variables?: Array<{
    name: string;
    description: string;
    required: boolean;
    default?: string;
    validation?: {
      pattern?: string;
      enum?: string[];
    };
  }>;

  // Metadata
  defaultClassification: MAIClassification;
  estimatedDuration?: string;
  riskLevel: 'low' | 'medium' | 'high';

  // Attestations required
  attestations?: Array<{
    id: string;
    prompt: string;
    required: boolean;
  }>;
}

/**
 * Validation error
 */
export interface ValidationError {
  field: string;
  message: string;
  severity: 'error' | 'warning';
}

/**
 * Playbook Validator
 */
export class PlaybookValidator {
  private errors: ValidationError[] = [];
  private warnings: ValidationError[] = [];

  /**
   * Validate a playbook against the schema
   */
  validate(playbook: any): { valid: boolean; errors: ValidationError[]; warnings: ValidationError[] } {
    this.errors = [];
    this.warnings = [];

    // Required fields
    this.validateRequired(playbook, 'id', 'string');
    this.validateRequired(playbook, 'name', 'string');
    this.validateRequired(playbook, 'version', 'string');
    this.validateRequired(playbook, 'industry', 'string');
    this.validateRequired(playbook, 'jobRole', 'string');

    // Compliance boundaries (CRITICAL)
    if (!playbook.complianceBoundaries) {
      this.addError('complianceBoundaries', 'Missing compliance boundaries - REQUIRED for all playbooks');
    } else {
      this.validateComplianceBoundaries(playbook.complianceBoundaries);
    }

    // Domain policy (CRITICAL)
    if (!playbook.domainPolicy) {
      this.addError('domainPolicy', 'Missing domain policy - REQUIRED for security');
    } else {
      this.validateDomainPolicy(playbook.domainPolicy);
    }

    // Evidence requirements
    if (!playbook.evidenceRequirements || playbook.evidenceRequirements.length === 0) {
      this.addWarning('evidenceRequirements', 'No evidence requirements defined - consider adding for auditability');
    }

    // Steps
    if (!playbook.steps || playbook.steps.length === 0) {
      this.addError('steps', 'Playbook must have at least one step');
    } else {
      this.validateSteps(playbook.steps, playbook.domainPolicy);
    }

    // Risk level
    if (!playbook.riskLevel) {
      this.addWarning('riskLevel', 'Risk level not specified - defaulting to "high"');
    }

    // High-risk playbooks need extra checks
    if (playbook.riskLevel === 'high') {
      this.validateHighRiskPlaybook(playbook);
    }

    return {
      valid: this.errors.length === 0,
      errors: this.errors,
      warnings: this.warnings
    };
  }

  /**
   * Validate compliance boundaries
   */
  private validateComplianceBoundaries(boundaries: ComplianceBoundary) {
    // These should be true for most playbooks
    if (!boundaries.noAuthentication) {
      this.addWarning('complianceBoundaries.noAuthentication',
        'Authentication is allowed - ensure this is intentional and approved');
    }

    if (!boundaries.noCaptcha) {
      this.addWarning('complianceBoundaries.noCaptcha',
        'CAPTCHA interaction is allowed - this should almost always be false');
    }

    if (!boundaries.noFinalSubmission) {
      this.addWarning('complianceBoundaries.noFinalSubmission',
        'Final submissions are allowed - ensure proper approval gates are in place');
    }

    // Consent/attestation checks
    if (boundaries.requiresConsent && !boundaries.lawfulBasis) {
      this.addError('complianceBoundaries.lawfulBasis',
        'Playbook requires consent but no lawful basis specified');
    }
  }

  /**
   * Validate domain policy
   */
  private validateDomainPolicy(policy: DomainPolicy) {
    if (policy.allowedDomains.length === 0 && policy.blockedDomains.length === 0) {
      this.addWarning('domainPolicy',
        'No domain restrictions specified - consider adding for security');
    }

    // Check for wildcards
    const hasWildcard = policy.allowedDomains.some(d => d.includes('*'));
    if (hasWildcard) {
      this.addWarning('domainPolicy.allowedDomains',
        'Wildcard domains detected - be specific where possible');
    }

    // Check for sensitive domains
    const sensitiveDomains = ['.gov', 'login.gov', 'sam.gov', 'ebenefits.va.gov'];
    const allowsSensitive = policy.allowedDomains.some(d =>
      sensitiveDomains.some(sd => d.includes(sd))
    );
    if (allowsSensitive) {
      this.addWarning('domainPolicy.allowedDomains',
        'Government domains detected - ensure proper authorization and boundaries');
    }
  }

  /**
   * Validate steps
   */
  private validateSteps(steps: PlaybookStepSchema[], domainPolicy: DomainPolicy) {
    steps.forEach((step, index) => {
      // Required fields
      if (!step.id) {
        this.addError(`steps[${index}].id`, 'Step ID is required');
      }

      if (!step.stepType) {
        this.addError(`steps[${index}].stepType`, 'Step type is required');
      }

      if (!step.classification) {
        this.addError(`steps[${index}].classification`, 'Classification is required for every step');
      }

      // Check for dangerous patterns
      const instruction = step.instruction?.toLowerCase() || '';
      if (instruction.includes('login') || instruction.includes('password')) {
        if (step.classification !== MAIClassification.MANDATORY) {
          this.addError(`steps[${index}].classification`,
            'Authentication actions MUST be classified as MANDATORY');
        }
      }

      if (instruction.includes('submit') && step.classification === MAIClassification.INFORMATIONAL) {
        this.addError(`steps[${index}].classification`,
          'Submit actions cannot be INFORMATIONAL - must be at least ADVISORY');
      }

      // Domain checks
      if (step.action?.target && !this.isDomainAllowed(step.action.target, domainPolicy)) {
        this.addWarning(`steps[${index}].action.target`,
          `Target may be outside allowed domains: ${step.action.target}`);
      }
    });
  }

  /**
   * Validate high-risk playbooks
   */
  private validateHighRiskPlaybook(playbook: any) {
    // High-risk playbooks MUST have:
    if (!playbook.complianceBoundaries.requiresAttestation) {
      this.addError('complianceBoundaries.requiresAttestation',
        'High-risk playbooks MUST require attestation');
    }

    if (!playbook.attestations || playbook.attestations.length === 0) {
      this.addError('attestations',
        'High-risk playbooks MUST define attestation prompts');
    }

    if (!playbook.evidenceRequirements || playbook.evidenceRequirements.length < 3) {
      this.addWarning('evidenceRequirements',
        'High-risk playbooks should capture comprehensive evidence (timeline, screenshots, decisions)');
    }
  }

  /**
   * Check if domain is allowed
   */
  private isDomainAllowed(url: string, policy: DomainPolicy): boolean {
    try {
      const domain = new URL(url).hostname;

      // Check blocked first
      if (policy.blockedDomains.some(d => domain.includes(d))) {
        return false;
      }

      // If allow list exists, must be in it
      if (policy.allowedDomains.length > 0) {
        return policy.allowedDomains.some(d =>
          d.includes('*') ? domain.includes(d.replace('*', '')) : domain === d
        );
      }

      return true;
    } catch {
      return false; // Invalid URL
    }
  }

  /**
   * Validate required field
   */
  private validateRequired(obj: any, field: string, type: string) {
    if (!obj[field]) {
      this.addError(field, `Required field missing: ${field}`);
    } else if (typeof obj[field] !== type) {
      this.addError(field, `Field ${field} must be of type ${type}`);
    }
  }

  private addError(field: string, message: string) {
    this.errors.push({ field, message, severity: 'error' });
  }

  private addWarning(field: string, message: string) {
    this.warnings.push({ field, message, severity: 'warning' });
  }
}

/**
 * JSON Schema for validation tools
 */
export const PLAYBOOK_JSON_SCHEMA = {
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["id", "name", "version", "industry", "jobRole", "complianceBoundaries", "domainPolicy", "steps"],
  "properties": {
    "id": { "type": "string" },
    "name": { "type": "string" },
    "version": { "type": "string", "pattern": "^\\d+\\.\\d+\\.\\d+$" },
    "industry": { "type": "string" },
    "jobRole": { "type": "string" },
    "riskLevel": { "enum": ["low", "medium", "high"] },
    "complianceBoundaries": {
      "type": "object",
      "required": ["noAuthentication", "noCaptcha", "noFinalSubmission"],
      "properties": {
        "noAuthentication": { "type": "boolean" },
        "noCaptcha": { "type": "boolean" },
        "noFinalSubmission": { "type": "boolean" },
        "requiresConsent": { "type": "boolean" },
        "requiresAttestation": { "type": "boolean" },
        "lawfulBasis": { "type": "string" },
        "dataClassification": { "enum": ["public", "internal", "confidential", "restricted"] }
      }
    },
    "domainPolicy": {
      "type": "object",
      "properties": {
        "allowedDomains": { "type": "array", "items": { "type": "string" } },
        "blockedDomains": { "type": "array", "items": { "type": "string" } },
        "requireApprovalFor": { "type": "array", "items": { "type": "string" } }
      }
    },
    "steps": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["id", "stepType", "instruction", "classification"],
        "properties": {
          "id": { "type": "string" },
          "stepType": { "enum": ["NAVIGATE", "EXTRACT", "VERIFY", "SUMMARIZE", "REQUEST_HUMAN_ACTION", "DOWNLOAD", "SCREENSHOT", "WAIT"] },
          "instruction": { "type": "string" },
          "expectedOutcome": { "type": "string" },
          "classification": { "enum": ["MANDATORY", "ADVISORY", "INFORMATIONAL"] }
        }
      }
    }
  }
};
