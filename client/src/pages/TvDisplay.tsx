import { useEffect, useState, useRef } from "react";
import { useParams } from "wouter";
import QRCode from "qrcode";
import { ConciergeBell } from "lucide-react";

interface RoomInfo {
  roomNumber: string;
  floor: string;
  hotelName: string;
  tagline: string;
  logoUrl: string;
}

export default function TvDisplay() {
  const { token } = useParams<{ token: string }>();
  const [room, setRoom]       = useState<RoomInfo | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [time, setTime]       = useState(new Date());
  const [error, setError]     = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Fetch room info
  useEffect(() => {
    fetch(`/api/guest/room/${token}`)
      .then(r => r.ok ? r.json() : Promise.reject())
      .then((data: RoomInfo) => setRoom(data))
      .catch(() => setError(true));
  }, [token]);

  // Generate QR code
  useEffect(() => {
    const url = `${window.location.origin}/r/${token}`;
    QRCode.toDataURL(url, {
      width: 360,
      margin: 2,
      color: { dark: "#451a03", light: "#fffbf5" },
      errorCorrectionLevel: "H",
    }).then(setQrDataUrl);
  }, [token]);

  // Live clock
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // Keep screen awake (best-effort via periodic interaction)
  useEffect(() => {
    const wakelock = async () => {
      try {
        if ("wakeLock" in navigator) {
          await (navigator as any).wakeLock.request("screen");
        }
      } catch { /* unsupported */ }
    };
    wakelock();
  }, []);

  if (error) return (
    <div className="min-h-screen bg-brand-900 flex items-center justify-center">
      <p className="text-amber-200 text-sm">Room not found</p>
    </div>
  );

  const clockStr = time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  return (
    <div
      className="min-h-screen bg-brand-900 flex flex-col items-center justify-between
        select-none overflow-hidden"
      style={{ fontFamily: "'Inter', sans-serif" }}
    >
      {/* Top bar */}
      <div className="w-full flex items-center justify-between px-10 pt-8">
        <div className="flex items-center gap-3 text-amber-300">
          {room?.logoUrl ? (
            <img src={room.logoUrl} alt={room.hotelName} className="h-10 w-10 rounded-xl object-cover" />
          ) : (
            <ConciergeBell className="h-7 w-7" />
          )}
          <div>
            <p className="text-xl font-bold tracking-wide leading-tight">
              {room?.hotelName || "Econcierge"}
            </p>
            {room?.tagline && (
              <p className="text-xs text-amber-500 leading-tight">{room.tagline}</p>
            )}
          </div>
        </div>
        <span className="text-amber-400 text-2xl font-light tabular-nums">{clockStr}</span>
      </div>

      {/* Center — room + QR */}
      <div className="flex flex-col items-center gap-8 py-6">
        {/* Room label */}
        {room && (
          <div className="text-center">
            <p className="text-amber-400 text-lg font-medium uppercase tracking-widest mb-1">
              {room.floor ? `Floor ${room.floor}` : ""}
            </p>
            <p className="text-white font-extrabold" style={{ fontSize: "clamp(3rem, 8vw, 6rem)" }}>
              Room {room.roomNumber}
            </p>
          </div>
        )}

        {/* QR code with animated ring */}
        <div className="relative">
          <div className="absolute inset-0 rounded-3xl bg-amber-400 opacity-10 animate-ping" />
          <div className="relative bg-amber-50 rounded-3xl p-5 shadow-2xl">
            {qrDataUrl
              ? <img src={qrDataUrl} alt="QR Code" className="w-64 h-64 sm:w-80 sm:h-80" />
              : <div className="w-64 h-64 sm:w-80 sm:h-80 bg-amber-100 rounded-xl animate-pulse" />
            }
          </div>
        </div>

        {/* Instructions — English + Amharic */}
        <div className="text-center space-y-2">
          <p className="text-white text-2xl font-semibold">
            Scan to request hotel services
          </p>
          <p className="text-amber-300 text-xl">
            ስካን ያድርጉ — አገልግሎት ለመጠየቅ
          </p>
          <p className="text-amber-500 text-sm mt-3 tracking-wide">
            Towels · Toiletries · Room Service · Maintenance
          </p>
          <p className="text-amber-600 text-sm">
            ፎጣ · የፀጽት ዕቃ · ምግብ · ጥገና
          </p>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="w-full flex items-center justify-center pb-8">
        <p className="text-brand-700 text-xs tracking-widest uppercase">
          econcierge.odvs.cloud
        </p>
      </div>
    </div>
  );
}
