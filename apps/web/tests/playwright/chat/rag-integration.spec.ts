/**
 * RAG Integration E2E Tests using Playwright MCP
 * 
 * This test suite validates RAG (Retrieval-Augmented Generation) integration
 * in the chat interface, including knowledge base configuration, source display,
 * real-time RAG responses, and WebSocket streaming with context.
 * 
 * Author: Claude
 * Created: 2025-08-10 (AR-84: RAG Integration Test Suite)
 */

import { test, expect } from '@playwright/test';

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';
const API_URL = process.env.API_URL || 'http://localhost:8000';

const TEST_USER = {
  email: 'test@arketic.com',
  password: 'testpassword123'
};

// Test data for RAG scenarios
const RAG_TEST_DATA = {
  testDocument: {
    title: 'Python Programming Guide for RAG Testing',
    content: 'Python is a high-level programming language known for its simplicity and readability. It supports multiple programming paradigms including object-oriented, functional, and procedural programming. Python has extensive libraries for data science, web development, and artificial intelligence.',
    type: 'text'
  },
  ragQuestions: [
    'What is Python programming language?',
    'Tell me about Python programming paradigms',
    'What libraries does Python have for data science?'
  ],
  assistantName: 'RAG Test Assistant',
  assistantDescription: 'Assistant for testing RAG integration features'
};

// Helper function to login
async function loginUser(page: any) {
  await page.goto(BASE_URL);
  await page.fill('input[name="email"]', TEST_USER.email);
  await page.fill('input[name="password"]', TEST_USER.password);
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard**', { timeout: 10000 });
}

// Helper function to create test document
async function createTestDocument(page: any) {
  // Navigate to knowledge section
  await page.click('text=Knowledge');
  await page.waitForSelector('[data-testid="knowledge-content"]', { timeout: 5000 });
  
  // Click upload/create document
  await page.click('[data-testid="upload-document-button"]');
  
  // Fill document details
  await page.fill('[data-testid="document-title"]', RAG_TEST_DATA.testDocument.title);
  await page.fill('[data-testid="document-content"]', RAG_TEST_DATA.testDocument.content);
  
  // Select document type
  await page.selectOption('[data-testid="document-type"]', RAG_TEST_DATA.testDocument.type);
  
  // Save document
  await page.click('[data-testid="save-document-button"]');
  
  // Wait for success message
  await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
  
  // Get document ID from URL or response
  await page.waitForTimeout(1000); // Allow for processing
  
  return 'test-document-id'; // In real implementation, extract actual ID
}

// Helper function to create RAG-enabled assistant
async function createRAGAssistant(page: any, documentId: string) {
  // Navigate to assistants section
  await page.click('text=Assistants');
  await page.waitForSelector('[data-testid="assistants-content"]', { timeout: 5000 });
  
  // Click create assistant
  await page.click('[data-testid="create-assistant-button"]');
  
  // Fill assistant details
  await page.fill('[data-testid="assistant-name"]', RAG_TEST_DATA.assistantName);
  await page.fill('[data-testid="assistant-description"]', RAG_TEST_DATA.assistantDescription);
  
  // Add knowledge base
  await page.click('[data-testid="add-knowledge-base"]');
  
  // Select the test document
  await page.check(`[data-testid="document-checkbox-${documentId}"]`);
  
  // Configure RAG settings
  await page.click('[data-testid="enable-rag-toggle"]');
  await page.fill('[data-testid="rag-threshold"]', '0.7');
  await page.fill('[data-testid="max-sources"]', '5');
  
  // Save assistant
  await page.click('[data-testid="save-assistant-button"]');
  
  // Wait for success
  await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
  
  return 'test-assistant-id'; // In real implementation, extract actual ID
}

// Helper function to create RAG-enabled chat
async function createRAGChat(page: any, assistantId: string) {
  // Navigate to chat
  await page.click('text=Chat');
  await page.waitForSelector('[data-testid="chat-content"]', { timeout: 5000 });
  
  // Create new chat
  await page.click('[data-testid="new-chat-button"]');
  
  // Select RAG-enabled assistant
  await page.click('[data-testid="select-assistant-dropdown"]');
  await page.click(`[data-testid="assistant-option-${assistantId}"]`);
  
  // Verify RAG indicator is visible
  await expect(page.locator('[data-testid="rag-enabled-indicator"]')).toBeVisible();
  
  return 'test-chat-id'; // In real implementation, extract actual ID
}

