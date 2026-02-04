/**
 * Run Journal Panel
 *
 * The "operator synthesis" layer - where expert judgment meets system output.
 * Displays gate reviews, scope directives, human patches, and operator notes.
 */

import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  CheckCircle2,
  XCircle,
  Zap,
  FileText,
  AlertTriangle,
  Edit3,
  Plus,
  Download,
  ChevronDown,
  ChevronRight,
  Target,
  Shield,
  Clock,
  Hash,
  MessageSquare,
  Layers,
  Flag,
  ArrowRight
} from 'lucide-react';
import {
  runJournal,
  RunJournalEntry,
  GateReview,
  ScopeDirective,
  HumanPatch
} from '../services/runJournal';
import { AgentRole, MAIClassification } from '../types';

interface RunJournalPanelProps {
  isProcessing?: boolean;
  currentUser?: string;
  onAddDirective?: (directive: ScopeDirective) => void;
}

export const RunJournalPanel: React.FC<RunJournalPanelProps> = ({
  isProcessing = false,
  currentUser = 'ISSO',
  onAddDirective
}) => {
  const [journal, setJournal] = useState<RunJournalEntry | null>(null);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    timeline: true,
    gates: true,
    directives: true,
    patches: false,
    notes: true
  });

  // New directive form
  const [showDirectiveForm, setShowDirectiveForm] = useState(false);
  const [newDirective, setNewDirective] = useState({
    type: 'scope_limit' as ScopeDirective['type'],
    directive: '',
    rationale: '',
    priority: 'should' as ScopeDirective['priority']
  });

  // Operator notes
  const [operatorNotes, setOperatorNotes] = useState('');
  const [notesEditing, setNotesEditing] = useState(false);

  // Refresh journal periodically during processing
  useEffect(() => {
    const refresh = () => {
      const current = runJournal.getCurrentJournal();
      setJournal(current ? { ...current } : null);
      if (current?.operatorNotes) {
        setOperatorNotes(current.operatorNotes);
      }
    };

    refresh();
    const interval = setInterval(refresh, 1000);
    return () => clearInterval(interval);
  }, [isProcessing]);

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const handleAddDirective = () => {
    if (!newDirective.directive.trim()) return;

    const directive = runJournal.addDirective({
      createdBy: currentUser,
      type: newDirective.type,
      directive: newDirective.directive,
      rationale: newDirective.rationale || 'Operator directive',
      appliesTo: 'all',
      priority: newDirective.priority,
      active: true
    });

    setNewDirective({ type: 'scope_limit', directive: '', rationale: '', priority: 'should' });
    setShowDirectiveForm(false);
    onAddDirective?.(directive);
  };

  const handleSaveNotes = () => {
    runJournal.setOperatorNotes(operatorNotes);
    setNotesEditing(false);
  };

  const handleExportMarkdown = () => {
    const markdown = runJournal.exportAsMarkdown();
    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `run-journal-${journal?.runId || 'unknown'}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportJSON = () => {
    const json = runJournal.exportAsJSON();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `run-journal-${journal?.runId || 'unknown'}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getStepStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-emerald-500';
      case 'running': return 'text-blue-500 animate-pulse';
      case 'failed': return 'text-red-500';
      case 'skipped': return 'text-slate-400';
      default: return 'text-slate-300';
    }
  };

  const getGateDecisionBadge = (decision: GateReview['decision']) => {
    switch (decision) {
      case 'approved':
        return <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded text-xs font-bold">APPROVED</span>;
      case 'approved_with_notes':
        return <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-bold">APPROVED+</span>;
      case 'rejected':
        return <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded text-xs font-bold">REJECTED</span>;
      default:
        return <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-xs font-bold">{decision}</span>;
    }
  };

  const getScopeImpactIcon = (impact: GateReview['scopeImpact']) => {
    switch (impact) {
      case 'expanded': return <ArrowRight size={12} className="text-amber-500" />;
      case 'narrowed': return <Target size={12} className="text-blue-500" />;
      case 'flagged': return <Flag size={12} className="text-red-500" />;
      default: return <CheckCircle2 size={12} className="text-slate-400" />;
    }
  };

  if (!journal) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-slate-100 rounded-lg">
            <BookOpen size={20} className="text-slate-400" />
          </div>
          <div>
            <h3 className="font-bold text-slate-800">Run Journal</h3>
            <p className="text-xs text-slate-500">No active run</p>
          </div>
        </div>
        <p className="text-sm text-slate-500 text-center py-8">
          Start a workflow to begin capturing your operator synthesis.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="p-4 bg-gradient-to-r from-slate-50 to-blue-50 border-b border-slate-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600 rounded-lg text-white">
              <BookOpen size={20} />
            </div>
            <div>
              <h3 className="font-bold text-slate-800">Run Journal</h3>
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <Hash size={10} />
                <span className="font-mono">{journal.runId}</span>
                <span className="px-1.5 py-0.5 bg-slate-200 rounded text-[10px] font-bold">
                  {journal.status.toUpperCase()}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportMarkdown}
              className="p-2 hover:bg-white rounded-lg transition-colors text-slate-500 hover:text-slate-700"
              title="Export as Markdown"
            >
              <FileText size={16} />
            </button>
            <button
              onClick={handleExportJSON}
              className="p-2 hover:bg-white rounded-lg transition-colors text-slate-500 hover:text-slate-700"
              title="Export as JSON"
            >
              <Download size={16} />
            </button>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="flex gap-4 mt-3 text-xs">
          <div className="flex items-center gap-1 text-slate-600">
            <Layers size={12} />
            <span>{journal.steps.length} steps</span>
          </div>
          <div className="flex items-center gap-1 text-slate-600">
            <Shield size={12} />
            <span>{journal.gateReviews.length} gates</span>
          </div>
          <div className="flex items-center gap-1 text-slate-600">
            <Target size={12} />
            <span>{journal.scopeDirectives.filter(d => d.active).length} directives</span>
          </div>
          <div className="flex items-center gap-1 text-slate-600">
            <Edit3 size={12} />
            <span>{journal.humanPatches.length} patches</span>
          </div>
        </div>
      </div>

      {/* Collapsible Sections */}
      <div className="divide-y divide-slate-100">
        {/* Step Timeline */}
        <div>
          <button
            onClick={() => toggleSection('timeline')}
            className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-50 transition-colors"
          >
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
              {expandedSections.timeline ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              <Clock size={14} />
              Step Timeline
            </div>
            <span className="text-xs text-slate-400">
              {journal.steps.filter(s => s.status === 'completed').length}/{journal.steps.length}
            </span>
          </button>

          {expandedSections.timeline && (
            <div className="px-4 pb-4">
              <div className="space-y-1">
                {journal.steps.map((step, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-3 px-3 py-2 rounded-lg bg-slate-50 text-sm"
                  >
                    <span className="w-6 h-6 flex items-center justify-center bg-white rounded-full text-xs font-bold text-slate-500 border border-slate-200">
                      {step.stepNumber}
                    </span>
                    <span className="font-medium text-slate-700 flex-1">{step.agentRole}</span>
                    <span className={`text-xs font-mono ${getStepStatusColor(step.status)}`}>
                      {step.status}
                    </span>
                    {step.duration && (
                      <span className="text-xs text-slate-400">
                        {(step.duration / 1000).toFixed(1)}s
                      </span>
                    )}
                    {step.gateTriggered && (
                      <Shield size={12} className="text-amber-500" title="Gate triggered" />
                    )}
                    {step.autoApproved && (
                      <Zap size={12} className="text-emerald-500" title="Auto-approved" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Gate Reviews */}
        <div>
          <button
            onClick={() => toggleSection('gates')}
            className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-50 transition-colors"
          >
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
              {expandedSections.gates ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              <Shield size={14} />
              Gate Reviews
            </div>
            <span className="text-xs text-slate-400">{journal.gateReviews.length}</span>
          </button>

          {expandedSections.gates && (
            <div className="px-4 pb-4 space-y-3">
              {journal.gateReviews.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-4">
                  No gates reviewed yet
                </p>
              ) : (
                journal.gateReviews.map((gate, idx) => (
                  <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-slate-500">{gate.gateId}</span>
                        {getGateDecisionBadge(gate.decision)}
                      </div>
                      <div className="flex items-center gap-1 text-xs text-slate-400">
                        {getScopeImpactIcon(gate.scopeImpact)}
                        <span>{gate.scopeImpact}</span>
                      </div>
                    </div>

                    <div className="space-y-1 text-sm">
                      <div className="flex gap-2">
                        <span className="text-slate-500 shrink-0">What:</span>
                        <span className="text-slate-700">{gate.whatHappened}</span>
                      </div>
                      <div className="flex gap-2">
                        <span className="text-slate-500 shrink-0">Approved:</span>
                        <span className="text-slate-700">{gate.whatIApproved}</span>
                      </div>
                      {gate.followUp && (
                        <div className="flex gap-2">
                          <span className="text-amber-600 shrink-0">Follow-up:</span>
                          <span className="text-amber-700">{gate.followUp}</span>
                        </div>
                      )}
                    </div>

                    <div className="mt-2 pt-2 border-t border-slate-200 flex items-center justify-between text-xs text-slate-400">
                      <span>by {gate.approvedBy}</span>
                      <span>{new Date(gate.approvalTime).toLocaleTimeString()}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Scope Directives */}
        <div>
          <button
            onClick={() => toggleSection('directives')}
            className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-50 transition-colors"
          >
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
              {expandedSections.directives ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              <Target size={14} />
              Scope Directives
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">
                {journal.scopeDirectives.filter(d => d.active).length} active
              </span>
              <button
                onClick={(e) => { e.stopPropagation(); setShowDirectiveForm(!showDirectiveForm); }}
                className="p-1 hover:bg-blue-100 rounded text-blue-600"
                title="Add directive"
              >
                <Plus size={14} />
              </button>
            </div>
          </button>

          {expandedSections.directives && (
            <div className="px-4 pb-4 space-y-3">
              {/* Add Directive Form */}
              {showDirectiveForm && (
                <div className="p-3 bg-blue-50 rounded-xl border border-blue-200 space-y-3">
                  <div className="flex gap-2">
                    <select
                      value={newDirective.type}
                      onChange={(e) => setNewDirective(prev => ({ ...prev, type: e.target.value as ScopeDirective['type'] }))}
                      className="px-2 py-1 text-xs border border-blue-200 rounded bg-white"
                    >
                      <option value="source_restriction">Source Restriction</option>
                      <option value="scope_limit">Scope Limit</option>
                      <option value="extraction_focus">Extraction Focus</option>
                      <option value="action_prohibition">Prohibition</option>
                      <option value="custom">Custom</option>
                    </select>
                    <select
                      value={newDirective.priority}
                      onChange={(e) => setNewDirective(prev => ({ ...prev, priority: e.target.value as ScopeDirective['priority'] }))}
                      className="px-2 py-1 text-xs border border-blue-200 rounded bg-white"
                    >
                      <option value="must">MUST</option>
                      <option value="should">SHOULD</option>
                      <option value="may">MAY</option>
                    </select>
                  </div>
                  <input
                    type="text"
                    value={newDirective.directive}
                    onChange={(e) => setNewDirective(prev => ({ ...prev, directive: e.target.value }))}
                    placeholder="e.g., Only use va.gov and ecfr.gov"
                    className="w-full px-3 py-2 text-sm border border-blue-200 rounded-lg"
                  />
                  <input
                    type="text"
                    value={newDirective.rationale}
                    onChange={(e) => setNewDirective(prev => ({ ...prev, rationale: e.target.value }))}
                    placeholder="Rationale (optional)"
                    className="w-full px-3 py-2 text-sm border border-blue-200 rounded-lg"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleAddDirective}
                      className="px-3 py-1.5 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-700"
                    >
                      Add Directive
                    </button>
                    <button
                      onClick={() => setShowDirectiveForm(false)}
                      className="px-3 py-1.5 bg-slate-200 text-slate-600 text-xs font-bold rounded-lg hover:bg-slate-300"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Existing Directives */}
              {journal.scopeDirectives.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-4">
                  No directives set. Add constraints to narrow scope.
                </p>
              ) : (
                journal.scopeDirectives.map((dir, idx) => (
                  <div
                    key={idx}
                    className={`p-3 rounded-xl border ${
                      dir.active
                        ? 'bg-emerald-50 border-emerald-200'
                        : 'bg-slate-50 border-slate-200 opacity-60'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`px-1.5 py-0.5 text-[10px] font-black rounded ${
                          dir.priority === 'must'
                            ? 'bg-red-100 text-red-700'
                            : dir.priority === 'should'
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-slate-100 text-slate-600'
                        }`}>
                          {dir.priority.toUpperCase()}
                        </span>
                        <span className="text-xs text-slate-500">{dir.type.replace(/_/g, ' ')}</span>
                      </div>
                      <button
                        onClick={() => runJournal.deactivateDirective(dir.id)}
                        className="text-slate-400 hover:text-red-500"
                        title="Deactivate"
                      >
                        <XCircle size={14} />
                      </button>
                    </div>
                    <p className="text-sm font-medium text-slate-700 mt-1">{dir.directive}</p>
                    {dir.rationale && (
                      <p className="text-xs text-slate-500 mt-1 italic">{dir.rationale}</p>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Human Patches */}
        <div>
          <button
            onClick={() => toggleSection('patches')}
            className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-50 transition-colors"
          >
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
              {expandedSections.patches ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              <Edit3 size={14} />
              Human Patches
            </div>
            <span className="text-xs text-slate-400">{journal.humanPatches.length}</span>
          </button>

          {expandedSections.patches && (
            <div className="px-4 pb-4 space-y-2">
              {journal.humanPatches.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-4">
                  No patches applied. Corrections preserve original evidence.
                </p>
              ) : (
                journal.humanPatches.map((patch, idx) => (
                  <div key={idx} className="p-3 bg-amber-50 rounded-xl border border-amber-200">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-mono text-amber-700">{patch.id}</span>
                      <span className="px-1.5 py-0.5 bg-amber-200 text-amber-800 rounded text-[10px] font-bold">
                        {patch.patchType.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-sm text-slate-700">
                      <span className="font-medium">{patch.targetField}</span>: {patch.patchReason}
                    </p>
                    <div className="mt-2 text-xs text-slate-500 flex items-center gap-2">
                      <Hash size={10} />
                      <span className="font-mono">{patch.patchHash.slice(0, 12)}...</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Operator Notes */}
        <div>
          <button
            onClick={() => toggleSection('notes')}
            className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-50 transition-colors"
          >
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
              {expandedSections.notes ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              <MessageSquare size={14} />
              Operator Notes
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); setNotesEditing(!notesEditing); }}
              className="p-1 hover:bg-blue-100 rounded text-blue-600"
              title="Edit notes"
            >
              <Edit3 size={14} />
            </button>
          </button>

          {expandedSections.notes && (
            <div className="px-4 pb-4">
              {notesEditing ? (
                <div className="space-y-2">
                  <textarea
                    value={operatorNotes}
                    onChange={(e) => setOperatorNotes(e.target.value)}
                    placeholder="Add your synthesis, observations, and notes here..."
                    className="w-full h-32 px-3 py-2 text-sm border border-slate-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleSaveNotes}
                      className="px-3 py-1.5 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-700"
                    >
                      Save Notes
                    </button>
                    <button
                      onClick={() => { setOperatorNotes(journal.operatorNotes); setNotesEditing(false); }}
                      className="px-3 py-1.5 bg-slate-200 text-slate-600 text-xs font-bold rounded-lg hover:bg-slate-300"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-slate-50 rounded-xl min-h-[80px]">
                  {operatorNotes.trim() ? (
                    <pre className="text-sm text-slate-700 whitespace-pre-wrap font-sans">
                      {operatorNotes}
                    </pre>
                  ) : (
                    <p className="text-sm text-slate-400 italic">
                      No notes yet. Click edit to add your synthesis.
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RunJournalPanel;
