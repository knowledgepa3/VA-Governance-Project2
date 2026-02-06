# ADR-001: Governed Execution Kernel

## Status
Accepted — Implemented February 2026

## Context

The ACE platform (now GIA — Governed Intelligence Architecture) is built on the MAI (Managed Autonomy Interface) framework with a 3-tier governance classification:
- **MANDATORY**: Hard block until human approval
- **ADVISORY**: Notify, auto-proceed, audit
- **INFORMATIONAL**: Auto-proceed, audit only

The platform had a sound governance architecture:
- `maiRuntimeSecure` for policy evaluation
- `JobPackExecutor` for controlled execution
- `actionGateway` for HITL gating
- LLM Provider Factory (`llm/factory.ts`) for vendor-agnostic model access

**The Problem**: Despite this architecture, 12 files in the codebase directly instantiated `new Anthropic()` from `@anthropic-ai/sdk`, completely bypassing all governance controls. These files had:
- Zero rate limiting
- Zero input sanitization
- Zero audit logging
- Zero mode enforcement (LIVE vs DEMO)
- No evidence chain participation
- Direct API key access

This meant that roughly 40% of LLM interactions in the platform had no governance whatsoever. The governance architecture existed but wasn't inherited — it was opt-in rather than default.

## Decision

Create a **Governed Execution Kernel** (`services/governedLLM.ts`) that serves as the single authorized path to LLM calls. All consumer code must route through `governedLLM.execute()`. Direct SDK access is prohibited.

The kernel enforces 7 controls in sequence:
1. **Mode enforcement**: LIVE mode rejects mock provider; DEMO mode is allowed
2. **Rate limiting**: Token bucket per role
3. **Concurrent limiting**: Prevent runaway parallel calls
4. **Input sanitization**: Strip injection patterns, template variables, suspicious base64
5. **LLM call via factory**: Vendor-agnostic through `getLLMProvider()`
6. **Audit logging**: SHA-256 hash chain, fingerprinted (never raw prompts)
7. **Result wrapping**: Returns `GovernedLLMResult` with audit hash and correlation ID

Key design principles:
- **Governance by default**: Consumers can't bypass because they never get raw SDK access
- **Fail-secure**: `GovernanceDeniedError` is thrown on policy violations — not catchable-and-ignorable
- **Audit everything**: Every call (success, denied, error) gets a hash-chained audit entry
- **Fingerprint, never log**: Input/output are SHA-256 fingerprinted — raw prompts never appear in logs
- **Multimodal support**: Handles text, images (base64), tool_use, and tool_result content blocks
- **Tool use support**: Passes through `ToolDefinition[]` and returns `contentBlocks` + `stopReason` for agentic loops

## Consequences

### Positive
- **Governance inheritance is automatic**: Any new service just calls `governedLLM.execute()` — rate limiting, sanitization, audit, and mode enforcement come free
- **Single point of control**: Policy changes (new rate limits, new sanitization rules, new audit fields) propagate to ALL consumers
- **Evidence chain is complete**: Every LLM interaction has a SHA-256 hash linking it to the previous entry
- **Vendor portability**: Switching from Anthropic to AWS Bedrock requires zero changes in consumer code
- **Cost attribution**: Every call is tagged with role + purpose, enabling per-agent cost tracking

### Negative
- **All LLM calls are async**: The kernel adds ~1-2ms overhead per call (sanitization + audit hashing)
- **No streaming support yet**: The kernel returns complete responses only. Streaming would need a governed stream wrapper.
- **Single-process audit log**: The hash chain is in-memory. For multi-instance deployment, needs external audit store integration.
- **Tight coupling to factory**: The kernel depends on `llm/factory.ts` singleton. If factory initialization fails, all LLM calls fail.

### Trade-offs
- Chose SHA-256 for audit hashes (secure but slower) over FNV-1a (fast but not cryptographic) because audit integrity is more important than microsecond performance
- Chose to fingerprint inputs rather than log them — this means you can't replay prompts from audit logs, but it prevents prompt leakage
- Chose hard-fail on mock-in-live rather than soft warning — this prevents demo data from contaminating production workflows

## Alternatives Considered

### 1. Middleware wrapper around Anthropic SDK
Rejected: Would still require every consumer to import and use the wrapper. Too easy to forget or bypass.

### 2. ESLint rule banning `new Anthropic()`
Rejected: Enforcement at lint time only, not runtime. Could be disabled with `// eslint-disable`.

### 3. Proxy pattern intercepting SDK network calls
Rejected: Too fragile, depends on SDK internals, wouldn't work if SDK changes HTTP client.

### 4. No kernel — trust developers to follow conventions
Rejected: This is exactly what failed. 12 files bypassed governance because there was no enforcement mechanism.

## Implementation

The kernel is at `services/governedLLM.ts`. Key exports:
- `execute(request: GovernedLLMRequest): Promise<GovernedLLMResult>` — main entry point
- `executeJSON<T>(request: GovernedLLMRequest): Promise<T>` — convenience wrapper that parses JSON responses
- `getAuditLog(): ReadonlyArray<Readonly<AuditEntry>>` — read-only audit access
- `getAuditStats()` — aggregated call statistics by role
- `GovernanceDeniedError` — thrown when governance blocks a request
- `ExecutionMode` — LIVE or DEMO enum

The LLM type system (`llm/types.ts`) supports:
- `ContentBlock` union: text | image | tool_use | tool_result
- `ToolDefinition` for function calling
- `CompletionResponse` with `contentBlocks` and `stopReason`

12 files were rewired from direct SDK to governed kernel. See SECURITY-AUDIT-REPORT.md for the complete list.

## References
- MAI Classification System: `MAI-Pattern-Whitepaper.md`
- LLM Provider Factory: `llm/factory.ts`
- Platform Positioning: `docs/ACE-Platform-Positioning.md`
