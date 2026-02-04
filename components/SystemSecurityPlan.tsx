/**
 * System Security Plan (SSP-Lite)
 *
 * NIST 800-18 structured, scannable by ISSOs
 * Derived from actual system architecture and controls
 *
 * This is NOT FedRAMP theater - it's a defensible, accurate representation
 * of the ACE system's security posture.
 */

import React, { useState } from 'react';
import {
  Shield, Server, Users, Lock, Eye, FileText, AlertTriangle,
  CheckCircle2, Clock, ChevronDown, ChevronRight, Printer,
  Building2, Fingerprint, Database, Activity, Globe, Scale,
  ExternalLink, Info, Target, Zap, ShieldAlert, Network
} from 'lucide-react';

interface SSPProps {
  telemetry?: any;
  redTeamResult?: any;
}

// ============================================================================
// SSP CONTENT - Derived from actual system
// ============================================================================

const SYSTEM_IDENTIFICATION = {
  name: 'Autonomous Claims Engine (ACE)',
  version: '1.0.0-prototype',
  uniqueId: 'ACE-VA-2024-001',
  owningOrganization: '[ORGANIZATION_PLACEHOLDER]',
  operationalStatus: 'Under Development',
  systemType: 'Major Application',

  description: `The Autonomous Claims Engine (ACE) is a multi-agent AI governance platform
designed to assist VA claims adjudicators in analyzing disability compensation claims.
ACE implements a "Defense in Depth" architecture with mandatory human oversight gates,
ensuring AI-generated analysis remains advisory and subject to human judgment.

The system processes veteran service records, medical evidence, and regulatory requirements
to generate structured analysis packages. All outputs require human validation before
any official action is taken.`,

  purpose: `To enhance the efficiency and consistency of VA disability claims analysis
while maintaining strict compliance with federal regulations (38 CFR), VA directives,
and emerging AI governance standards (NIST AI RMF, EU AI Act).`,

  boundaries: {
    included: [
      'Multi-agent workflow orchestration engine',
      'Unified Gateway (PII/PHI sanitization)',
      'Human Oversight Gate enforcement',
      'Adversarial Assurance Lane (AAL) security validation',
      'Forensic audit logging and telemetry',
      'User Access Control (UAC) module',
      'VA Lighthouse API integration (sandbox mode)',
    ],
    excluded: [
      'VA production systems (VBA, VBMS, CorpDB)',
      'Veteran identity verification services',
      'Official claims decision recording systems',
      'Benefits payment processing systems',
      'External medical records systems (DoD, private providers)',
    ],
    interfaces: [
      { name: 'VA Lighthouse API', direction: 'Outbound', protocol: 'REST/HTTPS', data: 'Veteran service history, disability ratings (sandbox)', security: 'API Key + OAuth2' },
      { name: 'Anthropic Claude API', direction: 'Outbound', protocol: 'REST/HTTPS', data: 'Sanitized prompts (no PII)', security: 'API Key' },
      { name: 'User Browser', direction: 'Inbound', protocol: 'HTTPS', data: 'User interactions, file uploads', security: 'TLS 1.3' },
    ]
  }
};

const FIPS_199_CATEGORIZATION = {
  overall: 'MODERATE',
  confidentiality: { level: 'MODERATE', justification: 'System processes veteran PII/PHI in analysis workflows. Unauthorized disclosure could cause serious adverse effects on individuals.' },
  integrity: { level: 'MODERATE', justification: 'AI-generated analysis informs (but does not determine) benefits decisions. Unauthorized modification could result in incorrect claim analysis.' },
  availability: { level: 'LOW', justification: 'System is advisory. Temporary unavailability would not prevent manual claims processing or cause significant mission impact.' },
};

