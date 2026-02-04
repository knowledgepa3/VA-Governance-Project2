# ACE Governance Platform - Client Delivery Guide

## What You're Delivering

```
┌─────────────────────────────────────────────────────────────────┐
│                    CLIENT DELIVERY PACKAGE                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  📦 CORE PLATFORM                                               │
│     └─ Governance schemas, risk profiles, evidence system       │
│                                                                 │
│  📋 JOB PACKS (domain-specific)                                 │
│     ├─ SAMGovOpportunityCapture                                 │
│     ├─ GrantsGovOpportunityFinder                               │
│     ├─ USAJobsSearch                                            │
│     └─ [Custom packs for client]                                │
│                                                                 │
│  🛡️ RISK PROFILES                                               │
│     ├─ FedRAMP (federal compliance)                             │
│     ├─ HIPAA (healthcare)                                       │
│     ├─ SOC 2 (SaaS/tech)                                        │
│     └─ Custom profile for client                                │
│                                                                 │
│  📊 COMPLIANCE REPORTS                                          │
│     └─ Audit-ready documentation                                │
│                                                                 │
│  🔧 TOOLS                                                       │
│     └─ CLI commands for certification, health, economics        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Delivery Options

### Option A: "Governance Library" - $5K-15K

**What they get:**
- TypeScript/JavaScript library
- Pre-built Job Packs for their domains
- Risk Profile configured for their compliance needs
- Documentation and training

**How they use it:**
- Integrate into their existing automation
- Use with Claude Desktop + MCP
- Use with Claude Chrome Extension

**Ideal for:**
- Technical teams with existing automation
- Companies that want to self-host
- One-time purchase model

---

### Option B: "Managed Pack Service" - $500-2K/month

**What they get:**
- Access to certified Job Pack library
- Risk Profile management
- Evidence bundle storage
- Health monitoring
- Support

**How they use it:**
- You provide the packs
- They run via Claude + MCP
- Evidence stored in your system

**Ideal for:**
- Non-technical users
- Compliance-focused organizations
- Recurring revenue model

---

### Option C: "Full Platform + Custom Packs" - $25K-100K

**What they get:**
- Everything in Option A
- Custom Job Packs built for their specific workflows
- Industry profile customization
- Training and onboarding
- Ongoing support contract

**Ideal for:**
- Enterprise clients
- Highly regulated industries
- Complex multi-domain workflows

---

## Client Delivery Package Structure

```
client-delivery/
├── README.md                    # Quick start guide
├── SETUP.md                     # Installation instructions
├── LICENSE.md                   # Usage terms
│
├── platform/                    # Core platform
│   ├── governance/              # All governance schemas
│   ├── executor/                # Job Pack executor
│   └── scripts/                 # CLI tools
│
├── packs/                       # Their Job Packs
│   ├── GrantsGovOpportunityFinder.json
│   ├── SAMGovOpportunityCapture.json
│   └── [custom-packs]/
│
├── profiles/                    # Their Risk Profiles
│   ├── client-profile.json      # Customized for them
│   └── industry/                # Industry presets
│
├── docs/                        # Documentation
│   ├── OPERATOR_GUIDE.md
│   ├── JOB_PACK_REFERENCE.md
│   └── COMPLIANCE_MAPPING.md
│
└── examples/                    # Working examples
    ├── run-grants-search.md
    └── run-sam-capture.md
```

---

## How the Client Uses It

### Step 1: Setup (5 minutes)

```bash
# Install dependencies
cd client-delivery
npm install

# Verify setup
npx tsx scripts/verify-setup.js
```

### Step 2: Configure Risk Profile

```bash
# View available profiles
npx tsx scripts/industry-profiles.js --list

# For a federal contractor:
# Use FedRAMP profile (already configured)
```

### Step 3: Run a Job Pack

**Option A: Via CLI (Demo/Testing)**
```bash
npx tsx scripts/run-pack.js packs/GrantsGovOpportunityFinder.json \
  --url https://grants.gov \
  --profile BALANCED
```

**Option B: Via Claude Desktop + MCP**
1. Open Claude Desktop
2. Connect to MCP browser server
3. Tell Claude:

```
Execute the GrantsGov Job Pack.

Pack location: packs/GrantsGovOpportunityFinder.json
Target: https://grants.gov
Profile: Use the FedRAMP risk profile

Follow MAI boundaries:
- INFORMATIONAL: execute automatically
- ADVISORY: show me first
- MANDATORY: always ask permission

Capture evidence and generate a report when done.
```

**Option C: Via Claude Chrome Extension**
1. Open Claude in Chrome extension
2. Navigate to grants.gov
3. Tell Claude the same instructions above

### Step 4: Review Evidence

```bash
# Evidence is saved to:
ls evidence/

# View latest bundle:
cat evidence/BUNDLE-*.json | jq .
```

### Step 5: Generate Compliance Report

```bash
npx tsx scripts/generate-report.js audit-package \
  --evidence evidence/BUNDLE-latest.json \
  -o compliance/audit-report.md
