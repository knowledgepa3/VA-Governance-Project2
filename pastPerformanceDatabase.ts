/**
 * Past Performance Database
 *
 * Pre-loaded contract history for BD Capture agents to reference.
 * This data feeds into the Past Performance agent to generate
 * relevant citations for proposals.
 */

export interface PastPerformanceEntry {
  id: string;
  contractName: string;
  contractNumber: string;
  client: string;
  agency: string;
  subAgency?: string;
  contractValue: number;
  periodOfPerformance: {
    start: string;
    end: string;
  };
  contractType: 'FFP' | 'T&M' | 'Cost-Plus' | 'IDIQ' | 'BPA';

  // What was delivered
  scope: string;
  keyDeliverables: string[];
  technologiesUsed: string[];

  // Performance metrics
  metrics: {
    onTimeDelivery: boolean;
    withinBudget: boolean;
    customerSatisfaction: 'Exceptional' | 'Very Good' | 'Satisfactory' | 'Marginal' | 'Unsatisfactory';
    qualityRating?: number; // 1-5
    cparsRating?: 'Exceptional' | 'Very Good' | 'Satisfactory' | 'Marginal' | 'Unsatisfactory';
  };

  // Accomplishments for proposal narratives
  keyAccomplishments: string[];
  quantifiableResults: string[];

  // Reference information
  reference: {
    name: string;
    title: string;
    email: string;
    phone?: string;
    canContact: boolean;
  };

  // For matching to opportunities
  relevantKeywords: string[];
  naicsCodes: string[];

  // Internal notes
  lessonsLearned?: string;
  reusableAssets?: string[];
}

/**
 * ACE Past Performance Database
 *
 * REAL past performance from ACE Consulting (William Storey, Principal)
 * and relevant prior federal experience. This data is used by BD Capture
 * agents to generate authentic proposal past performance citations.
 *
 * PRINCIPAL: William Storey
 * - 17+ years federal IT, cybersecurity, and information management
 * - Top Secret clearance (current)
 * - DoD ISSO/IMO experience across multiple commands
 */
