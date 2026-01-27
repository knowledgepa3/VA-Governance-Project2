# 🚀 RUN IT NOW - Quick Start

You're 3 commands away from seeing your BD Dashboard running!

---

## Step 1: Install Dependencies (One-Time Setup)

```bash
cd /home/user/ACE-VA-Agents
npm install
```

**What this does:** Downloads React, TypeScript, Anthropic SDK, Playwright, etc.

**Expected:** Takes 1-2 minutes, shows "added 437 packages"

---

## Step 2: Add Your API Key

Edit the `.env` file (I created it for you):

```bash
# Open in your editor
nano .env

# Or if you prefer:
code .env
```

Replace `your-api-key-here` with your actual Claude API key:

```
ANTHROPIC_API_KEY=sk-ant-api03-YOUR-REAL-KEY-HERE
VITE_ANTHROPIC_API_KEY=sk-ant-api03-YOUR-REAL-KEY-HERE
```

**Get your key:** https://console.anthropic.com/settings/keys

---

## Step 3: Start the App

```bash
npm run dev
```

**You'll see:**
```
  VITE v6.2.0  ready in 523 ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
  ➜  press h + enter to show help
```

---

## Step 4: Open Your Browser

Go to: **http://localhost:5173/**

You'll see a landing page with 2 apps:

### Option A: BD RFP Pipeline (NEW!) 🎯
Click "Launch BD Dashboard" to see:
- Business Development dashboard
- Opportunity qualification workflow
- Executive metrics
- Evidence pack generation

### Option B: VA Claims Processing 📋
Click "Launch VA Workflow" to see:
- Original agentic workforce
- Evidence extraction pipeline
- MAI governance in action

---

## What You Can Do Right Now

### In the BD Dashboard:

1. **Click "Ingest RFPs"**
   - Loads 5 sample RFPs
   - Shows them in the list

2. **Click "Qualify All"**
   - Runs the AI analysis (simulated for now)
   - Calculates win probability
   - Makes bid/no-bid recommendations
   - Takes ~15 seconds

3. **See the Results:**
   - Metrics cards update (Strong Bids, Pipeline Value, etc.)
   - Opportunities get colored badges
   - Filter by Strong Bids, Qualified, or No-Bids

---

## Current Status

### ✅ What's Working:
- React app runs
- Components render beautifully
- State management works
- Filters and buttons functional
- All TypeScript compiles

### ⏸️ What's Simulated (Not Real Yet):
- Browser automation (no actual Playwright running)
- SAM.gov API (using sample data)
- Claude API calls (need your key + integration)
- Evidence pack generation (mock data for now)

### 🔧 What We'll Build Next:
- Wire up real Claude API
- Connect Playwright for actual browser automation
- Integrate SAM.gov data feed
- Generate real evidence packs

---

## Troubleshooting

### "npm not found"
Install Node.js: https://nodejs.org/
Then run `npm install` again.

### "Port 5173 already in use"
Kill the existing process:
```bash
pkill -f vite
# Then try npm run dev again
```

### "Module not found"
```bash
npm install
# Make sure all dependencies install
```

### TypeScript errors?
```bash
npm run build
# This will show any compile errors
```

### It's running but blank screen?
1. Check browser console (F12) for errors
2. Make sure you're on http://localhost:5173/
3. Try hard refresh (Ctrl+Shift+R)

---

## Next Steps After It's Running

Once you see the dashboard, come back and say:

**"It's working! Now what?"**

I'll help you:
1. Wire up the real Claude API
2. Connect to actual data sources
3. Build the evidence pack viewer
4. Add authentication
5. Deploy it

---

## File Structure (What We Just Built)

```
/home/user/ACE-VA-Agents/
├── bd-app.tsx                    ← BD App entry point
├── bd.html                       ← BD App HTML
├── index-landing.html            ← Landing page (choose app)
├── components/
│   └── BDDashboard.tsx           ← Main dashboard component ⭐
├── styles/
│   └── BDDashboard.css           ← Dashboard styles
├── bdWorkforce.ts                ← Backend logic (qualification, scoring)
├── playbooks/
│   └── bd-rfp-pipeline.playbook.json ← 15-step workflow
├── .env                          ← Your API keys (add them!)
└── vite.config.ts                ← Updated for multiple apps
```

---

## Quick Test Checklist

- [ ] Ran `npm install` successfully
- [ ] Added API key to `.env`
- [ ] Ran `npm run dev`
- [ ] Browser opened to http://localhost:5173/
- [ ] Can see landing page
- [ ] Clicked "Launch BD Dashboard"
- [ ] Can see BD Dashboard
- [ ] Clicked "Ingest RFPs" - sees 5 RFPs
- [ ] Clicked "Qualify All" - sees results

**If all checked:** 🎉 YOU'RE RUNNING!

---

## Questions?

**Stuck on a step?** Copy/paste the error message and I'll help fix it.

**Want to understand something?** Ask me to explain any part.

**Ready for next phase?** Say "Let's wire up the real APIs!"

---

**You're doing amazing! Let's see this thing run! 🚀**
