/**
 * Docker-First Test Configuration
 * 
 * This configuration ensures all tests run against a controlled Docker environment.
 * Tests are executed in the order defined here to maintain dependency relationships.
 */

const path = require('path');
const fs = require('fs');

// Test configuration
const TEST_CONFIG = {
  // Docker configuration
  docker: {
    composeFile: path.join(__dirname, '../../docker-compose.yml'),
    projectName: 'arketic-test',
    services: ['postgres', 'redis', 'api', 'web', 'nginx'],
    healthCheckTimeout: 120000, // 2 minutes
    startupDelay: 10000, // 10 seconds after compose up
  },

  // Test execution configuration
  execution: {
    maxRetries: 3,
    testTimeout: 30000, // 30 seconds per test
    suiteTimeout: 600000, // 10 minutes total
    parallelTests: false, // Run tests sequentially for Docker stability
  },

  // Service endpoints (internal Docker network)
  endpoints: {
    postgres: {
      host: 'localhost',
      port: 5432,
      database: 'arketic_dev',
      username: 'arketic',
      password: 'arketic_dev_password',
    },
    redis: {
      host: 'localhost',
      port: 6379,
      password: '',
    },
    api: {
      baseUrl: 'http://localhost:8000',
      healthEndpoint: '/health',
    },
    web: {
      baseUrl: 'http://localhost:3000',
      healthEndpoint: '/api/health',
    },
    nginx: {
      baseUrl: 'http://localhost:80',
      healthEndpoint: '/health',
    },
  },

  // Test data configuration
  testData: {
    seedData: true,
    cleanupAfterTests: true,
    backupBeforeTests: false,
  },

  // Performance benchmarks
  performance: {
    apiResponseTime: 500, // 500ms max
    webPageLoad: 2000, // 2s max
    databaseQuery: 100, // 100ms max
    memoryUsage: 512, // 512MB max per service
  },

  // Logging configuration
  logging: {
    level: 'info',
    logFile: path.join(__dirname, '../logs/test-execution.log'),
    dockerLogs: true,
    retainLogs: true,
  },
};

module.exports = TEST_CONFIG;