/**
 * Onboarding Governance Module
 *
 * Extracted pure governance functions from gia-mcp-server for use
 * in the onboarding configuration endpoint. These are stateless
 * classification engines — no MCP transport needed.
 *
 * Source: gia-mcp-server/src/index.ts (classifyDecision, assessRiskTier)
 */

// ═══════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════

type MAILevel = 'MANDATORY' | 'ADVISORY' | 'INFORMATIONAL';
type RiskTier = 'UNACCEPTABLE' | 'HIGH' | 'LIMITED' | 'MINIMAL';

export interface MAIClassificationResult {
  classification: MAILevel;
  confidence: number;
  rationale: string;
  gate_required: boolean;
  evidence_requirements: string[];
}

export interface RiskTierResult {
  risk_tier: RiskTier;
  rationale: string;
  governance_requirements: string[];
  documentation_requirements: string[];
  prohibited: boolean;
}

export interface WorkforceMapping {
  matchedType: string | null;
  matchConfidence: number;
  matchRationale: string;
  isCustom: boolean;
  pipelineName: string;
  roles: string[];
  description: string;
  primaryUrl: string;
}

// ═══════════════════════════════════════════════════════════════════
// WORKFORCE TEMPLATES (mirrors constants.ts WorkforceType definitions)
// ═══════════════════════════════════════════════════════════════════

const WORKFORCE_TEMPLATES: Record<string, { name: string; roles: string[]; description: string; primaryUrl: string }> = {
  VA_CLAIMS: {
    name: 'VA Forensic Evidence Analysis',
    roles: ['Gateway', 'Timeline Builder', 'Evidence Validator', 'Initial Rater', 'C&P Examiner', 'Rater Decision', 'QA', 'Report Generator', 'Telemetry'],
    description: 'Multi-agent pipeline for VA disability claims evidence analysis and rating support',
    primaryUrl: '/app'
  },
  FINANCIAL_AUDIT: {
    name: 'Corporate Integrity (Audit/Tax)',
    roles: ['Gateway', 'Ledger Auditor', 'Fraud Detector', 'Tax Compliance', 'Financial QA', 'Financial Report Generator', 'Telemetry'],
    description: 'Financial auditing, fraud detection, and tax compliance analysis pipeline',
    primaryUrl: '/app'
  },
  CYBER_IR: {
    name: 'Cyber Incident Response (Kill Chain Validation)',
    roles: ['Cyber Triage', 'Kill Chain Analyzer', 'IOC Validator', 'Lateral Movement Tracker', 'Compliance Mapper', 'Threat Intel Correlator', 'Containment Advisor', 'Cyber QA', 'IR Report Generator', 'Telemetry'],
    description: 'Cybersecurity incident response with MITRE ATT&CK mapping and forensic analysis',
    primaryUrl: '/app'
  },
  BD_CAPTURE: {
    name: 'BD Capture (Proposal Development)',
    roles: ['RFP Analyzer', 'Compliance Matrix', 'Past Performance', 'Technical Writer', 'Pricing Analyst', 'Proposal QA', 'Proposal Assembler', 'Telemetry'],
    description: 'Government and commercial proposal development with RFP compliance tracking',
    primaryUrl: '/bd'
  },
  GRANT_WRITING: {
    name: 'Federal Grant Application',
    roles: ['Grant Opportunity Analyzer', 'Eligibility Validator', 'Narrative Writer', 'Budget Developer', 'Compliance Checker', 'Evaluator Lens', 'Grant QA', 'Application Assembler', 'Telemetry'],
    description: 'Federal grant proposal development with NOFO parsing and compliance validation',
    primaryUrl: '/app'
  }
};

// ═══════════════════════════════════════════════════════════════════
// MAI CLASSIFICATION ENGINE (from MCP server lines 179-272)
// ═══════════════════════════════════════════════════════════════════

