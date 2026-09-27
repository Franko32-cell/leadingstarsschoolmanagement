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
  pct >= 80 ? "#34D399" : pct >= 50 ? "#F2A93B" : "#FB7185";

// ── Sub-components ─────────────────────────────────────────────────────────────

const Skeleton = ({ className = "" }) => (
  <div className={`animate-pulse bg-white/[0.04] border border-white/5 rounded-3xl ${className}`} />
);

/* ---------- Glass surface base ---------- */
const glassBase =
  "bg-white/[0.045] backdrop-blur-xl border border-white/10 shadow-xl shadow-black/30";

/* ---------- KPI Card ---------- */
const KpiCard = ({ label, value, sub, icon, accent, onClick, trend }) => (
  <div
    onClick={onClick}
    className={`
      group relative rounded-3xl overflow-hidden ${glassBase}
      transition-all duration-300
      ${onClick ? "cursor-pointer hover:bg-white/[0.07] hover:-translate-y-1" : ""}
    `}
  >
    <div className="relative p-6">
      <div className="flex items-start justify-between mb-4">
        <div
          className="w-12 h-12 rounded-2xl flex items-center justify-center"
          style={{ background: `${accent}1A`, border: `1px solid ${accent}33` }}
        >
          <div className="text-lg" style={{ color: accent }}>{icon}</div>
        </div>

        {trend && (
          <div className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${
            trend.direction === 'up'
              ? 'bg-[#34D399]/10 text-[#34D399]'
              : 'bg-[#FB7185]/10 text-[#FB7185]'
          }`}>
            {trend.direction === 'up' ? <FaArrowUp className="text-[8px]" /> : <FaArrowDown className="text-[8px]" />}
            <span>{trend.value}</span>
          </div>
        )}
      </div>

      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
        {label}
      </p>

      <p className="text-4xl font-bold text-white leading-none tracking-tight tabular-nums mb-3">
        {value}
      </p>

      {sub && (
        <p className="text-xs text-slate-500 leading-relaxed">
          {sub}
        </p>
      )}

      {onClick && (
        <div className="mt-5 pt-5 border-t border-white/10 flex items-center justify-between">
          <span className="text-xs font-bold tracking-wide" style={{ color: accent }}>
            View details
          </span>
          <FaArrowRight
            className="text-xs group-hover:translate-x-0.5 transition-transform"
            style={{ color: accent }}
          />
        </div>
      )}
    </div>
  </div>
);

/* ---------- Donut ---------- */
const Donut = ({ pct, color, size = 72, stroke = 8 }) => {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;
  const cx = size / 2;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={cx} cy={cx} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={stroke} />
      <circle
        cx={cx} cy={cx} r={r}
        fill="none"
        stroke={color}
        strokeWidth={stroke}
        strokeDasharray={circ}
        strokeDashoffset={offset}
        strokeLinecap="round"
        transform={`rotate(-90 ${cx} ${cx})`}
        style={{ transition: "stroke-dashoffset 1s ease" }}
      />
      <text x={cx} y={cx - 2} textAnchor="middle" fontSize="16" fontWeight="800" fill="#F1F3FA">
        {pct}%
      </text>
      <text x={cx} y={cx + 11} textAnchor="middle" fontSize="7" fontWeight="600" fill="#5B6485">
        RATE
      </text>
    </svg>
  );
};

/* ---------- Progress Bar ---------- */
const ProgressBar = ({ value, color }) => (
  <div className="w-full bg-white/[0.06] rounded-full h-2 overflow-hidden">
    <div
      className="h-2 rounded-full transition-all duration-1000 ease-out"
      style={{ width: `${Math.min(value, 100)}%`, background: color }}
    />
  </div>
);

/* ---------- Status Pill ---------- */
const StatusPill = ({ label, dotColor, tint }) => (
  <span
    className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold"
    style={{ background: `${tint}14`, color: tint }}
  >
    <span className="w-1.5 h-1.5 rounded-full" style={{ background: dotColor }} />
    {label}
  </span>
);

/* ---------- Section Label ---------- */
const SectionLabel = ({ children, icon }) => (
  <div className="flex items-center gap-2 mb-4">
    {icon && <div className="text-slate-500 text-sm">{icon}</div>}
    <h2 className="text-xs font-bold text-slate-500 uppercase tracking-[0.18em]">
      {children}
    </h2>
    <div className="flex-1 h-px bg-white/10" />
  </div>
);

/* ---------- Quick Action Card ---------- */
const QuickActionCard = ({ label, description, path, accent, icon }) => {
  const navigate = useNavigate();
  return (
    <button
      onClick={() => navigate(path)}
      className={`group relative rounded-2xl p-5 text-left overflow-hidden ${glassBase}
        transition-all duration-300 hover:bg-white/[0.07] hover:-translate-y-1`}
    >
      <div
        className="w-11 h-11 rounded-xl flex items-center justify-center text-xl mb-4"
        style={{ background: `${accent}1A`, border: `1px solid ${accent}33` }}
      >
        {icon}
      </div>

      <p className="text-sm font-bold text-slate-100 leading-snug mb-1">
        {label}
      </p>
      {description && (
        <p className="text-xs text-slate-500">
          {description}
        </p>
      )}

      <FaArrowRight className="absolute bottom-5 right-5 text-xs text-slate-600 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all duration-300" />
    </button>
  );
};

/* ---------- Welcome Banner ---------- */
const WelcomeBanner = ({ userName = "Admin" }) => {
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  return (
    <div className={`relative rounded-3xl overflow-hidden ${glassBase} p-8`}>
      <div className="absolute -top-24 -right-16 w-72 h-72 rounded-full bg-gradient-to-br from-[#5B7FFF] to-[#9B6BFF] opacity-20 blur-[90px] pointer-events-none" />

      <div className="relative flex items-center justify-between gap-6">
        <div className="flex-1">
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight mb-2">
            {greeting}, {userName}
          </h1>
          <p className="text-slate-400 max-w-xl">
            Welcome back to Leading Stars School Management. Here's your overview for today.
          </p>
        </div>

        <div className="hidden lg:flex w-20 h-20 rounded-3xl items-center justify-center flex-shrink-0
          bg-gradient-to-br from-[#5B7FFF] to-[#9B6BFF] shadow-lg shadow-[#5B7FFF]/30">
          <FaGraduationCap className="text-3xl text-white" />
        </div>
      </div>
    </div>
  );
};

/* ---------- Mini Stat Card ---------- */
const MiniStatCard = ({ icon, label, value, accent }) => (
  <div className={`relative rounded-2xl p-5 ${glassBase}`}>
    <div className="flex items-center gap-4">
      <div
        className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: `${accent}1A`, border: `1px solid ${accent}33` }}
      >
        <div className="text-lg" style={{ color: accent }}>{icon}</div>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 truncate">
          {label}
        </p>
        <p className="text-2xl font-bold text-white tracking-tight tabular-nums">
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
      <div className="min-h-screen p-6 space-y-8">
        <div className="max-w-7xl mx-auto space-y-6">
          <Skeleton className="h-44" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-48" />
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
      <div className="min-h-screen p-8 flex items-center justify-center">
        <div className={`w-full max-w-md rounded-3xl ${glassBase} p-8`}>
          <div className="flex flex-col items-center text-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-[#FB7185]/10 border border-[#FB7185]/25 flex items-center justify-center">
              <FaExclamationTriangle className="text-[#FB7185] text-xl" />
            </div>
            <div>
              <p className="font-bold text-lg text-white mb-1">
                Something went wrong
              </p>
              <p className="text-sm text-slate-500">{error}</p>
            </div>
            <button
              onClick={() => loadAll()}
              className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-[#5B7FFF] to-[#9B6BFF] text-white text-sm font-bold rounded-xl hover:opacity-90 transition-opacity"
            >
              <FaSync className="text-xs" /> Try again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto space-y-8 pb-8">
        {/* ── Header Controls ── */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-1.5 h-8 rounded-full bg-gradient-to-b from-[#5B7FFF] to-[#9B6BFF]" />
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Dashboard Overview
              </p>
              <p className="text-sm text-slate-400 mt-0.5 flex items-center gap-1.5">
                <FaClock className="text-xs" />
                {dateStr}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button className={`relative w-11 h-11 rounded-xl flex items-center justify-center ${glassBase} hover:bg-white/[0.08] transition-colors group`}>
              <FaBell className="text-slate-400 group-hover:text-white transition-colors" />
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-[#FB7185] text-[#1A0B0D] text-[10px] font-bold rounded-full flex items-center justify-center">
                3
              </span>
            </button>

            <button
              onClick={() => loadAll(true)}
              disabled={refreshing}
              className={`flex items-center gap-2.5 text-sm font-bold text-slate-300 hover:text-white rounded-xl px-4 py-2.5 ${glassBase} hover:bg-white/[0.08] transition-colors disabled:opacity-40 disabled:cursor-not-allowed`}
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
              label="Total Students"
              value={stats?.total_students ?? 0}
              icon={<FaUserGraduate />}
              accent="#5B7FFF"
              onClick={() => navigate("/admin/students")}
              sub="Enrolled this year"
              trend={{ direction: 'up', value: '12%' }}
            />
            <KpiCard
              label="Total Teachers"
              value={stats?.total_teachers ?? 0}
              icon={<FaChalkboardTeacher />}
              accent="#34D399"
              onClick={() => navigate("/admin/teachers")}
              sub="Active staff members"
            />
            <KpiCard
              label="Total Classes"
              value={stats?.total_classes ?? 0}
              icon={<FaSchool />}
              accent="#9B6BFF"
              onClick={() => navigate("/admin/classes")}
              sub="Across all levels"
            />
            <KpiCard
              label="Pending Admissions"
              value={stats?.pending_admissions ?? 0}
              icon={<FaClipboardCheck />}
              accent="#F2A93B"
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
              label="Fees Collected"
              value={feeStats ? ghs(feeStats.total_paid) : "—"}
              icon={<FaMoneyBillWave />}
              accent="#34D399"
              sub={feeStats ? `${ghs(feeStats.total_balance)} outstanding` : ""}
              onClick={() => navigate("/admin/accounts")}
            />
            <KpiCard
              label="Collection Rate"
              value={feeStats ? `${collectionRate}%` : "—"}
              icon={<FaChartLine />}
              accent="#9B6BFF"
              sub={
                feeStats
                  ? `${feeStats.fully_paid} paid · ${feeStats.partial} partial`
                  : ""
              }
              onClick={() => navigate("/admin/fees")}
            />
            <KpiCard
              label="Today's Attendance"
              value={attStats ? `${attStats.present}/${attStats.total}` : "—"}
              icon={<FaCalendarCheck />}
              accent="#FB7185"
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
              icon={<FaUserCheck />}
              label="Active Users"
              value={activeUsers ?? "—"}
              accent="#34D399"
            />

            {attPercent !== null && (
              <div className={`relative rounded-2xl p-5 ${glassBase}`}>
                <div className="flex items-center gap-4">
                  <Donut pct={attPercent} color="#FB7185" />
                  <div className="flex-1">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                      Attendance
                    </p>
                    <p className="text-2xl font-bold text-white tracking-tight">
                      {attPercent}%
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {attStats.present} present
                    </p>
                  </div>
                </div>
              </div>
            )}

            <MiniStatCard
              icon={<FaMoneyBillWave />}
              label="Outstanding"
              value={feeStats ? ghs(feeStats.total_balance) : "—"}
              accent="#F2A93B"
            />

            <MiniStatCard
              icon={<FaClipboardCheck />}
              label="Approved Today"
              value={stats?.approved_admissions ?? 0}
              accent="#5B7FFF"
            />
          </div>
        </section>

        {/* ── Section 4: Fee Collection Progress ── */}
        {feeStats && (
          <section>
            <SectionLabel icon={<FaMoneyBillWave />}>Fee collection progress</SectionLabel>
            <div className={`rounded-3xl overflow-hidden ${glassBase}`}>
              <div className="p-8 space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-base font-bold text-white">
                      Overall Collection
                    </p>
                    <p className="text-sm text-slate-500 mt-1">
                      {ghs(feeStats.total_paid)} of {ghs(feeStats.total_billed)}
                    </p>
                  </div>
                  <span
                    className="text-2xl font-bold px-4 py-2 rounded-2xl"
                    style={{
                      background: `${rateColor(collectionRate)}14`,
                      color: rateColor(collectionRate),
                    }}
                  >
                    {collectionRate}%
                  </span>
                </div>

                <ProgressBar value={collectionRate} color={rateColor(collectionRate)} />

                {feeStats.term_breakdown?.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6 border-t border-white/10">
                    {feeStats.term_breakdown.map((t) => {
                      const pct = t.billed > 0 ? Math.round((t.paid / t.billed) * 100) : 0;
                      const col = rateColor(pct);
                      return (
                        <div
                          key={t.term}
                          className="space-y-3 p-4 rounded-2xl bg-white/[0.03] border border-white/5"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-bold text-slate-300">
                              {t.label}
                            </span>
                            <span
                              className="text-xs font-bold px-2.5 py-1 rounded-lg"
                              style={{ background: `${col}14`, color: col }}
                            >
                              {pct}%
                            </span>
                          </div>
                          <ProgressBar value={pct} color={col} />
                          <div className="flex justify-between text-xs font-semibold">
                            <span className="text-slate-400">{ghs(t.paid)}</span>
                            <span className="text-slate-600">{ghs(t.billed)}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                <div className="flex flex-wrap gap-3 pt-6 border-t border-white/10">
                  <StatusPill
                    label={`${feeStats.fully_paid} Fully Paid`}
                    dotColor="#34D399"
                    tint="#34D399"
                  />
                  <StatusPill
                    label={`${feeStats.partial} Partial`}
                    dotColor="#F2A93B"
                    tint="#F2A93B"
                  />
                  <StatusPill
                    label={`${feeStats.unpaid} Unpaid`}
                    dotColor="#FB7185"
                    tint="#FB7185"
                  />
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ── Section 5: Quick Actions ── */}
        <section>
          <SectionLabel icon={<FaArrowRight />}>Quick actions</SectionLabel>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4">
            <QuickActionCard
              label="Add Student"
              description="New enrollment"
              path="/admin/admissions"
              accent="#5B7FFF"
              icon="🎓"
            />
            <QuickActionCard
              label="Enter Results"
              description="Academic records"
              path="/admin/results"
              accent="#9B6BFF"
              icon="📝"
            />
            <QuickActionCard
              label="Mark Attendance"
              description="Today's register"
              path="/admin/attendance"
              accent="#F2A93B"
              icon="✅"
            />
            <QuickActionCard
              label="Record Payment"
              description="Fee collection"
              path="/admin/fees"
              accent="#34D399"
              icon="💳"
            />
            <QuickActionCard
              label="Mock Results"
              description="BECE-style scores"
              path="/admin/mock-results"
              accent="#5B7FFF"
              icon="📊"
            />
            <QuickActionCard
              label="Preschool Assessment"
              description="Early years rubric"
              path="/admin/preschool-assessment"
              accent="#F2A93B"
              icon="🌱"
            />
          </div>
        </section>
      </div>
    </div>
  );
};

export default Dashboard;