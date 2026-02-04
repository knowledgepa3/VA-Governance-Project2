/**
 * Bundle Pack Executor - Coordinated Multi-Tab Workflow UI
 *
 * Visualizes and executes Bundle Packs where multiple tabs
 * work together to accomplish complex research tasks.
 */

import React, { useState, useEffect } from 'react';
import {
  Package,
  Play,
  Pause,
  Square,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Globe,
  ArrowRight,
  ArrowDown,
  Camera,
  FileText,
  Link2,
  Layers,
  Zap,
  Clock,
  Shield,
  ChevronRight,
  ExternalLink,
  Download,
  Eye
} from 'lucide-react';
import {
  BundlePack,
  BUNDLE_PACKS,
  TabConfig,
  WorkflowStep,
  BundleExecutionState,
  TabExecutionState,
  getReadySteps,
  getWorkflowVisualization
} from '../services/bundlePacks';
import { createScreenshotUrl } from '../services/mcpBridge';

interface BundlePackExecutorProps {
  onExecuteBundle?: (bundle: BundlePack) => void;
  onStepComplete?: (stepId: string, tabId: string, data: any) => void;
}

interface LiveTabView {
  tabId: string;
  browserTabId: number;
  screenshot: string;
  title: string;
  url: string;
  status: 'idle' | 'active' | 'done' | 'error';
  lastUpdated: string;
}

