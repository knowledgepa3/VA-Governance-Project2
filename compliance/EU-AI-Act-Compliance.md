# EU AI Act Compliance Mapping

**Platform:** ACE Governance Platform
**Generated:** 2026-02-03
**Regulation:** EU AI Act (Regulation 2024/1689)

---

## Executive Summary

The ACE Governance Platform's three-layer architecture (Governance → Execution → Profile) aligns with EU AI Act requirements for high-risk AI systems. This document maps platform controls to EU AI Act articles.

**Key Finding:** The MAI (Mandatory/Advisory/Informational) classification system provides the human oversight mechanisms required by Articles 14 and 26.

---

## Risk Classification

Under EU AI Act Annex III, AI systems that make decisions affecting individuals may be classified as **high-risk**. ACE's governance-first design addresses high-risk requirements proactively.

| Use Case | Risk Level | Rationale |
|----------|------------|-----------|
| Household automation (bill pay) | Limited | Affects only user, full human control |
| VA claims assistance | High | Affects benefit decisions |
| Financial automation | High | Affects financial outcomes |

---

## Article Mapping

### Article 9: Risk Management System

| Requirement | ACE Implementation | Evidence |
|-------------|-------------------|----------|
| Establish risk management system | MAI classification system | `aceGovernance.ts` |
| Identify and analyze risks | STOP_CONDITIONS detect risk patterns | `aceGovernance.ts:102-161` |
| Evaluate risks | MAI levels (MANDATORY=high, ADVISORY=medium, INFORMATIONAL=low) | Classification enum |
| Adopt risk management measures | Gate triggers require approval | `GATE_TRIGGERS` |

**Implementation:**
```typescript
// Three-tier risk classification maps to EU AI Act risk levels
enum MAIClassification {
  MANDATORY,      // High risk - requires human approval
  ADVISORY,       // Medium risk - human should review
  INFORMATIONAL   // Low risk - auto-proceed with logging
}
```

---

### Article 10: Data and Data Governance

| Requirement | ACE Implementation | Evidence |
|-------------|-------------------|----------|
| Training data quality | N/A - uses pre-trained models | LLM abstraction |
| Data governance practices | Profile layer stores user data locally | `knowl_household.json` |
| Bias examination | Multi-perspective agent design | Rater, C&P Examiner roles |

**Implementation:**
- User profile data stays on user's machine
- No training on user data
- Multiple agent perspectives reduce single-point bias

---

### Article 11: Technical Documentation

| Requirement | ACE Implementation | Evidence |
|-------------|-------------------|----------|
| System description | Architecture documentation | `docs/ACE_TECHNICAL_MANUAL.md` |
| Design specifications | Governance layer specification | `aceGovernance.ts` |
| Monitoring capabilities | Audit logging | `AuditLogEntry` interface |

---

### Article 12: Record-Keeping

| Requirement | ACE Implementation | Evidence |
|-------------|-------------------|----------|
| Automatic logging | Every action logged | `logAction()` function |
| Traceability | Hash-chained audit entries | `AuditLogEntry.hash` |
| Event recording | Complete action context captured | `EvidenceRecord` interface |

**Implementation:**
```typescript
export interface AuditLogEntry {
  id: string;
  timestamp: string;
  actor: 'platform_agent' | 'claude_code' | 'human' | 'system';
  action: string;
  target?: string;
  governance: {
    domain_check?: { url: string; allowed: boolean; };
    stop_condition_check?: { triggered: boolean; conditions?: string[]; };
    gate_check?: { required: boolean; approved?: boolean; };
  };
  result: 'success' | 'blocked' | 'gated' | 'error';
  details?: string;
}
```

---

### Article 13: Transparency and Information to Deployers

| Requirement | ACE Implementation | Evidence |
|-------------|-------------------|----------|
| Clear instructions for use | Prompt templates | `HOUSEHOLD_PROMPTS` |
| Capability descriptions | Profile shows what agent can access | `accounts` in profile |
| Limitations disclosure | Domain allowlist visible | `ALLOWED_DOMAINS` |

**Implementation:**
- Users see exactly which domains agent can access
- Profile explicitly lists capabilities and accounts
- Stop conditions documented and visible

---

### Article 14: Human Oversight ⭐ (Critical)

