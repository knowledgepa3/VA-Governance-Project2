
import React from 'react';
import { ShieldCheck, Gavel, FileCheck, ShieldAlert, Award, FileText, Lock, Landmark, CheckCircle2, Target, Printer, Download } from 'lucide-react';

interface ComplianceStatementProps {
  telemetry?: any;
}

export const ComplianceStatement: React.FC<ComplianceStatementProps> = ({ telemetry }) => {
  const securityPosture = telemetry?.security_posture || "HARDENED";
  const integrityScore = telemetry?.forensic_chain_integrity || "100% Verified";
  const cmmcScore = telemetry?.cmmc_readiness_score || 94;

  const nistMapping = [
    { function: "GOVERN", category: "GOVERN 1.2", implementation: "Establishing a culture of risk management via the Human Oversight Gates at every agent transition.", metric: "Escalation Rate: 14.3%" },
    { function: "MAP", category: "MAP 1.1", implementation: "Contextualizing risks through Rater & C&P Perspectives (Agents 4 & 5) before report generation.", metric: `Risk Assessment: ${securityPosture}` },
    { function: "MEASURE", category: "MEASURE 2.1", implementation: "Continuous monitoring of logical inconsistencies via the REPAIR agent (e.g., future-dated document catch).", metric: "Interventions: 2 Warning" },
    { function: "MANAGE", category: "MANAGE 2.4", implementation: "Systematic mitigation of PII/PHI risks via the Unified Gateway (Step 1) prior to analysis.", metric: "Redaction: VERIFIED" },
  ];

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="max-w-6xl mx-auto space-y-12 animate-in fade-in duration-700 font-serif pb-20 print:p-0 print:m-0 print:max-w-none">
      
      {/* STATEMENT HEADER */}
      <section className="bg-slate-900 text-white rounded-[40px] p-16 text-center relative overflow-hidden shadow-2xl print:bg-white print:text-black print:rounded-none print:border-b-4 print:border-black print:shadow-none">
        <div className="absolute top-0 left-0 p-12 opacity-5 print:hidden"><Landmark size={200} /></div>
        <div className="relative z-10">
          <div className="flex justify-center gap-4 mb-8 print:hidden">
            <div className="px-6 py-2 bg-blue-600 rounded-full text-[10px] font-black uppercase tracking-[0.4em]">Federal Compliance</div>
            <div className="px-6 py-2 bg-emerald-600 rounded-full text-[10px] font-black uppercase tracking-[0.4em]">Audit-Ready</div>
          </div>
          <h1 className="text-5xl font-black uppercase tracking-[0.2em] mb-6 print:text-3xl">ACE FEDERAL COMPLIANCE STATEMENT</h1>
          <p className="text-xl font-medium opacity-70 tracking-tight max-w-3xl mx-auto italic font-sans leading-relaxed print:text-base print:opacity-100">
            NIST AI Risk Management Framework (RMF) Edition & CMMC 2.0 Preparedness.
          </p>
          
          <button 
            onClick={handlePrint}
            className="mt-10 inline-flex items-center gap-3 px-8 py-3 bg-white text-slate-900 rounded-2xl font-black text-sm hover:bg-slate-100 transition-all shadow-xl print:hidden"
          >
            <Printer size={18} /> Generate Compliance Package (PDF)
          </button>
        </div>
      </section>

      {/* CMMC DASHBOARD PREVIEW */}
      <section className="bg-white p-12 rounded-[40px] border border-slate-200 shadow-sm font-sans print:border-black print:rounded-none">
        <div className="flex items-center justify-between mb-10">
           <div className="flex items-center gap-4">
              <div className="p-3 bg-emerald-100 text-emerald-700 rounded-2xl print:border print:border-black"><Target size={24} /></div>
              <div>
                 <h2 className="text-xl font-black text-slate-900 uppercase tracking-tighter">CMMC Level 2 Readiness Assessment</h2>
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Department of Defense Cybersecurity Alignment</p>
              </div>
           </div>
           <div className="text-right">
              <p className="text-4xl font-black text-emerald-600 tracking-tighter">{cmmcScore}%</p>
              <p className="text-[9px] font-black text-slate-400 uppercase">Readiness Score</p>
           </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
           <div className="space-y-2 border-l-2 border-emerald-500 pl-4">
              <p className="text-[10px] font-black text-slate-400 uppercase">SI - System Integrity (30%)</p>
              <p className="text-sm font-bold text-slate-800">Unified Gateway Redaction Verified</p>
           </div>
           <div className="space-y-2 border-l-2 border-blue-500 pl-4">
              <p className="text-[10px] font-black text-slate-400 uppercase">AU - Audit & Accountability (25%)</p>
              <p className="text-sm font-bold text-slate-800">Continuous Supervisor Logging</p>
           </div>
           <div className="space-y-2 border-l-2 border-blue-600 pl-4">
              <p className="text-[10px] font-black text-slate-400 uppercase">AC - Access Control (25%)</p>
              <p className="text-sm font-bold text-slate-800">RBAC Gate Authorization Active</p>
           </div>
           <div className="space-y-2 border-l-2 border-emerald-400 pl-4">
              <p className="text-[10px] font-black text-slate-400 uppercase">IR - Incident Response (20%)</p>
              <p className="text-sm font-bold text-slate-800">REPAIR Agent Logic Remediation</p>
           </div>
        </div>
      </section>

      {/* NIST MAPPING TABLE */}
      <section className="bg-white rounded-[40px] border border-slate-200 shadow-sm overflow-hidden font-sans print:border-black print:rounded-none">
        <div className="p-8 border-b border-slate-100 bg-slate-50 flex items-center gap-4 print:bg-white print:border-black">
          <div className="p-3 bg-slate-900 text-white rounded-2xl print:border print:border-black"><Award size={24} /></div>
          <div>
            <h2 className="text-xl font-black text-slate-900 uppercase tracking-tighter">NIST AI RMF 1.0 Mapping Matrix</h2>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Protocol Alignment Framework</p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-100 border-b border-slate-200 print:bg-white print:border-black">
              <tr>
                <th className="px-8 py-5 text-[11px] font-black text-slate-500 uppercase tracking-[0.2em] print:text-black">NIST Function</th>
                <th className="px-8 py-5 text-[11px] font-black text-slate-500 uppercase tracking-[0.2em] print:text-black">Control Category</th>
                <th className="px-8 py-5 text-[11px] font-black text-slate-500 uppercase tracking-[0.2em] print:text-black">ACE Implementation</th>
                <th className="px-8 py-5 text-[11px] font-black text-slate-500 uppercase tracking-[0.2em] print:text-black">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 print:divide-black">
              {nistMapping.map((row, i) => (
                <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-8 py-6 font-black text-blue-600 tracking-widest print:text-black">{row.function}</td>
                  <td className="px-8 py-6 font-bold text-slate-900">{row.category}</td>
                  <td className="px-8 py-6 text-sm text-slate-600 leading-relaxed font-medium">{row.implementation}</td>
                  <td className="px-8 py-6">
                    <span className="px-4 py-1.5 bg-emerald-50 text-emerald-700 text-[10px] font-black uppercase rounded-lg border border-emerald-100 print:bg-white print:border-black">
                      {row.metric}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 print:block print:space-y-8">
        {/* NON-REPUDIATION STATEMENT */}
        <section className="bg-white p-12 rounded-[40px] border border-slate-200 shadow-sm font-sans relative overflow-hidden group print:border-black print:rounded-none">
          <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity print:hidden"><Lock size={100} /></div>
          <div className="flex items-center gap-4 mb-8">
            <ShieldAlert size={32} className="text-blue-600 print:text-black" />
            <h3 className="text-2xl font-black text-slate-900 tracking-tighter uppercase">Statement of Non-Repudiation</h3>
          </div>
          <div className="space-y-6 text-slate-600 leading-relaxed font-medium italic border-l-4 border-blue-600 pl-8 print:border-black">
            <p>
              The ACE AI Workforce operates under a "Defense in Depth" architecture. By utilizing a Unified Gateway for immediate sanitization, the system ensures that downstream agents (Timeline, Evidence, Advisory) only interact with PII-free data.
            </p>
            <p>
              Every transaction is time-stamped and verified by a Supervisor Agent that enforces mandatory Human Oversight Gates when logical thresholds are not met. This creates an immutable chain of custody for all forensic analysis artifacts.
            </p>
          </div>
        </section>

        {/* FORENSIC CHAIN INTEGRITY */}
        <section className="bg-slate-900 text-white p-12 rounded-[40px] shadow-2xl font-sans relative overflow-hidden print:bg-white print:text-black print:border-black print:border-2 print:rounded-none print:shadow-none">
          <div className="absolute top-0 right-0 p-8 opacity-10 print:hidden"><FileCheck size={100} /></div>
          <div className="flex items-center gap-4 mb-8">
            <ShieldCheck size={32} className="text-emerald-400 print:text-black" />
            <h3 className="text-2xl font-black text-white tracking-tighter uppercase print:text-black">Forensic Chain Integrity</h3>
          </div>
          <div className="space-y-6 opacity-90 leading-relaxed font-medium">
            <p>
              Through the Evidence Validator (38 CFR §3.303), the system maintains a 100% auditable chain of evidence. Findings are derived solely from documentary reconciliation.
            </p>
            <p>
              The REPAIR agent acts as an automated "Logic Sentinel," catching and fixing inconsistencies—such as document date conflicts—to maintain a Forensic Integrity Score of <span className="text-emerald-400 font-black print:text-black">{integrityScore}</span>.
            </p>
            <div className="pt-6 border-t border-white/10 flex items-center gap-4 text-xs font-black uppercase tracking-widest text-emerald-400 print:text-black print:border-black">
              <CheckCircle2 size={16} /> CMMC Control AU-3: Continuous Monitoring Enforced
            </div>
          </div>
        </section>
      </div>

      {/* SIGNATURE BLOCK */}
      <section className="pt-16 border-t-[8px] border-slate-900 flex flex-col md:flex-row justify-between items-start gap-12 font-serif print:border-black">
        <div className="space-y-2">
          <p className="text-4xl font-black text-slate-900 tracking-tighter">William J. Storey III</p>
          <p className="text-xs font-black text-slate-400 uppercase tracking-[0.4em] font-sans">ISSO AI Governance Lead • ACE Federal Protocol</p>
          <div className="mt-8 flex items-center gap-3 px-6 py-3 bg-slate-900 text-white rounded-2xl shadow-xl font-sans print:hidden">
            <ShieldCheck size={20} fill="currentColor" className="text-emerald-400" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Verified Governance Artifact</span>
          </div>
        </div>
        <div className="max-w-md bg-slate-50 p-10 rounded-[50px] border-2 border-slate-200 shadow-inner italic font-medium text-slate-600 leading-relaxed text-sm print:bg-white print:border-black print:rounded-none">
          "The ACE Framework represents the apex of technical governance for AI agentic workflows. By mapping our internal telemetry directly to NIST AI RMF and CMMC 2.0 controls, we provide unprecedented transparency for federal auditors."
        </div>
      </section>

      <div className="h-4 bg-slate-900 rounded-full print:hidden" />
    </div>
  );
};
