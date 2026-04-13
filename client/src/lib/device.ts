/**
 * Returns a stable device ID that persists across QR scans.
 * Stored in both localStorage AND a 1-year cookie so it survives
 * the fresh browser context that iOS/Android camera apps create.
 */
export function getDeviceId(): string {
  const COOKIE_NAME = "eco_device";
  const LS_KEY = "eco_device";

  // 1. Try cookie first (most persistent on mobile)
  const cookieMatch = document.cookie.match(/(?:^|;\s*)eco_device=([^;]+)/);
  if (cookieMatch) {
    const id = cookieMatch[1];
    // Keep localStorage in sync
    try { localStorage.setItem(LS_KEY, id); } catch { /* private mode */ }
    return id;
  }

  // 2. Try localStorage
  try {
    const stored = localStorage.getItem(LS_KEY);
    if (stored) {
      saveCookie(COOKIE_NAME, stored);
      return stored;
    }
  } catch { /* private mode */ }

  // 3. Generate new UUID
  const id = crypto.randomUUID();
  try { localStorage.setItem(LS_KEY, id); } catch { /* private mode */ }
  saveCookie(COOKIE_NAME, id);
  return id;
}

function saveCookie(name: string, value: string) {
  // 1 year, SameSite=Lax (works for same-origin QR scan redirects)
  document.cookie = `${name}=${value}; max-age=31536000; path=/; SameSite=Lax`;
}
