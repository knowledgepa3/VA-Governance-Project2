/**
 * Agent Team Dashboard - Manage Your AI Workforce
 *
 * See all your specialized agents, their capabilities,
 * and launch workflows that coordinate multiple agents.
 *
 * NOW WITH ACTUAL WORKFLOW EXECUTION!
 */

import React, { useState, useCallback } from 'react';
import {
  Users,
  Bot,
  Play,
  Pause,
  Square,
  Settings,
  CheckCircle2,
  Clock,
  TrendingUp,
  Zap,
  ChevronRight,
  MessageSquare,
  FileText,
  Search,
  Package,
  Link2,
  BarChart3,
  Scale,
  Calendar,
  Mail,
  Shield,
  Activity,
  AlertTriangle,
  Check,
  X,
  Loader2
} from 'lucide-react';
import {
  BUSINESS_AGENTS,
  BusinessAgent,
  WORKFLOW_TEMPLATES,
  WorkflowTemplate,
  getAgentMetrics,
  AgentMetrics
} from '../services/businessAgents';
import {
  UNIFIED_WORKFLOWS,
  UnifiedWorkflowTemplate,
  WorkflowPhase
} from '../services/unifiedWorkflow';
import {
  WorkflowExecutor,
  WorkflowExecution,
  ExecutionLog,
  getWorkflowExecutor
} from '../services/workflowExecutor';

// ============================================================================
// COMPONENT
// ============================================================================

interface AgentTeamDashboardProps {
  onSelectAgent?: (agent: BusinessAgent) => void;
  onStartWorkflow?: (workflow: WorkflowTemplate) => void;
}

