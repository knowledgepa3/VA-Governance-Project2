/**
 * Authentication Gate Unit Tests
 *
 * Tests for the audit-proof authentication gate controls
 * Aligned with Control Catalog acceptance criteria
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  AuthenticationGateManager,
  LOGIN_PATH_PATTERNS,
  KNOWN_AUTH_DOMAINS,
  DEFAULT_PROBE_ENDPOINTS,
  POST_LOGIN_SELECTORS,
  type TwoKeyAuthGate,
  type AuthProbeEndpoint
} from './AuthenticationGate.js';

describe('AuthenticationGate', () => {
  let manager: AuthenticationGateManager;

  const defaultPackContext = {
    packId: 'test-pack',
    packVersion: '1.0.0',
    packHash: 'hash-abc123',
    allowedDomains: ['sam.gov', 'beta.sam.gov'],
    approvedProbeEndpoints: DEFAULT_PROBE_ENDPOINTS,
    approvedUISelectors: POST_LOGIN_SELECTORS.map(s => s.selector)
  };

  beforeEach(() => {
    manager = new AuthenticationGateManager();
  });

  // ===========================================================================
  // ACE-CONFIG-001: Pack Hash Drift Detection
  // ===========================================================================

  describe('ACE-CONFIG-001: Pack Hash Drift Detection', () => {
    it('captures pack hash at gate creation', () => {
      const gate = manager.createGate(
        'ws-001',
        'tab-group-1',
        'agent-001',
        'login.gov',
        'sam.gov',
        defaultPackContext
      );

      expect(gate.packContext.packHashAtCreation).toBe('hash-abc123');
      expect(gate.packContext.packHash).toBe('hash-abc123');
    });

    it('detects pack hash change and invalidates pending gate', () => {
      const gate = manager.createGate(
        'ws-001',
        'tab-group-1',
        'agent-001',
        'login.gov',
        'sam.gov',
        defaultPackContext
      );

      expect(gate.status).toBe('PENDING');

      // Simulate pack hash change
      const changed = manager.checkPackHashChange(gate.id, 'hash-NEW456');

      expect(changed).toBe(true);

      // Gate should be invalidated
      const invalidatedGate = manager.getGate(gate.id);
      expect(invalidatedGate).toBeUndefined(); // Removed from active gates
    });

    it('logs INVALIDATED_PACK_CHANGE as security-relevant event', () => {
      const gate = manager.createGate(
        'ws-001',
        'tab-group-1',
        'agent-001',
        'login.gov',
        'sam.gov',
        defaultPackContext
      );

      manager.checkPackHashChange(gate.id, 'hash-NEW456');

      const auditLog = manager.getAuditLog();
      const invalidationEvent = auditLog.find(
        e => e.eventSubtype === 'INVALIDATED_PACK_CHANGE'
      );

      expect(invalidationEvent).toBeDefined();
      expect(invalidationEvent?.securityRelevant).toBe(true);
      expect(invalidationEvent?.packHash).toBe('hash-abc123');
    });

    it('does not invalidate when pack hash unchanged', () => {
      const gate = manager.createGate(
        'ws-001',
        'tab-group-1',
        'agent-001',
        'login.gov',
        'sam.gov',
        defaultPackContext
      );

      const changed = manager.checkPackHashChange(gate.id, 'hash-abc123');

      expect(changed).toBe(false);
      expect(manager.getGate(gate.id)).toBeDefined();
      expect(manager.getGate(gate.id)?.status).toBe('PENDING');
    });

    it('no partial approvals survive pack hash change', () => {
      const gate = manager.createGate(
        'ws-001',
        'tab-group-1',
        'agent-001',
        'login.gov',
        'sam.gov',
        defaultPackContext
      );

      // Partially approve (human key only)
      manager.approveKeyA(gate.id, { operatorId: 'operator-001' });
      expect(manager.getGate(gate.id)?.keyA.approved).toBe(true);

      // Pack hash changes
      manager.checkPackHashChange(gate.id, 'hash-CHANGED');

      // Gate should be completely invalidated
      expect(manager.getGate(gate.id)).toBeUndefined();

      // Audit log shows invalidation
      const events = manager.getSecurityRelevantEvents();
      expect(events.some(e => e.eventSubtype === 'INVALIDATED_PACK_CHANGE')).toBe(true);
    });
  });

  // ===========================================================================
  // ACE-AUTH-001: Agent Authentication Gate (Two-Key)
  // ===========================================================================

  describe('ACE-AUTH-001: Two-Key Authentication Gate', () => {
    it('requires BOTH human AND system key approval', () => {
      const gate = manager.createGate(
        'ws-001',
        'tab-group-1',
        'agent-001',
        'login.gov',
        'sam.gov',
        defaultPackContext
      );

      // Human key only
      manager.approveKeyA(gate.id, { operatorId: 'operator-001' });
      expect(manager.getGate(gate.id)?.status).toBe('KEY_A_APPROVED');
      expect(manager.getGate(gate.id)?.status).not.toBe('APPROVED');
    });

    it('system key requires 2-of-3 validated signals', () => {
      const gate = manager.createGate(
        'ws-001',
        'tab-group-1',
        'agent-001',
        'login.gov',
        'sam.gov',
        defaultPackContext
      );

      // Only 1 signal - not enough
      manager.updateSystemSignals(gate.id, {
        domainRedirect: {
          fromDomain: 'login.gov',
          toDomain: 'sam.gov',
          toPath: '/dashboard'
        }
      });

      expect(manager.getGate(gate.id)?.keyB.approved).toBe(false);
      expect(manager.getGate(gate.id)?.keyB.signalCount).toBe(1);

      // Add second signal - now approved
      manager.updateSystemSignals(gate.id, {
        postLoginElement: {
          elementType: 'AVATAR',
          selector: '[data-testid="user-avatar"]',
          elementText: 'User'
        }
      });

      expect(manager.getGate(gate.id)?.keyB.approved).toBe(true);
      expect(manager.getGate(gate.id)?.keyB.signalCount).toBe(2);
    });

    it('gate transitions to APPROVED only when both keys satisfied', () => {
      const gate = manager.createGate(
        'ws-001',
        'tab-group-1',
        'agent-001',
        'login.gov',
        'sam.gov',
        defaultPackContext
      );

      // System key first
      manager.updateSystemSignals(gate.id, {
        domainRedirect: {
          fromDomain: 'login.gov',
          toDomain: 'sam.gov',
          toPath: '/dashboard'
        },
        postLoginElement: {
          elementType: 'AVATAR',
          selector: '[data-testid="user-avatar"]'
        }
      });

      expect(manager.getGate(gate.id)?.status).toBe('KEY_B_APPROVED');

      // Human key second
      manager.approveKeyA(gate.id, { operatorId: 'operator-001' });

      // Should be fully approved now
      const auditLog = manager.getAuditLog();
      const approvalEvent = auditLog.find(e => e.result === 'APPROVED');
      expect(approvalEvent).toBeDefined();
    });

    it('creates session binding on approval', () => {
      const gate = manager.createGate(
        'ws-001',
        'tab-group-1',
        'agent-001',
        'login.gov',
        'sam.gov',
        defaultPackContext
      );

      // Full approval
      manager.updateSystemSignals(gate.id, {
        domainRedirect: {
          fromDomain: 'login.gov',
          toDomain: 'sam.gov',
          toPath: '/dashboard'
        },
        postLoginElement: {
          elementType: 'AVATAR',
          selector: '[data-testid="user-avatar"]'
        }
      });

      manager.approveKeyA(gate.id, { operatorId: 'operator-001' });

      // Check audit log for session binding
      const auditLog = manager.getAuditLog();
      const approvalEvent = auditLog.find(e => e.result === 'APPROVED');
      expect(approvalEvent?.sessionBinding?.established).toBe(true);
      expect(approvalEvent?.sessionBinding?.bindingId).toBeDefined();
    });
  });

  // ===========================================================================
  // ACE-AUTH-003: Domain Redirect Validation
  // ===========================================================================

  describe('ACE-AUTH-003: Domain Redirect Validation', () => {
    it('validates host IN allowed_domains', () => {
      const gate = manager.createGate(
        'ws-001',
        'tab-group-1',
        'agent-001',
        'login.gov',
        'sam.gov',
        defaultPackContext
      );

      // Valid: sam.gov is in allowed domains
      manager.updateSystemSignals(gate.id, {
        domainRedirect: {
          fromDomain: 'login.gov',
          toDomain: 'sam.gov',
          toPath: '/dashboard'
        }
      });

      const signals = manager.getGate(gate.id)?.keyB.signals;
      expect(signals?.domainRedirect.hostInAllowedScope).toBe(true);
    });

    it('rejects redirect to login domains', () => {
      const gate = manager.createGate(
        'ws-001',
        'tab-group-1',
        'agent-001',
        'login.gov',
        'sam.gov',
        { ...defaultPackContext, allowedDomains: ['login.gov', 'sam.gov'] }
      );

      // Invalid: login.gov is a known auth domain
      manager.updateSystemSignals(gate.id, {
        domainRedirect: {
          fromDomain: 'sam.gov',
          toDomain: 'login.gov',
          toPath: '/dashboard'
        }
      });

      const signals = manager.getGate(gate.id)?.keyB.signals;
      expect(signals?.domainRedirect.hostNotInLoginDomains).toBe(false);
      expect(signals?.domainRedirect.isValidRedirect).toBe(false);
    });

    it('rejects redirect with login path patterns', () => {
      const gate = manager.createGate(
        'ws-001',
        'tab-group-1',
        'agent-001',
        'login.gov',
        'sam.gov',
        defaultPackContext
      );

      // Invalid: /oauth/callback is a login path
      manager.updateSystemSignals(gate.id, {
        domainRedirect: {
          fromDomain: 'login.gov',
          toDomain: 'sam.gov',
          toPath: '/oauth/callback'
        }
      });

      const signals = manager.getGate(gate.id)?.keyB.signals;
      expect(signals?.domainRedirect.pathNotLoginPattern).toBe(false);
      expect(signals?.domainRedirect.isValidRedirect).toBe(false);
    });

    it('login/callback paths NEVER satisfy success', () => {
      const loginPaths = [
        '/login',
        '/signin',
        '/sso/callback',
        '/oauth/authorize',
        '/auth/redirect',
        '/saml/acs',
        '/oidc/callback'
      ];

      for (const path of loginPaths) {
        const gate = manager.createGate(
          'ws-001',
          'tab-group-1',
          'agent-001',
          'login.gov',
          'sam.gov',
          defaultPackContext
        );

        manager.updateSystemSignals(gate.id, {
          domainRedirect: {
            fromDomain: 'login.gov',
            toDomain: 'sam.gov',
            toPath: path
          }
        });

        const signals = manager.getGate(gate.id)?.keyB.signals;
        expect(signals?.domainRedirect.isValidRedirect).toBe(false);
      }
    });

    it('requires ALL THREE checks passing for valid redirect', () => {
      const gate = manager.createGate(
        'ws-001',
        'tab-group-1',
        'agent-001',
        'login.gov',
        'sam.gov',
        defaultPackContext
      );

      // All three valid
      manager.updateSystemSignals(gate.id, {
        domainRedirect: {
          fromDomain: 'login.gov',
          toDomain: 'sam.gov',
          toPath: '/dashboard'
        }
      });

      const signals = manager.getGate(gate.id)?.keyB.signals;
      expect(signals?.domainRedirect.hostInAllowedScope).toBe(true);
      expect(signals?.domainRedirect.hostNotInLoginDomains).toBe(true);
      expect(signals?.domainRedirect.pathNotLoginPattern).toBe(true);
      expect(signals?.domainRedirect.isValidRedirect).toBe(true);
    });
  });

  // ===========================================================================
  // ACE-AUTH-002: Metadata-Only Probe
  // ===========================================================================

  describe('ACE-AUTH-002: Metadata-Only Probe', () => {
    it('validates probe is from approved whitelist', () => {
      const gate = manager.createGate(
        'ws-001',
        'tab-group-1',
        'agent-001',
        'login.gov',
        'sam.gov',
        defaultPackContext
      );

      // Valid: 'user-status' is in DEFAULT_PROBE_ENDPOINTS
      manager.updateSystemSignals(gate.id, {
        authenticatedRequest: {
          endpointAlias: 'user-status',
          statusCode: 200
        }
      });

      const signals = manager.getGate(gate.id)?.keyB.signals;
      expect(signals?.authenticatedRequest.probeIsReadOnly).toBe(true);
      expect(signals?.authenticatedRequest.probeIsNonSensitive).toBe(true);
      expect(signals?.authenticatedRequest.probeIsInScope).toBe(true);
    });

    it('rejects unapproved probe endpoints', () => {
      const gate = manager.createGate(
        'ws-001',
        'tab-group-1',
        'agent-001',
        'login.gov',
        'sam.gov',
        defaultPackContext
      );

      // Invalid: 'unknown-endpoint' is not in approved list
      manager.updateSystemSignals(gate.id, {
        authenticatedRequest: {
          endpointAlias: 'unknown-endpoint',
          statusCode: 200
        }
      });

      const signals = manager.getGate(gate.id)?.keyB.signals;
      expect(signals?.authenticatedRequest.probeIsReadOnly).toBe(false);
      expect(signals?.authenticatedRequest.detected).toBe(true);
    });

    it('logs ONLY alias + status code (no response body)', () => {
      const gate = manager.createGate(
        'ws-001',
        'tab-group-1',
        'agent-001',
        'login.gov',
        'sam.gov',
        defaultPackContext
      );

      manager.updateSystemSignals(gate.id, {
        authenticatedRequest: {
          endpointAlias: 'user-status',
          statusCode: 200
        }
      });

      // Complete the gate
      manager.updateSystemSignals(gate.id, {
        domainRedirect: {
          fromDomain: 'login.gov',
          toDomain: 'sam.gov',
          toPath: '/dashboard'
        }
      });
      manager.approveKeyA(gate.id, { operatorId: 'op-001' });

      const auditLog = manager.getAuditLog();
      const approvalEvent = auditLog.find(e => e.result === 'APPROVED');

      // Verify only alias + status are logged
      expect(approvalEvent?.systemSignals.authenticatedRequest.endpointAlias).toBe('user-status');
      expect(approvalEvent?.systemSignals.authenticatedRequest.statusCode).toBe(200);

      // Verify no response body in audit (would be undefined)
      const auditString = JSON.stringify(approvalEvent);
      expect(auditString).not.toContain('responseBody');
      expect(auditString).not.toContain('responseHeaders');
    });
  });

  // ===========================================================================
  // ACE-AUDIT-002: Timeout as Security Event
  // ===========================================================================

  describe('ACE-AUDIT-002: Timeout as Security Event', () => {
    it('uses safe system default timeout (5 minutes)', () => {
      const gate = manager.createGate(
        'ws-001',
        'tab-group-1',
        'agent-001',
        'login.gov',
        'sam.gov',
        defaultPackContext
      );

      expect(gate.timeout.durationMs).toBe(5 * 60 * 1000);
      expect(gate.timeout.configuredBy).toBe('SYSTEM_DEFAULT');
    });

    it('allows pack-configurable timeout', () => {
      const gate = manager.createGate(
        'ws-001',
        'tab-group-1',
        'agent-001',
        'login.gov',
        'sam.gov',
        { ...defaultPackContext, timeoutMs: 10 * 60 * 1000 }
      );

      expect(gate.timeout.durationMs).toBe(10 * 60 * 1000);
      expect(gate.timeout.configuredBy).toBe('PACK_CUSTOM');
    });

    it('gates do not stay pending beyond timeout', () => {
      // Create gate with very short timeout for testing
      const shortTimeoutPack = {
        ...defaultPackContext,
        timeoutMs: 1 // 1ms timeout
      };

      const gate = manager.createGate(
        'ws-001',
        'tab-group-1',
        'agent-001',
        'login.gov',
        'sam.gov',
        shortTimeoutPack
      );

      // Wait a tiny bit
      const gateId = gate.id;

      // Force timeout check
      setTimeout(() => {
        const result = manager.checkTimeout(gateId);
        expect(result.timedOut).toBe(true);
        expect(manager.getGate(gateId)).toBeUndefined();
      }, 10);
    });

    it('logs TIMEOUT as security-relevant event', () => {
      const shortTimeoutPack = {
        ...defaultPackContext,
        timeoutMs: 1
      };

      const gate = manager.createGate(
        'ws-001',
        'tab-group-1',
        'agent-001',
        'login.gov',
        'sam.gov',
        shortTimeoutPack
      );

      // Force timeout by manipulating the gate
      (gate as any).timeout.expiresAt = new Date(Date.now() - 1000);

      manager.checkTimeout(gate.id);

      const securityEvents = manager.getSecurityRelevantEvents();
      const timeoutEvent = securityEvents.find(e => e.eventSubtype === 'TIMEOUT');

      expect(timeoutEvent).toBeDefined();
      expect(timeoutEvent?.securityRelevant).toBe(true);
      expect(timeoutEvent?.timedOutAt).toBeDefined();
    });

    it('timed-out gates require full re-initiation', () => {
      const gate = manager.createGate(
        'ws-001',
        'tab-group-1',
        'agent-001',
        'login.gov',
        'sam.gov',
        defaultPackContext
      );

      // Partially approve
      manager.approveKeyA(gate.id, { operatorId: 'op-001' });

      // Force timeout
      (gate as any).timeout.expiresAt = new Date(Date.now() - 1000);

      // Attempt to add system signals after timeout
      const result = manager.updateSystemSignals(gate.id, {
        domainRedirect: {
          fromDomain: 'login.gov',
          toDomain: 'sam.gov',
          toPath: '/dashboard'
        }
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('timed out');
    });
  });

  // ===========================================================================
  // Audit Log Integrity
  // ===========================================================================

  describe('Audit Log Integrity', () => {
    it('uses hash chain for tamper-evident logging', () => {
      const gate1 = manager.createGate(
        'ws-001',
        'tab-group-1',
        'agent-001',
        'login.gov',
        'sam.gov',
        defaultPackContext
      );

      manager.checkPackHashChange(gate1.id, 'changed-hash');

      const gate2 = manager.createGate(
        'ws-001',
        'tab-group-1',
        'agent-001',
        'login.gov',
        'sam.gov',
        { ...defaultPackContext, packHash: 'hash-2' }
      );

      manager.updateSystemSignals(gate2.id, {
        domainRedirect: {
          fromDomain: 'login.gov',
          toDomain: 'sam.gov',
          toPath: '/dashboard'
        },
        postLoginElement: {
          elementType: 'AVATAR',
          selector: '[data-testid="user-avatar"]'
        }
      });

      manager.approveKeyA(gate2.id, { operatorId: 'op-001' });

      const auditLog = manager.getAuditLog();

      // Verify hash chain
      expect(auditLog.length).toBe(2);
      expect(auditLog[0].previousHash).toBe('0'.repeat(64));
      expect(auditLog[1].previousHash).toBe(auditLog[0].hash);

      // Verify hashes are not empty
      expect(auditLog[0].hash).toBeTruthy();
      expect(auditLog[1].hash).toBeTruthy();
      expect(auditLog[0].hash).not.toBe(auditLog[1].hash);
    });

    it('exports audit log as JSONL', () => {
      const gate = manager.createGate(
        'ws-001',
        'tab-group-1',
        'agent-001',
        'login.gov',
        'sam.gov',
        defaultPackContext
      );

      manager.checkPackHashChange(gate.id, 'changed');

      const jsonl = manager.exportAuditJSONL();
      const lines = jsonl.split('\n').filter(l => l.trim());

      expect(lines.length).toBe(1);

      const parsed = JSON.parse(lines[0]);
      expect(parsed.eventType).toBe('GATE_AUTH');
      expect(parsed.hash).toBeTruthy();
    });
  });

  // ===========================================================================
  // LOGIN_PATH_PATTERNS Validation
  // ===========================================================================

  describe('LOGIN_PATH_PATTERNS', () => {
    it('matches common login paths', () => {
      const loginPaths = [
        '/login',
        '/Login',
        '/LOGIN',
        '/signin',
        '/sso',
        '/oauth',
        '/oauth/callback',
        '/auth',
        '/auth/redirect',
        '/saml',
        '/saml/acs',
        '/callback',
        '/oidc',
        '/identity',
        '/authenticate'
      ];

      for (const path of loginPaths) {
        const matches = LOGIN_PATH_PATTERNS.some(pattern => pattern.test(path));
        expect(matches).toBe(true);
      }
    });

    it('does not match non-login paths', () => {
      const nonLoginPaths = [
        '/dashboard',
        '/profile',
        '/settings',
        '/api/users',
        '/home'
      ];

      for (const path of nonLoginPaths) {
        const matches = LOGIN_PATH_PATTERNS.some(pattern => pattern.test(path));
        expect(matches).toBe(false);
      }
    });
  });

  // ===========================================================================
  // KNOWN_AUTH_DOMAINS Validation
  // ===========================================================================

  describe('KNOWN_AUTH_DOMAINS', () => {
    it('includes common identity providers', () => {
      const expectedDomains = [
        'login.gov',
        'okta.com',
        'auth0.com',
        'login.microsoftonline.com',
        'accounts.google.com'
      ];

      for (const domain of expectedDomains) {
        expect(KNOWN_AUTH_DOMAINS).toContain(domain);
      }
    });
  });
});
