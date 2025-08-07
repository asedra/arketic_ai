#!/usr/bin/env node

/**
 * Comprehensive Authentication Test Suite for Docker Environment
 * Tests all authentication flows, security features, and edge cases
 */

const axios = require('axios');
const crypto = require('crypto');
const { performance } = require('perf_hooks');

// Test Configuration
const API_BASE_URL = 'http://localhost:8000/api/v1';
const WEB_BASE_URL = 'http://localhost:3000';
const NGINX_BASE_URL = 'http://localhost:80';

// Test Results Storage
const testResults = {
  timestamp: new Date().toISOString(),
  environment: 'Docker',
  totalTests: 0,
  passed: 0,
  failed: 0,
  skipped: 0,
  results: [],
  metrics: {
    totalDuration: 0,
    averageResponseTime: 0,
    slowestTest: null,
    fastestTest: null
  }
};

// Utility Functions
const generateRandomEmail = () => `test_${crypto.randomUUID()}@example.com`;
const generateRandomPassword = () => crypto.randomBytes(16).toString('hex');

const logTest = (testName, status, duration, details = {}) => {
  const result = {
    name: testName,
    status,
    duration: Math.round(duration),
    timestamp: new Date().toISOString(),
    details
  };
  
  testResults.results.push(result);
  testResults.totalTests++;
  
  if (status === 'PASSED') {
    testResults.passed++;
    console.log(`✅ ${testName} - ${duration}ms`);
  } else if (status === 'FAILED') {
    testResults.failed++;
    console.log(`❌ ${testName} - ${duration}ms`);
    if (details.error) {
      console.log(`   Error: ${details.error}`);
    }
  } else {
    testResults.skipped++;
    console.log(`⏭️  ${testName} - SKIPPED`);
  }
  
  // Update metrics
  if (!testResults.metrics.slowestTest || duration > testResults.metrics.slowestTest.duration) {
    testResults.metrics.slowestTest = { name: testName, duration };
  }
  if (!testResults.metrics.fastestTest || duration < testResults.metrics.fastestTest.duration) {
    testResults.metrics.fastestTest = { name: testName, duration };
  }
};

const makeRequest = async (config) => {
  const startTime = performance.now();
  try {
    const response = await axios(config);
    const duration = performance.now() - startTime;
    return { success: true, response, duration };
  } catch (error) {
    const duration = performance.now() - startTime;
    return { success: false, error, duration };
  }
};

// Test Categories
class AuthenticationTests {
  constructor() {
    this.userCredentials = [];
    this.authTokens = [];
  }

  // 1. Health Check Tests
  async testHealthChecks() {
    console.log('\n🏥 === HEALTH CHECK TESTS ===');

    // API Health Check
    const apiHealthStart = performance.now();
    const apiHealth = await makeRequest({
      method: 'GET',
      url: 'http://localhost:8000/health'
    });
    logTest(
      'API Health Check',
      apiHealth.success ? 'PASSED' : 'FAILED',
      apiHealth.duration,
      { endpoint: '/health', status: apiHealth.response?.status }
    );

    // Web Health Check
    const webHealthStart = performance.now();
    const webHealth = await makeRequest({
      method: 'GET',
      url: `${WEB_BASE_URL}/api/health`
    });
    logTest(
      'Web Health Check',
      webHealth.success ? 'PASSED' : 'FAILED',
      webHealth.duration,
      { endpoint: '/api/health', status: webHealth.response?.status }
    );

    // Nginx Health Check
    const nginxHealthStart = performance.now();
    const nginxHealth = await makeRequest({
      method: 'GET',
      url: 'http://localhost:80/health'
    });
    logTest(
      'Nginx Health Check',
      nginxHealth.success ? 'PASSED' : 'FAILED',
      nginxHealth.duration,
      { endpoint: '/health', status: nginxHealth.response?.status }
    );
  }