const ROLES_AND_RESPONSIBILITIES = [
  {
    role: 'System Owner',
    responsibilities: [
      'Accountable for overall system security',
      'Approves system security documentation',
      'Ensures adequate resources for security controls',
      'Accepts residual risk on behalf of the organization',
    ],
    aceMapping: 'Organization leadership (placeholder)',
  },
  {
    role: 'Information System Security Officer (ISSO)',
    responsibilities: [
      'Maintains SSP and security documentation',
      'Monitors security controls and compliance',
      'Coordinates security assessments',
      'Reports security status to Authorizing Official',
      'Manages POA&M items',
    ],
    aceMapping: 'Designated ISSO for ACE system',
  },
  {
    role: 'AI Governance Lead',
    responsibilities: [
      'Oversees AI-specific risk management',
      'Ensures NIST AI RMF compliance',
      'Validates human oversight gate effectiveness',
      'Reviews AAL security validation results',
      'Maintains AI governance policies',
    ],
    aceMapping: 'ISSO with AI governance specialization',
  },
  {
    role: 'Claims Analyst (Operator)',
    responsibilities: [
      'Initiates governed workflows',
      'Reviews AI-generated analysis',
      'Approves/rejects at human oversight gates',
      'Provides feedback on AI output quality',
    ],
    aceMapping: 'UAC Role: Analyst',
  },
  {
    role: 'Auditor',
    responsibilities: [
      'Reviews forensic audit logs',
      'Validates compliance with procedures',
      'Reports compliance findings',
      'Read-only system access',
    ],
    aceMapping: 'UAC Role: Auditor',
  },
];

const CONTROL_IMPLEMENTATIONS = [
  {
    family: 'Access Control (AC)',
    controls: [
      {
        id: 'AC-2',
        name: 'Account Management',
        implementation: 'ACE implements role-based access control through the UAC module. Three roles are defined: ISSO (full access), Analyst (operational access), and Auditor (read-only). Session management tracks active users with timestamps. Account provisioning requires ISSO authorization.',
        status: 'Implemented',
        evidence: 'UAC module in App.tsx, role permission matrix in currentUser state',
      },
      {
        id: 'AC-3',
        name: 'Access Enforcement',
        implementation: 'The canActionWorkforce permission check enforces role-based restrictions on workflow initiation. Auditor role cannot trigger workflows or approve gates. All permission checks are logged to the forensic ledger.',
        status: 'Implemented',
        evidence: 'canActionWorkforce logic, role-gated UI elements',
      },
      {
        id: 'AC-6',
        name: 'Least Privilege',
        implementation: 'Unified Gateway sanitizes all inputs before agent processing, ensuring downstream agents only receive PII-free data necessary for analysis. Agents cannot access raw veteran records.',
        status: 'Implemented',
        evidence: 'Unified Gateway PII redaction, [REDACTED] markers in agent outputs',
      },
    ]
  },
  {
    family: 'Audit and Accountability (AU)',
    controls: [
      {
        id: 'AU-2',
        name: 'Event Logging',
        implementation: 'All significant events are logged to the Forensic Ledger Stream including: workflow initiation, agent transitions, human oversight decisions, errors, and security validation results. Logs include timestamp, actor, action, and outcome.',
        status: 'Implemented',
        evidence: 'Activity Feed component, addActivity() function calls throughout codebase',
      },
      {
        id: 'AU-3',
        name: 'Content of Audit Records',
        implementation: 'Audit records contain: timestamp (ISO 8601), actor role, action type (info/success/warning/error), message content, and session context. Records are structured for automated analysis.',
        status: 'Implemented',
        evidence: 'ActivityLogEntry interface, exportTelemetryPackage() output format',
      },
      {
        id: 'AU-6',
        name: 'Audit Review, Analysis, and Reporting',
        implementation: 'Audit Page provides searchable, filterable view of all system logs. Compliance Dashboard shows real-time metrics. Telemetry packages can be exported for external review.',
        status: 'Implemented',
        evidence: 'AuditPage component, ComplianceStatement component, Export functionality',
      },
    ]
  },
  {
    family: 'Risk Assessment (RA)',
    controls: [
      {
        id: 'RA-5',
        name: 'Vulnerability Monitoring and Scanning',
        implementation: 'Adversarial Assurance Lane (AAL) performs security validation against 44+ attack vectors including prompt injection, data leakage, instruction override, and hallucination detection. AAL can run in Quick Scan, Full Validation, or Certification modes.',
        status: 'Implemented',
        evidence: 'redTeamAgent.ts, AAL test suite, security scorecard output',
      },
      {
        id: 'RA-7',
        name: 'Risk Response',
        implementation: 'AAL results generate actionable findings with severity ratings (BLOCKER, HIGH, MEDIUM, LOW). Workflow trust status (TRUSTED/CONDITIONAL/UNTRUSTED) determines whether outputs can proceed to human review.',
        status: 'Implemented',
        evidence: 'RedTeamResult interface, workflowTrustStatus logic',
      },
    ]
  },
  {
    family: 'System and Information Integrity (SI)',
    controls: [
      {
        id: 'SI-4',
        name: 'System Monitoring',
        implementation: 'Real-time Monitoring Dashboard displays agent status, governance scores (Integrity, Accuracy, Compliance), and workflow metrics. Supervisor Agent validates all agent outputs against behavioral thresholds.',
        status: 'Implemented',
        evidence: 'MonitoringDashboard component, Supervisor scoring logic',
      },
      {
        id: 'SI-10',
        name: 'Information Input Validation',
        implementation: 'Unified Gateway performs input sanitization including PII/PHI detection and redaction, format validation, and injection attack filtering. Invalid inputs are rejected with logged explanation.',
        status: 'Implemented',
        evidence: 'Unified Gateway agent, sanitization patterns',
      },
    ]
  },
  {
    family: 'Program Management (PM)',
    controls: [
      {
        id: 'PM-9',
        name: 'Risk Management Strategy',
        implementation: 'ACE implements Defense in Depth with multiple validation layers: Unified Gateway → Agent Processing → REPAIR Validation → Supervisor Scoring → Human Oversight Gate → AAL Certification. Each layer can halt workflow if thresholds not met.',
        status: 'Implemented',
        evidence: 'Multi-agent architecture, gate enforcement logic',
      },
    ]
  },
];

