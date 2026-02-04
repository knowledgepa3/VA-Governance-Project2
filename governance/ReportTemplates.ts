/**
 * REPORT TEMPLATES v1.0.0
 *
 * Pre-built report templates for compliance documentation.
 * Enables one-click generation of audit-ready reports.
 *
 * TEMPLATE TYPES:
 * - Executive Summary: High-level risk posture for leadership
 * - Control Assessment: Detailed control-by-control analysis
 * - Gap Analysis: Missing controls and remediation priorities
 * - Audit Evidence: Linked evidence for auditors
 * - Certification Report: Pack certification status
 */

import {
  NIST_SP_800_53_MAPPINGS,
  COSO_ERM_MAPPINGS,
  ISO_31000_MAPPINGS,
  generateComplianceReport,
  summarizeStatus,
  ImplementationStatus
} from './FrameworkControlMapping';

import { RiskProfile, RiskAppetite, PRESET_PROFILES } from './RiskProfileSchema';
import { CertificationRecord, CERTIFICATION_LEVEL_NAMES, CertificationLevel, CERTIFICATION_CRITERIA } from './PackCertificationSchema';

// =============================================================================
// REPORT TYPES
// =============================================================================

export type ReportType =
  | 'EXECUTIVE_SUMMARY'
  | 'CONTROL_ASSESSMENT'
  | 'GAP_ANALYSIS'
  | 'AUDIT_EVIDENCE'
  | 'CERTIFICATION_STATUS'
  | 'RISK_PROFILE';

export type OutputFormat = 'MARKDOWN' | 'JSON' | 'HTML';

export interface ReportConfig {
  report_type: ReportType;
  output_format: OutputFormat;
  title: string;
  frameworks: ('NIST_SP_800_53' | 'COSO_ERM' | 'ISO_31000')[];
  include_evidence_links: boolean;
  include_remediation: boolean;
  generated_by: string;
  organization?: string;
}

export interface ReportOutput {
  config: ReportConfig;
  generated_at: string;
  content: string;
  metadata: {
    total_controls: number;
    enforced: number;
    evidenced: number;
    configurable: number;
    partial: number;
    gaps: number;
  };
}

// =============================================================================
// REPORT PRESETS
// =============================================================================

export const REPORT_PRESETS: Record<string, Partial<ReportConfig>> = {
  /**
   * Quick executive briefing on risk posture
   */
  'exec-summary': {
    report_type: 'EXECUTIVE_SUMMARY',
    output_format: 'MARKDOWN',
    title: 'ACE Governance - Executive Risk Summary',
    frameworks: ['NIST_SP_800_53', 'COSO_ERM'],
    include_evidence_links: false,
    include_remediation: false
  },

  /**
   * Full control assessment for compliance teams
   */
  'full-assessment': {
    report_type: 'CONTROL_ASSESSMENT',
    output_format: 'MARKDOWN',
    title: 'ACE Governance - Control Assessment Report',
    frameworks: ['NIST_SP_800_53', 'COSO_ERM', 'ISO_31000'],
    include_evidence_links: true,
    include_remediation: true
  },

  /**
   * Gap analysis for remediation planning
   */
  'gap-analysis': {
    report_type: 'GAP_ANALYSIS',
    output_format: 'MARKDOWN',
    title: 'ACE Governance - Gap Analysis Report',
    frameworks: ['NIST_SP_800_53'],
    include_evidence_links: false,
    include_remediation: true
  },

  /**
   * Audit package with evidence links
   */
  'audit-package': {
    report_type: 'AUDIT_EVIDENCE',
    output_format: 'MARKDOWN',
    title: 'ACE Governance - Audit Evidence Package',
    frameworks: ['NIST_SP_800_53', 'COSO_ERM', 'ISO_31000'],
    include_evidence_links: true,
    include_remediation: false
  },

  /**
   * FedRAMP-focused NIST report
   */
  'fedramp': {
    report_type: 'CONTROL_ASSESSMENT',
    output_format: 'MARKDOWN',
    title: 'ACE Governance - FedRAMP Control Assessment',
    frameworks: ['NIST_SP_800_53'],
    include_evidence_links: true,
    include_remediation: true
  },

  /**
   * Enterprise risk management focus
   */
  'erm': {
    report_type: 'CONTROL_ASSESSMENT',
    output_format: 'MARKDOWN',
    title: 'ACE Governance - Enterprise Risk Management Report',
    frameworks: ['COSO_ERM'],
    include_evidence_links: true,
    include_remediation: false
  },

  /**
   * Pack certification summary
   */
  'certification': {
    report_type: 'CERTIFICATION_STATUS',
    output_format: 'MARKDOWN',
    title: 'ACE Governance - Pack Certification Report',
    frameworks: [],
    include_evidence_links: true,
    include_remediation: true
  },

  /**
   * Risk profile documentation
   */
  'risk-profile': {
    report_type: 'RISK_PROFILE',
    output_format: 'MARKDOWN',
    title: 'ACE Governance - Risk Profile Documentation',
    frameworks: ['NIST_SP_800_53', 'COSO_ERM'],
    include_evidence_links: false,
    include_remediation: false
  }
};

