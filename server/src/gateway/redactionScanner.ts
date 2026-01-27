/**
 * Redaction Scanner - Server-Side PII/PHI Detection
 *
 * CRITICAL: This scanner:
 * - Detects sensitive data patterns
 * - Returns ONLY metadata (positions, counts, patterns)
 * - NEVER returns actual PII/PHI values to the client
 * - All raw values stay server-side only
 *
 * The client receives:
 * - Category counts (e.g., "3 SSNs found")
 * - Redaction patterns (e.g., "***-**-****")
 * - Position metadata (page/line numbers)
 * - Signature hash for integrity
 */

import { Router, Request, Response } from 'express';
import { requireAuth, AuthenticatedRequest } from '../auth/middleware';
import { auditService } from '../audit/auditService';
import { logger, getCurrentCorrelationId } from '../logger';
import { hashObject, generateUUID, fingerprint } from '../utils/crypto';

const log = logger.child({ component: 'RedactionScanner' });

/**
 * PII/PHI category patterns
 */
const DETECTION_PATTERNS: Record<string, {
  regex: RegExp;
  redactionPattern: string;
  fieldType: string;
}[]> = {
  ssn: [
    {
      regex: /\b\d{3}-\d{2}-\d{4}\b/g,
      redactionPattern: '***-**-****',
      fieldType: 'ssn_full'
    },
    {
      regex: /\b\d{9}\b/g,
      redactionPattern: '*********',
      fieldType: 'ssn_nodash'
    }
  ],
  phone: [
    {
      regex: /\b\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g,
      redactionPattern: '(***) ***-****',
      fieldType: 'phone_us'
    }
  ],
  email: [
    {
      regex: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
      redactionPattern: '****@****.***',
      fieldType: 'email'
    }
  ],
  dates: [
    {
      regex: /\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/g,
      redactionPattern: '**/**/****',
      fieldType: 'date_mdy'
    },
    {
      regex: /\b\d{4}-\d{2}-\d{2}\b/g,
      redactionPattern: '****-**-**',
      fieldType: 'date_iso'
    }
  ],
  names: [
    // VA-specific name patterns
    {
      regex: /\bVeteran:\s*[A-Z][a-z]+\s+[A-Z][a-z]+\b/gi,
      redactionPattern: 'Veteran: [NAME]',
      fieldType: 'veteran_name'
    },
    {
      regex: /\bPatient:\s*[A-Z][a-z]+\s+[A-Z][a-z]+\b/gi,
      redactionPattern: 'Patient: [NAME]',
      fieldType: 'patient_name'
    }
  ],
  addresses: [
    {
      // Basic US address pattern
      regex: /\b\d{1,5}\s+[A-Za-z]+\s+(Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Drive|Dr|Lane|Ln)\b\.?/gi,
      redactionPattern: '[ADDRESS]',
      fieldType: 'street_address'
    }
  ],
  medical: [
    // ICD codes
    {
      regex: /\b[A-Z]\d{2}(\.\d{1,4})?\b/g,
      redactionPattern: '[ICD-CODE]',
      fieldType: 'icd_code'
    },
    // Common diagnosis keywords followed by content
    {
      regex: /\b(diagnosis|diagnosed with|condition|disorder|syndrome):\s*[^\n,]+/gi,
      redactionPattern: '[MEDICAL]',
      fieldType: 'diagnosis'
    }
  ],
  financial: [
    // VA claim numbers
    {
      regex: /\b\d{8,9}\b/g,
      redactionPattern: '[CLAIM-ID]',
      fieldType: 'claim_number'
    },
    // Account numbers
    {
      regex: /\baccount\s*#?\s*\d{6,}\b/gi,
      redactionPattern: 'Account [REDACTED]',
      fieldType: 'account_number'
    }
  ]
};

/**
 * Safe redaction result - NO raw PII values
 */
export interface SafeRedactionResult {
  documentId: string;
  documentName: string;
  scanTimestamp: string;
  correlationId: string;
  detected: boolean;
  totalCount: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  categories: {
    names: number;
    ssn: number;
    dates: number;
    addresses: number;
    phone: number;
    email: number;
    medical: number;
    financial: number;
    other: number;
  };
  redactionPositions: Array<{
    category: string;
    fieldType: string;
    pageNumber?: number;
    lineNumber?: number;
    characterRange?: { start: number; end: number };
    redactionPattern: string;
  }>;
  redactorVersion: string;
  policyVersion: string;
  signatureHash: string;
}

/**
 * Calculate risk level based on categories and counts
 */
function calculateRiskLevel(categories: SafeRedactionResult['categories']): SafeRedactionResult['riskLevel'] {
  // SSN or medical always critical
  if (categories.ssn > 0 || categories.medical > 0) {
    return 'CRITICAL';
  }

  // Multiple categories = high risk
  const categoriesWithData = Object.values(categories).filter(c => c > 0).length;
  if (categoriesWithData >= 3) {
    return 'HIGH';
  }

  // Financial or names = medium
  if (categories.financial > 0 || categories.names > 0) {
    return 'MEDIUM';
  }

  // Phone/email/dates only = low
  if (categories.phone > 0 || categories.email > 0 || categories.dates > 0) {
    return 'LOW';
  }

  return 'LOW';
}

/**
 * Scan text for PII/PHI - returns SAFE metadata only
 */
