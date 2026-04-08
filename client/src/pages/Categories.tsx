import { useEffect, useState } from "react";
import { getToken } from "@/lib/auth";
import {
  Plus, Loader2, Trash2, Pencil,
  ToggleLeft, ToggleRight, ChevronDown, ChevronRight, X, Check,
} from "lucide-react";
import NavBar from "@/components/NavBar";

interface CatItem {
  id: number;
  name: string;
  enabled: boolean;
  maxQuantity: number;
}

interface Category {
  id: number;
  name: string;
  icon: string;
  sortOrder: number;
  items: CatItem[];
}

// Icon picker options — name maps to emoji shown in guest page
const ICONS = [
  { value: "broom",           emoji: "🧹", label: "Housekeeping" },
  { value: "sparkles",        emoji: "✨", label: "Amenities" },
  { value: "soap",            emoji: "🧴", label: "Toiletries" },
  { value: "utensils",        emoji: "🍽️", label: "Food & Beverage" },
  { value: "wrench",          emoji: "🔧", label: "Maintenance" },
  { value: "concierge-bell",  emoji: "🛎️", label: "Concierge" },
  { value: "car",             emoji: "🚗", label: "Transport" },
  { value: "coffee",          emoji: "☕", label: "Cafe & Bar" },
  { value: "flower",          emoji: "🌸", label: "Spa" },
  { value: "dumbbell",        emoji: "💪", label: "Gym" },
  { value: "briefcase",       emoji: "💼", label: "Meeting" },
  { value: "star",            emoji: "⭐", label: "General" },
];

const iconEmoji = (v: string) => ICONS.find(i => i.value === v)?.emoji ?? "📋";

