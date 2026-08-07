import React, { useEffect, useState, useCallback, useRef, useMemo } from "react";
import API from "../services/api";

/* ─────────────────────────────────────────────
   Constants
───────────────────────────────────────────── */
const TERMS = [
  { value: "term1", label: "Term 1" },
  { value: "term2", label: "Term 2" },
  { value: "term3", label: "Term 3" },
];

// FIX: was "term3" — stale after the school moved on to Term 1 2026.
// NOTE: this constant ONLY controls (a) the initial dropdown selection on
// page load and (b) the cosmetic "(current)" label / green header badge.
// It does NOT restrict which term can be selected, edited, or saved —
// the TERMS dropdown always lists all three terms, and submitResults()/
// the bulk-save API call send whatever term/year is currently selected
// with no gating at all. Editing a past term (e.g. Term 3 2026) has
// always been fully supported; only the default/"current" label was wrong.
const CURRENT_TERM = "term1";
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

const GRADE_SCALE_B79 = [
  { range: "90–100", grade: "1",  remark: "HIGHEST"    },
  { range: "80–89",  grade: "2",  remark: "HIGHER"     },
  { range: "60–79",  grade: "3",  remark: "HIGH"       },
  { range: "55–59",  grade: "4",  remark: "HIGH AVG"   },
  { range: "50–54",  grade: "5",  remark: "AVERAGE"    },
  { range: "45–49",  grade: "6",  remark: "LOW AVG"    },
  { range: "40–44",  grade: "7",  remark: "LOW"        },
  { range: "35–39",  grade: "8",  remark: "LOWER"      },
  { range: "0–34",   grade: "9",  remark: "LOWEST"     },
];
const GRADE_SCALE_B16 = [
  { range: "90–100", grade: "A",  remark: "EXCELLENT"  },
  { range: "80–89",  grade: "B",  remark: "VERY GOOD"  },
  { range: "60–79",  grade: "C",  remark: "GOOD"       },
  { range: "55–59",  grade: "D",  remark: "HIGH AVG"   },
  { range: "45–49",  grade: "E2", remark: "BELOW AVG"  },
  { range: "40–44",  grade: "E3", remark: "LOW"        },
  { range: "35–39",  grade: "E4", remark: "LOWER"      },
  { range: "0–34",   grade: "E5", remark: "LOWEST"     },
];

/* ─────────────────────────────────────────────
   Pure helpers (stable, no hooks)
───────────────────────────────────────────── */
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

// Better avatar color hash — avoids clustering for sequential IDs
const avatarHue = (id) => {
  let h = id * 2654435761; // Knuth multiplicative hash
  h = h >>> 0;
  return h % 360;
};

/* ─────────────────────────────────────────────
   Score breakdown helpers
───────────────────────────────────────────── */
const calcReopenScore  = (b) => Math.round((Math.min(10, parseFloat(b.reopen_raw) || 0) + Math.min(10, parseFloat(b.rda) || 0)) * 10) / 10;
const calcCAonly       = (b) => {
  const hw = ["hw1","hw2","hw3","hw4"].reduce((s,k) => s + (parseFloat(b[k]) || 0), 0);
  const cw = ["cw1","cw2","cw3","cw4"].reduce((s,k) => s + (parseFloat(b[k]) || 0), 0);
  const ct = ["ct1","ct2","ct3","ct4"].reduce((s,k) => s + (parseFloat(b[k]) || 0), 0);
  return Math.round(((hw + cw + ct) / 110) * 25 * 10) / 10;
};
const calcMGTScore    = (b) => Math.round(Math.min(15, parseFloat(b.mgt_raw) || 0) * 10) / 10;
const calcCAScore     = (b) => Math.round((calcCAonly(b) + calcMGTScore(b)) * 10) / 10;
const calcExamsScore  = (b) => Math.round(((parseFloat(b.exam_raw) || 0) / 100) * 40 * 10) / 10;

/* ─────────────────────────────────────────────
   Empty student state factory
───────────────────────────────────────────── */
const emptyStudentState = () => ({
  reopen: "", ca: "", exams: "",   // live scores
  savedReopen: "", savedCa: "", savedExams: "",  // server baseline
  rkBreakdown: null, caBreakdown: null, exBreakdown: null,
  existingId: null,
  touched: false,
});

