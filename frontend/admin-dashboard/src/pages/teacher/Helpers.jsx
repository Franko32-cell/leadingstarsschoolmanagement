// src/pages/teacher/helpers.js
//
// Pure functions only — no React, no API calls.
// Each function is independently testable.

import { CHAR_SCORE_GRADES, GRADE_REMARK } from "./constants";

// ── Score breakdown calculators ───────────────────────────────────────────

/**
 * Re-open score = (reopen_raw / 10) + (rda / 10), capped at 20.
 */
export const calcReopenScore = (breakdown) => {
  const reopen = Math.min(10, parseFloat(breakdown.reopen_raw) || 0);
  const rda    = Math.min(10, parseFloat(breakdown.rda)        || 0);
  return Math.round((reopen + rda) * 10) / 10;
};

/**
 * CA-only portion (out of 25), scaled from raw HW + CW + CT totals (max 110).
 */
export const calcCAonly = (breakdown) => {
  const hw = ["hw1", "hw2", "hw3", "hw4"].reduce((s, k) => s + (parseFloat(breakdown[k]) || 0), 0);
  const cw = ["cw1", "cw2", "cw3", "cw4"].reduce((s, k) => s + (parseFloat(breakdown[k]) || 0), 0);
  const ct = ["ct1", "ct2", "ct3", "ct4"].reduce((s, k) => s + (parseFloat(breakdown[k]) || 0), 0);
  return Math.round(((hw + cw + ct) / 110) * 25 * 10) / 10;
};

/**
 * MGT score, capped at 15.
 */
export const calcMGTScore = (breakdown) =>
  Math.round(Math.min(15, parseFloat(breakdown.mgt_raw) || 0) * 10) / 10;

/**
 * Combined CA + MGT score (out of 40).
 */
export const calcCAScore = (breakdown) =>
  Math.round((calcCAonly(breakdown) + calcMGTScore(breakdown)) * 10) / 10;

/**
 * Exams score scaled from raw /100 to /40.
 */
export const calcExamsScore = (breakdown) =>
  Math.round(((parseFloat(breakdown.exam_raw) || 0) / 100) * 40 * 10) / 10;

// ── Total / grade ─────────────────────────────────────────────────────────

/**
 * Sum of reopen + ca + exams, rounded to 1 dp.
 */
export const computeTotal = (reopen, ca, exams) =>
  Math.round(
    ((parseFloat(reopen) || 0) + (parseFloat(ca) || 0) + (parseFloat(exams) || 0)) * 10
  ) / 10;

const THRESHOLDS_B79 = [
  [90, "1"], [80, "2"], [60, "3"], [55, "4"],
  [50, "5"], [45, "6"], [40, "7"], [35, "8"], [0, "9"],
];
const THRESHOLDS_B16 = [
  [90, "A"], [80, "B"], [60, "C"], [55, "D"],
  [45, "E2"], [40, "E3"], [35, "E4"], [0, "E5"],
];

/**
 * Returns the grade string for a given total and class level.
 * @param {number} total
 * @param {"basic_7_9"|"basic_1_6"|"nursery_kg"} level
 */
export const gradeFromTotal = (total, level = "basic_7_9") => {
  const thresholds =
    level === "basic_1_6" || level === "nursery_kg"
      ? THRESHOLDS_B16
      : THRESHOLDS_B79;
  for (const [min, grade] of thresholds) {
    if (total >= min) return grade;
  }
  return thresholds[thresholds.length - 1][1];
};

// ── Formatting helpers ────────────────────────────────────────────────────

/**
 * Ordinal formatter: 1 → "1st", 2 → "2nd", etc.
 * Returns "—" for null/undefined.
 */
export const fmtPos = (n) => {
  if (n == null) return "—";
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
};

// ── Breakdown label helpers (for the score table tooltip rows) ────────────

export const getReopenBreakdown = (breakdowns, studentId) => {
  const b = breakdowns[studentId]?.reopen;
  if (!b) return null;
  return `${parseFloat(b.reopen_raw) || 0}+${parseFloat(b.rda) || 0}`;
};

