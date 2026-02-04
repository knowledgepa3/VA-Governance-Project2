# NIST Risk Management Framework (RMF) Compliance Mapping

**Platform:** ACE Governance Platform
**Generated:** 2026-02-01T06:21:26.625Z
**Framework Version:** NIST SP 800-53 Rev. 5

---

## Executive Summary

This document maps ACE Governance Platform controls to NIST RMF security controls.
The platform implements controls across the following families:

| Family | Description | Controls Mapped |
|--------|-------------|-----------------|
| AC | Access Control | 4 |
| AU | Audit and Accountability | 5 |
| CA | Assessment, Authorization, Monitoring | 2 |
| CM | Configuration Management | 3 |
| IR | Incident Response | 2 |
| RA | Risk Assessment | 2 |

---

## AC - Access Control

### AC-1: Policy and Procedures

**Implementation Status:** ✅ IMPLEMENTED

#### ACE Implementation

- RiskProfile.appetite defines organizational access policy
- Job Pack permissions.forbidden defines prohibited actions
- MAI levels (Mandatory/Advisory/Informational) define access tiers

#### Evidence Artifacts

- `RiskProfile JSON (versioned, hash-verified)`
- `Job Pack permission blocks`
- `Profile change audit log`

---

### AC-2: Account Management

**Implementation Status:** ✅ IMPLEMENTED

#### ACE Implementation

- auth_policy.allow_authenticated_sessions controls session use
- auth_policy.allow_account_modifications prevents account changes
- Forbidden action: create_account

#### Evidence Artifacts

- `Risk appetite auth_policy configuration`
- `Execution logs showing no account creation attempts`

---

### AC-3: Access Enforcement

**Implementation Status:** ✅ IMPLEMENTED

#### ACE Implementation

- JobPackExecutor.checkPermission() enforces before every action
- isActionAllowed() validates against MAI boundaries
- Forbidden actions block at runtime, not just policy

#### Evidence Artifacts

- `JobPackExecutor.ts permission check implementation`
- `Execution logs with permission check results`

---

### AC-6: Least Privilege

**Implementation Status:** ✅ IMPLEMENTED

#### ACE Implementation

- Job Packs define minimum necessary permissions per task
- INFORMATIONAL level = read-only by default
- MANDATORY actions require explicit human approval

#### Evidence Artifacts

- `Job Pack permissions.allowed (minimal set)`
- `MAI profile showing action distribution`

---

## AU - Audit and Accountability

### AU-2: Event Logging

**Implementation Status:** ✅ IMPLEMENTED

#### ACE Implementation

- extraction_log.json captures every action with timestamp
- Evidence bundle records all state changes
- Profile change_log tracks configuration changes

#### Evidence Artifacts

- `extraction_log.json in evidence bundle`
- `Profile audit.change_log array`

---

### AU-3: Content of Audit Records

**Implementation Status:** ✅ IMPLEMENTED

#### ACE Implementation

- Each log entry includes: timestamp, action, result, duration
- source_context.json captures tool identity and access mode
- manifest.json records artifact hashes

#### Evidence Artifacts

- `extraction_log.json entry structure`
- `source_context.json fields`
- `manifest.json artifact_hashes`

---

### AU-6: Audit Record Review

**Implementation Status:** ✅ IMPLEMENTED

#### ACE Implementation

- verifyEvidenceBundle.js validates hash integrity
- Sealed bundles cannot be modified post-seal
- Profile review_frequency_days enforces periodic review

#### Evidence Artifacts

- `Bundle verification script output`
- `Seal status in manifest.json`

---

### AU-9: Protection of Audit Information

**Implementation Status:** ✅ IMPLEMENTED

#### ACE Implementation

- SHA-256 hashes detect tampering
- Seal state machine prevents post-hoc modification
- pack_hash links execution to specific profile version

#### Evidence Artifacts

- `manifest.json hash values`
- `seal.pack_hash linking to profile`

---

### AU-11: Audit Record Retention

**Implementation Status:** ✅ IMPLEMENTED

#### ACE Implementation

- evidence.retention_policy in Job Pack defines retention
- Standard: 30 days, Escalated: 90 days
- Configurable per risk profile

#### Evidence Artifacts

- `Job Pack evidence.retention_policy`
- `Archived evidence bundles`

---

## CA - Assessment, Authorization, and Monitoring

### CA-2: Control Assessments

**Implementation Status:** ✅ IMPLEMENTED

#### ACE Implementation

- validateRiskProfile() assesses profile completeness
- validateJobPack() assesses pack structure
- validateEvidenceBundle() assesses execution artifacts

#### Evidence Artifacts

- `Validation function outputs`
- `Profile validation results`

---

### CA-7: Continuous Monitoring

**Implementation Status:** ✅ IMPLEMENTED

#### ACE Implementation

- Real-time escalation triggers during execution
- Confidence thresholds monitored per field
- Anomaly detection flags unusual patterns

#### Evidence Artifacts

- `Escalation trigger logs`
- `Field confidence scores in opportunity.json`
- `Anomaly detection alerts`

---

## CM - Configuration Management

### CM-2: Baseline Configuration

**Implementation Status:** ✅ IMPLEMENTED

#### ACE Implementation

- CONSERVATIVE/BALANCED/AGGRESSIVE presets define baselines
- Profile version tracks deviations from baseline
- Registry index maintains pack inventory

#### Evidence Artifacts

- `Preset profile definitions`
- `profile_version field`
- `_registry_index.json`

---

### CM-3: Configuration Change Control

**Implementation Status:** ✅ IMPLEMENTED

#### ACE Implementation

- Profile change_log records all modifications
- Each change includes: who, when, what, why
- Previous version hash enables chain verification

#### Evidence Artifacts

- `ProfileChangeEntry records`
- `previous_version_hash chain`

---

### CM-6: Configuration Settings

**Implementation Status:** ✅ IMPLEMENTED

#### ACE Implementation

- Risk appetite defines allowed settings
- Risk tolerance defines operational parameters
- Profile scope limits where settings apply

#### Evidence Artifacts

- `RiskAppetite configuration`
- `RiskTolerance parameters`
- `Profile scope definition`

---

## IR - Incident Response

### IR-4: Incident Handling

**Implementation Status:** ✅ IMPLEMENTED

#### ACE Implementation

- Escalation triggers define incident detection
- stop_and_ask action halts execution for human intervention
- capture_evidence action preserves incident context

#### Evidence Artifacts

- `Escalation trigger definitions`
- `Escalation logs in extraction_log.json`

---

### IR-6: Incident Reporting

**Implementation Status:** ✅ IMPLEMENTED

#### ACE Implementation

- Escalated bundles flagged with severity
- retention_policy extended for escalated incidents
- Evidence bundle provides full incident context

#### Evidence Artifacts

- `Escalation severity in logs`
- `Extended retention bundles`

---

## RA - Risk Assessment

### RA-1: Policy and Procedures

**Implementation Status:** ✅ IMPLEMENTED

#### ACE Implementation

- RiskAppetite = organizational policy on acceptable risk
- RiskTolerance = operational parameters for deviation
- Profile presets provide starting points

#### Evidence Artifacts

- `RiskProfile documentation`
- `Preset definitions`

---

### RA-3: Risk Assessment

**Implementation Status:** ✅ IMPLEMENTED

#### ACE Implementation

- compareProfiles() identifies risk impact of changes
- risk_impact field flags INCREASES_RISK changes
- Framework mappings enable compliance assessment

#### Evidence Artifacts

- `Profile comparison diffs`
- `risk_impact analysis`

---

