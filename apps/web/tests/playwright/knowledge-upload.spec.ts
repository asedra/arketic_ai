/**
 * Playwright E2E Tests for Knowledge Management - Multi-file Upload
 * 
 * This test file validates the multi-file upload functionality
 * in the Knowledge Management interface.
 * 
 * Author: Claude
 * Created: 2025-01-10
 */

import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';

// Test configuration
const TEST_USER = {
  email: 'test@arketic.com',
  password: 'testpassword123'
};

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';
const API_URL = process.env.API_URL || 'http://localhost:8000';

// Helper function to create test files
async function createTestFiles(testDir: string) {
  if (!fs.existsSync(testDir)) {
    fs.mkdirSync(testDir, { recursive: true });
  }

  const files = {
    txt: path.join(testDir, 'test-document.txt'),
    md: path.join(testDir, 'test-document.md'),
    pdf: path.join(testDir, 'test-document.pdf')
  };

  // Create TXT file
  fs.writeFileSync(files.txt, 'This is a test text document for Playwright testing.\nIt contains multiple lines.\nKnowledge base testing.');

  // Create MD file
  fs.writeFileSync(files.md, `# Test Markdown Document

## Section 1
This is a **test** markdown document with *formatting*.

- Bullet point 1
- Bullet point 2

\`\`\`javascript
function test() {
  return 'code block';
}
\`\`\`
`);

  return files;
}

