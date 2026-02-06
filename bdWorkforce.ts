/**
 * Business Development Workforce
 *
 * Orchestrates multiple RFP research agents working in parallel
 * like a real BD department.
 *
 * Features:
 * - Portfolio view of all opportunities
 * - Parallel opportunity qualification (10+ RFPs at once)
 * - Bid/No-Bid scoring and prioritization
 * - Executive dashboard with recommendations
 * - Team assignment and workload balancing
 */

import { PlaybookEngine, PlaybookContext, Playbook } from './playbookEngine';
import { MAIClassification } from './types';
import { config as appConfig } from './config';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

// ESM-compatible __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import {
  analyzeOpportunityBrief,
  analyzeCompetitiveLandscape,
  analyzeCapabilityGaps,
  generateTeamingRecommendations,
  calculateWinProbability,
  generateBDDecisionMemo,
  OpportunityBrief,
  CompetitiveLandscape,
  CapabilityGapAnalysis,
  TeamingRecommendation,
  WinProbabilityAssessment
} from './rfpAnalysisService';
import {
  scrapeOpportunity,
  generateMockSAMData,
  SAMGovOpportunityData,
  scrapeOpportunityWithSource
} from './samGovScraper';
import {
  searchPastAwards,
  searchPastAwardsWithSource,
  analyzeCompetitors,
  PastAwardData,
  MarketIntelligence
} from './usaSpendingScraper';
import { createEvidencePack, exportEvidencePackJSON, exportEvidencePackHTML } from './evidencePackGenerator';
import { generateCaptureDecisionPackage, exportCapturePackageJSON, CaptureDecisionPackage } from './captureDecisionPackage';
import { generateCapturePackageHTML, exportCapturePackageHTML } from './capturePackageReport';

// Pack Policy Enforcement Integration
import {
  enforceDataSource,
  enforceWinProbabilityReview,
  enforceBidDecisionApproval,
  enforceHighValueEscalation,
  logCompetitorAnalysis,
  enforceTeamingReview,
  checkDeadlineWarning,
  enforceOpportunityAnalysis,
  type EnforcementResult
} from './packs/runtime';

/**
 * Opportunity status in BD pipeline
 */
export enum OpportunityStatus {
  NEW = 'NEW',
  QUALIFYING = 'QUALIFYING',
  QUALIFIED = 'QUALIFIED',
  ANALYZING = 'ANALYZING',
  REVIEWED = 'REVIEWED',
  BID_DECISION = 'BID_DECISION',
  NO_BID = 'NO_BID'
}

/**
 * Bid decision recommendation
 */
export enum BidDecision {
  STRONG_BID = 'STRONG_BID',         // Win prob > 70%, pursue aggressively
  BID = 'BID',                       // Win prob 50-70%, pursue
  BID_WITH_CAUTION = 'BID_WITH_CAUTION', // Win prob 30-50%, consider
  NO_BID = 'NO_BID',                 // Win prob < 30%, pass
  NEEDS_REVIEW = 'NEEDS_REVIEW'      // Requires executive decision
}

/**
 * Opportunity in BD pipeline
 */
export interface BDOpportunity {
  id: string;
  rfpNumber: string;
  title: string;
  agency: string;
  estimatedValue: number;
  deadline: Date;
  naicsCode: string;
  setAsideType?: string;

  // Analysis results
  status: OpportunityStatus;
  winProbability?: number;
  bidDecision?: BidDecision;
  competitorCount?: number;
  capabilityGaps?: string[];
  teamingRequired?: boolean;

  // Tracking
  assignedTo?: string;
  lastUpdated: Date;
  agentId?: string;

  // Data source tracking (for audit)
  dataSource?: {
    samGov: 'API' | 'SCRAPE' | 'MOCK';
    usaSpending: 'API' | 'SCRAPE' | 'MOCK';
  };
}

/**
 * BD Portfolio - all opportunities being tracked
 */
export interface BDPortfolio {
  opportunities: BDOpportunity[];
  summary: {
    total: number;
    qualifying: number;
    strongBids: number;
    bids: number;
    noBids: number;
    totalPipelineValue: number;
    avgWinProbability: number;
  };
}

/**
 * BD Team Member
 */
export interface BDTeamMember {
  id: string;
  name: string;
  role: 'BD_MANAGER' | 'CAPTURE_MANAGER' | 'PROPOSAL_MANAGER' | 'ANALYST';
  currentWorkload: number; // Number of active opportunities
  maxWorkload: number;
  specializations: string[]; // NAICS codes or agencies
}

/**
 * Business Development Workforce Orchestrator
 */
export class BDWorkforce {
  private engine: PlaybookEngine;
  private portfolio: Map<string, BDOpportunity> = new Map();
  private team: Map<string, BDTeamMember> = new Map();

  constructor() {
    this.engine = new PlaybookEngine();
    this.loadPlaybooks();
  }

  /**
   * Load BD playbooks from JSON files
   */
  private loadPlaybooks() {
    try {
      // Try to load the bd-rfp-pipeline playbook
      const playbookPath = path.join(__dirname, 'playbooks', 'bd-rfp-pipeline.playbook.json');
      if (fs.existsSync(playbookPath)) {
        const playbookJson = fs.readFileSync(playbookPath, 'utf-8');
        this.engine.loadPlaybookFromJSON(playbookJson);
      } else {
        // Fallback: register a minimal inline playbook for demo mode
        this.registerDemoPlaybook();
      }
    } catch (error) {
      console.warn('Could not load playbook from file, using demo mode:', error);
      this.registerDemoPlaybook();
    }
  }

