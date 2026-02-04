/**
 * USASpending.gov Scraper
 * Extracts past awards and competitive intelligence data
 */

import { chromium, Browser, Page } from 'playwright';
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

export interface PastAwardData {
  recipient_name: string;
  award_amount: number;
  award_date: string;
  award_id: string;
  contract_type: string;
  naics_code: string;
  naics_description: string;
  awarding_agency: string;
  awarding_sub_agency?: string;
  place_of_performance: string;
  period_of_performance: string;
  description: string;
}

export interface CompetitorProfile {
  company_name: string;
  total_awards: number;
  total_value: number;
  average_award: number;
  award_years: number[];
  naics_codes: string[];
  primary_agencies: string[];
  recent_contracts: string[];
  strength_score: number; // 0-100
}

export interface MarketIntelligence {
  median_award_value: number;
  min_award_value: number;
  max_award_value: number;
  total_contracts_analyzed: number;
  top_competitors: CompetitorProfile[];
  market_trends: {
    year: number;
    contract_count: number;
    total_value: number;
  }[];
  typical_contract_types: Record<string, number>;
}

/**
 * Search past awards by agency and NAICS code
 */
export async function searchPastAwards(
  agency: string,
  naicsCode: string,
  yearsBack: number = 3
): Promise<PastAwardData[]> {
  let browser: Browser | null = null;

  try {
    console.log(`[USASpending] Searching awards: ${agency}, NAICS ${naicsCode}, ${yearsBack} years`);

    browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox']
    });

    const context = await browser.newContext({
      viewport: { width: 1280, height: 720 },
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    });

    const page = await context.newPage();

    // Navigate to USASpending.gov Advanced Search
    console.log(`[USASpending] Navigating to search page...`);
    await page.goto('https://www.usaspending.gov/search', {
      waitUntil: 'networkidle',
      timeout: 60000
    });

    await page.waitForTimeout(3000);

    // Take screenshot for Claude to analyze
    const searchScreenshot = await page.screenshot({ type: 'png', fullPage: false });

    // Use Claude Vision to help navigate the search interface
    const searchGuidance = await getSearchGuidance(
      searchScreenshot.toString('base64'),
      agency,
      naicsCode
    );

    console.log(`[USASpending] Search guidance: ${searchGuidance.approach}`);

    // Try to execute the search based on guidance
    // Note: USASpending.gov has a complex React interface, so we may need to use the API
    const startYear = new Date().getFullYear() - yearsBack;
    const endYear = new Date().getFullYear();

    // Alternative: Use USASpending API directly (more reliable)
    const apiResults = await searchViaAPI(agency, naicsCode, startYear, endYear);

    console.log(`[USASpending] Found ${apiResults.length} past awards`);

    return apiResults;

  } catch (error) {
    console.error(`[USASpending] Error searching awards:`, error);
    // Return mock data on error
    return generateMockPastAwards(agency, naicsCode);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

/**
 * Use USASpending.gov API for more reliable data extraction
 */
async function searchViaAPI(
  agency: string,
  naicsCode: string,
  startYear: number,
  endYear: number
): Promise<PastAwardData[]> {
  try {
    // USASpending.gov has a public API
    const apiUrl = 'https://api.usaspending.gov/api/v2/search/spending_by_award/';

    const requestBody = {
      filters: {
        time_period: [
          {
            start_date: `${startYear}-01-01`,
            end_date: `${endYear}-12-31`
          }
        ],
        naics_codes: [naicsCode],
        award_type_codes: ['A', 'B', 'C', 'D'], // Contract types
        agencies: [
          {
            type: 'awarding',
            tier: 'toptier',
            name: agency
          }
        ]
      },
      fields: [
        'Award ID',
        'Recipient Name',
        'Award Amount',
        'Start Date',
        'End Date',
        'Award Type',
        'Awarding Agency',
        'Awarding Sub Agency',
        'NAICS Code',
        'NAICS Description',
        'Place of Performance'
      ],
      page: 1,
      limit: 100,
      sort: 'Award Amount',
      order: 'desc'
    };

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`);
    }

    const data = await response.json();

    // Transform API response to our format
    const awards: PastAwardData[] = (data.results || []).map((award: any) => ({
      recipient_name: award.recipient_name || award['Recipient Name'] || 'Unknown',
      award_amount: parseFloat(award['Award Amount'] || award.total_obligation || 0),
      award_date: award['Start Date'] || award.period_of_performance_start_date || new Date().toISOString(),
      award_id: award['Award ID'] || award.generated_unique_award_id || '',
      contract_type: award['Award Type'] || award.type_description || 'Unknown',
      naics_code: naicsCode,
      naics_description: award['NAICS Description'] || award.naics_description || '',
      awarding_agency: agency,
      awarding_sub_agency: award['Awarding Sub Agency'] || '',
      place_of_performance: award['Place of Performance'] || award.place_of_performance || '',
      period_of_performance: `${award['Start Date'] || ''} to ${award['End Date'] || ''}`,
      description: award.description || award['Award Description'] || ''
    }));

    return awards;

  } catch (error) {
    console.warn('[USASpending] API request failed, using mock data:', error);
    return generateMockPastAwards(agency, naicsCode);
  }
}

/**
 * Use Claude Vision to understand the search interface
 */
async function getSearchGuidance(
  screenshotBase64: string,
  agency: string,
  naicsCode: string
): Promise<{ approach: string; selectors?: any }> {
  try {
    const response = await client.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 1024,
      messages: [{
        role: "user",
        content: [
          {
            type: "image",
            source: {
              type: "base64",
              media_type: "image/png",
              data: screenshotBase64
            }
          },
          {
            type: "text",
            text: `Analyze this USASpending.gov search interface.

I need to search for:
- Agency: ${agency}
- NAICS Code: ${naicsCode}
- Award Type: Contracts
- Time Period: Last 3 years

Describe the approach in JSON:
{
  "approach": "description of how to use this interface",
  "complexity": "simple|moderate|complex"
}`
          }
        ]
      }]
    });

    const textContent = response.content[0].type === 'text' ? response.content[0].text : '{}';
    const cleaned = textContent.replace(/```json\n?|```/g, "").trim();
    return JSON.parse(cleaned);
  } catch (error) {
    return { approach: 'Use API directly due to complex interface' };
  }
}

/**
 * Analyze past awards to build competitive intelligence
 */
export async function analyzeCompetitors(
  pastAwards: PastAwardData[]
): Promise<MarketIntelligence> {
  console.log(`[USASpending] Analyzing ${pastAwards.length} awards for competitive intelligence`);

  // Group by recipient to build competitor profiles
  const competitorMap = new Map<string, PastAwardData[]>();

  pastAwards.forEach(award => {
    const name = award.recipient_name;
    if (!competitorMap.has(name)) {
      competitorMap.set(name, []);
    }
    competitorMap.get(name)!.push(award);
  });

  // Build competitor profiles
  const competitors: CompetitorProfile[] = Array.from(competitorMap.entries())
    .map(([name, awards]) => {
      const totalValue = awards.reduce((sum, a) => sum + a.award_amount, 0);
      const avgAward = totalValue / awards.length;

      // Extract years
      const years = awards.map(a => new Date(a.award_date).getFullYear());
      const uniqueYears = Array.from(new Set(years));

      // Extract NAICS codes
      const naicsCodes = Array.from(new Set(awards.map(a => a.naics_code)));

      // Extract agencies
      const agencies = Array.from(new Set(awards.map(a => a.awarding_agency)));

      // Calculate strength score based on frequency, recency, and value
      const recentAwards = awards.filter(a =>
        new Date(a.award_date).getFullYear() >= new Date().getFullYear() - 2
      ).length;

      const strengthScore = Math.min(100, (
        (awards.length * 10) + // More awards = stronger
        (recentAwards * 15) + // Recent awards = stronger
        (Math.log10(totalValue) * 5) // Higher value = stronger
      ));

      return {
        company_name: name,
        total_awards: awards.length,
        total_value: totalValue,
        average_award: avgAward,
        award_years: uniqueYears.sort(),
        naics_codes: naicsCodes,
        primary_agencies: agencies,
        recent_contracts: awards.slice(0, 3).map(a => a.award_id),
        strength_score: Math.round(strengthScore)
      };
    })
    .sort((a, b) => b.strength_score - a.strength_score);

  // Calculate market statistics
  const values = pastAwards.map(a => a.award_amount).sort((a, b) => a - b);
  const median = values.length > 0 ? values[Math.floor(values.length / 2)] : 0;
  const min = values.length > 0 ? values[0] : 0;
  const max = values.length > 0 ? values[values.length - 1] : 0;

  // Market trends by year
  const yearMap = new Map<number, { count: number; value: number }>();
  pastAwards.forEach(award => {
    const year = new Date(award.award_date).getFullYear();
    if (!yearMap.has(year)) {
      yearMap.set(year, { count: 0, value: 0 });
    }
    const entry = yearMap.get(year)!;
    entry.count++;
    entry.value += award.award_amount;
  });

  const marketTrends = Array.from(yearMap.entries())
    .map(([year, data]) => ({
      year,
      contract_count: data.count,
      total_value: data.value
    }))
    .sort((a, b) => a.year - b.year);

  // Contract types distribution
  const contractTypes: Record<string, number> = {};
  pastAwards.forEach(award => {
    const type = award.contract_type;
    contractTypes[type] = (contractTypes[type] || 0) + 1;
  });

  return {
    median_award_value: median,
    min_award_value: min,
    max_award_value: max,
    total_contracts_analyzed: pastAwards.length,
    top_competitors: competitors.slice(0, 10),
    market_trends: marketTrends,
    typical_contract_types: contractTypes
  };
}

/**
 * Generate mock past awards for testing
 */
function generateMockPastAwards(agency: string, naicsCode: string): PastAwardData[] {
  const mockCompanies = [
    'Acme IT Solutions LLC',
    'TechCorp Federal Services',
    'Digital Innovations Inc',
    'Enterprise Systems Group',
    'Global Tech Partners',
    'Federal IT Specialists',
    'Advanced Solutions Corp'
  ];

  const currentYear = new Date().getFullYear();
  const awards: PastAwardData[] = [];

  // Generate 15-30 mock awards over 3 years
  const numAwards = Math.floor(Math.random() * 15) + 15;

  for (let i = 0; i < numAwards; i++) {
    const company = mockCompanies[Math.floor(Math.random() * mockCompanies.length)];
    const year = currentYear - Math.floor(Math.random() * 3);
    const month = Math.floor(Math.random() * 12);
    const awardDate = new Date(year, month, 1);

    const baseValue = 1000000 + Math.random() * 4000000;

    awards.push({
      recipient_name: company,
      award_amount: Math.round(baseValue),
      award_date: awardDate.toISOString(),
      award_id: `MOCK-${year}-${String(i).padStart(4, '0')}`,
      contract_type: ['FFP', 'T&M', 'CPFF'][Math.floor(Math.random() * 3)],
      naics_code: naicsCode,
      naics_description: 'Computer Systems Design Services',
      awarding_agency: agency,
      awarding_sub_agency: 'Information Technology Division',
      place_of_performance: ['Washington, DC', 'Arlington, VA', 'Multiple Locations'][Math.floor(Math.random() * 3)],
      period_of_performance: '12 months',
      description: 'IT support and system administration services'
    });
  }

  return awards.sort((a, b) => b.award_amount - a.award_amount);
}

/**
 * Data source result with audit tracking
 */
export interface DataSourceResult<T> {
  data: T;
  source: 'USA_SPENDING_API' | 'USA_SPENDING_SCRAPE' | 'MOCK';
  timestamp: Date;
  warnings?: string[];
}

/**
 * Search past awards with data source tracking for audit
 * Supports strict mode that throws instead of falling back to mock data
 */
export async function searchPastAwardsWithSource(
  agency: string,
  naicsCode: string,
  yearsBack: number = 3,
  strictMode: boolean = false
): Promise<DataSourceResult<PastAwardData[]>> {
  const timestamp = new Date();
  const warnings: string[] = [];

  try {
    // Try the real API first
    const startYear = new Date().getFullYear() - yearsBack;
    const endYear = new Date().getFullYear();

    const apiResults = await searchViaAPIWithSource(agency, naicsCode, startYear, endYear);

    if (apiResults.length > 0) {
      console.log(`[USASpending] Successfully retrieved ${apiResults.length} awards from API`);
      return {
        data: apiResults,
        source: 'USA_SPENDING_API',
        timestamp
      };
    }

    // API returned empty results - not necessarily an error
    warnings.push('USASpending API returned no results for the given criteria');

    // In strict mode, throw error instead of using mock data
    if (strictMode) {
      throw new Error(
        `USASpending API returned no results for agency="${agency}", NAICS="${naicsCode}". ` +
        `Strict mode is enabled - mock data fallback is disabled. ` +
        `Verify the agency name and NAICS code are correct.`
      );
    }

    // Fall back to mock data in non-strict mode
    console.warn(`[USASpending] No API results, falling back to mock data (strict mode: ${strictMode})`);
    return {
      data: generateMockPastAwards(agency, naicsCode),
      source: 'MOCK',
      timestamp,
      warnings: [...warnings, 'Using mock data due to empty API results']
    };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[USASpending] Error searching awards:`, errorMessage);

    // In strict mode, propagate the error
    if (strictMode) {
      throw new Error(
        `USASpending data fetch failed: ${errorMessage}. ` +
        `Strict mode is enabled - mock data fallback is disabled.`
      );
    }

    // Fall back to mock data in non-strict mode
    warnings.push(`API error: ${errorMessage}`);
    return {
      data: generateMockPastAwards(agency, naicsCode),
      source: 'MOCK',
      timestamp,
      warnings: [...warnings, 'Using mock data due to API error']
    };
  }
}