// =============================================================================
// REPORT GENERATORS
// =============================================================================

/**
 * Generate executive summary report
 */
function generateExecutiveSummary(config: ReportConfig): ReportOutput {
  const now = new Date().toISOString();
  const metadata = {
    total_controls: 0,
    enforced: 0,
    evidenced: 0,
    configurable: 0,
    partial: 0,
    gaps: 0
  };

  let content = `# ${config.title}\n\n`;
  content += `**Generated:** ${now}\n`;
  content += `**Prepared by:** ${config.generated_by}\n`;
  if (config.organization) {
    content += `**Organization:** ${config.organization}\n`;
  }
  content += `\n---\n\n`;

  content += `## Executive Overview\n\n`;
  content += `This report provides a high-level summary of ACE Governance Platform controls `;
  content += `mapped to ${config.frameworks.join(', ')} frameworks.\n\n`;

  // Summary table
  content += `## Control Status Summary\n\n`;
  content += `| Framework | Total | ✅ Enforced | 📋 Evidenced | ⚙️ Configurable | ⚠️ Partial |\n`;
  content += `|-----------|-------|-------------|--------------|-----------------|------------|\n`;

  for (const framework of config.frameworks) {
    const sections = generateComplianceReport(framework);
    let fwEnforced = 0, fwEvidenced = 0, fwConfigurable = 0, fwPartial = 0;

    for (const section of sections) {
      for (const impl of section.implementation) {
        metadata.total_controls++;
        switch (impl.status) {
          case 'ENFORCED': fwEnforced++; metadata.enforced++; break;
          case 'EVIDENCED': fwEvidenced++; metadata.evidenced++; break;
          case 'CONFIGURABLE': fwConfigurable++; metadata.configurable++; break;
          case 'PARTIAL': fwPartial++; metadata.partial++; break;
        }
      }
    }

    const fwName = framework.replace(/_/g, ' ');
    const total = sections.length;
    content += `| ${fwName} | ${total} | ${fwEnforced} | ${fwEvidenced} | ${fwConfigurable} | ${fwPartial} |\n`;
  }

  content += `\n## Key Findings\n\n`;

  const enforcedPct = Math.round((metadata.enforced / metadata.total_controls) * 100);
  const evidencedPct = Math.round((metadata.evidenced / metadata.total_controls) * 100);

  content += `- **${enforcedPct}%** of control implementations are **runtime-enforced** (actively blocked if violated)\n`;
  content += `- **${evidencedPct}%** of control implementations produce **audit evidence** (artifacts for verification)\n`;
  content += `- All controls are implemented through a combination of enforced gates, evidence production, and configurable policies\n\n`;

  content += `## Governance Architecture\n\n`;
  content += `The ACE platform implements a three-tier governance model:\n\n`;
  content += `1. **Policy Layer** (Risk Appetite): Defines what is allowed at the organizational level\n`;
  content += `2. **Control Layer** (Risk Tolerance): Defines operational parameters and deviation limits\n`;
  content += `3. **Execution Layer** (Job Packs): Enforces controls at runtime with evidence capture\n\n`;

  content += `## Recommendations\n\n`;
  content += `1. Review the full Control Assessment Report for detailed implementation status\n`;
  content += `2. Enable ACE_STRICT_MODE=true in production to ensure enforcement\n`;
  content += `3. Configure risk profiles appropriate to organizational risk appetite\n`;

  return {
    config,
    generated_at: now,
    content,
    metadata
  };
}

/**
 * Generate detailed control assessment report
 */
