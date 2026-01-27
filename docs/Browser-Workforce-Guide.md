# ACE Browser Workforce Guide

## Universal Browser Automation with Tight Governance

The ACE Browser Workforce is a **universal, playbook-driven browser automation platform** with MAI governance that works across any industry. Unlike traditional RPA or browser automation, every action is governed by the MAI classification system, ensuring human oversight where needed.

---

## Architecture Overview

```
┌─────────────────────────────────────────────┐
│   Playbook Engine (Universal)               │
│   - Load playbooks (JSON)                   │
│   - Assign industry packs (extensions)      │
│   - Apply MAI governance                    │
└─────────────────────────────────────────────┘
                    │
        ┌───────────┴───────────┐
        │                       │
┌───────▼──────┐       ┌────────▼────────┐
│ Browser      │       │  Chrome         │
│ Agents       │       │  Extensions     │
│ (Claude      │───────│  (Skills)       │
│  Vision)     │       │                 │
└──────────────┘       └─────────────────┘
```

**Key Components:**
- **Playbooks**: JSON files defining task sequences
- **Industry Packs**: Pre-configured extension bundles
- **Browser Agents**: Claude-powered automation workers
- **MAI Governance**: Enforces boundaries on all actions

---

## Core Concepts

### 1. Playbooks

A **playbook** is a reusable workflow definition (JSON) that can be executed by any browser agent.

**Structure:**
```json
{
  "id": "unique-id",
  "name": "Human-readable name",
  "industry": "Procurement | Compliance | Legal | HR | Healthcare",
  "jobRole": "Specific job role",
  "steps": [
    {
      "id": "step-1",
      "instruction": "What to do",
      "expectedOutcome": "What success looks like",
      "classification": "MANDATORY | ADVISORY | INFORMATIONAL"
    }
  ],
  "requiredExtensions": ["extension-1", "extension-2"],
  "variables": [{"name": "VAR", "required": true}]
}
```

**Playbooks are:**
- ✅ Industry-agnostic (can be reused across companies)
- ✅ Job-specific (tailored to role requirements)
- ✅ Version-controlled (track changes over time)
- ✅ Shareable (export/import as JSON)

### 2. Industry Packs

**Industry Packs** bundle Chrome extensions that give agents specialized capabilities.

**Example Packs:**

| Industry | Extensions | Use Cases |
|----------|-----------|-----------|
| **Procurement** | PDF Processor, Vendor DB, Spreadsheet Extractor | RFP research, vendor validation, price comparison |
| **Compliance** | Regulation Tracker, Evidence Collector, Audit Logger | Regulatory research, audit trails, compliance checks |
| **Legal** | Citation Finder, Document Compare, Docket Monitor | Case research, precedent search, document review |
| **HR** | Resume Parser, LinkedIn Connector, Background API | Candidate screening, offer prep, background checks |

**Creating a Pack:**
```typescript
const myIndustryPack: IndustryPack = {
  id: 'my-pack',
  name: 'Custom Industry Pack',
  extensions: [
    { name: 'Tool 1', path: './extensions/tool1', enabled: true },
    { name: 'Tool 2', path: './extensions/tool2', enabled: true }
  ],
  playbooks: ['playbook-1', 'playbook-2']
};
```

### 3. MAI Governance

Every playbook step has a **classification** that determines governance:

| Classification | Behavior | Use When |
|---------------|----------|----------|
| **MANDATORY** | ⛔ **Human MUST approve** before execution | Auth, credentials, final submissions, sensitive data access |
| **ADVISORY** | ⚠️ **Human SHOULD review** (auto-proceed with logging) | Document downloads, form pre-fill, data extraction |
| **INFORMATIONAL** | ℹ️ **Auto-proceed** with audit log | Navigation, screenshots, public research |

**Boundary Enforcement:**

The system **automatically** classifies certain actions as MANDATORY:
- Any action with keywords: `login`, `password`, `authenticate`, `submit`
- Any action on government domains: `va.gov`, `sam.gov`, `login.gov`
- All form submission actions

**No stored credentials, no automated authentication, no final submissions without human approval.**

