# Quick Start Guide - View Your BD Dashboard

## The Issue You're Experiencing

You're running `npm run dev` from Windows Command Prompt, but the code is on a **Linux server** (`/home/user/ACE-VA-Agents`). They're two different systems, so the connection fails.

---

## ✅ EASIEST SOLUTION: View Standalone HTML Demo

**This requires NO server, NO npm, NO setup!**

### Option 1: Download and Open (Recommended)

1. **Download the standalone demo:**
   - Go to your GitHub repo: https://github.com/knowledgepa3/ACE-VA-Agents
   - Navigate to: `bd-demo-standalone.html`
   - Click "Raw" button
   - Save the file (Ctrl+S or Cmd+S)

2. **Open in browser:**
   - Double-click the downloaded HTML file
   - It opens directly in your browser
   - **Works 100% offline, no server needed!**

3. **Try it out:**
   - Click "Ingest RFPs" to load sample opportunities
   - Click "Qualify All" to see the analysis simulation
   - Explore the dashboard features

### Option 2: Direct GitHub View

1. Go to: https://raw.githubusercontent.com/knowledgepa3/ACE-VA-Agents/claude/review-code-NEzuX/bd-demo-standalone.html
2. Copy all the HTML code
3. Create a new file on your computer called `bd-demo.html`
4. Paste the code
5. Double-click to open

---

## 🔧 Why npm run dev Doesn't Work

Your setup has two separate environments:

```
Windows (Your Computer)
  C:\Users\knowl\...
  ↕️ (NO DIRECT CONNECTION)
Linux Server (Where code lives)
  /home/user/ACE-VA-Agents
```

**The Problem:**
- You run `npm run dev` on Windows
- It looks for `package.json` in your Windows directory
- But the code is on the Linux server
- They can't talk to each other

---

## 🎯 3 Ways to Actually Run the Full App

### Method 1: Clone to Windows (Recommended)

```bash
# In Windows Command Prompt or PowerShell
cd C:\Users\knowl\Documents
git clone https://github.com/knowledgepa3/ACE-VA-Agents.git
cd ACE-VA-Agents
npm install
npm run dev
```

Then open: http://localhost:5173

### Method 2: Use the Linux Server

If you have SSH access to the Linux server:

```bash
ssh user@your-linux-server
cd /home/user/ACE-VA-Agents
npm install
npm run dev -- --host 0.0.0.0
```

Then access from Windows: http://[server-ip]:5173

### Method 3: Deploy to Vercel (Easiest for Testing)

1. Go to https://vercel.com
2. Sign in with GitHub
3. Import your repo: `knowledgepa3/ACE-VA-Agents`
4. Deploy (takes 2 minutes)
5. Get a live URL like: `ace-va-agents.vercel.app`

**Costs nothing, updates automatically when you push to GitHub!**

---

## 📊 What You'll See in the Dashboard

### When Using Standalone HTML (Demo Mode)
- ✅ Beautiful UI with all features
- ✅ Sample RFP opportunities
- ✅ Simulated qualification workflow
- ✅ Win probability visualization
- ✅ Evidence pack previews
- ❌ No real Claude API calls (demo only)

### When Running Full App (npm run dev)
- ✅ Everything from demo mode
- ✅ REAL Claude API integration
- ✅ REAL Playwright browser automation
- ✅ REAL SAM.gov scraping
- ✅ REAL USASpending.gov intelligence
- ✅ REAL evidence pack generation

---

## 🚀 Next Steps After Viewing Demo

1. **View the standalone HTML first** (easiest)
   - Get familiar with the UI
   - Understand the workflow
   - See what data it shows

2. **Clone to Windows** (for real testing)
   - Follow Method 1 above
   - Add your `.env` file with `ANTHROPIC_API_KEY`
   - Test with real RFP numbers

3. **Deploy to Vercel** (for permanent access)
   - Always available at a URL
   - No local setup needed
   - Share with your team

---

## 🔐 Security Note

The standalone HTML demo contains NO:
- ❌ Real API keys
- ❌ Sensitive data
- ❌ Backend connections
- ❌ Authentication

It's 100% safe to share and demo.

---

## ❓ Troubleshooting

### "npm: command not found"
- Install Node.js from: https://nodejs.org
- Restart Command Prompt after installing

### "Cannot find module"
- Run: `npm install` first
- Make sure you're in the project directory

### "Port 5173 already in use"
- Kill the existing process
- Or use: `npm run dev -- --port 3000`

### "EACCES: permission denied"
- Don't run as Administrator (causes issues)
- Run as normal user

---

## 💡 Pro Tips

1. **Use the standalone HTML for demos/presentations**
   - Works offline
   - No dependencies
   - Opens instantly

2. **Use the full app for actual BD work**
   - Real analysis
   - Evidence packs
   - Production-ready

3. **Deploy to Vercel for team access**
   - Share one URL with everyone
   - Auto-updates when you push code
   - Free for non-commercial use

---

## 📞 Still Stuck?

Try this diagnostic:

```bash
# Check if Node.js is installed
node --version

# Check if npm is installed
npm --version

# Check current directory
cd

# List files
dir
```

If you see version numbers for node and npm, you're ready to run the app!

---

*Need help? The standalone HTML demo is your fastest path to seeing the UI right now.*
