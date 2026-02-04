
import React, { useRef } from 'react';

interface ReportViewProps {
  data: any;
}

export const ReportView: React.FC<ReportViewProps> = ({ data }) => {
  const reportRef = useRef<HTMLDivElement>(null);

  // Print/PDF functionality
  const handlePrint = () => {
    window.print();
  };

  const handleExportHTML = () => {
    if (!reportRef.current) return;

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>VA Evidence Chain Validation Report</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Times New Roman', Georgia, serif; font-size: 11pt; line-height: 1.6; color: #1a1a1a; max-width: 8.5in; margin: 0 auto; }
    .report-container { padding: 0.75in; }
    .header { border-bottom: 3px solid #1a365d; padding-bottom: 20px; margin-bottom: 24px; }
    .header-title { font-size: 16pt; font-weight: bold; color: #1a365d; text-transform: uppercase; letter-spacing: 1px; }
    .header-subtitle { font-size: 12pt; color: #4a5568; margin-top: 4px; }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 24px; margin: 16px 0; padding: 16px; background: #f7fafc; border: 1px solid #e2e8f0; }
    .info-row { display: flex; gap: 8px; font-size: 10pt; }
    .info-label { font-weight: bold; color: #4a5568; min-width: 120px; }
    .info-value { color: #1a1a1a; }
    .section-title { font-size: 13pt; font-weight: bold; color: #1a365d; border-bottom: 2px solid #1a365d; padding-bottom: 6px; margin: 28px 0 16px 0; text-transform: uppercase; letter-spacing: 0.5px; }
    .subsection-title { font-size: 11pt; font-weight: bold; color: #2d3748; margin: 20px 0 10px 0; }
    .condition-block { margin: 24px 0; padding: 20px; border: 1px solid #cbd5e0; background: #fff; page-break-inside: avoid; }
    .condition-header { font-size: 12pt; font-weight: bold; color: #1a365d; padding-bottom: 12px; border-bottom: 1px solid #e2e8f0; margin-bottom: 16px; }
    .condition-pathway { font-size: 9pt; font-weight: bold; color: #718096; text-transform: uppercase; letter-spacing: 0.5px; }
    .evidence-table { width: 100%; border-collapse: collapse; margin: 12px 0; font-size: 9pt; }
    .evidence-table th { background: #edf2f7; border: 1px solid #cbd5e0; padding: 8px 10px; text-align: left; font-weight: bold; color: #2d3748; }
    .evidence-table td { border: 1px solid #e2e8f0; padding: 8px 10px; vertical-align: top; }
    .evidence-table tr:nth-child(even) { background: #f7fafc; }
    .highlight-box { background: #fffbeb; border-left: 4px solid #d69e2e; padding: 12px 16px; margin: 12px 0; }
    .highlight-label { font-size: 9pt; font-weight: bold; color: #744210; text-transform: uppercase; letter-spacing: 0.5px; }
    .cue-box { background: #fff5f5; border: 1px solid #feb2b2; padding: 16px; margin: 16px 0; }
    .cue-title { font-weight: bold; color: #c53030; margin-bottom: 8px; }
    .retro-box { background: #fffaf0; border: 1px solid #fbd38d; padding: 16px; margin: 16px 0; }
    .retro-title { font-weight: bold; color: #c05621; margin-bottom: 8px; }
    .secondary-box { background: #faf5ff; border: 1px solid #d6bcfa; padding: 16px; margin: 16px 0; }
    .strength-badge { display: inline-block; padding: 3px 10px; font-size: 9pt; font-weight: bold; border-radius: 3px; }
    .strength-high { background: #c6f6d5; color: #22543d; }
    .strength-moderate { background: #fefcbf; color: #744210; }
    .conclusion-box { background: #f7fafc; border: 1px solid #cbd5e0; padding: 16px; margin-top: 16px; }
    .recommendation-item { padding: 6px 0; padding-left: 20px; position: relative; }
    .recommendation-item:before { content: "\\2022"; position: absolute; left: 6px; color: #1a365d; }
    .certification { border-top: 2px solid #1a365d; margin-top: 40px; padding-top: 24px; text-align: center; }
    .signature-line { margin-top: 30px; font-style: italic; }
    .disclaimer { background: #f7fafc; border: 1px solid #cbd5e0; padding: 16px; font-size: 9pt; color: #4a5568; margin-top: 24px; }
    .page-break { page-break-before: always; }
    @media print {
      body { font-size: 10pt; }
      .no-print { display: none !important; }
      .report-container { padding: 0; }
    }
  </style>
</head>
<body>
<div class="report-container">
${reportRef.current.innerHTML}
</div>
</body>
</html>`;

    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `VA_ECV_Report_${new Date().toISOString().split('T')[0]}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExportText = () => {
    if (!data) return;

    const header = data.report_header || {};
    const conditions = data.conditions || [];
    const cueSection = data.cue_analysis_section || {};
    const retroSection = data.retroactive_effective_date_section || {};
    const strategic = data.strategic_recommendations || {};

    let textContent = `
================================================================================
                    EVIDENCE CHAIN VALIDATION REPORT
                      VA Disability Claims Analysis
================================================================================

VETERAN INFORMATION
--------------------------------------------------------------------------------
Name:              ${header.veteran_name || '[See Records]'}
SSN (Last 4):      ${header.veteran_ssn_last4 || 'XXX-XX-XXXX'}
Date of Birth:     ${header.veteran_dob || '[See Records]'}
VA File Number:    ${header.va_file_number || '[See Records]'}
Report Date:       ${header.report_date || new Date().toLocaleDateString()}
Review Type:       ${header.review_type || 'Non-Medical Documentary Review'}
Current Rating:    ${header.current_rating || 'N/A'}

${header.cue_opportunities_found > 0 ? `*** ${header.cue_opportunities_found} CUE OPPORTUNITIES IDENTIFIED ***\n` : ''}${header.retro_opportunities_found > 0 ? `*** ${header.retro_opportunities_found} EARLIER EFFECTIVE DATE OPPORTUNITIES ***\n` : ''}

CONDITIONS ANALYZED
--------------------------------------------------------------------------------
${(header.conditions_reviewed || []).map((c: string, i: number) => `  ${i + 1}. ${c}`).join('\n')}

`;

    // Executive Summary
    if (data.executive_advocacy_summary) {
      textContent += `
================================================================================
                        EXECUTIVE ADVOCACY SUMMARY
================================================================================
`;
      if (data.executive_advocacy_summary.strongest_claims?.length > 0) {
        textContent += `\nSTRONGEST CLAIMS:\n${data.executive_advocacy_summary.strongest_claims.map((c: string) => `  * ${c}`).join('\n')}\n`;
      }
      if (data.executive_advocacy_summary.cue_highlights?.length > 0) {
        textContent += `\nCUE OPPORTUNITIES:\n${data.executive_advocacy_summary.cue_highlights.map((c: string) => `  * ${c}`).join('\n')}\n`;
      }
      if (data.executive_advocacy_summary.retro_highlights?.length > 0) {
        textContent += `\nRETROACTIVE DATE OPPORTUNITIES:\n${data.executive_advocacy_summary.retro_highlights.map((c: string) => `  * ${c}`).join('\n')}\n`;
      }
      if (data.executive_advocacy_summary.total_potential_impact) {
        textContent += `\nTOTAL POTENTIAL IMPACT: ${data.executive_advocacy_summary.total_potential_impact}\n`;
      }
    }

    textContent += `

================================================================================
                          DETAILED CONDITION ANALYSIS
================================================================================
`;

    conditions.forEach((condition: any, idx: number) => {
      textContent += `
--------------------------------------------------------------------------------
CONDITION ${condition.condition_number || idx + 1}: ${condition.condition_name}
Pathway: ${condition.pathway_type || 'Direct Service Connection'}
--------------------------------------------------------------------------------

EXECUTIVE SUMMARY
${condition.executive_summary?.overview || 'See detailed analysis below.'}

${condition.executive_summary?.key_highlight ? `KEY FINDING: ${condition.executive_summary.key_highlight.label}
${condition.executive_summary.key_highlight.content}
` : ''}
${condition.causation_narrative ? `CAUSATION NARRATIVE
${condition.causation_narrative}
` : ''}

EVIDENCE CHAIN TIMELINE
${condition.evidence_chain_timeline?.map((e: any) => `  ${e.date.padEnd(12)} | ${e.source.padEnd(20)} | ${e.key_content}`).join('\n') || '  See records.'}

REGULATORY ANALYSIS
${condition.regulatory_analysis?.primary_regulation ? `  ${condition.regulatory_analysis.primary_regulation.cfr_section}: ${condition.regulatory_analysis.primary_regulation.explanation}` : '  See analysis.'}
${condition.regulatory_analysis?.additional_regulations?.map((reg: any) => `  ${reg.cfr_section}: ${reg.explanation}`).join('\n') || ''}

${condition.regulatory_analysis?.secondary_connection?.is_secondary ? `
SECONDARY SERVICE CONNECTION
  Primary SC Condition:    ${condition.regulatory_analysis.secondary_connection.primary_condition}
  Causation Mechanism:     ${condition.regulatory_analysis.secondary_connection.causation_mechanism}
  Regulatory Basis:        ${condition.regulatory_analysis.secondary_connection.regulatory_basis}
` : ''}
${condition.cue_analysis_for_condition?.has_cue_opportunity ? `
*** CUE OPPORTUNITY IDENTIFIED ***
  Prior Decision Date:     ${condition.cue_analysis_for_condition.prior_decision_date || 'See records'}
  Error Description:       ${condition.cue_analysis_for_condition.error_description || 'See analysis'}
  Evidence Overlooked:     ${condition.cue_analysis_for_condition.evidence_overlooked || 'N/A'}
  Legal Basis:             ${condition.cue_analysis_for_condition.legal_basis || '38 CFR 3.105(a)'}
  Potential Back Pay:      ${condition.cue_analysis_for_condition.potential_back_pay || 'TBD'}
` : ''}
${condition.effective_date_analysis_for_condition?.has_retro_opportunity ? `
*** EARLIER EFFECTIVE DATE OPPORTUNITY ***
  Current Effective Date:  ${condition.effective_date_analysis_for_condition.current_effective_date || 'See records'}
  Proposed Earlier Date:   ${condition.effective_date_analysis_for_condition.proposed_earlier_date || 'TBD'}
  Basis for Earlier Date:  ${condition.effective_date_analysis_for_condition.basis_for_earlier_date || 'See analysis'}
  Supporting Evidence:     ${condition.effective_date_analysis_for_condition.supporting_evidence || 'See records'}
` : ''}

CONCLUSION
  What Is Documented:      ${condition.conclusion?.what_is_documented || 'See above.'}
  Evidence Strength:       ${condition.conclusion?.strength || 'See analysis.'}
  Strength Rationale:      ${condition.conclusion?.strength_rationale || ''}
${condition.conclusion?.advocacy_statement ? `  Advocacy Statement:      ${condition.conclusion.advocacy_statement}` : ''}
`;
    });

    // CUE Analysis Section
    if (cueSection.cue_claims?.length > 0) {
      textContent += `

================================================================================
               CLEAR AND UNMISTAKABLE ERROR (CUE) ANALYSIS
================================================================================
Per 38 CFR 3.105(a), prior final decisions containing CUE may be revised.

`;
      cueSection.cue_claims.forEach((cue: any, i: number) => {
        textContent += `
CUE CLAIM #${cue.rank || i + 1}: ${cue.condition}
--------------------------------------------------------------------------------
  Viability:               ${cue.viability}
  Prior Decision Date:     ${cue.prior_decision_date}
  Prior Outcome:           ${cue.prior_outcome || 'Denial'}
  Error Type:              ${cue.error_type}
  Specific Error:          ${cue.specific_error}
  Recommended Action:      ${cue.recommended_action}
  Potential Back Pay:      ${cue.potential_years_back_pay || 'TBD'} years
`;
        if (cue.russell_elements) {
          textContent += `
  Russell v. Principi Elements:
    - Facts Not Before Adjudicator: ${cue.russell_elements.correct_facts_not_before_adjudicator || 'N/A'}
    - Error Undebatable:            ${cue.russell_elements.error_undebatable || 'N/A'}
    - Outcome Manifestly Different: ${cue.russell_elements.outcome_manifestly_different || 'N/A'}
`;
        }
      });

      if (cueSection.cue_strategy_summary) {
        textContent += `\nCUE STRATEGY SUMMARY:\n${cueSection.cue_strategy_summary}\n`;
      }
    }

    // Retro Analysis Section
    if (retroSection.retro_claims?.length > 0) {
      textContent += `

================================================================================
              RETROACTIVE EFFECTIVE DATE ANALYSIS
================================================================================
Per 38 CFR 3.400, effective dates may be earlier than the formal claim date.

`;
      retroSection.retro_claims.forEach((retro: any) => {
        textContent += `
CONDITION: ${retro.condition}
--------------------------------------------------------------------------------
  Viability:               ${retro.viability}
  Current Effective Date:  ${retro.current_effective_date}
  Proposed Earlier Date:   ${retro.proposed_effective_date}
  Legal Basis Type:        ${retro.basis?.type || 'See analysis'}
  Regulatory Citation:     ${retro.basis?.regulatory_citation || 'See analysis'}
  Explanation:             ${retro.basis?.explanation || 'See analysis'}
  Estimated Retro Period:  ${retro.estimated_months_retro || 'TBD'} months
`;
      });

      if (retroSection.retro_strategy_summary) {
        textContent += `\nRETRO STRATEGY SUMMARY:\n${retroSection.retro_strategy_summary}\n`;
      }
    }

    // Strategic Recommendations
    if (strategic.priority_order?.length > 0 || strategic.immediate_actions?.length > 0) {
      textContent += `

================================================================================
                      STRATEGIC RECOMMENDATIONS
================================================================================
`;
      if (strategic.immediate_actions?.length > 0) {
        textContent += `\nIMMEDIATE ACTIONS:\n${strategic.immediate_actions.map((a: string, i: number) => `  ${i + 1}. ${a}`).join('\n')}\n`;
      }
      if (strategic.cue_motions_to_file?.length > 0) {
        textContent += `\nCUE MOTIONS TO FILE:\n${strategic.cue_motions_to_file.map((m: string) => `  * ${m}`).join('\n')}\n`;
      }
      if (strategic.effective_date_challenges?.length > 0) {
        textContent += `\nEFFECTIVE DATE CHALLENGES:\n${strategic.effective_date_challenges.map((c: string) => `  * ${c}`).join('\n')}\n`;
      }
      if (strategic.priority_order?.length > 0) {
        textContent += `\nPRIORITY ORDER:\n${strategic.priority_order.map((p: string, i: number) => `  ${i + 1}. ${p}`).join('\n')}\n`;
      }
    }

    textContent += `

================================================================================
                            ANALYST CERTIFICATION
================================================================================

${data.analyst_certification?.analyst_name || 'ACE Evidence Analysis Platform'}
${data.analyst_certification?.analyst_title || data.analyst_certification?.title || 'Non-Medical Evidence Analyst & Compliance Specialist'}
${data.analyst_certification?.framework || 'Evidence Chain Validation (ECV) Framework'}

QUALIFICATIONS:
${(data.analyst_certification?.credentials || [
  'Information Systems Security Officer (ISSO) - 17+ Years Federal Experience',
  'Federal Regulatory Compliance Expertise (38 CFR, M21-1)',
  'Evidence Analysis & Audit Methodology Training'
]).map((c: string) => `  - ${c}`).join('\n')}

QUALIFICATION BASIS:
${data.analyst_certification?.qualification_basis || 'Per M21-1, Part III, Subpart iv, Chapter 5 and FRE 702 - Documentary analysis and regulatory compliance assessment within scope of non-medical expert review.'}

SCOPE STATEMENT:
${data.analyst_certification?.scope_statement || 'This analysis applies documentary review methodology. No medical opinions are rendered. All medical determinations referenced are derived from qualified medical sources in the veteran\'s record.'}

Signature:   ${data.analyst_certification?.signature_line || '/s/ ACE Evidence Analysis Platform'}
Date:        ${new Date().toLocaleDateString()}


================================================================================
                              DISCLAIMER
================================================================================

This Evidence Chain Validation represents documentary analysis only. It
does not constitute medical opinion or legal advice. All medical causation
determinations remain outside the scope of this non-medical review.

CUE analysis identifies potential errors for consideration but does not
guarantee revision. Effective date analysis identifies potential arguments
but requires VA adjudication.

Medical opinions regarding causation, aggravation, and disability rating
must be obtained from qualified medical professionals. Legal interpretation
should be confirmed by accredited VA representatives or attorneys.

================================================================================
`;

    const blob = new Blob([textContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `VA_ECV_Report_${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (!data) return (
    <div className="p-12 text-center bg-white border border-slate-200">
      <p className="text-slate-500 text-sm">Awaiting report data...</p>
    </div>
  );

  // Parse the ECV schema
  const header = data.report_header || {};
  const toc = data.table_of_contents || [];
  const conditions = data.conditions || [];
  const certification = data.analyst_certification || {};
  const disclaimer = data.disclaimer || '';

  // Format strength as plain professional text
  const formatStrength = (strength: string) => {
    if (!strength) return 'See analysis';
    // Convert to proper case and professional wording
    const s = strength.toLowerCase();
    if (s.includes('high') || s.includes('exceptional') || s.includes('strong')) {
      return 'Well-Supported';
    } else if (s.includes('moderate') || s.includes('medium')) {
      return 'Supported';
    } else if (s.includes('low') || s.includes('weak')) {
      return 'Limited Support';
    }
    return strength;
  };

  // Format date properly
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    // If it's already formatted, return as-is
    if (dateStr.includes('/') || dateStr.includes('-') || dateStr.includes(',')) {
      return dateStr;
    }
    return dateStr;
  };

  return (
    <div className="relative">
      {/* Export Toolbar */}
      <div className="no-print sticky top-0 z-50 bg-slate-700 text-white p-3 flex items-center justify-between print:hidden">
        <span className="font-semibold text-sm">VA Evidence Chain Validation Report</span>
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrint}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded font-semibold text-sm transition-colors"
          >
            Print / PDF
          </button>
          <button
            onClick={handleExportHTML}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 rounded font-semibold text-sm transition-colors"
          >
            Export HTML
          </button>
          <button
            onClick={handleExportText}
            className="px-4 py-2 bg-slate-600 hover:bg-slate-500 rounded font-semibold text-sm transition-colors"
          >
            Export Text
          </button>
        </div>
      </div>

      {/* Print Styles */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          @page { margin: 0.5in; size: letter; }
        }
      `}</style>

      {/* REPORT CONTENT - Clean Professional Style */}
      <div ref={reportRef} className="bg-white text-slate-900 mx-auto max-w-[8.5in] p-10 font-serif leading-relaxed print:p-0">

        {/* DOCUMENT HEADER */}
        <div className="border-b-[3px] border-slate-800 pb-5 mb-6">
          <h1 className="text-[18pt] font-bold text-slate-800 tracking-wide uppercase">
            Evidence Chain Validation Report
          </h1>
          <p className="text-[12pt] text-slate-600 mt-1">
            VA Disability Claims Documentary Analysis
          </p>
          {(header.cue_opportunities_found > 0 || header.retro_opportunities_found > 0) && (
            <p className="text-[10pt] text-slate-600 font-semibold mt-2">
              {header.cue_opportunities_found > 0 && `${header.cue_opportunities_found} CUE Consideration${header.cue_opportunities_found === 1 ? '' : 's'} Identified`}
              {header.cue_opportunities_found > 0 && header.retro_opportunities_found > 0 && ' • '}
              {header.retro_opportunities_found > 0 && `${header.retro_opportunities_found} Effective Date Consideration${header.retro_opportunities_found === 1 ? '' : 's'}`}
            </p>
          )}
        </div>

        {/* VETERAN INFORMATION */}
        <div className="bg-slate-50 border border-slate-200 p-5 mb-8">
          <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-[10pt]">
            <div className="flex gap-2">
              <span className="font-bold text-slate-600 min-w-[110px]">Veteran:</span>
              <span>{header.veteran_name || '[See Records]'}</span>
            </div>
            <div className="flex gap-2">
              <span className="font-bold text-slate-600 min-w-[110px]">SSN (Last 4):</span>
              <span className="font-mono">{header.veteran_ssn_last4 || 'XXX-XX-XXXX'}</span>
            </div>
            <div className="flex gap-2">
              <span className="font-bold text-slate-600 min-w-[110px]">Date of Birth:</span>
              <span>{header.veteran_dob || '[See Records]'}</span>
            </div>
            <div className="flex gap-2">
              <span className="font-bold text-slate-600 min-w-[110px]">VA File Number:</span>
              <span>{header.va_file_number || '[See Records]'}</span>
            </div>
            <div className="flex gap-2">
              <span className="font-bold text-slate-600 min-w-[110px]">Report Date:</span>
              <span>{formatDate(header.report_date)}</span>
            </div>
            <div className="flex gap-2">
              <span className="font-bold text-slate-600 min-w-[110px]">Review Type:</span>
              <span>{header.review_type || 'Non-Medical Documentary Review'}</span>
            </div>
            <div className="flex gap-2">
              <span className="font-bold text-slate-600 min-w-[110px]">Current Rating:</span>
              <span>{header.current_rating || 'N/A'}</span>
            </div>
            <div className="flex gap-2">
              <span className="font-bold text-slate-600 min-w-[110px]">Analyst:</span>
              <span>{header.analyst || 'ACE Evidence Analysis Platform'}</span>
            </div>
            <div className="col-span-2 flex gap-2 pt-2 mt-2 border-t border-slate-200">
              <span className="font-bold text-slate-600 min-w-[110px]">Conditions:</span>
              <span>{(header.conditions_reviewed || []).join('; ') || 'See Analysis'}</span>
            </div>
          </div>
        </div>

        {/* EXECUTIVE ADVOCACY SUMMARY */}
        {data.executive_advocacy_summary && (
          <div className="mb-8">
            <h2 className="text-[13pt] font-bold text-slate-800 border-b-2 border-slate-800 pb-2 mb-4 uppercase tracking-wider">
              Executive Advocacy Summary
            </h2>

            {data.executive_advocacy_summary.strongest_claims?.length > 0 && (
              <div className="mb-4">
                <h3 className="text-[11pt] font-bold text-slate-700 mb-2">Strongest Claims</h3>
                <ul className="list-disc list-inside text-[10pt] space-y-1 pl-2">
                  {data.executive_advocacy_summary.strongest_claims.map((claim: string, i: number) => (
                    <li key={i}>{claim}</li>
                  ))}
                </ul>
              </div>
            )}

            {data.executive_advocacy_summary.cue_highlights?.length > 0 && (
              <div className="mb-4">
                <h3 className="text-[11pt] font-bold text-slate-700 mb-2">CUE Considerations</h3>
                <ul className="list-disc list-inside text-[10pt] space-y-1 pl-2">
                  {data.executive_advocacy_summary.cue_highlights.map((cue: string, i: number) => (
                    <li key={i}>{cue}</li>
                  ))}
                </ul>
              </div>
            )}

            {data.executive_advocacy_summary.retro_highlights?.length > 0 && (
              <div className="mb-4">
                <h3 className="text-[11pt] font-bold text-slate-700 mb-2">Effective Date Considerations</h3>
                <ul className="list-disc list-inside text-[10pt] space-y-1 pl-2">
                  {data.executive_advocacy_summary.retro_highlights.map((retro: string, i: number) => (
                    <li key={i}>{retro}</li>
                  ))}
                </ul>
              </div>
            )}

            {data.executive_advocacy_summary.total_potential_impact && (
              <div className="mb-4">
                <p className="text-[10pt]">
                  <span className="font-bold text-slate-700">Potential Impact:</span>{' '}
                  {data.executive_advocacy_summary.total_potential_impact}
                </p>
              </div>
            )}

            {data.executive_advocacy_summary.recommended_priority_actions?.length > 0 && (
              <div className="mb-4">
                <h3 className="text-[11pt] font-bold text-slate-700 mb-2">Recommended Priority Actions</h3>
                <ol className="list-decimal list-inside text-[10pt] space-y-1 pl-2">
                  {data.executive_advocacy_summary.recommended_priority_actions.map((action: string, i: number) => (
                    <li key={i}>{action}</li>
                  ))}
                </ol>
              </div>
            )}
          </div>
        )}

        {/* TABLE OF CONTENTS */}
        {toc.length > 0 && (
          <div className="mb-8">
            <h2 className="text-[13pt] font-bold text-slate-800 border-b-2 border-slate-800 pb-2 mb-4 uppercase tracking-wider">
              Table of Contents
            </h2>
            <div className="space-y-3 text-[10pt]">
              {toc.map((item: any, i: number) => (
                <div key={i}>
                  <p className="font-bold text-slate-800">
                    Condition {item.condition_number}: {item.condition_name}
                    <span className="font-normal text-slate-500 ml-2">
                      ({item.pathway?.includes('SECONDARY') || item.pathway?.includes('Secondary') ? 'Secondary SC' : 'Direct SC'})
                    </span>
                  </p>
                  <p className="text-[9pt] text-slate-600 ml-4 italic">{item.summary}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* CONDITION SECTIONS */}
        {conditions.map((condition: any, idx: number) => (
          <div key={idx} className="mb-10 page-break-inside-avoid">
            {/* Condition Header */}
            <div className="border-b-2 border-slate-300 pb-3 mb-5">
              <h2 className="text-[13pt] font-bold text-slate-800">
                Condition {condition.condition_number || idx + 1}: {condition.condition_name}
              </h2>
              <p className="text-[9pt] text-slate-500 uppercase tracking-wider mt-1">
                {condition.pathway_type?.includes('SECONDARY') || condition.pathway_type?.includes('Secondary')
                  ? 'Secondary Service Connection'
                  : 'Direct Service Connection'}
              </p>
            </div>

            {/* Executive Summary */}
            <div className="mb-5">
              <h3 className="text-[11pt] font-bold text-slate-700 mb-2">Executive Summary</h3>
              <p className="text-[10pt] leading-relaxed">{condition.executive_summary?.overview}</p>

              {condition.executive_summary?.key_highlight && (
                <div className="pl-4 border-l-2 border-slate-400 mt-3">
                  <p className="text-[9pt] font-semibold text-slate-600 uppercase tracking-wider mb-1">
                    {condition.executive_summary.key_highlight.label}
                  </p>
                  <p className="text-[10pt]">{condition.executive_summary.key_highlight.content}</p>
                </div>
              )}
            </div>

            {/* Causation Narrative */}
            {condition.causation_narrative && (
              <div className="mb-5">
                <h3 className="text-[11pt] font-bold text-slate-700 mb-2">Causation Narrative</h3>
                <p className="text-[10pt] leading-relaxed">{condition.causation_narrative}</p>
              </div>
            )}

            {/* Evidence Chain Timeline */}
            {condition.evidence_chain_timeline?.length > 0 && (
              <div className="mb-5">
                <h3 className="text-[11pt] font-bold text-slate-700 mb-3">Evidence Chain Timeline</h3>
                <table className="w-full text-[9pt] border-collapse">
                  <thead>
                    <tr className="bg-slate-100">
                      <th className="border border-slate-300 p-2 text-left font-bold w-[90px]">Date</th>
                      <th className="border border-slate-300 p-2 text-left font-bold w-[140px]">Source</th>
                      <th className="border border-slate-300 p-2 text-left font-bold">Key Content</th>
                    </tr>
                  </thead>
                  <tbody>
                    {condition.evidence_chain_timeline.map((entry: any, i: number) => (
                      <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                        <td className="border border-slate-200 p-2 font-mono text-slate-700">{entry.date}</td>
                        <td className="border border-slate-200 p-2 font-semibold text-slate-600">{entry.source}</td>
                        <td className="border border-slate-200 p-2">{entry.key_content}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Regulatory Analysis */}
            <div className="mb-5">
              <h3 className="text-[11pt] font-bold text-slate-700 mb-2">Regulatory Analysis</h3>
              <div className="space-y-2 text-[10pt]">
                {condition.regulatory_analysis?.primary_regulation && (
                  <p>
                    <span className="font-bold text-slate-800">{condition.regulatory_analysis.primary_regulation.cfr_section}:</span>{' '}
                    {condition.regulatory_analysis.primary_regulation.explanation}
                  </p>
                )}
                {condition.regulatory_analysis?.additional_regulations?.map((reg: any, i: number) => (
                  <p key={i}>
                    <span className="font-bold text-slate-800">{reg.cfr_section}:</span>{' '}
                    {reg.explanation}
                  </p>
                ))}

                {/* Secondary Connection */}
                {condition.regulatory_analysis?.secondary_connection?.is_secondary && (
                  <div className="pl-4 mt-3 border-l-2 border-slate-300">
                    <p className="font-semibold text-slate-700 text-[10pt] mb-2">Secondary Service Connection</p>
                    <p className="text-[10pt]">
                      <span className="font-semibold">Primary SC Condition:</span>{' '}
                      {condition.regulatory_analysis.secondary_connection.primary_condition}
                    </p>
                    <p className="text-[10pt]">
                      <span className="font-semibold">Causation Mechanism:</span>{' '}
                      {condition.regulatory_analysis.secondary_connection.causation_mechanism}
                    </p>
                    <p className="text-[10pt] mt-1">
                      <span className="font-semibold">Regulatory Basis:</span> {condition.regulatory_analysis.secondary_connection.regulatory_basis}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Standardized Scores */}
            {condition.standardized_scores?.has_scores && condition.standardized_scores?.scores?.length > 0 && (
              <div className="mb-5">
                <h3 className="text-[11pt] font-bold text-slate-700 mb-2">Standardized Scores</h3>
                <div className="grid grid-cols-2 gap-3">
                  {condition.standardized_scores.scores.map((score: any, i: number) => (
                    <div key={i} className="bg-slate-50 p-3 border border-slate-200">
                      <span className="font-bold text-slate-800">{score.test_name}: {score.score}</span>
                      <span className="text-[9pt] text-slate-500 ml-2">({score.interpretation})</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Documentary Support */}
            {condition.documentary_support?.length > 0 && (
              <div className="mb-5">
                <h3 className="text-[11pt] font-bold text-slate-700 mb-2">Documentary Support</h3>
                <ul className="list-disc list-inside text-[10pt] space-y-1 pl-2">
                  {condition.documentary_support.map((item: string, i: number) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* TDIU Consideration */}
            {condition.tdiu_consideration?.applicable && (
              <div className="border border-slate-200 p-4 mb-5">
                <h3 className="text-[11pt] font-bold text-slate-700 mb-2">TDIU Consideration</h3>
                <p className="text-[10pt]">{condition.tdiu_consideration.analysis}</p>
              </div>
            )}

            {/* CUE Analysis for This Condition */}
            {condition.cue_analysis_for_condition?.has_cue_opportunity && (
              <div className="border border-slate-300 p-5 mb-5">
                <h3 className="text-[11pt] font-bold text-slate-700 mb-3">CUE Consideration</h3>
                <div className="space-y-2 text-[10pt]">
                  {condition.cue_analysis_for_condition.prior_decision_date && (
                    <p><span className="font-semibold">Prior Decision Date:</span> {condition.cue_analysis_for_condition.prior_decision_date}</p>
                  )}
                  {condition.cue_analysis_for_condition.error_description && (
                    <p><span className="font-semibold">Potential Error:</span> {condition.cue_analysis_for_condition.error_description}</p>
                  )}
                  {condition.cue_analysis_for_condition.evidence_overlooked && (
                    <p><span className="font-semibold">Evidence for Review:</span> {condition.cue_analysis_for_condition.evidence_overlooked}</p>
                  )}
                  {condition.cue_analysis_for_condition.legal_basis && (
                    <p><span className="font-semibold">Regulatory Basis:</span> {condition.cue_analysis_for_condition.legal_basis}</p>
                  )}
                  {condition.cue_analysis_for_condition.potential_back_pay && (
                    <p><span className="font-semibold">Potential Impact:</span> {condition.cue_analysis_for_condition.potential_back_pay}</p>
                  )}
                </div>
              </div>
            )}

            {/* Effective Date Analysis for This Condition */}
            {condition.effective_date_analysis_for_condition?.has_retro_opportunity && (
              <div className="border border-slate-300 p-5 mb-5">
                <h3 className="text-[11pt] font-bold text-slate-700 mb-3">Effective Date Consideration</h3>
                <div className="space-y-2 text-[10pt]">
                  {condition.effective_date_analysis_for_condition.current_effective_date && (
                    <p><span className="font-semibold">Current Effective Date:</span> {condition.effective_date_analysis_for_condition.current_effective_date}</p>
                  )}
                  {condition.effective_date_analysis_for_condition.proposed_earlier_date && (
                    <p><span className="font-semibold">Potential Earlier Date:</span> {condition.effective_date_analysis_for_condition.proposed_earlier_date}</p>
                  )}
                  {condition.effective_date_analysis_for_condition.basis_for_earlier_date && (
                    <p><span className="font-semibold">Basis:</span> {condition.effective_date_analysis_for_condition.basis_for_earlier_date}</p>
                  )}
                  {condition.effective_date_analysis_for_condition.supporting_evidence && (
                    <p><span className="font-semibold">Supporting Evidence:</span> {condition.effective_date_analysis_for_condition.supporting_evidence}</p>
                  )}
                </div>
              </div>
            )}

            {/* Recommendations */}
            {condition.recommendations?.has_recommendations && condition.recommendations?.items?.length > 0 && (
              <div className="border border-slate-200 p-4 mb-5">
                <h3 className="text-[11pt] font-bold text-slate-700 mb-2">Recommendations</h3>
                <ul className="list-disc list-inside text-[10pt] space-y-1 pl-2">
                  {condition.recommendations.items.map((item: string, i: number) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Conclusion */}
            <div className="bg-slate-50 border border-slate-200 p-5">
              <h3 className="text-[11pt] font-bold text-slate-700 mb-3">Conclusion</h3>
              <div className="space-y-2 text-[10pt]">
                <p>
                  <span className="font-bold text-slate-600">Documentary Findings:</span>{' '}
                  {condition.conclusion?.what_is_documented}
                </p>
                <p>
                  <span className="font-bold text-slate-600">Evidence Assessment:</span>{' '}
                  {formatStrength(condition.conclusion?.strength)}
                  {condition.conclusion?.strength_rationale && ` — ${condition.conclusion.strength_rationale}`}
                </p>
                {condition.conclusion?.financial_impact && (
                  <p>
                    <span className="font-bold text-slate-600">Potential Impact:</span>{' '}
                    {condition.conclusion.financial_impact}
                  </p>
                )}
                {condition.conclusion?.advocacy_statement && (
                  <p className="mt-3 pt-3 border-t border-slate-200 italic text-slate-700">
                    {condition.conclusion.advocacy_statement}
                  </p>
                )}
              </div>
            </div>
          </div>
        ))}

        {/* CUE ANALYSIS SECTION */}
        {data.cue_analysis_section?.cue_claims?.length > 0 && (
          <div className="mb-10 page-break">
            <h2 className="text-[13pt] font-bold text-slate-800 border-b-2 border-slate-800 pb-2 mb-5 uppercase tracking-wider">
              Clear and Unmistakable Error (CUE) Analysis
            </h2>
            <p className="text-[10pt] text-slate-600 mb-5">
              Per 38 CFR 3.105(a), prior final decisions containing clear and unmistakable error may be revised. The following potential errors have been identified for review.
            </p>

            {data.cue_analysis_section.cue_claims.map((cue: any, i: number) => (
              <div key={i} className="border border-slate-300 p-5 mb-5">
                <div className="flex items-start justify-between mb-3 pb-2 border-b border-slate-200">
                  <h3 className="text-[11pt] font-bold text-slate-800">
                    CUE Claim #{cue.rank || i + 1}: {cue.condition}
                  </h3>
                  <span className="text-[9pt] text-slate-600">
                    Assessment: {cue.viability || 'See Analysis'}
                  </span>
                </div>

                <div className="space-y-2 text-[10pt]">
                  <p><span className="font-semibold">Prior Decision Date:</span> {cue.prior_decision_date}</p>
                  <p><span className="font-semibold">Prior Outcome:</span> {cue.prior_outcome}</p>
                  <p><span className="font-semibold">Error Type:</span> {cue.error_type}</p>
                  <p><span className="font-semibold">Description:</span> {cue.specific_error}</p>

                  {cue.russell_elements && (
                    <div className="pl-4 mt-3 border-l-2 border-slate-300">
                      <p className="font-semibold text-slate-700 mb-2">Russell v. Principi Analysis:</p>
                      <ul className="space-y-1 text-[9pt]">
                        {cue.russell_elements.correct_facts_not_before_adjudicator && (
                          <li><span className="font-semibold">Facts Not Before Adjudicator:</span> {cue.russell_elements.correct_facts_not_before_adjudicator}</li>
                        )}
                        {cue.russell_elements.error_undebatable && (
                          <li><span className="font-semibold">Error Undebatable:</span> {cue.russell_elements.error_undebatable}</li>
                        )}
                        {cue.russell_elements.outcome_manifestly_different && (
                          <li><span className="font-semibold">Outcome Manifestly Different:</span> {cue.russell_elements.outcome_manifestly_different}</li>
                        )}
                      </ul>
                    </div>
                  )}

                  {cue.evidence_citations?.length > 0 && (
                    <p><span className="font-semibold">Evidence Citations:</span> {cue.evidence_citations.join('; ')}</p>
                  )}

                  <p className="mt-2"><span className="font-semibold">Recommended Action:</span> {cue.recommended_action}</p>

                  {cue.potential_years_back_pay && (
                    <p className="mt-2">
                      <span className="font-semibold">Potential Impact:</span> {cue.potential_years_back_pay} years retroactive
                    </p>
                  )}
                </div>
              </div>
            ))}

            {data.cue_analysis_section.cue_strategy_summary && (
              <div className="bg-slate-100 p-4 mt-4">
                <p className="font-bold text-slate-700">CUE Strategy Summary:</p>
                <p className="text-[10pt] text-slate-600 mt-1">{data.cue_analysis_section.cue_strategy_summary}</p>
              </div>
            )}
          </div>
        )}

        {/* RETROACTIVE EFFECTIVE DATE SECTION */}
        {data.retroactive_effective_date_section?.retro_claims?.length > 0 && (
          <div className="mb-10 page-break">
            <h2 className="text-[13pt] font-bold text-slate-800 border-b-2 border-slate-800 pb-2 mb-5 uppercase tracking-wider">
              Effective Date Analysis
            </h2>
            <p className="text-[10pt] text-slate-600 mb-5">
              Per 38 CFR 3.400, effective dates may be established earlier than the formal claim date under certain circumstances. The following potential effective date considerations have been identified.
            </p>

            {data.retroactive_effective_date_section.retro_claims.map((retro: any, i: number) => (
              <div key={i} className="border border-slate-300 p-5 mb-5">
                <div className="flex items-start justify-between mb-3 pb-2 border-b border-slate-200">
                  <h3 className="text-[11pt] font-bold text-slate-800">{retro.condition}</h3>
                  <span className="text-[9pt] text-slate-600">
                    Assessment: {retro.viability || 'See Analysis'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="p-3 border border-slate-200">
                    <p className="text-[9pt] text-slate-500 font-semibold">Current Effective Date</p>
                    <p className="text-[11pt] font-mono text-slate-700">{retro.current_effective_date}</p>
                  </div>
                  <div className="p-3 border border-slate-200">
                    <p className="text-[9pt] text-slate-500 font-semibold">Proposed Earlier Date</p>
                    <p className="text-[11pt] font-mono text-slate-800 font-semibold">{retro.proposed_effective_date}</p>
                  </div>
                </div>

                <div className="space-y-2 text-[10pt]">
                  {retro.basis && (
                    <div className="pl-4 border-l-2 border-slate-300">
                      <p className="font-semibold text-slate-700 mb-1">Legal Basis:</p>
                      <p><span className="font-semibold">Type:</span> {retro.basis.type}</p>
                      <p><span className="font-semibold">Explanation:</span> {retro.basis.explanation}</p>
                      <p><span className="font-semibold">Regulatory Citation:</span> {retro.basis.regulatory_citation}</p>
                    </div>
                  )}

                  {retro.supporting_evidence?.length > 0 && (
                    <p><span className="font-semibold">Supporting Evidence:</span> {retro.supporting_evidence.join('; ')}</p>
                  )}

                  {retro.estimated_months_retro && (
                    <p className="mt-2">
                      <span className="font-semibold">Estimated Retroactive Period:</span> {retro.estimated_months_retro} months
                    </p>
                  )}
                </div>
              </div>
            ))}

            {data.retroactive_effective_date_section.retro_strategy_summary && (
              <div className="bg-slate-100 p-4 mt-4">
                <p className="font-bold text-slate-700">Retroactive Date Strategy Summary:</p>
                <p className="text-[10pt] text-slate-600 mt-1">{data.retroactive_effective_date_section.retro_strategy_summary}</p>
              </div>
            )}
          </div>
        )}

        {/* STRATEGIC RECOMMENDATIONS */}
        {data.strategic_recommendations && (
          <div className="mb-10">
            <h2 className="text-[13pt] font-bold text-slate-800 border-b-2 border-slate-800 pb-2 mb-5 uppercase tracking-wider">
              Recommendations
            </h2>

            {data.strategic_recommendations.immediate_actions?.length > 0 && (
              <div className="mb-5">
                <h3 className="text-[11pt] font-bold text-slate-700 mb-2">Recommended Actions</h3>
                <ol className="list-decimal list-inside text-[10pt] space-y-1 pl-2">
                  {data.strategic_recommendations.immediate_actions.map((action: string, i: number) => (
                    <li key={i}>{action}</li>
                  ))}
                </ol>
              </div>
            )}

            {data.strategic_recommendations.cue_motions_to_file?.length > 0 && (
              <div className="mb-5">
                <h3 className="text-[11pt] font-bold text-slate-700 mb-2">CUE Motions for Consideration</h3>
                <ul className="list-disc list-inside text-[10pt] space-y-1 pl-2">
                  {data.strategic_recommendations.cue_motions_to_file.map((motion: string, i: number) => (
                    <li key={i}>{motion}</li>
                  ))}
                </ul>
              </div>
            )}

            {data.strategic_recommendations.effective_date_challenges?.length > 0 && (
              <div className="mb-5">
                <h3 className="text-[11pt] font-bold text-slate-700 mb-2">Effective Date Considerations</h3>
                <ul className="list-disc list-inside text-[10pt] space-y-1 pl-2">
                  {data.strategic_recommendations.effective_date_challenges.map((challenge: string, i: number) => (
                    <li key={i}>{challenge}</li>
                  ))}
                </ul>
              </div>
            )}

            {data.strategic_recommendations.secondary_conditions_to_claim?.length > 0 && (
              <div className="mb-5">
                <h3 className="text-[11pt] font-bold text-slate-700 mb-2">Secondary Conditions for Review</h3>
                <ul className="list-disc list-inside text-[10pt] space-y-1 pl-2">
                  {data.strategic_recommendations.secondary_conditions_to_claim.map((condition: string, i: number) => (
                    <li key={i}>{condition}</li>
                  ))}
                </ul>
              </div>
            )}

            {data.strategic_recommendations.priority_order?.length > 0 && (
              <div className="border border-slate-200 p-4">
                <h3 className="text-[11pt] font-bold text-slate-700 mb-2">Suggested Priority</h3>
                <ol className="list-decimal list-inside text-[10pt] space-y-1 pl-2">
                  {data.strategic_recommendations.priority_order.map((item: string, i: number) => (
                    <li key={i}>{item}</li>
                  ))}
                </ol>
              </div>
            )}
          </div>
        )}

        {/* ANALYST CERTIFICATION */}
        <div className="border-t-2 border-slate-800 pt-8 mt-10">
          <h2 className="text-[13pt] font-bold text-slate-800 border-b-2 border-slate-800 pb-2 mb-5 uppercase tracking-wider text-center">
            Analyst Certification
          </h2>

          <div className="text-center mb-6">
            <p className="font-bold text-[14pt] text-slate-900">{certification.analyst_name || 'ACE Evidence Analysis Platform'}</p>
            <p className="text-[11pt] text-slate-700 font-semibold mt-1">{certification.analyst_title || certification.title || 'Non-Medical Evidence Analyst & Compliance Specialist'}</p>
            <p className="text-[10pt] text-slate-600 mt-1">{certification.framework || 'Evidence Chain Validation (ECV) Framework'}</p>
          </div>

          {certification.credentials?.length > 0 && (
            <div className="text-center mb-4 bg-slate-50 p-4 border border-slate-200">
              <p className="text-[9pt] font-semibold text-slate-600 uppercase tracking-wider mb-2">Qualifications</p>
              {certification.credentials.map((cred: string, i: number) => (
                <p key={i} className="text-[9pt] text-slate-600">{cred}</p>
              ))}
            </div>
          )}

          {/* Qualification Basis */}
          {certification.qualification_basis && (
            <div className="text-center mb-4">
              <p className="text-[9pt] text-slate-500 italic px-8">{certification.qualification_basis}</p>
            </div>
          )}

          {/* Scope Statement */}
          {certification.scope_statement && (
            <div className="bg-slate-100 border border-slate-300 p-3 mb-4 mx-8">
              <p className="text-[9pt] text-slate-600 text-center">{certification.scope_statement}</p>
            </div>
          )}

          <div className="flex justify-between items-end mt-8 px-4">
            <div>
              <p className="font-mono text-[11pt] italic">{certification.signature_line || '/s/ ACE Evidence Analysis Platform'}</p>
            </div>
            <div className="text-right">
              <p className="text-[10pt] font-semibold">{formatDate(certification.date)}</p>
            </div>
          </div>
        </div>

        {/* DISCLAIMER */}
        <div className="bg-slate-100 border border-slate-300 p-5 text-[8pt] text-slate-600 mt-8 leading-relaxed">
          <p className="font-bold uppercase tracking-wider text-slate-700 mb-2">Disclaimer</p>
          <p>
            {disclaimer || 'This Evidence Chain Validation represents a documentary analysis only. It does not constitute medical opinion, legal advice, or advocacy. All medical causation determinations remain outside the scope of this non-medical documentary review. Regulatory pathway identification does not constitute a recommendation for VA rating decision. This analysis is provided to assist in organizing documentary evidence for consideration by appropriate medical and legal authorities. Medical opinions regarding causation, aggravation, and disability rating must be obtained from qualified medical professionals. Legal interpretation of VA regulations should be confirmed by accredited VA representatives or attorneys.'}
          </p>
        </div>

      </div>
    </div>
  );
};
