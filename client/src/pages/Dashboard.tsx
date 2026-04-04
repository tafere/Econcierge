import { useEffect, useState, useRef } from "react";
import { useAuth, getToken } from "@/lib/auth";
import { useLocation } from "wouter";
import {
  ConciergeBell, LogOut, BedDouble, Clock, CheckCircle2,
  Loader2, RefreshCw, Bell, AlertCircle, Zap, Hash, Settings,
  XCircle, Ban, TriangleAlert, X, Check, CheckCheck, Menu,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type Status = "PENDING" | "IN_PROGRESS" | "DONE" | "CANCELLED" | "DECLINED";

interface ServiceRequest {
  id: number;
  roomNumber: string;
  floor: string;
  itemName: string;
  categoryName: string;
  categoryIcon: string;
  quantity: number;
  notes: string;
  staffComment: string;
  status: Status;
  assignedTo: string;
  createdAt: string;
  acceptedAt: string;
  completedAt: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_PILL: Record<string, string> = {
  PENDING:     "bg-amber-100  text-amber-800  border-amber-300",
  IN_PROGRESS: "bg-blue-100   text-blue-800   border-blue-300",
  DONE:        "bg-green-100  text-green-700  border-green-300",
  CANCELLED:   "bg-stone-100  text-stone-500  border-stone-300",
  DECLINED:    "bg-red-100    text-red-700    border-red-300",
};

const STATUS_LABEL: Record<string, string> = {
  PENDING:     "Pending",
  IN_PROGRESS: "In Progress",
  DONE:        "Done",
  CANCELLED:   "Cancelled",
  DECLINED:    "Declined",
};

const CATEGORY_EMOJI: Record<string, string> = {
  broom:            "🧹",
  sparkles:         "✨",
  soap:             "🧴",
  utensils:         "🍽️",
  wrench:           "🔧",
  "concierge-bell": "🛎️",
};

// Thresholds for overdue / escalated (minutes)
const OVERDUE_PENDING_MINS    = 30;
const ESCALATED_IN_PROG_MINS  = 120;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function fmtDateTime(iso: string) {
  const d = new Date(iso);
  const date = d.toLocaleDateString([], { month: "short", day: "numeric" });
  const time = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  return `${date} · ${time}`;
}

function ageMinutes(iso: string) {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
}

function formatDateHeader(dateStr: string) {
  const todayStr     = new Date().toISOString().slice(0, 10);
  const yesterdayStr = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
  const d = new Date(dateStr + "T00:00:00");
  const label = d.toLocaleDateString([], { month: "long", day: "numeric" });
  if (dateStr === todayStr)     return `Today · ${label}`;
  if (dateStr === yesterdayStr) return `Yesterday · ${label}`;
  return d.toLocaleDateString([], { weekday: "short", month: "long", day: "numeric" });
}

function groupByDate(reqs: ServiceRequest[]): [string, ServiceRequest[]][] {
  const map: Record<string, ServiceRequest[]> = {};
  for (const r of reqs) {
    const key = r.createdAt.slice(0, 10);
    if (!map[key]) map[key] = [];
    map[key].push(r);
  }
  return Object.entries(map).sort(([a], [b]) => b.localeCompare(a));
}

// ─── Decline modal ────────────────────────────────────────────────────────────

function DeclineModal({
  req,
  onConfirm,
  onCancel,
}: {
  req: ServiceRequest;
  onConfirm: (comment: string) => void;
  onCancel: () => void;
}) {
  const [comment, setComment] = useState("");
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => { ref.current?.focus(); }, []);

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="glass rounded shadow-2xl w-full max-w-sm p-6 space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-bold text-stone-900">Decline Request</h3>
            <p className="text-xs text-stone-400 mt-0.5">Room {req.roomNumber} · {req.itemName}</p>
          </div>
          <button onClick={onCancel} className="text-stone-300 hover:text-stone-500">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div>
          <label className="text-xs font-semibold text-stone-500 uppercase tracking-wider block mb-1.5">
            Reason (required)
          </label>
          <textarea
            ref={ref}
            value={comment}
            onChange={e => setComment(e.target.value)}
            placeholder="e.g. Out of stock, will restock tomorrow…"
            rows={3}
            className="w-full border border-stone-200 rounded px-3 py-2 text-sm
              focus:outline-none focus:ring-2 focus:ring-red-400 resize-none"
          />
        </div>
        <div className="flex gap-3">
          <button onClick={onCancel}
            className="flex-1 h-10 bg-white border border-stone-200 rounded text-sm font-semibold
              text-stone-600 hover:bg-stone-50 transition-all shadow-sm">
            Cancel
          </button>
          <button
            onClick={() => { if (comment.trim()) onConfirm(comment.trim()); }}
            disabled={!comment.trim()}
            className="flex-1 h-10 bg-rose-500 text-white rounded
              text-sm font-semibold shadow-sm hover:bg-rose-600
              transition-all disabled:opacity-40"
          >
            Decline
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Request table ────────────────────────────────────────────────────────────

function RequestTable({
  requests,
  updatingId,
  onAccept,
  onDone,
  onDecline,
  overdueIds = new Set(),
  escalatedIds = new Set(),
}: {
  requests: ServiceRequest[];
  updatingId: number | null;
  onAccept:     (id: number) => void;
  onDone:       (id: number) => void;
  onDecline:    (req: ServiceRequest) => void;
  overdueIds?:   Set<number>;
  escalatedIds?: Set<number>;
}) {
  if (requests.length === 0) return null;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-slate-50 border-b border-slate-200">
            <th className="text-left px-4 py-2.5 text-xs font-semibold text-stone-400 uppercase tracking-wider w-8">
              <Hash className="h-3.5 w-3.5" />
            </th>
            <th className="text-left px-4 py-2.5 text-xs font-semibold text-stone-400 uppercase tracking-wider">Room</th>
            <th className="text-left px-4 py-2.5 text-xs font-semibold text-stone-400 uppercase tracking-wider">Request</th>
            <th className="text-center px-3 py-2.5 text-xs font-semibold text-stone-400 uppercase tracking-wider w-12">Qty</th>
            <th className="text-left px-4 py-2.5 text-xs font-semibold text-stone-400 uppercase tracking-wider">Notes</th>
            <th className="text-left px-4 py-2.5 text-xs font-semibold text-stone-400 uppercase tracking-wider w-36">Date &amp; Time</th>
            <th className="text-left px-4 py-2.5 text-xs font-semibold text-stone-400 uppercase tracking-wider w-28">Accepted By</th>
            <th className="text-center px-4 py-2.5 text-xs font-semibold text-stone-400 uppercase tracking-wider w-28">Status</th>
            <th className="text-center px-4 py-2.5 text-xs font-semibold text-stone-400 uppercase tracking-wider w-36">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-stone-100">
          {requests.map((req, i) => (
            <tr
              key={req.id}
              className={`transition-colors border-l-4
                ${overdueIds.has(req.id)   ? "border-l-orange-400 bg-orange-50/50 hover:bg-orange-50" :
                  escalatedIds.has(req.id) ? "border-l-red-400    bg-red-50/40    hover:bg-red-50/60" :
                  req.status === "PENDING"     ? "border-l-transparent bg-amber-50/40 hover:bg-amber-50" :
                  req.status === "IN_PROGRESS" ? "border-l-transparent hover:bg-blue-50/30" :
                  req.status === "CANCELLED" || req.status === "DECLINED"
                                               ? "border-l-transparent opacity-60 hover:opacity-100 hover:bg-stone-50" :
                                                 "border-l-transparent opacity-70 hover:opacity-100 hover:bg-stone-50"}`}
            >
              {/* # */}
              <td className="px-4 py-3 text-xs text-stone-300 tabular-nums">{i + 1}</td>

              {/* Room */}
              <td className="px-4 py-3 whitespace-nowrap">
                <span className="font-bold text-stone-900">{req.roomNumber}</span>
                {req.floor && <span className="ml-1.5 text-xs text-stone-400">F{req.floor}</span>}
              </td>

              {/* Request */}
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <span className="text-base leading-none">{CATEGORY_EMOJI[req.categoryIcon] ?? "🛎️"}</span>
                  <div>
                    <p className="font-semibold text-stone-800 whitespace-nowrap">{req.itemName}</p>
                    <p className="text-xs text-stone-400">{req.categoryName}</p>
                  </div>
                </div>
              </td>

              {/* Qty */}
              <td className="px-3 py-3 text-center">
                {req.quantity > 1 ? (
                  <span className="inline-flex items-center justify-center w-7 h-7 rounded
                    bg-amber-100 text-amber-800 font-bold text-xs border border-amber-200">
                    {req.quantity}
                  </span>
                ) : (
                  <span className="text-stone-200 text-xs">—</span>
                )}
              </td>

              {/* Notes / staffComment */}
              <td className="px-4 py-3 max-w-[160px]">
                {req.notes ? (
                  <p className="text-xs text-stone-500 italic truncate" title={req.notes}>"{req.notes}"</p>
                ) : req.staffComment ? (
                  <p className="text-xs text-red-500 italic truncate" title={req.staffComment}>⚠ {req.staffComment}</p>
                ) : (
                  <span className="text-stone-200 text-xs">—</span>
                )}
              </td>

              {/* Date & Time */}
              <td className="px-4 py-3 whitespace-nowrap">
                <div className="flex items-center gap-1 text-xs text-stone-500">
                  <Clock className="h-3 w-3 text-stone-300 shrink-0" />
                  {fmtDateTime(req.createdAt)}
                </div>
                {overdueIds.has(req.id) && (
                  <span className="inline-flex items-center gap-1 mt-0.5 text-[10px] font-bold
                    text-orange-700 bg-orange-100 border border-orange-200 rounded px-1.5 py-0.5">
                    <TriangleAlert className="h-2.5 w-2.5" /> Past Due
                  </span>
                )}
                {escalatedIds.has(req.id) && (
                  <span className="inline-flex items-center gap-1 mt-0.5 text-[10px] font-bold
                    text-red-700 bg-red-100 border border-red-200 rounded px-1.5 py-0.5">
                    <AlertCircle className="h-2.5 w-2.5" /> Escalated
                  </span>
                )}
                {req.completedAt && (
                  <div className="flex items-center gap-1 text-xs text-green-600 mt-0.5">
                    <CheckCircle2 className="h-3 w-3 shrink-0" />
                    {fmtTime(req.completedAt)}
                  </div>
                )}
              </td>

              {/* Accepted By */}
              <td className="px-4 py-3">
                {req.assignedTo ? (
                  <div>
                    <p className="text-xs font-semibold text-stone-700 truncate">{req.assignedTo}</p>
                    {req.acceptedAt && (
                      <p className="text-[11px] text-stone-400">{fmtTime(req.acceptedAt)}</p>
                    )}
                  </div>
                ) : (
                  <span className="text-stone-200 text-xs">—</span>
                )}
              </td>

              {/* Status */}
              <td className="px-4 py-3 text-center">
                <span className={`inline-flex items-center gap-1 text-[11px] font-semibold
                  px-2.5 py-1 rounded border whitespace-nowrap ${STATUS_PILL[req.status]}`}>
                  {req.status === "PENDING"     && <AlertCircle className="h-3 w-3" />}
                  {req.status === "IN_PROGRESS" && <Zap className="h-3 w-3" />}
                  {req.status === "DONE"        && <CheckCircle2 className="h-3 w-3" />}
                  {req.status === "CANCELLED"   && <XCircle className="h-3 w-3" />}
                  {req.status === "DECLINED"    && <Ban className="h-3 w-3" />}
                  {STATUS_LABEL[req.status]}
                </span>
              </td>

              {/* Action */}
              <td className="px-4 py-3 text-center">
                {updatingId === req.id ? (
                  <Loader2 className="h-4 w-4 animate-spin text-stone-400 mx-auto" />
                ) : req.status === "PENDING" ? (
                  <div className="flex items-center justify-center gap-2">
                    <button
                      onClick={() => onAccept(req.id)}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-white
                        bg-blue-600 rounded px-3 py-1.5
                        shadow-sm hover:bg-blue-700 transition-all"
                    >
                      <Check className="h-3 w-3" /> Accept
                    </button>
                    <button
                      onClick={() => onDecline(req)}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-600
                        bg-white border border-rose-200 rounded px-3 py-1.5
                        shadow-sm hover:bg-rose-50 hover:border-rose-300 transition-all"
                    >
                      <X className="h-3 w-3" /> Decline
                    </button>
                  </div>
                ) : req.status === "IN_PROGRESS" ? (
                  <button
                    onClick={() => onDone(req.id)}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-white
                      bg-emerald-600 rounded px-3 py-1.5
                      shadow-sm hover:bg-emerald-700 transition-all"
                  >
                    <CheckCheck className="h-3 w-3" /> Mark Done
                  </button>
                ) : (
                  <span className="text-stone-200 text-xs">—</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

type Tab = "ACTIVE" | "COMPLETED" | "CANCELLED";

export default function DashboardPage() {
  const { user, logout } = useAuth();
  const [, navigate]     = useLocation();
  const [requests, setRequests]   = useState<ServiceRequest[]>([]);
  const [loading, setLoading]     = useState(true);
  const [newCount, setNewCount]   = useState(0);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [tab, setTab]             = useState<Tab>("ACTIVE");
  const [declining, setDeclining] = useState<ServiceRequest | null>(null);
  const [sideNavOpen, setSideNavOpen] = useState(false);

  const fetchRequests = async () => {
    const token = getToken();
    const res = await fetch("/api/dashboard/requests", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) setRequests(await res.json());
    setLoading(false);
  };

  useEffect(() => { fetchRequests(); }, []);

  useEffect(() => {
    const token = getToken();
    const es = new EventSource(`/api/dashboard/stream?token=${token}`);
    es.addEventListener("request", () => {
      setNewCount(n => n + 1);
      fetchRequests();
    });
    return () => es.close();
  }, []);

  const updateStatus = async (id: number, status: string, comment?: string) => {
    setUpdatingId(id);
    const token = getToken();
    const body: Record<string, string> = { status };
    if (comment) body.comment = comment;
    const res = await fetch(`/api/dashboard/requests/${id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      const updated = await res.json();
      setRequests(prev => prev.map(r => r.id === id ? updated : r));
    }
    setUpdatingId(null);
  };

  // ── Tab data ──────────────────────────────────────────────────────────────
  const active    = requests.filter(r => r.status === "PENDING" || r.status === "IN_PROGRESS");
  const completed = requests.filter(r => r.status === "DONE");
  const cancelled = requests.filter(r => r.status === "CANCELLED" || r.status === "DECLINED");

  // ── Overdue / escalated (admin only) ──────────────────────────────────────
  const overduePending   = active.filter(r => r.status === "PENDING"     && ageMinutes(r.createdAt)  > OVERDUE_PENDING_MINS);
  const escalatedInProg  = active.filter(r => r.status === "IN_PROGRESS" && r.acceptedAt && ageMinutes(r.acceptedAt) > ESCALATED_IN_PROG_MINS);

  const currentRequests = tab === "ACTIVE" ? active : tab === "COMPLETED" ? completed : cancelled;
  const grouped = groupByDate(currentRequests);

  const TabBtn = ({ t, label, count }: { t: Tab; label: string; count: number }) => (
    <button
      onClick={() => setTab(t)}
      className={`flex items-center gap-2 px-4 py-2 rounded text-sm font-semibold transition-colors
        ${tab === t
          ? "bg-brand-700 text-white shadow-sm"
          : "bg-white/70 text-stone-500 border border-stone-200 hover:border-stone-300"}`}
    >
      {label}
      <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded
        ${tab === t ? "bg-white/20 text-white" : "bg-stone-100 text-stone-500"}`}>
        {count}
      </span>
    </button>
  );

  return (
    <div className="min-h-screen">

      {/* Nav */}
      <nav className="bg-brand-700 text-white px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ConciergeBell className="h-5 w-5" />
            <div>
              <span className="font-bold text-sm">Econcierge</span>
              <span className="text-amber-200 text-xs ml-2">{user?.hotelName}</span>
              {user?.role === "HOUSEKEEPING" && (
                <span className="text-[10px] bg-amber-400 text-amber-900 rounded px-2 py-0.5 font-bold ml-1">Housekeeping</span>
              )}
              {user?.role === "MAINTENANCE" && (
                <span className="text-[10px] bg-blue-400 text-blue-900 rounded px-2 py-0.5 font-bold ml-1">Maintenance</span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-4">
            {newCount > 0 && (
              <button
                onClick={() => { setNewCount(0); setTab("ACTIVE"); fetchRequests(); }}
                className="flex items-center gap-1.5 text-xs bg-amber-400 text-amber-900
                  rounded px-3 py-1 font-bold animate-pulse"
              >
                <Bell className="h-3.5 w-3.5" /> {newCount} new
              </button>
            )}
            {/* Desktop nav links */}
            <div className="hidden sm:flex items-center gap-4">
              {(user?.role === "ADMIN" || user?.role === "STAFF") && (
                <button onClick={() => navigate("/rooms")}
                  className="flex items-center gap-1.5 text-xs text-amber-200 hover:text-white transition-colors">
                  <BedDouble className="h-4 w-4" /> Rooms
                </button>
              )}
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
            {/* Mobile hamburger */}
            <button
              onClick={() => setSideNavOpen(true)}
              className="sm:hidden p-1 text-amber-200 hover:text-white transition-colors"
              aria-label="Open menu"
            >
              <Menu className="h-6 w-6" />
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile side drawer */}
      {sideNavOpen && (
        <div className="fixed inset-0 z-50 sm:hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setSideNavOpen(false)}
          />
          {/* Drawer */}
          <div className="absolute right-0 top-0 h-full w-72 bg-brand-900 flex flex-col shadow-2xl">
            {/* Drawer header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-brand-800">
              <div className="flex items-center gap-3">
                <ConciergeBell className="h-6 w-6 text-white" />
                <div>
                  <p className="font-bold text-white text-sm">Econcierge</p>
                  <p className="text-amber-300 text-xs">{user?.hotelName}</p>
                </div>
              </div>
              <button
                onClick={() => setSideNavOpen(false)}
                className="text-amber-300 hover:text-white transition-colors p-1"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            {/* User info */}
            <div className="px-5 py-4 border-b border-brand-800">
              <p className="text-xs text-amber-300 uppercase tracking-wider font-semibold">Signed in as</p>
              <p className="text-white font-semibold mt-0.5">{user?.fullName}</p>
              <p className="text-amber-400 text-xs mt-0.5">{user?.role}</p>
            </div>
            {/* Nav links */}
            <nav className="flex-1 px-3 py-4 space-y-1">
              {(user?.role === "ADMIN" || user?.role === "STAFF") && (
                <button
                  onClick={() => { navigate("/rooms"); setSideNavOpen(false); }}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded text-sm font-semibold
                    text-amber-200 hover:bg-brand-800 hover:text-white transition-colors text-left"
                >
                  <BedDouble className="h-5 w-5" /> Rooms
                </button>
              )}
              {user?.role === "ADMIN" && (
                <button
                  onClick={() => { navigate("/settings"); setSideNavOpen(false); }}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded text-sm font-semibold
                    text-amber-200 hover:bg-brand-800 hover:text-white transition-colors text-left"
                >
                  <Settings className="h-5 w-5" /> Settings
                </button>
              )}
            </nav>
            {/* Sign out at bottom */}
            <div className="px-3 py-4 border-t border-brand-800">
              <button
                onClick={() => { logout(); setSideNavOpen(false); }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded text-sm font-semibold
                  text-amber-200 hover:bg-brand-800 hover:text-white transition-colors text-left"
              >
                <LogOut className="h-5 w-5" /> Sign out
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 py-6 space-y-5">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-stone-900">Service Requests</h1>
            <p className="text-xs text-stone-400">{user?.fullName}</p>
          </div>
          <button onClick={fetchRequests}
            className="p-2 text-stone-400 hover:text-brand-700 transition-colors" title="Refresh">
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-2 flex-wrap">
          <TabBtn t="ACTIVE"    label="Active"    count={active.length} />
          <TabBtn t="COMPLETED" label="Completed" count={completed.length} />
          <TabBtn t="CANCELLED" label="Cancelled" count={cancelled.length} />
        </div>

        {/* Main request table */}
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-brand-700" />
          </div>
        ) : currentRequests.length === 0 ? (
          <div className="text-center py-20">
            <ConciergeBell className="h-12 w-12 text-stone-200 mx-auto mb-3" />
            <p className="text-stone-400 text-sm">No {tab.toLowerCase()} requests</p>
          </div>
        ) : (
          <div className="space-y-4">
            {grouped.map(([dateStr, dayReqs]) => {
              const dayOverdue    = new Set(dayReqs.filter(r => overduePending.some(o => o.id === r.id)).map(r => r.id));
              const dayEscalated  = new Set(dayReqs.filter(r => escalatedInProg.some(e => e.id === r.id)).map(r => r.id));
              const alertCount    = dayOverdue.size + dayEscalated.size;
              return (
              <div key={dateStr} className="glass rounded overflow-hidden">
                {/* Day header */}
                <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50 border-b border-slate-200">
                  <p className="text-xs font-bold text-stone-600 uppercase tracking-wider">
                    {formatDateHeader(dateStr)}
                  </p>
                  <div className="flex items-center gap-2">
                    {user?.role === "ADMIN" && tab === "ACTIVE" && alertCount > 0 && (
                      <span className="flex items-center gap-1 text-[11px] font-bold text-orange-700
                        bg-orange-100 border border-orange-200 rounded px-2 py-0.5">
                        <TriangleAlert className="h-3 w-3" /> {alertCount} overdue
                      </span>
                    )}
                    <span className="text-xs text-stone-400">{dayReqs.length} request{dayReqs.length !== 1 ? "s" : ""}</span>
                  </div>
                </div>
                <RequestTable
                  requests={dayReqs}
                  updatingId={updatingId}
                  onAccept={id => updateStatus(id, "IN_PROGRESS")}
                  onDone={id => updateStatus(id, "DONE")}
                  onDecline={setDeclining}
                  overdueIds={dayOverdue}
                  escalatedIds={dayEscalated}
                />
              </div>
              );
            })}

            <p className="text-xs text-stone-400 text-center pb-2">
              {currentRequests.length} request{currentRequests.length !== 1 ? "s" : ""} · Auto-updates via live stream
            </p>
          </div>
        )}
      </div>

      {/* Decline modal */}
      {declining && (
        <DeclineModal
          req={declining}
          onConfirm={comment => {
            updateStatus(declining.id, "DECLINED", comment);
            setDeclining(null);
          }}
          onCancel={() => setDeclining(null)}
        />
      )}
    </div>
  );
}
