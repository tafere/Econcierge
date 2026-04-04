import { useEffect, useState, useRef } from "react";
import { useLocation } from "wouter";
import { getToken } from "@/lib/auth";
import { useAuth } from "@/lib/auth";
import { ConciergeBell, ArrowLeft, Download, Plus, BedDouble, Loader2 } from "lucide-react";
import QRCode from "qrcode";

interface Room {
  id: number;
  roomNumber: string;
  floor: string;
  roomType: string;
  qrToken: string;
  enabled: boolean;
}

export default function RoomsPage() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [rooms, setRooms]   = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newRoom, setNewRoom] = useState({ roomNumber: "", floor: "", roomType: "" });
  const [adding, setAdding]   = useState(false);
  const [error, setError]     = useState<string | null>(null);

  const fetchRooms = async () => {
    const res = await fetch("/api/dashboard/rooms", {
      headers: { Authorization: `Bearer ${getToken()}` },
    });
    if (res.ok) setRooms(await res.json());
    setLoading(false);
  };

  useEffect(() => { fetchRooms(); }, []);

  const addRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdding(true);
    setError(null);
    const res = await fetch("/api/dashboard/rooms", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
      body: JSON.stringify(newRoom),
    });
    if (res.ok) {
      await fetchRooms();
      setShowAdd(false);
      setNewRoom({ roomNumber: "", floor: "", roomType: "" });
    } else {
      const d = await res.json().catch(() => ({}));
      setError(d.error || "Failed to add room");
    }
    setAdding(false);
  };

  const downloadQR = async (room: Room) => {
    const url = `${window.location.origin}/r/${room.qrToken}`;
    const dataUrl = await QRCode.toDataURL(url, { width: 400, margin: 2, color: { dark: "#78350f" } });
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `room-${room.roomNumber}-qr.png`;
    a.click();
  };

  return (
    <div className="min-h-screen bg-stone-50">
      <nav className="bg-brand-700 text-white px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ConciergeBell className="h-5 w-5" />
            <span className="font-bold text-sm">Econcierge</span>
          </div>
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-1.5 text-xs text-amber-200 hover:text-white transition-colors"
          >
            <ArrowLeft className="h-4 w-4" /> Dashboard
          </button>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-stone-900">Rooms & QR Codes</h1>
            <p className="text-sm text-stone-400">{rooms.length} rooms configured</p>
          </div>
          {user?.role === "ADMIN" && (
            <button
              onClick={() => setShowAdd(true)}
              className="flex items-center gap-1.5 bg-brand-700 text-white text-sm font-semibold
                px-4 py-2 rounded-lg hover:bg-brand-800 transition-colors"
            >
              <Plus className="h-4 w-4" /> Add Room
            </button>
          )}
        </div>

        {/* Add room form */}
        {showAdd && (
          <form onSubmit={addRoom} className="bg-white rounded-xl border border-stone-200 p-5 space-y-4">
            <h3 className="font-semibold text-stone-800">New Room</h3>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-semibold text-stone-500 uppercase tracking-wider block mb-1">Room Number *</label>
                <input
                  value={newRoom.roomNumber}
                  onChange={e => setNewRoom(r => ({ ...r, roomNumber: e.target.value }))}
                  required
                  className="w-full h-10 border border-stone-200 rounded-lg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-700"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-stone-500 uppercase tracking-wider block mb-1">Floor</label>
                <input
                  value={newRoom.floor}
                  onChange={e => setNewRoom(r => ({ ...r, floor: e.target.value }))}
                  className="w-full h-10 border border-stone-200 rounded-lg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-700"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-stone-500 uppercase tracking-wider block mb-1">Type</label>
                <input
                  value={newRoom.roomType}
                  onChange={e => setNewRoom(r => ({ ...r, roomType: e.target.value }))}
                  placeholder="Standard, Suite…"
                  className="w-full h-10 border border-stone-200 rounded-lg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-700"
                />
              </div>
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div className="flex gap-2">
              <button type="submit" disabled={adding}
                className="bg-brand-700 text-white text-sm font-semibold px-4 py-2 rounded-lg
                  hover:bg-brand-800 transition-colors flex items-center gap-2 disabled:opacity-50">
                {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Add Room
              </button>
              <button type="button" onClick={() => setShowAdd(false)}
                className="text-sm text-stone-500 px-4 py-2 rounded-lg hover:bg-stone-100 transition-colors">
                Cancel
              </button>
            </div>
          </form>
        )}

        {/* Room list */}
        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-brand-700" /></div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {rooms.map(room => (
              <div key={room.id} className="bg-white rounded-xl border border-stone-100 shadow-sm p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <BedDouble className="h-4 w-4 text-brand-700" />
                      <span className="font-bold text-stone-900">Room {room.roomNumber}</span>
                    </div>
                    <div className="text-xs text-stone-400 mt-0.5 space-x-2">
                      {room.floor && <span>Floor {room.floor}</span>}
                      {room.roomType && <span>· {room.roomType}</span>}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => downloadQR(room)}
                  className="w-full flex items-center justify-center gap-2 text-xs font-semibold
                    text-brand-700 border border-brand-700 rounded-lg py-2
                    hover:bg-brand-50 transition-colors"
                >
                  <Download className="h-3.5 w-3.5" /> Download QR Code
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
