
import React from 'react';
import { AgentAction, MAIClassification } from '../types';
import { Search, Download, Filter, ChevronRight, Zap, ShieldCheck, User } from 'lucide-react';

interface AuditPageProps {
  logs: AgentAction[];
}

export const AuditPage: React.FC<AuditPageProps> = ({ logs }) => {
  const getMAIBadge = (cls: MAIClassification) => {
    switch (cls) {
      case MAIClassification.INFORMATIONAL: return 'bg-blue-100 text-blue-700';
      case MAIClassification.ADVISORY: return 'bg-amber-100 text-amber-700';
      case MAIClassification.MANDATORY: return 'bg-rose-100 text-rose-700';
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tighter uppercase">Compliance Audit Trail</h2>
          <p className="text-slate-500 text-sm font-medium italic">Immutable forensic record of agentic lifecycle transactions</p>
        </div>
        <div className="flex gap-2">
          <button className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-lg text-xs font-black uppercase tracking-widest text-slate-700 bg-white hover:bg-slate-50 transition-all">
            <Filter size={16} /> Filter
          </button>
          <button className="flex items-center gap-3 px-6 py-2 bg-slate-900 rounded-lg text-xs font-black uppercase tracking-[0.2em] text-white hover:bg-black transition-all shadow-xl">
            <Download size={16} /> Export CSV
          </button>
        </div>
      </div>

      <div className="bg-white rounded-[32px] border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-6 py-5 text-[10px] font-black text-slate-500 uppercase tracking-wider">Timestamp</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-500 uppercase tracking-wider">Agent Population</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-500 uppercase tracking-wider">Escalation Trigger</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-500 uppercase tracking-wider whitespace-nowrap">Human Gate Reviewer ID</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-500 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-sans">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-20 text-center text-slate-300 italic font-black uppercase tracking-[0.3em]">No Lifecycle activity identified.</td>
                </tr>
              ) : logs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50/50 transition-colors group cursor-pointer">
                  <td className="px-6 py-5 text-[11px] font-mono text-slate-400 font-bold">{log.timestamp}</td>
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${log.status === 'SUCCESS' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                      <span className="text-[11px] font-black text-slate-800 uppercase tracking-tighter">{log.agentId}</span>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-2">
                      <Zap size={14} className={log.escalationTrigger === 'Pattern normal' ? 'text-slate-200' : 'text-amber-500'} />
                      <span className={`text-[11px] font-bold ${log.escalationTrigger === 'Pattern normal' ? 'text-slate-400' : 'text-slate-900 uppercase'}`}>
                        {log.escalationTrigger}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-3">
                      {log.reviewerId ? (
                        <>
                          <div className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg"><ShieldCheck size={14} /></div>
                          <div>
                            <p className="text-[10px] font-black text-slate-800 uppercase leading-none mb-1">{log.reviewerId}</p>
                            <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">{log.reviewerRole}</p>
                          </div>
                        </>
                      ) : (
                        <span className="text-[10px] font-black text-slate-300 uppercase italic">N/A - System Auto</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${log.status === 'SUCCESS' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-rose-50 text-rose-700 border border-rose-100'}`}>
                      {log.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