```

---

## What to Customize Per Client

### 1. Risk Profile

Edit `profiles/client-profile.json`:

```json
{
  "appetite": {
    "job_pack_policy": {
      "enabled_packs": ["GrantsGovOpportunityFinder"],
      "allowed_domains": ["grants.gov", "sam.gov"],
      "max_autonomous_mai_level": "ADVISORY",
      "min_pack_certification_level": 2
    },
    "action_policy": {
      "globally_forbidden_actions": [
        "submit_application",
        "create_account",
        "make_payment"
      ]
    }
  }
}
```

### 2. Job Packs

Create custom packs for their specific workflows:

```json
{
  "pack_id": "ClientSpecificWorkflow",
  "pack_version": "1.0.0",
  "certification_level": 2,

  "role": {
    "name": "Client's Custom Agent",
    "mission": "Do X, Y, Z for client"
  },

  "authority": {
    "informational_actions": [...],
    "advisory_actions": [...],
    "mandatory_actions": [...]
  },

  "permissions": {
    "allowed_domains": ["client-specific-site.gov"],
    "forbidden_actions": [...]
  }
}
```

### 3. Compliance Mapping

If they need specific framework compliance:

```bash
# Generate FedRAMP-specific report
npx tsx scripts/generate-report.js fedramp -o compliance/fedramp.md

# Generate SOC 2 mapping
npx tsx scripts/generate-report.js audit-package --framework soc2
```

---

## Pricing Guide

### Job Pack Development

| Complexity | Time | Price |
|------------|------|-------|
| Simple (read-only, single page) | 2-4 hours | $500-1,000 |
| Medium (multi-step, forms) | 4-8 hours | $1,000-2,500 |
| Complex (authentication, complex logic) | 8-20 hours | $2,500-5,000 |
| Enterprise (custom integrations) | 20+ hours | $5,000+ |

### Risk Profile Customization

| Scope | Price |
|-------|-------|
| Use existing preset (FedRAMP, HIPAA, etc.) | Included |
| Minor customization | $500 |
| Full custom profile | $1,500-3,000 |
| Multi-profile enterprise setup | $5,000+ |

### Certification

| Level | Price | Includes |
|-------|-------|----------|
| Level 1 (Validated) | $99 | Automated checks |
| Level 2 (Tested) | $499 | + Test runs |
| Level 3 (Certified) | $1,999 | + Human review |

### Support

| Tier | Price/Month | Includes |
|------|-------------|----------|
| Basic | $0 | Email support, 48hr response |
| Standard | $299 | Priority support, 24hr response |
| Premium | $999 | Dedicated support, 4hr response |
| Enterprise | Custom | SLA, on-call, custom |

---

## Sales Pitch Script

### For Compliance Officers

> "Your team is manually researching grants and contracts, spending 45 minutes per opportunity. Our platform automates that to 3 minutes while maintaining full audit trails that satisfy FedRAMP requirements. Every action is logged, every decision is governed by your risk policy, and every output is hash-sealed for compliance."

### For IT Leaders

> "This isn't just another RPA tool. It's a governance framework that wraps Claude's browser automation in enterprise controls. You define what the AI can and cannot do. Every execution produces court-admissible evidence. And it integrates with Claude Desktop, which your team is probably already using."

### For Executives

> "We're seeing 90%+ time savings on research tasks with zero compliance risk. The platform enforces your policies automatically - the AI literally cannot take actions you haven't approved. ROI is typically 10x within the first month."

---

## Demo Script

### 1. Show the Problem (2 min)
"Watch me manually search Grants.gov for opportunities..."
*Show slow manual process*

### 2. Show the Solution (3 min)
"Now watch the governed agent do it..."
```bash
npx tsx scripts/run-pack.js --demo
```
*Show fast execution with gates*

### 3. Show the Governance (3 min)
"Here's what makes this enterprise-grade..."
- Show MAI boundaries blocking MANDATORY actions
- Show certification gate blocking uncertified packs
- Show evidence bundle with hash seal

### 4. Show Compliance (2 min)
"And here's your audit trail..."
```bash
npx tsx scripts/generate-report.js audit-package
```
*Show generated compliance report*

---

## Delivery Checklist

```
[ ] Risk profile customized for client's compliance needs
[ ] Job packs certified to appropriate level
[ ] Client-specific domains added to allowlist
[ ] Forbidden actions configured per client policy
[ ] Documentation customized with client branding
[ ] Training session scheduled
[ ] Support channel established
[ ] Monitoring/health checks configured
[ ] Evidence storage location confirmed
[ ] Compliance report templates selected
```

---

## Post-Delivery Support

### Week 1: Onboarding
- Installation verification
- First pack execution together
- Evidence review walkthrough

### Month 1: Stabilization
- Monitor execution success rates
- Tune confidence thresholds
- Add/modify escalation triggers

### Ongoing: Optimization
- Health check reviews
- Pack updates for site changes
- New pack development as needed
- Compliance report generation

---

*Document Version: 1.0.0*
*For Internal Use - Sales & Delivery Teams*
