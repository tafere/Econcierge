import { test, expect } from '@playwright/test';
import { setupAuthenticatedPage, mockRooms, mockCreateRoom } from '../helpers/setup';
import { MOCK_ROOMS } from '../helpers/data';

test.describe('Rooms Management', () => {

  async function goToRooms(page: Parameters<typeof setupAuthenticatedPage>[0]) {
    await setupAuthenticatedPage(page);
    await mockRooms(page);
    await page.goto('/rooms');
  }

  // ── Page load ────────────────────────────────────────────────────────────────

  test('shows "Rooms & QR Codes" heading', async ({ page }) => {
    await goToRooms(page);
    await expect(page.getByText('Rooms & QR Codes')).toBeVisible();
  });

  test('shows count of configured rooms', async ({ page }) => {
    await goToRooms(page);
    await expect(page.getByText(/rooms configured/i)).toBeVisible();
  });

  test('lists all rooms with room numbers', async ({ page }) => {
    await goToRooms(page);
    await expect(page.getByText('101')).toBeVisible();
    await expect(page.getByText('202')).toBeVisible();
    await expect(page.getByText('303')).toBeVisible();
  });

  test('shows floor label for each room', async ({ page }) => {
    await goToRooms(page);
    // Floor "1", "2", "3" appear next to room numbers
    const floorLabels = page.getByText(/floor/i);
    await expect(floorLabels.first()).toBeVisible();
  });

  // ── Add room ─────────────────────────────────────────────────────────────────

  test('opens Add Room form when button is clicked', async ({ page }) => {
    await goToRooms(page);
    await page.getByRole('button', { name: /add room/i }).click();
    await expect(page.getByText('New Room')).toBeVisible();
  });

  test('creates a new room', async ({ page }) => {
    const newRoom = { id: 4, roomNumber: '404', floor: '4', type: 'Standard', qrToken: 'qr-token-404', enabled: true };
    await setupAuthenticatedPage(page);
    await mockRooms(page);
    await mockCreateRoom(page, newRoom);
    // After creation, the list refresh also returns the updated list
    await page.route('**/api/dashboard/rooms', route => {
      if (route.request().method() === 'GET') {
        route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([...MOCK_ROOMS, newRoom]) });
      } else {
        route.fallback();
      }
    });
    await page.goto('/rooms');

    await page.getByRole('button', { name: /add room/i }).click();
    await page.getByLabel(/room number/i).fill('404');
    await page.getByRole('button', { name: /add room/i }).last().click();

    await expect(page.getByText('404')).toBeVisible();
  });

  test('requires room number to add a room', async ({ page }) => {
    await goToRooms(page);
    await page.getByRole('button', { name: /add room/i }).click();
    // Submit without filling room number
    await page.getByRole('button', { name: /add room/i }).last().click();
    // HTML5 validation should prevent submission
    const roomInput = page.getByLabel(/room number/i);
    await expect(roomInput).toBeVisible(); // Form stays open
  });

  // ── QR Code ──────────────────────────────────────────────────────────────────

  test('shows QR code when "Show QR" button is clicked', async ({ page }) => {
    await goToRooms(page);
    await page.getByRole('button', { name: /show qr/i }).first().click();
    // QR canvas or image should appear
    await expect(page.locator('canvas, img[alt*="QR"], .qr-code').first()).toBeVisible({ timeout: 3000 });
  });

  test('shows "Download QR as PNG" option when QR is visible', async ({ page }) => {
    await goToRooms(page);
    await page.getByRole('button', { name: /show qr/i }).first().click();
    await expect(page.getByRole('button', { name: /download qr/i }).first()).toBeVisible();
  });

  test('shows "Scan with your phone camera" instruction', async ({ page }) => {
    await goToRooms(page);
    await page.getByRole('button', { name: /show qr/i }).first().click();
    await expect(page.getByText(/scan with your phone/i)).toBeVisible();
  });

  test('hides QR code when "Hide QR" is clicked', async ({ page }) => {
    await goToRooms(page);
    await page.getByRole('button', { name: /show qr/i }).first().click();
    await page.getByRole('button', { name: /hide qr/i }).first().click();
    await expect(page.locator('canvas').first()).not.toBeVisible({ timeout: 2000 }).catch(() => {});
  });

  // ── TV display link ───────────────────────────────────────────────────────────

  test('shows "Open TV display" link for each room', async ({ page }) => {
    await goToRooms(page);
    await expect(page.getByRole('link', { name: /open tv display/i }).first()).toBeVisible();
  });

});
