/**
 * Business Development Workforce Demo
 *
 * Shows how a BD department would use ACE to:
 * 1. Ingest 20+ RFPs from SAM.gov
 * 2. Qualify opportunities in parallel
 * 3. Get executive dashboard with recommendations
 * 4. Export results for stakeholders
 *
 * This is the reference implementation showing the full workflow.
 *
 * MODES:
 * - DEMO MODE (ACE_DEMO_MODE=true): No API calls, simulated data
 * - PRODUCTION MODE: Live API calls with Anthropic
 */

import { BDWorkforce, BidDecision } from '../bdWorkforce';
import { PlaybookEngine } from '../playbookEngine';
import { config, printConfigStatus, validateConfig } from '../config';
import * as fs from 'fs';

/**
 * Demo: Complete BD workflow from ingestion to decision
 */
async function demoCompleteBDWorkflow() {
  console.log('╔═══════════════════════════════════════════════════════════════╗');
  console.log('║   ACE BUSINESS DEVELOPMENT WORKFORCE DEMO                     ║');
  console.log('║   Full BD Pipeline: Ingest → Qualify → Decide                ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');

  // Print configuration status
  printConfigStatus();

  // Validate configuration
  const validation = validateConfig();
  if (!validation.valid) {
    console.log('❌ Configuration Error:');
    validation.issues.forEach(issue => console.log(`   - ${issue}`));
    console.log('\n💡 To run in demo mode: set ACE_DEMO_MODE=true');
    console.log('   To run with API: set ANTHROPIC_API_KEY=sk-ant-...\n');
    return;
  }

  // Initialize BD workforce
  const bdTeam = new BDWorkforce();

  // Step 1: Add team members
  console.log('📋 Step 1: Setting up BD team...\n');

  bdTeam.addTeamMember({
    id: 'alice',
    name: 'Alice Johnson',
    role: 'BD_MANAGER',
    currentWorkload: 0,
    maxWorkload: 10,
    specializations: ['541511', '541512', '541519'] // IT services NAICS
  });

  bdTeam.addTeamMember({
    id: 'bob',
    name: 'Bob Smith',
    role: 'CAPTURE_MANAGER',
    currentWorkload: 0,
    maxWorkload: 8,
    specializations: ['541330', '541611'] // Engineering, consulting
  });

  bdTeam.addTeamMember({
    id: 'carol',
    name: 'Carol Williams',
    role: 'ANALYST',
    currentWorkload: 0,
    maxWorkload: 15,
    specializations: ['*'] // All NAICS
  });

  console.log('  ✓ Added 3 team members with combined capacity for 33 opportunities\n');

  // Step 2: Ingest RFPs (simulating SAM.gov feed)
  console.log('📥 Step 2: Ingesting opportunities from SAM.gov...\n');

  const rfpFeed = [
    {
      rfpNumber: '140D0423R0003',
      title: 'IT Support Services - Veterans Affairs',
      agency: 'Department of Veterans Affairs',
      estimatedValue: 2500000,
      deadline: new Date('2024-03-15')
    },
    {
      rfpNumber: '140D0423R0004',
      title: 'Cybersecurity Assessment Services',
      agency: 'Department of Defense',
      estimatedValue: 1800000,
      deadline: new Date('2024-04-01')
    },
    {
      rfpNumber: '70CMSD24R00000071',
      title: 'Cloud Migration Services - GSA',
      agency: 'General Services Administration',
      estimatedValue: 4200000,
      deadline: new Date('2024-03-25')
    },
    {
      rfpNumber: '70Z04023Q00000015',
      title: 'Data Analytics Platform Development',
      agency: 'Department of Homeland Security',
      estimatedValue: 3100000,
      deadline: new Date('2024-04-10')
    },
    {
      rfpNumber: 'DTFACT23R00001',
      title: 'Transportation Data Management System',
      agency: 'Department of Transportation',
      estimatedValue: 2900000,
      deadline: new Date('2024-03-30')
    },
    {
      rfpNumber: 'HHS75N98023R00123',
      title: 'Healthcare IT Modernization',
      agency: 'Department of Health and Human Services',
      estimatedValue: 5500000,
      deadline: new Date('2024-04-20')
    },
    {
      rfpNumber: '693JJ324Q000001',
      title: 'NASA Mission Support Services',
      agency: 'National Aeronautics and Space Administration',
      estimatedValue: 1200000,
      deadline: new Date('2024-03-20')
    },
    {
      rfpNumber: 'W912QR24R0001',
      title: 'Army Base IT Infrastructure Upgrade',
      agency: 'Department of Defense - Army',
      estimatedValue: 6800000,
      deadline: new Date('2024-05-01')
    },
    {
      rfpNumber: 'EPA-DC-DW-24-01',
      title: 'Environmental Data Portal Development',
      agency: 'Environmental Protection Agency',
      estimatedValue: 980000,
      deadline: new Date('2024-03-28')
    },
    {
      rfpNumber: 'AG-3151-P-24-0001',
      title: 'Agricultural Research Database System',
      agency: 'Department of Agriculture',
      estimatedValue: 750000,
      deadline: new Date('2024-04-05')
    },
    {
      rfpNumber: '1333ED24Q0001',
      title: 'Education Data Warehouse Implementation',
      agency: 'Department of Education',
      estimatedValue: 2200000,
      deadline: new Date('2024-04-15')
    },
    {
      rfpNumber: 'NRDAR0001-24',
      title: 'Natural Resource Management System',
      agency: 'Department of Interior',
      estimatedValue: 1650000,
      deadline: new Date('2024-03-22')
    },
    {
      rfpNumber: '89243324RFP00001',
      title: 'Energy Efficiency Analytics Platform',
      agency: 'Department of Energy',
      estimatedValue: 3400000,
      deadline: new Date('2024-04-12')
    },
    {
      rfpNumber: 'HDTRA124Q0001',
      title: 'Defense Threat Reduction IT Services',
      agency: 'Department of Defense - DTRA',
      estimatedValue: 4900000,
      deadline: new Date('2024-05-10')
    },
    {
      rfpNumber: 'ST1301-24-R-0001',
      title: 'State Department Consular Systems',
      agency: 'Department of State',
      estimatedValue: 7200000,
      deadline: new Date('2024-05-15')
    }
  ];

  const opportunities = await bdTeam.ingestOpportunities(rfpFeed);
  console.log(`  ✓ Ingested ${opportunities.length} opportunities\n`);
  console.log(`  Total potential value: $${(rfpFeed.reduce((sum, rfp) => sum + rfp.estimatedValue, 0) / 1000000).toFixed(2)}M\n`);

  // Step 3: Define our company profile
  console.log('🏢 Step 3: Configuring company capabilities...\n');

  const companyProfile = {
    ourNaicsCodes: '541511,541512,541519,541330', // IT, Engineering, Consulting
    ourCertifications: 'SDVOSB,ISO27001,CMMC-L2',
    minContractValue: 500000,   // $500K minimum
    maxContractValue: 8000000   // $8M maximum (capacity constraint)
  };

  console.log(`  NAICS Codes: ${companyProfile.ourNaicsCodes}`);
  console.log(`  Certifications: ${companyProfile.ourCertifications}`);
  console.log(`  Contract Range: $${(companyProfile.minContractValue / 1000).toFixed(0)}K - $${(companyProfile.maxContractValue / 1000000).toFixed(1)}M\n`);

  // Step 4: Run qualification (this is where the magic happens)
  console.log('🚀 Step 4: Running parallel opportunity qualification...');
  console.log('          (This would normally take 15+ agents 2-3 hours each)\n');

  const portfolio = await bdTeam.qualifyOpportunities(companyProfile);

  // Step 5: Display executive dashboard
  console.log('\n' + bdTeam.getExecutiveDashboard());

  // Step 6: Drill into strong bids
  console.log('🎯 DETAILED VIEW: Strong Bid Opportunities\n');
  console.log('─────────────────────────────────────────────────────────────────\n');

  const strongBids = bdTeam.getOpportunitiesByDecision(BidDecision.STRONG_BID);

  if (strongBids.length > 0) {
    strongBids.slice(0, 3).forEach((opp, index) => {
      console.log(`${index + 1}. ${opp.rfpNumber} - ${opp.title}`);
      console.log(`   Agency: ${opp.agency}`);
      console.log(`   Value: $${(opp.estimatedValue / 1000000).toFixed(2)}M`);
      console.log(`   Win Probability: ${opp.winProbability?.toFixed(1)}%`);
      console.log(`   Deadline: ${opp.deadline.toLocaleDateString()}`);
      console.log(`   Assigned To: ${opp.assignedTo || 'Unassigned'}`);
      console.log(`   Teaming Required: ${opp.teamingRequired ? 'Yes' : 'No'}`);
      console.log(`   Competitors: ~${opp.competitorCount} expected`);
      console.log('');
    });
  } else {
    console.log('   No strong bid opportunities at this time.\n');
  }

  // Step 7: Export results
  console.log('💾 Step 5: Exporting results...\n');

  const csv = bdTeam.exportToCSV();
  fs.writeFileSync('./bd-portfolio-export.csv', csv);
  console.log('  ✓ Exported to: ./bd-portfolio-export.csv\n');

  // Summary metrics
  console.log('📈 FINAL METRICS\n');
  console.log('─────────────────────────────────────────────────────────────────\n');
  console.log(`  Opportunities Analyzed: ${portfolio.summary.total}`);
  console.log(`  Strong Bids: ${portfolio.summary.strongBids}`);
  console.log(`  Qualified Bids: ${portfolio.summary.bids}`);
  console.log(`  No-Bids: ${portfolio.summary.noBids}`);
  console.log(`  Pipeline Value: $${(portfolio.summary.totalPipelineValue / 1000000).toFixed(2)}M`);
  console.log(`  Average Win Probability: ${portfolio.summary.avgWinProbability.toFixed(1)}%`);
  console.log('');

  // Time savings calculation
  const opportunitiesAnalyzed = portfolio.summary.total;
  const manualTimePerOpp = 2.5; // hours
  const aceTimePerOpp = 0.25; // hours (15 minutes)
  const timeSaved = (manualTimePerOpp - aceTimePerOpp) * opportunitiesAnalyzed;
  const costPerHour = 150; // BD manager hourly rate
  const costSavings = timeSaved * costPerHour;

  console.log('💰 ROI ANALYSIS\n');
  console.log('─────────────────────────────────────────────────────────────────\n');
  console.log(`  Manual Analysis Time: ${(manualTimePerOpp * opportunitiesAnalyzed).toFixed(1)} hours`);
  console.log(`  ACE Analysis Time: ${(aceTimePerOpp * opportunitiesAnalyzed).toFixed(1)} hours`);
  console.log(`  Time Saved: ${timeSaved.toFixed(1)} hours (${(timeSaved / 8).toFixed(1)} days)`);
  console.log(`  Cost Savings: $${costSavings.toLocaleString()} @ $${costPerHour}/hr`);
  console.log('');

  console.log('✅ Demo complete!\n');
}

