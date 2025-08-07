#!/usr/bin/env node

/**
 * Component Generation Script
 * 
 * Generates React components with TypeScript, tests, stories, and documentation.
 * Usage: npm run generate:component
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Configuration
const TEMPLATES_DIR = path.join(__dirname, 'templates');
const COMPONENTS_DIR = './components';

// Component types and their configurations
const COMPONENT_TYPES = {
  ui: {
    dir: 'ui',
    description: 'Basic UI component (Button, Input, etc.)',
    includeStories: true,
    includeTests: true,
  },
  feature: {
    dir: 'feature',
    description: 'Feature-specific component',
    includeStories: true,
    includeTests: true,
  },
  layout: {
    dir: 'layout',
    description: 'Layout component (Header, Footer, etc.)',
    includeStories: false,
    includeTests: true,
  },
  page: {
    dir: 'page',
    description: 'Full page component',
    includeStories: false,
    includeTests: true,
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
 * Validate component name
 */
function validateComponentName(name) {
  if (!name) {
    return 'Component name is required';
  }
  
  if (!/^[A-Z][a-zA-Z0-9]*$/.test(name)) {
    return 'Component name must be PascalCase and start with a capital letter';
  }
  
  if (name.length < 2) {
    return 'Component name must be at least 2 characters long';
  }
  
  return null;
}

/**
 * Convert PascalCase to kebab-case
 */
function toKebabCase(str) {
  return str
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .toLowerCase();
}

/**
 * Convert PascalCase to camelCase
 */
function toCamelCase(str) {
  return str.charAt(0).toLowerCase() + str.slice(1);
}

/**
 * Generate component file content
 */
function generateComponentContent(name, type, options) {
  const { hasProps, hasChildren, hasForwardRef } = options;
  
  let imports = [`import React`];
  if (hasForwardRef) {
    imports[0] += `, { forwardRef }`;
  }
  imports[0] += ` from 'react';`;
  
  if (hasProps || hasChildren) {
    imports.push(`import { cn } from '@/lib/utils';`);
  }
  
  let propsInterface = '';
  if (hasProps || hasChildren) {
    const props = [];
    if (hasProps) {
      props.push('  className?: string;');
    }
    if (hasChildren) {
      props.push('  children?: React.ReactNode;');
    }
    
    propsInterface = `
interface ${name}Props {
${props.join('\n')}
}
`;
  }
  
  const propsParam = (hasProps || hasChildren) ? `props: ${name}Props` : '';
  const destructuredProps = [];
  
  if (hasProps) destructuredProps.push('className');
  if (hasChildren) destructuredProps.push('children');
  
  const destructuring = destructuredProps.length > 0 
    ? `{ ${destructuredProps.join(', ')} }` 
    : 'props';
  
  const componentBody = hasChildren 
    ? `  return (
    <div${hasProps ? ' className={cn("", className)}' : ''}>
      {children}
    </div>
  );`
    : `  return (
    <div${hasProps ? ' className={cn("", className)}' : ''}>
      {/* Component content */}
    </div>
  );`;
  
  const componentDeclaration = hasForwardRef
    ? `const ${name} = forwardRef<HTMLDivElement, ${name}Props>(
  (${destructuring}, ref) => {
${componentBody}
  }
);

${name}.displayName = "${name}";`
    : `export function ${name}(${propsParam}) {
  ${destructuredProps.length > 0 ? `const ${destructuring} = props;` : ''}
${componentBody}
}`;
  
  return `${imports.join('\n')}
${propsInterface}
/**
 * ${name} component
 * 
 * @description A ${type} component for the Arketic platform
 */
${componentDeclaration}

export default ${name};
`;
}

/**
 * Generate test file content
 */
function generateTestContent(name) {
  return `import { render, screen } from '@testing-library/react';
import { ${name} } from './${name}';

describe('${name}', () => {
  it('renders without crashing', () => {
    render(<${name} />);
    expect(screen.getByRole('generic')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const customClass = 'custom-class';
    render(<${name} className={customClass} />);
    expect(screen.getByRole('generic')).toHaveClass(customClass);
  });

  it('renders children when provided', () => {
    const childText = 'Test child content';
    render(<${name}>{childText}</${name}>);
    expect(screen.getByText(childText)).toBeInTheDocument();
  });
});
`;
}

/**
 * Generate Storybook story content
 */
function generateStoryContent(name, type) {
  return `import type { Meta, StoryObj } from '@storybook/react';
import { ${name} } from './${name}';

const meta: Meta<typeof ${name}> = {
  title: '${type}/${name}',
  component: ${name},
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    className: {
      control: 'text',
      description: 'Additional CSS classes',
    },
    children: {
      control: 'text',
      description: 'Content to render inside the component',
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children: '${name} content',
  },
};

export const WithCustomClass: Story = {
  args: {
    className: 'custom-styling',
    children: '${name} with custom styling',
  },
};

export const Empty: Story = {
  args: {},
};
`;
}

