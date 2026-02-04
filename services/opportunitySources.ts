/**
 * Multi-Source Opportunity Search
 *
 * Aggregates opportunities from multiple sources:
 * - SAM.gov (Federal)
 * - Grants.gov (Federal Grants)
 * - State procurement portals
 * - Commercial RFP aggregators
 *
 * All sources are FREE public APIs or scrape-friendly sites
 */

export interface OpportunitySource {
  id: string;
  name: string;
  type: 'federal' | 'state' | 'local' | 'commercial' | 'grants';
  description: string;
  baseUrl: string;
  searchUrl: string;
  requiresApiKey: boolean;
  apiKeyEnvVar?: string;
  enabled: boolean;
  // How to search this source
  searchMethod: 'api' | 'rss' | 'scrape' | 'manual';
  // Fields available
  fields: string[];
}

export interface UnifiedOpportunity {
  id: string;
  source: string;
  sourceType: OpportunitySource['type'];
  title: string;
  description: string;
  agency: string;
  location: string;
  estimatedValue?: number;
  valueRange?: string;
  deadline?: Date;
  postedDate?: Date;
  category: string;
  setAside?: string;
  naicsCode?: string;
  link: string;
  contactEmail?: string;
  attachments?: string[];
  rawData?: any;
}

/**
 * Available Opportunity Sources
 */
