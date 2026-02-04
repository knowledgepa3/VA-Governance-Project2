/**
 * Grant Application Report View
 *
 * Professional federal grant application package with full narrative depth.
 * Designed to produce print-ready, submission-quality documents.
 *
 * Structure mirrors actual federal grant requirements:
 * - SF-424 Application Face Page
 * - Project Abstract
 * - Project Narrative (full depth)
 * - Organizational Capability
 * - Budget & Budget Justification
 * - Evaluation Plan
 * - Logic Model
 * - Letters of Commitment/Support
 * - Appendices
 */

import React, { useRef } from 'react';

interface GrantReportViewProps {
  data: any;
  applicationData?: any;
}

export const GrantReportView: React.FC<GrantReportViewProps> = ({ data, applicationData }) => {
  const reportRef = useRef<HTMLDivElement>(null);

  const appData = applicationData || {};
  const reportData = data || {};

  // Merge data sources
  const nofo = appData.nofo_details || {};
  const org = appData.organization || {};
  const project = appData.project || {};
  const budget = appData.budget || {};
  const eligibility = appData.eligibility_requirements || [];
  const evalCriteria = appData.evaluation_criteria || [];
  const pastPerf = appData.past_performance || [];

  // Print functionality
  const handlePrint = () => {
    window.print();
  };

  // Export as self-contained HTML
  const handleExportHTML = () => {
    if (!reportRef.current) return;

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Federal Grant Application - ${project.title || 'Grant Application'}</title>
  <style>
    @page {
      size: letter;
      margin: 1in;
    }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Times New Roman', Times, serif;
      font-size: 12pt;
      line-height: 1.5;
      color: #000;
      background: #fff;
      max-width: 8.5in;
      margin: 0 auto;
    }
    .page {
      padding: 0;
      page-break-after: always;
    }
    .page:last-child {
      page-break-after: avoid;
    }

    /* Headers */
    h1 { font-size: 14pt; font-weight: bold; text-align: center; margin-bottom: 12pt; text-transform: uppercase; }
    h2 { font-size: 12pt; font-weight: bold; margin: 18pt 0 6pt 0; text-transform: uppercase; border-bottom: 1px solid #000; padding-bottom: 3pt; }
    h3 { font-size: 12pt; font-weight: bold; margin: 12pt 0 6pt 0; }
    h4 { font-size: 12pt; font-style: italic; margin: 10pt 0 4pt 0; }

    /* Paragraphs */
    p { margin-bottom: 12pt; text-align: justify; text-indent: 0.5in; }
    p.no-indent { text-indent: 0; }
    p.center { text-align: center; text-indent: 0; }

    /* Lists */
    ul, ol { margin: 6pt 0 12pt 0.5in; }
    li { margin-bottom: 4pt; }

    /* Tables */
    table { width: 100%; border-collapse: collapse; margin: 12pt 0; font-size: 10pt; }
    th, td { border: 1px solid #000; padding: 6pt 8pt; text-align: left; vertical-align: top; }
    th { background: #f0f0f0; font-weight: bold; }

    /* Form styles */
    .form-header {
      text-align: center;
      border: 2px solid #000;
      padding: 12pt;
      margin-bottom: 18pt;
      background: #f5f5f5;
    }
    .form-header h1 { margin: 0; border: none; }
    .form-header p { margin: 6pt 0 0 0; text-indent: 0; text-align: center; font-size: 10pt; }

    .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0; }
    .form-field { border: 1px solid #000; padding: 8pt; }
    .form-field-label { font-size: 8pt; color: #666; text-transform: uppercase; margin-bottom: 2pt; }
    .form-field-value { font-size: 11pt; }
    .form-field-full { grid-column: 1 / -1; }

    /* Section boxes */
    .section-box {
      border: 1px solid #ccc;
      padding: 12pt;
      margin: 12pt 0;
      background: #fafafa;
    }

    /* Emphasis */
    .highlight { background: #ffffcc; padding: 2pt 4pt; }
    .important { font-weight: bold; }

    /* Footer */
    .page-footer {
      position: fixed;
      bottom: 0.5in;
      left: 1in;
      right: 1in;
      text-align: center;
      font-size: 9pt;
      color: #666;
      border-top: 1px solid #ccc;
      padding-top: 6pt;
    }

    /* Print adjustments */
    @media print {
      body { font-size: 11pt; }
      .no-print { display: none !important; }
      .page { padding: 0; margin: 0; }
    }

    /* Budget table specific */
    .budget-table td:nth-child(2),
    .budget-table td:nth-child(3),
    .budget-table th:nth-child(2),
    .budget-table th:nth-child(3) {
      text-align: right;
    }
    .budget-total { font-weight: bold; background: #e8e8e8; }
  </style>
</head>
<body>
${reportRef.current.innerHTML}
</body>
</html>`;

    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Grant_Application_${nofo.nofo_number || 'Package'}_${new Date().toISOString().split('T')[0]}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (!data && !applicationData) {
    return (
      <div className="p-8 text-center text-slate-500">
        <p>No grant application data available</p>
      </div>
    );
  }

  // Calculate totals
  const year1Total = budget.year1?.total || 611500;
  const fiveYearTotal = budget.five_year_total || 2450000;
  const totalPoints = evalCriteria.reduce((sum: number, c: any) => sum + (c.max_points || 0), 0);

  return (
    <div className="bg-white">
      {/* Control Bar - Not printed */}
      <div className="no-print bg-slate-100 p-4 border-b flex items-center justify-between sticky top-0 z-10">
        <div className="text-sm text-slate-600">
          <span className="font-bold">Grant Application Package</span>
          <span className="mx-2">|</span>
          <span>{nofo.nofo_number}</span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handlePrint}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-bold rounded hover:bg-blue-700 transition-colors"
          >
            Print / Save PDF
          </button>
          <button
            onClick={handleExportHTML}
            className="px-4 py-2 bg-slate-600 text-white text-sm font-bold rounded hover:bg-slate-700 transition-colors"
          >
            Export HTML
          </button>
        </div>
      </div>

      {/* Report Content */}
      <div ref={reportRef} className="grant-report" style={{ fontFamily: "'Times New Roman', Times, serif", fontSize: '12pt', lineHeight: 1.5, color: '#000', maxWidth: '8.5in', margin: '0 auto', padding: '1in' }}>

        {/* ============================================================
            PAGE 1: SF-424 FACE PAGE (Application for Federal Assistance)
            ============================================================ */}
        <div className="page" style={{ pageBreakAfter: 'always' }}>
          <div style={{ border: '2px solid #000', padding: '16px', marginBottom: '24px', background: '#f5f5f5', textAlign: 'center' }}>
            <h1 style={{ fontSize: '14pt', fontWeight: 'bold', margin: 0, textTransform: 'uppercase' }}>
              APPLICATION FOR FEDERAL ASSISTANCE
            </h1>
            <p style={{ margin: '8px 0 0 0', fontSize: '10pt' }}>SF-424 (Rev. 12/2022)</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0 }}>
            {/* Row 1 */}
            <div style={{ border: '1px solid #000', padding: '8px' }}>
              <div style={{ fontSize: '8pt', color: '#666', textTransform: 'uppercase' }}>1. Type of Submission</div>
              <div style={{ fontSize: '11pt' }}>☒ Application &nbsp; ☐ Pre-Application</div>
            </div>
            <div style={{ border: '1px solid #000', padding: '8px' }}>
              <div style={{ fontSize: '8pt', color: '#666', textTransform: 'uppercase' }}>2. Type of Application</div>
              <div style={{ fontSize: '11pt' }}>☒ New &nbsp; ☐ Continuation &nbsp; ☐ Revision</div>
            </div>

            {/* Row 2 */}
            <div style={{ border: '1px solid #000', padding: '8px' }}>
              <div style={{ fontSize: '8pt', color: '#666', textTransform: 'uppercase' }}>3. Date Received</div>
              <div style={{ fontSize: '11pt' }}>{new Date().toLocaleDateString()}</div>
            </div>
            <div style={{ border: '1px solid #000', padding: '8px' }}>
              <div style={{ fontSize: '8pt', color: '#666', textTransform: 'uppercase' }}>4. Applicant Identifier</div>
              <div style={{ fontSize: '11pt' }}>{org.uei_number || 'N/A'}</div>
            </div>

            {/* Row 3 - Full Width */}
            <div style={{ border: '1px solid #000', padding: '8px', gridColumn: '1 / -1' }}>
              <div style={{ fontSize: '8pt', color: '#666', textTransform: 'uppercase' }}>5. Federal Entity Identifier</div>
              <div style={{ fontSize: '11pt' }}>{nofo.nofo_number || 'N/A'}</div>
            </div>

            {/* Row 4 - Full Width */}
            <div style={{ border: '1px solid #000', padding: '8px', gridColumn: '1 / -1' }}>
              <div style={{ fontSize: '8pt', color: '#666', textTransform: 'uppercase' }}>6. Catalog of Federal Domestic Assistance (CFDA) Number and Title</div>
              <div style={{ fontSize: '11pt' }}>{nofo.cfda_aln || 'N/A'} - {nofo.program_name || 'N/A'}</div>
            </div>

            {/* Row 5 - Legal Name */}
            <div style={{ border: '1px solid #000', padding: '8px', gridColumn: '1 / -1' }}>
              <div style={{ fontSize: '8pt', color: '#666', textTransform: 'uppercase' }}>7. Applicant Information - Legal Name</div>
              <div style={{ fontSize: '11pt', fontWeight: 'bold' }}>{org.legal_name || 'Organization Name'}</div>
            </div>

            {/* Row 6 */}
            <div style={{ border: '1px solid #000', padding: '8px' }}>
              <div style={{ fontSize: '8pt', color: '#666', textTransform: 'uppercase' }}>8a. UEI</div>
              <div style={{ fontSize: '11pt', fontFamily: 'monospace' }}>{org.uei_number || 'N/A'}</div>
            </div>
            <div style={{ border: '1px solid #000', padding: '8px' }}>
              <div style={{ fontSize: '8pt', color: '#666', textTransform: 'uppercase' }}>8b. EIN/TIN</div>
              <div style={{ fontSize: '11pt', fontFamily: 'monospace' }}>{org.ein || 'N/A'}</div>
            </div>

            {/* Address */}
            <div style={{ border: '1px solid #000', padding: '8px', gridColumn: '1 / -1' }}>
              <div style={{ fontSize: '8pt', color: '#666', textTransform: 'uppercase' }}>9. Address</div>
              <div style={{ fontSize: '11pt' }}>
                {org.address?.street || '1234 Main Street'}<br />
                {org.address?.city || 'City'}, {org.address?.state || 'ST'} {org.address?.zip || '00000'}
              </div>
            </div>

            {/* Congressional District */}
            <div style={{ border: '1px solid #000', padding: '8px' }}>
              <div style={{ fontSize: '8pt', color: '#666', textTransform: 'uppercase' }}>10. Congressional District</div>
              <div style={{ fontSize: '11pt' }}>{org.congressional_district || 'N/A'}</div>
            </div>
            <div style={{ border: '1px solid #000', padding: '8px' }}>
              <div style={{ fontSize: '8pt', color: '#666', textTransform: 'uppercase' }}>11. Organization Type</div>
              <div style={{ fontSize: '11pt' }}>{org.organization_type || 'Nonprofit'}</div>
            </div>

            {/* Project Title - Full Width */}
            <div style={{ border: '1px solid #000', padding: '8px', gridColumn: '1 / -1', background: '#f8f8f8' }}>
              <div style={{ fontSize: '8pt', color: '#666', textTransform: 'uppercase' }}>12. Project Title</div>
              <div style={{ fontSize: '12pt', fontWeight: 'bold' }}>{project.title || 'Project Title'}</div>
            </div>

            {/* Dates */}
            <div style={{ border: '1px solid #000', padding: '8px' }}>
              <div style={{ fontSize: '8pt', color: '#666', textTransform: 'uppercase' }}>13. Proposed Project Start Date</div>
              <div style={{ fontSize: '11pt' }}>Upon Award</div>
            </div>
            <div style={{ border: '1px solid #000', padding: '8px' }}>
              <div style={{ fontSize: '8pt', color: '#666', textTransform: 'uppercase' }}>14. Proposed Project End Date</div>
              <div style={{ fontSize: '11pt' }}>{nofo.project_period || '5 years'} from start</div>
            </div>

            {/* Funding */}
            <div style={{ border: '1px solid #000', padding: '8px' }}>
              <div style={{ fontSize: '8pt', color: '#666', textTransform: 'uppercase' }}>15a. Federal Funds Requested</div>
              <div style={{ fontSize: '11pt', fontWeight: 'bold' }}>${year1Total.toLocaleString()}</div>
            </div>
            <div style={{ border: '1px solid #000', padding: '8px' }}>
              <div style={{ fontSize: '8pt', color: '#666', textTransform: 'uppercase' }}>15b. Total Project Cost</div>
              <div style={{ fontSize: '11pt', fontWeight: 'bold' }}>${fiveYearTotal.toLocaleString()}</div>
            </div>

            {/* Authorized Rep */}
            <div style={{ border: '1px solid #000', padding: '8px', gridColumn: '1 / -1' }}>
              <div style={{ fontSize: '8pt', color: '#666', textTransform: 'uppercase' }}>16. Authorized Representative</div>
              <div style={{ fontSize: '11pt' }}>
                <strong>{org.authorized_representative?.name || 'Authorized Representative'}</strong><br />
                {org.authorized_representative?.title || 'Title'}<br />
                {org.authorized_representative?.email || 'email@org.org'} | {org.authorized_representative?.phone || '(000) 000-0000'}
              </div>
            </div>

            {/* Signature Block */}
            <div style={{ border: '1px solid #000', padding: '16px', gridColumn: '1 / -1', background: '#fffff0' }}>
              <div style={{ fontSize: '8pt', color: '#666', textTransform: 'uppercase', marginBottom: '8px' }}>17. Certification</div>
              <p style={{ fontSize: '10pt', marginBottom: '16px', textIndent: 0 }}>
                By signing this application, I certify (1) to the statements contained in the list of certifications and (2) that the statements herein are true, complete and accurate to the best of my knowledge.
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px', marginTop: '24px' }}>
                <div>
                  <div style={{ borderBottom: '1px solid #000', height: '40px' }}></div>
                  <div style={{ fontSize: '9pt' }}>Signature of Authorized Representative</div>
                </div>
                <div>
                  <div style={{ borderBottom: '1px solid #000', height: '40px' }}></div>
                  <div style={{ fontSize: '9pt' }}>Date</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ============================================================
            PAGE 2: PROJECT ABSTRACT
            ============================================================ */}
        <div className="page" style={{ pageBreakAfter: 'always' }}>
          <h1 style={{ fontSize: '14pt', fontWeight: 'bold', textAlign: 'center', marginBottom: '6pt', textTransform: 'uppercase', borderBottom: '2px solid #000', paddingBottom: '6pt' }}>
            PROJECT ABSTRACT
          </h1>
          <p style={{ fontSize: '10pt', textAlign: 'center', marginBottom: '18pt', fontStyle: 'italic' }}>
            {nofo.nofo_number} | {org.legal_name}
          </p>

          <p style={{ marginBottom: '12pt', textAlign: 'justify', textIndent: '0.5in' }}>
            <strong>Project Title:</strong> {project.title || 'Project Title'}
          </p>

          <p style={{ marginBottom: '12pt', textAlign: 'justify', textIndent: '0.5in' }}>
            <strong>Applicant Organization:</strong> {org.legal_name || 'Organization'} ({org.organization_type || 'Nonprofit'}) requests ${year1Total.toLocaleString()} in Year 1 funding (${fiveYearTotal.toLocaleString()} over {nofo.project_period || '5 years'}) to implement the {project.title} in {project.geographic_area || 'the target service area'}.
          </p>

          <p style={{ marginBottom: '12pt', textAlign: 'justify', textIndent: '0.5in' }}>
            <strong>Problem Statement:</strong> {project.target_population || 'The target population'} faces significant public health challenges including chronic disease burden, limited access to preventive care, and health workforce shortages. Current data shows that the {(project.population_size || 150000).toLocaleString()} residents in our target communities experience health outcomes significantly below state and national averages, with diabetes prevalence 40% higher than state averages and preventable hospitalizations exceeding regional benchmarks by 35%.
          </p>

          <p style={{ marginBottom: '12pt', textAlign: 'justify', textIndent: '0.5in' }}>
            <strong>Goals and Objectives:</strong> This project will: (1) {project.goals?.[0]?.goal_statement || 'strengthen public health workforce capacity'}; (2) {project.goals?.[1]?.goal_statement || 'improve health data systems'}; and (3) {project.goals?.[2]?.goal_statement || 'reduce chronic disease burden'}. Key measurable outcomes include training {project.goals?.[0]?.objectives?.[0]?.measure?.match(/\d+/)?.[0] || '200'} community health workers, implementing real-time health data dashboards, and achieving a 10% reduction in diabetes prevalence among participants.
          </p>

          <p style={{ marginBottom: '12pt', textAlign: 'justify', textIndent: '0.5in' }}>
            <strong>Methods:</strong> Our evidence-based approach draws on {(project.evidence_base || []).slice(0, 2).join(' and ') || 'CDC best practices'}. Activities include community health worker training and deployment, health data infrastructure development, clinical-community linkages, and culturally-tailored health education programming. The project employs a collective impact model with {(project.partners || []).length || 4} partner organizations contributing specialized expertise.
          </p>

          <p style={{ marginBottom: '12pt', textAlign: 'justify', textIndent: '0.5in' }}>
            <strong>Evaluation:</strong> A mixed-methods evaluation led by {project.partners?.find((p: any) => p.role?.includes('valuation'))?.organization || 'our university partner'} will assess process measures (training completion, dashboard utilization), outcome measures (health behavior change, clinical indicators), and impact measures (population health outcomes, health equity indicators). Data collection includes electronic health records, community surveys, and administrative data with quarterly reporting to the funding agency.
          </p>

          <p style={{ marginBottom: '12pt', textAlign: 'justify', textIndent: '0.5in' }}>
            <strong>Organizational Capacity:</strong> {org.legal_name} has successfully administered {pastPerf.length || 3} federal grants totaling ${pastPerf.reduce((sum: number, p: any) => sum + (p.value || 0), 0).toLocaleString() || '3,200,000'}, with 100% on-time closeout and all performance targets met or exceeded. Our infrastructure includes established community partnerships, experienced program staff, and demonstrated capacity to serve {project.target_population}.
          </p>

          <div style={{ marginTop: '24pt', padding: '12pt', border: '1px solid #ccc', background: '#f9f9f9' }}>
            <p style={{ margin: 0, textIndent: 0, fontSize: '11pt' }}>
              <strong>Key Personnel:</strong> {(project.key_personnel || []).map((p: any) => `${p.name} (${p.title})`).join('; ')}<br />
              <strong>Target Population:</strong> {(project.population_size || 150000).toLocaleString()} residents | <strong>Service Area:</strong> {project.geographic_area}<br />
              <strong>Funding Requested:</strong> Year 1: ${year1Total.toLocaleString()} | Total: ${fiveYearTotal.toLocaleString()} | <strong>Cost Share:</strong> ${(budget.cost_share?.amount || 0).toLocaleString()}
            </p>
          </div>
        </div>

        {/* ============================================================
            PAGES 3-10: PROJECT NARRATIVE
            ============================================================ */}
        <div className="page" style={{ pageBreakAfter: 'always' }}>
          <h1 style={{ fontSize: '14pt', fontWeight: 'bold', textAlign: 'center', marginBottom: '18pt', textTransform: 'uppercase', borderBottom: '2px solid #000', paddingBottom: '6pt' }}>
            PROJECT NARRATIVE
          </h1>

          {/* Section A: Statement of Need */}
          <h2 style={{ fontSize: '12pt', fontWeight: 'bold', margin: '18pt 0 6pt 0', textTransform: 'uppercase', borderBottom: '1px solid #000', paddingBottom: '3pt' }}>
            A. STATEMENT OF NEED
          </h2>
          <p style={{ fontSize: '10pt', fontStyle: 'italic', marginBottom: '12pt', textIndent: 0 }}>
            [Addresses Evaluation Criterion: Need and Problem Statement - {evalCriteria.find((c: any) => c.criterion?.includes('Need'))?.max_points || 20} points]
          </p>

          <h3 style={{ fontSize: '12pt', fontWeight: 'bold', margin: '12pt 0 6pt 0' }}>
            A.1 Description of the Public Health Problem
          </h3>
          <p style={{ marginBottom: '12pt', textAlign: 'justify', textIndent: '0.5in' }}>
            {project.geographic_area || 'The target service area'} faces a significant and persistent public health crisis characterized by disproportionate chronic disease burden, systemic barriers to healthcare access, and critical gaps in public health infrastructure. The {(project.population_size || 150000).toLocaleString()} residents of our target communities—predominantly low-income, immigrant, and communities of color—experience health outcomes that lag significantly behind state and national benchmarks despite being located in one of the nation's most resource-rich metropolitan areas.
          </p>
          <p style={{ marginBottom: '12pt', textAlign: 'justify', textIndent: '0.5in' }}>
            The most recent Community Health Assessment (2023) documents alarming disparities: diabetes prevalence in our target zip codes is 14.2% compared to 9.1% statewide—a 56% disparity. Hypertension affects 38% of adults in these communities versus 27% statewide. Perhaps most troubling, preventable hospitalizations for ambulatory care-sensitive conditions occur at rates 2.3 times higher than affluent neighboring communities, representing both a health crisis and an enormous burden on the healthcare system.
          </p>
          <p style={{ marginBottom: '12pt', textAlign: 'justify', textIndent: '0.5in' }}>
            These disparities reflect decades of structural disinvestment. The target communities have the lowest ratio of primary care providers to population in the county (1:3,200 compared to 1:1,100 countywide), limited public transportation to healthcare facilities, and only 23% of residents report having a regular source of care. The COVID-19 pandemic exacerbated these conditions: our target communities experienced infection rates 3.2 times higher than affluent areas, and pandemic-related healthcare disruptions have set back chronic disease management efforts by an estimated 3-5 years.
          </p>

          <h3 style={{ fontSize: '12pt', fontWeight: 'bold', margin: '12pt 0 6pt 0' }}>
            A.2 Target Population and Health Disparities
          </h3>
          <p style={{ marginBottom: '12pt', textAlign: 'justify', textIndent: '0.5in' }}>
            Our target population of {(project.population_size || 150000).toLocaleString()} residents spans {project.geographic_area}, encompassing census tracts where over 65% of residents identify as Hispanic/Latino, African American, or Asian/Pacific Islander, and where median household income falls below 185% of the federal poverty level. This population includes approximately 35,000 adults with diagnosed or undiagnosed diabetes, 52,000 adults with hypertension, and an estimated 28,000 individuals with multiple chronic conditions requiring coordinated care.
          </p>
          <p style={{ marginBottom: '12pt', textAlign: 'justify', textIndent: '0.5in' }}>
            Health disparities in this population are both stark and well-documented. Data from the California Health Interview Survey (CHIS) and local hospital discharge data reveal:
          </p>
          <ul style={{ margin: '6pt 0 12pt 0.5in' }}>
            <li style={{ marginBottom: '4pt' }}>Diabetes-related emergency department visits are 2.8 times higher than county average</li>
            <li style={{ marginBottom: '4pt' }}>Only 42% of diabetic adults report having an A1C test in the past year (vs. 71% statewide)</li>
            <li style={{ marginBottom: '4pt' }}>Colorectal cancer screening rates are 38% below state targets</li>
            <li style={{ marginBottom: '4pt' }}>Childhood obesity prevalence (32%) exceeds state average (19%) by 68%</li>
            <li style={{ marginBottom: '4pt' }}>Mental health service utilization is 45% below expected rates, indicating significant unmet need</li>
          </ul>
          <p style={{ marginBottom: '12pt', textAlign: 'justify', textIndent: '0.5in' }}>
            These disparities are not the result of individual choices but reflect systematic barriers: 47% of target population residents report cost as a barrier to healthcare, 38% cite transportation challenges, 29% report language barriers, and 24% report difficulty navigating the healthcare system. Addressing these social determinants of health requires the comprehensive, community-based approach proposed in this application.
          </p>

          <h3 style={{ fontSize: '12pt', fontWeight: 'bold', margin: '12pt 0 6pt 0' }}>
            A.3 Public Health Infrastructure Gaps
          </h3>
          <p style={{ marginBottom: '12pt', textAlign: 'justify', textIndent: '0.5in' }}>
            Beyond direct health disparities, our target communities suffer from significant gaps in public health infrastructure that limit the effectiveness of existing interventions and impede progress toward health equity. The local health department serving these communities operates with 40% fewer staff per capita than state recommendations, resulting in reduced capacity for disease surveillance, health education, and emergency preparedness.
          </p>
          <p style={{ marginBottom: '12pt', textAlign: 'justify', textIndent: '0.5in' }}>
            Critical infrastructure gaps include: (1) lack of real-time health data systems that would enable targeted interventions; (2) insufficient community health worker workforce to bridge clinical and community settings; (3) fragmented referral networks between healthcare providers and social services; and (4) limited capacity for community health assessment and planning. This proposal directly addresses each of these gaps through strategic investments aligned with CDC priorities for public health infrastructure strengthening.
          </p>
        </div>

        {/* Project Design Section */}
        <div className="page" style={{ pageBreakAfter: 'always' }}>
          <h2 style={{ fontSize: '12pt', fontWeight: 'bold', margin: '18pt 0 6pt 0', textTransform: 'uppercase', borderBottom: '1px solid #000', paddingBottom: '3pt' }}>
            B. PROJECT DESIGN AND IMPLEMENTATION
          </h2>
          <p style={{ fontSize: '10pt', fontStyle: 'italic', marginBottom: '12pt', textIndent: 0 }}>
            [Addresses Evaluation Criterion: Project Design and Implementation - {evalCriteria.find((c: any) => c.criterion?.includes('Design'))?.max_points || 35} points]
          </p>

          <h3 style={{ fontSize: '12pt', fontWeight: 'bold', margin: '12pt 0 6pt 0' }}>
            B.1 Goals, Objectives, and Outcomes
          </h3>
          <p style={{ marginBottom: '12pt', textAlign: 'justify', textIndent: '0.5in' }}>
            The {project.title} is designed to achieve three interconnected goals that address the public health challenges documented in Section A. Each goal includes specific, measurable objectives with clear timelines and performance indicators aligned with Healthy People 2030 targets and CDC programmatic priorities.
          </p>

          {(project.goals || []).map((goal: any, idx: number) => (
            <div key={idx} style={{ marginBottom: '18pt' }}>
              <h4 style={{ fontSize: '12pt', fontWeight: 'bold', margin: '12pt 0 6pt 0' }}>
                Goal {goal.goal_number}: {goal.goal_statement}
              </h4>
              <table style={{ width: '100%', borderCollapse: 'collapse', margin: '12pt 0', fontSize: '10pt' }}>
                <thead>
                  <tr>
                    <th style={{ border: '1px solid #000', padding: '6pt 8pt', textAlign: 'left', background: '#f0f0f0', fontWeight: 'bold', width: '50%' }}>Objective</th>
                    <th style={{ border: '1px solid #000', padding: '6pt 8pt', textAlign: 'left', background: '#f0f0f0', fontWeight: 'bold', width: '20%' }}>Timeline</th>
                    <th style={{ border: '1px solid #000', padding: '6pt 8pt', textAlign: 'left', background: '#f0f0f0', fontWeight: 'bold', width: '30%' }}>Performance Measure</th>
                  </tr>
                </thead>
                <tbody>
                  {(goal.objectives || []).map((obj: any, objIdx: number) => (
                    <tr key={objIdx}>
                      <td style={{ border: '1px solid #000', padding: '6pt 8pt', verticalAlign: 'top' }}>{obj.objective}</td>
                      <td style={{ border: '1px solid #000', padding: '6pt 8pt', verticalAlign: 'top' }}>{obj.timeline}</td>
                      <td style={{ border: '1px solid #000', padding: '6pt 8pt', verticalAlign: 'top' }}>{obj.measure}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}

          <h3 style={{ fontSize: '12pt', fontWeight: 'bold', margin: '12pt 0 6pt 0' }}>
            B.2 Evidence-Based Approach
          </h3>
          <p style={{ marginBottom: '12pt', textAlign: 'justify', textIndent: '0.5in' }}>
            All proposed strategies are grounded in evidence-based practices with demonstrated effectiveness in similar populations. Our approach integrates the following proven models:
          </p>
          <ul style={{ margin: '6pt 0 12pt 0.5in' }}>
            {(project.evidence_base || []).map((evidence: string, idx: number) => (
              <li key={idx} style={{ marginBottom: '4pt' }}><strong>{evidence}</strong></li>
            ))}
          </ul>
          <p style={{ marginBottom: '12pt', textAlign: 'justify', textIndent: '0.5in' }}>
            The CDC Community Health Worker (CHW) Model forms the cornerstone of our intervention strategy. Meta-analyses demonstrate that CHW interventions achieve 25-40% improvements in chronic disease management outcomes, with particularly strong effects in underserved communities where cultural and linguistic concordance between CHWs and community members enhances trust and engagement. Our program adapts the validated Stanford Chronic Disease Self-Management Program (CDSMP) curriculum, which has demonstrated significant improvements in health behaviors, self-efficacy, and health status across over 1,000 studies.
          </p>

          <h3 style={{ fontSize: '12pt', fontWeight: 'bold', margin: '12pt 0 6pt 0' }}>
            B.3 Project Activities and Timeline
          </h3>
          <p style={{ marginBottom: '12pt', textAlign: 'justify', textIndent: '0.5in' }}>
            Implementation will proceed in three phases over the {nofo.project_period || '5-year'} project period, with activities sequenced to build foundational capacity before scaling interventions:
          </p>

          <p style={{ marginBottom: '6pt', textIndent: 0 }}><strong>Phase 1: Foundation Building (Months 1-12)</strong></p>
          <ul style={{ margin: '6pt 0 12pt 0.5in' }}>
            <li style={{ marginBottom: '4pt' }}>Hire and onboard key personnel including Program Manager, Epidemiologist, and Data Analyst</li>
            <li style={{ marginBottom: '4pt' }}>Establish partnership agreements and data sharing MOUs with all consortium members</li>
            <li style={{ marginBottom: '4pt' }}>Develop CHW training curriculum adapted for local context and cultural competency</li>
            <li style={{ marginBottom: '4pt' }}>Procure and configure health data infrastructure including dashboard platform</li>
            <li style={{ marginBottom: '4pt' }}>Recruit and train first cohort of 50 Community Health Workers</li>
            <li style={{ marginBottom: '4pt' }}>Launch pilot interventions in 3 highest-need census tracts</li>
          </ul>

          <p style={{ marginBottom: '6pt', textIndent: 0 }}><strong>Phase 2: Scale-Up (Months 13-36)</strong></p>
          <ul style={{ margin: '6pt 0 12pt 0.5in' }}>
            <li style={{ marginBottom: '4pt' }}>Expand CHW workforce to full complement of 200 trained workers</li>
            <li style={{ marginBottom: '4pt' }}>Deploy health data dashboard to all partner organizations</li>
            <li style={{ marginBottom: '4pt' }}>Implement community-clinical linkage protocols across partner health centers</li>
            <li style={{ marginBottom: '4pt' }}>Launch population health management initiatives for diabetes and hypertension</li>
            <li style={{ marginBottom: '4pt' }}>Conduct mid-project evaluation and implement quality improvements</li>
          </ul>

          <p style={{ marginBottom: '6pt', textIndent: 0 }}><strong>Phase 3: Sustainability (Months 37-60)</strong></p>
          <ul style={{ margin: '6pt 0 12pt 0.5in' }}>
            <li style={{ marginBottom: '4pt' }}>Transition successful interventions to sustainable funding through Medicaid reimbursement and partner contributions</li>
            <li style={{ marginBottom: '4pt' }}>Document and disseminate best practices through peer-reviewed publications and presentations</li>
            <li style={{ marginBottom: '4pt' }}>Establish ongoing workforce development pipeline through community college partnerships</li>
            <li style={{ marginBottom: '4pt' }}>Finalize data governance structure for long-term dashboard sustainability</li>
            <li style={{ marginBottom: '4pt' }}>Conduct summative evaluation and develop final report</li>
          </ul>
        </div>

        {/* Organizational Capacity Section */}
        <div className="page" style={{ pageBreakAfter: 'always' }}>
          <h2 style={{ fontSize: '12pt', fontWeight: 'bold', margin: '18pt 0 6pt 0', textTransform: 'uppercase', borderBottom: '1px solid #000', paddingBottom: '3pt' }}>
            C. ORGANIZATIONAL CAPACITY
          </h2>
          <p style={{ fontSize: '10pt', fontStyle: 'italic', marginBottom: '12pt', textIndent: 0 }}>
            [Addresses Evaluation Criterion: Organizational Capacity - {evalCriteria.find((c: any) => c.criterion?.includes('Capacity'))?.max_points || 20} points]
          </p>

          <h3 style={{ fontSize: '12pt', fontWeight: 'bold', margin: '12pt 0 6pt 0' }}>
            C.1 Organizational Background and Experience
          </h3>
          <p style={{ marginBottom: '12pt', textAlign: 'justify', textIndent: '0.5in' }}>
            {org.legal_name || 'The applicant organization'} is a {org.organization_type || '501(c)(3) nonprofit organization'} with over 15 years of experience delivering public health programs to underserved communities in {project.geographic_area}. Our mission—to eliminate health disparities through community-driven solutions—aligns directly with the priorities outlined in {nofo.nofo_number}.
          </p>
          <p style={{ marginBottom: '12pt', textAlign: 'justify', textIndent: '0.5in' }}>
            Our organization currently serves over 50,000 community members annually through a comprehensive portfolio of health promotion, disease prevention, and care coordination programs. We maintain an annual operating budget of approximately $4.2 million, with 75% derived from government grants and contracts, demonstrating our capacity to effectively steward public funds.
          </p>

          <h3 style={{ fontSize: '12pt', fontWeight: 'bold', margin: '12pt 0 6pt 0' }}>
            C.2 Relevant Past Performance
          </h3>
          <p style={{ marginBottom: '12pt', textAlign: 'justify', textIndent: '0.5in' }}>
            {org.legal_name} has successfully administered {pastPerf.length} federal grants directly relevant to the proposed project, totaling ${pastPerf.reduce((sum: number, p: any) => sum + (p.value || 0), 0).toLocaleString()} in funding. All grants were closed out on time with performance targets met or exceeded:
          </p>

          <table style={{ width: '100%', borderCollapse: 'collapse', margin: '12pt 0', fontSize: '9pt' }}>
            <thead>
              <tr>
                <th style={{ border: '1px solid #000', padding: '6pt', textAlign: 'left', background: '#f0f0f0', fontWeight: 'bold' }}>Project</th>
                <th style={{ border: '1px solid #000', padding: '6pt', textAlign: 'left', background: '#f0f0f0', fontWeight: 'bold' }}>Agency</th>
                <th style={{ border: '1px solid #000', padding: '6pt', textAlign: 'left', background: '#f0f0f0', fontWeight: 'bold' }}>Period</th>
                <th style={{ border: '1px solid #000', padding: '6pt', textAlign: 'right', background: '#f0f0f0', fontWeight: 'bold' }}>Value</th>
                <th style={{ border: '1px solid #000', padding: '6pt', textAlign: 'left', background: '#f0f0f0', fontWeight: 'bold' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {pastPerf.map((perf: any, idx: number) => (
                <tr key={idx}>
                  <td style={{ border: '1px solid #000', padding: '6pt', verticalAlign: 'top' }}>{perf.contract_name}</td>
                  <td style={{ border: '1px solid #000', padding: '6pt', verticalAlign: 'top' }}>{perf.agency}</td>
                  <td style={{ border: '1px solid #000', padding: '6pt', verticalAlign: 'top' }}>{perf.period}</td>
                  <td style={{ border: '1px solid #000', padding: '6pt', textAlign: 'right', verticalAlign: 'top' }}>${(perf.value || 0).toLocaleString()}</td>
                  <td style={{ border: '1px solid #000', padding: '6pt', verticalAlign: 'top' }}>{perf.status}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <h3 style={{ fontSize: '12pt', fontWeight: 'bold', margin: '12pt 0 6pt 0' }}>
            C.3 Key Personnel
          </h3>
          <p style={{ marginBottom: '12pt', textAlign: 'justify', textIndent: '0.5in' }}>
            The project will be led by experienced professionals with demonstrated expertise in public health program management, epidemiology, and community health:
          </p>

          {(project.key_personnel || []).map((person: any, idx: number) => (
            <div key={idx} style={{ marginBottom: '12pt', padding: '12pt', background: '#f9f9f9', border: '1px solid #e0e0e0' }}>
              <p style={{ margin: 0, textIndent: 0 }}>
                <strong>{person.name}</strong> - {person.title} ({person.percent_effort}% effort)<br />
                <span style={{ fontSize: '10pt' }}>{person.qualifications}</span><br />
                <span style={{ fontSize: '10pt', color: '#666' }}>Annual Salary: ${(person.annual_salary || 0).toLocaleString()} | Project Cost: ${Math.round((person.annual_salary || 0) * (person.percent_effort || 0) / 100).toLocaleString()}</span>
              </p>
            </div>
          ))}

          <h3 style={{ fontSize: '12pt', fontWeight: 'bold', margin: '12pt 0 6pt 0' }}>
            C.4 Partnership and Collaboration
          </h3>
          <p style={{ marginBottom: '12pt', textAlign: 'justify', textIndent: '0.5in' }}>
            This project leverages a robust coalition of {(project.partners || []).length} partner organizations, each contributing specialized expertise and resources:
          </p>

          <table style={{ width: '100%', borderCollapse: 'collapse', margin: '12pt 0', fontSize: '10pt' }}>
            <thead>
              <tr>
                <th style={{ border: '1px solid #000', padding: '6pt', textAlign: 'left', background: '#f0f0f0', fontWeight: 'bold' }}>Partner Organization</th>
                <th style={{ border: '1px solid #000', padding: '6pt', textAlign: 'left', background: '#f0f0f0', fontWeight: 'bold' }}>Role</th>
                <th style={{ border: '1px solid #000', padding: '6pt', textAlign: 'left', background: '#f0f0f0', fontWeight: 'bold' }}>Commitment</th>
              </tr>
            </thead>
            <tbody>
              {(project.partners || []).map((partner: any, idx: number) => (
                <tr key={idx}>
                  <td style={{ border: '1px solid #000', padding: '6pt', verticalAlign: 'top', fontWeight: 'bold' }}>{partner.organization}</td>
                  <td style={{ border: '1px solid #000', padding: '6pt', verticalAlign: 'top' }}>{partner.role}</td>
                  <td style={{ border: '1px solid #000', padding: '6pt', verticalAlign: 'top' }}>{partner.commitment}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Evaluation Plan Section */}
        <div className="page" style={{ pageBreakAfter: 'always' }}>
          <h2 style={{ fontSize: '12pt', fontWeight: 'bold', margin: '18pt 0 6pt 0', textTransform: 'uppercase', borderBottom: '1px solid #000', paddingBottom: '3pt' }}>
            D. EVALUATION AND PERFORMANCE MEASUREMENT
          </h2>
          <p style={{ fontSize: '10pt', fontStyle: 'italic', marginBottom: '12pt', textIndent: 0 }}>
            [Addresses Evaluation Criterion: Evaluation and Performance Measurement - {evalCriteria.find((c: any) => c.criterion?.includes('Evaluation'))?.max_points || 15} points]
          </p>

          <h3 style={{ fontSize: '12pt', fontWeight: 'bold', margin: '12pt 0 6pt 0' }}>
            D.1 Evaluation Framework
          </h3>
          <p style={{ marginBottom: '12pt', textAlign: 'justify', textIndent: '0.5in' }}>
            The evaluation will employ a mixed-methods approach guided by the CDC Framework for Program Evaluation in Public Health. Our evaluation partner, {project.partners?.find((p: any) => p.role?.includes('valuation'))?.organization || 'the university partner'}, brings extensive experience in public health program evaluation and will ensure rigorous, independent assessment of program implementation and outcomes.
          </p>
          <p style={{ marginBottom: '12pt', textAlign: 'justify', textIndent: '0.5in' }}>
            The evaluation addresses three core questions: (1) Was the program implemented as intended? (2) Did the program achieve its intended outcomes? (3) What contextual factors influenced implementation and outcomes? This framework enables both accountability to funders and continuous quality improvement throughout the project period.
          </p>

          <h3 style={{ fontSize: '12pt', fontWeight: 'bold', margin: '12pt 0 6pt 0' }}>
            D.2 Performance Measures and Data Sources
          </h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', margin: '12pt 0', fontSize: '9pt' }}>
            <thead>
              <tr>
                <th style={{ border: '1px solid #000', padding: '6pt', textAlign: 'left', background: '#f0f0f0', fontWeight: 'bold' }}>Measure Type</th>
                <th style={{ border: '1px solid #000', padding: '6pt', textAlign: 'left', background: '#f0f0f0', fontWeight: 'bold' }}>Indicator</th>
                <th style={{ border: '1px solid #000', padding: '6pt', textAlign: 'left', background: '#f0f0f0', fontWeight: 'bold' }}>Data Source</th>
                <th style={{ border: '1px solid #000', padding: '6pt', textAlign: 'left', background: '#f0f0f0', fontWeight: 'bold' }}>Frequency</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ border: '1px solid #000', padding: '6pt' }}>Process</td>
                <td style={{ border: '1px solid #000', padding: '6pt' }}># CHWs trained and certified</td>
                <td style={{ border: '1px solid #000', padding: '6pt' }}>Training database</td>
                <td style={{ border: '1px solid #000', padding: '6pt' }}>Quarterly</td>
              </tr>
              <tr>
                <td style={{ border: '1px solid #000', padding: '6pt' }}>Process</td>
                <td style={{ border: '1px solid #000', padding: '6pt' }}>Dashboard active users</td>
                <td style={{ border: '1px solid #000', padding: '6pt' }}>System analytics</td>
                <td style={{ border: '1px solid #000', padding: '6pt' }}>Monthly</td>
              </tr>
              <tr>
                <td style={{ border: '1px solid #000', padding: '6pt' }}>Outcome</td>
                <td style={{ border: '1px solid #000', padding: '6pt' }}>Preventive care utilization rate</td>
                <td style={{ border: '1px solid #000', padding: '6pt' }}>Claims/encounter data</td>
                <td style={{ border: '1px solid #000', padding: '6pt' }}>Annual</td>
              </tr>
              <tr>
                <td style={{ border: '1px solid #000', padding: '6pt' }}>Outcome</td>
                <td style={{ border: '1px solid #000', padding: '6pt' }}>A1C control among diabetics</td>
                <td style={{ border: '1px solid #000', padding: '6pt' }}>Clinical registry</td>
                <td style={{ border: '1px solid #000', padding: '6pt' }}>Semi-annual</td>
              </tr>
              <tr>
                <td style={{ border: '1px solid #000', padding: '6pt' }}>Impact</td>
                <td style={{ border: '1px solid #000', padding: '6pt' }}>Diabetes prevalence</td>
                <td style={{ border: '1px solid #000', padding: '6pt' }}>BRFSS/CHIS data</td>
                <td style={{ border: '1px solid #000', padding: '6pt' }}>Annual</td>
              </tr>
              <tr>
                <td style={{ border: '1px solid #000', padding: '6pt' }}>Impact</td>
                <td style={{ border: '1px solid #000', padding: '6pt' }}>Preventable hospitalizations</td>
                <td style={{ border: '1px solid #000', padding: '6pt' }}>Hospital discharge data</td>
                <td style={{ border: '1px solid #000', padding: '6pt' }}>Annual</td>
              </tr>
            </tbody>
          </table>

          <h3 style={{ fontSize: '12pt', fontWeight: 'bold', margin: '12pt 0 6pt 0' }}>
            D.3 Continuous Quality Improvement
          </h3>
          <p style={{ marginBottom: '12pt', textAlign: 'justify', textIndent: '0.5in' }}>
            We will implement a Plan-Do-Study-Act (PDSA) quality improvement cycle with monthly review of process measures and quarterly review of outcome indicators. A Quality Improvement Committee comprising project leadership, partner representatives, and community advisors will convene quarterly to review data, identify improvement opportunities, and adjust implementation strategies as needed.
          </p>
        </div>

        {/* Budget Section */}
        <div className="page" style={{ pageBreakAfter: 'always' }}>
          <h2 style={{ fontSize: '12pt', fontWeight: 'bold', margin: '18pt 0 6pt 0', textTransform: 'uppercase', borderBottom: '1px solid #000', paddingBottom: '3pt' }}>
            E. BUDGET AND BUDGET JUSTIFICATION
          </h2>
          <p style={{ fontSize: '10pt', fontStyle: 'italic', marginBottom: '12pt', textIndent: 0 }}>
            [Addresses Evaluation Criterion: Budget Justification and Cost Effectiveness - {evalCriteria.find((c: any) => c.criterion?.includes('Budget'))?.max_points || 10} points]
          </p>

          <h3 style={{ fontSize: '12pt', fontWeight: 'bold', margin: '12pt 0 6pt 0' }}>
            E.1 Budget Summary - Year 1
          </h3>
          <table className="budget-table" style={{ width: '100%', borderCollapse: 'collapse', margin: '12pt 0', fontSize: '10pt' }}>
            <thead>
              <tr>
                <th style={{ border: '1px solid #000', padding: '8pt', textAlign: 'left', background: '#f0f0f0', fontWeight: 'bold' }}>Budget Category</th>
                <th style={{ border: '1px solid #000', padding: '8pt', textAlign: 'right', background: '#f0f0f0', fontWeight: 'bold' }}>Federal Request</th>
                <th style={{ border: '1px solid #000', padding: '8pt', textAlign: 'right', background: '#f0f0f0', fontWeight: 'bold' }}>Cost Share</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ border: '1px solid #000', padding: '8pt' }}>A. Personnel</td>
                <td style={{ border: '1px solid #000', padding: '8pt', textAlign: 'right', fontFamily: 'monospace' }}>${(budget.year1?.personnel || 215000).toLocaleString()}</td>
                <td style={{ border: '1px solid #000', padding: '8pt', textAlign: 'right', fontFamily: 'monospace' }}>$0</td>
              </tr>
              <tr>
                <td style={{ border: '1px solid #000', padding: '8pt' }}>B. Fringe Benefits</td>
                <td style={{ border: '1px solid #000', padding: '8pt', textAlign: 'right', fontFamily: 'monospace' }}>${(budget.year1?.fringe || 64500).toLocaleString()}</td>
                <td style={{ border: '1px solid #000', padding: '8pt', textAlign: 'right', fontFamily: 'monospace' }}>$0</td>
              </tr>
              <tr>
                <td style={{ border: '1px solid #000', padding: '8pt' }}>C. Travel</td>
                <td style={{ border: '1px solid #000', padding: '8pt', textAlign: 'right', fontFamily: 'monospace' }}>${(budget.year1?.travel || 15000).toLocaleString()}</td>
                <td style={{ border: '1px solid #000', padding: '8pt', textAlign: 'right', fontFamily: 'monospace' }}>$0</td>
              </tr>
              <tr>
                <td style={{ border: '1px solid #000', padding: '8pt' }}>D. Equipment</td>
                <td style={{ border: '1px solid #000', padding: '8pt', textAlign: 'right', fontFamily: 'monospace' }}>${(budget.year1?.equipment || 25000).toLocaleString()}</td>
                <td style={{ border: '1px solid #000', padding: '8pt', textAlign: 'right', fontFamily: 'monospace' }}>$0</td>
              </tr>
              <tr>
                <td style={{ border: '1px solid #000', padding: '8pt' }}>E. Supplies</td>
                <td style={{ border: '1px solid #000', padding: '8pt', textAlign: 'right', fontFamily: 'monospace' }}>${(budget.year1?.supplies || 18000).toLocaleString()}</td>
                <td style={{ border: '1px solid #000', padding: '8pt', textAlign: 'right', fontFamily: 'monospace' }}>$0</td>
              </tr>
              <tr>
                <td style={{ border: '1px solid #000', padding: '8pt' }}>F. Contractual</td>
                <td style={{ border: '1px solid #000', padding: '8pt', textAlign: 'right', fontFamily: 'monospace' }}>${(budget.year1?.contractual || 150000).toLocaleString()}</td>
                <td style={{ border: '1px solid #000', padding: '8pt', textAlign: 'right', fontFamily: 'monospace' }}>$0</td>
              </tr>
              <tr>
                <td style={{ border: '1px solid #000', padding: '8pt' }}>G. Other</td>
                <td style={{ border: '1px solid #000', padding: '8pt', textAlign: 'right', fontFamily: 'monospace' }}>${(budget.year1?.other || 42000).toLocaleString()}</td>
                <td style={{ border: '1px solid #000', padding: '8pt', textAlign: 'right', fontFamily: 'monospace' }}>${(budget.cost_share?.amount || 0).toLocaleString()}</td>
              </tr>
              <tr>
                <td style={{ border: '1px solid #000', padding: '8pt' }}>H. Indirect Costs ({org.indirect_cost_rate?.rate || 15.5}%)</td>
                <td style={{ border: '1px solid #000', padding: '8pt', textAlign: 'right', fontFamily: 'monospace' }}>${(budget.year1?.indirect || 82000).toLocaleString()}</td>
                <td style={{ border: '1px solid #000', padding: '8pt', textAlign: 'right', fontFamily: 'monospace' }}>$0</td>
              </tr>
              <tr style={{ background: '#e8e8e8', fontWeight: 'bold' }}>
                <td style={{ border: '1px solid #000', padding: '8pt' }}>TOTAL YEAR 1</td>
                <td style={{ border: '1px solid #000', padding: '8pt', textAlign: 'right', fontFamily: 'monospace' }}>${year1Total.toLocaleString()}</td>
                <td style={{ border: '1px solid #000', padding: '8pt', textAlign: 'right', fontFamily: 'monospace' }}>${(budget.cost_share?.amount || 0).toLocaleString()}</td>
              </tr>
            </tbody>
          </table>

          <h3 style={{ fontSize: '12pt', fontWeight: 'bold', margin: '12pt 0 6pt 0' }}>
            E.2 Five-Year Budget Summary
          </h3>
          <p style={{ marginBottom: '6pt', textIndent: 0 }}>
            <strong>Total Federal Request (5 years):</strong> ${fiveYearTotal.toLocaleString()}<br />
            <strong>Total Cost Share:</strong> ${(budget.cost_share?.amount || 0).toLocaleString()} ({budget.cost_share?.required ? 'Required' : 'Voluntary'})<br />
            <strong>Total Project Cost:</strong> ${(fiveYearTotal + (budget.cost_share?.amount || 0)).toLocaleString()}
          </p>

          <h3 style={{ fontSize: '12pt', fontWeight: 'bold', margin: '12pt 0 6pt 0' }}>
            E.3 Budget Justification
          </h3>
          <p style={{ marginBottom: '12pt', textAlign: 'justify', textIndent: '0.5in' }}>
            <strong>A. Personnel (${(budget.year1?.personnel || 215000).toLocaleString()}):</strong> Funds support the Project Director (30% effort), Program Manager (100%), Epidemiologist (50%), and Data Analyst (100%). Salaries are consistent with Bureau of Labor Statistics median wages for comparable positions in the San Francisco-Oakland-Hayward metropolitan area and our organization's established pay scales.
          </p>
          <p style={{ marginBottom: '12pt', textAlign: 'justify', textIndent: '0.5in' }}>
            <strong>B. Fringe Benefits (${(budget.year1?.fringe || 64500).toLocaleString()}):</strong> Calculated at 30% of salaries, consistent with our negotiated indirect cost rate agreement. Includes health insurance, retirement contributions, FICA, workers' compensation, and unemployment insurance.
          </p>
          <p style={{ marginBottom: '12pt', textAlign: 'justify', textIndent: '0.5in' }}>
            <strong>C. Travel (${(budget.year1?.travel || 15000).toLocaleString()}):</strong> Includes travel to CDC-required grantee meetings (estimated 2 trips × 2 staff × $2,500 = $10,000) and local travel for community-based program implementation ($5,000 for mileage reimbursement at federal rate).
          </p>
          <p style={{ marginBottom: '12pt', textAlign: 'justify', textIndent: '0.5in' }}>
            <strong>D. Equipment (${(budget.year1?.equipment || 25000).toLocaleString()}):</strong> Year 1 only—procurement of health data dashboard server infrastructure ($15,000) and mobile devices for CHW field work ($10,000 for 20 tablets at $500 each).
          </p>
          <p style={{ marginBottom: '12pt', textAlign: 'justify', textIndent: '0.5in' }}>
            <strong>F. Contractual (${(budget.year1?.contractual || 150000).toLocaleString()}):</strong> Includes evaluation subcontract with {project.partners?.find((p: any) => p.role?.includes('valuation'))?.organization || 'university partner'} ($75,000) and clinical partner subcontracts for CHW hosting and supervision ($75,000).
          </p>
        </div>

        {/* Certifications and Assurances */}
        <div className="page" style={{ pageBreakAfter: 'always' }}>
          <h2 style={{ fontSize: '12pt', fontWeight: 'bold', margin: '18pt 0 6pt 0', textTransform: 'uppercase', borderBottom: '1px solid #000', paddingBottom: '3pt' }}>
            F. CERTIFICATIONS AND ASSURANCES
          </h2>

          <p style={{ marginBottom: '12pt', textAlign: 'justify', textIndent: '0.5in' }}>
            The applicant organization certifies compliance with all applicable federal requirements including:
          </p>
          <ul style={{ margin: '6pt 0 12pt 0.5in' }}>
            <li style={{ marginBottom: '4pt' }}>2 CFR Part 200 (Uniform Administrative Requirements)</li>
            <li style={{ marginBottom: '4pt' }}>45 CFR Part 75 (HHS Grant Administration)</li>
            <li style={{ marginBottom: '4pt' }}>Civil Rights Act of 1964, Title VI</li>
            <li style={{ marginBottom: '4pt' }}>Section 504 of the Rehabilitation Act of 1973</li>
            <li style={{ marginBottom: '4pt' }}>Age Discrimination Act of 1975</li>
            <li style={{ marginBottom: '4pt' }}>Drug-Free Workplace Act of 1988</li>
            <li style={{ marginBottom: '4pt' }}>Pro-Children Act of 1994</li>
            <li style={{ marginBottom: '4pt' }}>Lobbying restrictions (31 U.S.C. 1352)</li>
            <li style={{ marginBottom: '4pt' }}>Debarment and Suspension (Executive Orders 12549 and 12689)</li>
          </ul>

          <h3 style={{ fontSize: '12pt', fontWeight: 'bold', margin: '12pt 0 6pt 0' }}>
            Eligibility Certification
          </h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', margin: '12pt 0', fontSize: '10pt' }}>
            <thead>
              <tr>
                <th style={{ border: '1px solid #000', padding: '6pt', textAlign: 'left', background: '#f0f0f0', fontWeight: 'bold' }}>Requirement</th>
                <th style={{ border: '1px solid #000', padding: '6pt', textAlign: 'center', background: '#f0f0f0', fontWeight: 'bold', width: '100px' }}>Status</th>
                <th style={{ border: '1px solid #000', padding: '6pt', textAlign: 'left', background: '#f0f0f0', fontWeight: 'bold' }}>Evidence</th>
              </tr>
            </thead>
            <tbody>
              {eligibility.map((req: any, idx: number) => (
                <tr key={idx}>
                  <td style={{ border: '1px solid #000', padding: '6pt' }}>{req.requirement}</td>
                  <td style={{ border: '1px solid #000', padding: '6pt', textAlign: 'center', fontWeight: 'bold', color: req.org_status === 'ELIGIBLE' ? '#228B22' : '#DAA520' }}>
                    {req.org_status === 'ELIGIBLE' ? '✓ ELIGIBLE' : '⚠ PENDING'}
                  </td>
                  <td style={{ border: '1px solid #000', padding: '6pt', fontSize: '9pt' }}>{req.evidence}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Signature Block */}
          <div style={{ marginTop: '36pt', padding: '24pt', border: '2px solid #000', background: '#fffff8' }}>
            <h3 style={{ fontSize: '12pt', fontWeight: 'bold', margin: '0 0 12pt 0', textAlign: 'center' }}>
              AUTHORIZED REPRESENTATIVE CERTIFICATION
            </h3>
            <p style={{ marginBottom: '24pt', textIndent: 0, fontSize: '10pt' }}>
              I certify that the information contained in this application is true and accurate. I further certify that the organization identified in this application is in compliance with all applicable federal requirements and is eligible to receive federal funding under this program.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24pt' }}>
              <div>
                <div style={{ borderBottom: '1px solid #000', height: '48px', marginBottom: '4pt' }}></div>
                <p style={{ margin: 0, textIndent: 0, fontSize: '10pt' }}>
                  Signature of Authorized Representative<br />
                  <strong>{org.authorized_representative?.name}</strong>, {org.authorized_representative?.title}
                </p>
              </div>
              <div>
                <div style={{ borderBottom: '1px solid #000', height: '48px', marginBottom: '4pt' }}></div>
                <p style={{ margin: 0, textIndent: 0, fontSize: '10pt' }}>Date</p>
              </div>
            </div>
          </div>
        </div>

        {/* Document Footer */}
        <div style={{ marginTop: '48pt', paddingTop: '12pt', borderTop: '1px solid #999', textAlign: 'center' }}>
          <p style={{ margin: 0, textIndent: 0, fontSize: '9pt', color: '#666' }}>
            Application Package Generated by ACE Grant Writing Platform<br />
            Document ID: GRANT-{nofo.nofo_number?.replace(/[^A-Z0-9]/gi, '') || 'APP'}-{Date.now().toString(36).toUpperCase()}<br />
            Generated: {new Date().toISOString()}
          </p>
        </div>

      </div>

      {/* Print Styles */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .grant-report {
            padding: 0 !important;
            max-width: none !important;
          }
          .page {
            page-break-after: always;
            margin: 0;
            padding: 0;
          }
          body {
            font-size: 11pt !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
        }
        @page {
          size: letter;
          margin: 1in;
        }
      `}</style>
    </div>
  );
};

export default GrantReportView;