export function scanForPII(
  text: string,
  documentId: string,
  documentName: string
): SafeRedactionResult {
  const correlationId = getCurrentCorrelationId();
  const positions: SafeRedactionResult['redactionPositions'] = [];
  const categories: SafeRedactionResult['categories'] = {
    names: 0,
    ssn: 0,
    dates: 0,
    addresses: 0,
    phone: 0,
    email: 0,
    medical: 0,
    financial: 0,
    other: 0
  };

  // Split into lines for position tracking
  const lines = text.split('\n');

  // Scan each category
  for (const [category, patterns] of Object.entries(DETECTION_PATTERNS)) {
    for (const pattern of patterns) {
      // Reset regex
      pattern.regex.lastIndex = 0;

      let match;
      while ((match = pattern.regex.exec(text)) !== null) {
        // Count by category
        if (category in categories) {
          categories[category as keyof typeof categories]++;
        } else {
          categories.other++;
        }

        // Calculate line number
        let charCount = 0;
        let lineNumber = 1;
        for (const line of lines) {
          if (charCount + line.length >= match.index) {
            break;
          }
          charCount += line.length + 1; // +1 for newline
          lineNumber++;
        }

        // Add position metadata (NO actual value!)
        positions.push({
          category,
          fieldType: pattern.fieldType,
          lineNumber,
          characterRange: {
            start: match.index,
            end: match.index + match[0].length
          },
          redactionPattern: pattern.redactionPattern
        });
      }
    }
  }

  const totalCount = Object.values(categories).reduce((a, b) => a + b, 0);
  const riskLevel = calculateRiskLevel(categories);

  // Create result object
  const result: SafeRedactionResult = {
    documentId,
    documentName,
    scanTimestamp: new Date().toISOString(),
    correlationId,
    detected: totalCount > 0,
    totalCount,
    riskLevel,
    categories,
    redactionPositions: positions,
    redactorVersion: '1.0.0',
    policyVersion: '2024.1',
    signatureHash: '' // Will be set below
  };

  // Generate signature hash for integrity verification
  result.signatureHash = hashObject({
    documentId,
    totalCount,
    categories,
    positionCount: positions.length,
    timestamp: result.scanTimestamp
  });

  return result;
}

/**
 * Apply redactions to text (returns redacted text)
 */
export function applyRedactions(text: string): string {
  let redacted = text;

  for (const [, patterns] of Object.entries(DETECTION_PATTERNS)) {
    for (const pattern of patterns) {
      pattern.regex.lastIndex = 0;
      redacted = redacted.replace(pattern.regex, pattern.redactionPattern);
    }
  }

  return redacted;
}

/**
 * Create the redaction scanner router
 */
export function createRedactionRouter(): Router {
  const router = Router();

  /**
   * POST /api/redaction/scan
   * Scan document text for PII/PHI
   * Returns ONLY metadata, never raw values
   */
  router.post('/scan',
    requireAuth,
    async (req: Request, res: Response) => {
      const authReq = req as AuthenticatedRequest;
      const { text, documentId, documentName } = req.body;

      if (!text || typeof text !== 'string') {
        res.status(400).json({ error: 'text is required' });
        return;
      }

      const docId = documentId || generateUUID();
      const docName = documentName || 'Untitled Document';

      log.info('Scanning document for PII', {
        documentId: docId,
        documentLength: text.length,
        userId: authReq.userId
      });

      try {
        // Scan the text
        const result = scanForPII(text, docId, docName);

        // Audit the scan
        await auditService.append(
          {
            sub: authReq.userId,
            role: authReq.role,
            sessionId: authReq.sessionId,
            tenantId: authReq.tenantId
          },
          result.detected ? 'PII_DETECTED' : 'PII_SCAN_CLEAN',
          { type: 'document', id: docId },
          {
            documentName: docName,
            textLength: text.length,
            totalCount: result.totalCount,
            riskLevel: result.riskLevel,
            categories: result.categories,
            signatureHash: result.signatureHash
          }
        );

        log.info('PII scan complete', {
          documentId: docId,
          detected: result.detected,
          totalCount: result.totalCount,
          riskLevel: result.riskLevel
        });

        // Return SAFE result (no raw PII)
        res.json(result);

      } catch (error) {
        log.error('PII scan failed', { documentId: docId }, error as Error);
        res.status(500).json({ error: 'Scan failed' });
      }
    }
  );

  /**
   * POST /api/redaction/redact
   * Returns redacted text (PII replaced with patterns)
   */
  router.post('/redact',
    requireAuth,
    async (req: Request, res: Response) => {
      const authReq = req as AuthenticatedRequest;
      const { text, documentId } = req.body;

      if (!text || typeof text !== 'string') {
        res.status(400).json({ error: 'text is required' });
        return;
      }

      const docId = documentId || generateUUID();

      log.info('Redacting document', {
        documentId: docId,
        documentLength: text.length,
        userId: authReq.userId
      });

      try {
        // First scan to get stats
        const scanResult = scanForPII(text, docId, 'redaction');

        // Apply redactions
        const redactedText = applyRedactions(text);

        // Audit the redaction
        await auditService.append(
          {
            sub: authReq.userId,
            role: authReq.role,
            sessionId: authReq.sessionId,
            tenantId: authReq.tenantId
          },
          'PII_REDACTED',
          { type: 'document', id: docId },
          {
            originalLength: text.length,
            redactedLength: redactedText.length,
            totalRedactions: scanResult.totalCount,
            signatureHash: scanResult.signatureHash
          }
        );

        res.json({
          redactedText,
          stats: {
            totalRedactions: scanResult.totalCount,
            categories: scanResult.categories,
            riskLevel: scanResult.riskLevel
          }
        });

      } catch (error) {
        log.error('Redaction failed', { documentId: docId }, error as Error);
        res.status(500).json({ error: 'Redaction failed' });
      }
    }
  );

  return router;
}