export const OPPORTUNITY_SOURCES: OpportunitySource[] = [
  // === FEDERAL ===
  {
    id: 'sam-gov',
    name: 'SAM.gov',
    type: 'federal',
    description: 'Federal contract opportunities',
    baseUrl: 'https://sam.gov',
    searchUrl: 'https://api.sam.gov/opportunities/v2/search',
    requiresApiKey: true,
    apiKeyEnvVar: 'VITE_SAM_API_KEY',
    enabled: true,
    searchMethod: 'api',
    fields: ['title', 'description', 'agency', 'deadline', 'naics', 'setAside', 'value']
  },
  {
    id: 'grants-gov',
    name: 'Grants.gov',
    type: 'grants',
    description: 'Federal grant opportunities',
    baseUrl: 'https://www.grants.gov',
    searchUrl: 'https://www.grants.gov/grantsws/rest/opportunities/search',
    requiresApiKey: false,
    enabled: true,
    searchMethod: 'api',
    fields: ['title', 'description', 'agency', 'deadline', 'category', 'eligibility']
  },
  {
    id: 'usaspending',
    name: 'USASpending.gov',
    type: 'federal',
    description: 'Federal spending and awards data',
    baseUrl: 'https://www.usaspending.gov',
    searchUrl: 'https://api.usaspending.gov/api/v2/search/spending_by_award/',
    requiresApiKey: false,
    enabled: true,
    searchMethod: 'api',
    fields: ['title', 'agency', 'value', 'awardee', 'naics']
  },

  // === STATE PORTALS ===
  {
    id: 'ca-caleprocure',
    name: 'California (CaleProcure)',
    type: 'state',
    description: 'California state procurement',
    baseUrl: 'https://caleprocure.ca.gov',
    searchUrl: 'https://caleprocure.ca.gov/pages/public-search.aspx',
    requiresApiKey: false,
    enabled: true,
    searchMethod: 'scrape',
    fields: ['title', 'agency', 'deadline', 'category']
  },
  {
    id: 'tx-comptroller',
    name: 'Texas (ESBD)',
    type: 'state',
    description: 'Texas Electronic State Business Daily',
    baseUrl: 'https://www.txsmartbuy.com',
    searchUrl: 'https://www.txsmartbuy.com/sp',
    requiresApiKey: false,
    enabled: true,
    searchMethod: 'scrape',
    fields: ['title', 'agency', 'deadline', 'category']
  },
  {
    id: 'ny-ogs',
    name: 'New York (OGS)',
    type: 'state',
    description: 'New York Office of General Services',
    baseUrl: 'https://ogs.ny.gov',
    searchUrl: 'https://ogs.ny.gov/procurement/bid-opportunities',
    requiresApiKey: false,
    enabled: true,
    searchMethod: 'scrape',
    fields: ['title', 'agency', 'deadline']
  },
  {
    id: 'fl-myflorida',
    name: 'Florida (MyFlorida)',
    type: 'state',
    description: 'Florida Vendor Bid System',
    baseUrl: 'https://vendor.myfloridamarketplace.com',
    searchUrl: 'https://vendor.myfloridamarketplace.com/search/bids',
    requiresApiKey: false,
    enabled: true,
    searchMethod: 'scrape',
    fields: ['title', 'agency', 'deadline', 'category']
  },
  {
    id: 'va-eva',
    name: 'Virginia (eVA)',
    type: 'state',
    description: 'Virginia eVA Procurement',
    baseUrl: 'https://eva.virginia.gov',
    searchUrl: 'https://eva.virginia.gov/pages/eva-public-reports.htm',
    requiresApiKey: false,
    enabled: true,
    searchMethod: 'scrape',
    fields: ['title', 'agency', 'deadline']
  },

  // === COMMERCIAL / AGGREGATORS ===
  {
    id: 'rfp-db',
    name: 'RFP Database',
    type: 'commercial',
    description: 'Commercial RFP aggregator',
    baseUrl: 'https://www.rfpdb.com',
    searchUrl: 'https://www.rfpdb.com/search',
    requiresApiKey: false,
    enabled: true,
    searchMethod: 'scrape',
    fields: ['title', 'organization', 'deadline', 'category']
  },
  {
    id: 'bidnet',
    name: 'BidNet Direct',
    type: 'commercial',
    description: 'State & local government bids',
    baseUrl: 'https://www.bidnetdirect.com',
    searchUrl: 'https://www.bidnetdirect.com/search',
    requiresApiKey: false,
    enabled: true,
    searchMethod: 'scrape',
    fields: ['title', 'agency', 'deadline', 'location']
  },
  {
    id: 'govwin',
    name: 'GovWin (Deltek)',
    type: 'commercial',
    description: 'Government opportunity intelligence',
    baseUrl: 'https://iq.govwin.com',
    searchUrl: 'https://iq.govwin.com/neo/search',
    requiresApiKey: true,
    enabled: false, // Paid service
    searchMethod: 'api',
    fields: ['title', 'agency', 'value', 'deadline', 'contacts']
  },

  // === LOCAL / MUNICIPAL ===
  {
    id: 'publicpurchase',
    name: 'Public Purchase',
    type: 'local',
    description: 'Local government purchasing',
    baseUrl: 'https://www.publicpurchase.com',
    searchUrl: 'https://www.publicpurchase.com/gems/browse/browseCategories',
    requiresApiKey: false,
    enabled: true,
    searchMethod: 'scrape',
    fields: ['title', 'agency', 'deadline', 'location']
  },
  {
    id: 'bidsync',
    name: 'BidSync (Periscope)',
    type: 'local',
    description: 'State & local bids',
    baseUrl: 'https://www.bidsync.com',
    searchUrl: 'https://www.bidsync.com/DPXBi498/publicBids',
    requiresApiKey: false,
    enabled: true,
    searchMethod: 'scrape',
    fields: ['title', 'agency', 'deadline', 'category']
  }
];

/**
 * Search Grants.gov API (Free, no key required)
 */
