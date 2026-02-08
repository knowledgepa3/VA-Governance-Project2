/**
 * Onboarding Configuration Route — Public Constrained Endpoint
 *
 * POST /api/onboarding/configure
 *
 * Public pre-auth route with constrained capability:
 * - No privileged actions, no sensitive data access
 * - Strict input/output schema
 * - No tool execution, no internal system access
 * - Multi-key rate limited + security logged
 *
 * Processing:
 * 1. Bot detection (honeypot + timing)
 * 2. Input validation (strict schema)
 * 3. Domain → workforce mapping (deterministic first, LLM fallback)
 * 4. GIA governance classification (MAI + EU AI Act risk tier)
 * 5. HMAC-signed evidence artifact
 * 6. Audit entry (no PII)
 *
 * Layer Check: Execution (Claude call) + Governance (MAI + risk) + Evidence (signed hash)
 */

import Anthropic from '@anthropic-ai/sdk';
import { Router, Request, Response } from 'express';
import { logger } from '../logger';
import { hashObject, generateUUID, fingerprint, createSignedEvidence } from '../utils/crypto';
import { secureAuditStore } from '../audit/auditStoreSecure';
import {
  classifyDecision,
  assessRiskTier,
  mapDomainToWorkforce,
  buildWorkforceMappingFromClaude,
  buildCannotClassifyMapping,
  validateClaudeResponse,
  getGovernanceRecommendations,
  WORKFORCE_TEMPLATES,
} from '../governance/onboardingGovernance';
import {
  logOnboardingRequest,
  logBotDetection,
  hashIp,
  hashEmail,
  hashOrg,
  MatchType,
} from '../security/securityLogger';

const log = logger.child({ component: 'OnboardingRoute' });

// Policy + template versions (bump when logic changes)
const POLICY_VERSION = '1.0.0';
const TEMPLATE_VERSION = '1.0.0';

// Initialize Claude client (reuses server-side API key)
const apiKey = process.env.ANTHROPIC_API_KEY;
let anthropic: Anthropic | null = null;
if (apiKey) {
  anthropic = new Anthropic({ apiKey });
}

// ═══════════════════════════════════════════════════════════════════
// CLAUDE PROMPT — PINNED CONTRACT
// ═══════════════════════════════════════════════════════════════════

const SYSTEM_PROMPT = `You are a workspace configuration engine for the GIA (Governed Intelligence Architecture) platform. Analyze the user's domain and recommend the optimal workspace configuration.

You have 5 existing workforce types:

1. VA_CLAIMS - "VA Forensic Evidence Analysis" - VA disability claims, evidence analysis, rating support.
   Agents: Gateway, Timeline Builder, Evidence Validator, Initial Rater, C&P Examiner, Rater Decision, QA, Report Generator, Telemetry.

2. FINANCIAL_AUDIT - "Corporate Integrity (Audit/Tax)" - Financial auditing, fraud detection, tax compliance.
   Agents: Gateway, Ledger Auditor, Fraud Detector, Tax Compliance, Financial QA, Financial Report Generator, Telemetry.

3. CYBER_IR - "Cyber Incident Response (Kill Chain Validation)" - Cybersecurity incident response, MITRE ATT&CK.
   Agents: Cyber Triage, Kill Chain Analyzer, IOC Validator, Lateral Movement Tracker, Compliance Mapper, Threat Intel Correlator, Containment Advisor, Cyber QA, IR Report Generator, Telemetry.

4. BD_CAPTURE - "BD Capture (Proposal Development)" - Government/commercial proposals, RFP responses.
   Agents: RFP Analyzer, Compliance Matrix, Past Performance, Technical Writer, Pricing Analyst, Proposal QA, Proposal Assembler, Telemetry.

5. GRANT_WRITING - "Federal Grant Application" - Federal grant proposals, NOFO parsing, budget justification.
   Agents: Grant Opportunity Analyzer, Eligibility Validator, Narrative Writer, Budget Developer, Compliance Checker, Evaluator Lens, Grant QA, Application Assembler, Telemetry.

RULES:
- If the domain clearly maps to an existing type, use it (confidence >= 0.5).
- If the domain is ambiguous or doesn't clearly fit, set matchedType to "CANNOT_CLASSIFY".
- NEVER invent a confident match. If confidence < 0.5, you MUST use "CANNOT_CLASSIFY".
- For truly novel domains OR when the user provides a wishlist, design a CUSTOM agent pipeline.
- Always recommend a primaryLaunchUrl: "/app" for most verticals, "/bd" for BD, "/console" for custom/experimental.

CUSTOM PIPELINE DESIGN RULES (when designing from a wishlist):
- Each role MUST be named as "[Domain-Specific Prefix] [Archetype]"
- Allowed archetypes (pick from this list ONLY):
  Gateway, Intake, Extractor, Analyzer, Compliance, Scorer, Writer, Builder, Validator, QA, Supervisor, Telemetry
- Examples: "Gateway", "RFI Extractor", "Policy Compliance", "Risk Scorer", "Proposal Writer", "Evidence Validator", "QA", "Telemetry"
- First role MUST be "Gateway"
- Last role MUST be "Telemetry"
- Always include "QA" before the final output role
- 6-10 roles per pipeline (not fewer than 6, not more than 10)
- If constraints include "human-approval", note it in the pipelineDescription
- If constraints include "no-pii", note PII redaction in the pipelineDescription
- If constraints include "read-only", only use Intake/Extractor/Analyzer/QA/Telemetry archetypes

Respond ONLY with valid JSON (no markdown, no code fences). Use this EXACT schema:
{
  "matchedType": "VA_CLAIMS" | "FINANCIAL_AUDIT" | "CYBER_IR" | "BD_CAPTURE" | "GRANT_WRITING" | "CANNOT_CLASSIFY" | null,
  "matchConfidence": <number 0-1>,
  "matchRationale": "<string explaining your reasoning>",
  "isCustom": <boolean>,
  "pipelineName": "<string — short name, e.g. 'RFI Response Builder'>",
  "pipelineDescription": "<string — end-to-end workflow description with constraints noted>",
  "roles": ["<role1>", "<role2>", ...],
  "primaryLaunchUrl": "<string>"
}`;

