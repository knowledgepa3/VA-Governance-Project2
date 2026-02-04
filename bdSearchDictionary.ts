/**
 * BD Search Dictionary
 *
 * Maps user-friendly search terms to SAM.gov API keywords
 * Expanded and refined for ACE Governance Platform capabilities
 *
 * ACE Platform Strengths:
 * - AI/ML Governance & Risk Management
 * - Browser Automation with Governance
 * - Compliance Documentation & Assessment
 * - VA Claims Processing (specialized)
 * - Process Automation Governance
 */

export interface SearchCategory {
  name: string;
  description: string;
  // Primary keyword for SAM.gov API (single, broad term works best)
  apiKeyword: string;
  // Related terms to look for in results
  relatedTerms: string[];
  // Client-side filter terms (score higher if found)
  boostTerms: string[];
}

/**
 * Pre-configured search categories for ACE Platform
 * Expanded with broader terms that still align with capabilities
 */
export const SEARCH_CATEGORIES: Record<string, SearchCategory> = {
  // === AI & AUTOMATION (Core ACE Strength) ===
  'ai': {
    name: 'AI/ML',
    description: 'Artificial Intelligence, Machine Learning, and Generative AI',
    apiKeyword: 'artificial intelligence',
    relatedTerms: [
      'artificial intelligence', 'machine learning', 'ai', 'ml',
      'generative ai', 'chatgpt', 'llm', 'large language model',
      'ai governance', 'ai ethics', 'ai risk', 'ai policy',
      'responsible ai', 'trustworthy ai', 'ai framework',
      'nist ai rmf', 'ai rmf', 'algorithmic', 'deep learning',
      'natural language', 'nlp', 'computer vision', 'predictive'
    ],
    boostTerms: [
      'governance', 'assessment', 'framework', 'policy', 'advisory',
      'risk management', 'compliance', 'evaluation', 'review', 'strategy'
    ]
  },

  'automation': {
    name: 'RPA/Automation',
    description: 'Process automation, RPA, and workflow optimization',
    apiKeyword: 'automation',
    relatedTerms: [
      'automation', 'rpa', 'robotic process', 'process automation',
      'workflow', 'intelligent automation', 'hyperautomation',
      'bot', 'digital worker', 'process improvement', 'efficiency',
      'workflow optimization', 'business process', 'bpm'
    ],
    boostTerms: [
      'governance', 'assessment', 'strategy', 'advisory',
      'review', 'risk', 'policy', 'framework', 'implementation'
    ]
  },

  // === CYBERSECURITY & COMPLIANCE ===
  'cybersecurity': {
    name: 'Cybersecurity',
    description: 'Security assessment, compliance, and advisory',
    apiKeyword: 'cybersecurity',
    relatedTerms: [
      'cybersecurity', 'cyber security', 'information security',
      'infosec', 'security assessment', 'vulnerability',
      'penetration test', 'security audit', 'security review',
      'zero trust', 'ztna', 'identity', 'access management',
      'security operations', 'soc', 'siem', 'threat', 'incident'
    ],
    boostTerms: [
      'assessment', 'review', 'audit', 'advisory', 'consulting',
      'policy', 'framework', 'compliance', 'analysis', 'support'
    ]
  },

  'compliance': {
    name: 'Compliance',
    description: 'Regulatory compliance, risk, and audit support',
    apiKeyword: 'compliance',
    relatedTerms: [
      'compliance', 'regulatory', 'audit', 'risk management',
      'risk assessment', 'controls', 'governance', 'grc',
      'internal controls', 'policy', 'procedure', 'sox', 'fisma',
      'oversight', 'monitoring', 'reporting', 'assurance'
    ],
    boostTerms: [
      'assessment', 'review', 'advisory', 'consulting', 'analysis',
      'gap analysis', 'readiness', 'remediation', 'support', 'services'
    ]
  },

  'fedramp': {
    name: 'FedRAMP',
    description: 'FedRAMP authorization and cloud security',
    apiKeyword: 'fedramp',
    relatedTerms: [
      'fedramp', 'fed ramp', 'federal risk', 'cloud security',
      'cloud authorization', '3pao', 'authorization', 'ato',
      'ssp', 'system security plan', 'poam', 'continuous monitoring',
      'cloud compliance', 'csp', 'cloud service'
    ],
    boostTerms: [
      'advisory', 'readiness', 'assessment', 'documentation',
      'review', 'gap analysis', 'support', 'consulting', 'preparation'
    ]
  },

  'cmmc': {
    name: 'CMMC',
    description: 'Cybersecurity Maturity Model Certification',
    apiKeyword: 'cmmc',
    relatedTerms: [
      'cmmc', 'cybersecurity maturity', 'dfars', 'nist 800-171',
      'cui', 'controlled unclassified', 'defense contractor',
      'dib', 'defense industrial base', 'sprs', 'supplier risk'
    ],
    boostTerms: [
      'assessment', 'readiness', 'gap analysis', 'advisory',
      'consulting', 'preparation', 'documentation', 'review', 'certification'
    ]
  },

  'nist': {
    name: 'NIST',
    description: 'NIST frameworks (RMF, CSF, AI RMF)',
    apiKeyword: 'nist',
    relatedTerms: [
      'nist', 'rmf', 'risk management framework', 'csf',
      'cybersecurity framework', '800-53', '800-171', 'sp 800',
      'security controls', 'control assessment', 'sca',
      'ai rmf', 'privacy framework'
    ],
    boostTerms: [
      'assessment', 'implementation', 'advisory', 'review',
      'gap analysis', 'documentation', 'consulting', 'support', 'compliance'
    ]
  },

  // === DATA & PRIVACY ===
  'data': {
    name: 'Data Gov',
    description: 'Data governance, quality, and management',
    apiKeyword: 'data governance',
    relatedTerms: [
      'data governance', 'data management', 'data quality',
      'data privacy', 'privacy', 'pii', 'gdpr', 'ccpa',
      'data protection', 'data classification', 'data catalog',
      'metadata', 'master data', 'data strategy', 'analytics'
    ],
    boostTerms: [
      'policy', 'framework', 'assessment', 'advisory', 'strategy',
      'review', 'consulting', 'analysis', 'roadmap', 'governance'
    ]
  },

  // === VA & BENEFITS (ACE Specialty) ===
  'va': {
    name: 'VA/Benefits',
    description: 'Veterans Affairs and benefits processing',
    apiKeyword: 'veterans',
    relatedTerms: [
      'veterans', 'va', 'veterans affairs', 'veteran', 'vba',
      'benefits', 'claims', 'disability', 'compensation',
      'pension', 'healthcare', 'vha', 'vet center'
    ],
    boostTerms: [
      'processing', 'automation', 'modernization', 'support',
      'services', 'technology', 'digital', 'assessment', 'improvement'
    ]
  },

  // === CLOUD & IT ===
  'cloud': {
    name: 'Cloud',
    description: 'Cloud strategy, migration, and governance',
    apiKeyword: 'cloud',
    relatedTerms: [
      'cloud', 'aws', 'azure', 'gcp', 'cloud computing',
      'cloud migration', 'cloud strategy', 'multi-cloud',
      'hybrid cloud', 'cloud security', 'cloud governance',
      'saas', 'paas', 'iaas', 'cloud native'
    ],
    boostTerms: [
      'strategy', 'advisory', 'assessment', 'governance',
      'architecture review', 'consulting', 'planning', 'migration'
    ]
  },

  'it': {
    name: 'IT Services',
    description: 'General IT consulting and modernization',
    apiKeyword: 'IT services',
    relatedTerms: [
      'information technology', 'it services', 'it consulting',
      'technology', 'digital', 'modernization', 'transformation',
      'enterprise', 'systems', 'software', 'it support'
    ],
    boostTerms: [
      'consulting', 'advisory', 'assessment', 'analysis',
      'strategy', 'planning', 'review', 'evaluation', 'services'
    ]
  },

  // === BROADER CATEGORIES ===
  'consulting': {
    name: 'Consulting',
    description: 'Management and technical consulting',
    apiKeyword: 'consulting services',
    relatedTerms: [
      'consulting', 'advisory', 'professional services',
      'management consulting', 'technical consulting',
      'subject matter expert', 'sme', 'expert services'
    ],
    boostTerms: [
      'assessment', 'analysis', 'review', 'strategy',
      'governance', 'policy', 'framework', 'support', 'services'
    ]
  },

  'assessment': {
    name: 'Assessment',
    description: 'Any type of assessment or evaluation',
    apiKeyword: 'assessment',
    relatedTerms: [
      'assessment', 'evaluation', 'analysis', 'review',
      'audit', 'inspection', 'examination', 'study',
      'gap analysis', 'maturity assessment', 'readiness'
    ],
    boostTerms: [
      'independent', 'third party', 'governance', 'compliance',
      'security', 'risk', 'controls', 'process', 'system'
    ]
  },

  'modernization': {
    name: 'Modernization',
    description: 'IT and process modernization initiatives',
    apiKeyword: 'modernization',
    relatedTerms: [
      'modernization', 'transformation', 'digital transformation',
      'legacy', 'upgrade', 'migration', 'innovation',
      'process improvement', 'optimization', 'efficiency'
    ],
    boostTerms: [
      'strategy', 'assessment', 'planning', 'roadmap',
      'advisory', 'consulting', 'support', 'services'
    ]
  },

  'small': {
    name: 'Small Biz',
    description: 'Small business set-asides',
    apiKeyword: 'small business',
    relatedTerms: [
      'small business', 'set aside', 'set-aside', '8a',
      'hubzone', 'sdvosb', 'vosb', 'wosb', 'edwosb',
      'small disadvantaged', 'sdb'
    ],
    boostTerms: [
      'total small business', 'sole source', 'simplified',
      'micro-purchase', 'under threshold'
    ]
  }
};

