import { useCallback, useEffect, useState } from "react";
import {
  FaTimes,
  FaChevronLeft,
  FaChevronRight,
  FaExclamationTriangle,
  FaCalendarWeek,
  FaCalendarAlt,
} from "react-icons/fa";
import { getAttendanceDetail } from "../../services/analyticsService";

const rateColor = (pct) =>
  pct === null || pct === undefined
    ? "#94a3b8"
    : pct >= 80
    ? "#10b981"
    : pct >= 50
    ? "#f59e0b"
    : "#ef4444";

const toISO = (d) => d.toISOString().split("T")[0];

const fmtRange = (from, to) => {
  const f = new Date(from);
  const t = new Date(to);
  const opts = { day: "numeric", month: "short" };
  return `${f.toLocaleDateString("en-GB", opts)} – ${t.toLocaleDateString("en-GB", {
    ...opts,
    year: "numeric",
  })}`;
};

const fmtDay = (iso) =>
  new Date(iso).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });

const StatPill = ({ label, value, color }) => (
  <div className="flex-1 bg-slate-50 rounded-2xl px-4 py-3 text-center">
    <p className="text-2xl font-black tabular-nums" style={{ color: color || "#0f172a" }}>
      {value}
    </p>
    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide mt-0.5">{label}</p>
  </div>
);

/**
 * Drill-down modal for a single class's attendance, standardized to a
 * Monday-Sunday week or calendar month (never a rolling window) so
 * "this week" always means the same date range no matter when it's viewed.
 */
const AttendanceDrillDownModal = ({ schoolClassId, className, onClose }) => {
  const [period, setPeriod] = useState("week");
  const [anchor, setAnchor] = useState(new Date());
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(
    async (targetPeriod, targetAnchor) => {
      setLoading(true);
      setError("");
      try {
        const result = await getAttendanceDetail(schoolClassId, {
          period: targetPeriod,
          date: toISO(targetAnchor),
        });
        setData(result);
      } catch {
        setError("Failed to load attendance detail. Please try again.");
      } finally {
        setLoading(false);
      }
    },
    [schoolClassId]
  );

  useEffect(() => {
    load(period, anchor);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period, anchor]);

  const handlePeriodChange = (next) => {
    setPeriod(next);
    setAnchor(new Date()); // reset to "today" when switching granularity
  };

  const goPrev = () => {
    if (period === "week") {
      const d = new Date(anchor);
      d.setDate(d.getDate() - 7);
      setAnchor(d);
    } else {
      const d = new Date(anchor.getFullYear(), anchor.getMonth() - 1, 1);
      setAnchor(d);
    }
  };

  const goNext = () => {
    if (period === "week") {
      const d = new Date(anchor);
      d.setDate(d.getDate() + 7);
      setAnchor(d);
    } else {
      const d = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 1);
      setAnchor(d);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm px-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full max-h-[85vh] overflow-y-auto animate-fade-in-up">
        {/* Header */}
        <div className="sticky top-0 bg-white/95 backdrop-blur-sm border-b border-slate-100 px-6 py-5 flex items-start justify-between z-10">
          <div>
            <p className="text-lg font-black text-slate-900">{className}</p>
            <p className="text-xs text-slate-400 font-semibold mt-0.5">
              {data ? fmtRange(data.date_from, data.date_to) : "Loading…"}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-slate-100 transition-colors flex-shrink-0"
          >
            <FaTimes className="text-slate-400" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Period toggle + navigation */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex gap-1.5 bg-slate-100 rounded-xl p-1">
              <button
                onClick={() => handlePeriodChange("week")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                  period === "week" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500"
                }`}
              >
                <FaCalendarWeek className="text-[10px]" /> Week
              </button>
              <button
                onClick={() => handlePeriodChange("month")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                  period === "month" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500"
                }`}
              >
                <FaCalendarAlt className="text-[10px]" /> Month
              </button>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={goPrev}
                className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
              >
                <FaChevronLeft className="text-xs text-slate-600" />
              </button>
              <button
                onClick={goNext}
                className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
              >
                <FaChevronRight className="text-xs text-slate-600" />
              </button>
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-3 bg-red-50 border border-red-100 text-red-700 rounded-2xl px-5 py-4 text-sm font-semibold">
              <FaExclamationTriangle /> {error}
            </div>
          )}

          {loading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-12 rounded-xl bg-slate-100 animate-pulse" />
              ))}
            </div>
          ) : (
            data && (
              <>
                {/* Summary */}
                <div className="flex gap-3">
                  <StatPill label="Rate" value={data.rate != null ? `${data.rate}%` : "—"} color={rateColor(data.rate)} />
                  <StatPill label="Records" value={data.total_records} color="#6366f1" />
                  <StatPill label="Present/Late" value={data.present_or_late} color="#10b981" />
                </div>

                {/* Daily breakdown */}
                <div className="space-y-2.5">
                  <p className="text-xs font-black text-slate-400 uppercase tracking-wider">
                    Daily breakdown
                  </p>
                  {data.daily.length === 0 ? (
                    <p className="text-sm text-slate-400 font-medium py-4">
                      No attendance records in this {period === "week" ? "week" : "month"}.
                    </p>
                  ) : (
                    data.daily.map((day) => (
                      <div key={day.date} className="bg-slate-50 rounded-xl px-4 py-3">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-sm font-bold text-slate-700">{fmtDay(day.date)}</span>
                          <span className="text-sm font-black" style={{ color: rateColor(day.rate) }}>
                            {day.rate != null ? `${day.rate}%` : "—"}
                          </span>
                        </div>
                        <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden mb-1.5">
                          <div
                            className="h-1.5 rounded-full transition-all duration-500"
                            style={{ width: `${Math.min(day.rate ?? 0, 100)}%`, background: rateColor(day.rate) }}
                          />
                        </div>
                        <p className="text-xs text-slate-400 font-medium">
                          {day.present} present · {day.late} late · {day.absent} absent
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </>
            )
          )}
        </div>
      </div>

      <style>{`
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fade-in-up { animation: fadeInUp 0.25s ease both; }
      `}</style>
    </div>
  );
};

export default AttendanceDrillDownModal;