/**
 * RFP Analysis Service
 *
 * Uses the Governed LLM Execution Kernel for all AI analysis.
 * All calls flow through governance: rate limiting, audit logging, mode enforcement.
 */

import { execute as governedExecute, executeJSON } from './services/governedLLM';
import { ModelTier } from './llm';

function cleanJsonResponse(text: string): string {
  return text.replace(/```json\n?|```/g, "").trim();
}

export interface OpportunityBrief {
  solicitation_number: string;
  title: string;
  agency: string;
  sub_agency?: string;
  naics_code: string;
  set_aside_type?: string;
  deadline: string;
  estimated_value?: number;
  point_of_contact?: string;
  description?: string;
}

export interface PastAward {
  recipient: string;
  award_amount: number;
  award_date: string;
  contract_type: string;
  naics_code: string;
}

export interface CompetitiveLandscape {
  likely_competitors: Array<{
    company_name: string;
    past_awards: number;
    total_value: number;
    geographic_presence: string[];
    strength_assessment: 'high' | 'medium' | 'low';
  }>;
  market_concentration: 'highly_competitive' | 'moderately_competitive' | 'low_competition';
  incumbent_advantage: boolean;
}

export interface CapabilityGapAnalysis {
  required_capabilities: string[];
  our_capabilities: string[];
  gaps: Array<{
    capability: string;
    severity: 'critical' | 'moderate' | 'minor';
    can_acquire: boolean;
    teaming_needed: boolean;
  }>;
  overall_fit_score: number;
}

export interface WinProbabilityAssessment {
  win_probability: number;
  confidence_level: 'high' | 'medium' | 'low';
  score_breakdown: {
    past_performance_score: number;
    technical_capability_score: number;
    competitive_position_score: number;
    price_competitiveness_score: number;
  };
  recommendation: 'STRONG_BID' | 'BID' | 'BID_WITH_CAUTION' | 'NO_BID' | 'NEEDS_REVIEW';
  rationale: string;
  key_risk_factors: string[];
  key_strength_factors: string[];
}

export interface TeamingRecommendation {
  recommended_partners: Array<{
    company_name: string;
    fills_gaps: string[];
    past_performance_strength: number;
    recommendation_rationale: string;
  }>;
  teaming_strategy: 'prime' | 'subcontractor' | 'joint_venture' | 'not_needed';
}

/**
 * Analyze opportunity brief from SAM.gov data
 */
export async function analyzeOpportunityBrief(
  rawData: string,
  rfpNumber: string
): Promise<OpportunityBrief> {
  return executeJSON<OpportunityBrief>({
    role: 'RFP_ANALYZER',
    purpose: 'opportunity-brief-extraction',
    systemPrompt: `You are an expert RFP data extraction specialist. Extract structured opportunity data from SAM.gov listings.`,
    userMessage: `Extract the following information from this SAM.gov opportunity listing:

RFP Number: ${rfpNumber}

SAM.gov Data:
${rawData}

Extract and structure the data in valid JSON format:
{
  "solicitation_number": "string",
  "title": "string",
  "agency": "string",
  "sub_agency": "string or null",
  "naics_code": "string",
  "set_aside_type": "string or null (e.g., SDVOSB, 8(a), HUBZone, Unrestricted)",
  "deadline": "ISO date string",
  "estimated_value": number or null,
  "point_of_contact": "string or null",
  "description": "brief description string"
}

Respond with ONLY valid JSON, no additional text.`,
    maxTokens: 2048,
    tier: ModelTier.ADVANCED,
  });
}

/**
 * Analyze competitive landscape from USASpending.gov data
 */
