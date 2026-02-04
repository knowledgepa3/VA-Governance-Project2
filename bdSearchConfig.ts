/**
 * BD Search Configuration
 * Micro-Purchase & Simplified Acquisition Strategy
 *
 * Target: Solo-safe, governance-focused federal opportunities
 * Dollar Range: $5K - $100K (micro-purchases & simplified acquisitions)
 * Focus: Assessment, validation, advisory - NOT operations
 */

export interface BDSearchFilters {
  // Dollar thresholds
  minValue: number;
  maxValue: number;

  // Include keywords (opportunities MUST contain at least one)
  includeKeywords: string[];

  // Exclude keywords (auto-reject if found)
  excludeKeywords: string[];

  // NAICS codes to target
  targetNAICS: string[];

  // Set-aside preferences
  setAsideTypes: string[];

  // Classification requirements
  maxClassification: 'UNCLASSIFIED' | 'CUI' | 'SECRET' | 'TOP_SECRET';
}

/**
 * MICRO-PURCHASE STRATEGY
 * Solo-safe governance consulting opportunities
 */
export const MICRO_PURCHASE_FILTERS: BDSearchFilters = {
  // Sweet spot: $5K - $25K (true micro-purchases)
  minValue: 5000,
  maxValue: 25000,

  includeKeywords: [
    // Governance & Compliance
    'governance',
    'compliance',
    'assessment',
    'validation',
    'audit',
    'review',

    // Advisory & Analysis
    'advisory',
    'analysis',
    'evaluation',
    'recommendation',
    'framework',
    'policy',

    // AI/Automation specific
    'ai governance',
    'artificial intelligence',
    'machine learning',
    'automation',
    'risk management',

    // Control & Security
    'control',
    'oversight',
    'nist',
    'rmf',
    'fedramp',
    'cmmc',

    // Pilot & Innovation
    'pilot',
    'prototype',
    'proof of concept',
    'innovation',
    'emerging technology',

    // Small buy indicators
    'market research',
    'rfi',
    'sources sought',
    'readiness assessment',
    'controls assessment',
    'ato support',
    'policy review',
    'sop',
    'playbook',
    'documentation'
  ],

  excludeKeywords: [
    // Operations (avoid)
    'operate',
    'maintain',
    'maintenance',
    '24/7',
    '24x7',
    'production environment',
    'help desk',
    'service desk',
    'on call',
    'after hours',
    'shift',
    'rotating',
    'incident response 24/7',

    // Staffing traps
    'staff augmentation',
    'full-time',
    'on-site required',
    'facility clearance',
    'scif',
    'travel required',

    // Privileged access (ops trap)
    'privileged access',
    'administrator',
    'domain admin',
    'system admin',

    // Infrastructure (avoid)
    'hosting',
    'data center',
    'cloud migration',
    'network operations',

    // Classified work
    'top secret',
    'ts/sci',
    'secret clearance required',
    'polygraph',
    'clearance required',

    // Large program indicators
    'idiq',
    'bpa',
    'gwac',
    'multiple award'
  ],

  targetNAICS: [
    '541611', // Administrative Management Consulting
    '541612', // Human Resources Consulting
    '541618', // Other Management Consulting
    '541690', // Other Scientific & Technical Consulting
    '541990', // Other Professional Services
    '541519', // Other Computer Related Services
    '541512', // Computer Systems Design
    '518210', // Data Processing & Hosting (for advisory only)
    '561499'  // Other Business Support Services
  ],

  setAsideTypes: [
    'Total Small Business',
    'SBA Certified Small Disadvantaged Business',
    '8(a)',
    'SDVOSB',
    'WOSB',
    'HUBZone'
  ],

  maxClassification: 'UNCLASSIFIED'
};

/**
 * SIMPLIFIED ACQUISITION STRATEGY
 * Slightly larger but still solo-manageable
 */
export const SIMPLIFIED_ACQUISITION_FILTERS: BDSearchFilters = {
  // Range: $25K - $100K
  minValue: 25000,
  maxValue: 100000,

  includeKeywords: [
    ...MICRO_PURCHASE_FILTERS.includeKeywords,
    // Additional for slightly larger scopes
    'independent assessment',
    'third party review',
    'gap analysis',
    'readiness assessment',
    'maturity assessment',
    'capability assessment',
    'process improvement',
    'strategic planning',
    'roadmap development'
  ],

  excludeKeywords: MICRO_PURCHASE_FILTERS.excludeKeywords,
  targetNAICS: MICRO_PURCHASE_FILTERS.targetNAICS,
  setAsideTypes: MICRO_PURCHASE_FILTERS.setAsideTypes,
  maxClassification: 'CUI' // Can handle CUI at this level
};

/**
 * COMBINED STRATEGY (Default)
 * Broader range to catch more opportunities - let scoring do the filtering
 */
export const DEFAULT_BD_FILTERS: BDSearchFilters = {
  minValue: 0,           // Don't filter by min - some early-stage opps don't show value
  maxValue: 250000,      // Expanded to catch more simplified acquisitions
  includeKeywords: SIMPLIFIED_ACQUISITION_FILTERS.includeKeywords,
  excludeKeywords: MICRO_PURCHASE_FILTERS.excludeKeywords,
  targetNAICS: MICRO_PURCHASE_FILTERS.targetNAICS,
  setAsideTypes: MICRO_PURCHASE_FILTERS.setAsideTypes,
  maxClassification: 'CUI'
};

/**
 * Risk flags - Don't auto-reject, but raise visibility
 * These can go either way - need human review
 */