// ═══════════════════════════════════════════════════════════════════
// INPUT VALIDATION — STRICT SCHEMA
// ═══════════════════════════════════════════════════════════════════

const VALID_GOVERNANCE = ['Advisory', 'Strict', 'Regulated'];
const SETUP_ID_PATTERN = /^GIA-\d{4}-\d{4}-\d{3}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_FIELD_LENGTH = 100;
const MAX_DOMAIN_LENGTH = 600;
const MAX_WISHLIST_LENGTH = 1200;
const MIN_SUBMIT_TIME_MS = 2000; // Bot timing check: < 2s = suspicious

// Valid structured tags (must match frontend chips exactly)
const VALID_INPUTS = ['pdf', 'word', 'csv', 'urls', 'email', 'images'];
const VALID_OUTPUTS = ['report', 'checklist', 'json', 'summary', 'timeline', 'matrix'];
const VALID_CONSTRAINTS = ['no-pii', 'read-only', 'human-approval', 'no-external'];

function sanitizeString(input: string, maxLen: number): string {
  return String(input || '')
    .trim()
    .slice(0, maxLen)
    .replace(/[<>"'`]/g, '');
}

interface ValidationResult {
  valid: boolean;
  errors: Record<string, string>;
  botDetected: boolean;
  sanitized: {
    organization: string;
    name: string;
    email: string;
    domain: string;
    governance: string;
    setupId: string;
    wishlist: string;
    inputs: string[];
    outputs: string[];
    constraints: string[];
  };
}

function validateInput(body: any): ValidationResult {
  const errors: Record<string, string> = {};
  let botDetected = false;

  // Bot detection: honeypot field
  if (body.website && String(body.website).trim().length > 0) {
    botDetected = true;
  }

  // Bot detection: timing check
  if (body._t && typeof body._t === 'number') {
    const elapsed = Date.now() - body._t;
    if (elapsed < MIN_SUBMIT_TIME_MS) {
      botDetected = true;
    }
  }

  const organization = sanitizeString(body.organization, MAX_FIELD_LENGTH);
  const name = sanitizeString(body.name, MAX_FIELD_LENGTH);
  const email = sanitizeString(body.email, MAX_FIELD_LENGTH);
  const domain = sanitizeString(body.domain, MAX_DOMAIN_LENGTH);
  const governance = sanitizeString(body.governance, 20);
  const setupId = sanitizeString(body.setupId, 20);

  // Wishlist fields (optional — only present for custom domains)
  const wishlist = sanitizeString(body.wishlist || '', MAX_WISHLIST_LENGTH);

  // Structured tags — validated against whitelists
  const parseTagArray = (raw: unknown, allowed: string[], max: number): string[] => {
    if (!Array.isArray(raw)) return [];
    return raw
      .map((c: unknown) => String(c).trim().toLowerCase())
      .filter((c: string) => allowed.includes(c))
      .slice(0, max);
  };
  const inputs = parseTagArray(body.inputs, VALID_INPUTS, 6);
  const outputs = parseTagArray(body.outputs, VALID_OUTPUTS, 6);
  const constraints = parseTagArray(body.constraints, VALID_CONSTRAINTS, 4);

  if (!organization) errors.organization = 'Organization is required';
  if (!name) errors.name = 'Name is required';
  if (!email) errors.email = 'Email is required';
  else if (!EMAIL_PATTERN.test(email)) errors.email = 'Invalid email format';
  if (!domain) errors.domain = 'Domain is required';
  if (!governance || !VALID_GOVERNANCE.includes(governance)) errors.governance = 'Invalid governance level';
  if (!setupId || !SETUP_ID_PATTERN.test(setupId)) errors.setupId = 'Invalid setup ID format';

  return {
    valid: Object.keys(errors).length === 0,
    errors,
    botDetected,
    sanitized: { organization, name, email, domain, governance, setupId, wishlist, inputs, outputs, constraints }
  };
}

// ═══════════════════════════════════════════════════════════════════
// ROUTE HANDLER
// ═══════════════════════════════════════════════════════════════════

export function createOnboardingRouter(): Router {
  const router = Router();

  router.post('/configure', async (req: Request, res: Response) => {
    const startTime = Date.now();
    const configurationId = generateUUID();
    const ipHash = hashIp(req.ip || req.socket.remoteAddress);
    let matchType: MatchType = 'DIRECT_MATCH';
    let statusCode = 200;

    try {
      // 1. Validate input + bot detection
      const validation = validateInput(req.body);

      // Bot detected — generic 400, don't reveal detection method
      if (validation.botDetected) {
        statusCode = 400;
        logBotDetection({
          request_id: configurationId,
          ip_hash: ipHash,
          detection_type: req.body?.website ? 'honeypot' : 'timing',
          path: req.path,
        });
        res.status(400).json({ error: 'Invalid request', code: 'VALIDATION_ERROR' });
        return;
      }

      if (!validation.valid) {
        statusCode = 400;
        res.status(400).json({ error: 'Validation failed', code: 'VALIDATION_ERROR', fields: validation.errors });
        return;
      }

      const { organization, name, email, domain, governance, setupId, wishlist, inputs, outputs, constraints } = validation.sanitized;
      const emailDomain = email.split('@')[1] || 'unknown';
      const orgHash = hashOrg(organization, emailDomain);
      const identHash = hashEmail(email);
      const hasWishlist = wishlist.length > 0 || inputs.length > 0 || outputs.length > 0;

      log.info('Onboarding configuration requested', {
        configurationId,
        setupId,
        domain: fingerprint(domain),
        governance,
        hasWishlist,
        inputCount: inputs.length,
        outputCount: outputs.length,
        constraintCount: constraints.length,
      });

      // 2. Try direct workforce mapping first (deterministic, no LLM)
      let workforceMapping = mapDomainToWorkforce(domain, governance);
      let claudeModel = 'none';
      let tokenUsage = { input: 0, output: 0 };

      if (workforceMapping) {
        matchType = 'DIRECT_MATCH';
      }

      // 3. If no direct mapping, call Claude (LLM fallback)
      if (!workforceMapping) {
        if (!anthropic) {
          log.warn('Claude unavailable for custom domain mapping — no API key');
          matchType = 'FALLBACK';
          workforceMapping = buildCannotClassifyMapping(organization, domain, inputs, outputs);
        } else {
          try {
            claudeModel = 'claude-3-5-haiku-20241022';

            // Build rich user message — include structured wishlist if available
            let userMessage = `Configure workspace for:\nOrganization: ${organization}\nDomain: ${domain}\nGovernance Level: ${governance}`;

            if (hasWishlist) {
              userMessage += '\n\n--- CUSTOM WORKFLOW WISHLIST ---';
              if (wishlist) {
                userMessage += `\nWorkflow Description:\n${wishlist}`;
              }
              if (inputs.length > 0) {
                userMessage += `\nInput Types: ${inputs.join(', ')}`;
              }
              if (outputs.length > 0) {
                userMessage += `\nExpected Outputs: ${outputs.join(', ')}`;
              }
              if (constraints.length > 0) {
                userMessage += `\nConstraints: ${constraints.join(', ')}`;
              }
              userMessage += '\n\nIMPORTANT: This is a custom workflow request. Design a bespoke agent pipeline. Each role MUST map to one of these archetypes: Intake, Extractor, Analyzer, Compliance, Writer, Scorer, QA, Supervisor, or Telemetry. Customize the role NAME to the domain (e.g., "RFI Extractor" not "Extractor"), but the archetype must be recognizable. Include constraints in the pipeline description.';
            }

            const response = await anthropic.messages.create({
              model: claudeModel,
              max_tokens: 1024,
              temperature: 0,
              system: SYSTEM_PROMPT,
              messages: [{ role: 'user', content: userMessage }],
            });

            tokenUsage = {
              input: response.usage?.input_tokens || 0,
              output: response.usage?.output_tokens || 0,
            };

            // Parse + validate Claude's response against strict schema
            const textBlock = response.content.find(b => b.type === 'text');
            if (!textBlock || textBlock.type !== 'text') {
              throw new Error('No text response from Claude');
            }

            const rawParsed = JSON.parse(textBlock.text);
            const validated = validateClaudeResponse(rawParsed);

            if (!validated) {
              log.warn('Claude response failed schema validation', { configurationId });
              matchType = 'FALLBACK';
              workforceMapping = buildCannotClassifyMapping(organization, domain, inputs, outputs);
            } else if (validated.matchedType === 'CANNOT_CLASSIFY' || validated.matchConfidence < 0.5) {
              matchType = 'CANNOT_CLASSIFY';
              workforceMapping = buildWorkforceMappingFromClaude(validated);
            } else if (validated.isCustom && hasWishlist) {
              // Custom pipeline designed from user's wishlist
              matchType = 'CUSTOM_DESIGNED';
              workforceMapping = buildWorkforceMappingFromClaude(validated);
            } else {
              matchType = 'LLM_CLASSIFIED';
              workforceMapping = buildWorkforceMappingFromClaude(validated);
            }
          } catch (claudeErr: any) {
            log.warn('Claude configuration failed, using fallback', { error: claudeErr.message });
            matchType = 'FALLBACK';
            workforceMapping = buildCannotClassifyMapping(organization, domain, inputs, outputs);
          }
        }
      }

      // 4. Run governance classification
      const maiResult = classifyDecision({
        decision: `Configure AI workspace for ${domain} with ${governance} governance`,
        domain,
        has_legal_impact: governance === 'Regulated',
        has_financial_impact: domain.toLowerCase().includes('finance'),
        is_client_facing: false,
      });

      const riskResult = assessRiskTier({
        system_description: `AI agent workforce for ${domain} operations`,
        domain,
        autonomous_decisions: governance !== 'Advisory',
        affects_individuals: governance === 'Regulated',
      });

      const recommendations = getGovernanceRecommendations(governance, domain, riskResult.risk_tier);

      // 5. Build launch config
      const launchLinks = [
        { label: workforceMapping.pipelineName.split('(')[0].trim(), url: workforceMapping.primaryUrl, icon: getIconForUrl(workforceMapping.primaryUrl) },
        { label: 'Console', url: '/console', icon: 'terminal' },
        { label: 'Portal', url: '/', icon: 'globe' },
      ];

      // 6. Create HMAC-signed evidence artifact
      const configHash = hashObject(workforceMapping);
      let evidenceHash = configHash;
      let evidenceSignature = '';

      try {
        const signed = createSignedEvidence({
          requestId: configurationId,
          timestamp: new Date().toISOString(),
          policyVersion: POLICY_VERSION,
          templateVersion: TEMPLATE_VERSION,
          configHash,
        });
        evidenceHash = signed.hash;
        evidenceSignature = signed.signature;
      } catch (signErr) {
        // If JWT_SECRET missing (dev), fall back to unsigned hash
        log.warn('Evidence signing failed — JWT_SECRET may be missing', { error: (signErr as Error).message });
      }

      // 7. Assemble response (strict output schema)
      const configuration = {
        setupId,
        configurationId,
        timestamp: new Date().toISOString(),
        workforceMapping: {
          matchedType: workforceMapping.matchedType,
          matchConfidence: workforceMapping.matchConfidence,
          matchRationale: workforceMapping.matchRationale,
          isCustom: workforceMapping.isCustom,
        },
        agentPipeline: {
          name: workforceMapping.pipelineName,
          roles: workforceMapping.roles,
          description: workforceMapping.description,
        },
        governanceProfile: {
          level: governance,
          maiClassification: {
            classification: maiResult.classification,
            confidence: maiResult.confidence,
            rationale: maiResult.rationale,
            gateRequired: maiResult.gate_required,
          },
          riskTier: {
            tier: riskResult.risk_tier,
            rationale: riskResult.rationale,
            requirements: riskResult.governance_requirements.slice(0, 5),
          },
          recommendations,
        },
        launchConfig: {
          primaryUrl: workforceMapping.primaryUrl,
          links: launchLinks,
        },
        evidence: {
          configHash: evidenceHash,
          signature: evidenceSignature,
          policyVersion: POLICY_VERSION,
          templateVersion: TEMPLATE_VERSION,
          requestId: configurationId,
          model: claudeModel,
          tokenUsage,
        },
      };

      // 8. Audit (no PII — only domain, governance, config hash)
      // Normalized domain for GIA MCP correlation (maps to MCP enum)
      const mcpDomain = normalizeDomainForMCP(domain);

      try {
        await secureAuditStore.append(
          { sub: 'anonymous', role: 'onboarding', sessionId: setupId, tenantId: 'pre-signup' },
          'ONBOARDING_CONFIG_GENERATED',
          { type: 'onboarding_config', id: configurationId },
          {
            domain: fingerprint(domain),
            mcpDomain, // GIA MCP-compatible domain enum
            governance,
            matchType,
            matchedWorkforceType: workforceMapping.matchedType,
            matchConfidence: workforceMapping.matchConfidence,
            pipelineName: workforceMapping.pipelineName,
            roleCount: workforceMapping.roles.length,
            riskTier: riskResult.risk_tier,
            maiClassification: maiResult.classification,
            hasWishlist,
            inputs: inputs.length > 0 ? inputs : undefined,
            outputs: outputs.length > 0 ? outputs : undefined,
            constraints: constraints.length > 0 ? constraints : undefined,
            evidenceHash,
            evidenceSignature: evidenceSignature.slice(0, 16) + '...',
            claudeModel,
            inputTokens: tokenUsage.input,
            outputTokens: tokenUsage.output,
            durationMs: Date.now() - startTime,
          }
        );
      } catch (auditErr) {
        log.warn('Audit entry failed for onboarding config', { error: (auditErr as Error).message });
      }

      // 9. Security log (structured, PII hashed)
      logOnboardingRequest({
        request_id: configurationId,
        ip_hash: ipHash,
        org_hash: orgHash,
        identifier_hash: identHash,
        domain_requested: domain,
        governance_level: governance,
        match_type: matchType,
        matched_workforce: workforceMapping.matchedType,
        rate_limit: { allowed: true },
        evidence: { hash: evidenceHash, signature: evidenceSignature.slice(0, 16) },
        latency_ms: Date.now() - startTime,
        status_code: 200,
      });

      res.json(configuration);

    } catch (err: any) {
      statusCode = 500;
      log.error('Onboarding configuration error', { configurationId }, err);

      logOnboardingRequest({
        request_id: configurationId,
        ip_hash: ipHash,
        org_hash: '',
        identifier_hash: '',
        domain_requested: '',
        governance_level: '',
        match_type: 'DENIED',
        matched_workforce: null,
        rate_limit: { allowed: true },
        latency_ms: Date.now() - startTime,
        status_code: 500,
      });

      res.status(500).json({
        error: 'Configuration generation failed',
        code: 'CONFIG_ERROR',
        configurationId,
      });
    }
  });

  return router;
}

function getIconForUrl(url: string): string {
  if (url === '/bd') return 'briefcase';
  if (url === '/console') return 'terminal';
  if (url === '/app') return 'workflow';
  return 'globe';
}

/**
 * Normalize a domain string to GIA MCP enum values.
 * MCP accepts: 'va-claims' | 'legal' | 'healthcare' | 'finance' | 'federal' | 'general'
 */
function normalizeDomainForMCP(domain: string): string {
  const dl = domain.toLowerCase();
  if (dl.includes('va') || dl.includes('veteran') || dl.includes('disability')) return 'va-claims';
  if (dl.includes('legal') || dl.includes('compliance') || dl.includes('contract')) return 'legal';
  if (dl.includes('health') || dl.includes('medical') || dl.includes('clinical')) return 'healthcare';
  if (dl.includes('finance') || dl.includes('audit') || dl.includes('tax') || dl.includes('accounting')) return 'finance';
  if (dl.includes('federal') || dl.includes('government') || dl.includes('grant') || dl.includes('rfp') || dl.includes('proposal')) return 'federal';
  return 'general';
}