function generateControlAssessment(config: ReportConfig): ReportOutput {
  const now = new Date().toISOString();
  const metadata = {
    total_controls: 0,
    enforced: 0,
    evidenced: 0,
    configurable: 0,
    partial: 0,
    gaps: 0
  };

  let content = `# ${config.title}\n\n`;
  content += `**Generated:** ${now}\n`;
  content += `**Prepared by:** ${config.generated_by}\n`;
  if (config.organization) {
    content += `**Organization:** ${config.organization}\n`;
  }
  content += `\n---\n\n`;

  for (const framework of config.frameworks) {
    const fwName = framework.replace(/_/g, ' ');
    content += `## ${fwName}\n\n`;

    const sections = generateComplianceReport(framework);

    for (const section of sections) {
      metadata.total_controls++;
      const statusSummary = summarizeStatus(section.implementation);

      content += `### ${section.control_id}: ${section.control_name}\n\n`;
      content += `**Status:** ${statusSummary}\n\n`;

      content += `**Implementation Details:**\n\n`;
      for (const impl of section.implementation) {
        const icon = impl.status === 'ENFORCED' ? '✅' :
                     impl.status === 'EVIDENCED' ? '📋' :
                     impl.status === 'CONFIGURABLE' ? '⚙️' : '⚠️';
        content += `- ${icon} **${impl.status}**: ${impl.description}\n`;

        switch (impl.status) {
          case 'ENFORCED': metadata.enforced++; break;
          case 'EVIDENCED': metadata.evidenced++; break;
          case 'CONFIGURABLE': metadata.configurable++; break;
          case 'PARTIAL': metadata.partial++; break;
        }
      }

      if (config.include_evidence_links && section.evidence_artifacts.length > 0) {
        content += `\n**Evidence Artifacts:**\n\n`;
        for (const artifact of section.evidence_artifacts) {
          content += `- \`${artifact}\`\n`;
        }
      }

      content += `\n---\n\n`;
    }
  }

  return {
    config,
    generated_at: now,
    content,
    metadata
  };
}

/**
 * Generate gap analysis report
 */
function generateGapAnalysis(config: ReportConfig): ReportOutput {
  const now = new Date().toISOString();
  const metadata = {
    total_controls: 0,
    enforced: 0,
    evidenced: 0,
    configurable: 0,
    partial: 0,
    gaps: 0
  };

  let content = `# ${config.title}\n\n`;
  content += `**Generated:** ${now}\n`;
  content += `**Prepared by:** ${config.generated_by}\n`;
  if (config.organization) {
    content += `**Organization:** ${config.organization}\n`;
  }
  content += `\n---\n\n`;

  content += `## Gap Analysis Overview\n\n`;
  content += `This report identifies controls with PARTIAL implementation status or missing evidence artifacts.\n\n`;

  const gaps: Array<{
    framework: string;
    control_id: string;
    control_name: string;
    gap_type: string;
    remediation: string;
  }> = [];

  for (const framework of config.frameworks) {
    const sections = generateComplianceReport(framework);

    for (const section of sections) {
      metadata.total_controls++;

      // Check for PARTIAL implementations
      const partialImpls = section.implementation.filter(i => i.status === 'PARTIAL');
      if (partialImpls.length > 0) {
        metadata.partial += partialImpls.length;
        metadata.gaps++;
        gaps.push({
          framework: framework.replace(/_/g, ' '),
          control_id: section.control_id,
          control_name: section.control_name,
          gap_type: 'PARTIAL IMPLEMENTATION',
          remediation: 'Review partial implementations and complete missing components'
        });
      }

      // Track other statuses
      for (const impl of section.implementation) {
        switch (impl.status) {
          case 'ENFORCED': metadata.enforced++; break;
          case 'EVIDENCED': metadata.evidenced++; break;
          case 'CONFIGURABLE': metadata.configurable++; break;
        }
      }
    }
  }

  if (gaps.length === 0) {
    content += `### ✅ No Gaps Identified\n\n`;
    content += `All controls have ENFORCED, EVIDENCED, or CONFIGURABLE implementation status.\n\n`;
  } else {
    content += `### ⚠️ ${gaps.length} Gap(s) Identified\n\n`;
    content += `| Framework | Control | Name | Gap Type | Remediation Priority |\n`;
    content += `|-----------|---------|------|----------|---------------------|\n`;

    for (const gap of gaps) {
      content += `| ${gap.framework} | ${gap.control_id} | ${gap.control_name} | ${gap.gap_type} | HIGH |\n`;
    }

    if (config.include_remediation) {
      content += `\n## Remediation Recommendations\n\n`;
      for (const gap of gaps) {
        content += `### ${gap.control_id}: ${gap.control_name}\n\n`;
        content += `- **Gap:** ${gap.gap_type}\n`;
        content += `- **Action:** ${gap.remediation}\n`;
        content += `- **Priority:** HIGH\n\n`;
      }
    }
  }

  content += `## Summary Statistics\n\n`;
  content += `| Metric | Count |\n`;
  content += `|--------|-------|\n`;
  content += `| Total Controls | ${metadata.total_controls} |\n`;
  content += `| Enforced | ${metadata.enforced} |\n`;
  content += `| Evidenced | ${metadata.evidenced} |\n`;
  content += `| Configurable | ${metadata.configurable} |\n`;
  content += `| Partial/Gaps | ${metadata.partial} |\n`;

  return {
    config,
    generated_at: now,
    content,
    metadata
  };
}

