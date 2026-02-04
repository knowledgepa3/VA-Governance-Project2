/**
 * Audit Log Repository Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  getAuditLogRepository,
  resetAuditLogRepository,
  InMemoryAuditLogRepository,
  toDbAuditEntry,
  toMaiAuditEntry
} from '../../db';
import { ActionType, PolicyDecision } from '../../maiRuntime';
import { MAIClassification } from '../../types';

describe('AuditLogRepository', () => {
  let repo: InMemoryAuditLogRepository;

  beforeEach(() => {
    resetAuditLogRepository();
    repo = new InMemoryAuditLogRepository();
  });

  describe('append', () => {
    it('should create audit entry', async () => {
      const entry = await repo.append({
        tenant_id: 'default',
        agent_id: 'agent-001',
        operator_id: 'user-001',
        action: 'NAVIGATE',
        target: 'https://example.com',
        classification: 'ADVISORY',
        policy_decision: 'ALLOW',
        reasoning: 'Test navigation'
      });

      expect(entry.id).toBeDefined();
      expect(entry.sequence_num).toBe(1);
      expect(entry.content_hash).toBeDefined();
      expect(entry.action).toBe('NAVIGATE');
    });

    it('should increment sequence numbers', async () => {
      const entry1 = await repo.append({
        tenant_id: 'default',
        agent_id: 'agent-001',
        operator_id: 'user-001',
        action: 'NAVIGATE',
        classification: 'ADVISORY',
        policy_decision: 'ALLOW'
      });

      const entry2 = await repo.append({
        tenant_id: 'default',
        agent_id: 'agent-001',
        operator_id: 'user-001',
        action: 'CLICK',
        classification: 'ADVISORY',
        policy_decision: 'ALLOW'
      });

      expect(entry2.sequence_num).toBe(entry1.sequence_num + 1);
    });

    it('should link hash chain', async () => {
      const entry1 = await repo.append({
        tenant_id: 'default',
        agent_id: 'agent-001',
        operator_id: 'user-001',
        action: 'NAVIGATE',
        classification: 'ADVISORY',
        policy_decision: 'ALLOW'
      });

      const entry2 = await repo.append({
        tenant_id: 'default',
        agent_id: 'agent-001',
        operator_id: 'user-001',
        action: 'CLICK',
        classification: 'ADVISORY',
        policy_decision: 'ALLOW'
      });

      expect(entry2.previous_hash).toBe(entry1.content_hash);
    });
  });

  describe('find', () => {
    beforeEach(async () => {
      await repo.append({
        tenant_id: 'default',
        agent_id: 'agent-001',
        operator_id: 'user-001',
        action: 'NAVIGATE',
        classification: 'ADVISORY',
        policy_decision: 'ALLOW'
      });
      await repo.append({
        tenant_id: 'default',
        agent_id: 'agent-002',
        operator_id: 'user-002',
        action: 'SUBMIT',
        classification: 'MANDATORY',
        policy_decision: 'REQUIRE_APPROVAL'
      });
      await repo.append({
        tenant_id: 'other',
        agent_id: 'agent-003',
        operator_id: 'user-003',
        action: 'CLICK',
        classification: 'INFORMATIONAL',
        policy_decision: 'ALLOW'
      });
    });

    it('should filter by tenant', async () => {
      const entries = await repo.find({ tenant_id: 'default' });
      expect(entries.length).toBe(2);
    });

    it('should filter by action', async () => {
      const entries = await repo.find({
        tenant_id: 'default',
        action: 'SUBMIT'
      });
      expect(entries.length).toBe(1);
      expect(entries[0].action).toBe('SUBMIT');
    });

    it('should filter by classification', async () => {
      const entries = await repo.find({
        tenant_id: 'default',
        classification: 'MANDATORY'
      });
      expect(entries.length).toBe(1);
    });

    it('should respect limit', async () => {
      const entries = await repo.find({
        tenant_id: 'default',
        limit: 1
      });
      expect(entries.length).toBe(1);
    });

    it('should order by sequence', async () => {
      const asc = await repo.find({ tenant_id: 'default', order: 'asc' });
      const desc = await repo.find({ tenant_id: 'default', order: 'desc' });

      expect(asc[0].sequence_num).toBeLessThan(asc[1].sequence_num);
      expect(desc[0].sequence_num).toBeGreaterThan(desc[1].sequence_num);
    });
  });

  describe('findById', () => {
    it('should find entry by ID', async () => {
      const created = await repo.append({
        tenant_id: 'default',
        agent_id: 'agent-001',
        operator_id: 'user-001',
        action: 'NAVIGATE',
        classification: 'ADVISORY',
        policy_decision: 'ALLOW'
      });

      const found = await repo.findById(created.id);
      expect(found).not.toBeNull();
      expect(found?.id).toBe(created.id);
    });

    it('should return null for non-existent ID', async () => {
      const found = await repo.findById('non-existent');
      expect(found).toBeNull();
    });
  });

  describe('verifyChain', () => {
    it('should verify valid chain', async () => {
      await repo.append({
        tenant_id: 'default',
        agent_id: 'agent-001',
        operator_id: 'user-001',
        action: 'NAVIGATE',
        classification: 'ADVISORY',
        policy_decision: 'ALLOW'
      });
      await repo.append({
        tenant_id: 'default',
        agent_id: 'agent-001',
        operator_id: 'user-001',
        action: 'CLICK',
        classification: 'ADVISORY',
        policy_decision: 'ALLOW'
      });

      const result = await repo.verifyChain('default');
      expect(result.valid).toBe(true);
      expect(result.entries_checked).toBe(2);
    });

    it('should return valid for empty chain', async () => {
      const result = await repo.verifyChain('default');
      expect(result.valid).toBe(true);
      expect(result.entries_checked).toBe(0);
    });
  });

  describe('exportForSIEM', () => {
    it('should export as JSON', async () => {
      await repo.append({
        tenant_id: 'default',
        agent_id: 'agent-001',
        operator_id: 'user-001',
        action: 'NAVIGATE',
        classification: 'ADVISORY',
        policy_decision: 'ALLOW'
      });

      const json = await repo.exportForSIEM({ tenant_id: 'default' });
      const parsed = JSON.parse(json);

      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed.length).toBe(1);
    });
  });
});

describe('Conversion Utilities', () => {
  describe('toDbAuditEntry', () => {
    it('should convert MAI entry to DB entry', () => {
      const maiEntry = {
        timestamp: new Date(),
        agentId: 'agent-001',
        operatorId: 'user-001',
        action: ActionType.SUBMIT,
        target: '/api/submit',
        classification: MAIClassification.MANDATORY,
        policyDecision: PolicyDecision.REQUIRE_APPROVAL,
        reasoning: 'Form submission',
        hash: 'abc123'
      };

      const dbEntry = toDbAuditEntry(maiEntry, 'default', 'session-001');

      expect(dbEntry.tenant_id).toBe('default');
      expect(dbEntry.agent_id).toBe('agent-001');
      expect(dbEntry.session_id).toBe('session-001');
      expect(dbEntry.action).toBe('SUBMIT');
      expect(dbEntry.classification).toBe('MANDATORY');
    });
  });

  describe('toMaiAuditEntry', () => {
    it('should convert DB entry to MAI entry', () => {
      const dbEntry = {
        id: 'entry-001',
        tenant_id: 'default',
        sequence_num: 1,
        timestamp: new Date(),
        agent_id: 'agent-001',
        operator_id: 'user-001',
        action: 'SUBMIT',
        target: '/api/submit',
        classification: 'MANDATORY',
        policy_decision: 'REQUIRE_APPROVAL',
        reasoning: 'Form submission',
        context: {},
        content_hash: 'abc123',
        created_at: new Date()
      };

      const maiEntry = toMaiAuditEntry(dbEntry);

      expect(maiEntry.agentId).toBe('agent-001');
      expect(maiEntry.action).toBe(ActionType.SUBMIT);
      expect(maiEntry.classification).toBe(MAIClassification.MANDATORY);
      expect(maiEntry.hash).toBe('abc123');
    });
  });
});
