# Governed Execution Kernel -- Developer Guide

> **Audience**: Engineers adding new LLM-powered features to the GIA (Governed Intelligence Architecture) platform.
> **Source of truth**: `services/governedLLM.ts`

---

## Overview

The Governed Execution Kernel (`services/governedLLM.ts`) is the **only authorized path** to LLM calls in the GIA platform. Direct use of `@anthropic-ai/sdk` or any other LLM SDK is prohibited outside of `llm/providers/`.

When you call `governedLLM.execute()`, you automatically get:

- **Rate limiting** -- per-role token bucket via `services/rateLimiter.ts`
- **Concurrent request limiting** -- prevents runaway parallel calls from a single role
- **Input sanitization** -- adversarial injection pattern removal (governance tag injection, template variable injection, suspicious base64 blocks)
- **Mode enforcement** -- LIVE mode rejects mock providers; DEMO mode is allowed
- **Audit logging** -- SHA-256 hash-chained entries with fingerprinted inputs/outputs (raw prompts never appear in logs)
- **Vendor-agnostic execution** -- works with Anthropic Direct, AWS Bedrock, Azure OpenAI, and Mock providers via `llm/factory.ts`
- **Correlation ID tracing** -- every request gets a correlation ID for end-to-end tracing

**You do not need to implement any of this yourself.** That is the point of governance inheritance.

---

## Quick Start

```typescript
import { execute, executeJSON } from './services/governedLLM';

// Simple text completion
const result = await execute({
  role: 'MY_AGENT',            // Who is calling (for audit + cost tracking)
  purpose: 'task-description', // What for (for audit)
  systemPrompt: 'You are a helpful assistant.',
  userMessage: 'Analyze this document...',
  maxTokens: 4096,
});

console.log(result.content);       // The LLM response text
console.log(result.model);         // e.g., 'claude-sonnet-4-20250514'
console.log(result.auditHash);     // SHA-256 hash chain entry
console.log(result.usage);         // { inputTokens, outputTokens, totalTokens }
console.log(result.correlationId); // Request tracing ID
```

---

## API Reference

### `execute(request: GovernedLLMRequest): Promise<GovernedLLMResult>`

The main entry point. Every LLM call goes through here.

The kernel enforces seven controls in sequence before returning a result:

1. Mode enforcement (LIVE vs DEMO)
2. Rate limiting (token bucket keyed by `llm:<role>`)
3. Concurrent limiting (keyed by `llm:<role>`)
4. Input sanitization (all string fields)
5. LLM call via `llm/factory.ts` -> `getLLMProvider()`
6. Audit logging with SHA-256 hash chain
7. Result wrapping into `GovernedLLMResult`

#### GovernedLLMRequest fields

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `role` | `string` | Yes | -- | Caller identity for audit and cost tracking. Examples: `'RFP_ANALYZER'`, `'REPAIR_AGENT'`, `'COMPLIANCE_CHECKER'` |
| `purpose` | `string` | Yes | -- | What this call is for. Examples: `'document-analysis'`, `'ai-reconciliation'` |
| `systemPrompt` | `string` | Yes | -- | System prompt / persona instructions |
| `userMessage` | `string` | Yes | -- | User message or data payload |
| `tier` | `ModelTier` | No | `ModelTier.ADVANCED` | `'advanced'` (Sonnet-class) or `'fast'` (Haiku-class) |
| `maxTokens` | `number` | No | `4096` | Max tokens to generate |
| `temperature` | `number` | No | Provider default | 0--1, lower = more deterministic |
| `caseId` | `string` | No | -- | Case ID for case-level cost attribution |
| `correlationId` | `string` | No | Auto-generated | Request tracing ID |
| `vision` | `boolean` | No | `false` | Whether this request includes image content |
| `messages` | `LLMMessage[]` | No | -- | Multi-turn conversation (overrides systemPrompt + userMessage for the API call) |
| `tools` | `ToolDefinition[]` | No | -- | Tool definitions for function calling |

