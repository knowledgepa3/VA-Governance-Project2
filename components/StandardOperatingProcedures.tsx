/**
 * Standard Operating Procedures (SOPs)
 *
 * Three core procedures that answer:
 * 1. Who can do this
 * 2. What the system enforces automatically
 * 3. What requires human approval
 *
 * These are tight, procedural, non-academic documents.
 */

import React, { useState } from 'react';
import {
  FileText, Play, Shield, Eye, CheckCircle2, XCircle, AlertTriangle,
  ChevronDown, ChevronRight, Printer, Users, Zap, Clock, Target,
  ArrowRight, Lock, RefreshCw, AlertCircle, Activity, ShieldCheck,
  UserCheck, Settings, Server, Workflow
} from 'lucide-react';

// ============================================================================
// SOP DEFINITIONS
// ============================================================================

interface SOPStep {
  step: number;
  action: string;
  actor: 'System' | 'Analyst' | 'ISSO' | 'Auditor' | 'Any Authorized User';
  automated: boolean;
  gateType?: 'mandatory' | 'conditional' | 'informational';
  details?: string[];
  warnings?: string[];
}

interface SOP {
  id: string;
  title: string;
  purpose: string;
  scope: string;
  authorizedRoles: string[];
  prerequisites: string[];
  steps: SOPStep[];
  outputs: string[];
  exceptions: string[];
  relatedDocs: string[];
  effectiveDate: string;
  version: string;
}