/**
 * Demo: Watch live as opportunities are qualified
 */
async function demoLiveQualification() {
  console.log('\n╔═══════════════════════════════════════════════════════════════╗');
  console.log('║   LIVE QUALIFICATION DEMO                                     ║');
  console.log('║   Watch as ACE qualifies multiple RFPs in real-time          ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');

  const bdTeam = new BDWorkforce();

  // Add team
  bdTeam.addTeamMember({
    id: 'demo-analyst',
    name: 'Demo Analyst',
    role: 'ANALYST',
    currentWorkload: 0,
    maxWorkload: 5,
    specializations: ['*']
  });

  // Ingest 5 RFPs
  const rfps = [
    { rfpNumber: 'RFP-001', title: 'IT Services', agency: 'VA', estimatedValue: 2000000 },
    { rfpNumber: 'RFP-002', title: 'Cyber Security', agency: 'DOD', estimatedValue: 3500000 },
    { rfpNumber: 'RFP-003', title: 'Cloud Migration', agency: 'GSA', estimatedValue: 1800000 },
    { rfpNumber: 'RFP-004', title: 'Data Analytics', agency: 'DHS', estimatedValue: 2900000 },
    { rfpNumber: 'RFP-005', title: 'System Modernization', agency: 'HHS', estimatedValue: 4100000 }
  ];

  console.log('📥 Ingesting 5 RFPs...\n');
  await bdTeam.ingestOpportunities(rfps);

  console.log('🚀 Starting qualification...\n');

  // Simulate real-time updates
  const interval = setInterval(() => {
    const portfolio = bdTeam.getPortfolio();
    process.stdout.write(`\r  Qualifying... ${portfolio.summary.qualifying} in progress`);
  }, 500);

  await bdTeam.qualifyOpportunities({
    ourNaicsCodes: '541511,541512',
    ourCertifications: 'SDVOSB',
    minContractValue: 500000,
    maxContractValue: 5000000
  });

  clearInterval(interval);
  console.log('\n\n✓ Qualification complete!\n');
  console.log(bdTeam.getExecutiveDashboard());
}

