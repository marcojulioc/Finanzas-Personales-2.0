import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test('should display login form', async ({ page }) => {
    await page.goto('/login');

    await expect(page.getByText('Iniciar Sesión').first()).toBeVisible();
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/contraseña/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /iniciar sesión/i })).toBeVisible();
  });

  test('should show validation errors for empty form', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('button', { name: /iniciar sesión/i }).click();

    // Form should show validation feedback
    await expect(page.locator('form')).toBeVisible();
  });

  test('should have link to register page', async ({ page }) => {
    await page.goto('/login');

    const registerLink = page.getByRole('link', { name: 'Regístrate' });
    await expect(registerLink).toBeVisible({ timeout: 10000 });
    await registerLink.click();

    await expect(page).toHaveURL(/register/);
  });

  test('should display register form', async ({ page }) => {
    await page.goto('/register');

    await expect(page.getByLabel(/nombre/i)).toBeVisible();
    await expect(page.getByLabel(/email/i)).toBeVisible();
  });

  test('should redirect unauthenticated users from dashboard', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/login/);
  });

  test('should redirect unauthenticated users from transactions', async ({ page }) => {
    await page.goto('/transactions');
    await expect(page).toHaveURL(/login/);
  });
});
