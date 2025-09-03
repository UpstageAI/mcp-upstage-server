import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import dotenv from 'dotenv';
import { parseAndSaveDocument, extractInformationFromFile, generateSchemaFromFile, classifyDocumentFromFile } from './tools';
import { getOutputDirectory, ensureDirectoryExists } from './utils';

// Load environment variables
dotenv.config();

// Validate environment
const API_KEY = process.env.UPSTAGE_API_KEY;
if (!API_KEY) {
  console.error('Error: UPSTAGE_API_KEY not set in environment variables');
  process.exit(1);
}

// Define tool schemas
const ParseDocumentSchema = z.object({
  file_path: z.string().describe('Path to the document file to be processed'),
  output_formats: z
    .array(z.string())
    .optional()
    .describe("Output formats (e.g., 'html', 'text', 'markdown')"),
});

const ExtractInformationSchema = z.object({
  file_path: z.string().describe('Path to the document file to process'),
  schema_path: z
    .string()
    .optional()
    .describe('Path to JSON file containing the extraction schema (optional)'),
  schema_json: z
    .string()
    .optional()
    .describe('JSON string containing the extraction schema (optional)'),
  auto_generate_schema: z
    .boolean()
    .default(true)
    .describe('Whether to automatically generate a schema'),
});

const GenerateSchemaSchema = z.object({
  file_path: z.string().describe('Path to the document file to analyze for schema generation'),
});

const ClassifyDocumentSchema = z.object({
  file_path: z.string().describe('Path to the document file to classify'),
  schema_path: z
    .string()
    .optional()
    .describe('Path to JSON file containing custom classification schema (optional)'),
  schema_json: z
    .string()
    .optional()
    .describe('JSON string containing custom classification schema (optional)'),
});

// Define tools
const tools: Tool[] = [
  {
    name: 'parse_document',
    description: `Parse a document using Upstage AI's document digitization API.
    
This tool extracts the structure and content from various document types,
including PDFs, images, and Office files. It preserves the original formatting
and layout while converting the document into a structured format.

Supported file formats include: PDF, JPEG, PNG, TIFF, and other common document formats.`,
    inputSchema: {
      type: 'object',
      properties: {
        file_path: { type: 'string' },
        output_formats: {
          type: 'array',
          items: { type: 'string' },
        },
      },
      required: ['file_path'],
    },
  },
  {
    name: 'extract_information',
    description: `Extract structured information from documents using Upstage Universal Information Extraction.
    
This tool can extract key information from any document type without pre-training.
You can either provide a schema defining what information to extract, or let the system
automatically generate an appropriate schema based on the document content.

Supported file formats: JPEG, PNG, BMP, PDF, TIFF, HEIC, DOCX, PPTX, XLSX
Max file size: 50MB
Max pages: 100

SCHEMA FORMAT: When auto_generate_schema is false, provide schema in this exact format:
{
  "type": "json_schema",
  "json_schema": {
    "name": "document_schema",
    "schema": {
      "type": "object", 
      "properties": {
        "field_name": {
          "type": "string|number|array|object",
          "description": "What to extract"
        }
      }
    }
  }
}

Example schema_json:
{"type":"json_schema","json_schema":{"name":"document_schema","schema":{"type":"object","properties":{"company_name":{"type":"string","description":"Company name"},"invoice_number":{"type":"string","description":"Invoice number"},"total_amount":{"type":"number","description":"Total amount"}}}}}`,
    inputSchema: {
      type: 'object',
      properties: {
        file_path: { type: 'string' },
        schema_path: { type: 'string' },
        schema_json: { type: 'string' },
        auto_generate_schema: { type: 'boolean', default: true },
      },
      required: ['file_path'],
    },
  },
  {
    name: 'generate_schema',
    description: `Generate an extraction schema for a document using Upstage AI's schema generation API.

This tool analyzes a document and automatically generates a JSON schema that defines the structure 
and fields that can be extracted from similar documents. The generated schema can then be used 
with the extract_information tool when auto_generate_schema is set to false.

This is useful when you want to:
- Create a reusable schema for multiple similar documents
- Have more control over the extraction fields
- Ensure consistent field naming and structure across extractions

Supported file formats: JPEG, PNG, BMP, PDF, TIFF, HEIC, DOCX, PPTX, XLSX
Max file size: 50MB
Max pages: 100

The tool returns both a readable schema object and a schema_json string that can be directly 
copied and used with the extract_information tool.`,
    inputSchema: {
      type: 'object',
      properties: {
        file_path: { type: 'string' },
      },
      required: ['file_path'],
    },
  },
  {
    name: 'classify_document',
    description: `Classify a document into predefined categories using Upstage AI's document classification API.

This tool analyzes a document and classifies it into one of several predefined categories such as 
invoice, receipt, contract, CV, bank statement, and others. You can use the default classification 
schema or provide your own custom classification categories.

Supported file formats: JPEG, PNG, BMP, PDF, TIFF, HEIC, DOCX, PPTX, XLSX
Max file size: 50MB
Max pages: 100

DEFAULT CATEGORIES:
- invoice: Commercial invoice with itemized charges and billing information
- receipt: Receipt showing purchase transaction details  
- contract: Legal agreement or contract document
- cv: Curriculum vitae or resume
- bank_statement: Bank account statement showing transactions
- tax_document: Tax forms or tax-related documents
- insurance: Insurance policy or claims document
- business_card: Business card with contact information
- letter: Formal or business letter
- form: Application form or survey form
- certificate: Certificate or diploma
- report: Business report or analytical document
- others: Other document types not listed above

CUSTOM SCHEMA FORMAT: For custom classification, provide schema in this exact format:
{
  "type": "json_schema",
  "json_schema": {
    "name": "document-classify",
    "schema": {
      "type": "string",
      "oneOf": [
        {"const": "category1", "description": "Description of category 1"},
        {"const": "category2", "description": "Description of category 2"},
        {"const": "others", "description": "Other"}
      ]
    }
  }
}

Example custom schema_json:
{"type":"json_schema","json_schema":{"name":"document-classify","schema":{"type":"string","oneOf":[{"const":"medical","description":"Medical records or health documents"},{"const":"legal","description":"Legal documents"},{"const":"financial","description":"Financial statements or reports"},{"const":"others","description":"Other"}]}}}`,
    inputSchema: {
      type: 'object',
      properties: {
        file_path: { type: 'string' },
        schema_path: { type: 'string' },
        schema_json: { type: 'string' },
      },
      required: ['file_path'],
    },
  },
];

