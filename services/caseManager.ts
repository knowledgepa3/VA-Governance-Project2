/**
 * ACE Case Manager - Client Case Tracking & Management
 *
 * ENTERPRISE-GRADE DATA SEPARATION:
 * This service implements a two-layer data model to protect PHI/PII:
 *
 * 1. CASE SHELL (persisted in PostgreSQL via /api/cases) - Safe metadata only
 *    - caseId, status, priority, timestamps
 *    - claimType (category, not identifying)
 *    - workflow stage, bundle run history
 *    - hashes/manifests (non-sensitive)
 *    - repository pointers (when enterprise mode enabled)
 *
 * 2. SENSITIVE PROFILE (AES-256-GCM encrypted in PostgreSQL) - PHI/PII
 *    - clientName, clientEmail, clientPhone
 *    - conditions (can be identifying)
 *    - servicePeriod, deployments (identifying)
 *    - notes (often contains PHI)
 *    - communicationLog content
 *
 * STORAGE MODES:
 * - PROTOTYPE: Uses backend API with encrypted profile storage
 * - ENTERPRISE: Same API + secure vault or BYOR repository (future)
 *
 * FALLBACK:
 * If the server is unreachable, falls back to localStorage for shells
 * (profiles remain session-only in fallback mode).
 *
 * PUBLIC API PRESERVED:
 * All method signatures are identical to the original localStorage version.
 * Components (CasesDashboard, NewCaseForm, etc.) require no changes.
 */

import { BundlePack, BUNDLE_PACKS } from './bundlePacks';
import { ExecutionResult, EvidenceRecord } from './browserAutomationAgent';
import { caseApi, clearAuthToken } from './caseApi';

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
 * CASE SHELL - Persisted in PostgreSQL (non-sensitive metadata)
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
 * SENSITIVE PROFILE - Encrypted in PostgreSQL (PHI/PII)
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
// CASE MANAGER CLASS - API-BACKED WITH LOCAL CACHE
// ============================================================================

const STORAGE_KEY = 'ace_case_shells';  // localStorage fallback
const CONFIG_KEY = 'ace_case_config';

class CaseManagerService {
  // Client-side cache (API is source of truth)
  private shells: Map<string, CaseShell> = new Map();

  // Session memory: sensitive profiles (fetched on-demand from API, cached locally)
  private profiles: Map<string, SensitiveProfile> = new Map();

  // Configuration
  private config: StorageConfig = DEFAULT_STORAGE_CONFIG;

  // Listeners
  private listeners: Set<(cases: Case[]) => void> = new Set();

  // Case counter for alias generation (fallback only)
  private caseCounter: number = 0;

  // API connectivity state
  private apiAvailable: boolean = false;
  private initialized: boolean = false;

  constructor() {
    this.loadConfig();
    // Load from localStorage as initial cache (will be refreshed from API)
    this.loadShellsFromStorage();
    // Kick off async API init (non-blocking)
    this.init().catch(err => {
      console.warn('[CaseManager] API init failed, running in offline mode:', err.message);
    });
    console.log(`[CaseManager] Initialized in ${this.config.mode.toUpperCase()} mode`);
  }