const POAM_ITEMS = [
  {
    id: 'POAM-001',
    weakness: 'Production OAuth2 integration not implemented',
    control: 'IA-2, IA-8',
    severity: 'Moderate',
    status: 'Planned',
    milestone: 'Phase 2 - Production Readiness',
    targetDate: 'TBD based on authorization timeline',
    resources: 'Integration with VA identity provider (IAM)',
    notes: 'Current demo mode uses simulated authentication. Production deployment requires PIV/CAC integration.',
  },
  {
    id: 'POAM-002',
    weakness: 'Audit log integrity protection (signing/hashing)',
    control: 'AU-9, AU-10',
    severity: 'Moderate',
    status: 'Planned',
    milestone: 'Phase 2 - Production Readiness',
    targetDate: 'TBD',
    resources: 'Cryptographic signing implementation',
    notes: 'Current logs are tamper-evident through append-only design but not cryptographically signed.',
  },
  {
    id: 'POAM-003',
    weakness: 'Continuous AAL monitoring not automated',
    control: 'CA-7, RA-5',
    severity: 'Low',
    status: 'Partial',
    milestone: 'Phase 1.5 - Enhanced Monitoring',
    targetDate: 'Q2 2025',
    resources: 'Scheduled job implementation',
    notes: 'AAL currently runs on-demand. Automated periodic scanning would enhance continuous monitoring.',
  },
  {
    id: 'POAM-004',
    weakness: 'Incident response procedures not fully tested',
    control: 'IR-3',
    severity: 'Low',
    status: 'Planned',
    milestone: 'Phase 2 - Production Readiness',
    targetDate: 'TBD',
    resources: 'Tabletop exercise planning',
    notes: 'IR procedures documented in SOP but require validation through tabletop exercise.',
  },
  {
    id: 'POAM-005',
    weakness: 'Third-party dependency vulnerability scanning',
    control: 'RA-5, SA-11',
    severity: 'Low',
    status: 'Partial',
    milestone: 'Ongoing',
    targetDate: 'Continuous',
    resources: 'npm audit, Dependabot integration',
    notes: 'Manual npm audit performed. Automated dependency scanning pipeline recommended.',
  },
];

// ============================================================================
// COMPONENT
// ============================================================================

