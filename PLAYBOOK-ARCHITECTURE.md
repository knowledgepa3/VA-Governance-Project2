# GIA Playbook Architecture

> **Playbooks define WHAT to do. Memory tells it HOW you prefer it. Cache makes it fast.**

## Overview

The GIA Playbook system provides **governed automation** that:
- Gets faster over time without becoming unsafe
- Separates deterministic procedures from user context from performance optimizations
- Ensures hard gates for anything sensitive (payments, transfers, submissions)
- Detects and handles UI drift gracefully

## Three-Layer Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    PLAYBOOK LAYER                       │
│   Deterministic procedures, versioned + hashed          │
│   "WHAT to do"                                          │
│   • Steps, selectors, guards, gates                     │
│   • Versioned: GROCERIES_CHECKOUT_v3                    │
│   • Hashed: drift detection                             │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│                    MEMORY LAYER                         │
│   User preferences that personalize execution           │
│   "HOW you prefer it"                                   │
│   • Favorite store, delivery address                    │
│   • Account nicknames (never full numbers)              │
│   • Last known good UI landmarks                        │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│                    CACHE LAYER                          │
│   Performance optimizations only                        │
│   "MAKE IT FAST"                                        │
│   • DOM fingerprints, route maps                        │
│   • Wait time estimates                                 │
│   • TTL-based, auto-invalidates                         │
└─────────────────────────────────────────────────────────┘
```

## Execution Modes

### TEACH Mode (Human Demos Once)

The human performs the task while GIA records:

1. **Action Log**: click / type / select / wait / confirm
2. **UI Anchors**: robust selectors + fallback anchors
3. **Preconditions**: "must be on Review screen", "must be logged in"
4. **Postconditions**: "confirmation message contains...", "receipt page loaded"
5. **Failure Branches**: "insufficient funds", "address invalid", "captcha", "2FA"

```
Human Action → GIA Records → PlaybookSpec Generated
```

### COMPILE Mode (Generate Playbook)

GIA transforms the recording into a validated PlaybookSpec:

1. **Extract Steps**: Convert actions to step definitions
2. **Build Selectors**: Create primary + fallback selector strategies
3. **Identify Gates**: Mark sensitive actions for human approval
4. **Define Guards**: Extract preconditions as validation checks
5. **Map Recoveries**: Build recovery routes from observed failures
6. **Hash Everything**: Create integrity hash for drift detection

### RUN Mode (Governed Execution)

GIA executes the playbook with full governance:

```
Intent Detection
       ↓
Playbook Selection (confidence routing)
       ↓
Guard Validation (preconditions)
       ↓
┌──────────────────────────────────┐
│         STEP EXECUTION           │
│                                  │
│  For each step:                  │
│    1. Find element (with cache)  │
│    2. Check for drift            │
│    3. Execute action             │
│    4. Verify postcondition       │
│    5. Capture evidence           │
│    6. Check for gate             │
│                                  │
│  If GATE required:               │
│    → PAUSE → Show human context  │
│    → Wait for approval           │
│    → Hash-lock the approval      │
│    → Continue or abort           │
└──────────────────────────────────┘
       ↓
Outcome Recording
       ↓
Evidence Sealing
```

### ASSIST Mode (Human Takes Over)

When drift is detected or confidence is low:

1. GIA pauses execution
2. Shows human the current state
3. Human performs one step manually
4. GIA records the delta
5. Playbook version bumped
6. Execution continues or new playbook compiled

## Policy Gates

### What Requires Human Approval (ALWAYS)

These actions are **NEVER automated**, only proposed:

| Action | Gate Required | Dual-Key |
|--------|--------------|----------|
| Submit Payment | Yes | Optional |
| Initiate Transfer | Yes | Yes |
| Add Payment Method | Yes | Yes |
| Change Password | Yes | Yes |
| Delete Account | Yes | Yes |
| Share Document | Yes | No |
| Send Message | Yes | No |

### Financial Ceiling

Configurable threshold for auto-gating:
- Amount > $100 → Gate required
- Amount > $500 → Dual-key approval required
- Amount > $1000 → Not allowed in automation

### Sensitive Action Flow (Example: Transfer Funds)

```
User: "Transfer $200 from savings to checking"
                      ↓
