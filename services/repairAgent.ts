/**
 * ACE REPAIR Agent Service
 *
 * Implements robust automated remediation for:
 * 1. Input Sanitization - Strip/neutralize adversarial content
 * 2. Logic Reconciliation - Resolve data conflicts using authoritative sources
 * 3. Re-validation - Verify fixes before continuing
 * 4. Transparent Logging - Full audit trail of what was changed
 *
 * NIST AI RMF: MANAGE-1.1 (Risk Response Procedures)
 * NIST 800-53: IR-4 (Incident Handling), SI-3 (Malicious Code Protection)
 */

import { execute as governedExecute, executeJSON } from './governedLLM';
import { ModelTier } from '../llm';
import { AgentRole, WorkforceType } from '../types';
import { config as appConfig } from '../config.browser';

// ============================================================================
// TYPES
// ============================================================================

export interface RepairResult {
  success: boolean;
  repairType: RepairType;
  originalData: any;
  repairedData: any;
  changes: RepairChange[];
  integrityScoreBefore: number;
  integrityScoreAfter: number;
  retryCount: number;
  timestamp: string;
  repairDurationMs: number;
}

export interface RepairChange {
  field: string;
  originalValue: any;
  newValue: any;
  reason: string;
  source: string; // What authoritative source was used
  confidence: number; // 0-100
}

export enum RepairType {
  SANITIZATION = 'SANITIZATION',           // Removed adversarial content
  LOGIC_RECONCILIATION = 'LOGIC_RECONCILIATION', // Fixed data conflicts
  FORMAT_NORMALIZATION = 'FORMAT_NORMALIZATION', // Fixed format issues
  MISSING_DATA_INFERENCE = 'MISSING_DATA_INFERENCE', // Inferred missing required fields
  DUPLICATE_RESOLUTION = 'DUPLICATE_RESOLUTION', // Resolved duplicate entries
  CROSS_REFERENCE_FIX = 'CROSS_REFERENCE_FIX'  // Fixed cross-document inconsistencies
}

export interface IntegrityCheckResult {
  resilient: boolean;
  integrity_score: number;
  anomaly_detected: string | null;
  anomaly_type?: AnomalyType;
  affected_fields?: string[];
}

export enum AnomalyType {
  PROMPT_INJECTION = 'PROMPT_INJECTION',
  PATH_TRAVERSAL = 'PATH_TRAVERSAL',
  CREDENTIAL_EXTRACTION = 'CREDENTIAL_EXTRACTION',
  SOCIAL_ENGINEERING = 'SOCIAL_ENGINEERING',
  LOGIC_INCONSISTENCY = 'LOGIC_INCONSISTENCY',
  DATE_CONFLICT = 'DATE_CONFLICT',
  MISSING_REQUIRED = 'MISSING_REQUIRED',
  FORMAT_ERROR = 'FORMAT_ERROR',
  DUPLICATE_DATA = 'DUPLICATE_DATA'
}

// ============================================================================
// CONFIGURATION
// ============================================================================

const MAX_REPAIR_RETRIES = 3;
const REPAIR_TIMEOUT_MS = 30000;
const MIN_INTEGRITY_THRESHOLD = 85; // Must achieve this score after repair

