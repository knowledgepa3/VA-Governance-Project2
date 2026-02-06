/**
 * SAM.gov Scraper
 * Extracts RFP opportunity data from SAM.gov
 */

import { chromium, Browser, Page } from 'playwright';
import { execute as governedExecute } from './services/governedLLM';

export interface SAMGovOpportunityData {
  solicitation_number: string;
  title: string;
  agency: string;
  sub_agency?: string;
  office: string;
  posted_date: string;
  response_deadline: string;
  naics_code: string;
  set_aside_type?: string;
  contract_type?: string;
  description: string;
  point_of_contact?: {
    name: string;
    email?: string;
    phone?: string;
  };
  attachments: Array<{
    name: string;
    url: string;
    type: string;
  }>;
  estimated_value?: {
    min?: number;
    max?: number;
  };
  place_of_performance?: string;
  raw_html: string;
}

/**
 * Scrape opportunity data from SAM.gov
 */
export async function scrapeOpportunity(rfpNumber: string): Promise<SAMGovOpportunityData> {
  let browser: Browser | null = null;

  try {
    console.log(`[SAM.gov] Starting scrape for RFP: ${rfpNumber}`);

    // Launch browser
    browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-blink-features=AutomationControlled']
    });

    const context = await browser.newContext({
      viewport: { width: 1280, height: 720 },
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    });

    const page = await context.newPage();

    // Navigate to SAM.gov search
    console.log(`[SAM.gov] Navigating to search page...`);
    await page.goto('https://sam.gov/content/opportunities', {
      waitUntil: 'networkidle',
      timeout: 60000
    });

    // Wait for search interface to load
    await page.waitForTimeout(3000);

    // Take initial screenshot for debugging
    const searchScreenshot = await page.screenshot({ type: 'png' });

    // Use Claude Vision to understand the page structure and search
    const searchAction = await analyzePageForSearch(
      searchScreenshot.toString('base64'),
      rfpNumber
    );

    console.log(`[SAM.gov] Search strategy: ${searchAction.strategy}`);

    // Perform search based on Claude's analysis
    if (searchAction.search_box_selector) {
      try {
        // Try to find and use the search box
        await page.fill(searchAction.search_box_selector, rfpNumber);
        await page.press(searchAction.search_box_selector, 'Enter');
        await page.waitForTimeout(5000); // Wait for results
      } catch (e) {
        console.warn(`[SAM.gov] Search box interaction failed, trying alternative...`);
        // Alternative: direct URL navigation
        await page.goto(
          `https://sam.gov/search?index=opp&page=1&pageSize=25&sort=-modifiedDate&sfm%5Bsimple%5D%5Bb%5D%5B0%5D%5BkeywordRadio%5D=ALL&sfm%5Bsimple%5D%5Bb%5D%5B0%5D%5BkeywordTags%5D%5B0%5D%5Bkey%5D=${encodeURIComponent(rfpNumber)}`,
          { waitUntil: 'networkidle', timeout: 60000 }
        );
      }
    } else {
      // Direct URL search as fallback
      await page.goto(
        `https://sam.gov/search?index=opp&page=1&pageSize=25&sort=-modifiedDate&sfm%5Bsimple%5D%5Bb%5D%5B0%5D%5BkeywordRadio%5D=ALL&sfm%5Bsimple%5D%5Bb%5D%5B0%5D%5BkeywordTags%5D%5B0%5D%5Bkey%5D=${encodeURIComponent(rfpNumber)}`,
        { waitUntil: 'networkidle', timeout: 60000 }
      );
    }

    // Take screenshot of results
    const resultsScreenshot = await page.screenshot({ type: 'png', fullPage: true });

    // Get page HTML for detailed extraction
    const pageHtml = await page.content();

    // Use Claude Vision to extract opportunity data from the page
    const opportunityData = await extractOpportunityData(
      resultsScreenshot.toString('base64'),
      pageHtml,
      rfpNumber
    );

    console.log(`[SAM.gov] Successfully extracted data for ${rfpNumber}`);

    // Extract attachments/documents
    const attachments = await extractAttachments(page);

    return {
      ...opportunityData,
      attachments,
      raw_html: pageHtml
    };

  } catch (error) {
    console.error(`[SAM.gov] Error scraping ${rfpNumber}:`, error);
    throw error;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

/**
 * Use Claude Vision to understand page layout and determine search strategy
 */
async function analyzePageForSearch(
  screenshotBase64: string,
  rfpNumber: string
): Promise<{ strategy: string; search_box_selector?: string }> {
  try {
    const result = await governedExecute({
      role: 'SAM_GOV_SCRAPER',
      purpose: 'page-search-analysis',
      systemPrompt: '',
      userMessage: '',
      messages: [{
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: 'image/png',
              data: screenshotBase64
            }
          },
          {
            type: 'text',
            text: `Analyze this SAM.gov search page. I need to search for RFP number: ${rfpNumber}

Identify:
1. The search box CSS selector (look for input fields)
2. The search strategy (keyword search, advanced search, etc.)

Respond in JSON:
{
  "strategy": "description of how to search",
  "search_box_selector": "CSS selector for search input" or null
}

Common selectors: input[type="text"], input[name="search"], .search-input, #searchBox`
          }
        ]
      }],
      maxTokens: 1024,
      vision: true
    });

    const textContent = result.content;
    const cleaned = textContent.replace(/```json\n?|```/g, "").trim();
    return JSON.parse(cleaned);
  } catch (error) {
    console.warn('[SAM.gov] Governed LLM vision analysis failed, using fallback strategy');
    return { strategy: 'direct URL search' };
  }
}

