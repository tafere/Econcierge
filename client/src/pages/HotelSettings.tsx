import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { getToken } from "@/lib/auth";
import { ConciergeBell, ArrowLeft, Save, Loader2, Building2, Link, Phone, Mail, MapPin, Tag } from "lucide-react";

interface HotelSettings {
  name:    string;
  tagline: string;
  logoUrl: string;
  website: string;
  address: string;
  phone:   string;
  email:   string;
}

export default function HotelSettingsPage() {
  const [, navigate] = useLocation();
  const [form, setForm]       = useState<HotelSettings>({ name: "", tagline: "", logoUrl: "", website: "", address: "", phone: "", email: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [saved, setSaved]     = useState(false);
  const [error, setError]     = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/dashboard/hotel", { headers: { Authorization: `Bearer ${getToken()}` } })
      .then(r => r.json())
      .then(data => setForm({
        name:    data.name    ?? "",
        tagline: data.tagline ?? "",
        logoUrl: data.logoUrl ?? "",
        website: data.website ?? "",
        address: data.address ?? "",
        phone:   data.phone   ?? "",
        email:   data.email   ?? "",
      }))
      .finally(() => setLoading(false));
  }, []);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const res = await fetch("/api/dashboard/hotel", {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
      body: JSON.stringify(form),
    });
    setSaving(false);
    if (res.ok) { setSaved(true); setTimeout(() => setSaved(false), 3000); }
    else setError("Failed to save settings");
  };

  const field = (
    key: keyof HotelSettings,
    label: string,
    icon: React.ReactNode,
    placeholder: string,
    hint?: string,
  ) => (
    <div>
      <label className="text-xs font-semibold text-stone-500 uppercase tracking-wider block mb-1.5">
        {label}
      </label>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400">{icon}</span>
        <input
          value={form[key]}
          onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
          placeholder={placeholder}
          className="w-full h-10 border border-stone-200 rounded-lg pl-9 pr-3 text-sm
            focus:outline-none focus:ring-2 focus:ring-brand-700"
        />
      </div>
      {hint && <p className="text-xs text-stone-400 mt-1">{hint}</p>}
    </div>
  );

  return (
    <div className="min-h-screen bg-stone-50">
      <nav className="bg-brand-700 text-white px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ConciergeBell className="h-5 w-5" />
            <span className="font-bold text-sm">Hotel Settings</span>
          </div>
          <button onClick={() => navigate("/")}
            className="flex items-center gap-1.5 text-xs text-amber-200 hover:text-white transition-colors">
            <ArrowLeft className="h-4 w-4" /> Dashboard
          </button>
        </div>
      </nav>

      <div className="max-w-2xl mx-auto px-4 py-8">
        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-brand-700" /></div>
        ) : (
          <form onSubmit={save} className="space-y-6">

            {/* Logo preview */}
            {form.logoUrl && (
              <div className="flex items-center gap-4 bg-white rounded-xl border border-stone-100 p-4">
                <img src={form.logoUrl} alt="Logo preview" className="h-16 w-16 rounded-xl object-cover border border-stone-200" />
                <div>
                  <p className="font-bold text-stone-900">{form.name}</p>
                  {form.tagline && <p className="text-sm text-stone-400">{form.tagline}</p>}
                </div>
              </div>
            )}

            <div className="bg-white rounded-xl border border-stone-100 shadow-sm p-6 space-y-5">
              <h2 className="font-bold text-stone-800 flex items-center gap-2">
                <Building2 className="h-4 w-4 text-brand-700" /> Identity
              </h2>
              {field("name",    "Hotel Name",  <Building2 className="h-4 w-4" />, "e.g. Ethiopian Skylight Hotel")}
              {field("tagline", "Tagline",     <Tag       className="h-4 w-4" />, "e.g. Where the Sky is the Limit")}
              {field("logoUrl", "Logo URL",    <Link      className="h-4 w-4" />, "https://…/logo.png",
                "Paste a public URL to your hotel logo image (PNG or JPG, square recommended)")}
              {field("website", "Website",     <Link      className="h-4 w-4" />, "https://www.yourhotel.com")}
            </div>

            <div className="bg-white rounded-xl border border-stone-100 shadow-sm p-6 space-y-5">
              <h2 className="font-bold text-stone-800 flex items-center gap-2">
                <Phone className="h-4 w-4 text-brand-700" /> Contact
              </h2>
              {field("address", "Address", <MapPin className="h-4 w-4" />, "City, Country")}
              {field("phone",   "Phone",   <Phone  className="h-4 w-4" />, "+251 …")}
              {field("email",   "Email",   <Mail   className="h-4 w-4" />, "info@yourhotel.com")}
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <button type="submit" disabled={saving}
              className="w-full h-12 bg-brand-700 text-white rounded-xl font-bold text-sm
                hover:bg-brand-800 transition-colors flex items-center justify-center gap-2 disabled:opacity-50">
              {saving
                ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</>
                : saved
                  ? <><Save className="h-4 w-4" /> Saved!</>
                  : <><Save className="h-4 w-4" /> Save Settings</>}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
