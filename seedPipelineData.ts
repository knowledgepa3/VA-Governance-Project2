/**
 * Seed Pipeline Data - Pre-populate the BD Pipeline with real opportunities
 *
 * This file contains seed data for the capture pipeline, including
 * real opportunities from SAM.gov that match ACE Consulting's capabilities.
 *
 * Usage:
 * 1. Import in main app to auto-seed on first load
 * 2. Run seedPipeline() to manually add opportunities
 */

import {
  PipelineStage,
  PipelineOpportunity,
  PipelineState,
  createPipelineOpportunity,
  savePipeline,
  loadPipeline
} from './capturePipeline';

/**
 * Pre-seeded opportunities from SAM.gov matching ACE capabilities
 */
export const SEED_OPPORTUNITIES = [
  {
    // VA VISN Radiology AI - REAL opportunity from SAM.gov
    rfpNumber: '36C24126Q0237',
    title: 'VISN Radiology Artificial Intelligence',
    agency: 'Department of Veterans Affairs',
    description: 'VA seeking AI radiology platform with ATO capability. Perfect match for ACE ATO/security expertise + AI governance.',
    estimatedValue: 500000,
    deadline: new Date('2026-02-13T10:00:00-05:00'),
    naicsCode: '541512',
    setAsideType: 'Total Small Business',
    filterScore: 85,
    soloSafe: false, // Likely needs teaming for FDA-approved AI vendor
    riskFlags: ['Teaming may be required for clinical AI component'],
    uiLink: 'https://sam.gov/opp/36C24126Q0237/view',
    // ACE-specific analysis
    aceMatchAnalysis: {
      relevantPastPerformance: ['pp-002 Radial Solutions ISSO', 'pp-005 ACE AI Governance'],
      keyDiscriminators: [
        'Direct ATO/Authority to Operate experience',
        'ISSO-level security compliance expertise',
        'AI governance framework development'
      ],
      recommendedApproach: 'Position as security/ATO compliance lead with AI governance expertise. Partner with FDA-approved AI vendor.',
      teamingOpportunities: [
        'FDA-approved AI radiology vendor',
        'VA PACS integration specialist'
      ]
    }
  }
];

/**
 * Convert seed data to pipeline opportunity format
 */
function convertSeedToOpportunity(seed: typeof SEED_OPPORTUNITIES[0]): PipelineOpportunity {
  const now = new Date();
  return {
    id: `pipe-seed-${seed.rfpNumber}`,
    rfpNumber: seed.rfpNumber,
    title: seed.title,
    agency: seed.agency,
    estimatedValue: seed.estimatedValue,
    deadline: seed.deadline,
    stage: PipelineStage.IDENTIFIED,
    addedDate: now,
    lastUpdated: now,
    stageHistory: [{
      stage: PipelineStage.IDENTIFIED,
      date: now,
      notes: 'Seeded from SAM.gov - High priority VA AI opportunity'
    }],
    matchScore: seed.filterScore,
    soloSafe: seed.soloSafe,
    riskFlags: seed.riskFlags,
    originalData: seed,
    milestones: [
      {
        name: 'Sources Sought Response Due',
        dueDate: seed.deadline,
        completed: false
      },
      {
        name: 'Draft Response',
        dueDate: new Date(seed.deadline.getTime() - 3 * 24 * 60 * 60 * 1000), // 3 days before
        completed: false
      },
      {
        name: 'Identify Teaming Partners',
        dueDate: new Date(seed.deadline.getTime() - 5 * 24 * 60 * 60 * 1000), // 5 days before
        completed: false
      }
    ],
    notes: `
ACE Match Score: ${seed.filterScore}%

Key Requirements:
- FDA-approved AI radiology platform
- Authority to Operate (ATO) with VA systems
- VHA Handbook 6500.6 compliance
- Integration with VA PACS, Vista Imaging, EMHR

ACE Strengths:
- Direct ATO/RMF experience (Radial Solutions)
- AI Governance expertise
- Federal security compliance background

Strategy: Position as security/ATO lead, partner with clinical AI vendor
    `.trim()
  };
}

