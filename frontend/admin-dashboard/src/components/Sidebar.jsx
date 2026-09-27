import { NavLink } from "react-router-dom";
import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { logout, getUser } from "../services/auth";
import API from "../services/api";
import {
  FaTachometerAlt,
  FaUserGraduate,
  FaChalkboardTeacher,
  FaSchool,
  FaClipboardList,
  FaCalendarCheck,
  FaBullhorn,
  FaMoneyBill,
  FaChartBar,
  FaSignOutAlt,
  FaUserPlus,
  FaBook,
  FaWallet,
  FaGraduationCap,
  FaUserShield,
  FaChevronLeft,
  FaChevronRight,
  FaCircle,
  FaTimes,
  FaUsers,
  FaClock,
  FaDesktop,
} from "react-icons/fa";

// ─── Nav config ────────────────────────────────────────────────────────────────
const NAV_SECTIONS = [
  {
    heading: "Overview",
    items: [
      { name: "Dashboard", path: "/admin", icon: FaTachometerAlt },
    ],
  },
  {
    heading: "People",
    items: [
      { name: "Students",   path: "/admin/students",   icon: FaUserGraduate      },
      { name: "Teachers",   path: "/admin/teachers",   icon: FaChalkboardTeacher },
      { name: "Admissions", path: "/admin/admissions", icon: FaUserPlus          },
    ],
  },
  {
    heading: "Academics",
    items: [
      { name: "Classes",    path: "/admin/classes",    icon: FaSchool        },
      { name: "Subjects",   path: "/admin/subjects",   icon: FaBook          },
      { name: "Results",    path: "/admin/results",    icon: FaClipboardList },
      { name: "Mock Results", path: "/admin/mock-results", icon: FaClipboardList },
      { name: "Preschool Assessment", path: "/admin/preschool-assessment", icon: FaGraduationCap },
      { name: "Attendance", path: "/admin/attendance", icon: FaCalendarCheck },
      { name: "E-learning", path: "/admin/elearning", icon: FaGraduationCap },
      { name: "Reports",    path: "/admin/reports",    icon: FaChartBar      },
    ],
  },
  {
    heading: "Finance",
    items: [
      { name: "Fees",        path: "/admin/fees",                icon: FaMoneyBill },
      { name: "Accounting",  path: "/admin/accounting",         icon: FaChartBar  },
      { name: "Petty Cash", path: "/admin/accounting/petty-cash", icon: FaWallet    },
      { name: "Accounts",    path: "/admin/accounts",           icon: FaWallet    },
    ],
  },
  {
    heading: "Communication",
    items: [
      { name: "Announcements", path: "/admin/announcements", icon: FaBullhorn },
    ],
  },
  {
    heading: "System",
    items: [
      {
        name: "Admin Approvals",
        path: "/admin/admin-approvals",
        icon: FaUserShield,
        badgeKey: "approvals",
      },
      {
        name: "Settings",
        path: "/admin/settings",
        icon: FaDesktop,
      },
    ],
  },
];

// ─── Active Users Panel ────────────────────────────────────────────────────────
const timeAgo = (dateStr) => {
  if (!dateStr) return "Never";
  const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000);
  if (diff < 60)   return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
};

const roleColor = (role) => {
  switch (role?.toLowerCase()) {
    case "admin":   return "bg-[#9B6BFF]";
    case "teacher": return "bg-[#5B7FFF]";
    case "student": return "bg-[#34D399]";
    default:        return "bg-slate-500";
  }
};

// ← fixed: was /auth/active-users/ — must match urls.py
const ACTIVE_USERS_URL = "/accounts/active-users/";

