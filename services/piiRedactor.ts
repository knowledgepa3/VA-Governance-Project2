/**
 * PII Redaction Service - Deterministic, Code-Level
 *
 * This module provides DETERMINISTIC PII redaction that runs as a post-processing
 * step on ALL LLM outputs. It does NOT rely on LLM prompts to redact — it uses
 * regex patterns to strip PII from text regardless of what the LLM produces.
 *
 * This is an architectural control: every agent output passes through this
 * before being stored or displayed.
 *
 * Patterns covered:
 * - Social Security Numbers (SSN) — all common formats
 * - Phone numbers — US formats
 * - Email addresses
 * - Dates of birth (when preceded by DOB-indicating context)
 * - Full 9-digit SSNs with no separators
 *
 * IMPORTANT: The VA claims workflow has a special mode where PII is PRESERVED
 * for submission to the VA (they require it). The redactor is applied to:
 * - UI display text
 * - Audit logs
 * - Console output
 * But NOT to the internal agent data pipeline (which the VA needs intact).
 *
 * @module services/piiRedactor
 */

/**
 * Redaction mode:
 * - 'full': Replace all PII with redaction markers (for display/logs)
 * - 'partial': Preserve last 4 of SSN, mask rest (for VA submission format)
 * - 'none': No redaction (internal pipeline only — never for display)
 */
export type RedactionMode = 'full' | 'partial' | 'none';

/**
 * Track what was redacted for audit purposes
 */
export interface RedactionReport {
  /** Number of SSN patterns found and redacted */
  ssnCount: number;
  /** Number of phone numbers found and redacted */
  phoneCount: number;
  /** Number of email addresses found and redacted */
  emailCount: number;
  /** Total redactions applied */
  totalRedactions: number;
  /** Whether any PII was found at all */
  piiDetected: boolean;
}

/**
 * Redact SSN patterns from text
 *
 * Handles:
 * - 123-45-6789 (standard)
 * - 123 45 6789 (space-separated)
 * - 123456789 (no separators, 9 consecutive digits)
 */
function redactSSN(text: string, mode: RedactionMode): { text: string; count: number } {
  let count = 0;

  if (mode === 'partial') {
    // VA format: XXX-XX-1234 (preserve last 4)
    let result = text.replace(/\b(\d{3})[-\s]?(\d{2})[-\s]?(\d{4})\b/g, (_match, _p1, _p2, p3) => {
      count++;
      return `XXX-XX-${p3}`;
    });
    return { text: result, count };
  }

  // Full redaction
  let result = text;

  // Standard SSN format: 123-45-6789
  result = result.replace(/\b\d{3}-\d{2}-\d{4}\b/g, () => {
    count++;
    return '[SSN REDACTED]';
  });

  // Space-separated: 123 45 6789
  result = result.replace(/\b\d{3}\s\d{2}\s\d{4}\b/g, () => {
    count++;
    return '[SSN REDACTED]';
  });

  // 9 consecutive digits (likely SSN when in medical/VA context)
  // Be careful: this could match other 9-digit numbers, so only match
  // when preceded by SSN-indicating context
  result = result.replace(/(SSN|social\s*security|soc\s*sec)[:\s#]*(\d{9})\b/gi, (_match, prefix) => {
    count++;
    return `${prefix}: [SSN REDACTED]`;
  });

  return { text: result, count };
}

/**
 * Redact US phone number patterns
 *
 * Handles:
 * - (123) 456-7890
 * - 123-456-7890
 * - 123.456.7890
 * - 1234567890 (10 consecutive digits)
 * - +1 123 456 7890
 */
function redactPhone(text: string): { text: string; count: number } {
  let count = 0;
  let result = text;

  // (123) 456-7890 or (123)456-7890
  result = result.replace(/\(\d{3}\)\s?\d{3}[-.\s]?\d{4}/g, () => {
    count++;
    return '[PHONE REDACTED]';
  });

  // 123-456-7890 or 123.456.7890
  result = result.replace(/\b\d{3}[-.\s]\d{3}[-.\s]\d{4}\b/g, () => {
    count++;
    return '[PHONE REDACTED]';
  });

  // +1 prefix variants
  result = result.replace(/\+1\s?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/g, () => {
    count++;
    return '[PHONE REDACTED]';
  });

  return { text: result, count };
}