| Requirement | ACE Implementation | Evidence |
|-------------|-------------------|----------|
| Human oversight measures | MANDATORY classification gates | `executeWithGovernance()` |
| Ability to intervene | Stop conditions halt execution | `STOP_CONDITIONS` |
| Ability to override | Human approval required for payments | Gate system |
| Understand AI capabilities | Profile layer shows context | User profile |

**This is the core innovation of ACE's three-layer architecture:**

```
┌─────────────────────────────────────────────┐
│           GOVERNANCE LAYER                   │
│  • MANDATORY gates STOP before payments     │
│  • Human MUST approve to continue           │
│  • Cannot be bypassed by AI                 │
└─────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────┐
│           AI EXECUTION LAYER                 │
│  • Navigates, clicks, reads                 │
│  • Makes smart decisions                    │
│  • CANNOT proceed past gates alone          │
└─────────────────────────────────────────────┘
```

**Key Differentiator:** Human oversight is **architectural**, not policy-based. The AI physically cannot place an order without human approval in the chat.

---

### Article 15: Accuracy, Robustness, Cybersecurity

| Requirement | ACE Implementation | Evidence |
|-------------|-------------------|----------|
| Appropriate accuracy | Confidence thresholds | Risk profiles |
| Robustness | Behavioral Integrity Check | `claudeService.ts` |
| Resilience to manipulation | Domain allowlist prevents redirect attacks | `isUrlAllowed()` |
| Cybersecurity measures | Hash-chained audit logs | Tamper detection |

---

### Article 26: Obligations of Deployers (Users)

| Requirement | ACE Implementation | Evidence |
|-------------|-------------------|----------|
| Use in accordance with instructions | Prompt templates guide correct use | Documentation |
| Human oversight implementation | User approves all MANDATORY actions | Gate system |
| Monitor operation | Session state visible to user | `getSessionStatus()` |
| Inform affected individuals | Audit trail available | Evidence packages |

---

## Three-Layer Architecture → EU AI Act Mapping

| ACE Layer | EU AI Act Requirement | How It Satisfies |
|-----------|----------------------|------------------|
| **Governance** | Art. 14 Human Oversight | Gates stop execution until human approves |
| **Governance** | Art. 9 Risk Management | MAI classification assesses every action |
| **Governance** | Art. 12 Record-Keeping | Audit log captures everything |
| **Execution** | Art. 15 Accuracy | AI uses judgment for navigation |
| **Execution** | Art. 10 Data Governance | No training on user data |
| **Profile** | Art. 13 Transparency | User sees their preferences and accounts |
| **Profile** | Art. 26 Deployer Obligations | User controls their own profile |

---

## Compliance Statements

### For General Use

> "The ACE Governance Platform implements EU AI Act Article 14 human oversight requirements through its three-layer architecture. The Governance Layer enforces mandatory human approval for all high-risk actions (financial transactions, form submissions) through architectural gates that cannot be bypassed by the AI execution layer."

### For Technical Assessments

> "ACE's MAI (Mandatory/Advisory/Informational) classification system maps directly to EU AI Act risk tiers:
> - **MANDATORY** = High-risk actions requiring human approval (Art. 14 compliance)
> - **ADVISORY** = Medium-risk actions flagged for human review
> - **INFORMATIONAL** = Low-risk actions auto-approved with full audit logging (Art. 12 compliance)
>
> This classification is enforced at runtime through the `executeWithGovernance()` wrapper, ensuring compliance is architectural rather than policy-based."

---

## Cross-Reference to Other Frameworks

| EU AI Act Article | NIST 800-53 Control | ISO 31000 Clause |
|-------------------|---------------------|------------------|
| Art. 9 Risk Management | RA-3 Risk Assessment | 6.4 Risk Assessment |
| Art. 12 Record-Keeping | AU-2, AU-3 Audit | 6.6 Monitoring |
| Art. 14 Human Oversight | AC-3 Access Enforcement | 6.5 Risk Treatment |
| Art. 15 Cybersecurity | SI-7 Integrity | 6.6 Monitoring |

---

## Document Control

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-02-03 | ACE Platform | Initial release |

---

*This mapping applies to the ACE Governance Platform architecture. Specific deployments should be assessed against their use case risk classification under EU AI Act Annex III.*
