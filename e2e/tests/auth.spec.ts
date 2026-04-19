import { test, expect } from '@playwright/test';
import { setupAuthenticatedPage } from '../helpers/setup';
import { MOCK_ADMIN, MOCK_TOKEN } from '../helpers/data';

test.describe('Authentication', () => {

  test('shows login form when not authenticated', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByPlaceholder('Enter your username')).toBeVisible();
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
  });

  test('shows error message on invalid credentials', async ({ page }) => {
    await page.route('**/api/auth/login', route =>
      route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ error: 'Invalid credentials' }) })
    );
    await page.goto('/');
    await page.getByPlaceholder('Enter your username').fill('wronguser');
    await page.locator('input[type="password"]').fill('wrongpassword');
    await page.getByRole('button', { name: /sign in/i }).click();
    await expect(page.getByText('Invalid credentials')).toBeVisible();
  });

  test('logs in successfully and lands on dashboard', async ({ page }) => {
    await page.route('**/api/auth/login', route =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          token: MOCK_TOKEN,
          username: MOCK_ADMIN.username,
          fullName: MOCK_ADMIN.fullName,
          role: MOCK_ADMIN.role,
          hotelId: MOCK_ADMIN.hotelId,
          hotelName: MOCK_ADMIN.hotelName,
          primaryColor: null,
          logoUrl: null,
        }),
      })
    );
    await page.route('**/api/auth/me', route => route.fulfill({ status: 200, body: '{}' }));
    await page.route('**/api/dashboard/**', route => route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }));
    await page.route('**/api/dashboard/stream', route =>
      route.fulfill({ status: 200, headers: { 'Content-Type': 'text/event-stream' }, body: ': keepalive\n\n' })
    );

    await page.goto('/');
    await page.getByPlaceholder('Enter your username').fill('admin');
    await page.locator('input[type="password"]').fill('admin123');
    await page.getByRole('button', { name: /sign in/i }).click();

    // After login, the dashboard should load (shows "Service Requests" heading)
    await expect(page.getByText('Service Requests')).toBeVisible({ timeout: 5000 });
  });

  test('redirects back to login after logout', async ({ page }) => {
    await setupAuthenticatedPage(page);
    await page.route('**/api/dashboard/**', route => route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }));
    await page.goto('/');

    // Open nav and click Sign Out
    const signOutBtn = page.getByText('Sign out');
    if (await signOutBtn.isVisible()) {
      await signOutBtn.click();
    } else {
      // Nav may be collapsed on mobile — open it first
      await page.getByRole('button', { name: /menu|nav/i }).first().click();
      await page.getByText('Sign out').click();
    }

    await expect(page.getByPlaceholder('Enter your username')).toBeVisible({ timeout: 5000 });
  });

  test('stays logged in when navigating between pages', async ({ page }) => {
    await setupAuthenticatedPage(page);
    await page.route('**/api/dashboard/**', route => route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }));
    await page.goto('/');
    await expect(page.getByText('Service Requests')).toBeVisible();

    await page.goto('/rooms');
    // Should still be authenticated (not redirected to login)
    await expect(page.getByPlaceholder('Enter your username')).not.toBeVisible();
  });

  test('logs out when token is invalid (401 from /api/auth/me)', async ({ page }) => {
    // Inject auth state but make token validation fail
    await page.addInitScript(({ token, userData }) => {
      localStorage.setItem('econcierge_token', token);
      localStorage.setItem('econcierge_user', JSON.stringify(userData));
    }, { token: 'expired-token', userData: MOCK_ADMIN });

    await page.route('**/api/auth/me', route => route.fulfill({ status: 401, body: '{}' }));
    await page.goto('/');

    await expect(page.getByPlaceholder('Enter your username')).toBeVisible({ timeout: 5000 });
  });

  test('toggles password visibility', async ({ page }) => {
    await page.goto('/');
    const passwordInput = page.locator('input[type="password"]');
    await expect(passwordInput).toBeVisible();

    // Click the eye icon to reveal password
    await page.locator('button[type="button"]').filter({ has: page.locator('svg') }).first().click();
    await expect(page.locator('input[type="text"][placeholder]').last()).toBeVisible();
  });

});
