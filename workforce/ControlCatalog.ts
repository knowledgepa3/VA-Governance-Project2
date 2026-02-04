/**
 * ACE Governance Platform - Control Catalog
 *
 * FedRAMP/NIST 800-53 Style Control Definitions
 * Ready for SSP (System Security Plan) documentation
 *
 * Control enforcement is architectural: the workflow state machine prevents
 * continuation until the gate is approved via dual key (human + system),
 * independent of the agent UI.
 */

// ============================================================================
// CONTROL STATEMENT FORMAT
// ============================================================================

export interface ControlStatement {
  controlId: string;
  controlFamily: string;
  controlTitle: string;

  objective: string;

  implementation: {
    description: string;
    mechanism: string;
    enforcement: 'ARCHITECTURAL' | 'PROCEDURAL' | 'MONITORING';
  };

  evidence: {
    artifacts: string[];
    retention: string;
    integrity: string;
  };

  testProcedure: {
    method: string;
    steps: string[];
    expectedResult: string;
    automatable: boolean;
  };

  acceptanceCriteria: string[];

  relatedControls?: string[];
  nisMapping?: string[];
}

// ============================================================================
// ACE-AUTH-001: AUTHENTICATION GATE
// ============================================================================

export const ACE_AUTH_001: ControlStatement = {
  controlId: 'ACE-AUTH-001',
  controlFamily: 'Authentication & Access Control',
  controlTitle: 'Agent Authentication Gate',

  objective: 'Prevent any agent exposure to credentials and preserve MFA as a human-only control.',

  implementation: {
    description: 'Authentication is a MANDATORY gate requiring dual-key approval before agent workflow continuation. The agent halts at login boundaries; human completes authentication directly in the browser UI.',
    mechanism: 'Two-key gate: Key A (Human confirms in Governance Console) + Key B (System verifies 2-of-3 AUTH_COMPLETE signals). Gate approval requires BOTH keys.',
    enforcement: 'ARCHITECTURAL'
  },

  evidence: {
    artifacts: [
      'Gate creation event with pack provenance',
      'Human key approval timestamp and operator ID',
      'System key signal verification records',
      'Session binding record linking session to human identity',
      'Hash-chained audit log entries'
    ],
    retention: '7 years per FedRAMP requirement',
    integrity: 'SHA-256 hash chain with stable JSON serialization'
  },

  testProcedure: {
    method: 'Automated + Manual Verification',
    steps: [
      '1. Initiate agent workflow requiring authentication',
      '2. Verify agent halts at authentication boundary',
      '3. Verify gate status is PENDING',
      '4. Complete human authentication in browser',
      '5. Verify system signals are detected and validated',
      '6. Confirm human key via Governance Console',
      '7. Verify gate transitions to APPROVED only when both keys satisfied',
      '8. Verify session binding record is created',
      '9. Export audit log and verify hash chain integrity'
    ],
    expectedResult: 'Agent cannot proceed without dual-key approval; all events logged with tamper-evident integrity.',
    automatable: true
  },

  acceptanceCriteria: [
    'Agent CANNOT access credential entry fields',
    'Agent CANNOT proceed until gate is APPROVED',
    'Gate requires BOTH human AND system key approval',
    'System key requires 2-of-3 validated signals',
    'All gate events are hash-chained in audit log',
    'Session binding links session to human identity'
  ],

  relatedControls: ['ACE-AUTH-002', 'ACE-AUTH-003', 'ACE-AUDIT-001'],
  nisMapping: ['IA-2', 'IA-5', 'AC-2', 'AU-2']
};

// ============================================================================
// ACE-AUTH-002: METADATA-ONLY PROBE
// ============================================================================

