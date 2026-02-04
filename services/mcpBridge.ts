/**
 * MCP Bridge - Connects ACE UI to Claude's MCP Browser Tools
 *
 * This module provides a way for the ACE React components to
 * communicate with Claude's MCP tools for real browser automation.
 *
 * HOW IT WORKS:
 * 1. When user clicks "Execute Plan" in ACE panel
 * 2. The panel emits an event with the pack details
 * 3. Claude (via conversation) receives this and uses MCP tools
 * 4. Real screenshots are captured and sent back to the panel
 * 5. User sees the actual browser being controlled
 *
 * This creates a human-in-the-loop where Claude orchestrates
 * the browser while ACE governance controls what's allowed.
 */

import { InstructionPack, EvidenceRecord, StopConditionType } from './browserAutomationAgent';
import { BundlePack, TabConfig, WorkflowDefinition, BundleGovernance, WorkflowStep } from './bundlePacks';

// ============================================================================
// EVENT-BASED BRIDGE
// ============================================================================

export interface MCPExecutionRequest {
  requestId: string;
  pack: InstructionPack;
  params: Record<string, string>;
  timestamp: string;
}

export interface MCPBundleExecutionRequest {
  requestId: string;
  type: 'bundle';
  bundleId: string;
  bundleName: string;
  tabs: Array<{
    id: string;
    name: string;
    role: string;
    startUrl: string;
    domain: string;
  }>;
  workflow: WorkflowDefinition;
  governance: BundleGovernance;
  timestamp: string;
}

export interface BundleTabState {
  tabId: string;
  browserTabId: number | null;
  status: 'pending' | 'navigating' | 'ready' | 'extracting' | 'done' | 'error';
  screenshot?: string;
  extractedData?: Record<string, any>;
  url?: string;
  title?: string;
}

export interface MCPExecutionUpdate {
  requestId: string;
  type: 'progress' | 'evidence' | 'gate' | 'stopped' | 'complete' | 'error';
  stepIndex?: number;
  totalSteps?: number;
  evidence?: EvidenceRecord & { screenshotData?: string };
  gateRequest?: {
    stepId: string;
    reason: string;
    sensitivity: string;
  };
  stopCondition?: StopConditionType;
  error?: string;
  message?: string;
}

// Global event bus for MCP communication
class MCPEventBus {
  private listeners: Map<string, Set<(data: any) => void>> = new Map();
  private pendingRequests: Map<string, MCPExecutionRequest> = new Map();
  private pendingBundleRequests: Map<string, MCPBundleExecutionRequest> = new Map();
  private bundleTabStates: Map<string, Map<string, BundleTabState>> = new Map();

  /**
   * Emit an event
   */
  emit(event: string, data: any) {
    const handlers = this.listeners.get(event);
    if (handlers) {
      handlers.forEach(handler => handler(data));
    }
  }

  /**
   * Subscribe to an event
   */
  on(event: string, handler: (data: any) => void): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(handler);