export const getCABreakdown = (breakdowns, studentId) => {
  const b = breakdowns[studentId]?.ca;
  if (!b) return null;
  const mgt = parseFloat(b.mgt_raw) || 0;
  return `CA:${calcCAonly(b).toFixed(1)} MGT:${mgt}`;
};

export const getExamsBreakdown = (breakdowns, studentId) => {
  const b = breakdowns[studentId]?.exams;
  if (!b) return null;
  return `raw:${parseFloat(b.exam_raw) || 0}/100`;
};

// ── Character assessment helpers ──────────────────────────────────────────

/**
 * Returns the grade info object for a character score (0–100).
 * Returns null if score is empty/null.
 */
export const charScoreGrade = (score) => {
  if (score === "" || score === null || score === undefined) return null;
  const n = parseFloat(score);
  return (
    CHAR_SCORE_GRADES.find((g) => n >= g.min) ??
    CHAR_SCORE_GRADES[CHAR_SCORE_GRADES.length - 1]
  );
};

/**
 * Returns the grade info for a career skill score.
 * Returns null if score is not a valid number.
 */
export const careerScoreGrade = (score) => {
  const n = parseFloat(score);
  if (isNaN(n)) return null;
  if (n >= 90) return { grade: "A", label: "Excellent", color: "#16a34a", bg: "bg-emerald-100 text-emerald-800" };
  if (n >= 80) return { grade: "B", label: "Very Good", color: "#0284c7", bg: "bg-blue-100 text-blue-800"       };
  if (n >= 60) return { grade: "C", label: "Good",      color: "#0891b2", bg: "bg-cyan-100 text-cyan-800"       };
  if (n >= 50) return { grade: "D", label: "Average",   color: "#ca8a04", bg: "bg-yellow-100 text-yellow-800"   };
  return { grade: "F", label: "Fail", color: "#dc2626", bg: "bg-red-100 text-red-800" };
};

/**
 * Returns the default (blank) state for one student's character assessment form.
 */
export const mkDefaultCharState = () => ({
  cohort: "1st",
  areas: Object.fromEntries(
    ["punctuality", "comportment", "neatness", "studying_habits", "respect_friends", "respect_rules"]
      .map((key) => [key, { score: "", remarks: "" }])
  ),
  career: Object.fromEntries(
    ["instrument", "graphic", "culinary", "fashion", "hairdressing"]
      .map((key) => [key, { score: "", remarks: "", exam: "" }])
  ),
  teacher_name: "",
  teacher_sig:  "",
  teacher_date: "",
  trainer_name: "",
  trainer_sig:  "",
  trainer_date: "",
});

// ── Password strength ─────────────────────────────────────────────────────

/**
 * Returns a strength descriptor for a given password string.
 * Used by ChangePasswordModal.
 */
export const pwStrength = (pw) => {
  if (!pw) return { score: 0, label: "", color: "transparent", w: "0%" };
  let s = 0;
  if (pw.length >= 8)            s++;
  if (/[A-Z]/.test(pw))          s++;
  if (/[0-9]/.test(pw))          s++;
  if (/[^A-Za-z0-9]/.test(pw))  s++;
  const map = [
    { label: "Too short", color: "#f87171", w: "25%"  },
    { label: "Weak",      color: "#fb923c", w: "40%"  },
    { label: "Fair",      color: "#fbbf24", w: "60%"  },
    { label: "Good",      color: "#34d399", w: "80%"  },
    { label: "Strong",    color: "#16a34a", w: "100%" },
  ];
  return { score: s, ...map[Math.min(s, map.length - 1)] };
};

// ── Grade remark lookup ───────────────────────────────────────────────────

/**
 * Convenience wrapper so components don't import GRADE_REMARK directly.
 */
export const getGradeInfo = (grade) => GRADE_REMARK[grade] ?? null;