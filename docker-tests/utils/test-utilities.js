/**
 * Test Utilities
 * 
 * Common utilities for Docker-first testing
 */

const axios = require('axios');
const { Client } = require('pg');
const redis = require('redis');
const TEST_CONFIG = require('../config/test-config');

class TestUtilities {
  constructor(logger) {
    this.logger = logger;
    this.axiosInstance = axios.create({
      timeout: 10000,
      validateStatus: () => true // Don't throw on HTTP errors
    });
  }

  /**
   * Database utilities
   */
  async createDbConnection() {
    const config = TEST_CONFIG.endpoints.postgres;
    const client = new Client({
      host: config.host,
      port: config.port,
      database: config.database,
      user: config.username,
      password: config.password,
    });
    
    await client.connect();
    return client;
  }

  async testDatabaseConnection() {
    let client;
    try {
      client = await this.createDbConnection();
      const result = await client.query('SELECT version()');
      return { success: true, version: result.rows[0].version };
    } catch (error) {
      return { success: false, error: error.message };
    } finally {
      if (client) {
        await client.end();
      }
    }
  }

  async executeDbQuery(query, params = []) {
    let client;
    try {
      client = await this.createDbConnection();
      const result = await client.query(query, params);
      return { success: true, result };
    } catch (error) {
      return { success: false, error: error.message };
    } finally {
      if (client) {
        await client.end();
      }
    }
  }

  /**
   * Redis utilities
   */
  async createRedisConnection() {
    const config = TEST_CONFIG.endpoints.redis;
    const client = redis.createClient({
      host: config.host,
      port: config.port,
      password: config.password || undefined,
    });
    
    await client.connect();
    return client;
  }

  async testRedisConnection() {
    let client;
    try {
      client = await this.createRedisConnection();
      const pong = await client.ping();
      const info = await client.info('server');
      return { success: true, pong, info };
    } catch (error) {
      return { success: false, error: error.message };
    } finally {
      if (client) {
        await client.quit();
      }
    }
  }

  /**
   * HTTP utilities
   */
  async makeRequest(method, url, data = null, headers = {}) {
    const startTime = Date.now();
    
    try {
      const response = await this.axiosInstance({
        method,
        url,
        data,
        headers
      });
      
      const duration = Date.now() - startTime;
      
      return {
        success: response.status >= 200 && response.status < 300,
        status: response.status,
        data: response.data,
        headers: response.headers,
        duration
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      return {
        success: false,
        error: error.message,
        duration
      };
    }
  }

  async testHttpEndpoint(url, expectedStatus = 200) {
    const result = await this.makeRequest('GET', url);
    
    return {
      success: result.success && result.status === expectedStatus,
      status: result.status,
      duration: result.duration,
      error: result.error
    };
  }

  /**
   * Performance utilities
   */
  async measureResponseTime(url, iterations = 5) {
    const times = [];
    
    for (let i = 0; i < iterations; i++) {
      const result = await this.makeRequest('GET', url);
      if (result.success) {
        times.push(result.duration);
      }
    }
    
    if (times.length === 0) {
      return { success: false, error: 'No successful requests' };
    }
    
    const average = times.reduce((a, b) => a + b, 0) / times.length;
    const min = Math.min(...times);
    const max = Math.max(...times);
    
    return {
      success: true,
      average,
      min,
      max,
      samples: times.length
    };
  }

  async loadTest(url, concurrent = 10, requests = 100) {
    const startTime = Date.now();
    const promises = [];
    
    // Create batches of concurrent requests
    for (let i = 0; i < requests; i += concurrent) {
      const batch = [];
      for (let j = 0; j < concurrent && (i + j) < requests; j++) {
        batch.push(this.makeRequest('GET', url));
      }
      
      const batchResults = await Promise.all(batch);
      promises.push(...batchResults);
      
      // Small delay between batches to prevent overwhelming
      await this.sleep(100);
    }
    
    const results = promises;
    const successful = results.filter(r => r.success).length;
    const failed = results.length - successful;
    const totalDuration = Date.now() - startTime;
    const averageResponseTime = results
      .filter(r => r.success)
      .reduce((sum, r) => sum + r.duration, 0) / successful;
    
    return {
      totalRequests: requests,
      successful,
      failed,
      totalDuration,
      averageResponseTime,
      requestsPerSecond: (successful / totalDuration) * 1000
    };
  }

  /**
   * Data utilities
   */
  generateTestData(type, count = 1) {
    const generators = {
      user: () => ({
        name: `Test User ${Math.random().toString(36).substring(7)}`,
        email: `test${Math.random().toString(36).substring(7)}@example.com`,
        role: 'user',
        created_at: new Date().toISOString()
      }),
      
      organization: () => ({
        name: `Test Org ${Math.random().toString(36).substring(7)}`,
        description: 'Test organization description',
        type: 'company',
        created_at: new Date().toISOString()
      }),
      
      compliance: () => ({
        standard: 'ISO 27001',
        clause: `A.${Math.floor(Math.random() * 20) + 1}.${Math.floor(Math.random() * 10) + 1}`,
        description: 'Test compliance requirement',
        status: 'compliant',
        created_at: new Date().toISOString()
      })
    };
    
    const generator = generators[type];
    if (!generator) {
      throw new Error(`Unknown test data type: ${type}`);
    }
    
    return Array.from({ length: count }, generator);
  }

  /**
   * Validation utilities
   */
  validateResponse(response, schema) {
    const errors = [];
    
    if (schema.status && response.status !== schema.status) {
      errors.push(`Expected status ${schema.status}, got ${response.status}`);
    }
    
    if (schema.headers) {
      Object.entries(schema.headers).forEach(([key, value]) => {
        if (!response.headers[key] || response.headers[key] !== value) {
          errors.push(`Expected header ${key}: ${value}, got ${response.headers[key]}`);
        }
      });
    }
    
    if (schema.body && typeof schema.body === 'object') {
      const missingFields = Object.keys(schema.body).filter(key => 
        !(key in response.data)
      );
      if (missingFields.length > 0) {
        errors.push(`Missing required fields: ${missingFields.join(', ')}`);
      }
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Retry utilities
   */
  async retry(fn, maxAttempts = 3, delay = 1000) {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await fn();
      } catch (error) {
        if (attempt === maxAttempts) {
          throw error;
        }
        
        this.logger.warn(`Attempt ${attempt} failed, retrying in ${delay}ms: ${error.message}`);
        await this.sleep(delay);
        delay *= 2; // Exponential backoff
      }
    }
  }

  /**
   * Utility methods
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  formatDuration(ms) {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  }
}

module.exports = TestUtilities;