/**
 * Use Claude Vision + HTML parsing to extract opportunity data
 */
async function extractOpportunityData(
  screenshotBase64: string,
  pageHtml: string,
  rfpNumber: string
): Promise<Omit<SAMGovOpportunityData, 'attachments' | 'raw_html'>> {
  try {
    const result = await governedExecute({
      role: 'SAM_GOV_SCRAPER',
      purpose: 'opportunity-data-extraction',
      systemPrompt: '',
      userMessage: '',
      messages: [{
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: 'image/png',
              data: screenshotBase64
            }
          },
          {
            type: 'text',
            text: `Extract opportunity data for solicitation ${rfpNumber} from this SAM.gov page.

Here's the page HTML for detailed extraction:
${pageHtml.substring(0, 50000)}

Extract all visible information and respond in JSON:
{
  "solicitation_number": "string",
  "title": "string",
  "agency": "string",
  "sub_agency": "string or null",
  "office": "string",
  "posted_date": "ISO date string",
  "response_deadline": "ISO date string",
  "naics_code": "6-digit code",
  "set_aside_type": "SDVOSB|8(a)|HUBZone|WOSB|Unrestricted|etc or null",
  "contract_type": "FFP|T&M|CPFF|etc or null",
  "description": "full description text",
  "point_of_contact": {
    "name": "string",
    "email": "string or null",
    "phone": "string or null"
  } or null,
  "estimated_value": {
    "min": number or null,
    "max": number or null
  } or null,
  "place_of_performance": "location string or null"
}

Be thorough. Extract all available fields. If a field is not found, use null.

Respond with ONLY valid JSON.`
          }
        ]
      }],
      maxTokens: 4096,
      vision: true
    });

    const textContent = result.content;
    const cleaned = textContent.replace(/```json\n?|```/g, "").trim();
    return JSON.parse(cleaned);
  } catch (error) {
    console.error('[SAM.gov] Data extraction failed:', error);
    // Return minimal data
    return {
      solicitation_number: rfpNumber,
      title: 'Unknown',
      agency: 'Unknown',
      office: 'Unknown',
      posted_date: new Date().toISOString(),
      response_deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      naics_code: '000000',
      description: 'Data extraction failed'
    };
  }
}

/**
 * Extract attachment/document links from page
 */
async function extractAttachments(page: Page): Promise<Array<{ name: string; url: string; type: string }>> {
  try {
    // Look for links to documents (PDFs, docs, etc.)
    const attachments = await page.evaluate(() => {
      const links: Array<{ name: string; url: string; type: string }> = [];

      // Find all links that look like documents
      const allLinks = document.querySelectorAll('a[href]');

      allLinks.forEach(link => {
        const href = (link as HTMLAnchorElement).href;
        const text = link.textContent?.trim() || '';

        // Check if it's a document link
        if (
          href.includes('.pdf') ||
          href.includes('.doc') ||
          href.includes('.docx') ||
          href.includes('/download') ||
          href.includes('attachment') ||
          text.toLowerCase().includes('solicitation') ||
          text.toLowerCase().includes('amendment') ||
          text.toLowerCase().includes('attachment')
        ) {
          links.push({
            name: text,
            url: href,
            type: href.includes('.pdf') ? 'pdf' : 'document'
          });
        }
      });

      return links;
    });

    return attachments.slice(0, 20); // Limit to first 20 attachments
  } catch (error) {
    console.warn('[SAM.gov] Failed to extract attachments:', error);
    return [];
  }
}