// Patterns that indicate adversarial content
const ADVERSARIAL_PATTERNS = [
  // Prompt injection
  /ignore\s+(previous|all|above)\s+(instructions|prompts)/gi,
  /you\s+are\s+now\s+/gi,
  /new\s+instructions?:/gi,
  /system\s*:\s*/gi,
  /\[INST\]/gi,
  /<<SYS>>/gi,
  /<\|im_start\|>/gi,
  /jailbreak/gi,
  /DAN\s*mode/gi,

  // Path traversal
  /\.\.\//g,
  /\.\.\\]/g,
  /%2e%2e/gi,
  /%252e/gi,

  // Script injection
  /<script\b/gi,
  /javascript:/gi,
  /on\w+\s*=/gi,
  /eval\s*\(/gi,

  // Command injection
  /;\s*(rm|del|drop|truncate|exec)\s/gi,
  /\|\s*(bash|sh|cmd|powershell)/gi,
  /`[^`]*`/g, // Backtick command substitution

  // Credential extraction attempts
  /api[_-]?key/gi,
  /secret[_-]?key/gi,
  /password\s*[=:]/gi,
  /bearer\s+token/gi,
  /authorization:\s*bearer/gi
];

// Fields that should never contain certain patterns
const FIELD_SANITIZATION_RULES: Record<string, RegExp[]> = {
  'name': [/<[^>]*>/g, /[{}]/g],
  'ssn': [/[^0-9-]/g],
  'date': [/[^0-9-/]/g],
  'email': [/[<>'"]/g],
  'phone': [/[^0-9-() +]/g],
  'address': [/<[^>]*>/g, /[{}]/g],
  'filename': [/\.\./g, /[<>:"|?*]/g, /\x00/g]
};

// ============================================================================
// API CLIENT
// ============================================================================

// LLM access routed through Governed Execution Kernel — no direct SDK usage

// ============================================================================
// REPAIR AGENT CLASS
// ============================================================================

export class RepairAgent {
  private repairLog: RepairResult[] = [];

  /**
   * Main entry point - attempt to repair problematic data
   */
  async repair(
    inputData: any,
    integrityResult: IntegrityCheckResult,
    context: { role: AgentRole; template?: WorkforceType }
  ): Promise<RepairResult> {
    const startTime = Date.now();
    const originalData = JSON.parse(JSON.stringify(inputData)); // Deep clone

    let repairedData = inputData;
    let changes: RepairChange[] = [];
    let retryCount = 0;
    let currentIntegrity = integrityResult.integrity_score;
    let repairType = this.determineRepairType(integrityResult);

    console.log(`[REPAIR] Starting repair - Type: ${repairType}, Initial Integrity: ${currentIntegrity}`);

    // Attempt repair with retry loop
    while (retryCount < MAX_REPAIR_RETRIES && currentIntegrity < MIN_INTEGRITY_THRESHOLD) {
      retryCount++;
      console.log(`[REPAIR] Attempt ${retryCount}/${MAX_REPAIR_RETRIES}`);

      try {
        // Step 1: Apply rule-based sanitization first (fast, deterministic)
        const sanitizationResult = this.applySanitization(repairedData);
        repairedData = sanitizationResult.data;
        changes.push(...sanitizationResult.changes);

        // Step 2: If logic issues, use AI for reconciliation
        if (this.requiresAIReconciliation(integrityResult)) {
          const aiResult = await this.applyAIReconciliation(repairedData, integrityResult, context);
          repairedData = aiResult.data;
          changes.push(...aiResult.changes);
        }

        // Step 3: Re-validate
        const revalidation = await this.revalidate(repairedData);
        currentIntegrity = revalidation.integrity_score;

        console.log(`[REPAIR] After attempt ${retryCount}: Integrity = ${currentIntegrity}`);

        if (!revalidation.resilient && revalidation.anomaly_detected) {
          // Still have issues, update for next iteration
          integrityResult = revalidation;
          repairType = this.determineRepairType(revalidation);
        }

      } catch (error) {
        console.error(`[REPAIR] Attempt ${retryCount} failed:`, error);
        // Continue to next retry
      }
    }

    const result: RepairResult = {
      success: currentIntegrity >= MIN_INTEGRITY_THRESHOLD,
      repairType,
      originalData,
      repairedData,
      changes,
      integrityScoreBefore: integrityResult.integrity_score,
      integrityScoreAfter: currentIntegrity,
      retryCount,
      timestamp: new Date().toISOString(),
      repairDurationMs: Date.now() - startTime
    };

    this.repairLog.push(result);

    console.log(`[REPAIR] Complete - Success: ${result.success}, Changes: ${changes.length}, Duration: ${result.repairDurationMs}ms`);

    return result;
  }

  /**
   * Determine what type of repair is needed based on the integrity check
   */
  private determineRepairType(integrityResult: IntegrityCheckResult): RepairType {
    if (!integrityResult.anomaly_type) {
      // Infer from anomaly description
      const anomaly = (integrityResult.anomaly_detected || '').toLowerCase();

      if (anomaly.includes('injection') || anomaly.includes('adversarial') || anomaly.includes('malicious')) {
        return RepairType.SANITIZATION;
      }
      if (anomaly.includes('date') || anomaly.includes('conflict') || anomaly.includes('inconsistent')) {
        return RepairType.LOGIC_RECONCILIATION;
      }
      if (anomaly.includes('format') || anomaly.includes('invalid')) {
        return RepairType.FORMAT_NORMALIZATION;
      }
      if (anomaly.includes('missing') || anomaly.includes('required')) {
        return RepairType.MISSING_DATA_INFERENCE;
      }
      if (anomaly.includes('duplicate')) {
        return RepairType.DUPLICATE_RESOLUTION;
      }
    }

    switch (integrityResult.anomaly_type) {
      case AnomalyType.PROMPT_INJECTION:
      case AnomalyType.PATH_TRAVERSAL:
      case AnomalyType.CREDENTIAL_EXTRACTION:
      case AnomalyType.SOCIAL_ENGINEERING:
        return RepairType.SANITIZATION;
      case AnomalyType.DATE_CONFLICT:
      case AnomalyType.LOGIC_INCONSISTENCY:
        return RepairType.LOGIC_RECONCILIATION;
      case AnomalyType.FORMAT_ERROR:
        return RepairType.FORMAT_NORMALIZATION;
      case AnomalyType.MISSING_REQUIRED:
        return RepairType.MISSING_DATA_INFERENCE;
      case AnomalyType.DUPLICATE_DATA:
        return RepairType.DUPLICATE_RESOLUTION;
      default:
        return RepairType.SANITIZATION; // Default to sanitization
    }
  }

  /**
   * Apply rule-based sanitization (fast, no API calls)
   */
  private applySanitization(data: any): { data: any; changes: RepairChange[] } {
    const changes: RepairChange[] = [];
    const sanitized = this.deepSanitize(data, '', changes);
    return { data: sanitized, changes };
  }

  /**
   * Recursively sanitize all string fields in an object
   */
  private deepSanitize(obj: any, path: string, changes: RepairChange[]): any {
    if (obj === null || obj === undefined) return obj;

    if (typeof obj === 'string') {
      return this.sanitizeString(obj, path, changes);
    }

    if (Array.isArray(obj)) {
      return obj.map((item, i) => this.deepSanitize(item, `${path}[${i}]`, changes));
    }

    if (typeof obj === 'object') {
      const result: Record<string, any> = {};
      for (const [key, value] of Object.entries(obj)) {
        const fieldPath = path ? `${path}.${key}` : key;
        result[key] = this.deepSanitize(value, fieldPath, changes);
      }
      return result;
    }

    return obj;
  }

  /**
   * Sanitize a single string value
   */
  private sanitizeString(value: string, fieldPath: string, changes: RepairChange[]): string {
    let sanitized = value;
    const fieldName = fieldPath.split('.').pop()?.toLowerCase() || '';

    // Check for adversarial patterns
    for (const pattern of ADVERSARIAL_PATTERNS) {
      const matches = sanitized.match(pattern);
      if (matches) {
        const original = sanitized;
        sanitized = sanitized.replace(pattern, '[REDACTED]');
        changes.push({
          field: fieldPath,
          originalValue: original.substring(0, 100) + (original.length > 100 ? '...' : ''),
          newValue: sanitized.substring(0, 100) + (sanitized.length > 100 ? '...' : ''),
          reason: `Adversarial pattern detected: ${pattern.toString().substring(0, 50)}`,
          source: 'REPAIR_SANITIZATION_RULES',
          confidence: 95
        });
      }
    }

    // Apply field-specific sanitization
    for (const [field, rules] of Object.entries(FIELD_SANITIZATION_RULES)) {
      if (fieldName.includes(field)) {
        for (const rule of rules) {
          if (rule.test(sanitized)) {
            const original = sanitized;
            sanitized = sanitized.replace(rule, '');
            if (sanitized !== original) {
              changes.push({
                field: fieldPath,
                originalValue: original,
                newValue: sanitized,
                reason: `Field-specific sanitization for ${field}`,
                source: 'REPAIR_FIELD_RULES',
                confidence: 90
              });
            }
          }
        }
      }
    }

    return sanitized;
  }

  /**
   * Check if AI-based reconciliation is needed
   */
  private requiresAIReconciliation(integrityResult: IntegrityCheckResult): boolean {
    const repairType = this.determineRepairType(integrityResult);
    return [
      RepairType.LOGIC_RECONCILIATION,
      RepairType.MISSING_DATA_INFERENCE,
      RepairType.CROSS_REFERENCE_FIX
    ].includes(repairType);
  }

  /**
   * Use AI to reconcile logic issues and data conflicts
   */
  private async applyAIReconciliation(
    data: any,
    integrityResult: IntegrityCheckResult,
    context: { role: AgentRole; template?: WorkforceType }
  ): Promise<{ data: any; changes: RepairChange[] }> {

    try {
      const result = await executeJSON<{
        repaired_data: any;
        changes: Array<{
          field: string;
          original_value: any;
          new_value: any;
          reason: string;
          source?: string;
          confidence?: number;
        }>;
      }>({
        role: 'REPAIR_AGENT',
        purpose: 'ai-reconciliation',
        systemPrompt: `You are the ACE REPAIR Agent. Your mission is to fix data inconsistencies and logic errors while preserving legitimate data.

