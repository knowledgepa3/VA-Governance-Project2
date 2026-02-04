/**
 * CERTIFICATION AUTOMATION v1.0.0
 *
 * Automated workflows for achieving Level 2 (TESTED) and Level 3 (CERTIFIED).
 *
 * Level 2 Requirements:
 * - Demo mode executions (3+ successful runs)
 * - Escalation trigger testing
 * - Human approval flow verification
 * - Evidence bundle generation
 * - Error recovery testing
 *
 * Level 3 Requirements:
 * - Human reviewer sign-off
 * - Mission alignment verification
 * - Risk assessment completion
 * - Compliance mapping review
 * - Documentation completeness
 */

import * as crypto from 'crypto';
import {
  CertificationLevel,
  CertificationRecord,
  CriterionResult,
  CERTIFICATION_CRITERIA,
  CERTIFICATION_LEVEL_NAMES,
  calculateCertificationLevel
} from './PackCertificationSchema';

// =============================================================================
// TEST EXECUTION TRACKING
// =============================================================================

export interface TestExecution {
  execution_id: string;
  pack_id: string;
  pack_version: string;
  pack_hash: string;

  // Execution details
  environment: 'DEMO' | 'STAGING' | 'PRODUCTION';
  started_at: string;
  completed_at: string;
  duration_ms: number;

  // Results
  status: 'SUCCESS' | 'FAILED' | 'ESCALATED' | 'ABORTED';
  actions_executed: number;
  actions_successful: number;
  actions_failed: number;

  // Evidence
  evidence_bundle_id?: string;
  evidence_sealed: boolean;

  // Escalations
  escalations_triggered: {
    trigger_id: string;
    severity: string;
    action_taken: string;
    timestamp: string;
  }[];

  // Human approvals
  human_approvals: {
    action: string;
    approved: boolean;
    approved_by?: string;
    timestamp: string;
  }[];

  // Error recovery
  errors_encountered: {
    step_id: string;
    error: string;
    recovered: boolean;
    recovery_action?: string;
  }[];
}

export interface TestSuite {
  suite_id: string;
  pack_id: string;
  pack_hash: string;
  created_at: string;

  // Executions
  executions: TestExecution[];

  // Aggregated metrics
  total_executions: number;
  successful_executions: number;
  failed_executions: number;
  escalation_tests_passed: boolean;
  approval_flow_tested: boolean;
  error_recovery_tested: boolean;

  // Level 2 readiness
  level_2_ready: boolean;
  level_2_blockers: string[];
}

// =============================================================================
// LEVEL 2 AUTOMATION
// =============================================================================

/**
 * Create a new test suite for Level 2 certification
 */
export function createTestSuite(packId: string, packHash: string): TestSuite {
  return {
    suite_id: `SUITE-${packId}-${Date.now()}`,
    pack_id: packId,
    pack_hash: packHash,
    created_at: new Date().toISOString(),
    executions: [],
    total_executions: 0,
    successful_executions: 0,
    failed_executions: 0,
    escalation_tests_passed: false,
    approval_flow_tested: false,
    error_recovery_tested: false,
    level_2_ready: false,
    level_2_blockers: []
  };
}

/**
 * Record a test execution
 */
export function recordTestExecution(
  suite: TestSuite,
  execution: TestExecution
): TestSuite {
  suite.executions.push(execution);
  suite.total_executions++;

  if (execution.status === 'SUCCESS') {
    suite.successful_executions++;
  } else {
    suite.failed_executions++;
  }

  // Check escalation testing
  if (execution.escalations_triggered.length > 0) {
    suite.escalation_tests_passed = true;
  }

  // Check approval flow testing
  if (execution.human_approvals.length > 0) {
    suite.approval_flow_tested = true;
  }

  // Check error recovery testing
  const recoveredErrors = execution.errors_encountered.filter(e => e.recovered);
  if (recoveredErrors.length > 0) {
    suite.error_recovery_tested = true;
  }

  // Evaluate Level 2 readiness
  suite.level_2_blockers = [];

  if (suite.successful_executions < 3) {
    suite.level_2_blockers.push(`Need ${3 - suite.successful_executions} more successful demo executions`);
  }

  if (!suite.escalation_tests_passed) {
    suite.level_2_blockers.push('No escalation triggers have been tested');
  }

  if (!suite.approval_flow_tested) {
    suite.level_2_blockers.push('Human approval flow has not been tested');
  }

  // Check if any execution produced a sealed bundle
  const sealedBundles = suite.executions.filter(e => e.evidence_sealed);
  if (sealedBundles.length === 0) {
    suite.level_2_blockers.push('No sealed evidence bundle has been generated');
  }

  suite.level_2_ready = suite.level_2_blockers.length === 0;

  return suite;
}

