import { useCallback, useEffect, useState } from "react";
import {
  FaTimes,
  FaChevronLeft,
  FaChevronRight,
  FaExclamationTriangle,
  FaCalendarDay,
  FaCalendarWeek,
  FaCalendarAlt,
  FaTrash,
  FaDownload,
  FaFileCsv,
  FaFilePdf,
} from "react-icons/fa";
import {
  getAttendanceDetail,
  getAttendanceRecords,
  deleteAttendanceRecord,
} from "../../services/analyticsService";

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
  if (from === to) {
    return f.toLocaleDateString("en-GB", { ...opts, year: "numeric", weekday: "long" });
  }
  return `${f.toLocaleDateString("en-GB", opts)} – ${t.toLocaleDateString("en-GB", {
    ...opts,
    year: "numeric",
  })}`;
};

const fmtDay = (iso) =>
  new Date(iso).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });

const STATUS_STYLES = {
  present: { bg: "bg-emerald-50", text: "text-emerald-700", label: "Present" },
  late: { bg: "bg-amber-50", text: "text-amber-700", label: "Late" },
  absent: { bg: "bg-red-50", text: "text-red-600", label: "Absent" },
};

const StatusBadge = ({ status }) => {
  const s = STATUS_STYLES[status] || STATUS_STYLES.absent;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-lg text-[11px] font-bold ${s.bg} ${s.text}`}>
      {s.label}
    </span>
  );
};

const StatPill = ({ label, value, color }) => (
  <div className="flex-1 bg-slate-50 rounded-2xl px-4 py-3 text-center">
    <p className="text-2xl font-black tabular-nums" style={{ color: color || "#0f172a" }}>
      {value}
    </p>
    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide mt-0.5">{label}</p>
  </div>
);

// ── CSV helpers ──────────────────────────────────────────────────────────

const csvEscape = (val) => {
  const s = String(val ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

const rowsToCsv = (headers, rows) =>
  [headers, ...rows].map((row) => row.map(csvEscape).join(",")).join("\r\n");

const downloadBlob = (content, filename, mime) => {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
};

// ── PDF helper (print-to-PDF, no extra dependency) ─────────────────────

const openPrintWindow = (title, subtitle, tableHtml) => {
  const win = window.open("", "_blank", "width=800,height=900");
  if (!win) return false; // popup blocked
  win.document.write(`<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>${title}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: -apple-system, Segoe UI, Roboto, Arial, sans-serif; color: #0f172a; padding: 32px; }
  h1 { font-size: 18px; margin: 0 0 2px; }
  p.subtitle { font-size: 12px; color: #64748b; margin: 0 0 20px; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  th, td { text-align: left; padding: 8px 10px; border-bottom: 1px solid #e2e8f0; }
  th { background: #f8fafc; font-weight: 700; text-transform: uppercase; font-size: 10px; letter-spacing: 0.03em; color: #64748b; }
  tr:last-child td { border-bottom: none; }
  @media print { body { padding: 0; } }
</style>
</head>
<body>
  <h1>${title}</h1>
  <p class="subtitle">${subtitle}</p>
  ${tableHtml}
</body>
</html>`);
  win.document.close();
  win.focus();
  // give the browser a tick to render before invoking print
  setTimeout(() => win.print(), 250);
  return true;
};

/**
 * Drill-down modal for a single class's attendance, standardized to a
 * single day, a Monday-Sunday week, or a calendar month (never a rolling
 * window) so "this week" always means the same date range no matter when
 * it's viewed.
 *
 * The Day view additionally lists every individual student attendance
 * record for that class+date, each with a delete action — for removing a
 * record that was marked wrong (e.g. a student accidentally marked absent).
 * Clicking any day inside the Week/Month breakdown jumps straight into
 * that day's Day view, so there's one consistent path to clean up a
 * mistake regardless of how you got there.
 *
 * An Export control lets the current view (Day records, or Week/Month
 * daily breakdown) be downloaded as CSV or opened as a print-ready PDF.
 */
const AttendanceDrillDownModal = ({ schoolClassId, className, onClose }) => {
  const [period, setPeriod] = useState("week");
  const [anchor, setAnchor] = useState(new Date());
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Day view — individual records
  const [records, setRecords] = useState([]);
  const [recordsLoading, setRecordsLoading] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [recordsError, setRecordsError] = useState("");

  // Export menu
  const [exportOpen, setExportOpen] = useState(false);

  const loadSummary = useCallback(
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

  const loadRecords = useCallback(
    async (targetAnchor) => {
      setRecordsLoading(true);
      setRecordsError("");
      try {
        const result = await getAttendanceRecords(schoolClassId, toISO(targetAnchor));
        setRecords(result);
      } catch {
        setRecordsError("Failed to load attendance records for this day.");
      } finally {
        setRecordsLoading(false);
      }
    },
    [schoolClassId]
  );

  useEffect(() => {
    loadSummary(period, anchor);
    if (period === "day") loadRecords(anchor);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period, anchor]);

  const handlePeriodChange = (next) => {
    setPeriod(next);
    setAnchor(new Date()); // reset to "today" when switching granularity
  };

  const jumpToDay = (isoDate) => {
    setPeriod("day");
    setAnchor(new Date(isoDate));
  };

  const shiftAnchor = (direction) => {
    const d = new Date(anchor);
    if (period === "day") {
      d.setDate(d.getDate() + direction);
      setAnchor(d);
    } else if (period === "week") {
      d.setDate(d.getDate() + direction * 7);
      setAnchor(d);
    } else {
      setAnchor(new Date(anchor.getFullYear(), anchor.getMonth() + direction, 1));
    }
  };

  const handleDelete = async (record) => {
    const label = record.student_name || record.student_full_name || `Record #${record.id}`;
    if (!window.confirm(`Delete this attendance record for ${label}? This cannot be undone.`)) {
      return;
    }
    setDeletingId(record.id);
    setRecordsError("");
    try {
      await deleteAttendanceRecord(record.id);
      setRecords((prev) => prev.filter((r) => r.id !== record.id));
      // The aggregate (rate/counts) is now stale — refresh it too.
      loadSummary("day", anchor);
    } catch {
      setRecordsError("Failed to delete this record. Please try again.");
    } finally {
      setDeletingId(null);
    }
  };

  // ── Export ──────────────────────────────────────────────────────────

  const exportFilenameBase = () => {
    const safeClass = (className || "class").replace(/[^a-z0-9]+/gi, "-").toLowerCase();
    return `attendance-${safeClass}-${period}-${toISO(anchor)}`;
  };

  const buildDayRows = () =>
    records.map((r) => [
      r.student_name || r.student_full_name || `Student #${r.student}`,
      STATUS_STYLES[r.status]?.label || r.status,
    ]);

  const buildPeriodRows = () =>
    (data?.daily || []).map((day) => [
      fmtDay(day.date),
      day.present,
      day.late,
      day.absent,
      day.rate != null ? `${day.rate}%` : "—",
    ]);

  const handleExportCsv = () => {
    if (!data) return;
    let headers, rows;
    if (period === "day") {
      headers = ["Student", "Status"];
      rows = buildDayRows();
    } else {
      headers = ["Date", "Present", "Late", "Absent", "Rate"];
      rows = buildPeriodRows();
    }
    const csv = rowsToCsv(headers, rows);
    downloadBlob(csv, `${exportFilenameBase()}.csv`, "text/csv;charset=utf-8;");
    setExportOpen(false);
  };

  const handleExportPdf = () => {
    if (!data) return;
    const subtitle = `${className} · ${fmtRange(data.date_from, data.date_to)}`;
    let headers, rows;
    if (period === "day") {
      headers = ["Student", "Status"];
      rows = buildDayRows();
    } else {
      headers = ["Date", "Present", "Late", "Absent", "Rate"];
      rows = buildPeriodRows();
    }
    const tableHtml = `
      <table>
        <thead><tr>${headers.map((h) => `<th>${h}</th>`).join("")}</tr></thead>
        <tbody>
          ${
            rows.length
              ? rows
                  .map((row) => `<tr>${row.map((cell) => `<td>${cell}</td>`).join("")}</tr>`)
                  .join("")
              : `<tr><td colspan="${headers.length}" style="color:#94a3b8;">No records</td></tr>`
          }
        </tbody>
      </table>`;
    const opened = openPrintWindow(
      `${className} — Attendance (${period})`,
      subtitle,
      tableHtml
    );
    if (!opened) {
      window.alert("Please allow pop-ups for this site to export as PDF.");
    }
    setExportOpen(false);
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
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {/* Export */}
            <div className="relative">
              <button
                onClick={() => setExportOpen((o) => !o)}
                disabled={!data || loading}
                title="Export current view"
                className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-slate-100 transition-colors disabled:opacity-30"
              >
                <FaDownload className="text-slate-400 text-sm" />
              </button>
              {exportOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setExportOpen(false)} />
                  <div className="absolute right-0 top-11 z-20 bg-white rounded-xl shadow-xl border border-slate-100 py-1.5 w-40 animate-fade-in-up">
                    <button
                      onClick={handleExportCsv}
                      className="w-full flex items-center gap-2.5 px-3.5 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
                    >
                      <FaFileCsv className="text-emerald-500" /> Export CSV
                    </button>
                    <button
                      onClick={handleExportPdf}
                      className="w-full flex items-center gap-2.5 px-3.5 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
                    >
                      <FaFilePdf className="text-red-500" /> Export PDF
                    </button>
                  </div>
                </>
              )}
            </div>
            <button
              onClick={onClose}
              className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-slate-100 transition-colors"
            >
              <FaTimes className="text-slate-400" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-5">
          {/* Period toggle + navigation */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex gap-1 bg-slate-100 rounded-xl p-1">
              <button
                onClick={() => handlePeriodChange("day")}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                  period === "day" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500"
                }`}
              >
                <FaCalendarDay className="text-[10px]" /> Day
              </button>
              <button
                onClick={() => handlePeriodChange("week")}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                  period === "week" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500"
                }`}
              >
                <FaCalendarWeek className="text-[10px]" /> Week
              </button>
              <button
                onClick={() => handlePeriodChange("month")}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                  period === "month" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500"
                }`}
              >
                <FaCalendarAlt className="text-[10px]" /> Month
              </button>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => shiftAnchor(-1)}
                className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
              >
                <FaChevronLeft className="text-xs text-slate-600" />
              </button>
              <button
                onClick={() => shiftAnchor(1)}
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

                {period === "day" ? (
                  /* ── Day view: individual student records, deletable ── */
                  <div className="space-y-2.5">
                    <p className="text-xs font-black text-slate-400 uppercase tracking-wider">
                      Student records
                    </p>

                    {recordsError && (
                      <div className="flex items-center gap-2 bg-red-50 text-red-700 text-xs font-bold rounded-xl px-3.5 py-2.5">
                        <FaExclamationTriangle /> {recordsError}
                      </div>
                    )}

                    {recordsLoading ? (
                      <div className="space-y-2">
                        {[...Array(4)].map((_, i) => (
                          <div key={i} className="h-11 rounded-xl bg-slate-100 animate-pulse" />
                        ))}
                      </div>
                    ) : records.length === 0 ? (
                      <p className="text-sm text-slate-400 font-medium py-4">
                        No attendance records for this day.
                      </p>
                    ) : (
                      records.map((record) => (
                        <div
                          key={record.id}
                          className="flex items-center justify-between gap-3 bg-slate-50 rounded-xl px-4 py-2.5"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-bold text-slate-700 truncate">
                              {record.student_name || record.student_full_name || `Student #${record.student}`}
                            </p>
                          </div>
                          <StatusBadge status={record.status} />
                          <button
                            onClick={() => handleDelete(record)}
                            disabled={deletingId === record.id}
                            title="Delete this record"
                            className="w-8 h-8 flex items-center justify-center rounded-lg text-red-500 hover:bg-red-50 transition-colors disabled:opacity-40 flex-shrink-0"
                          >
                            <FaTrash className="text-xs" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                ) : (
                  /* ── Week/Month view: daily aggregate, click a day to drill in ── */
                  <div className="space-y-2.5">
                    <p className="text-xs font-black text-slate-400 uppercase tracking-wider">
                      Daily breakdown
                    </p>
                    {data.daily.length === 0 ? (
                      <p className="text-sm text-slate-400 font-medium py-4">
                        No attendance records in this {period}.
                      </p>
                    ) : (
                      data.daily.map((day) => (
                        <button
                          key={day.date}
                          onClick={() => jumpToDay(day.date)}
                          className="w-full text-left bg-slate-50 hover:bg-slate-100 rounded-xl px-4 py-3 transition-colors"
                          title="View and manage this day's records"
                        >
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
                        </button>
                      ))
                    )}
                    {data.daily.length > 0 && (
                      <p className="text-xs text-slate-400 font-medium pt-1">
                        Click a day to view and manage individual records.
                      </p>
                    )}
                  </div>
                )}
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