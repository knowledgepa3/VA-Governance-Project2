# GIA Build Pack — Claude Code Instruction Set
> Distilled from actual implementation. Not theory. This is the operating manual.

---

## Philosophy: Why GIA Exists

**The Problem:** AI systems fail not because the model is wrong, but because there's no proof it was right. Every enterprise that's tried to deploy AI in regulated environments hits the same wall: "How do we trust this? How do we audit it? How do we control costs?"

**The Solution:** GIA is **governed execution middleware**. It doesn't make AI smarter—it makes AI **provable, repeatable, and cost-controlled**.

**The Innovation:** Most governance is theater (badges, banners, compliance docs). GIA enforces governance in the **execution path itself**. If a gate isn't approved, execution doesn't happen. If evidence isn't captured, the workflow fails. If costs exceed budget, the system stops.

---

## The GIA Stack (Know Your Layers)

```
┌─────────────────────────────────────────────────────────────────┐
│                       PRESENTATION LAYER                         │
│  console.html, portal.html, onboarding.html, bd.html            │
│                                                                  │
│  Rules:                                                          │
│  • Pure display — no secrets, no execution logic                 │
│  • Reflects state, doesn't create it                             │
│  • All data comes from lower layers                              │
│  • Safe for public deployment (DEMO mode enforced here)          │
└─────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                       WORKFLOW ENGINE                            │
│  Instruction Packs, step sequencing, interrupt channel          │
│                                                                  │
│  Rules:                                                          │
│  • Orchestrates but doesn't decide                               │
│  • Human can interrupt at any point                              │
│  • Each step emits evidence                                      │
│  • Workflow state is recoverable                                 │
└─────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                       GOVERNANCE LAYER                           │
│  MAI classification, gates, cost governor, compliance mapping   │
│                                                                  │
│  Rules:                                                          │
│  • THIS IS WHERE ENFORCEMENT HAPPENS                             │
│  • Gates block execution until approved                          │
│  • Cost ceiling is hard — not advisory                           │
│  • Policy changes invalidate dependent capsules                  │
└─────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                       EXECUTION LAYER                            │
│  Agent calls, API integrations, capsule operations              │
│                                                                  │
│  Rules:                                                          │
│  • Every call goes through GIA.guardExecution()                  │
│  • Every fetch goes through GIA.safeFetch()                      │
│  • DEMO mode blocks all real calls                               │
│  • Results are hashed before storage                             │
└─────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                       EVIDENCE STORE                             │
│  Hashes, timestamps, source refs, negative assurance            │
│                                                                  │
│  Rules:                                                          │
│  • Append-only — nothing gets deleted                            │
│  • Every entry has: what, when, who, hash                        │
│  • Negative assurance is evidence too                            │
│  • Evidence packs are sealed and exportable                      │
└─────────────────────────────────────────────────────────────────┘
```

---

## The MAI Framework (Governance Classification)

Every AI action has a **Mandatory/Advisory/Informational** classification:

| Classification | Meaning | Gate Behavior | Example |
|----------------|---------|---------------|---------|
| **MANDATORY** | Human must approve before execution | Blocks until approved | Export documents, send emails, financial decisions |
| **ADVISORY** | AI recommends, human can override | Logs recommendation, proceeds | Search refinements, ranking suggestions |
| **INFORMATIONAL** | AI reports, no action needed | Audit trail only | Status updates, progress notifications |

**Critical Rule:** Never downgrade a classification to ship faster. If something was MANDATORY, it stays MANDATORY.

---

## The Capsule System (Institutional Memory)

### What Capsules Are
Capsules are **not caching**. They're institutional memory with provenance.

A capsule contains:
- **Context**: The input that triggered the computation
- **Reasoning**: What the AI decided and why
- **Evidence**: Source hashes, timestamps, validation status
- **TTL**: How long this capsule remains valid
- **Version**: Pack version that created it

### Why Capsules Matter

```
WITHOUT CAPSULES:
  Request 1: Parse → Call API → Rank → Return    Cost: $0.15, Time: 8s
  Request 2: Parse → Call API → Rank → Return    Cost: $0.15, Time: 8s
  Request 3: Parse → Call API → Rank → Return    Cost: $0.15, Time: 8s
  Total: $0.45, 24s

WITH CAPSULES:
  Request 1: Parse → Call API → Rank → SAVE CAPSULE → Return    Cost: $0.15, Time: 8s
  Request 2: Parse → CAPSULE HIT → Return                        Cost: $0.02, Time: 1s
  Request 3: Parse → CAPSULE HIT → Return                        Cost: $0.02, Time: 1s
  Total: $0.19, 10s (58% cost reduction, 58% time reduction)
```

