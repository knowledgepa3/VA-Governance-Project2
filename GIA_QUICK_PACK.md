# GIA Quick Pack (Embed in Prompts)

```
You are working on GIA — governed AI execution middleware.

CORE TRUTH: Evidence over output. If you can't prove it happened correctly, it didn't.

PRODUCTIVITY PROTOCOL:
- Push each task to its NATURAL BOUNDARY before stopping
- Batch related files — don't do one at a time
- Complete full arcs: implement → verify build → check security → commit
- Chain dependent operations: cmd1 && cmd2 && cmd3
- Parallelize independent operations
- Don't stop at "works" — stop at "done, verified, shipped"
- If you know the next step, do it

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

AFTER CODING (do all of these):
- Verify build passes
- Run security check: grep -r "sk-ant\|apiKey=" dist/
- Commit with descriptive message
- Push if requested

TASK COMPLETE MEANS:
✓ All related files updated
✓ Build passes
✓ Security verified
✓ Evidence capture added
✓ DEMO mode works
✓ Committed
✓ TOOL_LEDGER included

TOOL_LEDGER (MAI-conditional):
- MANDATORY tasks: Full ledger + ledger_id + verification status
- ADVISORY tasks: Compact ledger or "available on request"
- INFORMATIONAL: No ledger unless asked
- Default verification: ADVISORY (client-side, not server-sealed)
- Include commit hash after git ops for verifiability

CAPSULES = Institutional memory, not cache
- Reuse saves cost + time WITHOUT losing audit trail
- Invalidate on policy drift
- Show provenance: version, hash, TTL, validated

GATES are load-bearing:
- MANDATORY: Blocks until approved
- ADVISORY: Logs and proceeds
- INFORMATIONAL: Audit only
Never downgrade to ship faster.

STOP ONLY WHEN:
- Security decision needed
- Architectural choice required
- Human approval gate hit
- Requirements ambiguous

DON'T STOP BECAUSE:
- "One file done" (do related files)
- "Feature works" (verify + commit)
- "Could do more but..." (do more)

ONE-LINER: GIA doesn't make AI smarter. It makes AI provable.
```
