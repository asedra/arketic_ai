/**
 * Chat Interface E2E Tests using Playwright MCP
 * 
 * This test suite validates the chat interface functionality
 * including message sending, real-time updates, WebSocket communication,
 * and AI assistant interactions.
 * 
 * Author: Claude
 * Created: 2025-08-10 (AR-82 Implementation)
 */

import { test, expect } from '@playwright/test';

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';
const API_URL = process.env.API_URL || 'http://localhost:8000';

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

test.describe('Chat Interface', () => {
  test.beforeEach(async ({ page }) => {
    await loginUser(page);
    
    // Navigate to chat
    await page.click('text=Chat');
    await page.waitForSelector('[data-testid="chat-content"]', { timeout: 5000 });
  });

  test('should display chat interface correctly', async ({ page }) => {
    // Check for main chat components
    await expect(page.locator('[data-testid="chat-sidebar"]')).toBeVisible();
    await expect(page.locator('[data-testid="chat-window"]')).toBeVisible();
    await expect(page.locator('[data-testid="message-input"]')).toBeVisible();
    
    // Check for chat controls
    await expect(page.locator('button[data-testid="send-message"]')).toBeVisible();
    await expect(page.locator('[data-testid="new-chat-button"]')).toBeVisible();
  });

  test('should create a new chat session', async ({ page }) => {
    // Click new chat button
    await page.click('[data-testid="new-chat-button"]');
    
    // Should create a new chat item in sidebar
    await expect(page.locator('[data-testid="chat-list"] .chat-item').first()).toBeVisible();
    
    // Chat window should be empty
    const messagesList = page.locator('[data-testid="messages-list"]');
    await expect(messagesList.locator('.message')).toHaveCount(0);
  });

  test('should send a text message', async ({ page }) => {
    // Create new chat
    await page.click('[data-testid="new-chat-button"]');
    
    const testMessage = 'Hello, this is a test message';
    
    // Type message
    await page.fill('[data-testid="message-input"]', testMessage);
    
    // Send message
    await page.click('button[data-testid="send-message"]');
    
    // Message should appear in chat
    await expect(page.locator('[data-testid="messages-list"] .message').last()).toContainText(testMessage);
    
    // Input should be cleared
    await expect(page.locator('[data-testid="message-input"]')).toHaveValue('');
  });

  test('should send message with Enter key', async ({ page }) => {
    // Create new chat
    await page.click('[data-testid="new-chat-button"]');
    
    const testMessage = 'Testing Enter key functionality';
    
    // Type message and press Enter
    await page.fill('[data-testid="message-input"]', testMessage);
    await page.press('[data-testid="message-input"]', 'Enter');
    
    // Message should appear
    await expect(page.locator('[data-testid="messages-list"] .message').last()).toContainText(testMessage);
  });

  test('should handle Shift+Enter for new lines', async ({ page }) => {
    // Create new chat
    await page.click('[data-testid="new-chat-button"]');
    
    // Type message with Shift+Enter
    await page.focus('[data-testid="message-input"]');
    await page.keyboard.type('Line 1');
    await page.keyboard.press('Shift+Enter');
    await page.keyboard.type('Line 2');
    
    // Should have multiline text
    const inputValue = await page.inputValue('[data-testid="message-input"]');
    expect(inputValue).toContain('\n');
  });

  test('should display typing indicator', async ({ page }) => {
    // Create new chat
    await page.click('[data-testid="new-chat-button"]');
    
    // Send a message that triggers AI response
    await page.fill('[data-testid="message-input"]', 'What is artificial intelligence?');
    await page.click('button[data-testid="send-message"]');
    
    // Should show typing indicator
    await expect(page.locator('[data-testid="typing-indicator"]')).toBeVisible({ timeout: 2000 });
    
    // Typing indicator should disappear when response arrives
    await expect(page.locator('[data-testid="typing-indicator"]')).not.toBeVisible({ timeout: 30000 });
  });

  test('should receive AI response', async ({ page }) => {
    // Create new chat
    await page.click('[data-testid="new-chat-button"]');
    
    // Send a message
    await page.fill('[data-testid="message-input"]', 'Tell me about machine learning');
    await page.click('button[data-testid="send-message"]');
    
    // Wait for AI response
    await page.waitForSelector('[data-testid="messages-list"] .message.ai-message', { timeout: 30000 });
    
    // Check that AI response is present
    const aiMessages = page.locator('[data-testid="messages-list"] .message.ai-message');
    await expect(aiMessages).toHaveCount(1);
    
    // AI message should have content
    const aiMessageText = await aiMessages.first().textContent();
    expect(aiMessageText?.length).toBeGreaterThan(10);
  });

  test('should handle message history', async ({ page }) => {
    // Create new chat
    await page.click('[data-testid="new-chat-button"]');
    
    // Send multiple messages
    const messages = ['First message', 'Second message', 'Third message'];
    
    for (const message of messages) {
      await page.fill('[data-testid="message-input"]', message);
      await page.click('button[data-testid="send-message"]');
      await page.waitForTimeout(1000); // Wait between messages
    }
    
    // All messages should be visible
    for (const message of messages) {
      await expect(page.locator(`[data-testid="messages-list"] .message:has-text("${message}")`)).toBeVisible();
    }
  });

  test('should persist chat sessions', async ({ page }) => {
    // Create new chat and send message
    await page.click('[data-testid="new-chat-button"]');
    const testMessage = 'This message should persist';
    
    await page.fill('[data-testid="message-input"]', testMessage);
    await page.click('button[data-testid="send-message"]');
    
    // Wait for message to appear
    await expect(page.locator(`[data-testid="messages-list"] .message:has-text("${testMessage}")`)).toBeVisible();
    
    // Navigate away and back
    await page.click('text=Knowledge');
    await page.waitForSelector('[data-testid="knowledge-content"]');
    
    await page.click('text=Chat');
    await page.waitForSelector('[data-testid="chat-content"]');
    
    // Message should still be there
    await expect(page.locator(`[data-testid="messages-list"] .message:has-text("${testMessage}")`)).toBeVisible();
  });
});