const SOPS: SOP[] = [
  {
    id: 'SOP-001',
    title: 'Governed Workflow Execution',
    purpose: 'Defines the procedure for initiating, monitoring, and completing an AI-assisted claims analysis workflow with full governance controls.',
    scope: 'All VA disability claims analysis performed through the ACE platform.',
    authorizedRoles: ['ISSO', 'Analyst'],
    prerequisites: [
      'User authenticated with valid credentials',
      'Appropriate role assignment verified in UAC',
      'Claim artifacts available (service records, medical evidence)',
      'System health verified (no critical alerts)',
    ],
    steps: [
      {
        step: 1,
        action: 'Authenticate and verify role permissions',
        actor: 'System',
        automated: true,
        details: [
          'System validates user session',
          'UAC module confirms role assignment',
          'canActionWorkforce permission check executed',
        ],
      },
      {
        step: 2,
        action: 'Load claim artifacts into Ingress Buffer',
        actor: 'Analyst',
        automated: false,
        details: [
          'Select Demo Mode for training/testing OR',
          'Upload sovereign documents for real analysis',
          'Verify all required documents are present',
        ],
        warnings: [
          'Do NOT upload unredacted PII/PHI in production without Unified Gateway verification',
        ],
      },
      {
        step: 3,
        action: 'Initiate Governed Workflow',
        actor: 'Analyst',
        automated: false,
        details: [
          'Click "Initiate Governed Flow" button',
          'Confirm workflow type (VA Claims Analysis)',
        ],
      },
      {
        step: 4,
        action: 'Unified Gateway processes input',
        actor: 'System',
        automated: true,
        gateType: 'mandatory',
        details: [
          'All PII/PHI automatically redacted',
          'Input validated against schema',
          'Sanitized data passed to agent pipeline',
        ],
      },
      {
        step: 5,
        action: 'Agent pipeline executes',
        actor: 'System',
        automated: true,
        details: [
          'Each agent processes in sequence',
          'Supervisor monitors governance scores',
          'REPAIR agent corrects logical inconsistencies',
          'All transitions logged to Forensic Ledger',
        ],
      },
      {
        step: 6,
        action: 'Human Oversight Gate triggered (if threshold not met)',
        actor: 'System',
        automated: true,
        gateType: 'conditional',
        details: [
          'System evaluates governance thresholds',
          'If scores below threshold → Gate triggered',
          'Analyst notified with context',
        ],
      },
      {
        step: 7,
        action: 'Review and approve/reject at Oversight Gate',
        actor: 'Analyst',
        automated: false,
        gateType: 'mandatory',
        details: [
          'Review AI analysis and remediation details',
          'Click "Validate Logic" to approve and continue',
          'Click "Request Logic Reset" to reject and restart agent',
        ],
        warnings: [
          'Approval creates audit record with your identity',
          'You are attesting that the logic is reasonable to proceed',
        ],
      },
      {
        step: 8,
        action: 'Workflow completes',
        actor: 'System',
        automated: true,
        details: [
          'Final package assembled',
          'Telemetry aggregated',
          'Report available for review',
        ],
      },
      {
        step: 9,
        action: 'Review generated report',
        actor: 'Analyst',
        automated: false,
        details: [
          'Click "View Report" button',
          'Review all AI-generated analysis',
          'Verify statutory citations are appropriate',
        ],
        warnings: [
          'AI output is ADVISORY ONLY',
          'Human adjudicator makes all final decisions',
        ],
      },
      {
        step: 10,
        action: 'Export telemetry package (optional)',
        actor: 'Any Authorized User',
        automated: false,
        details: [
          'Click Export button on Forensic Ledger',
          'JSON package downloaded',
          'Includes full audit trail for compliance review',
        ],
      },
    ],
    outputs: [
      'Claims Analysis Report (structured findings)',
      'Forensic Ledger (complete audit trail)',
      'Telemetry Package (exportable JSON)',
      'Governance Scorecard (Integrity, Accuracy, Compliance)',
    ],
    exceptions: [
      'If system unavailable: Use manual claims processing procedures',
      'If Unified Gateway fails: Do NOT proceed; contact system administrator',
      'If all agents fail validation: Escalate to ISSO for review',
    ],
    relatedDocs: ['SOP-002 (Human Oversight Gates)', 'SOP-003 (AAL Certification)', 'SSP Section 5'],
    effectiveDate: '2024-01-15',
    version: '1.0',
  },
  {
    id: 'SOP-002',
    title: 'Human Oversight Gate Operations',
    purpose: 'Defines the procedure for reviewing, approving, or rejecting AI agent outputs at mandatory and conditional oversight gates.',
    scope: 'All human oversight decision points within ACE governed workflows.',
    authorizedRoles: ['ISSO', 'Analyst'],
    prerequisites: [
      'Active workflow in progress',
      'Oversight Gate triggered by system',
      'User has workflow action permissions',
    ],
    steps: [
      {
        step: 1,
        action: 'System triggers Oversight Gate',
        actor: 'System',
        automated: true,
        gateType: 'mandatory',
        details: [
          'Governance threshold evaluation completed',
          'Gate type determined (MANDATORY or CONDITIONAL)',
          'Context packaged for human review',
        ],
      },
      {
        step: 2,
        action: 'Review gate notification',
        actor: 'Analyst',
        automated: false,
        details: [
          'Observe gate banner with severity indicator',
          'Note which agent triggered the gate',
          'Review the specific checkpoint that failed/requires review',
        ],
      },
      {
        step: 3,
        action: 'Review agent output details',
        actor: 'Analyst',
        automated: false,
        details: [
          'Click on agent card to view full telemetry',
          'Review the reasoning and findings',
          'Check for remediation already applied by REPAIR agent',
        ],
      },
      {
        step: 4,
        action: 'Evaluate decision criteria',
        actor: 'Analyst',
        automated: false,
        details: [
          'Is the logic reasonable given the evidence?',
          'Are statutory citations appropriate?',
          'Has REPAIR remediation addressed concerns?',
          'Would a reasonable adjudicator find this useful?',
        ],
        warnings: [
          'You are NOT approving the claim decision',
          'You are approving that the AI analysis is reasonable to proceed',
        ],
      },
      {
        step: 5,
        action: 'Make approval decision',
        actor: 'Analyst',
        automated: false,
        gateType: 'mandatory',
        details: [
          'APPROVE: Click "Validate Logic" → Workflow continues',
          'REJECT: Click "Request Logic Reset" → Agent re-processes',
        ],
      },
      {
        step: 6,
        action: 'System records decision',
        actor: 'System',
        automated: true,
        details: [
          'Decision logged with timestamp',
          'User identity attached to approval',
          'Audit trail updated in Forensic Ledger',
        ],
      },
    ],
    outputs: [
      'Approval/Rejection decision record',
      'Audit log entry with user attestation',
      'Workflow state update (proceed or reset)',
    ],
    exceptions: [
      'MANDATORY gates cannot be bypassed under any circumstances',
      'CONDITIONAL gates may be auto-approved if thresholds met',
      'System administrator cannot override gate requirements',
    ],
    relatedDocs: ['SOP-001 (Workflow Execution)', 'AI Governance Policy', 'SSP Section 4 (Roles)'],
    effectiveDate: '2024-01-15',
    version: '1.0',
  },
  {
    id: 'SOP-003',
    title: 'Adversarial Assurance Lane (AAL) Security Validation',
    purpose: 'Defines the procedure for executing security validation tests against AI workflows and interpreting certification results.',
    scope: 'All security validation and certification activities for ACE workflows.',
    authorizedRoles: ['ISSO'],
    prerequisites: [
      'Workflow completed OR ready for pre-deployment validation',
      'ISSO role assigned in UAC',
      'Understanding of AAL test categories',
    ],
    steps: [
      {
        step: 1,
        action: 'Select validation mode',
        actor: 'ISSO',
        automated: false,
        details: [
          'QUICK SCAN: 8 critical vectors, ~30 seconds',
          'FULL VALIDATION: 24 vectors across all categories, ~2 minutes',
          'CERTIFY: 44 vectors with fuzzing, comprehensive certification',
        ],
      },
      {
        step: 2,
        action: 'Initiate AAL execution',
        actor: 'ISSO',
        automated: false,
        details: [
          'Click appropriate button (Scan/Validate/Certify)',
          'System begins automated test execution',
        ],
      },
      {
        step: 3,
        action: 'AAL executes test vectors',
        actor: 'System',
        automated: true,
        details: [
          'Prompt Injection tests (PI-001 through PI-004)',
          'Data Leakage tests (DL-001 through DL-006)',
          'Instruction Adherence tests (IA-001 through IA-004)',
          'Hallucination Detection tests (HD-001 through HD-003)',
        ],
      },
      {
        step: 4,
        action: 'Review security scorecard',
        actor: 'ISSO',
        automated: false,
        details: [
          'Overall score displayed (0-100 scale)',
          'Trust status: TRUSTED / CONDITIONAL / UNTRUSTED',
          'Category breakdown visible',
          'Individual test results available',
        ],
      },
      {
        step: 5,
        action: 'Analyze findings',
        actor: 'ISSO',
        automated: false,
        details: [
          'BLOCKER findings: Must be addressed before production',
          'HIGH findings: Should be addressed, document if accepting risk',
          'MEDIUM findings: Recommend addressing',
          'LOW findings: Best practice improvements',
        ],
        warnings: [
          'UNTRUSTED status means workflow should NOT be used for real decisions',
          'CONDITIONAL status requires documented risk acceptance',
        ],
      },
      {
        step: 6,
        action: 'Document certification decision',
        actor: 'ISSO',
        automated: false,
        gateType: 'mandatory',
        details: [
          'Record AAL results in compliance documentation',
          'If TRUSTED: Approve for operational use',
          'If CONDITIONAL: Document accepted risks',
          'If UNTRUSTED: Document remediation plan',
        ],
      },
      {
        step: 7,
        action: 'Export certification artifacts',
        actor: 'ISSO',
        automated: false,
        details: [
          'Export telemetry package with AAL results',
          'Archive for audit trail',
          'Include in POA&M if remediation needed',
        ],
      },
    ],
    outputs: [
      'Security Scorecard with trust status',
      'Detailed findings by category',
      'Certification decision record',
      'Exportable AAL results package',
    ],
    exceptions: [
      'AAL should be run before ANY production workflow',
      'Failed certification requires remediation before operational use',
      'Emergency bypass requires AO approval and documented justification',
    ],
    relatedDocs: ['SOP-001 (Workflow Execution)', 'SSP Section 5 (RA-5)', 'POA&M'],
    effectiveDate: '2024-01-15',
    version: '1.0',
  },
];

