import { useEffect, useState } from "react";
import { getDashboard } from "../services/dashboardService";
import { useNavigate } from "react-router-dom";
import API from "../services/api";
import {
  FaUserGraduate,
  FaChalkboardTeacher,
  FaSchool,
  FaClipboardCheck,
  FaMoneyBillWave,
  FaCalendarCheck,
  FaChartLine,
  FaExclamationTriangle,
  FaArrowRight,
  FaSync,
  FaGraduationCap,
  FaUserCheck,          // ← new
} from "react-icons/fa";

// ── Helpers ────────────────────────────────────────────────────────────────────

const ghs = (n) =>
  `GHS ${Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 0 })}`;

const rateColor = (pct) =>
  pct >= 80 ? "bg-emerald-500" : pct >= 50 ? "bg-amber-400" : "bg-red-500";

const rateText = (pct) =>
  pct >= 80 ? "text-emerald-600" : pct >= 50 ? "text-amber-500" : "text-red-500";

const rateBadge = (pct) =>
  pct >= 80
    ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
    : pct >= 50
    ? "bg-amber-50 text-amber-700 ring-1 ring-amber-200"
    : "bg-red-50 text-red-600 ring-1 ring-red-200";

// ── Sub-components ─────────────────────────────────────────────────────────────

const Skeleton = ({ className = "" }) => (
  <div className={`animate-pulse bg-slate-100 rounded-2xl ${className}`} />
);

const KpiCard = ({ label, value, sub, icon, iconBg, borderColor, onClick, index = 0 }) => (
  <div
    onClick={onClick}
    style={{ animationDelay: `${index * 70}ms` }}
    className={`
      group relative bg-white rounded-2xl p-5
      border border-slate-100 shadow-sm
      transition-all duration-200 animate-fade-in
      ${onClick ? "cursor-pointer hover:shadow-md hover:-translate-y-0.5 active:scale-[0.99]" : ""}
    `}
  >
    {/* Left accent bar */}
    <div className={`absolute left-0 top-4 bottom-4 w-[3px] rounded-r-full ${borderColor}`} />

    <div className="flex items-start justify-between gap-3 pl-2">
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest mb-2 leading-none">
          {label}
        </p>
        <p className="text-[2rem] font-black text-slate-800 leading-none tracking-tight tabular-nums">
          {value}
        </p>
        {sub && (
          <p className="text-xs text-slate-400 mt-2 leading-relaxed">{sub}</p>
        )}
      </div>
      <div
        className={`w-10 h-10 rounded-xl flex items-center justify-center text-base flex-shrink-0 ${iconBg}`}
      >
        {icon}
      </div>
    </div>

    {onClick && (
      <div className="mt-4 pl-2 flex items-center gap-1.5 text-[11px] font-semibold text-slate-300 group-hover:text-blue-500 transition-colors">
        <span>View details</span>
        <FaArrowRight className="text-[9px] group-hover:translate-x-0.5 transition-transform" />
      </div>
    )}
  </div>
);

const SectionLabel = ({ children }) => (
  <h2 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.18em] mb-3">
    {children}
  </h2>
);

const ProgressBar = ({ value, className = "" }) => (
  <div className={`w-full bg-slate-100 rounded-full h-1.5 overflow-hidden ${className}`}>
    <div
      className={`h-1.5 rounded-full transition-all duration-700 ease-out ${rateColor(value)}`}
      style={{ width: `${Math.min(value, 100)}%` }}
    />
  </div>
);

