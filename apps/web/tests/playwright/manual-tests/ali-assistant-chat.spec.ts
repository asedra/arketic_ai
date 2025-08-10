import { test, expect, Page } from '@playwright/test';

test.describe('Ali Assistant Chat Functionality', () => {
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
  });

  test.afterAll(async () => {
    await page.close();
  });

  const loginUser = async () => {
    await page.goto('http://localhost:3000');
    
    // Login process
    await page.fill('input[name="email"]', 'test@arketic.com');
    await page.fill('input[name="password"]', 'Test123456!');
    await page.click('button[type="submit"]');
    
    // Wait for login to complete and dashboard to load
    await page.waitForURL('**/dashboard', { timeout: 10000 });
  };

  test('Chat with Ali Assistant', async () => {
    // Login
    await loginUser();

    // Navigate to Chat page
    await page.click('text=Chat');
    await page.waitForSelector('text=New Chat', { state: 'visible' });

    // Click New Chat button
    await page.click('text=New Chat');

    // Wait for assistants list to load
    await page.waitForSelector('text=Ali', { state: 'visible' });

    // Select Ali assistant
    await page.click('text=Ali');

    // Confirm starting chat with Ali
    await page.click('text=Start Chat With Ali');

    // Wait for chat interface to load
    await page.waitForSelector('textarea[placeholder="Type a message..."]', { state: 'visible' });

    // Send test message
    const chatInput = await page.locator('textarea[placeholder="Type a message..."]');
    await chatInput.fill('Hello Ali, can you help me?');
    await page.keyboard.press('Enter');

    // Wait for response
    await page.waitForSelector('text=Hello! How can I assist you today?', { state: 'visible', timeout: 30000 });

    // Take screenshots of the process
    await page.screenshot({ path: 'tests/playwright/manual-tests/ali-assistant-chat-success.png' });
  });

  test('Validate Chat UI Elements', async () => {
    // Verify key UI elements are present
    const elementsToCheck = [
      'textarea[placeholder="Type a message..."]',
      'button[aria-label="Send message"]',
      'div[data-testid="chat-messages-container"]'
    ];

    for (const selector of elementsToCheck) {
      const element = await page.locator(selector);
      expect(await element.isVisible()).toBeTruthy(`Element ${selector} should be visible`);
    }
  });

  test('Error Handling and Edge Cases', async () => {
    // Test sending an empty message
    const chatInput = await page.locator('textarea[placeholder="Type a message..."]');
    await chatInput.fill('');
    await page.keyboard.press('Enter');

    // Verify no unexpected behavior occurs
    const errorToast = page.locator('text=Please enter a message');
    expect(await errorToast.count()).toBe(0);
  });
});