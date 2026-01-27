
import React from 'react';
import { 
  Layers, 
  ShieldCheck, 
  Zap, 
  Settings, 
  CheckCircle2, 
  Cpu, 
  Lock, 
  TrendingUp, 
  Database, 
  Users, 
  ArrowRight,
  Shield,
  Activity,
  Award,
  ShieldX,
  Target,
  FileSearch
} from 'lucide-react';
import { WorkforceType } from '../types';

interface BlueprintsViewProps {
  onSelectTemplate: (template: WorkforceType) => void;
}

export const BlueprintsView: React.FC<BlueprintsViewProps> = ({ onSelectTemplate }) => {
  return (
    <div className="max-w-7xl mx-auto space-y-16 animate-in fade-in slide-in-from-bottom-8 duration-1000 pb-20">
      
      {/* HERO / VISION */}
      <section className="text-center space-y-6 pt-12">
        <div className="inline-flex items-center gap-3 px-6 py-2 bg-blue-50 border border-blue-100 rounded-full text-[10px] font-black text-blue-600 uppercase tracking-[0.3em]">
           <ShieldCheck size={16} /> Adversarial Resilience Protocol Active
        </div>
        <h1 className="text-6xl font-black text-slate-900 tracking-tighter leading-none">
          The <span className="text-blue-600">ISSO-Hardened</span> <br />AI Workforce Outline
        </h1>
        <p className="text-xl text-slate-500 max-w-4xl mx-auto font-medium leading-relaxed">
          The first AI workforce built with **Adversarial Input Resilience & Behavioral Integrity Controls** as a core architectural requirement. 
          Securing the intelligence layer through sovereign governance.
        </p>
      </section>

      {/* CORE INFRASTRUCTURE (THE "UNCHANGING" PARTS) */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-3">
          <h2 className="text-2xl font-black text-slate-900 tracking-tighter uppercase mb-2 flex items-center gap-3">
            <Shield size={28} className="text-blue-600" /> 1. The Repeatable Core (Infrastructure)
          </h2>
          <p className="text-slate-400 text-sm font-bold uppercase tracking-widest mb-8">Hardened foundation for sovereign deployment.</p>
        </div>

        <div className="bg-white p-10 rounded-[40px] border border-slate-200 shadow-sm hover:border-blue-300 transition-all group">
          <div className="p-4 bg-blue-600 text-white rounded-3xl w-fit mb-8 shadow-xl"><ShieldCheck size={32} /></div>
          <h3 className="text-xl font-black text-slate-900 mb-4">Behavioral Sentinel</h3>
          <p className="text-slate-600 text-sm font-medium leading-relaxed mb-6">
            Architectural control that validates ingress data for adversarial patterns. Ensures workforce logic remains isolated from raw data objects.
          </p>
          <div className="text-[10px] font-black text-blue-600 uppercase tracking-widest flex items-center gap-2">
            <CheckCircle2 size={14} /> Adversarial Input Resilience
          </div>
        </div>

        <div className="bg-white p-10 rounded-[40px] border border-slate-200 shadow-sm hover:border-emerald-300 transition-all group">
          <div className="p-4 bg-emerald-600 text-white rounded-3xl w-fit mb-8 shadow-xl"><Activity size={32} /></div>
          <h3 className="text-xl font-black text-slate-900 mb-4">Forensic Telemetry</h3>
          <p className="text-slate-600 text-sm font-medium leading-relaxed mb-6">
            Immutable logging of agent state transitions. Detects behavioral drift in real-time and provides a forensic audit trail for every finding.
          </p>
          <div className="text-[10px] font-black text-emerald-600 uppercase tracking-widest flex items-center gap-2">
            <CheckCircle2 size={14} /> CMMC 2.0 Prepared
          </div>
        </div>

        <div className="bg-white p-10 rounded-[40px] border border-slate-200 shadow-sm hover:border-slate-900 transition-all group">
          <div className="p-4 bg-slate-900 text-white rounded-3xl w-fit mb-8 shadow-xl"><Lock size={32} /></div>
          <h3 className="text-xl font-black text-slate-900 mb-4">Unified Gateway</h3>
          <p className="text-slate-600 text-sm font-medium leading-relaxed mb-6">
            Boundary sanitization layer. Scrubs PII/PHI and normalizes artifacts before they enter the governed intelligence zone.
          </p>
          <div className="text-[10px] font-black text-slate-600 uppercase tracking-widest flex items-center gap-2">
            <CheckCircle2 size={14} /> NIST SP 800-53 Mapping
          </div>
        </div>
      </section>

      {/* MODULAR EXPERTISE (THE "CUSTOM" PARTS) */}
      <section className="bg-slate-900 text-white p-16 rounded-[60px] shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-16 opacity-10"><Cpu size={300} /></div>
        
        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-16">
          <div className="space-y-8">
            <h2 className="text-4xl font-black tracking-tighter leading-none">
              2. The Governed Expert <br />
              <span className="text-blue-400">Layer</span>
            </h2>
            <p className="text-slate-400 text-lg font-medium leading-relaxed">
              Domain expertise is modular. The "Brain" of the workforce is swapped depending on the mission, while the Behavioral Integrity shell remains constant.
            </p>
            <div className="flex flex-wrap gap-4">
               <div className="px-6 py-3 bg-white/5 border border-white/10 rounded-2xl flex items-center gap-3">
                  <FileSearch size={20} className="text-blue-400" />
                  <span className="text-xs font-black uppercase tracking-widest">Legal Forensic</span>
               </div>
               <div className="px-6 py-3 bg-white/5 border border-white/10 rounded-2xl flex items-center gap-3">
                  <TrendingUp size={20} className="text-emerald-400" />
                  <span className="text-xs font-black uppercase tracking-widest">Financial Integrity</span>
               </div>
               <div className="px-6 py-3 bg-white/5 border border-white/10 rounded-2xl flex items-center gap-3">
                  <Target size={20} className="text-amber-400" />
                  <span className="text-xs font-black uppercase tracking-widest">Gov-Tech Audit</span>
               </div>
            </div>
          </div>

          <div className="space-y-6">
            <h3 className="text-sm font-black uppercase tracking-[0.4em] text-blue-400 mb-4">Select Architectural Blueprint</h3>
            
            <button 
              onClick={() => onSelectTemplate(WorkforceType.VA_CLAIMS)}
              className="w-full flex items-center justify-between p-8 bg-white/5 border border-white/10 rounded-[32px] hover:bg-white/10 transition-all text-left group"
            >
              <div>
                <p className="text-xl font-black mb-1">Federal Forensic (VA Claims)</p>
                <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Medical / Legal / Gov-Tech</p>
              </div>
              <ArrowRight size={24} className="group-hover:translate-x-2 transition-transform" />
            </button>

            <button 
              onClick={() => onSelectTemplate(WorkforceType.FINANCIAL_AUDIT)}
              className="w-full flex items-center justify-between p-8 bg-white/5 border border-white/10 rounded-[32px] hover:bg-white/10 transition-all text-left group"
            >
              <div>
                <p className="text-xl font-black mb-1">Corporate Integrity (Audit/Tax)</p>
                <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Banking / SEC / SOX Compliance</p>
              </div>
              <ArrowRight size={24} className="group-hover:translate-x-2 transition-transform" />
            </button>
          </div>
        </div>
      </section>

      {/* THE ROI SUMMARY */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        <div className="bg-blue-600 p-8 rounded-[40px] text-white flex flex-col justify-between h-64 shadow-xl shadow-blue-200">
           <TrendingUp size={40} />
           <div>
             <p className="text-3xl font-black tracking-tighter">80%</p>
             <p className="text-[10px] font-black uppercase tracking-widest opacity-70">Latency Reduction</p>
           </div>
        </div>

        <div className="bg-slate-900 p-8 rounded-[40px] text-white flex flex-col justify-between h-64 shadow-xl">
           <Award size={40} className="text-emerald-400" />
           <div>
             <p className="text-3xl font-black tracking-tighter">ATO Ready</p>
             <p className="text-[10px] font-black uppercase tracking-widest opacity-70">Regulatory Approval Baseline</p>
           </div>
        </div>

        <div className="bg-white p-8 rounded-[40px] border border-slate-200 flex flex-col justify-between h-64 shadow-sm">
           <ShieldX size={40} className="text-blue-600" />
           <div>
             <p className="text-3xl font-black tracking-tighter">99.9%</p>
             <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Adversarial Resilience</p>
           </div>
        </div>

        <div className="bg-emerald-600 p-8 rounded-[40px] text-white flex flex-col justify-between h-64 shadow-xl shadow-emerald-200">
           <ShieldCheck size={40} />
           <div>
             <p className="text-3xl font-black tracking-tighter">Chain Proof</p>
             <p className="text-[10px] font-black uppercase tracking-widest opacity-70">Forensic Integrity Score</p>
           </div>
        </div>
      </section>
    </div>
  );
};