export const ACE_AUTH_002: ControlStatement = {
  controlId: 'ACE-AUTH-002',
  controlFamily: 'Authentication & Access Control',
  controlTitle: 'Authenticated Request Signal (Metadata-Only Probe)',

  objective: 'Verify authentication completion without introducing data leakage vectors through probe requests.',

  implementation: {
    description: 'Probe endpoints are pre-approved, read-only, non-sensitive, and in-scope. Logs store ONLY endpoint alias + HTTP status code. No response body, headers, or tokens are captured.',
    mechanism: 'Whitelist of AuthProbeEndpoint definitions with enforced constraints: isSensitive=false, isReadOnly=true, inScope=true. Probe execution captures only status metadata.',
    enforcement: 'ARCHITECTURAL'
  },

  evidence: {
    artifacts: [
      'Probe endpoint whitelist in pack configuration',
      'Probe execution log with alias + status only',
      'Validation record showing probe constraints satisfied'
    ],
    retention: '7 years per FedRAMP requirement',
    integrity: 'Included in hash-chained audit log'
  },

  testProcedure: {
    method: 'Automated Test',
    steps: [
      '1. Configure pack with approved probe endpoints',
      '2. Trigger authentication gate',
      '3. Execute probe after authentication',
      '4. Verify probe is from approved whitelist',
      '5. Verify only alias + status code are logged',
      '6. Attempt to log response body - verify failure',
      '7. Verify probe validation flags in audit entry'
    ],
    expectedResult: 'Probe list is whitelisted; probe captures only status; any attempt to log response content fails policy checks.',
    automatable: true
  },

  acceptanceCriteria: [
    'Probe endpoints are pre-approved in pack configuration',
    'Probes are read-only (GET requests only)',
    'Probes do not access sensitive data',
    'Probes are in-scope (within allowed_domains)',
    'Log contains ONLY alias + HTTP status code',
    'Response body is NEVER captured or logged',
    'Response headers are NEVER captured or logged',
    'Tokens/cookies are NEVER captured or logged'
  ],

  relatedControls: ['ACE-AUTH-001', 'ACE-DATA-001'],
  nisMapping: ['SC-8', 'SI-12', 'AU-3']
};

// ============================================================================
// ACE-AUTH-003: DOMAIN REDIRECT VALIDATION
// ============================================================================

export const ACE_AUTH_003: ControlStatement = {
  controlId: 'ACE-AUTH-003',
  controlFamily: 'Authentication & Access Control',
  controlTitle: 'Domain Redirect Signal (Precise In-Scope Definition)',

  objective: 'Eliminate false-positive authentication signals from SSO callbacks and intermediary redirects.',

  implementation: {
    description: 'Redirect success requires: host IN allowed scope, host NOT IN login domains, path NOT matching login patterns (/login, /sso, /oauth, /signin, /callback, etc.).',
    mechanism: 'Three-part validation: hostInAllowedScope AND hostNotInLoginDomains AND pathNotLoginPattern. All three must be TRUE for valid redirect signal.',
    enforcement: 'ARCHITECTURAL'
  },

  evidence: {
    artifacts: [
      'Redirect event with full validation results',
      'Allowed domains list from pack configuration',
      'Known login domains list (system constant)',
      'Login path patterns list (system constant)'
    ],
    retention: '7 years per FedRAMP requirement',
    integrity: 'Included in hash-chained audit log'
  },

  testProcedure: {
    method: 'Automated Test',
    steps: [
      '1. Configure pack with allowed domains',
      '2. Simulate redirect to allowed domain with non-login path',
      '3. Verify redirect signal is VALID',
      '4. Simulate redirect to login domain (login.gov)',
      '5. Verify redirect signal is INVALID',
      '6. Simulate redirect to allowed domain with /login path',
      '7. Verify redirect signal is INVALID',
      '8. Verify all validation details in audit log'
    ],
    expectedResult: 'Redirect signal only counts when host+path satisfy ALL THREE rules; login/callback paths NEVER satisfy success.',
    automatable: true
  },

  acceptanceCriteria: [
    'Redirect host MUST be in allowed_domains',
    'Redirect host MUST NOT be a known login domain',
    'Redirect path MUST NOT match login patterns',
    'SSO callback URLs (/callback, /oauth) are REJECTED',
    'Intermediary redirects (login.gov → target) are REJECTED until final destination',
    'All three validation results are logged',
    'isValidRedirect requires ALL THREE checks passing'
  ],

  relatedControls: ['ACE-AUTH-001'],
  nisMapping: ['IA-2', 'SC-23']
};

// ============================================================================
// ACE-CONFIG-001: PACK HASH DRIFT
// ============================================================================

