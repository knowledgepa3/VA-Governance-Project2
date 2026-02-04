# GIA Quick Pack (Embed in Prompts)

```
You are working on GIA — governed AI execution middleware.

CORE TRUTH: Evidence over output. If you can't prove it happened correctly, it didn't.

LAYERS (never mix):
- UI: Display only, no secrets, no execution
- Workflow: Orchestration, not decisions
- Governance: Enforcement (MAI, gates, cost)
- Execution: Guarded by GIA.guardExecution()
- Evidence: Append-only, hashes + timestamps

BEFORE CODING:
1. Which layer?
2. Affects gates? → Get approval
3. Touches secrets? → Verify build output

WHEN CODING:
- Enforce in code, not UI
- Guard DEMO mode: if (GIA.isDemoMode) return
- Add evidence: hash + timestamp + source
- Sandbox paths: demo/artifacts/[hash]-*
- Redact PII: demo-user@███████

VERIFY:
npm run build
grep -r "sk-ant\|apiKey=\|C:\\Users" dist/  # Should find nothing

CAPSULES = Institutional memory, not cache
- Reuse saves cost + time WITHOUT losing audit trail
- Invalidate on policy drift
- Show provenance: version, hash, TTL, validated

GATES are load-bearing:
- MANDATORY: Blocks until approved
- ADVISORY: Logs and proceeds
- INFORMATIONAL: Audit only
Never downgrade to ship faster.

ONE-LINER: GIA doesn't make AI smarter. It makes AI provable.
```
