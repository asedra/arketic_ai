import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';

test.describe('Assistant Knowledge Configuration Tests', () => {
  let testAssistantId: string;
  let testKnowledgeIds: string[] = [];
  let testFiles: string[] = [];

  test.beforeAll(async () => {
    // Create test knowledge files
    const testDir = path.join(process.cwd(), 'test-assistant-files');
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }

    const testDocuments = [
      {
        filename: 'company_policies.md',
        content: `# Company Policies and Procedures
        
        ## Work Hours
        - Standard hours: 9 AM - 5 PM
        - Flexible working arrangements available
        - Remote work policy: Up to 3 days per week
        
        ## Leave Policy
        - Annual leave: 25 days
        - Sick leave: 10 days
        - Personal leave: 5 days
        
        ## Code of Conduct
        - Professional behavior expected at all times
        - Respect for diversity and inclusion
        - Zero tolerance for harassment
        
        ## IT Security
        - Password must be changed every 90 days
        - Two-factor authentication mandatory
        - VPN required for remote access`
      },
      {
        filename: 'product_documentation.txt',
        content: `Product Features and Capabilities
        
        Version 2.0 Release Notes:
        
        New Features:
        - Advanced RAG integration for intelligent responses
        - Multi-language support (English, Spanish, French, German)
        - Enhanced security with end-to-end encryption
        - Real-time collaboration features
        - Automated workflow builder
        
        Improvements:
        - 50% faster response times
        - Reduced memory usage by 30%
        - Improved UI/UX based on user feedback
        - Better mobile responsiveness
        
        Bug Fixes:
        - Fixed issue with file uploads over 10MB
        - Resolved timezone display problems
        - Corrected calculation errors in reports
        - Fixed WebSocket connection drops`
      },
      {
        filename: 'technical_specs.json',
        content: JSON.stringify({
          "api_endpoints": {
            "authentication": "/api/auth",
            "users": "/api/users",
            "knowledge": "/api/knowledge",
            "assistants": "/api/assistants",
            "chats": "/api/chats"
          },
          "rate_limits": {
            "requests_per_minute": 60,
            "requests_per_hour": 1000,
            "max_file_size": "50MB"
          },
          "supported_formats": [
            "PDF", "DOC", "DOCX", "TXT", "MD", "JSON", "CSV"
          ],
          "system_requirements": {
            "min_ram": "4GB",
            "recommended_ram": "8GB",
            "storage": "10GB",
            "browser": "Chrome 90+, Firefox 88+, Safari 14+"
          }
        }, null, 2)
      }
    ];

    for (const doc of testDocuments) {
      const filepath = path.join(testDir, doc.filename);
      fs.writeFileSync(filepath, doc.content);
      testFiles.push(filepath);
    }
  });

  test.afterAll(async () => {
    // Cleanup test files
    for (const file of testFiles) {
      if (fs.existsSync(file)) {
        fs.unlinkSync(file);
      }
    }
    
    const testDir = path.join(process.cwd(), 'test-assistant-files');
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

  test('should upload knowledge files for assistant', async ({ page }) => {
    // Navigate to knowledge page
    await page.goto('http://localhost:3000/knowledge');
    await page.waitForLoadState('networkidle');

    // Upload test files
    for (const filepath of testFiles) {
      const uploadButton = page.locator('button:has-text("Upload")').first();
      await uploadButton.click();
      
      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles(filepath);
      
      // Wait for upload
      const response = await page.waitForResponse(resp => 
        resp.url().includes('/api/knowledge/upload') && resp.status() === 200
      );
      
      const responseData = await response.json();
      if (responseData.id) {
        testKnowledgeIds.push(responseData.id);
      }
      
      // Verify file appears
      const filename = path.basename(filepath);
      await expect(page.locator(`text=${filename}`)).toBeVisible({ timeout: 5000 });
    }

    expect(testKnowledgeIds.length).toBe(testFiles.length);
  });

  test('should create assistant with knowledge base', async ({ page }) => {
    // Navigate to assistants page
    await page.goto('http://localhost:3000/assistants');
    await page.waitForLoadState('networkidle');

    // Click create assistant button
    await page.click('button:has-text("Create Assistant")');

    // Fill assistant details
    await page.fill('input[name="name"]', 'RAG Test Assistant');
    await page.fill('textarea[name="description"]', 'Assistant configured with knowledge base for RAG testing');
    
    // Select model
    await page.selectOption('select[name="model"]', 'gpt-3.5-turbo');
    
    // Add instructions
    const instructions = `You are a helpful assistant with access to company documentation.
    Use the knowledge base to provide accurate answers about:
    - Company policies and procedures
    - Product features and documentation
    - Technical specifications
    Always cite your sources when answering questions.`;
    
    await page.fill('textarea[name="instructions"]', instructions);

    // Configure knowledge base
    await page.click('text=Knowledge Base');
    
    // Select all uploaded knowledge files
    for (const knowledgeId of testKnowledgeIds) {
      const checkbox = page.locator(`input[type="checkbox"][value="${knowledgeId}"]`);
      if (await checkbox.isVisible()) {
        await checkbox.check();
      }
    }

    // Set retrieval parameters
    await page.fill('input[name="max_results"]', '5');
    await page.fill('input[name="similarity_threshold"]', '0.7');

    // Save assistant
    await page.click('button:has-text("Create")');

    // Wait for creation
    const response = await page.waitForResponse(resp => 
      resp.url().includes('/api/assistants') && resp.status() === 201
    );
    
    const responseData = await response.json();
    testAssistantId = responseData.id;

    // Verify assistant appears in list
    await expect(page.locator('text=RAG Test Assistant')).toBeVisible({ timeout: 5000 });
    
    // Verify knowledge count badge
    const knowledgeBadge = page.locator(`[data-assistant-id="${testAssistantId}"] .knowledge-count`);
    await expect(knowledgeBadge).toHaveText(`${testKnowledgeIds.length}`);
  });

  test('should edit assistant knowledge configuration', async ({ page }) => {
    await page.goto('http://localhost:3000/assistants');
    await page.waitForLoadState('networkidle');

    // Find and click edit on test assistant
    const assistantCard = page.locator('text=RAG Test Assistant').locator('..');
    await assistantCard.locator('button:has-text("Edit")').click();

    // Navigate to knowledge tab
    await page.click('text=Knowledge Base');

    // Verify current knowledge selections
    for (const knowledgeId of testKnowledgeIds) {
      const checkbox = page.locator(`input[type="checkbox"][value="${knowledgeId}"]`);
      await expect(checkbox).toBeChecked();
    }

    // Update retrieval settings
    await page.fill('input[name="max_results"]', '10');
    await page.fill('input[name="similarity_threshold"]', '0.8');
    
    // Add knowledge filters
    await page.click('button:has-text("Add Filter")');
    await page.selectOption('select[name="filter_type"]', 'file_type');
    await page.selectOption('select[name="filter_value"]', 'markdown');

    // Save changes
    await page.click('button:has-text("Save Changes")');

    // Wait for update
    await page.waitForResponse(resp => 
      resp.url().includes(`/api/assistants/${testAssistantId}`) && resp.status() === 200
    );

    // Verify success message
    await expect(page.locator('text=Assistant updated successfully')).toBeVisible();
  });

  test('should preview assistant responses with knowledge', async ({ page }) => {
    await page.goto('http://localhost:3000/assistants');
    await page.waitForLoadState('networkidle');

    // Click preview on test assistant
    const assistantCard = page.locator('text=RAG Test Assistant').locator('..');
    await assistantCard.locator('button:has-text("Preview")').click();

    // Wait for preview modal
    await expect(page.locator('.assistant-preview-modal')).toBeVisible();

    // Test queries that should use knowledge base
    const testQueries = [
      {
        query: 'What is the company remote work policy?',
        expectedContent: ['3 days per week', 'remote work']
      },
      {
        query: 'What new features were added in version 2.0?',
        expectedContent: ['RAG integration', 'multi-language', 'workflow builder']
      },
      {
        query: 'What are the API rate limits?',
        expectedContent: ['60', 'requests per minute', '1000']
      }
    ];

    for (const testCase of testQueries) {
      // Clear and enter query
      const input = page.locator('.preview-input');
      await input.clear();
      await input.fill(testCase.query);
      await input.press('Enter');

      // Wait for response
      await page.waitForSelector('.preview-response', { timeout: 10000 });

      // Verify response contains expected content
      const response = page.locator('.preview-response').last();
      for (const expected of testCase.expectedContent) {
        await expect(response).toContainText(expected, { ignoreCase: true });
      }

      // Verify sources are shown
      const sources = response.locator('.response-sources');
      await expect(sources).toBeVisible();
      expect(await sources.locator('.source-item').count()).toBeGreaterThan(0);
    }

    // Close preview
    await page.click('button:has-text("Close")');
  });

  test('should manage knowledge priorities and weights', async ({ page }) => {
    await page.goto('http://localhost:3000/assistants');
    await page.waitForLoadState('networkidle');

    // Edit assistant
    const assistantCard = page.locator('text=RAG Test Assistant').locator('..');
    await assistantCard.locator('button:has-text("Edit")').click();

    // Go to knowledge configuration
    await page.click('text=Knowledge Base');

    // Click advanced settings
    await page.click('button:has-text("Advanced Settings")');

    // Set knowledge priorities
    const knowledgeItems = page.locator('.knowledge-item');
    const itemCount = await knowledgeItems.count();

    for (let i = 0; i < itemCount; i++) {
      const item = knowledgeItems.nth(i);
      
      // Set priority based on file type
      const filename = await item.locator('.filename').textContent();
      if (filename?.includes('policies')) {
        await item.locator('select[name="priority"]').selectOption('high');
        await item.locator('input[name="weight"]').fill('1.5');
      } else if (filename?.includes('technical')) {
        await item.locator('select[name="priority"]').selectOption('medium');
        await item.locator('input[name="weight"]').fill('1.0');
      } else {
        await item.locator('select[name="priority"]').selectOption('low');
        await item.locator('input[name="weight"]').fill('0.8');
      }
    }

    // Enable context window optimization
    await page.check('input[name="optimize_context"]');
    await page.fill('input[name="max_context_length"]', '4000');

    // Save configuration
    await page.click('button:has-text("Save Configuration")');

    // Wait for save
    await page.waitForResponse(resp => 
      resp.url().includes(`/api/assistants/${testAssistantId}/knowledge-config`) && 
      resp.status() === 200
    );

    // Verify configuration saved
    await expect(page.locator('text=Knowledge configuration updated')).toBeVisible();
  });

  test('should test assistant knowledge refresh and sync', async ({ page }) => {
    await page.goto('http://localhost:3000/assistants');
    await page.waitForLoadState('networkidle');

    // Open assistant details
    const assistantCard = page.locator('text=RAG Test Assistant').locator('..');
    await assistantCard.click();

    // Navigate to knowledge sync section
    await page.click('text=Knowledge Sync');

    // Check sync status
    const syncStatus = page.locator('.sync-status');
    await expect(syncStatus).toBeVisible();

    // Trigger manual sync
    await page.click('button:has-text("Sync Now")');

    // Wait for sync to start
    await expect(page.locator('.sync-progress')).toBeVisible();

    // Wait for sync to complete
    await page.waitForResponse(resp => 
      resp.url().includes(`/api/assistants/${testAssistantId}/sync-knowledge`) && 
      resp.status() === 200,
      { timeout: 30000 }
    );

    // Verify sync completed
    await expect(page.locator('text=Knowledge synchronized successfully')).toBeVisible();

    // Check last sync time updated
    const lastSyncTime = page.locator('.last-sync-time');
    await expect(lastSyncTime).toContainText('Just now');

    // Verify embedding status
    const embeddingStatus = page.locator('.embedding-status');
    for (let i = 0; i < testKnowledgeIds.length; i++) {
      await expect(embeddingStatus.nth(i)).toHaveText('Active');
    }
  });

  test('should remove knowledge from assistant', async ({ page }) => {
    await page.goto('http://localhost:3000/assistants');
    await page.waitForLoadState('networkidle');

    // Edit assistant
    const assistantCard = page.locator('text=RAG Test Assistant').locator('..');
    await assistantCard.locator('button:has-text("Edit")').click();

    // Go to knowledge configuration
    await page.click('text=Knowledge Base');

    // Get initial count
    const initialCount = await page.locator('input[type="checkbox"]:checked').count();

    // Uncheck first knowledge item
    const firstCheckbox = page.locator('input[type="checkbox"]:checked').first();
    await firstCheckbox.uncheck();

    // Save changes
    await page.click('button:has-text("Save Changes")');

    // Wait for update
    await page.waitForResponse(resp => 
      resp.url().includes(`/api/assistants/${testAssistantId}`) && resp.status() === 200
    );

    // Verify knowledge count updated
    await page.goto('http://localhost:3000/assistants');
    const knowledgeBadge = page.locator(`[data-assistant-id="${testAssistantId}"] .knowledge-count`);
    await expect(knowledgeBadge).toHaveText(`${initialCount - 1}`);
  });

  test('should validate assistant responses without knowledge', async ({ page }) => {
    // Create a new assistant without knowledge
    await page.goto('http://localhost:3000/assistants');
    await page.waitForLoadState('networkidle');

    await page.click('button:has-text("Create Assistant")');

    // Fill basic details
    await page.fill('input[name="name"]', 'No Knowledge Assistant');
    await page.fill('textarea[name="description"]', 'Assistant without knowledge base');
    await page.selectOption('select[name="model"]', 'gpt-3.5-turbo');
    await page.fill('textarea[name="instructions"]', 'You are a helpful assistant without access to any knowledge base.');

    // Skip knowledge configuration
    await page.click('button:has-text("Create")');

    // Wait for creation
    await page.waitForResponse(resp => 
      resp.url().includes('/api/assistants') && resp.status() === 201
    );

    // Preview the assistant
    const newAssistantCard = page.locator('text=No Knowledge Assistant').locator('..');
    await newAssistantCard.locator('button:has-text("Preview")').click();

    // Ask a question that would need knowledge
    const input = page.locator('.preview-input');
    await input.fill('What is the company remote work policy?');
    await input.press('Enter');

    // Wait for response
    await page.waitForSelector('.preview-response', { timeout: 10000 });

    // Verify no sources are shown
    const response = page.locator('.preview-response').last();
    const sources = response.locator('.response-sources');
    
    // Should not have sources section or it should be empty
    const sourcesVisible = await sources.isVisible();
    if (sourcesVisible) {
      expect(await sources.locator('.source-item').count()).toBe(0);
    }

    // Response should indicate no knowledge access
    await expect(response).toContainText(/don't have access|no information|cannot provide/i);
  });
});