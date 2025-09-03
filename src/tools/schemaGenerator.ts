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
} from '../utils';

interface GenerateSchemaOptions {
  filePath: string;
  apiKey: string;
  onProgress?: (progress: { progress: number; total: number }) => Promise<void>;
}

export async function generateSchema(options: GenerateSchemaOptions): Promise<string> {
  const { filePath, apiKey, onProgress } = options;
  
  // Validate input file
  await validateExtractionFile(filePath);
  
  // Report initial progress
  if (onProgress) {
    await onProgress({ progress: 10, total: 100 });
  }
  
  // Get file MIME type and encode to base64
  const mimeType = getMimeType(filePath);
  const fileBase64 = await readFileAsBase64(filePath);
  
  // Report encoding progress
  if (onProgress) {
    await onProgress({ progress: 30, total: 100 });
  }
  
  // Prepare request data in OpenAI format
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
  
  // Report API request progress
  if (onProgress) {
    await onProgress({ progress: 50, total: 100 });
  }
  
  // Make API request
  const result = await makeApiRequest(
    API_ENDPOINTS.SCHEMA_GENERATION,
    apiKey,
    {
      json: requestData,
    },
    'Schema generation'
  );
  
  // Report processing progress
  if (onProgress) {
    await onProgress({ progress: 80, total: 100 });
  }
  
  // Extract schema from response
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
  
  const schemaFilename = generateTimestampedFilename(filePath, 'generated_schema');
  const schemaPath = path.join(schemaDir, schemaFilename);
  
  // Save the full schema with metadata
  const schemaWithMetadata = {
    generated_schema: schema,
    metadata: {
      source_file: path.basename(filePath),
      generated_at: new Date().toISOString(),
      schema_saved_to: schemaPath,
    }
  };
  
  await saveJsonToFile(schemaWithMetadata, schemaPath, { indent: 2 });
  
  // Report completion
  if (onProgress) {
    await onProgress({ progress: 100, total: 100 });
  }
  
  // Return formatted response with the schema and metadata
  const response = {
    schema: schema,
    schema_json: JSON.stringify(schema),
    metadata: {
      source_file: path.basename(filePath),
      schema_saved_to: schemaPath,
      usage_instructions: "Copy the 'schema_json' value to use with extract_information tool when auto_generate_schema is false"
    }
  };
  
  return JSON.stringify(response, null, 2);
}

export async function generateSchemaFromFile(
  filePath: string,
  apiKey: string,
  onProgress?: (progress: { progress: number; total: number }) => Promise<void>
): Promise<string> {
  return generateSchema({
    filePath,
    apiKey,
    onProgress,
  });
}