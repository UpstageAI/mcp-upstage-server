# Publishing Guide

This guide explains how to publish the MCP-Upstage Node.js package to npm.

## Prerequisites

1. **npm account**: Create an account at [npmjs.com](https://npmjs.com)
2. **Login to npm**: Run `npm login` and enter your credentials
3. **Organization access**: For publishing to `@upstageai` scope, you need access to the Upstage AI organization on npm

## Publishing Steps

### 1. Prepare for Publishing

```bash
# Ensure all changes are committed
git add .
git commit -m "Prepare for npm publish"

# Build the project
npm run build

# Test the package build (dry run)
npm run publish:test
```

### 2. Version Management

```bash
# Update version (patch/minor/major)
npm version patch  # 0.1.0 -> 0.1.1
npm version minor  # 0.1.0 -> 0.2.0
npm version major  # 0.1.0 -> 1.0.0
```

### 3. Publish

```bash
# Publish to npm (production)
npm run publish:npm

# Or publish beta version
npm run publish:beta
```

## After Publishing

Once published, users can install and use the package:

```bash
# Install globally
npm install -g mcp-upstage-server

# Use with npx (no installation required)
npx mcp-upstage-server

# Add to Claude Desktop config
{
  "mcpServers": {
    "upstage": {
      "command": "npx",
      "args": ["mcp-upstage-server"],
      "env": {
        "UPSTAGE_API_KEY": "your-api-key"
      }
    }
  }
}
```

## Package Details

- **Package name**: `mcp-upstage-server`
- **Binary name**: `mcp-upstage`
- **Registry**: https://registry.npmjs.org/
- **Access**: Public

## Troubleshooting

### Permission Issues
If you get permission errors, ensure you're logged in:

```bash
npm whoami
```

### Build Failures
Make sure TypeScript compiles without errors:

```bash
npm run clean
npm run build
```