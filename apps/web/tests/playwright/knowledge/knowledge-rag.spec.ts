/**
 * Knowledge Management RAG Integration E2E Tests using Playwright MCP
 * 
 * This test suite validates RAG integration from the knowledge management perspective,
 * including document indexing, semantic search UI, vector operations,
 * and knowledge base management for RAG functionality.
 * 
 * Author: Claude
 * Created: 2025-08-10 (AR-84: Knowledge Management RAG Tests)
 */

import { test, expect } from '@playwright/test';

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';
const API_URL = process.env.API_URL || 'http://localhost:8000';

const TEST_USER = {
  email: 'test@arketic.com',
  password: 'testpassword123'
};

// Test documents for RAG functionality
const RAG_DOCUMENTS = [
  {
    title: 'Python Data Science Guide',
    content: 'Python is extensively used in data science with libraries like pandas for data manipulation, numpy for numerical computing, matplotlib for visualization, and scikit-learn for machine learning. These tools make Python the preferred language for data scientists worldwide.',
    type: 'text',
    tags: ['python', 'data-science', 'pandas', 'numpy']
  },
  {
    title: 'Machine Learning Algorithms',
    content: 'Machine learning algorithms can be categorized into supervised learning (like linear regression and decision trees), unsupervised learning (like clustering and dimensionality reduction), and reinforcement learning. Each category serves different purposes in solving various problems.',
    type: 'text',
    tags: ['machine-learning', 'algorithms', 'supervised', 'unsupervised']
  },
  {
    title: 'Web Development with Python',
    content: 'Python offers excellent frameworks for web development including Django for full-featured applications, Flask for lightweight applications, and FastAPI for high-performance APIs. These frameworks provide different approaches to building web applications.',
    type: 'text',
    tags: ['python', 'web-development', 'django', 'flask', 'fastapi']
  }
];

// Helper function to login
async function loginUser(page: any) {
  await page.goto(BASE_URL);
  await page.fill('input[name="email"]', TEST_USER.email);
  await page.fill('input[name="password"]', TEST_USER.password);
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard**', { timeout: 10000 });
}

// Helper function to upload test document
async function uploadDocument(page: any, document: any) {
  await page.click('[data-testid="upload-document-button"]');
  
  // Fill document form
  await page.fill('[data-testid="document-title"]', document.title);
  await page.fill('[data-testid="document-content"]', document.content);
  await page.selectOption('[data-testid="document-type"]', document.type);
  
  // Add tags
  for (const tag of document.tags) {
    await page.fill('[data-testid="tag-input"]', tag);
    await page.press('[data-testid="tag-input"]', 'Enter');
  }
  
  // Enable RAG indexing
  await page.check('[data-testid="enable-rag-indexing"]');
  
  // Save document
  await page.click('[data-testid="save-document-button"]');
  
  // Wait for success
  await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
  await page.waitForTimeout(2000); // Allow for background processing
}

