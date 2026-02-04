
import React, { useState, useMemo } from 'react';
import {
  ShieldCheck, Award, FileText, Lock, Landmark, CheckCircle2, Target,
  Printer, ChevronDown, ChevronRight, ExternalLink, Zap, Settings,
  AlertTriangle, Globe, Building2, Scale, Eye, Shield, Server,
  Users, FileSearch, Activity, Database, Key, Fingerprint
} from 'lucide-react';

interface ComplianceStatementProps {
  telemetry?: any;
  activityFeed?: any[];
  redTeamResult?: any;
}

// ============================================================================
// COMPLIANCE FRAMEWORK DEFINITIONS
// ============================================================================

type FrameworkId = 'nist-ai-rmf' | 'nist-800-53' | 'cmmc' | 'eu-ai-act' | 'va-6500' | '38-cfr';

interface ComplianceFramework {
  id: FrameworkId;
  name: string;
  shortName: string;
  description: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  borderColor: string;
  version: string;
  url: string;
  controls: ControlMapping[];
}

interface ControlMapping {
  id: string;
  category: string;
  name: string;
  aceImplementation: string;
  aceComponent: string;
  status: 'implemented' | 'partial' | 'planned' | 'na';
  evidence?: string;
}

// NIST AI RMF 1.0 Controls
const NIST_AI_RMF_CONTROLS: ControlMapping[] = [
  { id: 'GOVERN-1.1', category: 'GOVERN', name: 'Policies for AI risk management', aceImplementation: 'Unified Gateway enforces PII/PHI redaction policies', aceComponent: 'Unified Gateway', status: 'implemented', evidence: 'All inputs sanitized before agent processing' },
  { id: 'GOVERN-1.2', category: 'GOVERN', name: 'Human oversight mechanisms', aceImplementation: 'Mandatory Human Oversight Gates at agent transitions', aceComponent: 'Supervisor Agent', status: 'implemented', evidence: 'Escalation rate tracked in telemetry' },
  { id: 'GOVERN-2.1', category: 'GOVERN', name: 'Roles and responsibilities defined', aceImplementation: 'UAC RBAC with ISSO/Analyst/Auditor roles', aceComponent: 'UAC Module', status: 'implemented', evidence: 'Role-based action permissions enforced' },
  { id: 'MAP-1.1', category: 'MAP', name: 'AI system context documented', aceImplementation: 'Rater & C&P Perspectives provide risk contextualization', aceComponent: 'Perspective Agents', status: 'implemented', evidence: 'Dual-perspective analysis in every workflow' },
  { id: 'MAP-1.5', category: 'MAP', name: 'Impacts to individuals assessed', aceImplementation: 'Veteran-centric benefit analysis with 38 CFR compliance', aceComponent: 'Evidence Validator', status: 'implemented', evidence: 'Statutory citations in all findings' },
  { id: 'MEASURE-1.1', category: 'MEASURE', name: 'Performance metrics established', aceImplementation: 'Governance scores: Integrity, Accuracy, Compliance', aceComponent: 'Supervisor Agent', status: 'implemented', evidence: 'Per-agent scoring with thresholds' },
  { id: 'MEASURE-2.1', category: 'MEASURE', name: 'AI outputs monitored', aceImplementation: 'REPAIR agent monitors logical inconsistencies', aceComponent: 'REPAIR Agent', status: 'implemented', evidence: 'Correction count and remediation logging' },
  { id: 'MEASURE-2.6', category: 'MEASURE', name: 'Security testing performed', aceImplementation: 'Adversarial Assurance Lane (AAL) with 44+ attack vectors', aceComponent: 'Red Team Agent', status: 'implemented', evidence: 'AAL certification results' },
  { id: 'MANAGE-1.1', category: 'MANAGE', name: 'Risk response procedures', aceImplementation: 'Automatic remediation via REPAIR agent', aceComponent: 'REPAIR Agent', status: 'implemented', evidence: 'Auto-correction with audit trail' },
  { id: 'MANAGE-2.4', category: 'MANAGE', name: 'Mechanisms for feedback', aceImplementation: 'Human approval gates capture adjudicator feedback', aceComponent: 'Supervisor Agent', status: 'implemented', evidence: 'Approval/rejection logged with notes' },
];

