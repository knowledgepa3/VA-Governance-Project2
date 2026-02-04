/**
 * RFP/RFI Response Generator
 *
 * Generates professional, government-compliant proposal responses
 * following proper RFP/RFI structure based on solicitation type.
 *
 * Key Differences:
 * - RFI (Request for Information): Information gathering, less formal, demonstrates capability
 * - RFP (Request for Proposal): Formal bid, detailed pricing, binding proposal
 * - RFQ (Request for Quote): Price-focused, specific quantities/deliverables
 */

export type SolicitationType = 'RFI' | 'RFP' | 'RFQ' | 'SOURCES_SOUGHT' | 'DRAFT_RFP';

export interface SolicitationInput {
  type: SolicitationType;
  noticeId: string;
  title: string;
  agency: string;
  issuingOffice?: string;
  naicsCode: string;
  setAside?: string;
  responseDeadline: string;
  questionDeadline?: string;
  contractType?: string;  // FFP, T&M, CPFF, etc.
  periodOfPerformance?: string;
  placeOfPerformance?: string;
  estimatedValue?: string;

  // Extracted requirements
  scope: string;
  objectives: string[];
  mandatoryRequirements: RequirementItem[];
  desiredCapabilities?: string[];
  evaluationCriteria?: EvaluationFactor[];
  deliverables?: string[];
  technicalRequirements?: string[];

  // Questions to address (for RFI)
  questionsToAddress?: string[];

  // Special instructions
  pageLimit?: number;
  formatRequirements?: string[];
  submissionMethod?: string;
}

export interface RequirementItem {
  id: string;
  text: string;
  sectionRef?: string;
  mandatory: boolean;
}

export interface EvaluationFactor {
  factor: string;
  weight?: string;
  description: string;
  subfactors?: string[];
}

export interface CompanyProfile {
  name: string;
  cageCode?: string;
  dunsNumber?: string;
  ueiNumber?: string;
  address: string;
  pointOfContact: {
    name: string;
    title: string;
    email: string;
    phone: string;
  };
  socioeconomicStatus?: string[];  // 8(a), SDVOSB, HUBZone, WOSB, etc.
  capabilities: string[];
  differentiators: string[];
  pastPerformance: PastPerformanceRef[];
}

export interface PastPerformanceRef {
  contractName: string;
  client: string;
  contractNumber?: string;
  value: string;
  period: string;
  relevance: string;
  accomplishments: string[];
  reference?: {
    name: string;
    title: string;
    email: string;
    phone?: string;
  };
}

// =============================================================================
// RESPONSE STRUCTURE TEMPLATES
// =============================================================================

export interface RFIResponseStructure {
  coverLetter: string;
  executiveSummary: string;
  companyOverview: string;
  capabilityStatement: string;
  relevantExperience: string;
  technicalApproach: string;
  questionsResponses?: Record<string, string>;
  additionalInformation?: string;
  attachments: string[];
}

export interface RFPResponseStructure {
  coverLetter: string;
  volumeI_Technical: {
    executiveSummary: string;
    technicalApproach: TechnicalSection[];
    managementApproach: string;
    staffingPlan: string;
    qualityAssurance: string;
    riskManagement?: string;
    transitionPlan?: string;
  };
  volumeII_PastPerformance: {
    pastPerformanceMatrix: string;
    contractCitations: PastPerformanceCitation[];
    narrativeSummary: string;
  };
  volumeIII_Pricing: {
    priceSummary: string;
    laborCategories: LaborCategory[];
    otherDirectCosts: ODCItem[];
    basisOfEstimate: string;
    assumptions: string[];
  };
  attachments: Attachment[];
  complianceMatrix: ComplianceMatrixEntry[];
}

export interface TechnicalSection {
  sectionNumber: string;
  sectionName: string;
  evaluationFactor: string;
  narrative: string;
  winThemes: string[];
  discriminators: string[];
  complianceRefs: string[];
}

export interface PastPerformanceCitation {
  contractName: string;
  contractNumber: string;
  client: string;
  value: string;
  period: string;
  relevancyScore: 'HIGH' | 'MEDIUM' | 'LOW';
  scopeDescription: string;
  accomplishments: string[];
  reference: {
    name: string;
    title: string;
    email: string;
    phone: string;
  };
}

