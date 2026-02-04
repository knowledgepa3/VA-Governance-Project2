/**
 * ACE Case Manager - Client Case Tracking & Management
 *
 * ENTERPRISE-GRADE DATA SEPARATION:
 * This service implements a two-layer data model to protect PHI/PII:
 *
 * 1. CASE SHELL (persisted to localStorage) - Safe metadata only
 *    - caseId, status, priority, timestamps
 *    - claimType (category, not identifying)
 *    - workflow stage, bundle run history
 *    - hashes/manifests (non-sensitive)
 *    - repository pointers (when enterprise mode enabled)
 *
 * 2. SENSITIVE PROFILE (session memory only) - PHI/PII
 *    - clientName, clientEmail, clientPhone
 *    - conditions (can be identifying)
 *    - servicePeriod, deployments (identifying)
 *    - notes (often contains PHI)
 *    - communicationLog content
 *
 * STORAGE MODES:
 * - PROTOTYPE: Shell persisted, Profile session-only (clears on refresh)
 * - ENTERPRISE: Shell persisted, Profile in secure vault or BYOR repository
 *
 * CASE FLOW:
 * 1. INTAKE    - Case created with shell + profile
 * 2. RESEARCH  - Bundle packs run, evidence gathered
 * 3. REVIEW    - Human reviews evidence before delivery
 * 4. COMPLETE  - Evidence delivered to client
 */

import { BundlePack, BUNDLE_PACKS } from './bundlePacks';
import { ExecutionResult, EvidenceRecord } from './browserAutomationAgent';

// ============================================================================
// STORAGE MODE CONFIGURATION
// ============================================================================

export type StorageMode = 'prototype' | 'enterprise';

export interface StorageConfig {
  mode: StorageMode;
  // Enterprise mode settings (future)
  vaultEndpoint?: string;
  repositoryProvider?: 'egnyte' | 'box' | 'sharepoint' | 'custom';
  repositoryPath?: string;
}

// Default to prototype mode
const DEFAULT_STORAGE_CONFIG: StorageConfig = {
  mode: 'prototype'
};

// ============================================================================
// TYPES - SPLIT INTO SHELL vs SENSITIVE
// ============================================================================

export type ClaimType =
  | 'va-disability-ptsd'
  | 'va-disability-tbi'
  | 'va-disability-mst'
  | 'va-disability-musculoskeletal'
  | 'va-disability-hearing'
  | 'va-disability-respiratory'
  | 'va-disability-other'
  | 'tdiu'
  | 'dic'
  | 'appeals'
  | 'increase'
  | 'secondary';

export type CaseStatus =
  | 'new'           // Just created, no research yet
  | 'researching'   // Bundle packs running
  | 'evidence-ready' // Research complete, evidence gathered
  | 'review'        // Human reviewing before delivery
  | 'complete'      // Delivered to client
  | 'on-hold';      // Paused for some reason

export type CasePriority = 'low' | 'normal' | 'high' | 'urgent';

/**
 * CASE SHELL - Safe to persist in localStorage
 * Contains only non-identifying metadata
 */
export interface CaseShell {
  id: string;

  // Non-identifying metadata
  caseAlias: string;              // e.g., "CASE-2026-001" (not client name)
  claimType: ClaimType;           // Category only
  conditionCount: number;         // Count, not the conditions themselves

  // Status tracking
  status: CaseStatus;
  priority: CasePriority;
  workflowStage?: string;

  // Research & Evidence (references only)
  bundleRuns: BundleRun[];
  evidencePackageIds: string[];   // Just IDs, not content
  evidenceHashes: string[];       // Integrity hashes

  // Timestamps (non-identifying)
  createdAt: string;
  updatedAt: string;
  completedAt?: string;

  // Communication log (counts only, not content)
  communicationCount: number;
  lastContactedAt?: string;

  // Enterprise mode: repository pointers
  repositoryFolder?: string;      // e.g., "/clients/CASE-2026-001"
  profileFileRef?: string;        // e.g., "profile.encrypted.json"

  // Data mode indicator
  hasSessionProfile: boolean;     // True if sensitive data exists in memory
}

/**
 * SENSITIVE PROFILE - Session memory only (never persisted in prototype mode)
 * Contains all PHI/PII that requires protection
 */
export interface SensitiveProfile {
  caseId: string;                 // Links to CaseShell