test.describe('Chat Sidebar Management', () => {
  test.beforeEach(async ({ page }) => {
    await loginUser(page);
    await page.click('text=Chat');
    await page.waitForSelector('[data-testid="chat-content"]', { timeout: 5000 });
  });

  test('should list existing chat sessions', async ({ page }) => {
    // Create a few chats
    for (let i = 1; i <= 3; i++) {
      await page.click('[data-testid="new-chat-button"]');
      await page.fill('[data-testid="message-input"]', `Test message ${i}`);
      await page.click('button[data-testid="send-message"]');
      await page.waitForTimeout(1000);
    }
    
    // Check sidebar has chat items
    const chatItems = page.locator('[data-testid="chat-list"] .chat-item');
    await expect(chatItems).toHaveCount(3);
  });

  test('should switch between chat sessions', async ({ page }) => {
    // Create two chats with different messages
    await page.click('[data-testid="new-chat-button"]');
    await page.fill('[data-testid="message-input"]', 'Message in chat 1');
    await page.click('button[data-testid="send-message"]');
    
    await page.click('[data-testid="new-chat-button"]');
    await page.fill('[data-testid="message-input"]', 'Message in chat 2');
    await page.click('button[data-testid="send-message"]');
    
    // Click on first chat in sidebar
    await page.click('[data-testid="chat-list"] .chat-item:first-child');
    
    // Should show first chat's message
    await expect(page.locator('[data-testid="messages-list"]')).toContainText('Message in chat 1');
  });

  test('should delete chat session', async ({ page }) => {
    // Create a chat
    await page.click('[data-testid="new-chat-button"]');
    await page.fill('[data-testid="message-input"]', 'This chat will be deleted');
    await page.click('button[data-testid="send-message"]');
    
    // Click delete button on chat item
    const chatItem = page.locator('[data-testid="chat-list"] .chat-item').first();
    await chatItem.hover();
    await chatItem.locator('[data-testid="delete-chat"]').click();
    
    // Confirm deletion
    await page.click('button:has-text("Delete")');
    
    // Chat should be removed from sidebar
    await expect(page.locator('[data-testid="chat-list"] .chat-item')).toHaveCount(0);
  });

  test('should rename chat session', async ({ page }) => {
    // Create a chat
    await page.click('[data-testid="new-chat-button"]');
    await page.fill('[data-testid="message-input"]', 'Test message for renaming');
    await page.click('button[data-testid="send-message"]');
    
    // Click rename button
    const chatItem = page.locator('[data-testid="chat-list"] .chat-item').first();
    await chatItem.hover();
    await chatItem.locator('[data-testid="rename-chat"]').click();
    
    // Enter new name
    const newName = 'Renamed Chat Session';
    await page.fill('[data-testid="chat-name-input"]', newName);
    await page.press('[data-testid="chat-name-input"]', 'Enter');
    
    // Chat should show new name
    await expect(chatItem).toContainText(newName);
  });
});