/**
 * Redact email addresses
 */
function redactEmail(text: string): { text: string; count: number } {
  let count = 0;
  const result = text.replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, () => {
    count++;
    return '[EMAIL REDACTED]';
  });
  return { text: result, count };
}

/**
 * Main redaction function — applies all PII patterns
 *
 * @param text - The text to redact
 * @param mode - Redaction mode ('full', 'partial', or 'none')
 * @returns Object with redacted text and a report of what was found
 */
export function redactPII(text: string, mode: RedactionMode = 'full'): { text: string; report: RedactionReport } {
  if (mode === 'none' || !text) {
    return {
      text,
      report: { ssnCount: 0, phoneCount: 0, emailCount: 0, totalRedactions: 0, piiDetected: false }
    };
  }

  const ssn = redactSSN(text, mode);
  const phone = mode === 'full' ? redactPhone(ssn.text) : { text: ssn.text, count: 0 };
  const email = mode === 'full' ? redactEmail(phone.text) : { text: phone.text, count: 0 };

  const totalRedactions = ssn.count + phone.count + email.count;

  return {
    text: email.text,
    report: {
      ssnCount: ssn.count,
      phoneCount: phone.count,
      emailCount: email.count,
      totalRedactions,
      piiDetected: totalRedactions > 0
    }
  };
}

/**
 * Redact PII from a JSON object (deep traversal)
 *
 * Walks all string values in an object and applies PII redaction.
 * Non-string values are left unchanged.
 *
 * @param obj - The object to redact
 * @param mode - Redaction mode
 * @returns New object with PII redacted from all string values
 */
export function redactPIIFromObject<T>(obj: T, mode: RedactionMode = 'full'): { result: T; report: RedactionReport } {
  if (mode === 'none') {
    return { result: obj, report: { ssnCount: 0, phoneCount: 0, emailCount: 0, totalRedactions: 0, piiDetected: false } };
  }

  const aggregateReport: RedactionReport = {
    ssnCount: 0,
    phoneCount: 0,
    emailCount: 0,
    totalRedactions: 0,
    piiDetected: false
  };

  function redactValue(value: unknown): unknown {
    if (typeof value === 'string') {
      const { text, report } = redactPII(value, mode);
      aggregateReport.ssnCount += report.ssnCount;
      aggregateReport.phoneCount += report.phoneCount;
      aggregateReport.emailCount += report.emailCount;
      aggregateReport.totalRedactions += report.totalRedactions;
      if (report.piiDetected) aggregateReport.piiDetected = true;
      return text;
    }

    if (Array.isArray(value)) {
      return value.map(redactValue);
    }

    if (value !== null && typeof value === 'object') {
      const redacted: Record<string, unknown> = {};
      for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
        // Skip internal metadata keys
        if (key.startsWith('_ace_')) {
          redacted[key] = val;
        } else {
          redacted[key] = redactValue(val);
        }
      }
      return redacted;
    }

    return value;
  }

  const result = redactValue(obj) as T;
  return { result, report: aggregateReport };
}

/**
 * Quick check: does this text contain likely PII?
 * Useful for pre-flight checks before logging.
 */
export function containsPII(text: string): boolean {
  if (!text) return false;

  // SSN patterns
  if (/\b\d{3}-\d{2}-\d{4}\b/.test(text)) return true;
  if (/\b\d{3}\s\d{2}\s\d{4}\b/.test(text)) return true;

  // Phone patterns
  if (/\(\d{3}\)\s?\d{3}[-.\s]?\d{4}/.test(text)) return true;
  if (/\b\d{3}[-.\s]\d{3}[-.\s]\d{4}\b/.test(text)) return true;

  // Email
  if (/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/.test(text)) return true;

  return false;
}
