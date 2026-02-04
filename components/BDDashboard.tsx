/**
 * BD Dashboard - Micro-Purchase & Simplified Acquisition Pipeline
 *
 * Strategy: Solo-safe governance consulting opportunities
 * Dollar Range: $5K - $100K
 * Focus: Assessment, validation, advisory - NOT operations
 */

import React, { useState, useEffect } from 'react';
import { BDOpportunity, OpportunityStatus, BidDecision } from '../bdTypes';
import {
  scoreOpportunity,
  DEFAULT_BD_FILTERS,
  MICRO_PURCHASE_FILTERS,
  SIMPLIFIED_ACQUISITION_FILTERS,
  SOLO_SAFE_INDICATORS,
  SCOPE_CREEP_RED_FLAGS,
  BDSearchFilters
} from '../bdSearchConfig';
import {
  searchSAMOpportunities,
  convertToBDOpportunity,
  SAMOpportunity
} from '../samGovApi';
import {
  searchAllSources,
  getManualSearchLinks,
  searchGrantsGov,
  UnifiedOpportunity
} from '../services/opportunitySources';
import { config } from '../config.browser';
import {
  SEARCH_CATEGORIES,
  getSearchCategory,
  QUICK_SEARCH_PRESETS,
  SearchCategory
} from '../bdSearchDictionary';
import {
  TrendingUp,
  DollarSign,
  CheckCircle,
  XCircle,
  AlertCircle,
  PlayCircle,
  Target,
  Shield,
  Filter,
  Search,
  AlertTriangle,
  ThumbsUp,
  ThumbsDown,
  Clock,
  Building2,
  FileText,
  Zap,
  Eye,
  Download,
  ExternalLink,
  RefreshCw,
  Wifi,
  WifiOff,
  BookOpen,
  Save,
  Trash2,
  Star,
  Flag,
  Rocket,
  Kanban,
  Plus,
  LayoutGrid,
  Globe,
  MapPin,
  Link2,
  Gift
} from 'lucide-react';
import { CapturePipelineView } from './CapturePipelineView';
import {
  PipelineStage,
  PipelineOpportunity,
  createPipelineOpportunity,
  loadPipeline,
  savePipeline
} from '../capturePipeline';
import { seedPipeline, isPipelineSeeded } from '../seedPipelineData';

// Micro-purchase focused sample opportunities
const SAMPLE_MICRO_OPPORTUNITIES = [
  {
    rfpNumber: 'VA-IT-2024-MICRO-001',
    title: 'AI Governance Framework Assessment',
    description: 'Independent assessment of AI/ML governance controls and policy alignment with NIST AI RMF',
    agency: 'Department of Veterans Affairs',
    office: 'Office of Information Technology',
    estimatedValue: 18500,
    deadline: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000),
    naicsCode: '541611',
    setAsideType: 'Total Small Business'
  },
  {
    rfpNumber: 'GSA-TECH-2024-002',
    title: 'Automation Risk Analysis - Advisory Services',
    description: 'Subject matter expert review of RPA implementation risks and compliance controls',
    agency: 'General Services Administration',
    office: 'Technology Transformation Services',
    estimatedValue: 24000,
    deadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
    naicsCode: '541618',
    setAsideType: 'Total Small Business'
  },
  {
    rfpNumber: 'DOD-CIO-2024-003',
    title: 'CMMC Readiness Gap Analysis',
    description: 'Third party assessment of cybersecurity maturity model certification readiness',
    agency: 'Department of Defense',
    office: 'CIO Office',
    estimatedValue: 45000,
    deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    naicsCode: '541512',
    setAsideType: 'SDVOSB'
  },
  {
    rfpNumber: 'HHS-OIG-2024-004',
    title: 'Compliance Control Validation',
    description: 'Independent validation of internal compliance monitoring controls and audit procedures',
    agency: 'Health and Human Services',
    office: 'Office of Inspector General',
    estimatedValue: 15000,
    deadline: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
    naicsCode: '541611',
    setAsideType: 'Total Small Business'
  },
  {
    rfpNumber: 'CISA-2024-005',
    title: 'Zero Trust Architecture Review',
    description: 'Advisory services for zero trust implementation strategy and policy framework development',
    agency: 'CISA',
    office: 'Cybersecurity Division',
    estimatedValue: 75000,
    deadline: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000),
    naicsCode: '541519',
    setAsideType: '8(a)'
  },
  {
    rfpNumber: 'NASA-IT-2024-006',
    title: 'Data Governance Policy Review',
    description: 'Review and recommendations for enterprise data governance policies and procedures',
    agency: 'NASA',
    office: 'Office of the CIO',
    estimatedValue: 22000,
    deadline: new Date(Date.now() + 18 * 24 * 60 * 60 * 1000),
    naicsCode: '541611',
    setAsideType: 'Total Small Business'
  },
  // Opportunities with risk flags (qualified but need review)
  {
    rfpNumber: 'DOD-CMMC-2024-009',
    title: 'CMMC Level 2 Assessment Support',
    description: 'Independent assessment support for CMMC certification including gap analysis and ATO documentation review. Base year with option year.',
    agency: 'Department of Defense',
    office: 'OUSD A&S',
    estimatedValue: 65000,
    deadline: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000),
    naicsCode: '541611',
    setAsideType: 'SDVOSB'
  },
  {
    rfpNumber: 'GSA-FEDRAMP-2024-010',
    title: 'FedRAMP Advisory - Readiness Assessment',
    description: 'Third party advisory services for FedRAMP authorization readiness. Includes policy review and continuous monitoring strategy.',
    agency: 'General Services Administration',
    office: 'FedRAMP PMO',
    estimatedValue: 48000,
    deadline: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000),
    naicsCode: '541618',
    setAsideType: 'Total Small Business'
  },
  // Some that should be filtered out (for testing)
  {
    rfpNumber: 'DOD-OPS-2024-007',
    title: 'IT Help Desk Support Services - 24/7 Operations',
    description: 'Operate and maintain help desk services including 24/7 coverage and on-site support',
    agency: 'Department of Defense',
    office: 'DISA',
    estimatedValue: 2500000,
    deadline: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
    naicsCode: '541512',
    setAsideType: 'Full and Open'
  },
  {
    rfpNumber: 'VA-STAFF-2024-008',
    title: 'Staff Augmentation - Full Time On-Site',
    description: 'Staff augmentation services requiring full-time on-site presence and facility clearance',
    agency: 'Department of Veterans Affairs',
    office: 'VBA',
    estimatedValue: 850000,
    deadline: new Date(Date.now() + 35 * 24 * 60 * 60 * 1000),
    naicsCode: '541611',
    setAsideType: 'Total Small Business'
  }
];

interface ScoredOpportunity extends BDOpportunity {
  filterScore?: number;
  filterReasons?: string[];
  riskFlags?: string[];
  disqualified?: boolean;
  disqualifyReason?: string;
  soloSafe?: boolean;
  scopeCreepRisk?: boolean;
  uiLink?: string;
}

// Props for BD Dashboard - allows parent to hook into capture workflow
interface BDDashboardProps {
  onLaunchCapture?: (opportunity: ScoredOpportunity) => void;
}

// Decision Ledger Entry - captures WHY decisions were made
interface LedgerEntry {
  id: string;
  timestamp: Date;
  opportunityId: string;
  rfpNumber: string;
  title: string;
  agency: string;
  estimatedValue: number;
  decision: 'PURSUE' | 'NO_BID' | 'WATCH' | 'TEAMING';
  rationale: string;
  keyFactors: string[];
  riskNotes?: string;
  followUpDate?: Date;
  tags: string[];
}

// VA-specific keywords for filtering
const VA_KEYWORDS = [
  'veterans affairs', 'va ', 'vha', 'vba', 'veterans health', 'veterans benefits',
  'department of veterans', 'va.gov', 'vista', 'cerner', 'va medical'
];