/**
 * Generate audit evidence package
 */
function generateAuditEvidence(config: ReportConfig): ReportOutput {
  const now = new Date().toISOString();
  const metadata = {
    total_controls: 0,
    enforced: 0,
    evidenced: 0,
    configurable: 0,
    partial: 0,
    gaps: 0
  };

  let content = `# ${config.title}\n\n`;
  content += `**Generated:** ${now}\n`;
  content += `**Prepared by:** ${config.generated_by}\n`;
  if (config.organization) {
    content += `**Organization:** ${config.organization}\n`;
  }
  content += `\n---\n\n`;

  content += `## Audit Evidence Guide\n\n`;
  content += `This document maps each control to its corresponding evidence artifacts.\n`;
  content += `Evidence bundles are located in the \`/evidence/\` directory.\n\n`;

  content += `## Evidence Location Guide\n\n`;
  content += `| Artifact | Location | Purpose |\n`;
  content += `|----------|----------|--------|\n`;
  content += `| Risk Profile | \`/governance/profiles/*.json\` | Policy configuration |\n`;
  content += `| Job Packs | \`/workforce/jobpacks/*.json\` | SOP definitions |\n`;
  content += `| Evidence Bundles | \`/evidence/*/\` | Execution artifacts |\n`;
  content += `| Manifest | \`/evidence/*/manifest.json\` | Bundle integrity |\n`;
  content += `| Extraction Log | \`/evidence/*/extraction_log.json\` | Action audit trail |\n`;
  content += `| Certification Records | \`/evidence/certs/*.json\` | Pack certifications |\n\n`;

  for (const framework of config.frameworks) {
    const fwName = framework.replace(/_/g, ' ');
    content += `## ${fwName} Evidence Mapping\n\n`;

    const sections = generateComplianceReport(framework);

    content += `| Control | Name | Evidence Artifacts |\n`;
    content += `|---------|------|-------------------|\n`;

    for (const section of sections) {
      metadata.total_controls++;
      const artifacts = section.evidence_artifacts.length > 0
        ? section.evidence_artifacts.map(a => `\`${a}\``).join(', ')
        : '_See implementation details_';

      content += `| ${section.control_id} | ${section.control_name} | ${artifacts} |\n`;

      for (const impl of section.implementation) {
        switch (impl.status) {
          case 'ENFORCED': metadata.enforced++; break;
          case 'EVIDENCED': metadata.evidenced++; break;
          case 'CONFIGURABLE': metadata.configurable++; break;
          case 'PARTIAL': metadata.partial++; break;
        }
      }
    }

    content += `\n`;
  }

  return {
    config,
    generated_at: now,
    content,
    metadata
  };
}

/**
 * Generate certification status report
 */
