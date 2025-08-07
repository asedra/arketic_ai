#!/usr/bin/env node

/**
 * Documentation Generation Script
 * 
 * This script generates comprehensive documentation for the Arketic platform,
 * including API docs, component docs, and usage guides.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const CONFIG = {
  docsDir: './docs',
  sourceDir: './app',
  componentsDir: './components',
  outputFormats: ['html', 'markdown'],
  includePrivate: false,
  generateAPIRoutes: true,
  generateComponentDocs: true,
  generateHooksDocs: true,
  generateUtilsDocs: true,
};

/**
 * Logging utility
 */
const logger = {
  info: (message) => console.log(`ℹ️  ${message}`),
  success: (message) => console.log(`✅ ${message}`),
  warn: (message) => console.log(`⚠️  ${message}`),
  error: (message) => console.error(`❌ ${message}`),
};

/**
 * Clean the docs directory
 */
function cleanDocsDirectory() {
  logger.info('Cleaning docs directory...');
  
  if (fs.existsSync(CONFIG.docsDir)) {
    fs.rmSync(CONFIG.docsDir, { recursive: true, force: true });
  }
  
  fs.mkdirSync(CONFIG.docsDir, { recursive: true });
  logger.success('Docs directory cleaned');
}

/**
 * Generate TypeDoc documentation
 */
function generateTypeDoc() {
  logger.info('Generating TypeDoc documentation...');
  
  try {
    execSync('npx typedoc', { stdio: 'inherit' });
    logger.success('TypeDoc documentation generated');
  } catch (error) {
    logger.error('Failed to generate TypeDoc documentation');
    throw error;
  }
}

/**
 * Extract API routes from Next.js app directory
 */
function extractAPIRoutes() {
  const apiRoutesDir = path.join(CONFIG.sourceDir, 'api');
  const routes = [];
  
  if (!fs.existsSync(apiRoutesDir)) {
    logger.warn('No API routes directory found');
    return routes;
  }
  
  function scanDirectory(dir, basePath = '') {
    const items = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const item of items) {
      const fullPath = path.join(dir, item.name);
      const routePath = path.join(basePath, item.name);
      
      if (item.isDirectory()) {
        scanDirectory(fullPath, routePath);
      } else if (item.name === 'route.ts' || item.name === 'route.js') {
        const content = fs.readFileSync(fullPath, 'utf8');
        const methods = extractHTTPMethods(content);
        
        routes.push({
          path: `/${routePath.replace(/\\/g, '/').replace('/route.ts', '').replace('/route.js', '')}`,
          file: fullPath,
          methods,
          description: extractDescription(content),
        });
      }
    }
  }
  
  scanDirectory(apiRoutesDir);
  return routes;
}

/**
 * Extract HTTP methods from route file content
 */
function extractHTTPMethods(content) {
  const methods = [];
  const httpMethods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'];
  
  for (const method of httpMethods) {
    if (content.includes(`export function ${method}`) || content.includes(`export async function ${method}`)) {
      methods.push(method);
    }
  }
  
  return methods;
}

/**
 * Extract description from JSDoc comments
 */
function extractDescription(content) {
  const jsdocMatch = content.match(/\/\*\*\n[\s\*]*(.+?)\n[\s\*]*\*\//);
  return jsdocMatch ? jsdocMatch[1].trim() : 'No description available';
}

/**
 * Generate API documentation
 */
function generateAPIDocumentation() {
  if (!CONFIG.generateAPIRoutes) return;
  
  logger.info('Generating API documentation...');
  
  const routes = extractAPIRoutes();
  const apiDocsDir = path.join(CONFIG.docsDir, 'api');
  
  fs.mkdirSync(apiDocsDir, { recursive: true });
  
  // Generate API routes index
  const apiIndexContent = `# API Routes

This document lists all available API routes in the Arketic platform.

## Available Routes

${routes.map(route => `
### \`${route.path}\`

**Methods:** ${route.methods.join(', ')}

**Description:** ${route.description}

**File:** \`${route.file}\`
`).join('\n')}

## Authentication

Most API routes require authentication. Include the Bearer token in the Authorization header:

\`\`\`
Authorization: Bearer <your-token>
\`\`\`

## Error Handling

All API routes follow consistent error handling patterns:

\`\`\`json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable error message",
    "details": {}
  }
}
\`\`\`

## Rate Limiting

API routes are rate limited to prevent abuse. Current limits:

- Authenticated users: 1000 requests per hour
- Unauthenticated users: 100 requests per hour
`;
  
  fs.writeFileSync(path.join(apiDocsDir, 'index.md'), apiIndexContent);
  logger.success('API documentation generated');
}

