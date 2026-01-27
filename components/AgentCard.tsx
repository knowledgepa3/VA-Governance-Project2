
import React from 'react';
import { AgentRole, AgentStatus, MAIClassification, AgentState } from '../types';
import { AGENT_CONFIGS } from '../constants';

interface AgentCardProps {
  state: AgentState;
  onViewOutput: (role: AgentRole) => void;
}

export const AgentCard: React.FC<AgentCardProps> = ({ state, onViewOutput }) => {
  const config = AGENT_CONFIGS[state.role as keyof typeof AGENT_CONFIGS];

  const getStatusColor = (status: AgentStatus) => {
    switch (status) {
      case AgentStatus.IDLE: return 'bg-slate-200';
      case AgentStatus.WORKING: return 'bg-blue-500 animate-pulse';
      case AgentStatus.PAUSED: return 'bg-amber-500';
      case AgentStatus.COMPLETE: return 'bg-emerald-500';
      case AgentStatus.FAILED: return 'bg-rose-500';
      case AgentStatus.REPAIRING: return 'bg-purple-500 animate-bounce';
      default: return 'bg-slate-500';
    }
  };

  const getClassificationColor = (cls: MAIClassification) => {
    switch (cls) {
      case MAIClassification.INFORMATIONAL: return 'text-blue-600 bg-blue-50 border-blue-200';
      case MAIClassification.ADVISORY: return 'text-amber-600 bg-amber-50 border-amber-200';
      case MAIClassification.MANDATORY: return 'text-rose-600 bg-rose-50 border-rose-200';
    }
  };

  return (
    <div className={`p-4 border rounded-xl shadow-sm transition-all duration-300 bg-white ${state.status === AgentStatus.WORKING ? 'border-blue-300 ring-2 ring-blue-100' : 'border-slate-200'}`}>
      <div className="flex justify-between items-start mb-3">
        <div>
          <h3 className="font-bold text-slate-800">{state.role}</h3>
          <p className="text-xs text-slate-500 line-clamp-1">{config?.description}</p>
        </div>
        <div className={`px-2 py-0.5 text-[10px] font-bold uppercase border rounded ${getClassificationColor(config!.classification)}`}>
          {config?.classification}
        </div>
      </div>

      <div className="flex items-center gap-2 mb-4">
        <div className={`w-3 h-3 rounded-full ${getStatusColor(state.status)}`} />
        <span className="text-xs font-semibold text-slate-700 uppercase tracking-wider">{state.status}</span>
      </div>

      <div className="w-full bg-slate-100 h-1.5 rounded-full mb-4 overflow-hidden">
        <div 
          className="bg-blue-600 h-full transition-all duration-500" 
          style={{ width: `${state.progress}%` }} 
        />
      </div>

      <div className="flex justify-between items-center">
        <span className="text-[10px] text-slate-400">Step {state.progress === 100 ? '5/5' : 'Working...'}</span>
        {state.status === AgentStatus.COMPLETE && (
          <button 
            onClick={() => onViewOutput(state.role)}
            className="text-xs font-bold text-blue-600 hover:text-blue-800 transition-colors"
          >
            VIEW OUTPUT →
          </button>
        )}
      </div>
    </div>
  );
};
