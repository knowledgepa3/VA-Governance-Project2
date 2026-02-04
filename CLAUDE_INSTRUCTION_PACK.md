# GIA Build Pack — Claude Code Instruction Set
> Distilled from actual implementation experience. Not theory.

## What GIA Actually Is

GIA is **governed execution middleware** that sits between human intent and AI action. It's not a chatbot, not a dashboard, not an agent framework. It's the **control plane** that makes AI trustworthy enough for regulated environments.

The core insight: **Most AI systems fail not because the model is wrong, but because there's no proof it was right.**

---

## The Three Things That Actually Matter

### 1. Evidence Over Output
Every action must produce a receipt. Not for compliance theater—for **operational confidence**.
- What was asked
- What sources were used (with hashes)
- What the AI concluded
- What a human approved
- What got exported

If you can't reconstruct the decision path, the system failed.

### 2. Gates Are Load-Bearing
Human approval gates aren't UX polish. They're **structural**.
- MANDATORY gates block execution until approved
- ADVISORY gates log and proceed
- INFORMATIONAL gates are audit trail only

Never downgrade a gate classification to ship faster.

### 3. Capsules Are Infrastructure
Capsules aren't caching—they're **institutional memory**.
- A capsule packages: context + reasoning + evidence + TTL
- Reusing a capsule = skipping API calls WITHOUT losing audit trail
- Capsule invalidation on policy drift is non-negotiable

---

## Architecture Reality Check

```
┌─────────────────────────────────────────────────────────┐
│                    PRESENTATION                         │
│   console.html, portal.html, dashboards                 │
│   Pure display. No secrets. No execution logic.         │
└─────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│                 WORKFLOW ENGINE                          │
│   Instruction Packs, step sequencing, interrupt channel │
│   Orchestrates but doesn't decide.                      │
└─────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│                 GOVERNANCE LAYER                         │
│   MAI classification, gate enforcement, cost governor   │
│   THE ACTUAL ENFORCEMENT. Not UI labels.                │
└─────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│                 EXECUTION LAYER                          │
│   Agent calls, API integrations, capsule operations     │
│   Guarded by GIA.guardExecution() / GIA.safeFetch()     │
└─────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│                 EVIDENCE STORE                           │
│   Hashes, timestamps, source refs, negative assurance   │
│   Append-only. Immutable. Auditable.                    │
└─────────────────────────────────────────────────────────┘
```

---

## What I've Learned Building This

### DEMO Mode Must Be Structural
```javascript
// WRONG - UI-only, bypassable
if (showDemoBanner) { ... }

// RIGHT - Enforced in execution path
const GIA = Object.freeze({
  get isDemoMode() {
    if (this.isVercel) return true; // Cannot be overridden
    return this.FORCE_DEMO;
  },
  guardExecution(action) {
    if (this.isDemoMode) return false; // Blocks execution
    return true;
  }
});
```

### PII Redaction Is a Feature, Not a Bug
For public demos, redacted data is **more credible** than fake data:
- `demo-user@███████` signals "we thought about this"
- Real-looking fake data signals "we didn't"

### Capsule Provenance Matters
When showing capsule reuse, always display:
- Pack version
- Input hash (proves same inputs)
- TTL countdown (proves freshness)
- Last validated timestamp (proves integrity)

Auditors ask "how do you know this cached answer is still valid?" Have the answer ready.

### Cost Visibility Builds Trust
Show the money:
- Live cost ticker in header
- Capsule hits with savings amount
- "Saved $X.XX by reusing cached intelligence"

This converts skeptics faster than any feature demo.

---

## Change Protocol (Minimal Viable Process)

### Before Touching Code
1. **Which layer?** UI / Workflow / Governance / Execution / Evidence
2. **Does it affect gates?** If yes, get explicit approval
3. **Does it touch secrets?** If yes, verify build output after

### When Implementing
1. **Enforce in code, not UI** — UI reflects state, doesn't create it
2. **Add evidence emission** — If it happened, log it with hash + timestamp
3. **Guard for DEMO** — `if (GIA.isDemoMode)` before any live path

### After Implementing
Quick check:
```bash
# No secrets in build
npm run build && grep -r "sk-ant\|apiKey=" dist/

# No filesystem paths
grep -r "C:\\Users\|/home/" dist/

# No real PII in demo paths
grep -r "real-email@" dist/
```

---

## Patterns That Work

| Pattern | Why |
|---------|-----|
| `Object.freeze(GIA)` | Immutable config, can't be tampered at runtime |
| Getters for computed state | `isDemoMode` can't be directly set |
| Guard functions before execution | Single enforcement point |
| Hash everything | Proof of integrity without storing content |
| Negative assurance | "No set-aside filter applied" is valuable evidence |
| Sandbox paths | `demo/artifacts/[hash]-*` not `/reports/actual-file.pdf` |

## Patterns That Fail

| Anti-Pattern | Why It Fails |
|--------------|--------------|
| UI-only indicators | Can be bypassed by direct API calls |
| Secrets in `.env` exposed to client | Vite's `VITE_` prefix ships to browser |
| Real emails in demo mode | PII leak, looks unprofessional |
| Mutable config objects | Runtime tampering possible |
| "Just for demo" shortcuts | They ship to production, always |

---

## The Capsule System (Why It's Revolutionary)

Most AI systems are **stateless** — every request starts from zero.

GIA capsules make AI **institutionally aware**:

```
First run:
  → Parse intent
  → Call APIs
  → Rank results
  → Cache as capsule (with hash, TTL, provenance)
  → Cost: $0.15, Time: 8s

Second run (similar query):
  → Parse intent
  → CAPSULE HIT — skip API calls
  → Apply cached ranking
  → Cost: $0.02, Time: 1s
  → Evidence: "Reused NAICS-541512-RANKING v1.0.0, validated 2h ago"
```

This is how you turn AI from **expense** to **infrastructure**.

---

## When to Ask vs. When to Decide

**Ask the human:**
- Gate classification changes
- New external integrations
- Anything that touches secrets
- Architectural layer changes

**Decide yourself:**
- UI polish within existing patterns
- Evidence emission additions
- Capsule provenance display
- Error handling improvements

---

## One-Liner

> GIA doesn't make AI smarter. It makes AI **provable**.

---

## Using This Pack

When starting work:
```
Apply the GIA Build Pack. I need to [describe change].
```

Claude will:
1. Identify which layer is affected
2. Check for gate/security implications
3. Propose architecture-aware implementation
4. Verify evidence capture
5. Confirm DEMO safety

This isn't about constraining Claude—it's about giving Claude the **context to make better decisions**.