export interface LaborCategory {
  category: string;
  rate: number;
  hours: number;
  total: number;
  qualifications?: string;
}

export interface ODCItem {
  item: string;
  estimate: number;
  justification: string;
}

export interface Attachment {
  name: string;
  description: string;
  required: boolean;
  included: boolean;
}

export interface ComplianceMatrixEntry {
  reqId: string;
  requirement: string;
  sectionRef: string;
  complianceStatus: 'FULL' | 'PARTIAL' | 'EXCEPTION' | 'N/A';
  proposalRef: string;
  notes?: string;
}

// =============================================================================
// RESPONSE GENERATOR CLASS
// =============================================================================

export class RFPResponseGenerator {
  private solicitation: SolicitationInput;
  private company: CompanyProfile;

  constructor(solicitation: SolicitationInput, company: CompanyProfile) {
    this.solicitation = solicitation;
    this.company = company;
  }

  /**
   * Generate complete response based on solicitation type
   */
  generateResponse(): RFIResponseStructure | RFPResponseStructure {
    switch (this.solicitation.type) {
      case 'RFI':
      case 'SOURCES_SOUGHT':
        return this.generateRFIResponse();
      case 'RFP':
      case 'DRAFT_RFP':
      case 'RFQ':
        return this.generateRFPResponse();
      default:
        return this.generateRFIResponse();
    }
  }

  /**
   * Generate RFI Response (less formal, capability-focused)
   */
  private generateRFIResponse(): RFIResponseStructure {
    return {
      coverLetter: this.generateCoverLetter(),
      executiveSummary: this.generateExecutiveSummary(),
      companyOverview: this.generateCompanyOverview(),
      capabilityStatement: this.generateCapabilityStatement(),
      relevantExperience: this.generateRelevantExperience(),
      technicalApproach: this.generateHighLevelApproach(),
      questionsResponses: this.generateQuestionResponses(),
      attachments: this.getRequiredAttachments()
    };
  }

  /**
   * Generate full RFP Response (formal, detailed)
   */
  private generateRFPResponse(): RFPResponseStructure {
    return {
      coverLetter: this.generateCoverLetter(),
      volumeI_Technical: {
        executiveSummary: this.generateExecutiveSummary(),
        technicalApproach: this.generateTechnicalSections(),
        managementApproach: this.generateManagementApproach(),
        staffingPlan: this.generateStaffingPlan(),
        qualityAssurance: this.generateQASection(),
        riskManagement: this.generateRiskSection(),
        transitionPlan: this.generateTransitionPlan()
      },
      volumeII_PastPerformance: {
        pastPerformanceMatrix: this.generatePPMatrix(),
        contractCitations: this.generatePPCitations(),
        narrativeSummary: this.generatePPNarrative()
      },
      volumeIII_Pricing: {
        priceSummary: this.generatePriceSummary(),
        laborCategories: this.generateLaborCategories(),
        otherDirectCosts: this.generateODCs(),
        basisOfEstimate: this.generateBOE(),
        assumptions: this.generateAssumptions()
      },
      attachments: this.generateAttachmentsList(),
      complianceMatrix: this.generateComplianceMatrix()
    };
  }

  // ===========================================================================
  // COVER LETTER
  // ===========================================================================

  private generateCoverLetter(): string {
    const deadline = new Date(this.solicitation.responseDeadline).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    return `
${this.company.name}
${this.company.address}

${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}

${this.solicitation.issuingOffice || this.solicitation.agency}
RE: ${this.solicitation.type} Response - ${this.solicitation.noticeId}
    ${this.solicitation.title}

Dear Contracting Officer:

${this.company.name} is pleased to submit this response to ${this.solicitation.noticeId}, "${this.solicitation.title}." We have carefully reviewed the requirements and are confident in our ability to deliver exceptional results for ${this.solicitation.agency}.

${this.generateCoverLetterBody()}

We welcome the opportunity to discuss our qualifications and approach in greater detail. Should you have any questions regarding this submission, please contact:

${this.company.pointOfContact.name}
${this.company.pointOfContact.title}
Email: ${this.company.pointOfContact.email}
Phone: ${this.company.pointOfContact.phone}

Respectfully submitted,


${this.company.pointOfContact.name}
${this.company.pointOfContact.title}
${this.company.name}
${this.company.cageCode ? `CAGE Code: ${this.company.cageCode}` : ''}
${this.company.ueiNumber ? `UEI: ${this.company.ueiNumber}` : ''}
`.trim();
  }

