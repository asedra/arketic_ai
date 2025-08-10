/**
 * Visual Regression Tests using Playwright MCP
 * 
 * This test suite captures screenshots of key UI components
 * and compares them against baseline images to detect
 * unintended visual changes.
 * 
 * Author: Claude
 * Created: 2025-08-10 (AR-83 Implementation)
 */

import { test, expect } from '@playwright/test';

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';

const TEST_USER = {
  email: 'test@arketic.com',
  password: 'testpassword123'
};

// Helper function to login
async function loginUser(page: any) {
  await page.goto(BASE_URL);
  await page.fill('input[name="email"]', TEST_USER.email);
  await page.fill('input[name="password"]', TEST_USER.password);
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard**', { timeout: 10000 });
}

// Helper to wait for page to be stable (no loading spinners, animations settled)
async function waitForPageStability(page: any) {
  // Wait for any loading spinners to disappear
  await page.waitForSelector('[data-testid="loading-spinner"]', { state: 'hidden', timeout: 5000 }).catch(() => {});
  
  // Wait for animations to settle
  await page.waitForTimeout(500);
  
  // Wait for any lazy-loaded images
  await page.waitForLoadState('networkidle');
}

test.describe('Visual Regression - Authentication Pages', () => {
  test('should capture login page', async ({ page }) => {
    await page.goto(BASE_URL);
    await waitForPageStability(page);
    
    // Take screenshot of login page
    await expect(page).toHaveScreenshot('login-page.png');
  });

  test('should capture signup page', async ({ page }) => {
    await page.goto(`${BASE_URL}/signup`);
    await waitForPageStability(page);
    
    // Take screenshot of signup page
    await expect(page).toHaveScreenshot('signup-page.png');
  });

  test('should capture forgot password page', async ({ page }) => {
    await page.goto(`${BASE_URL}/forgot-password`);
    await waitForPageStability(page);
    
    // Take screenshot of forgot password page
    await expect(page).toHaveScreenshot('forgot-password-page.png');
  });
});

test.describe('Visual Regression - Dashboard Layout', () => {
  test.beforeEach(async ({ page }) => {
    await loginUser(page);
    await waitForPageStability(page);
  });

  test('should capture main dashboard layout', async ({ page }) => {
    // Take full page screenshot of dashboard
    await expect(page).toHaveScreenshot('dashboard-layout.png', {
      fullPage: true
    });
  });

  test('should capture dashboard sidebar', async ({ page }) => {
    // Take screenshot of sidebar component
    await expect(page.locator('[data-testid="dashboard-sidebar"]')).toHaveScreenshot('dashboard-sidebar.png');
  });

  test('should capture dashboard top bar', async ({ page }) => {
    // Take screenshot of top bar component
    await expect(page.locator('[data-testid="dashboard-topbar"]')).toHaveScreenshot('dashboard-topbar.png');
  });

  test('should capture collapsed sidebar state', async ({ page }) => {
    const toggleButton = page.locator('[data-testid="sidebar-toggle"]');
    
    if (await toggleButton.isVisible()) {
      await toggleButton.click();
      await waitForPageStability(page);
      
      // Take screenshot with collapsed sidebar
      await expect(page.locator('[data-testid="dashboard-sidebar"]')).toHaveScreenshot('dashboard-sidebar-collapsed.png');
    }
  });
});

