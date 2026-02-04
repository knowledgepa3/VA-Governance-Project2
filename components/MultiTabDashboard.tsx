/**
 * Multi-Tab Dashboard - Live Browser Grid View
 *
 * Shows multiple browser tabs being controlled simultaneously:
 * - Grid view of all active tabs with live screenshots
 * - Role indicators (Primary, Reference, Evidence)
 * - Cross-reference highlighting
 * - Parallel evidence capture
 */

import React, { useState, useEffect } from 'react';
import {
  Grid,
  Monitor,
  Camera,
  RefreshCw,
  Maximize2,
  Minimize2,
  Eye,
  Link2,
  CheckCircle2,
  AlertTriangle,
  Globe,
  Layers,
  Layout,
  Play,
  Square,
  Download,
  Zap
} from 'lucide-react';
import {
  ManagedTab,
  TabRole,
  ParallelResearchPlan,
  VA_CLAIMS_RESEARCH_PATTERN,
  BD_CAPTURE_RESEARCH_PATTERN,
  multiTabOrchestrator,
  MultiTabViewState,
  DEFAULT_MULTI_TAB_VIEW
} from '../services/multiTabOrchestrator';
import { createScreenshotUrl } from '../services/mcpBridge';
import { BundlePackExecutor } from './BundlePackExecutor';
import { BundlePack } from '../services/bundlePacks';
import { Package } from 'lucide-react';

interface MultiTabDashboardProps {
  onExecutePlan?: (plan: ParallelResearchPlan) => void;
  onCaptureAll?: () => void;
  onExecuteBundle?: (bundle: BundlePack) => void;
}

interface TabScreenshot {
  tabId: number;
  role: TabRole;
  url: string;
  title: string;
  screenshot: string;
  timestamp: string;
  status: 'idle' | 'loading' | 'ready' | 'error';
}

