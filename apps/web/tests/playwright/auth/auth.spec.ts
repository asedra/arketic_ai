/**
 * Authentication E2E Tests using Playwright MCP
 * 
 * This test suite validates the authentication workflows
 * including login, logout, registration, and session management.
 * 
 * Author: Claude
 * Created: 2025-08-10 (AR-82 Implementation)
 */

import { test, expect } from '@playwright/test';

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';
const API_URL = process.env.API_URL || 'http://localhost:8000';

// Test user credentials
const TEST_USER = {
  email: 'test@arketic.com',
  password: 'testpassword123',
  name: 'Test User'
};

// Test suite for authentication flows
test.describe('Authentication Flows', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the application
    await page.goto(BASE_URL);
  });

  test('should display login page for unauthenticated users', async ({ page }) => {
    // Check if login form is visible
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
    
    // Check for login page elements
    await expect(page.locator('text=Sign in to Arketic')).toBeVisible();
    await expect(page.locator('text=Don\'t have an account?')).toBeVisible();
  });

  test('should successfully log in with valid credentials', async ({ page }) => {
    // Fill login form
    await page.fill('input[name="email"]', TEST_USER.email);
    await page.fill('input[name="password"]', TEST_USER.password);
    
    // Submit form
    await page.click('button[type="submit"]');
    
    // Wait for navigation to dashboard
    await page.waitForURL('**/dashboard**', { timeout: 10000 });
    
    // Verify user is logged in
    await expect(page.locator('[data-testid="user-dropdown"]')).toBeVisible();
    await expect(page.locator('text=Knowledge')).toBeVisible();
    await expect(page.locator('text=Chat')).toBeVisible();
  });

  test('should show error for invalid credentials', async ({ page }) => {
    // Fill with invalid credentials
    await page.fill('input[name="email"]', 'invalid@example.com');
    await page.fill('input[name="password"]', 'wrongpassword');
    
    // Submit form
    await page.click('button[type="submit"]');
    
    // Check for error message
    await expect(page.locator('text=/Invalid credentials|Login failed/')).toBeVisible();
    
    // Should remain on login page
    await expect(page.locator('input[name="email"]')).toBeVisible();
  });

  test('should validate email format', async ({ page }) => {
    // Fill with invalid email format
    await page.fill('input[name="email"]', 'invalid-email');
    await page.fill('input[name="password"]', 'somepassword');
    
    // Try to submit
    await page.click('button[type="submit"]');
    
    // Check for validation error
    await expect(page.locator('text=/Invalid email|Please enter a valid email/')).toBeVisible();
  });

  test('should require both email and password', async ({ page }) => {
    // Try to submit with empty fields
    await page.click('button[type="submit"]');
    
    // Check for required field validation
    const emailInput = page.locator('input[name="email"]');
    const passwordInput = page.locator('input[name="password"]');
    
    await expect(emailInput).toHaveAttribute('required');
    await expect(passwordInput).toHaveAttribute('required');
  });
});

test.describe('Session Management', () => {
  test.beforeEach(async ({ page }) => {
    // Login first
    await page.goto(BASE_URL);
    await page.fill('input[name="email"]', TEST_USER.email);
    await page.fill('input[name="password"]', TEST_USER.password);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard**', { timeout: 10000 });
  });

  test('should successfully log out', async ({ page }) => {
    // Click user dropdown
    await page.click('[data-testid="user-dropdown"]');
    
    // Click logout
    await page.click('text=Logout');
    
    // Should redirect to login page
    await page.waitForURL('**/login**', { timeout: 5000 });
    await expect(page.locator('input[name="email"]')).toBeVisible();
  });

  test('should persist session on page refresh', async ({ page }) => {
    // Refresh the page
    await page.reload();
    
    // Should still be authenticated
    await expect(page.locator('[data-testid="user-dropdown"]')).toBeVisible();
    await expect(page).toHaveURL(/dashboard/);
  });

  test('should handle session expiry gracefully', async ({ page }) => {
    // Simulate expired token by making request with invalid token
    await page.evaluate(() => {
      localStorage.setItem('auth_token', 'expired_token');
    });
    
    // Try to navigate to a protected page
    await page.goto(`${BASE_URL}/dashboard/knowledge`);
    
    // Should redirect to login
    await page.waitForURL('**/login**', { timeout: 10000 });
    await expect(page.locator('input[name="email"]')).toBeVisible();
  });
});