/**
 * Get search category by key or find best match
 */
export function getSearchCategory(searchTerm: string): SearchCategory | null {
  const term = searchTerm.toLowerCase().trim();

  // Direct match
  if (SEARCH_CATEGORIES[term]) {
    return SEARCH_CATEGORIES[term];
  }

  // Check related terms
  for (const [key, category] of Object.entries(SEARCH_CATEGORIES)) {
    if (category.relatedTerms.some(t => term.includes(t) || t.includes(term))) {
      return category;
    }
  }

  // Default to the search term itself as API keyword
  return {
    name: searchTerm,
    description: `Search for: ${searchTerm}`,
    apiKeyword: searchTerm,
    relatedTerms: [searchTerm.toLowerCase()],
    boostTerms: ['assessment', 'advisory', 'consulting', 'review', 'analysis', 'support', 'services']
  };
}

/**
 * Quick search presets for the UI - Expanded and reordered by relevance to ACE
 */
export const QUICK_SEARCH_PRESETS = [
  { key: 'ai', label: 'AI/ML' },
  { key: 'automation', label: 'RPA' },
  { key: 'cybersecurity', label: 'Cyber' },
  { key: 'compliance', label: 'Compliance' },
  { key: 'va', label: 'VA' },
  { key: 'assessment', label: 'Assessment' },
  { key: 'fedramp', label: 'FedRAMP' },
  { key: 'cmmc', label: 'CMMC' },
  { key: 'nist', label: 'NIST' },
  { key: 'data', label: 'Data' },
  { key: 'consulting', label: 'Consulting' },
  { key: 'modernization', label: 'Modern' },
  { key: 'cloud', label: 'Cloud' },
  { key: 'small', label: 'Small Biz' }
];

export default {
  SEARCH_CATEGORIES,
  getSearchCategory,
  QUICK_SEARCH_PRESETS
};