// Test suite
test.describe('Knowledge Management - Multi-file Upload', () => {
  let testFiles: any;
  const testDir = '/tmp/playwright-test-files';

  test.beforeAll(async () => {
    // Create test files
    testFiles = await createTestFiles(testDir);
  });

  test.afterAll(async () => {
    // Cleanup test files
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  test.beforeEach(async ({ page }) => {
    // Navigate to the application
    await page.goto(BASE_URL);

    // Login if not already logged in
    const isLoginPage = await page.locator('input[name="email"]').isVisible();
    
    if (isLoginPage) {
      await page.fill('input[name="email"]', TEST_USER.email);
      await page.fill('input[name="password"]', TEST_USER.password);
      await page.click('button[type="submit"]');
      
      // Wait for navigation to dashboard
      await page.waitForURL('**/dashboard/**', { timeout: 10000 });
    }

    // Navigate to Knowledge Management
    await page.click('text=Knowledge');
    await page.waitForSelector('[data-testid="knowledge-content"]', { timeout: 5000 });
  });

  test('should display file upload interface', async ({ page }) => {
    // Check for upload button
    const uploadButton = page.locator('button:has-text("Upload Files")');
    await expect(uploadButton).toBeVisible();

    // Click upload button to open modal
    await uploadButton.click();

    // Check modal is visible
    const uploadModal = page.locator('[role="dialog"]');
    await expect(uploadModal).toBeVisible();

    // Check for file input
    const fileInput = page.locator('input[type="file"]');
    await expect(fileInput).toBeAttached();
  });

  test('should upload a single text file', async ({ page }) => {
    // Open upload modal
    await page.click('button:has-text("Upload Files")');

    // Upload single file
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(testFiles.txt);

    // Check file appears in preview
    await expect(page.locator('text=test-document.txt')).toBeVisible();

    // Click upload button
    await page.click('button:has-text("Upload"):not(:has-text("Upload Files"))');

    // Wait for upload to complete
    await expect(page.locator('text=Upload successful')).toBeVisible({ timeout: 10000 });

    // Check document appears in list
    await page.waitForTimeout(2000); // Wait for list to refresh
    await expect(page.locator('text=test-document.txt').first()).toBeVisible();
  });

  test('should upload multiple files simultaneously', async ({ page }) => {
    // Open upload modal
    await page.click('button:has-text("Upload Files")');

    // Upload multiple files
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles([testFiles.txt, testFiles.md]);

    // Check both files appear in preview
    await expect(page.locator('text=test-document.txt')).toBeVisible();
    await expect(page.locator('text=test-document.md')).toBeVisible();

    // Check progress indicators
    const progressBars = page.locator('[role="progressbar"]');
    await expect(progressBars).toHaveCount(2);

    // Click upload button
    await page.click('button:has-text("Upload"):not(:has-text("Upload Files"))');

    // Wait for both uploads to complete
    await expect(page.locator('text=2 files uploaded successfully')).toBeVisible({ timeout: 15000 });

    // Check documents appear in list
    await page.waitForTimeout(2000);
    await expect(page.locator('text=test-document.txt').first()).toBeVisible();
    await expect(page.locator('text=test-document.md').first()).toBeVisible();
  });

  test('should show individual progress for each file', async ({ page }) => {
    // Open upload modal
    await page.click('button:has-text("Upload Files")');

    // Upload multiple files
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles([testFiles.txt, testFiles.md]);

    // Start upload
    await page.click('button:has-text("Upload"):not(:has-text("Upload Files"))');

    // Check individual progress bars
    const txtProgress = page.locator('[data-file="test-document.txt"] [role="progressbar"]');
    const mdProgress = page.locator('[data-file="test-document.md"] [role="progressbar"]');

    await expect(txtProgress).toBeVisible();
    await expect(mdProgress).toBeVisible();

    // Wait for completion indicators
    await expect(page.locator('[data-file="test-document.txt"] .text-green-500')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('[data-file="test-document.md"] .text-green-500')).toBeVisible({ timeout: 10000 });
  });

  test('should handle upload errors gracefully', async ({ page }) => {
    // Create a file that's too large (mock scenario)
    const largeFile = path.join(testDir, 'large-file.txt');
    fs.writeFileSync(largeFile, 'x'.repeat(100 * 1024 * 1024)); // 100MB file

    // Open upload modal
    await page.click('button:has-text("Upload Files")');

    // Try to upload large file
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(largeFile);

    // Click upload
    await page.click('button:has-text("Upload"):not(:has-text("Upload Files"))');

    // Check for error message
    await expect(page.locator('text=/File too large|Upload failed/')).toBeVisible({ timeout: 10000 });

    // Cleanup large file
    fs.unlinkSync(largeFile);
  });

  test('should search in uploaded documents', async ({ page }) => {
    // First upload a file
    await page.click('button:has-text("Upload Files")');
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(testFiles.txt);
    await page.click('button:has-text("Upload"):not(:has-text("Upload Files"))');
    await expect(page.locator('text=Upload successful')).toBeVisible({ timeout: 10000 });

    // Wait for modal to close
    await page.waitForTimeout(1000);

    // Use search functionality
    const searchInput = page.locator('input[placeholder*="Search"]');
    await searchInput.fill('test text document');
    await searchInput.press('Enter');

    // Wait for search results
    await page.waitForTimeout(2000);

    // Check if uploaded document appears in search results
    await expect(page.locator('text=test-document.txt').first()).toBeVisible();
  });

  test('should delete uploaded documents', async ({ page }) => {
    // First upload a file
    await page.click('button:has-text("Upload Files")');
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(testFiles.txt);
    await page.click('button:has-text("Upload"):not(:has-text("Upload Files"))');
    await expect(page.locator('text=Upload successful')).toBeVisible({ timeout: 10000 });

    // Wait for document to appear
    await page.waitForTimeout(2000);
    const documentRow = page.locator('tr:has-text("test-document.txt")').first();
    await expect(documentRow).toBeVisible();

    // Click delete button
    await documentRow.locator('button[aria-label="Delete"]').click();

    // Confirm deletion
    const confirmButton = page.locator('button:has-text("Confirm")');
    if (await confirmButton.isVisible()) {
      await confirmButton.click();
    }

    // Check document is removed
    await expect(page.locator('text=Document deleted')).toBeVisible({ timeout: 5000 });
    await expect(documentRow).not.toBeVisible({ timeout: 5000 });
  });
});

// Test suite for API integration
test.describe('Knowledge Upload - API Integration', () => {
  test('should handle concurrent uploads efficiently', async ({ page }) => {
    const testDir = '/tmp/playwright-concurrent-test';
    const files = await createTestFiles(testDir);

    // Create additional test files
    const extraFiles = [];
    for (let i = 1; i <= 5; i++) {
      const filePath = path.join(testDir, `test-file-${i}.txt`);
      fs.writeFileSync(filePath, `Test content for file ${i}`);
      extraFiles.push(filePath);
    }

    // Navigate to Knowledge Management
    await page.goto(BASE_URL);
    await page.click('text=Knowledge');

    // Open upload modal
    await page.click('button:has-text("Upload Files")');

    // Upload all files at once
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(extraFiles);

    // Start upload
    await page.click('button:has-text("Upload"):not(:has-text("Upload Files"))');

    // Monitor all progress bars
    const progressBars = page.locator('[role="progressbar"]');
    await expect(progressBars).toHaveCount(5);

    // Wait for all uploads to complete
    await expect(page.locator('text=/5 files uploaded successfully/')).toBeVisible({ timeout: 30000 });

    // Cleanup
    fs.rmSync(testDir, { recursive: true, force: true });
  });

  test('should maintain upload state on page refresh', async ({ page, context }) => {
    // This test would require WebSocket or state persistence implementation
    // Placeholder for future implementation
    test.skip();
  });
});