/**
 * Extract component information
 */
function extractComponents() {
  const components = [];
  
  function scanComponents(dir, category = '') {
    if (!fs.existsSync(dir)) return;
    
    const items = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const item of items) {
      const fullPath = path.join(dir, item.name);
      
      if (item.isDirectory()) {
        scanComponents(fullPath, item.name);
      } else if (item.name.endsWith('.tsx') && !item.name.endsWith('.test.tsx')) {
        const content = fs.readFileSync(fullPath, 'utf8');
        const componentInfo = extractComponentInfo(content, fullPath);
        
        if (componentInfo) {
          components.push({
            ...componentInfo,
            category,
            file: fullPath,
          });
        }
      }
    }
  }
  
  scanComponents(CONFIG.componentsDir);
  return components;
}

/**
 * Extract component information from file content
 */
function extractComponentInfo(content, filePath) {
  // Extract component name from file name or export
  const fileName = path.basename(filePath, '.tsx');
  const exportMatch = content.match(/export\s+(?:default\s+)?(?:function|const)\s+(\w+)/);
  const componentName = exportMatch ? exportMatch[1] : fileName;
  
  // Extract props interface
  const propsMatch = content.match(/interface\s+(\w*Props)\s*{([^}]*)}/s);
  const props = propsMatch ? extractProps(propsMatch[2]) : [];
  
  // Extract description from JSDoc
  const descriptionMatch = content.match(/\/\*\*\n[\s\*]*(.+?)\n[\s\*]*\*\//s);
  const description = descriptionMatch ? descriptionMatch[1].replace(/\*\s*/g, '').trim() : '';
  
  return {
    name: componentName,
    description,
    props,
  };
}

/**
 * Extract props from interface content
 */
function extractProps(propsContent) {
  const props = [];
  const propMatches = propsContent.match(/(\w+)(\?)?\s*:\s*([^;,\n]+)/g) || [];
  
  for (const match of propMatches) {
    const propMatch = match.match(/(\w+)(\?)?\s*:\s*([^;,\n]+)/);
    if (propMatch) {
      props.push({
        name: propMatch[1],
        optional: !!propMatch[2],
        type: propMatch[3].trim(),
      });
    }
  }
  
  return props;
}

/**
 * Generate component documentation
 */
function generateComponentDocumentation() {
  if (!CONFIG.generateComponentDocs) return;
  
  logger.info('Generating component documentation...');
  
  const components = extractComponents();
  const componentsDocsDir = path.join(CONFIG.docsDir, 'components');
  
  fs.mkdirSync(componentsDocsDir, { recursive: true });
  
  // Group components by category
  const categorizedComponents = components.reduce((acc, component) => {
    const category = component.category || 'general';
    if (!acc[category]) acc[category] = [];
    acc[category].push(component);
    return acc;
  }, {});
  
  // Generate index
  const indexContent = `# Components

This document lists all available components in the Arketic platform.

${Object.entries(categorizedComponents).map(([category, comps]) => `
## ${category.charAt(0).toUpperCase() + category.slice(1)}

${comps.map(comp => `- [\`${comp.name}\`](./${category}/${comp.name}.md) - ${comp.description}`).join('\n')}
`).join('\n')}
`;
  
  fs.writeFileSync(path.join(componentsDocsDir, 'index.md'), indexContent);
  
  // Generate individual component docs
  for (const [category, comps] of Object.entries(categorizedComponents)) {
    const categoryDir = path.join(componentsDocsDir, category);
    fs.mkdirSync(categoryDir, { recursive: true });
    
    for (const component of comps) {
      const componentContent = `# ${component.name}

${component.description}

## Props

${component.props.length > 0 ? `
| Prop | Type | Required | Description |
|------|------|----------|-------------|
${component.props.map(prop => `| \`${prop.name}\` | \`${prop.type}\` | ${prop.optional ? 'No' : 'Yes'} | - |`).join('\n')}
` : 'This component does not accept any props.'}

## Usage

\`\`\`tsx
import { ${component.name} } from '@/components/${category}/${component.name}';

export default function Example() {
  return (
    <${component.name}${component.props.length > 0 ? ' prop="value"' : ''} />
  );
}
\`\`\`

## Source

[\`${component.file}\`](${component.file})
`;
      
      fs.writeFileSync(path.join(categoryDir, `${component.name}.md`), componentContent);
    }
  }
  
  logger.success('Component documentation generated');
}