export function BundlePackExecutor({ onExecuteBundle, onStepComplete }: BundlePackExecutorProps) {
  const [selectedBundle, setSelectedBundle] = useState<BundlePack | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionState, setExecutionState] = useState<BundleExecutionState | null>(null);
  const [liveTabs, setLiveTabs] = useState<LiveTabView[]>([]);
  const [showWorkflow, setShowWorkflow] = useState(true);
  const [collectedResults, setCollectedResults] = useState<Map<string, any>>(new Map());

  // Category colors
  const categoryColors: Record<string, string> = {
    'va-claims': 'cyan',
    'bd-capture': 'purple',
    'compliance': 'green',
    'research': 'blue',
    'custom': 'yellow'
  };

  // Tab role icons
  const roleIcons: Record<string, React.ReactNode> = {
    primary: <Globe className="w-3 h-3" />,
    reference: <Link2 className="w-3 h-3" />,
    verification: <CheckCircle2 className="w-3 h-3" />,
    details: <FileText className="w-3 h-3" />,
    evidence: <Camera className="w-3 h-3" />,
    aggregator: <Layers className="w-3 h-3" />
  };

  // Render bundle card
  const renderBundleCard = (bundle: BundlePack) => {
    const color = categoryColors[bundle.category] || 'slate';
    const isSelected = selectedBundle?.id === bundle.id;

    return (
      <div
        key={bundle.id}
        onClick={() => setSelectedBundle(bundle)}
        className={`p-4 rounded-lg border cursor-pointer transition-all ${
          isSelected
            ? `border-${color}-500 bg-${color}-500/10`
            : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
        }`}
      >
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2">
            <Package className={`w-5 h-5 text-${color}-400`} />
            <span className={`px-2 py-0.5 rounded text-xs font-medium bg-${color}-500/20 text-${color}-400`}>
              {bundle.category.toUpperCase()}
            </span>
          </div>
          <span className={`px-2 py-0.5 rounded text-xs bg-slate-700 text-slate-300`}>
            {bundle.complexity}
          </span>
        </div>

        <h3 className="font-medium text-white mb-1">{bundle.name}</h3>
        <p className="text-sm text-slate-400 mb-3">{bundle.description}</p>

        {/* Tab previews */}
        <div className="flex items-center gap-2 mb-3">
          {bundle.tabs.map((tab, i) => (
            <React.Fragment key={tab.id}>
              <div className={`flex items-center gap-1 px-2 py-1 rounded bg-slate-700/50 text-xs text-slate-300`}>
                {roleIcons[tab.role]}
                <span>{tab.name}</span>
              </div>
              {i < bundle.tabs.length - 1 && (
                <ArrowRight className="w-3 h-3 text-slate-600" />
              )}
            </React.Fragment>
          ))}
        </div>

        <div className="flex items-center justify-between text-xs text-slate-500">
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {bundle.estimatedDuration}
          </span>
          <span className="flex items-center gap-1">
            <Layers className="w-3 h-3" />
            {bundle.workflow.steps.length} steps
          </span>
        </div>
      </div>
    );
  };

  // Render workflow visualization
  const renderWorkflow = (bundle: BundlePack) => {
    const completedSteps = executionState?.completedSteps || [];
    const currentStep = executionState?.currentStep;

    return (
      <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
        <div className="flex items-center justify-between mb-4">
          <h4 className="font-medium text-white flex items-center gap-2">
            <Zap className="w-4 h-4 text-yellow-400" />
            Workflow
          </h4>
          <button
            onClick={() => setShowWorkflow(!showWorkflow)}
            className="text-slate-400 hover:text-white text-sm"
          >
            {showWorkflow ? 'Hide' : 'Show'}
          </button>
        </div>

        {showWorkflow && (
          <div className="space-y-2">
            {bundle.workflow.steps.map((step, i) => {
              const tab = bundle.tabs.find(t => t.id === step.tabId);
              const isCompleted = completedSteps.includes(step.id);
              const isCurrent = currentStep === step.id;
              const isReady = !isCompleted && !isCurrent &&
                (!step.dependsOn || step.dependsOn.every(d => completedSteps.includes(d)));

              return (
                <div
                  key={step.id}
                  className={`flex items-center gap-3 p-2 rounded transition-all ${
                    isCurrent ? 'bg-cyan-500/20 border border-cyan-500/50' :
                    isCompleted ? 'bg-green-500/10 border border-green-500/30' :
                    isReady ? 'bg-yellow-500/10 border border-yellow-500/30' :
                    'bg-slate-900/50 border border-slate-700'
                  }`}
                >
                  {/* Status icon */}
                  <div className="flex-shrink-0">
                    {isCompleted ? (
                      <CheckCircle2 className="w-5 h-5 text-green-400" />
                    ) : isCurrent ? (
                      <RefreshCw className="w-5 h-5 text-cyan-400 animate-spin" />
                    ) : isReady ? (
                      <Clock className="w-5 h-5 text-yellow-400" />
                    ) : (
                      <div className="w-5 h-5 rounded-full border-2 border-slate-600" />
                    )}
                  </div>

                  {/* Step info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`px-1.5 py-0.5 rounded text-xs ${
                        tab?.role === 'primary' ? 'bg-cyan-500/20 text-cyan-400' :
                        tab?.role === 'reference' ? 'bg-purple-500/20 text-purple-400' :
                        'bg-slate-700 text-slate-400'
                      }`}>
                        {tab?.name}
                      </span>
                      <span className="text-xs text-slate-500">{step.action}</span>
                    </div>
                    <p className="text-sm text-slate-300 truncate">{step.description}</p>
                  </div>

                  {/* Dependencies */}
                  {step.dependsOn && step.dependsOn.length > 0 && (
                    <div className="flex-shrink-0 text-xs text-slate-500">
                      ← {step.dependsOn.length} deps
                    </div>
                  )}
                </div>
              );
            })}

            {/* Final step */}
            <div className="flex items-center gap-3 p-2 rounded bg-gradient-to-r from-cyan-500/10 to-purple-500/10 border border-cyan-500/30 mt-4">
              <Package className="w-5 h-5 text-cyan-400" />
              <div className="flex-1">
                <div className="text-xs text-cyan-400 font-medium">FINAL OUTPUT</div>
                <p className="text-sm text-slate-300">{bundle.workflow.finalStep.description}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  // Render live tabs view
  const renderLiveTabs = () => {
    if (liveTabs.length === 0) return null;

    return (
      <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
        <h4 className="font-medium text-white mb-3 flex items-center gap-2">
          <Eye className="w-4 h-4 text-cyan-400" />
          Live Tab View
          <span className="px-2 py-0.5 bg-green-500/20 text-green-400 rounded text-xs">
            {liveTabs.filter(t => t.status === 'active').length} active
          </span>
        </h4>

        <div className="grid grid-cols-3 gap-3">
          {liveTabs.map(tab => (
            <div
              key={tab.tabId}
              className={`rounded-lg border overflow-hidden ${
                tab.status === 'active' ? 'border-cyan-500' :
                tab.status === 'done' ? 'border-green-500' :
                tab.status === 'error' ? 'border-red-500' :
                'border-slate-700'
              }`}
            >
              {/* Screenshot */}
              <div className="relative h-24 bg-slate-900">
                {tab.screenshot ? (
                  <img
                    src={createScreenshotUrl(tab.screenshot)}
                    alt={tab.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-600">
                    <Globe className="w-8 h-8" />
                  </div>
                )}

                {/* Status badge */}
                <div className={`absolute top-1 right-1 px-1.5 py-0.5 rounded text-xs ${
                  tab.status === 'active' ? 'bg-cyan-500 text-white' :
                  tab.status === 'done' ? 'bg-green-500 text-white' :
                  tab.status === 'error' ? 'bg-red-500 text-white' :
                  'bg-slate-700 text-slate-300'
                }`}>
                  {tab.status === 'active' && <RefreshCw className="w-3 h-3 animate-spin inline mr-1" />}
                  {tab.status.toUpperCase()}
                </div>
              </div>

              {/* Info */}
              <div className="p-2 bg-slate-800">
                <div className="text-xs text-white font-medium truncate">{tab.title}</div>
                <div className="text-xs text-slate-500 truncate">{tab.url}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Render selected bundle details
  const renderBundleDetails = () => {
    if (!selectedBundle) return null;

    const color = categoryColors[selectedBundle.category] || 'slate';

    return (
      <div className="space-y-4">
        {/* Header */}
        <div className={`bg-${color}-500/10 border border-${color}-500/50 rounded-lg p-4`}>
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Package className={`w-5 h-5 text-${color}-400`} />
                <h3 className="text-lg font-medium text-white">{selectedBundle.name}</h3>
              </div>
              <p className="text-sm text-slate-400">{selectedBundle.description}</p>
            </div>
            <button
              onClick={() => setSelectedBundle(null)}
              className="text-slate-400 hover:text-white"
            >
              <XCircle className="w-5 h-5" />
            </button>
          </div>

          {/* Tab roles */}
          <div className="flex items-center gap-4 mt-4 pt-4 border-t border-slate-700">
            {selectedBundle.tabs.map(tab => (
              <div key={tab.id} className="flex items-center gap-2">
                <div className={`p-1.5 rounded bg-slate-700`}>
                  {roleIcons[tab.role]}
                </div>
                <div>
                  <div className="text-xs font-medium text-white">{tab.name}</div>
                  <div className="text-xs text-slate-500">{tab.domain}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Governance */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
          <h4 className="font-medium text-white mb-3 flex items-center gap-2">
            <Shield className="w-4 h-4 text-green-400" />
            Governance
          </h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-slate-400 mb-1">Allowed Domains</div>
              <div className="flex flex-wrap gap-1">
                {selectedBundle.governance.allowedDomains.map(d => (
                  <span key={d} className="px-2 py-0.5 bg-green-500/20 text-green-400 rounded text-xs">
                    {d}
                  </span>
                ))}
              </div>
            </div>
            <div>
              <div className="text-slate-400 mb-1">Stop Conditions</div>
              <div className="flex flex-wrap gap-1">
                {selectedBundle.governance.stopConditions.map(s => (
                  <span key={s} className="px-2 py-0.5 bg-yellow-500/20 text-yellow-400 rounded text-xs">
                    {s.replace(/_/g, ' ')}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Workflow */}
        {renderWorkflow(selectedBundle)}

        {/* Live tabs view */}
        {renderLiveTabs()}

        {/* Execute button */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setIsExecuting(true);
              onExecuteBundle?.(selectedBundle);
              // Initialize live tabs
              setLiveTabs(selectedBundle.tabs.map(tab => ({
                tabId: tab.id,
                browserTabId: 0,
                screenshot: '',
                title: tab.name,
                url: tab.startUrl,
                status: 'idle',
                lastUpdated: new Date().toISOString()
              })));
            }}
            disabled={isExecuting}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-cyan-600 to-purple-600 hover:from-cyan-500 hover:to-purple-500 disabled:from-slate-700 disabled:to-slate-700 text-white rounded-lg font-medium transition-all"
          >
            {isExecuting ? (
              <><RefreshCw className="w-4 h-4 animate-spin" /> Executing Bundle...</>
            ) : (
              <><Play className="w-4 h-4" /> Execute Bundle Pack</>
            )}
          </button>
          {isExecuting && (
            <button
              onClick={() => setIsExecuting(false)}
              className="px-4 py-3 bg-red-600 hover:bg-red-500 text-white rounded-lg font-medium transition-colors"
            >
              <Square className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Expected outputs */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
          <h4 className="font-medium text-white mb-3 flex items-center gap-2">
            <Download className="w-4 h-4 text-cyan-400" />
            Expected Outputs
          </h4>
          <div className="space-y-2">
            {selectedBundle.outputs.map(output => (
              <div key={output.name} className="flex items-center justify-between p-2 bg-slate-900/50 rounded">
                <div>
                  <div className="text-sm text-white">{output.name}</div>
                  <div className="text-xs text-slate-500">{output.description}</div>
                </div>
                <span className="px-2 py-0.5 bg-slate-700 text-slate-300 rounded text-xs">
                  {output.type}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-r from-cyan-500/20 to-purple-500/20 rounded-lg">
            <Package className="w-5 h-5 text-cyan-400" />
          </div>
          <div>
            <h3 className="font-medium text-white">Bundle Packs</h3>
            <p className="text-xs text-slate-400">
              Multi-tab coordinated workflows
            </p>
          </div>
        </div>
      </div>

      {/* Bundle selection or details */}
      {selectedBundle ? (
        renderBundleDetails()
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {BUNDLE_PACKS.map(renderBundleCard)}
        </div>
      )}
    </div>
  );
}

export default BundlePackExecutor;
