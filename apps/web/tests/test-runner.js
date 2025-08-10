#!/usr/bin/env node

/**
 * Comprehensive Test Runner for Arketic Web Application
 * 
 * This script orchestrates running all types of tests:
 * - Unit tests with Jest
 * - E2E tests with Playwright
 * - Visual regression tests
 * - Coverage reporting
 * 
 * Author: Claude
 * Created: 2025-08-10 (AR-83 Implementation)
 */

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// Configuration
const config = {
  jest: {
    coverage: process.env.COVERAGE !== 'false',
    watch: process.env.WATCH === 'true',
    verbose: process.env.VERBOSE === 'true'
  },
  playwright: {
    headed: process.env.HEADED === 'true',
    debug: process.env.DEBUG === 'true',
    browser: process.env.BROWSER || 'chromium'
  },
  reporting: {
    generateHtml: true,
    generateJson: true,
    mergeReports: true
  }
};

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  log(`\n${'='.repeat(60)}`, 'cyan');
  log(`  ${title}`, 'bright');
  log(`${'='.repeat(60)}`, 'cyan');
}

function logStep(step, status = 'info') {
  const statusSymbol = {
    info: '📋',
    success: '✅',
    error: '❌',
    warning: '⚠️'
  }[status] || '📋';
  
  log(`${statusSymbol} ${step}`, status === 'error' ? 'red' : 'reset');
}

// Ensure directories exist
function ensureDirectories() {
  const dirs = [
    'test-results',
    'coverage',
    'playwright-report',
    'test-results/screenshots',
    'test-results/videos'
  ];
  
  dirs.forEach(dir => {
    const fullPath = path.join(process.cwd(), dir);
    if (!fs.existsSync(fullPath)) {
      fs.mkdirSync(fullPath, { recursive: true });
    }
  });
}

// Clean previous test results
function cleanPreviousResults() {
  logStep('Cleaning previous test results...');
  
  try {
    const dirsToClean = ['test-results', 'coverage', 'playwright-report'];
    
    dirsToClean.forEach(dir => {
      const dirPath = path.join(process.cwd(), dir);
      if (fs.existsSync(dirPath)) {
        fs.rmSync(dirPath, { recursive: true, force: true });
      }
    });
    
    logStep('Previous results cleaned', 'success');
  } catch (error) {
    logStep(`Failed to clean previous results: ${error.message}`, 'warning');
  }
}

// Run Jest unit tests
async function runUnitTests() {
  logSection('RUNNING UNIT TESTS (Jest)');
  
  let jestCommand = 'npm test';
  
  if (config.jest.coverage) {
    jestCommand += ' -- --coverage';
  }
  
  if (config.jest.verbose) {
    jestCommand += ' --verbose';
  }
  
  if (config.jest.watch) {
    jestCommand += ' --watch';
  }
  
  try {
    logStep('Starting Jest test runner...');
    execSync(jestCommand, { 
      stdio: 'inherit',
      cwd: process.cwd()
    });
    logStep('Unit tests completed successfully', 'success');
    return { success: true };
  } catch (error) {
    logStep('Unit tests failed', 'error');
    return { success: false, error: error.message };
  }
}

// Run Playwright E2E tests
async function runE2ETests() {
  logSection('RUNNING E2E TESTS (Playwright)');
  
  let playwrightCommand = 'npx playwright test';
  
  if (config.playwright.headed) {
    playwrightCommand += ' --headed';
  }
  
  if (config.playwright.debug) {
    playwrightCommand += ' --debug';
  }
  
  if (config.playwright.browser !== 'all') {
    playwrightCommand += ` --project=${config.playwright.browser}`;
  }
  
  try {
    logStep('Starting Playwright test runner...');
    execSync(playwrightCommand, { 
      stdio: 'inherit',
      cwd: process.cwd()
    });
    logStep('E2E tests completed successfully', 'success');
    return { success: true };
  } catch (error) {
    logStep('E2E tests failed', 'error');
    return { success: false, error: error.message };
  }
}

