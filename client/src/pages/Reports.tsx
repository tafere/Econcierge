import { useEffect, useState } from "react";
import { getToken } from "@/lib/auth";
import { useLang } from "@/lib/lang";
import NavBar from "@/components/NavBar";
import { Loader2 } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid,
  PieChart, Pie, Cell,
} from "recharts";

// ─── Types ─────────────────────────────────────────────────────────────────────

interface Analytics {
  kpi: { todayCount: number; openCount: number; completionRate: number; avgResponseMins: number };
  byCategory:  { category: string; count: number }[];
  byHour:      { hour: string; count: number }[];
  byDay:       { date: string; count: number }[];
  topItems:    { item: string; count: number }[];
  leaderboard: { name: string; handled: number; avgMins: number }[];
}

function fmtMins(mins: number): string {
  if (mins < 1)   return "< 1 min";
  if (mins < 60)  return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h < 24)     return m > 0 ? `${h}h ${m}m` : `${h}h`;
  const d = Math.floor(h / 24);
  const rh = h % 24;
  return rh > 0 ? `${d}d ${rh}h` : `${d}d`;
}

const tooltipStyle = {
  contentStyle: { fontSize: 12, borderRadius: 6, border: "1px solid #e7e5e4" },
  itemStyle:    { color: "#44403c" },
};

const PIE_COLORS = [
  "#92400e","#b45309","#d97706","#f59e0b",
  "#059669","#0891b2","#7c3aed","#db2777",
];

function Card({ children }: { children: React.ReactNode }) {
  return <div className="glass rounded p-5">{children}</div>;
}

// ─── Toggled chart ────────────────────────────────────────────────────────────

type ChartTab = "volume" | "category";