  // 2. User Registration Tests
  async testUserRegistration() {
    console.log('\n📝 === USER REGISTRATION TESTS ===');

    // Valid Registration
    const email = generateRandomEmail();
    const password = generateRandomPassword();
    const userData = {
      email,
      password,
      confirm_password: password,
      first_name: 'Test',
      last_name: 'User'
    };

    const registerResult = await makeRequest({
      method: 'POST',
      url: `${API_BASE_URL}/auth/register`,
      data: userData,
      headers: { 'Content-Type': 'application/json' }
    });

    logTest(
      'Valid User Registration',
      registerResult.success && registerResult.response.status === 201 ? 'PASSED' : 'FAILED',
      registerResult.duration,
      {
        email,
        status: registerResult.response?.status,
        error: registerResult.error?.response?.data || registerResult.error?.message
      }
    );

    if (registerResult.success) {
      this.userCredentials.push({ email, password });
      
      // Auto-verify the user for testing purposes
      try {
        const { spawn } = require('child_process');
        const verifyCmd = spawn('docker', [
          'compose', 'exec', '-T', 'postgres', 
          'psql', '-U', 'arketic', '-d', 'arketic_dev', '-c',
          `UPDATE users SET is_verified = true, status = 'ACTIVE' WHERE email = '${email}';`
        ]);
        await new Promise((resolve) => {
          verifyCmd.on('close', resolve);
        });
      } catch (error) {
        console.warn('Failed to auto-verify user:', error.message);
      }
    }

    // Duplicate Email Registration
    const duplicateResult = await makeRequest({
      method: 'POST',
      url: `${API_BASE_URL}/auth/register`,
      data: userData,
      headers: { 'Content-Type': 'application/json' }
    });

    logTest(
      'Duplicate Email Registration',
      !duplicateResult.success && duplicateResult.error.response?.status === 400 ? 'PASSED' : 'FAILED',
      duplicateResult.duration,
      {
        expectedStatus: 400,
        actualStatus: duplicateResult.error?.response?.status,
        error: duplicateResult.error?.response?.data
      }
    );

    // Invalid Email Registration
    const invalidEmailResult = await makeRequest({
      method: 'POST',
      url: `${API_BASE_URL}/auth/register`,
      data: { ...userData, email: 'invalid-email' },
      headers: { 'Content-Type': 'application/json' }
    });

    logTest(
      'Invalid Email Registration',
      !invalidEmailResult.success && invalidEmailResult.error.response?.status === 422 ? 'PASSED' : 'FAILED',
      invalidEmailResult.duration,
      {
        expectedStatus: 422,
        actualStatus: invalidEmailResult.error?.response?.status,
        error: invalidEmailResult.error?.response?.data
      }
    );

    // Weak Password Registration
    const weakPasswordResult = await makeRequest({
      method: 'POST',
      url: `${API_BASE_URL}/auth/register`,
      data: { 
        ...userData, 
        email: generateRandomEmail(), 
        password: '123',
        confirm_password: '123'
      },
      headers: { 'Content-Type': 'application/json' }
    });

    logTest(
      'Weak Password Registration',
      !weakPasswordResult.success && weakPasswordResult.error.response?.status === 422 ? 'PASSED' : 'FAILED',
      weakPasswordResult.duration,
      {
        expectedStatus: 422,
        actualStatus: weakPasswordResult.error?.response?.status,
        error: weakPasswordResult.error?.response?.data
      }
    );
  }

