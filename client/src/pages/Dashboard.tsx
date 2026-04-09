import { useEffect, useState, useRef } from "react";
import { useAuth, getToken } from "@/lib/auth";
import {
  CheckCircle2, Loader2, RefreshCw, Bell,
  X, Check, CheckCheck,
} from "lucide-react";
import NavBar from "@/components/NavBar";

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

function elapsedLabel(iso: string) {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1)  return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

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
          <tr className="border-b border-stone-200 bg-stone-50/60">
            <th className="text-left px-4 py-2.5 text-xs font-semibold text-stone-400 uppercase tracking-wider w-20">Room</th>
            <th className="text-left px-4 py-2.5 text-xs font-semibold text-stone-400 uppercase tracking-wider">Request</th>
            <th className="text-left px-4 py-2.5 text-xs font-semibold text-stone-400 uppercase tracking-wider w-24">Time</th>
            <th className="text-right px-4 py-2.5 text-xs font-semibold text-stone-400 uppercase tracking-wider w-40">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-stone-100">
          {requests.map(req => {
            const isOverdue   = overdueIds.has(req.id);
            const isEscalated = escalatedIds.has(req.id);
            const dimmed      = req.status === "DONE" || req.status === "CANCELLED" || req.status === "DECLINED";

            return (
              <tr key={req.id}
                className={`border-l-4 transition-colors
                  ${isEscalated  ? "border-l-red-400    bg-red-50/30   hover:bg-red-50/50" :
                    isOverdue    ? "border-l-orange-400 bg-orange-50/30 hover:bg-orange-50/50" :
                    req.status === "PENDING"     ? "border-l-amber-300 bg-amber-50/20 hover:bg-amber-50/40" :
                    req.status === "IN_PROGRESS" ? "border-l-blue-400  bg-blue-50/20  hover:bg-blue-50/40" :
                    "border-l-transparent hover:bg-stone-50"}
                  ${dimmed ? "opacity-55" : ""}`}
              >
                {/* Room */}
                <td className="px-4 py-3 whitespace-nowrap">
                  <p className="font-extrabold text-stone-900">{req.roomNumber}</p>
                  {req.floor && <p className="text-[10px] text-stone-400">Floor {req.floor}</p>}
                </td>

                {/* Request — item + qty + category + notes all in one cell */}
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-sm leading-none">{CATEGORY_EMOJI[req.categoryIcon] ?? "🛎️"}</span>
                    <span className="font-semibold text-stone-900">{req.itemName}</span>
                    {req.quantity > 1 && (
                      <span className="text-xs font-bold text-amber-700 bg-amber-100 border border-amber-200
                        rounded px-1.5 py-0.5">×{req.quantity}</span>
                    )}
                    <span className="text-xs text-stone-400">{req.categoryName}</span>
                  </div>
                  {req.notes && (
                    <p className="text-xs text-stone-400 italic mt-0.5 truncate max-w-xs">"{req.notes}"</p>
                  )}
                  {req.staffComment && (
                    <p className="text-xs text-red-500 italic mt-0.5 truncate max-w-xs">⚠ {req.staffComment}</p>
                  )}
                </td>

                {/* Time — elapsed, colored if urgent */}
                <td className="px-4 py-3 whitespace-nowrap">
                  <p className={`text-xs font-medium
                    ${isEscalated ? "text-red-600" : isOverdue ? "text-orange-500" : "text-stone-400"}`}>
                    {elapsedLabel(req.createdAt)}
                  </p>
                  {req.assignedTo && (req.status === "IN_PROGRESS" || req.status === "DONE") && (
                    <p className="text-[11px] text-stone-400 mt-0.5 truncate">{req.assignedTo}</p>
                  )}
                  {req.completedAt && (
                    <p className="text-[11px] text-green-600 mt-0.5">✓ {fmtTime(req.completedAt)}</p>
                  )}
                </td>

                {/* Action — the button IS the status */}
                <td className="px-4 py-3 text-right">
                  {updatingId === req.id ? (
                    <Loader2 className="h-4 w-4 animate-spin text-stone-400 ml-auto" />
                  ) : req.status === "PENDING" ? (
                    <div className="inline-flex items-center gap-1.5">
                      <button onClick={() => onAccept(req.id)}
                        className="inline-flex items-center gap-1 text-xs font-bold text-white
                          bg-brand-700 hover:bg-brand-800 rounded px-3 py-1.5 transition-colors">
                        <Check className="h-3.5 w-3.5" /> Accept
                      </button>
                      <button onClick={() => onDecline(req)} title="Decline"
                        className="p-1.5 rounded text-stone-300 hover:text-red-500 hover:bg-red-50 transition-colors">
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : req.status === "IN_PROGRESS" ? (
                    <button onClick={() => onDone(req.id)}
                      className="inline-flex items-center gap-1 text-xs font-bold text-white
                        bg-emerald-600 hover:bg-emerald-700 rounded px-3 py-1.5 transition-colors">
                      <CheckCheck className="h-3.5 w-3.5" /> Mark Done
                    </button>
                  ) : (
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded
                      ${req.status === "DONE"     ? "text-green-700 bg-green-50 border border-green-200" :
                        req.status === "DECLINED" ? "text-red-600   bg-red-50   border border-red-200"   :
                        "text-stone-400 bg-stone-50 border border-stone-200"}`}>
                      {STATUS_LABEL[req.status]}
                    </span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

type Tab = "ACTIVE" | "COMPLETED" | "CANCELLED" | "PASTDUE";

export default function DashboardPage() {
  const { user } = useAuth();
  const [requests, setRequests]   = useState<ServiceRequest[]>([]);
  const [loading, setLoading]     = useState(true);
  const [newCount, setNewCount]   = useState(0);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [tab, setTab]             = useState<Tab>("ACTIVE");
  const [declining, setDeclining] = useState<ServiceRequest | null>(null);

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

  // ── Overdue / escalated ───────────────────────────────────────────────────
  const overduePending  = active.filter(r => r.status === "PENDING"     && ageMinutes(r.createdAt) > OVERDUE_PENDING_MINS);
  const escalatedInProg = active.filter(r => r.status === "IN_PROGRESS" && r.acceptedAt && ageMinutes(r.acceptedAt) > ESCALATED_IN_PROG_MINS);
  const pastDue = [...overduePending, ...escalatedInProg]
    .filter((r, i, arr) => arr.findIndex(x => x.id === r.id) === i); // dedupe

  const currentRequests =
    tab === "ACTIVE"    ? active :
    tab === "COMPLETED" ? completed :
    tab === "PASTDUE"   ? pastDue :
                          cancelled;
  const grouped = groupByDate(currentRequests);

  const TabBtn = ({ t, label, count, urgent }: { t: Tab; label: string; count: number; urgent?: boolean }) => (
    <button
      onClick={() => setTab(t)}
      className={`flex items-center gap-2 px-4 py-2 rounded text-sm font-semibold transition-colors
        ${tab === t
          ? urgent ? "bg-orange-600 text-white shadow-sm"
                   : "bg-brand-700 text-white shadow-sm"
          : urgent && count > 0
            ? "bg-white/70 text-orange-700 border border-orange-300 hover:border-orange-400"
            : "bg-white/70 text-stone-500 border border-stone-200 hover:border-stone-300"}`}
    >
      {label}
      <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded
        ${tab === t
          ? "bg-white/20 text-white"
          : urgent && count > 0 ? "bg-orange-100 text-orange-700" : "bg-stone-100 text-stone-500"}`}>
        {count}
      </span>
    </button>
  );

  return (
    <div className="min-h-screen">

      <NavBar newCount={newCount} onNewCountClick={() => { setNewCount(0); setTab("ACTIVE"); fetchRequests(); }} />

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
          <TabBtn t="PASTDUE"   label="Past Due"  count={pastDue.length} urgent={pastDue.length > 0} />
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
              const dayOverdue   = new Set(dayReqs.filter(r => overduePending.some(o => o.id === r.id)).map(r => r.id));
              const dayEscalated = new Set(dayReqs.filter(r => escalatedInProg.some(e => e.id === r.id)).map(r => r.id));
              return (
              <div key={dateStr} className="glass rounded overflow-hidden">
                {/* Day header */}
                <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50 border-b border-slate-200">
                  <p className="text-xs font-bold text-stone-600 uppercase tracking-wider">
                    {formatDateHeader(dateStr)}
                  </p>
                  <div className="flex items-center gap-2">
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
