import React, { useEffect, useState } from "react";
import {
  fetchStudentReport,
  downloadReportPDF,
} from "../Teacherportalservice";

const ReportsTab = ({
  students = [],
  selectedClassName = "",
  selectedClass = "",
  selectedTerm = "",
  selectedYear = "",
}) => {
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState("");

  const studentOptions = students.map((student) => ({
    id: student.id,
    name: student.student_name || student.name || student.admission_number || `Student ${student.id}`,
    admissionNumber: student.admission_number,
  }));

  useEffect(() => {
    if (students.length > 0 && !students.some((s) => s.id === selectedStudentId)) {
      setSelectedStudentId(students[0].id);
    }
  }, [students, selectedStudentId]);

  useEffect(() => {
    const loadReport = async () => {
      if (!selectedStudentId || !selectedTerm) {
        setReport(null);
        return;
      }

      setLoading(true);
      setError("");
      try {
        const data = await fetchStudentReport(selectedStudentId, selectedTerm);
        setReport(data);
      } catch (err) {
        setReport(null);
        setError(
          err.response?.status === 404
            ? "No report exists for this student and term yet. Check the Results tab first."
            : "Unable to load report."
        );
      } finally {
        setLoading(false);
      }
    };

    loadReport();
  }, [selectedStudentId, selectedTerm]);

  const handleDownload = async () => {
    if (!selectedStudentId) return;
    setDownloading(true);
    setError("");
    try {
      await downloadReportPDF(selectedStudentId, selectedTerm);
    } catch {
      setError("Failed to download the report PDF.");
    } finally {
      setDownloading(false);
    }
  };

  const studentName = studentOptions.find((s) => s.id === selectedStudentId)?.name;

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between mb-6">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Reports</p>
          <h3 className="mt-1 text-xl font-semibold text-slate-900">{selectedClassName || "Class reports"}</h3>
          <p className="text-sm text-slate-500">Term: {selectedTerm || "—"} · Year: {selectedYear || "—"}</p>
        </div>

        <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
          {students.length === 0
            ? "No reports available"
            : `${students.length} student${students.length !== 1 ? "s" : ""} in class`}
        </div>
      </div>

      {students.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-500">
          No students are assigned to this class yet. Select a class to preview report cards.
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <label className="block text-sm font-medium text-slate-700 mb-2">Select student</label>
              <select
                value={selectedStudentId}
                onChange={(e) => setSelectedStudentId(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 shadow-sm"
              >
                {studentOptions.map((student) => (
                  <option key={student.id} value={student.id}>
                    {student.name}
                  </option>
                ))}
              </select>
              <p className="mt-3 text-sm text-slate-500">
                {studentOptions.length} student{studentOptions.length !== 1 ? "s" : ""} available for this class.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-slate-500">Selected student</p>
                  <p className="mt-1 text-lg font-semibold text-slate-900">{studentName || "Choose a student"}</p>
                </div>
                <button
                  type="button"
                  onClick={handleDownload}
                  disabled={!report || downloading}
                  className="inline-flex items-center justify-center rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {downloading ? "Downloading..." : "Download PDF"}
                </button>
              </div>
              <p className="mt-3 text-sm text-slate-500">
                Use this tab to preview the selected student's report and download it immediately.
              </p>
            </div>
          </div>

          {error && (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {error}
            </div>
          )}

          {loading && (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 text-sm text-slate-500">
              Loading report preview…
            </div>
          )}

          {!loading && report && (
            <div className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-2xl border border-slate-100 bg-white p-4">
                  <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Total score</p>
                  <p className="mt-3 text-3xl font-semibold text-slate-900">{report.total_score ?? "—"}</p>
                </div>
                <div className="rounded-2xl border border-slate-100 bg-white p-4">
                  <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Average</p>
                  <p className="mt-3 text-3xl font-semibold text-slate-900">{report.average_score ?? "—"}</p>
                </div>
                <div className="rounded-2xl border border-slate-100 bg-white p-4">
                  <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Overall grade</p>
                  <p className="mt-3 text-3xl font-semibold text-slate-900">{report.overall_grade ?? "—"}</p>
                </div>
                <div className="rounded-2xl border border-slate-100 bg-white p-4">
                  <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Attendance</p>
                  <p className="mt-3 text-3xl font-semibold text-slate-900">{report.attendance_percent ?? 0}%</p>
                  <p className="text-sm text-slate-500">{report.attendance}/{report.attendance_total} present</p>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-100 bg-white p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Report summary</p>
                    <p className="text-sm text-slate-500">{report.subjects?.length ?? 0} subjects included</p>
                  </div>
                  {report.show_position && (
                    <div className="rounded-2xl bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700">
                      Class position: {report.position_formatted} / {report.out_of}
                    </div>
                  )}
                </div>

                <div className="mt-4 overflow-x-auto">
                  <table className="min-w-full border-separate border-spacing-0 text-left text-sm">
                    <thead>
                      <tr className="bg-slate-50 text-slate-500">
                        <th className="px-4 py-3">Subject</th>
                        <th className="px-4 py-3">CA</th>
                        <th className="px-4 py-3">Exam</th>
                        <th className="px-4 py-3">Total</th>
                        <th className="px-4 py-3">Grade</th>
                        <th className="px-4 py-3">Remark</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.subjects.map((subject) => (
                        <tr key={subject.subject} className="border-t border-slate-100">
                          <td className="px-4 py-3 text-slate-700">{subject.subject}</td>
                          <td className="px-4 py-3 text-slate-700">{subject.ca ?? "—"}</td>
                          <td className="px-4 py-3 text-slate-700">{subject.exams ?? "—"}</td>
                          <td className="px-4 py-3 text-slate-700">{subject.score ?? "—"}</td>
                          <td className="px-4 py-3 text-slate-700">{subject.grade ?? "—"}</td>
                          <td className="px-4 py-3 text-slate-700">{subject.remark ?? "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <p className="text-sm font-semibold text-slate-900">Conduct</p>
                  <p className="mt-2 text-slate-700">{report.conduct || "Not set"}</p>
                </div>
                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <p className="text-sm font-semibold text-slate-900">Teacher remark</p>
                  <p className="mt-2 text-slate-700">{report.teacher_remark || "Not set"}</p>
                </div>
              </div>
            </div>
          )}

          {!loading && !report && !error && (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-500">
              Select a student to see their current report preview. If no report exists yet, it will appear once results are entered.
            </div>
          )}

          <div className="grid gap-3">
            {students.map((s) => (
              <div
                key={s.id}
                className={`flex flex-col gap-3 rounded-2xl border p-4 transition ${
                  s.id === selectedStudentId
                    ? "border-blue-300 bg-blue-50"
                    : "border-slate-100 bg-slate-50"
                }`}
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-semibold text-slate-900">{s.student_name || s.name || s.admission_number || `Student ${s.id}`}</p>
                    <p className="text-xs text-slate-500">ID: {s.id}{s.admission_number ? ` · ${s.admission_number}` : ""}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedStudentId(s.id)}
                    className="inline-flex items-center rounded-full bg-blue-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-blue-700"
                  >
                    {s.id === selectedStudentId ? "Selected" : "View report"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ReportsTab;