#### GovernedLLMResult fields

| Field | Type | Description |
|-------|------|-------------|
| `content` | `string` | The generated text response |
| `contentBlocks` | `ContentBlock[]` | Raw content blocks (present for tool_use responses). Union of `text`, `image`, `tool_use`, `tool_result` |
| `stopReason` | `string` | `'end_turn'`, `'max_tokens'`, `'stop_sequence'`, or `'tool_use'` |
| `model` | `string` | Model identifier used (e.g., `'claude-sonnet-4-20250514'`) |
| `provider` | `LLMProviderType` | Provider that handled the request (`anthropic_direct`, `aws_bedrock`, `azure_openai`, `mock`) |
| `usage` | `object` | `{ inputTokens: number, outputTokens: number, totalTokens: number }` |
| `latencyMs` | `number` | Request latency in milliseconds |
| `correlationId` | `string` | Correlation ID for end-to-end tracing |
| `auditHash` | `string` | SHA-256 audit chain hash for this call |

---

### `executeJSON<T>(request: GovernedLLMRequest): Promise<T>`

Convenience wrapper that calls `execute()` and parses the response as JSON. Strips markdown code fences (` ```json `) automatically. Throws on invalid JSON -- this is fail-secure by design.

```typescript
interface AnalysisResult {
  score: number;
  findings: string[];
  recommendation: string;
}

const result = await executeJSON<AnalysisResult>({
  role: 'COMPLIANCE_ANALYZER',
  purpose: 'document-scoring',
  systemPrompt: 'Analyze and respond in JSON format: { score, findings, recommendation }',
  userMessage: documentText,
});

// result is typed as AnalysisResult
console.log(result.score);
```

**Implementation detail**: The JSON parsing applies `content.replace(/```json\n?|```/g, '').trim()` before `JSON.parse()`. If parsing fails, the error message includes the first 100 characters of the cleaned content and the role/purpose for debugging.

---

### `getAuditLog(): ReadonlyArray<Readonly<AuditEntry>>`

Returns a frozen copy of the complete audit log. Each entry includes:

| Field | Type | Description |
|-------|------|-------------|
| `timestamp` | `string` | ISO 8601 timestamp |
| `correlationId` | `string` | Request tracing ID |
| `role` | `string` | Caller role |
| `purpose` | `string` | Call purpose |
| `provider` | `string` | LLM provider used |
| `model` | `string` | Model used |
| `inputFingerprint` | `string` | SHA-256 fingerprint of input (format: `fp:<hash16>:len=<n>`) |
| `outputFingerprint` | `string` | SHA-256 fingerprint of output (same format) |
| `inputTokens` | `number` | Input token count |
| `outputTokens` | `number` | Output token count |
| `latencyMs` | `number` | Request latency |
| `status` | `string` | `'success'`, `'denied'`, or `'error'` |
| `denyReason` | `string?` | Present when status is `'denied'` or `'error'` |
| `hash` | `string` | SHA-256 hash of this entry |
| `previousHash` | `string` | Hash of the previous entry (chain link) |

**Important**: Inputs and outputs are fingerprinted, never logged as raw text. This prevents prompt leakage while preserving auditability. You cannot replay prompts from the audit log.

---

### `getAuditStats()`

Returns aggregated statistics across all audit entries:

```typescript
const stats = getAuditStats();
// {
//   totalCalls: number;
//   successCalls: number;
//   deniedCalls: number;
//   errorCalls: number;
//   totalInputTokens: number;
//   totalOutputTokens: number;
//   byRole: Record<string, number>;  // Call count per role
// }
```

---

### `GovernanceDeniedError`

Thrown when the kernel blocks a request. This is NOT a transient error. It means governance policy denied the action.

```typescript
class GovernanceDeniedError extends Error {
  readonly reason: string;   // 'MOCK_IN_LIVE_MODE' | 'RATE_LIMIT' | 'CONCURRENT_LIMIT'
  readonly role: string;     // The role that made the request
  readonly purpose: string;  // The purpose of the request
}
```

---

### `ExecutionMode` enum

```typescript
enum ExecutionMode {
  LIVE = 'LIVE',   // Real LLM calls; mock provider is rejected
  DEMO = 'DEMO',   // Mock provider allowed; set via ACE_DEMO_MODE=true
}
```

Mode is determined at runtime from environment variables:
- `ACE_DEMO_MODE=true` or `VITE_DEMO_MODE=true` sets DEMO mode
- Everything else defaults to LIVE mode

---

## Common Patterns

### Pattern 1: Simple Analysis Agent

The most common use case. Single-turn, text-in/text-out.

```typescript
import { execute } from './services/governedLLM';

async function analyzeDocument(document: string): Promise<string> {
  const result = await execute({
    role: 'DOCUMENT_ANALYZER',
    purpose: 'content-analysis',
    systemPrompt: `You are a document analysis specialist.
      Analyze the provided document and summarize key findings.`,
    userMessage: document,
    maxTokens: 2048,
    temperature: 0.3,
  });

  return result.content;
}
```

---

### Pattern 2: Structured JSON Response

Use `executeJSON<T>()` when you need typed structured output. It handles markdown code fence stripping and throws on invalid JSON.

```typescript
import { executeJSON } from './services/governedLLM';

interface ComplianceCheck {
  compliant: boolean;
  violations: { rule: string; description: string; severity: string }[];
  overallScore: number;
}

async function checkCompliance(data: string): Promise<ComplianceCheck> {
  return executeJSON<ComplianceCheck>({
    role: 'COMPLIANCE_CHECKER',
    purpose: 'regulatory-validation',
    systemPrompt: `Evaluate compliance. Respond in JSON:
      { "compliant": bool, "violations": [...], "overallScore": 0-100 }`,
    userMessage: data,
    temperature: 0,
  });
}
```

---

### Pattern 3: Vision / Image Analysis

Use the `messages` field with `ContentBlock` arrays for multimodal input. Set `vision: true` to indicate image content is present.

```typescript
import { execute } from './services/governedLLM';
import type { ContentBlock, LLMMessage } from './llm';

async function analyzeScreenshot(base64Image: string): Promise<string> {
  const messages: LLMMessage[] = [
    {
      role: 'user',
      content: [
        {
          type: 'image',
          source: { type: 'base64', media_type: 'image/png', data: base64Image }
        },
        { type: 'text', text: 'Describe what you see in this screenshot.' }
      ]
    }
  ];

  const result = await execute({
    role: 'VISION_ANALYZER',
    purpose: 'screenshot-analysis',
    systemPrompt: 'You are a visual analysis agent.',
    userMessage: 'See attached image',
    messages,     // Multi-turn overrides systemPrompt+userMessage for the API call
    vision: true,
  });

  return result.content;
}
```

**Sanitization note**: Text content blocks are sanitized; image blocks (binary data) pass through untouched because binary image data is not an injection vector.

---

### Pattern 4: Tool Use / Function Calling

Define tools via `ToolDefinition[]` and check `stopReason === 'tool_use'` for tool call responses.

```typescript
import { execute } from './services/governedLLM';
import type { ToolDefinition, ContentBlock } from './llm';

const tools: ToolDefinition[] = [
  {
    name: 'search_database',
    description: 'Search the case database for relevant records',
    input_schema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search query' },
        limit: { type: 'number', description: 'Max results' }
      },
      required: ['query']
    }
  }
];