  private generateCoverLetterBody(): string {
    const isRFI = this.solicitation.type === 'RFI' || this.solicitation.type === 'SOURCES_SOUGHT';

    if (isRFI) {
      return `
Our response demonstrates ${this.company.name}'s relevant experience and technical capabilities to support ${this.solicitation.agency}'s objectives. We have addressed each area of interest outlined in the ${this.solicitation.type} and provided information about our:

- Corporate qualifications and socioeconomic status
- Relevant past performance on similar engagements
- Technical approach and methodology
- Key personnel and organizational capabilities

${this.company.socioeconomicStatus?.length ? `As a ${this.company.socioeconomicStatus.join(', ')} firm, we are well-positioned to support this requirement under applicable set-aside programs.` : ''}
`.trim();
    } else {
      return `
Our proposal demonstrates a clear understanding of ${this.solicitation.agency}'s requirements and presents a proven approach that minimizes risk while maximizing value. Key highlights include:

${this.company.differentiators.slice(0, 3).map(d => `- ${d}`).join('\n')}

We have assembled a qualified team with directly relevant experience delivering similar solutions to federal agencies. Our past performance record demonstrates consistent success in meeting or exceeding client expectations.

${this.company.socioeconomicStatus?.length ? `As a ${this.company.socioeconomicStatus.join(', ')} firm, we offer competitive pricing with the responsiveness and dedication that comes from working directly with senior leadership.` : ''}
`.trim();
    }
  }

  // ===========================================================================
  // EXECUTIVE SUMMARY
  // ===========================================================================

  private generateExecutiveSummary(): string {
    const winThemes = this.identifyWinThemes();

    return `
# Executive Summary

## Understanding of the Requirement

${this.company.name} understands that ${this.solicitation.agency} requires ${this.solicitation.scope}. The key objectives include:

${this.solicitation.objectives.map((obj, i) => `${i + 1}. ${obj}`).join('\n')}

## Our Solution

${this.company.name} proposes a comprehensive approach that directly addresses each requirement while providing additional value through:

${winThemes.map(t => `- **${t.theme}**: ${t.description}`).join('\n')}

## Why ${this.company.name}

${this.company.differentiators.slice(0, 4).map(d => `- ${d}`).join('\n')}

## Relevant Experience

${this.company.name} brings directly relevant experience from ${this.company.pastPerformance.length} similar engagements, including:

${this.company.pastPerformance.slice(0, 2).map(pp =>
  `- **${pp.contractName}** (${pp.client}): ${pp.relevance}`
).join('\n')}

## Summary

${this.company.name} is uniquely qualified to deliver this requirement based on our proven track record, technical expertise, and commitment to client success. We look forward to the opportunity to serve ${this.solicitation.agency}.
`.trim();
  }

  // ===========================================================================
  // COMPANY OVERVIEW
  // ===========================================================================

  private generateCompanyOverview(): string {
    return `
# Company Overview

## About ${this.company.name}

${this.company.name} is ${this.company.socioeconomicStatus?.length ? `a ${this.company.socioeconomicStatus.join(', ')} ` : ''}firm specializing in ${this.company.capabilities.slice(0, 3).join(', ')}.

## Corporate Information

| Item | Details |
|------|---------|
| Company Name | ${this.company.name} |
| Address | ${this.company.address} |
${this.company.cageCode ? `| CAGE Code | ${this.company.cageCode} |` : ''}
${this.company.dunsNumber ? `| DUNS Number | ${this.company.dunsNumber} |` : ''}
${this.company.ueiNumber ? `| UEI Number | ${this.company.ueiNumber} |` : ''}
| NAICS Codes | ${this.solicitation.naicsCode} |
${this.company.socioeconomicStatus?.length ? `| Socioeconomic Status | ${this.company.socioeconomicStatus.join(', ')} |` : ''}

## Core Capabilities

${this.company.capabilities.map(c => `- ${c}`).join('\n')}

## Point of Contact

**${this.company.pointOfContact.name}**
${this.company.pointOfContact.title}
Email: ${this.company.pointOfContact.email}
Phone: ${this.company.pointOfContact.phone}
`.trim();
  }

