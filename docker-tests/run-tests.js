#!/usr/bin/env node

/**
 * Docker-First Test Execution Script
 * 
 * This script orchestrates the execution of all Docker-first tests.
 * It ensures proper test ordering and environment management.
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const DockerManager = require('./utils/docker-manager');
const TestLogger = require('./utils/test-logger');
const TEST_CONFIG = require('./config/test-config');

class TestRunner {
  constructor() {
    this.logger = new TestLogger();
    this.dockerManager = new DockerManager();
    this.testResults = [];
    this.startTime = Date.now();
  }

  /**
   * Main test execution flow
   */
  async run() {
    try {
      this.logger.info('🚀 Starting Arketic Docker-First Test Suite');
      this.logger.info('================================================');
      
      // Check prerequisites
      await this.checkPrerequisites();
      
      // Execute tests in order
      await this.executeTestSuite();
      
      // Generate final report
      await this.generateFinalReport();
      
      // Clean up (optional)
      await this.cleanup();
      
      this.logger.success('✅ All tests completed successfully!');
      process.exit(0);
      
    } catch (error) {
      this.logger.error('❌ Test execution failed:', error);
      await this.handleFailure(error);
      process.exit(1);
    }
  }

  /**
   * Check prerequisites before running tests
   */
  async checkPrerequisites() {
    this.logger.info('🔍 Checking prerequisites...');
    
    // Check if Docker is installed and running
    try {
      const { execSync } = require('child_process');
      execSync('docker --version', { stdio: 'pipe' });
      execSync('docker compose version', { stdio: 'pipe' });
      this.logger.success('✅ Docker and Docker Compose are available');
    } catch (error) {
      throw new Error('Docker or Docker Compose is not installed or not running');
    }
    
    // Check if required files exist
    const requiredFiles = [
      TEST_CONFIG.docker.composeFile,
      path.join(__dirname, 'tests/01-docker-startup.test.js'),
      path.join(__dirname, 'tests/02-database-connectivity.test.js')
    ];
    
    for (const file of requiredFiles) {
      if (!fs.existsSync(file)) {
        throw new Error(`Required file not found: ${file}`);
      }
    }
    
    this.logger.success('✅ All prerequisites met');
  }

  /**
   * Execute the complete test suite
   */
  async executeTestSuite() {
    this.logger.info('🧪 Executing test suite...');
    
    // Define test execution order
    const testFiles = [
      {
        name: 'Docker Startup Test',
        file: '01-docker-startup.test.js',
        description: 'Verifies Docker environment startup and service health',
        required: true
      },
      {
        name: 'Database Connectivity Test', 
        file: '02-database-connectivity.test.js',
        description: 'Tests PostgreSQL and Redis connectivity and operations',
        required: true
      }
    ];
    
    for (const test of testFiles) {
      this.logger.info(`\n📋 Running: ${test.name}`);
      this.logger.info(`Description: ${test.description}`);
      this.logger.info('─'.repeat(60));
      
      const result = await this.runSingleTest(test);
      this.testResults.push(result);
      
      if (!result.success && test.required) {
        throw new Error(`Required test failed: ${test.name}`);
      }
    }
  }

  /**
   * Run a single test file
   */
  async runSingleTest(test) {
    const testStartTime = Date.now();
    const testPath = path.join(__dirname, 'tests', test.file);
    
    return new Promise((resolve) => {
      // Use Jest to run the test
      const jestCommand = 'npx';
      const jestArgs = [
        'jest',
        testPath,
        '--verbose',
        '--detectOpenHandles',
        '--forceExit',
        '--testTimeout=300000', // 5 minutes per test
        '--runInBand' // Run tests serially
      ];
      
      const testProcess = spawn(jestCommand, jestArgs, {
        stdio: ['inherit', 'pipe', 'pipe'],
        cwd: __dirname
      });
      
      let stdout = '';
      let stderr = '';
      
      testProcess.stdout.on('data', (data) => {
        const output = data.toString();
        stdout += output;
        process.stdout.write(output); // Real-time output
      });
      
      testProcess.stderr.on('data', (data) => {
        const output = data.toString();
        stderr += output;
        process.stderr.write(output); // Real-time output
      });
      
      testProcess.on('close', (code) => {
        const duration = Date.now() - testStartTime;
        const result = {
          name: test.name,
          file: test.file,
          success: code === 0,
          exitCode: code,
          duration,
          stdout,
          stderr
        };
        
        if (result.success) {
          this.logger.success(`✅ ${test.name} completed successfully (${this.formatDuration(duration)})`);
        } else {
          this.logger.error(`❌ ${test.name} failed with exit code ${code} (${this.formatDuration(duration)})`);
        }
        
        resolve(result);
      });
      
      testProcess.on('error', (error) => {
        const duration = Date.now() - testStartTime;
        this.logger.error(`❌ Failed to run ${test.name}:`, error);
        
        resolve({
          name: test.name,
          file: test.file,
          success: false,
          error: error.message,
          duration,
          stdout: '',
          stderr: error.message
        });
      });
    });
  }

  /**
   * Generate final test report
   */
  async generateFinalReport() {
    this.logger.info('\n📊 Generating final test report...');
    
    const totalDuration = Date.now() - this.startTime;
    const summary = {
      totalTests: this.testResults.length,
      passed: this.testResults.filter(r => r.success).length,
      failed: this.testResults.filter(r => !r.success).length,
      totalDuration,
      timestamp: new Date().toISOString()
    };
    
    // Console summary
    this.logger.info('\n🏆 TEST EXECUTION SUMMARY');
    this.logger.info('═'.repeat(50));
    this.logger.info(`Total Tests: ${summary.totalTests}`);
    this.logger.info(`Passed: ${summary.passed}`);
    this.logger.info(`Failed: ${summary.failed}`);
    this.logger.info(`Success Rate: ${((summary.passed / summary.totalTests) * 100).toFixed(1)}%`);
    this.logger.info(`Total Duration: ${this.formatDuration(totalDuration)}`);
    
    // Detailed results
    this.logger.info('\n📝 Detailed Results:');
    this.testResults.forEach(result => {
      const status = result.success ? '✅ PASS' : '❌ FAIL';
      const duration = this.formatDuration(result.duration);
      this.logger.info(`  ${status} ${result.name} (${duration})`);
      
      if (!result.success && result.error) {
        this.logger.error(`    Error: ${result.error}`);
      }
    });
    
    // Save detailed report to file
    const reportData = {
      summary,
      results: this.testResults,
      environment: {
        nodeVersion: process.version,
        platform: process.platform,
        architecture: process.arch,
        dockerComposeFile: TEST_CONFIG.docker.composeFile
      }
    };
    
    const reportsDir = path.join(__dirname, 'reports');
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }
    
    const reportFile = path.join(reportsDir, `test-report-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
    fs.writeFileSync(reportFile, JSON.stringify(reportData, null, 2));
    
    this.logger.info(`📄 Detailed report saved to: ${reportFile}`);
    
    // Generate Docker environment status
    await this.generateDockerStatus();
  }

  /**
   * Generate Docker environment status report
   */
  async generateDockerStatus() {
    this.logger.info('\n🐳 Docker Environment Status:');
    
    try {
      const stats = await this.dockerManager.getContainerStats();
      this.logger.info(stats);
      
      // Get container logs summary
      const services = TEST_CONFIG.docker.services;
      for (const service of services) {
        try {
          const logs = await this.dockerManager.getContainerLogs(service);
          const logLines = logs.split('\n').length;
          this.logger.info(`📄 ${service} logs: ${logLines} lines`);
        } catch (error) {
          this.logger.warn(`Could not get logs for ${service}`);
        }
      }
      
    } catch (error) {
      this.logger.warn('Could not get Docker status:', error.message);
    }
  }

  /**
   * Handle test execution failure
   */
  async handleFailure(error) {
    this.logger.error('\n💥 Test Execution Failed');
    this.logger.error('Error:', error.message);
    
    // Save failure report
    const failureReport = {
      error: error.message,
      stack: error.stack,
      completedTests: this.testResults,
      timestamp: new Date().toISOString()
    };
    
    const reportsDir = path.join(__dirname, 'reports');
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }
    
    const failureFile = path.join(reportsDir, `failure-report-${Date.now()}.json`);
    fs.writeFileSync(failureFile, JSON.stringify(failureReport, null, 2));
    
    this.logger.info(`💾 Failure report saved to: ${failureFile}`);
    
    // Optionally collect Docker logs for debugging
    await this.collectDebugLogs();
  }

  /**
   * Collect Docker logs for debugging
   */
  async collectDebugLogs() {
    this.logger.info('📋 Collecting Docker logs for debugging...');
    
    const logsDir = path.join(__dirname, 'debug-logs');
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }
    
    const services = TEST_CONFIG.docker.services;
    for (const service of services) {
      try {
        const logs = await this.dockerManager.getContainerLogs(service);
        const logFile = path.join(logsDir, `${service}-${Date.now()}.log`);
        fs.writeFileSync(logFile, logs);
        this.logger.info(`📄 ${service} logs saved to: ${logFile}`);
      } catch (error) {
        this.logger.warn(`Could not collect logs for ${service}`);
      }
    }
  }

  /**
   * Optional cleanup
   */
  async cleanup() {
    const cleanup = process.env.CLEANUP_AFTER_TESTS || 'false';
    
    if (cleanup.toLowerCase() === 'true') {
      this.logger.info('🧹 Cleaning up Docker environment...');
      await this.dockerManager.stopEnvironment();
    } else {
      this.logger.info('🐳 Docker environment left running (set CLEANUP_AFTER_TESTS=true to cleanup)');
      this.logger.info('To manually stop: docker compose down -v');
    }
  }

  /**
   * Utility method to format duration
   */
  formatDuration(ms) {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  }
}

// Handle command line execution
if (require.main === module) {
  const runner = new TestRunner();
  
  // Handle process signals
  process.on('SIGINT', async () => {
    console.log('\n🛑 Test execution interrupted');
    process.exit(1);
  });
  
  process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
  });
  
  // Start test execution
  runner.run().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = TestRunner;