async function agentWithTools(userQuery: string) {
  const result = await execute({
    role: 'RESEARCH_AGENT',
    purpose: 'case-research',
    systemPrompt: 'You are a research agent with database access.',
    userMessage: userQuery,
    tools,
  });

  // Check if the model wants to use a tool
  if (result.stopReason === 'tool_use' && result.contentBlocks) {
    const toolUse = result.contentBlocks.find(
      (b): b is ContentBlock & { type: 'tool_use' } => b.type === 'tool_use'
    );

    if (toolUse) {
      console.log('Tool called:', toolUse.name);
      console.log('With input:', toolUse.input);
      // Execute the tool, then send results back in a follow-up call
    }
  }

  return result;
}
```

---

### Pattern 5: Multi-turn Conversation

Maintain a message history and append to it across turns. Each turn goes through the governed kernel.

```typescript
import { execute } from './services/governedLLM';
import type { LLMMessage } from './llm';

async function continueConversation(
  history: LLMMessage[],
  newMessage: string
): Promise<{ response: string; updatedHistory: LLMMessage[] }> {
  const messages: LLMMessage[] = [
    ...history,
    { role: 'user', content: newMessage }
  ];

  const result = await execute({
    role: 'CONVERSATIONAL_AGENT',
    purpose: 'interactive-session',
    systemPrompt: 'You are a helpful assistant.',
    userMessage: newMessage,
    messages,
  });

  return {
    response: result.content,
    updatedHistory: [
      ...messages,
      { role: 'assistant', content: result.content }
    ]
  };
}
```

---

### Pattern 6: Fast Tier for Simple Tasks

Use `ModelTier.FAST` (Haiku-class) for classification, extraction, and health checks. Lower cost, lower latency.

```typescript
import { execute } from './services/governedLLM';
import { ModelTier } from './llm';