function generateCertificationReport(
  config: ReportConfig,
  certRecords: CertificationRecord[]
): ReportOutput {
  const now = new Date().toISOString();
  const metadata = {
    total_controls: certRecords.length,
    enforced: 0,
    evidenced: 0,
    configurable: 0,
    partial: 0,
    gaps: 0
  };

  let content = `# ${config.title}\n\n`;
  content += `**Generated:** ${now}\n`;
  content += `**Prepared by:** ${config.generated_by}\n`;
  if (config.organization) {
    content += `**Organization:** ${config.organization}\n`;
  }
  content += `\n---\n\n`;

  content += `## Certification Overview\n\n`;
  content += `| Level | Name | Description |\n`;
  content += `|-------|------|-------------|\n`;
  content += `| 0 | DRAFT | In development, not validated |\n`;
  content += `| 1 | VALIDATED | Passes automated schema checks |\n`;
  content += `| 2 | TESTED | Has execution evidence |\n`;
  content += `| 3 | CERTIFIED | Human reviewed and approved |\n`;
  content += `| 4 | PRODUCTION | Deployed and incident-free |\n\n`;

  content += `## Pack Certification Status\n\n`;
  content += `| Pack ID | Version | Level | Status | Certified By |\n`;
  content += `|---------|---------|-------|--------|-------------|\n`;

  for (const record of certRecords) {
    const levelName = CERTIFICATION_LEVEL_NAMES[record.current_level];
    const badge = record.current_level >= CertificationLevel.CERTIFIED ? '✅' :
                  record.current_level >= CertificationLevel.TESTED ? '✓✓' :
                  record.current_level >= CertificationLevel.VALIDATED ? '✓' : '○';

    const certifiedBy = record.certification_history.length > 0
      ? record.certification_history[record.certification_history.length - 1].certified_by
      : '-';

    content += `| ${record.pack_id} | ${record.pack_version} | ${record.current_level} | ${badge} ${levelName} | ${certifiedBy} |\n`;

    if (record.current_level >= CertificationLevel.CERTIFIED) {
      metadata.enforced++;
    } else if (record.current_level >= CertificationLevel.TESTED) {
      metadata.evidenced++;
    } else if (record.current_level >= CertificationLevel.VALIDATED) {
      metadata.configurable++;
    } else {
      metadata.partial++;
      metadata.gaps++;
    }
  }

  if (config.include_remediation && metadata.gaps > 0) {
    content += `\n## Remediation Required\n\n`;
    content += `The following packs require attention before production use:\n\n`;

    for (const record of certRecords) {
      if (record.current_level < CertificationLevel.VALIDATED) {
        const failedCriteria = record.criteria_results.filter(r => !r.passed);
        content += `### ${record.pack_id}\n\n`;
        content += `**Current Level:** ${CERTIFICATION_LEVEL_NAMES[record.current_level]}\n\n`;
        content += `**Failed Criteria:**\n\n`;
        for (const result of failedCriteria.slice(0, 5)) {
          const criterion = CERTIFICATION_CRITERIA.find(c => c.criterion_id === result.criterion_id);
          content += `- ${result.criterion_id}: ${criterion?.name || 'Unknown'}\n`;
        }
        if (failedCriteria.length > 5) {
          content += `- ... and ${failedCriteria.length - 5} more\n`;
        }
        content += `\n`;
      }
    }
  }

  return {
    config,
    generated_at: now,
    content,
    metadata
  };
}

/**
 * Generate risk profile documentation report
 */
function generateRiskProfileReport(
  config: ReportConfig,
  profile?: RiskProfile
): ReportOutput {
  const now = new Date().toISOString();
  const metadata = {
    total_controls: 0,
    enforced: 0,
    evidenced: 0,
    configurable: 0,
    partial: 0,
    gaps: 0
  };

  let content = `# ${config.title}\n\n`;
  content += `**Generated:** ${now}\n`;
  content += `**Prepared by:** ${config.generated_by}\n`;
  if (config.organization) {
    content += `**Organization:** ${config.organization}\n`;
  }
  content += `\n---\n\n`;

  content += `## Risk Profile Presets\n\n`;
  content += `ACE provides three standard risk profile presets:\n\n`;

  for (const [name, presetProfile] of Object.entries(PRESET_PROFILES)) {
    const displayName = name.replace('_PROFILE', '');
    content += `### ${displayName} Profile\n\n`;

    const appetite = presetProfile.appetite;
    content += `**MAI Policy:**\n`;
    content += `- Max Autonomous Level: ${appetite.job_pack_policy.max_autonomous_mai_level}\n`;
    content += `- Sealed Bundles Required: ${appetite.evidence_policy.require_sealed_bundles ? 'Yes' : 'No'}\n\n`;

    content += `**Forbidden Actions:**\n`;
    for (const action of appetite.action_policy.globally_forbidden_actions) {
      content += `- ❌ ${action}\n`;
    }
    content += `\n`;
  }

  if (profile) {
    content += `## Current Profile\n\n`;
    content += `**Profile ID:** ${profile.profile_id}\n`;
    content += `**Version:** ${profile.version}\n`;
    content += `**Scope:** ${profile.scope.environments.join(', ')}\n\n`;

    content += `### Risk Appetite (Policy Layer)\n\n`;
    content += `| Setting | Value |\n`;
    content += `|---------|-------|\n`;
    content += `| Max Autonomous MAI | ${profile.appetite.job_pack_policy.max_autonomous_mai_level} |\n`;
    content += `| Require Sealed Bundles | ${profile.appetite.evidence_policy.require_sealed_bundles} |\n`;
    content += `| Allow Authenticated Sessions | ${profile.appetite.auth_policy.allow_authenticated_sessions} |\n\n`;

    content += `### Risk Tolerance (Control Layer)\n\n`;
    content += `| Setting | Value |\n`;
    content += `|---------|-------|\n`;
    content += `| Critical Field Min Confidence | ${profile.tolerance.confidence.critical_field_minimum}% |\n`;
    content += `| Standard Field Min Confidence | ${profile.tolerance.confidence.standard_field_minimum}% |\n`;
    content += `| Max Retries Per Step | ${profile.tolerance.retry_limits.max_retries_per_step} |\n`;
    content += `| Step Timeout | ${profile.tolerance.timeouts.per_step_ms}ms |\n`;
    content += `| Auto-stop on Anomaly | ${profile.tolerance.escalation.auto_stop_on_anomaly} |\n\n`;
  }

  content += `## Framework Alignment\n\n`;
  content += `Risk profiles map to established frameworks:\n\n`;
  content += `- **NIST SP 800-53 RA-1**: Risk appetite defines organizational policy\n`;
  content += `- **COSO ERM Principle 7**: Risk appetite is a first-class control\n`;
  content += `- **ISO 31000 6.3**: Risk appetite defines criteria for acceptable risk\n`;

  return {
    config,
    generated_at: now,
    content,
    metadata
  };
}

