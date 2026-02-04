# LLM Provider Migration Guide

This document explains how to migrate existing code from direct Anthropic imports to the abstraction layer.

## Why Migrate?

The abstraction layer enables:
- **FedRAMP compliance** - Switch to Bedrock/Azure Gov without code changes
- **Vendor flexibility** - Not locked to one provider
- **Testability** - Easy mocking for tests
- **Consistent governance** - All LLM calls go through one interface

## Quick Migration

### Before (Direct Anthropic)

```typescript
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const response = await client.messages.create({
  model: 'claude-sonnet-4-20250514',
  max_tokens: 4096,
  system: 'You are a helpful assistant',
  messages: [{ role: 'user', content: 'Hello' }]
});

const text = response.content[0].text;
```

### After (Abstraction Layer)

```typescript
import { getLLMProvider, ModelTier } from './llm';

const llm = getLLMProvider();

const response = await llm.complete('Hello', {
  systemPrompt: 'You are a helpful assistant',
  tier: ModelTier.ADVANCED,
  maxTokens: 4096
});

const text = response.content;
```

## Files to Migrate

These files currently have direct Anthropic imports:

| File | Priority | Notes |
|------|----------|-------|
| `claudeService.ts` | High | Main agent orchestration |
| `browserAgent.ts` | Medium | Browser automation |
| `cyberWorkforce.ts` | Medium | Cyber IR |
| `rfpAnalysisService.ts` | Medium | RFP parsing |
| `samGovScraper.ts` | Low | SAM.gov scraping |
| `usaSpendingScraper.ts` | Low | USA Spending |
| `server/apiProxy.ts` | Low | API proxy |
| `server/src/ai/claudeProxy.ts` | Low | Server-side proxy |

## Migration Strategy

### Option 1: Gradual Migration (Recommended)

1. Keep existing code working
2. Add new code using abstraction layer
3. Migrate files one at a time
4. Test each migration before moving on

### Option 2: Big Bang Migration

1. Update all files at once
2. Higher risk, but faster if you have good test coverage

## Environment Configuration

The abstraction layer reads these environment variables:

```env
# Provider selection (optional - auto-detected if not set)
LLM_PROVIDER=anthropic  # Options: anthropic, bedrock, azure, mock

# Anthropic Direct (current)
ANTHROPIC_API_KEY=sk-ant-...

# AWS Bedrock (future FedRAMP)
AWS_BEDROCK_REGION=us-gov-west-1

# Azure OpenAI (alternative FedRAMP)
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.us
AZURE_OPENAI_KEY=...

# Demo mode (uses mock provider)
ACE_DEMO_MODE=true
```

## Example: Migrating claudeService.ts

### Step 1: Add import at top

```typescript
import { getLLMProvider, ModelTier, CompletionOptions } from './llm';
```

### Step 2: Replace client initialization

```typescript
// Before
const client = apiKey ? new Anthropic({ ... }) : null;

// After
const llm = getLLMProvider();
```

### Step 3: Replace API calls

```typescript
// Before
const response = await client.messages.create({
  model: 'claude-sonnet-4-20250514',
  max_tokens: 8192,
  system: agentConfig.skills,
  messages: [{ role: 'user', content: prompt }]
});
const text = response.content[0].text;

// After
const response = await llm.complete(prompt, {
  systemPrompt: agentConfig.skills,
  tier: ModelTier.ADVANCED,
  maxTokens: 8192
});
const text = response.content;
```

## Testing

```typescript
import { getProviderByType, LLMProviderType } from './llm';

// Get mock provider for testing
const mockLLM = getProviderByType(LLMProviderType.MOCK);

// Use in tests
const response = await mockLLM.complete('test prompt');
expect(response.content).toBeDefined();
```

## Switching to FedRAMP (Future)

When ready for GovCloud deployment:

1. Set environment variables:
   ```env
   LLM_PROVIDER=bedrock
   AWS_BEDROCK_REGION=us-gov-west-1
   ```

2. Ensure AWS credentials are configured (IAM role or env vars)

3. No code changes required!

## Questions?

The abstraction layer is designed to be minimally invasive. If you encounter issues during migration, check:

1. Are environment variables set correctly?
2. Is the provider health check passing? (`await llm.healthCheck()`)
3. Are you handling `LLMProviderError` appropriately?
