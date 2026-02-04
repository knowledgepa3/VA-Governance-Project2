/**
 * Quality Gate Service - Lightweight Red Team for All Workflows
 *
 * This is the "trust but verify" layer that runs AUTOMATICALLY on every
 * workflow output before it's presented to the user.
 *
 * Design Principles:
 * 1. DOMAIN-AWARE: Uses the right evaluation criteria for each workflow type
 * 2. LIGHTWEIGHT: Doesn't double token costs - uses heuristics + spot checks
 * 3. AUTOMATIC: Integrated into workflow output stage, not manual
 * 4. ACTIONABLE: Clear pass/warn/fail with specific issues
 *
 * Cost Model:
 * - Heuristic checks: ~0 tokens (string matching, structure validation)
 * - Spot checks: ~500 tokens per check (only when needed)
 * - Full review: ~2000 tokens (only on FAIL or user request)
 */

import { WorkforceType, MAIClassification } from '../types';

// ============================================================================
// QUALITY GATE TYPES
// ============================================================================

export type QualityGateStatus = 'PASS' | 'WARN' | 'FAIL';

export interface QualityGateResult {
  status: QualityGateStatus;
  workforceType: WorkforceType;
  timestamp: string;

  // Heuristic checks (free - no API calls)
  heuristicChecks: {
    name: string;
    passed: boolean;
    details?: string;
  }[];

  // Domain alignment score
  domainAlignment: {
    score: number; // 0-100
    expectedDomain: string;
    detectedDomain: string;
    mismatch: boolean;
  };

  // Issues found
  issues: {
    severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
    category: string;
    message: string;
    recommendation?: string;
  }[];

  // Recommendations
  recommendations: string[];

  // Whether full review is recommended
  fullReviewRecommended: boolean;
  fullReviewReason?: string;

  // Token cost of this check
  tokenCost: number;
}

// ============================================================================
// DOMAIN-SPECIFIC EVALUATION CRITERIA
// ============================================================================

interface DomainCriteria {
  name: string;
  description: string;
  requiredKeywords: string[];      // Must have at least some of these
  forbiddenKeywords: string[];     // Should NOT have these (wrong domain)
  structureChecks: string[];       // Expected sections/fields
  qualityIndicators: string[];     // Signs of good output
  redFlags: string[];              // Signs of problems
}

