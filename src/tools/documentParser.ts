import path from 'path';
import {
  API_ENDPOINTS,
  makeApiRequest,
  validateDocumentFile,
  getOutputDirectory,
  generateTimestampedFilename,
  saveJsonToFile,
  ensureDirectoryExists,
} from '../utils';

interface ParseDocumentOptions {
  filePath: string;
  apiKey: string;
  outputFormats?: string[];
  onProgress?: (progress: { progress: number; total: number }) => Promise<void>;
}

export async function parseDocument(options: ParseDocumentOptions): Promise<string> {
  const { filePath, apiKey, outputFormats, onProgress } = options;
  
  // Validate input file
  await validateDocumentFile(filePath);
  
  // Report initial progress
  if (onProgress) {
    await onProgress({ progress: 10, total: 100 });
  }
  
  // For document parsing, we still use the original multipart/form-data approach
  // as this endpoint may not support the OpenAI format like information extraction
  const requestData: Record<string, any> = {
    ocr: 'force',
    base64_encoding: "['table']",
    model: 'document-parse',
  };
  
  if (outputFormats && outputFormats.length > 0) {
    requestData.output_formats = JSON.stringify(outputFormats);
  }
  
  // Report API call progress
  if (onProgress) {
    await onProgress({ progress: 30, total: 100 });
  }
  
  // Make API request using files (multipart form data)
  const result = await makeApiRequest(
    API_ENDPOINTS.DOCUMENT_DIGITIZATION,
    apiKey,
    {
      files: { document: filePath },
      data: requestData,
    },
    'Document parsing'
  );
  
  // Report processing progress
  if (onProgress) {
    await onProgress({ progress: 80, total: 100 });
  }
  
  // Save results
  const outputDir = getOutputDirectory('document_parsing');
  await ensureDirectoryExists(outputDir);
  
  const outputFilename = generateTimestampedFilename(filePath);
  const outputPath = path.join(outputDir, outputFilename);
  
  await saveJsonToFile(result, outputPath, { indent: 2 });
  
  // Report completion
  if (onProgress) {
    await onProgress({ progress: 100, total: 100 });
  }
  
  // Extract content for response
  const content = result.content || {};
  const responseText = JSON.stringify(content);
  
  return `${responseText}\n\nThe full response has been saved to ${outputPath} for your reference.`;
}

export async function parseAndSaveDocument(
  filePath: string,
  apiKey: string,
  outputFormats?: string[],
  onProgress?: (progress: { progress: number; total: number }) => Promise<void>
): Promise<string> {
  return parseDocument({
    filePath,
    apiKey,
    outputFormats,
    onProgress,
  });
}