export const ACE_CONFIG_001: ControlStatement = {
  controlId: 'ACE-CONFIG-001',
  controlFamily: 'Configuration Management',
  controlTitle: 'Pack Hash Drift Detection (Auto-Invalidate Pending Gate)',

  objective: 'Prevent policy bypass through configuration changes during pending authentication gates.',

  implementation: {
    description: 'If pack_hash changes while gate is PENDING, gate automatically resets and requires re-approval (both human and system keys). Ensures "policy swapped mid-gate" bypass is impossible.',
    mechanism: 'packHashAtCreation snapshot stored at gate creation. Any mismatch with current pack_hash triggers INVALIDATED_PACK_CHANGE status.',
    enforcement: 'ARCHITECTURAL'
  },

  evidence: {
    artifacts: [
      'Pack hash at gate creation (packHashAtCreation)',
      'Current pack hash at validation time',
      'INVALIDATED_PACK_CHANGE event in audit log',
      'packHashMismatch flag in audit entry'
    ],
    retention: '7 years per FedRAMP requirement',
    integrity: 'Included in hash-chained audit log'
  },

  testProcedure: {
    method: 'Automated Test',
    steps: [
      '1. Create authentication gate with pack_hash A',
      '2. Verify packHashAtCreation = A',
      '3. Modify pack configuration (hash changes to B)',
      '4. Call checkPackHashChange()',
      '5. Verify gate status = INVALIDATED_PACK_CHANGE',
      '6. Verify gate is removed from active gates',
      '7. Verify INVALIDATED_PACK_CHANGE event in audit log',
      '8. Verify securityRelevant = true for this event'
    ],
    expectedResult: 'Any pending gate transitions to INVALIDATED_PACK_CHANGE on pack hash change; audit logs show invalidation event with security flag.',
    automatable: true
  },

  acceptanceCriteria: [
    'Pack hash is captured at gate creation',
    'Pack hash is validated before any signal processing',
    'Hash mismatch triggers automatic gate invalidation',
    'Invalidated gates require full re-initiation',
    'INVALIDATED_PACK_CHANGE is flagged as security-relevant',
    'Audit log includes both original and current pack hash',
    'No partial approvals survive pack hash change'
  ],

  relatedControls: ['ACE-AUTH-001', 'ACE-AUDIT-001'],
  nisMapping: ['CM-3', 'CM-5', 'CM-6']
};

// ============================================================================
// ACE-AUDIT-001: SESSION BINDING
// ============================================================================

export const ACE_AUDIT_001: ControlStatement = {
  controlId: 'ACE-AUDIT-001',
  controlFamily: 'Audit & Accountability',
  controlTitle: 'Session Binding (Identity Narrative Control)',

  objective: 'Support "session belongs to a human identity" audit narrative without capturing credentials.',

  implementation: {
    description: 'Adds an informational record linking session establishment to human actor, workstation/profile, and verification signals used. No credential artifacts are stored.',
    mechanism: 'SessionBinding record created on gate approval containing: humanActor (operatorId, localUsername, chromeProfileId), workstationId, establishmentSignals summary, linkedAuthGateId.',
    enforcement: 'ARCHITECTURAL'
  },

  evidence: {
    artifacts: [
      'SessionBinding record with unique ID',
      'Human actor identification',
      'Workstation/profile context',
      'Signal summary (which signals verified session)',
      'Linked authentication gate ID'
    ],
    retention: '7 years per FedRAMP requirement',
    integrity: 'Binding ID referenced in hash-chained audit log'
  },

  testProcedure: {
    method: 'Automated Test',
    steps: [
      '1. Complete full authentication gate approval',
      '2. Verify SessionBinding record is created',
      '3. Verify binding includes humanActor identification',
      '4. Verify binding includes workstation context',
      '5. Verify binding includes signal summary',
      '6. Verify binding references gate ID',
      '7. Verify NO credentials, tokens, or cookies in binding',
      '8. Verify binding ID appears in audit log entry'
    ],
    expectedResult: 'Session binding entry includes actor + workstation/profile + signal summary; NO credential artifacts stored.',
    automatable: true
  },

  acceptanceCriteria: [
    'SessionBinding created on successful gate approval',
    'Binding includes human actor identification',
    'Binding includes workstation/profile context',
    'Binding includes which signals established session',
    'Binding references originating auth gate',
    'NO credentials stored in binding',
    'NO tokens stored in binding',
    'NO cookies stored in binding',
    'Binding ID traceable in audit log'
  ],

  relatedControls: ['ACE-AUTH-001', 'ACE-AUDIT-002'],
  nisMapping: ['AU-2', 'AU-3', 'AU-6', 'AU-12']
};

