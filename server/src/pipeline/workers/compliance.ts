/**
 * Compliance Worker — PII Scan, Redaction, Regulatory Check
 *
 * Verifies claim processing meets 38 CFR and HIPAA requirements.
 * Scans for PII exposure, checks eligibility prerequisites, ensures
 * all required evidence categories are present.
 *
 * This is a MANDATORY-level worker — its output triggers gate review.
 *
 * Pure function. No spawn authority.
 */

import { WorkerInstruction, WorkerContext, WorkerOutput } from '../spawnPlan.schema';
import { WorkerModule } from './registry';

async function execute(
  instruction: WorkerInstruction,
  input: Record<string, unknown>,
  ctx: WorkerContext,
): Promise<Omit<WorkerOutput, 'nodeId' | 'type'>> {
  const startTime = Date.now();
  let totalTokens = 0;

  try {
    // Gather upstream data
    const extractedEvidence = input.extractedEvidence || {};
    const validationReport = input.validationReport || {};

    const piiPolicyNote = ctx.policy.piiPolicy === 'NO_RAW_PII'
      ? '\n\nIMPORTANT: PII policy is NO_RAW_PII. Any raw PII found MUST be flagged for redaction.'
      : '';

    const userMessage = [
      instruction.taskDescription,
      piiPolicyNote,
      '',
      'Extracted evidence:',
      JSON.stringify(extractedEvidence, null, 2).substring(0, 4000),
      '',
      'Validation report:',
      JSON.stringify(validationReport, null, 2).substring(0, 3000),
      '',
      'Respond with valid JSON matching the outputFormat specification.',
    ].join('\n');

    const response = await ctx.claudeProxy(instruction.systemPrompt, userMessage);
    totalTokens = response.tokensUsed.input + response.tokensUsed.output;

    let complianceData: Record<string, unknown>;
    try {
      const jsonMatch = response.content.match(/\{[\s\S]*\}/);
      complianceData = jsonMatch ? JSON.parse(jsonMatch[0]) : { raw: response.content };
    } catch {
      complianceData = { raw: response.content, parseError: true };
    }

    // Enforce PII policy at runtime
    if (ctx.policy.piiPolicy === 'NO_RAW_PII') {
      const piiFindings = (complianceData as any).piiFindings || [];
      if (piiFindings.length > 0) {
        (complianceData as any).piiPolicyEnforced = true;
        (complianceData as any).piiPolicyAction = 'REDACTION_REQUIRED';
      }
    }

    await ctx.writeArtifact('compliance_report.json', JSON.stringify(complianceData, null, 2));

    const piiCount = ((complianceData as any).piiFindings || []).length;
    const eligible = (complianceData as any).eligibilityCheck?.eligible ?? 'unknown';

    return {
      status: 'success',
      data: complianceData,
      summary: `Compliance check complete. Eligibility: ${eligible}. PII findings: ${piiCount}.`,
      tokensUsed: totalTokens,
      durationMs: Date.now() - startTime,
      artifactPaths: ['compliance_report.json'],
    };

  } catch (error) {
    return {
      status: 'error',
      data: { error: error instanceof Error ? error.message : String(error) },
      summary: `Compliance failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      tokensUsed: totalTokens,
      durationMs: Date.now() - startTime,
      artifactPaths: [],
    };
  }
}

export const complianceWorker: WorkerModule = {
  type: 'compliance',
  execute,
};
