export type NotificationType = "new_request" | "past_due";

export interface AppNotification {
  id: string;
  type: NotificationType;
  requestId: number;
  roomNumber: string;
  itemName: string;
  createdAt: string;
  read: boolean;
}

const key = (hotelId: number) => `eco_notifications_${hotelId}`;

export function loadNotifications(hotelId: number): AppNotification[] {
  try {
    return JSON.parse(localStorage.getItem(key(hotelId)) ?? "[]");
  } catch {
    return [];
  }
}

function save(hotelId: number, list: AppNotification[]) {
  localStorage.setItem(key(hotelId), JSON.stringify(list.slice(0, 100)));
}

export function addNotification(hotelId: number, n: Omit<AppNotification, "id" | "read" | "createdAt">): AppNotification[] {
  const list = loadNotifications(hotelId);
  if (n.type === "past_due" && list.some(x => x.type === "past_due" && x.requestId === n.requestId)) {
    return list;
  }
  const entry: AppNotification = {
    ...n,
    id: `${Date.now()}-${Math.random()}`,
    createdAt: new Date().toISOString(),
    read: false,
  };
  const updated = [entry, ...list];
  save(hotelId, updated);
  return updated;
}

export function dismissNotification(hotelId: number, id: string): AppNotification[] {
  const updated = loadNotifications(hotelId).filter(n => n.id !== id);
  save(hotelId, updated);
  return updated;
}

export function clearRequestNotifications(hotelId: number, requestId: number): AppNotification[] {
  const updated = loadNotifications(hotelId).filter(n => n.requestId !== requestId);
  save(hotelId, updated);
  return updated;
}
