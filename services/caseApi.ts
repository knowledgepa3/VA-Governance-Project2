/**
 * Case API Client — HTTP layer for case CRUD
 *
 * Talks to the server's /api/cases/* endpoints.
 * Handles auth token management (login, refresh on 401).
 *
 * Used internally by caseManager — not consumed directly by components.
 */

import type {
  CaseShell,
  SensitiveProfile,
  ClaimType,
  CasePriority,
  BundleRun,
} from './caseManager';

// ============================================================================
// ENV HELPERS
// ============================================================================

function env(key: string): string | undefined {
  try {
    const val = (import.meta as any).env?.[key];
    if (val) return val;
  } catch { /* not in Vite context */ }
  if (typeof process !== 'undefined' && process.env) {
    return process.env[key];
  }
  return undefined;
}

// ============================================================================
// CONFIG
// ============================================================================

function getServerUrl(): string {
  const configUrl = env('VITE_API_SERVER_URL') || env('API_SERVER_URL');
  if (configUrl) return configUrl.replace(/\/$/, '');
  if (typeof window !== 'undefined') return window.location.origin;
  return 'http://localhost:3001';
}

const SERVER_URL = getServerUrl();

// ============================================================================
// AUTH TOKEN CACHE
// ============================================================================

let cachedToken: string | null = null;
let tokenExpiry = 0;

async function getAuthToken(): Promise<string> {
  const now = Date.now();

  // Return cached token if still valid (60s buffer)
  if (cachedToken && tokenExpiry > now + 60_000) {
    return cachedToken;
  }

  const email = env('VITE_OPERATOR_EMAIL') || 'isso@example.com';
  const password = env('VITE_OPERATOR_PASSWORD') || 'demo';

  const res = await fetch(`${SERVER_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: `Auth failed: ${res.status}` }));
    throw new Error(err.error || `Auth failed: ${res.status}`);
  }

  const data = await res.json();
  cachedToken = data.token;
  tokenExpiry = now + ((data.expiresIn || 3600) * 1000);
  return cachedToken!;
}

/** Clear the cached token (e.g., on logout) */
export function clearAuthToken(): void {
  cachedToken = null;
  tokenExpiry = 0;
}

// ============================================================================
// FETCH WRAPPER (auto-auth, retry on 401)
// ============================================================================

async function apiFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const token = await getAuthToken();

  const res = await fetch(`${SERVER_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...options.headers,
    },
  });

  // On 401, clear token and retry once
  if (res.status === 401) {
    console.warn('[CaseAPI] Token expired, re-authenticating...');
    clearAuthToken();
    const newToken = await getAuthToken();

    return fetch(`${SERVER_URL}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${newToken}`,
        ...options.headers,
      },
    });
  }

  return res;
}

async function apiJson<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await apiFetch(path, options);

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: `Server error: ${res.status}` }));
    throw new Error(err.error || `Server returned ${res.status}`);
  }

  return res.json();
}

// ============================================================================
// SERVER RESPONSE TYPES (snake_case from PG → camelCase for frontend)
// ============================================================================

interface ServerCaseShell {
  id: string;
  case_alias: string;
  claim_type: string;
  condition_count: number;
  status: string;
  priority: string;
  evidence_package_ids: string[];
  evidence_hashes: string[];
  communication_count: number;
  tenant_id: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  completed_at?: string;
}

interface ServerBundleRun {
  id: string;
  case_id: string;
  bundle_id: string;
  bundle_name: string;
  status: string;
  started_at: string;
  completed_at?: string;
  result?: any;
  evidence_count: number;
}

interface ServerCaseStats {
  total: number;
  byStatus: Record<string, number>;
  byPriority: Record<string, number>;
  completedThisWeek: number;
  averageResolutionDays: number;
}

// ============================================================================
// MAPPERS (server → frontend types)
// ============================================================================

function mapShell(s: ServerCaseShell, bundleRuns: ServerBundleRun[] = []): CaseShell {
  return {
    id: s.id,
    caseAlias: s.case_alias,
    claimType: s.claim_type as ClaimType,
    conditionCount: s.condition_count,
    status: s.status as any,
    priority: (s.priority || 'normal') as CasePriority,
    bundleRuns: bundleRuns.map(mapBundleRun),
    evidencePackageIds: s.evidence_package_ids || [],
    evidenceHashes: s.evidence_hashes || [],
    createdAt: s.created_at,
    updatedAt: s.updated_at,
    completedAt: s.completed_at,
    communicationCount: s.communication_count || 0,
    hasSessionProfile: false, // Will be set true when profile is fetched
  };
}

function mapBundleRun(r: ServerBundleRun): BundleRun {
  return {
    id: r.id,
    bundleId: r.bundle_id,
    bundleName: r.bundle_name,
    status: r.status as any,
    startedAt: r.started_at,
    completedAt: r.completed_at,
    result: r.result,
    evidenceCount: r.evidence_count || 0,
  };
}

