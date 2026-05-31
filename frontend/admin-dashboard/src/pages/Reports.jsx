import { useEffect, useState } from "react";
import API from "../services/api";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const TERMS = [
  { value: "term1", label: "Term 1" },
  { value: "term2", label: "Term 2" },
  { value: "term3", label: "Term 3" },
];

// FIX: derive the active term from a single constant so there is one place
// to update when the school moves to a new term.
// Must match settings.CURRENT_TERM on the backend.
const CURRENT_TERM = "term3";

const GRADE_COLORS = {
  "A":  "bg-green-100   text-green-800",
  "B":  "bg-emerald-100 text-emerald-800",
  "C":  "bg-blue-100    text-blue-800",
  "D":  "bg-cyan-100    text-cyan-800",
  "1":  "bg-green-100   text-green-800",
  "2":  "bg-emerald-100 text-emerald-800",
  "3":  "bg-blue-100    text-blue-800",
  "4":  "bg-cyan-100    text-cyan-800",
  "5":  "bg-yellow-100  text-yellow-800",
  "6":  "bg-orange-100  text-orange-800",
  "7":  "bg-red-100     text-red-700",
  "8":  "bg-red-200     text-red-800",
  "9":  "bg-red-300     text-red-900",
  "E2": "bg-orange-100  text-orange-800",
  "E3": "bg-red-100     text-red-700",
  "E4": "bg-red-200     text-red-800",
  "E5": "bg-red-300     text-red-900",
};

const GRADE_SCALE_B79 = [
  { range: "90-100", grade: "1", label: "HIGHEST"      },
  { range: "80-89",  grade: "2", label: "HIGHER"       },
  { range: "60-79",  grade: "3", label: "HIGH"         },
  { range: "55-59",  grade: "4", label: "HIGH AVERAGE" },
  { range: "50-54",  grade: "5", label: "AVERAGE"      },
  { range: "45-49",  grade: "6", label: "LOW AVERAGE"  },
  { range: "40-44",  grade: "7", label: "LOW"          },
  { range: "35-39",  grade: "8", label: "LOWER"        },
  { range: "0-34",   grade: "9", label: "LOWEST"       },
];

const GRADE_SCALE_B16 = [
  { range: "90-100", grade: "A",  label: "EXCELLENT"     },
  { range: "80-89",  grade: "B",  label: "VERY GOOD"     },
  { range: "60-79",  grade: "C",  label: "GOOD"          },
  { range: "55-59",  grade: "D",  label: "HIGH AVERAGE"  },
  { range: "45-49",  grade: "E2", label: "BELOW AVERAGE" },
  { range: "40-44",  grade: "E3", label: "LOW"           },
  { range: "35-39",  grade: "E4", label: "LOWER"         },
  { range: "0-34",   grade: "E5", label: "LOWEST"        },
];

const CONDUCT_OPTIONS = ["Excellent", "Very Good", "Good", "Fair", "Poor"];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const getStudentName = (s) =>
  s?.student_name ||
  (s?.first_name ? `${s.first_name} ${s.last_name || ""}`.trim() : null) ||
  s?.admission_number ||
  "Unknown";

// Round a numeric value; return "-" if null/undefined
const fmt = (v) => (v == null ? "-" : Math.round(v));

// Compute attendance percent locally so we're not relying on the API field.
const calcAttendancePct = (present, total) => {
  if (!total) return 0;
  return Math.round((present / total) * 100);
};

