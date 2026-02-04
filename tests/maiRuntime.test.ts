/**
 * MAI Runtime Tests
 *
 * Tests for the core governance engine.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  MAIRuntime,
  ActionType,
  PolicyDecision,
  DEFAULT_POLICIES
} from '../maiRuntime';
import { MAIClassification } from '../types';

describe('MAIRuntime', () => {
  let runtime: MAIRuntime;

  beforeEach(() => {
    runtime = new MAIRuntime();
  });

  describe('evaluateAction', () => {
    describe('NO_AUTH policy', () => {
      it('should deny authentication actions', async () => {
        const decision = await runtime.evaluateAction({
          url: 'https://example.com/login',
          domain: 'example.com',
          action: ActionType.AUTH,
          classification: MAIClassification.ADVISORY,
          operatorId: 'user-001'
        });

        expect(decision).toBe(PolicyDecision.DENY);
      });

      it('should deny password input', async () => {
        const decision = await runtime.evaluateAction({
          url: 'https://example.com',
          domain: 'example.com',
          action: ActionType.TYPE,
          target: '#password-field',
          value: 'mypassword',
          classification: MAIClassification.ADVISORY,
          operatorId: 'user-001'
        });

        expect(decision).toBe(PolicyDecision.DENY);
      });

      it('should deny login button clicks', async () => {
        const decision = await runtime.evaluateAction({
          url: 'https://example.com',
          domain: 'example.com',
          action: ActionType.CLICK,
          target: 'Login Button',
          classification: MAIClassification.ADVISORY,
          operatorId: 'user-001'
        });

        expect(decision).toBe(PolicyDecision.DENY);
      });
    });

    describe('NO_CAPTCHA policy', () => {
      it('should deny CAPTCHA actions', async () => {
        const decision = await runtime.evaluateAction({
          url: 'https://example.com',
          domain: 'example.com',
          action: ActionType.CAPTCHA,
          classification: MAIClassification.ADVISORY,
          operatorId: 'user-001'
        });

        expect(decision).toBe(PolicyDecision.DENY);
      });

      it('should deny reCAPTCHA interactions', async () => {
        const decision = await runtime.evaluateAction({
          url: 'https://example.com',
          domain: 'example.com',
          action: ActionType.CLICK,
          target: 'recaptcha-checkbox',
          classification: MAIClassification.ADVISORY,
          operatorId: 'user-001'
        });

        expect(decision).toBe(PolicyDecision.DENY);
      });
    });

    describe('APPROVE_SUBMISSIONS policy', () => {
      it('should require approval for form submissions', async () => {
        const decision = await runtime.evaluateAction({
          url: 'https://example.com/form',
          domain: 'example.com',
          action: ActionType.SUBMIT,
          classification: MAIClassification.ADVISORY,
          operatorId: 'user-001'
        });

        expect(decision).toBe(PolicyDecision.REQUIRE_APPROVAL);
      });
    });

    describe('NO_EXTERNAL_SHARE policy', () => {
      it('should require attestation for external sharing', async () => {
        const decision = await runtime.evaluateAction({
          url: 'https://example.com',
          domain: 'example.com',
          action: ActionType.EXTERNAL_SHARE,
          classification: MAIClassification.ADVISORY,
          operatorId: 'user-001'
        });

        expect(decision).toBe(PolicyDecision.REQUIRE_ATTESTATION);
      });
    });

    describe('BLOCKED_DOMAINS policy', () => {
      it('should deny blocked domains', async () => {
        runtime.blockDomain('blocked.com');

        const decision = await runtime.evaluateAction({
          url: 'https://blocked.com/page',
          domain: 'blocked.com',
          action: ActionType.NAVIGATE,
          classification: MAIClassification.ADVISORY,
          operatorId: 'user-001'
        });

        expect(decision).toBe(PolicyDecision.DENY);
      });
    });

    describe('MANDATORY classification', () => {
      it('should require approval for MANDATORY actions', async () => {
        const decision = await runtime.evaluateAction({
          url: 'https://example.com',
          domain: 'example.com',
          action: ActionType.CLICK,
          classification: MAIClassification.MANDATORY,
          operatorId: 'user-001'
        });

        expect(decision).toBe(PolicyDecision.REQUIRE_APPROVAL);
      });
    });

    describe('Safe actions', () => {
      it('should allow safe navigation', async () => {
        const decision = await runtime.evaluateAction({
          url: 'https://example.com/page',
          domain: 'example.com',
          action: ActionType.NAVIGATE,
          classification: MAIClassification.INFORMATIONAL,
          operatorId: 'user-001'
        });

        expect(decision).toBe(PolicyDecision.ALLOW);
      });

      it('should allow screenshots', async () => {
        const decision = await runtime.evaluateAction({
          url: 'https://example.com',
          domain: 'example.com',
          action: ActionType.SCREENSHOT,
          classification: MAIClassification.INFORMATIONAL,
          operatorId: 'user-001'
        });

        expect(decision).toBe(PolicyDecision.ALLOW);
      });

      it('should allow data extraction', async () => {
        const decision = await runtime.evaluateAction({
          url: 'https://example.com',
          domain: 'example.com',
          action: ActionType.EXTRACT,
          classification: MAIClassification.ADVISORY,
          operatorId: 'user-001'
        });

        expect(decision).toBe(PolicyDecision.ALLOW);
      });
    });
  });

  describe('recordApproval', () => {
    it('should record approval in audit log', () => {
      const context = {
        url: 'https://example.com',
        domain: 'example.com',
        action: ActionType.SUBMIT,
        classification: MAIClassification.MANDATORY,
        operatorId: 'user-001'
      };

      runtime.recordApproval(context, true, 'approver-001');
      const log = runtime.getAuditLog();

      const entry = log.find(e =>
        e.policyDecision === PolicyDecision.ALLOW &&
        e.approved === true
      );
      expect(entry).toBeDefined();
      expect(entry?.approver).toBe('approver-001');
    });

    it('should record rejection', () => {
      const context = {
        url: 'https://example.com',
        domain: 'example.com',
        action: ActionType.SUBMIT,
        classification: MAIClassification.MANDATORY,
        operatorId: 'user-001'
      };

      runtime.recordApproval(context, false, 'approver-001');
      const log = runtime.getAuditLog();

      const entry = log.find(e => e.approved === false);
      expect(entry).toBeDefined();
      expect(entry?.policyDecision).toBe(PolicyDecision.DENY);
    });
  });

  describe('getAuditLog', () => {
    it('should return copy of audit log', async () => {
      await runtime.evaluateAction({
        url: 'https://example.com',
        domain: 'example.com',
        action: ActionType.NAVIGATE,
        classification: MAIClassification.INFORMATIONAL,
        operatorId: 'user-001'
      });

      const log1 = runtime.getAuditLog();
      const log2 = runtime.getAuditLog();

      expect(log1).not.toBe(log2);
      expect(log1).toEqual(log2);
    });
  });

  describe('exportAuditLogForSIEM', () => {
    it('should export as JSON', async () => {
      await runtime.evaluateAction({
        url: 'https://example.com',
        domain: 'example.com',
        action: ActionType.NAVIGATE,
        classification: MAIClassification.INFORMATIONAL,
        operatorId: 'user-001'
      });

      const json = runtime.exportAuditLogForSIEM();
      const parsed = JSON.parse(json);

      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed.length).toBeGreaterThan(0);
    });
  });

  describe('generateEvidencePack', () => {
    it('should create evidence pack', async () => {
      await runtime.evaluateAction({
        url: 'https://example.com',
        domain: 'example.com',
        action: ActionType.NAVIGATE,
        classification: MAIClassification.INFORMATIONAL,
        operatorId: 'user-001'
      });

      const pack = runtime.generateEvidencePack(
        'exec-001',
        'playbook-001',
        '1.0.0',
        'agent-001',
        'operator-001',
        [{ stepId: 'step-1', stepName: 'Navigate', timestamp: new Date(), duration: 100, status: 'completed' }],
        [],
        [],
        [],
        { summary: 'Test', findings: [], recommendations: [], completeness: 100 }
      );

      expect(pack.executionId).toBe('exec-001');
      expect(pack.playbookId).toBe('playbook-001');
      expect(pack.auditLog.length).toBeGreaterThan(0);
      expect(pack.packHash).toBeDefined();
    });
  });

  describe('Domain management', () => {
    it('should allow adding domains to allow list', () => {
      runtime.allowDomain('allowed.com');
      // Domain allow list is internal, but should not throw
    });

    it('should allow adding domains to block list', async () => {
      runtime.blockDomain('blocked.com');

      const decision = await runtime.evaluateAction({
        url: 'https://blocked.com',
        domain: 'blocked.com',
        action: ActionType.NAVIGATE,
        classification: MAIClassification.INFORMATIONAL,
        operatorId: 'user-001'
      });

      expect(decision).toBe(PolicyDecision.DENY);
    });
  });

  describe('Custom policy rules', () => {
    it('should allow adding custom rules', async () => {
      runtime.addPolicyRule({
        id: 'custom-rule',
        name: 'Custom Test Rule',
        description: 'Blocks all clicks on test.com',
        condition: (action, context) => {
          return action === ActionType.CLICK && context.domain === 'test.com';
        },
        decision: PolicyDecision.DENY
      });

      const decision = await runtime.evaluateAction({
        url: 'https://test.com',
        domain: 'test.com',
        action: ActionType.CLICK,
        classification: MAIClassification.INFORMATIONAL,
        operatorId: 'user-001'
      });

      expect(decision).toBe(PolicyDecision.DENY);
    });
  });
});
