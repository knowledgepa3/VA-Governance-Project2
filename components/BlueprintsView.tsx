/**
 * BLUEPRINTS VIEW - Governance Dashboard
 * Live platform status + workforce deployment
 */

import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Activity,
  ShieldAlert,
  FileSearch,
  Server,
  Play,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Minus,
  Rocket,
  Settings,
  Zap,
  X,
  Shield,
  FileText,
  Upload
} from 'lucide-react';
import { WorkforceType, AALScoreTrend } from '../types';
import { AALScoreHistory } from '../redTeamAgent';

interface BlueprintsViewProps {
  onSelectTemplate: (template: WorkforceType) => void;
  onLaunchWorkforce?: (template: WorkforceType, autoStart: boolean) => void;
}

// Workforce metadata
const WORKFORCES = [
  {
    type: WorkforceType.VA_CLAIMS,
    name: 'VA Claims Processing',
    shortName: 'VA Claims',
    description: 'Medical Records / Legal Forensics / Federal Compliance',
    fullDescription: 'Processes VA disability claims by extracting medical evidence, mapping to 38 CFR criteria, and generating compliant reports.',
    icon: FileSearch,
    color: 'blue',
    bgColor: 'bg-blue-600/20',
    textColor: 'text-blue-400',
    borderColor: 'border-blue-500',
    agents: ['Intake', 'Triage', 'Medical', 'Legal', 'QA', 'Report'],
    compliance: ['38 CFR', 'HIPAA', 'FedRAMP']
  },
  {
    type: WorkforceType.FINANCIAL_AUDIT,
    name: 'Financial Audit',
    shortName: 'Financial',
    description: 'Banking / SEC Filings / SOX Compliance',
    fullDescription: 'Analyzes financial documents for regulatory compliance, fraud detection, and audit trail verification.',
    icon: TrendingUp,
    color: 'emerald',
    bgColor: 'bg-emerald-600/20',
    textColor: 'text-emerald-400',
    borderColor: 'border-emerald-500',
    agents: ['Intake', 'Classifier', 'Analyzer', 'Compliance', 'QA', 'Report'],
    compliance: ['SOX', 'SEC', 'GAAP']
  },
  {
    type: WorkforceType.CYBER_IR,
    name: 'Cyber Incident Response',
    shortName: 'Cyber IR',
    description: 'KCV Methodology / Threat Intel / CISA Coordination',
    fullDescription: 'Executes Kill Chain Verification methodology for incident response with threat intelligence integration.',
    icon: ShieldAlert,
    color: 'red',
    bgColor: 'bg-red-600/20',
    textColor: 'text-red-400',
    borderColor: 'border-red-500',
    agents: ['Triage', 'KCV', 'Threat Intel', 'Containment', 'Report'],
    compliance: ['NIST CSF', 'CISA', 'MITRE ATT&CK']
  }
];

