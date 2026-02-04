/**
 * Database Types
 *
 * TypeScript interfaces matching the PostgreSQL schema.
 * These are the persistence layer types - application layer uses maiRuntime.ts types.
 */

// =============================================================================
// CORE ENTITIES
// =============================================================================

export interface DbTenant {
  id: string;
  name: string;
  slug: string;
  settings: Record<string, any>;
  created_at: Date;
  updated_at: Date;
  is_active: boolean;
}

export interface DbOperator {
  id: string;
  tenant_id: string;
  external_id?: string;
  email?: string;
  display_name: string;
  role: string;
  permissions: string[];
  created_at: Date;
  updated_at: Date;
  last_login_at?: Date;
  is_active: boolean;
}

export interface DbSession {
  id: string;
  tenant_id: string;
  operator_id: string;
  started_at: Date;
  ended_at?: Date;
  ip_address?: string;
  user_agent?: string;
  metadata: Record<string, any>;
  is_active: boolean;
}

// =============================================================================
// AUDIT LOG
// =============================================================================

export interface DbAuditLogEntry {
  id: string;
  tenant_id: string;
  sequence_num: number;

  // Event identification
  timestamp: Date;
  agent_id: string;
  session_id?: string;

  // Actor
  operator_id: string;
  operator_role?: string;

  // Event details
  action: string;
  target?: string;
  url?: string;
  domain?: string;

  // Classification
  classification: string;
  policy_decision: string;
  policy_rule_id?: string;

  // Approval
  approved?: boolean;
  approver_id?: string;
  approval_timestamp?: Date;
  attestation?: string;

  // Context
  reasoning?: string;
  context: Record<string, any>;
  screenshot_path?: string;

  // Integrity
  content_hash: string;
  previous_hash?: string;

  created_at: Date;
}

/**
 * Input type for creating audit log entries
 * (excludes auto-generated fields)
 */
export interface CreateAuditLogEntry {
  tenant_id: string;
  agent_id: string;
  session_id?: string;
  operator_id: string;
  operator_role?: string;
  action: string;
  target?: string;
  url?: string;
  domain?: string;
  classification: string;
  policy_decision: string;
  policy_rule_id?: string;
  approved?: boolean;
  approver_id?: string;
  attestation?: string;
  reasoning?: string;
  context?: Record<string, any>;
  screenshot_path?: string;
}

// =============================================================================
// EVIDENCE PACKS
// =============================================================================

export interface DbEvidencePack {
  id: string;
  tenant_id: string;
  execution_id: string;
  playbook_id: string;
  playbook_version?: string;
  agent_id: string;
  operator_id: string;
  session_id?: string;
  started_at: Date;
  ended_at?: Date;
  duration_ms?: number;
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  report_summary?: string;
  report_findings: string[];
  report_recommendations: string[];
  completeness_score?: number;
  pack_hash?: string;
  signature?: string;
  metadata: Record<string, any>;
  created_at: Date;
}

export interface DbEvidencePackTimeline {
  id: string;
  evidence_pack_id: string;
  step_id: string;
  step_name: string;
  step_order: number;
  timestamp: Date;
  duration_ms?: number;
  status: 'completed' | 'failed' | 'skipped';
  screenshot_path?: string;
  error_message?: string;
  metadata: Record<string, any>;
}

export interface DbEvidencePackArtifact {
  id: string;
  evidence_pack_id: string;
  artifact_type: 'document' | 'data' | 'screenshot' | 'report';
  filename: string;
  file_path?: string;
  file_size?: number;
  mime_type?: string;
  source: string;
  source_url?: string;
  extracted_at: Date;
  content_hash: string;
  metadata: Record<string, any>;
}

export interface DbEvidencePackDecision {
  id: string;
  evidence_pack_id: string;
  step_id: string;
  decision: string;
  reasoning?: string;
  confidence?: number;
  timestamp: Date;
  metadata: Record<string, any>;
}

export interface DbEvidencePackApproval {
  id: string;
  evidence_pack_id: string;
  step_id: string;
  action: string;
  approved: boolean;
  approver_id: string;
  timestamp: Date;
  attestation?: string;
  metadata: Record<string, any>;
}

// =============================================================================
// BD OPPORTUNITIES
// =============================================================================

export interface DbOpportunity {
  id: string;
  tenant_id: string;
  rfp_number: string;
  title: string;
  agency?: string;
  sub_agency?: string;
  description?: string;
  estimated_value?: number;
  naics_codes?: string;
  set_aside_type?: string;
  posted_date?: Date;
  response_deadline?: Date;
  status: 'new' | 'qualifying' | 'qualified' | 'no_bid' | 'bid' | 'won' | 'lost';
  bid_decision?: 'STRONG_BID' | 'BID' | 'QUALIFIED_NO_BID' | 'NO_BID';
  win_probability?: number;
  assigned_to?: string;
  teaming_required?: boolean;
  competitor_count?: number;
  sam_gov_url?: string;
  source_data: Record<string, any>;
  created_at: Date;
  updated_at: Date;
  qualified_at?: Date;
  decision_at?: Date;
}

// =============================================================================
// QUERY OPTIONS
// =============================================================================

export interface AuditLogQueryOptions {
  tenant_id: string;
  start_date?: Date;
  end_date?: Date;
  operator_id?: string;
  action?: string;
  classification?: string;
  session_id?: string;
  limit?: number;
  offset?: number;
  order?: 'asc' | 'desc';
}

export interface EvidencePackQueryOptions {
  tenant_id: string;
  playbook_id?: string;
  operator_id?: string;
  status?: string;
  start_date?: Date;
  end_date?: Date;
  limit?: number;
  offset?: number;
}

export interface OpportunityQueryOptions {
  tenant_id: string;
  status?: string;
  bid_decision?: string;
  assigned_to?: string;
  min_value?: number;
  max_value?: number;
  deadline_before?: Date;
  limit?: number;
  offset?: number;
}

// =============================================================================
// INTEGRITY VERIFICATION
// =============================================================================

export interface ChainVerificationResult {
  valid: boolean;
  entries_checked: number;
  first_invalid_sequence?: number;
  error?: string;
}
