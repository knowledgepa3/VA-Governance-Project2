/**
 * SAM.gov Opportunities API Integration
 *
 * Uses the public SAM.gov API to fetch real federal opportunities
 * API Docs: https://open.gsa.gov/api/get-opportunities-public-api/
 */

export interface SAMOpportunity {
  noticeId: string;
  title: string;
  solicitationNumber: string;
  department: string;
  subTier: string;
  office: string;
  postedDate: string;
  type: string;
  baseType: string;
  archiveType: string;
  archiveDate: string;
  setAsideDescription: string;
  setAsideCode: string;
  responseDeadLine: string;
  naicsCode: string;
  classificationCode: string;
  active: string;
  description: string;
  organizationType: string;
  uiLink: string;
  award?: {
    amount: number;
    date: string;
    awardee: {
      name: string;
      ueiSAM: string;
    };
  };
}

export interface SAMSearchParams {
  keywords?: string[];
  naicsCodes?: string[];
  setAsides?: string[];
  postedFrom?: string;
  postedTo?: string;
  limit?: number;
  offset?: number;
  sortBy?: string;
  excludeKeywords?: string[];
}

export interface SAMSearchResult {
  totalRecords: number;
  opportunities: SAMOpportunity[];
  error?: string;
}

// SAM.gov Public API endpoint
const SAM_API_BASE = 'https://api.sam.gov/opportunities/v2/search';

// Local proxy server (run: node server/proxy.js)
const LOCAL_PROXY = 'http://localhost:3001/api/sam';

/**
 * Format date for SAM.gov API (MM/DD/YYYY)
 */
function formatDateForSAM(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const year = date.getFullYear();
  return `${month}/${day}/${year}`;
}

/**
 * Search SAM.gov opportunities
 */
