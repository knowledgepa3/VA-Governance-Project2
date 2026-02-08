/**
 * Writer Worker — ECV Report Generation
 *
 * Synthesizes validated evidence into a structured narrative report.
 * For VA claims: generates an Enhanced Claim View (ECV) report.
 * For generic domains: generates a structured analysis report.
 *
 * Gets higher per-worker caps (more tokens, more time) since
 * report generation is the most token-intensive step.
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
    // Gather all upstream data for report synthesis
    const extractedEvidence = input.extractedEvidence || {};
    const validationReport = input.validationReport || {};
    const complianceReport = input.complianceReport || {};
    const documentInventory = input.documentInventory || {};

    const userMessage = [
      instruction.taskDescription,
      '',
      'Document inventory:',
      JSON.stringify(documentInventory, null, 2).substring(0, 2000),
      '',
      'Extracted evidence:',
      JSON.stringify(extractedEvidence, null, 2).substring(0, 4000),
      '',
      'Validation results:',
      JSON.stringify(validationReport, null, 2).substring(0, 3000),
      '',
      'Compliance findings:',
      JSON.stringify(complianceReport, null, 2).substring(0, 2000),
      '',
      'Generate the complete report now.',
    ].join('\n');

    const response = await ctx.claudeProxy(instruction.systemPrompt, userMessage);
    totalTokens = response.tokensUsed.input + response.tokensUsed.output;

    // Writer output is primarily text (the report), not JSON
    const reportContent = response.content;

    await ctx.writeArtifact('ecv_report.md', reportContent);

    // Also save structured metadata
    const reportMeta = {
      generatedAt: new Date().toISOString(),
      wordCount: reportContent.split(/\s+/).length,
      characterCount: reportContent.length,
      sections: (reportContent.match(/^#+\s+.+$/gm) || []).map((s: string) => s.trim()),
    };
    await ctx.writeArtifact('report_metadata.json', JSON.stringify(reportMeta, null, 2));

    return {
      status: 'success',
      data: {
        report: reportContent,
        metadata: reportMeta,
      },
      summary: `ECV report generated: ${reportMeta.wordCount} words, ${reportMeta.sections.length} sections.`,
      tokensUsed: totalTokens,
      durationMs: Date.now() - startTime,
      artifactPaths: ['ecv_report.md', 'report_metadata.json'],
    };

  } catch (error) {
    return {
      status: 'error',
      data: { error: error instanceof Error ? error.message : String(error) },
      summary: `Writer failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      tokensUsed: totalTokens,
      durationMs: Date.now() - startTime,
      artifactPaths: [],
    };
  }
}

export const writerWorker: WorkerModule = {
  type: 'writer',
  execute,
};
