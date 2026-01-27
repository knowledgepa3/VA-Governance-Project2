/**
 * RFP Analysis Service
 * Uses Claude API to analyze RFP data and calculate win probabilities
 */

import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

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
  overall_fit_score: number; // 0-100
}

export interface WinProbabilityAssessment {
  win_probability: number; // 0-100
  confidence_level: 'high' | 'medium' | 'low';
  score_breakdown: {
    past_performance_score: number; // 0-25
    technical_capability_score: number; // 0-25
    competitive_position_score: number; // 0-25
    price_competitiveness_score: number; // 0-25
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
  try {
    const response = await client.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 2048,
      system: `You are an expert RFP data extraction specialist. Extract structured opportunity data from SAM.gov listings.`,
      messages: [{
        role: "user",
        content: `Extract the following information from this SAM.gov opportunity listing:

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

Respond with ONLY valid JSON, no additional text.`
      }]
    });

    const textContent = response.content[0].type === 'text' ? response.content[0].text : '{}';
    return JSON.parse(cleanJsonResponse(textContent));
  } catch (error) {
    console.error('Error analyzing opportunity brief:', error);
    throw error;
  }
}

/**
 * Analyze competitive landscape from USASpending.gov data
 */
export async function analyzeCompetitiveLandscape(
  pastAwards: PastAward[],
  agency: string,
  naicsCode: string
): Promise<CompetitiveLandscape> {
  try {
    const response = await client.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 3072,
      system: `You are a competitive intelligence analyst specializing in government contracting. Analyze past award data to identify likely competitors and assess competitive dynamics.`,
      messages: [{
        role: "user",
        content: `Analyze this past awards data for ${agency} in NAICS ${naicsCode}:

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

Respond with ONLY valid JSON, no additional text.`
      }]
    });

    const textContent = response.content[0].type === 'text' ? response.content[0].text : '{}';
    return JSON.parse(cleanJsonResponse(textContent));
  } catch (error) {
    console.error('Error analyzing competitive landscape:', error);
    throw error;
  }
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
  try {
    const response = await client.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 3072,
      system: `You are a capability assessment expert for government contractors. Analyze gaps between company capabilities and RFP requirements.`,
      messages: [{
        role: "user",
        content: `Perform capability gap analysis:

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
      "can_acquire": boolean (can we hire/train),
      "teaming_needed": boolean
    }
  ],
  "overall_fit_score": number (0-100, how well we match requirements)
}

Rate severity:
- CRITICAL: Required for qualification, we don't have it
- MODERATE: Important but could work around or acquire
- MINOR: Nice to have, not essential

Respond with ONLY valid JSON, no additional text.`
      }]
    });

    const textContent = response.content[0].type === 'text' ? response.content[0].text : '{}';
    return JSON.parse(cleanJsonResponse(textContent));
  } catch (error) {
    console.error('Error analyzing capability gaps:', error);
    throw error;
  }
}

/**
 * Generate teaming recommendations based on gaps
 */