  /**
   * Initialize by syncing with server API.
   * Called automatically in constructor, but can be called again to re-sync.
   */
  async init(): Promise<void> {
    try {
      const healthy = await caseApi.healthCheck();
      if (!healthy) {
        console.warn('[CaseManager] Server not reachable, using localStorage fallback');
        this.apiAvailable = false;
        return;
      }

      this.apiAvailable = true;

      // Fetch all cases from API
      const shells = await caseApi.listCases();
      this.shells.clear();
      shells.forEach(shell => {
        shell.hasSessionProfile = this.profiles.has(shell.id);
        this.shells.set(shell.id, shell);
      });

      // Update counter from server data
      const maxNumber = shells.reduce((max, shell) => {
        const match = shell.caseAlias.match(/CASE-\d{4}-(\d+)/);
        return match ? Math.max(max, parseInt(match[1], 10)) : max;
      }, 0);
      this.caseCounter = maxNumber;

      // Persist to localStorage as offline cache
      this.saveShellsToStorage();

      this.initialized = true;
      this.notifyListeners();
      console.log(`[CaseManager] Synced ${shells.length} cases from server`);
    } catch (error: any) {
      console.warn('[CaseManager] API sync failed:', error.message);
      this.apiAvailable = false;
    }
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
  // PERSISTENCE (localStorage as offline cache)
  // ---------------------------------------------------------------------------

  private loadShellsFromStorage(): void {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const shellsArray: CaseShell[] = JSON.parse(stored);
        shellsArray.forEach(shell => {
          shell.hasSessionProfile = false;
          this.shells.set(shell.id, shell);
        });

        const maxNumber = shellsArray.reduce((max, shell) => {
          const match = shell.caseAlias.match(/CASE-\d{4}-(\d+)/);
          return match ? Math.max(max, parseInt(match[1], 10)) : max;
        }, 0);
        this.caseCounter = maxNumber;

        console.log(`[CaseManager] Loaded ${shellsArray.length} case shells from cache`);
      }
    } catch (error) {
      console.error('[CaseManager] Failed to load shells from cache:', error);
    }
  }

  private saveShellsToStorage(): void {
    try {
      const shellsArray = Array.from(this.shells.values());
      localStorage.setItem(STORAGE_KEY, JSON.stringify(shellsArray));
    } catch (error) {
      console.error('[CaseManager] Failed to save shells to cache:', error);
    }
  }

  private notifyListeners(): void {
    const cases = this.getAllCases();
    this.listeners.forEach(listener => listener(cases));
  }

  // ---------------------------------------------------------------------------
  // ALIAS GENERATION (fallback for offline mode)
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

    // Create SHELL (local cache — will sync to API)
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
      communicationCount: 1,
      hasSessionProfile: true
    };

    // Create SENSITIVE PROFILE (cached locally, persisted encrypted via API)
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

    // Store locally
    this.shells.set(id, shell);
    this.profiles.set(id, profile);

    // Persist shell to localStorage cache
    this.saveShellsToStorage();
    this.notifyListeners();

    // Fire-and-forget: sync to API
    if (this.apiAvailable) {
      caseApi.createCase({
        claimType: input.claimType,
        conditionCount: input.conditions?.length || 0,
        priority: input.priority,
        profileData: {
          clientName: input.clientName,
          clientEmail: input.clientEmail,
          clientPhone: input.clientPhone,
          conditions: input.conditions || [],
          servicePeriod: input.servicePeriod,
          deployments: input.deployments,
          notes: input.notes || '',
        },
      }).then(serverShell => {
        // Update local cache with server-assigned ID and alias
        this.shells.delete(id);
        this.profiles.delete(id);

        const updatedShell: CaseShell = {
          ...shell,
          id: serverShell.id,
          caseAlias: serverShell.caseAlias,
          hasSessionProfile: true,
        };
        const updatedProfile: SensitiveProfile = {
          ...profile,
          caseId: serverShell.id,
        };

        this.shells.set(serverShell.id, updatedShell);
        this.profiles.set(serverShell.id, updatedProfile);
        this.saveShellsToStorage();
        this.notifyListeners();

        console.log(`[CaseManager] Synced case to server: ${serverShell.caseAlias} (${serverShell.id})`);
      }).catch(err => {
        console.error('[CaseManager] Failed to sync case to server:', err.message);
      });
    }

    console.log(`[CaseManager] Created case ${alias} (${id})`);
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

    // Update profile fields (session cache)
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

    // Persist shell to localStorage cache
    this.saveShellsToStorage();
    this.notifyListeners();

    // Fire-and-forget: sync to API
    if (this.apiAvailable) {
      caseApi.updateCase(id, shellUpdates).catch(err => {
        console.error('[CaseManager] Failed to sync update to server:', err.message);
      });
    }

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
   * Load a sensitive profile back into session
   * In API mode, also fetches from server if available
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
   * Fetch profile from server API and load into session cache
   */
  async fetchProfile(id: string): Promise<boolean> {
    if (!this.apiAvailable) return false;

    const shell = this.shells.get(id);
    if (!shell) return false;

    try {
      const profile = await caseApi.getProfile(id);
      if (!profile) return false;

      this.profiles.set(id, {
        ...profile,
        caseId: id,
        loadedAt: new Date().toISOString(),
        isDirty: false,
      });
      shell.hasSessionProfile = true;
      this.shells.set(id, shell);
      this.notifyListeners();

      console.log(`[CaseManager] Fetched profile from server for case ${shell.caseAlias}`);
      return true;
    } catch (err: any) {
      console.warn(`[CaseManager] Failed to fetch profile for ${id}:`, err.message);
      return false;
    }
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

    // Also sync status to API
    if (this.apiAvailable) {
      caseApi.updateStatus(id, status).catch(err => {
        console.error('[CaseManager] Failed to sync status to server:', err.message);
      });
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

    // Sync to API
    if (this.apiAvailable) {
      caseApi.startBundleRun(caseId, bundleId, bundle.name).catch(err => {
        console.error('[CaseManager] Failed to sync bundle run to server:', err.message);
      });
    }

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

    // Sync to API
    if (this.apiAvailable) {
      const status = result.success ? 'completed' : 'failed';
      caseApi.completeBundleRun(caseId, runId, status, result, result.evidence.length).catch(err => {
        console.error('[CaseManager] Failed to sync bundle completion to server:', err.message);
      });
    }

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

    // Sync to API
    if (this.apiAvailable) {
      caseApi.addCommunication(caseId, {
        type: entry.type,
        direction: entry.direction,
        subject: entry.subject,
        content: entry.content,
        attachments: entry.attachments,
      }).catch(err => {
        console.error('[CaseManager] Failed to sync communication to server:', err.message);
      });
    }

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

  // ---------------------------------------------------------------------------
  // API CONNECTIVITY
  // ---------------------------------------------------------------------------

  /** Check if the server API is currently available */
  isApiAvailable(): boolean {
    return this.apiAvailable;
  }

  /** Check if initial sync from server is complete */
  isInitialized(): boolean {
    return this.initialized;
  }

  /** Force re-sync from server */
  async refresh(): Promise<void> {
    await this.init();
  }
}

// Export singleton
export const caseManager = new CaseManagerService();

// Export class for testing
export { CaseManagerService };