async function classifyDocument(docText: string): Promise<string> {
  const result = await execute({
    role: 'CLASSIFIER',
    purpose: 'document-triage',
    systemPrompt: 'Classify this document as: LEGAL, FINANCIAL, TECHNICAL, or OTHER. Respond with only the category.',
    userMessage: docText,
    tier: ModelTier.FAST,
    maxTokens: 50,
  });

  return result.content.trim();
}
```

---

## Error Handling

### GovernanceDeniedError

Thrown when the kernel blocks a request. This is a policy decision, NOT a transient error. Do not retry immediately.

```typescript
import { execute, GovernanceDeniedError } from './services/governedLLM';

try {
  const result = await execute({ /* ... */ });
} catch (error) {
  if (error instanceof GovernanceDeniedError) {
    // Governance blocked this request
    console.error('Denied:', error.reason);   // e.g., 'RATE_LIMIT'
    console.error('Role:', error.role);
    console.error('Purpose:', error.purpose);
    // Do NOT retry immediately -- this is a policy decision, not a transient failure
  } else {
    // Provider error (network, API, etc.) -- may be retryable
    throw error;
  }
}
```

#### Denial reasons

| Reason | Meaning | What to do |
|--------|---------|------------|
| `MOCK_IN_LIVE_MODE` | Mock provider is not allowed when `ExecutionMode` is LIVE | Configure a real provider (Anthropic, Bedrock, or Azure) or set `ACE_DEMO_MODE=true` |
| `RATE_LIMIT` | Too many requests from this role | Wait for the duration in `retryAfterMs` (returned in the rate limiter but surfaced in the error message) |
| `CONCURRENT_LIMIT` | Too many simultaneous requests from this role | Wait for an in-flight request from the same role to complete |

### Provider errors

Errors from the underlying LLM provider (network failures, API errors, invalid API keys) are re-thrown as-is after being logged to the audit chain with `status: 'error'`. These may be retryable depending on the error type. Check for `LLMProviderError` from `llm/types.ts`:

```typescript
import { LLMProviderError } from './llm';