export function AgentTeamDashboard({ onSelectAgent, onStartWorkflow }: AgentTeamDashboardProps) {
  const [selectedAgent, setSelectedAgent] = useState<BusinessAgent | null>(null);
  const [selectedWorkflow, setSelectedWorkflow] = useState<WorkflowTemplate | null>(null);
  const [viewMode, setViewMode] = useState<'agents' | 'workflows' | 'unified'>('agents');
  const [metrics] = useState<AgentMetrics[]>(getAgentMetrics());

  // Execution state
  const [isExecuting, setIsExecuting] = useState(false);
  const [execution, setExecution] = useState<WorkflowExecution | null>(null);
  const [executionLogs, setExecutionLogs] = useState<ExecutionLog[]>([]);
  const [awaitingApproval, setAwaitingApproval] = useState(false);
  const [pendingApprovalStep, setPendingApprovalStep] = useState<any>(null);
  const [selectedUnifiedWorkflow, setSelectedUnifiedWorkflow] = useState<UnifiedWorkflowTemplate | null>(null);

  // Workflow executor reference
  const [executor, setExecutor] = useState<WorkflowExecutor | null>(null);

  // Start unified workflow execution
  const handleStartUnifiedWorkflow = useCallback(async (workflow: UnifiedWorkflowTemplate) => {
    setIsExecuting(true);
    setExecutionLogs([]);
    setExecution(null);

    const newExecutor = getWorkflowExecutor({
      onStepStart: (step, exec) => {
        setExecution({ ...exec });
      },
      onStepComplete: (step, output, exec) => {
        setExecution({ ...exec });
        setExecutionLogs([...exec.logs]);
      },
      onAwaitingApproval: (step, output, exec) => {
        setAwaitingApproval(true);
        setPendingApprovalStep({ step, output });
        setExecution({ ...exec });
      },
      onApprovalGranted: (step, exec) => {
        setAwaitingApproval(false);
        setPendingApprovalStep(null);
      },
      onCUEDiscovered: (finding, exec) => {
        console.log('CUE DISCOVERED:', finding);
        setExecution({ ...exec });
      },
      onRetroDiscovered: (finding, exec) => {
        console.log('RETRO DISCOVERED:', finding);
        setExecution({ ...exec });
      },
      onWorkflowComplete: (exec) => {
        setIsExecuting(false);
        setExecution({ ...exec });
        setExecutionLogs([...exec.logs]);
      },
      onError: (error, step, exec) => {
        console.error('Workflow error:', error);
        setExecution({ ...exec });
      },
      onLog: (log) => {
        setExecutionLogs(prev => [...prev, log]);
      }
    });

    setExecutor(newExecutor);

    try {
      // Start the workflow with a test case ID
      const result = await newExecutor.startWorkflow(
        `CASE-${Date.now()}`,
        workflow.claimTypes[0] || 'NEW_CLAIM',
        workflow
      );
      setExecution(result);
    } catch (error) {
      console.error('Workflow execution error:', error);
      setIsExecuting(false);
    }
  }, []);

  // Handle approval
  const handleApprove = useCallback(() => {
    if (executor) {
      executor.grantApproval();
    }
  }, [executor]);

  const handleDeny = useCallback(() => {
    if (executor) {
      executor.denyApproval();
    }
  }, [executor]);

  // Stop workflow
  const handleStop = useCallback(() => {
    if (executor) {
      executor.stop();
      setIsExecuting(false);
    }
  }, [executor]);

  // Agent role icons
  const agentIcons: Record<string, React.ReactNode> = {
    'intake-agent': <FileText className="w-5 h-5" />,
    'research-agent': <Search className="w-5 h-5" />,
    'evidence-agent': <Package className="w-5 h-5" />,
    'nexus-agent': <Link2 className="w-5 h-5" />,
    'ratings-agent': <BarChart3 className="w-5 h-5" />,
    'appeals-agent': <Scale className="w-5 h-5" />,
    'scheduler-agent': <Calendar className="w-5 h-5" />,
    'comms-agent': <Mail className="w-5 h-5" />,
    'qa-agent': <Shield className="w-5 h-5" />,
    'supervisor-agent': <Activity className="w-5 h-5" />
  };

  // Agent colors
  const agentColors: Record<string, string> = {
    'intake-agent': 'cyan',
    'research-agent': 'purple',
    'evidence-agent': 'green',
    'nexus-agent': 'orange',
    'ratings-agent': 'blue',
    'appeals-agent': 'red',
    'scheduler-agent': 'yellow',
    'comms-agent': 'pink',
    'qa-agent': 'emerald',
    'supervisor-agent': 'indigo'
  };

  // Render agent card
  const renderAgentCard = (agent: BusinessAgent) => {
    const color = agentColors[agent.id] || 'slate';
    const icon = agentIcons[agent.id] || <Bot className="w-5 h-5" />;
    const agentMetrics = metrics.find(m => m.agentId === agent.id);
    const isSelected = selectedAgent?.id === agent.id;

    return (
      <div
        key={agent.id}
        onClick={() => setSelectedAgent(agent)}
        className={`p-4 rounded-xl border cursor-pointer transition-all ${
          isSelected
            ? `border-${color}-500 bg-${color}-500/10 shadow-lg shadow-${color}-500/20`
            : 'border-slate-200 bg-white shadow-sm border border-slate-200 hover:border-slate-600'
        }`}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br from-${color}-500 to-${color}-600 flex items-center justify-center text-slate-900`}>
              {icon}
            </div>
            <div>
              <h4 className="font-medium text-slate-900">{agent.name}</h4>
              <p className="text-xs text-slate-500">{agent.role}</p>
            </div>
          </div>
          <div className={`w-2 h-2 rounded-full ${agent.isActive ? 'bg-green-400' : 'bg-slate-600'}`} />
        </div>

        {/* Description */}
        <p className="text-sm text-slate-500 mb-3 line-clamp-2">
          {agent.description}
        </p>

        {/* Capabilities preview */}
        <div className="flex flex-wrap gap-1 mb-3">
          {agent.capabilities.slice(0, 2).map((cap, i) => (
            <span key={i} className="px-2 py-0.5 bg-slate-700/50 text-slate-600 rounded text-xs">
              {cap}
            </span>
          ))}
          {agent.capabilities.length > 2 && (
            <span className="text-xs text-slate-500">+{agent.capabilities.length - 2} more</span>
          )}
        </div>

        {/* Metrics */}
        {agentMetrics && (
          <div className="flex items-center gap-4 pt-3 border-t border-slate-200/50 text-xs">
            <div className="flex items-center gap-1 text-slate-500">
              <CheckCircle2 className="w-3 h-3 text-green-400" />
              {agentMetrics.tasksCompleted} tasks
            </div>
            <div className="flex items-center gap-1 text-slate-500">
              <TrendingUp className="w-3 h-3 text-blue-600" />
              {agentMetrics.successRate}%
            </div>
          </div>
        )}
      </div>
    );
  };

  // Render agent detail panel
  const renderAgentDetail = () => {
    if (!selectedAgent) {
      return (
        <div className="flex-1 flex items-center justify-center text-slate-500">
          <div className="text-center">
            <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>Select an agent to view details</p>
          </div>
        </div>
      );
    }

    const color = agentColors[selectedAgent.id] || 'slate';
    const icon = agentIcons[selectedAgent.id] || <Bot className="w-5 h-5" />;
    const agentMetrics = metrics.find(m => m.agentId === selectedAgent.id);

    return (
      <div className="flex-1 overflow-y-auto">
        {/* Header */}
        <div className={`p-6 bg-gradient-to-br from-${color}-500/20 to-${color}-600/10 border-b border-slate-200`}>
          <div className="flex items-center gap-4 mb-4">
            <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br from-${color}-500 to-${color}-600 flex items-center justify-center text-slate-900 shadow-lg`}>
              {icon}
            </div>
            <div>
              <h3 className="text-xl font-semibold text-slate-900">{selectedAgent.name}</h3>
              <p className="text-slate-500">{selectedAgent.role}</p>
            </div>
          </div>
          <p className="text-slate-600">{selectedAgent.description}</p>
        </div>

        {/* Capabilities */}
        <div className="p-6 border-b border-slate-200">
          <h4 className="text-sm font-medium text-slate-500 uppercase tracking-wider mb-3">
            Capabilities
          </h4>
          <div className="space-y-2">
            {selectedAgent.capabilities.map((cap, i) => (
              <div key={i} className="flex items-center gap-2 text-slate-600">
                <CheckCircle2 className={`w-4 h-4 text-${color}-400`} />
                {cap}
              </div>
            ))}
          </div>
        </div>

        {/* Tools */}
        <div className="p-6 border-b border-slate-200">
          <h4 className="text-sm font-medium text-slate-500 uppercase tracking-wider mb-3">
            Available Tools
          </h4>
          <div className="flex flex-wrap gap-2">
            {selectedAgent.tools.map((tool, i) => (
              <span key={i} className={`px-3 py-1.5 bg-${color}-500/20 text-${color}-400 rounded-lg text-sm font-medium`}>
                {tool.replace(/_/g, ' ')}
              </span>
            ))}
          </div>
        </div>

        {/* Metrics */}
        {agentMetrics && (
          <div className="p-6 border-b border-slate-200">
            <h4 className="text-sm font-medium text-slate-500 uppercase tracking-wider mb-3">
              Performance
            </h4>
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-white shadow-sm border border-slate-200 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-slate-900">{agentMetrics.tasksCompleted}</div>
                <div className="text-xs text-slate-500">Tasks Completed</div>
              </div>
              <div className="bg-white shadow-sm border border-slate-200 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-green-400">{agentMetrics.successRate}%</div>
                <div className="text-xs text-slate-500">Success Rate</div>
              </div>
              <div className="bg-white shadow-sm border border-slate-200 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-blue-600">{agentMetrics.averageTaskTime}m</div>
                <div className="text-xs text-slate-500">Avg Time</div>
              </div>
            </div>
          </div>
        )}

        {/* Governance */}
        <div className="p-6 border-b border-slate-200">
          <h4 className="text-sm font-medium text-slate-500 uppercase tracking-wider mb-3">
            Governance Controls
          </h4>
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2 text-slate-600">
              <Shield className="w-4 h-4 text-green-400" />
              Domain restricted to .gov sites only
            </div>
            <div className="flex items-center gap-2 text-slate-600">
              <Shield className="w-4 h-4 text-green-400" />
              All actions logged with audit trail
            </div>
            <div className="flex items-center gap-2 text-slate-600">
              <Shield className="w-4 h-4 text-green-400" />
              Evidence captured with SHA-256 hashes
            </div>
            <div className="flex items-center gap-2 text-slate-600">
              <Shield className="w-4 h-4 text-green-400" />
              Sensitive actions require human approval
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="p-6">
          <button
            onClick={() => onSelectAgent?.(selectedAgent)}
            className={`w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-${color}-600 to-${color}-500 hover:from-${color}-500 hover:to-${color}-400 text-slate-900 rounded-xl font-medium transition-all`}
          >
            <MessageSquare className="w-5 h-5" />
            Chat with {selectedAgent.name}
          </button>
        </div>
      </div>
    );
  };

  // Render workflow card
  const renderWorkflowCard = (workflow: WorkflowTemplate) => {
    const isSelected = selectedWorkflow?.id === workflow.id;

    return (
      <div
        key={workflow.id}
        onClick={() => setSelectedWorkflow(workflow)}
        className={`p-4 rounded-xl border cursor-pointer transition-all ${
          isSelected
            ? 'border-cyan-500 bg-cyan-500/10 shadow-lg'
            : 'border-slate-200 bg-white shadow-sm border border-slate-200 hover:border-slate-600'
        }`}
      >
        <div className="flex items-center justify-between mb-2">
          <h4 className="font-medium text-slate-900">{workflow.name}</h4>
          <span className="text-xs text-slate-500">{workflow.estimatedTime}</span>
        </div>
        <p className="text-sm text-slate-500 mb-3">{workflow.description}</p>

        {/* Steps preview */}
        <div className="flex items-center gap-1">
          {workflow.steps.slice(0, 4).map((step, i) => {
            const agent = BUSINESS_AGENTS.find(a => a.id === step.agentId);
            const color = agentColors[step.agentId] || 'slate';
            return (
              <React.Fragment key={i}>
                <div
                  className={`w-6 h-6 rounded-full bg-${color}-500/20 flex items-center justify-center`}
                  title={agent?.name}
                >
                  <span className="text-xs">{agent?.avatar}</span>
                </div>
                {i < workflow.steps.length - 1 && i < 3 && (
                  <ChevronRight className="w-3 h-3 text-slate-600" />
                )}
              </React.Fragment>
            );
          })}
          {workflow.steps.length > 4 && (
            <span className="text-xs text-slate-500 ml-1">+{workflow.steps.length - 4}</span>
          )}
        </div>
      </div>
    );
  };

  // Render workflow detail
  const renderWorkflowDetail = () => {
    if (!selectedWorkflow) {
      return (
        <div className="flex-1 flex items-center justify-center text-slate-500">
          <div className="text-center">
            <Zap className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>Select a workflow to view details</p>
          </div>
        </div>
      );
    }

    return (
      <div className="flex-1 overflow-y-auto">
        {/* Header */}
        <div className="p-6 bg-gradient-to-br from-cyan-500/20 to-purple-500/10 border-b border-slate-200">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-500 to-purple-500 flex items-center justify-center text-slate-900 shadow-lg">
              <Zap className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-slate-900">{selectedWorkflow.name}</h3>
              <p className="text-slate-500">Estimated: {selectedWorkflow.estimatedTime}</p>
            </div>
          </div>
          <p className="text-slate-600">{selectedWorkflow.description}</p>
        </div>

        {/* Steps */}
        <div className="p-6">
          <h4 className="text-sm font-medium text-slate-500 uppercase tracking-wider mb-4">
            Workflow Steps
          </h4>
          <div className="space-y-4">
            {selectedWorkflow.steps.map((step, i) => {
              const agent = BUSINESS_AGENTS.find(a => a.id === step.agentId);
              const color = agentColors[step.agentId] || 'slate';

              return (
                <div key={i} className="relative">
                  {/* Connector line */}
                  {i < selectedWorkflow.steps.length - 1 && (
                    <div className="absolute left-5 top-12 bottom-0 w-0.5 bg-slate-700" />
                  )}

                  <div className="flex items-start gap-4">
                    {/* Step number */}
                    <div className={`w-10 h-10 rounded-full bg-${color}-500/20 border-2 border-${color}-500 flex items-center justify-center text-${color}-400 font-bold z-10`}>
                      {step.order}
                    </div>

                    {/* Step content */}
                    <div className="flex-1 bg-white shadow-sm border border-slate-200 rounded-lg p-4 border border-slate-200">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-lg">{agent?.avatar}</span>
                        <span className="font-medium text-slate-900">{agent?.name}</span>
                        {step.requiresApproval && (
                          <span className="px-2 py-0.5 bg-yellow-500/20 text-yellow-400 rounded text-xs">
                            Requires Approval
                          </span>
                        )}
                      </div>
                      <p className="text-slate-600 mb-3">{step.task}</p>

                      <div className="grid grid-cols-2 gap-4 text-xs">
                        <div>
                          <span className="text-slate-500">Inputs:</span>
                          <ul className="text-slate-500 mt-1">
                            {step.inputs.map((input, j) => (
                              <li key={j}>• {input}</li>
                            ))}
                          </ul>
                        </div>
                        <div>
                          <span className="text-slate-500">Outputs:</span>
                          <ul className="text-slate-500 mt-1">
                            {step.outputs.map((output, j) => (
                              <li key={j}>• {output}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Actions */}
        <div className="p-6 border-t border-slate-200">
          <button
            onClick={() => onStartWorkflow?.(selectedWorkflow)}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-cyan-600 to-purple-600 hover:from-cyan-500 hover:to-purple-500 text-slate-900 rounded-xl font-medium transition-all"
          >
            <Play className="w-5 h-5" />
            Start Workflow
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col bg-slate-50">
      {/* Header */}
      <div className="p-4 border-b border-slate-200">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-r from-cyan-500/20 to-purple-500/20 rounded-xl">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Agent Team</h2>
              <p className="text-xs text-slate-500">Your AI workforce - all governed by ACE</p>
            </div>
          </div>

          {/* View toggle */}
          <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('agents')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                viewMode === 'agents'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Agents
            </button>
            <button
              onClick={() => setViewMode('unified')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                viewMode === 'unified'
                  ? 'bg-green-600 text-white'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Run Workflow
            </button>
            <button
              onClick={() => setViewMode('workflows')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                viewMode === 'workflows'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Templates
            </button>
          </div>
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-4 gap-3">
          <div className="bg-white shadow-sm border border-slate-200 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-slate-900">{BUSINESS_AGENTS.length}</div>
            <div className="text-xs text-slate-500">Active Agents</div>
          </div>
          <div className="bg-white shadow-sm border border-slate-200 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-blue-600">
              {metrics.reduce((sum, m) => sum + m.tasksCompleted, 0)}
            </div>
            <div className="text-xs text-slate-500">Tasks Completed</div>
          </div>
          <div className="bg-white shadow-sm border border-slate-200 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-green-400">
              {Math.round(metrics.reduce((sum, m) => sum + m.successRate, 0) / metrics.length)}%
            </div>
            <div className="text-xs text-slate-500">Avg Success Rate</div>
          </div>
          <div className="bg-white shadow-sm border border-slate-200 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-purple-400">{WORKFLOW_TEMPLATES.length}</div>
            <div className="text-xs text-slate-500">Workflows</div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex overflow-hidden">
        {viewMode === 'unified' ? (
          // UNIFIED WORKFLOW EXECUTION VIEW
          <div className="flex-1 flex">
            {/* Workflow Selection */}
            <div className="w-[350px] border-r border-slate-200 overflow-y-auto p-4 space-y-3">
              <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wider mb-3">
                Select Workflow to Execute
              </h3>
              {UNIFIED_WORKFLOWS.map((workflow) => (
                <div
                  key={workflow.id}
                  onClick={() => !isExecuting && setSelectedUnifiedWorkflow(workflow)}
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${
                    selectedUnifiedWorkflow?.id === workflow.id
                      ? 'border-green-500 bg-green-500/10 shadow-lg'
                      : 'border-slate-200 bg-white hover:border-green-300'
                  } ${isExecuting ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-slate-900">{workflow.name}</h4>
                    <span className="text-xs text-slate-500">{workflow.estimatedTime}</span>
                  </div>
                  <p className="text-sm text-slate-600 mb-2">{workflow.description}</p>
                  <div className="flex flex-wrap gap-1">
                    {workflow.claimTypes.map((type, i) => (
                      <span key={i} className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-xs">
                        {type}
                      </span>
                    ))}
                  </div>
                  <div className="mt-2 text-xs text-slate-500">
                    {workflow.steps.length} steps
                  </div>
                </div>
              ))}
            </div>

            {/* Execution Panel */}
            <div className="flex-1 flex flex-col overflow-hidden">
              {selectedUnifiedWorkflow ? (
                <>
                  {/* Workflow Header */}
                  <div className="p-4 bg-gradient-to-r from-green-50 to-blue-50 border-b border-slate-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-semibold text-slate-900">
                          {selectedUnifiedWorkflow.name}
                        </h3>
                        <p className="text-sm text-slate-600">
                          {selectedUnifiedWorkflow.steps.length} steps • {selectedUnifiedWorkflow.estimatedTime}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {!isExecuting ? (
                          <button
                            onClick={() => handleStartUnifiedWorkflow(selectedUnifiedWorkflow)}
                            className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg font-medium transition-all"
                          >
                            <Play className="w-4 h-4" />
                            Execute Workflow
                          </button>
                        ) : (
                          <button
                            onClick={handleStop}
                            className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg font-medium transition-all"
                          >
                            <Square className="w-4 h-4" />
                            Stop
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Execution Status */}
                    {execution && (
                      <div className="mt-3 flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          {isExecuting ? (
                            <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
                          ) : execution.workflow.status === 'COMPLETE' ? (
                            <CheckCircle2 className="w-4 h-4 text-green-600" />
                          ) : (
                            <Clock className="w-4 h-4 text-slate-400" />
                          )}
                          <span className="text-sm font-medium">
                            Step {execution.workflow.currentStep} of {execution.workflow.totalSteps}
                          </span>
                        </div>
                        <div className="flex-1 bg-slate-200 rounded-full h-2">
                          <div
                            className="bg-green-600 h-2 rounded-full transition-all"
                            style={{
                              width: `${(execution.workflow.currentStep / execution.workflow.totalSteps) * 100}%`
                            }}
                          />
                        </div>
                        {execution.workflow.cueRegistry.findings.length > 0 && (
                          <div className="flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-700 rounded text-xs font-medium">
                            <AlertTriangle className="w-3 h-3" />
                            {execution.workflow.cueRegistry.findings.length} CUE Found
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Approval Dialog */}
                  {awaitingApproval && pendingApprovalStep && (
                    <div className="p-4 bg-yellow-50 border-b border-yellow-200">
                      <div className="flex items-start gap-3">
                        <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
                        <div className="flex-1">
                          <h4 className="font-medium text-yellow-800">Approval Required</h4>
                          <p className="text-sm text-yellow-700 mt-1">
                            Step {pendingApprovalStep.step.order}: {pendingApprovalStep.step.task}
                          </p>
                          <p className="text-xs text-yellow-600 mt-1">
                            Agent: {pendingApprovalStep.step.agentName}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={handleDeny}
                            className="flex items-center gap-1 px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg text-sm font-medium"
                          >
                            <X className="w-4 h-4" />
                            Deny
                          </button>
                          <button
                            onClick={handleApprove}
                            className="flex items-center gap-1 px-3 py-1.5 bg-green-600 hover:bg-green-500 text-white rounded-lg text-sm font-medium"
                          >
                            <Check className="w-4 h-4" />
                            Approve
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Execution Logs */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-2">
                    <h4 className="text-sm font-semibold text-slate-700 uppercase tracking-wider mb-3">
                      Execution Log
                    </h4>
                    {executionLogs.length === 0 ? (
                      <div className="text-center py-8 text-slate-500">
                        <Zap className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p>Click "Execute Workflow" to start</p>
                      </div>
                    ) : (
                      executionLogs.map((log, i) => (
                        <div
                          key={i}
                          className={`p-3 rounded-lg border ${
                            log.status === 'COMPLETED'
                              ? 'bg-green-50 border-green-200'
                              : log.status === 'FAILED'
                              ? 'bg-red-50 border-red-200'
                              : log.status === 'AWAITING_APPROVAL'
                              ? 'bg-yellow-50 border-yellow-200'
                              : 'bg-blue-50 border-blue-200'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              {log.status === 'COMPLETED' && <CheckCircle2 className="w-4 h-4 text-green-600" />}
                              {log.status === 'STARTED' && <Play className="w-4 h-4 text-blue-600" />}
                              {log.status === 'IN_PROGRESS' && <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />}
                              {log.status === 'AWAITING_APPROVAL' && <AlertTriangle className="w-4 h-4 text-yellow-600" />}
                              {log.status === 'FAILED' && <X className="w-4 h-4 text-red-600" />}
                              <span className="font-medium text-slate-900">
                                Step {log.step}: {log.agentName}
                              </span>
                            </div>
                            <span className="text-xs text-slate-500">
                              {new Date(log.timestamp).toLocaleTimeString()}
                            </span>
                          </div>
                          <p className="text-sm text-slate-600 mt-1 ml-6">{log.action}</p>
                          {log.durationMs && (
                            <p className="text-xs text-slate-500 mt-1 ml-6">
                              Duration: {log.durationMs}ms
                            </p>
                          )}
                          {log.cueDiscovered && log.cueDiscovered.length > 0 && (
                            <div className="mt-2 ml-6 p-2 bg-yellow-100 rounded text-xs">
                              <strong className="text-yellow-800">CUE Discovered:</strong>
                              <span className="text-yellow-700 ml-1">
                                {log.cueDiscovered[0].errorType} - {log.cueDiscovered[0].conditionAffected}
                              </span>
                            </div>
                          )}
                          {log.hash && (
                            <p className="text-xs text-slate-400 mt-1 ml-6 font-mono">
                              Hash: {log.hash.substring(0, 16)}...
                            </p>
                          )}
                        </div>
                      ))
                    )}
                  </div>

                  {/* CUE/Retro Findings Summary */}
                  {execution && (execution.workflow.cueRegistry.findings.length > 0 || execution.workflow.retroRegistry.findings.length > 0) && (
                    <div className="p-4 border-t border-slate-200 bg-slate-50">
                      <h4 className="text-sm font-semibold text-slate-700 mb-2">Discoveries</h4>
                      <div className="grid grid-cols-2 gap-3">
                        {execution.workflow.cueRegistry.findings.length > 0 && (
                          <div className="p-3 bg-yellow-100 rounded-lg">
                            <div className="font-medium text-yellow-800">
                              {execution.workflow.cueRegistry.findings.length} CUE Finding(s)
                            </div>
                            <div className="text-sm text-yellow-700">
                              {execution.workflow.cueRegistry.strongFindings} strong,{' '}
                              {execution.workflow.cueRegistry.moderateFindings} moderate
                            </div>
                            <div className="text-xs text-yellow-600 mt-1">
                              Potential back pay: {execution.workflow.cueRegistry.totalPotentialBackPayMonths} months
                            </div>
                          </div>
                        )}
                        {execution.workflow.retroRegistry.findings.length > 0 && (
                          <div className="p-3 bg-blue-100 rounded-lg">
                            <div className="font-medium text-blue-800">
                              {execution.workflow.retroRegistry.findings.length} Retro Finding(s)
                            </div>
                            <div className="text-xs text-blue-600 mt-1">
                              Potential months: {execution.workflow.retroRegistry.totalPotentialMonths}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center text-slate-500">
                  <div className="text-center">
                    <Zap className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>Select a workflow to execute</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          // ORIGINAL AGENTS/WORKFLOWS VIEW
          <>
            {/* List */}
            <div className="w-[400px] border-r border-slate-200 overflow-y-auto p-4 space-y-3">
              {viewMode === 'agents'
                ? BUSINESS_AGENTS.map(renderAgentCard)
                : WORKFLOW_TEMPLATES.map(renderWorkflowCard)
              }
            </div>

            {/* Detail */}
            {viewMode === 'agents' ? renderAgentDetail() : renderWorkflowDetail()}
          </>
        )}
      </div>
    </div>
  );
}

export default AgentTeamDashboard;