// ============================================================================
// PUBLIC API
// ============================================================================

export const caseApi = {
  /**
   * Create a new case (shell + optional encrypted profile)
   */
  async createCase(input: {
    claimType: ClaimType;
    conditionCount?: number;
    priority?: CasePriority;
    profileData?: {
      clientName: string;
      clientEmail: string;
      clientPhone?: string;
      conditions: string[];
      servicePeriod?: { start: string; end: string };
      deployments?: string[];
      notes: string;
    };
  }): Promise<CaseShell> {
    const data = await apiJson<ServerCaseShell>('/api/cases', {
      method: 'POST',
      body: JSON.stringify(input),
    });
    return mapShell(data);
  },

  /**
   * List all case shells for the tenant
   */
  async listCases(filters?: {
    status?: string;
    priority?: string;
    limit?: number;
    offset?: number;
  }): Promise<CaseShell[]> {
    const params = new URLSearchParams();
    if (filters?.status) params.set('status', filters.status);
    if (filters?.priority) params.set('priority', filters.priority);
    if (filters?.limit) params.set('limit', String(filters.limit));
    if (filters?.offset) params.set('offset', String(filters.offset));

    const qs = params.toString();
    const data = await apiJson<{ cases: ServerCaseShell[]; count: number }>(
      `/api/cases${qs ? `?${qs}` : ''}`
    );
    return data.cases.map(s => mapShell(s));
  },

  /**
   * Get a single case shell (with bundle runs)
   */
  async getCase(id: string): Promise<CaseShell & { bundleRuns: BundleRun[] }> {
    const data = await apiJson<ServerCaseShell & { bundleRuns?: ServerBundleRun[] }>(
      `/api/cases/${id}`
    );
    return {
      ...mapShell(data, data.bundleRuns || []),
      bundleRuns: (data.bundleRuns || []).map(mapBundleRun),
    };
  },

  /**
   * Get decrypted sensitive profile (requires elevated role)
   */
  async getProfile(id: string): Promise<SensitiveProfile | null> {
    try {
      const data = await apiJson<any>(`/api/cases/${id}/profile`);
      return data as SensitiveProfile;
    } catch (err: any) {
      // 404 means no profile exists, 403 means insufficient role
      if (err.message?.includes('404') || err.message?.includes('403')) {
        return null;
      }
      throw err;
    }
  },

  /**
   * Update case shell fields
   */
  async updateCase(id: string, updates: Record<string, any>): Promise<CaseShell> {
    const data = await apiJson<ServerCaseShell>(`/api/cases/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
    return mapShell(data);
  },

  /**
   * Update sensitive profile (re-encrypts server-side)
   */
  async updateProfile(id: string, profileData: Record<string, any>): Promise<boolean> {
    const data = await apiJson<{ updated: boolean }>(`/api/cases/${id}/profile`, {
      method: 'PUT',
      body: JSON.stringify(profileData),
    });
    return data.updated;
  },

  /**
   * Update case status
   */
  async updateStatus(id: string, status: string): Promise<CaseShell> {
    const data = await apiJson<ServerCaseShell>(`/api/cases/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
    return mapShell(data);
  },

  /**
   * Start a bundle run
   */
  async startBundleRun(caseId: string, bundleId: string, bundleName: string): Promise<BundleRun> {
    const data = await apiJson<ServerBundleRun>(`/api/cases/${caseId}/bundle-runs`, {
      method: 'POST',
      body: JSON.stringify({ bundleId, bundleName }),
    });
    return mapBundleRun(data);
  },

  /**
   * Complete a bundle run
   */
  async completeBundleRun(
    caseId: string,
    runId: string,
    status: string,
    result: any,
    evidenceCount: number
  ): Promise<BundleRun> {
    const data = await apiJson<ServerBundleRun>(
      `/api/cases/${caseId}/bundle-runs/${runId}`,
      {
        method: 'PUT',
        body: JSON.stringify({ status, result, evidenceCount }),
      }
    );
    return mapBundleRun(data);
  },

  /**
   * Add a communication entry
   */
  async addCommunication(
    caseId: string,
    entry: { type: string; direction: string; subject?: string; content: string; attachments?: string[] }
  ): Promise<boolean> {
    const data = await apiJson<{ added: boolean }>(`/api/cases/${caseId}/communications`, {
      method: 'POST',
      body: JSON.stringify(entry),
    });
    return data.added;
  },

  /**
   * Get dashboard statistics
   */
  async getStats(): Promise<ServerCaseStats> {
    return apiJson<ServerCaseStats>('/api/cases/stats');
  },

  /**
   * Health check — is the server reachable?
   */
  async healthCheck(): Promise<boolean> {
    try {
      const res = await fetch(`${SERVER_URL}/health`);
      return res.ok;
    } catch {
      return false;
    }
  },
};
