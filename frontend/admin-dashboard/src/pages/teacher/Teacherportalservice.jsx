// src/pages/teacher/teacherPortalService.js
//
// All API calls for the teacher portal live here.
// Components and hooks call these functions — they never import API directly.
// Each function throws on error so the caller can handle UI state (setError).

import API from "../../services/api";

// ── Reference data ────────────────────────────────────────────────────────

export const fetchClasses = async () => {
  const r = await API.get("/classes/");
  return r.data.results ?? r.data;
};

export const fetchSubjects = async () => {
  const r = await API.get("/subjects/");
  return r.data.results ?? r.data;
};

export const fetchStudents = async (classId) => {
  const r = await API.get(`/students/?school_class=${classId}`);
  return r.data.results ?? r.data;
};

// ── Attendance ────────────────────────────────────────────────────────────

export const fetchAttendance = async (classId, date) => {
  const r = await API.get(`/attendance/?school_class=${classId}&date=${date}`);
  return r.data.results ?? r.data;
};

/**
 * Upserts attendance records for every student in the list.
 * Returns { saved: number, failed: number }.
 */
export const saveAttendance = async (classId, date, students, attendanceMap) => {
  const existingRes = await API.get(`/attendance/?school_class=${classId}&date=${date}`);
  const existing    = existingRes.data.results ?? existingRes.data;
  const existingMap = Object.fromEntries(existing.map((rec) => [String(rec.student), rec.id]));

  const results = await Promise.allSettled(
    students.map((s) => {
      const existingId = existingMap[String(s.id)];
      const status     = attendanceMap[s.id] ?? "present";
      return existingId
        ? API.patch(`/attendance/${existingId}/`, { status })
        : API.post("/attendance/", {
            student:      s.id,
            school_class: classId,
            date,
            status,
          });
    })
  );

  const failed = results.filter((r) => r.status === "rejected").length;
  return { saved: results.length - failed, failed };
};

// ── Results ───────────────────────────────────────────────────────────────

export const fetchResults = async (classId, term, subjectId, year) => {
  const r = await API.get(
    `/results/?school_class=${classId}&term=${term}&subject=${subjectId}&year=${year}`
  );
  return r.data.results ?? r.data;
};

/**
 * Bulk-saves results. Returns the API response data.
 * Throws if the request itself fails; partial save errors are in response.errors.
 */
export const saveResults = async (records) => {
  const r = await API.post("/results/bulk/", records);
  return r.data; // { saved, errors }
};

export const deleteResult = async (resultId) => {
  await API.delete(`/results/${resultId}/`);
};

export const fetchResultsSummary = async (classId, term, year) => {
  const r = await API.get(
    `/results/summary/?school_class=${classId}&term=${term}&year=${year}`
  );
  return r.data;
};

// ── Reports ───────────────────────────────────────────────────────────────

export const fetchStudentReport = async (studentId, term) => {
  const r = await API.get(`/report/student/${studentId}/?term=${term}`);
  return r.data;
};

export const saveRemarks = async (studentId, term, remarks) => {
  await API.patch(`/report/student/${studentId}/`, { term, ...remarks });
  // Re-fetch so the caller gets the latest saved state
  return fetchStudentReport(studentId, term);
};

/**
 * Downloads the report PDF and triggers a browser download.
 * Returns the object URL (caller should revoke it when done).
 */
export const downloadReportPDF = async (studentId, term) => {
  const r = await API.get(
    `/report/student/${studentId}/pdf/?term=${term}`,
    { responseType: "blob" }
  );
  const url  = window.URL.createObjectURL(new Blob([r.data]));
  const link = document.createElement("a");
  link.href  = url;
  link.setAttribute("download", `report_${studentId}_${term}.pdf`);
  document.body.appendChild(link);
  link.click();
  link.remove();
  return url; // caller revokes
};

// ── Character assessment ──────────────────────────────────────────────────

export const fetchCharAssessment = async (studentId, term, year) => {
  const r = await API.get(
    `/character-assessment/?student=${studentId}&term=${term}&year=${year}`
  );
  // Handle both {results: [...]} and plain list []
  const list = r.data?.results ?? (Array.isArray(r.data) ? r.data : []);
  const data = list[0] ?? null;
  return data && (data.areas || data.cohort) ? data : null;
};
/**
 * Creates or updates a character assessment.
 * Tries PATCH first; falls back to POST on 404/405.
 */
export const saveCharAssessment = async (studentId, classId, term, year, form) => {
  const payload = {
    student:      studentId,
    school_class: classId,
    term,
    year,
    ...form,
  };
  try {
    // Pass term+year as query params so get_object() can find the record
    await API.patch(
      `/character-assessment/${studentId}/?term=${term}&year=${year}`,
      payload
    );
  } catch (patchErr) {
    if (patchErr.response?.status === 404 || patchErr.response?.status === 405) {
      await API.post("/character-assessment/", payload);
    } else {
      throw patchErr;
    }
  }
};

// ── Auth ──────────────────────────────────────────────────────────────────

export const changePassword = async (oldPassword, newPassword) => {
  await API.post("/auth/change-password/", {
    old_password: oldPassword,
    new_password: newPassword,
  });
};