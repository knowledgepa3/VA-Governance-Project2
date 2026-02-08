/**
 * Governance Library Schema — The Governance OS Backbone
 *
 * Zod schemas + TypeScript types for all governance objects.
 * Follows spawnPlan.schema.ts patterns: Zod for validation, exported types,
 * hash functions for integrity, validation functions for completeness.
 *
 * Three core primitives:
 *   1. GovernancePolicy  — atomic control/requirement
 *   2. GovernancePack    — composable policy collection
 *   3. EvidenceTemplate  — what agents must produce per control
 *   4. ApprovalRole      — who can approve what
 *
 * Agents query these at runtime: "I am worker type X doing action Y
 * in domain Z — what policies apply?" No guessing.
 */

import { z } from 'zod';
import * as crypto from 'crypto';

// ═══════════════════════════════════════════════════════════════════
// ENUMS
// ═══════════════════════════════════════════════════════════════════

export const RiskLevel = z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']);
export type RiskLevel = z.infer<typeof RiskLevel>;

export const MAILevel = z.enum(['INFORMATIONAL', 'ADVISORY', 'MANDATORY']);
export type MAILevel = z.infer<typeof MAILevel>;

export const PackType = z.enum(['BASE', 'INDUSTRY', 'ENTERPRISE', 'DEPARTMENT']);
export type PackType = z.infer<typeof PackType>;

export const SourceFramework = z.enum([
  'NIST_800_53', 'HIPAA', 'SOC2', 'EU_AI_ACT', 'ISO_42001',
  'ISO_31000', 'COSO_ERM', 'FEDRAMP', 'CUSTOM',
]);
export type SourceFramework = z.infer<typeof SourceFramework>;

export const ImplementationStatus = z.enum(['ENFORCED', 'EVIDENCED', 'CONFIGURABLE', 'PARTIAL']);
export type ImplementationStatus = z.infer<typeof ImplementationStatus>;

export const EvidenceType = z.enum([
  'SCREENSHOT', 'DOCUMENT', 'LOG_ENTRY', 'ATTESTATION', 'HASH_PROOF', 'APPROVAL_RECORD',
]);
export type EvidenceType = z.infer<typeof EvidenceType>;

export const RequirementCheckType = z.enum(['automated', 'manual', 'evidence']);
export type RequirementCheckType = z.infer<typeof RequirementCheckType>;

// ═══════════════════════════════════════════════════════════════════
// SUB-SCHEMAS
// ═══════════════════════════════════════════════════════════════════

/**
 * A single requirement within a policy.
 * Maps to the "what must be satisfied" question.
 */
export const PolicyRequirementSchema = z.object({
  requirementId: z.string().min(1),
  description: z.string().min(1),
  checkType: RequirementCheckType,
  isMandatory: z.boolean().default(true),
  automationRef: z.string().optional(), // Reference to automated check function
});
export type PolicyRequirement = z.infer<typeof PolicyRequirementSchema>;

/**
 * Cross-reference to an external compliance framework.
 */
export const FrameworkReferenceSchema = z.object({
  framework: z.string().min(1),         // "NIST_800_53", "COSO_ERM", "ISO_31000"
  controlId: z.string().min(1),          // "AC-1", "Principle 3", "Clause 6.4"
  controlName: z.string().min(1),        // "Policy and Procedures"
  clause: z.string().optional(),         // Additional clause reference
});
export type FrameworkReference = z.infer<typeof FrameworkReferenceSchema>;

// ═══════════════════════════════════════════════════════════════════
// GOVERNANCE POLICY — The Atomic Unit
// ═══════════════════════════════════════════════════════════════════