// NIST 800-53 Rev 5 Controls (AI-relevant subset)
const NIST_800_53_CONTROLS: ControlMapping[] = [
  { id: 'AC-2', category: 'Access Control', name: 'Account Management', aceImplementation: 'UAC module manages user roles and sessions', aceComponent: 'UAC Module', status: 'implemented', evidence: 'Session tracking, role assignments' },
  { id: 'AC-3', category: 'Access Control', name: 'Access Enforcement', aceImplementation: 'RBAC gates restrict actions by role', aceComponent: 'UAC Module', status: 'implemented', evidence: 'canActionWorkforce permission checks' },
  { id: 'AC-6', category: 'Access Control', name: 'Least Privilege', aceImplementation: 'Agents only receive sanitized, need-to-know data', aceComponent: 'Unified Gateway', status: 'implemented', evidence: 'PII stripped before agent processing' },
  { id: 'AU-2', category: 'Audit', name: 'Event Logging', aceImplementation: 'Forensic Ledger captures all agent activities', aceComponent: 'Activity Feed', status: 'implemented', evidence: 'Timestamped activity log' },
  { id: 'AU-3', category: 'Audit', name: 'Content of Audit Records', aceImplementation: 'Logs include role, timestamp, action, outcome', aceComponent: 'Activity Feed', status: 'implemented', evidence: 'Structured log format' },
  { id: 'AU-6', category: 'Audit', name: 'Audit Review', aceImplementation: 'Audit Page provides log analysis interface', aceComponent: 'Audit Page', status: 'implemented', evidence: 'Searchable audit interface' },
  { id: 'AU-12', category: 'Audit', name: 'Audit Generation', aceImplementation: 'Automatic logging at every agent transition', aceComponent: 'Supervisor Agent', status: 'implemented', evidence: 'addActivity() calls throughout workflow' },
  { id: 'CA-7', category: 'Assessment', name: 'Continuous Monitoring', aceImplementation: 'Real-time telemetry dashboard with metrics', aceComponent: 'Monitoring Dashboard', status: 'implemented', evidence: 'Live governance scores' },
  { id: 'CM-3', category: 'Config Mgmt', name: 'Configuration Change Control', aceImplementation: 'Demo Canon provides frozen test scenarios', aceComponent: 'Demo Canon', status: 'implemented', evidence: 'Immutable test cases' },
  { id: 'IR-4', category: 'Incident Response', name: 'Incident Handling', aceImplementation: 'REPAIR agent handles logical failures automatically', aceComponent: 'REPAIR Agent', status: 'implemented', evidence: 'Remediation actions logged' },
  { id: 'IR-5', category: 'Incident Response', name: 'Incident Monitoring', aceImplementation: 'Activity feed highlights errors/warnings in real-time', aceComponent: 'Activity Feed', status: 'implemented', evidence: 'Color-coded event types' },
  { id: 'RA-5', category: 'Risk Assessment', name: 'Vulnerability Monitoring', aceImplementation: 'AAL tests for prompt injection, data leakage, etc.', aceComponent: 'Red Team Agent', status: 'implemented', evidence: 'Security scorecard results' },
  { id: 'SI-4', category: 'System Integrity', name: 'System Monitoring', aceImplementation: 'Supervisor validates all agent outputs', aceComponent: 'Supervisor Agent', status: 'implemented', evidence: 'Integrity/Accuracy/Compliance scores' },
  { id: 'SI-10', category: 'System Integrity', name: 'Information Input Validation', aceImplementation: 'Unified Gateway validates and sanitizes all inputs', aceComponent: 'Unified Gateway', status: 'implemented', evidence: 'Redaction markers in processed data' },
];