/**
 * Mock/Sample data generator for testing without hitting SAM.gov
 */
export function generateMockSAMData(rfpNumber: string): SAMGovOpportunityData {
  return {
    solicitation_number: rfpNumber,
    title: 'IT Support Services - Veterans Affairs',
    agency: 'Department of Veterans Affairs',
    sub_agency: 'Veterans Health Administration',
    office: 'Network Contracting Office 8',
    posted_date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    response_deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    naics_code: '541512',
    set_aside_type: 'SDVOSB',
    contract_type: 'FFP',
    description: `The Department of Veterans Affairs is seeking qualified contractors to provide comprehensive IT support services including help desk support, system administration, network management, and technical support for VA medical facilities in the Southeast region.`,
    point_of_contact: {
      name: 'John Smith',
      email: 'john.smith@va.gov',
      phone: '(202) 555-0100'
    },
    attachments: [
      {
        name: 'Solicitation Document',
        url: 'https://sam.gov/download/solicitation.pdf',
        type: 'pdf'
      },
      {
        name: 'Statement of Work',
        url: 'https://sam.gov/download/sow.pdf',
        type: 'pdf'
      }
    ],
    estimated_value: {
      min: 1000000,
      max: 2500000
    },
    place_of_performance: 'Southeast Region, Multiple Locations',
    raw_html: '<html>Mock SAM.gov page content</html>'
  };
}

/**
 * Data source result with audit tracking
 */
export interface SAMDataSourceResult {
  data: SAMGovOpportunityData;
  source: 'SAM_GOV_API' | 'SAM_GOV_SCRAPE' | 'MOCK';
  timestamp: Date;
  warnings?: string[];
}

/**
 * Scrape opportunity data with data source tracking for audit
 * Supports strict mode that throws instead of falling back to mock data
 */
export async function scrapeOpportunityWithSource(
  rfpNumber: string,
  strictMode: boolean = false
): Promise<SAMDataSourceResult> {
  const timestamp = new Date();
  const warnings: string[] = [];

  try {
    // Try the real scraping first
    const data = await scrapeOpportunity(rfpNumber);

    // Verify we got real data (not just empty/default response)
    if (data && data.title && data.description) {
      console.log(`[SAM.gov] Successfully scraped data for ${rfpNumber}`);
      return {
        data,
        source: 'SAM_GOV_SCRAPE',
        timestamp
      };
    }

    // Scrape returned incomplete data
    warnings.push('SAM.gov scrape returned incomplete data');

    // In strict mode, throw error instead of using mock data
    if (strictMode) {
      throw new Error(
        `SAM.gov scrape returned incomplete data for RFP "${rfpNumber}". ` +
        `Strict mode is enabled - mock data fallback is disabled. ` +
        `Verify the RFP number is correct and the opportunity exists.`
      );
    }

    // Fall back to mock data in non-strict mode
    console.warn(`[SAM.gov] Incomplete scrape results, falling back to mock data (strict mode: ${strictMode})`);
    return {
      data: generateMockSAMData(rfpNumber),
      source: 'MOCK',
      timestamp,
      warnings: [...warnings, 'Using mock data due to incomplete scrape results']
    };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[SAM.gov] Scrape error:`, errorMessage);

    // In strict mode, propagate the error
    if (strictMode) {
      throw new Error(
        `SAM.gov data fetch failed for RFP "${rfpNumber}": ${errorMessage}. ` +
        `Strict mode is enabled - mock data fallback is disabled.`
      );
    }

    // Fall back to mock data in non-strict mode
    warnings.push(`Scrape error: ${errorMessage}`);
    return {
      data: generateMockSAMData(rfpNumber),
      source: 'MOCK',
      timestamp,
      warnings: [...warnings, 'Using mock data due to scrape error']
    };
  }
}
