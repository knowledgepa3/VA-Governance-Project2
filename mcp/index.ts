/**
 * MCP Governed Browser Agents
 *
 * This module provides governed browser automation using Claude's Chrome Extension
 * instead of Playwright. The key benefits:
 *
 * 1. VISIBLE WORK - You can see agents working on your monitors
 * 2. REAL BROWSER - Uses your actual Chrome with your logins
 * 3. HUMAN-IN-THE-LOOP - Built-in approval for sensitive actions
 * 4. GOVERNED - Instruction packs control what agents can do
 * 5. AUDITABLE - Full trail of every action taken
 * 6. COST OPTIMIZED - Batched operations, shallow reads, minimal screenshots
 *
 * ARCHITECTURE:
 *
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │  YOUR MONITORS                                                       │
 * │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                 │
 * │  │ Monitor 1   │  │ Monitor 2   │  │ Monitor 3   │                 │
 * │  │ Agent: BD-1 │  │ Agent: BD-2 │  │ Agent: BD-3 │                 │
 * │  │ SAM.gov     │  │ USASpending │  │ FPDS        │                 │
 * │  └─────────────┘  └─────────────┘  └─────────────┘                 │
 * └─────────────────────────────────────────────────────────────────────┘
 *                              │
 * ┌────────────────────────────▼────────────────────────────────────────┐
 * │  Multi-Monitor Coordinator                                           │
 * │  - Distributes tasks across agents                                  │
 * │  - Aggregates results                                               │
 * │  - Handles failures and retries                                     │
 * └────────────────────────────┬────────────────────────────────────────┘
 *                              │
 * ┌────────────────────────────▼────────────────────────────────────────┐
 * │  Governed Browser Agent (per monitor)                               │
 * │  - Loads instruction pack                                           │
 * │  - Checks policies before each action                              │
 * │  - Requests HITL approval when needed                              │
 * │  - Generates audit trail                                            │
 * └────────────────────────────┬────────────────────────────────────────┘
 *                              │
 * ┌────────────────────────────▼────────────────────────────────────────┐
 * │  MCP Tools (Claude_in_Chrome)                                       │
 * │  - navigate: Go to URLs                                             │
 * │  - read_page: Get page structure                                    │
 * │  - find: Locate elements by description                            │
 * │  - form_input: Fill form fields                                     │
 * │  - computer: Click, type, scroll                                    │
 * │  - get_page_text: Extract text content                             │
 * └─────────────────────────────────────────────────────────────────────┘
 *
 * USAGE:
 *
 * ```typescript
 * import {
 *   MCPWorkflowRunner,
 *   FEDERAL_BD_BROWSER_PACK,
 *   WORKFLOWS
 * } from './mcp';
 *
 * // Create a runner with governance
 * const runner = new MCPWorkflowRunner('bd-agent-1', FEDERAL_BD_BROWSER_PACK);
 * await runner.initialize();
 *
 * // Execute a governed workflow
 * const result = await runner.executeWorkflow(WORKFLOWS.SAM_GOV_SEARCH, {
 *   keywords: 'IT support services',
 *   naicsCode: '541512'
 * });
 *
 * // Result includes audit trail
 * console.log(result.auditLog);
 * ```
 *
 * VS PLAYWRIGHT:
 *
 * | Feature                | Playwright          | MCP/Chrome Extension |
 * |------------------------|---------------------|----------------------|
 * | Visibility             | Hidden (headless)   | Visible on monitors  |
 * | Bot detection          | Gets blocked        | Real browser session |
 * | Authentication         | Must automate       | Use existing logins  |
 * | HITL                   | Custom build        | Built into Claude UI |
 * | Cost                   | API calls + compute | Optimized MCP calls  |
 * | Audit trail            | Must build          | Built-in             |
 */

// Core agent
export {
  GovernedBrowserAgent,
  MultiMonitorCoordinator,
  FEDERAL_BD_BROWSER_PACK,
  type GovernedBrowserAction,
  type ActionResult,
  type BrowserInstructionPack,
  type BrowserPolicy,
  type HITLRequirement,
  type BrowserAuditEntry,
  type MCPToolName
} from './governedBrowserAgent';

// Workflow runner
export {
  MCPWorkflowRunner,
  WORKFLOWS,
  SAM_GOV_SEARCH_WORKFLOW,
  USA_SPENDING_RESEARCH_WORKFLOW,
  demoSAMGovSearch,
  type Workflow,
  type WorkflowStep,
  type WorkflowContext,
  type HITLRequest
} from './mcpWorkflowRunner';
