#!/usr/bin/env node

import main from './server.js';
import startHttpServer from './httpServer.js';

// Parse command line arguments
const args = process.argv.slice(2);
const httpMode = args.includes('--http');
const portIndex = args.indexOf('--port');
const port = portIndex !== -1 && args[portIndex + 1] ? parseInt(args[portIndex + 1]) : 3000;

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Show usage help
function showHelp() {
  console.log(`
MCP Upstage Server

Usage:
  mcp-upstage-server [options]

Options:
  --http              Start HTTP server (default: stdio)
  --port <number>     HTTP server port (default: 3000)
  --help              Show this help message

Examples:
  mcp-upstage-server                    # Start with stdio transport
  mcp-upstage-server --http             # Start HTTP server on port 3000
  mcp-upstage-server --http --port 8080 # Start HTTP server on port 8080

Environment Variables:
  UPSTAGE_API_KEY     Required Upstage API key
`);
}

// Handle help flag
if (args.includes('--help') || args.includes('-h')) {
  showHelp();
  process.exit(0);
}

// Start appropriate server
async function startServer() {
  if (httpMode) {
    console.error('🚀 Starting MCP Server with HTTP Streamable transport...');
    await startHttpServer(port);
  } else {
    // For stdio transport, minimize stderr output to avoid JSON parsing issues
    if (process.env.NODE_ENV === 'development' || process.env.DEBUG) {
      console.error('🚀 Starting MCP Server with stdio transport...');
    }
    await main();
  }
}

startServer().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});