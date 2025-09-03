/**
 * Schema validation and helper utilities for information extraction
 */

interface SchemaProperty {
  type: 'string' | 'number' | 'boolean' | 'array' | 'object' | 'null';
  description?: string;
  items?: SchemaProperty;
  properties?: Record<string, SchemaProperty>;
}

interface ExtractionSchema {
  type: 'json_schema';
  json_schema: {
    name: string;
    schema: {
      type: 'object';
      properties: Record<string, SchemaProperty>;
    };
  };
}

/**
 * Create a properly formatted schema for information extraction
 * @param fields - Object mapping field names to their schema definitions
 * @param name - Optional schema name (defaults to 'document_schema')
 * @returns Properly formatted schema object
 */
export function createExtractionSchema(
  fields: Record<string, SchemaProperty>,
  name: string = 'document_schema'
): ExtractionSchema {
  return {
    type: 'json_schema',
    json_schema: {
      name,
      schema: {
        type: 'object',
        properties: fields,
      },
    },
  };
}

/**
 * Validate that a schema object has the correct structure
 * @param schema - Schema object to validate
 * @throws Error if schema is invalid
 */
export function validateSchemaFormat(schema: any): void {
  if (!schema || typeof schema !== 'object') {
    throw new Error('Schema must be an object');
  }

  if (schema.type !== 'json_schema') {
    throw new Error('Schema must have type "json_schema"');
  }

  if (!schema.json_schema || typeof schema.json_schema !== 'object') {
    throw new Error('Schema must have "json_schema" property');
  }

  const jsonSchema = schema.json_schema;

  if (!jsonSchema.name || typeof jsonSchema.name !== 'string') {
    throw new Error('Schema must have a "name" property');
  }

  if (!jsonSchema.schema || typeof jsonSchema.schema !== 'object') {
    throw new Error('Schema must have a "schema" property');
  }

  if (jsonSchema.schema.type !== 'object') {
    throw new Error('Schema type must be "object"');
  }

  if (!jsonSchema.schema.properties || typeof jsonSchema.schema.properties !== 'object') {
    throw new Error('Schema must have "properties" object');
  }
}

/**
 * Common schema field helpers for typical document types
 */
export const commonFields = {
  companyName: {
    type: 'string' as const,
    description: 'Name of the company or organization',
  },
  invoiceNumber: {
    type: 'string' as const,
    description: 'Invoice or document number',
  },
  date: {
    type: 'string' as const,
    description: 'Date in YYYY-MM-DD format',
  },
  totalAmount: {
    type: 'number' as const,
    description: 'Total monetary amount',
  },
  address: {
    type: 'string' as const,
    description: 'Full address',
  },
  email: {
    type: 'string' as const,
    description: 'Email address',
  },
  phone: {
    type: 'string' as const,
    description: 'Phone number',
  },
  items: {
    type: 'array' as const,
    description: 'List of items',
    items: {
      type: 'object' as const,
      properties: {
        name: { type: 'string' as const, description: 'Item name' },
        quantity: { type: 'number' as const, description: 'Quantity' },
        price: { type: 'number' as const, description: 'Unit price' },
      },
    },
  },
};

/**
 * Pre-built schemas for common document types
 */
export const commonSchemas = {
  invoice: createExtractionSchema({
    company_name: commonFields.companyName,
    invoice_number: commonFields.invoiceNumber,
    invoice_date: commonFields.date,
    total_amount: commonFields.totalAmount,
    items: commonFields.items,
  }),

  receipt: createExtractionSchema({
    merchant_name: commonFields.companyName,
    date: commonFields.date,
    total_amount: commonFields.totalAmount,
    items: commonFields.items,
  }),

  businessCard: createExtractionSchema({
    name: { type: 'string', description: 'Person name' },
    company: commonFields.companyName,
    title: { type: 'string', description: 'Job title' },
    email: commonFields.email,
    phone: commonFields.phone,
    address: commonFields.address,
  }),

  contract: createExtractionSchema({
    contract_title: { type: 'string', description: 'Title of the contract' },
    parties: {
      type: 'array',
      description: 'Parties involved in the contract',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Party name' },
          role: { type: 'string', description: 'Party role (e.g., client, vendor)' },
        },
      },
    },
    start_date: commonFields.date,
    end_date: commonFields.date,
    value: commonFields.totalAmount,
  }),
};

/**
 * Convert a schema object to a JSON string suitable for the schema_json parameter
 * @param schema - Schema object
 * @returns JSON string
 */
export function schemaToJson(schema: ExtractionSchema): string {
  return JSON.stringify(schema);
}

/**
 * Parse and validate a schema JSON string
 * @param schemaJson - JSON string containing schema
 * @returns Parsed and validated schema object
 * @throws Error if JSON is invalid or schema format is wrong
 */
export function parseSchemaJson(schemaJson: string): ExtractionSchema {
  try {
    const schema = JSON.parse(schemaJson);
    validateSchemaFormat(schema);
    return schema;
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error(`Invalid JSON: ${error.message}`);
    }
    throw error;
  }
}