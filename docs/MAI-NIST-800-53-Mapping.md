# MAI → NIST 800-53 Control Mapping

**Document Version:** 1.0
**Last Updated:** 2025-01-30
**Classification:** Unclassified / FOUO
**Author:** ACE Governance Platform

---

## Executive Summary

The MAI (Mandatory/Advisory/Informational) Runtime Policy Engine provides architectural enforcement of security controls that map directly to NIST 800-53 Rev 5 requirements. This document demonstrates how ACE's governance-first design satisfies federal compliance requirements at the architectural level.

**Key Finding:** MAI is not a compliance overlay—it is enforcement built into the runtime, making compliance an architectural property rather than a policy add-on.

---

## Control Family Mapping Overview

| NIST 800-53 Family | MAI Component | Coverage |
|-------------------|---------------|----------|
| **AC** (Access Control) | PolicyDecision, MANDATORY gates | High |
| **AU** (Audit & Accountability) | AuditLogEntry, EvidencePack | High |
| **IA** (Identification & Authentication) | NO_AUTH policy, operatorId tracking | High |
| **SC** (System & Communications Protection) | Domain allow/block, controlled downloads | Medium |
| **SI** (System & Information Integrity) | Behavioral Integrity Check, Red Team/AAL | High |
| **CA** (Assessment, Authorization & Monitoring) | Red Team continuous testing | High |
| **RA** (Risk Assessment) | Classification system, policy evaluation | Medium |
| **SA** (System & Services Acquisition) | LLM abstraction layer, supply chain controls | Medium |

---

## Detailed Control Mapping

### AC - Access Control

#### AC-2: Account Management

| Requirement | MAI Implementation | Evidence |
|-------------|-------------------|----------|
| Track authorized users | `operatorId` in every `AuditLogEntry` | `maiRuntime.ts:53-54` |
| Role-based access | MANDATORY classification requires human approval | `maiRuntime.ts:303-305` |
| Session tracking | Evidence pack includes operator identity throughout | `maiRuntime.ts:102` |

**MAI Code Reference:**
```typescript
export interface AuditLogEntry {
  operatorId: string;        // AC-2: Operator accountability
  approver?: string;         // AC-2: Approval chain
  // ...
}
```

#### AC-3: Access Enforcement

| Requirement | MAI Implementation | Evidence |
|-------------|-------------------|----------|
| Enforce access decisions | `PolicyDecision` enum with ALLOW/DENY/REQUIRE_APPROVAL | `maiRuntime.ts:41-46` |
| Least privilege | DENY always wins in policy evaluation | `maiRuntime.ts:311-314` |
| Default deny | Blocked domains enforced at runtime | `maiRuntime.ts:255-264` |

**MAI Enforcement Logic:**
```typescript
// Most restrictive policy wins
if (rule.decision === PolicyDecision.DENY) {
  this.logAudit(context, PolicyDecision.DENY, `Blocked by policy: ${rule.name}`);
  return PolicyDecision.DENY;  // AC-3: Enforcement
}
```

#### AC-6: Least Privilege

| Requirement | MAI Implementation | Evidence |
|-------------|-------------------|----------|
| Minimum necessary access | MANDATORY classification gates high-risk actions | Classification system |
| Privileged functions require approval | `REQUIRE_APPROVAL` and `REQUIRE_ATTESTATION` decisions | `maiRuntime.ts:44-45` |

---

### AU - Audit and Accountability

#### AU-2: Event Logging

| Requirement | MAI Implementation | Evidence |
|-------------|-------------------|----------|
| Define auditable events | All ActionTypes logged automatically | `maiRuntime.ts:23-36` |
| Audit all security-relevant events | Every `evaluateAction()` call generates audit entry | `maiRuntime.ts:328` |

**Auditable Actions:**
```typescript
export enum ActionType {
  NAVIGATE, CLICK, TYPE, SUBMIT,     // User actions
  DOWNLOAD, UPLOAD, EXTRACT,         // Data actions
  SCREENSHOT, EXPORT,                // Evidence actions
  EXTERNAL_SHARE, AUTH, CAPTCHA      // High-risk actions
}
```

#### AU-3: Content of Audit Records