test.describe('Knowledge Management RAG Integration', () => {
  test.beforeEach(async ({ page }) => {
    await loginUser(page);
    
    // Navigate to knowledge management
    await page.click('text=Knowledge');
    await page.waitForSelector('[data-testid="knowledge-content"]', { timeout: 5000 });
  });

  test('should display RAG indexing options when uploading documents', async ({ page }) => {
    await page.click('[data-testid="upload-document-button"]');
    
    // Should show RAG indexing section
    await expect(page.locator('[data-testid="rag-indexing-section"]')).toBeVisible();
    
    // Should have enable RAG toggle
    await expect(page.locator('[data-testid="enable-rag-indexing"]')).toBeVisible();
    
    // Should show indexing parameters
    await expect(page.locator('[data-testid="chunking-strategy"]')).toBeVisible();
    await expect(page.locator('[data-testid="chunk-size"]')).toBeVisible();
    await expect(page.locator('[data-testid="chunk-overlap"]')).toBeVisible();
    
    // Should show embedding model selection
    await expect(page.locator('[data-testid="embedding-model-select"]')).toBeVisible();
  });

  test('should upload and index documents for RAG', async ({ page }) => {
    const testDocument = RAG_DOCUMENTS[0];
    
    await uploadDocument(page, testDocument);
    
    // Should appear in document list with RAG indicator
    await expect(page.locator(`[data-testid="document-item"]`).first()).toBeVisible();
    await expect(page.locator('[data-testid="rag-indexed-badge"]').first()).toBeVisible();
    
    // Should show indexing status
    await expect(page.locator('[data-testid="indexing-status"]').first()).toContainText(/indexed|processing/i);
    
    // Vector count should be displayed
    await expect(page.locator('[data-testid="vector-count"]').first()).toBeVisible();
  });

  test('should provide semantic search functionality', async ({ page }) => {
    // Upload test documents first
    for (const doc of RAG_DOCUMENTS) {
      await uploadDocument(page, doc);
    }
    
    // Wait for indexing to complete
    await page.waitForTimeout(5000);
    
    // Use semantic search
    await page.click('[data-testid="semantic-search-tab"]');
    
    // Should show semantic search interface
    await expect(page.locator('[data-testid="semantic-search-input"]')).toBeVisible();
    await expect(page.locator('[data-testid="similarity-threshold"]')).toBeVisible();
    await expect(page.locator('[data-testid="max-results"]')).toBeVisible();
    
    // Perform semantic search
    const searchQuery = 'data science libraries';
    await page.fill('[data-testid="semantic-search-input"]', searchQuery);
    await page.click('[data-testid="semantic-search-button"]');
    
    // Should show search results
    await page.waitForSelector('[data-testid="search-results"]', { timeout: 10000 });
    await expect(page.locator('[data-testid="search-result-item"]')).toHaveCountGreaterThan(0);
    
    // Results should show similarity scores
    const firstResult = page.locator('[data-testid="search-result-item"]').first();
    await expect(firstResult.locator('[data-testid="similarity-score"]')).toBeVisible();
    await expect(firstResult.locator('[data-testid="result-snippet"]')).toBeVisible();
    
    // Should highlight relevant terms
    await expect(firstResult.locator('[data-testid="highlighted-text"]')).toBeVisible();
  });

  test('should show document chunking and vector information', async ({ page }) => {
    const testDocument = RAG_DOCUMENTS[1];
    
    await uploadDocument(page, testDocument);
    
    // Click on document to view details
    await page.click('[data-testid="document-item"]');
    
    // Should show RAG details tab
    await page.click('[data-testid="rag-details-tab"]');
    
    // Should display chunking information
    await expect(page.locator('[data-testid="chunk-count"]')).toBeVisible();
    await expect(page.locator('[data-testid="chunk-strategy"]')).toBeVisible();
    
    // Should show vector statistics
    await expect(page.locator('[data-testid="vector-dimensions"]')).toBeVisible();
    await expect(page.locator('[data-testid="embedding-model"]')).toBeVisible();
    
    // Should list individual chunks
    await expect(page.locator('[data-testid="chunk-list"]')).toBeVisible();
    const chunks = page.locator('[data-testid="chunk-item"]');
    await expect(chunks).toHaveCountGreaterThan(0);
    
    // Should show chunk details
    const firstChunk = chunks.first();
    await expect(firstChunk.locator('[data-testid="chunk-text"]')).toBeVisible();
    await expect(firstChunk.locator('[data-testid="chunk-tokens"]')).toBeVisible();
  });

  test('should manage knowledge collections for RAG', async ({ page }) => {
    // Create knowledge collection
    await page.click('[data-testid="create-collection-button"]');
    
    await page.fill('[data-testid="collection-name"]', 'Python Development Collection');
    await page.fill('[data-testid="collection-description"]', 'Documents related to Python programming and development');
    
    // Enable RAG for collection
    await page.check('[data-testid="collection-rag-enabled"]');
    
    // Set collection RAG parameters
    await page.fill('[data-testid="collection-similarity-threshold"]', '0.7');
    await page.selectOption('[data-testid="collection-search-strategy"]', 'semantic');
    
    await page.click('[data-testid="save-collection-button"]');
    
    // Should appear in collections list
    await expect(page.locator('[data-testid="collection-item"]').first()).toBeVisible();
    await expect(page.locator('[data-testid="rag-enabled-badge"]').first()).toBeVisible();
    
    // Add documents to collection
    await page.click('[data-testid="collection-item"]');
    await page.click('[data-testid="add-documents-button"]');
    
    // Should show document selector with RAG filtering
    await expect(page.locator('[data-testid="document-selector"]')).toBeVisible();
    await expect(page.locator('[data-testid="filter-rag-indexed"]')).toBeVisible();
    
    // Filter for RAG-indexed documents
    await page.check('[data-testid="filter-rag-indexed"]');
    
    // Select documents
    await page.check('[data-testid="document-checkbox"]');
    await page.click('[data-testid="add-selected-documents"]');
    
    // Should show documents in collection
    await expect(page.locator('[data-testid="collection-documents"]')).toBeVisible();
    await expect(page.locator('[data-testid="collection-document-item"]')).toHaveCountGreaterThan(0);
  });

  test('should provide RAG performance analytics', async ({ page }) => {
    // Upload documents and wait for indexing
    for (const doc of RAG_DOCUMENTS) {
      await uploadDocument(page, doc);
    }
    
    // Navigate to RAG analytics
    await page.click('[data-testid="analytics-tab"]');
    await page.click('[data-testid="rag-analytics-section"]');
    
    // Should show indexing statistics
    await expect(page.locator('[data-testid="total-documents"]')).toBeVisible();
    await expect(page.locator('[data-testid="indexed-documents"]')).toBeVisible();
    await expect(page.locator('[data-testid="total-vectors"]')).toBeVisible();
    
    // Should show search performance metrics
    await expect(page.locator('[data-testid="avg-search-time"]')).toBeVisible();
    await expect(page.locator('[data-testid="search-success-rate"]')).toBeVisible();
    
    // Should show embedding model information
    await expect(page.locator('[data-testid="embedding-model-info"]')).toBeVisible();
    await expect(page.locator('[data-testid="vector-dimensions-info"]')).toBeVisible();
    
    // Should display usage charts
    await expect(page.locator('[data-testid="rag-usage-chart"]')).toBeVisible();
    await expect(page.locator('[data-testid="search-frequency-chart"]')).toBeVisible();
  });

  test('should handle bulk operations for RAG documents', async ({ page }) => {
    // Upload multiple documents
    for (const doc of RAG_DOCUMENTS) {
      await uploadDocument(page, doc);
    }
    
    // Select multiple documents
    await page.check('[data-testid="select-all-documents"]');
    
    // Should show bulk actions
    await expect(page.locator('[data-testid="bulk-actions-bar"]')).toBeVisible();
    
    // Test bulk RAG operations
    await page.click('[data-testid="bulk-actions-dropdown"]');
    
    // Should show RAG-specific bulk actions
    await expect(page.locator('[data-testid="bulk-reindex"]')).toBeVisible();
    await expect(page.locator('[data-testid="bulk-update-chunking"]')).toBeVisible();
    await expect(page.locator('[data-testid="bulk-enable-rag"]')).toBeVisible();
    
    // Test bulk re-indexing
    await page.click('[data-testid="bulk-reindex"]');
    
    // Should show confirmation dialog
    await expect(page.locator('[data-testid="confirm-bulk-reindex"]')).toBeVisible();
    await page.click('[data-testid="confirm-reindex-button"]');
    
    // Should show progress indicator
    await expect(page.locator('[data-testid="bulk-operation-progress"]')).toBeVisible();
    
    // Wait for completion
    await page.waitForSelector('[data-testid="bulk-operation-complete"]', { timeout: 30000 });
  });

  test('should validate document content for RAG suitability', async ({ page }) => {
    await page.click('[data-testid="upload-document-button"]');
    
    // Test with very short content
    await page.fill('[data-testid="document-title"]', 'Short Document');
    await page.fill('[data-testid="document-content"]', 'Hi');
    await page.check('[data-testid="enable-rag-indexing"]');
    
    // Should show validation warning
    await expect(page.locator('[data-testid="rag-validation-warning"]')).toBeVisible();
    await expect(page.locator('[data-testid="content-too-short-warning"]')).toBeVisible();
    
    // Test with appropriate content
    await page.fill('[data-testid="document-content"]', RAG_DOCUMENTS[0].content);
    
    // Warning should disappear
    await expect(page.locator('[data-testid="content-too-short-warning"]')).not.toBeVisible();
    
    // Should show RAG suitability score
    await expect(page.locator('[data-testid="rag-suitability-score"]')).toBeVisible();
    
    // Should show chunking preview
    await expect(page.locator('[data-testid="chunking-preview"]')).toBeVisible();
    await expect(page.locator('[data-testid="estimated-chunks"]')).toBeVisible();
  });

  test('should support different embedding models and configurations', async ({ page }) => {
    await page.click('[data-testid="rag-settings-tab"]');
    
    // Should show embedding model options
    await expect(page.locator('[data-testid="embedding-model-section"]')).toBeVisible();
    
    // Should list available models
    const modelSelect = page.locator('[data-testid="embedding-model-select"]');
    await expect(modelSelect).toBeVisible();
    
    // Should show model details
    await modelSelect.click();
    const modelOptions = page.locator('[data-testid="model-option"]');
    await expect(modelOptions).toHaveCountGreaterThan(0);
    
    // Should show model specifications
    await modelOptions.first().hover();
    await expect(page.locator('[data-testid="model-specs-tooltip"]')).toBeVisible();
    
    // Test chunking strategy options
    await expect(page.locator('[data-testid="chunking-strategy-section"]')).toBeVisible();
    
    const strategySelect = page.locator('[data-testid="chunking-strategy-select"]');
    await strategySelect.click();
    
    // Should have multiple chunking options
    await expect(page.locator('[data-testid="strategy-option"]')).toHaveCountGreaterThan(1);
    
    // Should show strategy descriptions
    await page.hover('[data-testid="strategy-option"]');
    await expect(page.locator('[data-testid="strategy-description"]')).toBeVisible();
    
    // Test chunk size configuration
    await expect(page.locator('[data-testid="chunk-size-slider"]')).toBeVisible();
    await expect(page.locator('[data-testid="chunk-overlap-slider"]')).toBeVisible();
    
    // Should show real-time preview
    await expect(page.locator('[data-testid="chunking-preview-section"]')).toBeVisible();
  });
});