// Create and configure server
export async function createServer(): Promise<Server> {
  // Ensure output directories exist
  const outputDirs = [
    'document_parsing',
    'information_extraction',
    'information_extraction/schemas',
    'document_classification',
  ];
  
  for (const dir of outputDirs) {
    await ensureDirectoryExists(getOutputDirectory(dir));
  }
  
  // Only log to stderr in development or when explicitly requested
  if (process.env.NODE_ENV === 'development' || process.env.DEBUG) {
    console.error(`Output directories created at: ${getOutputDirectory('')}`);
  }
  
  const server = new Server(
    {
      name: 'mcp-upstage-node',
      version: '0.1.0',
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );
  
  // Handle tool listing
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return { tools };
  });
  
  // Handle tool execution
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    
    try {
      if (name === 'parse_document') {
        const validatedArgs = ParseDocumentSchema.parse(args);
        const result = await parseAndSaveDocument(
          validatedArgs.file_path,
          API_KEY!,
          validatedArgs.output_formats,
          async (progress: { progress: number; total: number }) => {
            // Progress reporting through server notifications if needed
            server.notification({
              method: 'notifications/progress',
              params: { progress },
            });
          }
        );
        
        return {
          content: [{ type: 'text', text: result }],
        };
      } else if (name === 'extract_information') {
        const validatedArgs = ExtractInformationSchema.parse(args);
        const result = await extractInformationFromFile(
          validatedArgs.file_path,
          API_KEY!,
          {
            schemaPath: validatedArgs.schema_path,
            schemaJson: validatedArgs.schema_json,
            autoGenerateSchema: validatedArgs.auto_generate_schema,
            onProgress: async (progress: { progress: number; total: number }) => {
              server.notification({
                method: 'notifications/progress',
                params: { progress },
              });
            },
          }
        );
        
        return {
          content: [{ type: 'text', text: result }],
        };
      } else if (name === 'generate_schema') {
        const validatedArgs = GenerateSchemaSchema.parse(args);
        const result = await generateSchemaFromFile(
          validatedArgs.file_path,
          API_KEY!,
          async (progress: { progress: number; total: number }) => {
            server.notification({
              method: 'notifications/progress',
              params: { progress },
            });
          }
        );
        
        return {
          content: [{ type: 'text', text: result }],
        };
      } else if (name === 'classify_document') {
        const validatedArgs = ClassifyDocumentSchema.parse(args);
        const result = await classifyDocumentFromFile(
          validatedArgs.file_path,
          API_KEY!,
          {
            schemaPath: validatedArgs.schema_path,
            schemaJson: validatedArgs.schema_json,
            onProgress: async (progress: { progress: number; total: number }) => {
              server.notification({
                method: 'notifications/progress',
                params: { progress },
              });
            },
          }
        );
        
        return {
          content: [{ type: 'text', text: result }],
        };
      } else {
        throw new Error(`Unknown tool: ${name}`);
      }
    } catch (error: any) {
      return {
        content: [
          {
            type: 'text',
            text: `Error: ${error.message}`,
          },
        ],
        isError: true,
      };
    }
  });
  
  return server;
}

// Run server if executed directly
async function main() {
  const server = await createServer();
  const transport = new StdioServerTransport();
  
  await server.connect(transport);
  // Only log in development to avoid interfering with stdio transport
  if (process.env.NODE_ENV === 'development' || process.env.DEBUG) {
    console.error('MCP Server running on stdio');
  }
}

export default main;