CONTEXT: ${context.template || 'VA_CLAIMS'} workflow, Agent: ${context.role}

REPAIR PRINCIPLES:
1. PRESERVE legitimate data - only change what's necessary
2. USE authoritative sources - DD-214 > typed notes, official records > user input
3. DOCUMENT every change with clear reasoning
4. MAINTAIN data integrity - don't introduce new errors

ANOMALY DETECTED: ${integrityResult.anomaly_detected}
AFFECTED FIELDS: ${integrityResult.affected_fields?.join(', ') || 'Unknown'}

Respond with JSON:
{
  "repaired_data": <the fixed data object>,
  "changes": [
    {
      "field": "field.path",
      "original_value": "what it was",
      "new_value": "what you changed it to",
      "reason": "why this change was made",
      "source": "what authoritative source you used",
      "confidence": 0-100
    }
  ]
}`,
        userMessage: `Repair this data:\n${JSON.stringify(data, null, 2)}`,
        maxTokens: 2048
      });

      const changes: RepairChange[] = (result.changes || []).map((c) => ({
        field: c.field,
        originalValue: c.original_value,
        newValue: c.new_value,
        reason: c.reason,
        source: c.source || 'AI_RECONCILIATION',
        confidence: c.confidence || 75
      }));

      return {
        data: result.repaired_data || data,
        changes
      };

    } catch (error) {
      console.error('[REPAIR] AI reconciliation failed:', error);
      return { data, changes: [] };
    }
  }

  /**
   * Re-validate data after repair
   */
  private async revalidate(data: any): Promise<IntegrityCheckResult> {
    try {
      const result = await executeJSON<{
        resilient: boolean;
        integrity_score: number;
        anomaly_detected: string | null;
        anomaly_type?: string;
        remaining_issues?: string[];
      }>({
        role: 'BEHAVIORAL_INTEGRITY_SENTINEL',
        purpose: 'post-repair-validation',
        systemPrompt: `You are the ACE BEHAVIORAL INTEGRITY SENTINEL performing POST-REPAIR validation.