export default function CategoriesPage() {
  const [cats, setCats]         = useState<Category[]>([]);
  const [loading, setLoading]   = useState(true);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [showAdd, setShowAdd]   = useState(false);
  const [error, setError]       = useState<string | null>(null);

  // New category form
  const [newName, setNewName] = useState("");
  const [newIcon, setNewIcon] = useState("sparkles");
  const [adding, setAdding]   = useState(false);

  // Inline edit state: catId -> draft name
  const [editCatId, setEditCatId]     = useState<number | null>(null);
  const [editCatName, setEditCatName] = useState("");
  const [editCatIcon, setEditCatIcon] = useState("");

  // Add item state: catId -> draft name + maxQty
  const [addItemCatId, setAddItemCatId]   = useState<number | null>(null);
  const [addItemName, setAddItemName]     = useState("");
  const [addItemQty, setAddItemQty]       = useState(1);
  const [addingItem, setAddingItem]       = useState(false);

  // Inline edit item
  const [editItemId, setEditItemId]     = useState<number | null>(null);
  const [editItemName, setEditItemName] = useState("");
  const [editItemQty, setEditItemQty]   = useState(1);

  const authH = () => ({ Authorization: `Bearer ${getToken()}`, "Content-Type": "application/json" });

  const fetchCats = async () => {
    const res = await fetch("/api/dashboard/categories", { headers: authH() });
    if (res.ok) setCats(await res.json());
    setLoading(false);
  };

  useEffect(() => { fetchCats(); }, []);

  const toggleExpand = (id: number) =>
    setExpanded(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });

  // ── Category actions ───────────────────────────────────────────────────────
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
    if (!confirm(`Delete "${name}" and all its items? This cannot be undone.`)) return;
    const res = await fetch(`/api/dashboard/categories/${id}`, { method: "DELETE", headers: authH() });
    if (res.ok) setCats(prev => prev.filter(c => c.id !== id));
  };

  // ── Item actions ──────────────────────────────────────────────────────────
  const addItem = async (catId: number, e: React.FormEvent) => {
    e.preventDefault();
    setAddingItem(true);
    const res = await fetch(`/api/dashboard/categories/${catId}/items`, {
      method: "POST", headers: authH(),
      body: JSON.stringify({ name: addItemName, maxQuantity: addItemQty }),
    });
    if (res.ok) {
      const item = await res.json();
      setCats(prev => prev.map(c => c.id === catId ? { ...c, items: [...c.items, item] } : c));
      setAddItemCatId(null); setAddItemName(""); setAddItemQty(1);
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
      body: JSON.stringify({ name: editItemName, maxQuantity: editItemQty }),
    });
    if (res.ok) {
      setCats(prev => prev.map(c => c.id === catId
        ? { ...c, items: c.items.map(i => i.id === itemId ? { ...i, name: editItemName, maxQuantity: editItemQty } : i) } : c));
      setEditItemId(null);
    }
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
            <h1 className="text-xl font-bold text-stone-900">Categories</h1>
            <p className="text-sm text-stone-400">Manage what guests can request</p>
          </div>
          <button onClick={() => { setShowAdd(v => !v); setError(null); }}
            className="flex items-center gap-1.5 bg-brand-700 text-white text-sm font-semibold
              px-4 py-2 rounded hover:bg-brand-800 transition-colors">
            <Plus className="h-4 w-4" /> Add Category
          </button>
        </div>

        {/* Add category form */}
        {showAdd && (
          <form onSubmit={addCategory} className="glass rounded p-4 space-y-3">
            <p className="text-sm font-semibold text-stone-700">New Category</p>
            <div className="flex gap-2">
              <input value={newName} onChange={e => setNewName(e.target.value)}
                required placeholder="Category name" className={`${inputCls} flex-1`} />
              <button type="submit" disabled={adding}
                className="bg-brand-700 text-white text-sm font-semibold px-4 py-2 rounded
                  hover:bg-brand-800 transition-colors flex items-center gap-1.5 disabled:opacity-50 shrink-0">
                {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Add
              </button>
              <button type="button" onClick={() => setShowAdd(false)}
                className="text-stone-400 hover:text-stone-700 px-2"><X className="h-4 w-4" /></button>
            </div>
            <div>
              <p className="text-xs text-stone-400 mb-2">Pick an icon:</p>
              <div className="flex flex-wrap gap-1.5">
                {ICONS.map(ic => (
                  <button key={ic.value} type="button" onClick={() => setNewIcon(ic.value)}
                    className={`text-lg px-2 py-1 rounded border transition-colors
                      ${newIcon === ic.value ? "border-brand-700 bg-brand-50" : "border-stone-200 hover:border-brand-400"}`}
                    title={ic.label}>{ic.emoji}</button>
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
            <p className="text-stone-400 text-sm">No categories yet. Add one above.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {cats.map(cat => (
              <div key={cat.id} className="glass rounded overflow-hidden">
                {/* Category header */}
                <div className="px-4 py-3 flex items-center gap-3">
                  {/* Expand toggle */}
                  <button onClick={() => toggleExpand(cat.id)}
                    className="text-stone-400 hover:text-stone-700 transition-colors shrink-0">
                    {expanded.has(cat.id) ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  </button>

                  {/* Icon */}
                  {editCatId === cat.id ? (
                    <div className="flex flex-wrap gap-1 flex-1">
                      {ICONS.map(ic => (
                        <button key={ic.value} type="button" onClick={() => setEditCatIcon(ic.value)}
                          className={`text-base px-1.5 py-0.5 rounded border transition-colors
                            ${editCatIcon === ic.value ? "border-brand-700 bg-brand-50" : "border-stone-200 hover:border-stone-400"}`}
                          title={ic.label}>{ic.emoji}</button>
                      ))}
                    </div>
                  ) : (
                    <span className="text-xl shrink-0">{iconEmoji(cat.icon)}</span>
                  )}

                  {/* Name — edit or display */}
                  {editCatId === cat.id ? (
                    <input value={editCatName} onChange={e => setEditCatName(e.target.value)}
                      className={`${inputCls} flex-1 min-w-0`} autoFocus
                      onKeyDown={e => { if (e.key === "Enter") saveEditCat(cat.id); if (e.key === "Escape") setEditCatId(null); }} />
                  ) : (
                    <button onClick={() => toggleExpand(cat.id)}
                      className="flex-1 text-left font-semibold text-stone-900 text-sm">{cat.name}</button>
                  )}

                  <span className="text-xs text-stone-400 shrink-0">{cat.items.length} items</span>

                  {/* Actions */}
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

                        {/* Toggle */}
                        <button onClick={() => toggleItem(cat.id, item.id, item.enabled)}
                          title={item.enabled ? "Hide from guests" : "Show to guests"}
                          className="shrink-0 text-stone-400 hover:text-stone-700 transition-colors">
                          {item.enabled
                            ? <ToggleRight className="h-4.5 w-4.5 text-green-600" />
                            : <ToggleLeft  className="h-4.5 w-4.5 text-stone-400" />}
                        </button>

                        {editItemId === item.id ? (
                          <>
                            <input value={editItemName} onChange={e => setEditItemName(e.target.value)}
                              className={`${inputCls} flex-1 min-w-0`} autoFocus
                              onKeyDown={e => { if (e.key === "Escape") setEditItemId(null); }} />
                            <div className="flex items-center gap-1 shrink-0">
                              <span className="text-xs text-stone-400">Max</span>
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
                          </>
                        ) : (
                          <>
                            <span className="flex-1 text-sm text-stone-800">{item.name}</span>
                            <span className="text-xs text-stone-400 shrink-0">max {item.maxQuantity}</span>
                            <button onClick={() => { setEditItemId(item.id); setEditItemName(item.name); setEditItemQty(item.maxQuantity); }}
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
                          required placeholder="Item name" autoFocus
                          className={`${inputCls} flex-1 min-w-0`} />
                        <div className="flex items-center gap-1 shrink-0">
                          <span className="text-xs text-stone-400">Max</span>
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
                        <Plus className="h-3.5 w-3.5" /> Add item
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