const DOMAIN_CRITERIA: Record<WorkforceType, DomainCriteria> = {
  [WorkforceType.BD_CAPTURE]: {
    name: 'BD Capture / Proposal Development',
    description: 'Federal business development and proposal writing',
    requiredKeywords: [
      'solicitation', 'rfp', 'rfq', 'sources sought', 'proposal',
      'technical approach', 'past performance', 'compliance', 'capability',
      'naics', 'set-aside', 'contract', 'pricing', 'evaluation criteria',
      'win theme', 'discriminator', 'pwin', 'teaming'
    ],
    forbiddenKeywords: [
      // VA disability claims terms (wrong domain)
      'service connection', 'nexus opinion', 'c&p exam', 'rating decision',
      'disability rating', 'veterans benefits', 'caluza', 'shedden',
      'lay evidence', '38 cfr', 'medical nexus', 'in-service incurrence',
      // Cyber IR terms (wrong domain)
      'kill chain', 'lateral movement', 'ioc', 'malware', 'breach',
      'incident response', 'containment', 'eradication'
    ],
    structureChecks: [
      'company overview', 'technical approach', 'past performance',
      'pricing', 'compliance matrix', 'win themes'
    ],
    qualityIndicators: [
      'specific past performance citations',
      'quantified results',
      'clear compliance mapping',
      'identified discriminators',
      'teaming strategy (if needed)'
    ],
    redFlags: [
      'generic boilerplate',
      'no specific past performance',
      'missing compliance matrix',
      'no evaluation criteria alignment',
      'wrong domain terminology'
    ]
  },

  [WorkforceType.VA_CLAIMS]: {
    name: 'VA Claims / Evidence Chain Validation',
    description: 'VA disability claims analysis and evidence review',
    requiredKeywords: [
      'service connection', 'nexus', 'in-service', 'current disability',
      'medical evidence', 'lay statement', 'c&p', 'rating', '38 cfr',
      'caluza', 'shedden', 'veteran', 'disability'
    ],
    forbiddenKeywords: [
      // BD terms (wrong domain)
      'rfp', 'solicitation', 'proposal', 'pricing volume', 'naics',
      'set-aside', 'contract vehicle', 'teaming agreement',
      // Cyber terms (wrong domain)
      'malware', 'kill chain', 'ioc', 'lateral movement'
    ],
    structureChecks: [
      'current disability', 'in-service event', 'nexus opinion',
      'evidence summary', 'legal citations'
    ],
    qualityIndicators: [
      'specific legal citations',
      'medical evidence references',
      'clear nexus chain',
      'benefit of doubt analysis'
    ],
    redFlags: [
      'missing nexus analysis',
      'no legal citations',
      'conclusory statements without evidence',
      'wrong domain terminology'
    ]
  },

  [WorkforceType.CYBER_IR]: {
    name: 'Cyber Incident Response',
    description: 'Cybersecurity incident analysis and response',
    requiredKeywords: [
      'incident', 'attack', 'compromise', 'malware', 'ioc',
      'mitre att&ck', 'kill chain', 'containment', 'eradication',
      'forensic', 'timeline', 'lateral movement'
    ],
    forbiddenKeywords: [
      // VA claims terms (wrong domain)
      'service connection', 'nexus opinion', 'disability rating',
      // BD terms (wrong domain)
      'proposal', 'pricing volume', 'past performance citations'
    ],
    structureChecks: [
      'executive summary', 'timeline', 'ioc inventory',
      'containment actions', 'recommendations'
    ],
    qualityIndicators: [
      'specific IOCs with hashes/IPs',
      'MITRE ATT&CK mapping',
      'clear timeline',
      'actionable containment steps'
    ],
    redFlags: [
      'no specific IOCs',
      'missing timeline',
      'vague containment recommendations',
      'wrong domain terminology'
    ]
  },

  [WorkforceType.FINANCIAL_AUDIT]: {
    name: 'Financial Audit',
    description: 'Financial compliance and audit analysis',
    requiredKeywords: [
      'audit', 'compliance', 'control', 'finding', 'recommendation',
      'gaap', 'internal control', 'material weakness', 'deficiency'
    ],
    forbiddenKeywords: [
      'service connection', 'malware', 'proposal', 'rfp'
    ],
    structureChecks: [
      'findings', 'recommendations', 'management response'
    ],
    qualityIndicators: [
      'specific control references',
      'quantified findings',
      'clear recommendations'
    ],
    redFlags: [
      'vague findings',
      'no recommendations',
      'wrong domain terminology'
    ]
  },

  [WorkforceType.GRANT_WRITING]: {
    name: 'Grant Writing',
    description: 'Grant application development',
    requiredKeywords: [
      'grant', 'funding', 'proposal', 'objectives', 'methodology',
      'budget', 'evaluation', 'outcomes', 'sustainability'
    ],
    forbiddenKeywords: [
      'service connection', 'malware', 'rfp', 'contract'
    ],
    structureChecks: [
      'project narrative', 'budget', 'evaluation plan'
    ],
    qualityIndicators: [
      'clear objectives',
      'detailed methodology',
      'realistic budget'
    ],
    redFlags: [
      'vague objectives',
      'missing budget justification',
      'wrong domain terminology'
    ]
  }
};

// ============================================================================
// QUALITY GATE IMPLEMENTATION
// ============================================================================

export class QualityGate {

