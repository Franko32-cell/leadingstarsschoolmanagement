import React, { useEffect, useMemo, useState } from "react";
import {
  fetchStudentReport,
  downloadReportPDF,
  saveRemarks,
  fetchClasses,
} from "../Teacherportalservice";

const EMPTY_REMARKS = {
  conduct: "",
  interest: "",
  teacher_remark: "",
  vacation_date: "",
  resumption_date: "",
  promotion_status: "",
  next_class: "",
};

const PROMOTION_OPTIONS = [
  { value: "", label: "—" },
  { value: "promoted", label: "Promoted" },
  { value: "repeated", label: "Repeated" },
  { value: "transferred", label: "Transferred" },
  { value: "withdrawn", label: "Withdrawn" },
];

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
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [remarks, setRemarks] = useState(EMPTY_REMARKS);
  const [classOptions, setClassOptions] = useState([]);
  const [loadingClasses, setLoadingClasses] = useState(false);

  const studentOptions = useMemo(
    () =>
      students.map((student) => ({
        id: student.id,
        name: student.student_name || student.name || student.admission_number || `Student ${student.id}`,
        admissionNumber: student.admission_number,
      })),
    [students]
  );

  useEffect(() => {
    if (students.length > 0 && !students.some((s) => String(s.id) === String(selectedStudentId))) {
      setSelectedStudentId(String(students[0].id));
    }
  }, [students, selectedStudentId]);

  useEffect(() => {
    const loadClasses = async () => {
      try {
        setLoadingClasses(true);
        const data = await fetchClasses();
        setClassOptions(Array.isArray(data) ? data : []);
      } catch {
        setClassOptions([]);
      } finally {
        setLoadingClasses(false);
      }
    };

    loadClasses();
  }, []);

  useEffect(() => {
    const loadReport = async () => {
      if (!selectedStudentId || !selectedTerm) {
        setReport(null);
        setRemarks(EMPTY_REMARKS);
        return;
      }

      setLoading(true);
      setError("");
      setSuccess("");
      try {
        const data = await fetchStudentReport(selectedStudentId, selectedTerm, selectedYear);
        setReport(data);
        setRemarks({
          conduct: data?.conduct ?? "",
          interest: data?.interest ?? "",
          teacher_remark: data?.teacher_remark ?? "",
          vacation_date: data?.vacation_date ?? "",
          resumption_date: data?.resumption_date ?? "",
          promotion_status: data?.promotion_status ?? "",
          next_class: data?.next_class ?? "",
        });
      } catch (err) {
        setReport(null);
        setRemarks(EMPTY_REMARKS);
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
  }, [selectedStudentId, selectedTerm, selectedYear]);

  const handleRemarkChange = (field, value) => {
    setRemarks((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!selectedStudentId || !selectedTerm) return;
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const updated = await saveRemarks(selectedStudentId, selectedTerm, selectedYear, remarks);
      setReport(updated);
      setSuccess("Report details saved.");
    } catch {
      setError("Failed to save report details.");
    } finally {
      setSaving(false);
    }
  };

  const handleDownload = async () => {
    if (!selectedStudentId) return;
    setDownloading(true);
    setError("");
    setSuccess("");
    try {
      await downloadReportPDF(selectedStudentId, selectedTerm, selectedYear);
    } catch {
      setError("Failed to download the report PDF.");
    } finally {
      setDownloading(false);
    }
  };

  const hasChanges = useMemo(() => {
    if (!report) return false;
    const original = {
      conduct: report.conduct ?? "",
      interest: report.interest ?? "",
      teacher_remark: report.teacher_remark ?? "",
      vacation_date: report.vacation_date ?? "",
      resumption_date: report.resumption_date ?? "",
      promotion_status: report.promotion_status ?? "",
      next_class: report.next_class ?? "",
    };

    return Object.entries(remarks).some(([key, value]) => String(original[key] ?? "") !== String(value ?? ""));
  }, [report, remarks]);

  const studentName = studentOptions.find((s) => String(s.id) === String(selectedStudentId))?.name;

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
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={!hasChanges || saving || !selectedStudentId || !selectedTerm}
                    className="inline-flex items-center justify-center rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {saving ? "Saving..." : "Save remarks"}
                  </button>
                  <button
                    type="button"
                    onClick={handleDownload}
                    disabled={!report || downloading}
                    className="inline-flex items-center justify-center rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {downloading ? "Downloading..." : "Download PDF"}
                  </button>
                </div>
              </div>
              <p className="mt-3 text-sm text-slate-500">
                Review the report card, update remarks, and download a PDF for the selected student.
              </p>
            </div>
          </div>

          {error && (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {error}
            </div>
          )}

          {success && (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
              {success}
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
                      Class position: {report.position_formatted ?? report.position} / {report.out_of}
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

              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Report details</p>
                    <p className="text-sm text-slate-500">Update conduct, comments, and promotion information for this report.</p>
                  </div>
                  {loadingClasses && <p className="text-xs text-slate-400">Loading classes…</p>}
                </div>

                <div className="mt-4 grid gap-4 lg:grid-cols-2">
                  <div className="space-y-4">
                    <label className="block text-sm text-slate-700">
                      <span className="mb-1.5 block font-medium">Conduct</span>
                      <textarea
                        value={remarks.conduct}
                        onChange={(e) => handleRemarkChange("conduct", e.target.value)}
                        rows={3}
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                      />
                    </label>
                    <label className="block text-sm text-slate-700">
                      <span className="mb-1.5 block font-medium">Interest</span>
                      <textarea
                        value={remarks.interest}
                        onChange={(e) => handleRemarkChange("interest", e.target.value)}
                        rows={3}
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                      />
                    </label>
                    <label className="block text-sm text-slate-700">
                      <span className="mb-1.5 block font-medium">Teacher remark</span>
                      <textarea
                        value={remarks.teacher_remark}
                        onChange={(e) => handleRemarkChange("teacher_remark", e.target.value)}
                        rows={4}
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                      />
                    </label>
                  </div>

                  <div className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <label className="block text-sm text-slate-700">
                        <span className="mb-1.5 block font-medium">Vacation date</span>
                        <input
                          type="date"
                          value={remarks.vacation_date}
                          onChange={(e) => handleRemarkChange("vacation_date", e.target.value)}
                          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                        />
                      </label>
                      <label className="block text-sm text-slate-700">
                        <span className="mb-1.5 block font-medium">Resumption date</span>
                        <input
                          type="date"
                          value={remarks.resumption_date}
                          onChange={(e) => handleRemarkChange("resumption_date", e.target.value)}
                          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                        />
                      </label>
                    </div>

                    <label className="block text-sm text-slate-700">
                      <span className="mb-1.5 block font-medium">Promotion status</span>
                      <select
                        value={remarks.promotion_status}
                        onChange={(e) => handleRemarkChange("promotion_status", e.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                      >
                        {PROMOTION_OPTIONS.map((option) => (
                          <option key={option.value || "empty"} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="block text-sm text-slate-700">
                      <span className="mb-1.5 block font-medium">Next class</span>
                      <select
                        value={remarks.next_class}
                        onChange={(e) => handleRemarkChange("next_class", e.target.value)}
                        disabled={!remarks.promotion_status || loadingClasses}
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:cursor-not-allowed disabled:bg-slate-100"
                      >
                        <option value="">Select class</option>
                        {classOptions.map((cls) => (
                          <option key={cls.id} value={cls.id}>
                            {cls.name}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
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
