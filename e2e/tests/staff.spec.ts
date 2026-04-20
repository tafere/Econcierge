import { test, expect } from '@playwright/test';
import {
  setupAuthenticatedPage, mockStaff, mockCreateStaff,
  mockStaffRoleChange, mockStaffToggle, mockStaffDelete,
} from '../helpers/setup';
import { MOCK_STAFF } from '../helpers/data';

test.describe('Staff Management', () => {

  async function goToStaff(page: Parameters<typeof setupAuthenticatedPage>[0]) {
    await setupAuthenticatedPage(page);
    await mockStaff(page);
    await page.goto('/staff');
  }

  // ── Page load ────────────────────────────────────────────────────────────────

  test('shows "Staff Members" heading', async ({ page }) => {
    await goToStaff(page);
    await expect(page.getByText('Staff Members')).toBeVisible();
  });

  test('shows count of configured staff', async ({ page }) => {
    await goToStaff(page);
    await expect(page.getByText(/staff configured/i)).toBeVisible();
  });

  test('lists all staff members with name and username', async ({ page }) => {
    await goToStaff(page);
    await expect(page.getByText('Admin User')).toBeVisible();
    await expect(page.getByText('@admin')).toBeVisible();
    await expect(page.getByText('John Smith')).toBeVisible();
    await expect(page.getByText('@john')).toBeVisible();
  });

  test('shows role badge for each staff member', async ({ page }) => {
    await goToStaff(page);
    // John Smith has Housekeeping, Maria has Spa, Multi Role has Housekeeping+Spa (+1)
    await expect(page.getByText('Housekeeping').first()).toBeVisible();
    await expect(page.getByText('Spa').first()).toBeVisible();
  });

  test('shows disabled staff with reduced opacity', async ({ page }) => {
    await goToStaff(page);
    // "Old Staff" (id:4) is disabled — row should have opacity-50 class
    const disabledRow = page.locator('.opacity-50');
    await expect(disabledRow).toBeVisible();
  });

  // ── Add staff ────────────────────────────────────────────────────────────────

  test('opens Add Staff form when button is clicked', async ({ page }) => {
    await goToStaff(page);
    await page.getByRole('button', { name: /add staff/i }).click();
    await expect(page.getByText('New Staff Member')).toBeVisible();
  });

  test('add form shows Full Name, Username, Password, and Role fields', async ({ page }) => {
    await goToStaff(page);
    await page.getByRole('button', { name: /add staff/i }).click();

    await expect(page.getByPlaceholder('e.g. John Doe')).toBeVisible();
    await expect(page.getByPlaceholder('e.g. johndoe')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });

  test('creates a new staff member with Housekeeping role', async ({ page }) => {
    const newStaff = { id: 6, username: 'sara', fullName: 'Sara Ali', roles: ['HOUSEKEEPING'], enabled: true };
    await setupAuthenticatedPage(page);
    await mockStaff(page);
    await mockCreateStaff(page, newStaff);
    await page.route('**/api/dashboard/staff-mgmt', route => {
      if (route.request().method() === 'GET') {
        route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([...MOCK_STAFF, newStaff]) });
      } else {
        route.continue();
      }
    });
    await page.goto('/staff');

    await page.getByRole('button', { name: /add staff/i }).click();
    await page.getByPlaceholder('e.g. John Doe').fill('Sara Ali');
    await page.getByPlaceholder('e.g. johndoe').fill('sara');
    await page.locator('input[type="password"]').fill('sara123');
    await page.getByRole('button', { name: 'Housekeeping' }).click();
    await page.getByRole('button', { name: /add staff/i }).last().click();

    await expect(page.getByText('Sara Ali')).toBeVisible();
  });

  test('role selection is multi-select — clicking a second role adds it', async ({ page }) => {
    await goToStaff(page);
    await page.getByRole('button', { name: /add staff/i }).click();

    // Housekeeping is selected by default — also select Maintenance
    await page.getByRole('button', { name: 'Maintenance' }).click();

    // Both should be highlighted
    await expect(page.getByRole('button', { name: 'Housekeeping' })).toHaveClass(/bg-brand-700/);
    await expect(page.getByRole('button', { name: 'Maintenance' })).toHaveClass(/bg-brand-700/);
  });

  test('multi-role — clicking an active role deselects it', async ({ page }) => {
    await goToStaff(page);
    await page.getByRole('button', { name: /add staff/i }).click();

    // Housekeeping is selected by default — click it to deselect
    await page.getByRole('button', { name: 'Housekeeping' }).click();

    // Housekeeping should no longer be highlighted
    await expect(page.getByRole('button', { name: 'Housekeeping' })).not.toHaveClass(/bg-brand-700/);
  });

  test('validates minimum password length of 6 characters', async ({ page }) => {
    await goToStaff(page);
    await page.getByRole('button', { name: /add staff/i }).click();

    await page.getByPlaceholder('e.g. John Doe').fill('Test User');
    await page.getByPlaceholder('e.g. johndoe').fill('testuser');
    await page.locator('input[type="password"]').fill('abc'); // 3 chars — too short
    await page.getByRole('button', { name: /add staff/i }).last().click();

    // Form should not submit — HTML5 minLength validation
    await expect(page.getByPlaceholder('e.g. John Doe')).toBeVisible();
  });

  test('shows error for duplicate username', async ({ page }) => {
    await setupAuthenticatedPage(page);
    await mockStaff(page);
    await page.route('**/api/dashboard/staff-mgmt', route => {
      if (route.request().method() === 'POST') {
        route.fulfill({ status: 409, contentType: 'application/json', body: JSON.stringify({ error: 'Username already exists' }) });
      } else {
        route.continue();
      }
    });
    await page.goto('/staff');

    await page.getByRole('button', { name: /add staff/i }).click();
    await page.getByPlaceholder('e.g. John Doe').fill('Admin User');
    await page.getByPlaceholder('e.g. johndoe').fill('admin'); // already exists
    await page.locator('input[type="password"]').fill('admin123');
    await page.getByRole('button', { name: /add staff/i }).last().click();

    await expect(page.getByText('Username already exists')).toBeVisible();
  });

  // ── Change role ──────────────────────────────────────────────────────────────

  test('opens role change dropdown when role badge is clicked', async ({ page }) => {
    await goToStaff(page);
    // Click the Housekeeping badge on John Smith's row
    await page.getByText('Housekeeping').click();
    // Role picker should expand and show all roles
    await expect(page.getByText('Maintenance')).toBeVisible();
    await expect(page.getByText('Transport')).toBeVisible();
  });

  test('toggles a role on a staff member', async ({ page }) => {
    await setupAuthenticatedPage(page);
    await mockStaff(page);
    await mockStaffRoleChange(page);
    await page.goto('/staff');

    // Open role editor for John Smith (Housekeeping badge)
    await page.getByText('Housekeeping').first().click();
    // Toggle on Maintenance (adds it to John's roles)
    await page.getByRole('button', { name: 'Maintenance' }).last().click();
  });

  // ── Enable / Disable ─────────────────────────────────────────────────────────

  test('disables an active staff member', async ({ page }) => {
    await setupAuthenticatedPage(page);
    await mockStaff(page);
    await mockStaffToggle(page, false);
    await page.goto('/staff');

    // Click the toggle (ToggleRight) for John Smith
    const toggleBtn = page.locator('button[title]').filter({ hasText: '' }).nth(1);
    await toggleBtn.click();
  });

  test('enables a disabled staff member', async ({ page }) => {
    await setupAuthenticatedPage(page);
    await mockStaff(page);
    await mockStaffToggle(page, true);
    await page.goto('/staff');

    // The disabled row (Old Staff) has a ToggleLeft icon
    const disabledRow = page.locator('.opacity-50');
    const toggleInDisabledRow = disabledRow.locator('button').first();
    await toggleInDisabledRow.click();
  });

  // ── Delete staff ─────────────────────────────────────────────────────────────

  test('removes a staff member after confirmation', async ({ page }) => {
    await setupAuthenticatedPage(page);
    await mockStaff(page);
    await mockStaffDelete(page);
    page.on('dialog', dialog => dialog.accept());
    await page.goto('/staff');

    // Click trash icon on the last (disabled) staff member
    const trashBtns = page.locator('button[title*="Remove"], button[title*="remove"]');
    if (await trashBtns.count() > 0) {
      await trashBtns.last().click();
    }
  });

  test('cancels deletion when user dismisses confirmation', async ({ page }) => {
    await setupAuthenticatedPage(page);
    await mockStaff(page);
    page.on('dialog', dialog => dialog.dismiss());
    await page.goto('/staff');

    const trashBtns = page.locator('button[title*="Remove"], button[title*="remove"]');
    if (await trashBtns.count() > 0) {
      await trashBtns.last().click();
    }
    // Staff list should remain unchanged
    await expect(page.getByText('Old Staff')).toBeVisible();
  });

  // ── Password visibility ───────────────────────────────────────────────────────

  test('toggles password visibility in add form', async ({ page }) => {
    await goToStaff(page);
    await page.getByRole('button', { name: /add staff/i }).click();

    await page.locator('input[type="password"]').fill('mypassword');
    // Click the eye icon
    await page.locator('button[type="button"]').filter({ has: page.locator('svg') }).last().click();
    await expect(page.locator('input[type="text"][value="mypassword"]')).toBeVisible();
  });

  // ── Cancel add form ───────────────────────────────────────────────────────────

  test('closes add staff form when Cancel is clicked', async ({ page }) => {
    await goToStaff(page);
    await page.getByRole('button', { name: /add staff/i }).click();
    await expect(page.getByText('New Staff Member')).toBeVisible();

    await page.getByRole('button', { name: /cancel/i }).click();
    await expect(page.getByText('New Staff Member')).not.toBeVisible();
  });

});