export async function analyzeCompetitiveLandscape(
  pastAwards: PastAward[],
  agency: string,
  naicsCode: string
): Promise<CompetitiveLandscape> {
  return executeJSON<CompetitiveLandscape>({
    role: 'COMPETITIVE_INTELLIGENCE',
    purpose: 'competitive-landscape-analysis',
    systemPrompt: `You are a competitive intelligence analyst specializing in government contracting. Analyze past award data to identify likely competitors and assess competitive dynamics.`,
    userMessage: `Analyze this past awards data for ${agency} in NAICS ${naicsCode}:

Past Awards Data:
${JSON.stringify(pastAwards, null, 2)}

Provide competitive landscape analysis in valid JSON:
{
  "likely_competitors": [
    {
      "company_name": "string",
      "past_awards": number (count),
      "total_value": number (sum of awards),
      "geographic_presence": ["state1", "state2"],
      "strength_assessment": "high" | "medium" | "low"
    }
  ],
  "market_concentration": "highly_competitive" | "moderately_competitive" | "low_competition",
  "incumbent_advantage": boolean (true if one company dominates)
}

Focus on top 5-7 competitors. Assess strength based on award frequency, total value, and recency.

Respond with ONLY valid JSON, no additional text.`,
    maxTokens: 3072,
    tier: ModelTier.ADVANCED,
  });
}

/**
 * Perform capability gap analysis
 */
export async function analyzeCapabilityGaps(
  requirements: string,
  ourNaicsCodes: string[],
  ourCertifications: string[],
  opportunityNaics: string,
  setAsideType?: string
): Promise<CapabilityGapAnalysis> {
  return executeJSON<CapabilityGapAnalysis>({
    role: 'CAPABILITY_ASSESSOR',
    purpose: 'capability-gap-analysis',
    systemPrompt: `You are a capability assessment expert for government contractors. Analyze gaps between company capabilities and RFP requirements.`,
    userMessage: `Perform capability gap analysis:

RFP Requirements:
${requirements}

Required NAICS: ${opportunityNaics}
Set-Aside Type: ${setAsideType || 'Unrestricted'}

Our Company Profile:
- NAICS Codes: ${ourNaicsCodes.join(', ')}
- Certifications: ${ourCertifications.join(', ')}

Analyze gaps and provide assessment in valid JSON:
{
  "required_capabilities": ["cap1", "cap2", "cap3"],
  "our_capabilities": ["cap1", "cap4"],
  "gaps": [
    {
      "capability": "specific missing capability",
      "severity": "critical" | "moderate" | "minor",
      "can_acquire": boolean,
      "teaming_needed": boolean
    }
  ],
  "overall_fit_score": number (0-100)
}

Respond with ONLY valid JSON, no additional text.`,
    maxTokens: 3072,
    tier: ModelTier.ADVANCED,
  });
}

/**
 * Generate teaming recommendations based on gaps
 */
export async function generateTeamingRecommendations(
  gaps: CapabilityGapAnalysis,
  competitiveLandscape: CompetitiveLandscape
): Promise<TeamingRecommendation> {
  return executeJSON<TeamingRecommendation>({
    role: 'TEAMING_ADVISOR',
    purpose: 'teaming-recommendation',
    systemPrompt: `You are a teaming strategy consultant for government contractors. Recommend optimal teaming partners based on capability gaps and competitive landscape.`,
    userMessage: `Generate teaming recommendations:

Capability Gaps:
${JSON.stringify(gaps, null, 2)}

Competitive Landscape:
${JSON.stringify(competitiveLandscape, null, 2)}

Provide teaming strategy in valid JSON:
{
  "recommended_partners": [
    {
      "company_name": "specific company from competitive landscape OR generic profile",
      "fills_gaps": ["capability1", "capability2"],
      "past_performance_strength": number (0-100),
      "recommendation_rationale": "why this partner makes sense"
    }
  ],
  "teaming_strategy": "prime" | "subcontractor" | "joint_venture" | "not_needed"
}

Respond with ONLY valid JSON, no additional text.`,
    maxTokens: 2048,
    tier: ModelTier.ADVANCED,
  });
}

/**
 * Calculate win probability based on all collected evidence
 */
