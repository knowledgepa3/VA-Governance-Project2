/**
 * Capture Pipeline - Kanban State Management
 *
 * Tracks opportunities through the BD lifecycle:
 * Identified → Qualified → Capture → Drafting → Submitted → Won/Lost
 */

export enum PipelineStage {
  IDENTIFIED = 'IDENTIFIED',      // Found in SAM.gov, initial review
  QUALIFIED = 'QUALIFIED',        // Passed filters, decision to pursue
  CAPTURE = 'CAPTURE',            // Active capture/analysis underway
  DRAFTING = 'DRAFTING',          // Writing proposal
  SUBMITTED = 'SUBMITTED',        // Proposal submitted, awaiting decision
  WON = 'WON',                    // Contract awarded to us
  LOST = 'LOST',                  // Contract awarded to competitor
  NO_BID = 'NO_BID'               // Decided not to pursue
}

export interface PipelineOpportunity {
  id: string;
  rfpNumber: string;
  title: string;
  agency: string;
  estimatedValue: number;
  deadline: Date;
  stage: PipelineStage;

  // Tracking
  addedDate: Date;
  lastUpdated: Date;
  stageHistory: {
    stage: PipelineStage;
    date: Date;
    notes?: string;
  }[];

  // Capture data
  matchScore?: number;
  soloSafe?: boolean;
  riskFlags?: string[];
  captureCompleted?: boolean;
  captureReportId?: string;

  // Decision data
  bidDecisionRationale?: string;

  // Outcome data (for Won/Lost)
  awardDate?: Date;
  awardAmount?: number;
  awardee?: string;
  lossReason?: string;
  lessonsLearned?: string;

  // Internal deadlines
  milestones?: {
    name: string;
    dueDate: Date;
    completed: boolean;
  }[];

  // Notes
  notes?: string;

  // Link to original opportunity data
  originalData?: any;
}

export interface PipelineState {
  opportunities: PipelineOpportunity[];
  lastUpdated: Date;
}

// Stage configuration for display
export const STAGE_CONFIG: Record<PipelineStage, {
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
  icon: string;
  description: string;
}> = {
  [PipelineStage.IDENTIFIED]: {
    label: 'Identified',
    color: 'text-slate-600',
    bgColor: 'bg-slate-100',
    borderColor: 'border-slate-300',
    icon: 'Search',
    description: 'New opportunities for review'
  },
  [PipelineStage.QUALIFIED]: {
    label: 'Qualified',
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-300',
    icon: 'CheckCircle',
    description: 'Passed filters, decision to pursue'
  },
  [PipelineStage.CAPTURE]: {
    label: 'Capture',
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-300',
    icon: 'Target',
    description: 'Active analysis & strategy'
  },
  [PipelineStage.DRAFTING]: {
    label: 'Drafting',
    color: 'text-amber-600',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-300',
    icon: 'FileText',
    description: 'Writing proposal'
  },
  [PipelineStage.SUBMITTED]: {
    label: 'Submitted',
    color: 'text-cyan-600',
    bgColor: 'bg-cyan-50',
    borderColor: 'border-cyan-300',
    icon: 'Send',
    description: 'Awaiting award decision'
  },
  [PipelineStage.WON]: {
    label: 'Won',
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-50',
    borderColor: 'border-emerald-300',
    icon: 'Trophy',
    description: 'Contract awarded'
  },
  [PipelineStage.LOST]: {
    label: 'Lost',
    color: 'text-rose-600',
    bgColor: 'bg-rose-50',
    borderColor: 'border-rose-300',
    icon: 'XCircle',
    description: 'Not selected'
  },
  [PipelineStage.NO_BID]: {
    label: 'No Bid',
    color: 'text-slate-400',
    bgColor: 'bg-slate-50',
    borderColor: 'border-slate-200',
    icon: 'MinusCircle',
    description: 'Decided not to pursue'
  }
};

// Active stages for the main kanban (excludes terminal states)
export const ACTIVE_STAGES: PipelineStage[] = [
  PipelineStage.IDENTIFIED,
  PipelineStage.QUALIFIED,
  PipelineStage.CAPTURE,
  PipelineStage.DRAFTING,
  PipelineStage.SUBMITTED
];

// Terminal stages
export const TERMINAL_STAGES: PipelineStage[] = [
  PipelineStage.WON,
  PipelineStage.LOST,
  PipelineStage.NO_BID
];

/**
 * Create a new pipeline opportunity from BD opportunity data
 */
