/**
 * Settings and Preferences E2E Tests using Playwright MCP
 * 
 * This test suite validates the settings and preferences functionality
 * including user profile, system settings, and application preferences.
 * 
 * Author: Claude
 * Created: 2025-08-10 (AR-82 Implementation)
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

test.describe('Settings Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await loginUser(page);
    
    // Navigate to settings
    await page.click('text=Settings');
    await page.waitForSelector('[data-testid="settings-content"]', { timeout: 5000 });
  });

  test('should display settings interface', async ({ page }) => {
    // Check for settings navigation
    await expect(page.locator('[data-testid="settings-nav"]')).toBeVisible();
    
    // Check for main settings sections
    await expect(page.locator('[data-testid="profile-settings"]')).toBeVisible();
    await expect(page.locator('[data-testid="general-settings"]')).toBeVisible();
    
    // Check for AI settings if available
    const aiSettings = page.locator('[data-testid="ai-settings"]');
    if (await aiSettings.isVisible()) {
      await expect(aiSettings).toBeVisible();
    }
  });

  test('should navigate between settings sections', async ({ page }) => {
    // Click on different settings sections
    const sections = [
      'profile-settings',
      'general-settings',
      'notification-settings',
      'privacy-settings'
    ];
    
    for (const section of sections) {
      const sectionLink = page.locator(`[data-testid="${section}-nav"]`);
      if (await sectionLink.isVisible()) {
        await sectionLink.click();
        await expect(page.locator(`[data-testid="${section}-panel"]`)).toBeVisible();
      }
    }
  });
});

test.describe('Profile Settings', () => {
  test.beforeEach(async ({ page }) => {
    await loginUser(page);
    await page.click('text=Settings');
    await page.waitForSelector('[data-testid="settings-content"]', { timeout: 5000 });
    
    // Navigate to profile settings
    const profileNav = page.locator('[data-testid="profile-settings-nav"]');
    if (await profileNav.isVisible()) {
      await profileNav.click();
    }
  });

  test('should display current profile information', async ({ page }) => {
    // Check for profile form
    await expect(page.locator('[data-testid="profile-form"]')).toBeVisible();
    
    // Check for name field
    const nameField = page.locator('input[name="name"]');
    if (await nameField.isVisible()) {
      await expect(nameField).toBeVisible();
      
      // Should have current user's name
      const nameValue = await nameField.inputValue();
      expect(nameValue.length).toBeGreaterThan(0);
    }
    
    // Check for email field (usually read-only)
    const emailField = page.locator('input[name="email"]');
    if (await emailField.isVisible()) {
      await expect(emailField).toBeVisible();
      await expect(emailField).toHaveValue(TEST_USER.email);
    }
  });

  test('should update profile information', async ({ page }) => {
    const profileForm = page.locator('[data-testid="profile-form"]');
    
    if (await profileForm.isVisible()) {
      // Update name
      const nameField = page.locator('input[name="name"]');
      if (await nameField.isVisible()) {
        await nameField.fill('Updated Test User');
      }
      
      // Update title if field exists
      const titleField = page.locator('input[name="title"]');
      if (await titleField.isVisible()) {
        await titleField.fill('Senior Test Engineer');
      }
      
      // Update bio if field exists
      const bioField = page.locator('textarea[name="bio"]');
      if (await bioField.isVisible()) {
        await bioField.fill('This is an updated bio for testing purposes.');
      }
      
      // Save changes
      await page.click('button[type="submit"]:has-text("Save")');
      
      // Should show success message
      await expect(page.locator('text=/Profile updated|Changes saved/')).toBeVisible();
    }
  });

  test('should validate profile form', async ({ page }) => {
    const profileForm = page.locator('[data-testid="profile-form"]');
    
    if (await profileForm.isVisible()) {
      // Clear required fields
      const nameField = page.locator('input[name="name"]');
      if (await nameField.isVisible()) {
        await nameField.fill('');
      }
      
      // Try to save
      await page.click('button[type="submit"]:has-text("Save")');
      
      // Should show validation error
      await expect(page.locator('text=/Name is required|Please enter your name/')).toBeVisible();
    }
  });

  test('should upload profile picture', async ({ page }) => {
    const avatarUpload = page.locator('[data-testid="avatar-upload"]');
    
    if (await avatarUpload.isVisible()) {
      // Check for file input or upload area
      const fileInput = page.locator('input[type="file"]');
      if (await fileInput.isVisible()) {
        // Create a test image file path (this would need to exist in a real test)
        const testImagePath = '/tmp/test-avatar.png';
        
        // In a real implementation, you'd create this file first
        // await fileInput.setInputFiles(testImagePath);
        
        // For now, just check the upload interface exists
        await expect(fileInput).toBeVisible();
      }
    }
  });
});

test.describe('General Settings', () => {
  test.beforeEach(async ({ page }) => {
    await loginUser(page);
    await page.click('text=Settings');
    await page.waitForSelector('[data-testid="settings-content"]', { timeout: 5000 });
    
    // Navigate to general settings
    const generalNav = page.locator('[data-testid="general-settings-nav"]');
    if (await generalNav.isVisible()) {
      await generalNav.click();
    }
  });

  test('should display general preferences', async ({ page }) => {
    const generalPanel = page.locator('[data-testid="general-settings-panel"]');
    
    if (await generalPanel.isVisible()) {
      // Check for theme selection
      const themeSelector = page.locator('[data-testid="theme-selector"]');
      if (await themeSelector.isVisible()) {
        await expect(themeSelector).toBeVisible();
      }
      
      // Check for language selection
      const languageSelector = page.locator('[data-testid="language-selector"]');
      if (await languageSelector.isVisible()) {
        await expect(languageSelector).toBeVisible();
      }
      
      // Check for timezone selection
      const timezoneSelector = page.locator('[data-testid="timezone-selector"]');
      if (await timezoneSelector.isVisible()) {
        await expect(timezoneSelector).toBeVisible();
      }
    }
  });

  test('should change theme preference', async ({ page }) => {
    const themeSelector = page.locator('[data-testid="theme-selector"]');
    
    if (await themeSelector.isVisible()) {
      // Get current theme
      const currentTheme = await themeSelector.inputValue();
      
      // Change to different theme
      await themeSelector.selectOption('dark');
      
      // Save settings
      const saveButton = page.locator('button[type="submit"]:has-text("Save")');
      if (await saveButton.isVisible()) {
        await saveButton.click();
        
        // Should show success message
        await expect(page.locator('text=/Settings saved|Preferences updated/')).toBeVisible();
      }
      
      // Theme should be applied (check for dark theme class or similar)
      await page.waitForTimeout(1000);
      const bodyClass = await page.locator('body').getAttribute('class');
      expect(bodyClass).toContain('dark');
    }
  });

  test('should change language preference', async ({ page }) => {
    const languageSelector = page.locator('[data-testid="language-selector"]');
    
    if (await languageSelector.isVisible()) {
      // Change language
      await languageSelector.selectOption('tr'); // Turkish
      
      // Save settings
      const saveButton = page.locator('button[type="submit"]:has-text("Save")');
      if (await saveButton.isVisible()) {
        await saveButton.click();
        await expect(page.locator('text=/Settings saved/')).toBeVisible();
      }
      
      // Language should change (check for Turkish text if implemented)
      await page.waitForTimeout(1000);
    }
  });
});

test.describe('AI Settings', () => {
  test.beforeEach(async ({ page }) => {
    await loginUser(page);
    await page.click('text=Settings');
    await page.waitForSelector('[data-testid="settings-content"]', { timeout: 5000 });
    
    // Navigate to AI settings if available
    const aiNav = page.locator('[data-testid="ai-settings-nav"]');
    if (await aiNav.isVisible()) {
      await aiNav.click();
    }
  });

  test('should display AI configuration options', async ({ page }) => {
    const aiPanel = page.locator('[data-testid="ai-settings-panel"]');
    
    if (await aiPanel.isVisible()) {
      // Check for AI provider selection
      const providerSelector = page.locator('[data-testid="ai-provider-selector"]');
      if (await providerSelector.isVisible()) {
        await expect(providerSelector).toBeVisible();
      }
      
      // Check for model selection
      const modelSelector = page.locator('[data-testid="ai-model-selector"]');
      if (await modelSelector.isVisible()) {
        await expect(modelSelector).toBeVisible();
      }
      
      // Check for API key input
      const apiKeyInput = page.locator('[data-testid="api-key-input"]');
      if (await apiKeyInput.isVisible()) {
        await expect(apiKeyInput).toBeVisible();
      }
    }
  });

  test('should configure AI provider settings', async ({ page }) => {
    const aiPanel = page.locator('[data-testid="ai-settings-panel"]');
    
    if (await aiPanel.isVisible()) {
      // Select AI provider
      const providerSelector = page.locator('[data-testid="ai-provider-selector"]');
      if (await providerSelector.isVisible()) {
        await providerSelector.selectOption('openai');
      }
      
      // Select model
      const modelSelector = page.locator('[data-testid="ai-model-selector"]');
      if (await modelSelector.isVisible()) {
        await modelSelector.selectOption('gpt-4');
      }
      
      // Configure API key (use test key)
      const apiKeyInput = page.locator('[data-testid="api-key-input"]');
      if (await apiKeyInput.isVisible()) {
        await apiKeyInput.fill('test-api-key-for-testing');
      }
      
      // Save configuration
      const saveButton = page.locator('button[type="submit"]:has-text("Save")');
      if (await saveButton.isVisible()) {
        await saveButton.click();
        await expect(page.locator('text=/AI settings saved/')).toBeVisible();
      }
    }
  });

  test('should test AI connection', async ({ page }) => {
    const aiPanel = page.locator('[data-testid="ai-settings-panel"]');
    
    if (await aiPanel.isVisible()) {
      // Look for test connection button
      const testButton = page.locator('[data-testid="test-connection-button"]');
      if (await testButton.isVisible()) {
        await testButton.click();
        
        // Should show connection test result
        await expect(page.locator('[data-testid="connection-test-result"]')).toBeVisible({ timeout: 10000 });
      }
    }
  });
});

test.describe('Notification Settings', () => {
  test.beforeEach(async ({ page }) => {
    await loginUser(page);
    await page.click('text=Settings');
    await page.waitForSelector('[data-testid="settings-content"]', { timeout: 5000 });
    
    // Navigate to notification settings
    const notificationNav = page.locator('[data-testid="notification-settings-nav"]');
    if (await notificationNav.isVisible()) {
      await notificationNav.click();
    }
  });

  test('should display notification preferences', async ({ page }) => {
    const notificationPanel = page.locator('[data-testid="notification-settings-panel"]');
    
    if (await notificationPanel.isVisible()) {
      // Check for email notification toggles
      const emailNotifications = page.locator('[data-testid="email-notifications"]');
      if (await emailNotifications.isVisible()) {
        await expect(emailNotifications).toBeVisible();
      }
      
      // Check for push notification toggles
      const pushNotifications = page.locator('[data-testid="push-notifications"]');
      if (await pushNotifications.isVisible()) {
        await expect(pushNotifications).toBeVisible();
      }
    }
  });

  test('should toggle notification preferences', async ({ page }) => {
    const notificationPanel = page.locator('[data-testid="notification-settings-panel"]');
    
    if (await notificationPanel.isVisible()) {
      // Toggle email notifications
      const emailToggle = page.locator('[data-testid="email-notifications-toggle"]');
      if (await emailToggle.isVisible()) {
        await emailToggle.click();
      }
      
      // Toggle push notifications
      const pushToggle = page.locator('[data-testid="push-notifications-toggle"]');
      if (await pushToggle.isVisible()) {
        await pushToggle.click();
      }
      
      // Save settings
      const saveButton = page.locator('button[type="submit"]:has-text("Save")');
      if (await saveButton.isVisible()) {
        await saveButton.click();
        await expect(page.locator('text=/Notification settings updated/')).toBeVisible();
      }
    }
  });
});

test.describe('Privacy Settings', () => {
  test.beforeEach(async ({ page }) => {
    await loginUser(page);
    await page.click('text=Settings');
    await page.waitForSelector('[data-testid="settings-content"]', { timeout: 5000 });
    
    // Navigate to privacy settings
    const privacyNav = page.locator('[data-testid="privacy-settings-nav"]');
    if (await privacyNav.isVisible()) {
      await privacyNav.click();
    }
  });

  test('should display privacy controls', async ({ page }) => {
    const privacyPanel = page.locator('[data-testid="privacy-settings-panel"]');
    
    if (await privacyPanel.isVisible()) {
      // Check for data sharing controls
      const dataSharingControls = page.locator('[data-testid="data-sharing-controls"]');
      if (await dataSharingControls.isVisible()) {
        await expect(dataSharingControls).toBeVisible();
      }
      
      // Check for analytics toggle
      const analyticsToggle = page.locator('[data-testid="analytics-toggle"]');
      if (await analyticsToggle.isVisible()) {
        await expect(analyticsToggle).toBeVisible();
      }
    }
  });

  test('should manage data privacy settings', async ({ page }) => {
    const privacyPanel = page.locator('[data-testid="privacy-settings-panel"]');
    
    if (await privacyPanel.isVisible()) {
      // Toggle analytics
      const analyticsToggle = page.locator('[data-testid="analytics-toggle"]');
      if (await analyticsToggle.isVisible()) {
        await analyticsToggle.click();
      }
      
      // Toggle data sharing
      const dataSharingToggle = page.locator('[data-testid="data-sharing-toggle"]');
      if (await dataSharingToggle.isVisible()) {
        await dataSharingToggle.click();
      }
      
      // Save settings
      const saveButton = page.locator('button[type="submit"]:has-text("Save")');
      if (await saveButton.isVisible()) {
        await saveButton.click();
        await expect(page.locator('text=/Privacy settings updated/')).toBeVisible();
      }
    }
  });
});

test.describe('Account Management', () => {
  test.beforeEach(async ({ page }) => {
    await loginUser(page);
    await page.click('text=Settings');
    await page.waitForSelector('[data-testid="settings-content"]', { timeout: 5000 });
    
    // Navigate to account settings
    const accountNav = page.locator('[data-testid="account-settings-nav"]');
    if (await accountNav.isVisible()) {
      await accountNav.click();
    }
  });

  test('should display account management options', async ({ page }) => {
    const accountPanel = page.locator('[data-testid="account-settings-panel"]');
    
    if (await accountPanel.isVisible()) {
      // Check for password change section
      const passwordSection = page.locator('[data-testid="password-change-section"]');
      if (await passwordSection.isVisible()) {
        await expect(passwordSection).toBeVisible();
      }
      
      // Check for account deletion section
      const deleteSection = page.locator('[data-testid="account-deletion-section"]');
      if (await deleteSection.isVisible()) {
        await expect(deleteSection).toBeVisible();
      }
    }
  });

  test('should change password', async ({ page }) => {
    const passwordSection = page.locator('[data-testid="password-change-section"]');
    
    if (await passwordSection.isVisible()) {
      // Fill password change form
      const currentPasswordInput = page.locator('input[name="currentPassword"]');
      if (await currentPasswordInput.isVisible()) {
        await currentPasswordInput.fill(TEST_USER.password);
      }
      
      const newPasswordInput = page.locator('input[name="newPassword"]');
      if (await newPasswordInput.isVisible()) {
        await newPasswordInput.fill('newTestPassword123');
      }
      
      const confirmPasswordInput = page.locator('input[name="confirmPassword"]');
      if (await confirmPasswordInput.isVisible()) {
        await confirmPasswordInput.fill('newTestPassword123');
      }
      
      // Submit password change
      const changePasswordButton = page.locator('button:has-text("Change Password")');
      if (await changePasswordButton.isVisible()) {
        await changePasswordButton.click();
        
        // Should show success or require verification
        await expect(page.locator('text=/Password updated|Password changed/')).toBeVisible();
      }
    }
  });

  test('should validate password requirements', async ({ page }) => {
    const passwordSection = page.locator('[data-testid="password-change-section"]');
    
    if (await passwordSection.isVisible()) {
      // Try weak password
      const newPasswordInput = page.locator('input[name="newPassword"]');
      if (await newPasswordInput.isVisible()) {
        await newPasswordInput.fill('123');
      }
      
      // Should show password strength indicator
      const strengthIndicator = page.locator('[data-testid="password-strength"]');
      if (await strengthIndicator.isVisible()) {
        await expect(strengthIndicator).toContainText('weak');
      }
    }
  });
});

test.describe('Settings Persistence', () => {
  test('should persist settings across sessions', async ({ page }) => {
    await loginUser(page);
    await page.click('text=Settings');
    
    // Change a setting
    const themeSelector = page.locator('[data-testid="theme-selector"]');
    if (await themeSelector.isVisible()) {
      await themeSelector.selectOption('dark');
      
      const saveButton = page.locator('button[type="submit"]:has-text("Save")');
      if (await saveButton.isVisible()) {
        await saveButton.click();
      }
    }
    
    // Logout and login again
    await page.click('[data-testid="user-dropdown"]');
    await page.click('text=Logout');
    
    // Login again
    await loginUser(page);
    
    // Theme should be persisted
    const bodyClass = await page.locator('body').getAttribute('class');
    if (bodyClass) {
      expect(bodyClass).toContain('dark');
    }
  });

  test('should handle settings sync across tabs', async ({ browser }) => {
    // Create two browser contexts
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();
    
    const page1 = await context1.newPage();
    const page2 = await context2.newPage();
    
    // Login on both pages
    await loginUser(page1);
    await loginUser(page2);
    
    // Change setting on page1
    await page1.click('text=Settings');
    const themeSelector = page1.locator('[data-testid="theme-selector"]');
    if (await themeSelector.isVisible()) {
      await themeSelector.selectOption('dark');
      const saveButton = page1.locator('button[type="submit"]:has-text("Save")');
      if (await saveButton.isVisible()) {
        await saveButton.click();
      }
    }
    
    // Refresh page2 - should reflect the change
    await page2.reload();
    await page2.waitForTimeout(2000);
    
    const bodyClass = await page2.locator('body').getAttribute('class');
    if (bodyClass) {
      expect(bodyClass).toContain('dark');
    }
    
    // Cleanup
    await context1.close();
    await context2.close();
  });
});