export const BlueprintsView: React.FC<BlueprintsViewProps> = ({ onSelectTemplate, onLaunchWorkforce }) => {
  const [trends, setTrends] = useState<Record<WorkforceType, AALScoreTrend>>({} as any);
  const [selectedWorkforce, setSelectedWorkforce] = useState<WorkforceType | null>(null);
  const [launchModal, setLaunchModal] = useState<WorkforceType | null>(null);

  // Load trends on mount
  useEffect(() => {
    const loadTrends = () => {
      const newTrends: Record<WorkforceType, AALScoreTrend> = {} as any;
      for (const wf of WORKFORCES) {
        newTrends[wf.type] = AALScoreHistory.getTrend(wf.type);
      }
      setTrends(newTrends);
    };
    loadTrends();

    const interval = setInterval(loadTrends, 30000);
    return () => clearInterval(interval);
  }, []);

  const getTrustBadge = (trend: AALScoreTrend) => {
    if (!trend || trend.entries.length === 0) {
      return { label: 'NOT TESTED', color: 'bg-slate-600', textColor: 'text-slate-300' };
    }
    const last = trend.entries[trend.entries.length - 1];
    if (last.blockerPresent) {
      return { label: 'UNTRUSTED', color: 'bg-red-600', textColor: 'text-red-100' };
    }
    if (last.criticalFindings === 0 && last.highFindings <= 2) {
      return { label: 'TRUSTED', color: 'bg-emerald-600', textColor: 'text-emerald-100' };
    }
    return { label: 'REVIEW', color: 'bg-yellow-600', textColor: 'text-yellow-100' };
  };

  const getCertBadge = (trend: AALScoreTrend) => {
    if (!trend || trend.entries.length === 0) {
      return { label: 'NONE', color: 'bg-slate-700' };
    }
    if (trend.daysSinceLastCertification >= 0) {
      if (trend.daysSinceLastCertification <= 30) {
        return { label: `${trend.daysSinceLastCertification}d`, color: 'bg-emerald-700' };
      } else if (trend.daysSinceLastCertification <= 60) {
        return { label: `${trend.daysSinceLastCertification}d`, color: 'bg-yellow-700' };
      } else {
        return { label: 'EXPIRED', color: 'bg-red-700' };
      }
    }
    return { label: 'NONE', color: 'bg-slate-700' };
  };

  const handleLaunchClick = (type: WorkforceType) => {
    setLaunchModal(type);
  };

  const handleDeploy = (autoStart: boolean) => {
    if (!launchModal) return;

    if (onLaunchWorkforce) {
      onLaunchWorkforce(launchModal, autoStart);
    } else {
      onSelectTemplate(launchModal);
    }
    setLaunchModal(null);
  };

  // Calculate platform-wide stats
  const allEntries = AALScoreHistory.getAllHistory();
  const totalRuns = allEntries.length;
  const passedRuns = allEntries.filter(e => e.certificationStatus === 'PASSED').length;
  const platformHealth = totalRuns > 0 ? Math.round((passedRuns / totalRuns) * 100) : 0;

  const launchWorkforce = launchModal ? WORKFORCES.find(w => w.type === launchModal) : null;

  return (
    <div className="max-w-6xl mx-auto space-y-6 p-6">

      {/* Launch Modal */}
      {launchModal && launchWorkforce && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 animate-in fade-in duration-200">
          <div className={`bg-slate-900 rounded-2xl border-2 ${launchWorkforce.borderColor} w-full max-w-lg mx-4 overflow-hidden animate-in zoom-in-95 duration-300`}>
            {/* Modal Header */}
            <div className={`${launchWorkforce.bgColor} p-6 border-b border-slate-700`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-xl bg-slate-900/50`}>
                    <launchWorkforce.icon size={28} className={launchWorkforce.textColor} />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">{launchWorkforce.name}</h2>
                    <p className="text-sm text-slate-300">{launchWorkforce.description}</p>
                  </div>
                </div>
                <button
                  onClick={() => setLaunchModal(null)}
                  className="text-slate-400 hover:text-white p-1"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4">
              <p className="text-slate-400 text-sm">{launchWorkforce.fullDescription}</p>

              {/* Agent Pipeline */}
              <div className="bg-slate-800 rounded-lg p-4">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Agent Pipeline</h4>
                <div className="flex items-center gap-2 flex-wrap">
                  {launchWorkforce.agents.map((agent, i) => (
                    <React.Fragment key={agent}>
                      <span className="px-2 py-1 bg-slate-700 rounded text-xs text-white font-medium">{agent}</span>
                      {i < launchWorkforce.agents.length - 1 && (
                        <span className="text-slate-600">→</span>
                      )}
                    </React.Fragment>
                  ))}
                </div>
              </div>

              {/* Compliance */}
              <div className="flex items-center gap-2">
                <Shield size={14} className="text-slate-500" />
                <span className="text-xs text-slate-500">Compliance:</span>
                {launchWorkforce.compliance.map(c => (
                  <span key={c} className="px-2 py-0.5 bg-slate-800 rounded text-[10px] text-slate-400 font-medium">{c}</span>
                ))}
              </div>

              {/* Trust Status */}
              {trends[launchModal] && trends[launchModal].entries.length > 0 && (
                <div className="flex items-center justify-between bg-slate-800 rounded-lg p-3">
                  <span className="text-sm text-slate-400">Last Security Score</span>
                  <span className={`text-xl font-bold ${
                    trends[launchModal].currentScore >= 80 ? 'text-emerald-400' :
                    trends[launchModal].currentScore >= 60 ? 'text-yellow-400' : 'text-red-400'
                  }`}>
                    {trends[launchModal].currentScore}/100
                  </span>
                </div>
              )}
            </div>

            {/* Modal Footer - Action Buttons */}
            <div className="p-6 border-t border-slate-700 space-y-3">
              <button
                onClick={() => handleDeploy(true)}
                className={`w-full flex items-center justify-center gap-3 py-3 rounded-xl text-sm font-bold uppercase tracking-wider transition-all ${
                  launchWorkforce.color === 'blue' ? 'bg-blue-600 hover:bg-blue-500' :
                  launchWorkforce.color === 'emerald' ? 'bg-emerald-600 hover:bg-emerald-500' :
                  'bg-red-600 hover:bg-red-500'
                } text-white`}
              >
                <Rocket size={18} />
                Quick Deploy with Demo Data
              </button>

              <button
                onClick={() => handleDeploy(false)}
                className="w-full flex items-center justify-center gap-3 py-3 rounded-xl text-sm font-bold uppercase tracking-wider bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-all"
              >
                <Settings size={18} />
                Configure & Upload Custom Files
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Platform Status Bar */}
      <div className="bg-slate-900 rounded-xl p-4 border border-slate-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <Server size={16} className="text-slate-400" />
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Platform Status</span>
            </div>
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-slate-500">Total Runs:</span>
                <span className="font-mono text-white">{totalRuns}</span>
              </div>
              <div className="h-4 w-px bg-slate-700"></div>
              <div className="flex items-center gap-2">
                <span className="text-slate-500">Pass Rate:</span>
                <span className={`font-mono ${platformHealth >= 80 ? 'text-emerald-400' : platformHealth >= 60 ? 'text-yellow-400' : 'text-red-400'}`}>
                  {platformHealth}%
                </span>
              </div>
              <div className="h-4 w-px bg-slate-700"></div>
              <div className="flex items-center gap-2">
                <span className="text-slate-500">Workforces:</span>
                <span className="font-mono text-white">{WORKFORCES.length}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${totalRuns > 0 ? 'bg-emerald-500 animate-pulse' : 'bg-slate-600'}`}></div>
            <span className="text-xs text-slate-400">{totalRuns > 0 ? 'Active' : 'Ready'}</span>
          </div>
        </div>
      </div>

      {/* Workforce Cards Grid */}
      <div className="grid grid-cols-3 gap-4">
        {WORKFORCES.map(wf => {
          const trend = trends[wf.type];
          const trustBadge = getTrustBadge(trend);
          const certBadge = getCertBadge(trend);
          const Icon = wf.icon;
          const lastScore = trend?.currentScore || 0;
          const lastRun = trend?.entries[trend.entries.length - 1];
          const isSelected = selectedWorkforce === wf.type;

          return (
            <div
              key={wf.type}
              onClick={() => setSelectedWorkforce(isSelected ? null : wf.type)}
              className={`bg-slate-800 rounded-xl border transition-all cursor-pointer ${
                isSelected ? 'border-slate-500 ring-1 ring-slate-500' : 'border-slate-700 hover:border-slate-600'
              }`}
            >
              {/* Card Header */}
              <div className="p-4 border-b border-slate-700">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${wf.bgColor}`}>
                      <Icon size={18} className={wf.textColor} />
                    </div>
                    <div>
                      <h3 className="font-bold text-white text-sm">{wf.shortName}</h3>
                      <p className="text-[10px] text-slate-500 mt-0.5">{wf.description}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Card Body - Stats */}
              <div className="p-4 space-y-3">
                {/* Trust & Cert Row */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${trustBadge.color} ${trustBadge.textColor}`}>
                      {trustBadge.label}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${certBadge.color} text-white`}>
                      CERT: {certBadge.label}
                    </span>
                  </div>
                </div>

                {/* Score Row */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500 text-xs">Score:</span>
                    <span className={`text-lg font-black ${
                      lastScore >= 80 ? 'text-emerald-400' :
                      lastScore >= 60 ? 'text-yellow-400' :
                      lastScore > 0 ? 'text-red-400' : 'text-slate-600'
                    }`}>
                      {lastScore > 0 ? lastScore : '--'}
                    </span>
                  </div>
                  {trend && trend.entries.length >= 2 && (
                    <div className="flex items-center gap-1">
                      {trend.trendDirection === 'IMPROVING' ? (
                        <TrendingUp size={14} className="text-emerald-400" />
                      ) : trend.trendDirection === 'DECLINING' ? (
                        <TrendingDown size={14} className="text-red-400" />
                      ) : (
                        <Minus size={14} className="text-slate-500" />
                      )}
                      <span className={`text-xs ${
                        trend.trendDirection === 'IMPROVING' ? 'text-emerald-400' :
                        trend.trendDirection === 'DECLINING' ? 'text-red-400' : 'text-slate-500'
                      }`}>
                        {trend.trendPercentage > 0 ? '+' : ''}{trend.trendPercentage}%
                      </span>
                    </div>
                  )}
                </div>

                {/* Mini Trend Graph */}
                {trend && trend.entries.length > 0 && (
                  <div className="flex items-end gap-0.5 h-8">
                    {trend.entries.slice(-10).map((entry, i) => (
                      <div
                        key={i}
                        className={`flex-1 rounded-t transition-all ${
                          entry.overallScore >= 80 ? 'bg-emerald-500/60' :
                          entry.overallScore >= 60 ? 'bg-yellow-500/60' : 'bg-red-500/60'
                        }`}
                        style={{ height: `${Math.max(entry.overallScore, 10)}%` }}
                        title={`Run ${i + 1}: ${entry.overallScore}`}
                      />
                    ))}
                  </div>
                )}

                {/* Last Run Info */}
                <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-slate-700">
                  {lastRun ? (
                    <>
                      <div className="flex items-center gap-1">
                        <Clock size={10} />
                        <span>{new Date(lastRun.timestamp).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        {lastRun.criticalFindings > 0 && (
                          <span className="text-red-400">{lastRun.criticalFindings}C</span>
                        )}
                        {lastRun.highFindings > 0 && (
                          <span className="text-orange-400">{lastRun.highFindings}H</span>
                        )}
                        {lastRun.criticalFindings === 0 && lastRun.highFindings === 0 && (
                          <span className="text-emerald-400">Clean</span>
                        )}
                      </div>
                    </>
                  ) : (
                    <span className="text-slate-600">No runs yet</span>
                  )}
                </div>
              </div>

              {/* Launch Button */}
              <div className="p-3 border-t border-slate-700">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleLaunchClick(wf.type);
                  }}
                  className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                    wf.color === 'blue' ? 'bg-blue-600 hover:bg-blue-500 text-white' :
                    wf.color === 'emerald' ? 'bg-emerald-600 hover:bg-emerald-500 text-white' :
                    'bg-red-600 hover:bg-red-500 text-white'
                  }`}
                >
                  <Rocket size={14} />
                  Deploy Workforce
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Expanded Detail Panel */}
      {selectedWorkforce && trends[selectedWorkforce] && trends[selectedWorkforce].entries.length > 0 && (
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-6 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-white">
              {WORKFORCES.find(w => w.type === selectedWorkforce)?.name} - Run History
            </h3>
            <button
              onClick={() => setSelectedWorkforce(null)}
              className="text-slate-400 hover:text-white text-xs"
            >
              Close
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-700 text-slate-500">
                  <th className="text-left py-2 font-medium">Run ID</th>
                  <th className="text-left py-2 font-medium">Date</th>
                  <th className="text-left py-2 font-medium">Type</th>
                  <th className="text-right py-2 font-medium">Score</th>
                  <th className="text-right py-2 font-medium">Delta</th>
                  <th className="text-right py-2 font-medium">Critical</th>
                  <th className="text-right py-2 font-medium">High</th>
                  <th className="text-center py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {trends[selectedWorkforce].entries.slice(-10).reverse().map((entry, i) => (
                  <tr key={i} className="border-b border-slate-700/50 hover:bg-slate-700/30">
                    <td className="py-2 font-mono text-cyan-400">{entry.runId.slice(-12)}</td>
                    <td className="py-2 text-slate-400">{new Date(entry.timestamp).toLocaleString()}</td>
                    <td className="py-2">
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                        entry.runType === 'CERTIFICATION' ? 'bg-purple-600/30 text-purple-300' :
                        entry.runType === 'FULL' ? 'bg-blue-600/30 text-blue-300' : 'bg-slate-600/30 text-slate-300'
                      }`}>
                        {entry.runType}
                      </span>
                    </td>
                    <td className={`py-2 text-right font-mono font-bold ${
                      entry.overallScore >= 80 ? 'text-emerald-400' :
                      entry.overallScore >= 60 ? 'text-yellow-400' : 'text-red-400'
                    }`}>
                      {entry.overallScore}
                    </td>
                    <td className={`py-2 text-right font-mono ${
                      (entry.scoreDelta || 0) > 0 ? 'text-emerald-400' :
                      (entry.scoreDelta || 0) < 0 ? 'text-red-400' : 'text-slate-500'
                    }`}>
                      {entry.scoreDelta !== undefined ? (entry.scoreDelta > 0 ? '+' : '') + entry.scoreDelta : '--'}
                    </td>
                    <td className={`py-2 text-right font-mono ${entry.criticalFindings > 0 ? 'text-red-400' : 'text-slate-500'}`}>
                      {entry.criticalFindings}
                    </td>
                    <td className={`py-2 text-right font-mono ${entry.highFindings > 0 ? 'text-orange-400' : 'text-slate-500'}`}>
                      {entry.highFindings}
                    </td>
                    <td className="py-2 text-center">
                      {entry.certificationStatus === 'PASSED' ? (
                        <CheckCircle size={14} className="text-emerald-400 mx-auto" />
                      ) : entry.certificationStatus === 'FAILED' ? (
                        <XCircle size={14} className="text-red-400 mx-auto" />
                      ) : (
                        <AlertTriangle size={14} className="text-yellow-400 mx-auto" />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Quick Actions Footer */}
      <div className="flex items-center justify-between text-xs text-slate-500 pt-2">
        <span>ACE Governance Platform v1.0</span>
        <div className="flex items-center gap-4">
          <span>AAL v2024.01 • 44 Attack Vectors</span>
        </div>
      </div>
    </div>
  );
};

export default BlueprintsView;
