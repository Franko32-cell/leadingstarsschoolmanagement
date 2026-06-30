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
  FaUserCheck,
} from "react-icons/fa";

// ── Helpers ────────────────────────────────────────────────────────────────────

const ghs = (n) =>
  `GHS ${Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 0 })}`;

const rateColor = (pct) =>
  pct >= 80 ? "#1D9E75" : pct >= 50 ? "#EF9F27" : "#E24B4A";

const rateBgText = (pct) =>
  pct >= 80
    ? { bg: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200" }
    : pct >= 50
    ? { bg: "bg-amber-50 text-amber-700 ring-1 ring-amber-200" }
    : { bg: "bg-red-50 text-red-600 ring-1 ring-red-200" };

// ── Sub-components ─────────────────────────────────────────────────────────────

const Skeleton = ({ className = "" }) => (
  <div className={`animate-pulse bg-slate-100 rounded-2xl ${className}`} />
);

/* ---------- Neosoft KPI Card ---------- */
const KpiCard = ({
  label,
  value,
  sub,
  icon,
  accentColor,
  iconBg,
  onClick,
  index = 0,
}) => (
  <div
    onClick={onClick}
    style={{ animationDelay: `${index * 70}ms` }}
    className={`
      group relative bg-white rounded-2xl overflow-hidden
      border border-slate-100 shadow-sm
      transition-all duration-200 animate-fade-in
      ${onClick ? "cursor-pointer hover:shadow-lg hover:-translate-y-1 active:scale-[0.99]" : ""}
    `}
  >
    {/* Top color band */}
    <div
      className="absolute top-0 left-0 right-0 h-[3px]"
      style={{ background: accentColor }}
    />

    <div className="p-5 pt-6">
      {/* Icon chip */}
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center text-base mb-4 shadow-sm"
        style={{ background: iconBg }}
      >
        {icon}
      </div>

      {/* Label */}
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.14em] mb-1 leading-none">
        {label}
      </p>

      {/* Value */}
      <p className="text-[2rem] font-black text-slate-900 leading-none tracking-tight tabular-nums">
        {value}
      </p>

      {/* Sub */}
      {sub && (
        <p className="text-[11px] text-slate-400 mt-2 leading-relaxed font-medium">
          {sub}
        </p>
      )}

      {/* CTA row */}
      {onClick && (
        <div className="mt-4 pt-4 border-t border-slate-50 flex items-center justify-between">
          <span
            className="text-[11px] font-semibold"
            style={{ color: accentColor }}
          >
            View details
          </span>
          <div
            className="w-6 h-6 rounded-lg flex items-center justify-center group-hover:translate-x-0.5 transition-transform"
            style={{ background: iconBg }}
          >
            <FaArrowRight className="text-[9px]" style={{ color: accentColor }} />
          </div>
        </div>
      )}
    </div>
  </div>
);

/* ---------- Donut ---------- */
const Donut = ({ pct, color, size = 64, stroke = 8 }) => {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;
  const cx = size / 2;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle
        cx={cx} cy={cx} r={r}
        fill="none"
        stroke="rgba(0,0,0,0.07)"
        strokeWidth={stroke}
      />
      <circle
        cx={cx} cy={cx} r={r}
        fill="none"
        stroke={color}
        strokeWidth={stroke}
        strokeDasharray={circ}
        strokeDashoffset={offset}
        strokeLinecap="round"
        transform={`rotate(-90 ${cx} ${cx})`}
        style={{ transition: "stroke-dashoffset 0.8s ease" }}
      />
      <text
        x={cx} y={cx + 4}
        textAnchor="middle"
        fontSize="12"
        fontWeight="800"
        fill="#1e1b4b"
      >
        {pct}%
      </text>
    </svg>
  );
};

/* ---------- Progress Bar ---------- */
const ProgressBar = ({ value, color }) => (
  <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
    <div
      className="h-1.5 rounded-full transition-all duration-700 ease-out"
      style={{ width: `${Math.min(value, 100)}%`, background: color }}
    />
  </div>
);

