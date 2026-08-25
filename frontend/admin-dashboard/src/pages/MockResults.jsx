/**
 * MockResults.jsx
 * frontend/admin-dashboard/src/pages/MockResults.jsx
 *
 * Basic 9 BECE-style mock exam score entry. Separate from Results.jsx
 * (term results) because mocks use a single raw /100 score per subject
 * (no reopen/ca/exams breakdown) and BECE grading (1-9, lower=better,
 * different cut points than the in-term report — see grades.py).
 *
 * Flow: pick Class -> Mock -> Year, then enter a raw score per subject
 * per student. Each (student, subject) cell auto-shows the BECE grade as
 * you type. "Save Changes" bulk-saves only the cells that were touched.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import API from "../services/api";

const MOCKS = [1, 2, 3, 4, 5, 6].map((n) => ({
  value: `mock${n}`,
  label: `Mock ${n}`,
}));

const CURRENT_YEAR = 2026;
const YEAR_OPTIONS = Array.from({ length: 6 }, (_, i) => CURRENT_YEAR - i);

// BECE-style thresholds — mirrors grades.py:GRADE_THRESHOLDS_MOCK.
// NOTE: intentionally different from the in-term B79 scale (90-100 = "1").
const MOCK_THRESHOLDS = [
  [74, "1", "HIGHEST"],
  [65, "2", "HIGHER"],
  [60, "3", "HIGH"],
  [55, "4", "HIGH AVERAGE"],
  [50, "5", "AVERAGE"],
  [45, "6", "BELOW AVERAGE"],
  [40, "7", "LOW"],
  [35, "8", "LOWER"],
  [0, "9", "LOWEST"],
];

const gradeFor = (score) => {
  if (score === "" || score == null || isNaN(score)) return null;
  const n = parseFloat(score);
  for (const [min, grade, remark] of MOCK_THRESHOLDS) {
    if (n >= min) return { grade, remark };
  }
  return { grade: "9", remark: "LOWEST" };
};

const GRADE_COLOR = {
  1: "text-green-700 bg-green-100",
  2: "text-emerald-700 bg-emerald-100",
  3: "text-blue-700 bg-blue-100",
  4: "text-cyan-700 bg-cyan-100",
  5: "text-yellow-700 bg-yellow-100",
  6: "text-orange-700 bg-orange-100",
  7: "text-red-700 bg-red-100",
  8: "text-red-800 bg-red-200",
  9: "text-red-900 bg-red-300",
};

const getStudentName = (s) =>
  s?.student_name ||
  (s?.first_name ? `${s.first_name} ${s.last_name || ""}`.trim() : null) ||
  s?.admission_number ||
  "Unknown";

// Compute "best six" raw total + aggregate for one student's row of scores
// across the subjects currently loaded. Mirrors grades.py:compute_mock_aggregate.
const computeAggregate = (scoresBySubject) => {
  const graded = Object.values(scoresBySubject)
    .filter((v) => v.score !== "" && v.score != null && !isNaN(v.score))
    .map((v) => ({ score: parseFloat(v.score), grade: gradeFor(v.score) }))
    .sort((a, b) => b.score - a.score);
  const bestSix = graded.slice(0, 6);
  return {
    rawTotal: Math.round(bestSix.reduce((s, r) => s + r.score, 0) * 10) / 10,
    aggregate: bestSix.reduce((s, r) => s + parseInt(r.grade.grade, 10), 0),
    count: bestSix.length,
  };
};

const selectCls =
  "w-full border border-slate-200 bg-white rounded-lg px-3 py-2 text-sm text-slate-700 " +
  "focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition";

const MockResults = () => {
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [students, setStudents] = useState([]);

  const [selectedClass, setSelectedClass] = useState("");
  const [selectedMock, setSelectedMock] = useState(MOCKS[0].value);
  const [selectedYear, setSelectedYear] = useState(String(CURRENT_YEAR));

  // scores: { [studentId]: { [subjectId]: { score, saved, id } } }
  const [scores, setScores] = useState({});
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [loadingScores, setLoadingScores] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    API.get("/classes/")
      .then((r) => setClasses(r.data.results || r.data))
      .catch(() => setMessage({ type: "error", text: "Failed to load classes." }));
    API.get("/subjects/")
      .then((r) => setSubjects(r.data.results || r.data))
      .catch(() => setMessage({ type: "error", text: "Failed to load subjects." }));
  }, []);

  useEffect(() => {
    if (!selectedClass) {
      setStudents([]);
      return;
    }
    setLoadingStudents(true);
    API.get(`/students/?school_class=${selectedClass}`)
      .then((r) => setStudents(r.data.results || r.data))
      .catch(() => setMessage({ type: "error", text: "Failed to load students." }))
      .finally(() => setLoadingStudents(false));
  }, [selectedClass]);

  const loadScores = useCallback(async () => {
    if (!selectedClass || !selectedMock || !students.length) return;
    setLoadingScores(true);
    try {
      const res = await API.get(
        `/mock-results/?school_class=${selectedClass}&mock=${selectedMock}&year=${selectedYear}`
      );
      const records = res.data.results || res.data;
      const next = {};
      records.forEach((r) => {
        next[r.student] = next[r.student] || {};
        next[r.student][r.subject] = { score: r.score, saved: r.score, id: r.id };
      });
      setScores(next);
    } catch {
      setMessage({ type: "error", text: "Failed to load existing scores." });
    } finally {
      setLoadingScores(false);
    }
  }, [selectedClass, selectedMock, selectedYear, students.length]);

  useEffect(() => {
    setScores({});
  }, [selectedClass, selectedMock, selectedYear]);

  useEffect(() => {
    loadScores();
  }, [loadScores]);

  const setScore = (studentId, subjectId, value) => {
    setScores((prev) => ({
      ...prev,
      [studentId]: {
        ...(prev[studentId] || {}),
        [subjectId]: {
          ...((prev[studentId] || {})[subjectId] || {}),
          score: value,
        },
      },
    }));
  };

  const dirtyCount = useMemo(() => {
    let n = 0;
    Object.values(scores).forEach((subjMap) =>
      Object.values(subjMap).forEach((cell) => {
        if (String(cell.score ?? "") !== String(cell.saved ?? "")) n += 1;
      })
    );
    return n;
  }, [scores]);

  const saveAll = async () => {
    const classId = parseInt(selectedClass, 10);
    const yearInt = parseInt(selectedYear, 10);
    const records = [];

    Object.entries(scores).forEach(([studentId, subjMap]) => {
      Object.entries(subjMap).forEach(([subjectId, cell]) => {
        if (cell.score === "" || cell.score == null) return;
        if (String(cell.score) === String(cell.saved ?? "")) return; // unchanged
        records.push({
          student: parseInt(studentId, 10),
          subject: parseInt(subjectId, 10),
          school_class: classId,
          mock: selectedMock,
          year: yearInt,
          score: parseFloat(cell.score),
        });
      });
    });

    if (!records.length) {
      setMessage({ type: "info", text: "No changes to save." });
      return;
    }

    setSaving(true);
    setMessage(null);
    try {
      const res = await API.post("/mock-results/bulk-save/", records);
      const errCount = res.data.errors?.length || 0;
      setMessage(
        errCount === 0
          ? { type: "success", text: `Saved ${res.data.saved} score(s).` }
          : { type: "info", text: `Saved ${res.data.saved} with ${errCount} error(s).` }
      );
      await loadScores();
    } catch {
      setMessage({ type: "error", text: "Failed to save scores." });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Mock Results</h1>
          <p className="text-sm text-slate-400 mt-0.5">
            Basic 9 BECE-style mock exam scores — pick a mock, enter raw scores per subject.
          </p>
        </div>

        {message && (
          <div
            role="status"
            className={`text-sm rounded-lg px-3 py-2 border ${
              message.type === "error"
                ? "bg-red-50 border-red-200 text-red-700"
                : message.type === "success"
                ? "bg-green-50 border-green-200 text-green-700"
                : "bg-blue-50 border-blue-200 text-blue-700"
            }`}
          >
            {message.text}
          </div>
        )}

        {/* Filters */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex gap-3 flex-wrap items-end">
          <div className="flex flex-col gap-1 min-w-[160px]">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Class
            </label>
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className={selectCls}
            >
              <option value="">Select Class</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Mock
            </label>
            <select
              value={selectedMock}
              onChange={(e) => setSelectedMock(e.target.value)}
              className={selectCls}
            >
              {MOCKS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Year
            </label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className={selectCls}
            >
              {YEAR_OPTIONS.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>

          <div className="ml-auto">
            <button
              onClick={saveAll}
              disabled={saving || dirtyCount === 0}
              className="bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white px-5 py-2.5 rounded-lg text-sm font-semibold disabled:opacity-50 transition-colors"
            >
              {saving ? "Saving…" : `Save ${dirtyCount > 0 ? `${dirtyCount} Change${dirtyCount !== 1 ? "s" : ""}` : "Changes"}`}
            </button>
          </div>
        </div>

        {!selectedClass && (
          <div className="text-center py-16 text-slate-400">
            <div className="text-5xl mb-3" aria-hidden="true">📝</div>
            Select a class to begin entering mock scores.
          </div>
        )}

        {selectedClass && (loadingStudents || loadingScores) && (
          <div className="flex items-center gap-2 text-slate-400 text-sm py-4">
            <span className="animate-spin" aria-hidden="true">⟳</span> Loading…
          </div>
        )}

        {selectedClass && !loadingStudents && students.length > 0 && (
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-700 text-white">
                  <th className="px-3 py-2.5 text-left text-xs font-semibold sticky left-0 bg-slate-700 z-10">
                    Student
                  </th>
                  {subjects.map((subj) => (
                    <th key={subj.id} className="px-3 py-2.5 text-center text-xs font-semibold whitespace-nowrap">
                      {subj.name}
                    </th>
                  ))}
                  <th className="px-3 py-2.5 text-center text-xs font-semibold bg-blue-800/60">
                    Best-6 Total
                  </th>
                  <th className="px-3 py-2.5 text-center text-xs font-semibold bg-blue-800/60">
                    Aggregate
                  </th>
                </tr>
              </thead>
              <tbody>
                {students.map((student, i) => {
                  const subjMap = scores[student.id] || {};
                  const { rawTotal, aggregate, count } = computeAggregate(subjMap);
                  return (
                    <tr key={student.id} className={i % 2 === 0 ? "bg-white" : "bg-slate-50/40"}>
                      <td className="px-3 py-2 font-medium text-slate-700 sticky left-0 bg-inherit whitespace-nowrap">
                        {getStudentName(student)}
                      </td>
                      {subjects.map((subj) => {
                        const cell = subjMap[subj.id] || {};
                        const g = gradeFor(cell.score);
                        return (
                          <td key={subj.id} className="px-2 py-2 text-center">
                            <div className="flex flex-col items-center gap-0.5">
                              <input
                                type="number"
                                min="0"
                                max="100"
                                step="0.5"
                                value={cell.score ?? ""}
                                onChange={(e) => setScore(student.id, subj.id, e.target.value)}
                                className="w-16 text-center border border-slate-200 rounded-md py-1 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-400"
                                placeholder="-"
                              />
                              {g && (
                                <span
                                  className={`text-[10px] font-bold px-1.5 rounded ${GRADE_COLOR[g.grade] || ""}`}
                                >
                                  {g.grade}
                                </span>
                              )}
                            </div>
                          </td>
                        );
                      })}
                      <td className="px-3 py-2 text-center font-mono font-bold text-blue-700 bg-blue-50/40">
                        {count > 0 ? rawTotal : "—"}
                      </td>
                      <td className="px-3 py-2 text-center font-mono font-bold text-blue-700 bg-blue-50/40">
                        {count > 0 ? aggregate : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {selectedClass && !loadingStudents && students.length === 0 && (
          <div className="text-center py-16 text-slate-400">No students in this class.</div>
        )}
      </div>
    </div>
  );
};

export default MockResults;