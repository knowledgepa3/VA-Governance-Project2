# GIA Demo Fulfillment Guide

## Quick Start Checklist

When you receive a demo request:

### 1. Acknowledge (within 2 hours)
- [ ] Send acknowledgment email using template below
- [ ] Include their Run ID

### 2. Execute (within 24 hours)
- [ ] Run the workflow locally
- [ ] Start screen recording (OBS or Loom)
- [ ] Execute with governance visible
- [ ] Export evidence pack

### 3. Deliver
- [ ] Send results email with:
  - [ ] Outcome summary (1 page)
  - [ ] Audit log
  - [ ] Evidence pack (zip)
  - [ ] Recording link

---

## Email Templates

### Acknowledgment Email

```
Subject: Your GIA Demo Request [Run ID: {RUN_ID}]

Hi {NAME},

Thanks for requesting a governed run! We received your request:

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Run ID: {RUN_ID}
Workflow: {WORKFLOW_TYPE}
Governance: {GOVERNANCE_MODE}
Task: {TASK_DESCRIPTION}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

We're preparing your governed execution now. You'll receive your complete evidence bundle (results, audit log, and recording) within 24 hours.

Questions? Just reply to this email.

— GIA Platform
```

### Results Email

```
Subject: Your GIA Results Ready [Run ID: {RUN_ID}]

Hi {NAME},

Your governed workflow run is complete. Here's everything:

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
RUN SUMMARY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Run ID: {RUN_ID}
Status: ✅ Completed
Governance Mode: {GOVERNANCE_MODE}
Execution Time: {DURATION}
Gates Triggered: {GATE_COUNT}
Actions Logged: {ACTION_COUNT}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
YOUR DELIVERABLES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📄 Outcome Summary
{SUMMARY_LINK}

📋 Full Audit Log
{AUDIT_LOG_LINK}

📦 Evidence Pack (ZIP)
{EVIDENCE_PACK_LINK}

🎬 Execution Recording ({DURATION} min)
{LOOM_LINK}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
KEY FINDINGS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

{BRIEF_FINDINGS}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Want to see GIA running for your specific workflows?
Let's schedule a 15-minute call: {CALENDAR_LINK}

— GIA Platform
```

---

## Workflow Execution Scripts

### Federal Opportunity Search (BD Capture)

```
1. Open Claude Code in the ACE project
2. Start Loom/OBS recording
3. Prompt: "Search SAM.gov for {THEIR_CRITERIA}. Find opportunities matching those requirements and provide a brief analysis of the top 3."
4. Walk through the results, show governance panel
5. Export evidence pack
6. Stop recording
```

### Research Brief

```
1. Open Claude Code
2. Start recording
3. Prompt: "Research {THEIR_TOPIC}. Provide a briefing with key facts, recent developments, and sources. Show your work."
4. Let it run, show the source citations
5. Export as markdown + evidence
6. Stop recording
```

### Price Comparison

```
1. Open Claude Code with browser tools
2. Start recording
3. Prompt: "Find the best price for {THEIR_PRODUCT} across major retailers. Compare prices and show where each price came from."
4. Show browser automation with approval gates
5. Compile results
6. Stop recording
```

---

## Evidence Pack Contents

Each delivery should include:

```
{RUN_ID}/
├── outcome-summary.md       # 1-page results
├── audit-log.json           # Full action log
├── screenshots/             # Key moments
│   ├── 001-start.png
│   ├── 002-governance.png
│   └── 003-results.png
├── manifest.json            # File hashes for verification
└── recording-link.txt       # Loom URL
```

### Manifest Template

```json
{
  "run_id": "{RUN_ID}",
  "completed_at": "{TIMESTAMP}",
  "workflow": "{WORKFLOW_TYPE}",
  "governance_mode": "{GOVERNANCE_MODE}",
  "files": [
    {
      "name": "outcome-summary.md",
      "sha256": "{HASH}"
    }
  ],
  "actions_logged": {ACTION_COUNT},
  "gates_triggered": {GATE_COUNT},
  "platform_version": "1.0.0"
}
```

---

## Tips for Great Demos

1. **Talk while you work** - Narrate what's happening during recording
2. **Show the governance** - Highlight when gates trigger, when approvals happen
3. **Keep it short** - 2-5 minutes max for the recording
4. **Be responsive** - Fast turnaround impresses people
5. **Follow up** - Ask how it went, what they'd want to try next

---

## Tracking

Keep a simple log of requests:

| Date | Run ID | Name | Email | Workflow | Status | Notes |
|------|--------|------|-------|----------|--------|-------|
| 2026-02-04 | GIA-2026-0204-001 | John | john@co.com | BD Capture | Delivered | Interested in full setup |

---

## Common Questions

**Q: How long does this take?**
A: Budget 30-45 minutes per request (execution + packaging)

**Q: What if I can't fulfill quickly?**
A: Set expectations in acknowledgment email. "Within 24-48 hours" is fine.

**Q: Should I charge for this?**
A: No - this is lead gen. The value is in follow-up conversations.

**Q: What if they want something I can't do?**
A: Reply honestly. "That workflow isn't available yet, but here's what we can do..."
