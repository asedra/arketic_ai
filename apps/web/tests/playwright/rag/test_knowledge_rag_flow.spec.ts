import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';

test.describe('Knowledge RAG Flow Tests', () => {
  let testFiles: string[] = [];
  let uploadedKnowledgeIds: string[] = [];

  test.beforeAll(async () => {
    // Create test files
    const testDir = path.join(process.cwd(), 'test-files');
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }

    // Create test documents with specific content
    const testDocuments = [
      {
        filename: 'ai_document.txt',
        content: `Artificial Intelligence and Machine Learning Guide
        
        AI is revolutionizing industries across the globe. Machine learning, a subset of AI,
        enables systems to learn and improve from experience without being explicitly programmed.
        Deep learning uses neural networks with multiple layers to progressively extract
        higher-level features from raw input.
        
        Key concepts include:
        - Supervised Learning: Training with labeled data
        - Unsupervised Learning: Finding patterns in unlabeled data
        - Reinforcement Learning: Learning through reward and punishment
        - Neural Networks: Computational models inspired by the human brain
        - Natural Language Processing: Enabling machines to understand human language`
      },
      {
        filename: 'cloud_computing.md',
        content: `# Cloud Computing Overview
        
        ## Major Cloud Providers
        
        ### Amazon Web Services (AWS)
        AWS is the market leader in cloud computing, offering over 200 services including:
        - EC2 for compute
        - S3 for storage
        - RDS for databases
        - Lambda for serverless computing
        
        ### Microsoft Azure
        Azure provides comprehensive cloud services including:
        - Virtual Machines
        - Azure Storage
        - Azure SQL Database
        - Azure Functions
        
        ### Google Cloud Platform (GCP)
        GCP offers innovative solutions:
        - Compute Engine
        - Cloud Storage
        - BigQuery for analytics
        - Cloud Functions
        
        ## Benefits of Cloud Computing
        - Scalability and elasticity
        - Cost efficiency
        - High availability
        - Global reach
        - Security and compliance`
      },
      {
        filename: 'system_architecture.txt',
        content: `System Architecture Documentation
        
        Our platform uses a modern microservices architecture with the following components:
        
        1. API Gateway
           - Routes requests to appropriate services
           - Handles authentication and rate limiting
           - Provides centralized logging
        
        2. Authentication Service
           - JWT-based authentication
           - OAuth2 integration
           - Role-based access control (RBAC)
        
        3. Knowledge Management Service
           - Document storage and retrieval
           - Vector embeddings using pgvector
           - Semantic search capabilities
        
        4. Chat Service
           - Real-time messaging with WebSockets
           - RAG integration for contextual responses
           - Message history and persistence
        
        5. Technology Stack
           - Backend: FastAPI (Python)
           - Database: PostgreSQL with pgvector extension
           - Cache: Redis
           - Frontend: Next.js with TypeScript
           - AI/ML: OpenAI GPT models, LangChain
           - Container: Docker with Kubernetes orchestration`
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
    
    const testDir = path.join(process.cwd(), 'test-files');
    if (fs.existsSync(testDir)) {
      fs.rmdirSync(testDir);
    }
  });

  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('http://localhost:3000/login');
    await page.fill('input[name="email"]', 'test@arketic.com');
    await page.fill('input[name="password"]', 'Test123!@#');
    await page.click('button[type="submit"]');
    
    // Wait for redirect to dashboard
    await page.waitForURL('**/dashboard', { timeout: 10000 });
  });

  test('should upload documents and generate embeddings', async ({ page }) => {
    // Navigate to knowledge page
    await page.goto('http://localhost:3000/knowledge');
    await page.waitForLoadState('networkidle');

    // Upload each test file
    for (const filepath of testFiles) {
      const filename = path.basename(filepath);
      
      // Click upload button
      const uploadButton = page.locator('button:has-text("Upload")').first();
      await uploadButton.click();
      
      // Select file
      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles(filepath);
      
      // Wait for upload to complete
      await page.waitForResponse(resp => 
        resp.url().includes('/api/knowledge/upload') && resp.status() === 200
      );
      
      // Verify file appears in list
      await expect(page.locator(`text=${filename}`)).toBeVisible({ timeout: 5000 });
      
      // Store knowledge ID for later tests
      const knowledgeItem = page.locator(`[data-filename="${filename}"]`);
      if (await knowledgeItem.count() > 0) {
        const knowledgeId = await knowledgeItem.getAttribute('data-id');
        if (knowledgeId) {
          uploadedKnowledgeIds.push(knowledgeId);
        }
      }
    }

    // Verify all files uploaded
    expect(uploadedKnowledgeIds.length).toBe(testFiles.length);
    
    // Check embedding status
    for (const filename of testFiles.map(f => path.basename(f))) {
      const statusIndicator = page.locator(`[data-filename="${filename}"] .embedding-status`);
      await expect(statusIndicator).toHaveText('Embeddings Ready', { timeout: 30000 });
    }
  });

  test('should search knowledge base using semantic search', async ({ page }) => {
    await page.goto('http://localhost:3000/knowledge');
    await page.waitForLoadState('networkidle');

    // Test searches with expected results
    const searchTests = [
      {
        query: 'machine learning neural networks',
        expectedFile: 'ai_document.txt',
        expectedContent: ['supervised learning', 'neural networks', 'deep learning']
      },
      {
        query: 'AWS cloud services',
        expectedFile: 'cloud_computing.md',
        expectedContent: ['EC2', 'S3', 'Lambda']
      },
      {
        query: 'microservices authentication',
        expectedFile: 'system_architecture.txt',
        expectedContent: ['API Gateway', 'JWT', 'RBAC']
      }
    ];

    for (const test of searchTests) {
      // Clear and enter search query
      const searchInput = page.locator('input[placeholder*="Search"]');
      await searchInput.clear();
      await searchInput.fill(test.query);
      await searchInput.press('Enter');
      
      // Wait for search results
      await page.waitForResponse(resp => 
        resp.url().includes('/api/knowledge/search') && resp.status() === 200
      );
      
      // Verify expected file appears first
      const firstResult = page.locator('.search-result').first();
      await expect(firstResult).toContainText(test.expectedFile);
      
      // Verify relevant content highlights
      for (const content of test.expectedContent) {
        await expect(firstResult).toContainText(content, { ignoreCase: true });
      }
    }
  });

  test('should display source attribution in search results', async ({ page }) => {
    await page.goto('http://localhost:3000/knowledge');
    await page.waitForLoadState('networkidle');

    // Perform a search
    const searchInput = page.locator('input[placeholder*="Search"]');
    await searchInput.fill('cloud computing benefits');
    await searchInput.press('Enter');
    
    // Wait for results
    await page.waitForResponse(resp => 
      resp.url().includes('/api/knowledge/search') && resp.status() === 200
    );
    
    // Check source attribution
    const searchResults = page.locator('.search-result');
    const resultsCount = await searchResults.count();
    
    expect(resultsCount).toBeGreaterThan(0);
    
    // Each result should have source information
    for (let i = 0; i < resultsCount; i++) {
      const result = searchResults.nth(i);
      
      // Check for filename
      await expect(result.locator('.source-filename')).toBeVisible();
      
      // Check for relevance score
      await expect(result.locator('.relevance-score')).toBeVisible();
      
      // Check for snippet with highlighted terms
      await expect(result.locator('.content-snippet')).toBeVisible();
    }
  });

  test('should handle RAG queries in knowledge search', async ({ page }) => {
    await page.goto('http://localhost:3000/knowledge');
    await page.waitForLoadState('networkidle');

    // Ask a question that requires RAG
    const searchInput = page.locator('input[placeholder*="Search"]');
    await searchInput.fill('What are the main components of our microservices architecture?');
    await searchInput.press('Enter');
    
    // Wait for RAG response
    await page.waitForResponse(resp => 
      resp.url().includes('/api/knowledge/search') && resp.status() === 200,
      { timeout: 15000 }
    );
    
    // Verify RAG response contains expected information
    const ragResponse = page.locator('.rag-response');
    await expect(ragResponse).toBeVisible();
    
    // Should mention key components
    await expect(ragResponse).toContainText('API Gateway');
    await expect(ragResponse).toContainText('Authentication Service');
    await expect(ragResponse).toContainText('Knowledge Management');
    await expect(ragResponse).toContainText('Chat Service');
    
    // Should show sources used
    const sources = page.locator('.rag-sources .source-item');
    expect(await sources.count()).toBeGreaterThan(0);
    
    // Verify source links
    const firstSource = sources.first();
    await expect(firstSource).toContainText('system_architecture.txt');
  });

  test('should update embeddings when document is edited', async ({ page }) => {
    await page.goto('http://localhost:3000/knowledge');
    await page.waitForLoadState('networkidle');

    // Select first document
    const firstDoc = page.locator('.knowledge-item').first();
    await firstDoc.click();
    
    // Click edit button
    await page.click('button:has-text("Edit")');
    
    // Modify content
    const editor = page.locator('.document-editor');
    const currentContent = await editor.inputValue();
    const newContent = currentContent + '\n\nUpdated: This document now includes additional information about quantum computing.';
    await editor.fill(newContent);
    
    // Save changes
    await page.click('button:has-text("Save")');
    
    // Wait for embedding update
    await page.waitForResponse(resp => 
      resp.url().includes('/api/knowledge/') && 
      resp.url().includes('/embeddings') && 
      resp.status() === 200
    );
    
    // Verify embedding status shows as updated
    const statusIndicator = page.locator('.knowledge-item').first().locator('.embedding-status');
    await expect(statusIndicator).toHaveText('Embeddings Updated', { timeout: 10000 });
    
    // Search for new content
    const searchInput = page.locator('input[placeholder*="Search"]');
    await searchInput.fill('quantum computing');
    await searchInput.press('Enter');
    
    // Verify document appears in search results
    await page.waitForResponse(resp => 
      resp.url().includes('/api/knowledge/search') && resp.status() === 200
    );
    
    const searchResult = page.locator('.search-result').first();
    await expect(searchResult).toContainText('quantum computing');
  });

  test('should filter knowledge by type and tags', async ({ page }) => {
    await page.goto('http://localhost:3000/knowledge');
    await page.waitForLoadState('networkidle');

    // Apply type filter
    await page.click('button:has-text("Filter")');
    await page.click('input[value="text"]');
    await page.click('button:has-text("Apply")');
    
    // Verify only text files are shown
    const textFiles = page.locator('.knowledge-item[data-type="text"]');
    const mdFiles = page.locator('.knowledge-item[data-type="markdown"]');
    
    expect(await textFiles.count()).toBeGreaterThan(0);
    expect(await mdFiles.count()).toBe(0);
    
    // Clear filter
    await page.click('button:has-text("Clear Filters")');
    
    // Add tags to documents
    const firstItem = page.locator('.knowledge-item').first();
    await firstItem.hover();
    await firstItem.locator('button:has-text("Tag")').click();
    await page.fill('input[placeholder="Add tag"]', 'AI');
    await page.press('Enter');
    await page.fill('input[placeholder="Add tag"]', 'Documentation');
    await page.press('Enter');
    await page.click('button:has-text("Save Tags")');
    
    // Filter by tag
    await page.click('button:has-text("Filter")');
    await page.click('text=AI');
    await page.click('button:has-text("Apply")');
    
    // Verify filtered results
    const taggedItems = page.locator('.knowledge-item:has(.tag:has-text("AI"))');
    expect(await taggedItems.count()).toBeGreaterThan(0);
  });
});