/**
 * MCP BROWSER ADAPTER v1.0.0
 *
 * Bridges the Job Pack Executor with real MCP browser tools.
 * This file provides the interface between our governance layer
 * and the actual Claude Chrome Extension / MCP tools.
 *
 * When using Claude Desktop + MCP or Claude Chrome Extension,
 * the MCP tools are called by Claude, not by this code directly.
 *
 * This adapter shows the EXPECTED INTERFACE that Claude should use
 * when executing Job Packs.
 */

import {
  JobPack,
  MAILevel,
  ExecutionContext,
  ActionLogEntry,
  EvidenceBundle,
  ExecutionResult,
  MCPBrowserTools,
  enforceMAI,
  runPreExecutionGates,
  createEvidenceBundle,
  addArtifact,
  sealEvidenceBundle
} from './JobPackExecutor';

import { RiskProfile } from '../governance/RiskProfileSchema';

// =============================================================================
// MCP TOOL INTERFACE
// =============================================================================

/**
 * These are the MCP tools available from Claude in Chrome extension.
 * Claude calls these tools; this interface documents what's available.
 */
export interface MCPToolSet {
  // Navigation
  'mcp__Claude_in_Chrome__navigate': (params: { url: string; tabId: number }) => Promise<any>;
  'mcp__Claude_in_Chrome__tabs_context_mcp': (params: { createIfEmpty?: boolean }) => Promise<any>;
  'mcp__Claude_in_Chrome__tabs_create_mcp': (params: {}) => Promise<any>;

  // Page Reading
  'mcp__Claude_in_Chrome__read_page': (params: { tabId: number; depth?: number; filter?: string }) => Promise<any>;
  'mcp__Claude_in_Chrome__get_page_text': (params: { tabId: number }) => Promise<any>;
  'mcp__Claude_in_Chrome__find': (params: { query: string; tabId: number }) => Promise<any>;

  // Interaction
  'mcp__Claude_in_Chrome__computer': (params: {
    action: string;
    tabId: number;
    coordinate?: number[];
    text?: string;
    ref?: string;
  }) => Promise<any>;
  'mcp__Claude_in_Chrome__form_input': (params: { ref: string; value: any; tabId: number }) => Promise<any>;

  // Screenshots
  'mcp__Claude_in_Chrome__computer': (params: { action: 'screenshot'; tabId: number }) => Promise<any>;
}

// =============================================================================
// EXECUTION PROTOCOL
// =============================================================================

/**
 * EXECUTION PROTOCOL FOR CLAUDE
 *
 * When Claude is asked to "execute a Job Pack", it should follow this protocol:
 *
 * 1. LOAD PACK
 *    - Read the Job Pack JSON file
 *    - Parse and validate structure
 *
 * 2. LOAD PROFILE
 *    - Get the appropriate Risk Profile
 *    - Verify pack meets certification requirements
 *
 * 3. PRE-EXECUTION GATES
 *    - Check certification level gate
 *    - Check domain allowlist
 *    - Check pack enabled list
 *
 * 4. CREATE BROWSER TAB
 *    - Call tabs_context_mcp to get/create tab
 *    - Store tabId for all subsequent calls
 *
 * 5. FOR EACH ACTION IN PROCEDURE:
 *    a. CHECK MAI LEVEL
 *       - If action MAI > profile max MAI → BLOCK
 *       - If action in forbidden list → BLOCK
 *       - If action in always_require_approval → ASK USER
 *
 *    b. EXECUTE ACTION
 *       - Call appropriate MCP tool
 *       - Capture screenshot after significant actions
 *       - Log action to evidence
 *
 *    c. CHECK ESCALATION TRIGGERS
 *       - Evaluate trigger conditions
 *       - If triggered → escalate per trigger.action
 *
 * 6. SEAL EVIDENCE
 *    - Compute manifest hash
 *    - Seal the bundle
 *    - Return results
 */

// =============================================================================
// PROMPT TEMPLATE FOR CLAUDE
// =============================================================================

export const EXECUTION_PROMPT_TEMPLATE = `
You are executing a Job Pack with governance enforcement.

## JOB PACK
{pack_json}

## RISK PROFILE
{profile_json}

## TARGET URL
{target_url}

## EXECUTION PROTOCOL

1. **Pre-Execution Gates** (MUST PASS ALL)
   - Certification Gate: Pack level must be >= {min_cert_level}
   - Domain Gate: Target domain must be in allowed list (or allowed list empty)
   - Forbidden Actions: Check pack doesn't use globally forbidden actions

2. **For Each Procedure Step**
   - Check MAI level against profile max ({max_mai_level})
   - If MANDATORY action and profile forbids auto-execution → ask user first
   - Execute via MCP tools
   - Capture screenshot
   - Log to evidence

3. **Escalation Triggers**
   After each action, check if any trigger conditions are met.

4. **Evidence Collection**
   - Screenshot: After navigation and significant actions
   - Page text: After reading page content
   - Action log: Every action with timestamp and result

## MCP TOOLS AVAILABLE
- navigate(url, tabId) - Go to URL
- read_page(tabId) - Get page accessibility tree
- get_page_text(tabId) - Get page text content
- find(query, tabId) - Find elements by description
- computer(action: 'screenshot', tabId) - Take screenshot

## OUTPUT FORMAT
After execution, provide:
1. Status (COMPLETED / BLOCKED / ESCALATED / FAILED)
2. Actions executed count
3. Evidence summary
4. Any blockers or escalations encountered

Begin execution now.
`;

