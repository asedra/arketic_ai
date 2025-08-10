import { test, expect, Page } from '@playwright/test';
import path from 'path';
import fs from 'fs';

test.describe('Chat RAG Integration Tests', () => {
  let testAssistantId: string;
  let testChatId: string;
  let testKnowledgeIds: string[] = [];
  let testFiles: string[] = [];

  test.beforeAll(async () => {
    // Create comprehensive test documents
    const testDir = path.join(process.cwd(), 'test-chat-rag-files');
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }

    const testDocuments = [
      {
        filename: 'customer_support_faq.md',
        content: `# Customer Support FAQ
        
        ## Account Management
        
        ### How do I reset my password?
        1. Click on "Forgot Password" on the login page
        2. Enter your registered email address
        3. Check your email for a reset link
        4. Follow the link and create a new password
        5. Password must be at least 8 characters with one uppercase, one number, and one special character
        
        ### How do I upgrade my subscription?
        - Go to Settings > Billing
        - Click "Upgrade Plan"
        - Select your desired plan
        - Enter payment information
        - Confirm the upgrade
        
        ### Can I cancel my subscription?
        Yes, you can cancel anytime from Settings > Billing > Cancel Subscription.
        - No cancellation fees
        - Access continues until end of billing period
        - Data retained for 30 days after cancellation
        
        ## Technical Issues
        
        ### System is running slow
        Common causes and solutions:
        - Clear browser cache and cookies
        - Check internet connection speed (minimum 10 Mbps recommended)
        - Disable browser extensions
        - Try a different browser (Chrome, Firefox, Safari supported)
        - Contact support if issue persists
        
        ### File upload failures
        - Maximum file size: 50MB
        - Supported formats: PDF, DOC, DOCX, TXT, MD, JSON, CSV
        - Check file isn't corrupted
        - Ensure stable internet connection
        - Try uploading in smaller batches`
      },
      {
        filename: 'api_documentation.json',
        content: JSON.stringify({
          "endpoints": {
            "chat": {
              "create": {
                "method": "POST",
                "path": "/api/chats",
                "body": {
                  "title": "string",
                  "assistant_id": "uuid"
                }
              },
              "message": {
                "method": "POST",
                "path": "/api/chats/{chat_id}/messages",
                "body": {
                  "content": "string",
                  "attachments": "array"
                }
              },
              "history": {
                "method": "GET",
                "path": "/api/chats/{chat_id}/messages",
                "params": {
                  "limit": "number",
                  "offset": "number"
                }
              }
            },
            "rag": {
              "search": {
                "method": "POST",
                "path": "/api/knowledge/search",
                "body": {
                  "query": "string",
                  "filters": "object",
                  "limit": "number"
                }
              },
              "retrieve": {
                "method": "POST",
                "path": "/api/knowledge/retrieve",
                "body": {
                  "query": "string",
                  "knowledge_ids": "array",
                  "max_results": "number",
                  "threshold": "number"
                }
              }
            }
          },
          "websocket": {
            "url": "ws://localhost:8000/ws",
            "events": {
              "message": "New message received",
              "typing": "User typing indicator",
              "presence": "User online/offline status",
              "error": "Error notifications"
            }
          }
        }, null, 2)
      },
      {
        filename: 'best_practices.txt',
        content: `RAG System Best Practices

        1. Document Preparation
        - Use clear, structured content
        - Include relevant keywords and concepts
        - Break long documents into logical sections
        - Use consistent formatting
        
        2. Query Optimization
        - Be specific in your questions
        - Include context when necessary
        - Use natural language
        - Avoid overly complex queries
        
        3. Knowledge Management
        - Regularly update documents
        - Remove outdated information
        - Tag documents appropriately
        - Monitor embedding quality
        
        4. Performance Tuning
        - Set appropriate similarity thresholds (0.7-0.8 recommended)
        - Limit retrieval results (5-10 typically sufficient)
        - Use caching for frequent queries
        - Monitor response times
        
        5. Source Attribution
        - Always verify source credibility
        - Check timestamp of information
        - Cross-reference multiple sources
        - Maintain audit trail`
      }
    ];

    for (const doc of testDocuments) {
      const filepath = path.join(testDir, doc.filename);
      fs.writeFileSync(filepath, doc.content);
      testFiles.push(filepath);
    }
  });

  test.afterAll(async () => {
    // Cleanup
    for (const file of testFiles) {
      if (fs.existsSync(file)) {
        fs.unlinkSync(file);
      }
    }
    
    const testDir = path.join(process.cwd(), 'test-chat-rag-files');
    if (fs.existsSync(testDir)) {
      fs.rmdirSync(testDir);
    }
  });

  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto('http://localhost:3000/login');
    await page.fill('input[name="email"]', 'test@arketic.com');
    await page.fill('input[name="password"]', 'Test123!@#');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard', { timeout: 10000 });
  });

  async function setupKnowledgeAndAssistant(page: Page) {
    // Upload knowledge files
    await page.goto('http://localhost:3000/knowledge');
    
    for (const filepath of testFiles) {
      const uploadButton = page.locator('button:has-text("Upload")').first();
      await uploadButton.click();
      
      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles(filepath);
      
      const response = await page.waitForResponse(resp => 
        resp.url().includes('/api/knowledge/upload') && resp.status() === 200
      );
      
      const data = await response.json();
      if (data.id) {
        testKnowledgeIds.push(data.id);
      }
    }

    // Create assistant with knowledge
    await page.goto('http://localhost:3000/assistants');
    await page.click('button:has-text("Create Assistant")');
    
    await page.fill('input[name="name"]', 'Chat RAG Assistant');
    await page.fill('textarea[name="description"]', 'Assistant for testing chat RAG integration');
    await page.selectOption('select[name="model"]', 'gpt-3.5-turbo');
    
    const instructions = `You are a helpful customer support assistant with access to documentation.
    Always use the knowledge base to provide accurate, detailed answers.
    Cite your sources when providing information.
    If you cannot find information in the knowledge base, clearly state that.`;
    
    await page.fill('textarea[name="instructions"]', instructions);
    
    // Add knowledge
    await page.click('text=Knowledge Base');
    for (const kid of testKnowledgeIds) {
      const checkbox = page.locator(`input[type="checkbox"][value="${kid}"]`);
      if (await checkbox.isVisible()) {
        await checkbox.check();
      }
    }
    
    await page.click('button:has-text("Create")');
    
    const response = await page.waitForResponse(resp => 
      resp.url().includes('/api/assistants') && resp.status() === 201
    );
    
    const data = await response.json();
    testAssistantId = data.id;
  }

  test('should create chat with RAG-enabled assistant', async ({ page }) => {
    // Setup knowledge and assistant first
    await setupKnowledgeAndAssistant(page);

    // Navigate to chat
    await page.goto('http://localhost:3000/chat');
    await page.waitForLoadState('networkidle');

    // Create new chat
    await page.click('button:has-text("New Chat")');

    // Select RAG assistant
    await page.click('button:has-text("Select Assistant")');
    await page.click(`text=Chat RAG Assistant`);

    // Verify assistant is selected
    await expect(page.locator('.selected-assistant')).toContainText('Chat RAG Assistant');

    // Start chat
    await page.click('button:has-text("Start Chat")');

    // Wait for chat creation
    const response = await page.waitForResponse(resp => 
      resp.url().includes('/api/chats') && resp.status() === 201
    );
    
    const data = await response.json();
    testChatId = data.id;

    // Verify chat interface loaded
    await expect(page.locator('.chat-interface')).toBeVisible();
    await expect(page.locator('.chat-header')).toContainText('Chat RAG Assistant');
    
    // Verify knowledge indicator
    await expect(page.locator('.knowledge-indicator')).toBeVisible();
    await expect(page.locator('.knowledge-indicator')).toContainText(`${testKnowledgeIds.length} sources`);
  });

  test('should provide RAG-enhanced responses with sources', async ({ page }) => {
    await page.goto(`http://localhost:3000/chat/${testChatId}`);
    await page.waitForLoadState('networkidle');

    // Test queries with expected RAG responses
    const testQueries = [
      {
        query: 'How do I reset my password?',
        expectedSources: ['customer_support_faq.md'],
        expectedContent: ['Forgot Password', 'reset link', '8 characters', 'uppercase']
      },
      {
        query: 'What is the WebSocket URL for real-time chat?',
        expectedSources: ['api_documentation.json'],
        expectedContent: ['ws://localhost:8000/ws', 'websocket']
      },
      {
        query: 'What are the best practices for query optimization?',
        expectedSources: ['best_practices.txt'],
        expectedContent: ['specific', 'natural language', 'context']
      }
    ];

    for (const testCase of testQueries) {
      // Send message
      const input = page.locator('.chat-input textarea');
      await input.fill(testCase.query);
      await input.press('Enter');

      // Wait for AI response
      await page.waitForSelector('.message.ai-message:last-child .message-content', {
        timeout: 15000
      });

      // Get the last AI message
      const aiMessage = page.locator('.message.ai-message').last();

      // Verify content includes expected information
      for (const expected of testCase.expectedContent) {
        await expect(aiMessage.locator('.message-content')).toContainText(expected, { 
          ignoreCase: true,
          timeout: 5000 
        });
      }

      // Verify sources are displayed
      const sources = aiMessage.locator('.message-sources');
      await expect(sources).toBeVisible();

      // Check expected sources
      for (const source of testCase.expectedSources) {
        await expect(sources).toContainText(source);
      }

      // Verify source links are clickable
      const sourceLinks = sources.locator('.source-link');
      expect(await sourceLinks.count()).toBeGreaterThan(0);
    }
  });

  test('should handle follow-up questions with context', async ({ page }) => {
    await page.goto(`http://localhost:3000/chat/${testChatId}`);
    await page.waitForLoadState('networkidle');

    // Initial question
    const input = page.locator('.chat-input textarea');
    await input.fill('Tell me about upgrading subscriptions');
    await input.press('Enter');

    // Wait for response
    await page.waitForSelector('.message.ai-message:last-child .message-content', {
      timeout: 15000
    });

    // Follow-up question
    await input.fill('What about cancellation?');
    await input.press('Enter');

    // Wait for follow-up response
    await page.waitForSelector('.message.ai-message:nth-last-child(1) .message-content', {
      timeout: 15000
    });

    // Verify follow-up uses context
    const lastMessage = page.locator('.message.ai-message').last();
    await expect(lastMessage.locator('.message-content')).toContainText('cancel', { ignoreCase: true });
    await expect(lastMessage.locator('.message-content')).toContainText('billing', { ignoreCase: true });

    // Should still show sources
    await expect(lastMessage.locator('.message-sources')).toBeVisible();
  });

  test('should show typing indicators during RAG retrieval', async ({ page }) => {
    await page.goto(`http://localhost:3000/chat/${testChatId}`);
    await page.waitForLoadState('networkidle');

    // Send a complex query
    const input = page.locator('.chat-input textarea');
    await input.fill('Explain all the API endpoints for chat and RAG functionality');
    
    // Listen for typing indicator
    const typingPromise = page.waitForSelector('.typing-indicator', { 
      state: 'visible',
      timeout: 5000 
    });
    
    await input.press('Enter');
    
    // Verify typing indicator appears
    await typingPromise;
    await expect(page.locator('.typing-indicator')).toContainText('Assistant is thinking');

    // Wait for response
    await page.waitForSelector('.message.ai-message:last-child .message-content', {
      timeout: 20000
    });

    // Typing indicator should disappear
    await expect(page.locator('.typing-indicator')).not.toBeVisible();
  });

  test('should handle queries with no relevant knowledge', async ({ page }) => {
    await page.goto(`http://localhost:3000/chat/${testChatId}`);
    await page.waitForLoadState('networkidle');

    // Ask about something not in knowledge base
    const input = page.locator('.chat-input textarea');
    await input.fill('What is the weather like today?');
    await input.press('Enter');

    // Wait for response
    await page.waitForSelector('.message.ai-message:last-child .message-content', {
      timeout: 15000
    });

    const aiMessage = page.locator('.message.ai-message').last();
    
    // Should indicate no relevant information found
    await expect(aiMessage.locator('.message-content')).toContainText(/don't have|cannot find|no information/i);

    // Sources section should be empty or show "No sources"
    const sources = aiMessage.locator('.message-sources');
    if (await sources.isVisible()) {
      const sourceCount = await sources.locator('.source-link').count();
      expect(sourceCount).toBe(0);
    }
  });

  test('should filter and rank RAG results', async ({ page }) => {
    await page.goto(`http://localhost:3000/chat/${testChatId}`);
    await page.waitForLoadState('networkidle');

    // Ask a question that could match multiple documents
    const input = page.locator('.chat-input textarea');
    await input.fill('Tell me everything about file uploads and supported formats');
    await input.press('Enter');

    // Wait for response
    await page.waitForSelector('.message.ai-message:last-child .message-content', {
      timeout: 15000
    });

    const aiMessage = page.locator('.message.ai-message').last();

    // Should include information from multiple sources
    await expect(aiMessage.locator('.message-content')).toContainText('50MB');
    await expect(aiMessage.locator('.message-content')).toContainText('PDF');
    await expect(aiMessage.locator('.message-content')).toContainText(/DOC|DOCX/);

    // Check sources are ranked by relevance
    const sources = aiMessage.locator('.message-sources .source-item');
    const sourceCount = await sources.count();
    
    expect(sourceCount).toBeGreaterThan(0);
    
    // First source should have highest relevance score
    const firstSource = sources.first();
    const relevanceScore = await firstSource.locator('.relevance-score').textContent();
    expect(parseFloat(relevanceScore || '0')).toBeGreaterThan(0.7);
  });

  test('should support real-time streaming with RAG', async ({ page }) => {
    await page.goto(`http://localhost:3000/chat/${testChatId}`);
    await page.waitForLoadState('networkidle');

    // Send query
    const input = page.locator('.chat-input textarea');
    await input.fill('Provide a detailed explanation of all technical issues and their solutions');
    await input.press('Enter');

    // Watch for streaming tokens
    const messageSelector = '.message.ai-message:last-child .message-content';
    
    // Wait for message to start appearing
    await page.waitForSelector(messageSelector, { timeout: 5000 });
    
    // Get initial content length
    const message = page.locator(messageSelector);
    const initialLength = (await message.textContent())?.length || 0;
    
    // Wait a bit and check if content is growing (streaming)
    await page.waitForTimeout(1000);
    const midLength = (await message.textContent())?.length || 0;
    
    // Content should be streaming in
    expect(midLength).toBeGreaterThan(initialLength);
    
    // Wait for completion
    await page.waitForSelector('.message.ai-message:last-child .message-complete', {
      timeout: 20000
    });
    
    // Final content should be complete
    const finalLength = (await message.textContent())?.length || 0;
    expect(finalLength).toBeGreaterThan(midLength);
  });

  test('should export chat with RAG sources', async ({ page }) => {
    await page.goto(`http://localhost:3000/chat/${testChatId}`);
    await page.waitForLoadState('networkidle');

    // Send a few messages to build history
    const queries = [
      'How do I reset my password?',
      'What are the API endpoints?',
      'Tell me about best practices'
    ];

    for (const query of queries) {
      const input = page.locator('.chat-input textarea');
      await input.fill(query);
      await input.press('Enter');
      
      await page.waitForSelector('.message.ai-message:last-child .message-complete', {
        timeout: 15000
      });
    }

    // Click export button
    await page.click('button:has-text("Export")');

    // Select export format
    await page.click('text=Export with Sources');

    // Wait for download
    const downloadPromise = page.waitForEvent('download');
    await page.click('button:has-text("Download")');
    const download = await downloadPromise;

    // Verify download
    expect(download.suggestedFilename()).toContain('chat-export');
    expect(download.suggestedFilename()).toMatch(/\.(json|md|pdf)$/);

    // Read the downloaded file
    const downloadPath = await download.path();
    if (downloadPath) {
      const content = fs.readFileSync(downloadPath, 'utf-8');
      
      // Verify it contains messages and sources
      expect(content).toContain('password');
      expect(content).toContain('API');
      expect(content).toContain('best practices');
      expect(content).toContain('Sources:');
    }
  });

  test('should handle concurrent RAG queries', async ({ page }) => {
    await page.goto(`http://localhost:3000/chat/${testChatId}`);
    await page.waitForLoadState('networkidle');

    // Open multiple chat tabs
    const tab1 = page;
    const tab2 = await page.context().newPage();
    const tab3 = await page.context().newPage();

    // Navigate all tabs to the same chat
    await tab2.goto(`http://localhost:3000/chat/${testChatId}`);
    await tab3.goto(`http://localhost:3000/chat/${testChatId}`);

    // Send different queries simultaneously
    const queries = [
      { tab: tab1, query: 'How to reset password?' },
      { tab: tab2, query: 'What are the WebSocket events?' },
      { tab: tab3, query: 'What is the file size limit?' }
    ];

    // Send all queries
    const promises = queries.map(async ({ tab, query }) => {
      const input = tab.locator('.chat-input textarea');
      await input.fill(query);
      await input.press('Enter');
      return tab.waitForSelector('.message.ai-message:last-child .message-complete', {
        timeout: 20000
      });
    });

    // Wait for all responses
    await Promise.all(promises);

    // Verify each tab got appropriate response
    for (const { tab, query } of queries) {
      const lastMessage = tab.locator('.message.ai-message').last();
      const content = await lastMessage.locator('.message-content').textContent();
      
      if (query.includes('password')) {
        expect(content).toContain('reset');
      } else if (query.includes('WebSocket')) {
        expect(content).toContain('ws://');
      } else if (query.includes('file size')) {
        expect(content).toContain('50MB');
      }
      
      // All should have sources
      await expect(lastMessage.locator('.message-sources')).toBeVisible();
    }

    // Close extra tabs
    await tab2.close();
    await tab3.close();
  });

  test('should update RAG context when knowledge changes', async ({ page }) => {
    await page.goto(`http://localhost:3000/chat/${testChatId}`);
    await page.waitForLoadState('networkidle');

    // Ask initial question
    const input = page.locator('.chat-input textarea');
    await input.fill('What is the maximum file size?');
    await input.press('Enter');

    // Wait for response
    await page.waitForSelector('.message.ai-message:last-child .message-complete', {
      timeout: 15000
    });

    // Verify initial response
    const initialMessage = page.locator('.message.ai-message').last();
    await expect(initialMessage.locator('.message-content')).toContainText('50MB');

    // Navigate to knowledge and update the document
    await page.goto('http://localhost:3000/knowledge');
    
    // Find and edit the FAQ document
    const faqDoc = page.locator('text=customer_support_faq.md').locator('..');
    await faqDoc.locator('button:has-text("Edit")').click();

    // Update content
    const editor = page.locator('.document-editor');
    const content = await editor.inputValue();
    const updatedContent = content.replace('Maximum file size: 50MB', 'Maximum file size: 100MB');
    await editor.fill(updatedContent);
    await page.click('button:has-text("Save")');

    // Wait for embedding update
    await page.waitForResponse(resp => 
      resp.url().includes('/embeddings') && resp.status() === 200
    );

    // Go back to chat
    await page.goto(`http://localhost:3000/chat/${testChatId}`);

    // Ask the same question again
    await input.fill('What is the current maximum file size limit?');
    await input.press('Enter');

    // Wait for new response
    await page.waitForSelector('.message.ai-message:nth-last-child(1) .message-complete', {
      timeout: 15000
    });

    // Verify updated response
    const updatedMessage = page.locator('.message.ai-message').last();
    await expect(updatedMessage.locator('.message-content')).toContainText('100MB');
  });
});