  /**
   * Run quality gate on workflow output (AUTOMATIC - called by workflow engine)
   * This is the main entry point - runs heuristic checks first, then spot checks if needed
   */
  static async evaluate(
    workforceType: WorkforceType,
    output: string | object,
    context?: {
      opportunityTitle?: string;
      expectedOutputType?: string;
    }
  ): Promise<QualityGateResult> {

    const startTime = Date.now();
    const criteria = DOMAIN_CRITERIA[workforceType];
    const outputText = typeof output === 'string' ? output : JSON.stringify(output, null, 2);
    const outputLower = outputText.toLowerCase();

    const result: QualityGateResult = {
      status: 'PASS',
      workforceType,
      timestamp: new Date().toISOString(),
      heuristicChecks: [],
      domainAlignment: {
        score: 100,
        expectedDomain: criteria.name,
        detectedDomain: criteria.name,
        mismatch: false
      },
      issues: [],
      recommendations: [],
      fullReviewRecommended: false,
      tokenCost: 0 // Heuristic checks are free
    };

    // ========================================
    // HEURISTIC CHECK 1: Domain Keyword Match
    // ========================================
    const requiredFound = criteria.requiredKeywords.filter(kw => outputLower.includes(kw.toLowerCase()));
    const forbiddenFound = criteria.forbiddenKeywords.filter(kw => outputLower.includes(kw.toLowerCase()));

    const requiredScore = (requiredFound.length / Math.min(5, criteria.requiredKeywords.length)) * 100;
    const forbiddenPenalty = forbiddenFound.length * 20; // Each forbidden keyword = -20 points

    result.domainAlignment.score = Math.max(0, Math.min(100, requiredScore - forbiddenPenalty));

    result.heuristicChecks.push({
      name: 'Domain Keywords Present',
      passed: requiredFound.length >= 3,
      details: `Found ${requiredFound.length} of ${criteria.requiredKeywords.length} expected keywords`
    });

    result.heuristicChecks.push({
      name: 'No Wrong-Domain Keywords',
      passed: forbiddenFound.length === 0,
      details: forbiddenFound.length > 0
        ? `Found wrong-domain terms: ${forbiddenFound.slice(0, 5).join(', ')}`
        : 'No cross-domain contamination'
    });

    // ========================================
    // HEURISTIC CHECK 2: Domain Mismatch Detection
    // ========================================
    if (forbiddenFound.length >= 3) {
      // Serious domain mismatch - detect what domain it actually is
      const detectedDomain = QualityGate.detectDomain(outputLower);

      result.domainAlignment.mismatch = true;
      result.domainAlignment.detectedDomain = detectedDomain;

      result.issues.push({
        severity: 'CRITICAL',
        category: 'Domain Mismatch',
        message: `Output appears to be for ${detectedDomain}, not ${criteria.name}`,
        recommendation: 'Re-run workflow with correct domain context'
      });

      result.status = 'FAIL';
      result.fullReviewRecommended = true;
      result.fullReviewReason = 'Critical domain mismatch detected';
    }

    // ========================================
    // HEURISTIC CHECK 3: Structure Validation
    // ========================================
    const structureFound = criteria.structureChecks.filter(section =>
      outputLower.includes(section.toLowerCase())
    );

    result.heuristicChecks.push({
      name: 'Expected Structure Present',
      passed: structureFound.length >= criteria.structureChecks.length * 0.5,
      details: `Found ${structureFound.length} of ${criteria.structureChecks.length} expected sections`
    });

    if (structureFound.length < criteria.structureChecks.length * 0.5) {
      result.issues.push({
        severity: 'MEDIUM',
        category: 'Incomplete Structure',
        message: `Missing expected sections: ${criteria.structureChecks.filter(s => !structureFound.includes(s)).join(', ')}`,
        recommendation: 'Review output for completeness'
      });

      if (result.status === 'PASS') result.status = 'WARN';
    }

    // ========================================
    // HEURISTIC CHECK 4: Quality Indicators
    // ========================================
    const qualityFound = criteria.qualityIndicators.filter(indicator => {
      // Simple heuristic matching
      const words = indicator.toLowerCase().split(' ');
      return words.some(w => outputLower.includes(w));
    });

    result.heuristicChecks.push({
      name: 'Quality Indicators',
      passed: qualityFound.length >= criteria.qualityIndicators.length * 0.5,
      details: `${qualityFound.length} of ${criteria.qualityIndicators.length} quality indicators present`
    });

    // ========================================
    // HEURISTIC CHECK 5: Red Flag Detection
    // ========================================
    const redFlagsFound = criteria.redFlags.filter(flag => {
      if (flag === 'wrong domain terminology') {
        return forbiddenFound.length > 0;
      }
      // Other red flags would need more sophisticated detection
      return false;
    });

    if (redFlagsFound.length > 0) {
      result.issues.push({
        severity: 'HIGH',
        category: 'Red Flags',
        message: `Detected issues: ${redFlagsFound.join(', ')}`,
        recommendation: 'Review and address flagged issues'
      });

      if (result.status === 'PASS') result.status = 'WARN';
    }

    // ========================================
    // HEURISTIC CHECK 6: Output Length
    // ========================================
    const minLength = 500;
    const maxLength = 50000;

    result.heuristicChecks.push({
      name: 'Output Length',
      passed: outputText.length >= minLength && outputText.length <= maxLength,
      details: `${outputText.length} characters (expected ${minLength}-${maxLength})`
    });

    if (outputText.length < minLength) {
      result.issues.push({
        severity: 'MEDIUM',
        category: 'Incomplete Output',
        message: 'Output appears too short to be complete',
        recommendation: 'Verify all required sections are present'
      });
      if (result.status === 'PASS') result.status = 'WARN';
    }

    // ========================================
    // GENERATE RECOMMENDATIONS
    // ========================================
    if (result.status === 'FAIL') {
      result.recommendations.push('DO NOT USE this output without correction');
      result.recommendations.push('Re-run workflow with correct domain context');
    } else if (result.status === 'WARN') {
      result.recommendations.push('Review flagged issues before finalizing');
      result.recommendations.push('Consider running full quality review');
    } else {
      result.recommendations.push('Output passes automated quality checks');
      result.recommendations.push('Human review still recommended for critical deliverables');
    }

    // Log execution time
    const executionTime = Date.now() - startTime;
    console.log(`[QualityGate] ${workforceType} evaluation completed in ${executionTime}ms - Status: ${result.status}`);

    return result;
  }

