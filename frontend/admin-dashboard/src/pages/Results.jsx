import React, { useEffect, useState, useCallback, useRef } from "react";
import API from "../services/api";

/* ─────────────────────────────────────────────
   Constants
───────────────────────────────────────────── */
const TERMS = [
  { value: "term1", label: "Term 1" },
  { value: "term2", label: "Term 2" },
  { value: "term3", label: "Term 3" },
];

// FIX: Single source of truth — update here when term changes
const CURRENT_TERM = "term3";
const CURRENT_YEAR = 2026;

const YEARS = [2026, 2025, 2024, 2023, 2022];

const GRADE_REMARK = {
  "1":  { label: "HIGHEST",       color: "#16a34a" },
  "2":  { label: "HIGHER",        color: "#059669" },
  "3":  { label: "HIGH",          color: "#0284c7" },
  "4":  { label: "HIGH AVERAGE",  color: "#0891b2" },
  "5":  { label: "AVERAGE",       color: "#ca8a04" },
  "6":  { label: "LOW AVERAGE",   color: "#ea580c" },
  "7":  { label: "LOW",           color: "#dc2626" },
  "8":  { label: "LOWER",         color: "#b91c1c" },
  "9":  { label: "LOWEST",        color: "#991b1b" },
  "A":  { label: "EXCELLENT",     color: "#16a34a" },
  "B":  { label: "VERY GOOD",     color: "#059669" },
  "C":  { label: "GOOD",          color: "#0284c7" },
  "D":  { label: "HIGH AVERAGE",  color: "#0891b2" },
  "E2": { label: "BELOW AVERAGE", color: "#ea580c" },
  "E3": { label: "LOW",           color: "#dc2626" },
  "E4": { label: "LOWER",         color: "#b91c1c" },
  "E5": { label: "LOWEST",        color: "#991b1b" },
};

const computeScore = (reopen, ca, exams) => {
  const r = parseFloat(reopen) || 0;
  const c = parseFloat(ca)     || 0;
  const e = parseFloat(exams)  || 0;
  return Math.round((r + c + e) * 10) / 10;
};

const computeGrade = (score, level = "basic_7_9") => {
  if (level === "basic_7_9") {
    if (score >= 90) return "1"; if (score >= 80) return "2";
    if (score >= 60) return "3"; if (score >= 55) return "4";
    if (score >= 50) return "5"; if (score >= 45) return "6";
    if (score >= 40) return "7"; if (score >= 35) return "8";
    return "9";
  }
  if (score >= 90) return "A";  if (score >= 80) return "B";
  if (score >= 60) return "C";  if (score >= 55) return "D";
  if (score >= 45) return "E2"; if (score >= 40) return "E3";
  if (score >= 35) return "E4"; return "E5";
};

const getStudentName = (s) =>
  s?.student_name ||
  (s?.first_name ? `${s.first_name} ${s.last_name || ""}`.trim() : null) ||
  s?.admission_number || "Unknown";

const fmtPos = (n) => {
  if (n == null) return "—";
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
};

const GRADE_SCALE_B79 = [
  { range: "90–100", grade: "1",  remark: "HIGHEST" },
  { range: "80–89",  grade: "2",  remark: "HIGHER" },
  { range: "60–79",  grade: "3",  remark: "HIGH" },
  { range: "55–59",  grade: "4",  remark: "HIGH AVG" },
  { range: "50–54",  grade: "5",  remark: "AVERAGE" },
  { range: "45–49",  grade: "6",  remark: "LOW AVG" },
  { range: "40–44",  grade: "7",  remark: "LOW" },
  { range: "35–39",  grade: "8",  remark: "LOWER" },
  { range: "0–34",   grade: "9",  remark: "LOWEST" },
];
const GRADE_SCALE_B16 = [
  { range: "90–100", grade: "A",  remark: "EXCELLENT" },
  { range: "80–89",  grade: "B",  remark: "VERY GOOD" },
  { range: "60–79",  grade: "C",  remark: "GOOD" },
  { range: "55–59",  grade: "D",  remark: "HIGH AVG" },
  { range: "45–49",  grade: "E2", remark: "BELOW AVG" },
  { range: "40–44",  grade: "E3", remark: "LOW" },
  { range: "35–39",  grade: "E4", remark: "LOWER" },
  { range: "0–34",   grade: "E5", remark: "LOWEST" },
];

/* ─────────────────────────────────────────────
   Score Breakdown Helpers
───────────────────────────────────────────── */
const calcReopenScore = (b) => {
  const reopen = Math.min(10, parseFloat(b.reopen_raw) || 0);
  const rda    = Math.min(10, parseFloat(b.rda)        || 0);
  return Math.round((reopen + rda) * 10) / 10;
};

const calcCAonly = (b) => {
  const hw = ["hw1","hw2","hw3","hw4"].reduce((s,k) => s + (parseFloat(b[k]) || 0), 0);
  const cw = ["cw1","cw2","cw3","cw4"].reduce((s,k) => s + (parseFloat(b[k]) || 0), 0);
  const ct = ["ct1","ct2","ct3","ct4"].reduce((s,k) => s + (parseFloat(b[k]) || 0), 0);
  return Math.round(((hw + cw + ct) / 110) * 25 * 10) / 10;
};

const calcMGTScore = (b) => Math.round(Math.min(15, parseFloat(b.mgt_raw) || 0) * 10) / 10;
const calcCAScore  = (b) => Math.round((calcCAonly(b) + calcMGTScore(b)) * 10) / 10;
const calcExamsScore = (b) =>
  Math.round(((parseFloat(b.exam_raw) || 0) / 100) * 40 * 10) / 10;