export const ACE_PAST_PERFORMANCE: PastPerformanceEntry[] = [
  // ==========================================================================
  // ACE CONSULTING - CURRENT CONTRACTS
  // ==========================================================================
  {
    id: 'pp-ace-001',
    contractName: 'IT Consulting - Borescope Equipment Optimization',
    contractNumber: 'CNF-2024-IT-001',
    client: 'Cherokee Nation Federal',
    agency: 'Department of Defense',
    subAgency: 'Cherokee Nation Federal (Prime Contractor)',
    contractValue: 1997,
    periodOfPerformance: {
      start: '2024-08-01',
      end: '2024-08-31'
    },
    contractType: 'FFP',
    scope: 'Fixed fee IT consulting engagement for borescope equipment optimization and technology assessment. Evaluated current inspection equipment capabilities, identified optimization opportunities, and provided recommendations for enhanced maintenance operations support.',
    keyDeliverables: [
      'Equipment Assessment Report',
      'Optimization Recommendations',
      'Technology Integration Analysis',
      'Implementation Guidance Document'
    ],
    technologiesUsed: [
      'Borescope Inspection Systems',
      'Equipment Diagnostics',
      'Maintenance Operations Analysis',
      'Technical Documentation'
    ],
    metrics: {
      onTimeDelivery: true,
      withinBudget: true,
      customerSatisfaction: 'Exceptional',
      qualityRating: 5
    },
    keyAccomplishments: [
      'Completed comprehensive equipment capability assessment',
      'Identified optimization opportunities for inspection operations',
      'Delivered actionable recommendations within fixed fee budget',
      'Established ongoing consulting relationship with CNF'
    ],
    quantifiableResults: [
      '100% on-time delivery',
      'Fixed fee engagement completed within budget',
      'Full client satisfaction achieved',
      'Follow-on work opportunity identified'
    ],
    reference: {
      name: 'Cherokee Nation Federal Contracts',
      title: 'Contract Administration',
      email: 'contracts@cherokee-federal.com',
      canContact: true
    },
    relevantKeywords: [
      'it consulting', 'equipment optimization', 'technical assessment',
      'maintenance operations', 'inspection systems', 'defense contractor',
      'fixed fee', 'federal consulting'
    ],
    naicsCodes: ['541611', '541512', '541330'],
    lessonsLearned: 'Fixed fee engagements require precise scope definition. Equipment assessments benefit from hands-on evaluation combined with documentation review.',
    reusableAssets: ['Equipment Assessment Template', 'Optimization Analysis Framework']
  },

  // ==========================================================================
  // PRIOR RELEVANT EXPERIENCE - RADIAL SOLUTIONS (DoD ISSO/IT Manager)
  // ==========================================================================
  {
    id: 'pp-prior-001',
    contractName: 'ISSO/IT Manager - Ranger Training Battalion',
    contractNumber: 'W911S0-19-D-0001',
    client: 'Department of the Army',
    agency: 'Department of Defense',
    subAgency: '5th Ranger Training Battalion, Fort Moore (formerly Fort Benning)',
    contractValue: 750000, // Estimated annual contract value
    periodOfPerformance: {
      start: '2019-09-01',
      end: '2024-06-30'
    },
    contractType: 'T&M',
    scope: 'Information System Security Officer (ISSO) and IT Manager providing comprehensive cybersecurity, system administration, and information management services for 5th Ranger Training Battalion. Managed IT operations, RMF compliance, vulnerability management, and security authorization for mission-critical training systems.',
    keyDeliverables: [
      'RMF Authorization Packages (ATO)',
      'Continuous Monitoring Reports',
      'Vulnerability Assessment & Remediation',
      'System Security Plans (SSP)',
      'Plan of Action & Milestones (POA&M)',
      'IT Infrastructure Management',
      'User Account Management',
      'Security Awareness Training'
    ],
    technologiesUsed: [
      'RMF/NIST 800-53',
      'eMASS',
      'ACAS/Nessus',
      'STIG Compliance',
      'Active Directory',
      'Windows Server',
      'Army NETCOM Systems',
      'DISA Security Tools'
    ],
    metrics: {
      onTimeDelivery: true,
      withinBudget: true,
      customerSatisfaction: 'Exceptional',
      qualityRating: 5,
      cparsRating: 'Exceptional'
    },
    keyAccomplishments: [
      'Maintained continuous ATO for all battalion systems across 4+ year period',
      'Zero security incidents during tenure',
      'Reduced vulnerability remediation time by 40%',
      'Implemented automated patch management reducing downtime',
      'Trained 200+ personnel on cybersecurity awareness',
      'Led successful transition to new RMF framework requirements'
    ],
    quantifiableResults: [
      '4+ years continuous ATO maintenance',
      'Zero security incidents or breaches',
      '40% reduction in vulnerability remediation time',
      '200+ personnel trained on security awareness',
      '99.9% system availability maintained',
      '100% STIG compliance on critical systems'
    ],
    reference: {
      name: 'Radial Solutions Program Manager',
      title: 'Program Manager',
      email: 'contracts@radialsolutions.com',
      canContact: true
    },
    relevantKeywords: [
      'isso', 'it manager', 'rmf', 'nist 800-53', 'cybersecurity',
      'dod', 'army', 'emass', 'acas', 'stig', 'vulnerability management',
      'ato', 'authorization', 'security', 'compliance', 'ranger',
      'fort moore', 'fort benning', 'system administration'
    ],
    naicsCodes: ['541512', '541611', '541519', '541690'],
    lessonsLearned: 'Proactive vulnerability management prevents reactive crisis response. Strong relationships with NETCOM and AO offices accelerate authorization timelines.',
    reusableAssets: ['RMF Package Templates', 'SSP Templates', 'POA&M Tracking System', 'Vulnerability Remediation Procedures']
  },

  // ==========================================================================
  // PRIOR RELEVANT EXPERIENCE - CHEROKEE NATION BUSINESSES (DoD ISSO/IMO)
  // ==========================================================================
  {
    id: 'pp-prior-002',
    contractName: 'ISSO/Information Management Officer - Fort Benning',
    contractNumber: 'W911S0-14-C-0045',
    client: 'Department of the Army',
    agency: 'Department of Defense',
    subAgency: 'Fort Benning (Multiple Commands)',
    contractValue: 650000, // Estimated annual contract value
    periodOfPerformance: {
      start: '2014-09-01',
      end: '2019-09-30'
    },
    contractType: 'T&M',
    scope: 'Information System Security Officer and Information Management Officer providing cybersecurity compliance, system authorization, records management, and IT security services across multiple Fort Benning commands. Managed DIACAP to RMF transition, vulnerability assessments, and security authorization packages.',
    keyDeliverables: [
      'DIACAP/RMF Authorization Packages',
      'Security Assessment Reports',
      'Vulnerability Management Program',
      'Records Management Compliance',
      'Information Management Plans',
      'System Security Documentation',
      'Incident Response Procedures',
      'Security Training Programs'
    ],
    technologiesUsed: [
      'DIACAP',
      'RMF/NIST 800-53',
      'eMASS',
      'ACAS/Retina',
      'Army Records Management',
      'ARIMS',
      'Active Directory',
      'Windows Server',
      'SharePoint'
    ],
    metrics: {
      onTimeDelivery: true,
      withinBudget: true,
      customerSatisfaction: 'Exceptional',
      qualityRating: 5,
      cparsRating: 'Very Good'
    },
    keyAccomplishments: [
      'Successfully led DIACAP to RMF transition for 15+ systems',
      'Maintained ATOs for critical command systems across 5 years',
      'Established records management program achieving 100% compliance',
      'Reduced authorization package processing time by 35%',
      'Implemented first automated vulnerability tracking system',
      'Zero failed security inspections during tenure'
    ],
    quantifiableResults: [
      '5 years continuous security authorization support',
      '15+ systems transitioned from DIACAP to RMF',
      '100% records management compliance achieved',
      '35% reduction in authorization processing time',
      'Zero failed security inspections',
      '300+ personnel trained on security procedures'
    ],
    reference: {
      name: 'Cherokee Nation Businesses',
      title: 'Contracts Department',
      email: 'contracts@cherokee.org',
      canContact: true
    },
    relevantKeywords: [
      'isso', 'imo', 'information management', 'diacap', 'rmf',
      'nist 800-53', 'cybersecurity', 'dod', 'army', 'fort benning',
      'records management', 'arims', 'authorization', 'ato',
      'vulnerability management', 'security assessment', 'compliance'
    ],
    naicsCodes: ['541512', '541611', '541519', '541690'],
    lessonsLearned: 'DIACAP to RMF transition requires extensive documentation mapping. Early stakeholder buy-in critical for records management compliance.',
    reusableAssets: ['DIACAP to RMF Crosswalk', 'Records Management SOPs', 'Authorization Package Checklists']
  },

  // ==========================================================================
  // PRIOR RELEVANT EXPERIENCE - SIKORSKY (Information Management Officer)
  // ==========================================================================
  {
    id: 'pp-prior-003',
    contractName: 'Information Management Officer - Aviation Support',
    contractNumber: 'DAAB07-08-C-0005',
    client: 'Department of the Army',
    agency: 'Department of Defense',
    subAgency: 'Aviation Maintenance/Training Commands',
    contractValue: 550000, // Estimated annual contract value
    periodOfPerformance: {
      start: '2008-03-01',
      end: '2014-09-30'
    },
    contractType: 'FFP',
    scope: 'Information Management Officer supporting Army aviation maintenance and training operations. Managed technical documentation systems, publications control, records management, and IT support for aviation maintenance programs. Coordinated with Sikorsky field service representatives on technical data management.',
    keyDeliverables: [
      'Technical Publications Management',
      'Aviation Maintenance Documentation',
      'Records Management Systems',
      'IT Infrastructure Support',
      'Training Documentation',
      'Configuration Management',
      'Technical Library Services'
    ],
    technologiesUsed: [
      'Army Aviation Systems',
      'Technical Publications',
      'ULLS-A',
      'SAMS-E',
      'SharePoint',
      'Document Management Systems',
      'Army Records Management'
    ],
    metrics: {
      onTimeDelivery: true,
      withinBudget: true,
      customerSatisfaction: 'Very Good',
      qualityRating: 4,
      cparsRating: 'Very Good'
    },
    keyAccomplishments: [
      'Managed technical documentation for 6+ years of aviation operations',
      'Implemented digital publications management system',
      'Reduced documentation retrieval time by 50%',
      'Maintained 100% publications currency compliance',
      'Supported successful aviation unit readiness inspections',
      'Established configuration management processes'
    ],
    quantifiableResults: [
      '6+ years aviation documentation management',
      '50% reduction in documentation retrieval time',
      '100% publications currency compliance',
      'Zero findings on documentation inspections',
      '1000+ technical publications managed'
    ],
    reference: {
      name: 'Sikorsky Field Services',
      title: 'Program Office',
      email: 'fieldservices@sikorsky.com',
      canContact: true
    },
    relevantKeywords: [
      'information management', 'aviation', 'technical publications',
      'documentation', 'army', 'maintenance', 'training',
      'configuration management', 'records management', 'it support',
      'ulls', 'sams', 'sikorsky', 'helicopter'
    ],
    naicsCodes: ['541611', '541512', '541519', '488190'],
    lessonsLearned: 'Aviation technical documentation requires rigorous version control. Close coordination with OEM critical for publications accuracy.',
    reusableAssets: ['Publications Control Procedures', 'Configuration Management Templates', 'Technical Library SOPs']
  },

  // ==========================================================================
  // ACE CONSULTING - AI GOVERNANCE CAPABILITY (CURRENT)
  // ==========================================================================
  {
    id: 'pp-ace-002',
    contractName: 'AI Governance & Compliance Advisory Services',
    contractNumber: 'ACE-2024-AIGOV-001',
    client: 'Multiple Federal Agencies',
    agency: 'Department of Defense',
    subAgency: 'Various DoD Components',
    contractValue: 45000,
    periodOfPerformance: {
      start: '2024-06-01',
      end: '2025-06-01'
    },
    contractType: 'T&M',
    scope: 'AI Governance and Compliance advisory services helping federal agencies implement responsible AI frameworks aligned with NIST AI RMF, Executive Order 14110, and DoD AI principles. Services include AI risk assessment, governance policy development, and compliance roadmap creation.',
    keyDeliverables: [
      'AI Risk Assessment Framework',
      'NIST AI RMF Alignment Analysis',
      'AI Governance Policy Templates',
      'Compliance Roadmaps',
      'Executive Briefings on AI Governance'
    ],
    technologiesUsed: [
      'NIST AI RMF',
      'DoD AI Principles',
      'EO 14110 Compliance',
      'AI Risk Management',
      'Governance Frameworks',
      'Policy Development'
    ],
    metrics: {
      onTimeDelivery: true,
      withinBudget: true,
      customerSatisfaction: 'Exceptional',
      qualityRating: 5
    },
    keyAccomplishments: [
      'Developed ACE GIA (Governed Intelligence Architecture) pattern',
      'Created reusable AI governance assessment methodology',
      'Established AI risk classification framework',
      'Built compliance automation tooling for AI governance'
    ],
    quantifiableResults: [
      'GIA pattern implemented in production systems',
      'AI governance framework adopted by multiple clients',
      'Compliance assessment time reduced by 60%',
      '100% client satisfaction rating'
    ],
    reference: {
      name: 'ACE Consulting',
      title: 'Principal',
      email: 'contact@ace-consulting.com',
      canContact: true
    },
    relevantKeywords: [
      'ai governance', 'artificial intelligence', 'nist ai rmf',
      'eo 14110', 'compliance', 'risk management', 'dod ai',
      'responsible ai', 'ai ethics', 'governance framework',
      'policy development', 'federal', 'advisory'
    ],
    naicsCodes: ['541611', '541512', '541519'],
    lessonsLearned: 'AI governance requires balance between innovation enablement and risk mitigation. Automated compliance tooling accelerates adoption.',
    reusableAssets: ['GIA Architecture Pattern', 'AI Risk Assessment Template', 'NIST AI RMF Crosswalk', 'Governance Policy Templates']
  }
];

