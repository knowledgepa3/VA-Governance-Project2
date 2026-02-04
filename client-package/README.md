# ACE Governance Platform

## Governed AI Execution for Regulated Industries

> **Security Statement**: ACE does not require credentials, does not submit applications, and does not perform irreversible actions unless explicitly approved. Every action is logged, hash-sealed, and verifiable.

---

## What This Is NOT

| ❌ NOT This | ✅ Instead |
|-------------|-----------|
| Autonomous agents | Governed executors following certified procedures |
| Black box AI | Verifiable evidence you can audit |
| Credential storage | Read-only operations on public data |
| Form submission | Data capture for human decision |
| "Trust our AI" | "Verify our evidence" |

**We don't ask you to trust us. We give you evidence to verify.**

---

## Quick Start (5 Minutes)

### 1. Install

```bash
npm install
```

### 2. Verify Setup

```bash
npx tsx verify-setup.js
```

### 3. Run Demo

```bash
npx tsx scripts/run-pack.js --demo
```

This shows:
- Pre-execution gate checks
- MAI boundary enforcement
- Evidence bundle generation
- Compliance-ready output

---

## How It Works

```
┌─────────────────────────────────────────────────────────────────┐
│                      EXECUTION FLOW                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. LOAD JOB PACK                                               │
│     └─ Certified procedures for specific tasks                  │
│                                                                 │
│  2. CHECK GATES                                                 │
│     ├─ Certification level meets profile requirement?           │
│     ├─ Domain in allowed list?                                  │
│     └─ Pack enabled for this environment?                       │
│                                                                 │
│  3. EXECUTE WITH MAI ENFORCEMENT                                │
│     ├─ INFORMATIONAL → runs automatically                       │
│     ├─ ADVISORY → asks human first (configurable)               │
│     └─ MANDATORY → always requires approval                     │
│                                                                 │
│  4. CAPTURE EVIDENCE                                            │
│     ├─ Screenshots at milestones                                │
│     ├─ Action log with timestamps                               │
│     └─ Data extraction with provenance                          │
│                                                                 │
│  5. SEAL BUNDLE                                                 │
│     └─ Hash-locked, tamper-evident, audit-ready                 │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Using with Claude

### Option A: Claude Desktop + MCP

```
Execute the GrantsGov Job Pack against https://grants.gov
Use the BALANCED risk profile.
Pack location: packs/GrantsGovOpportunityFinder.json

Follow MAI boundaries:
- INFORMATIONAL: execute automatically
- ADVISORY: show me first
- MANDATORY: always ask permission

Save evidence to evidence/
```

### Option B: Claude Chrome Extension

1. Open Claude in Chrome
2. Navigate to target site
3. Provide the same instructions

---

## What's Included

```
├── packs/                    # Certified Job Packs
│   ├── GrantsGovOpportunityFinder.json   ✓ Level 2 Certified
│   └── SAMGovOpportunityCapture.json     ✓ Level 2 Certified
│
├── profiles/                 # Risk Profiles
│   ├── balanced.json         # Standard enterprise use
│   └── fedramp.json          # Federal compliance
│
├── governance/               # Governance engine
├── executor/                 # Execution engine
├── evidence/                 # Output: evidence bundles
└── compliance/               # Output: compliance reports
```

---

## Risk Profiles

| Profile | Max MAI Level | Min Cert | Best For |
|---------|---------------|----------|----------|
| **Balanced** | ADVISORY | Level 2 | General enterprise |
| **FedRAMP** | INFORMATIONAL | Level 3 | Federal contractors |

---

## Evidence Bundle

Every execution produces a sealed evidence bundle:

```json
{
  "bundle_id": "BUNDLE-1234567890",
  "status": "SEALED",
  "seal_hash": "a1b2c3...",
  "artifacts": [
    { "type": "SCREENSHOT", "file": "initial_page.png" },
    { "type": "DATA", "file": "extracted_opportunities.json" },
    { "type": "LOG", "file": "action_log.json" }
  ]
}
```

The seal hash proves nothing was modified after capture.

---

## Generating Compliance Reports

```bash
# Audit package for your compliance team
npx tsx scripts/generate-report.js audit-package -o compliance/audit.md

# FedRAMP-specific report
npx tsx scripts/generate-report.js fedramp -o compliance/fedramp.md
```

---

## Support

- **Documentation**: See `docs/OPERATOR_GUIDE.md`
- **Issues**: Contact your account representative
- **Emergency**: [support contact]

---

## Security Notes

- No credentials are stored or transmitted
- No forms are submitted without explicit human approval
- No irreversible actions are performed
- All evidence is hash-sealed and tamper-evident
- Audit trails map to NIST 800-53, COSO ERM, ISO 31000

---

*ACE Governance Platform v2.0.0*
*© 2026 - Enterprise License*
