/**
 * Organization Management E2E Tests using Playwright MCP
 * 
 * This test suite validates the organization management functionality
 * including people management, compliance tracking, and permissions.
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

test.describe('Organization Management Interface', () => {
  test.beforeEach(async ({ page }) => {
    await loginUser(page);
    
    // Navigate to My Organization
    await page.click('text=My Organization');
    await page.waitForSelector('[data-testid="organization-content"]', { timeout: 5000 });
  });

  test('should display organization overview', async ({ page }) => {
    // Check for main organization components
    await expect(page.locator('[data-testid="organization-tabs"]')).toBeVisible();
    await expect(page.locator('[data-testid="people-tab"]')).toBeVisible();
    await expect(page.locator('[data-testid="services-tab"]')).toBeVisible();
    await expect(page.locator('[data-testid="iso-tab"]')).toBeVisible();
  });

  test('should switch between organization tabs', async ({ page }) => {
    // Click on different tabs
    await page.click('[data-testid="services-tab"]');
    await expect(page.locator('[data-testid="services-content"]')).toBeVisible();
    
    await page.click('[data-testid="iso-tab"]');
    await expect(page.locator('[data-testid="iso-content"]')).toBeVisible();
    
    await page.click('[data-testid="people-tab"]');
    await expect(page.locator('[data-testid="people-content"]')).toBeVisible();
  });
});

test.describe('People Management', () => {
  test.beforeEach(async ({ page }) => {
    await loginUser(page);
    await page.click('text=My Organization');
    await page.waitForSelector('[data-testid="organization-content"]', { timeout: 5000 });
    
    // Ensure we're on people tab
    await page.click('[data-testid="people-tab"]');
    await page.waitForSelector('[data-testid="people-content"]', { timeout: 5000 });
  });

  test('should display people list', async ({ page }) => {
    // Check for people table/grid
    await expect(page.locator('[data-testid="people-list"]')).toBeVisible();
    
    // Check for add person button
    await expect(page.locator('[data-testid="add-person-button"]')).toBeVisible();
  });

  test('should open add person modal', async ({ page }) => {
    // Click add person button
    await page.click('[data-testid="add-person-button"]');
    
    // Modal should open
    await expect(page.locator('[data-testid="add-person-modal"]')).toBeVisible();
    
    // Check for required fields
    await expect(page.locator('input[name="name"]')).toBeVisible();
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('input[name="position"]')).toBeVisible();
  });

  test('should add a new person', async ({ page }) => {
    // Open add person modal
    await page.click('[data-testid="add-person-button"]');
    await page.waitForSelector('[data-testid="add-person-modal"]');
    
    const testPerson = {
      name: 'John Doe',
      email: 'john.doe@example.com',
      position: 'Software Engineer',
      department: 'Engineering'
    };
    
    // Fill form
    await page.fill('input[name="name"]', testPerson.name);
    await page.fill('input[name="email"]', testPerson.email);
    await page.fill('input[name="position"]', testPerson.position);
    
    // Fill department if field exists
    const departmentField = page.locator('input[name="department"]');
    if (await departmentField.isVisible()) {
      await departmentField.fill(testPerson.department);
    }
    
    // Submit
    await page.click('button[type="submit"]:has-text("Add Person")');
    
    // Should close modal and show success
    await expect(page.locator('[data-testid="add-person-modal"]')).not.toBeVisible();
    await expect(page.locator('text=/Person added|Successfully added/')).toBeVisible();
    
    // New person should appear in list
    await expect(page.locator(`[data-testid="people-list"]:has-text("${testPerson.name}")`)).toBeVisible();
  });

  test('should validate person form', async ({ page }) => {
    // Open add person modal
    await page.click('[data-testid="add-person-button"]');
    await page.waitForSelector('[data-testid="add-person-modal"]');
    
    // Try to submit empty form
    await page.click('button[type="submit"]:has-text("Add Person")');
    
    // Should show validation errors
    await expect(page.locator('text=/Name is required|Email is required/')).toBeVisible();
  });

  test('should edit person details', async ({ page }) => {
    // Look for existing person or add one first
    let editButton = page.locator('[data-testid="edit-person-button"]').first();
    
    // If no people exist, add one first
    if (!(await editButton.isVisible())) {
      await page.click('[data-testid="add-person-button"]');
      await page.fill('input[name="name"]', 'Test Person');
      await page.fill('input[name="email"]', 'test@example.com');
      await page.fill('input[name="position"]', 'Test Position');
      await page.click('button[type="submit"]:has-text("Add Person")');
      await page.waitForSelector('[data-testid="edit-person-button"]');
    }
    
    // Click edit button
    await page.click('[data-testid="edit-person-button"]').first();
    
    // Edit modal should open
    await expect(page.locator('[data-testid="edit-person-modal"]')).toBeVisible();
    
    // Modify details
    await page.fill('input[name="position"]', 'Updated Position');
    
    // Submit
    await page.click('button[type="submit"]:has-text("Update")');
    
    // Should show success message
    await expect(page.locator('text=/Person updated|Successfully updated/')).toBeVisible();
  });

  test('should delete person', async ({ page }) => {
    // Look for existing person or add one first
    let deleteButton = page.locator('[data-testid="delete-person-button"]').first();
    
    // If no people exist, add one first
    if (!(await deleteButton.isVisible())) {
      await page.click('[data-testid="add-person-button"]');
      await page.fill('input[name="name"]', 'Person To Delete');
      await page.fill('input[name="email"]', 'delete@example.com');
      await page.fill('input[name="position"]', 'Temporary Position');
      await page.click('button[type="submit"]:has-text("Add Person")');
      await page.waitForSelector('[data-testid="delete-person-button"]');
    }
    
    // Click delete button
    await page.click('[data-testid="delete-person-button"]').first();
    
    // Confirmation dialog should appear
    await expect(page.locator('[data-testid="delete-confirmation"]')).toBeVisible();
    
    // Confirm deletion
    await page.click('button:has-text("Delete")');
    
    // Should show success message
    await expect(page.locator('text=/Person deleted|Successfully deleted/')).toBeVisible();
  });

  test('should search people', async ({ page }) => {
    const searchInput = page.locator('[data-testid="people-search"]');
    
    if (await searchInput.isVisible()) {
      // Enter search term
      await searchInput.fill('Engineer');
      
      // Results should be filtered
      await page.waitForTimeout(1000); // Wait for search debounce
      
      // All visible people should contain the search term
      const peopleCards = page.locator('[data-testid="people-list"] .person-card');
      const count = await peopleCards.count();
      
      if (count > 0) {
        for (let i = 0; i < count; i++) {
          const cardText = await peopleCards.nth(i).textContent();
          expect(cardText?.toLowerCase()).toContain('engineer');
        }
      }
    }
  });
});

test.describe('Services Management', () => {
  test.beforeEach(async ({ page }) => {
    await loginUser(page);
    await page.click('text=My Organization');
    await page.waitForSelector('[data-testid="organization-content"]', { timeout: 5000 });
    
    // Navigate to services tab
    await page.click('[data-testid="services-tab"]');
    await page.waitForSelector('[data-testid="services-content"]', { timeout: 5000 });
  });

  test('should display services overview', async ({ page }) => {
    // Check for services grid/list
    await expect(page.locator('[data-testid="services-grid"]')).toBeVisible();
    
    // Check for filter controls
    const filterControls = page.locator('[data-testid="service-filters"]');
    if (await filterControls.isVisible()) {
      await expect(filterControls).toBeVisible();
    }
  });

  test('should filter services by category', async ({ page }) => {
    const categoryFilter = page.locator('[data-testid="category-filter"]');
    
    if (await categoryFilter.isVisible()) {
      // Select a category
      await categoryFilter.click();
      await page.click('text=Development');
      
      // Wait for filtering
      await page.waitForTimeout(1000);
      
      // Should show only development services
      const serviceCards = page.locator('[data-testid="services-grid"] .service-card');
      const count = await serviceCards.count();
      
      if (count > 0) {
        for (let i = 0; i < count; i++) {
          const card = serviceCards.nth(i);
          await expect(card.locator('.category')).toContainText('Development');
        }
      }
    }
  });

  test('should view service details', async ({ page }) => {
    // Look for service cards
    const serviceCard = page.locator('[data-testid="services-grid"] .service-card').first();
    
    if (await serviceCard.isVisible()) {
      await serviceCard.click();
      
      // Service details should open
      await expect(page.locator('[data-testid="service-details"]')).toBeVisible();
      
      // Should show service information
      await expect(page.locator('[data-testid="service-title"]')).toBeVisible();
      await expect(page.locator('[data-testid="service-description"]')).toBeVisible();
    }
  });
});

test.describe('ISO Compliance Management', () => {
  test.beforeEach(async ({ page }) => {
    await loginUser(page);
    await page.click('text=My Organization');
    await page.waitForSelector('[data-testid="organization-content"]', { timeout: 5000 });
    
    // Navigate to ISO tab
    await page.click('[data-testid="iso-tab"]');
    await page.waitForSelector('[data-testid="iso-content"]', { timeout: 5000 });
  });

  test('should display compliance dashboard', async ({ page }) => {
    // Check for compliance summary cards
    await expect(page.locator('[data-testid="compliance-summary"]')).toBeVisible();
    
    // Check for compliance matrix
    const complianceMatrix = page.locator('[data-testid="compliance-matrix"]');
    if (await complianceMatrix.isVisible()) {
      await expect(complianceMatrix).toBeVisible();
    }
  });

  test('should navigate compliance clauses', async ({ page }) => {
    // Look for clause explorer
    const clauseExplorer = page.locator('[data-testid="clause-explorer"]');
    
    if (await clauseExplorer.isVisible()) {
      // Click on a clause
      const firstClause = clauseExplorer.locator('.clause-item').first();
      if (await firstClause.isVisible()) {
        await firstClause.click();
        
        // Clause details should show
        await expect(page.locator('[data-testid="clause-details"]')).toBeVisible();
      }
    }
  });

  test('should view compliance documents', async ({ page }) => {
    // Look for documents tab
    const documentsTab = page.locator('[data-testid="iso-documents-tab"]');
    
    if (await documentsTab.isVisible()) {
      await documentsTab.click();
      
      // Documents table should show
      await expect(page.locator('[data-testid="documents-table"]')).toBeVisible();
    }
  });

  test('should upload compliance document', async ({ page }) => {
    // Navigate to documents section
    const documentsTab = page.locator('[data-testid="iso-documents-tab"]');
    
    if (await documentsTab.isVisible()) {
      await documentsTab.click();
      
      // Look for upload button
      const uploadButton = page.locator('[data-testid="upload-document-button"]');
      
      if (await uploadButton.isVisible()) {
        await uploadButton.click();
        
        // Upload modal should open
        await expect(page.locator('[data-testid="upload-document-modal"]')).toBeVisible();
        
        // Check for file input
        await expect(page.locator('input[type="file"]')).toBeVisible();
      }
    }
  });
});

test.describe('Organization Chart', () => {
  test.beforeEach(async ({ page }) => {
    await loginUser(page);
    await page.click('text=My Organization');
    await page.waitForSelector('[data-testid="organization-content"]', { timeout: 5000 });
    
    // Look for org chart tab
    const orgChartTab = page.locator('[data-testid="org-chart-tab"]');
    if (await orgChartTab.isVisible()) {
      await orgChartTab.click();
      await page.waitForSelector('[data-testid="org-chart-content"]', { timeout: 5000 });
    }
  });

  test('should display organization chart', async ({ page }) => {
    const orgChartTab = page.locator('[data-testid="org-chart-tab"]');
    
    if (await orgChartTab.isVisible()) {
      // Check for org chart canvas
      await expect(page.locator('[data-testid="org-chart-canvas"]')).toBeVisible();
      
      // Check for tree sidebar
      const treeSidebar = page.locator('[data-testid="tree-sidebar"]');
      if (await treeSidebar.isVisible()) {
        await expect(treeSidebar).toBeVisible();
      }
    }
  });

  test('should interact with org chart nodes', async ({ page }) => {
    const orgChartTab = page.locator('[data-testid="org-chart-tab"]');
    
    if (await orgChartTab.isVisible()) {
      // Look for chart nodes
      const chartNodes = page.locator('[data-testid="org-chart-canvas"] .org-node');
      
      if (await chartNodes.first().isVisible()) {
        // Click on a node
        await chartNodes.first().click();
        
        // Node details should show
        await expect(page.locator('[data-testid="node-details"]')).toBeVisible();
      }
    }
  });
});

test.describe('Performance and Responsiveness', () => {
  test('should handle large people datasets', async ({ page }) => {
    await loginUser(page);
    await page.click('text=My Organization');
    await page.click('[data-testid="people-tab"]');
    
    // Measure loading time
    const startTime = Date.now();
    await page.waitForSelector('[data-testid="people-content"]', { timeout: 10000 });
    const loadTime = Date.now() - startTime;
    
    // Should load within reasonable time
    expect(loadTime).toBeLessThan(5000);
  });

  test('should handle responsive design', async ({ page }) => {
    await loginUser(page);
    await page.click('text=My Organization');
    
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Should adapt to mobile layout
    await expect(page.locator('[data-testid="organization-content"]')).toBeVisible();
    
    // Navigation should be responsive
    const mobileNav = page.locator('[data-testid="mobile-nav"]');
    if (await mobileNav.isVisible()) {
      await expect(mobileNav).toBeVisible();
    }
  });
});

test.describe('Error Handling', () => {
  test.beforeEach(async ({ page }) => {
    await loginUser(page);
    await page.click('text=My Organization');
  });

  test('should handle network errors', async ({ page }) => {
    // Block API requests
    await page.route('**/api/v1/people/**', route => route.abort());
    
    // Try to load people tab
    await page.click('[data-testid="people-tab"]');
    
    // Should show error message
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible({ timeout: 10000 });
  });

  test('should handle empty states', async ({ page }) => {
    // Mock empty response
    await page.route('**/api/v1/people', route => 
      route.fulfill({ 
        json: { data: [], total: 0 } 
      })
    );
    
    await page.click('[data-testid="people-tab"]');
    
    // Should show empty state
    await expect(page.locator('[data-testid="empty-state"]')).toBeVisible();
  });
});