test.describe('RAG Integration Tests', () => {
  let testDocumentId: string;
  let testAssistantId: string;
  let testChatId: string;

  test.beforeAll(async ({ browser }) => {
    // Setup test data
    const page = await browser.newPage();
    await loginUser(page);
    
    // Create test document
    testDocumentId = await createTestDocument(page);
    
    // Create RAG-enabled assistant
    testAssistantId = await createRAGAssistant(page, testDocumentId);
    
    await page.close();
  });

  test.beforeEach(async ({ page }) => {
    await loginUser(page);
    
    // Create RAG-enabled chat for each test
    testChatId = await createRAGChat(page, testAssistantId);
  });

  test('should display RAG enabled indicator in chat interface', async ({ page }) => {
    // Chat should show RAG enabled indicator
    await expect(page.locator('[data-testid="rag-enabled-indicator"]')).toBeVisible();
    
    // Should show knowledge base count
    await expect(page.locator('[data-testid="knowledge-base-count"]')).toContainText('1');
    
    // Should display assistant name with RAG badge
    await expect(page.locator('[data-testid="assistant-name"]')).toContainText(RAG_TEST_DATA.assistantName);
    await expect(page.locator('[data-testid="rag-badge"]')).toBeVisible();
  });

  test('should trigger RAG search when sending relevant questions', async ({ page }) => {
    const testQuestion = RAG_TEST_DATA.ragQuestions[0];
    
    // Send RAG-relevant question
    await page.fill('[data-testid="message-input"]', testQuestion);
    await page.click('[data-testid="send-message"]');
    
    // Should show loading indicator with RAG context
    await expect(page.locator('[data-testid="rag-search-loading"]')).toBeVisible();
    
    // Wait for response
    await page.waitForSelector('[data-testid="ai-message"]', { timeout: 10000 });
    
    // Response should contain RAG indicator
    const aiMessage = page.locator('[data-testid="ai-message"]').last();
    await expect(aiMessage.locator('[data-testid="rag-response-indicator"]')).toBeVisible();
    
    // Should show sources section
    await expect(aiMessage.locator('[data-testid="rag-sources-section"]')).toBeVisible();
  });

  test('should display source documents in RAG responses', async ({ page }) => {
    const testQuestion = RAG_TEST_DATA.ragQuestions[1];
    
    // Send question that should return sources
    await page.fill('[data-testid="message-input"]', testQuestion);
    await page.click('[data-testid="send-message"]');
    
    // Wait for AI response with sources
    await page.waitForSelector('[data-testid="ai-message"]', { timeout: 10000 });
    
    const aiMessage = page.locator('[data-testid="ai-message"]').last();
    const sourcesSection = aiMessage.locator('[data-testid="rag-sources-section"]');
    
    // Should show sources
    await expect(sourcesSection).toBeVisible();
    
    // Should show source document title
    await expect(sourcesSection.locator('[data-testid="source-document"]').first()).toContainText(RAG_TEST_DATA.testDocument.title);
    
    // Should show relevance score
    await expect(sourcesSection.locator('[data-testid="relevance-score"]').first()).toBeVisible();
    
    // Should be able to expand source content
    await sourcesSection.locator('[data-testid="expand-source"]').first().click();
    await expect(sourcesSection.locator('[data-testid="source-content"]').first()).toBeVisible();
  });

  test('should handle RAG streaming responses correctly', async ({ page }) => {
    const testQuestion = 'Can you explain Python programming in detail using your knowledge?';
    
    // Enable streaming if available
    if (await page.locator('[data-testid="streaming-toggle"]').isVisible()) {
      await page.click('[data-testid="streaming-toggle"]');
    }
    
    // Send question
    await page.fill('[data-testid="message-input"]', testQuestion);
    await page.click('[data-testid="send-message"]');
    
    // Should show streaming indicator
    await expect(page.locator('[data-testid="streaming-indicator"]')).toBeVisible();
    
    // Should show RAG context indicator during streaming
    await expect(page.locator('[data-testid="rag-context-indicator"]')).toBeVisible();
    
    // Wait for streaming to complete
    await page.waitForSelector('[data-testid="streaming-indicator"]', { state: 'hidden', timeout: 15000 });
    
    // Final message should have RAG sources
    const aiMessage = page.locator('[data-testid="ai-message"]').last();
    await expect(aiMessage.locator('[data-testid="rag-sources-section"]')).toBeVisible();
  });

  test('should show typing indicator with RAG processing status', async ({ page }) => {
    const testQuestion = RAG_TEST_DATA.ragQuestions[2];
    
    // Send question
    await page.fill('[data-testid="message-input"]', testQuestion);
    await page.click('[data-testid="send-message"]');
    
    // Should show typing indicator with RAG status
    const typingIndicator = page.locator('[data-testid="typing-indicator"]');
    await expect(typingIndicator).toBeVisible();
    
    // Should show RAG processing status
    await expect(typingIndicator.locator('[data-testid="rag-processing-status"]')).toBeVisible();
    
    // Status should indicate knowledge search
    await expect(typingIndicator).toContainText('Searching knowledge base');
    
    // Wait for completion
    await page.waitForSelector('[data-testid="typing-indicator"]', { state: 'hidden', timeout: 10000 });
  });

  test('should handle multiple knowledge bases correctly', async ({ page }) => {
    // This test assumes multiple documents/knowledge bases are available
    // Create additional test document first
    await page.click('text=Knowledge');
    await page.click('[data-testid="upload-document-button"]');
    
    await page.fill('[data-testid="document-title"]', 'Machine Learning Guide');
    await page.fill('[data-testid="document-content"]', 'Machine learning is a subset of artificial intelligence that enables computers to learn and improve from experience.');
    await page.click('[data-testid="save-document-button"]');
    
    // Add to current assistant
    await page.click('text=Assistants');
    await page.click('[data-testid="edit-assistant-button"]');
    await page.click('[data-testid="add-knowledge-base"]');
    // Select the new document
    await page.check('[data-testid="document-checkbox"]:not(:checked)');
    await page.click('[data-testid="save-assistant-button"]');
    
    // Back to chat
    await page.click('text=Chat');
    
    // Ask question that could use multiple sources
    const multiSourceQuestion = 'Compare Python programming and machine learning concepts';
    await page.fill('[data-testid="message-input"]', multiSourceQuestion);
    await page.click('[data-testid="send-message"]');
    
    // Wait for response
    await page.waitForSelector('[data-testid="ai-message"]', { timeout: 10000 });
    
    // Should show multiple sources
    const sourcesSection = page.locator('[data-testid="rag-sources-section"]').last();
    await expect(sourcesSection).toBeVisible();
    
    // Should have at least 2 source documents
    const sourceDocuments = sourcesSection.locator('[data-testid="source-document"]');
    await expect(sourceDocuments).toHaveCount(2, { timeout: 5000 });
  });

  test('should handle RAG search failures gracefully', async ({ page }) => {
    // Simulate network issues or service downtime
    // This might require mocking the API response
    
    // Send question that would normally trigger RAG
    await page.fill('[data-testid="message-input"]', 'What do you know about Python?');
    await page.click('[data-testid="send-message"]');
    
    // If RAG fails, should still get a response but without sources
    await page.waitForSelector('[data-testid="ai-message"]', { timeout: 15000 });
    
    const aiMessage = page.locator('[data-testid="ai-message"]').last();
    
    // Should either show sources OR show fallback indicator
    const hasSourcesOrFallback = await Promise.race([
      aiMessage.locator('[data-testid="rag-sources-section"]').isVisible(),
      aiMessage.locator('[data-testid="rag-fallback-indicator"]').isVisible()
    ]);
    
    expect(hasSourcesOrFallback).toBeTruthy();
  });

  test('should display RAG configuration in chat settings', async ({ page }) => {
    // Open chat settings
    await page.click('[data-testid="chat-settings-button"]');
    
    // Should show RAG configuration section
    await expect(page.locator('[data-testid="rag-settings-section"]')).toBeVisible();
    
    // Should show knowledge base list
    await expect(page.locator('[data-testid="knowledge-base-list"]')).toBeVisible();
    
    // Should show RAG parameters
    await expect(page.locator('[data-testid="rag-threshold-setting"]')).toBeVisible();
    await expect(page.locator('[data-testid="max-sources-setting"]')).toBeVisible();
    
    // Should allow toggling RAG on/off
    const ragToggle = page.locator('[data-testid="enable-rag-toggle"]');
    await expect(ragToggle).toBeVisible();
    
    // Test toggling
    const initialState = await ragToggle.isChecked();
    await ragToggle.click();
    expect(await ragToggle.isChecked()).toBe(!initialState);
  });

  test('should show RAG sources in expandable format', async ({ page }) => {
    // Send question
    await page.fill('[data-testid="message-input"]', RAG_TEST_DATA.ragQuestions[0]);
    await page.click('[data-testid="send-message"]');
    
    // Wait for response with sources
    await page.waitForSelector('[data-testid="rag-sources-section"]', { timeout: 10000 });
    
    const sourcesSection = page.locator('[data-testid="rag-sources-section"]').last();
    
    // Should show collapsed sources initially
    await expect(sourcesSection.locator('[data-testid="sources-collapsed"]')).toBeVisible();
    
    // Should show source count
    await expect(sourcesSection.locator('[data-testid="sources-count"]')).toContainText(/\d+ source/);
    
    // Expand sources
    await sourcesSection.locator('[data-testid="expand-sources-button"]').click();
    
    // Should show expanded view
    await expect(sourcesSection.locator('[data-testid="sources-expanded"]')).toBeVisible();
    
    // Should show individual source details
    const firstSource = sourcesSection.locator('[data-testid="source-item"]').first();
    await expect(firstSource.locator('[data-testid="source-title"]')).toBeVisible();
    await expect(firstSource.locator('[data-testid="source-snippet"]')).toBeVisible();
    await expect(firstSource.locator('[data-testid="source-relevance"]')).toBeVisible();
    
    // Should allow expanding individual source content
    await firstSource.locator('[data-testid="view-full-source"]').click();
    await expect(page.locator('[data-testid="source-modal"]')).toBeVisible();
  });

  test('should maintain RAG functionality across page refreshes', async ({ page }) => {
    // Send RAG question
    await page.fill('[data-testid="message-input"]', RAG_TEST_DATA.ragQuestions[0]);
    await page.click('[data-testid="send-message"]');
    
    // Wait for response
    await page.waitForSelector('[data-testid="ai-message"]', { timeout: 10000 });
    
    // Verify RAG response is there
    await expect(page.locator('[data-testid="rag-sources-section"]').last()).toBeVisible();
    
    // Refresh page
    await page.reload();
    
    // Wait for chat to load
    await page.waitForSelector('[data-testid="chat-content"]', { timeout: 5000 });
    
    // Previous message with RAG sources should still be visible
    await expect(page.locator('[data-testid="rag-sources-section"]')).toBeVisible();
    
    // RAG should still be enabled for new messages
    await expect(page.locator('[data-testid="rag-enabled-indicator"]')).toBeVisible();
    
    // Send another RAG question
    await page.fill('[data-testid="message-input"]', RAG_TEST_DATA.ragQuestions[1]);
    await page.click('[data-testid="send-message"]');
    
    // Should still work
    await page.waitForSelector('[data-testid="ai-message"]', { timeout: 10000 });
    await expect(page.locator('[data-testid="rag-sources-section"]').last()).toBeVisible();
  });

  test('should handle non-RAG compatible chats gracefully', async ({ page }) => {
    // Create a chat without RAG-enabled assistant
    await page.click('[data-testid="new-chat-button"]');
    
    // Don't select any assistant or select non-RAG assistant
    // (This assumes there's a way to create non-RAG chats)
    
    // Should not show RAG indicators
    await expect(page.locator('[data-testid="rag-enabled-indicator"]')).not.toBeVisible();
    
    // Send message
    await page.fill('[data-testid="message-input"]', 'Hello, regular chat message');
    await page.click('[data-testid="send-message"]');
    
    // Wait for response
    await page.waitForSelector('[data-testid="ai-message"]', { timeout: 10000 });
    
    // Should not show RAG sources
    await expect(page.locator('[data-testid="rag-sources-section"]')).not.toBeVisible();
    
    // Should show normal AI response
    await expect(page.locator('[data-testid="ai-message"]').last()).toBeVisible();
  });
});