test.describe('RAG Document Processing and Indexing', () => {
  test.beforeEach(async ({ page }) => {
    await loginUser(page);
    await page.click('text=Knowledge');
    await page.waitForSelector('[data-testid="knowledge-content"]', { timeout: 5000 });
  });

  test('should show indexing progress for large documents', async ({ page }) => {
    // Create a large document
    const largeContent = RAG_DOCUMENTS[0].content.repeat(50); // Make it large
    
    await page.click('[data-testid="upload-document-button"]');
    await page.fill('[data-testid="document-title"]', 'Large Document for RAG');
    await page.fill('[data-testid="document-content"]', largeContent);
    await page.check('[data-testid="enable-rag-indexing"]');
    
    // Save document
    await page.click('[data-testid="save-document-button"]');
    
    // Should show indexing progress
    await expect(page.locator('[data-testid="indexing-progress"]')).toBeVisible();
    await expect(page.locator('[data-testid="progress-bar"]')).toBeVisible();
    await expect(page.locator('[data-testid="indexing-status-text"]')).toBeVisible();
    
    // Should show processing steps
    await expect(page.locator('[data-testid="processing-step-chunking"]')).toBeVisible();
    await expect(page.locator('[data-testid="processing-step-embedding"]')).toBeVisible();
    await expect(page.locator('[data-testid="processing-step-storing"]')).toBeVisible();
    
    // Wait for completion
    await page.waitForSelector('[data-testid="indexing-complete"]', { timeout: 60000 });
    
    // Should show final statistics
    await expect(page.locator('[data-testid="final-chunk-count"]')).toBeVisible();
    await expect(page.locator('[data-testid="final-vector-count"]')).toBeVisible();
  });

  test('should handle file uploads with RAG indexing', async ({ page }) => {
    // Test file upload (PDF, DOC, etc.)
    await page.click('[data-testid="upload-file-button"]');
    
    // Should show file upload options
    await expect(page.locator('[data-testid="file-upload-area"]')).toBeVisible();
    
    // Should show RAG indexing options for file uploads
    await expect(page.locator('[data-testid="file-rag-options"]')).toBeVisible();
    
    // Should allow OCR options for image-based files
    if (await page.locator('[data-testid="ocr-options"]').isVisible()) {
      await expect(page.locator('[data-testid="enable-ocr"]')).toBeVisible();
      await expect(page.locator('[data-testid="ocr-language-select"]')).toBeVisible();
    }
    
    // Should show supported file types for RAG
    await expect(page.locator('[data-testid="supported-formats-list"]')).toBeVisible();
    const supportedFormats = page.locator('[data-testid="supported-format"]');
    await expect(supportedFormats).toHaveCountGreaterThan(3); // PDF, DOC, TXT, MD, etc.
  });

  test('should provide vector search debugging tools', async ({ page }) => {
    // Upload and index a document
    await uploadDocument(page, RAG_DOCUMENTS[0]);
    
    // Navigate to debug tools
    await page.click('[data-testid="debug-tools-tab"]');
    
    // Should show vector search debugging
    await expect(page.locator('[data-testid="vector-debug-section"]')).toBeVisible();
    
    // Should allow direct vector queries
    await expect(page.locator('[data-testid="vector-query-input"]')).toBeVisible();
    await expect(page.locator('[data-testid="similarity-threshold-debug"]')).toBeVisible();
    
    // Test vector search
    await page.fill('[data-testid="vector-query-input"]', 'python programming');
    await page.click('[data-testid="execute-vector-search"]');
    
    // Should show detailed results
    await page.waitForSelector('[data-testid="debug-search-results"]', { timeout: 10000 });
    
    // Should show similarity scores with high precision
    const debugResults = page.locator('[data-testid="debug-result-item"]');
    await expect(debugResults).toHaveCountGreaterThan(0);
    
    const firstResult = debugResults.first();
    await expect(firstResult.locator('[data-testid="precise-similarity"]')).toBeVisible();
    await expect(firstResult.locator('[data-testid="vector-visualization"]')).toBeVisible();
    
    // Should allow vector inspection
    await firstResult.click();
    await expect(page.locator('[data-testid="vector-details-modal"]')).toBeVisible();
    await expect(page.locator('[data-testid="vector-dimensions-list"]')).toBeVisible();
  });
});

test.afterAll(async ({ browser }) => {
  // Cleanup test documents and collections
  console.log('Knowledge RAG integration tests completed. Test documents may need manual cleanup.');
});