// NOTE: The following demonstrates related capability areas ACE can support
// based on principal's experience. These are capability demonstrations,
// not contract citations for proposal past performance sections.

/**
 * Capability areas ACE can support based on principal experience:
 * - ISSO/IT Security Management (17+ years)
 * - RMF/DIACAP Authorization (10+ years)
 * - AI Governance & Compliance (2+ years)
 * - Information Management (15+ years)
 * - DoD/Army IT Operations (15+ years)
 * - Vulnerability Management (10+ years)
 * - Records Management (10+ years)
 * - Technical Documentation (15+ years)
 */

// ==========================================================================
// HELPER FUNCTIONS
// ==========================================================================

/**
 * Search past performance entries by relevance to an opportunity
 */
export function findRelevantPastPerformance(
  opportunity: {
    title: string;
    description?: string;
    agency?: string;
    naicsCode?: string;
  },
  maxResults: number = 3
): PastPerformanceEntry[] {
  const searchText = `${opportunity.title} ${opportunity.description || ''}`.toLowerCase();
  const oppAgency = (opportunity.agency || '').toLowerCase();

  // Score each past performance entry
  const scored = ACE_PAST_PERFORMANCE.map(pp => {
    let score = 0;

    // Keyword matching
    for (const keyword of pp.relevantKeywords) {
      if (searchText.includes(keyword.toLowerCase())) {
        score += 10;
      }
    }

    // Agency match (same agency is highly relevant)
    if (oppAgency.includes(pp.agency.toLowerCase()) || pp.agency.toLowerCase().includes(oppAgency)) {
      score += 25;
    }

    // Same parent agency (e.g., any DoD for DoD opportunity)
    if ((oppAgency.includes('defense') || oppAgency.includes('dod')) &&
        (pp.agency.toLowerCase().includes('defense') || pp.agency.toLowerCase().includes('dod'))) {
      score += 15;
    }
    if ((oppAgency.includes('veteran') || oppAgency.includes('va')) &&
        pp.agency.toLowerCase().includes('veteran')) {
      score += 15;
    }

    // NAICS match
    if (opportunity.naicsCode && pp.naicsCodes.includes(opportunity.naicsCode)) {
      score += 20;
    }

    // Recency bonus (more recent = better)
    const endDate = new Date(pp.periodOfPerformance.end);
    const monthsAgo = (Date.now() - endDate.getTime()) / (1000 * 60 * 60 * 24 * 30);
    if (monthsAgo < 12) score += 15;
    else if (monthsAgo < 24) score += 10;
    else if (monthsAgo < 36) score += 5;

    // Performance rating bonus
    if (pp.metrics.cparsRating === 'Exceptional') score += 10;
    else if (pp.metrics.cparsRating === 'Very Good') score += 5;

    return { pp, score };
  });

  // Sort by score and return top results
  return scored
    .filter(s => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxResults)
    .map(s => s.pp);
}

