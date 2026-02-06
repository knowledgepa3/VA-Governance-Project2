/**
 * Detailed Rating Criteria Loader
 *
 * Loads the full 38 CFR rating criteria from structured JSON files
 * and formats them as authoritative prompt context for the AI agent.
 *
 * This supplements the existing vaLegalKnowledge.ts (case law + principles)
 * with the actual diagnostic code criteria, CUE analysis patterns,
 * and Duty to Assist checklists — the exact language VA raters use.
 *
 * Sources:
 *   - 38 CFR Part 4, Subpart B (Rating Schedule)
 *   - 38 CFR 3.105 (CUE)
 *   - 38 CFR 3.159 (Duty to Assist)
 *   - M21-1 Adjudication Procedures Manual
 */

// Import JSON knowledge files
// @ts-ignore — JSON imports
import mentalHealthData from './va-rating-criteria/mental-health.json';
// @ts-ignore
import spineData from './va-rating-criteria/musculoskeletal-spine.json';
// @ts-ignore
import kneeData from './va-rating-criteria/musculoskeletal-knee.json';
// @ts-ignore
import cueData from './cue-standards/cue-legal-standard.json';
// @ts-ignore
import dtaData from './duty-to-assist/checklist.json';

// Re-export existing legal knowledge
export { getLegalKnowledgePrompt, getCaseLawCitation, getSecondaryConditions } from './index';

// ─── Condition Detection ────────────────────────────────────────────

const CONDITION_KEYWORDS: Record<string, string[]> = {
  'mental-health': [
    'ptsd', 'post-traumatic', 'depression', 'depressive', 'anxiety',
    'bipolar', 'schizophrenia', 'ocd', 'obsessive', 'mental health',
    'tbi', 'traumatic brain', 'adjustment disorder', 'panic',
    'suicidal', 'hallucination', 'psychotic', 'mood disorder',
    'insomnia', 'nightmares', 'hypervigilance', 'flashback',
  ],
  'spine': [
    'back', 'lumbar', 'lumbosacral', 'cervical', 'neck', 'spine',
    'thoracolumbar', 'degenerative disc', 'ddd', 'herniated',
    'spinal stenosis', 'spondylolisthesis', 'ivds', 'intervertebral',
    'sciatica', 'radiculopathy', 'flexion', 'range of motion',
  ],
  'knee': [
    'knee', 'meniscus', 'acl', 'pcl', 'patellofemoral',
    'chondromalacia', 'knee replacement', 'knee instability',
    'subluxation', 'lateral instability', 'extension', 'flexion leg',
  ],
};

const KNOWLEDGE_FILES: Record<string, any> = {
  'mental-health': mentalHealthData,
  'spine': spineData,
  'knee': kneeData,
};

/**
 * Detect which condition categories are mentioned in text
 */
export function detectConditions(text: string): string[] {
  const lower = text.toLowerCase();
  const found = new Set<string>();

  for (const [category, keywords] of Object.entries(CONDITION_KEYWORDS)) {
    for (const keyword of keywords) {
      if (lower.includes(keyword)) {
        found.add(category);
        break; // One match per category is enough
      }
    }
  }

  return Array.from(found);
}

// ─── Knowledge Context Builder ──────────────────────────────────────

export interface DetailedKnowledgeContext {
  conditions: string[];
  ratingCriteria: string[];
  cueAnalysis: string | null;
  dutyToAssist: string;
}

/**
 * Build a complete knowledge context from document text and analysis type.
 * Returns formatted text ready to inject into the agent's system prompt.
 */
export function buildDetailedContext(
  documentText: string,
  analysisType: string = 'general'
): DetailedKnowledgeContext {
  const conditions = detectConditions(documentText);
  const ratingCriteria: string[] = [];

  // Load rating criteria for each detected condition
  for (const cat of conditions) {
    const formatted = formatRatingCriteria(cat);
    if (formatted) ratingCriteria.push(formatted);
  }

  // CUE standards (for CUE discovery or appeal review)
  const includeCUE = ['cue-discovery', 'appeal-review', 'rating-increase', 'general'].includes(analysisType);
  const cueAnalysis = includeCUE ? formatCUEStandards() : null;

  // DTA checklist always included
  const dutyToAssist = formatDutyToAssist();

  return { conditions, ratingCriteria, cueAnalysis, dutyToAssist };
}

/**
 * Format the full knowledge context as a single prompt string
 */
export function formatAsPrompt(ctx: DetailedKnowledgeContext): string {
  const parts: string[] = [];

  parts.push('══════════════════════════════════════════════════════════');
  parts.push('  VA CLAIMS LEGAL REFERENCE — 38 CFR AUTHORITATIVE DATA');
  parts.push('  Use this to ground analysis. Cite specific sections.');
  parts.push('══════════════════════════════════════════════════════════\n');

  if (ctx.ratingCriteria.length > 0) {
    parts.push(...ctx.ratingCriteria);
  }

  if (ctx.cueAnalysis) {
    parts.push(ctx.cueAnalysis);
  }

  parts.push(ctx.dutyToAssist);

  parts.push('\n══════════════════════════════════════════════════════════');
  parts.push('  END LEGAL REFERENCE');
  parts.push('══════════════════════════════════════════════════════════');

  return parts.join('\n');
}

// ─── Formatters ─────────────────────────────────────────────────────