### Capsule Provenance (What Auditors Ask)

Always display:
- **Pack Version**: Which instruction pack created this
- **Input Hash**: Proves the inputs were identical
- **TTL Countdown**: Proves the capsule is still fresh
- **Last Validated**: When integrity was last checked

```javascript
// When displaying a capsule hit:
addCapsule('NAICS-541512-RANKING', {
  status: 'cached',
  type: 'Ranking Algorithm',
  description: 'Pre-trained relevance model for IT services',
  tokens: '0',        // Zero tokens used — capsule hit
  reuses: '47',       // This capsule has been reused 47 times
  saved: '0.12',      // Saved $0.12 this hit
  ttl: '7d',          // Valid for 7 more days
  version: 'v1.0.0',  // Created by pack version 1.0.0
  inputHash: 'sha256:9f3a7c2d...'  // Proves input integrity
});
```

### Capsule Invalidation (Drift Watch)

When policy changes, capsules become invalid:

```javascript
// Drift detection
function setDrift(status) {
  if (status === 'CLEAN') {
    // All capsules valid
  } else if (status === 'POLICY CHANGED') {
    // Warning: some capsules may be stale
    // UI shows yellow pulsing indicator
  } else if (status === 'INVALIDATED') {
    // Capsules have been cleared
    // Next run will recompute from scratch
  }
}
```

---

## The GIA Runtime Object (Single Source of Truth)

```javascript
const GIA = Object.freeze({
  // Environment detection
  isVercel: window.location.hostname.includes('vercel.app') ||
            window.location.hostname.includes('.vercel.'),
  isLocalhost: window.location.hostname === 'localhost',

  // DEMO MODE - Cannot be bypassed
  FORCE_DEMO: true,
  get isDemoMode() {
    if (this.isVercel) return true;  // Always demo on Vercel
    if (this.FORCE_DEMO) return true;
    return false;
  },

  // PII Redaction
  REDACT_PII: true,
  redact: {
    operator: 'demo-user@example.com',
    operatorDisplay: 'demo-user@███████',
  },

  // Execution Guard - Call before ANY live action
  guardExecution(actionName) {
    if (this.isDemoMode) {
      console.log(`[GIA Guard] Blocked "${actionName}" - DEMO mode`);
      return false;
    }
    return true;
  },

  // Safe Fetch - Blocks real API calls in demo mode
  async safeFetch(url, options = {}) {
    if (this.isDemoMode) {
      console.warn(`[GIA] Blocked fetch to ${url} - DEMO mode`);
      return { ok: false, status: 0, statusText: 'DEMO_MODE_BLOCKED' };
    }
    return fetch(url, options);
  }
});

// Make globally accessible but immutable
window.GIA = GIA;
```

**Why Object.freeze?** Prevents runtime tampering. `GIA.isDemoMode = false` silently fails.

**Why getter for isDemoMode?** Computed property can't be directly overwritten.

---

## Evidence Capture (The Audit Trail)

### What Gets Captured

Every workflow step must emit:

| Field | Description | Example |
|-------|-------------|---------|
| **timestamp** | When it happened | `2026-02-04T16:47:22Z` |
| **action** | What happened | `API_CALL`, `GATE_APPROVED`, `CAPSULE_HIT` |
| **source** | Where data came from | `SAM.gov API`, `Capsule:NAICS-541512` |
| **queryHash** | Hash of the input | `sha256:9f3a7c2d...` |
| **responseHash** | Hash of the output | `sha256:4a2f8b1c...` |
| **operator** | Who was logged in | `demo-user@███████` |
| **validation** | Did it pass checks | `PASSED`, `FAILED`, `SKIPPED` |
| **negativeAssurance** | What was NOT done | `No set-aside filter applied` |

### Negative Assurance (Often Overlooked)

Negative assurance is evidence of what **didn't** happen:

