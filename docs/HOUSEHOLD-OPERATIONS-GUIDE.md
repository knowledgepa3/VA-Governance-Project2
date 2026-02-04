# Household Operations Assistant

## Operational Dignity for People Who Are Overloaded

> **What this is**: A household assistant that prepares, monitors, and safeguards routine obligations - with human approval.
>
> **What this is NOT**: An AI that spends money.

---

## The Problem We're Solving

For single parents, older adults, caregivers, and anyone with cognitive overload - the problem isn't "paying bills."

The problem is **remembering, coordinating, and not screwing it up**.

This isn't about automation. It's about:
- Fewer missed deadlines
- Predictable groceries
- Clear approve/deny moments instead of chaos
- Someone watching for anomalies

---

## The Core Principle

> **No autonomous money movement without an approval history.**

Autonomy is:
- **Earned** through consistent, error-free operation
- **Scoped** to specific actions and limits
- **Revocable** the moment something looks wrong

---

## How It Works

### Separate Identity Model

This assistant operates with a **separate identity** - like a junior household assistant with a company card:

| Separate | Why |
|----------|-----|
| Separate email | Isolated from your primary identity |
| Separate virtual card | Limited funds, trackable |
| Separate merchant accounts | No access to your main profiles |
| Separate shipping profile | Controlled delivery addresses |
| **No primary bank access** | Never touches your main accounts |

### MAI Authority Model

| Level | What It Does | Human Approval? |
|-------|--------------|-----------------|
| **INFORMATIONAL** | Read bills, track due dates, summarize spending | No - runs automatically |
| **ADVISORY** | Draft grocery carts, suggest payment schedules | Yes - presents for review |
| **MANDATORY** | Charge card, place order, change quantities | Yes - ALWAYS |

### Example Flow

```
1. INFORMATIONAL: Check what bills are due this week
   → Runs automatically, no approval needed

2. INFORMATIONAL: Review grocery patterns from past orders
   → Runs automatically

3. ADVISORY: "Here's a draft grocery cart based on your usual items"
   → Presents for your review

4. ADVISORY: "Item X increased 15% - want a substitute?"
   → Asks before proceeding

5. MANDATORY: "Ready to place order for $87.50?"
   → STOPS and waits for explicit approval

6. Human approves → Order placed → Evidence captured
```

---

## Safety Controls

### Forbidden Actions (Hard-Coded)

These actions are **blocked at the code level**, not just policy:

- ❌ Access primary bank accounts
- ❌ Store credentials
- ❌ Create new accounts
- ❌ Add new subscriptions
- ❌ Transfer money between accounts
- ❌ Apply for credit
- ❌ Share financial data with third parties

### Escalation Triggers

The assistant **stops and asks** when:

| Trigger | Action |
|---------|--------|
| Price increase > 10% | Asks before proceeding |
| Cart over budget | Stops - requires approval |
| Item unavailable | Asks about substitution |
| Payment fails | Stops - human must intervene |
| Login/MFA required | Stops - human must complete |
| New merchant detected | Stops - requires explicit approval |
| Amount higher than usual | Asks for confirmation |
| Bill amount changed | Asks for review |

### Budget Controls

Configurable limits enforced automatically:
- Monthly spending cap
- Per-transaction cap
- Daily cap
- Per-category budgets

---

## Trust Progression

Trust is **earned**, not given.

### Level 1: Full Supervision (Default)
- Every financial action requires approval
- No exceptions
- This is where everyone starts

### Level 2: Routine Groceries
- **Unlock criteria**: 10 successful grocery runs with no issues
- **What unlocks**: Pre-approved items from allowlisted merchants under per-transaction limit
- **Still requires approval for**: New items, new merchants, over-limit carts

### Level 3: Utility Auto-Pay
- **Unlock criteria**: 3 months of consistent utility payments, no anomalies
- **What unlocks**: Pay utilities within expected range automatically
- **Still requires approval for**: Amount changes, new billers

### Automatic Downgrade

The system **downgrades itself** when:
- Amount drift > 20% from baseline
- New merchant attempted
- Payment failure
- User requests reset
- Any anomaly detected

---

## Who This Helps

### Single Parents
- **Benefit**: Less cognitive load, fewer missed deadlines, predictable groceries
- **Key feature**: Clear "approve/deny" moments instead of chaos

### Older Adults
- **Benefit**: Fewer logins, scam protection, anomaly detection
- **Key feature**: Someone watching for unusual charges
- **Optional**: Family member can review evidence bundles

### Caregivers
- **Benefit**: Oversight without micromanaging
- **Key feature**: Only involved when escalated
- **Audit trail**: If something goes wrong, there's evidence

### Busy Professionals
- **Benefit**: Routine tasks prepared, exceptions surfaced
- **Key feature**: One-tap approvals for pre-reviewed items

---

## Evidence & Accountability

Every transaction produces an evidence bundle:

```
evidence/
└── 2026-02-01_grocery_order_12345/
    ├── cart_contents.json       # What was ordered
    ├── price_breakdown.json     # Line item costs
    ├── screenshot_checkout.png  # Visual proof
    ├── approval_log.json        # When/how approved
    └── seal.hash                # Tamper-proof seal
```

### Monthly Reports

- Full reconciliation
- Category breakdown
- Subscription audit
- Variance analysis
- Approval history

---

## Setting Up

### 1. Create Separate Identity

```
1. New email address (household-ops@yourmail.com)
2. Virtual card from your bank or Privacy.com
3. Fund card with monthly household budget
4. Create merchant accounts with new email
```

### 2. Configure Limits

```json
{
  "monthly_cap": 1500,
  "per_transaction_cap": 200,
  "daily_cap": 300,
  "grocery_budget": 600,
  "utilities_budget": 400
}
```

### 3. Build Merchant Allowlist

```json
{
  "groceries": ["instacart.com", "amazon.com/fresh"],
  "utilities": ["power-company.com", "water-company.com"],
  "household": ["amazon.com", "target.com"]
}
```

### 4. Start with Full Supervision

Run the first 10+ transactions with full approval required. Build trust gradually.

---

## What This Doesn't Do

To be completely clear:

| ❌ Does NOT | Why |
|-------------|-----|
| Think for itself | Follows certified procedures |
| Make financial decisions | Humans decide everything |
| Access your main bank | Separate card only |
| Store passwords | No credential storage |
| Submit applications | Capture only, human submits |
| Work autonomously | Every action logged, most require approval |

---

## The Philosophy

This isn't about making AI "do things for you."

It's about:
- **Reducing failure modes** for people who are overloaded
- **Creating clear decision points** instead of chaos
- **Providing audit trails** when things go wrong
- **Building trust gradually** through evidence

We're not replacing people. We're **reducing cognitive load** so people can focus on what matters.

---

## Technical Details

### Job Pack
`workforce/jobpacks/HouseholdOperationsAssistant.json`

### Risk Profile
`client-package/profiles/household.json`

### Certification Level
Level 2 (Tested) - requires execution evidence

### Framework Compliance
- Evidence bundles meet audit requirements
- All actions logged with timestamps
- Approval chain documented

---

## One Final Note

> "The moment amounts drift, merchants change, or patterns shift - the system should downgrade itself and ask."

That's the entire philosophy in one sentence.

We don't ask for trust. We earn it - and we're willing to lose it the moment something looks wrong.

---

*Household Operations Assistant v1.0.0*
*Part of ACE Governance Platform*