// =============================================================================
// MAIN GENERATOR FUNCTION
// =============================================================================

/**
 * Generate a report based on configuration
 */
export function generateReport(
  config: ReportConfig,
  options?: {
    certRecords?: CertificationRecord[];
    profile?: RiskProfile;
  }
): ReportOutput {
  switch (config.report_type) {
    case 'EXECUTIVE_SUMMARY':
      return generateExecutiveSummary(config);

    case 'CONTROL_ASSESSMENT':
      return generateControlAssessment(config);

    case 'GAP_ANALYSIS':
      return generateGapAnalysis(config);

    case 'AUDIT_EVIDENCE':
      return generateAuditEvidence(config);

    case 'CERTIFICATION_STATUS':
      return generateCertificationReport(config, options?.certRecords || []);

    case 'RISK_PROFILE':
      return generateRiskProfileReport(config, options?.profile);

    default:
      throw new Error(`Unknown report type: ${config.report_type}`);
  }
}

/**
 * Generate report from preset name
 */
export function generateFromPreset(
  presetName: string,
  generatedBy: string,
  organization?: string,
  options?: {
    certRecords?: CertificationRecord[];
    profile?: RiskProfile;
  }
): ReportOutput {
  const preset = REPORT_PRESETS[presetName];
  if (!preset) {
    throw new Error(`Unknown preset: ${presetName}. Available: ${Object.keys(REPORT_PRESETS).join(', ')}`);
  }

  const config: ReportConfig = {
    report_type: preset.report_type || 'CONTROL_ASSESSMENT',
    output_format: preset.output_format || 'MARKDOWN',
    title: preset.title || 'ACE Governance Report',
    frameworks: preset.frameworks || ['NIST_SP_800_53'],
    include_evidence_links: preset.include_evidence_links ?? true,
    include_remediation: preset.include_remediation ?? false,
    generated_by: generatedBy,
    organization
  };

  return generateReport(config, options);
}

/**
 * List available presets
 */
export function listPresets(): Array<{ name: string; description: string; type: ReportType }> {
  return [
    { name: 'exec-summary', description: 'Quick executive briefing on risk posture', type: 'EXECUTIVE_SUMMARY' },
    { name: 'full-assessment', description: 'Full control assessment for compliance teams', type: 'CONTROL_ASSESSMENT' },
    { name: 'gap-analysis', description: 'Gap analysis for remediation planning', type: 'GAP_ANALYSIS' },
    { name: 'audit-package', description: 'Audit package with evidence links', type: 'AUDIT_EVIDENCE' },
    { name: 'fedramp', description: 'FedRAMP-focused NIST report', type: 'CONTROL_ASSESSMENT' },
    { name: 'erm', description: 'Enterprise risk management focus', type: 'CONTROL_ASSESSMENT' },
    { name: 'certification', description: 'Pack certification summary', type: 'CERTIFICATION_STATUS' },
    { name: 'risk-profile', description: 'Risk profile documentation', type: 'RISK_PROFILE' }
  ];
}

export default {
  REPORT_PRESETS,
  generateReport,
  generateFromPreset,
  listPresets
};