try {
  const result = await execute({ /* ... */ });
} catch (error) {
  if (error instanceof LLMProviderError && error.retryable) {
    // Network timeout, rate limit from provider, etc. -- safe to retry
  }
}
```

---

## Model Tiers

| Tier | Enum Value | Maps to (Anthropic) | Maps to (Azure) | Use for |
|------|------------|---------------------|-----------------|---------|
| Advanced | `ModelTier.ADVANCED` | Claude Sonnet 4 | GPT-4 | Complex analysis, multi-step reasoning, long documents |
| Fast | `ModelTier.FAST` | Claude Haiku | GPT-3.5 | Simple extraction, classification, health checks, triage |

The mapping from tier to concrete model is handled by each provider's `getModelForTier()` method. Your code never references a specific model name -- it references a tier, and the factory resolves it.

---

## Input Sanitization

The kernel sanitizes all string inputs before they reach the LLM. This happens automatically; you do not need to sanitize inputs yourself.

### What is removed

| Pattern | Replacement | Why |
|---------|-------------|-----|
| Governance tag injection: `<GOVERNANCE_PROTOCOL>`, `<INPUT_DATA>`, `<CONTEXT>`, `<SYSTEM>`, `<ADMIN>` (with whitespace variants) | `[REDACTED_TAG]` | Prevents prompt injection via fake governance tags |
| Template variable injection: `${...}` | `[REDACTED_VAR]` | Prevents template literal injection |
| Suspicious base64 blocks (500+ chars of base64) | `[REDACTED_LONG_ENCODED]` | Prevents encoded instruction injection |
| Strings longer than 100,000 characters | Truncated at 100,000 | Prevents token exhaustion attacks |

### What is NOT removed

- Normal text content (the sanitizer is conservative)
- Image data in `ContentBlock` arrays (binary data is not an injection vector)
- Short base64 strings (under 500 characters)

### Multimodal sanitization

When processing `LLMMessage[]` arrays:
- `text` content blocks: sanitized
- `image` content blocks: passed through unchanged
- `tool_use` and `tool_result` blocks: sanitized via recursive object sanitization
- Object keys containing `__proto__` or `constructor`: stripped (prototype pollution prevention)
- Arrays: capped at 1,000 elements
- Object keys: capped at 100 keys

---

## Audit System

Every call to `execute()` creates a hash-chained audit entry, regardless of outcome (success, denied, error).

### Hash chain structure

```
Entry 0:  hash(payload + "" + 0)              -> hash_0
Entry 1:  hash(payload + hash_0 + 1)          -> hash_1
Entry 2:  hash(payload + hash_1 + 2)          -> hash_2
   ...
