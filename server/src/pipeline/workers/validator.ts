/**
 * Validator Worker — Cross-Check & Inconsistency Detection
 *
 * Cross-checks extracted evidence for consistency, flags discrepancies
 * between documents, and identifies gaps in the evidence chain.
 * Does NOT make eligibility determinations — flags for human review.
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
    const extractedEvidence = input.extractedEvidence || input;

    const userMessage = [
      instruction.taskDescription,
      '',
      'Extracted evidence to validate:',
      JSON.stringify(extractedEvidence, null, 2).substring(0, 6000),
      '',
      'Respond with valid JSON matching the outputFormat specification.',
    ].join('\n');

    const response = await ctx.claudeProxy(instruction.systemPrompt, userMessage);
    totalTokens = response.tokensUsed.input + response.tokensUsed.output;

    let validationData: Record<string, unknown>;
    try {
      const jsonMatch = response.content.match(/\{[\s\S]*\}/);
      validationData = jsonMatch ? JSON.parse(jsonMatch[0]) : { raw: response.content };
    } catch {
      validationData = { raw: response.content, parseError: true };
    }

    await ctx.writeArtifact('validation_report.json', JSON.stringify(validationData, null, 2));

    const overallScore = (validationData as any).overallScore || 'N/A';
    const criticalFlags = (validationData as any).criticalFlags?.length || 0;

    return {
      status: 'success',
      data: validationData,
      summary: `Validation complete. Overall score: ${overallScore}. Critical flags: ${criticalFlags}.`,
      tokensUsed: totalTokens,
      durationMs: Date.now() - startTime,
      artifactPaths: ['validation_report.json'],
    };

  } catch (error) {
    return {
      status: 'error',
      data: { error: error instanceof Error ? error.message : String(error) },
      summary: `Validator failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      tokensUsed: totalTokens,
      durationMs: Date.now() - startTime,
      artifactPaths: [],
    };
  }
}

export const validatorWorker: WorkerModule = {
  type: 'validator',
  execute,
};
