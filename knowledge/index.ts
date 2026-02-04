/**
 * Knowledge Base Index
 *
 * Central export for all agent knowledge bases
 */

export * from './vaLegalKnowledge';

import {
  CORE_PRINCIPLES,
  FEDERAL_CIRCUIT_CASES,
  M21_1_REFERENCES,
  RATING_SCHEDULE,
  SECONDARY_SC_CHAINS,
  CUE_ERROR_TYPES,
  EFFECTIVE_DATE_RULES,
  AGENT_KNOWLEDGE_PROMPTS,
  NON_MEDICAL_EXPERT_QUALIFICATION,
  ANALYST_CERTIFICATION
} from './vaLegalKnowledge';

/**
 * Generate a legal knowledge prompt injection for agents
 */
export function getLegalKnowledgePrompt(agentType: string): string {
  const baseKnowledge = `
## CRITICAL LEGAL KNOWLEDGE

### BENEFIT OF THE DOUBT (38 U.S.C. § 5107(b))
"${CORE_PRINCIPLES.BENEFIT_OF_THE_DOUBT.quotable}"
- If evidence is 50/50 (equipoise), the VETERAN WINS
- Standard: Is preponderance of evidence AGAINST the claim? If not, GRANT.
- Key Case: Gilbert v. Derwinski, 1 Vet. App. 49 (1990)

### THREE ELEMENTS OF SERVICE CONNECTION (Caluza/Shedden)
Per Caluza v. Brown, 7 Vet. App. 498 (1995) and Shedden v. Principi, 381 F.3d 1163 (Fed. Cir. 2004):
1. Current disability (medical evidence)
2. In-service incurrence or aggravation
3. Nexus (causal connection between 1 and 2)

### LAY EVIDENCE IS POWERFUL
- Buchanan v. Nicholson: Cannot reject lay evidence SOLELY for lack of medical records
- Jandreau v. Nicholson: Lay witnesses ARE competent for observable symptoms
- Veterans CAN testify about: pain, limitation, symptoms, events witnessed, continuity

### CONTINUITY OF SYMPTOMATOLOGY
- Walker v. Shinseki: Continuity pathway ONLY for chronic diseases in 38 CFR 3.309(a)
- If condition is on the list (arthritis, hypertension, psychoses, etc.), can use continuity
- If NOT on the list, must have direct nexus evidence

### MEDICAL OPINION REQUIREMENTS (Nieves-Rodriguez v. Peake)
- Must have adequate RATIONALE (not just bare conclusion)
- Examiner must review relevant records
- Must address the correct legal standard
- Conclusory opinions are INADEQUATE - attack them

### ALL THEORIES MUST BE CONSIDERED (Hickson v. West)
VA must consider ALL theories of entitlement raised by evidence:
- Direct, Secondary, Presumptive, and Aggravation
- If evidence supports multiple pathways, pursue ALL

### SECONDARY SERVICE CONNECTION (38 CFR § 3.310)
Per Allen v. Brown: Includes conditions CAUSED BY or AGGRAVATED BY SC conditions
- Common chains: Knees → Back/Hips, PTSD → Sleep Apnea, Tinnitus → Mental Health
- Must show proximate cause OR worsening beyond natural progression

### CLEAR AND UNMISTAKABLE ERROR (CUE)
Per Russell v. Principi, 3 Vet. App. 310:
1. Correct facts not before adjudicator (evidence overlooked)
2. Law/regulation incorrectly applied
3. Error is "undebatable" - reasonable minds cannot differ
4. Outcome would be "manifestly different"

### M21-1 REFERENCES
- Service Connection: M21-1, Part III, Subpart iv, Chapter 4
- Evidence Evaluation: M21-1, Part III, Subpart iv, Chapter 5
- Effective Dates: M21-1, Part III, Subpart ii, Chapter 2
- CUE: M21-1, Part III, Subpart iv, Chapter 7
`;

  // Add agent-specific knowledge
  const agentSpecific = AGENT_KNOWLEDGE_PROMPTS[agentType as keyof typeof AGENT_KNOWLEDGE_PROMPTS] || '';

  return baseKnowledge + '\n' + agentSpecific;
}