/**
 * Generate Level 2 criteria results from test suite
 */
export function generateLevel2Results(suite: TestSuite): CriterionResult[] {
  const now = new Date().toISOString();
  const results: CriterionResult[] = [];

  // T-001: Demo Mode Execution (3+ successful runs)
  results.push({
    criterion_id: 'T-001',
    passed: suite.successful_executions >= 3,
    evidence: `${suite.successful_executions} successful demo executions`,
    notes: suite.executions.map(e => e.execution_id).join(', '),
    checked_at: now,
    checked_by: 'AUTOMATED'
  });

  // T-002: Escalation Tested
  results.push({
    criterion_id: 'T-002',
    passed: suite.escalation_tests_passed,
    evidence: suite.escalation_tests_passed
      ? `Escalations triggered: ${suite.executions.flatMap(e => e.escalations_triggered).length}`
      : 'No escalations tested',
    checked_at: now,
    checked_by: 'AUTOMATED'
  });

  // T-003: Human Approval Flow Tested
  results.push({
    criterion_id: 'T-003',
    passed: suite.approval_flow_tested,
    evidence: suite.approval_flow_tested
      ? `Approval flow tested in ${suite.executions.filter(e => e.human_approvals.length > 0).length} executions`
      : 'Approval flow not tested',
    checked_at: now,
    checked_by: 'AUTOMATED'
  });

  // T-004: Evidence Bundle Generated
  const sealedCount = suite.executions.filter(e => e.evidence_sealed).length;
  results.push({
    criterion_id: 'T-004',
    passed: sealedCount > 0,
    evidence: `${sealedCount} sealed evidence bundles generated`,
    checked_at: now,
    checked_by: 'AUTOMATED'
  });

  // T-005: Error Recovery Tested
  results.push({
    criterion_id: 'T-005',
    passed: suite.error_recovery_tested,
    evidence: suite.error_recovery_tested
      ? 'Error recovery successfully tested'
      : 'Error recovery not tested',
    checked_at: now,
    checked_by: 'AUTOMATED'
  });

  // T-006: UI Anchors Verified (check if all executions found expected elements)
  const uiFailures = suite.executions.filter(e =>
    e.errors_encountered.some(err => err.error.includes('element not found'))
  );
  results.push({
    criterion_id: 'T-006',
    passed: uiFailures.length === 0 && suite.successful_executions >= 3,
    evidence: uiFailures.length === 0
      ? 'All UI anchors verified across executions'
      : `${uiFailures.length} executions had UI anchor failures`,
    checked_at: now,
    checked_by: 'AUTOMATED'
  });

  // T-007: No Forbidden Actions Triggered
  const forbiddenAttempts = suite.executions.filter(e =>
    e.errors_encountered.some(err => err.error.includes('forbidden'))
  );
  results.push({
    criterion_id: 'T-007',
    passed: forbiddenAttempts.length === 0,
    evidence: forbiddenAttempts.length === 0
      ? 'No forbidden actions attempted'
      : `${forbiddenAttempts.length} forbidden action attempts detected`,
    checked_at: now,
    checked_by: 'AUTOMATED'
  });

  return results;
}

// =============================================================================
// LEVEL 3 HUMAN REVIEW WORKFLOW
// =============================================================================

export interface HumanReview {
  review_id: string;
  pack_id: string;
  pack_version: string;
  pack_hash: string;

  // Reviewer info
  reviewer_id: string;
  reviewer_name: string;
  reviewer_role: string;
  reviewer_email?: string;

  // Review status
  status: 'PENDING' | 'IN_PROGRESS' | 'APPROVED' | 'REJECTED' | 'NEEDS_CHANGES';
  started_at?: string;
  completed_at?: string;

  // Review checklist
  checklist: {
    item_id: string;
    item_name: string;
    description: string;
    required: boolean;
    checked: boolean;
    notes?: string;
    checked_at?: string;
  }[];

