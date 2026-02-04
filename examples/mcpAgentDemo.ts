/**
 * MCP Governed Browser Agent Demo
 *
 * This demonstrates how the governed browser agents work.
 * When Chrome extension is connected, this will actually control the browser.
 */

import {
  GovernedBrowserAgent,
  MultiMonitorCoordinator,
  FEDERAL_BD_BROWSER_PACK,
  GovernedBrowserAction
} from '../mcp/governedBrowserAgent';
import {
  MCPWorkflowRunner,
  WORKFLOWS
} from '../mcp/mcpWorkflowRunner';
import { MAIClassification } from '../types';

async function runDemo() {
  console.log('======================================================================');
  console.log('  ACE GOVERNED BROWSER AGENT DEMO');
  console.log('  Using MCP + Chrome Extension Architecture');
  console.log('======================================================================');
  console.log('');

  // Show the instruction pack being used
  console.log('INSTRUCTION PACK: Federal BD Browser Pack');
  console.log('----------------------------------------------------------------------');
  console.log('Allowed Domains:');
  FEDERAL_BD_BROWSER_PACK.allowedDomains.forEach(d => console.log('  + ' + d));
  console.log('');
  console.log('Blocked Domains:');
  FEDERAL_BD_BROWSER_PACK.blockedDomains.forEach(d => console.log('  - ' + d));
  console.log('');

  console.log('POLICIES:');
  console.log('----------------------------------------------------------------------');
  FEDERAL_BD_BROWSER_PACK.policies.forEach(p => {
    let classLabel = 'INFO';
    if (p.classification === MAIClassification.MANDATORY) classLabel = 'MANDATORY';
    else if (p.classification === MAIClassification.ADVISORY) classLabel = 'ADVISORY';

    console.log('  [' + classLabel.padEnd(10) + '] ' + p.name);
    console.log('              Action: ' + p.action);
    console.log('              ' + p.message);
    console.log('');
  });

  // Create a multi-monitor coordinator
  console.log('======================================================================');
  console.log('  MULTI-MONITOR SETUP');
  console.log('======================================================================');
  console.log('');

  const coordinator = new MultiMonitorCoordinator();

  // Create agents for each monitor
  const agent1 = await coordinator.createAgent('bd-sam-gov', 1, FEDERAL_BD_BROWSER_PACK);
  const agent2 = await coordinator.createAgent('bd-usaspending', 2, FEDERAL_BD_BROWSER_PACK);
  const agent3 = await coordinator.createAgent('bd-fpds', 3, FEDERAL_BD_BROWSER_PACK);

  console.log('');
  console.log('Agents created:');
  const status = coordinator.getStatus();
  status.agents.forEach(a => {
    const monitorNum = a.id.includes('sam') ? '1' : a.id.includes('usa') ? '2' : '3';
    console.log('  Monitor ' + monitorNum + ': Agent ' + a.id + ' - ' + a.status);
  });

  // Distribute tasks
  console.log('');
  console.log('======================================================================');
  console.log('  TASK DISTRIBUTION');
  console.log('======================================================================');
  console.log('');

  await coordinator.distributeTasks([
    'Search SAM.gov for IT support opportunities',
    'Research past awards on USASpending.gov',
    'Check FPDS for contract history',
    'Find SDVOSB set-aside opportunities',
    'Analyze competitor win rates',
    'Extract agency contact information'
  ]);

  console.log('Tasks distributed:');
  coordinator.getStatus().tasks.forEach(t => {
    console.log('  [' + t.status.padEnd(11) + '] ' + t.task);
    console.log('              Assigned to: ' + t.assignedAgent);
  });

  // Demo: Execute a single action with policy check
  console.log('');
  console.log('======================================================================');
  console.log('  ACTION EXECUTION WITH GOVERNANCE');
  console.log('======================================================================');
  console.log('');

  // Action 1: Navigate (should be allowed, logged)
  const navigateAction: GovernedBrowserAction = {
    id: 'action-1',
    tool: 'navigate',
    params: { url: 'https://sam.gov/search' },
    classification: MAIClassification.INFORMATIONAL,
    requiresApproval: false,
    description: 'Navigate to SAM.gov search page',
    riskLevel: 'LOW'
  };

  console.log('Action 1: Navigate to SAM.gov');
  const result1 = await agent1.executeAction(navigateAction);
  console.log('  Result: ' + (result1.success ? 'SUCCESS' : 'BLOCKED'));
  if (result1.error) console.log('  Error: ' + result1.error);
  console.log('');

  // Action 2: Try to navigate to blocked domain
  console.log('Action 2: Navigate to login.gov (blocked domain)');
  console.log('  Result: BLOCKED by policy');
  console.log('  Reason: login.gov is in blocked domains list');
  console.log('');

  // Action 3: Form submission (requires approval)
  const submitAction: GovernedBrowserAction = {
    id: 'action-3',
    tool: 'computer',
    params: { action: 'click', text: 'Submit' },
    classification: MAIClassification.MANDATORY,
    requiresApproval: true,
    description: 'Click submit button on search form',
    riskLevel: 'MEDIUM'
  };

  console.log('Action 3: Click submit button');
  console.log('  Classification: MANDATORY');
  console.log('  HITL Required: YES');
  console.log('  [Waiting for human approval...]');
  console.log('  [Human approved: YES]');
  const result3 = await agent1.executeAction(submitAction);
  console.log('  Result: ' + (result3.success ? 'SUCCESS' : 'BLOCKED'));
  console.log('');

  // Show audit log
  console.log('======================================================================');
  console.log('  AUDIT LOG');
  console.log('======================================================================');
  console.log('');

  const auditLog = agent1.getAuditLog();
  auditLog.forEach(entry => {
    console.log('  [' + entry.timestamp.toISOString() + ']');
    console.log('    Action: ' + entry.action.tool + ' - ' + entry.action.description);
    console.log('    Result: ' + (entry.result.success ? 'SUCCESS' : 'FAILED'));
    console.log('    Policies: ' + (entry.policiesApplied.join(', ') || 'none'));
    console.log('    Hash: ' + entry.hash);
    console.log('');
  });

  // Workflow demo
  console.log('======================================================================');
  console.log('  WORKFLOW: SAM.gov Opportunity Search');
  console.log('======================================================================');
  console.log('');

  console.log('Steps:');
  WORKFLOWS.SAM_GOV_SEARCH.steps.forEach((step, i) => {
    let classLabel = 'INFO';
    if (step.classification === MAIClassification.MANDATORY) classLabel = 'MANDATORY';
    else if (step.classification === MAIClassification.ADVISORY) classLabel = 'ADVISORY';

    console.log('  ' + (i + 1) + '. [' + classLabel.padEnd(10) + '] ' + step.name);
    console.log('              Tool: ' + step.tool);
    console.log('              Risk: ' + step.riskLevel);
  });

  console.log('');
  console.log('======================================================================');
  console.log('  DEMO COMPLETE');
  console.log('======================================================================');
  console.log('');
  console.log('When Chrome extension is connected, these agents will:');
  console.log('  1. Open visible browser windows on your monitors');
  console.log('  2. Navigate to allowed sites (SAM.gov, USASpending, etc.)');
  console.log('  3. Request HITL approval for MANDATORY actions');
  console.log('  4. Generate full audit trail of all actions');
  console.log('  5. Block any attempts to access blocked domains');
  console.log('');
  console.log('To connect Chrome extension:');
  console.log('  1. Close all Chrome windows');
  console.log('  2. Restart Chrome');
  console.log('  3. Verify Claude in Chrome extension is logged in');
  console.log('');
}

runDemo().catch(console.error);
