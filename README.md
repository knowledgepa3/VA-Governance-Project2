# ACE Governance Platform

**Governed Workforce Runtime for Regulated Work**

*Accelerate regulated workflows without automating accountability*

<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

## The Problem

Organizations need AI to accelerate regulated workflows, but can't deploy automation in high-stakes environments because:

- ❌ **No Runtime Enforcement** - Tools run wild with no policy gates
- ❌ **No Audit Trails** - Can't prove what actions were taken or why
- ❌ **No Human Oversight** - No gates for auth, submissions, or high-risk actions
- ❌ **No Evidence Chains** - Can't trace decisions back to source data
- ❌ **Accountability Gap** - When AI acts, who's responsible?

## The Solution

**ACE is a runtime policy engine that gates every action, enforces human-in-the-loop on restricted actions, and produces audit-grade evidence for every decision.**

### Two Products Built on MAI Runtime:

**1. Agentic Workforce** (Document-heavy reasoning)
- Evidence extraction, QA validation, report generation
- Use case: VA disability claims processing

**2. Universal Work Execution Layer** (Web + portals)
- Playbook-driven browser automation with Skill Packs
- Use cases: Procurement, Compliance, Legal, HR

### What ACE Provides:

✅ **MAI Runtime** - Policy enforcement engine that gates actions (not just labels them)
✅ **Human-in-the-Loop Gates** - Auth, CAPTCHA, submissions → human-only
✅ **Immutable Audit Log** - Every action logged with operator ID + hash
✅ **Evidence Packs** - Audit-grade outputs with tamper detection
✅ **Playbook System** - JSON workflow definitions with compliance boundaries
✅ **Skill Packs** - Extension bundles + data sources + validation rules

---

## Architecture Overview

### The Governed Intelligence Loop

```
┌─────────────────────────────────────────────────────────────┐
│  1. UNIFIED GATEWAY (PII/PHI Redaction)                     │
│     └─ "Digital Shredder" - Sanitize all ingress data       │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  2. MULTI-AGENT PROCESSING (Timeline, Evidence, QA, etc.)   │
│     └─ Each agent classified by risk level (M/A/I)          │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  3. HUMAN OVERSIGHT GATE                                     │
│     └─ MANDATORY agents require approval before proceeding  │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  4. BEHAVIORAL REPAIR (Auto-fix logical inconsistencies)     │
│     └─ REPAIR agent catches date conflicts, logic errors    │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  5. TELEMETRY & COMPLIANCE (CMMC, NIST AI RMF reporting)    │
│     └─ Auto-generate audit trails and compliance docs       │
└─────────────────────────────────────────────────────────────┘
```

---

## Key Features

### 1. MAI Runtime Policy Engine

**MAI is a runtime policy engine that gates every step, enforces human-in-the-loop on restricted actions, and produces an audit trail for every decision.**

#### What Happens When MAI Says "MANDATORY"

1. **Runtime Gate**: Action is blocked until human approval
2. **Screenshot Capture**: Current state captured for review
3. **Approval UI**: Human sees action + reasoning + screenshot
4. **Attestation** (if required): Human attests to lawful basis
5. **Audit Log**: Approval recorded with timestamp + operator ID + hash
6. **Evidence Pack**: Action included in tamper-evident evidence package

| Classification | Runtime Behavior | Use Case |
|---------------|------------------|----------|
| **MANDATORY** | ⛔ **BLOCKED** until human approves | Auth, credentials, final submissions, high-risk decisions |
| **ADVISORY** | ⚠️ **ALLOWED** but human should review | Document downloads, data extraction, form pre-fill |
| **INFORMATIONAL** | ✅ **AUTO-PROCEED** with audit log | Navigation, screenshots, public research |

#### Policy Defaults (Built-In)

- **NO_AUTH**: Authentication actions → BLOCKED
- **NO_CAPTCHA**: CAPTCHA interaction → BLOCKED
- **APPROVE_SUBMISSIONS**: Form submissions → REQUIRE APPROVAL
- **CONTROLLED_DOWNLOADS**: Downloads → Hashed + logged
- **NO_EXTERNAL_SHARE**: External sharing → REQUIRE ATTESTATION
- **HIGH_RISK_ATTESTATION**: Employment/benefits decisions → REQUIRE ATTESTATION

