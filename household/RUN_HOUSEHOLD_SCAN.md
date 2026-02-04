# 🏠 Run Your First Household Scan

This guide walks you through running the Multi-Tab Household Scanner for real.

## Prerequisites

1. **Claude Desktop** or **Claude Code** with MCP Chrome Extension connected
2. **Chrome browser** with the Claude MCP extension installed
3. **Logged into your accounts** (bank, shopping sites, utilities) in Chrome

## Quick Start

Just paste this prompt into Claude:

---

```
I want to run a household financial scan. Please help me:

1. Open tabs to check my financial position:
   - My bank account (I'll tell you which URL)
   - Any shopping carts I have open
   - My utility bill portals

2. For each tab, extract:
   - Balances and amounts due
   - Due dates
   - Pending transactions

3. Then analyze:
   - Can I afford all my pending obligations?
   - What should I prioritize?
   - Are there any charges that look suspicious?

4. Give me a simple dashboard summary.

Let's start - I'll guide you to each site.
```

---

## Step-by-Step Walkthrough

### Step 1: Bank Account

Tell Claude:
> "First, let's check my bank. Navigate to [your bank URL] and read my current balance and recent transactions."

Claude will:
- Open the tab
- Read the balance
- Note pending transactions
- Screenshot for your records

### Step 2: Shopping Carts

Tell Claude:
> "Now check if I have anything in my Instacart/Amazon/Walmart cart"

Claude will:
- Open each cart
- Read items and totals
- Note any you forgot about

### Step 3: Bills

Tell Claude:
> "Check my utility bills - electric at [URL], internet at [URL]"

Claude will:
- Read each bill amount
- Note due dates
- Flag anything due soon

### Step 4: Get Your Dashboard

Tell Claude:
> "Now give me the full picture - can I afford everything? What should I do first?"

Claude will synthesize everything into actionable insights.

---

## Example Session

```
You: Let's do a household scan. Start with my Chase account at chase.com

Claude: [Opens chase.com, reads page]
I can see your Chase account:
- Current Balance: $2,847.52
- Available: $2,647.52
- Pending: 2 transactions totaling $58.49

Should I continue to check your shopping carts?

You: Yes, check Instacart

Claude: [Opens instacart.com/cart]
Your Instacart cart has:
- 6 items totaling $54.60
- Delivery scheduled for tomorrow

Want me to check any bills next?

You: Check my electric bill at duke-energy.com

Claude: [Opens duke-energy.com]
Your Duke Energy bill:
- Amount Due: $142.87
- Due Date: February 5th (4 days)
- Status: DUE SOON

You: OK give me the full picture

Claude:
## 🏠 HOUSEHOLD DASHBOARD

**Financial Position**
- Available: $2,647.52
- Pending charges: $58.49
- Effective available: $2,589.03

**Obligations**
- Instacart cart: $54.60
- Electric bill: $142.87 (due in 4 days)
- Total: $197.47

**Analysis: ✅ CAN AFFORD**
- After all obligations: $2,391.56 buffer

**Recommendation:**
Pay the electric bill today (due before any risk of late fee).
The Instacart cart can wait or proceed - you have plenty of buffer.
```

---

## Safety Notes

- Claude will **NEVER** click "Pay" or "Checkout" without asking you first
- Claude will **NEVER** enter payment information
- Claude will **STOP** if it sees anything suspicious
- All data stays in your session - nothing is stored

---

## Tips

1. **Stay logged in** - Claude uses your existing browser sessions
2. **Start simple** - Just bank + one cart + one bill for your first scan
3. **Ask follow-ups** - "What about that $149 charge?" or "Compare to last month"
4. **Run weekly** - Make it a Sunday routine

---

## What Claude Can't Do (By Design)

- ❌ Pay bills for you
- ❌ Complete checkouts
- ❌ Enter passwords
- ❌ Store your financial data
- ❌ Share anything with anyone

This is **awareness**, not **automation**. You stay in control.

---

## Ready?

Open Claude and paste the quick start prompt. Let's see your household dashboard! 🏠
