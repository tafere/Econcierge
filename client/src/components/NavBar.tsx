import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { useLang } from "@/lib/lang";
import { trRole, LANGUAGES, type Lang } from "@/lib/i18n";
import type { AppNotification } from "@/lib/notifications";
import {
  ConciergeBell, LayoutDashboard, BedDouble, LayoutList,
  Users, Settings, LogOut, Menu, X, Bell, BarChart2, Languages, Clock, AlertCircle,
} from "lucide-react";

interface NavBarProps {
  notifications?: AppNotification[];
  onNotificationDismiss?: (id: string) => void;
  onNotificationClick?: (requestId: number) => void;
}

function timeAgo(iso: string) {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function NavBar({ notifications = [], onNotificationDismiss, onNotificationClick }: NavBarProps) {
  const { user, logout } = useAuth();
  const { lang, t, setLanguage } = useLang();
  const [location, navigate] = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const langRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter(n => !n.read).length;

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (langRef.current && !langRef.current.contains(e.target as Node)) setLangOpen(false);
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setPanelOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const isAdmin = user?.role === "ADMIN";
  const canSeeRooms = user?.role === "ADMIN" || user?.role === "STAFF";

  const active = (path: string) => location === path;

  const desktopLink = (path: string) =>
    `flex items-center gap-1.5 text-xs font-semibold transition-colors px-2 py-1 rounded
    ${active(path)
      ? "text-white bg-white/20"
      : "text-amber-200 hover:text-white hover:bg-white/10"}`;

  const drawerLink = (path: string) =>
    `w-full flex items-center gap-3 px-4 py-3 rounded text-sm font-semibold transition-colors text-left
    ${active(path)
      ? "bg-brand-700 text-white"
      : "text-stone-700 hover:bg-brand-100 hover:text-brand-800"}`;

  const go = (path: string) => { navigate(path); setDrawerOpen(false); };

  return (
    <>
      <nav className="bg-brand-700 text-white px-4 py-3 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          {/* Brand */}
          <button onClick={() => go("/")} className="flex items-center gap-3 min-w-0">
            {user?.logoUrl ? (
              <img src={user.logoUrl} alt={user.hotelName ?? ""} className="h-8 w-8 rounded object-cover shrink-0" />
            ) : (
              <ConciergeBell className="h-5 w-5 text-amber-300 shrink-0" />
            )}
            <div className="text-left">
              <p className="font-extrabold text-white text-base leading-tight">{user?.hotelName}</p>
              <p className="text-amber-300 text-[11px] uppercase tracking-widest font-semibold">Econcierge</p>
            </div>
          </button>

          <div className="flex items-center gap-2">
            {/* Notification bell */}
            <div className="relative" ref={panelRef}>
              <button onClick={() => setPanelOpen(v => !v)}
                className="relative p-1 text-amber-200 hover:text-white transition-colors shrink-0">
                <Bell className={`h-5 w-5 ${unreadCount > 0 ? "animate-pulse" : ""}`} />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[10px] font-bold
                    rounded-full min-w-[16px] h-4 flex items-center justify-center px-0.5 leading-none">
                    {unreadCount}
                  </span>
                )}
              </button>
              {panelOpen && (
                <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-lg shadow-xl
                  border border-stone-200 z-50 overflow-hidden">
                  <div className="px-4 py-3 border-b border-stone-100 flex items-center justify-between">
                    <p className="text-sm font-bold text-stone-800">Notifications</p>
                    {unreadCount > 0 && (
                      <span className="text-xs text-stone-400">{unreadCount} unread</span>
                    )}
                  </div>
                  {notifications.length === 0 ? (
                    <p className="text-sm text-stone-400 text-center py-8">No notifications</p>
                  ) : (
                    <div className="max-h-80 overflow-y-auto divide-y divide-stone-100">
                      {notifications.map(n => (
                        <div key={n.id}
                          className={`flex items-start gap-3 px-4 py-3 transition-colors
                            ${n.read ? "opacity-50 bg-stone-50" : "hover:bg-stone-50"}`}>
                          <div className={`mt-0.5 shrink-0 ${n.type === "past_due" ? "text-orange-500" : "text-brand-700"}`}>
                            {n.type === "past_due"
                              ? <AlertCircle className="h-4 w-4" />
                              : <Bell className="h-4 w-4" />}
                          </div>
                          <button className="flex-1 text-left min-w-0"
                            onClick={() => { onNotificationClick?.(n.requestId); setPanelOpen(false); }}>
                            <p className="text-sm font-semibold text-stone-800 truncate">
                              Room {n.roomNumber} · {n.itemName}
                            </p>
                            <p className="text-xs text-stone-400 mt-0.5">
                              {n.type === "past_due" ? "Past due" : "New request"} · {timeAgo(n.createdAt)}
                            </p>
                          </button>
                          <button onClick={() => onNotificationDismiss?.(n.id)}
                            className="shrink-0 text-stone-300 hover:text-stone-600 transition-colors p-0.5 mt-0.5">
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Desktop links */}
            <div className="hidden sm:flex items-center gap-1">
              <button onClick={() => go("/")} className={desktopLink("/")}>
                <LayoutDashboard className="h-3.5 w-3.5" /> {t("dashboard")}
              </button>
              {canSeeRooms && (
                <button onClick={() => go("/rooms")} className={desktopLink("/rooms")}>
                  <BedDouble className="h-3.5 w-3.5" /> {t("navRooms")}
                </button>
              )}
              {isAdmin && (
                <>
                  <button onClick={() => go("/categories")} className={desktopLink("/categories")}>
                    <LayoutList className="h-3.5 w-3.5" /> {t("navCategories")}
                  </button>
                  <button onClick={() => go("/reports")} className={desktopLink("/reports")}>
                    <BarChart2 className="h-3.5 w-3.5" /> {t("navReports")}
                  </button>
                  <button onClick={() => go("/staff")} className={desktopLink("/staff")}>
                    <Users className="h-3.5 w-3.5" /> {t("navStaff")}
                  </button>
                  <button onClick={() => go("/settings")} className={desktopLink("/settings")}>
                    <Settings className="h-3.5 w-3.5" /> {t("navSettings")}
                  </button>
                </>
              )}
              {/* Language picker */}
              <div className="relative" ref={langRef}>
                <button onClick={() => setLangOpen(v => !v)}
                  className="flex items-center gap-1 text-xs font-bold text-amber-200 hover:text-white
                    hover:bg-white/10 transition-colors px-2 py-1 rounded border border-amber-300/40">
                  <Languages className="h-3.5 w-3.5" />
                  {LANGUAGES.find(l => l.code === lang)?.label ?? lang.toUpperCase()}
                </button>
                {langOpen && (
                  <div className="absolute right-0 top-full mt-1 bg-white rounded shadow-lg border border-stone-200 z-50 min-w-[120px]">
                    {LANGUAGES.map(l => (
                      <button key={l.code} onClick={() => { setLanguage(l.code as Lang); setLangOpen(false); }}
                        className={`w-full text-left px-3 py-2 text-sm hover:bg-stone-50 transition-colors
                          ${lang === l.code ? "font-bold text-brand-700" : "text-stone-700"}`}>
                        {l.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <button onClick={logout}
                className="flex items-center gap-1.5 text-xs font-semibold text-amber-200
                  hover:text-white hover:bg-white/10 transition-colors px-2 py-1 rounded">
                <LogOut className="h-3.5 w-3.5" /> {t("signOut")}
              </button>
            </div>

            {/* Mobile: logout icon + hamburger */}
            <div className="flex sm:hidden items-center gap-2">
              <button onClick={logout} className="text-amber-200 hover:text-white transition-colors p-1">
                <LogOut className="h-4 w-4" />
              </button>
              <button onClick={() => setDrawerOpen(true)} className="text-amber-200 hover:text-white transition-colors p-1">
                <Menu className="h-6 w-6" />
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 sm:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setDrawerOpen(false)} />
          <div className="absolute right-0 top-0 h-full w-72 flex flex-col shadow-2xl"
            style={{ background: "hsl(220 20% 96%)" }}>
            {/* Drawer header */}
            <div className="bg-brand-700 px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-7 w-7 rounded bg-brand-600 flex items-center justify-center shrink-0">
                  <span className="text-white font-extrabold text-sm uppercase">
                    {user?.fullName?.charAt(0) ?? "?"}
                  </span>
                </div>
                <div>
                  <p className="font-extrabold text-white text-sm leading-tight">{user?.fullName}</p>
                  <p className="text-amber-300 text-[10px] uppercase tracking-widest font-semibold">{user?.role ? trRole(lang, user.role) : ""}</p>
                </div>
              </div>
              <button onClick={() => setDrawerOpen(false)} className="text-amber-300 hover:text-white transition-colors p-1">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Drawer links */}
            <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
              <button onClick={() => go("/")} className={drawerLink("/")}>
                <LayoutDashboard className="h-5 w-5" /> {t("dashboard")}
              </button>
              {canSeeRooms && (
                <button onClick={() => go("/rooms")} className={drawerLink("/rooms")}>
                  <BedDouble className="h-5 w-5" /> {t("navRooms")}
                </button>
              )}
              {isAdmin && (
                <>
                  <button onClick={() => go("/categories")} className={drawerLink("/categories")}>
                    <LayoutList className="h-5 w-5" /> {t("navCategories")}
                  </button>
                  <button onClick={() => go("/reports")} className={drawerLink("/reports")}>
                    <BarChart2 className="h-5 w-5" /> {t("navReports")}
                  </button>
                  <button onClick={() => go("/staff")} className={drawerLink("/staff")}>
                    <Users className="h-5 w-5" /> {t("navStaff")}
                  </button>
                  <button onClick={() => go("/settings")} className={drawerLink("/settings")}>
                    <Settings className="h-5 w-5" /> {t("navSettings")}
                  </button>
                </>
              )}
              {/* Language picker */}
              <div className="px-1 pt-1">
                <p className="text-[10px] font-semibold text-stone-400 uppercase tracking-wider px-3 pb-1">Language</p>
                {LANGUAGES.map(l => (
                  <button key={l.code} onClick={() => setLanguage(l.code as Lang)}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 rounded text-sm font-semibold transition-colors text-left
                      ${lang === l.code ? "bg-brand-700 text-white" : "text-stone-700 hover:bg-brand-100 hover:text-brand-800"}`}>
                    <Languages className="h-4 w-4 shrink-0" /> {l.label}
                  </button>
                ))}
              </div>
            </nav>

            {/* Sign out */}
            <div className="px-3 py-4 border-t border-stone-200">
              <button onClick={() => { logout(); setDrawerOpen(false); }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded text-sm font-semibold
                  text-stone-500 hover:bg-red-50 hover:text-red-600 transition-colors text-left">
                <LogOut className="h-5 w-5" /> {t("signOut")}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
