// src/pages/teacher/elearningService.js
//
// API calls for the teacher's Lessons + Assignments + Grading workflow.
// Mirrors the conventions in teacherPortalService.js — import this
// alongside it, or fold these exports into that file if you prefer one
// service module per portal.

import API from "../../services/api";

// ── Lessons ───────────────────────────────────────────────────────────────

export const fetchLessons = async (classId, subjectId, term, year) => {
  const params = new URLSearchParams({ school_class: classId });
  if (subjectId) params.set("subject", subjectId);
  if (term)      params.set("term", term);
  if (year)      params.set("year", String(year));
  const r = await API.get(`/lessons/?${params.toString()}`);
  return r.data.results ?? r.data;
};

/**
 * Creates or updates a lesson. Uses multipart/form-data whenever a file
 * is attached, otherwise a plain JSON payload.
 */
export const saveLesson = async (lessonId, payload, file) => {
  if (file) {
    const form = new FormData();
    Object.entries(payload).forEach(([k, v]) => v !== undefined && v !== null && form.append(k, v));
    form.append("attachment", file);
    const r = lessonId
      ? await API.patch(`/lessons/${lessonId}/`, form, { headers: { "Content-Type": "multipart/form-data" } })
      : await API.post("/lessons/", form, { headers: { "Content-Type": "multipart/form-data" } });
    return r.data;
  }
  const r = lessonId
    ? await API.patch(`/lessons/${lessonId}/`, payload)
    : await API.post("/lessons/", payload);
  return r.data;
};

export const deleteLesson = async (lessonId) => {
  await API.delete(`/lessons/${lessonId}/`);
};

// ── Assignments ───────────────────────────────────────────────────────────

export const fetchAssignments = async (classId, subjectId, term, year) => {
  const params = new URLSearchParams({ school_class: classId });
  if (subjectId) params.set("subject", subjectId);
  if (term)      params.set("term", term);
  if (year)      params.set("year", String(year));
  const r = await API.get(`/assignments/?${params.toString()}`);
  return r.data.results ?? r.data;
};

export const saveAssignment = async (assignmentId, payload, file) => {
  if (file) {
    const form = new FormData();
    Object.entries(payload).forEach(([k, v]) => v !== undefined && v !== null && form.append(k, v));
    form.append("attachment", file);
    const r = assignmentId
      ? await API.patch(`/assignments/${assignmentId}/`, form, { headers: { "Content-Type": "multipart/form-data" } })
      : await API.post("/assignments/", form, { headers: { "Content-Type": "multipart/form-data" } });
    return r.data;
  }
  const r = assignmentId
    ? await API.patch(`/assignments/${assignmentId}/`, payload)
    : await API.post("/assignments/", payload);
  return r.data;
};

export const deleteAssignment = async (assignmentId) => {
  await API.delete(`/assignments/${assignmentId}/`);
};

// ── Submissions / grading ───────────────────────────────────────────────

export const fetchSubmissions = async (assignmentId) => {
  const r = await API.get(`/submissions/?assignment=${assignmentId}`);
  return r.data.results ?? r.data;
};

export const gradeSubmission = async (submissionId, score, feedback) => {
  const r = await API.patch(`/submissions/${submissionId}/`, { score, feedback });
  return r.data;
};