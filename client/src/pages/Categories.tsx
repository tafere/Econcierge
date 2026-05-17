import { useEffect, useState } from "react";
import { authFetch } from "@/lib/auth";
import { useLang } from "@/lib/lang";
import {
  Plus, Loader2, Trash2, Pencil,
  ToggleLeft, ToggleRight, ChevronDown, ChevronRight, X, Check, CalendarClock,
} from "lucide-react";
import NavBar from "@/components/NavBar";

interface ItemOption {
  id: number;
  name: string;
  nameAm: string;
  enabled: boolean;
}

interface CatItem {
  id: number;
  name: string;
  nameAm?: string;
  icon?: string;
  enabled: boolean;
  maxQuantity: number;
  schedulable: boolean;
  slotIntervalMins: number;
  capacity: number;
  options: ItemOption[];
}

interface Category {
  id: number;
  name: string;
  nameAm?: string;
  icon: string;
  sortOrder: number;
  etaMinutes?: number | null;
  enabled: boolean;
  items: CatItem[];
}

const ICONS = [
  { value: "broom",           emoji: "🧹", labelKey: "iconHousekeeping" },
  { value: "sparkles",        emoji: "✨", labelKey: "iconAmenities" },
  { value: "soap",            emoji: "🧴", labelKey: "iconToiletries" },
  { value: "utensils",        emoji: "🍽️", labelKey: "iconFoodBeverage" },
  { value: "wrench",          emoji: "🔧", labelKey: "iconMaintenance" },
  { value: "concierge-bell",  emoji: "🛎️", labelKey: "iconConcierge" },
  { value: "car",             emoji: "🚌", labelKey: "iconTransport" },
  { value: "coffee",          emoji: "☕", labelKey: "iconCafeBar" },
  { value: "flower",          emoji: "🌸", labelKey: "iconSpa" },
  { value: "dumbbell",        emoji: "💪", labelKey: "iconGym" },
  { value: "briefcase",       emoji: "💼", labelKey: "iconMeeting" },
  { value: "star",            emoji: "⭐", labelKey: "iconGeneral" },
];

const iconEmoji = (v: string) => ICONS.find(i => i.value === v)?.emoji ?? "📋";