    // Return unsubscribe function
    return () => {
      this.listeners.get(event)?.delete(handler);
    };
  }

  /**
   * Request MCP execution
   * Returns a promise that resolves when execution completes
   */
  requestExecution(pack: InstructionPack, params: Record<string, string>): string {
    const requestId = `mcp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const request: MCPExecutionRequest = {
      requestId,
      pack,
      params,
      timestamp: new Date().toISOString()
    };

    this.pendingRequests.set(requestId, request);
    this.emit('execution-request', request);

    // Also store in window for Claude to access
    (window as any).__aceMCPRequest = request;

    console.log('[MCP Bridge] Execution requested:', requestId);
    console.log('[MCP Bridge] Pack:', pack.name);
    console.log('[MCP Bridge] To execute, Claude should use the Chrome MCP tools');

    return requestId;
  }

  /**
   * Send update from execution
   */
  sendUpdate(update: MCPExecutionUpdate) {
    this.emit('execution-update', update);
    console.log('[MCP Bridge] Update:', update.type, update.message || '');
  }

  /**
   * Get pending request
   */
  getPendingRequest(requestId: string): MCPExecutionRequest | undefined {
    return this.pendingRequests.get(requestId);
  }

  /**
   * Get current pending request (for Claude to read)
   */
  getCurrentRequest(): MCPExecutionRequest | null {
    return (window as any).__aceMCPRequest || null;
  }

  /**
   * Clear pending request
   */
  clearRequest(requestId: string) {
    this.pendingRequests.delete(requestId);
    if ((window as any).__aceMCPRequest?.requestId === requestId) {
      delete (window as any).__aceMCPRequest;
    }
  }

  /**
   * Request Bundle execution
   * Opens multiple tabs and coordinates them according to workflow
   */
  requestBundleExecution(bundle: BundlePack): string {
    const requestId = `bundle-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const request: MCPBundleExecutionRequest = {
      requestId,
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
      timestamp: new Date().toISOString()
    };

    this.pendingBundleRequests.set(requestId, request);

    // Initialize tab states
    const tabStates = new Map<string, BundleTabState>();
    bundle.tabs.forEach(tab => {
      tabStates.set(tab.id, {
        tabId: tab.id,
        browserTabId: null,
        status: 'pending'
      });
    });
    this.bundleTabStates.set(requestId, tabStates);

    this.emit('bundle-execution-request', request);

    // Store in window for Claude to access
    (window as any).__aceBundleRequest = request;

    console.log('[MCP Bridge] Bundle execution requested:', requestId);
    console.log('[MCP Bridge] Bundle:', bundle.name);
    console.log('[MCP Bridge] Tabs:', bundle.tabs.map(t => t.name).join(', '));
    console.log('[MCP Bridge] Workflow steps:', bundle.workflow.steps.length);

    return requestId;
  }

  /**
   * Update bundle tab state
   */
  updateBundleTabState(requestId: string, tabId: string, state: Partial<BundleTabState>) {
    const tabStates = this.bundleTabStates.get(requestId);
    if (tabStates && tabStates.has(tabId)) {
      const current = tabStates.get(tabId)!;
      tabStates.set(tabId, { ...current, ...state });
      this.emit('bundle-tab-update', { requestId, tabId, state: tabStates.get(tabId) });
    }
  }

  /**
   * Get current bundle tab states
   */
  getBundleTabStates(requestId: string): Map<string, BundleTabState> | undefined {
    return this.bundleTabStates.get(requestId);
  }

  /**
   * Get current pending bundle request (for Claude to read)
   */
  getCurrentBundleRequest(): MCPBundleExecutionRequest | null {
    return (window as any).__aceBundleRequest || null;
  }

  /**
   * Clear bundle request
   */
  clearBundleRequest(requestId: string) {
    this.pendingBundleRequests.delete(requestId);
    this.bundleTabStates.delete(requestId);
    if ((window as any).__aceBundleRequest?.requestId === requestId) {
      delete (window as any).__aceBundleRequest;
    }
  }
}

// Export singleton
export const mcpBridge = new MCPEventBus();

// ============================================================================
// REACT HOOK FOR COMPONENTS
// ============================================================================

import { useState, useEffect, useCallback } from 'react';

export function useMCPExecution() {
  const [isExecuting, setIsExecuting] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [totalSteps, setTotalSteps] = useState(0);
  const [evidence, setEvidence] = useState<(EvidenceRecord & { screenshotData?: string })[]>([]);
  const [pendingGate, setPendingGate] = useState<MCPExecutionUpdate['gateRequest'] | null>(null);
  const [stopCondition, setStopCondition] = useState<StopConditionType | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [requestId, setRequestId] = useState<string | null>(null);

  // Subscribe to updates
  useEffect(() => {
    const unsubscribe = mcpBridge.on('execution-update', (update: MCPExecutionUpdate) => {
      if (requestId && update.requestId !== requestId) return;

      switch (update.type) {
        case 'progress':
          setCurrentStep(update.stepIndex || 0);
          setTotalSteps(update.totalSteps || 0);
          break;

        case 'evidence':
          if (update.evidence) {
            setEvidence(prev => [...prev, update.evidence!]);
          }
          break;

        case 'gate':
          if (update.gateRequest) {
            setPendingGate(update.gateRequest);
          }
          break;

        case 'stopped':
          setStopCondition(update.stopCondition || null);
          setIsExecuting(false);
          break;

        case 'complete':
          setIsExecuting(false);
          break;

        case 'error':
          setError(update.error || 'Unknown error');
          setIsExecuting(false);
          break;
      }
    });

    return unsubscribe;
  }, [requestId]);

  // Start execution
  const startExecution = useCallback((pack: InstructionPack, params: Record<string, string>) => {
    setIsExecuting(true);
    setCurrentStep(0);
    setTotalSteps(pack.steps.length);
    setEvidence([]);
    setPendingGate(null);
    setStopCondition(null);
    setError(null);

    const id = mcpBridge.requestExecution(pack, params);
    setRequestId(id);

    return id;
  }, []);

  // Respond to gate
  const respondToGate = useCallback((approved: boolean) => {
    if (requestId) {
      mcpBridge.emit('gate-response', { requestId, approved });
    }
    setPendingGate(null);
  }, [requestId]);

  // Abort execution
  const abortExecution = useCallback(() => {
    if (requestId) {
      mcpBridge.emit('abort-execution', { requestId });
      mcpBridge.clearRequest(requestId);
    }
    setIsExecuting(false);
  }, [requestId]);

  return {
    isExecuting,
    currentStep,
    totalSteps,
    evidence,
    pendingGate,
    stopCondition,
    error,
    startExecution,
    respondToGate,
    abortExecution
  };
}

