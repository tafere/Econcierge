import { useEffect, useState } from "react";
import { useParams } from "wouter";
import { Loader2, ConciergeBell, CheckCircle2, ChevronRight, ChevronLeft, Minus, Plus, ChevronDown } from "lucide-react";

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
  menu: MenuCategory[];
}

const CATEGORY_EMOJI: Record<string, string> = {
  broom:          "🧹",
  sparkles:       "✨",
  soap:           "🧴",
  utensils:       "🍽️",
  wrench:         "🔧",
  "concierge-bell": "🛎️",
};

export default function GuestPage() {
  const { token } = useParams<{ token: string }>();
  const [room, setRoom]               = useState<RoomInfo | null>(null);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState<string | null>(null);
  const [selectedCat, setSelectedCat] = useState<MenuCategory | null>(null);
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [quantity, setQuantity]       = useState(1);
  const [notes, setNotes]             = useState("");
  const [showNotes, setShowNotes]     = useState(false);
  const [submitting, setSubmitting]   = useState(false);
  const [submitted, setSubmitted]     = useState(false);

  useEffect(() => {
    fetch(`/api/guest/room/${token}`)
      .then(r => r.ok ? r.json() : Promise.reject("Room not found"))
      .then(setRoom)
      .catch(() => setError("This QR code is invalid or has been disabled. Please contact the front desk."))
      .finally(() => setLoading(false));
  }, [token]);

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
      await fetch("/api/guest/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomId: room.roomId,
          itemId: selectedItem.id,
          quantity,
          notes: notes.trim() || null,
        }),
      });
      setSubmitted(true);
    } finally {
      setSubmitting(false);
    }
  };

  const reset = () => {
    setSubmitted(false);
    setSelectedCat(null);
    setSelectedItem(null);
    setQuantity(1);
    setNotes("");
    setShowNotes(false);
  };

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

  if (submitted) return (
    <div className="min-h-screen flex items-center justify-center bg-amber-50 p-6">
      <div className="text-center max-w-xs">
        <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-stone-900 mb-2">Request Received!</h2>
        <p className="text-stone-500 text-sm mb-6">
          Our team will assist you shortly. Thank you for your patience.
        </p>
        <button onClick={reset} className="text-brand-700 font-semibold text-sm underline underline-offset-2">
          Make another request
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-amber-50">
      {/* Header */}
      <div className="bg-brand-700 text-white px-4 py-5">
        <div className="flex items-center gap-3 max-w-lg mx-auto">
          <ConciergeBell className="h-6 w-6" />
          <div>
            <p className="text-xs text-amber-200 font-medium">Room {room!.roomNumber}</p>
            <h1 className="font-bold text-lg leading-tight">How can we help you?</h1>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto p-4 space-y-4">

        {/* Step 1: Category selection */}
        {!selectedCat && (
          <>
            <p className="text-sm text-stone-500 font-medium pt-2">Select a category</p>
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
                  <p className="text-xs text-stone-400 mt-0.5">{cat.items.length} options</p>
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
              className="flex items-center gap-1 text-sm text-brand-700 font-semibold pt-2"
            >
              <ChevronLeft className="h-4 w-4" /> Back
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
                      <span className="text-xs text-stone-400">up to {item.maxQuantity}</span>
                    )}
                    <ChevronRight className="h-4 w-4 text-stone-300" />
                  </div>
                </button>
              ))}
            </div>
          </>
        )}

        {/* Step 3: Quantity + confirm */}
        {selectedItem && (
          <>
            <button
              onClick={() => setSelectedItem(null)}
              className="flex items-center gap-1 text-sm text-brand-700 font-semibold pt-2"
            >
              <ChevronLeft className="h-4 w-4" /> Back
            </button>

            <div className="bg-white rounded-xl p-5 shadow-sm border border-stone-100 space-y-5">
              {/* Item title */}
              <div>
                <p className="text-xs text-stone-400 uppercase tracking-wider font-semibold">{selectedCat!.name}</p>
                <h2 className="font-bold text-stone-900 text-lg">{selectedItem.name}</h2>
              </div>

              {/* Quantity stepper — only shown if max > 1 */}
              {selectedItem.maxQuantity > 1 && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-stone-500 mb-3">Quantity</p>
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
                    <span className="text-xs text-stone-400 ml-1">max {selectedItem.maxQuantity}</span>
                  </div>
                </div>
              )}

              {/* Optional notes — collapsed by default */}
              <div>
                <button
                  onClick={() => setShowNotes(v => !v)}
                  className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-stone-400
                    hover:text-brand-700 transition-colors"
                >
                  <ChevronDown className={`h-3.5 w-3.5 transition-transform ${showNotes ? "rotate-180" : ""}`} />
                  Add special instructions
                </button>
                {showNotes && (
                  <textarea
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    placeholder="Any special instructions…"
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
                  ? <><Loader2 className="h-4 w-4 animate-spin" /> Sending…</>
                  : "Send Request"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
