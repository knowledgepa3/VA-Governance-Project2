/**
 * Launch Workforce Demo
 *
 * Run this to generate instruction packs you can paste
 * directly into Claude Chrome extension sidepanels.
 */

import {
  WorkforceLauncher,
  PRESET_WORKFORCES,
  PACK_TEMPLATES,
  STANDARD_POLICIES,
  WorkstationConfig
} from './WorkforceLauncher';

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  const launcher = new WorkforceLauncher();

  console.log(`
╔══════════════════════════════════════════════════════════════════════════════╗
║                                                                              ║
║     ██████╗██╗  ██╗██████╗  ██████╗ ███╗   ███╗███████╗                      ║
║    ██╔════╝██║  ██║██╔══██╗██╔═══██╗████╗ ████║██╔════╝                      ║
║    ██║     ███████║██████╔╝██║   ██║██╔████╔██║█████╗                        ║
║    ██║     ██╔══██║██╔══██╗██║   ██║██║╚██╔╝██║██╔══╝                        ║
║    ╚██████╗██║  ██║██║  ██║╚██████╔╝██║ ╚═╝ ██║███████╗                      ║
║     ╚═════╝╚═╝  ╚═╝╚═╝  ╚═╝ ╚═════╝ ╚═╝     ╚═╝╚══════╝                      ║
║                                                                              ║
║     █████╗  ██████╗ ███████╗███╗   ██╗████████╗                              ║
║    ██╔══██╗██╔════╝ ██╔════╝████╗  ██║╚══██╔══╝                              ║
║    ███████║██║  ███╗█████╗  ██╔██╗ ██║   ██║                                 ║
║    ██╔══██║██║   ██║██╔══╝  ██║╚██╗██║   ██║                                 ║
║    ██║  ██║╚██████╔╝███████╗██║ ╚████║   ██║                                 ║
║    ╚═╝  ╚═╝ ╚═════╝ ╚══════╝╚═╝  ╚═══╝   ╚═╝                                 ║
║                                                                              ║
║    ██╗    ██╗ ██████╗ ██████╗ ██╗  ██╗███████╗ ██████╗ ██████╗  ██████╗███████╗
║    ██║    ██║██╔═══██╗██╔══██╗██║ ██╔╝██╔════╝██╔═══██╗██╔══██╗██╔════╝██╔════╝
║    ██║ █╗ ██║██║   ██║██████╔╝█████╔╝ █████╗  ██║   ██║██████╔╝██║     █████╗
║    ██║███╗██║██║   ██║██╔══██╗██╔═██╗ ██╔══╝  ██║   ██║██╔══██╗██║     ██╔══╝
║    ╚███╔███╔╝╚██████╔╝██║  ██║██║  ██╗██║     ╚██████╔╝██║  ██║╚██████╗███████╗
║     ╚══╝╚══╝  ╚═════╝ ╚═╝  ╚═╝╚═╝  ╚═╝╚═╝      ╚═════╝ ╚═╝  ╚═╝ ╚═════╝╚══════╝
║                                                                              ║
║                    Governed Browser Agent Workforce                          ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝
`);

  // Show available presets
  console.log('\n📋 AVAILABLE WORKFORCE PRESETS:\n');
  Object.keys(PRESET_WORKFORCES).forEach((key, i) => {
    const config = PRESET_WORKFORCES[key]();
    console.log(`  ${i + 1}. ${key}`);
    console.log(`     Name: ${config.name}`);
    console.log(`     Workstations: ${config.workstations.length}`);
    config.workstations.forEach(ws => {
      console.log(`       - ${ws.name} (Monitor ${ws.monitor})`);
    });
    console.log('');
  });

  // Demo: Generate Federal BD Team instructions
  console.log('\n' + '═'.repeat(80));
  console.log('GENERATING: Federal BD Research Team');
  console.log('═'.repeat(80) + '\n');

  const bdTeam = PRESET_WORKFORCES['federal-bd-team']();
  const instructions = launcher.generateLaunchInstructions(bdTeam);
  console.log(instructions);

  // Also show a single injection prompt in isolation
  console.log('\n' + '═'.repeat(80));
  console.log('EXAMPLE: Single Workstation Injection Prompt');
  console.log('═'.repeat(80) + '\n');

  const singlePrompt = launcher.generateInjectionPrompt(bdTeam.workstations[0]);
  console.log('Copy this ENTIRE prompt into Claude Chrome sidepanel:\n');
  console.log('─'.repeat(80));
  console.log(singlePrompt);
  console.log('─'.repeat(80));

  // Show custom workforce creation
  console.log('\n' + '═'.repeat(80));
  console.log('HOW TO CREATE CUSTOM WORKFORCE');
  console.log('═'.repeat(80) + '\n');

  console.log(`
To create your own workforce, define workstations like this:

const myWorkforce = launcher.createWorkforce('My Team', [
  {
    id: 'agent-1',
    name: 'My First Agent',
    monitor: 1,
    tabGroup: 'Team-A',
    initialUrl: 'https://example.com',
    instructionPack: {
      id: 'custom-pack',
      name: 'My Custom Pack',
      version: '1.0.0',
      allowedDomains: ['example.com', 'tool.example.com'],
      blockedDomains: ['bank.com'],
      policies: [
        {
          name: 'Require Approval for Forms',
          classification: 'MANDATORY',
          action: 'REQUIRE_APPROVAL',
          appliesTo: ['submit', 'send'],
          description: 'All form submissions need human approval.'
        }
      ],
      metadata: {
        manual: 'How to use the software...',
        task: 'What the agent should do...'
      }
    },
    referenceData: {
      name: 'My Reference Data',
      type: 'ledger',
      description: 'Data the agent should use',
      data: [
        { code: '100', value: 'Item A' },
        { code: '200', value: 'Item B' }
      ]
    }
  }
]);
`);

  console.log('\n' + '═'.repeat(80));
  console.log('NEXT STEPS');
  console.log('═'.repeat(80));
  console.log(`
1. Choose a workforce preset (or create custom)
2. Open Chrome windows on your monitors
3. Create tab groups as specified
4. Open Claude sidepanel in each tab
5. Paste the injection prompt for each workstation
6. Handle login/authentication yourself
7. Tell each agent to begin
8. Monitor your workforce!

Your agents will:
✓ Work visibly on screen
✓ Follow instruction pack policies
✓ Stop for HITL approval when required
✓ Generate audit statements
✓ Never access blocked domains
`);
}

main().catch(console.error);
