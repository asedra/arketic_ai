import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';
import { createHash } from 'crypto';

test.describe('Multi-file Upload and RAG Tests', () => {
  let testFiles: { path: string; name: string; hash: string }[] = [];
  let uploadedIds: string[] = [];

  test.beforeAll(async () => {
    // Create diverse test files
    const testDir = path.join(process.cwd(), 'test-multifile');
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }

    // Create various file types and sizes
    const documents = [
      {
        name: 'document1.txt',
        content: 'This is a plain text document about software development best practices.',
        type: 'text/plain'
      },
      {
        name: 'document2.md',
        content: '# Markdown Document\n\n## Section 1\nThis covers project management methodologies.',
        type: 'text/markdown'
      },
      {
        name: 'data.json',
        content: JSON.stringify({ 
          title: 'Configuration', 
          settings: { theme: 'dark', language: 'en' } 
        }),
        type: 'application/json'
      },
      {
        name: 'report.csv',
        content: 'Date,Sales,Region\n2024-01-01,1000,North\n2024-01-02,1500,South',
        type: 'text/csv'
      },
      {
        name: 'large_doc.txt',
        content: 'Large document content. '.repeat(10000), // ~170KB
        type: 'text/plain'
      }
    ];

    // Create additional files for batch testing
    for (let i = 1; i <= 10; i++) {
      documents.push({
        name: `batch_file_${i}.txt`,
        content: `Batch file ${i} content. This is test document number ${i} with unique content for testing.`,
        type: 'text/plain'
      });
    }

    // Write files and calculate hashes
    for (const doc of documents) {
      const filepath = path.join(testDir, doc.name);
      fs.writeFileSync(filepath, doc.content);
      
      const hash = createHash('md5').update(doc.content).digest('hex');
      testFiles.push({
        path: filepath,
        name: doc.name,
        hash: hash
      });
    }
  });

  test.afterAll(async () => {
    // Cleanup
    for (const file of testFiles) {
      if (fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }
    }
    
    const testDir = path.join(process.cwd(), 'test-multifile');
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

  test('should upload multiple files simultaneously', async ({ page }) => {
    await page.goto('http://localhost:3000/knowledge');
    await page.waitForLoadState('networkidle');

    // Select first 5 files for multi-upload
    const filesToUpload = testFiles.slice(0, 5).map(f => f.path);

    // Click upload button
    await page.click('button:has-text("Upload")');

    // Set multiple files at once
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(filesToUpload);

    // Wait for all uploads to complete
    const uploadResponses = [];
    for (let i = 0; i < 5; i++) {
      uploadResponses.push(
        page.waitForResponse(resp => 
          resp.url().includes('/api/knowledge/upload') && resp.status() === 200
        )
      );
    }
    
    const responses = await Promise.all(uploadResponses);

    // Verify all files uploaded
    for (const response of responses) {
      const data = await response.json();
      expect(data.id).toBeTruthy();
      uploadedIds.push(data.id);
    }

    // Verify files appear in list
    for (const file of testFiles.slice(0, 5)) {
      await expect(page.locator(`text=${file.name}`)).toBeVisible();
    }

    // Check upload status indicators
    const statusIndicators = page.locator('.upload-status');
    const successCount = await statusIndicators.filter({ hasText: 'Success' }).count();
    expect(successCount).toBe(5);
  });

  test('should handle drag and drop for multiple files', async ({ page }) => {
    await page.goto('http://localhost:3000/knowledge');
    await page.waitForLoadState('networkidle');

    // Get drop zone
    const dropZone = page.locator('.drop-zone, [data-testid="drop-zone"]');
    await expect(dropZone).toBeVisible();

    // Simulate drag and drop for batch files
    const batchFiles = testFiles.filter(f => f.name.startsWith('batch_file')).slice(0, 3);
    
    // Create DataTransfer
    await page.evaluate((files) => {
      const dropArea = document.querySelector('.drop-zone, [data-testid="drop-zone"]') as HTMLElement;
      if (!dropArea) return;

      // Simulate dragenter
      const dragEnterEvent = new DragEvent('dragenter', {
        bubbles: true,
        cancelable: true,
        dataTransfer: new DataTransfer()
      });
      dropArea.dispatchEvent(dragEnterEvent);

      // Simulate dragover
      const dragOverEvent = new DragEvent('dragover', {
        bubbles: true,
        cancelable: true,
        dataTransfer: new DataTransfer()
      });
      dropArea.dispatchEvent(dragOverEvent);
    }, batchFiles);

    // Verify drop zone is active
    await expect(dropZone).toHaveClass(/active|dragging|dragover/);

    // Use file chooser for actual file selection (Playwright limitation)
    const fileChooserPromise = page.waitForEvent('filechooser');
    await dropZone.click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(batchFiles.map(f => f.path));

    // Wait for uploads
    await page.waitForResponse(resp => 
      resp.url().includes('/api/knowledge/upload') && resp.status() === 200
    );

    // Verify files uploaded
    for (const file of batchFiles) {
      await expect(page.locator(`text=${file.name}`)).toBeVisible();
    }
  });

  test('should show upload progress for large files', async ({ page }) => {
    await page.goto('http://localhost:3000/knowledge');
    await page.waitForLoadState('networkidle');

    // Upload large file
    const largeFile = testFiles.find(f => f.name === 'large_doc.txt');
    if (!largeFile) return;

    await page.click('button:has-text("Upload")');
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(largeFile.path);

    // Check for progress indicator
    const progressBar = page.locator('.upload-progress, [role="progressbar"]');
    await expect(progressBar).toBeVisible({ timeout: 2000 });

    // Verify progress updates
    const initialProgress = await progressBar.getAttribute('aria-valuenow') || '0';
    await page.waitForTimeout(500);
    const midProgress = await progressBar.getAttribute('aria-valuenow') || '0';
    
    expect(parseInt(midProgress)).toBeGreaterThanOrEqual(parseInt(initialProgress));

    // Wait for completion
    await page.waitForResponse(resp => 
      resp.url().includes('/api/knowledge/upload') && resp.status() === 200
    );

    // Progress should reach 100 or disappear
    const finalProgress = await progressBar.getAttribute('aria-valuenow');
    if (finalProgress) {
      expect(parseInt(finalProgress)).toBe(100);
    }
  });

  test('should validate file types and show errors', async ({ page }) => {
    await page.goto('http://localhost:3000/knowledge');
    await page.waitForLoadState('networkidle');

    // Create unsupported file
    const testDir = path.join(process.cwd(), 'test-multifile');
    const unsupportedFile = path.join(testDir, 'test.exe');
    fs.writeFileSync(unsupportedFile, 'Binary content');

    // Try to upload unsupported file
    await page.click('button:has-text("Upload")');
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(unsupportedFile);

    // Check for error message
    await expect(page.locator('.error-message, .toast-error')).toBeVisible();
    await expect(page.locator('.error-message, .toast-error')).toContainText(/not supported|invalid file type/i);

    // Cleanup
    fs.unlinkSync(unsupportedFile);
  });

  test('should handle duplicate file detection', async ({ page }) => {
    await page.goto('http://localhost:3000/knowledge');
    await page.waitForLoadState('networkidle');

    // Upload a file first time
    const testFile = testFiles[0];
    await page.click('button:has-text("Upload")');
    let fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(testFile.path);

    // Wait for first upload
    await page.waitForResponse(resp => 
      resp.url().includes('/api/knowledge/upload') && resp.status() === 200
    );

    // Try to upload the same file again
    await page.click('button:has-text("Upload")');
    fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(testFile.path);

    // Check for duplicate warning
    const duplicateModal = page.locator('.duplicate-modal, .modal:has-text("Duplicate")');
    await expect(duplicateModal).toBeVisible({ timeout: 5000 });
    
    // Should show options
    await expect(duplicateModal).toContainText(/replace|skip|rename/i);

    // Choose to skip
    await page.click('button:has-text("Skip")');

    // Modal should close
    await expect(duplicateModal).not.toBeVisible();
  });

  test('should batch process embeddings for multiple files', async ({ page }) => {
    await page.goto('http://localhost:3000/knowledge');
    await page.waitForLoadState('networkidle');

    // Upload multiple files at once
    const batchFiles = testFiles.filter(f => f.name.startsWith('batch_file')).slice(0, 5);
    
    await page.click('button:has-text("Upload")');
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(batchFiles.map(f => f.path));

    // Wait for uploads
    const uploadPromises = batchFiles.map(() => 
      page.waitForResponse(resp => 
        resp.url().includes('/api/knowledge/upload') && resp.status() === 200
      )
    );
    await Promise.all(uploadPromises);

    // Check batch embedding status
    const embeddingStatus = page.locator('.batch-embedding-status');
    await expect(embeddingStatus).toBeVisible();
    await expect(embeddingStatus).toContainText(/Processing \d+ files/);

    // Wait for embeddings to complete
    await page.waitForSelector('.batch-embedding-status:has-text("Complete")', {
      timeout: 30000
    });

    // Verify all files have embeddings
    for (const file of batchFiles) {
      const fileRow = page.locator(`tr:has-text("${file.name}")`);
      const status = fileRow.locator('.embedding-status');
      await expect(status).toHaveText(/Ready|Complete/i);
    }
  });

  test('should support bulk operations on uploaded files', async ({ page }) => {
    await page.goto('http://localhost:3000/knowledge');
    await page.waitForLoadState('networkidle');

    // Select multiple files using checkboxes
    const checkboxes = page.locator('input[type="checkbox"].file-select');
    const count = await checkboxes.count();
    
    // Select first 3 files
    for (let i = 0; i < Math.min(3, count); i++) {
      await checkboxes.nth(i).check();
    }

    // Verify bulk action bar appears
    const bulkActions = page.locator('.bulk-actions');
    await expect(bulkActions).toBeVisible();
    await expect(bulkActions).toContainText('3 selected');

    // Test bulk tag operation
    await page.click('button:has-text("Add Tags")');
    await page.fill('input[placeholder="Enter tags"]', 'test, multi-upload, rag');
    await page.click('button:has-text("Apply")');

    // Wait for tag update
    await page.waitForResponse(resp => 
      resp.url().includes('/api/knowledge/bulk-update') && resp.status() === 200
    );

    // Verify tags applied
    for (let i = 0; i < 3; i++) {
      const fileRow = page.locator('.knowledge-item').nth(i);
      await expect(fileRow.locator('.tag:has-text("test")')).toBeVisible();
      await expect(fileRow.locator('.tag:has-text("multi-upload")')).toBeVisible();
    }
  });

  test('should handle upload cancellation', async ({ page }) => {
    await page.goto('http://localhost:3000/knowledge');
    await page.waitForLoadState('networkidle');

    // Start uploading large file
    const largeFile = testFiles.find(f => f.name === 'large_doc.txt');
    if (!largeFile) return;

    await page.click('button:has-text("Upload")');
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(largeFile.path);

    // Wait for upload to start
    await page.waitForSelector('.upload-progress', { timeout: 2000 });

    // Cancel upload
    const cancelButton = page.locator('button:has-text("Cancel")');
    await cancelButton.click();

    // Verify cancellation
    await expect(page.locator('.upload-cancelled')).toBeVisible();
    
    // File should not appear in list
    await expect(page.locator(`text=${largeFile.name}`)).not.toBeVisible({ timeout: 5000 });
  });

  test('should maintain file metadata and search index', async ({ page }) => {
    await page.goto('http://localhost:3000/knowledge');
    await page.waitForLoadState('networkidle');

    // Search for uploaded files
    const searchInput = page.locator('input[placeholder*="Search"]');
    await searchInput.fill('batch file 5');
    await searchInput.press('Enter');

    // Wait for search results
    await page.waitForResponse(resp => 
      resp.url().includes('/api/knowledge/search') && resp.status() === 200
    );

    // Verify specific file found
    await expect(page.locator('text=batch_file_5.txt')).toBeVisible();

    // Click on file to view metadata
    await page.click('text=batch_file_5.txt');

    // Verify metadata panel
    const metadataPanel = page.locator('.file-metadata');
    await expect(metadataPanel).toBeVisible();
    
    // Check metadata fields
    await expect(metadataPanel).toContainText('File Size');
    await expect(metadataPanel).toContainText('Upload Date');
    await expect(metadataPanel).toContainText('Content Type');
    await expect(metadataPanel).toContainText('Embeddings');
    
    // Verify file hash for integrity
    const hashElement = metadataPanel.locator('.file-hash');
    if (await hashElement.isVisible()) {
      const displayedHash = await hashElement.textContent();
      const originalFile = testFiles.find(f => f.name === 'batch_file_5.txt');
      expect(displayedHash).toContain(originalFile?.hash.substring(0, 8));
    }
  });

  test('should support file versioning for updated uploads', async ({ page }) => {
    await page.goto('http://localhost:3000/knowledge');
    await page.waitForLoadState('networkidle');

    // Upload initial version
    const testFile = testFiles[0];
    await page.click('button:has-text("Upload")');
    let fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(testFile.path);

    await page.waitForResponse(resp => 
      resp.url().includes('/api/knowledge/upload') && resp.status() === 200
    );

    // Modify file content
    const modifiedContent = fs.readFileSync(testFile.path, 'utf-8') + '\nUpdated content';
    fs.writeFileSync(testFile.path, modifiedContent);

    // Upload modified version
    await page.click('button:has-text("Upload")');
    fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(testFile.path);

    // Handle version conflict
    const versionModal = page.locator('.version-modal');
    await expect(versionModal).toBeVisible();
    await expect(versionModal).toContainText('newer version');

    // Choose to create new version
    await page.click('button:has-text("Create Version")');

    await page.waitForResponse(resp => 
      resp.url().includes('/api/knowledge/upload') && resp.status() === 200
    );

    // Check version indicator
    const fileRow = page.locator(`tr:has-text("${testFile.name}")`);
    const versionBadge = fileRow.locator('.version-badge');
    await expect(versionBadge).toContainText('v2');

    // Restore original content
    fs.writeFileSync(testFile.path, fs.readFileSync(testFile.path, 'utf-8').replace('\nUpdated content', ''));
  });

  test('should generate combined embeddings for related files', async ({ page }) => {
    await page.goto('http://localhost:3000/knowledge');
    await page.waitForLoadState('networkidle');

    // Select related files
    const relatedFiles = testFiles.slice(0, 3);
    
    const checkboxes = page.locator('input[type="checkbox"].file-select');
    for (let i = 0; i < 3; i++) {
      await checkboxes.nth(i).check();
    }

    // Create collection
    await page.click('button:has-text("Create Collection")');
    
    await page.fill('input[name="collection_name"]', 'Test RAG Collection');
    await page.fill('textarea[name="collection_description"]', 'Combined documents for RAG testing');
    
    await page.click('button:has-text("Create")');

    // Wait for collection creation and embedding
    await page.waitForResponse(resp => 
      resp.url().includes('/api/knowledge/collections') && resp.status() === 201
    );

    // Navigate to collections
    await page.click('text=Collections');

    // Verify collection created
    await expect(page.locator('text=Test RAG Collection')).toBeVisible();
    
    // Check collection has combined embeddings
    const collectionCard = page.locator('.collection-card:has-text("Test RAG Collection")');
    await expect(collectionCard.locator('.file-count')).toContainText('3 files');
    await expect(collectionCard.locator('.embedding-status')).toContainText('Ready');
  });
});