function formatRatingCriteria(category: string): string | null {
  const data = KNOWLEDGE_FILES[category];
  if (!data) return null;

  const lines: string[] = [];

  if (category === 'mental-health') {
    lines.push('─── RATING CRITERIA: MENTAL DISORDERS (38 CFR § 4.130) ───\n');
    const levels = data.generalRatingFormula.ratingLevels;
    for (const pct of ['100', '70', '50', '30', '10', '0']) {
      const lvl = levels[pct];
      if (!lvl) continue;
      lines.push(`  ${pct}% — ${lvl.standard}`);
      lines.push(`  ${lvl.criteria}\n`);
    }
    lines.push('  Key Diagnostic Codes:');
    const topCodes = ['9411', '9434', '9400', '9431', '9304', '9440'];
    for (const code of topCodes) {
      const dc = data.diagnosticCodes[code];
      if (dc) lines.push(`    DC ${code}: ${dc.name}`);
    }
    lines.push(`\n  RULES:`);
    for (const [, rule] of Object.entries(data.importantRules)) {
      lines.push(`    • ${rule}`);
    }
  }

  if (category === 'spine') {
    lines.push('─── RATING CRITERIA: SPINE (38 CFR § 4.71a) ───\n');
    lines.push('  General Rating Formula for Diseases and Injuries of the Spine:');
    lines.push('  (Applies WITH OR WITHOUT pain, stiffness, or aching)\n');
    const levels = data.generalRatingFormulaSpine.ratingLevels;
    for (const pct of ['100', '50', '40', '30', '20', '10']) {
      const lvl = levels[pct];
      if (!lvl) continue;
      lines.push(`  ${pct}%: ${lvl.criteria}\n`);
    }
    lines.push('  Normal Range of Motion (VA standard):');
    const rom = data.normalRangeOfMotion;
    lines.push(`    Thoracolumbar: Flexion 0-90°, Extension 0-30°, Lateral Flexion 0-30° each, Rotation 0-30° each (Combined: 240°)`);
    lines.push(`    Cervical: Flexion 0-45°, Extension 0-45°, Lateral Flexion 0-45° each, Rotation 0-80° each (Combined: 340°)`);
    lines.push(`\n  RULES:`);
    for (const [, rule] of Object.entries(data.importantRules)) {
      lines.push(`    • ${rule}`);
    }
    lines.push('\n  Secondary Conditions (rate separately):');
    for (const sec of data.commonSecondaryConditions) {
      lines.push(`    DC ${sec.dc}: ${sec.condition} — ${sec.description}`);
    }
  }

  if (category === 'knee') {
    lines.push('─── RATING CRITERIA: KNEE (38 CFR § 4.71a) ───\n');
    lines.push('  Normal ROM: Flexion 0-140°, Extension 0°\n');
    const codes = data.diagnosticCodes;
    for (const [code, dc] of Object.entries(codes) as [string, any][]) {
      lines.push(`  DC ${code}: ${dc.name}`);
      if (dc.ratings) {
        for (const [pct, desc] of Object.entries(dc.ratings)) {
          lines.push(`    ${pct}%: ${desc}`);
        }
      }
      if (dc.note) lines.push(`    NOTE: ${dc.note}`);
      lines.push('');
    }
    lines.push('  RULES:');
    for (const [, rule] of Object.entries(data.importantRules)) {
      lines.push(`    • ${rule}`);
    }
  }

  return lines.join('\n');
}

function formatCUEStandards(): string {
  const lines: string[] = [];
  lines.push('\n─── CUE ANALYSIS STANDARDS (38 CFR § 3.105) ───\n');
  lines.push(`  Definition: ${cueData.definition.text}\n`);
  lines.push(`  Certainty: ${cueData.definition.certaintyStandard}\n`);
  lines.push('  THREE-PART TEST (all required):');
  for (const el of cueData.threePartTest.elements) {
    lines.push(`    ${el.number}. ${el.element}: ${el.description}`);
  }
  lines.push('\n  COMMON CUE PATTERNS:');
  for (const p of cueData.commonPatterns.patterns) {
    lines.push(`    [${p.id}] ${p.name} (${p.frequency})`);
    lines.push(`      Look for: ${p.lookFor}`);
  }
  lines.push('\n  What is NOT CUE:');
  for (const n of cueData.whatIsNOTCue) {
    lines.push(`    ✗ ${n.type}: ${n.description}`);
  }
  lines.push(`\n  Effective Date: ${cueData.effectiveDate.rule}`);
  return lines.join('\n');
}

function formatDutyToAssist(): string {
  const lines: string[] = [];
  lines.push('\n─── DUTY TO ASSIST CHECKLIST (38 CFR § 3.159) ───\n');
  for (const step of dtaData.analysisChecklist.steps) {
    lines.push(`  ${step.step}. ${step.action}`);
    lines.push(`     → ${step.check}`);
  }
  lines.push('\n  Common DTA Failures:');
  for (const err of dtaData.commonFailures.errors.slice(0, 4)) {
    lines.push(`    [${err.id}] ${err.name} — ${err.description}`);
  }
  return lines.join('\n');
}

// ─── Convenience: One-call for full knowledge prompt ────────────────

/**
 * Single-call convenience function.
 * Pass document text + analysis type, get back a complete legal reference
 * prompt ready to inject into Claude's system prompt.
 */
export function getDetailedKnowledgePrompt(
  documentText: string,
  analysisType: string = 'general'
): string {
  const ctx = buildDetailedContext(documentText, analysisType);
  return formatAsPrompt(ctx);
}
