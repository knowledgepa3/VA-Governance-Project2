/**
 * Bundle Execution Bridge - Connects ACE Agent to Chrome MCP
 *
 * This component listens for bundle execution requests from the ACE Agent
 * and displays them for the user to execute via Claude Code + Chrome MCP.
 *
 * THE FLOW:
 * 1. User asks ACE Agent to "run research for case X"
 * 2. ACE Agent calls run_bundle_for_case tool
 * 3. Tool emits event via mcpBridge
 * 4. This component catches the event and shows a panel
 * 5. User clicks "Execute with Claude"
 * 6. Panel shows the exact instructions for Claude Code to execute
 *
 * This creates the human-in-the-loop governance while enabling
 * real browser automation through the Chrome MCP.
 */

import React, { useState, useEffect } from 'react';
import {
  Play,
  X,
  ExternalLink,
  Shield,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Copy,
  Globe,
  FileText,
  Clock,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { mcpBridge, MCPBundleExecutionRequest } from '../services/mcpBridge';

interface PendingExecution {
  request: MCPBundleExecutionRequest;
  caseId?: string;
  caseName?: string;
  status: 'pending' | 'instructions-shown' | 'executing' | 'complete' | 'cancelled';
}

export function BundleExecutionBridge() {
  const [pendingExecutions, setPendingExecutions] = useState<PendingExecution[]>([]);
  const [expandedExecution, setExpandedExecution] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Listen for bundle execution requests
  useEffect(() => {
    const handleExecutionRequest = (data: any) => {
      console.log('[Bundle Bridge] Received execution request:', data);

      const execution: PendingExecution = {
        request: {
          requestId: data.bundleRunId || `bundle-${Date.now()}`,
          type: 'bundle',
          bundleId: data.bundleId,
          bundleName: data.bundleName,
          tabs: data.tabs,
          workflow: data.workflow,
          governance: data.governance,
          timestamp: new Date().toISOString()
        },
        caseId: data.caseId,
        caseName: data.message,
        status: 'pending'
      };

      setPendingExecutions(prev => [...prev, execution]);
      setExpandedExecution(execution.request.requestId);
    };

    // Subscribe to the event from aceAgentTools
    const unsubscribe = mcpBridge.on('execution:request', handleExecutionRequest);

    return () => {
      unsubscribe();
    };
  }, []);

  // Generate Claude Code instructions for execution
  const generateClaudeInstructions = (exec: PendingExecution): string => {
    const { request } = exec;

    return `## Execute ACE Bundle: ${request.bundleName}

### Governance Controls (MUST FOLLOW):
- **Allowed Domains**: ${request.governance.allowedDomains.join(', ')}
- **Stop Conditions**: ${request.governance.stopConditions.join(', ')}
- **Gates Required**: ${request.governance.requiresGateApproval ? 'Yes - pause before sensitive actions' : 'No'}

### Step-by-Step Execution:

${request.tabs.map((tab, i) => `
**Tab ${i + 1}: ${tab.name}** (${tab.role})
1. Navigate to: ${tab.startUrl}
2. Take screenshot for evidence
3. Extract relevant data per workflow
`).join('\n')}

### Workflow Steps:
${request.workflow.steps.map((step, i) => `
${i + 1}. **${step.name}** (Tab: ${step.tabId})
   - Action: ${step.action}
   ${step.extractionRules ? `- Extract: ${step.extractionRules.map(r => r.name).join(', ')}` : ''}
   ${step.waitForSelector ? `- Wait for: ${step.waitForSelector}` : ''}
`).join('')}

### Evidence Capture:
- Screenshot each page after loading
- Extract text content matching workflow rules
- Hash all captured data with SHA-256
- Log all actions for audit trail

**Case ID**: ${exec.caseId || 'N/A'}
**Request ID**: ${request.requestId}
`;
  };

  // Copy instructions to clipboard
  const copyInstructions = async (exec: PendingExecution) => {
    const instructions = generateClaudeInstructions(exec);
    await navigator.clipboard.writeText(instructions);
    setCopiedId(exec.request.requestId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Mark as executing
  const markExecuting = (requestId: string) => {
    setPendingExecutions(prev =>
      prev.map(e =>
        e.request.requestId === requestId
          ? { ...e, status: 'executing' }
          : e
      )
    );
  };

  // Mark as complete
  const markComplete = (requestId: string) => {
    setPendingExecutions(prev =>
      prev.map(e =>
        e.request.requestId === requestId
          ? { ...e, status: 'complete' }
          : e
      )
    );

    // Emit completion event back to the system
    mcpBridge.emit('bundle-execution-complete', { requestId });
  };

  // Cancel execution
  const cancelExecution = (requestId: string) => {
    setPendingExecutions(prev =>
      prev.filter(e => e.request.requestId !== requestId)
    );
  };

  // Clear completed
  const clearCompleted = () => {
    setPendingExecutions(prev =>
      prev.filter(e => e.status !== 'complete' && e.status !== 'cancelled')
    );
  };

  if (pendingExecutions.length === 0) {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 w-[480px] max-h-[80vh] overflow-y-auto bg-slate-900 border border-slate-700 rounded-xl shadow-2xl z-[100]">
      {/* Header */}
      <div className="sticky top-0 bg-slate-900 border-b border-slate-700 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-cyan-500/20 rounded-lg">
            <Play className="w-4 h-4 text-cyan-400" />
          </div>
          <div>
            <h3 className="font-medium text-white text-sm">Bundle Execution Queue</h3>
            <p className="text-xs text-slate-400">{pendingExecutions.length} pending</p>
          </div>
        </div>
        {pendingExecutions.some(e => e.status === 'complete') && (
          <button
            onClick={clearCompleted}
            className="text-xs text-slate-400 hover:text-white"
          >
            Clear completed
          </button>
        )}
      </div>

      {/* Executions List */}
      <div className="divide-y divide-slate-700/50">
        {pendingExecutions.map((exec) => (
          <div key={exec.request.requestId} className="p-4">
            {/* Execution Header */}
            <div
              className="flex items-center justify-between cursor-pointer"
              onClick={() => setExpandedExecution(
                expandedExecution === exec.request.requestId ? null : exec.request.requestId
              )}
            >
              <div className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full ${
                  exec.status === 'pending' ? 'bg-yellow-400' :
                  exec.status === 'executing' ? 'bg-cyan-400 animate-pulse' :
                  exec.status === 'complete' ? 'bg-green-400' :
                  'bg-slate-500'
                }`} />
                <div>
                  <h4 className="font-medium text-white text-sm">{exec.request.bundleName}</h4>
                  <p className="text-xs text-slate-400">{exec.caseName}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`px-2 py-0.5 rounded text-xs ${
                  exec.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                  exec.status === 'executing' ? 'bg-cyan-500/20 text-cyan-400' :
                  exec.status === 'complete' ? 'bg-green-500/20 text-green-400' :
                  'bg-slate-500/20 text-slate-400'
                }`}>
                  {exec.status}
                </span>
                {expandedExecution === exec.request.requestId ? (
                  <ChevronUp className="w-4 h-4 text-slate-400" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                )}
              </div>
            </div>

            {/* Expanded Content */}
            {expandedExecution === exec.request.requestId && (
              <div className="mt-4 space-y-4">
                {/* Governance Badge */}
                <div className="flex items-center gap-2 p-2 bg-green-500/10 border border-green-500/30 rounded-lg">
                  <Shield className="w-4 h-4 text-green-400" />
                  <span className="text-xs text-green-400">
                    Governed: {exec.request.governance.allowedDomains.join(', ')} only
                  </span>
                </div>

                {/* Tabs to Open */}
                <div>
                  <h5 className="text-xs font-medium text-slate-400 uppercase mb-2">Tabs to Open</h5>
                  <div className="space-y-2">
                    {exec.request.tabs.map((tab, i) => (
                      <div key={tab.id} className="flex items-center gap-2 p-2 bg-slate-800/50 rounded-lg">
                        <Globe className="w-4 h-4 text-slate-400" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-white truncate">{tab.name}</p>
                          <p className="text-xs text-slate-500 truncate">{tab.startUrl}</p>
                        </div>
                        <a
                          href={tab.startUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1 text-slate-400 hover:text-cyan-400"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Workflow Steps Preview */}
                <div>
                  <h5 className="text-xs font-medium text-slate-400 uppercase mb-2">Workflow Steps</h5>
                  <div className="space-y-1">
                    {exec.request.workflow.steps.slice(0, 3).map((step, i) => (
                      <div key={step.id} className="flex items-center gap-2 text-xs text-slate-300">
                        <span className="w-5 h-5 rounded-full bg-slate-700 flex items-center justify-center text-slate-400">
                          {i + 1}
                        </span>
                        <span>{step.name}</span>
                      </div>
                    ))}
                    {exec.request.workflow.steps.length > 3 && (
                      <p className="text-xs text-slate-500 pl-7">
                        +{exec.request.workflow.steps.length - 3} more steps
                      </p>
                    )}
                  </div>
                </div>

                {/* Instructions for Claude */}
                <div className="p-3 bg-slate-800 rounded-lg border border-slate-700">
                  <div className="flex items-center justify-between mb-2">
                    <h5 className="text-xs font-medium text-cyan-400">
                      📋 Instructions for Claude Code
                    </h5>
                    <button
                      onClick={() => copyInstructions(exec)}
                      className="flex items-center gap-1 px-2 py-1 text-xs bg-slate-700 hover:bg-slate-600 text-white rounded transition-colors"
                    >
                      {copiedId === exec.request.requestId ? (
                        <>
                          <CheckCircle2 className="w-3 h-3 text-green-400" />
                          Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          Copy
                        </>
                      )}
                    </button>
                  </div>
                  <p className="text-xs text-slate-400">
                    Copy these instructions and paste them to Claude Code to execute
                    this bundle using the Chrome MCP tools. Claude will navigate to
                    each URL, capture screenshots, and extract evidence.
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2">
                  {exec.status === 'pending' && (
                    <>
                      <button
                        onClick={() => markExecuting(exec.request.requestId)}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-sm font-medium transition-colors"
                      >
                        <Play className="w-4 h-4" />
                        Mark as Executing
                      </button>
                      <button
                        onClick={() => cancelExecution(exec.request.requestId)}
                        className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm transition-colors"
                      >
                        Cancel
                      </button>
                    </>
                  )}
                  {exec.status === 'executing' && (
                    <button
                      onClick={() => markComplete(exec.request.requestId)}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg text-sm font-medium transition-colors"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      Mark Complete
                    </button>
                  )}
                  {exec.status === 'complete' && (
                    <div className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-500/20 text-green-400 rounded-lg text-sm">
                      <CheckCircle2 className="w-4 h-4" />
                      Execution Complete
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default BundleExecutionBridge;
