
import React, { useEffect, useRef } from 'react';
import {
  Activity,
  ShieldCheck,
  AlertTriangle,
  Zap,
  Target,
  Award,
  Shield,
  CheckCircle,
  ShieldX,
  Eye,
  Terminal,
  TrendingUp,
  BarChart3,
  Cpu,
  Network,
  CheckCircle2,
  XCircle
} from 'lucide-react';
import { AgentRole, AgentStatus, AgentState, ActivityLog } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

interface MetricCardProps {
  label: string;
  value: string;
  status: 'Healthy' | 'Warning' | 'Critical';
  icon: React.ReactNode;
  subtext?: string;
}

const MetricCard: React.FC<MetricCardProps> = ({ label, value, status, icon, subtext }) => {
  const colors = {
    Healthy: 'text-emerald-600 bg-emerald-50 border-emerald-200',
    Warning: 'text-amber-600 bg-amber-50 border-amber-200',
    Critical: 'text-rose-600 bg-rose-50 border-rose-200',
  };

  return (
    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4 group hover:shadow-md transition-all hover:border-blue-200">
      <div className={`p-3 rounded-xl transition-transform group-hover:scale-110 border ${colors[status]}`}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest truncate">{label}</p>
        <p className="text-xl font-black text-slate-900 tracking-tighter">{value}</p>
        {subtext && <p className="text-[9px] text-slate-400 truncate">{subtext}</p>}
      </div>
      <div className={`w-2 h-2 rounded-full ${status === 'Healthy' ? 'bg-emerald-500 animate-pulse' : status === 'Warning' ? 'bg-amber-500 animate-pulse' : 'bg-rose-500'}`} />
    </div>
  );
};

interface MonitoringDashboardProps {
  telemetry?: any;
  agents?: Record<AgentRole, AgentState>;
  activityFeed?: ActivityLog[];
}