| Requirement | MAI Implementation | Evidence |
|-------------|-------------------|----------|
| What: Type of event | `action: ActionType` | `maiRuntime.ts:55` |
| When: Timestamp | `timestamp: Date` | `maiRuntime.ts:52` |
| Who: User identity | `operatorId`, `approver` | `maiRuntime.ts:53-54, 60` |
| Where: Source/target | `target: string`, `url` | `maiRuntime.ts:56` |
| Outcome: Success/failure | `policyDecision`, `approved` | `maiRuntime.ts:58-59` |

**Complete Audit Record:**
```typescript
export interface AuditLogEntry {
  timestamp: Date;              // AU-3: When
  agentId: string;              // AU-3: Source system
  operatorId: string;           // AU-3: Who (subject)
  action: ActionType;           // AU-3: What (event type)
  target: string;               // AU-3: Where (object)
  classification: MAIClassification;
  policyDecision: PolicyDecision;  // AU-3: Outcome
  approved?: boolean;           // AU-3: Authorization result
  approver?: string;            // AU-3: Authorizing official
  reasoning: string;            // AU-3: Additional context
  hash: string;                 // AU-9: Integrity protection
}
```

#### AU-9: Protection of Audit Information

| Requirement | MAI Implementation | Evidence |
|-------------|-------------------|----------|
| Protect audit records from modification | Hash-chained entries | `maiRuntime.ts:63` |
| Tamper detection | SHA-256 hash of each entry | `maiRuntime.ts:414-417` |
| Evidence pack integrity | `packHash` for entire evidence pack | `maiRuntime.ts:158` |

**Integrity Protection:**
```typescript
// Each audit entry includes cryptographic hash
hash: string; // SHA-256 hash for tamper detection

// Evidence pack includes overall integrity hash
packHash: string; // SHA-256 of entire pack
signature?: string; // Optional cryptographic signature
```

#### AU-12: Audit Record Generation

| Requirement | MAI Implementation | Evidence |
|-------------|-------------------|----------|
| Generate audit records at defined events | `logAudit()` called for every policy evaluation | `maiRuntime.ts:335-349` |
| Audit record generation capability | Built into runtime, not optional | Architectural enforcement |

---

### IA - Identification and Authentication

#### IA-2: Identification and Authentication (Organizational Users)

| Requirement | MAI Implementation | Evidence |
|-------------|-------------------|----------|
| Uniquely identify users | `operatorId` required in all contexts | `maiRuntime.ts:89` |
| No automated authentication | `NO_AUTH` policy blocks auth actions | `maiRuntime.ts:179-191` |

**Authentication Boundary:**
```typescript
// POLICY 1: No authentication without approved auth mode
this.addPolicyRule({
  id: 'no-auth',
  name: 'No Automated Authentication',
  description: 'Authentication actions require human-only execution',
  condition: (action, context) => {
    return action === ActionType.AUTH ||
           context.target?.toLowerCase().includes('login') ||
           context.target?.toLowerCase().includes('password');
  },
  decision: PolicyDecision.DENY  // IA-2: Human auth only
});
```

#### IA-5: Authenticator Management

| Requirement | MAI Implementation | Evidence |
|-------------|-------------------|----------|
| Protect authenticators | Credentials never entered by automation | `NO_AUTH` policy |
| No credential storage | Passwords blocked from typed input | `maiRuntime.ts:188` |

---

### SC - System and Communications Protection

#### SC-7: Boundary Protection

| Requirement | MAI Implementation | Evidence |
|-------------|-------------------|----------|
| Monitor communications at boundary | Domain allow/block lists | `maiRuntime.ts:168-169` |
| Deny by default | `blockedDomains` enforced at runtime | `maiRuntime.ts:255-264` |
| Controlled interfaces | All external actions gated | ActionType coverage |

**Domain Boundary Enforcement:**
```typescript
// Domain allow/block lists enforced at runtime
private allowedDomains: Set<string> = new Set();
private blockedDomains: Set<string> = new Set();

// POLICY 7: Blocked domains
this.addPolicyRule({
  id: 'blocked-domains',
  name: 'Blocked Domain Protection',
  decision: PolicyDecision.DENY
});
```

#### SC-8: Transmission Confidentiality and Integrity

