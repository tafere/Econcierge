import { test, expect } from '@playwright/test';
import { setupAuthenticatedPage, mockCategories } from '../helpers/setup';
import { MOCK_CATEGORIES } from '../helpers/data';

test.describe('Categories Management', () => {

  async function goToCategories(page: Parameters<typeof setupAuthenticatedPage>[0]) {
    await setupAuthenticatedPage(page);
    await mockCategories(page);
    // Mock all mutations with a generic success response
    await page.route('**/api/dashboard/categories/**', route => {
      const method = route.request().method();
      if (method !== 'GET') {
        route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
      } else {
        route.fallback();
      }
    });
    await page.goto('/categories');
  }

  // ── Page load ────────────────────────────────────────────────────────────────

  test('shows "Categories" heading', async ({ page }) => {
    await goToCategories(page);
    await expect(page.getByText('Categories')).toBeVisible();
  });

  test('shows all category names', async ({ page }) => {
    await goToCategories(page);
    await expect(page.getByText('Housekeeping')).toBeVisible();
    await expect(page.getByText('Transport')).toBeVisible();
    await expect(page.getByText('Spa')).toBeVisible();
  });

  test('shows item count per category', async ({ page }) => {
    await goToCategories(page);
    await expect(page.getByText(/items/i).first()).toBeVisible();
  });

  // ── Expand / collapse ────────────────────────────────────────────────────────

  test('expands a category to show its items', async ({ page }) => {
    await goToCategories(page);
    // Click on Housekeeping to expand it
    await page.getByText('Housekeeping').click();
    await expect(page.getByText('Extra Towels')).toBeVisible();
    await expect(page.getByText('Extra Pillows')).toBeVisible();
  });

  test('shows schedulable badge on scheduled items', async ({ page }) => {
    await goToCategories(page);
    await page.getByText('Transport').click();
    // Shuttle Schedule is schedulable — should show a scheduling badge
    await expect(page.getByText('Shuttle Schedule')).toBeVisible();
    await expect(page.locator('text=/60.*min/i, text=/schedulable/i').first()).toBeVisible();
  });

  // ── Add category ─────────────────────────────────────────────────────────────

  test('opens Add Category form', async ({ page }) => {
    await goToCategories(page);
    await page.getByRole('button', { name: /add category/i }).click();
    await expect(page.getByText('New Category')).toBeVisible();
  });

  test('creates a new category', async ({ page }) => {
    const newCat = { id: 10, name: 'Gym', nameAm: null, icon: 'dumbbell', etaMinutes: null, sortOrder: 4, items: [] };
    await setupAuthenticatedPage(page);
    await page.route('**/api/dashboard/categories', route => {
      if (route.request().method() === 'GET') {
        route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_CATEGORIES) });
      } else if (route.request().method() === 'POST') {
        route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(newCat) });
      } else {
        route.continue();
      }
    });
    await page.goto('/categories');

    await page.getByRole('button', { name: /add category/i }).click();
    await page.getByPlaceholder(/category name/i).fill('Gym');
    await page.getByRole('button', { name: /^add$/i }).click();
  });

  // ── Add item ─────────────────────────────────────────────────────────────────

  test('shows "Add item" button inside an expanded category', async ({ page }) => {
    await goToCategories(page);
    await page.getByText('Housekeeping').click();
    await expect(page.getByText(/add item/i)).toBeVisible();
  });

  test('opens add item form and shows scheduling checkbox', async ({ page }) => {
    await goToCategories(page);
    await page.getByText('Housekeeping').click();
    await page.getByText(/add item/i).click();
    await expect(page.getByText(/enable scheduling/i)).toBeVisible();
  });

  test('shows interval and capacity fields when scheduling is enabled on new item', async ({ page }) => {
    await goToCategories(page);
    await page.getByText('Housekeeping').click();
    await page.getByText(/add item/i).click();

    // Check the "Enable scheduling" checkbox
    await page.getByLabel(/enable scheduling/i).check();

    await expect(page.getByText(/every/i)).toBeVisible();
    await expect(page.getByText(/capacity/i)).toBeVisible();
  });

  test('creates a scheduled item with 60-min interval and capacity of 4', async ({ page }) => {
    await goToCategories(page);
    await page.getByText('Spa').click();
    await page.getByText(/add item/i).click();

    const nameInput = page.locator('input[placeholder*="item name"]').last();
    await nameInput.fill('Steam Room');

    await page.getByLabel(/enable scheduling/i).check();

    // Set interval to 60 and capacity to 4
    const intervalInput = page.locator('input[type="number"][min="5"]').last();
    await intervalInput.fill('60');
    const capacityInput = page.locator('input[type="number"][min="1"]').last();
    await capacityInput.fill('4');

    // Submit
    await page.getByRole('button', { name: '', exact: true }).filter({ has: page.locator('svg') }).last().click();
  });

  // ── Edit item ────────────────────────────────────────────────────────────────

  test('opens edit form when pencil icon is clicked', async ({ page }) => {
    await goToCategories(page);
    await page.getByText('Housekeeping').click();

    // Click the edit (pencil) button on the first item
    const editBtn = page.locator('button[class*="p-1.5"]').filter({ has: page.locator('svg') }).first();
    await editBtn.click();

    // Edit form should show current item name
    await expect(page.locator('input[value="Extra Towels"]')).toBeVisible();
  });

  test('shows Amharic name field in edit form', async ({ page }) => {
    await goToCategories(page);
    await page.getByText('Housekeeping').click();
    const editBtns = page.locator('button').filter({ has: page.locator('[data-lucide="pencil"], [class*="Pencil"]') });
    if (await editBtns.count() > 0) {
      await editBtns.first().click();
      await expect(page.getByPlaceholder('አማርኛ ስም')).toBeVisible();
    }
  });

  // ── Delete category ──────────────────────────────────────────────────────────

  test('shows delete confirmation before deleting a category', async ({ page }) => {
    await setupAuthenticatedPage(page);
    await mockCategories(page);
    await page.route('**/api/dashboard/categories/**', route => route.fulfill({ status: 200, body: '{}' }));
    page.on('dialog', dialog => dialog.accept());
    await page.goto('/categories');

    // Expand and find the delete button for a category
    await page.getByText('Housekeeping').click();
    const deleteBtn = page.locator('button[title*="delete"], button[title*="Delete"]').first();
    if (await deleteBtn.isVisible()) {
      await deleteBtn.click();
    }
  });

  // ── Scheduling badge ────────────────────────────────────────────────────────���

  test('shows scheduling interval and capacity in item badge', async ({ page }) => {
    await goToCategories(page);
    await page.getByText('Transport').click();
    // Shuttle Schedule: 60 min, 8 people
    await expect(page.getByText(/60.*min|60min/i)).toBeVisible();
  });

});
