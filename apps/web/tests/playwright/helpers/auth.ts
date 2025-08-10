/**
 * Authentication helper functions for Playwright tests
 * 
 * Provides reusable authentication methods for E2E tests
 */

import { Page } from '@playwright/test';

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';
const API_URL = process.env.API_URL || 'http://localhost:8000';

export const TEST_USER = {
  email: 'test@arketic.com',
  password: 'testpass123'
};

/**
 * Login via UI - navigates through the login form
 */
export async function loginUser(page: Page) {
  // Navigate to login page
  await page.goto(`${BASE_URL}/login`);
  
  // Wait for form to be ready
  await page.waitForSelector('input[name="email"]', { state: 'visible' });
  
  // Fill credentials
  await page.fill('input[name="email"]', TEST_USER.email);
  await page.fill('input[name="password"]', TEST_USER.password);
  
  // Submit and wait for navigation
  await Promise.all([
    page.waitForURL(url => {
      const pathname = new URL(url).pathname;
      return pathname === '/dashboard' || pathname === '/';
    }, { timeout: 30000 }),
    page.click('button[type="submit"]')
  ]);
  
  // Verify authentication - wait for user dropdown
  await page.waitForSelector('[data-testid="user-dropdown"]', { timeout: 5000 });
}

/**
 * Login via API - faster authentication for tests
 */
export async function authenticateViaAPI(page: Page) {
  try {
    // Make login request
    const response = await page.request.post(`${API_URL}/api/v1/auth/login`, {
      data: {
        email: TEST_USER.email,
        password: TEST_USER.password
      }
    });
    
    if (!response.ok()) {
      throw new Error(`Login failed: ${response.status()}`);
    }
    
    const data = await response.json();
    const token = data.access_token;
    
    if (!token) {
      throw new Error('No access token received');
    }
    
    // Set authentication in localStorage
    await page.goto(BASE_URL);
    await page.evaluate((token) => {
      localStorage.setItem('auth_token', token);
      // Also set in sessionStorage for redundancy
      sessionStorage.setItem('auth_token', token);
    }, token);
    
    // Navigate to dashboard
    await page.goto(`${BASE_URL}/dashboard`);
    
    // Verify authentication
    await page.waitForSelector('[data-testid="user-dropdown"]', { timeout: 5000 });
    
  } catch (error) {
    console.error('API authentication failed:', error);
    // Fallback to UI login
    await loginUser(page);
  }
}

/**
 * Create a test user if it doesn't exist
 */
export async function ensureTestUserExists(page: Page) {
  try {
    // Try to login first
    const response = await page.request.post(`${API_URL}/api/v1/auth/login`, {
      data: {
        email: TEST_USER.email,
        password: TEST_USER.password
      }
    });
    
    if (response.ok()) {
      return; // User exists
    }
    
    // If login fails, try to create the user
    // Note: This endpoint might not exist, adjust based on your API
    const signupResponse = await page.request.post(`${API_URL}/api/v1/auth/register`, {
      data: {
        email: TEST_USER.email,
        password: TEST_USER.password,
        firstName: 'Test',
        lastName: 'User'
      }
    });
    
    if (!signupResponse.ok()) {
      console.warn('Could not create test user, tests may fail');
    }
  } catch (error) {
    console.warn('Error ensuring test user exists:', error);
  }
}

/**
 * Logout the current user
 */
export async function logoutUser(page: Page) {
  // Click user dropdown
  await page.click('[data-testid="user-dropdown"]');
  
  // Click logout
  await page.click('text=Logout');
  
  // Wait for redirect to login
  await page.waitForURL('**/login**', { timeout: 5000 });
}