export const GovernancePolicySchema = z.object({
  id: z.string(),
  policyId: z.string().min(1),
  tenantId: z.string().min(1),
  packId: z.string().min(1),
  controlFamily: z.string().min(1).max(20),
  title: z.string().min(1).max(500),
  description: z.string().default(''),
  requirements: z.array(PolicyRequirementSchema).default([]),
  evidenceRequired: z.array(z.object({
    templateId: z.string(),
    name: z.string(),
    templateType: EvidenceType,
    isRequired: z.boolean().default(true),
  })).default([]),
  approvalRoles: z.array(z.string()).default([]),
  riskLevel: RiskLevel,
  maiLevel: MAILevel,
  applicableWorkerTypes: z.array(z.string()).default([]),
  applicableDomains: z.array(z.string()).default([]),
  implementationStatus: ImplementationStatus,
  frameworkRefs: z.array(FrameworkReferenceSchema).default([]),
  metadata: z.object({
    version: z.string().default('1.0.0'),
    createdAt: z.string(),
    updatedAt: z.string(),
    createdBy: z.string().default('SYSTEM'),
    sourceFramework: z.string().default('CUSTOM'),
    effectiveDate: z.string(),
    expiresAt: z.string().optional(),
  }),
  contentHash: z.string().default(''),
  isActive: z.boolean().default(true),
});
export type GovernancePolicy = z.infer<typeof GovernancePolicySchema>;

// ═══════════════════════════════════════════════════════════════════
// GOVERNANCE PACK — The Composable Collection
// ═══════════════════════════════════════════════════════════════════

export const GovernancePackSchema = z.object({
  id: z.string(),
  packId: z.string().min(1),
  tenantId: z.string().min(1),
  name: z.string().min(1).max(200),
  description: z.string().default(''),
  packType: PackType,
  sourceFramework: z.string().default('CUSTOM'),
  version: z.string().default('1.0.0'),
  priority: z.number().int().min(0).max(1000).default(100),
  policyCount: z.number().int().min(0).default(0),
  controlFamilies: z.array(z.string()).default([]),
  metadata: z.object({
    createdAt: z.string(),
    updatedAt: z.string(),
    createdBy: z.string().default('SYSTEM'),
    certificationLevel: z.number().int().min(0).max(4).default(0),
  }),
  contentHash: z.string().default(''),
  isActive: z.boolean().default(true),
});
export type GovernancePack = z.infer<typeof GovernancePackSchema>;

// ═══════════════════════════════════════════════════════════════════
// EVIDENCE TEMPLATE — What Agents Must Produce
// ═══════════════════════════════════════════════════════════════════

export const EvidenceTemplateSchema = z.object({
  id: z.string(),
  templateId: z.string().min(1),
  tenantId: z.string().min(1),
  policyId: z.string().min(1),
  name: z.string().min(1).max(200),
  description: z.string().default(''),
  templateType: EvidenceType,
  requiredFields: z.array(z.object({
    fieldName: z.string(),
    fieldType: z.string(),
    description: z.string().optional(),
    isRequired: z.boolean().default(true),
  })).default([]),
  formatSpec: z.record(z.string(), z.unknown()).default({}),
  isRequired: z.boolean().default(true),
  createdAt: z.string(),
});
export type EvidenceTemplate = z.infer<typeof EvidenceTemplateSchema>;

// ═══════════════════════════════════════════════════════════════════
// APPROVAL ROLE — Who Can Approve What
// ═══════════════════════════════════════════════════════════════════

export const ApprovalRoleSchema = z.object({
  id: z.string(),
  tenantId: z.string().min(1),
  roleName: z.string().min(1).max(100),
  description: z.string().default(''),
  canApproveRiskLevels: z.array(RiskLevel).default(['LOW', 'MEDIUM']),
  canApproveMaiLevels: z.array(MAILevel).default(['INFORMATIONAL', 'ADVISORY']),
  canApproveControlFamilies: z.array(z.string()).default([]),
  requiresMfa: z.boolean().default(false),
  maxApprovalValueCents: z.number().int().nullable().default(null),
  isActive: z.boolean().default(true),
  createdAt: z.string(),
});
export type ApprovalRole = z.infer<typeof ApprovalRoleSchema>;

// ═══════════════════════════════════════════════════════════════════
// RUNTIME QUERY CONTEXT
// ═══════════════════════════════════════════════════════════════════

/**
 * What workers pass when querying the library.
 * "I am type X, doing action in domain Y — what applies?"
 */
export const PolicyQueryContextSchema = z.object({
  workerType: z.string().optional(),
  domain: z.string().optional(),
  controlFamily: z.string().optional(),
  maiLevel: MAILevel.optional(),
  riskLevel: RiskLevel.optional(),
});
export type PolicyQueryContext = z.infer<typeof PolicyQueryContextSchema>;

