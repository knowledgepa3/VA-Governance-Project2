# GIA: Governed Intelligence Architecture

**Version:** 1.0.0
**Date:** 2026-02-03
**Author:** ACE Platform
**Tagline:** *Controlled Intelligence, Responsible Action*

---

## What is GIA?

**Governed Intelligence Architecture (GIA)** is a three-layer design pattern for building AI agents that are both intelligent and safe. It separates concerns so that:

- **Governance is immutable** - safety rules cannot be bypassed
- **Execution is intelligent** - AI uses judgment for tasks
- **Personalization is user-controlled** - preferences stay with the user

```
┌─────────────────────────────────────────────────────────────┐
│                    GOVERNANCE LAYER                          │
│  • Allowed Domains        • Stop Before Payments            │
│  • Audit Logs Only        • Immutable Rules                 │
│                                                              │
│                   Fixed Policy Enforcement                   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   AI EXECUTION LAYER                         │
│  • Site Navigation        • Task Adaptation                 │
│  • Smart Decisions        • Context Understanding           │
│                                                              │
│                    Adaptive Automation                       │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   USER PROFILE LAYER                         │
│  • User Preferences       • Accounts & Providers            │
│  • Personal Context       • History & Patterns              │
│                                                              │
│                     Personalized Data                        │
└─────────────────────────────────────────────────────────────┘
```

---

## The Problem GIA Solves

| Approach | Problem |
|----------|---------|
| **Traditional Automation** | No intelligence - breaks when sites change |
| **Pure AI Agents** | No guardrails - can go rogue |
| **Policy-Based AI** | Rules can be prompt-injected or bypassed |
| **GIA** | Intelligence + architectural enforcement |

**Key Insight:** Governance must be structural, not instructional. Telling an AI "don't do X" is weaker than making it architecturally impossible to do X without human approval.

---

## Core Principles

### 1. Separation of Concerns

| Layer | Responsibility | Changes How Often |
|-------|---------------|-------------------|
| Governance | What's allowed | Rarely (security updates) |
| Execution | How to do it | Every task (AI adapts) |
| Profile | Who and what | User-controlled |

### 2. Immutable Governance

The Governance Layer:
- Cannot be modified by the AI
- Cannot be bypassed via prompts
- Enforces rules at runtime, not just policy
- Logs everything for audit

### 3. Human-in-the-Loop by Design

```
READ actions     → Auto-proceed with logging (INFORMATIONAL)
NAVIGATE actions → Auto-proceed with logging (INFORMATIONAL)
FORM actions     → Require human approval (ADVISORY)
PAYMENT actions  → STOP until human approves (MANDATORY)
```

### 4. Evidence Chain

Every action creates an audit record:
- What was done
- Who approved it
- When it happened
- Hash for tamper detection

---

## Implementation in ACE

### Governance Layer: `aceGovernance.ts`

```typescript
// Domain allowlist - AI can ONLY access these sites
export const ALLOWED_DOMAINS = [
  'walmart.com',
  'georgiapower.com',
  // ... explicitly listed
] as const;

// Stop conditions - AI MUST halt on these
export const STOP_CONDITIONS = {
  LOGIN_DETECTED: { action: 'halt', severity: 'critical' },
  PAYMENT_DETECTED: { action: 'halt', severity: 'critical' },
  // ...
};

// Gate triggers - AI MUST get approval for these
export const GATE_TRIGGERS = {
  FORM_SUBMISSION: { requiresApproval: true },
  // ...
};
```

### Execution Layer: Claude + Chrome MCP

The AI:
- Navigates websites
- Reads content
- Makes smart decisions (e.g., picking groceries)
- **But cannot bypass governance gates**

### Profile Layer: `knowl_household.json`

```json
{
  "household": {
    "members": [{ "name": "Dad", "age": 50 }, { "name": "Son", "age": 20 }]
  },
  "accounts": {
    "groceries": { "primary_store": "Walmart" },
    "electric": { "provider": "GA Power" }
  },
  "shopping_preferences": {
    "budget_target": 150,
    "priorities": ["Easy meals", "Healthy options"]
  }
}
```

---

## Real-World Proof

On 2026-02-03, GIA was used to:

1. **Order groceries** ($98.27 from Walmart)
   - AI navigated site, built cart based on preferences
   - AI STOPPED at checkout, asked for approval
   - Human approved, order placed
   - Full evidence logged

2. **Check utility bill** (WOW Cable $131.39)
   - AI navigated to portal
   - AI was already logged in (session persisted)
   - AI read balance, reported to user
   - No payment attempted (read-only)

**This is not theory - it's working code with real transactions.**

---

## Compliance Alignment

GIA's architecture maps directly to compliance frameworks:

| GIA Component | NIST 800-53 | EU AI Act | ISO 31000 |
|---------------|-------------|-----------|-----------|
| Governance Layer | AC-3, AU-2 | Art. 14 (Human Oversight) | 6.5 (Risk Treatment) |
| Stop Conditions | SI-4, IR-4 | Art. 9 (Risk Management) | 6.4 (Risk Assessment) |
| Audit Logging | AU-3, AU-9 | Art. 12 (Record-Keeping) | 6.6 (Monitoring) |
| Gate Triggers | AC-6 | Art. 14 (Intervention) | 6.5 (Controls) |
| Profile Layer | - | Art. 13 (Transparency) | - |

---

## Why "Governed Intelligence"?

**Governed** because:
- Rules are enforced, not suggested
- Boundaries are architectural, not policy
- Audit trails are immutable

**Intelligence** because:
- AI adapts to different sites
- AI makes smart decisions within boundaries
- AI understands context from profile

**Architecture** because:
- It's a structural pattern, not a feature
- Layers are separated by design
- Can be implemented in any stack

---

## Quick Start

To use GIA in your project:

1. **Define your Governance Layer**
   - What domains are allowed?
   - What conditions should stop execution?
   - What actions require human approval?

2. **Connect your Execution Layer**
   - LLM for intelligence
   - Browser automation for action
   - Wrapper that enforces governance

3. **Create your Profile Layer**
   - User preferences
   - Account information
   - Personal context

4. **Wire them together**
   ```
   User Request
     → Governance Check (domain allowed?)
       → AI Execution (navigate, read, decide)
         → Governance Gate (payment? stop and ask)
           → Human Approval
             → Execute with Audit Log
   ```

---

## Summary

**GIA = Governed Intelligence Architecture**

- **Three layers:** Governance → Execution → Profile
- **Key innovation:** Governance is architectural, not instructional
- **Human oversight:** Built-in gates for high-risk actions
- **Audit trail:** Everything logged and hashed
- **Compliance-ready:** Maps to NIST, EU AI Act, ISO 31000

*Controlled Intelligence, Responsible Action.*

---

## Document History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-02-03 | Initial release - pattern defined and proven |
