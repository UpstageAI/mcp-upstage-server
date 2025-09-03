import express from 'express';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const DEFAULT_PORT = 3000;

export async function startHttpServer(port: number = DEFAULT_PORT): Promise<void> {
  const app = express();
  
  // Middleware
  app.use(express.json({ limit: '50mb' }));
  app.use(express.raw({ type: 'application/octet-stream', limit: '50mb' }));
  
  // CORS middleware for MCP
  app.use((_req, res, next) => {
    res.header('Access-Control-Allow-Origin', _req.headers.origin || '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept, Mcp-Session-Id');
    res.header('Access-Control-Expose-Headers', 'Mcp-Session-Id');
    
    if (_req.method === 'OPTIONS') {
      res.sendStatus(200);
      return;
    }
    
    next();
  });
  
  // Health check endpoint
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', transport: 'http', version: '0.2.0' });
  });
  
  // MCP endpoint for Streamable HTTP
  app.post('/mcp', async (req, res) => {
    try {
      // Validate Accept header
      const acceptHeader = req.headers.accept;
      if (!acceptHeader || (!acceptHeader.includes('application/json') && !acceptHeader.includes('text/event-stream'))) {
        res.status(400).json({
          error: 'Invalid Accept header. Must include application/json or text/event-stream'
        });
        return;
      }
      
      // Extract session ID if present
      const sessionId = req.headers['mcp-session-id'] as string;
      
      // Set response headers
      res.setHeader('Content-Type', 'application/json');
      if (sessionId) {
        res.setHeader('Mcp-Session-Id', sessionId);
      }
      
      // Process JSON-RPC request
      const jsonRpcRequest = req.body;
      
      if (!jsonRpcRequest || typeof jsonRpcRequest !== 'object') {
        res.status(400).json({
          jsonrpc: '2.0',
          error: { code: -32600, message: 'Invalid Request' },
          id: null
        });
        return;
      }
      
      // Handle the request through MCP server
      // Note: This is a simplified implementation
      // In a full implementation, you'd need to properly integrate with the MCP server's request handling
      if (jsonRpcRequest.method === 'tools/list') {
        const tools = [
          {
            name: 'parse_document',
            description: 'Parse a document using Upstage AI\'s document digitization API.',
            inputSchema: {
              type: 'object',
              properties: {
                file_path: { type: 'string' },
                output_formats: { type: 'array', items: { type: 'string' } }
              },
              required: ['file_path']
            }
          },
          {
            name: 'extract_information',
            description: 'Extract structured information from documents using Upstage Universal Information Extraction.',
            inputSchema: {
              type: 'object',
              properties: {
                file_path: { type: 'string' },
                schema_path: { type: 'string' },
                schema_json: { type: 'string' },
                auto_generate_schema: { type: 'boolean', default: true }
              },
              required: ['file_path']
            }
          }
        ];
        
        res.json({
          jsonrpc: '2.0',
          result: { tools },
          id: jsonRpcRequest.id
        });
        return;
      }
      
      // For other methods, return method not found
      res.json({
        jsonrpc: '2.0',
        error: { code: -32601, message: 'Method not found' },
        id: jsonRpcRequest.id
      });
      
    } catch (error: any) {
      console.error('Error processing MCP request:', error);
      res.status(500).json({
        jsonrpc: '2.0',
        error: { code: -32603, message: 'Internal error', data: error.message },
        id: req.body?.id || null
      });
    }
  });
  
  // Server-Sent Events endpoint (GET /mcp for streaming)
  app.get('/mcp', (req, res) => {
    // Validate Accept header for SSE
    const acceptHeader = req.headers.accept;
    if (!acceptHeader || !acceptHeader.includes('text/event-stream')) {
      return res.status(400).json({
        error: 'Invalid Accept header. Must include text/event-stream for SSE'
      });
    }
    
    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    
    // Send initial connection event
    res.write('event: connected\n');
    res.write('data: {"type":"connection","status":"connected"}\n\n');
    
    // Handle client disconnect
    req.on('close', () => {
      res.end();
    });
    
    // Keep connection alive
    return;
  });
  
  // Start the server
  app.listen(port, '127.0.0.1', () => {
    console.log(`\nMCP Server with HTTP Streamable transport running at:`);
    console.log(`🌐 HTTP: http://127.0.0.1:${port}/mcp`);
    console.log(`🏥 Health: http://127.0.0.1:${port}/health`);
    console.log(`\nAdd to Claude Desktop config:`);
    console.log(`{`);
    console.log(`  "mcpServers": {`);
    console.log(`    "upstage-http": {`);
    console.log(`      "command": "npx",`);
    console.log(`      "args": ["mcp-upstage-server", "--http", "--port", "${port}"],`);
    console.log(`      "env": {`);
    console.log(`        "UPSTAGE_API_KEY": "your-api-key"`);
    console.log(`      }`);
    console.log(`    }`);
    console.log(`  }`);
    console.log(`}`);
  });
}

export default startHttpServer;