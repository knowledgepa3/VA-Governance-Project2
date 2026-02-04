/**
 * Cases Dashboard - View and manage all client cases
 *
 * Features:
 * - Case list with status indicators
 * - Quick filters by status
 * - Case details panel
 * - Run bundle packs directly
 * - View evidence packages
 */

import React, { useState, useEffect } from 'react';
import {
  Briefcase,
  Plus,
  Search,
  Filter,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  RefreshCw,
  Play,
  FileText,
  Mail,
  User,
  Calendar,
  ChevronRight,
  Package,
  Download,
  Eye,
  MoreHorizontal,
  Pause,
  Flag,
  Hash,
  ExternalLink,
  BarChart3,
  TrendingUp
} from 'lucide-react';
import {
  caseManager,
  Case,
  CaseStatus,
  CasePriority,
  ClaimType,
  CLAIM_TYPE_LABELS,
  BundleRun
} from '../services/caseManager';
import { BUNDLE_PACKS } from '../services/bundlePacks';
import { NewCaseForm } from './NewCaseForm';
import { AlertTriangle, ShieldAlert, Lock, Link2, Copy } from 'lucide-react';
import { intakeTokenService, IntakeToken } from '../services/intakeTokenService';

// ============================================================================
// COMPONENT
// ============================================================================

interface CasesDashboardProps {
  // Props removed - ACE Agent chat removed for zero cost operation
}

