import { test, expect } from '@playwright/test';
import { setupAuthenticatedPage, mockAnalytics } from '../helpers/setup';
import { MOCK_ANALYTICS } from '../helpers/data';

test.describe('Reports & Analytics', () => {

  async function goToReports(page: Parameters<typeof setupAuthenticatedPage>[0]) {
    await setupAuthenticatedPage(page);
    await mockAnalytics(page);
    await page.goto('/reports');
  }

  // ── Page load ────────────────────────────────────────────────────────────────

  test('shows "Reports & Analytics" heading', async ({ page }) => {
    await goToReports(page);
    await expect(page.getByText('Reports & Analytics')).toBeVisible();
  });

  test('shows subtitle about service performance', async ({ page }) => {
    await goToReports(page);
    await expect(page.getByText(/service performance/i)).toBeVisible();
  });

  // ── KPI Cards ────────────────────────────────────────────────────────────────

  test('shows "Requests Today" KPI card', async ({ page }) => {
    await goToReports(page);
    await expect(page.getByText('Requests Today')).toBeVisible();
    await expect(page.locator('p.text-3xl').filter({ hasText: '24' })).toBeVisible();
  });

  test('shows "Open Now" KPI card', async ({ page }) => {
    await goToReports(page);
    await expect(page.getByText('Open Now')).toBeVisible();
    await expect(page.locator('p.text-3xl').filter({ hasText: '5' })).toBeVisible();
  });

  test('shows "Completion Rate" KPI card with percentage', async ({ page }) => {
    await goToReports(page);
    await expect(page.getByText('Completion Rate')).toBeVisible();
    await expect(page.getByText(/87%/)).toBeVisible(); // MOCK_ANALYTICS.completionRate
  });

  test('shows "Avg Response Time" KPI card', async ({ page }) => {
    await goToReports(page);
    await expect(page.getByText('Avg Response Time')).toBeVisible();
    await expect(page.locator('p.text-3xl').filter({ hasText: '12m' })).toBeVisible();
  });

  // ── Charts ───────────────────────────────────────────────────────────────────

  test('shows "Requests by Hour" chart heading', async ({ page }) => {
    await goToReports(page);
    await expect(page.getByText(/requests by hour/i)).toBeVisible();
  });

  test('shows "Request Volume" chart heading', async ({ page }) => {
    await goToReports(page);
    await expect(page.getByText(/request volume/i)).toBeVisible();
  });

  test('shows "Requests by Category" chart heading', async ({ page }) => {
    await goToReports(page);
    await page.getByRole('button', { name: 'Category' }).click();
    await expect(page.getByText(/requests by category/i)).toBeVisible();
  });

  test('shows "Top Requested Items" heading', async ({ page }) => {
    await goToReports(page);
    await expect(page.getByText(/top requested items/i)).toBeVisible();
  });

  // ── Staff Leaderboard ────────────────────────────────────────────────────────

  test('shows staff leaderboard', async ({ page }) => {
    await goToReports(page);
    await expect(page.getByText(/staff leaderboard/i)).toBeVisible();
  });

  test('shows staff names in leaderboard', async ({ page }) => {
    await goToReports(page);
    await expect(page.getByText('John Smith')).toBeVisible();
    await expect(page.getByText('Maria Garcia')).toBeVisible();
  });

  test('shows handled count in leaderboard', async ({ page }) => {
    await goToReports(page);
    // John Smith handled 45, Maria Garcia handled 32
    await expect(page.getByText('45')).toBeVisible();
  });

  // ── Empty state ───────────────────────────────────────────────────────────────

  test('shows "No requests yet" when analytics are empty', async ({ page }) => {
    await setupAuthenticatedPage(page);
    await mockAnalytics(page, {
      kpi: { todayCount: 0, openCount: 0, completionRate: 0, avgResponseMins: 0 },
      byHour: [],
      byDay: [],
      byCategory: [],
      topItems: [],
      leaderboard: [],
    });
    await page.goto('/reports');
    await expect(page.getByText(/no requests yet/i)).toBeVisible();
  });

});