  // Client PII
  clientName: string;
  clientEmail: string;
  clientPhone?: string;

  // Health-related (PHI)
  conditions: string[];           // Specific conditions
  servicePeriod?: {
    start: string;
    end: string;
  };
  deployments?: string[];

  // Notes (often contains PHI)
  notes: string;

  // Communication content
  communicationLog: CommunicationEntry[];

  // Metadata
  loadedAt: string;               // When profile was loaded into session
  isDirty: boolean;               // Has unsaved changes
}

/**
 * FULL CASE - Combined view (shell + profile)
 * This is what the UI works with
 */
export interface Case extends CaseShell {
  // Sensitive fields (from profile, may be undefined if not loaded)
  clientName: string;
  clientEmail: string;
  clientPhone?: string;
  conditions: string[];
  servicePeriod?: { start: string; end: string };
  deployments?: string[];
  notes: string;
  communicationLog: CommunicationEntry[];
}

export interface BundleRun {
  id: string;
  bundleId: string;
  bundleName: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'stopped';
  startedAt: string;
  completedAt?: string;
  result?: ExecutionResult;
  evidenceCount: number;
  notes?: string;
}

export interface CaseEvidencePackage {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  bundleRunIds: string[];
  evidenceItems: EvidenceRecord[];
  packageHash: string;
  exported: boolean;
  exportedAt?: string;
}

export interface CommunicationEntry {
  id: string;
  timestamp: string;
  type: 'email' | 'phone' | 'note' | 'system';
  direction: 'inbound' | 'outbound' | 'internal';
  subject?: string;
  content: string;
  attachments?: string[];
}

// ============================================================================
// CLAIM TYPE MAPPINGS
// ============================================================================

export const CLAIM_TYPE_LABELS: Record<ClaimType, string> = {
  'va-disability-ptsd': 'VA Disability - PTSD',
  'va-disability-tbi': 'VA Disability - TBI',
  'va-disability-mst': 'VA Disability - MST',
  'va-disability-musculoskeletal': 'VA Disability - Musculoskeletal',
  'va-disability-hearing': 'VA Disability - Hearing Loss',
  'va-disability-respiratory': 'VA Disability - Respiratory',
  'va-disability-other': 'VA Disability - Other',
  'tdiu': 'Total Disability (TDIU)',
  'dic': 'Dependency & Indemnity (DIC)',
  'appeals': 'Appeals',
  'increase': 'Rating Increase',
  'secondary': 'Secondary Condition'
};

export const CLAIM_TYPE_BUNDLES: Record<ClaimType, string[]> = {
  'va-disability-ptsd': ['va-claims-research-bundle'],
  'va-disability-tbi': ['va-claims-research-bundle'],
  'va-disability-mst': ['va-claims-research-bundle'],
  'va-disability-musculoskeletal': ['va-claims-research-bundle'],
  'va-disability-hearing': ['va-claims-research-bundle'],
  'va-disability-respiratory': ['va-claims-research-bundle'],
  'va-disability-other': ['va-claims-research-bundle'],
  'tdiu': ['va-claims-research-bundle'],
  'dic': ['va-claims-research-bundle'],
  'appeals': ['va-claims-research-bundle'],
  'increase': ['va-claims-research-bundle'],
  'secondary': ['va-claims-research-bundle']
};

// ============================================================================
// CASE MANAGER CLASS - ENTERPRISE-GRADE
// ============================================================================

const STORAGE_KEY = 'ace_case_shells';  // Only shells persisted
const CONFIG_KEY = 'ace_case_config';

class CaseManagerService {
  // Persisted: case shells only
  private shells: Map<string, CaseShell> = new Map();

  // Session memory: sensitive profiles (cleared on refresh in prototype mode)
  private profiles: Map<string, SensitiveProfile> = new Map();

  // Configuration
  private config: StorageConfig = DEFAULT_STORAGE_CONFIG;

  // Listeners
  private listeners: Set<(cases: Case[]) => void> = new Set();

  // Case counter for alias generation
  private caseCounter: number = 0;

  constructor() {
    this.loadConfig();
    this.loadShellsFromStorage();
    console.log(`[CaseManager] Initialized in ${this.config.mode.toUpperCase()} mode`);
    console.log(`[CaseManager] ⚠️ Sensitive profiles are SESSION-ONLY (cleared on refresh)`);
  }

  // ---------------------------------------------------------------------------
  // CONFIGURATION
  // ---------------------------------------------------------------------------

