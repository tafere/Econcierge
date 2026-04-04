import { useEffect, useState, useRef } from "react";
import { useAuth } from "@/lib/auth";
import { getToken } from "@/lib/auth";
import { useLocation } from "wouter";
import {
  ConciergeBell, LogOut, BedDouble, Clock, CheckCircle2,
  Loader2, RefreshCw, Bell
} from "lucide-react";

interface ServiceRequest {
  id: number;
  roomNumber: string;
  floor: string;
  itemName: string;
  categoryName: string;
  categoryIcon: string;
  quantity: number;
  notes: string;
  status: "PENDING" | "IN_PROGRESS" | "DONE";
  assignedTo: string;
  createdAt: string;
  completedAt: string;
}

const STATUS_LABEL: Record<string, string> = {
  PENDING: "Pending",
  IN_PROGRESS: "In Progress",
  DONE: "Done",
};

const STATUS_COLOR: Record<string, string> = {
  PENDING:     "bg-amber-100 text-amber-800 border-amber-200",
  IN_PROGRESS: "bg-blue-100 text-blue-800 border-blue-200",
  DONE:        "bg-green-100 text-green-800 border-green-200",
};

export default function DashboardPage() {
  const { user, logout } = useAuth();
  const [, navigate]     = useLocation();
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [filter, setFilter]     = useState<string>("ALL");
  const [loading, setLoading]   = useState(true);
  const [newCount, setNewCount] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const fetchRequests = async () => {
    const token = getToken();
    const url = filter === "ALL" ? "/api/dashboard/requests" : `/api/dashboard/requests?status=${filter}`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) setRequests(await res.json());
    setLoading(false);
  };

  useEffect(() => { fetchRequests(); }, [filter]);

  // SSE — real-time new request notifications
  useEffect(() => {
    const token = getToken();
    const es = new EventSource(`/api/dashboard/stream?token=${token}`);
    es.addEventListener("request", () => {
      setNewCount(n => n + 1);
      fetchRequests();
    });
    return () => es.close();
  }, []);

  const updateStatus = async (id: number, status: string) => {
    const token = getToken();
    const res = await fetch(`/api/dashboard/requests/${id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      const updated = await res.json();
      setRequests(prev => prev.map(r => r.id === id ? updated : r));
    }
  };

  const filtered = filter === "ALL" ? requests : requests.filter(r => r.status === filter);
  const pendingCount = requests.filter(r => r.status === "PENDING").length;

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Nav */}
      <nav className="bg-brand-700 text-white px-4 py-3">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ConciergeBell className="h-5 w-5" />
            <div>
              <span className="font-bold text-sm">Econcierge</span>
              <span className="text-amber-200 text-xs ml-2">{user?.hotelName}</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/rooms")}
              className="flex items-center gap-1.5 text-xs text-amber-200 hover:text-white transition-colors"
            >
              <BedDouble className="h-4 w-4" /> Rooms
            </button>
            <button
              onClick={logout}
              className="flex items-center gap-1.5 text-xs text-amber-200 hover:text-white transition-colors"
            >
              <LogOut className="h-4 w-4" /> Sign out
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-4 py-6 space-y-5">

        {/* Header row */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-stone-900">Live Requests</h1>
            <p className="text-sm text-stone-400">
              {pendingCount} pending • {user?.fullName}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {newCount > 0 && (
              <button
                onClick={() => { setNewCount(0); fetchRequests(); }}
                className="flex items-center gap-1.5 text-xs bg-amber-100 text-amber-800
                  border border-amber-200 rounded-full px-3 py-1.5 font-semibold animate-pulse"
              >
                <Bell className="h-3.5 w-3.5" /> {newCount} new
              </button>
            )}
            <button
              onClick={fetchRequests}
              className="p-2 text-stone-400 hover:text-brand-700 transition-colors"
              title="Refresh"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 flex-wrap">
          {["ALL", "PENDING", "IN_PROGRESS", "DONE"].map(s => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`text-xs font-semibold px-4 py-1.5 rounded-full border transition-colors
                ${filter === s
                  ? "bg-brand-700 text-white border-brand-700"
                  : "bg-white text-stone-600 border-stone-200 hover:border-brand-700"}`}
            >
              {s === "ALL" ? "All" : STATUS_LABEL[s]}
            </button>
          ))}
        </div>

        {/* Request list */}
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-brand-700" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <ConciergeBell className="h-12 w-12 text-stone-200 mx-auto mb-3" />
            <p className="text-stone-400 text-sm">No requests yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(req => (
              <div
                key={req.id}
                className={`bg-white rounded-xl border shadow-sm p-4
                  ${req.status === "PENDING" ? "border-amber-200" : "border-stone-100"}`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-bold text-stone-900 text-sm">Room {req.roomNumber}</span>
                      {req.floor && <span className="text-xs text-stone-400">Floor {req.floor}</span>}
                      <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${STATUS_COLOR[req.status]}`}>
                        {STATUS_LABEL[req.status]}
                      </span>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <p className="text-sm font-semibold text-stone-800">{req.itemName}</p>
                      {req.quantity > 1 && (
                        <span className="text-xs font-bold text-brand-700 bg-amber-50 border border-amber-200
                          rounded-full px-2 py-0.5">×{req.quantity}</span>
                      )}
                    </div>
                    <p className="text-xs text-stone-400">{req.categoryName}</p>
                    {req.notes && (
                      <p className="text-xs text-stone-500 mt-1 bg-stone-50 rounded px-2 py-1">"{req.notes}"</p>
                    )}
                    <div className="flex items-center gap-3 mt-2 text-[11px] text-stone-400">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(req.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                      {req.assignedTo && (
                        <span>Assigned to {req.assignedTo}</span>
                      )}
                      {req.completedAt && (
                        <span className="flex items-center gap-1 text-green-600">
                          <CheckCircle2 className="h-3 w-3" />
                          Done {new Date(req.completedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="flex flex-col gap-1.5 shrink-0">
                    {req.status === "PENDING" && (
                      <button
                        onClick={() => updateStatus(req.id, "IN_PROGRESS")}
                        className="text-xs bg-blue-600 text-white rounded-lg px-3 py-1.5 font-semibold
                          hover:bg-blue-700 transition-colors whitespace-nowrap"
                      >
                        Accept
                      </button>
                    )}
                    {req.status === "IN_PROGRESS" && (
                      <button
                        onClick={() => updateStatus(req.id, "DONE")}
                        className="text-xs bg-green-600 text-white rounded-lg px-3 py-1.5 font-semibold
                          hover:bg-green-700 transition-colors whitespace-nowrap"
                      >
                        Mark Done
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
