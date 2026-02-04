/**
 * ACE Browser Automation Panel - GOVERNED VERSION
 *
 * UI for the governed browser automation system:
 * 1. Pack Selection - Choose from governed instruction packs
 * 2. Plan Preview - Review ActionPlan before approval
 * 3. Gate Approvals - Handle ADVISORY/MANDATORY gates
 * 4. Execution Monitor - Track progress with stop conditions
 * 5. Evidence Viewer - Review captured evidence with hashes
 * 6. Export - Package evidence for compliance
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Globe,
  Play,
  Square,
  CheckCircle2,
  XCircle,
  AlertCircle,
  AlertTriangle,
  Clock,
  FileText,
  Image,
  Download,
  Search,
  ChevronDown,
  ChevronRight,
  RefreshCw,
  Settings,
  Shield,
  ShieldCheck,
  ShieldAlert,
  Lock,
  Unlock,
  Eye,
  List,
  Hash,
  ExternalLink,
  Terminal,
  CheckSquare,
  XSquare,
  Zap
} from 'lucide-react';
import {
  browserAutomationPlanner,
  browserAutomationRunner,
  InstructionPack,
  ActionPlan,
  ApprovalStatus,
  ExecutionContext,
  ExecutionStatus,
  ExecutionResult,
  InstructionCategory,
  PlannedStep,
  RiskFlag,
  GateEvent,
  EvidenceRecord,
  ActionSensitivity,
  StopConditionType
} from '../services/browserAutomationAgent';
import {
  INSTRUCTION_PACKS,
  getPacksByWorkforce,
  searchPacks,
  validatePack
} from '../services/instructionPacks';
import { WorkforceType, MAIClassification } from '../types';
import { generateCustomPack } from '../services/customPackGenerator';
import { mcpBridge, useMCPExecution, createScreenshotUrl } from '../services/mcpBridge';
import { MultiTabDashboard } from './MultiTabDashboard';
import { Grid } from 'lucide-react';

interface BrowserAutomationPanelProps {
  workforce?: WorkforceType;
  currentUser?: string;
  onResultsReady?: (results: ExecutionResult) => void;
}

type ViewMode = 'packs' | 'custom' | 'plan' | 'execution' | 'results' | 'multi-tab';

const CATEGORY_LABELS: Record<InstructionCategory, string> = {
  [InstructionCategory.EVIDENCE_COLLECTION]: 'Evidence Collection',
  [InstructionCategory.DATA_EXTRACTION]: 'Data Extraction',
  [InstructionCategory.RESEARCH]: 'Research',
  [InstructionCategory.DOCUMENTATION]: 'Documentation',
  [InstructionCategory.VERIFICATION]: 'Verification'
};

export function BrowserAutomationPanel({ workforce, currentUser = 'ISSO', onResultsReady }: BrowserAutomationPanelProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('packs');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPack, setSelectedPack] = useState<InstructionPack | null>(null);
  const [inputParams, setInputParams] = useState<Record<string, string>>({});
  const [actionPlan, setActionPlan] = useState<ActionPlan | null>(null);
  const [executionContext, setExecutionContext] = useState<ExecutionContext | null>(null);
  const [executionResult, setExecutionResult] = useState<ExecutionResult | null>(null);
  const [isPlanning, setIsPlanning] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [pendingGate, setPendingGate] = useState<GateEvent | null>(null);
  const [gateResolver, setGateResolver] = useState<((approved: boolean) => void) | null>(null);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['steps', 'domains']));

  // Custom pack creator state
  const [customPrompt, setCustomPrompt] = useState('');
  const [customDomains, setCustomDomains] = useState('');
  const [isGeneratingPack, setIsGeneratingPack] = useState(false);
  const [generatedPack, setGeneratedPack] = useState<InstructionPack | null>(null);
  const [packWarnings, setPackWarnings] = useState<string[]>([]);  // WARNED items
  const [packConstraints, setPackConstraints] = useState<string[]>([]);  // CONSTRAINED items
  const [packRateLimits, setPackRateLimits] = useState<{ max_refresh_attempts: number; min_delay_seconds: number } | null>(null);

  // Real MCP execution state
  const mcpExecution = useMCPExecution();
  const [liveScreenshots, setLiveScreenshots] = useState<Array<{ id: string; data: string; description: string; timestamp: string }>>([]);
  const [mcpRequestPending, setMcpRequestPending] = useState(false);

  // Get filtered packs
  const filteredPacks = useCallback(() => {
    let packs = workforce
      ? getPacksByWorkforce(workforce)
      : INSTRUCTION_PACKS;

    if (searchQuery) {
      packs = searchPacks(searchQuery);
    }

    return packs;
  }, [workforce, searchQuery]);

  // Extract required parameters from pack
  const extractRequiredParams = (pack: InstructionPack): string[] => {
    const params = new Set<string>();
    pack.steps.forEach(step => {
      const stepStr = JSON.stringify(step);
      const matches = stepStr.matchAll(/\{\{(\w+)\}\}/g);
      for (const match of matches) {
        params.add(match[1]);
      }
    });
    // Also check allowed_domains for parameterized domains
    pack.allowed_domains.forEach(domain => {
      const matches = domain.matchAll(/\{\{(\w+)\}\}/g);
      for (const match of matches) {
        params.add(match[1]);
      }
    });
    return Array.from(params);
  };

  // Handle pack selection
  const handleSelectPack = (pack: InstructionPack) => {
    // Validate pack
    const validation = validatePack(pack);
    if (!validation.valid) {
      console.error('Pack validation failed:', validation.issues);
      return;
    }

    setSelectedPack(pack);
    setInputParams({});
    setActionPlan(null);
    setExecutionResult(null);
    setViewMode('plan');
  };

  // Generate action plan
  const handleGeneratePlan = async () => {
    if (!selectedPack) return;

    setIsPlanning(true);
    try {
      const plan = await browserAutomationPlanner.generatePlan(selectedPack, inputParams);
      setActionPlan(plan);
    } catch (error) {
      console.error('Plan generation failed:', error);
    } finally {
      setIsPlanning(false);
    }
  };

  // Approve plan
  const handleApprovePlan = () => {
    if (!actionPlan) return;

    setActionPlan({
      ...actionPlan,
      approval_status: ApprovalStatus.APPROVED,
      approved_by: currentUser,
      approved_at: new Date().toISOString()
    });
  };

  // Reject plan
  const handleRejectPlan = () => {
    if (!actionPlan) return;

    setActionPlan({
      ...actionPlan,
      approval_status: ApprovalStatus.REJECTED
    });
  };

  // Handle gate approval
  const handleGateApproval = (approved: boolean) => {
    if (gateResolver) {
      gateResolver(approved);
      setGateResolver(null);
      setPendingGate(null);
    }
  };

  // Execute plan - Now with MCP Bridge for real browser control
  const handleExecute = async () => {
    if (!selectedPack || !actionPlan || actionPlan.approval_status !== ApprovalStatus.APPROVED) return;

    setIsExecuting(true);
    setViewMode('execution');
    setExecutionResult(null);
    setLiveScreenshots([]);
    setMcpRequestPending(true);

    // Request real MCP execution via bridge
    // Claude will pick this up and use Chrome MCP tools
    const requestId = mcpExecution.startExecution(selectedPack, inputParams);
    console.log('[ACE] MCP execution requested:', requestId);
    console.log('[ACE] Pack:', selectedPack.name);
    console.log('[ACE] Waiting for Claude to execute with Chrome MCP tools...');

    // Also run simulated execution for fallback/demo
    try {
      const result = await browserAutomationRunner.execute(
        actionPlan,
        selectedPack,
        inputParams,
        (context) => setExecutionContext({ ...context }),
        async (gate) => {
          // Handle gate - show UI and wait for user decision
          setPendingGate(gate);
          return new Promise<boolean>((resolve) => {
            setGateResolver(() => resolve);
          });
        }
      );

      setExecutionResult(result);
      setViewMode('results');
      onResultsReady?.(result);
    } catch (error) {
      console.error('Execution failed:', error);
    } finally {
      setIsExecuting(false);
      setMcpRequestPending(false);
    }
  };

  // Handle real MCP screenshots as they come in
  useEffect(() => {
    if (mcpExecution.evidence.length > 0) {
      const newScreenshots = mcpExecution.evidence
        .filter(e => (e as any).screenshotData)
        .map(e => ({
          id: e.id,
          data: (e as any).screenshotData,
          description: e.description,
          timestamp: e.timestamp
        }));
      setLiveScreenshots(newScreenshots);
    }
  }, [mcpExecution.evidence]);

  // Abort execution
  const handleAbort = () => {
    browserAutomationRunner.abort();
    setIsExecuting(false);
  };

  // Toggle section expansion
  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };

  // Render sensitivity badge
  const renderSensitivityBadge = (sensitivity: ActionSensitivity) => {
    switch (sensitivity) {
      case ActionSensitivity.SAFE:
        return <span className="px-2 py-0.5 bg-green-500/20 text-green-400 rounded text-xs">SAFE</span>;
      case ActionSensitivity.ADVISORY:
        return <span className="px-2 py-0.5 bg-yellow-500/20 text-yellow-400 rounded text-xs">ADVISORY</span>;
      case ActionSensitivity.MANDATORY:
        return <span className="px-2 py-0.5 bg-red-500/20 text-red-400 rounded text-xs">MANDATORY</span>;
    }
  };

  // Render MAI classification badge with tooltip
  const renderMAIBadge = (classification: MAIClassification, showTooltip: boolean = false) => {
    const tooltips = {
      [MAIClassification.INFORMATIONAL]: 'Auto-proceeds with logging • Read-only operations',
      [MAIClassification.ADVISORY]: 'Human should review • Flagged for attention',
      [MAIClassification.MANDATORY]: 'STOPS until human approves • High-risk action'
    };

    switch (classification) {
      case MAIClassification.INFORMATIONAL:
        return (
          <span
            className="px-2 py-0.5 bg-blue-500/20 text-blue-600 rounded text-xs font-medium border border-blue-300"
            title={showTooltip ? tooltips[classification] : undefined}
          >
            ℹ INFORMATIONAL
          </span>
        );
      case MAIClassification.ADVISORY:
        return (
          <span
            className="px-2 py-0.5 bg-yellow-500/20 text-yellow-700 rounded text-xs font-medium border border-yellow-400"
            title={showTooltip ? tooltips[classification] : undefined}
          >
            ⚠ ADVISORY
          </span>
        );
      case MAIClassification.MANDATORY:
        return (
          <span
            className="px-2 py-0.5 bg-red-500/20 text-red-600 rounded text-xs font-medium border border-red-400"
            title={showTooltip ? tooltips[classification] : undefined}
          >
            🛑 MANDATORY
          </span>
        );
    }
  };

  // Render pack card with GIA governance highlights
  const renderPackCard = (pack: InstructionPack) => (
    <div
      key={pack.id}
      onClick={() => handleSelectPack(pack)}
      className="bg-white border border-slate-200 shadow-sm rounded-lg p-4 cursor-pointer hover:border-cyan-500/50 hover:shadow-md transition-all"
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-blue-600" />
          <span className="text-xs text-slate-600">{CATEGORY_LABELS[pack.category]}</span>
        </div>
        {renderMAIBadge(pack.classification, true)}
      </div>

      <h3 className="font-medium text-slate-900 mb-1">{pack.name}</h3>
      <p className="text-sm text-slate-600 mb-3 line-clamp-2">{pack.description}</p>

      {/* GIA Governance Summary */}
      <div className="bg-slate-50 rounded p-2 mb-3 border border-slate-100">
        <div className="flex items-center gap-4 text-xs text-slate-600">
          <span className="flex items-center gap-1" title="Allowed domains enforced by Governance Layer">
            <Lock className="w-3 h-3 text-blue-500" />
            {pack.allowed_domains.length} domains
          </span>
          <span className="flex items-center gap-1" title="Stop conditions that halt execution">
            <AlertTriangle className="w-3 h-3 text-yellow-500" />
            {pack.stop_conditions?.length || 0} stops
          </span>
          <span className="flex items-center gap-1" title="Steps in execution plan">
            <List className="w-3 h-3 text-purple-500" />
            {pack.steps.length} steps
          </span>
        </div>
      </div>

      <div className="flex flex-wrap gap-1">
        {pack.tags.slice(0, 3).map(tag => (
          <span key={tag} className="px-2 py-0.5 bg-slate-100 rounded text-xs text-slate-700">
            {tag}
          </span>
        ))}
      </div>
    </div>
  );

  // Handle custom pack generation
  const handleGenerateCustomPack = async () => {
    if (!customPrompt.trim()) return;

    setIsGeneratingPack(true);
    try {
      const domains = customDomains
        .split(',')
        .map(d => d.trim())
        .filter(d => d.length > 0);

      const pack = await generateCustomPack({
        prompt: customPrompt,
        allowedDomains: domains
      });

      // Extract governance audit information
      const warnings = (pack as any)._warnings || [];   // WARNED items
      const constraints = (pack as any)._constraints || [];  // CONSTRAINED items
      const rateLimits = (pack as any)._rateLimits || null;  // Loop rate limits

      setPackWarnings(warnings);
      setPackConstraints(constraints);
      setPackRateLimits(rateLimits);

      setGeneratedPack(pack);
      setSelectedPack(pack);
      setViewMode('plan');
    } catch (error: any) {
      console.error('Failed to generate custom pack:', error);
      // Show governance BLOCKED message more clearly
      const message = error.message || 'Failed to generate pack';
      alert(message);
    } finally {
      setIsGeneratingPack(false);
    }
  };

  // Render packs view
  const renderPacksView = () => (
    <div className="space-y-4">
      {/* GIA Three-Layer Overview */}
      <div className="bg-gradient-to-r from-slate-50 to-blue-50 border border-slate-200 rounded-lg p-4">
        <div className="grid grid-cols-3 gap-4 text-center">
          {/* Governance Layer */}
          <div className="bg-white border border-blue-200 rounded-lg p-3">
            <div className="flex items-center justify-center gap-2 mb-2">
              <ShieldCheck className="w-5 h-5 text-blue-600" />
              <span className="font-medium text-blue-900">Governance</span>
            </div>
            <div className="text-xs text-slate-600 space-y-1">
              <div className="flex items-center justify-center gap-1">
                <Lock className="w-3 h-3" /> Domain Allowlist
              </div>
              <div className="flex items-center justify-center gap-1">
                <AlertTriangle className="w-3 h-3" /> Stop Conditions
              </div>
              <div className="flex items-center justify-center gap-1">
                <Shield className="w-3 h-3" /> MAI Gates
              </div>
            </div>
          </div>
          {/* Execution Layer */}
          <div className="bg-white border border-purple-200 rounded-lg p-3">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Globe className="w-5 h-5 text-purple-600" />
              <span className="font-medium text-purple-900">Execution</span>
            </div>
            <div className="text-xs text-slate-600 space-y-1">
              <div className="flex items-center justify-center gap-1">
                <Play className="w-3 h-3" /> Browser Control
              </div>
              <div className="flex items-center justify-center gap-1">
                <RefreshCw className="w-3 h-3" /> AI Decisions
              </div>
              <div className="flex items-center justify-center gap-1">
                <Image className="w-3 h-3" /> Evidence Capture
              </div>
            </div>
          </div>
          {/* Profile Layer */}
          <div className="bg-white border border-green-200 rounded-lg p-3">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Settings className="w-5 h-5 text-green-600" />
              <span className="font-medium text-green-900">Profile</span>
            </div>
            <div className="text-xs text-slate-600 space-y-1">
              <div className="flex items-center justify-center gap-1">
                <FileText className="w-3 h-3" /> User Preferences
              </div>
              <div className="flex items-center justify-center gap-1">
                <List className="w-3 h-3" /> Accounts & Context
              </div>
              <div className="flex items-center justify-center gap-1">
                <Hash className="w-3 h-3" /> Personalization
              </div>
            </div>
          </div>
        </div>
        <p className="text-center text-xs text-slate-500 mt-3">
          <strong>GIA:</strong> Governance is structural (not instructional) • Human oversight is architectural • Every action audited
        </p>
      </div>

      {/* Action Buttons Row */}
      <div className="flex items-center gap-3 flex-wrap">
        <button
          onClick={() => setViewMode('custom')}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 text-white rounded-lg font-medium transition-all"
        >
          <Zap className="w-4 h-4" />
          Create Custom Pack
        </button>
        <button
          onClick={() => setViewMode('multi-tab')}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-600 to-green-600 hover:from-cyan-500 hover:to-green-500 text-white rounded-lg font-medium transition-all"
        >
          <Grid className="w-4 h-4" />
          Multi-Tab Research
        </button>
        <span className="text-sm text-slate-600">or choose from governed packs below</span>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
        <input
          type="text"
          placeholder="Search governed packs..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:border-cyan-500 focus:outline-none"
        />
      </div>

      {/* Pack grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredPacks().map(renderPackCard)}
      </div>

      {filteredPacks().length === 0 && (
        <div className="text-center py-12 text-slate-600">
          <Shield className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>No governed packs available for this workforce.</p>
        </div>
      )}
    </div>
  );

  // Render custom pack creator view
  const renderCustomView = () => (
    <div className="space-y-4">
      <div className="bg-gradient-to-r from-purple-500/10 to-cyan-500/10 border border-purple-500/30 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-2">
          <Zap className="w-5 h-5 text-purple-400" />
          <h3 className="font-medium text-slate-900">AI-Powered Custom Pack</h3>
          <span className="px-2 py-0.5 bg-purple-500/20 text-purple-400 rounded text-xs flex items-center gap-1">
            <span className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-pulse"></span>
            Claude Sonnet
          </span>
          <span className="px-2 py-0.5 bg-yellow-500/20 text-yellow-400 rounded text-xs">V1 Read-Only</span>
        </div>
        <p className="text-sm text-slate-600">
          Tell Claude what you want to do in plain language. It will intelligently create a governed browser automation pack.
        </p>
      </div>

      {/* Prompt Input */}
      <div className="bg-white border border-slate-200 shadow-sm rounded-lg p-4">
        <label className="block text-sm font-medium text-slate-900 mb-2">
          What do you want to do?
        </label>
        <textarea
          value={customPrompt}
          onChange={(e) => setCustomPrompt(e.target.value)}
          placeholder="Examples:
• Check if the latest Jordans are available at footlocker.com and find nearby stores
• Go to walmart.com and look up prices for gaming monitors
• Research sam.gov for cybersecurity solicitations with deadlines this month
• Find VA disability rating criteria for PTSD on va.gov"
          className="w-full h-36 px-3 py-2 bg-slate-900 border border-slate-200 rounded-lg text-slate-900 placeholder-slate-500 focus:border-cyan-500 focus:outline-none resize-none"
        />
        <div className="flex justify-between mt-2 text-xs text-slate-500">
          <span>Claude will understand your intent and create an appropriate automation plan</span>
          <span>{customPrompt.length}/2000</span>
        </div>
      </div>

      {/* Domain Input */}
      <div className="bg-white border border-slate-200 shadow-sm rounded-lg p-4">
        <label className="block text-sm font-medium text-slate-900 mb-2">
          Allowed Domains <span className="text-slate-500 font-normal">(optional - auto-detected from prompt)</span>
        </label>
        <input
          type="text"
          value={customDomains}
          onChange={(e) => setCustomDomains(e.target.value)}
          placeholder="e.g., walmart.com, nike.com, sam.gov"
          className="w-full px-3 py-2 bg-slate-900 border border-slate-200 rounded-lg text-slate-900 placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
        />
        <p className="mt-2 text-xs text-slate-500">
          Only needed if you want to add additional domains beyond what's in your prompt.
        </p>
      </div>

      {/* Governance Notice */}
      <div className="bg-white border border-slate-200 shadow-sm rounded-lg p-4">
        <h4 className="font-medium text-slate-900 mb-2 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-green-400" />
          Automatic Governance Applied
        </h4>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="flex items-center gap-2 text-slate-600">
            <CheckCircle2 className="w-3 h-3 text-green-400" />
            PII Redaction
          </div>
          <div className="flex items-center gap-2 text-slate-600">
            <CheckCircle2 className="w-3 h-3 text-green-400" />
            Screenshot Evidence
          </div>
          <div className="flex items-center gap-2 text-slate-600">
            <CheckCircle2 className="w-3 h-3 text-green-400" />
            Hash Verification
          </div>
          <div className="flex items-center gap-2 text-slate-600">
            <CheckCircle2 className="w-3 h-3 text-green-400" />
            Stop Conditions
          </div>
          <div className="flex items-center gap-2 text-slate-600">
            <CheckCircle2 className="w-3 h-3 text-green-400" />
            Payment Domains Blocked
          </div>
          <div className="flex items-center gap-2 text-slate-600">
            <CheckCircle2 className="w-3 h-3 text-green-400" />
            Login Detection
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleGenerateCustomPack}
          disabled={!customPrompt.trim() || isGeneratingPack}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 disabled:from-slate-700 disabled:to-slate-700 disabled:text-slate-500 text-slate-900 rounded-lg font-medium transition-all"
        >
          {isGeneratingPack ? (
            <><RefreshCw className="w-4 h-4 animate-spin" /> Claude is thinking...</>
          ) : (
            <><Zap className="w-4 h-4" /> Ask Claude to Build Pack</>
          )}
        </button>
        <button
          onClick={() => { setViewMode('packs'); setCustomPrompt(''); setCustomDomains(''); }}
          className="px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-900 rounded-lg transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );

  // Render plan view
  const renderPlanView = () => {
    if (!selectedPack) return null;

    const requiredParams = extractRequiredParams(selectedPack);
    const hasAllParams = requiredParams.every(p => inputParams[p]);

    return (
      <div className="space-y-4">
        {/* Pack header */}
        <div className="bg-white border border-slate-200 shadow-sm rounded-lg p-4">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Shield className="w-5 h-5 text-blue-600" />
                <h3 className="text-lg font-medium text-slate-900">{selectedPack.name}</h3>
                {renderMAIBadge(selectedPack.classification)}
              </div>
              <p className="text-sm text-slate-600">{selectedPack.description}</p>
            </div>
            <button
              onClick={() => { setSelectedPack(null); setViewMode('packs'); setPackWarnings([]); setPackConstraints([]); setPackRateLimits(null); }}
              className="text-slate-600 hover:text-slate-900"
            >
              <XCircle className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Governance CONSTRAINED - Plan modifications */}
        {packConstraints.length > 0 && (
          <div className="bg-purple-500/10 border border-purple-500/50 rounded-lg p-4">
            <h4 className="font-medium text-purple-400 mb-2 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4" />
              CONSTRAINED — Plan Modified
            </h4>
            <div className="space-y-1 text-sm">
              {packConstraints.map((constraint, i) => (
                <div key={i} className="flex items-start gap-2 text-purple-300">
                  <span className="text-purple-500 mt-0.5">→</span>
                  <span>{constraint}</span>
                </div>
              ))}
            </div>
            <p className="text-xs text-purple-500/70 mt-2">
              Your request was modified to comply with ACE governance. The plan reflects these constraints.
            </p>
          </div>
        )}

        {/* Governance WARNED - May trigger runtime stops */}
        {packWarnings.length > 0 && (
          <div className="bg-yellow-500/10 border border-yellow-500/50 rounded-lg p-4">
            <h4 className="font-medium text-yellow-400 mb-2 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              WARNED — May Stop at Runtime
            </h4>
            <div className="space-y-1 text-sm">
              {packWarnings.map((warning, i) => (
                <div key={i} className="flex items-start gap-2 text-yellow-300">
                  <span className="text-yellow-500 mt-0.5">•</span>
                  <span>{warning}</span>
                </div>
              ))}
            </div>
            {packRateLimits && (
              <div className="mt-3 pt-2 border-t border-yellow-500/30 text-xs text-yellow-400">
                <span className="font-medium">Rate Limits Applied:</span> Max {packRateLimits.max_refresh_attempts} attempts, {packRateLimits.min_delay_seconds}s minimum delay
              </div>
            )}
            <p className="text-xs text-yellow-500/70 mt-2">
              These conditions will be enforced by the runner. Execution may STOP early if conditions are detected.
            </p>
          </div>
        )}

        {/* Governance summary */}
        <div className="bg-white border border-slate-200 shadow-sm rounded-lg p-4">
          <div
            className="flex items-center justify-between cursor-pointer"
            onClick={() => toggleSection('governance')}
          >
            <h4 className="font-medium text-slate-900 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-green-400" />
              Governance Controls
            </h4>
            {expandedSections.has('governance') ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </div>

          {expandedSections.has('governance') && (
            <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-slate-600 mb-1">Allowed Domains</div>
                <div className="space-y-1">
                  {selectedPack.allowed_domains.map(d => (
                    <div key={d} className="flex items-center gap-1 text-green-400">
                      <CheckCircle2 className="w-3 h-3" /> {d}
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <div className="text-slate-600 mb-1">Blocked Domains</div>
                <div className="space-y-1">
                  {selectedPack.blocked_domains.map(d => (
                    <div key={d} className="flex items-center gap-1 text-red-400">
                      <XCircle className="w-3 h-3" /> {d}
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <div className="text-slate-600 mb-1">Stop Conditions</div>
                <div className="space-y-1">
                  {selectedPack.stop_conditions.map(s => (
                    <div key={s} className="flex items-center gap-1 text-yellow-400">
                      <AlertTriangle className="w-3 h-3" /> {s.replace(/_/g, ' ')}
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <div className="text-slate-600 mb-1">Data Handling</div>
                <div className="space-y-1 text-slate-700">
                  {selectedPack.data_handling.redact_pii_before_llm && <div>PII Redaction: ON</div>}
                  {selectedPack.data_handling.mask_ssn && <div>SSN Masking: ON</div>}
                  {selectedPack.data_handling.mask_credit_cards && <div>CC Masking: ON</div>}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Input parameters */}
        {requiredParams.length > 0 && (
          <div className="bg-white border border-slate-200 shadow-sm rounded-lg p-4">
            <h4 className="font-medium text-slate-900 mb-4 flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Input Parameters
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {requiredParams.map(param => (
                <div key={param}>
                  <label className="block text-sm text-slate-600 mb-1">
                    {param.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </label>
                  <input
                    type="text"
                    value={inputParams[param] || ''}
                    onChange={(e) => setInputParams({ ...inputParams, [param]: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-200 rounded text-slate-900 placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
                    placeholder={`Enter ${param}`}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Generate plan button */}
        {!actionPlan && (
          <button
            onClick={handleGeneratePlan}
            disabled={!hasAllParams || isPlanning}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-100 disabled:text-slate-500 text-slate-900 rounded-lg font-medium transition-colors"
          >
            {isPlanning ? (
              <><RefreshCw className="w-4 h-4 animate-spin" /> Generating Plan...</>
            ) : (
              <><FileText className="w-4 h-4" /> Generate Action Plan</>
            )}
          </button>
        )}

        {/* Action Plan review */}
        {actionPlan && (
          <>
            {/* Plan validation */}
            <div className={`border rounded-lg p-4 ${
              actionPlan.domain_validation.valid && actionPlan.action_validation.valid
                ? 'bg-green-500/10 border-green-500/50'
                : 'bg-red-500/10 border-red-500/50'
            }`}>
              <div className="flex items-center gap-2 mb-2">
                {actionPlan.domain_validation.valid && actionPlan.action_validation.valid ? (
                  <><CheckCircle2 className="w-5 h-5 text-green-400" /> <span className="font-medium text-slate-900">Plan Validated</span></>
                ) : (
                  <><XCircle className="w-5 h-5 text-red-400" /> <span className="font-medium text-slate-900">Validation Failed</span></>
                )}
              </div>

              {actionPlan.domain_validation.violations.length > 0 && (
                <div className="text-sm text-red-400">
                  {actionPlan.domain_validation.violations.map((v, i) => <div key={i}>• {v}</div>)}
                </div>
              )}
              {actionPlan.action_validation.violations.length > 0 && (
                <div className="text-sm text-red-400">
                  {actionPlan.action_validation.violations.map((v, i) => <div key={i}>• {v}</div>)}
                </div>
              )}
            </div>

            {/* Risk flags */}
            {actionPlan.risk_flags.length > 0 && (
              <div className="bg-yellow-500/10 border border-yellow-500/50 rounded-lg p-4">
                <h4 className="font-medium text-yellow-400 mb-2 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  Risk Flags ({actionPlan.risk_flags.length})
                </h4>
                <div className="space-y-2">
                  {actionPlan.risk_flags.map((flag, i) => (
                    <div key={i} className="text-sm">
                      <span className={`px-1.5 py-0.5 rounded text-xs mr-2 ${
                        flag.severity === 'HIGH' ? 'bg-red-500/20 text-red-400' :
                        flag.severity === 'MEDIUM' ? 'bg-yellow-500/20 text-yellow-400' :
                        'bg-blue-500/20 text-blue-400'
                      }`}>{flag.severity}</span>
                      <span className="text-slate-700">{flag.description}</span>
                      {flag.mitigation && <span className="text-slate-500 ml-2">({flag.mitigation})</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Gates required */}
            {actionPlan.gates_required.length > 0 && (
              <div className="bg-white border border-slate-200 shadow-sm rounded-lg p-4">
                <h4 className="font-medium text-slate-900 mb-2 flex items-center gap-2">
                  <Lock className="w-4 h-4" />
                  Gates Required ({actionPlan.gates_required.length})
                </h4>
                <div className="space-y-2">
                  {actionPlan.gates_required.map((gate, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm">
                      {renderMAIBadge(gate.gate_type)}
                      <span className="text-slate-700">Step {gate.step_id}: {gate.reason}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Planned steps */}
            <div className="bg-white border border-slate-200 shadow-sm rounded-lg p-4">
              <div
                className="flex items-center justify-between cursor-pointer"
                onClick={() => toggleSection('steps')}
              >
                <h4 className="font-medium text-slate-900 flex items-center gap-2">
                  <List className="w-4 h-4" />
                  Planned Steps ({actionPlan.steps.length})
                </h4>
                {expandedSections.has('steps') ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </div>

              {expandedSections.has('steps') && (
                <div className="mt-4 space-y-2">
                  {actionPlan.steps.map((step, i) => (
                    <div key={step.step_id} className="flex items-start gap-3 py-2 px-3 bg-slate-900/50 rounded">
                      <span className="w-6 h-6 flex items-center justify-center bg-slate-100 rounded text-xs text-slate-900 flex-shrink-0">
                        {i + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm text-slate-900 font-medium">{step.action}</span>
                          {renderSensitivityBadge(step.sensitivity)}
                          {step.requires_gate && (
                            <span className="text-xs text-yellow-400">
                              <Lock className="w-3 h-3 inline" /> Gate
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-600 mt-0.5">{step.expected_result}</div>
                        <div className="text-xs text-slate-500 mt-0.5">{step.target_description}</div>
                      </div>
                      {step.evidence_to_capture.length > 0 && (
                        <Image className="w-4 h-4 text-blue-600 flex-shrink-0" title={`Evidence: ${step.evidence_to_capture.join(', ')}`} />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Approval buttons */}
            {actionPlan.approval_status === ApprovalStatus.PENDING && (
              <div className="flex items-center gap-3">
                <button
                  onClick={handleApprovePlan}
                  disabled={!actionPlan.domain_validation.valid || !actionPlan.action_validation.valid}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-green-600 hover:bg-green-500 disabled:bg-slate-100 disabled:text-slate-500 text-slate-900 rounded-lg font-medium transition-colors"
                >
                  <CheckSquare className="w-4 h-4" />
                  Approve Plan
                </button>
                <button
                  onClick={handleRejectPlan}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-red-600 hover:bg-red-500 text-slate-900 rounded-lg font-medium transition-colors"
                >
                  <XSquare className="w-4 h-4" />
                  Reject Plan
                </button>
              </div>
            )}

            {/* Execute button (only if approved) */}
            {actionPlan.approval_status === ApprovalStatus.APPROVED && (
              <div className="bg-green-500/10 border border-green-500/50 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-green-400" />
                    <span className="text-green-400 font-medium">Plan Approved by {actionPlan.approved_by}</span>
                  </div>
                  <button
                    onClick={handleExecute}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-slate-900 rounded-lg font-medium transition-colors"
                  >
                    <Play className="w-4 h-4" />
                    Execute Plan
                  </button>
                </div>
              </div>
            )}

            {actionPlan.approval_status === ApprovalStatus.REJECTED && (
              <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-4">
                <div className="flex items-center gap-2">
                  <XCircle className="w-5 h-5 text-red-400" />
                  <span className="text-red-400 font-medium">Plan Rejected</span>
                </div>
              </div>
            )}
          </>
        )}

        {/* Back button */}
        <button
          onClick={() => { setSelectedPack(null); setActionPlan(null); setViewMode('packs'); setPackWarnings([]); setPackConstraints([]); setPackRateLimits(null); }}
          className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-900 rounded-lg transition-colors"
        >
          Back to Packs
        </button>
      </div>
    );
  };

  // Render execution view
  const renderExecutionView = () => (
    <div className="space-y-4">
      {/* MCP Connection Status */}
      {mcpRequestPending && (
        <div className="bg-purple-500/10 border border-purple-500/50 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Globe className="w-5 h-5 text-purple-400 animate-pulse" />
            <span className="font-medium text-purple-400">MCP Browser Control Active</span>
            <span className="px-2 py-0.5 bg-purple-500/20 text-purple-400 rounded text-xs">
              <span className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-pulse inline-block mr-1"></span>
              Chrome Extension
            </span>
          </div>
          <p className="text-sm text-slate-600">
            Claude is controlling your browser via the Chrome MCP extension.
            Watch the browser tab to see real-time automation.
          </p>
        </div>
      )}

      {/* Live Screenshots from MCP */}
      {liveScreenshots.length > 0 && (
        <div className="bg-white/50 border border-cyan-500/50 rounded-lg p-4">
          <h4 className="font-medium text-slate-900 mb-3 flex items-center gap-2">
            <Eye className="w-4 h-4 text-blue-600" />
            Live Browser View
          </h4>
          <div className="grid grid-cols-2 gap-2">
            {liveScreenshots.slice(-4).map((screenshot, i) => (
              <div key={screenshot.id} className="bg-slate-900 rounded overflow-hidden">
                <img
                  src={createScreenshotUrl(screenshot.data)}
                  alt={screenshot.description}
                  className="w-full h-32 object-cover"
                />
                <div className="p-2">
                  <div className="text-xs text-slate-600 truncate">{screenshot.description}</div>
                  <div className="text-xs text-slate-500">{new Date(screenshot.timestamp).toLocaleTimeString()}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Execution header */}
      <div className="bg-white/50 border border-cyan-500/50 rounded-lg p-4">
        <div className="flex items-center justify-between mb-4">
          <h4 className="font-medium text-slate-900 flex items-center gap-2">
            <RefreshCw className={`w-4 h-4 text-blue-600 ${isExecuting ? 'animate-spin' : ''}`} />
            {isExecuting ? 'Executing...' : 'Execution Paused'}
          </h4>
          {executionContext && (
            <span className="text-sm text-slate-600">
              Step {executionContext.current_step} of {executionContext.total_steps}
            </span>
          )}
        </div>

        {/* Progress bar */}
        {executionContext && (
          <div className="w-full bg-slate-100 rounded-full h-2 mb-4">
            <div
              className="bg-cyan-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(executionContext.current_step / executionContext.total_steps) * 100}%` }}
            />
          </div>
        )}

        {/* Status */}
        {executionContext && (
          <div className="flex items-center gap-2 text-sm">
            <span className={`px-2 py-0.5 rounded ${
              executionContext.status === ExecutionStatus.RUNNING ? 'bg-cyan-500/20 text-blue-600' :
              executionContext.status === ExecutionStatus.PAUSED_FOR_GATE ? 'bg-yellow-500/20 text-yellow-400' :
              executionContext.status === ExecutionStatus.STOPPED ? 'bg-red-500/20 text-red-400' :
              'bg-slate-100 text-slate-600'
            }`}>
              {executionContext.status}
            </span>
            {executionContext.current_domain && (
              <span className="text-slate-600">Domain: {executionContext.current_domain}</span>
            )}
          </div>
        )}
      </div>

      {/* GIA Gate Approval - The Human-in-the-Loop Moment */}
      {pendingGate && (
        <div className={`border-2 rounded-lg p-5 ${
          pendingGate.gate_type === MAIClassification.MANDATORY
            ? 'bg-red-50 border-red-400'
            : 'bg-yellow-50 border-yellow-400'
        }`}>
          {/* Gate Header with GIA context */}
          <div className="flex items-center gap-3 mb-4">
            {pendingGate.gate_type === MAIClassification.MANDATORY ? (
              <div className="p-2 bg-red-100 rounded-full">
                <ShieldAlert className="w-6 h-6 text-red-600" />
              </div>
            ) : (
              <div className="p-2 bg-yellow-100 rounded-full">
                <AlertTriangle className="w-6 h-6 text-yellow-600" />
              </div>
            )}
            <div>
              <div className="flex items-center gap-2">
                {renderMAIBadge(pendingGate.gate_type, true)}
                <span className="text-sm text-slate-500">GIA Gate Triggered</span>
              </div>
              <h4 className={`font-semibold ${
                pendingGate.gate_type === MAIClassification.MANDATORY ? 'text-red-800' : 'text-yellow-800'
              }`}>
                {pendingGate.gate_type === MAIClassification.MANDATORY
                  ? '🛑 EXECUTION STOPPED - Human Approval Required'
                  : '⚠️ Review Recommended Before Proceeding'}
              </h4>
            </div>
          </div>

          {/* Gate Details */}
          <div className="bg-white/70 rounded-lg p-3 mb-4 border border-slate-200">
            <p className="text-sm text-slate-800 mb-2"><strong>Action:</strong> {pendingGate.reason}</p>
            {pendingGate.action_type && (
              <p className="text-xs text-slate-600">Step Type: {pendingGate.action_type}</p>
            )}
            {pendingGate.target_domain && (
              <p className="text-xs text-slate-600">Domain: {pendingGate.target_domain}</p>
            )}
          </div>

          {/* GIA Compliance Notice */}
          <div className="flex items-center gap-2 mb-4 text-xs text-slate-600">
            <Shield className="w-3 h-3" />
            <span>
              This gate is enforced by the <strong>GIA Governance Layer</strong> •
              Decision will be logged for audit trail
            </span>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => handleGateApproval(true)}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-green-600 hover:bg-green-500 text-white rounded-lg font-medium transition-colors"
            >
              <Unlock className="w-4 h-4" />
              Approve & Continue
            </button>
            <button
              onClick={() => handleGateApproval(false)}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-red-600 hover:bg-red-500 text-white rounded-lg font-medium transition-colors"
            >
              <Lock className="w-4 h-4" />
              Reject & Stop
            </button>
          </div>
        </div>
      )}

      {/* Execution log */}
      {executionContext && (
        <div className="bg-white border border-slate-200 shadow-sm rounded-lg p-4">
          <h4 className="font-medium text-slate-900 mb-3 flex items-center gap-2">
            <Terminal className="w-4 h-4" />
            Execution Log
          </h4>
          <div className="max-h-64 overflow-y-auto space-y-1 font-mono text-xs">
            {executionContext.logs.map((log, i) => (
              <div key={i} className={`py-1 px-2 rounded ${
                log.status === 'success' ? 'text-green-400' :
                log.status === 'warning' ? 'text-yellow-400' :
                log.status === 'error' ? 'text-red-400' :
                log.status === 'gate' ? 'text-yellow-400 bg-yellow-500/10' :
                'text-slate-600'
              }`}>
                <span className="text-slate-500">{log.timestamp.split('T')[1]?.split('.')[0]}</span>
                {' '}[{log.step_id}] {log.message}
                {log.duration_ms && <span className="text-slate-500"> ({log.duration_ms}ms)</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Abort button */}
      {isExecuting && (
        <button
          onClick={handleAbort}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-500 text-slate-900 rounded-lg font-medium transition-colors"
        >
          <Square className="w-4 h-4" />
          Abort Execution
        </button>
      )}
    </div>
  );

  // Render results view with GIA audit summary
  const renderResultsView = () => {
    if (!executionResult) return null;

    return (
      <div className="space-y-4">
        {/* GIA Execution Summary */}
        <div className={`border-2 rounded-lg p-5 ${
          executionResult.success
            ? 'bg-green-50 border-green-400'
            : 'bg-red-50 border-red-400'
        }`}>
          <div className="flex items-center gap-4">
            {executionResult.success ? (
              <div className="p-3 bg-green-100 rounded-full">
                <CheckCircle2 className="w-8 h-8 text-green-600" />
              </div>
            ) : (
              <div className="p-3 bg-red-100 rounded-full">
                <XCircle className="w-8 h-8 text-red-600" />
              </div>
            )}
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-slate-900">
                {executionResult.success ? '✅ GIA Execution Complete' : '🛑 Execution Stopped by Governance'}
              </h3>
              <p className="text-sm text-slate-600">
                {executionResult.steps_completed}/{executionResult.total_steps} steps completed •
                {(executionResult.duration_ms / 1000).toFixed(1)}s duration •
                {executionResult.gates_triggered.length} gates triggered
              </p>
            </div>
          </div>

          {executionResult.stop_condition && (
            <div className="mt-4 p-3 bg-white/70 rounded-lg border border-yellow-300">
              <div className="flex items-center gap-2 text-yellow-700">
                <AlertTriangle className="w-4 h-4" />
                <span className="font-medium">Stop Condition Triggered:</span>
                <span className="text-slate-700">{executionResult.stop_condition.replace(/_/g, ' ')}</span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                The GIA Governance Layer detected this condition and stopped execution to protect the user.
              </p>
            </div>
          )}
        </div>

        {/* GIA Compliance Metrics */}
        <div className="bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-medium text-blue-900 mb-3 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5" />
            GIA Compliance Summary
          </h4>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="bg-white rounded-lg p-3 border border-blue-100">
              <div className="text-2xl font-bold text-blue-600">{executionResult.evidence.length}</div>
              <div className="text-xs text-slate-600">Evidence Items</div>
            </div>
            <div className="bg-white rounded-lg p-3 border border-yellow-100">
              <div className="text-2xl font-bold text-yellow-600">{executionResult.gates_triggered.length}</div>
              <div className="text-xs text-slate-600">Gates Triggered</div>
            </div>
            <div className="bg-white rounded-lg p-3 border border-green-100">
              <div className="text-2xl font-bold text-green-600">
                {executionResult.gates_triggered.filter(g => g.status === 'APPROVED').length}
              </div>
              <div className="text-xs text-slate-600">Human Approvals</div>
            </div>
          </div>
        </div>

        {/* GIA Evidence Package - Audit Trail */}
        <div className="bg-white border border-slate-200 shadow-sm rounded-lg p-4">
          <h4 className="font-medium text-slate-900 mb-3 flex items-center gap-2">
            <Image className="w-4 h-4 text-purple-600" />
            GIA Evidence Package
            <span className="ml-auto text-xs text-slate-500">{executionResult.evidence.length} items captured</span>
          </h4>

          {/* Hash Verification - Critical for Audit */}
          <div className="bg-slate-50 rounded-lg p-3 mb-3 border border-slate-200">
            <div className="text-xs text-slate-500 mb-2">🔐 Tamper-Proof Evidence Chain</div>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <Hash className="w-4 h-4 text-blue-600" />
                <span className="text-slate-600">Evidence Hash:</span>
                <code className="text-blue-700 bg-blue-50 px-2 py-0.5 rounded text-xs font-mono border border-blue-200">
                  {executionResult.evidence_package_hash.substring(0, 40)}...
                </code>
              </div>
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-green-600" />
                <span className="text-slate-600">Governance Policy:</span>
                <code className="text-green-700 bg-green-50 px-2 py-0.5 rounded text-xs font-mono border border-green-200">
                  {executionResult.pack_id} v{executionResult.pack_version}
                </code>
              </div>
            </div>
            <p className="text-xs text-slate-400 mt-2">
              Hash-verified evidence chain enables compliance auditing (NIST AU-9, EU AI Act Art. 12)
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {/* Show real screenshots from MCP if available, otherwise show placeholders */}
            {liveScreenshots.length > 0 ? (
              liveScreenshots.map((screenshot, i) => (
                <div key={screenshot.id} className="bg-slate-900 rounded p-2">
                  <div className="aspect-video bg-white rounded overflow-hidden mb-2">
                    <img
                      src={createScreenshotUrl(screenshot.data)}
                      alt={screenshot.description}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="text-xs text-slate-600 truncate">{screenshot.description}</div>
                  <div className="text-xs text-green-500 truncate">
                    <CheckCircle2 className="w-3 h-3 inline mr-1" />
                    Real screenshot
                  </div>
                </div>
              ))
            ) : (
              executionResult.evidence.map((evd, i) => (
                <div key={i} className="bg-slate-900 rounded p-2">
                  <div className="aspect-video bg-white rounded flex items-center justify-center text-slate-500 mb-2">
                    {(evd as any)._screenshotData ? (
                      <img
                        src={createScreenshotUrl((evd as any)._screenshotData)}
                        alt={evd.description}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Image className="w-6 h-6" />
                    )}
                  </div>
                  <div className="text-xs text-slate-600 truncate">{evd.description}</div>
                  <div className="text-xs text-slate-500 truncate">{evd.hash.substring(0, 20)}...</div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Captured data */}
        {Object.keys(executionResult.captured_data).length > 0 && (
          <div className="bg-white border border-slate-200 shadow-sm rounded-lg p-4">
            <h4 className="font-medium text-slate-900 mb-3 flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Captured Data
            </h4>

            <div className="space-y-2">
              {Object.entries(executionResult.captured_data).map(([key, value]) => (
                <div key={key} className="bg-slate-900 rounded p-3">
                  <div className="text-sm font-medium text-blue-600 mb-1">{key}</div>
                  <pre className="text-xs text-slate-700 overflow-x-auto whitespace-pre-wrap max-h-32">
                    {typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)}
                  </pre>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Gates triggered - Enhanced for audit clarity */}
        {executionResult.gates_triggered.length > 0 && (
          <div className="bg-white border border-slate-200 shadow-sm rounded-lg p-4">
            <h4 className="font-medium text-slate-900 mb-3 flex items-center gap-2">
              <Lock className="w-4 h-4" />
              Gates Triggered ({executionResult.gates_triggered.length})
            </h4>

            <div className="space-y-3">
              {executionResult.gates_triggered.map((gate, i) => (
                <div key={i} className="bg-slate-900/50 rounded-lg p-3 border border-slate-200">
                  {/* Gate header */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {renderMAIBadge(gate.gate_type)}
                      <span className="text-xs text-slate-500">Step: {gate.step_id}</span>
                      {gate.action_type && (
                        <span className="px-1.5 py-0.5 bg-purple-500/20 text-purple-400 rounded text-xs">
                          {gate.action_type}
                        </span>
                      )}
                    </div>
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                      gate.status === 'APPROVED'
                        ? 'bg-green-500/20 text-green-400'
                        : 'bg-red-500/20 text-red-400'
                    }`}>
                      {gate.status}
                    </span>
                  </div>

                  {/* Rationale - why this gate exists */}
                  {gate.rationale && (
                    <div className="text-sm text-slate-700 mb-2">
                      <span className="text-slate-500">Reason:</span> {gate.rationale}
                    </div>
                  )}

                  {/* Risk factors */}
                  {gate.risk_factors && gate.risk_factors.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-2">
                      {gate.risk_factors.map((risk, j) => (
                        <span key={j} className="px-1.5 py-0.5 bg-yellow-500/10 text-yellow-400 rounded text-xs">
                          {risk}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Approval metadata */}
                  <div className="flex items-center gap-4 text-xs text-slate-500">
                    {gate.target_domain && (
                      <span>Domain: {gate.target_domain}</span>
                    )}
                    {gate.approved_at && (
                      <span>Approved: {new Date(gate.approved_at).toLocaleTimeString()}</span>
                    )}
                    {gate.approved_by && (
                      <span>By: {gate.approved_by}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setViewMode('packs')}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors"
          >
            ← Back to Packs
          </button>

          <button
            className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white rounded-lg font-medium transition-colors ml-auto shadow-lg"
          >
            <Download className="w-4 h-4" />
            Export GIA Evidence Bundle
          </button>
        </div>

        {/* GIA Compliance Footer */}
        <div className="text-center text-xs text-slate-400 pt-4 border-t border-slate-200">
          <p>
            <strong>GIA</strong> • Governed Intelligence Architecture •
            Controlled Intelligence, Responsible Action
          </p>
          <p className="mt-1">
            Compliant: NIST 800-53 (AU-2, AU-3, AC-6) • EU AI Act Art. 14 • ISO 31000
          </p>
        </div>
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col bg-slate-50">
      {/* Header - GIA Branding */}
      <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-white">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
              GIA Browser Automation
              <span className="text-xs font-normal text-slate-500">Governed Intelligence Architecture</span>
            </h2>
            <p className="text-sm text-slate-500 flex items-center gap-2">
              <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">Governance</span>
              <span className="text-slate-300">→</span>
              <span className="px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded text-xs">Execution</span>
              <span className="text-slate-300">→</span>
              <span className="px-1.5 py-0.5 bg-green-100 text-green-700 rounded text-xs">Profile</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* MAI Legend */}
          <div className="flex items-center gap-1 text-xs mr-3">
            <span className="px-1.5 py-0.5 bg-blue-500/20 text-blue-600 rounded font-medium">I</span>
            <span className="px-1.5 py-0.5 bg-yellow-500/20 text-yellow-600 rounded font-medium">A</span>
            <span className="px-1.5 py-0.5 bg-red-500/20 text-red-600 rounded font-medium">M</span>
            <span className="text-slate-400 ml-1">MAI</span>
          </div>
          <span className="px-3 py-1.5 bg-green-100 text-green-700 rounded-full text-xs font-medium">
            V1 Read-Only
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {viewMode === 'packs' && renderPacksView()}
        {viewMode === 'custom' && renderCustomView()}
        {viewMode === 'plan' && renderPlanView()}
        {viewMode === 'execution' && renderExecutionView()}
        {viewMode === 'results' && renderResultsView()}
        {viewMode === 'multi-tab' && (
          <div className="space-y-4">
            <button
              onClick={() => setViewMode('packs')}
              className="px-4 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg transition-colors text-sm"
            >
              ← Back to Packs
            </button>
            <MultiTabDashboard
              onExecutePlan={(plan) => {
                console.log('[ACE] Multi-tab plan requested:', plan.name);
                console.log('[ACE] Sources:', plan.sources.map(s => s.url));
              }}
              onCaptureAll={() => {
                console.log('[ACE] Capture all tabs requested');
              }}
              onExecuteBundle={async (bundle) => {
                console.log('[ACE] Bundle execution requested:', bundle.name);
                console.log('[ACE] Tabs:', bundle.tabs.map(t => `${t.name} (${t.domain})`));
                console.log('[ACE] Workflow steps:', bundle.workflow.steps.length);

                // Emit MCP execution request for Bundle Pack
                mcpBridge.emit('execution:request', {
                  type: 'bundle',
                  bundleId: bundle.id,
                  bundleName: bundle.name,
                  tabs: bundle.tabs.map(t => ({
                    id: t.id,
                    name: t.name,
                    role: t.role,
                    startUrl: t.startUrl,
                    domain: t.domain
                  })),
                  workflow: bundle.workflow,
                  governance: bundle.governance,
                  message: `Execute Bundle Pack: ${bundle.name} - Opening ${bundle.tabs.length} coordinated tabs`
                });
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}

export default BrowserAutomationPanel;
