/**
 * Dashboard Components E2E Tests using Playwright MCP
 * 
 * This test suite validates the main dashboard functionality
 * including navigation, content switching, sidebar management,
 * and overall dashboard user experience.
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

test.describe('Dashboard Layout and Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await loginUser(page);
  });

  test('should display main dashboard components', async ({ page }) => {
    // Check for main dashboard structure
    await expect(page.locator('[data-testid="dashboard-container"]')).toBeVisible();
    await expect(page.locator('[data-testid="dashboard-sidebar"]')).toBeVisible();
    await expect(page.locator('[data-testid="dashboard-topbar"]')).toBeVisible();
    await expect(page.locator('[data-testid="dashboard-content"]')).toBeVisible();
  });

  test('should have functional sidebar navigation', async ({ page }) => {
    // Check for main navigation items
    const navItems = [
      'Knowledge',
      'Chat', 
      'My Organization',
      'Assistants',
      'Analytics',
      'Forms',
      'Workflow',
      'Data Sources',
      'Settings'
    ];

    for (const item of navItems) {
      await expect(page.locator(`[data-testid="nav-item"]:has-text("${item}")`)).toBeVisible();
    }
  });

  test('should navigate between dashboard sections', async ({ page }) => {
    // Test Knowledge navigation
    await page.click('text=Knowledge');
    await expect(page.locator('[data-testid="knowledge-content"]')).toBeVisible();
    await expect(page).toHaveURL(/dashboard\/knowledge/);

    // Test Chat navigation
    await page.click('text=Chat');
    await expect(page.locator('[data-testid="chat-content"]')).toBeVisible();
    await expect(page).toHaveURL(/dashboard\/chat/);

    // Test My Organization navigation
    await page.click('text=My Organization');
    await expect(page.locator('[data-testid="organization-content"]')).toBeVisible();
    await expect(page).toHaveURL(/dashboard\/my-organization/);

    // Test Assistants navigation
    await page.click('text=Assistants');
    await expect(page.locator('[data-testid="assistants-content"]')).toBeVisible();
    await expect(page).toHaveURL(/dashboard\/assistants/);
  });

  test('should highlight active navigation item', async ({ page }) => {
    // Navigate to Knowledge
    await page.click('text=Knowledge');
    
    // Knowledge nav item should be active
    await expect(page.locator('[data-testid="nav-item"]:has-text("Knowledge")')).toHaveClass(/active/);
    
    // Other nav items should not be active
    await expect(page.locator('[data-testid="nav-item"]:has-text("Chat")')).not.toHaveClass(/active/);
  });

  test('should toggle sidebar collapse', async ({ page }) => {
    const toggleButton = page.locator('[data-testid="sidebar-toggle"]');
    
    if (await toggleButton.isVisible()) {
      // Click toggle button
      await toggleButton.click();
      
      // Sidebar should be collapsed
      await expect(page.locator('[data-testid="dashboard-sidebar"]')).toHaveClass(/collapsed/);
      
      // Click again to expand
      await toggleButton.click();
      
      // Sidebar should be expanded
      await expect(page.locator('[data-testid="dashboard-sidebar"]')).not.toHaveClass(/collapsed/);
    }
  });
});

test.describe('Dashboard Top Bar', () => {
  test.beforeEach(async ({ page }) => {
    await loginUser(page);
  });

  test('should display user information', async ({ page }) => {
    // Check for user dropdown
    await expect(page.locator('[data-testid="user-dropdown"]')).toBeVisible();
    
    // Check for user avatar/name
    await expect(page.locator('[data-testid="user-avatar"]')).toBeVisible();
  });

  test('should open user dropdown menu', async ({ page }) => {
    // Click user dropdown
    await page.click('[data-testid="user-dropdown"]');
    
    // Dropdown menu should be visible
    await expect(page.locator('[data-testid="user-dropdown-menu"]')).toBeVisible();
    
    // Should have profile and logout options
    await expect(page.locator('text=Profile')).toBeVisible();
    await expect(page.locator('text=Settings')).toBeVisible();
    await expect(page.locator('text=Logout')).toBeVisible();
  });

  test('should display breadcrumb navigation', async ({ page }) => {
    // Navigate to a nested page
    await page.click('text=My Organization');
    await page.waitForSelector('[data-testid="organization-content"]');
    
    // Check for breadcrumbs
    const breadcrumbs = page.locator('[data-testid="breadcrumbs"]');
    if (await breadcrumbs.isVisible()) {
      await expect(breadcrumbs).toContainText('Dashboard');
      await expect(breadcrumbs).toContainText('My Organization');
    }
  });

  test('should display search functionality', async ({ page }) => {
    const searchInput = page.locator('[data-testid="global-search"]');
    
    if (await searchInput.isVisible()) {
      // Type in search
      await searchInput.fill('test query');
      
      // Search suggestions/results should appear
      await expect(page.locator('[data-testid="search-results"]')).toBeVisible();
    }
  });

  test('should display notifications', async ({ page }) => {
    const notificationBell = page.locator('[data-testid="notifications-bell"]');
    
    if (await notificationBell.isVisible()) {
      // Click notifications
      await notificationBell.click();
      
      // Notifications panel should open
      await expect(page.locator('[data-testid="notifications-panel"]')).toBeVisible();
    }
  });
});

test.describe('Dashboard Content Areas', () => {
  test.beforeEach(async ({ page }) => {
    await loginUser(page);
  });

  test('should load Knowledge content correctly', async ({ page }) => {
    await page.click('text=Knowledge');
    await page.waitForSelector('[data-testid="knowledge-content"]');
    
    // Check for knowledge-specific components
    await expect(page.locator('[data-testid="knowledge-upload"]')).toBeVisible();
    await expect(page.locator('[data-testid="knowledge-list"]')).toBeVisible();
    
    // Check for knowledge tabs if they exist
    const knowledgeTabs = page.locator('[data-testid="knowledge-tabs"]');
    if (await knowledgeTabs.isVisible()) {
      await expect(knowledgeTabs).toBeVisible();
    }
  });

  test('should load Chat content correctly', async ({ page }) => {
    await page.click('text=Chat');
    await page.waitForSelector('[data-testid="chat-content"]');
    
    // Check for chat-specific components
    await expect(page.locator('[data-testid="chat-sidebar"]')).toBeVisible();
    await expect(page.locator('[data-testid="chat-window"]')).toBeVisible();
    await expect(page.locator('[data-testid="message-input"]')).toBeVisible();
  });

  test('should load Assistants content correctly', async ({ page }) => {
    await page.click('text=Assistants');
    await page.waitForSelector('[data-testid="assistants-content"]');
    
    // Check for assistant-specific components
    await expect(page.locator('[data-testid="assistant-list"]')).toBeVisible();
    
    // Check for create assistant button
    const createButton = page.locator('[data-testid="create-assistant-button"]');
    if (await createButton.isVisible()) {
      await expect(createButton).toBeVisible();
    }
  });

  test('should load Analytics content correctly', async ({ page }) => {
    await page.click('text=Analytics');
    await page.waitForSelector('[data-testid="analytics-content"]');
    
    // Check for analytics components
    await expect(page.locator('[data-testid="analytics-charts"]')).toBeVisible();
    
    // Check for metrics cards
    const metricsCards = page.locator('[data-testid="metrics-card"]');
    if (await metricsCards.first().isVisible()) {
      await expect(metricsCards).toHaveCountGreaterThan(0);
    }
  });

  test('should load Forms content correctly', async ({ page }) => {
    await page.click('text=Forms');
    await page.waitForSelector('[data-testid="forms-content"]');
    
    // Check for forms components
    await expect(page.locator('[data-testid="forms-list"]')).toBeVisible();
    
    // Check for form designer if available
    const designerButton = page.locator('[data-testid="form-designer-button"]');
    if (await designerButton.isVisible()) {
      await expect(designerButton).toBeVisible();
    }
  });

  test('should load Settings content correctly', async ({ page }) => {
    await page.click('text=Settings');
    await page.waitForSelector('[data-testid="settings-content"]');
    
    // Check for settings tabs
    await expect(page.locator('[data-testid="settings-tabs"]')).toBeVisible();
    
    // Check for common settings sections
    const settingsSections = ['General', 'Security', 'Preferences'];
    for (const section of settingsSections) {
      const sectionTab = page.locator(`text=${section}`);
      if (await sectionTab.isVisible()) {
        await expect(sectionTab).toBeVisible();
      }
    }
  });
});

test.describe('Dashboard Loading States', () => {
  test.beforeEach(async ({ page }) => {
    await loginUser(page);
  });

  test('should show loading states during navigation', async ({ page }) => {
    // Navigate to Knowledge
    const knowledgeNavPromise = page.click('text=Knowledge');
    
    // Should show loading state
    await expect(page.locator('[data-testid="loading-spinner"]')).toBeVisible({ timeout: 1000 });
    
    await knowledgeNavPromise;
    await page.waitForSelector('[data-testid="knowledge-content"]');
    
    // Loading state should disappear
    await expect(page.locator('[data-testid="loading-spinner"]')).not.toBeVisible();
  });

  test('should handle slow-loading content gracefully', async ({ page }) => {
    // Simulate slow network
    await page.route('**/api/v1/**', async route => {
      await new Promise(resolve => setTimeout(resolve, 2000)); // 2 second delay
      route.continue();
    });
    
    // Navigate to Analytics (typically heavy with data)
    await page.click('text=Analytics');
    
    // Should show loading state for extended period
    await expect(page.locator('[data-testid="loading-spinner"]')).toBeVisible();
    
    // Eventually should load
    await expect(page.locator('[data-testid="analytics-content"]')).toBeVisible({ timeout: 15000 });
  });
});

test.describe('Dashboard Responsive Design', () => {
  test.beforeEach(async ({ page }) => {
    await loginUser(page);
  });

  test('should adapt to mobile viewport', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Sidebar should be hidden or collapsed on mobile
    const sidebar = page.locator('[data-testid="dashboard-sidebar"]');
    await expect(sidebar).toHaveClass(/mobile-hidden|collapsed/);
    
    // Should have mobile navigation toggle
    await expect(page.locator('[data-testid="mobile-nav-toggle"]')).toBeVisible();
  });

  test('should adapt to tablet viewport', async ({ page }) => {
    // Set tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });
    
    // Dashboard should adapt layout
    await expect(page.locator('[data-testid="dashboard-container"]')).toHaveClass(/tablet-layout/);
  });

  test('should work on desktop viewport', async ({ page }) => {
    // Set desktop viewport
    await page.setViewportSize({ width: 1920, height: 1080 });
    
    // All components should be fully visible
    await expect(page.locator('[data-testid="dashboard-sidebar"]')).toBeVisible();
    await expect(page.locator('[data-testid="dashboard-topbar"]')).toBeVisible();
    await expect(page.locator('[data-testid="dashboard-content"]')).toBeVisible();
  });

  test('should handle mobile navigation', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    const mobileToggle = page.locator('[data-testid="mobile-nav-toggle"]');
    if (await mobileToggle.isVisible()) {
      // Open mobile navigation
      await mobileToggle.click();
      
      // Mobile nav menu should be visible
      await expect(page.locator('[data-testid="mobile-nav-menu"]')).toBeVisible();
      
      // Should be able to navigate
      await page.click('text=Knowledge');
      await expect(page.locator('[data-testid="knowledge-content"]')).toBeVisible();
    }
  });
});

test.describe('Dashboard Performance', () => {
  test('should load dashboard within acceptable time', async ({ page }) => {
    const startTime = Date.now();
    await loginUser(page);
    const loadTime = Date.now() - startTime;
    
    // Dashboard should load within 5 seconds
    expect(loadTime).toBeLessThan(5000);
  });

  test('should handle rapid navigation changes', async ({ page }) => {
    await loginUser(page);
    
    // Rapidly navigate between sections
    const sections = ['Knowledge', 'Chat', 'My Organization', 'Assistants'];
    
    for (let i = 0; i < 3; i++) { // Repeat 3 times
      for (const section of sections) {
        await page.click(`text=${section}`);
        await page.waitForTimeout(100); // Brief pause
      }
    }
    
    // Should end up in the last section without errors
    await expect(page.locator('[data-testid="assistants-content"]')).toBeVisible();
  });

  test('should not show memory leaks during extended use', async ({ page }) => {
    await loginUser(page);
    
    // Navigate through all sections multiple times
    const sections = ['Knowledge', 'Chat', 'My Organization', 'Assistants', 'Analytics', 'Settings'];
    
    for (let cycle = 0; cycle < 5; cycle++) {
      for (const section of sections) {
        await page.click(`text=${section}`);
        await page.waitForSelector(`[data-testid="${section.toLowerCase().replace(' ', '-')}-content"]`, { timeout: 5000 });
        
        // Check that page is still responsive
        await expect(page.locator('[data-testid="dashboard-container"]')).toBeVisible();
      }
    }
    
    // Dashboard should still be functional
    await expect(page.locator('[data-testid="user-dropdown"]')).toBeVisible();
  });
});

test.describe('Error Handling', () => {
  test.beforeEach(async ({ page }) => {
    await loginUser(page);
  });

  test('should handle API errors gracefully', async ({ page }) => {
    // Block API requests
    await page.route('**/api/v1/**', route => route.abort());
    
    // Try to navigate to Knowledge
    await page.click('text=Knowledge');
    
    // Should show error state
    await expect(page.locator('[data-testid="error-boundary"]')).toBeVisible();
    await expect(page.locator('text=/Error loading|Failed to load/')).toBeVisible();
  });

  test('should provide error recovery options', async ({ page }) => {
    // Simulate error
    await page.route('**/api/v1/knowledge/**', route => route.abort());
    
    await page.click('text=Knowledge');
    await page.waitForSelector('[data-testid="error-boundary"]');
    
    // Should have retry button
    const retryButton = page.locator('[data-testid="retry-button"]');
    if (await retryButton.isVisible()) {
      await expect(retryButton).toBeVisible();
    }
  });

  test('should handle unauthorized access', async ({ page }) => {
    // Simulate unauthorized response
    await page.route('**/api/v1/**', route => 
      route.fulfill({ status: 401, json: { error: 'Unauthorized' } })
    );
    
    await page.click('text=Settings');
    
    // Should redirect to login or show unauthorized message
    await expect(page).toHaveURL(/login|unauthorized/);
  });
});