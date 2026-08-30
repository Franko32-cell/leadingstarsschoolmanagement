// src/pages/student/studentPortalService.js
//
// All API calls for the student portal live here.
// Components/hooks never import API directly.

import API from "../../services/api";

// ── Reports / results ────────────────────────────────────────────────────

export const fetchStudentReport = async (studentId, term) => {
  const r = await API.get(`/report/student/${studentId}/?term=${term}`);
  return r.data;
};

export const downloadReportPDF = async (studentId, term) => {
  const r = await API.get(`/report/student/${studentId}/pdf/?term=${term}`, { responseType: "blob" });
  const url  = window.URL.createObjectURL(new Blob([r.data]));
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", `report_${term}.pdf`);
  document.body.appendChild(link);
  link.click();
  link.remove();
  return url;
};

// ── Attendance ────────────────────────────────────────────────────────────

export const fetchStudentAttendance = async (studentId, term) => {
  const r = await API.get(`/attendance/?student=${studentId}&term=${term}&ordering=date`);
  return r.data.results ?? r.data;
};

// ── Character assessment ──────────────────────────────────────────────────

export const fetchStudentCharAssessment = async (studentId, admissionNumber, term) => {
  const tryFetch = async (idValue) => {
    const r = await API.get(`/character-assessment/?student=${idValue}&term=${term}`);
    const all = r.data?.results ?? (Array.isArray(r.data) ? r.data : []);
    if (!all.length) return null;
    all.sort((a, b) => {
      if (b.year !== a.year) return b.year - a.year;
      return new Date(b.created_at) - new Date(a.created_at);
    });
    return all[0];
  };

  let data = null;
  try { data = await tryFetch(studentId); } catch { /* ignore */ }

  if (!data && admissionNumber && String(admissionNumber) !== String(studentId)) {
    try { data = await tryFetch(admissionNumber); } catch { /* ignore */ }
  }

  return data && (data.areas || data.career || data.cohort) ? data : null;
};

// ── Fees ──────────────────────────────────────────────────────────────────

export const fetchStudentFees = async (studentId) => {
  const r = await API.get(`/fees/?student=${studentId}`);
  return r.data.results ?? r.data;
};

export const recordFeePayment = async (feeId, amount, note) => {
  const r = await API.post(`/fees/${feeId}/pay/`, { amount, note });
  return r.data;
};

// ── Auth ──────────────────────────────────────────────────────────────────

export const changePassword = async (oldPassword, newPassword) => {
  await API.post("/auth/change-password/", {
    old_password: oldPassword,
    new_password: newPassword,
  });
};

// ── E-Learning (Lessons) ────────────────────────────────────────────────────

/**
 * Lessons visible to a student are scoped by their class; subject/term/year
 * are optional narrowing filters.
 */
export const fetchLessons = async ({ classId, subjectId, term, year }) => {
  const params = new URLSearchParams({ school_class: classId });
  if (subjectId) params.set("subject", subjectId);
  if (term)      params.set("term", term);
  if (year)      params.set("year", String(year));
  const r = await API.get(`/lessons/?${params.toString()}`);
  return r.data.results ?? r.data;
};

// ── E-Learning (Assignments) ────────────────────────────────────────────────

export const fetchAssignments = async ({ classId, subjectId, term, year }) => {
  const params = new URLSearchParams({ school_class: classId });
  if (subjectId) params.set("subject", subjectId);
  if (term)      params.set("term", term);
  if (year)      params.set("year", String(year));
  const r = await API.get(`/assignments/?${params.toString()}`);
  return r.data.results ?? r.data;
};

/**
 * A student's own submissions, so the UI can match them against assignments.
 */
export const fetchMySubmissions = async (studentId) => {
  const r = await API.get(`/submissions/?student=${studentId}`);
  return r.data.results ?? r.data;
};

/**
 * Submits (or resubmits) an assignment. Uses multipart/form-data when a
 * file is attached, otherwise a plain JSON payload.
 */
export const submitAssignment = async ({ assignmentId, studentId, textAnswer, file, submissionId }) => {
  const form = new FormData();
  form.append("assignment", assignmentId);
  form.append("student", studentId);
  if (textAnswer) form.append("text_answer", textAnswer);
  if (file)       form.append("file", file);

  if (submissionId) {
    const r = await API.patch(`/submissions/${submissionId}/`, form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return r.data;
  }
  const r = await API.post("/submissions/", form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return r.data;
};