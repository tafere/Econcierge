import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { getToken } from "@/lib/auth";
import {
  ConciergeBell, ArrowLeft, Plus, Loader2, Users,
  ShieldCheck, ToggleLeft, ToggleRight, Trash2, Eye, EyeOff,
} from "lucide-react";

interface StaffMember {
  id: number;
  username: string;
  fullName: string;
  role: string;
  enabled: boolean;
}

const ROLES = [
  { value: "STAFF",                label: "Staff (General)" },
  { value: "HOUSEKEEPING",         label: "Housekeeping" },
  { value: "MAINTENANCE",          label: "Maintenance" },
  { value: "TRANSPORT",            label: "Transport" },
  { value: "RESTAURANT",           label: "Restaurant" },
  { value: "CAFE_BAR",             label: "Cafe & Bar" },
  { value: "SPA",                  label: "Spa" },
  { value: "GYM",                  label: "Gym" },
  { value: "MEETING_CONFERENCE",   label: "Meeting & Conference" },
];

const ROLE_COLOR: Record<string, string> = {
  STAFF:                "bg-stone-100 text-stone-600",
  HOUSEKEEPING:         "bg-green-100 text-green-700",
  MAINTENANCE:          "bg-blue-100 text-blue-700",
  TRANSPORT:            "bg-purple-100 text-purple-700",
  RESTAURANT:           "bg-orange-100 text-orange-700",
  CAFE_BAR:             "bg-amber-100 text-amber-700",
  SPA:                  "bg-pink-100 text-pink-700",
  GYM:                  "bg-red-100 text-red-700",
  MEETING_CONFERENCE:   "bg-indigo-100 text-indigo-700",
};

const ROLE_LABEL: Record<string, string> = Object.fromEntries(ROLES.map(r => [r.value, r.label]));

