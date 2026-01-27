/**
 * Evidence Pack Generator
 * Creates tamper-evident PDF evidence packs for BD analysis
 */

import * as crypto from 'crypto';
import * as fs from 'fs/promises';
import * as path from 'path';

export interface EvidencePack {
  id: string;
  rfp_number: string;
  generated_at: string;
  analyst: string;
  opportunity_brief: any;
  competitive_landscape: any;
  capability_gaps: any;
  past_awards: any[];
  teaming_recommendations: any;
  win_probability: any;
  bd_decision_memo: string;
  screenshots: string[];
  raw_data: {
    sam_gov_html?: string;
    usa_spending_results?: any;
  };
  audit_trail: Array<{
    timestamp: string;
    action: string;
    agent: string;
    classification: string;
  }>;
  integrity_hash: string;
}

/**
 * Generate SHA-256 hash for tamper evidence
 */
function generateHash(data: string): string {
  return crypto.createHash('sha256').update(data).digest('hex');
}

/**
 * Create evidence pack from BD analysis results
 */
export async function createEvidencePack(
  rfpNumber: string,
  data: {
    opportunityBrief: any;
    competitiveLandscape: any;
    capabilityGaps: any;
    pastAwards: any[];
    teamingRec: any;
    winProbability: any;
    bdMemo: string;
    screenshots?: string[];
    rawData?: any;
    auditTrail?: Array<{
      timestamp: string;
      action: string;
      agent: string;
      classification: string;
    }>;
  }
): Promise<EvidencePack> {
  const packId = `EP-${rfpNumber}-${Date.now()}`;

  const pack: EvidencePack = {
    id: packId,
    rfp_number: rfpNumber,
    generated_at: new Date().toISOString(),
    analyst: 'ACE Governed BD Workforce',
    opportunity_brief: data.opportunityBrief,
    competitive_landscape: data.competitiveLandscape,
    capability_gaps: data.capabilityGaps,
    past_awards: data.pastAwards.slice(0, 50), // Limit to 50 for size
    teaming_recommendations: data.teamingRec,
    win_probability: data.winProbability,
    bd_decision_memo: data.bdMemo,
    screenshots: data.screenshots || [],
    raw_data: data.rawData || {},
    audit_trail: data.auditTrail || [],
    integrity_hash: ''
  };

  // Generate integrity hash AFTER all data is populated
  const packContent = JSON.stringify({
    ...pack,
    integrity_hash: '' // Exclude hash from hash calculation
  });
  pack.integrity_hash = generateHash(packContent);

  return pack;
}

/**
 * Verify evidence pack integrity
 */
export function verifyEvidencePack(pack: EvidencePack): {
  valid: boolean;
  message: string;
} {
  const storedHash = pack.integrity_hash;

  // Recalculate hash
  const packContent = JSON.stringify({
    ...pack,
    integrity_hash: ''
  });
  const calculatedHash = generateHash(packContent);

  if (storedHash === calculatedHash) {
    return {
      valid: true,
      message: 'Evidence pack integrity verified. No tampering detected.'
    };
  } else {
    return {
      valid: false,
      message: 'WARNING: Evidence pack has been modified. Hash mismatch detected.'
    };
  }
}

/**
 * Export evidence pack to JSON file
 */
export async function exportEvidencePackJSON(
  pack: EvidencePack,
  outputDir: string = './evidence-packs'
): Promise<string> {
  // Ensure output directory exists
  await fs.mkdir(outputDir, { recursive: true });

  const filename = `evidence-pack-${pack.rfp_number}-${Date.now()}.json`;
  const filepath = path.join(outputDir, filename);

  await fs.writeFile(filepath, JSON.stringify(pack, null, 2), 'utf-8');

  console.log(`[Evidence Pack] Saved to: ${filepath}`);
  return filepath;
}

/**
 * Generate human-readable HTML report from evidence pack
 */
