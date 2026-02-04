/**
 * BD Capture Report View - Proposal Development Summary
 *
 * Displays the compiled output from the BD Capture workforce:
 * - RFP Analysis & Requirements
 * - Compliance Matrix
 * - Past Performance Citations
 * - Technical Approach Draft
 * - Pricing Summary
 * - QA Assessment & PWin Score
 * - Submission Checklist
 */

import React from 'react';
import {
  FileText,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Target,
  DollarSign,
  Award,
  ClipboardCheck,
  TrendingUp,
  Building2,
  Calendar,
  Users,
  Briefcase,
  FileCheck,
  Send,
  Star,
  Shield,
  Rocket,
  Clock,
  AlertCircle,
  ChevronRight,
  Package,
  Flag,
  Zap,
  Download,
  FileDown
} from 'lucide-react';

interface CaptureReportViewProps {
  data: any;
  opportunityData?: any;
}

export const CaptureReportView: React.FC<CaptureReportViewProps> = ({ data, opportunityData }) => {
  // Check if data is empty or missing critical fields
  const hasData = data && Object.keys(data).length > 0 && (
    data.rfp_analysis ||
    data.solicitation_summary ||
    data.compliance_matrix?.length > 0 ||
    data.technical_sections?.length > 0 ||
    data.past_performance_citations?.length > 0 ||
    data.labor_categories?.length > 0 ||
    data.proposal_package
  );

  if (!hasData) return (
    <div className="p-12 text-center bg-white rounded-3xl border border-dashed border-slate-300 font-sans shadow-inner">
      <Rocket className="mx-auto mb-4 text-slate-300" size={48} />
      <div className="space-y-3">
        <p className="text-slate-400 font-black tracking-widest uppercase italic">Capture Report - Pending Data</p>
        <p className="text-slate-300 text-sm">Workflow has not completed or no data generated</p>

        {opportunityData && (
          <div className="mt-6 p-4 bg-emerald-50 rounded-xl border border-emerald-200 text-left max-w-md mx-auto">
            <p className="text-xs text-emerald-600 uppercase font-bold mb-2">✓ Opportunity Loaded</p>
            <p className="text-sm font-bold text-slate-700">{opportunityData.title}</p>
            <p className="text-xs text-slate-500">{opportunityData.rfpNumber} • {opportunityData.agency}</p>
            <p className="text-xs text-emerald-600 mt-2">
              ${opportunityData.estimatedValue ? `$${(opportunityData.estimatedValue / 1000).toFixed(0)}K` : 'Value TBD'} •
              {opportunityData.deadline ? ` Due: ${new Date(opportunityData.deadline).toLocaleDateString()}` : ''}
            </p>
          </div>
        )}

        {/* Show partial data if any exists */}
        {data && Object.keys(data).length > 0 && (
          <div className="mt-6 p-4 bg-blue-50 rounded-xl border border-blue-200 text-left max-w-md mx-auto">
            <p className="text-xs text-blue-600 uppercase font-bold mb-2">Partial Data Available</p>
            <p className="text-xs text-slate-600">
              The workflow is in progress. Received data from: {Object.keys(data).filter(k => data[k]).length} agent outputs
            </p>
            <ul className="text-xs text-slate-500 mt-2 space-y-1">
              {data.rfp_analysis && <li className="flex items-center gap-1"><CheckCircle2 size={10} className="text-emerald-500" /> RFP Analyzer</li>}
              {data.solicitation_summary && <li className="flex items-center gap-1"><CheckCircle2 size={10} className="text-emerald-500" /> Solicitation Summary</li>}
              {data.compliance_matrix?.length > 0 && <li className="flex items-center gap-1"><CheckCircle2 size={10} className="text-emerald-500" /> Compliance Matrix</li>}
              {data.past_performance_citations?.length > 0 && <li className="flex items-center gap-1"><CheckCircle2 size={10} className="text-emerald-500" /> Past Performance</li>}
              {data.technical_sections?.length > 0 && <li className="flex items-center gap-1"><CheckCircle2 size={10} className="text-emerald-500" /> Technical Approach</li>}
              {data.labor_categories?.length > 0 && <li className="flex items-center gap-1"><CheckCircle2 size={10} className="text-emerald-500" /> Pricing</li>}
              {data.compliance_check && <li className="flex items-center gap-1"><CheckCircle2 size={10} className="text-emerald-500" /> QA Check</li>}
              {data.proposal_package && <li className="flex items-center gap-1"><CheckCircle2 size={10} className="text-emerald-500" /> Proposal Package</li>}
            </ul>
          </div>
        )}

        {!opportunityData && (
          <div className="mt-6 p-4 bg-amber-50 rounded-xl border border-amber-200 text-left max-w-md mx-auto">
            <p className="text-xs text-amber-600 uppercase font-bold mb-2">⚠️ No Opportunity Data</p>
            <p className="text-sm text-amber-700">Select an opportunity from the BD Pipeline first, then run the Capture workflow.</p>
            <p className="text-xs text-slate-500 mt-2">Go to BD Pipeline → Select Opportunity → Click "Launch Capture Workflow"</p>
          </div>
        )}

        <div className="mt-6 text-xs text-slate-400">
          <p>The full report will display once the workflow completes.</p>
          <p className="mt-1">Check the workflow progress panel for current status.</p>
        </div>
      </div>
    </div>
  );

  // Extract data from agent outputs
  const rfpAnalysis = data.rfp_analysis || data.solicitation_summary || {};
  const mandatoryReqs = data.mandatory_requirements || [];
  const evalCriteria = data.evaluation_criteria || [];
  const complianceMatrix = data.compliance_matrix || [];
  const complianceScore = data.compliance_score || 0;
  const criticalGaps = data.critical_gaps || [];
  const teamingRecs = data.teaming_recommendations || [];
  const pastPerformance = data.past_performance_citations || [];
  const ppNarrative = data.narrative_draft || '';
  const technicalSections = data.technical_sections || [];
  const pricingModel = data.pricing_model || 'FFP';
  const laborCategories = data.labor_categories || [];
  const odcs = data.other_direct_costs || [];
  const totalPrice = data.total_price || 0;
  const competitiveAnalysis = data.competitive_analysis || {};
  const qaResult = data.compliance_check || {};
  const evalAlignment = data.evaluation_alignment || {};
  const winThemes = data.win_theme_review || {};
  const pwinAssessment = data.pwin_assessment || {};
  const proposalPackage = data.proposal_package || {};
  const submissionChecklist = proposalPackage.submission_checklist || [];
  const deliveryMethod = data.delivery_method || 'SAM.GOV';
  const submissionDeadline = data.submission_deadline || '';

  const SectionHeader = ({ icon: Icon, title, color = '#059669' }: { icon: any; title: string; color?: string }) => (
    <div className="mb-6 border-b-2 pb-2 flex items-center gap-3" style={{ borderColor: color }}>
      <Icon style={{ color }} size={24} />
      <h2 className="text-[14pt] font-black uppercase tracking-wider" style={{ color }}>{title}</h2>
    </div>
  );

  const ComplianceBadge = ({ status }: { status: string }) => {
    const colors: Record<string, string> = {
      'FULL': 'bg-emerald-100 text-emerald-800 border-emerald-300',
      'PARTIAL': 'bg-amber-100 text-amber-800 border-amber-300',
      'GAP': 'bg-rose-100 text-rose-800 border-rose-300',
      'N/A': 'bg-slate-100 text-slate-600 border-slate-300',
    };
    return (
      <span className={`px-2 py-0.5 rounded text-[9pt] font-bold uppercase border ${colors[status] || colors['PARTIAL']}`}>
        {status}
      </span>
    );
  };

  const RelevancyBadge = ({ score }: { score: string }) => {
    const colors: Record<string, string> = {
      'HIGH': 'bg-emerald-100 text-emerald-800 border-emerald-300',
      'MEDIUM': 'bg-blue-100 text-blue-800 border-blue-300',
      'LOW': 'bg-slate-100 text-slate-600 border-slate-300',
    };
    return (
      <span className={`px-2 py-0.5 rounded text-[9pt] font-bold uppercase border ${colors[score] || colors['MEDIUM']}`}>
        {score} Relevancy
      </span>
    );
  };

  const PWinBadge = ({ score }: { score: string }) => {
    const colors: Record<string, string> = {
      'HIGH': 'bg-emerald-600 text-white',
      'MEDIUM': 'bg-amber-500 text-white',
      'LOW': 'bg-rose-500 text-white',
    };
    return (
      <span className={`px-4 py-2 rounded-xl text-sm font-black uppercase ${colors[score] || colors['MEDIUM']}`}>
        PWin: {score}
      </span>
    );
  };

  return (
    <div className="bg-white rounded-3xl shadow-2xl overflow-hidden font-sans print:shadow-none" style={{ maxWidth: '900px', margin: '0 auto' }}>
      {/* Report Header */}
      <div className="bg-gradient-to-r from-emerald-800 to-emerald-600 text-white p-8">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Rocket size={20} />
              <span className="text-emerald-200 text-xs font-bold uppercase tracking-widest">BD Capture Report</span>
            </div>
            <h1 className="text-2xl font-black mb-2">
              {rfpAnalysis.title || opportunityData?.title || 'Proposal Development Summary'}
            </h1>
            <p className="text-emerald-200 text-sm">
              {rfpAnalysis.notice_id || opportunityData?.rfpNumber || 'Capture Analysis'}
            </p>
          </div>
          <div className="text-right">
            {pwinAssessment.score && <PWinBadge score={pwinAssessment.score} />}
            <div className="mt-2 text-xs text-emerald-200">
              Generated: {new Date().toLocaleDateString()}
            </div>
          </div>
        </div>
      </div>

      {/* Quick Stats Bar */}
      <div className="bg-slate-50 border-b border-slate-200 p-4">
        <div className="grid grid-cols-6 gap-4 text-center">
          <div>
            <div className="text-2xl font-black text-emerald-600">{complianceScore}%</div>
            <div className="text-[10px] text-slate-500 uppercase font-bold">Compliance</div>
          </div>
          <div>
            <div className="text-2xl font-black text-slate-800">${(totalPrice / 1000).toFixed(0)}K</div>
            <div className="text-[10px] text-slate-500 uppercase font-bold">Total Price</div>
          </div>
          <div>
            <div className="text-2xl font-black text-blue-600">{pastPerformance.length}</div>
            <div className="text-[10px] text-slate-500 uppercase font-bold">PP Citations</div>
          </div>
          <div>
            <div className="text-2xl font-black text-purple-600">{proposalPackage.total_pages || (proposalPackage.volumes?.reduce((sum: number, v: any) => sum + (v.page_count || 0), 0)) || technicalSections.length * 4}</div>
            <div className="text-[10px] text-slate-500 uppercase font-bold">Pages</div>
          </div>
          <div>
            <div className="text-2xl font-black text-indigo-600">{(proposalPackage.volumes?.length || 0) + (proposalPackage.attachments?.length || 0) + technicalSections.length}</div>
            <div className="text-[10px] text-slate-500 uppercase font-bold">Artifacts</div>
          </div>
          <div>
            <div className="text-2xl font-black text-amber-600">{criticalGaps.length}</div>
            <div className="text-[10px] text-slate-500 uppercase font-bold">Gaps</div>
          </div>
        </div>
      </div>

      <div className="p-8 space-y-10">
        {/* Executive Summary */}
        <section>
          <SectionHeader icon={Target} title="Executive Summary" color="#059669" />
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <div className="text-xs text-slate-500 uppercase font-bold mb-1">Agency</div>
                <div className="font-bold text-slate-800">{rfpAnalysis.agency || opportunityData?.agency || 'N/A'}</div>
              </div>
              <div>
                <div className="text-xs text-slate-500 uppercase font-bold mb-1">NAICS Code</div>
                <div className="font-bold text-slate-800">{rfpAnalysis.naics || opportunityData?.naicsCode || 'N/A'}</div>
              </div>
              <div>
                <div className="text-xs text-slate-500 uppercase font-bold mb-1">Set-Aside</div>
                <div className="font-bold text-slate-800">{rfpAnalysis.set_aside || opportunityData?.setAsideType || 'Full & Open'}</div>
              </div>
              <div>
                <div className="text-xs text-slate-500 uppercase font-bold mb-1">Contract Type</div>
                <div className="font-bold text-slate-800">{rfpAnalysis.contract_type || pricingModel}</div>
              </div>
              <div>
                <div className="text-xs text-slate-500 uppercase font-bold mb-1">Response Deadline</div>
                <div className="font-bold text-slate-800 flex items-center gap-2">
                  <Calendar size={14} />
                  {rfpAnalysis.response_deadline || (opportunityData?.deadline ? new Date(opportunityData.deadline).toLocaleDateString() : 'TBD')}
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-500 uppercase font-bold mb-1">Period of Performance</div>
                <div className="font-bold text-slate-800">{rfpAnalysis.pop || 'TBD'}</div>
              </div>
            </div>
          </div>
        </section>

        {/* Evaluation Criteria */}
        {evalCriteria.length > 0 && (
          <section>
            <SectionHeader icon={Award} title="Evaluation Criteria" color="#7c3aed" />
            <div className="space-y-3">
              {evalCriteria.map((criterion: any, idx: number) => (
                <div key={idx} className="flex items-center justify-between bg-slate-50 rounded-xl p-4 border border-slate-200">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center font-black text-sm">
                      {idx + 1}
                    </div>
                    <div>
                      <div className="font-bold text-slate-800">{criterion.factor}</div>
                      <div className="text-xs text-slate-500">{criterion.description}</div>
                    </div>
                  </div>
                  <div className="text-xl font-black text-purple-600">{criterion.weight}</div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Compliance Matrix */}
        {complianceMatrix.length > 0 && (
          <section>
            <SectionHeader icon={ClipboardCheck} title="Compliance Matrix" color="#0891b2" />
            <div className="overflow-hidden rounded-xl border border-slate-200">
              <table className="w-full text-sm">
                <thead className="bg-slate-100">
                  <tr>
                    <th className="text-left p-3 font-bold text-slate-600 text-xs uppercase">Req ID</th>
                    <th className="text-left p-3 font-bold text-slate-600 text-xs uppercase">Requirement</th>
                    <th className="text-left p-3 font-bold text-slate-600 text-xs uppercase">Status</th>
                    <th className="text-left p-3 font-bold text-slate-600 text-xs uppercase">ACE Capability</th>
                  </tr>
                </thead>
                <tbody>
                  {complianceMatrix.map((item: any, idx: number) => (
                    <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                      <td className="p-3 font-mono text-xs font-bold text-slate-500">{item.req_id}</td>
                      <td className="p-3 text-slate-700">{item.requirement}</td>
                      <td className="p-3"><ComplianceBadge status={item.compliance_status} /></td>
                      <td className="p-3 text-slate-600 text-xs">{item.ace_capability}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {criticalGaps.length > 0 && (
              <div className="mt-4 bg-amber-50 border border-amber-200 rounded-xl p-4">
                <div className="flex items-center gap-2 text-amber-700 font-bold text-sm mb-2">
                  <AlertTriangle size={16} />
                  Critical Gaps Identified
                </div>
                <ul className="list-disc list-inside text-sm text-amber-800 space-y-1">
                  {criticalGaps.map((gap: string, idx: number) => (
                    <li key={idx}>{gap}</li>
                  ))}
                </ul>
              </div>
            )}
            {teamingRecs.length > 0 && (
              <div className="mt-4 bg-blue-50 border border-blue-200 rounded-xl p-4">
                <div className="flex items-center gap-2 text-blue-700 font-bold text-sm mb-2">
                  <Users size={16} />
                  Teaming Recommendations
                </div>
                <ul className="list-disc list-inside text-sm text-blue-800 space-y-1">
                  {teamingRecs.map((rec: string, idx: number) => (
                    <li key={idx}>{rec}</li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        )}

        {/* Past Performance */}
        {pastPerformance.length > 0 && (
          <section>
            <SectionHeader icon={Briefcase} title="Past Performance Citations" color="#dc2626" />
            <div className="space-y-4">
              {pastPerformance.map((pp: any, idx: number) => (
                <div key={idx} className="bg-slate-50 rounded-xl border border-slate-200 p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="font-black text-slate-800">{pp.contract_name}</div>
                      <div className="text-sm text-slate-500 flex items-center gap-2">
                        <Building2 size={12} />
                        {pp.client} • {pp.period}
                      </div>
                    </div>
                    <div className="text-right">
                      <RelevancyBadge score={pp.relevancy_score} />
                      <div className="text-lg font-black text-slate-800 mt-1">{pp.contract_value}</div>
                    </div>
                  </div>
                  {pp.key_accomplishments && pp.key_accomplishments.length > 0 && (
                    <div className="mt-3">
                      <div className="text-xs text-slate-500 uppercase font-bold mb-2">Key Accomplishments</div>
                      <ul className="space-y-1">
                        {pp.key_accomplishments.map((acc: string, i: number) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                            <CheckCircle2 size={14} className="text-emerald-500 mt-0.5 flex-shrink-0" />
                            {acc}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ))}
            </div>
            {ppNarrative && (
              <div className="mt-4 bg-slate-100 rounded-xl p-4 border border-slate-200">
                <div className="text-xs text-slate-500 uppercase font-bold mb-2">Past Performance Narrative</div>
                <p className="text-sm text-slate-700 italic">{ppNarrative}</p>
              </div>
            )}
          </section>
        )}

        {/* Technical Approach */}
        {technicalSections.length > 0 && (
          <section>
            <SectionHeader icon={FileText} title="Technical Approach" color="#2563eb" />
            <div className="space-y-6">
              {technicalSections.map((section: any, idx: number) => (
                <div key={idx} className="bg-blue-50 rounded-xl border border-blue-200 p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div className="font-black text-blue-800">{section.section_name}</div>
                    <div className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded font-bold">
                      {section.evaluation_factor}
                    </div>
                  </div>
                  <p className="text-sm text-slate-700 mb-4">{section.narrative}</p>

                  {section.win_themes && section.win_themes.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-3">
                      {section.win_themes.map((theme: string, i: number) => (
                        <span key={i} className="px-2 py-1 bg-emerald-100 text-emerald-700 text-xs font-bold rounded-lg flex items-center gap-1">
                          <Star size={10} /> {theme}
                        </span>
                      ))}
                    </div>
                  )}

                  {section.discriminators && section.discriminators.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {section.discriminators.map((disc: string, i: number) => (
                        <span key={i} className="px-2 py-1 bg-purple-100 text-purple-700 text-xs font-bold rounded-lg flex items-center gap-1">
                          <Zap size={10} /> {disc}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Pricing Summary */}
        {laborCategories.length > 0 && (
          <section>
            <SectionHeader icon={DollarSign} title="Pricing Summary" color="#059669" />
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-200 text-center">
                <div className="text-3xl font-black text-emerald-600">${(totalPrice / 1000).toFixed(0)}K</div>
                <div className="text-xs text-slate-500 uppercase font-bold">Total Price</div>
              </div>
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 text-center">
                <div className="text-2xl font-black text-slate-800">{pricingModel}</div>
                <div className="text-xs text-slate-500 uppercase font-bold">Contract Type</div>
              </div>
              <div className="bg-blue-50 rounded-xl p-4 border border-blue-200 text-center">
                <div className="text-xl font-bold text-blue-700">{competitiveAnalysis.position || 'Competitive'}</div>
                <div className="text-xs text-slate-500 uppercase font-bold">Position</div>
              </div>
            </div>

            <div className="overflow-hidden rounded-xl border border-slate-200">
              <table className="w-full text-sm">
                <thead className="bg-slate-100">
                  <tr>
                    <th className="text-left p-3 font-bold text-slate-600 text-xs uppercase">Labor Category</th>
                    <th className="text-right p-3 font-bold text-slate-600 text-xs uppercase">Rate</th>
                    <th className="text-right p-3 font-bold text-slate-600 text-xs uppercase">Hours</th>
                    <th className="text-right p-3 font-bold text-slate-600 text-xs uppercase">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {laborCategories.map((lc: any, idx: number) => (
                    <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                      <td className="p-3 font-medium text-slate-700">{lc.category}</td>
                      <td className="p-3 text-right text-slate-600">${lc.rate}/hr</td>
                      <td className="p-3 text-right text-slate-600">{lc.hours}</td>
                      <td className="p-3 text-right font-bold text-slate-800">${lc.total?.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-emerald-50">
                  <tr>
                    <td colSpan={3} className="p-3 text-right font-bold text-slate-700">Total Price</td>
                    <td className="p-3 text-right font-black text-emerald-700 text-lg">${totalPrice?.toLocaleString()}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </section>
        )}

        {/* QA Assessment */}
        {(qaResult.score || pwinAssessment.score) && (
          <section>
            <SectionHeader icon={Shield} title="QA Assessment" color="#7c3aed" />
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-purple-50 rounded-xl border border-purple-200 p-5">
                <div className="text-xs text-purple-600 uppercase font-bold mb-2">Compliance Score</div>
                <div className="text-4xl font-black text-purple-700">{qaResult.score || complianceScore}%</div>
                {qaResult.corrections_needed && qaResult.corrections_needed.length > 0 && (
                  <div className="mt-3 text-xs text-purple-600">
                    {qaResult.corrections_needed.length} minor corrections needed
                  </div>
                )}
              </div>
              <div className="bg-emerald-50 rounded-xl border border-emerald-200 p-5">
                <div className="text-xs text-emerald-600 uppercase font-bold mb-2">Win Probability</div>
                <div className="text-4xl font-black text-emerald-700">{pwinAssessment.score || 'TBD'}</div>
                {pwinAssessment.factors && pwinAssessment.factors.length > 0 && (
                  <div className="mt-3 text-xs text-emerald-600">
                    Based on {pwinAssessment.factors.length} positive factors
                  </div>
                )}
              </div>
            </div>

            {winThemes.themes_present && winThemes.themes_present.length > 0 && (
              <div className="mt-4 bg-slate-50 rounded-xl border border-slate-200 p-4">
                <div className="text-xs text-slate-500 uppercase font-bold mb-3">Win Themes Identified</div>
                <div className="flex flex-wrap gap-2">
                  {winThemes.themes_present.map((theme: string, idx: number) => (
                    <span key={idx} className="px-3 py-1.5 bg-emerald-100 text-emerald-700 text-sm font-bold rounded-lg flex items-center gap-1">
                      <CheckCircle2 size={14} /> {theme}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </section>
        )}

        {/* Proposal Package Summary */}
        {(proposalPackage.volumes?.length > 0 || technicalSections.length > 0) && (
          <section>
            <SectionHeader icon={Package} title="Proposal Package Summary" color="#4f46e5" />
            <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-6">
              {/* Volume Breakdown */}
              {proposalPackage.volumes?.length > 0 && (
                <div className="mb-6">
                  <div className="text-xs text-indigo-600 uppercase font-bold mb-3">Volume Breakdown</div>
                  <div className="overflow-hidden rounded-xl border border-indigo-200">
                    <table className="w-full text-sm">
                      <thead className="bg-indigo-100">
                        <tr>
                          <th className="text-left p-3 font-bold text-indigo-700 text-xs uppercase">Volume</th>
                          <th className="text-left p-3 font-bold text-indigo-700 text-xs uppercase">Sections</th>
                          <th className="text-center p-3 font-bold text-indigo-700 text-xs uppercase">Pages</th>
                          <th className="text-center p-3 font-bold text-indigo-700 text-xs uppercase">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {proposalPackage.volumes.map((vol: any, idx: number) => (
                          <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-indigo-50/50'}>
                            <td className="p-3 font-bold text-slate-800">{vol.volume_name}</td>
                            <td className="p-3 text-slate-600 text-xs">{vol.sections?.join(', ') || '-'}</td>
                            <td className="p-3 text-center font-black text-indigo-600">{vol.page_count}</td>
                            <td className="p-3 text-center">
                              <span className={`px-2 py-0.5 rounded text-[9pt] font-bold uppercase ${
                                vol.status === 'COMPLETE' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                              }`}>
                                {vol.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-indigo-100">
                        <tr>
                          <td colSpan={2} className="p-3 text-right font-bold text-indigo-700">Total Pages</td>
                          <td className="p-3 text-center font-black text-indigo-800 text-lg">
                            {proposalPackage.total_pages || proposalPackage.volumes.reduce((sum: number, v: any) => sum + (v.page_count || 0), 0)}
                          </td>
                          <td></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              )}

              {/* Attachments */}
              {proposalPackage.attachments?.length > 0 && (
                <div className="mb-6">
                  <div className="text-xs text-indigo-600 uppercase font-bold mb-3">Attachments Included</div>
                  <div className="flex flex-wrap gap-2">
                    {proposalPackage.attachments.map((att: string, idx: number) => (
                      <span key={idx} className="px-3 py-1.5 bg-white border border-indigo-200 text-indigo-700 text-sm font-medium rounded-lg flex items-center gap-1">
                        <FileCheck size={14} /> {att}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Package Stats */}
              <div className="grid grid-cols-4 gap-4 pt-4 border-t border-indigo-200">
                <div className="text-center">
                  <div className="text-2xl font-black text-indigo-600">
                    {proposalPackage.volumes?.length || 0}
                  </div>
                  <div className="text-[10px] text-slate-500 uppercase font-bold">Volumes</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-black text-indigo-600">
                    {proposalPackage.total_pages || proposalPackage.volumes?.reduce((sum: number, v: any) => sum + (v.page_count || 0), 0) || 0}
                  </div>
                  <div className="text-[10px] text-slate-500 uppercase font-bold">Total Pages</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-black text-indigo-600">
                    {proposalPackage.attachments?.length || 0}
                  </div>
                  <div className="text-[10px] text-slate-500 uppercase font-bold">Attachments</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-black text-emerald-600">
                    {proposalPackage.volumes?.every((v: any) => v.status === 'COMPLETE') ? '100%' : 'In Progress'}
                  </div>
                  <div className="text-[10px] text-slate-500 uppercase font-bold">Complete</div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Submission Checklist */}
        {submissionChecklist.length > 0 && (
          <section>
            <SectionHeader icon={Send} title="Submission Checklist" color="#f59e0b" />
            <div className="bg-amber-50 rounded-xl border border-amber-200 p-5">
              <div className="grid grid-cols-2 gap-3">
                {submissionChecklist.map((item: any, idx: number) => (
                  <div key={idx} className="flex items-center gap-3">
                    {item.status === 'DONE' ? (
                      <CheckCircle2 size={18} className="text-emerald-500" />
                    ) : (
                      <Clock size={18} className="text-amber-500" />
                    )}
                    <span className={`text-sm ${item.status === 'DONE' ? 'text-slate-700' : 'text-amber-700 font-bold'}`}>
                      {item.item}
                    </span>
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-4 border-t border-amber-200 flex items-center justify-between">
                <div className="text-sm text-slate-600">
                  <strong>Delivery Method:</strong> {deliveryMethod}
                </div>
                {submissionDeadline && (
                  <div className="text-sm text-amber-700 font-bold flex items-center gap-2">
                    <AlertCircle size={14} />
                    Submit by: {new Date(submissionDeadline).toLocaleDateString()}
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        {/* Export Options */}
        <section className="border-t border-slate-200 pt-6 mt-8">
          <div className="flex items-center justify-between mb-4">
            <div className="text-xs text-slate-500 uppercase font-bold">Export Options</div>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  // Generate Markdown export using data URL (browser-safe method)
                  const markdown = generateProposalMarkdown(data, opportunityData, rfpAnalysis, proposalPackage, technicalSections, pastPerformance, laborCategories, complianceMatrix, pwinAssessment, qaResult);
                  const filename = `Proposal-${rfpAnalysis.notice_id || 'Draft'}-${new Date().toISOString().split('T')[0]}.txt`;

                  // Use data URL approach which bypasses browser security for text files
                  const dataUrl = 'data:text/plain;charset=utf-8,' + encodeURIComponent(markdown);
                  const a = document.createElement('a');
                  a.href = dataUrl;
                  a.download = filename;
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-lg hover:bg-indigo-700 transition-all"
              >
                <FileDown size={14} />
                Export Markdown (.txt)
              </button>
              <button
                onClick={() => {
                  // Generate JSON export for Claude Desktop processing
                  const jsonData = {
                    metadata: {
                      exportType: 'BD_CAPTURE_PROPOSAL',
                      generatedAt: new Date().toISOString(),
                      solicitationType: rfpAnalysis.set_aside ? 'RFP' : 'RFI',
                      noticeId: rfpAnalysis.notice_id || opportunityData?.rfpNumber,
                      title: rfpAnalysis.title || opportunityData?.title
                    },
                    solicitation: rfpAnalysis,
                    complianceMatrix,
                    technicalSections,
                    pastPerformance,
                    pricing: {
                      model: data.pricing_model,
                      laborCategories,
                      otherDirectCosts: data.other_direct_costs,
                      totalPrice: data.total_price
                    },
                    qa: qaResult,
                    pwin: pwinAssessment,
                    proposalPackage,
                    submissionInfo: {
                      method: data.delivery_method,
                      deadline: data.submission_deadline
                    }
                  };
                  const blob = new Blob([JSON.stringify(jsonData, null, 2)], { type: 'application/json' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `Proposal-Data-${rfpAnalysis.notice_id || 'Draft'}-${new Date().toISOString().split('T')[0]}.json`;
                  a.click();
                  URL.revokeObjectURL(url);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-slate-600 text-white text-xs font-bold rounded-lg hover:bg-slate-700 transition-all"
              >
                <Download size={14} />
                Export JSON
              </button>
            </div>
          </div>
          <div className="bg-slate-50 rounded-lg p-3 text-xs text-slate-500">
            <strong>Tip:</strong> Export as Markdown (.txt) to use with Claude Desktop for final formatting.
            Rename the file from .txt to .md if your editor requires it. The content is valid Markdown.
          </div>
        </section>

        {/* Footer */}
        <div className="border-t border-slate-200 pt-6 mt-8">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <div className="flex items-center gap-2">
              <Shield size={14} />
              <span className="font-bold">ACE BD Capture Workforce</span>
            </div>
            <div>
              Generated by ACE Governance Platform • {new Date().toLocaleString()}
            </div>
          </div>
          <div className="text-center mt-4 text-[10px] text-slate-400 uppercase tracking-widest">
            Proposal Development Analysis Complete • PWin Assessment: {pwinAssessment.score || 'Pending'}
          </div>
        </div>
      </div>
    </div>
  );
};

// =============================================================================
// MARKDOWN GENERATOR FUNCTION
// =============================================================================

function generateProposalMarkdown(
  data: any,
  opportunityData: any,
  rfpAnalysis: any,
  proposalPackage: any,
  technicalSections: any[],
  pastPerformance: any[],
  laborCategories: any[],
  complianceMatrix: any[],
  pwinAssessment: any,
  qaResult: any
): string {
  const noticeId = rfpAnalysis.notice_id || opportunityData?.rfpNumber || 'TBD';
  const title = rfpAnalysis.title || opportunityData?.title || 'Proposal Response';
  const agency = rfpAnalysis.agency || opportunityData?.agency || 'Federal Agency';
  const deadline = rfpAnalysis.response_deadline || (opportunityData?.deadline ? new Date(opportunityData.deadline).toLocaleDateString() : 'TBD');
  const totalPages = proposalPackage.total_pages || proposalPackage.volumes?.reduce((sum: number, v: any) => sum + (v.page_count || 0), 0) || 0;

  return `---
title: "Proposal Response - ${noticeId}"
subtitle: "${title}"
agency: "${agency}"
deadline: "${deadline}"
generated: "${new Date().toISOString()}"
pwin: "${pwinAssessment.score || 'TBD'}"
total_pages: ${totalPages}
---

# ${data.set_aside ? 'Request for Proposal (RFP)' : 'Request for Information (RFI)'} Response

**Notice ID:** ${noticeId}
**Title:** ${title}
**Agency:** ${agency}
**Response Deadline:** ${deadline}
**Set-Aside:** ${rfpAnalysis.set_aside || opportunityData?.setAsideType || 'Full & Open'}
**NAICS:** ${rfpAnalysis.naics || opportunityData?.naicsCode || 'N/A'}
**Contract Type:** ${rfpAnalysis.contract_type || data.pricing_model || 'TBD'}

---

# Cover Letter

${proposalPackage.cover_letter?.full_text ? proposalPackage.cover_letter.full_text : `[Company Name]
[Address]

${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}

${agency}

RE: ${data.set_aside ? 'RFP' : 'RFI'} Response - ${noticeId}
    ${title}

Dear Contracting Officer:

[Company Name] is pleased to submit this response to ${noticeId}, "${title}." We have carefully reviewed the requirements and are confident in our ability to deliver exceptional results for ${agency}.

Our response demonstrates relevant experience and technical capabilities to support ${agency}'s objectives. We have addressed each requirement outlined in the solicitation and provided information about our:

- Corporate qualifications and relevant experience
- Technical approach and methodology
- Past performance on similar engagements
- Competitive pricing

We welcome the opportunity to discuss our qualifications in greater detail.

Respectfully submitted,

[Authorized Signature]
[Name, Title]
[Company Name]
[Email] | [Phone]`}

---

# Executive Summary

${proposalPackage.executive_summary?.full_text ? proposalPackage.executive_summary.full_text : `## Understanding of the Requirement

[Company Name] understands that ${agency} requires ${rfpAnalysis.scope || 'the services outlined in this solicitation'}.

${rfpAnalysis.mandatory_requirements?.length > 0 ? `
### Key Requirements Identified

${(data.mandatory_requirements || []).map((req: any, i: number) => `${i + 1}. ${req.text}`).join('\n')}
` : ''}

## Our Solution

[Company Name] proposes a comprehensive approach that directly addresses each requirement while providing additional value through proven methodology, experienced personnel, and innovative solutions.

### Win Themes

${(pwinAssessment.factors || ['Strong technical alignment', 'Relevant past performance', 'Competitive pricing']).map((f: string) => `- **${f}**`).join('\n')}

## Summary

Based on our directly relevant experience and proven capabilities, [Company Name] is uniquely qualified to deliver this requirement. Our PWin assessment indicates **${pwinAssessment.score || 'HIGH'}** probability of success.`}

---

# Volume I - Technical Proposal

${technicalSections.length > 0 ? technicalSections.map((section: any, idx: number) => `
## ${idx + 1}.0 ${section.section_name}

*Evaluation Factor: ${section.evaluation_factor}*
${section.word_count ? `*Word Count: ${section.word_count}*` : ''}

${section.full_narrative || section.narrative}

${section.requirements_addressed?.length > 0 ? `
**Requirements Addressed:** ${section.requirements_addressed.join(', ')}
` : ''}

${section.tables?.length > 0 ? section.tables.map((t: any) => `
### ${t.title}
${t.description}

| ${t.columns?.join(' | ') || 'Column'} |
|${t.columns?.map(() => '---').join('|') || '---'}|
${t.suggested_rows?.map((r: any) => `| ${Object.values(r).join(' | ')} |`).join('\n') || ''}
`).join('\n') : ''}

${section.win_themes?.length > 0 ? `
### Win Themes
${section.win_themes.map((t: string) => `- ${t}`).join('\n')}
` : ''}

${section.discriminators?.length > 0 ? `
### Discriminators
${section.discriminators.map((d: string) => `- ${d}`).join('\n')}
` : ''}
`).join('\n---\n') : `
## 1.0 Technical Approach

[Company Name] proposes a proven approach to deliver the requirements outlined in this solicitation.

### Methodology

1. **Discovery & Planning** - Understand requirements and develop detailed work plan
2. **Execution** - Deliver work products according to plan
3. **Quality Assurance** - Ensure deliverables meet requirements
4. **Delivery & Transition** - Provide completed deliverables and knowledge transfer

## 2.0 Management Approach

As a small business engagement, [Company Name] provides direct senior-level expertise without the overhead of large contractor teams.

### Communication Plan

| Communication | Frequency | Method |
|---------------|-----------|--------|
| Status Report | Weekly | Email |
| Progress Meeting | Bi-weekly | Virtual |
| Executive Review | Monthly | Briefing |
`}

---

# Volume II - Past Performance

## Past Performance Matrix

| Contract | Client | Value | Period | Relevancy |
|----------|--------|-------|--------|-----------|
${pastPerformance.map((pp: any) =>
  `| ${pp.contract_name} | ${pp.client} | ${pp.contract_value} | ${pp.period} | ${pp.relevancy_score} |`
).join('\n')}

## Contract Citations

${pastPerformance.map((pp: any, idx: number) => `
### Citation ${idx + 1}: ${pp.contract_name}

| Item | Details |
|------|---------|
| Client | ${pp.client} |
| Contract Value | ${pp.contract_value} |
| Period of Performance | ${pp.period} |
| Relevancy Score | ${pp.relevancy_score} |

**Key Accomplishments:**
${(pp.key_accomplishments || []).map((a: string) => `- ${a}`).join('\n')}

${pp.reference ? `
**Reference:**
${pp.reference.name}, ${pp.reference.title}
Email: ${pp.reference.email}
` : ''}
`).join('\n---\n')}

${data.narrative_draft ? `
## Past Performance Narrative

${data.narrative_draft}
` : ''}

---

# Volume III - Pricing

## Price Summary

**Contract Type:** ${data.pricing_model || 'Firm Fixed Price (FFP)'}
**Total Proposed Price:** $${(data.total_price || 0).toLocaleString()}

## Labor Categories

| Category | Hourly Rate | Hours | Total |
|----------|-------------|-------|-------|
${laborCategories.map((lc: any) =>
  `| ${lc.category} | $${lc.rate}/hr | ${lc.hours} | $${lc.total?.toLocaleString()} |`
).join('\n')}
| **TOTAL** | | | **$${(data.total_price || laborCategories.reduce((sum: number, lc: any) => sum + (lc.total || 0), 0)).toLocaleString()}** |

${(data.other_direct_costs || []).length > 0 ? `
## Other Direct Costs

| Item | Estimate | Notes |
|------|----------|-------|
${(data.other_direct_costs || []).map((odc: any) =>
  `| ${odc.item} | $${odc.estimate?.toLocaleString()} | ${odc.notes || ''} |`
).join('\n')}
` : ''}

## Basis of Estimate

Labor hours were estimated based on:
1. Analysis of the Statement of Work requirements
2. Experience performing similar tasks on previous contracts
3. Task complexity and deliverable requirements

### Assumptions

${(data.assumptions || ['Government will provide timely access to required information', 'Work will be performed primarily at contractor facilities', 'Standard business hours unless otherwise specified']).map((a: string, i: number) => `${i + 1}. ${a}`).join('\n')}

---

# Compliance Matrix

| Req ID | Requirement | Status | Proposal Section |
|--------|-------------|--------|------------------|
${complianceMatrix.map((item: any) =>
  `| ${item.req_id} | ${item.requirement?.substring(0, 50)}... | ${item.compliance_status} | ${item.ace_capability || 'See Technical Volume'} |`
).join('\n')}

**Compliance Score:** ${data.compliance_score || 0}%

${(data.critical_gaps || []).length > 0 ? `
### Gaps Identified

${(data.critical_gaps || []).map((g: string) => `- ${g}`).join('\n')}

### Teaming Recommendations

${(data.teaming_recommendations || []).map((t: string) => `- ${t}`).join('\n')}
` : ''}

---

# Proposal Package Summary

${proposalPackage.volumes?.length > 0 ? `
## Volumes

| Volume | Sections | Pages | Status |
|--------|----------|-------|--------|
${proposalPackage.volumes.map((vol: any) =>
  `| ${vol.volume_name} | ${vol.sections?.join(', ') || '-'} | ${vol.page_count} | ${vol.status} |`
).join('\n')}
| **TOTAL** | | **${totalPages}** | |
` : ''}

${proposalPackage.attachments?.length > 0 ? `
## Attachments

${proposalPackage.attachments.map((att: string) => `- ${att}`).join('\n')}
` : ''}

## Submission Checklist

${(proposalPackage.submission_checklist || []).map((item: any) =>
  `- [${item.status === 'DONE' ? 'x' : ' '}] ${item.item} ${item.notes ? `- ${item.notes}` : ''}`
).join('\n')}

---

# QA Assessment

**Compliance Score:** ${qaResult.score || data.compliance_score || 0}%
**PWin Assessment:** ${pwinAssessment.score || 'TBD'}

${(pwinAssessment.factors || []).length > 0 ? `
## PWin Factors

${pwinAssessment.factors.map((f: string) => `- ${f}`).join('\n')}
` : ''}

${(qaResult.corrections_needed || []).length > 0 ? `
## Corrections Needed

${qaResult.corrections_needed.map((c: string) => `- ${c}`).join('\n')}
` : ''}

---

# Submission Information

**Delivery Method:** ${data.delivery_method || 'SAM.GOV'}
**Submission Deadline:** ${data.submission_deadline ? new Date(data.submission_deadline).toLocaleDateString() : deadline}

---

*Generated by ACE Governance Platform*
*${new Date().toISOString()}*
*DEMO MODE - For illustration purposes*
`;
}
