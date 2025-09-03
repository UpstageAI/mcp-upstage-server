import path from 'path';
import {
  API_ENDPOINTS,
  makeApiRequest,
  validateExtractionFile,
  getOutputDirectory,
  generateTimestampedFilename,
  saveJsonToFile,
  readJsonFile,
  ensureDirectoryExists,
  readFileAsBase64,
  getMimeType,
  parseSchemaJson,
} from '../utils';

interface ExtractInformationOptions {
  filePath: string;
  apiKey: string;
  schemaPath?: string;
  schemaJson?: string;
  autoGenerateSchema?: boolean;
  onProgress?: (progress: { progress: number; total: number }) => Promise<void>;
}

async function generateSchema(
  filePath: string,
  apiKey: string,
  onProgress?: (progress: { progress: number; total: number }) => Promise<void>
): Promise<any> {
  if (onProgress) {
    await onProgress({ progress: 20, total: 100 });
  }
  
  // Get file MIME type and encode to base64
  const mimeType = getMimeType(filePath);
  const fileBase64 = await readFileAsBase64(filePath);
  
  // Prepare request data in OpenAI format (same as Python version)
  const requestData = {
    model: 'information-extract',
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
    ]
  };
  
  const result = await makeApiRequest(
    API_ENDPOINTS.SCHEMA_GENERATION,
    apiKey,
    {
      json: requestData,
    },
    'Schema generation'
  );
  
  if (onProgress) {
    await onProgress({ progress: 40, total: 100 });
  }
  
  // Extract schema from response (same as Python version)
  if (!result.choices || result.choices.length === 0) {
    throw new Error('Invalid response from schema generation API');
  }
  
  const content = result.choices[0].message.content;
  const schema = JSON.parse(content);
  
  if (!schema.json_schema) {
    throw new Error('Invalid schema format returned');
  }
  
  // Save generated schema
  const schemaDir = getOutputDirectory('information_extraction/schemas');
  await ensureDirectoryExists(schemaDir);
  
  const schemaFilename = generateTimestampedFilename(filePath, 'schema');
  const schemaPath = path.join(schemaDir, schemaFilename);
  
  await saveJsonToFile(schema.json_schema, schemaPath, { indent: 2 });
  
  return schema.json_schema;
}

export async function extractInformation(options: ExtractInformationOptions): Promise<string> {
  const {
    filePath,
    apiKey,
    schemaPath,
    schemaJson,
    autoGenerateSchema = true,
    onProgress,
  } = options;
  
  // Validate input file
  await validateExtractionFile(filePath);
  
  // Report initial progress
  if (onProgress) {
    await onProgress({ progress: 10, total: 100 });
  }
  
  let schema: any = null;
  
  // Determine schema source (same priority as Python version)
  if (schemaJson) {
    // Parse and validate schema from JSON string
    try {
      schema = parseSchemaJson(schemaJson).json_schema;
    } catch (error) {
      throw new Error(`Invalid schema format: ${error instanceof Error ? error.message : error}`);
    }
    if (onProgress) {
      await onProgress({ progress: 20, total: 100 });
    }
  } else if (schemaPath) {
    // Load schema from file
    schema = await readJsonFile(schemaPath);
    if (onProgress) {
      await onProgress({ progress: 20, total: 100 });
    }
  } else if (autoGenerateSchema) {
    // Generate schema automatically
    schema = await generateSchema(filePath, apiKey, onProgress);
  }
  
  // If we don't have a schema at this point, return an error
  if (!schema) {
    throw new Error('No schema provided or generated. Please provide a schema or enable auto_generate_schema.');
  }
  
  // Report extraction progress
  if (onProgress) {
    await onProgress({ progress: 60, total: 100 });
  }
  
  // Get file MIME type and encode to base64
  const mimeType = getMimeType(filePath);
  const fileBase64 = await readFileAsBase64(filePath);
  
  // Prepare request data in OpenAI format (same as Python version)
  const requestData = {
    model: 'information-extract',
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
    response_format: {
      type: 'json_schema',
      json_schema: schema
    }
  };
  
  // Make extraction request
  const result = await makeApiRequest(
    API_ENDPOINTS.INFORMATION_EXTRACTION,
    apiKey,
    {
      json: requestData,
    },
    'Information extraction'
  );
  
  // Extract content from response (same as Python version)
  if (!result.choices || result.choices.length === 0) {
    throw new Error('Invalid response from information extraction API');
  }
  
  const content = result.choices[0].message.content;
  const extractedData = JSON.parse(content);
  
  // Report saving progress
  if (onProgress) {
    await onProgress({ progress: 90, total: 100 });
  }
  
  // Save results
  const outputDir = getOutputDirectory('information_extraction');
  await ensureDirectoryExists(outputDir);
  
  const outputFilename = generateTimestampedFilename(filePath, 'extraction');
  const outputPath = path.join(outputDir, outputFilename);
  
  // Save results with metadata (same format as Python version)
  const response = {
    extracted_data: extractedData,
    metadata: {
      file: path.basename(filePath),
      result_saved_to: outputPath,
      schema_used: schemaPath || 'auto-generated'
    }
  };
  
  await saveJsonToFile(response, outputPath, { indent: 2 });
  
  // Report completion
  if (onProgress) {
    await onProgress({ progress: 100, total: 100 });
  }
  
  return JSON.stringify(response, null, 2);
}

export async function extractInformationFromFile(
  filePath: string,
  apiKey: string,
  options: {
    schemaPath?: string;
    schemaJson?: string;
    autoGenerateSchema?: boolean;
    onProgress?: (progress: { progress: number; total: number }) => Promise<void>;
  } = {}
): Promise<string> {
  return extractInformation({
    filePath,
    apiKey,
    ...options,
  });
}