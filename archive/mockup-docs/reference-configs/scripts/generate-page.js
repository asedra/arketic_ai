#!/usr/bin/env node

/**
 * Page Generation Script
 * 
 * Generates Next.js pages with TypeScript, tests, and metadata.
 * Usage: npm run generate:page
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Configuration
const PAGES_DIR = './app';

// Page types and their configurations
const PAGE_TYPES = {
  static: {
    description: 'Static page (no data fetching)',
    hasServerComponent: false,
    hasMetadata: true,
    hasLoading: false,
    hasError: false,
  },
  dynamic: {
    description: 'Dynamic page with params',
    hasServerComponent: true,
    hasMetadata: true,
    hasLoading: true,
    hasError: true,
  },
  api: {
    description: 'API route',
    hasServerComponent: false,
    hasMetadata: false,
    hasLoading: false,
    hasError: false,
  },
};

/**
 * Logging utility
 */
const logger = {
  info: (message) => console.log(`ℹ️  ${message}`),
  success: (message) => console.log(`✅ ${message}`),
  warn: (message) => console.log(`⚠️  ${message}`),
  error: (message) => console.error(`❌ ${message}`),
  question: (message) => `❓ ${message}`,
};

/**
 * Create readline interface
 */
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

/**
 * Prompt user for input
 */
function prompt(question) {
  return new Promise((resolve) => {
    rl.question(logger.question(question), (answer) => {
      resolve(answer.trim());
    });
  });
}

/**
 * Validate page name
 */
function validatePageName(name) {
  if (!name) {
    return 'Page name is required';
  }
  
  if (!/^[a-z0-9-_/]+$/.test(name)) {
    return 'Page name must contain only lowercase letters, numbers, hyphens, underscores, and forward slashes';
  }
  
  if (name.startsWith('/') || name.endsWith('/')) {
    return 'Page name should not start or end with forward slash';
  }
  
  return null;
}

/**
 * Convert kebab-case to PascalCase
 */
