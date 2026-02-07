/**
 * Onboarding Configuration Route
 *
 * POST /api/onboarding/configure
 *
 * Unauthenticated endpoint (rate-limited by IP) that:
 * 1. Takes onboarding form data (org, domain, governance level)
 * 2. Maps domain to existing workforce type or calls Claude for custom domains
 * 3. Runs GIA governance classification (MAI + EU AI Act risk tier)
 * 4. Returns a workspace configuration the frontend can display
 *
 * Layer Check: Execution (Claude call) + Governance (MAI + risk)
 * Evidence: Audit entry with config hash, no PII stored server-side
 */

import Anthropic from '@anthropic-ai/sdk';
import { Router, Request, Response } from 'express';
import { logger } from '../logger';
import { hashObject, generateUUID, fingerprint } from '../utils/crypto';
import { secureAuditStore } from '../audit/auditStoreSecure';
import {
  classifyDecision,
  assessRiskTier,
  mapDomainToWorkforce,
  buildWorkforceMappingFromClaude,
  getGovernanceRecommendations,
  WORKFORCE_TEMPLATES,
} from '../governance/onboardingGovernance';

const log = logger.child({ component: 'OnboardingRoute' });

// Initialize Claude client (reuses server-side API key)
const apiKey = process.env.ANTHROPIC_API_KEY;
let anthropic: Anthropic | null = null;
if (apiKey) {
  anthropic = new Anthropic({ apiKey });
}

// ═══════════════════════════════════════════════════════════════════
// CLAUDE PROMPT FOR WORKSPACE CONFIGURATION
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
- If the domain clearly maps to an existing type, use it (confidence > 0.7).
- If the domain is ambiguous, pick the closest match but note low confidence.
- For truly novel domains, set matchedType to null and create a custom pipeline name, description, and roles.
- Always recommend a primaryLaunchUrl: "/app" for most verticals, "/bd" for BD, "/console" for custom/experimental.

Respond ONLY with valid JSON (no markdown, no code fences):
{
  "matchedType": "VA_CLAIMS" | "FINANCIAL_AUDIT" | "CYBER_IR" | "BD_CAPTURE" | "GRANT_WRITING" | null,
  "matchConfidence": <number 0-1>,
  "matchRationale": "<string>",
  "isCustom": <boolean>,
  "pipelineName": "<string>",
  "pipelineDescription": "<string>",
  "roles": ["<role1>", "<role2>", ...],
  "primaryLaunchUrl": "<string>"
}`;

// ═══════════════════════════════════════════════════════════════════
// INPUT VALIDATION
// ═══════════════════════════════════════════════════════════════════

const VALID_GOVERNANCE = ['Advisory', 'Strict', 'Regulated'];
const SETUP_ID_PATTERN = /^GIA-\d{4}-\d{4}-\d{3}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_FIELD_LENGTH = 100;
const MAX_DOMAIN_LENGTH = 600; // "Custom: " + 500 chars description

function sanitizeString(input: string, maxLen: number): string {
  return String(input || '')
    .trim()
    .slice(0, maxLen)
    .replace(/[<>"'`]/g, ''); // Strip potential XSS/injection chars
}

interface ValidationResult {
  valid: boolean;
  errors: Record<string, string>;
  sanitized: {
    organization: string;
    name: string;
    email: string;
    domain: string;
    governance: string;
    setupId: string;
  };
}

