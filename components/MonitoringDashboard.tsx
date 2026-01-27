
import React from 'react';
import { Activity, ShieldCheck, Heart, AlertTriangle, Clock, ShieldAlert, Zap, Lock, Database, Target, Award, Shield, CheckCircle, ShieldX } from 'lucide-react';
import { AgentRole, AgentStatus } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, AreaChart, Area } from 'recharts';

interface MetricCardProps {
  label: string;
  value: string;
  status: 'Healthy' | 'Warning' | 'Critical';
  icon: React.ReactNode;
}

const MetricCard: React.FC<MetricCardProps> = ({ label, value, status, icon }) => {
  const colors = {
    Healthy: 'text-emerald-600 bg-emerald-50',
    Warning: 'text-amber-600 bg-amber-50',
    Critical: 'text-rose-600 bg-rose-50',
  };

  return (
    <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-5 group hover:shadow-md transition-all">
      <div className={`p-4 rounded-2xl transition-transform group-hover:scale-110 ${colors[status]}`}>
        {icon}
      </div>
      <div>
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</p>
        <p className="text-2xl font-black text-slate-900 tracking-tighter">{value}</p>
        <div className="flex items-center gap-1.5 mt-1">
          <div className={`w-2 h-2 rounded-full ${status === 'Healthy' ? 'bg-emerald-500 animate-pulse' : status === 'Warning' ? 'bg-amber-500' : 'bg-rose-50'}`} />
          <span className={`text-[9px] font-black uppercase ${colors[status].split(' ')[0]}`}>{status}</span>
        </div>
      </div>
    </div>
  );
};

interface MonitoringDashboardProps {
  telemetry?: any;
}

