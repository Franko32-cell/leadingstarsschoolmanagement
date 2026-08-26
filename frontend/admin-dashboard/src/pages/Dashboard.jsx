import { useCallback, useEffect, useState } from "react";
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
  FaUserCheck,
  FaArrowUp,
  FaArrowDown,
  FaClock,
  FaBell,
} from "react-icons/fa";

// ── Helpers ────────────────────────────────────────────────────────────────────

const ghs = (n) =>
  `GHS ${Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 0 })}`;

const rateColor = (pct) =>
  pct >= 80 ? "#10b981" : pct >= 50 ? "#f59e0b" : "#ef4444";

// ── Sub-components ─────────────────────────────────────────────────────────────

const Skeleton = ({ className = "" }) => (
  <div className={`animate-pulse bg-gradient-to-br from-slate-100 to-slate-50 rounded-3xl ${className}`} />
);

/* ---------- Enhanced KPI Card with Glassmorphism ---------- */
const KpiCard = ({
  label,
  value,
  sub,
  icon,
  accentColor,
  gradient,
  onClick,
  index = 0,
  trend,
}) => (
  <div
    onClick={onClick}
    style={{ animationDelay: `${index * 80}ms` }}
    className={`
      group relative bg-white rounded-3xl overflow-hidden
      border border-white/20 shadow-lg shadow-slate-200/50
      transition-all duration-300 animate-fade-in-up
      backdrop-blur-xl
      ${onClick ? "cursor-pointer hover:shadow-2xl hover:shadow-slate-300/50 hover:-translate-y-2 active:scale-[0.98]" : ""}
    `}
  >
    {/* Gradient background */}
    <div 
      className="absolute inset-0 opacity-[0.03] group-hover:opacity-[0.06] transition-opacity duration-300"
      style={{ background: gradient }}
    />

    <div className="relative p-6">
      {/* Icon with gradient background */}
      <div className="flex items-start justify-between mb-4">
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg shadow-slate-200/50 group-hover:scale-110 transition-transform duration-300"
          style={{ background: gradient }}
        >
          <div className="text-white text-xl">{icon}</div>
        </div>
        
        {/* Trend indicator */}
        {trend && (
          <div className={`flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-bold ${
            trend.direction === 'up' 
              ? 'bg-emerald-50 text-emerald-600' 
              : 'bg-red-50 text-red-600'
          }`}>
            {trend.direction === 'up' ? <FaArrowUp className="text-[8px]" /> : <FaArrowDown className="text-[8px]" />}
            <span>{trend.value}</span>
          </div>
        )}
      </div>

      {/* Label */}
      <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
        {label}
      </p>

      {/* Value */}
      <p className="text-4xl font-black text-slate-900 leading-none tracking-tight tabular-nums mb-3">
        {value}
      </p>

      {/* Sub */}
      {sub && (
        <p className="text-xs text-slate-500 leading-relaxed font-medium flex items-center gap-1.5">
          <span className="w-1 h-1 rounded-full bg-slate-300" />
          {sub}
        </p>
      )}

      {/* CTA row */}
      {onClick && (
        <div className="mt-5 pt-5 border-t border-slate-100 flex items-center justify-between group-hover:gap-2 transition-all duration-300">
          <span
            className="text-xs font-bold tracking-wide"
            style={{ color: accentColor }}
          >
            View details
          </span>
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-300 group-hover:scale-110"
            style={{ background: `${accentColor}15` }}
          >
            <FaArrowRight className="text-xs group-hover:translate-x-0.5 transition-transform" style={{ color: accentColor }} />
          </div>
        </div>
      )}
    </div>

    {/* Shine effect on hover */}
    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none">
      <div className="absolute inset-0 bg-gradient-to-br from-white/0 via-white/5 to-white/0 transform -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
    </div>
  </div>
);