// ============================================================================
// ACE-AUDIT-002: TIMEOUT AS SECURITY EVENT
// ============================================================================

export const ACE_AUDIT_002: ControlStatement = {
  controlId: 'ACE-AUDIT-002',
  controlFamily: 'Audit & Accountability',
  controlTitle: 'Timeout as Security-Relevant Control Failure',

  objective: 'Demonstrate control completion monitoring and prevent dangling authentication windows.',

  implementation: {
    description: 'Timeout is pack-configurable with a safe system default (5 minutes). TIMEOUT events are logged as security-relevant. Gate resets on timeout.',
    mechanism: 'Timeout configuration at gate creation. Timer monitored via checkTimeout(). TIMEOUT status triggers security-relevant audit entry and gate removal.',
    enforcement: 'ARCHITECTURAL'
  },

  evidence: {
    artifacts: [
      'Timeout configuration (pack or system default)',
      'TIMEOUT event in audit log',
      'securityRelevant = true flag',
      'timedOutAt timestamp',
      'Gate duration at timeout'
    ],
    retention: '7 years per FedRAMP requirement',
    integrity: 'Included in hash-chained audit log'
  },

  testProcedure: {
    method: 'Automated Test',
    steps: [
      '1. Create gate with short timeout (e.g., 100ms for testing)',
      '2. Do NOT complete authentication',
      '3. Wait for timeout to elapse',
      '4. Call checkTimeout()',
      '5. Verify gate status = TIMEOUT',
      '6. Verify gate is removed from active gates',
      '7. Verify TIMEOUT event in audit log',
      '8. Verify securityRelevant = true',
      '9. Verify timedOutAt timestamp is recorded'
    ],
    expectedResult: 'Gates do not stay pending beyond timeout; TIMEOUT entries appear in logs with provenance, context, and security-relevant flag.',
    automatable: true
  },

  acceptanceCriteria: [
    'Timeout is configurable per pack',
    'System default timeout is safe value (5 minutes)',
    'Gates automatically expire at timeout',
    'TIMEOUT is flagged as security-relevant event',
    'Timed-out gates require full re-initiation',
    'No dangling/indefinite pending gates possible',
    'Timeout event includes gate duration',
    'Timeout event includes pack provenance'
  ],

  relatedControls: ['ACE-AUTH-001', 'ACE-AUDIT-001'],
  nisMapping: ['AU-2', 'AU-12', 'SC-10']
};

// ============================================================================
// CONTROL CATALOG
// ============================================================================

export const CONTROL_CATALOG: ControlStatement[] = [
  ACE_AUTH_001,
  ACE_AUTH_002,
  ACE_AUTH_003,
  ACE_CONFIG_001,
  ACE_AUDIT_001,
  ACE_AUDIT_002
];

// ============================================================================
// CONTROL CATALOG SUMMARY TABLE
// ============================================================================

export interface ControlSummaryRow {
  controlId: string;
  title: string;
  whatChanged: string;
  whyAuditorsCare: string;
  acceptanceCriteria: string;
}