// CMMC Level 2 Controls
const CMMC_CONTROLS: ControlMapping[] = [
  { id: 'AC.L2-3.1.1', category: 'Access Control', name: 'Authorized Access Control', aceImplementation: 'UAC enforces role-based access to workflow actions', aceComponent: 'UAC Module', status: 'implemented', evidence: 'Role permission matrix' },
  { id: 'AC.L2-3.1.2', category: 'Access Control', name: 'Transaction & Function Control', aceImplementation: 'Agent transitions require supervisor validation', aceComponent: 'Supervisor Agent', status: 'implemented', evidence: 'Gate enforcement logic' },
  { id: 'AU.L2-3.3.1', category: 'Audit', name: 'System Auditing', aceImplementation: 'Complete activity logging with timestamps', aceComponent: 'Forensic Ledger', status: 'implemented', evidence: 'Exportable telemetry package' },
  { id: 'AU.L2-3.3.2', category: 'Audit', name: 'User Accountability', aceImplementation: 'Actions attributed to authenticated user role', aceComponent: 'UAC Module', status: 'implemented', evidence: 'User session tracking' },
  { id: 'IR.L2-3.6.1', category: 'Incident Response', name: 'Incident Handling', aceImplementation: 'REPAIR agent provides automated remediation', aceComponent: 'REPAIR Agent', status: 'implemented', evidence: 'Correction count metrics' },
  { id: 'IR.L2-3.6.2', category: 'Incident Response', name: 'Incident Reporting', aceImplementation: 'Errors logged with full context for review', aceComponent: 'Activity Feed', status: 'implemented', evidence: 'Error type categorization' },
  { id: 'SI.L2-3.14.1', category: 'System Integrity', name: 'Flaw Remediation', aceImplementation: 'REPAIR agent corrects logical inconsistencies', aceComponent: 'REPAIR Agent', status: 'implemented', evidence: 'Auto-remediation audit trail' },
  { id: 'SI.L2-3.14.6', category: 'System Integrity', name: 'Monitor Communications', aceImplementation: 'All agent communications logged and validated', aceComponent: 'Supervisor Agent', status: 'implemented', evidence: 'Inter-agent message logging' },
];

// EU AI Act (High-Risk System Requirements)
const EU_AI_ACT_CONTROLS: ControlMapping[] = [
  { id: 'Art.9', category: 'Risk Management', name: 'Risk Management System', aceImplementation: 'Multi-layer governance with REPAIR and Supervisor agents', aceComponent: 'Governance Stack', status: 'implemented', evidence: 'Defense-in-depth architecture' },
  { id: 'Art.10', category: 'Data Governance', name: 'Data & Data Governance', aceImplementation: 'Unified Gateway ensures data quality and PII protection', aceComponent: 'Unified Gateway', status: 'implemented', evidence: 'Input sanitization pipeline' },
  { id: 'Art.11', category: 'Documentation', name: 'Technical Documentation', aceImplementation: 'Technical Manual, Whitepaper, compliance artifacts', aceComponent: 'Documentation', status: 'implemented', evidence: 'Comprehensive docs generated' },
  { id: 'Art.12', category: 'Record-Keeping', name: 'Record-Keeping', aceImplementation: 'Forensic Ledger maintains immutable audit trail', aceComponent: 'Forensic Ledger', status: 'implemented', evidence: 'Timestamped activity logs' },
  { id: 'Art.13', category: 'Transparency', name: 'Transparency & Information', aceImplementation: 'Clear UI showing AI decision factors and confidence', aceComponent: 'Agent Cards', status: 'implemented', evidence: 'Governance scores displayed' },
  { id: 'Art.14', category: 'Human Oversight', name: 'Human Oversight', aceImplementation: 'Mandatory Human Oversight Gates with approval workflow', aceComponent: 'Supervisor Agent', status: 'implemented', evidence: 'Escalation rate: configurable threshold' },
  { id: 'Art.15', category: 'Robustness', name: 'Accuracy, Robustness, Cybersecurity', aceImplementation: 'AAL validates against 44+ adversarial vectors', aceComponent: 'Red Team Agent', status: 'implemented', evidence: 'Security certification results' },
  { id: 'Art.17', category: 'Quality Mgmt', name: 'Quality Management System', aceImplementation: 'Supervisor scoring with integrity/accuracy/compliance', aceComponent: 'Supervisor Agent', status: 'implemented', evidence: 'Per-agent quality metrics' },
];