export const RISK_FLAGS = [
  'fedramp',           // Can be doc-only (good) or heavy ops (bad)
  'cmmc',              // Can be assessment-only (good) or implementation (bad)
  'public trust',      // Often fine, but slows you down
  'ato',               // Can be doc support (good) or full ops (bad)
  'continuous monitoring', // Often ops, but sometimes just reporting
  'option year',       // Signals ongoing commitment
  'base year',         // Signals multi-year
  'period of performance', // Check duration
  'level of effort',   // Can signal staffing expectation
  'key personnel'      // Usually means they want bodies
];

/**
 * Score an opportunity against filters
 * Returns 0-100 score, higher = better match
 */
export function scoreOpportunity(
  opportunity: {
    title: string;
    description: string;
    estimatedValue?: number;
    naicsCode?: string;
    setAsideType?: string;
    classificationLevel?: string;
  },
  filters: BDSearchFilters = DEFAULT_BD_FILTERS
): { score: number; reasons: string[]; riskFlags: string[]; disqualified: boolean; disqualifyReason?: string } {

  const reasons: string[] = [];
  const riskFlags: string[] = [];
  let score = 40; // Start slightly below neutral for more differentiation

  const combinedText = `${opportunity.title} ${opportunity.description}`.toLowerCase();

  // Check for risk flags first (don't reject, just flag)
  for (const flag of RISK_FLAGS) {
    if (combinedText.includes(flag.toLowerCase())) {
      riskFlags.push(flag);
    }
  }

  // Check for disqualifying keywords first
  for (const keyword of filters.excludeKeywords) {
    if (combinedText.includes(keyword.toLowerCase())) {
      return {
        score: 0,
        reasons: [],
        riskFlags,
        disqualified: true,
        disqualifyReason: `Contains excluded keyword: "${keyword}"`
      };
    }
  }

  // Score based on dollar range - DON'T disqualify, just score lower
  if (opportunity.estimatedValue) {
    if (opportunity.estimatedValue <= 10000) {
      score += 20;
      reasons.push('Micro-purchase (<$10K) - fast procurement');
    } else if (opportunity.estimatedValue <= 25000) {
      score += 18;
      reasons.push('Micro-purchase range ($10-25K)');
    } else if (opportunity.estimatedValue <= 50000) {
      score += 15;
      reasons.push('Low simplified acquisition ($25-50K)');
    } else if (opportunity.estimatedValue <= 100000) {
      score += 12;
      reasons.push('Simplified acquisition ($50-100K)');
    } else if (opportunity.estimatedValue <= 250000) {
      score += 8;
      reasons.push('Upper simplified ($100-250K)');
    } else {
      score += 3;
      reasons.push('Above simplified threshold (>$250K) - review carefully');
    }
  } else {
    // No value listed - common for RFIs and Sources Sought, don't penalize
    score += 10;
    reasons.push('Value TBD (early-stage opportunity)');
  }

  // Score include keywords (more matches = better)
  let keywordMatches = 0;
  for (const keyword of filters.includeKeywords) {
    if (combinedText.includes(keyword.toLowerCase())) {
      keywordMatches++;
    }
  }

  // Don't disqualify for zero keyword matches - let user see all results from search
  // Just score them lower

  // Keyword bonus - more matches = much better score
  // First match is big (proves relevance), additional matches add incrementally
  const keywordBonus = keywordMatches === 1 ? 15 :
                       keywordMatches === 2 ? 25 :
                       keywordMatches === 3 ? 32 :
                       Math.min(35 + (keywordMatches - 3) * 2, 45); // Cap at 45
  score += keywordBonus;
  reasons.push(`${keywordMatches} target keyword(s) matched`);

  // NAICS match - BONUS POINTS, not hard gate (many listings have sloppy NAICS)
  if (opportunity.naicsCode && filters.targetNAICS.includes(opportunity.naicsCode)) {
    score += 10;
    reasons.push(`Target NAICS: ${opportunity.naicsCode}`);
  }

  // Set-aside bonus
  if (opportunity.setAsideType && filters.setAsideTypes.some(s =>
    opportunity.setAsideType?.toLowerCase().includes(s.toLowerCase())
  )) {
    score += 10;
    reasons.push(`Favorable set-aside: ${opportunity.setAsideType}`);
  }

  // Risk flags reduce score slightly but don't disqualify
  if (riskFlags.length > 0) {
    score -= riskFlags.length * 3;
    reasons.push(`${riskFlags.length} risk flag(s) - review needed`);
  }

  // Cap score at 100, floor at 0
  score = Math.max(0, Math.min(score, 100));

  return {
    score,
    reasons,
    riskFlags,
    disqualified: false
  };
}

/**
 * Solo-safe scope indicators
 * These phrases suggest the work can be done by one person
 */
export const SOLO_SAFE_INDICATORS = [
  'independent assessment',
  'third party review',
  'advisory services',
  'consulting services',
  'subject matter expert',
  'sme support',
  'analysis and recommendations',
  'policy review',
  'framework assessment',
  'gap analysis',
  'maturity assessment',
  'readiness review',
  'compliance review',
  'governance review',
  'risk assessment',
  'control assessment',
  'process documentation',
  'strategic advisory',
  'technical advisory'
];

/**
 * Red flags that suggest scope creep or ops trap
 */
export const SCOPE_CREEP_RED_FLAGS = [
  'and maintain',
  'ongoing support',
  'continuous monitoring',
  'annual support',
  'option years',
  'base + option',
  'full lifecycle',
  'implementation and operations',
  'design build operate',
  'turnkey solution'
];

export default {
  MICRO_PURCHASE_FILTERS,
  SIMPLIFIED_ACQUISITION_FILTERS,
  DEFAULT_BD_FILTERS,
  scoreOpportunity,
  SOLO_SAFE_INDICATORS,
  SCOPE_CREEP_RED_FLAGS
};
