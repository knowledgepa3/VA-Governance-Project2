/**
 * GOVERNANCE POLICY - User Access Control Dashboard
 * Live session management + RBAC configuration
 *
 * Integrates with:
 * - accessControlService for data fetching
 * - Real auth system when available
 * - Demo data in demo mode
 */

import React, { useState, useEffect } from 'react';
import {
  Users,
  ShieldCheck,
  Lock,
  Eye,
  UserCheck,
  ShieldAlert,
  Clock,
  Activity,
  Settings,
  ChevronDown,
  ChevronRight,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Key,
  Fingerprint,
  History,
  Shield,
  Database,
  RefreshCw
} from 'lucide-react';
import {
  accessControlService,
  UserSession,
  AccessAuditEntry,
  RoleDefinition,
  AccessControlPolicy,
  UserRole,
  ROLE_DEFINITIONS,
  DEFAULT_POLICIES
} from '../services/accessControlService';

export const GovernancePolicy: React.FC = () => {
  const [sessions, setSessions] = useState<UserSession[]>([]);
  const [auditLog, setAuditLog] = useState<AccessAuditEntry[]>([]);
  const [roleDefinitions] = useState<RoleDefinition[]>(ROLE_DEFINITIONS);
  const [policies] = useState<AccessControlPolicy[]>(DEFAULT_POLICIES);
  const [expandedRole, setExpandedRole] = useState<UserRole | null>(null);
  const [activeSection, setActiveSection] = useState<'sessions' | 'roles' | 'audit' | 'policies'>('sessions');
  const [dataSource, setDataSource] = useState<'LIVE' | 'DEMO'>('DEMO');
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  // Load data on mount
  useEffect(() => {
    loadData();

    // Refresh data periodically (every 30 seconds)
    const interval = setInterval(() => {
      loadData();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const data = await accessControlService.getAccessControlData();
      setSessions(data.sessions);
      setAuditLog(data.auditLog);
      setDataSource(data.dataSource);
      setLastUpdated(data.lastUpdated);
    } catch (error) {
      console.error('[GovernancePolicy] Error loading data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getTimeSince = (date: Date): string => {
    const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    return `${Math.floor(seconds / 3600)}h ago`;
  };

  const getRoleColor = (role: UserRole): string => {
    switch (role) {
      case UserRole.ISSO: return 'bg-slate-900 text-white';
      case UserRole.ADMIN: return 'bg-purple-600 text-white';
      case UserRole.FORENSIC_SME: return 'bg-blue-600 text-white';
      case UserRole.BD_MANAGER: return 'bg-cyan-600 text-white';
      case UserRole.CAPTURE_MANAGER: return 'bg-teal-600 text-white';
      case UserRole.ANALYST: return 'bg-indigo-600 text-white';
      case UserRole.AUDITOR: return 'bg-amber-600 text-white';
      case UserRole.VIEWER: return 'bg-slate-500 text-white';
      case UserRole.SANITIZATION_OFFICER: return 'bg-emerald-600 text-white';
      case UserRole.FEDERAL_AUDITOR: return 'bg-slate-300 text-slate-800';
      default: return 'bg-slate-500 text-white';
    }
  };

  const getRoleBorderColor = (role: UserRole): string => {
    switch (role) {
      case UserRole.ISSO: return 'border-slate-400';
      case UserRole.ADMIN: return 'border-purple-400';
      case UserRole.FORENSIC_SME: return 'border-blue-400';
      case UserRole.BD_MANAGER: return 'border-cyan-400';
      case UserRole.CAPTURE_MANAGER: return 'border-teal-400';
      case UserRole.ANALYST: return 'border-indigo-400';
      case UserRole.AUDITOR: return 'border-amber-400';
      case UserRole.VIEWER: return 'border-slate-400';
      case UserRole.SANITIZATION_OFFICER: return 'border-emerald-400';
      case UserRole.FEDERAL_AUDITOR: return 'border-slate-300';
      default: return 'border-slate-400';
    }
  };

  const getRoleDisplayName = (role: UserRole): string => {
    const def = roleDefinitions.find(r => r.role === role);
    return def?.displayName || role;
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 p-6">

      {/* Header Bar */}
      <div className="bg-slate-900 rounded-xl p-4 border border-slate-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-2 bg-blue-600 rounded-lg">
              <Lock size={18} className="text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">User Access Control</h1>
              <p className="text-xs text-slate-400">RBAC Policy Management • Active Sessions</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Data Source Indicator */}
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border ${
              dataSource === 'LIVE'
                ? 'bg-emerald-900/50 border-emerald-700'
                : 'bg-amber-900/50 border-amber-700'
            }`}>
              <Database size={12} className={dataSource === 'LIVE' ? 'text-emerald-400' : 'text-amber-400'} />
              <span className={`text-xs font-medium ${dataSource === 'LIVE' ? 'text-emerald-300' : 'text-amber-300'}`}>
                {dataSource === 'LIVE' ? 'Live Data' : 'Demo Mode'}
              </span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-900/50 border border-emerald-700 rounded-lg">
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
              <span className="text-xs text-emerald-300 font-medium">{sessions.length} Active Sessions</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg">
              <ShieldCheck size={14} className="text-blue-400" />
              <span className="text-xs text-slate-300 font-medium">MFA Enforced</span>
            </div>
            <button
              onClick={loadData}
              disabled={isLoading}
              className="p-2 bg-slate-800 border border-slate-700 rounded-lg hover:bg-slate-700 transition-colors"
              title="Refresh data"
            >
              <RefreshCw size={14} className={`text-slate-400 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Section Tabs */}
      <div className="flex gap-2">
        {[
          { id: 'sessions', label: 'Active Sessions', icon: Users },
          { id: 'roles', label: 'Role Definitions', icon: Shield },
          { id: 'audit', label: 'Access Log', icon: History },
          { id: 'policies', label: 'Policies', icon: Settings }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveSection(tab.id as any)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
              activeSection === tab.id
                ? 'bg-blue-600 text-white'
                : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white border border-slate-700'
            }`}
          >
            <tab.icon size={14} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Active Sessions Section */}
      {activeSection === 'sessions' && (
        <div className="space-y-4">
          {isLoading && sessions.length === 0 ? (
            <div className="bg-slate-800 rounded-xl p-8 text-center border border-slate-700">
              <RefreshCw size={32} className="text-slate-600 mx-auto mb-2 animate-spin" />
              <p className="text-slate-400">Loading sessions...</p>
            </div>
          ) : sessions.length > 0 ? (
            <div className="grid grid-cols-3 gap-4">
              {sessions.map(session => (
                <div
                  key={session.userId}
                  className={`bg-slate-800 rounded-xl border ${getRoleBorderColor(session.role)} p-4 hover:bg-slate-750 transition-all`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-slate-700 rounded-full flex items-center justify-center text-white font-bold text-sm">
                        {session.name.split(' ').map(n => n[0]).join('')}
                      </div>
                      <div>
                        <h3 className="text-white font-bold text-sm">{session.name}</h3>
                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${getRoleColor(session.role)}`}>
                          {session.role}
                        </span>
                      </div>
                    </div>
                    <div className={`w-2 h-2 rounded-full ${
                      (Date.now() - new Date(session.lastActive).getTime()) < 60000 ? 'bg-emerald-500' : 'bg-yellow-500'
                    }`}></div>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div className="flex items-center justify-between text-slate-400">
                      <span className="flex items-center gap-1"><Clock size={10} /> Last Active</span>
                      <span className="text-white">{getTimeSince(session.lastActive)}</span>
                    </div>
                    <div className="flex items-center justify-between text-slate-400">
                      <span className="flex items-center gap-1"><Activity size={10} /> Session</span>
                      <span className="text-white">{getTimeSince(session.sessionStart)}</span>
                    </div>
                    <div className="flex items-center justify-between text-slate-400">
                      <span className="flex items-center gap-1"><Fingerprint size={10} /> MFA</span>
                      <span className={session.mfaEnabled ? 'text-emerald-400' : 'text-red-400'}>
                        {session.mfaEnabled ? 'Enabled' : 'Disabled'}
                      </span>
                    </div>
                  </div>

                  <div className="mt-3 pt-3 border-t border-slate-700">
                    <div className="flex items-center gap-1 text-[9px] text-slate-500 font-mono">
                      <Key size={10} />
                      {session.userId} • {session.ipAddress}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-slate-800 rounded-xl p-8 text-center border border-slate-700">
              <Users size={32} className="text-slate-600 mx-auto mb-2" />
              <p className="text-slate-400">No active sessions</p>
            </div>
          )}
        </div>
      )}

      {/* Role Definitions Section */}
      {activeSection === 'roles' && (
        <div className="space-y-3">
          {roleDefinitions.map((def) => (
            <div
              key={def.role}
              className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden"
            >
              <button
                onClick={() => setExpandedRole(expandedRole === def.role ? null : def.role)}
                className="w-full flex items-center justify-between p-4 hover:bg-slate-750 transition-all"
              >
                <div className="flex items-center gap-4">
                  <span className={`px-3 py-1 rounded-lg text-xs font-bold ${getRoleColor(def.role)}`}>
                    {def.role}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-300 text-xs">{def.displayName}</span>
                    <span className="text-slate-600">•</span>
                    <span className="text-slate-400 text-xs">Level {def.level}</span>
                    <span className="text-slate-600">•</span>
                    <span className="text-slate-400 text-xs">{def.permissions.length} permissions</span>
                  </div>
                </div>
                {expandedRole === def.role ? (
                  <ChevronDown size={16} className="text-slate-400" />
                ) : (
                  <ChevronRight size={16} className="text-slate-400" />
                )}
              </button>

              {expandedRole === def.role && (
                <div className="px-4 pb-4 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="grid grid-cols-3 gap-4">
                    {/* Permissions */}
                    <div className="bg-slate-900 rounded-lg p-3">
                      <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Permissions</h4>
                      <div className="space-y-1 max-h-40 overflow-y-auto">
                        {def.permissions.map(p => (
                          <div key={p} className="flex items-center gap-2 text-xs">
                            <CheckCircle size={10} className="text-emerald-400 flex-shrink-0" />
                            <span className="text-slate-300 font-mono">{p}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Can Approve */}
                    <div className="bg-slate-900 rounded-lg p-3">
                      <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Approval Authority</h4>
                      <div className="space-y-1">
                        {def.canApprove.length > 0 ? def.canApprove.map(a => (
                          <div key={a} className="flex items-center gap-2 text-xs">
                            <UserCheck size={10} className="text-blue-400" />
                            <span className="text-slate-300">{a}</span>
                          </div>
                        )) : (
                          <span className="text-slate-500 text-xs">No approval authority</span>
                        )}
                      </div>
                    </div>

                    {/* Restrictions */}
                    <div className="bg-slate-900 rounded-lg p-3">
                      <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Restrictions</h4>
                      <div className="space-y-1">
                        {def.restrictions.length > 0 ? def.restrictions.map(r => (
                          <div key={r} className="flex items-center gap-2 text-xs">
                            <XCircle size={10} className="text-red-400" />
                            <span className="text-slate-400">{r}</span>
                          </div>
                        )) : (
                          <span className="text-emerald-400 text-xs">No restrictions (full access)</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Audit Log Section */}
      {activeSection === 'audit' && (
        <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
          <div className="p-4 border-b border-slate-700 flex items-center justify-between">
            <h3 className="text-sm font-bold text-white">Recent Access Events</h3>
            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-400">{auditLog.length} entries</span>
              {dataSource === 'DEMO' && (
                <span className="px-2 py-0.5 bg-amber-900/50 border border-amber-700 rounded text-[9px] text-amber-300 font-medium">
                  Demo Data
                </span>
              )}
            </div>
          </div>
          <div className="divide-y divide-slate-700">
            {auditLog.map(entry => (
              <div key={entry.id} className="p-3 flex items-center justify-between hover:bg-slate-750 transition-all">
                <div className="flex items-center gap-4">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    entry.result === 'ALLOWED' ? 'bg-emerald-900/50' :
                    entry.result === 'DENIED' ? 'bg-red-900/50' : 'bg-yellow-900/50'
                  }`}>
                    {entry.result === 'ALLOWED' ? (
                      <CheckCircle size={14} className="text-emerald-400" />
                    ) : entry.result === 'DENIED' ? (
                      <XCircle size={14} className="text-red-400" />
                    ) : (
                      <AlertTriangle size={14} className="text-yellow-400" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-white text-sm font-medium">{entry.action}</span>
                      <span className="text-slate-500 text-xs">on</span>
                      <span className="text-cyan-400 text-xs font-mono">{entry.resource}</span>
                    </div>
                    <div className="text-xs text-slate-500">
                      by {entry.userName || entry.userId} • {getTimeSince(entry.timestamp)}
                      {entry.reason && (
                        <span className="text-slate-600"> • {entry.reason}</span>
                      )}
                    </div>
                  </div>
                </div>
                <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                  entry.result === 'ALLOWED' ? 'bg-emerald-600 text-emerald-100' :
                  entry.result === 'DENIED' ? 'bg-red-600 text-red-100' : 'bg-yellow-600 text-yellow-100'
                }`}>
                  {entry.result}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Policies Section */}
      {activeSection === 'policies' && (
        <div className="grid grid-cols-2 gap-4">
          {policies.map(policy => (
            <div key={policy.id} className="bg-slate-800 rounded-xl border border-slate-700 p-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-cyan-400 text-[10px] font-mono">{policy.id}</span>
                    {policy.nistControl && (
                      <span className="text-slate-500 text-[9px] font-mono">({policy.nistControl})</span>
                    )}
                  </div>
                  <h3 className="text-white font-bold text-sm">{policy.name}</h3>
                </div>
                <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                  policy.status === 'ACTIVE' ? 'bg-emerald-600 text-white' : 'bg-slate-600 text-slate-300'
                }`}>
                  {policy.status}
                </span>
              </div>
              <p className="text-slate-400 text-xs mb-3">{policy.description}</p>
              <div className="flex items-center justify-between pt-3 border-t border-slate-700">
                <span className="text-slate-500 text-[10px] uppercase tracking-wider">Enforcement</span>
                <span className={`text-xs font-bold ${
                  policy.enforcement === 'STRICT' ? 'text-red-400' :
                  policy.enforcement === 'AUDIT' ? 'text-yellow-400' : 'text-blue-400'
                }`}>
                  {policy.enforcement}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between text-xs text-slate-500 pt-2">
        <span>NIST AI RMF Aligned • RBAC v2.0 • Data Source: {dataSource}</span>
        <span>Last updated: {lastUpdated.toLocaleTimeString()}</span>
      </div>
    </div>
  );
};

export default GovernancePolicy;