export async function calculateWinProbability(
  opportunityBrief: OpportunityBrief,
  competitiveLandscape: CompetitiveLandscape,
  capabilityGaps: CapabilityGapAnalysis,
  pastAwards: PastAward[],
  teamingRec: TeamingRecommendation,
  companyProfile: {
    pastPerformanceWithAgency: boolean;
    avgContractSize: number;
    yearsInBusiness: number;
  }
): Promise<WinProbabilityAssessment> {
  return executeJSON<WinProbabilityAssessment>({
    role: 'WIN_PROBABILITY_ANALYST',
    purpose: 'win-probability-calculation',
    systemPrompt: `You are a BD win probability expert with 20+ years of government contracting experience. Calculate realistic win probabilities using a proven scoring methodology.`,
    userMessage: `Calculate win probability for this opportunity:

OPPORTUNITY BRIEF:
${JSON.stringify(opportunityBrief, null, 2)}

COMPETITIVE LANDSCAPE:
${JSON.stringify(competitiveLandscape, null, 2)}

CAPABILITY GAP ANALYSIS:
${JSON.stringify(capabilityGaps, null, 2)}

PAST AWARDS DATA (for pricing context):
${JSON.stringify(pastAwards.slice(0, 10), null, 2)}

TEAMING RECOMMENDATIONS:
${JSON.stringify(teamingRec, null, 2)}

OUR COMPANY PROFILE:
${JSON.stringify(companyProfile, null, 2)}

Calculate win probability using this scoring methodology (0-25 pts each category, sum to 0-100).

Provide assessment in valid JSON:
{
  "win_probability": number (0-100),
  "confidence_level": "high" | "medium" | "low",
  "score_breakdown": {
    "past_performance_score": number,
    "technical_capability_score": number,
    "competitive_position_score": number,
    "price_competitiveness_score": number
  },
  "recommendation": "STRONG_BID" | "BID" | "BID_WITH_CAUTION" | "NO_BID" | "NEEDS_REVIEW",
  "rationale": "2-3 sentence justification",
  "key_risk_factors": ["risk1", "risk2", "risk3"],
  "key_strength_factors": ["strength1", "strength2"]
}

Respond with ONLY valid JSON, no additional text.`,
    maxTokens: 4096,
    tier: ModelTier.ADVANCED,
  });
}

/**
 * Generate executive BD decision memo
 */
export async function generateBDDecisionMemo(
  opportunityBrief: OpportunityBrief,
  winProbability: WinProbabilityAssessment,
  competitiveLandscape: CompetitiveLandscape,
  capabilityGaps: CapabilityGapAnalysis,
  teamingRec: TeamingRecommendation,
  pastAwards: PastAward[]
): Promise<string> {
  const result = await governedExecute({
    role: 'BD_MEMO_GENERATOR',
    purpose: 'executive-decision-memo',
    systemPrompt: `You are an executive BD strategist. Write clear, concise decision memos for C-suite executives.`,
    userMessage: `Generate an Executive BD Decision Memo based on this analysis:

OPPORTUNITY:
${JSON.stringify(opportunityBrief, null, 2)}

WIN PROBABILITY ASSESSMENT:
${JSON.stringify(winProbability, null, 2)}

COMPETITIVE LANDSCAPE:
${JSON.stringify(competitiveLandscape, null, 2)}

CAPABILITY GAPS:
${JSON.stringify(capabilityGaps, null, 2)}

TEAMING STRATEGY:
${JSON.stringify(teamingRec, null, 2)}

PAST AWARDS CONTEXT:
${JSON.stringify(pastAwards.slice(0, 5), null, 2)}

Write a professional BD Decision Memo in Markdown format with sections for:
Executive Summary, Opportunity Overview, Qualification Analysis, Competitive Landscape,
Capability Gap Analysis, Teaming Strategy, Pricing Guidance, Win Probability Breakdown,
Risk Assessment, and Recommendation & Next Steps.

Return ONLY the markdown memo, no additional text or JSON wrapper.`,
    maxTokens: 8192,
    tier: ModelTier.ADVANCED,
  });

  return result.content;
}