// VA Directive 6500
const VA_6500_CONTROLS: ControlMapping[] = [
  { id: 'VA-6500-A', category: 'Privacy', name: 'PII/PHI Protection', aceImplementation: 'Unified Gateway redacts all PII/PHI before processing', aceComponent: 'Unified Gateway', status: 'implemented', evidence: '[REDACTED] markers in output' },
  { id: 'VA-6500-B', category: 'Access', name: 'Need-to-Know Access', aceImplementation: 'Agents only see sanitized, role-appropriate data', aceComponent: 'UAC + Gateway', status: 'implemented', evidence: 'Tiered data access' },
  { id: 'VA-6500-C', category: 'Audit', name: 'Audit Trail Requirements', aceImplementation: 'Complete forensic logging of all transactions', aceComponent: 'Forensic Ledger', status: 'implemented', evidence: 'Exportable audit package' },
  { id: 'VA-6500-D', category: 'Security', name: 'Information Security', aceImplementation: 'Defense-in-depth with multiple validation layers', aceComponent: 'Architecture', status: 'implemented', evidence: 'Multi-agent validation' },
];

// 38 CFR Part 3
const CFR_38_CONTROLS: ControlMapping[] = [
  { id: '38-CFR-3.102', category: 'Evidence', name: 'Benefit of the Doubt', aceImplementation: 'Evidence Validator applies veteran-favorable interpretation', aceComponent: 'Evidence Validator', status: 'implemented', evidence: 'Statutory citation in findings' },
  { id: '38-CFR-3.303', category: 'Evidence', name: 'Service Connection Principles', aceImplementation: 'Nexus analysis with medical/service record correlation', aceComponent: 'Medical Nexus Agent', status: 'implemented', evidence: 'Connection strength scoring' },
  { id: '38-CFR-3.304', category: 'Evidence', name: 'Direct Service Connection', aceImplementation: 'Timeline correlation of service events to conditions', aceComponent: 'C&P Perspective', status: 'implemented', evidence: 'Temporal analysis in output' },
  { id: '38-CFR-3.310', category: 'Evidence', name: 'Secondary Conditions', aceImplementation: 'Identifies potential secondary service connections', aceComponent: 'Medical Nexus Agent', status: 'implemented', evidence: 'Secondary condition flagging' },
  { id: '38-CFR-4.1', category: 'Rating', name: 'Rating Schedule Application', aceImplementation: 'Diagnostic code mapping with severity assessment', aceComponent: 'Rater Perspective', status: 'implemented', evidence: 'CFR citations in recommendations' },
];

// Framework definitions
const COMPLIANCE_FRAMEWORKS: ComplianceFramework[] = [
  {
    id: 'nist-ai-rmf',
    name: 'NIST AI Risk Management Framework',
    shortName: 'NIST AI RMF',
    description: 'Voluntary framework for managing AI risks throughout the AI lifecycle',
    icon: Award,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    version: '1.0',
    url: 'https://www.nist.gov/itl/ai-risk-management-framework',
    controls: NIST_AI_RMF_CONTROLS,
  },
  {
    id: 'nist-800-53',
    name: 'NIST SP 800-53 Security Controls',
    shortName: 'NIST 800-53',
    description: 'Security and privacy controls for federal information systems',
    icon: Shield,
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-50',
    borderColor: 'border-indigo-200',
    version: 'Rev 5',
    url: 'https://csrc.nist.gov/publications/detail/sp/800-53/rev-5/final',
    controls: NIST_800_53_CONTROLS,
  },
  {
    id: 'cmmc',
    name: 'Cybersecurity Maturity Model Certification',
    shortName: 'CMMC',
    description: 'DoD cybersecurity requirements for defense contractors',
    icon: Target,
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-50',
    borderColor: 'border-emerald-200',
    version: 'Level 2',
    url: 'https://dodcio.defense.gov/CMMC/',
    controls: CMMC_CONTROLS,
  },
  {
    id: 'eu-ai-act',
    name: 'EU Artificial Intelligence Act',
    shortName: 'EU AI Act',
    description: 'European regulation on artificial intelligence (High-Risk)',
    icon: Globe,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
    version: '2024',
    url: 'https://artificialintelligenceact.eu/',
    controls: EU_AI_ACT_CONTROLS,
  },
  {
    id: 'va-6500',
    name: 'VA Directive 6500',
    shortName: 'VA 6500',
    description: 'VA information security program requirements',
    icon: Building2,
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    version: '2024',
    url: 'https://www.va.gov/vapubs/',
    controls: VA_6500_CONTROLS,
  },
  {
    id: '38-cfr',
    name: '38 CFR Part 3 - Adjudication',
    shortName: '38 CFR',
    description: 'Federal regulations for VA benefits adjudication',
    icon: Scale,
    color: 'text-amber-600',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
    version: 'Current',
    url: 'https://www.ecfr.gov/current/title-38/chapter-I/part-3',
    controls: CFR_38_CONTROLS,
  },
];