/* ---------- Enhanced Donut with Glow ---------- */
const Donut = ({ pct, color, size = 80, stroke = 9 }) => {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;
  const cx = size / 2;
  
  return (
    <div className="relative">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="drop-shadow-lg">
        {/* Background circle */}
        <circle
          cx={cx} cy={cx} r={r}
          fill="none"
          stroke="#f1f5f9"
          strokeWidth={stroke}
        />
        {/* Glow effect */}
        <circle
          cx={cx} cy={cx} r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeDasharray={circ}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform={`rotate(-90 ${cx} ${cx})`}
          style={{ 
            transition: "stroke-dashoffset 1s ease",
            filter: "drop-shadow(0 0 6px " + color + "40)"
          }}
        />
        {/* Percentage text */}
        <text
          x={cx} y={cx - 2}
          textAnchor="middle"
          fontSize="18"
          fontWeight="900"
          fill="#0f172a"
        >
          {pct}%
        </text>
        <text
          x={cx} y={cx + 12}
          textAnchor="middle"
          fontSize="8"
          fontWeight="600"
          fill="#94a3b8"
        >
          RATE
        </text>
      </svg>
    </div>
  );
};

/* ---------- Enhanced Progress Bar ---------- */
const ProgressBar = ({ value, color }) => (
  <div className="relative w-full bg-slate-100 rounded-full h-2.5 overflow-hidden shadow-inner">
    <div
      className="h-2.5 rounded-full transition-all duration-1000 ease-out relative overflow-hidden"
      style={{ width: `${Math.min(value, 100)}%`, background: color }}
    >
      {/* Animated shimmer */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" />
    </div>
  </div>
);

/* ---------- Status Pill ---------- */
const StatusPill = ({ label, dotColor, bg, text }) => (
  <span className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold ${bg} ${text} shadow-sm`}>
    <span className="relative flex h-2 w-2">
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ background: dotColor }} />
      <span className="relative inline-flex rounded-full h-2 w-2" style={{ background: dotColor }} />
    </span>
    {label}
  </span>
);

/* ---------- Section Label ---------- */
const SectionLabel = ({ children, icon }) => (
  <div className="flex items-center gap-2 mb-4">
    {icon && <div className="text-slate-400 text-sm">{icon}</div>}
    <h2 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">
      {children}
    </h2>
    <div className="flex-1 h-px bg-gradient-to-r from-slate-200 to-transparent" />
  </div>
);

/* ---------- Enhanced Quick Action Card ---------- */
const QuickActionCard = ({ label, description, path, gradient, icon, index }) => {
  const navigate = useNavigate();
  return (
    <button
      onClick={() => navigate(path)}
      style={{ animationDelay: `${index * 60}ms` }}
      className="group relative rounded-2xl p-5 text-left overflow-hidden
        bg-white border border-slate-100 shadow-md shadow-slate-200/50
        transition-all duration-300 animate-fade-in-up
        hover:shadow-xl hover:shadow-slate-300/50 hover:-translate-y-1.5 active:scale-[0.97]"
    >
      {/* Gradient overlay */}
      <div 
        className="absolute inset-0 opacity-[0.02] group-hover:opacity-[0.08] transition-opacity duration-300"
        style={{ background: gradient }}
      />
      
      <div className="relative">
        {/* Icon */}
        <div
          className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl mb-4 shadow-lg group-hover:scale-110 group-hover:rotate-6 transition-all duration-300"
          style={{ background: gradient }}
        >
          {icon}
        </div>
        
        {/* Content */}
        <p className="text-sm font-bold text-slate-800 leading-snug mb-1">
          {label}
        </p>
        {description && (
          <p className="text-xs text-slate-500 font-medium">
            {description}
          </p>
        )}
        
        {/* Arrow */}
        <div className="absolute bottom-5 right-5 w-8 h-8 rounded-xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 bg-slate-900/5 group-hover:translate-x-1">
          <FaArrowRight className="text-xs text-slate-600" />
        </div>
      </div>
    </button>
  );
};

/* ---------- Welcome Banner ---------- */
const WelcomeBanner = ({ userName = "Admin" }) => {
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  return (
    <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 p-8 shadow-2xl shadow-purple-500/30 animate-fade-in">
      {/* Animated background pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.1),transparent_50%)]" />
      </div>
      
      <div className="relative flex items-center justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-4xl animate-wave">👋</span>
            <h1 className="text-3xl font-black text-white tracking-tight">
              {greeting}, {userName}!
            </h1>
          </div>
          <p className="text-indigo-100 font-medium max-w-2xl">
            Welcome back to Leading Stars School Management. Here's your overview for today.
          </p>
        </div>
        
        <div className="hidden lg:block">
          <div className="w-32 h-32 bg-white/10 backdrop-blur-xl rounded-3xl flex items-center justify-center shadow-2xl">
            <FaGraduationCap className="text-6xl text-white" />
          </div>
        </div>
      </div>
    </div>
  );
};

/* ---------- Mini Stat Card ---------- */
const MiniStatCard = ({ icon, label, value, color, gradient, index }) => (
  <div
    style={{ animationDelay: `${index * 60}ms` }}
    className="relative bg-white rounded-2xl p-5 shadow-md shadow-slate-200/50 border border-slate-100 overflow-hidden animate-fade-in-up group hover:shadow-xl hover:shadow-slate-300/50 hover:-translate-y-1 transition-all duration-300"
  >
    <div 
      className="absolute inset-0 opacity-[0.03] group-hover:opacity-[0.06] transition-opacity"
      style={{ background: gradient }}
    />
    
    <div className="relative flex items-center gap-4">
      <div
        className="w-12 h-12 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300"
        style={{ background: gradient, color: color || "#ffffff" }}
      >
        <div className="text-white text-lg">{icon}</div>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 truncate">
          {label}
        </p>
        <p className="text-2xl font-black tracking-tight tabular-nums" style={{ color: color || "#0f172a" }}>
          {value}
        </p>
      </div>
    </div>
  </div>
);

// ── Main component ─────────────────────────────────────────────────────────────

const Dashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [feeStats, setFeeStats] = useState(null);
  const [attStats, setAttStats] = useState(null);
  const [activeUsers, setActiveUsers] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const today = new Date().toISOString().split("T")[0];

  const loadAll = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError("");

    try {
      const [dashRes, feeRes, attRes, activeRes] = await Promise.allSettled([
        getDashboard(),
        API.get("/accounts/dashboard/"),
        API.get(`/attendance/?date=${today}`),
        API.get("/accounts/active-users/"),
      ]);

      if (dashRes.status === "fulfilled") setStats(dashRes.value);
      if (feeRes.status === "fulfilled") setFeeStats(feeRes.value.data);
      if (attRes.status === "fulfilled") {
        const records = attRes.value.data.results || attRes.value.data;
        const present = records.filter(
          (r) => r.status === "present" || r.status === "late"
        ).length;
        setAttStats({ present, total: records.length });
      }
      if (activeRes.status === "fulfilled") {
        setActiveUsers(activeRes.value.data.active_users);
      }
    } catch {
      setError("Failed to load dashboard data.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [today]);

  useEffect(() => {
    const init = async () => {
      await loadAll();
    };

    init();
  }, [loadAll]);

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
      <div className="min-h-screen p-6 space-y-8 bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/30">
        <div className="max-w-7xl mx-auto space-y-6">
          <Skeleton className="h-48" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-52" />
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-40" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── Error state ───────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="min-h-screen p-8 flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/30">
        <div className="w-full max-w-md bg-white rounded-3xl border border-red-100 shadow-2xl p-8 animate-fade-in">
          <div className="flex flex-col items-center text-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center shadow-lg">
              <FaExclamationTriangle className="text-white text-2xl" />
            </div>
            <div>
              <p className="font-black text-xl text-slate-800 mb-1">
                Oops! Something went wrong
              </p>
              <p className="text-sm text-slate-500">{error}</p>
            </div>
            <button
              onClick={() => loadAll()}
              className="w-full flex items-center justify-center gap-2 py-3.5 bg-gradient-to-r from-slate-900 to-slate-700 text-white text-sm font-bold rounded-xl hover:shadow-lg hover:scale-105 active:scale-95 transition-all"
            >
              <FaSync className="text-xs" /> Try again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        {/* ── Header Controls ── */}
        <div className="flex items-center justify-between animate-fade-in">
          <div className="flex items-center gap-3">
            <div className="w-2 h-8 bg-gradient-to-b from-indigo-500 to-purple-500 rounded-full" />
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Dashboard Overview
              </p>
              <p className="text-sm text-slate-500 font-medium mt-0.5 flex items-center gap-1.5">
                <FaClock className="text-xs" />
                {dateStr}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button className="w-11 h-11 bg-white border border-slate-200 rounded-xl flex items-center justify-center shadow-md hover:shadow-lg hover:scale-105 active:scale-95 transition-all group">
              <FaBell className="text-slate-600 group-hover:text-indigo-600 transition-colors" />
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-lg">
                3
              </span>
            </button>
            
            <button
              onClick={() => loadAll(true)}
              disabled={refreshing}
              className="flex items-center gap-2.5 text-sm font-bold text-slate-700 hover:text-indigo-600 bg-white border border-slate-200 rounded-xl px-4 py-2.5 shadow-md hover:shadow-lg hover:scale-105 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <FaSync className={`text-xs ${refreshing ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>
        </div>

        {/* ── Welcome Banner ── */}
        <WelcomeBanner userName="Admin" />

        {/* ── Section 1: Main KPIs ── */}
        <section>
          <SectionLabel icon={<FaSchool />}>School overview</SectionLabel>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <KpiCard
              index={0}
              label="Total Students"
              value={stats?.total_students ?? 0}
              icon={<FaUserGraduate />}
              accentColor="#6366f1"
              gradient="linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)"
              onClick={() => navigate("/admin/students")}
              sub="Enrolled this year"
              trend={{ direction: 'up', value: '12%' }}
            />
            <KpiCard
              index={1}
              label="Total Teachers"
              value={stats?.total_teachers ?? 0}
              icon={<FaChalkboardTeacher />}
              accentColor="#10b981"
              gradient="linear-gradient(135deg, #10b981 0%, #059669 100%)"
              onClick={() => navigate("/admin/teachers")}
              sub="Active staff members"
            />
            <KpiCard
              index={2}
              label="Total Classes"
              value={stats?.total_classes ?? 0}
              icon={<FaSchool />}
              accentColor="#3b82f6"
              gradient="linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)"
              onClick={() => navigate("/admin/classes")}
              sub="Across all levels"
            />
            <KpiCard
              index={3}
              label="Pending Admissions"
              value={stats?.pending_admissions ?? 0}
              icon={<FaClipboardCheck />}
              accentColor="#f59e0b"
              gradient="linear-gradient(135deg, #f59e0b 0%, #d97706 100%)"
              sub={`${stats?.approved_admissions ?? 0} approved this year`}
              onClick={() => navigate("/admin/admissions")}
              trend={{ direction: 'down', value: '3%' }}
            />
          </div>
        </section>

        {/* ── Section 2: Finance & Attendance ── */}
        <section>
          <SectionLabel icon={<FaChartLine />}>Finance &amp; Attendance</SectionLabel>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <KpiCard
              index={0}
              label="Fees Collected"
              value={feeStats ? ghs(feeStats.total_paid) : "—"}
              icon={<FaMoneyBillWave />}
              accentColor="#10b981"
              gradient="linear-gradient(135deg, #10b981 0%, #059669 100%)"
              sub={feeStats ? `${ghs(feeStats.total_balance)} outstanding` : ""}
              onClick={() => navigate("/admin/accounts")}
            />
            <KpiCard
              index={1}
              label="Collection Rate"
              value={feeStats ? `${collectionRate}%` : "—"}
              icon={<FaChartLine />}
              accentColor="#8b5cf6"
              gradient="linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)"
              sub={
                feeStats
                  ? `${feeStats.fully_paid} paid · ${feeStats.partial} partial`
                  : ""
              }
              onClick={() => navigate("/admin/fees")}
            />
            <KpiCard
              index={2}
              label="Today's Attendance"
              value={attStats ? `${attStats.present}/${attStats.total}` : "—"}
              icon={<FaCalendarCheck />}
              accentColor="#ef4444"
              gradient="linear-gradient(135deg, #ef4444 0%, #dc2626 100%)"
              sub={
                attPercent !== null
                  ? `${attPercent}% present today`
                  : "No records yet"
              }
              onClick={() => navigate("/admin/attendance")}
            />
          </div>
        </section>

        {/* ── Section 3: Activity Cards ── */}
        <section>
          <SectionLabel icon={<FaUserCheck />}>Real-time activity</SectionLabel>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <MiniStatCard
              index={0}
              icon={<FaUserCheck />}
              label="Active Users"
              value={activeUsers ?? "—"}
              color="#10b981"
              gradient="linear-gradient(135deg, #10b981 0%, #059669 100%)"
            />
            
            {attPercent !== null && (
              <div
                style={{ animationDelay: "60ms" }}
                className="relative bg-white rounded-2xl p-5 shadow-md shadow-slate-200/50 border border-slate-100 overflow-hidden animate-fade-in-up group hover:shadow-xl hover:shadow-slate-300/50 hover:-translate-y-1 transition-all duration-300"
              >
                <div className="absolute inset-0 opacity-[0.03] group-hover:opacity-[0.06] transition-opacity bg-gradient-to-br from-red-500 to-orange-500" />
                
                <div className="relative flex items-center gap-4">
                  <Donut pct={attPercent} color="#ef4444" size={72} stroke={8} />
                  <div className="flex-1">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                      Attendance
                    </p>
                    <p className="text-2xl font-black text-slate-900 tracking-tight">
                      {attPercent}%
                    </p>
                    <p className="text-xs text-slate-500 font-medium mt-0.5">
                      {attStats.present} present
                    </p>
                  </div>
                </div>
              </div>
            )}
            
            <MiniStatCard
              index={2}
              icon={<FaMoneyBillWave />}
              label="Outstanding"
              value={feeStats ? ghs(feeStats.total_balance) : "—"}
              color="#f59e0b"
              gradient="linear-gradient(135deg, #f59e0b 0%, #d97706 100%)"
            />
            
            <MiniStatCard
              index={3}
              icon={<FaClipboardCheck />}
              label="Approved Today"
              value={stats?.approved_admissions ?? 0}
              color="#6366f1"
              gradient="linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)"
            />
          </div>
        </section>

        {/* ── Section 4: Fee Collection Progress ── */}
        {feeStats && (
          <section>
            <SectionLabel icon={<FaMoneyBillWave />}>Fee collection progress</SectionLabel>
            <div className="bg-white rounded-3xl border border-slate-100 shadow-lg shadow-slate-200/50 overflow-hidden animate-fade-in">
              {/* Top gradient accent */}
              <div className="h-1.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />

              <div className="p-8 space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-base font-black text-slate-800">
                      Overall Collection
                    </p>
                    <p className="text-sm text-slate-500 mt-1 font-medium">
                      {ghs(feeStats.total_paid)} of {ghs(feeStats.total_billed)}
                    </p>
                  </div>
                  <div className="text-right">
                    <span
                      className="text-2xl font-black px-4 py-2 rounded-2xl shadow-lg"
                      style={{
                        background: `${rateColor(collectionRate)}15`,
                        color: rateColor(collectionRate),
                      }}
                    >
                      {collectionRate}%
                    </span>
                  </div>
                </div>

                <ProgressBar value={collectionRate} color={rateColor(collectionRate)} />

                {/* Term breakdown */}
                {feeStats.term_breakdown?.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6 border-t border-slate-100">
                    {feeStats.term_breakdown.map((t, idx) => {
                      const pct = t.billed > 0 ? Math.round((t.paid / t.billed) * 100) : 0;
                      const col = rateColor(pct);
                      return (
                        <div 
                          key={t.term} 
                          className="space-y-3 p-4 rounded-2xl bg-slate-50 border border-slate-100"
                          style={{ animationDelay: `${idx * 100}ms` }}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-bold text-slate-700">
                              {t.label}
                            </span>
                            <span
                              className="text-xs font-black px-2.5 py-1 rounded-lg"
                              style={{
                                background: `${col}15`,
                                color: col,
                              }}
                            >
                              {pct}%
                            </span>
                          </div>
                          <ProgressBar value={pct} color={col} />
                          <div className="flex justify-between text-xs font-semibold">
                            <span className="text-slate-600">{ghs(t.paid)}</span>
                            <span className="text-slate-400">{ghs(t.billed)}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Status pills */}
                <div className="flex flex-wrap gap-3 pt-6 border-t border-slate-100">
                  <StatusPill
                    label={`${feeStats.fully_paid} Fully Paid`}
                    dotColor="#10b981"
                    bg="bg-emerald-50"
                    text="text-emerald-700"
                  />
                  <StatusPill
                    label={`${feeStats.partial} Partial`}
                    dotColor="#f59e0b"
                    bg="bg-amber-50"
                    text="text-amber-700"
                  />
                  <StatusPill
                    label={`${feeStats.unpaid} Unpaid`}
                    dotColor="#ef4444"
                    bg="bg-red-50"
                    text="text-red-600"
                  />
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ── Section 5: Quick Actions ── */}
        <section className="pb-8">
          <SectionLabel icon={<FaArrowRight />}>Quick actions</SectionLabel>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4">
            <QuickActionCard
              index={0}
              label="Add Student"
              description="New enrollment"
              path="/admin/admissions"
              gradient="linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)"
              icon="🎓"
            />
            <QuickActionCard
              index={1}
              label="Enter Results"
              description="Academic records"
              path="/admin/results"
              gradient="linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)"
              icon="📝"
            />
            <QuickActionCard
              index={2}
              label="Mark Attendance"
              description="Today's register"
              path="/admin/attendance"
              gradient="linear-gradient(135deg, #f59e0b 0%, #d97706 100%)"
              icon="✅"
            />
            <QuickActionCard
              index={3}
              label="Record Payment"
              description="Fee collection"
              path="/admin/fees"
              gradient="linear-gradient(135deg, #10b981 0%, #059669 100%)"
              icon="💳"
            />
            <QuickActionCard
              index={4}
              label="Mock Results"
              description="BECE-style scores"
              path="/admin/mock-results"
              gradient="linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)"
              icon="📊"
            />
            <QuickActionCard
              index={5}
              label="Preschool Assessment"
              description="Early years rubric"
              path="/admin/preschool-assessment"
              gradient="linear-gradient(135deg, #f97316 0%, #ea580c 100%)"
              icon="🌱"
            />
          </div>
        </section>
      </div>

      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes shimmer {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(100%);
          }
        }

        @keyframes wave {
          0%, 100% {
            transform: rotate(0deg);
          }
          25% {
            transform: rotate(20deg);
          }
          75% {
            transform: rotate(-15deg);
          }
        }

        .animate-fade-in {
          animation: fadeIn 0.5s ease both;
        }

        .animate-fade-in-up {
          animation: fadeInUp 0.5s ease both;
          opacity: 0;
        }

        .animate-shimmer {
          animation: shimmer 2s infinite;
        }

        .animate-wave {
          display: inline-block;
          animation: wave 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};

export default Dashboard;