  // ===========================================================================
  // CAPABILITY STATEMENT
  // ===========================================================================

  private generateCapabilityStatement(): string {
    return `
# Capability Statement

## Core Competencies

${this.company.capabilities.map(c => `### ${c}\n\n[Description of capability and how it applies to this requirement]`).join('\n\n')}

## Differentiators

${this.company.differentiators.map((d, i) => `${i + 1}. **${d}**`).join('\n')}

## Relevant Certifications and Clearances

- [List any relevant certifications]
- [List any applicable security clearances]
- [List any industry certifications]
`.trim();
  }

  // ===========================================================================
  // RELEVANT EXPERIENCE
  // ===========================================================================

  private generateRelevantExperience(): string {
    return `
# Relevant Experience

${this.company.name} has successfully delivered similar solutions to federal agencies. The following contracts demonstrate our directly relevant experience:

${this.company.pastPerformance.map((pp, i) => `
## ${i + 1}. ${pp.contractName}

| Item | Details |
|------|---------|
| Client | ${pp.client} |
${pp.contractNumber ? `| Contract Number | ${pp.contractNumber} |` : ''}
| Contract Value | ${pp.value} |
| Period of Performance | ${pp.period} |
| Relevancy | ${pp.relevance} |

### Scope and Accomplishments

${pp.accomplishments.map(a => `- ${a}`).join('\n')}

${pp.reference ? `### Reference

**${pp.reference.name}**
${pp.reference.title}
Email: ${pp.reference.email}
${pp.reference.phone ? `Phone: ${pp.reference.phone}` : ''}` : ''}
`).join('\n---\n')}
`.trim();
  }

  // ===========================================================================
  // TECHNICAL APPROACH
  // ===========================================================================

  private generateHighLevelApproach(): string {
    return `
# Technical Approach

## Overview

${this.company.name} proposes a proven approach to deliver ${this.solicitation.title}. Our methodology is based on industry best practices and our experience delivering similar solutions.

## Approach to Key Requirements

${this.solicitation.mandatoryRequirements.slice(0, 5).map((req, i) => `
### ${req.id}: ${req.text}

${this.company.name} will address this requirement through:

1. [Specific approach step 1]
2. [Specific approach step 2]
3. [Specific approach step 3]

**Relevant Experience**: [Reference to similar work performed]
`).join('\n')}

## Methodology

Our approach follows a structured methodology:

1. **Discovery & Planning** - Understand requirements and develop detailed work plan
2. **Execution** - Deliver work products according to plan
3. **Quality Assurance** - Ensure deliverables meet requirements
4. **Delivery & Transition** - Provide completed deliverables and knowledge transfer

## Risk Mitigation

${this.company.name} proactively identifies and mitigates risks through:

- Regular progress reviews and communication
- Experienced personnel with relevant expertise
- Proven tools and methodologies
- Contingency planning for identified risks
`.trim();
  }

  private generateTechnicalSections(): TechnicalSection[] {
    const evalFactors = this.solicitation.evaluationCriteria || [];

    return evalFactors.map((factor, i) => ({
      sectionNumber: `${i + 1}.0`,
      sectionName: factor.factor,
      evaluationFactor: `${factor.factor} ${factor.weight ? `(${factor.weight})` : ''}`,
      narrative: `${this.company.name} proposes a comprehensive approach to ${factor.factor.toLowerCase()} that directly addresses ${this.solicitation.agency}'s requirements.\n\n${factor.description}`,
      winThemes: this.identifyWinThemes().slice(0, 3).map(t => t.theme),
      discriminators: this.company.differentiators.slice(0, 2),
      complianceRefs: this.solicitation.mandatoryRequirements
        .filter(r => r.mandatory)
        .slice(0, 3)
        .map(r => r.id)
    }));
  }

  // ===========================================================================
  // QUESTION RESPONSES (RFI)
  // ===========================================================================

  private generateQuestionResponses(): Record<string, string> {
    if (!this.solicitation.questionsToAddress?.length) {
      return {};
    }

    const responses: Record<string, string> = {};

    this.solicitation.questionsToAddress.forEach((q, i) => {
      responses[`Question ${i + 1}`] = `
**Question**: ${q}

**Response**: ${this.company.name} [provide detailed response addressing the specific question]

[Include relevant experience, capabilities, or recommendations as appropriate]
`.trim();
    });

    return responses;
  }

  // ===========================================================================
  // PAST PERFORMANCE
  // ===========================================================================

  private generatePPMatrix(): string {
    return `
# Past Performance Matrix

| Contract | Client | Value | Period | Relevancy |
|----------|--------|-------|--------|-----------|
${this.company.pastPerformance.map(pp =>
  `| ${pp.contractName} | ${pp.client} | ${pp.value} | ${pp.period} | ${pp.relevance.split(' ')[0]} |`
).join('\n')}
`.trim();
  }

  private generatePPCitations(): PastPerformanceCitation[] {
    return this.company.pastPerformance.map((pp, i) => ({
      contractName: pp.contractName,
      contractNumber: pp.contractNumber || `Contract-${i + 1}`,
      client: pp.client,
      value: pp.value,
      period: pp.period,
      relevancyScore: (i === 0 ? 'HIGH' : i < 3 ? 'MEDIUM' : 'LOW') as 'HIGH' | 'MEDIUM' | 'LOW',
      scopeDescription: pp.relevance,
      accomplishments: pp.accomplishments,
      reference: pp.reference || {
        name: 'Reference Available Upon Request',
        title: 'Contracting Officer',
        email: 'available@request.gov',
        phone: '(000) 000-0000'
      }
    }));
  }

  private generatePPNarrative(): string {
    const topPP = this.company.pastPerformance[0];
    return `
# Past Performance Narrative

${this.company.name} has a proven track record of successfully delivering similar services to federal agencies. Our past performance demonstrates:

- **Consistent Quality**: All contracts completed with "Satisfactory" or higher ratings
- **On-Time Delivery**: Track record of meeting or exceeding schedule requirements
- **Budget Performance**: History of delivering within budget
- **Customer Satisfaction**: Strong references from repeat customers

Our most directly relevant experience is the ${topPP.contractName} engagement with ${topPP.client}, where we ${topPP.accomplishments[0]?.toLowerCase() || 'delivered exceptional results'}. This contract demonstrates our ability to successfully execute requirements similar to those outlined in this solicitation.
`.trim();
  }

  // ===========================================================================
  // PRICING
  // ===========================================================================

  private generatePriceSummary(): string {
    return `
# Pricing Summary

## Contract Type

${this.solicitation.contractType || 'Firm Fixed Price (FFP)'}

## Total Proposed Price

[Total Price]

## Price Breakdown

| CLIN | Description | Quantity | Unit Price | Total |
|------|-------------|----------|------------|-------|
| 0001 | Base Period Services | 1 | $ | $ |
| 0002 | Option Period 1 | 1 | $ | $ |
| 0003 | Travel (NTE) | 1 | $ | $ |

## Price Reasonableness

${this.company.name}'s pricing reflects our efficient delivery model and directly relevant experience. Our rates are competitive with GSA Schedule pricing and reflect fair and reasonable pricing for the services proposed.
`.trim();
  }

  private generateLaborCategories(): LaborCategory[] {
    return [
      { category: 'Principal Consultant', rate: 185, hours: 160, total: 29600 },
      { category: 'Senior Analyst', rate: 145, hours: 80, total: 11600 },
      { category: 'Technical Specialist', rate: 125, hours: 60, total: 7500 },
      { category: 'Administrative Support', rate: 65, hours: 20, total: 1300 }
    ];
  }

  private generateODCs(): ODCItem[] {
    return [
      { item: 'Travel', estimate: 2500, justification: 'Estimated travel for on-site meetings as required' },
      { item: 'Materials/Supplies', estimate: 500, justification: 'Project materials and supplies' }
    ];
  }

  private generateBOE(): string {
    return `
# Basis of Estimate

## Labor Estimate

Labor hours were estimated based on:

1. Analysis of the Statement of Work requirements
2. Our experience performing similar tasks on previous contracts
3. Task complexity and deliverable requirements

## Other Direct Costs

ODC estimates are based on historical costs from similar engagements and current market rates.

## Assumptions

${this.generateAssumptions().map((a, i) => `${i + 1}. ${a}`).join('\n')}
`.trim();
  }

  private generateAssumptions(): string[] {
    return [
      'Government will provide timely access to required information and personnel',
      'Work will be performed primarily at contractor facilities with periodic on-site meetings',
      'Government-furnished equipment/workspace available for on-site work',
      'Standard business hours unless otherwise specified',
      'Deliverables accepted within 10 business days unless comments provided'
    ];
  }

  // ===========================================================================
  // MANAGEMENT & STAFFING
  // ===========================================================================

  private generateManagementApproach(): string {
    return `
# Management Approach

## Organizational Structure

${this.company.name} will provide dedicated project management and oversight to ensure successful delivery. Our management approach includes:

- **Single Point of Contact**: Direct access to senior leadership
- **Clear Communication**: Regular status updates and progress reports
- **Quality Focus**: Built-in quality checks at each milestone
- **Risk Management**: Proactive identification and mitigation of risks

## Communication Plan

| Communication | Frequency | Participants | Method |
|---------------|-----------|--------------|--------|
| Status Report | Weekly | COR, PM | Email |
| Progress Meeting | Bi-weekly | COR, PM, Key Staff | Virtual/In-person |
| Executive Review | Monthly | Leadership | Briefing |

## Project Controls

- Weekly internal status reviews
- Issue tracking and resolution process
- Change management procedures
- Deliverable review and approval workflow
`.trim();
  }

  private generateStaffingPlan(): string {
    return `
# Staffing Plan

## Key Personnel

### Program Manager

**Qualifications Required**:
- 10+ years relevant experience
- PMP certification preferred
- Experience managing similar federal contracts

**Responsibilities**:
- Overall contract management and performance
- Primary government interface
- Resource allocation and quality oversight

### Technical Lead

**Qualifications Required**:
- 8+ years technical experience
- Subject matter expertise in [relevant area]
- Federal sector experience

**Responsibilities**:
- Technical direction and quality assurance
- Work product development and review
- Technical problem resolution

## Staffing Matrix

| Role | Name | % Allocated | Location |
|------|------|-------------|----------|
| Program Manager | TBD | 50% | Remote/On-site |
| Technical Lead | TBD | 75% | Remote/On-site |
| Analyst | TBD | 100% | Remote |
`.trim();
  }

  private generateQASection(): string {
    return `
# Quality Assurance

## Quality Management Approach

${this.company.name} maintains a comprehensive quality management system to ensure all deliverables meet or exceed requirements.

## Quality Control Procedures

1. **Peer Review**: All work products reviewed by qualified personnel before submission
2. **Compliance Check**: Verification against RFP requirements
3. **Management Review**: Final approval by Project Manager
4. **Client Feedback Integration**: Incorporation of government comments

## Continuous Improvement

- Lessons learned captured and applied
- Process improvements identified and implemented
- Customer feedback incorporated
`.trim();
  }

  private generateRiskSection(): string {
    return `
# Risk Management

## Risk Management Approach

${this.company.name} proactively identifies, assesses, and mitigates risks throughout the contract lifecycle.

## Identified Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Schedule delays due to government review cycles | Medium | Medium | Build buffer into schedule; proactive communication |
| Scope changes | Medium | High | Clear change management process; regular scope reviews |
| Key personnel availability | Low | High | Cross-training; backup personnel identified |
| Technical challenges | Low | Medium | Experienced staff; proven methodologies |
`.trim();
  }

  private generateTransitionPlan(): string {
    return `
# Transition Plan

## Transition-In

${this.company.name} will execute a smooth transition-in through:

1. **Knowledge Transfer**: Review existing documentation and processes
2. **Stakeholder Meetings**: Introductions and alignment sessions
3. **Baseline Assessment**: Current state analysis
4. **Transition Schedule**: Phased approach minimizing disruption

## Transition-Out

At contract conclusion, ${this.company.name} will:

1. Complete all outstanding deliverables
2. Transfer all documentation and work products
3. Provide knowledge transfer to successor
4. Support smooth handoff of responsibilities
`.trim();
  }

  // ===========================================================================
  // COMPLIANCE MATRIX
  // ===========================================================================

  private generateComplianceMatrix(): ComplianceMatrixEntry[] {
    return this.solicitation.mandatoryRequirements.map((req, i) => ({
      reqId: req.id,
      requirement: req.text,
      sectionRef: req.sectionRef || `PWS ${i + 1}`,
      complianceStatus: 'FULL' as const,
      proposalRef: `Section ${Math.floor(i / 3) + 1}.${(i % 3) + 1}`,
      notes: 'Full compliance demonstrated in proposal'
    }));
  }

  // ===========================================================================
  // ATTACHMENTS
  // ===========================================================================

  private getRequiredAttachments(): string[] {
    return [
      'Capability Statement',
      'Organizational Chart',
      'Key Personnel Resumes',
      'Relevant Contract List',
      'Certifications'
    ];
  }

  private generateAttachmentsList(): Attachment[] {
    return [
      { name: 'Attachment A - Resumes', description: 'Key Personnel Resumes', required: true, included: true },
      { name: 'Attachment B - Past Performance Matrix', description: 'Contract Reference List', required: true, included: true },
      { name: 'Attachment C - Certifications', description: 'Relevant Certifications', required: false, included: true },
      { name: 'Attachment D - Organizational Chart', description: 'Company Organization', required: false, included: true },
      { name: 'SF 1449', description: 'Solicitation Form', required: true, included: true },
      { name: 'Reps & Certs', description: 'Representations and Certifications', required: true, included: true }
    ];
  }

  // ===========================================================================
  // HELPER METHODS
  // ===========================================================================

  private identifyWinThemes(): { theme: string; description: string }[] {
    return [
      { theme: 'Proven Expertise', description: `${this.company.name} brings directly relevant experience from similar federal engagements.` },
      { theme: 'Low Risk', description: 'Our proven methodology and experienced team minimize execution risk.' },
      { theme: 'Best Value', description: 'Competitive pricing combined with high-quality delivery provides exceptional value.' },
      { theme: 'Responsive Partner', description: 'Direct access to senior leadership ensures responsive communication and rapid issue resolution.' }
    ];
  }
}