/**
 * Get case law citation for a specific topic
 */
export function getCaseLawCitation(topic: string): string {
  const citations: Record<string, string> = {
    'service_connection': 'Caluza v. Brown, 7 Vet. App. 498 (1995); Shedden v. Principi, 381 F.3d 1163 (Fed. Cir. 2004)',
    'benefit_of_doubt': 'Gilbert v. Derwinski, 1 Vet. App. 49 (1990); 38 U.S.C. § 5107(b)',
    'lay_evidence': 'Buchanan v. Nicholson, 451 F.3d 1331 (Fed. Cir. 2006); Jandreau v. Nicholson, 492 F.3d 1372 (Fed. Cir. 2007)',
    'continuity': 'Walker v. Shinseki, 708 F.3d 1331 (Fed. Cir. 2013)',
    'medical_opinion': 'Nieves-Rodriguez v. Peake, 22 Vet. App. 295 (2008)',
    'exam_required': 'McLendon v. Nicholson, 20 Vet. App. 79 (2006)',
    'secondary': 'Allen v. Brown, 7 Vet. App. 439 (1995); 38 CFR § 3.310',
    'cue': 'Russell v. Principi, 3 Vet. App. 310 (1992); Fugo v. Brown, 6 Vet. App. 40 (1993)',
    'duty_to_assist': 'Barr v. Nicholson, 21 Vet. App. 303 (2007); 38 U.S.C. § 5103A',
    'all_theories': 'Hickson v. West, 12 Vet. App. 247 (1999)',
    'informal_claim': 'McGrath v. Gober, 14 Vet. App. 28 (2000)',
    'overlapping_symptoms': 'Mittleider v. West, 11 Vet. App. 181 (1998)'
  };

  return citations[topic] || 'Citation not found';
}

/**
 * Get rating criteria for a condition type
 */
export function getRatingCriteria(conditionType: string): any {
  return RATING_SCHEDULE[conditionType as keyof typeof RATING_SCHEDULE] || null;
}

/**
 * Get common secondary conditions for a primary
 */
export function getSecondaryConditions(primaryCondition: string): string[] {
  const chain = SECONDARY_SC_CHAINS.commonChains.find(
    c => c.primary.toLowerCase().includes(primaryCondition.toLowerCase())
  );
  return chain?.secondaries || [];
}

/**
 * Get CUE error types and examples
 */
export function getCUEErrorTypes(): typeof CUE_ERROR_TYPES.categories {
  return CUE_ERROR_TYPES.categories;
}

/**
 * Get effective date rule for claim type
 */
export function getEffectiveDateRule(claimType: string): any {
  return EFFECTIVE_DATE_RULES.claimTypes[claimType as keyof typeof EFFECTIVE_DATE_RULES.claimTypes] || EFFECTIVE_DATE_RULES.generalRule;
}

/**
 * Get analyst certification block with proper qualifications
 */
export function getAnalystCertification(): typeof ANALYST_CERTIFICATION.defaultCertification {
  return ANALYST_CERTIFICATION.defaultCertification;
}

/**
 * Get non-medical expert qualification framework
 */
export function getNonMedicalExpertQualification(): typeof NON_MEDICAL_EXPERT_QUALIFICATION {
  return NON_MEDICAL_EXPERT_QUALIFICATION;
}

export default {
  getLegalKnowledgePrompt,
  getCaseLawCitation,
  getRatingCriteria,
  getSecondaryConditions,
  getCUEErrorTypes,
  getEffectiveDateRule,
  getAnalystCertification,
  getNonMedicalExpertQualification,
  CORE_PRINCIPLES,
  FEDERAL_CIRCUIT_CASES,
  M21_1_REFERENCES,
  RATING_SCHEDULE,
  SECONDARY_SC_CHAINS,
  CUE_ERROR_TYPES,
  EFFECTIVE_DATE_RULES,
  NON_MEDICAL_EXPERT_QUALIFICATION,
  ANALYST_CERTIFICATION
};
