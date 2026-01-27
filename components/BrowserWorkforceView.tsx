import React, { useState, useEffect } from 'react';
import {
  Monitor,
  Play,
  Pause,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Eye,
  Maximize2,
  Terminal,
  Clock,
  Activity
} from 'lucide-react';
import { BrowserAgentState, BrowserAgentStatus, MAIClassification } from '../types';

interface PendingApproval {
  agentId: string;
  action: string;
  screenshot: string;
  classification: MAIClassification;
}

export const BrowserWorkforceView: React.FC = () => {
  const [agents, setAgents] = useState<BrowserAgentState[]>([]);
  const [pendingApprovals, setPendingApprovals] = useState<PendingApproval[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const [newTaskUrl, setNewTaskUrl] = useState('');

  // Simulated agent states for demo
  useEffect(() => {
    // Initialize with demo agents
    setAgents([
      {
        id: 'BA-001',
        task: 'Submit VA disability claim (Case #12345)',
        status: BrowserAgentStatus.AWAITING_APPROVAL,
        classification: MAIClassification.MANDATORY,
        currentAction: 'Click "Submit Claim" button',
        screenshot: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        progress: 85,
        logs: [
          'Navigated to va.gov/claims',
          'Filled veteran information',
          'Uploaded medical records',
          'Reviewed claim summary',
          '⚠ Requesting approval to submit'
        ]
      },
      {
        id: 'BA-002',
        task: 'Submit VA disability claim (Case #12346)',
        status: BrowserAgentStatus.WORKING,
        classification: MAIClassification.MANDATORY,
        currentAction: 'Uploading medical documents',
        progress: 60,
        logs: [
          'Navigated to va.gov/claims',
          'Filled veteran information',
          'Uploading documents...'
        ]
      },
      {
        id: 'BA-003',
        task: 'Submit VA disability claim (Case #12347)',
        status: BrowserAgentStatus.COMPLETE,
        classification: MAIClassification.MANDATORY,
        currentAction: 'Task completed',
        progress: 100,
        logs: [
          'Navigated to va.gov/claims',
          'Filled veteran information',
          'Uploaded medical records',
          'Claim submitted successfully',
          '✓ Confirmation #VAC-2024-12347'
        ]
      }
    ]);

    // Simulate pending approval
    setPendingApprovals([
      {
        agentId: 'BA-001',
        action: 'Submit VA claim form',
        screenshot: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        classification: MAIClassification.MANDATORY
      }
    ]);
  }, []);

  const getStatusColor = (status: BrowserAgentStatus) => {
    switch (status) {
      case BrowserAgentStatus.COMPLETE:
        return 'text-emerald-600 bg-emerald-50 border-emerald-200';
      case BrowserAgentStatus.WORKING:
      case BrowserAgentStatus.NAVIGATING:
        return 'text-blue-600 bg-blue-50 border-blue-200';
      case BrowserAgentStatus.AWAITING_APPROVAL:
        return 'text-amber-600 bg-amber-50 border-amber-200';
      case BrowserAgentStatus.ERROR:
        return 'text-rose-600 bg-rose-50 border-rose-200';
      default:
        return 'text-slate-600 bg-slate-50 border-slate-200';
    }
  };

  const getStatusIcon = (status: BrowserAgentStatus) => {
    switch (status) {
      case BrowserAgentStatus.COMPLETE:
        return <CheckCircle2 size={20} className="text-emerald-600" />;
      case BrowserAgentStatus.WORKING:
      case BrowserAgentStatus.NAVIGATING:
        return <Activity size={20} className="text-blue-600 animate-pulse" />;
      case BrowserAgentStatus.AWAITING_APPROVAL:
        return <AlertCircle size={20} className="text-amber-600 animate-pulse" />;
      case BrowserAgentStatus.ERROR:
        return <XCircle size={20} className="text-rose-600" />;
      default:
        return <Clock size={20} className="text-slate-600" />;
    }
  };

  const handleApprove = (agentId: string) => {
    // Remove from pending approvals
    setPendingApprovals(prev => prev.filter(p => p.agentId !== agentId));

    // Update agent status
    setAgents(prev => prev.map(agent =>
      agent.id === agentId
        ? {
            ...agent,
            status: BrowserAgentStatus.WORKING,
            logs: [...agent.logs, '✓ Approved by human overseer', 'Submitting claim...']
          }
        : agent
    ));

    // Simulate completion after approval
    setTimeout(() => {
      setAgents(prev => prev.map(agent =>
        agent.id === agentId
          ? {
              ...agent,
              status: BrowserAgentStatus.COMPLETE,
              progress: 100,
              currentAction: 'Task completed',
              logs: [...agent.logs, '✓ Claim submitted successfully', '✓ Confirmation #VAC-2024-12345']
            }
          : agent
      ));
    }, 3000);
  };

  const handleReject = (agentId: string) => {
    setPendingApprovals(prev => prev.filter(p => p.agentId !== agentId));
    setAgents(prev => prev.map(agent =>
      agent.id === agentId
        ? {
            ...agent,
            status: BrowserAgentStatus.ERROR,
            logs: [...agent.logs, '✗ Rejected by human overseer']
          }
        : agent
    ));
  };

  const spawnNewAgent = () => {
    if (!newTaskUrl) return;

    const newAgent: BrowserAgentState = {
      id: `BA-${String(agents.length + 1).padStart(3, '0')}`,
      task: newTaskUrl,
      status: BrowserAgentStatus.INITIALIZING,
      classification: MAIClassification.MANDATORY,
      currentAction: 'Launching browser...',
      progress: 0,
      logs: ['Browser agent spawned']
    };

    setAgents(prev => [...prev, newAgent]);
    setNewTaskUrl('');

    // Simulate initialization
    setTimeout(() => {
      setAgents(prev => prev.map(a =>
        a.id === newAgent.id
          ? { ...a, status: BrowserAgentStatus.WORKING, progress: 10, currentAction: 'Navigating to site' }
          : a
      ));
    }, 1000);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tighter">Browser Workforce</h2>
          <p className="text-slate-500 text-sm font-bold flex items-center gap-2 uppercase tracking-widest mt-1">
            <Monitor size={14} className="text-blue-600" />
            Governed Browser Agent Orchestration
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="px-4 py-2 bg-slate-100 rounded-xl border border-slate-200">
            <span className="text-xs font-black text-slate-600 uppercase tracking-widest">
              Active Agents: {agents.filter(a => a.status !== BrowserAgentStatus.COMPLETE && a.status !== BrowserAgentStatus.ERROR).length}
            </span>
          </div>
        </div>
      </div>

      {/* Spawn New Agent */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
        <h3 className="text-sm font-black uppercase tracking-widest text-slate-800 mb-4">Spawn Browser Agent</h3>
        <div className="flex gap-3">
          <input
            type="text"
            value={newTaskUrl}
            onChange={(e) => setNewTaskUrl(e.target.value)}
            placeholder="Task description or URL..."
            className="flex-1 px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none text-sm font-medium"
          />
          <button
            onClick={spawnNewAgent}
            disabled={!newTaskUrl}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-black text-white transition-all ${
              newTaskUrl
                ? 'bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-200'
                : 'bg-slate-300 cursor-not-allowed'
            }`}
          >
            <Play size={18} fill="currentColor" /> Spawn Agent
          </button>
        </div>
      </div>

      {/* Pending Approvals */}
      {pendingApprovals.length > 0 && (
        <div className="bg-gradient-to-br from-amber-50 to-orange-50 p-8 rounded-3xl border-2 border-amber-200 shadow-2xl">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-amber-600 text-white rounded-2xl shadow-lg">
              <AlertCircle size={24} />
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Human Approval Required</h3>
              <p className="text-sm text-slate-600 font-medium">Review and approve MANDATORY browser actions</p>
            </div>
          </div>

          {pendingApprovals.map(approval => {
            const agent = agents.find(a => a.id === approval.agentId);
            return (
              <div key={approval.agentId} className="bg-white p-6 rounded-2xl border border-amber-200 space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-xs font-black uppercase tracking-widest text-slate-400 mb-1">Agent {approval.agentId}</div>
                    <div className="text-lg font-bold text-slate-900">{agent?.task}</div>
                    <div className="text-sm text-slate-600 font-medium mt-1">
                      Requesting: <span className="font-black text-amber-600">{approval.action}</span>
                    </div>
                  </div>
                  <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest bg-amber-600 text-white">
                    {approval.classification}
                  </span>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => handleApprove(approval.agentId)}
                    className="flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-black text-white bg-emerald-600 hover:bg-emerald-700 transition-all shadow-lg"
                  >
                    <CheckCircle2 size={20} /> Approve Action
                  </button>
                  <button
                    onClick={() => handleReject(approval.agentId)}
                    className="flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-black text-slate-700 bg-white border-2 border-slate-200 hover:bg-slate-50 transition-all"
                  >
                    <XCircle size={20} /> Reject Action
                  </button>
                  <button
                    className="px-4 py-3 rounded-xl font-black text-slate-600 bg-slate-100 hover:bg-slate-200 transition-all"
                    title="View full screenshot"
                  >
                    <Maximize2 size={20} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Active Agents Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {agents.map(agent => (
          <div
            key={agent.id}
            className={`bg-white rounded-3xl border-2 shadow-lg overflow-hidden transition-all hover:shadow-xl ${
              selectedAgent === agent.id ? 'ring-4 ring-blue-300' : ''
            }`}
            onClick={() => setSelectedAgent(agent.id)}
          >
            {/* Agent Header */}
            <div className="p-6 border-b border-slate-100">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  {getStatusIcon(agent.status)}
                  <div>
                    <div className="text-xs font-black uppercase tracking-widest text-slate-400">Agent {agent.id}</div>
                    <div className={`text-xs font-black uppercase tracking-widest mt-0.5 px-2 py-0.5 rounded-full inline-block ${getStatusColor(agent.status)}`}>
                      {agent.status.replace('_', ' ')}
                    </div>
                  </div>
                </div>
                <button className="p-2 hover:bg-slate-100 rounded-lg transition-colors" title="View details">
                  <Eye size={18} className="text-slate-400" />
                </button>
              </div>

              <div className="text-sm font-bold text-slate-900 line-clamp-2">{agent.task}</div>

              {agent.currentAction && (
                <div className="text-xs text-slate-600 font-medium mt-2 flex items-center gap-2">
                  <Terminal size={12} className="text-blue-600" />
                  {agent.currentAction}
                </div>
              )}
            </div>

            {/* Progress Bar */}
            <div className="px-6 py-3 bg-slate-50">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-black text-slate-600 uppercase tracking-widest">Progress</span>
                <span className="text-xs font-black text-blue-600">{agent.progress}%</span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-500"
                  style={{ width: `${agent.progress}%` }}
                />
              </div>
            </div>

            {/* Activity Log */}
            <div className="p-6 bg-slate-900 max-h-48 overflow-y-auto">
              <div className="space-y-2">
                {agent.logs.slice(-5).map((log, idx) => (
                  <div key={idx} className="text-xs font-mono text-slate-300 leading-relaxed">
                    {log}
                  </div>
                ))}
              </div>
            </div>

            {/* Actions */}
            {agent.status === BrowserAgentStatus.WORKING && (
              <div className="p-4 border-t border-slate-100 flex gap-2">
                <button className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg font-bold text-xs text-slate-700 bg-slate-100 hover:bg-slate-200 transition-all">
                  <Pause size={14} /> Pause
                </button>
                <button className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg font-bold text-xs text-rose-700 bg-rose-50 hover:bg-rose-100 transition-all">
                  <XCircle size={14} /> Stop
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Empty State */}
      {agents.length === 0 && (
        <div className="text-center py-20">
          <Monitor size={64} className="mx-auto text-slate-300 mb-4" />
          <h3 className="text-xl font-black text-slate-900 mb-2">No Active Browser Agents</h3>
          <p className="text-slate-600 font-medium">Spawn a new agent to get started</p>
        </div>
      )}
    </div>
  );
};
