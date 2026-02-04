/**
 * Access Control Service
 *
 * Provides user session and access control data for the GovernancePolicy component.
 * Integrates with the auth system and audit log.
 *
 * In production: Fetches from real API endpoints
 * In demo mode: Uses realistic demo data
 */

import { config } from '../config.browser';

// =============================================================================
// TYPES (aligned with auth/types.ts)
// =============================================================================

export enum UserRole {
  ISSO = 'ISSO',
  ADMIN = 'ADMIN',
  ANALYST = 'ANALYST',
  AUDITOR = 'AUDITOR',
  BD_MANAGER = 'BD_MANAGER',
  CAPTURE_MANAGER = 'CAPTURE_MANAGER',
  FORENSIC_SME = 'FORENSIC_SME',
  VIEWER = 'VIEWER',
  // Legacy roles for backwards compatibility
  SANITIZATION_OFFICER = 'SANITIZATION_OFFICER',
  FEDERAL_AUDITOR = 'FEDERAL_AUDITOR'
}

export interface Permission {
  id: string;
  name: string;
  description?: string;
}

export interface UserSession {
  userId: string;
  role: UserRole;
  name: string;
  email: string;
  lastActive: Date;
  mfaEnabled: boolean;
  permissions: string[];
  sessionStart: Date;
  ipAddress: string;
  userAgent?: string;
  tenantId: string;
}

export interface AccessAuditEntry {
  id: string;
  timestamp: Date;
  userId: string;
  userName?: string;
  action: string;
  resource: string;
  resourceType?: string;
  result: 'ALLOWED' | 'DENIED' | 'ESCALATED';
  reason?: string;
  ipAddress?: string;
}

export interface RoleDefinition {
  role: UserRole;
  level: number;
  displayName: string;
  permissions: string[];
  canApprove: string[];
  restrictions: string[];
}

export interface AccessControlPolicy {
  id: string;
  name: string;
  status: 'ACTIVE' | 'INACTIVE' | 'PENDING';
  description: string;
  enforcement: 'STRICT' | 'AUDIT' | 'WARN';
  nistControl?: string;
}

export interface AccessControlData {
  sessions: UserSession[];
  auditLog: AccessAuditEntry[];
  roleDefinitions: RoleDefinition[];
  policies: AccessControlPolicy[];
  dataSource: 'LIVE' | 'DEMO';
  lastUpdated: Date;
}

// =============================================================================
// ROLE DEFINITIONS (aligned with auth system)
// =============================================================================

export const ROLE_DEFINITIONS: RoleDefinition[] = [
  {
    role: UserRole.ISSO,
    level: 5,
    displayName: 'Information System Security Officer',
    permissions: [
      'system:configure', 'user:manage', 'settings:manage',
      'workflow:approve', 'workflow:create', 'workflow:execute', 'workflow:view',
      'audit:verify', 'audit:export', 'audit:view',
      'opportunity:decide', 'opportunity:qualify', 'opportunity:view',
      'redteam:execute', 'redteam:view'
    ],
    canApprove: ['all'],
    restrictions: []
  },
  {
    role: UserRole.ADMIN,
    level: 4,
    displayName: 'System Administrator',
    permissions: [
      'system:configure', 'user:manage', 'settings:manage',
      'workflow:create', 'workflow:execute', 'workflow:view',
      'audit:export', 'audit:view'
    ],
    canApprove: ['system', 'users'],
    restrictions: ['cannot approve workflows', 'cannot execute red team tests']
  },
  {
    role: UserRole.FORENSIC_SME,
    level: 3,
    displayName: 'Forensic Subject Matter Expert',
    permissions: [
      'workflow:approve', 'workflow:execute', 'workflow:view',
      'audit:view',
      'redteam:view'
    ],
    canApprove: ['evidence', 'mappings', 'nexus'],
    restrictions: ['cannot modify system config', 'cannot manage users']
  },
  {
    role: UserRole.BD_MANAGER,
    level: 3,
    displayName: 'Business Development Manager',
    permissions: [
      'workflow:execute', 'workflow:view',
      'opportunity:decide', 'opportunity:qualify', 'opportunity:view'
    ],
    canApprove: ['opportunities', 'bids'],
    restrictions: ['cannot access audit logs', 'cannot modify system config']
  },
  {
    role: UserRole.CAPTURE_MANAGER,
    level: 2,
    displayName: 'Capture Manager',
    permissions: [
      'workflow:execute', 'workflow:view',
      'opportunity:qualify', 'opportunity:view'
    ],
    canApprove: ['capture activities'],
    restrictions: ['cannot approve final bids', 'cannot access audit logs']
  },
  {
    role: UserRole.ANALYST,
    level: 2,
    displayName: 'Security Analyst',
    permissions: [
      'workflow:execute', 'workflow:view',
      'audit:view',
      'opportunity:qualify', 'opportunity:view',
      'redteam:view'
    ],
    canApprove: [],
    restrictions: ['cannot approve workflows', 'cannot modify system config']
  },
  {
    role: UserRole.AUDITOR,
    level: 1,
    displayName: 'Auditor',
    permissions: [
      'workflow:view',
      'audit:verify', 'audit:export', 'audit:view',
      'opportunity:view'
    ],
    canApprove: [],
    restrictions: ['read-only access', 'cannot modify any data']
  },
  {
    role: UserRole.VIEWER,
    level: 0,
    displayName: 'Viewer',
    permissions: [
      'workflow:view',
      'audit:view',
      'opportunity:view'
    ],
    canApprove: [],
    restrictions: ['read-only access', 'cannot modify any data', 'limited audit access']
  }
];