export const CONTROL_SUMMARY_TABLE: ControlSummaryRow[] = [
  {
    controlId: 'ACE-AUTH-002',
    title: 'Authenticated Request (Metadata-Only Probe)',
    whatChanged: 'Probe endpoints are pre-approved, read-only, non-sensitive, and in-scope. Logs store ONLY endpoint alias + HTTP status (no body, no headers, no tokens).',
    whyAuditorsCare: 'Prevents "exfiltration via probes" and ensures verification does not introduce new data leakage.',
    acceptanceCriteria: 'Probe list is whitelisted; probe captures only status; any attempt to log response content fails policy checks.'
  },
  {
    controlId: 'ACE-AUTH-003',
    title: 'Domain Redirect (Precise In-Scope Definition)',
    whatChanged: '"Redirect success" requires: host IN allowed scope, host NOT IN login domains, path NOT matching login patterns (/login, /sso, /oauth, /signin, etc.).',
    whyAuditorsCare: 'Eliminates false positives (SSO callbacks / intermediary redirects) that could incorrectly mark auth as complete.',
    acceptanceCriteria: 'Redirect signal only counts when host+path satisfy ALL THREE rules; login/callback paths NEVER satisfy success.'
  },
  {
    controlId: 'ACE-CONFIG-001',
    title: 'Pack Hash Drift (Auto-Invalidate Pending Gate)',
    whatChanged: 'If pack_hash changes while gate is PENDING, gate resets and requires re-approval (human + system).',
    whyAuditorsCare: 'Proves configuration control and prevents "policy swapped mid-gate" bypass.',
    acceptanceCriteria: 'Any pending gate transitions to INVALIDATED_PACK_CHANGE on pack hash change; audit logs show invalidation event.'
  },
  {
    controlId: 'ACE-AUDIT-001',
    title: 'SESSION_BINDING (Identity Narrative Control)',
    whatChanged: 'Adds an informational record linking session establishment to human actor, workstation/profile, and verification signals used.',
    whyAuditorsCare: 'Supports "session belongs to a human identity" narrative without touching credentials.',
    acceptanceCriteria: 'Session binding entry includes actor + workstation/profile + signal summary; NO credential artifacts stored.'
  },
  {
    controlId: 'ACE-AUDIT-002',
    title: 'TIMEOUT (Security-Relevant Control Failure)',
    whatChanged: 'Timeout is pack-configurable (default safe value). TIMEOUT events are logged as security-relevant and gate resets.',
    whyAuditorsCare: 'Demonstrates control completion monitoring and prevents "dangling auth windows" risk.',
    acceptanceCriteria: 'Gates do not stay pending beyond timeout; TIMEOUT entries appear in logs with provenance and context.'
  }
];

// ============================================================================
// ARCHITECTURAL ENFORCEMENT STATEMENT
// ============================================================================

export const ARCHITECTURAL_ENFORCEMENT_STATEMENT = `
Control enforcement is architectural: the workflow state machine prevents
continuation until the gate is approved via dual key (human + system),
independent of the agent UI.

This means:
1. Controls are NOT "we told the agent to behave"
2. Controls are enforced by the system architecture itself
3. Agent cannot bypass controls through prompt manipulation
4. Gate state machine requires explicit state transitions
5. Audit log provides cryptographic proof of control execution
`;

// ============================================================================
// NIST 800-53 MAPPING
// ============================================================================

export const NIST_MAPPING: Record<string, { control: string; description: string; aceControls: string[] }> = {
  'IA-2': {
    control: 'Identification and Authentication (Organizational Users)',
    description: 'Uniquely identify and authenticate organizational users',
    aceControls: ['ACE-AUTH-001', 'ACE-AUTH-003']
  },
  'IA-5': {
    control: 'Authenticator Management',
    description: 'Manage system authenticators',
    aceControls: ['ACE-AUTH-001']
  },
  'AC-2': {
    control: 'Account Management',
    description: 'Manage system accounts',
    aceControls: ['ACE-AUTH-001']
  },
  'AU-2': {
    control: 'Audit Events',
    description: 'Determine events to be audited',
    aceControls: ['ACE-AUTH-002', 'ACE-AUDIT-001', 'ACE-AUDIT-002']
  },
  'AU-3': {
    control: 'Content of Audit Records',
    description: 'Audit records contain required information',
    aceControls: ['ACE-AUTH-002', 'ACE-AUDIT-001']
  },
  'AU-6': {
    control: 'Audit Review, Analysis, and Reporting',
    description: 'Review and analyze audit records',
    aceControls: ['ACE-AUDIT-001']
  },
  'AU-12': {
    control: 'Audit Generation',
    description: 'Generate audit records',
    aceControls: ['ACE-AUDIT-001', 'ACE-AUDIT-002']
  },
  'CM-3': {
    control: 'Configuration Change Control',
    description: 'Control changes to the system',
    aceControls: ['ACE-CONFIG-001']
  },
  'CM-5': {
    control: 'Access Restrictions for Change',
    description: 'Define and enforce access restrictions for change',
    aceControls: ['ACE-CONFIG-001']
  },
  'CM-6': {
    control: 'Configuration Settings',
    description: 'Establish and document configuration settings',
    aceControls: ['ACE-CONFIG-001']
  },
  'SC-8': {
    control: 'Transmission Confidentiality and Integrity',
    description: 'Protect confidentiality and integrity of transmitted information',
    aceControls: ['ACE-AUTH-002']
  },
  'SC-10': {
    control: 'Network Disconnect',
    description: 'Terminate network connection at end of session or after period of inactivity',
    aceControls: ['ACE-AUDIT-002']
  },
  'SC-23': {
    control: 'Session Authenticity',
    description: 'Protect authenticity of communications sessions',
    aceControls: ['ACE-AUTH-003']
  },
  'SI-12': {
    control: 'Information Handling and Retention',
    description: 'Handle and retain information according to policy',
    aceControls: ['ACE-AUTH-002']
  }
};

