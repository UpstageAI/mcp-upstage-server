# MCP-Upstage-Server

Node.js/TypeScript implementation of the MCP server for Upstage AI services.

## Features

- **Document Parsing**: Extract structure and content from various document types (PDF, images, Office files)
- **Information Extraction**: Extract structured information using custom or auto-generated schemas  
- **Schema Generation**: Automatically generate extraction schemas from document analysis
- **Document Classification**: Classify documents into predefined categories (invoice, receipt, contract, etc.)
- Built with TypeScript for type safety
- Dual transport support: stdio (default) and HTTP Streamable
- Async/await pattern throughout
- Comprehensive error handling and retry logic
- Progress reporting support

## Installation

### Prerequisites

- Node.js 18.0.0 or higher
- Upstage API key from [Upstage Console](https://console.upstage.ai)

### Install from npm

```bash
# Install globally
npm install -g mcp-upstage-server

# Or use with npx (no installation required)
npx mcp-upstage-server
```

### Install from source

```bash
# Clone the repository
git clone https://github.com/UpstageAI/mcp-upstage.git
cd mcp-upstage/mcp-upstage-node

# Install dependencies
npm install

# Build the project
npm run build

# Set up environment variables
cp .env.example .env
# Edit .env and add your UPSTAGE_API_KEY
```

## Usage

### Running the server

```bash
# With stdio transport (default)
UPSTAGE_API_KEY=your-api-key npx mcp-upstage-server

# With HTTP Streamable transport
UPSTAGE_API_KEY=your-api-key npx mcp-upstage-server --http

# With HTTP transport on custom port
UPSTAGE_API_KEY=your-api-key npx mcp-upstage-server --http --port 8080

# Show help
npx mcp-upstage-server --help

# Development mode (from source)
npm run dev

# Production mode (from source)
npm start
```

### Integration with Claude Desktop

**Option 1: stdio transport (default)**
```json
{
  "mcpServers": {
    "upstage": {
      "command": "npx",
      "args": ["mcp-upstage-server"],
      "env": {
        "UPSTAGE_API_KEY": "your-api-key-here"
      }
    }
  }
}
```

**Option 2: HTTP Streamable transport**
```json
{
  "mcpServers": {
    "upstage-http": {
      "command": "npx",
      "args": ["mcp-upstage-server", "--http", "--port", "3000"],
      "env": {
        "UPSTAGE_API_KEY": "your-api-key-here"
      }
    }
  }
}
```

## Transport Options

### stdio Transport (Default)
- **Pros**: Simple setup, direct process communication
- **Cons**: Single client connection only
- **Usage**: Default mode, no additional configuration needed

### HTTP Streamable Transport
- **Pros**: Multiple client support, network accessible, RESTful API
- **Cons**: Requires port management, network configuration
- **Endpoints**:
  - `POST /mcp` - Main MCP communication endpoint
  - `GET /mcp` - Server-Sent Events stream
  - `GET /health` - Health check endpoint

## Available Tools

### parse_document

Parse a document using Upstage AI's document digitization API.

**Parameters:**
- `file_path` (required): Path to the document file
- `output_formats` (optional): Array of output formats (e.g., ['html', 'text', 'markdown'])

**Supported formats:** PDF, JPEG, PNG, TIFF, BMP, GIF, WEBP

### extract_information

Extract structured information from documents using Upstage Universal Information Extraction.

**Parameters:**
- `file_path` (required): Path to the document file
- `schema_path` (optional): Path to JSON schema file
- `schema_json` (optional): JSON schema as string
- `auto_generate_schema` (optional, default: true): Auto-generate schema if none provided

**Supported formats:** JPEG, PNG, BMP, PDF, TIFF, HEIC, DOCX, PPTX, XLSX

### generate_schema

Generate an extraction schema for a document using Upstage AI's schema generation API.

**Parameters:**
- `file_path` (required): Path to the document file to analyze

**Supported formats:** JPEG, PNG, BMP, PDF, TIFF, HEIC, DOCX, PPTX, XLSX

This tool analyzes a document and automatically generates a JSON schema that defines the structure and fields that can be extracted from similar documents. The generated schema can then be used with the `extract_information` tool when `auto_generate_schema` is set to `false`.

**Use cases:**
- Create reusable schemas for multiple similar documents
- Have more control over extraction fields
- Ensure consistent field naming across extractions

The tool returns both a readable schema object and a `schema_json` string that can be directly copied and used with the `extract_information` tool.

### classify_document

Classify a document into predefined categories using Upstage AI's document classification API.

**Parameters:**
- `file_path` (required): Path to the document file to classify
- `schema_path` (optional): Path to JSON file containing custom classification schema
- `schema_json` (optional): JSON string containing custom classification schema

**Supported formats:** JPEG, PNG, BMP, PDF, TIFF, HEIC, DOCX, PPTX, XLSX

This tool analyzes a document and classifies it into categories. By default, it uses a comprehensive set of document types, but you can provide custom classification categories.

**Default categories:**
- invoice, receipt, contract, cv, bank_statement, tax_document, insurance, business_card, letter, form, certificate, report, others

**Use cases:**
- Automatically sort and organize documents by type
- Filter documents for specific processing workflows  
- Build document management systems with automatic categorization

## Schema Guide for Information Extraction

When `auto_generate_schema` is `false`, you need to provide a custom schema. Here's how to format it correctly:

### 📋 Basic Schema Structure

The schema must follow this exact structure:

```json
{
  "type": "json_schema",
  "json_schema": {
    "name": "document_schema",
    "schema": {
      "type": "object",
      "properties": {
        "field_name": {
          "type": "string|number|array|object",
          "description": "Description of what to extract"
        }
      }
    }
  }
}
```

### ❌ Common Mistakes

**Wrong:** Missing nested structure
```json
{
  "company_name": {
    "type": "string"
  }
}
```

**Wrong:** Incorrect response_format
```json
{
  "schema": {
    "company_name": "string"
  }
}
```

**Wrong:** Missing properties wrapper
```json
{
  "type": "json_schema",
  "json_schema": {
    "name": "document_schema", 
    "schema": {
      "type": "object",
      "company_name": {
        "type": "string"
      }
    }
  }
}
```

### ✅ Correct Examples

**Simple schema:**
```json
{
  "type": "json_schema",
  "json_schema": {
    "name": "document_schema",
    "schema": {
      "type": "object",
      "properties": {
        "company_name": {
          "type": "string",
          "description": "Name of the company"
        },
        "invoice_number": {
          "type": "string",
          "description": "Invoice number"
        },
        "total_amount": {
          "type": "number",
          "description": "Total invoice amount"
        }
      }
    }
  }
}
```

**Complex schema with arrays and objects:**
```json
{
  "type": "json_schema",
  "json_schema": {
    "name": "document_schema",
    "schema": {
      "type": "object",
      "properties": {
        "company_info": {
          "type": "object",
          "properties": {
            "name": {"type": "string"},
            "address": {"type": "string"},
            "phone": {"type": "string"}
          },
          "description": "Company information"
        },
        "items": {
          "type": "array",
          "items": {
            "type": "object", 
            "properties": {
              "item_name": {"type": "string"},
              "quantity": {"type": "number"},
              "price": {"type": "number"}
            }
          },
          "description": "List of invoice items"
        },
        "invoice_date": {
          "type": "string",
          "description": "Invoice date in YYYY-MM-DD format"
        }
      }
    }
  }
}
```

### 🛠️ Schema Creation Helper

You can create schemas programmatically:

```javascript
function createSchema(fields) {
  return JSON.stringify({
    "type": "json_schema",
    "json_schema": {
      "name": "document_schema",
      "schema": {
        "type": "object",
        "properties": fields
      }
    }
  });
}

// Usage example:
const schema = createSchema({
  "company_name": {
    "type": "string",
    "description": "Company name"
  },
  "total": {
    "type": "number", 
    "description": "Total amount"
  }
});
```

### 💡 Data Types

- `"string"`: Text data (names, addresses, etc.)
- `"number"`: Numeric data (amounts, quantities, etc.)
- `"boolean"`: True/false values
- `"array"`: Lists of items
- `"object"`: Nested structures
- `"null"`: Null values

### 📝 Best Practices

1. **Always include descriptions**: They help the AI understand what to extract
2. **Use specific field names**: `invoice_date` instead of `date`
3. **Nest related fields**: Group related information in objects
4. **Validate your JSON**: Use a JSON validator before using the schema
5. **Test with simple schemas first**: Start with basic fields before adding complexity

## Classification Schema Guide

The `classify_document` tool uses a different schema format optimized for classification tasks. Here's how to create custom classification schemas:

### 📋 Basic Classification Schema Structure

The classification schema must follow this exact structure:

```json
{
  "type": "json_schema",
  "json_schema": {
    "name": "document-classify",
    "schema": {
      "type": "string",
      "oneOf": [
        {"const": "category1", "description": "Description of category 1"},
        {"const": "category2", "description": "Description of category 2"},
        {"const": "others", "description": "Fallback category"}
      ]
    }
  }
}
```

### ✅ Correct Classification Examples

**Medical document classifier:**
```json
{
  "type": "json_schema",
  "json_schema": {
    "name": "document-classify",
    "schema": {
      "type": "string",
      "oneOf": [
        {"const": "prescription", "description": "Medical prescription document"},
        {"const": "lab_result", "description": "Laboratory test results"},
        {"const": "medical_record", "description": "Patient medical record"},
        {"const": "insurance_claim", "description": "Medical insurance claim"},
        {"const": "others", "description": "Other medical documents"}
      ]
    }
  }
}
```

**Business document classifier:**
```json
{
  "type": "json_schema",
  "json_schema": {
    "name": "document-classify",
    "schema": {
      "type": "string",
      "oneOf": [
        {"const": "purchase_order", "description": "Purchase order document"},
        {"const": "delivery_note", "description": "Delivery or shipping note"},
        {"const": "quotation", "description": "Price quotation or estimate"},
        {"const": "meeting_minutes", "description": "Meeting minutes or notes"},
        {"const": "others", "description": "Other business documents"}
      ]
    }
  }
}
```

### ❌ Common Classification Mistakes

**Wrong:** Missing oneOf structure
```json
{
  "type": "json_schema",
  "json_schema": {
    "name": "document-classify",
    "schema": {
      "type": "string",
      "enum": ["invoice", "receipt"]
    }
  }
}
```

**Wrong:** Using object instead of string type
```json
{
  "type": "json_schema",
  "json_schema": {
    "name": "document-classify",
    "schema": {
      "type": "object",
      "properties": {
        "category": {"type": "string"}
      }
    }
  }
}
```

### 💡 Classification Best Practices

1. **Always include "others" category**: Provides fallback for unexpected document types
2. **Use descriptive const values**: Clear category names like "medical_prescription" vs "doc1"
3. **Add meaningful descriptions**: Help the AI understand what each category represents
4. **Keep categories mutually exclusive**: Avoid overlapping categories that could confuse classification
5. **Limit category count**: Too many categories can reduce accuracy (recommended: 3-10 categories)
6. **Use consistent naming**: Stick to snake_case or kebab-case throughout

### 🛠️ Classification Schema Helper

```javascript
function createClassificationSchema(categories) {
  return JSON.stringify({
    "type": "json_schema",
    "json_schema": {
      "name": "document-classify", 
      "schema": {
        "type": "string",
        "oneOf": categories.map(cat => ({
          "const": cat.value,
          "description": cat.description
        }))
      }
    }
  });
}

// Usage example:
const schema = createClassificationSchema([
  {value: "legal_contract", description: "Legal contracts and agreements"},
  {value: "financial_report", description: "Financial statements and reports"},
  {value: "others", description: "Other document types"}
]);
```

## Development

```bash
# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Lint code
npm run lint

# Format code
npm run format

# Clean build artifacts
npm run clean
```

## Project Structure

```
mcp-upstage-node/
├── src/
│   ├── index.ts           # Entry point
│   ├── server.ts          # MCP server implementation
│   ├── tools/             # Tool implementations
│   │   ├── documentParser.ts
│   │   └── informationExtractor.ts
│   └── utils/             # Utility modules
│       ├── apiClient.ts   # HTTP client with retry
│       ├── fileUtils.ts   # File operations
│       ├── validators.ts  # Input validation
│       └── constants.ts   # Configuration constants
├── dist/                  # Compiled JavaScript (generated)
├── package.json
├── tsconfig.json
└── README.md
```

## Output Files

Results are saved to:
- Document parsing: `~/.mcp-upstage/outputs/document_parsing/`
- Information extraction: `~/.mcp-upstage/outputs/information_extraction/`
- Generated schemas: `~/.mcp-upstage/outputs/information_extraction/schemas/`
- Document classification: `~/.mcp-upstage/outputs/document_classification/`

## License

MIT