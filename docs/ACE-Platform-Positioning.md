# ACE Governance Platform

## Governed Workforce Runtime for Regulated Work

---

## One-Liner

**"ACE is a governed workforce runtime: playbook-driven automation with audit-grade evidence, policy gating, and human-in-the-loop enforcement—built for regulated work."**

Alternative:

**"We accelerate regulated workflows without automating accountability."**

---

## What MAI Actually Enforces

**MAI is a runtime policy engine** that gates every step (navigate/click/type/download/export), enforces human-in-the-loop on restricted actions, and produces an audit trail for every decision.

**This is NOT just classification - this is enforcement.**

### What Happens When MAI Says "MANDATORY"

1. **Runtime Gate**: Action is blocked until human approval
2. **Screenshot Capture**: Current state captured for review
3. **Approval UI**: Human sees action + reasoning + screenshot
4. **Attestation**: Human must attest to lawful basis (if required)
5. **Audit Log**: Approval recorded with timestamp + identity
6. **Evidence Pack**: Action included in tamper-evident evidence package

### Policy Enforcement Examples

| Action | Policy | Result |
|--------|--------|--------|
| Type password into login field | NO_AUTH | ⛔ **BLOCKED** - Authentication is human-only |
| Click "Submit Claim" button | APPROVE_SUBMISSIONS | ⏸️ **GATED** - Human must approve |
| Download PDF from SAM.gov | CONTROLLED_DOWNLOADS | ✅ **ALLOWED** - But hashed + logged |
| Share data externally | NO_EXTERNAL_SHARE | 📝 **REQUIRES ATTESTATION** - Human must attest |

---

## Architecture

```
┌──────────────────────────────────────────────────┐
│         ACE GOVERNANCE PLATFORM                  │
│         (MAI Runtime Policy Engine)              │
└──────────────────────────────────────────────────┘
                      │
        ┌─────────────┴─────────────┐
        │                           │
┌───────▼────────┐         ┌────────▼──────────────┐
│  Agentic       │         │  Universal Work       │
│  Workforce     │         │  Execution Layer      │
│                │         │  (Web + Portals)      │
│ Document-heavy │         │                       │
│ reasoning      │         │ Playbook-driven       │
│ (VA Claims)    │         │ Browser automation    │
│                │         │ + Skill Packs         │
└────────────────┘         └───────────────────────┘
                                     │
                    ┌────────────────┼────────────────┐
                    │                │                │
              ┌─────▼─────┐    ┌────▼────┐    ┌─────▼─────┐
              │Procurement│    │Compliance│    │  Legal/   │
              │ Playbooks │    │ Playbooks│    │  HR       │
              │+ Skill    │    │+ Skill   │    │ Playbooks │
              │  Packs    │    │  Packs   │    │+ Skill    │
              │+ Evidence │    │+ Evidence│    │  Packs    │
              │  Schemas  │    │  Schemas │    │+ Evidence │
              │           │    │          │    │  Schemas  │
              └───────────┘    └──────────┘    └───────────┘
```

### Components

1. **MAI Runtime**: Policy enforcement engine
2. **Playbooks**: JSON workflow definitions
3. **Skill Packs**: Extension bundles + data sources + extraction schemas + validation rules
4. **Evidence Engine**: Audit-grade output generator
5. **Universal Work Execution Layer**: Browser agents + Claude vision

---

## Policy Defaults (The "Tight" Part)

These defaults make ACE defensible for regulated industries:

### 1. No Logins Without Approved Auth Mode
- Authentication actions → **BLOCKED** by default
- No credential storage, no password automation
- Human-only login requirement

### 2. No Scraping Prohibited Sources
- Domain allow/block lists enforced at runtime
- Government portals → Require approval
- Blocked domains → Hard deny

### 3. No Decisions Affecting Employment/Benefits Without Attestation
- High-risk actions (screening, eligibility, benefits) → **REQUIRE ATTESTATION**
- Human must attest to lawful basis + consent
- Audit log includes attestation text

### 4. Immutable Audit Log With Operator Identity
- Every action logged with:
  - Timestamp
  - Operator ID
  - Action details
  - Policy decision
  - Approval (if required)
  - SHA-256 hash (tamper detection)

### 5. Evidence Pack Generation
- Every playbook execution produces:
  - Timeline of steps
  - Screenshots + hashes
  - Extracted artifacts + provenance
  - Decisions + reasoning
  - Human approvals
  - Final report
  - Pack hash (tamper-evident)