export function classifyDecision(params: {
  decision: string;
  domain?: string;
  has_financial_impact?: boolean;
  has_legal_impact?: boolean;
  is_client_facing?: boolean;
}): MAIClassificationResult {
  const { decision, domain, has_financial_impact, has_legal_impact, is_client_facing } = params;
  const dl = decision.toLowerCase();

  const mandatoryPatterns = [
    /delet|remov|destroy|drop|purg/,
    /send.*email|post.*public|publish|broadcast/,
    /payment|billing|invoice|charg|refund/,
    /hipaa|phi|pii.*export|ssn|social.?security/,
    /deploy.*prod|release.*live|push.*main/,
    /grant.*access|revoke.*permission|change.*role/,
    /veteran.*record|disability.*rating|claim.*decision/,
    /legal.*filing|court.*submission|regulatory.*report/,
  ];

  const advisoryPatterns = [
    /search|query|lookup|find|filter/,
    /rank|sort|prioritize|score/,
    /recommend|suggest|propose/,
    /draft|preview|review/,
    /summariz|extract|analyz/,
  ];

  let classification: MAILevel = 'INFORMATIONAL';
  let confidence = 0.85;
  let rationale = '';
  const evidence: string[] = [];

  if (has_financial_impact || has_legal_impact) {
    classification = 'MANDATORY';
    confidence = 0.95;
    rationale = 'Financial or legal impact requires human approval gate';
    evidence.push('Financial/legal impact attestation', 'Approval signature', 'Audit hash');
  } else if (mandatoryPatterns.some(p => p.test(dl))) {
    classification = 'MANDATORY';
    confidence = 0.92;
    rationale = `Decision pattern matches MANDATORY threshold: "${decision.slice(0, 60)}..."`;
    evidence.push('Decision hash', 'Gate approval record', 'Operator attestation');
  } else if (is_client_facing) {
    classification = 'MANDATORY';
    confidence = 0.88;
    rationale = 'Client-facing actions require human review before execution';
    evidence.push('Client-facing attestation', 'Review signature', 'Output hash');
  } else if (advisoryPatterns.some(p => p.test(dl))) {
    classification = 'ADVISORY';
    confidence = 0.9;
    rationale = 'Action logged with recommendation; human can override';
    evidence.push('Decision hash', 'Recommendation log');
  } else {
    classification = 'INFORMATIONAL';
    confidence = 0.85;
    rationale = 'Status/reporting action — audit trail only, no gate needed';
    evidence.push('Timestamp', 'Operation hash');
  }

  // Domain-specific escalation
  if (domain) {
    const domainLower = domain.toLowerCase();
    if (['healthcare', 'va', 'veterans', 'medical', 'legal', 'finance', 'defense'].some(d => domainLower.includes(d))) {
      if (classification === 'INFORMATIONAL') {
        classification = 'ADVISORY';
        confidence = Math.min(confidence + 0.05, 0.99);
        rationale += ' [Escalated: regulated domain]';
      }
    }
  }

  return { classification, confidence, rationale, gate_required: classification === 'MANDATORY', evidence_requirements: evidence };
}

// ═══════════════════════════════════════════════════════════════════
// EU AI ACT RISK ASSESSMENT (from MCP server lines 394-495)
// ═══════════════════════════════════════════════════════════════════

export function assessRiskTier(params: {
  system_description: string;
  domain?: string;
  autonomous_decisions?: boolean;
  affects_individuals?: boolean;
}): RiskTierResult {
  const { system_description, domain, autonomous_decisions, affects_individuals } = params;
  const desc = system_description.toLowerCase();

  if (/social.?scor|mass.?surveil|subliminal.?manipul|exploit.?vulnerab/.test(desc)) {
    return {
      risk_tier: 'UNACCEPTABLE',
      rationale: 'System matches prohibited AI use cases under EU AI Act Article 5',
      governance_requirements: ['CEASE ALL OPERATIONS'],
      documentation_requirements: ['Incident report', 'Decommission plan'],
      prohibited: true,
    };
  }

  const highRiskDomains = [
    'healthcare', 'medical', 'legal', 'employment', 'hiring', 'credit',
    'education', 'law enforcement', 'immigration', 'critical infrastructure',
    'veterans', 'disability', 'va claims',
  ];

  const isHighRiskDomain = highRiskDomains.some(
    d => desc.includes(d) || (domain && domain.toLowerCase().includes(d))
  );

  if (isHighRiskDomain || (autonomous_decisions && affects_individuals)) {
    return {
      risk_tier: 'HIGH',
      rationale: 'System operates in high-risk domain or makes autonomous decisions affecting individuals',
      governance_requirements: [
        'Conformity assessment before deployment',
        'Quality management system',
        'Human oversight mechanism',
        'Robustness and accuracy testing',
        'Risk management system',
        'Data governance measures',
        'Technical documentation',
        'Record-keeping obligations',
        'Transparency to users',
        'Registration in EU database',
      ],
      documentation_requirements: [
        'Technical specification',
        'Risk assessment report',
        'Data governance policy',
        'Human oversight procedures',
        'Monitoring and reporting plan',
        'Incident response procedures',
      ],
      prohibited: false,
    };
  }

  if (/chatbot|emotion.?recogn|generat.*content|deepfake|synthetic/.test(desc)) {
    return {
      risk_tier: 'LIMITED',
      rationale: 'System requires transparency obligations — users must know they interact with AI',
      governance_requirements: ['Transparency notice to users', 'Content labeling (AI-generated)', 'User right to human alternative'],
      documentation_requirements: ['User notification templates', 'Content labeling procedures'],
      prohibited: false,
    };
  }

  return {
    risk_tier: 'MINIMAL',
    rationale: 'System does not match high-risk or limited-risk categories',
    governance_requirements: ['Voluntary codes of conduct recommended'],
    documentation_requirements: ['Basic system description'],
    prohibited: false,
  };
}

