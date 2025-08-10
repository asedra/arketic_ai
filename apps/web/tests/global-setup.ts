/**
 * Global Setup for Playwright E2E Tests
 * 
 * This file handles global test setup including authentication
 * and environment validation.
 * 
 * Author: Claude
 * Created: 2025-08-10 (AR-82 Implementation)
 */

import { chromium, FullConfig } from '@playwright/test';

async function globalSetup(config: FullConfig) {
  const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';
  const apiURL = process.env.API_URL || 'http://localhost:8000';

  console.log('🚀 Starting Playwright Global Setup');
  console.log(`Frontend URL: ${baseURL}`);
  console.log(`API URL: ${apiURL}`);

  // Verify services are running
  try {
    const response = await fetch(`${apiURL}/health`);
    if (!response.ok) {
      throw new Error(`API health check failed: ${response.status}`);
    }
    console.log('✅ API service is healthy');
  } catch (error) {
    console.error('❌ API service health check failed:', error);
    throw error;
  }

  try {
    const response = await fetch(baseURL);
    if (!response.ok) {
      throw new Error(`Frontend health check failed: ${response.status}`);
    }
    console.log('✅ Frontend service is healthy');
  } catch (error) {
    console.error('❌ Frontend service health check failed:', error);
    throw error;
  }

  // Create a browser instance for authentication setup
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // Pre-authenticate for tests that need it
    await page.goto(`${baseURL}/login`);
    
    // Check if login page is accessible
    const isLoginPage = await page.locator('input[name="email"]').isVisible({ timeout: 5000 }).catch(() => false);
    
    if (isLoginPage) {
      console.log('✅ Login page is accessible');
    } else {
      console.log('ℹ️ Login page structure may be different, tests will handle authentication individually');
    }

  } catch (error) {
    console.warn('⚠️ Authentication pre-setup encountered issues:', error);
    // Don't fail the entire test suite if auth setup has issues
  } finally {
    await context.close();
    await browser.close();
  }

  console.log('✅ Global setup completed successfully');
}

export default globalSetup;