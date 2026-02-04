/**
 * Capture Pipeline Kanban View
 *
 * Visual board showing opportunities moving through BD lifecycle stages.
 * Provides at-a-glance portfolio view with stage transitions.
 */

import React, { useState, useEffect } from 'react';
import {
  PipelineStage,
  PipelineOpportunity,
  PipelineState,
  STAGE_CONFIG,
  ACTIVE_STAGES,
  TERMINAL_STAGES,
  createPipelineOpportunity,
  moveToStage,
  calculatePipelineMetrics,
  savePipeline,
  loadPipeline
} from '../capturePipeline';
import {
  Search,
  CheckCircle,
  Target,
  FileText,
  Send,
  Trophy,
  XCircle,
  MinusCircle,
  ChevronRight,
  ChevronLeft,
  Clock,
  DollarSign,
  AlertTriangle,
  Calendar,
  TrendingUp,
  Award,
  Plus,
  MoreVertical,
  Trash2,
  Edit3,
  Rocket,
  Building2,
  ArrowRight,
  Flag,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

interface CapturePipelineViewProps {
  onLaunchCapture?: (opportunity: any) => void;
}

// Icon mapping
const StageIcon: Record<string, React.FC<{ size?: number; className?: string }>> = {
  Search,
  CheckCircle,
  Target,
  FileText,
  Send,
  Trophy,
  XCircle,
  MinusCircle
};

export const CapturePipelineView: React.FC<CapturePipelineViewProps> = ({ onLaunchCapture }) => {
  const [pipeline, setPipeline] = useState<PipelineState>(() => loadPipeline());
  const [selectedOpp, setSelectedOpp] = useState<PipelineOpportunity | null>(null);
  const [showTerminal, setShowTerminal] = useState(false);

  // Save to localStorage whenever pipeline changes
  useEffect(() => {
    savePipeline(pipeline);
  }, [pipeline]);

  // Calculate metrics
  const metrics = calculatePipelineMetrics(pipeline.opportunities);

  // Group opportunities by stage
  const oppsByStage = ACTIVE_STAGES.reduce((acc, stage) => {
    acc[stage] = pipeline.opportunities.filter(o => o.stage === stage);
    return acc;
  }, {} as Record<PipelineStage, PipelineOpportunity[]>);

  const terminalOpps = pipeline.opportunities.filter(o => TERMINAL_STAGES.includes(o.stage));

  // Move opportunity to next stage
  const handleMoveStage = (opp: PipelineOpportunity, newStage: PipelineStage) => {
    const updated = moveToStage(opp, newStage);
    setPipeline(prev => ({
      ...prev,
      lastUpdated: new Date(),
      opportunities: prev.opportunities.map(o => o.id === opp.id ? updated : o)
    }));
    setSelectedOpp(null);
  };

  // Remove opportunity from pipeline
  const handleRemove = (oppId: string) => {
    setPipeline(prev => ({
      ...prev,
      lastUpdated: new Date(),
      opportunities: prev.opportunities.filter(o => o.id !== oppId)
    }));
    setSelectedOpp(null);
  };

  // Launch capture workflow
  const handleCapture = (opp: PipelineOpportunity) => {
    if (onLaunchCapture && opp.originalData) {
      // Move to Capture stage
      handleMoveStage(opp, PipelineStage.CAPTURE);
      // Launch the workflow
      onLaunchCapture(opp.originalData);
    }
  };

  // Get days until deadline
  const getDaysUntil = (deadline: Date): number => {
    return Math.ceil((deadline.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  };

  // Get urgency color
  const getUrgencyColor = (days: number): string => {
    if (days <= 3) return 'text-rose-600 bg-rose-50';
    if (days <= 7) return 'text-amber-600 bg-amber-50';
    if (days <= 14) return 'text-blue-600 bg-blue-50';
    return 'text-slate-500 bg-slate-50';
  };

  // Render stage column
  const renderStageColumn = (stage: PipelineStage) => {
    const config = STAGE_CONFIG[stage];
    const opps = oppsByStage[stage] || [];
    const IconComponent = StageIcon[config.icon] || Search;

    return (
      <div key={stage} className={`flex-1 min-w-[220px] max-w-[280px] ${config.bgColor} rounded-2xl border ${config.borderColor} overflow-hidden`}>
        {/* Column Header */}
        <div className={`p-3 border-b ${config.borderColor}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <IconComponent size={16} className={config.color} />
              <span className={`font-black text-sm ${config.color}`}>{config.label}</span>
            </div>
            <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${config.bgColor} ${config.color} border ${config.borderColor}`}>
              {opps.length}
            </span>
          </div>
          <p className="text-[10px] text-slate-500 mt-1">{config.description}</p>
        </div>

        {/* Cards */}
        <div className="p-2 space-y-2 max-h-[500px] overflow-y-auto">
          {opps.length === 0 ? (
            <div className="text-center py-6 text-slate-400">
              <div className="text-xs">No opportunities</div>
            </div>
          ) : (
            opps.map(opp => {
              const daysUntil = getDaysUntil(opp.deadline);
              const urgencyClass = getUrgencyColor(daysUntil);

              return (
                <div
                  key={opp.id}
                  onClick={() => setSelectedOpp(opp)}
                  className="bg-white rounded-xl p-3 shadow-sm border border-slate-200 hover:shadow-md hover:border-slate-300 transition-all cursor-pointer"
                >
                  {/* RFP Number & Urgency */}
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-mono text-slate-400">{opp.rfpNumber}</span>
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${urgencyClass}`}>
                      {daysUntil > 0 ? `${daysUntil}d` : 'Due'}
                    </span>
                  </div>

                  {/* Title */}
                  <h4 className="font-bold text-slate-800 text-xs line-clamp-2 mb-2">{opp.title}</h4>

                  {/* Agency & Value */}
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-slate-500 truncate max-w-[120px]">{opp.agency.split('.')[0]}</span>
                    <span className="font-bold text-slate-700">${(opp.estimatedValue / 1000).toFixed(0)}K</span>
                  </div>

                  {/* Match Score & Tags */}
                  <div className="flex items-center gap-1 mt-2">
                    {opp.matchScore && (
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                        opp.matchScore >= 80 ? 'bg-emerald-100 text-emerald-700' :
                        opp.matchScore >= 60 ? 'bg-blue-100 text-blue-700' :
                        'bg-amber-100 text-amber-700'
                      }`}>
                        {opp.matchScore}%
                      </span>
                    )}
                    {opp.soloSafe && (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700">
                        Solo
                      </span>
                    )}
                    {opp.captureCompleted && (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-purple-100 text-purple-700">
                        Captured
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Metrics Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
        <div className="grid grid-cols-6 gap-4">
          <div className="text-center">
            <div className="text-2xl font-black text-slate-800">{metrics.activeCount}</div>
            <div className="text-[10px] text-slate-500 uppercase font-bold">Active</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-black text-emerald-600">${(metrics.totalValue / 1000).toFixed(0)}K</div>
            <div className="text-[10px] text-slate-500 uppercase font-bold">Pipeline Value</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-black text-amber-600">{metrics.urgentCount}</div>
            <div className="text-[10px] text-slate-500 uppercase font-bold">Due &lt;7 Days</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-black text-emerald-600">{metrics.wonCount}</div>
            <div className="text-[10px] text-slate-500 uppercase font-bold">Won</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-black text-blue-600">{metrics.winRate}%</div>
            <div className="text-[10px] text-slate-500 uppercase font-bold">Win Rate</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-black text-purple-600">${(metrics.wonValue / 1000).toFixed(0)}K</div>
            <div className="text-[10px] text-slate-500 uppercase font-bold">Won Value</div>
          </div>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="flex gap-3 overflow-x-auto pb-4">
        {ACTIVE_STAGES.map(stage => renderStageColumn(stage))}
      </div>

      {/* Terminal States Toggle */}
      <div className="bg-slate-50 rounded-2xl border border-slate-200 p-4">
        <button
          onClick={() => setShowTerminal(!showTerminal)}
          className="flex items-center gap-2 text-sm font-bold text-slate-600 hover:text-slate-800 transition-all"
        >
          {showTerminal ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
          Closed Opportunities ({terminalOpps.length})
        </button>

        {showTerminal && terminalOpps.length > 0 && (
          <div className="mt-4 grid grid-cols-3 gap-3">
            {TERMINAL_STAGES.map(stage => {
              const config = STAGE_CONFIG[stage];
              const stageOpps = terminalOpps.filter(o => o.stage === stage);

              return (
                <div key={stage} className={`${config.bgColor} rounded-xl p-3 border ${config.borderColor}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`font-bold text-sm ${config.color}`}>{config.label}</span>
                    <span className="text-xs text-slate-500">({stageOpps.length})</span>
                  </div>
                  <div className="space-y-2 max-h-[200px] overflow-y-auto">
                    {stageOpps.map(opp => (
                      <div key={opp.id} className="bg-white/80 rounded-lg p-2 text-xs">
                        <div className="font-bold text-slate-700 truncate">{opp.title}</div>
                        <div className="text-slate-500">${(opp.estimatedValue / 1000).toFixed(0)}K</div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Empty State */}
      {pipeline.opportunities.length === 0 && (
        <div className="bg-white rounded-2xl border-2 border-dashed border-slate-200 p-12 text-center">
          <Target size={48} className="mx-auto text-slate-300 mb-4" />
          <h3 className="text-lg font-black text-slate-700 mb-2">Pipeline Empty</h3>
          <p className="text-sm text-slate-500 mb-4">
            Add opportunities from the BD Pipeline search to start tracking them here.
          </p>
          <p className="text-xs text-slate-400">
            Use the "Add to Pipeline" button on any opportunity card.
          </p>
        </div>
      )}

      {/* Opportunity Detail Modal */}
      {selectedOpp && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[85vh] flex flex-col">
            {/* Header */}
            <div className={`p-4 ${STAGE_CONFIG[selectedOpp.stage].bgColor} rounded-t-2xl border-b ${STAGE_CONFIG[selectedOpp.stage].borderColor}`}>
              <div className="flex items-center justify-between">
                <div>
                  <span className={`text-xs font-bold ${STAGE_CONFIG[selectedOpp.stage].color}`}>
                    {STAGE_CONFIG[selectedOpp.stage].label}
                  </span>
                  <h3 className="font-black text-slate-800 mt-1">{selectedOpp.title}</h3>
                  <p className="text-xs text-slate-500">{selectedOpp.rfpNumber}</p>
                </div>
                <button
                  onClick={() => setSelectedOpp(null)}
                  className="p-2 hover:bg-white/50 rounded-lg transition-all"
                >
                  <XCircle size={20} className="text-slate-400" />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="p-4 overflow-y-auto flex-1 space-y-4">
              {/* Quick Stats */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-slate-50 rounded-xl p-3 text-center">
                  <div className="text-lg font-black text-slate-800">${(selectedOpp.estimatedValue / 1000).toFixed(0)}K</div>
                  <div className="text-[10px] text-slate-500 uppercase">Value</div>
                </div>
                <div className="bg-slate-50 rounded-xl p-3 text-center">
                  <div className={`text-lg font-black ${getUrgencyColor(getDaysUntil(selectedOpp.deadline)).split(' ')[0]}`}>
                    {getDaysUntil(selectedOpp.deadline)}d
                  </div>
                  <div className="text-[10px] text-slate-500 uppercase">To Deadline</div>
                </div>
                <div className="bg-slate-50 rounded-xl p-3 text-center">
                  <div className="text-lg font-black text-blue-600">{selectedOpp.matchScore || '-'}%</div>
                  <div className="text-[10px] text-slate-500 uppercase">Match</div>
                </div>
              </div>

              {/* Details */}
              <div className="bg-slate-50 rounded-xl p-3 space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">Agency</span>
                  <span className="font-bold text-slate-700 text-right max-w-[200px] truncate">{selectedOpp.agency}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">Deadline</span>
                  <span className="font-bold text-slate-700">{selectedOpp.deadline.toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">Added</span>
                  <span className="font-bold text-slate-700">{selectedOpp.addedDate.toLocaleDateString()}</span>
                </div>
              </div>

              {/* Milestones */}
              {selectedOpp.milestones && selectedOpp.milestones.length > 0 && (
                <div>
                  <h4 className="text-xs font-black text-slate-500 uppercase mb-2">Milestones</h4>
                  <div className="space-y-1">
                    {selectedOpp.milestones.map((m, idx) => {
                      const daysUntil = getDaysUntil(m.dueDate);
                      const isPast = daysUntil < 0;
                      return (
                        <div key={idx} className={`flex items-center justify-between text-xs p-2 rounded-lg ${
                          m.completed ? 'bg-emerald-50' : isPast ? 'bg-rose-50' : 'bg-slate-50'
                        }`}>
                          <div className="flex items-center gap-2">
                            {m.completed ? (
                              <CheckCircle2 size={14} className="text-emerald-500" />
                            ) : isPast ? (
                              <AlertCircle size={14} className="text-rose-500" />
                            ) : (
                              <Clock size={14} className="text-slate-400" />
                            )}
                            <span className={m.completed ? 'text-emerald-700' : isPast ? 'text-rose-700' : 'text-slate-700'}>
                              {m.name}
                            </span>
                          </div>
                          <span className={`font-bold ${m.completed ? 'text-emerald-600' : isPast ? 'text-rose-600' : 'text-slate-500'}`}>
                            {m.dueDate.toLocaleDateString()}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Stage History */}
              <div>
                <h4 className="text-xs font-black text-slate-500 uppercase mb-2">History</h4>
                <div className="space-y-1">
                  {selectedOpp.stageHistory.slice().reverse().map((h, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-xs text-slate-600">
                      <span className={`font-bold ${STAGE_CONFIG[h.stage].color}`}>
                        {STAGE_CONFIG[h.stage].label}
                      </span>
                      <span className="text-slate-400">-</span>
                      <span>{h.date.toLocaleDateString()}</span>
                      {h.notes && <span className="text-slate-400 italic">({h.notes})</span>}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="p-4 border-t border-slate-200 bg-slate-50 rounded-b-2xl space-y-3">
              {/* Stage Move Buttons */}
              <div className="flex flex-wrap gap-2">
                {ACTIVE_STAGES.filter(s => s !== selectedOpp.stage).map(stage => (
                  <button
                    key={stage}
                    onClick={() => handleMoveStage(selectedOpp, stage)}
                    className={`flex items-center gap-1 px-3 py-1.5 text-xs font-bold rounded-lg border transition-all ${STAGE_CONFIG[stage].bgColor} ${STAGE_CONFIG[stage].color} ${STAGE_CONFIG[stage].borderColor} hover:opacity-80`}
                  >
                    <ArrowRight size={12} />
                    {STAGE_CONFIG[stage].label}
                  </button>
                ))}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between">
                <div className="flex gap-2">
                  <button
                    onClick={() => handleMoveStage(selectedOpp, PipelineStage.WON)}
                    className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 text-white text-xs font-bold rounded-lg hover:bg-emerald-500 transition-all"
                  >
                    <Trophy size={12} /> Won
                  </button>
                  <button
                    onClick={() => handleMoveStage(selectedOpp, PipelineStage.LOST)}
                    className="flex items-center gap-1 px-3 py-1.5 bg-rose-600 text-white text-xs font-bold rounded-lg hover:bg-rose-500 transition-all"
                  >
                    <XCircle size={12} /> Lost
                  </button>
                  <button
                    onClick={() => handleMoveStage(selectedOpp, PipelineStage.NO_BID)}
                    className="flex items-center gap-1 px-3 py-1.5 bg-slate-400 text-white text-xs font-bold rounded-lg hover:bg-slate-500 transition-all"
                  >
                    <MinusCircle size={12} /> No Bid
                  </button>
                </div>

                <div className="flex gap-2">
                  {onLaunchCapture && selectedOpp.stage !== PipelineStage.SUBMITTED && (
                    <button
                      onClick={() => handleCapture(selectedOpp)}
                      className="flex items-center gap-1 px-3 py-1.5 bg-purple-600 text-white text-xs font-bold rounded-lg hover:bg-purple-500 transition-all"
                    >
                      <Rocket size={12} /> Capture
                    </button>
                  )}
                  <button
                    onClick={() => handleRemove(selectedOpp.id)}
                    className="flex items-center gap-1 px-3 py-1.5 text-rose-600 text-xs font-bold rounded-lg hover:bg-rose-50 transition-all"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CapturePipelineView;