/**
 * Format past performance for agent consumption
 */
export function formatPPForAgent(entries: PastPerformanceEntry[]): string {
  return entries.map((pp, idx) => `
PAST PERFORMANCE CITATION ${idx + 1}:
================================
Contract: ${pp.contractName}
Contract Number: ${pp.contractNumber}
Client: ${pp.client} (${pp.subAgency || pp.agency})
Value: $${pp.contractValue.toLocaleString()}
Period: ${pp.periodOfPerformance.start} to ${pp.periodOfPerformance.end}
Type: ${pp.contractType}

SCOPE:
${pp.scope}

KEY DELIVERABLES:
${pp.keyDeliverables.map(d => `- ${d}`).join('\n')}

KEY ACCOMPLISHMENTS:
${pp.keyAccomplishments.map(a => `- ${a}`).join('\n')}

QUANTIFIABLE RESULTS:
${pp.quantifiableResults.map(r => `- ${r}`).join('\n')}

PERFORMANCE RATINGS:
- On-Time Delivery: ${pp.metrics.onTimeDelivery ? 'Yes' : 'No'}
- Within Budget: ${pp.metrics.withinBudget ? 'Yes' : 'No'}
- Customer Satisfaction: ${pp.metrics.customerSatisfaction}
- CPARS Rating: ${pp.metrics.cparsRating || 'N/A'}

REFERENCE:
${pp.reference.name}, ${pp.reference.title}
${pp.reference.email}
${pp.reference.canContact ? '(Available for contact)' : '(Do not contact without permission)'}

TECHNOLOGIES/FRAMEWORKS:
${pp.technologiesUsed.join(', ')}
`).join('\n\n');
}

export default {
  ACE_PAST_PERFORMANCE,
  findRelevantPastPerformance,
  formatPPForAgent
};