export const MonitoringDashboard: React.FC<MonitoringDashboardProps> = ({ telemetry, agents, activityFeed = [] }) => {
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [activityFeed]);

  // Calculate real metrics from agents - includes both VA Claims and Financial Audit roles
  const agentList = agents ? Object.values(agents).filter(a =>
    [
      // VA Claims roles
      AgentRole.GATEWAY, AgentRole.TIMELINE, AgentRole.EVIDENCE,
      AgentRole.RATER_INITIAL, AgentRole.CP_EXAMINER, AgentRole.RATER_DECISION,
      AgentRole.QA, AgentRole.REPORT, AgentRole.TELEMETRY,
      // Financial Audit roles
      AgentRole.LEDGER_AUDITOR, AgentRole.FRAUD_DETECTOR, AgentRole.TAX_COMPLIANCE,
      AgentRole.FINANCIAL_QA, AgentRole.FINANCIAL_REPORT
    ].includes(a.role)
  ) : [];

  const completedAgents = agentList.filter(a => a.status === AgentStatus.COMPLETE);
  const workingAgents = agentList.filter(a => a.status === AgentStatus.WORKING);
  const totalCorrections = completedAgents.reduce((sum, a) => sum + (a.supervisorScore?.corrections || 0), 0);
  const avgIntegrity = completedAgents.length > 0
    ? Math.round(completedAgents.reduce((sum, a) => sum + (a.supervisorScore?.integrity || 0), 0) / completedAgents.length)
    : 100;
  const totalTokens = completedAgents.reduce((sum, a) => sum + (a.tokenUsage?.input || 0) + (a.tokenUsage?.output || 0), 0);

  // Activity log type counts
  const successLogs = activityFeed.filter(l => l.type === 'success').length;
  const warningLogs = activityFeed.filter(l => l.type === 'warning').length;
  const errorLogs = activityFeed.filter(l => l.type === 'error').length;

  const chartData = completedAgents.map(a => ({
    name: a.role.split(' ')[0],
    integrity: a.supervisorScore?.integrity || 0,
    accuracy: a.supervisorScore?.accuracy || 0,
    compliance: a.supervisorScore?.compliance || 0
  }));

  const pieData = [
    { name: 'Success', value: successLogs, color: '#10b981' },
    { name: 'Warning', value: warningLogs, color: '#f59e0b' },
    { name: 'Error', value: errorLogs, color: '#ef4444' },
  ].filter(d => d.value > 0);

  const interventions = totalCorrections;

  const cmmcScore = telemetry?.cmmc_readiness_score || 94;
  const cmmcBreakdown = telemetry?.cmmc_breakdown || {
    system_integrity_si: avgIntegrity,
    audit_accountability_au: 95,
    access_control_ac: 90,
    incident_response_ir: 100
  };

  const getLogTypeIcon = (type: string) => {
    switch (type) {
      case 'success': return <CheckCircle2 size={12} className="text-emerald-500" />;
      case 'warning': return <AlertTriangle size={12} className="text-amber-500" />;
      case 'error': return <XCircle size={12} className="text-rose-500" />;
      default: return <Activity size={12} className="text-blue-500" />;
    }
  };

  const getLogTypeBg = (type: string) => {
    switch (type) {
      case 'success': return 'border-l-emerald-500 bg-emerald-50/50';
      case 'warning': return 'border-l-amber-500 bg-amber-50/50';
      case 'error': return 'border-l-rose-500 bg-rose-50/50';
      default: return 'border-l-blue-500 bg-blue-50/50';
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Top Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <MetricCard
          label="System Status"
          value={workingAgents.length > 0 ? 'PROCESSING' : completedAgents.length > 0 ? 'COMPLETE' : 'READY'}
          status={workingAgents.length > 0 ? 'Warning' : 'Healthy'}
          icon={<Activity size={20} />}
          subtext={`${completedAgents.length}/${agentList.length} agents`}
        />
        <MetricCard
          label="Avg Integrity"
          value={`${avgIntegrity}%`}
          status={avgIntegrity >= 90 ? 'Healthy' : avgIntegrity >= 70 ? 'Warning' : 'Critical'}
          icon={<ShieldCheck size={20} />}
          subtext="Supervisor verified"
        />
        <MetricCard
          label="Corrections"
          value={interventions.toString()}
          status={interventions === 0 ? 'Healthy' : interventions < 3 ? 'Warning' : 'Critical'}
          icon={<Zap size={20} />}
          subtext={interventions === 0 ? 'No issues' : 'Auto-remediated'}
        />
        <MetricCard
          label="Token Usage"
          value={totalTokens > 1000 ? `${(totalTokens / 1000).toFixed(1)}K` : totalTokens.toString()}
          status="Healthy"
          icon={<Cpu size={20} />}
          subtext="Total consumed"
        />
        <MetricCard
          label="Activity Events"
          value={activityFeed.length.toString()}
          status={errorLogs > 0 ? 'Warning' : 'Healthy'}
          icon={<BarChart3 size={20} />}
          subtext={`${successLogs} ok / ${warningLogs} warn / ${errorLogs} err`}
        />
      </div>

      {/* Main Dashboard Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Left Column - Compact Compliance + Live Stats */}
        <div className="space-y-4">
          {/* Compact CMMC Score Card */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-slate-900 text-white rounded-lg"><Award size={14} /></div>
                <span className="text-[10px] font-black text-slate-900 uppercase">CMMC 2.0</span>
              </div>
              <div className={`text-lg font-black ${cmmcScore >= 90 ? 'text-emerald-600' : cmmcScore >= 70 ? 'text-amber-600' : 'text-rose-600'}`}>
                {cmmcScore}%
              </div>
            </div>
            <div className="grid grid-cols-4 gap-1">
              {[
                { key: 'SI', value: cmmcBreakdown.system_integrity_si, color: 'bg-emerald-500' },
                { key: 'AU', value: cmmcBreakdown.audit_accountability_au, color: 'bg-blue-500' },
                { key: 'AC', value: cmmcBreakdown.access_control_ac, color: 'bg-purple-500' },
                { key: 'IR', value: cmmcBreakdown.incident_response_ir, color: 'bg-amber-500' }
              ].map((item) => (
                <div key={item.key} className="text-center">
                  <div className="text-[8px] font-bold text-slate-400">{item.key}</div>
                  <div className={`h-1 rounded-full ${item.color} mx-auto mt-1`} style={{ width: `${item.value}%` }} />
                  <div className="text-[9px] font-black text-slate-700 mt-0.5">{item.value}%</div>
                </div>
              ))}
            </div>
          </div>

          {/* Live Processing Stats - Real Activity */}
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 p-4 rounded-2xl border border-slate-700 shadow-xl">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[10px] font-black text-white uppercase tracking-wider flex items-center gap-2">
                <Activity size={14} className="text-emerald-400" /> Live Processing
              </h3>
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between p-2 rounded-lg bg-slate-800/50">
                <span className="text-[9px] text-slate-400 font-bold uppercase">Active Agents</span>
                <span className="text-sm font-black text-blue-400">{workingAgents.length}</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-slate-800/50">
                <span className="text-[9px] text-slate-400 font-bold uppercase">Completed</span>
                <span className="text-sm font-black text-emerald-400">{completedAgents.length}/{agentList.length}</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-slate-800/50">
                <span className="text-[9px] text-slate-400 font-bold uppercase">Corrections</span>
                <span className={`text-sm font-black ${interventions === 0 ? 'text-emerald-400' : 'text-amber-400'}`}>{interventions}</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-slate-800/50">
                <span className="text-[9px] text-slate-400 font-bold uppercase">Avg Integrity</span>
                <span className={`text-sm font-black ${avgIntegrity >= 90 ? 'text-emerald-400' : 'text-amber-400'}`}>{avgIntegrity}%</span>
              </div>
            </div>
          </div>

          {/* Event Distribution Pie */}
          {pieData.length > 0 && (
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                <Network size={16} className="text-blue-600" /> Event Distribution
              </h3>
              <div className="h-40">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={40} outerRadius={60} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>

        {/* Center Column - Agent Scores Chart + Agent Grid */}
        <div className="space-y-6">
          {/* Agent Scores Bar Chart */}
          {chartData.length > 0 && (
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                <TrendingUp size={16} className="text-blue-600" /> Agent Supervisor Scores
              </h3>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} barGap={2}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#94a3b8', fontWeight: 700 }} />
                    <YAxis domain={[0, 100]} axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#94a3b8' }} />
                    <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 40px -10px rgb(0 0 0 / 0.2)', fontSize: '10px' }} />
                    <Bar dataKey="integrity" fill="#10b981" radius={[4, 4, 0, 0]} name="Integrity" />
                    <Bar dataKey="accuracy" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Accuracy" />
                    <Bar dataKey="compliance" fill="#8b5cf6" radius={[4, 4, 0, 0]} name="Compliance" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="flex justify-center gap-4 mt-3 text-[9px] font-bold">
                <span className="flex items-center gap-1"><div className="w-2 h-2 rounded bg-emerald-500" /> Integrity</span>
                <span className="flex items-center gap-1"><div className="w-2 h-2 rounded bg-blue-500" /> Accuracy</span>
                <span className="flex items-center gap-1"><div className="w-2 h-2 rounded bg-purple-500" /> Compliance</span>
              </div>
            </div>
          )}

          {/* Agent Status Grid */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Eye size={16} className="text-blue-600" /> Agent Population Status
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {agentList.map((agent) => (
                <div key={agent.role} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100 hover:border-blue-200 transition-colors">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className={`w-2 h-2 rounded-full ${
                      agent.status === AgentStatus.COMPLETE ? 'bg-emerald-500' :
                      agent.status === AgentStatus.WORKING ? 'bg-blue-500 animate-pulse' :
                      agent.status === AgentStatus.REPAIRING ? 'bg-purple-500 animate-bounce' :
                      agent.status === AgentStatus.FAILED ? 'bg-rose-500' :
                      'bg-slate-300'
                    }`} />
                    <span className="text-[10px] font-bold text-slate-700 truncate">{agent.role.split(' ')[0]}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {agent.supervisorScore && (
                      <span className={`text-[9px] font-black ${
                        agent.supervisorScore.integrity >= 90 ? 'text-emerald-600' :
                        agent.supervisorScore.integrity >= 70 ? 'text-amber-600' : 'text-rose-600'
                      }`}>
                        {agent.supervisorScore.integrity}%
                      </span>
                    )}
                    {agent.supervisorScore?.corrections ? (
                      <AlertTriangle size={12} className="text-amber-500" />
                    ) : agent.status === AgentStatus.COMPLETE ? (
                      <CheckCircle2 size={12} className="text-emerald-500" />
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column - Real-time Activity Log (SIEM Style) */}
        <div className="bg-slate-900 rounded-2xl border border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[600px]">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/80 backdrop-blur-sm sticky top-0">
            <h3 className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2 text-emerald-400">
              <Terminal size={14} /> Live Activity Stream
            </h3>
            <div className="flex items-center gap-2">
              <span className="text-[9px] font-mono text-slate-500">{activityFeed.length} events</span>
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            </div>
          </div>

          <div ref={logRef} className="flex-1 overflow-auto p-3 space-y-2 font-mono text-[10px]">
            {activityFeed.length === 0 ? (
              <div className="text-center py-12 text-slate-600">
                <Terminal size={32} className="mx-auto mb-3 opacity-30" />
                <p className="text-[10px] font-bold uppercase tracking-widest">Awaiting Activity...</p>
                <p className="text-[9px] text-slate-700 mt-1">Start workflow to see real-time logs</p>
              </div>
            ) : (
              activityFeed.map((log) => (
                <div
                  key={log.id}
                  className={`p-2 rounded-lg border-l-2 animate-in slide-in-from-right-2 duration-300 ${getLogTypeBg(log.type)}`}
                >
                  <div className="flex items-start gap-2">
                    {getLogTypeIcon(log.type)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-[9px] text-slate-500">{log.timestamp}</span>
                        <span className={`text-[9px] font-black uppercase ${
                          log.role === AgentRole.SUPERVISOR ? 'text-amber-400' :
                          log.role === AgentRole.REPAIR ? 'text-purple-400' :
                          'text-blue-400'
                        }`}>
                          {log.role.split(' ')[0]}
                        </span>
                      </div>
                      <p className="text-slate-300 leading-relaxed break-words">{log.message}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Log Stats Footer */}
          <div className="p-3 border-t border-slate-800 bg-slate-900/80 flex items-center justify-between text-[9px] font-mono">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1 text-emerald-400">
                <CheckCircle2 size={10} /> {successLogs}
              </span>
              <span className="flex items-center gap-1 text-amber-400">
                <AlertTriangle size={10} /> {warningLogs}
              </span>
              <span className="flex items-center gap-1 text-rose-400">
                <XCircle size={10} /> {errorLogs}
              </span>
            </div>
            <span className="text-slate-600">Real-time • Auto-scroll</span>
          </div>
        </div>
      </div>
    </div>
  );
};
