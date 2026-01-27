/**
 * Playbook Engine Demo
 * Shows how to use the universal browser workforce with industry packs
 */

import { PlaybookEngine, PlaybookLibrary, Playbook } from '../playbookEngine';
import { MAIClassification } from '../types';
import * as fs from 'fs';

/**
 * Example 1: Execute a single RFP research playbook
 */
async function exampleSinglePlaybook() {
  console.log('=== Example 1: Single Playbook Execution ===\n');

  const engine = new PlaybookEngine();

  // Load playbook from JSON file
  const rfpPlaybook = JSON.parse(
    fs.readFileSync('./playbooks/rfp-research.playbook.json', 'utf-8')
  );
  engine.registerPlaybook(rfpPlaybook);

  // Register procurement industry pack
  const procurementPack = PlaybookLibrary.getProcurementPack();
  engine.registerIndustryPack(procurementPack);

  // Execute playbook
  const context = await engine.executePlaybook(
    'rfp-research',
    {
      RFP_NUMBER: '140D0423R0003',
      AGENCY: 'Department of Veterans Affairs'
    },
    {
      agentId: 'procurement-agent-1',
      industryPack: 'procurement-pack',
      onProgress: (ctx) => {
        console.log(`Progress: Step ${ctx.currentStep + 1}/${ctx.totalSteps}`);
      },
      onApprovalRequired: async (step, screenshot) => {
        console.log(`⚠️  Approval required for: ${step.instruction}`);
        // In real app, show UI with screenshot
        // For demo, auto-approve ADVISORY, require input for MANDATORY
        return step.classification !== MAIClassification.MANDATORY;
      },
      onComplete: (ctx) => {
        console.log(`✓ Playbook completed in ${ctx.endTime!.getTime() - ctx.startTime!.getTime()}ms`);
        console.log(`  Approvals: ${ctx.approvals.length}`);
        console.log(`  Results:`, ctx.results);
      }
    }
  );

  console.log('\nFinal Status:', context.status);
}

/**
 * Example 2: Execute workforce (multiple playbooks in parallel)
 */
async function exampleWorkforce() {
  console.log('\n=== Example 2: Workforce Execution (Parallel) ===\n');

  const engine = new PlaybookEngine();

  // Load all playbooks
  const rfpPlaybook = JSON.parse(fs.readFileSync('./playbooks/rfp-research.playbook.json', 'utf-8'));
  const compliancePlaybook = JSON.parse(fs.readFileSync('./playbooks/compliance-audit.playbook.json', 'utf-8'));
  const hrPlaybook = JSON.parse(fs.readFileSync('./playbooks/candidate-screening.playbook.json', 'utf-8'));

  engine.registerPlaybook(rfpPlaybook);
  engine.registerPlaybook(compliancePlaybook);
  engine.registerPlaybook(hrPlaybook);

  // Register industry packs
  engine.registerIndustryPack(PlaybookLibrary.getProcurementPack());
  engine.registerIndustryPack(PlaybookLibrary.getCompliancePack());
  engine.registerIndustryPack(PlaybookLibrary.getHRPack());

  // Execute 5 RFPs in parallel
  const rfpTasks = [
    { rfpNumber: '140D0423R0003', agency: 'VA' },
    { rfpNumber: '140D0423R0004', agency: 'DOD' },
    { rfpNumber: '140D0423R0005', agency: 'GSA' },
    { rfpNumber: '140D0423R0006', agency: 'DHS' },
    { rfpNumber: '140D0423R0007', agency: 'HHS' }
  ].map((rfp, index) => ({
    playbookId: 'rfp-research',
    agentId: `rfp-agent-${index + 1}`,
    industryPack: 'procurement-pack',
    variables: {
      RFP_NUMBER: rfp.rfpNumber,
      AGENCY: rfp.agency
    }
  }));

  console.log(`Starting workforce: ${rfpTasks.length} procurement agents`);

  const results = await engine.executeWorkforce(rfpTasks, {
    onProgress: (contexts) => {
      const completed = contexts.filter(c => c.status === 'completed').length;
      const running = contexts.filter(c => c.status === 'running').length;
      console.log(`Progress: ${completed} completed, ${running} running`);
    },
    onApprovalRequired: async (agentId, step, screenshot) => {
      console.log(`[${agentId}] ⚠️  Approval required: ${step.instruction}`);
      return step.classification !== MAIClassification.MANDATORY;
    },
    onComplete: (contexts) => {
      console.log('\n✓ Workforce completed!');
      contexts.forEach(ctx => {
        console.log(`  ${ctx.agentId}: ${ctx.status} (${ctx.approvals.length} approvals)`);
      });
    }
  });

  console.log('\nAll tasks completed:', results.length);
}

/**
 * Example 3: Multi-industry workforce
 */