const StatusPill = ({ label, bg, text, dot }) => (
  <span
    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold ${bg} ${text}`}
  >
    <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
    {label}
  </span>
);

const QuickAction = ({ label, description, path, gradient, icon, index }) => {
  const navigate = useNavigate();
  return (
    <button
      onClick={() => navigate(path)}
      style={{ animationDelay: `${index * 60}ms` }}
      className={`
        group relative ${gradient} text-white rounded-2xl p-4 text-left
        hover:shadow-lg hover:-translate-y-0.5 active:scale-[0.99]
        transition-all duration-200 overflow-hidden animate-fade-in
      `}
    >
      <div className="absolute inset-0 bg-white/0 group-hover:bg-white/5 transition-colors rounded-2xl" />
      <div className="relative">
        <span className="text-2xl leading-none block mb-3">{icon}</span>
        <p className="text-sm font-bold leading-snug">{label}</p>
        {description && (
          <p className="text-[11px] text-white/60 mt-0.5 leading-none">{description}</p>
        )}
      </div>
      <FaArrowRight className="absolute bottom-3.5 right-3.5 text-white/30 group-hover:text-white/70 group-hover:translate-x-0.5 transition-all text-[10px]" />
    </button>
  );
};

// ── Main component ─────────────────────────────────────────────────────────────

const Dashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats]           = useState(null);
  const [feeStats, setFeeStats]     = useState(null);
  const [attStats, setAttStats]     = useState(null);
  const [activeUsers, setActiveUsers] = useState(null);   // ← new
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const today = new Date().toISOString().split("T")[0];

  useEffect(() => { loadAll(); }, []);

  const loadAll = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError("");

    try {
      const [dashRes, feeRes, attRes, activeRes] = await Promise.allSettled([
        getDashboard(),
        API.get("/accounts/dashboard/"),
        API.get(`/attendance/?date=${today}`),
        API.get("/accounts/active-users/"),   // ← new
      ]);

      if (dashRes.status === "fulfilled") setStats(dashRes.value);
      if (feeRes.status  === "fulfilled") setFeeStats(feeRes.value.data);
      if (attRes.status  === "fulfilled") {
        const records = attRes.value.data.results || attRes.value.data;
        const present = records.filter(
          (r) => r.status === "present" || r.status === "late"
        ).length;
        setAttStats({ present, total: records.length });
      }
      // ← new: set active users count
      if (activeRes.status === "fulfilled") {
        setActiveUsers(activeRes.value.data.active_users);
      }
    } catch {
      setError("Failed to load dashboard data.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const collectionRate = feeStats?.collection_rate ?? 0;
  const attPercent =
    attStats?.total > 0
      ? Math.round((attStats.present / attStats.total) * 100)
      : null;

  const dateStr = new Date().toLocaleDateString("en-GB", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  // ── Loading skeleton ──────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 p-6 space-y-8">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-8 w-40" />
            <Skeleton className="h-4 w-60" />
          </div>
          <Skeleton className="h-9 w-24" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-36" />)}
        </div>
        {/* extra skeleton card for active users row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Skeleton className="h-36" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-36" />)}
        </div>
        <Skeleton className="h-52" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28" />)}
        </div>
      </div>
    );
  }

  // ── Error state ───────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 p-8 flex items-start justify-center">
        <div className="w-full max-w-md bg-white rounded-2xl border border-red-100 shadow-sm p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center">
              <FaExclamationTriangle className="text-red-500" />
            </div>
            <div>
              <p className="font-bold text-slate-800">Something went wrong</p>
              <p className="text-sm text-slate-400">{error}</p>
            </div>
          </div>
          <button
            onClick={() => loadAll()}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-slate-800 text-white text-sm font-semibold rounded-xl hover:bg-slate-700 transition-colors"
          >
            <FaSync className="text-xs" /> Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-8">

        {/* ── Header ── */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5 mb-1">
              <div className="w-7 h-7 rounded-lg bg-slate-800 flex items-center justify-center">
                <FaGraduationCap className="text-white text-xs" />
              </div>
              <h1 className="text-xl font-black text-slate-900 tracking-tight">
                Dashboard
              </h1>
            </div>
            <p className="text-xs text-slate-400 ml-9">{dateStr}</p>
          </div>

          <button
            onClick={() => loadAll(true)}
            disabled={refreshing}
            className="flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-blue-600 bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 shadow-sm transition-colors disabled:opacity-40 shrink-0"
          >
            <FaSync className={`text-[10px] ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>

        {/* ── Section 1: School Overview ── */}
        <section>
          <SectionLabel>School overview</SectionLabel>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <KpiCard
              index={0}
              label="Total Students"
              value={stats?.total_students ?? 0}
              icon={<FaUserGraduate className="text-blue-500 text-sm" />}
              iconBg="bg-blue-50"
              borderColor="bg-blue-500"
              onClick={() => navigate("/admin/students")}
            />
            <KpiCard
              index={1}
              label="Total Teachers"
              value={stats?.total_teachers ?? 0}
              icon={<FaChalkboardTeacher className="text-emerald-500 text-sm" />}
              iconBg="bg-emerald-50"
              borderColor="bg-emerald-500"
              onClick={() => navigate("/admin/teachers")}
            />
            <KpiCard
              index={2}
              label="Total Classes"
              value={stats?.total_classes ?? 0}
              icon={<FaSchool className="text-violet-500 text-sm" />}
              iconBg="bg-violet-50"
              borderColor="bg-violet-500"
              onClick={() => navigate("/admin/classes")}
            />
            <KpiCard
              index={3}
              label="Pending Admissions"
              value={stats?.pending_admissions ?? 0}
              icon={<FaClipboardCheck className="text-amber-500 text-sm" />}
              iconBg="bg-amber-50"
              borderColor="bg-amber-400"
              sub={`${stats?.approved_admissions ?? 0} approved this year`}
              onClick={() => navigate("/admin/admissions")}
            />
          </div>
        </section>

        {/* ── Section 2: Active Users (new) ── */}
        <section>
          <SectionLabel>System activity</SectionLabel>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <KpiCard
              index={0}
              label="Active Users"
              value={activeUsers ?? "—"}
              icon={<FaUserCheck className="text-teal-500 text-sm" />}
              iconBg="bg-teal-50"
              borderColor="bg-teal-500"
              sub="Staff currently logged in"
            />
          </div>
        </section>

        {/* ── Section 3: Finance & Attendance ── */}
        <section>
          <SectionLabel>Finance &amp; Attendance</SectionLabel>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <KpiCard
              index={0}
              label="Fees Collected"
              value={feeStats ? ghs(feeStats.total_paid) : "—"}
              icon={<FaMoneyBillWave className="text-emerald-500 text-sm" />}
              iconBg="bg-emerald-50"
              borderColor="bg-emerald-500"
              sub={feeStats ? `${ghs(feeStats.total_balance)} outstanding` : ""}
              onClick={() => navigate("/admin/accounts")}
            />
            <KpiCard
              index={1}
              label="Collection Rate"
              value={feeStats ? `${collectionRate}%` : "—"}
              icon={<FaChartLine className="text-indigo-500 text-sm" />}
              iconBg="bg-indigo-50"
              borderColor="bg-indigo-500"
              sub={
                feeStats
                  ? `${feeStats.fully_paid} paid · ${feeStats.partial} partial · ${feeStats.unpaid} unpaid`
                  : ""
              }
              onClick={() => navigate("/admin/fees")}
            />
            <KpiCard
              index={2}
              label="Today's Attendance"
              value={attStats ? `${attStats.present}/${attStats.total}` : "—"}
              icon={<FaCalendarCheck className="text-orange-500 text-sm" />}
              iconBg="bg-orange-50"
              borderColor="bg-orange-400"
              sub={
                attPercent !== null
                  ? `${attPercent}% present today`
                  : "No records yet"
              }
              onClick={() => navigate("/admin/attendance")}
            />
          </div>
        </section>

        {/* ── Section 4: Fee Collection Progress ── */}
        {feeStats && (
          <section>
            <SectionLabel>Fee collection progress</SectionLabel>
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-5">

              {/* Overall bar */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <span className="text-sm font-bold text-slate-700">Overall collection</span>
                    <span className="ml-2 text-xs text-slate-400">
                      {ghs(feeStats.total_paid)} of {ghs(feeStats.total_billed)}
                    </span>
                  </div>
                  <span className={`text-xs font-black px-2.5 py-1 rounded-full ${rateBadge(collectionRate)}`}>
                    {collectionRate}%
                  </span>
                </div>
                <ProgressBar value={collectionRate} />
              </div>

              {/* Term breakdown */}
              {feeStats.term_breakdown?.length > 0 && (
                <div className="grid grid-cols-3 gap-4 pt-5 border-t border-slate-100">
                  {feeStats.term_breakdown.map((t) => {
                    const pct = t.billed > 0 ? Math.round((t.paid / t.billed) * 100) : 0;
                    return (
                      <div key={t.term} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-slate-600">{t.label}</span>
                          <span className={`text-[11px] font-bold ${rateText(pct)}`}>{pct}%</span>
                        </div>
                        <ProgressBar value={pct} />
                        <div className="flex justify-between text-[11px] text-slate-400">
                          <span>{ghs(t.paid)}</span>
                          <span className="text-slate-300">{ghs(t.billed)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Status pills */}
              <div className="flex flex-wrap gap-2 pt-4 border-t border-slate-100">
                <StatusPill
                  label={`${feeStats.fully_paid} Fully Paid`}
                  bg="bg-emerald-50"
                  text="text-emerald-700"
                  dot="bg-emerald-500"
                />
                <StatusPill
                  label={`${feeStats.partial} Partial`}
                  bg="bg-amber-50"
                  text="text-amber-700"
                  dot="bg-amber-400"
                />
                <StatusPill
                  label={`${feeStats.unpaid} Unpaid`}
                  bg="bg-red-50"
                  text="text-red-600"
                  dot="bg-red-500"
                />
              </div>
            </div>
          </section>
        )}

        {/* ── Section 5: Quick Actions ── */}
        <section>
          <SectionLabel>Quick actions</SectionLabel>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <QuickAction
              index={0}
              label="Add Student"
              description="New enrollment"
              path="/admin/admissions"
              gradient="bg-gradient-to-br from-blue-600 to-blue-500"
              icon="🎓"
            />
            <QuickAction
              index={1}
              label="Enter Results"
              description="Academic records"
              path="/admin/results"
              gradient="bg-gradient-to-br from-violet-600 to-violet-500"
              icon="📝"
            />
            <QuickAction
              index={2}
              label="Mark Attendance"
              description="Today's register"
              path="/admin/attendance"
              gradient="bg-gradient-to-br from-orange-500 to-amber-400"
              icon="✅"
            />
            <QuickAction
              index={3}
              label="Record Payment"
              description="Fee collection"
              path="/admin/fees"
              gradient="bg-gradient-to-br from-emerald-600 to-emerald-500"
              icon="💳"
            />
          </div>
        </section>

      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fadeIn 0.3s ease both;
          opacity: 0;
        }
      `}</style>
    </div>
  );
};

export default Dashboard;
