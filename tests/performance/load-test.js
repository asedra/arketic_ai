import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

// Define error rate metric
const errorRate = new Rate('errors');

// Test configuration
export const options = {
  stages: [
    { duration: '2m', target: 10 }, // Ramp up to 10 users over 2 minutes
    { duration: '5m', target: 10 }, // Stay at 10 users for 5 minutes
    { duration: '2m', target: 20 }, // Ramp up to 20 users over 2 minutes
    { duration: '5m', target: 20 }, // Stay at 20 users for 5 minutes
    { duration: '2m', target: 0 },  // Ramp down to 0 users over 2 minutes
  ],
  thresholds: {
    http_req_duration: ['p(99)<1500'], // 99% of requests must complete below 1.5s
    errors: ['rate<0.1'], // Error rate must be below 10%
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost';

export default function () {
  // Test scenarios
  testHomePage();
  testHealthEndpoint();
  testApiEndpoint();
  
  // Add some thinking time
  sleep(1);
}

function testHomePage() {
  const response = http.get(`${BASE_URL}/`);
  
  const success = check(response, {
    'homepage status is 200': (r) => r.status === 200,
    'homepage response time < 500ms': (r) => r.timings.duration < 500,
  });
  
  errorRate.add(!success);
}

function testHealthEndpoint() {
  const response = http.get(`${BASE_URL}/health`);
  
  const success = check(response, {
    'health status is 200': (r) => r.status === 200,
    'health response time < 200ms': (r) => r.timings.duration < 200,
    'health returns status': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.status === 'healthy';
      } catch (e) {
        return false;
      }
    },
  });
  
  errorRate.add(!success);
}

function testApiEndpoint() {
  const response = http.get(`${BASE_URL}/api/health`);
  
  const success = check(response, {
    'api health status is 200': (r) => r.status === 200,
    'api health response time < 300ms': (r) => r.timings.duration < 300,
  });
  
  errorRate.add(!success);
}

// Setup function runs once before the test
export function setup() {
  console.log(`Starting load test against: ${BASE_URL}`);
  
  // Verify the application is running
  const response = http.get(`${BASE_URL}/health`);
  if (response.status !== 200) {
    throw new Error(`Application not ready. Health check failed with status: ${response.status}`);
  }
  
  console.log('Application health check passed. Starting load test...');
  return { baseUrl: BASE_URL };
}

// Teardown function runs once after the test
export function teardown(data) {
  console.log(`Load test completed for: ${data.baseUrl}`);
}