  /**
   * Register a minimal demo playbook when file loading fails
   */
  private registerDemoPlaybook() {
    const demoPlaybook: Playbook = {
      id: 'bd-rfp-pipeline',
      name: 'BD RFP Pipeline (Demo Mode)',
      description: 'Simplified BD workflow for demo purposes',
      industry: 'Procurement',
      jobRole: 'Business Development Manager',
      version: '1.0.0-demo',
      defaultClassification: MAIClassification.ADVISORY,
      requiredExtensions: [],
      tags: ['bd', 'demo'],
      steps: [
        {
          id: 'analyze-opportunity',
          instruction: 'Analyze opportunity and generate qualification report',
          expectedOutcome: 'Qualification complete',
          classification: MAIClassification.INFORMATIONAL
        }
      ]
    };
    this.engine.registerPlaybook(demoPlaybook);
  }

  /**
   * Add team member to BD workforce
   */
  addTeamMember(member: BDTeamMember) {
    this.team.set(member.id, member);
  }

  /**
   * Ingest new RFP opportunities
   */
  async ingestOpportunities(rfps: Array<{
    rfpNumber: string;
    title?: string;
    agency?: string;
    estimatedValue?: number;
    deadline?: Date;
  }>): Promise<BDOpportunity[]> {
    const opportunities: BDOpportunity[] = rfps.map(rfp => ({
      id: `opp-${rfp.rfpNumber}`,
      rfpNumber: rfp.rfpNumber,
      title: rfp.title || 'Unknown',
      agency: rfp.agency || 'Unknown',
      estimatedValue: rfp.estimatedValue || 0,
      deadline: rfp.deadline || new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
      naicsCode: '',
      status: OpportunityStatus.NEW,
      lastUpdated: new Date()
    }));

    opportunities.forEach(opp => this.portfolio.set(opp.id, opp));

    console.log(`✓ Ingested ${opportunities.length} opportunities into BD pipeline`);
    return opportunities;
  }

  /**
   * Run qualification on all NEW opportunities in parallel
   */
  async qualifyOpportunities(
    config: {
      ourNaicsCodes: string;
      ourCertifications: string;
      minContractValue: number;
      maxContractValue: number;
    }
  ): Promise<BDPortfolio> {
    // Get all NEW opportunities
    const newOpps = Array.from(this.portfolio.values())
      .filter(opp => opp.status === OpportunityStatus.NEW);

    if (newOpps.length === 0) {
      console.log('No new opportunities to qualify');
      return this.getPortfolio();
    }

    console.log(`\n🚀 Starting qualification of ${newOpps.length} opportunities...`);

    // DEMO MODE: Skip browser automation and generate realistic results
    if (appConfig.demoMode) {
      return this.runDemoQualification(newOpps, config);
    }

    // Update status
    newOpps.forEach(opp => {
      opp.status = OpportunityStatus.QUALIFYING;
      opp.lastUpdated = new Date();
    });

    // Assign to team members with capacity
    const assignments = this.assignToTeam(newOpps);

    // Build playbook tasks for parallel execution
    const tasks = newOpps.map(opp => ({
      playbookId: 'bd-rfp-pipeline',
      agentId: `bd-agent-${opp.rfpNumber}`,
      variables: {
        RFP_NUMBER: opp.rfpNumber,
        AGENCY: opp.agency,
        OUR_NAICS_CODES: config.ourNaicsCodes,
        OUR_CERTIFICATIONS: config.ourCertifications,
        MIN_CONTRACT_VALUE: config.minContractValue.toString(),
        MAX_CONTRACT_VALUE: config.maxContractValue.toString()
      }
    }));

    // Execute workforce in parallel
    const results = await this.engine.executeWorkforce(tasks, {
      onProgress: (contexts) => {
        const completed = contexts.filter(c => c.status === 'completed').length;
        const running = contexts.filter(c => c.status === 'running').length;
        console.log(`  Progress: ${completed}/${contexts.length} complete, ${running} running`);
      },
      onApprovalRequired: async (agentId, step, screenshot) => {
        console.log(`[${agentId}] ⚠️  Approval required: ${step.instruction}`);
        // Auto-approve ADVISORY, require input for MANDATORY
        return step.classification !== MAIClassification.MANDATORY;
      },
      onComplete: (contexts) => {
        console.log(`\n✓ Qualification complete: ${contexts.length} opportunities analyzed\n`);
      }
    });

    // Process results and update portfolio
    // Update opportunities sequentially (could be parallelized if needed)
    for (const context of results) {
      const opp = Array.from(this.portfolio.values())
        .find(o => `bd-agent-${o.rfpNumber}` === context.agentId);

      if (opp && context.status === 'completed') {
        await this.updateOpportunityFromContext(opp, context, config);
      }
    }

    return this.getPortfolio();
  }

  /**
   * Assign opportunities to team members
   */
  private assignToTeam(opportunities: BDOpportunity[]): Map<string, BDOpportunity[]> {
    const assignments = new Map<string, BDOpportunity[]>();

    // Simple round-robin assignment based on workload
    const availableMembers = Array.from(this.team.values())
      .filter(m => m.currentWorkload < m.maxWorkload)
      .sort((a, b) => a.currentWorkload - b.currentWorkload);

    if (availableMembers.length === 0) {
      console.warn('⚠️  No team members with available capacity');
      return assignments;
    }

    let memberIndex = 0;
    opportunities.forEach(opp => {
      const member = availableMembers[memberIndex % availableMembers.length];
      opp.assignedTo = member.id;

      if (!assignments.has(member.id)) {
        assignments.set(member.id, []);
      }
      assignments.get(member.id)!.push(opp);

      member.currentWorkload++;
      memberIndex++;
    });

    return assignments;
  }