function RequestsChart({ byDay, byCategory }: {
  byDay: Analytics["byDay"];
  byCategory: Analytics["byCategory"];
}) {
  const { t } = useLang();
  const [view, setView] = useState<ChartTab>("volume");

  const btn = (v: ChartTab, label: string) =>
    `px-3 py-1 text-xs font-semibold rounded transition-colors
    ${view === v ? "bg-brand-700 text-white" : "text-stone-500 dark:text-zinc-400 hover:text-stone-700 dark:hover:text-zinc-200 hover:bg-stone-100 dark:hover:bg-zinc-700"}`;

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs font-bold text-stone-400 dark:text-zinc-500 uppercase tracking-wider">
          {view === "volume" ? t("requestVolume") : t("requestsByCategory")}
        </p>
        <div className="flex gap-1 bg-stone-100 dark:bg-zinc-700 rounded p-0.5">
          <button className={btn("volume",   t("volumeLabel"))}   onClick={() => setView("volume")}>{t("volumeLabel")}</button>
          <button className={btn("category", t("categoryLabel"))} onClick={() => setView("category")}>{t("categoryLabel")}</button>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={240}>
        {view === "volume" ? (
          <BarChart data={byDay} margin={{ left: 0, right: 16 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f4" vertical={false} />
            <XAxis dataKey="date" tick={{ fontSize: 12 }} />
            <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
            <Tooltip {...tooltipStyle} />
            <Bar dataKey="count" name={t("requestCol")} fill="rgb(var(--brand-700))" radius={[4, 4, 0, 0]} />
          </BarChart>
        ) : (
          <BarChart data={byCategory} layout="vertical" margin={{ left: 8, right: 24 }}>
            <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
            <YAxis type="category" dataKey="category" tick={{ fontSize: 11 }} width={115} />
            <Tooltip {...tooltipStyle} />
            <Bar dataKey="count" name={t("requestCol")} fill="rgb(var(--brand-700))" radius={[0, 4, 4, 0]} />
          </BarChart>
        )}
      </ResponsiveContainer>
    </Card>
  );
}

// ─── Top items donut ────────────────────────────────────────────────────────

function TopItemsChart({ items }: { items: Analytics["topItems"] }) {
  const { t } = useLang();
  const total = items.reduce((s, i) => s + i.count, 0);

  const renderLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: {
    cx: number; cy: number; midAngle: number;
    innerRadius: number; outerRadius: number; percent: number;
  }) => {
    if (percent < 0.05) return null;
    const RADIAN = Math.PI / 180;
    const r = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + r * Math.cos(-midAngle * RADIAN);
    const y = cy + r * Math.sin(-midAngle * RADIAN);
    return (
      <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central"
        fontSize={11} fontWeight="700">
        {Math.round(percent * 100)}%
      </text>
    );
  };

  return (
    <Card>
      <p className="text-xs font-bold text-stone-400 dark:text-zinc-500 uppercase tracking-wider mb-4">
        {t("topItems")}
      </p>
      {items.length === 0 ? (
        <p className="text-sm text-stone-400 dark:text-zinc-500">{t("noRequestsYet")}</p>
      ) : (
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <ResponsiveContainer width={220} height={220}>
            <PieChart>
              <Pie data={items} dataKey="count" nameKey="item"
                cx="50%" cy="50%" innerRadius={55} outerRadius={95}
                labelLine={false} label={renderLabel}>
                {items.map((_, i) => (
                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: number, name: string) =>
                  [`${value} (${Math.round(value / total * 100)}%)`, name]}
                {...tooltipStyle}
              />
            </PieChart>
          </ResponsiveContainer>

          <div className="flex-1 space-y-1.5 w-full">
            {items.map((item, i) => (
              <div key={item.item} className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full shrink-0"
                  style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                <span className="text-xs text-stone-600 dark:text-zinc-400 font-medium truncate flex-1">{item.item}</span>
                <span className="text-xs font-bold text-stone-500 dark:text-zinc-400 shrink-0">{item.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}

// ─── Main ───────────────────────────────────────────────────────────────────

export default function ReportsPage() {
  const { t } = useLang();
  const [data, setData]       = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getToken();
    fetch("/api/dashboard/analytics", { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : null)
      .then(d => { setData(d); setLoading(false); });
  }, []);

  return (
    <div className="min-h-screen">
      <NavBar />
      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">

        <div>
          <h1 className="text-lg font-bold text-stone-900 dark:text-zinc-100">{t("reportsTitle")}</h1>
          <p className="text-xs text-stone-400 dark:text-zinc-500">{t("reportsSubtitle")}</p>
        </div>

        {loading ? (
          <div className="flex justify-center py-24">
            <Loader2 className="h-6 w-6 animate-spin text-brand-700" />
          </div>
        ) : !data ? (
          <p className="text-center text-stone-400 py-24">{t("couldNotLoad")}</p>
        ) : (
          <>
            {/* ── KPI Cards ────────────────────────────────────────────── */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { labelKey: "requestsToday",   value: data.kpi.todayCount,            subKey: "last24h" },
                { labelKey: "openNow",          value: data.kpi.openCount,             subKey: "pendingInProgress" },
                { labelKey: "completionRate",   value: `${data.kpi.completionRate}%`,  subKey: "doneVsClosed" },
                { labelKey: "avgResponseTime",  value: fmtMins(data.kpi.avgResponseMins), subKey: "timeToAccept" },
              ].map(({ labelKey, value, subKey }) => (
                <div key={labelKey} className="glass rounded px-4 py-4">
                  <p className="text-[11px] font-semibold text-stone-400 dark:text-zinc-500 uppercase tracking-wider">{t(labelKey)}</p>
                  <p className="text-3xl font-extrabold text-stone-900 dark:text-zinc-100 mt-1">{value}</p>
                  <p className="text-[10px] text-stone-400 dark:text-zinc-500 mt-1">{t(subKey)}</p>
                </div>
              ))}
            </div>

            {/* ── Toggled chart + Hour line ─────────────────────────────── */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <RequestsChart byDay={data.byDay} byCategory={data.byCategory} />

              <Card>
                <p className="text-xs font-bold text-stone-400 dark:text-zinc-500 uppercase tracking-wider mb-4">
                  {t("requestsByHour")}
                </p>
                <ResponsiveContainer width="100%" height={240}>
                  <LineChart data={data.byHour} margin={{ left: 0, right: 16 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f4" />
                    <XAxis dataKey="hour" tick={{ fontSize: 10 }} interval={3} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                    <Tooltip {...tooltipStyle} />
                    <Line type="monotone" dataKey="count" name={t("requestCol")}
                      stroke="rgb(var(--brand-700))" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </Card>
            </div>

            {/* ── Leaderboard + Top items donut ─────────────────────────── */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <p className="text-xs font-bold text-stone-400 dark:text-zinc-500 uppercase tracking-wider mb-4">
                  {t("staffLeaderboard")}
                </p>
                {data.leaderboard.length === 0 ? (
                  <p className="text-sm text-stone-400 dark:text-zinc-500">{t("noCompletedYet")}</p>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-stone-100 dark:border-zinc-700/50">
                        <th className="text-left py-2 text-xs font-semibold text-stone-400 dark:text-zinc-500 uppercase tracking-wider">#</th>
                        <th className="text-left py-2 text-xs font-semibold text-stone-400 dark:text-zinc-500 uppercase tracking-wider">{t("navStaff")}</th>
                        <th className="text-right py-2 text-xs font-semibold text-stone-400 dark:text-zinc-500 uppercase tracking-wider">{t("handledCol")}</th>
                        <th className="text-right py-2 text-xs font-semibold text-stone-400 dark:text-zinc-500 uppercase tracking-wider">{t("avgTimeCol")}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-50 dark:divide-zinc-700/30">
                      {data.leaderboard.map((s, i) => (
                        <tr key={s.name}>
                          <td className="py-2.5 text-xs text-stone-400 dark:text-zinc-500 font-bold w-6">{i + 1}</td>
                          <td className="py-2.5 font-semibold text-stone-800 dark:text-zinc-200">{s.name}</td>
                          <td className="py-2.5 text-right">
                            <span className="text-xs font-bold text-white bg-brand-700 rounded px-2 py-0.5">{s.handled}</span>
                          </td>
                          <td className="py-2.5 text-right text-xs text-stone-400 dark:text-zinc-500">{fmtMins(s.avgMins)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </Card>

              <TopItemsChart items={data.topItems} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