GIA: Proposal Generated
┌──────────────────────────────────────────┐
│ TRANSFER PROPOSAL                        │
│                                          │
│ From: Chase Savings (****6789)           │
│ To:   Chase Checking (****1234)          │
│ Amount: $200.00                          │
│ Reason: Insufficient balance for grocery │
│         order ($156.42)                  │
│                                          │
│ Timestamp: 2024-01-15 09:34:22 EST       │
│ Proposal ID: PROP-TRF-20240115-001       │
│                                          │
│ ⚠️  This requires your approval          │
│     [APPROVE]  [MODIFY]  [CANCEL]        │
└──────────────────────────────────────────┘
                      ↓
Human: Clicks [APPROVE]
                      ↓
GIA: Hash-locks the exact proposal
                      ↓
GIA: Navigates to transfer screen
                      ↓
GIA: Pre-fills everything
                      ↓
GIA: STOPS at final submit button
                      ↓
┌──────────────────────────────────────────┐
│ FINAL CONFIRMATION GATE                  │
│                                          │
│ Ready to submit transfer:                │
│ $200.00 from Savings → Checking          │
│                                          │
│ Screenshot of submit screen attached     │
│                                          │
│     [SUBMIT NOW]  [CANCEL]               │
└──────────────────────────────────────────┘
                      ↓
Human: Clicks [SUBMIT NOW]
                      ↓
GIA: Executes final click
                      ↓
GIA: Captures confirmation
                      ↓
GIA: Seals to evidence chain
```

## Drift Detection

### What Triggers Invalidation

1. **Page fingerprint changes** - DOM structure differs
2. **Key selectors missing** - Can't find target element
3. **Copy changes on critical buttons** - "Submit" → "Proceed"
4. **Redirect to login/2FA** - Auth state lost
5. **Unexpected modal/popup** - New confirmation dialog

### Recovery Flow

```
Drift Detected
      ↓
Switch to ASSIST mode
      ↓
"The checkout button has moved.
 Please click it to continue."
      ↓
Human clicks new location
      ↓
GIA records new selector
      ↓
Playbook version bumped (v3 → v4)
      ↓
Continue execution
```

## Intent Router

Automatic playbook selection based on user intent:

```javascript
// Intent Detection
const intents = [
  { pattern: /pay.*rent/i, playbook: 'PB-PAY_RENT', confidence: 0.95 },
  { pattern: /order.*grocer/i, playbook: 'PB-ORDER_GROCERIES', confidence: 0.90 },
  { pattern: /check.*balance/i, playbook: 'PB-CHECK_BALANCE', confidence: 0.98 },
  { pattern: /transfer.*funds?/i, playbook: 'PB-TRANSFER_FUNDS', confidence: 0.85 }
];

// Routing Rules
if (confidence >= 0.9) {
  // High confidence: Run until first gate
  execute(playbook, { mode: 'RUN' });
} else if (confidence >= 0.7) {
  // Medium confidence: Confirm playbook selection
  confirm(`Did you mean: ${playbook.name}?`);
} else {
  // Low confidence: Show options
  showOptions(candidatePlaybooks);
}
```

## Outcome Memory (Speed Without Risk)

What we learn from each execution to get faster:

### DO Store

- Last successful navigation path
- Which selector worked last time
- Typical wait times per site
- Known error patterns + recovery steps
- UI landmark fingerprints

### DO NOT Store

- Passwords or credentials
- Full account numbers
- SSN or sensitive PII
- Auth tokens or session cookies
- Anything that bypasses re-auth

## File Structure

```
schemas/
├── PlaybookSpec.json      # Procedure definition
├── PlaybookMemory.json    # User preferences
├── PlaybookCache.json     # Performance cache
└── PlaybookExecution.json # Runtime record