export async function searchGrantsGov(keywords: string): Promise<UnifiedOpportunity[]> {
  try {
    // Grants.gov has a public REST API
    const searchParams = {
      keyword: keywords,
      oppStatuses: 'forecasted|posted',
      sortBy: 'openDate|desc',
      rows: 25
    };

    const response = await fetch(
      `https://www.grants.gov/grantsws/rest/opportunities/search?${new URLSearchParams(searchParams as any)}`,
      { headers: { 'Accept': 'application/json' } }
    );

    if (!response.ok) {
      console.log('[Grants.gov] API returned:', response.status);
      return [];
    }

    const data = await response.json();
    const opportunities = data.oppHits || [];

    return opportunities.map((opp: any) => ({
      id: `grants-${opp.id}`,
      source: 'Grants.gov',
      sourceType: 'grants' as const,
      title: opp.title || 'Untitled Grant',
      description: opp.synopsis || opp.description || '',
      agency: opp.agencyName || opp.agency || '',
      location: 'Federal',
      estimatedValue: opp.awardCeiling ? parseInt(opp.awardCeiling) : undefined,
      valueRange: opp.awardFloor && opp.awardCeiling
        ? `$${parseInt(opp.awardFloor).toLocaleString()} - $${parseInt(opp.awardCeiling).toLocaleString()}`
        : undefined,
      deadline: opp.closeDate ? new Date(opp.closeDate) : undefined,
      postedDate: opp.openDate ? new Date(opp.openDate) : undefined,
      category: opp.category || 'Grant',
      link: `https://www.grants.gov/search-results-detail/${opp.id}`,
      rawData: opp
    }));
  } catch (error) {
    console.error('[Grants.gov] Search error:', error);
    return [];
  }
}

/**
 * Search USASpending.gov API (Free, no key required)
 * This shows recent awards - useful for market research
 */
export async function searchUSASpending(keywords: string, naics?: string): Promise<UnifiedOpportunity[]> {
  try {
    const payload = {
      filters: {
        keywords: [keywords],
        time_period: [
          {
            start_date: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            end_date: new Date().toISOString().split('T')[0]
          }
        ],
        award_type_codes: ['A', 'B', 'C', 'D'], // Contracts only
        ...(naics ? { naics_codes: [naics] } : {})
      },
      fields: [
        'Award ID', 'Recipient Name', 'Award Amount', 'Awarding Agency',
        'Award Description', 'Start Date', 'NAICS Code'
      ],
      limit: 25,
      page: 1,
      sort: 'Award Amount',
      order: 'desc'
    };

    const response = await fetch(
      'https://api.usaspending.gov/api/v2/search/spending_by_award/',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      }
    );

    if (!response.ok) {
      console.log('[USASpending] API returned:', response.status);
      return [];
    }

    const data = await response.json();
    const awards = data.results || [];

    return awards.map((award: any) => ({
      id: `usaspending-${award['Award ID'] || award.internal_id}`,
      source: 'USASpending.gov',
      sourceType: 'federal' as const,
      title: award['Award Description'] || 'Federal Contract Award',
      description: `Awarded to: ${award['Recipient Name']}`,
      agency: award['Awarding Agency'] || '',
      location: 'Federal',
      estimatedValue: award['Award Amount'] ? parseFloat(award['Award Amount']) : undefined,
      postedDate: award['Start Date'] ? new Date(award['Start Date']) : undefined,
      category: 'Recent Award (Market Research)',
      naicsCode: award['NAICS Code'],
      link: `https://www.usaspending.gov/award/${award['Award ID']}`,
      rawData: award
    }));
  } catch (error) {
    console.error('[USASpending] Search error:', error);
    return [];
  }
}

/**
 * Generate manual search links for sources that don't have APIs
 * These open in new tabs for the user to search manually
 */
