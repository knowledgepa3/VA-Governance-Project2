# NIST SP 800-53 Rev. 5 Compliance Mapping (RMF-Aligned)

**Platform:** ACE Governance Platform
**Generated:** 2026-02-01T06:34:51.571Z
**Standard:** NIST SP 800-53 Rev. 5 (Security and Privacy Controls)
**Process:** NIST Risk Management Framework (RMF)

---

## Important Distinction

- **NIST RMF** = the *process* (Categorize → Select → Implement → Assess → Authorize → Monitor)
- **NIST SP 800-53** = the *controls* (AC, AU, CA, CM, IR, RA families)

This document maps ACE controls to **SP 800-53 controls** that organizations select and implement as part of the **RMF process**.

---

## Executive Summary

| Metric | Value |
|--------|-------|
| Controls Mapped | 18 |
| Implementation Points | 54 |
| ✅ ENFORCED (Runtime Gates) | 18 |
| 📋 EVIDENCED (Artifacts Produced) | 18 |
| ⚙️ CONFIGURABLE (Profile-Controlled) | 18 |

### Control Families

| Family | Description | Controls |
|--------|-------------|----------|
| AC | Access Control | 4 |
| AU | Audit and Accountability | 5 |
| CA | Assessment, Authorization, and Monitoring | 2 |
| CM | Configuration Management | 3 |
| IR | Incident Response | 2 |
| RA | Risk Assessment | 2 |

---

## Status Legend

| Status | Icon | Meaning |
|--------|------|---------|
| ENFORCED | ✅ | Runtime gate exists that blocks non-compliant actions |
| EVIDENCED | 📋 | Artifact is produced that proves compliance |
| CONFIGURABLE | ⚙️ | Risk profile controls this behavior |
| PARTIAL | ⚠️ | Exists but may need additional configuration |

---

## AC - Access Control

### AC-1: Policy and Procedures

**Status:** ✅ 1 ENFORCED / ⚙️ 2 CONFIGURABLE

#### Implementation Details

| Status | Description |
|--------|-------------|
| ⚙️ CONFIGURABLE | RiskProfile.appetite defines organizational access policy |
| ✅ ENFORCED | Job Pack permissions.forbidden defines prohibited actions at runtime |
| ⚙️ CONFIGURABLE | MAI levels (Mandatory/Advisory/Informational) define access tiers |

#### Evidence Artifacts

- `RiskProfile JSON (versioned, hash-verified)`
- `Job Pack permission blocks`
- `Profile change audit log`

---

### AC-2: Account Management

**Status:** ✅ 2 ENFORCED / ⚙️ 1 CONFIGURABLE

#### Implementation Details

| Status | Description |
|--------|-------------|
| ⚙️ CONFIGURABLE | auth_policy.allow_authenticated_sessions controls session use |
| ✅ ENFORCED | auth_policy.allow_account_modifications prevents account changes |
| ✅ ENFORCED | Forbidden action: create_account blocks at runtime |

#### Evidence Artifacts

- `Risk appetite auth_policy configuration`
- `Execution logs showing blocked account creation attempts`

---

### AC-3: Access Enforcement

**Status:** ✅ 2 ENFORCED / 📋 1 EVIDENCED

#### Implementation Details

| Status | Description |
|--------|-------------|
| ✅ ENFORCED | JobPackExecutor.checkPermission() enforces before every action |
| ✅ ENFORCED | isActionAllowed() validates against MAI boundaries at runtime |
| 📋 EVIDENCED | Permission check results logged in extraction_log.json |

#### Evidence Artifacts

- `JobPackExecutor.ts permission check implementation`
- `Execution logs with permission check results`

---

### AC-6: Least Privilege

**Status:** ✅ 2 ENFORCED / ⚙️ 1 CONFIGURABLE

#### Implementation Details

| Status | Description |
|--------|-------------|
| ⚙️ CONFIGURABLE | Job Packs define minimum necessary permissions per task |
| ✅ ENFORCED | INFORMATIONAL level = read-only by default, enforced at runtime |
| ✅ ENFORCED | MANDATORY actions require explicit human approval before execution |

