import { useEffect, useState } from "react";
import { useAuth, getToken } from "@/lib/auth";
import { useLang } from "@/lib/lang";
import {
  ConciergeBell, Loader2, RefreshCw,
  X, Check, CheckCheck, Users, CalendarClock, Clock, Bell, BellOff,
} from "lucide-react";
import NavBar from "@/components/NavBar";
import { requestNotifyPermission, showNotification, playAlertSound } from "@/lib/notify";
import { useNotifications } from "@/lib/NotificationsContext";

// ─── Types ────────────────────────────────────────────────────────────────────

type Status = "PENDING" | "IN_PROGRESS" | "DONE" | "CANCELLED" | "DECLINED";

interface ServiceRequest {
  id: number;
  roomNumber: string;
  floor: string;
  itemName: string;
  itemNameAm?: string;
  categoryName: string;
  categoryNameAm?: string;
  categoryIcon: string;
  quantity: number;
  notes: string;
  staffComment: string;
  status: Status;
  assignedTo: string;
  etaMinutes?: number | null;
  createdAt: string;
  acceptedAt: string;
  completedAt: string;
}

interface Booking {
  id: number;
  status: "PENDING" | "CONFIRMED" | "CANCELLED";
  slotTimeIso: string;
  slotTime: string;
  slotDate: string;
  guestCount: number;
  notes: string;
  itemName: string;
  itemNameAm?: string;
  roomNumber: string;
  floor: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORY_EMOJI: Record<string, string> = {
  broom:            "🧹",
  sparkles:         "✨",
  soap:             "🧴",
  utensils:         "🍽️",
  wrench:           "🔧",
  "concierge-bell": "🛎️",
};

const OVERDUE_PENDING_MINS   = 30;
const ESCALATED_IN_PROG_MINS = 120;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDateTime(iso: string) {
  const d = new Date(iso);
  return `${d.toLocaleDateString([], { month: "short", day: "numeric" })} · ${d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
}

function ageMinutes(iso: string) {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
}

function formatDateHeader(dateStr: string, t: (k: string) => string) {
  const todayStr     = new Date().toISOString().slice(0, 10);
  const yesterdayStr = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
  const tomorrowStr  = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);
  const d = new Date(dateStr + "T00:00:00");
  const label = d.toLocaleDateString([], { month: "long", day: "numeric" });
  if (dateStr === todayStr)     return `${t("todayLabel")} · ${label}`;
  if (dateStr === tomorrowStr)  return `${t("tomorrowLabel")} · ${label}`;
  if (dateStr === yesterdayStr) return `${t("yesterdayLabel")} · ${label}`;
  return d.toLocaleDateString([], { weekday: "short", month: "long", day: "numeric" });
}

// ─── Confirm modal ────────────────────────────────────────────────────────────

function ConfirmModal({
  title,
  message,
  confirmLabel,
  danger = false,
  onConfirm,
  onCancel,
}: {
  title: string;
  message?: string;
  confirmLabel: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const { t } = useLang();
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="glass rounded shadow-2xl dark:shadow-black/40 w-full max-w-sm p-6 space-y-4">
        <div className="flex items-start justify-between">
          <h3 className="font-bold text-stone-900 dark:text-zinc-100">{title}</h3>
          <button onClick={onCancel} className="text-stone-300 dark:text-zinc-600 hover:text-stone-500 dark:hover:text-zinc-300">
            <X className="h-5 w-5" />
          </button>
        </div>
        {message && <p className="text-sm text-stone-500 dark:text-zinc-400">{message}</p>}
        <div className="flex gap-3">
          <button onClick={onCancel}
            className="flex-1 h-10 bg-white dark:bg-zinc-700 border border-stone-200 dark:border-zinc-600 rounded text-sm font-semibold
              text-stone-600 dark:text-zinc-200 hover:bg-stone-50 dark:hover:bg-zinc-600 transition-all shadow-sm">
            {t("goBack")}
          </button>
          <button onClick={onConfirm}
            className={`flex-1 h-10 rounded text-sm font-semibold shadow-sm transition-all text-white
              ${danger ? "bg-rose-500 hover:bg-rose-600" : "bg-brand-700 hover:bg-brand-800"}`}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
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
  const { t } = useLang();
  const [comment, setComment] = useState("");

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="glass rounded shadow-2xl dark:shadow-black/40 w-full max-w-sm p-6 space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-bold text-stone-900 dark:text-zinc-100">{t("declineRequest")}</h3>
            <p className="text-xs text-stone-400 dark:text-zinc-500 mt-0.5">{t("roomCol")} {req.roomNumber} · {req.itemName}</p>
          </div>
          <button onClick={onCancel} className="text-stone-300 dark:text-zinc-600 hover:text-stone-500 dark:hover:text-zinc-300">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div>
          <label className="text-xs font-semibold text-stone-500 dark:text-zinc-400 uppercase tracking-wider block mb-1.5">
            {t("reasonRequired")}
          </label>
          <textarea
            autoFocus
            value={comment}
            onChange={e => setComment(e.target.value)}
            placeholder={t("declinePlaceholder")}
            rows={3}
            className="w-full border border-stone-200 dark:border-zinc-600 bg-white dark:bg-zinc-700 dark:text-zinc-100 rounded px-3 py-2 text-sm
              focus:outline-none focus:ring-2 focus:ring-red-400 resize-none"
          />
        </div>
        <div className="flex gap-3">
          <button onClick={onCancel}
            className="flex-1 h-10 bg-white dark:bg-zinc-700 border border-stone-200 dark:border-zinc-600 rounded text-sm font-semibold
              text-stone-600 dark:text-zinc-200 hover:bg-stone-50 dark:hover:bg-zinc-600 transition-all shadow-sm">
            {t("goBack")}
          </button>
          <button
            onClick={() => { if (comment.trim()) onConfirm(comment.trim()); }}
            disabled={!comment.trim()}
            className="flex-1 h-10 bg-rose-500 text-white rounded
              text-sm font-semibold shadow-sm hover:bg-rose-600
              transition-all disabled:opacity-40"
          >
            {t("declineBtn")}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Accept modal (ETA) ───────────────────────────────────────────────────────

function AcceptModal({
  req,
  defaultEta,
  onConfirm,
  onCancel,
}: {
  req: ServiceRequest;
  defaultEta: number;
  onConfirm: (etaMinutes: number) => void;
  onCancel: () => void;
}) {
  const { t } = useLang();
  const [eta, setEta] = useState(defaultEta);

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="glass rounded shadow-2xl dark:shadow-black/40 w-full max-w-sm p-6 space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-bold text-stone-900 dark:text-zinc-100">{t("accept")} — {t("roomCol")} {req.roomNumber}</h3>
            <p className="text-xs text-stone-400 dark:text-zinc-500 mt-0.5">{req.itemName}</p>
          </div>
          <button onClick={onCancel} className="text-stone-300 dark:text-zinc-600 hover:text-stone-500 dark:hover:text-zinc-300">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div>
          <label className="text-xs font-semibold text-stone-500 dark:text-zinc-400 uppercase tracking-wider block mb-1.5">
            ETA (minutes)
          </label>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-stone-400 dark:text-zinc-500 shrink-0" />
            <input
              type="number"
              min={1}
              max={480}
              value={eta}
              onChange={e => setEta(Number(e.target.value))}
              className="flex-1 h-10 border border-stone-200 dark:border-zinc-600 bg-white dark:bg-zinc-700 dark:text-zinc-100 rounded px-3 text-sm
                focus:outline-none focus:ring-2 focus:ring-brand-700"
              autoFocus
            />
            <span className="text-sm text-stone-400 dark:text-zinc-500 shrink-0">min</span>
          </div>
        </div>
        <div className="flex gap-3">
          <button onClick={onCancel}
            className="flex-1 h-10 bg-white dark:bg-zinc-700 border border-stone-200 dark:border-zinc-600 rounded text-sm font-semibold
              text-stone-600 dark:text-zinc-200 hover:bg-stone-50 dark:hover:bg-zinc-600 transition-all shadow-sm">
            {t("goBack")}
          </button>
          <button onClick={() => onConfirm(eta)}
            className="flex-1 h-10 bg-brand-700 text-white rounded text-sm font-semibold shadow-sm
              hover:bg-brand-800 transition-all">
            {t("accept")}
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
  highlightedId = null,
}: {
  requests: ServiceRequest[];
  updatingId: number | null;
  onAccept:  (req: ServiceRequest) => void;
  onDone:    (id: number) => void;
  onDecline: (req: ServiceRequest) => void;
  overdueIds?:   Set<number>;
  escalatedIds?: Set<number>;
  highlightedId?: number | null;
}) {
  const { t, lang } = useLang();
  if (requests.length === 0) return null;

  const hasActions = requests.some(r => r.status === "PENDING" || r.status === "IN_PROGRESS");
  const hasNotes   = requests.some(r => r.notes || r.staffComment);
  const hasBy      = requests.some(r => r.assignedTo && r.status !== "PENDING");

  const th = "text-left px-4 py-2.5 text-xs font-semibold text-stone-400 dark:text-zinc-500 uppercase tracking-wider whitespace-nowrap";

  // ── Mobile card list ────────────────────────────────────────────────────────
  const mobileCards = (
    <div className="sm:hidden space-y-2.5">
      {requests.map(req => {
        const isOverdue     = overdueIds.has(req.id);
        const isEscalated   = escalatedIds.has(req.id);
        const isHighlighted = req.id === highlightedId;
        const dimmed        = req.status === "DONE" || req.status === "CANCELLED" || req.status === "DECLINED";
        const itemLabel     = lang === "am" && req.itemNameAm ? req.itemNameAm : req.itemName;
        const catLabel      = lang === "am" && req.categoryNameAm ? req.categoryNameAm : req.categoryName;
        const ageMins       = ageMinutes(req.createdAt);
        const timeLabel     = ageMins < 1 ? "just now" : ageMins < 60 ? `${ageMins}m ago` : fmtDateTime(req.createdAt);

        const borderColor =
          isHighlighted ? "border-brand-400" :
          isEscalated   ? "border-red-500" :
          isOverdue     ? "border-orange-400" :
          req.status === "PENDING"     ? "border-amber-300" :
          req.status === "IN_PROGRESS" ? "border-blue-400" :
          "border-stone-200 dark:border-zinc-700";

        return (
          <div key={req.id} id={`request-${req.id}`}
            className={`glass rounded-lg border-l-4 ${borderColor} ${dimmed ? "opacity-55" : ""}
              ${isHighlighted ? "ring-2 ring-brand-400" : ""} transition-all duration-500 overflow-hidden`}>

            {/* Card body */}
            <div className="px-4 py-3 space-y-1.5">
              {/* Row 1: Room (left) + overdue badge / time (right) */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-baseline gap-2 min-w-0">
                  <span className="text-xl font-extrabold text-stone-900 dark:text-zinc-100 leading-none shrink-0">
                    {t("roomCol")} {req.roomNumber}
                  </span>
                  {req.floor && (
                    <span className="text-xs text-stone-400 dark:text-zinc-500 shrink-0">{t("floorLabel")} {req.floor}</span>
                  )}
                </div>
                <div className="flex flex-col items-end gap-0.5 shrink-0">
                  {isEscalated && (
                    <span className="text-[10px] font-bold text-red-500 border border-red-300 dark:border-red-700 rounded px-1.5 py-0.5">Escalated</span>
                  )}
                  {isOverdue && !isEscalated && (
                    <span className="text-[10px] font-bold text-orange-500 border border-orange-300 dark:border-orange-700 rounded px-1.5 py-0.5">Overdue</span>
                  )}
                  <span className="text-xs text-stone-400 dark:text-zinc-500">{timeLabel}</span>
                </div>
              </div>

              {/* Row 2: Emoji + item + quantity */}
              <div className="flex items-center gap-2">
                <span className="text-lg leading-none shrink-0">{CATEGORY_EMOJI[req.categoryIcon] ?? "🛎️"}</span>
                <span className="font-semibold text-stone-800 dark:text-zinc-100 text-sm leading-snug">{itemLabel}</span>
                {req.quantity > 1 && (
                  <span className="text-xs font-bold text-amber-700 bg-amber-100 dark:bg-amber-900/30
                    border border-amber-200 rounded px-1.5 py-0.5 shrink-0">×{req.quantity}</span>
                )}
              </div>

              {/* Row 3: Category · ETA */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-xs text-stone-400 dark:text-zinc-500">{catLabel}</span>
                {req.status === "IN_PROGRESS" && req.etaMinutes != null && (
                  <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold
                    text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-700 rounded px-1.5 py-0.5">
                    <Clock className="h-2.5 w-2.5" /> ~{req.etaMinutes}min
                  </span>
                )}
              </div>

              {/* Notes — only if present */}
              {(req.notes || req.staffComment) && (
                <div className="pt-0.5 space-y-0.5">
                  {req.notes && <p className="text-xs text-stone-500 dark:text-zinc-400 italic truncate">"{req.notes}"</p>}
                  {req.staffComment && <p className="text-xs text-red-500 italic truncate">⚠ {req.staffComment}</p>}
                </div>
              )}
            </div>

            {/* Action buttons */}
            {(req.status === "PENDING" || req.status === "IN_PROGRESS") && (
              <div className="border-t border-stone-200/50 dark:border-zinc-700/40">
                {updatingId === req.id ? (
                  <div className="flex justify-center py-3">
                    <Loader2 className="h-4 w-4 animate-spin text-stone-400" />
                  </div>
                ) : req.status === "PENDING" ? (
                  <div className="flex gap-2 p-2">
                    <button onClick={() => onAccept(req)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-bold
                        text-stone-700 dark:text-zinc-200 border border-brand-500 dark:border-brand-600 rounded
                        hover:bg-brand-50 dark:hover:bg-brand-900/20 transition-colors">
                      <Check className="h-3.5 w-3.5" /> {t("accept")}
                    </button>
                    <button onClick={() => onDecline(req)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-bold
                        text-red-500 border border-red-200 dark:border-red-800 rounded
                        hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                      <X className="h-3.5 w-3.5" /> {t("declineBtn")}
                    </button>
                  </div>
                ) : (
                  <button onClick={() => onDone(req.id)}
                    className="w-full flex items-center justify-center gap-1.5 py-2.5 text-xs font-bold
                      text-white bg-emerald-600 hover:bg-emerald-700 transition-colors">
                    <CheckCheck className="h-3.5 w-3.5" /> {t("markDone")}
                  </button>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );

  return (
    <>
      {mobileCards}
      <div className="hidden sm:block overflow-x-auto">
      <table className="min-w-full text-sm table-auto">
        <thead>
          <tr className="border-b border-stone-200 dark:border-zinc-700 bg-stone-50/60 dark:bg-zinc-800/60">
            <th className={th}>{t("roomCol")}</th>
            <th className={th}>{t("requestCol")}</th>
            {hasNotes   && <th className={th}>{t("notesCol")}</th>}
            <th className={th}>{t("dateTimeCol")}</th>
            {hasBy      && <th className={th}>{t("handledBy")}</th>}
            {hasActions && <th className={`${th} text-right`}>{t("actionCol")}</th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-stone-100 dark:divide-zinc-700/50">
          {requests.map(req => {
            const isOverdue     = overdueIds.has(req.id);
            const isEscalated   = escalatedIds.has(req.id);
            const isHighlighted = req.id === highlightedId;
            const dimmed        = req.status === "DONE" || req.status === "CANCELLED" || req.status === "DECLINED";

            return (
              <tr key={req.id}
                id={`request-${req.id}`}
                className={`border-l-4 transition-all duration-500
                  ${isHighlighted ? "ring-2 ring-inset ring-brand-400 bg-amber-50/60 dark:bg-amber-900/20" :
                    isEscalated  ? "border-l-red-400    bg-red-50/30    dark:bg-red-900/20    hover:bg-red-50/50    dark:hover:bg-red-900/30"    :
                    isOverdue    ? "border-l-orange-400 bg-orange-50/30 dark:bg-orange-900/20 hover:bg-orange-50/50 dark:hover:bg-orange-900/30" :
                    req.status === "PENDING"     ? "border-l-amber-300 bg-amber-50/20 dark:bg-amber-900/10 hover:bg-amber-50/40 dark:hover:bg-amber-900/20" :
                    req.status === "IN_PROGRESS" ? "border-l-blue-400  bg-blue-50/20  dark:bg-blue-900/10  hover:bg-blue-50/40  dark:hover:bg-blue-900/20"  :
                    "border-l-transparent hover:bg-stone-50 dark:hover:bg-zinc-700"}
                  ${dimmed ? "opacity-55" : ""}`}
              >
                <td className="px-4 py-3 whitespace-nowrap">
                  <p className="font-extrabold text-stone-900 dark:text-zinc-100">{req.roomNumber}</p>
                  {req.floor && <p className="text-[10px] text-stone-400 dark:text-zinc-500">{t("floorLabel")} {req.floor}</p>}
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm leading-none">{CATEGORY_EMOJI[req.categoryIcon] ?? "🛎️"}</span>
                    <span className="font-semibold text-stone-900 dark:text-zinc-100">{lang === "am" && req.itemNameAm ? req.itemNameAm : req.itemName}</span>
                    {req.quantity > 1 && (
                      <span className="text-xs font-bold text-amber-700 bg-amber-100 dark:bg-amber-900/30 border border-amber-200
                        rounded px-1.5 py-0.5">×{req.quantity}</span>
                    )}
                  </div>
                  <p className="text-xs text-stone-400 dark:text-zinc-500 mt-0.5">{lang === "am" && req.categoryNameAm ? req.categoryNameAm : req.categoryName}</p>
                </td>
                {hasNotes && (
                  <td className="px-4 py-3 max-w-[180px]">
                    {req.notes && (
                      <p className="text-xs text-stone-500 italic truncate cursor-default" title={req.notes}>
                        {req.notes}
                      </p>
                    )}
                    {req.staffComment && (
                      <p className="text-xs text-red-500 italic truncate cursor-default mt-0.5" title={req.staffComment}>
                        ⚠ {req.staffComment}
                      </p>
                    )}
                  </td>
                )}
                <td className="px-4 py-3 whitespace-nowrap">
                  <p className={`text-xs font-medium
                    ${isEscalated ? "text-red-600" : isOverdue ? "text-orange-500" : "text-stone-500 dark:text-zinc-400"}`}>
                    {fmtDateTime(req.createdAt)}
                  </p>
                  {req.completedAt && (
                    <p className="text-[11px] text-green-600 mt-0.5">✓ {fmtDateTime(req.completedAt)}</p>
                  )}
                  {req.status === "IN_PROGRESS" && req.etaMinutes != null && (
                    <span className="inline-flex items-center gap-0.5 mt-0.5 text-[10px] font-semibold
                      text-blue-700 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 rounded px-1.5 py-0.5">
                      <Clock className="h-2.5 w-2.5" />~{req.etaMinutes} min
                    </span>
                  )}
                </td>
                {hasBy && (
                  <td className="px-4 py-3 whitespace-nowrap">
                    {req.assignedTo && req.status !== "PENDING" && (
                      <p className="text-xs text-stone-600 dark:text-zinc-400 font-medium">{req.assignedTo}</p>
                    )}
                  </td>
                )}
                {hasActions && (
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    {updatingId === req.id ? (
                      <Loader2 className="h-4 w-4 animate-spin text-stone-400 ml-auto" />
                    ) : req.status === "PENDING" ? (
                      <div className="inline-flex items-center gap-1.5">
                        <button onClick={() => onAccept(req)}
                          className="inline-flex items-center gap-1 text-xs font-bold text-white
                            bg-brand-700 hover:bg-brand-800 rounded px-3 py-1.5 transition-colors">
                          <Check className="h-3.5 w-3.5" /> {t("accept")}
                        </button>
                        <button onClick={() => onDecline(req)}
                          className="text-xs font-bold text-red-500 border border-red-200 hover:bg-red-50
                            rounded px-3 py-1.5 transition-colors">
                          {t("declineBtn")}
                        </button>
                      </div>
                    ) : req.status === "IN_PROGRESS" ? (
                      <button onClick={() => onDone(req.id)}
                        className="inline-flex items-center gap-1 text-xs font-bold text-white
                          bg-emerald-600 hover:bg-emerald-700 rounded px-3 py-1.5 transition-colors">
                        <CheckCheck className="h-3.5 w-3.5" /> {t("markDone")}
                      </button>
                    ) : null}
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
      </div>
    </>
  );
}

// ─── Booking section ──────────────────────────────────────────────────────────

const BOOKING_STATUS_PILL: Record<string, string> = {
  PENDING:   "bg-amber-100 text-amber-800 border-amber-300",
  CONFIRMED: "bg-green-100 text-green-800 border-green-300",
  CANCELLED: "bg-stone-100 text-stone-500 border-stone-300",
};

function BookingSection({
  itemName,
  itemNameAm,
  bookings,
  updatingId,
  onUpdateStatus,
}: {
  itemName: string;
  itemNameAm?: string;
  bookings: Booking[];
  updatingId: number | null;
  onUpdateStatus: (id: number, status: string, booking: Booking) => void;
}) {
  const { t, lang } = useLang();
  const displayName = lang === "am" && itemNameAm ? itemNameAm : itemName;
  const th = "text-left px-4 py-2.5 text-xs font-semibold text-stone-400 dark:text-zinc-500 uppercase tracking-wider whitespace-nowrap";
  const totalGuests = bookings.filter(b => b.status !== "CANCELLED").reduce((s, b) => s + b.guestCount, 0);
  const hasNotes   = bookings.some(b => b.notes);
  const hasActions = bookings.some(b => b.status === "PENDING" || b.status === "CONFIRMED");

  return (
    <div className="glass rounded overflow-hidden">
      <div className="px-4 py-2.5 bg-slate-50 dark:bg-zinc-800/60 border-b border-slate-200 dark:border-zinc-700 flex items-center gap-2">
        <CalendarClock className="h-4 w-4 text-stone-400 dark:text-zinc-500 shrink-0" />
        <p className="text-xs font-bold text-stone-600 dark:text-zinc-300 uppercase tracking-wider">{displayName}</p>
        <div className="flex items-center gap-1 text-xs text-stone-400 dark:text-zinc-500 ml-auto">
          <Users className="h-3.5 w-3.5" /> {totalGuests} {totalGuests !== 1 ? t("guestPlural") : t("guestSingular")}
        </div>
      </div>

      {/* Mobile card list */}
      <div className="sm:hidden space-y-2.5 p-3">
        {bookings.map(b => {
          const borderColor =
            b.status === "CONFIRMED" ? "border-green-400" :
            b.status === "PENDING"   ? "border-amber-300" :
            "border-stone-200 dark:border-zinc-700";
          return (
            <div key={b.id}
              className={`glass rounded-lg border-l-4 ${borderColor} ${b.status === "CANCELLED" ? "opacity-50" : ""} overflow-hidden`}>
              <div className="px-4 py-3 space-y-1.5">
                {/* Row 1: Room + slot time */}
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xl font-extrabold text-stone-900 dark:text-zinc-100 leading-none">
                    {t("roomCol")} {b.roomNumber}
                  </span>
                  <span className="text-xs text-stone-400 dark:text-zinc-500 shrink-0">{b.slotTime}</span>
                </div>
                {/* Row 2: Date + guest count */}
                <div className="flex items-center gap-2">
                  <CalendarClock className="h-3.5 w-3.5 text-stone-400 dark:text-zinc-500 shrink-0" />
                  <span className="text-sm font-semibold text-stone-800 dark:text-zinc-100">{b.slotDate}</span>
                  <span className="inline-flex items-center gap-0.5 text-xs text-stone-400 dark:text-zinc-500">
                    <Users className="h-3 w-3" /> {b.guestCount}
                  </span>
                </div>
                {/* Status badge */}
                {b.status !== "PENDING" && (
                  <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${BOOKING_STATUS_PILL[b.status]}`}>
                    {b.status === "CONFIRMED" ? t("confirmedStatus") : t("cancelledStatus")}
                  </span>
                )}
                {b.notes && (
                  <p className="text-xs text-stone-400 dark:text-zinc-500 italic truncate">"{b.notes}"</p>
                )}
              </div>
              {/* Action buttons */}
              {(b.status === "PENDING" || b.status === "CONFIRMED") && (
                <div className="border-t border-stone-200/50 dark:border-zinc-700/40">
                  {updatingId === b.id ? (
                    <div className="flex justify-center py-3">
                      <Loader2 className="h-4 w-4 animate-spin text-stone-400" />
                    </div>
                  ) : b.status === "PENDING" ? (
                    <div className="grid grid-cols-2 divide-x divide-stone-200/50 dark:divide-zinc-700/40">
                      <button onClick={() => onUpdateStatus(b.id, "CONFIRMED", b)}
                        className="flex items-center justify-center gap-1.5 py-2.5 text-xs font-bold
                          text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors">
                        <Check className="h-3.5 w-3.5" /> {t("confirmBtn")}
                      </button>
                      <button onClick={() => onUpdateStatus(b.id, "CANCELLED", b)}
                        className="flex items-center justify-center gap-1.5 py-2.5 text-xs font-bold
                          text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                        <X className="h-3.5 w-3.5" /> {t("cancelBtn")}
                      </button>
                    </div>
                  ) : (
                    <button onClick={() => onUpdateStatus(b.id, "CANCELLED", b)}
                      className="w-full flex items-center justify-center gap-1.5 py-2.5 text-xs font-bold
                        text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                      <X className="h-3.5 w-3.5" /> {t("cancelBtn")}
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="hidden sm:block overflow-x-auto">
        <table className="min-w-full text-sm table-auto">
          <thead>
            <tr className="border-b border-stone-200 dark:border-zinc-700 bg-stone-50/60 dark:bg-zinc-800/60">
              <th className={th}>{t("timeCol")}</th>
              <th className={th}>{t("roomCol")}</th>
              <th className={th}>{t("guestsCol")}</th>
              {hasNotes   && <th className={th}>{t("notesCol")}</th>}
              <th className={th}>{t("statusCol")}</th>
              {hasActions && <th className={`${th} text-right`}>{t("actionCol")}</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100 dark:divide-zinc-700/50">
            {bookings.map(b => (
              <tr key={b.id} className={b.status === "CANCELLED" ? "opacity-50" : ""}>
                <td className="px-4 py-3 whitespace-nowrap">
                  <p className="text-xs font-semibold text-stone-700 dark:text-zinc-300">{b.slotTime}</p>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <p className="font-extrabold text-stone-900 dark:text-zinc-100">{b.roomNumber}</p>
                  {b.floor && <p className="text-[10px] text-stone-400 dark:text-zinc-500">{t("floorLabel")} {b.floor}</p>}
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <div className="flex items-center gap-1 text-xs text-stone-600 dark:text-zinc-400">
                    <Users className="h-3 w-3 text-stone-400 dark:text-zinc-500" /> {b.guestCount}
                  </div>
                </td>
                {hasNotes && (
                  <td className="px-4 py-3 max-w-[160px]">
                    {b.notes && (
                      <p className="text-xs text-stone-400 dark:text-zinc-500 italic truncate cursor-default" title={b.notes}>
                        {b.notes}
                      </p>
                    )}
                  </td>
                )}
                <td className="px-4 py-3 whitespace-nowrap">
                  {b.status !== "PENDING" && (
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded border ${BOOKING_STATUS_PILL[b.status]}`}>
                      {b.status === "CONFIRMED" ? t("confirmedStatus") : t("cancelledStatus")}
                    </span>
                  )}
                </td>
                {hasActions && (
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    {updatingId === b.id ? (
                      <Loader2 className="h-4 w-4 animate-spin text-stone-400 ml-auto" />
                    ) : b.status === "PENDING" ? (
                      <div className="inline-flex gap-1">
                        <button onClick={() => onUpdateStatus(b.id, "CONFIRMED", b)}
                          className="text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700
                            rounded px-2.5 py-1 transition-colors">
                          {t("confirmBtn")}
                        </button>
                        <button onClick={() => onUpdateStatus(b.id, "CANCELLED", b)}
                          className="text-xs font-bold text-red-500 border border-red-200 hover:bg-red-50
                            rounded px-2.5 py-1 transition-colors">
                          {t("cancelBtn")}
                        </button>
                      </div>
                    ) : b.status === "CONFIRMED" ? (
                      <button onClick={() => onUpdateStatus(b.id, "CANCELLED", b)}
                        className="text-xs text-stone-400 hover:text-red-500 transition-colors">
                        {t("cancelBtn")}
                      </button>
                    ) : null}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────


type Tab = "ACTIVE" | "COMPLETED" | "CANCELLED" | "PASTDUE";

interface Confirming {
  title: string;
  message?: string;
  confirmLabel: string;
  danger?: boolean;
  action: () => void;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const { t } = useLang();
  const [requests, setRequests]   = useState<ServiceRequest[]>([]);
  const [bookings, setBookings]   = useState<Booking[]>([]);
  const [loading, setLoading]     = useState(true);
  const { pendingTarget, setPendingTarget } = useNotifications();
  const [updatingId, setUpdatingId]             = useState<number | null>(null);
  const [updatingBookingId, setUpdatingBookingId] = useState<number | null>(null);
  const [tab, setTab]             = useState<Tab>("ACTIVE");
  const [declining, setDeclining]   = useState<ServiceRequest | null>(null);
  const [confirming, setConfirming] = useState<Confirming | null>(null);
  const [accepting, setAccepting]   = useState<ServiceRequest | null>(null);
  const [hotelEta, setHotelEta]     = useState(20);
  const [soundOn, setSoundOn]       = useState(() => localStorage.getItem("eco_sound") !== "off");
  const [highlightedId, setHighlightedId] = useState<number | null>(null);

  // Scroll to + highlight request when notification clicked from any page
  useEffect(() => {
    if (!pendingTarget) return;
    setTab("ACTIVE");
    setHighlightedId(pendingTarget);
    setTimeout(() => {
      document.getElementById(`request-${pendingTarget}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 150);
    setTimeout(() => { setHighlightedId(null); setPendingTarget(null); }, 3000);
  }, [pendingTarget]);

  const authH = () => ({ Authorization: `Bearer ${getToken()}`, "Content-Type": "application/json" });

  const fetchRequests = async () => {
    const res = await fetch("/api/dashboard/requests", { headers: authH() });
    if (res.ok) setRequests(await res.json());
    setLoading(false);
  };

  const fetchBookings = async () => {
    const res = await fetch("/api/dashboard/bookings/all", { headers: authH() });
    if (res.ok) setBookings(await res.json());
  };

  useEffect(() => {
    fetchRequests();
    if (user?.role === "ADMIN") fetchBookings();
    requestNotifyPermission();
    // Fetch hotel ETA default
    fetch("/api/dashboard/hotel", { headers: authH() })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.etaMinutes) setHotelEta(d.etaMinutes); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const es = new EventSource(`/api/dashboard/stream?token=${getToken()}`);
    es.addEventListener("request", (e: MessageEvent) => {
      fetchRequests();
      if (soundOn) playAlertSound();
      try {
        const data = JSON.parse(e.data ?? "{}");
        showNotification(`New Request — Room ${data.roomNumber ?? ""}`, data.itemName ?? "New request");
      } catch { showNotification("New Request", "A guest has made a new request"); }
    });
    return () => es.close();
  }, [soundOn]);


  const updateStatus = async (id: number, status: string, comment?: string, etaMinutes?: number) => {
    setUpdatingId(id);
    const body: Record<string, string | number> = { status };
    if (comment) body.comment = comment;
    if (etaMinutes != null) body.etaMinutes = etaMinutes;
    const res = await fetch(`/api/dashboard/requests/${id}/status`, {
      method: "PATCH", headers: authH(), body: JSON.stringify(body),
    });
    if (res.ok) {
      const updated = await res.json();
      setRequests(prev => prev.map(r => r.id === id ? updated : r));
    }
    setUpdatingId(null);
  };

  const updateBookingStatus = async (id: number, status: string) => {
    setUpdatingBookingId(id);
    const res = await fetch(`/api/dashboard/bookings/${id}/status`, {
      method: "PATCH", headers: authH(), body: JSON.stringify({ status }),
    });
    if (res.ok)
      setBookings(prev => prev.map(b => b.id === id ? { ...b, status: status as Booking["status"] } : b));
    setUpdatingBookingId(null);
  };

  const confirm = (opts: Confirming) => setConfirming(opts);

  // ── Tab data ──────────────────────────────────────────────────────────────
  const active    = requests.filter(r => r.status === "PENDING" || r.status === "IN_PROGRESS");
  const completed = requests.filter(r => r.status === "DONE");
  const cancelled = requests.filter(r => r.status === "CANCELLED" || r.status === "DECLINED");

  const overduePending  = active.filter(r => r.status === "PENDING"     && ageMinutes(r.createdAt) > OVERDUE_PENDING_MINS);
  const escalatedInProg = active.filter(r => r.status === "IN_PROGRESS" && r.acceptedAt && ageMinutes(r.acceptedAt) > ESCALATED_IN_PROG_MINS);
  const pastDue = [...overduePending, ...escalatedInProg]
    .filter((r, i, arr) => arr.findIndex(x => x.id === r.id) === i);

  const currentRequests =
    tab === "ACTIVE"    ? active :
    tab === "COMPLETED" ? completed :
    tab === "PASTDUE"   ? pastDue :
                          cancelled;

  const tabBookings =
    tab === "ACTIVE"    ? bookings.filter(b => b.status === "PENDING") :
    tab === "COMPLETED" ? bookings.filter(b => b.status === "CONFIRMED") :
    tab === "CANCELLED" ? bookings.filter(b => b.status === "CANCELLED") :
                          [];

  // ── Unified date-based grouping ───────────────────────────────────────────
  const todayStr = new Date().toISOString().slice(0, 10);

  const reqsByDate: Record<string, ServiceRequest[]> = {};
  for (const r of currentRequests) {
    const k = r.createdAt.slice(0, 10);
    (reqsByDate[k] ??= []).push(r);
  }

  const bookingsByDateItem: Record<string, Record<string, Booking[]>> = {};
  for (const b of tabBookings) {
    const k = b.slotTimeIso.slice(0, 10);
    if (!bookingsByDateItem[k]) bookingsByDateItem[k] = {};
    (bookingsByDateItem[k][b.itemName] ??= []).push(b);
  }

  const allDates = Array.from(new Set([
    ...Object.keys(reqsByDate),
    ...Object.keys(bookingsByDateItem),
  ])).sort((a, b) => {
    const aFuture = a >= todayStr, bFuture = b >= todayStr;
    if (aFuture && bFuture)   return a.localeCompare(b);
    if (!aFuture && !bFuture) return b.localeCompare(a);
    return aFuture ? -1 : 1;
  });

  const isEmpty = allDates.length === 0;

  const TabBtn = ({ tabId, label, count, urgent }: {
    tabId: Tab; label: string; count?: number; urgent?: boolean;
  }) => (
    <button
      onClick={() => setTab(tabId)}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold transition-colors
        ${tab === tabId
          ? urgent ? "bg-orange-600 text-white shadow-sm" : "bg-brand-700 text-white shadow-sm"
          : urgent && (count ?? 0) > 0
            ? "bg-white/70 dark:bg-zinc-800/70 text-orange-700 border border-orange-300 hover:border-orange-400"
            : "bg-white/70 dark:bg-zinc-800/70 text-stone-500 dark:text-zinc-400 border border-stone-200 dark:border-zinc-700 hover:border-stone-300 dark:hover:border-zinc-600"}`}
    >
      {label}
      <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded
        ${tab === tabId
          ? "bg-white/20 text-white"
          : urgent && (count ?? 0) > 0 ? "bg-orange-100 dark:bg-orange-900/30 text-orange-700" : "bg-stone-100 dark:bg-zinc-700 text-stone-500 dark:text-zinc-400"}`}>
        {count}
      </span>
    </button>
  );

  return (
    <div className="min-h-screen">

      <NavBar />

      <div className="max-w-7xl mx-auto px-4 py-6 space-y-5">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-stone-900 dark:text-zinc-100">{t("serviceRequests")}</h1>
            <p className="text-xs text-stone-400 dark:text-zinc-500">{user?.fullName}</p>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => {
              const next = !soundOn;
              setSoundOn(next);
              localStorage.setItem("eco_sound", next ? "on" : "off");
            }}
              className="p-2 text-stone-400 hover:text-brand-700 transition-colors"
              title={soundOn ? "Mute sound alerts" : "Enable sound alerts"}>
              {soundOn ? <Bell className="h-4 w-4" /> : <BellOff className="h-4 w-4" />}
            </button>
            <button onClick={() => { fetchRequests(); if (user?.role === "ADMIN") fetchBookings(); }}
              className="p-2 text-stone-400 hover:text-brand-700 transition-colors" title={t("refresh")}>
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-2 flex-wrap">
          <TabBtn tabId="ACTIVE"    label={t("active")}       count={active.length} />
          <TabBtn tabId="PASTDUE"   label={t("pastDue")}      count={pastDue.length} urgent={pastDue.length > 0} />
          <TabBtn tabId="COMPLETED" label={t("completedTab")} count={completed.length} />
          <TabBtn tabId="CANCELLED" label={t("cancelledTab")} count={cancelled.length} />
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-brand-700" />
          </div>
        ) : isEmpty ? (
          <div className="text-center py-20">
            <ConciergeBell className="h-12 w-12 text-stone-200 mx-auto mb-3" />
            <p className="text-stone-400 text-sm">{t("noRequests")}</p>
          </div>

        ) : (
          <div className="space-y-6">
            {allDates.map(dateStr => {
              const dayReqs = [...(reqsByDate[dateStr] ?? [])].sort((a, b) =>
                a.roomNumber.localeCompare(b.roomNumber, undefined, { numeric: true })
              );
              const dayOverdue   = new Set(dayReqs.filter(r => overduePending.some(o => o.id === r.id)).map(r => r.id));
              const dayEscalated = new Set(dayReqs.filter(r => escalatedInProg.some(e => e.id === r.id)).map(r => r.id));
              const dayBookingItems = Object.entries(bookingsByDateItem[dateStr] ?? {});

              return (
                <div key={dateStr} className="space-y-2">
                  {/* Date label */}
                  <div className="flex items-center gap-3 px-1">
                    <p className="text-xs font-bold text-stone-500 dark:text-zinc-400 uppercase tracking-wider whitespace-nowrap">
                      {formatDateHeader(dateStr, t)}
                    </p>
                    <div className="flex-1 h-px bg-stone-200 dark:bg-zinc-700" />
                  </div>

                  {/* Service requests */}
                  {dayReqs.length > 0 && (
                    <div className="glass rounded overflow-hidden">
                      <RequestTable
                        requests={dayReqs}
                        updatingId={updatingId}
                        onAccept={req => setAccepting(req)}
                        onDone={id => confirm({
                          title: t("markAsDone"),
                          message: t("markDoneMessage"),
                          confirmLabel: t("markDone"),
                          action: () => updateStatus(id, "DONE"),
                        })}
                        onDecline={setDeclining}
                        overdueIds={dayOverdue}
                        escalatedIds={dayEscalated}
                        highlightedId={highlightedId}
                      />
                    </div>
                  )}

                  {/* Booking sections per service */}
                  {dayBookingItems.map(([itemName, itemBookings]) => (
                    <BookingSection
                      key={itemName}
                      itemName={itemName}
                      itemNameAm={itemBookings[0]?.itemNameAm}
                      bookings={itemBookings}
                      updatingId={updatingBookingId}
                      onUpdateStatus={(id, status, booking) => {
                        const gLabel = booking.guestCount !== 1 ? t("guestPlural") : t("guestSingular");
                        const msg = `${booking.itemName} · ${t("roomCol")} ${booking.roomNumber} · ${booking.guestCount} ${gLabel} · ${booking.slotDate} ${t("at")} ${booking.slotTime}`;
                        if (status === "CONFIRMED") {
                          confirm({
                            title: t("confirmThisBooking"),
                            message: msg,
                            confirmLabel: t("confirmBookingBtn"),
                            action: () => updateBookingStatus(id, "CONFIRMED"),
                          });
                        } else {
                          confirm({
                            title: t("cancelThisBooking"),
                            message: msg,
                            confirmLabel: t("cancelBookingBtn"),
                            danger: true,
                            action: () => updateBookingStatus(id, "CANCELLED"),
                          });
                        }
                      }}
                    />
                  ))}
                </div>
              );
            })}

            {currentRequests.length > 0 && (
              <p className="text-xs text-stone-400 text-center pb-2">
                {currentRequests.length} {currentRequests.length !== 1 ? t("requestCol") + "s" : t("requestCol")} · {t("autoUpdates")}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Accept modal (ETA) */}
      {accepting && (
        <AcceptModal
          req={accepting}
          defaultEta={hotelEta}
          onConfirm={eta => {
            updateStatus(accepting.id, "IN_PROGRESS", undefined, eta);
            setAccepting(null);
          }}
          onCancel={() => setAccepting(null)}
        />
      )}

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

      {/* Confirm modal */}
      {confirming && (
        <ConfirmModal
          title={confirming.title}
          message={confirming.message}
          confirmLabel={confirming.confirmLabel}
          danger={confirming.danger}
          onConfirm={() => { confirming.action(); setConfirming(null); }}
          onCancel={() => setConfirming(null)}
        />
      )}
    </div>
  );
}