test.describe('Visual Regression - Dashboard Content Areas', () => {
  test.beforeEach(async ({ page }) => {
    await loginUser(page);
  });

  test('should capture Knowledge page', async ({ page }) => {
    await page.click('text=Knowledge');
    await page.waitForSelector('[data-testid="knowledge-content"]');
    await waitForPageStability(page);
    
    // Take screenshot of knowledge page
    await expect(page.locator('[data-testid="knowledge-content"]')).toHaveScreenshot('knowledge-content.png');
  });

  test('should capture Chat interface', async ({ page }) => {
    await page.click('text=Chat');
    await page.waitForSelector('[data-testid="chat-content"]');
    await waitForPageStability(page);
    
    // Take screenshot of chat interface
    await expect(page.locator('[data-testid="chat-content"]')).toHaveScreenshot('chat-interface.png');
  });

  test('should capture My Organization page', async ({ page }) => {
    await page.click('text=My Organization');
    await page.waitForSelector('[data-testid="organization-content"]');
    await waitForPageStability(page);
    
    // Take screenshot of organization page
    await expect(page.locator('[data-testid="organization-content"]')).toHaveScreenshot('organization-content.png');
  });

  test('should capture Assistants page', async ({ page }) => {
    await page.click('text=Assistants');
    await page.waitForSelector('[data-testid="assistants-content"]');
    await waitForPageStability(page);
    
    // Take screenshot of assistants page
    await expect(page.locator('[data-testid="assistants-content"]')).toHaveScreenshot('assistants-content.png');
  });

  test('should capture Analytics page', async ({ page }) => {
    await page.click('text=Analytics');
    await page.waitForSelector('[data-testid="analytics-content"]');
    await waitForPageStability(page);
    
    // Take screenshot of analytics page
    await expect(page.locator('[data-testid="analytics-content"]')).toHaveScreenshot('analytics-content.png');
  });

  test('should capture Settings page', async ({ page }) => {
    await page.click('text=Settings');
    await page.waitForSelector('[data-testid="settings-content"]');
    await waitForPageStability(page);
    
    // Take screenshot of settings page
    await expect(page.locator('[data-testid="settings-content"]')).toHaveScreenshot('settings-content.png');
  });
});

test.describe('Visual Regression - Interactive Components', () => {
  test.beforeEach(async ({ page }) => {
    await loginUser(page);
  });

  test('should capture user dropdown open state', async ({ page }) => {
    await page.click('[data-testid="user-dropdown"]');
    await page.waitForSelector('[data-testid="user-dropdown-menu"]');
    await waitForPageStability(page);
    
    // Take screenshot of user dropdown
    await expect(page.locator('[data-testid="user-dropdown-menu"]')).toHaveScreenshot('user-dropdown-menu.png');
  });

  test('should capture chat with messages', async ({ page }) => {
    await page.click('text=Chat');
    await page.waitForSelector('[data-testid="chat-content"]');
    
    // Create a new chat and send a message
    const newChatButton = page.locator('[data-testid="new-chat-button"]');
    if (await newChatButton.isVisible()) {
      await newChatButton.click();
      
      // Send test message
      await page.fill('[data-testid="message-input"]', 'This is a test message for visual regression');
      await page.click('button[data-testid="send-message"]');
      
      // Wait for message to appear
      await page.waitForSelector('[data-testid="messages-list"] .message');
      await waitForPageStability(page);
      
      // Take screenshot of chat with messages
      await expect(page.locator('[data-testid="chat-window"]')).toHaveScreenshot('chat-with-messages.png');
    }
  });

  test('should capture knowledge upload modal', async ({ page }) => {
    await page.click('text=Knowledge');
    await page.waitForSelector('[data-testid="knowledge-content"]');
    
    const uploadButton = page.locator('[data-testid="upload-button"]');
    if (await uploadButton.isVisible()) {
      await uploadButton.click();
      await page.waitForSelector('[data-testid="upload-modal"]');
      await waitForPageStability(page);
      
      // Take screenshot of upload modal
      await expect(page.locator('[data-testid="upload-modal"]')).toHaveScreenshot('knowledge-upload-modal.png');
    }
  });

  test('should capture add person modal', async ({ page }) => {
    await page.click('text=My Organization');
    await page.waitForSelector('[data-testid="organization-content"]');
    
    // Navigate to people tab
    const peopleTab = page.locator('[data-testid="people-tab"]');
    if (await peopleTab.isVisible()) {
      await peopleTab.click();
      await page.waitForSelector('[data-testid="people-content"]');
      
      const addPersonButton = page.locator('[data-testid="add-person-button"]');
      if (await addPersonButton.isVisible()) {
        await addPersonButton.click();
        await page.waitForSelector('[data-testid="add-person-modal"]');
        await waitForPageStability(page);
        
        // Take screenshot of add person modal
        await expect(page.locator('[data-testid="add-person-modal"]')).toHaveScreenshot('add-person-modal.png');
      }
    }
  });
});