/**
 * Internal API call with better error handling
 */
async function searchViaAPIWithSource(
  agency: string,
  naicsCode: string,
  startYear: number,
  endYear: number
): Promise<PastAwardData[]> {
  const apiUrl = 'https://api.usaspending.gov/api/v2/search/spending_by_award/';

  const requestBody = {
    filters: {
      time_period: [
        {
          start_date: `${startYear}-01-01`,
          end_date: `${endYear}-12-31`
        }
      ],
      naics_codes: [naicsCode],
      award_type_codes: ['A', 'B', 'C', 'D'],
      agencies: [
        {
          type: 'awarding',
          tier: 'toptier',
          name: agency
        }
      ]
    },
    fields: [
      'Award ID',
      'Recipient Name',
      'Award Amount',
      'Start Date',
      'End Date',
      'Award Type',
      'Awarding Agency',
      'Awarding Sub Agency',
      'NAICS Code',
      'NAICS Description',
      'Place of Performance'
    ],
    page: 1,
    limit: 100,
    sort: 'Award Amount',
    order: 'desc'
  };

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(requestBody)
  });

  if (!response.ok) {
    throw new Error(`USASpending API returned ${response.status}: ${response.statusText}`);
  }

  const data = await response.json();

  return (data.results || []).map((award: any) => ({
    recipient_name: award.recipient_name || award['Recipient Name'] || 'Unknown',
    award_amount: parseFloat(award['Award Amount'] || award.total_obligation || 0),
    award_date: award['Start Date'] || award.period_of_performance_start_date || new Date().toISOString(),
    award_id: award['Award ID'] || award.generated_unique_award_id || '',
    contract_type: award['Award Type'] || award.type_description || 'Unknown',
    naics_code: naicsCode,
    naics_description: award['NAICS Description'] || award.naics_description || '',
    awarding_agency: agency,
    awarding_sub_agency: award['Awarding Sub Agency'] || '',
    place_of_performance: award['Place of Performance'] || award.place_of_performance || '',
    period_of_performance: `${award['Start Date'] || ''} to ${award['End Date'] || ''}`,
    description: award.description || award['Award Description'] || ''
  }));
}
