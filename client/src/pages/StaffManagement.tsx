import { useEffect, useState } from "react";
import { getToken } from "@/lib/auth";
import { useLang } from "@/lib/lang";
import {
  Plus, Loader2, Users,
  ShieldCheck, ToggleLeft, ToggleRight, Trash2, Eye, EyeOff, ChevronDown,
} from "lucide-react";
import NavBar from "@/components/NavBar";

interface StaffMember {
  id: number;
  username: string;
  fullName: string;
  roles: string[];
  enabled: boolean;
}

const ROLES = [
  { value: "STAFF",              color: "bg-stone-100 text-stone-600 border-stone-200",    labelKey: "roleGeneralStaff" },
  { value: "HOUSEKEEPING",       color: "bg-green-100 text-green-700 border-green-200",    labelKey: "roleHousekeeping" },
  { value: "MAINTENANCE",        color: "bg-blue-100 text-blue-700 border-blue-200",       labelKey: "roleMaintenance" },
  { value: "TRANSPORT",          color: "bg-purple-100 text-purple-700 border-purple-200", labelKey: "roleTransport" },
  { value: "RESTAURANT",         color: "bg-orange-100 text-orange-700 border-orange-200", labelKey: "roleRestaurant" },
  { value: "CAFE_BAR",           color: "bg-amber-100 text-amber-700 border-amber-200",    labelKey: "roleCafeBar" },
  { value: "SPA",                color: "bg-pink-100 text-pink-700 border-pink-200",       labelKey: "roleSpa" },
  { value: "GYM",                color: "bg-red-100 text-red-700 border-red-200",          labelKey: "roleGym" },
  { value: "MEETING_CONFERENCE", color: "bg-indigo-100 text-indigo-700 border-indigo-200", labelKey: "roleMeetingConference" },
];

const roleInfo = (value: string) =>
  ROLES.find(r => r.value === value) ?? { value, color: "bg-stone-100 text-stone-600 border-stone-200", labelKey: value };

