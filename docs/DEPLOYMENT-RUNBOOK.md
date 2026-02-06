# GIA Platform — Deployment Runbook

## Pre-Deployment Checklist

### 1. Rotate Compromised API Keys
The following keys were previously committed to source control and MUST be rotated:

| Key | Where to rotate | Env var |
|-----|----------------|---------|
| Anthropic API Key | https://console.anthropic.com/settings/keys | `ANTHROPIC_API_KEY` |
| SAM.gov API Key | https://sam.gov/content/entity-information | `SAM_GOV_API_KEY` |
| VA Lighthouse Key | https://developer.va.gov/ | `VITE_VA_API_KEY` |

After rotating, add the new keys to `.env.local` (which is gitignored):
```
ANTHROPIC_API_KEY=sk-ant-your-new-key
VITE_ANTHROPIC_API_KEY=sk-ant-your-new-key
SAM_GOV_API_KEY=your-new-sam-key
VITE_SAM_GOV_API_KEY=your-new-sam-key
```

### 2. Scrub Git History
Old keys are still in git history. Use BFG Repo-Cleaner:
```bash
# Install BFG
brew install bfg  # or download from https://rtyley.github.io/bfg-repo-cleaner/

# Create a file with patterns to scrub
echo "sk-ant-api03-" > patterns.txt
echo "SAM-7e127255" >> patterns.txt
echo "VALID_MFA_TOKEN" >> patterns.txt

# Run BFG
bfg --replace-text patterns.txt

# Clean up
git reflog expire --expire=now --all
git gc --prune=now --aggressive

# Force push (destructive — all collaborators must re-clone)
git push --force
```

### 3. Set JWT Secret
Generate a strong secret:
```bash
openssl rand -hex 64
```
Add to `server/.env`:
```
JWT_SECRET=<paste-the-64-char-hex-here>
```
Requirements:
- Minimum 32 characters
- Cannot contain "CHANGE_ME"
- Server will refuse to start in production without it

### 4. Configure MFA (Optional — for break-glass)
Break-glass emergency access requires MFA. Until configured, break-glass activation will be blocked (by design).

To enable, set in `server/.env`:
```
MFA_PROVIDER=totp   # or 'webauthn' or 'duo'
```
Then integrate the provider in `server/src/security/breakGlass.ts` (search for the TODO comment).

### 5. Database SSL
DB SSL certificate validation is now enabled by default. If connecting to a local dev database without SSL:
```
DB_SSL_REJECT_UNAUTHORIZED=false
```
In production, do NOT set this — leave the default (certificate validation on).

## Environment Files

| File | Purpose | Git tracked? |
|------|---------|-------------|
| `.env` | Default placeholders, non-secret config | YES — never put real keys here |
| `.env.local` | Real API keys, overrides `.env` | NO (gitignored) |
| `server/.env` | Server-side config (JWT, DB, etc.) | Check .gitignore — should NOT be tracked |

**Load order**: `.env` loads first, then `.env.local` overrides with `override: true`. This matches Vite's behavior.

## Build & Run

### Development
```bash
npm install
npm run dev          # Starts Vite dev server at http://localhost:5173
```

### Production Build
```bash
npm run build        # Outputs to dist/
npm run preview      # Preview the production build locally
```

### Server (Express API)
```bash
cd server
npm install
npm start            # Starts Express on PORT (default 3001)
```

### Verify Governed Kernel
Quick health check — runs a single LLM call through the full governance pipeline:
```bash
npx tsx -e "
import { config } from './config.ts';
import { execute } from './services/governedLLM.ts';
const r = await execute({
  role: 'HEALTH_CHECK', purpose: 'verify',
  systemPrompt: 'Respond with: OK', userMessage: 'Status',
  maxTokens: 50, temperature: 0
});
console.log('Provider:', r.provider, '| Model:', r.model, '| Hash:', r.auditHash.substring(0,16));
"
```
Expected output: `Provider: anthropic_direct | Model: claude-sonnet-4-... | Hash: <16-char-hex>`

## Demo vs Live Mode

| Mode | Env var | Behavior |
|------|---------|----------|
| LIVE | `ACE_DEMO_MODE=false` | Real API calls, mock provider blocked |
| DEMO | `ACE_DEMO_MODE=true` | Mock provider only, no API spend |

The governed kernel enforces this: if mode is LIVE and the LLM factory returns a mock provider (no API key), the kernel throws `GovernanceDeniedError` with reason `MOCK_IN_LIVE_MODE`.

## Vercel Deployment (Current)
The platform is deployed to Vercel at `gia-platform.vercel.app`. For Vercel:
1. Add env vars in Vercel dashboard (Settings → Environment Variables)
2. Add `ANTHROPIC_API_KEY` and `VITE_ANTHROPIC_API_KEY`
3. Set `ACE_DEMO_MODE=false` for live, `true` for demo
4. The `vite build` runs automatically on push

## Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| `GovernanceDeniedError: MOCK_IN_LIVE_MODE` | No API key set but demo mode is off | Add key to `.env.local` or set `ACE_DEMO_MODE=true` |
| `FATAL: JWT_SECRET is not set` | Missing or weak JWT secret | Set `JWT_SECRET` in `server/.env` (32+ chars) |
| `MFA provider not configured` | Break-glass attempted without MFA setup | Set `MFA_PROVIDER` env var |
| Build succeeds but API calls fail | Key in `.env` but not `.env.local` | Move real key to `.env.local` |
| `Crypto API not available` | Running in Node < 19 without globalThis.crypto | Upgrade to Node 19+ or use browser |