  // Risk assessment
  risk_assessment?: {
    overall_risk: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    mandatory_actions_reviewed: boolean;
    escalation_triggers_adequate: boolean;
    evidence_requirements_sufficient: boolean;
    notes: string;
  };

  // Final decision
  decision?: {
    approved: boolean;
    conditions?: string[];
    rejection_reasons?: string[];
    expiration_date?: string;
  };

  // Signatures
  signature?: {
    signed_at: string;
    signature_hash: string;
    certificate_reference?: string;
  };
}

/**
 * Level 3 Review Checklist Items
 */
export const LEVEL_3_CHECKLIST = [
  {
    item_id: 'C-001',
    item_name: 'Human Review Complete',
    description: 'Pack has been reviewed by a qualified human certifier',
    required: true
  },
  {
    item_id: 'C-002',
    item_name: 'Mission Alignment Verified',
    description: 'Pack mission aligns with intended use case and organizational needs',
    required: true
  },
  {
    item_id: 'C-003',
    item_name: 'Risk Assessment Complete',
    description: 'Risk assessment completed for all mandatory actions',
    required: true
  },
  {
    item_id: 'C-004',
    item_name: 'Compliance Mapping Reviewed',
    description: 'Pack controls mapped to applicable compliance frameworks',
    required: false
  },
  {
    item_id: 'C-005',
    item_name: 'Audit Trail Adequate',
    description: 'Evidence bundle provides sufficient audit trail for compliance needs',
    required: false
  },
  {
    item_id: 'C-006',
    item_name: 'Documentation Complete',
    description: 'Pack has complete documentation including failure modes and recovery procedures',
    required: false
  },
  {
    item_id: 'C-007',
    item_name: 'Forbidden Actions Appropriate',
    description: 'Forbidden actions list is comprehensive and appropriate for use case',
    required: true
  },
  {
    item_id: 'C-008',
    item_name: 'Escalation Triggers Appropriate',
    description: 'Escalation triggers cover all critical scenarios',
    required: true
  },
  {
    item_id: 'C-009',
    item_name: 'MAI Levels Appropriate',
    description: 'MAI level assignments are appropriate for each action',
    required: true
  },
  {
    item_id: 'C-010',
    item_name: 'Test Coverage Adequate',
    description: 'Level 2 test suite provides adequate coverage',
    required: true
  }
];

/**
 * Create a new human review request
 */
export function createHumanReview(
  packId: string,
  packVersion: string,
  packHash: string,
  reviewerId: string,
  reviewerName: string,
  reviewerRole: string
): HumanReview {
  return {
    review_id: `REVIEW-${packId}-${Date.now()}`,
    pack_id: packId,
    pack_version: packVersion,
    pack_hash: packHash,
    reviewer_id: reviewerId,
    reviewer_name: reviewerName,
    reviewer_role: reviewerRole,
    status: 'PENDING',
    checklist: LEVEL_3_CHECKLIST.map(item => ({
      ...item,
      checked: false
    }))
  };
}

/**
 * Start a human review
 */
export function startReview(review: HumanReview): HumanReview {
  return {
    ...review,
    status: 'IN_PROGRESS',
    started_at: new Date().toISOString()
  };
}

/**
 * Check a checklist item
 */
export function checkItem(
  review: HumanReview,
  itemId: string,
  checked: boolean,
  notes?: string
): HumanReview {
  const checklist = review.checklist.map(item => {
    if (item.item_id === itemId) {
      return {
        ...item,
        checked,
        notes,
        checked_at: new Date().toISOString()
      };
    }
    return item;
  });

  return { ...review, checklist };
}

/**
 * Complete risk assessment
 */
export function completeRiskAssessment(
  review: HumanReview,
  assessment: HumanReview['risk_assessment']
): HumanReview {
  return { ...review, risk_assessment: assessment };
}

/**
 * Complete the review with a decision
 */
export function completeReview(
  review: HumanReview,
  approved: boolean,
  conditions?: string[],
  rejectionReasons?: string[],
  expirationDate?: string
): HumanReview {
  const now = new Date().toISOString();

  // Generate signature hash
  const signatureContent = JSON.stringify({
    review_id: review.review_id,
    pack_id: review.pack_id,
    pack_hash: review.pack_hash,
    approved,
    timestamp: now
  });
  const signatureHash = crypto.createHash('sha256').update(signatureContent).digest('hex');

  return {
    ...review,
    status: approved ? 'APPROVED' : 'REJECTED',
    completed_at: now,
    decision: {
      approved,
      conditions,
      rejection_reasons: rejectionReasons,
      expiration_date: expirationDate
    },
    signature: {
      signed_at: now,
      signature_hash: signatureHash
    }
  };
}