```

Each entry stores `hash` (its own hash) and `previousHash` (the hash of the entry before it). This creates a tamper-evident chain: modifying any entry invalidates all subsequent hashes.

### Fingerprinting

Input and output content is never stored in the audit log. Instead, SHA-256 fingerprints are stored:

```
fp:a1b2c3d4e5f6a7b8:len=4523
```

Format: `fp:<first 16 chars of SHA-256>:len=<content length>`

This means:
- You CAN verify that two calls had the same input/output (fingerprints match)
- You CANNOT reconstruct the original prompt from the audit log (by design)

### Denied entries

When a request is denied (rate limit, mode violation), an audit entry is still created with `status: 'denied'` and the denial reason. This ensures the audit log captures all attempted LLM access, not just successful calls.

---

## Rate Limiting

Rate limiting is handled by `services/rateLimiter.ts` using a token bucket algorithm. The kernel keys rate limits by `llm:<role>`, so each role gets its own bucket.

### Configuration by environment

Rates are configured in `services/configService.ts`:

| Environment | Requests/min | Requests/hr | Max concurrent | Burst |
|-------------|-------------|-------------|----------------|-------|
| Development | 60 | 1,000 | 10 | 20 |
| Staging | 30 | 500 | 5 | 10 |
| Production | 20 | 200 | 3 | 5 |

### How the token bucket works

1. Each role starts with `requestsPerMinute` tokens
2. Tokens refill at a constant rate (requestsPerMinute / 60,000 tokens per ms)
3. Each request consumes 1 token
4. The bucket can accumulate up to `requestsPerMinute + burstLimit` tokens
5. When tokens are exhausted, `GovernanceDeniedError` is thrown with reason `RATE_LIMIT`

### Concurrent limiting

Separately from rate limiting, the kernel tracks how many in-flight requests each role has. If a role exceeds `maxConcurrentAgents`, `GovernanceDeniedError` is thrown with reason `CONCURRENT_LIMIT`. The slot is released in a `finally` block, so even failed requests free their slot.

---

## LLM Provider Factory

The kernel uses `llm/factory.ts` to obtain a provider instance. Provider selection is automatic based on environment variables:

### Provider selection priority

1. If `ACE_DEMO_MODE=true` or `VITE_DEMO_MODE=true` --> Mock
2. If `LLM_PROVIDER` or `VITE_LLM_PROVIDER` is set --> use that provider
3. If `AWS_BEDROCK_REGION` is set or `AWS_REGION` contains "gov" --> Bedrock
4. If `AZURE_OPENAI_ENDPOINT` is set --> Azure OpenAI
5. If `ANTHROPIC_API_KEY` or `VITE_ANTHROPIC_API_KEY` is set --> Anthropic Direct
6. Fallback --> Mock (with console warning)

### Available providers

| Provider | Type | FedRAMP | Environment Variables |
|----------|------|---------|----------------------|
| Anthropic Direct | `anthropic_direct` | No | `ANTHROPIC_API_KEY` |
| AWS Bedrock | `aws_bedrock` | High (GovCloud) | `AWS_BEDROCK_REGION` |
| Azure OpenAI | `azure_openai` | High (Azure Gov) | `AZURE_OPENAI_ENDPOINT` |
| Mock | `mock` | N/A | `ACE_DEMO_MODE=true` |

### Switching providers

Switching from Anthropic to AWS Bedrock requires zero code changes in consumer code. Set the environment variables and restart:

```bash
# Before (Anthropic Direct)
ANTHROPIC_API_KEY=sk-ant-...

# After (AWS Bedrock)
LLM_PROVIDER=bedrock
AWS_BEDROCK_REGION=us-gov-west-1
# Ensure AWS IAM credentials are configured
```

---

## ContentBlock Type System

The `ContentBlock` union type (`llm/types.ts`) supports four variants:

```typescript
type ContentBlock =
  | { type: 'text'; text: string }
  | { type: 'image'; source: { type: 'base64'; media_type: string; data: string } }
  | { type: 'tool_use'; id: string; name: string; input: Record<string, unknown> }
  | { type: 'tool_result'; tool_use_id: string; content: string };
```

The `LLMMessage` interface allows content to be either a plain string or an array of content blocks:

```typescript
interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string | ContentBlock[];
}
```

---

## Architecture Diagram

```
Consumer Code (your agent/service)
        |
        v
+-------------------------------------+
|     governedLLM.execute()           |
|  +-----------------------------+    |
|  | 1. Mode enforcement         |    |
|  | 2. Rate limiting            |    |
|  | 3. Concurrent limiting      |    |
|  | 4. Input sanitization       |    |
|  | 5. LLM call via factory     |--->| llm/factory.ts -> getLLMProvider()
|  | 6. Audit logging (SHA-256)  |    |       |
|  | 7. Result wrapping          |    |       v
|  +-----------------------------+    |  +--------------+
|                                     |  | Anthropic    |
|  Returns: GovernedLLMResult         |  | Bedrock      |
|  (content + auditHash + usage)      |  | Azure OpenAI |
|                                     |  | Mock         |
+-------------------------------------+  +--------------+
```

### Execution flow detail

```
execute(request)
  |
  +-- getExecutionMode()
  |     Is LIVE + provider is MOCK? --> throw GovernanceDeniedError(MOCK_IN_LIVE_MODE)
  |
  +-- rateLimiter.tryConsume("llm:<role>")
  |     Tokens exhausted? --> throw GovernanceDeniedError(RATE_LIMIT)
  |
  +-- concurrentLimiter.tryAcquire("llm:<role>")
  |     Slots full? --> throw GovernanceDeniedError(CONCURRENT_LIMIT)
  |
  +-- sanitizeString(systemPrompt)
  +-- sanitizeString(userMessage)
  +-- sanitizeMessageContent(messages)  [if multi-turn]
  |
  +-- if messages provided:
  |     provider.chat(sanitizedMessages, options)
  |   else:
  |     provider.complete(sanitizedUser, options)
  |
  +-- fingerprint(input), fingerprint(output)
  +-- createAuditEntry({...})  [SHA-256 hash chain]
  |
  +-- return GovernedLLMResult
  |
  +-- finally: concurrentLimiter.release("llm:<role>")