// FIX: convert empty string → null so Django date fields don't get "" which
// causes a 400 ValidationError ("Enter a valid date").
const dateOrNull = (v) => (v && v.trim() !== "" ? v : null);

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
const Reports = () => {
  const [classes, setClasses]                 = useState([]);
  const [students, setStudents]               = useState([]);
  const [selectedClass, setSelectedClass]     = useState("");
  const [selectedStudent, setSelectedStudent] = useState("");

  // FIX: default to CURRENT_TERM, not "term1"
  const [selectedTerm, setSelectedTerm]       = useState(CURRENT_TERM);

  const [report, setReport]         = useState(null);
  const [loading, setLoading]       = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError]           = useState("");

  const [remarks, setRemarks] = useState({
    conduct:         "",
    interest:        "",
    teacher_remark:  "",
    vacation_date:   "",
    resumption_date: "",
  });
  const [savingRemarks, setSavingRemarks] = useState(false);
  const [remarksSaved, setRemarksSaved]   = useState(false);

  // -------------------------------------------------------------------------
  // Data fetching
  // -------------------------------------------------------------------------
  useEffect(() => { fetchClasses(); }, []);

  useEffect(() => {
    if (selectedClass) fetchStudents(selectedClass);
    else {
      setStudents([]);
      setSelectedStudent("");
      setReport(null);
    }
  }, [selectedClass]);

  useEffect(() => {
    // FIX: also clear the "saved" badge when the user switches student or term
    setRemarksSaved(false);
    if (selectedStudent && selectedTerm) fetchReport();
    else setReport(null);
  }, [selectedStudent, selectedTerm]);

  const fetchClasses = async () => {
    try {
      const res = await API.get("/classes/");
      setClasses(res.data.results || res.data);
    } catch {
      setError("Failed to load classes.");
    }
  };

  const fetchStudents = async (classId) => {
    try {
      const res = await API.get(`/students/?school_class=${classId}`);
      setStudents(res.data.results || res.data);
    } catch {
      setError("Failed to load students.");
    }
  };

  const fetchReport = async () => {
    setLoading(true);
    setError("");
    setReport(null);
    setRemarksSaved(false);
    try {
      const res = await API.get(
        `/report/student/${selectedStudent}/?term=${selectedTerm}`
      );
      setReport(res.data);
      setRemarks({
        conduct:         res.data.conduct         || "",
        interest:        res.data.interest        || "",
        teacher_remark:  res.data.teacher_remark  || "",
        vacation_date:   res.data.vacation_date   || "",
        resumption_date: res.data.resumption_date || "",
      });
    } catch (err) {
      setError(
        err.response?.status === 404
          ? "No report found for this student and term."
          : "Failed to load report."
      );
    } finally {
      setLoading(false);
    }
  };

  // -------------------------------------------------------------------------
  // Actions
  // -------------------------------------------------------------------------
  const saveRemarks = async () => {
    setSavingRemarks(true);
    setRemarksSaved(false);
    setError("");
    try {
      await API.patch(`/report/student/${selectedStudent}/`, {
        term:            selectedTerm,
        conduct:         remarks.conduct,
        interest:        remarks.interest,
        teacher_remark:  remarks.teacher_remark,
        // FIX: send null instead of "" so Django DateField doesn't reject it
        vacation_date:   dateOrNull(remarks.vacation_date),
        resumption_date: dateOrNull(remarks.resumption_date),
      });
      setRemarksSaved(true);
      // Refresh report data to reflect saved remarks
      const res = await API.get(
        `/report/student/${selectedStudent}/?term=${selectedTerm}`
      );
      setReport(res.data);
    } catch (err) {
      setError(
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
    try {
      const res = await API.get(
        `/report/student/${selectedStudent}/pdf/?term=${selectedTerm}`,
        { responseType: "blob" }
      );
      const url  = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href  = url;
      link.setAttribute(
        "download",
        `report_${selectedStudent}_${selectedTerm}.pdf`
      );
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      setError("Failed to download PDF.");
    } finally {
      setDownloading(false);
    }
  };

  // -------------------------------------------------------------------------
  // Derived display values
  // -------------------------------------------------------------------------
  const level      = report?.level || "basic_7_9";
  const gradeScale = level === "basic_7_9" ? GRADE_SCALE_B79 : GRADE_SCALE_B16;
  const subjectOptions = report?.subjects?.map((s) => s.subject) || [];

  // FIX: compute attendance % locally; don't rely on API sending the field
  const attendancePct = calcAttendancePct(
    report?.attendance,
    report?.attendance_total
  );

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Student Reports</h1>

      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 border border-red-300 rounded">
          {error}
        </div>
      )}

      {/* ── Filters ─────────────────────────────────────────────────────── */}
      <div className="flex gap-3 mb-6 flex-wrap items-center">
        <select
          value={selectedClass}
          onChange={(e) => {
            setSelectedClass(e.target.value);
            setReport(null);
          }}
          className="border p-2 rounded min-w-[150px]"
        >
          <option value="">Select Class</option>
          {classes.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>

        <select
          value={selectedStudent}
          onChange={(e) => setSelectedStudent(e.target.value)}
          disabled={!students.length}
          className="border p-2 rounded min-w-[180px] disabled:opacity-50"
        >
          <option value="">Select Student</option>
          {students.map((s) => (
            <option key={s.id} value={s.id}>{getStudentName(s)}</option>
          ))}
        </select>

        {/* Term selector — defaults to CURRENT_TERM */}
        <select
          value={selectedTerm}
          onChange={(e) => setSelectedTerm(e.target.value)}
          className="border p-2 rounded"
        >
          {TERMS.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>

        {report && (
          <button
            onClick={downloadPDF}
            disabled={downloading}
            className="ml-auto bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded flex items-center gap-2 disabled:opacity-50 transition-colors"
          >
            {downloading ? "Generating..." : "⬇ Download PDF"}
          </button>
        )}
      </div>

      {loading && <p className="text-gray-500">Loading report...</p>}

      {/* ── Report card ─────────────────────────────────────────────────── */}
      {report && (
        <div className="bg-white rounded-lg shadow border max-w-4xl">

          {/* Header */}
          <div className="bg-blue-700 text-white p-6 rounded-t-lg flex justify-between items-start">
            <div>
              <h2 className="text-xl font-bold">
                {report.school_name || "LEADING STARS ACADEMY"}
              </h2>
              <p className="text-blue-100 text-xs mt-0.5">
                {level === "nursery_kg" ? "GLOBAL LEADERS" : "WHERE LEADERS ARE BORN"}
              </p>
              <p className="text-blue-200 text-sm mt-2">{report.student}</p>
              <p className="text-blue-200 text-sm">
                Admission No: {report.admission_number || "-"}
              </p>
              <p className="text-blue-200 text-sm">Class: {report.class || "-"}</p>
              <p className="text-blue-200 text-sm">
                Term:{" "}
                {TERMS.find((t) => t.value === report.term)?.label || report.term}
              </p>
            </div>
            <div>
              {report.photo ? (
                <img
                  src={report.photo}
                  alt="student"
                  className="w-20 h-20 rounded-lg border-2 border-white object-cover"
                />
              ) : (
                <div className="w-20 h-20 rounded-lg border-2 border-white bg-blue-600 flex items-center justify-center text-3xl font-bold">
                  {report.student?.[0] || "?"}
                </div>
              )}
            </div>
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 border-b">
            {[
              { label: "Total Marks",   value: fmt(report.total_score)   },
              { label: "Average Mark",  value: fmt(report.average_score) },
              {
                label: "Position",
                value: report.show_position
                  ? (report.position_formatted
                      ? `${report.position_formatted} / ${report.out_of}`
                      : "-")
                  : "N/A",
              },
              { label: "Overall Grade", value: report.overall_grade ?? "-" },
            ].map((stat) => (
              <div key={stat.label} className="p-4 text-center border-r last:border-r-0">
                <div
                  className={`text-2xl font-bold ${
                    stat.label === "Overall Grade"
                      ? (GRADE_COLORS[stat.value] || "text-blue-700")
                      : "text-blue-700"
                  }`}
                >
                  {stat.value}
                </div>
                <div className="text-xs text-gray-500 mt-1">{stat.label}</div>
              </div>
            ))}
          </div>

          {/* Subject Table */}
          <div className="p-6">
            <h3 className="font-semibold text-gray-700 mb-3">Subject Results</h3>
            <div className="overflow-x-auto">
              <table className="w-full border rounded text-sm">
                <thead className="bg-blue-50">
                  <tr>
                    <th className="p-2 text-left">SUBJECT</th>
                    <th className="p-2 text-center text-blue-700">
                      RE-OPEN<br />
                      <span className="font-normal text-xs">&amp; RDA 20%</span>
                    </th>
                    <th className="p-2 text-center text-blue-700">
                      CA/MGT<br />
                      <span className="font-normal text-xs">40%</span>
                    </th>
                    <th className="p-2 text-center text-blue-700">
                      EXAMS<br />
                      <span className="font-normal text-xs">40%</span>
                    </th>
                    <th className="p-2 text-center font-bold">
                      TOTAL<br />
                      <span className="font-normal text-xs">100%</span>
                    </th>
                    {report.show_position && (
                      <th className="p-2 text-center">POSITION</th>
                    )}
                    <th className="p-2 text-center">GRADE</th>
                    <th className="p-2 text-center">REMARK</th>
                  </tr>
                </thead>
                <tbody>
                  {report.subjects?.map((sub, i) => {
                    const bg = GRADE_COLORS[sub.grade] || "";
                    return (
                      <tr
                        key={i}
                        className={`border-t ${i % 2 === 0 ? "" : "bg-gray-50"}`}
                      >
                        <td className="p-2 font-medium">{sub.subject}</td>
                        <td className="p-2 text-center">{fmt(sub.reopen)}</td>
                        <td className="p-2 text-center">{fmt(sub.ca)}</td>
                        <td className="p-2 text-center">{fmt(sub.exams)}</td>
                        <td className="p-2 text-center font-bold text-blue-700">
                          {fmt(sub.score)}
                        </td>
                        {report.show_position && (
                          <td className="p-2 text-center font-semibold">
                            {sub.subject_position ?? "-"}
                          </td>
                        )}
                        <td className="p-2 text-center">
                          <span className={`px-2 py-0.5 rounded text-xs font-bold ${bg}`}>
                            {sub.grade}
                          </span>
                        </td>
                        <td className="p-2 text-center">
                          <span className={`px-2 py-0.5 rounded text-xs ${bg}`}>
                            {sub.remark || "-"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Grade scale */}
            <div className="mt-4 p-3 bg-gray-50 rounded border text-xs text-gray-600">
              <p className="font-semibold text-gray-700 mb-2">RESULT INTERPRETATION</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1">
                {gradeScale.map((g) => (
                  <span key={g.grade}>
                    {g.range}: <b>{g.grade} – {g.label}</b>
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Attendance + Remarks */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 px-6 pb-6">

            {/* Attendance */}
            <div className="border rounded p-4">
              <h3 className="font-semibold text-gray-700 mb-3">Attendance</h3>
              {report.attendance_total > 0 ? (
                <>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-500">Days Present</span>
                    <span className="font-semibold">
                      {report.attendance} / {report.attendance_total}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all ${
                        attendancePct >= 80 ? "bg-green-500" :
                        attendancePct >= 60 ? "bg-yellow-400" : "bg-red-500"
                      }`}
                      style={{ width: `${attendancePct}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-400 mt-1 text-right">
                    {attendancePct}% attendance
                  </p>
                </>
              ) : (
                <p className="text-gray-400 text-sm">No attendance data recorded.</p>
              )}
            </div>

            {/* Remarks */}
            <div className="border rounded p-4">
              <h3 className="font-semibold text-gray-700 mb-3">Teacher's Remarks</h3>
              <div className="space-y-3">

                <div>
                  <label className="text-xs text-gray-500 block mb-1">Conduct</label>
                  <select
                    value={remarks.conduct}
                    onChange={(e) => {
                      setRemarks((p) => ({ ...p, conduct: e.target.value }));
                      setRemarksSaved(false);
                    }}
                    className="w-full border rounded p-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                  >
                    <option value="">— Select —</option>
                    {CONDUCT_OPTIONS.map((o) => (
                      <option key={o} value={o}>{o}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs text-gray-500 block mb-1">
                    Interest{" "}
                    <span className="text-gray-400">
                      (subject the student shows most interest in)
                    </span>
                  </label>
                  <select
                    value={remarks.interest}
                    onChange={(e) => {
                      setRemarks((p) => ({ ...p, interest: e.target.value }));
                      setRemarksSaved(false);
                    }}
                    className="w-full border rounded p-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                  >
                    <option value="">— Select Subject —</option>
                    {subjectOptions.map((name) => (
                      <option key={name} value={name}>{name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs text-gray-500 block mb-1">
                    Teacher's Remark
                  </label>
                  <textarea
                    value={remarks.teacher_remark}
                    onChange={(e) => {
                      setRemarks((p) => ({
                        ...p,
                        teacher_remark: e.target.value,
                      }));
                      setRemarksSaved(false);
                    }}
                    rows={3}
                    placeholder="Write a remark for this student..."
                    className="w-full border rounded p-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">
                      Vacation Date
                    </label>
                    <input
                      type="date"
                      value={remarks.vacation_date || ""}
                      onChange={(e) => {
                        setRemarks((p) => ({
                          ...p,
                          vacation_date: e.target.value,
                        }));
                        setRemarksSaved(false);
                      }}
                      className="w-full border rounded p-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">
                      Resumption Date
                    </label>
                    <input
                      type="date"
                      value={remarks.resumption_date || ""}
                      onChange={(e) => {
                        setRemarks((p) => ({
                          ...p,
                          resumption_date: e.target.value,
                        }));
                        setRemarksSaved(false);
                      }}
                      className="w-full border rounded p-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={saveRemarks}
                    disabled={savingRemarks}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm disabled:opacity-50 transition-colors"
                  >
                    {savingRemarks ? "Saving..." : "Save Remarks"}
                  </button>
                  {remarksSaved && (
                    <span className="text-green-600 text-xs font-medium">✓ Saved</span>
                  )}
                </div>

              </div>
            </div>
          </div>

        </div>
      )}

      {/* Empty states */}
      {!loading && !report && selectedStudent && !error && (
        <div className="text-center py-16 text-gray-400">
          <div className="text-5xl mb-4">📋</div>
          <p className="text-lg">No report found for this student and term.</p>
          <p className="text-sm mt-1">
            Make sure results have been entered for this term.
          </p>
        </div>
      )}
      {!selectedStudent && (
        <div className="text-center py-16 text-gray-300">
          <div className="text-5xl mb-4">🎓</div>
          <p className="text-lg">Select a class and student to view their report.</p>
        </div>
      )}
    </div>
  );
};

export default Reports;