| Requirement | MAI Implementation | Evidence |
|-------------|-------------------|----------|
| Protect data in transit | External sharing requires attestation | `NO_EXTERNAL_SHARE` policy |
| Lawful basis tracking | `lawfulBasis` field in context | `maiRuntime.ts:91` |

---

### SI - System and Information Integrity

#### SI-3: Malicious Code Protection

| Requirement | MAI Implementation | Evidence |
|-------------|-------------------|----------|
| Detect malicious content | Behavioral Integrity Check | `claudeService.ts:353-388` |
| Block malicious input | Adversarial input neutralization | Architectural control |

**Behavioral Integrity Implementation:**
```typescript
// ACE Behavioral Integrity Sentinel
export async function behavioralIntegrityCheck(input: any): Promise<{
  resilient: boolean;
  integrity_score: number;
  anomaly_detected?: string;
}> {
  // Validates input for adversarial patterns before processing
  // Returns integrity assessment and anomaly detection
}
```

#### SI-4: System Monitoring

| Requirement | MAI Implementation | Evidence |
|-------------|-------------------|----------|
| Monitor system events | All actions logged with classification | Audit trail |
| Identify unauthorized use | Policy violations logged with reasoning | `maiRuntime.ts:328` |
| Real-time alerts | MANDATORY gates halt execution pending approval | Classification system |

#### SI-7: Software, Firmware, and Information Integrity

| Requirement | MAI Implementation | Evidence |
|-------------|-------------------|----------|
| Verify integrity | Hash-chained audit entries | `maiRuntime.ts:63` |
| Detect unauthorized changes | Evidence pack hash verification | `maiRuntime.ts:158` |

---

### CA - Assessment, Authorization, and Monitoring

#### CA-8: Penetration Testing

| Requirement | MAI Implementation | Evidence |
|-------------|-------------------|----------|
| Periodic penetration testing | Red Team / Adversarial Assurance Lane | `redTeamAgent.ts` |
| Test attack vectors | 44 attack vectors across 6 categories | `redTeamTestSuites.ts` |
| Continuous security validation | AAL runs before/during/after execution | Pre/In/Post-flight testing |

**Red Team Coverage:**
- `PROMPT_INJECTION` - 15+ attack vectors
- `DATA_LEAKAGE` - PII extraction, secret exposure
- `AUTHORITY_ESCALATION` - MANDATORY bypass attempts
- `FABRICATION` - Hallucination & citation verification
- `WORKFLOW_TAMPER` - Ledger manipulation, gate skipping
- `TOOL_ABUSE` - Unauthorized web/file access

#### CA-7: Continuous Monitoring

| Requirement | MAI Implementation | Evidence |
|-------------|-------------------|----------|
| Ongoing security assessment | Real-time policy evaluation | `evaluateAction()` |
| Automated monitoring | Every action triggers policy check | Architectural enforcement |
| Anomaly detection | Behavioral Integrity Check on input | `claudeService.ts` |

---

### RA - Risk Assessment

#### RA-3: Risk Assessment

| Requirement | MAI Implementation | Evidence |
|-------------|-------------------|----------|
| Assess risk of operations | MAI Classification (MANDATORY/ADVISORY/INFORMATIONAL) | Classification system |
| Document risk decisions | Policy reasoning logged in audit | `maiRuntime.ts:61` |

**Risk Classification:**
```typescript
// Three-tier risk classification
enum MAIClassification {
  MANDATORY,      // High risk - requires human approval
  ADVISORY,       // Medium risk - human should review
  INFORMATIONAL   // Low risk - auto-proceed with logging
}
```

#### RA-5: Vulnerability Monitoring and Scanning

| Requirement | MAI Implementation | Evidence |
|-------------|-------------------|----------|
| Scan for vulnerabilities | Red Team continuous testing | AAL architecture |
| Analyze scan results | Score cards, findings, trend reports | `redTeamAgent.ts` |
| Remediate vulnerabilities | Behavioral Repair Agent | Auto-fix capabilities |

---

### SA - System and Services Acquisition

#### SA-9: External System Services