// =============================================================================
// DEFAULT POLICIES
// =============================================================================

export const DEFAULT_POLICIES: AccessControlPolicy[] = [
  {
    id: 'POL-UAC-001',
    name: 'MFA Enforcement',
    status: 'ACTIVE',
    description: 'All users must authenticate with Multi-Factor Authentication',
    enforcement: 'STRICT',
    nistControl: 'IA-2(1)'
  },
  {
    id: 'POL-UAC-002',
    name: 'Separation of Duties',
    status: 'ACTIVE',
    description: 'Initiator cannot be the same as Final Approver',
    enforcement: 'STRICT',
    nistControl: 'AC-5'
  },
  {
    id: 'POL-UAC-003',
    name: 'Non-Repudiation',
    status: 'ACTIVE',
    description: 'All actions logged with User ID, Timestamp, Digital Signature',
    enforcement: 'AUDIT',
    nistControl: 'AU-10'
  },
  {
    id: 'POL-UAC-004',
    name: 'Session Timeout',
    status: 'ACTIVE',
    description: 'Inactive sessions expire after 30 minutes',
    enforcement: 'STRICT',
    nistControl: 'AC-12'
  },
  {
    id: 'POL-UAC-005',
    name: 'Least Privilege',
    status: 'ACTIVE',
    description: 'Users granted minimum permissions required for their role',
    enforcement: 'STRICT',
    nistControl: 'AC-6'
  },
  {
    id: 'POL-UAC-006',
    name: 'Account Lockout',
    status: 'ACTIVE',
    description: 'Lock account after 5 failed login attempts',
    enforcement: 'STRICT',
    nistControl: 'AC-7'
  }
];

// =============================================================================
// DEMO DATA GENERATOR
// =============================================================================

function generateDemoSessions(): UserSession[] {
  const now = Date.now();
  return [
    {
      userId: 'user-isso-001',
      role: UserRole.ISSO,
      name: 'Jane Smith',
      email: 'isso@example.com',
      lastActive: new Date(now - 120000),
      mfaEnabled: true,
      permissions: ROLE_DEFINITIONS.find(r => r.role === UserRole.ISSO)?.permissions || [],
      sessionStart: new Date(now - 3600000),
      ipAddress: '10.0.1.45',
      tenantId: 'default'
    },
    {
      userId: 'user-analyst-001',
      role: UserRole.ANALYST,
      name: 'Bob Johnson',
      email: 'analyst@example.com',
      lastActive: new Date(now - 300000),
      mfaEnabled: true,
      permissions: ROLE_DEFINITIONS.find(r => r.role === UserRole.ANALYST)?.permissions || [],
      sessionStart: new Date(now - 7200000),
      ipAddress: '10.0.1.67',
      tenantId: 'default'
    },
    {
      userId: 'user-bd-001',
      role: UserRole.BD_MANAGER,
      name: 'David Lee',
      email: 'bd@example.com',
      lastActive: new Date(),
      mfaEnabled: true,
      permissions: ROLE_DEFINITIONS.find(r => r.role === UserRole.BD_MANAGER)?.permissions || [],
      sessionStart: new Date(now - 1800000),
      ipAddress: '10.0.1.89',
      tenantId: 'default'
    },
    {
      userId: 'user-auditor-001',
      role: UserRole.AUDITOR,
      name: 'Carol Williams',
      email: 'auditor@example.com',
      lastActive: new Date(now - 600000),
      mfaEnabled: true,
      permissions: ROLE_DEFINITIONS.find(r => r.role === UserRole.AUDITOR)?.permissions || [],
      sessionStart: new Date(now - 5400000),
      ipAddress: '10.0.1.102',
      tenantId: 'default'
    }
  ];
}

