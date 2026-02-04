/**
 * Cost Governor Panel
 *
 * Real-time cost tracking and governance for AI agent operations.
 * Tracks token usage, sets limits, alerts on thresholds, and
 * provides optimization recommendations.
 *
 * COST GOVERNANCE PRINCIPLES:
 * 1. Visibility - See costs in real-time
 * 2. Limits - Set hard and soft caps
 * 3. Alerts - Know before you overspend
 * 4. Optimization - Learn from usage patterns
 * 5. Accountability - Track by agent, case, user
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Settings,
  BarChart3,
  Zap,
  Clock,
  Target,
  Shield,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Bell,
  Pause,
  Play,
  Info
} from 'lucide-react';

// ============================================================================
// COST TRACKING TYPES
// ============================================================================

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  estimatedCost: number;
}

export interface AgentCostRecord {
  agentId: string;
  agentName: string;
  totalCalls: number;
  totalTokens: number;
  totalCost: number;
  avgTokensPerCall: number;
  avgCostPerCall: number;
  lastUsed: string;
}

export interface CostAlert {
  id: string;
  type: 'WARNING' | 'CRITICAL' | 'INFO';
  message: string;
  timestamp: string;
  threshold: number;
  currentValue: number;
  acknowledged: boolean;
}

export interface CostLimits {
  dailyLimit: number;
  monthlyLimit: number;
  perCaseLimit: number;
  perAgentCallLimit: number;
  warningThreshold: number; // Percentage (0.8 = 80%)
  criticalThreshold: number; // Percentage (0.95 = 95%)
  hardStop: boolean; // Stop all operations when limit hit
}

export interface CostSummary {
  today: number;
  thisWeek: number;
  thisMonth: number;
  allTime: number;
  todayTokens: number;
  thisMonthTokens: number;
  casesProcessed: number;
  avgCostPerCase: number;
}

export interface OptimizationRecommendation {
  id: string;
  category: 'MODEL_SELECTION' | 'PROMPT_OPTIMIZATION' | 'CACHING' | 'BATCHING' | 'WORKFLOW';
  title: string;
  description: string;
  estimatedSavings: number; // Percentage
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  implemented: boolean;
}

// ============================================================================
// PRICING CONSTANTS (Claude API - as of 2024)
// ============================================================================

const PRICING = {
  'claude-sonnet-4-20250514': {
    inputPer1M: 3.00,
    outputPer1M: 15.00,
    name: 'Claude Sonnet 4'
  },
  'claude-haiku-3-5-20241022': {
    inputPer1M: 0.25,
    outputPer1M: 1.25,
    name: 'Claude Haiku 3.5'
  },
  'claude-opus-4-20250514': {
    inputPer1M: 15.00,
    outputPer1M: 75.00,
    name: 'Claude Opus 4'
  }
};

// ============================================================================
// COST TRACKING SERVICE (Singleton)
// ============================================================================

class CostTrackingService {
  private static instance: CostTrackingService;
  private usageHistory: Array<{
    timestamp: string;
    agentId: string;
    model: string;
    inputTokens: number;
    outputTokens: number;
    cost: number;
    caseId?: string;
  }> = [];
  private listeners: Array<() => void> = [];
  private limits: CostLimits = {
    dailyLimit: 50.00,
    monthlyLimit: 500.00,
    perCaseLimit: 5.00,
    perAgentCallLimit: 1.00,
    warningThreshold: 0.8,
    criticalThreshold: 0.95,
    hardStop: false
  };
  private alerts: CostAlert[] = [];
  private isPaused: boolean = false;

  static getInstance(): CostTrackingService {
    if (!CostTrackingService.instance) {
      CostTrackingService.instance = new CostTrackingService();
    }
    return CostTrackingService.instance;
  }

  // Calculate cost from tokens
  calculateCost(model: string, inputTokens: number, outputTokens: number): number {
    const pricing = PRICING[model as keyof typeof PRICING] || PRICING['claude-sonnet-4-20250514'];
    const inputCost = (inputTokens / 1_000_000) * pricing.inputPer1M;
    const outputCost = (outputTokens / 1_000_000) * pricing.outputPer1M;
    return inputCost + outputCost;
  }

  // Record usage (or dry-run check)
  recordUsage(
    agentId: string,
    model: string,
    inputTokens: number,
    outputTokens: number,
    caseId?: string,
    dryRun: boolean = false // If true, check only - don't record
  ): {
    allowed: boolean;
    reason?: string;
    estimatedCost?: number;
    budgetRemaining?: number;
  } {
    const cost = this.calculateCost(model, inputTokens, outputTokens);
    const todaySpend = this.getTodaySpend();
    const projectedSpend = todaySpend + cost;
    const budgetRemaining = this.limits.dailyLimit - todaySpend;

    // Check if paused
    if (this.isPaused) {
      return {
        allowed: false,
        reason: 'Cost governor is paused - operations halted',
        estimatedCost: cost,
        budgetRemaining
      };
    }

    // Check per-call limit
    if (cost > this.limits.perAgentCallLimit) {
      if (!dryRun) {
        this.addAlert('WARNING', `Single call exceeded limit: $${cost.toFixed(4)} > $${this.limits.perAgentCallLimit}`, this.limits.perAgentCallLimit, cost);
      }
      // For dry run, still allow but warn
    }

    // Check daily limit
    if (projectedSpend > this.limits.dailyLimit) {
      if (this.limits.hardStop) {
        return {
          allowed: false,
          reason: `Daily limit would be exceeded: $${projectedSpend.toFixed(2)} > $${this.limits.dailyLimit} (current: $${todaySpend.toFixed(2)}, this call: $${cost.toFixed(4)})`,
          estimatedCost: cost,
          budgetRemaining
        };
      }
      if (!dryRun) {
        this.addAlert('CRITICAL', `Daily limit exceeded: $${projectedSpend.toFixed(2)}`, this.limits.dailyLimit, projectedSpend);
      }
    } else if (projectedSpend > this.limits.dailyLimit * this.limits.criticalThreshold) {
      if (!dryRun) {
        this.addAlert('CRITICAL', `Approaching daily limit: $${projectedSpend.toFixed(2)} (${((projectedSpend / this.limits.dailyLimit) * 100).toFixed(0)}%)`, this.limits.dailyLimit, projectedSpend);
      }
    } else if (projectedSpend > this.limits.dailyLimit * this.limits.warningThreshold) {
      if (!dryRun) {
        this.addAlert('WARNING', `80% of daily limit used: $${projectedSpend.toFixed(2)}`, this.limits.dailyLimit, projectedSpend);
      }
    }

    // If dry run, don't actually record - just return the check result
    if (dryRun) {
      return {
        allowed: true,
        estimatedCost: cost,
        budgetRemaining
      };
    }

    // Record the usage
    this.usageHistory.push({
      timestamp: new Date().toISOString(),
      agentId,
      model,
      inputTokens,
      outputTokens,
      cost,
      caseId
    });

    // Persist to localStorage
    this.persist();

    // Notify listeners
    this.notifyListeners();

    return {
      allowed: true,
      estimatedCost: cost,
      budgetRemaining: budgetRemaining - cost
    };
  }

  private addAlert(type: CostAlert['type'], message: string, threshold: number, currentValue: number) {
    // Don't duplicate recent alerts
    const recentAlert = this.alerts.find(
      a => a.message === message &&
      new Date().getTime() - new Date(a.timestamp).getTime() < 60000
    );
    if (recentAlert) return;

    this.alerts.unshift({
      id: `alert-${Date.now()}`,
      type,
      message,
      timestamp: new Date().toISOString(),
      threshold,
      currentValue,
      acknowledged: false
    });

    // Keep only last 50 alerts
    if (this.alerts.length > 50) {
      this.alerts = this.alerts.slice(0, 50);
    }
  }

  // Get today's spend
  getTodaySpend(): number {
    const today = new Date().toISOString().split('T')[0];
    return this.usageHistory
      .filter(u => u.timestamp.startsWith(today))
      .reduce((sum, u) => sum + u.cost, 0);
  }

  // Get this month's spend
  getMonthSpend(): number {
    const month = new Date().toISOString().slice(0, 7);
    return this.usageHistory
      .filter(u => u.timestamp.startsWith(month))
      .reduce((sum, u) => sum + u.cost, 0);
  }

  // Get cost summary
  getSummary(): CostSummary {
    const today = new Date().toISOString().split('T')[0];
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const month = new Date().toISOString().slice(0, 7);

    const todayRecords = this.usageHistory.filter(u => u.timestamp.startsWith(today));
    const weekRecords = this.usageHistory.filter(u => u.timestamp >= weekAgo);
    const monthRecords = this.usageHistory.filter(u => u.timestamp.startsWith(month));

    const uniqueCases = new Set(this.usageHistory.filter(u => u.caseId).map(u => u.caseId));
    const totalCost = this.usageHistory.reduce((sum, u) => sum + u.cost, 0);

    return {
      today: todayRecords.reduce((sum, u) => sum + u.cost, 0),
      thisWeek: weekRecords.reduce((sum, u) => sum + u.cost, 0),
      thisMonth: monthRecords.reduce((sum, u) => sum + u.cost, 0),
      allTime: totalCost,
      todayTokens: todayRecords.reduce((sum, u) => sum + u.inputTokens + u.outputTokens, 0),
      thisMonthTokens: monthRecords.reduce((sum, u) => sum + u.inputTokens + u.outputTokens, 0),
      casesProcessed: uniqueCases.size,
      avgCostPerCase: uniqueCases.size > 0 ? totalCost / uniqueCases.size : 0
    };
  }

  // Get agent breakdown
  getAgentBreakdown(): AgentCostRecord[] {
    const agentMap = new Map<string, AgentCostRecord>();

    for (const usage of this.usageHistory) {
      const existing = agentMap.get(usage.agentId);
      if (existing) {
        existing.totalCalls++;
        existing.totalTokens += usage.inputTokens + usage.outputTokens;
        existing.totalCost += usage.cost;
        existing.lastUsed = usage.timestamp;
      } else {
        agentMap.set(usage.agentId, {
          agentId: usage.agentId,
          agentName: usage.agentId.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
          totalCalls: 1,
          totalTokens: usage.inputTokens + usage.outputTokens,
          totalCost: usage.cost,
          avgTokensPerCall: 0,
          avgCostPerCall: 0,
          lastUsed: usage.timestamp
        });
      }
    }

    // Calculate averages
    for (const agent of agentMap.values()) {
      agent.avgTokensPerCall = agent.totalTokens / agent.totalCalls;
      agent.avgCostPerCall = agent.totalCost / agent.totalCalls;
    }

    return Array.from(agentMap.values()).sort((a, b) => b.totalCost - a.totalCost);
  }

  // Get optimization recommendations
  getRecommendations(): OptimizationRecommendation[] {
    const recommendations: OptimizationRecommendation[] = [];
    const agentBreakdown = this.getAgentBreakdown();

    // Check for agents that could use Haiku instead of Sonnet
    const highVolumeAgents = agentBreakdown.filter(a => a.totalCalls > 10 && a.avgTokensPerCall < 2000);
    if (highVolumeAgents.length > 0) {
      recommendations.push({
        id: 'model-downgrade',
        category: 'MODEL_SELECTION',
        title: 'Use Haiku for Simple Tasks',
        description: `${highVolumeAgents.length} agent(s) have low token usage per call. Consider using Claude Haiku for: ${highVolumeAgents.map(a => a.agentName).join(', ')}`,
        estimatedSavings: 85, // Haiku is ~85% cheaper
        priority: 'HIGH',
        implemented: false
      });
    }

    // Check for repeated similar calls (caching opportunity)
    const recentCalls = this.usageHistory.slice(-100);
    const duplicatePatterns = recentCalls.filter((u, i, arr) =>
      arr.findIndex(x => x.agentId === u.agentId && Math.abs(x.inputTokens - u.inputTokens) < 100) !== i
    );
    if (duplicatePatterns.length > 10) {
      recommendations.push({
        id: 'caching',
        category: 'CACHING',
        title: 'Enable Response Caching',
        description: 'Detected similar repeated queries. Enable caching to avoid redundant API calls.',
        estimatedSavings: 30,
        priority: 'MEDIUM',
        implemented: false
      });
    }

    // Check for high per-call costs
    const expensiveCalls = this.usageHistory.filter(u => u.cost > 0.10);
    if (expensiveCalls.length > 5) {
      recommendations.push({
        id: 'prompt-optimization',
        category: 'PROMPT_OPTIMIZATION',
        title: 'Optimize Long Prompts',
        description: `${expensiveCalls.length} calls exceeded $0.10. Review and optimize prompt lengths for these agents.`,
        estimatedSavings: 25,
        priority: 'MEDIUM',
        implemented: false
      });
    }

    return recommendations;
  }

  // Get alerts
  getAlerts(): CostAlert[] {
    return this.alerts;
  }

  // Acknowledge alert
  acknowledgeAlert(alertId: string) {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.acknowledged = true;
      this.persist();
    }
  }

  // Get/set limits
  getLimits(): CostLimits {
    return { ...this.limits };
  }

  setLimits(limits: Partial<CostLimits>) {
    this.limits = { ...this.limits, ...limits };
    this.persist();
    this.notifyListeners();
  }

  // Pause/resume
  pause() {
    this.isPaused = true;
    this.addAlert('INFO', 'Cost governor paused - all operations halted', 0, 0);
    this.notifyListeners();
  }

  resume() {
    this.isPaused = false;
    this.addAlert('INFO', 'Cost governor resumed - operations allowed', 0, 0);
    this.notifyListeners();
  }

  getIsPaused(): boolean {
    return this.isPaused;
  }

  // Subscribe to changes
  subscribe(listener: () => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notifyListeners() {
    this.listeners.forEach(l => l());
  }

  // Persistence
  private persist() {
    try {
      localStorage.setItem('ace_cost_history', JSON.stringify(this.usageHistory.slice(-1000)));
      localStorage.setItem('ace_cost_limits', JSON.stringify(this.limits));
      localStorage.setItem('ace_cost_alerts', JSON.stringify(this.alerts));
    } catch (e) {
      console.warn('Failed to persist cost data:', e);
    }
  }

  load() {
    try {
      const history = localStorage.getItem('ace_cost_history');
      const limits = localStorage.getItem('ace_cost_limits');
      const alerts = localStorage.getItem('ace_cost_alerts');

      if (history) this.usageHistory = JSON.parse(history);
      if (limits) this.limits = JSON.parse(limits);
      if (alerts) this.alerts = JSON.parse(alerts);
    } catch (e) {
      console.warn('Failed to load cost data:', e);
    }
  }

  // For testing/demo - add mock data
  addMockData() {
    const agents = ['intake-agent', 'evidence-agent', 'nexus-agent', 'qa-agent', 'report-agent'];
    const models = ['claude-sonnet-4-20250514', 'claude-haiku-3-5-20241022'];

    for (let i = 0; i < 50; i++) {
      const daysAgo = Math.floor(Math.random() * 30);
      const date = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
      const agent = agents[Math.floor(Math.random() * agents.length)];
      const model = models[Math.floor(Math.random() * models.length)];
      const inputTokens = Math.floor(Math.random() * 3000) + 500;
      const outputTokens = Math.floor(Math.random() * 2000) + 200;

      this.usageHistory.push({
        timestamp: date.toISOString(),
        agentId: agent,
        model,
        inputTokens,
        outputTokens,
        cost: this.calculateCost(model, inputTokens, outputTokens),
        caseId: `CASE-${Math.floor(Math.random() * 100)}`
      });
    }
    this.persist();
    this.notifyListeners();
  }
}

// Export singleton
export const costTracker = CostTrackingService.getInstance();

// ============================================================================
// COST GOVERNOR PANEL COMPONENT
// ============================================================================

interface CostGovernorPanelProps {
  expanded?: boolean;
}

export function CostGovernorPanel({ expanded = true }: CostGovernorPanelProps) {
  const [summary, setSummary] = useState<CostSummary>(costTracker.getSummary());
  const [agentBreakdown, setAgentBreakdown] = useState<AgentCostRecord[]>(costTracker.getAgentBreakdown());
  const [alerts, setAlerts] = useState<CostAlert[]>(costTracker.getAlerts());
  const [limits, setLimits] = useState<CostLimits>(costTracker.getLimits());
  const [recommendations, setRecommendations] = useState<OptimizationRecommendation[]>(costTracker.getRecommendations());
  const [isPaused, setIsPaused] = useState(costTracker.getIsPaused());
  const [showSettings, setShowSettings] = useState(false);
  const [showAgentDetails, setShowAgentDetails] = useState(false);
  const [isExpanded, setIsExpanded] = useState(expanded);

  // Load data on mount
  useEffect(() => {
    costTracker.load();
    refreshData();

    const unsubscribe = costTracker.subscribe(refreshData);
    return unsubscribe;
  }, []);

  const refreshData = useCallback(() => {
    setSummary(costTracker.getSummary());
    setAgentBreakdown(costTracker.getAgentBreakdown());
    setAlerts(costTracker.getAlerts());
    setLimits(costTracker.getLimits());
    setRecommendations(costTracker.getRecommendations());
    setIsPaused(costTracker.getIsPaused());
  }, []);

  const handleUpdateLimits = (newLimits: Partial<CostLimits>) => {
    costTracker.setLimits(newLimits);
    setLimits(costTracker.getLimits());
  };

  const handleTogglePause = () => {
    if (isPaused) {
      costTracker.resume();
    } else {
      costTracker.pause();
    }
    setIsPaused(costTracker.getIsPaused());
  };

  const handleAddMockData = () => {
    costTracker.addMockData();
    refreshData();
  };

  // Calculate percentages for progress bars
  const dailyPercent = Math.min((summary.today / limits.dailyLimit) * 100, 100);
  const monthlyPercent = Math.min((summary.thisMonth / limits.monthlyLimit) * 100, 100);

  const unacknowledgedAlerts = alerts.filter(a => !a.acknowledged && a.type !== 'INFO');

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div
        className="p-4 bg-gradient-to-r from-emerald-50 to-blue-50 border-b border-slate-200 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500 rounded-lg">
              <DollarSign className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900">Cost Governor</h3>
              <p className="text-xs text-slate-500">Real-time usage tracking & limits</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Quick stats */}
            <div className="text-right mr-4">
              <p className="text-lg font-bold text-slate-900">${summary.today.toFixed(2)}</p>
              <p className="text-xs text-slate-500">Today</p>
            </div>
            {unacknowledgedAlerts.length > 0 && (
              <div className="flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium">
                <Bell className="w-3 h-3" />
                {unacknowledgedAlerts.length}
              </div>
            )}
            {isPaused && (
              <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-medium">
                PAUSED
              </span>
            )}
            {isExpanded ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
          </div>
        </div>
      </div>

      {isExpanded && (
        <div className="p-4 space-y-4">
          {/* Quick Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleTogglePause}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                isPaused
                  ? 'bg-green-100 text-green-700 hover:bg-green-200'
                  : 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
              }`}
            >
              {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
              {isPaused ? 'Resume' : 'Pause'}
            </button>
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="flex items-center gap-1 px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-200 transition-all"
            >
              <Settings className="w-4 h-4" />
              Limits
            </button>
            <button
              onClick={refreshData}
              className="flex items-center gap-1 px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-200 transition-all"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
            <button
              onClick={handleAddMockData}
              className="flex items-center gap-1 px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg text-sm font-medium hover:bg-blue-200 transition-all ml-auto"
            >
              <Zap className="w-4 h-4" />
              Add Demo Data
            </button>
          </div>

          {/* Settings Panel */}
          {showSettings && (
            <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-3">
              <h4 className="font-medium text-slate-700 flex items-center gap-2">
                <Shield className="w-4 h-4" />
                Cost Limits
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-slate-500">Daily Limit ($)</label>
                  <input
                    type="number"
                    value={limits.dailyLimit}
                    onChange={(e) => handleUpdateLimits({ dailyLimit: parseFloat(e.target.value) || 0 })}
                    className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-500">Monthly Limit ($)</label>
                  <input
                    type="number"
                    value={limits.monthlyLimit}
                    onChange={(e) => handleUpdateLimits({ monthlyLimit: parseFloat(e.target.value) || 0 })}
                    className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-500">Per Case Limit ($)</label>
                  <input
                    type="number"
                    value={limits.perCaseLimit}
                    onChange={(e) => handleUpdateLimits({ perCaseLimit: parseFloat(e.target.value) || 0 })}
                    className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-500">Per Call Limit ($)</label>
                  <input
                    type="number"
                    value={limits.perAgentCallLimit}
                    onChange={(e) => handleUpdateLimits({ perAgentCallLimit: parseFloat(e.target.value) || 0 })}
                    className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-lg text-sm"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="hardStop"
                  checked={limits.hardStop}
                  onChange={(e) => handleUpdateLimits({ hardStop: e.target.checked })}
                  className="rounded"
                />
                <label htmlFor="hardStop" className="text-sm text-slate-600">
                  Hard stop when daily limit exceeded (block all operations)
                </label>
              </div>
            </div>
          )}

          {/* Cost Summary Cards */}
          <div className="grid grid-cols-4 gap-3">
            <div className="p-3 bg-slate-50 rounded-lg">
              <div className="flex items-center gap-2 text-slate-500 text-xs mb-1">
                <Clock className="w-3 h-3" />
                Today
              </div>
              <p className="text-xl font-bold text-slate-900">${summary.today.toFixed(2)}</p>
              <p className="text-xs text-slate-500">{summary.todayTokens.toLocaleString()} tokens</p>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg">
              <div className="flex items-center gap-2 text-slate-500 text-xs mb-1">
                <BarChart3 className="w-3 h-3" />
                This Week
              </div>
              <p className="text-xl font-bold text-slate-900">${summary.thisWeek.toFixed(2)}</p>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg">
              <div className="flex items-center gap-2 text-slate-500 text-xs mb-1">
                <TrendingUp className="w-3 h-3" />
                This Month
              </div>
              <p className="text-xl font-bold text-slate-900">${summary.thisMonth.toFixed(2)}</p>
              <p className="text-xs text-slate-500">{summary.thisMonthTokens.toLocaleString()} tokens</p>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg">
              <div className="flex items-center gap-2 text-slate-500 text-xs mb-1">
                <Target className="w-3 h-3" />
                Avg/Case
              </div>
              <p className="text-xl font-bold text-slate-900">${summary.avgCostPerCase.toFixed(2)}</p>
              <p className="text-xs text-slate-500">{summary.casesProcessed} cases</p>
            </div>
          </div>

          {/* Progress Bars */}
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-xs text-slate-600 mb-1">
                <span>Daily Budget</span>
                <span>${summary.today.toFixed(2)} / ${limits.dailyLimit.toFixed(2)}</span>
              </div>
              <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all ${
                    dailyPercent > 95 ? 'bg-red-500' : dailyPercent > 80 ? 'bg-yellow-500' : 'bg-emerald-500'
                  }`}
                  style={{ width: `${dailyPercent}%` }}
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-xs text-slate-600 mb-1">
                <span>Monthly Budget</span>
                <span>${summary.thisMonth.toFixed(2)} / ${limits.monthlyLimit.toFixed(2)}</span>
              </div>
              <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all ${
                    monthlyPercent > 95 ? 'bg-red-500' : monthlyPercent > 80 ? 'bg-yellow-500' : 'bg-blue-500'
                  }`}
                  style={{ width: `${monthlyPercent}%` }}
                />
              </div>
            </div>
          </div>

          {/* Alerts */}
          {unacknowledgedAlerts.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-slate-700 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-yellow-500" />
                Active Alerts
              </h4>
              {unacknowledgedAlerts.slice(0, 3).map(alert => (
                <div
                  key={alert.id}
                  className={`p-3 rounded-lg text-sm flex items-start justify-between ${
                    alert.type === 'CRITICAL' ? 'bg-red-50 border border-red-200' :
                    alert.type === 'WARNING' ? 'bg-yellow-50 border border-yellow-200' :
                    'bg-blue-50 border border-blue-200'
                  }`}
                >
                  <div>
                    <p className={`font-medium ${
                      alert.type === 'CRITICAL' ? 'text-red-700' :
                      alert.type === 'WARNING' ? 'text-yellow-700' :
                      'text-blue-700'
                    }`}>{alert.message}</p>
                    <p className="text-xs text-slate-500 mt-1">
                      {new Date(alert.timestamp).toLocaleString()}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      costTracker.acknowledgeAlert(alert.id);
                      refreshData();
                    }}
                    className="text-xs text-slate-500 hover:text-slate-700"
                  >
                    Dismiss
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Agent Breakdown */}
          <div>
            <button
              onClick={() => setShowAgentDetails(!showAgentDetails)}
              className="w-full flex items-center justify-between text-sm font-medium text-slate-700 py-2"
            >
              <span className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4" />
                Agent Cost Breakdown
              </span>
              {showAgentDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            {showAgentDetails && (
              <div className="space-y-2">
                {agentBreakdown.slice(0, 5).map(agent => (
                  <div key={agent.agentId} className="flex items-center justify-between p-2 bg-slate-50 rounded">
                    <div>
                      <p className="text-sm font-medium text-slate-700">{agent.agentName}</p>
                      <p className="text-xs text-slate-500">{agent.totalCalls} calls • {agent.totalTokens.toLocaleString()} tokens</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-slate-900">${agent.totalCost.toFixed(2)}</p>
                      <p className="text-xs text-slate-500">${agent.avgCostPerCall.toFixed(4)}/call</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Optimization Recommendations */}
          {recommendations.length > 0 && (
            <div className="border-t border-slate-200 pt-4">
              <h4 className="text-sm font-medium text-slate-700 flex items-center gap-2 mb-3">
                <TrendingDown className="w-4 h-4 text-emerald-500" />
                Optimization Opportunities
              </h4>
              <div className="space-y-2">
                {recommendations.map(rec => (
                  <div key={rec.id} className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm font-medium text-emerald-800">{rec.title}</p>
                        <p className="text-xs text-emerald-600 mt-1">{rec.description}</p>
                      </div>
                      <span className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded text-xs font-medium">
                        ~{rec.estimatedSavings}% savings
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Footer Info */}
          <div className="flex items-center gap-2 text-xs text-slate-500 pt-2 border-t border-slate-200">
            <Info className="w-3 h-3" />
            Prices based on Claude API rates. Actual costs may vary.
          </div>
        </div>
      )}
    </div>
  );
}

export default CostGovernorPanel;
