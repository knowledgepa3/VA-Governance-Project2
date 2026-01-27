
export enum AgentRole {
  GATEWAY = 'Unified Gateway',
  TIMELINE = 'Timeline Builder',
  EVIDENCE = 'Evidence Validator',
  RATER_PERSPECTIVE = 'Rater Perspective',
  CP_EXAMINER_PERSPECTIVE = 'C&P Examiner Perspective',
  QA = 'Quality Assurance',
  REPORT = 'Report Generator',
  TELEMETRY = 'Telemetry Collector',
  SUPERVISOR = 'Supervisor',
  REPAIR = 'Repair',
  AUDIT = 'Audit',
  // Financial Roles
  LEDGER_AUDITOR = 'Ledger Auditor',
  FRAUD_DETECTOR = 'Fraud Detector',
  TAX_COMPLIANCE = 'Tax Compliance'
}

export enum UserRole {
  ISSO = 'ISSO / ACE Architect',
  FORENSIC_SME = 'Forensic SME',
  SANITIZATION_OFFICER = 'Sanitization Officer',
  FEDERAL_AUDITOR = 'Federal Auditor',
  CHIEF_COMPLIANCE_OFFICER = 'Chief Compliance Officer'
}

export enum WorkforceType {
  VA_CLAIMS = 'VA_CLAIMS',
  FINANCIAL_AUDIT = 'FINANCIAL_AUDIT'
}

export enum MAIClassification {
  INFORMATIONAL = 'INFORMATIONAL',
  ADVISORY = 'ADVISORY',
  MANDATORY = 'MANDATORY'
}

export enum AgentStatus {
  IDLE = 'IDLE',
  WORKING = 'WORKING',
  PAUSED = 'PAUSED',
  COMPLETE = 'COMPLETE',
  FAILED = 'FAILED',
  REPAIRING = 'REPAIRING'
}

export interface ActivityLog {
  id: string;
  timestamp: string;
  role: AgentRole;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
}

export interface AgentAction {
  id: string;
  timestamp: string;
  agentId: AgentRole;
  actionType: string;
  input: string;
  output: string;
  classification: MAIClassification;
  humanReviewStatus: 'N/A' | 'PENDING' | 'APPROVED' | 'REJECTED';
  reviewerId?: string;
  reviewerRole?: UserRole;
  escalationTrigger: string; 
  duration: number;
  status: 'SUCCESS' | 'FAILURE';
}

export interface AgentState {
  role: AgentRole;
  status: AgentStatus;
  progress: number;
  output?: any;
  lastAction?: string;
}

export interface WorkforceState {
  template: WorkforceType;
  agents: Record<AgentRole, AgentState>;
  currentStep: number;
  logs: AgentAction[];
  activityFeed: ActivityLog[];
  isProcessing: boolean;
  humanActionRequired: boolean;
  requiredActionType?: MAIClassification;
  activeCheckpointAgent?: AgentRole;
}

export interface FileMetadata {
  name: string;
  size: number;
  type: string;
  lastModified: number;
}

// Browser Agent Types
export enum BrowserAgentStatus {
  INITIALIZING = 'INITIALIZING',
  READY = 'READY',
  NAVIGATING = 'NAVIGATING',
  WORKING = 'WORKING',
  AWAITING_APPROVAL = 'AWAITING_APPROVAL',
  COMPLETE = 'COMPLETE',
  ERROR = 'ERROR'
}

export interface BrowserAgentState {
  id: string;
  task: string;
  status: BrowserAgentStatus;
  classification: MAIClassification;
  currentAction?: string;
  screenshot?: string;
  progress: number;
  logs: string[];
}
