import { useEffect, useState } from "react";
import { useParams } from "wouter";
import { Loader2, ConciergeBell, CheckCircle2, ChevronRight, ChevronLeft } from "lucide-react";

interface MenuItem {
  id: number;
  name: string;
  description: string;
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

export default function GuestPage() {
  const { token } = useParams<{ token: string }>();
  const [room, setRoom]           = useState<RoomInfo | null>(null);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);
  const [selectedCat, setSelectedCat] = useState<MenuCategory | null>(null);
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [notes, setNotes]         = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    fetch(`/api/guest/room/${token}`)
      .then(r => r.ok ? r.json() : Promise.reject("Room not found"))
      .then(setRoom)
      .catch(() => setError("This QR code is invalid or has been disabled. Please contact the front desk."))
      .finally(() => setLoading(false));
  }, [token]);

  const submit = async () => {
    if (!room || !selectedItem) return;
    setSubmitting(true);
    try {
      await fetch("/api/guest/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomId: room.roomId, itemId: selectedItem.id, notes }),
      });
      setSubmitted(true);
    } finally {
      setSubmitting(false);
    }
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
        <button
          onClick={() => { setSubmitted(false); setSelectedCat(null); setSelectedItem(null); setNotes(""); }}
          className="text-brand-700 font-semibold text-sm underline underline-offset-2"
        >
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
                  <p className="text-2xl mb-2">
                    {cat.icon === "sparkles" ? "✨" :
                     cat.icon === "utensils" ? "🍽️" :
                     cat.icon === "wrench" ? "🔧" : "🛎️"}
                  </p>
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
                  onClick={() => setSelectedItem(item)}
                  className="w-full bg-white rounded-xl px-4 py-4 text-left shadow-sm border border-stone-100
                    hover:border-brand-700 hover:shadow-md transition-all flex items-center justify-between"
                >
                  <div>
                    <p className="font-semibold text-stone-800 text-sm">{item.name}</p>
                    {item.description && (
                      <p className="text-xs text-stone-400 mt-0.5">{item.description}</p>
                    )}
                  </div>
                  <ChevronRight className="h-4 w-4 text-stone-300" />
                </button>
              ))}
            </div>
          </>
        )}

        {/* Step 3: Notes + submit */}
        {selectedItem && (
          <>
            <button
              onClick={() => setSelectedItem(null)}
              className="flex items-center gap-1 text-sm text-brand-700 font-semibold pt-2"
            >
              <ChevronLeft className="h-4 w-4" /> Back
            </button>
            <div className="bg-white rounded-xl p-5 shadow-sm border border-stone-100 space-y-4">
              <div>
                <p className="text-xs text-stone-400 uppercase tracking-wider font-semibold">{selectedCat!.name}</p>
                <h2 className="font-bold text-stone-900 text-lg">{selectedItem.name}</h2>
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-stone-500 block mb-1.5">
                  Additional notes (optional)
                </label>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="e.g. Please bring 2 extra towels"
                  rows={3}
                  className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm
                    focus:outline-none focus:ring-2 focus:ring-brand-700 resize-none"
                />
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
