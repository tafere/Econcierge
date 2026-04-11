import { useEffect, useState } from "react";
import { getToken } from "@/lib/auth";
import { useLang } from "@/lib/lang";
import {
  Plus, Loader2, Trash2, Pencil,
  ToggleLeft, ToggleRight, ChevronDown, ChevronRight, X, Check, CalendarClock,
} from "lucide-react";
import NavBar from "@/components/NavBar";

interface CatItem {
  id: number;
  name: string;
  nameAm?: string;
  enabled: boolean;
  maxQuantity: number;
  schedulable: boolean;
  slotIntervalMins: number;
  capacity: number;
}

interface Category {
  id: number;
  name: string;
  icon: string;
  sortOrder: number;
  items: CatItem[];
}

const ICONS = [
  { value: "broom",           emoji: "🧹", labelKey: "iconHousekeeping" },
  { value: "sparkles",        emoji: "✨", labelKey: "iconAmenities" },
  { value: "soap",            emoji: "🧴", labelKey: "iconToiletries" },
  { value: "utensils",        emoji: "🍽️", labelKey: "iconFoodBeverage" },
  { value: "wrench",          emoji: "🔧", labelKey: "iconMaintenance" },
  { value: "concierge-bell",  emoji: "🛎️", labelKey: "iconConcierge" },
  { value: "car",             emoji: "🚗", labelKey: "iconTransport" },
  { value: "coffee",          emoji: "☕", labelKey: "iconCafeBar" },
  { value: "flower",          emoji: "🌸", labelKey: "iconSpa" },
  { value: "dumbbell",        emoji: "💪", labelKey: "iconGym" },
  { value: "briefcase",       emoji: "💼", labelKey: "iconMeeting" },
  { value: "star",            emoji: "⭐", labelKey: "iconGeneral" },
];

const iconEmoji = (v: string) => ICONS.find(i => i.value === v)?.emoji ?? "📋";