// Run specific test suite
async function runSpecificTests(testType) {
  switch (testType) {
    case 'auth':
      return runPlaywrightSuite('tests/playwright/auth');
    case 'chat':
      return runPlaywrightSuite('tests/playwright/chat');
    case 'dashboard':
      return runPlaywrightSuite('tests/playwright/dashboard');
    case 'organization':
      return runPlaywrightSuite('tests/playwright/organization');
    case 'visual':
      return runPlaywrightSuite('tests/playwright/visual');
    case 'unit':
      return runUnitTests();
    default:
      logStep(`Unknown test type: ${testType}`, 'error');
      return { success: false };
  }
}

async function runPlaywrightSuite(suitePath) {
  logSection(`RUNNING PLAYWRIGHT SUITE: ${suitePath}`);
  
  try {
    logStep(`Running tests in ${suitePath}...`);
    execSync(`npx playwright test ${suitePath}`, { 
      stdio: 'inherit',
      cwd: process.cwd()
    });
    logStep('Suite completed successfully', 'success');
    return { success: true };
  } catch (error) {
    logStep('Suite failed', 'error');
    return { success: false, error: error.message };
  }
}

// Generate comprehensive test report
function generateTestReport(results) {
  logSection('GENERATING TEST REPORT');
  
  const reportData = {
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    results,
    summary: {
      totalSuites: results.length,
      passedSuites: results.filter(r => r.success).length,
      failedSuites: results.filter(r => !r.success).length,
      successRate: Math.round((results.filter(r => r.success).length / results.length) * 100)
    }
  };
  
  try {
    // Generate JSON report
    const jsonReport = path.join(process.cwd(), 'test-results', 'comprehensive-test-report.json');
    fs.writeFileSync(jsonReport, JSON.stringify(reportData, null, 2));
    logStep('JSON report generated', 'success');
    
    // Generate HTML summary
    const htmlReport = generateHtmlReport(reportData);
    const htmlPath = path.join(process.cwd(), 'test-results', 'test-summary.html');
    fs.writeFileSync(htmlPath, htmlReport);
    logStep('HTML summary generated', 'success');
    
    // Log summary to console
    logStep(`Test Summary: ${reportData.summary.passedSuites}/${reportData.summary.totalSuites} suites passed (${reportData.summary.successRate}%)`, 
            reportData.summary.successRate >= 80 ? 'success' : 'warning');
    
    return reportData;
  } catch (error) {
    logStep(`Failed to generate report: ${error.message}`, 'error');
    return null;
  }
}

function generateHtmlReport(reportData) {
  return `
<!DOCTYPE html>
<html>
<head>
    <title>Arketic Test Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; }
        .header { background: #f5f5f5; padding: 20px; border-radius: 5px; }
        .summary { display: flex; gap: 20px; margin: 20px 0; }
        .metric { background: #e8f4f8; padding: 15px; border-radius: 5px; text-align: center; flex: 1; }
        .metric.success { background: #d4edda; }
        .metric.warning { background: #fff3cd; }
        .metric.error { background: #f8d7da; }
        .results { margin: 20px 0; }
        .suite { margin: 10px 0; padding: 10px; border-left: 4px solid #ddd; }
        .suite.success { border-color: #28a745; }
        .suite.error { border-color: #dc3545; }
        .timestamp { color: #666; font-size: 0.9em; }
    </style>
</head>
<body>
    <div class="header">
        <h1>🧪 Arketic Test Report</h1>
        <p class="timestamp">Generated: ${reportData.timestamp}</p>
        <p>Environment: ${reportData.environment}</p>
    </div>
    
    <div class="summary">
        <div class="metric ${reportData.summary.successRate >= 80 ? 'success' : 'warning'}">
            <h3>Success Rate</h3>
            <p style="font-size: 2em; margin: 0;">${reportData.summary.successRate}%</p>
        </div>
        <div class="metric">
            <h3>Total Suites</h3>
            <p style="font-size: 2em; margin: 0;">${reportData.summary.totalSuites}</p>
        </div>
        <div class="metric success">
            <h3>Passed</h3>
            <p style="font-size: 2em; margin: 0;">${reportData.summary.passedSuites}</p>
        </div>
        <div class="metric error">
            <h3>Failed</h3>
            <p style="font-size: 2em; margin: 0;">${reportData.summary.failedSuites}</p>
        </div>
    </div>
    
    <div class="results">
        <h2>Test Suite Results</h2>
        ${reportData.results.map(result => `
            <div class="suite ${result.success ? 'success' : 'error'}">
                <h3>${result.name}</h3>
                <p>Status: ${result.success ? '✅ Passed' : '❌ Failed'}</p>
                ${result.error ? `<p style="color: #dc3545;">Error: ${result.error}</p>` : ''}
            </div>
        `).join('')}
    </div>
</body>
</html>`;
}

