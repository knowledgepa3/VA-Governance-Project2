
import React from 'react';
import { Users, ShieldCheck, Lock, Eye, CheckSquare, ShieldAlert, Award, FileCheck } from 'lucide-react';
import { UserRole } from '../types';

export const GovernancePolicy: React.FC = () => {
  const roles = [
    {
      role: UserRole.ISSO,
      access: "Super-Admin",
      responsibilities: "System configuration, agent threshold tuning, and audit log review.",
      permission: "Full Control",
      color: "bg-slate-900 text-white"
    },
    {
      role: UserRole.FORENSIC_SME,
      access: "Decision Maker",
      responsibilities: "Validating 38 CFR mappings and clinical evidence nexuses.",
      permission: "Approval / Escalation",
      color: "bg-blue-600 text-white"
    },
    {
      role: UserRole.SANITIZATION_OFFICER,
      access: "Reviewer",
      responsibilities: "Verifying Unified Gateway redaction accuracy.",
      permission: "Approval Only",
      color: "bg-emerald-600 text-white"
    },
    {
      role: UserRole.FEDERAL_AUDITOR,
      access: "Read-Only",
      responsibilities: "Reviewing the Security Summary and Activity Logs for compliance.",
      permission: "View Logs Only",
      color: "bg-slate-200 text-slate-800"
    }
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-12 animate-in fade-in duration-700 font-sans pb-20">
      
      {/* HEADER */}
      <section className="bg-white border border-slate-200 rounded-[40px] p-16 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 p-12 opacity-5"><Users size={200} /></div>
        <div className="relative z-10">
          <div className="flex items-center gap-4 mb-8">
            <div className="p-3 bg-blue-600 text-white rounded-2xl shadow-lg"><Lock size={24} /></div>
            <div>
              <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase">ACE User Access Control (UAC) Policy</h1>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">NIST AI RMF Alignment • Human Oversight Roles</p>
            </div>
          </div>
          <p className="text-lg font-medium text-slate-600 max-w-3xl leading-relaxed italic">
            "This policy turn the ACE AI Workforce into a Controlled Operating Environment by implementing strict Role-Based Access Control (RBAC) to ensure qualified Human Oversight at every forensic gate."
          </p>
        </div>
      </section>

      {/* ROLES GRID */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {roles.map((r, i) => (
          <div key={i} className="bg-white border border-slate-200 rounded-[32px] p-8 shadow-sm flex flex-col hover:border-blue-300 transition-all group">
            <div className="flex justify-between items-start mb-6">
              <div className={`px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${r.color}`}>
                {r.role}
              </div>
              <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{r.access}</div>
            </div>
            <h3 className="text-xl font-black text-slate-900 mb-4 tracking-tight group-hover:text-blue-600 transition-colors">{r.permission}</h3>
            <p className="text-sm font-medium text-slate-500 leading-relaxed mb-6">
              {r.responsibilities}
            </p>
            <div className="mt-auto pt-6 border-t border-slate-100 flex items-center gap-2 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">
               <ShieldCheck size={14} className="text-emerald-500" /> Authorized Role Entity
            </div>
          </div>
        ))}
      </section>

      {/* GOVERNANCE RULES */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-8">
         <div className="bg-slate-900 text-white p-10 rounded-[40px] shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-10"><ShieldAlert size={60} /></div>
            <h4 className="text-[10px] font-black text-blue-400 uppercase tracking-[0.3em] mb-6">Mandatory Authentication</h4>
            <p className="text-sm font-medium text-slate-300 leading-relaxed mb-4">
              All users must utilize Multi-Factor Authentication (MFA) to access the workforce dashboard. 
            </p>
            <div className="p-4 bg-white/5 rounded-2xl border border-white/10 font-mono text-[10px] text-blue-300">
               POL-UAC-001: MFA Enforcement Active
            </div>
         </div>

         <div className="bg-white border border-slate-200 p-10 rounded-[40px] shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-5"><Users size={60} /></div>
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-6">Separation of Duties</h4>
            <p className="text-sm font-medium text-slate-600 leading-relaxed mb-4">
              The individual who initiates the Ingress sequence cannot be the same individual who provides the Final Approval for the Report Generator.
            </p>
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 font-mono text-[10px] text-slate-500">
               POL-UAC-002: SOD Protocol Enforced
            </div>
         </div>

         <div className="bg-emerald-600 text-white p-10 rounded-[40px] shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-20"><FileCheck size={60} /></div>
            <h4 className="text-[10px] font-black text-white/70 uppercase tracking-[0.3em] mb-6">Non-Repudiation Log</h4>
            <p className="text-sm font-medium text-white/90 leading-relaxed mb-4">
              Every "Human Gate Passed" action in the log is automatically tagged with the User ID, Timestamp, and Digital Signature of the reviewer.
            </p>
            <div className="p-4 bg-black/10 rounded-2xl border border-white/20 font-mono text-[10px] text-white">
               POL-UAC-003: Digital Signature Active
            </div>
         </div>
      </section>

      {/* ATO SUMMARY */}
      <section className="bg-slate-100 p-12 rounded-[50px] border-2 border-white flex flex-col md:flex-row items-center justify-between gap-12 shadow-inner">
         <div className="flex items-center gap-6">
            <div className="p-5 bg-white rounded-3xl shadow-xl"><Award size={40} className="text-blue-600" /></div>
            <div>
               <h3 className="text-2xl font-black text-slate-900 tracking-tighter uppercase">ATO Readiness Package</h3>
               <p className="text-sm font-bold text-slate-500">ACE AI Workforce Version 2.5-PERSPECTIVE</p>
            </div>
         </div>
         <div className="flex gap-4 font-sans text-[10px] font-black uppercase tracking-widest">
            <span className="flex items-center gap-2 px-6 py-3 bg-white border border-slate-200 rounded-2xl shadow-sm"><ShieldCheck size={16} className="text-emerald-500" /> ISO-9001 Alignment</span>
            <span className="flex items-center gap-2 px-6 py-3 bg-white border border-slate-200 rounded-2xl shadow-sm"><FileCheck size={16} className="text-blue-500" /> 38 CFR Compliant</span>
         </div>
      </section>

      <div className="h-4 bg-blue-600 rounded-full w-24 mx-auto" />
    </div>
  );
};