```javascript
addEvidencePack('FED-SEARCH-2026-0204-001', {
  source: 'SAM.gov API',
  endpoint: '/opportunities/v2/search',
  queryHash: '9f3a7c2d...e8b1',
  timestamp: new Date().toISOString(),
  validation: 'PASSED',
  negativeAssurance: 'No set-aside filter applied'  // This is valuable!
});
```

Why? Auditors ask "why didn't you find X?" Negative assurance answers that.

---

## File Structure (Know the Codebase)

```
ACE-VA-Agents-main/
├── console.html          # GIA Workflow Console (REPL-style terminal)
├── portal.html           # Main portal landing page
├── onboarding.html       # User onboarding flow
├── demo-landing.html     # Public demo page
├── index-landing.html    # App entry point
├── bd.html               # BD Dashboard
├── index.html            # VA Agents app
│
├── vercel.json           # Route configuration
│   └── rewrites: /console → console.html, /run → console.html, etc.
│
├── vite.config.ts        # Build configuration
│   └── Multiple entry points, proxy config, env handling
│
├── .env                  # Secrets (NEVER commit, NEVER ship to client)
│   └── ANTHROPIC_API_KEY, VITE_VA_API_KEY
│
├── CLAUDE_INSTRUCTION_PACK.md   # This file
├── GIA_QUICK_PACK.md            # Compact version for prompts
│
└── dist/                 # Build output (verify no secrets!)
```

---

## Security Checklist (Run Before Every Deploy)

```bash
# 1. Build the project
npm run build

# 2. Check for API keys in output
grep -r "sk-ant" dist/ && echo "FAIL: Anthropic key found!" || echo "PASS"

# 3. Check for filesystem paths
grep -r "C:\\\\Users\|/home/\|/Users/" dist/ && echo "FAIL: Path leak!" || echo "PASS"

# 4. Check for real PII
grep -r "@ace.io\|@company.com" dist/ && echo "WARN: Real email?" || echo "PASS"

# 5. Verify DEMO mode
grep "isDemoMode" dist/console.html && echo "PASS: Demo check exists"
```

---

## Workflow Console Features (What We Built)

### Header Bar
- **Workflow ID**: `WF-2026-0204-BD-001`
- **Status Pill**: running / paused / complete / aborted
- **Mode Tag**: DEMO (blue) / LIVE (red)
- **Cost Tracker**: Live updating `$0.14`
- **Evidence Button**: Opens full audit modal

### Governance Banner
```
MAI: ADVISORY | ECV: ACTIVE | Gate: REQUIRED | Risk: LOW |
Integrity: VERIFIED | Autonomy: ASSISTED | Confidence: HIGH | Drift: CLEAN
```

### Metrics Bar
- Time to Decision
- API Calls
- Gates Passed
- Interrupts
- Capsule Hits
- Compliance (FAR · NIST 800-53)

### Terminal Features
- Streaming text output
- Instruction Pack visualization (steps with checkmarks)
- Capsule blocks (pink border, hover for provenance)
- Evidence blocks (purple border)
- Gate prompts (APPROVE / MODIFY / ABORT)
- Always-active input for interrupts

---

## Patterns That Work

| Pattern | Implementation | Why |
|---------|----------------|-----|
| Frozen config | `Object.freeze(GIA)` | Can't tamper at runtime |
| Computed getters | `get isDemoMode()` | Can't directly overwrite |
| Guard functions | `GIA.guardExecution()` | Single enforcement point |
| Hash everything | `sha256:` prefix | Prove integrity without storing content |
| Negative assurance | "No filter applied" | Answers "why didn't you find X?" |
| Sandbox paths | `demo/artifacts/[hash]-*` | No real filesystem exposure |
| PII redaction | `@███████` | More credible than fake data |
| TTL on capsules | `7d`, `30d`, `90d` | Automatic staleness detection |

## Anti-Patterns (What Breaks)

| Anti-Pattern | Why It Fails | Fix |
|--------------|--------------|-----|
| UI-only indicators | Can bypass via console | Enforce in execution layer |
| `VITE_` secrets | Ship to browser bundle | Use server-side only |
| Real emails in demo | PII leak + unprofessional | Always redact |
| Mutable config | Runtime tampering | `Object.freeze()` |
| "Just for demo" code | It ships to production | No special cases |
| Downgrading gates | Breaks trust model | Gates are immutable |
| Skipping evidence | Can't audit | Every step emits evidence |

---

## Change Protocol

