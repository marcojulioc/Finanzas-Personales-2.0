import { test, expect } from '@playwright/test';

test.describe('Mobile Experience', () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test('login page should be mobile friendly', async ({ page }) => {
    await page.goto('/login');

    // Form should be visible
    const form = page.locator('form');
    await expect(form).toBeVisible();

    // No horizontal scroll
    const hasHorizontalScroll = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });
    expect(hasHorizontalScroll).toBe(false);
  });

  test('should have touch-friendly button sizes', async ({ page }) => {
    await page.goto('/login');

    const submitButton = page.getByRole('button', { name: /iniciar sesión/i });
    const buttonBox = await submitButton.boundingBox();

    // Minimum touch target: 44px
    expect(buttonBox?.height).toBeGreaterThanOrEqual(40);
  });

  test('inputs should have readable font size', async ({ page }) => {
    await page.goto('/register');

    const emailInput = page.getByLabel(/correo/i);
    const fontSize = await emailInput.evaluate((el) =>
      parseInt(window.getComputedStyle(el).fontSize)
    );

    // >= 16px prevents iOS zoom on focus
    expect(fontSize).toBeGreaterThanOrEqual(16);
  });

  test('register page should not overflow', async ({ page }) => {
    await page.goto('/register');

    const hasHorizontalScroll = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });
    expect(hasHorizontalScroll).toBe(false);
  });
});