function toPascalCase(str) {
  return str
    .split(/[-_/]/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join('');
}

/**
 * Generate page metadata
 */
function generateMetadata(pageName, title, description) {
  return `import { Metadata } from 'next';

export const metadata: Metadata = {
  title: '${title}',
  description: '${description}',
  keywords: ['arketic', '${pageName}'],
  openGraph: {
    title: '${title}',
    description: '${description}',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: '${title}',
    description: '${description}',
  },
};`;
}

/**
 * Generate static page content
 */
function generateStaticPageContent(pageName, componentName, hasMetadata, title, description) {
  const imports = [];
  
  if (hasMetadata) {
    imports.push(generateMetadata(pageName, title, description));
  }
  
  return `${imports.join('\n\n')}

/**
 * ${componentName} page component
 * 
 * @description ${description}
 */
export default function ${componentName}Page() {
  return (
    <div className="container mx-auto py-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-6">${title}</h1>
        
        <div className="prose max-w-none">
          <p className="text-lg text-muted-foreground mb-8">
            ${description}
          </p>
          
          {/* Page content goes here */}
          <div className="bg-muted rounded-lg p-8 text-center">
            <p>Implement your ${pageName} page content here.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
`;
}

/**
 * Generate dynamic page content
 */
function generateDynamicPageContent(pageName, componentName, hasMetadata, title, description) {
  const imports = [];
  
  if (hasMetadata) {
    imports.push(`import { Metadata } from 'next';`);
  }
  
  const metadataFunction = hasMetadata ? `
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  return {
    title: '${title} - ' + params.id,
    description: '${description}',
    keywords: ['arketic', '${pageName}'],
  };
}` : '';
  
  return `${imports.join('\n')}

interface PageProps {
  params: { id: string };
  searchParams: { [key: string]: string | string[] | undefined };
}

${metadataFunction}

/**
 * ${componentName} dynamic page component
 * 
 * @description ${description}
 */
export default async function ${componentName}Page({ params, searchParams }: PageProps) {
  // Fetch data based on params
  const { id } = params;
  
  return (
    <div className="container mx-auto py-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-6">${title}</h1>
        
        <div className="prose max-w-none">
          <p className="text-lg text-muted-foreground mb-8">
            ${description}
          </p>
          
          <div className="bg-muted rounded-lg p-8">
            <p><strong>ID:</strong> {id}</p>
            <p><strong>Search Params:</strong> {JSON.stringify(searchParams, null, 2)}</p>
            
            {/* Dynamic content goes here */}
            <div className="mt-6">
              <p>Implement your dynamic ${pageName} page content here.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
`;
}

/**
 * Generate API route content
 */
function generateAPIRouteContent(routeName, description) {
  return `import { NextRequest, NextResponse } from 'next/server';

/**
 * ${routeName} API route
 * 
 * @description ${description}
 */

export async function GET(request: NextRequest) {
  try {
    // Implement GET logic here
    const data = {
      message: 'Hello from ${routeName} API',
      timestamp: new Date().toISOString(),
    };
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('GET ${routeName} error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Implement POST logic here
    const result = {
      message: 'Data received successfully',
      data: body,
      timestamp: new Date().toISOString(),
    };
    
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error('POST ${routeName} error:', error);
    return NextResponse.json(
      { error: 'Invalid request data' },
      { status: 400 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Implement PUT logic here
    const result = {
      message: 'Data updated successfully',
      data: body,
      timestamp: new Date().toISOString(),
    };
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('PUT ${routeName} error:', error);
    return NextResponse.json(
      { error: 'Update failed' },
      { status: 400 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // Implement DELETE logic here
    const result = {
      message: 'Data deleted successfully',
      timestamp: new Date().toISOString(),
    };
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('DELETE ${routeName} error:', error);
    return NextResponse.json(
      { error: 'Delete failed' },
      { status: 400 }
    );
  }
}
`;
}

/**
 * Generate loading component
 */
function generateLoadingContent(componentName) {
  return `/**
 * Loading component for ${componentName} page
 */
export default function Loading() {
  return (
    <div className="container mx-auto py-8">
      <div className="max-w-4xl mx-auto">
        <div className="animate-pulse">
          <div className="h-12 bg-muted rounded mb-6"></div>
          <div className="h-6 bg-muted rounded mb-8 w-2/3"></div>
          <div className="bg-muted rounded-lg p-8">
            <div className="space-y-4">
              <div className="h-4 bg-muted-foreground/20 rounded w-full"></div>
              <div className="h-4 bg-muted-foreground/20 rounded w-3/4"></div>
              <div className="h-4 bg-muted-foreground/20 rounded w-1/2"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
`;
}

/**
 * Generate error component
 */
function generateErrorContent(componentName) {
  return `'use client';

import { useEffect } from 'react';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

/**
 * Error component for ${componentName} page
 */
export default function Error({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('${componentName} page error:', error);
  }, [error]);

  return (
    <div className="container mx-auto py-8">
      <div className="max-w-4xl mx-auto text-center">
        <h1 className="text-4xl font-bold mb-6 text-destructive">
          Something went wrong!
        </h1>
        
        <div className="bg-muted rounded-lg p-8 mb-6">
          <p className="text-lg text-muted-foreground mb-4">
            An error occurred while loading this page.
          </p>
          
          {process.env.NODE_ENV === 'development' && (
            <details className="mt-4 text-left">
              <summary className="cursor-pointer font-semibold">
                Error Details (Development Only)
              </summary>
              <pre className="mt-2 p-4 bg-destructive/10 rounded text-sm overflow-auto">
                {error.message}
                {error.stack && '\n\n' + error.stack}
              </pre>
            </details>
          )}
        </div>
        
        <button
          onClick={reset}
          className="px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
`;
}

/**
 * Generate test file content
 */
function generateTestContent(pageName, componentName, isAPI = false) {
  if (isAPI) {
    return `import { NextRequest } from 'next/server';
import { GET, POST, PUT, DELETE } from './route';

// Mock NextRequest
const createMockRequest = (method: string, body?: any): NextRequest => {
  const url = 'http://localhost:3000/api/${pageName}';
  return new NextRequest(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
};

describe('/api/${pageName}', () => {
  describe('GET', () => {
    it('should return success response', async () => {
      const request = createMockRequest('GET');
      const response = await GET(request);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data).toHaveProperty('message');
      expect(data).toHaveProperty('timestamp');
    });
  });

  describe('POST', () => {
    it('should create resource successfully', async () => {
      const testData = { name: 'test', value: 'test-value' };
      const request = createMockRequest('POST', testData);
      const response = await POST(request);
      const data = await response.json();
      
      expect(response.status).toBe(201);
      expect(data).toHaveProperty('message');
      expect(data.data).toEqual(testData);
    });
  });

  describe('PUT', () => {
    it('should update resource successfully', async () => {
      const testData = { name: 'updated', value: 'updated-value' };
      const request = createMockRequest('PUT', testData);
      const response = await PUT(request);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data).toHaveProperty('message');
      expect(data.data).toEqual(testData);
    });
  });

  describe('DELETE', () => {
    it('should delete resource successfully', async () => {
      const request = createMockRequest('DELETE');
      const response = await DELETE(request);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data).toHaveProperty('message');
    });
  });
});
`;
  }
  
  return `import { render, screen } from '@testing-library/react';
import ${componentName}Page from './page';

// Mock Next.js metadata
jest.mock('next', () => ({
  metadata: {
    title: 'Test Page',
    description: 'Test page description',
  },
}));

describe('${componentName}Page', () => {
  it('renders without crashing', () => {
    render(<${componentName}Page />);
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
  });

  it('displays the correct title', () => {
    render(<${componentName}Page />);
    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading).toHaveTextContent('${pageName}');
  });

  it('has proper page structure', () => {
    render(<${componentName}Page />);
    
    // Check for container
    const container = screen.getByRole('main') || document.querySelector('.container');
    expect(container).toBeInTheDocument();
    
    // Check for content area
    const prose = document.querySelector('.prose');
    expect(prose).toBeInTheDocument();
  });
});
`;
}

/**
 * Create page files
 */
async function createPage(pageName, type, options) {
  const { title, description } = options;
  const componentName = toPascalCase(pageName);
  const typeConfig = PAGE_TYPES[type];
  
  // Determine page directory
  const pageDir = type === 'api' 
    ? path.join(PAGES_DIR, 'api', pageName)
    : path.join(PAGES_DIR, pageName);
  
  // Check if page already exists
  if (fs.existsSync(pageDir)) {
    throw new Error(`Page ${pageName} already exists in ${pageDir}`);
  }
  
  // Create page directory
  fs.mkdirSync(pageDir, { recursive: true });
  
  const files = [];
  
  // Generate main page/route file
  let mainContent;
  const mainFileName = type === 'api' ? 'route.ts' : 'page.tsx';
  
  if (type === 'api') {
    mainContent = generateAPIRouteContent(pageName, description);
  } else if (type === 'dynamic') {
    mainContent = generateDynamicPageContent(pageName, componentName, typeConfig.hasMetadata, title, description);
  } else {
    mainContent = generateStaticPageContent(pageName, componentName, typeConfig.hasMetadata, title, description);
  }
  
  const mainFile = path.join(pageDir, mainFileName);
  fs.writeFileSync(mainFile, mainContent);
  files.push(mainFile);
  
  // Generate loading component
  if (typeConfig.hasLoading) {
    const loadingContent = generateLoadingContent(componentName);
    const loadingFile = path.join(pageDir, 'loading.tsx');
    fs.writeFileSync(loadingFile, loadingContent);
    files.push(loadingFile);
  }
  
  // Generate error component
  if (typeConfig.hasError) {
    const errorContent = generateErrorContent(componentName);
    const errorFile = path.join(pageDir, 'error.tsx');
    fs.writeFileSync(errorFile, errorContent);
    files.push(errorFile);
  }
  
  // Generate test file
  const testContent = generateTestContent(pageName, componentName, type === 'api');
  const testFileName = type === 'api' ? 'route.test.ts' : 'page.test.tsx';
  const testFile = path.join(pageDir, testFileName);
  fs.writeFileSync(testFile, testContent);
  files.push(testFile);
  
  return files;
}

/**
 * Main execution function
 */
async function main() {
  try {
    logger.info('Next.js Page Generator');
    logger.info('=====================');
    
    // Get page name
    let pageName;
    while (true) {
      pageName = await prompt('Page name (kebab-case, e.g., "user-profile" or "api/users"): ');
      const nameError = validatePageName(pageName);
      if (!nameError) break;
      logger.error(nameError);
    }
    
    // Get page type
    logger.info('\nAvailable page types:');
    Object.entries(PAGE_TYPES).forEach(([key, config]) => {
      logger.info(`  ${key}: ${config.description}`);
    });
    
    let pageType;
    while (true) {
      pageType = await prompt('\nPage type: ');
      if (PAGE_TYPES[pageType]) break;
      logger.error('Invalid page type. Please choose from: ' + Object.keys(PAGE_TYPES).join(', '));
    }
    
    // Get page details
    const title = pageType !== 'api' 
      ? await prompt('Page title: ') || toPascalCase(pageName)
      : '';
      
    const description = await prompt('Page description: ') || `${pageName} page for the Arketic platform`;
    
    const options = { title, description };
    
    // Create page
    logger.info(`\nCreating ${pageType} page: ${pageName}...`);
    
    const files = await createPage(pageName, pageType, options);
    
    logger.success(`Page ${pageName} created successfully!`);
    logger.info('\nGenerated files:');
    files.forEach(file => logger.info(`  ${file}`));
    
    // Next steps
    logger.info('\nNext steps:');
    if (pageType === 'api') {
      logger.info('1. Implement API logic in route handlers');
      logger.info('2. Add proper error handling');
      logger.info('3. Implement authentication/authorization');
      logger.info('4. Add request validation');
      logger.info('5. Write comprehensive tests');
    } else {
      logger.info('1. Implement page content and components');
      logger.info('2. Add proper data fetching');
      logger.info('3. Implement responsive design');
      logger.info('4. Add SEO optimizations');
      logger.info('5. Write comprehensive tests');
    }
    
  } catch (error) {
    logger.error(`Page generation failed: ${error.message}`);
    process.exit(1);
  } finally {
    rl.close();
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = {
  generatePage: main,
  validatePageName,
  PAGE_TYPES,
};