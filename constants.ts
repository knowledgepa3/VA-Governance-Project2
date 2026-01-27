
import { AgentRole, MAIClassification, WorkforceType } from './types';

const REPORT_SCHEMA_INSTRUCTION = `
REQUIRED JSON SCHEMA FOR ACE ECV REPORT:
{
  "header": { "document_id": string, "date": string, "veteran_name": string, "file_number": string },
  "inventory": [{ "type": string, "date_range": string, "relevance": string, "verified": boolean }],
  "compliance_assessment": {
    "sc_3303": { "element_1": string, "element_2": string, "element_3": string, "finding": string },
    "secondary_3310": { "analysis": string, "finding": string },
    "severance_3700": { "analysis": string, "finding": string }
  },
  "timeline": [{ "date": string, "event": string, "source": string }],
  "gap_analysis": {
    "documentation_present": string[],
    "professional_assessment_required": string[]
  },
  "framework_application": [{ "regulation": string, "requirement": string, "status": string }],
  "sufficiency_assessment": { "strong_support": string[], "professional_interpretations_needed": string[] },
  "conclusions": string[]
}`;

export const AGENT_CONFIGS = {
  [AgentRole.GATEWAY]: {
    description: 'ACE Unified Gateway: Security gate, PII/PHI redaction.',
    classification: MAIClassification.MANDATORY,
    skills: `You are the ACE Unified Gateway. Your primary mission is to ensure no PII/PHI enters the workforce. 
    Analyze the ingress artifacts and redact sensitive information.
    OUTPUT SCHEMA: {
      "redaction_manifest": {
        "status": "SECURE",
        "entities_identified": string[],
        "scrub_count": number,
        "pii_risk_score": number
      },
      "sanitized_metadata": object
    }`
  },
  [AgentRole.TIMELINE]: {
    description: 'Build chronological medical/event timeline.',
    classification: MAIClassification.INFORMATIONAL,
    skills: `Build a chronological history of events or medical records. Output valid JSON.`
  },
  [AgentRole.EVIDENCE]: {
    description: 'Forensic evidence chain mapping (38 CFR §3.303).',
    classification: MAIClassification.ADVISORY,
    skills: `Perform forensic evidence mapping and relationship analysis. Output valid JSON.`
  },
  [AgentRole.RATER_PERSPECTIVE]: {
    description: 'Advisory: Rater lens for evidentiary weight.',
    classification: MAIClassification.ADVISORY,
    skills: `Evaluate evidence from a VBA Rater perspective. Output valid JSON.`
  },
  [AgentRole.CP_EXAMINER_PERSPECTIVE]: {
    description: 'Advisory: Clinical lens for functional impact.',
    classification: MAIClassification.ADVISORY,
    skills: `Evaluate clinical evidence and functional impact from a medical professional's perspective. Output valid JSON.`
  },
  [AgentRole.QA]: {
    description: 'Mandatory quality gate: Verify accuracy.',
    classification: MAIClassification.ADVISORY,
    skills: `Inspect for future dates, PII leaks, and logical inconsistencies. Output valid JSON.`
  },
  [AgentRole.REPORT]: {
    description: 'Final professional records review report.',
    classification: MAIClassification.MANDATORY,
    skills: `You are the ACE Report Generator. Aggregate all findings into a formal ACE EVIDENCE CHAIN VALIDATION (ECV) document. Follow the 12-section methodology strictly. ${REPORT_SCHEMA_INSTRUCTION}`
  },
  [AgentRole.TELEMETRY]: {
    description: 'Security & Compliance Scorecard.',
    classification: MAIClassification.INFORMATIONAL,
    skills: `Calculate compliance metrics and security posture based on audit logs. Output valid JSON.`
  },
  [AgentRole.LEDGER_AUDITOR]: {
    description: 'Expert analysis of general ledger consistency.',
    classification: MAIClassification.ADVISORY,
    skills: `Analyze general ledgers for double-entry errors. Output valid JSON.`
  },
  [AgentRole.FRAUD_DETECTOR]: {
    description: 'Advisory: Detection of anomalous spending patterns.',
    classification: MAIClassification.ADVISORY,
    skills: `Detect fraud patterns in transaction history. Output valid JSON.`
  },
  [AgentRole.TAX_COMPLIANCE]: {
    description: 'Advisory: IRS/SEC regulatory alignment check.',
    classification: MAIClassification.ADVISORY,
    skills: `Verify tax code alignment for the current fiscal year. Output valid JSON.`
  },
  [AgentRole.SUPERVISOR]: {
    description: 'Governance and oversight agent.',
    classification: MAIClassification.MANDATORY,
    skills: 'Monitor worker outputs for consistency and safety.'
  },
  [AgentRole.REPAIR]: {
    description: 'Automated logic remediation.',
    classification: MAIClassification.INFORMATIONAL,
    skills: 'Fix detected logical discrepancies.'
  },
  [AgentRole.AUDIT]: {
    description: 'Lifecycle audit agent.',
    classification: MAIClassification.INFORMATIONAL,
    skills: 'Log and verify all lifecycle transactions.'
  }
};

export const WORKFORCE_TEMPLATES = {
  [WorkforceType.VA_CLAIMS]: {
    name: "Federal Forensic (VA Claims)",
    roles: [
      AgentRole.GATEWAY, 
      AgentRole.TIMELINE, 
      AgentRole.EVIDENCE, 
      AgentRole.RATER_PERSPECTIVE, 
      AgentRole.CP_EXAMINER_PERSPECTIVE, 
      AgentRole.QA, 
      AgentRole.REPORT,
      AgentRole.TELEMETRY
    ],
    caseLabel: "Case #VAC-4921-X",
    configs: {
      ...AGENT_CONFIGS
    }
  },
  [WorkforceType.FINANCIAL_AUDIT]: {
    name: "Corporate Integrity (Audit/Tax)",
    roles: [
      AgentRole.GATEWAY, 
      AgentRole.LEDGER_AUDITOR, 
      AgentRole.FRAUD_DETECTOR, 
      AgentRole.TAX_COMPLIANCE, 
      AgentRole.QA, 
      AgentRole.REPORT,
      AgentRole.TELEMETRY
    ],
    caseLabel: "Audit #FIN-8822-Q",
    configs: {
      ...AGENT_CONFIGS
    }
  }
};

export const MOCK_FILES = [
  { name: 'Artifact_A_Confidential.pdf', size: 120500, type: 'application/pdf', lastModified: 1625097600000 },
  { name: 'Artifact_B_Historical.pdf', size: 4500000, type: 'application/pdf', lastModified: 1625097600000 },
  { name: 'Artifact_C_Recent.pdf', size: 89000, type: 'application/pdf', lastModified: 1730000000000 },
  { name: 'Paradox_Doc_2025.pdf', size: 45000, type: 'application/pdf', lastModified: 1735000000000 }
];