export default function StaffManagementPage() {
  const [, navigate] = useLocation();
  const [staff, setStaff]     = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [error, setError]     = useState<string | null>(null);
  const [adding, setAdding]   = useState(false);
  const [showPwd, setShowPwd] = useState(false);

  const [form, setForm] = useState({ fullName: "", username: "", password: "", role: "HOUSEKEEPING" });

  const headers = () => ({ Authorization: `Bearer ${getToken()}`, "Content-Type": "application/json" });

  const fetchStaff = async () => {
    const res = await fetch("/api/dashboard/staff-mgmt", { headers: { Authorization: `Bearer ${getToken()}` } });
    if (res.ok) setStaff(await res.json());
    setLoading(false);
  };

  useEffect(() => { fetchStaff(); }, []);

  const addStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdding(true);
    setError(null);
    const res = await fetch("/api/dashboard/staff-mgmt", {
      method: "POST",
      headers: headers(),
      body: JSON.stringify(form),
    });
    if (res.ok) {
      await fetchStaff();
      setShowAdd(false);
      setForm({ fullName: "", username: "", password: "", role: "HOUSEKEEPING" });
    } else {
      const d = await res.json().catch(() => ({}));
      setError(d.error || "Failed to create staff member");
    }
    setAdding(false);
  };

  const toggle = async (id: number) => {
    const res = await fetch(`/api/dashboard/staff-mgmt/${id}/toggle`, {
      method: "PATCH", headers: headers(),
    });
    if (res.ok) {
      const d = await res.json();
      setStaff(prev => prev.map(s => s.id === id ? { ...s, enabled: d.enabled } : s));
    }
  };

  const remove = async (id: number, name: string) => {
    if (!confirm(`Remove ${name}? This cannot be undone.`)) return;
    const res = await fetch(`/api/dashboard/staff-mgmt/${id}`, {
      method: "DELETE", headers: headers(),
    });
    if (res.ok) setStaff(prev => prev.filter(s => s.id !== id));
  };

  const inputCls = "w-full h-10 border border-stone-200 bg-white rounded px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-700";

  return (
    <div className="min-h-screen">
      <nav className="bg-brand-700 text-white px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ConciergeBell className="h-5 w-5" />
            <span className="font-bold text-sm">Staff Management</span>
          </div>
          <button onClick={() => navigate("/")}
            className="flex items-center gap-1.5 text-xs text-amber-200 hover:text-white transition-colors">
            <ArrowLeft className="h-4 w-4" /> Dashboard
          </button>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-stone-900">Staff Members</h1>
            <p className="text-sm text-stone-400">{staff.length} staff configured</p>
          </div>
          <button
            onClick={() => { setShowAdd(true); setError(null); }}
            className="flex items-center gap-1.5 bg-brand-700 text-white text-sm font-semibold
              px-4 py-2 rounded hover:bg-brand-800 transition-colors"
          >
            <Plus className="h-4 w-4" /> Add Staff
          </button>
        </div>

        {/* Add form */}
        {showAdd && (
          <form onSubmit={addStaff} className="glass rounded p-5 space-y-4">
            <h3 className="font-semibold text-stone-800 flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-brand-700" /> New Staff Member
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-stone-500 uppercase tracking-wider block mb-1">Full Name *</label>
                <input value={form.fullName} onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))}
                  required placeholder="e.g. John Doe" className={inputCls} />
              </div>
              <div>
                <label className="text-xs font-semibold text-stone-500 uppercase tracking-wider block mb-1">Username *</label>
                <input value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
                  required placeholder="e.g. johndoe" className={inputCls} />
              </div>
              <div>
                <label className="text-xs font-semibold text-stone-500 uppercase tracking-wider block mb-1">Password *</label>
                <div className="relative">
                  <input type={showPwd ? "text" : "password"}
                    value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                    required minLength={6} placeholder="Min. 6 characters"
                    className={`${inputCls} pr-10`} />
                  <button type="button" onClick={() => setShowPwd(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600">
                    {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-stone-500 uppercase tracking-wider block mb-1">Role *</label>
                <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
                  className={inputCls}>
                  {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              </div>
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div className="flex gap-2">
              <button type="submit" disabled={adding}
                className="bg-brand-700 text-white text-sm font-semibold px-4 py-2 rounded
                  hover:bg-brand-800 transition-colors flex items-center gap-2 disabled:opacity-50">
                {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                Add Staff
              </button>
              <button type="button" onClick={() => setShowAdd(false)}
                className="text-sm text-stone-500 px-4 py-2 rounded hover:bg-stone-100 transition-colors">
                Cancel
              </button>
            </div>
          </form>
        )}

        {/* Staff list */}
        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-brand-700" /></div>
        ) : staff.length === 0 ? (
          <div className="text-center py-16">
            <Users className="h-12 w-12 text-stone-200 mx-auto mb-3" />
            <p className="text-stone-400 text-sm">No staff members yet</p>
          </div>
        ) : (
          <div className="glass rounded overflow-hidden">
            <div className="divide-y divide-stone-100">
              {staff.map(s => (
                <div key={s.id} className={`flex items-center gap-4 px-5 py-4 ${!s.enabled ? "opacity-50" : ""}`}>
                  <div className="h-9 w-9 rounded bg-brand-100 flex items-center justify-center shrink-0">
                    <span className="text-brand-700 font-bold text-sm uppercase">{s.fullName.charAt(0)}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-stone-900 text-sm truncate">{s.fullName}</p>
                    <p className="text-xs text-stone-400">@{s.username}</p>
                  </div>
                  <span className={`text-[11px] font-semibold px-2.5 py-1 rounded shrink-0 ${ROLE_COLOR[s.role] ?? "bg-stone-100 text-stone-600"}`}>
                    {ROLE_LABEL[s.role] ?? s.role}
                  </span>
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => toggle(s.id)} title={s.enabled ? "Disable" : "Enable"}
                      className="p-1.5 rounded hover:bg-stone-100 transition-colors">
                      {s.enabled
                        ? <ToggleRight className="h-5 w-5 text-green-600" />
                        : <ToggleLeft  className="h-5 w-5 text-stone-400" />}
                    </button>
                    <button onClick={() => remove(s.id, s.fullName)} title="Remove"
                      className="p-1.5 rounded hover:bg-red-50 text-stone-300 hover:text-red-500 transition-colors">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