### Before Coding
1. **Identify the layer**: UI / Workflow / Governance / Execution / Evidence
2. **Check gate impact**: Does this change any MAI classification?
3. **Check secrets**: Will this touch API keys or PII?
4. **Check capsules**: Will existing capsules need invalidation?

### When Coding
1. **Enforce in code, not UI**: If it's a rule, it goes in the execution path
2. **Add evidence emission**: Every action gets a hash + timestamp
3. **Guard for DEMO**: `if (GIA.isDemoMode)` before any live path
4. **Preserve interrupt channel**: Human can always pause/abort/redirect

### After Coding
1. **Run security checklist**: No secrets in build
2. **Test DEMO mode**: Verify nothing live happens
3. **Check capsule provenance**: New capsules have version + TTL
4. **Update evidence schema**: If new fields, document them

---

## Productivity Protocol (Maximize Output Per Prompt)

### The Philosophy
Each prompt has a cost. Maximize the work done before the next prompt. Don't stop at "task complete" — push to the natural boundary of what can be accomplished.

### How to Work

**1. Batch Related Work**
Don't do one file at a time. If a change touches multiple files, do them all:
```
❌ "I'll update console.html" → wait for approval → "Now I'll update vercel.json"
✅ "I'll update console.html, vercel.json, and vite.config.ts together"
```

**2. Complete the Full Arc**
Don't stop at implementation. Push through to verification:
```
❌ "I've added the feature" (done)
✅ "I've added the feature, verified the build, checked for secrets, and committed"
```

**3. Anticipate the Next Step**
If you know what's coming next, do it:
```
❌ "Feature complete. Let me know if you want me to add tests."
✅ "Feature complete. I've also added the evidence emission and updated the instruction pack."
```

**4. Chain Dependent Operations**
Use `&&` to chain operations that must succeed together:
```bash
# Do this — all or nothing
npm run build && grep -r "sk-ant" dist/ && git add . && git commit -m "message"

# Not this — stops after each
npm run build
# wait
grep -r "sk-ant" dist/
# wait
git add .
```

**5. Parallel Independent Operations**
When tasks don't depend on each other, run them in parallel:
```
✅ Read 3 files simultaneously to understand context
✅ Run multiple grep searches at once
✅ Commit code while build runs in background
```

### Work Boundaries (When to Stop)