```

---

## Integration with the Broader Governance Stack

The Governed Execution Kernel is one layer in the GIA governance stack. Here is how it relates to the other services:

| Service | File | Relationship to Kernel |
|---------|------|------------------------|
| **MAI Runtime** | `services/maiRuntimeSecure.ts` | Evaluates browser action policies (NAVIGATE, CLICK, SUBMIT, etc.). Operates at a different layer -- the kernel handles LLM calls, MAI handles browser actions. |
| **Audit Service** | `services/auditService.ts` | Persistent audit with IndexedDB, separation of duties, approval workflows. The kernel has its own lightweight audit chain; for full compliance workflows, use both. |
| **Rate Limiter** | `services/rateLimiter.ts` | The kernel uses this directly. You should NOT create your own rate limiter for LLM calls. |
| **Config Service** | `services/configService.ts` | Rate limit thresholds, environment detection, governance config. The kernel reads rate limit config from here. |
| **Validation** | `services/validation.ts` | URL, file, email, and variable validation. The kernel handles LLM input sanitization; use `validation.ts` for business-logic validation of URLs, files, etc. |
| **LLM Factory** | `llm/factory.ts` | Singleton provider instance. The kernel calls `getLLMProvider()` on every request. |

---

## Rules for New Code

1. **NEVER** import from `@anthropic-ai/sdk` directly. Always use `governedLLM.execute()` or `governedLLM.executeJSON()`.

2. **ALWAYS** provide meaningful `role` and `purpose` values. They appear in the audit log and enable per-agent cost tracking. Use uppercase snake_case for roles (e.g., `'DOCUMENT_ANALYZER'`, `'COMPLIANCE_CHECKER'`).

3. **NEVER** catch `GovernanceDeniedError` and silently ignore it. Either surface it to the user, let it propagate, or handle it with appropriate fallback behavior. Silent swallowing defeats the purpose of governance.

4. **Use `executeJSON<T>()`** when you expect JSON responses. It handles markdown code fence stripping and throws on invalid JSON (fail-secure). Do not roll your own JSON extraction.

5. **Use the `messages` field** for multi-turn conversations, vision/image content, and tool_use flows. When `messages` is provided, it overrides `systemPrompt` + `userMessage` for the actual API call, but you must still provide `systemPrompt` and `userMessage` (they are used for audit fingerprinting).

6. **Use `tier: ModelTier.FAST`** for simple tasks (classification, extraction, health checks) to reduce cost and latency.

7. **Do not build your own rate limiting** for LLM calls. The kernel handles it per-role via the token bucket in `rateLimiter.ts`.

8. **Do not build your own audit logging** for LLM calls. The kernel handles it with SHA-256 hash chain integrity.

9. **Do not sanitize LLM inputs yourself.** The kernel sanitizes all inputs. You should still validate business logic (e.g., ensure a case ID is valid, check file types), but do not strip injection patterns manually.

10. **Do not reference specific model names** in consumer code. Use `ModelTier.ADVANCED` or `ModelTier.FAST` and let the factory resolve the concrete model.

---

## Testing

### Using the Mock provider

Set `ACE_DEMO_MODE=true` to force the mock provider. The mock provider returns deterministic responses without making real API calls.

```typescript
// In your test setup
process.env.ACE_DEMO_MODE = 'true';