  /**
   * Update opportunity from playbook execution context
   * NOW WITH REAL ANALYSIS using Claude API and data scraping
   */
  private async updateOpportunityFromContext(
    opp: BDOpportunity,
    context: PlaybookContext,
    config: {
      ourNaicsCodes: string;
      ourCertifications: string;
      minContractValue: number;
      maxContractValue: number;
    }
  ) {
    try {
      console.log(`[BD Analysis] Starting real analysis for ${opp.rfpNumber}...`);

      // Actor context for policy enforcement
      const actor = {
        userId: context.operatorId || 'system',
        role: 'analyst'
      };

      // Extract data from results (if browser automation ran)
      const results = context.results;

      // Update status
      opp.status = OpportunityStatus.ANALYZING;
      opp.lastUpdated = new Date();
      opp.agentId = context.agentId;

      // STEP 1: Scrape SAM.gov for opportunity data
      console.log(`[BD Analysis] Scraping SAM.gov for ${opp.rfpNumber}...`);
      const samResult = await scrapeOpportunityWithSource(opp.rfpNumber, appConfig.strictMode);
      const samData = samResult.data;

      // Track data source for audit
      opp.dataSource = {
        samGov: samResult.source === 'SAM_GOV_API' ? 'API' :
                samResult.source === 'SAM_GOV_SCRAPE' ? 'SCRAPE' : 'MOCK',
        usaSpending: 'API' // Will be updated below
      };

      // 🛡️ PACK ENFORCEMENT: Data source verification
      const samDataSourceType = opp.dataSource.samGov;
      const samEnforcement = await enforceDataSource(samDataSourceType, 'samGov', actor);
      if (samEnforcement.decision === 'BLOCK') {
        throw new Error(`[POLICY BLOCK] ${samEnforcement.blockingPolicy?.policyName}: ${samEnforcement.blockingPolicy?.reason}`);
      }
      if (samEnforcement.alerts?.length) {
        samEnforcement.alerts.forEach(alert => {
          console.log(`[POLICY ${alert.level.toUpperCase()}] ${alert.policyId}: ${alert.message}`);
        });
      }

      if (samResult.warnings?.length) {
        console.warn(`[BD Analysis] SAM.gov warnings:`, samResult.warnings);
      }

      // STEP 2: Analyze opportunity brief with Claude
      console.log(`[BD Analysis] Analyzing opportunity brief with Claude...`);
      const opportunityBrief = await analyzeOpportunityBrief(
        samData.raw_html || samData.description,
        opp.rfpNumber
      );

      // Update opportunity with extracted data
      opp.title = opportunityBrief.title || opp.title;
      opp.agency = opportunityBrief.agency || opp.agency;
      opp.naicsCode = opportunityBrief.naics_code || opp.naicsCode;
      opp.setAsideType = opportunityBrief.set_aside_type;
      opp.deadline = new Date(opportunityBrief.deadline);
      if (opportunityBrief.estimated_value) {
        opp.estimatedValue = opportunityBrief.estimated_value;
      }

      // STEP 3: Search past awards on USASpending.gov
      console.log(`[BD Analysis] Searching past awards on USASpending.gov...`);
      const usaSpendingResult = await searchPastAwardsWithSource(
        opp.agency,
        opp.naicsCode,
        3, // 3 years back
        appConfig.strictMode
      );
      const pastAwards = usaSpendingResult.data;

      // Update data source tracking
      if (opp.dataSource) {
        opp.dataSource.usaSpending = usaSpendingResult.source === 'USA_SPENDING_API' ? 'API' :
                                      usaSpendingResult.source === 'USA_SPENDING_SCRAPE' ? 'SCRAPE' : 'MOCK';
      }

      if (usaSpendingResult.warnings?.length) {
        console.warn(`[BD Analysis] USASpending warnings:`, usaSpendingResult.warnings);
      }

      // 🛡️ PACK ENFORCEMENT: USASpending data source verification
      const usaDataSourceType = opp.dataSource?.usaSpending || 'API';
      const usaEnforcement = await enforceDataSource(usaDataSourceType, 'usaSpending', actor);
      if (usaEnforcement.decision === 'BLOCK') {
        throw new Error(`[POLICY BLOCK] ${usaEnforcement.blockingPolicy?.policyName}: ${usaEnforcement.blockingPolicy?.reason}`);
      }

      // 🛡️ PACK ENFORCEMENT: Deadline warning check
      const deadlineEnforcement = await checkDeadlineWarning(opp.id, opp.deadline, actor);
      if (deadlineEnforcement.alerts?.length) {
        deadlineEnforcement.alerts.forEach(alert => {
          console.log(`[POLICY ${alert.level.toUpperCase()}] ${alert.policyId}: ${alert.message}`);
        });
      }

      // STEP 4: Analyze competitive landscape
      console.log(`[BD Analysis] Analyzing competitive landscape...`);
      const marketIntel = await analyzeCompetitors(pastAwards);

      const competitiveLandscape = await analyzeCompetitiveLandscape(
        pastAwards,
        opp.agency,
        opp.naicsCode
      );

      // Update competitor count
      opp.competitorCount = competitiveLandscape.likely_competitors?.length || 0;

      // 🛡️ PACK ENFORCEMENT: Log competitor analysis (INFORMATIONAL)
      await logCompetitorAnalysis(
        opp.id,
        competitiveLandscape.likely_competitors?.map(c => c.name) || [],
        actor
      );

      // STEP 5: Capability gap analysis
      console.log(`[BD Analysis] Performing capability gap analysis...`);
      const capabilityGaps = await analyzeCapabilityGaps(
        samData.description,
        config.ourNaicsCodes.split(','),
        config.ourCertifications.split(','),
        opp.naicsCode,
        opportunityBrief.set_aside_type
      );

      opp.capabilityGaps = capabilityGaps.gaps?.map(g => g.capability) || [];

      // STEP 6: Teaming recommendations
      console.log(`[BD Analysis] Generating teaming recommendations...`);
      const teamingRec = await generateTeamingRecommendations(
        capabilityGaps,
        competitiveLandscape
      );

      opp.teamingRequired = teamingRec.teaming_strategy !== 'not_needed';

      // 🛡️ PACK ENFORCEMENT: Teaming recommendation review (ADVISORY)
      if (teamingRec.recommended_partners?.length) {
        const teamingEnforcement = await enforceTeamingReview(
          opp.id,
          teamingRec.recommended_partners.map(p => p.name),
          actor
        );
        if (teamingEnforcement.alerts?.length) {
          teamingEnforcement.alerts.forEach(alert => {
            console.log(`[POLICY ${alert.level.toUpperCase()}] ${alert.policyId}: ${alert.message}`);
          });
        }
      }

      // STEP 7: Calculate win probability with Claude
      console.log(`[BD Analysis] Calculating win probability with Claude...`);
      const winProbabilityAssessment = await calculateWinProbability(
        opportunityBrief,
        competitiveLandscape,
        capabilityGaps,
        pastAwards,
        teamingRec,
        {
          pastPerformanceWithAgency: appConfig.companyHasPastPerformanceWithAgency,
          avgContractSize: config.maxContractValue,
          yearsInBusiness: appConfig.companyYearsInBusiness
        }
      );

      opp.winProbability = winProbabilityAssessment.win_probability;

      // 🛡️ PACK ENFORCEMENT: Win probability review (ADVISORY)
      const winProbEnforcement = await enforceWinProbabilityReview(
        opp.winProbability,
        opp.id,
        actor
      );
      if (winProbEnforcement.alerts?.length) {
        winProbEnforcement.alerts.forEach(alert => {
          console.log(`[POLICY ${alert.level.toUpperCase()}] ${alert.policyId}: ${alert.message}`);
        });
      }

      // 🛡️ PACK ENFORCEMENT: High value escalation (MANDATORY for $5M+)
      const highValueEnforcement = await enforceHighValueEscalation(
        opp.id,
        opp.estimatedValue,
        actor
      );
      if (highValueEnforcement.decision === 'REQUIRE_APPROVAL') {
        console.log(`[POLICY APPROVAL REQUIRED] High value opportunity ($${(opp.estimatedValue / 1000000).toFixed(1)}M) requires executive approval`);
        for (const approval of highValueEnforcement.requiredApprovals || []) {
          console.log(`  → Requires: ${approval.approverRole} approval - ${approval.reason}`);
        }
      }

      // STEP 8: Determine bid decision
      opp.bidDecision = this.mapRecommendationToBidDecision(
        winProbabilityAssessment.recommendation
      );

      // 🛡️ PACK ENFORCEMENT: Bid decision approval (MANDATORY)
      const bidDecisionEnforcement = await enforceBidDecisionApproval(
        opp.id,
        opp.bidDecision,
        opp.estimatedValue,
        actor
      );
      if (bidDecisionEnforcement.decision === 'REQUIRE_APPROVAL') {
        console.log(`[POLICY APPROVAL REQUIRED] Bid decision requires manager approval`);
        for (const approval of bidDecisionEnforcement.requiredApprovals || []) {
          console.log(`  → Requires: ${approval.approverRole} approval - ${approval.reason}`);
        }
        // In production, this would pause for approval workflow
        // For now, log that approval is needed
      }

      // STEP 9: Generate BD decision memo
      console.log(`[BD Analysis] Generating BD decision memo...`);
      const bdMemo = await generateBDDecisionMemo(
        opportunityBrief,
        winProbabilityAssessment,
        competitiveLandscape,
        capabilityGaps,
        teamingRec,
        pastAwards
      );

      // STEP 10: Create Capture Decision Package (Government-Grade)
      console.log(`[BD Analysis] Creating Capture Decision Package...`);
      const capturePackage = generateCaptureDecisionPackage(
        {
          solicitation_number: opp.rfpNumber,
          title: opp.title,
          agency: opp.agency,
          sub_agency: opportunityBrief.sub_agency,
          naics_code: opp.naicsCode,
          set_aside_type: opp.setAsideType,
          estimated_value: opp.estimatedValue,
          deadline: opp.deadline?.toISOString(),
          description: samData.description,
          requirements: opportunityBrief.key_requirements
        },
        competitiveLandscape,
        capabilityGaps,
        pastAwards,
        teamingRec,
        winProbabilityAssessment,
        {
          // Company profile context
          pastPerformanceWithAgency: appConfig.companyHasPastPerformanceWithAgency,
          avgContractSize: config.maxContractValue,
          yearsInBusiness: appConfig.companyYearsInBusiness
        }
      );

      // Export Capture Decision Package as HTML and JSON
      await exportCapturePackageHTML(capturePackage);
      const capturePackageJson = exportCapturePackageJSON(capturePackage);

      // Also save JSON version
      const captureDir = './capture-packages';
      await fs.promises.mkdir(captureDir, { recursive: true });
      const jsonFilename = `capture-decision-package-${opp.rfpNumber}-${Date.now()}.json`;
      await fs.promises.writeFile(path.join(captureDir, jsonFilename), capturePackageJson, 'utf-8');
      console.log(`[BD Analysis] Capture Decision Package JSON saved: ${jsonFilename}`);

      // STEP 11: Create legacy evidence pack for backwards compatibility
      console.log(`[BD Analysis] Creating evidence pack...`);
      const evidencePack = await createEvidencePack(opp.rfpNumber, {
        opportunityBrief,
        competitiveLandscape,
        capabilityGaps,
        pastAwards,
        teamingRec,
        winProbability: winProbabilityAssessment,
        bdMemo,
        rawData: {
          sam_gov_html: samData.raw_html,
          usa_spending_results: marketIntel
        },
        auditTrail: context.approvals.map(approval => ({
          timestamp: approval.timestamp.toISOString(),
          action: approval.stepId,
          agent: approval.approver,
          classification: approval.approved ? 'APPROVED' : 'REJECTED'
        }))
      });

      // Export evidence packs
      await exportEvidencePackJSON(evidencePack);
      await exportEvidencePackHTML(evidencePack);

      console.log(`[BD Analysis] ✓ Complete analysis for ${opp.rfpNumber} | Win Prob: ${opp.winProbability}% | Decision: ${opp.bidDecision}`);

      opp.status = OpportunityStatus.REVIEWED;
      opp.lastUpdated = new Date();

    } catch (error) {
      console.error(`[BD Analysis] Error analyzing ${opp.rfpNumber}:`, error);

      // Fallback to simple analysis on error
      opp.status = OpportunityStatus.REVIEWED;
      opp.winProbability = this.calculateSimpleFallbackScore(opp);
      opp.bidDecision = this.determineBidDecision(opp);
      opp.competitorCount = 0; // Unknown — analysis failed, not generating fake count
      opp.capabilityGaps = [];
      opp.teamingRequired = opp.winProbability! < 60;
    }
  }