**Natural stopping points:**
- Security check needed (secrets, PII, gates)
- Architectural decision required (which layer? which pattern?)
- Human approval gate (MANDATORY classification)
- Ambiguous requirements (ask, don't assume)

**NOT stopping points:**
- "That's one file done" (do related files too)
- "Feature works" (verify build, check security, commit)
- "I could do more but..." (do more)

### Task Completion Checklist

Before saying "done", verify:
- [ ] All related files updated
- [ ] Build passes
- [ ] Security check run (no secrets in output)
- [ ] Evidence capture added (if applicable)
- [ ] DEMO mode works
- [ ] Changes committed with descriptive message
- [ ] Pushed to remote (if requested)
- [ ] TOOL_LEDGER included in response

---

## Tool/Skill Discipline (TOOL_LEDGER)

### The Principle
Every tool invocation has a cost (tokens, time, side effects). Only invoke tools when necessary, and document what was done based on the task's MAI classification.

### TOOL_LEDGER is MAI-Conditional

| Classification | Ledger Requirement |
|----------------|-------------------|
| **MANDATORY** | Full ledger with all tool calls, file paths, line numbers, hashes |
| **ADVISORY** | Compact ledger (tool + outcome) or "ledger available on request" |
| **INFORMATIONAL** | No ledger unless user explicitly asks |

**Default:** Code changes, commits, and builds are MANDATORY. Questions and explanations are INFORMATIONAL.

### Full TOOL_LEDGER Format (for MANDATORY tasks)

```
---
TOOL_LEDGER [MANDATORY]
ledger_id: LEDGER-YYYYMMDD-HHMMSS-<entropy>

- Read: [file:lines] → [why]
- Edit: [file:lines] → [what changed]
- Bash: [command] → [outcome]

artifacts:
- [file] (modified)
- [commit hash]

verification: ADVISORY (client-side execution, not server-sealed)
---
```

### Compact TOOL_LEDGER Format (for ADVISORY tasks)

```
TOOL_LEDGER [ADVISORY]: Read(2) → Edit(1) → Bash(build+commit) | hash: abc123
```

### When NO tools are used

```
TOOL_LEDGER: none (answered from context)
```

### Critical: Verification Status

TOOL_LEDGER is **ADVISORY** by default because:
- Tool calls are executed in Claude Code runtime
- No server-side timestamp sealing
- No cryptographic proof of execution
- Client can verify via git log, file diffs, build artifacts

To upgrade to **VERIFIED**:
- Commit hash exists in repo ✓
- File paths/lines are real ✓
- Build output is reproducible ✓
- Security scan is reproducible ✓

**GIA framing:** TOOL_LEDGER proves *intent and claimed execution*. System logs prove *actual execution*.

### What Counts as a Tool
- **Read/Glob/Grep**: File system access
- **Edit/Write**: File modifications
- **Bash**: Shell commands (build, git, npm, etc.)
- **WebFetch/WebSearch**: External network calls
- **Task**: Agent spawning

### Anti-Patterns
```
❌ Full ledger for simple questions (noisy)
❌ Claiming tool runs that didn't happen (hallucination)
❌ Vague file references without paths/lines
❌ Missing commit hashes after git operations
❌ Ledger without verification status
```

### Integration with GIA
The TOOL_LEDGER is the developer-side equivalent of GIA's evidence pack:
- GIA evidence → proves AI workflow execution (can be server-sealed)
- TOOL_LEDGER → proves developer tool execution (client-side, advisory)

Both create accountability, but at different trust levels.

### Example: Full-Arc Execution

**User says:** "Add a drift indicator to the console"

**Partial response (wasteful):**
```
"I've added the drift indicator to console.html. Let me know if you want me to
add the CSS and JavaScript."
```

**Full-arc response (efficient):**
```
"Done. I've:
1. Added drift indicator HTML to governance banner
2. Added CSS for drift states (CLEAN/POLICY CHANGED/INVALIDATED)
3. Added setDrift() JavaScript function
4. Added drift pulse animation for warnings
5. Updated the instruction pack to document drift behavior
6. Verified build passes
7. Checked no secrets in output
8. Committed all changes

The indicator shows CLEAN (green) by default, pulses yellow on POLICY CHANGED,
and turns red on INVALIDATED."
```

### Productivity Metrics

Track (mentally) per session:
- Files touched per prompt
- Commits per session
- Features fully completed vs partially started
- Security checks run vs skipped

**Target:** Each prompt should complete a full arc, not start multiple partial arcs.

---

## Innovation Opportunities

### Where GIA Can Grow

1. **Capsule Marketplace**: Share proven instruction packs across orgs
2. **Federated Evidence**: Cross-organization audit trails
3. **Predictive Cost Modeling**: Estimate workflow cost before execution
4. **Drift Prevention**: Block execution when policy change detected
5. **Compliance Auto-Mapping**: Auto-tag evidence to regulatory frameworks

### What Makes GIA Different

| Traditional AI | GIA |
|----------------|-----|
| Stateless | Capsule-based memory |
| Trust the output | Prove the output |
| Cost is afterthought | Cost is governor |
| Audit is retrofit | Audit is native |
| Human optional | Human is authority |

---

## Quick Reference (Copy This)

```
LAYER CHECK:     UI / Workflow / Governance / Execution / Evidence
GATE CHECK:      MANDATORY / ADVISORY / INFORMATIONAL
DEMO CHECK:      if (GIA.isDemoMode) return
EVIDENCE CHECK:  hash + timestamp + source + negativeAssurance
CAPSULE CHECK:   version + TTL + inputHash + lastValidated
SECURITY CHECK:  npm run build && grep -r "sk-ant\|apiKey=" dist/

PRODUCTIVITY:    Push each task to its natural boundary before moving on
                 Batch related files | Complete full arcs | Verify + commit
                 Don't stop at "works" — stop at "done, verified, shipped"
```

---

## The One-Liner

> **GIA doesn't make AI smarter. It makes AI provable.**

---

## Using This Pack

Start any session with:
```
Apply the GIA Build Pack. I need to [describe what you're building].
```

Claude will:
1. Identify which layer is affected
2. Check for gate/security implications
3. Propose architecture-aware implementation
4. Ensure evidence capture
5. Verify DEMO safety
6. Consider capsule implications

This isn't about constraining Claude—it's about giving Claude the **context to make architectural decisions**, not just write code.
