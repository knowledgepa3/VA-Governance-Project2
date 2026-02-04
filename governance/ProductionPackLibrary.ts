/**
 * PRODUCTION PACK LIBRARY v1.0.0
 *
 * Premium, certified Job Pack library management.
 * Supports pack distribution, versioning, and enterprise licensing.
 *
 * Features:
 * - Pack catalog with categories and search
 * - Certification requirements enforcement
 * - Version management and updates
 * - Enterprise licensing integration
 * - Usage analytics
 */

import { CertificationLevel, PackCertificate } from './PackCertificationSchema';
import { PackLicense, PackPricing } from './PackEconomics';

// =============================================================================
// PACK CATALOG
// =============================================================================

export interface PackCatalogEntry {
  // Identity
  pack_id: string;
  pack_version: string;
  pack_hash: string;

  // Metadata
  name: string;
  description: string;
  long_description?: string;
  author: string;
  publisher: string;

  // Categorization
  category: PackCategory;
  subcategory?: string;
  tags: string[];
  domain: string;

  // Certification
  certification_level: CertificationLevel;
  certificate: PackCertificate;
  certified_at: string;
  certified_by: string;

  // Versioning
  versions_available: string[];
  latest_version: string;
  changelog?: string;
  release_notes?: string;

  // Pricing
  pricing: PackPricing;
  trial_available: boolean;
  trial_days?: number;

  // Stats
  total_downloads: number;
  total_executions: number;
  average_rating?: number;
  review_count?: number;

  // Support
  documentation_url?: string;
  support_url?: string;
  repository_url?: string;

  // Requirements
  min_platform_version: string;
  required_permissions: string[];
  compatible_profiles: ('CONSERVATIVE' | 'BALANCED' | 'AGGRESSIVE')[];

  // Status
  status: 'ACTIVE' | 'DEPRECATED' | 'BETA' | 'PREVIEW' | 'RETIRED';
  published_at: string;
  updated_at: string;
}

export type PackCategory =
  | 'PROCUREMENT'        // SAM.gov, procurement automation
  | 'GRANTS'             // Grants.gov, grant discovery
  | 'HIRING'             // USAJobs, recruiting
  | 'COMPLIANCE'         // Regulatory compliance
  | 'RESEARCH'           // Data research, analysis
  | 'FINANCE'            // Financial data, SEC filings
  | 'HEALTHCARE'         // Healthcare systems
  | 'LEGAL'              // Legal research
  | 'REAL_ESTATE'        // Property data
  | 'CUSTOM';            // Custom/private packs

export const CATEGORY_METADATA: Record<PackCategory, { name: string; description: string; icon: string }> = {
  PROCUREMENT: { name: 'Procurement', description: 'Government contract and procurement automation', icon: '📋' },
  GRANTS: { name: 'Grants', description: 'Federal and state grant discovery and analysis', icon: '💰' },
  HIRING: { name: 'Hiring', description: 'Job posting research and recruiting automation', icon: '👥' },
  COMPLIANCE: { name: 'Compliance', description: 'Regulatory compliance and audit automation', icon: '✅' },
  RESEARCH: { name: 'Research', description: 'Data research and market analysis', icon: '🔍' },
  FINANCE: { name: 'Finance', description: 'Financial data extraction and analysis', icon: '📊' },
  HEALTHCARE: { name: 'Healthcare', description: 'Healthcare system integration', icon: '🏥' },
  LEGAL: { name: 'Legal', description: 'Legal research and document analysis', icon: '⚖️' },
  REAL_ESTATE: { name: 'Real Estate', description: 'Property data and market research', icon: '🏠' },
  CUSTOM: { name: 'Custom', description: 'Private and custom packs', icon: '🔧' }
};

// =============================================================================
// PACK LIBRARY
// =============================================================================

export interface PackLibrary {
  library_id: string;
  library_name: string;
  library_version: string;

  // Catalog
  packs: PackCatalogEntry[];

  // Indexes
  by_category: Record<PackCategory, string[]>;
  by_domain: Record<string, string[]>;
  by_certification: Record<string, string[]>;

  // Stats
  total_packs: number;
  total_downloads: number;
  total_executions: number;

