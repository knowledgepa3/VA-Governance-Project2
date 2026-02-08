/**
 * Gateway Worker — Document Intake & Validation
 *
 * First worker in every pipeline. Validates uploaded documents,
 * categorizes them, and produces a run_snapshot.json (Live Survey).
 *
 * The snapshot includes a readiness status:
 * - OK_TO_PROCEED: all docs valid, ready for extraction
 * - NEED_DOCS: missing required document categories
 * - NEED_HUMAN_REVIEW: issues found that need human attention
 *
 * This is a pure function. No spawn authority. No filesystem access
 * beyond the injected context.
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
    // Build the prompt from instruction + document context
    const userMessage = [
      instruction.taskDescription,
      '',
      'Documents available:',
      ...(Array.isArray(input.documentRefs)
        ? (input.documentRefs as Array<{ docId: string; filename: string; mimeType: string; sizeBytes: number }>)
            .map((d) => `- ${d.filename} (${d.mimeType}, ${Math.round(d.sizeBytes / 1024)}KB) [ID: ${d.docId}]`)
        : ['No documents provided']),
      '',
      'Respond with valid JSON matching the outputFormat specification.',
    ].join('\n');

    // Call Claude via scoped proxy
    const response = await ctx.claudeProxy(instruction.systemPrompt, userMessage);
    totalTokens = response.tokensUsed.input + response.tokensUsed.output;

    // Parse the response
    let inventoryData: Record<string, unknown>;
    try {
      // Try to extract JSON from the response
      const jsonMatch = response.content.match(/\{[\s\S]*\}/);
      inventoryData = jsonMatch ? JSON.parse(jsonMatch[0]) : { raw: response.content };
    } catch {
      inventoryData = { raw: response.content, parseError: true };
    }

    // Determine readiness status
    const issuesFound = (inventoryData as any).issuesFound || 0;
    const totalDocs = (inventoryData as any).totalDocuments || 0;
    let readiness: string;
    if (totalDocs === 0) {
      readiness = 'NEED_DOCS';
    } else if (issuesFound > 0) {
      readiness = 'NEED_HUMAN_REVIEW';
    } else {
      readiness = 'OK_TO_PROCEED';
    }

    // Write the run snapshot (Live Survey artifact)
    const snapshot = {
      readiness,
      timestamp: new Date().toISOString(),
      documentCount: totalDocs,
      issuesFound,
      inventory: inventoryData,
    };
    await ctx.writeArtifact('run_snapshot.json', JSON.stringify(snapshot, null, 2));

    return {
      status: 'success',
      data: { ...inventoryData, readiness, snapshot },
      summary: `Gateway validated ${totalDocs} document(s). Status: ${readiness}. Issues: ${issuesFound}.`,
      tokensUsed: totalTokens,
      durationMs: Date.now() - startTime,
      artifactPaths: ['run_snapshot.json'],
    };

  } catch (error) {
    return {
      status: 'error',
      data: { error: error instanceof Error ? error.message : String(error) },
      summary: `Gateway failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      tokensUsed: totalTokens,
      durationMs: Date.now() - startTime,
      artifactPaths: [],
    };
  }
}

export const gatewayWorker: WorkerModule = {
  type: 'gateway',
  execute,
};
