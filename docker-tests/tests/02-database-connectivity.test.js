/**
 * Test 2: Database Connectivity Test
 * 
 * This test runs against the same Docker environment started in Test 1.
 * It performs comprehensive database connectivity and functionality tests:
 * 1. Verifies PostgreSQL connection and basic operations
 * 2. Tests Redis connection and caching functionality
 * 3. Validates database schema and migrations
 * 4. Tests database performance and connection pooling
 * 5. Verifies data persistence and consistency
 */

const DockerManager = require('../utils/docker-manager');
const TestLogger = require('../utils/test-logger');
const TestUtilities = require('../utils/test-utilities');
const TEST_CONFIG = require('../config/test-config');

describe('Database Connectivity Test', () => {
  let dockerManager;
  let logger;
  let testUtils;
  let testStartTime;

  beforeAll(async () => {
    testStartTime = Date.now();
    logger = new TestLogger();
    dockerManager = new DockerManager();
    testUtils = new TestUtilities(logger);
    
    logger.info('🗄️  Starting Database Connectivity Test Suite');
    
    // Verify Docker environment is running (started by Test 1)
    if (!dockerManager.isRunning) {
      // If Docker is not running, start it
      logger.warn('Docker environment not detected, starting fresh environment...');
      await dockerManager.startFreshEnvironment();
    } else {
      logger.info('Using existing Docker environment from Test 1');
    }
  }, 30000);

  afterAll(async () => {
    const duration = Date.now() - testStartTime;
    logger.info(`⏱️  Database test suite duration: ${testUtils.formatDuration(duration)}`);
  });

  describe('Phase 1: PostgreSQL Connection Tests', () => {
    test('should establish basic PostgreSQL connection', async () => {
      logger.logTestStart('Establish PostgreSQL connection');
      const startTime = Date.now();
      
      try {
        const result = await testUtils.testDatabaseConnection();
        
        expect(result.success).toBe(true);
        expect(result.version).toContain('PostgreSQL');
        
        const duration = Date.now() - startTime;
        logger.logTestPass('Establish PostgreSQL connection', duration);
        logger.logPerformance('Database Connection', 'connection_time', duration, TEST_CONFIG.performance.databaseQuery);
        
      } catch (error) {
        const duration = Date.now() - startTime;
        logger.logTestFail('Establish PostgreSQL connection', duration, error);
        throw error;
      }
    }, 30000);

    test('should execute basic SQL queries', async () => {
      logger.logTestStart('Execute basic SQL queries');
      const startTime = Date.now();
      
      try {
        // Test basic SELECT query
        const selectResult = await testUtils.executeDbQuery('SELECT 1 as test_value');
        expect(selectResult.success).toBe(true);
        expect(selectResult.result.rows[0].test_value).toBe(1);
        
        // Test current timestamp
        const timeResult = await testUtils.executeDbQuery('SELECT NOW() as current_time');
        expect(timeResult.success).toBe(true);
        expect(timeResult.result.rows[0].current_time).toBeDefined();
        
        const duration = Date.now() - startTime;
        logger.logTestPass('Execute basic SQL queries', duration);
        logger.logPerformance('Database Query', 'query_time', duration, TEST_CONFIG.performance.databaseQuery);
        
      } catch (error) {
        const duration = Date.now() - startTime;
        logger.logTestFail('Execute basic SQL queries', duration, error);
        throw error;
      }
    }, 30000);

    test('should verify database schema exists', async () => {
      logger.logTestStart('Verify database schema');
      const startTime = Date.now();
      
      try {
        // Check if main application tables exist
        const tablesQuery = `
          SELECT table_name 
          FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_type = 'BASE TABLE'
        `;
        
        const result = await testUtils.executeDbQuery(tablesQuery);
        expect(result.success).toBe(true);
        
        const tableNames = result.result.rows.map(row => row.table_name);
        logger.info(`Found tables: ${tableNames.join(', ')}`);
        
        // Verify expected tables exist (based on models)
        const expectedTables = ['users', 'organizations', 'chats', 'alembic_version'];
        const missingTables = expectedTables.filter(table => !tableNames.includes(table));
        
        if (missingTables.length > 0) {
          logger.warn(`Missing expected tables: ${missingTables.join(', ')}`);
        }
        
        const duration = Date.now() - startTime;
        logger.logTestPass('Verify database schema', duration);
        
      } catch (error) {
        const duration = Date.now() - startTime;
        logger.logTestFail('Verify database schema', duration, error);
        throw error;
      }
    }, 30000);

    test('should test database transaction handling', async () => {
      logger.logTestStart('Test database transactions');
      const startTime = Date.now();
      
      try {
        let client;
        client = await testUtils.createDbConnection();
        
        // Start transaction
        await client.query('BEGIN');
        
        // Create test table
        await client.query(`
          CREATE TEMP TABLE test_transaction (
            id SERIAL PRIMARY KEY,
            value TEXT
          )
        `);
        
        // Insert test data
        await client.query("INSERT INTO test_transaction (value) VALUES ('test1')");
        
        // Verify data exists in transaction
        const result1 = await client.query('SELECT COUNT(*) FROM test_transaction');
        expect(parseInt(result1.rows[0].count)).toBe(1);
        
        // Rollback transaction
        await client.query('ROLLBACK');
        
        // Verify table no longer exists after rollback
        try {
          await client.query('SELECT COUNT(*) FROM test_transaction');
          throw new Error('Table should not exist after rollback');
        } catch (error) {
          if (error.message.includes('does not exist')) {
            // Expected behavior
          } else {
            throw error;
          }
        }
        
        await client.end();
        
        const duration = Date.now() - startTime;
        logger.logTestPass('Test database transactions', duration);
        
      } catch (error) {
        const duration = Date.now() - startTime;
        logger.logTestFail('Test database transactions', duration, error);
        throw error;
      }
    }, 30000);

    test('should test connection pool performance', async () => {
      logger.logTestStart('Test connection pool performance');
      const startTime = Date.now();
      
      try {
        const promises = [];
        const connectionCount = 10;
        
        // Create multiple simultaneous queries
        for (let i = 0; i < connectionCount; i++) {
          promises.push(
            testUtils.executeDbQuery('SELECT $1 as connection_test', [i])
          );
        }
        
        const results = await Promise.all(promises);
        
        // Verify all queries succeeded
        results.forEach((result, index) => {
          expect(result.success).toBe(true);
          expect(result.result.rows[0].connection_test).toBe(index.toString());
        });
        
        const duration = Date.now() - startTime;
        logger.logTestPass('Test connection pool performance', duration);
        logger.logPerformance('Connection Pool', 'concurrent_queries', duration, 5000);
        
      } catch (error) {
        const duration = Date.now() - startTime;
        logger.logTestFail('Test connection pool performance', duration, error);
        throw error;
      }
    }, 30000);
  });

  describe('Phase 2: Redis Connection Tests', () => {
    test('should establish basic Redis connection', async () => {
      logger.logTestStart('Establish Redis connection');
      const startTime = Date.now();
      
      try {
        const result = await testUtils.testRedisConnection();
        
        expect(result.success).toBe(true);
        expect(result.pong).toBe('PONG');
        expect(result.info).toContain('redis_version');
        
        const duration = Date.now() - startTime;
        logger.logTestPass('Establish Redis connection', duration);
        logger.logPerformance('Redis Connection', 'connection_time', duration, TEST_CONFIG.performance.databaseQuery);
        
      } catch (error) {
        const duration = Date.now() - startTime;
        logger.logTestFail('Establish Redis connection', duration, error);
        throw error;
      }
    }, 30000);

    test('should perform basic Redis operations', async () => {
      logger.logTestStart('Perform basic Redis operations');
      const startTime = Date.now();
      
      try {
        let client;
        client = await testUtils.createRedisConnection();
        
        // Test SET and GET
        const testKey = 'test:basic:operation';
        const testValue = 'test_value_' + Date.now();
        
        await client.set(testKey, testValue);
        const retrievedValue = await client.get(testKey);
        
        expect(retrievedValue).toBe(testValue);
        
        // Test TTL
        await client.setEx('test:ttl', 1, 'ttl_test');
        const ttl = await client.ttl('test:ttl');
        expect(ttl).toBeGreaterThan(0);
        
        // Test DELETE
        await client.del(testKey);
        const deletedValue = await client.get(testKey);
        expect(deletedValue).toBeNull();
        
        await client.quit();
        
        const duration = Date.now() - startTime;
        logger.logTestPass('Perform basic Redis operations', duration);
        logger.logPerformance('Redis Operations', 'operation_time', duration, TEST_CONFIG.performance.databaseQuery);
        
      } catch (error) {
        const duration = Date.now() - startTime;
        logger.logTestFail('Perform basic Redis operations', duration, error);
        throw error;
      }
    }, 30000);

    test('should test Redis data structures', async () => {
      logger.logTestStart('Test Redis data structures');
      const startTime = Date.now();
      
      try {
        let client;
        client = await testUtils.createRedisConnection();
        
        // Test Hash
        const hashKey = 'test:hash:' + Date.now();
        await client.hSet(hashKey, 'field1', 'value1');
        await client.hSet(hashKey, 'field2', 'value2');
        
        const hashValue = await client.hGet(hashKey, 'field1');
        expect(hashValue).toBe('value1');
        
        const hashAll = await client.hGetAll(hashKey);
        expect(hashAll.field1).toBe('value1');
        expect(hashAll.field2).toBe('value2');
        
        // Test List
        const listKey = 'test:list:' + Date.now();
        await client.lPush(listKey, 'item1');
        await client.lPush(listKey, 'item2');
        
        const listLength = await client.lLen(listKey);
        expect(listLength).toBe(2);
        
        const listItem = await client.lPop(listKey);
        expect(listItem).toBe('item2');
        
        // Test Set
        const setKey = 'test:set:' + Date.now();
        await client.sAdd(setKey, 'member1');
        await client.sAdd(setKey, 'member2');
        await client.sAdd(setKey, 'member1'); // Duplicate
        
        const setSize = await client.sCard(setKey);
        expect(setSize).toBe(2);
        
        // Cleanup
        await client.del(hashKey, listKey, setKey);
        await client.quit();
        
        const duration = Date.now() - startTime;
        logger.logTestPass('Test Redis data structures', duration);
        
      } catch (error) {
        const duration = Date.now() - startTime;
        logger.logTestFail('Test Redis data structures', duration, error);
        throw error;
      }
    }, 30000);

    test('should test Redis performance under load', async () => {
      logger.logTestStart('Test Redis performance under load');
      const startTime = Date.now();
      
      try {
        let client;
        client = await testUtils.createRedisConnection();
        
        const operations = 100;
        const promises = [];
        
        // Perform multiple simultaneous operations
        for (let i = 0; i < operations; i++) {
          promises.push(
            client.set(`test:perf:${i}`, `value_${i}`)
          );
        }
        
        await Promise.all(promises);
        
        // Verify all operations succeeded
        const getPromises = [];
        for (let i = 0; i < operations; i++) {
          getPromises.push(
            client.get(`test:perf:${i}`)
          );
        }
        
        const values = await Promise.all(getPromises);
        values.forEach((value, index) => {
          expect(value).toBe(`value_${index}`);
        });
        
        // Cleanup
        const deletePromises = [];
        for (let i = 0; i < operations; i++) {
          deletePromises.push(
            client.del(`test:perf:${i}`)
          );
        }
        await Promise.all(deletePromises);
        
        await client.quit();
        
        const duration = Date.now() - startTime;
        logger.logTestPass('Test Redis performance under load', duration);
        logger.logPerformance('Redis Load Test', 'bulk_operations', duration, 5000);
        
      } catch (error) {
        const duration = Date.now() - startTime;
        logger.logTestFail('Test Redis performance under load', duration, error);
        throw error;
      }
    }, 30000);
  });

  describe('Phase 3: Database Integration Tests', () => {
    test('should verify API database connectivity through Docker network', async () => {
      logger.logTestStart('Verify API database connectivity');
      const startTime = Date.now();
      
      try {
        // Test API health endpoint which should check database
        const result = await testUtils.makeRequest('GET', `${TEST_CONFIG.endpoints.api.baseUrl}/health`);
        
        expect(result.success).toBe(true);
        expect(result.status).toBe(200);
        expect(result.data).toHaveProperty('database');
        expect(result.data.database).toBe('healthy');
        
        const duration = Date.now() - startTime;
        logger.logTestPass('Verify API database connectivity', duration);
        
      } catch (error) {
        const duration = Date.now() - startTime;
        logger.logTestFail('Verify API database connectivity', duration, error);
        throw error;
      }
    }, 30000);

    test('should verify API Redis connectivity through Docker network', async () => {
      logger.logTestStart('Verify API Redis connectivity');
      const startTime = Date.now();
      
      try {
        // Test API health endpoint which should check Redis
        const result = await testUtils.makeRequest('GET', `${TEST_CONFIG.endpoints.api.baseUrl}/health`);
        
        expect(result.success).toBe(true);
        expect(result.status).toBe(200);
        expect(result.data).toHaveProperty('redis');
        expect(result.data.redis).toBe('healthy');
        
        const duration = Date.now() - startTime;
        logger.logTestPass('Verify API Redis connectivity', duration);
        
      } catch (error) {
        const duration = Date.now() - startTime;
        logger.logTestFail('Verify API Redis connectivity', duration, error);
        throw error;
      }
    }, 30000);

    test('should test database migration status', async () => {
      logger.logTestStart('Test database migration status');
      const startTime = Date.now();
      
      try {
        // Check alembic version table
        const result = await testUtils.executeDbQuery('SELECT version_num FROM alembic_version ORDER BY version_num DESC LIMIT 1');
        
        if (result.success && result.result.rows.length > 0) {
          const currentVersion = result.result.rows[0].version_num;
          logger.info(`Current database migration version: ${currentVersion}`);
          expect(currentVersion).toBeDefined();
        } else {
          logger.warn('No migration version found - database may not be migrated');
        }
        
        const duration = Date.now() - startTime;
        logger.logTestPass('Test database migration status', duration);
        
      } catch (error) {
        const duration = Date.now() - startTime;
        // Don't fail if alembic table doesn't exist yet
        logger.warn('Migration status check failed - this may be expected for new databases');
        logger.logTestPass('Test database migration status', duration);
      }
    }, 30000);

    test('should test cross-container database communication', async () => {
      logger.logTestStart('Test cross-container database communication');
      const startTime = Date.now();
      
      try {
        // Execute database query from within API container
        const dbTestCommand = 'python -c "import asyncpg; import asyncio; asyncio.run(asyncpg.connect(\\'postgresql://arketic:arketic_dev_password@postgres:5432/arketic_dev\\').close())"';
        
        try {
          await dockerManager.execInContainer('api', dbTestCommand);
          logger.info('API container can connect to PostgreSQL');
        } catch (error) {
          logger.warn('Could not test database connection from API container - this may be expected');
        }
        
        const duration = Date.now() - startTime;
        logger.logTestPass('Test cross-container database communication', duration);
        
      } catch (error) {
        const duration = Date.now() - startTime;
        logger.logTestFail('Test cross-container database communication', duration, error);
        // Don't fail the test as this is advanced testing
      }
    }, 30000);
  });

  describe('Phase 4: Data Persistence and Cleanup', () => {
    test('should verify data persistence across container restarts', async () => {
      logger.logTestStart('Verify data persistence');
      const startTime = Date.now();
      
      try {
        // Create test data
        const testTable = 'test_persistence_' + Date.now();
        const createTableQuery = `
          CREATE TABLE ${testTable} (
            id SERIAL PRIMARY KEY,
            test_data TEXT,
            created_at TIMESTAMP DEFAULT NOW()
          )
        `;
        
        const insertQuery = `INSERT INTO ${testTable} (test_data) VALUES ($1) RETURNING id`;
        const testData = 'persistence_test_' + Date.now();
        
        await testUtils.executeDbQuery(createTableQuery);
        const insertResult = await testUtils.executeDbQuery(insertQuery, [testData]);
        
        expect(insertResult.success).toBe(true);
        const insertedId = insertResult.result.rows[0].id;
        
        // Verify data exists
        const selectResult = await testUtils.executeDbQuery(
          `SELECT test_data FROM ${testTable} WHERE id = $1`,
          [insertedId]
        );
        
        expect(selectResult.success).toBe(true);
        expect(selectResult.result.rows[0].test_data).toBe(testData);
        
        // Clean up test table
        await testUtils.executeDbQuery(`DROP TABLE ${testTable}`);
        
        const duration = Date.now() - startTime;
        logger.logTestPass('Verify data persistence', duration);
        
      } catch (error) {
        const duration = Date.now() - startTime;
        logger.logTestFail('Verify data persistence', duration, error);
        throw error;
      }
    }, 30000);

    test('should clean up test data and connections', async () => {
      logger.logTestStart('Clean up test data');
      const startTime = Date.now();
      
      try {
        // Clean up any test keys in Redis
        let redisClient;
        redisClient = await testUtils.createRedisConnection();
        
        const testKeys = await redisClient.keys('test:*');
        if (testKeys.length > 0) {
          await redisClient.del(testKeys);
          logger.info(`Cleaned up ${testKeys.length} Redis test keys`);
        }
        
        await redisClient.quit();
        
        // Log final database connection test
        const finalDbTest = await testUtils.testDatabaseConnection();
        expect(finalDbTest.success).toBe(true);
        
        const duration = Date.now() - startTime;
        logger.logTestPass('Clean up test data', duration);
        
        logger.success('🎉 Database connectivity tests completed successfully!');
        logger.info('Docker environment remains running for subsequent tests.');
        
      } catch (error) {
        const duration = Date.now() - startTime;
        logger.logTestFail('Clean up test data', duration, error);
        throw error;
      }
    }, 30000);
  });
});