// src/pages/student/hooks.js
//
// One hook per data domain. Each owns its state slice.

import { useState, useCallback } from "react";
import * as svc from "./studentPortalService";
import { TERMS } from "./constants";

// ── useReport (single term) ────────────────────────────────────────────────

export function useReport(studentId) {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async (term, quiet = false) => {
    if (!quiet) setLoading(true);
    if (!quiet) setError("");
    try {
      const data = await svc.fetchStudentReport(studentId, term);
      setReport(data);
    } catch {
      if (!quiet) setError("No report found for this term.");
      setReport(null);
    } finally {
      if (!quiet) setLoading(false);
    }
  }, [studentId]);

  return { report, loading, error, setError, load };
}

// ── useAllReports (progress tab, all terms at once) ────────────────────────

export function useAllReports(studentId) {
  const [allReports, setAllReports] = useState({});
  const [loading, setLoading] = useState(false);

  const load = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    const results = {};
    await Promise.all(TERMS.map(async ({ value }) => {
      try { results[value] = await svc.fetchStudentReport(studentId, value); } catch { /* term has no report yet */ }
    }));
    setAllReports(results);
    if (!quiet) setLoading(false);
  }, [studentId]);

  return { allReports, loading, load };
}

// ── useStudentAttendance ─────────────────────────────────────────────────

export function useStudentAttendance(studentId) {
  const [attendance, setAttendance] = useState([]);
  const [stats, setStats] = useState({ present: 0, absent: 0, late: 0, total: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async (term, quiet = false) => {
    if (!quiet) setLoading(true);
    try {
      const records = await svc.fetchStudentAttendance(studentId, term);
      setAttendance(records);
      setStats(records.reduce((acc, rec) => {
        acc.total++;
        if (rec.status === "present") acc.present++;
        else if (rec.status === "absent") acc.absent++;
        else if (rec.status === "late") acc.late++;
        return acc;
      }, { present: 0, absent: 0, late: 0, total: 0 }));
    } catch {
      if (!quiet) setError("Could not load attendance records.");
    } finally {
      if (!quiet) setLoading(false);
    }
  }, [studentId]);

  return { attendance, stats, loading, error, setError, load };
}

// ── useStudentCharAssessment ───────────────────────────────────────────────

export function useStudentCharAssessment(studentId, admissionNumber) {
  const [charAssessment, setCharAssessment] = useState(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async (term, quiet = false) => {
    if (!quiet) setLoading(true);
    try {
      const data = await svc.fetchStudentCharAssessment(studentId, admissionNumber, term);
      setCharAssessment(data);
    } catch {
      setCharAssessment(null);
    } finally {
      if (!quiet) setLoading(false);
    }
  }, [studentId, admissionNumber]);

  return { charAssessment, loading, load };
}

// ── useStudentFees ──────────────────────────────────────────────────────

export function useStudentFees(studentId) {
  const [fees, setFees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    try {
      setFees(await svc.fetchStudentFees(studentId));
    } catch {
      if (!quiet) setError("Failed to load fees.");
    } finally {
      if (!quiet) setLoading(false);
    }
  }, [studentId]);

  return { fees, setFees, loading, error, setError, load };
}

// ── useElearning (lessons + assignments + own submissions) ─────────────────

export function useElearning(student) {
  const [lessons, setLessons] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [submissions, setSubmissions] = useState([]); // this student's own
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(null); // assignmentId currently being submitted
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const load = useCallback(async ({ classId, subjectId, term, year }, quiet = false) => {
    if (!classId) return;
    if (!quiet) setLoading(true);
    if (!quiet) setError("");
    try {
      const [lessonList, assignmentList, mySubs] = await Promise.all([
        svc.fetchLessons({ classId, subjectId, term, year }),
        svc.fetchAssignments({ classId, subjectId, term, year }),
        svc.fetchMySubmissions(student.student_id),
      ]);
      setLessons(lessonList);
      setAssignments(assignmentList);
      setSubmissions(mySubs);
    } catch {
      if (!quiet) setError("Failed to load lessons and assignments.");
    } finally {
      if (!quiet) setLoading(false);
    }
  }, [student.student_id]);

  const submissionFor = useCallback(
    (assignmentId) => submissions.find((s) => String(s.assignment) === String(assignmentId)) ?? null,
    [submissions]
  );

  const submit = useCallback(async (assignment, { textAnswer, file }) => {
    setSubmitting(assignment.id);
    setError("");
    try {
      const existing = submissionFor(assignment.id);
      const saved = await svc.submitAssignment({
        assignmentId: assignment.id,
        studentId: student.student_id,
        textAnswer,
        file,
        submissionId: existing?.id,
      });
      setSubmissions((prev) => {
        const others = prev.filter((s) => String(s.assignment) !== String(assignment.id));
        return [...others, saved];
      });
      setSuccess("Assignment submitted successfully.");
      return true;
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to submit assignment. Please try again.");
      return false;
    } finally {
      setSubmitting(null);
    }
  }, [student.student_id, submissionFor]);

  return {
    lessons,
    assignments,
    submissions,
    loading,
    submitting,
    error,
    success,
    setError,
    setSuccess,
    load,
    submissionFor,
    submit,
  };
}