
import React, { useState } from 'react';
import { AgentRole, AgentStatus, MAIClassification, AgentState } from '../types';
import { AGENT_CONFIGS } from '../constants';
import { Eye, Zap, AlertTriangle, CheckCircle2, Clock, Info, HelpCircle } from 'lucide-react';

interface AgentCardProps {
  state: AgentState;
  onViewOutput: (role: AgentRole) => void;
}

// Tooltip component
const Tooltip: React.FC<{ text: string; children: React.ReactNode }> = ({ text, children }) => {
  const [show, setShow] = useState(false);
  return (
    <div className="relative inline-flex" onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
      {children}
      {show && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-slate-900 text-white text-[9px] rounded-lg whitespace-nowrap z-50 shadow-xl animate-in fade-in zoom-in-95 duration-150">
          {text}
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900" />
        </div>
      )}
    </div>
  );
};

export const AgentCard: React.FC<AgentCardProps> = ({ state, onViewOutput }) => {
  const config = AGENT_CONFIGS[state.role as keyof typeof AGENT_CONFIGS];

  const getStatusColor = (status: AgentStatus) => {
    switch (status) {
      case AgentStatus.IDLE: return 'bg-slate-300';
      case AgentStatus.WORKING: return 'bg-blue-500 animate-pulse';
      case AgentStatus.PAUSED: return 'bg-amber-500';
      case AgentStatus.COMPLETE: return 'bg-emerald-500';
      case AgentStatus.FAILED: return 'bg-rose-500';
      case AgentStatus.REPAIRING: return 'bg-purple-500 animate-bounce';
      default: return 'bg-slate-500';
    }
  };

  const getStatusBg = (status: AgentStatus) => {
    switch (status) {
      case AgentStatus.WORKING: return 'border-blue-300 ring-2 ring-blue-100 bg-blue-50/30';
      case AgentStatus.COMPLETE: return 'border-emerald-200 bg-emerald-50/20';
      case AgentStatus.REPAIRING: return 'border-purple-300 ring-2 ring-purple-100 bg-purple-50/30';
      case AgentStatus.FAILED: return 'border-rose-300 bg-rose-50/30';
      default: return 'border-slate-200 bg-white';
    }
  };

  const getClassificationColor = (cls: MAIClassification) => {
    switch (cls) {
      case MAIClassification.INFORMATIONAL: return 'text-blue-600 bg-blue-50 border-blue-200';
      case MAIClassification.ADVISORY: return 'text-amber-600 bg-amber-50 border-amber-200';
      case MAIClassification.MANDATORY: return 'text-rose-600 bg-rose-50 border-rose-200';
    }
  };

  const getClassificationTooltip = (cls: MAIClassification) => {
    switch (cls) {
      case MAIClassification.INFORMATIONAL: return 'Informational output - no action required';
      case MAIClassification.ADVISORY: return 'Advisory finding - review recommended';
      case MAIClassification.MANDATORY: return 'Mandatory gate - requires validation';
    }
  };

  const score = state.supervisorScore;
  const avgScore = score ? Math.round((score.integrity + score.accuracy + score.compliance) / 3) : null;
  const hasCorrections = score && score.corrections > 0;

  return (
    <div className={`p-5 border rounded-2xl shadow-sm transition-all duration-300 ${getStatusBg(state.status)}`}>
      {/* Header */}
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-black text-slate-800 text-sm tracking-tight truncate">{state.role}</h3>
          <p className="text-[10px] text-slate-500 line-clamp-1 font-medium">{config?.description}</p>
        </div>
        <Tooltip text={getClassificationTooltip(config!.classification)}>
          <div className={`px-2 py-0.5 text-[8px] font-black uppercase border rounded-lg ml-2 cursor-help ${getClassificationColor(config!.classification)}`}>
            {config?.classification}
          </div>
        </Tooltip>
      </div>

      {/* Status Row */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={`w-2.5 h-2.5 rounded-full ${getStatusColor(state.status)}`} />
          <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">{state.status}</span>
        </div>
        {state.status === AgentStatus.WORKING && (
          <span className="text-[9px] font-mono text-blue-500 animate-pulse">Processing...</span>
        )}
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-slate-100 h-1.5 rounded-full mb-3 overflow-hidden">
        <div
          className={`h-full transition-all duration-500 ${
            state.status === AgentStatus.REPAIRING ? 'bg-purple-500' :
            state.status === AgentStatus.FAILED ? 'bg-rose-500' :
            'bg-blue-600'
          }`}
          style={{ width: `${state.progress}%` }}
        />
      </div>

      {/* Supervisor Score Panel - Only show when agent has been processed */}
      {score && (
        <div className="bg-slate-50 rounded-xl p-3 mb-3 border border-slate-100">
          <div className="flex items-center justify-between mb-2">
            <Tooltip text="Scores reflect governance confidence, not correctness. Completion indicates policy thresholds satisfied.">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1 cursor-help">
                <Eye size={10} /> Governance Score
                <HelpCircle size={8} className="text-slate-300" />
              </span>
            </Tooltip>
            <span className={`text-[10px] font-black ${avgScore! >= 90 ? 'text-emerald-600' : avgScore! >= 70 ? 'text-amber-600' : 'text-rose-600'}`}>
              {avgScore}%
            </span>
          </div>

          {/* Score Bars with Tooltips */}
          <div className="space-y-1.5">
            <Tooltip text="Behavioral integrity - adherence to governance policies">
              <div className="flex items-center gap-2 w-full cursor-help">
                <span className="text-[8px] font-bold text-slate-400 w-16">Integrity</span>
                <div className="flex-1 bg-slate-200 h-1 rounded-full overflow-hidden">
                  <div className="bg-emerald-500 h-full transition-all" style={{ width: `${score.integrity}%` }} />
                </div>
                <span className="text-[8px] font-mono text-slate-500 w-8">{score.integrity}</span>
              </div>
            </Tooltip>
            <Tooltip text="Output accuracy - consistency with evidence and prior findings">
              <div className="flex items-center gap-2 w-full cursor-help">
                <span className="text-[8px] font-bold text-slate-400 w-16">Accuracy</span>
                <div className="flex-1 bg-slate-200 h-1 rounded-full overflow-hidden">
                  <div className="bg-blue-500 h-full transition-all" style={{ width: `${score.accuracy}%` }} />
                </div>
                <span className="text-[8px] font-mono text-slate-500 w-8">{score.accuracy}</span>
              </div>
            </Tooltip>
            <Tooltip text="Regulatory compliance - alignment with 38 CFR standards">
              <div className="flex items-center gap-2 w-full cursor-help">
                <span className="text-[8px] font-bold text-slate-400 w-16">Compliance</span>
                <div className="flex-1 bg-slate-200 h-1 rounded-full overflow-hidden">
                  <div className="bg-purple-500 h-full transition-all" style={{ width: `${score.compliance}%` }} />
                </div>
                <span className="text-[8px] font-mono text-slate-500 w-8">{score.compliance}</span>
              </div>
            </Tooltip>
          </div>

          {/* Corrections indicator */}
          {hasCorrections && (
            <Tooltip text="Auto-remediation applied to normalize output">
              <div className="mt-2 pt-2 border-t border-slate-200 flex items-center justify-between cursor-help">
                <span className="text-[8px] font-bold text-amber-600 flex items-center gap-1">
                  <AlertTriangle size={10} /> {score.corrections} Correction{score.corrections > 1 ? 's' : ''} Applied
                </span>
                <span className="text-[8px] font-mono text-slate-400">{score.latency}ms</span>
              </div>
            </Tooltip>
          )}
        </div>
      )}

      {/* Token Usage (if available) */}
      {state.tokenUsage && (
        <Tooltip text="API tokens consumed for this agent's analysis">
          <div className="flex items-center justify-between text-[8px] text-slate-400 mb-3 px-1 cursor-help">
            <span className="flex items-center gap-1">
              <Zap size={10} /> {state.tokenUsage.input + state.tokenUsage.output} tokens
            </span>
            <span>In: {state.tokenUsage.input} / Out: {state.tokenUsage.output}</span>
          </div>
        </Tooltip>
      )}

      {/* Footer */}
      <div className="flex justify-between items-center">
        <span className="text-[9px] text-slate-400 font-mono">
          {state.progress === 100 ? (
            <span className="flex items-center gap-1 text-emerald-600">
              <CheckCircle2 size={12} /> Complete
            </span>
          ) : state.status === AgentStatus.WORKING ? (
            <span className="flex items-center gap-1">
              <Clock size={12} className="animate-spin" /> Step {Math.ceil(state.progress / 20)}/5
            </span>
          ) : (
            'Awaiting...'
          )}
        </span>
        {state.status === AgentStatus.COMPLETE && (
          <button
            onClick={() => onViewOutput(state.role)}
            className="text-[10px] font-black text-blue-600 hover:text-blue-800 transition-colors flex items-center gap-1 bg-blue-50 px-2 py-1 rounded-lg hover:bg-blue-100"
          >
            <Eye size={12} /> VIEW
          </button>
        )}
      </div>
    </div>
  );
};