/**
 * Generate index file content
 */
function generateIndexContent(name) {
  return `export { default as ${name} } from './${name}';
export type { ${name}Props } from './${name}';
`;
}

/**
 * Create component files
 */
async function createComponent(name, type, options) {
  const typeConfig = COMPONENT_TYPES[type];
  const componentDir = path.join(COMPONENTS_DIR, typeConfig.dir, name);
  
  // Check if component already exists
  if (fs.existsSync(componentDir)) {
    throw new Error(`Component ${name} already exists in ${componentDir}`);
  }
  
  // Create component directory
  fs.mkdirSync(componentDir, { recursive: true });
  
  const files = [];
  
  // Generate component file
  const componentContent = generateComponentContent(name, type, options);
  const componentFile = path.join(componentDir, `${name}.tsx`);
  fs.writeFileSync(componentFile, componentContent);
  files.push(componentFile);
  
  // Generate test file
  if (typeConfig.includeTests) {
    const testContent = generateTestContent(name);
    const testFile = path.join(componentDir, `${name}.test.tsx`);
    fs.writeFileSync(testFile, testContent);
    files.push(testFile);
  }
  
  // Generate story file
  if (typeConfig.includeStories) {
    const storyContent = generateStoryContent(name, typeConfig.dir);
    const storyFile = path.join(componentDir, `${name}.stories.tsx`);
    fs.writeFileSync(storyFile, storyContent);
    files.push(storyFile);
  }
  
  // Generate index file
  const indexContent = generateIndexContent(name);
  const indexFile = path.join(componentDir, 'index.ts');
  fs.writeFileSync(indexFile, indexContent);
  files.push(indexFile);
  
  return files;
}

/**
 * Update component index file
 */
function updateComponentIndex(type, name) {
  const typeConfig = COMPONENT_TYPES[type];
  const indexPath = path.join(COMPONENTS_DIR, typeConfig.dir, 'index.ts');
  
  let indexContent = '';
  if (fs.existsSync(indexPath)) {
    indexContent = fs.readFileSync(indexPath, 'utf8');
  }
  
  const exportLine = `export * from './${name}';`;
  
  if (!indexContent.includes(exportLine)) {
    indexContent += indexContent ? '\n' + exportLine : exportLine;
    fs.writeFileSync(indexPath, indexContent);
  }
}

/**
 * Main execution function
 */
async function main() {
  try {
    logger.info('React Component Generator');
    logger.info('========================');
    
    // Get component name
    let componentName;
    while (true) {
      componentName = await prompt('Component name (PascalCase): ');
      const nameError = validateComponentName(componentName);
      if (!nameError) break;
      logger.error(nameError);
    }
    
    // Get component type
    logger.info('\nAvailable component types:');
    Object.entries(COMPONENT_TYPES).forEach(([key, config]) => {
      logger.info(`  ${key}: ${config.description}`);
    });
    
    let componentType;
    while (true) {
      componentType = await prompt('\nComponent type: ');
      if (COMPONENT_TYPES[componentType]) break;
      logger.error('Invalid component type. Please choose from: ' + Object.keys(COMPONENT_TYPES).join(', '));
    }
    
    // Get component options
    const hasProps = (await prompt('Include props interface? (y/N): ')).toLowerCase() === 'y';
    const hasChildren = (await prompt('Include children prop? (y/N): ')).toLowerCase() === 'y';
    const hasForwardRef = (await prompt('Use forwardRef? (y/N): ')).toLowerCase() === 'y';
    
    const options = { hasProps, hasChildren, hasForwardRef };
    
    // Create component
    logger.info(`\nCreating ${componentType} component: ${componentName}...`);
    
    const files = await createComponent(componentName, componentType, options);
    updateComponentIndex(componentType, componentName);
    
    logger.success(`Component ${componentName} created successfully!`);
    logger.info('\nGenerated files:');
    files.forEach(file => logger.info(`  ${file}`));
    
    // Next steps
    logger.info('\nNext steps:');
    logger.info('1. Implement the component logic');
    logger.info('2. Add proper TypeScript types');
    logger.info('3. Write comprehensive tests');
    logger.info('4. Update component documentation');
    
    if (COMPONENT_TYPES[componentType].includeStories) {
      logger.info('5. Configure Storybook stories');
    }
    
  } catch (error) {
    logger.error(`Component generation failed: ${error.message}`);
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
  generateComponent: main,
  validateComponentName,
  COMPONENT_TYPES,
};