// ============================================================================
// HOOK FOR BUNDLE EXECUTION
// ============================================================================

export function useBundleExecution() {
  const [isExecuting, setIsExecuting] = useState(false);
  const [requestId, setRequestId] = useState<string | null>(null);
  const [tabStates, setTabStates] = useState<Map<string, BundleTabState>>(new Map());
  const [currentStep, setCurrentStep] = useState<string | null>(null);
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);
  const [collectedData, setCollectedData] = useState<Map<string, any>>(new Map());
  const [error, setError] = useState<string | null>(null);

  // Subscribe to tab updates
  useEffect(() => {
    const unsubscribe = mcpBridge.on('bundle-tab-update', (update: { requestId: string; tabId: string; state: BundleTabState }) => {
      if (requestId && update.requestId !== requestId) return;
      setTabStates(prev => {
        const newMap = new Map(prev);
        newMap.set(update.tabId, update.state);
        return newMap;
      });
    });

    return unsubscribe;
  }, [requestId]);

  // Subscribe to step completion
  useEffect(() => {
    const unsubscribe = mcpBridge.on('bundle-step-complete', (update: { requestId: string; stepId: string; data?: any }) => {
      if (requestId && update.requestId !== requestId) return;
      setCompletedSteps(prev => [...prev, update.stepId]);
      if (update.data) {
        setCollectedData(prev => {
          const newMap = new Map(prev);
          newMap.set(update.stepId, update.data);
          return newMap;
        });
      }
    });

    return unsubscribe;
  }, [requestId]);

  // Subscribe to execution complete
  useEffect(() => {
    const unsubscribe = mcpBridge.on('bundle-execution-complete', (update: { requestId: string }) => {
      if (requestId && update.requestId !== requestId) return;
      setIsExecuting(false);
    });

    return unsubscribe;
  }, [requestId]);

  // Start bundle execution
  const startBundleExecution = useCallback((bundle: BundlePack) => {
    setIsExecuting(true);
    setTabStates(new Map());
    setCurrentStep(null);
    setCompletedSteps([]);
    setCollectedData(new Map());
    setError(null);

    const id = mcpBridge.requestBundleExecution(bundle);
    setRequestId(id);

    return id;
  }, []);

  // Abort execution
  const abortExecution = useCallback(() => {
    if (requestId) {
      mcpBridge.emit('abort-bundle-execution', { requestId });
      mcpBridge.clearBundleRequest(requestId);
    }
    setIsExecuting(false);
  }, [requestId]);

  return {
    isExecuting,
    requestId,
    tabStates,
    currentStep,
    completedSteps,
    collectedData,
    error,
    startBundleExecution,
    abortExecution
  };
}

// ============================================================================
// HELPER FOR DISPLAYING SCREENSHOTS
// ============================================================================

export function createScreenshotUrl(base64Data: string): string {
  if (base64Data.startsWith('data:')) {
    return base64Data;
  }
  return `data:image/png;base64,${base64Data}`;
}
