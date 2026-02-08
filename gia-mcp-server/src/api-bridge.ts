/**
 * GIA API Bridge — HTTP Client for Backend Communication
 *
 * Connects the MCP server (stdio process) to the GIA backend API.
 * Uses native fetch() (Node 20+). All calls are fail-open:
 * if backend is unreachable, returns null (tools gracefully degrade).
 *
 * Environment:
 *   GIA_API_URL   — Backend base URL (default: http://localhost:3000)
 *   GIA_API_TOKEN — Auth token for API calls (uses demo login if not set)
 */

// ═══════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════

const API_BASE = process.env.GIA_API_URL || 'http://localhost:3000';
const API_TOKEN = process.env.GIA_API_TOKEN || '';
const TIMEOUT_MS = 5000; // 5s timeout for all API calls

// Cached JWT from demo login (lazy-initialized)
let cachedJwt: string | null = null;
let jwtExpiresAt = 0;

// ═══════════════════════════════════════════════════════════════════
// JWT ACQUISITION (demo fallback)
// ═══════════════════════════════════════════════════════════════════

async function getAuthToken(): Promise<string | null> {
  // Prefer explicit token
  if (API_TOKEN) return API_TOKEN;

  // Check cached JWT
  if (cachedJwt && Date.now() < jwtExpiresAt) return cachedJwt;

  // Try demo login
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

    const res = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'will@aceadvising.com',
        password: 'Plastic_Pa12!!',
      }),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) return null;
    const data = await res.json() as { token?: string };
    if (data.token) {
      cachedJwt = data.token;
      jwtExpiresAt = Date.now() + 3_500_000; // ~58 min (JWT usually 1hr)
      return cachedJwt;
    }
    return null;
  } catch {
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════════
// GENERIC FETCH HELPER
// ═══════════════════════════════════════════════════════════════════

/**
 * Fetch from backend API. Returns parsed JSON or null on any failure.
 * Never throws — all errors silently return null (fail-open).
 */
export async function apiFetch<T = any>(path: string): Promise<T | null> {
  try {
    const token = await getAuthToken();
    if (!token) return null;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

    const res = await fetch(`${API_BASE}${path}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
      },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════════
// TYPED FETCH HELPERS
// ═══════════════════════════════════════════════════════════════════

export interface BootData {
  version: { sha: string; buildTime: string; env: string };
  health: { status: string; uptime: number; db: boolean; ai: boolean };
  agents: { registered: number; workers: string[] };
  pipelines: { total: number; active: number; paused: number; failed: number; completed: number };
  gates: { pending: number; oldest: string | null };
  audit: { chainValid: boolean; entryCount: number; lastHash: string };
  cost: { today: { tokens: number; usd: number }; mtd: { tokens: number; usd: number } };
  governance: {
    packsActive: number;
    policiesTotal: number;
    controlFamilies: string[];
    evidenceTemplates: number;
    approvalRoles: number;
    lastUpdated: string;
  } | null;
  analytics: {
    complianceRate: number;
    complianceTrend: string;
    totalMetricsRecorded: number;
    anomaliesDetected: number;
    topRiskFamily: string | null;
    policyEffectivenessAvg: number;
  } | null;
  security: {
    complianceLevel: string;
    overallStatus: string;
  } | null;
}

export interface GovernanceSummary {
  packsActive: number;
  packsTotal: number;
  policiesActive: number;
  policiesTotal: number;
  controlFamilies: string[];
  familyBreakdown: Record<string, number>;
  evidenceTemplates: number;
  approvalRoles: number;
  lastUpdated: string;
}

export interface PolicyQueryResult {
  policies: Array<{
    policyId: string;
    controlFamily: string;
    title: string;
    riskLevel: string;
    maiLevel: string;
    implementationStatus: string;
  }>;
  count: number;
}

export interface AnalyticsOverview {
  complianceRate: number;
  complianceTrend: string;
  totalMetricsRecorded: number;
  anomaliesDetected: number;
  topRiskFamily: string | null;
  policyEffectivenessAvg: number;
  familyBreakdown?: Record<string, { total: number; passed: number; rate: number }>;
}

/** Fetch boot data */
export function fetchBoot(): Promise<BootData | null> {
  return apiFetch<BootData>('/api/operator/boot');
}

/** Fetch governance summary */
export function fetchGovernanceSummary(): Promise<GovernanceSummary | null> {
  return apiFetch<GovernanceSummary>('/api/governance/summary');
}

/** Query effective policies */
export function fetchPolicies(params?: {
  domain?: string;
  workerType?: string;
  controlFamily?: string;
  maiLevel?: string;
  riskLevel?: string;
}): Promise<PolicyQueryResult | null> {
  const query = new URLSearchParams();
  if (params?.domain) query.set('domain', params.domain);
  if (params?.workerType) query.set('workerType', params.workerType);
  if (params?.controlFamily) query.set('controlFamily', params.controlFamily);
  if (params?.maiLevel) query.set('maiLevel', params.maiLevel);
  if (params?.riskLevel) query.set('riskLevel', params.riskLevel);
  const qs = query.toString();
  return apiFetch<PolicyQueryResult>(`/api/governance/query${qs ? `?${qs}` : ''}`);
}

/** Fetch analytics overview */
export function fetchAnalytics(): Promise<AnalyticsOverview | null> {
  return apiFetch<AnalyticsOverview>('/api/operator/analytics/overview');
}

/** Red team stats shape */
export interface RedTeamStatsResponse {
  totalFindings: number;
  openFindings: number;
  bySeverity: Record<string, number>;
  byStatus: Record<string, number>;
  byCategory: Record<string, number>;
  lastRunAt: string | null;
}

/** Fetch red team stats */
export function fetchRedTeamStats(): Promise<RedTeamStatsResponse | null> {
  return apiFetch<RedTeamStatsResponse>('/api/red-team/stats');
}