/**
 * Generate Level 3 criteria results from human review
 */
export function generateLevel3Results(review: HumanReview): CriterionResult[] {
  const now = new Date().toISOString();
  const results: CriterionResult[] = [];

  // C-001 through C-006 map directly to checklist items
  for (const item of review.checklist) {
    const criterion = CERTIFICATION_CRITERIA.find(c => c.criterion_id === item.item_id);
    if (criterion && criterion.required_for_level === CertificationLevel.CERTIFIED) {
      results.push({
        criterion_id: item.item_id,
        passed: item.checked,
        evidence: item.notes || (item.checked ? 'Verified by reviewer' : 'Not verified'),
        checked_at: item.checked_at || now,
        checked_by: review.reviewer_name
      });
    }
  }

  return results;
}

/**
 * Check if review is complete and ready for Level 3
 */
export function isReviewComplete(review: HumanReview): {
  complete: boolean;
  blockers: string[];
} {
  const blockers: string[] = [];

  // Check required checklist items
  const requiredItems = review.checklist.filter(item => item.required);
  const uncheckedRequired = requiredItems.filter(item => !item.checked);

  if (uncheckedRequired.length > 0) {
    blockers.push(`${uncheckedRequired.length} required checklist items not completed`);
  }

  // Check risk assessment
  if (!review.risk_assessment) {
    blockers.push('Risk assessment not completed');
  }

  // Check decision
  if (!review.decision) {
    blockers.push('Review decision not recorded');
  }

  // Check signature
  if (!review.signature) {
    blockers.push('Review not signed');
  }

  return {
    complete: blockers.length === 0,
    blockers
  };
}

// =============================================================================
// CERTIFICATION UPGRADE WORKFLOW
// =============================================================================

/**
 * Upgrade certification record with test suite results (Level 1 → Level 2)
 */
export function upgradeToLevel2(
  record: CertificationRecord,
  suite: TestSuite
): CertificationRecord {
  if (!suite.level_2_ready) {
    throw new Error(`Cannot upgrade to Level 2: ${suite.level_2_blockers.join(', ')}`);
  }

  const level2Results = generateLevel2Results(suite);
  const now = new Date().toISOString();

  // Merge results
  const existingIds = new Set(record.criteria_results.map(r => r.criterion_id));
  const newResults = level2Results.filter(r => !existingIds.has(r.criterion_id));

  const updatedRecord: CertificationRecord = {
    ...record,
    criteria_results: [...record.criteria_results, ...newResults],
    updated_at: now
  };

  // Recalculate level
  updatedRecord.current_level = calculateCertificationLevel(updatedRecord);

  // Add to history if upgraded
  if (updatedRecord.current_level >= CertificationLevel.TESTED) {
    updatedRecord.certification_history.push({
      level: CertificationLevel.TESTED,
      achieved_at: now,
      certified_by: 'AUTOMATED',
      notes: `Achieved via test suite ${suite.suite_id}`
    });
  }

  return updatedRecord;
}

/**
 * Upgrade certification record with human review (Level 2 → Level 3)
 */
export function upgradeToLevel3(
  record: CertificationRecord,
  review: HumanReview
): CertificationRecord {
  const reviewStatus = isReviewComplete(review);
  if (!reviewStatus.complete) {
    throw new Error(`Cannot upgrade to Level 3: ${reviewStatus.blockers.join(', ')}`);
  }

  if (!review.decision?.approved) {
    throw new Error('Cannot upgrade to Level 3: Review was not approved');
  }

  const level3Results = generateLevel3Results(review);
  const now = new Date().toISOString();

  // Merge results
  const existingIds = new Set(record.criteria_results.map(r => r.criterion_id));
  const newResults = level3Results.filter(r => !existingIds.has(r.criterion_id));

  const updatedRecord: CertificationRecord = {
    ...record,
    criteria_results: [...record.criteria_results, ...newResults],
    updated_at: now
  };

  // Recalculate level
  updatedRecord.current_level = calculateCertificationLevel(updatedRecord);

  // Add to history if upgraded
  if (updatedRecord.current_level >= CertificationLevel.CERTIFIED) {
    updatedRecord.certification_history.push({
      level: CertificationLevel.CERTIFIED,
      achieved_at: now,
      certified_by: review.reviewer_name,
      notes: `Certified via review ${review.review_id}`
    });
  }

  return updatedRecord;
}

