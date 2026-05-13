import { test, expect } from '@playwright/test';

const TEST_USER = {
  email: process.env.E2E_USER_EMAIL ?? 'admin@ks-precision.com',
  password: process.env.E2E_USER_PASSWORD ?? 'test1234',
};

test.describe('Authentication', () => {
  test('redirects unauthenticated users to login', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/login|signin|keycloak/i);
  });

  test('login → dashboard flow', async ({ page }) => {
    await page.goto('/login');

    await page.fill('[name="email"], input[type="email"]', TEST_USER.email);
    await page.fill('[name="password"], input[type="password"]', TEST_USER.password);
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL('/dashboard', { timeout: 15_000 });
    await expect(page.locator('h1')).toContainText('AI 대시보드');
  });
});