/**
 * Seed the pipeline with opportunities (merges with existing, no duplicates)
 */
export function seedPipeline(): { added: number; skipped: number } {
  const existingPipeline = loadPipeline();
  const existingRfps = new Set(existingPipeline.opportunities.map(o => o.rfpNumber));

  let added = 0;
  let skipped = 0;

  const newOpportunities: PipelineOpportunity[] = [];

  for (const seed of SEED_OPPORTUNITIES) {
    if (existingRfps.has(seed.rfpNumber)) {
      skipped++;
      console.log(`[Seed] Skipping ${seed.rfpNumber} - already in pipeline`);
    } else {
      const opp = convertSeedToOpportunity(seed);
      newOpportunities.push(opp);
      added++;
      console.log(`[Seed] Adding ${seed.rfpNumber} - ${seed.title}`);
    }
  }

  if (newOpportunities.length > 0) {
    const updatedPipeline: PipelineState = {
      opportunities: [...existingPipeline.opportunities, ...newOpportunities],
      lastUpdated: new Date()
    };
    savePipeline(updatedPipeline);
    console.log(`[Seed] Pipeline updated: ${added} added, ${skipped} skipped`);
  }

  return { added, skipped };
}

/**
 * Check if pipeline has been seeded
 */
export function isPipelineSeeded(): boolean {
  const pipeline = loadPipeline();
  return SEED_OPPORTUNITIES.some(seed =>
    pipeline.opportunities.some(o => o.rfpNumber === seed.rfpNumber)
  );
}

/**
 * Get the VA VISN opportunity data (for programmatic access)
 */
export function getVAVisnOpportunity() {
  return SEED_OPPORTUNITIES.find(o => o.rfpNumber === '36C24126Q0237');
}

// Browser console helper - paste this in console to seed
export const BROWSER_SEED_SCRIPT = `
// Run this in browser console to seed the VA VISN opportunity
(function() {
  const STORAGE_KEY = 'ace_capture_pipeline';
  const existing = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{"opportunities":[],"lastUpdated":""}');

  if (existing.opportunities.some(o => o.rfpNumber === '36C24126Q0237')) {
    console.log('VA VISN opportunity already in pipeline');
    return;
  }

  const vaOpp = {
    id: 'pipe-seed-36C24126Q0237',
    rfpNumber: '36C24126Q0237',
    title: 'VISN Radiology Artificial Intelligence',
    agency: 'Department of Veterans Affairs',
    estimatedValue: 500000,
    deadline: '2026-02-13T15:00:00.000Z',
    stage: 'IDENTIFIED',
    addedDate: new Date().toISOString(),
    lastUpdated: new Date().toISOString(),
    stageHistory: [{
      stage: 'IDENTIFIED',
      date: new Date().toISOString(),
      notes: 'Seeded from SAM.gov - High priority VA AI opportunity'
    }],
    matchScore: 85,
    soloSafe: false,
    riskFlags: ['Teaming may be required for clinical AI component'],
    milestones: [
      { name: 'Sources Sought Response Due', dueDate: '2026-02-13T15:00:00.000Z', completed: false },
      { name: 'Draft Response', dueDate: '2026-02-10T15:00:00.000Z', completed: false },
      { name: 'Identify Teaming Partners', dueDate: '2026-02-08T15:00:00.000Z', completed: false }
    ],
    notes: 'ACE Match: 85% - ATO expertise + AI governance. Strategy: Partner with FDA-approved AI vendor.'
  };

  existing.opportunities.push(vaOpp);
  existing.lastUpdated = new Date().toISOString();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));

  console.log('VA VISN Radiology AI opportunity added to pipeline!');
  console.log('Refresh the page to see it in the Pipeline view.');
})();
`;

export default {
  SEED_OPPORTUNITIES,
  seedPipeline,
  isPipelineSeeded,
  getVAVisnOpportunity,
  BROWSER_SEED_SCRIPT
};
