import { test, expect } from '@playwright/test';
import { setupAuthenticatedPage, mockHotelSettings, mockSaveHotelSettings } from '../helpers/setup';
import { MOCK_HOTEL } from '../helpers/data';

test.describe('Hotel Settings', () => {

  async function goToSettings(page: Parameters<typeof setupAuthenticatedPage>[0]) {
    await setupAuthenticatedPage(page);
    await mockHotelSettings(page);
    await mockSaveHotelSettings(page);
    await page.goto('/settings');
  }

  // ── Page load ────────────────────────────────────────────────────────────────

  test('shows "Identity" section heading', async ({ page }) => {
    await goToSettings(page);
    await expect(page.getByText('Identity')).toBeVisible();
  });

  test('shows "Contact" section heading', async ({ page }) => {
    await goToSettings(page);
    await expect(page.getByText('Contact')).toBeVisible();
  });

  test('loads current hotel name into the field', async ({ page }) => {
    await goToSettings(page);
    const nameInput = page.getByLabel(/hotel name/i);
    await expect(nameInput).toHaveValue('Test Hotel');
  });

  test('loads current tagline into the field', async ({ page }) => {
    await goToSettings(page);
    const taglineInput = page.getByLabel(/tagline/i);
    await expect(taglineInput).toHaveValue(MOCK_HOTEL.tagline);
  });

  test('loads current email into the field', async ({ page }) => {
    await goToSettings(page);
    const emailInput = page.getByLabel(/email/i);
    await expect(emailInput).toHaveValue(MOCK_HOTEL.email);
  });

  // ── Edit and save ─────────────────────────────────────────────────────────────

  test('updates hotel name and saves successfully', async ({ page }) => {
    await goToSettings(page);

    const nameInput = page.getByLabel(/hotel name/i);
    await nameInput.clear();
    await nameInput.fill('Skylight Hotel');

    await page.getByRole('button', { name: /save settings/i }).click();
    await expect(page.getByText(/saved!/i)).toBeVisible({ timeout: 3000 });
  });

  test('updates tagline', async ({ page }) => {
    await goToSettings(page);

    const taglineInput = page.getByLabel(/tagline/i);
    await taglineInput.clear();
    await taglineInput.fill('Luxury redefined');

    await page.getByRole('button', { name: /save settings/i }).click();
    await expect(page.getByText(/saved!/i)).toBeVisible({ timeout: 3000 });
  });

  test('shows "Saving…" while request is in progress', async ({ page }) => {
    await setupAuthenticatedPage(page);
    await mockHotelSettings(page);
    // Delay the save response to catch the loading state
    await page.route('**/api/dashboard/hotel', route => {
      if (route.request().method() === 'PUT') {
        setTimeout(() => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_HOTEL) }), 500);
      } else {
        route.fallback();
      }
    });
    await page.goto('/settings');

    await page.getByRole('button', { name: /save settings/i }).click();
    await expect(page.getByText(/saving/i)).toBeVisible({ timeout: 2000 });
  });

  test('updates logo URL', async ({ page }) => {
    await goToSettings(page);

    const logoInput = page.getByLabel(/logo url/i);
    await logoInput.clear();
    await logoInput.fill('https://example.com/logo.png');

    await page.getByRole('button', { name: /save settings/i }).click();
    await expect(page.getByText(/saved!/i)).toBeVisible({ timeout: 3000 });
  });

  test('shows logo preview when logo URL is provided', async ({ page }) => {
    await setupAuthenticatedPage(page);
    await mockHotelSettings(page, { ...MOCK_HOTEL, logoUrl: 'https://example.com/logo.png' });
    await mockSaveHotelSettings(page);
    await page.goto('/settings');

    await expect(page.locator('img[alt*="logo"], img[src*="logo"]')).toBeVisible();
  });

  test('updates background image URL', async ({ page }) => {
    await goToSettings(page);

    const heroInput = page.getByLabel(/background image/i);
    await heroInput.clear();
    await heroInput.fill('https://example.com/hero.jpg');

    await page.getByRole('button', { name: /save settings/i }).click();
    await expect(page.getByText(/saved!/i)).toBeVisible({ timeout: 3000 });
  });

  test('updates phone number', async ({ page }) => {
    await goToSettings(page);

    const phoneInput = page.getByLabel(/phone/i);
    await phoneInput.clear();
    await phoneInput.fill('+1-555-9999');

    await page.getByRole('button', { name: /save settings/i }).click();
    await expect(page.getByText(/saved!/i)).toBeVisible({ timeout: 3000 });
  });

  test('shows hint text for logo URL field', async ({ page }) => {
    await goToSettings(page);
    await expect(page.getByText(/paste a public url/i).first()).toBeVisible();
  });

});