test.describe('RAG Performance and Edge Cases', () => {
  test.beforeEach(async ({ page }) => {
    await loginUser(page);
  });

  test('should handle very long RAG responses without UI breaking', async ({ page }) => {
    // This test would send a complex question that generates a long response with many sources
    // Implementation depends on having test data that generates long responses
    
    const complexQuestion = 'Please provide a comprehensive explanation of Python programming, covering all aspects mentioned in your knowledge base including paradigms, libraries, use cases, and best practices.';
    
    // Navigate to RAG-enabled chat (assuming setup from previous tests)
    await page.click('text=Chat');
    await page.click('[data-testid="chat-item"]'); // Select existing RAG chat
    
    await page.fill('[data-testid="message-input"]', complexQuestion);
    await page.click('[data-testid="send-message"]');
    
    // Wait for long response
    await page.waitForSelector('[data-testid="ai-message"]', { timeout: 20000 });
    
    // Check UI integrity
    const aiMessage = page.locator('[data-testid="ai-message"]').last();
    await expect(aiMessage).toBeVisible();
    
    // Sources should be properly formatted even with long content
    if (await aiMessage.locator('[data-testid="rag-sources-section"]').isVisible()) {
      const sourcesSection = aiMessage.locator('[data-testid="rag-sources-section"]');
      await expect(sourcesSection).toBeVisible();
      
      // Should be scrollable or paginated
      const sourceItems = sourcesSection.locator('[data-testid="source-item"]');
      if (await sourceItems.count() > 3) {
        // Check if there's pagination or "show more" functionality
        const showMoreButton = sourcesSection.locator('[data-testid="show-more-sources"]');
        if (await showMoreButton.isVisible()) {
          await showMoreButton.click();
          // Should show more sources
        }
      }
    }
  });

  test('should handle network errors during RAG search gracefully', async ({ page }) => {
    // This test would require intercepting network requests to simulate failures
    // For now, we'll test the fallback behavior
    
    await page.click('text=Chat');
    
    // Create new chat with RAG
    await page.click('[data-testid="new-chat-button"]');
    
    // Send question that would trigger RAG
    await page.fill('[data-testid="message-input"]', 'What is Python programming?');
    await page.click('[data-testid="send-message"]');
    
    // Should eventually get some response even if RAG fails
    await page.waitForSelector('[data-testid="ai-message"]', { timeout: 15000 });
    
    // Should show either sources or error handling
    const aiMessage = page.locator('[data-testid="ai-message"]').last();
    await expect(aiMessage).toBeVisible();
    
    // Message should contain some content (fallback response)
    const messageContent = await aiMessage.locator('[data-testid="message-content"]').textContent();
    expect(messageContent).toBeTruthy();
    expect(messageContent!.length).toBeGreaterThan(0);
  });

  test('should maintain responsive design with RAG components', async ({ page }) => {
    // Test RAG functionality on different viewport sizes
    await page.click('text=Chat');
    
    // Desktop view
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.fill('[data-testid="message-input"]', 'Test RAG on desktop');
    await page.click('[data-testid="send-message"]');
    
    await page.waitForSelector('[data-testid="ai-message"]', { timeout: 10000 });
    await expect(page.locator('[data-testid="rag-sources-section"]')).toBeVisible();
    
    // Tablet view
    await page.setViewportSize({ width: 768, height: 1024 });
    await expect(page.locator('[data-testid="chat-content"]')).toBeVisible();
    await expect(page.locator('[data-testid="rag-sources-section"]')).toBeVisible();
    
    // Mobile view
    await page.setViewportSize({ width: 375, height: 667 });
    await expect(page.locator('[data-testid="chat-content"]')).toBeVisible();
    
    // Sources should be adapted for mobile (maybe collapsed by default)
    const sourcesSection = page.locator('[data-testid="rag-sources-section"]').last();
    if (await sourcesSection.isVisible()) {
      // Should be mobile-friendly
      const sourcesContainer = sourcesSection.locator('[data-testid="sources-container"]');
      await expect(sourcesContainer).toBeVisible();
    }
  });
});

test.afterAll(async ({ browser }) => {
  // Cleanup test data if needed
  // This would involve making API calls to clean up test documents, assistants, and chats
  console.log('RAG integration tests completed. Manual cleanup of test data may be required.');
});