import { useEffect, useState, useCallback } from "react";
import { useParams } from "wouter";
import { applyHotelTheme } from "@/lib/theme";
import {
  Loader2, ConciergeBell, ChevronRight, ChevronLeft,
  Minus, Plus, ChevronDown, Clock, RefreshCw, ShoppingCart, X, Send, Languages,
} from "lucide-react";
import { tr, getLang, setLang, LANGUAGES, type Lang } from "@/lib/i18n";
import { getDeviceId } from "@/lib/device";
import { requestNotifyPermission, showNotification, playStatusSound } from "@/lib/notify";

// ─── Types ────────────────────────────────────────────────────────────────────

interface MenuItem {
  id: number;
  name: string;
  nameAm?: string;
  description: string;
  maxQuantity: number;
  schedulable: boolean;
  slotIntervalMins: number;
  capacity: number;
}

interface MenuCategory {
  id: number;
  name: string;
  nameAm?: string;
  icon: string;
  items: MenuItem[];
}

interface RoomInfo {
  roomId: number;
  roomNumber: string;
  floor: string;
  hotelId: number;
  hotelName: string;
  tagline: string;
  logoUrl: string;
  heroImageUrl: string;
  primaryColor: string;
  menu: MenuCategory[];
}

interface CartItem {
  itemId: number;
  itemName: string;
  categoryName: string;
  categoryIcon: string;
  quantity: number;
  notes: string;
}

interface TrackedRequest {
  id: number;
  itemName: string;
  categoryName: string;
  quantity: number;
  submittedAt: string;
  status: "PENDING" | "IN_PROGRESS" | "DONE" | "CANCELLED" | "DECLINED";
  staffComment?: string;
  etaMinutes?: number | null;
  acceptedAt?: string | null;
}

interface SlotInfo {
  time: string;
  dateTime: string;
  capacity: number;
  remaining: number;
  available: boolean;
  past: boolean;
}

interface TrackedBooking {
  id: number;
  itemName: string;
  slotTime: string;
  guestCount: number;
  status: "PENDING" | "CONFIRMED" | "CANCELLED";
}

// ─── Persistence helpers ──────────────────────────────────────────────────────

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

function storageKey(qrToken: string) {
  return `eco_req_${qrToken}`;
}

function loadTracked(qrToken: string): TrackedRequest[] {
  try {
    const all: TrackedRequest[] = JSON.parse(localStorage.getItem(storageKey(qrToken)) ?? "[]");
    // Drop requests older than 7 days
    const cutoff = Date.now() - SEVEN_DAYS_MS;
    return all.filter(r => new Date(r.submittedAt).getTime() >= cutoff);
  } catch { return []; }
}

function saveTracked(qrToken: string, reqs: TrackedRequest[]) {
  const cutoff = Date.now() - SEVEN_DAYS_MS;
  const pruned = reqs.filter(r => new Date(r.submittedAt).getTime() >= cutoff);
  localStorage.setItem(storageKey(qrToken), JSON.stringify(pruned));
}

function bookingsKey(qrToken: string) {
  return `eco_bookings_${qrToken}`;
}

function loadBookings(qrToken: string): TrackedBooking[] {
  try {
    const all: TrackedBooking[] = JSON.parse(localStorage.getItem(bookingsKey(qrToken)) ?? "[]");
    const cutoff = Date.now() - SEVEN_DAYS_MS;
    return all.filter(b => new Date(b.slotTime).getTime() >= cutoff);
  } catch { return []; }
}

function saveBookings(qrToken: string, bookings: TrackedBooking[]) {
  const cutoff = Date.now() - SEVEN_DAYS_MS;
  const pruned = bookings.filter(b => new Date(b.slotTime).getTime() >= cutoff);
  localStorage.setItem(bookingsKey(qrToken), JSON.stringify(pruned));
}

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORY_EMOJI: Record<string, string> = {
  broom:            "🧹",
  sparkles:         "✨",
  soap:             "🧴",
  utensils:         "🍽️",
  wrench:           "🔧",
  "concierge-bell": "🛎️",
  car:              "🚌",
  coffee:           "☕",
  flower:           "🌸",
  dumbbell:         "💪",
  briefcase:        "💼",
  star:             "⭐",
};

const CATEGORY_IMAGE: Record<string, string> = {};

