/**
 * Test Logger
 * 
 * Provides structured logging for Docker-first tests
 */

const fs = require('fs');
const path = require('path');
const TEST_CONFIG = require('../config/test-config');

class TestLogger {
  constructor() {
    this.logFile = TEST_CONFIG.logging.logFile;
    this.logLevel = TEST_CONFIG.logging.level;
    this.startTime = Date.now();
    
    // Ensure log directory exists
    const logDir = path.dirname(this.logFile);
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
    
    // Initialize log file
    this.writeLog('INFO', 'Test session started');
  }

  /**
   * Write log entry
   */
  writeLog(level, message, data = null) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      message,
      elapsed: Date.now() - this.startTime,
      data
    };
    
    // Console output
    const colorCode = this.getColorCode(level);
    console.log(`${colorCode}[${level}]${this.getColorCode('RESET')} ${message}`);
    
    // File output
    fs.appendFileSync(this.logFile, JSON.stringify(logEntry) + '\n');
  }

  /**
   * Get ANSI color codes
   */
  getColorCode(level) {
    const colors = {
      INFO: '\x1b[36m',    // Cyan
      SUCCESS: '\x1b[32m', // Green
      WARN: '\x1b[33m',    // Yellow
      ERROR: '\x1b[31m',   // Red
      DEBUG: '\x1b[37m',   // White
      RESET: '\x1b[0m'     // Reset
    };
    return colors[level] || colors.RESET;
  }

  /**
   * Log methods
   */
  info(message, data = null) {
    this.writeLog('INFO', message, data);
  }

  success(message, data = null) {
    this.writeLog('SUCCESS', message, data);
  }

  warn(message, data = null) {
    this.writeLog('WARN', message, data);
  }

  error(message, data = null) {
    this.writeLog('ERROR', message, data);
  }

  debug(message, data = null) {
    if (this.logLevel === 'debug') {
      this.writeLog('DEBUG', message, data);
    }
  }

  /**
   * Log test results
   */
  logTestStart(testName) {
    this.info(`🧪 Starting test: ${testName}`);
  }

  logTestPass(testName, duration) {
    this.success(`✅ Test passed: ${testName} (${duration}ms)`);
  }

  logTestFail(testName, duration, error) {
    this.error(`❌ Test failed: ${testName} (${duration}ms)`, { error: error.message });
  }

  logTestSkip(testName, reason) {
    this.warn(`⏭️  Test skipped: ${testName} - ${reason}`);
  }

  /**
   * Log Docker operations
   */
  logDockerStart() {
    this.info('🐳 Starting Docker environment...');
  }

  logDockerReady() {
    this.success('✅ Docker environment ready');
  }

  logDockerStop() {
    this.info('🛑 Stopping Docker environment...');
  }

  logDockerError(error) {
    this.error('❌ Docker operation failed', { error: error.message });
  }

  /**
   * Log performance data
   */
  logPerformance(testName, metric, value, threshold) {
    const status = value <= threshold ? 'PASS' : 'FAIL';
    const color = status === 'PASS' ? 'SUCCESS' : 'ERROR';
    
    this.writeLog(color, `📊 Performance: ${testName} - ${metric}: ${value}ms (threshold: ${threshold}ms)`, {
      test: testName,
      metric,
      value,
      threshold,
      status
    });
  }

  /**
   * Generate test summary
   */
  generateSummary(testResults) {
    const summary = {
      total: testResults.length,
      passed: testResults.filter(r => r.status === 'pass').length,
      failed: testResults.filter(r => r.status === 'fail').length,
      skipped: testResults.filter(r => r.status === 'skip').length,
      duration: Date.now() - this.startTime
    };
    
    this.info('📋 Test Summary:', summary);
    
    // Write detailed summary to file
    const summaryFile = this.logFile.replace('.log', '-summary.json');
    fs.writeFileSync(summaryFile, JSON.stringify({
      summary,
      results: testResults
    }, null, 2));
    
    return summary;
  }

  /**
   * Clean up old log files
   */
  cleanup() {
    const logDir = path.dirname(this.logFile);
    const files = fs.readdirSync(logDir);
    const logFiles = files.filter(f => f.endsWith('.log') || f.endsWith('-summary.json'));
    
    // Keep only the last 10 log files
    if (logFiles.length > 10) {
      const sortedFiles = logFiles
        .map(f => ({ name: f, time: fs.statSync(path.join(logDir, f)).mtime }))
        .sort((a, b) => b.time - a.time);
      
      const filesToDelete = sortedFiles.slice(10);
      filesToDelete.forEach(f => {
        fs.unlinkSync(path.join(logDir, f.name));
      });
    }
  }
}

module.exports = TestLogger;