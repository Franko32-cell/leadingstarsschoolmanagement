import { useCallback, useEffect, useState } from "react";
import {
  FaUserGraduate,
  FaChalkboardTeacher,
  FaCalendarCheck,
  FaClipboardList,
  FaMoneyBillWave,
  FaHistory,
  FaSync,
  FaExclamationTriangle,
} from "react-icons/fa";
import { getAnalyticsDashboard } from "../../services/analyticsService";
import { getDashboard } from "../../services/dashboardService";

const ghs = (n) =>
  `GHS ${Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 0 })}`;

const rateColor = (pct) =>
  pct === null || pct === undefined
    ? "#94a3b8"
    : pct >= 80
    ? "#10b981"
    : pct >= 50
    ? "#f59e0b"
    : "#ef4444";

const fmtDate = (iso) =>
  iso
    ? new Date(iso).toLocaleString("en-GB", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";

// ── Small building blocks (kept local — this tab has its own visual needs
// distinct from PersonAdminTable's row-based layout) ────────────────────

const Skeleton = ({ className = "" }) => (
  <div className={`animate-pulse bg-gradient-to-br from-slate-100 to-slate-50 rounded-2xl ${className}`} />
);

const SectionCard = ({ title, icon, children }) => (
  <div className="bg-white rounded-3xl border border-slate-100 shadow-lg shadow-slate-200/50 p-6">
    <div className="flex items-center gap-2.5 mb-5">
      <div className="text-slate-400">{icon}</div>
      <h2 className="text-sm font-black text-slate-700 uppercase tracking-wider">{title}</h2>
    </div>
    {children}
  </div>
);

const StatPill = ({ label, value, color }) => (
  <div className="flex-1 min-w-[100px] bg-slate-50 rounded-2xl px-4 py-3 text-center">
    <p className="text-2xl font-black tabular-nums" style={{ color: color || "#0f172a" }}>
      {value}
    </p>
    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide mt-0.5">{label}</p>
  </div>
);

const ProgressBar = ({ value, color }) => (
  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
    <div
      className="h-2 rounded-full transition-all duration-700"
      style={{ width: `${Math.min(value ?? 0, 100)}%`, background: color }}
    />
  </div>
);

const RateRow = ({ label, rate, sub }) => (
  <div className="space-y-1.5">
    <div className="flex items-center justify-between text-sm">
      <span className="font-semibold text-slate-700">{label}</span>
      <span className="font-black" style={{ color: rateColor(rate) }}>
        {rate === null ? "—" : `${rate}%`}
      </span>
    </div>
    <ProgressBar value={rate} color={rateColor(rate)} />
    {sub && <p className="text-xs text-slate-400 font-medium">{sub}</p>}
  </div>
);

const ACTIVITY_ICON_COLOR = {
  login: "#10b981",
  login_failed: "#ef4444",
  payment_processed: "#10b981",
  fee_update: "#f59e0b",
  attendance_update: "#6366f1",
  result_upload: "#8b5cf6",
};

// ── Main component ───────────────────────────────────────────────────────

const ReportsAnalytics = () => {
  const [overview, setOverview] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async (isRefresh = false) => {
    isRefresh ? setRefreshing(true) : setLoading(true);
    setError("");
    try {
      const [dashRes, analyticsRes] = await Promise.allSettled([
        getDashboard(),
        getAnalyticsDashboard(),
      ]);
      if (dashRes.status === "fulfilled") setOverview(dashRes.value);
      if (analyticsRes.status === "fulfilled") setAnalytics(analyticsRes.value);
      if (dashRes.status === "rejected" && analyticsRes.status === "rejected") {
        setError("Failed to load analytics. Please try again.");
      }
    } catch {
      setError("Failed to load analytics. Please try again.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <div className="min-h-screen p-6 space-y-6 bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/30">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-28" />
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-56" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const studentStatus = analytics?.account_status?.students || {};
  const teacherStatus = analytics?.account_status?.teachers || {};

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Reports &amp; Analytics
            </h1>
            <p className="text-sm text-slate-500 font-medium mt-0.5">
              {analytics ? `${analytics.term} · ${analytics.year}` : "School-wide overview"}
            </p>
          </div>
          <button
            onClick={() => load(true)}
            disabled={refreshing}
            className="w-11 h-11 flex items-center justify-center bg-white border border-slate-200 rounded-xl shadow-sm hover:shadow-md transition-all disabled:opacity-50 self-start sm:self-auto"
          >
            <FaSync className={`text-xs text-slate-600 ${refreshing ? "animate-spin" : ""}`} />
          </button>
        </div>

        {error && (
          <div className="flex items-center gap-3 bg-red-50 border border-red-100 text-red-700 rounded-2xl px-5 py-4 text-sm font-semibold">
            <FaExclamationTriangle /> {error}
          </div>
        )}

        {/* Overview counts (from existing DashboardView — not duplicated) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <SectionCard title="Students" icon={<FaUserGraduate />}>
            <p className="text-3xl font-black text-slate-900 mb-3">
              {overview?.total_students ?? "—"}
            </p>
            <div className="flex flex-wrap gap-2">
              <StatPill label="Active" value={studentStatus.active ?? 0} color="#10b981" />
              <StatPill label="Suspended" value={studentStatus.suspended ?? 0} color="#f59e0b" />
              <StatPill label="Archived" value={studentStatus.archived ?? 0} color="#ef4444" />
            </div>
          </SectionCard>

          <SectionCard title="Teachers" icon={<FaChalkboardTeacher />}>
            <p className="text-3xl font-black text-slate-900 mb-3">
              {overview?.total_teachers ?? "—"}
            </p>
            <div className="flex flex-wrap gap-2">
              <StatPill label="Active" value={teacherStatus.active ?? 0} color="#10b981" />
              <StatPill label="Suspended" value={teacherStatus.suspended ?? 0} color="#f59e0b" />
              <StatPill label="Archived" value={teacherStatus.archived ?? 0} color="#ef4444" />
            </div>
          </SectionCard>

          <SectionCard title="Admissions" icon={<FaClipboardList />}>
            <p className="text-3xl font-black text-slate-900 mb-1">
              {overview?.pending_admissions ?? "—"}
            </p>
            <p className="text-xs text-slate-400 font-semibold mb-3">Pending review</p>
            <p className="text-sm font-bold text-emerald-600">
              {overview?.approved_admissions ?? 0} approved
            </p>
          </SectionCard>

          <SectionCard title="Classes &amp; Subjects" icon={<FaClipboardList />}>
            <p className="text-3xl font-black text-slate-900 mb-1">
              {overview?.total_classes ?? "—"}
            </p>
            <p className="text-xs text-slate-400 font-semibold mb-3">Classes</p>
            <p className="text-sm font-bold text-slate-600">
              {overview?.total_subjects ?? 0} subjects
            </p>
          </SectionCard>
        </div>

        {/* Attendance + Academic */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <SectionCard title="Attendance Rate" icon={<FaCalendarCheck />}>
            <div className="mb-4">
              <RateRow
                label="Overall"
                rate={analytics?.attendance?.rate}
                sub={`${analytics?.attendance?.total_records ?? 0} records this term`}
              />
            </div>
            <div className="space-y-3 pt-4 border-t border-slate-100">
              {(analytics?.attendance?.by_class || []).slice(0, 6).map((c) => (
                <RateRow key={c.class_name} label={c.class_name} rate={c.rate} />
              ))}
              {(!analytics?.attendance?.by_class || analytics.attendance.by_class.length === 0) && (
                <p className="text-sm text-slate-400 font-medium">No attendance records for this term yet.</p>
              )}
            </div>
          </SectionCard>

          <SectionCard title="Academic Performance" icon={<FaClipboardList />}>
            <div className="flex gap-3 mb-5">
              <StatPill
                label="Avg Score"
                value={analytics?.academic?.average_score ?? "—"}
                color="#6366f1"
              />
              <StatPill
                label="Pass Rate"
                value={analytics?.academic?.pass_rate != null ? `${analytics.academic.pass_rate}%` : "—"}
                color={rateColor(analytics?.academic?.pass_rate)}
              />
              <StatPill label="Results" value={analytics?.academic?.total_results ?? 0} color="#0f172a" />
            </div>
            <div className="space-y-3 pt-4 border-t border-slate-100">
              {(analytics?.academic?.by_subject || []).slice(0, 6).map((s) => (
                <div key={s.subject_name} className="flex items-center justify-between text-sm">
                  <span className="font-semibold text-slate-700">{s.subject_name}</span>
                  <span className="font-bold text-slate-500">
                    {s.average_score ?? "—"} avg · {s.count} results
                  </span>
                </div>
              ))}
              {(!analytics?.academic?.by_subject || analytics.academic.by_subject.length === 0) && (
                <p className="text-sm text-slate-400 font-medium">No results recorded for this term yet.</p>
              )}
            </div>
          </SectionCard>
        </div>

        {/* Fees + Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <SectionCard title="Fee Collection" icon={<FaMoneyBillWave />}>
            <div className="mb-4">
              <RateRow
                label="Collection rate"
                rate={analytics?.fees?.collection_rate}
                sub={`${ghs(analytics?.fees?.total_paid)} of ${ghs(analytics?.fees?.total_billed)}`}
              />
            </div>
            <div className="flex flex-wrap gap-2 pt-4 border-t border-slate-100">
              <StatPill label="Fully Paid" value={analytics?.fees?.fully_paid ?? 0} color="#10b981" />
              <StatPill label="Partial" value={analytics?.fees?.partial ?? 0} color="#f59e0b" />
              <StatPill label="Unpaid" value={analytics?.fees?.unpaid ?? 0} color="#ef4444" />
            </div>
            <p className="text-xs text-slate-400 font-semibold mt-3">
              {ghs(analytics?.fees?.total_balance)} outstanding
            </p>
          </SectionCard>

          <SectionCard title="Recent Activity" icon={<FaHistory />}>
            <div className="space-y-2.5 max-h-72 overflow-y-auto">
              {(analytics?.recent_activity || []).map((entry) => (
                <div key={entry.id} className="flex items-center gap-3 py-2">
                  <span
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ background: ACTIVITY_ICON_COLOR[entry.action] || "#94a3b8" }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-700 truncate">
                      {entry.resource_repr || entry.action_display}
                    </p>
                    <p className="text-xs text-slate-400">
                      {entry.actor_username || "System"} · {fmtDate(entry.created_at)}
                    </p>
                  </div>
                </div>
              ))}
              {(!analytics?.recent_activity || analytics.recent_activity.length === 0) && (
                <p className="text-sm text-slate-400 font-medium">No recent activity.</p>
              )}
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  );
};

export default ReportsAnalytics;