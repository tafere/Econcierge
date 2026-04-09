import { useEffect, useState } from "react";
import { getToken } from "@/lib/auth";
import NavBar from "@/components/NavBar";
import { Loader2, ChevronLeft, ChevronRight, Users, CalendarClock } from "lucide-react";

interface Booking {
  id: number;
  status: "PENDING" | "CONFIRMED" | "CANCELLED";
  slotTime: string;
  slotDate: string;
  guestCount: number;
  notes: string;
  itemName: string;
  roomNumber: string;
  floor: string;
}

const STATUS_STYLE: Record<string, string> = {
  PENDING:   "bg-amber-100  text-amber-800  border-amber-300",
  CONFIRMED: "bg-green-100  text-green-800  border-green-300",
  CANCELLED: "bg-stone-100  text-stone-500  border-stone-300",
};

function fmtDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function displayDate(dateStr: string) {
  const today     = fmtDate(new Date());
  const tomorrow  = fmtDate(new Date(Date.now() + 86_400_000));
  const d = new Date(dateStr + "T00:00:00");
  const label = d.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" });
  if (dateStr === today)    return `Today · ${label}`;
  if (dateStr === tomorrow) return `Tomorrow · ${label}`;
  return label;
}

export default function BookingsPage() {
  const [date, setDate]         = useState(fmtDate(new Date()));
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading]   = useState(true);
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  const authH = () => ({ Authorization: `Bearer ${getToken()}`, "Content-Type": "application/json" });

  const fetchBookings = async (d: string) => {
    setLoading(true);
    const res = await fetch(`/api/dashboard/bookings?date=${d}`, { headers: authH() });
    if (res.ok) setBookings(await res.json());
    setLoading(false);
  };

  useEffect(() => { fetchBookings(date); }, [date]);

  const changeDate = (delta: number) => {
    const d = new Date(date + "T12:00:00");
    d.setDate(d.getDate() + delta);
    setDate(fmtDate(d));
  };

  const updateStatus = async (id: number, status: string) => {
    setUpdatingId(id);
    const res = await fetch(`/api/dashboard/bookings/${id}/status`, {
      method: "PATCH", headers: authH(),
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      setBookings(prev => prev.map(b => b.id === id ? { ...b, status: status as Booking["status"] } : b));
    }
    setUpdatingId(null);
  };

  // Group bookings by time slot
  const grouped: Record<string, Booking[]> = {};
  for (const b of bookings) {
    if (!grouped[b.slotTime]) grouped[b.slotTime] = [];
    grouped[b.slotTime].push(b);
  }
  const sortedTimes = Object.keys(grouped).sort();

  return (
    <div className="min-h-screen">
      <NavBar />

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-5">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-stone-900">Bookings</h1>
            <p className="text-xs text-stone-400">Shuttle, Spa and scheduled reservations</p>
          </div>
        </div>

        {/* Date navigator */}
        <div className="flex items-center gap-3">
          <button onClick={() => changeDate(-1)}
            className="p-2 rounded hover:bg-stone-100 text-stone-500 transition-colors">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <div className="flex-1 text-center">
            <p className="text-sm font-bold text-stone-900">{displayDate(date)}</p>
          </div>
          <button onClick={() => changeDate(1)}
            className="p-2 rounded hover:bg-stone-100 text-stone-500 transition-colors">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-brand-700" />
          </div>
        ) : bookings.length === 0 ? (
          <div className="text-center py-20 glass rounded">
            <CalendarClock className="h-10 w-10 text-stone-200 mx-auto mb-3" />
            <p className="text-stone-400 text-sm">No bookings for this day</p>
          </div>
        ) : (
          <div className="space-y-4">
            {sortedTimes.map(time => (
              <div key={time} className="glass rounded overflow-hidden">
                {/* Time header */}
                <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                  <p className="text-sm font-extrabold text-stone-800">{time}</p>
                  <div className="flex items-center gap-1.5 text-xs text-stone-500">
                    <Users className="h-3.5 w-3.5" />
                    {grouped[time].filter(b => b.status !== "CANCELLED").reduce((s, b) => s + b.guestCount, 0)} guests
                  </div>
                </div>

                {/* Bookings at this time */}
                <div className="divide-y divide-stone-50">
                  {grouped[time].map(b => (
                    <div key={b.id} className={`px-4 py-3 flex items-center gap-3 ${b.status === "CANCELLED" ? "opacity-50" : ""}`}>
                      {/* Room */}
                      <div className="shrink-0 w-14">
                        <p className="font-extrabold text-stone-900 text-sm">{b.roomNumber}</p>
                        {b.floor && <p className="text-[10px] text-stone-400">Floor {b.floor}</p>}
                      </div>

                      {/* Service + guests */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-stone-800">{b.itemName}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <Users className="h-3 w-3 text-stone-400" />
                          <span className="text-xs text-stone-500">{b.guestCount} guest{b.guestCount !== 1 ? "s" : ""}</span>
                          {b.notes && <span className="text-xs text-stone-400 italic truncate">· {b.notes}</span>}
                        </div>
                      </div>

                      {/* Status + actions */}
                      <div className="shrink-0 flex items-center gap-2">
                        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded border ${STATUS_STYLE[b.status]}`}>
                          {b.status === "PENDING" ? "Pending" : b.status === "CONFIRMED" ? "Confirmed" : "Cancelled"}
                        </span>
                        {updatingId === b.id ? (
                          <Loader2 className="h-4 w-4 animate-spin text-stone-400" />
                        ) : b.status === "PENDING" ? (
                          <div className="flex gap-1">
                            <button onClick={() => updateStatus(b.id, "CONFIRMED")}
                              className="text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700
                                rounded px-2.5 py-1 transition-colors">
                              Confirm
                            </button>
                            <button onClick={() => updateStatus(b.id, "CANCELLED")}
                              className="text-xs font-bold text-red-500 border border-red-200 hover:bg-red-50
                                rounded px-2.5 py-1 transition-colors">
                              Cancel
                            </button>
                          </div>
                        ) : b.status === "CONFIRMED" ? (
                          <button onClick={() => updateStatus(b.id, "CANCELLED")}
                            className="text-xs text-stone-400 hover:text-red-500 transition-colors">
                            Cancel
                          </button>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