// ═══════════════════════════════════════════════════════════════════
// GOVERNANCE SUMMARY (Dashboard data)
// ═══════════════════════════════════════════════════════════════════

export interface GovernanceSummary {
  packsActive: number;
  packsTotal: number;
  policiesActive: number;
  policiesTotal: number;
  controlFamilies: string[];
  evidenceTemplates: number;
  approvalRoles: number;
  packBreakdown: {
    packId: string;
    name: string;
    packType: string;
    policyCount: number;
    sourceFramework: string;
  }[];
  familyBreakdown: Record<string, number>;
  lastUpdated: string;
}

// ═══════════════════════════════════════════════════════════════════
// HASH FUNCTIONS — Integrity Verification
// ═══════════════════════════════════════════════════════════════════

/**
 * Hash a policy's content for drift detection.
 * Excludes volatile fields (id, timestamps, contentHash).
 */
export function hashPolicy(policy: Omit<GovernancePolicy, 'id' | 'contentHash' | 'metadata'>): string {
  const normalized = {
    policyId: policy.policyId,
    controlFamily: policy.controlFamily,
    title: policy.title,
    description: policy.description,
    requirements: policy.requirements,
    evidenceRequired: policy.evidenceRequired,
    approvalRoles: policy.approvalRoles,
    riskLevel: policy.riskLevel,
    maiLevel: policy.maiLevel,
    applicableWorkerTypes: policy.applicableWorkerTypes,
    applicableDomains: policy.applicableDomains,
    implementationStatus: policy.implementationStatus,
    frameworkRefs: policy.frameworkRefs,
  };
  return crypto.createHash('sha256').update(JSON.stringify(normalized)).digest('hex');
}

/**
 * Hash a pack's content (aggregate hash of all its policies).
 */
export function hashPack(policies: { contentHash: string }[]): string {
  const sorted = policies.map(p => p.contentHash).sort();
  return crypto.createHash('sha256').update(JSON.stringify(sorted)).digest('hex');
}

// ═══════════════════════════════════════════════════════════════════
// VALIDATION
// ═══════════════════════════════════════════════════════════════════

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validate a policy object for completeness and consistency.
 */
export function validatePolicy(policy: Partial<GovernancePolicy>): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!policy.policyId) errors.push('policyId is required');
  if (!policy.controlFamily) errors.push('controlFamily is required');
  if (!policy.title) errors.push('title is required');
  if (!policy.riskLevel) errors.push('riskLevel is required');
  if (!policy.maiLevel) errors.push('maiLevel is required');

  // If HIGH/CRITICAL risk, should have MANDATORY or at least ADVISORY MAI
  if (policy.riskLevel === 'CRITICAL' && policy.maiLevel === 'INFORMATIONAL') {
    warnings.push('CRITICAL risk policy with INFORMATIONAL MAI level — consider elevating');
  }

  // Should have at least one requirement
  if (!policy.requirements || policy.requirements.length === 0) {
    warnings.push('Policy has no requirements defined');
  }

  // Should have evidence requirements if ENFORCED or EVIDENCED
  if (
    (policy.implementationStatus === 'ENFORCED' || policy.implementationStatus === 'EVIDENCED') &&
    (!policy.evidenceRequired || policy.evidenceRequired.length === 0)
  ) {
    warnings.push(`${policy.implementationStatus} policy should define evidence requirements`);
  }

  // Should have approval roles if MANDATORY
  if (policy.maiLevel === 'MANDATORY' && (!policy.approvalRoles || policy.approvalRoles.length === 0)) {
    warnings.push('MANDATORY policy should specify approval roles');
  }

  return { valid: errors.length === 0, errors, warnings };
}

/**
 * Validate a pack for completeness.
 */
export function validatePack(pack: Partial<GovernancePack>): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!pack.packId) errors.push('packId is required');
  if (!pack.name) errors.push('name is required');
  if (!pack.packType) errors.push('packType is required');

  // Priority ranges per type
  if (pack.packType === 'BASE' && pack.priority && pack.priority > 50) {
    warnings.push('BASE packs should have priority <= 50');
  }
  if (pack.packType === 'ENTERPRISE' && pack.priority && pack.priority < 50) {
    warnings.push('ENTERPRISE packs should have priority >= 50');
  }

  return { valid: errors.length === 0, errors, warnings };
}