export async function generateTeamingRecommendations(
  gaps: CapabilityGapAnalysis,
  competitiveLandscape: CompetitiveLandscape
): Promise<TeamingRecommendation> {
  try {
    const response = await client.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 2048,
      system: `You are a teaming strategy consultant for government contractors. Recommend optimal teaming partners based on capability gaps and competitive landscape.`,
      messages: [{
        role: "user",
        content: `Generate teaming recommendations:

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

Strategy guide:
- "prime": We lead, subcontract for gaps
- "subcontractor": We support a stronger prime
- "joint_venture": Equal partnership for major gaps
- "not_needed": We can handle solo

Prioritize companies from competitive landscape that fill our gaps but aren't direct competitors.

Respond with ONLY valid JSON, no additional text.`
      }]
    });

    const textContent = response.content[0].type === 'text' ? response.content[0].text : '{}';
    return JSON.parse(cleanJsonResponse(textContent));
  } catch (error) {
    console.error('Error generating teaming recommendations:', error);
    throw error;
  }
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
  try {
    const response = await client.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 4096,
      system: `You are a BD win probability expert with 20+ years of government contracting experience. Calculate realistic win probabilities using a proven scoring methodology.`,
      messages: [{
        role: "user",
        content: `Calculate win probability for this opportunity:

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

Calculate win probability using this scoring methodology:

1. PAST PERFORMANCE SCORE (0-25 points):
   - Have we worked with this agency before? (+15 pts)
   - Similar contract size? (+5 pts)
   - Relevant NAICS experience? (+5 pts)

2. TECHNICAL CAPABILITY SCORE (0-25 points):
   - Overall fit score from capability analysis (use gap analysis overall_fit_score / 4)
   - Critical gaps? (-10 pts each)
   - Can fill gaps with teaming? (recover +5 pts per gap)

3. COMPETITIVE POSITION SCORE (0-25 points):
   - Low competition? (+20 pts)
   - Moderate competition? (+12 pts)
   - High competition? (+5 pts)
   - Incumbent advantage present? (-5 pts if we're not incumbent)

4. PRICE COMPETITIVENESS SCORE (0-25 points):
   - Our typical contract size matches opportunity? (+15 pts)
   - We can match median past award pricing? (+10 pts)
   - If no past award data, use estimated value reasonableness (+10 pts)

Sum scores to get win probability (0-100).

Provide assessment in valid JSON:
{
  "win_probability": number (0-100, be realistic),
  "confidence_level": "high" | "medium" | "low",
  "score_breakdown": {
    "past_performance_score": number,
    "technical_capability_score": number,
    "competitive_position_score": number,
    "price_competitiveness_score": number
  },
  "recommendation": "STRONG_BID" | "BID" | "BID_WITH_CAUTION" | "NO_BID" | "NEEDS_REVIEW",
  "rationale": "2-3 sentence justification for recommendation",
  "key_risk_factors": ["risk1", "risk2", "risk3"],
  "key_strength_factors": ["strength1", "strength2"]
}

Recommendation thresholds:
- STRONG_BID: Win prob > 70%
- BID: Win prob 50-70%
- BID_WITH_CAUTION: Win prob 30-50%
- NO_BID: Win prob < 30%
- NEEDS_REVIEW: High value (>$5M) or borderline score

Respond with ONLY valid JSON, no additional text.`
      }]
    });

    const textContent = response.content[0].type === 'text' ? response.content[0].text : '{}';
    return JSON.parse(cleanJsonResponse(textContent));
  } catch (error) {
    console.error('Error calculating win probability:', error);
    throw error;
  }
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
  try {
    const response = await client.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 8192,
      system: `You are an executive BD strategist. Write clear, concise decision memos for C-suite executives.`,
      messages: [{
        role: "user",
        content: `Generate an Executive BD Decision Memo based on this analysis:

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

Write a professional BD Decision Memo in Markdown format with these sections:

# BD DECISION MEMO: [Opportunity Title]

**Solicitation Number:** [number]
**Agency:** [agency]
**Response Deadline:** [date]
**Estimated Value:** [value]
**Win Probability:** [X%]

---

## EXECUTIVE SUMMARY

[2-3 sentences: Recommendation (BID/NO-BID) with primary rationale]

---

## OPPORTUNITY OVERVIEW

[Brief description of the requirement, agency, contract type, performance period]

---

## QUALIFICATION ANALYSIS

- NAICS Code Match: [Yes/No]
- Set-Aside Eligibility: [Yes/No/N/A]
- Contract Size Fit: [Within range/Too large/Too small]
- Deadline Feasibility: [Adequate/Tight/Unrealistic]

---

## COMPETITIVE LANDSCAPE

[Who are the likely competitors? Incumbent advantage? Market concentration?]

**Top Competitors:**
1. [Company 1] - [strength assessment]
2. [Company 2] - [strength assessment]
3. [Company 3] - [strength assessment]

---

## CAPABILITY GAP ANALYSIS

**Strengths:**
- [Strength 1]
- [Strength 2]

**Gaps:**
- [Gap 1 - severity level]
- [Gap 2 - severity level]

**Overall Fit Score:** [X/100]

---

## TEAMING STRATEGY

[Recommended teaming approach and rationale]

**Potential Partners:**
- [Partner 1]: [fills what gaps]
- [Partner 2]: [fills what gaps]

---

## PRICING GUIDANCE

[Based on past awards, what's the competitive price range?]

**Market Intelligence:**
- Median Award Value: [$X]
- Typical Range: [$Y - $Z]
- Pricing Strategy: [cost-plus/fixed-price]

---

## WIN PROBABILITY BREAKDOWN

| Factor | Score | Max |
|--------|-------|-----|
| Past Performance | [X] | 25 |
| Technical Capability | [X] | 25 |
| Competitive Position | [X] | 25 |
| Price Competitiveness | [X] | 25 |
| **Total Win Probability** | **[X]** | **100** |

**Confidence Level:** [High/Medium/Low]

---

## RISK ASSESSMENT

**Key Risks:**
1. [Risk 1]
2. [Risk 2]
3. [Risk 3]

**Mitigation Strategies:**
- [Mitigation for risk 1]
- [Mitigation for risk 2]

---

## RECOMMENDATION & NEXT STEPS

**Recommendation:** [STRONG BID / BID / BID WITH CAUTION / NO-BID]

**Rationale:** [1-2 sentences justifying the recommendation]

**If pursuing, next steps:**
1. [Action item 1 with owner]
2. [Action item 2 with owner]
3. [Action item 3 with owner]

**Decision Required By:** [Date 7 days before deadline]

---

*Generated by ACE Governed BD Workforce*
*Analysis Date: [Current date]*

Return ONLY the markdown memo, no additional text or JSON wrapper.`
      }]
    });

    const textContent = response.content[0].type === 'text' ? response.content[0].text : '';
    return textContent;
  } catch (error) {
    console.error('Error generating BD decision memo:', error);
    throw error;
  }
}
