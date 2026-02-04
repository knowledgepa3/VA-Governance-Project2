# ACE Governance Platform - Operator Guide

## Table of Contents

1. [Overview](#overview)
2. [Core Concepts](#core-concepts)
3. [Getting Started](#getting-started)
4. [Configuration](#configuration)
5. [Job Packs](#job-packs)
6. [Risk Profiles](#risk-profiles)
7. [Industry Profiles](#industry-profiles)
8. [Certification](#certification)
9. [Certification as a Service (CaaS)](#certification-as-a-service-caas)
10. [Compliance Reporting](#compliance-reporting)
11. [Evidence Management](#evidence-management)
12. [Operational Health](#operational-health)
13. [Pack Economics](#pack-economics)
14. [Pack Library](#pack-library)
15. [Production Deployment](#production-deployment)
16. [Troubleshooting](#troubleshooting)

---

## Overview

The ACE Governance Platform provides enterprise-grade governance for autonomous agent operations. It implements a three-tier governance model:

```
┌─────────────────────────────────────────────────────────────────┐
│                     GOVERNANCE ARCHITECTURE                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────┐                                           │
│  │  POLICY LAYER   │  Risk Appetite - What is allowed          │
│  │  (Appetite)     │  • Enabled job packs                      │
│  │                 │  • Forbidden actions                      │
│  │                 │  • Evidence requirements                  │
│  └────────┬────────┘                                           │
│           │                                                     │
│  ┌────────▼────────┐                                           │
│  │  CONTROL LAYER  │  Risk Tolerance - How much deviation      │
│  │  (Tolerance)    │  • Confidence thresholds                  │
│  │                 │  • Retry limits                           │
│  │                 │  • Timeout values                         │
│  └────────┬────────┘                                           │
│           │                                                     │
│  ┌────────▼────────┐                                           │
│  │ EXECUTION LAYER │  Job Packs - Runtime enforcement          │
│  │  (Job Packs)    │  • MAI boundaries                         │
│  │                 │  • Escalation triggers                    │
│  │                 │  • Evidence capture                       │
│  └─────────────────┘                                           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Core Concepts

### MAI (Mandatory/Advisory/Informational)

Every action in ACE has an MAI classification:

| Level | Description | Human Required? | Example |
|-------|-------------|-----------------|---------|
| **INFORMATIONAL** | Read-only, no side effects | No | Search SAM.gov |
| **ADVISORY** | Suggests actions, human decides | For decision | Draft email |
| **MANDATORY** | Critical actions require approval | Yes, always | Submit bid |

### Job Packs

A Job Pack is: **SOP + checklist + constraints + UI map + evidence rules** compressed into a runnable doctrine.

```
Job Pack = {
  Role & Mission      →  What the agent does
  MAI Boundaries      →  What authority levels apply
  Permissions         →  What's allowed and forbidden
  Procedure Index     →  Step-by-step navigation
  UI Map              →  How to find UI elements
  Escalation Triggers →  When to stop and ask
  Evidence Rules      →  What to capture for audit
}
```

### Risk Profiles

Risk Profiles combine appetite (policy) and tolerance (control):

- **Risk Appetite**: Organizational policy on what risks are acceptable
- **Risk Tolerance**: Operational parameters for how much deviation is allowed

### Evidence Bundles

Every execution produces an evidence bundle:

```
evidence/
└── 2024-01-15_sam-gov_exec-001/
    ├── manifest.json         # Hash inventory
    ├── extraction_log.json   # Action audit trail
    ├── source_context.json   # Provenance data
    ├── opportunity.json      # Structured output
    ├── opportunity.md        # Human summary
    └── screenshots/          # Visual evidence
```

---

## Getting Started

### Prerequisites

```bash
# Node.js 18+
node --version

# Install dependencies
npm install

# Install global tools (optional)
npm install -g tsx
```

### Quick Start

```bash
# 1. Copy environment template
cp .env.example .env

# 2. Add your API key
echo "ANTHROPIC_API_KEY=sk-ant-..." >> .env

# 3. Verify setup
tsx quicktest.ts

# 4. Run in demo mode (no API calls)
ACE_DEMO_MODE=true npm run dev
```

### Directory Structure

```
ACE-VA-Agents/
├── governance/              # Governance schemas and controls
│   ├── RiskProfileSchema.ts
│   ├── PackCertificationSchema.ts
│   ├── FrameworkControlMapping.ts
│   ├── ExecutionAttestation.ts
│   ├── ReportTemplates.ts
│   ├── CertificationAutomation.ts   # Level 2-3 automation
│   ├── PackEconomics.ts             # ROI and licensing
│   ├── OperationalHealth.ts         # Health monitoring
│   ├── ProductionPackLibrary.ts     # Pack catalog
│   └── IndustryProfiles.ts          # FedRAMP, HIPAA, etc.
├── workforce/               # Agent workforce
│   └── jobpacks/           # Job Pack definitions
├── auth/                   # Authentication providers
├── scripts/                # CLI tools
│   ├── certify-pack.js
│   ├── generate-report.js
│   ├── verify-evidence.js
│   ├── golden-path-demo.js
│   ├── health-check.js             # Operational health CLI
│   ├── economics-report.js         # Pack economics CLI
│   └── industry-profiles.js        # Industry profiles CLI
├── evidence/               # Generated evidence bundles
└── compliance/             # Generated compliance reports
```

---

## Configuration

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `ANTHROPIC_API_KEY` | Claude API key | Yes (unless demo) |
| `NODE_ENV` | Environment: `development` or `production` | Recommended |
| `ACE_DEMO_MODE` | Run without API calls (`true`/`false`) | No |
| `ACE_STRICT_MODE` | Fail on data source errors (`true`/`false`) | Recommended in prod |
| `AUTH_PROVIDER` | Auth provider: `auth0`, `login_gov`, `azure_ad`, `okta` | Yes in prod |

### Configuration Modes

```bash
# Development mode (default)
npm run dev

# Production mode
NODE_ENV=production \
ACE_STRICT_MODE=true \
AUTH_PROVIDER=auth0 \
npm start

# Demo mode (no API calls)
ACE_DEMO_MODE=true npm run dev
```

### Validating Configuration

```bash
# Check configuration
npm run validate-config
```

---

## Job Packs

### Viewing Available Packs

```bash
# List all registered packs
node scripts/jobpack-cli.js list

# Search by domain
node scripts/jobpack-cli.js search --domain sam.gov

# View pack details
node scripts/jobpack-cli.js info SAMGovOpportunityCapture
```

### Job Pack Structure

```json
{
  "pack_id": "SAMGovOpportunityCapture",
  "pack_version": "1.0.0",

  "role": {
    "name": "SAM.gov Opportunity Analyst",
    "mission": "Capture federal contract opportunities",
    "success_criteria": ["Extract key opportunity data"],
    "outputs": ["opportunity.json", "opportunity.md"]
  },

  "authority": {
    "informational_actions": [...],
    "advisory_actions": [...],
    "mandatory_actions": [...]
  },

  "permissions": {
    "allowed": [...],
    "forbidden": [
      { "action": "submit_bid", "reason": "Human-only action" }
    ]
  },

  "escalation": {
    "triggers": [
      {
        "trigger_id": "ESC-001",
        "condition": "error_rate > 3",
        "action": "stop_and_ask",
        "severity": "HIGH"
      }
    ]
  }
}
```

### Creating a New Job Pack

1. Copy an existing pack as template
2. Modify role, permissions, and procedures
3. Validate with certification tool
4. Register in the pack registry

```bash
# Validate new pack
node scripts/certify-pack.js workforce/jobpacks/MyNewPack.json

# Register if valid
node scripts/jobpack-cli.js register workforce/jobpacks/MyNewPack.json
```

---

## Risk Profiles

### Profile Presets

ACE provides three standard presets:

| Preset | Use Case | MAI Limit | Sealed Bundles |
|--------|----------|-----------|----------------|
| **CONSERVATIVE** | Regulated industries | INFORMATIONAL only | Required |
| **BALANCED** | General enterprise | ADVISORY allowed | Required |
| **AGGRESSIVE** | Low-risk internal | MANDATORY allowed | Optional |

### Profile Structure

```typescript
RiskProfile = {
  // Identity
  profile_id: "profile-001",
  version: "1.0.0",

  // Scope
  scope: {
    environments: ["PROD"],
    entity_ids: ["org-001"]
  },

  // Policy Layer
  appetite: {
    job_pack_policy: {
      max_autonomous_mai_level: "ADVISORY"
    },
    action_policy: {
      globally_forbidden_actions: ["submit_bid", "delete_data"]
    },
    evidence_policy: {
      require_sealed_bundles: true
    }
  },

  // Control Layer
  tolerance: {
    confidence: {
      critical_field_minimum: 95,
      standard_field_minimum: 80
    },
    retry_limits: {
      max_retries_per_step: 3
    }
  }
}
```

### Using Profiles

```typescript
import { PRESET_PROFILES } from './governance/RiskProfileSchema';

// Use conservative preset
const profile = PRESET_PROFILES.CONSERVATIVE_PROFILE;

// Validate profile
const validation = validateRiskProfile(profile);
if (!validation.valid) {
  console.error(validation.errors);
}
```

---

## Certification

### Certification Levels

```
Level 0: DRAFT       - In development, not validated
Level 1: VALIDATED   - Schema valid, runs without errors
Level 2: TESTED      - Has test evidence, escalations work
Level 3: CERTIFIED   - Full audit trail, reviewed by human
Level 4: PRODUCTION  - Deployed, monitored, incident-free
```

### Running Certification

```bash
# Run automated checks (Level 1)
node scripts/certify-pack.js workforce/jobpacks/MyPack.json

# Target Level 2 and save record
node scripts/certify-pack.js pack.json --target 2 -o cert-record.json

# Add human certification (Level 3)
node scripts/certify-pack.js pack.json \
  --record cert-record.json \
  --certify \
  --certifier "Jane Smith"
```

### Certification Criteria

| Level | Key Requirements |
|-------|-----------------|
| 1: VALIDATED | Schema valid, MAI defined, forbidden actions defined |
| 2: TESTED | Demo executions successful, escalations tested |
| 3: CERTIFIED | Human review complete, risk assessment done |
| 4: PRODUCTION | Deployed 7+ days, >95% success rate, no incidents |

---

## Compliance Reporting

### Available Report Presets

```bash
# List available presets
node scripts/generate-report.js --list
```

| Preset | Description |
|--------|-------------|
| `exec-summary` | Executive briefing on risk posture |
| `full-assessment` | Detailed control-by-control analysis |
| `gap-analysis` | Missing controls and remediation |
| `audit-package` | Evidence links for auditors |
| `fedramp` | FedRAMP-focused NIST report |
| `erm` | COSO ERM focus |
| `certification` | Pack certification summary |
| `risk-profile` | Risk profile documentation |

### Generating Reports

```bash
# Executive summary
node scripts/generate-report.js exec-summary

# Full assessment with author
node scripts/generate-report.js full-assessment \
  --author "Security Team" \
  --org "Agency XYZ" \
  -o compliance/assessment.md

# FedRAMP report
node scripts/generate-report.js fedramp -o compliance/fedramp.md
```

### Framework Mappings

ACE maps controls to:

- **NIST SP 800-53 Rev. 5** - Security controls (used in RMF)
- **COSO ERM 2017** - Enterprise risk management principles
- **ISO 31000:2018** - Risk management process

---

## Evidence Management

### Evidence Bundle Structure

```
evidence/YYYY-MM-DD_domain_exec-ID/
├── manifest.json           # Artifact inventory with hashes
├── extraction_log.json     # Action-by-action audit trail
├── source_context.json     # Data provenance
├── opportunity.json        # Structured data output
├── opportunity.md          # Human-readable summary
├── screenshots/            # Visual evidence
│   ├── milestone_001.png
│   └── milestone_002.png
└── seal.status             # UNSEALED or SEALED
```

### Verifying Evidence

```bash
# Verify bundle integrity
node scripts/verify-evidence.js evidence/2024-01-15_sam-gov_exec-001/

# Verify all bundles
node scripts/verify-evidence.js evidence/ --all
```

### Seal State Machine

```
UNSEALED  →  In progress, can be modified
    │
    ▼
SEALED    →  Complete, hash-locked, immutable
```

Once sealed, any modification will fail hash verification.

---

## Production Deployment

### Pre-Deployment Checklist

```bash
[ ] NODE_ENV=production is set
[ ] AUTH_PROVIDER is set to a real provider (not mock)
[ ] ANTHROPIC_API_KEY is a real key (not placeholder)
[ ] ACE_STRICT_MODE=true is set
[ ] ACE_DEMO_MODE is NOT set or is false
[ ] No ALLOW_* override variables are set
[ ] Run: npm run validate-config
```

### Production Configuration

```bash
# Production environment
export NODE_ENV=production
export ACE_STRICT_MODE=true
export AUTH_PROVIDER=auth0
export AUTH0_DOMAIN=your-domain.auth0.com
export AUTH0_CLIENT_ID=xxx
export AUTH0_CLIENT_SECRET=xxx
```

### Monitoring

Monitor these metrics in production:

- Execution success rate (target: >95%)
- Escalation frequency
- Evidence bundle seal rate
- Human approval response times

---

## Troubleshooting

### Common Issues

#### "No authentication provider configured"

```bash
# Cause: Running in production without auth provider
# Solution: Configure AUTH_PROVIDER

export AUTH_PROVIDER=auth0
export AUTH0_DOMAIN=xxx
export AUTH0_CLIENT_ID=xxx
```

#### "Demo mode is enabled in production"

```bash
# Cause: ACE_DEMO_MODE=true in production
# Solution: Disable demo mode

unset ACE_DEMO_MODE
# or
export ACE_DEMO_MODE=false
```

#### "Pack hash mismatch"

```bash
# Cause: Pack file modified after registration
# Solution: Re-register the pack

node scripts/jobpack-cli.js register workforce/jobpacks/MyPack.json --force
```

#### "Certification failed"

```bash
# Cause: Pack doesn't meet certification criteria
# Solution: Run with --verbose to see failures

node scripts/certify-pack.js MyPack.json --verbose
```

### Debug Mode

```bash
# Enable debug logging
export LOG_LEVEL=debug
npm run dev
```

### Getting Help

- Check `PRODUCTION_SAFETY.md` for security guidelines
- Review `governance/FrameworkControlMapping.ts` for compliance details
- Run `npm run validate-config` to check configuration

---

## Quick Reference

### CLI Commands

```bash
# Configuration
npm run validate-config       # Validate environment

# Job Packs
node scripts/jobpack-cli.js list                # List packs
node scripts/jobpack-cli.js info <pack_id>      # Pack details
node scripts/certify-pack.js <pack.json>        # Certify pack
node scripts/certify-pack.js pack.json --emit-certificate  # Emit portable cert

# Reports
node scripts/generate-report.js <preset>        # Generate report
node scripts/generate-report.js --list          # List presets

# Evidence
node scripts/verify-evidence.js <bundle>        # Verify bundle

# Golden Path Demo (Full Story)
node scripts/golden-path-demo.js                # Complete governance demo
node scripts/golden-path-demo.js -o ./output    # Demo with output dir
```

### Environment Quick Setup

```bash
# Development
cp .env.example .env
# Edit .env with API key
npm run dev

# Demo (no API)
ACE_DEMO_MODE=true npm run dev

# Production
NODE_ENV=production ACE_STRICT_MODE=true npm start
```

---

## Golden Path Demo

The golden path demo script runs the complete governance story in one command:

```bash
node scripts/golden-path-demo.js
```

**What it demonstrates:**

1. **Load Job Pack** - Validates pack structure and schema
2. **Run Certification** - Executes automated Level 1 checks
3. **Simulate Execution** - Creates evidence artifacts
4. **Seal Bundle** - Hash-locks the evidence (immutable)
5. **Generate Reports** - Creates executive summary + audit package
6. **Emit Certificate** - Produces portable certification.json
7. **Display Badge** - Shows certification status

**Use cases:**
- Sales demonstrations
- Regression testing
- Onboarding new operators
- Validating pack changes

---

## Portable Certification

Pack certificates are portable artifacts that ship with your packs:

```
workforce/jobpacks/MyPack/
├── MyPack.json           # The Job Pack
└── certification.json    # Portable certificate
```

**To emit a certificate:**

```bash
node scripts/certify-pack.js MyPack.json --emit-certificate
```

**Certificate contents:**
- Pack identity (ID, version, hash)
- Certification level and timestamp
- Criteria summary (passed/failed)
- Risk profile compatibility
- Verification hash

Customers can verify certificates independently using `verifyPackCertificate()`.

---

## Execution Gate

Risk profiles include a certification gate:

```typescript
job_pack_policy: {
  min_pack_certification_level: 2  // TESTED
}
```

| Profile | Min Level | Meaning |
|---------|-----------|---------|
| CONSERVATIVE | 3 (CERTIFIED) | Requires human review |
| BALANCED | 2 (TESTED) | Requires execution evidence |
| AGGRESSIVE | 1 (VALIDATED) | Just needs schema valid |

The executor refuses to run packs below the profile's minimum certification level.

---

## Industry Profiles

### Overview

Industry profiles are pre-configured risk profiles for specific compliance frameworks:

| Profile | Industry | Key Frameworks | Min Cert Level |
|---------|----------|----------------|----------------|
| **FedRAMP** | Federal Government | FedRAMP, NIST 800-53, FISMA | Level 3 |
| **HIPAA** | Healthcare | HIPAA, HITECH, NIST CSF | Level 3 |
| **SOC 2** | Technology/SaaS | SOC 2 Type II, AICPA TSC | Level 2 |
| **PCI DSS** | Financial/Retail | PCI DSS v4.0 | Level 3 |
| **GDPR** | EU Operations | GDPR, ePrivacy | Level 2 |

### Using Industry Profiles

```bash
# List all industry profiles
npx tsx scripts/industry-profiles.js --list

# View detailed profile
npx tsx scripts/industry-profiles.js --profile FEDRAMP

# Compare profiles
npx tsx scripts/industry-profiles.js --compare FEDRAMP,HIPAA,SOC2

# Search by framework
npx tsx scripts/industry-profiles.js --framework NIST
```

### Profile Contents

Each industry profile includes:

- **Metadata**: Compliance frameworks, suitable use cases, retention requirements
- **Risk Appetite**: Forbidden actions, approval requirements, MAI limits
- **Risk Tolerance**: Confidence thresholds, retry limits, anomaly detection

```typescript
import { getIndustryProfile } from './governance/IndustryProfiles';

// Load FedRAMP profile
const fedramp = getIndustryProfile('FEDRAMP');

// Apply to risk profile
const profile: RiskProfile = {
  appetite: fedramp.appetite,
  tolerance: fedramp.tolerance,
  // ...
};
```

---

## Certification as a Service (CaaS)

### Overview

CaaS provides professional certification services for Job Packs:

| Tier | Price | Target Level | Turnaround |
|------|-------|--------------|------------|
| **Basic** | $99 | Level 1 (Validated) | 1 day |
| **Standard** | $499 | Level 2 (Tested) | 3 days |
| **Premium** | $1,999 | Level 3 (Certified) | 7 days |

### What's Included

**Basic ($99)**
- Automated schema validation
- MAI boundary verification
- Basic certification report

**Standard ($499)**
- Everything in Basic
- Demo environment test runs (5x)
- Escalation trigger testing
- Evidence bundle review
- Test coverage report

**Premium ($1,999)**
- Everything in Standard
- Human expert review
- Risk assessment
- Compliance mapping
- Custom recommendations
- Priority support
- Certification badge

### Requesting Certification

```typescript
import { createCertificationRequest } from './governance/ProductionPackLibrary';

const request = createCertificationRequest(
  'MyPack',           // pack_id
  '1.0.0',            // version
  'abc123...',        // hash
  'ACME Corp',        // organization
  'ops@acme.com',     // email
  'Jane Operator',    // name
  'STANDARD',         // tier
  'STANDARD'          // priority
);
```

---

## Operational Health

### Overview

Operational health monitoring tracks three key areas:

1. **UI Anchor Health** - Detect when target sites change
2. **Drift Detection** - Track pack version changes
3. **Execution History** - Analyze run patterns and success rates

### Running Health Checks

```bash
# Run demo health check
npx tsx scripts/health-check.js --demo
```

### UI Anchor Health

Monitors critical UI elements to detect site changes:

```typescript
const anchors = [
  { anchor_id: 'search_input', selector: '#search', criticality: 'CRITICAL' },
  { anchor_id: 'apply_button', selector: '.apply-btn', criticality: 'HIGH' }
];

const health = checkUIHealth(packId, anchors, currentState);
// Returns: overall_status, health_score, issues[]
```

### Drift Detection

Tracks pack version changes over time:

```typescript
const drift = detectDrift(packId, currentVersion, currentHash, versionHistory);
// Returns: has_drift, drift_type, recommendations[]
```

### Execution History

Analyzes run patterns for anomalies:

```typescript
const history = analyzeExecutionHistory(packId, executions);
// Returns: success_rate, avg_duration, health_score, recommendations[]
```

### Health Dashboard

Combined view of all health metrics:

```typescript
const dashboard = generateHealthDashboard(packId, uiHealth, drift, history);
// Returns: overall_status, overall_score, critical_issues[], recommendations[]
```

---

## Pack Economics

### Overview

Pack Economics tracks the business value of automation:

- **ROI Calculation** - Return on investment per execution
- **Time Savings** - Hours saved vs manual process
- **Cost Analysis** - Total cost of ownership
- **License Management** - Usage tracking and limits

### Running Economics Report

```bash
# Run demo economics report
npx tsx scripts/economics-report.js --demo
```

### Key Metrics

| Metric | Formula |
|--------|---------|
| **Manual Cost** | manual_time × hourly_rate |
| **Automated Cost** | platform_fee + per_execution_cost |
| **Savings** | manual_cost - automated_cost |
| **ROI** | (savings / automated_cost) × 100 |
| **Break-even** | setup_cost / savings_per_execution |

### License Tiers

| Tier | Price/Month | Executions | Support |
|------|-------------|------------|---------|
| **Trial** | $0 | 10 | Email |
| **Standard** | $99 | 100 | Email |
| **Professional** | $499 | 1,000 | Priority |
| **Enterprise** | Custom | Unlimited | Dedicated |

### Using Pack Economics

```typescript
import { calculatePackEconomics, checkLicense } from './governance/PackEconomics';

// Calculate ROI
const baseline = {
  manual_time_minutes: 45,
  manual_hourly_rate: 75,
  automated_time_minutes: 3,
  per_execution_cost: 0.50
};

const economics = calculatePackEconomics(baseline, executions);
console.log(`ROI: ${economics.average_roi}%`);
console.log(`Time Saved: ${economics.total_time_saved_hours} hours`);

// Check license
const status = checkLicense(license);
if (status.valid && status.remaining_executions > 0) {
  // Execute pack
}
```

---

## Pack Library

### Overview

The Production Pack Library provides a catalog of certified Job Packs:

### Categories

| Category | Description | Example Packs |
|----------|-------------|---------------|
| **PROCUREMENT** | Government contracting | SAMGovOpportunityCapture |
| **GRANTS** | Federal/state grants | GrantsGovOpportunityFinder |
| **HIRING** | Job posting research | USAJobsSearch |
| **COMPLIANCE** | Regulatory automation | FedRAMPScanReporter |
| **RESEARCH** | Data research | SECFilingsExtractor |
| **FINANCE** | Financial data | EdgarCompanySearch |
| **HEALTHCARE** | Healthcare systems | CMSProviderLookup |
| **LEGAL** | Legal research | PACERCaseFinder |
| **REAL_ESTATE** | Property data | ZillowMarketAnalyzer |

### Searching the Library

```typescript
import { searchLibrary } from './governance/ProductionPackLibrary';

// Search by category
const grantPacks = searchLibrary(library, { category: 'GRANTS' });

// Search by certification level
const certifiedPacks = searchLibrary(library, { min_certification: 3 });

// Search by price
const freePacks = searchLibrary(library, { max_price: 0 });

// Search by profile compatibility
const conservativePacks = searchLibrary(library, { compatible_profile: 'CONSERVATIVE' });
```

---

## Quick Reference - New CLI Commands

```bash
# Industry Profiles
npx tsx scripts/industry-profiles.js --list            # List all profiles
npx tsx scripts/industry-profiles.js --profile HIPAA   # Show HIPAA profile
npx tsx scripts/industry-profiles.js --compare A,B,C   # Compare profiles

# Operational Health
npx tsx scripts/health-check.js --demo                 # Run health check demo

# Pack Economics
npx tsx scripts/economics-report.js --demo             # Run economics demo

# Golden Path Demo
npx tsx scripts/golden-path-demo.js                    # Complete governance demo
```

---

*Document Version: 2.0.0*
*Last Updated: 2026*
*Maintained by: ACE Governance Team*