/**
 * Generate hooks documentation
 */
function generateHooksDocumentation() {
  if (!CONFIG.generateHooksDocs) return;
  
  logger.info('Generating hooks documentation...');
  
  const hooksDir = './hooks';
  const docsHooksDir = path.join(CONFIG.docsDir, 'hooks');
  
  if (!fs.existsSync(hooksDir)) {
    logger.warn('No hooks directory found');
    return;
  }
  
  fs.mkdirSync(docsHooksDir, { recursive: true });
  
  const hooks = fs.readdirSync(hooksDir)
    .filter(file => file.endsWith('.ts') || file.endsWith('.tsx'))
    .filter(file => !file.endsWith('.test.ts') && !file.endsWith('.test.tsx'));
  
  const indexContent = `# Custom Hooks

This document lists all custom hooks available in the Arketic platform.

${hooks.map(hook => {
    const hookName = path.basename(hook, path.extname(hook));
    return `- [\`${hookName}\`](./${hookName}.md)`;
  }).join('\n')}
`;
  
  fs.writeFileSync(path.join(docsHooksDir, 'index.md'), indexContent);
  logger.success('Hooks documentation generated');
}

/**
 * Generate utilities documentation
 */
function generateUtilsDocumentation() {
  if (!CONFIG.generateUtilsDocs) return;
  
  logger.info('Generating utilities documentation...');
  
  const utilsDir = './lib';
  const docsUtilsDir = path.join(CONFIG.docsDir, 'utils');
  
  if (!fs.existsSync(utilsDir)) {
    logger.warn('No utils directory found');
    return;
  }
  
  fs.mkdirSync(docsUtilsDir, { recursive: true });
  
  const utils = fs.readdirSync(utilsDir)
    .filter(file => file.endsWith('.ts') || file.endsWith('.tsx'))
    .filter(file => !file.endsWith('.test.ts') && !file.endsWith('.test.tsx'));
  
  const indexContent = `# Utilities

This document lists all utility functions available in the Arketic platform.

${utils.map(util => {
    const utilName = path.basename(util, path.extname(util));
    return `- [\`${utilName}\`](./${utilName}.md)`;
  }).join('\n')}
`;
  
  fs.writeFileSync(path.join(docsUtilsDir, 'index.md'), indexContent);
  logger.success('Utils documentation generated');
}

/**
 * Generate main documentation index
 */
function generateMainIndex() {
  const indexContent = `# Arketic Platform Documentation

Welcome to the Arketic Platform documentation. This documentation is automatically generated from the codebase.

## Quick Links

- [API Routes](./api/index.md) - REST API endpoints
- [Components](./components/index.md) - React components
- [Hooks](./hooks/index.md) - Custom React hooks
- [Utilities](./utils/index.md) - Utility functions

## Getting Started

1. Clone the repository
2. Install dependencies: \`npm install\`
3. Start development server: \`npm run dev\`
4. Open [http://localhost:3000](http://localhost:3000)

## Development

- [Contributing Guide](../CONTRIBUTING.md)
- [Code Style Guide](./code-style.md)
- [Testing Guide](./testing.md)

## Architecture

- [Project Structure](./architecture/structure.md)
- [Data Flow](./architecture/data-flow.md)
- [Security](./architecture/security.md)

## Deployment

- [Environment Setup](./deployment/environment.md)
- [Docker](./deployment/docker.md)
- [Kubernetes](./deployment/kubernetes.md)

---

*This documentation was automatically generated on ${new Date().toISOString()}*
`;
  
  fs.writeFileSync(path.join(CONFIG.docsDir, 'index.md'), indexContent);
}

/**
 * Main execution function
 */
async function main() {
  try {
    logger.info('Starting documentation generation...');
    
    // Clean and prepare
    cleanDocsDirectory();
    
    // Generate TypeDoc documentation
    generateTypeDoc();
    
    // Generate custom documentation
    generateAPIDocumentation();
    generateComponentDocumentation();
    generateHooksDocumentation();
    generateUtilsDocumentation();
    
    // Generate main index
    generateMainIndex();
    
    logger.success('Documentation generation completed successfully!');
    logger.info(`Documentation available at: ${path.resolve(CONFIG.docsDir)}`);
    
  } catch (error) {
    logger.error(`Documentation generation failed: ${error.message}`);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = {
  generateDocs: main,
  CONFIG,
};