#### Evidence Artifacts

- `Job Pack permissions.allowed (minimal set)`
- `MAI profile showing action distribution`

---

## AU - Audit and Accountability

### AU-2: Event Logging

**Status:** 📋 EVIDENCED

#### Implementation Details

| Status | Description |
|--------|-------------|
| 📋 EVIDENCED | extraction_log.json captures every action with timestamp |
| 📋 EVIDENCED | Evidence bundle records all state changes with artifacts |
| 📋 EVIDENCED | Profile change_log tracks configuration changes with attribution |

#### Evidence Artifacts

- `extraction_log.json in evidence bundle`
- `Profile audit.change_log array`

---

### AU-3: Content of Audit Records

**Status:** 📋 EVIDENCED

#### Implementation Details

| Status | Description |
|--------|-------------|
| 📋 EVIDENCED | Each log entry includes: timestamp, action, result, duration, actor |
| 📋 EVIDENCED | source_context.json captures tool identity and access mode |
| 📋 EVIDENCED | manifest.json records artifact hashes for integrity verification |

#### Evidence Artifacts

- `extraction_log.json entry structure`
- `source_context.json fields`
- `manifest.json artifact_hashes`

---

### AU-6: Audit Record Review

**Status:** ✅ 2 ENFORCED / ⚙️ 1 CONFIGURABLE

#### Implementation Details

| Status | Description |
|--------|-------------|
| ✅ ENFORCED | verifyEvidenceBundle.js validates hash integrity before use |
| ✅ ENFORCED | Sealed bundles cannot be modified post-seal (state machine) |
| ⚙️ CONFIGURABLE | Profile review_frequency_days enforces periodic review schedule |

#### Evidence Artifacts

- `Bundle verification script output`
- `Seal status in manifest.json`

---

### AU-9: Protection of Audit Information

**Status:** ✅ 2 ENFORCED / 📋 1 EVIDENCED

#### Implementation Details

| Status | Description |
|--------|-------------|
| ✅ ENFORCED | SHA-256 hashes detect tampering (verification fails on mismatch) |
| ✅ ENFORCED | Seal state machine (UNSEALED → SEALED) prevents post-hoc modification |
| 📋 EVIDENCED | pack_hash links execution to specific profile version |

#### Evidence Artifacts

- `manifest.json hash values`
- `seal.pack_hash linking to profile`

---

### AU-11: Audit Record Retention

**Status:** ⚙️ CONFIGURABLE

#### Implementation Details

| Status | Description |
|--------|-------------|
| ⚙️ CONFIGURABLE | evidence.retention_policy in Job Pack defines retention period |
| ⚙️ CONFIGURABLE | Standard: 30 days, Escalated: 90 days (configurable) |
| ⚙️ CONFIGURABLE | Retention policy configurable per risk profile |

#### Evidence Artifacts

- `Job Pack evidence.retention_policy`
- `Archived evidence bundles with retention metadata`

---

## CA - Assessment, Authorization, and Monitoring

### CA-2: Control Assessments

**Status:** ✅ ENFORCED

#### Implementation Details

| Status | Description |
|--------|-------------|
| ✅ ENFORCED | validateRiskProfile() assesses profile completeness before use |
| ✅ ENFORCED | validateJobPack() assesses pack structure before registration |
| ✅ ENFORCED | validateEvidenceBundle() assesses artifacts before sealing |

#### Evidence Artifacts

- `Validation function outputs`
- `Profile validation results`

---

### CA-7: Continuous Monitoring

**Status:** ✅ 1 ENFORCED / 📋 1 EVIDENCED / ⚙️ 1 CONFIGURABLE

#### Implementation Details

| Status | Description |
|--------|-------------|
| ✅ ENFORCED | Real-time escalation triggers during execution halt on detection |
| 📋 EVIDENCED | Confidence thresholds monitored and recorded per field |
| ⚙️ CONFIGURABLE | Anomaly detection flags unusual patterns (configurable sensitivity) |