// Import after setting env var
import { execute } from './services/governedLLM';

const result = await execute({
  role: 'TEST_AGENT',
  purpose: 'unit-test',
  systemPrompt: 'Test system prompt',
  userMessage: 'Test message',
});

// result.provider will be 'mock'
// result.content will be a deterministic mock response
```

### Inspecting audit entries in tests

```typescript
import { getAuditLog, getAuditStats } from './services/governedLLM';

// After running some LLM calls...
const log = getAuditLog();
const lastEntry = log[log.length - 1];

expect(lastEntry.role).toBe('TEST_AGENT');
expect(lastEntry.status).toBe('success');
expect(lastEntry.hash).toBeTruthy();
expect(lastEntry.previousHash).toBe(log[log.length - 2]?.hash || '');

const stats = getAuditStats();
expect(stats.byRole['TEST_AGENT']).toBeGreaterThan(0);
```

### Testing governance denials

```typescript
import { execute, GovernanceDeniedError } from './services/governedLLM';

// Exhaust rate limit
for (let i = 0; i < 100; i++) {
  try {
    await execute({ role: 'FLOOD_TEST', purpose: 'rate-limit-test', /* ... */ });
  } catch (e) {
    if (e instanceof GovernanceDeniedError && e.reason === 'RATE_LIMIT') {
      // Expected -- rate limit kicked in
      break;
    }
  }
}
```

---

## Frequently Asked Questions

**Q: Can I use streaming responses?**
A: Not yet. The kernel returns complete responses only. Streaming support would require a governed stream wrapper that can still enforce sanitization and audit logging on streamed chunks. This is noted as a known limitation in ADR-001.

**Q: Can I call a different model directly for a specific use case?**
A: No. All LLM calls go through the kernel. If you need a different model tier, set `tier: ModelTier.FAST` or `tier: ModelTier.ADVANCED`. If you need a provider not currently supported, implement the `LLMProvider` interface in `llm/providers/` and register it in the factory.

**Q: What happens if the factory cannot initialize a provider?**
A: The kernel will throw when `getLLMProvider()` fails. This is fail-secure -- if we cannot get a governed provider, we do not fall back to ungoverned access.

**Q: How do I add a new LLM provider?**
A: Implement the `LLMProvider` interface from `llm/types.ts`, add a file in `llm/providers/`, register it in `llm/factory.ts`, and export it from `llm/index.ts`. The kernel does not need changes.

**Q: Is the audit log persistent?**
A: The kernel's audit log is in-memory (module-scoped array). For persistent audit logging, the platform also has `services/auditService.ts` which uses IndexedDB. For multi-instance deployment, integrate an external audit store.

**Q: What is the performance overhead of the kernel?**
A: Approximately 1-2ms per call for sanitization + SHA-256 hashing. This is negligible compared to LLM response latency (typically 1-30 seconds).

---

## Related Documentation

| Document | Path | Description |
|----------|------|-------------|
| ADR-001 | `docs/ADR-001-Governed-Execution-Kernel.md` | Architecture Decision Record for the kernel |
| LLM Migration Guide | `llm/MIGRATION.md` | How to migrate from direct Anthropic SDK to the abstraction layer |
| Security Audit Report | `docs/SECURITY-AUDIT-REPORT.md` | Security audit covering the 12 files that were rewired |
| GIA Architecture | `docs/GIA-Governed-Intelligence-Architecture.md` | Full GIA platform architecture |
| Deployment Safety | `docs/DEPLOYMENT_SAFETY.md` | Production deployment safety checklist |