playbooks/
├── PB-PAY_RENT/
│   ├── manifest.json
│   ├── policy.json
│   ├── steps.json
│   ├── selectors.json
│   ├── evidence_schema.json
│   └── recovery_routes.json
├── PB-ORDER_GROCERIES/
│   └── ...
└── PB-TRANSFER_FUNDS/
    └── ...
```

## Example: Grocery Checkout Playbook

```json
{
  "manifest": {
    "id": "PB-GROCERIES_CHECKOUT",
    "version": "v3",
    "name": "Grocery Checkout",
    "hash": "sha256:abc123...",
    "allowedDomains": ["instacart.com", "costco.com", "target.com"]
  },
  "policy": {
    "automationLevel": "SEMI_AUTO",
    "gates": [
      {
        "id": "GATE-CONFIRM_ORDER",
        "trigger": "before:submit_order",
        "message": "Confirm order for ${cart_total}?",
        "timeout": 300
      }
    ],
    "sensitiveActions": ["SUBMIT_PAYMENT"],
    "financialCeiling": 200
  },
  "steps": [
    {
      "id": "check_balance",
      "action": "extract",
      "selectors": { "primary": "[data-testid='available-balance']" },
      "evidence": { "extractFields": [{ "name": "balance", "selector": "..." }] }
    },
    {
      "id": "navigate_to_cart",
      "action": "click",
      "selectors": { "primary": "[data-testid='cart-icon']", "fallback": ["#cart", ".cart-link"] }
    },
    {
      "id": "review_items",
      "action": "assert",
      "postcondition": { "elementVisible": ".cart-items" }
    },
    {
      "id": "proceed_to_checkout",
      "action": "click",
      "selectors": { "primary": "button:contains('Checkout')" },
      "evidence": { "screenshot": true }
    },
    {
      "id": "confirm_address",
      "action": "assert",
      "postcondition": { "textPresent": "${memory.address.street}" }
    },
    {
      "id": "submit_order",
      "action": "click",
      "selectors": { "primary": "[data-testid='place-order']" },
      "evidence": { "screenshot": true }
    }
  ],
  "guards": [
    {
      "id": "balance_check",
      "check": "balance >= cart_total",
      "message": "Insufficient balance. Balance: ${balance}, Cart: ${cart_total}"
    }
  ],
  "recoveryRoutes": [
    {
      "pattern": { "textMatch": "insufficient funds" },
      "action": "escalate",
      "message": "Balance too low. Options: remove items, change payment, or delay order."
    },
    {
      "pattern": { "elementPresent": ".captcha-challenge" },
      "action": "wait_for_human",
      "message": "Please complete the CAPTCHA"
    }
  ]
}
```

## Integration with GIA Governance

### Evidence Chain Integration

Every playbook execution creates:
1. **ExecutionPack** - Full runtime record
2. **GatePack** - Each gate decision
3. **OutcomePack** - Final result + extracted data

All packs are hash-chained to the GIA evidence chain.

### Tool Router Integration

Playbook actions route through GIAToolRouter:
- Same policy checks (domain allowlist, PII redaction)
- Same gate mechanism
- Same evidence sealing

### MCP Relay Integration

Browser actions execute via GIAMCPRelay:
- Task queuing with canonical schemas
- Async result handling
- Screenshot capture for evidence

---

## Summary

| Layer | Purpose | Persistence | Security |
|-------|---------|-------------|----------|
| Playbook | What to do | Versioned files | Hash integrity |
| Memory | User preferences | Encrypted storage | No credentials |
| Cache | Performance | TTL-based | Auto-invalidates |

| Mode | When | Human Involvement |
|------|------|------------------|
| TEACH | First time | Human does it |
| COMPILE | After teach | Auto-generated |
| RUN | Normal use | Gates only |
| ASSIST | Drift detected | One step |

**Core Principle**: Fast through repetition, safe through gates. Never let learning bypass approval for sensitive actions.