export function getManualSearchLinks(keywords: string): Array<{
  source: string;
  type: string;
  url: string;
  description: string;
}> {
  const encoded = encodeURIComponent(keywords);

  return [
    // State Portals
    {
      source: 'California CaleProcure',
      type: 'state',
      url: `https://caleprocure.ca.gov/pages/public-search.aspx?${encoded}`,
      description: 'California state contracts'
    },
    {
      source: 'Texas SmartBuy',
      type: 'state',
      url: `https://www.txsmartbuy.com/sp?search=${encoded}`,
      description: 'Texas state procurement'
    },
    {
      source: 'New York OGS',
      type: 'state',
      url: `https://ogs.ny.gov/procurement/bid-opportunities`,
      description: 'New York state bids'
    },
    {
      source: 'Florida VBS',
      type: 'state',
      url: `https://vendor.myfloridamarketplace.com/search/bids?keywords=${encoded}`,
      description: 'Florida Vendor Bid System'
    },
    {
      source: 'Virginia eVA',
      type: 'state',
      url: `https://eva.virginia.gov/pages/eva-public-reports.htm`,
      description: 'Virginia procurement'
    },

    // Local/Municipal
    {
      source: 'BidNet Direct',
      type: 'local',
      url: `https://www.bidnetdirect.com/search?q=${encoded}`,
      description: 'State & local government bids'
    },
    {
      source: 'Public Purchase',
      type: 'local',
      url: `https://www.publicpurchase.com/gems/browse/browseCategories`,
      description: 'Local government purchasing'
    },
    {
      source: 'BidSync',
      type: 'local',
      url: `https://www.bidsync.com/DPXBieta16?search=${encoded}`,
      description: 'State & local solicitations'
    },

    // Commercial
    {
      source: 'RFP Database',
      type: 'commercial',
      url: `https://www.rfpdb.com/search?q=${encoded}`,
      description: 'Commercial RFPs'
    },
    {
      source: 'FindRFP',
      type: 'commercial',
      url: `https://www.findrfp.com/search.aspx?q=${encoded}`,
      description: 'RFP aggregator'
    },

    // Federal supplemental
    {
      source: 'SBIR.gov',
      type: 'federal',
      url: `https://www.sbir.gov/sbirsearch/award/all?search=${encoded}`,
      description: 'Small Business Innovation Research'
    },
    {
      source: 'FedBizOpps Archive',
      type: 'federal',
      url: `https://sam.gov/search/?keywords=${encoded}&sort=-modifiedDate&index=opp&is_active=true`,
      description: 'SAM.gov direct search'
    }
  ];
}

/**
 * Unified search across all available sources
 */
export async function searchAllSources(
  keywords: string,
  options: {
    includeFederal?: boolean;
    includeGrants?: boolean;
    includeState?: boolean;
    includeLocal?: boolean;
    includeCommercial?: boolean;
    includeMarketResearch?: boolean;
  } = {}
): Promise<{
  opportunities: UnifiedOpportunity[];
  manualLinks: ReturnType<typeof getManualSearchLinks>;
  errors: string[];
}> {
  const {
    includeFederal = true,
    includeGrants = true,
    includeState = true,
    includeLocal = true,
    includeCommercial = true,
    includeMarketResearch = false
  } = options;

  const opportunities: UnifiedOpportunity[] = [];
  const errors: string[] = [];

  // Search APIs in parallel
  const searches: Promise<UnifiedOpportunity[]>[] = [];

  if (includeGrants) {
    searches.push(
      searchGrantsGov(keywords).catch(e => {
        errors.push(`Grants.gov: ${e.message}`);
        return [];
      })
    );
  }

  if (includeMarketResearch) {
    searches.push(
      searchUSASpending(keywords).catch(e => {
        errors.push(`USASpending: ${e.message}`);
        return [];
      })
    );
  }

  // Wait for all searches
  const results = await Promise.all(searches);
  results.forEach(r => opportunities.push(...r));

  // Generate manual search links for sources without APIs
  const manualLinks = getManualSearchLinks(keywords).filter(link => {
    if (link.type === 'state' && !includeState) return false;
    if (link.type === 'local' && !includeLocal) return false;
    if (link.type === 'commercial' && !includeCommercial) return false;
    if (link.type === 'federal' && !includeFederal) return false;
    return true;
  });

  return {
    opportunities,
    manualLinks,
    errors
  };
}

export default {
  OPPORTUNITY_SOURCES,
  searchGrantsGov,
  searchUSASpending,
  getManualSearchLinks,
  searchAllSources
};
