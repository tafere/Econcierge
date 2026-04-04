import { useEffect, useState, useCallback } from "react";
import { useParams } from "wouter";
import {
  Loader2, ConciergeBell, CheckCircle2, ChevronRight, ChevronLeft,
  Minus, Plus, ChevronDown, Clock, RefreshCw,
} from "lucide-react";
import { tr, getLang, setLang, type Lang } from "@/lib/i18n";

// ─── Types ────────────────────────────────────────────────────────────────────

interface MenuItem {
  id: number;
  name: string;
  description: string;
  maxQuantity: number;
}

interface MenuCategory {
  id: number;
  name: string;
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
  menu: MenuCategory[];
}

interface TrackedRequest {
  id: number;
  itemName: string;
  categoryName: string;
  quantity: number;
  submittedAt: string;   // ISO string
  status: "PENDING" | "IN_PROGRESS" | "DONE";
}

// ─── Persistence helpers ──────────────────────────────────────────────────────

const today = () => new Date().toISOString().slice(0, 10);  // YYYY-MM-DD

function storageKey(qrToken: string) {
  return `eco_req_${qrToken}_${today()}`;
}

function loadTracked(qrToken: string): TrackedRequest[] {
  try {
    return JSON.parse(localStorage.getItem(storageKey(qrToken)) ?? "[]");
  } catch { return []; }
}

function saveTracked(qrToken: string, reqs: TrackedRequest[]) {
  localStorage.setItem(storageKey(qrToken), JSON.stringify(reqs));
}

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORY_EMOJI: Record<string, string> = {
  broom:            "🧹",
  sparkles:         "✨",
  soap:             "🧴",
  utensils:         "🍽️",
  wrench:           "🔧",
  "concierge-bell": "🛎️",
};

