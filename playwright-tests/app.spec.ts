import { test, expect } from '@playwright/test';

test.describe('YouTube Viewer App', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the app
    await page.goto('http://localhost:3030');
  });

  test('should load homepage successfully', async ({ page }) => {
    // Check if the page loads without errors
    await expect(page).toHaveTitle(/Youtube Viewer/);

    // Check if main heading is visible
    await expect(page.locator('h1')).toContainText('Video Collection');

    // Check if search component is present
    await expect(page.locator('[data-testid="search-input"]')).toBeVisible();
  });

  test('should display video cards', async ({ page }) => {
    // Wait for videos to load
    await page.waitForSelector('[data-testid="video-card"]', { timeout: 10000 });

    // Check if video cards are displayed
    const videoCards = page.locator('[data-testid="video-card"]');
    await expect(videoCards.first()).toBeVisible();
  });

  test('should handle search functionality', async ({ page }) => {
    // Wait for search input to be available
    await page.waitForSelector('[data-testid="search-input"]', { timeout: 5000 });

    // Type in search
    await page.fill('[data-testid="search-input"]', 'test');

    // Check if search suggestions appear (if implemented)
    // This would need to be adjusted based on actual implementation
  });

  test('should navigate to video detail page', async ({ page }) => {
    // Wait for video cards to load
    await page.waitForSelector('[data-testid="video-card"]', { timeout: 10000 });

    // Click on first video card
    await page.click('[data-testid="video-card"]:first-child');

    // Check if navigated to video detail page
    await expect(page).toHaveURL(/\/video\//);

    // Check if video details are displayed
    await expect(page.locator('h1')).toBeVisible();
  });
});