const STATUS_STYLE: Record<string, string> = {
  PENDING:     "bg-amber-100 text-amber-800 border-amber-200",
  IN_PROGRESS: "bg-blue-100  text-blue-800  border-blue-200",
  DONE:        "bg-green-100 text-green-800 border-green-200",
  CANCELLED:   "bg-stone-100 text-stone-500 border-stone-200",
  DECLINED:    "bg-red-100   text-red-700   border-red-200",
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function GuestPage() {
  const { token } = useParams<{ token: string }>();

  const [lang, setLangState]      = useState<Lang>(getLang());
  const [room, setRoom]           = useState<RoomInfo | null>(null);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);

  // navigation
  const [selectedCat, setSelectedCat]   = useState<MenuCategory | null>(null);
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [showCart, setShowCart]         = useState(false);

  useEffect(() => { window.scrollTo({ top: 0, behavior: "smooth" }); }, [selectedCat, selectedItem, showCart]);

  // form
  const [quantity, setQuantity]   = useState(1);
  const [notes, setNotes]         = useState("");
  const [showNotes, setShowNotes] = useState(false);

  // cart
  const [cart, setCart]       = useState<CartItem[]>([]);
  const [sending, setSending] = useState(false);

  // cancellation
  const [cancellingId, setCancellingId] = useState<number | null>(null);

  // request tracker
  const [tracked, setTracked] = useState<TrackedRequest[]>([]);

  // scheduling
  const [slotDate, setSlotDate]       = useState<string>("");
  const [slots, setSlots]             = useState<SlotInfo[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<SlotInfo | null>(null);
  const [guestCount, setGuestCount]   = useState(1);
  const [bookings, setBookings]       = useState<TrackedBooking[]>([]);
  const [booking, setBooking]         = useState(false);

  // ── Language toggle ──────────────────────────────────────────────────────
  const cycleLanguage = () => {
    const idx = LANGUAGES.findIndex(l => l.code === lang);
    const next = LANGUAGES[(idx + 1) % LANGUAGES.length].code;
    setLang(next);
    setLangState(next);
  };
  const T = (key: string) => tr(lang, key);

  // ── Load room + restore tracked requests ────────────────────────────────
  useEffect(() => {
    requestNotifyPermission();
    // Clear any staff hotel theme immediately — the correct hotel theme will
    // be applied once we know which hotel this QR code belongs to.
    applyHotelTheme(null);

    fetch(`/api/guest/room/${token}`)
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(async (data: RoomInfo) => {
        setRoom(data);
        applyHotelTheme(data.primaryColor);
        setBookings(loadBookings(token));

        // Load from localStorage first (has cached status updates)
        const local = loadTracked(token);
        let resolved: TrackedRequest[] = local;

        // Fetch last-24h requests for this room from DB.
        // QR token is the room's shared secret — all requests here belong to this guest.
        try {
          const res = await fetch(`/api/guest/room/${token}/requests`);
          if (res.ok) {
            const dbReqs: Array<{
              id: number; itemName: string; itemNameAm: string;
              categoryName: string; categoryIcon: string;
              quantity: number; status: TrackedRequest["status"];
              staffComment: string; submittedAt: string;
              etaMinutes?: number | null; acceptedAt?: string | null;
            }> = await res.json();

            // DB is authoritative for status; also keep older local entries
            const dbMap = new Map(dbReqs.map(r => [r.id, r]));

            const merged: TrackedRequest[] = dbReqs.map(r => ({
              id:           r.id,
              itemName:     r.itemName,
              categoryName: r.categoryName,
              quantity:     r.quantity,
              submittedAt:  r.submittedAt,
              status:       r.status,
              staffComment: r.staffComment || "",
              etaMinutes:   r.etaMinutes ?? null,
              acceptedAt:   r.acceptedAt ?? null,
            }));

            // Append local entries not returned by DB (older than today)
            local.forEach(r => { if (!dbMap.has(r.id)) merged.push(r); });

            merged.sort((a, b) =>
              new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());

            saveTracked(token, merged);
            resolved = merged;
          }
        } catch { /* network error — use localStorage only */ }

        setTracked(resolved);
      })
      .catch(() => setError(T("invalidQr")))
      .finally(() => setLoading(false));

    // When guest page unmounts restore nothing — staff pages re-apply their
    // own theme via AuthProvider on mount.
    return () => applyHotelTheme(null);
  }, [token]);

  // ── Poll statuses every 15 s if there are non-DONE requests ─────────────
  const pollStatuses = useCallback(async () => {
    const pending = tracked.filter(r => r.status !== "DONE" && r.status !== "CANCELLED" && r.status !== "DECLINED");
    if (pending.length === 0) return;
    const ids = pending.map(r => r.id).join(",");
    const res = await fetch(`/api/guest/requests/status?ids=${ids}`);
    if (!res.ok) return;
    const updates: { id: number; status: TrackedRequest["status"]; staffComment?: string; etaMinutes?: number | null; acceptedAt?: string | null }[] = await res.json();
    setTracked(prev => {
      const map = Object.fromEntries(updates.map(u => [u.id, u]));
      const next = prev.map(r => {
        if (!map[r.id]) return r;
        const u = map[r.id];
        if (u.status !== r.status) {
          playStatusSound();
          showNotification("Request Update", `Your ${r.itemName} request is now ${u.status.replace("_", " ")}`);
        }
        return { ...r, status: u.status, staffComment: u.staffComment || r.staffComment, etaMinutes: u.etaMinutes ?? r.etaMinutes, acceptedAt: u.acceptedAt ?? r.acceptedAt };
      });
      saveTracked(token, next);
      return next;
    });
  }, [tracked, token]);

  useEffect(() => {
    const interval = setInterval(pollStatuses, 15_000);
    return () => clearInterval(interval);
  }, [pollStatuses]);

  // ── Cart actions ─────────────────────────────────────────────────────────
  const addToCart = () => {
    if (!selectedItem || !selectedCat) return;
    setCart(prev => [...prev, {
      itemId:       selectedItem.id,
      itemName:     lang === "am" && selectedItem.nameAm ? selectedItem.nameAm : selectedItem.name,
      categoryName: selectedCat.name,
      categoryIcon: selectedCat.icon,
      quantity,
      notes:        notes.trim(),
    }]);
    setSelectedItem(null);
    setSelectedCat(null);
    setQuantity(1);
    setNotes("");
    setShowNotes(false);
  };

  const removeFromCart = (index: number) => {
    setCart(prev => prev.filter((_, i) => i !== index));
  };

  const sendAll = async () => {
    if (!room || cart.length === 0) return;
    setSending(true);
    const newTracked: TrackedRequest[] = [];
    for (const cartItem of cart) {
      try {
        const res = await fetch("/api/guest/request", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            roomId:   room.roomId,
            itemId:   cartItem.itemId,
            quantity: cartItem.quantity,
            notes:    cartItem.notes || null,
            deviceId: getDeviceId(),
          }),
        });
        if (res.ok) {
          const data = await res.json();
          newTracked.push({
            id:           data.id,
            itemName:     cartItem.itemName,
            categoryName: cartItem.categoryName,
            quantity:     cartItem.quantity,
            submittedAt:  new Date().toISOString(),
            status:       "PENDING",
          });
        }
      } catch { /* continue */ }
    }
    setTracked(prev => {
      const next = [...newTracked, ...prev];
      saveTracked(token, next);
      return next;
    });
    setCart([]);
    setShowCart(false);
    setSending(false);
  };

  // ── Cancel a pending request ─────────────────────────────────────────────
  const cancelRequest = async (id: number) => {
    const res = await fetch(`/api/guest/request/${id}/cancel`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ qrToken: token }),
    });
    if (res.ok) {
      setTracked(prev => {
        const next = prev.map(r => r.id === id ? { ...r, status: "CANCELLED" as const } : r);
        saveTracked(token, next);
        return next;
      });
    }
    setCancellingId(null);
  };

  // ── Scheduling helpers ────────────────────────────────────────────────────
  const todayStr     = new Date().toISOString().slice(0, 10);
  const tomorrowStr  = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);

  const fetchSlots = async (itemId: number, date: string) => {
    setSlotsLoading(true); setSlots([]); setSelectedSlot(null);
    const res = await fetch(`/api/schedule/${itemId}/slots?date=${date}`);
    if (res.ok) { const d = await res.json(); setSlots(d.slots ?? []); }
    setSlotsLoading(false);
  };

  const bookSlot = async () => {
    if (!room || !selectedItem || !selectedSlot) return;
    setBooking(true);
    const res = await fetch("/api/schedule/book", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        roomId: room.roomId, itemId: selectedItem.id,
        slotTime: selectedSlot.dateTime, guestCount, notes: notes.trim() || null,
      }),
    });
    if (res.ok) {
      const d = await res.json();
      const nb: TrackedBooking = {
        id: d.id, itemName: lang === "am" && selectedItem.nameAm ? selectedItem.nameAm : selectedItem.name,
        slotTime: `${slotDate} ${selectedSlot.time}`,
        guestCount, status: "PENDING",
      };
      setBookings(prev => {
        const next = [nb, ...prev];
        saveBookings(token, next);
        return next;
      });
      setSelectedItem(null); setSelectedCat(null);
      setSelectedSlot(null); setSlots([]); setGuestCount(1); setNotes(""); setShowNotes(false);
    }
    setBooking(false);
  };

  // ── Helpers ──────────────────────────────────────────────────────────────
  const selectItem = (item: MenuItem) => {
    setSelectedItem(item);
    setQuantity(1);
    setNotes("");
    setShowNotes(false);
    if (item.schedulable) {
      const d = todayStr;
      setSlotDate(d);
      fetchSlots(item.id, d);
    }
  };

  const timeAgo = (iso: string) => {
    const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
    if (diff < 1) return T("justNow");
    return lang === "am" ? `${diff} ${T("minutesAgo")}` : `${diff}${T("minutesAgo")}`;
  };

  const statusLabel = (s: string) => {
    if (s === "PENDING")     return T("pending");
    if (s === "IN_PROGRESS") return T("inProgress");
    if (s === "DONE")        return T("done");
    if (s === "CANCELLED")   return T("cancelled");
    if (s === "DECLINED")    return T("declined");
    return s;
  };

  // ── Render ───────────────────────────────────────────────────────────────
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-brand-700" />
    </div>
  );

  if (error) return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="text-center max-w-xs">
        <ConciergeBell className="h-12 w-12 text-stone-300 mx-auto mb-4" />
        <p className="text-stone-600 text-sm">{error}</p>
      </div>
    </div>
  );

  const hasHero = !!room!.heroImageUrl;

  return (
    <div className="min-h-screen pb-28 relative z-[1]">

      {/* Full-screen hotel background image */}
      {hasHero && (
        <div className="fixed inset-0 z-0">
          <img src={room!.heroImageUrl} alt="" className="w-full h-full object-cover object-center" />
          {/* Gradient: darker at top for header readability, opens up in middle to show the hotel */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/65 via-black/20 to-black/65" />
        </div>
      )}

      {/* Header */}
      <div className={`text-white px-4 py-5 ${hasHero ? "bg-black/20 backdrop-blur-sm" : "bg-brand-700"}`}>
        <div className="flex items-center justify-between max-w-lg mx-auto">
          <div className="flex items-center gap-3 min-w-0">
            {room!.logoUrl ? (
              <img src={room!.logoUrl} alt={room!.hotelName} className="h-9 w-9 rounded object-cover shrink-0" />
            ) : (
              <ConciergeBell className="h-6 w-6 shrink-0" />
            )}
            <div className="min-w-0">
              <p className="font-extrabold text-base leading-tight truncate">{room!.hotelName}</p>
              <p className="text-xs text-white/70 font-medium">Econcierge · {T("room")} {room!.roomNumber}</p>
            </div>
          </div>
          <button
            onClick={cycleLanguage}
            className={`text-xs font-bold transition-colors rounded px-3 py-1.5 text-white shrink-0 ml-3 flex items-center gap-1
              ${hasHero ? "bg-white/15 hover:bg-white/25 backdrop-blur-sm border border-white/20" : "bg-brand-800 hover:bg-brand-900 text-amber-100"}`}
          >
            <Languages className="h-3.5 w-3.5" />
            {LANGUAGES.find(l => l.code === lang)?.label ?? lang.toUpperCase()}
          </button>
        </div>
      </div>

      <div className="max-w-lg mx-auto p-4 space-y-4">

        {/* ── Cart view ─────────────────────────────────────────────────── */}
        {showCart && (
          <>
            <button
              onClick={() => setShowCart(false)}
              className="flex items-center gap-1 text-sm text-brand-700 font-semibold pt-2"
            >
              <ChevronLeft className="h-4 w-4" /> {T("back")}
            </button>

            <h2 className="font-bold text-stone-900 flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-brand-700" /> {T("yourCart")}
            </h2>

            {cart.length === 0 ? (
              <p className="text-sm text-stone-400 text-center py-8">{T("cartEmpty")}</p>
            ) : (
              <>
                <div className="glass rounded divide-y divide-stone-50">
                  {cart.map((ci, i) => (
                    <div key={i} className="flex items-center gap-3 px-4 py-3">
                      <span className="text-xl shrink-0">{CATEGORY_EMOJI[ci.categoryIcon] ?? "🛎️"}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-stone-800">{ci.itemName}</p>
                        <p className="text-xs text-stone-400">
                          {ci.categoryName}{ci.quantity > 1 ? ` · ×${ci.quantity}` : ""}
                        </p>
                        {ci.notes && (
                          <p className="text-xs text-stone-400 italic mt-0.5">"{ci.notes}"</p>
                        )}
                      </div>
                      <button
                        onClick={() => removeFromCart(i)}
                        className="text-stone-300 hover:text-red-500 transition-colors shrink-0"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>

                <button
                  onClick={sendAll}
                  disabled={sending}
                  className="w-full h-12 bg-brand-700 text-white rounded font-bold text-sm
                    hover:bg-brand-800 transition-colors flex items-center justify-center gap-2
                    disabled:opacity-50"
                >
                  {sending
                    ? <><Loader2 className="h-4 w-4 animate-spin" /> {T("sending")}</>
                    : <><Send className="h-4 w-4" /> {T("sendAll")} ({cart.length})</>}
                </button>
              </>
            )}
          </>
        )}

        {/* ── Main flow (hidden while cart is open) ─────────────────────── */}
        {!showCart && (
          <>
            {/* My Requests tracker — only on main screen */}
            {!selectedCat && !selectedItem && tracked.length > 0 && (
              <div className={`rounded-xl overflow-hidden ${hasHero ? "bg-black/65 backdrop-blur-sm border border-white/10" : "glass"}`}>
                <div className={`flex items-center justify-between px-4 py-2.5 border-b ${hasHero ? "border-white/10" : "border-stone-100"}`}>
                  <p className={`text-[11px] font-bold uppercase tracking-wider ${hasHero ? "text-white/50" : "text-stone-400"}`}>{T("myRequests")}</p>
                  <button onClick={pollStatuses} className={`transition-colors ${hasHero ? "text-white/30 hover:text-white/70" : "text-stone-300 hover:text-brand-700"}`}>
                    <RefreshCw className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className={`divide-y ${hasHero ? "divide-white/10" : "divide-stone-50"}`}>
                  {tracked.map(req => (
                    <div key={req.id} className="px-4 py-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className={`text-sm font-semibold truncate ${hasHero ? "text-white" : "text-stone-800"}`}>{req.itemName}</p>
                            {req.quantity > 1 && (
                              <span className={`text-xs font-bold ${hasHero ? "text-amber-400" : "text-brand-700"}`}>×{req.quantity}</span>
                            )}
                          </div>
                          <div className={`flex items-center gap-1.5 mt-0.5 text-[11px] ${hasHero ? "text-white/40" : "text-stone-400"}`}>
                            <Clock className="h-3 w-3" />
                            {timeAgo(req.submittedAt)}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border
                            ${hasHero
                              ? req.status === "PENDING"     ? "border-amber-400/50 text-amber-300"
                              : req.status === "IN_PROGRESS" ? "border-blue-400/50 text-blue-300"
                              : req.status === "DONE"        ? "border-green-400/50 text-green-300"
                              : req.status === "DECLINED"    ? "border-red-400/50 text-red-300"
                              : "border-white/20 text-white/40"
                              : STATUS_STYLE[req.status]}`}>
                            {statusLabel(req.status)}
                          </span>
                          {req.status === "PENDING" && cancellingId !== req.id && (
                            <button onClick={() => setCancellingId(req.id)}
                              className={`transition-colors ${hasHero ? "text-white/25 hover:text-red-400" : "text-stone-400 hover:text-red-500"}`}>
                              <X className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                      {cancellingId === req.id && (
                        <div className={`mt-2 flex items-center gap-2 rounded px-3 py-2 ${hasHero ? "bg-red-900/30" : "bg-red-50"}`}>
                          <p className={`text-xs flex-1 ${hasHero ? "text-red-300" : "text-red-700"}`}>{T("confirmCancel")}</p>
                          <button onClick={() => cancelRequest(req.id)} className="text-xs font-bold text-red-400 hover:text-red-200 transition-colors">{T("yes")}</button>
                          <button onClick={() => setCancellingId(null)} className={`text-xs transition-colors ${hasHero ? "text-white/40 hover:text-white/70" : "text-stone-400 hover:text-stone-600"}`}>{T("no")}</button>
                        </div>
                      )}
                      {(req.status === "IN_PROGRESS" || req.status === "PENDING") && req.etaMinutes != null && (
                        <p className={`mt-1 text-[11px] font-medium flex items-center gap-1 ${hasHero ? "text-blue-300" : "text-blue-600"}`}>
                          <Clock className="h-3 w-3" />
                          {req.acceptedAt
                            ? (() => {
                                const eta = new Date(new Date(req.acceptedAt).getTime() + req.etaMinutes! * 60000);
                                return `Expected by ${eta.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
                              })()
                            : `~${req.etaMinutes} min estimated`}
                        </p>
                      )}
                      {req.status === "DECLINED" && req.staffComment && (
                        <p className={`mt-1 text-[11px] italic ${hasHero ? "text-red-300" : "text-red-600"}`}>
                          {T("declinedReason")}: {req.staffComment}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* My Bookings tracker */}
            {!selectedCat && !selectedItem && bookings.length > 0 && (
              <div className={`rounded-xl overflow-hidden ${hasHero ? "bg-black/65 backdrop-blur-sm border border-white/10" : "glass"}`}>
                <div className={`px-4 py-3 border-b ${hasHero ? "border-white/10" : "border-stone-100"}`}>
                  <p className={`text-xs font-medium tracking-wider ${hasHero ? "text-white/50" : "text-stone-400"}`}>{T("myBookings")}</p>
                </div>
                <div className={`divide-y ${hasHero ? "divide-white/10" : "divide-stone-100"}`}>
                  {bookings.map(b => (
                    <div key={b.id} className="px-4 py-3 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className={`text-sm font-semibold ${hasHero ? "text-white" : "text-stone-800"}`}>{b.itemName}</p>
                        <p className={`text-xs mt-0.5 ${hasHero ? "text-white/40" : "text-stone-400"}`}>{b.slotTime} · {b.guestCount} {b.guestCount !== 1 ? T("guests") : T("guest")}</p>
                      </div>
                      <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border shrink-0
                        ${hasHero
                          ? b.status === "CONFIRMED" ? "border-green-400/50 text-green-300"
                          : b.status === "CANCELLED" ? "border-white/20 text-white/40"
                          : "border-amber-400/50 text-amber-300"
                          : b.status === "CONFIRMED" ? "bg-green-100 text-green-800 border-green-200"
                          : b.status === "CANCELLED" ? "bg-stone-100 text-stone-500 border-stone-200"
                          : "bg-amber-100 text-amber-800 border-amber-200"}`}>
                        {b.status === "CONFIRMED" ? T("confirmed") : b.status === "CANCELLED" ? T("cancelled") : T("pending")}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Step 1: Category selection */}
            {!selectedCat && !selectedItem && (
              <>
                <p className={`text-sm font-medium pt-1 ${hasHero ? "text-white/80" : "text-stone-500"}`}>{T("selectCategory")}</p>
                <div className="grid grid-cols-2 gap-3">
                  {room!.menu.map(cat => (
                    <button
                      key={cat.id}
                      onClick={() => setSelectedCat(cat)}
                      className={`relative rounded-2xl px-4 py-3 text-left transition-all overflow-hidden min-h-[100px] flex flex-col justify-between
                        ${hasHero
                          ? "bg-black/55 border-2 border-white/40 hover:bg-black/45 hover:shadow-xl backdrop-blur-sm"
                          : "glass border border-stone-200/60 dark:border-zinc-700/60 hover:border-brand-700 hover:shadow-md"}`}
                    >
                      {!CATEGORY_IMAGE[cat.icon] && (
                        <span className="text-2xl leading-none">
                          {CATEGORY_EMOJI[cat.icon] ?? "🛎️"}
                        </span>
                      )}
                      <div>
                        <p className={`font-bold text-sm leading-tight ${hasHero ? "text-white" : "text-stone-900 dark:text-zinc-100"}`}>
                          {lang === "am" && cat.nameAm ? cat.nameAm : cat.name}
                        </p>
                        <p className={`text-xs mt-0.5 ${hasHero ? "text-white/50" : "text-stone-400 dark:text-zinc-500"}`}>
                          {cat.items.length} {cat.items.length === 1 ? T("option") : T("options")}
                        </p>
                      </div>
                      {CATEGORY_IMAGE[cat.icon] && (
                        <img
                          src={CATEGORY_IMAGE[cat.icon]}
                          alt=""
                          className="absolute bottom-0 right-0 h-20 w-20 object-contain pointer-events-none select-none drop-shadow-lg"
                        />
                      )}
                    </button>
                  ))}
                </div>
              </>
            )}

            {/* Step 2: Item selection */}
            {selectedCat && !selectedItem && (
              <>
                <button
                  onClick={() => setSelectedCat(null)}
                  className={`flex items-center gap-1 text-sm font-semibold pt-2 w-fit rounded px-2 py-1 ${hasHero ? "bg-black/40 text-white backdrop-blur-sm" : "text-brand-700"}`}
                >
                  <ChevronLeft className="h-4 w-4" /> {T("back")}
                </button>
                <h2 className={`font-bold text-lg ${hasHero ? "text-white drop-shadow" : "text-stone-900"}`}>{lang === "am" && selectedCat.nameAm ? selectedCat.nameAm : selectedCat.name}</h2>
                <div className="flex flex-col gap-2.5">
                  {selectedCat.items.map(item => (
                    <button
                      key={item.id}
                      onClick={() => selectItem(item)}
                      className={`w-full px-4 py-4 text-left flex items-center justify-between gap-3 rounded-2xl transition-all
                        ${hasHero
                          ? "bg-black/50 border-2 border-white/30 hover:bg-black/40 hover:border-white/45 backdrop-blur-sm"
                          : "glass border border-stone-200/60 hover:border-brand-700 hover:shadow-md"}`}
                    >
                      <div className="min-w-0">
                        <p className={`font-semibold text-sm ${hasHero ? "text-white" : "text-stone-800"}`}>{lang === "am" && item.nameAm ? item.nameAm : item.name}</p>
                        {item.description && (
                          <p className={`text-xs mt-0.5 truncate ${hasHero ? "text-white/50" : "text-stone-400"}`}>{item.description}</p>
                        )}
                      </div>
                      <ChevronRight className={`h-4 w-4 shrink-0 ${hasHero ? "text-amber-400/80" : "text-stone-300"}`} />
                    </button>
                  ))}
                </div>
              </>
            )}

            {/* Step 3a: Slot picker (schedulable items) */}
            {selectedItem && selectedItem.schedulable && (
              <>
                <button onClick={() => { setSelectedItem(null); setSlots([]); setSelectedSlot(null); }}
                  className={`flex items-center gap-1 text-sm font-semibold pt-2 w-fit rounded px-2 py-1 ${hasHero ? "bg-black/40 text-white backdrop-blur-sm" : "text-brand-700"}`}>
                  <ChevronLeft className="h-4 w-4" /> {T("back")}
                </button>

                <div className={`rounded p-5 space-y-4 ${hasHero ? "bg-black/65 backdrop-blur-sm border border-white/10" : "glass"}`}>
                  <div>
                    <p className="text-xs text-stone-400 uppercase tracking-wider font-semibold">{lang === "am" && selectedCat!.nameAm ? selectedCat!.nameAm : selectedCat!.name}</p>
                    <h2 className="font-bold text-stone-900 text-lg">{lang === "am" && selectedItem.nameAm ? selectedItem.nameAm : selectedItem.name}</h2>
                    <p className="text-xs text-stone-400 mt-0.5">{lang === "am" ? `በእያንዳንዱ ${selectedItem.slotIntervalMins} ደቂቃ · ${T("upTo")} ${selectedItem.capacity} ${T("guests")}` : `Every ${selectedItem.slotIntervalMins} min · up to ${selectedItem.capacity} people per slot`}</p>
                  </div>

                  {/* Date picker */}
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-stone-500 mb-2">{T("selectDate")}</p>
                    <div className="flex gap-2">
                      {[todayStr, tomorrowStr].map(d => (
                        <button key={d} onClick={() => { setSlotDate(d); fetchSlots(selectedItem.id, d); setSelectedSlot(null); }}
                          className={`flex-1 py-2 rounded border text-sm font-semibold transition-colors
                            ${slotDate === d ? "bg-brand-700 text-white border-brand-700" : "border-stone-200 text-stone-600 hover:border-brand-400"}`}>
                          {d === todayStr ? T("today") : T("tomorrow")}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Slot grid */}
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-stone-500 mb-2">{T("availableTimes")}</p>
                    {slotsLoading ? (
                      <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-brand-700" /></div>
                    ) : (
                      <div className="grid grid-cols-4 gap-1.5">
                        {slots.filter(s => !s.past || slotDate !== todayStr).map(slot => (
                          <button key={slot.dateTime}
                            disabled={!slot.available}
                            onClick={() => { setSelectedSlot(slot); setGuestCount(1); }}
                            className={`py-2 px-1 rounded border text-xs font-semibold transition-colors text-center
                              ${!slot.available ? "border-stone-100 text-stone-300 bg-stone-50 cursor-not-allowed" :
                                selectedSlot?.dateTime === slot.dateTime ? "bg-brand-700 text-white border-brand-700" :
                                "border-stone-200 text-stone-700 hover:border-brand-400"}`}>
                            <p>{slot.time}</p>
                            {slot.available && (
                              <p className="text-[10px] opacity-70">{slot.remaining} {T("left")}</p>
                            )}
                            {!slot.available && !slot.past && (
                              <p className="text-[10px]">{T("full")}</p>
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Guest count + notes + book */}
                  {selectedSlot && (
                    <>
                      <div>
                        <p className={`text-xs font-medium tracking-wider mb-2 ${hasHero ? "text-white/50" : "text-stone-400"}`}>{T("numberOfGuests")}</p>
                        <div className="flex items-center gap-4">
                          <button onClick={() => setGuestCount(n => Math.max(1, n - 1))} disabled={guestCount <= 1}
                            className={`w-8 h-8 rounded-full border flex items-center justify-center transition-colors disabled:opacity-30
                              ${hasHero
                                ? "border-white/30 text-white/70 hover:border-white hover:text-white"
                                : "border-stone-200 text-stone-600 hover:border-brand-700 hover:text-brand-700"}`}>
                            <Minus className="h-3.5 w-3.5" />
                          </button>
                          <span className={`text-2xl font-bold w-8 text-center ${hasHero ? "text-white" : "text-stone-900"}`}>{guestCount}</span>
                          <button onClick={() => setGuestCount(n => Math.min(selectedSlot.remaining, n + 1))}
                            disabled={guestCount >= selectedSlot.remaining}
                            className={`w-8 h-8 rounded-full border flex items-center justify-center transition-colors disabled:opacity-30
                              ${hasHero
                                ? "border-white/30 text-white/70 hover:border-white hover:text-white"
                                : "border-stone-200 text-stone-600 hover:border-brand-700 hover:text-brand-700"}`}>
                            <Plus className="h-3.5 w-3.5" />
                          </button>
                          <span className={`text-xs ${hasHero ? "text-white/40" : "text-stone-400"}`}>{selectedSlot.remaining} {T("available")}</span>
                        </div>
                      </div>

                      <div>
                        <button onClick={() => setShowNotes(v => !v)}
                          className={`flex items-center gap-1.5 text-xs font-medium transition-colors
                            ${hasHero ? "text-white/50 hover:text-white" : "text-stone-400 hover:text-brand-700"}`}>
                          <ChevronDown className={`h-3.5 w-3.5 transition-transform ${showNotes ? "rotate-180" : ""}`} />
                          {T("addInstructions")}
                        </button>
                        {showNotes && (
                          <textarea value={notes} onChange={e => setNotes(e.target.value)}
                            placeholder={T("instructionsHint")} rows={2} autoFocus
                            className={`mt-2 w-full rounded px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2
                              ${hasHero
                                ? "bg-white/10 border border-white/15 text-white placeholder:text-white/30 focus:ring-white/30"
                                : "border border-stone-200 bg-white focus:ring-brand-700"}`} />
                        )}
                      </div>

                      <div className={`rounded-xl px-4 py-3 ${hasHero ? "bg-white/10 border border-white/15" : "bg-brand-50 border border-brand-200"}`}>
                        <p className={`text-sm font-semibold ${hasHero ? "text-white" : "text-stone-800"}`}>
                          {lang === "am" && selectedItem.nameAm ? selectedItem.nameAm : selectedItem.name} · {slotDate === todayStr ? T("today") : T("tomorrow")} {T("at")} {selectedSlot.time}
                        </p>
                        <p className={`text-xs mt-0.5 ${hasHero ? "text-white/50" : "text-stone-500"}`}>{guestCount} {guestCount !== 1 ? T("guests") : T("guest")}</p>
                      </div>

                      <button onClick={bookSlot} disabled={booking}
                        className={`w-full h-10 rounded font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50 transition-colors
                          ${hasHero
                            ? "bg-white text-stone-900 hover:bg-white/90"
                            : "bg-brand-700 text-white hover:bg-brand-800"}`}>
                        {booking ? <Loader2 className="h-4 w-4 animate-spin" /> : <>{T("confirmBooking")}</>}
                      </button>
                    </>
                  )}
                </div>
              </>
            )}

            {/* Step 3b: Quantity + Add to Cart (regular items) */}
            {selectedItem && !selectedItem.schedulable && (
              <>
                <button
                  onClick={() => setSelectedItem(null)}
                  className={`flex items-center gap-1 text-sm font-semibold pt-2 w-fit rounded px-2 py-1 ${hasHero ? "bg-black/40 text-white backdrop-blur-sm" : "text-brand-700"}`}
                >
                  <ChevronLeft className="h-4 w-4" /> {T("back")}
                </button>

                <div className={`rounded-xl p-4 space-y-4 ${hasHero ? "bg-black/65 backdrop-blur-sm border border-white/10" : "glass"}`}>
                  {/* Title */}
                  <div>
                    <p className={`text-xs font-medium tracking-wider ${hasHero ? "text-white/50" : "text-stone-400"}`}>
                      {lang === "am" && selectedCat!.nameAm ? selectedCat!.nameAm : selectedCat!.name}
                    </p>
                    <h2 className={`font-bold text-lg leading-tight mt-0.5 ${hasHero ? "text-white" : "text-stone-900"}`}>
                      {lang === "am" && selectedItem.nameAm ? selectedItem.nameAm : selectedItem.name}
                    </h2>
                  </div>

                  {/* Quantity stepper */}
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setQuantity(q => Math.max(1, q - 1))}
                      disabled={quantity <= 1}
                      className={`w-8 h-8 rounded-full flex items-center justify-center border transition-colors disabled:opacity-30
                        ${hasHero ? "border-white/30 text-white hover:bg-white/15" : "border-stone-200 text-stone-600 hover:border-brand-700 hover:text-brand-700"}`}
                    >
                      <Minus className="h-3.5 w-3.5" />
                    </button>
                    <span className={`text-xl font-bold w-6 text-center ${hasHero ? "text-white" : "text-stone-900"}`}>{quantity}</span>
                    <button
                      onClick={() => setQuantity(q => Math.min(selectedItem.maxQuantity, q + 1))}
                      disabled={quantity >= selectedItem.maxQuantity}
                      className={`w-8 h-8 rounded-full flex items-center justify-center border transition-colors disabled:opacity-30
                        ${hasHero ? "border-white/30 text-white hover:bg-white/15" : "border-stone-200 text-stone-600 hover:border-brand-700 hover:text-brand-700"}`}
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                    {selectedItem.maxQuantity > 1 && (
                      <span className={`text-xs ${hasHero ? "text-white/40" : "text-stone-400"}`}>{T("max")} {selectedItem.maxQuantity}</span>
                    )}
                  </div>

                  {/* Optional notes */}
                  <div>
                    <button
                      onClick={() => setShowNotes(v => !v)}
                      className={`flex items-center gap-1.5 text-xs font-medium transition-colors
                        ${hasHero ? "text-white/50 hover:text-white/80" : "text-stone-400 hover:text-brand-700"}`}
                    >
                      <ChevronDown className={`h-3.5 w-3.5 transition-transform ${showNotes ? "rotate-180" : ""}`} />
                      {T("addInstructions")}
                    </button>
                    {showNotes && (
                      <textarea
                        value={notes}
                        onChange={e => setNotes(e.target.value)}
                        placeholder={T("instructionsHint")}
                        rows={2}
                        autoFocus
                        className={`mt-2 w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-700 resize-none
                          ${hasHero ? "bg-white/10 border-white/20 text-white placeholder:text-white/40" : "bg-white border-stone-200"}`}
                      />
                    )}
                  </div>

                  <button
                    onClick={addToCart}
                    className={`w-full h-10 rounded-lg font-bold text-sm transition-colors flex items-center justify-center gap-2
                      ${hasHero
                        ? "bg-white text-stone-900 hover:bg-white/90"
                        : "bg-brand-700 text-white hover:bg-brand-800"}`}
                  >
                    <ShoppingCart className="h-4 w-4" /> {T("addToCart")}
                  </button>
                </div>
              </>
            )}
          </>
        )}
      </div>

      {/* ── Sticky cart bar (visible whenever cart has items) ── */}
      {cart.length > 0 && !showCart && (
        <div className={`fixed bottom-0 left-0 right-0 shadow-2xl px-4 py-3
          ${hasHero ? "bg-black/70 backdrop-blur-md border-t border-white/10" : "bg-white/90 backdrop-blur-md border-t border-stone-200"}`}>
          <div className="max-w-lg mx-auto flex items-center gap-3">
            <button
              onClick={() => setShowCart(true)}
              className={`flex-1 flex items-center gap-3 rounded-lg px-4 py-2.5 transition-colors text-left
                ${hasHero ? "bg-white/10 hover:bg-white/15 border border-white/10" : "bg-stone-50 border border-stone-200 hover:border-brand-700"}`}
            >
              <div className="relative">
                <ShoppingCart className={`h-5 w-5 ${hasHero ? "text-white" : "text-brand-700"}`} />
                <span className="absolute -top-2 -right-2 bg-brand-700 text-white text-[10px] font-bold
                  rounded-full w-4 h-4 flex items-center justify-center leading-none">
                  {cart.length}
                </span>
              </div>
              <div>
                <p className={`text-xs font-bold ${hasHero ? "text-white" : "text-stone-800"}`}>
                  {cart.length} {cart.length === 1 ? T("cartItem") : T("cartItems")}
                </p>
                <p className={`text-[11px] ${hasHero ? "text-white/50" : "text-stone-400"}`}>{T("viewCart")}</p>
              </div>
            </button>
            <button
              onClick={sendAll}
              disabled={sending}
              className={`h-10 px-5 rounded-lg font-bold text-sm transition-colors flex items-center gap-2 disabled:opacity-50 shrink-0
                ${hasHero ? "bg-white text-stone-900 hover:bg-white/90" : "bg-brand-700 text-white hover:bg-brand-800"}`}
            >
              {sending
                ? <Loader2 className="h-4 w-4 animate-spin" />
                : <><Send className="h-4 w-4" /> {T("sendAll")}</>}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
