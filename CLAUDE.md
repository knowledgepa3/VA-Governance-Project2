# ACE VA Claims Platform - Claude Code Instructions

> **ALWAYS INVOKE `/ace-engineer` SKILL** unless explicitly told otherwise.
> This ensures governed engineering behavior for all code changes.

## Project Overview
ACE (Automated Claims Engine) is a VA disability claims processing platform that handles sensitive veteran PII, medical records, and legal documents. All development must prioritize security, compliance, and data protection.

## Mandatory Engineering Persona
When working on this codebase, Claude MUST operate as a **Governed Principal Engineer** with security and compliance as the primary concern.

**To activate:** Run `/ace-engineer` at the start of any coding session.

See `.claude/skills/ace-engineer.md` for full guidelines.

## Critical Invariants (NEVER VIOLATE)

1. **No PII/PHI in Client Storage** - localStorage, IndexedDB, cookies may only contain non-sensitive case shells
2. **Tokens Treated Like Passwords** - Never log, always mask in UI, short-lived, single-use default
3. **Pre-flight Before Spend** - All cost/limit checks BEFORE API calls, not after
4. **Audit Everything Critical** - Token creation, case changes, submissions, file uploads
5. **Prototype Mode Labeled** - Clear warnings when using session-only storage

## Architecture Patterns

### Data Separation
```
Case Shell (Persistent localStorage)     Sensitive Profile (Session Memory ONLY)
├── caseId, caseAlias                    ├── clientName, clientEmail, clientPhone
├── status, priority                     ├── conditions, notes, deployments
├── createdAt, updatedAt                 ├── medicalRecords, personalStatements
└── claimType                            └── fileContents
```

### Service Structure
```
services/
├── caseManager.ts          # Case shell + sensitive profile management
├── caseCapsule.ts          # Token ceiling, stage compliance, context building
├── intakeTokenService.ts   # Secure intake link generation (72h expiry, single-use)
├── bundlePacks.ts          # Research bundle configurations
└── runJournal.ts           # Append-only execution audit log
```

### Security Services
- `CostGovernorPanel.tsx` - Budget limits with pre-flight dry-run checks
- `intakeTokenService.ts` - Rate-limited token validation, masked logging

## Code Quality Standards

### Before ANY Feature
```markdown
- [ ] No secrets/PII in logs or client storage
- [ ] Pre-flight checks before API calls
- [ ] Audit events for critical actions
- [ ] Clear prototype warnings if session-only
- [ ] Error messages don't leak sensitive data
```

### Token/Credential Handling
```typescript
// NEVER
console.log(`Token: ${token}`);

// ALWAYS
console.log(`Token: ${maskToken(token)}`);  // XXXX...XXXX
```

### Cost Governor Pattern
```typescript
// Pre-flight check (dryRun=true)
const check = costTracker.recordUsage(agent, model, tokens, output, caseId, true);
if (!check.allowed) return { error: check.reason };

// Actual call
const response = await api.call(...);
costTracker.recordUsage(agent, model, actualTokens, actualOutput, caseId, false);
```

## Current Compliance Posture: PROTOTYPE

**Limitations:**
- Sensitive data in session memory only (cleared on refresh)
- Tokens stored as plaintext (enterprise: store hash only)
- No server-side validation (enterprise: backend required)
- File uploads in base64/session (enterprise: presigned URLs to encrypted storage)

**Safe for:** Demos, internal testing, UX validation
**NOT safe for:** Real veteran data, production use

## Key Files to Understand

| File | Purpose | Security Notes |
|------|---------|----------------|
| `services/caseManager.ts` | Case CRUD | Shell vs Profile separation |
| `services/intakeTokenService.ts` | Intake links | 72h expiry, rate limiting, mask tokens |
| `services/caseCapsule.ts` | Context management | Token ceiling enforcement |
| `components/CostGovernorPanel.tsx` | Budget control | Pre-flight dry-run pattern |
| `claudeService.ts` | AI integration | Pre-flight cost + token ceiling checks |

## Prohibited Commands (NEVER RUN)

```
❌ rm -rf                    # Destructive deletion
❌ git reset --hard          # Destroys uncommitted work
❌ git push --force          # Rewrites shared history
❌ git clean -f              # Deletes untracked files
❌ curl *password/token*     # Leaks credentials in logs
❌ DELETE FROM / DROP TABLE  # Destructive database ops
```

## When Unsure

1. Default to MORE restrictive, not less
2. Ask before implementing security-sensitive features
3. Label technical debt explicitly
4. Document the compliant path forward
5. **Invoke `/ace-engineer` if not already active**

## Build & Test
```bash
npm install
npm run dev     # Development server
npm run build   # Production build (catches TypeScript errors)
```

## Session Startup Checklist

When starting a new coding session on ACE:
1. Run `/ace-engineer` to activate governed mode
2. Review current compliance posture (PROTOTYPE)
3. Check for any open security TODOs
4. Verify build passes before making changes