// ═══════════════════════════════════════════════════════════════════
// DOMAIN → WORKFORCE MAPPING
// ═══════════════════════════════════════════════════════════════════

const DOMAIN_MAP: Record<string, { type: string; confidence: number }> = {
  'VA Claims Support': { type: 'VA_CLAIMS', confidence: 0.98 },
  'Business Development': { type: 'BD_CAPTURE', confidence: 0.95 },
  'Finance & Accounting': { type: 'FINANCIAL_AUDIT', confidence: 0.95 },
};

/**
 * Map a domain string from onboarding to a workforce configuration.
 * Returns null matchedType for ambiguous/custom domains (Claude decides).
 */
export function mapDomainToWorkforce(domain: string, governance: string): WorkforceMapping | null {
  // Direct mapping for high-confidence domains
  const directMatch = DOMAIN_MAP[domain];
  if (directMatch) {
    const template = WORKFORCE_TEMPLATES[directMatch.type];
    return {
      matchedType: directMatch.type,
      matchConfidence: directMatch.confidence,
      matchRationale: `Direct match: "${domain}" maps to ${template.name}`,
      isCustom: false,
      pipelineName: template.name,
      roles: template.roles,
      description: template.description,
      primaryUrl: template.primaryUrl,
    };
  }

  // Ambiguous or custom — return null (Claude will decide)
  return null;
}

/**
 * Build a workforce mapping from Claude's response
 */
export function buildWorkforceMappingFromClaude(claudeResponse: {
  matchedType: string | null;
  matchConfidence: number;
  matchRationale: string;
  isCustom: boolean;
  pipelineName: string;
  pipelineDescription: string;
  roles: string[];
  primaryLaunchUrl: string;
}): WorkforceMapping {
  // If Claude matched an existing type, use our template data
  if (claudeResponse.matchedType && WORKFORCE_TEMPLATES[claudeResponse.matchedType]) {
    const template = WORKFORCE_TEMPLATES[claudeResponse.matchedType];
    return {
      matchedType: claudeResponse.matchedType,
      matchConfidence: claudeResponse.matchConfidence,
      matchRationale: claudeResponse.matchRationale,
      isCustom: false,
      pipelineName: template.name,
      roles: template.roles,
      description: template.description,
      primaryUrl: template.primaryUrl,
    };
  }

  // Custom pipeline from Claude
  return {
    matchedType: null,
    matchConfidence: claudeResponse.matchConfidence,
    matchRationale: claudeResponse.matchRationale,
    isCustom: true,
    pipelineName: claudeResponse.pipelineName,
    roles: claudeResponse.roles,
    description: claudeResponse.pipelineDescription,
    primaryUrl: claudeResponse.primaryLaunchUrl || '/console',
  };
}

/**
 * Get governance recommendations based on level + domain
 */
export function getGovernanceRecommendations(governance: string, domain: string, riskTier: string): string[] {
  const recs: string[] = [];

  if (governance === 'Advisory') {
    recs.push('All AI actions logged but no approval gates — suitable for internal analysis');
    if (riskTier === 'HIGH') {
      recs.push('Consider upgrading to Strict governance — your domain is classified HIGH risk');
    }
  } else if (governance === 'Strict') {
    recs.push('MANDATORY gates on all externally-visible outputs');
    recs.push('Human approval required before document generation or data export');
  } else if (governance === 'Regulated') {
    recs.push('Full evidence pack generated for every workflow execution');
    recs.push('All outputs require approval chain before release');
    recs.push('Hash-chained audit trail with forensic-grade integrity');
  }

  if (domain.toLowerCase().includes('va') || domain.toLowerCase().includes('veteran')) {
    recs.push('VA-specific: PII/PHI redaction enforced on all outputs');
    recs.push('38 CFR compliance mapping enabled');
  }

  if (domain.toLowerCase().includes('legal')) {
    recs.push('Legal hold and privilege detection enabled');
  }

  if (domain.toLowerCase().includes('finance')) {
    recs.push('SOX compliance controls recommended');
    recs.push('Transaction audit trail with Benford analysis capability');
  }

  return recs;
}

export { WORKFORCE_TEMPLATES };
