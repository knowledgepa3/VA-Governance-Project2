# ISO 31000:2018 Risk Management Compliance Mapping

**Platform:** ACE Governance Platform
**Generated:** 2026-02-01T06:34:51.574Z
**Standard:** ISO 31000:2018

---

## Executive Summary

This document maps ACE Governance Platform controls to ISO 31000 risk management process clauses.

### Clause Coverage

| Clause | Process | Status |
|--------|---------|--------|
| 5.2 | Leadership and Commitment | 📋 |
| 5.4 | Organizational Integration | ⚙️ |
| 6.3 | Scope, Context and Criteria | ⚙️ |
| 6.4 | Risk Assessment | ✅ |
| 6.5 | Risk Treatment | ✅ |
| 6.6 | Monitoring and Review | ✅ |
| 6.7 | Recording and Reporting | 📋 |

---

## Status Legend

| Status | Icon | Meaning |
|--------|------|---------|
| ENFORCED | ✅ | Runtime gate exists that blocks non-compliant actions |
| EVIDENCED | 📋 | Artifact is produced that proves compliance |
| CONFIGURABLE | ⚙️ | Risk profile controls this behavior |

---

## Clause 5.2: Leadership and Commitment

**Status:** 📋 1 EVIDENCED / ⚙️ 2 CONFIGURABLE

| Status | Description |
|--------|-------------|
| ⚙️ CONFIGURABLE | Profile approval workflow ensures leadership buy-in |
| 📋 EVIDENCED | approved_by, approved_by_role track accountability |
| ⚙️ CONFIGURABLE | review_frequency_days enforces ongoing commitment |

---

## Clause 5.4: Organizational Integration

**Status:** ⚙️ CONFIGURABLE

| Status | Description |
|--------|-------------|
| ⚙️ CONFIGURABLE | Profile scope integrates with org structure |
| ⚙️ CONFIGURABLE | entity_ids link to organizational units |
| ⚙️ CONFIGURABLE | environments control deployment contexts |

---

## Clause 6.3: Scope, Context and Criteria

**Status:** ⚙️ CONFIGURABLE

| Status | Description |
|--------|-------------|
| ⚙️ CONFIGURABLE | RiskAppetite defines criteria for acceptable risk |
| ⚙️ CONFIGURABLE | RiskTolerance defines criteria for deviation |
| ⚙️ CONFIGURABLE | Profile scope defines organizational context |

---

## Clause 6.4: Risk Assessment

**Status:** ✅ 1 ENFORCED / 📋 2 EVIDENCED

| Status | Description |
|--------|-------------|
| ✅ ENFORCED | validateRiskProfile() assesses profile risks before use |
| 📋 EVIDENCED | compareProfiles() assesses change risks with impact |
| 📋 EVIDENCED | Confidence thresholds assess data risks per field |

---

## Clause 6.5: Risk Treatment

**Status:** ✅ 2 ENFORCED / 📋 1 EVIDENCED

| Status | Description |
|--------|-------------|
| ✅ ENFORCED | MAI levels determine and enforce treatment approach |
| ✅ ENFORCED | Escalation actions implement treatment responses |
| 📋 EVIDENCED | Evidence requirements support treatment verification |

---

## Clause 6.6: Monitoring and Review

**Status:** ✅ 1 ENFORCED / 📋 1 EVIDENCED / ⚙️ 1 CONFIGURABLE

| Status | Description |
|--------|-------------|
| ✅ ENFORCED | Real-time escalation monitoring during execution |
| ⚙️ CONFIGURABLE | review_frequency_days enforces periodic review |
| 📋 EVIDENCED | change_log enables audit review |

---

## Clause 6.7: Recording and Reporting

**Status:** 📋 EVIDENCED

| Status | Description |
|--------|-------------|
| 📋 EVIDENCED | Evidence bundles record all activities |
| 📋 EVIDENCED | manifest.json reports on bundle integrity |
| 📋 EVIDENCED | extraction_log.json reports on execution details |

---