test.describe('Visual Regression - Error States', () => {
  test.beforeEach(async ({ page }) => {
    await loginUser(page);
  });

  test('should capture network error state', async ({ page }) => {
    // Block API requests to simulate network error
    await page.route('**/api/v1/**', route => route.abort());
    
    await page.click('text=Knowledge');
    
    // Wait for error state to appear
    await page.waitForSelector('[data-testid="error-boundary"]', { timeout: 10000 });
    await waitForPageStability(page);
    
    // Take screenshot of error state
    await expect(page.locator('[data-testid="error-boundary"]')).toHaveScreenshot('network-error-state.png');
  });

  test('should capture loading state', async ({ page }) => {
    // Slow down network to capture loading state
    await page.route('**/api/v1/**', async route => {
      await new Promise(resolve => setTimeout(resolve, 2000));
      route.continue();
    });
    
    const navigationPromise = page.click('text=Analytics');
    
    // Capture loading state
    await page.waitForSelector('[data-testid="loading-spinner"]', { timeout: 5000 });
    await expect(page.locator('[data-testid="loading-spinner"]')).toHaveScreenshot('loading-spinner.png');
    
    await navigationPromise;
  });

  test('should capture empty state', async ({ page }) => {
    // Mock empty response
    await page.route('**/api/v1/people', route => 
      route.fulfill({ 
        json: { data: [], total: 0 } 
      })
    );
    
    await page.click('text=My Organization');
    await page.waitForSelector('[data-testid="organization-content"]');
    
    const peopleTab = page.locator('[data-testid="people-tab"]');
    if (await peopleTab.isVisible()) {
      await peopleTab.click();
      await page.waitForSelector('[data-testid="empty-state"]');
      await waitForPageStability(page);
      
      // Take screenshot of empty state
      await expect(page.locator('[data-testid="empty-state"]')).toHaveScreenshot('people-empty-state.png');
    }
  });
});

test.describe('Visual Regression - Responsive Design', () => {
  test.beforeEach(async ({ page }) => {
    await loginUser(page);
  });

  test('should capture mobile layout', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await waitForPageStability(page);
    
    // Take screenshot of mobile dashboard
    await expect(page).toHaveScreenshot('dashboard-mobile.png', {
      fullPage: true
    });
  });

  test('should capture tablet layout', async ({ page }) => {
    // Set tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });
    await waitForPageStability(page);
    
    // Take screenshot of tablet dashboard
    await expect(page).toHaveScreenshot('dashboard-tablet.png', {
      fullPage: true
    });
  });

  test('should capture desktop layout', async ({ page }) => {
    // Set desktop viewport
    await page.setViewportSize({ width: 1920, height: 1080 });
    await waitForPageStability(page);
    
    // Take screenshot of desktop dashboard
    await expect(page).toHaveScreenshot('dashboard-desktop.png', {
      fullPage: true
    });
  });

  test('should capture mobile navigation menu', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    const mobileToggle = page.locator('[data-testid="mobile-nav-toggle"]');
    if (await mobileToggle.isVisible()) {
      await mobileToggle.click();
      await page.waitForSelector('[data-testid="mobile-nav-menu"]');
      await waitForPageStability(page);
      
      // Take screenshot of mobile navigation
      await expect(page.locator('[data-testid="mobile-nav-menu"]')).toHaveScreenshot('mobile-nav-menu.png');
    }
  });
});

test.describe('Visual Regression - Dark Mode', () => {
  test.beforeEach(async ({ page }) => {
    await loginUser(page);
  });

  test('should capture dark mode dashboard', async ({ page }) => {
    // Toggle dark mode if available
    const themeToggle = page.locator('[data-testid="theme-toggle"]');
    if (await themeToggle.isVisible()) {
      await themeToggle.click();
      await waitForPageStability(page);
      
      // Take screenshot in dark mode
      await expect(page).toHaveScreenshot('dashboard-dark-mode.png', {
        fullPage: true
      });
    }
  });

  test('should capture dark mode components', async ({ page }) => {
    // Toggle dark mode
    const themeToggle = page.locator('[data-testid="theme-toggle"]');
    if (await themeToggle.isVisible()) {
      await themeToggle.click();
      await waitForPageStability(page);
      
      // Capture sidebar in dark mode
      await expect(page.locator('[data-testid="dashboard-sidebar"]')).toHaveScreenshot('sidebar-dark-mode.png');
      
      // Navigate to Chat and capture in dark mode
      await page.click('text=Chat');
      await page.waitForSelector('[data-testid="chat-content"]');
      await waitForPageStability(page);
      
      await expect(page.locator('[data-testid="chat-content"]')).toHaveScreenshot('chat-dark-mode.png');
    }
  });
});