export default function StaffManagementPage() {
  const { t } = useLang();
  const [staff, setStaff]           = useState<StaffMember[]>([]);
  const [loading, setLoading]       = useState(true);
  const [showAdd, setShowAdd]       = useState(false);
  const [error, setError]           = useState<string | null>(null);
  const [adding, setAdding]         = useState(false);
  const [showPwd, setShowPwd]       = useState(false);
  const [editingRolesId, setEditingRolesId] = useState<number | null>(null);

  const [form, setForm] = useState({ fullName: "", username: "", password: "", roles: ["HOUSEKEEPING"] as string[] });

  const authHeaders = () => ({ Authorization: `Bearer ${getToken()}`, "Content-Type": "application/json" });

  const fetchStaff = async () => {
    const res = await fetch("/api/dashboard/staff-mgmt", { headers: { Authorization: `Bearer ${getToken()}` } });
    if (res.ok) setStaff(await res.json());
    setLoading(false);
  };

  useEffect(() => { fetchStaff(); }, []);

  const toggleFormRole = (value: string) => {
    setForm(f => ({
      ...f,
      roles: f.roles.includes(value) ? f.roles.filter(r => r !== value) : [...f.roles, value],
    }));
  };

  const addStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.roles.length === 0) { setError("Select at least one role"); return; }
    setAdding(true);
    setError(null);
    const res = await fetch("/api/dashboard/staff-mgmt", {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ ...form }),
    });
    if (res.ok) {
      await fetchStaff();
      setShowAdd(false);
      setForm({ fullName: "", username: "", password: "", roles: ["HOUSEKEEPING"] });
    } else {
      const d = await res.json().catch(() => ({}));
      setError(d.error || "Failed to create staff member");
    }
    setAdding(false);
  };

  const changeRoles = async (id: number, newRoles: string[]) => {
    if (newRoles.length === 0) return;
    const res = await fetch(`/api/dashboard/staff-mgmt/${id}/roles`, {
      method: "PATCH",
      headers: authHeaders(),
      body: JSON.stringify({ roles: newRoles }),
    });
    if (res.ok) {
      setStaff(prev => prev.map(s => s.id === id ? { ...s, roles: newRoles } : s));
    }
    setEditingRolesId(null);
  };

  const toggleRole = (memberId: number, currentRoles: string[], roleValue: string) => {
    const updated = currentRoles.includes(roleValue)
      ? currentRoles.filter(r => r !== roleValue)
      : [...currentRoles, roleValue];
    // Optimistically update UI while waiting for API
    setStaff(prev => prev.map(s => s.id === memberId ? { ...s, roles: updated } : s));
    changeRoles(memberId, updated);
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
    if (!confirm(t("confirmRemove").replace("{name}", name))) return;
    const res = await fetch(`/api/dashboard/staff-mgmt/${id}`, {
      method: "DELETE", headers: authHeaders(),
    });
    if (res.ok) setStaff(prev => prev.filter(s => s.id !== id));
  };

  const inputCls = "w-full h-10 border border-stone-200 dark:border-zinc-600 bg-white dark:bg-zinc-700 dark:text-zinc-100 rounded px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-700";

  return (
    <div className="min-h-screen">
      <NavBar />

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-stone-900 dark:text-zinc-100">{t("staffMembers")}</h1>
            <p className="text-sm text-stone-400 dark:text-zinc-500">{staff.length} {t("staffConfigured")}</p>
          </div>
          <button
            onClick={() => { setShowAdd(v => !v); setError(null); }}
            className="flex items-center gap-1.5 bg-brand-700 text-white text-sm font-semibold
              px-4 py-2 rounded hover:bg-brand-800 transition-colors"
          >
            <Plus className="h-4 w-4" /> {t("addStaff")}
          </button>
        </div>

        {/* Add form */}
        {showAdd && (
          <form onSubmit={addStaff} className="glass rounded p-5 space-y-4">
            <h3 className="font-semibold text-stone-800 dark:text-zinc-200 flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-brand-700" /> {t("newStaffMember")}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-stone-500 dark:text-zinc-400 uppercase tracking-wider block mb-1">{t("fullNameField")}</label>
                <input value={form.fullName} onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))}
                  required placeholder="e.g. John Doe" className={inputCls} />
              </div>
              <div>
                <label className="text-xs font-semibold text-stone-500 dark:text-zinc-400 uppercase tracking-wider block mb-1">{t("usernameField")}</label>
                <input value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
                  required placeholder="e.g. johndoe" className={inputCls} />
              </div>
              <div>
                <label className="text-xs font-semibold text-stone-500 dark:text-zinc-400 uppercase tracking-wider block mb-1">{t("passwordField")}</label>
                <div className="relative">
                  <input type={showPwd ? "text" : "password"}
                    value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                    required minLength={6} placeholder={t("minChars")}
                    className={`${inputCls} pr-10`} />
                  <button type="button" onClick={() => setShowPwd(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600">
                    {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div className="sm:col-span-2">
                <label className="text-xs font-semibold text-stone-500 dark:text-zinc-400 uppercase tracking-wider block mb-1">{t("roleField")}</label>
                <div className="flex flex-wrap gap-2 pt-1">
                  {ROLES.map(r => (
                    <button key={r.value} type="button"
                      onClick={() => toggleFormRole(r.value)}
                      className={`text-xs font-semibold px-3 py-1.5 rounded border transition-colors
                        ${form.roles.includes(r.value)
                          ? "bg-brand-700 text-white border-brand-700"
                          : "bg-white dark:bg-zinc-700 text-stone-600 dark:text-zinc-300 border-stone-200 dark:border-zinc-600 hover:border-brand-400"}`}>
                      {t(r.labelKey)}
                    </button>
                  ))}
                </div>
                {form.roles.length === 0 && <p className="text-xs text-red-500 mt-1">Select at least one role</p>}
              </div>
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div className="flex gap-2">
              <button type="submit" disabled={adding || form.roles.length === 0}
                className="bg-brand-700 text-white text-sm font-semibold px-4 py-2 rounded
                  hover:bg-brand-800 transition-colors flex items-center gap-2 disabled:opacity-50">
                {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                {t("addStaff")}
              </button>
              <button type="button" onClick={() => setShowAdd(false)}
                className="text-sm text-stone-500 dark:text-zinc-400 px-4 py-2 rounded hover:bg-stone-100 dark:hover:bg-zinc-700 transition-colors">
                {t("cancelBtn")}
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
            <p className="text-stone-400 text-sm">{t("noStaffYet")}</p>
          </div>
        ) : (
          <div className="glass rounded overflow-hidden">
            <div className="divide-y divide-stone-100 dark:divide-zinc-700/50">
              {staff.map(s => {
                const isEditingRoles = editingRolesId === s.id;
                const primaryRole = s.roles[0] ?? "STAFF";
                const ri = roleInfo(primaryRole);
                return (
                  <div key={s.id} className={`px-5 py-4 transition-colors ${!s.enabled ? "opacity-50" : ""}`}>
                    <div className="flex items-center gap-4">
                      <div className="h-9 w-9 rounded bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center shrink-0">
                        <span className="text-brand-700 font-bold text-sm uppercase">{s.fullName.charAt(0)}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-stone-900 dark:text-zinc-100 text-sm truncate">{s.fullName}</p>
                        <p className="text-xs text-stone-400 dark:text-zinc-500">@{s.username}</p>
                      </div>
                      {/* Role badges + edit toggle */}
                      <button
                        onClick={() => setEditingRolesId(isEditingRoles ? null : s.id)}
                        className={`flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded border
                          transition-colors shrink-0 ${ri.color}
                          ${isEditingRoles ? "ring-2 ring-brand-400" : "hover:opacity-80"}`}
                      >
                        {s.roles.length > 1 ? `${t(ri.labelKey)} +${s.roles.length - 1}` : t(ri.labelKey)}
                        <ChevronDown className="h-3 w-3 opacity-60" />
                      </button>
                      <div className="flex items-center gap-1 shrink-0">
                        <button onClick={() => toggle(s.id)} title={s.enabled ? t("disableStaff") : t("enableStaff")}
                          className="p-1.5 rounded hover:bg-stone-100 dark:hover:bg-zinc-700 transition-colors">
                          {s.enabled
                            ? <ToggleRight className="h-5 w-5 text-green-600" />
                            : <ToggleLeft  className="h-5 w-5 text-stone-400 dark:text-zinc-500" />}
                        </button>
                        <button onClick={() => remove(s.id, s.fullName)} title={t("removeStaff")}
                          className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-stone-300 dark:text-zinc-600 hover:text-red-500 transition-colors">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    {isEditingRoles && (
                      <div className="mt-3 ml-13 flex flex-wrap gap-2">
                        {ROLES.map(r => (
                          <button key={r.value}
                            onClick={() => toggleRole(s.id, s.roles, r.value)}
                            className={`text-xs font-semibold px-3 py-1.5 rounded border transition-colors
                              ${s.roles.includes(r.value)
                                ? "bg-brand-700 text-white border-brand-700"
                                : `${r.color} hover:opacity-80`}`}>
                            {t(r.labelKey)}
                          </button>
                        ))}
                        <p className="w-full text-[11px] text-stone-400 dark:text-zinc-500 mt-1">
                          Click roles to toggle — changes save automatically
                        </p>
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
