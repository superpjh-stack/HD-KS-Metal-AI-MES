import { test, expect } from '@playwright/test';

test.describe('LOT 추적 흐름', () => {
  test.beforeEach(async ({ page }) => {
    // Assumes session cookie is set via storageState or login fixture
    await page.goto('/lot');
  });

  test('LOT 목록 페이지 로드', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('LOT 관리');
    // Table or empty state should appear within 5s
    await expect(
      page.locator('table, [data-testid="empty-state"]'),
    ).toBeVisible({ timeout: 5_000 });
  });

  test('LOT 추적 페이지 3초 내 응답', async ({ page }) => {
    await page.goto('/lot');
    const firstTraceLink = page.locator('a:has-text("추적")').first();

    const start = Date.now();
    await firstTraceLink.click();
    await expect(page.locator('[data-testid="lot-timeline"], ol')).toBeVisible({ timeout: 5_000 });
    const elapsed = Date.now() - start;

    expect(elapsed).toBeLessThan(3_000);
  });
});