  /**
   * Map win probability recommendation to bid decision
   */
  private mapRecommendationToBidDecision(
    recommendation: 'STRONG_BID' | 'BID' | 'BID_WITH_CAUTION' | 'NO_BID' | 'NEEDS_REVIEW'
  ): BidDecision {
    switch (recommendation) {
      case 'STRONG_BID':
        return BidDecision.STRONG_BID;
      case 'BID':
        return BidDecision.BID;
      case 'BID_WITH_CAUTION':
        return BidDecision.BID_WITH_CAUTION;
      case 'NO_BID':
        return BidDecision.NO_BID;
      case 'NEEDS_REVIEW':
        return BidDecision.NEEDS_REVIEW;
      default:
        return BidDecision.NEEDS_REVIEW;
    }
  }

  /**
   * Simple fallback scoring when full analysis fails
   */
  private calculateSimpleFallbackScore(opp: BDOpportunity): number {
    let score = 50; // Base 50%

    // Adjust based on estimated value
    if (opp.estimatedValue > 0 && opp.estimatedValue < 1000000) {
      score += 10; // Sweet spot
    } else if (opp.estimatedValue > 10000000) {
      score -= 15; // Too large, more competition
    }

    // Add some randomness
    score += (Math.random() * 30) - 15;

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Determine bid decision based on win probability and other factors
   */
  private determineBidDecision(opp: BDOpportunity): BidDecision {
    const winProb = opp.winProbability || 0;

    // Check if needs executive review (high value or borderline)
    if (opp.estimatedValue > 5000000 || (winProb >= 45 && winProb <= 55)) {
      return BidDecision.NEEDS_REVIEW;
    }

    // Standard decision tree
    if (winProb >= 70) return BidDecision.STRONG_BID;
    if (winProb >= 50) return BidDecision.BID;
    if (winProb >= 30) return BidDecision.BID_WITH_CAUTION;
    return BidDecision.NO_BID;
  }

  /**
   * Get current portfolio view
   */
  getPortfolio(): BDPortfolio {
    const opportunities = Array.from(this.portfolio.values());

    const summary = {
      total: opportunities.length,
      qualifying: opportunities.filter(o => o.status === OpportunityStatus.QUALIFYING).length,
      strongBids: opportunities.filter(o => o.bidDecision === BidDecision.STRONG_BID).length,
      bids: opportunities.filter(o => o.bidDecision === BidDecision.BID).length,
      noBids: opportunities.filter(o => o.bidDecision === BidDecision.NO_BID).length,
      totalPipelineValue: opportunities
        .filter(o => o.bidDecision !== BidDecision.NO_BID)
        .reduce((sum, o) => sum + o.estimatedValue, 0),
      avgWinProbability: opportunities.filter(o => o.winProbability)
        .reduce((sum, o) => sum + (o.winProbability || 0), 0) /
        (opportunities.filter(o => o.winProbability).length || 1)
    };

    return { opportunities, summary };
  }

  /**
   * Get opportunities by bid decision
   */
  getOpportunitiesByDecision(decision: BidDecision): BDOpportunity[] {
    return Array.from(this.portfolio.values())
      .filter(opp => opp.bidDecision === decision)
      .sort((a, b) => (b.winProbability || 0) - (a.winProbability || 0));
  }

  /**
   * Get executive dashboard summary
   */
  getExecutiveDashboard(): string {
    const portfolio = this.getPortfolio();
    const strongBids = this.getOpportunitiesByDecision(BidDecision.STRONG_BID);
    const bids = this.getOpportunitiesByDecision(BidDecision.BID);
    const needsReview = this.getOpportunitiesByDecision(BidDecision.NEEDS_REVIEW);

    let dashboard = '\n╔═══════════════════════════════════════════════════════════════╗\n';
    dashboard += '║         BUSINESS DEVELOPMENT EXECUTIVE DASHBOARD              ║\n';
    dashboard += '╚═══════════════════════════════════════════════════════════════╝\n\n';

    // Summary metrics
    dashboard += '📊 PIPELINE SUMMARY\n';
    dashboard += '─────────────────────────────────────────────────────────────────\n';
    dashboard += `  Total Opportunities: ${portfolio.summary.total}\n`;
    dashboard += `  Strong Bid Recommendations: ${portfolio.summary.strongBids}\n`;
    dashboard += `  Bid Recommendations: ${portfolio.summary.bids}\n`;
    dashboard += `  No-Bid: ${portfolio.summary.noBids}\n`;
    dashboard += `  Total Pipeline Value: $${(portfolio.summary.totalPipelineValue / 1000000).toFixed(2)}M\n`;
    dashboard += `  Average Win Probability: ${portfolio.summary.avgWinProbability.toFixed(1)}%\n\n`;

    // Strong bids
    if (strongBids.length > 0) {
      dashboard += '🎯 STRONG BID RECOMMENDATIONS (Win Prob > 70%)\n';
      dashboard += '─────────────────────────────────────────────────────────────────\n';
      strongBids.slice(0, 5).forEach(opp => {
        dashboard += `  ${opp.rfpNumber} | ${opp.agency}\n`;
        dashboard += `  └─ Value: $${(opp.estimatedValue / 1000000).toFixed(2)}M | `;
        dashboard += `Win Prob: ${opp.winProbability?.toFixed(1)}% | `;
        dashboard += `Deadline: ${opp.deadline.toLocaleDateString()}\n`;
      });
      dashboard += '\n';
    }

    // Needs executive review
    if (needsReview.length > 0) {
      dashboard += '⚠️  REQUIRES EXECUTIVE REVIEW\n';
      dashboard += '─────────────────────────────────────────────────────────────────\n';
      needsReview.forEach(opp => {
        dashboard += `  ${opp.rfpNumber} | ${opp.agency}\n`;
        dashboard += `  └─ Value: $${(opp.estimatedValue / 1000000).toFixed(2)}M | `;
        dashboard += `Win Prob: ${opp.winProbability?.toFixed(1)}% | `;
        const reason = opp.estimatedValue > 5000000 ? 'High Value' : 'Borderline Win Prob';
        dashboard += `Reason: ${reason}\n`;
      });
      dashboard += '\n';
    }

    // Action items
    dashboard += '📋 RECOMMENDED ACTIONS\n';
    dashboard += '─────────────────────────────────────────────────────────────────\n';
    if (strongBids.length > 0) {
      dashboard += `  • Fast-track ${strongBids.length} strong bid opportunit${strongBids.length === 1 ? 'y' : 'ies'}\n`;
    }
    if (needsReview.length > 0) {
      dashboard += `  • Schedule executive review for ${needsReview.length} opportunit${needsReview.length === 1 ? 'y' : 'ies'}\n`;
    }
    if (bids.length > 0) {
      dashboard += `  • Assign capture managers to ${bids.length} qualified opportunit${bids.length === 1 ? 'y' : 'ies'}\n`;
    }

    return dashboard;
  }

  /**
   * Export portfolio to CSV
   */
  exportToCSV(): string {
    const opportunities = Array.from(this.portfolio.values());

    let csv = 'RFP Number,Title,Agency,Estimated Value,Deadline,Win Probability,Bid Decision,Status,Assigned To\n';

    opportunities.forEach(opp => {
      csv += `"${opp.rfpNumber}",`;
      csv += `"${opp.title}",`;
      csv += `"${opp.agency}",`;
      csv += `${opp.estimatedValue},`;
      csv += `"${opp.deadline.toISOString()}",`;
      csv += `${opp.winProbability?.toFixed(1) || 'N/A'},`;
      csv += `${opp.bidDecision || 'N/A'},`;
      csv += `${opp.status},`;
      csv += `"${opp.assignedTo || 'Unassigned'}"\n`;
    });

    return csv;
  }

  /**
   * DEMO MODE: Run qualification with simulated results
   * Shows realistic workflow without API calls
   * NOW GENERATES FULL CAPTURE DECISION PACKAGES
   */
  private async runDemoQualification(
    opportunities: BDOpportunity[],
    qualConfig: {
      ourNaicsCodes: string;
      ourCertifications: string;
      minContractValue: number;
      maxContractValue: number;
    }
  ): Promise<BDPortfolio> {
    console.log('[DEMO MODE] Running simulated qualification...\n');

    // Assign to team
    this.assignToTeam(opportunities);

    // Simulate processing with realistic delays
    const totalOpps = opportunities.length;
    let processed = 0;

    for (const opp of opportunities) {
      // Simulate processing delay
      await this.delay(200 + Math.random() * 300);
      processed++;

      // Generate realistic demo results
      const demoResult = this.generateDemoResult(opp, qualConfig);

      // Update opportunity with demo results
      opp.status = OpportunityStatus.BID_DECISION;
      opp.winProbability = demoResult.winProbability;
      opp.bidDecision = demoResult.bidDecision;
      opp.competitorCount = demoResult.competitorCount;
      opp.capabilityGaps = demoResult.capabilityGaps;
      opp.teamingRequired = demoResult.teamingRequired;
      opp.lastUpdated = new Date();

      // Progress update
      const progressBar = '='.repeat(Math.floor(processed / totalOpps * 20)).padEnd(20, '-');
      process.stdout.write(`\r  [${progressBar}] ${processed}/${totalOpps} opportunities analyzed`);
    }

    console.log('\n\n[DEMO MODE] Qualification complete!\n');

    // Generate Capture Decision Packages for top opportunities
    console.log('[DEMO MODE] Generating Capture Decision Packages...\n');
    const topOpportunities = opportunities
      .filter(o => o.bidDecision !== BidDecision.NO_BID)
      .slice(0, 3); // Generate packages for top 3 opportunities

    for (const opp of topOpportunities) {
      await this.generateDemoCapturePackage(opp, qualConfig);
    }

    return this.getPortfolio();
  }

  /**
   * Generate a full Capture Decision Package for demo mode
   */
  private async generateDemoCapturePackage(
    opp: BDOpportunity,
    config: {
      ourNaicsCodes: string;
      ourCertifications: string;
      minContractValue: number;
      maxContractValue: number;
    }
  ): Promise<void> {
    console.log(`[DEMO] Generating Capture Decision Package for ${opp.rfpNumber}...`);

    // Generate realistic demo data for each section
    const demoOpportunityData = {
      solicitation_number: opp.rfpNumber,
      title: opp.title,
      agency: opp.agency,
      sub_agency: this.getDemoSubAgency(opp.agency),
      naics_code: opp.naicsCode || '541512',
      set_aside_type: opp.setAsideType || 'Full and Open Competition',
      estimated_value: opp.estimatedValue,
      deadline: opp.deadline?.toISOString(),
      description: this.getDemoDescription(opp),
      requirements: this.getDemoRequirements(opp)
    };

    const demoCompetitiveLandscape = this.generateDemoCompetitiveLandscape(opp);
    const demoCapabilityGaps = this.generateDemoCapabilityGaps(opp);
    const demoPastAwards = this.generateDemoPastAwards(opp);
    const demoTeamingRec = this.generateDemoTeamingRec(opp);
    const demoWinProbability = this.generateDemoWinProbability(opp);

    // Generate the Capture Decision Package
    const capturePackage = generateCaptureDecisionPackage(
      demoOpportunityData,
      demoCompetitiveLandscape,
      demoCapabilityGaps,
      demoPastAwards,
      demoTeamingRec,
      demoWinProbability,
      {
        pastPerformanceWithAgency: appConfig.companyHasPastPerformanceWithAgency,
        avgContractSize: config.maxContractValue,
        yearsInBusiness: appConfig.companyYearsInBusiness
      }
    );

    // Export as HTML and JSON
    try {
      await exportCapturePackageHTML(capturePackage);

      const captureDir = './capture-packages';
      await fs.promises.mkdir(captureDir, { recursive: true });
      const jsonFilename = `capture-decision-package-${opp.rfpNumber}-${Date.now()}.json`;
      await fs.promises.writeFile(
        path.join(captureDir, jsonFilename),
        exportCapturePackageJSON(capturePackage),
        'utf-8'
      );

      console.log(`[DEMO] Capture Decision Package saved for ${opp.rfpNumber}`);
    } catch (error) {
      console.error(`[DEMO] Error saving capture package for ${opp.rfpNumber}:`, error);
    }
  }

  // Demo data generators for Capture Decision Package
  private getDemoSubAgency(agency: string): string {
    const subAgencies: Record<string, string> = {
      'Department of Veterans Affairs': 'Veterans Health Administration',
      'Department of Defense': 'Defense Information Systems Agency',
      'Department of Homeland Security': 'Cybersecurity and Infrastructure Security Agency',
      'Department of Health and Human Services': 'Centers for Medicare & Medicaid Services'
    };
    return subAgencies[agency] || 'Office of Information Technology';
  }

  private getDemoDescription(opp: BDOpportunity): string {
    return `The ${opp.agency} requires contractor support for ${opp.title}. ` +
      `This requirement supports the agency's mission to deliver high-quality services ` +
      `through modern technology solutions. The contractor shall provide comprehensive ` +
      `support including planning, implementation, and ongoing maintenance services.`;
  }

  private getDemoRequirements(opp: BDOpportunity): string[] {
    const baseReqs = [
      'Provide program management and technical oversight',
      'Deliver monthly status reports and quarterly reviews',
      'Maintain compliance with federal security requirements',
      'Ensure 99.9% system availability during core hours'
    ];

    if (opp.title.toLowerCase().includes('cyber') || opp.title.toLowerCase().includes('security')) {
      baseReqs.push('Implement NIST Cybersecurity Framework controls');
      baseReqs.push('Conduct vulnerability assessments and penetration testing');
    }

    if (opp.title.toLowerCase().includes('cloud') || opp.title.toLowerCase().includes('data')) {
      baseReqs.push('Migrate legacy systems to FedRAMP-authorized cloud environment');
      baseReqs.push('Implement data governance and quality management');
    }

    return baseReqs;
  }

  private generateDemoCompetitiveLandscape(opp: BDOpportunity): any {
    const competitors = [
      { company_name: 'Booz Allen Hamilton', past_awards: 12, total_value: 45000000, geographic_presence: ['DC Metro', 'Nationwide'], strength_assessment: 'high' as const },
      { company_name: 'CACI International', past_awards: 8, total_value: 28000000, geographic_presence: ['DC Metro', 'Virginia'], strength_assessment: 'high' as const },
      { company_name: 'ManTech International', past_awards: 6, total_value: 18000000, geographic_presence: ['DC Metro'], strength_assessment: 'medium' as const },
      { company_name: 'Leidos', past_awards: 5, total_value: 15000000, geographic_presence: ['Nationwide'], strength_assessment: 'medium' as const },
      { company_name: 'General Dynamics IT', past_awards: 4, total_value: 12000000, geographic_presence: ['DC Metro', 'Virginia'], strength_assessment: 'medium' as const }
    ];

    return {
      market_concentration: opp.estimatedValue > 5000000 ? 'highly_competitive' : 'moderately_competitive',
      incumbent_advantage: Math.random() > 0.5,
      likely_competitors: competitors.slice(0, opp.competitorCount || 5)
    };
  }

  private generateDemoCapabilityGaps(opp: BDOpportunity): any {
    const gaps: any[] = [];

    if (opp.capabilityGaps && opp.capabilityGaps.length > 0) {
      for (const gap of opp.capabilityGaps) {
        gaps.push({
          capability: gap,
          severity: Math.random() > 0.7 ? 'critical' : 'moderate',
          teaming_needed: Math.random() > 0.5,
          can_acquire: Math.random() > 0.3
        });
      }
    }

    return {
      overall_fit_score: Math.round(70 + Math.random() * 20),
      required_capabilities: [
        'Program Management',
        'Technical Leadership',
        'Agile Development',
        'Cloud Architecture',
        'Security Engineering'
      ],
      our_capabilities: [
        'Program Management',
        'Technical Leadership',
        'Agile Development'
      ],
      gaps
    };
  }

  private generateDemoPastAwards(opp: BDOpportunity): any[] {
    // DEMO DATA — clearly labeled, not pretending to be real SAM.gov award data.
    // In production, this would be replaced by actual SAM.gov FPDS award queries.
    const companies = ['Booz Allen Hamilton', 'CACI International', 'Leidos', 'ManTech', 'SAIC', 'Perspecta'];
    return companies.map((company, i) => ({
      recipient: company,
      recipient_name: company,
      award_amount: (i + 1) * 750000, // Deterministic, not random
      award_date: new Date(Date.now() - (i + 1) * 180 * 24 * 60 * 60 * 1000).toISOString(), // Spaced 6mo apart
      description: `${opp.agency} IT Support Services`,
      naics_code: opp.naicsCode || '541512',
      _demo_data: true // Flag so downstream consumers know this is demo
    }));
  }

  private generateDemoTeamingRec(opp: BDOpportunity): any {
    const needsTeaming = opp.teamingRequired || (opp.capabilityGaps && opp.capabilityGaps.length > 1);

    return {
      teaming_strategy: needsTeaming ? 'prime' : 'not_needed',
      recommended_partners: needsTeaming ? [
        {
          company_name: 'Strategic Technology Partners LLC',
          name: 'Strategic Technology Partners LLC',
          fills_gaps: opp.capabilityGaps?.slice(0, 2) || ['Security clearance requirements'],
          past_performance_strength: 85,
          recommendation_rationale: 'Strong past performance with similar agencies and complementary capabilities'
        },
        {
          company_name: 'Federal Solutions Inc',
          name: 'Federal Solutions Inc',
          fills_gaps: ['Geographic presence in region'],
          past_performance_strength: 78,
          recommendation_rationale: 'Established presence in target region with relevant contract vehicles'
        }
      ] : [],
      rationale: needsTeaming
        ? 'Teaming recommended to address capability gaps and strengthen competitive position'
        : 'No teaming required - internal capabilities sufficient for this opportunity'
    };
  }

  private generateDemoWinProbability(opp: BDOpportunity): any {
    const winProb = opp.winProbability || 50;

    let recommendation: 'STRONG_BID' | 'BID' | 'BID_WITH_CAUTION' | 'NO_BID' | 'NEEDS_REVIEW';
    if (winProb >= 70) recommendation = 'STRONG_BID';
    else if (winProb >= 50) recommendation = 'BID';
    else if (winProb >= 30) recommendation = 'BID_WITH_CAUTION';
    else recommendation = 'NO_BID';

    return {
      win_probability: winProb,
      confidence_level: winProb > 60 ? 'high' : winProb > 40 ? 'medium' : 'low',
      recommendation,
      key_strength_factors: [
        'Strong technical approach alignment',
        'Relevant past performance',
        'Competitive pricing capability',
        'Available qualified personnel'
      ].slice(0, Math.ceil(winProb / 25)),
      key_risk_factors: [
        'Strong incumbent relationship',
        'Limited past performance with specific agency',
        'Aggressive pricing environment',
        'Capability gaps require teaming'
      ].slice(0, Math.ceil((100 - winProb) / 25)),
      rationale: `Based on comprehensive analysis of competitive landscape, capability alignment, ` +
        `and pricing factors, this opportunity has a ${Math.round(winProb)}% probability of win. ` +
        (winProb >= 50
          ? 'The opportunity aligns well with our core capabilities and market position.'
          : 'Significant challenges exist that may impact our competitive position.'),
      score_breakdown: {
        past_performance_score: Math.round(winProb * 0.25),
        technical_capability_score: Math.round(winProb * 0.28),
        competitive_position_score: Math.round(winProb * 0.22),
        price_competitiveness_score: Math.round(winProb * 0.25)
      }
    };
  }

  /**
   * Generate realistic demo results for an opportunity
   */
  private generateDemoResult(opp: BDOpportunity, config: {
    ourNaicsCodes: string;
    ourCertifications: string;
    minContractValue: number;
    maxContractValue: number;
  }): {
    winProbability: number;
    bidDecision: BidDecision;
    competitorCount: number;
    capabilityGaps: string[];
    teamingRequired: boolean;
  } {
    // Simulate realistic scoring based on opportunity characteristics
    let baseScore = 50;

    // Agency familiarity bonus
    const vaAgencies = ['Department of Veterans Affairs', 'VA', 'Department of Defense'];
    if (vaAgencies.some(a => opp.agency.includes(a))) {
      baseScore += 15; // We know these agencies
    }

    // Contract value fit
    if (opp.estimatedValue >= config.minContractValue && opp.estimatedValue <= config.maxContractValue) {
      baseScore += 10;
    } else if (opp.estimatedValue > config.maxContractValue) {
      baseScore -= 15; // Too big for us
    }

    // Title keyword matching (simulates NAICS match)
    const itKeywords = ['IT', 'Software', 'Cyber', 'Cloud', 'Data', 'System'];
    if (itKeywords.some(k => opp.title.includes(k))) {
      baseScore += 10;
    }

    // Certification match simulation
    if (config.ourCertifications.includes('SDVOSB')) {
      baseScore += 8; // Set-aside advantage
    }

    // Add some randomness for realism
    const randomVariance = (Math.random() - 0.5) * 20;
    const winProbability = Math.max(15, Math.min(95, baseScore + randomVariance));

    // Determine bid decision
    let bidDecision: BidDecision;
    if (winProbability >= 70) {
      bidDecision = BidDecision.STRONG_BID;
    } else if (winProbability >= 50) {
      bidDecision = BidDecision.BID;
    } else if (winProbability >= 35) {
      bidDecision = BidDecision.BID_WITH_CAUTION;
    } else {
      bidDecision = BidDecision.NO_BID;
    }

    // High value contracts need executive review
    if (opp.estimatedValue > 5000000 && bidDecision !== BidDecision.NO_BID) {
      bidDecision = BidDecision.NEEDS_REVIEW;
    }

    // Simulate capability gaps
    const possibleGaps = [
      'Security clearance requirements',
      'Geographic presence in region',
      'Past performance with agency',
      'Specific technical certification',
      'Key personnel requirements'
    ];
    const capabilityGaps = possibleGaps.filter(() => Math.random() < 0.25);

    // Teaming required if significant gaps
    const teamingRequired = capabilityGaps.length >= 2;

    // Competitor count based on contract size
    const competitorCount = Math.floor(3 + (opp.estimatedValue / 1000000) * 2 + Math.random() * 5);

    return {
      winProbability,
      bidDecision,
      competitorCount,
      capabilityGaps,
      teamingRequired
    };
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