/**
 * Demo: BD Manager daily workflow
 */
function demoBDManagerWorkflow() {
  console.log('\n╔═══════════════════════════════════════════════════════════════╗');
  console.log('║   BD MANAGER DAILY WORKFLOW                                   ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');

  console.log('☀️  MORNING ROUTINE (9:00 AM)\n');
  console.log('1. Check SAM.gov for new RFPs (typically 20-50 new/day)');
  console.log('2. Export to CSV and ingest into ACE');
  console.log('3. Click "Qualify All" → ACE analyzes in parallel');
  console.log('4. Get coffee ☕ while ACE works (15-20 minutes)\n');

  console.log('📊 MID-MORNING (10:00 AM)\n');
  console.log('5. Review Executive Dashboard');
  console.log('6. Approve Strong Bids for fast-track');
  console.log('7. Schedule reviews for borderline opportunities');
  console.log('8. Send No-Bid notifications\n');

  console.log('🎯 AFTERNOON (2:00 PM)\n');
  console.log('9. Drill into qualified opportunities');
  console.log('10. Read detailed BD memos (generated by ACE)');
  console.log('11. Assign capture managers to strong bids');
  console.log('12. Identify teaming partners for gap-filled opps\n');

  console.log('📈 END OF DAY (5:00 PM)\n');
  console.log('13. Export portfolio to CSV for leadership');
  console.log('14. Update CRM with bid decisions');
  console.log('15. Pipeline value tracked automatically\n');

  console.log('⏱️  TIME COMPARISON\n');
  console.log('─────────────────────────────────────────────────────────────────\n');
  console.log('  Without ACE: 30 RFPs × 2.5 hrs = 75 hours (9.4 days) 😫');
  console.log('  With ACE:    30 RFPs × 0.25 hrs = 7.5 hours (1 day) 🎉');
  console.log('  Time Saved:  67.5 hours = 8.4 work days per week!\n');
}

/**
 * Main demo runner
 */
async function main() {
  const demos = {
    'complete': demoCompleteBDWorkflow,
    'live': demoLiveQualification,
    'workflow': demoBDManagerWorkflow
  };

  const demoType = process.argv[2] || 'complete';

  if (demos[demoType as keyof typeof demos]) {
    await demos[demoType as keyof typeof demos]();
  } else {
    console.log('Available demos:');
    console.log('  npm run demo:bd complete  - Full BD workflow');
    console.log('  npm run demo:bd live      - Watch live qualification');
    console.log('  npm run demo:bd workflow  - BD Manager daily routine');
  }
}

// Run the demo
main().catch(console.error);

export { demoCompleteBDWorkflow, demoLiveQualification, demoBDManagerWorkflow };