/* ─────────────────────────────────────────────
   Styles
───────────────────────────────────────────── */
const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap');

  :root {
    --ink:      #0c1117;
    --ink-2:    #1a2232;
    --ink-3:    #253147;
    --steel:    #3d4f6b;
    --muted:    #5f7490;
    --dim:      #8fa3bb;
    --line:     #dde3ec;
    --frost:    #f4f6fa;
    --white:    #ffffff;
    --blue:     #2b5ce6;
    --blue-l:   #eef3fd;
    --blue-d:   #1a3fa3;
    --teal:     #0891b2;
    --teal-l:   #ecfeff;
    --green:    #16a34a;
    --green-l:  #f0fdf4;
    --amber:    #d97706;
    --amber-l:  #fffbeb;
    --red:      #dc2626;
    --red-l:    #fef2f2;
    --violet:   #7c3aed;
    --violet-l: #f5f3ff;
    --radius:   12px;
    --shadow-sm: 0 1px 3px rgba(12,17,23,.07),0 1px 2px rgba(12,17,23,.04);
    --shadow-md: 0 4px 16px rgba(12,17,23,.10),0 1px 4px rgba(12,17,23,.06);
    --shadow-lg: 0 12px 40px rgba(12,17,23,.16),0 4px 12px rgba(12,17,23,.08);
  }

  .res-root * { box-sizing: border-box; margin: 0; padding: 0; }
  .res-root {
    font-family: 'Plus Jakarta Sans', sans-serif;
    background: var(--frost);
    min-height: 100vh;
    color: var(--steel);
  }

  /* ── Header ── */
  .res-header {
    background: var(--ink);
    padding: 0 28px;
    height: 60px;
    display: flex; align-items: center; gap: 14px;
    position: sticky; top: 0; z-index: 30;
    border-bottom: 1px solid rgba(255,255,255,.06);
  }
  .res-header-logo {
    width: 34px; height: 34px;
    background: linear-gradient(135deg,#3b82f6,#6366f1);
    border-radius: 9px;
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
  }
  .res-header h1 { color:#fff; font-size:16px; font-weight:700; letter-spacing:-.2px; }
  .res-header-context {
    margin-left:auto; display:flex; align-items:center; gap:8px;
    font-size:12px; color:rgba(255,255,255,.35);
    font-family:'JetBrains Mono',monospace;
  }
  .res-header-ctx-pill {
    background:rgba(255,255,255,.07); border:1px solid rgba(255,255,255,.1);
    border-radius:6px; padding:3px 10px;
    color:rgba(255,255,255,.55); font-size:11.5px;
  }
  /* Current term badge in header */
  .res-header-term-badge {
    background: linear-gradient(135deg,rgba(43,92,230,.5),rgba(99,102,241,.5));
    border:1px solid rgba(99,102,241,.4);
    border-radius:6px; padding:3px 10px;
    color:#a5b4fc; font-size:11px; font-weight:700;
    letter-spacing:.3px;
  }

  /* ── Body ── */
  .res-body { padding:24px 28px 60px; max-width:1320px; }

  /* ── Filters ── */
  .res-filters {
    background:var(--white); border-radius:var(--radius);
    padding:16px 20px;
    display:flex; flex-wrap:wrap; gap:14px; align-items:flex-end;
    box-shadow:var(--shadow-sm); border:1px solid var(--line);
    margin-bottom:18px;
  }
  .res-filter-group { display:flex; flex-direction:column; gap:5px; }
  .res-filter-group label {
    font-size:10.5px; font-weight:700; color:var(--dim);
    text-transform:uppercase; letter-spacing:.7px;
  }
  .res-select {
    border:1.5px solid var(--line); border-radius:9px;
    padding:8px 32px 8px 12px; font-size:13.5px;
    font-family:'Plus Jakarta Sans',sans-serif;
    color:var(--ink-2);
    background:var(--white)
      url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%238fa3bb' stroke-width='2.5'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")
      no-repeat right 10px center;
    appearance:none; outline:none; min-width:140px;
    cursor:pointer; transition:border-color .15s,box-shadow .15s;
  }
  .res-select:focus { border-color:var(--blue); box-shadow:0 0 0 3px rgba(43,92,230,.1); }
  .res-select-active { border-color:var(--blue); background-color:var(--blue-l); color:var(--blue-d); }
  /* Current term/year highlight */
  .res-select-current { border-color:#6366f1; background-color:#f5f3ff; color:#4338ca; }

  /* ── Tabs ── */
  .res-tabs {
    display:flex; gap:3px;
    background:var(--white); border-radius:10px; padding:4px;
    width:fit-content;
    box-shadow:var(--shadow-sm); border:1px solid var(--line);
    margin-bottom:18px;
  }
  .res-tab {
    padding:7px 20px; border-radius:7px;
    font-size:13px; font-weight:500;
    cursor:pointer; border:none;
    background:transparent; color:var(--muted);
    transition:all .15s; white-space:nowrap;
  }
  .res-tab:hover { color:var(--ink-2); background:var(--frost); }
  .res-tab-active { background:var(--ink); color:#fff; font-weight:700; }

  /* ── Toast ── */
  .res-toast {
    position:fixed; top:72px; right:20px;
    z-index:9999; display:flex; flex-direction:column; gap:8px;
  }
  .res-toast-item {
    padding:11px 16px; border-radius:10px;
    font-size:13.5px; font-weight:500;
    display:flex; align-items:center; gap:10px;
    box-shadow:var(--shadow-md);
    animation:resSlideIn .2s ease;
    min-width:260px; max-width:380px;
  }
  .res-toast-icon {
    width:20px; height:20px; border-radius:50%;
    display:flex; align-items:center; justify-content:center;
    font-size:11px; font-weight:800; flex-shrink:0;
  }
  .res-toast-success { background:var(--green-l); color:#166534; border:1px solid #bbf7d0; }
  .res-toast-success .res-toast-icon { background:#16a34a; color:#fff; }
  .res-toast-error   { background:var(--red-l);   color:#991b1b; border:1px solid #fecaca; }
  .res-toast-error   .res-toast-icon { background:#dc2626; color:#fff; }
  .res-toast-info    { background:var(--blue-l);  color:var(--blue-d); border:1px solid #bfdbfe; }
  .res-toast-info    .res-toast-icon { background:var(--blue); color:#fff; }
  @keyframes resSlideIn { from{opacity:0;transform:translateX(16px)} to{opacity:1;transform:translateX(0)} }

  /* ── Info bar ── */
  .res-info-bar {
    display:flex; align-items:center; justify-content:space-between;
    margin-bottom:14px; flex-wrap:wrap; gap:10px;
  }
  .res-info-bar-left { display:flex; align-items:center; gap:8px; flex-wrap:wrap; }
  .res-badge {
    display:inline-flex; align-items:center; gap:5px;
    padding:4px 10px; border-radius:20px;
    font-size:12px; font-weight:600;
  }
  .res-badge-blue   { background:var(--blue-l);   color:var(--blue-d); }
  .res-badge-green  { background:var(--green-l);  color:#166534; }
  .res-badge-amber  { background:var(--amber-l);  color:#92400e; }
  .res-badge-teal   { background:var(--teal-l);   color:#164e63; }
  .res-badge-violet { background:var(--violet-l); color:#5b21b6; }

  /* ── Table card ── */
  .res-table-card {
    background:var(--white); border-radius:var(--radius);
    box-shadow:var(--shadow-sm); border:1px solid var(--line);
    overflow:hidden;
  }
  .res-table { width:100%; border-collapse:collapse; font-size:13px; }
  .res-table thead tr { background:var(--ink-2); }
  .res-table thead th {
    padding:11px 14px;
    color:rgba(255,255,255,.45); font-size:10px; font-weight:700;
    text-transform:uppercase; letter-spacing:.8px;
    text-align:center; white-space:nowrap;
  }
  .res-table thead th:nth-child(2) { text-align:left; }
  .res-table tbody tr {
    border-bottom:1px solid #f1f5f9;
    transition:background .1s;
  }
  .res-table tbody tr:hover { background:#fafbfd; }
  .res-table tbody tr:last-child { border-bottom:none; }
  .res-table tbody tr.res-row-dirty { background:#fffbeb; }
  .res-table tbody tr.res-row-dirty:hover { background:#fef3c7; }
  .res-table td { padding:9px 14px; text-align:center; color:var(--steel); vertical-align:middle; }
  .res-table td:nth-child(2) { text-align:left; }

  /* ── Score cell ── */
  .res-score-cell { display:flex; flex-direction:column; align-items:center; gap:3px; }
  .res-score-btn {
    min-width:68px; padding:6px 10px; border-radius:8px;
    font-family:'JetBrains Mono',monospace;
    font-size:12.5px; font-weight:600;
    cursor:pointer; border:1.5px solid var(--line);
    background:var(--white); color:var(--ink-2);
    transition:all .15s; text-align:center;
    display:flex; align-items:center; justify-content:center; gap:4px;
    position:relative;
  }
  .res-score-btn:hover { border-color:var(--blue); background:var(--blue-l); color:var(--blue-d); }
  .res-score-btn-filled   { border-color:#93c5fd; background:var(--blue-l); color:var(--blue-d); }
  .res-score-btn-max      { border-color:#86efac; background:var(--green-l); color:var(--green); }
  .res-score-btn-empty    { border-color:var(--line); color:var(--dim); font-weight:400; }
  .res-score-btn-dirty    { border-color:#fcd34d; background:#fffbeb; color:#92400e; }
  .res-score-breakdown    { font-size:10px; color:var(--dim); font-family:'JetBrains Mono',monospace; white-space:nowrap; }

  .res-dirty-dot {
    position:absolute; top:-3px; right:-3px;
    width:8px; height:8px; border-radius:50%;
    background:var(--amber); border:2px solid var(--white);
  }

  .res-grade {
    display:inline-block; padding:3px 9px; border-radius:20px;
    font-size:11px; font-weight:700; letter-spacing:.3px;
    font-family:'JetBrains Mono',monospace;
  }
  .res-total { font-family:'JetBrains Mono',monospace; font-weight:700; font-size:14px; color:var(--blue); }
  .res-total-dash { color:#cbd5e1; }

  /* ── Student name cell ── */
  .res-student-avatar {
    width:30px; height:30px; border-radius:50%;
    display:flex; align-items:center; justify-content:center;
    font-size:11px; font-weight:800; flex-shrink:0;
  }
  .res-student-name { font-weight:600; color:var(--ink-2); font-size:13.5px; }
  .res-saved-label  { font-size:11px; color:var(--blue); display:flex; align-items:center; gap:3px; margin-top:1px; }
  .res-dirty-label  { font-size:11px; color:var(--amber); display:flex; align-items:center; gap:3px; margin-top:1px; }
  .res-saved-dot    { display:inline-block; width:6px; height:6px; border-radius:50%; background:var(--blue); }
  .res-dirty-dot-sm { display:inline-block; width:6px; height:6px; border-radius:50%; background:var(--amber); }

  /* ── Action buttons ── */
  .res-btn-delete {
    padding:4px 10px; border-radius:6px;
    font-size:11.5px; font-weight:600;
    border:1.5px solid #fca5a5; color:var(--red);
    background:transparent; cursor:pointer; transition:all .15s;
    font-family:'Plus Jakarta Sans',sans-serif;
  }
  .res-btn-delete:hover { background:var(--red); color:#fff; border-color:var(--red); }
  .res-btn-delete:disabled { opacity:.4; cursor:not-allowed; }

  .res-btn-save {
    display:flex; align-items:center; gap:8px;
    background:var(--ink); color:#fff;
    border:none; border-radius:10px; padding:11px 26px;
    font-size:14px; font-weight:700;
    font-family:'Plus Jakarta Sans',sans-serif;
    cursor:pointer; transition:all .18s;
    position:relative; overflow:hidden;
  }
  .res-btn-save::before {
    content:''; position:absolute; inset:0;
    background:linear-gradient(135deg,rgba(59,130,246,.15),rgba(99,102,241,.15));
    opacity:0; transition:opacity .2s;
  }
  .res-btn-save:hover:not(:disabled)::before { opacity:1; }
  .res-btn-save:hover:not(:disabled) { transform:translateY(-1px); box-shadow:var(--shadow-md); }
  .res-btn-save:disabled { opacity:.5; cursor:not-allowed; }

  .res-btn-save-wrap {
    display:flex; align-items:center; justify-content:space-between;
    margin-top:16px; flex-wrap:wrap; gap:12px;
  }

  /* ── Save dirty button ── */
  .res-btn-save-dirty {
    display:flex; align-items:center; gap:8px;
    background:linear-gradient(135deg,#f59e0b,#d97706);
    color:#fff; border:none; border-radius:10px; padding:10px 22px;
    font-size:13.5px; font-weight:700;
    font-family:'Plus Jakarta Sans',sans-serif;
    cursor:pointer; transition:all .18s;
    box-shadow:0 3px 12px rgba(217,119,6,.3);
  }
  .res-btn-save-dirty:hover:not(:disabled) { transform:translateY(-1px); box-shadow:0 6px 20px rgba(217,119,6,.4); }
  .res-btn-save-dirty:disabled { opacity:.5; cursor:not-allowed; }

  /* ── Legend ── */
  .res-legend {
    display:flex; flex-wrap:wrap; gap:6px;
    margin-top:14px; padding:14px 16px;
    background:var(--white); border-radius:11px;
    box-shadow:var(--shadow-sm); border:1px solid var(--line);
  }
  .res-legend-item {
    display:flex; align-items:center; gap:5px;
    padding:3px 8px; background:var(--frost);
    border-radius:6px; font-size:11.5px; border:1px solid var(--line);
  }
  .res-legend-range { font-family:'JetBrains Mono',monospace; color:var(--muted); font-size:11px; }

  /* ── Empty / Loading ── */
  .res-empty {
    background:var(--white); border-radius:var(--radius);
    padding:64px 20px; text-align:center;
    box-shadow:var(--shadow-sm); border:1px solid var(--line);
  }
  .res-empty-icon { font-size:40px; margin-bottom:14px; }
  .res-empty h3 { color:var(--ink-2); font-weight:700; font-size:15px; margin-bottom:6px; }
  .res-empty p  { color:var(--dim); font-size:13.5px; }

  .res-loading-overlay { display:flex; align-items:center; gap:10px; padding:16px 0; color:var(--muted); font-size:13.5px; }
  .res-spinner { width:18px; height:18px; border:2.5px solid var(--line); border-top-color:var(--blue); border-radius:50%; animation:resSpin .65s linear infinite; }
  @keyframes resSpin { to{transform:rotate(360deg)} }

  .res-skeleton-row td { padding:12px 14px; }
  .res-skeleton { height:14px; border-radius:6px; background:linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%); background-size:200% 100%; animation:resShimmer 1.4s infinite; }
  @keyframes resShimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }

  /* ── Score guide ── */
  .res-score-guide {
    display:flex; gap:8px; flex-wrap:wrap;
    margin-bottom:14px; align-items:center;
  }
  .res-score-guide-item {
    display:flex; align-items:center; gap:5px;
    padding:4px 11px; background:var(--white); border-radius:20px;
    border:1px solid var(--line); font-size:11.5px;
    box-shadow:0 1px 2px rgba(0,0,0,.04);
  }
  .res-score-guide-dot { width:7px; height:7px; border-radius:50%; flex-shrink:0; }

  /* ── Summary ── */
  .res-summary-table { width:100%; border-collapse:collapse; font-size:13.5px; }
  .res-summary-table thead tr { background:var(--ink-2); }
  .res-summary-table thead th { padding:11px 14px; color:rgba(255,255,255,.45); font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:.8px; }
  .res-summary-table tbody tr { border-bottom:1px solid #f1f5f9; transition:background .1s; cursor:pointer; }
  .res-summary-table tbody tr:hover { background:#fafbfd; }
  .res-summary-row-expanded { background:#f8fafc !important; }
  .res-rank-1 { color:#d97706; font-weight:800; }
  .res-rank-2 { color:#94a3b8; font-weight:700; }
  .res-rank-3 { color:#c2692c; font-weight:700; }
  .res-expand-inner { padding:16px; background:#f8fafc; }
  .res-sub-table { width:100%; border-collapse:collapse; font-size:12.5px; background:var(--white); border-radius:10px; overflow:hidden; }
  .res-sub-table thead { background:var(--ink-3); }
  .res-sub-table thead th { padding:8px 12px; color:rgba(255,255,255,.5); font-size:10.5px; font-weight:600; text-transform:uppercase; letter-spacing:.6px; text-align:center; }
  .res-sub-table thead th:first-child { text-align:left; }
  .res-sub-table tbody tr { border-bottom:1px solid #f1f5f9; }
  .res-sub-table tbody td { padding:8px 12px; text-align:center; color:#475569; }
  .res-sub-table tbody td:first-child { text-align:left; font-weight:500; color:var(--ink-2); }

  /* ── Modal ── */
  .res-modal-backdrop {
    position:fixed; inset:0;
    background:rgba(12,17,23,.6); backdrop-filter:blur(5px);
    z-index:1000; display:flex; align-items:center; justify-content:center; padding:16px;
    animation:resFadeIn .18s ease;
  }
  @keyframes resFadeIn { from{opacity:0} to{opacity:1} }
  .res-modal {
    background:var(--white); border-radius:18px;
    width:100%; max-width:500px;
    box-shadow:var(--shadow-lg);
    animation:resSlideUp .2s ease; overflow:hidden;
    border:1px solid var(--line);
  }
  @keyframes resSlideUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
  .res-modal-header {
    padding:18px 22px 14px; border-bottom:1px solid var(--line);
    display:flex; align-items:center; justify-content:space-between;
    background:var(--ink-2);
  }
  .res-modal-header-left { display:flex; flex-direction:column; gap:2px; }
  .res-modal-title { font-size:15px; font-weight:700; color:#fff; }
  .res-modal-subtitle { font-size:12px; color:rgba(255,255,255,.4); }
  .res-modal-close {
    width:30px; height:30px; border-radius:8px;
    border:1px solid rgba(255,255,255,.12);
    background:rgba(255,255,255,.08); color:rgba(255,255,255,.5);
    cursor:pointer; display:flex; align-items:center; justify-content:center;
    font-size:16px; transition:all .15s; line-height:1;
  }
  .res-modal-close:hover { background:rgba(255,255,255,.15); color:#fff; }
  .res-modal-body {
    padding:20px 22px; display:flex; flex-direction:column; gap:18px;
    max-height:72vh; overflow-y:auto;
  }
  .res-modal-section { display:flex; flex-direction:column; gap:8px; }
  .res-modal-section-label {
    font-size:10.5px; font-weight:700; color:var(--muted);
    text-transform:uppercase; letter-spacing:.7px;
    display:flex; align-items:center; justify-content:space-between;
  }
  .res-modal-inputs { display:flex; gap:8px; flex-wrap:wrap; }
  .res-modal-field { display:flex; flex-direction:column; gap:4px; flex:1; min-width:70px; }
  .res-modal-field label { font-size:11px; color:var(--muted); font-weight:600; }
  .res-modal-field input {
    border:1.5px solid var(--line); border-radius:8px;
    padding:8px 10px; font-family:'JetBrains Mono',monospace;
    font-size:14px; font-weight:600; color:var(--ink-2);
    text-align:center; outline:none; transition:all .15s;
    width:100%; background:var(--frost);
  }
  .res-modal-field input:focus { border-color:var(--blue); background:var(--white); box-shadow:0 0 0 3px rgba(43,92,230,.1); }
  .res-modal-preview {
    background:linear-gradient(135deg,var(--ink) 0%,var(--ink-3) 100%);
    border-radius:12px; padding:14px 18px;
    display:flex; align-items:center; justify-content:space-between; gap:12px; flex-wrap:wrap;
  }
  .res-modal-preview-item { display:flex; flex-direction:column; align-items:center; gap:3px; }
  .res-modal-preview-value { font-family:'JetBrains Mono',monospace; font-size:20px; font-weight:700; color:#fff; line-height:1; }
  .res-modal-preview-label { font-size:10px; color:rgba(255,255,255,.4); font-weight:500; text-transform:uppercase; letter-spacing:.5px; }
  .res-modal-preview-arrow { color:rgba(255,255,255,.3); font-size:16px; }
  .res-modal-preview-final { font-family:'JetBrains Mono',monospace; font-size:26px; font-weight:800; color:#60a5fa; line-height:1; }
  .res-modal-preview-max { font-size:11px; color:rgba(255,255,255,.4); font-weight:500; }
  .res-modal-footer { padding:14px 22px 20px; display:flex; gap:10px; justify-content:flex-end; border-top:1px solid var(--line); }
  .res-modal-btn-cancel {
    padding:9px 20px; border-radius:9px;
    border:1.5px solid var(--line); background:var(--white);
    color:var(--muted); font-size:13.5px; font-weight:600;
    cursor:pointer; transition:all .15s;
    font-family:'Plus Jakarta Sans',sans-serif;
  }
  .res-modal-btn-cancel:hover { border-color:var(--steel); color:var(--ink-2); }
  .res-modal-btn-apply {
    padding:9px 22px; border-radius:9px; border:none;
    background:var(--blue); color:#fff;
    font-size:13.5px; font-weight:700;
    cursor:pointer; transition:all .15s;
    display:flex; align-items:center; gap:8px;
    font-family:'Plus Jakarta Sans',sans-serif;
  }
  .res-modal-btn-apply:hover { background:var(--blue-d); transform:translateY(-1px); box-shadow:0 4px 14px rgba(43,92,230,.3); }
  .res-divider { height:1px; background:var(--line); margin:0 -22px; }
  .res-pill { display:inline-flex; align-items:center; padding:2px 8px; border-radius:20px; font-size:11px; font-weight:700; }
  .res-pill-blue   { background:var(--blue-l);   color:var(--blue-d); }
  .res-pill-green  { background:var(--green-l);  color:#166534; }
  .res-pill-purple { background:var(--violet-l); color:var(--violet); }
  .res-pill-teal   { background:var(--teal-l);   color:#164e63; }

  /* ── Dirty banner ── */
  .res-dirty-banner {
    background:linear-gradient(135deg,#fffbeb,#fef3c7);
    border:1px solid #fcd34d; border-radius:11px;
    padding:12px 16px;
    display:flex; align-items:center; justify-content:space-between; gap:12px;
    margin-bottom:14px; box-shadow:0 2px 8px rgba(217,119,6,.12);
  }
  .res-dirty-banner-left { display:flex; align-items:center; gap:10px; }
  .res-dirty-banner-icon { font-size:18px; flex-shrink:0; }
  .res-dirty-banner-text { font-size:13.5px; font-weight:600; color:#92400e; }
  .res-dirty-banner-sub  { font-size:12px; color:#b45309; margin-top:1px; }

  /* ── Quick-fill toolbar ── */
  .res-quick-fill {
    display:flex; gap:8px; align-items:center; flex-wrap:wrap;
    padding:10px 14px;
    background:var(--frost); border:1px solid var(--line);
    border-radius:10px; margin-bottom:14px;
  }
  .res-quick-fill-label { font-size:11.5px; font-weight:700; color:var(--muted); margin-right:4px; }
  .res-quick-btn {
    padding:5px 12px; border-radius:7px; border:1.5px solid var(--line);
    background:var(--white); color:var(--steel);
    font-size:12px; font-weight:600; cursor:pointer; transition:all .12s;
    font-family:'Plus Jakarta Sans',sans-serif;
  }
  .res-quick-btn:hover { border-color:var(--blue); color:var(--blue); background:var(--blue-l); }

  @media (max-width:700px) {
    .res-body { padding:14px 12px 48px; }
    .res-filters { gap:8px; }
    .res-select { min-width:110px; }
    .res-header { padding:0 14px; }
    .res-modal { max-width:100%; }
    .res-score-btn { min-width:56px; font-size:11px; }
  }
`;

/* ─────────────────────────────────────────────
   Toast hook
───────────────────────────────────────────── */
let toastId = 0;
function useToast() {
  const [toasts, setToasts] = useState([]);
  const add = useCallback((msg, type = "success") => {
    const id = ++toastId;
    setToasts(p => [...p, { id, msg, type }]);
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 3500);
  }, []);
  return { toasts, add };
}

/* ─────────────────────────────────────────────
   REOPEN MODAL
───────────────────────────────────────────── */
function ReopenModal({ studentName, initial, savedScore, onApply, onClose }) {
  const [vals, setVals] = useState({
    reopen_raw: initial?.reopen_raw ?? "",
    rda:        initial?.rda        ?? "",
  });
  const set = (k, v) => setVals(p => ({ ...p, [k]: v }));
  const score = calcReopenScore(vals);

  return (
    <div className="res-modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="res-modal">
        <div className="res-modal-header">
          <div className="res-modal-header-left">
            <p className="res-modal-title">Re-Open Score</p>
            <p className="res-modal-subtitle">{studentName}{savedScore != null ? ` · saved: ${savedScore}` : ""}</p>
          </div>
          <button className="res-modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="res-modal-body">
          <div className="res-modal-preview">
            <div className="res-modal-preview-item">
              <span className="res-modal-preview-final">{score.toFixed(1)}</span>
              <span className="res-modal-preview-max">/ 20</span>
            </div>
            <div className="res-modal-preview-item" style={{marginLeft:"auto",alignItems:"flex-end"}}>
              <span style={{fontSize:"10px",color:"rgba(255,255,255,.4)"}}>Formula</span>
              <span style={{fontSize:"11px",color:"rgba(255,255,255,.5)",fontFamily:"'JetBrains Mono',monospace"}}>Re-Open/10 + RDA/10</span>
            </div>
          </div>
          <div className="res-modal-section">
            <div className="res-modal-section-label">
              Re-Open Assessment
              <span className="res-pill res-pill-blue">max 20 marks</span>
            </div>
            <div className="res-modal-inputs">
              <div className="res-modal-field">
                <label>Re-Open <span style={{color:"#94a3b8",fontWeight:400}}>/10</span></label>
                <input type="number" min="0" max="10" step="0.5" placeholder="0" value={vals.reopen_raw}
                  onChange={e => set("reopen_raw", Math.min(10, Math.max(0, parseFloat(e.target.value)||0)))} autoFocus />
              </div>
              <div style={{display:"flex",alignItems:"center",paddingTop:"18px",color:"#cbd5e1",fontWeight:"700"}}>+</div>
              <div className="res-modal-field">
                <label>RDA <span style={{color:"#94a3b8",fontWeight:400}}>/10</span></label>
                <input type="number" min="0" max="10" step="0.5" placeholder="0" value={vals.rda}
                  onChange={e => set("rda", Math.min(10, Math.max(0, parseFloat(e.target.value)||0)))} />
              </div>
              <div style={{display:"flex",alignItems:"center",paddingTop:"18px",color:"#cbd5e1",fontWeight:"700"}}>=</div>
              <div className="res-modal-field">
                <label style={{color:"var(--blue)"}}>Total /20</label>
                <input readOnly value={score.toFixed(1)}
                  style={{background:"var(--blue-l)",borderColor:"#93c5fd",color:"var(--blue-d)",cursor:"default"}} />
              </div>
            </div>
          </div>
        </div>
        <div className="res-modal-footer">
          <button className="res-modal-btn-cancel" onClick={onClose}>Cancel</button>
          <button className="res-modal-btn-apply" onClick={() => onApply(score, vals)}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
            Apply {score.toFixed(1)} / 20
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   CA / MGT MODAL
───────────────────────────────────────────── */
function CAModal({ studentName, initial, savedScore, onApply, onClose }) {
  const [vals, setVals] = useState({
    hw1: initial?.hw1 ?? "", hw2: initial?.hw2 ?? "", hw3: initial?.hw3 ?? "", hw4: initial?.hw4 ?? "",
    cw1: initial?.cw1 ?? "", cw2: initial?.cw2 ?? "", cw3: initial?.cw3 ?? "", cw4: initial?.cw4 ?? "",
    ct1: initial?.ct1 ?? "", ct2: initial?.ct2 ?? "", ct3: initial?.ct3 ?? "", ct4: initial?.ct4 ?? "",
    mgt_raw: initial?.mgt_raw ?? "",
  });
  const set = (k, v) => setVals(p => ({ ...p, [k]: v }));
  const num = (k) => parseFloat(vals[k]) || 0;
  const hwTotal  = num("hw1")+num("hw2")+num("hw3")+num("hw4");
  const cwTotal  = num("cw1")+num("cw2")+num("cw3")+num("cw4");
  const ctTotal  = num("ct1")+num("ct2")+num("ct3")+num("ct4");
  const caOnly   = calcCAonly(vals);
  const mgtScore = calcMGTScore(vals);
  const combined = calcCAScore(vals);

  const totalField = (val, max) => (
    <div className="res-modal-field">
      <input readOnly value={val.toFixed(1)} style={{background:"var(--blue-l)",borderColor:"#93c5fd",color:"var(--blue-d)",cursor:"default",fontWeight:"700"}} />
      <label style={{color:"#94a3b8",fontSize:"10px",textAlign:"center"}}>/{max}</label>
    </div>
  );

  return (
    <div className="res-modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="res-modal" style={{maxWidth:"580px"}}>
        <div className="res-modal-header">
          <div className="res-modal-header-left">
            <p className="res-modal-title">CA / MGT Score</p>
            <p className="res-modal-subtitle">{studentName}{savedScore != null ? ` · saved: ${savedScore}` : ""} · CA(25%) + MGT(15%) = 40%</p>
          </div>
          <button className="res-modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="res-modal-body">
          <div className="res-modal-preview">
            <div className="res-modal-preview-item">
              <span style={{fontSize:"13px",color:"rgba(255,255,255,.6)",fontFamily:"'JetBrains Mono',monospace"}}>{caOnly.toFixed(1)}/25</span>
              <span className="res-modal-preview-label">CA</span>
            </div>
            <span className="res-modal-preview-arrow">+</span>
            <div className="res-modal-preview-item">
              <span style={{fontSize:"13px",color:"#c4b5fd",fontFamily:"'JetBrains Mono',monospace"}}>{mgtScore.toFixed(1)}/15</span>
              <span className="res-modal-preview-label">MGT</span>
            </div>
            <span className="res-modal-preview-arrow">=</span>
            <div className="res-modal-preview-item">
              <span className="res-modal-preview-final">{combined.toFixed(1)}</span>
              <span className="res-modal-preview-max">/ 40</span>
            </div>
            <div style={{marginLeft:"auto",display:"flex",gap:"10px"}}>
              {[["HW",hwTotal,20],["CW",cwTotal,40],["CT",ctTotal,50]].map(([l,v,m])=>(
                <div key={l} className="res-modal-preview-item">
                  <span style={{fontSize:"11px",color:"rgba(255,255,255,.4)",fontFamily:"'JetBrains Mono',monospace"}}>{v.toFixed(1)}/{m}</span>
                  <span className="res-modal-preview-label">{l}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="res-modal-section">
            <div className="res-modal-section-label">
              <span style={{display:"flex",alignItems:"center",gap:"6px"}}>Continuous Assessment <span className="res-pill res-pill-blue">scaled /25</span></span>
              <span style={{fontWeight:400,color:"#94a3b8"}}>raw total /110</span>
            </div>
            <div style={{marginBottom:"6px"}}>
              <div style={{fontSize:"10px",color:"#94a3b8",fontWeight:"600",marginBottom:"4px",textTransform:"uppercase",letterSpacing:".5px"}}>Homework — 4×5 = /20</div>
              <div className="res-modal-inputs" style={{alignItems:"flex-start"}}>
                {["hw1","hw2","hw3","hw4"].map(k=>(
                  <div className="res-modal-field" key={k}>
                    <label>HW {k.slice(2)}</label>
                    <input type="number" min="0" max="5" step="0.5" placeholder="0" value={vals[k]}
                      onChange={e=>set(k,Math.min(5,Math.max(0,parseFloat(e.target.value)||0)))} />
                  </div>
                ))}
                <div style={{display:"flex",alignItems:"center",paddingTop:"18px",color:"#cbd5e1",fontWeight:"700"}}>=</div>
                {totalField(hwTotal,20)}
              </div>
            </div>
            <div style={{marginBottom:"6px"}}>
              <div style={{fontSize:"10px",color:"#94a3b8",fontWeight:"600",marginBottom:"4px",textTransform:"uppercase",letterSpacing:".5px"}}>Classwork — 4×10 = /40</div>
              <div className="res-modal-inputs" style={{alignItems:"flex-start"}}>
                {["cw1","cw2","cw3","cw4"].map(k=>(
                  <div className="res-modal-field" key={k}>
                    <label>CW {k.slice(2)}</label>
                    <input type="number" min="0" max="10" step="0.5" placeholder="0" value={vals[k]}
                      onChange={e=>set(k,Math.min(10,Math.max(0,parseFloat(e.target.value)||0)))} />
                  </div>
                ))}
                <div style={{display:"flex",alignItems:"center",paddingTop:"18px",color:"#cbd5e1",fontWeight:"700"}}>=</div>
                {totalField(cwTotal,40)}
              </div>
            </div>
            <div>
              <div style={{fontSize:"10px",color:"#94a3b8",fontWeight:"600",marginBottom:"4px",textTransform:"uppercase",letterSpacing:".5px"}}>Class Test — 10+10+10+20 = /50</div>
              <div className="res-modal-inputs" style={{alignItems:"flex-start"}}>
                {[["ct1",10],["ct2",10],["ct3",10],["ct4",20]].map(([k,max])=>(
                  <div className="res-modal-field" key={k}>
                    <label>CT{k.slice(2)} /{max}</label>
                    <input type="number" min="0" max={max} step="0.5" placeholder="0" value={vals[k]}
                      onChange={e=>set(k,Math.min(max,Math.max(0,parseFloat(e.target.value)||0)))} />
                  </div>
                ))}
                <div style={{display:"flex",alignItems:"center",paddingTop:"18px",color:"#cbd5e1",fontWeight:"700"}}>=</div>
                {totalField(ctTotal,50)}
              </div>
            </div>
            <div style={{display:"flex",alignItems:"center",gap:"8px",padding:"8px 12px",background:"var(--blue-l)",borderRadius:"8px",border:"1px solid #bfdbfe"}}>
              <span style={{fontSize:"12px",color:"#64748b"}}>CA raw ({(hwTotal+cwTotal+ctTotal).toFixed(1)}/110) scaled to</span>
              <span style={{fontFamily:"'JetBrains Mono',monospace",fontWeight:"700",color:"var(--blue-d)",fontSize:"15px"}}>{caOnly.toFixed(1)} / 25</span>
            </div>
          </div>

          <div className="res-divider" />

          <div className="res-modal-section">
            <div className="res-modal-section-label">
              <span style={{display:"flex",alignItems:"center",gap:"6px"}}>MGT Test <span className="res-pill res-pill-purple">direct /15</span></span>
            </div>
            <div className="res-modal-inputs">
              <div className="res-modal-field" style={{flex:"none",width:"120px"}}>
                <label>MGT Score <span style={{color:"#94a3b8",fontWeight:400}}>/15</span></label>
                <input type="number" min="0" max="15" step="0.5" placeholder="0" value={vals.mgt_raw}
                  style={{fontSize:"22px",padding:"10px"}}
                  onChange={e=>set("mgt_raw",Math.min(15,Math.max(0,parseFloat(e.target.value)||0)))} autoFocus />
              </div>
            </div>
          </div>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 14px",background:"var(--green-l)",borderRadius:"10px",border:"1px solid #bbf7d0"}}>
            <span style={{fontSize:"13px",color:"#166534",fontWeight:"600"}}>CA + MGT Combined Total</span>
            <span style={{fontFamily:"'JetBrains Mono',monospace",fontWeight:"800",color:"#166534",fontSize:"18px"}}>{combined.toFixed(1)} / 40</span>
          </div>
        </div>
        <div className="res-modal-footer">
          <button className="res-modal-btn-cancel" onClick={onClose}>Cancel</button>
          <button className="res-modal-btn-apply" onClick={() => onApply(combined, vals)}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
            Apply {combined.toFixed(1)} / 40
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   EXAMS MODAL
───────────────────────────────────────────── */
function ExamsModal({ studentName, initial, savedScore, onApply, onClose }) {
  const [examRaw, setExamRaw] = useState(initial?.exam_raw ?? "");
  const raw   = parseFloat(examRaw) || 0;
  const score = Math.round((raw / 100) * 40 * 10) / 10;

  return (
    <div className="res-modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="res-modal" style={{maxWidth:"380px"}}>
        <div className="res-modal-header">
          <div className="res-modal-header-left">
            <p className="res-modal-title">Examination Score</p>
            <p className="res-modal-subtitle">{studentName}{savedScore != null ? ` · saved: ${savedScore}` : ""}</p>
          </div>
          <button className="res-modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="res-modal-body">
          <div className="res-modal-preview">
            <div className="res-modal-preview-item">
              <span className="res-modal-preview-value">{raw.toFixed(1)}</span>
              <span className="res-modal-preview-label">Raw /100</span>
            </div>
            <span className="res-modal-preview-arrow">→</span>
            <div className="res-modal-preview-item">
              <span className="res-modal-preview-final">{score.toFixed(1)}</span>
              <span className="res-modal-preview-max">/ 40</span>
            </div>
            <div className="res-modal-preview-item" style={{marginLeft:"auto",alignItems:"flex-end"}}>
              <span style={{fontSize:"10px",color:"rgba(255,255,255,.4)"}}>Formula</span>
              <span style={{fontSize:"11px",color:"rgba(255,255,255,.5)",fontFamily:"'JetBrains Mono',monospace"}}>(raw/100)×40</span>
            </div>
          </div>
          <div className="res-modal-section">
            <div className="res-modal-section-label">Exam Score <span style={{fontWeight:400,color:"#94a3b8"}}>raw mark out of 100</span></div>
            <div className="res-modal-inputs">
              <div className="res-modal-field" style={{flex:"none",width:"130px"}}>
                <label>Raw Mark /100</label>
                <input type="number" min="0" max="100" step="0.5" placeholder="0" value={examRaw}
                  style={{fontSize:"26px",padding:"12px 10px"}}
                  onChange={e=>setExamRaw(Math.min(100,Math.max(0,parseFloat(e.target.value)||0)))} autoFocus />
              </div>
              <div style={{display:"flex",alignItems:"center",paddingTop:"18px",color:"#cbd5e1",fontWeight:"700",fontSize:"20px"}}>→</div>
              <div className="res-modal-field" style={{flex:"none",width:"90px"}}>
                <label>Scaled /40</label>
                <input readOnly value={score.toFixed(1)}
                  style={{background:"var(--blue-l)",borderColor:"#93c5fd",color:"var(--blue-d)",cursor:"default",fontSize:"26px",padding:"12px 10px"}} />
              </div>
            </div>
          </div>
        </div>
        <div className="res-modal-footer">
          <button className="res-modal-btn-cancel" onClick={onClose}>Cancel</button>
          <button className="res-modal-btn-apply" onClick={() => onApply(score, { exam_raw: raw })}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
            Apply {score.toFixed(1)} / 40
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Breakdown label helpers
───────────────────────────────────────────── */
const getReopenBreakdown = (b) => b ? `${parseFloat(b.reopen_raw)||0}+${parseFloat(b.rda)||0}` : null;
const getCABreakdown     = (b) => b ? `CA:${calcCAonly(b).toFixed(1)} MGT:${parseFloat(b.mgt_raw)||0}` : null;
const getExamsBreakdown  = (b) => b ? `raw:${parseFloat(b.exam_raw)||0}` : null;

/* ─────────────────────────────────────────────
   Main component
───────────────────────────────────────────── */
const Results = () => {
  useEffect(() => {
    if (document.getElementById("res-styles-v3")) return;
    const el = document.createElement("style");
    el.id = "res-styles-v3";
    el.textContent = STYLES;
    document.head.appendChild(el);
  }, []);

  const { toasts, add: toast } = useToast();

  const [tab, setTab]                         = useState("Enter Results");
  const [classes, setClasses]                 = useState([]);
  const [subjects, setSubjects]               = useState([]);
  const [students, setStudents]               = useState([]);
  const [selectedClass, setSelectedClass]     = useState("");
  // FIX: default to current term and year
  const [selectedTerm, setSelectedTerm]       = useState(CURRENT_TERM);
  const [selectedYear, setSelectedYear]       = useState(String(CURRENT_YEAR));
  const [selectedSubject, setSelectedSubject] = useState("");
  const [classLevel, setClassLevel]           = useState("basic_7_9");

  const [scores, setScores]           = useState({});
  const [savedScores, setSavedScores] = useState({});
  const [breakdowns, setBreakdowns]   = useState({});
  const [existingIds, setExistingIds] = useState({});

  const [saving, setSaving]                   = useState(false);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [loadingScores, setLoadingScores]     = useState(false);
  const [deleting, setDeleting]               = useState(null);
  const [summary, setSummary]                 = useState([]);
  const [loadingSummary, setLoadingSummary]   = useState(false);
  const [expandedStudent, setExpandedStudent] = useState(null);
  const [modal, setModal]                     = useState(null);

  // Ref to track the "snapshot" savedScores at the time of the last load
  // so the dirty-check is stable even before the first server response.
  const savedScoresRef = useRef({});

  /* ── Load classes & subjects ── */
  useEffect(() => {
    API.get("/classes/").then(r  => setClasses(r.data.results  || r.data)).catch(() => toast("Failed to load classes.", "error"));
    API.get("/subjects/").then(r => setSubjects(r.data.results || r.data)).catch(() => toast("Failed to load subjects.", "error"));
  }, []);

  /* ── Fetch students when class changes ── */
  useEffect(() => {
    if (!selectedClass) { setStudents([]); return; }
    setLoadingStudents(true);
    API.get(`/students/?school_class=${selectedClass}`)
      .then(r => setStudents(r.data.results || r.data))
      .catch(() => toast("Failed to load students.", "error"))
      .finally(() => setLoadingStudents(false));
  }, [selectedClass]);

  /* ── Load existing scores — MERGE strategy ── */
  const loadExistingScores = useCallback(async (studentsOverride) => {
    if (!selectedClass || !selectedTerm || !selectedSubject) return;
    const studentList = studentsOverride || students;
    if (!studentList.length) return;

    setLoadingScores(true);
    try {
      // FIX: always pass year param
      const res = await API.get(
        `/results/?school_class=${selectedClass}&term=${selectedTerm}&subject=${selectedSubject}&year=${selectedYear}`
      );
      const records = res.data.results || res.data;

      const serverMap = {};
      const idMap     = {};
      records.forEach(r => {
        serverMap[r.student] = {
          reopen: r.reopen ?? "",
          ca:     r.ca     ?? "",
          exams:  r.exams  ?? "",
        };
        idMap[r.student] = r.id;
      });

      // Capture server values as the new "saved" baseline
      const newSaved = {};
      studentList.forEach(s => {
        newSaved[s.id] = serverMap[s.id] || { reopen: "", ca: "", exams: "" };
      });
      setSavedScores(newSaved);
      savedScoresRef.current = newSaved;

      // Merge: keep locally-entered values that differ from the *previous* saved baseline
      setScores(prev => {
        const next = {};
        studentList.forEach(s => {
          const server   = serverMap[s.id]         || { reopen: "", ca: "", exams: "" };
          const local    = prev[s.id]              || {};
          const prevSaved = savedScoresRef.current[s.id] || {};
          next[s.id] = {
            reopen: local.reopen !== undefined && String(local.reopen) !== String(prevSaved.reopen) ? local.reopen : server.reopen,
            ca:     local.ca     !== undefined && String(local.ca)     !== String(prevSaved.ca)     ? local.ca     : server.ca,
            exams:  local.exams  !== undefined && String(local.exams)  !== String(prevSaved.exams)  ? local.exams  : server.exams,
          };
        });
        return next;
      });

      setExistingIds(idMap);
      if (records.length > 0)
        toast(`Loaded ${records.length} saved result${records.length !== 1 ? "s" : ""}.`, "info");
    } catch {
      toast("Failed to load existing scores.", "error");
    } finally {
      setLoadingScores(false);
    }
  }, [selectedClass, selectedTerm, selectedSubject, selectedYear, students]);

  useEffect(() => {
    if (!selectedSubject) { setScores({}); setSavedScores({}); setExistingIds({}); return; }
    if (selectedClass && students.length) loadExistingScores();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSubject, selectedTerm, selectedYear]);

  useEffect(() => {
    if (students.length && selectedSubject && selectedClass && selectedTerm) {
      loadExistingScores(students);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [students]);

  /* ── Summary tab ── */
  useEffect(() => {
    if (tab !== "Class Summary" || !selectedClass || !selectedTerm) return;
    setLoadingSummary(true);
    // FIX: pass year to summary endpoint
    API.get(`/results/summary/?school_class=${selectedClass}&term=${selectedTerm}&year=${selectedYear}`)
      .then(r => setSummary(r.data))
      .catch(() => toast("Failed to load summary.", "error"))
      .finally(() => setLoadingSummary(false));
  }, [tab, selectedClass, selectedTerm, selectedYear]);

  /* ── Handlers ── */
  const handleClassChange = (e) => {
    const id = e.target.value;
    setSelectedClass(id);
    setSelectedSubject("");
    setScores({}); setSavedScores({}); setExistingIds({});
    setStudents([]); setSummary([]);
    setExpandedStudent(null); setBreakdowns({});
    const found = classes.find(c => String(c.id) === String(id));
    setClassLevel(found?.level || "basic_7_9");
  };

  const applyReopen = (score, breakdown) => {
    const { studentId } = modal;
    setScores(prev => ({ ...prev, [studentId]: { ...(prev[studentId] || {}), reopen: score } }));
    setBreakdowns(prev => ({ ...prev, [studentId]: { ...(prev[studentId] || {}), reopen: breakdown } }));
    setModal(null);
  };

  const applyCA = (score, breakdown) => {
    const { studentId } = modal;
    setScores(prev => ({ ...prev, [studentId]: { ...(prev[studentId] || {}), ca: score } }));
    setBreakdowns(prev => ({ ...prev, [studentId]: { ...(prev[studentId] || {}), ca: breakdown } }));
    setModal(null);
  };

  const applyExams = (score, breakdown) => {
    const { studentId } = modal;
    setScores(prev => ({ ...prev, [studentId]: { ...(prev[studentId] || {}), exams: score } }));
    setBreakdowns(prev => ({ ...prev, [studentId]: { ...(prev[studentId] || {}), exams: breakdown } }));
    setModal(null);
  };

  /* ── Delete ── */
  const handleDeleteResult = async (studentId) => {
    const id = existingIds[studentId];
    if (!id) return;
    if (!window.confirm("Delete this student's result for the selected subject and term?")) return;
    setDeleting(studentId);
    try {
      await API.delete(`/results/${id}/`);
      const empty = { reopen: "", ca: "", exams: "" };
      setScores(prev  => ({ ...prev,  [studentId]: empty }));
      setSavedScores(prev => ({ ...prev, [studentId]: empty }));
      setExistingIds(prev => { const n = { ...prev }; delete n[studentId]; return n; });
      setBreakdowns(prev  => { const n = { ...prev }; delete n[studentId]; return n; });
      toast("Result deleted.", "info");
    } catch {
      toast("Failed to delete result.", "error");
    } finally {
      setDeleting(null);
    }
  };

  /* ── Submit ──
     FIX: endpoint is /results/bulk-save/ (matches DRF @action url_path="bulk-save")
     FIX: always send year in payload
  ── */
  const submitResults = async () => {
    if (!selectedClass || !selectedTerm || !selectedSubject) {
      toast("Please select class, term, and subject.", "error"); return;
    }

    const records = Object.entries(scores)
      .filter(([, v]) => v.reopen !== "" || v.ca !== "" || v.exams !== "")
      .map(([studentId, v]) => {
        const sv = savedScores[studentId] || {};
        return {
          student:      parseInt(studentId, 10),
          subject:      parseInt(selectedSubject, 10),
          school_class: parseInt(selectedClass, 10),
          term:         selectedTerm,
          year:         parseInt(selectedYear, 10),  // FIX: always send year
          // Partial-save safe: only send a field if it has a value; backend preserves the rest
          ...(v.reopen !== "" ? { reopen: parseFloat(v.reopen) } : sv.reopen !== "" ? { reopen: parseFloat(sv.reopen) } : { reopen: 0 }),
          ...(v.ca     !== "" ? { ca:     parseFloat(v.ca)     } : sv.ca     !== "" ? { ca:     parseFloat(sv.ca)     } : { ca:     0 }),
          ...(v.exams  !== "" ? { exams:  parseFloat(v.exams)  } : sv.exams  !== "" ? { exams:  parseFloat(sv.exams)  } : { exams:  0 }),
        };
      });

    if (!records.length) { toast("No scores entered.", "error"); return; }

    setSaving(true);
    try {
      // FIX: correct endpoint URL — matches @action url_path="bulk-save"
      const res = await API.post("/results/bulk-save/", records);
      const errCount = res.data.errors?.length || 0;
      if (errCount === 0) {
        toast(`Saved ${res.data.saved} result${res.data.saved !== 1 ? "s" : ""} successfully.`, "success");
      } else {
        toast(`Saved ${res.data.saved} with ${errCount} error(s).`, "info");
        if (errCount > 0) console.error("Bulk save errors:", res.data.errors);
      }
      await loadExistingScores();
    } catch (err) {
      toast(err.response?.data?.detail || "Error saving results.", "error");
      console.error("Submit error:", err.response?.data);
    } finally {
      setSaving(false);
    }
  };

  /* ── Derived values ── */
  const isDirty = (studentId) => {
    const current = scores[studentId]      || {};
    const saved   = savedScores[studentId] || {};
    return (
      String(current.reopen ?? "") !== String(saved.reopen ?? "") ||
      String(current.ca     ?? "") !== String(saved.ca     ?? "") ||
      String(current.exams  ?? "") !== String(saved.exams  ?? "")
    );
  };

  const dirtyCount  = students.filter(s => isDirty(s.id)).length;
  const filledCount = Object.values(scores).filter(v => v?.reopen !== "" || v?.ca !== "" || v?.exams !== "").length;
  const savedCount  = Object.keys(existingIds).length;
  const gradeScale  = classLevel === "basic_7_9" ? GRADE_SCALE_B79 : GRADE_SCALE_B16;

  const selectedClassName   = classes.find(c  => String(c.id) === String(selectedClass))?.name   || "";
  const selectedSubjectName = subjects.find(s => String(s.id) === String(selectedSubject))?.name || "";
  const selectedTermLabel   = TERMS.find(t => t.value === selectedTerm)?.label || "";

  const editIcon = (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
      <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
    </svg>
  );
  const addIcon = (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <circle cx="12" cy="12" r="10"/><path d="M12 8v8M8 12h8"/>
    </svg>
  );

  const filtersSet = selectedClass && selectedSubject;
  const isCurrentTermYear = selectedTerm === CURRENT_TERM && selectedYear === String(CURRENT_YEAR);

  return (
    <div className="res-root">

      {/* Modals */}
      {modal?.type === "reopen" && (
        <ReopenModal
          studentName={modal.studentName}
          initial={breakdowns[modal.studentId]?.reopen}
          savedScore={savedScores[modal.studentId]?.reopen !== "" ? savedScores[modal.studentId]?.reopen : null}
          onApply={applyReopen}
          onClose={() => setModal(null)}
        />
      )}
      {modal?.type === "ca" && (
        <CAModal
          studentName={modal.studentName}
          initial={breakdowns[modal.studentId]?.ca}
          savedScore={savedScores[modal.studentId]?.ca !== "" ? savedScores[modal.studentId]?.ca : null}
          onApply={applyCA}
          onClose={() => setModal(null)}
        />
      )}
      {modal?.type === "exams" && (
        <ExamsModal
          studentName={modal.studentName}
          initial={breakdowns[modal.studentId]?.exams}
          savedScore={savedScores[modal.studentId]?.exams !== "" ? savedScores[modal.studentId]?.exams : null}
          onApply={applyExams}
          onClose={() => setModal(null)}
        />
      )}

      {/* Toast */}
      <div className="res-toast">
        {toasts.map(t => (
          <div key={t.id} className={`res-toast-item res-toast-${t.type}`}>
            <div className="res-toast-icon">{t.type === "success" ? "✓" : t.type === "error" ? "✕" : "i"}</div>
            {t.msg}
          </div>
        ))}
      </div>

      {/* Header */}
      <div className="res-header">
        <div className="res-header-logo">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2">
            <path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/>
          </svg>
        </div>
        <h1>Results Entry</h1>
        {isCurrentTermYear && (
          <span className="res-header-term-badge">● TERM 3 · 2026</span>
        )}
        <div className="res-header-context">
          {selectedClassName   && <span className="res-header-ctx-pill">{selectedClassName}</span>}
          {selectedSubjectName && <span className="res-header-ctx-pill">{selectedSubjectName}</span>}
          {selectedTermLabel   && <span className="res-header-ctx-pill">{selectedTermLabel} {selectedYear}</span>}
        </div>
      </div>

      <div className="res-body">

        {/* Filters */}
        <div className="res-filters">
          <div className="res-filter-group">
            <label>Year</label>
            <select
              className={`res-select ${selectedYear === String(CURRENT_YEAR) ? "res-select-current" : selectedYear ? "res-select-active" : ""}`}
              value={selectedYear} onChange={e => setSelectedYear(e.target.value)}>
              {YEARS.map(y => <option key={y} value={y}>{y}{y === CURRENT_YEAR ? " (current)" : ""}</option>)}
            </select>
          </div>
          <div className="res-filter-group">
            <label>Term</label>
            <select
              className={`res-select ${selectedTerm === CURRENT_TERM ? "res-select-current" : selectedTerm ? "res-select-active" : ""}`}
              value={selectedTerm} onChange={e => setSelectedTerm(e.target.value)}>
              {TERMS.map(t => <option key={t.value} value={t.value}>{t.label}{t.value === CURRENT_TERM ? " (current)" : ""}</option>)}
            </select>
          </div>
          <div className="res-filter-group">
            <label>Class</label>
            <select className={`res-select ${selectedClass ? "res-select-active" : ""}`}
              value={selectedClass} onChange={handleClassChange}>
              <option value="">Select Class</option>
              {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          {tab === "Enter Results" && (
            <div className="res-filter-group">
              <label>Subject</label>
              <select className={`res-select ${selectedSubject ? "res-select-active" : ""}`}
                value={selectedSubject} onChange={e => setSelectedSubject(e.target.value)}>
                <option value="">Select Subject</option>
                {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          )}
        </div>

        {/* Tabs */}
        {selectedClass && (
          <div className="res-tabs">
            {["Enter Results", "Class Summary"].map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={`res-tab ${tab === t ? "res-tab-active" : ""}`}>{t}</button>
            ))}
          </div>
        )}

        {/* ════ ENTER RESULTS ════ */}
        {tab === "Enter Results" && (
          <>
            {!selectedClass && (
              <div className="res-empty">
                <div className="res-empty-icon">🏫</div>
                <h3>Select a class to begin</h3>
                <p>Choose a year, term, class and subject to load or enter results.</p>
              </div>
            )}
            {selectedClass && !selectedSubject && !loadingStudents && (
              <div className="res-empty">
                <div className="res-empty-icon">📚</div>
                <h3>Select a subject</h3>
                <p>Choose a subject above to load existing results or enter new ones.</p>
              </div>
            )}

            {filtersSet && (
              <>
                {/* Unsaved-changes banner */}
                {dirtyCount > 0 && !saving && (
                  <div className="res-dirty-banner">
                    <div className="res-dirty-banner-left">
                      <span className="res-dirty-banner-icon">⚠️</span>
                      <div>
                        <div className="res-dirty-banner-text">
                          {dirtyCount} student{dirtyCount !== 1 ? "s" : ""} with unsaved changes
                        </div>
                        <div className="res-dirty-banner-sub">
                          You can keep entering scores and save everything at once below.
                        </div>
                      </div>
                    </div>
                    <button className="res-btn-save-dirty" onClick={submitResults} disabled={saving}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/>
                      </svg>
                      Save {dirtyCount} Change{dirtyCount !== 1 ? "s" : ""}
                    </button>
                  </div>
                )}

                {/* Status bar */}
                <div className="res-info-bar">
                  <div className="res-info-bar-left">
                    <span className="res-badge res-badge-blue">
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
                      {students.length} students
                    </span>
                    {filledCount > 0 && <span className="res-badge res-badge-amber">✏ {filledCount} filled</span>}
                    {savedCount  > 0 && <span className="res-badge res-badge-green">✓ {savedCount} saved</span>}
                    {dirtyCount  > 0 && <span className="res-badge res-badge-amber">⚡ {dirtyCount} unsaved</span>}
                    {loadingScores && (
                      <div className="res-loading-overlay" style={{padding:"0"}}>
                        <div className="res-spinner" style={{width:"14px",height:"14px"}}/>
                        <span style={{fontSize:"12px"}}>Loading…</span>
                      </div>
                    )}
                  </div>
                  <div style={{fontSize:"12px",color:"var(--dim)",display:"flex",alignItems:"center",gap:"6px"}}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4m0 4h.01"/></svg>
                    Click any score cell to enter breakdown
                  </div>
                </div>

                {/* Scoring guide */}
                <div className="res-score-guide">
                  {[
                    {label:"Re-Open", color:"#3b82f6", detail:"/10 + RDA/10 = /20"},
                    {label:"CA",      color:"#0891b2", detail:"hw/cw/ct → scaled /25"},
                    {label:"MGT",     color:"#7c3aed", detail:"direct /15"},
                    {label:"Exams",   color:"#16a34a", detail:"raw/100 × 40"},
                  ].map(({ label, color, detail }) => (
                    <div key={label} className="res-score-guide-item">
                      <span className="res-score-guide-dot" style={{background:color}}/>
                      <strong style={{color}}>{label}</strong>
                      <span style={{color:"var(--dim)"}}>{detail}</span>
                    </div>
                  ))}
                  <div style={{marginLeft:"auto",display:"flex",alignItems:"center",gap:"6px",fontSize:"11.5px",color:"var(--dim)"}}>
                    <span style={{width:"8px",height:"8px",borderRadius:"50%",background:"var(--amber)",display:"inline-block"}}/>
                    Yellow row = unsaved local changes
                  </div>
                </div>

                {loadingStudents ? (
                  <div className="res-table-card">
                    <table className="res-table"><tbody>
                      {[...Array(5)].map((_, i) => (
                        <tr key={i} className="res-skeleton-row">
                          {[...Array(9)].map((__,j) => (
                            <td key={j}><div className="res-skeleton" style={{width:j===1?"120px":"60px"}}/></td>
                          ))}
                        </tr>
                      ))}
                    </tbody></table>
                  </div>
                ) : students.length === 0 ? (
                  <div className="res-empty">
                    <div className="res-empty-icon">👤</div>
                    <h3>No students found</h3>
                    <p>No students are assigned to this class.</p>
                  </div>
                ) : (
                  <div className="res-table-card">
                    <table className="res-table">
                      <thead>
                        <tr>
                          <th>#</th>
                          <th style={{textAlign:"left"}}>Student</th>
                          <th>RE-OPEN<br/><span style={{fontWeight:400,fontSize:"10px",opacity:.5}}>/20 (click)</span></th>
                          <th>CA / MGT<br/><span style={{fontWeight:400,fontSize:"10px",opacity:.5}}>/40 (click)</span></th>
                          <th>EXAMS<br/><span style={{fontWeight:400,fontSize:"10px",opacity:.5}}>/40 (click)</span></th>
                          <th>TOTAL<br/><span style={{fontWeight:400,fontSize:"10px",opacity:.5}}>/100</span></th>
                          <th>GRADE</th>
                          <th>REMARK</th>
                          <th>ACTION</th>
                        </tr>
                      </thead>
                      <tbody>
                        {students.map((student, i) => {
                          const s        = scores[student.id]      || { reopen: "", ca: "", exams: "" };
                          const sv       = savedScores[student.id] || { reopen: "", ca: "", exams: "" };
                          const rowDirty = isDirty(student.id);
                          const dirty    = (field) => String(s[field] ?? "") !== String(sv[field] ?? "") && s[field] !== "";
                          const hasFill  = s.reopen !== "" || s.ca !== "" || s.exams !== "";
                          const total    = hasFill ? computeScore(s.reopen, s.ca, s.exams) : null;
                          const grade    = total != null ? computeGrade(total, classLevel) : null;
                          const info     = grade ? GRADE_REMARK[grade] : null;
                          const isSaved  = !!existingIds[student.id];
                          const name     = getStudentName(student);

                          const btnClass = (field, val) => {
                            if (val === "" || val === 0) return "res-score-btn-empty";
                            const max = { reopen: 20, ca: 40, exams: 40 }[field];
                            if (parseFloat(val) === max) return "res-score-btn-max";
                            if (dirty(field)) return "res-score-btn-dirty";
                            return "res-score-btn-filled";
                          };

                          return (
                            <tr key={student.id} className={rowDirty ? "res-row-dirty" : ""}>
                              <td style={{color:"var(--dim)",fontFamily:"'JetBrains Mono',monospace",fontSize:"12px"}}>{i+1}</td>
                              <td>
                                <div style={{display:"flex",alignItems:"center",gap:"8px"}}>
                                  <div className="res-student-avatar"
                                    style={{background:`hsl(${(student.id*47)%360},50%,88%)`,color:`hsl(${(student.id*47)%360},50%,35%)`}}>
                                    {name.charAt(0)}
                                  </div>
                                  <div>
                                    <div className="res-student-name">{name}</div>
                                    {rowDirty
                                      ? <div className="res-dirty-label"><span className="res-dirty-dot-sm"/>unsaved changes</div>
                                      : isSaved
                                        ? <div className="res-saved-label"><span className="res-saved-dot"/>saved</div>
                                        : null
                                    }
                                  </div>
                                </div>
                              </td>

                              {/* RE-OPEN */}
                              <td>
                                <div className="res-score-cell">
                                  <button
                                    className={`res-score-btn ${btnClass("reopen", s.reopen)}`}
                                    onClick={() => setModal({ type:"reopen", studentId:student.id, studentName:name })}
                                  >
                                    {dirty("reopen") && <span className="res-dirty-dot"/>}
                                    {s.reopen !== "" && s.reopen !== 0
                                      ? <>{editIcon}{parseFloat(s.reopen).toFixed(1)}</>
                                      : <>{addIcon}Enter</>}
                                  </button>
                                  {breakdowns[student.id]?.reopen &&
                                    <span className="res-score-breakdown">{getReopenBreakdown(breakdowns[student.id].reopen)}</span>}
                                  {sv.reopen !== "" && dirty("reopen") &&
                                    <span style={{fontSize:"10px",color:"var(--dim)"}}>was: {sv.reopen}</span>}
                                </div>
                              </td>

                              {/* CA/MGT */}
                              <td>
                                <div className="res-score-cell">
                                  <button
                                    className={`res-score-btn ${btnClass("ca", s.ca)}`}
                                    onClick={() => setModal({ type:"ca", studentId:student.id, studentName:name })}
                                  >
                                    {dirty("ca") && <span className="res-dirty-dot"/>}
                                    {s.ca !== "" && s.ca !== 0
                                      ? <>{editIcon}{parseFloat(s.ca).toFixed(1)}</>
                                      : <>{addIcon}Enter</>}
                                  </button>
                                  {breakdowns[student.id]?.ca &&
                                    <span className="res-score-breakdown">{getCABreakdown(breakdowns[student.id].ca)}</span>}
                                  {sv.ca !== "" && dirty("ca") &&
                                    <span style={{fontSize:"10px",color:"var(--dim)"}}>was: {sv.ca}</span>}
                                </div>
                              </td>

                              {/* EXAMS */}
                              <td>
                                <div className="res-score-cell">
                                  <button
                                    className={`res-score-btn ${btnClass("exams", s.exams)}`}
                                    onClick={() => setModal({ type:"exams", studentId:student.id, studentName:name })}
                                  >
                                    {dirty("exams") && <span className="res-dirty-dot"/>}
                                    {s.exams !== "" && s.exams !== 0
                                      ? <>{editIcon}{parseFloat(s.exams).toFixed(1)}</>
                                      : <>{addIcon}Enter</>}
                                  </button>
                                  {breakdowns[student.id]?.exams &&
                                    <span className="res-score-breakdown">{getExamsBreakdown(breakdowns[student.id].exams)}</span>}
                                  {sv.exams !== "" && dirty("exams") &&
                                    <span style={{fontSize:"10px",color:"var(--dim)"}}>was: {sv.exams}</span>}
                                </div>
                              </td>

                              <td>{total != null ? <span className="res-total">{total}</span> : <span className="res-total-dash">—</span>}</td>
                              <td>
                                {grade
                                  ? <span className="res-grade" style={{background:`${info.color}18`,color:info.color}}>{grade}</span>
                                  : <span style={{color:"#e2e8f0"}}>—</span>}
                              </td>
                              <td style={{fontSize:"12px",color:info ? info.color : "#cbd5e1"}}>{info ? info.label : "—"}</td>
                              <td>
                                {isSaved && (
                                  <button className="res-btn-delete"
                                    onClick={() => handleDeleteResult(student.id)}
                                    disabled={deleting === student.id}>
                                    {deleting === student.id ? "…" : "Delete"}
                                  </button>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}

                {students.length > 0 && (
                  <>
                    <div className="res-legend">
                      <span style={{fontSize:"11px",fontWeight:"700",color:"var(--steel)",marginRight:"4px",alignSelf:"center"}}>GRADE SCALE:</span>
                      {gradeScale.map(item => (
                        <div key={item.grade} className="res-legend-item">
                          <span className="res-grade"
                            style={{background:`${GRADE_REMARK[item.grade]?.color}18`,color:GRADE_REMARK[item.grade]?.color,padding:"1px 6px"}}>
                            {item.grade}
                          </span>
                          <span className="res-legend-range">{item.range}</span>
                        </div>
                      ))}
                    </div>

                    <div className="res-btn-save-wrap">
                      <div style={{fontSize:"13px",color:"var(--dim)"}}>
                        {filledCount === 0
                          ? "Click any score cell to enter breakdown details"
                          : `${filledCount} of ${students.length} students have scores · ${dirtyCount > 0 ? `${dirtyCount} unsaved` : "all saved"}`}
                      </div>
                      <button className="res-btn-save" onClick={submitResults} disabled={saving || dirtyCount === 0}>
                        {saving
                          ? <><div className="res-spinner" style={{borderTopColor:"#fff",width:"16px",height:"16px"}}/>Saving…</>
                          : <>
                              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                                <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/>
                                <polyline points="17 21 17 13 7 13 7 21"/>
                                <polyline points="7 3 7 8 15 8"/>
                              </svg>
                              Save {dirtyCount > 0 ? `${dirtyCount} Change${dirtyCount !== 1 ? "s" : ""}` : "Results"}
                            </>}
                      </button>
                    </div>
                  </>
                )}
              </>
            )}
          </>
        )}

        {/* ════ CLASS SUMMARY ════ */}
        {tab === "Class Summary" && (
          <>
            {!selectedClass && (
              <div className="res-empty">
                <div className="res-empty-icon">📊</div>
                <h3>Select a class</h3>
                <p>Choose a class and term to view the ranked summary.</p>
              </div>
            )}
            {loadingSummary && (
              <div className="res-loading-overlay">
                <div className="res-spinner"/>Loading summary…
              </div>
            )}
            {!loadingSummary && selectedClass && summary.length === 0 && (
              <div className="res-empty">
                <div className="res-empty-icon">📭</div>
                <h3>No results yet</h3>
                <p>No results found for this class and term.</p>
              </div>
            )}
            {!loadingSummary && summary.length > 0 && (
              <div className="res-table-card">
                <table className="res-summary-table">
                  <thead>
                    <tr>
                      <th style={{textAlign:"center",width:"60px"}}>RANK</th>
                      <th style={{textAlign:"left"}}>STUDENT</th>
                      <th style={{textAlign:"center"}}>SUBJECTS</th>
                      <th style={{textAlign:"center"}}>TOTAL</th>
                      <th style={{textAlign:"center"}}>AVG</th>
                      <th style={{textAlign:"center"}}>GRADE</th>
                      <th style={{textAlign:"center"}}>DETAILS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.map(row => (
                      <React.Fragment key={row.student_id}>
                        <tr
                          onClick={() => setExpandedStudent(expandedStudent === row.student_id ? null : row.student_id)}
                          className={expandedStudent === row.student_id ? "res-summary-row-expanded" : ""}
                          style={{color:"var(--steel)"}}
                        >
                          <td style={{textAlign:"center"}}>
                            <span className={row.rank===1?"res-rank-1":row.rank===2?"res-rank-2":row.rank===3?"res-rank-3":""}
                              style={{fontFamily:"'JetBrains Mono',monospace",fontSize:"13px"}}>
                              {row.rank===1?"🥇":row.rank===2?"🥈":row.rank===3?"🥉":`#${row.rank}`}
                            </span>
                          </td>
                          <td>
                            <div style={{fontWeight:"600",color:"var(--ink-2)"}}>{row.student_name}</div>
                            <div style={{fontSize:"11.5px",color:"var(--dim)",fontFamily:"'JetBrains Mono',monospace"}}>{row.admission_number}</div>
                          </td>
                          <td style={{textAlign:"center",color:"var(--muted)"}}>{row.subject_count}</td>
                          <td style={{textAlign:"center",fontFamily:"'JetBrains Mono',monospace",fontWeight:"700",color:"var(--blue)"}}>{row.total_score}</td>
                          <td style={{textAlign:"center",fontFamily:"'JetBrains Mono',monospace",color:"var(--steel)"}}>{row.average_score}</td>
                          <td style={{textAlign:"center"}}>
                            <span className="res-grade"
                              style={{background:`${GRADE_REMARK[row.overall_grade]?.color||"#64748b"}18`,color:GRADE_REMARK[row.overall_grade]?.color||"#64748b"}}>
                              {row.overall_grade}
                            </span>
                          </td>
                          <td style={{textAlign:"center",fontSize:"12px",color:"var(--blue)"}}>
                            {expandedStudent === row.student_id ? "▲ Hide" : "▼ Show"}
                          </td>
                        </tr>
                        {expandedStudent === row.student_id && (
                          <tr>
                            <td colSpan={7} style={{padding:"0",background:"#f8fafc"}}>
                              <div className="res-expand-inner">
                                <table className="res-sub-table">
                                  <thead>
                                    <tr>
                                      <th style={{textAlign:"left"}}>Subject</th>
                                      <th>Re-Open</th><th>CA+MGT</th><th>Exams</th>
                                      <th>Total</th><th>Pos</th><th>Grade</th><th>Remark</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {row.subjects.map(sub => {
                                      const info = GRADE_REMARK[sub.grade];
                                      return (
                                        <tr key={sub.subject_id}>
                                          <td>{sub.subject_name}</td>
                                          <td>{sub.reopen ?? "—"}</td>
                                          <td>{sub.ca     ?? "—"}</td>
                                          <td>{sub.exams  ?? "—"}</td>
                                          <td style={{fontWeight:"700",color:"var(--blue)",fontFamily:"'JetBrains Mono',monospace"}}>{sub.score ?? "—"}</td>
                                          <td style={{color:"var(--muted)"}}>{fmtPos(sub.subject_position)}</td>
                                          <td><span className="res-grade" style={{background:info?`${info.color}18`:"#f1f5f9",color:info?.color||"#64748b",fontSize:"11px"}}>{sub.grade ?? "—"}</span></td>
                                          <td style={{fontSize:"11.5px",color:info?.color||"#94a3b8"}}>{sub.remark ?? "—"}</td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Results;