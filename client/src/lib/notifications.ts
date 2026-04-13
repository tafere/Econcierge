export type NotificationType = "new_request" | "past_due";

export interface AppNotification {
  id: string;           // e.g. "new_42" or "pd_42"
  type: NotificationType;
  requestId: number;
  roomNumber: string;
  itemName: string;
  createdAt: string;
}

const dismissedKey = (hotelId: number) => `eco_dismissed_${hotelId}`;

export function loadDismissed(hotelId: number): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(dismissedKey(hotelId)) ?? "[]"));
  } catch {
    return new Set();
  }
}

export function saveDismissed(hotelId: number, ids: Set<string>): Set<string> {
  // Keep last 500 dismissed IDs to avoid unbounded growth
  localStorage.setItem(dismissedKey(hotelId), JSON.stringify([...ids].slice(-500)));
  return ids;
}