test.describe('Registration Flow', () => {
  test('should navigate to signup page', async ({ page }) => {
    await page.goto(BASE_URL);
    
    // Click signup link
    await page.click('text=Don\'t have an account?');
    
    // Should navigate to signup page
    await page.waitForURL('**/signup**', { timeout: 5000 });
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
    await expect(page.locator('input[name="name"]')).toBeVisible();
  });

  test('should validate signup form', async ({ page }) => {
    await page.goto(`${BASE_URL}/signup`);
    
    // Try to submit empty form
    await page.click('button[type="submit"]');
    
    // Check for validation
    const nameInput = page.locator('input[name="name"]');
    const emailInput = page.locator('input[name="email"]');
    const passwordInput = page.locator('input[name="password"]');
    
    await expect(nameInput).toHaveAttribute('required');
    await expect(emailInput).toHaveAttribute('required');
    await expect(passwordInput).toHaveAttribute('required');
  });
});

test.describe('Password Reset Flow', () => {
  test('should navigate to forgot password page', async ({ page }) => {
    await page.goto(BASE_URL);
    
    // Click forgot password link
    await page.click('text=Forgot your password?');
    
    // Should navigate to forgot password page
    await page.waitForURL('**/forgot-password**', { timeout: 5000 });
    await expect(page.locator('input[type="email"]')).toBeVisible();
  });

  test('should handle password reset request', async ({ page }) => {
    await page.goto(`${BASE_URL}/forgot-password`);
    
    // Fill email
    await page.fill('input[type="email"]', TEST_USER.email);
    
    // Submit
    await page.click('button[type="submit"]');
    
    // Should show success message
    await expect(page.locator('text=/Reset email sent|Check your email/')).toBeVisible();
  });
});

test.describe('Authentication State Management', () => {
  test('should handle concurrent login attempts', async ({ browser }) => {
    // Create two pages (different tabs)
    const context = await browser.newContext();
    const page1 = await context.newPage();
    const page2 = await context.newPage();
    
    // Navigate both to login
    await page1.goto(BASE_URL);
    await page2.goto(BASE_URL);
    
    // Login from first tab
    await page1.fill('input[name="email"]', TEST_USER.email);
    await page1.fill('input[name="password"]', TEST_USER.password);
    await page1.click('button[type="submit"]');
    await page1.waitForURL('**/dashboard**', { timeout: 10000 });
    
    // Refresh second tab - should also be authenticated
    await page2.reload();
    await expect(page2.locator('[data-testid="user-dropdown"]')).toBeVisible();
    
    // Cleanup
    await context.close();
  });

  test('should handle logout from multiple tabs', async ({ browser }) => {
    // Create two authenticated pages
    const context = await browser.newContext();
    const page1 = await context.newPage();
    const page2 = await context.newPage();
    
    // Login on both
    for (const page of [page1, page2]) {
      await page.goto(BASE_URL);
      await page.fill('input[name="email"]', TEST_USER.email);
      await page.fill('input[name="password"]', TEST_USER.password);
      await page.click('button[type="submit"]');
      await page.waitForURL('**/dashboard**', { timeout: 10000 });
    }
    
    // Logout from first tab
    await page1.click('[data-testid="user-dropdown"]');
    await page1.click('text=Logout');
    
    // Second tab should also be logged out after refresh
    await page2.reload();
    await page2.waitForURL('**/login**', { timeout: 10000 });
    
    // Cleanup
    await context.close();
  });
});