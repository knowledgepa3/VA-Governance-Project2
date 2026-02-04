# ACE Governance Platform - Production Safety Guide

This document outlines the security boundaries between demo/development code and production code.

## Environment Variables for Production

### Required in Production

| Variable | Description | Required |
|----------|-------------|----------|
| `NODE_ENV=production` | Enables production safeguards | Yes |
| `AUTH_PROVIDER` | Auth provider: `auth0`, `login_gov`, `azure_ad`, `okta` | Yes |
| `ANTHROPIC_API_KEY` | Real Anthropic API key | Yes (unless demo) |
| `ACE_STRICT_MODE=true` | Prevents mock data fallbacks | Recommended |

### Dangerous Overrides (Use Only for Demonstrations)

| Variable | What it does | Risk |
|----------|--------------|------|
| `ALLOW_MOCK_AUTH=true` | Allows mock auth in production | CRITICAL - No real authentication |
| `ALLOW_DEMO_IN_PRODUCTION=true` | Allows demo mode in production | HIGH - Fake data in responses |
| `VITE_ALLOW_DEMO_IN_PROD=true` | Allows browser demo mode in production | HIGH - Fake UI data |

## File Classification

### Production Code (Safe)

```
/server/           - Backend API server
/services/         - Core services
/governance/       - Risk profiles, compliance mapping
/workforce/        - Job Pack system
  - jobpacks/      - Job Pack definitions
  - AuthenticationGate.ts
  - ControlCatalog.ts
  - JobPackExecutor.ts
  - JobPackRegistry.ts
  - JobPackSchema.ts
/auth/             - Authentication system
  - providers/auth0.ts
  - providers/loginGov.ts
  - middleware.ts
  - types.ts
/llm/              - LLM provider abstraction
/scripts/          - CLI tools
/compliance/       - Generated compliance reports
```

### Demo/Example Code (Development Only)

```
/examples/                     - Demo scripts
  - playbookDemo.ts
  - bdWorkforceDemo.ts
  - cyberIRDemo.ts
  - mcpAgentDemo.ts
/workforce/
  - enterpriseDemo.ts          - Demo only
  - securityGatesDemo.ts       - Demo only
  - authGateDemo.ts            - Demo only
  - controlCatalogDemo.ts      - Demo only
/auth/providers/mock.ts        - NEVER use in production
/quicktest.ts                  - Development utility
```

### Test Files (Development Only)

```
/tests/            - Unit tests
*.test.ts          - Test files
```

### Evidence Bundles (Development Artifacts)

```
/evidence/         - Sample evidence bundles (for development reference)
```

## Security Safeguards Implemented

### 1. Authentication Factory (auth/factory.ts)

- **Production Behavior**: Throws error if no real auth provider is configured
- **Development Behavior**: Falls back to mock provider with warning
- **Override**: `ALLOW_MOCK_AUTH=true` (NOT RECOMMENDED)

### 2. Configuration (config.ts, config.browser.ts)

- **Production Behavior**: Demo mode must be explicitly enabled AND override set
- **Development Behavior**: Demo mode requires `ACE_DEMO_MODE=true`
- **Override**: `ALLOW_DEMO_IN_PRODUCTION=true`

### 3. Strict Mode (config.ts)

- **When Enabled** (`ACE_STRICT_MODE=true`): Data source failures throw errors
- **When Disabled**: Falls back to mock data with `source: 'MOCK'` indicator
- **Recommendation**: Always enable in production

### 4. Evidence Bundles (governance/ExecutionAttestation.ts)

- Every execution records the risk profile that governed it
- Attestation hash proves governance was applied
- Sealed bundles cannot be modified

## Pre-Deployment Checklist

- [ ] `NODE_ENV=production` is set
- [ ] `AUTH_PROVIDER` is set to a real provider (not `mock`)
- [ ] `ANTHROPIC_API_KEY` is a real key (not placeholder)
- [ ] `ACE_STRICT_MODE=true` is set
- [ ] `ACE_DEMO_MODE` is NOT set or is `false`
- [ ] No `ALLOW_*` override variables are set
- [ ] Auth provider credentials are configured
- [ ] Run `npm run validate-config` to verify

## Audit Trail

When running in production, every execution produces:

1. **Risk Profile Attestation**
   - `profile_id`, `profile_version`, `profile_hash`
   - Effective MAI policy
   - Effective tolerance thresholds

2. **Execution Context**
   - `execution_id`, `job_pack_id`
   - Actions attempted, blocked, escalated
   - Human approval requests/responses

3. **Evidence Bundle**
   - `manifest.json` with SHA-256 hashes
   - `seal.status` state machine
   - Complete audit trail

## Incident Response

If you discover demo/mock code was used in production:

1. **Identify scope**: Check `source_context.json` in evidence bundles
2. **Check attestations**: Look for `source: 'MOCK'` in any data
3. **Review decisions**: Any BD capture decisions based on mock data are invalid
4. **Remediate**: Re-run affected analyses with `ACE_STRICT_MODE=true`

## Contact

For security concerns, contact the platform security team.