// Main execution function
async function main() {
  const args = process.argv.slice(2);
  const testType = args[0];
  
  logSection('ARKETIC TEST RUNNER');
  logStep('Initializing test environment...');
  
  // Clean and setup
  if (!config.jest.watch) {
    cleanPreviousResults();
  }
  ensureDirectories();
  
  let results = [];
  
  if (testType && testType !== 'all') {
    // Run specific test suite
    const result = await runSpecificTests(testType);
    results.push({ name: testType, ...result });
  } else {
    // Run all test suites
    logStep('Running comprehensive test suite...');
    
    // Run unit tests
    const unitResult = await runUnitTests();
    results.push({ name: 'Unit Tests (Jest)', ...unitResult });
    
    // Run E2E tests if unit tests pass or if forced
    if (unitResult.success || process.env.FORCE_E2E === 'true') {
      const e2eResult = await runE2ETests();
      results.push({ name: 'E2E Tests (Playwright)', ...e2eResult });
    } else {
      logStep('Skipping E2E tests due to unit test failures', 'warning');
      results.push({ name: 'E2E Tests (Playwright)', success: false, error: 'Skipped due to unit test failures' });
    }
  }
  
  // Generate comprehensive report
  if (!config.jest.watch) {
    generateTestReport(results);
  }
  
  // Exit with appropriate code
  const allPassed = results.every(r => r.success);
  process.exit(allPassed ? 0 : 1);
}

// Handle CLI arguments and help
function showHelp() {
  log('\n📋 Arketic Test Runner Usage:', 'bright');
  log('\nOptions:');
  log('  npm run test:all          - Run all tests (unit + e2e)');
  log('  npm run test:unit         - Run only unit tests');
  log('  npm run test:e2e          - Run only e2e tests');
  log('  npm run test:auth         - Run authentication tests');
  log('  npm run test:chat         - Run chat interface tests');
  log('  npm run test:dashboard    - Run dashboard tests');
  log('  npm run test:organization - Run organization tests');
  log('  npm run test:visual       - Run visual regression tests');
  log('\nEnvironment Variables:');
  log('  COVERAGE=false    - Disable coverage reporting');
  log('  WATCH=true        - Run in watch mode');
  log('  HEADED=true       - Run Playwright in headed mode');
  log('  DEBUG=true        - Run Playwright in debug mode');
  log('  BROWSER=firefox   - Specify browser for Playwright');
  log('  FORCE_E2E=true    - Run E2E tests even if unit tests fail');
  log('  VERBOSE=true      - Enable verbose output\n');
}

if (args.includes('--help') || args.includes('-h')) {
  showHelp();
  process.exit(0);
}

// Error handling
process.on('uncaughtException', (error) => {
  logStep(`Uncaught exception: ${error.message}`, 'error');
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logStep(`Unhandled rejection at: ${promise} reason: ${reason}`, 'error');
  process.exit(1);
});

// Run the main function
if (require.main === module) {
  main().catch(error => {
    logStep(`Test runner failed: ${error.message}`, 'error');
    process.exit(1);
  });
}

module.exports = { main, runUnitTests, runE2ETests, generateTestReport };