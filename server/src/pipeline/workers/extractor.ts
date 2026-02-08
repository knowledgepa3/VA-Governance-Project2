/**
 * Extractor Worker — Evidence Data Extraction
 *
 * Pulls key facts from validated documents. Extracts structured data
 * (dates, conditions, service info) without interpretation.
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
    // Build context from upstream Gateway output
    const inventory = input.documentInventory || input;

    // Read document contents for extraction
    const docContents: string[] = [];
    const docRefs = (inventory as any)?.snapshot?.inventory?.documents ||
                    (inventory as any)?.documents || [];

    for (const doc of docRefs) {
      const docId = doc.docId || doc.id;
      if (docId) {
        try {
          const docData = await ctx.readDocument(docId);
          docContents.push(`--- ${docData.filename} ---\n${docData.content}`);
        } catch {
          docContents.push(`--- ${doc.filename || docId} --- [Could not read document]`);
        }
      }
    }

    const userMessage = [
      instruction.taskDescription,
      '',
      'Document contents:',
      docContents.length > 0 ? docContents.join('\n\n') : 'No document contents available.',
      '',
      'Upstream inventory data:',
      JSON.stringify(inventory, null, 2).substring(0, 3000),
      '',
      'Respond with valid JSON matching the outputFormat specification.',
    ].join('\n');

    const response = await ctx.claudeProxy(instruction.systemPrompt, userMessage);
    totalTokens = response.tokensUsed.input + response.tokensUsed.output;

    let extractedData: Record<string, unknown>;
    try {
      const jsonMatch = response.content.match(/\{[\s\S]*\}/);
      extractedData = jsonMatch ? JSON.parse(jsonMatch[0]) : { raw: response.content };
    } catch {
      extractedData = { raw: response.content, parseError: true };
    }

    await ctx.writeArtifact('extracted_evidence.json', JSON.stringify(extractedData, null, 2));

    const conditionCount = Array.isArray((extractedData as any).conditions)
      ? (extractedData as any).conditions.length : 0;

    return {
      status: 'success',
      data: extractedData,
      summary: `Extracted ${conditionCount} condition(s) and supporting evidence from ${docContents.length} document(s).`,
      tokensUsed: totalTokens,
      durationMs: Date.now() - startTime,
      artifactPaths: ['extracted_evidence.json'],
    };

  } catch (error) {
    return {
      status: 'error',
      data: { error: error instanceof Error ? error.message : String(error) },
      summary: `Extractor failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      tokensUsed: totalTokens,
      durationMs: Date.now() - startTime,
      artifactPaths: [],
    };
  }
}

export const extractorWorker: WorkerModule = {
  type: 'extractor',
  execute,
};