export function generateHTMLReport(pack: EvidencePack): string {
  const verificationResult = verifyEvidencePack(pack);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Evidence Pack: ${pack.rfp_number}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
      background: #f5f7fa;
      color: #1a1a1a;
      line-height: 1.6;
      padding: 2rem;
    }
    .container { max-width: 1200px; margin: 0 auto; background: white; padding: 3rem; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
    header { border-bottom: 3px solid #3b82f6; padding-bottom: 1.5rem; margin-bottom: 2rem; }
    h1 { font-size: 2rem; color: #3b82f6; margin-bottom: 0.5rem; }
    h2 { font-size: 1.5rem; color: #1e40af; margin-top: 2rem; margin-bottom: 1rem; border-bottom: 2px solid #e5e7eb; padding-bottom: 0.5rem; }
    h3 { font-size: 1.25rem; color: #1e3a8a; margin-top: 1.5rem; margin-bottom: 0.75rem; }
    .metadata { display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem; margin-bottom: 2rem; padding: 1rem; background: #f9fafb; border-radius: 8px; }
    .metadata-item { display: flex; flex-direction: column; }
    .metadata-item label { font-size: 0.75rem; color: #666; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.25rem; }
    .metadata-item value { font-weight: 600; }
    .integrity-check { padding: 1rem; border-radius: 8px; margin-bottom: 2rem; }
    .integrity-valid { background: #d1fae5; border-left: 4px solid #10b981; color: #065f46; }
    .integrity-invalid { background: #fee2e2; border-left: 4px solid #ef4444; color: #991b1b; }
    .score-card { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1rem; margin: 1.5rem 0; }
    .score-item { background: #f9fafb; padding: 1rem; border-radius: 8px; text-align: center; }
    .score-item .label { font-size: 0.75rem; color: #666; text-transform: uppercase; margin-bottom: 0.5rem; }
    .score-item .value { font-size: 1.75rem; font-weight: 700; color: #3b82f6; }
    .recommendation { padding: 1.5rem; border-radius: 8px; margin: 1.5rem 0; font-size: 1.125rem; font-weight: 600; }
    .recommendation.strong-bid { background: #d1fae5; color: #065f46; border-left: 4px solid #10b981; }
    .recommendation.bid { background: #dbeafe; color: #1e40af; border-left: 4px solid #3b82f6; }
    .recommendation.caution { background: #fef3c7; color: #92400e; border-left: 4px solid #f59e0b; }
    .recommendation.no-bid { background: #fee2e2; color: #991b1b; border-left: 4px solid #ef4444; }
    table { width: 100%; border-collapse: collapse; margin: 1rem 0; }
    th, td { padding: 0.75rem; text-align: left; border-bottom: 1px solid #e5e7eb; }
    th { background: #f9fafb; font-weight: 600; color: #374151; }
    .competitor-list { display: grid; gap: 1rem; margin: 1rem 0; }
    .competitor-card { background: #f9fafb; padding: 1rem; border-radius: 8px; border-left: 4px solid #3b82f6; }
    .competitor-card .name { font-weight: 600; font-size: 1.125rem; margin-bottom: 0.5rem; }
    .competitor-card .stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.5rem; font-size: 0.875rem; color: #666; }
    .memo-content { background: #f9fafb; padding: 2rem; border-radius: 8px; margin: 1rem 0; white-space: pre-wrap; font-family: 'Courier New', monospace; font-size: 0.875rem; line-height: 1.8; }
    .audit-trail { margin: 1rem 0; }
    .audit-entry { padding: 0.75rem; border-left: 3px solid #e5e7eb; margin-bottom: 0.5rem; background: #f9fafb; font-size: 0.875rem; }
    .audit-entry.mandatory { border-left-color: #ef4444; }
    .audit-entry.advisory { border-left-color: #f59e0b; }
    .audit-entry.informational { border-left-color: #3b82f6; }
    footer { margin-top: 3rem; padding-top: 2rem; border-top: 1px solid #e5e7eb; text-align: center; color: #666; font-size: 0.875rem; }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1>Business Development Evidence Pack</h1>
      <p>RFP: ${pack.rfp_number} | ${pack.opportunity_brief?.title || 'Unknown Title'}</p>
    </header>

    <div class="integrity-check ${verificationResult.valid ? 'integrity-valid' : 'integrity-invalid'}">
      <strong>${verificationResult.valid ? '✓ INTEGRITY VERIFIED' : '⚠ INTEGRITY FAILURE'}</strong><br>
      ${verificationResult.message}<br>
      <small>Hash: ${pack.integrity_hash}</small>
    </div>

    <div class="metadata">
      <div class="metadata-item">
        <label>Evidence Pack ID</label>
        <value>${pack.id}</value>
      </div>
      <div class="metadata-item">
        <label>Generated</label>
        <value>${new Date(pack.generated_at).toLocaleString()}</value>
      </div>
      <div class="metadata-item">
        <label>Agency</label>
        <value>${pack.opportunity_brief?.agency || 'N/A'}</value>
      </div>
      <div class="metadata-item">
        <label>Response Deadline</label>
        <value>${pack.opportunity_brief?.deadline ? new Date(pack.opportunity_brief.deadline).toLocaleDateString() : 'N/A'}</value>
      </div>
    </div>

    <h2>Win Probability Assessment</h2>

    <div class="recommendation ${(pack.win_probability?.recommendation || 'NO_BID').toLowerCase().replace('_', '-')}">
      <strong>Recommendation:</strong> ${pack.win_probability?.recommendation || 'N/A'}<br>
      Win Probability: ${pack.win_probability?.win_probability || 0}%
    </div>

    <div class="score-card">
      <div class="score-item">
        <div class="label">Past Performance</div>
        <div class="value">${pack.win_probability?.score_breakdown?.past_performance_score || 0}</div>
        <small>/ 25 pts</small>
      </div>
      <div class="score-item">
        <div class="label">Technical Capability</div>
        <div class="value">${pack.win_probability?.score_breakdown?.technical_capability_score || 0}</div>
        <small>/ 25 pts</small>
      </div>
      <div class="score-item">
        <div class="label">Competitive Position</div>
        <div class="value">${pack.win_probability?.score_breakdown?.competitive_position_score || 0}</div>
        <small>/ 25 pts</small>
      </div>
      <div class="score-item">
        <div class="label">Price Competitiveness</div>
        <div class="value">${pack.win_probability?.score_breakdown?.price_competitiveness_score || 0}</div>
        <small>/ 25 pts</small>
      </div>
    </div>

    <h3>Rationale</h3>
    <p>${pack.win_probability?.rationale || 'No rationale provided'}</p>

    <h2>Opportunity Brief</h2>
    <table>
      <tr><th>Field</th><th>Value</th></tr>
      <tr><td>Solicitation Number</td><td>${pack.opportunity_brief?.solicitation_number || 'N/A'}</td></tr>
      <tr><td>Title</td><td>${pack.opportunity_brief?.title || 'N/A'}</td></tr>
      <tr><td>Agency</td><td>${pack.opportunity_brief?.agency || 'N/A'}</td></tr>
      <tr><td>NAICS Code</td><td>${pack.opportunity_brief?.naics_code || 'N/A'}</td></tr>
      <tr><td>Set-Aside Type</td><td>${pack.opportunity_brief?.set_aside_type || 'Unrestricted'}</td></tr>
      <tr><td>Estimated Value</td><td>$${pack.opportunity_brief?.estimated_value?.toLocaleString() || 'Not specified'}</td></tr>
      <tr><td>Deadline</td><td>${pack.opportunity_brief?.deadline ? new Date(pack.opportunity_brief.deadline).toLocaleString() : 'N/A'}</td></tr>
    </table>

    <h2>Competitive Landscape</h2>
    <p><strong>Market Concentration:</strong> ${pack.competitive_landscape?.market_concentration || 'Unknown'}</p>
    <p><strong>Incumbent Advantage:</strong> ${pack.competitive_landscape?.incumbent_advantage ? 'Yes' : 'No'}</p>

    <h3>Top Competitors</h3>
    <div class="competitor-list">
      ${(pack.competitive_landscape?.likely_competitors || []).slice(0, 5).map((comp: any) => `
        <div class="competitor-card">
          <div class="name">${comp.company_name}</div>
          <div class="stats">
            <div><strong>${comp.past_awards || 0}</strong> awards</div>
            <div><strong>$${((comp.total_value || 0) / 1000000).toFixed(2)}M</strong> total value</div>
            <div><strong>${comp.strength_assessment || 'unknown'}</strong> strength</div>
          </div>
        </div>
      `).join('')}
    </div>

    <h2>Capability Gap Analysis</h2>
    <p><strong>Overall Fit Score:</strong> ${pack.capability_gaps?.overall_fit_score || 0}/100</p>

    <h3>Gaps Identified</h3>
    ${(pack.capability_gaps?.gaps || []).length === 0 ? '<p>No significant gaps identified</p>' : `
      <table>
        <tr><th>Capability</th><th>Severity</th><th>Can Acquire</th><th>Teaming Needed</th></tr>
        ${(pack.capability_gaps?.gaps || []).map((gap: any) => `
          <tr>
            <td>${gap.capability}</td>
            <td>${gap.severity}</td>
            <td>${gap.can_acquire ? 'Yes' : 'No'}</td>
            <td>${gap.teaming_needed ? 'Yes' : 'No'}</td>
          </tr>
        `).join('')}
      </table>
    `}

    <h2>Past Awards Analysis</h2>
    <p><strong>Contracts Analyzed:</strong> ${pack.past_awards?.length || 0}</p>

    ${pack.past_awards && pack.past_awards.length > 0 ? `
      <h3>Sample Past Awards (Top 10 by Value)</h3>
      <table>
        <tr><th>Recipient</th><th>Award Amount</th><th>Date</th><th>Type</th></tr>
        ${pack.past_awards.slice(0, 10).map((award: any) => `
          <tr>
            <td>${award.recipient || award.recipient_name || 'Unknown'}</td>
            <td>$${(award.award_amount || 0).toLocaleString()}</td>
            <td>${award.award_date ? new Date(award.award_date).toLocaleDateString() : 'N/A'}</td>
            <td>${award.contract_type || 'N/A'}</td>
          </tr>
        `).join('')}
      </table>
    ` : '<p>No past awards data available</p>'}

    <h2>BD Decision Memo</h2>
    <div class="memo-content">${pack.bd_decision_memo || 'No memo generated'}</div>

    <h2>Audit Trail</h2>
    <div class="audit-trail">
      ${pack.audit_trail.length === 0 ? '<p>No audit trail available</p>' : pack.audit_trail.map(entry => `
        <div class="audit-entry ${entry.classification.toLowerCase()}">
          <strong>[${entry.classification}]</strong> ${entry.action}<br>
          <small>${new Date(entry.timestamp).toLocaleString()} | Agent: ${entry.agent}</small>
        </div>
      `).join('')}
    </div>

    <footer>
      <p><strong>ACE Governed BD Workforce</strong></p>
      <p>Generated: ${new Date(pack.generated_at).toLocaleString()}</p>
      <p>Evidence Pack ID: ${pack.id}</p>
      <p>Integrity Hash: ${pack.integrity_hash}</p>
    </footer>
  </div>
</body>
</html>`;
}

/**
 * Export evidence pack as HTML file
 */
export async function exportEvidencePackHTML(
  pack: EvidencePack,
  outputDir: string = './evidence-packs'
): Promise<string> {
  await fs.mkdir(outputDir, { recursive: true });

  const filename = `evidence-pack-${pack.rfp_number}-${Date.now()}.html`;
  const filepath = path.join(outputDir, filename);

  const html = generateHTMLReport(pack);
  await fs.writeFile(filepath, html, 'utf-8');

  console.log(`[Evidence Pack] HTML report saved to: ${filepath}`);
  return filepath;
}
