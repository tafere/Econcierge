import { useEffect, useRef, useState } from "react";
import { getToken } from "@/lib/auth";
import { useLang } from "@/lib/lang";
import { Save, Loader2, Building2, Link, Phone, Mail, MapPin, Tag, Clock, ImageIcon, Upload } from "lucide-react";
import NavBar from "@/components/NavBar";

interface HotelSettings {
  name:          string;
  tagline:       string;
  logoUrl:       string;
  heroImageUrl:  string;
  website:       string;
  address:       string;
  phone:         string;
  email:         string;
  etaMinutes:    number;
}

export default function HotelSettingsPage() {
  const { t } = useLang();
  const [form, setForm]       = useState<HotelSettings>({ name: "", tagline: "", logoUrl: "", heroImageUrl: "", website: "", address: "", phone: "", email: "", etaMinutes: 20 });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [saved, setSaved]     = useState(false);
  const [error, setError]     = useState<string | null>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const heroInputRef = useRef<HTMLInputElement>(null);

  const readFileAsDataUrl = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const dataUrl = await readFileAsDataUrl(file);
    setForm(f => ({ ...f, logoUrl: dataUrl }));
    e.target.value = "";
  };

  const handleHeroUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const dataUrl = await readFileAsDataUrl(file);
    setForm(f => ({ ...f, heroImageUrl: dataUrl }));
    e.target.value = "";
  };

  useEffect(() => {
    fetch("/api/dashboard/hotel", { headers: { Authorization: `Bearer ${getToken()}` } })
      .then(r => r.json())
      .then(data => setForm({
        name:          data.name          ?? "",
        tagline:       data.tagline       ?? "",
        logoUrl:       data.logoUrl       ?? "",
        heroImageUrl:  data.heroImageUrl  ?? "",
        website:       data.website       ?? "",
        address:       data.address       ?? "",
        phone:         data.phone         ?? "",
        email:         data.email         ?? "",
        etaMinutes:    data.etaMinutes    ?? 20,
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
    labelKey: string,
    icon: React.ReactNode,
    placeholder: string,
    hintKey?: string,
  ) => (
    <div>
      <label htmlFor={key} className="text-xs font-semibold text-stone-500 dark:text-zinc-400 uppercase tracking-wider block mb-1.5">
        {t(labelKey)}
      </label>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 dark:text-zinc-500">{icon}</span>
        <input
          id={key}
          value={form[key]}
          onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
          placeholder={placeholder}
          className="w-full h-10 border border-stone-200 dark:border-zinc-600 bg-white dark:bg-zinc-700 dark:text-zinc-100 rounded pl-9 pr-3 text-sm
            focus:outline-none focus:ring-2 focus:ring-brand-700"
        />
      </div>
      {hintKey && <p className="text-xs text-stone-400 dark:text-zinc-500 mt-1">{t(hintKey)}</p>}
    </div>
  );

  return (
    <div className="min-h-screen">
      <NavBar />

      <div className="max-w-2xl mx-auto px-4 py-8">
        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-brand-700" /></div>
        ) : (
          <form onSubmit={save} className="space-y-6">

            {form.logoUrl && (
              <div className="flex items-center gap-4 glass rounded p-4">
                <img src={form.logoUrl} alt="Logo preview" className="h-16 w-16 rounded object-cover border border-stone-200 dark:border-zinc-600" />
                <div>
                  <p className="font-bold text-stone-900 dark:text-zinc-100">{form.name}</p>
                  {form.tagline && <p className="text-sm text-stone-400 dark:text-zinc-500">{form.tagline}</p>}
                </div>
              </div>
            )}

            <div className="glass rounded p-6 space-y-5">
              <h2 className="font-bold text-stone-800 dark:text-zinc-200 flex items-center gap-2">
                <Building2 className="h-4 w-4 text-brand-700" /> {t("identitySection")}
              </h2>
              {field("name",    "hotelNameField", <Building2 className="h-4 w-4" />, "e.g. Ethiopian Skylight Hotel")}
              {field("tagline", "taglineField",   <Tag       className="h-4 w-4" />, "e.g. Where the Sky is the Limit")}
              {/* Logo URL + upload */}
              <div>
                <label className="text-xs font-semibold text-stone-500 dark:text-zinc-400 uppercase tracking-wider block mb-1.5">
                  {t("logoUrlField")}
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 dark:text-zinc-500"><Link className="h-4 w-4" /></span>
                    <input
                      value={form.logoUrl.startsWith("data:") ? "" : form.logoUrl}
                      onChange={e => setForm(f => ({ ...f, logoUrl: e.target.value }))}
                      placeholder={form.logoUrl.startsWith("data:") ? "(file uploaded)" : "https://…/logo.png"}
                      className="w-full h-10 border border-stone-200 dark:border-zinc-600 bg-white dark:bg-zinc-700 dark:text-zinc-100 rounded pl-9 pr-3 text-sm
                        focus:outline-none focus:ring-2 focus:ring-brand-700"
                    />
                  </div>
                  <button type="button" onClick={() => logoInputRef.current?.click()}
                    className="h-10 px-3 rounded border border-stone-200 dark:border-zinc-600 bg-white dark:bg-zinc-700 text-stone-600 dark:text-zinc-300 hover:bg-stone-50 dark:hover:bg-zinc-600 flex items-center gap-1.5 text-sm shrink-0">
                    <Upload className="h-4 w-4" /> Upload
                  </button>
                  <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                </div>
                <p className="text-xs text-stone-400 dark:text-zinc-500 mt-1">{t("logoUrlHint")}</p>
              </div>

              {/* Hero image URL + upload */}
              <div>
                <label className="text-xs font-semibold text-stone-500 dark:text-zinc-400 uppercase tracking-wider block mb-1.5">
                  {t("heroImageUrlField")}
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 dark:text-zinc-500"><ImageIcon className="h-4 w-4" /></span>
                    <input
                      value={form.heroImageUrl.startsWith("data:") ? "" : form.heroImageUrl}
                      onChange={e => setForm(f => ({ ...f, heroImageUrl: e.target.value }))}
                      placeholder={form.heroImageUrl.startsWith("data:") ? "(file uploaded)" : "https://…/hotel-exterior.jpg"}
                      className="w-full h-10 border border-stone-200 dark:border-zinc-600 bg-white dark:bg-zinc-700 dark:text-zinc-100 rounded pl-9 pr-3 text-sm
                        focus:outline-none focus:ring-2 focus:ring-brand-700"
                    />
                  </div>
                  <button type="button" onClick={() => heroInputRef.current?.click()}
                    className="h-10 px-3 rounded border border-stone-200 dark:border-zinc-600 bg-white dark:bg-zinc-700 text-stone-600 dark:text-zinc-300 hover:bg-stone-50 dark:hover:bg-zinc-600 flex items-center gap-1.5 text-sm shrink-0">
                    <Upload className="h-4 w-4" /> Upload
                  </button>
                  <input ref={heroInputRef} type="file" accept="image/*" className="hidden" onChange={handleHeroUpload} />
                </div>
                <p className="text-xs text-stone-400 dark:text-zinc-500 mt-1">{t("heroImageUrlHint")}</p>
              </div>

              {form.heroImageUrl && (
                <div className="rounded overflow-hidden h-32 relative">
                  <img src={form.heroImageUrl} alt="Hero preview" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/30 flex items-end p-2">
                    <p className="text-xs text-white/80 font-medium">Guest page background preview</p>
                  </div>
                </div>
              )}
              {field("website", "websiteField",   <Link      className="h-4 w-4" />, "https://www.yourhotel.com")}
              <div>
                <label className="text-xs font-semibold text-stone-500 dark:text-zinc-400 uppercase tracking-wider block mb-1.5">
                  Default Response Time (minutes)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 dark:text-zinc-500"><Clock className="h-4 w-4" /></span>
                  <input
                    type="number"
                    min={1}
                    max={480}
                    value={form.etaMinutes}
                    onChange={e => setForm(f => ({ ...f, etaMinutes: Number(e.target.value) }))}
                    className="w-full h-10 border border-stone-200 dark:border-zinc-600 bg-white dark:bg-zinc-700 dark:text-zinc-100 rounded pl-9 pr-3 text-sm
                      focus:outline-none focus:ring-2 focus:ring-brand-700"
                  />
                </div>
                <p className="text-xs text-stone-400 dark:text-zinc-500 mt-1">Used when no category-specific time is set</p>
              </div>
            </div>

            <div className="glass rounded p-6 space-y-5">
              <h2 className="font-bold text-stone-800 dark:text-zinc-200 flex items-center gap-2">
                <Phone className="h-4 w-4 text-brand-700" /> {t("contactSection")}
              </h2>
              {field("address", "addressField", <MapPin className="h-4 w-4" />, "City, Country")}
              {field("phone",   "phoneField",   <Phone  className="h-4 w-4" />, "+251 …")}
              {field("email",   "emailField",   <Mail   className="h-4 w-4" />, "info@yourhotel.com")}
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <button type="submit" disabled={saving}
              className="w-full h-12 bg-brand-700 text-white rounded font-bold text-sm
                hover:bg-brand-800 transition-colors flex items-center justify-center gap-2 disabled:opacity-50">
              {saving
                ? <><Loader2 className="h-4 w-4 animate-spin" /> {t("savingBtn")}</>
                : saved
                  ? <><Save className="h-4 w-4" /> {t("savedBtn")}</>
                  : <><Save className="h-4 w-4" /> {t("saveSettings")}</>}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
