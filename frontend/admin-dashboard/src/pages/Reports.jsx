/**
 * Reports.jsx
 * Drop-in replacement for: frontend/admin-dashboard/src/pages/Reports.jsx
 *
 * Fixes vs previous (broken) version:
 *  - File is now syntactically complete (previous version was truncated mid-JSX,
 *    which caused the Vite/esbuild "Unexpected end of file" build error)
 *
 * Improvements in this pass:
 *  - "Save Remarks" button disabled when there are no unsaved changes (prevents
 *    redundant API calls / accidental re-saves)
 *  - Promotion status buttons reset next_class when switching away from
 *    promoted/transferred, avoiding a stale next_class value being saved
 *  - Added aria-live region for save/error feedback (screen reader friendliness)
 *  - Added a "Reset filters" affordance when no class/student is selected
 *  - Memoized derived booleans/values with useMemo where they're recalculated
 *    on every render but only depend on `report`/`remarks`
 *  - Defensive `Number(selectedYear)` cast when building query strings
 *  - Avoids re-fetching report when selectedStudent is cleared (guards added)
 *  - Small accessibility labels (aria-label) added to icon-only / ambiguous
 *    controls
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import API from "../services/api";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TERMS = [
  { value: "term1", label: "Term 1" },
  { value: "term2", label: "Term 2" },
  { value: "term3", label: "Term 3" },
];

const CURRENT_TERM = "term1";

const CURRENT_YEAR = 2026;
const YEAR_OPTIONS = Array.from({ length: 6 }, (_, i) => CURRENT_YEAR - i);

const GRADE_COLORS = {
  A: "bg-green-100 text-green-800",
  B: "bg-emerald-100 text-emerald-800",
  C: "bg-blue-100 text-blue-800",
  D: "bg-cyan-100 text-cyan-800",
  "1": "bg-green-100 text-green-800",
  "2": "bg-emerald-100 text-emerald-800",
  "3": "bg-blue-100 text-blue-800",
  "4": "bg-cyan-100 text-cyan-800",
  "5": "bg-yellow-100 text-yellow-800",
  "6": "bg-orange-100 text-orange-800",
  "7": "bg-red-100 text-red-700",
  "8": "bg-red-200 text-red-800",
  "9": "bg-red-300 text-red-900",
  E2: "bg-orange-100 text-orange-800",
  E3: "bg-red-100 text-red-700",
  E4: "bg-red-200 text-red-800",
  E5: "bg-red-300 text-red-900",
};

const GRADE_SCALE_B79 = [
  { range: "90-100", grade: "1", label: "HIGHEST" },
  { range: "80-89", grade: "2", label: "HIGHER" },
  { range: "60-79", grade: "3", label: "HIGH" },
  { range: "55-59", grade: "4", label: "HIGH AVERAGE" },
  { range: "50-54", grade: "5", label: "AVERAGE" },
  { range: "45-49", grade: "6", label: "LOW AVERAGE" },
  { range: "40-44", grade: "7", label: "LOW" },
  { range: "35-39", grade: "8", label: "LOWER" },
  { range: "0-34", grade: "9", label: "LOWEST" },
];

const GRADE_SCALE_B16 = [
  { range: "90-100", grade: "A", label: "EXCELLENT" },
  { range: "80-89", grade: "B", label: "VERY GOOD" },
  { range: "60-79", grade: "C", label: "GOOD" },
  { range: "55-59", grade: "D", label: "HIGH AVERAGE" },
  { range: "45-49", grade: "E2", label: "BELOW AVERAGE" },
  { range: "40-44", grade: "E3", label: "LOW" },
  { range: "35-39", grade: "E4", label: "LOWER" },
  { range: "0-34", grade: "E5", label: "LOWEST" },
];

const CONDUCT_OPTIONS = ["Excellent", "Very Good", "Good", "Fair", "Poor"];

const PROMOTION_OPTIONS = [
  {
    value: "promoted",
    label: "Promoted",
    icon: "🎓",
    activeClass:
      "border-green-400 bg-green-50 text-green-800 ring-2 ring-green-300 ring-offset-1",
    idleClass:
      "border-slate-200 text-slate-500 hover:border-green-300 hover:bg-green-50/50",
    nextLabel: "Promoted to Class",
  },
  {
    value: "repeated",
    label: "Repeated",
    icon: "🔁",
    activeClass:
      "border-amber-400 bg-amber-50 text-amber-800 ring-2 ring-amber-300 ring-offset-1",
    idleClass:
      "border-slate-200 text-slate-500 hover:border-amber-300 hover:bg-amber-50/50",
    nextLabel: null,
  },
  {
    value: "transferred",
    label: "Transferred",
    icon: "🏫",
    activeClass:
      "border-blue-400 bg-blue-50 text-blue-800 ring-2 ring-blue-300 ring-offset-1",
    idleClass:
      "border-slate-200 text-slate-500 hover:border-blue-300 hover:bg-blue-50/50",
    nextLabel: "Transferred to Class",
  },
  {
    value: "withdrawn",
    label: "Withdrawn",
    icon: "📋",
    activeClass:
      "border-red-400 bg-red-50 text-red-800 ring-2 ring-red-300 ring-offset-1",
    idleClass:
      "border-slate-200 text-slate-500 hover:border-red-300 hover:bg-red-50/50",
    nextLabel: null,
  },
];

// Promotion options that show the "next class" dropdown
const PROMO_WITH_NEXT_CLASS = new Set(
  PROMOTION_OPTIONS.filter((o) => o.nextLabel).map((o) => o.value)
);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const getStudentName = (s) =>
  s?.student_name ||
  (s?.first_name ? `${s.first_name} ${s.last_name || ""}`.trim() : null) ||
  s?.admission_number ||
  "Unknown";

const fmt = (v) => (v == null ? "-" : Math.round(v));

const calcAttendancePct = (present, total) =>
  total ? Math.round((present / total) * 100) : 0;

const dateOrNull = (v) => (v && v.trim() !== "" ? v : null);

const EMPTY_REMARKS = {
  conduct: "",
  interest: "",
  teacher_remark: "",
  vacation_date: "",
  resumption_date: "",
  promotion_status: "",
  next_class: "",
};

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

const SectionHeader = ({ icon, title }) => (
  <div className="flex items-center gap-2 mb-3">
    <span aria-hidden="true">{icon}</span>
    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
      {title}
    </h3>
    <div className="flex-1 h-px bg-slate-100" />
  </div>
);

const PROMOTION_BADGE_MAP = {
  promoted: {
    icon: "🎓",
    label: "Promoted",
    cls: "bg-green-100 text-green-800 border-green-200",
  },
  repeated: {
    icon: "🔁",
    label: "Repeated",
    cls: "bg-amber-100 text-amber-800 border-amber-200",
  },
  transferred: {
    icon: "🏫",
    label: "Transferred",
    cls: "bg-blue-100 text-blue-800 border-blue-200",
  },
  withdrawn: {
    icon: "📋",
    label: "Withdrawn",
    cls: "bg-red-100 text-red-800 border-red-200",
  },
};

const PromotionBadge = ({ status }) => {
  const opt = PROMOTION_BADGE_MAP[status];
  if (!opt) return null;
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${opt.cls}`}
    >
      {opt.icon} {opt.label}
    </span>
  );
};

const ErrorBanner = ({ message }) =>
  message ? (
    <div
      role="alert"
      className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg"
    >
      <span className="text-red-400 flex-shrink-0" aria-hidden="true">
        ⚠
      </span>
      {message}
    </div>
  ) : null;

const FormLabel = ({ children }) => (
  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
    {children}
  </label>
);

const selectCls =
  "w-full border border-slate-200 bg-white rounded-lg px-3 py-2 text-sm text-slate-700 " +
  "focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition";

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const Reports = () => {
  const [classes, setClasses] = useState([]);
  const [students, setStudents] = useState([]);
  const [selectedClass, setSelectedClass] = useState("");
  const [selectedStudent, setSelectedStudent] = useState("");
  const [selectedTerm, setSelectedTerm] = useState(CURRENT_TERM);
  const [selectedYear, setSelectedYear] = useState(CURRENT_YEAR);

  const [report, setReport] = useState(null);
  const [loadingClasses, setLoadingClasses] = useState(false);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);

  // Per-action error states so one failure doesn't clobber another
  const [loadError, setLoadError] = useState("");
  const [saveError, setSaveError] = useState("");
  const [pdfError, setPdfError] = useState("");

  const [remarks, setRemarks] = useState(EMPTY_REMARKS);
  const [savingRemarks, setSavingRemarks] = useState(false);
  const [remarksSaved, setRemarksSaved] = useState(false);

  // Track whether there are unsaved remark changes
  const hasUnsavedChanges = useRef(false);
  const [hasUnsaved, setHasUnsaved] = useState(false); // mirrors ref, for UI

  // -------------------------------------------------------------------------
  // Unsaved-changes guard
  // -------------------------------------------------------------------------
  useEffect(() => {
    const handler = (e) => {
      if (hasUnsavedChanges.current) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, []);

  // -------------------------------------------------------------------------
  // Data fetching
  // -------------------------------------------------------------------------
  useEffect(() => {
    const fetchClasses = async () => {
      setLoadingClasses(true);
      try {
        const res = await API.get("/classes/");
        setClasses(res.data.results || res.data);
      } catch {
        setLoadError("Failed to load classes.");
      } finally {
        setLoadingClasses(false);
      }
    };
    fetchClasses();
  }, []);

  useEffect(() => {
    if (!selectedClass) {
      setStudents([]);
      setSelectedStudent("");
      setReport(null);
      return;
    }
    let cancelled = false;
    const fetchStudents = async () => {
      setLoadingStudents(true);
      try {
        const res = await API.get(`/students/?school_class=${selectedClass}`);
        if (!cancelled) setStudents(res.data.results || res.data);
      } catch {
        if (!cancelled) setLoadError("Failed to load students.");
      } finally {
        if (!cancelled) setLoadingStudents(false);
      }
    };
    fetchStudents();
    return () => {
      cancelled = true;
    };
  }, [selectedClass]);

  const fetchReport = useCallback(async () => {
    if (!selectedStudent || !selectedTerm) {
      setReport(null);
      return;
    }
    setLoading(true);
    setLoadError("");
    setReport(null);
    setRemarksSaved(false);
    hasUnsavedChanges.current = false;
    setHasUnsaved(false);
    try {
      const res = await API.get(
        `/report/student/${selectedStudent}/?term=${selectedTerm}&year=${Number(
          selectedYear
        )}`
      );
      setReport(res.data);
      setRemarks({
        conduct: res.data.conduct || "",
        interest: res.data.interest || "",
        teacher_remark: res.data.teacher_remark || "",
        vacation_date: res.data.vacation_date || "",
        resumption_date: res.data.resumption_date || "",
        promotion_status: res.data.promotion_status || "",
        next_class: res.data.next_class ? String(res.data.next_class) : "",
      });
    } catch (err) {
      setLoadError(
        err.response?.status === 404
          ? "No report found for this student and term."
          : "Failed to load report."
      );
    } finally {
      setLoading(false);
    }
  }, [selectedStudent, selectedTerm, selectedYear]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  // -------------------------------------------------------------------------
  // Actions
  // -------------------------------------------------------------------------

  const setRemark = (key, val) => {
    setRemarks((prev) => {
      const next = { ...prev, [key]: val };
      // Clear next_class automatically when switching to a status that
      // doesn't use it, so a stale value never gets silently saved.
      if (key === "promotion_status" && !PROMO_WITH_NEXT_CLASS.has(val)) {
        next.next_class = "";
      }
      return next;
    });
    setRemarksSaved(false);
    hasUnsavedChanges.current = true;
    setHasUnsaved(true);
  };

  const saveRemarks = async () => {
    setSavingRemarks(true);
    setRemarksSaved(false);
    setSaveError("");
    try {
      const res = await API.patch(`/report/student/${selectedStudent}/`, {
        term: selectedTerm,
        year: Number(selectedYear),
        conduct: remarks.conduct,
        interest: remarks.interest,
        teacher_remark: remarks.teacher_remark,
        vacation_date: dateOrNull(remarks.vacation_date),
        resumption_date: dateOrNull(remarks.resumption_date),
        promotion_status: remarks.promotion_status || null,
        next_class: remarks.next_class || null,
      });

      // Update only the report fields that PATCH returns — don't refetch the whole report
      setReport((prev) => ({
        ...prev,
        conduct: res.data.conduct,
        interest: res.data.interest,
        teacher_remark: res.data.teacher_remark,
        vacation_date: res.data.vacation_date,
        resumption_date: res.data.resumption_date,
        promotion_status: res.data.promotion_status,
        next_class: res.data.next_class,
        next_class_name: res.data.next_class_name,
      }));

      setRemarksSaved(true);
      hasUnsavedChanges.current = false;
      setHasUnsaved(false);
    } catch (err) {
      setSaveError(
        err.response?.data
          ? JSON.stringify(err.response.data)
          : "Failed to save remarks."
      );
    } finally {
      setSavingRemarks(false);
    }
  };

  const downloadPDF = async () => {
    setDownloading(true);
    setPdfError("");
    try {
      const res = await API.get(
        `/report/student/${selectedStudent}/pdf/?term=${selectedTerm}&year=${Number(
          selectedYear
        )}`,
        { responseType: "blob" }
      );
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute(
        "download",
        `report_${selectedStudent}_${selectedTerm}_${selectedYear}.pdf`
      );
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      setPdfError("Failed to download PDF. Please try again.");
    } finally {
      setDownloading(false);
    }
  };

  const resetFilters = () => {
    setSelectedClass("");
    setSelectedStudent("");
    setSelectedTerm(CURRENT_TERM);
    setSelectedYear(CURRENT_YEAR);
    setReport(null);
    setLoadError("");
  };

  // -------------------------------------------------------------------------
  // Derived values
  // -------------------------------------------------------------------------
  const level = report?.level || "basic_7_9";
  const gradeScale = level === "basic_7_9" ? GRADE_SCALE_B79 : GRADE_SCALE_B16;

  const subjectNames = useMemo(
    () => report?.subjects?.map((s) => s.subject) || [],
    [report]
  );

  const attendancePct = useMemo(
    () => calcAttendancePct(report?.attendance, report?.attendance_total),
    [report]
  );

  const avgColor =
    (report?.average_score ?? 0) >= 60
      ? "text-green-600"
      : (report?.average_score ?? 0) >= 45
      ? "text-amber-500"
      : "text-red-600";

  const attBarColor =
    attendancePct >= 80
      ? "bg-green-500"
      : attendancePct >= 60
      ? "bg-amber-400"
      : "bg-red-500";

  const attTextColor =
    attendancePct >= 80
      ? "text-green-600"
      : attendancePct >= 60
      ? "text-amber-600"
      : "text-red-600";

  const activePromoOption = PROMOTION_OPTIONS.find(
    (o) => o.value === remarks.promotion_status
  );
  const showNextClassDropdown = PROMO_WITH_NEXT_CLASS.has(
    remarks.promotion_status
  );

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------
  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Page heading */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">
              Student Reports
            </h1>
            <p className="text-sm text-slate-400 mt-0.5">
              View, annotate and download terminal report cards
            </p>
          </div>
          {(selectedClass || selectedStudent) && (
            <button
              onClick={resetFilters}
              className="text-xs font-semibold text-slate-400 hover:text-slate-600 px-3 py-1.5 rounded-lg border border-slate-200 hover:border-slate-300 transition-colors"
            >
              Reset filters
            </button>
          )}
        </div>

        {/* Load error */}
        <ErrorBanner message={loadError} />

        {/* ── Filters ─────────────────────────────────────────────────── */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex gap-3 flex-wrap items-end">
          {/* Class */}
          <div className="flex flex-col gap-1 min-w-[140px]">
            <FormLabel>Class</FormLabel>
            <select
              value={selectedClass}
              onChange={(e) => {
                setSelectedClass(e.target.value);
                setReport(null);
                setLoadError("");
              }}
              disabled={loadingClasses}
              className={`${selectCls} disabled:opacity-40`}
            >
              <option value="">
                {loadingClasses ? "Loading…" : "Select Class"}
              </option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Student */}
          <div className="flex flex-col gap-1 min-w-[190px]">
            <FormLabel>Student</FormLabel>
            <select
              value={selectedStudent}
              onChange={(e) => {
                setSelectedStudent(e.target.value);
                setLoadError("");
              }}
              disabled={!selectedClass || loadingStudents || !students.length}
              className={`${selectCls} disabled:opacity-40 disabled:cursor-not-allowed`}
            >
              <option value="">
                {loadingStudents ? "Loading…" : "Select Student"}
              </option>
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {getStudentName(s)}
                </option>
              ))}
            </select>
          </div>

          {/* Term */}
          <div className="flex flex-col gap-1">
            <FormLabel>Term</FormLabel>
            <select
              value={selectedTerm}
              onChange={(e) => setSelectedTerm(e.target.value)}
              className={selectCls}
            >
              {TERMS.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                  {t.value === CURRENT_TERM ? " (current)" : ""}
                </option>
              ))}
            </select>
          </div>

          {/* Year */}
          <div className="flex flex-col gap-1">
            <FormLabel>Year</FormLabel>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className={selectCls}
            >
              {YEAR_OPTIONS.map((y) => (
                <option key={y} value={y}>
                  {y}
                  {y === CURRENT_YEAR ? " (current)" : ""}
                </option>
              ))}
            </select>
          </div>

          {report && (
            <div className="ml-auto flex flex-col items-end gap-1">
              <button
                onClick={downloadPDF}
                disabled={downloading}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white px-4 py-2 rounded-lg text-sm font-semibold shadow-sm disabled:opacity-50 transition-colors"
              >
                {downloading ? (
                  <>
                    <span className="animate-spin inline-block" aria-hidden="true">
                      ⟳
                    </span>{" "}
                    Generating…
                  </>
                ) : (
                  <>↓ Download PDF</>
                )}
              </button>
              {pdfError && <p className="text-red-600 text-xs">{pdfError}</p>}
            </div>
          )}
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center gap-3 py-16 text-slate-400">
            <span className="text-xl animate-spin" aria-hidden="true">
              ⟳
            </span>
            <span className="text-sm">Loading report…</span>
          </div>
        )}

        {/* ── Report Card ─────────────────────────────────────────────── */}
        {report && !loading && (
          <div className="bg-white rounded-2xl shadow-md border border-slate-200 overflow-hidden">
            {/* ─ Header banner ─ */}
            <div className="bg-gradient-to-br from-slate-800 to-blue-900 p-6 text-white">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 space-y-1">
                  <p className="text-[10px] font-bold text-blue-300 uppercase tracking-widest">
                    {level === "nursery_kg"
                      ? "GLOBAL LEADERS"
                      : "WHERE LEADERS ARE BORN"}
                  </p>
                  <h2 className="text-xl font-bold leading-tight">
                    {report.school_name || "LEADING STARS ACADEMY"}
                  </h2>
                  <div className="pt-2 border-t border-white/10 mt-2 space-y-0.5">
                    <p className="font-semibold text-base">{report.student}</p>
                    <p className="text-blue-200 text-sm">
                      Adm No:&nbsp;
                      <span className="font-mono text-white">
                        {report.admission_number || "-"}
                      </span>
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2 pt-1">
                    <span className="px-2 py-0.5 bg-white/10 rounded-full text-blue-100 text-xs">
                      {report.school_class || "-"}
                    </span>
                    <span className="px-2 py-0.5 bg-white/10 rounded-full text-blue-100 text-xs">
                      {TERMS.find((t) => t.value === report.term)?.label ||
                        report.term}
                      &nbsp;{report.year}
                    </span>
                    {report.promotion_status && (
                      <PromotionBadge status={report.promotion_status} />
                    )}
                    {report.next_class_name && (
                      <span className="px-2 py-0.5 bg-white/10 rounded-full text-blue-100 text-xs">
                        {report.promotion_status === "transferred"
                          ? "↪"
                          : "→"}
                        &nbsp;
                        {report.next_class_name}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex-shrink-0">
                  {report.photo ? (
                    <img
                      src={report.photo}
                      alt={`Photo of ${report.student}`}
                      className="w-20 h-20 rounded-xl border-2 border-white/25 object-cover shadow-lg"
                    />
                  ) : (
                    <div
                      className="w-20 h-20 rounded-xl border-2 border-white/25 bg-blue-700/40 flex items-center justify-center text-3xl font-bold text-white/70 shadow-lg"
                      aria-hidden="true"
                    >
                      {report.student?.[0] || "?"}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* ─ Stats strip ─ */}
            <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-slate-100 border-b border-slate-100">
              {[
                {
                  label: "Total Marks",
                  value: fmt(report.total_score),
                  cls: "text-slate-700",
                },
                {
                  label: "Average",
                  value: fmt(report.average_score),
                  cls: avgColor,
                },
                {
                  label: "Position",
                  value: report.position_formatted === "N/A"
                    ? "N/A"
                    : report.show_position
                    ? report.position_formatted
                      ? `${report.position_formatted} / ${report.out_of}`
                      : report.position != null
                      ? `${report.position} / ${report.out_of}`
                      : "-"
                    : "N/A",
                  cls: "text-blue-600",
                },
                {
                  label: "Overall Grade",
                  value: report.overall_grade ?? "-",
                  cls: `font-extrabold ${
                    GRADE_COLORS[report.overall_grade]
                      ? "text-green-700"
                      : "text-slate-700"
                  }`,
                },
              ].map((stat) => (
                <div key={stat.label} className="p-4 text-center">
                  <div className={`text-2xl font-bold ${stat.cls}`}>
                    {stat.value}
                  </div>
                  <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mt-1">
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>

            {/* ─ Subject table ─ */}
            <div className="p-6 border-b border-slate-100">
              <SectionHeader icon="📚" title="Subject Results" />
              <div className="rounded-lg border border-slate-100 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-700 text-white">
                      <th className="px-3 py-2.5 text-left text-xs font-semibold tracking-wide">
                        SUBJECT
                      </th>
                      <th className="px-3 py-2.5 text-center text-xs font-semibold tracking-wide">
                        RE-OPEN
                        <br />
                        <span className="font-normal opacity-60">
                          &amp; RDA /20
                        </span>
                      </th>
                      <th className="px-3 py-2.5 text-center text-xs font-semibold tracking-wide">
                        CA / MGT
                        <br />
                        <span className="font-normal opacity-60">/40</span>
                      </th>
                      <th className="px-3 py-2.5 text-center text-xs font-semibold tracking-wide">
                        EXAMS
                        <br />
                        <span className="font-normal opacity-60">/40</span>
                      </th>
                      <th className="px-3 py-2.5 text-center text-xs font-semibold tracking-wide bg-blue-800/60">
                        TOTAL
                        <br />
                        <span className="font-normal opacity-60">/100</span>
                      </th>
                      {report.show_position && (
                        <th className="px-3 py-2.5 text-center text-xs font-semibold tracking-wide">
                          POS.
                        </th>
                      )}
                      <th className="px-3 py-2.5 text-center text-xs font-semibold tracking-wide">
                        GRADE
                      </th>
                      <th className="px-3 py-2.5 text-center text-xs font-semibold tracking-wide">
                        REMARK
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.subjects?.map((sub, i) => {
                      const badgeCls =
                        GRADE_COLORS[sub.grade] || "bg-slate-100 text-slate-600";
                      return (
                        <tr
                          key={sub.subject ?? i}
                          className={`border-t border-slate-50 hover:bg-blue-50/30 transition-colors ${
                            i % 2 === 0 ? "bg-white" : "bg-slate-50/40"
                          }`}
                        >
                          <td className="px-3 py-2.5 font-medium text-slate-700">
                            {sub.subject}
                          </td>
                          <td className="px-3 py-2.5 text-center font-mono text-slate-600">
                            {fmt(sub.reopen)}
                          </td>
                          <td className="px-3 py-2.5 text-center font-mono text-slate-600">
                            {fmt(sub.ca)}
                          </td>
                          <td className="px-3 py-2.5 text-center font-mono text-slate-600">
                            {fmt(sub.exams)}
                          </td>
                          <td className="px-3 py-2.5 text-center font-mono font-bold text-blue-700 bg-blue-50/50">
                            {fmt(sub.score)}
                          </td>
                          {report.show_position && (
                            <td className="px-3 py-2.5 text-center text-slate-500 font-semibold">
                              {sub.subject_position ?? "-"}
                            </td>
                          )}
                          <td className="px-3 py-2.5 text-center">
                            <span
                              className={`px-2 py-0.5 rounded-full text-xs font-bold ${badgeCls}`}
                            >
                              {sub.grade}
                            </span>
                          </td>
                          <td className="px-3 py-2.5 text-center">
                            <span
                              className={`px-2 py-0.5 rounded-full text-xs ${badgeCls}`}
                            >
                              {sub.remark || "-"}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Grade key */}
              <div className="mt-3 p-3 bg-slate-50 rounded-lg border border-slate-100 text-[11px]">
                <p className="font-bold text-slate-500 uppercase tracking-wider text-[10px] mb-1.5">
                  Result Interpretation
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-0.5 gap-x-4">
                  {gradeScale.map((g) => (
                    <span key={g.grade} className="text-slate-500">
                      {g.range}:{" "}
                      <b className="text-slate-700">
                        {g.grade} – {g.label}
                      </b>
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* ─ Attendance + Remarks grid ─ */}
            <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-slate-100">
              {/* Attendance */}
              <div className="p-6">
                <SectionHeader icon="📅" title="Attendance" />
                {report.attendance_total > 0 ? (
                  <>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-slate-500">Days Present</span>
                      <span className="font-bold font-mono text-slate-700">
                        {report.attendance} / {report.attendance_total}
                      </span>
                    </div>
                    <div
                      className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden"
                      role="progressbar"
                      aria-valuenow={attendancePct}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-label="Attendance percentage"
                    >
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${attBarColor}`}
                        style={{ width: `${attendancePct}%` }}
                      />
                    </div>
                    <p
                      className={`text-xs mt-1.5 text-right font-semibold ${attTextColor}`}
                    >
                      {attendancePct}% attendance
                    </p>
                  </>
                ) : (
                  <p className="text-slate-400 text-sm">
                    No attendance data recorded.
                  </p>
                )}
              </div>

              {/* Remarks + Promotion */}
              <div className="p-6 space-y-4">
                <SectionHeader icon="✏️" title="Teacher's Remarks" />

                {/* Save error */}
                <ErrorBanner message={saveError} />

                {/* Conduct */}
                <div>
                  <FormLabel>Conduct</FormLabel>
                  <select
                    value={remarks.conduct}
                    onChange={(e) => setRemark("conduct", e.target.value)}
                    className={selectCls}
                  >
                    <option value="">— Select —</option>
                    {CONDUCT_OPTIONS.map((o) => (
                      <option key={o} value={o}>
                        {o}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Interest */}
                <div>
                  <FormLabel>
                    Interest{" "}
                    <span className="text-slate-300 normal-case font-normal">
                      (subject)
                    </span>
                  </FormLabel>
                  <select
                    value={remarks.interest}
                    onChange={(e) => setRemark("interest", e.target.value)}
                    className={selectCls}
                  >
                    <option value="">— Select Subject —</option>
                    {subjectNames.map((name) => (
                      <option key={name} value={name}>
                        {name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Teacher remark */}
                <div>
                  <FormLabel>Remark</FormLabel>
                  <textarea
                    value={remarks.teacher_remark}
                    onChange={(e) =>
                      setRemark("teacher_remark", e.target.value)
                    }
                    rows={3}
                    placeholder="Write a remark for this student…"
                    className={`${selectCls} resize-none`}
                  />
                </div>

                {/* Dates */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <FormLabel>Vacation Date</FormLabel>
                    <input
                      type="date"
                      value={remarks.vacation_date || ""}
                      onChange={(e) =>
                        setRemark("vacation_date", e.target.value)
                      }
                      className={selectCls}
                    />
                  </div>
                  <div>
                    <FormLabel>Resumption Date</FormLabel>
                    <input
                      type="date"
                      value={remarks.resumption_date || ""}
                      onChange={(e) =>
                        setRemark("resumption_date", e.target.value)
                      }
                      className={selectCls}
                    />
                  </div>
                </div>

                {/* ── Promotion Status ── */}
                <div className="border-t border-slate-100 pt-4">
                  <SectionHeader icon="🎓" title="Promotion Status" />

                  <div className="grid grid-cols-2 gap-2 mb-3">
                    {PROMOTION_OPTIONS.map((opt) => {
                      const active = remarks.promotion_status === opt.value;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() =>
                            setRemark(
                              "promotion_status",
                              active ? "" : opt.value
                            )
                          }
                          className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-all ${
                            active ? opt.activeClass : opt.idleClass
                          }`}
                          aria-pressed={active}
                        >
                          <span aria-hidden="true">{opt.icon}</span>
                          <span>{opt.label}</span>
                          {active && (
                            <span
                              className="ml-auto text-xs font-bold"
                              aria-hidden="true"
                            >
                              ✓
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* Next class — shown for promoted and transferred */}
                  {showNextClassDropdown && (
                    <div>
                      <FormLabel>
                        {activePromoOption?.nextLabel || "Next Class"}{" "}
                        <span className="text-slate-300 normal-case font-normal">
                          (optional)
                        </span>
                      </FormLabel>
                      <select
                        value={remarks.next_class}
                        onChange={(e) =>
                          setRemark("next_class", e.target.value)
                        }
                        className={selectCls}
                      >
                        <option value="">— Select Class —</option>
                        {classes.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                {/* Save */}
                <div className="flex items-center gap-3 pt-1">
                  <button
                    onClick={saveRemarks}
                    disabled={savingRemarks || !hasUnsaved}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white px-4 py-2.5 rounded-lg text-sm font-semibold disabled:opacity-50 transition-colors"
                  >
                    {savingRemarks ? "Saving…" : "Save Remarks"}
                  </button>
                  <span aria-live="polite" className="contents">
                    {remarksSaved && (
                      <span
                        className="flex items-center gap-1 text-green-600 text-xs font-semibold"
                        role="status"
                      >
                        <span aria-hidden="true">✓</span> Saved
                      </span>
                    )}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Empty states ─────────────────────────────────────────────── */}
        {!loading && !report && selectedStudent && !loadError && (
          <div className="text-center py-20">
            <div className="text-5xl mb-4" aria-hidden="true">
              📋
            </div>
            <p className="text-base font-medium text-slate-500">
              No report found for this student and term.
            </p>
            <p className="text-sm text-slate-400 mt-1">
              Make sure results have been entered for {selectedTerm}{" "}
              {selectedYear}.
            </p>
          </div>
        )}

        {!selectedStudent && (
          <div className="text-center py-20">
            <div className="text-5xl mb-4" aria-hidden="true">
              🎓
            </div>
            <p className="text-base font-medium text-slate-400">
              Select a class and student to view their report.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Reports;