### 2. Digital Shredder Pattern (Unified Gateway)

- All sensitive data (PII/PHI) redacted at ingestion
- Downstream agents operate on sanitized data only
- Reduces compliance surface area by 90%

### 3. Behavioral Repair Pattern

- Agents flag logical inconsistencies (future dates, contradictions)
- REPAIR agent auto-fixes and logs interventions
- Creates self-healing workflows with full transparency

### 4. Template-Based Workflows

Pre-built blueprints for different domains:

- **VA Disability Claims** - Forensic evidence chain validation (38 CFR §3.303)
- **Financial Audit** - Ledger analysis, fraud detection, tax compliance
- **[Extensible]** - Build your own governed workflow templates

### 5. Compliance Reporting

Auto-generates:
- **NIST AI RMF 1.0 Mapping Matrix** (GOVERN, MAP, MEASURE, MANAGE)
- **CMMC 2.0 Readiness Dashboard** (SI, AU, AC, IR domains)
- **Audit Ledger** (timestamp, agent, classification, human review status)

---

## Demo Use Cases

### Use Case 1: VA Disability Claims Processing

**Problem:** Veterans Affairs needs to validate evidence chains per 38 CFR §3.303, but manual review is slow and inconsistent.

**ACE Solution:**
1. **Unified Gateway** - Redact veteran PII/PHI
2. **Timeline Builder** - Construct chronological medical history
3. **Evidence Validator** - Map evidence to regulatory requirements (38 CFR §3.303, §3.310, §3.700)
4. **C&P Examiner Perspective** - Advisory clinical lens
5. **Quality Assurance** - Check for logical errors, future dates
6. **Report Generator** - Professional Evidence Chain Validation (ECV) document
7. **Telemetry** - CMMC compliance scorecard

**Result:** Governed, auditable claims analysis with full human oversight.

### Use Case 2: Financial Audit & Fraud Detection

**Problem:** Accounting firms need to detect fraud patterns but can't deploy AI without audit trails.

**ACE Solution:**
1. **Unified Gateway** - Sanitize financial records
2. **Ledger Auditor** - Analyze general ledger for double-entry errors
3. **Fraud Detector** - Flag anomalous spending patterns (ADVISORY - human reviews)
4. **Tax Compliance** - Verify IRS/SEC alignment
5. **Report Generator** - Formal audit findings
6. **Telemetry** - SOX compliance dashboard

**Result:** AI-powered audit with governance controls and compliance docs.

---

## Technology Stack

- **Frontend:** React + TypeScript + Vite
- **Backend:** Node.js + Express (Enterprise Server)
- **Styling:** TailwindCSS
- **AI Model:** Anthropic Claude (Claude 3.5 Sonnet, Claude 3.5 Haiku)
- **Orchestration:** Custom multi-agent framework with governance middleware
- **Security:** JWT auth, hash-chained audit, tenant isolation, rate limiting
- **Compliance:** NIST AI RMF 1.0, CMMC 2.0, FedRAMP-ready

---

## Installation & Setup

