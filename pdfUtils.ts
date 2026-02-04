/**
 * PDF Text Extraction Utility
 * Extracts text content from PDF files for processing by AI agents
 */

import * as pdfjsLib from 'pdfjs-dist';

// Set up the worker - use CDN for browser compatibility
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

/**
 * Extract text from a PDF file
 * @param file - The PDF file to extract text from
 * @returns Promise with extracted text and metadata
 */
export async function extractTextFromPDF(file: File): Promise<{
  text: string;
  pageCount: number;
  truncated: boolean;
  error?: string;
}> {
  const MAX_PAGES = 50; // Limit pages to process
  const MAX_TEXT_LENGTH = 200000; // ~200KB of text max

  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

    const pageCount = pdf.numPages;
    const pagesToProcess = Math.min(pageCount, MAX_PAGES);
    let fullText = '';
    let truncated = false;

    for (let i = 1; i <= pagesToProcess; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(' ');

      fullText += `\n--- Page ${i} ---\n${pageText}`;

      // Check if we've exceeded max length
      if (fullText.length > MAX_TEXT_LENGTH) {
        fullText = fullText.substring(0, MAX_TEXT_LENGTH);
        truncated = true;
        break;
      }
    }

    if (pageCount > MAX_PAGES) {
      truncated = true;
    }

    return {
      text: fullText.trim(),
      pageCount,
      truncated
    };
  } catch (error: any) {
    console.error('PDF extraction error:', error);
    return {
      text: '',
      pageCount: 0,
      truncated: false,
      error: error.message || 'Failed to extract PDF text'
    };
  }
}

/**
 * Process multiple files and extract text from PDFs
 * @param files - Array of FileMetadata objects
 * @returns Processed files with extracted text
 */
export async function processFilesForAI(files: any[]): Promise<any[]> {
  const processedFiles = [];

  for (const file of files) {
    if (file.type === 'application/pdf' && file.content) {
      // For PDFs, we already have base64 content but need to note it's a PDF
      processedFiles.push({
        ...file,
        processingNote: 'PDF file - base64 encoded. Claude can process this directly using vision.'
      });
    } else {
      processedFiles.push(file);
    }
  }

  return processedFiles;
}

/**
 * Summarize file metadata for token-efficient processing
 */
export function summarizeFileMetadata(files: any[]): string {
  return files.map(f => {
    const sizeKB = Math.round((f.size || 0) / 1024);
    const hasContent = !!f.content;
    const contentType = f.contentType || 'unknown';
    return `- ${f.name} (${sizeKB}KB, ${f.type || 'unknown'}, content: ${hasContent ? contentType : 'none'})`;
  }).join('\n');
}