| Requirement | MAI Implementation | Evidence |
|-------------|-------------------|----------|
| Control external services | LLM abstraction layer | `llm/` module |
| Define security requirements | Provider interface contract | `llm/types.ts` |
| Monitor compliance | Provider health checks | `healthCheck()` |

**External Service Control:**
```typescript
// Vendor-agnostic LLM interface
export interface LLMProvider {
  complete(prompt: string, options?: CompletionOptions): Promise<CompletionResponse>;
  healthCheck(): Promise<HealthCheckResult>;
  // Governance decisions happen BEFORE model invocation
}
```

#### SA-12: Supply Chain Protection

| Requirement | MAI Implementation | Evidence |
|-------------|-------------------|----------|
| Protect supply chain | Multiple LLM provider options | Anthropic, Bedrock, Azure |
| Reduce single points of failure | Provider abstraction | `llm/factory.ts` |

---

## MAI Default Policies → NIST Control Crosswalk

| MAI Policy | Policy ID | NIST 800-53 Controls |
|------------|-----------|---------------------|
| No Automated Authentication | `no-auth` | IA-2, IA-5, AC-3 |
| No CAPTCHA Automation | `no-captcha` | IA-2, SC-7 |
| Approve Form Submissions | `approve-submissions` | AC-3, AU-2 |
| Controlled Downloads | `controlled-downloads` | SC-7, AU-3 |
| No External Sharing | `no-external-share` | SC-8, AC-3, AU-2 |
| High-Risk Action Attestation | `high-risk-attestation` | AC-6, AU-3, IA-2 |
| Blocked Domain Protection | `blocked-domains` | SC-7, AC-3 |

---

## Evidence Pack → Audit Requirements

The MAI Evidence Pack satisfies multiple audit record requirements:

| Evidence Pack Field | NIST Control | Purpose |
|--------------------|--------------|---------|
| `executionId` | AU-3 | Unique event identifier |
| `operatorId` | AU-3, AC-2 | User accountability |
| `timeline[]` | AU-3, AU-12 | Event sequence |
| `artifacts[]` | AU-3 | Data provenance |
| `decisions[]` | AU-3 | Decision rationale |
| `approvals[]` | AC-3, AU-3 | Authorization chain |
| `auditLog[]` | AU-2, AU-3 | Complete audit trail |
| `packHash` | AU-9 | Integrity verification |

---

## Compliance Statements

### For Proposals & Sources Sought

> "The ACE platform implements NIST 800-53 Rev 5 controls at the architectural level through the MAI (Mandatory/Advisory/Informational) Runtime Policy Engine. This governance-first design ensures that access control (AC), audit accountability (AU), identification (IA), and system integrity (SI) requirements are enforced at runtime, not as policy overlays."

### For Technical Volume

> "ACE's MAI runtime provides:
> - **AC-3 enforcement** through policy decision evaluation with DENY as the most restrictive outcome
> - **AU-3 audit records** with complete event context including timestamp, operator, action, target, and cryptographic integrity protection
> - **IA-2 compliance** through mandatory human authentication (NO_AUTH policy blocks automated credential handling)
> - **SI-4 monitoring** through continuous policy evaluation on every action
> - **CA-8 penetration testing** through the integrated Adversarial Assurance Lane with 44 attack vectors"

### For Executive Briefings

> "ACE is designed for federal environments. Our governance engine maps directly to NIST 800-53 controls, with human-in-the-loop enforcement on all high-risk actions and tamper-evident audit trails for every decision."

---

## Appendix: CMMC 2.0 Crosswalk

| CMMC Domain | MAI Coverage | Notes |
|-------------|--------------|-------|
| Access Control (AC) | High | PolicyDecision enforcement |
| Audit & Accountability (AU) | High | AuditLogEntry, EvidencePack |
| Identification & Authentication (IA) | High | NO_AUTH policy |
| Incident Response (IR) | Medium | Via Cyber IR Workforce |
| System & Communications Protection (SC) | Medium | Domain boundaries |
| System & Information Integrity (SI) | High | Behavioral Integrity Check |

---

## Document Control

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-01-30 | ACE Platform | Initial release |

---

*This document is intended for use in federal proposals, compliance assessments, and technical evaluations. The mappings represent architectural design intent and should be validated against specific implementation and deployment configurations.*
