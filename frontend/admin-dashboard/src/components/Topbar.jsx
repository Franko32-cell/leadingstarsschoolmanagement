import { useState, useEffect, useRef } from "react";
import { getUser, logout } from "../services/auth";
import API from "../services/api";

const timeGreeting = () => {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
};

const timeAgo = (iso) => {
  const diff  = Date.now() - new Date(iso).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(mins / 60);
  const days  = Math.floor(hours / 24);
  if (mins  < 1)  return "just now";
  if (mins  < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
};

const PRIORITY_CONFIG = {
  critical: { dot: "bg-red-500",   label: "bg-red-50 text-red-600 ring-1 ring-red-200"       },
  urgent:   { dot: "bg-amber-400", label: "bg-amber-50 text-amber-700 ring-1 ring-amber-200" },
  normal:   { dot: "bg-slate-300", label: ""                                                  },
};

// ── Icons ──────────────────────────────────────────────────────────────────────

const BellIcon = () => (
  <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round"
      d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
  </svg>
);

const ProfileIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
  </svg>
);

const SettingsIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 010 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 010-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

const SignOutIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
  </svg>
);

// ── NotificationPanel ──────────────────────────────────────────────────────────
const NotificationPanel = ({ announcements, unread }) => (
  <div className="absolute right-0 top-[calc(100%+8px)] w-80 bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden z-50 animate-dropdown">
    <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
      <p className="text-sm font-bold text-slate-800">Announcements</p>
      {unread > 0 && (
        <span className="text-[11px] font-semibold bg-red-50 text-red-600 ring-1 ring-red-200 px-2 py-0.5 rounded-full">
          {unread} urgent
        </span>
      )}
    </div>
    <div className="divide-y divide-slate-50 max-h-72 overflow-y-auto">
      {announcements.length === 0 ? (
        <p className="text-xs text-slate-400 text-center py-8">No announcements</p>
      ) : (
        announcements.map((a) => {
          const cfg = PRIORITY_CONFIG[a.priority] ?? PRIORITY_CONFIG.normal;
          return (
            <div key={a.id} className="px-4 py-3 hover:bg-slate-50 transition-colors cursor-default">
              <div className="flex items-start gap-2.5">
                <span className={`w-1.5 h-1.5 rounded-full mt-[5px] flex-shrink-0 ${cfg.dot}`} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-800 leading-snug truncate">{a.title}</p>
                  <p className="text-xs text-slate-400 mt-0.5 line-clamp-1 leading-relaxed">{a.message}</p>
                  <p className="text-[11px] text-slate-300 mt-1">{timeAgo(a.created_at)}</p>
                </div>
              </div>
            </div>
          );
        })
      )}
    </div>
  </div>
);