async function exampleMultiIndustry() {
  console.log('\n=== Example 3: Multi-Industry Workforce ===\n');

  const engine = new PlaybookEngine();

  // Load playbooks from all industries
  const playbooks = [
    'rfp-research.playbook.json',
    'compliance-audit.playbook.json',
    'candidate-screening.playbook.json'
  ];

  for (const filename of playbooks) {
    const playbook = JSON.parse(fs.readFileSync(`./playbooks/${filename}`, 'utf-8'));
    engine.registerPlaybook(playbook);
  }

  // Register all industry packs
  engine.registerIndustryPack(PlaybookLibrary.getProcurementPack());
  engine.registerIndustryPack(PlaybookLibrary.getCompliancePack());
  engine.registerIndustryPack(PlaybookLibrary.getHRPack());

  // Execute mixed workload
  const tasks = [
    {
      playbookId: 'rfp-research',
      agentId: 'procurement-1',
      industryPack: 'procurement-pack',
      variables: { RFP_NUMBER: '140D0423R0003', AGENCY: 'VA' }
    },
    {
      playbookId: 'rfp-research',
      agentId: 'procurement-2',
      industryPack: 'procurement-pack',
      variables: { RFP_NUMBER: '140D0423R0004', AGENCY: 'DOD' }
    },
    {
      playbookId: 'compliance-audit-trail',
      agentId: 'compliance-1',
      industryPack: 'compliance-pack',
      variables: { REGULATION_ID: 'CMMC 2.0', CONTROL_ID: 'AC.1.001', DATE_RANGE: '2024-Q1' }
    },
    {
      playbookId: 'candidate-screening',
      agentId: 'hr-1',
      industryPack: 'hr-pack',
      variables: {
        CANDIDATE_NAME: 'John Doe',
        LINKEDIN_URL: 'linkedin.com/in/johndoe',
        POSITION: 'Senior Engineer'
      }
    }
  ];

  console.log('Starting multi-industry workforce:');
  console.log('  - 2 Procurement agents');
  console.log('  - 1 Compliance agent');
  console.log('  - 1 HR agent');
  console.log('');

  await engine.executeWorkforce(tasks, {
    onProgress: (contexts) => {
      console.log(`Overall progress: ${contexts.filter(c => c.status === 'completed').length}/${contexts.length} completed`);
    },
    onApprovalRequired: async (agentId, step, screenshot) => {
      console.log(`[${agentId}] Approval: ${step.instruction}`);
      return true; // Auto-approve for demo
    },
    onComplete: (contexts) => {
      console.log('\n✓ All industries completed!');

      // Group by industry
      const byIndustry = contexts.reduce((acc, ctx) => {
        const playbook = engine.getExecutionContext(ctx.agentId);
        // Extract industry from playbook
        const industry = ctx.agentId.split('-')[0];
        if (!acc[industry]) acc[industry] = [];
        acc[industry].push(ctx);
        return acc;
      }, {} as Record<string, any[]>);

      Object.entries(byIndustry).forEach(([industry, ctxs]) => {
        console.log(`\n${industry}:`);
        ctxs.forEach(ctx => {
          console.log(`  ${ctx.agentId}: ${ctx.status}`);
        });
      });
    }
  });
}

/**
 * Example 4: Custom playbook creation
 */
function exampleCustomPlaybook() {
  console.log('\n=== Example 4: Creating Custom Playbook ===\n');

  const customPlaybook: Playbook = {
    id: 'custom-legal-research',
    name: 'Legal Precedent Research',
    description: 'Search court databases for relevant case law and precedents',
    industry: 'Legal',
    jobRole: 'Paralegal',
    version: '1.0.0',
    defaultClassification: MAIClassification.ADVISORY,
    tags: ['legal', 'research', 'case-law', 'precedent'],
    variables: [
      { name: 'CASE_NAME', description: 'Name of current case', required: true },
      { name: 'JURISDICTION', description: 'Court jurisdiction', required: true },
      { name: 'LEGAL_ISSUE', description: 'Legal issue/question', required: true }
    ],
    steps: [
      {
        id: 'search-pacer',
        instruction: 'Search PACER for cases in ${JURISDICTION} related to ${LEGAL_ISSUE}',
        expectedOutcome: 'List of relevant cases',
        classification: MAIClassification.INFORMATIONAL
      },
      {
        id: 'review-precedents',
        instruction: 'Review top 10 cases for holdings and reasoning',
        expectedOutcome: 'Case summaries with key holdings',
        classification: MAIClassification.ADVISORY
      },
      {
        id: 'cite-check',
        instruction: 'Verify cases are still good law (not overturned)',
        expectedOutcome: 'Citation validation complete',
        classification: MAIClassification.MANDATORY
      },
      {
        id: 'generate-memo',
        instruction: 'Generate legal memo with precedent analysis',
        expectedOutcome: 'Legal memo ready for attorney review',
        classification: MAIClassification.MANDATORY
      }
    ],
    requiredExtensions: ['legal-citation-finder', 'pacer-connector', 'shepardize'],
    estimatedDuration: '20-30 minutes'
  };

  const engine = new PlaybookEngine();
  engine.registerPlaybook(customPlaybook);

  // Export to JSON
  const json = engine.exportPlaybook('custom-legal-research');
  console.log('Custom playbook created:');
  console.log(json);

  // Save to file
  fs.writeFileSync('./playbooks/custom-legal-research.playbook.json', json);
  console.log('\n✓ Saved to ./playbooks/custom-legal-research.playbook.json');
}

/**
 * Run all examples
 */
async function main() {
  console.log('╔════════════════════════════════════════════════════╗');
  console.log('║   ACE Playbook Engine Demo                        ║');
  console.log('║   Universal Browser Workforce with MAI Governance ║');
  console.log('╚════════════════════════════════════════════════════╝\n');

  // Run examples (comment out as needed)
  // await exampleSinglePlaybook();
  // await exampleWorkforce();
  // await exampleMultiIndustry();
  exampleCustomPlaybook();

  console.log('\n✓ Demo complete!');
}

// Uncomment to run
// main().catch(console.error);

export {
  exampleSinglePlaybook,
  exampleWorkforce,
  exampleMultiIndustry,
  exampleCustomPlaybook
};