export const SystemSecurityPlan: React.FC<SSPProps> = ({ telemetry, redTeamResult }) => {
  const [expandedSections, setExpandedSections] = useState<string[]>(['identification']);

  const toggleSection = (section: string) => {
    setExpandedSections(prev =>
      prev.includes(section)
        ? prev.filter(s => s !== section)
        : [...prev, section]
    );
  };

  const isExpanded = (section: string) => expandedSections.includes(section);

  const handlePrint = () => window.print();

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'implemented':
        return <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded text-[9px] font-black uppercase">Implemented</span>;
      case 'partial':
        return <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded text-[9px] font-black uppercase">Partial</span>;
      case 'planned':
        return <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-[9px] font-black uppercase">Planned</span>;
      default:
        return <span className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded text-[9px] font-black uppercase">{status}</span>;
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity.toLowerCase()) {
      case 'high':
        return <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded text-[9px] font-black uppercase">High</span>;
      case 'moderate':
        return <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded text-[9px] font-black uppercase">Moderate</span>;
      case 'low':
        return <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-[9px] font-black uppercase">Low</span>;
      default:
        return <span className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded text-[9px] font-black uppercase">{severity}</span>;
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in duration-500 print:max-w-none print:p-0">

      {/* Document Header */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white rounded-3xl p-8 relative overflow-hidden shadow-xl print:bg-white print:text-black print:border print:border-slate-300 print:rounded-none">
        <div className="absolute top-0 right-0 opacity-5 print:hidden"><Shield size={200} /></div>
        <div className="relative z-10">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2 print:hidden">
                <span className="px-3 py-1 bg-blue-600 rounded-full text-[9px] font-black uppercase tracking-widest">NIST 800-18</span>
                <span className="px-3 py-1 bg-amber-600 rounded-full text-[9px] font-black uppercase tracking-widest">MODERATE</span>
              </div>
              <h1 className="text-3xl font-black uppercase tracking-tight">System Security Plan</h1>
              <p className="text-slate-400 text-lg mt-1 print:text-slate-600">{SYSTEM_IDENTIFICATION.name}</p>
              <p className="text-slate-500 text-sm mt-2 font-mono print:text-slate-500">
                Document ID: SSP-{SYSTEM_IDENTIFICATION.uniqueId} | Version: {SYSTEM_IDENTIFICATION.version}
              </p>
            </div>
            <div className="flex flex-col gap-2 print:hidden">
              <button
                onClick={handlePrint}
                className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl text-xs font-bold transition-all"
              >
                <Printer size={14} /> Export PDF
              </button>
              <div className="text-[10px] text-slate-400 text-right">
                Generated: {new Date().toISOString().split('T')[0]}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Classification Banner */}
      <div className="bg-amber-50 border-2 border-amber-200 rounded-xl p-4 flex items-center gap-4 print:border print:border-amber-300">
        <AlertTriangle className="text-amber-600 shrink-0" size={24} />
        <div>
          <p className="font-black text-amber-800 text-sm">CONTROLLED UNCLASSIFIED INFORMATION (CUI)</p>
          <p className="text-amber-700 text-xs">This document contains sensitive security information. Handle in accordance with organizational CUI policies.</p>
        </div>
      </div>

      {/* Table of Contents */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm print:border print:border-slate-300">
        <h2 className="text-sm font-black text-slate-800 uppercase tracking-wider mb-4 flex items-center gap-2">
          <FileText size={16} className="text-blue-600" />
          Table of Contents
        </h2>
        <div className="grid grid-cols-2 gap-2 text-sm">
          {[
            { num: '1', title: 'System Identification', section: 'identification' },
            { num: '2', title: 'Security Categorization (FIPS 199)', section: 'categorization' },
            { num: '3', title: 'System Environment', section: 'environment' },
            { num: '4', title: 'Roles and Responsibilities', section: 'roles' },
            { num: '5', title: 'Control Implementation', section: 'controls' },
            { num: '6', title: 'Plan of Action & Milestones', section: 'poam' },
          ].map(item => (
            <button
              key={item.section}
              onClick={() => toggleSection(item.section)}
              className="text-left p-2 hover:bg-slate-50 rounded-lg transition-colors flex items-center gap-2"
            >
              <span className="w-6 h-6 bg-slate-100 rounded-full flex items-center justify-center text-xs font-bold text-slate-600">{item.num}</span>
              <span className="text-slate-700">{item.title}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Section 1: System Identification */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden print:break-inside-avoid">
        <button
          onClick={() => toggleSection('identification')}
          className="w-full flex items-center justify-between p-5 hover:bg-slate-50 transition-colors"
        >
          <div className="flex items-center gap-4">
            <div className="p-2 bg-blue-50 rounded-xl">
              <Server size={18} className="text-blue-600" />
            </div>
            <div className="text-left">
              <h2 className="font-black text-slate-900 uppercase tracking-tight">1. System Identification</h2>
              <p className="text-[10px] text-slate-400 font-bold">Name, Purpose, Authorization Boundary</p>
            </div>
          </div>
          {isExpanded('identification') ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
        </button>

        {isExpanded('identification') && (
          <div className="border-t border-slate-100 p-6 space-y-6">
            {/* Basic Info Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-slate-50 rounded-xl p-4">
                <p className="text-[10px] font-black text-slate-400 uppercase mb-1">System Name</p>
                <p className="text-sm font-bold text-slate-800">{SYSTEM_IDENTIFICATION.name}</p>
              </div>
              <div className="bg-slate-50 rounded-xl p-4">
                <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Unique ID</p>
                <p className="text-sm font-mono text-slate-800">{SYSTEM_IDENTIFICATION.uniqueId}</p>
              </div>
              <div className="bg-slate-50 rounded-xl p-4">
                <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Status</p>
                <p className="text-sm font-bold text-amber-600">{SYSTEM_IDENTIFICATION.operationalStatus}</p>
              </div>
              <div className="bg-slate-50 rounded-xl p-4">
                <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Type</p>
                <p className="text-sm font-bold text-slate-800">{SYSTEM_IDENTIFICATION.systemType}</p>
              </div>
            </div>

            {/* Description */}
            <div>
              <h3 className="text-xs font-black text-slate-600 uppercase tracking-wider mb-2">System Description</h3>
              <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">{SYSTEM_IDENTIFICATION.description}</p>
            </div>

            {/* Purpose */}
            <div>
              <h3 className="text-xs font-black text-slate-600 uppercase tracking-wider mb-2">System Purpose</h3>
              <p className="text-sm text-slate-600 leading-relaxed">{SYSTEM_IDENTIFICATION.purpose}</p>
            </div>

            {/* Authorization Boundary */}
            <div className="bg-blue-50 rounded-xl p-5 border border-blue-100">
              <h3 className="text-xs font-black text-blue-800 uppercase tracking-wider mb-4 flex items-center gap-2">
                <Target size={14} />
                Authorization Boundary
              </h3>

              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <p className="text-[10px] font-black text-emerald-700 uppercase mb-2">Included in Boundary</p>
                  <ul className="space-y-1">
                    {SYSTEM_IDENTIFICATION.boundaries.included.map((item, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                        <CheckCircle2 size={14} className="text-emerald-500 mt-0.5 shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="text-[10px] font-black text-red-700 uppercase mb-2">Excluded from Boundary</p>
                  <ul className="space-y-1">
                    {SYSTEM_IDENTIFICATION.boundaries.excluded.map((item, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                        <AlertTriangle size={14} className="text-red-400 mt-0.5 shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            {/* Interfaces */}
            <div>
              <h3 className="text-xs font-black text-slate-600 uppercase tracking-wider mb-3 flex items-center gap-2">
                <Network size={14} />
                System Interfaces
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="text-left p-3 text-[10px] font-black text-slate-500 uppercase">Interface</th>
                      <th className="text-left p-3 text-[10px] font-black text-slate-500 uppercase">Direction</th>
                      <th className="text-left p-3 text-[10px] font-black text-slate-500 uppercase">Protocol</th>
                      <th className="text-left p-3 text-[10px] font-black text-slate-500 uppercase">Data</th>
                      <th className="text-left p-3 text-[10px] font-black text-slate-500 uppercase">Security</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {SYSTEM_IDENTIFICATION.boundaries.interfaces.map((iface, i) => (
                      <tr key={i} className="hover:bg-slate-50">
                        <td className="p-3 font-medium text-slate-800">{iface.name}</td>
                        <td className="p-3 text-slate-600">{iface.direction}</td>
                        <td className="p-3 font-mono text-xs text-slate-600">{iface.protocol}</td>
                        <td className="p-3 text-slate-600">{iface.data}</td>
                        <td className="p-3 text-slate-600">{iface.security}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Section 2: Security Categorization */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden print:break-inside-avoid">
        <button
          onClick={() => toggleSection('categorization')}
          className="w-full flex items-center justify-between p-5 hover:bg-slate-50 transition-colors"
        >
          <div className="flex items-center gap-4">
            <div className="p-2 bg-amber-50 rounded-xl">
              <Scale size={18} className="text-amber-600" />
            </div>
            <div className="text-left">
              <h2 className="font-black text-slate-900 uppercase tracking-tight">2. Security Categorization</h2>
              <p className="text-[10px] text-slate-400 font-bold">FIPS 199 Impact Levels</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="px-3 py-1 bg-amber-100 text-amber-700 rounded-lg text-[10px] font-black">{FIPS_199_CATEGORIZATION.overall}</span>
            {isExpanded('categorization') ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
          </div>
        </button>

        {isExpanded('categorization') && (
          <div className="border-t border-slate-100 p-6">
            <div className="grid md:grid-cols-3 gap-4 mb-6">
              {[
                { name: 'Confidentiality', data: FIPS_199_CATEGORIZATION.confidentiality, icon: Lock, color: 'purple' },
                { name: 'Integrity', data: FIPS_199_CATEGORIZATION.integrity, icon: ShieldAlert, color: 'blue' },
                { name: 'Availability', data: FIPS_199_CATEGORIZATION.availability, icon: Activity, color: 'emerald' },
              ].map(cat => (
                <div key={cat.name} className={`bg-${cat.color}-50 rounded-xl p-5 border border-${cat.color}-100`}>
                  <div className="flex items-center justify-between mb-3">
                    <cat.icon size={20} className={`text-${cat.color}-600`} />
                    <span className={`px-2 py-1 bg-${cat.color}-200 text-${cat.color}-800 rounded text-xs font-black`}>
                      {cat.data.level}
                    </span>
                  </div>
                  <h3 className="font-black text-slate-800 mb-2">{cat.name}</h3>
                  <p className="text-xs text-slate-600 leading-relaxed">{cat.data.justification}</p>
                </div>
              ))}
            </div>

            <div className="bg-slate-50 rounded-xl p-4">
              <p className="text-xs text-slate-600">
                <span className="font-bold">Overall Categorization:</span> Based on FIPS 199 guidance, the system is categorized as <span className="font-black text-amber-700">MODERATE</span> using the high-water mark principle applied to individual security objectives.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Section 4: Roles and Responsibilities */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden print:break-inside-avoid">
        <button
          onClick={() => toggleSection('roles')}
          className="w-full flex items-center justify-between p-5 hover:bg-slate-50 transition-colors"
        >
          <div className="flex items-center gap-4">
            <div className="p-2 bg-purple-50 rounded-xl">
              <Users size={18} className="text-purple-600" />
            </div>
            <div className="text-left">
              <h2 className="font-black text-slate-900 uppercase tracking-tight">4. Roles and Responsibilities</h2>
              <p className="text-[10px] text-slate-400 font-bold">{ROLES_AND_RESPONSIBILITIES.length} Defined Roles</p>
            </div>
          </div>
          {isExpanded('roles') ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
        </button>

        {isExpanded('roles') && (
          <div className="border-t border-slate-100 p-6 space-y-4">
            {ROLES_AND_RESPONSIBILITIES.map((role, i) => (
              <div key={i} className="bg-slate-50 rounded-xl p-5">
                <div className="flex items-start justify-between mb-3">
                  <h3 className="font-black text-slate-800">{role.role}</h3>
                  <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-[9px] font-bold">
                    {role.aceMapping}
                  </span>
                </div>
                <ul className="space-y-1">
                  {role.responsibilities.map((resp, j) => (
                    <li key={j} className="flex items-start gap-2 text-sm text-slate-600">
                      <CheckCircle2 size={12} className="text-purple-400 mt-1 shrink-0" />
                      {resp}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Section 5: Control Implementation */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden print:break-inside-avoid">
        <button
          onClick={() => toggleSection('controls')}
          className="w-full flex items-center justify-between p-5 hover:bg-slate-50 transition-colors"
        >
          <div className="flex items-center gap-4">
            <div className="p-2 bg-emerald-50 rounded-xl">
              <Shield size={18} className="text-emerald-600" />
            </div>
            <div className="text-left">
              <h2 className="font-black text-slate-900 uppercase tracking-tight">5. Control Implementation</h2>
              <p className="text-[10px] text-slate-400 font-bold">NIST 800-53 Rev 5 Selected Controls</p>
            </div>
          </div>
          {isExpanded('controls') ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
        </button>

        {isExpanded('controls') && (
          <div className="border-t border-slate-100">
            {CONTROL_IMPLEMENTATIONS.map((family, i) => (
              <div key={i} className="border-b border-slate-100 last:border-0">
                <div className="px-6 py-3 bg-slate-50">
                  <span className="text-xs font-black text-slate-600 uppercase tracking-wider">{family.family}</span>
                </div>
                <div className="divide-y divide-slate-50">
                  {family.controls.map((control, j) => (
                    <div key={j} className="p-6">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <span className="font-mono text-sm font-bold text-blue-600">{control.id}</span>
                          <span className="text-sm text-slate-600 ml-2">— {control.name}</span>
                        </div>
                        {getStatusBadge(control.status)}
                      </div>
                      <p className="text-sm text-slate-600 mb-2 leading-relaxed">{control.implementation}</p>
                      <p className="text-[10px] text-slate-400">
                        <span className="font-bold">Evidence:</span> {control.evidence}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Section 6: POA&M */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden print:break-inside-avoid">
        <button
          onClick={() => toggleSection('poam')}
          className="w-full flex items-center justify-between p-5 hover:bg-slate-50 transition-colors"
        >
          <div className="flex items-center gap-4">
            <div className="p-2 bg-red-50 rounded-xl">
              <Clock size={18} className="text-red-600" />
            </div>
            <div className="text-left">
              <h2 className="font-black text-slate-900 uppercase tracking-tight">6. Plan of Action & Milestones</h2>
              <p className="text-[10px] text-slate-400 font-bold">{POAM_ITEMS.length} Items</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="px-3 py-1 bg-amber-100 text-amber-700 rounded-lg text-[10px] font-black">
              {POAM_ITEMS.filter(p => p.status === 'Planned').length} Planned
            </span>
            {isExpanded('poam') ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
          </div>
        </button>

        {isExpanded('poam') && (
          <div className="border-t border-slate-100 p-6 space-y-4">
            <div className="bg-blue-50 rounded-xl p-4 mb-6">
              <p className="text-xs text-blue-700 flex items-start gap-2">
                <Info size={14} className="shrink-0 mt-0.5" />
                POA&M items represent known gaps being actively managed. Their presence indicates mature risk management, not system weakness.
              </p>
            </div>

            {POAM_ITEMS.map((item, i) => (
              <div key={i} className="bg-slate-50 rounded-xl p-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <span className="font-mono text-xs text-slate-500">{item.id}</span>
                    <h4 className="font-bold text-slate-800 mt-1">{item.weakness}</h4>
                  </div>
                  <div className="flex items-center gap-2">
                    {getSeverityBadge(item.severity)}
                    {getStatusBadge(item.status)}
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs mb-3">
                  <div>
                    <p className="text-slate-400 font-bold uppercase text-[9px]">Control</p>
                    <p className="text-slate-700 font-mono">{item.control}</p>
                  </div>
                  <div>
                    <p className="text-slate-400 font-bold uppercase text-[9px]">Milestone</p>
                    <p className="text-slate-700">{item.milestone}</p>
                  </div>
                  <div>
                    <p className="text-slate-400 font-bold uppercase text-[9px]">Target Date</p>
                    <p className="text-slate-700">{item.targetDate}</p>
                  </div>
                  <div>
                    <p className="text-slate-400 font-bold uppercase text-[9px]">Resources</p>
                    <p className="text-slate-700">{item.resources}</p>
                  </div>
                </div>

                <p className="text-xs text-slate-500 italic">{item.notes}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Document Footer */}
      <div className="flex items-center justify-between pt-6 border-t border-slate-200 print:mt-8">
        <div className="text-xs text-slate-400">
          <p>SSP-{SYSTEM_IDENTIFICATION.uniqueId}</p>
          <p>Generated: {new Date().toISOString()}</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl print:bg-white print:text-slate-900 print:border print:border-slate-300">
          <Shield size={16} className="text-emerald-400 print:text-emerald-600" />
          <span className="text-[10px] font-black uppercase tracking-wider">System Security Plan</span>
        </div>
      </div>
    </div>
  );
};

export default SystemSecurityPlan;