// ============================================================================
// EXPORT FUNCTIONS
// ============================================================================

/**
 * Export control catalog as markdown for SSP documentation
 */
export function exportControlCatalogMarkdown(): string {
  let md = '# ACE Governance Platform - Control Catalog\n\n';
  md += '> **Control enforcement is architectural:** the workflow state machine prevents continuation until the gate is approved via dual key (human + system), independent of the agent UI.\n\n';

  md += '## Control Summary\n\n';
  md += '| Control ID | Title | Why Auditors Care | Acceptance Criteria |\n';
  md += '|------------|-------|-------------------|---------------------|\n';

  for (const row of CONTROL_SUMMARY_TABLE) {
    md += `| ${row.controlId} | ${row.title} | ${row.whyAuditorsCare} | ${row.acceptanceCriteria} |\n`;
  }

  md += '\n## Detailed Control Statements\n\n';

  for (const control of CONTROL_CATALOG) {
    md += `### ${control.controlId}: ${control.controlTitle}\n\n`;
    md += `**Family:** ${control.controlFamily}\n\n`;
    md += `**Objective:** ${control.objective}\n\n`;

    md += '**Implementation:**\n';
    md += `- Description: ${control.implementation.description}\n`;
    md += `- Mechanism: ${control.implementation.mechanism}\n`;
    md += `- Enforcement: ${control.implementation.enforcement}\n\n`;

    md += '**Evidence:**\n';
    for (const artifact of control.evidence.artifacts) {
      md += `- ${artifact}\n`;
    }
    md += `- Retention: ${control.evidence.retention}\n`;
    md += `- Integrity: ${control.evidence.integrity}\n\n`;

    md += '**Test Procedure:**\n';
    md += `- Method: ${control.testProcedure.method}\n`;
    md += '- Steps:\n';
    for (const step of control.testProcedure.steps) {
      md += `  ${step}\n`;
    }
    md += `- Expected Result: ${control.testProcedure.expectedResult}\n`;
    md += `- Automatable: ${control.testProcedure.automatable ? 'Yes' : 'No'}\n\n`;

    md += '**Acceptance Criteria:**\n';
    for (const criteria of control.acceptanceCriteria) {
      md += `- [ ] ${criteria}\n`;
    }

    if (control.nisMapping && control.nisMapping.length > 0) {
      md += `\n**NIST 800-53 Mapping:** ${control.nisMapping.join(', ')}\n`;
    }

    md += '\n---\n\n';
  }

  return md;
}

/**
 * Export as JSON for automated compliance tools
 */
export function exportControlCatalogJSON(): string {
  return JSON.stringify({
    catalogVersion: '1.0.0',
    generatedAt: new Date().toISOString(),
    architecturalEnforcement: true,
    controls: CONTROL_CATALOG,
    nistMapping: NIST_MAPPING
  }, null, 2);
}

// ============================================================================
// DEFAULT EXPORT
// ============================================================================

export default {
  CONTROL_CATALOG,
  CONTROL_SUMMARY_TABLE,
  ARCHITECTURAL_ENFORCEMENT_STATEMENT,
  NIST_MAPPING,
  exportControlCatalogMarkdown,
  exportControlCatalogJSON,
  // Individual controls
  ACE_AUTH_001,
  ACE_AUTH_002,
  ACE_AUTH_003,
  ACE_CONFIG_001,
  ACE_AUDIT_001,
  ACE_AUDIT_002
};
