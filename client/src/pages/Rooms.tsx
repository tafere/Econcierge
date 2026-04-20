import { useEffect, useState } from "react";
import { getToken } from "@/lib/auth";
import { useAuth } from "@/lib/auth";
import { useLang } from "@/lib/lang";
import { Download, Plus, BedDouble, Loader2, Tv2, QrCode, Printer } from "lucide-react";
import QRCode from "qrcode";
import NavBar from "@/components/NavBar";

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
  const { t } = useLang();
  const [rooms, setRooms]   = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [qrPreviews, setQrPreviews] = useState<Record<number, string>>({});
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

  const printQRCard = async (room: Room) => {
    const url = `${window.location.origin}/r/${room.qrToken}`;
    const dataUrl = await QRCode.toDataURL(url, {
      width: 400, margin: 2,
      color: { dark: "#451a03", light: "#fffbf5" },
      errorCorrectionLevel: "H",
    });
    const hotelName = user?.hotelName ?? "Hotel";
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(`<!DOCTYPE html><html><head><title>QR Card - Room ${room.roomNumber}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800&display=swap');
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: Inter, sans-serif; background: #fff; display: flex; justify-content: center; align-items: center; min-height: 100vh; }
  .card { width: 320px; border: 2px solid #92400e; border-radius: 16px; overflow: hidden; text-align: center; }
  .header { background: #92400e; color: #fff; padding: 20px 16px 14px; }
  .hotel { font-size: 18px; font-weight: 800; letter-spacing: 0.5px; }
  .tagline { font-size: 10px; font-weight: 600; letter-spacing: 3px; text-transform: uppercase; color: #fcd34d; margin-top: 2px; }
  .body { padding: 24px 24px 20px; background: #fffbf5; }
  .room-label { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 2px; color: #92400e; margin-bottom: 4px; }
  .room-number { font-size: 36px; font-weight: 800; color: #1c1917; line-height: 1; }
  .floor { font-size: 12px; color: #78716c; margin-top: 4px; }
  img { width: 200px; height: 200px; margin: 20px auto 0; display: block; }
  .cta { font-size: 12px; font-weight: 600; color: #57534e; margin-top: 14px; }
  .footer { background: #fef3c7; padding: 10px; font-size: 10px; color: #92400e; font-weight: 600; letter-spacing: 1px; text-transform: uppercase; }
  @media print { body { min-height: unset; } }
</style></head><body>
<div class="card">
  <div class="header">
    <div class="hotel">${hotelName}</div>
    <div class="tagline">Econcierge</div>
  </div>
  <div class="body">
    <div class="room-label">Room</div>
    <div class="room-number">${room.roomNumber}</div>
    ${room.floor ? `<div class="floor">Floor ${room.floor}</div>` : ""}
    <img src="${dataUrl}" alt="QR Code" />
    <div class="cta">Scan to request services</div>
  </div>
  <div class="footer">Scan with your phone camera</div>
</div>
<script>window.onload = () => window.print();</script>
</body></html>`);
    win.document.close();
  };

  const printAllQRCards = async () => {
    const hotelName = user?.hotelName ?? "Hotel";
    const cards = await Promise.all(rooms.map(async room => {
      const url = `${window.location.origin}/r/${room.qrToken}`;
      const dataUrl = await QRCode.toDataURL(url, {
        width: 400, margin: 2,
        color: { dark: "#451a03", light: "#fffbf5" },
        errorCorrectionLevel: "H",
      });
      return { room, dataUrl };
    }));

    const cardHtml = cards.map(({ room, dataUrl }) => `
      <div class="card">
        <div class="header">
          <div class="hotel">${hotelName}</div>
          <div class="tagline">Econcierge</div>
        </div>
        <div class="body">
          <div class="room-label">Room</div>
          <div class="room-number">${room.roomNumber}</div>
          ${room.floor ? `<div class="floor">Floor ${room.floor}</div>` : ""}
          <img src="${dataUrl}" alt="QR Code" />
          <div class="cta">Scan to request services</div>
        </div>
        <div class="footer">Scan with your phone camera</div>
      </div>
    `).join("");

    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(`<!DOCTYPE html><html><head><title>QR Cards - ${hotelName}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800&display=swap');
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: Inter, sans-serif; background: #fff; padding: 20px; }
  .grid { display: flex; flex-wrap: wrap; gap: 20px; justify-content: flex-start; }
  .card { width: 240px; border: 2px solid #92400e; border-radius: 12px; overflow: hidden; text-align: center; page-break-inside: avoid; }
  .header { background: #92400e; color: #fff; padding: 14px 12px 10px; }
  .hotel { font-size: 13px; font-weight: 800; letter-spacing: 0.5px; }
  .tagline { font-size: 8px; font-weight: 600; letter-spacing: 3px; text-transform: uppercase; color: #fcd34d; margin-top: 2px; }
  .body { padding: 16px 16px 12px; background: #fffbf5; }
  .room-label { font-size: 9px; font-weight: 600; text-transform: uppercase; letter-spacing: 2px; color: #92400e; margin-bottom: 2px; }
  .room-number { font-size: 28px; font-weight: 800; color: #1c1917; line-height: 1; }
  .floor { font-size: 10px; color: #78716c; margin-top: 2px; }
  img { width: 150px; height: 150px; margin: 12px auto 0; display: block; }
  .cta { font-size: 10px; font-weight: 600; color: #57534e; margin-top: 10px; }
  .footer { background: #fef3c7; padding: 7px; font-size: 8px; color: #92400e; font-weight: 600; letter-spacing: 1px; text-transform: uppercase; }
  @media print { body { padding: 10px; } }
</style></head><body>
<div class="grid">${cardHtml}</div>
<script>window.onload = () => window.print();</script>
</body></html>`);
    win.document.close();
  };

  const toggleQrPreview = async (room: Room) => {
    if (qrPreviews[room.id]) {
      setQrPreviews(prev => { const n = { ...prev }; delete n[room.id]; return n; });
      return;
    }
    const url = `${window.location.origin}/r/${room.qrToken}`;
    const dataUrl = await QRCode.toDataURL(url, {
      width: 240, margin: 2,
      color: { dark: "#451a03", light: "#fffbf5" },
      errorCorrectionLevel: "H",
    });
    setQrPreviews(prev => ({ ...prev, [room.id]: dataUrl }));
  };

  return (
    <div className="min-h-screen">
      <NavBar />

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-stone-900 dark:text-zinc-100">{t("roomsTitle")}</h1>
            <p className="text-sm text-stone-400 dark:text-zinc-500">{rooms.length} {t("roomsConfigured")}</p>
          </div>
          <div className="flex items-center gap-2">
            {rooms.length > 0 && (
              <button
                onClick={printAllQRCards}
                className="flex items-center gap-1.5 bg-white dark:bg-zinc-800 border border-brand-700 text-brand-700
                  text-sm font-semibold px-4 py-2 rounded hover:bg-brand-50 dark:hover:bg-zinc-700 transition-colors"
              >
                <Printer className="h-4 w-4" /> Print All QR Cards
              </button>
            )}
            {user?.roles?.includes("ADMIN") && (
              <button
                onClick={() => setShowAdd(true)}
                className="flex items-center gap-1.5 bg-brand-700 text-white text-sm font-semibold
                  px-4 py-2 rounded hover:bg-brand-800 transition-colors"
              >
                <Plus className="h-4 w-4" /> {t("addRoom")}
              </button>
            )}
          </div>
        </div>

        {/* Add room form */}
        {showAdd && (
          <form onSubmit={addRoom} className="glass rounded p-5 space-y-4">
            <h3 className="font-semibold text-stone-800 dark:text-zinc-200">{t("newRoom")}</h3>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label htmlFor="roomNumber" className="text-xs font-semibold text-stone-500 dark:text-zinc-400 uppercase tracking-wider block mb-1">{t("roomNumber")}</label>
                <input
                  id="roomNumber"
                  value={newRoom.roomNumber}
                  onChange={e => setNewRoom(r => ({ ...r, roomNumber: e.target.value }))}
                  required
                  className="w-full h-10 border border-stone-200 dark:border-zinc-600 bg-white dark:bg-zinc-700 dark:text-zinc-100 rounded px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-700"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-stone-500 dark:text-zinc-400 uppercase tracking-wider block mb-1">{t("floorField")}</label>
                <input
                  value={newRoom.floor}
                  onChange={e => setNewRoom(r => ({ ...r, floor: e.target.value }))}
                  className="w-full h-10 border border-stone-200 dark:border-zinc-600 bg-white dark:bg-zinc-700 dark:text-zinc-100 rounded px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-700"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-stone-500 dark:text-zinc-400 uppercase tracking-wider block mb-1">{t("typeField")}</label>
                <input
                  value={newRoom.roomType}
                  onChange={e => setNewRoom(r => ({ ...r, roomType: e.target.value }))}
                  placeholder={t("roomTypePlaceholder")}
                  className="w-full h-10 border border-stone-200 dark:border-zinc-600 bg-white dark:bg-zinc-700 dark:text-zinc-100 rounded px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-700"
                />
              </div>
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div className="flex gap-2">
              <button type="submit" disabled={adding}
                className="bg-brand-700 text-white text-sm font-semibold px-4 py-2 rounded
                  hover:bg-brand-800 transition-colors flex items-center gap-2 disabled:opacity-50">
                {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : null} {t("addRoom")}
              </button>
              <button type="button" onClick={() => setShowAdd(false)}
                className="text-sm text-stone-500 dark:text-zinc-400 px-4 py-2 rounded hover:bg-stone-100 dark:hover:bg-zinc-700 transition-colors">
                {t("cancelBtn")}
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
              <div key={room.id} className="glass rounded p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <BedDouble className="h-4 w-4 text-brand-700" />
                      <span className="font-bold text-stone-900 dark:text-zinc-100">{t("roomCol")} {room.roomNumber}</span>
                    </div>
                    <div className="text-xs text-stone-400 dark:text-zinc-500 mt-0.5 space-x-2">
                      {room.floor && <span>{t("floorLabel")} {room.floor}</span>}
                      {room.roomType && <span>· {room.roomType}</span>}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => toggleQrPreview(room)}
                    className={`flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold
                      rounded py-2 border transition-colors
                      ${qrPreviews[room.id]
                        ? "bg-brand-700 text-white border-brand-700"
                        : "text-brand-700 border-brand-700 hover:bg-brand-50"}`}
                  >
                    <QrCode className="h-3.5 w-3.5" />
                    {qrPreviews[room.id] ? t("hideQr") : t("showQr")}
                  </button>
                  <button
                    onClick={() => downloadQR(room)}
                    className="flex items-center justify-center gap-1 text-xs font-semibold
                      text-stone-500 dark:text-zinc-400 border border-stone-200 dark:border-zinc-600 rounded px-3 py-2
                      hover:border-brand-700 hover:text-brand-700 transition-colors"
                    title={t("downloadQr")}
                  >
                    <Download className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => printQRCard(room)}
                    className="flex items-center justify-center gap-1 text-xs font-semibold
                      text-stone-500 dark:text-zinc-400 border border-stone-200 dark:border-zinc-600 rounded px-3 py-2
                      hover:border-brand-700 hover:text-brand-700 transition-colors"
                    title="Print QR card"
                  >
                    <Printer className="h-3.5 w-3.5" />
                  </button>
                  <a
                    href={`/tv/${room.qrToken}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-1.5 text-xs font-semibold
                      text-stone-500 dark:text-zinc-400 border border-stone-200 dark:border-zinc-600 rounded px-3 py-2
                      hover:border-brand-700 hover:text-brand-700 transition-colors"
                    title={t("openTv")}
                  >
                    <Tv2 className="h-3.5 w-3.5" />
                  </a>
                </div>

                {/* Inline QR preview */}
                {qrPreviews[room.id] && (
                  <div className="mt-3 flex flex-col items-center gap-2 bg-amber-50 dark:bg-amber-900/20 rounded p-4 border border-amber-100 dark:border-amber-900/30">
                    <img src={qrPreviews[room.id]} alt={`QR Room ${room.roomNumber}`} className="w-40 h-40" />
                    <p className="text-[11px] text-stone-400 dark:text-zinc-500 text-center">
                      {t("scanPhone")}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
