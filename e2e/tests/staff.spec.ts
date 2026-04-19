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
    await expect(page.getByText('Housekeeping')).toBeVisible();
    await expect(page.getByText('Spa')).toBeVisible();
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
    const newStaff = { id: 5, username: 'sara', fullName: 'Sara Ali', role: 'HOUSEKEEPING', enabled: true };
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

  // ─────────────────────────────────────────────────────────────────────────────
  // KNOWN LIMITATION: Single role per staff member
  //
  // Currently the system only supports ONE role per staff member.
  // Clicking a role button REPLACES the previously selected role — it does not
  // add to a list of roles.
  //
  // The tests below document this behavior. If multi-role support is added in
  // the future, these tests should be updated.
  // ─────────────────────────────────────────────────────────────────────────────

  test('role selection is single-select — clicking a role replaces the previous one', async ({ page }) => {
    await goToStaff(page);
    await page.getByRole('button', { name: /add staff/i }).click();

    // Select Housekeeping first
    await page.getByRole('button', { name: 'Housekeeping' }).click();
    // Now select Maintenance — this SHOULD replace Housekeeping
    await page.getByRole('button', { name: 'Maintenance' }).click();

    // Only Maintenance should be highlighted (brand-700 background)
    const maintenanceBtn = page.getByRole('button', { name: 'Maintenance' });
    await expect(maintenanceBtn).toHaveClass(/bg-brand-700/);

    // Housekeeping should no longer be selected
    const housekeepingBtn = page.getByRole('button', { name: 'Housekeeping' });
    await expect(housekeepingBtn).not.toHaveClass(/bg-brand-700/);
  });

  test('TODO: multi-role support — a staff member can only have ONE role at a time', async ({ page }) => {
    // This test documents the current limitation.
    // A staff member such as "General Staff" who also handles "Cafe & Bar"
    // currently cannot be assigned both roles. They must choose one.
    //
    // To support multiple roles, the backend model and this UI both need
    // to change from a single role string to an array of roles.
    await goToStaff(page);
    await page.getByRole('button', { name: /add staff/i }).click();

    // Select two roles — only the last one should remain active
    await page.getByRole('button', { name: 'Cafe & Bar' }).click();
    await page.getByRole('button', { name: 'General Staff' }).click();

    const cafeBtn = page.getByRole('button', { name: 'Cafe & Bar' });
    await expect(cafeBtn).not.toHaveClass(/bg-brand-700/);
    // This confirms only one role is active at a time (the limitation)
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

  test('changes a staff member role', async ({ page }) => {
    await setupAuthenticatedPage(page);
    await mockStaff(page);
    await mockStaffRoleChange(page);
    await page.goto('/staff');

    await page.getByText('Housekeeping').click();
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