  // Metadata
  updated_at: string;
}

/**
 * Create a new pack library
 */
export function createPackLibrary(
  libraryId: string,
  libraryName: string
): PackLibrary {
  return {
    library_id: libraryId,
    library_name: libraryName,
    library_version: '1.0.0',
    packs: [],
    by_category: {} as Record<PackCategory, string[]>,
    by_domain: {},
    by_certification: {},
    total_packs: 0,
    total_downloads: 0,
    total_executions: 0,
    updated_at: new Date().toISOString()
  };
}

/**
 * Add pack to library
 */
export function addPackToLibrary(
  library: PackLibrary,
  entry: PackCatalogEntry
): PackLibrary {
  // Remove existing if present
  const packs = library.packs.filter(p => p.pack_id !== entry.pack_id);
  packs.push(entry);

  // Update indexes
  const byCategory = { ...library.by_category };
  if (!byCategory[entry.category]) byCategory[entry.category] = [];
  if (!byCategory[entry.category].includes(entry.pack_id)) {
    byCategory[entry.category].push(entry.pack_id);
  }

  const byDomain = { ...library.by_domain };
  if (!byDomain[entry.domain]) byDomain[entry.domain] = [];
  if (!byDomain[entry.domain].includes(entry.pack_id)) {
    byDomain[entry.domain].push(entry.pack_id);
  }

  const certLevel = CertificationLevel[entry.certification_level];
  const byCert = { ...library.by_certification };
  if (!byCert[certLevel]) byCert[certLevel] = [];
  if (!byCert[certLevel].includes(entry.pack_id)) {
    byCert[certLevel].push(entry.pack_id);
  }

  return {
    ...library,
    packs,
    by_category: byCategory,
    by_domain: byDomain,
    by_certification: byCert,
    total_packs: packs.length,
    updated_at: new Date().toISOString()
  };
}

/**
 * Search pack library
 */
export function searchLibrary(
  library: PackLibrary,
  criteria: {
    query?: string;
    category?: PackCategory;
    domain?: string;
    min_certification?: CertificationLevel;
    tags?: string[];
    max_price?: number;
    compatible_profile?: 'CONSERVATIVE' | 'BALANCED' | 'AGGRESSIVE';
  }
): PackCatalogEntry[] {
  let results = [...library.packs];

  // Filter by category
  if (criteria.category) {
    results = results.filter(p => p.category === criteria.category);
  }

  // Filter by domain
  if (criteria.domain) {
    results = results.filter(p => p.domain.toLowerCase().includes(criteria.domain!.toLowerCase()));
  }

  // Filter by certification
  if (criteria.min_certification !== undefined) {
    results = results.filter(p => p.certification_level >= criteria.min_certification!);
  }

  // Filter by tags
  if (criteria.tags && criteria.tags.length > 0) {
    results = results.filter(p =>
      criteria.tags!.some(tag => p.tags.includes(tag.toLowerCase()))
    );
  }

  // Filter by price (if base_price exists)
  if (criteria.max_price !== undefined) {
    results = results.filter(p =>
      !p.pricing.base_price || p.pricing.base_price <= criteria.max_price!
    );
  }

  // Filter by compatible profile
  if (criteria.compatible_profile) {
    results = results.filter(p =>
      p.compatible_profiles.includes(criteria.compatible_profile!)
    );
  }

  // Text search
  if (criteria.query) {
    const query = criteria.query.toLowerCase();
    results = results.filter(p =>
      p.name.toLowerCase().includes(query) ||
      p.description.toLowerCase().includes(query) ||
      p.tags.some(t => t.includes(query))
    );
  }

  return results;
}

// =============================================================================
// CERTIFICATION AS A SERVICE (CaaS)
// =============================================================================

export interface CertificationRequest {
  request_id: string;
  pack_id: string;
  pack_version: string;
  pack_hash: string;

  // Requester
  requester_org: string;
  requester_email: string;
  requester_name: string;

  // Request details
  target_level: CertificationLevel;
  requested_at: string;
  priority: 'STANDARD' | 'EXPEDITED' | 'URGENT';

