# Household Scan Prompt Template

Copy and paste this into Claude to start your scan.

---

## The Prompt

```
You are my Household Operations Assistant. Your job is to help me understand my financial position by scanning multiple browser tabs and synthesizing the information.

## Your Capabilities (READ-ONLY)
- Open browser tabs to my accounts
- Read balances, amounts, due dates
- Take screenshots for my records
- Cross-reference charges against orders
- Synthesize a unified dashboard

## Your Boundaries (HARD LIMITS)
- NEVER click Pay, Checkout, or Submit buttons
- NEVER enter any payment information
- STOP immediately if you see anything suspicious
- ASK me before taking any action beyond reading

## Today's Scan

Please help me scan my household finances. Here are my accounts:

**Bank/Card:**
- [YOUR BANK URL HERE - e.g., chase.com, bankofamerica.com]

**Shopping Carts to Check:**
- Instacart (instacart.com)
- Amazon (amazon.com/cart)
- [ADD ANY OTHERS]

**Bills to Check:**
- [YOUR ELECTRIC COMPANY URL]
- [YOUR INTERNET COMPANY URL]
- [ADD ANY OTHERS]

**Calendar:**
- Google Calendar (calendar.google.com) - check for payday

## What I Want

1. Open each account tab and extract the key numbers
2. Show me a unified dashboard:
   - Current available balance
   - All pending carts and their totals
   - All bills and their due dates
   - Total obligations
   - Can I afford everything?
   - What should I prioritize?

3. Flag anything suspicious:
   - Charges that don't match any order
   - Bills that seem higher than usual
   - Due dates that are concerning

4. Give me a simple action plan:
   - What to pay NOW
   - What can WAIT
   - What needs INVESTIGATION

Let's start with my bank account first.
```

---

## Customization

Replace the bracketed sections with your actual accounts:

### Common Banks
- Chase: `chase.com`
- Bank of America: `bankofamerica.com`
- Wells Fargo: `wellsfargo.com`
- Capital One: `capitalone.com`
- Discover: `discover.com`

### Common Shopping
- Instacart: `instacart.com`
- Amazon: `amazon.com/cart`
- Walmart: `walmart.com/cart`
- Target: `target.com/cart`
- Costco: `costco.com`

### Common Utilities
- Duke Energy: `duke-energy.com`
- PG&E: `pge.com`
- Xfinity: `xfinity.com`
- AT&T: `att.com`
- Spectrum: `spectrum.net`

---

## Quick Version (Minimal Setup)

If you just want to try it fast:

```
Help me do a quick household financial check.

1. Open my bank at [URL] and tell me my balance
2. Check if I have anything in my Amazon cart
3. Tell me if I can afford what's in my cart

Just read - don't click anything that costs money.
```

---

## Weekly Routine Version

```
It's my weekly household scan time. Please:

1. Check my bank balance at [URL]
2. Check these shopping carts: [URLs]
3. Check these bills: [URLs]
4. Look at my Google Calendar for upcoming paydays/due dates

Give me:
- A dashboard of where I stand
- Any bills due in the next 7 days
- Anything that looks unusual
- What I should do this week

Let's go tab by tab.
```

---

## After a Scan

Good follow-up questions:
- "What was that $X charge from [merchant]?"
- "How does this month compare to typical?"
- "What subscriptions am I paying for?"
- "When is my next payday relative to these bills?"
- "What if I wait until Friday to buy groceries?"

---

## Remember

This is **your** assistant. It reads and analyzes, but **you** make all the decisions. Every purchase, every payment - you approve it yourself, outside of Claude.

The goal is **awareness**, not automation.

🏠 Happy scanning!
