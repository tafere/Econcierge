import { createContext, useContext, useState, useEffect, useMemo, useRef, ReactNode } from "react";
import { useAuth, getToken } from "@/lib/auth";
import { loadDismissed, saveDismissed, type AppNotification } from "@/lib/notifications";

const OVERDUE_PENDING_MINS = 30;

function ageMinutes(iso: string) {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
}

interface SlimRequest {
  id: number;
  roomNumber: string;
  itemName: string;
  status: string;
  createdAt: string;
  acceptedAt?: string | null;
  etaMinutes?: number | null;
}

interface NotificationsContextType {
  notifications: AppNotification[];
  dismiss: (id: string) => void;
  pendingTarget: number | null;
  setPendingTarget: (id: number | null) => void;
  /** Fired when a new notification arrives — Dashboard uses this to play sounds */
  onNewNotification?: () => void;
}

const NotificationsContext = createContext<NotificationsContextType | null>(null);

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const hotelId = user?.hotelId ?? 0;

  const [requests, setRequests] = useState<SlimRequest[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [pendingTarget, setPendingTarget] = useState<number | null>(null);
  const newSoundCallbackRef = useRef<(() => void) | null>(null);
  const prevCountRef = useRef(0);

  useEffect(() => {
    if (hotelId) setDismissed(loadDismissed(hotelId));
  }, [hotelId]);

  const fetchRequests = async () => {
    const token = getToken();
    if (!token || !hotelId) return;
    const res = await fetch("/api/dashboard/requests", {
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    });
    if (res.ok) {
      const data: SlimRequest[] = await res.json();
      setRequests(data.filter(r => r.status === "PENDING" || r.status === "IN_PROGRESS"));
    }
  };

  // Initial fetch + polling every 30s
  useEffect(() => {
    if (!user || !hotelId) return;
    fetchRequests();
    const interval = setInterval(fetchRequests, 30_000);
    return () => clearInterval(interval);
  }, [user, hotelId]);

  // SSE for instant updates
  useEffect(() => {
    if (!user) return;
    const es = new EventSource(`/api/dashboard/stream?token=${getToken()}`);
    es.addEventListener("request", () => fetchRequests());
    return () => es.close();
  }, [user]);

  const notifications = useMemo<AppNotification[]>(() => {
    const result: AppNotification[] = [];
    for (const r of requests) {
      if (r.status === "PENDING" && ageMinutes(r.createdAt) <= 120) {
        const id = `new_${r.id}`;
        if (!dismissed.has(id))
          result.push({ id, type: "new_request", requestId: r.id, roomNumber: r.roomNumber, itemName: r.itemName, createdAt: r.createdAt });
      }
      const isPastDue =
        (r.status === "PENDING" && ageMinutes(r.createdAt) > OVERDUE_PENDING_MINS) ||
        (r.status === "IN_PROGRESS" && r.acceptedAt && r.etaMinutes != null &&
          ageMinutes(r.acceptedAt) > r.etaMinutes);
      if (isPastDue) {
        const id = `pd_${r.id}`;
        if (!dismissed.has(id))
          result.push({ id, type: "past_due", requestId: r.id, roomNumber: r.roomNumber, itemName: r.itemName, createdAt: r.acceptedAt || r.createdAt });
      }
    }
    return result.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [requests, dismissed]);

  // Fire sound callback when new notification count increases
  useEffect(() => {
    if (notifications.length > prevCountRef.current) {
      newSoundCallbackRef.current?.();
    }
    prevCountRef.current = notifications.length;
  }, [notifications.length]);

  const dismiss = (id: string) => {
    setDismissed(prev => {
      const next = new Set(prev);
      next.add(id);
      saveDismissed(hotelId, next);
      return next;
    });
  };

  return (
    <NotificationsContext.Provider value={{ notifications, dismiss, pendingTarget, setPendingTarget }}>
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationsContext);
  if (!ctx) throw new Error("useNotifications must be inside NotificationsProvider");
  return ctx;
}