#### Evidence Artifacts

- `Escalation trigger logs`
- `Field confidence scores in opportunity.json`

---

## CM - Configuration Management

### CM-2: Baseline Configuration

**Status:** 📋 2 EVIDENCED / ⚙️ 1 CONFIGURABLE

#### Implementation Details

| Status | Description |
|--------|-------------|
| ⚙️ CONFIGURABLE | CONSERVATIVE/BALANCED/AGGRESSIVE presets define baselines |
| 📋 EVIDENCED | Profile version tracks deviations from baseline |
| 📋 EVIDENCED | Registry index maintains pack inventory with hashes |

#### Evidence Artifacts

- `Preset profile definitions`
- `profile_version field`
- `_registry_index.json`

---

### CM-3: Configuration Change Control

**Status:** ✅ 1 ENFORCED / 📋 2 EVIDENCED

#### Implementation Details

| Status | Description |
|--------|-------------|
| 📋 EVIDENCED | Profile change_log records all modifications with attribution |
| 📋 EVIDENCED | Each change includes: who, when, what, why, previous_hash |
| ✅ ENFORCED | Previous version hash enables chain verification |

#### Evidence Artifacts

- `ProfileChangeEntry records`
- `previous_version_hash chain`

---

### CM-6: Configuration Settings

**Status:** ⚙️ CONFIGURABLE

#### Implementation Details

| Status | Description |
|--------|-------------|
| ⚙️ CONFIGURABLE | Risk appetite defines allowed settings |
| ⚙️ CONFIGURABLE | Risk tolerance defines operational parameters |
| ⚙️ CONFIGURABLE | Profile scope limits where settings apply |

#### Evidence Artifacts

- `RiskAppetite configuration`
- `RiskTolerance parameters`
- `Profile scope definition`

---

## IR - Incident Response

### IR-4: Incident Handling

**Status:** ✅ 1 ENFORCED / 📋 1 EVIDENCED / ⚙️ 1 CONFIGURABLE

#### Implementation Details

| Status | Description |
|--------|-------------|
| ⚙️ CONFIGURABLE | Escalation triggers define incident detection criteria |
| ✅ ENFORCED | stop_and_ask action halts execution for human intervention |
| 📋 EVIDENCED | capture_evidence action preserves incident context |

#### Evidence Artifacts

- `Escalation trigger definitions`
- `Escalation logs in extraction_log.json`

---

### IR-6: Incident Reporting

**Status:** 📋 2 EVIDENCED / ⚙️ 1 CONFIGURABLE

#### Implementation Details

| Status | Description |
|--------|-------------|
| 📋 EVIDENCED | Escalated bundles flagged with severity level |
| ⚙️ CONFIGURABLE | retention_policy extended for escalated incidents |
| 📋 EVIDENCED | Evidence bundle provides full incident context |

#### Evidence Artifacts

- `Escalation severity in logs`
- `Extended retention bundles`

---

## RA - Risk Assessment

### RA-1: Policy and Procedures

**Status:** ⚙️ CONFIGURABLE

#### Implementation Details

| Status | Description |
|--------|-------------|
| ⚙️ CONFIGURABLE | RiskAppetite = organizational policy on acceptable risk |
| ⚙️ CONFIGURABLE | RiskTolerance = operational parameters for deviation |
| ⚙️ CONFIGURABLE | Profile presets provide starting points for policy |

#### Evidence Artifacts

- `RiskProfile documentation`
- `Preset definitions`

---

### RA-3: Risk Assessment

**Status:** ✅ 1 ENFORCED / 📋 2 EVIDENCED

#### Implementation Details

| Status | Description |
|--------|-------------|
| ✅ ENFORCED | compareProfiles() identifies risk impact of changes |
| 📋 EVIDENCED | risk_impact field flags INCREASES_RISK changes |
| 📋 EVIDENCED | Framework mappings enable compliance assessment |

#### Evidence Artifacts

- `Profile comparison diffs`
- `risk_impact analysis`

---

