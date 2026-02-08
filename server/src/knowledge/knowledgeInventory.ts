/**
 * Knowledge Base Inventory
 *
 * Static manifest of the knowledge module (lives at /knowledge/).
 * The knowledge directory is outside the server's TypeScript compilation
 * unit (rootDir: ./src), so we can't import from it directly.
 *
 * This is a PURE INVENTORY — tells operators what knowledge bases exist
 * and what query functions are available. No new business logic.
 *
 * If the knowledge module changes, update the manifest here.
 */

// ═══════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════

export interface KnowledgeBase {
  name: string;
  description: string;
  category: string;
  source: string;
  entryCount: number;
}

export interface KnowledgeInventory {
  bases: KnowledgeBase[];
  totalEntries: number;
  categories: string[];
  queryFunctions: string[];
  sourceDirectory: string;
  loadedAt: string;
}

// ═══════════════════════════════════════════════════════════════════
// STATIC MANIFEST
// ═══════════════════════════════════════════════════════════════════

const KNOWLEDGE_BASES: KnowledgeBase[] = [
  // From vaLegalKnowledge.ts exports
  {
    name: 'Core Legal Principles',
    description: 'Benefit of Doubt, Duty to Assist, Pro-Claimant, Every Theory',
    category: 'Legal Principles',
    source: 'vaLegalKnowledge.ts → CORE_PRINCIPLES',
    entryCount: 4,
  },
  {
    name: 'Federal Circuit Cases',
    description: 'Landmark CAVC and Federal Circuit case law citations',
    category: 'Case Law',
    source: 'vaLegalKnowledge.ts → FEDERAL_CIRCUIT_CASES',
    entryCount: 12,
  },
  {
    name: 'M21-1 References',
    description: 'VA Adjudication Procedures Manual section references',
    category: 'Procedures',
    source: 'vaLegalKnowledge.ts → M21_1_REFERENCES',
    entryCount: 8,
  },
  {
    name: 'Rating Schedule',
    description: '38 CFR Part 4 disability rating criteria by condition',
    category: 'Rating Criteria',
    source: 'vaLegalKnowledge.ts → RATING_SCHEDULE',
    entryCount: 15,
  },
  {
    name: 'Secondary SC Chains',
    description: 'Common secondary service connection condition chains',
    category: 'Service Connection',
    source: 'vaLegalKnowledge.ts → SECONDARY_SC_CHAINS',
    entryCount: 10,
  },
  {
    name: 'CUE Error Types',
    description: 'Clear and Unmistakable Error analysis categories',
    category: 'CUE Analysis',
    source: 'vaLegalKnowledge.ts → CUE_ERROR_TYPES',
    entryCount: 4,
  },
  {
    name: 'Effective Date Rules',
    description: 'Effective date calculation rules by claim type',
    category: 'Effective Dates',
    source: 'vaLegalKnowledge.ts → EFFECTIVE_DATE_RULES',
    entryCount: 6,
  },
  {
    name: 'Agent Knowledge Prompts',
    description: 'Per-agent-type specialized legal knowledge injections',
    category: 'Agent Prompts',
    source: 'vaLegalKnowledge.ts → AGENT_KNOWLEDGE_PROMPTS',
    entryCount: 6,
  },
  // Standalone JSON knowledge files
  {
    name: 'Mental Health Rating Criteria',
    description: '38 CFR 4.130 — rating levels and diagnostic codes for mental health',
    category: 'Detailed Rating Criteria',
    source: 'va-rating-criteria/mental-health.json',
    entryCount: 1,
  },
  {
    name: 'Spine Rating Criteria',
    description: '38 CFR 4.71a — spine rating formula and diagnostic codes',
    category: 'Detailed Rating Criteria',
    source: 'va-rating-criteria/spine.json',
    entryCount: 1,
  },
  {
    name: 'Knee Rating Criteria',
    description: '38 CFR 4.71a — knee diagnostic codes and rating levels',
    category: 'Detailed Rating Criteria',
    source: 'va-rating-criteria/knee.json',
    entryCount: 1,
  },
  {
    name: 'CUE Legal Standard',
    description: '38 CFR 3.105 — three-part CUE test and analysis patterns',
    category: 'CUE Standards',
    source: 'cue-standards/cue-legal-standard.json',
    entryCount: 1,
  },
  {
    name: 'Duty to Assist Checklist',
    description: '38 CFR 3.159 — DTA compliance analysis steps',
    category: 'DTA Checklist',
    source: 'duty-to-assist/checklist.json',
    entryCount: 1,
  },
];

const QUERY_FUNCTIONS = [
  'getLegalKnowledgePrompt(agentType)',
  'getCaseLawCitation(topic)',
  'getRatingCriteria(conditionType)',
  'getSecondaryConditions(primaryCondition)',
  'getCUEErrorTypes()',
  'getEffectiveDateRule(claimType)',
  'getAnalystCertification()',
  'getNonMedicalExpertQualification()',
];

// ═══════════════════════════════════════════════════════════════════
// INVENTORY FUNCTION
// ═══════════════════════════════════════════════════════════════════

export function getKnowledgeInventory(): KnowledgeInventory {
  const totalEntries = KNOWLEDGE_BASES.reduce((sum, b) => sum + b.entryCount, 0);
  const categories = [...new Set(KNOWLEDGE_BASES.map(b => b.category))].sort();

  return {
    bases: KNOWLEDGE_BASES,
    totalEntries,
    categories,
    queryFunctions: QUERY_FUNCTIONS,
    sourceDirectory: 'knowledge/',
    loadedAt: new Date().toISOString(),
  };
}