/* ─────────────────────────────────────────────
   Styles (stable constant — not recreated)
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
  .res-header-term-badge {
    background: linear-gradient(135deg,rgba(43,92,230,.5),rgba(99,102,241,.5));
    border:1px solid rgba(99,102,241,.4);
    border-radius:6px; padding:3px 10px;
    color:#a5b4fc; font-size:11px; font-weight:700; letter-spacing:.3px;
  }

  /* ── Layout ── */
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
  .res-select-active  { border-color:var(--blue); background-color:var(--blue-l); color:var(--blue-d); }
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
    pointer-events:none;
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

  /* ── Table ── */
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
    position:relative;
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

  /* ── Th tooltip ── */
  .res-th-tooltip { position:relative; cursor:help; }
  .res-th-tooltip:hover .res-th-tip {
    opacity:1; pointer-events:auto; transform:translateY(0);
  }
  .res-th-tip {
    position:absolute; top:calc(100% + 6px); left:50%; transform:translateX(-50%) translateY(-4px);
    background:var(--ink); color:#e2e8f0;
    font-size:11px; font-weight:500; white-space:nowrap;
    padding:5px 9px; border-radius:7px; letter-spacing:0;
    text-transform:none;
    opacity:0; pointer-events:none;
    transition:opacity .15s,transform .15s;
    z-index:10;
    box-shadow:0 4px 12px rgba(0,0,0,.3);
  }
  .res-th-tip::before {
    content:''; position:absolute; bottom:100%; left:50%; transform:translateX(-50%);
    border:5px solid transparent; border-bottom-color:var(--ink);
  }

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
  .res-score-btn:focus-visible {
    outline:2px solid var(--blue); outline-offset:2px;
  }
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

  /* ── Undo button (row-level) ── */
  .res-btn-undo {
    padding:3px 8px; border-radius:6px; border:1px solid var(--line);
    background:transparent; color:var(--muted);
    font-size:11px; font-weight:600; cursor:pointer; transition:all .12s;
    font-family:'Plus Jakarta Sans',sans-serif; display:inline-flex; align-items:center; gap:4px;
  }
  .res-btn-undo:hover { background:var(--amber-l); border-color:var(--amber); color:#92400e; }

  /* ── Grade + total ── */
  .res-grade {
    display:inline-block; padding:3px 9px; border-radius:20px;
    font-size:11px; font-weight:700; letter-spacing:.3px;
    font-family:'JetBrains Mono',monospace;
  }
  .res-total      { font-family:'JetBrains Mono',monospace; font-weight:700; font-size:14px; color:var(--blue); }
  .res-total-dash { color:#cbd5e1; }

  /* ── Student cell ── */
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
  .res-btn-delete:hover:not(:disabled) { background:var(--red); color:#fff; border-color:var(--red); }
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
  .res-btn-save:focus-visible { outline:2px solid var(--blue); outline-offset:2px; }

  .res-btn-save-wrap {
    display:flex; align-items:center; justify-content:space-between;
    margin-top:16px; flex-wrap:wrap; gap:12px;
  }

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
  .res-btn-save-dirty:focus-visible { outline:2px solid var(--amber); outline-offset:2px; }

  /* ── Grade legend ── */
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

  /* ── Empty states ── */
  .res-empty {
    background:var(--white); border-radius:var(--radius);
    padding:64px 20px; text-align:center;
    box-shadow:var(--shadow-sm); border:1px solid var(--line);
  }
  .res-empty-icon {
    width:52px; height:52px; border-radius:14px;
    background:var(--frost); border:1px solid var(--line);
    display:flex; align-items:center; justify-content:center;
    margin:0 auto 14px; color:var(--dim);
  }
  .res-empty h3 { color:var(--ink-2); font-weight:700; font-size:15px; margin-bottom:6px; }
  .res-empty p  { color:var(--dim); font-size:13.5px; }

  /* ── Loading ── */
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

  /* ── Dirty banner ── */
  .res-dirty-banner {
    background:linear-gradient(135deg,#fffbeb,#fef3c7);
    border:1px solid #fcd34d; border-radius:11px;
    padding:12px 16px;
    display:flex; align-items:center; justify-content:space-between; gap:12px;
    margin-bottom:14px; box-shadow:0 2px 8px rgba(217,119,6,.12);
  }
  .res-dirty-banner-left { display:flex; align-items:center; gap:10px; }
  .res-dirty-banner-icon { flex-shrink:0; color:var(--amber); }
  .res-dirty-banner-text { font-size:13.5px; font-weight:600; color:#92400e; }
  .res-dirty-banner-sub  { font-size:12px; color:#b45309; margin-top:1px; }

  /* ── Progress bar ── */
  .res-progress-wrap { margin-bottom:14px; }
  .res-progress-header { display:flex; justify-content:space-between; font-size:11.5px; color:var(--muted); margin-bottom:5px; font-weight:600; }
  .res-progress-track { height:5px; background:var(--line); border-radius:99px; overflow:hidden; }
  .res-progress-fill  { height:100%; background:linear-gradient(90deg,var(--blue),#6366f1); border-radius:99px; transition:width .3s ease; }

  /* ── Delete confirm dialog ── */
  .res-confirm-backdrop {
    position:fixed; inset:0;
    background:rgba(12,17,23,.5); backdrop-filter:blur(3px);
    z-index:1100; display:flex; align-items:center; justify-content:center; padding:16px;
    animation:resFadeIn .15s ease;
  }
  .res-confirm-box {
    background:var(--white); border-radius:16px;
    padding:24px; max-width:360px; width:100%;
    box-shadow:var(--shadow-lg);
    animation:resSlideUp .18s ease;
    border:1px solid var(--line);
  }
  .res-confirm-icon {
    width:44px; height:44px; border-radius:12px;
    background:var(--red-l); border:1px solid #fecaca;
    display:flex; align-items:center; justify-content:center;
    margin-bottom:14px; color:var(--red);
  }
  .res-confirm-title  { font-size:15px; font-weight:700; color:var(--ink-2); margin-bottom:6px; }
  .res-confirm-body   { font-size:13.5px; color:var(--muted); margin-bottom:20px; line-height:1.5; }
  .res-confirm-footer { display:flex; gap:10px; justify-content:flex-end; }
  .res-confirm-cancel {
    padding:9px 18px; border-radius:9px;
    border:1.5px solid var(--line); background:var(--white);
    color:var(--muted); font-size:13.5px; font-weight:600;
    cursor:pointer; transition:all .15s;
    font-family:'Plus Jakarta Sans',sans-serif;
  }
  .res-confirm-cancel:hover { border-color:var(--steel); color:var(--ink-2); }
  .res-confirm-delete {
    padding:9px 18px; border-radius:9px; border:none;
    background:var(--red); color:#fff;
    font-size:13.5px; font-weight:700;
    cursor:pointer; transition:all .15s;
    font-family:'Plus Jakarta Sans',sans-serif;
  }
  .res-confirm-delete:hover { background:#b91c1c; }
  .res-confirm-delete:disabled { opacity:.5; cursor:not-allowed; }

  /* ── Summary table ── */
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

  /* ── Expand toggle ── */
  .res-expand-toggle {
    display:inline-flex; align-items:center; gap:4px;
    padding:4px 10px; border-radius:6px;
    font-size:12px; font-weight:600; color:var(--blue);
    background:var(--blue-l); border:1px solid #bfdbfe;
    transition:all .15s;
  }
  .res-expand-toggle:hover { background:#dbeafe; }

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
  .res-modal-title    { font-size:15px; font-weight:700; color:#fff; }
  .res-modal-subtitle { font-size:12px; color:rgba(255,255,255,.4); }
  .res-modal-close {
    width:30px; height:30px; border-radius:8px;
    border:1px solid rgba(255,255,255,.12);
    background:rgba(255,255,255,.08); color:rgba(255,255,255,.5);
    cursor:pointer; display:flex; align-items:center; justify-content:center;
    font-size:16px; transition:all .15s; line-height:1;
  }
  .res-modal-close:hover { background:rgba(255,255,255,.15); color:#fff; }
  .res-modal-close:focus-visible { outline:2px solid rgba(255,255,255,.4); outline-offset:2px; }
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
  .res-modal-field input[readOnly] { background:var(--blue-l); border-color:#93c5fd; color:var(--blue-d); cursor:default; }
  .res-modal-preview {
    background:linear-gradient(135deg,var(--ink) 0%,var(--ink-3) 100%);
    border-radius:12px; padding:14px 18px;
    display:flex; align-items:center; justify-content:space-between; gap:12px; flex-wrap:wrap;
  }
  .res-modal-preview-item  { display:flex; flex-direction:column; align-items:center; gap:3px; }
  .res-modal-preview-value { font-family:'JetBrains Mono',monospace; font-size:20px; font-weight:700; color:#fff; line-height:1; }
  .res-modal-preview-label { font-size:10px; color:rgba(255,255,255,.4); font-weight:500; text-transform:uppercase; letter-spacing:.5px; }
  .res-modal-preview-arrow { color:rgba(255,255,255,.3); font-size:16px; }
  .res-modal-preview-final { font-family:'JetBrains Mono',monospace; font-size:26px; font-weight:800; color:#60a5fa; line-height:1; }
  .res-modal-preview-max   { font-size:11px; color:rgba(255,255,255,.4); font-weight:500; }
  .res-modal-footer { padding:14px 22px 20px; display:flex; gap:10px; justify-content:flex-end; border-top:1px solid var(--line); }
  .res-modal-btn-cancel {
    padding:9px 20px; border-radius:9px;
    border:1.5px solid var(--line); background:var(--white);
    color:var(--muted); font-size:13.5px; font-weight:600;
    cursor:pointer; transition:all .15s;
    font-family:'Plus Jakarta Sans',sans-serif;
  }
  .res-modal-btn-cancel:hover { border-color:var(--steel); color:var(--ink-2); }
  .res-modal-btn-cancel:focus-visible { outline:2px solid var(--blue); outline-offset:2px; }
  .res-modal-btn-apply {
    padding:9px 22px; border-radius:9px; border:none;
    background:var(--blue); color:#fff;
    font-size:13.5px; font-weight:700;
    cursor:pointer; transition:all .15s;
    display:flex; align-items:center; gap:8px;
    font-family:'Plus Jakarta Sans',sans-serif;
  }
  .res-modal-btn-apply:hover { background:var(--blue-d); transform:translateY(-1px); box-shadow:0 4px 14px rgba(43,92,230,.3); }
  .res-modal-btn-apply:focus-visible { outline:2px solid var(--blue); outline-offset:2px; }
  .res-divider { height:1px; background:var(--line); margin:0 -22px; }
  .res-pill         { display:inline-flex; align-items:center; padding:2px 8px; border-radius:20px; font-size:11px; font-weight:700; }
  .res-pill-blue    { background:var(--blue-l);   color:var(--blue-d); }
  .res-pill-green   { background:var(--green-l);  color:#166534; }
  .res-pill-purple  { background:var(--violet-l); color:var(--violet); }
  .res-pill-teal    { background:var(--teal-l);   color:#164e63; }

  @media (max-width:700px) {
    .res-body { padding:14px 12px 48px; }
    .res-filters { gap:8px; }
    .res-select { min-width:110px; }
    .res-header { padding:0 14px; }
    .res-modal { max-width:100%; }
    .res-score-btn { min-width:56px; font-size:11px; }
    .res-header-context { display:none; }
  }

  @media (prefers-reduced-motion:reduce) {
    .res-spinner { animation:none; border-top-color:var(--blue); }
    .res-skeleton { animation:none; background:#f1f5f9; }
    * { animation-duration:.01ms !important; transition-duration:.01ms !important; }
  }
`;

/* ─────────────────────────────────────────────
   Toast hook
───────────────────────────────────────────── */
let _toastId = 0;
function useToast() {
  const [toasts, setToasts] = useState([]);
  const add = useCallback((msg, type = "success") => {
    const id = ++_toastId;
    setToasts(p => [...p, { id, msg, type }]);
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 3500);
  }, []);
  return { toasts, add };
}

/* ─────────────────────────────────────────────
   Reusable icons
───────────────────────────────────────────── */
const IconEdit = () => (
  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
    <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
  </svg>
);
const IconAdd = () => (
  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <circle cx="12" cy="12" r="10"/><path d="M12 8v8M8 12h8"/>
  </svg>
);
const IconSave = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
    <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/>
    <polyline points="17 21 17 13 7 13 7 21"/>
    <polyline points="7 3 7 8 15 8"/>
  </svg>
);
const IconCheck = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);
const IconTrash = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="3 6 5 6 21 6"/>
    <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
    <path d="M10 11v6M14 11v6"/>
    <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/>
  </svg>
);
const IconUndo = () => (
  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <path d="M3 7v6h6"/><path d="M21 17a9 9 0 00-9-9 9 9 0 00-6 2.3L3 13"/>
  </svg>
);
const IconWarn = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
    <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
  </svg>
);
const IconSchool = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
    <polyline points="9 22 9 12 15 12 15 22"/>
  </svg>
);
const IconBook = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M4 19.5A2.5 2.5 0 016.5 17H20"/>
    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/>
  </svg>
);
const IconUsers = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
    <circle cx="9" cy="7" r="4"/>
    <path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/>
  </svg>
);
const IconChart = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/>
    <line x1="6" y1="20" x2="6" y2="14"/><line x1="2" y1="20" x2="22" y2="20"/>
  </svg>
);
const IconInbox = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/>
    <path d="M5.45 5.11L2 12v6a2 2 0 002 2h16a2 2 0 002-2v-6l-3.45-6.89A2 2 0 0016.76 4H7.24a2 2 0 00-1.79 1.11z"/>
  </svg>
);

/* ─────────────────────────────────────────────
   Delete Confirm Dialog (replaces window.confirm)
───────────────────────────────────────────── */
function DeleteConfirm({ studentName, onConfirm, onCancel, deleting }) {
  // Close on Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") onCancel(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onCancel]);

  return (
    <div className="res-confirm-backdrop" onClick={e => e.target === e.currentTarget && onCancel()}>
      <div className="res-confirm-box" role="alertdialog" aria-modal="true">
        <div className="res-confirm-icon"><IconTrash /></div>
        <p className="res-confirm-title">Delete result?</p>
        <p className="res-confirm-body">
          This will permanently remove <strong>{studentName}'s</strong> result for
          the selected subject and term. This cannot be undone.
        </p>
        <div className="res-confirm-footer">
          <button className="res-confirm-cancel" onClick={onCancel}>Cancel</button>
          <button className="res-confirm-delete" onClick={onConfirm} disabled={deleting}>
            {deleting ? "Deleting…" : "Delete result"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Modal shell — shared header/footer layout
───────────────────────────────────────────── */
function ModalShell({ title, subtitle, maxWidth = 500, onClose, onApply, applyLabel, children }) {
  // Close on Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div className="res-modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="res-modal" style={{ maxWidth }} role="dialog" aria-modal="true">
        <div className="res-modal-header">
          <div className="res-modal-header-left">
            <p className="res-modal-title">{title}</p>
            {subtitle && <p className="res-modal-subtitle">{subtitle}</p>}
          </div>
          <button className="res-modal-close" onClick={onClose} aria-label="Close">✕</button>
        </div>
        <div className="res-modal-body">{children}</div>
        <div className="res-modal-footer">
          <button className="res-modal-btn-cancel" onClick={onClose}>Cancel</button>
          <button className="res-modal-btn-apply" onClick={onApply}>
            <IconCheck />{applyLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   REOPEN MODAL
───────────────────────────────────────────── */
function ReopenModal({ studentName, initial, savedScore, onApply, onClose }) {
  const [vals, setVals] = useState({
    reopen_raw: initial?.reopen_raw ?? "",
    rda:        initial?.rda        ?? "",
  });
  const set   = (k) => (e) => setVals(p => ({ ...p, [k]: Math.min(10, Math.max(0, parseFloat(e.target.value) || 0)) }));
  const score = calcReopenScore(vals);

  return (
    <ModalShell
      title="Re-Open Score"
      subtitle={`${studentName}${savedScore != null ? ` · saved: ${savedScore}` : ""}`}
      maxWidth={400}
      onClose={onClose}
      onApply={() => onApply(score, vals)}
      applyLabel={`Apply ${score.toFixed(1)} / 20`}
    >
      <div className="res-modal-preview">
        <div className="res-modal-preview-item">
          <span className="res-modal-preview-final">{score.toFixed(1)}</span>
          <span className="res-modal-preview-max">/ 20</span>
        </div>
        <div className="res-modal-preview-item" style={{ marginLeft: "auto", alignItems: "flex-end" }}>
          <span style={{ fontSize: "10px", color: "rgba(255,255,255,.4)" }}>Formula</span>
          <span style={{ fontSize: "11px", color: "rgba(255,255,255,.5)", fontFamily: "'JetBrains Mono',monospace" }}>
            Re-Open/10 + RDA/10
          </span>
        </div>
      </div>
      <div className="res-modal-section">
        <div className="res-modal-section-label">
          Re-Open Assessment
          <span className="res-pill res-pill-blue">max 20 marks</span>
        </div>
        <div className="res-modal-inputs">
          <div className="res-modal-field">
            <label>Re-Open <span style={{ color: "#94a3b8", fontWeight: 400 }}>/10</span></label>
            <input type="number" min="0" max="10" step="0.5" placeholder="0"
              value={vals.reopen_raw} onChange={set("reopen_raw")} autoFocus />
          </div>
          <div style={{ display: "flex", alignItems: "center", paddingTop: "18px", color: "#cbd5e1", fontWeight: "700" }}>+</div>
          <div className="res-modal-field">
            <label>RDA <span style={{ color: "#94a3b8", fontWeight: 400 }}>/10</span></label>
            <input type="number" min="0" max="10" step="0.5" placeholder="0"
              value={vals.rda} onChange={set("rda")} />
          </div>
          <div style={{ display: "flex", alignItems: "center", paddingTop: "18px", color: "#cbd5e1", fontWeight: "700" }}>=</div>
          <div className="res-modal-field">
            <label style={{ color: "var(--blue)" }}>Total /20</label>
            <input readOnly value={score.toFixed(1)} />
          </div>
        </div>
      </div>
    </ModalShell>
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

  const clampSet = (k, max) => (e) =>
    setVals(p => ({ ...p, [k]: Math.min(max, Math.max(0, parseFloat(e.target.value) || 0)) }));

  const num       = (k) => parseFloat(vals[k]) || 0;
  const hwTotal   = num("hw1") + num("hw2") + num("hw3") + num("hw4");
  const cwTotal   = num("cw1") + num("cw2") + num("cw3") + num("cw4");
  const ctTotal   = num("ct1") + num("ct2") + num("ct3") + num("ct4");
  const caOnly    = calcCAonly(vals);
  const mgtScore  = calcMGTScore(vals);
  const combined  = calcCAScore(vals);

  const ReadonlyTotal = ({ val, max }) => (
    <div className="res-modal-field" style={{ flex: "none", width: "72px" }}>
      <input readOnly value={val.toFixed(1)} />
      <label style={{ color: "#94a3b8", fontSize: "10px", textAlign: "center" }}>/{max}</label>
    </div>
  );

  return (
    <ModalShell
      title="CA / MGT Score"
      subtitle={`${studentName}${savedScore != null ? ` · saved: ${savedScore}` : ""} · CA(25%) + MGT(15%) = 40%`}
      maxWidth={580}
      onClose={onClose}
      onApply={() => onApply(combined, vals)}
      applyLabel={`Apply ${combined.toFixed(1)} / 40`}
    >
      {/* Live preview */}
      <div className="res-modal-preview">
        <div className="res-modal-preview-item">
          <span style={{ fontSize: "13px", color: "rgba(255,255,255,.7)", fontFamily: "'JetBrains Mono',monospace" }}>{caOnly.toFixed(1)}/25</span>
          <span className="res-modal-preview-label">CA scaled</span>
        </div>
        <span className="res-modal-preview-arrow">+</span>
        <div className="res-modal-preview-item">
          <span style={{ fontSize: "13px", color: "#c4b5fd", fontFamily: "'JetBrains Mono',monospace" }}>{mgtScore.toFixed(1)}/15</span>
          <span className="res-modal-preview-label">MGT</span>
        </div>
        <span className="res-modal-preview-arrow">=</span>
        <div className="res-modal-preview-item">
          <span className="res-modal-preview-final">{combined.toFixed(1)}</span>
          <span className="res-modal-preview-max">/ 40</span>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", gap: "10px" }}>
          {[["HW", hwTotal, 20], ["CW", cwTotal, 40], ["CT", ctTotal, 50]].map(([l, v, m]) => (
            <div key={l} className="res-modal-preview-item">
              <span style={{ fontSize: "11px", color: "rgba(255,255,255,.5)", fontFamily: "'JetBrains Mono',monospace" }}>{v.toFixed(1)}/{m}</span>
              <span className="res-modal-preview-label">{l} raw</span>
            </div>
          ))}
        </div>
      </div>

      {/* CA section */}
      <div className="res-modal-section">
        <div className="res-modal-section-label">
          <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            Continuous Assessment <span className="res-pill res-pill-blue">scaled to /25</span>
          </span>
          <span style={{ fontWeight: 400, color: "#94a3b8" }}>raw total /110</span>
        </div>

        {/* Homework */}
        <div style={{ marginBottom: "8px" }}>
          <div style={{ fontSize: "10px", color: "#94a3b8", fontWeight: "600", marginBottom: "4px", textTransform: "uppercase", letterSpacing: ".5px" }}>
            Homework — 4 × /5 = /20
          </div>
          <div className="res-modal-inputs" style={{ alignItems: "flex-start" }}>
            {["hw1","hw2","hw3","hw4"].map((k, i) => (
              <div className="res-modal-field" key={k}>
                <label>HW {i + 1}</label>
                <input type="number" min="0" max="5" step="0.5" placeholder="0" value={vals[k]} onChange={clampSet(k, 5)} />
              </div>
            ))}
            <div style={{ display: "flex", alignItems: "center", paddingTop: "18px", color: "#cbd5e1", fontWeight: "700" }}>=</div>
            <ReadonlyTotal val={hwTotal} max={20} />
          </div>
        </div>

        {/* Classwork */}
        <div style={{ marginBottom: "8px" }}>
          <div style={{ fontSize: "10px", color: "#94a3b8", fontWeight: "600", marginBottom: "4px", textTransform: "uppercase", letterSpacing: ".5px" }}>
            Classwork — 4 × /10 = /40
          </div>
          <div className="res-modal-inputs" style={{ alignItems: "flex-start" }}>
            {["cw1","cw2","cw3","cw4"].map((k, i) => (
              <div className="res-modal-field" key={k}>
                <label>CW {i + 1}</label>
                <input type="number" min="0" max="10" step="0.5" placeholder="0" value={vals[k]} onChange={clampSet(k, 10)} />
              </div>
            ))}
            <div style={{ display: "flex", alignItems: "center", paddingTop: "18px", color: "#cbd5e1", fontWeight: "700" }}>=</div>
            <ReadonlyTotal val={cwTotal} max={40} />
          </div>
        </div>

        {/* Class tests */}
        <div>
          <div style={{ fontSize: "10px", color: "#94a3b8", fontWeight: "600", marginBottom: "4px", textTransform: "uppercase", letterSpacing: ".5px" }}>
            Class Tests — 10+10+10+20 = /50
          </div>
          <div className="res-modal-inputs" style={{ alignItems: "flex-start" }}>
            {[["ct1",10],["ct2",10],["ct3",10],["ct4",20]].map(([k, max], i) => (
              <div className="res-modal-field" key={k}>
                <label>CT{i + 1} /{max}</label>
                <input type="number" min="0" max={max} step="0.5" placeholder="0" value={vals[k]} onChange={clampSet(k, max)} />
              </div>
            ))}
            <div style={{ display: "flex", alignItems: "center", paddingTop: "18px", color: "#cbd5e1", fontWeight: "700" }}>=</div>
            <ReadonlyTotal val={ctTotal} max={50} />
          </div>
        </div>

        {/* CA scaled result */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "8px 12px", background: "var(--blue-l)", borderRadius: "8px", border: "1px solid #bfdbfe" }}>
          <span style={{ fontSize: "12px", color: "#64748b" }}>
            CA raw ({(hwTotal + cwTotal + ctTotal).toFixed(1)}/110) scaled to
          </span>
          <span style={{ fontFamily: "'JetBrains Mono',monospace", fontWeight: "700", color: "var(--blue-d)", fontSize: "15px" }}>
            {caOnly.toFixed(1)} / 25
          </span>
        </div>
      </div>

      <div className="res-divider" />

      {/* MGT section */}
      <div className="res-modal-section">
        <div className="res-modal-section-label">
          <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            MGT Test <span className="res-pill res-pill-purple">direct /15</span>
          </span>
        </div>
        <div className="res-modal-inputs">
          <div className="res-modal-field" style={{ flex: "none", width: "130px" }}>
            <label>MGT Score <span style={{ color: "#94a3b8", fontWeight: 400 }}>/15</span></label>
            <input type="number" min="0" max="15" step="0.5" placeholder="0" value={vals.mgt_raw}
              style={{ fontSize: "22px", padding: "10px" }}
              onChange={clampSet("mgt_raw", 15)} />
          </div>
        </div>
      </div>

      {/* Combined total */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", background: "var(--green-l)", borderRadius: "10px", border: "1px solid #bbf7d0" }}>
        <span style={{ fontSize: "13px", color: "#166534", fontWeight: "600" }}>CA + MGT Combined Total</span>
        <span style={{ fontFamily: "'JetBrains Mono',monospace", fontWeight: "800", color: "#166534", fontSize: "18px" }}>
          {combined.toFixed(1)} / 40
        </span>
      </div>
    </ModalShell>
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
    <ModalShell
      title="Examination Score"
      subtitle={`${studentName}${savedScore != null ? ` · saved: ${savedScore}` : ""}`}
      maxWidth={380}
      onClose={onClose}
      onApply={() => onApply(score, { exam_raw: raw })}
      applyLabel={`Apply ${score.toFixed(1)} / 40`}
    >
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
        <div className="res-modal-preview-item" style={{ marginLeft: "auto", alignItems: "flex-end" }}>
          <span style={{ fontSize: "10px", color: "rgba(255,255,255,.4)" }}>Formula</span>
          <span style={{ fontSize: "11px", color: "rgba(255,255,255,.5)", fontFamily: "'JetBrains Mono',monospace" }}>(raw/100)×40</span>
        </div>
      </div>
      <div className="res-modal-section">
        <div className="res-modal-section-label">
          Exam Score <span style={{ fontWeight: 400, color: "#94a3b8" }}>raw mark out of 100</span>
        </div>
        <div className="res-modal-inputs">
          <div className="res-modal-field" style={{ flex: "none", width: "130px" }}>
            <label>Raw Mark /100</label>
            <input type="number" min="0" max="100" step="0.5" placeholder="0" value={examRaw}
              style={{ fontSize: "26px", padding: "12px 10px" }} autoFocus
              onChange={e => setExamRaw(Math.min(100, Math.max(0, parseFloat(e.target.value) || 0)))} />
          </div>
          <div style={{ display: "flex", alignItems: "center", paddingTop: "18px", color: "#cbd5e1", fontWeight: "700", fontSize: "20px" }}>→</div>
          <div className="res-modal-field" style={{ flex: "none", width: "90px" }}>
            <label>Scaled /40</label>
            <input readOnly value={score.toFixed(1)}
              style={{ fontSize: "26px", padding: "12px 10px" }} />
          </div>
        </div>
      </div>
    </ModalShell>
  );
}

/* ─────────────────────────────────────────────
   ScoreCell — extracted, memoized
───────────────────────────────────────────── */
const ScoreCell = React.memo(function ScoreCell({
  field, value, savedValue, breakdown, breakdownLabel,
  max, onOpen,
}) {
  const isDirty    = String(value ?? "") !== String(savedValue ?? "") && value !== "";
  const isEmpty    = value === "" || value === 0;
  const isMax      = !isEmpty && parseFloat(value) === max;

  const btnClass = isEmpty
    ? "res-score-btn-empty"
    : isMax
      ? "res-score-btn-max"
      : isDirty
        ? "res-score-btn-dirty"
        : "res-score-btn-filled";

  return (
    <div className="res-score-cell">
      <button className={`res-score-btn ${btnClass}`} onClick={onOpen}>
        {isDirty && <span className="res-dirty-dot" aria-hidden="true" />}
        {isEmpty ? <><IconAdd />Enter</> : <><IconEdit />{parseFloat(value).toFixed(1)}</>}
      </button>
      {breakdown && (
        <span className="res-score-breakdown" title={breakdownLabel}>{breakdown}</span>
      )}
      {isDirty && savedValue !== "" && (
        <span style={{ fontSize: "10px", color: "var(--dim)" }}>was: {savedValue}</span>
      )}
    </div>
  );
});

/* ─────────────────────────────────────────────
   Main component
───────────────────────────────────────────── */
const Results = () => {
  // Inject styles once, clean up on unmount
  useEffect(() => {
    const STYLE_ID = "res-styles-v4";
    if (document.getElementById(STYLE_ID)) return;
    const el = document.createElement("style");
    el.id = STYLE_ID;
    el.textContent = STYLES;
    document.head.appendChild(el);
    return () => { el.remove(); };
  }, []);

  const { toasts, add: toast } = useToast();

  /* ── UI state ── */
  const [tab, setTab]               = useState("Enter Results");
  const [classes, setClasses]       = useState([]);
  const [subjects, setSubjects]     = useState([]);
  const [students, setStudents]     = useState([]);
  const [modal, setModal]           = useState(null);       // { type, studentId, studentName }
  const [expandedStudent, setExpandedStudent] = useState(null);
  const [deleteTarget, setDeleteTarget]       = useState(null); // { studentId, studentName }

  /* ── Filter state ── */
  const [selectedClass,   setSelectedClass]   = useState("");
  const [selectedTerm,    setSelectedTerm]    = useState(CURRENT_TERM);
  const [selectedYear,    setSelectedYear]    = useState(String(CURRENT_YEAR));
  const [selectedSubject, setSelectedSubject] = useState("");
  const [classLevel,      setClassLevel]      = useState("basic_7_9");

  /*
   * ── Unified per-student state map ──────────────────────────────────────
   *
   * Instead of 5 parallel Maps (scores, savedScores, breakdowns, existingIds,
   * touchedStudents), we keep a single map:
   *
   *   studentState: { [studentId]: {
   *     reopen, ca, exams,           ← live scores
   *     savedReopen, savedCa, savedExams, ← last server-confirmed values
   *     rkBreakdown, caBreakdown, exBreakdown,
   *     existingId,
   *     touched,
   *   }}
   *
   * This means every update is one setState call and there are no stale-
   * closure races between parallel state slices.
   */
  const [studentState, setStudentState] = useState({});

  /* ── Loading / saving flags ── */
  const [saving,          setSaving]         = useState(false);
  const [loadingStudents, setLoadingStudents]= useState(false);
  const [loadingScores,   setLoadingScores]  = useState(false);
  const [deleting,        setDeleting]       = useState(false);
  const [summary,         setSummary]        = useState([]);
  const [loadingSummary,  setLoadingSummary] = useState(false);

  /* ── Load classes & subjects once ── */
  useEffect(() => {
    API.get("/classes/")
      .then(r => setClasses(r.data.results || r.data))
      .catch(() => toast("Failed to load classes.", "error"));
    API.get("/subjects/")
      .then(r => setSubjects(r.data.results || r.data))
      .catch(() => toast("Failed to load subjects.", "error"));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Fetch students when class changes ── */
  useEffect(() => {
    if (!selectedClass) { setStudents([]); return; }
    setLoadingStudents(true);
    API.get(`/students/?school_class=${selectedClass}`)
      .then(r => setStudents(r.data.results || r.data))
      .catch(() => toast("Failed to load students.", "error"))
      .finally(() => setLoadingStudents(false));
  }, [selectedClass]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Reset ALL per-student state when filters change ── */
  useEffect(() => {
    setStudentState({});
  }, [selectedClass, selectedSubject, selectedTerm, selectedYear]);

  /*
   * ── Load existing scores from server ────────────────────────────────────
   *
   * Using a ref for the "touched" set avoids the stale-closure problem from
   * the original code. The ref always reflects the current Set without
   * making loadExistingScores depend on it (which would cause an infinite loop
   * via the useEffect below).
   */
  const touchedRef = useRef(new Set());

  // Keep ref in sync with the touched flags stored in studentState
  useEffect(() => {
    touchedRef.current = new Set(
      Object.entries(studentState)
        .filter(([, v]) => v.touched)
        .map(([k]) => k)
    );
  }, [studentState]);

  const loadExistingScores = useCallback(async (studentList) => {
    if (!selectedClass || !selectedTerm || !selectedSubject || !studentList?.length) return;
    setLoadingScores(true);
    try {
      const res = await API.get(
        `/results/?school_class=${selectedClass}&term=${selectedTerm}&subject=${selectedSubject}&year=${selectedYear}`
      );
      const records = res.data.results || res.data;

      const serverMap = {};
      const idMap     = {};
      records.forEach(r => {
        serverMap[r.student] = { reopen: r.reopen ?? "", ca: r.ca ?? "", exams: r.exams ?? "" };
        idMap[r.student]     = r.id;
      });

      const touched = touchedRef.current;

      setStudentState(prev => {
        const next = {};
        studentList.forEach(s => {
          const sv  = serverMap[s.id] || { reopen: "", ca: "", exams: "" };
          const cur = prev[s.id]      || emptyStudentState();
          const isTouched = touched.has(String(s.id));

          next[s.id] = {
            ...cur,
            // Server values become the new saved baseline
            savedReopen: sv.reopen,
            savedCa:     sv.ca,
            savedExams:  sv.exams,
            existingId:  idMap[s.id] ?? null,
            // Live scores: protect touched students, server wins for untouched
            reopen: isTouched && cur.reopen !== "" ? cur.reopen : sv.reopen,
            ca:     isTouched && cur.ca     !== "" ? cur.ca     : sv.ca,
            exams:  isTouched && cur.exams  !== "" ? cur.exams  : sv.exams,
          };
        });
        return next;
      });

      if (records.length > 0) {
        toast(`Loaded ${records.length} saved result${records.length !== 1 ? "s" : ""}.`, "info");
      }
    } catch {
      toast("Failed to load existing scores.", "error");
    } finally {
      setLoadingScores(false);
    }
  }, [selectedClass, selectedTerm, selectedSubject, selectedYear]); // touchedRef is stable

  /* ── Fire score load when students + all filters are ready ── */
  useEffect(() => {
    if (!selectedClass || !selectedSubject || !selectedTerm || !students.length) return;
    loadExistingScores(students);
  }, [students, selectedSubject, selectedTerm, selectedYear, loadExistingScores]);

  /* ── Summary tab ── */
  useEffect(() => {
    if (tab !== "Class Summary" || !selectedClass || !selectedTerm) return;
    setLoadingSummary(true);
    API.get(`/results/summary/?school_class=${selectedClass}&term=${selectedTerm}&year=${selectedYear}`)
      .then(r => setSummary(r.data))
      .catch(() => toast("Failed to load summary.", "error"))
      .finally(() => setLoadingSummary(false));
  }, [tab, selectedClass, selectedTerm, selectedYear]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Filter handlers ── */
  const handleClassChange = useCallback((e) => {
    const id = e.target.value;
    setSelectedClass(id);
    setSelectedSubject("");
    setStudents([]);
    setSummary([]);
    setExpandedStudent(null);
    const found = classes.find(c => String(c.id) === String(id));
    setClassLevel(found?.level || "basic_7_9");
    // studentState reset is handled by the filter-change useEffect
  }, [classes]);

  /* ── Unified modal apply handler ── */
  const applyScore = useCallback((field, bdField, score, breakdown) => {
    const { studentId } = modal;
    setStudentState(prev => ({
      ...prev,
      [studentId]: {
        ...(prev[studentId] || emptyStudentState()),
        [field]:   score,
        [bdField]: breakdown,
        touched:   true,
      },
    }));
    setModal(null);
  }, [modal]);

  const applyReopen = useCallback((score, bd) => applyScore("reopen", "rkBreakdown", score, bd), [applyScore]);
  const applyCA     = useCallback((score, bd) => applyScore("ca",     "caBreakdown", score, bd), [applyScore]);
  const applyExams  = useCallback((score, bd) => applyScore("exams",  "exBreakdown", score, bd), [applyScore]);

  /* ── Row-level undo ── */
  const undoStudent = useCallback((studentId) => {
    setStudentState(prev => {
      const cur = prev[studentId] || emptyStudentState();
      return {
        ...prev,
        [studentId]: {
          ...cur,
          reopen:  cur.savedReopen,
          ca:      cur.savedCa,
          exams:   cur.savedExams,
          touched: false,
        },
      };
    });
  }, []);

  /* ── Delete ── */
  const confirmDelete = useCallback(async () => {
    if (!deleteTarget) return;
    const { studentId } = deleteTarget;
    const st = studentState[studentId];
    if (!st?.existingId) return;
    setDeleting(true);
    try {
      await API.delete(`/results/${st.existingId}/`);
      setStudentState(prev => ({
        ...prev,
        [studentId]: emptyStudentState(),
      }));
      toast("Result deleted.", "info");
    } catch {
      toast("Failed to delete result.", "error");
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  }, [deleteTarget, studentState]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Submit (bulk save) ── */
  const submitResults = useCallback(async () => {
    if (!selectedClass || !selectedTerm || !selectedSubject) {
      toast("Please select class, term, and subject.", "error");
      return;
    }

    const classId   = parseInt(selectedClass,   10);
    const subjectId = parseInt(selectedSubject, 10);
    const yearInt   = parseInt(selectedYear,    10);

    if (isNaN(classId) || isNaN(subjectId) || isNaN(yearInt)) {
      toast("Invalid filter selection.", "error");
      return;
    }

    const records = students
      .map(s => {
        const st  = studentState[s.id] || {};
        const sv  = { reopen: st.savedReopen ?? "", ca: st.savedCa ?? "", exams: st.savedExams ?? "" };
        const cur = { reopen: st.reopen      ?? "", ca: st.ca      ?? "", exams: st.exams      ?? "" };
        const hasValue = cur.reopen !== "" || cur.ca !== "" || cur.exams !== "";
        if (!hasValue) return null;
        return {
          student:      s.id,
          subject:      subjectId,
          school_class: classId,
          term:         selectedTerm,
          year:         yearInt,
          reopen: parseFloat(cur.reopen !== "" ? cur.reopen : (sv.reopen || 0)),
          ca:     parseFloat(cur.ca     !== "" ? cur.ca     : (sv.ca     || 0)),
          exams:  parseFloat(cur.exams  !== "" ? cur.exams  : (sv.exams  || 0)),
        };
      })
      .filter(Boolean);

    if (!records.length) {
      toast("No scores to save.", "error");
      return;
    }

    setSaving(true);
    try {
      const res = await API.post("/results/bulk-save/", records);
      const errCount = res.data.errors?.length || 0;
      if (errCount === 0) {
        toast(`Saved ${res.data.saved} result${res.data.saved !== 1 ? "s" : ""} successfully.`, "success");
      } else {
        toast(`Saved ${res.data.saved} with ${errCount} error(s).`, "info");
        console.error("Bulk save errors:", res.data.errors);
      }
      // Pass the current students snapshot into reload — not a closure risk
      await loadExistingScores(students);
      // Clear all touched flags after successful save
      setStudentState(prev => {
        const next = { ...prev };
        Object.keys(next).forEach(k => { next[k] = { ...next[k], touched: false }; });
        return next;
      });
    } catch (err) {
      toast(err.response?.data?.detail || "Error saving results.", "error");
      console.error("Submit error:", err.response?.data);
    } finally {
      setSaving(false);
    }
  }, [selectedClass, selectedTerm, selectedSubject, selectedYear, students, studentState, loadExistingScores]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Derived state (memoized) ── */
  const {
    dirtyCount, filledCount, savedCount, gradeScale,
    selectedClassName, selectedSubjectName, selectedTermLabel, isCurrentTermYear, filtersSet,
  } = useMemo(() => {
    const dirtyCount  = students.filter(s => {
      const st = studentState[s.id] || {};
      return (
        String(st.reopen ?? "") !== String(st.savedReopen ?? "") ||
        String(st.ca     ?? "") !== String(st.savedCa     ?? "") ||
        String(st.exams  ?? "") !== String(st.savedExams  ?? "")
      );
    }).length;

    const filledCount = students.filter(s => {
      const st = studentState[s.id] || {};
      return st.reopen !== "" || st.ca !== "" || st.exams !== "";
    }).length;

    const savedCount = students.filter(s => !!studentState[s.id]?.existingId).length;

    return {
      dirtyCount,
      filledCount,
      savedCount,
      gradeScale:           classLevel === "basic_7_9" ? GRADE_SCALE_B79 : GRADE_SCALE_B16,
      selectedClassName:    classes.find(c  => String(c.id) === String(selectedClass))?.name   || "",
      selectedSubjectName:  subjects.find(s => String(s.id) === String(selectedSubject))?.name || "",
      selectedTermLabel:    TERMS.find(t => t.value === selectedTerm)?.label || "",
      isCurrentTermYear:    selectedTerm === CURRENT_TERM && selectedYear === String(CURRENT_YEAR),
      filtersSet:           !!(selectedClass && selectedSubject),
    };
  }, [students, studentState, classLevel, classes, subjects, selectedClass, selectedSubject, selectedTerm, selectedYear]);

  const saveProgress = students.length > 0 ? Math.round((savedCount / students.length) * 100) : 0;

  /* ─────────────────────────────────────────────
     Render
  ───────────────────────────────────────────── */
  return (
    <div className="res-root">

      {/* Modals */}
      {modal?.type === "reopen" && (
        <ReopenModal
          studentName={modal.studentName}
          initial={studentState[modal.studentId]?.rkBreakdown}
          savedScore={studentState[modal.studentId]?.savedReopen !== "" ? studentState[modal.studentId]?.savedReopen : null}
          onApply={applyReopen}
          onClose={() => setModal(null)}
        />
      )}
      {modal?.type === "ca" && (
        <CAModal
          studentName={modal.studentName}
          initial={studentState[modal.studentId]?.caBreakdown}
          savedScore={studentState[modal.studentId]?.savedCa !== "" ? studentState[modal.studentId]?.savedCa : null}
          onApply={applyCA}
          onClose={() => setModal(null)}
        />
      )}
      {modal?.type === "exams" && (
        <ExamsModal
          studentName={modal.studentName}
          initial={studentState[modal.studentId]?.exBreakdown}
          savedScore={studentState[modal.studentId]?.savedExams !== "" ? studentState[modal.studentId]?.savedExams : null}
          onApply={applyExams}
          onClose={() => setModal(null)}
        />
      )}

      {/* Delete confirm dialog */}
      {deleteTarget && (
        <DeleteConfirm
          studentName={deleteTarget.studentName}
          onConfirm={confirmDelete}
          onCancel={() => setDeleteTarget(null)}
          deleting={deleting}
        />
      )}

      {/* Toast */}
      <div className="res-toast" role="status" aria-live="polite">
        {toasts.map(t => (
          <div key={t.id} className={`res-toast-item res-toast-${t.type}`}>
            <div className="res-toast-icon">{t.type === "success" ? "✓" : t.type === "error" ? "✕" : "i"}</div>
            {t.msg}
          </div>
        ))}
      </div>

      {/* Header */}
      <header className="res-header">
        <div className="res-header-logo" aria-hidden="true">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2">
            <path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/>
          </svg>
        </div>
        <h1>Results Entry</h1>
        {isCurrentTermYear && (
          <span className="res-header-term-badge" aria-label="Current term: Term 1, 2026">● TERM 1 · 2026</span>
        )}
        <div className="res-header-context" aria-label="Current context">
          {selectedClassName   && <span className="res-header-ctx-pill">{selectedClassName}</span>}
          {selectedSubjectName && <span className="res-header-ctx-pill">{selectedSubjectName}</span>}
          {selectedTermLabel   && <span className="res-header-ctx-pill">{selectedTermLabel} {selectedYear}</span>}
        </div>
      </header>

      <div className="res-body">

        {/* Filters */}
        <div className="res-filters" role="group" aria-label="Result filters">
          <div className="res-filter-group">
            <label htmlFor="filter-year">Year</label>
            <select id="filter-year"
              className={`res-select ${selectedYear === String(CURRENT_YEAR) ? "res-select-current" : selectedYear ? "res-select-active" : ""}`}
              value={selectedYear} onChange={e => setSelectedYear(e.target.value)}>
              {YEARS.map(y => <option key={y} value={y}>{y}{y === CURRENT_YEAR ? " (current)" : ""}</option>)}
            </select>
          </div>
          <div className="res-filter-group">
            <label htmlFor="filter-term">Term</label>
            <select id="filter-term"
              className={`res-select ${selectedTerm === CURRENT_TERM ? "res-select-current" : selectedTerm ? "res-select-active" : ""}`}
              value={selectedTerm} onChange={e => setSelectedTerm(e.target.value)}>
              {TERMS.map(t => <option key={t.value} value={t.value}>{t.label}{t.value === CURRENT_TERM ? " (current)" : ""}</option>)}
            </select>
          </div>
          <div className="res-filter-group">
            <label htmlFor="filter-class">Class</label>
            <select id="filter-class" className={`res-select ${selectedClass ? "res-select-active" : ""}`}
              value={selectedClass} onChange={handleClassChange}>
              <option value="">Select Class</option>
              {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          {tab === "Enter Results" && (
            <div className="res-filter-group">
              <label htmlFor="filter-subject">Subject</label>
              <select id="filter-subject" className={`res-select ${selectedSubject ? "res-select-active" : ""}`}
                value={selectedSubject} onChange={e => setSelectedSubject(e.target.value)}>
                <option value="">Select Subject</option>
                {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          )}
        </div>

        {/* Tabs */}
        {selectedClass && (
          <div className="res-tabs" role="tablist">
            {["Enter Results", "Class Summary"].map(t => (
              <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)}
                className={`res-tab ${tab === t ? "res-tab-active" : ""}`}>{t}</button>
            ))}
          </div>
        )}

        {/* ════ ENTER RESULTS ════ */}
        {tab === "Enter Results" && (
          <>
            {!selectedClass && (
              <div className="res-empty" role="status">
                <div className="res-empty-icon"><IconSchool /></div>
                <h3>Select a class to begin</h3>
                <p>Choose a year, term, class and subject to load or enter results.</p>
              </div>
            )}
            {selectedClass && !selectedSubject && !loadingStudents && (
              <div className="res-empty" role="status">
                <div className="res-empty-icon"><IconBook /></div>
                <h3>Select a subject</h3>
                <p>Choose a subject above to load existing results or enter new ones.</p>
              </div>
            )}

            {filtersSet && (
              <>
                {/* Unsaved-changes banner */}
                {dirtyCount > 0 && !saving && (
                  <div className="res-dirty-banner" role="alert">
                    <div className="res-dirty-banner-left">
                      <span className="res-dirty-banner-icon"><IconWarn /></span>
                      <div>
                        <div className="res-dirty-banner-text">
                          {dirtyCount} student{dirtyCount !== 1 ? "s" : ""} with unsaved changes
                        </div>
                        <div className="res-dirty-banner-sub">
                          Keep entering scores and save everything at once below.
                        </div>
                      </div>
                    </div>
                    <button className="res-btn-save-dirty" onClick={submitResults} disabled={saving}>
                      <IconSave />
                      Save {dirtyCount} Change{dirtyCount !== 1 ? "s" : ""}
                    </button>
                  </div>
                )}

                {/* Status bar */}
                <div className="res-info-bar">
                  <div className="res-info-bar-left">
                    <span className="res-badge res-badge-blue">
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/>
                      </svg>
                      {students.length} students
                    </span>
                    {filledCount > 0 && <span className="res-badge res-badge-amber">✏ {filledCount} filled</span>}
                    {savedCount  > 0 && <span className="res-badge res-badge-green">✓ {savedCount} saved</span>}
                    {dirtyCount  > 0 && <span className="res-badge res-badge-amber">⚡ {dirtyCount} unsaved</span>}
                    {loadingScores && (
                      <div className="res-loading-overlay" style={{ padding: "0" }}>
                        <div className="res-spinner" aria-hidden="true" />
                        <span style={{ fontSize: "12px" }}>Loading…</span>
                      </div>
                    )}
                  </div>
                  <div style={{ fontSize: "12px", color: "var(--dim)", display: "flex", alignItems: "center", gap: "6px" }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10"/><path d="M12 8v4m0 4h.01"/>
                    </svg>
                    Click any score cell to enter breakdown
                  </div>
                </div>

                {/* Save progress bar */}
                {students.length > 0 && savedCount > 0 && (
                  <div className="res-progress-wrap">
                    <div className="res-progress-header">
                      <span>Save progress</span>
                      <span>{savedCount} / {students.length} students</span>
                    </div>
                    <div className="res-progress-track" role="progressbar" aria-valuenow={saveProgress} aria-valuemin={0} aria-valuemax={100}>
                      <div className="res-progress-fill" style={{ width: `${saveProgress}%` }} />
                    </div>
                  </div>
                )}

                {/* Scoring guide */}
                <div className="res-score-guide" aria-label="Score breakdown guide">
                  {[
                    { label: "Re-Open", color: "#3b82f6", detail: "Re-Open/10 + RDA/10 = /20" },
                    { label: "CA",      color: "#0891b2", detail: "HW+CW+CT scaled to /25" },
                    { label: "MGT",     color: "#7c3aed", detail: "Direct /15" },
                    { label: "Exams",   color: "#16a34a", detail: "raw/100 × 40 = /40" },
                  ].map(({ label, color, detail }) => (
                    <div key={label} className="res-score-guide-item" title={detail}>
                      <span className="res-score-guide-dot" style={{ background: color }} aria-hidden="true" />
                      <strong style={{ color }}>{label}</strong>
                      <span style={{ color: "var(--dim)" }}>{detail}</span>
                    </div>
                  ))}
                  <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "6px", fontSize: "11.5px", color: "var(--dim)" }}>
                    <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "var(--amber)", display: "inline-block" }} aria-hidden="true" />
                    Yellow row = unsaved changes
                  </div>
                </div>

                {/* Table */}
                {loadingStudents ? (
                  <div className="res-table-card">
                    <table className="res-table" aria-label="Loading students…"><tbody>
                      {[...Array(5)].map((_, i) => (
                        <tr key={i} className="res-skeleton-row">
                          {[...Array(9)].map((__, j) => (
                            <td key={j}><div className="res-skeleton" style={{ width: j === 1 ? "120px" : "60px" }} /></td>
                          ))}
                        </tr>
                      ))}
                    </tbody></table>
                  </div>
                ) : students.length === 0 ? (
                  <div className="res-empty" role="status">
                    <div className="res-empty-icon"><IconUsers /></div>
                    <h3>No students found</h3>
                    <p>No students are assigned to this class.</p>
                  </div>
                ) : (
                  <div className="res-table-card">
                    <table className="res-table" aria-label="Student results">
                      <thead>
                        <tr>
                          <th>#</th>
                          <th style={{ textAlign: "left" }}>Student</th>
                          <th>
                            <span className="res-th-tooltip">
                              RE-OPEN
                              <br /><span style={{ fontWeight: 400, fontSize: "10px", opacity: .5 }}>/20</span>
                              <span className="res-th-tip">Re-Open assessment (10) + RDA (10) = 20 marks</span>
                            </span>
                          </th>
                          <th>
                            <span className="res-th-tooltip">
                              CA / MGT
                              <br /><span style={{ fontWeight: 400, fontSize: "10px", opacity: .5 }}>/40</span>
                              <span className="res-th-tip">Continuous Assessment scaled /25 + MGT test /15</span>
                            </span>
                          </th>
                          <th>
                            <span className="res-th-tooltip">
                              EXAMS
                              <br /><span style={{ fontWeight: 400, fontSize: "10px", opacity: .5 }}>/40</span>
                              <span className="res-th-tip">Exam raw score /100, scaled to 40 marks</span>
                            </span>
                          </th>
                          <th>TOTAL<br /><span style={{ fontWeight: 400, fontSize: "10px", opacity: .5 }}>/100</span></th>
                          <th>GRADE</th>
                          <th>REMARK</th>
                          <th>ACTIONS</th>
                        </tr>
                      </thead>
                      <tbody>
                        {students.map((student, i) => {
                          const st   = studentState[student.id] || emptyStudentState();
                          const name = getStudentName(student);
                          const hue  = avatarHue(student.id);

                          const rowDirty = (
                            String(st.reopen ?? "") !== String(st.savedReopen ?? "") ||
                            String(st.ca     ?? "") !== String(st.savedCa     ?? "") ||
                            String(st.exams  ?? "") !== String(st.savedExams  ?? "")
                          );

                          const hasFill = st.reopen !== "" || st.ca !== "" || st.exams !== "";
                          const total   = hasFill ? computeScore(st.reopen, st.ca, st.exams) : null;
                          const grade   = total != null ? computeGrade(total, classLevel) : null;
                          const info    = grade ? GRADE_REMARK[grade] : null;
                          const isSaved = !!st.existingId;

                          // Breakdown display labels
                          const rkBd = st.rkBreakdown
                            ? `${parseFloat(st.rkBreakdown.reopen_raw) || 0} + ${parseFloat(st.rkBreakdown.rda) || 0}`
                            : null;
                          const caBd = st.caBreakdown
                            ? `CA ${calcCAonly(st.caBreakdown).toFixed(1)} + MGT ${parseFloat(st.caBreakdown.mgt_raw) || 0}`
                            : null;
                          const exBd = st.exBreakdown
                            ? `raw ${parseFloat(st.exBreakdown.exam_raw) || 0}`
                            : null;

                          return (
                            <tr key={student.id} className={rowDirty ? "res-row-dirty" : ""}>
                              <td style={{ color: "var(--dim)", fontFamily: "'JetBrains Mono',monospace", fontSize: "12px" }}>{i + 1}</td>

                              <td>
                                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                  <div className="res-student-avatar"
                                    style={{ background: `hsl(${hue},50%,88%)`, color: `hsl(${hue},50%,35%)` }}
                                    aria-hidden="true">
                                    {name.charAt(0)}
                                  </div>
                                  <div>
                                    <div className="res-student-name">{name}</div>
                                    {rowDirty
                                      ? <div className="res-dirty-label"><span className="res-dirty-dot-sm" aria-hidden="true" />unsaved</div>
                                      : isSaved
                                        ? <div className="res-saved-label"><span className="res-saved-dot" aria-hidden="true" />saved</div>
                                        : null}
                                  </div>
                                </div>
                              </td>

                              <td>
                                <ScoreCell
                                  field="reopen" value={st.reopen} savedValue={st.savedReopen}
                                  breakdown={rkBd} breakdownLabel="Re-Open raw + RDA"
                                  max={20}
                                  onOpen={() => setModal({ type: "reopen", studentId: student.id, studentName: name })}
                                />
                              </td>

                              <td>
                                <ScoreCell
                                  field="ca" value={st.ca} savedValue={st.savedCa}
                                  breakdown={caBd} breakdownLabel="CA scaled + MGT"
                                  max={40}
                                  onOpen={() => setModal({ type: "ca", studentId: student.id, studentName: name })}
                                />
                              </td>

                              <td>
                                <ScoreCell
                                  field="exams" value={st.exams} savedValue={st.savedExams}
                                  breakdown={exBd} breakdownLabel="Exam raw score"
                                  max={40}
                                  onOpen={() => setModal({ type: "exams", studentId: student.id, studentName: name })}
                                />
                              </td>

                              <td>
                                {total != null
                                  ? <span className="res-total">{total}</span>
                                  : <span className="res-total-dash">—</span>}
                              </td>
                              <td>
                                {grade
                                  ? <span className="res-grade" style={{ background: `${info.color}18`, color: info.color }}>{grade}</span>
                                  : <span style={{ color: "#e2e8f0" }}>—</span>}
                              </td>
                              <td style={{ fontSize: "12px", color: info ? info.color : "#cbd5e1" }}>
                                {info ? info.label : "—"}
                              </td>

                              <td>
                                <div style={{ display: "flex", alignItems: "center", gap: "6px", justifyContent: "center" }}>
                                  {rowDirty && (
                                    <button className="res-btn-undo" onClick={() => undoStudent(student.id)} title="Undo changes">
                                      <IconUndo />Undo
                                    </button>
                                  )}
                                  {isSaved && (
                                    <button className="res-btn-delete"
                                      onClick={() => setDeleteTarget({ studentId: student.id, studentName: name })}
                                      disabled={!!deleting}
                                      aria-label={`Delete ${name}'s result`}>
                                      Delete
                                    </button>
                                  )}
                                </div>
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
                    {/* Grade legend */}
                    <div className="res-legend" aria-label="Grade scale reference">
                      <span style={{ fontSize: "11px", fontWeight: "700", color: "var(--steel)", marginRight: "4px", alignSelf: "center" }}>
                        GRADE SCALE:
                      </span>
                      {gradeScale.map(item => (
                        <div key={item.grade} className="res-legend-item">
                          <span className="res-grade" style={{
                            background: `${GRADE_REMARK[item.grade]?.color}18`,
                            color: GRADE_REMARK[item.grade]?.color,
                            padding: "1px 6px",
                          }}>{item.grade}</span>
                          <span className="res-legend-range">{item.range}</span>
                        </div>
                      ))}
                    </div>

                    {/* Save bar */}
                    <div className="res-btn-save-wrap">
                      <div style={{ fontSize: "13px", color: "var(--dim)" }}>
                        {filledCount === 0
                          ? "Click any score cell to enter breakdown details"
                          : `${filledCount} of ${students.length} students have scores · ${dirtyCount > 0 ? `${dirtyCount} unsaved` : "all changes saved"}`}
                      </div>
                      <button className="res-btn-save" onClick={submitResults} disabled={saving || dirtyCount === 0}
                        aria-busy={saving}>
                        {saving
                          ? <><div className="res-spinner" style={{ borderTopColor: "#fff", width: "16px", height: "16px" }} aria-hidden="true" />Saving…</>
                          : <><IconSave />Save {dirtyCount > 0 ? `${dirtyCount} Change${dirtyCount !== 1 ? "s" : ""}` : "Results"}</>}
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
              <div className="res-empty" role="status">
                <div className="res-empty-icon"><IconChart /></div>
                <h3>Select a class</h3>
                <p>Choose a class and term to view the ranked summary.</p>
              </div>
            )}
            {loadingSummary && (
              <div className="res-loading-overlay" role="status" aria-live="polite">
                <div className="res-spinner" aria-hidden="true" />Loading summary…
              </div>
            )}
            {!loadingSummary && selectedClass && summary.length === 0 && (
              <div className="res-empty" role="status">
                <div className="res-empty-icon"><IconInbox /></div>
                <h3>No results yet</h3>
                <p>No results found for this class and term.</p>
              </div>
            )}
            {!loadingSummary && summary.length > 0 && (
              <div className="res-table-card">
                <table className="res-summary-table" aria-label="Class summary ranked results">
                  <thead>
                    <tr>
                      <th style={{ textAlign: "center", width: "60px" }}>RANK</th>
                      <th style={{ textAlign: "left" }}>STUDENT</th>
                      <th style={{ textAlign: "center" }}>SUBJECTS</th>
                      <th style={{ textAlign: "center" }}>TOTAL</th>
                      <th style={{ textAlign: "center" }}>AVG</th>
                      <th style={{ textAlign: "center" }}>GRADE</th>
                      <th style={{ textAlign: "center" }}>DETAILS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.map(row => (
                      <React.Fragment key={row.student_id}>
                        <tr
                          onClick={() => setExpandedStudent(expandedStudent === row.student_id ? null : row.student_id)}
                          className={expandedStudent === row.student_id ? "res-summary-row-expanded" : ""}
                          style={{ color: "var(--steel)" }}
                          aria-expanded={expandedStudent === row.student_id}>
                          <td style={{ textAlign: "center" }}>
                            <span className={row.rank === 1 ? "res-rank-1" : row.rank === 2 ? "res-rank-2" : row.rank === 3 ? "res-rank-3" : ""}
                              style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "13px" }}>
                              {row.rank === 1 ? "🥇" : row.rank === 2 ? "🥈" : row.rank === 3 ? "🥉" : `#${row.rank}`}
                            </span>
                          </td>
                          <td>
                            <div style={{ fontWeight: "600", color: "var(--ink-2)" }}>{row.student_name}</div>
                            <div style={{ fontSize: "11.5px", color: "var(--dim)", fontFamily: "'JetBrains Mono',monospace" }}>{row.admission_number}</div>
                          </td>
                          <td style={{ textAlign: "center", color: "var(--muted)" }}>{row.subject_count}</td>
                          <td style={{ textAlign: "center", fontFamily: "'JetBrains Mono',monospace", fontWeight: "700", color: "var(--blue)" }}>{row.total_score}</td>
                          <td style={{ textAlign: "center", fontFamily: "'JetBrains Mono',monospace", color: "var(--steel)" }}>{row.average_score}</td>
                          <td style={{ textAlign: "center" }}>
                            <span className="res-grade" style={{
                              background: `${GRADE_REMARK[row.overall_grade]?.color || "#64748b"}18`,
                              color: GRADE_REMARK[row.overall_grade]?.color || "#64748b",
                            }}>{row.overall_grade}</span>
                          </td>
                          <td style={{ textAlign: "center" }}>
                            <span className="res-expand-toggle" aria-label={expandedStudent === row.student_id ? "Hide details" : "Show details"}>
                              {expandedStudent === row.student_id ? "▲ Hide" : "▼ Show"}
                            </span>
                          </td>
                        </tr>
                        {expandedStudent === row.student_id && (
                          <tr>
                            <td colSpan={7} style={{ padding: "0", background: "#f8fafc" }}>
                              <div className="res-expand-inner">
                                <table className="res-sub-table" aria-label={`${row.student_name}'s subject breakdown`}>
                                  <thead>
                                    <tr>
                                      <th style={{ textAlign: "left" }}>Subject</th>
                                      <th>Re-Open</th><th>CA+MGT</th><th>Exams</th>
                                      <th>Total</th><th>Position</th><th>Grade</th><th>Remark</th>
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
                                          <td style={{ fontWeight: "700", color: "var(--blue)", fontFamily: "'JetBrains Mono',monospace" }}>{sub.score ?? "—"}</td>
                                          <td style={{ color: "var(--muted)" }}>{fmtPos(sub.subject_position)}</td>
                                          <td>
                                            <span className="res-grade" style={{
                                              background: info ? `${info.color}18` : "#f1f5f9",
                                              color: info?.color || "#64748b", fontSize: "11px",
                                            }}>{sub.grade ?? "—"}</span>
                                          </td>
                                          <td style={{ fontSize: "11.5px", color: info?.color || "#94a3b8" }}>{sub.remark ?? "—"}</td>
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