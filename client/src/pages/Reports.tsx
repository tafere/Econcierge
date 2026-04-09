import { useEffect, useState } from "react";
import { getToken } from "@/lib/auth";
import NavBar from "@/components/NavBar";
import { Loader2 } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid,
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

// ─── Tooltip styles ─────────────────────────────────────────────────────────

const tooltipStyle = {
  contentStyle: { fontSize: 12, borderRadius: 6, border: "1px solid #e7e5e4" },
  itemStyle:    { color: "#44403c" },
};

// ─── Section wrapper ────────────────────────────────────────────────────────

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="glass rounded p-5">
      <p className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-4">{title}</p>
      {children}
    </div>
  );
}

// ─── Main ───────────────────────────────────────────────────────────────────

export default function ReportsPage() {
  const [data, setData]       = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getToken();
    fetch("/api/dashboard/analytics", {
      headers: { Authorization: `Bearer ${token}` },
    })
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
            {/* ── KPI Cards ─────────────────────────────────────────────── */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: "Requests Today",    value: data.kpi.todayCount,            sub: "last 24 h" },
                { label: "Open Now",          value: data.kpi.openCount,             sub: "pending + in progress" },
                { label: "Completion Rate",   value: `${data.kpi.completionRate}%`,  sub: "done vs closed (7 days)" },
                { label: "Avg Response Time", value: `${data.kpi.avgResponseMins}m`, sub: "time to accept (7 days)" },
              ].map(({ label, value, sub }) => (
                <div key={label} className="glass rounded px-4 py-4">
                  <p className="text-[11px] font-semibold text-stone-400 uppercase tracking-wider">{label}</p>
                  <p className="text-3xl font-extrabold text-stone-900 mt-1">{value}</p>
                  <p className="text-[10px] text-stone-400 mt-1">{sub}</p>
                </div>
              ))}
            </div>

            {/* ── Row 1: Category bar + Hour line ───────────────────────── */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card title="Requests by Category — last 7 days">
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={data.byCategory} layout="vertical" margin={{ left: 8, right: 16 }}>
                    <XAxis type="number" tick={{ fontSize: 11 }} />
                    <YAxis type="category" dataKey="category" tick={{ fontSize: 11 }} width={110} />
                    <Tooltip {...tooltipStyle} />
                    <Bar dataKey="count" name="Requests" fill="rgb(var(--brand-700))" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Card>

              <Card title="Requests by Hour — today">
                <ResponsiveContainer width="100%" height={220}>
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

            {/* ── Row 2: Staff leaderboard + Top items ──────────────────── */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card title="Staff Leaderboard — last 30 days">
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

              <Card title="Top Requested Items — last 30 days">
                {data.topItems.length === 0 ? (
                  <p className="text-sm text-stone-400">No requests yet.</p>
                ) : (
                  <div className="space-y-2.5">
                    {data.topItems.map((item, i) => {
                      const max = data.topItems[0].count;
                      const pct = Math.round((item.count / max) * 100);
                      return (
                        <div key={item.item}>
                          <div className="flex items-center justify-between mb-0.5">
                            <span className="text-xs font-semibold text-stone-700 truncate max-w-[70%]">
                              {i + 1}. {item.item}
                            </span>
                            <span className="text-xs font-bold text-stone-500">{item.count}</span>
                          </div>
                          <div className="h-1.5 bg-stone-100 rounded-full overflow-hidden">
                            <div className="h-full bg-brand-700 rounded-full transition-all"
                              style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </Card>
            </div>

            {/* ── Row 3: 7-day trend ────────────────────────────────────── */}
            <Card title="Request Volume — last 7 days">
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={data.byDay} margin={{ left: 0, right: 16 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f4" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip {...tooltipStyle} />
                  <Bar dataKey="count" name="Requests" fill="rgb(var(--brand-700))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