### 6. Controlled Download Storage
- All downloads → Hashed + logged
- Stored in controlled location
- Metadata captured (source, timestamp, operator)

### 7. External Sharing Requires Attestation
- Email/export actions → **BLOCKED** by default
- Can be enabled with attestation requirement
- Human must confirm lawful basis

---

## Evidence Pack Example

Every playbook run produces an audit-grade evidence pack:

```json
{
  "executionId": "exec-2024-01-15-001",
  "playbookId": "rfp-research",
  "playbookVersion": "1.0.0",
  "operatorId": "alice@company.com",
  "startTime": "2024-01-15T10:00:00Z",
  "endTime": "2024-01-15T10:08:32Z",

  "timeline": [
    {
      "stepId": "navigate-sam",
      "stepName": "Navigate to SAM.gov",
      "timestamp": "2024-01-15T10:00:05Z",
      "duration": 2314,
      "status": "completed",
      "screenshot": "sha256:abc123..."
    },
    {
      "stepId": "search-rfp",
      "stepName": "Search for RFP 140D0423R0003",
      "timestamp": "2024-01-15T10:00:07Z",
      "duration": 1523,
      "status": "completed",
      "screenshot": "sha256:def456..."
    }
  ],

  "artifacts": [
    {
      "id": "rfp-doc-001",
      "type": "document",
      "filename": "140D0423R0003-solicitation.pdf",
      "hash": "sha256:789abc...",
      "source": "https://sam.gov/...",
      "timestamp": "2024-01-15T10:02:15Z"
    }
  ],

  "decisions": [
    {
      "stepId": "generate-memo",
      "decision": "Recommend: GO - Strong fit based on technical capabilities",
      "reasoning": "Organization has 8/10 required certifications, past performance in this NAICS code, and budget aligns with typical awards ($2-5M range)",
      "confidence": 0.87
    }
  ],

  "approvals": [
    {
      "stepId": "download-documents",
      "action": "Download RFP PDFs",
      "approved": true,
      "approver": "alice@company.com",
      "timestamp": "2024-01-15T10:02:10Z"
    }
  ],

  "report": {
    "summary": "RFP 140D0423R0003 analyzed. Strong organizational fit. Recommend pursuing.",
    "findings": [
      "Deadline: March 15, 2024 (60 days)",
      "Budget: $2-5M estimated",
      "Set-aside: Small Business",
      "8/10 required certifications held"
    ],
    "recommendations": [
      "Proceed with proposal development",
      "Assign Sarah (past VA experience)",
      "Review amendment #2 for scope changes"
    ]
  },

  "auditLog": [
    {
      "timestamp": "2024-01-15T10:00:05Z",
      "operatorId": "alice@company.com",
      "action": "NAVIGATE",
      "target": "https://sam.gov",
      "classification": "INFORMATIONAL",
      "policyDecision": "ALLOW",
      "hash": "sha256:xyz789..."
    }
  ],

  "packHash": "sha256:pack-final-hash-here...",
  "signature": "optional-cryptographic-signature"
}
```

**This is your ACE signature: Decision Chain Validation, not "we automated work."**

---

## Skill Packs (Platform Moat)

Skill Packs are capability bundles that include:

1. **Chrome Extensions** - Technical capabilities
2. **Data Sources** - Approved sources to access
3. **Extraction Schemas** - How to structure extracted data
4. **Validation Rules** - What makes data valid
5. **Reporting Templates** - How to format outputs
6. **Domain Policies** - What domains are allowed

### Skill Pack Manifest Example

```json
{
  "id": "procurement-skill-pack",
  "name": "Procurement & Sourcing Skills",
  "version": "1.0.0",

  "permissions": {
    "downloads": true,
    "network": true,
    "storage": false
  },

  "allowedDomains": ["sam.gov", "beta.sam.gov"],

  "dataClassification": "public",

  "loggingHooks": {
    "onAction": true,
    "onDataAccess": true,
    "onNetworkRequest": true
  },

  "extensions": [
    {"name": "PDF Processor", "path": "./ext/pdf", "enabled": true},
    {"name": "Vendor DB", "path": "./ext/vendor", "enabled": true}
  ],

  "dataSources": [
    {"id": "sam-gov", "type": "api", "endpoint": "https://api.sam.gov/v1"},
    {"id": "gsa-advantage", "type": "scrape", "url": "https://..."}
  ],

  "extractionSchemas": {
    "rfp": {
      "type": "object",
      "required": ["solicitation_number", "agency", "deadline"],
      "properties": {
        "solicitation_number": {"type": "string"},
        "agency": {"type": "string"},
        "deadline": {"type": "string", "format": "date"}
      }
    }
  },

  "validationRules": {
    "deadline_not_past": "deadline > now()",
    "budget_in_range": "budget >= 25000 && budget <= 10000000"
  }
}
```