  // Status
  status: 'PENDING' | 'IN_REVIEW' | 'TESTING' | 'APPROVED' | 'REJECTED' | 'NEEDS_CHANGES';

  // Review details
  reviewer_id?: string;
  reviewer_name?: string;
  review_started_at?: string;
  review_completed_at?: string;

  // Results
  test_suite_id?: string;
  human_review_id?: string;
  issues_found?: string[];
  recommendations?: string[];

  // Certificate
  certificate?: PackCertificate;

  // Pricing
  service_tier: 'BASIC' | 'STANDARD' | 'PREMIUM';
  price: number;
  paid: boolean;
}

export interface CaaSPricing {
  tier: 'BASIC' | 'STANDARD' | 'PREMIUM';
  name: string;
  description: string;
  price: number;
  target_level: CertificationLevel;
  includes: string[];
  turnaround_days: number;
}

export const CAAS_PRICING: CaaSPricing[] = [
  {
    tier: 'BASIC',
    name: 'Basic Certification',
    description: 'Automated checks only (Level 1)',
    price: 99,
    target_level: CertificationLevel.VALIDATED,
    includes: [
      'Automated schema validation',
      'MAI boundary verification',
      'Basic certification report'
    ],
    turnaround_days: 1
  },
  {
    tier: 'STANDARD',
    name: 'Standard Certification',
    description: 'Automated checks + test execution (Level 2)',
    price: 499,
    target_level: CertificationLevel.TESTED,
    includes: [
      'Everything in Basic',
      'Demo environment test runs (5x)',
      'Escalation trigger testing',
      'Evidence bundle review',
      'Test coverage report'
    ],
    turnaround_days: 3
  },
  {
    tier: 'PREMIUM',
    name: 'Premium Certification',
    description: 'Full certification with human review (Level 3)',
    price: 1999,
    target_level: CertificationLevel.CERTIFIED,
    includes: [
      'Everything in Standard',
      'Human expert review',
      'Risk assessment',
      'Compliance mapping',
      'Custom recommendations',
      'Priority support',
      'Certification badge'
    ],
    turnaround_days: 7
  }
];

/**
 * Create certification request
 */
export function createCertificationRequest(
  packId: string,
  packVersion: string,
  packHash: string,
  requesterOrg: string,
  requesterEmail: string,
  requesterName: string,
  tier: 'BASIC' | 'STANDARD' | 'PREMIUM',
  priority: 'STANDARD' | 'EXPEDITED' | 'URGENT' = 'STANDARD'
): CertificationRequest {
  const pricing = CAAS_PRICING.find(p => p.tier === tier)!;

  let price = pricing.price;
  if (priority === 'EXPEDITED') price *= 1.5;
  if (priority === 'URGENT') price *= 2.5;

  return {
    request_id: `CERT-REQ-${Date.now()}`,
    pack_id: packId,
    pack_version: packVersion,
    pack_hash: packHash,
    requester_org: requesterOrg,
    requester_email: requesterEmail,
    requester_name: requesterName,
    target_level: pricing.target_level,
    requested_at: new Date().toISOString(),
    priority,
    status: 'PENDING',
    service_tier: tier,
    price,
    paid: false
  };
}

/**
 * Update certification request status
 */
export function updateRequestStatus(
  request: CertificationRequest,
  status: CertificationRequest['status'],
  updates?: Partial<CertificationRequest>
): CertificationRequest {
  return {
    ...request,
    ...updates,
    status
  };
}

// =============================================================================
// REPORTING
// =============================================================================

/**
 * Generate pack catalog entry display
 */
