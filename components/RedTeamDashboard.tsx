/**
 * RED TEAM DASHBOARD COMPONENT
 * Visual display for adversarial assurance results
 */

import React, { useState, useMemo } from 'react';
import {
  Shield,
  AlertTriangle,
  CheckCircle,
  XCircle,
  AlertOctagon,
  Activity,
  Target,
  Crosshair,
  FileWarning,
  Lock,
  Unlock,
  TrendingUp,
  TrendingDown,
  Clock,
  ChevronDown,
  ChevronRight,
  Bug,
  ShieldAlert,
  ShieldCheck,
  Zap,
  Eye,
  FileText,
  Award,
  Download,
  FileJson,
  ClipboardCopy
} from 'lucide-react';
import {
  RedTeamRunResult,
  RedTeamFinding,
  RedTeamScoreCard,
  RedTeamTestSuite,
  RedTeamPhase,
  RedTeamSeverity,
  RedTeamActivityLog,
  RedTeamRecommendation,
  ExecutiveProof
} from '../types';
import { generateExecutiveProof, downloadExecutiveProof, exportExecutiveProofJSON } from '../redTeamAgent';

interface RedTeamDashboardProps {
  result: RedTeamRunResult;
  onClose?: () => void;
}

export const RedTeamDashboard: React.FC<RedTeamDashboardProps> = ({ result, onClose }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'findings' | 'tests' | 'contract' | 'proof' | 'recommendations' | 'logs'>('overview');
  const [expandedFinding, setExpandedFinding] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const { scoreCard, findings, testResults, recommendations, logs, contract, reproducibility } = result;

  // Generate Executive Proof on demand
  const executiveProof = useMemo(() => generateExecutiveProof(result), [result]);

  const handleDownloadProof = () => {
    downloadExecutiveProof(executiveProof);
  };

  const handleCopyProof = () => {
    navigator.clipboard.writeText(exportExecutiveProofJSON(executiveProof));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getSeverityColor = (severity: RedTeamSeverity) => {
    switch (severity) {
      case RedTeamSeverity.CRITICAL: return 'text-red-600 bg-red-50 border-red-200';
      case RedTeamSeverity.HIGH: return 'text-orange-600 bg-orange-50 border-orange-200';
      case RedTeamSeverity.MEDIUM: return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case RedTeamSeverity.LOW: return 'text-blue-600 bg-blue-50 border-blue-200';
      case RedTeamSeverity.INFORMATIONAL: return 'text-slate-600 bg-slate-50 border-slate-200';
      default: return 'text-slate-600 bg-slate-50 border-slate-200';
    }
  };

  const getSeverityBadge = (severity: RedTeamSeverity) => {
    const colors = getSeverityColor(severity);
    return (
      <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border ${colors}`}>
        {severity}
      </span>
    );
  };

  const getSuiteIcon = (suite: RedTeamTestSuite) => {
    switch (suite) {
      case RedTeamTestSuite.PROMPT_INJECTION: return <Zap size={14} />;
      case RedTeamTestSuite.DATA_LEAKAGE: return <Unlock size={14} />;
      case RedTeamTestSuite.AUTHORITY_ESCALATION: return <ShieldAlert size={14} />;
      case RedTeamTestSuite.FABRICATION: return <FileWarning size={14} />;
      case RedTeamTestSuite.WORKFLOW_TAMPER: return <Bug size={14} />;
      case RedTeamTestSuite.TOOL_ABUSE: return <Target size={14} />;
      default: return <AlertTriangle size={14} />;
    }
  };

  const getLogTypeColor = (type: string) => {
    switch (type) {
      case 'attack': return 'text-red-600';
      case 'defense': return 'text-green-600';
      case 'error': return 'text-red-500';
      case 'warning': return 'text-yellow-600';
      case 'success': return 'text-emerald-600';
      default: return 'text-slate-600';
    }
  };

  return (
    <div className="bg-slate-900 text-white min-h-screen">
      {/* Header */}
      <div className="bg-gradient-to-r from-red-900 via-red-800 to-slate-900 px-6 py-4 border-b border-red-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-600 flex items-center justify-center">
              <Crosshair size={24} />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">ADVERSARIAL ASSURANCE LANE</h1>
              <p className="text-red-300 text-xs">Continuous Adversarial Validation (CAV) Report</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Trust Status Badge */}
            <div className={`px-3 py-1.5 rounded-lg font-bold text-xs ${
              result.workflowTrustStatus === 'TRUSTED'
                ? 'bg-emerald-600'
                : result.workflowTrustStatus === 'UNTRUSTED'
                  ? 'bg-red-600'
                  : 'bg-yellow-600'
            }`}>
              {result.workflowTrustStatus === 'TRUSTED' && <ShieldCheck size={14} className="inline mr-1" />}
              {result.workflowTrustStatus === 'UNTRUSTED' && <AlertOctagon size={14} className="inline mr-1" />}
              {result.workflowTrustStatus}
            </div>
            {/* Promotion Status */}
            <div className={`px-3 py-1.5 rounded-lg font-bold text-xs ${
              result.contract.promotionAllowed ? 'bg-emerald-700' : 'bg-red-700'
            }`}>
              {result.contract.promotionAllowed ? '✓ PROMOTABLE' : '✗ BLOCKED'}
            </div>
            {/* Certification Status */}
            <div className={`px-3 py-1.5 rounded-lg font-bold text-xs ${
              scoreCard.certificationStatus === 'PASSED'
                ? 'bg-emerald-600'
                : scoreCard.certificationStatus === 'FAILED'
                  ? 'bg-red-600'
                  : 'bg-yellow-600'
            }`}>
              {scoreCard.certificationStatus}
            </div>
            {/* Executive Proof Export Button */}
            <button
              onClick={handleDownloadProof}
              className="px-3 py-1.5 rounded-lg font-bold text-xs bg-purple-600 hover:bg-purple-500 transition-colors flex items-center gap-1.5"
              title="Download Executive Proof (JSON)"
            >
              <Download size={14} />
              EXEC PROOF
            </button>
            {onClose && (
              <button onClick={onClose} className="text-slate-400 hover:text-white ml-2">
                <XCircle size={24} />
              </button>
            )}
          </div>
        </div>
        {/* Reproducibility Bar */}
        <div className="mt-3 flex items-center gap-4 text-[10px] text-red-300/70 font-mono">
          <span>Seed: {result.reproducibility.seed}</span>
          <span>|</span>
          <span>Suite: {result.reproducibility.suiteVersion}</span>
          <span>|</span>
          <span>Platform: {result.reproducibility.platformVersion}</span>
          <span>|</span>
          <span>Gate: {result.config.gatingMode}</span>
        </div>
      </div>

      {/* Score Overview */}
      <div className="px-6 py-4 bg-slate-800/50 border-b border-slate-700">
        <div className="grid grid-cols-6 gap-4">
          {/* Overall Score */}
          <div className="col-span-2 bg-slate-800 rounded-xl p-4 border border-slate-700">
            <div className="flex items-center justify-between mb-2">
              <span className="text-slate-400 text-xs font-medium uppercase tracking-wider">Security Score</span>
              {scoreCard.blockerPresent && (
                <span className="px-2 py-0.5 bg-red-600 rounded text-[9px] font-bold">BLOCKER</span>
              )}
            </div>
            <div className="flex items-end gap-2">
              <span className={`text-5xl font-black ${
                scoreCard.overallScore >= 80 ? 'text-emerald-400' :
                scoreCard.overallScore >= 60 ? 'text-yellow-400' :
                'text-red-400'
              }`}>
                {scoreCard.overallScore}
              </span>
              <span className="text-slate-500 text-lg mb-2">/100</span>
            </div>
            <div className="mt-2 h-2 bg-slate-700 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all ${
                  scoreCard.overallScore >= 80 ? 'bg-emerald-500' :
                  scoreCard.overallScore >= 60 ? 'bg-yellow-500' :
                  'bg-red-500'
                }`}
                style={{ width: `${scoreCard.overallScore}%` }}
              />
            </div>
          </div>

          {/* Test Results */}
          <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
            <span className="text-slate-400 text-xs font-medium uppercase tracking-wider">Pass Rate</span>
            <div className="text-2xl font-bold text-white mt-1">{scoreCard.passRate}%</div>
            <div className="text-xs text-slate-500 mt-1">
              {scoreCard.totalTestsPassed}/{scoreCard.totalTestsRun} tests
            </div>
          </div>

          {/* Critical Findings */}
          <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
            <span className="text-slate-400 text-xs font-medium uppercase tracking-wider">Critical</span>
            <div className={`text-2xl font-bold ${scoreCard.criticalFindings > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
              {scoreCard.criticalFindings}
            </div>
            <div className="text-xs text-slate-500 mt-1">findings</div>
          </div>

          {/* High Findings */}
          <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
            <span className="text-slate-400 text-xs font-medium uppercase tracking-wider">High</span>
            <div className={`text-2xl font-bold ${scoreCard.highFindings > 0 ? 'text-orange-400' : 'text-emerald-400'}`}>
              {scoreCard.highFindings}
            </div>
            <div className="text-xs text-slate-500 mt-1">findings</div>
          </div>

          {/* Run Duration */}
          <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
            <span className="text-slate-400 text-xs font-medium uppercase tracking-wider">Duration</span>
            <div className="text-2xl font-bold text-white mt-1">
              {Math.round(scoreCard.runDurationMs / 1000)}s
            </div>
            <div className="text-xs text-slate-500 mt-1">
              <Clock size={10} className="inline mr-1" />
              {new Date(result.startTime).toLocaleTimeString()}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="px-6 border-b border-slate-700">
        <div className="flex gap-1">
          {(['overview', 'findings', 'tests', 'contract', 'proof', 'recommendations', 'logs'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-3 text-xs font-bold uppercase tracking-wider transition-all border-b-2 ${
                activeTab === tab
                  ? 'text-red-400 border-red-400 bg-slate-800/50'
                  : 'text-slate-400 border-transparent hover:text-white hover:bg-slate-800/30'
              }`}
            >
              {tab}
              {tab === 'findings' && findings.length > 0 && (
                <span className="ml-2 px-1.5 py-0.5 bg-red-600 rounded text-[9px]">{findings.length}</span>
              )}
              {tab === 'contract' && (
                <span className={`ml-2 px-1.5 py-0.5 rounded text-[9px] ${
                  contract.trustStatus === 'TRUSTED' ? 'bg-emerald-600' :
                  contract.trustStatus === 'UNTRUSTED' ? 'bg-red-600' : 'bg-yellow-600'
                }`}>
                  {contract.trustStatus === 'TRUSTED' ? '✓' : contract.trustStatus === 'UNTRUSTED' ? '✗' : '?'}
                </span>
              )}
              {tab === 'proof' && (
                <span className="ml-2 px-1.5 py-0.5 bg-purple-600 rounded text-[9px]">
                  <FileJson size={10} className="inline" />
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="p-6">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-2 gap-6">
            {/* Suite Breakdown */}
            <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
              <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                <Target size={16} className="text-red-400" />
                Test Suite Breakdown
              </h3>
              <div className="space-y-3">
                {(Object.entries(scoreCard.suiteScores) as [RedTeamTestSuite, { score: number; passed: number; failed: number; findings: number }][]).map(([suite, data]) => (
                  <div key={suite} className="flex items-center gap-3">
                    <div className="w-6 text-slate-400">{getSuiteIcon(suite)}</div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-slate-300">{suite.replace(/_/g, ' ')}</span>
                        <span className={`text-xs font-bold ${data.score >= 80 ? 'text-emerald-400' : data.score >= 60 ? 'text-yellow-400' : 'text-red-400'}`}>
                          {data.score}%
                        </span>
                      </div>
                      <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${data.score >= 80 ? 'bg-emerald-500' : data.score >= 60 ? 'bg-yellow-500' : 'bg-red-500'}`}
                          style={{ width: `${data.score}%` }}
                        />
                      </div>
                    </div>
                    <div className="text-[10px] text-slate-500 w-16 text-right">
                      {data.passed}/{data.passed + data.failed}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Findings Summary */}
            <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
              <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                <AlertTriangle size={16} className="text-yellow-400" />
                Findings by Severity
              </h3>
              <div className="grid grid-cols-5 gap-2">
                {[
                  { label: 'Critical', count: scoreCard.criticalFindings, color: 'bg-red-600' },
                  { label: 'High', count: scoreCard.highFindings, color: 'bg-orange-500' },
                  { label: 'Medium', count: scoreCard.mediumFindings, color: 'bg-yellow-500' },
                  { label: 'Low', count: scoreCard.lowFindings, color: 'bg-blue-500' },
                  { label: 'Info', count: scoreCard.infoFindings, color: 'bg-slate-500' }
                ].map(item => (
                  <div key={item.label} className="text-center p-3 bg-slate-700/50 rounded-lg">
                    <div className={`w-8 h-8 ${item.color} rounded-lg mx-auto flex items-center justify-center text-white font-bold`}>
                      {item.count}
                    </div>
                    <div className="text-[9px] text-slate-400 mt-2 uppercase tracking-wider">{item.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Activity */}
            <div className="col-span-2 bg-slate-800 rounded-xl p-4 border border-slate-700">
              <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                <Activity size={16} className="text-cyan-400" />
                Attack/Defense Timeline
              </h3>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {logs.slice(-20).map(log => (
                  <div key={log.id} className="flex items-start gap-3 text-xs">
                    <span className="text-slate-500 font-mono w-20 flex-shrink-0">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </span>
                    <span className={`font-medium ${getLogTypeColor(log.type)}`}>
                      {log.type === 'attack' && '🎯'}
                      {log.type === 'defense' && '🛡️'}
                      {log.type === 'error' && '❌'}
                      {log.type === 'warning' && '⚠️'}
                      {log.type === 'success' && '✅'}
                      {log.type === 'info' && 'ℹ️'}
                    </span>
                    <span className="text-slate-300">{log.message}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Findings Tab */}
        {activeTab === 'findings' && (
          <div className="space-y-3">
            {findings.length === 0 ? (
              <div className="text-center py-12">
                <ShieldCheck size={48} className="mx-auto text-emerald-400 mb-4" />
                <h3 className="text-lg font-bold text-white">No Findings</h3>
                <p className="text-slate-400 text-sm">All security tests passed</p>
              </div>
            ) : (
              findings.map(finding => (
                <div
                  key={finding.id}
                  className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden"
                >
                  <button
                    onClick={() => setExpandedFinding(expandedFinding === finding.id ? null : finding.id)}
                    className="w-full px-4 py-3 flex items-center gap-3 hover:bg-slate-700/50 transition-all"
                  >
                    {expandedFinding === finding.id ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                    {getSeverityBadge(finding.severity)}
                    <span className="text-white font-medium flex-1 text-left">{finding.title}</span>
                    <span className="text-slate-500 text-xs">{finding.suite.replace(/_/g, ' ')}</span>
                  </button>
                  {expandedFinding === finding.id && (
                    <div className="px-4 pb-4 border-t border-slate-700 pt-3 space-y-3">
                      <div>
                        <span className="text-slate-400 text-xs uppercase tracking-wider">Description</span>
                        <p className="text-slate-300 text-sm mt-1">{finding.description}</p>
                      </div>
                      <div>
                        <span className="text-slate-400 text-xs uppercase tracking-wider">Reproduction Steps</span>
                        <ol className="list-decimal list-inside text-slate-300 text-sm mt-1 space-y-1">
                          {finding.reproductionSteps.map((step, i) => (
                            <li key={i}>{step}</li>
                          ))}
                        </ol>
                      </div>
                      <div>
                        <span className="text-slate-400 text-xs uppercase tracking-wider">Impact</span>
                        <p className="text-slate-300 text-sm mt-1">{finding.impact}</p>
                      </div>
                      <div>
                        <span className="text-slate-400 text-xs uppercase tracking-wider">Recommended Mitigation</span>
                        <p className="text-emerald-300 text-sm mt-1">{finding.recommendedMitigation}</p>
                      </div>
                      <div className="flex items-center gap-4 pt-2">
                        <span className={`px-2 py-1 rounded text-xs ${
                          finding.status === 'OPEN' ? 'bg-red-600/20 text-red-400' :
                          finding.status === 'MITIGATED' ? 'bg-emerald-600/20 text-emerald-400' :
                          'bg-slate-600/20 text-slate-400'
                        }`}>
                          {finding.status}
                        </span>
                        {finding.regressionTestAdded && (
                          <span className="text-xs text-cyan-400 flex items-center gap-1">
                            <CheckCircle size={12} /> Regression test added
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* Tests Tab */}
        {activeTab === 'tests' && (
          <div className="space-y-2">
            {testResults.map(test => (
              <div
                key={test.id}
                className={`flex items-center gap-3 px-4 py-2 rounded-lg ${
                  test.status === 'PASSED' ? 'bg-emerald-900/20 border border-emerald-800/30' :
                  test.status === 'FAILED' ? 'bg-red-900/20 border border-red-800/30' :
                  'bg-slate-800 border border-slate-700'
                }`}
              >
                {test.status === 'PASSED' && <CheckCircle size={16} className="text-emerald-400" />}
                {test.status === 'FAILED' && <XCircle size={16} className="text-red-400" />}
                {test.status === 'PENDING' && <Clock size={16} className="text-slate-400" />}
                {test.status === 'BLOCKED' && <AlertOctagon size={16} className="text-yellow-400" />}
                <span className="text-white text-sm flex-1">{test.name}</span>
                <span className="text-slate-500 text-xs">{test.suite.replace(/_/g, ' ')}</span>
                {test.result && (
                  <span className="text-slate-500 text-xs">{test.result.executionTimeMs}ms</span>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Contract Tab */}
        {activeTab === 'contract' && (
          <div className="grid grid-cols-2 gap-6">
            {/* Contract Overview */}
            <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <FileText size={20} className="text-cyan-400" />
                Assurance Contract
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg">
                  <span className="text-slate-400 text-sm">Contract ID</span>
                  <span className="text-white font-mono text-sm">{contract.contractId}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg">
                  <span className="text-slate-400 text-sm">Gating Mode</span>
                  <span className={`px-3 py-1 rounded font-bold text-xs ${
                    contract.gatingMode === 'SOFT' ? 'bg-green-600' :
                    contract.gatingMode === 'HARD' ? 'bg-red-600' : 'bg-amber-600'
                  }`}>
                    {contract.gatingMode}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg">
                  <span className="text-slate-400 text-sm">Trust Status</span>
                  <span className={`px-3 py-1 rounded font-bold text-xs ${
                    contract.trustStatus === 'TRUSTED' ? 'bg-emerald-600' :
                    contract.trustStatus === 'UNTRUSTED' ? 'bg-red-600' : 'bg-yellow-600'
                  }`}>
                    {contract.trustStatus}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg">
                  <span className="text-slate-400 text-sm">Promotion</span>
                  <span className={`px-3 py-1 rounded font-bold text-xs ${
                    contract.promotionAllowed ? 'bg-emerald-600' : 'bg-red-600'
                  }`}>
                    {contract.promotionAllowed ? 'ALLOWED' : 'BLOCKED'}
                  </span>
                </div>
                <div className="p-3 bg-slate-700/50 rounded-lg">
                  <span className="text-slate-400 text-sm block mb-2">Trust Reason</span>
                  <span className="text-white text-sm">{contract.trustReason}</span>
                </div>
              </div>
            </div>

            {/* Reproducibility & Enforcement */}
            <div className="space-y-6">
              {/* Reproducibility */}
              <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <Activity size={20} className="text-purple-400" />
                  Reproducibility Context
                </h3>
                <div className="space-y-2 font-mono text-xs">
                  <div className="flex justify-between p-2 bg-slate-700/30 rounded">
                    <span className="text-slate-400">Seed</span>
                    <span className="text-cyan-400">{reproducibility.seed}</span>
                  </div>
                  <div className="flex justify-between p-2 bg-slate-700/30 rounded">
                    <span className="text-slate-400">Suite Version</span>
                    <span className="text-cyan-400">{reproducibility.suiteVersion}</span>
                  </div>
                  <div className="flex justify-between p-2 bg-slate-700/30 rounded">
                    <span className="text-slate-400">Policy Version</span>
                    <span className="text-cyan-400">{reproducibility.policyVersion}</span>
                  </div>
                  <div className="flex justify-between p-2 bg-slate-700/30 rounded">
                    <span className="text-slate-400">Agent Version</span>
                    <span className="text-cyan-400">{reproducibility.agentVersion}</span>
                  </div>
                  <div className="flex justify-between p-2 bg-slate-700/30 rounded">
                    <span className="text-slate-400">Platform</span>
                    <span className="text-cyan-400">{reproducibility.platformVersion}</span>
                  </div>
                </div>
              </div>

              {/* Enforcement Rules */}
              <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <Lock size={20} className="text-red-400" />
                  Enforcement Rules
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    {contract.blockOnCritical ? (
                      <CheckCircle size={16} className="text-emerald-400" />
                    ) : (
                      <XCircle size={16} className="text-slate-500" />
                    )}
                    <span className="text-sm text-slate-300">Block on CRITICAL findings</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <CheckCircle size={16} className="text-emerald-400" />
                    <span className="text-sm text-slate-300">Block if HIGH &gt; {contract.blockOnHighCount}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    {contract.requireHumanApprovalIfUntrusted ? (
                      <CheckCircle size={16} className="text-emerald-400" />
                    ) : (
                      <XCircle size={16} className="text-slate-500" />
                    )}
                    <span className="text-sm text-slate-300">Require human approval if untrusted</span>
                  </div>
                </div>
                {contract.promotionBlockers.length > 0 && (
                  <div className="mt-4 p-3 bg-red-900/30 border border-red-800/50 rounded-lg">
                    <span className="text-red-400 text-xs font-bold uppercase tracking-wider">Promotion Blockers</span>
                    <div className="mt-2 space-y-1">
                      {contract.promotionBlockers.map((id: string) => (
                        <div key={id} className="text-red-300 text-xs font-mono">{id}</div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Executive Proof Tab */}
        {activeTab === 'proof' && (
          <div className="space-y-6">
            {/* Proof Header */}
            <div className="bg-gradient-to-r from-purple-900/50 to-slate-800 rounded-xl p-6 border border-purple-700">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-purple-600 flex items-center justify-center">
                    <Award size={24} />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">Executive Proof</h2>
                    <p className="text-purple-300 text-sm">One-page enterprise deployment summary</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleCopyProof}
                    className="px-4 py-2 rounded-lg font-bold text-xs bg-slate-700 hover:bg-slate-600 transition-colors flex items-center gap-2"
                  >
                    <ClipboardCopy size={14} />
                    {copied ? 'COPIED!' : 'COPY JSON'}
                  </button>
                  <button
                    onClick={handleDownloadProof}
                    className="px-4 py-2 rounded-lg font-bold text-xs bg-purple-600 hover:bg-purple-500 transition-colors flex items-center gap-2"
                  >
                    <Download size={14} />
                    DOWNLOAD
                  </button>
                </div>
              </div>

              {/* Summary Banner */}
              <div className={`p-4 rounded-lg ${
                executiveProof.trustStatus === 'TRUSTED' ? 'bg-emerald-900/50 border border-emerald-700' :
                executiveProof.trustStatus === 'UNTRUSTED' ? 'bg-red-900/50 border border-red-700' :
                'bg-yellow-900/50 border border-yellow-700'
              }`}>
                <p className="text-lg font-bold text-white">{executiveProof.summary}</p>
              </div>
            </div>

            {/* Proof Content Grid */}
            <div className="grid grid-cols-3 gap-6">
              {/* Status Column */}
              <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
                <h3 className="text-sm font-bold text-white mb-4 uppercase tracking-wider">Current Status</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg">
                    <span className="text-slate-400 text-sm">Trust Status</span>
                    <span className={`px-3 py-1 rounded font-bold text-xs ${
                      executiveProof.trustStatus === 'TRUSTED' ? 'bg-emerald-600' :
                      executiveProof.trustStatus === 'UNTRUSTED' ? 'bg-red-600' : 'bg-yellow-600'
                    }`}>
                      {executiveProof.trustStatus}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg">
                    <span className="text-slate-400 text-sm">Certification</span>
                    <span className={`px-3 py-1 rounded font-bold text-xs ${
                      executiveProof.certificationStatus === 'PASSED' ? 'bg-emerald-600' :
                      executiveProof.certificationStatus === 'FAILED' ? 'bg-red-600' :
                      executiveProof.certificationStatus === 'EXPIRED' ? 'bg-orange-600' : 'bg-yellow-600'
                    }`}>
                      {executiveProof.certificationStatus}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg">
                    <span className="text-slate-400 text-sm">Promotion</span>
                    <span className={`px-3 py-1 rounded font-bold text-xs ${
                      executiveProof.promotionStatus === 'ALLOWED' ? 'bg-emerald-600' : 'bg-red-600'
                    }`}>
                      {executiveProof.promotionStatus}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg">
                    <span className="text-slate-400 text-sm">Security Score</span>
                    <span className={`text-2xl font-black ${
                      executiveProof.currentScore >= 80 ? 'text-emerald-400' :
                      executiveProof.currentScore >= 60 ? 'text-yellow-400' : 'text-red-400'
                    }`}>
                      {executiveProof.currentScore}
                    </span>
                  </div>
                </div>
              </div>

              {/* Findings Column */}
              <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
                <h3 className="text-sm font-bold text-white mb-4 uppercase tracking-wider">Open Findings</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-4 bg-red-900/30 border border-red-800/50 rounded-lg text-center">
                    <div className="text-3xl font-black text-red-400">{executiveProof.openFindings.critical}</div>
                    <div className="text-xs text-red-300 uppercase tracking-wider mt-1">Critical</div>
                  </div>
                  <div className="p-4 bg-orange-900/30 border border-orange-800/50 rounded-lg text-center">
                    <div className="text-3xl font-black text-orange-400">{executiveProof.openFindings.high}</div>
                    <div className="text-xs text-orange-300 uppercase tracking-wider mt-1">High</div>
                  </div>
                  <div className="p-4 bg-yellow-900/30 border border-yellow-800/50 rounded-lg text-center">
                    <div className="text-3xl font-black text-yellow-400">{executiveProof.openFindings.medium}</div>
                    <div className="text-xs text-yellow-300 uppercase tracking-wider mt-1">Medium</div>
                  </div>
                  <div className="p-4 bg-blue-900/30 border border-blue-800/50 rounded-lg text-center">
                    <div className="text-3xl font-black text-blue-400">{executiveProof.openFindings.low}</div>
                    <div className="text-xs text-blue-300 uppercase tracking-wider mt-1">Low</div>
                  </div>
                </div>
                {executiveProof.acceptedRisks > 0 && (
                  <div className="mt-4 p-3 bg-amber-900/30 border border-amber-800/50 rounded-lg">
                    <span className="text-amber-400 text-sm">
                      {executiveProof.acceptedRisks} Known Acceptable Risk(s) in effect
                    </span>
                  </div>
                )}
              </div>

              {/* Trend Column */}
              <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
                <h3 className="text-sm font-bold text-white mb-4 uppercase tracking-wider">Trend (Last 5 Runs)</h3>
                <div className="flex items-center gap-3 mb-4">
                  {executiveProof.trend.direction === 'IMPROVING' ? (
                    <TrendingUp size={32} className="text-emerald-400" />
                  ) : executiveProof.trend.direction === 'DECLINING' ? (
                    <TrendingDown size={32} className="text-red-400" />
                  ) : (
                    <Activity size={32} className="text-slate-400" />
                  )}
                  <div>
                    <div className={`text-lg font-bold ${
                      executiveProof.trend.direction === 'IMPROVING' ? 'text-emerald-400' :
                      executiveProof.trend.direction === 'DECLINING' ? 'text-red-400' : 'text-slate-400'
                    }`}>
                      {executiveProof.trend.direction}
                    </div>
                    <div className="text-sm text-slate-500">
                      {executiveProof.trend.percentage > 0 ? '+' : ''}{executiveProof.trend.percentage}%
                    </div>
                  </div>
                </div>
                {executiveProof.trend.scores.length > 0 && (
                  <div className="flex items-end gap-1 h-16">
                    {executiveProof.trend.scores.map((score, i) => (
                      <div
                        key={i}
                        className={`flex-1 rounded-t ${
                          score >= 80 ? 'bg-emerald-500' : score >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                        }`}
                        style={{ height: `${score}%` }}
                        title={`Score: ${score}`}
                      />
                    ))}
                  </div>
                )}
                <div className="mt-4 p-3 bg-slate-700/50 rounded-lg">
                  <div className="text-xs text-slate-400">Days since certification</div>
                  <div className={`text-xl font-bold ${
                    executiveProof.daysSinceCertification < 0 ? 'text-slate-500' :
                    executiveProof.daysSinceCertification <= 30 ? 'text-emerald-400' :
                    executiveProof.daysSinceCertification <= 60 ? 'text-yellow-400' : 'text-red-400'
                  }`}>
                    {executiveProof.daysSinceCertification < 0 ? 'N/A' : `${executiveProof.daysSinceCertification} days`}
                  </div>
                </div>
              </div>
            </div>

            {/* Blockers Section */}
            {executiveProof.blockers.length > 0 && (
              <div className="bg-red-900/30 rounded-xl p-6 border border-red-700">
                <h3 className="text-sm font-bold text-red-400 mb-4 uppercase tracking-wider flex items-center gap-2">
                  <AlertOctagon size={16} />
                  Deployment Blockers
                </h3>
                <div className="space-y-2">
                  {executiveProof.blockers.map(blocker => (
                    <div key={blocker.id} className="flex items-center gap-3 p-3 bg-red-950/50 rounded-lg">
                      <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                        blocker.severity === 'CRITICAL' ? 'bg-red-600' : 'bg-orange-600'
                      }`}>
                        {blocker.severity}
                      </span>
                      <span className="text-white text-sm">{blocker.title}</span>
                      <span className="text-slate-500 text-xs font-mono ml-auto">{blocker.id}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Promotion Criteria */}
            <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
              <h3 className="text-sm font-bold text-white mb-4 uppercase tracking-wider">Promotion Criteria Applied</h3>
              <div className="flex items-center gap-4">
                <div className={`px-4 py-2 rounded-lg font-bold text-sm ${
                  executiveProof.promotionCriteria.passed ? 'bg-emerald-600' : 'bg-red-600'
                }`}>
                  {executiveProof.promotionCriteria.passed ? '✓ PASSED' : '✗ FAILED'}
                </div>
                <span className="text-white font-medium">{executiveProof.promotionCriteria.name}</span>
              </div>
              {executiveProof.promotionCriteria.failedRules.length > 0 && (
                <div className="mt-4 p-3 bg-red-900/30 border border-red-800/50 rounded-lg">
                  <span className="text-red-400 text-xs font-bold uppercase tracking-wider">Failed Rules</span>
                  <ul className="mt-2 space-y-1">
                    {executiveProof.promotionCriteria.failedRules.map((rule, i) => (
                      <li key={i} className="text-red-300 text-sm flex items-center gap-2">
                        <XCircle size={12} />
                        {rule}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Audit Metadata */}
            <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
              <div className="grid grid-cols-4 gap-4 text-xs font-mono">
                <div>
                  <span className="text-slate-500 block">Generated</span>
                  <span className="text-slate-300">{new Date(executiveProof.generatedAt).toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Run ID</span>
                  <span className="text-cyan-400">{executiveProof.lastRunId}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Seed</span>
                  <span className="text-cyan-400">{executiveProof.lastRunSeed}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Suite Version</span>
                  <span className="text-cyan-400">{executiveProof.suiteVersion}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Recommendations Tab */}
        {activeTab === 'recommendations' && (
          <div className="space-y-4">
            {recommendations.map(rec => (
              <div key={rec.id} className="bg-slate-800 rounded-xl p-4 border border-slate-700">
                <div className="flex items-start gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    rec.priority === 'CRITICAL' ? 'bg-red-600' :
                    rec.priority === 'HIGH' ? 'bg-orange-500' :
                    rec.priority === 'MEDIUM' ? 'bg-yellow-500' :
                    'bg-blue-500'
                  }`}>
                    <FileText size={16} className="text-white" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-white font-medium">{rec.title}</span>
                      <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                        rec.priority === 'CRITICAL' ? 'bg-red-600' :
                        rec.priority === 'HIGH' ? 'bg-orange-500' :
                        rec.priority === 'MEDIUM' ? 'bg-yellow-500' :
                        'bg-blue-500'
                      }`}>
                        {rec.priority}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase bg-slate-600 text-slate-300">
                        {rec.category}
                      </span>
                    </div>
                    <p className="text-slate-400 text-sm">{rec.description}</p>
                    <div className="mt-3 p-3 bg-slate-700/50 rounded-lg">
                      <span className="text-xs text-slate-400 uppercase tracking-wider">Implementation Guidance</span>
                      <p className="text-slate-300 text-sm mt-1">{rec.implementationGuidance}</p>
                    </div>
                    <div className="mt-2 flex items-center gap-4 text-xs text-slate-500">
                      <span>Effort: {rec.estimatedEffort}</span>
                      <span>Related findings: {rec.relatedFindings.length}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Logs Tab */}
        {activeTab === 'logs' && (
          <div className="bg-slate-900 rounded-xl p-4 font-mono text-xs max-h-[600px] overflow-y-auto">
            {logs.map(log => (
              <div key={log.id} className="flex gap-3 py-1 hover:bg-slate-800/50">
                <span className="text-slate-600 w-24 flex-shrink-0">
                  {new Date(log.timestamp).toLocaleTimeString()}
                </span>
                <span className={`w-16 flex-shrink-0 ${getLogTypeColor(log.type)}`}>
                  [{log.type.toUpperCase()}]
                </span>
                <span className="text-slate-500 w-20 flex-shrink-0">
                  {log.phase}
                </span>
                <span className="text-slate-300">{log.message}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-6 py-4 bg-slate-800/50 border-t border-slate-700">
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span>Run ID: {result.runId}</span>
          <span>Config: {result.config.runType} | Target: {result.config.targetWorkforce}</span>
          <span>Completed: {new Date(result.endTime).toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
};

export default RedTeamDashboard;