function validateInput(body: any): ValidationResult {
  const errors: Record<string, string> = {};

  const organization = sanitizeString(body.organization, MAX_FIELD_LENGTH);
  const name = sanitizeString(body.name, MAX_FIELD_LENGTH);
  const email = sanitizeString(body.email, MAX_FIELD_LENGTH);
  const domain = sanitizeString(body.domain, MAX_DOMAIN_LENGTH);
  const governance = sanitizeString(body.governance, 20);
  const setupId = sanitizeString(body.setupId, 20);

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
    sanitized: { organization, name, email, domain, governance, setupId }
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

    try {
      // 1. Validate input
      const validation = validateInput(req.body);
      if (!validation.valid) {
        res.status(400).json({ error: 'Validation failed', code: 'VALIDATION_ERROR', fields: validation.errors });
        return;
      }

      const { organization, name, email, domain, governance, setupId } = validation.sanitized;

      log.info('Onboarding configuration requested', {
        configurationId,
        setupId,
        domain: fingerprint(domain),
        governance
      });

      // 2. Try direct workforce mapping first
      let workforceMapping = mapDomainToWorkforce(domain, governance);
      let claudeModel = 'none';
      let tokenUsage = { input: 0, output: 0 };

      // 3. If no direct mapping, call Claude
      if (!workforceMapping) {
        if (!anthropic) {
          log.warn('Claude unavailable for custom domain mapping — no API key');
          // Fallback: default to console with generic config
          workforceMapping = {
            matchedType: null,
            matchConfidence: 0.5,
            matchRationale: 'Custom domain — default configuration applied',
            isCustom: true,
            pipelineName: `${organization} Workspace`,
            roles: ['Gateway', 'Analyst', 'QA', 'Report Generator', 'Telemetry'],
            description: `Custom governed workspace for ${domain}`,
            primaryUrl: '/console',
          };
        } else {
          try {
            claudeModel = 'claude-3-5-haiku-20241022';
            const userMessage = `Configure workspace for:\nOrganization: ${organization}\nDomain: ${domain}\nGovernance Level: ${governance}`;

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

            // Parse Claude's JSON response
            const textBlock = response.content.find(b => b.type === 'text');
            if (!textBlock || textBlock.type !== 'text') {
              throw new Error('No text response from Claude');
            }

            const claudeResult = JSON.parse(textBlock.text);

            // Validate required fields exist
            if (typeof claudeResult.matchConfidence !== 'number' || !claudeResult.matchRationale) {
              throw new Error('Invalid Claude response structure');
            }

            workforceMapping = buildWorkforceMappingFromClaude(claudeResult);
          } catch (claudeErr: any) {
            log.warn('Claude configuration failed, using fallback', { error: claudeErr.message });
            workforceMapping = {
              matchedType: null,
              matchConfidence: 0.5,
              matchRationale: 'Auto-configuration unavailable — default applied',
              isCustom: true,
              pipelineName: `${organization} Workspace`,
              roles: ['Gateway', 'Analyst', 'QA', 'Report Generator', 'Telemetry'],
              description: `Custom governed workspace for ${domain}`,
              primaryUrl: '/console',
            };
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

      // 6. Assemble response
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
          configHash: hashObject(workforceMapping),
          model: claudeModel,
          tokenUsage,
        },
      };

      // 7. Audit (no PII — only domain, governance, config hash)
      try {
        await secureAuditStore.append(
          { sub: 'anonymous', role: 'onboarding', sessionId: setupId, tenantId: 'pre-signup' },
          'ONBOARDING_CONFIG_GENERATED',
          { type: 'onboarding_config', id: configurationId },
          {
            domain: fingerprint(domain),
            governance,
            matchedWorkforceType: workforceMapping.matchedType,
            matchConfidence: workforceMapping.matchConfidence,
            riskTier: riskResult.risk_tier,
            maiClassification: maiResult.classification,
            configHash: configuration.evidence.configHash,
            claudeModel,
            inputTokens: tokenUsage.input,
            outputTokens: tokenUsage.output,
            durationMs: Date.now() - startTime,
          }
        );
      } catch (auditErr) {
        // Don't fail the request if audit fails
        log.warn('Audit entry failed for onboarding config', { error: (auditErr as Error).message });
      }

      log.info('Onboarding configuration generated', {
        configurationId,
        setupId,
        matchedType: workforceMapping.matchedType,
        riskTier: riskResult.risk_tier,
        durationMs: Date.now() - startTime,
      });

      res.json(configuration);

    } catch (err: any) {
      log.error('Onboarding configuration error', { configurationId }, err);
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