const ActiveUsersPanel = ({ onClose }) => {
  const [users,   setUsers]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter,  setFilter]  = useState("all");
  const intervalRef           = useRef(null);

  const fetchActiveUsers = useCallback(async () => {
    try {
      const res = await API.get(ACTIVE_USERS_URL);
      setUsers(res.data.results ?? res.data);
    } catch (err) {
      if (import.meta.env.DEV) console.warn("Active users fetch failed:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchActiveUsers();
    intervalRef.current = setInterval(fetchActiveUsers, 30_000);
    return () => clearInterval(intervalRef.current);
  }, [fetchActiveUsers]);

  const filtered = useMemo(() => {
    if (filter === "all") return users;
    return users.filter((u) => u.role?.toLowerCase() === filter);
  }, [users, filter]);

  const roleCounts = useMemo(() => ({
    admin:   users.filter(u => u.role?.toLowerCase() === "admin").length,
    teacher: users.filter(u => u.role?.toLowerCase() === "teacher").length,
    student: users.filter(u => u.role?.toLowerCase() === "student").length,
  }), [users]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="relative w-96 h-full bg-[#0A0D17]/90 backdrop-blur-2xl border-l border-white/10 flex flex-col shadow-2xl shadow-black/60 animate-slide-in">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-8 h-8 rounded-lg bg-[#34D399]/10 border border-[#34D399]/25 flex items-center justify-center">
                <FaUsers className="text-[#34D399] text-sm" />
              </div>
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-[#34D399] rounded-full border-2 border-[#0A0D17] animate-pulse" />
            </div>
            <div>
              <p className="text-sm font-bold text-white">Active Users</p>
              <p className="text-[10px] text-slate-500">Live · refreshes every 30s</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
          >
            <FaTimes className="text-xs" />
          </button>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-px bg-white/5 border-b border-white/10">
          {[
            { label: "Admins",   count: roleCounts.admin,   color: "text-[#9B6BFF]" },
            { label: "Teachers", count: roleCounts.teacher, color: "text-[#5B7FFF]" },
            { label: "Students", count: roleCounts.student, color: "text-[#34D399]" },
          ].map(({ label, count, color }) => (
            <div key={label} className="bg-[#0A0D17] px-3 py-3 text-center">
              <p className={`text-lg font-black tabular-nums ${color}`}>{count}</p>
              <p className="text-[10px] text-slate-500 font-medium">{label}</p>
            </div>
          ))}
        </div>

        {/* Filter tabs */}
        <div className="flex gap-1 p-3 border-b border-white/10">
          {["all", "admin", "teacher", "student"].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`flex-1 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all ${
                filter === f
                  ? "bg-[#5B7FFF] text-white"
                  : "text-slate-500 hover:text-slate-300 hover:bg-white/5"
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        {/* User list */}
        <div className="flex-1 overflow-y-auto py-2 space-y-px scrollbar-thin">
          {loading ? (
            <div className="flex flex-col gap-2 p-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-14 rounded-xl bg-white/5 animate-pulse" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-slate-600">
              <FaDesktop className="text-2xl mb-2" />
              <p className="text-sm font-medium">No active users</p>
            </div>
          ) : (
            filtered.map((u, i) => (
              <div
                key={u.id}
                style={{ animationDelay: `${i * 30}ms` }}
                className="flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors animate-fade-in group"
              >
                {/* Avatar */}
                <div className="relative flex-shrink-0">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-black text-white ${roleColor(u.role)}`}>
                    {(u.username || u.email || "?")[0].toUpperCase()}
                  </div>
                  <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-[#34D399] rounded-full border-2 border-[#0A0D17]" />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white truncate">
                    {u.username || u.email}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className={`text-[10px] font-bold uppercase tracking-wide ${
                      u.role?.toLowerCase() === "admin"   ? "text-[#9B6BFF]" :
                      u.role?.toLowerCase() === "teacher" ? "text-[#5B7FFF]" :
                      "text-[#34D399]"
                    }`}>
                      {u.role}
                    </span>
                    <span className="text-slate-700">·</span>
                    <span className="flex items-center gap-1 text-[10px] text-slate-500">
                      <FaClock className="text-[8px]" />
                      {timeAgo(u.last_login)}
                    </span>
                  </div>
                </div>

                {/* Online dot */}
                <FaCircle className="text-[8px] text-[#34D399] flex-shrink-0 animate-pulse" />
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-white/10 flex items-center justify-between">
          <span className="text-[11px] text-slate-500">
            {users.length} user{users.length !== 1 ? "s" : ""} online
          </span>
          <button
            onClick={fetchActiveUsers}
            className="text-[11px] text-[#5B7FFF] hover:text-[#7C9AFF] font-semibold transition-colors"
          >
            Refresh now
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Logout Confirm Modal ──────────────────────────────────────────────────────
const LogoutConfirm = ({ onConfirm, onCancel }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center">
    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onCancel} />
    <div className="relative bg-[#0D1220]/95 backdrop-blur-2xl border border-white/10 rounded-2xl p-6 w-80 shadow-2xl shadow-black/60 animate-fade-in">
      <div className="w-10 h-10 rounded-xl bg-[#FB7185]/10 border border-[#FB7185]/25 flex items-center justify-center mx-auto mb-4">
        <FaSignOutAlt className="text-[#FB7185]" />
      </div>
      <p className="text-center font-bold text-white mb-1">Sign out?</p>
      <p className="text-center text-xs text-slate-500 mb-5">
        You'll need to log in again to access the dashboard.
      </p>
      <div className="flex gap-2">
        <button
          onClick={onCancel}
          className="flex-1 py-2.5 rounded-xl bg-white/5 border border-white/10 text-slate-300 text-sm font-semibold hover:bg-white/10 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={onConfirm}
          className="flex-1 py-2.5 rounded-xl bg-[#FB7185] text-[#1A0B0D] text-sm font-bold hover:bg-[#fc8a9b] transition-colors"
        >
          Sign Out
        </button>
      </div>
    </div>
  </div>
);

// ─── Main Sidebar ──────────────────────────────────────────────────────────────
const Sidebar = ({ collapsed, onToggle }) => {
  const user = useMemo(() => getUser(), []);

  const [pendingCount,    setPendingCount]    = useState(0);
  const [showActiveUsers, setShowActiveUsers] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [activeUserCount, setActiveUserCount] = useState(0);

  const handleToggle = useCallback(() => {
    onToggle?.();
    localStorage.setItem("sidebar-collapsed", String(!collapsed));
  }, [collapsed, onToggle]);

  const loadApprovals = useCallback(async () => {
    try {
      const res = await API.get("/admin-approvals/");
      const records = res.data.results ?? res.data;
      setPendingCount(records.filter((r) => r.status === "pending").length);
    } catch (err) {
      if (import.meta.env.DEV) console.warn("Approvals badge failed:", err);
    }
  }, []);

  // ← fixed: was /auth/active-users/
  const loadActiveUsers = useCallback(async () => {
    try {
      const res = await API.get(ACTIVE_USERS_URL);
      const count = res.data.count ?? (res.data.results ?? res.data).length;
      setActiveUserCount(count);
    } catch (err) {
      if (import.meta.env.DEV) console.warn("Active users badge failed:", err);
    }
  }, []);

  useEffect(() => {
    // Small delay so the app has time to refresh an expired token before
    // the sidebar fires its background requests.
    const initTimer = setTimeout(() => {
      loadApprovals();
      loadActiveUsers();
    }, 1000);

    const approvalsTimer  = setInterval(loadApprovals,   60_000);
    const activeUserTimer = setInterval(loadActiveUsers,  30_000);
    return () => {
      clearTimeout(initTimer);
      clearInterval(approvalsTimer);
      clearInterval(activeUserTimer);
    };
  }, [loadApprovals, loadActiveUsers]);

  const badges  = { approvals: pendingCount };
  const initials = (user?.username || user?.email || "A")[0].toUpperCase();

  return (
    <>
      <aside
        className={`
          relative z-20 flex flex-col min-h-screen
          bg-[linear-gradient(180deg,rgba(8,12,22,0.96),rgba(9,14,22,0.88))]
          backdrop-blur-2xl border-r border-white/10 shadow-[0_0_0_1px_rgba(148,163,184,0.06),18px_0_40px_rgba(2,6,23,0.42)]
          transition-all duration-300 ease-in-out
          ${collapsed ? "w-16" : "w-64"}
        `}
      >
        {/* ── Brand ── */}
        <div
          className={`flex items-center gap-3 px-4 py-5 border-b border-white/10 bg-slate-950/30 ${
            collapsed ? "justify-center" : ""
          }`}
        >
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#5B7FFF] via-[#7B6BFF] to-[#9B6BFF] flex items-center justify-center flex-shrink-0 shadow-[0_10px_20px_rgba(91,127,255,0.35)] ring-1 ring-white/10">
            <span className="text-[10px] font-extrabold text-white">LS</span>
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <p className="text-sm font-bold text-white leading-tight truncate">Leading Stars</p>
              <p className="text-xs text-slate-400 leading-tight">Academy</p>
            </div>
          )}
        </div>

        {/* ── Collapse toggle ── */}
        <button
          onClick={handleToggle}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-expanded={!collapsed}
          className="absolute -right-3 top-6 w-6 h-6 bg-[#141A2C] border border-white/10 hover:bg-[#5B7FFF] hover:border-[#5B7FFF] rounded-full flex items-center justify-center text-white shadow-lg transition-colors z-10"
        >
          {collapsed
            ? <FaChevronRight className="text-[10px]" />
            : <FaChevronLeft  className="text-[10px]" />}
        </button>

        {/* ── User pill ── */}
        {!collapsed && (
          <div className="mx-3 mt-4 mb-2 px-3 py-2.5 bg-slate-900/70 border border-white/10 rounded-xl flex items-center gap-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#5B7FFF] to-[#9B6BFF] flex items-center justify-center text-xs font-bold text-white flex-shrink-0 ring-1 ring-white/10">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-white truncate">{user?.username}</p>
              <p className="text-[10px] text-slate-400 capitalize">{user?.role}</p>
            </div>
          </div>
        )}

        {/* ── Active Users Button ── */}
        <button
          onClick={() => setShowActiveUsers(true)}
          title={collapsed ? "Active Users" : undefined}
          className={`mx-2 mb-1 flex items-center gap-3 px-3 py-2.5 rounded-xl
            text-[#34D399] bg-slate-900/60 border border-[#34D399]/20
            hover:bg-[#34D399]/10 hover:border-[#34D399]/35 transition-all group text-sm shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]
            ${collapsed ? "justify-center" : ""}
          `}
        >
          <div className="relative flex-shrink-0">
            <FaUsers className="text-base" />
            {activeUserCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 min-w-[14px] h-[14px] px-0.5 bg-[#34D399] text-[#04150E] text-[8px] font-black rounded-full flex items-center justify-center leading-none">
                {activeUserCount > 9 ? "9+" : activeUserCount}
              </span>
            )}
          </div>
          {!collapsed && (
            <>
              <span className="font-semibold flex-1">Active Users</span>
              <span className="flex items-center gap-1 text-[10px] bg-[#34D399]/10 text-[#34D399] px-2 py-0.5 rounded-full font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-[#34D399] animate-pulse inline-block" />
                Live
              </span>
            </>
          )}

          {collapsed && (
            <span className="absolute left-full ml-3 px-2 py-1 bg-[#141A2C] border border-white/10 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 shadow-lg transition-opacity">
              Active Users
              {activeUserCount > 0 && (
                <span className="ml-1.5 bg-[#34D399] text-[#04150E] text-[10px] font-bold px-1.5 rounded-full">
                  {activeUserCount}
                </span>
              )}
            </span>
          )}
        </button>

        {/* ── Nav ── */}
        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-5 scrollbar-thin">
          {NAV_SECTIONS.map((section) => (
            <div key={section.heading} className="space-y-1.5">
              {!collapsed && (
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] px-3 mb-1.5">
                  {section.heading}
                </p>
              )}
              <div className="space-y-1">
                {section.items.map((item) => {
                  const Icon  = item.icon;
                  const badge = item.badgeKey ? badges[item.badgeKey] : 0;
                  const isEnd = item.path === "/admin";

                  return (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      end={isEnd}
                      title={collapsed ? item.name : undefined}
                      className={({ isActive }) =>
                        `relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-200 ease-out group ring-1 ring-transparent ${
                          isActive
                            ? "bg-gradient-to-r from-[#5B7FFF] to-[#7B6BFF] text-white shadow-[0_12px_20px_rgba(91,127,255,0.22)] ring-white/5"
                            : "text-slate-300 hover:bg-slate-800/70 hover:text-white hover:ring-white/5"
                        } ${collapsed ? "justify-center" : ""}`
                      }
                    >
                      {({ isActive }) => (
                        <>
                          <Icon
                            className={`flex-shrink-0 text-base ${
                              isActive ? "text-white" : "text-slate-500 group-hover:text-white"
                            }`}
                          />

                          {!collapsed && (
                            <span className="truncate font-medium">{item.name}</span>
                          )}

                          {badge > 0 && (
                            <span
                              className={`absolute flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold rounded-full bg-[#F2A93B] text-[#1A1202] leading-none ${
                                collapsed
                                  ? "-top-1 -right-1"
                                  : "right-2 top-1/2 -translate-y-1/2"
                              }`}
                            >
                              {badge > 9 ? "9+" : badge}
                            </span>
                          )}

                          {collapsed && (
                            <span className="absolute left-full ml-3 px-2 py-1 bg-[#141A2C] border border-white/10 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 shadow-lg transition-opacity">
                              {item.name}
                              {badge > 0 && (
                                <span className="ml-1.5 bg-[#F2A93B] text-[#1A1202] text-[10px] font-bold px-1.5 rounded-full">
                                  {badge}
                                </span>
                              )}
                            </span>
                          )}
                        </>
                      )}
                    </NavLink>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* ── Logout ── */}
        <div className={`p-3 border-t border-white/10 ${collapsed ? "flex justify-center" : ""}`}>
          <button
            onClick={() => setShowLogoutModal(true)}
            title={collapsed ? "Sign Out" : undefined}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-300
              bg-slate-900/60 border border-white/5 hover:bg-[#FB7185]/10 hover:text-[#FB7185] hover:border-[#FB7185]/20 transition-all group text-sm
              ${collapsed ? "" : "w-full"}
            `}
          >
            <FaSignOutAlt className="flex-shrink-0 text-base group-hover:text-[#FB7185]" />
            {!collapsed && <span className="font-medium">Sign Out</span>}

            {collapsed && (
              <span className="absolute left-full ml-3 px-2 py-1 bg-[#141A2C] border border-white/10 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 shadow-lg transition-opacity">
                Sign Out
              </span>
            )}
          </button>
        </div>
      </aside>

      {/* ── Active Users Panel ── */}
      {showActiveUsers && (
        <ActiveUsersPanel onClose={() => setShowActiveUsers(false)} />
      )}

      {/* ── Logout Confirm ── */}
      {showLogoutModal && (
        <LogoutConfirm
          onConfirm={() => { setShowLogoutModal(false); logout(); }}
          onCancel={() => setShowLogoutModal(false)}
        />
      )}

      <style>{`
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to   { transform: translateX(0);    opacity: 1; }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(4px); }
          to   { opacity: 1; transform: translateY(0);   }
        }
        .animate-slide-in { animation: slideIn 0.25s cubic-bezier(0.16,1,0.3,1) both; }
        .animate-fade-in  { animation: fadeIn 0.2s ease both; opacity: 0; }
        .scrollbar-thin::-webkit-scrollbar { width: 6px; }
        .scrollbar-thin::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 999px; }
      `}</style>
    </>
  );
};

export default Sidebar;