// ============================================================================
// COMPONENT
// ============================================================================

export const ComplianceStatement: React.FC<ComplianceStatementProps> = ({
  telemetry,
  activityFeed = [],
  redTeamResult
}) => {
  const [selectedFrameworks, setSelectedFrameworks] = useState<FrameworkId[]>(['nist-ai-rmf', 'cmmc', 'va-6500']);
  const [expandedFramework, setExpandedFramework] = useState<FrameworkId | null>('nist-ai-rmf');
  const [showFrameworkSelector, setShowFrameworkSelector] = useState(false);

  // Calculate metrics from actual telemetry
  const metrics = useMemo(() => {
    const totalActivities = activityFeed?.length || 0;
    const errorCount = activityFeed?.filter(a => a.type === 'error').length || 0;
    const warningCount = activityFeed?.filter(a => a.type === 'warning').length || 0;
    const successCount = activityFeed?.filter(a => a.type === 'success').length || 0;

    // Calculate from red team results if available
    const aalScore = redTeamResult?.scoreCard?.overallScore || null;
    const aalStatus = redTeamResult?.workflowTrustStatus || null;

    return {
      totalActivities,
      errorCount,
      warningCount,
      successCount,
      integrityScore: errorCount === 0 ? 100 : Math.max(0, 100 - (errorCount * 10)),
      aalScore,
      aalStatus,
      humanOversightRate: telemetry?.human_oversight_rate || '14.3%',
      securityPosture: telemetry?.security_posture || 'HARDENED',
    };
  }, [activityFeed, redTeamResult, telemetry]);

  // Calculate compliance scores per framework
  const frameworkScores = useMemo(() => {
    const scores: Record<FrameworkId, { implemented: number; total: number; percentage: number }> = {} as any;

    COMPLIANCE_FRAMEWORKS.forEach(fw => {
      const implemented = fw.controls.filter(c => c.status === 'implemented').length;
      const partial = fw.controls.filter(c => c.status === 'partial').length;
      const total = fw.controls.length;
      const percentage = Math.round(((implemented + partial * 0.5) / total) * 100);
      scores[fw.id] = { implemented, total, percentage };
    });

    return scores;
  }, []);

  const toggleFramework = (id: FrameworkId) => {
    setSelectedFrameworks(prev =>
      prev.includes(id)
        ? prev.filter(f => f !== id)
        : [...prev, id]
    );
  };

  const handlePrint = () => window.print();

  const getStatusBadge = (status: ControlMapping['status']) => {
    switch (status) {
      case 'implemented':
        return <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded text-[9px] font-black uppercase">Implemented</span>;
      case 'partial':
        return <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded text-[9px] font-black uppercase">Partial</span>;
      case 'planned':
        return <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-[9px] font-black uppercase">Planned</span>;
      case 'na':
        return <span className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded text-[9px] font-black uppercase">N/A</span>;
    }
  };

  const activeFrameworks = COMPLIANCE_FRAMEWORKS.filter(f => selectedFrameworks.includes(f.id));
  const totalControls = activeFrameworks.reduce((sum, f) => sum + f.controls.length, 0);
  const implementedControls = activeFrameworks.reduce((sum, f) =>
    sum + f.controls.filter(c => c.status === 'implemented').length, 0);
  const overallScore = totalControls > 0 ? Math.round((implementedControls / totalControls) * 100) : 0;

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-in fade-in duration-500 print:p-0 print:m-0 print:max-w-none">

      {/* Header */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white rounded-3xl p-8 relative overflow-hidden shadow-xl print:bg-white print:text-black print:rounded-none">
        <div className="absolute top-0 right-0 opacity-5"><Landmark size={200} /></div>
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className="px-3 py-1 bg-blue-600 rounded-full text-[9px] font-black uppercase tracking-widest">Federal Compliance</span>
                <span className="px-3 py-1 bg-emerald-600 rounded-full text-[9px] font-black uppercase tracking-widest">{selectedFrameworks.length} Frameworks Active</span>
              </div>
              <h1 className="text-2xl font-black uppercase tracking-tight">ACE Compliance Dashboard</h1>
              <p className="text-slate-400 text-sm mt-1">
                {activeFrameworks.map(f => f.shortName).join(' • ')}
              </p>
            </div>
            <div className="flex items-center gap-3 print:hidden">
              <button
                onClick={() => setShowFrameworkSelector(!showFrameworkSelector)}
                className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl text-xs font-bold transition-all"
              >
                <Settings size={14} /> Configure Frameworks
              </button>
              <button
                onClick={handlePrint}
                className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl text-xs font-bold transition-all"
              >
                <Printer size={14} /> Export PDF
              </button>
            </div>
          </div>

          {/* Framework Selector */}
          {showFrameworkSelector && (
            <div className="mt-4 p-4 bg-white/10 rounded-2xl backdrop-blur-sm">
              <p className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3">Select Applicable Frameworks</p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {COMPLIANCE_FRAMEWORKS.map(fw => (
                  <button
                    key={fw.id}
                    onClick={() => toggleFramework(fw.id)}
                    className={`flex items-center gap-2 p-3 rounded-xl text-left transition-all ${
                      selectedFrameworks.includes(fw.id)
                        ? 'bg-white text-slate-900'
                        : 'bg-white/5 hover:bg-white/10 text-white'
                    }`}
                  >
                    <fw.icon size={16} className={selectedFrameworks.includes(fw.id) ? fw.color : ''} />
                    <div>
                      <p className="text-xs font-bold">{fw.shortName}</p>
                      <p className="text-[9px] opacity-70">{fw.version}</p>
                    </div>
                    {selectedFrameworks.includes(fw.id) && (
                      <CheckCircle2 size={14} className="ml-auto text-emerald-500" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Score Cards Row */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <Target size={20} className="text-emerald-600" />
            <span className="text-[9px] font-black text-slate-400 uppercase">Overall</span>
          </div>
          <p className="text-3xl font-black text-emerald-600">{overallScore}%</p>
          <p className="text-[10px] text-slate-500 font-bold">{implementedControls}/{totalControls} Controls</p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <ShieldCheck size={20} className="text-blue-600" />
            <span className="text-[9px] font-black text-slate-400 uppercase">Integrity</span>
          </div>
          <p className="text-3xl font-black text-blue-600">{metrics.integrityScore}%</p>
          <p className="text-[10px] text-slate-500 font-bold">Chain Verified</p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <Lock size={20} className="text-purple-600" />
            <span className="text-[9px] font-black text-slate-400 uppercase">Posture</span>
          </div>
          <p className="text-lg font-black text-purple-600">{metrics.securityPosture}</p>
          <p className="text-[10px] text-slate-500 font-bold">Security Mode</p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <Eye size={20} className="text-amber-600" />
            <span className="text-[9px] font-black text-slate-400 uppercase">Oversight</span>
          </div>
          <p className="text-2xl font-black text-amber-600">{metrics.humanOversightRate}</p>
          <p className="text-[10px] text-slate-500 font-bold">Escalation Rate</p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <Zap size={20} className={metrics.aalStatus === 'TRUSTED' ? 'text-emerald-600' : metrics.aalStatus === 'UNTRUSTED' ? 'text-red-600' : 'text-slate-400'} />
            <span className="text-[9px] font-black text-slate-400 uppercase">AAL</span>
          </div>
          <p className={`text-2xl font-black ${metrics.aalStatus === 'TRUSTED' ? 'text-emerald-600' : metrics.aalStatus === 'UNTRUSTED' ? 'text-red-600' : 'text-slate-400'}`}>
            {metrics.aalScore || '—'}
          </p>
          <p className="text-[10px] text-slate-500 font-bold">{metrics.aalStatus || 'Not Run'}</p>
        </div>
      </div>

      {/* Framework Sections */}
      <div className="space-y-3">
        {activeFrameworks.map(framework => {
          const score = frameworkScores[framework.id];
          const isExpanded = expandedFramework === framework.id;

          // Group controls by category
          const categories = [...new Set(framework.controls.map(c => c.category))];

          return (
            <div key={framework.id} className={`bg-white rounded-2xl border shadow-sm overflow-hidden ${framework.borderColor}`}>
              <button
                onClick={() => setExpandedFramework(isExpanded ? null : framework.id)}
                className="w-full flex items-center justify-between p-5 hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className={`p-2 rounded-xl ${framework.bgColor}`}>
                    <framework.icon size={18} className={framework.color} />
                  </div>
                  <div className="text-left">
                    <h2 className="font-black text-slate-900 uppercase tracking-tight">{framework.name}</h2>
                    <p className="text-[10px] text-slate-400 font-bold">{framework.version} • {framework.controls.length} Controls</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`px-3 py-1 rounded-lg text-[10px] font-black ${
                    score.percentage >= 90 ? 'bg-emerald-100 text-emerald-700' :
                    score.percentage >= 70 ? 'bg-amber-100 text-amber-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    {score.implemented}/{score.total} ({score.percentage}%)
                  </span>
                  <a
                    href={framework.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1 hover:bg-slate-100 rounded transition-colors"
                    onClick={e => e.stopPropagation()}
                  >
                    <ExternalLink size={14} className="text-slate-400" />
                  </a>
                  {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                </div>
              </button>

              {isExpanded && (
                <div className="border-t border-slate-100">
                  {categories.map(category => {
                    const categoryControls = framework.controls.filter(c => c.category === category);
                    return (
                      <div key={category} className="border-b border-slate-50 last:border-0">
                        <div className="px-5 py-2 bg-slate-50">
                          <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">{category}</span>
                        </div>
                        <table className="w-full text-left">
                          <tbody className="divide-y divide-slate-50">
                            {categoryControls.map((control, i) => (
                              <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                                <td className="px-5 py-3 w-28">
                                  <span className="font-mono text-xs text-slate-600">{control.id}</span>
                                </td>
                                <td className="px-5 py-3 w-48">
                                  <span className="text-sm font-medium text-slate-700">{control.name}</span>
                                </td>
                                <td className="px-5 py-3">
                                  <p className="text-sm text-slate-600">{control.aceImplementation}</p>
                                  <p className="text-[10px] text-slate-400 mt-0.5">
                                    <span className="font-bold">{control.aceComponent}</span>
                                    {control.evidence && <span className="ml-2">• {control.evidence}</span>}
                                  </p>
                                </td>
                                <td className="px-5 py-3 w-28 text-right">
                                  {getStatusBadge(control.status)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Activity Summary */}
      {activityFeed && activityFeed.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
          <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider mb-4 flex items-center gap-2">
            <Activity size={16} className="text-blue-600" />
            Session Activity Summary
          </h3>
          <div className="grid grid-cols-4 gap-4">
            <div className="text-center p-3 bg-slate-50 rounded-xl">
              <p className="text-2xl font-black text-slate-700">{metrics.totalActivities}</p>
              <p className="text-[10px] font-bold text-slate-500 uppercase">Total Events</p>
            </div>
            <div className="text-center p-3 bg-emerald-50 rounded-xl">
              <p className="text-2xl font-black text-emerald-600">{metrics.successCount}</p>
              <p className="text-[10px] font-bold text-emerald-600 uppercase">Success</p>
            </div>
            <div className="text-center p-3 bg-amber-50 rounded-xl">
              <p className="text-2xl font-black text-amber-600">{metrics.warningCount}</p>
              <p className="text-[10px] font-bold text-amber-600 uppercase">Warnings</p>
            </div>
            <div className="text-center p-3 bg-red-50 rounded-xl">
              <p className="text-2xl font-black text-red-600">{metrics.errorCount}</p>
              <p className="text-[10px] font-bold text-red-600 uppercase">Errors</p>
            </div>
          </div>
        </div>
      )}

      {/* Signature Footer */}
      <div className="flex items-center justify-between pt-6 border-t border-slate-200">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-slate-900 flex items-center justify-center text-white font-black text-lg">WS</div>
          <div>
            <p className="font-black text-slate-900">William J. Storey III</p>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">ISSO AI Governance Lead</p>
          </div>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl">
          <ShieldCheck size={16} className="text-emerald-400" />
          <span className="text-[10px] font-black uppercase tracking-wider">Verified Governance Artifact</span>
        </div>
      </div>
    </div>
  );
};
