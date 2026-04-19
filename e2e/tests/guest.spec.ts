import { test, expect } from '@playwright/test';
import { MOCK_QR_TOKEN, MOCK_ROOM_INFO, MOCK_SLOTS } from '../helpers/data';

// Guest page is public — no auth needed

test.describe('Guest Page', () => {

  async function setupGuestMocks(page: Parameters<typeof test>[1] extends infer T ? T extends { page: infer P } ? P : never : never) {
    await page.route(`**/api/guest/room/${MOCK_QR_TOKEN}`, route =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_ROOM_INFO) })
    );
    await page.route('**/api/guest/requests/status**', route =>
      route.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
    );
    await page.route('**/api/guest/room/*/requests', route =>
      route.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
    );
    await page.route('**/api/schedule/*/bookings/status**', route =>
      route.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
    );
  }

  // ── Page load ────────────────────────────────────────────────────────────────

  test('shows hotel name in header', async ({ page }) => {
    await setupGuestMocks(page);
    await page.goto(`/r/${MOCK_QR_TOKEN}`);
    await expect(page.getByText('Test Hotel')).toBeVisible();
  });

  test('shows room number in header', async ({ page }) => {
    await setupGuestMocks(page);
    await page.goto(`/r/${MOCK_QR_TOKEN}`);
    await expect(page.getByText(/room.*101|101.*room/i)).toBeVisible();
  });

  test('shows "How can we help you?" prompt', async ({ page }) => {
    await setupGuestMocks(page);
    await page.goto(`/r/${MOCK_QR_TOKEN}`);
    await expect(page.getByText('How can we help you?')).toBeVisible();
  });

  test('lists all service categories', async ({ page }) => {
    await setupGuestMocks(page);
    await page.goto(`/r/${MOCK_QR_TOKEN}`);
    await expect(page.getByText('Housekeeping')).toBeVisible();
    await expect(page.getByText('Transport')).toBeVisible();
  });

  test('shows invalid QR message for unknown token', async ({ page }) => {
    await page.route('**/api/guest/room/bad-token', route =>
      route.fulfill({ status: 404, contentType: 'application/json', body: '{}' })
    );
    await page.goto('/r/bad-token');
    await expect(page.getByText(/invalid|disabled|front desk/i)).toBeVisible();
  });

  // ── Category → Item flow ──────────────────────────────────────────────────────

  test('navigates into a category and shows items', async ({ page }) => {
    await setupGuestMocks(page);
    await page.goto(`/r/${MOCK_QR_TOKEN}`);
    await page.getByText('Housekeeping').click();
    await expect(page.getByText('Extra Towels')).toBeVisible();
    await expect(page.getByText('Extra Pillows')).toBeVisible();
  });

  test('shows Back button inside a category', async ({ page }) => {
    await setupGuestMocks(page);
    await page.goto(`/r/${MOCK_QR_TOKEN}`);
    await page.getByText('Housekeeping').click();
    await expect(page.getByText('Back')).toBeVisible();
  });

  test('navigates back to category list', async ({ page }) => {
    await setupGuestMocks(page);
    await page.goto(`/r/${MOCK_QR_TOKEN}`);
    await page.getByText('Housekeeping').click();
    await page.getByText('Back').click();
    await expect(page.getByText('How can we help you?')).toBeVisible();
  });

  // ── Cart flow ─────────────────────────────────────────────────────────────────

  test('adds an item to the cart', async ({ page }) => {
    await setupGuestMocks(page);
    await page.goto(`/r/${MOCK_QR_TOKEN}`);
    await page.getByText('Housekeeping').click();
    await page.getByText('Extra Towels').click();
    await page.getByRole('button', { name: /add to cart/i }).click();
    // Cart bar should appear at the bottom
    await expect(page.getByText('Your Cart').or(page.getByText(/tap to review/i)).or(page.getByText(/1 item/i))).toBeVisible();
  });

  test('increases quantity before adding to cart', async ({ page }) => {
    await setupGuestMocks(page);
    await page.goto(`/r/${MOCK_QR_TOKEN}`);
    await page.getByText('Housekeeping').click();
    await page.getByText('Extra Towels').click();

    // Click the + button twice
    await page.getByRole('button', { name: '+' }).last().click();
    await page.getByRole('button', { name: '+' }).last().click();

    // Quantity should now show 3
    await expect(page.getByText('3')).toBeVisible();
  });

  test('shows cart with items when cart bar is tapped', async ({ page }) => {
    await setupGuestMocks(page);
    await page.goto(`/r/${MOCK_QR_TOKEN}`);
    await page.getByText('Housekeeping').click();
    await page.getByText('Extra Towels').click();
    await page.getByRole('button', { name: /add to cart/i }).click();

    // Tap the cart bar to open cart view
    await page.getByText(/tap to review|your cart/i).click();
    await expect(page.getByText('Your Cart')).toBeVisible();
    await expect(page.getByText('Extra Towels')).toBeVisible();
  });

  // ── Submit request ────────────────────────────────────────────────────────────

  test('submits a cart and shows confirmation', async ({ page }) => {
    await setupGuestMocks(page);
    await page.route('**/api/guest/request', route =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([{ id: 99, status: 'PENDING' }]) })
    );
    await page.goto(`/r/${MOCK_QR_TOKEN}`);
    await page.getByText('Housekeeping').click();
    await page.getByText('Extra Towels').click();
    await page.getByRole('button', { name: /add to cart/i }).click();

    await page.getByText(/tap to review/i).click();
    await page.getByRole('button', { name: /send all/i }).click();

    await expect(page.getByText(/request received|team will assist/i)).toBeVisible({ timeout: 5000 });
  });

  // ── Booking flow ──────────────────────────────────────────────────────────────

  test('shows time slot picker for schedulable items', async ({ page }) => {
    await setupGuestMocks(page);
    await page.route(`**/api/schedule/3/slots**`, route =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_SLOTS) })
    );
    await page.goto(`/r/${MOCK_QR_TOKEN}`);
    await page.getByText('Transport').click();
    await page.getByText('Shuttle Schedule').click();

    await expect(page.getByText('Available Times')).toBeVisible();
    await expect(page.getByText('Today')).toBeVisible();
    await expect(page.getByText('Tomorrow')).toBeVisible();
  });

  test('shows available slot times', async ({ page }) => {
    await setupGuestMocks(page);
    await page.route('**/api/schedule/3/slots**', route =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_SLOTS) })
    );
    await page.goto(`/r/${MOCK_QR_TOKEN}`);
    await page.getByText('Transport').click();
    await page.getByText('Shuttle Schedule').click();

    await expect(page.getByText('10:00 AM')).toBeVisible();
    await expect(page.getByText('11:00 AM')).toBeVisible();
  });

  test('shows "Full" for slots with no remaining capacity', async ({ page }) => {
    await setupGuestMocks(page);
    await page.route('**/api/schedule/3/slots**', route =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_SLOTS) })
    );
    await page.goto(`/r/${MOCK_QR_TOKEN}`);
    await page.getByText('Transport').click();
    await page.getByText('Shuttle Schedule').click();

    await expect(page.getByText('Full')).toBeVisible(); // 12:00 PM slot
  });

  test('shows guest count picker after selecting a slot', async ({ page }) => {
    await setupGuestMocks(page);
    await page.route('**/api/schedule/3/slots**', route =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_SLOTS) })
    );
    await page.goto(`/r/${MOCK_QR_TOKEN}`);
    await page.getByText('Transport').click();
    await page.getByText('Shuttle Schedule').click();

    await page.getByText('10:00 AM').click();
    await expect(page.getByText('Number of Guests')).toBeVisible();
  });

  test('confirms a booking', async ({ page }) => {
    await setupGuestMocks(page);
    await page.route('**/api/schedule/3/slots**', route =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_SLOTS) })
    );
    await page.route('**/api/schedule/book', route =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ id: 50, status: 'PENDING' }) })
    );
    await page.goto(`/r/${MOCK_QR_TOKEN}`);
    await page.getByText('Transport').click();
    await page.getByText('Shuttle Schedule').click();

    await page.getByText('10:00 AM').click();
    await page.getByRole('button', { name: /confirm booking/i }).click();

    await expect(page.getByText(/received|booked|confirmed/i)).toBeVisible({ timeout: 5000 });
  });

  // ── Language toggle ───────────────────────────────────────────────────────────

  test('shows language toggle button', async ({ page }) => {
    await setupGuestMocks(page);
    await page.goto(`/r/${MOCK_QR_TOKEN}`);
    await expect(page.getByRole('button', { name: /english|አማርኛ/i })).toBeVisible();
  });

  test('switches to Amharic when language button is clicked', async ({ page }) => {
    await setupGuestMocks(page);
    await page.goto(`/r/${MOCK_QR_TOKEN}`);
    await page.getByRole('button', { name: /english/i }).click();
    // After switching, some text should appear in Amharic
    await expect(page.getByText(/እንዴት ልናግዝዎ|ክፍል/i)).toBeVisible();
  });

  test('shows Amharic category name when Amharic is selected', async ({ page }) => {
    await setupGuestMocks(page);
    await page.goto(`/r/${MOCK_QR_TOKEN}`);
    await page.getByRole('button', { name: /english/i }).click();
    // Housekeeping in Amharic = "የቤት አያያዝ"
    await expect(page.getByText('የቤት አያያዝ')).toBeVisible();
  });

  // ── My Requests / My Bookings ─────────────────────────────────────────────────

  test('shows "My Requests" section when requests exist', async ({ page }) => {
    await page.route(`**/api/guest/room/${MOCK_QR_TOKEN}`, route =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_ROOM_INFO) })
    );
    await page.route('**/api/guest/room/*/requests', route =>
      route.fulfill({
        status: 200, contentType: 'application/json',
        body: JSON.stringify([
          { id: 1, itemName: 'Extra Towels', categoryName: 'Housekeeping', quantity: 2,
            submittedAt: new Date().toISOString(), status: 'PENDING', etaMinutes: 15 }
        ]),
      })
    );
    await page.route('**/api/guest/requests/status**', route =>
      route.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
    );
    await page.route('**/api/schedule/*/bookings/status**', route =>
      route.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
    );
    await page.goto(`/r/${MOCK_QR_TOKEN}`);
    await expect(page.getByText('My Requests')).toBeVisible();
  });

});