// ============================================================================
// COMPONENT
// ============================================================================

export const StandardOperatingProcedures: React.FC = () => {
  const [expandedSOP, setExpandedSOP] = useState<string | null>('SOP-001');

  const handlePrint = () => window.print();

  const getActorIcon = (actor: string) => {
    switch (actor) {
      case 'System': return <Server size={14} className="text-blue-500" />;
      case 'Analyst': return <UserCheck size={14} className="text-emerald-500" />;
      case 'ISSO': return <Shield size={14} className="text-purple-500" />;
      case 'Auditor': return <Eye size={14} className="text-amber-500" />;
      default: return <Users size={14} className="text-slate-500" />;
    }
  };

  const getGateBadge = (gateType?: string) => {
    if (!gateType) return null;
    switch (gateType) {
      case 'mandatory':
        return <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded text-[8px] font-black uppercase">Mandatory Gate</span>;
      case 'conditional':
        return <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded text-[8px] font-black uppercase">Conditional Gate</span>;
      case 'informational':
        return <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-[8px] font-black uppercase">Info Only</span>;
      default:
        return null;
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in duration-500 print:max-w-none print:p-0">

      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-900 via-emerald-800 to-emerald-900 text-white rounded-3xl p-8 relative overflow-hidden shadow-xl print:bg-white print:text-black print:border print:border-slate-300 print:rounded-none">
        <div className="absolute top-0 right-0 opacity-5 print:hidden"><Workflow size={200} /></div>
        <div className="relative z-10">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2 print:hidden">
                <span className="px-3 py-1 bg-emerald-600 rounded-full text-[9px] font-black uppercase tracking-widest">Operational</span>
                <span className="px-3 py-1 bg-white/20 rounded-full text-[9px] font-black uppercase tracking-widest">{SOPS.length} Procedures</span>
              </div>
              <h1 className="text-3xl font-black uppercase tracking-tight">Standard Operating Procedures</h1>
              <p className="text-emerald-200 text-lg mt-1 print:text-slate-600">ACE Governance Platform</p>
            </div>
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl text-xs font-bold transition-all print:hidden"
            >
              <Printer size={14} /> Export PDF
            </button>
          </div>
        </div>
      </div>

      {/* SOP Index */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <h2 className="text-sm font-black text-slate-800 uppercase tracking-wider mb-4 flex items-center gap-2">
          <FileText size={16} className="text-emerald-600" />
          Procedure Index
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {SOPS.map(sop => (
            <button
              key={sop.id}
              onClick={() => setExpandedSOP(expandedSOP === sop.id ? null : sop.id)}
              className={`text-left p-4 rounded-xl transition-all border ${
                expandedSOP === sop.id
                  ? 'bg-emerald-50 border-emerald-200'
                  : 'bg-slate-50 border-slate-100 hover:bg-slate-100'
              }`}
            >
              <span className="font-mono text-xs text-slate-400">{sop.id}</span>
              <p className="font-bold text-slate-800 text-sm mt-1">{sop.title}</p>
              <div className="flex items-center gap-2 mt-2">
                {sop.authorizedRoles.map(role => (
                  <span key={role} className="px-2 py-0.5 bg-slate-200 text-slate-600 rounded text-[9px] font-bold">
                    {role}
                  </span>
                ))}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* SOP Details */}
      {SOPS.map(sop => (
        <div
          key={sop.id}
          className={`bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden transition-all ${
            expandedSOP === sop.id ? '' : 'hidden'
          } print:block print:break-inside-avoid`}
        >
          {/* SOP Header */}
          <div className="bg-slate-50 p-6 border-b border-slate-200">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <span className="font-mono text-sm font-bold text-emerald-600">{sop.id}</span>
                  <span className="text-slate-300">|</span>
                  <span className="text-xs text-slate-500">v{sop.version}</span>
                  <span className="text-slate-300">|</span>
                  <span className="text-xs text-slate-500">Effective: {sop.effectiveDate}</span>
                </div>
                <h2 className="text-xl font-black text-slate-900">{sop.title}</h2>
              </div>
              <div className="flex items-center gap-2">
                {sop.authorizedRoles.map(role => (
                  <span key={role} className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-lg text-xs font-bold">
                    {role}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="p-6 space-y-6">
            {/* Purpose & Scope */}
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-xs font-black text-slate-600 uppercase tracking-wider mb-2">Purpose</h3>
                <p className="text-sm text-slate-600 leading-relaxed">{sop.purpose}</p>
              </div>
              <div>
                <h3 className="text-xs font-black text-slate-600 uppercase tracking-wider mb-2">Scope</h3>
                <p className="text-sm text-slate-600 leading-relaxed">{sop.scope}</p>
              </div>
            </div>

            {/* Prerequisites */}
            <div className="bg-amber-50 rounded-xl p-5 border border-amber-100">
              <h3 className="text-xs font-black text-amber-800 uppercase tracking-wider mb-3 flex items-center gap-2">
                <AlertCircle size={14} />
                Prerequisites
              </h3>
              <ul className="grid md:grid-cols-2 gap-2">
                {sop.prerequisites.map((prereq, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-amber-800">
                    <CheckCircle2 size={14} className="text-amber-500 mt-0.5 shrink-0" />
                    {prereq}
                  </li>
                ))}
              </ul>
            </div>

            {/* Procedure Steps */}
            <div>
              <h3 className="text-xs font-black text-slate-600 uppercase tracking-wider mb-4 flex items-center gap-2">
                <Play size={14} />
                Procedure Steps
              </h3>
              <div className="space-y-3">
                {sop.steps.map((step, i) => (
                  <div
                    key={i}
                    className={`rounded-xl p-4 border ${
                      step.automated
                        ? 'bg-blue-50 border-blue-100'
                        : 'bg-white border-slate-200'
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      {/* Step Number */}
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-black shrink-0 ${
                        step.automated
                          ? 'bg-blue-200 text-blue-700'
                          : 'bg-emerald-200 text-emerald-700'
                      }`}>
                        {step.step}
                      </div>

                      {/* Step Content */}
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <p className="font-bold text-slate-800">{step.action}</p>
                          {getGateBadge(step.gateType)}
                        </div>

                        <div className="flex items-center gap-4 mb-3">
                          <div className="flex items-center gap-1.5 text-xs text-slate-500">
                            {getActorIcon(step.actor)}
                            <span className="font-bold">{step.actor}</span>
                          </div>
                          <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                            step.automated
                              ? 'bg-blue-200 text-blue-700'
                              : 'bg-emerald-200 text-emerald-700'
                          }`}>
                            {step.automated ? 'AUTOMATED' : 'MANUAL'}
                          </span>
                        </div>

                        {step.details && (
                          <ul className="space-y-1 mb-2">
                            {step.details.map((detail, j) => (
                              <li key={j} className="flex items-start gap-2 text-sm text-slate-600">
                                <ArrowRight size={12} className="text-slate-400 mt-1 shrink-0" />
                                {detail}
                              </li>
                            ))}
                          </ul>
                        )}

                        {step.warnings && (
                          <div className="mt-2 space-y-1">
                            {step.warnings.map((warning, j) => (
                              <div key={j} className="flex items-start gap-2 text-xs text-amber-700 bg-amber-50 rounded-lg p-2">
                                <AlertTriangle size={12} className="shrink-0 mt-0.5" />
                                {warning}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Outputs */}
            <div className="bg-emerald-50 rounded-xl p-5 border border-emerald-100">
              <h3 className="text-xs font-black text-emerald-800 uppercase tracking-wider mb-3 flex items-center gap-2">
                <Target size={14} />
                Outputs
              </h3>
              <ul className="grid md:grid-cols-2 gap-2">
                {sop.outputs.map((output, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-emerald-800">
                    <CheckCircle2 size={14} className="text-emerald-500 mt-0.5 shrink-0" />
                    {output}
                  </li>
                ))}
              </ul>
            </div>

            {/* Exceptions */}
            <div className="bg-red-50 rounded-xl p-5 border border-red-100">
              <h3 className="text-xs font-black text-red-800 uppercase tracking-wider mb-3 flex items-center gap-2">
                <XCircle size={14} />
                Exceptions & Error Handling
              </h3>
              <ul className="space-y-2">
                {sop.exceptions.map((exception, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-red-800">
                    <AlertTriangle size={14} className="text-red-500 mt-0.5 shrink-0" />
                    {exception}
                  </li>
                ))}
              </ul>
            </div>

            {/* Related Documents */}
            <div className="flex items-center gap-4 pt-4 border-t border-slate-200">
              <span className="text-xs font-black text-slate-400 uppercase">Related:</span>
              <div className="flex flex-wrap gap-2">
                {sop.relatedDocs.map((doc, i) => (
                  <span key={i} className="px-2 py-1 bg-slate-100 text-slate-600 rounded text-xs font-medium">
                    {doc}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      ))}

      {/* Document Footer */}
      <div className="flex items-center justify-between pt-6 border-t border-slate-200 print:mt-8">
        <div className="text-xs text-slate-400">
          <p>ACE Standard Operating Procedures</p>
          <p>Generated: {new Date().toISOString()}</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-emerald-900 text-white rounded-xl print:bg-white print:text-slate-900 print:border print:border-slate-300">
          <FileText size={16} className="text-emerald-400 print:text-emerald-600" />
          <span className="text-[10px] font-black uppercase tracking-wider">Operational Procedures</span>
        </div>
      </div>
    </div>
  );
};

export default StandardOperatingProcedures;
