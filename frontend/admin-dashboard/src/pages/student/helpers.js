// src/pages/student/helpers.js
//
// Pure functions only — no React, no API calls.

import { CHAR_SCORE_GRADES } from "./constants";

export const fmt = (v) =>
  Number(v || 0).toLocaleString("en-GH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const fmtDate = (iso) => {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GH", { day: "numeric", month: "short", year: "numeric" });
};

export const fmtDateTime = (iso) => {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-GH", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
};

export const charScoreGrade = (score) => {
  if (score === "" || score == null) return null;
  const n = parseFloat(score);
  return CHAR_SCORE_GRADES.find((g) => n >= g.min) ?? CHAR_SCORE_GRADES[CHAR_SCORE_GRADES.length - 1];
};

// Prevents "Morning Cohort Cohort"
export const formatCohort = (cohort) => {
  if (!cohort) return "—";
  return cohort.toLowerCase().includes("cohort") ? cohort : `${cohort} Cohort`;
};

export function pwStrength(pw) {
  if (!pw) return { score: 0, label: "", color: "transparent" };
  let s = 0;
  if (pw.length >= 8)           s++;
  if (/[A-Z]/.test(pw))         s++;
  if (/[0-9]/.test(pw))         s++;
  if (/[^A-Za-z0-9]/.test(pw)) s++;
  const map = [
    { label: "Too short", color: "#f87171", w: "25%" },
    { label: "Weak",      color: "#fb923c", w: "40%" },
    { label: "Fair",      color: "#fbbf24", w: "60%" },
    { label: "Good",      color: "#34d399", w: "80%" },
    { label: "Strong",    color: "#16a34a", w: "100%" },
  ];
  return { score: s, ...map[Math.min(s, map.length - 1)] };
}

// ── E-Learning helpers ─────────────────────────────────────────────────────

/**
 * Derives a submission's status relative to its assignment.
 * Returns one of: "not_submitted" | "submitted" | "late" | "graded"
 */
export const submissionStatus = (assignment, submission) => {
  if (!submission) return "not_submitted";
  if (submission.score !== null && submission.score !== undefined && submission.score !== "") {
    return "graded";
  }
  if (submission.is_late) return "late";
  return "submitted";
};

export const isOverdue = (dueDate) => {
  if (!dueDate) return false;
  return new Date(dueDate).getTime() < Date.now();
};

/**
 * Human "due in X days" / "overdue by X days" label + urgency bucket.
 */
export const dueLabel = (dueDate) => {
  if (!dueDate) return { text: "No due date", bucket: "ok" };
  const diffMs   = new Date(dueDate).getTime() - Date.now();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays < 0)  return { text: `Overdue by ${Math.abs(diffDays)}d`, bucket: "overdue" };
  if (diffDays === 0) return { text: "Due today", bucket: "soon" };
  if (diffDays <= 2)  return { text: `Due in ${diffDays}d`, bucket: "soon" };
  return { text: `Due ${fmtDate(dueDate)}`, bucket: "ok" };
};

export const STATUS_LABELS = {
  not_submitted: "Not submitted",
  submitted:     "Submitted",
  late:          "Submitted late",
  graded:        "Graded",
};