test.describe('AI Assistant Integration', () => {
  test.beforeEach(async ({ page }) => {
    await loginUser(page);
    await page.click('text=Chat');
    await page.waitForSelector('[data-testid="chat-content"]', { timeout: 5000 });
  });

  test('should select different AI assistants', async ({ page }) => {
    // Create new chat
    await page.click('[data-testid="new-chat-button"]');
    
    // Open assistant selector if available
    const assistantSelector = page.locator('[data-testid="assistant-selector"]');
    if (await assistantSelector.isVisible()) {
      await assistantSelector.click();
      
      // Select different assistant
      await page.click('[data-testid="assistant-option"]').first();
      
      // Send test message
      await page.fill('[data-testid="message-input"]', 'Hello from different assistant');
      await page.click('button[data-testid="send-message"]');
      
      // Should receive response
      await expect(page.locator('[data-testid="messages-list"] .message.ai-message')).toBeVisible({ timeout: 30000 });
    }
  });

  test('should handle streaming responses', async ({ page }) => {
    // Create new chat
    await page.click('[data-testid="new-chat-button"]');
    
    // Send message that should trigger streaming
    await page.fill('[data-testid="message-input"]', 'Write a long explanation about quantum computing');
    await page.click('button[data-testid="send-message"]');
    
    // Should show streaming indicator
    await expect(page.locator('[data-testid="streaming-indicator"]')).toBeVisible({ timeout: 5000 });
    
    // Wait for response to complete
    await expect(page.locator('[data-testid="streaming-indicator"]')).not.toBeVisible({ timeout: 60000 });
    
    // Should have complete response
    const aiMessage = page.locator('[data-testid="messages-list"] .message.ai-message').last();
    const responseText = await aiMessage.textContent();
    expect(responseText?.length).toBeGreaterThan(50);
  });
});

test.describe('Chat Settings and Preferences', () => {
  test.beforeEach(async ({ page }) => {
    await loginUser(page);
    await page.click('text=Chat');
    await page.waitForSelector('[data-testid="chat-content"]', { timeout: 5000 });
  });

  test('should access chat settings', async ({ page }) => {
    // Look for settings button
    const settingsButton = page.locator('[data-testid="chat-settings"]');
    if (await settingsButton.isVisible()) {
      await settingsButton.click();
      
      // Should open settings panel
      await expect(page.locator('[data-testid="chat-settings-panel"]')).toBeVisible();
    }
  });

  test('should toggle chat features', async ({ page }) => {
    // Check for feature toggles in settings
    const settingsButton = page.locator('[data-testid="chat-settings"]');
    if (await settingsButton.isVisible()) {
      await settingsButton.click();
      
      // Toggle streaming responses
      const streamingToggle = page.locator('[data-testid="streaming-toggle"]');
      if (await streamingToggle.isVisible()) {
        await streamingToggle.click();
      }
      
      // Toggle typing indicators
      const typingToggle = page.locator('[data-testid="typing-toggle"]');
      if (await typingToggle.isVisible()) {
        await typingToggle.click();
      }
    }
  });
});

test.describe('Error Handling', () => {
  test.beforeEach(async ({ page }) => {
    await loginUser(page);
    await page.click('text=Chat');
    await page.waitForSelector('[data-testid="chat-content"]', { timeout: 5000 });
  });

  test('should handle network errors gracefully', async ({ page }) => {
    // Create new chat
    await page.click('[data-testid="new-chat-button"]');
    
    // Simulate network failure
    await page.route('**/api/v1/chat/**', route => route.abort());
    
    // Try to send message
    await page.fill('[data-testid="message-input"]', 'This should fail');
    await page.click('button[data-testid="send-message"]');
    
    // Should show error message
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('[data-testid="error-message"]')).toContainText('network');
  });

  test('should handle empty messages', async ({ page }) => {
    // Create new chat
    await page.click('[data-testid="new-chat-button"]');
    
    // Try to send empty message
    await page.click('button[data-testid="send-message"]');
    
    // Should not send empty message
    const messages = page.locator('[data-testid="messages-list"] .message');
    await expect(messages).toHaveCount(0);
  });

  test('should handle very long messages', async ({ page }) => {
    // Create new chat
    await page.click('[data-testid="new-chat-button"]');
    
    // Create very long message
    const longMessage = 'This is a very long message. '.repeat(1000);
    
    // Try to send long message
    await page.fill('[data-testid="message-input"]', longMessage);
    await page.click('button[data-testid="send-message"]');
    
    // Should either send successfully or show appropriate error
    await page.waitForTimeout(2000);
    
    const messages = page.locator('[data-testid="messages-list"] .message');
    const errorMessage = page.locator('[data-testid="error-message"]');
    
    // Either message was sent or error was shown
    const messageCount = await messages.count();
    const errorVisible = await errorMessage.isVisible();
    
    expect(messageCount > 0 || errorVisible).toBeTruthy();
  });
});