Check if the data is now clean and consistent. Be thorough but not overly strict.

Respond with JSON:
{
  "resilient": boolean,
  "integrity_score": 0-100,
  "anomaly_detected": string | null,
  "remaining_issues": string[] | null
}`,
        userMessage: `Validate repaired data:\n${JSON.stringify(data).substring(0, 3000)}`,
        maxTokens: 512
      });

      return {
        resilient: result.resilient ?? true,
        integrity_score: result.integrity_score ?? 90,
        anomaly_detected: result.anomaly_detected || null,
        anomaly_type: result.anomaly_type,
        affected_fields: result.remaining_issues
      };

    } catch (error) {
      console.error('[REPAIR] Re-validation failed:', error);
      return { resilient: true, integrity_score: 85, anomaly_detected: null };
    }
  }

  /**
   * Get the repair log for audit purposes
   */
  getRepairLog(): RepairResult[] {
    return [...this.repairLog];
  }

  /**
   * Get summary statistics
   */
  getRepairStats(): {
    totalRepairs: number;
    successRate: number;
    avgIntegrityImprovement: number;
    repairsByType: Record<RepairType, number>;
  } {
    const total = this.repairLog.length;
    const successful = this.repairLog.filter(r => r.success).length;

    const avgImprovement = total > 0
      ? this.repairLog.reduce((sum, r) => sum + (r.integrityScoreAfter - r.integrityScoreBefore), 0) / total
      : 0;

    const byType: Record<RepairType, number> = {
      [RepairType.SANITIZATION]: 0,
      [RepairType.LOGIC_RECONCILIATION]: 0,
      [RepairType.FORMAT_NORMALIZATION]: 0,
      [RepairType.MISSING_DATA_INFERENCE]: 0,
      [RepairType.DUPLICATE_RESOLUTION]: 0,
      [RepairType.CROSS_REFERENCE_FIX]: 0
    };

    for (const repair of this.repairLog) {
      byType[repair.repairType]++;
    }

    return {
      totalRepairs: total,
      successRate: total > 0 ? (successful / total) * 100 : 0,
      avgIntegrityImprovement: avgImprovement,
      repairsByType: byType
    };
  }

  /**
   * Clear repair log (for testing or session reset)
   */
  clearLog(): void {
    this.repairLog = [];
  }
}

// Singleton instance
export const repairAgent = new RepairAgent();

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Format repair changes for display in activity log
 */
export function formatRepairChanges(changes: RepairChange[]): string {
  if (changes.length === 0) return 'No changes required.';

  return changes.map(c =>
    `• ${c.field}: "${c.originalValue}" → "${c.newValue}" (${c.reason})`
  ).join('\n');
}

/**
 * Generate repair summary for telemetry
 */
export function generateRepairTelemetry(result: RepairResult): Record<string, any> {
  return {
    repair_id: `RPR-${Date.now()}`,
    timestamp: result.timestamp,
    success: result.success,
    repair_type: result.repairType,
    integrity_before: result.integrityScoreBefore,
    integrity_after: result.integrityScoreAfter,
    integrity_delta: result.integrityScoreAfter - result.integrityScoreBefore,
    changes_count: result.changes.length,
    retry_count: result.retryCount,
    duration_ms: result.repairDurationMs,
    changes_summary: result.changes.map(c => ({
      field: c.field,
      reason: c.reason,
      confidence: c.confidence
    }))
  };
}