/* ---------- Status Pill ---------- */
const StatusPill = ({ label, dotColor, bg, text }) => (
  <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold ${bg} ${text}`}>
    <span className="w-1.5 h-1.5 rounded-full" style={{ background: dotColor }} />
    {label}
  </span>
);

/* ---------- Section Label ---------- */
const SectionLabel = ({ children }) => (
  <h2 className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.18em] mb-3">
    {children}
  </h2>
);

/* ---------- Quick Action Card ---------- */
const QuickActionCard = ({ label, description, path, bgColor, iconBg, accentColor, icon, index }) => {
  const navigate = useNavigate();
  return (
        <button
      onClick={() => navigate(path)}
      style={{ animationDelay: `${index * 60}ms`, background: bgColor, borderColor: `${accentColor}30` }}
      className={`
        group relative rounded-2xl p-4 text-left overflow-hidden
        border transition-all duration-200 animate-fade-in
        hover:shadow-md hover:-translate-y-0.5 active:scale-[0.99]
      `}
    > 
      <div
        className="w-9 h-9 rounded-xl flex items-center justify-center text-lg mb-3"
        style={{ background: iconBg }}
      >
        {icon}
      </div>
      <p className="text-[13px] font-bold leading-snug" style={{ color: accentColor }}>
        {label}
      </p>
      {description && (
        <p className="text-[11px] mt-0.5 font-medium" style={{ color: `${accentColor}80` }}>
          {description}
        </p>
      )}
      <div
        className="absolute bottom-3.5 right-3.5 w-6 h-6 rounded-lg flex items-center justify-center opacity-40 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all"
        style={{ background: iconBg }}
      >
        <FaArrowRight className="text-[9px]" style={{ color: accentColor }} />
      </div>
    </button>
  );
};

// ── Main component ─────────────────────────────────────────────────────────────

const Dashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats]             = useState(null);
  const [feeStats, setFeeStats]       = useState(null);
  const [attStats, setAttStats]       = useState(null);
  const [activeUsers, setActiveUsers] = useState(null);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState("");
  const [refreshing, setRefreshing]   = useState(false);

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
        API.get("/accounts/active-users/"),
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
      <div className="min-h-screen p-6 space-y-8" style={{ background: "#f7f6fb" }}>
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-8 w-40" />
            <Skeleton className="h-4 w-60" />
          </div>
          <Skeleton className="h-9 w-24" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-44" />)}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-36" />)}
        </div>
        <Skeleton className="h-56" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-32" />)}
        </div>
      </div>
    );
  }

  // ── Error state ───────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="min-h-screen p-8 flex items-start justify-center" style={{ background: "#f7f6fb" }}>
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
    <div className="min-h-screen" style={{ background: "#f7f6fb" }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-8">

        {/* ── Header ── */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5 mb-1">
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center shadow-sm"
                style={{ background: "linear-gradient(135deg, #7F77DD, #534AB7)" }}
              >
                <FaGraduationCap className="text-white text-sm" />
              </div>
              <h1 className="text-xl font-black tracking-tight" style={{ color: "#1e1b4b" }}>
                Dashboard
              </h1>
            </div>
            <p className="text-xs text-slate-400 ml-[42px]">{dateStr}</p>
          </div>

          <button
            onClick={() => loadAll(true)}
            disabled={refreshing}
            className="flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-violet-600 bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 shadow-sm transition-colors disabled:opacity-40 shrink-0"
          >
            <FaSync className={`text-[10px] ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>

        {/* ── Section 1: School Overview ── */}
        <section>
          <SectionLabel>School overview</SectionLabel>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard
              index={0}
              label="Total Students"
              value={stats?.total_students ?? 0}
              icon={<FaUserGraduate style={{ color: "#7F77DD" }} />}
              iconBg="#EEEDFE"
              accentColor="#7F77DD"
              onClick={() => navigate("/admin/students")}
            />
            <KpiCard
              index={1}
              label="Total Teachers"
              value={stats?.total_teachers ?? 0}
              icon={<FaChalkboardTeacher style={{ color: "#1D9E75" }} />}
              iconBg="#E1F5EE"
              accentColor="#1D9E75"
              onClick={() => navigate("/admin/teachers")}
            />
            <KpiCard
              index={2}
              label="Total Classes"
              value={stats?.total_classes ?? 0}
              icon={<FaSchool style={{ color: "#378ADD" }} />}
              iconBg="#E6F1FB"
              accentColor="#378ADD"
              onClick={() => navigate("/admin/classes")}
            />
            <KpiCard
              index={3}
              label="Pending Admissions"
              value={stats?.pending_admissions ?? 0}
              icon={<FaClipboardCheck style={{ color: "#EF9F27" }} />}
              iconBg="#FAEEDA"
              accentColor="#EF9F27"
              sub={`${stats?.approved_admissions ?? 0} approved this year`}
              onClick={() => navigate("/admin/admissions")}
            />
          </div>
        </section>

        {/* ── Section 2: Finance & Attendance row ── */}
        <section>
          <SectionLabel>Finance &amp; Attendance</SectionLabel>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <KpiCard
              index={0}
              label="Fees Collected"
              value={feeStats ? ghs(feeStats.total_paid) : "—"}
              icon={<FaMoneyBillWave style={{ color: "#1D9E75" }} />}
              iconBg="#E1F5EE"
              accentColor="#1D9E75"
              sub={feeStats ? `${ghs(feeStats.total_balance)} outstanding` : ""}
              onClick={() => navigate("/admin/accounts")}
            />
            <KpiCard
              index={1}
              label="Collection Rate"
              value={feeStats ? `${collectionRate}%` : "—"}
              icon={<FaChartLine style={{ color: "#534AB7" }} />}
              iconBg="#EEEDFE"
              accentColor="#534AB7"
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
              icon={<FaCalendarCheck style={{ color: "#D85A30" }} />}
              iconBg="#FAECE7"
              accentColor="#D85A30"
              sub={
                attPercent !== null
                  ? `${attPercent}% present today`
                  : "No records yet"
              }
              onClick={() => navigate("/admin/attendance")}
            />
          </div>
        </section>

        {/* ── Section 3: Active Users + Donut ── */}
        <section>
          <SectionLabel>System activity</SectionLabel>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Active Users card */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden relative">
              <div className="absolute top-0 left-0 right-0 h-[3px]" style={{ background: "#1D9E75" }} />
              <div className="p-5 pt-6 flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center relative" style={{ background: "#E1F5EE" }}>
                  <FaUserCheck style={{ color: "#1D9E75" }} />
                  <span className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white animate-pulse" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.14em] leading-none mb-1">
                    Active Users
                  </p>
                  <p className="text-3xl font-black leading-none tracking-tight tabular-nums" style={{ color: "#1e1b4b" }}>
                    {activeUsers ?? "—"}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-1 font-medium">
                    Staff online now
                  </p>
                </div>
              </div>
            </div>

            {/* Attendance donut card */}
            {attPercent !== null && (
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden relative">
                <div className="absolute top-0 left-0 right-0 h-[3px]" style={{ background: "#D85A30" }} />
                <div className="p-5 pt-6 flex items-center gap-4">
                  <Donut pct={attPercent} color="#D85A30" size={64} stroke={7} />
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.14em] leading-none mb-1">
                      Attendance Rate
                    </p>
                    <p className="text-3xl font-black leading-none tracking-tight tabular-nums" style={{ color: "#1e1b4b" }}>
                      {attPercent}%
                    </p>
                    <p className="text-[11px] text-slate-400 mt-1 font-medium">
                      {attStats.present} of {attStats.total} present
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* ── Section 4: Fee Collection Progress ── */}
        {feeStats && (
          <section>
            <SectionLabel>Fee collection progress</SectionLabel>
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              {/* Top accent */}
              <div className="h-[3px]" style={{ background: "linear-gradient(90deg, #7F77DD, #1D9E75, #EF9F27)" }} />

              <div className="p-5 space-y-5">
                {/* Header */}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-slate-800">Overall collection</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {ghs(feeStats.total_paid)} of {ghs(feeStats.total_billed)}
                    </p>
                  </div>
                  <span
                    className="text-sm font-black px-3 py-1.5 rounded-xl"
                    style={{
                      background: `${rateColor(collectionRate)}18`,
                      color: rateColor(collectionRate),
                    }}
                  >
                    {collectionRate}%
                  </span>
                </div>

                <ProgressBar value={collectionRate} color={rateColor(collectionRate)} />

                {/* Term breakdown */}
                {feeStats.term_breakdown?.length > 0 && (
                  <div className="grid grid-cols-3 gap-6 pt-4 border-t border-slate-50">
                    {feeStats.term_breakdown.map((t) => {
                      const pct = t.billed > 0 ? Math.round((t.paid / t.billed) * 100) : 0;
                      const col = rateColor(pct);
                      return (
                        <div key={t.term} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-slate-600">{t.label}</span>
                            <span className="text-[11px] font-bold" style={{ color: col }}>{pct}%</span>
                          </div>
                          <ProgressBar value={pct} color={col} />
                          <div className="flex justify-between text-[10px] text-slate-400 font-medium">
                            <span>{ghs(t.paid)}</span>
                            <span className="text-slate-300">{ghs(t.billed)}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Status pills */}
                <div className="flex flex-wrap gap-2 pt-4 border-t border-slate-50">
                  <StatusPill
                    label={`${feeStats.fully_paid} Fully Paid`}
                    dotColor="#1D9E75"
                    bg="bg-emerald-50"
                    text="text-emerald-700"
                  />
                  <StatusPill
                    label={`${feeStats.partial} Partial`}
                    dotColor="#EF9F27"
                    bg="bg-amber-50"
                    text="text-amber-700"
                  />
                  <StatusPill
                    label={`${feeStats.unpaid} Unpaid`}
                    dotColor="#E24B4A"
                    bg="bg-red-50"
                    text="text-red-600"
                  />
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ── Section 5: Quick Actions ── */}
        <section>
          <SectionLabel>Quick actions</SectionLabel>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <QuickActionCard
              index={0}
              label="Add Student"
              description="New enrollment"
              path="/admin/admissions"
              bgColor="#EEEDFE"
              iconBg="#CECBF6"
              accentColor="#534AB7"
              icon="🎓"
            />
            <QuickActionCard
              index={1}
              label="Enter Results"
              description="Academic records"
              path="/admin/results"
              bgColor="#E6F1FB"
              iconBg="#B5D4F4"
              accentColor="#185FA5"
              icon="📝"
            />
            <QuickActionCard
              index={2}
              label="Mark Attendance"
              description="Today's register"
              path="/admin/attendance"
              bgColor="#FAEEDA"
              iconBg="#FAC775"
              accentColor="#854F0B"
              icon="✅"
            />
            <QuickActionCard
              index={3}
              label="Record Payment"
              description="Fee collection"
              path="/admin/fees"
              bgColor="#E1F5EE"
              iconBg="#9FE1CB"
              accentColor="#0F6E56"
              icon="💳"
            />
          </div>
        </section>

      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fadeIn 0.35s ease both;
          opacity: 0;
        }
      `}</style>
    </div>
  );
};

export default Dashboard;
