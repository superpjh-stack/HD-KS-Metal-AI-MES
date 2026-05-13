import { test, expect } from '@playwright/test';

test.describe('대시보드', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard');
  });

  test('KPI 카드 4개 렌더링', async ({ page }) => {
    const kpiCards = page.locator('[class*="kpi"], [class*="KpiCard"], .rounded-xl');
    await expect(kpiCards).toHaveCount(4, { timeout: 8_000 });
  });

  test('실시간 알림 패널 표시', async ({ page }) => {
    await expect(page.locator('text=실시간 알림')).toBeVisible();
  });

  test('센서 스파크라인 표시', async ({ page }) => {
    await expect(page.locator('text=실시간 센서')).toBeVisible();
  });
});