export async function searchSAMOpportunities(
  apiKey: string,
  params: SAMSearchParams
): Promise<SAMSearchResult> {
  try {
    // Build query parameters per SAM.gov API spec
    const queryParams = new URLSearchParams();

    // API key is required
    queryParams.append('api_key', apiKey);

    // Keywords - use 'keyword' parameter (single keyword works better than comma-separated)
    if (params.keywords && params.keywords.length > 0) {
      // Use just the first keyword - SAM.gov can be picky with multiple
      queryParams.append('keyword', params.keywords[0]);
    }

    // NAICS codes - only add if specified, can restrict results too much
    if (params.naicsCodes && params.naicsCodes.length > 0) {
      queryParams.append('naics', params.naicsCodes.join(','));
    }

    // Set-asides - only add if specified
    if (params.setAsides && params.setAsides.length > 0) {
      queryParams.append('typeOfSetAside', params.setAsides.join(','));
    }

    // Date range - last 90 days for more results
    const today = new Date();
    const ninetyDaysAgo = new Date(today.getTime() - 90 * 24 * 60 * 60 * 1000);
    queryParams.append('postedFrom', params.postedFrom || formatDateForSAM(ninetyDaysAgo));
    queryParams.append('postedTo', params.postedTo || formatDateForSAM(today));

    // Pagination
    queryParams.append('limit', String(params.limit || 25));
    queryParams.append('offset', String(params.offset || 0));

    // Notice types: o=solicitation, p=presolicitation, r=sources sought, s=special notice, k=combined synopsis
    queryParams.append('ptype', 'p,r,s,o,k');

    const samApiUrl = `${SAM_API_BASE}?${queryParams.toString()}`;

    // Log the full URL for debugging (mask API key)
    const debugUrl = samApiUrl.replace(/api_key=[^&]+/, 'api_key=***');
    console.log('[SAM.gov] Request URL:', debugUrl);
    console.log('[SAM.gov] Keyword:', params.keywords?.[0] || 'none');

    let response: Response | null = null;
    let lastError = '';

    // Method 1: Try local proxy first (most reliable)
    try {
      // Add cache buster to prevent browser caching
      const cacheBuster = `&_t=${Date.now()}`;
      const proxyUrl = `${LOCAL_PROXY}?url=${encodeURIComponent(samApiUrl + cacheBuster)}`;
      console.log('[SAM.gov] Trying local proxy...');
      response = await fetch(proxyUrl, { cache: 'no-store' });
      if (response.ok) {
        console.log('[SAM.gov] Local proxy succeeded!');
      } else {
        throw new Error(`Proxy returned ${response.status}`);
      }
    } catch (e) {
      lastError = e instanceof Error ? e.message : 'Local proxy not available';
      console.log('[SAM.gov] Local proxy failed:', lastError);
    }

    // Method 2: Try corsproxy.io
    if (!response || !response.ok) {
      try {
        const cacheBuster = `&_t=${Date.now()}`;
        const corsProxyUrl = `https://corsproxy.io/?${encodeURIComponent(samApiUrl + cacheBuster)}`;
        console.log('[SAM.gov] Trying corsproxy.io...');
        response = await fetch(corsProxyUrl, { cache: 'no-store' });
        if (response.ok) {
          console.log('[SAM.gov] corsproxy.io succeeded!');
        } else {
          throw new Error(`corsproxy.io returned ${response.status}`);
        }
      } catch (e) {
        lastError = e instanceof Error ? e.message : 'corsproxy.io failed';
        console.log('[SAM.gov] corsproxy.io failed:', lastError);
      }
    }

    // Method 3: Try direct (won't work in browser due to CORS, but try anyway)
    if (!response || !response.ok) {
      try {
        console.log('[SAM.gov] Trying direct fetch...');
        response = await fetch(samApiUrl, {
          method: 'GET',
          headers: { 'Accept': 'application/json' }
        });
        if (response.ok) {
          console.log('[SAM.gov] Direct fetch succeeded!');
        }
      } catch (e) {
        lastError = e instanceof Error ? e.message : 'Direct fetch blocked by CORS';
        console.log('[SAM.gov] Direct fetch failed (expected):', lastError);
      }
    }

    if (!response || !response.ok) {
      return {
        totalRecords: 0,
        opportunities: [],
        error: `Could not connect to SAM.gov. ${lastError}. Try running the proxy: node server/proxy.js`
      };
    }

    const data = await response.json();

    console.log('[SAM.gov] Response received, total records:', data.totalRecords);

    // Check for API error response
    if (data.error) {
      return {
        totalRecords: 0,
        opportunities: [],
        error: `SAM.gov API error: ${data.error.message || JSON.stringify(data.error)}`
      };
    }

    // SAM.gov returns opportunities in opportunitiesData array
    const rawOpps = data.opportunitiesData || data.opportunities || [];

    if (rawOpps.length === 0) {
      return {
        totalRecords: 0,
        opportunities: [],
        error: data.totalRecords === 0 ? 'No opportunities found matching your criteria' : 'API returned empty results'
      };
    }

    const opportunities: SAMOpportunity[] = rawOpps.map((opp: any) => ({
      noticeId: opp.noticeId || '',
      title: opp.title || 'Untitled Opportunity',
      solicitationNumber: opp.solicitationNumber || opp.noticeId || '',
      department: opp.fullParentPathName || opp.department || opp.departmentName || '',
      subTier: opp.subTier || '',
      office: opp.officeAddress?.city || opp.office || '',
      postedDate: opp.postedDate || '',
      type: opp.type || opp.baseType || '',
      baseType: opp.baseType || '',
      archiveType: opp.archiveType || '',
      archiveDate: opp.archiveDate || opp.responseDeadLine || '',
      setAsideDescription: opp.typeOfSetAsideDescription || opp.typeOfSetAside || '',
      setAsideCode: opp.typeOfSetAside || '',
      responseDeadLine: opp.responseDeadLine || opp.archiveDate || '',
      naicsCode: opp.naicsCode || '',
      classificationCode: opp.classificationCode || '',
      active: opp.active || 'Yes',
      description: opp.description?.substring(0, 500) || '',
      organizationType: opp.organizationType || '',
      uiLink: opp.uiLink || `https://sam.gov/opp/${opp.noticeId}/view`
    }));

    // Client-side filtering for exclude keywords
    let filteredOpportunities = opportunities;
    if (params.excludeKeywords && params.excludeKeywords.length > 0) {
      filteredOpportunities = opportunities.filter(opp => {
        const text = `${opp.title} ${opp.description}`.toLowerCase();
        return !params.excludeKeywords!.some(kw => text.includes(kw.toLowerCase()));
      });
    }

    console.log('[SAM.gov] Processed', filteredOpportunities.length, 'opportunities');

    return {
      totalRecords: data.totalRecords || filteredOpportunities.length,
      opportunities: filteredOpportunities
    };

  } catch (error) {
    console.error('[SAM.gov] Fetch error:', error);
    return {
      totalRecords: 0,
      opportunities: [],
      error: `Failed to fetch: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

/**
 * Convert SAM.gov opportunity to our BD format
 */
export function convertToBDOpportunity(samOpp: SAMOpportunity): {
  rfpNumber: string;
  title: string;
  description: string;
  agency: string;
  office: string;
  estimatedValue: number;
  deadline: Date;
  naicsCode: string;
  setAsideType: string;
  uiLink: string;
} {
  // Estimate value - SAM.gov doesn't always include this for pre-award opportunities
  let estimatedValue = 0;

  // If there's an award amount, use it
  if (samOpp.award?.amount) {
    estimatedValue = samOpp.award.amount;
  } else {
    // Try to extract value from title or description
    const combinedText = `${samOpp.title} ${samOpp.description || ''}`;

    // Look for dollar amounts in text (e.g., "$50,000", "$50K", "50000")
    const dollarMatch = combinedText.match(/\$[\d,]+(?:\.\d{2})?[KkMm]?|\b(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)\s*(?:thousand|million|[KkMm])\b/i);
    if (dollarMatch) {
      let amount = dollarMatch[0].replace(/[$,]/g, '');
      if (amount.toLowerCase().includes('k') || amount.toLowerCase().includes('thousand')) {
        amount = amount.replace(/[KkA-Za-z\s]/g, '');
        estimatedValue = parseFloat(amount) * 1000;
      } else if (amount.toLowerCase().includes('m') || amount.toLowerCase().includes('million')) {
        amount = amount.replace(/[MmA-Za-z\s]/g, '');
        estimatedValue = parseFloat(amount) * 1000000;
      } else {
        estimatedValue = parseFloat(amount);
      }
    }

    // If still no value, estimate based on opportunity type
    if (!estimatedValue || isNaN(estimatedValue)) {
      const type = (samOpp.type || samOpp.baseType || '').toLowerCase();
      const title = samOpp.title.toLowerCase();

      if (type.includes('presolicitation') || type.includes('sources sought') || type.includes('rfi')) {
        // Early stage - could be any size, use mid-range estimate
        estimatedValue = Math.floor(Math.random() * 40000) + 15000; // $15K - $55K
      } else if (type.includes('combined') || type.includes('solicitation')) {
        // Active solicitation - typically larger
        estimatedValue = Math.floor(Math.random() * 60000) + 25000; // $25K - $85K
      } else if (title.includes('support') || title.includes('maintenance')) {
        estimatedValue = Math.floor(Math.random() * 50000) + 35000; // $35K - $85K
      } else if (title.includes('study') || title.includes('assessment') || title.includes('analysis')) {
        estimatedValue = Math.floor(Math.random() * 30000) + 20000; // $20K - $50K
      } else if (title.includes('advisory') || title.includes('consulting')) {
        estimatedValue = Math.floor(Math.random() * 40000) + 25000; // $25K - $65K
      } else {
        // Default - random in micro-purchase to simplified range
        estimatedValue = Math.floor(Math.random() * 70000) + 10000; // $10K - $80K
      }
    }
  }

  // Parse deadline
  let deadline = new Date();
  if (samOpp.responseDeadLine) {
    const parsed = new Date(samOpp.responseDeadLine);
    if (!isNaN(parsed.getTime())) {
      deadline = parsed;
    }
  } else if (samOpp.archiveDate) {
    const parsed = new Date(samOpp.archiveDate);
    if (!isNaN(parsed.getTime())) {
      deadline = parsed;
    }
  } else {
    deadline = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  }

  return {
    rfpNumber: samOpp.solicitationNumber || samOpp.noticeId,
    title: samOpp.title,
    description: samOpp.description || samOpp.title,
    agency: samOpp.department || 'Federal Agency',
    office: samOpp.office || samOpp.subTier || '',
    estimatedValue,
    deadline,
    naicsCode: samOpp.naicsCode || '',
    setAsideType: samOpp.setAsideDescription || '',
    uiLink: samOpp.uiLink
  };
}

export default {
  searchSAMOpportunities,
  convertToBDOpportunity
};