const STATUS_STYLE: Record<string, string> = {
  PENDING:     "bg-amber-100 text-amber-800 border-amber-200",
  IN_PROGRESS: "bg-blue-100  text-blue-800  border-blue-200",
  DONE:        "bg-green-100 text-green-800 border-green-200",
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

  // form
  const [quantity, setQuantity]   = useState(1);
  const [notes, setNotes]         = useState("");
  const [showNotes, setShowNotes] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // request tracker
  const [tracked, setTracked] = useState<TrackedRequest[]>([]);

  // ── Language toggle ──────────────────────────────────────────────────────
  const toggleLang = () => {
    const next: Lang = lang === "en" ? "am" : "en";
    setLang(next);
    setLangState(next);
  };
  const T = (key: string) => tr(lang, key);

  // ── Load room + restore tracked requests ────────────────────────────────
  useEffect(() => {
    fetch(`/api/guest/room/${token}`)
      .then(r => r.ok ? r.json() : Promise.reject())
      .then((data: RoomInfo) => {
        setRoom(data);
        setTracked(loadTracked(token));
      })
      .catch(() => setError(T("invalidQr")))
      .finally(() => setLoading(false));
  }, [token]);

  // ── Poll statuses every 15 s if there are non-DONE requests ─────────────
  const pollStatuses = useCallback(async () => {
    const pending = tracked.filter(r => r.status !== "DONE");
    if (pending.length === 0) return;
    const ids = pending.map(r => r.id).join(",");
    const res = await fetch(`/api/guest/requests/status?ids=${ids}`);
    if (!res.ok) return;
    const updates: { id: number; status: TrackedRequest["status"] }[] = await res.json();
    setTracked(prev => {
      const map = Object.fromEntries(updates.map(u => [u.id, u.status]));
      const next = prev.map(r => map[r.id] ? { ...r, status: map[r.id] } : r);
      saveTracked(token, next);
      return next;
    });
  }, [tracked, token]);

  useEffect(() => {
    const interval = setInterval(pollStatuses, 15_000);
    return () => clearInterval(interval);
  }, [pollStatuses]);

  // ── Submit ───────────────────────────────────────────────────────────────
  const selectItem = (item: MenuItem) => {
    setSelectedItem(item);
    setQuantity(1);
    setNotes("");
    setShowNotes(false);
  };

  const submit = async () => {
    if (!room || !selectedItem) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/guest/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomId: room.roomId,
          itemId: selectedItem.id,
          quantity,
          notes: notes.trim() || null,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        const newReq: TrackedRequest = {
          id:           data.id,
          itemName:     selectedItem.name,
          categoryName: selectedCat!.name,
          quantity,
          submittedAt:  new Date().toISOString(),
          status:       "PENDING",
        };
        setTracked(prev => {
          const next = [newReq, ...prev];
          saveTracked(token, next);
          return next;
        });
        // back to category screen
        setSelectedItem(null);
        setSelectedCat(null);
      }
    } finally {
      setSubmitting(false);
    }
  };

  // ── Helpers ──────────────────────────────────────────────────────────────
  const timeAgo = (iso: string) => {
    const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
    if (diff < 1) return lang === "am" ? "አሁን ልክ" : "just now";
    return lang === "am" ? `${diff} ደቂቃ በፊት` : `${diff}m ago`;
  };

  const statusLabel = (s: string) =>
    s === "PENDING" ? T("pending") : s === "IN_PROGRESS" ? T("inProgress") : T("done");

  // ── Render ───────────────────────────────────────────────────────────────
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-amber-50">
      <Loader2 className="h-8 w-8 animate-spin text-brand-700" />
    </div>
  );

  if (error) return (
    <div className="min-h-screen flex items-center justify-center bg-amber-50 p-6">
      <div className="text-center max-w-xs">
        <ConciergeBell className="h-12 w-12 text-stone-300 mx-auto mb-4" />
        <p className="text-stone-600 text-sm">{error}</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-amber-50">

      {/* Header */}
      <div className="bg-brand-700 text-white px-4 py-5">
        <div className="flex items-center justify-between max-w-lg mx-auto">
          <div className="flex items-center gap-3 min-w-0">
            {room!.logoUrl ? (
              <img src={room!.logoUrl} alt={room!.hotelName} className="h-9 w-9 rounded-lg object-cover shrink-0" />
            ) : (
              <ConciergeBell className="h-6 w-6 shrink-0" />
            )}
            <div className="min-w-0">
              <p className="text-xs text-amber-200 font-medium truncate">
                {room!.hotelName || "Econcierge"} · {T("room")} {room!.roomNumber}
              </p>
              <h1 className="font-bold text-lg leading-tight">
                {room!.tagline || T("howCanWeHelp")}
              </h1>
            </div>
          </div>
          {/* Language toggle */}
          <button
            onClick={toggleLang}
            className="text-xs font-bold bg-brand-800 hover:bg-brand-900 transition-colors
              rounded-full px-3 py-1.5 text-amber-100"
          >
            {lang === "en" ? "አማርኛ" : "EN"}
          </button>
        </div>
      </div>

      <div className="max-w-lg mx-auto p-4 space-y-4">

        {/* ── My Requests tracker (visible on main screen) ── */}
        {!selectedCat && !selectedItem && tracked.length > 0 && (
          <div className="bg-white rounded-xl border border-stone-100 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-stone-50">
              <p className="text-xs font-bold uppercase tracking-wider text-stone-500">{T("myRequests")}</p>
              <button onClick={pollStatuses} className="text-stone-300 hover:text-brand-700 transition-colors">
                <RefreshCw className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="divide-y divide-stone-50">
              {tracked.map(req => (
                <div key={req.id} className="px-4 py-3 flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-semibold text-stone-800 truncate">{req.itemName}</p>
                      {req.quantity > 1 && (
                        <span className="text-xs font-bold text-brand-700">×{req.quantity}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-stone-400">
                      <Clock className="h-3 w-3" />
                      {timeAgo(req.submittedAt)}
                    </div>
                  </div>
                  <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border shrink-0 ${STATUS_STYLE[req.status]}`}>
                    {statusLabel(req.status)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Step 1: Category selection ── */}
        {!selectedCat && !selectedItem && (
          <>
            <p className="text-sm text-stone-500 font-medium pt-1">{T("selectCategory")}</p>
            <div className="grid grid-cols-2 gap-3">
              {room!.menu.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCat(cat)}
                  className="bg-white rounded-xl p-5 text-left shadow-sm border border-stone-100
                    hover:border-brand-700 hover:shadow-md transition-all active:scale-95"
                >
                  <p className="text-2xl mb-2">{CATEGORY_EMOJI[cat.icon] ?? "🛎️"}</p>
                  <p className="font-semibold text-stone-800 text-sm">{cat.name}</p>
                  <p className="text-xs text-stone-400 mt-0.5">{cat.items.length} {T("options")}</p>
                </button>
              ))}
            </div>
          </>
        )}

        {/* ── Step 2: Item selection ── */}
        {selectedCat && !selectedItem && (
          <>
            <button
              onClick={() => setSelectedCat(null)}
              className="flex items-center gap-1 text-sm text-brand-700 font-semibold pt-2"
            >
              <ChevronLeft className="h-4 w-4" /> {T("back")}
            </button>
            <h2 className="font-bold text-stone-900">{selectedCat.name}</h2>
            <div className="space-y-2">
              {selectedCat.items.map(item => (
                <button
                  key={item.id}
                  onClick={() => selectItem(item)}
                  className="w-full bg-white rounded-xl px-4 py-4 text-left shadow-sm border border-stone-100
                    hover:border-brand-700 hover:shadow-md transition-all flex items-center justify-between"
                >
                  <div>
                    <p className="font-semibold text-stone-800 text-sm">{item.name}</p>
                    {item.description && (
                      <p className="text-xs text-stone-400 mt-0.5">{item.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {item.maxQuantity > 1 && (
                      <span className="text-xs text-stone-400">{T("upTo")} {item.maxQuantity}</span>
                    )}
                    <ChevronRight className="h-4 w-4 text-stone-300" />
                  </div>
                </button>
              ))}
            </div>
          </>
        )}

        {/* ── Step 3: Quantity + confirm ── */}
        {selectedItem && (
          <>
            <button
              onClick={() => setSelectedItem(null)}
              className="flex items-center gap-1 text-sm text-brand-700 font-semibold pt-2"
            >
              <ChevronLeft className="h-4 w-4" /> {T("back")}
            </button>

            <div className="bg-white rounded-xl p-5 shadow-sm border border-stone-100 space-y-5">
              <div>
                <p className="text-xs text-stone-400 uppercase tracking-wider font-semibold">{selectedCat!.name}</p>
                <h2 className="font-bold text-stone-900 text-lg">{selectedItem.name}</h2>
              </div>

              {/* Quantity stepper */}
              {selectedItem.maxQuantity > 1 && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-stone-500 mb-3">{T("quantity")}</p>
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => setQuantity(q => Math.max(1, q - 1))}
                      disabled={quantity <= 1}
                      className="w-10 h-10 rounded-full border-2 border-stone-200 flex items-center justify-center
                        text-stone-600 hover:border-brand-700 hover:text-brand-700 transition-colors
                        disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <span className="text-2xl font-bold text-stone-900 w-8 text-center">{quantity}</span>
                    <button
                      onClick={() => setQuantity(q => Math.min(selectedItem.maxQuantity, q + 1))}
                      disabled={quantity >= selectedItem.maxQuantity}
                      className="w-10 h-10 rounded-full border-2 border-stone-200 flex items-center justify-center
                        text-stone-600 hover:border-brand-700 hover:text-brand-700 transition-colors
                        disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                    <span className="text-xs text-stone-400 ml-1">{T("max")} {selectedItem.maxQuantity}</span>
                  </div>
                </div>
              )}

              {/* Optional notes */}
              <div>
                <button
                  onClick={() => setShowNotes(v => !v)}
                  className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-stone-400
                    hover:text-brand-700 transition-colors"
                >
                  <ChevronDown className={`h-3.5 w-3.5 transition-transform ${showNotes ? "rotate-180" : ""}`} />
                  {T("addInstructions")}
                </button>
                {showNotes && (
                  <textarea
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    placeholder={T("instructionsHint")}
                    rows={3}
                    autoFocus
                    className="mt-2 w-full border border-stone-200 rounded-lg px-3 py-2 text-sm
                      focus:outline-none focus:ring-2 focus:ring-brand-700 resize-none"
                  />
                )}
              </div>

              <button
                onClick={submit}
                disabled={submitting}
                className="w-full h-12 bg-brand-700 text-white rounded-xl font-bold text-sm
                  hover:bg-brand-800 transition-colors flex items-center justify-center gap-2
                  disabled:opacity-50"
              >
                {submitting
                  ? <><Loader2 className="h-4 w-4 animate-spin" /> {T("sending")}</>
                  : T("sendRequest")}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
