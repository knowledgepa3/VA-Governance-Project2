
import React from 'react';
import {
  Shield,
  Check,
  FileCheck,
  FileText,
  Calendar,
  AlertTriangle,
  ShieldCheck,
  BookOpen,
  Info,
  ClipboardList,
  Fingerprint,
  Stamp,
  Lock,
  Search,
  CheckCircle2,
  XCircle,
  Scale,
  Award,
  FileWarning,
  Clock,
  Target,
  DollarSign,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  BarChart3,
  PieChart,
  Building,
  Receipt,
  Briefcase
} from 'lucide-react';

interface FinancialReportViewProps {
  data: any;
}

export const FinancialReportView: React.FC<FinancialReportViewProps> = ({ data }) => {
  if (!data) return (
    <div className="p-12 text-center bg-white rounded-3xl border border-dashed border-slate-300 font-sans shadow-inner">
      <p className="text-slate-400 font-black tracking-widest uppercase italic">Initializing Corporate Integrity Audit... Awaiting Agent Aggregation.</p>
    </div>
  );

  // Parse the financial schema format
  const execSummary = data.executive_summary || {};
  const ledgerAnalysis = data.ledger_analysis || {};
  const fraudRisk = data.fraud_risk_assessment || {};
  const taxCompliance = data.tax_compliance || {};
  const controlAssessment = data.control_assessment || {};
  const recommendations = data.recommendations || [];
  const signature = data.signature_block || {};
  const disclaimer = data.disclaimer || '';

  const SectionHeader = ({ icon: Icon, title, color = '#1e40af' }: { icon: any; title: string; color?: string }) => (
    <div className="mb-6 border-b-2 pb-2 flex items-center gap-3" style={{ borderColor: color }}>
      <Icon style={{ color }} size={24} />
      <h2 className="text-[14pt] font-black uppercase tracking-wider" style={{ color }}>{title}</h2>
    </div>
  );

  const SeverityBadge = ({ severity }: { severity: string }) => {
    const colors: Record<string, string> = {
      'HIGH': 'bg-rose-100 text-rose-800 border-rose-300',
      'MATERIAL': 'bg-rose-100 text-rose-800 border-rose-300',
      'MEDIUM': 'bg-amber-100 text-amber-800 border-amber-300',
      'MODERATE': 'bg-amber-100 text-amber-800 border-amber-300',
      'SIGNIFICANT': 'bg-amber-100 text-amber-800 border-amber-300',
      'LOW': 'bg-emerald-100 text-emerald-600 border-emerald-300',
      'MINOR': 'bg-slate-100 text-slate-600 border-slate-300'
    };
    return (
      <span className={`px-3 py-1 rounded-full text-[9pt] font-black uppercase border ${colors[severity] || colors['MEDIUM']}`}>
        {severity}
      </span>
    );
  };

  const StatusBadge = ({ status, positive = false }: { status: string; positive?: boolean }) => {
    const isGood = positive || ['SATISFACTORY', 'COMPLIANT', 'BALANCED', 'ADEQUATE', 'EFFECTIVE', 'CURRENT', 'PASS'].includes(status);
    return (
      <span className={`px-3 py-1 rounded-full text-[9pt] font-black uppercase border ${
        isGood
          ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
          : 'bg-rose-100 text-rose-800 border-rose-300'
      }`}>
        {status}
      </span>
    );
  };

  const PriorityBadge = ({ priority }: { priority: string }) => {
    const colors: Record<string, string> = {
      'IMMEDIATE': 'bg-rose-600 text-white',
      'SHORT_TERM': 'bg-amber-500 text-white',
      'SHORT-TERM': 'bg-amber-500 text-white',
      'LONG_TERM': 'bg-blue-500 text-white',
      'LONG-TERM': 'bg-blue-500 text-white',
      'PLANNING': 'bg-slate-500 text-white'
    };
    return (
      <span className={`px-3 py-1 rounded text-[8pt] font-black uppercase ${colors[priority] || colors['SHORT_TERM']}`}>
        {priority}
      </span>
    );
  };

  return (
    <div className="bg-white text-slate-900 shadow-2xl mx-auto font-sans leading-relaxed selection:bg-blue-600 selection:text-white max-w-[8.5in] min-h-[11in] border border-slate-200">

      {/* DOCUMENT HEADER */}
      <div className="bg-gradient-to-r from-slate-900 to-blue-900 text-white p-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <Building size={48} className="text-white/90" />
            <div>
              <h1 className="text-[20pt] font-black uppercase tracking-[2px]">Corporate Integrity Audit</h1>
              <p className="text-white/80 font-semibold tracking-wide">Financial Compliance & Risk Assessment</p>
            </div>
          </div>
          <div className="text-right text-[10pt] text-white/70">
            <p>Generated: {signature.date || new Date().toLocaleDateString()}</p>
            <p className="font-bold text-white/90">ACE Governance Platform</p>
            <p className="text-[9pt]">{signature.engagement_id || `Engagement: #${Date.now().toString(36).toUpperCase()}`}</p>
          </div>
        </div>
        <div className="bg-white/10 rounded-lg p-4 mt-4">
          <p className="text-[11pt] font-semibold text-center">
            <ShieldCheck className="inline mr-2" size={18} />
            Analysis conducted per AICPA, PCAOB, and SOX compliance standards
          </p>
        </div>
      </div>

      <div className="p-10">

        {/* EXECUTIVE SUMMARY */}
        <SectionHeader icon={ClipboardList} title="Executive Summary" color="#1e40af" />
        <div className="bg-gradient-to-r from-slate-50 to-blue-50 p-6 rounded-lg border border-slate-200 mb-8">

          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-bold text-[11pt] text-blue-900 mb-1">Purpose of Audit</h3>
              <p className="text-[10pt] leading-relaxed">{execSummary.purpose || 'Corporate financial integrity assessment and compliance verification.'}</p>
            </div>
            <div className="text-center px-6 py-3 bg-white rounded-lg border border-slate-200">
              <p className="text-[9pt] text-slate-500 font-bold uppercase">Overall Assessment</p>
              <StatusBadge status={execSummary.overall_assessment || 'PENDING'} />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-white p-4 rounded border border-slate-200 text-center">
              <p className="text-[9pt] text-slate-500 font-bold uppercase mb-1">Audit Period</p>
              <p className="font-bold text-blue-900">{execSummary.audit_period || 'Current Fiscal Year'}</p>
            </div>
            <div className="bg-white p-4 rounded border border-slate-200 text-center">
              <p className="text-[9pt] text-slate-500 font-bold uppercase mb-1">Material Findings</p>
              <p className="text-2xl font-black text-rose-600">{execSummary.material_findings_count || 0}</p>
            </div>
            <div className="bg-white p-4 rounded border border-slate-200 text-center">
              <p className="text-[9pt] text-slate-500 font-bold uppercase mb-1">Scope Areas</p>
              <p className="font-bold text-blue-900">{(execSummary.scope || []).length || 'N/A'}</p>
            </div>
          </div>

          <div className="mb-4">
            <h3 className="font-bold text-[11pt] text-blue-900 mb-2 flex items-center gap-2">
              <BookOpen size={16} /> Regulatory Frameworks Applied
            </h3>
            <div className="flex flex-wrap gap-2">
              {(execSummary.regulatory_frameworks_applied || ['GAAP', 'SOX', 'IRC']).map((f: string, i: number) => (
                <span key={i} className="bg-blue-900 text-white px-3 py-1 rounded text-[9pt] font-semibold">
                  {f}
                </span>
              ))}
            </div>
          </div>

          <div>
            <h3 className="font-bold text-[11pt] text-blue-900 mb-2 flex items-center gap-2">
              <Target size={16} /> Scope of Examination
            </h3>
            <ul className="grid grid-cols-2 gap-2">
              {(execSummary.scope || ['General Ledger', 'Accounts Payable', 'Revenue Recognition', 'Tax Compliance']).map((s: string, i: number) => (
                <li key={i} className="text-[10pt] flex items-center gap-2 bg-white p-2 rounded border border-slate-200">
                  <CheckCircle2 className="text-blue-600" size={14} /> {s}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* LEDGER ANALYSIS */}
        <SectionHeader icon={Receipt} title="General Ledger Analysis" color="#059669" />
        <div className="border border-slate-200 rounded-lg overflow-hidden mb-8">
          <div className="bg-emerald-700 text-white p-4 flex items-center justify-between">
            <h3 className="font-black text-[11pt]">Double-Entry & Reconciliation Review</h3>
            <StatusBadge status={ledgerAnalysis.reconciliation_status || 'PENDING'} />
          </div>
          <div className="p-6">
            <div className="grid grid-cols-4 gap-4 mb-6">
              <div className="text-center p-3 bg-slate-50 rounded-lg">
                <p className="text-[9pt] text-slate-500 font-bold uppercase">Accounts Reviewed</p>
                <p className="text-2xl font-black text-slate-900">{ledgerAnalysis.accounts_reviewed || 'N/A'}</p>
              </div>
              <div className="text-center p-3 bg-slate-50 rounded-lg">
                <p className="text-[9pt] text-slate-500 font-bold uppercase">Transactions Sampled</p>
                <p className="text-2xl font-black text-slate-900">{ledgerAnalysis.transactions_sampled || 'N/A'}</p>
              </div>
              <div className="text-center p-3 bg-slate-50 rounded-lg">
                <p className="text-[9pt] text-slate-500 font-bold uppercase">D/E Errors Found</p>
                <p className="text-2xl font-black text-rose-600">{ledgerAnalysis.double_entry_errors || 0}</p>
              </div>
              <div className="text-center p-3 bg-slate-50 rounded-lg">
                <p className="text-[9pt] text-slate-500 font-bold uppercase">Variance Amount</p>
                <p className="text-xl font-black text-amber-600">{ledgerAnalysis.variance_amount || '$0'}</p>
              </div>
            </div>

            {(ledgerAnalysis.findings || []).length > 0 && (
              <div>
                <h4 className="font-bold text-[10pt] text-slate-700 mb-3">Findings</h4>
                <div className="space-y-3">
                  {ledgerAnalysis.findings.map((f: any, i: number) => (
                    <div key={i} className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-bold text-blue-900">{f.account}</span>
                        <SeverityBadge severity={f.severity} />
                      </div>
                      <p className="text-[10pt] text-slate-700 mb-2">{f.issue}</p>
                      <p className="text-[9pt] text-emerald-700 font-semibold">Recommendation: {f.recommendation}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* FRAUD RISK ASSESSMENT */}
        <SectionHeader icon={AlertTriangle} title="Fraud Risk Assessment" color="#dc2626" />
        <div className="border border-slate-200 rounded-lg overflow-hidden mb-8">
          <div className="bg-rose-700 text-white p-4 flex items-center justify-between">
            <h3 className="font-black text-[11pt]">Anomaly Detection & Control Analysis</h3>
            <span className={`px-4 py-1 rounded-full text-[10pt] font-black ${
              fraudRisk.risk_level === 'LOW' ? 'bg-emerald-500' :
              fraudRisk.risk_level === 'MODERATE' ? 'bg-amber-500' : 'bg-rose-900'
            }`}>
              Risk Level: {fraudRisk.risk_level || 'PENDING'}
            </span>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="text-center p-3 bg-slate-50 rounded-lg">
                <p className="text-[9pt] text-slate-500 font-bold uppercase">Anomalies Detected</p>
                <p className="text-2xl font-black text-amber-600">{fraudRisk.anomalies_detected || 0}</p>
              </div>
              <div className="text-center p-3 bg-slate-50 rounded-lg">
                <p className="text-[9pt] text-slate-500 font-bold uppercase">Benford Analysis</p>
                <StatusBadge status={fraudRisk.benford_analysis?.conclusion || 'NOT PERFORMED'} />
              </div>
              <div className="text-center p-3 bg-slate-50 rounded-lg">
                <p className="text-[9pt] text-slate-500 font-bold uppercase">Segregation of Duties</p>
                <StatusBadge status={fraudRisk.segregation_of_duties?.adequate ? 'ADEQUATE' : 'GAPS FOUND'} />
              </div>
            </div>

            {(fraudRisk.suspicious_patterns || []).length > 0 && (
              <div className="mb-6">
                <h4 className="font-bold text-[10pt] text-slate-700 mb-3">Suspicious Patterns Identified</h4>
                <div className="border border-slate-300 rounded-lg overflow-hidden">
                  <table className="w-full text-[9.5pt]">
                    <thead className="bg-slate-100">
                      <tr>
                        <th className="p-3 text-left">Pattern Type</th>
                        <th className="p-3 text-center">Frequency</th>
                        <th className="p-3 text-right">Est. Exposure</th>
                        <th className="p-3 text-left">Recommendation</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {fraudRisk.suspicious_patterns.map((p: any, i: number) => (
                        <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                          <td className="p-3 font-semibold">{p.pattern_type}</td>
                          <td className="p-3 text-center">{p.frequency}</td>
                          <td className="p-3 text-right font-bold text-rose-600">{p.estimated_exposure}</td>
                          <td className="p-3 text-[9pt]">{p.recommendation}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {(fraudRisk.segregation_of_duties?.gaps_identified || []).length > 0 && (
              <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-lg">
                <h4 className="font-bold text-[10pt] text-amber-800 mb-2">Segregation of Duties Gaps</h4>
                <ul className="space-y-1">
                  {fraudRisk.segregation_of_duties.gaps_identified.map((g: string, i: number) => (
                    <li key={i} className="text-[10pt] flex items-center gap-2">
                      <AlertCircle size={14} className="text-amber-600" /> {g}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        {/* TAX COMPLIANCE */}
        <SectionHeader icon={DollarSign} title="Tax Compliance Review" color="#7c3aed" />
        <div className="border border-slate-200 rounded-lg overflow-hidden mb-8">
          <div className="bg-purple-700 text-white p-4 flex items-center justify-between">
            <h3 className="font-black text-[11pt]">IRS/State Tax Alignment Analysis</h3>
            <StatusBadge status={taxCompliance.compliance_status || 'PENDING'} />
          </div>
          <div className="p-6">
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="text-center p-3 bg-slate-50 rounded-lg">
                <p className="text-[9pt] text-slate-500 font-bold uppercase">Federal Filing</p>
                <StatusBadge status={taxCompliance.filing_status?.federal || 'N/A'} />
              </div>
              <div className="text-center p-3 bg-slate-50 rounded-lg">
                <p className="text-[9pt] text-slate-500 font-bold uppercase">State Filing</p>
                <StatusBadge status={taxCompliance.filing_status?.state || 'N/A'} />
              </div>
              <div className="text-center p-3 bg-slate-50 rounded-lg">
                <p className="text-[9pt] text-slate-500 font-bold uppercase">Est. Tax Exposure</p>
                <p className="text-xl font-black text-rose-600">{taxCompliance.estimated_tax_exposure || '$0'}</p>
              </div>
            </div>

            {(taxCompliance.jurisdictions_reviewed || []).length > 0 && (
              <div className="mb-4">
                <h4 className="font-bold text-[10pt] text-slate-700 mb-2">Jurisdictions Reviewed</h4>
                <div className="flex flex-wrap gap-2">
                  {taxCompliance.jurisdictions_reviewed.map((j: string, i: number) => (
                    <span key={i} className="bg-purple-100 text-purple-800 px-3 py-1 rounded text-[9pt] font-semibold border border-purple-200">
                      {j}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {(taxCompliance.issues_found || []).length > 0 && (
              <div>
                <h4 className="font-bold text-[10pt] text-slate-700 mb-3">Issues Identified</h4>
                <div className="space-y-3">
                  {taxCompliance.issues_found.map((issue: any, i: number) => (
                    <div key={i} className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-mono font-bold text-purple-900">{issue.code_section}</span>
                        <span className="text-rose-600 font-bold">{issue.potential_liability}</span>
                      </div>
                      <p className="text-[10pt] text-slate-700 mb-2">{issue.issue}</p>
                      <p className="text-[9pt] text-emerald-700 font-semibold">Recommendation: {issue.recommendation}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* INTERNAL CONTROLS */}
        <SectionHeader icon={ShieldCheck} title="Internal Control Assessment" color="#0891b2" />
        <div className="border border-slate-200 rounded-lg overflow-hidden mb-8">
          <div className="bg-cyan-700 text-white p-4 flex items-center justify-between">
            <h3 className="font-black text-[11pt]">SOX Compliance & IT General Controls</h3>
            <StatusBadge status={controlAssessment.internal_controls_rating || 'PENDING'} />
          </div>
          <div className="p-6">
            <div className="grid grid-cols-2 gap-6 mb-6">
              <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                <h4 className="font-bold text-[11pt] text-cyan-800 mb-3">SOX Compliance</h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10pt]">Section 302 (Management Certification)</span>
                    {controlAssessment.sox_compliance?.section_302 ?
                      <CheckCircle2 className="text-emerald-500" size={18} /> :
                      <XCircle className="text-rose-500" size={18} />
                    }
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10pt]">Section 404 (Internal Control)</span>
                    {controlAssessment.sox_compliance?.section_404 ?
                      <CheckCircle2 className="text-emerald-500" size={18} /> :
                      <XCircle className="text-rose-500" size={18} />
                    }
                  </div>
                </div>
                {(controlAssessment.sox_compliance?.material_weaknesses || []).length > 0 && (
                  <div className="mt-3 pt-3 border-t border-slate-200">
                    <p className="text-[9pt] text-rose-600 font-bold">Material Weaknesses:</p>
                    <ul className="mt-1">
                      {controlAssessment.sox_compliance.material_weaknesses.map((w: string, i: number) => (
                        <li key={i} className="text-[9pt] text-slate-600">• {w}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
              <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                <h4 className="font-bold text-[11pt] text-cyan-800 mb-3">IT General Controls</h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10pt]">Access Controls</span>
                    <StatusBadge status={controlAssessment.it_general_controls?.access_controls || 'N/A'} />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10pt]">Change Management</span>
                    <StatusBadge status={controlAssessment.it_general_controls?.change_management || 'N/A'} />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10pt]">Backup & Recovery</span>
                    <StatusBadge status={controlAssessment.it_general_controls?.backup_recovery || 'N/A'} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* RECOMMENDATIONS */}
        <SectionHeader icon={Target} title="Recommendations" color="#ea580c" />
        <div className="space-y-4 mb-8">
          {(recommendations.length > 0 ? recommendations : [{
            priority: 'SHORT_TERM',
            category: 'General',
            recommendation: 'Complete full audit analysis to generate specific recommendations.',
            estimated_impact: 'TBD'
          }]).map((rec: any, i: number) => (
            <div key={i} className="p-5 bg-gradient-to-r from-orange-50 to-amber-50 rounded-lg border border-orange-200">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <PriorityBadge priority={rec.priority} />
                  <span className="text-[10pt] font-bold text-orange-800 uppercase">{rec.category}</span>
                </div>
                {rec.estimated_impact && (
                  <span className="text-[9pt] text-emerald-700 font-semibold">Impact: {rec.estimated_impact}</span>
                )}
              </div>
              <p className="text-[10pt] leading-relaxed">{rec.recommendation}</p>
            </div>
          ))}
        </div>

        {/* SIGNATURE BLOCK */}
        <div className="border-t-2 border-blue-900 pt-6 mb-8">
          <div className="flex justify-between items-end">
            <div className="space-y-1">
              <div className="w-64 h-px bg-slate-900 mb-2" />
              <p className="font-bold text-[11pt]">{signature.analyst_name || 'ACE Governance Platform'}</p>
              <p className="text-[9pt] text-slate-500 font-bold uppercase tracking-widest">{signature.title || 'Automated Corporate Integrity Auditor'}</p>
            </div>
            <div className="text-right">
              <p className="text-[10pt] font-bold">Date: {signature.date || new Date().toLocaleDateString()}</p>
              <p className="text-[9pt] text-slate-500">{signature.engagement_id || `Engagement: ACE-FIN-${Date.now().toString(36).toUpperCase()}`}</p>
            </div>
          </div>
        </div>

        {/* DISCLAIMER */}
        <div className="bg-slate-100 border border-slate-300 rounded-lg p-6 text-[8.5pt] text-slate-600">
          <div className="flex items-start gap-3">
            <FileWarning className="text-amber-500 flex-shrink-0 mt-0.5" size={20} />
            <div>
              <p className="font-bold uppercase tracking-widest text-slate-700 mb-2">Disclaimer & Professional Standards Notice</p>
              <p className="leading-relaxed">
                {disclaimer || 'This analysis is generated by an AI system for informational purposes only. Final determinations on financial matters rest with qualified CPAs, auditors, and regulatory bodies. This report applies professional auditing standards objectively per AICPA, PCAOB, and applicable regulatory frameworks. This document does not constitute accounting or legal advice.'}
              </p>
              <p className="mt-3 font-semibold text-blue-900">
                Organizations should consult with licensed CPAs, tax attorneys, or financial advisors for specific accounting and compliance matters.
              </p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
