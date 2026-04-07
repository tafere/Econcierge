import { useEffect, useState } from "react";
import { getToken } from "@/lib/auth";
import { useAuth } from "@/lib/auth";
import {
  ConciergeBell, Plus, Loader2, Building2, Pencil, ToggleLeft,
  ToggleRight, Eye, EyeOff, ChevronDown, X, KeyRound,
} from "lucide-react";

interface HotelEntry {
  id: number;
  name: string;
  slug: string;
  tagline?: string;
  logoUrl?: string;
  primaryColor?: string;
  enabled: boolean;
  createdAt?: string;
  adminUsername?: string;
  adminFullName?: string;
}

const DEFAULT_COLOR = "#92400e";

export default function SuperAdminPage() {
  const { logout } = useAuth();
  const [hotels, setHotels]         = useState<HotelEntry[]>([]);
  const [loading, setLoading]       = useState(true);
  const [showForm, setShowForm]     = useState(false);
  const [editHotel, setEditHotel]   = useState<HotelEntry | null>(null);
  const [pwdHotel, setPwdHotel]     = useState<HotelEntry | null>(null);
  const [error, setError]           = useState<string | null>(null);
  const [saving, setSaving]         = useState(false);
  const [showPwd, setShowPwd]       = useState(false);

  const [form, setForm] = useState({
    hotelName: "", tagline: "", logoUrl: "", primaryColor: DEFAULT_COLOR,
    adminFullName: "", adminUsername: "", adminPassword: "",
  });
  const [editForm, setEditForm] = useState({
    name: "", tagline: "", logoUrl: "", primaryColor: DEFAULT_COLOR,
  });
  const [newPwd, setNewPwd] = useState("");

  const authH = () => ({ Authorization: `Bearer ${getToken()}`, "Content-Type": "application/json" });

  const fetchHotels = async () => {
    const res = await fetch("/api/super/hotels", { headers: authH() });
    if (res.ok) setHotels(await res.json());
    setLoading(false);
  };

  useEffect(() => { fetchHotels(); }, []);

  const createHotel = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true); setError(null);
    const res = await fetch("/api/super/hotels", {
      method: "POST", headers: authH(),
      body: JSON.stringify({
        hotelName:     form.hotelName,
        tagline:       form.tagline,
        logoUrl:       form.logoUrl,
        primaryColor:  form.primaryColor,
        adminFullName: form.adminFullName,
        adminUsername: form.adminUsername,
        adminPassword: form.adminPassword,
      }),
    });
    if (res.ok) {
      await fetchHotels();
      setShowForm(false);
      setForm({ hotelName: "", tagline: "", logoUrl: "", primaryColor: DEFAULT_COLOR,
                adminFullName: "", adminUsername: "", adminPassword: "" });
    } else {
      const d = await res.json().catch(() => ({}));
      setError(d.error || "Failed to create hotel");
    }
    setSaving(false);
  };

  const saveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editHotel) return;
    setSaving(true); setError(null);
    const res = await fetch(`/api/super/hotels/${editHotel.id}`, {
      method: "PATCH", headers: authH(),
      body: JSON.stringify(editForm),
    });
    if (res.ok) {
      await fetchHotels();
      setEditHotel(null);
    } else {
      const d = await res.json().catch(() => ({}));
      setError(d.error || "Failed to update hotel");
    }
    setSaving(false);
  };

  const resetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pwdHotel) return;
    setSaving(true); setError(null);
    const res = await fetch(`/api/super/hotels/${pwdHotel.id}/admin-password`, {
      method: "PATCH", headers: authH(),
      body: JSON.stringify({ password: newPwd }),
    });
    if (res.ok) {
      setPwdHotel(null); setNewPwd("");
    } else {
      const d = await res.json().catch(() => ({}));
      setError(d.error || "Failed to reset password");
    }
    setSaving(false);
  };

  const toggleHotel = async (id: number) => {
    const res = await fetch(`/api/super/hotels/${id}/toggle`, { method: "PATCH", headers: authH() });
    if (res.ok) {
      const d = await res.json();
      setHotels(prev => prev.map(h => h.id === id ? { ...h, enabled: d.enabled } : h));
    }
  };

  const openEdit = (h: HotelEntry) => {
    setEditHotel(h);
    setEditForm({ name: h.name, tagline: h.tagline ?? "", logoUrl: h.logoUrl ?? "", primaryColor: h.primaryColor ?? DEFAULT_COLOR });
    setError(null);
  };

  const inputCls = "w-full h-10 border border-stone-200 bg-white rounded px-3 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400";

  return (
    <div className="min-h-screen" style={{ background: "hsl(220 20% 96%)" }}>
      {/* Nav */}
      <nav style={{ background: "#1c1917" }} className="text-white px-4 py-3">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ConciergeBell className="h-5 w-5 text-amber-400" />
            <div>
              <p className="font-extrabold text-sm tracking-tight">Econcierge</p>
              <p className="text-[10px] text-stone-400 -mt-0.5">Platform Admin</p>
            </div>
          </div>
          <button onClick={logout}
            className="text-xs text-stone-400 hover:text-white transition-colors">
            Sign out
          </button>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-4 py-6 space-y-5">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-stone-900">Hotels</h1>
            <p className="text-sm text-stone-400">{hotels.length} hotel{hotels.length !== 1 ? "s" : ""} registered</p>
          </div>
          <button
            onClick={() => { setShowForm(v => !v); setError(null); }}
            className="flex items-center gap-1.5 bg-stone-900 text-white text-sm font-semibold
              px-4 py-2 rounded hover:bg-stone-700 transition-colors"
          >
            <Plus className="h-4 w-4" /> Add Hotel
          </button>
        </div>

        {/* Create Hotel Form */}
        {showForm && (
          <form onSubmit={createHotel} className="glass rounded p-5 space-y-4">
            <h3 className="font-bold text-stone-800 flex items-center gap-2">
              <Building2 className="h-4 w-4" /> New Hotel
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <label className="text-xs font-semibold text-stone-500 uppercase tracking-wider block mb-1">Hotel Name *</label>
                <input value={form.hotelName} onChange={e => setForm(f => ({ ...f, hotelName: e.target.value }))}
                  required placeholder="e.g. Grand Hilton Hotel" className={inputCls} />
              </div>
              <div className="sm:col-span-2">
                <label className="text-xs font-semibold text-stone-500 uppercase tracking-wider block mb-1">Tagline</label>
                <input value={form.tagline} onChange={e => setForm(f => ({ ...f, tagline: e.target.value }))}
                  placeholder="e.g. Where the Sky is the Limit" className={inputCls} />
              </div>
              <div>
                <label className="text-xs font-semibold text-stone-500 uppercase tracking-wider block mb-1">Logo URL</label>
                <input value={form.logoUrl} onChange={e => setForm(f => ({ ...f, logoUrl: e.target.value }))}
                  placeholder="https://..." className={inputCls} />
              </div>
              <div>
                <label className="text-xs font-semibold text-stone-500 uppercase tracking-wider block mb-1">Brand Color *</label>
                <div className="flex items-center gap-2">
                  <input type="color" value={form.primaryColor}
                    onChange={e => setForm(f => ({ ...f, primaryColor: e.target.value }))}
                    className="h-10 w-14 rounded border border-stone-200 cursor-pointer p-0.5 bg-white" />
                  <input value={form.primaryColor} onChange={e => setForm(f => ({ ...f, primaryColor: e.target.value }))}
                    placeholder="#92400e" className={`${inputCls} flex-1`} />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-stone-500 uppercase tracking-wider block mb-1">Admin Full Name *</label>
                <input value={form.adminFullName} onChange={e => setForm(f => ({ ...f, adminFullName: e.target.value }))}
                  required placeholder="e.g. Abebe Kebede" className={inputCls} />
              </div>
              <div>
                <label className="text-xs font-semibold text-stone-500 uppercase tracking-wider block mb-1">Admin Username *</label>
                <input value={form.adminUsername} onChange={e => setForm(f => ({ ...f, adminUsername: e.target.value }))}
                  required placeholder="e.g. abebe" className={inputCls} />
              </div>
              <div className="sm:col-span-2">
                <label className="text-xs font-semibold text-stone-500 uppercase tracking-wider block mb-1">Admin Password *</label>
                <div className="relative">
                  <input type={showPwd ? "text" : "password"}
                    value={form.adminPassword} onChange={e => setForm(f => ({ ...f, adminPassword: e.target.value }))}
                    required minLength={6} placeholder="Min. 6 characters" className={`${inputCls} pr-10`} />
                  <button type="button" onClick={() => setShowPwd(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600">
                    {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div className="flex gap-2">
              <button type="submit" disabled={saving}
                className="bg-stone-900 text-white text-sm font-semibold px-4 py-2 rounded
                  hover:bg-stone-700 transition-colors flex items-center gap-2 disabled:opacity-50">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                Create Hotel
              </button>
              <button type="button" onClick={() => setShowForm(false)}
                className="text-sm text-stone-500 px-4 py-2 rounded hover:bg-stone-100 transition-colors">
                Cancel
              </button>
            </div>
          </form>
        )}

        {/* Edit Hotel Modal */}
        {editHotel && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
            <form onSubmit={saveEdit} className="bg-white rounded shadow-xl p-6 w-full max-w-md space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-stone-800">Edit Hotel</h3>
                <button type="button" onClick={() => setEditHotel(null)} className="text-stone-400 hover:text-stone-700">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-stone-500 uppercase tracking-wider block mb-1">Hotel Name *</label>
                  <input value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                    required className={inputCls} />
                </div>
                <div>
                  <label className="text-xs font-semibold text-stone-500 uppercase tracking-wider block mb-1">Tagline</label>
                  <input value={editForm.tagline} onChange={e => setEditForm(f => ({ ...f, tagline: e.target.value }))}
                    placeholder="e.g. Where the Sky is the Limit" className={inputCls} />
                </div>
                <div>
                  <label className="text-xs font-semibold text-stone-500 uppercase tracking-wider block mb-1">Logo URL</label>
                  <input value={editForm.logoUrl} onChange={e => setEditForm(f => ({ ...f, logoUrl: e.target.value }))}
                    placeholder="https://..." className={inputCls} />
                  {editForm.logoUrl && (
                    <img src={editForm.logoUrl} alt="Logo preview"
                      className="mt-2 h-10 object-contain rounded border border-stone-100"
                      onError={e => (e.currentTarget.style.display = "none")} />
                  )}
                </div>
                <div>
                  <label className="text-xs font-semibold text-stone-500 uppercase tracking-wider block mb-1">Brand Color</label>
                  <div className="flex items-center gap-2">
                    <input type="color" value={editForm.primaryColor}
                      onChange={e => setEditForm(f => ({ ...f, primaryColor: e.target.value }))}
                      className="h-10 w-14 rounded border border-stone-200 cursor-pointer p-0.5 bg-white" />
                    <input value={editForm.primaryColor}
                      onChange={e => setEditForm(f => ({ ...f, primaryColor: e.target.value }))}
                      placeholder="#92400e" className={`${inputCls} flex-1`} />
                  </div>
                </div>
              </div>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <div className="flex gap-2">
                <button type="submit" disabled={saving}
                  className="bg-stone-900 text-white text-sm font-semibold px-4 py-2 rounded
                    hover:bg-stone-700 transition-colors flex items-center gap-2 disabled:opacity-50">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Save Changes
                </button>
                <button type="button" onClick={() => setEditHotel(null)}
                  className="text-sm text-stone-500 px-4 py-2 rounded hover:bg-stone-100 transition-colors">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Reset Admin Password Modal */}
        {pwdHotel && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
            <form onSubmit={resetPassword} className="bg-white rounded shadow-xl p-6 w-full max-w-sm space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-stone-800">Reset Admin Password</h3>
                <button type="button" onClick={() => { setPwdHotel(null); setNewPwd(""); }}
                  className="text-stone-400 hover:text-stone-700"><X className="h-5 w-5" /></button>
              </div>
              <p className="text-sm text-stone-500">
                Reset password for admin <span className="font-mono font-bold text-stone-700">@{pwdHotel.adminUsername}</span> at <span className="font-semibold">{pwdHotel.name}</span>
              </p>
              <div className="relative">
                <input type={showPwd ? "text" : "password"} value={newPwd}
                  onChange={e => setNewPwd(e.target.value)}
                  required minLength={6} placeholder="New password (min. 6 chars)"
                  className={`${inputCls} pr-10`} />
                <button type="button" onClick={() => setShowPwd(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600">
                  {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <div className="flex gap-2">
                <button type="submit" disabled={saving}
                  className="bg-stone-900 text-white text-sm font-semibold px-4 py-2 rounded
                    hover:bg-stone-700 transition-colors flex items-center gap-2 disabled:opacity-50">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
                  Reset Password
                </button>
                <button type="button" onClick={() => { setPwdHotel(null); setNewPwd(""); }}
                  className="text-sm text-stone-500 px-4 py-2 rounded hover:bg-stone-100 transition-colors">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Hotel list */}
        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-stone-500" /></div>
        ) : hotels.length === 0 ? (
          <div className="text-center py-16 glass rounded">
            <Building2 className="h-12 w-12 text-stone-200 mx-auto mb-3" />
            <p className="text-stone-400 text-sm">No hotels yet. Create one above.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {hotels.map(h => (
              <div key={h.id} className={`glass rounded p-5 space-y-3 ${!h.enabled ? "opacity-60" : ""}`}>
                {/* Hotel header */}
                <div className="flex items-start gap-3">
                  {/* Color swatch / logo */}
                  <div className="shrink-0 h-12 w-12 rounded border border-stone-100 overflow-hidden flex items-center justify-center"
                    style={{ background: h.primaryColor || DEFAULT_COLOR }}>
                    {h.logoUrl
                      ? <img src={h.logoUrl} alt={h.name} className="h-full w-full object-cover"
                          onError={e => (e.currentTarget.style.display = "none")} />
                      : <ConciergeBell className="h-6 w-6 text-white/80" />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-stone-900 truncate">{h.name}</p>
                    {h.tagline && <p className="text-xs text-stone-400 truncate">{h.tagline}</p>}
                    <p className="text-xs text-stone-400 font-mono mt-0.5">/{h.slug}</p>
                  </div>
                  {/* Status badge */}
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded shrink-0
                    ${h.enabled ? "bg-green-100 text-green-700" : "bg-stone-100 text-stone-500"}`}>
                    {h.enabled ? "Active" : "Disabled"}
                  </span>
                </div>

                {/* Admin info */}
                {h.adminUsername && (
                  <div className="flex items-center gap-2 text-xs text-stone-500 bg-stone-50 rounded px-3 py-2">
                    <span className="font-semibold">Admin:</span>
                    <span className="font-mono">@{h.adminUsername}</span>
                    <span className="text-stone-300">·</span>
                    <span>{h.adminFullName}</span>
                  </div>
                )}

                {/* Color strip */}
                <div className="flex items-center gap-2 text-xs text-stone-500">
                  <div className="h-4 w-4 rounded border border-stone-200"
                    style={{ background: h.primaryColor || DEFAULT_COLOR }} />
                  <span className="font-mono">{h.primaryColor || DEFAULT_COLOR}</span>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 pt-1 border-t border-stone-100">
                  <button onClick={() => openEdit(h)} title="Edit branding"
                    className="flex items-center gap-1 text-xs px-3 py-1.5 rounded text-stone-600
                      hover:bg-stone-100 transition-colors font-medium">
                    <Pencil className="h-3.5 w-3.5" /> Edit
                  </button>
                  <button onClick={() => { setPwdHotel(h); setError(null); setShowPwd(false); }}
                    title="Reset admin password"
                    className="flex items-center gap-1 text-xs px-3 py-1.5 rounded text-stone-600
                      hover:bg-stone-100 transition-colors font-medium">
                    <KeyRound className="h-3.5 w-3.5" /> Password
                  </button>
                  <div className="flex-1" />
                  <button onClick={() => toggleHotel(h.id)} title={h.enabled ? "Disable hotel" : "Enable hotel"}
                    className="p-1.5 rounded hover:bg-stone-100 transition-colors">
                    {h.enabled
                      ? <ToggleRight className="h-5 w-5 text-green-600" />
                      : <ToggleLeft  className="h-5 w-5 text-stone-400" />}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
