const KEY = "eco_notifications";

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

export function loadNotifications(): AppNotification[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]");
  } catch {
    return [];
  }
}

function save(list: AppNotification[]) {
  localStorage.setItem(KEY, JSON.stringify(list.slice(0, 100)));
}

export function addNotification(n: Omit<AppNotification, "id" | "read" | "createdAt">): AppNotification[] {
  const list = loadNotifications();
  // Avoid duplicate past_due for the same request
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
  save(updated);
  return updated;
}

export function dismissNotification(id: string): AppNotification[] {
  const updated = loadNotifications().filter(n => n.id !== id);
  save(updated);
  return updated;
}

export function clearRequestNotifications(requestId: number): AppNotification[] {
  const updated = loadNotifications().filter(n => n.requestId !== requestId);
  save(updated);
  return updated;
}