  getStorageMode(): StorageMode {
    return this.config.mode;
  }

  setStorageMode(mode: StorageMode): void {
    this.config.mode = mode;
    this.saveConfig();
    console.log(`[CaseManager] Storage mode changed to: ${mode}`);
  }

  isEnterpriseMode(): boolean {
    return this.config.mode === 'enterprise';
  }

  private loadConfig(): void {
    try {
      const stored = localStorage.getItem(CONFIG_KEY);
      if (stored) {
        this.config = { ...DEFAULT_STORAGE_CONFIG, ...JSON.parse(stored) };
      }
    } catch (error) {
      console.warn('[CaseManager] Failed to load config, using defaults');
    }
  }

  private saveConfig(): void {
    try {
      localStorage.setItem(CONFIG_KEY, JSON.stringify(this.config));
    } catch (error) {
      console.error('[CaseManager] Failed to save config:', error);
    }
  }

  // ---------------------------------------------------------------------------
  // PERSISTENCE (SHELLS ONLY)
  // ---------------------------------------------------------------------------

  private loadShellsFromStorage(): void {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const shellsArray: CaseShell[] = JSON.parse(stored);
        shellsArray.forEach(shell => {
          // Mark that profile is not loaded
          shell.hasSessionProfile = false;
          this.shells.set(shell.id, shell);
        });

        // Update case counter
        const maxNumber = shellsArray.reduce((max, shell) => {
          const match = shell.caseAlias.match(/CASE-\d{4}-(\d+)/);
          return match ? Math.max(max, parseInt(match[1], 10)) : max;
        }, 0);
        this.caseCounter = maxNumber;

        console.log(`[CaseManager] Loaded ${shellsArray.length} case shells from storage`);
        console.log(`[CaseManager] ℹ️ Sensitive profiles must be re-entered (session-only)`);
      }
    } catch (error) {
      console.error('[CaseManager] Failed to load shells from storage:', error);
    }
  }

  private saveShellsToStorage(): void {
    try {
      const shellsArray = Array.from(this.shells.values());
      localStorage.setItem(STORAGE_KEY, JSON.stringify(shellsArray));
    } catch (error) {
      console.error('[CaseManager] Failed to save shells to storage:', error);
    }
  }

  private notifyListeners(): void {
    const cases = this.getAllCases();
    this.listeners.forEach(listener => listener(cases));
  }

  // ---------------------------------------------------------------------------
  // ALIAS GENERATION
  // ---------------------------------------------------------------------------

  private generateCaseAlias(): string {
    this.caseCounter++;
    const year = new Date().getFullYear();
    const number = this.caseCounter.toString().padStart(3, '0');
    return `CASE-${year}-${number}`;
  }

  // ---------------------------------------------------------------------------
  // SUBSCRIPTIONS
  // ---------------------------------------------------------------------------

  subscribe(listener: (cases: Case[]) => void): () => void {
    this.listeners.add(listener);
    listener(this.getAllCases());
    return () => this.listeners.delete(listener);
  }

  // ---------------------------------------------------------------------------
  // CASE CREATION
  // ---------------------------------------------------------------------------

  createCase(input: {
    clientName: string;
    clientEmail: string;
    clientPhone?: string;
    claimType: ClaimType;
    conditions?: string[];
    servicePeriod?: { start: string; end: string };
    deployments?: string[];
    notes?: string;
    priority?: CasePriority;
  }): Case {
    const id = `case-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();
    const alias = this.generateCaseAlias();

    // Create SHELL (persisted)
    const shell: CaseShell = {
      id,
      caseAlias: alias,
      claimType: input.claimType,
      conditionCount: input.conditions?.length || 0,
      status: 'new',
      priority: input.priority || 'normal',
      bundleRuns: [],
      evidencePackageIds: [],
      evidenceHashes: [],
      createdAt: now,
      updatedAt: now,
      communicationCount: 1,  // Initial system message
      hasSessionProfile: true
    };

    // Create SENSITIVE PROFILE (session-only)
    const profile: SensitiveProfile = {
      caseId: id,
      clientName: input.clientName,
      clientEmail: input.clientEmail,
      clientPhone: input.clientPhone,
      conditions: input.conditions || [],
      servicePeriod: input.servicePeriod,
      deployments: input.deployments,
      notes: input.notes || '',
      communicationLog: [{
        id: `comm-${Date.now()}`,
        timestamp: now,
        type: 'system',
        direction: 'internal',
        content: `Case ${alias} created - ${CLAIM_TYPE_LABELS[input.claimType]}`
      }],
      loadedAt: now,
      isDirty: false
    };

    // Store
    this.shells.set(id, shell);
    this.profiles.set(id, profile);

    // Persist shell only
    this.saveShellsToStorage();
    this.notifyListeners();

    console.log(`[CaseManager] Created case ${alias} (${id})`);
    console.log(`[CaseManager] ⚠️ Sensitive profile is SESSION-ONLY - will be lost on refresh`);

    return this.combineShellAndProfile(shell, profile);
  }

  // ---------------------------------------------------------------------------
  // CASE RETRIEVAL
  // ---------------------------------------------------------------------------

  getCase(id: string): Case | undefined {
    const shell = this.shells.get(id);
    if (!shell) return undefined;

    const profile = this.profiles.get(id);
    return this.combineShellAndProfile(shell, profile);
  }

  getCaseShell(id: string): CaseShell | undefined {
    return this.shells.get(id);
  }

  getProfile(id: string): SensitiveProfile | undefined {
    return this.profiles.get(id);
  }

  hasProfile(id: string): boolean {
    return this.profiles.has(id);
  }

  getAllCases(): Case[] {
    return Array.from(this.shells.values())
      .map(shell => {
        const profile = this.profiles.get(shell.id);
        return this.combineShellAndProfile(shell, profile);
      })
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }

  getCasesByStatus(status: CaseStatus): Case[] {
    return this.getAllCases().filter(c => c.status === status);
  }

  getCasesByPriority(priority: CasePriority): Case[] {
    return this.getAllCases().filter(c => c.priority === priority);
  }

  // ---------------------------------------------------------------------------
  // COMBINE SHELL + PROFILE
  // ---------------------------------------------------------------------------

  private combineShellAndProfile(shell: CaseShell, profile?: SensitiveProfile): Case {
    if (profile) {
      return {
        ...shell,
        clientName: profile.clientName,
        clientEmail: profile.clientEmail,
        clientPhone: profile.clientPhone,
        conditions: profile.conditions,
        servicePeriod: profile.servicePeriod,
        deployments: profile.deployments,
        notes: profile.notes,
        communicationLog: profile.communicationLog,
        hasSessionProfile: true
      };
    }

    // Shell only - no profile loaded
    return {
      ...shell,
      clientName: `[Profile not loaded - ${shell.caseAlias}]`,
      clientEmail: '[Session data cleared]',
      clientPhone: undefined,
      conditions: [],
      servicePeriod: undefined,
      deployments: undefined,
      notes: '',
      communicationLog: [],
      hasSessionProfile: false
    };
  }

  // ---------------------------------------------------------------------------
  // CASE UPDATES
  // ---------------------------------------------------------------------------

  updateCase(id: string, updates: Partial<Case>): Case | undefined {
    const shell = this.shells.get(id);
    if (!shell) return undefined;

    const now = new Date().toISOString();

    // Update shell fields
    const shellUpdates: Partial<CaseShell> = {
      updatedAt: now
    };

    if (updates.status !== undefined) shellUpdates.status = updates.status;
    if (updates.priority !== undefined) shellUpdates.priority = updates.priority;
    if (updates.bundleRuns !== undefined) shellUpdates.bundleRuns = updates.bundleRuns;
    if (updates.completedAt !== undefined) shellUpdates.completedAt = updates.completedAt;
    if (updates.conditions !== undefined) shellUpdates.conditionCount = updates.conditions.length;

    const updatedShell: CaseShell = { ...shell, ...shellUpdates };
    this.shells.set(id, updatedShell);

    // Update profile fields (session only)
    const profile = this.profiles.get(id);
    if (profile) {
      const profileUpdates: Partial<SensitiveProfile> = { isDirty: true };

      if (updates.clientName !== undefined) profileUpdates.clientName = updates.clientName;
      if (updates.clientEmail !== undefined) profileUpdates.clientEmail = updates.clientEmail;
      if (updates.clientPhone !== undefined) profileUpdates.clientPhone = updates.clientPhone;
      if (updates.conditions !== undefined) profileUpdates.conditions = updates.conditions;
      if (updates.servicePeriod !== undefined) profileUpdates.servicePeriod = updates.servicePeriod;
      if (updates.deployments !== undefined) profileUpdates.deployments = updates.deployments;
      if (updates.notes !== undefined) profileUpdates.notes = updates.notes;
      if (updates.communicationLog !== undefined) {
        profileUpdates.communicationLog = updates.communicationLog;
        updatedShell.communicationCount = updates.communicationLog.length;
      }

      const updatedProfile: SensitiveProfile = { ...profile, ...profileUpdates };
      this.profiles.set(id, updatedProfile);
    }

    // Persist shell only
    this.saveShellsToStorage();
    this.notifyListeners();

    console.log(`[CaseManager] Updated case ${shell.caseAlias}`);
    return this.getCase(id);
  }

  deleteCase(id: string): boolean {
    const shell = this.shells.get(id);
    if (!shell) return false;

    this.shells.delete(id);
    this.profiles.delete(id);

    this.saveShellsToStorage();
    this.notifyListeners();

    console.log(`[CaseManager] Deleted case ${shell.caseAlias}`);
    return true;
  }

  // ---------------------------------------------------------------------------
  // PROFILE MANAGEMENT
  // ---------------------------------------------------------------------------

  /**
   * Load a sensitive profile back into session (for cases where shell exists but profile was cleared)
   */
  loadProfile(id: string, profile: Omit<SensitiveProfile, 'caseId' | 'loadedAt' | 'isDirty'>): boolean {
    const shell = this.shells.get(id);
    if (!shell) return false;

    const fullProfile: SensitiveProfile = {
      ...profile,
      caseId: id,
      loadedAt: new Date().toISOString(),
      isDirty: false
    };

    this.profiles.set(id, fullProfile);
    shell.hasSessionProfile = true;
    shell.conditionCount = profile.conditions.length;
    this.shells.set(id, shell);

    this.saveShellsToStorage();
    this.notifyListeners();

    console.log(`[CaseManager] Loaded profile for case ${shell.caseAlias}`);
    return true;
  }

  /**
   * Clear a sensitive profile from session (explicit privacy action)
   */
  clearProfile(id: string): boolean {
    const shell = this.shells.get(id);
    if (!shell) return false;

    this.profiles.delete(id);
    shell.hasSessionProfile = false;
    this.shells.set(id, shell);

    this.notifyListeners();

    console.log(`[CaseManager] Cleared profile for case ${shell.caseAlias} (privacy action)`);
    return true;
  }

  /**
   * Get count of cases with active profiles
   */
  getActiveProfileCount(): number {
    return this.profiles.size;
  }

  // ---------------------------------------------------------------------------
  // STATUS MANAGEMENT
  // ---------------------------------------------------------------------------

  updateStatus(id: string, status: CaseStatus, note?: string): Case | undefined {
    const shell = this.shells.get(id);
    if (!shell) return undefined;

    const now = new Date().toISOString();
    const updates: Partial<Case> = {
      status,
      updatedAt: now
    };

    if (status === 'complete') {
      updates.completedAt = now;
    }

    // Add system note (to profile if exists)
    const profile = this.profiles.get(id);
    if (profile) {
      const newComm: CommunicationEntry = {
        id: `comm-${Date.now()}`,
        timestamp: now,
        type: 'system',
        direction: 'internal',
        content: `Status changed to ${status}${note ? `: ${note}` : ''}`
      };
      updates.communicationLog = [...profile.communicationLog, newComm];
    }

    return this.updateCase(id, updates);
  }

  // ---------------------------------------------------------------------------
  // BUNDLE RUN MANAGEMENT
  // ---------------------------------------------------------------------------

  startBundleRun(caseId: string, bundleId: string): BundleRun | undefined {
    const shell = this.shells.get(caseId);
    if (!shell) return undefined;

    const bundle = BUNDLE_PACKS.find(b => b.id === bundleId);
    if (!bundle) return undefined;

    const bundleRun: BundleRun = {
      id: `run-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      bundleId,
      bundleName: bundle.name,
      status: 'running',
      startedAt: new Date().toISOString(),
      evidenceCount: 0
    };

    this.updateCase(caseId, {
      status: 'researching',
      bundleRuns: [...shell.bundleRuns, bundleRun]
    });

    console.log(`[CaseManager] Started bundle run ${bundleRun.id} for case ${shell.caseAlias}`);
    return bundleRun;
  }

  completeBundleRun(caseId: string, runId: string, result: ExecutionResult): Case | undefined {
    const shell = this.shells.get(caseId);
    if (!shell) return undefined;

    const updatedRuns = shell.bundleRuns.map(run => {
      if (run.id === runId) {
        return {
          ...run,
          status: result.success ? 'completed' as const : 'failed' as const,
          completedAt: new Date().toISOString(),
          result,
          evidenceCount: result.evidence.length
        };
      }
      return run;
    });

    const allComplete = updatedRuns.every(r =>
      r.status === 'completed' || r.status === 'failed' || r.status === 'stopped'
    );

    return this.updateCase(caseId, {
      bundleRuns: updatedRuns,
      status: allComplete ? 'evidence-ready' : shell.status
    });
  }

  // ---------------------------------------------------------------------------
  // COMMUNICATION LOG
  // ---------------------------------------------------------------------------

  addCommunication(
    caseId: string,
    entry: Omit<CommunicationEntry, 'id' | 'timestamp'>
  ): Case | undefined {
    const shell = this.shells.get(caseId);
    const profile = this.profiles.get(caseId);
    if (!shell || !profile) return undefined;

    const newEntry: CommunicationEntry = {
      ...entry,
      id: `comm-${Date.now()}`,
      timestamp: new Date().toISOString()
    };

    return this.updateCase(caseId, {
      communicationLog: [...profile.communicationLog, newEntry],
      lastContactedAt: entry.direction !== 'internal' ? newEntry.timestamp : shell.lastContactedAt
    });
  }

  // ---------------------------------------------------------------------------
  // HELPERS
  // ---------------------------------------------------------------------------

  getRecommendedBundles(claimType: ClaimType): BundlePack[] {
    const bundleIds = CLAIM_TYPE_BUNDLES[claimType] || [];
    return BUNDLE_PACKS.filter(b => bundleIds.includes(b.id));
  }

  getCaseStats(): {
    total: number;
    byStatus: Record<CaseStatus, number>;
    byPriority: Record<CasePriority, number>;
    completedThisWeek: number;
    averageResolutionDays: number;
    activeProfiles: number;
  } {
    const shells = Array.from(this.shells.values());
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const byStatus: Record<CaseStatus, number> = {
      'new': 0, 'researching': 0, 'evidence-ready': 0,
      'review': 0, 'complete': 0, 'on-hold': 0
    };

    const byPriority: Record<CasePriority, number> = {
      'low': 0, 'normal': 0, 'high': 0, 'urgent': 0
    };

    let completedThisWeek = 0;
    let totalResolutionDays = 0;
    let completedCount = 0;

    shells.forEach(shell => {
      byStatus[shell.status]++;
      byPriority[shell.priority]++;

      if (shell.status === 'complete' && shell.completedAt) {
        const completedDate = new Date(shell.completedAt);
        if (completedDate >= oneWeekAgo) {
          completedThisWeek++;
        }

        const createdDate = new Date(shell.createdAt);
        const days = (completedDate.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24);
        totalResolutionDays += days;
        completedCount++;
      }
    });

    return {
      total: shells.length,
      byStatus,
      byPriority,
      completedThisWeek,
      averageResolutionDays: completedCount > 0 ? totalResolutionDays / completedCount : 0,
      activeProfiles: this.profiles.size
    };
  }

  // ---------------------------------------------------------------------------
  // SEARCH (shell-based, privacy-safe)
  // ---------------------------------------------------------------------------

  searchCases(query: string): Case[] {
    const lowerQuery = query.toLowerCase();
    return this.getAllCases().filter(c => {
      // Search shell fields (always available)
      if (c.caseAlias.toLowerCase().includes(lowerQuery)) return true;
      if (c.id.includes(lowerQuery)) return true;
      if (CLAIM_TYPE_LABELS[c.claimType].toLowerCase().includes(lowerQuery)) return true;

      // Search profile fields (only if profile is loaded)
      if (c.hasSessionProfile) {
        if (c.clientName.toLowerCase().includes(lowerQuery)) return true;
        if (c.clientEmail.toLowerCase().includes(lowerQuery)) return true;
        if (c.notes.toLowerCase().includes(lowerQuery)) return true;
        if (c.conditions.some(cond => cond.toLowerCase().includes(lowerQuery))) return true;
      }

      return false;
    });
  }
}

// Export singleton
export const caseManager = new CaseManagerService();

// Export class for testing
export { CaseManagerService };