export default function CategoriesPage() {
  const { t } = useLang();
  const [cats, setCats]         = useState<Category[]>([]);
  const [loading, setLoading]   = useState(true);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [showAdd, setShowAdd]   = useState(false);
  const [error, setError]       = useState<string | null>(null);

  const [newName, setNewName] = useState("");
  const [newIcon, setNewIcon] = useState("sparkles");
  const [adding, setAdding]   = useState(false);

  const [editCatId, setEditCatId]     = useState<number | null>(null);
  const [editCatName, setEditCatName] = useState("");
  const [editCatIcon, setEditCatIcon] = useState("");

  const [addItemCatId, setAddItemCatId]   = useState<number | null>(null);
  const [addItemName, setAddItemName]     = useState("");
  const [addItemNameAm, setAddItemNameAm] = useState("");
  const [addItemQty, setAddItemQty]       = useState(1);
  const [addingItem, setAddingItem]       = useState(false);

  const [editItemId, setEditItemId]           = useState<number | null>(null);
  const [editItemName, setEditItemName]       = useState("");
  const [editItemNameAm, setEditItemNameAm]   = useState("");
  const [editItemQty, setEditItemQty]         = useState(1);
  const [editSchedulable, setEditSchedulable] = useState(false);
  const [editInterval, setEditInterval]       = useState(30);
  const [editCapacity, setEditCapacity]       = useState(15);

  const authH = () => ({ Authorization: `Bearer ${getToken()}`, "Content-Type": "application/json" });

  const fetchCats = async () => {
    const res = await fetch("/api/dashboard/categories", { headers: authH() });
    if (res.ok) setCats(await res.json());
    setLoading(false);
  };

  useEffect(() => { fetchCats(); }, []);

  const toggleExpand = (id: number) =>
    setExpanded(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });

  const addCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdding(true); setError(null);
    const res = await fetch("/api/dashboard/categories", {
      method: "POST", headers: authH(),
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
    const res = await fetch(`/api/dashboard/categories/${id}`, {
      method: "PATCH", headers: authH(),
      body: JSON.stringify({ name: editCatName, icon: editCatIcon }),
    });
    if (res.ok) {
      setCats(prev => prev.map(c => c.id === id ? { ...c, name: editCatName, icon: editCatIcon } : c));
      setEditCatId(null);
    }
  };

  const deleteCat = async (id: number, name: string) => {
    if (!confirm(t("confirmDeleteCategory").replace("{name}", name))) return;
    const res = await fetch(`/api/dashboard/categories/${id}`, { method: "DELETE", headers: authH() });
    if (res.ok) setCats(prev => prev.filter(c => c.id !== id));
  };

  const addItem = async (catId: number, e: React.FormEvent) => {
    e.preventDefault();
    setAddingItem(true);
    const res = await fetch(`/api/dashboard/categories/${catId}/items`, {
      method: "POST", headers: authH(),
      body: JSON.stringify({ name: addItemName, nameAm: addItemNameAm || null, maxQuantity: addItemQty }),
    });
    if (res.ok) {
      const item = await res.json();
      setCats(prev => prev.map(c => c.id === catId ? { ...c, items: [...c.items, item] } : c));
      setAddItemCatId(null); setAddItemName(""); setAddItemNameAm(""); setAddItemQty(1);
    }
    setAddingItem(false);
  };

  const toggleItem = async (catId: number, itemId: number, enabled: boolean) => {
    const res = await fetch(`/api/dashboard/categories/items/${itemId}`, {
      method: "PATCH", headers: authH(),
      body: JSON.stringify({ enabled: !enabled }),
    });
    if (res.ok) setCats(prev => prev.map(c => c.id === catId
      ? { ...c, items: c.items.map(i => i.id === itemId ? { ...i, enabled: !enabled } : i) } : c));
  };

  const saveEditItem = async (catId: number, itemId: number) => {
    const res = await fetch(`/api/dashboard/categories/items/${itemId}`, {
      method: "PATCH", headers: authH(),
      body: JSON.stringify({
        name: editItemName, nameAm: editItemNameAm || null, maxQuantity: editItemQty,
        schedulable: editSchedulable, slotIntervalMins: editInterval, capacity: editCapacity,
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
    const res = await fetch(`/api/dashboard/categories/items/${itemId}`, {
      method: "PATCH", headers: authH(),
      body: JSON.stringify({ schedulable: !current }),
    });
    if (res.ok) setCats(prev => prev.map(c => c.id === catId
      ? { ...c, items: c.items.map(i => i.id === itemId ? { ...i, schedulable: !current } : i) } : c));
  };

  const deleteItem = async (catId: number, itemId: number) => {
    const res = await fetch(`/api/dashboard/categories/items/${itemId}`, { method: "DELETE", headers: authH() });
    if (res.ok) setCats(prev => prev.map(c => c.id === catId
      ? { ...c, items: c.items.filter(i => i.id !== itemId) } : c));
  };

  const inputCls = "w-full h-9 border border-stone-200 bg-white rounded px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-700";

  return (
    <div className="min-h-screen">
      <NavBar />

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-stone-900">{t("categoriesTitle")}</h1>
            <p className="text-sm text-stone-400">{t("categoriesSubtitle")}</p>
          </div>
          <button onClick={() => { setShowAdd(v => !v); setError(null); }}
            className="flex items-center gap-1.5 bg-brand-700 text-white text-sm font-semibold
              px-4 py-2 rounded hover:bg-brand-800 transition-colors">
            <Plus className="h-4 w-4" /> {t("addCategory")}
          </button>
        </div>

        {/* Add category form */}
        {showAdd && (
          <form onSubmit={addCategory} className="glass rounded p-4 space-y-3">
            <p className="text-sm font-semibold text-stone-700">{t("newCategory")}</p>
            <div className="flex gap-2">
              <input value={newName} onChange={e => setNewName(e.target.value)}
                required placeholder={t("categoryName")} className={`${inputCls} flex-1`} />
              <button type="submit" disabled={adding}
                className="bg-brand-700 text-white text-sm font-semibold px-4 py-2 rounded
                  hover:bg-brand-800 transition-colors flex items-center gap-1.5 disabled:opacity-50 shrink-0">
                {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} {t("addBtn")}
              </button>
              <button type="button" onClick={() => setShowAdd(false)}
                className="text-stone-400 hover:text-stone-700 px-2"><X className="h-4 w-4" /></button>
            </div>
            <div>
              <p className="text-xs text-stone-400 mb-2">{t("pickIcon")}</p>
              <div className="flex flex-wrap gap-1.5">
                {ICONS.map(ic => (
                  <button key={ic.value} type="button" onClick={() => setNewIcon(ic.value)}
                    className={`text-lg px-2 py-1 rounded border transition-colors
                      ${newIcon === ic.value ? "border-brand-700 bg-brand-50" : "border-stone-200 hover:border-brand-400"}`}
                    title={t(ic.labelKey)}>{ic.emoji}</button>
                ))}
              </div>
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
          </form>
        )}

        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-brand-700" /></div>
        ) : cats.length === 0 ? (
          <div className="text-center py-16 glass rounded">
            <p className="text-stone-400 text-sm">{t("noCategoriesYet")}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {cats.map(cat => (
              <div key={cat.id} className="glass rounded overflow-hidden">
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
                            ${editCatIcon === ic.value ? "border-brand-700 bg-brand-50" : "border-stone-200 hover:border-stone-400"}`}
                          title={t(ic.labelKey)}>{ic.emoji}</button>
                      ))}
                    </div>
                  ) : (
                    <span className="text-xl shrink-0">{iconEmoji(cat.icon)}</span>
                  )}

                  {editCatId === cat.id ? (
                    <input value={editCatName} onChange={e => setEditCatName(e.target.value)}
                      className={`${inputCls} flex-1 min-w-0`} autoFocus
                      onKeyDown={e => { if (e.key === "Enter") saveEditCat(cat.id); if (e.key === "Escape") setEditCatId(null); }} />
                  ) : (
                    <button onClick={() => toggleExpand(cat.id)}
                      className="flex-1 text-left font-semibold text-stone-900 text-sm">{cat.name}</button>
                  )}

                  <span className="text-xs text-stone-400 shrink-0">{cat.items.length} {t("itemsCount")}</span>

                  {editCatId === cat.id ? (
                    <div className="flex gap-1 shrink-0">
                      <button onClick={() => saveEditCat(cat.id)}
                        className="p-1.5 rounded bg-brand-700 text-white hover:bg-brand-800 transition-colors">
                        <Check className="h-3.5 w-3.5" /></button>
                      <button onClick={() => setEditCatId(null)}
                        className="p-1.5 rounded hover:bg-stone-100 text-stone-400 transition-colors">
                        <X className="h-3.5 w-3.5" /></button>
                    </div>
                  ) : (
                    <div className="flex gap-1 shrink-0">
                      <button onClick={() => { setEditCatId(cat.id); setEditCatName(cat.name); setEditCatIcon(cat.icon); }}
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
                  <div className="border-t border-stone-100">
                    {cat.items.map(item => (
                      <div key={item.id}
                        className={`px-4 py-2.5 flex items-center gap-3 border-b border-stone-50 last:border-0
                          ${!item.enabled ? "opacity-50" : ""}`}>

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
                              <div className="flex items-center gap-1 shrink-0">
                                <span className="text-xs text-stone-400">{t("maxLabel")}</span>
                                <input type="number" min={1} max={99} value={editItemQty}
                                  onChange={e => setEditItemQty(Number(e.target.value))}
                                  className="w-14 h-9 border border-stone-200 bg-white rounded px-2 text-sm
                                    text-center focus:outline-none focus:ring-2 focus:ring-brand-700" />
                              </div>
                              <button onClick={() => saveEditItem(cat.id, item.id)}
                                className="p-1.5 rounded bg-brand-700 text-white hover:bg-brand-800 transition-colors shrink-0">
                                <Check className="h-3.5 w-3.5" /></button>
                              <button onClick={() => setEditItemId(null)}
                                className="p-1.5 rounded hover:bg-stone-100 text-stone-400 transition-colors shrink-0">
                                <X className="h-3.5 w-3.5" /></button>
                            </div>
                            <div className="flex items-center gap-3 pl-1 flex-wrap">
                              <label className="flex items-center gap-1.5 cursor-pointer">
                                <input type="checkbox" checked={editSchedulable}
                                  onChange={e => setEditSchedulable(e.target.checked)}
                                  className="accent-brand-700" />
                                <span className="text-xs font-semibold text-stone-600">{t("enableScheduling")}</span>
                              </label>
                              {editSchedulable && (
                                <>
                                  <div className="flex items-center gap-1">
                                    <span className="text-xs text-stone-400">{t("everyLabel")}</span>
                                    <input type="number" min={5} max={240} step={5} value={editInterval}
                                      onChange={e => setEditInterval(Number(e.target.value))}
                                      className="w-16 h-7 border border-stone-200 bg-white rounded px-2 text-xs
                                        text-center focus:outline-none focus:ring-2 focus:ring-brand-700" />
                                    <span className="text-xs text-stone-400">{t("minLabel")}</span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <span className="text-xs text-stone-400">{t("capacityLabel")}</span>
                                    <input type="number" min={1} max={500} value={editCapacity}
                                      onChange={e => setEditCapacity(Number(e.target.value))}
                                      className="w-16 h-7 border border-stone-200 bg-white rounded px-2 text-xs
                                        text-center focus:outline-none focus:ring-2 focus:ring-brand-700" />
                                    <span className="text-xs text-stone-400">{t("peopleLabel")}</span>
                                  </div>
                                </>
                              )}
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="flex-1 min-w-0">
                              <span className="text-sm text-stone-800">{item.name}</span>
                              {item.schedulable && (
                                <span className="ml-2 text-[10px] font-semibold text-brand-700 bg-brand-50
                                  border border-brand-200 rounded px-1.5 py-0.5 inline-flex items-center gap-0.5">
                                  <CalendarClock className="h-2.5 w-2.5" />
                                  {item.slotIntervalMins}{t("minLabel")} · {item.capacity} ppl
                                </span>
                              )}
                            </div>
                            {!item.schedulable && (
                              <span className="text-xs text-stone-400 shrink-0">{t("maxLabel")} {item.maxQuantity}</span>
                            )}
                            <button onClick={() => toggleSchedulable(cat.id, item.id, item.schedulable)}
                              title={item.schedulable ? t("enableScheduling") : t("enableScheduling")}
                              className={`p-1.5 rounded transition-colors shrink-0
                                ${item.schedulable ? "text-brand-700 bg-brand-50 hover:bg-brand-100" : "text-stone-300 hover:text-stone-500 hover:bg-stone-100"}`}>
                              <CalendarClock className="h-3.5 w-3.5" /></button>
                            <button onClick={() => {
                              setEditItemId(item.id); setEditItemName(item.name);
                              setEditItemNameAm(item.nameAm ?? "");
                              setEditItemQty(item.maxQuantity); setEditSchedulable(item.schedulable);
                              setEditInterval(item.slotIntervalMins); setEditCapacity(item.capacity);
                            }}
                              className="p-1.5 rounded hover:bg-stone-100 text-stone-400 hover:text-stone-700 transition-colors shrink-0">
                              <Pencil className="h-3 w-3" /></button>
                            <button onClick={() => deleteItem(cat.id, item.id)}
                              className="p-1.5 rounded hover:bg-red-50 text-stone-300 hover:text-red-500 transition-colors shrink-0">
                              <Trash2 className="h-3 w-3" /></button>
                          </>
                        )}
                      </div>
                    ))}

                    {/* Add item row */}
                    {addItemCatId === cat.id ? (
                      <form onSubmit={e => addItem(cat.id, e)}
                        className="px-4 py-2.5 flex items-center gap-2 bg-stone-50">
                        <input value={addItemName} onChange={e => setAddItemName(e.target.value)}
                          required placeholder={t("itemNamePlaceholder")} autoFocus
                          className={`${inputCls} flex-1 min-w-0`} />
                        <input value={addItemNameAm} onChange={e => setAddItemNameAm(e.target.value)}
                          placeholder="አማርኛ ስም"
                          className={`${inputCls} flex-1 min-w-0`} />
                        <div className="flex items-center gap-1 shrink-0">
                          <span className="text-xs text-stone-400">{t("maxLabel")}</span>
                          <input type="number" min={1} max={99} value={addItemQty}
                            onChange={e => setAddItemQty(Number(e.target.value))}
                            className="w-14 h-9 border border-stone-200 bg-white rounded px-2 text-sm
                              text-center focus:outline-none focus:ring-2 focus:ring-brand-700" />
                        </div>
                        <button type="submit" disabled={addingItem}
                          className="p-1.5 rounded bg-brand-700 text-white hover:bg-brand-800 transition-colors shrink-0">
                          {addingItem ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                        </button>
                        <button type="button" onClick={() => { setAddItemCatId(null); setAddItemName(""); }}
                          className="p-1.5 rounded hover:bg-stone-100 text-stone-400 transition-colors shrink-0">
                          <X className="h-3.5 w-3.5" /></button>
                      </form>
                    ) : (
                      <button onClick={() => { setAddItemCatId(cat.id); setAddItemName(""); setAddItemQty(1); }}
                        className="w-full px-4 py-2 text-xs text-brand-700 hover:bg-brand-50 flex items-center gap-1.5
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