export function CasesDashboard({}: CasesDashboardProps) {
  const [cases, setCases] = useState<Case[]>([]);
  const [selectedCase, setSelectedCase] = useState<Case | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<CaseStatus | 'all'>('all');
  const [showNewCaseForm, setShowNewCaseForm] = useState(false);
  const [stats, setStats] = useState(caseManager.getCaseStats());

  // Intake link state
  const [showIntakeLinkModal, setShowIntakeLinkModal] = useState(false);
  const [generatedToken, setGeneratedToken] = useState<IntakeToken | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);

  // Subscribe to case changes
  useEffect(() => {
    const unsubscribe = caseManager.subscribe((updatedCases) => {
      setCases(updatedCases);
      setStats(caseManager.getCaseStats());
    });
    return unsubscribe;
  }, []);

  // Filter cases
  const filteredCases = cases.filter(c => {
    if (statusFilter !== 'all' && c.status !== statusFilter) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        c.clientName.toLowerCase().includes(query) ||
        c.clientEmail.toLowerCase().includes(query) ||
        c.id.includes(query) ||
        c.conditions.some(cond => cond.toLowerCase().includes(query))
      );
    }
    return true;
  });

  // Status colors and icons
  const statusConfig: Record<CaseStatus, { color: string; bg: string; icon: React.ReactNode }> = {
    'new': { color: 'text-blue-400', bg: 'bg-blue-500/20', icon: <Plus className="w-3 h-3" /> },
    'researching': { color: 'text-cyan-400', bg: 'bg-cyan-500/20', icon: <RefreshCw className="w-3 h-3 animate-spin" /> },
    'evidence-ready': { color: 'text-yellow-400', bg: 'bg-yellow-500/20', icon: <Package className="w-3 h-3" /> },
    'review': { color: 'text-purple-400', bg: 'bg-purple-500/20', icon: <Eye className="w-3 h-3" /> },
    'complete': { color: 'text-green-400', bg: 'bg-green-500/20', icon: <CheckCircle2 className="w-3 h-3" /> },
    'on-hold': { color: 'text-slate-400', bg: 'bg-slate-500/20', icon: <Pause className="w-3 h-3" /> }
  };

  const priorityConfig: Record<CasePriority, { color: string; label: string }> = {
    'low': { color: 'text-slate-400', label: 'Low' },
    'normal': { color: 'text-blue-400', label: 'Normal' },
    'high': { color: 'text-orange-400', label: 'High' },
    'urgent': { color: 'text-red-400', label: 'Urgent' }
  };

  // Render stats cards
  const renderStats = () => (
    <>
    <div className="grid grid-cols-4 gap-4 mb-6">
      <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <span className="text-slate-500 text-sm">Total Cases</span>
          <Briefcase className="w-4 h-4 text-slate-400" />
        </div>
        <div className="text-2xl font-bold text-slate-900">{stats.total}</div>
      </div>

      <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <span className="text-slate-500 text-sm">In Progress</span>
          <RefreshCw className="w-4 h-4 text-blue-500" />
        </div>
        <div className="text-2xl font-bold text-blue-600">
          {stats.byStatus.new + stats.byStatus.researching + stats.byStatus['evidence-ready']}
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <span className="text-slate-500 text-sm">Completed This Week</span>
          <TrendingUp className="w-4 h-4 text-green-500" />
        </div>
        <div className="text-2xl font-bold text-green-600">{stats.completedThisWeek}</div>
      </div>

      <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <span className="text-slate-500 text-sm">Avg Resolution</span>
          <Clock className="w-4 h-4 text-blue-500" />
        </div>
        <div className="text-2xl font-bold text-blue-600">
          {stats.averageResolutionDays.toFixed(1)}d
        </div>
      </div>
    </div>

    {/* Session-only data warning */}
    <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-3">
      <ShieldAlert className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
      <div className="flex-1">
        <p className="text-sm font-medium text-amber-800">Prototype Mode - Session-Only Data</p>
        <p className="text-xs text-amber-700 mt-1">
          Client names, emails, conditions, and notes are stored in memory only and will be cleared on page refresh.
          Case shells (ID, status, timestamps) persist.
          {stats.activeProfiles > 0 && (
            <span className="font-medium"> {stats.activeProfiles} profile(s) currently loaded.</span>
          )}
        </p>
      </div>
    </div>
    </>
  );

  // Render case card
  const renderCaseCard = (caseData: Case) => {
    const status = statusConfig[caseData.status];
    const priority = priorityConfig[caseData.priority];
    const isSelected = selectedCase?.id === caseData.id;

    return (
      <div
        key={caseData.id}
        onClick={() => setSelectedCase(caseData)}
        className={`p-4 border rounded-lg cursor-pointer transition-all bg-white shadow-sm ${
          isSelected
            ? 'border-blue-500 ring-2 ring-blue-100'
            : 'border-slate-200 hover:border-blue-300 hover:shadow-md'
        }`}
      >
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className={`px-2 py-0.5 rounded text-xs font-medium ${status.bg} ${status.color}`}>
              {status.icon}
              <span className="ml-1">{caseData.status.replace('-', ' ')}</span>
            </span>
            {caseData.priority !== 'normal' && (
              <span className={`px-1.5 py-0.5 rounded text-xs ${priority.color}`}>
                <Flag className="w-3 h-3 inline mr-0.5" />
                {priority.label}
              </span>
            )}
            {/* Session indicator */}
            {!caseData.hasSessionProfile && (
              <span className="px-1.5 py-0.5 rounded text-xs bg-amber-100 text-amber-700" title="Profile data cleared - session only">
                <Lock className="w-3 h-3 inline" />
              </span>
            )}
          </div>
          <span className="text-xs text-slate-400 font-mono">
            {caseData.caseAlias}
          </span>
        </div>

        <h4 className="font-medium text-slate-900 mb-1">
          {caseData.hasSessionProfile ? caseData.clientName : caseData.caseAlias}
        </h4>
        <p className="text-sm text-slate-600 mb-2">
          {CLAIM_TYPE_LABELS[caseData.claimType]}
        </p>

        {caseData.conditions.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {caseData.conditions.slice(0, 3).map((cond, i) => (
              <span key={i} className="px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded text-xs">
                {cond}
              </span>
            ))}
            {caseData.conditions.length > 3 && (
              <span className="text-xs text-slate-400">+{caseData.conditions.length - 3}</span>
            )}
          </div>
        )}

        <div className="flex items-center justify-between text-xs text-slate-400">
          <span className="flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            {new Date(caseData.createdAt).toLocaleDateString()}
          </span>
          <span className="flex items-center gap-1">
            <Package className="w-3 h-3" />
            {caseData.bundleRuns.length} runs
          </span>
        </div>
      </div>
    );
  };

  // Render case details panel
  const renderCaseDetails = () => {
    if (!selectedCase) {
      return (
        <div className="flex-1 flex items-center justify-center text-slate-500">
          <div className="text-center">
            <Briefcase className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>Select a case to view details</p>
          </div>
        </div>
      );
    }

    const status = statusConfig[selectedCase.status];

    return (
      <div className="flex-1 overflow-y-auto bg-white">
        {/* Header */}
        <div className="p-4 border-b border-slate-200">
          <div className="flex items-start justify-between mb-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-lg font-medium text-slate-900">{selectedCase.clientName}</h3>
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${status.bg} ${status.color}`}>
                  {selectedCase.status.replace('-', ' ')}
                </span>
              </div>
              <p className="text-sm text-slate-500">{selectedCase.clientEmail}</p>
            </div>
            <button className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded">
              <MoreHorizontal className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-slate-500">Claim Type</span>
              <p className="text-slate-900">{CLAIM_TYPE_LABELS[selectedCase.claimType]}</p>
            </div>
            <div>
              <span className="text-slate-500">Case ID</span>
              <p className="text-slate-900 font-mono text-xs">{selectedCase.id}</p>
            </div>
            {selectedCase.servicePeriod && (
              <div>
                <span className="text-slate-500">Service Period</span>
                <p className="text-slate-900">{selectedCase.servicePeriod.start} - {selectedCase.servicePeriod.end}</p>
              </div>
            )}
            {selectedCase.deployments && selectedCase.deployments.length > 0 && (
              <div>
                <span className="text-slate-500">Deployments</span>
                <p className="text-slate-900">{selectedCase.deployments.join(', ')}</p>
              </div>
            )}
          </div>
        </div>

        {/* Conditions */}
        {selectedCase.conditions.length > 0 && (
          <div className="p-4 border-b border-slate-200">
            <h4 className="text-sm font-medium text-slate-500 mb-2">Conditions</h4>
            <div className="flex flex-wrap gap-2">
              {selectedCase.conditions.map((cond, i) => (
                <span key={i} className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-sm">
                  {cond}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Notes */}
        {selectedCase.notes && (
          <div className="p-4 border-b border-slate-200">
            <h4 className="text-sm font-medium text-slate-500 mb-2">Notes</h4>
            <p className="text-sm text-slate-700">{selectedCase.notes}</p>
          </div>
        )}

        {/* Bundle Runs */}
        <div className="p-4 border-b border-slate-200">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-medium text-slate-500">Research Runs</h4>
            <button
              onClick={() => {
                const bundle = BUNDLE_PACKS[0];
                if (bundle) {
                  caseManager.startBundleRun(selectedCase.id, bundle.id);
                }
              }}
              className="flex items-center gap-1 px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs"
            >
              <Play className="w-3 h-3" />
              Run Bundle
            </button>
          </div>

          {selectedCase.bundleRuns.length === 0 ? (
            <p className="text-sm text-slate-400">No research runs yet</p>
          ) : (
            <div className="space-y-2">
              {selectedCase.bundleRuns.map(run => (
                <div key={run.id} className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-slate-900 text-sm">{run.bundleName}</span>
                    <span className={`px-1.5 py-0.5 rounded text-xs ${
                      run.status === 'completed' ? 'bg-green-100 text-green-700' :
                      run.status === 'running' ? 'bg-blue-100 text-blue-700' :
                      run.status === 'failed' ? 'bg-red-100 text-red-700' :
                      'bg-slate-100 text-slate-600'
                    }`}>
                      {run.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-500">
                    <span>{new Date(run.startedAt).toLocaleString()}</span>
                    <span>{run.evidenceCount} evidence items</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Evidence Packages */}
        <div className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-medium text-slate-500">Evidence Packages</h4>
          </div>

          {selectedCase.evidencePackages.length === 0 ? (
            <p className="text-sm text-slate-400">No evidence packages yet</p>
          ) : (
            <div className="space-y-2">
              {selectedCase.evidencePackages.map(pkg => (
                <div key={pkg.id} className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-slate-900 text-sm">{pkg.name}</span>
                    <button className="p-1 text-blue-600 hover:text-blue-700">
                      <Download className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-500">
                    <span>{pkg.evidenceItems.length} items</span>
                    <span className="font-mono">{pkg.packageHash.substring(0, 16)}...</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="p-4 border-t border-slate-200">
          <div className="flex items-center gap-2">
            <button className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm border border-slate-300">
              <Mail className="w-4 h-4" />
              Draft Email
            </button>
            <button className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm">
              <Download className="w-4 h-4" />
              Export Package
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col bg-slate-50">
      {/* Header */}
      <div className="p-4 border-b border-slate-200 bg-white">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Briefcase className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Cases</h2>
              <p className="text-xs text-slate-500">Manage client cases and evidence</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Generate Intake Link - replaces SuiteDash */}
            <button
              onClick={() => {
                const token = intakeTokenService.createToken({
                  createdBy: 'Admin'
                });
                setGeneratedToken(token);
                setShowIntakeLinkModal(true);
                setLinkCopied(false);
              }}
              className="flex items-center gap-2 px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium"
            >
              <Link2 className="w-4 h-4" />
              Generate Intake Link
            </button>
            <button
              onClick={() => setShowNewCaseForm(true)}
              className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium"
            >
              <Plus className="w-4 h-4" />
              New Case
            </button>
          </div>
        </div>

        {/* Stats */}
        {renderStats()}

        {/* Search and filters */}
        <div className="flex items-center gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search cases..."
              className="w-full bg-white border border-slate-300 rounded-lg pl-10 pr-4 py-2 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as CaseStatus | 'all')}
            className="bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:border-blue-500 text-sm"
          >
            <option value="all">All Status</option>
            <option value="new">New</option>
            <option value="researching">Researching</option>
            <option value="evidence-ready">Evidence Ready</option>
            <option value="review">Review</option>
            <option value="complete">Complete</option>
            <option value="on-hold">On Hold</option>
          </select>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Case list */}
        <div className="w-[360px] border-r border-slate-200 overflow-y-auto p-4 space-y-3 bg-slate-50">
          {filteredCases.length === 0 ? (
            <div className="text-center py-8">
              <Briefcase className="w-12 h-12 mx-auto mb-3 text-slate-300" />
              <p className="text-slate-500">No cases found</p>
              <button
                onClick={() => setShowNewCaseForm(true)}
                className="mt-3 text-blue-600 hover:text-blue-700 text-sm"
              >
                Create your first case
              </button>
            </div>
          ) : (
            filteredCases.map(renderCaseCard)
          )}
        </div>

        {/* Case details */}
        {renderCaseDetails()}
      </div>

      {/* New Case Form Modal */}
      {showNewCaseForm && (
        <NewCaseForm
          onClose={() => setShowNewCaseForm(false)}
          onCreated={(caseId) => {
            // Select the newly created case
            const newCase = caseManager.getCase(caseId);
            if (newCase) {
              setSelectedCase(newCase);
            }
          }}
        />
      )}

      {/* Intake Link Modal */}
      {showIntakeLinkModal && generatedToken && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-green-50 to-emerald-50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Link2 className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">Client Intake Link</h2>
                  <p className="text-xs text-slate-500">Send this link to your client to collect their information</p>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4">
              {/* Link display */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Intake Link
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    readOnly
                    value={intakeTokenService.getIntakeUrl(generatedToken.token)}
                    className="flex-1 px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm font-mono text-slate-700"
                  />
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(intakeTokenService.getIntakeUrl(generatedToken.token));
                      setLinkCopied(true);
                      setTimeout(() => setLinkCopied(false), 2000);
                    }}
                    className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors ${
                      linkCopied
                        ? 'bg-green-100 text-green-700'
                        : 'bg-blue-600 hover:bg-blue-700 text-white'
                    }`}
                  >
                    {linkCopied ? (
                      <>
                        <CheckCircle className="w-4 h-4" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        Copy
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Token details */}
              <div className="p-4 bg-slate-50 rounded-lg space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">Token ID</span>
                  <span className="font-mono text-slate-700">
                    {generatedToken.token.replace(/-/g, '').slice(0, 4)}...{generatedToken.token.replace(/-/g, '').slice(-4)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Expires</span>
                  <span className="text-slate-700">
                    {new Date(generatedToken.expiresAt).toLocaleString()} ({(() => {
                      const hours = Math.ceil((new Date(generatedToken.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60));
                      return hours >= 24 ? `${Math.round(hours / 24)} days` : `${hours} hours`;
                    })()})
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Max Uses</span>
                  <span className="text-slate-700">{generatedToken.maxUses === 0 ? 'Unlimited' : generatedToken.maxUses}</span>
                </div>
              </div>

              {/* Instructions */}
              <div className="p-4 bg-blue-50 border border-blue-100 rounded-lg">
                <p className="text-sm font-medium text-blue-800 mb-2">How to use:</p>
                <ol className="text-sm text-blue-700 space-y-1 list-decimal list-inside">
                  <li>Copy the link above</li>
                  <li>Send it to your client via email or text</li>
                  <li>Client fills out the intake form</li>
                  <li>Submission appears in your Cases dashboard</li>
                </ol>
              </div>

              {/* Test link button */}
              <button
                onClick={() => window.open(intakeTokenService.getIntakeUrl(generatedToken.token), '_blank')}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-sm hover:bg-slate-50"
              >
                <ExternalLink className="w-4 h-4" />
                Preview Intake Form
              </button>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200">
              <button
                onClick={() => {
                  setShowIntakeLinkModal(false);
                  setGeneratedToken(null);
                }}
                className="w-full px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-sm font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default CasesDashboard;
