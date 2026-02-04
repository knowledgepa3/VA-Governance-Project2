
import React from 'react';
import {
  Shield,
  AlertTriangle,
  ShieldCheck,
  Target,
  AlertCircle,
  Activity,
  Server,
  Network,
  Key,
  Clock,
  FileWarning,
  CheckCircle2,
  XCircle,
  Zap,
  Eye,
  Lock,
  Unlock,
  Globe,
  Terminal,
  Database,
  Users,
  Bug,
  Skull,
  Radio,
  ArrowRight,
  ArrowRightCircle,
  Crosshair,
  FileCode,
  Cpu
} from 'lucide-react';

interface CyberReportViewProps {
  data: any;
}

export const CyberReportView: React.FC<CyberReportViewProps> = ({ data }) => {
  if (!data) return (
    <div className="p-12 text-center bg-white rounded-3xl border border-dashed border-slate-300 font-sans shadow-inner">
      <p className="text-slate-400 font-black tracking-widest uppercase italic">Initializing Kill Chain Validation... Awaiting Agent Aggregation.</p>
    </div>
  );

  // Parse the cyber IR data format
  const incidentInfo = data.incident_info || {};
  const affectedSystems = data.affected_systems || [];
  const iocs = data.iocs || [];
  const killChainTimeline = data.kill_chain_timeline || [];
  const compromisedCredentials = data.compromised_credentials || [];
  const threatIntel = data.threat_intel || {};
  const complianceViolations = data.compliance_violations || [];
  const recommendedContainment = data.recommended_containment || [];

  const SectionHeader = ({ icon: Icon, title, color = '#dc2626' }: { icon: any; title: string; color?: string }) => (
    <div className="mb-6 border-b-2 pb-2 flex items-center gap-3" style={{ borderColor: color }}>
      <Icon style={{ color }} size={24} />
      <h2 className="text-[14pt] font-black uppercase tracking-wider" style={{ color }}>{title}</h2>
    </div>
  );

  const SeverityBadge = ({ severity }: { severity: string }) => {
    const colors: Record<string, string> = {
      'CRITICAL': 'bg-rose-600 text-white border-rose-700',
      'HIGH': 'bg-rose-100 text-rose-800 border-rose-300',
      'MEDIUM': 'bg-amber-100 text-amber-800 border-amber-300',
      'LOW': 'bg-emerald-100 text-emerald-600 border-emerald-300',
    };
    return (
      <span className={`px-3 py-1 rounded-full text-[9pt] font-black uppercase border ${colors[severity] || colors['MEDIUM']}`}>
        {severity}
      </span>
    );
  };

  const ConfidenceBadge = ({ confidence }: { confidence: string }) => {
    const colors: Record<string, string> = {
      'HIGH': 'bg-emerald-100 text-emerald-800 border-emerald-300',
      'MEDIUM': 'bg-amber-100 text-amber-800 border-amber-300',
      'LOW': 'bg-slate-100 text-slate-600 border-slate-300',
    };
    return (
      <span className={`px-2 py-0.5 rounded text-[8pt] font-bold uppercase border ${colors[confidence] || colors['MEDIUM']}`}>
        {confidence}
      </span>
    );
  };

  const ClassificationBadge = ({ classification }: { classification: string }) => {
    const colors: Record<string, string> = {
      'MANDATORY': 'bg-rose-600 text-white',
      'ADVISORY': 'bg-amber-500 text-white',
      'INFORMATIONAL': 'bg-blue-500 text-white',
    };
    return (
      <span className={`px-3 py-1 rounded text-[8pt] font-black uppercase ${colors[classification] || colors['ADVISORY']}`}>
        {classification}
      </span>
    );
  };

  const PriorityBadge = ({ priority }: { priority: string }) => {
    const colors: Record<string, string> = {
      'IMMEDIATE': 'bg-rose-600 text-white',
      'URGENT': 'bg-amber-500 text-white',
      'SCHEDULED': 'bg-blue-500 text-white',
    };
    return (
      <span className={`px-2 py-0.5 rounded text-[8pt] font-black uppercase ${colors[priority] || colors['URGENT']}`}>
        {priority}
      </span>
    );
  };

  const KillChainStageIcon = ({ stage }: { stage: string }) => {
    const icons: Record<string, any> = {
      'RECON': Eye,
      'WEAPONIZATION': Bug,
      'DELIVERY': Globe,
      'EXPLOITATION': Zap,
      'INSTALLATION': Database,
      'C2': Radio,
      'LATERAL_MOVEMENT': Network,
      'ACTIONS_ON_OBJECTIVES': Crosshair,
    };
    const Icon = icons[stage] || Activity;
    return <Icon size={18} />;
  };

  return (
    <div className="bg-white text-slate-900 shadow-2xl mx-auto font-sans leading-relaxed selection:bg-rose-600 selection:text-white max-w-[8.5in] min-h-[11in] border border-slate-200">

      {/* DOCUMENT HEADER */}
      <div className="bg-gradient-to-r from-slate-900 to-rose-900 text-white p-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <Shield size={48} className="text-rose-400" />
            <div>
              <h1 className="text-[20pt] font-black uppercase tracking-[2px]">Kill Chain Validation Report</h1>
              <p className="text-white/80 font-semibold tracking-wide">Cyber Incident Response Analysis</p>
            </div>
          </div>
          <div className="text-right text-[10pt] text-white/70">
            <p>Generated: {new Date().toLocaleDateString()}</p>
            <p className="font-bold text-white/90">ACE Governance Platform</p>
            <p className="text-[9pt]">Incident: {incidentInfo.incident_id || 'N/A'}</p>
          </div>
        </div>
        <div className="bg-white/10 rounded-lg p-4 mt-4">
          <p className="text-[11pt] font-semibold text-center">
            <ShieldCheck className="inline mr-2" size={18} />
            Analysis conducted per MITRE ATT&CK, NIST 800-53, and CMMC frameworks
          </p>
        </div>
      </div>

      <div className="p-10">

        {/* INCIDENT SUMMARY */}
        <SectionHeader icon={AlertTriangle} title="Incident Summary" color="#dc2626" />
        <div className="bg-gradient-to-r from-slate-50 to-rose-50 p-6 rounded-lg border border-slate-200 mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-bold text-[11pt] text-rose-900 mb-1">Incident ID: {incidentInfo.incident_id}</h3>
              <p className="text-[10pt] leading-relaxed">Type: {incidentInfo.incident_type || 'Security Incident'}</p>
            </div>
            <div className="text-center px-6 py-3 bg-white rounded-lg border border-rose-200">
              <p className="text-[9pt] text-slate-500 font-bold uppercase">Severity</p>
              <SeverityBadge severity={incidentInfo.initial_severity || 'HIGH'} />
            </div>
          </div>

          <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="bg-white p-4 rounded border border-slate-200 text-center">
              <p className="text-[9pt] text-slate-500 font-bold uppercase mb-1">Detection Source</p>
              <p className="font-bold text-rose-900 text-[10pt]">{incidentInfo.detection_source || 'SIEM'}</p>
            </div>
            <div className="bg-white p-4 rounded border border-slate-200 text-center">
              <p className="text-[9pt] text-slate-500 font-bold uppercase mb-1">Systems Affected</p>
              <p className="text-2xl font-black text-rose-600">{affectedSystems.length}</p>
            </div>
            <div className="bg-white p-4 rounded border border-slate-200 text-center">
              <p className="text-[9pt] text-slate-500 font-bold uppercase mb-1">IOCs Identified</p>
              <p className="text-2xl font-black text-amber-600">{iocs.length}</p>
            </div>
            <div className="bg-white p-4 rounded border border-slate-200 text-center">
              <p className="text-[9pt] text-slate-500 font-bold uppercase mb-1">Credentials Compromised</p>
              <p className="text-2xl font-black text-rose-600">{compromisedCredentials.length}</p>
            </div>
          </div>

          <div className="bg-rose-100 border-l-4 border-rose-600 p-4 rounded-r-lg">
            <p className="text-[10pt] font-bold text-rose-900">
              <Clock className="inline mr-2" size={16} />
              Detection: {incidentInfo.detection_timestamp ? new Date(incidentInfo.detection_timestamp).toLocaleString() : 'N/A'}
            </p>
          </div>
        </div>

        {/* THREAT INTELLIGENCE */}
        <SectionHeader icon={Skull} title="Threat Intelligence" color="#7c3aed" />
        <div className="border border-slate-200 rounded-lg overflow-hidden mb-8">
          <div className="bg-purple-700 text-white p-4 flex items-center justify-between">
            <h3 className="font-black text-[11pt]">Attribution & Campaign Analysis</h3>
            <ConfidenceBadge confidence={threatIntel.attribution_confidence || 'MEDIUM'} />
          </div>
          <div className="p-6">
            <div className="grid grid-cols-2 gap-6">
              <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                <h4 className="font-bold text-[11pt] text-purple-800 mb-3 flex items-center gap-2">
                  <Target size={16} /> Threat Actor
                </h4>
                <p className="text-xl font-black text-purple-900">{threatIntel.threat_actor || 'Unknown'}</p>
                <p className="text-[9pt] text-slate-500 mt-2">Attribution Confidence: {threatIntel.attribution_confidence}</p>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                <h4 className="font-bold text-[11pt] text-purple-800 mb-3 flex items-center gap-2">
                  <Bug size={16} /> Malware Family
                </h4>
                <p className="text-xl font-black text-purple-900">{threatIntel.malware_family || 'Unknown'}</p>
                <p className="text-[9pt] text-slate-500 mt-2">Campaign: {threatIntel.campaign || 'N/A'}</p>
              </div>
            </div>
            {threatIntel.ttps && threatIntel.ttps.length > 0 && (
              <div className="mt-4">
                <h4 className="font-bold text-[10pt] text-slate-700 mb-2">Known TTPs</h4>
                <div className="flex flex-wrap gap-2">
                  {threatIntel.ttps.map((ttp: string, i: number) => (
                    <span key={i} className="bg-purple-900 text-white px-3 py-1 rounded text-[9pt] font-mono">
                      {ttp}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* KILL CHAIN TIMELINE */}
        <SectionHeader icon={Activity} title="Kill Chain Timeline" color="#ea580c" />
        <div className="border border-slate-200 rounded-lg overflow-hidden mb-8">
          <div className="bg-orange-600 text-white p-4">
            <h3 className="font-black text-[11pt]">MITRE ATT&CK Mapped Attack Progression</h3>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {killChainTimeline.map((event: any, i: number) => (
                <div key={i} className="relative">
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center text-orange-600 border-2 border-orange-300">
                      <KillChainStageIcon stage={event.stage} />
                    </div>
                    <div className="flex-1 bg-slate-50 p-4 rounded-lg border border-slate-200">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-black text-orange-700 uppercase text-[10pt]">{event.stage}</span>
                        <span className="text-[9pt] text-slate-500">{event.timestamp ? new Date(event.timestamp).toLocaleString() : 'N/A'}</span>
                      </div>
                      <p className="text-[10pt] font-bold text-slate-800 mb-1">{event.event}</p>
                      <p className="text-[9pt] text-blue-700 font-mono mb-2">{event.technique}</p>
                      <div className="flex items-center justify-between text-[9pt]">
                        <span className="text-slate-500">Asset: <span className="font-bold text-slate-700">{event.affected_asset}</span></span>
                        <span className="text-slate-400">{event.evidence}</span>
                      </div>
                    </div>
                  </div>
                  {i < killChainTimeline.length - 1 && (
                    <div className="absolute left-5 top-12 w-0.5 h-4 bg-orange-200" />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* AFFECTED SYSTEMS */}
        <SectionHeader icon={Server} title="Affected Systems" color="#0891b2" />
        <div className="border border-slate-200 rounded-lg overflow-hidden mb-8">
          <div className="bg-cyan-700 text-white p-4">
            <h3 className="font-black text-[11pt]">Compromised Infrastructure</h3>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-2 gap-4">
              {affectedSystems.map((system: any, i: number) => (
                <div key={i} className={`p-4 rounded-lg border ${system.compromise_status === 'CONFIRMED' ? 'bg-rose-50 border-rose-200' : 'bg-amber-50 border-amber-200'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-slate-900">{system.hostname}</span>
                    <span className={`px-2 py-0.5 rounded text-[8pt] font-bold ${system.compromise_status === 'CONFIRMED' ? 'bg-rose-600 text-white' : 'bg-amber-500 text-white'}`}>
                      {system.compromise_status}
                    </span>
                  </div>
                  <p className="text-[10pt] text-slate-600 mb-1">IP: {system.ip_address}</p>
                  <p className="text-[10pt] text-slate-600 mb-1">Type: {system.asset_type}</p>
                  <p className="text-[9pt] text-slate-500">Criticality:
                    <span className={`ml-1 font-bold ${system.criticality === 'CRITICAL' ? 'text-rose-600' : 'text-amber-600'}`}>
                      {system.criticality}
                    </span>
                  </p>
                  <p className="text-[9pt] text-slate-400 mt-2 italic">{system.compromise_evidence}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* COMPROMISED CREDENTIALS */}
        <SectionHeader icon={Key} title="Compromised Credentials" color="#dc2626" />
        <div className="border border-slate-200 rounded-lg overflow-hidden mb-8">
          <div className="bg-rose-700 text-white p-4">
            <h3 className="font-black text-[11pt]">Identity Compromise Assessment</h3>
          </div>
          <div className="p-6">
            <div className="border border-slate-300 rounded-lg overflow-hidden">
              <table className="w-full text-[9.5pt]">
                <thead className="bg-slate-100">
                  <tr>
                    <th className="p-3 text-left">Account</th>
                    <th className="p-3 text-center">Type</th>
                    <th className="p-3 text-center">Compromise Method</th>
                    <th className="p-3 text-center">Scope</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {compromisedCredentials.map((cred: any, i: number) => (
                    <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                      <td className="p-3 font-mono font-bold">{cred.account_name}</td>
                      <td className="p-3 text-center">
                        <span className={`px-2 py-0.5 rounded text-[8pt] font-bold ${cred.account_type === 'DOMAIN_ADMIN' ? 'bg-rose-600 text-white' : 'bg-amber-100 text-amber-800'}`}>
                          {cred.account_type}
                        </span>
                      </td>
                      <td className="p-3 text-center">{cred.compromise_method}</td>
                      <td className="p-3 text-center text-rose-600 font-semibold">{cred.scope_of_access}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* IOC INVENTORY */}
        <SectionHeader icon={Crosshair} title="Indicators of Compromise (IOCs)" color="#059669" />
        <div className="border border-slate-200 rounded-lg overflow-hidden mb-8">
          <div className="bg-emerald-700 text-white p-4">
            <h3 className="font-black text-[11pt]">Validated IOC Evidence</h3>
          </div>
          <div className="p-6">
            <div className="space-y-3">
              {iocs.map((ioc: any, i: number) => (
                <div key={i} className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <span className="bg-emerald-700 text-white px-2 py-0.5 rounded text-[8pt] font-mono uppercase">{ioc.type}</span>
                      <span className="font-mono text-[10pt] text-slate-800">{ioc.value}</span>
                    </div>
                    <ConfidenceBadge confidence={ioc.confidence} />
                  </div>
                  <p className="text-[9pt] text-slate-600">{ioc.description}</p>
                  <div className="flex items-center gap-4 mt-2 text-[8pt] text-slate-400">
                    <span>Source: {ioc.source}</span>
                    <span>First Seen: {ioc.first_seen}</span>
                    <span>Last Seen: {ioc.last_seen}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* COMPLIANCE VIOLATIONS */}
        <SectionHeader icon={FileWarning} title="Compliance Impact" color="#7c3aed" />
        <div className="border border-slate-200 rounded-lg overflow-hidden mb-8">
          <div className="bg-purple-700 text-white p-4">
            <h3 className="font-black text-[11pt]">Regulatory Framework Violations</h3>
          </div>
          <div className="p-6">
            <div className="space-y-3">
              {complianceViolations.map((violation: any, i: number) => (
                <div key={i} className={`p-4 rounded-lg border ${violation.status === 'VIOLATED' ? 'bg-rose-50 border-rose-200' : 'bg-amber-50 border-amber-200'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <span className="bg-purple-900 text-white px-2 py-0.5 rounded text-[9pt] font-bold">{violation.framework}</span>
                      <span className="font-mono text-[10pt] text-slate-800">{violation.control_id}</span>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[8pt] font-bold ${violation.status === 'VIOLATED' ? 'bg-rose-600 text-white' : 'bg-amber-500 text-white'}`}>
                      {violation.status}
                    </span>
                  </div>
                  <p className="text-[10pt] font-bold text-slate-800">{violation.control_name}</p>
                  <p className="text-[9pt] text-slate-600 mt-1">{violation.finding}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* CONTAINMENT ACTIONS */}
        <SectionHeader icon={Shield} title="Recommended Containment Actions" color="#dc2626" />
        <div className="space-y-4 mb-8">
          {recommendedContainment.map((action: any, i: number) => (
            <div key={i} className={`p-5 rounded-lg border-2 ${action.classification === 'MANDATORY' ? 'bg-rose-50 border-rose-300' : action.classification === 'ADVISORY' ? 'bg-amber-50 border-amber-300' : 'bg-blue-50 border-blue-300'}`}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <ClassificationBadge classification={action.classification} />
                  <PriorityBadge priority={action.priority} />
                  <span className="text-[10pt] font-black text-slate-800 uppercase">{action.action_type}</span>
                </div>
              </div>
              <p className="text-[11pt] font-bold text-slate-900 mb-2">Target: {action.target}</p>
              <p className="text-[10pt] text-slate-700 mb-2">{action.rationale}</p>
              <p className="text-[9pt] text-slate-500">Estimated Impact: {action.estimated_impact}</p>
            </div>
          ))}
        </div>

        {/* SIGNATURE BLOCK */}
        <div className="border-t-2 border-rose-900 pt-6 mb-8">
          <div className="flex justify-between items-end">
            <div className="space-y-1">
              <div className="w-64 h-px bg-slate-900 mb-2" />
              <p className="font-bold text-[11pt]">ACE Governance Platform</p>
              <p className="text-[9pt] text-slate-500 font-bold uppercase tracking-widest">Automated Incident Response Analyst</p>
            </div>
            <div className="text-right">
              <p className="text-[10pt] font-bold">Date: {new Date().toLocaleDateString()}</p>
              <p className="text-[9pt] text-slate-500">Incident: {incidentInfo.incident_id}</p>
            </div>
          </div>
        </div>

        {/* DISCLAIMER */}
        <div className="bg-slate-100 border border-slate-300 rounded-lg p-6 text-[8.5pt] text-slate-600">
          <div className="flex items-start gap-3">
            <FileWarning className="text-amber-500 flex-shrink-0 mt-0.5" size={20} />
            <div>
              <p className="font-bold uppercase tracking-widest text-slate-700 mb-2">Disclaimer & Classification Notice</p>
              <p className="leading-relaxed">
                This Kill Chain Validation (KCV) report is generated by an AI system for security incident response purposes.
                Final determinations on containment actions, especially those classified as MANDATORY, require human approval
                from authorized personnel. This analysis applies MITRE ATT&CK, NIST 800-53, and CMMC frameworks objectively.
                Actions should be coordinated with your organization's incident response team and legal counsel.
              </p>
              <p className="mt-3 font-semibold text-rose-900">
                MANDATORY actions require explicit approval before execution. Do not proceed without proper authorization.
              </p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