export const BDDashboard: React.FC<BDDashboardProps> = ({ onLaunchCapture }) => {
  const [opportunities, setOpportunities] = useState<ScoredOpportunity[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'all' | 'qualified' | 'disqualified' | 'micro' | 'simplified'>('qualified');
  const [localFilter, setLocalFilter] = useState(''); // Client-side filter for loaded results
  const [apiSearchTerm, setApiSearchTerm] = useState('ai'); // What to search SAM.gov for
  const [activeCategory, setActiveCategory] = useState<SearchCategory | null>(SEARCH_CATEGORIES['ai']);
  const [apiError, setApiError] = useState<string | null>(null);
  const [lastFetch, setLastFetch] = useState<Date | null>(null);
  const [selectedOpp, setSelectedOpp] = useState<ScoredOpportunity | null>(null);

  // View toggle: 'search' for opportunity search, 'pipeline' for kanban view
  const [activeView, setActiveView] = useState<'search' | 'pipeline'>('search');

  // Pipeline state
  const [pipeline, setPipeline] = useState(() => loadPipeline());

  // Auto-seed pipeline with VA VISN opportunity on first load
  useEffect(() => {
    try {
      if (typeof window !== 'undefined' && !isPipelineSeeded()) {
        console.log('[BD] Seeding pipeline with VA VISN opportunity...');
        const result = seedPipeline();
        if (result.added > 0) {
          // Reload pipeline to pick up seeded data
          setPipeline(loadPipeline());
          console.log('[BD] Pipeline seeded:', result);
        }
      }
    } catch (err) {
      console.error('[BD] Error seeding pipeline:', err);
    }
  }, []);

  // Add opportunity to pipeline
  const addToPipeline = (opp: ScoredOpportunity) => {
    const pipelineOpp = createPipelineOpportunity(opp, PipelineStage.QUALIFIED);
    const newPipeline = {
      ...pipeline,
      lastUpdated: new Date(),
      opportunities: [...pipeline.opportunities, pipelineOpp]
    };
    setPipeline(newPipeline);
    savePipeline(newPipeline);
  };

  // Check if opportunity is already in pipeline
  const isInPipeline = (rfpNumber: string) => {
    return pipeline.opportunities.some(o => o.rfpNumber === rfpNumber);
  };

  // API metrics tracking
  const [apiMetrics, setApiMetrics] = useState({
    totalFromApi: 0,      // Raw results from SAM.gov
    afterScoring: 0,      // After our scoring/filtering
    searchKeyword: '',    // What we searched for
    responseTime: 0       // How long the API took
  });

  // Decision Ledger - tracks bid/no-bid decisions with rationale
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [showLedger, setShowLedger] = useState(false);
  const [ledgerForm, setLedgerForm] = useState<{
    opp: ScoredOpportunity | null;
    decision: 'PURSUE' | 'NO_BID' | 'WATCH' | 'TEAMING';
    rationale: string;
    riskNotes: string;
    tags: string[];
  }>({ opp: null, decision: 'PURSUE', rationale: '', riskNotes: '', tags: [] });

  // VA-specific filtering
  const [vaOnlyFilter, setVaOnlyFilter] = useState(false);

  // Additional Sources State
  const [showAdditionalSources, setShowAdditionalSources] = useState(false);
  const [grantsResults, setGrantsResults] = useState<UnifiedOpportunity[]>([]);
  const [manualSearchLinks, setManualSearchLinks] = useState<ReturnType<typeof getManualSearchLinks>>([]);
  const [isSearchingGrants, setIsSearchingGrants] = useState(false);

  // Get SAM.gov API key from environment
  const samApiKey = config.samGovApiKey;
  const hasApiKey = samApiKey && samApiKey.length > 10;

  // Default to real API if key is available
  const [useRealApi, setUseRealApi] = useState(hasApiKey);

  // Company profile for solo operator
  const companyProfile = {
    name: 'ACE Governance Consulting',
    naicsCodes: ['541611', '541612', '541618', '541690', '541519'],
    certifications: ['SDVOSB', 'SAM Registered'],
    capabilities: [
      'AI/ML Governance',
      'Compliance Assessment',
      'Risk Analysis',
      'Policy Development',
      'NIST RMF',
      'CMMC',
      'FedRAMP Advisory'
    ],
    maxContractValue: 100000,
    minContractValue: 5000,
    teamSize: 1 // Solo operator
  };

  // Score and convert opportunities (works for both sample and real data)
  const scoreOpportunities = (rawOpportunities: Array<{
    rfpNumber: string;
    title: string;
    description: string;
    agency: string;
    office?: string;
    estimatedValue: number;
    deadline: Date | string;
    naicsCode: string;
    setAsideType: string;
    uiLink?: string;
  }>): ScoredOpportunity[] => {
    return rawOpportunities.map((opp, idx) => {
      const result = scoreOpportunity(
        {
          title: opp.title,
          description: opp.description || '',
          estimatedValue: opp.estimatedValue,
          naicsCode: opp.naicsCode,
          setAsideType: opp.setAsideType
        },
        DEFAULT_BD_FILTERS
      );

      const combinedText = `${opp.title} ${opp.description || ''}`.toLowerCase();

      // Check solo-safe indicators
      const soloSafe = SOLO_SAFE_INDICATORS.some(ind => combinedText.includes(ind.toLowerCase()));

      // Check scope creep red flags
      const scopeCreepRisk = SCOPE_CREEP_RED_FLAGS.some(flag => combinedText.includes(flag.toLowerCase()));

      // Ensure deadline is a proper Date object
      let deadline: Date;
      if (opp.deadline instanceof Date) {
        deadline = opp.deadline;
      } else if (typeof opp.deadline === 'string') {
        deadline = new Date(opp.deadline);
      } else {
        deadline = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // Default: 30 days from now
      }

      // Validate the date is valid
      if (isNaN(deadline.getTime())) {
        deadline = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      }

      return {
        id: `opp-${idx}`,
        rfpNumber: opp.rfpNumber,
        title: opp.title,
        agency: opp.agency,
        estimatedValue: opp.estimatedValue,
        deadline,
        naicsCode: opp.naicsCode,
        setAsideType: opp.setAsideType,
        status: result.disqualified ? OpportunityStatus.NO_BID : OpportunityStatus.QUALIFIED,
        bidDecision: result.disqualified
          ? BidDecision.NO_BID
          : result.score >= 80
            ? BidDecision.STRONG_BID
            : result.score >= 60
              ? BidDecision.BID
              : BidDecision.BID_WITH_CAUTION,
        winProbability: result.disqualified ? 0 : Math.min(result.score + 10, 95),
        lastUpdated: new Date(),
        filterScore: result.score,
        filterReasons: result.reasons,
        riskFlags: result.riskFlags,
        disqualified: result.disqualified,
        disqualifyReason: result.disqualifyReason,
        soloSafe,
        scopeCreepRisk,
        uiLink: opp.uiLink
      };
    });
  };

  // Load and score opportunities (uses current apiSearchTerm from state)
  const handleLoadOpportunities = async () => {
    // Get the search keyword - use category mapping if available
    const category = getSearchCategory(apiSearchTerm);
    const searchKeyword = category?.apiKeyword || apiSearchTerm;

    setActiveCategory(category);
    setIsLoading(true);
    setApiError(null);

    // Generate manual search links for additional sources
    setManualSearchLinks(getManualSearchLinks(searchKeyword));

    await executeSearch(searchKeyword);

    // Also search Grants.gov in parallel (free API, no key needed)
    setIsSearchingGrants(true);
    searchGrantsGov(searchKeyword)
      .then(results => {
        setGrantsResults(results);
        setIsSearchingGrants(false);
      })
      .catch(err => {
        console.log('[Grants.gov] Search failed:', err);
        setIsSearchingGrants(false);
      });

    setLastFetch(new Date());
    setIsLoading(false);
  };

  // Core search function - takes keyword directly to avoid state timing issues
  const executeSearch = async (searchKeyword: string) => {
    // Get the category for related terms
    const category = getSearchCategory(searchKeyword);
    const relatedTerms = category?.relatedTerms || [searchKeyword.toLowerCase()];

    if (!useRealApi || !hasApiKey) {
      // Use sample data - filter by search term
      console.log('[BD] Using sample data (API disabled or no key)');
      await new Promise(r => setTimeout(r, 300));

      // Filter sample data by search keyword
      const filteredSamples = SAMPLE_MICRO_OPPORTUNITIES.filter(opp => {
        const text = `${opp.title} ${opp.description}`.toLowerCase();
        return relatedTerms.some(term => text.includes(term.toLowerCase()));
      });

      const dataToUse = filteredSamples.length > 0 ? filteredSamples : SAMPLE_MICRO_OPPORTUNITIES;
      const scored = scoreOpportunities(dataToUse);
      setOpportunities(scored);
      setApiMetrics({
        totalFromApi: SAMPLE_MICRO_OPPORTUNITIES.length,
        afterScoring: scored.filter(o => !o.disqualified).length,
        searchKeyword: searchKeyword,
        responseTime: 300
      });
      return;
    }

    const startTime = Date.now();
    console.log(`[BD] Searching SAM.gov for: "${searchKeyword}"`);
    console.log(`[BD] Will filter results using terms:`, relatedTerms.slice(0, 5));

    try {
      const result = await searchSAMOpportunities(samApiKey, {
        keywords: [searchKeyword],
        limit: 100
      });

      const responseTime = Date.now() - startTime;

      if (result.error) {
        setApiError(result.error);
        setApiMetrics({ responseTime, searchKeyword, totalFromApi: 0, afterScoring: 0 });
        // Fall back to sample data
        console.log('[BD] API error, falling back to sample data');
        const scored = scoreOpportunities(SAMPLE_MICRO_OPPORTUNITIES);
        setOpportunities(scored);
        setApiMetrics(prev => ({ ...prev, afterScoring: scored.filter(o => !o.disqualified).length }));
      } else {
        console.log(`[BD] SAM.gov returned ${result.opportunities.length} raw opportunities`);

        // Convert to our format
        const rawOpportunities = result.opportunities.map(samOpp => convertToBDOpportunity(samOpp));

        // CLIENT-SIDE FILTERING: Filter by related terms since SAM.gov doesn't filter properly
        // Also filter out expired opportunities
        const now = Date.now();
        const relevantOpportunities = rawOpportunities.filter(opp => {
          // Check if deadline is in the future
          const deadline = opp.deadline instanceof Date ? opp.deadline : new Date(opp.deadline);
          if (deadline.getTime() < now) {
            return false; // Skip expired opportunities
          }

          // Check if matches search terms
          const text = `${opp.title} ${opp.description}`.toLowerCase();
          return relatedTerms.some(term => text.includes(term.toLowerCase()));
        });

        console.log(`[BD] After keyword filtering: ${relevantOpportunities.length} relevant opportunities`);

        // If no relevant ones found, show all but note it
        const dataToScore = relevantOpportunities.length > 0 ? relevantOpportunities : rawOpportunities;

        const scored = scoreOpportunities(dataToScore);
        setOpportunities(scored);

        const qualified = scored.filter(o => !o.disqualified).length;
        setApiMetrics({
          totalFromApi: result.opportunities.length,
          afterScoring: qualified,
          searchKeyword: `${searchKeyword} (${relevantOpportunities.length} matched)`,
          responseTime
        });
      }
    } catch (error) {
      console.error('[BD] Search failed:', error);
      setApiError(error instanceof Error ? error.message : 'Failed to fetch');
      const scored = scoreOpportunities(SAMPLE_MICRO_OPPORTUNITIES);
      setOpportunities(scored);
    }
  };

  // Quick search handler - sets term and immediately runs search
  const handleQuickSearch = async (key: string) => {
    const category = SEARCH_CATEGORIES[key];
    if (!category) return;

    // Update UI
    setApiSearchTerm(category.apiKeyword);
    setActiveCategory(category);
    setIsLoading(true);
    setApiError(null);

    await executeSearch(category.apiKeyword);

    setLastFetch(new Date());
    setIsLoading(false);
  };

  // Add entry to Decision Ledger
  const addToLedger = (opp: ScoredOpportunity, decision: 'PURSUE' | 'NO_BID' | 'WATCH' | 'TEAMING', rationale: string, riskNotes: string, tags: string[]) => {
    const entry: LedgerEntry = {
      id: `ledger-${Date.now()}`,
      timestamp: new Date(),
      opportunityId: opp.id,
      rfpNumber: opp.rfpNumber,
      title: opp.title,
      agency: opp.agency,
      estimatedValue: opp.estimatedValue,
      decision,
      rationale,
      keyFactors: opp.filterReasons || [],
      riskNotes: riskNotes || undefined,
      tags
    };
    setLedger(prev => [entry, ...prev]);
    setLedgerForm({ opp: null, decision: 'PURSUE', rationale: '', riskNotes: '', tags: [] });
  };

  // Remove from ledger
  const removeFromLedger = (id: string) => {
    setLedger(prev => prev.filter(e => e.id !== id));
  };

  // Export ledger as JSON
  const exportLedger = () => {
    const data = JSON.stringify(ledger, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bd-decision-ledger-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Check if opportunity is VA-related
  const isVAOpportunity = (opp: ScoredOpportunity): boolean => {
    const text = `${opp.title} ${opp.agency}`.toLowerCase();
    return VA_KEYWORDS.some(kw => text.includes(kw.toLowerCase()));
  };

  // Filter opportunities (client-side filter for loaded results)
  const filteredOpportunities = opportunities.filter(opp => {
    // VA-only filter
    if (vaOnlyFilter && !isVAOpportunity(opp)) {
      return false;
    }

    // Local filter (user typing in search box to filter loaded results)
    if (localFilter) {
      const search = localFilter.toLowerCase();
      if (!opp.title.toLowerCase().includes(search) &&
          !opp.agency.toLowerCase().includes(search) &&
          !opp.rfpNumber.toLowerCase().includes(search)) {
        return false;
      }
    }

    // Category filter (Qualified/Micro/Simplified tabs)
    switch (activeFilter) {
      case 'qualified':
        return !opp.disqualified;
      case 'disqualified':
        return opp.disqualified;
      case 'micro':
        return !opp.disqualified && opp.estimatedValue <= 25000;
      case 'simplified':
        return !opp.disqualified && opp.estimatedValue > 25000 && opp.estimatedValue <= 100000;
      default:
        return true;
    }
  });

  // Count VA opportunities
  const vaOpportunities = opportunities.filter(o => isVAOpportunity(o) && !o.disqualified);

  // Calculate metrics
  const qualifiedOpps = opportunities.filter(o => !o.disqualified);
  const microOpps = qualifiedOpps.filter(o => o.estimatedValue <= 25000);
  const simplifiedOpps = qualifiedOpps.filter(o => o.estimatedValue > 25000);
  const totalPipeline = qualifiedOpps.reduce((sum, o) => sum + o.estimatedValue, 0);
  const strongBids = qualifiedOpps.filter(o => o.bidDecision === BidDecision.STRONG_BID).length;
  const withRiskFlags = qualifiedOpps.filter(o => o.riskFlags && o.riskFlags.length > 0).length;
  const soloSafeCount = qualifiedOpps.filter(o => o.soloSafe).length;

  // Generate auto-rationale based on opportunity scoring
  const generateAutoRationale = (opp: ScoredOpportunity): string => {
    const parts: string[] = [];

    // Score assessment
    if (opp.filterScore && opp.filterScore >= 80) {
      parts.push(`Strong ${opp.filterScore}% match score.`);
    } else if (opp.filterScore && opp.filterScore >= 60) {
      parts.push(`Good ${opp.filterScore}% match score.`);
    }

    // Why qualified
    if (opp.filterReasons && opp.filterReasons.length > 0) {
      parts.push(`Qualified: ${opp.filterReasons.join(', ')}.`);
    }

    // Solo-safe
    if (opp.soloSafe) {
      parts.push('Solo-safe scope detected - advisory/assessment focus.');
    }

    // Value range
    if (opp.estimatedValue <= 25000) {
      parts.push('Micro-purchase threshold - streamlined acquisition.');
    } else if (opp.estimatedValue <= 100000) {
      parts.push('Simplified acquisition - competitive but manageable.');
    }

    // Risk flags
    if (opp.riskFlags && opp.riskFlags.length > 0) {
      parts.push(`Review required: ${opp.riskFlags.join(', ')}.`);
    }

    return parts.join(' ');
  };

  // Generate auto-tags based on opportunity
  const generateAutoTags = (opp: ScoredOpportunity): string[] => {
    const tags: string[] = [];
    const text = `${opp.title} ${opp.agency}`.toLowerCase();

    if (text.includes('ai') || text.includes('artificial intelligence') || text.includes('machine learning')) tags.push('AI/ML');
    if (text.includes('cyber') || text.includes('security')) tags.push('Cybersecurity');
    if (text.includes('compliance') || text.includes('audit')) tags.push('Compliance');
    if (isVAOpportunity(opp)) tags.push('VA');
    if (text.includes('dod') || text.includes('defense') || text.includes('army') || text.includes('navy') || text.includes('air force')) tags.push('DoD');
    if (opp.estimatedValue <= 25000) tags.push('Micro-Purchase');
    if (opp.setAsideType?.toLowerCase().includes('sdvosb')) tags.push('SDVOSB');

    return tags;
  };

  return (
    <div className="w-full max-w-[1400px] mx-auto space-y-4 p-4 overflow-x-hidden">
      {/* Header - Compact */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-xl p-4 text-white">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <Target size={24} className="text-blue-400 flex-shrink-0" />
            <div>
              <h1 className="text-xl font-black tracking-tight">BD Pipeline</h1>
              <p className="text-slate-400 text-xs">Micro-Purchase & Simplified • $5K-$100K</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {/* View Toggle */}
            <div className="flex bg-white/10 rounded-lg p-0.5">
              <button
                onClick={() => setActiveView('search')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                  activeView === 'search'
                    ? 'bg-white text-slate-800'
                    : 'text-white hover:bg-white/10'
                }`}
              >
                <Search size={14} />
                Search
              </button>
              <button
                onClick={() => setActiveView('pipeline')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                  activeView === 'pipeline'
                    ? 'bg-white text-slate-800'
                    : 'text-white hover:bg-white/10'
                }`}
              >
                <Kanban size={14} />
                Pipeline
                {pipeline.opportunities.length > 0 && (
                  <span className={`px-1.5 py-0.5 rounded text-[10px] ${
                    activeView === 'pipeline' ? 'bg-slate-200' : 'bg-white/20'
                  }`}>
                    {pipeline.opportunities.length}
                  </span>
                )}
              </button>
            </div>
            <span className="px-2 py-1 bg-blue-600/30 border border-blue-500/50 rounded text-[10px] font-bold text-blue-300">Solo-Safe</span>
            <span className="px-2 py-1 bg-emerald-600/30 border border-emerald-500/50 rounded text-[10px] font-bold text-emerald-300">Advisory</span>
            <span className="px-2 py-1 bg-purple-600/30 border border-purple-500/50 rounded text-[10px] font-bold text-purple-300">No Ops</span>
            {/* Ledger Toggle */}
            <button
              onClick={() => setShowLedger(!showLedger)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                showLedger
                  ? 'bg-amber-500 text-white'
                  : 'bg-white/10 text-white hover:bg-white/20'
              }`}
            >
              <BookOpen size={14} />
              Ledger
              {ledger.length > 0 && (
                <span className="px-1 py-0.5 bg-white/20 rounded text-[10px]">{ledger.length}</span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Pipeline View */}
      {activeView === 'pipeline' && (
        <CapturePipelineView onLaunchCapture={onLaunchCapture} />
      )}

      {/* Search View */}
      {activeView === 'search' && (
      <>
      {/* API Status & Toggle */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500 uppercase">Data Source:</span>
              <button
                onClick={() => setUseRealApi(!useRealApi)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  useRealApi
                    ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                    : 'bg-slate-100 text-slate-600 border border-slate-200'
                }`}
              >
                {useRealApi ? <Wifi size={14} /> : <WifiOff size={14} />}
                {useRealApi ? 'Live SAM.gov API' : 'Sample Data'}
              </button>
            </div>
            {useRealApi && !hasApiKey && (
              <span className="text-xs text-amber-600 font-medium flex items-center gap-1">
                <AlertTriangle size={12} />
                Add VITE_SAM_GOV_API_KEY to .env
              </span>
            )}
            {useRealApi && hasApiKey && (
              <span className="text-xs text-emerald-600 font-medium flex items-center gap-1">
                <CheckCircle size={12} />
                API Key configured
              </span>
            )}
          </div>
          {lastFetch && (
            <span className="text-xs text-slate-400">
              Last scan: {lastFetch.toLocaleTimeString()}
            </span>
          )}
        </div>
        {apiError && (
          <div className="mt-3 p-2 bg-rose-50 border border-rose-100 rounded-lg text-xs text-rose-700">
            <strong>API Error:</strong> {apiError}
          </div>
        )}
      </div>

      {/* Search Category Presets */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <div className="flex items-center gap-3 mb-3">
          <span className="text-xs font-bold text-slate-500 uppercase">Search SAM.gov for:</span>
          <div className="flex items-center gap-1 flex-1">
            <input
              type="text"
              placeholder="Enter search term (e.g., AI, cybersecurity, compliance)"
              value={apiSearchTerm}
              onChange={(e) => setApiSearchTerm(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleLoadOpportunities()}
              className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-slate-400">Quick:</span>
          {QUICK_SEARCH_PRESETS.map(preset => {
            const category = SEARCH_CATEGORIES[preset.key];
            const isActive = activeCategory?.apiKeyword === category?.apiKeyword;
            return (
              <button
                key={preset.key}
                onClick={() => handleQuickSearch(preset.key)}
                disabled={isLoading}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                  isActive
                    ? 'bg-blue-100 text-blue-700 border border-blue-200'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-transparent'
                } disabled:opacity-50`}
              >
                {preset.label}
              </button>
            );
          })}
        </div>
        <div className="flex items-center justify-between mt-2">
          {activeCategory && (
            <div className="text-xs text-slate-500">
              <span className="font-medium">{activeCategory.name}:</span> {activeCategory.description}
            </div>
          )}
          {/* VA-Specific Filter Toggle */}
          <button
            onClick={() => setVaOnlyFilter(!vaOnlyFilter)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              vaOnlyFilter
                ? 'bg-blue-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-transparent'
            }`}
          >
            <Flag size={12} />
            VA Only
            {vaOpportunities.length > 0 && (
              <span className={`px-1.5 py-0.5 rounded text-[10px] ${vaOnlyFilter ? 'bg-white/20' : 'bg-blue-100 text-blue-700'}`}>
                {vaOpportunities.length}
              </span>
            )}
          </button>
        </div>

        {/* API Metrics - show after a search has been run */}
        {(apiMetrics.totalFromApi > 0 || apiMetrics.searchKeyword) && (
          <div className="mt-3 pt-3 border-t border-slate-100">
            <div className="flex items-center gap-6 flex-wrap">
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">SAM.gov returned:</span>
                <span className="px-2 py-0.5 bg-slate-100 rounded text-xs font-bold text-slate-700">
                  {apiMetrics.totalFromApi} opps
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">Our scoring qualified:</span>
                <span className="px-2 py-0.5 bg-emerald-100 rounded text-xs font-bold text-emerald-700">
                  {apiMetrics.afterScoring}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">Auto-filtered:</span>
                <span className="px-2 py-0.5 bg-rose-100 rounded text-xs font-bold text-rose-700">
                  {apiMetrics.totalFromApi - apiMetrics.afterScoring}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">API time:</span>
                <span className="text-xs font-mono text-slate-500">
                  {apiMetrics.responseTime}ms
                </span>
              </div>
            </div>
            <div className="mt-2 text-xs text-slate-400">
              <span className="font-medium">Note:</span> SAM.gov API returns latest opportunities. Our scoring system filters them based on your keywords, value range ($5K-$100K), and exclude criteria.
            </div>
          </div>
        )}

        {/* Additional Sources Toggle */}
        <div className="mt-3 pt-3 border-t border-slate-100">
          <button
            onClick={() => setShowAdditionalSources(!showAdditionalSources)}
            className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            <Globe size={16} />
            {showAdditionalSources ? 'Hide' : 'Show'} Additional Sources
            {grantsResults.length > 0 && (
              <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs">
                +{grantsResults.length} grants
              </span>
            )}
            {manualSearchLinks.length > 0 && (
              <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded text-xs">
                {manualSearchLinks.length} portals
              </span>
            )}
          </button>

          {showAdditionalSources && (
            <div className="mt-3 space-y-4">
              {/* Grants.gov Results */}
              {(grantsResults.length > 0 || isSearchingGrants) && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Gift size={16} className="text-green-600" />
                    <span className="font-medium text-green-800">Grants.gov</span>
                    {isSearchingGrants && <RefreshCw size={14} className="animate-spin text-green-600" />}
                    <span className="text-xs text-green-600">({grantsResults.length} found)</span>
                  </div>
                  {grantsResults.length > 0 && (
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {grantsResults.slice(0, 5).map(grant => (
                        <div key={grant.id} className="p-2 bg-white rounded border border-green-100">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <a
                                href={grant.link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm font-medium text-green-700 hover:text-green-800 line-clamp-1"
                              >
                                {grant.title}
                              </a>
                              <p className="text-xs text-slate-500">{grant.agency}</p>
                            </div>
                            {grant.valueRange && (
                              <span className="text-xs text-green-600 whitespace-nowrap">{grant.valueRange}</span>
                            )}
                          </div>
                        </div>
                      ))}
                      {grantsResults.length > 5 && (
                        <a
                          href={`https://www.grants.gov/search-grants?keywords=${encodeURIComponent(apiSearchTerm)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block text-center text-xs text-green-600 hover:text-green-700"
                        >
                          View all {grantsResults.length} grants on Grants.gov →
                        </a>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Manual Search Links - State & Local */}
              {manualSearchLinks.length > 0 && (
                <div className="space-y-3">
                  {/* State Portals */}
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <MapPin size={16} className="text-blue-600" />
                      <span className="font-medium text-blue-800">State Procurement Portals</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {manualSearchLinks.filter(l => l.type === 'state').map(link => (
                        <a
                          key={link.source}
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1.5 bg-white border border-blue-200 rounded-lg text-xs text-blue-700 hover:bg-blue-100 transition-colors flex items-center gap-1"
                        >
                          <ExternalLink size={12} />
                          {link.source}
                        </a>
                      ))}
                    </div>
                  </div>

                  {/* Local/Municipal */}
                  <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Building2 size={16} className="text-purple-600" />
                      <span className="font-medium text-purple-800">Local & Commercial</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {manualSearchLinks.filter(l => l.type === 'local' || l.type === 'commercial').map(link => (
                        <a
                          key={link.source}
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1.5 bg-white border border-purple-200 rounded-lg text-xs text-purple-700 hover:bg-purple-100 transition-colors flex items-center gap-1"
                        >
                          <ExternalLink size={12} />
                          {link.source}
                        </a>
                      ))}
                    </div>
                  </div>

                  {/* Federal Supplemental */}
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Flag size={16} className="text-slate-600" />
                      <span className="font-medium text-slate-800">Federal (Supplemental)</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {manualSearchLinks.filter(l => l.type === 'federal').map(link => (
                        <a
                          key={link.source}
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-700 hover:bg-slate-100 transition-colors flex items-center gap-1"
                        >
                          <ExternalLink size={12} />
                          {link.source}
                        </a>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Action Bar */}
      <div className="flex items-center justify-between gap-4">
        <button
          onClick={handleLoadOpportunities}
          disabled={isLoading}
          className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-sm transition-all disabled:opacity-50"
        >
          {isLoading ? (
            <>
              <RefreshCw size={18} className="animate-spin" />
              {useRealApi ? `Searching "${apiSearchTerm}"...` : 'Loading...'}
            </>
          ) : (
            <>
              <Search size={18} />
              {useRealApi ? `Search "${apiSearchTerm}"` : 'Load Sample Data'}
            </>
          )}
        </button>

        <div className="flex items-center gap-2 flex-1 max-w-md">
          <div className="relative flex-1">
            <Filter size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Filter loaded results..."
              value={localFilter}
              onChange={(e) => setLocalFilter(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
          {[
            { id: 'qualified', label: 'Qualified', count: qualifiedOpps.length },
            { id: 'micro', label: 'Micro', count: microOpps.length },
            { id: 'simplified', label: 'Simplified', count: simplifiedOpps.length },
            { id: 'disqualified', label: 'Filtered Out', count: opportunities.length - qualifiedOpps.length }
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setActiveFilter(f.id as any)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeFilter === f.id
                  ? 'bg-white text-blue-600 shadow'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {f.label} ({f.count})
            </button>
          ))}
        </div>
      </div>

      {/* Metrics - Compact Row */}
      {opportunities.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <div className="bg-white px-3 py-2 rounded-lg border border-slate-200 flex items-center gap-2">
            <ThumbsUp size={14} className="text-emerald-600" />
            <span className="text-sm font-black text-slate-900">{strongBids}</span>
            <span className="text-[10px] text-slate-500">Strong</span>
          </div>
          <div className="bg-white px-3 py-2 rounded-lg border border-slate-200 flex items-center gap-2">
            <Target size={14} className="text-blue-600" />
            <span className="text-sm font-black text-slate-900">{qualifiedOpps.length}</span>
            <span className="text-[10px] text-slate-500">Qualified</span>
          </div>
          <div className="bg-white px-3 py-2 rounded-lg border border-slate-200 flex items-center gap-2">
            <Shield size={14} className="text-cyan-600" />
            <span className="text-sm font-black text-slate-900">{soloSafeCount}</span>
            <span className="text-[10px] text-slate-500">Solo-Safe</span>
          </div>
          <div className="bg-white px-3 py-2 rounded-lg border border-slate-200 flex items-center gap-2">
            <AlertTriangle size={14} className="text-amber-600" />
            <span className="text-sm font-black text-slate-900">{withRiskFlags}</span>
            <span className="text-[10px] text-slate-500">Risks</span>
          </div>

          <div className="bg-white px-3 py-2 rounded-lg border border-slate-200 flex items-center gap-2">
            <DollarSign size={14} className="text-purple-600" />
            <span className="text-sm font-black text-slate-900">${(totalPipeline / 1000).toFixed(0)}K</span>
            <span className="text-[10px] text-slate-500">Pipeline</span>
          </div>
          <div className="bg-white px-3 py-2 rounded-lg border border-slate-200 flex items-center gap-2">
            <XCircle size={14} className="text-rose-600" />
            <span className="text-sm font-black text-slate-900">{opportunities.length - qualifiedOpps.length}</span>
            <span className="text-[10px] text-slate-500">Filtered</span>
          </div>
        </div>
      )}

      {/* Opportunities List */}
      <div className="space-y-3">
        {opportunities.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center">
            <Search size={48} className="mx-auto text-slate-300 mb-4" />
            <h3 className="text-lg font-bold text-slate-700 mb-2">No Opportunities Loaded</h3>
            <p className="text-slate-500 text-sm mb-4">
              Click "Scan SAM.gov" to load and filter opportunities matching your micro-purchase strategy.
            </p>
            <div className="text-xs text-slate-400">
              Filters: $5K-$100K | Assessment/Advisory | No Ops | Unclassified
            </div>
          </div>
        ) : filteredOpportunities.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center">
            <Filter size={32} className="mx-auto text-slate-300 mb-3" />
            <p className="text-slate-500">No opportunities match current filters</p>
          </div>
        ) : (
          filteredOpportunities.map(opp => (
            <div
              key={opp.id}
              className={`bg-white rounded-xl border shadow-sm overflow-hidden transition-all hover:shadow-md ${
                opp.disqualified
                  ? 'border-slate-200 opacity-60'
                  : opp.bidDecision === BidDecision.STRONG_BID
                    ? 'border-emerald-200 border-l-4 border-l-emerald-500'
                    : 'border-slate-200'
              }`}
            >
              <div className="p-4">
                <div className="flex items-start justify-between gap-4">
                  {/* Left: Main Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-mono text-slate-400">{opp.rfpNumber}</span>
                      {opp.soloSafe && !opp.disqualified && (
                        <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-700 text-[9px] font-bold rounded">
                          SOLO-SAFE
                        </span>
                      )}
                      {opp.scopeCreepRisk && (
                        <span className="px-1.5 py-0.5 bg-amber-100 text-amber-700 text-[9px] font-bold rounded">
                          SCOPE RISK
                        </span>
                      )}
                    </div>
                    <h3 className="font-bold text-slate-900 mb-1">{opp.title}</h3>
                    <div className="flex items-center gap-3 text-xs text-slate-500">
                      <span className="flex items-center gap-1">
                        <Building2 size={12} />
                        {opp.agency}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock size={12} />
                        {(opp.deadline instanceof Date ? opp.deadline : new Date(opp.deadline)).toLocaleDateString()}
                      </span>
                      {opp.setAsideType && (
                        <span className="px-2 py-0.5 bg-slate-100 rounded text-[10px] font-medium">
                          {opp.setAsideType}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Right: Value & Score */}
                  <div className="text-right flex-shrink-0">
                    <div className={`text-xl font-black ${
                      opp.disqualified ? 'text-slate-400' : 'text-slate-900'
                    }`}>
                      ${(opp.estimatedValue / 1000).toFixed(0)}K
                    </div>
                    {!opp.disqualified && (
                      <div className={`text-sm font-bold ${
                        opp.filterScore && opp.filterScore >= 80 ? 'text-emerald-600' :
                        opp.filterScore && opp.filterScore >= 60 ? 'text-blue-600' : 'text-amber-600'
                      }`}>
                        {opp.filterScore}% match
                      </div>
                    )}
                  </div>
                </div>

                {/* Filter Results */}
                {opp.disqualified ? (
                  <div className="mt-3 p-2 bg-rose-50 border border-rose-100 rounded-lg">
                    <div className="flex items-center gap-2 text-rose-700 text-xs font-bold">
                      <XCircle size={14} />
                      Filtered: {opp.disqualifyReason}
                    </div>
                  </div>
                ) : (
                  <div className="mt-3 space-y-2">
                    {/* Why Qualified */}
                    {opp.filterReasons && opp.filterReasons.length > 0 && (
                      <div className="flex items-start gap-2">
                        <span className="text-[9px] font-bold text-slate-400 uppercase w-16 flex-shrink-0 pt-0.5">Qualified</span>
                        <div className="flex flex-wrap gap-1">
                          {opp.filterReasons.map((reason, idx) => (
                            <span key={idx} className="px-2 py-0.5 bg-blue-50 text-blue-700 text-[10px] font-medium rounded">
                              {reason}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Why Risky - Risk Flags */}
                    {opp.riskFlags && opp.riskFlags.length > 0 && (
                      <div className="flex items-start gap-2">
                        <span className="text-[9px] font-bold text-amber-500 uppercase w-16 flex-shrink-0 pt-0.5">Review</span>
                        <div className="flex flex-wrap gap-1">
                          {opp.riskFlags.map((flag, idx) => (
                            <span key={idx} className="px-2 py-0.5 bg-amber-50 text-amber-700 text-[10px] font-medium rounded flex items-center gap-1">
                              <AlertTriangle size={9} />
                              {flag}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Solo-safe Verdict */}
                    <div className="flex items-start gap-2">
                      <span className="text-[9px] font-bold text-slate-400 uppercase w-16 flex-shrink-0 pt-0.5">Solo-Safe</span>
                      <span className={`px-2 py-0.5 text-[10px] font-bold rounded ${
                        opp.soloSafe
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-slate-100 text-slate-500'
                      }`}>
                        {opp.soloSafe ? '✓ Yes - Advisory scope detected' : '? Review scope manually'}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Actions */}
              {!opp.disqualified && (
                <div className="px-4 py-2 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {opp.uiLink ? (
                      <a
                        href={opp.uiLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-500 transition-all"
                      >
                        <ExternalLink size={12} /> Open in SAM.gov
                      </a>
                    ) : (
                      <a
                        href={`https://sam.gov/search/?keywords=${encodeURIComponent(opp.title)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-50 transition-all"
                      >
                        <Search size={12} /> Search SAM.gov
                      </a>
                    )}
                    <button
                      onClick={() => setSelectedOpp(opp)}
                      className="flex items-center gap-1 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-50 transition-all"
                    >
                      <Eye size={12} /> Details
                    </button>
                    <button
                      onClick={() => setLedgerForm({
                        opp,
                        decision: opp.bidDecision === BidDecision.STRONG_BID ? 'PURSUE' :
                                  opp.riskFlags && opp.riskFlags.length > 0 ? 'WATCH' : 'PURSUE',
                        rationale: generateAutoRationale(opp),
                        riskNotes: opp.riskFlags && opp.riskFlags.length > 0 ? opp.riskFlags.join('. ') : '',
                        tags: generateAutoTags(opp)
                      })}
                      className="flex items-center gap-1 px-3 py-1.5 bg-amber-100 border border-amber-200 rounded-lg text-xs font-bold text-amber-700 hover:bg-amber-200 transition-all"
                    >
                      <BookOpen size={12} /> Log
                    </button>
                    {/* Add to Pipeline button */}
                    {!isInPipeline(opp.rfpNumber) ? (
                      <button
                        onClick={() => addToPipeline(opp)}
                        className="flex items-center gap-1 px-3 py-1.5 bg-purple-100 border border-purple-200 rounded-lg text-xs font-bold text-purple-700 hover:bg-purple-200 transition-all"
                      >
                        <Plus size={12} /> Pipeline
                      </button>
                    ) : (
                      <span className="flex items-center gap-1 px-3 py-1.5 bg-purple-50 border border-purple-100 rounded-lg text-xs font-bold text-purple-400">
                        <CheckCircle size={12} /> In Pipeline
                      </span>
                    )}
                  </div>
                  <div className={`px-3 py-1 rounded-lg text-xs font-bold ${
                    opp.bidDecision === BidDecision.STRONG_BID
                      ? 'bg-emerald-100 text-emerald-700'
                      : opp.bidDecision === BidDecision.BID
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-amber-100 text-amber-700'
                  }`}>
                    {opp.bidDecision === BidDecision.STRONG_BID ? 'Strong Bid' :
                     opp.bidDecision === BidDecision.BID ? 'Qualified' : 'Review'}
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Decision Ledger Panel */}
      {showLedger && (
        <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <BookOpen size={24} className="text-amber-600" />
              <div>
                <h2 className="text-lg font-black text-slate-900">Decision Ledger</h2>
                <p className="text-xs text-slate-500">Track bid decisions & rationale - gold for proposals later!</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {ledger.length > 0 && (
                <button
                  onClick={exportLedger}
                  className="flex items-center gap-1 px-3 py-1.5 bg-amber-600 text-white rounded-lg text-xs font-bold hover:bg-amber-500 transition-all"
                >
                  <Download size={14} /> Export JSON
                </button>
              )}
            </div>
          </div>

          {ledger.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <BookOpen size={32} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm">No decisions logged yet.</p>
              <p className="text-xs mt-1">Click "Log Decision" on any opportunity to start building your ledger.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {ledger.map(entry => (
                <div key={entry.id} className="bg-white rounded-xl border border-amber-200 p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          entry.decision === 'PURSUE' ? 'bg-emerald-100 text-emerald-700' :
                          entry.decision === 'NO_BID' ? 'bg-rose-100 text-rose-700' :
                          entry.decision === 'WATCH' ? 'bg-blue-100 text-blue-700' :
                          'bg-purple-100 text-purple-700'
                        }`}>
                          {entry.decision}
                        </span>
                        <span className="text-xs text-slate-400 font-mono">{entry.rfpNumber}</span>
                        {isVAOpportunity(entry as any) && (
                          <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 text-[9px] font-bold rounded">VA</span>
                        )}
                      </div>
                      <h4 className="font-bold text-slate-900 text-sm">{entry.title}</h4>
                      <p className="text-xs text-slate-500 mt-1">{entry.agency} • ${(entry.estimatedValue / 1000).toFixed(0)}K</p>

                      {/* Rationale - THE GOLD */}
                      <div className="mt-3 p-3 bg-amber-50 rounded-lg border border-amber-100">
                        <div className="text-[10px] font-bold text-amber-600 uppercase mb-1">Decision Rationale</div>
                        <p className="text-sm text-slate-700">{entry.rationale}</p>
                      </div>

                      {entry.riskNotes && (
                        <div className="mt-2 p-2 bg-rose-50 rounded-lg text-xs text-rose-700">
                          <strong>Risk Notes:</strong> {entry.riskNotes}
                        </div>
                      )}

                      {/* Tags */}
                      {entry.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {entry.tags.map((tag, idx) => (
                            <span key={idx} className="px-2 py-0.5 bg-slate-100 text-slate-600 text-[10px] rounded">
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}

                      <div className="text-[10px] text-slate-400 mt-2">
                        Logged: {entry.timestamp.toLocaleString()}
                      </div>
                    </div>
                    <button
                      onClick={() => removeFromLedger(entry.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded transition-all"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Strategy Footer */}
      <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
        <h4 className="text-xs font-black text-slate-500 uppercase tracking-wider mb-3">Active Filters</h4>
        <div className="grid grid-cols-2 gap-4 text-xs">
          <div>
            <div className="font-bold text-slate-700 mb-1">Include Keywords</div>
            <div className="text-slate-500 line-clamp-2">
              governance, compliance, assessment, validation, advisory, analysis, nist, cmmc, pilot...
            </div>
          </div>
          <div>
            <div className="font-bold text-slate-700 mb-1">Exclude Keywords</div>
            <div className="text-slate-500 line-clamp-2">
              operate, maintain, 24/7, staff augmentation, on-site required, facility clearance, idiq...
            </div>
          </div>
        </div>
      </div>
      </>
      )}

      {/* Details Modal */}
      {selectedOpp && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[85vh] flex flex-col">
            {/* Modal Header - Fixed */}
            <div className="bg-gradient-to-r from-slate-900 to-slate-800 p-5 text-white flex-shrink-0 rounded-t-2xl">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-mono text-slate-400">{selectedOpp.rfpNumber}</span>
                    {selectedOpp.soloSafe && (
                      <span className="px-2 py-0.5 bg-emerald-500/30 text-emerald-300 text-[10px] font-bold rounded">
                        SOLO-SAFE
                      </span>
                    )}
                  </div>
                  <h2 className="text-xl font-black">{selectedOpp.title}</h2>
                  <p className="text-slate-400 text-sm mt-1">{selectedOpp.agency}</p>
                </div>
                <button
                  onClick={() => setSelectedOpp(null)}
                  className="p-2 hover:bg-white/10 rounded-lg transition-all"
                >
                  <XCircle size={24} />
                </button>
              </div>
            </div>

            {/* Modal Body - Scrollable */}
            <div className="p-5 overflow-y-auto flex-1 min-h-0">
              {/* Key Metrics */}
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="bg-slate-50 p-4 rounded-xl text-center">
                  <div className="text-2xl font-black text-slate-900">
                    ${(selectedOpp.estimatedValue / 1000).toFixed(0)}K
                  </div>
                  <div className="text-xs text-slate-500 font-medium">Estimated Value</div>
                </div>
                <div className="bg-slate-50 p-4 rounded-xl text-center">
                  <div className={`text-2xl font-black ${
                    selectedOpp.filterScore && selectedOpp.filterScore >= 80 ? 'text-emerald-600' :
                    selectedOpp.filterScore && selectedOpp.filterScore >= 60 ? 'text-blue-600' : 'text-amber-600'
                  }`}>
                    {selectedOpp.filterScore}%
                  </div>
                  <div className="text-xs text-slate-500 font-medium">Match Score</div>
                </div>
                <div className="bg-slate-50 p-4 rounded-xl text-center">
                  <div className="text-2xl font-black text-slate-900">
                    {(() => {
                      const deadline = selectedOpp.deadline instanceof Date
                        ? selectedOpp.deadline
                        : new Date(selectedOpp.deadline);
                      const days = Math.ceil((deadline.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                      return days > 0 ? days : 'Expired';
                    })()}
                  </div>
                  <div className="text-xs text-slate-500 font-medium">Days to Deadline</div>
                </div>
              </div>

              {/* Details Grid */}
              <div className="space-y-4">
                <div>
                  <h3 className="text-xs font-black text-slate-500 uppercase tracking-wider mb-2">Opportunity Details</h3>
                  <div className="bg-slate-50 rounded-xl p-4 space-y-3">
                    <div className="flex justify-between">
                      <span className="text-xs text-slate-500">Agency</span>
                      <span className="text-xs font-bold text-slate-900">{selectedOpp.agency}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-xs text-slate-500">NAICS Code</span>
                      <span className="text-xs font-bold text-slate-900">{selectedOpp.naicsCode || 'Not specified'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-xs text-slate-500">Set-Aside</span>
                      <span className="text-xs font-bold text-slate-900">{selectedOpp.setAsideType || 'Full & Open'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-xs text-slate-500">Response Deadline</span>
                      <span className="text-xs font-bold text-slate-900">
                        {(selectedOpp.deadline instanceof Date ? selectedOpp.deadline : new Date(selectedOpp.deadline)).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-xs text-slate-500">Bid Decision</span>
                      <span className={`text-xs font-bold ${
                        selectedOpp.bidDecision === BidDecision.STRONG_BID ? 'text-emerald-600' :
                        selectedOpp.bidDecision === BidDecision.BID ? 'text-blue-600' : 'text-amber-600'
                      }`}>
                        {selectedOpp.bidDecision === BidDecision.STRONG_BID ? 'STRONG BID' :
                         selectedOpp.bidDecision === BidDecision.BID ? 'QUALIFIED BID' : 'REVIEW NEEDED'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Why Qualified */}
                {selectedOpp.filterReasons && selectedOpp.filterReasons.length > 0 && (
                  <div>
                    <h3 className="text-xs font-black text-slate-500 uppercase tracking-wider mb-2">Why Qualified</h3>
                    <div className="flex flex-wrap gap-2">
                      {selectedOpp.filterReasons.map((reason, idx) => (
                        <span key={idx} className="px-3 py-1.5 bg-blue-50 text-blue-700 text-xs font-medium rounded-lg">
                          {reason}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Risk Flags */}
                {selectedOpp.riskFlags && selectedOpp.riskFlags.length > 0 && (
                  <div>
                    <h3 className="text-xs font-black text-amber-500 uppercase tracking-wider mb-2">Risk Flags (Review Required)</h3>
                    <div className="flex flex-wrap gap-2">
                      {selectedOpp.riskFlags.map((flag, idx) => (
                        <span key={idx} className="px-3 py-1.5 bg-amber-50 text-amber-700 text-xs font-medium rounded-lg flex items-center gap-1">
                          <AlertTriangle size={12} />
                          {flag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Solo Assessment */}
                <div>
                  <h3 className="text-xs font-black text-slate-500 uppercase tracking-wider mb-2">Solo-Safe Assessment</h3>
                  <div className={`p-4 rounded-xl ${selectedOpp.soloSafe ? 'bg-emerald-50 border border-emerald-200' : 'bg-slate-50 border border-slate-200'}`}>
                    <div className="flex items-center gap-3">
                      {selectedOpp.soloSafe ? (
                        <>
                          <CheckCircle size={24} className="text-emerald-600" />
                          <div>
                            <div className="font-bold text-emerald-700">Solo-Safe Scope Detected</div>
                            <div className="text-xs text-emerald-600">This opportunity appears suitable for a solo consultant - advisory/assessment focus without operational requirements.</div>
                          </div>
                        </>
                      ) : (
                        <>
                          <AlertCircle size={24} className="text-slate-400" />
                          <div>
                            <div className="font-bold text-slate-700">Manual Review Recommended</div>
                            <div className="text-xs text-slate-500">Review the full solicitation to confirm scope is manageable for solo delivery.</div>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer - Fixed at bottom */}
            <div className="border-t border-slate-200 p-4 bg-slate-50 space-y-3 flex-shrink-0 rounded-b-2xl">
              {/* Capture CTA - Prominent at top */}
              {onLaunchCapture && (
                <button
                  onClick={() => {
                    onLaunchCapture(selectedOpp);
                    setSelectedOpp(null);
                  }}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-emerald-600 to-emerald-500 text-white font-black text-sm rounded-xl hover:from-emerald-500 hover:to-emerald-400 transition-all shadow-lg"
                >
                  <Rocket size={18} /> Launch Capture Workflow
                </button>
              )}
              {/* Secondary actions row */}
              <div className="flex items-center justify-between">
                <button
                  onClick={() => setSelectedOpp(null)}
                  className="px-4 py-2 text-slate-600 font-bold text-sm hover:bg-slate-200 rounded-lg transition-all"
                >
                  Close
                </button>
                {selectedOpp.uiLink ? (
                  <a
                    href={selectedOpp.uiLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white font-bold text-sm rounded-lg hover:bg-blue-500 transition-all"
                  >
                    <ExternalLink size={16} /> Open in SAM.gov
                  </a>
                ) : (
                  <a
                    href={`https://sam.gov/search/?keywords=${encodeURIComponent(selectedOpp.title)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white font-bold text-sm rounded-lg hover:bg-blue-500 transition-all"
                  >
                    <Search size={16} /> Search SAM.gov
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Ledger Entry Modal */}
      {ledgerForm.opp && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden">
            <div className="bg-gradient-to-r from-amber-500 to-amber-600 p-4 text-white">
              <div className="flex items-center gap-2">
                <BookOpen size={20} />
                <h2 className="font-black">Log Decision</h2>
              </div>
              <p className="text-amber-100 text-xs mt-1">{ledgerForm.opp.title}</p>
            </div>

            <div className="p-6 space-y-4">
              {/* Decision Type */}
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Decision</label>
                <div className="flex gap-2">
                  {(['PURSUE', 'NO_BID', 'WATCH', 'TEAMING'] as const).map(d => (
                    <button
                      key={d}
                      onClick={() => setLedgerForm(prev => ({ ...prev, decision: d }))}
                      className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
                        ledgerForm.decision === d
                          ? d === 'PURSUE' ? 'bg-emerald-500 text-white' :
                            d === 'NO_BID' ? 'bg-rose-500 text-white' :
                            d === 'WATCH' ? 'bg-blue-500 text-white' :
                            'bg-purple-500 text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {d.replace('_', ' ')}
                    </button>
                  ))}
                </div>
              </div>

              {/* Rationale - THE IMPORTANT PART */}
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">
                  Rationale <span className="text-amber-500">*</span>
                  <span className="normal-case font-normal text-slate-400 ml-1">- Why this decision?</span>
                </label>
                <textarea
                  value={ledgerForm.rationale}
                  onChange={(e) => setLedgerForm(prev => ({ ...prev, rationale: e.target.value }))}
                  placeholder="e.g., Strong alignment with AI governance capabilities. No operational requirements. Good value range for solo delivery. Past performance relevant from XYZ project..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 min-h-[100px]"
                />
              </div>

              {/* Risk Notes */}
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">
                  Risk Notes <span className="text-slate-400 font-normal">(optional)</span>
                </label>
                <textarea
                  value={ledgerForm.riskNotes}
                  onChange={(e) => setLedgerForm(prev => ({ ...prev, riskNotes: e.target.value }))}
                  placeholder="e.g., Timeline tight. May need subcontractor for data analysis portion..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 min-h-[60px]"
                />
              </div>

              {/* Tags */}
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">
                  Tags <span className="text-slate-400 font-normal">(click to add)</span>
                </label>
                <div className="flex flex-wrap gap-1">
                  {['AI/ML', 'Cybersecurity', 'Compliance', 'VA', 'DoD', 'Micro-Purchase', 'SDVOSB', 'Past Performance', 'Teaming Needed', 'Quick Turnaround'].map(tag => (
                    <button
                      key={tag}
                      onClick={() => setLedgerForm(prev => ({
                        ...prev,
                        tags: prev.tags.includes(tag)
                          ? prev.tags.filter(t => t !== tag)
                          : [...prev.tags, tag]
                      }))}
                      className={`px-2 py-1 rounded text-[10px] font-bold transition-all ${
                        ledgerForm.tags.includes(tag)
                          ? 'bg-amber-500 text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="border-t border-slate-200 p-4 flex items-center justify-between bg-slate-50">
              <button
                onClick={() => setLedgerForm({ opp: null, decision: 'PURSUE', rationale: '', riskNotes: '', tags: [] })}
                className="px-4 py-2 text-slate-600 font-bold text-sm hover:bg-slate-200 rounded-lg transition-all"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (ledgerForm.opp && ledgerForm.rationale.trim()) {
                    addToLedger(ledgerForm.opp, ledgerForm.decision, ledgerForm.rationale, ledgerForm.riskNotes, ledgerForm.tags);
                    setShowLedger(true); // Show ledger after adding
                  }
                }}
                disabled={!ledgerForm.rationale.trim()}
                className="flex items-center gap-2 px-4 py-2 bg-amber-600 text-white font-bold text-sm rounded-lg hover:bg-amber-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save size={16} /> Save to Ledger
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BDDashboard;