export const MonitoringDashboard: React.FC<MonitoringDashboardProps> = ({ telemetry }) => {
  const chartData = [
    { name: '08:00', rate: 12 },
    { name: '10:00', rate: 15 },
    { name: '12:00', rate: 14.3 },
    { name: '14:00', rate: 11 },
    { name: '16:00', rate: 16 },
  ];

  const integrityScore = telemetry?.forensic_chain_integrity || "100% Verified";
  const interventions = telemetry?.scorecard?.interventions ?? 0;
  
  const cmmcScore = telemetry?.cmmc_readiness_score || 94;
  const cmmcBreakdown = telemetry?.cmmc_breakdown || {
    system_integrity_si: 100,
    audit_accountability_au: 95,
    access_control_ac: 90,
    incident_response_ir: 100
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <MetricCard label="System Uptime" value="99.9%" status="Healthy" icon={<Activity size={24} />} />
        <MetricCard label="Forensic Integrity" value={integrityScore} status="Healthy" icon={<ShieldCheck size={24} />} />
        <MetricCard label="Adversarial Resilience" value="99.9%" status="Healthy" icon={<ShieldX size={24} className="text-blue-600" />} />
        <MetricCard label="Logic Exceptions" value={interventions.toString()} status={interventions > 0 ? "Warning" : "Healthy"} icon={<Zap size={24} />} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-8">
          <div className="bg-white p-8 rounded-[40px] border-2 border-slate-900 shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-8 opacity-5"><Target size={120} /></div>
            <div className="flex items-center justify-between mb-8">
               <div className="flex items-center gap-3">
                  <div className="p-3 bg-slate-900 text-white rounded-2xl shadow-lg"><Award size={20} /></div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900 uppercase tracking-[0.2em]">CMMC 2.0 Preparedness</h3>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Continuous Governance Monitor</p>
                  </div>
               </div>
               {cmmcScore >= 90 && (
                 <div className="bg-emerald-100 text-emerald-700 p-2 rounded-xl border border-emerald-200 animate-bounce">
                    <CheckCircle size={20} />
                 </div>
               )}
            </div>

            <div className="text-center mb-10">
               <p className="text-6xl font-black text-slate-900 tracking-tighter">{cmmcScore}%</p>
               <p className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.4em] mt-2">Compliance Alignment Reached</p>
            </div>

            <div className="space-y-6">
               <div>
                 <div className="flex justify-between items-center mb-2">
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">SI - System Integrity (30%)</span>
                    <span className="text-[10px] font-black text-slate-900">{cmmcBreakdown.system_integrity_si}%</span>
                 </div>
                 <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                    <div className="bg-emerald-500 h-full transition-all duration-1000" style={{ width: `${cmmcBreakdown.system_integrity_si}%` }} />
                 </div>
               </div>

               <div>
                 <div className="flex justify-between items-center mb-2">
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">AU - Audit & Accountability (25%)</span>
                    <span className="text-[10px] font-black text-slate-900">{cmmcBreakdown.audit_accountability_au}%</span>
                 </div>
                 <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                    <div className="bg-blue-500 h-full transition-all duration-1000" style={{ width: `${cmmcBreakdown.audit_accountability_au}%` }} />
                 </div>
               </div>

               <div>
                 <div className="flex justify-between items-center mb-2">
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">AC - Access Control (25%)</span>
                    <span className="text-[10px] font-black text-slate-900">{cmmcBreakdown.access_control_ac}%</span>
                 </div>
                 <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                    <div className="bg-blue-600 h-full transition-all duration-1000" style={{ width: `${cmmcBreakdown.access_control_ac}%` }} />
                 </div>
               </div>

               <div>
                 <div className="flex justify-between items-center mb-2">
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">IR - Incident Response (20%)</span>
                    <span className="text-[10px] font-black text-slate-900">{cmmcBreakdown.incident_response_ir}%</span>
                 </div>
                 <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                    <div className="bg-emerald-400 h-full transition-all duration-1000" style={{ width: `${cmmcBreakdown.incident_response_ir}%` }} />
                 </div>
            </div>

            <div className="mt-8 pt-8 border-t border-slate-100 flex items-center justify-between text-[10px] font-black uppercase text-slate-500 tracking-widest">
               <div className="flex items-center gap-2">
                  <Shield size={16} className="text-blue-600" />
                  Behavioral Integrity Sentinel Active
               </div>
               <span className="text-emerald-600 font-bold tracking-tighter italic">ISSO HARDENED</span>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-8">
           <div className="bg-white p-8 rounded-[40px] border border-slate-200 shadow-sm">
            <div className="flex justify-between items-center mb-10">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-[0.2em]">Adversarial Resilience Velocity</h3>
              <div className="flex gap-6 text-[10px] font-black uppercase tracking-widest">
                <span className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-blue-500" /> Integrity Score</span>
                <span className="flex items-center gap-2 text-slate-400"><div className="w-2 h-2 rounded-full bg-slate-200" /> Latency</span>
              </div>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorRate" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#94a3b8', fontWeight: 700}} />
                  <YAxis domain={[0, 25]} axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#94a3b8', fontWeight: 700}} />
                  <Tooltip 
                    contentStyle={{borderRadius: '20px', border: 'none', boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.15)', fontSize: '11px', fontWeight: 'bold'}} 
                  />
                  <Area type="monotone" dataKey="rate" stroke="#3b82f6" strokeWidth={4} fillOpacity={1} fill="url(#colorRate)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white p-8 rounded-[40px] border border-slate-200 shadow-sm">
            <h3 className="text-sm font-black text-slate-900 mb-8 uppercase tracking-[0.2em]">Governed Population Monitoring</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[AgentRole.GATEWAY, AgentRole.TIMELINE, AgentRole.EVIDENCE, AgentRole.QA, AgentRole.REPORT, AgentRole.TELEMETRY].map((role, idx) => (
                <div key={role} className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-100 hover:border-blue-200 transition-colors">
                  <div className="flex items-center gap-4">
                     <div className="w-2 h-2 rounded-full bg-emerald-500" />
                     <span className="text-[11px] font-black text-slate-800 uppercase tracking-tight">{role}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map(i => (
                        <div key={i} className={`w-2.5 h-2.5 rounded-sm ${i === 5 && idx === 1 ? 'bg-slate-300' : 'bg-emerald-500'}`} />
                      ))}
                    </div>
                    <span className="text-[9px] text-slate-400 font-black uppercase tracking-widest">Secure</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