---

## Quick Start

### Step 1: Create a Playbook

```json
{
  "id": "vendor-research",
  "name": "Vendor Background Research",
  "industry": "Procurement",
  "jobRole": "Procurement Specialist",
  "version": "1.0.0",
  "steps": [
    {
      "id": "search-vendor",
      "instruction": "Search SAM.gov for vendor ${VENDOR_NAME}",
      "expectedOutcome": "Vendor profile displayed",
      "classification": "INFORMATIONAL"
    },
    {
      "id": "extract-data",
      "instruction": "Extract CAGE code, NAICS codes, past performance",
      "expectedOutcome": "Structured vendor data",
      "classification": "INFORMATIONAL"
    },
    {
      "id": "download-certs",
      "instruction": "Download vendor certifications",
      "expectedOutcome": "PDFs saved",
      "classification": "ADVISORY"
    }
  ],
  "requiredExtensions": ["pdf-processor"],
  "variables": [
    {"name": "VENDOR_NAME", "required": true}
  ]
}
```

### Step 2: Execute the Playbook

```typescript
import { PlaybookEngine, PlaybookLibrary } from './playbookEngine';

const engine = new PlaybookEngine();

// Load playbook
engine.registerPlaybook(vendorResearchPlaybook);

// Load industry pack
engine.registerIndustryPack(PlaybookLibrary.getProcurementPack());

// Execute
await engine.executePlaybook('vendor-research',
  { VENDOR_NAME: 'Acme Corp' },
  {
    agentId: 'agent-1',
    industryPack: 'procurement-pack',
    onApprovalRequired: async (step, screenshot) => {
      // Show approval UI to human
      return await showApprovalDialog(step, screenshot);
    }
  }
);
```

### Step 3: Execute Workforce (Parallel)

Process 10 vendors in parallel:

```typescript
const vendors = ['Vendor A', 'Vendor B', 'Vendor C', ...];

const tasks = vendors.map((vendor, i) => ({
  playbookId: 'vendor-research',
  agentId: `agent-${i}`,
  industryPack: 'procurement-pack',
  variables: { VENDOR_NAME: vendor }
}));

await engine.executeWorkforce(tasks, {
  onProgress: (contexts) => {
    console.log(`${contexts.filter(c => c.status === 'completed').length}/${tasks.length} complete`);
  }
});
```

---

## Use Cases by Industry

### Procurement
- **RFP Research**: Navigate SAM.gov, extract requirements, assess fit
- **Vendor Validation**: Check registrations, past performance, certifications
- **Price Comparison**: Scrape competitor pricing, build comparison matrix
- **Contract Monitoring**: Track amendments, Q&A, deadline changes

### Compliance & Audit
- **Regulatory Research**: Track regulation changes, extract requirements
- **Audit Trail Builder**: Collect evidence, screenshot configs, generate packages
- **Compliance Checks**: Verify controls, test procedures, document findings
- **Report Generation**: Compile findings into audit-ready reports

### Legal
- **Case Research**: Search PACER, Westlaw, state databases for precedents
- **Document Review**: Compare contracts, flag deviations, extract terms
- **Docket Monitoring**: Track case updates, deadlines, filings
- **Cite Checking**: Verify cases are good law, not overturned

### Human Resources
- **Candidate Screening**: Verify education, licenses, public records
- **Background Checks**: Check court records, social media, employment gaps
- **Offer Prep**: Pull salary data, generate offer letters, compliance checks
- **Onboarding Automation**: Navigate HR systems, create accounts, send docs

### Healthcare
- **Prior Authorization**: Navigate payer portals, submit requests, track status
- **Eligibility Verification**: Check coverage, benefits, copays
- **Claims Processing**: Extract EOBs, validate codes, flag denials
- **Provider Credentialing**: Verify licenses, check sanctions, update databases

---

## Extension Development

Chrome extensions give agents specialized capabilities. Extensions run normally - agents just control the browser around them.