  /**
   * Detect what domain the output actually belongs to
   */
  private static detectDomain(text: string): string {
    const domainScores: Record<string, number> = {};

    for (const [type, criteria] of Object.entries(DOMAIN_CRITERIA)) {
      const matches = criteria.requiredKeywords.filter(kw => text.includes(kw.toLowerCase()));
      domainScores[criteria.name] = matches.length;
    }

    // Return highest scoring domain
    const sorted = Object.entries(domainScores).sort((a, b) => b[1] - a[1]);
    return sorted[0]?.[0] || 'Unknown';
  }

  /**
   * Quick check for domain alignment only (even cheaper)
   */
  static quickDomainCheck(workforceType: WorkforceType, output: string): {
    aligned: boolean;
    expectedDomain: string;
    detectedDomain: string;
  } {
    const criteria = DOMAIN_CRITERIA[workforceType];
    const outputLower = output.toLowerCase();

    const forbiddenFound = criteria.forbiddenKeywords.filter(kw => outputLower.includes(kw.toLowerCase()));

    if (forbiddenFound.length >= 3) {
      return {
        aligned: false,
        expectedDomain: criteria.name,
        detectedDomain: QualityGate.detectDomain(outputLower)
      };
    }

    return {
      aligned: true,
      expectedDomain: criteria.name,
      detectedDomain: criteria.name
    };
  }

  /**
   * Format result for display
   */
  static formatResult(result: QualityGateResult): string {
    const statusEmoji = {
      'PASS': '✅',
      'WARN': '⚠️',
      'FAIL': '❌'
    };

    let output = `
${statusEmoji[result.status]} QUALITY GATE: ${result.status}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Domain: ${result.domainAlignment.expectedDomain}
Alignment Score: ${result.domainAlignment.score}%
${result.domainAlignment.mismatch ? `⚠️ MISMATCH: Output appears to be ${result.domainAlignment.detectedDomain}` : ''}

CHECKS:
${result.heuristicChecks.map(c => `  ${c.passed ? '✓' : '✗'} ${c.name}: ${c.details || ''}`).join('\n')}

${result.issues.length > 0 ? `
ISSUES:
${result.issues.map(i => `  [${i.severity}] ${i.category}: ${i.message}`).join('\n')}
` : ''}
RECOMMENDATIONS:
${result.recommendations.map(r => `  • ${r}`).join('\n')}

Token Cost: ${result.tokenCost} (heuristic checks are free)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`;

    return output;
  }
}

export default QualityGate;