function generateDemoAuditLog(): AccessAuditEntry[] {
  const now = Date.now();
  return [
    {
      id: 'AUD-001',
      timestamp: new Date(now - 60000),
      userId: 'user-bd-001',
      userName: 'David Lee',
      action: 'QUALIFY_OPPORTUNITY',
      resource: 'OPP-2025-1547',
      resourceType: 'opportunity',
      result: 'ALLOWED',
      ipAddress: '10.0.1.89'
    },
    {
      id: 'AUD-002',
      timestamp: new Date(now - 180000),
      userId: 'user-analyst-001',
      userName: 'Bob Johnson',
      action: 'EXECUTE_WORKFLOW',
      resource: 'WF-CYBER-089',
      resourceType: 'workflow',
      result: 'ALLOWED',
      ipAddress: '10.0.1.67'
    },
    {
      id: 'AUD-003',
      timestamp: new Date(now - 300000),
      userId: 'user-bd-001',
      userName: 'David Lee',
      action: 'APPROVE_BID',
      resource: 'BID-2025-045',
      resourceType: 'bid',
      result: 'DENIED',
      reason: 'Insufficient role level for final bid approval',
      ipAddress: '10.0.1.89'
    },
    {
      id: 'AUD-004',
      timestamp: new Date(now - 420000),
      userId: 'user-isso-001',
      userName: 'Jane Smith',
      action: 'MODIFY_THRESHOLD',
      resource: 'CONFIG.AGENT.CONFIDENCE',
      resourceType: 'config',
      result: 'ALLOWED',
      ipAddress: '10.0.1.45'
    },
    {
      id: 'AUD-005',
      timestamp: new Date(now - 600000),
      userId: 'user-analyst-001',
      userName: 'Bob Johnson',
      action: 'ESCALATE_REVIEW',
      resource: 'CASE-2025-088',
      resourceType: 'case',
      result: 'ESCALATED',
      reason: 'Requires ISSO approval due to PII detection',
      ipAddress: '10.0.1.67'
    },
    {
      id: 'AUD-006',
      timestamp: new Date(now - 900000),
      userId: 'user-auditor-001',
      userName: 'Carol Williams',
      action: 'EXPORT_AUDIT_LOG',
      resource: 'AUDIT-2025-Q1',
      resourceType: 'audit',
      result: 'ALLOWED',
      ipAddress: '10.0.1.102'
    },
    {
      id: 'AUD-007',
      timestamp: new Date(now - 1200000),
      userId: 'user-isso-001',
      userName: 'Jane Smith',
      action: 'VERIFY_CHAIN_INTEGRITY',
      resource: 'AUDIT-CHAIN',
      resourceType: 'audit',
      result: 'ALLOWED',
      ipAddress: '10.0.1.45'
    }
  ];
}

// =============================================================================
// SERVICE CLASS
// =============================================================================

class AccessControlService {
  private apiBaseUrl: string;

  constructor() {
    this.apiBaseUrl = '/api/v1/access-control';
  }

  /**
   * Get all access control data (sessions, audit log, roles, policies)
   */
  async getAccessControlData(): Promise<AccessControlData> {
    // In demo mode, return demo data
    if (config.demoMode) {
      return {
        sessions: generateDemoSessions(),
        auditLog: generateDemoAuditLog(),
        roleDefinitions: ROLE_DEFINITIONS,
        policies: DEFAULT_POLICIES,
        dataSource: 'DEMO',
        lastUpdated: new Date()
      };
    }

    // In production, try to fetch from API
    try {
      const [sessionsRes, auditRes] = await Promise.all([
        fetch(`${this.apiBaseUrl}/sessions`),
        fetch(`${this.apiBaseUrl}/audit?limit=50`)
      ]);

      if (!sessionsRes.ok || !auditRes.ok) {
        throw new Error('API request failed');
      }

      const sessions = await sessionsRes.json();
      const auditLog = await auditRes.json();

      return {
        sessions: sessions.data || [],
        auditLog: auditLog.data || [],
        roleDefinitions: ROLE_DEFINITIONS,
        policies: DEFAULT_POLICIES,
        dataSource: 'LIVE',
        lastUpdated: new Date()
      };
    } catch (error) {
      console.warn('[AccessControl] API unavailable, using demo data:', error);
      // Fall back to demo data if API is unavailable
      return {
        sessions: generateDemoSessions(),
        auditLog: generateDemoAuditLog(),
        roleDefinitions: ROLE_DEFINITIONS,
        policies: DEFAULT_POLICIES,
        dataSource: 'DEMO',
        lastUpdated: new Date()
      };
    }
  }

  /**
   * Get active sessions only
   */
  async getActiveSessions(): Promise<UserSession[]> {
    const data = await this.getAccessControlData();
    return data.sessions;
  }

  /**
   * Get audit log entries
   */
  async getAuditLog(limit: number = 50): Promise<AccessAuditEntry[]> {
    const data = await this.getAccessControlData();
    return data.auditLog.slice(0, limit);
  }

  /**
   * Get role definitions
   */
  getRoleDefinitions(): RoleDefinition[] {
    return ROLE_DEFINITIONS;
  }

  /**
   * Get policies
   */
  getPolicies(): AccessControlPolicy[] {
    return DEFAULT_POLICIES;
  }

  /**
   * Check if running in demo mode
   */
  isDemoMode(): boolean {
    return config.demoMode;
  }
}

// Export singleton instance
export const accessControlService = new AccessControlService();
export default accessControlService;