export function formatCatalogEntry(entry: PackCatalogEntry): string {
  const certBadge =
    entry.certification_level >= CertificationLevel.PRODUCTION ? '★★ PRODUCTION' :
    entry.certification_level >= CertificationLevel.CERTIFIED ? '★ CERTIFIED' :
    entry.certification_level >= CertificationLevel.TESTED ? '✓✓ TESTED' :
    entry.certification_level >= CertificationLevel.VALIDATED ? '✓ VALIDATED' : '○ DRAFT';

  const categoryInfo = CATEGORY_METADATA[entry.category];
  const priceStr = entry.pricing.pricing_model === 'FREE' ? 'FREE' :
                   entry.pricing.base_price ? `$${entry.pricing.base_price}/mo` :
                   entry.pricing.per_execution_price ? `$${entry.pricing.per_execution_price}/exec` : 'Contact';

  return `
╔═══════════════════════════════════════════════════════════════╗
║  ${categoryInfo.icon} ${entry.name.padEnd(56)}║
╠═══════════════════════════════════════════════════════════════╣
║  ${entry.description.substring(0, 59).padEnd(59)}║
╠═══════════════════════════════════════════════════════════════╣
║  Pack ID:       ${entry.pack_id.padEnd(45)}║
║  Version:       ${entry.pack_version.padEnd(45)}║
║  Category:      ${`${categoryInfo.icon} ${categoryInfo.name}`.padEnd(45)}║
║  Domain:        ${entry.domain.padEnd(45)}║
║  Certification: ${certBadge.padEnd(45)}║
║  Price:         ${priceStr.padEnd(45)}║
║  Downloads:     ${entry.total_downloads.toString().padEnd(45)}║
${entry.average_rating ? `║  Rating:        ${'★'.repeat(Math.round(entry.average_rating))}${'☆'.repeat(5 - Math.round(entry.average_rating))} (${entry.review_count} reviews)`.padEnd(62) + '║\n' : ''}╠═══════════════════════════════════════════════════════════════╣
║  Tags: ${entry.tags.slice(0, 5).join(', ').padEnd(55)}║
║  Profiles: ${entry.compatible_profiles.join(', ').padEnd(51)}║
╚═══════════════════════════════════════════════════════════════╝
`.trim();
}

/**
 * Generate library summary
 */
export function formatLibrarySummary(library: PackLibrary): string {
  const categories = Object.entries(library.by_category)
    .filter(([_, ids]) => ids.length > 0)
    .map(([cat, ids]) => {
      const info = CATEGORY_METADATA[cat as PackCategory];
      return `${info.icon} ${info.name}: ${ids.length}`;
    })
    .join('\n║    ');

  return `
╔═══════════════════════════════════════════════════════════════╗
║                    PACK LIBRARY                               ║
╠═══════════════════════════════════════════════════════════════╣
║  Library:       ${library.library_name.padEnd(45)}║
║  Version:       ${library.library_version.padEnd(45)}║
║  Updated:       ${library.updated_at.substring(0, 19).padEnd(45)}║
╠═══════════════════════════════════════════════════════════════╣
║  STATISTICS                                                   ║
║    Total Packs:     ${library.total_packs.toString().padEnd(42)}║
║    Downloads:       ${library.total_downloads.toString().padEnd(42)}║
║    Executions:      ${library.total_executions.toString().padEnd(42)}║
╠═══════════════════════════════════════════════════════════════╣
║  BY CATEGORY                                                  ║
║    ${categories.padEnd(57)}║
╚═══════════════════════════════════════════════════════════════╝
`.trim();
}

/**
 * Generate CaaS pricing table
 */
export function formatCaaSPricing(): string {
  let table = `
╔═══════════════════════════════════════════════════════════════╗
║            CERTIFICATION AS A SERVICE (CaaS)                  ║
╠═══════════════════════════════════════════════════════════════╣
`;

  for (const tier of CAAS_PRICING) {
    table += `║                                                               ║
║  ${tier.name.toUpperCase().padEnd(59)}║
║  $${tier.price.toString().padEnd(58)}║
║  ${tier.description.padEnd(59)}║
║  Turnaround: ${tier.turnaround_days} day(s)                                       ║
║                                                               ║
║  Includes:                                                    ║
`;
    for (const item of tier.includes) {
      table += `║    ✓ ${item.padEnd(55)}║\n`;
    }
    table += `╠═══════════════════════════════════════════════════════════════╣\n`;
  }

  return table.trim().slice(0, -66) + '╚' + '═'.repeat(63) + '╝';
}

export default {
  CATEGORY_METADATA,
  CAAS_PRICING,
  createPackLibrary,
  addPackToLibrary,
  searchLibrary,
  createCertificationRequest,
  updateRequestStatus,
  formatCatalogEntry,
  formatLibrarySummary,
  formatCaaSPricing
};
