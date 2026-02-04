/**
 * LLM Provider Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getLLMProvider,
  getProviderByType,
  getAvailableProviders,
  resetProvider,
  LLMProviderType,
  ModelTier,
  MockProvider
} from '../../llm';

describe('LLM Provider Factory', () => {
  beforeEach(() => {
    resetProvider();
    // Clear env vars
    delete process.env.LLM_PROVIDER;
    delete process.env.ACE_DEMO_MODE;
    delete process.env.ANTHROPIC_API_KEY;
  });

  describe('getLLMProvider', () => {
    it('should return mock provider in demo mode', () => {
      process.env.ACE_DEMO_MODE = 'true';
      const provider = getLLMProvider();
      expect(provider.providerType).toBe(LLMProviderType.MOCK);
    });

    it('should return same instance on subsequent calls', () => {
      process.env.ACE_DEMO_MODE = 'true';
      const provider1 = getLLMProvider();
      const provider2 = getLLMProvider();
      expect(provider1).toBe(provider2);
    });

    it('should return new instance when forceNew is true', () => {
      process.env.ACE_DEMO_MODE = 'true';
      const provider1 = getLLMProvider();
      const provider2 = getLLMProvider(true);
      expect(provider1).not.toBe(provider2);
    });

    it('should respect LLM_PROVIDER env var', () => {
      process.env.LLM_PROVIDER = 'mock';
      const provider = getLLMProvider();
      expect(provider.providerType).toBe(LLMProviderType.MOCK);
    });
  });

  describe('getProviderByType', () => {
    it('should return mock provider', () => {
      const provider = getProviderByType(LLMProviderType.MOCK);
      expect(provider.providerType).toBe(LLMProviderType.MOCK);
    });

    it('should return anthropic provider', () => {
      const provider = getProviderByType(LLMProviderType.ANTHROPIC_DIRECT);
      expect(provider.providerType).toBe(LLMProviderType.ANTHROPIC_DIRECT);
    });
  });

  describe('getAvailableProviders', () => {
    it('should return list of providers', () => {
      const providers = getAvailableProviders();
      expect(providers.length).toBeGreaterThan(0);
      expect(providers.find(p => p.type === LLMProviderType.MOCK)).toBeDefined();
    });

    it('should mark mock as always configured', () => {
      const providers = getAvailableProviders();
      const mock = providers.find(p => p.type === LLMProviderType.MOCK);
      expect(mock?.configured).toBe(true);
    });
  });
});

describe('MockProvider', () => {
  let provider: MockProvider;

  beforeEach(() => {
    provider = new MockProvider({});
  });

  describe('complete', () => {
    it('should return a response', async () => {
      const response = await provider.complete('Hello');
      expect(response.content).toBeDefined();
      expect(response.provider).toBe(LLMProviderType.MOCK);
    });

    it('should include usage stats', async () => {
      const response = await provider.complete('Hello');
      expect(response.usage).toBeDefined();
      expect(response.usage?.inputTokens).toBeGreaterThan(0);
    });

    it('should respect model tier', async () => {
      const response = await provider.complete('Hello', { tier: ModelTier.FAST });
      expect(response.model).toBe('mock-fast');
    });
  });

  describe('chat', () => {
    it('should handle message history', async () => {
      const response = await provider.chat([
        { role: 'user', content: 'Hello' },
        { role: 'assistant', content: 'Hi there' },
        { role: 'user', content: 'How are you?' }
      ]);
      expect(response.content).toBeDefined();
    });
  });

  describe('healthCheck', () => {
    it('should return healthy', async () => {
      const result = await provider.healthCheck();
      expect(result.healthy).toBe(true);
      expect(result.provider).toBe(LLMProviderType.MOCK);
    });
  });

  describe('getModelForTier', () => {
    it('should return correct model for advanced tier', () => {
      const model = provider.getModelForTier(ModelTier.ADVANCED);
      expect(model).toBe('mock-advanced');
    });

    it('should return correct model for fast tier', () => {
      const model = provider.getModelForTier(ModelTier.FAST);
      expect(model).toBe('mock-fast');
    });
  });
});