export function createPipelineOpportunity(
  oppData: any,
  initialStage: PipelineStage = PipelineStage.IDENTIFIED
): PipelineOpportunity {
  const now = new Date();
  return {
    id: `pipe-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    rfpNumber: oppData.rfpNumber || oppData.id || 'Unknown',
    title: oppData.title,
    agency: oppData.agency,
    estimatedValue: oppData.estimatedValue || 0,
    deadline: oppData.deadline instanceof Date ? oppData.deadline : new Date(oppData.deadline),
    stage: initialStage,
    addedDate: now,
    lastUpdated: now,
    stageHistory: [{
      stage: initialStage,
      date: now,
      notes: 'Added to pipeline'
    }],
    matchScore: oppData.filterScore,
    soloSafe: oppData.soloSafe,
    riskFlags: oppData.riskFlags,
    originalData: oppData,
    milestones: generateDefaultMilestones(oppData.deadline)
  };
}

/**
 * Generate default milestones based on deadline
 */
function generateDefaultMilestones(deadline: Date | string): PipelineOpportunity['milestones'] {
  const deadlineDate = deadline instanceof Date ? deadline : new Date(deadline);
  const now = new Date();
  const daysUntilDeadline = Math.ceil((deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  if (daysUntilDeadline <= 0) return [];

  const milestones: PipelineOpportunity['milestones'] = [];

  // Questions deadline (typically 7-10 days before)
  if (daysUntilDeadline > 10) {
    const questionsDate = new Date(deadlineDate);
    questionsDate.setDate(questionsDate.getDate() - 10);
    milestones.push({
      name: 'Questions Due',
      dueDate: questionsDate,
      completed: false
    });
  }

  // Internal draft review (5 days before)
  if (daysUntilDeadline > 5) {
    const draftDate = new Date(deadlineDate);
    draftDate.setDate(draftDate.getDate() - 5);
    milestones.push({
      name: 'Draft Complete',
      dueDate: draftDate,
      completed: false
    });
  }

  // Final review (2 days before)
  if (daysUntilDeadline > 2) {
    const reviewDate = new Date(deadlineDate);
    reviewDate.setDate(reviewDate.getDate() - 2);
    milestones.push({
      name: 'Final Review',
      dueDate: reviewDate,
      completed: false
    });
  }

  // Submission
  milestones.push({
    name: 'Submit Proposal',
    dueDate: deadlineDate,
    completed: false
  });

  return milestones;
}

/**
 * Move opportunity to a new stage
 */
export function moveToStage(
  opp: PipelineOpportunity,
  newStage: PipelineStage,
  notes?: string
): PipelineOpportunity {
  return {
    ...opp,
    stage: newStage,
    lastUpdated: new Date(),
    stageHistory: [
      ...opp.stageHistory,
      {
        stage: newStage,
        date: new Date(),
        notes
      }
    ]
  };
}

/**
 * Calculate pipeline metrics
 */
export function calculatePipelineMetrics(opportunities: PipelineOpportunity[]): {
  totalValue: number;
  activeCount: number;
  wonCount: number;
  wonValue: number;
  lostCount: number;
  winRate: number;
  avgDaysInPipeline: number;
  byStage: Record<PipelineStage, { count: number; value: number }>;
  urgentCount: number; // Due in next 7 days
} {
  const byStage = Object.values(PipelineStage).reduce((acc, stage) => {
    acc[stage] = { count: 0, value: 0 };
    return acc;
  }, {} as Record<PipelineStage, { count: number; value: number }>);

  let totalValue = 0;
  let activeCount = 0;
  let wonCount = 0;
  let wonValue = 0;
  let lostCount = 0;
  let totalDays = 0;
  let completedCount = 0;
  let urgentCount = 0;

  const now = new Date();
  const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  opportunities.forEach(opp => {
    byStage[opp.stage].count++;
    byStage[opp.stage].value += opp.estimatedValue;

    if (ACTIVE_STAGES.includes(opp.stage)) {
      activeCount++;
      totalValue += opp.estimatedValue;

      if (opp.deadline <= sevenDaysFromNow && opp.deadline >= now) {
        urgentCount++;
      }
    }

    if (opp.stage === PipelineStage.WON) {
      wonCount++;
      wonValue += opp.awardAmount || opp.estimatedValue;
      completedCount++;
      totalDays += (opp.awardDate || opp.lastUpdated).getTime() - opp.addedDate.getTime();
    }

    if (opp.stage === PipelineStage.LOST) {
      lostCount++;
      completedCount++;
      totalDays += opp.lastUpdated.getTime() - opp.addedDate.getTime();
    }
  });

  const winRate = wonCount + lostCount > 0
    ? Math.round((wonCount / (wonCount + lostCount)) * 100)
    : 0;

  const avgDaysInPipeline = completedCount > 0
    ? Math.round(totalDays / completedCount / (1000 * 60 * 60 * 24))
    : 0;

  return {
    totalValue,
    activeCount,
    wonCount,
    wonValue,
    lostCount,
    winRate,
    avgDaysInPipeline,
    byStage,
    urgentCount
  };
}

/**
 * Local storage key for persistence
 */
const PIPELINE_STORAGE_KEY = 'ace_capture_pipeline';

/**
 * Save pipeline to local storage
 */
export function savePipeline(state: PipelineState): void {
  try {
    localStorage.setItem(PIPELINE_STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.error('Failed to save pipeline:', e);
  }
}

/**
 * Load pipeline from local storage
 */
export function loadPipeline(): PipelineState {
  try {
    const stored = localStorage.getItem(PIPELINE_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Convert date strings back to Date objects
      return {
        ...parsed,
        lastUpdated: new Date(parsed.lastUpdated),
        opportunities: parsed.opportunities.map((opp: any) => ({
          ...opp,
          deadline: new Date(opp.deadline),
          addedDate: new Date(opp.addedDate),
          lastUpdated: new Date(opp.lastUpdated),
          awardDate: opp.awardDate ? new Date(opp.awardDate) : undefined,
          stageHistory: opp.stageHistory.map((h: any) => ({
            ...h,
            date: new Date(h.date)
          })),
          milestones: opp.milestones?.map((m: any) => ({
            ...m,
            dueDate: new Date(m.dueDate)
          }))
        }))
      };
    }
  } catch (e) {
    console.error('Failed to load pipeline:', e);
  }

  return {
    opportunities: [],
    lastUpdated: new Date()
  };
}

export default {
  PipelineStage,
  STAGE_CONFIG,
  ACTIVE_STAGES,
  TERMINAL_STAGES,
  createPipelineOpportunity,
  moveToStage,
  calculatePipelineMetrics,
  savePipeline,
  loadPipeline
};