// =============================================================================
// MARKDOWN EXPORT
// =============================================================================

export function exportResponseToMarkdown(
  response: RFIResponseStructure | RFPResponseStructure,
  solicitation: SolicitationInput
): string {
  const isRFP = 'volumeI_Technical' in response;
  const header = `---
title: "${solicitation.type} Response - ${solicitation.noticeId}"
subtitle: "${solicitation.title}"
agency: "${solicitation.agency}"
deadline: "${solicitation.responseDeadline}"
generated: "${new Date().toISOString()}"
type: "${solicitation.type}"
---

# ${solicitation.type} Response

**Notice ID:** ${solicitation.noticeId}
**Title:** ${solicitation.title}
**Agency:** ${solicitation.agency}
**Response Deadline:** ${new Date(solicitation.responseDeadline).toLocaleDateString()}

---

`;

  if (isRFP) {
    const rfpResponse = response as RFPResponseStructure;
    return header + `
${rfpResponse.coverLetter}

---

# Volume I - Technical Proposal

${rfpResponse.volumeI_Technical.executiveSummary}

${rfpResponse.volumeI_Technical.technicalApproach.map(section => `
## ${section.sectionNumber} ${section.sectionName}

*Evaluation Factor: ${section.evaluationFactor}*

${section.narrative}

**Win Themes:** ${section.winThemes.join(' | ')}

**Discriminators:** ${section.discriminators.join(' | ')}
`).join('\n')}

${rfpResponse.volumeI_Technical.managementApproach}

${rfpResponse.volumeI_Technical.staffingPlan}

${rfpResponse.volumeI_Technical.qualityAssurance}

${rfpResponse.volumeI_Technical.riskManagement || ''}

${rfpResponse.volumeI_Technical.transitionPlan || ''}

---

# Volume II - Past Performance

${rfpResponse.volumeII_PastPerformance.pastPerformanceMatrix}

${rfpResponse.volumeII_PastPerformance.narrativeSummary}

${rfpResponse.volumeII_PastPerformance.contractCitations.map((citation, i) => `
## Citation ${i + 1}: ${citation.contractName}

| Item | Details |
|------|---------|
| Client | ${citation.client} |
| Contract Number | ${citation.contractNumber} |
| Value | ${citation.value} |
| Period | ${citation.period} |
| Relevancy | ${citation.relevancyScore} |

**Scope:** ${citation.scopeDescription}

**Key Accomplishments:**
${citation.accomplishments.map(a => `- ${a}`).join('\n')}

**Reference:** ${citation.reference.name}, ${citation.reference.title} (${citation.reference.email})
`).join('\n')}

---

# Volume III - Pricing

${rfpResponse.volumeIII_Pricing.priceSummary}

## Labor Categories

| Category | Rate | Hours | Total |
|----------|------|-------|-------|
${rfpResponse.volumeIII_Pricing.laborCategories.map(lc =>
  `| ${lc.category} | $${lc.rate}/hr | ${lc.hours} | $${lc.total.toLocaleString()} |`
).join('\n')}

## Other Direct Costs

| Item | Estimate | Justification |
|------|----------|---------------|
${rfpResponse.volumeIII_Pricing.otherDirectCosts.map(odc =>
  `| ${odc.item} | $${odc.estimate.toLocaleString()} | ${odc.justification} |`
).join('\n')}

${rfpResponse.volumeIII_Pricing.basisOfEstimate}

---

# Compliance Matrix

| Req ID | Requirement | Status | Proposal Ref |
|--------|-------------|--------|--------------|
${rfpResponse.complianceMatrix.map(entry =>
  `| ${entry.reqId} | ${entry.requirement.substring(0, 50)}... | ${entry.complianceStatus} | ${entry.proposalRef} |`
).join('\n')}

---

# Attachments

${rfpResponse.attachments.map(att =>
  `- [${att.included ? 'x' : ' '}] **${att.name}** - ${att.description} ${att.required ? '(Required)' : '(Optional)'}`
).join('\n')}

---

*Generated by ACE Governance Platform - ${new Date().toISOString()}*
`;
  } else {
    const rfiResponse = response as RFIResponseStructure;
    return header + `
${rfiResponse.coverLetter}

---

${rfiResponse.executiveSummary}

---

${rfiResponse.companyOverview}

---

${rfiResponse.capabilityStatement}

---

${rfiResponse.relevantExperience}

---

${rfiResponse.technicalApproach}

${Object.entries(rfiResponse.questionsResponses || {}).length > 0 ? `
---

# Question Responses

${Object.entries(rfiResponse.questionsResponses || {}).map(([q, a]) => `
## ${q}

${a}
`).join('\n')}
` : ''}

---

# Attachments

${rfiResponse.attachments.map(att => `- ${att}`).join('\n')}

---

*Generated by ACE Governance Platform - ${new Date().toISOString()}*
`;
  }
}

// =============================================================================
// CONVENIENCE FUNCTIONS
// =============================================================================

export function generateRFIResponse(
  solicitation: SolicitationInput,
  company: CompanyProfile
): RFIResponseStructure {
  const generator = new RFPResponseGenerator(solicitation, company);
  return generator.generateResponse() as RFIResponseStructure;
}

export function generateRFPResponse(
  solicitation: SolicitationInput,
  company: CompanyProfile
): RFPResponseStructure {
  const generator = new RFPResponseGenerator(solicitation, company);
  return generator.generateResponse() as RFPResponseStructure;
}

export default RFPResponseGenerator;
