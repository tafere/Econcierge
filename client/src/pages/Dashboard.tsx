import { useEffect, useState } from "react";
import { useAuth, getToken } from "@/lib/auth";
import { useLocation } from "wouter";
import {
  ConciergeBell, LogOut, BedDouble, Clock, CheckCircle2,
  Loader2, RefreshCw, Bell, AlertCircle, Zap, Hash, Settings,
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
  PENDING:     "Pending",
  IN_PROGRESS: "In Progress",
  DONE:        "Done",
};

const STATUS_PILL: Record<string, string> = {
  PENDING:     "bg-amber-100 text-amber-800 border-amber-300",
  IN_PROGRESS: "bg-blue-100  text-blue-800  border-blue-300",
  DONE:        "bg-green-100 text-green-700  border-green-300",
};

const CATEGORY_EMOJI: Record<string, string> = {
  broom:            "🧹",
  sparkles:         "✨",
  soap:             "🧴",
  utensils:         "🍽️",
  wrench:           "🔧",
  "concierge-bell": "🛎️",
};

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function timeAgo(iso: string) {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1)  return "just now";
  if (mins < 60) return `${mins}m ago`;
  return fmtTime(iso);
}

// ─── Stat card ────────────────────────────────────────────────────────────────
function StatCard({
  label, value, color, active, onClick,
}: { label: string; value: number; color: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 min-w-0 rounded-xl border px-4 py-3 text-left transition-all
        ${active ? "ring-2 ring-offset-1 ring-brand-700 " + color : "bg-white border-stone-100 hover:border-stone-300"}`}
    >
      <p className="text-2xl font-extrabold tabular-nums text-stone-900">{value}</p>
      <p className="text-xs font-medium text-stone-500 mt-0.5">{label}</p>
    </button>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const { user, logout } = useAuth();
  const [, navigate]     = useLocation();
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [filter, setFilter]     = useState<string>("ALL");
  const [loading, setLoading]   = useState(true);
  const [newCount, setNewCount] = useState(0);
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  const fetchRequests = async () => {
    const token = getToken();
    const url = filter === "ALL"
      ? "/api/dashboard/requests"
      : `/api/dashboard/requests?status=${filter}`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) setRequests(await res.json());
    setLoading(false);
  };

  useEffect(() => { fetchRequests(); }, [filter]);

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
    setUpdatingId(id);
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
    setUpdatingId(null);
  };

  const counts = {
    all:        requests.length,
    pending:    requests.filter(r => r.status === "PENDING").length,
    inProgress: requests.filter(r => r.status === "IN_PROGRESS").length,
    done:       requests.filter(r => r.status === "DONE").length,
  };

  const filtered = filter === "ALL" ? requests : requests.filter(r => r.status === filter);

  return (
    <div className="min-h-screen bg-stone-50">

      {/* Nav */}
      <nav className="bg-brand-700 text-white px-4 py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ConciergeBell className="h-5 w-5" />
            <div>
              <span className="font-bold text-sm">Econcierge</span>
              <span className="text-amber-200 text-xs ml-2">{user?.hotelName}</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {newCount > 0 && (
              <button
                onClick={() => { setNewCount(0); setFilter("ALL"); fetchRequests(); }}
                className="flex items-center gap-1.5 text-xs bg-amber-400 text-amber-900
                  rounded-full px-3 py-1 font-bold animate-pulse"
              >
                <Bell className="h-3.5 w-3.5" /> {newCount} new
              </button>
            )}
            <button onClick={() => navigate("/rooms")}
              className="flex items-center gap-1.5 text-xs text-amber-200 hover:text-white transition-colors">
              <BedDouble className="h-4 w-4" /> Rooms
            </button>
            {user?.role === "ADMIN" && (
              <button onClick={() => navigate("/settings")}
                className="flex items-center gap-1.5 text-xs text-amber-200 hover:text-white transition-colors">
                <Settings className="h-4 w-4" /> Settings
              </button>
            )}
            <button onClick={logout}
              className="flex items-center gap-1.5 text-xs text-amber-200 hover:text-white transition-colors">
              <LogOut className="h-4 w-4" /> Sign out
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-4 py-6 space-y-5">

        {/* Page title + refresh */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-stone-900">Live Requests</h1>
            <p className="text-xs text-stone-400">{user?.fullName} · today</p>
          </div>
          <button onClick={fetchRequests}
            className="p-2 text-stone-400 hover:text-brand-700 transition-colors" title="Refresh">
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>

        {/* Stat cards — also act as filters */}
        <div className="flex gap-3">
          <StatCard label="Total"       value={counts.all}        color="bg-stone-50 border-stone-300"   active={filter === "ALL"}        onClick={() => setFilter("ALL")} />
          <StatCard label="Pending"     value={counts.pending}    color="bg-amber-50 border-amber-300"   active={filter === "PENDING"}    onClick={() => setFilter("PENDING")} />
          <StatCard label="In Progress" value={counts.inProgress} color="bg-blue-50  border-blue-300"    active={filter === "IN_PROGRESS"} onClick={() => setFilter("IN_PROGRESS")} />
          <StatCard label="Done"        value={counts.done}       color="bg-green-50 border-green-300"   active={filter === "DONE"}       onClick={() => setFilter("DONE")} />
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-brand-700" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <ConciergeBell className="h-12 w-12 text-stone-200 mx-auto mb-3" />
            <p className="text-stone-400 text-sm">No requests</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-stone-200 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-stone-50 border-b border-stone-200">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wider w-8">
                      <Hash className="h-3.5 w-3.5" />
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wider">
                      Room
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wider">
                      Request
                    </th>
                    <th className="text-center px-3 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wider w-14">
                      Qty
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wider">
                      Notes
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wider w-28">
                      Time
                    </th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wider w-28">
                      Status
                    </th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wider w-28">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {filtered.map((req, i) => (
                    <tr
                      key={req.id}
                      className={`transition-colors
                        ${req.status === "PENDING"     ? "bg-amber-50/40 hover:bg-amber-50" :
                          req.status === "IN_PROGRESS" ? "hover:bg-blue-50/30" :
                                                         "opacity-70 hover:opacity-100 hover:bg-stone-50"}`}
                    >
                      {/* # */}
                      <td className="px-4 py-3 text-xs text-stone-300 tabular-nums">{i + 1}</td>

                      {/* Room */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="font-bold text-stone-900">
                          {req.roomNumber}
                        </span>
                        {req.floor && (
                          <span className="ml-1.5 text-xs text-stone-400">F{req.floor}</span>
                        )}
                      </td>

                      {/* Request */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="text-base leading-none">
                            {CATEGORY_EMOJI[req.categoryIcon] ?? "🛎️"}
                          </span>
                          <div>
                            <p className="font-semibold text-stone-800 whitespace-nowrap">{req.itemName}</p>
                            <p className="text-xs text-stone-400">{req.categoryName}</p>
                          </div>
                        </div>
                      </td>

                      {/* Qty */}
                      <td className="px-3 py-3 text-center">
                        {req.quantity > 1 ? (
                          <span className="inline-flex items-center justify-center w-8 h-8 rounded-full
                            bg-amber-100 text-amber-800 font-bold text-sm border border-amber-200">
                            {req.quantity}
                          </span>
                        ) : (
                          <span className="text-stone-300 text-xs">—</span>
                        )}
                      </td>

                      {/* Notes */}
                      <td className="px-4 py-3 max-w-[180px]">
                        {req.notes ? (
                          <p className="text-xs text-stone-500 italic truncate" title={req.notes}>
                            "{req.notes}"
                          </p>
                        ) : (
                          <span className="text-stone-200 text-xs">—</span>
                        )}
                      </td>

                      {/* Time */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-1 text-xs text-stone-500">
                          <Clock className="h-3 w-3 text-stone-300" />
                          {timeAgo(req.createdAt)}
                        </div>
                        {req.completedAt && (
                          <div className="flex items-center gap-1 text-xs text-green-600 mt-0.5">
                            <CheckCircle2 className="h-3 w-3" />
                            {fmtTime(req.completedAt)}
                          </div>
                        )}
                        {req.assignedTo && (
                          <p className="text-[11px] text-stone-400 mt-0.5">{req.assignedTo}</p>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center gap-1 text-[11px] font-semibold
                          px-2.5 py-1 rounded-full border whitespace-nowrap ${STATUS_PILL[req.status]}`}>
                          {req.status === "PENDING"     && <AlertCircle className="h-3 w-3" />}
                          {req.status === "IN_PROGRESS" && <Zap className="h-3 w-3" />}
                          {req.status === "DONE"        && <CheckCircle2 className="h-3 w-3" />}
                          {STATUS_LABEL[req.status]}
                        </span>
                      </td>

                      {/* Action */}
                      <td className="px-4 py-3 text-center">
                        {updatingId === req.id ? (
                          <Loader2 className="h-4 w-4 animate-spin text-stone-400 mx-auto" />
                        ) : req.status === "PENDING" ? (
                          <button
                            onClick={() => updateStatus(req.id, "IN_PROGRESS")}
                            className="text-xs bg-blue-600 text-white rounded-lg px-3 py-1.5
                              font-semibold hover:bg-blue-700 transition-colors whitespace-nowrap"
                          >
                            Accept
                          </button>
                        ) : req.status === "IN_PROGRESS" ? (
                          <button
                            onClick={() => updateStatus(req.id, "DONE")}
                            className="text-xs bg-green-600 text-white rounded-lg px-3 py-1.5
                              font-semibold hover:bg-green-700 transition-colors whitespace-nowrap"
                          >
                            Mark Done
                          </button>
                        ) : (
                          <CheckCircle2 className="h-4 w-4 text-green-400 mx-auto" />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Table footer */}
            <div className="px-4 py-2.5 border-t border-stone-100 bg-stone-50 flex items-center justify-between">
              <p className="text-xs text-stone-400">
                Showing {filtered.length} of {requests.length} requests
              </p>
              <p className="text-xs text-stone-400">
                Auto-updates via live stream
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
