/**
 * PreschoolAssessment.jsx
 * frontend/admin-dashboard/src/pages/PreschoolAssessment.jsx
 *
 * Termly rubric report for pre-school classes (e.g. Little Angels).
 * Replaces the subject-score report entirely — for each category
 * (Crying, Play, Eating, ...) the teacher ticks one of 3 descriptive
 * statements and, for whichever one applies, can enter a percentage
 * score (as seen on the sample report: "A= 80%").
 */

import { useCallback, useEffect, useState } from "react";
import API from "../services/api";

const TERMS = [
  { value: "term1", label: "Term 1" },
  { value: "term2", label: "Term 2" },
  { value: "term3", label: "Term 3" },
];

const CURRENT_TERM = "term1";
const CURRENT_YEAR = 2026;
const YEAR_OPTIONS = Array.from({ length: 6 }, (_, i) => CURRENT_YEAR - i);

const PROMOTION_OPTIONS = [
  { value: "promoted", label: "Promoted", icon: "🎓" },
  { value: "repeated", label: "Repeated", icon: "🔁" },
  { value: "transferred", label: "Transferred", icon: "🏫" },
  { value: "withdrawn", label: "Withdrawn", icon: "📋" },
];

const getStudentName = (s) =>
  s?.student_name ||
  (s?.first_name ? `${s.first_name} ${s.last_name || ""}`.trim() : null) ||
  s?.admission_number ||
  "Unknown";

const selectCls =
  "w-full border border-slate-200 bg-white rounded-lg px-3 py-2 text-sm text-slate-700 " +
  "focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition";

const letterFor = (score) => {
  if (score === "" || score == null || isNaN(score)) return null;
  const n = parseFloat(score);
  if (n >= 80) return "A";
  if (n >= 70) return "B";
  if (n >= 60) return "C";
  return "D";
};

// One row of the rubric — 3 tickable statements, score input for whichever
// level is currently selected.
const CategoryRow = ({ category, onChange }) => {
  const { level, score } = category;

  return (
    <div className="border-b border-slate-100 py-4 last:border-b-0">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-sm font-semibold text-slate-700">{category.label}</h4>
        {level && (
          <span className="text-xs text-slate-400">
            Level {level}
            {score != null && score !== "" ? ` · ${letterFor(score)}= ${score}%` : ""}
          </span>
        )}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        {category.statements.map((statement, idx) => {
          const lvl = idx + 1;
          const active = level === lvl;
          return (
            <button
              key={lvl}
              type="button"
              onClick={() => onChange(category.key, { level: active ? null : lvl, score })}
              aria-pressed={active}
              className={`text-left text-xs px-3 py-2 rounded-lg border transition-all ${
                active
                  ? "border-blue-400 bg-blue-50 text-blue-800 ring-2 ring-blue-200"
                  : "border-slate-200 text-slate-500 hover:border-blue-300 hover:bg-blue-50/40"
              }`}
            >
              {statement}
            </button>
          );
        })}
      </div>
      {level && (
        <div className="mt-2 flex items-center gap-2">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            Score %
          </label>
          <input
            type="number"
            min="0"
            max="100"
            step="1"
            value={score ?? ""}
            onChange={(e) => onChange(category.key, { level, score: e.target.value })}
            className="w-20 border border-slate-200 rounded-md px-2 py-1 text-sm font-mono text-center focus:outline-none focus:ring-2 focus:ring-blue-400"
            placeholder="-"
          />
          {letterFor(score) && (
            <span className="text-xs font-bold text-blue-700">{letterFor(score)}</span>
          )}
        </div>
      )}
    </div>
  );
};