### Prerequisites
- Node.js 18+
- Docker (for production deployment)
- Anthropic API Key ([Get one here](https://console.anthropic.com/))

### Quick Start (Development)

1. **Clone the repository:**
   ```bash
   git clone https://github.com/YOUR_USERNAME/ACE-VA-Agents.git
   cd ACE-VA-Agents
   ```

2. **Install dependencies:**
   ```bash
   # Frontend
   npm install

   # Server
   cd server && npm install
   ```

3. **Configure environment:**
   ```bash
   cp server/.env.example server/.env
   # Edit server/.env with your settings
   ```

4. **Run the app:**
   ```bash
   # Terminal 1: Server
   cd server && npm run dev

   # Terminal 2: Frontend
   npm run dev
   ```

5. **Open in browser:**
   ```
   http://localhost:5173
   ```

### Production Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for full deployment guide.

**Quick Docker deployment:**
```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

**DigitalOcean App Platform:**
```bash
doctl apps create --spec .do/app.yaml
```

---

## How to Use

### 1. Select a Workflow Template

Choose from pre-built blueprints:
- **VA Claims (Federal Forensic)**
- **Financial Audit (Corporate Integrity)**

### 2. Upload Source Artifacts

- **Demo Mode:** Load mock medical/legal records
- **Sovereign Upload:** Upload your own documents (local-only, never sent to cloud)

### 3. Initiate Governed Flow

Click "Initiate Governed Flow" to start the agent workforce.

### 4. Review Human Oversight Gates

When a MANDATORY or ADVISORY agent completes:
- Review the agent's output
- Approve or reject based on your role (ISSO, SME, Auditor)
- System logs your decision for audit trail

### 5. View Compliance Reports

Navigate to:
- **Dashboard** - Real-time CMMC compliance scores
- **Audit Ledger** - Full forensic trail of all agent actions
- **Compliance Statement** - Printable NIST AI RMF mapping report

---

## Architecture Deep Dive

### Agent Orchestration Pattern

```typescript
// Each agent is classified and governed
export const AGENT_CONFIGS = {
  [AgentRole.GATEWAY]: {
    classification: MAIClassification.MANDATORY,  // Human must approve
    skills: "PII/PHI redaction and sanitization"
  },
  [AgentRole.EVIDENCE]: {
    classification: MAIClassification.ADVISORY,   // Human should review
    skills: "Forensic evidence chain mapping (38 CFR §3.303)"
  },
  [AgentRole.TIMELINE]: {
    classification: MAIClassification.INFORMATIONAL,  // Auto-proceed
    skills: "Build chronological timeline"
  }
}
```

### Human-in-the-Loop Flow

```typescript
// Workflow pauses at MANDATORY/ADVISORY checkpoints
if (classification === MAIClassification.MANDATORY) {
  setState({ humanActionRequired: true });
  // Wait for human approval before proceeding
}
```

### Behavioral Integrity Check

```typescript
// Validate input for adversarial patterns
const integrityScan = await behavioralIntegrityCheck(inputData);
if (!integrityScan.resilient) {
  return {
    ace_compliance_status: "CRITICAL_FAILURE",
    integrity_alert: "ADVERSARIAL INPUT ATTEMPT NEUTRALIZED"
  };
}
```

---

## Compliance & Security

### NIST AI RMF 1.0 Alignment

| Function | ACE Implementation |
|----------|-------------------|
| **GOVERN** | Human oversight gates at every agent transition |
| **MAP** | Rater & C&P perspectives contextualize risks |
| **MEASURE** | REPAIR agent monitors logical inconsistencies |
| **MANAGE** | Unified Gateway mitigates PII/PHI risks |

### CMMC 2.0 Controls

| Domain | ACE Implementation |
|--------|-------------------|
| **SI (System Integrity)** | Unified Gateway redaction verified |
| **AU (Audit & Accountability)** | Continuous supervisor logging |
| **AC (Access Control)** | RBAC gate authorization active |
| **IR (Incident Response)** | REPAIR agent logic remediation |

### Role-Based Access Control

| Role | Permissions |
|------|------------|
| **ISSO / ACE Architect** | Full system access, can approve all gates |
| **Forensic SME** | Can approve evidence/analysis agents |
| **Sanitization Officer** | Can approve Unified Gateway only |
| **Federal Auditor** | Read-only access to audit trails |
| **Chief Compliance Officer** | Access to compliance dashboards |

---

## Extensibility

### Build Your Own Workflow Template

```typescript
// constants.ts
export const WORKFORCE_TEMPLATES = {
  [WorkforceType.YOUR_USE_CASE]: {
    name: "Your Custom Workflow",
    roles: [
      AgentRole.GATEWAY,      // Always start with PII redaction
      AgentRole.YOUR_AGENT_1, // Your custom agent
      AgentRole.YOUR_AGENT_2, // Another custom agent
      AgentRole.QA,           // Always include quality check
      AgentRole.REPORT,       // Final report generation
      AgentRole.TELEMETRY     // Compliance metrics
    ],
    caseLabel: "Case #YOUR-PREFIX-X"
  }
}
```

### Add Custom Agent Roles

```typescript
// types.ts
export enum AgentRole {
  YOUR_CUSTOM_AGENT = 'Your Custom Agent Name'
}

// constants.ts
export const AGENT_CONFIGS = {
  [AgentRole.YOUR_CUSTOM_AGENT]: {
    description: 'What your agent does',
    classification: MAIClassification.ADVISORY,
    skills: `Your agent's system prompt and capabilities`
  }
}
```

---

## Roadmap

- [ ] **Database Backend** - Persist audit logs to PostgreSQL
- [ ] **Real Authentication** - Replace mock RBAC with Auth0/Clerk
- [ ] **Webhook Integrations** - Notify Slack/Teams on governance events
- [ ] **Custom LLM Support** - Add Claude, GPT-4, Llama adapters
- [ ] **Policy Engine** - Define custom governance rules via YAML
- [ ] **Multi-Tenancy** - Separate workspaces per organization

---

## Contributing

This is a prototype/demonstration project. If you want to extend it:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/your-feature`)
3. Commit your changes (`git commit -m 'Add your feature'`)
4. Push to the branch (`git push origin feature/your-feature`)
5. Open a Pull Request

---

## License

MIT License - See [LICENSE](LICENSE) for details.

---

## Credits

**Author:** William J. Storey III
**Role:** ISSO AI Governance Lead • ACE Federal Protocol
**Contact:** [Your contact info]

**Built with:**
- Anthropic Claude API
- React + TypeScript + Vite
- TailwindCSS
- Recharts

---

## Enterprise Security Features

This platform includes enterprise-grade security controls:

| Feature | Description |
|---------|-------------|
| **Hash-Chained Audit** | Tamper-evident append-only audit log with cryptographic chaining |
| **JWT Authentication** | Strict verification with iss, aud, exp, nbf claims |
| **Separation of Duties** | Initiator cannot approve their own actions |
| **Tenant Isolation** | Multi-tenant with strict data boundaries |
| **Rate Limiting** | Per-endpoint, per-user, per-tenant limits |
| **Egress Controls** | Domain allowlist/blocklist enforcement |
| **Break-Glass Mode** | Emergency access with enhanced auditing |
| **Compliance Modes** | dev/staging/production/fedramp toggles |
| **Key Management** | KMS-ready abstraction (AWS KMS, Vault ready) |
| **PII Detection** | Server-side scanning (positions only, no raw PII to client) |

### Compliance Alignment

- **NIST AI RMF 1.0** - GOVERN, MAP, MEASURE, MANAGE functions
- **CMMC 2.0** - SI, AU, AC, IR controls
- **FedRAMP Ready** - Strict mode for federal deployments

---

## Disclaimer

This platform is designed for production use but:
- ⚠️ Requires proper security configuration before deployment
- ⚠️ Compliance claims require validation by your compliance team
- ⚠️ Penetration testing recommended before federal deployment
- ⚠️ Not a substitute for legal/compliance review

**Deploy responsibly. Configure securely.**

---

## Research & Documentation

For deeper understanding of the governance pattern underlying ACE:

**📄 [MAI Classification System Whitepaper](./MAI-Pattern-Whitepaper.md)**
- Comprehensive technical documentation
- Implementation guidelines with code examples
- Comparison to existing approaches (LangChain, AutoGPT, etc.)
- Adoption guidelines for organizations and framework developers

**📊 [Visual Diagrams](./docs/MAI-Pattern-Diagrams.md)**
- 8 different visual representations of the MAI pattern
- Decision trees, workflow sequences, system architecture
- Before/after comparisons
- Ready for presentations, papers, and blog posts

---

## Why This Matters

**The AI governance gap is real.** Organizations are building agents everywhere, but most have zero oversight, no audit trails, and no compliance framework.

ACE shows what's possible when you design governance INTO the architecture from day one:
- Every decision is traceable
- High-risk actions require human approval
- Compliance documentation auto-generates
- Role-based access is enforced

This isn't just a VA claims tool - it's a blueprint for **trustworthy AI deployment in regulated environments.**

---

**View the live prototype:** [AI Studio Link](https://ai.studio/apps/drive/1riwDWtdH3bB4UofELjI4v5xDCjKs0ejd)

**Questions? Feedback?** Open an issue or reach out.