export default function CategoriesPage() {
  const { t, lang } = useLang();
  const [cats, setCats]         = useState<Category[]>([]);
  const [loading, setLoading]   = useState(true);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [showAdd, setShowAdd]   = useState(false);
  const [error, setError]       = useState<string | null>(null);

  const [newName, setNewName] = useState("");
  const [newIcon, setNewIcon] = useState("sparkles");
  const [adding, setAdding]   = useState(false);

  const [editCatId, setEditCatId]         = useState<number | null>(null);
  const [editCatName, setEditCatName]     = useState("");
  const [editCatIcon, setEditCatIcon]     = useState("");
  const [editCatEta, setEditCatEta]       = useState<string>("");

  const [addItemCatId, setAddItemCatId]           = useState<number | null>(null);
  const [addItemName, setAddItemName]             = useState("");
  const [addItemNameAm, setAddItemNameAm]         = useState("");
  const [addItemQty, setAddItemQty]               = useState(1);
  const [addItemSchedulable, setAddItemSchedulable] = useState(false);
  const [addItemInterval, setAddItemInterval]     = useState(60);
  const [addItemCapacity, setAddItemCapacity]     = useState(10);
  const [addingItem, setAddingItem]               = useState(false);

  const [addItemIcon, setAddItemIcon]         = useState("");

  const [editItemId, setEditItemId]           = useState<number | null>(null);
  const [editItemName, setEditItemName]       = useState("");
  const [editItemNameAm, setEditItemNameAm]   = useState("");
  const [editItemIcon, setEditItemIcon]       = useState("");
  const [editItemQty, setEditItemQty]         = useState(1);
  const [editSchedulable, setEditSchedulable] = useState(false);
  const [editInterval, setEditInterval]       = useState(30);
  const [editCapacity, setEditCapacity]       = useState(15);

  const [optionsOpenId, setOptionsOpenId]     = useState<number | null>(null);
  const [newOptName, setNewOptName]           = useState("");
  const [newOptNameAm, setNewOptNameAm]       = useState("");
  const [addingOpt, setAddingOpt]             = useState(false);
  const [editOptId, setEditOptId]             = useState<number | null>(null);
  const [editOptName, setEditOptName]         = useState("");
  const [editOptNameAm, setEditOptNameAm]     = useState("");

  const fetchCats = async () => {
    const res = await authFetch("/api/dashboard/categories");
    if (res.ok) setCats(await res.json());
    setLoading(false);
  };

  useEffect(() => { fetchCats(); }, []);

  const toggleExpand = (id: number) =>
    setExpanded(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });

  const addCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdding(true); setError(null);
    const res = await authFetch("/api/dashboard/categories", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName, icon: newIcon }),
    });
    if (res.ok) {
      const c = await res.json();
      setCats(prev => [...prev, c]);
      setExpanded(prev => new Set([...prev, c.id]));
      setNewName(""); setNewIcon("sparkles"); setShowAdd(false);
    } else {
      const d = await res.json().catch(() => ({}));
      setError(d.error || "Failed");
    }
    setAdding(false);
  };

  const saveEditCat = async (id: number) => {
    const etaVal = editCatEta === "" ? null : Number(editCatEta);
    const res = await authFetch(`/api/dashboard/categories/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editCatName, icon: editCatIcon, etaMinutes: etaVal }),
    });
    if (res.ok) {
      setCats(prev => prev.map(c => c.id === id ? { ...c, name: editCatName, icon: editCatIcon, etaMinutes: etaVal } : c));
      setEditCatId(null);
    }
  };

  const deleteCat = async (id: number, name: string) => {
    if (!confirm(t("confirmDeleteCategory").replace("{name}", name))) return;
    const res = await authFetch(`/api/dashboard/categories/${id}`, { method: "DELETE" });
    if (res.ok) setCats(prev => prev.filter(c => c.id !== id));
  };

  const addItem = async (catId: number, e: React.FormEvent) => {
    e.preventDefault();
    setAddingItem(true);
    const res = await authFetch(`/api/dashboard/categories/${catId}/items`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: addItemName, nameAm: addItemNameAm || null, maxQuantity: addItemQty,
        schedulable: addItemSchedulable, slotIntervalMins: addItemInterval, capacity: addItemCapacity,
        icon: addItemIcon || null,
      }),
    });
    if (res.ok) {
      const item = await res.json();
      setCats(prev => prev.map(c => c.id === catId ? { ...c, items: [...c.items, item] } : c));
      setAddItemCatId(null); setAddItemName(""); setAddItemNameAm(""); setAddItemQty(1); setAddItemIcon("");
    }
    setAddingItem(false);
  };

  const toggleCat = async (catId: number, enabled: boolean) => {
    const res = await authFetch(`/api/dashboard/categories/${catId}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: !enabled }),
    });
    if (res.ok) setCats(prev => prev.map(c => c.id === catId ? { ...c, enabled: !enabled } : c));
  };

  const toggleItem = async (catId: number, itemId: number, enabled: boolean) => {
    const res = await authFetch(`/api/dashboard/categories/items/${itemId}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: !enabled }),
    });
    if (res.ok) setCats(prev => prev.map(c => c.id === catId
      ? { ...c, items: c.items.map(i => i.id === itemId ? { ...i, enabled: !enabled } : i) } : c));
  };

  const saveEditItem = async (catId: number, itemId: number) => {
    const res = await authFetch(`/api/dashboard/categories/items/${itemId}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: editItemName, nameAm: editItemNameAm || null, maxQuantity: editSchedulable ? 1 : editItemQty,
        schedulable: editSchedulable, slotIntervalMins: editInterval, capacity: editCapacity,
        icon: editItemIcon || null,
      }),
    });
    if (res.ok) {
      const updated = await res.json();
      setCats(prev => prev.map(c => c.id === catId
        ? { ...c, items: c.items.map(i => i.id === itemId ? { ...i, ...updated } : i) } : c));
      setEditItemId(null);
    }
  };

  const toggleSchedulable = async (catId: number, itemId: number, current: boolean) => {
    const res = await authFetch(`/api/dashboard/categories/items/${itemId}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ schedulable: !current }),
    });
    if (res.ok) setCats(prev => prev.map(c => c.id === catId
      ? { ...c, items: c.items.map(i => i.id === itemId ? { ...i, schedulable: !current } : i) } : c));
  };

  const deleteItem = async (catId: number, itemId: number) => {
    const res = await authFetch(`/api/dashboard/categories/items/${itemId}`, { method: "DELETE" });
    if (res.ok) setCats(prev => prev.map(c => c.id === catId
      ? { ...c, items: c.items.filter(i => i.id !== itemId) } : c));
  };

  const addOption = async (catId: number, itemId: number, e: React.FormEvent) => {
    e.preventDefault();
    if (!newOptName.trim()) return;
    setAddingOpt(true);
    const res = await authFetch(`/api/dashboard/categories/items/${itemId}/options`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newOptName.trim(), nameAm: newOptNameAm.trim() || null }),
    });
    if (res.ok) {
      const opt: ItemOption = await res.json();
      setCats(prev => prev.map(c => c.id === catId ? { ...c, items: c.items.map(i =>
        i.id === itemId ? { ...i, options: [...i.options, opt] } : i) } : c));
      setNewOptName(""); setNewOptNameAm("");
    }
    setAddingOpt(false);
  };

  const saveEditOption = async (catId: number, itemId: number, optId: number) => {
    const res = await authFetch(`/api/dashboard/categories/items/${itemId}/options/${optId}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editOptName, nameAm: editOptNameAm || null }),
    });
    if (res.ok) {
      const updated: ItemOption = await res.json();
      setCats(prev => prev.map(c => c.id === catId ? { ...c, items: c.items.map(i =>
        i.id === itemId ? { ...i, options: i.options.map(o => o.id === optId ? updated : o) } : i) } : c));
      setEditOptId(null);
    }
  };

  const deleteOption = async (catId: number, itemId: number, optId: number) => {
    const res = await authFetch(`/api/dashboard/categories/items/${itemId}/options/${optId}`, { method: "DELETE" });
    if (res.ok) setCats(prev => prev.map(c => c.id === catId ? { ...c, items: c.items.map(i =>
      i.id === itemId ? { ...i, options: i.options.filter(o => o.id !== optId) } : i) } : c));
  };

  const inputCls = "w-full h-9 border border-stone-200 dark:border-zinc-600 bg-white dark:bg-zinc-700 dark:text-zinc-100 rounded px-3 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400";

  return (
    <div className="min-h-screen">
      <NavBar />

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-stone-900 dark:text-zinc-100">{t("categoriesTitle")}</h1>
            <p className="text-sm text-stone-400 dark:text-zinc-500">{t("categoriesSubtitle")}</p>
          </div>
          <button onClick={() => { setShowAdd(v => !v); setError(null); }}
            className="flex items-center gap-1.5 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-sm font-semibold
              px-4 py-2 rounded hover:bg-zinc-800 dark:hover:bg-white transition-colors">
            <Plus className="h-4 w-4" /> {t("addCategory")}
          </button>
        </div>

        {/* Add category form */}
        {showAdd && (
          <form onSubmit={addCategory} className="glass rounded p-4 space-y-3">
            <p className="text-sm font-semibold text-stone-700 dark:text-zinc-300">{t("newCategory")}</p>
            <div className="flex gap-2">
              <input value={newName} onChange={e => setNewName(e.target.value)}
                required placeholder={t("categoryName")} className={`${inputCls} flex-1`} />
              <button type="submit" disabled={adding}
                className="bg-zinc-900 text-white text-sm font-semibold px-4 py-2 rounded
                  hover:bg-zinc-700 transition-colors flex items-center gap-1.5 disabled:opacity-50 shrink-0">
                {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} {t("addBtn")}
              </button>
              <button type="button" onClick={() => setShowAdd(false)}
                className="text-stone-400 hover:text-stone-700 px-2"><X className="h-4 w-4" /></button>
            </div>
            <div>
              <p className="text-xs text-stone-400 dark:text-zinc-500 mb-2">{t("pickIcon")}</p>
              <div className="flex flex-wrap gap-1.5">
                {ICONS.map(ic => (
                  <button key={ic.value} type="button" onClick={() => setNewIcon(ic.value)}
                    className={`text-lg px-2 py-1 rounded border transition-colors
                      ${newIcon === ic.value ? "border-zinc-500 bg-zinc-50 dark:bg-amber-900/20" : "border-stone-200 dark:border-zinc-600 hover:border-zinc-400"}`}
                    title={t(ic.labelKey)}>{ic.emoji}</button>
                ))}
              </div>
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
          </form>
        )}

        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-zinc-700 dark:text-zinc-300" /></div>
        ) : cats.length === 0 ? (
          <div className="text-center py-16 glass rounded">
            <p className="text-stone-400 text-sm">{t("noCategoriesYet")}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {cats.map(cat => (
              <div key={cat.id} className={`glass rounded overflow-hidden transition-opacity ${!cat.enabled ? "opacity-50" : ""}`}>
                {/* Category header */}
                <div className="px-4 py-3 flex items-center gap-3">
                  <button onClick={() => toggleExpand(cat.id)}
                    className="text-stone-400 hover:text-stone-700 transition-colors shrink-0">
                    {expanded.has(cat.id) ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  </button>

                  {editCatId === cat.id ? (
                    <div className="flex flex-wrap gap-1 flex-1">
                      {ICONS.map(ic => (
                        <button key={ic.value} type="button" onClick={() => setEditCatIcon(ic.value)}
                          className={`text-base px-1.5 py-0.5 rounded border transition-colors
                            ${editCatIcon === ic.value ? "border-zinc-500 bg-zinc-50 dark:bg-amber-900/20" : "border-stone-200 dark:border-zinc-600 hover:border-stone-400"}`}
                          title={t(ic.labelKey)}>{ic.emoji}</button>
                      ))}
                    </div>
                  ) : (
                    <span className="text-xl shrink-0">{iconEmoji(cat.icon)}</span>
                  )}

                  {editCatId === cat.id ? (
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <input value={editCatName} onChange={e => setEditCatName(e.target.value)}
                        className={`${inputCls} flex-1 min-w-0`} autoFocus
                        onKeyDown={e => { if (e.key === "Enter") saveEditCat(cat.id); if (e.key === "Escape") setEditCatId(null); }} />
                      <div className="flex items-center gap-1 shrink-0">
                        <span className="text-xs text-stone-400 dark:text-zinc-500">ETA</span>
                        <input type="number" min={1} max={480} placeholder="min"
                          value={editCatEta}
                          onChange={e => setEditCatEta(e.target.value)}
                          className="w-16 h-9 border border-stone-200 dark:border-zinc-600 bg-white dark:bg-zinc-700 dark:text-zinc-100 rounded px-2 text-sm
                            text-center focus:outline-none focus:ring-2 focus:ring-zinc-400" />
                      </div>
                    </div>
                  ) : (
                    <button onClick={() => toggleExpand(cat.id)}
                      className="flex-1 text-left font-semibold text-stone-900 dark:text-zinc-100 text-sm">{lang === "am" && cat.nameAm ? cat.nameAm : cat.name}</button>
                  )}

                  <span className="text-xs text-stone-400 dark:text-zinc-500 shrink-0">{cat.items.length} {t("itemsCount")}</span>

                  {editCatId === cat.id ? (
                    <div className="flex gap-1 shrink-0">
                      <button onClick={() => saveEditCat(cat.id)}
                        className="p-1.5 rounded bg-zinc-900 text-white hover:bg-zinc-700 transition-colors">
                        <Check className="h-3.5 w-3.5" /></button>
                      <button onClick={() => setEditCatId(null)}
                        className="p-1.5 rounded hover:bg-stone-100 text-stone-400 transition-colors">
                        <X className="h-3.5 w-3.5" /></button>
                    </div>
                  ) : (
                    <div className="flex gap-1 shrink-0">
                      <button onClick={() => toggleCat(cat.id, cat.enabled)}
                        title={cat.enabled ? t("disableCategory") : t("enableCategory")}
                        className="p-1.5 rounded transition-colors">
                        {cat.enabled
                          ? <ToggleRight className="h-4.5 w-4.5 text-green-600" />
                          : <ToggleLeft  className="h-4.5 w-4.5 text-stone-400" />}
                      </button>
                      <button onClick={() => { setEditCatId(cat.id); setEditCatName(cat.name); setEditCatIcon(cat.icon); setEditCatEta(cat.etaMinutes != null ? String(cat.etaMinutes) : ""); }}
                        className="p-1.5 rounded hover:bg-stone-100 text-stone-400 hover:text-stone-700 transition-colors">
                        <Pencil className="h-3.5 w-3.5" /></button>
                      <button onClick={() => deleteCat(cat.id, cat.name)}
                        className="p-1.5 rounded hover:bg-red-50 text-stone-300 hover:text-red-500 transition-colors">
                        <Trash2 className="h-3.5 w-3.5" /></button>
                    </div>
                  )}
                </div>

                {/* Items list */}
                {expanded.has(cat.id) && (
                  <div className="border-t border-stone-100 dark:border-zinc-700/50">
                    {cat.items.map(item => (
                      <div key={item.id}
                        className={`border-b border-stone-50 dark:border-zinc-700/30 last:border-0
                          ${!item.enabled ? "opacity-50" : ""}`}>
                        <div className="px-4 py-2.5 flex items-center gap-3">

                        <button onClick={() => toggleItem(cat.id, item.id, item.enabled)}
                          className="shrink-0 text-stone-400 hover:text-stone-700 transition-colors">
                          {item.enabled
                            ? <ToggleRight className="h-4.5 w-4.5 text-green-600" />
                            : <ToggleLeft  className="h-4.5 w-4.5 text-stone-400" />}
                        </button>

                        {editItemId === item.id ? (
                          <div className="flex-1 space-y-2">
                            <div className="flex items-center gap-2">
                              <input value={editItemName} onChange={e => setEditItemName(e.target.value)}
                                className={`${inputCls} flex-1 min-w-0`} autoFocus placeholder={t("itemNamePlaceholder")}
                                onKeyDown={e => { if (e.key === "Escape") setEditItemId(null); }} />
                              <input value={editItemNameAm} onChange={e => setEditItemNameAm(e.target.value)}
                                className={`${inputCls} flex-1 min-w-0`} placeholder="አማርኛ ስም"
                                onKeyDown={e => { if (e.key === "Escape") setEditItemId(null); }} />
                              {!editSchedulable && (
                                <div className="flex items-center gap-1 shrink-0">
                                  <span className="text-xs text-stone-400 dark:text-zinc-500">{t("maxLabel")}</span>
                                  <input type="number" min={1} max={99} value={editItemQty}
                                    onChange={e => setEditItemQty(Number(e.target.value))}
                                    className="w-14 h-9 border border-stone-200 dark:border-zinc-600 bg-white dark:bg-zinc-700 dark:text-zinc-100 rounded px-2 text-sm
                                      text-center focus:outline-none focus:ring-2 focus:ring-zinc-400" />
                                </div>
                              )}
                              <button onClick={() => saveEditItem(cat.id, item.id)}
                                className="p-1.5 rounded bg-zinc-900 text-white hover:bg-zinc-700 transition-colors shrink-0">
                                <Check className="h-3.5 w-3.5" /></button>
                              <button onClick={() => setEditItemId(null)}
                                className="p-1.5 rounded hover:bg-stone-100 text-stone-400 transition-colors shrink-0">
                                <X className="h-3.5 w-3.5" /></button>
                            </div>
                            <div className="flex flex-wrap gap-1 pl-1">
                              <button type="button" onClick={() => setEditItemIcon("")}
                                className={`text-xs px-2 py-1 rounded border transition-colors
                                  ${editItemIcon === "" ? "border-zinc-500 bg-zinc-50 dark:bg-amber-900/20" : "border-stone-200 dark:border-zinc-600 hover:border-zinc-400"}`}>
                                {t("noIcon") || "—"}
                              </button>
                              {ICONS.map(ic => (
                                <button key={ic.value} type="button" onClick={() => setEditItemIcon(ic.value)}
                                  className={`text-base px-1.5 py-0.5 rounded border transition-colors
                                    ${editItemIcon === ic.value ? "border-zinc-500 bg-zinc-50 dark:bg-amber-900/20" : "border-stone-200 dark:border-zinc-600 hover:border-zinc-400"}`}
                                  title={t(ic.labelKey)}>{ic.emoji}</button>
                              ))}
                            </div>
                            <div className="flex items-center gap-3 pl-1 flex-wrap">
                              <label className="flex items-center gap-1.5 cursor-pointer">
                                <input type="checkbox" checked={editSchedulable}
                                  onChange={e => setEditSchedulable(e.target.checked)}
                                  className="accent-zinc-700" />
                                <span className="text-xs font-semibold text-stone-600 dark:text-zinc-400">{t("enableScheduling")}</span>
                              </label>
                              {editSchedulable && (
                                <>
                                  <div className="flex items-center gap-1">
                                    <span className="text-xs text-stone-400 dark:text-zinc-500">{t("everyLabel")}</span>
                                    <input type="number" min={5} max={240} step={5} value={editInterval}
                                      onChange={e => setEditInterval(Number(e.target.value))}
                                      className="w-16 h-7 border border-stone-200 dark:border-zinc-600 bg-white dark:bg-zinc-700 dark:text-zinc-100 rounded px-2 text-xs
                                        text-center focus:outline-none focus:ring-2 focus:ring-zinc-400" />
                                    <span className="text-xs text-stone-400 dark:text-zinc-500">{t("minLabel")}</span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <span className="text-xs text-stone-400 dark:text-zinc-500">{t("capacityLabel")}</span>
                                    <input type="number" min={1} max={500} value={editCapacity}
                                      onChange={e => setEditCapacity(Number(e.target.value))}
                                      className="w-16 h-7 border border-stone-200 dark:border-zinc-600 bg-white dark:bg-zinc-700 dark:text-zinc-100 rounded px-2 text-xs
                                        text-center focus:outline-none focus:ring-2 focus:ring-zinc-400" />
                                    <span className="text-xs text-stone-400 dark:text-zinc-500">{t("peopleLabel")}</span>
                                  </div>
                                </>
                              )}
                            </div>
                          </div>
                        ) : (
                          <>
                            {item.icon
                              ? <span className="text-base shrink-0">{iconEmoji(item.icon)}</span>
                              : <span className="w-4 shrink-0" />}
                            <div className="flex-1 min-w-0">
                              <span className="text-sm text-stone-800 dark:text-zinc-200">{lang === "am" && item.nameAm ? item.nameAm : item.name}</span>
                              {item.schedulable && (
                                <span className="ml-2 text-[10px] font-semibold text-zinc-700 dark:text-zinc-300 bg-zinc-50
                                  border border-zinc-200 rounded px-1.5 py-0.5 inline-flex items-center gap-0.5">
                                  <CalendarClock className="h-2.5 w-2.5" />
                                  {item.slotIntervalMins}{t("minLabel")} · {item.capacity} ppl
                                </span>
                              )}
                            </div>
                            {!item.schedulable && (
                              <span className="text-xs text-stone-400 dark:text-zinc-500 shrink-0">{t("maxLabel")} {item.maxQuantity}</span>
                            )}
                            <button onClick={() => toggleSchedulable(cat.id, item.id, item.schedulable)}
                              title={item.schedulable ? t("enableScheduling") : t("enableScheduling")}
                              className={`p-1.5 rounded transition-colors shrink-0
                                ${item.schedulable ? "text-zinc-700 dark:text-zinc-300 bg-zinc-50 hover:bg-zinc-100" : "text-stone-300 hover:text-stone-500 hover:bg-stone-100"}`}>
                              <CalendarClock className="h-3.5 w-3.5" /></button>
                            <button title="Edit item" onClick={() => {
                              setEditItemId(item.id); setEditItemName(item.name);
                              setEditItemNameAm(item.nameAm ?? "");
                              setEditItemIcon(item.icon ?? "");
                              setEditItemQty(item.maxQuantity); setEditSchedulable(item.schedulable);
                              setEditInterval(item.slotIntervalMins); setEditCapacity(item.capacity);
                            }}
                              className="p-1.5 rounded hover:bg-stone-100 text-stone-400 hover:text-stone-700 transition-colors shrink-0">
                              <Pencil className="h-3 w-3" /></button>
                            <button
                              title="Manage choices"
                              onClick={() => setOptionsOpenId(optionsOpenId === item.id ? null : item.id)}
                              className={`p-1.5 rounded transition-colors shrink-0 text-xs font-semibold
                                ${optionsOpenId === item.id
                                  ? "bg-zinc-800 text-white dark:bg-zinc-600"
                                  : item.options.length > 0
                                    ? "text-zinc-600 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-700 hover:bg-zinc-200"
                                    : "text-stone-300 hover:text-stone-500 hover:bg-stone-100"}`}>
                              {item.options.length > 0 ? item.options.length : "+"} choices
                            </button>
                            <button onClick={() => deleteItem(cat.id, item.id)}
                              className="p-1.5 rounded hover:bg-red-50 text-stone-300 hover:text-red-500 transition-colors shrink-0">
                              <Trash2 className="h-3 w-3" /></button>
                          </>
                        )}
                        </div>

                        {/* Options sub-panel */}
                        {optionsOpenId === item.id && (
                          <div className="border-t border-stone-100 dark:border-zinc-700/40 bg-stone-50/60 dark:bg-zinc-800/40 px-6 py-2 space-y-1">
                            <p className="text-[10px] font-semibold text-stone-400 dark:text-zinc-500 uppercase tracking-wider mb-2">Choices / Types</p>
                            {item.options.map(opt => (
                              <div key={opt.id} className="flex items-center gap-2">
                                {editOptId === opt.id ? (
                                  <>
                                    <input value={editOptName} onChange={e => setEditOptName(e.target.value)}
                                      autoFocus className={`${inputCls} flex-1 min-w-0`}
                                      onKeyDown={e => { if (e.key === "Enter") saveEditOption(cat.id, item.id, opt.id); if (e.key === "Escape") setEditOptId(null); }} />
                                    <input value={editOptNameAm} onChange={e => setEditOptNameAm(e.target.value)}
                                      placeholder="አማርኛ" className={`${inputCls} flex-1 min-w-0`} />
                                    <button onClick={() => saveEditOption(cat.id, item.id, opt.id)}
                                      className="p-1 rounded bg-zinc-900 text-white hover:bg-zinc-700 shrink-0">
                                      <Check className="h-3 w-3" /></button>
                                    <button onClick={() => setEditOptId(null)}
                                      className="p-1 rounded hover:bg-stone-100 text-stone-400 shrink-0">
                                      <X className="h-3 w-3" /></button>
                                  </>
                                ) : (
                                  <>
                                    <span className="flex-1 text-sm text-stone-700 dark:text-zinc-300">
                                      {lang === "am" && opt.nameAm ? opt.nameAm : opt.name}
                                    </span>
                                    <button onClick={() => { setEditOptId(opt.id); setEditOptName(opt.name); setEditOptNameAm(opt.nameAm); }}
                                      className="p-1 rounded hover:bg-stone-100 text-stone-400 hover:text-stone-700 shrink-0">
                                      <Pencil className="h-3 w-3" /></button>
                                    <button onClick={() => deleteOption(cat.id, item.id, opt.id)}
                                      className="p-1 rounded hover:bg-red-50 text-stone-300 hover:text-red-500 shrink-0">
                                      <Trash2 className="h-3 w-3" /></button>
                                  </>
                                )}
                              </div>
                            ))}
                            <form onSubmit={e => addOption(cat.id, item.id, e)} className="flex items-center gap-2 pt-1">
                              <input value={newOptName} onChange={e => setNewOptName(e.target.value)}
                                required placeholder="Choice name" className={`${inputCls} flex-1 min-w-0`} />
                              <input value={newOptNameAm} onChange={e => setNewOptNameAm(e.target.value)}
                                placeholder="አማርኛ" className={`${inputCls} flex-1 min-w-0`} />
                              <button type="submit" disabled={addingOpt}
                                className="p-1.5 rounded bg-zinc-900 text-white hover:bg-zinc-700 transition-colors shrink-0">
                                {addingOpt ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
                              </button>
                            </form>
                          </div>
                        )}
                      </div>
                    ))}

                    {/* Add item row */}
                    {addItemCatId === cat.id ? (
                      <form onSubmit={e => addItem(cat.id, e)}
                        className="px-4 py-2.5 space-y-2 bg-stone-50 dark:bg-zinc-800/60">
                        <div className="flex items-center gap-2">
                          <input value={addItemName} onChange={e => setAddItemName(e.target.value)}
                            required placeholder={t("itemNamePlaceholder")} autoFocus
                            className={`${inputCls} flex-1 min-w-0`} />
                          <input value={addItemNameAm} onChange={e => setAddItemNameAm(e.target.value)}
                            placeholder="አማርኛ ስም"
                            className={`${inputCls} flex-1 min-w-0`} />
                          {!addItemSchedulable && (
                            <div className="flex items-center gap-1 shrink-0">
                              <span className="text-xs text-stone-400 dark:text-zinc-500">{t("maxLabel")}</span>
                              <input type="number" min={1} max={99} value={addItemQty}
                                onChange={e => setAddItemQty(Number(e.target.value))}
                                className="w-14 h-9 border border-stone-200 dark:border-zinc-600 bg-white dark:bg-zinc-700 dark:text-zinc-100 rounded px-2 text-sm
                                  text-center focus:outline-none focus:ring-2 focus:ring-zinc-400" />
                            </div>
                          )}
                          <button type="submit" disabled={addingItem}
                            className="p-1.5 rounded bg-zinc-900 text-white hover:bg-zinc-700 transition-colors shrink-0">
                            {addingItem ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                          </button>
                          <button type="button" onClick={() => { setAddItemCatId(null); setAddItemName(""); setAddItemSchedulable(false); setAddItemInterval(60); setAddItemCapacity(10); setAddItemIcon(""); }}
                            className="p-1.5 rounded hover:bg-stone-100 text-stone-400 transition-colors shrink-0">
                            <X className="h-3.5 w-3.5" /></button>
                        </div>
                        <div className="flex flex-wrap gap-1 pl-1">
                          <button type="button" onClick={() => setAddItemIcon("")}
                            className={`text-xs px-2 py-1 rounded border transition-colors
                              ${addItemIcon === "" ? "border-zinc-500 bg-zinc-50 dark:bg-amber-900/20" : "border-stone-200 dark:border-zinc-600 hover:border-zinc-400"}`}>
                            {t("noIcon") || "—"}
                          </button>
                          {ICONS.map(ic => (
                            <button key={ic.value} type="button" onClick={() => setAddItemIcon(ic.value)}
                              className={`text-base px-1.5 py-0.5 rounded border transition-colors
                                ${addItemIcon === ic.value ? "border-zinc-500 bg-zinc-50 dark:bg-amber-900/20" : "border-stone-200 dark:border-zinc-600 hover:border-zinc-400"}`}
                              title={t(ic.labelKey)}>{ic.emoji}</button>
                          ))}
                        </div>
                        <div className="flex items-center gap-3 pl-1 flex-wrap">
                          <label className="flex items-center gap-1.5 cursor-pointer">
                            <input type="checkbox" checked={addItemSchedulable}
                              onChange={e => setAddItemSchedulable(e.target.checked)}
                              className="accent-zinc-700" />
                            <span className="text-xs font-semibold text-stone-600 dark:text-zinc-400">{t("enableScheduling")}</span>
                          </label>
                          {addItemSchedulable && (
                            <>
                              <div className="flex items-center gap-1">
                                <span className="text-xs text-stone-400 dark:text-zinc-500">{t("everyLabel")}</span>
                                <input type="number" min={5} max={240} step={5} value={addItemInterval}
                                  onChange={e => setAddItemInterval(Number(e.target.value))}
                                  className="w-16 h-7 border border-stone-200 dark:border-zinc-600 bg-white dark:bg-zinc-700 dark:text-zinc-100 rounded px-2 text-xs
                                    text-center focus:outline-none focus:ring-2 focus:ring-zinc-400" />
                                <span className="text-xs text-stone-400 dark:text-zinc-500">{t("minLabel")}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <span className="text-xs text-stone-400 dark:text-zinc-500">{t("capacityLabel")}</span>
                                <input type="number" min={1} max={500} value={addItemCapacity}
                                  onChange={e => setAddItemCapacity(Number(e.target.value))}
                                  className="w-16 h-7 border border-stone-200 dark:border-zinc-600 bg-white dark:bg-zinc-700 dark:text-zinc-100 rounded px-2 text-xs
                                    text-center focus:outline-none focus:ring-2 focus:ring-zinc-400" />
                                <span className="text-xs text-stone-400 dark:text-zinc-500">{t("peopleLabel")}</span>
                              </div>
                            </>
                          )}
                        </div>
                      </form>
                    ) : (
                      <button onClick={() => { setAddItemCatId(cat.id); setAddItemName(""); setAddItemQty(1); setAddItemSchedulable(false); setAddItemInterval(60); setAddItemCapacity(10); setAddItemIcon(""); }}
                        className="w-full px-4 py-2 text-xs text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 flex items-center gap-1.5
                          transition-colors font-medium">
                        <Plus className="h-3.5 w-3.5" /> {t("addItem")}
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
