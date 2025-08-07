/**
 * Test 1: Docker Application Startup Test
 * 
 * This is the foundation test that:
 * 1. Stops all existing containers
 * 2. Starts fresh Docker environment with `docker compose up -d`
 * 3. Verifies all services start successfully
 * 4. Checks health status of all containers
 * 5. Tests basic connectivity between services
 * 
 * All subsequent tests will use the same Docker environment started here.
 */

const DockerManager = require('../utils/docker-manager');
const TestLogger = require('../utils/test-logger');
const TestUtilities = require('../utils/test-utilities');
const TEST_CONFIG = require('../config/test-config');

describe('Docker Application Startup Test', () => {
  let dockerManager;
  let logger;
  let testUtils;
  let testStartTime;

  beforeAll(async () => {
    testStartTime = Date.now();
    logger = new TestLogger();
    dockerManager = new DockerManager();
    testUtils = new TestUtilities(logger);
    
    logger.info('🚀 Starting Docker Application Startup Test Suite');
  }, 30000);

  afterAll(async () => {
    const duration = Date.now() - testStartTime;
    logger.info(`⏱️  Total test suite duration: ${testUtils.formatDuration(duration)}`);
  });

  describe('Phase 1: Environment Cleanup', () => {
    test('should stop all existing containers', async () => {
      logger.logTestStart('Stop all existing containers');
      const startTime = Date.now();
      
      try {
        await dockerManager.stopAllContainers();
        
        const duration = Date.now() - startTime;
        logger.logTestPass('Stop all existing containers', duration);
        
        // Verify no containers are running
        const { execSync } = require('child_process');
        const runningContainers = execSync('docker ps -q', { encoding: 'utf8' }).trim();
        expect(runningContainers).toBe('');
        
      } catch (error) {
        const duration = Date.now() - startTime;
        logger.logTestFail('Stop all existing containers', duration, error);
        throw error;
      }
    }, 30000);

    test('should clean up Docker resources', async () => {
      logger.logTestStart('Clean up Docker resources');
      const startTime = Date.now();
      
      try {
        await dockerManager.cleanup();
        
        const duration = Date.now() - startTime;
        logger.logTestPass('Clean up Docker resources', duration);
        
      } catch (error) {
        const duration = Date.now() - startTime;
        logger.logTestFail('Clean up Docker resources', duration, error);
        throw error;
      }
    }, 30000);
  });

  describe('Phase 2: Docker Compose Startup', () => {
    test('should start Docker Compose services', async () => {
      logger.logTestStart('Start Docker Compose services');
      const startTime = Date.now();
      
      try {
        await dockerManager.startDockerCompose();
        
        const duration = Date.now() - startTime;
        logger.logTestPass('Start Docker Compose services', duration);
        
        // Verify docker-compose.yml exists
        const fs = require('fs');
        expect(fs.existsSync(TEST_CONFIG.docker.composeFile)).toBe(true);
        
      } catch (error) {
        const duration = Date.now() - startTime;
        logger.logTestFail('Start Docker Compose services', duration, error);
        throw error;
      }
    }, 120000);

    test('should wait for all services to be healthy', async () => {
      logger.logTestStart('Wait for services to be healthy');
      const startTime = Date.now();
      
      try {
        await dockerManager.waitForHealthy();
        
        const duration = Date.now() - startTime;
        logger.logTestPass('Wait for services to be healthy', duration);
        
        // Mark Docker environment as ready for subsequent tests
        dockerManager.isRunning = true;
        
      } catch (error) {
        const duration = Date.now() - startTime;
        logger.logTestFail('Wait for services to be healthy', duration, error);
        
        // Log container statuses for debugging
        logger.error('Container status at failure:');
        const { execSync } = require('child_process');
        try {
          const status = execSync(`docker compose -p ${TEST_CONFIG.docker.projectName} ps`, { encoding: 'utf8' });
          logger.error(status);
        } catch (e) {
          logger.error('Could not get container status');
        }
        
        throw error;
      }
    }, 120000);
  });

  describe('Phase 3: Container Health Verification', () => {
    test('should verify PostgreSQL container is healthy', async () => {
      logger.logTestStart('Verify PostgreSQL container health');
      const startTime = Date.now();
      
      try {
        const { execSync } = require('child_process');
        const projectName = TEST_CONFIG.docker.projectName;
        
        // Check container status
        const status = execSync(`docker compose -p ${projectName} ps postgres --format json`, { encoding: 'utf8' });
        const container = JSON.parse(status);
        
        expect(container.State).toBe('running');
        expect(container.Health).toBe('healthy');
        
        const duration = Date.now() - startTime;
        logger.logTestPass('Verify PostgreSQL container health', duration);
        
      } catch (error) {
        const duration = Date.now() - startTime;
        logger.logTestFail('Verify PostgreSQL container health', duration, error);
        throw error;
      }
    }, 30000);

    test('should verify Redis container is healthy', async () => {
      logger.logTestStart('Verify Redis container health');
      const startTime = Date.now();
      
      try {
        const { execSync } = require('child_process');
        const projectName = TEST_CONFIG.docker.projectName;
        
        // Check container status
        const status = execSync(`docker compose -p ${projectName} ps redis --format json`, { encoding: 'utf8' });
        const container = JSON.parse(status);
        
        expect(container.State).toBe('running');
        expect(container.Health).toBe('healthy');
        
        const duration = Date.now() - startTime;
        logger.logTestPass('Verify Redis container health', duration);
        
      } catch (error) {
        const duration = Date.now() - startTime;
        logger.logTestFail('Verify Redis container health', duration, error);
        throw error;
      }
    }, 30000);

    test('should verify API container is healthy', async () => {
      logger.logTestStart('Verify API container health');
      const startTime = Date.now();
      
      try {
        const { execSync } = require('child_process');
        const projectName = TEST_CONFIG.docker.projectName;
        
        // Check container status
        const status = execSync(`docker compose -p ${projectName} ps api --format json`, { encoding: 'utf8' });
        const container = JSON.parse(status);
        
        expect(container.State).toBe('running');
        expect(container.Health).toBe('healthy');
        
        const duration = Date.now() - startTime;
        logger.logTestPass('Verify API container health', duration);
        
      } catch (error) {
        const duration = Date.now() - startTime;
        logger.logTestFail('Verify API container health', duration, error);
        throw error;
      }
    }, 30000);

    test('should verify Web container is healthy', async () => {
      logger.logTestStart('Verify Web container health');
      const startTime = Date.now();
      
      try {
        const { execSync } = require('child_process');
        const projectName = TEST_CONFIG.docker.projectName;
        
        // Check container status
        const status = execSync(`docker compose -p ${projectName} ps web --format json`, { encoding: 'utf8' });
        const container = JSON.parse(status);
        
        expect(container.State).toBe('running');
        expect(container.Health).toBe('healthy');
        
        const duration = Date.now() - startTime;
        logger.logTestPass('Verify Web container health', duration);
        
      } catch (error) {
        const duration = Date.now() - startTime;
        logger.logTestFail('Verify Web container health', duration, error);
        throw error;
      }
    }, 30000);

    test('should verify Nginx container is healthy', async () => {
      logger.logTestStart('Verify Nginx container health');
      const startTime = Date.now();
      
      try {
        const { execSync } = require('child_process');
        const projectName = TEST_CONFIG.docker.projectName;
        
        // Check container status
        const status = execSync(`docker compose -p ${projectName} ps nginx --format json`, { encoding: 'utf8' });
        const container = JSON.parse(status);
        
        expect(container.State).toBe('running');
        expect(container.Health).toBe('healthy');
        
        const duration = Date.now() - startTime;
        logger.logTestPass('Verify Nginx container health', duration);
        
      } catch (error) {
        const duration = Date.now() - startTime;
        logger.logTestFail('Verify Nginx container health', duration, error);
        throw error;
      }
    }, 30000);
  });

  describe('Phase 4: Basic Service Connectivity', () => {
    test('should connect to PostgreSQL database', async () => {
      logger.logTestStart('Connect to PostgreSQL database');
      const startTime = Date.now();
      
      try {
        const result = await testUtils.testDatabaseConnection();
        
        expect(result.success).toBe(true);
        expect(result.version).toContain('PostgreSQL');
        
        const duration = Date.now() - startTime;
        logger.logTestPass('Connect to PostgreSQL database', duration);
        logger.info(`Database version: ${result.version}`);
        
      } catch (error) {
        const duration = Date.now() - startTime;
        logger.logTestFail('Connect to PostgreSQL database', duration, error);
        throw error;
      }
    }, 30000);

    test('should connect to Redis cache', async () => {
      logger.logTestStart('Connect to Redis cache');
      const startTime = Date.now();
      
      try {
        const result = await testUtils.testRedisConnection();
        
        expect(result.success).toBe(true);
        expect(result.pong).toBe('PONG');
        
        const duration = Date.now() - startTime;
        logger.logTestPass('Connect to Redis cache', duration);
        logger.info('Redis connection successful');
        
      } catch (error) {
        const duration = Date.now() - startTime;
        logger.logTestFail('Connect to Redis cache', duration, error);
        throw error;
      }
    }, 30000);

    test('should access API health endpoint', async () => {
      logger.logTestStart('Access API health endpoint');
      const startTime = Date.now();
      
      try {
        const url = `${TEST_CONFIG.endpoints.api.baseUrl}${TEST_CONFIG.endpoints.api.healthEndpoint}`;
        const result = await testUtils.testHttpEndpoint(url, 200);
        
        expect(result.success).toBe(true);
        expect(result.status).toBe(200);
        
        const duration = Date.now() - startTime;
        logger.logTestPass('Access API health endpoint', duration);
        logger.logPerformance('API Health Check', 'response_time', result.duration, TEST_CONFIG.performance.apiResponseTime);
        
      } catch (error) {
        const duration = Date.now() - startTime;
        logger.logTestFail('Access API health endpoint', duration, error);
        throw error;
      }
    }, 30000);

    test('should access Web health endpoint', async () => {
      logger.logTestStart('Access Web health endpoint');
      const startTime = Date.now();
      
      try {
        const url = `${TEST_CONFIG.endpoints.web.baseUrl}${TEST_CONFIG.endpoints.web.healthEndpoint}`;
        const result = await testUtils.testHttpEndpoint(url, 200);
        
        expect(result.success).toBe(true);
        expect(result.status).toBe(200);
        
        const duration = Date.now() - startTime;
        logger.logTestPass('Access Web health endpoint', duration);
        logger.logPerformance('Web Health Check', 'response_time', result.duration, TEST_CONFIG.performance.webPageLoad);
        
      } catch (error) {
        const duration = Date.now() - startTime;
        logger.logTestFail('Access Web health endpoint', duration, error);
        throw error;
      }
    }, 30000);

    test('should access Nginx health endpoint', async () => {
      logger.logTestStart('Access Nginx health endpoint');
      const startTime = Date.now();
      
      try {
        const url = `${TEST_CONFIG.endpoints.nginx.baseUrl}${TEST_CONFIG.endpoints.nginx.healthEndpoint}`;
        const result = await testUtils.testHttpEndpoint(url, 200);
        
        expect(result.success).toBe(true);
        expect(result.status).toBe(200);
        
        const duration = Date.now() - startTime;
        logger.logTestPass('Access Nginx health endpoint', duration);
        logger.logPerformance('Nginx Health Check', 'response_time', result.duration, TEST_CONFIG.performance.apiResponseTime);
        
      } catch (error) {
        const duration = Date.now() - startTime;
        logger.logTestFail('Access Nginx health endpoint', duration, error);
        throw error;
      }
    }, 30000);
  });

  describe('Phase 5: Service Integration Verification', () => {
    test('should verify API can connect to database', async () => {
      logger.logTestStart('Verify API database connection');
      const startTime = Date.now();
      
      try {
        // Test API endpoint that requires database connection
        const result = await testUtils.makeRequest('GET', `${TEST_CONFIG.endpoints.api.baseUrl}/health`);
        
        expect(result.success).toBe(true);
        expect(result.data).toHaveProperty('database');
        expect(result.data.database).toBe('healthy');
        
        const duration = Date.now() - startTime;
        logger.logTestPass('Verify API database connection', duration);
        
      } catch (error) {
        const duration = Date.now() - startTime;
        logger.logTestFail('Verify API database connection', duration, error);
        throw error;
      }
    }, 30000);

    test('should verify API can connect to Redis', async () => {
      logger.logTestStart('Verify API Redis connection');
      const startTime = Date.now();
      
      try {
        // Test API endpoint that requires Redis connection
        const result = await testUtils.makeRequest('GET', `${TEST_CONFIG.endpoints.api.baseUrl}/health`);
        
        expect(result.success).toBe(true);
        expect(result.data).toHaveProperty('redis');
        expect(result.data.redis).toBe('healthy');
        
        const duration = Date.now() - startTime;
        logger.logTestPass('Verify API Redis connection', duration);
        
      } catch (error) {
        const duration = Date.now() - startTime;
        logger.logTestFail('Verify API Redis connection', duration, error);
        throw error;
      }
    }, 30000);

    test('should verify Web can connect to API', async () => {
      logger.logTestStart('Verify Web API connection');
      const startTime = Date.now();
      
      try {
        // Test Web health endpoint that should check API connectivity
        const result = await testUtils.makeRequest('GET', `${TEST_CONFIG.endpoints.web.baseUrl}/api/health`);
        
        expect(result.success).toBe(true);
        
        const duration = Date.now() - startTime;
        logger.logTestPass('Verify Web API connection', duration);
        
      } catch (error) {
        const duration = Date.now() - startTime;
        logger.logTestFail('Verify Web API connection', duration, error);
        throw error;
      }
    }, 30000);

    test('should verify Nginx can proxy to Web and API', async () => {
      logger.logTestStart('Verify Nginx proxy functionality');
      const startTime = Date.now();
      
      try {
        // Test Nginx proxying to web
        const webResult = await testUtils.makeRequest('GET', 'http://localhost:80');
        expect(webResult.success).toBe(true);
        
        // Test Nginx proxying to API
        const apiResult = await testUtils.makeRequest('GET', 'http://localhost:80/api/health');
        expect(apiResult.success).toBe(true);
        
        const duration = Date.now() - startTime;
        logger.logTestPass('Verify Nginx proxy functionality', duration);
        
      } catch (error) {
        const duration = Date.now() - startTime;
        logger.logTestFail('Verify Nginx proxy functionality', duration, error);
        throw error;
      }
    }, 30000);
  });

  describe('Phase 6: Environment Readiness Confirmation', () => {
    test('should log container resource usage', async () => {
      logger.logTestStart('Log container resource usage');
      const startTime = Date.now();
      
      try {
        const stats = await dockerManager.getContainerStats();
        logger.info('Container Resource Usage:');
        logger.info(stats);
        
        const duration = Date.now() - startTime;
        logger.logTestPass('Log container resource usage', duration);
        
      } catch (error) {
        const duration = Date.now() - startTime;
        logger.logTestFail('Log container resource usage', duration, error);
        // Don't fail the test for stats logging issues
      }
    }, 30000);

    test('should confirm Docker environment is ready for testing', async () => {
      logger.logTestStart('Confirm Docker environment readiness');
      const startTime = Date.now();
      
      try {
        // Verify all critical components are working
        expect(dockerManager.isRunning).toBe(true);
        
        // Final connectivity checks
        const dbCheck = await testUtils.testDatabaseConnection();
        const redisCheck = await testUtils.testRedisConnection();
        const apiCheck = await testUtils.testHttpEndpoint(`${TEST_CONFIG.endpoints.api.baseUrl}/health`);
        const webCheck = await testUtils.testHttpEndpoint(`${TEST_CONFIG.endpoints.web.baseUrl}/api/health`);
        
        expect(dbCheck.success).toBe(true);
        expect(redisCheck.success).toBe(true);
        expect(apiCheck.success).toBe(true);
        expect(webCheck.success).toBe(true);
        
        const duration = Date.now() - startTime;
        logger.logTestPass('Confirm Docker environment readiness', duration);
        
        logger.success('🎉 Docker environment is fully ready for comprehensive testing!');
        logger.info('All subsequent tests will use this Docker environment.');
        
      } catch (error) {
        const duration = Date.now() - startTime;
        logger.logTestFail('Confirm Docker environment readiness', duration, error);
        throw error;
      }
    }, 30000);
  });
});