import path from 'path';
import {
  API_ENDPOINTS,
  makeApiRequest,
  validateExtractionFile,
  getOutputDirectory,
  generateTimestampedFilename,
  saveJsonToFile,
  ensureDirectoryExists,
  readFileAsBase64,
  getMimeType,
  parseSchemaJson,
} from '../utils';

interface ClassifyDocumentOptions {
  filePath: string;
  apiKey: string;
  schemaPath?: string;
  schemaJson?: string;
  onProgress?: (progress: { progress: number; total: number }) => Promise<void>;
}

/**
 * Default classification schema for common document types
 */
const DEFAULT_CLASSIFICATION_SCHEMA = {
  type: 'json_schema',
  json_schema: {
    name: 'document-classify',
    schema: {
      type: 'string',
      oneOf: [
        { const: 'invoice', description: 'Commercial invoice with itemized charges and billing information' },
        { const: 'receipt', description: 'Receipt showing purchase transaction details' },
        { const: 'contract', description: 'Legal agreement or contract document' },
        { const: 'cv', description: 'Curriculum vitae or resume' },
        { const: 'bank_statement', description: 'Bank account statement showing transactions' },
        { const: 'tax_document', description: 'Tax forms or tax-related documents' },
        { const: 'insurance', description: 'Insurance policy or claims document' },
        { const: 'business_card', description: 'Business card with contact information' },
        { const: 'letter', description: 'Formal or business letter' },
        { const: 'form', description: 'Application form or survey form' },
        { const: 'certificate', description: 'Certificate or diploma' },
        { const: 'report', description: 'Business report or analytical document' },
        { const: 'others', description: 'Other document types not listed above' },
      ],
    },
  },
};

export async function classifyDocument(options: ClassifyDocumentOptions): Promise<string> {
  const { filePath, apiKey, schemaPath, schemaJson, onProgress } = options;
  
  // Validate input file
  await validateExtractionFile(filePath);
  
  // Report initial progress
  if (onProgress) {
    await onProgress({ progress: 10, total: 100 });
  }
  
  let responseFormat: any = {
    type: 'json_schema',
    json_schema: DEFAULT_CLASSIFICATION_SCHEMA.json_schema
  };
  
  // Determine schema source (custom schema has priority)
  if (schemaJson) {
    // Parse and validate schema from JSON string
    try {
      const parsedSchema = parseSchemaJson(schemaJson);
      responseFormat = {
        type: 'json_schema',
        json_schema: parsedSchema.json_schema
      };
    } catch (error) {
      throw new Error(`Invalid classification schema format: ${error instanceof Error ? error.message : error}`);
    }
    if (onProgress) {
      await onProgress({ progress: 20, total: 100 });
    }
  } else if (schemaPath) {
    // Load schema from file
    const { readJsonFile } = await import('../utils');
    const loadedSchema = await readJsonFile(schemaPath);
    if (loadedSchema.type === 'json_schema' && loadedSchema.json_schema) {
      responseFormat = loadedSchema;
    } else {
      responseFormat = {
        type: 'json_schema', 
        json_schema: loadedSchema
      };
    }
    if (onProgress) {
      await onProgress({ progress: 20, total: 100 });
    }
  }
  
  // Get file MIME type and encode to base64
  const mimeType = getMimeType(filePath);
  const fileBase64 = await readFileAsBase64(filePath);
  
  // Report encoding progress
  if (onProgress) {
    await onProgress({ progress: 40, total: 100 });
  }
  
  // Prepare request data in OpenAI format
  const requestData = {
    model: 'document-classify',
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image_url',
            image_url: {
              url: `data:${mimeType};base64,${fileBase64}`
            }
          }
        ]
      }
    ],
    response_format: responseFormat
  };
  
  // Report API request progress
  if (onProgress) {
    await onProgress({ progress: 60, total: 100 });
  }
  
  // Make classification request
  const result = await makeApiRequest(
    API_ENDPOINTS.DOCUMENT_CLASSIFICATION,
    apiKey,
    {
      json: requestData,
    },
    'Document classification'
  );
  
  // Extract classification from response
  if (!result.choices || result.choices.length === 0) {
    throw new Error('Invalid response from document classification API');
  }
  
  const classificationResult = result.choices[0].message.content;
  
  // Report saving progress
  if (onProgress) {
    await onProgress({ progress: 90, total: 100 });
  }
  
  // Save results
  const outputDir = getOutputDirectory('document_classification');
  await ensureDirectoryExists(outputDir);
  
  const outputFilename = generateTimestampedFilename(filePath, 'classification');
  const outputPath = path.join(outputDir, outputFilename);
  
  // Save results with metadata
  const response = {
    classification: classificationResult,
    metadata: {
      file: path.basename(filePath),
      result_saved_to: outputPath,
      schema_used: schemaPath || (schemaJson ? 'custom' : 'default'),
      api_response: result
    }
  };
  
  await saveJsonToFile(response, outputPath, { indent: 2 });
  
  // Report completion
  if (onProgress) {
    await onProgress({ progress: 100, total: 100 });
  }
  
  return JSON.stringify({
    classification: classificationResult,
    metadata: {
      file: path.basename(filePath),
      result_saved_to: outputPath,
      schema_used: schemaPath || (schemaJson ? 'custom' : 'default')
    }
  }, null, 2);
}

export async function classifyDocumentFromFile(
  filePath: string,
  apiKey: string,
  options: {
    schemaPath?: string;
    schemaJson?: string;
    onProgress?: (progress: { progress: number; total: number }) => Promise<void>;
  } = {}
): Promise<string> {
  return classifyDocument({
    filePath,
    apiKey,
    ...options,
  });
}