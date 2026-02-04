/**
 * BD Types - Browser-safe types and enums for BD Dashboard
 * Extracted from bdWorkforce.ts to avoid Node.js module dependencies
 */

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
  status: OpportunityStatus;
  bidDecision?: BidDecision;
  winProbability?: number;
  assignedAgents?: string[];
  lastUpdated: Date;
  naicsCode?: string;
  setAsideType?: string;
  classificationLevel?: string;
}