// =============================================================================
// SUMMARY FUNCTIONS
// =============================================================================

/**
 * Generate test suite summary
 */
export function testSuiteSummary(suite: TestSuite): string {
  const statusIcon = suite.level_2_ready ? '✅' : '⚠️';

  return `
╔═══════════════════════════════════════════════════════════════╗
║                     TEST SUITE SUMMARY                        ║
╠═══════════════════════════════════════════════════════════════╣
║  Suite ID:    ${suite.suite_id.substring(0, 40).padEnd(47)}║
║  Pack:        ${suite.pack_id.padEnd(47)}║
║  Status:      ${statusIcon} ${suite.level_2_ready ? 'READY FOR LEVEL 2' : 'NOT READY'.padEnd(42)}║
╠═══════════════════════════════════════════════════════════════╣
║  EXECUTION METRICS                                            ║
║    Total Runs:      ${suite.total_executions.toString().padEnd(42)}║
║    Successful:      ${suite.successful_executions.toString().padEnd(42)}║
║    Failed:          ${suite.failed_executions.toString().padEnd(42)}║
╠═══════════════════════════════════════════════════════════════╣
║  TEST COVERAGE                                                ║
║    Escalations:     ${(suite.escalation_tests_passed ? '✓ Tested' : '○ Not tested').padEnd(42)}║
║    Approval Flow:   ${(suite.approval_flow_tested ? '✓ Tested' : '○ Not tested').padEnd(42)}║
║    Error Recovery:  ${(suite.error_recovery_tested ? '✓ Tested' : '○ Not tested').padEnd(42)}║
╚═══════════════════════════════════════════════════════════════╝
${suite.level_2_blockers.length > 0 ? '\nBLOCKERS:\n' + suite.level_2_blockers.map(b => `  ✗ ${b}`).join('\n') : ''}
`.trim();
}

/**
 * Generate human review summary
 */
export function humanReviewSummary(review: HumanReview): string {
  const statusIcon = review.status === 'APPROVED' ? '✅' :
                     review.status === 'REJECTED' ? '❌' :
                     review.status === 'IN_PROGRESS' ? '🔄' : '⏳';

  const checkedCount = review.checklist.filter(i => i.checked).length;
  const requiredChecked = review.checklist.filter(i => i.required && i.checked).length;
  const requiredTotal = review.checklist.filter(i => i.required).length;

  return `
╔═══════════════════════════════════════════════════════════════╗
║                    HUMAN REVIEW SUMMARY                       ║
╠═══════════════════════════════════════════════════════════════╣
║  Review ID:   ${review.review_id.substring(0, 40).padEnd(47)}║
║  Pack:        ${review.pack_id.padEnd(47)}║
║  Reviewer:    ${review.reviewer_name.padEnd(47)}║
║  Status:      ${statusIcon} ${review.status.padEnd(44)}║
╠═══════════════════════════════════════════════════════════════╣
║  CHECKLIST PROGRESS                                           ║
║    Total Items:     ${review.checklist.length.toString().padEnd(42)}║
║    Checked:         ${checkedCount.toString().padEnd(42)}║
║    Required:        ${`${requiredChecked}/${requiredTotal}`.padEnd(42)}║
╠═══════════════════════════════════════════════════════════════╣
║  RISK ASSESSMENT                                              ║
║    Completed:       ${(review.risk_assessment ? '✓ Yes' : '○ No').padEnd(42)}║
${review.risk_assessment ? `║    Risk Level:      ${review.risk_assessment.overall_risk.padEnd(42)}║` : ''}
╚═══════════════════════════════════════════════════════════════╝
`.trim();
}

export default {
  // Test Suite
  createTestSuite,
  recordTestExecution,
  generateLevel2Results,
  testSuiteSummary,

  // Human Review
  LEVEL_3_CHECKLIST,
  createHumanReview,
  startReview,
  checkItem,
  completeRiskAssessment,
  completeReview,
  generateLevel3Results,
  isReviewComplete,
  humanReviewSummary,

  // Upgrade Workflows
  upgradeToLevel2,
  upgradeToLevel3
};