---

## Beachhead Strategy: Pick ONE Wedge First

Don't start with "any industry." Pick one beachhead where governance is painful:

### Recommended Wedges

**1. Procurement/RFP Research** ⭐ **BEST FIRST WEDGE**
- ✅ Low risk (public data)
- ✅ High time savings (8 hours → 30 minutes)
- ✅ Easy ROI calculation ($200/hr analyst time)
- ✅ Clear boundaries (no auth, no submissions)
- ✅ Audit trail advantage (bid protest defense)

**2. FedRAMP/NIST Control Evidence Gathering**
- ✅ Perfect brand alignment
- ✅ Compliance teams are in pain
- ✅ Your MAI pattern solves exact problem
- ✅ High willingness to pay

**3. Compliance Evidence Collection**
- ✅ Audit trail is core value prop
- ✅ Regulated industries need this
- ✅ Recurring revenue (quarterly audits)

**Start with Procurement RFP research, prove the model, then expand.**

---

## Competitive Differentiation

### vs. Traditional RPA
- ❌ RPA: No governance, fails on dynamic pages, brittle
- ✅ ACE: Policy-gated, vision-based (handles dynamic UIs), audit trails

### vs. Browser Extensions
- ❌ Extensions: Security risk, no oversight, credential storage
- ✅ ACE: Server-controlled, MAI gates actions, no stored credentials

### vs. "Agent Tools" (e.g., LangChain, AutoGPT)
- ❌ Agent Tools: Run wild, no compliance boundaries, no evidence
- ✅ ACE: Policy enforcement, human-in-loop, audit-grade evidence packs

### vs. Computer Use API (Anthropic)
- ❌ Computer Use: General purpose, no governance layer
- ✅ ACE: Purpose-built for regulated work, MAI runtime, evidence engine

---

## Go-to-Market Messaging

### For Procurement Teams
*"Research 50 RFPs in parallel while maintaining full audit trails for bid protests. Your analysts focus on strategy, not data gathering."*

### For Compliance Teams
*"Build audit-ready evidence packages automatically. Every control tested, every step documented, every decision traceable."*

### For Legal Teams
*"Accelerate case research without compromising chain of custody. Every source cited, every decision logged, every artifact hashed."*

### For HR Teams
*"Screen candidates faster while maintaining FCRA/GDPR compliance. Consent-gated, attestation-required, audit-ready."*

---

## Must-Build List (Non-Negotiable)

To make this real:

### 1. ✅ Playbook Schema + Validator
- [x] JSON schema definition
- [x] Validation logic
- [x] Compliance boundary enforcement

### 2. ✅ MAI Runtime Policy Engine
- [x] Policy rule definitions
- [x] Runtime action gating
- [x] Audit log generation
- [x] Evidence pack creation

### 3. ⏳ Evidence Pack Validator
- [ ] Hash verification
- [ ] Timeline completeness check
- [ ] Required artifacts present
- [ ] Approval chain validation

### 4. ⏳ Skill Pack Permission System
- [ ] Manifest parser
- [ ] Permission enforcement
- [ ] Domain policy checks
- [ ] Logging hooks

### 5. ⏳ Playbook Library (10-15 vetted playbooks)
- [x] RFP research (Procurement)
- [x] Compliance audit trail
- [x] Candidate screening (with warnings)
- [ ] 7-12 more across industries

### 6. ⏳ Reference Implementation
- [ ] Complete end-to-end demo
- [ ] Video walkthrough
- [ ] Evidence pack samples
- [ ] ROI calculator

---

## Positioning Summary

**ACE is NOT:**
- ❌ An automation tool
- ❌ A bot that bypasses security
- ❌ A replacement for human judgment

**ACE IS:**
- ✅ A governed workforce runtime
- ✅ A policy enforcement layer for AI agents
- ✅ An audit trail generator for regulated work
- ✅ A decision chain validator

**Tagline:**

*"Accelerate regulated workflows without automating accountability."*

---

**Built on the MAI Pattern. Governed. Auditable. Defensible.**
