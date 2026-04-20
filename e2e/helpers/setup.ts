import type { Page } from '@playwright/test';
import {
  MOCK_TOKEN, MOCK_ADMIN, ALL_MOCK_REQUESTS, MOCK_BOOKINGS,
  MOCK_HOTEL, MOCK_ROOMS, MOCK_CATEGORIES, MOCK_STAFF, MOCK_ANALYTICS,
} from './data';

// ─── Auth Injection ───────────────────────────────────────────────────────────

/**
 * Sets auth state in localStorage before the page loads.
 * Must be called before page.goto().
 */
export async function injectAuth(page: Page, user = MOCK_ADMIN) {
  await page.addInitScript(({ token, userData }) => {
    localStorage.setItem('econcierge_token', token);
    localStorage.setItem('econcierge_user', JSON.stringify(userData));
  }, { token: MOCK_TOKEN, userData: user });
}

// ─── API Mock Helpers ─────────────────────────────────────────────────────────

type Method = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';

async function mockRoute(
  page: Page,
  pattern: string,
  response: unknown,
  status = 200,
  method?: Method,
) {
  await page.route(pattern, (route) => {
    if (method && route.request().method() !== method) {
      return route.continue();
    }
    return route.fulfill({
      status,
      contentType: 'application/json',
      body: JSON.stringify(response),
    });
  });
}

// ─── Common mocks needed by almost every staff page ──────────────────────────

/**
 * Mocks the token-validation call the app makes on startup.
 * Returns 200 so the user stays logged in.
 */
export async function mockAuthMe(page: Page) {
  await mockRoute(page, '**/api/auth/me', {});
}

/** Mocks the SSE stream endpoint so it doesn't hang open. */
export async function mockSseStream(page: Page) {
  await page.route('**/api/dashboard/stream', (route) => {
    route.fulfill({
      status: 200,
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
      },
      body: ': keepalive\n\n',
    });
  });
}

/**
 * Full setup for any authenticated staff page.
 * Call this in beforeEach or at the top of each test before page.goto().
 */
export async function setupAuthenticatedPage(page: Page, user = MOCK_ADMIN) {
  await injectAuth(page, user);
  await mockAuthMe(page);
  await mockSseStream(page);
}

// ─── Page-specific mock helpers ───────────────────────────────────────────────

export async function mockDashboard(page: Page, requests = ALL_MOCK_REQUESTS, bookings = MOCK_BOOKINGS) {
  await mockRoute(page, '**/api/dashboard/requests', requests);
  await mockRoute(page, '**/api/dashboard/bookings', bookings);
  await mockRoute(page, '**/api/dashboard/bookings/all', bookings);
  await mockRoute(page, '**/api/dashboard/hotel', MOCK_HOTEL);
}

export async function mockRooms(page: Page, rooms = MOCK_ROOMS) {
  await mockRoute(page, '**/api/dashboard/rooms', rooms);
}

export async function mockCategories(page: Page, categories = MOCK_CATEGORIES) {
  await mockRoute(page, '**/api/dashboard/categories', categories);
}

export async function mockStaff(page: Page, staff = MOCK_STAFF) {
  await mockRoute(page, '**/api/dashboard/staff-mgmt', staff);
}

export async function mockHotelSettings(page: Page, hotel = MOCK_HOTEL) {
  await mockRoute(page, '**/api/dashboard/hotel', hotel);
}

export async function mockAnalytics(page: Page, analytics = MOCK_ANALYTICS) {
  await mockRoute(page, '**/api/dashboard/analytics', analytics);
}

// ─── Mutation mocks (POST/PATCH/DELETE) ───────────────────────────────────────

export async function mockRequestStatusUpdate(page: Page, updatedRequest: object) {
  await page.route('**/api/dashboard/requests/*/status', (route) => {
    if (route.request().method() === 'PATCH') {
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(updatedRequest) });
    } else {
      route.continue();
    }
  });
}

export async function mockCreateRoom(page: Page, newRoom: object) {
  await page.route('**/api/dashboard/rooms', (route) => {
    if (route.request().method() === 'POST') {
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(newRoom) });
    } else {
      route.continue();
    }
  });
}

export async function mockCreateStaff(page: Page, newStaff: object) {
  await page.route('**/api/dashboard/staff-mgmt', (route) => {
    if (route.request().method() === 'POST') {
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(newStaff) });
    } else {
      route.continue();
    }
  });
}

export async function mockStaffRoleChange(page: Page) {
  await page.route('**/api/dashboard/staff-mgmt/*/roles', (route) => {
    route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  });
}

export async function mockStaffToggle(page: Page, enabled: boolean) {
  await page.route('**/api/dashboard/staff-mgmt/*/toggle', (route) => {
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ enabled }) });
  });
}

export async function mockStaffDelete(page: Page) {
  await page.route('**/api/dashboard/staff-mgmt/*', (route) => {
    if (route.request().method() === 'DELETE') {
      route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
    } else {
      route.continue();
    }
  });
}

export async function mockSaveHotelSettings(page: Page) {
  await page.route('**/api/dashboard/hotel', (route) => {
    if (route.request().method() === 'PUT') {
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_HOTEL) });
    } else {
      route.fallback();
    }
  });
}
