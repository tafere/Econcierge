import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { getToken } from "@/lib/auth";
import {
  ConciergeBell, ArrowLeft, Plus, Loader2, Users,
  ShieldCheck, ToggleLeft, ToggleRight, Trash2, Eye, EyeOff, ChevronDown,
} from "lucide-react";

interface StaffMember {
  id: number;
  username: string;
  fullName: string;
  role: string;
  enabled: boolean;
}

const ROLES = [
  { value: "STAFF",              label: "General Staff",        color: "bg-stone-100 text-stone-600 border-stone-200" },
  { value: "HOUSEKEEPING",       label: "Housekeeping",         color: "bg-green-100 text-green-700 border-green-200" },
  { value: "MAINTENANCE",        label: "Maintenance",          color: "bg-blue-100 text-blue-700 border-blue-200" },
  { value: "TRANSPORT",          label: "Transport",            color: "bg-purple-100 text-purple-700 border-purple-200" },
  { value: "RESTAURANT",         label: "Restaurant",           color: "bg-orange-100 text-orange-700 border-orange-200" },
  { value: "CAFE_BAR",           label: "Cafe & Bar",           color: "bg-amber-100 text-amber-700 border-amber-200" },
  { value: "SPA",                label: "Spa",                  color: "bg-pink-100 text-pink-700 border-pink-200" },
  { value: "GYM",                label: "Gym",                  color: "bg-red-100 text-red-700 border-red-200" },
  { value: "MEETING_CONFERENCE", label: "Meeting & Conference", color: "bg-indigo-100 text-indigo-700 border-indigo-200" },
];

const roleInfo = (value: string) => ROLES.find(r => r.value === value) ?? { value, label: value, color: "bg-stone-100 text-stone-600 border-stone-200" };

export default function StaffManagementPage() {
  const [, navigate] = useLocation();
  const [staff, setStaff]           = useState<StaffMember[]>([]);
  const [loading, setLoading]       = useState(true);
  const [showAdd, setShowAdd]       = useState(false);
  const [error, setError]           = useState<string | null>(null);
  const [adding, setAdding]         = useState(false);
  const [showPwd, setShowPwd]       = useState(false);
  const [changingRoleId, setChangingRoleId] = useState<number | null>(null);

  const [form, setForm] = useState({ fullName: "", username: "", password: "", role: "HOUSEKEEPING" });

  const authHeaders = () => ({ Authorization: `Bearer ${getToken()}`, "Content-Type": "application/json" });

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
      headers: authHeaders(),
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

  const changeRole = async (id: number, newRole: string) => {
    const res = await fetch(`/api/dashboard/staff-mgmt/${id}/role`, {
      method: "PATCH",
      headers: authHeaders(),
      body: JSON.stringify({ role: newRole }),
    });
    if (res.ok) {
      setStaff(prev => prev.map(s => s.id === id ? { ...s, role: newRole } : s));
    }
    setChangingRoleId(null);
  };

  const toggle = async (id: number) => {
    const res = await fetch(`/api/dashboard/staff-mgmt/${id}/toggle`, {
      method: "PATCH", headers: authHeaders(),
    });
    if (res.ok) {
      const d = await res.json();
      setStaff(prev => prev.map(s => s.id === id ? { ...s, enabled: d.enabled } : s));
    }
  };

  const remove = async (id: number, name: string) => {
    if (!confirm(`Remove ${name}? This cannot be undone.`)) return;
    const res = await fetch(`/api/dashboard/staff-mgmt/${id}`, {
      method: "DELETE", headers: authHeaders(),
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
            onClick={() => { setShowAdd(v => !v); setError(null); }}
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
                <div className="flex flex-wrap gap-2 pt-1">
                  {ROLES.map(r => (
                    <button key={r.value} type="button"
                      onClick={() => setForm(f => ({ ...f, role: r.value }))}
                      className={`text-xs font-semibold px-3 py-1.5 rounded border transition-colors
                        ${form.role === r.value
                          ? "bg-brand-700 text-white border-brand-700"
                          : "bg-white text-stone-600 border-stone-200 hover:border-brand-400"}`}>
                      {r.label}
                    </button>
                  ))}
                </div>
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
            <p className="text-stone-400 text-sm">No staff members yet. Add one above.</p>
          </div>
        ) : (
          <div className="glass rounded overflow-hidden">
            <div className="divide-y divide-stone-100">
              {staff.map(s => {
                const ri = roleInfo(s.role);
                const isEditingRole = changingRoleId === s.id;
                return (
                  <div key={s.id} className={`px-5 py-4 transition-colors ${!s.enabled ? "opacity-50" : ""}`}>
                    <div className="flex items-center gap-4">
                      {/* Avatar */}
                      <div className="h-9 w-9 rounded bg-brand-100 flex items-center justify-center shrink-0">
                        <span className="text-brand-700 font-bold text-sm uppercase">{s.fullName.charAt(0)}</span>
                      </div>
                      {/* Name / username */}
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-stone-900 text-sm truncate">{s.fullName}</p>
                        <p className="text-xs text-stone-400">@{s.username}</p>
                      </div>
                      {/* Role badge — click to edit */}
                      <button
                        onClick={() => setChangingRoleId(isEditingRole ? null : s.id)}
                        className={`flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded border
                          transition-colors shrink-0 ${ri.color}
                          ${isEditingRole ? "ring-2 ring-brand-400" : "hover:opacity-80"}`}
                        title="Click to change role"
                      >
                        {ri.label} <ChevronDown className="h-3 w-3 opacity-60" />
                      </button>
                      {/* Toggle / Delete */}
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

                    {/* Inline role picker */}
                    {isEditingRole && (
                      <div className="mt-3 ml-13 flex flex-wrap gap-2">
                        {ROLES.map(r => (
                          <button key={r.value}
                            onClick={() => changeRole(s.id, r.value)}
                            className={`text-xs font-semibold px-3 py-1.5 rounded border transition-colors
                              ${s.role === r.value
                                ? "bg-brand-700 text-white border-brand-700"
                                : `${r.color} hover:opacity-80`}`}>
                            {r.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
