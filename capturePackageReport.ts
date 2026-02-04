/**
 * Capture Decision Package - Professional Report Generator
 *
 * Generates government-grade, submission-ready HTML/PDF reports.
 * No emojis, professional formatting, print-ready styling.
 *
 * Target: 15-25 pages when printed
 */

import { CaptureDecisionPackage, verifyCapturePackageIntegrity } from './captureDecisionPackage';
import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * Generate professional HTML report
 */
export function generateCapturePackageHTML(pkg: CaptureDecisionPackage): string {
  const integrity = verifyCapturePackageIntegrity(pkg);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Capture Decision Package - ${pkg.metadata.solicitationNumber}</title>
  <style>
    /* Print-ready professional styling */
    @page {
      size: letter;
      margin: 1in;
    }

    @media print {
      .no-print { display: none; }
      .page-break { page-break-before: always; }
      body { font-size: 11pt; }
    }

    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: 'Times New Roman', Times, serif;
      font-size: 12pt;
      line-height: 1.5;
      color: #000;
      background: #fff;
      max-width: 8.5in;
      margin: 0 auto;
      padding: 0.5in;
    }

    /* Headers */
    h1 {
      font-size: 18pt;
      font-weight: bold;
      text-align: center;
      margin-bottom: 0.25in;
      text-transform: uppercase;
      border-bottom: 2px solid #000;
      padding-bottom: 0.125in;
    }

    h2 {
      font-size: 14pt;
      font-weight: bold;
      margin-top: 0.375in;
      margin-bottom: 0.125in;
      text-transform: uppercase;
      border-bottom: 1px solid #000;
      padding-bottom: 0.0625in;
    }

    h3 {
      font-size: 12pt;
      font-weight: bold;
      margin-top: 0.25in;
      margin-bottom: 0.0625in;
    }

    /* Document metadata header */
    .doc-header {
      border: 1px solid #000;
      padding: 0.125in;
      margin-bottom: 0.25in;
      font-size: 10pt;
    }

    .doc-header table {
      width: 100%;
      border-collapse: collapse;
    }

    .doc-header td {
      padding: 0.0625in;
      border: none;
      vertical-align: top;
    }

    .doc-header .label {
      font-weight: bold;
      width: 35%;
    }

    /* Classification banner */
    .classification-banner {
      background: #fff;
      border: 2px solid #000;
      text-align: center;
      font-weight: bold;
      font-size: 14pt;
      padding: 0.125in;
      margin-bottom: 0.25in;
    }

    /* Executive summary box */
    .exec-summary {
      border: 2px solid #000;
      padding: 0.25in;
      margin: 0.25in 0;
      background: #f5f5f5;
    }

    .exec-summary .decision {
      font-size: 16pt;
      font-weight: bold;
      text-align: center;
      padding: 0.125in;
      margin-bottom: 0.125in;
    }

    .exec-summary .decision.bid { background: #d4edda; border: 1px solid #28a745; }
    .exec-summary .decision.no-bid { background: #f8d7da; border: 1px solid #dc3545; }
    .exec-summary .decision.conditional { background: #fff3cd; border: 1px solid #ffc107; }

    /* Tables */
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 0.125in 0;
      font-size: 10pt;
    }

    th, td {
      border: 1px solid #000;
      padding: 0.0625in;
      text-align: left;
      vertical-align: top;
    }

    th {
      background: #e9ecef;
      font-weight: bold;
    }

    /* Score tables */
    .score-table td.score {
      text-align: center;
      font-weight: bold;
    }

    .score-table .total-row {
      background: #e9ecef;
      font-weight: bold;
    }

    /* Risk matrix colors */
    .risk-high { background: #f8d7da; }
    .risk-medium { background: #fff3cd; }
    .risk-low { background: #d4edda; }

    /* Lists */
    ul, ol {
      margin-left: 0.375in;
      margin-top: 0.0625in;
      margin-bottom: 0.0625in;
    }

    li {
      margin-bottom: 0.0625in;
    }

    /* Paragraphs */
    p {
      margin-bottom: 0.125in;
      text-align: justify;
    }

    /* Footer */
    .doc-footer {
      margin-top: 0.5in;
      padding-top: 0.125in;
      border-top: 1px solid #000;
      font-size: 9pt;
      text-align: center;
    }

    /* Integrity verification */
    .integrity-box {
      border: 1px solid #000;
      padding: 0.125in;
      margin: 0.25in 0;
      font-size: 9pt;
    }

    .integrity-valid { background: #d4edda; }
    .integrity-invalid { background: #f8d7da; }

    /* Section numbering */
    .section-num {
      font-weight: bold;
      margin-right: 0.125in;
    }

    /* Approval block */
    .approval-block {
      margin-top: 0.5in;
      border: 1px solid #000;
    }

    .approval-block table {
      margin: 0;
    }

    .signature-line {
      border-bottom: 1px solid #000;
      height: 0.5in;
    }
  </style>
</head>
<body>

  <!-- Classification Banner -->
  <div class="classification-banner">
    ${pkg.metadata.classificationLevel}
  </div>

  <!-- Document Header -->
  <h1>CAPTURE DECISION PACKAGE</h1>

  <div class="doc-header">
    <table>
      <tr>
        <td class="label">Document ID:</td>
        <td>${pkg.metadata.packageId}</td>
        <td class="label">Classification:</td>
        <td>${pkg.metadata.classificationLevel}</td>
      </tr>
      <tr>
        <td class="label">Solicitation Number:</td>
        <td>${pkg.metadata.solicitationNumber}</td>
        <td class="label">Version:</td>
        <td>${pkg.metadata.versionNumber}</td>
      </tr>
      <tr>
        <td class="label">Opportunity Title:</td>
        <td colspan="3">${pkg.metadata.opportunityTitle}</td>
      </tr>
      <tr>
        <td class="label">Prepared Date:</td>
        <td>${new Date(pkg.metadata.generatedDate).toLocaleDateString()}</td>
        <td class="label">Status:</td>
        <td>${pkg.metadata.approvalStatus}</td>
      </tr>
    </table>
  </div>

  <p style="font-size: 9pt; font-style: italic; margin-bottom: 0.25in;">
    ${pkg.metadata.distributionStatement}
  </p>

  <!-- Table of Contents -->
  <h2>TABLE OF CONTENTS</h2>
  <ol style="margin-left: 0.5in;">
    <li>Executive Summary</li>
    <li>Opportunity Overview</li>
    <li>Customer Analysis</li>
    <li>Competitive Assessment</li>
    <li>Solution Approach</li>
    <li>Capability Analysis</li>
    <li>Teaming Strategy</li>
    <li>Pricing Strategy</li>
    <li>Win Probability Assessment</li>
    <li>Risk Assessment</li>
    <li>Resource Requirements</li>
    <li>Recommendation and Next Steps</li>
    <li>Appendices</li>
  </ol>

  <div class="page-break"></div>

  <!-- Section 1: Executive Summary -->
  <h2><span class="section-num">1.</span> EXECUTIVE SUMMARY</h2>

  <div class="exec-summary">
    <div class="decision ${pkg.executiveSummary.recommendation.toLowerCase().replace('_', '-')}">
      RECOMMENDATION: ${pkg.executiveSummary.recommendation}
    </div>

    <table>
      <tr>
        <td class="label" style="width: 40%; border: none;">Win Probability:</td>
        <td style="border: none;"><strong>${Math.round(pkg.executiveSummary.winProbability)}%</strong></td>
      </tr>
      <tr>
        <td class="label" style="border: none;">Estimated Value:</td>
        <td style="border: none;">$${pkg.executiveSummary.estimatedValue.toLocaleString()}</td>
      </tr>
      <tr>
        <td class="label" style="border: none;">Response Deadline:</td>
        <td style="border: none;">${pkg.executiveSummary.responseDeadline ? new Date(pkg.executiveSummary.responseDeadline).toLocaleDateString() : 'TBD'}</td>
      </tr>
      <tr>
        <td class="label" style="border: none;">Resource Commitment:</td>
        <td style="border: none;">${pkg.executiveSummary.resourceCommitment}</td>
      </tr>
    </table>
  </div>

  <h3>Rationale</h3>
  <p>${pkg.executiveSummary.executiveRationale}</p>

  <h3>Key Strengths</h3>
  <ul>
    ${pkg.executiveSummary.keyStrengths.map(s => `<li>${s}</li>`).join('\n    ')}
    ${pkg.executiveSummary.keyStrengths.length === 0 ? '<li>No significant strengths identified</li>' : ''}
  </ul>

  <h3>Critical Risks</h3>
  <ul>
    ${pkg.executiveSummary.criticalRisks.map(r => `<li>${r}</li>`).join('\n    ')}
    ${pkg.executiveSummary.criticalRisks.length === 0 ? '<li>No critical risks identified</li>' : ''}
  </ul>

  <div class="page-break"></div>

  <!-- Section 2: Opportunity Overview -->
  <h2><span class="section-num">2.</span> OPPORTUNITY OVERVIEW</h2>

  <table>
    <tr><th colspan="2">Opportunity Details</th></tr>
    <tr><td class="label">Solicitation Number</td><td>${pkg.opportunityOverview.solicitationNumber}</td></tr>
    <tr><td class="label">Title</td><td>${pkg.opportunityOverview.title}</td></tr>
    <tr><td class="label">Issuing Agency</td><td>${pkg.opportunityOverview.issuingAgency}</td></tr>
    <tr><td class="label">Contracting Office</td><td>${pkg.opportunityOverview.contractingOffice}</td></tr>
    <tr><td class="label">NAICS Code</td><td>${pkg.opportunityOverview.naicsCode} - ${pkg.opportunityOverview.naicsDescription}</td></tr>
    <tr><td class="label">Set-Aside Type</td><td>${pkg.opportunityOverview.setAsideType}</td></tr>
    <tr><td class="label">Contract Type</td><td>${pkg.opportunityOverview.contractType}</td></tr>
    <tr><td class="label">Place of Performance</td><td>${pkg.opportunityOverview.placeOfPerformance}</td></tr>
    <tr><td class="label">Period of Performance</td><td>${pkg.opportunityOverview.periodOfPerformance}</td></tr>
    <tr><td class="label">Estimated Value</td><td>$${pkg.opportunityOverview.estimatedValue.toLocaleString()}</td></tr>
    <tr><td class="label">Response Deadline</td><td>${pkg.opportunityOverview.responseDeadline ? new Date(pkg.opportunityOverview.responseDeadline).toLocaleString() : 'TBD'}</td></tr>
    <tr><td class="label">Questions Deadline</td><td>${pkg.opportunityOverview.questionsDeadline}</td></tr>
  </table>

  <h3>Requirements Summary</h3>
  <p>${pkg.opportunityOverview.requirementsSummary}</p>

  <h3>Evaluation Criteria</h3>
  <ol>
    ${pkg.opportunityOverview.evaluationCriteria.map(c => `<li>${c}</li>`).join('\n    ')}
  </ol>

  <div class="page-break"></div>

  <!-- Section 3: Customer Analysis -->
  <h2><span class="section-num">3.</span> CUSTOMER ANALYSIS</h2>

  <h3>Agency Mission and Priorities</h3>
  <p>${pkg.customerAnalysis.agencyMission}</p>

  <h3>Agency Priorities</h3>
  <ul>
    ${pkg.customerAnalysis.agencyPriorities.map(p => `<li>${p}</li>`).join('\n    ')}
  </ul>

  <h3>Procurement History</h3>
  <p>${pkg.customerAnalysis.procurementHistory}</p>

  ${pkg.customerAnalysis.incumbentInfo ? `
  <h3>Incumbent Information</h3>
  <table>
    <tr><td class="label">Contractor</td><td>${pkg.customerAnalysis.incumbentInfo.contractorName}</td></tr>
    <tr><td class="label">Contract Number</td><td>${pkg.customerAnalysis.incumbentInfo.contractNumber}</td></tr>
    <tr><td class="label">Contract Value</td><td>$${pkg.customerAnalysis.incumbentInfo.contractValue.toLocaleString()}</td></tr>
    <tr><td class="label">Performance Period</td><td>${pkg.customerAnalysis.incumbentInfo.performancePeriod}</td></tr>
    <tr><td class="label">Performance Rating</td><td>${pkg.customerAnalysis.incumbentInfo.performanceRating}</td></tr>
  </table>
  ` : '<p>No incumbent information available.</p>'}

  <h3>Customer Hot Buttons</h3>
  <ul>
    ${pkg.customerAnalysis.customerHotButtons.map(h => `<li>${h}</li>`).join('\n    ')}
  </ul>

  <div class="page-break"></div>

  <!-- Section 4: Competitive Assessment -->
  <h2><span class="section-num">4.</span> COMPETITIVE ASSESSMENT</h2>

  <table>
    <tr>
      <td class="label">Market Concentration</td>
      <td>${pkg.competitiveAssessment.marketConcentration}</td>
    </tr>
    <tr>
      <td class="label">Total Competitors Identified</td>
      <td>${pkg.competitiveAssessment.totalCompetitorsIdentified}</td>
    </tr>
    <tr>
      <td class="label">Incumbent Advantage</td>
      <td>${pkg.competitiveAssessment.incumbentAdvantage ? 'Yes - significant advantage' : 'No - open competition'}</td>
    </tr>
  </table>

  <h3>Competitor Profiles</h3>
  <table>
    <tr>
      <th>Company</th>
      <th>Strength</th>
      <th>Past Awards</th>
      <th>Total Value</th>
      <th>Threat Assessment</th>
    </tr>
    ${pkg.competitiveAssessment.competitorProfiles.map(c => `
    <tr>
      <td>${c.companyName}</td>
      <td>${c.strengthRating}</td>
      <td>${c.pastAwardsCount}</td>
      <td>$${c.totalAwardValue.toLocaleString()}</td>
      <td>${c.threatAssessment}</td>
    </tr>
    `).join('')}
  </table>

  <h3>Competitive Position</h3>
  <p>${pkg.competitiveAssessment.ourCompetitivePosition}</p>

  <h3>Counter-Positioning Strategies</h3>
  <table>
    <tr>
      <th>Competitor</th>
      <th>Vulnerabilities</th>
      <th>Counter-Positioning</th>
    </tr>
    ${pkg.competitiveAssessment.ghostingStrategies.map(g => `
    <tr>
      <td>${g.competitor}</td>
      <td>${g.vulnerabilities.join(', ')}</td>
      <td>${g.counterPositioning}</td>
    </tr>
    `).join('')}
  </table>

  <div class="page-break"></div>

  <!-- Section 5: Solution Approach -->
  <h2><span class="section-num">5.</span> SOLUTION APPROACH</h2>

  <h3>Technical Approach</h3>
  <p>${pkg.solutionApproach.technicalApproach}</p>

  <h3>Management Approach</h3>
  <p>${pkg.solutionApproach.managementApproach}</p>

  <h3>Key Discriminators</h3>
  <ul>
    ${pkg.solutionApproach.discriminators.map(d => `<li>${d}</li>`).join('\n    ')}
  </ul>

  <div class="page-break"></div>

  <!-- Section 6: Capability Analysis -->
  <h2><span class="section-num">6.</span> CAPABILITY ANALYSIS</h2>

  <p><strong>Overall Fit Score: ${pkg.capabilityAnalysis.overallFitScore}/100</strong></p>

  <h3>Capability Gaps</h3>
  ${pkg.capabilityAnalysis.gaps.length > 0 ? `
  <table>
    <tr>
      <th>Capability</th>
      <th>Severity</th>
      <th>Mitigation Strategy</th>
      <th>Acquisition Path</th>
      <th>Timeline</th>
    </tr>
    ${pkg.capabilityAnalysis.gaps.map(g => `
    <tr class="risk-${g.severity.toLowerCase()}">
      <td>${g.capability}</td>
      <td>${g.severity}</td>
      <td>${g.mitigationStrategy}</td>
      <td>${g.acquisitionPath}</td>
      <td>${g.timeToAcquire}</td>
    </tr>
    `).join('')}
  </table>
  ` : '<p>No significant capability gaps identified.</p>'}

  <div class="page-break"></div>

  <!-- Section 7: Teaming Strategy -->
  <h2><span class="section-num">7.</span> TEAMING STRATEGY</h2>

  <p><strong>Recommended Strategy: ${pkg.teamingStrategy.strategyType}</strong></p>
  <p>${pkg.teamingStrategy.rationale}</p>

  ${pkg.teamingStrategy.proposedTeam.length > 0 ? `
  <h3>Proposed Team</h3>
  <table>
    <tr>
      <th>Company</th>
      <th>Role</th>
      <th>Work Share</th>
      <th>Capabilities</th>
      <th>Status</th>
    </tr>
    ${pkg.teamingStrategy.proposedTeam.map(t => `
    <tr>
      <td>${t.companyName}</td>
      <td>${t.role}</td>
      <td>${t.workShare}%</td>
      <td>${t.capsFilled.join(', ')}</td>
      <td>${t.teaAgreementStatus}</td>
    </tr>
    `).join('')}
  </table>
  ` : '<p>No teaming required for this opportunity.</p>'}

  <h3>Team Strengths</h3>
  <ul>
    ${pkg.teamingStrategy.teamStrengths.map(s => `<li>${s}</li>`).join('\n    ')}
  </ul>

  <h3>Team Risks</h3>
  <ul>
    ${pkg.teamingStrategy.teamRisks.map(r => `<li>${r}</li>`).join('\n    ')}
  </ul>

  <div class="page-break"></div>

  <!-- Section 8: Pricing Strategy -->
  <h2><span class="section-num">8.</span> PRICING STRATEGY</h2>

  <table>
    <tr><td class="label">Contract Type</td><td>${pkg.pricingStrategy.contractType}</td></tr>
    <tr><td class="label">Pricing Approach</td><td>${pkg.pricingStrategy.pricingApproach}</td></tr>
  </table>

  <h3>Competitive Price Range</h3>
  <table>
    <tr>
      <th>Metric</th>
      <th>Value</th>
    </tr>
    <tr><td>Low</td><td>$${pkg.pricingStrategy.competitiveRange.low.toLocaleString()}</td></tr>
    <tr><td>Median</td><td>$${pkg.pricingStrategy.competitiveRange.median.toLocaleString()}</td></tr>
    <tr><td>High</td><td>$${pkg.pricingStrategy.competitiveRange.high.toLocaleString()}</td></tr>
    <tr><td><strong>Target Price</strong></td><td><strong>$${pkg.pricingStrategy.targetPrice.toLocaleString()}</strong></td></tr>
    <tr><td><strong>Price to Win</strong></td><td><strong>$${pkg.pricingStrategy.priceToWin.toLocaleString()}</strong></td></tr>
  </table>

  <h3>Cost Drivers</h3>
  <ul>
    ${pkg.pricingStrategy.costDrivers.map(c => `<li>${c}</li>`).join('\n    ')}
  </ul>

  <div class="page-break"></div>

  <!-- Section 9: Win Probability Assessment -->
  <h2><span class="section-num">9.</span> WIN PROBABILITY ASSESSMENT</h2>

  <div class="exec-summary">
    <div class="decision ${pkg.winProbability.overallProbability >= 50 ? 'bid' : pkg.winProbability.overallProbability >= 30 ? 'conditional' : 'no-bid'}">
      WIN PROBABILITY: ${Math.round(pkg.winProbability.overallProbability)}%
    </div>
    <p style="text-align: center;"><strong>Confidence Level: ${pkg.winProbability.confidenceLevel}</strong></p>
  </div>

  <h3>Methodology</h3>
  <p>${pkg.winProbability.methodology}</p>

  <h3>Score Breakdown</h3>
  <table class="score-table">
    <tr>
      <th>Factor</th>
      <th>Score</th>
      <th>Max</th>
      <th>Rationale</th>
    </tr>
    <tr>
      <td>Past Performance</td>
      <td class="score">${pkg.winProbability.scoreBreakdown.pastPerformance.score}</td>
      <td class="score">${pkg.winProbability.scoreBreakdown.pastPerformance.maxScore}</td>
      <td>${pkg.winProbability.scoreBreakdown.pastPerformance.rationale}</td>
    </tr>
    <tr>
      <td>Technical Capability</td>
      <td class="score">${pkg.winProbability.scoreBreakdown.technicalCapability.score}</td>
      <td class="score">${pkg.winProbability.scoreBreakdown.technicalCapability.maxScore}</td>
      <td>${pkg.winProbability.scoreBreakdown.technicalCapability.rationale}</td>
    </tr>
    <tr>
      <td>Competitive Position</td>
      <td class="score">${pkg.winProbability.scoreBreakdown.competitivePosition.score}</td>
      <td class="score">${pkg.winProbability.scoreBreakdown.competitivePosition.maxScore}</td>
      <td>${pkg.winProbability.scoreBreakdown.competitivePosition.rationale}</td>
    </tr>
    <tr>
      <td>Price Competitiveness</td>
      <td class="score">${pkg.winProbability.scoreBreakdown.priceCompetitiveness.score}</td>
      <td class="score">${pkg.winProbability.scoreBreakdown.priceCompetitiveness.maxScore}</td>
      <td>${pkg.winProbability.scoreBreakdown.priceCompetitiveness.rationale}</td>
    </tr>
    <tr class="total-row">
      <td><strong>TOTAL</strong></td>
      <td class="score"><strong>${pkg.winProbability.overallProbability}</strong></td>
      <td class="score"><strong>100</strong></td>
      <td></td>
    </tr>
  </table>

  <h3>Sensitivity Analysis</h3>
  <p>${pkg.winProbability.sensitivityAnalysis}</p>

  <div class="page-break"></div>

  <!-- Section 10: Risk Assessment -->
  <h2><span class="section-num">10.</span> RISK ASSESSMENT</h2>

  <p><strong>Overall Risk Rating: ${pkg.riskAssessment.overallRiskRating}</strong></p>

  <h3>Risk Matrix</h3>
  <table>
    <tr>
      <th>ID</th>
      <th>Category</th>
      <th>Description</th>
      <th>L</th>
      <th>I</th>
      <th>Score</th>
      <th>Mitigation</th>
      <th>Owner</th>
    </tr>
    ${pkg.riskAssessment.riskMatrix.map(r => `
    <tr class="risk-${r.riskScore >= 6 ? 'high' : r.riskScore >= 3 ? 'medium' : 'low'}">
      <td>${r.riskId}</td>
      <td>${r.category}</td>
      <td>${r.description}</td>
      <td>${r.likelihood.charAt(0)}</td>
      <td>${r.impact.charAt(0)}</td>
      <td>${r.riskScore}</td>
      <td>${r.mitigationStrategy}</td>
      <td>${r.owner}</td>
    </tr>
    `).join('')}
  </table>
  <p style="font-size: 9pt;">L = Likelihood, I = Impact. Score: H/H=9, H/M or M/H=6, M/M=4, L/M or M/L=2, L/L=1</p>

  ${pkg.riskAssessment.showstoppers.length > 0 ? `
  <h3>Showstoppers</h3>
  <ul>
    ${pkg.riskAssessment.showstoppers.map(s => `<li style="color: #dc3545; font-weight: bold;">${s}</li>`).join('\n    ')}
  </ul>
  ` : ''}

  <div class="page-break"></div>

  <!-- Section 11: Resource Requirements -->
  <h2><span class="section-num">11.</span> RESOURCE REQUIREMENTS</h2>

  <table>
    <tr><td class="label">Estimated Bid Cost</td><td>$${pkg.resourceRequirements.bidCost.toLocaleString()}</td></tr>
    <tr><td class="label">Total Investment Required</td><td>$${pkg.resourceRequirements.investmentRequired.toLocaleString()}</td></tr>
  </table>

  <h3>Bid Schedule</h3>
  <table>
    <tr>
      <th>Milestone</th>
      <th>Date</th>
      <th>Owner</th>
    </tr>
    ${pkg.resourceRequirements.bidSchedule.map(m => `
    <tr>
      <td>${m.milestone}</td>
      <td>${m.date}</td>
      <td>${m.owner}</td>
    </tr>
    `).join('')}
  </table>

  <h3>Key Personnel Required</h3>
  <ul>
    ${pkg.resourceRequirements.keyPersonnelRequired.map(p => `<li>${p}</li>`).join('\n    ')}
  </ul>

  <h3>Opportunity Cost</h3>
  <p>${pkg.resourceRequirements.opportunityCost}</p>

  <div class="page-break"></div>

  <!-- Section 12: Recommendation and Next Steps -->
  <h2><span class="section-num">12.</span> RECOMMENDATION AND NEXT STEPS</h2>

  <div class="exec-summary">
    <div class="decision ${pkg.recommendation.decision.toLowerCase().replace('_', '-')}">
      RECOMMENDATION: ${pkg.recommendation.decision}
    </div>
  </div>

  ${pkg.recommendation.conditions.length > 0 ? `
  <h3>Conditions for Proceeding</h3>
  <ol>
    ${pkg.recommendation.conditions.map(c => `<li>${c}</li>`).join('\n    ')}
  </ol>
  ` : ''}

  <h3>Rationale</h3>
  <p>${pkg.recommendation.rationale}</p>

  <h3>Next Steps</h3>
  <table>
    <tr>
      <th>Priority</th>
      <th>Action</th>
      <th>Owner</th>
      <th>Due Date</th>
    </tr>
    ${pkg.recommendation.nextSteps.map(s => `
    <tr>
      <td>${s.priority}</td>
      <td>${s.action}</td>
      <td>${s.owner}</td>
      <td>${s.dueDate}</td>
    </tr>
    `).join('')}
  </table>

  <h3>Decision Authority</h3>
  <p><strong>${pkg.recommendation.decisionAuthority}</strong></p>
  <p>Decision required by: <strong>${pkg.recommendation.decisionDeadline}</strong></p>

  <!-- Approval Block -->
  <div class="approval-block">
    <table>
      <tr><th colspan="4">APPROVAL SIGNATURES</th></tr>
      <tr>
        <td style="width: 25%;" class="label">Capture Manager</td>
        <td style="width: 35%;"><div class="signature-line"></div></td>
        <td style="width: 15%;" class="label">Date</td>
        <td style="width: 25%;"><div class="signature-line"></div></td>
      </tr>
      <tr>
        <td class="label">BD Director</td>
        <td><div class="signature-line"></div></td>
        <td class="label">Date</td>
        <td><div class="signature-line"></div></td>
      </tr>
      <tr>
        <td class="label">Executive Sponsor</td>
        <td><div class="signature-line"></div></td>
        <td class="label">Date</td>
        <td><div class="signature-line"></div></td>
      </tr>
    </table>
  </div>

  <div class="page-break"></div>

  <!-- Section 13: Appendices -->
  <h2><span class="section-num">13.</span> APPENDICES</h2>

  <h3>Appendix A: Data Sources</h3>
  <ul>
    ${pkg.appendices.rawDataSources.map(s => `<li>${s}</li>`).join('\n    ')}
  </ul>

  <h3>Appendix B: Past Award Data Summary</h3>
  <p>Total past awards analyzed: ${pkg.appendices.pastAwardData.length}</p>
  ${pkg.appendices.pastAwardData.length > 0 ? `
  <table>
    <tr>
      <th>Recipient</th>
      <th>Amount</th>
      <th>Date</th>
    </tr>
    ${pkg.appendices.pastAwardData.slice(0, 10).map((a: any) => `
    <tr>
      <td>${a.recipient || a.recipient_name || 'Unknown'}</td>
      <td>$${(a.award_amount || 0).toLocaleString()}</td>
      <td>${a.award_date ? new Date(a.award_date).toLocaleDateString() : 'N/A'}</td>
    </tr>
    `).join('')}
  </table>
  <p style="font-size: 9pt; font-style: italic;">Showing 10 of ${pkg.appendices.pastAwardData.length} awards. Full data available in JSON export.</p>
  ` : '<p>No past award data available.</p>'}

  <!-- Document Integrity -->
  <div class="integrity-box ${integrity.valid ? 'integrity-valid' : 'integrity-invalid'}">
    <strong>DOCUMENT INTEGRITY</strong><br>
    ${integrity.message}<br>
    <small>Hash: ${pkg.integrityHash}</small>
  </div>

  <!-- Governance Trail -->
  <h3>Governance Trail</h3>
  <table>
    <tr><td class="label">Created</td><td>${new Date(pkg.governanceTrail.createdAt).toLocaleString()}</td></tr>
    <tr><td class="label">Created By</td><td>${pkg.governanceTrail.createdBy}</td></tr>
    <tr><td class="label">Data Sources Verified</td><td>${pkg.governanceTrail.dataSourcesVerified ? 'Yes' : 'No'}</td></tr>
    <tr><td class="label">Policies Applied</td><td>${pkg.governanceTrail.policiesApplied.join(', ')}</td></tr>
  </table>

  <!-- Footer -->
  <div class="doc-footer">
    <p><strong>CAPTURE DECISION PACKAGE</strong></p>
    <p>${pkg.metadata.solicitationNumber} | ${pkg.metadata.packageId}</p>
    <p>Generated: ${new Date(pkg.metadata.generatedDate).toLocaleString()}</p>
    <p style="margin-top: 0.125in;">${pkg.metadata.classificationLevel}</p>
  </div>

</body>
</html>`;
}

/**
 * Export Capture Decision Package as HTML file
 */
export async function exportCapturePackageHTML(
  pkg: CaptureDecisionPackage,
  outputDir: string = './capture-packages'
): Promise<string> {
  await fs.mkdir(outputDir, { recursive: true });

  const filename = `capture-decision-package-${pkg.metadata.solicitationNumber}-${Date.now()}.html`;
  const filepath = path.join(outputDir, filename);

  const html = generateCapturePackageHTML(pkg);
  await fs.writeFile(filepath, html, 'utf-8');

  console.log(`[Capture Package] HTML report saved to: ${filepath}`);
  return filepath;
}