export function MultiTabDashboard({ onExecutePlan, onCaptureAll, onExecuteBundle }: MultiTabDashboardProps) {
  const [viewState, setViewState] = useState<MultiTabViewState>(DEFAULT_MULTI_TAB_VIEW);
  const [tabs, setTabs] = useState<TabScreenshot[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<ParallelResearchPlan | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [expandedTab, setExpandedTab] = useState<number | null>(null);
  const [activeView, setActiveView] = useState<'patterns' | 'bundles'>('bundles');

  // Available research patterns
  const researchPatterns = [
    VA_CLAIMS_RESEARCH_PATTERN,
    BD_CAPTURE_RESEARCH_PATTERN
  ];

  // Role colors and labels
  const roleConfig: Record<TabRole, { color: string; label: string; icon: React.ReactNode }> = {
    primary: { color: 'cyan', label: 'Primary', icon: <Monitor className="w-3 h-3" /> },
    reference: { color: 'purple', label: 'Reference', icon: <Link2 className="w-3 h-3" /> },
    evidence: { color: 'green', label: 'Evidence', icon: <Camera className="w-3 h-3" /> },
    comparison: { color: 'yellow', label: 'Compare', icon: <Layers className="w-3 h-3" /> },
    monitor: { color: 'blue', label: 'Monitor', icon: <Eye className="w-3 h-3" /> }
  };

  // Render tab card
  const renderTabCard = (tab: TabScreenshot, index: number) => {
    const config = roleConfig[tab.role];
    const isExpanded = expandedTab === tab.tabId;

    return (
      <div
        key={tab.tabId}
        className={`bg-slate-800/50 border rounded-lg overflow-hidden transition-all ${
          isExpanded
            ? 'col-span-2 row-span-2 border-cyan-500'
            : 'border-slate-700 hover:border-slate-600'
        }`}
      >
        {/* Tab Header */}
        <div className={`px-3 py-2 bg-${config.color}-500/10 border-b border-slate-700 flex items-center justify-between`}>
          <div className="flex items-center gap-2">
            <span className={`text-${config.color}-400`}>{config.icon}</span>
            <span className={`text-xs font-medium text-${config.color}-400`}>{config.label}</span>
            <span className="text-xs text-slate-500">Tab {index + 1}</span>
          </div>
          <div className="flex items-center gap-1">
            {tab.status === 'loading' && (
              <RefreshCw className="w-3 h-3 text-cyan-400 animate-spin" />
            )}
            {tab.status === 'ready' && (
              <CheckCircle2 className="w-3 h-3 text-green-400" />
            )}
            {tab.status === 'error' && (
              <AlertTriangle className="w-3 h-3 text-red-400" />
            )}
            <button
              onClick={() => setExpandedTab(isExpanded ? null : tab.tabId)}
              className="p-1 hover:bg-slate-700 rounded"
            >
              {isExpanded ? (
                <Minimize2 className="w-3 h-3 text-slate-400" />
              ) : (
                <Maximize2 className="w-3 h-3 text-slate-400" />
              )}
            </button>
          </div>
        </div>

        {/* Screenshot Area */}
        <div className={`relative ${isExpanded ? 'h-64' : 'h-32'} bg-slate-900`}>
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

          {/* Live indicator */}
          {tab.status === 'ready' && (
            <div className="absolute top-2 right-2 flex items-center gap-1 px-2 py-0.5 bg-green-500/80 rounded text-xs text-white">
              <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></span>
              LIVE
            </div>
          )}
        </div>

        {/* Tab Footer */}
        <div className="px-3 py-2 bg-slate-800/50">
          <div className="text-xs text-white truncate font-medium">{tab.title || 'New Tab'}</div>
          <div className="text-xs text-slate-500 truncate">{tab.url || 'about:blank'}</div>
          <div className="text-xs text-slate-600 mt-1">
            {tab.timestamp && new Date(tab.timestamp).toLocaleTimeString()}
          </div>
        </div>
      </div>
    );
  };

  // Render plan selector
  const renderPlanSelector = () => (
    <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 mb-4">
      <h4 className="font-medium text-white mb-3 flex items-center gap-2">
        <Zap className="w-4 h-4 text-yellow-400" />
        Parallel Research Patterns
      </h4>
      <div className="grid grid-cols-2 gap-3">
        {researchPatterns.map(plan => (
          <button
            key={plan.id}
            onClick={() => setSelectedPlan(plan)}
            className={`p-3 rounded-lg border text-left transition-all ${
              selectedPlan?.id === plan.id
                ? 'border-cyan-500 bg-cyan-500/10'
                : 'border-slate-700 hover:border-slate-600 bg-slate-800/50'
            }`}
          >
            <div className="font-medium text-white text-sm">{plan.name}</div>
            <div className="text-xs text-slate-400 mt-1">{plan.description}</div>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-xs text-slate-500">
                {plan.sources.length} sources
              </span>
              <span className="text-xs text-slate-500">•</span>
              <span className="text-xs text-slate-500">
                {plan.evidenceCapture} capture
              </span>
            </div>
          </button>
        ))}
      </div>

      {selectedPlan && (
        <div className="mt-4 pt-4 border-t border-slate-700">
          <h5 className="text-sm font-medium text-white mb-2">Sources to Open:</h5>
          <div className="space-y-1">
            {selectedPlan.sources.map((source, i) => (
              <div key={i} className="flex items-center gap-2 text-xs">
                <span className={`px-1.5 py-0.5 rounded text-${roleConfig[source.role].color}-400 bg-${roleConfig[source.role].color}-500/10`}>
                  {roleConfig[source.role].label}
                </span>
                <span className="text-slate-400">{source.name}</span>
                <span className="text-slate-600">({source.domain})</span>
              </div>
            ))}
          </div>
          <button
            onClick={() => onExecutePlan?.(selectedPlan)}
            disabled={isExecuting}
            className="mt-3 w-full flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-600 to-purple-600 hover:from-cyan-500 hover:to-purple-500 disabled:from-slate-700 disabled:to-slate-700 text-white rounded-lg font-medium transition-all"
          >
            {isExecuting ? (
              <><RefreshCw className="w-4 h-4 animate-spin" /> Opening tabs...</>
            ) : (
              <><Play className="w-4 h-4" /> Execute Parallel Research</>
            )}
          </button>
        </div>
      )}
    </div>
  );

  // Render layout controls
  const renderLayoutControls = () => (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2">
        <span className="text-sm text-slate-400">Layout:</span>
        <div className="flex bg-slate-800 rounded-lg p-1">
          {(['grid', 'tabs', 'comparison'] as const).map(layout => (
            <button
              key={layout}
              onClick={() => setViewState(v => ({ ...v, layout }))}
              className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                viewState.layout === layout
                  ? 'bg-cyan-600 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {layout.charAt(0).toUpperCase() + layout.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={onCaptureAll}
          className="flex items-center gap-1 px-3 py-1.5 bg-green-600 hover:bg-green-500 text-white rounded-lg text-xs font-medium"
        >
          <Camera className="w-3 h-3" />
          Capture All
        </button>
        <button
          onClick={() => setViewState(v => ({ ...v, autoRefresh: !v.autoRefresh }))}
          className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium ${
            viewState.autoRefresh
              ? 'bg-cyan-600 text-white'
              : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
          }`}
        >
          <RefreshCw className={`w-3 h-3 ${viewState.autoRefresh ? 'animate-spin' : ''}`} />
          Auto-refresh
        </button>
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Header with View Toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-r from-cyan-500/20 to-purple-500/20 rounded-lg">
            {activeView === 'bundles' ? (
              <Package className="w-5 h-5 text-cyan-400" />
            ) : (
              <Grid className="w-5 h-5 text-cyan-400" />
            )}
          </div>
          <div>
            <h3 className="font-medium text-white">
              {activeView === 'bundles' ? 'Bundle Packs' : 'Multi-Tab Dashboard'}
            </h3>
            <p className="text-xs text-slate-400">
              {activeView === 'bundles'
                ? 'Coordinated multi-tab workflows'
                : 'Parallel browser control with live screenshots'}
            </p>
          </div>
        </div>

        {/* View Toggle */}
        <div className="flex items-center gap-2">
          <div className="flex bg-slate-800 rounded-lg p-1">
            <button
              onClick={() => setActiveView('bundles')}
              className={`flex items-center gap-1 px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                activeView === 'bundles'
                  ? 'bg-gradient-to-r from-cyan-600 to-purple-600 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Package className="w-3 h-3" />
              Bundle Packs
            </button>
            <button
              onClick={() => setActiveView('patterns')}
              className={`flex items-center gap-1 px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                activeView === 'patterns'
                  ? 'bg-cyan-600 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Grid className="w-3 h-3" />
              Simple Patterns
            </button>
          </div>
          {tabs.length > 0 && (
            <span className="px-2 py-1 bg-purple-500/20 text-purple-400 rounded text-xs font-medium">
              {tabs.length} Active Tabs
            </span>
          )}
        </div>
      </div>

      {/* Bundle Packs View */}
      {activeView === 'bundles' && (
        <BundlePackExecutor
          onExecuteBundle={(bundle) => {
            console.log('[ACE] Bundle execution requested:', bundle.name);
            console.log('[ACE] Tabs:', bundle.tabs.map(t => `${t.name} (${t.domain})`));
            console.log('[ACE] Workflow steps:', bundle.workflow.steps.length);
            onExecuteBundle?.(bundle);
          }}
        />
      )}

      {/* Simple Patterns View */}
      {activeView === 'patterns' && (
        <>
          {/* Plan Selector */}
          {renderPlanSelector()}

          {/* Layout Controls */}
          {tabs.length > 0 && renderLayoutControls()}

          {/* Tab Grid */}
          {tabs.length > 0 ? (
            <div className={`grid gap-3 ${
              viewState.layout === 'grid' ? 'grid-cols-2 lg:grid-cols-3' :
              viewState.layout === 'comparison' ? 'grid-cols-2' :
              'grid-cols-1'
            }`}>
              {tabs.map((tab, i) => renderTabCard(tab, i))}
            </div>
          ) : (
            <div className="bg-slate-800/30 border border-dashed border-slate-700 rounded-lg p-12 text-center">
              <Grid className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <p className="text-slate-400 mb-2">No tabs active</p>
              <p className="text-sm text-slate-500">
                Select a research pattern above to open multiple tabs
              </p>
            </div>
          )}

          {/* Evidence Summary */}
          {tabs.length > 0 && tabs.some(t => t.screenshot) && (
            <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium text-white flex items-center gap-2">
                  <Camera className="w-4 h-4 text-green-400" />
                  Evidence Summary
                </h4>
                <button className="flex items-center gap-1 px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-medium">
                  <Download className="w-3 h-3" />
                  Export Package
                </button>
              </div>
              <div className="grid grid-cols-4 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-white">{tabs.length}</div>
                  <div className="text-xs text-slate-400">Tabs</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-green-400">
                    {tabs.filter(t => t.screenshot).length}
                  </div>
                  <div className="text-xs text-slate-400">Screenshots</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-cyan-400">
                    {new Set(tabs.map(t => new URL(t.url || 'about:blank').hostname)).size}
                  </div>
                  <div className="text-xs text-slate-400">Domains</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-purple-400">
                    {tabs.filter(t => t.status === 'ready').length}
                  </div>
                  <div className="text-xs text-slate-400">Ready</div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default MultiTabDashboard;