// ── UserMenu ───────────────────────────────────────────────────────────────────
const MenuItem = ({ icon, label, onClick, danger }) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left transition-colors
      ${danger ? "text-red-600 hover:bg-red-50 font-semibold" : "text-slate-600 hover:bg-slate-50 font-medium"}`}
  >
    <span className={danger ? "text-red-500" : "text-slate-400"}>{icon}</span>
    {label}
  </button>
);

const UserMenu = ({ user }) => (
  <div className="absolute right-0 top-[calc(100%+8px)] w-56 bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden z-50 animate-dropdown">
    <div className="px-4 py-3.5 border-b border-slate-100 bg-slate-50/60">
      <p className="text-sm font-bold text-slate-800 leading-tight">{user?.username}</p>
      <p className="text-xs text-slate-400 mt-0.5">{user?.email || "Administrator"}</p>
    </div>
    <div className="py-1">
      <MenuItem icon={<ProfileIcon />} label="Profile" />
      <MenuItem icon={<SettingsIcon />} label="Settings" />
    </div>
    <div className="border-t border-slate-100 py-1">
      <MenuItem icon={<SignOutIcon />} label="Sign out" danger onClick={logout} />
    </div>
  </div>
);

// ── Topbar ─────────────────────────────────────────────────────────────────────
const Topbar = ({ onMenuToggle, sidebarOpen }) => {
  const user = getUser();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [announcements, setAnnouncements] = useState([]);
  const [notifOpen, setNotifOpen]         = useState(false);
  const [unread, setUnread]               = useState(0);
  const dropRef  = useRef(null);
  const notifRef = useRef(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res   = await API.get("/announcements/?ordering=-created_at");
        const items = (res.data.results ?? res.data).slice(0, 8);
        setAnnouncements(items);
        setUnread(items.filter((a) => a.priority === "critical" || a.priority === "urgent").length);
      } catch {}
    };
    load();
  }, []);

  useEffect(() => {
    const handler = (e) => {
      if (dropRef.current  && !dropRef.current.contains(e.target))  setDropdownOpen(false);
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const initial = user?.username?.[0]?.toUpperCase() ?? "A";

  return (
    <header className="h-14 bg-white border-b border-slate-100 flex items-center px-4 gap-3 z-30 sticky top-0">

      {/* ── Hamburger ── */}
      {onMenuToggle && (
        <button
          onClick={onMenuToggle}
          aria-label="Toggle menu"
          className="lg:hidden w-9 h-9 flex items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors flex-shrink-0"
        >
          <svg viewBox="0 0 20 20" fill="none" className="w-5 h-5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round">
            {sidebarOpen ? (
              <>
                <line x1="4" y1="4" x2="16" y2="16" />
                <line x1="16" y1="4" x2="4" y2="16" />
              </>
            ) : (
              <>
                <line x1="3" y1="6"  x2="17" y2="6"  />
                <line x1="3" y1="10" x2="17" y2="10" />
                <line x1="3" y1="14" x2="17" y2="14" />
              </>
            )}
          </svg>
        </button>
      )}

      {/* ── Brand ── */}
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="w-7 h-7 rounded-lg bg-slate-800 flex items-center justify-center flex-shrink-0">
          <span className="text-white text-[10px] font-black tracking-tight">LSA</span>
        </div>
        <div className="hidden sm:flex flex-col leading-none min-w-0">
          <span className="text-[13px] font-bold text-slate-800 truncate">Leading Stars Academy</span>
          <span className="text-[11px] text-slate-400 mt-0.5">Admin portal</span>
        </div>
      </div>

      {/* ── Greeting ── */}
      <div className="hidden md:flex items-center ml-3 pl-3 border-l border-slate-100 flex-1 min-w-0">
        <p className="text-sm text-slate-400 truncate">
          {timeGreeting()},{" "}
          <span className="font-semibold text-slate-700">{user?.username ?? "Admin"}</span>
        </p>
      </div>

      <div className="ml-auto flex items-center gap-1">

        {/* ── Bell ── */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => { setNotifOpen((v) => !v); setDropdownOpen(false); }}
            aria-label="Notifications"
            className={`relative w-9 h-9 flex items-center justify-center rounded-xl transition-colors
              ${notifOpen
                ? "bg-slate-100 text-slate-700"
                : "text-slate-400 hover:bg-slate-100 hover:text-slate-600"}`}
          >
            <BellIcon />
            {unread > 0 && (
              <span className="absolute top-1.5 right-1.5 min-w-[15px] h-[15px] bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-1 leading-none">
                {unread > 9 ? "9+" : unread}
              </span>
            )}
          </button>
          {notifOpen && <NotificationPanel announcements={announcements} unread={unread} />}
        </div>

        {/* ── Divider ── */}
        <div className="w-px h-5 bg-slate-200 mx-1" />

        {/* ── User ── */}
        <div className="relative" ref={dropRef}>
          <button
            onClick={() => { setDropdownOpen((v) => !v); setNotifOpen(false); }}
            className={`flex items-center gap-2 pl-1.5 pr-2 py-1.5 rounded-xl transition-colors
              ${dropdownOpen ? "bg-slate-100" : "hover:bg-slate-100"}`}
          >
            <div className="w-7 h-7 rounded-lg bg-slate-800 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
              {initial}
            </div>
            <div className="hidden sm:flex flex-col leading-none text-left">
              <span className="text-[13px] font-bold text-slate-800">{user?.username ?? "Admin"}</span>
              <span className="text-[11px] text-slate-400 mt-0.5 capitalize">{user?.role ?? "admin"}</span>
            </div>
            <svg
              className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 hidden sm:block ${dropdownOpen ? "rotate-180" : ""}`}
              fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {dropdownOpen && <UserMenu user={user} />}
        </div>

      </div>

      <style>{`
        @keyframes dropDown {
          from { opacity: 0; transform: translateY(-5px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .animate-dropdown { animation: dropDown 0.15s ease both; }
      `}</style>
    </header>
  );
};

export default Topbar;