**Example Extension Capabilities:**
- **PDF Processor**: Extract text, OCR scans, detect form fields
- **Form Filler**: Auto-populate from templates, validate required fields
- **Data Extractor**: Scrape structured data, export to CSV/JSON
- **Screenshot Annotator**: Add timestamps, highlights, redactions
- **API Connector**: Call internal APIs, fetch data, sync systems

**Extension Structure:**
```
my-extension/
├── manifest.json
├── background.js
├── content.js
└── popup.html
```

**Load Extension:**
```typescript
const agent = await workforce.spawnAgent({
  agentId: 'agent-1',
  task: 'Research vendors',
  extensions: [
    { name: 'PDF Tool', path: './extensions/pdf-tool', enabled: true }
  ]
});
```

---

## Security & Boundaries

### ✅ What's Allowed
- Document processing (download, parse, extract)
- Form pre-filling (local, not submitted)
- Public research (no authentication)
- Evidence collection (screenshots, links)
- Report generation (memos, summaries)
- Runbook creation (step-by-step guides)

### 🚫 What's Prohibited
- **Authentication**: No login, no credentials, no password entry
- **CAPTCHA**: Human-only interaction
- **Final Submissions**: No submit buttons on government/regulated sites
- **Stored Credentials**: No password managers automated
- **Credential Harvesting**: No credential extraction

### Governance Enforcement
1. **Keyword Detection**: Actions with `login`, `password`, `submit` → MANDATORY
2. **Domain Checking**: Actions on `*.gov` domains → MANDATORY
3. **Submit Protection**: All form submissions → MANDATORY
4. **Audit Trail**: Every action logged with screenshot
5. **Recorded Approvals**: Human approvals timestamped and tamper-evident

---

## Roadmap

### Phase 1: Core Platform ✅
- [x] Playbook engine
- [x] MAI governance enforcement
- [x] Chrome extension support
- [x] Workforce orchestration
- [x] Sample playbooks (Procurement, Compliance, HR)

### Phase 2: Industry Packs (Next)
- [ ] Build 5 industry pack templates
- [ ] Create 20+ pre-built playbooks
- [ ] Extension marketplace/registry
- [ ] Playbook editor UI

### Phase 3: Enterprise Features
- [ ] Multi-tenant support
- [ ] RBAC for playbook access
- [ ] SSO integration
- [ ] Audit log export (SIEM)
- [ ] Compliance certifications (SOC 2, CMMC)

---

## FAQ

**Q: Is this using Anthropic's Computer Use API?**
A: No, this is a custom implementation using Claude Vision API + Playwright. More flexible than Computer Use for browser-specific tasks.

**Q: How much does it cost per task?**
A: ~$0.20-$2.00 per task depending on complexity (screenshot count, steps). See cost optimization guide.

**Q: Can I use this for VA claims?**
A: You could, but the Agentic Agent workforce (Evidence/QA/Report) is better suited for document-heavy workflows. Browser agents are for web interaction.

**Q: What if Claude makes a mistake?**
A: MAI governance catches prohibited actions. For other mistakes, the audit trail (screenshots + reasoning) lets you debug and refine playbooks.

**Q: Can I sell playbooks?**
A: Yes! Playbooks are portable JSON files. You could build an industry pack + playbook library and license it.

**Q: Do I need to write Chrome extensions?**
A: No. Many use cases work with existing extensions or no extensions. Extensions enhance capabilities but aren't required.

---

## Positioning

**"Accelerate regulated workflows without automating submissions."**

This is NOT:
- ❌ A bot that logs in for you
- ❌ A tool to bypass CAPTCHAs
- ❌ An automated submission system

This IS:
- ✅ A governed research assistant
- ✅ A document processing accelerator
- ✅ A human-in-the-loop workflow tool
- ✅ An audit-ready automation platform

**Use this to make humans faster and more accurate, not to replace them.**

---

## Support

- **Documentation**: `/docs`
- **Sample Playbooks**: `/playbooks`
- **Demo Code**: `/examples/playbookDemo.ts`
- **Issues**: GitHub Issues
- **Custom Playbooks**: Contact for consulting

---

**Built on the MAI Pattern. Governed. Auditable. Universal.**