// =============================================================================
// EXECUTION HELPER FUNCTIONS
// =============================================================================

/**
 * Generate the execution prompt for Claude
 */
export function generateExecutionPrompt(
  pack: JobPack,
  profile: RiskProfile,
  targetUrl: string
): string {
  return EXECUTION_PROMPT_TEMPLATE
    .replace('{pack_json}', JSON.stringify(pack, null, 2))
    .replace('{profile_json}', JSON.stringify({
      name: profile.appetite.name,
      max_mai_level: profile.appetite.job_pack_policy.max_autonomous_mai_level,
      min_cert_level: profile.appetite.job_pack_policy.min_pack_certification_level,
      forbidden_actions: profile.appetite.action_policy.globally_forbidden_actions,
      require_approval: profile.appetite.action_policy.always_require_approval,
      auto_approved: profile.appetite.action_policy.auto_approved_actions
    }, null, 2))
    .replace('{target_url}', targetUrl)
    .replace('{min_cert_level}', String(profile.appetite.job_pack_policy.min_pack_certification_level))
    .replace('{max_mai_level}', profile.appetite.job_pack_policy.max_autonomous_mai_level);
}

/**
 * Parse Claude's execution response into structured result
 */
export function parseExecutionResponse(response: string): Partial<ExecutionResult> {
  // Extract status
  const statusMatch = response.match(/Status[:\s]+(\w+)/i);
  const status = statusMatch ? statusMatch[1].toUpperCase() : 'UNKNOWN';

  // Extract action count
  const actionsMatch = response.match(/Actions?\s+executed[:\s]+(\d+)/i);
  const actionsExecuted = actionsMatch ? parseInt(actionsMatch[1]) : 0;

  return {
    status: status as any,
    actions_executed: actionsExecuted,
    success: status === 'COMPLETED'
  };
}

// =============================================================================
// EXAMPLE USAGE
// =============================================================================

/**
 * EXAMPLE: How to use this with Claude Desktop
 *
 * 1. User asks: "Execute the GrantsGov pack against grants.gov"
 *
 * 2. Claude reads the pack file:
 *    - Uses Read tool to get workforce/jobpacks/GrantsGovOpportunityFinder.json
 *
 * 3. Claude loads appropriate profile:
 *    - Reads from governance/RiskProfileSchema.ts
 *    - Or user specifies: "use CONSERVATIVE profile"
 *
 * 4. Claude generates execution prompt internally
 *
 * 5. Claude executes step by step:
 *    - Checks gates
 *    - Creates browser tab
 *    - Navigates to URL
 *    - Executes procedure steps with MAI checks
 *    - Captures evidence
 *
 * 6. Claude reports results and evidence bundle
 */

export const USAGE_EXAMPLE = `
## How to Execute a Job Pack with Claude

### Option 1: Claude Desktop + MCP

1. Ensure Claude in Chrome MCP server is connected
2. Tell Claude:
   "Execute the GrantsGov Job Pack against https://grants.gov
    Use the BALANCED risk profile.
    Follow the execution protocol in executor/MCPBrowserAdapter.ts"

3. Claude will:
   - Read the pack file
   - Check all gates
   - Execute procedure steps with MCP tools
   - Capture evidence
   - Report results

### Option 2: Chrome Extension Direct

1. Open Claude in Chrome extension
2. Navigate to target site
3. Tell Claude:
   "I want to run a Job Pack. The pack is at:
    [paste pack JSON or file path]

    Follow MAI boundaries:
    - INFORMATIONAL: execute automatically
    - ADVISORY: ask me before proceeding
    - MANDATORY: always ask me first"

### Evidence Output

Claude will produce an evidence bundle containing:
- gate_checks.json - Pre-execution gate results
- action_log.json - Every action with timestamps
- screenshots/ - Visual evidence
- page_content.txt - Extracted text
- manifest.json - Artifact inventory with hashes
`;

export default {
  generateExecutionPrompt,
  parseExecutionResponse,
  EXECUTION_PROMPT_TEMPLATE,
  USAGE_EXAMPLE
};