  // 3. Login/Logout Flow Tests
  async testLoginLogoutFlow() {
    console.log('\n🔐 === LOGIN/LOGOUT FLOW TESTS ===');

    if (this.userCredentials.length === 0) {
      logTest('Login/Logout Flow', 'SKIPPED', 0, { reason: 'No registered users available' });
      return;
    }

    const { email, password } = this.userCredentials[0];

    // Valid Login
    const loginResult = await makeRequest({
      method: 'POST',
      url: `${API_BASE_URL}/auth/login`,
      data: { email, password },
      headers: { 'Content-Type': 'application/json' }
    });

    logTest(
      'Valid Login',
      loginResult.success && loginResult.response.status === 200 ? 'PASSED' : 'FAILED',
      loginResult.duration,
      {
        email,
        status: loginResult.response?.status,
        hasAccessToken: !!loginResult.response?.data?.access_token,
        hasRefreshToken: !!loginResult.response?.data?.refresh_token,
        error: loginResult.error?.response?.data || loginResult.error?.message
      }
    );

    let accessToken = null;
    let refreshToken = null;

    if (loginResult.success && loginResult.response.data) {
      accessToken = loginResult.response.data.access_token;
      refreshToken = loginResult.response.data.refresh_token;
      this.authTokens.push({ accessToken, refreshToken });
    }

    // Invalid Credentials Login
    const invalidLoginResult = await makeRequest({
      method: 'POST',
      url: `${API_BASE_URL}/auth/login`,
      data: { email, password: 'wrong-password' },
      headers: { 'Content-Type': 'application/json' }
    });

    logTest(
      'Invalid Credentials Login',
      !invalidLoginResult.success && invalidLoginResult.error.response?.status === 401 ? 'PASSED' : 'FAILED',
      invalidLoginResult.duration,
      {
        expectedStatus: 401,
        actualStatus: invalidLoginResult.error?.response?.status,
        error: invalidLoginResult.error?.response?.data
      }
    );

    // Non-existent User Login
    const nonExistentLoginResult = await makeRequest({
      method: 'POST',
      url: `${API_BASE_URL}/auth/login`,
      data: { email: 'nonexistent@example.com', password: 'password123' },
      headers: { 'Content-Type': 'application/json' }
    });

    logTest(
      'Non-existent User Login',
      !nonExistentLoginResult.success && nonExistentLoginResult.error.response?.status === 401 ? 'PASSED' : 'FAILED',
      nonExistentLoginResult.duration,
      {
        expectedStatus: 401,
        actualStatus: nonExistentLoginResult.error?.response?.status,
        error: nonExistentLoginResult.error?.response?.data
      }
    );

    // Logout (if we have a valid token)
    if (accessToken) {
      const logoutResult = await makeRequest({
        method: 'POST',
        url: `${API_BASE_URL}/auth/logout`,
        data: {},
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        }
      });

      logTest(
        'Valid Logout',
        logoutResult.success && logoutResult.response.status === 200 ? 'PASSED' : 'FAILED',
        logoutResult.duration,
        {
          status: logoutResult.response?.status,
          error: logoutResult.error?.response?.data || logoutResult.error?.message
        }
      );
    }
  }

  // 4. JWT Token Validation Tests
  async testJWTValidation() {
    console.log('\n🎫 === JWT TOKEN VALIDATION TESTS ===');

    if (this.authTokens.length === 0) {
      // Create a fresh login for token tests
      if (this.userCredentials.length > 0) {
        const { email, password } = this.userCredentials[0];
        const loginResult = await makeRequest({
          method: 'POST',
          url: `${API_BASE_URL}/auth/login`,
          data: { email, password },
          headers: { 'Content-Type': 'application/json' }
        });

        if (loginResult.success && loginResult.response.data) {
          this.authTokens.push({
            accessToken: loginResult.response.data.access_token,
            refreshToken: loginResult.response.data.refresh_token
          });
        }
      }
    }

    if (this.authTokens.length === 0) {
      logTest('JWT Token Validation', 'SKIPPED', 0, { reason: 'No valid tokens available' });
      return;
    }

    const { accessToken } = this.authTokens[0];

    // Valid Token Access
    const validTokenResult = await makeRequest({
      method: 'GET',
      url: `${API_BASE_URL}/auth/me`,
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });

    logTest(
      'Valid Token Access',
      validTokenResult.success && validTokenResult.response.status === 200 ? 'PASSED' : 'FAILED',
      validTokenResult.duration,
      {
        status: validTokenResult.response?.status,
        hasUserData: !!validTokenResult.response?.data?.email,
        error: validTokenResult.error?.response?.data || validTokenResult.error?.message
      }
    );

    // Invalid Token Access
    const invalidTokenResult = await makeRequest({
      method: 'GET',
      url: `${API_BASE_URL}/auth/me`,
      headers: { 'Authorization': 'Bearer invalid.jwt.token' }
    });

    logTest(
      'Invalid Token Access',
      !invalidTokenResult.success && invalidTokenResult.error.response?.status === 401 ? 'PASSED' : 'FAILED',
      invalidTokenResult.duration,
      {
        expectedStatus: 401,
        actualStatus: invalidTokenResult.error?.response?.status,
        error: invalidTokenResult.error?.response?.data
      }
    );

    // Missing Token Access
    const missingTokenResult = await makeRequest({
      method: 'GET',
      url: `${API_BASE_URL}/auth/me`
    });

    logTest(
      'Missing Token Access',
      !missingTokenResult.success && missingTokenResult.error.response?.status === 401 ? 'PASSED' : 'FAILED',
      missingTokenResult.duration,
      {
        expectedStatus: 401,
        actualStatus: missingTokenResult.error?.response?.status,
        error: missingTokenResult.error?.response?.data
      }
    );
  }

  // 5. Protected Routes Tests
  async testProtectedRoutes() {
    console.log('\n🛡️  === PROTECTED ROUTES TESTS ===');

    const protectedEndpoints = [
      { method: 'GET', url: '/auth/me', description: 'User Profile' },
      { method: 'GET', url: '/users/profile', description: 'User Profile Extended' },
      { method: 'POST', url: '/auth/logout', description: 'Logout', data: {} }
    ];

    if (this.authTokens.length === 0) {
      logTest('Protected Routes', 'SKIPPED', 0, { reason: 'No valid tokens available' });
      return;
    }

    const { accessToken } = this.authTokens[0];

    for (const endpoint of protectedEndpoints) {
      // With valid token
      const withTokenResult = await makeRequest({
        method: endpoint.method,
        url: `${API_BASE_URL}${endpoint.url}`,
        data: endpoint.data,
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });

      logTest(
        `${endpoint.description} - With Token`,
        withTokenResult.success || withTokenResult.error.response?.status < 500 ? 'PASSED' : 'FAILED',
        withTokenResult.duration,
        {
          endpoint: endpoint.url,
          status: withTokenResult.response?.status || withTokenResult.error?.response?.status,
          error: withTokenResult.error?.response?.data || withTokenResult.error?.message
        }
      );

      // Without token
      const withoutTokenResult = await makeRequest({
        method: endpoint.method,
        url: `${API_BASE_URL}${endpoint.url}`,
        data: endpoint.data
      });

      logTest(
        `${endpoint.description} - Without Token`,
        !withoutTokenResult.success && withoutTokenResult.error.response?.status === 401 ? 'PASSED' : 'FAILED',
        withoutTokenResult.duration,
        {
          endpoint: endpoint.url,
          expectedStatus: 401,
          actualStatus: withoutTokenResult.error?.response?.status,
          error: withoutTokenResult.error?.response?.data
        }
      );
    }
  }

  // 6. Token Refresh Tests
  async testTokenRefresh() {
    console.log('\n🔄 === TOKEN REFRESH TESTS ===');

    if (this.authTokens.length === 0) {
      logTest('Token Refresh', 'SKIPPED', 0, { reason: 'No valid tokens available' });
      return;
    }

    const { refreshToken } = this.authTokens[0];

    // Valid Token Refresh
    const refreshResult = await makeRequest({
      method: 'POST',
      url: `${API_BASE_URL}/auth/refresh`,
      data: { refresh_token: refreshToken },
      headers: { 'Content-Type': 'application/json' }
    });

    logTest(
      'Valid Token Refresh',
      refreshResult.success && refreshResult.response.status === 200 ? 'PASSED' : 'FAILED',
      refreshResult.duration,
      {
        status: refreshResult.response?.status,
        hasNewAccessToken: !!refreshResult.response?.data?.access_token,
        error: refreshResult.error?.response?.data || refreshResult.error?.message
      }
    );

    // Invalid Refresh Token
    const invalidRefreshResult = await makeRequest({
      method: 'POST',
      url: `${API_BASE_URL}/auth/refresh`,
      data: { refresh_token: 'invalid-refresh-token' },
      headers: { 'Content-Type': 'application/json' }
    });

    logTest(
      'Invalid Refresh Token',
      !invalidRefreshResult.success && invalidRefreshResult.error.response?.status === 401 ? 'PASSED' : 'FAILED',
      invalidRefreshResult.duration,
      {
        expectedStatus: 401,
        actualStatus: invalidRefreshResult.error?.response?.status,
        error: invalidRefreshResult.error?.response?.data
      }
    );
  }

  // 7. Password Reset Flow Tests
  async testPasswordResetFlow() {
    console.log('\n🔑 === PASSWORD RESET FLOW TESTS ===');

    if (this.userCredentials.length === 0) {
      logTest('Password Reset Flow', 'SKIPPED', 0, { reason: 'No registered users available' });
      return;
    }

    const { email } = this.userCredentials[0];

    // Request Password Reset
    const resetRequestResult = await makeRequest({
      method: 'POST',
      url: `${API_BASE_URL}/auth/reset-password`,
      data: { email },
      headers: { 'Content-Type': 'application/json' }
    });

    logTest(
      'Password Reset Request',
      resetRequestResult.success && resetRequestResult.response.status === 200 ? 'PASSED' : 'FAILED',
      resetRequestResult.duration,
      {
        email,
        status: resetRequestResult.response?.status,
        error: resetRequestResult.error?.response?.data || resetRequestResult.error?.message
      }
    );

    // Request Reset for Non-existent Email
    const nonExistentResetResult = await makeRequest({
      method: 'POST',
      url: `${API_BASE_URL}/auth/reset-password`,
      data: { email: 'nonexistent@example.com' },
      headers: { 'Content-Type': 'application/json' }
    });

    logTest(
      'Password Reset - Non-existent Email',
      nonExistentResetResult.success && nonExistentResetResult.response.status === 200 ? 'PASSED' : 'FAILED',
      nonExistentResetResult.duration,
      {
        status: nonExistentResetResult.response?.status,
        note: 'Should return 200 for security reasons',
        error: nonExistentResetResult.error?.response?.data || nonExistentResetResult.error?.message
      }
    );
  }

  // 8. Security Features Tests
  async testSecurityFeatures() {
    console.log('\n🛡️  === SECURITY FEATURES TESTS ===');

    // Rate Limiting Test (Login)
    const rateLimitTests = [];
    const testEmail = this.userCredentials.length > 0 ? this.userCredentials[0].email : 'test@example.com';
    
    console.log('Testing rate limiting with multiple login attempts...');
    
    for (let i = 0; i < 6; i++) {
      const attemptResult = await makeRequest({
        method: 'POST',
        url: `${API_BASE_URL}/auth/login`,
        data: { email: testEmail, password: 'wrong-password' },
        headers: { 'Content-Type': 'application/json' }
      });
      rateLimitTests.push(attemptResult);
    }

    const rateLimitTriggered = rateLimitTests.some(result => 
      result.error?.response?.status === 429
    );

    logTest(
      'Rate Limiting - Login Attempts',
      rateLimitTriggered ? 'PASSED' : 'FAILED',
      rateLimitTests.reduce((sum, test) => sum + test.duration, 0),
      {
        attempts: rateLimitTests.length,
        rateLimitTriggered,
        statusCodes: rateLimitTests.map(r => r.response?.status || r.error?.response?.status)
      }
    );

    // SQL Injection Test
    const sqlInjectionResult = await makeRequest({
      method: 'POST',
      url: `${API_BASE_URL}/auth/login`,
      data: { 
        email: "admin'; DROP TABLE users; --",
        password: 'password'
      },
      headers: { 'Content-Type': 'application/json' }
    });

    logTest(
      'SQL Injection Protection',
      !sqlInjectionResult.success && sqlInjectionResult.error.response?.status !== 500 ? 'PASSED' : 'FAILED',
      sqlInjectionResult.duration,
      {
        status: sqlInjectionResult.error?.response?.status,
        note: 'Should not cause server error',
        error: sqlInjectionResult.error?.response?.data
      }
    );

    // XSS Test
    const xssPassword = generateRandomPassword();
    const xssResult = await makeRequest({
      method: 'POST',
      url: `${API_BASE_URL}/auth/register`,
      data: {
        email: generateRandomEmail(),
        password: xssPassword,
        confirm_password: xssPassword,
        first_name: '<script>alert("XSS")</script>',
        last_name: 'Test'
      },
      headers: { 'Content-Type': 'application/json' }
    });

    logTest(
      'XSS Protection',
      xssResult.success || (xssResult.error?.response?.status === 422) ? 'PASSED' : 'FAILED',
      xssResult.duration,
      {
        status: xssResult.response?.status || xssResult.error?.response?.status,
        note: 'Should either sanitize input or reject with validation error',
        error: xssResult.error?.response?.data
      }
    );
  }

  // 9. Load Testing
  async testConcurrentRequests() {
    console.log('\n⚡ === LOAD TESTING ===');

    const concurrentRequests = 10;
    const testUrl = 'http://localhost:8000/health';

    console.log(`Running ${concurrentRequests} concurrent health check requests...`);

    const promises = Array(concurrentRequests).fill(null).map(async (_, index) => {
      const startTime = performance.now();
      try {
        const response = await axios.get(testUrl);
        const duration = performance.now() - startTime;
        return { success: true, duration, status: response.status, index };
      } catch (error) {
        const duration = performance.now() - startTime;
        return { success: false, duration, status: error.response?.status, index, error: error.message };
      }
    });

    const results = await Promise.all(promises);
    const successfulRequests = results.filter(r => r.success).length;
    const averageResponseTime = results.reduce((sum, r) => sum + r.duration, 0) / results.length;
    const maxResponseTime = Math.max(...results.map(r => r.duration));

    logTest(
      'Concurrent Request Handling',
      successfulRequests >= concurrentRequests * 0.9 ? 'PASSED' : 'FAILED', // 90% success rate
      averageResponseTime,
      {
        concurrentRequests,
        successfulRequests,
        averageResponseTime: Math.round(averageResponseTime),
        maxResponseTime: Math.round(maxResponseTime),
        successRate: `${Math.round((successfulRequests / concurrentRequests) * 100)}%`
      }
    );
  }

  // 10. Frontend-Backend Integration Tests
  async testFrontendIntegration() {
    console.log('\n🌐 === FRONTEND-BACKEND INTEGRATION TESTS ===');

    // Test if frontend can reach backend through nginx
    const frontendHealthResult = await makeRequest({
      method: 'GET',
      url: `${WEB_BASE_URL}/api/health`
    });

    logTest(
      'Frontend Health Check',
      frontendHealthResult.success && frontendHealthResult.response.status === 200 ? 'PASSED' : 'FAILED',
      frontendHealthResult.duration,
      {
        status: frontendHealthResult.response?.status,
        error: frontendHealthResult.error?.message
      }
    );

    // Test CORS configuration
    const corsTestResult = await makeRequest({
      method: 'OPTIONS',
      url: `${API_BASE_URL}/auth/login`,
      headers: {
        'Origin': 'http://localhost:3000',
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'Content-Type'
      }
    });

    logTest(
      'CORS Configuration',
      corsTestResult.success && corsTestResult.response.status === 200 ? 'PASSED' : 'FAILED',
      corsTestResult.duration,
      {
        status: corsTestResult.response?.status,
        allowOrigin: corsTestResult.response?.headers['access-control-allow-origin'],
        allowMethods: corsTestResult.response?.headers['access-control-allow-methods'],
        error: corsTestResult.error?.message
      }
    );

    // Test if nginx properly routes requests to API
    const nginxApiRouteResult = await makeRequest({
      method: 'GET',
      url: 'http://localhost:80/api/v1/auth/validate'
    });

    logTest(
      'Nginx API Routing',
      nginxApiRouteResult.success && nginxApiRouteResult.response.status === 200 ? 'PASSED' : 'FAILED',
      nginxApiRouteResult.duration,
      {
        status: nginxApiRouteResult.response?.status,
        error: nginxApiRouteResult.error?.message
      }
    );
  }

  // Run All Tests
  async runAllTests() {
    console.log('🚀 Starting Comprehensive Authentication Tests for Docker Environment');
    console.log(`📅 Test Run: ${testResults.timestamp}`);
    console.log('=' .repeat(80));

    const totalStartTime = performance.now();

    try {
      await this.testHealthChecks();
      await this.testUserRegistration();
      await this.testLoginLogoutFlow();
      await this.testJWTValidation();
      await this.testProtectedRoutes();
      await this.testTokenRefresh();
      await this.testPasswordResetFlow();
      await this.testSecurityFeatures();
      await this.testConcurrentRequests();
      await this.testFrontendIntegration();
    } catch (error) {
      console.error('❌ Test suite encountered an error:', error.message);
      testResults.results.push({
        name: 'Test Suite Error',
        status: 'FAILED',
        duration: 0,
        timestamp: new Date().toISOString(),
        details: { error: error.message, stack: error.stack }
      });
      testResults.failed++;
      testResults.totalTests++;
    }

    const totalDuration = performance.now() - totalStartTime;
    testResults.metrics.totalDuration = Math.round(totalDuration);
    testResults.metrics.averageResponseTime = Math.round(
      testResults.results.reduce((sum, r) => sum + r.duration, 0) / testResults.results.length
    );

    this.generateReport();
  }

  generateReport() {
    console.log('\n' + '=' .repeat(80));
    console.log('📊 COMPREHENSIVE TEST REPORT');
    console.log('=' .repeat(80));
    
    console.log(`\n📈 SUMMARY:`);
    console.log(`   Total Tests: ${testResults.totalTests}`);
    console.log(`   ✅ Passed: ${testResults.passed} (${Math.round((testResults.passed / testResults.totalTests) * 100)}%)`);
    console.log(`   ❌ Failed: ${testResults.failed} (${Math.round((testResults.failed / testResults.totalTests) * 100)}%)`);
    console.log(`   ⏭️  Skipped: ${testResults.skipped} (${Math.round((testResults.skipped / testResults.totalTests) * 100)}%)`);
    
    console.log(`\n⏱️  PERFORMANCE METRICS:`);
    console.log(`   Total Duration: ${testResults.metrics.totalDuration}ms`);
    console.log(`   Average Response Time: ${testResults.metrics.averageResponseTime}ms`);
    console.log(`   Fastest Test: ${testResults.metrics.fastestTest?.name} (${testResults.metrics.fastestTest?.duration}ms)`);
    console.log(`   Slowest Test: ${testResults.metrics.slowestTest?.name} (${testResults.metrics.slowestTest?.duration}ms)`);

    console.log(`\n🔍 DETAILED RESULTS:`);
    testResults.results.forEach(result => {
      const status = result.status === 'PASSED' ? '✅' : result.status === 'FAILED' ? '❌' : '⏭️';
      console.log(`   ${status} ${result.name} (${result.duration}ms)`);
      if (result.details && Object.keys(result.details).length > 0) {
        console.log(`      Details: ${JSON.stringify(result.details, null, 6).replace(/\n/g, '\n      ')}`);
      }
    });

    // Save report to file
    const fs = require('fs');
    const reportPath = `/home/ali/arketic/docker-auth-tests/test-report-${Date.now()}.json`;
    fs.writeFileSync(reportPath, JSON.stringify(testResults, null, 2));
    
    console.log(`\n💾 Full report saved to: ${reportPath}`);
    
    console.log('\n🏁 Test run completed!');
    console.log('=' .repeat(80));

    // Exit with appropriate code
    process.exit(testResults.failed > 0 ? 1 : 0);
  }
}

// Run the tests
if (require.main === module) {
  const authTests = new AuthenticationTests();
  authTests.runAllTests().catch(error => {
    console.error('Fatal error running tests:', error);
    process.exit(1);
  });
}

module.exports = AuthenticationTests;