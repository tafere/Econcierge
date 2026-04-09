import { useEffect, useState } from "react";
import { getToken } from "@/lib/auth";
import NavBar from "@/components/NavBar";
import { Loader2 } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid,
  PieChart, Pie, Cell, Legend,
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

const tooltipStyle = {
  contentStyle: { fontSize: 12, borderRadius: 6, border: "1px solid #e7e5e4" },
  itemStyle:    { color: "#44403c" },
};

// Distinct palette for pie slices
const PIE_COLORS = [
  "#92400e","#b45309","#d97706","#f59e0b",
  "#059669","#0891b2","#7c3aed","#db2777",
];

function Card({ children }: { children: React.ReactNode }) {
  return <div className="glass rounded p-5">{children}</div>;
}

// ─── Toggled chart: Volume vs Category ─────────────────────────────────────

type ChartTab = "volume" | "category";

function RequestsChart({ byDay, byCategory }: {
  byDay: Analytics["byDay"];
  byCategory: Analytics["byCategory"];
}) {
  const [view, setView] = useState<ChartTab>("volume");

  const btn = (v: ChartTab, label: string) =>
    `px-3 py-1 text-xs font-semibold rounded transition-colors
    ${view === v ? "bg-brand-700 text-white" : "text-stone-500 hover:text-stone-700 hover:bg-stone-100"}`;

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs font-bold text-stone-400 uppercase tracking-wider">
          {view === "volume" ? "Request Volume — last 7 days" : "Requests by Category — last 7 days"}
        </p>
        <div className="flex gap-1 bg-stone-100 rounded p-0.5">
          <button className={btn("volume",   "Volume")}   onClick={() => setView("volume")}>Volume</button>
          <button className={btn("category", "Category")} onClick={() => setView("category")}>Category</button>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={240}>
        {view === "volume" ? (
          <BarChart data={byDay} margin={{ left: 0, right: 16 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f4" vertical={false} />
            <XAxis dataKey="date" tick={{ fontSize: 12 }} />
            <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
            <Tooltip {...tooltipStyle} />
            <Bar dataKey="count" name="Requests" fill="rgb(var(--brand-700))" radius={[4, 4, 0, 0]} />
          </BarChart>
        ) : (
          <BarChart data={byCategory} layout="vertical" margin={{ left: 8, right: 24 }}>
            <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
            <YAxis type="category" dataKey="category" tick={{ fontSize: 11 }} width={115} />
            <Tooltip {...tooltipStyle} />
            <Bar dataKey="count" name="Requests" fill="rgb(var(--brand-700))" radius={[0, 4, 4, 0]} />
          </BarChart>
        )}
      </ResponsiveContainer>
    </Card>
  );
}

// ─── Top items donut ────────────────────────────────────────────────────────

function TopItemsChart({ items }: { items: Analytics["topItems"] }) {
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
      <p className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-4">
        Top Requested Items — last 30 days
      </p>
      {items.length === 0 ? (
        <p className="text-sm text-stone-400">No requests yet.</p>
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

          {/* Legend list */}
          <div className="flex-1 space-y-1.5 w-full">
            {items.map((item, i) => (
              <div key={item.item} className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full shrink-0"
                  style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                <span className="text-xs text-stone-600 font-medium truncate flex-1">{item.item}</span>
                <span className="text-xs font-bold text-stone-500 shrink-0">{item.count}</span>
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
          <h1 className="text-lg font-bold text-stone-900">Reports &amp; Analytics</h1>
          <p className="text-xs text-stone-400">Live snapshot of your hotel's service performance</p>
        </div>

        {loading ? (
          <div className="flex justify-center py-24">
            <Loader2 className="h-6 w-6 animate-spin text-brand-700" />
          </div>
        ) : !data ? (
          <p className="text-center text-stone-400 py-24">Could not load analytics.</p>
        ) : (
          <>
            {/* ── KPI Cards ────────────────────────────────────────────── */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: "Requests Today",    value: data.kpi.todayCount,            sub: "last 24 h" },
                { label: "Open Now",          value: data.kpi.openCount,             sub: "pending + in progress" },
                { label: "Completion Rate",   value: `${data.kpi.completionRate}%`,  sub: "done vs closed · 7 days" },
                { label: "Avg Response Time", value: `${data.kpi.avgResponseMins}m`, sub: "time to accept · 7 days" },
              ].map(({ label, value, sub }) => (
                <div key={label} className="glass rounded px-4 py-4">
                  <p className="text-[11px] font-semibold text-stone-400 uppercase tracking-wider">{label}</p>
                  <p className="text-3xl font-extrabold text-stone-900 mt-1">{value}</p>
                  <p className="text-[10px] text-stone-400 mt-1">{sub}</p>
                </div>
              ))}
            </div>

            {/* ── Toggled chart + Hour line ─────────────────────────────── */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <RequestsChart byDay={data.byDay} byCategory={data.byCategory} />

              <Card>
                <p className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-4">
                  Requests by Hour — today
                </p>
                <ResponsiveContainer width="100%" height={240}>
                  <LineChart data={data.byHour} margin={{ left: 0, right: 16 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f4" />
                    <XAxis dataKey="hour" tick={{ fontSize: 10 }} interval={3} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                    <Tooltip {...tooltipStyle} />
                    <Line type="monotone" dataKey="count" name="Requests"
                      stroke="rgb(var(--brand-700))" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </Card>
            </div>

            {/* ── Leaderboard + Top items donut ─────────────────────────── */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <p className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-4">
                  Staff Leaderboard — last 30 days
                </p>
                {data.leaderboard.length === 0 ? (
                  <p className="text-sm text-stone-400">No completed requests yet.</p>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-stone-100">
                        <th className="text-left py-2 text-xs font-semibold text-stone-400 uppercase tracking-wider">#</th>
                        <th className="text-left py-2 text-xs font-semibold text-stone-400 uppercase tracking-wider">Staff</th>
                        <th className="text-right py-2 text-xs font-semibold text-stone-400 uppercase tracking-wider">Handled</th>
                        <th className="text-right py-2 text-xs font-semibold text-stone-400 uppercase tracking-wider">Avg Time</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-50">
                      {data.leaderboard.map((s, i) => (
                        <tr key={s.name}>
                          <td className="py-2.5 text-xs text-stone-400 font-bold w-6">{i + 1}</td>
                          <td className="py-2.5 font-semibold text-stone-800">{s.name}</td>
                          <td className="py-2.5 text-right">
                            <span className="text-xs font-bold text-white bg-brand-700 rounded px-2 py-0.5">{s.handled}</span>
                          </td>
                          <td className="py-2.5 text-right text-xs text-stone-400">{s.avgMins} min</td>
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