const PreschoolAssessment = () => {
  const [classes, setClasses] = useState([]);
  const [students, setStudents] = useState([]);
  const [selectedClass, setSelectedClass] = useState("");
  const [selectedStudent, setSelectedStudent] = useState("");
  const [selectedTerm, setSelectedTerm] = useState(CURRENT_TERM);
  const [selectedYear, setSelectedYear] = useState(CURRENT_YEAR);

  const [data, setData] = useState(null); // full API payload
  const [categories, setCategories] = useState([]); // editable copy
  const [meta, setMeta] = useState({
    conduct: "",
    interest: "",
    attitude: "",
    teacher_performance: "",
    remark: "",
    attendance: 0,
    attendance_total: 1,
    promotion_status: "",
    next_class: "",
  });

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    API.get("/classes/")
      .then((r) => setClasses(r.data.results || r.data))
      .catch(() => setMessage({ type: "error", text: "Failed to load classes." }));
  }, []);

  useEffect(() => {
    if (!selectedClass) {
      setStudents([]);
      setSelectedStudent("");
      return;
    }
    API.get(`/students/?school_class=${selectedClass}`)
      .then((r) => setStudents(r.data.results || r.data))
      .catch(() => setMessage({ type: "error", text: "Failed to load students." }));
  }, [selectedClass]);

  const fetchAssessment = useCallback(async () => {
    if (!selectedStudent || !selectedTerm) {
      setData(null);
      return;
    }
    setLoading(true);
    setMessage(null);
    try {
      const res = await API.get(
        `/preschool-assessment/student/${selectedStudent}/?term=${selectedTerm}&year=${selectedYear}`
      );
      setData(res.data);
      setCategories(res.data.categories);
      setMeta({
        conduct: res.data.conduct || "",
        interest: res.data.interest || "",
        attitude: res.data.attitude || "",
        teacher_performance: res.data.teacher_performance || "",
        remark: res.data.remark || "",
        attendance: res.data.attendance || 0,
        attendance_total: res.data.attendance_total || 1,
        promotion_status: res.data.promotion_status || "",
        next_class: res.data.next_class ? String(res.data.next_class) : "",
      });
    } catch {
      setMessage({ type: "error", text: "Failed to load assessment." });
    } finally {
      setLoading(false);
    }
  }, [selectedStudent, selectedTerm, selectedYear]);

  useEffect(() => {
    fetchAssessment();
  }, [fetchAssessment]);

  const updateCategory = (key, val) => {
    setCategories((prev) =>
      prev.map((c) => (c.key === key ? { ...c, level: val.level, score: val.score } : c))
    );
  };

  const save = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const ratings = {};
      categories.forEach((c) => {
        ratings[c.key] = { level: c.level ?? null, score: c.score === "" ? null : c.score };
      });

      await API.patch(`/preschool-assessment/student/${selectedStudent}/`, {
        term: selectedTerm,
        year: selectedYear,
        ratings,
        ...meta,
        next_class: meta.next_class || null,
        promotion_status: meta.promotion_status || null,
      });

      setMessage({ type: "success", text: "Saved." });
    } catch {
      setMessage({ type: "error", text: "Failed to save assessment." });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Pre-School Assessment</h1>
          <p className="text-sm text-slate-400 mt-0.5">
            Little Angels & other pre-school classes — tick a statement per category, add a score.
          </p>
        </div>

        {message && (
          <div
            role="status"
            className={`text-sm rounded-lg px-3 py-2 border ${
              message.type === "error"
                ? "bg-red-50 border-red-200 text-red-700"
                : "bg-green-50 border-green-200 text-green-700"
            }`}
          >
            {message.text}
          </div>
        )}

        {/* Filters */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex gap-3 flex-wrap items-end">
          <div className="flex flex-col gap-1 min-w-[160px]">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Class</label>
            <select value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)} className={selectCls}>
              <option value="">Select Class</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1 min-w-[180px]">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Student</label>
            <select
              value={selectedStudent}
              onChange={(e) => setSelectedStudent(e.target.value)}
              disabled={!selectedClass || !students.length}
              className={`${selectCls} disabled:opacity-40`}
            >
              <option value="">Select Student</option>
              {students.map((s) => (
                <option key={s.id} value={s.id}>{getStudentName(s)}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Term</label>
            <select value={selectedTerm} onChange={(e) => setSelectedTerm(e.target.value)} className={selectCls}>
              {TERMS.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Year</label>
            <select value={selectedYear} onChange={(e) => setSelectedYear(Number(e.target.value))} className={selectCls}>
              {YEAR_OPTIONS.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        </div>

        {!selectedStudent && (
          <div className="text-center py-16 text-slate-400">
            <div className="text-5xl mb-3" aria-hidden="true">🧸</div>
            Select a class and student to begin.
          </div>
        )}

        {loading && (
          <div className="flex items-center gap-2 text-slate-400 text-sm py-4">
            <span className="animate-spin" aria-hidden="true">⟳</span> Loading…
          </div>
        )}

        {data && !loading && (
          <div className="bg-white rounded-2xl shadow-md border border-slate-200 overflow-hidden">
            <div className="bg-gradient-to-br from-slate-800 to-blue-900 p-6 text-white">
              <p className="text-[10px] font-bold text-blue-300 uppercase tracking-widest">
                {data.school_name}
              </p>
              <h2 className="text-lg font-semibold mt-1">{data.student}</h2>
              <p className="text-blue-200 text-sm">{data.school_class}</p>
            </div>

            <div className="p-6">
              {categories.map((cat) => (
                <CategoryRow key={cat.key} category={cat} onChange={updateCategory} />
              ))}
            </div>

            <div className="p-6 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Conduct</label>
                <input
                  className={selectCls}
                  value={meta.conduct}
                  onChange={(e) => setMeta((p) => ({ ...p, conduct: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Interest</label>
                <input
                  className={selectCls}
                  value={meta.interest}
                  onChange={(e) => setMeta((p) => ({ ...p, interest: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Attitude</label>
                <input
                  className={selectCls}
                  value={meta.attitude}
                  onChange={(e) => setMeta((p) => ({ ...p, attitude: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Class Teacher Remark</label>
                <input
                  className={selectCls}
                  value={meta.teacher_performance}
                  onChange={(e) => setMeta((p) => ({ ...p, teacher_performance: e.target.value }))}
                />
              </div>
              <div className="sm:col-span-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Remark</label>
                <textarea
                  className={`${selectCls} resize-none`}
                  rows={2}
                  value={meta.remark}
                  onChange={(e) => setMeta((p) => ({ ...p, remark: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Attendance (present / total)
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    min="0"
                    className={selectCls}
                    value={meta.attendance}
                    onChange={(e) => setMeta((p) => ({ ...p, attendance: e.target.value }))}
                  />
                  <input
                    type="number"
                    min="1"
                    className={selectCls}
                    value={meta.attendance_total}
                    onChange={(e) => setMeta((p) => ({ ...p, attendance_total: e.target.value }))}
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Promotion Status</label>
                <div className="grid grid-cols-2 gap-2">
                  {PROMOTION_OPTIONS.map((opt) => {
                    const active = meta.promotion_status === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() =>
                          setMeta((p) => ({
                            ...p,
                            promotion_status: active ? "" : opt.value,
                            next_class: active ? "" : p.next_class,
                          }))
                        }
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-all ${
                          active
                            ? "border-blue-400 bg-blue-50 text-blue-800 ring-2 ring-blue-200"
                            : "border-slate-200 text-slate-500 hover:border-blue-300"
                        }`}
                      >
                        <span aria-hidden="true">{opt.icon}</span>
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {(meta.promotion_status === "promoted" || meta.promotion_status === "transferred") && (
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Next Class
                  </label>
                  <select
                    value={meta.next_class}
                    onChange={(e) => setMeta((p) => ({ ...p, next_class: e.target.value }))}
                    className={selectCls}
                  >
                    <option value="">— Select Class —</option>
                    {classes.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-slate-100 flex justify-end">
              <button
                onClick={save}
                disabled={saving}
                className="bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white px-5 py-2.5 rounded-lg text-sm font-semibold disabled:opacity-50 transition-colors"
              >
                {saving ? "Saving…" : "Save Assessment"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PreschoolAssessment;