// src/pages/teacher/constants.js

export const TERMS = [
  { value: "term1", label: "Term 1" },
  { value: "term2", label: "Term 2" },
  { value: "term3", label: "Term 3" },
];

export const YEARS = [2026, 2025, 2024, 2023, 2022];

export const GRADE_REMARK = {
  "1":  { label: "HIGHEST",       color: "#16a34a", bg: "bg-emerald-100 text-emerald-800" },
  "2":  { label: "HIGHER",        color: "#059669", bg: "bg-emerald-50  text-emerald-700" },
  "3":  { label: "HIGH",          color: "#0284c7", bg: "bg-blue-100    text-blue-800"    },
  "4":  { label: "HIGH AVERAGE",  color: "#0891b2", bg: "bg-cyan-100    text-cyan-800"    },
  "5":  { label: "AVERAGE",       color: "#ca8a04", bg: "bg-yellow-100  text-yellow-800"  },
  "6":  { label: "LOW AVERAGE",   color: "#ea580c", bg: "bg-orange-100  text-orange-800"  },
  "7":  { label: "LOW",           color: "#dc2626", bg: "bg-red-100     text-red-700"     },
  "8":  { label: "LOWER",         color: "#b91c1c", bg: "bg-red-200     text-red-800"     },
  "9":  { label: "LOWEST",        color: "#991b1b", bg: "bg-red-300     text-red-900"     },
  "A":  { label: "EXCELLENT",     color: "#16a34a", bg: "bg-emerald-100 text-emerald-800" },
  "B":  { label: "VERY GOOD",     color: "#059669", bg: "bg-emerald-50  text-emerald-700" },
  "C":  { label: "GOOD",          color: "#0284c7", bg: "bg-blue-100    text-blue-800"    },
  "D":  { label: "HIGH AVERAGE",  color: "#0891b2", bg: "bg-cyan-100    text-cyan-800"    },
  "E2": { label: "BELOW AVERAGE", color: "#ea580c", bg: "bg-orange-100  text-orange-800"  },
  "E3": { label: "LOW",           color: "#dc2626", bg: "bg-red-100     text-red-700"     },
  "E4": { label: "LOWER",         color: "#b91c1c", bg: "bg-red-200     text-red-800"     },
  "E5": { label: "LOWEST",        color: "#991b1b", bg: "bg-red-300     text-red-900"     },
};

export const GRADE_SCALE_B79 = [
  { range: "90–100", grade: "1", label: "HIGHEST"      },
  { range: "80–89",  grade: "2", label: "HIGHER"       },
  { range: "60–79",  grade: "3", label: "HIGH"         },
  { range: "55–59",  grade: "4", label: "HIGH AVERAGE" },
  { range: "45–49",  grade: "5", label: "AVERAGE"      },
  { range: "40–44",  grade: "6", label: "LOW AVERAGE"  },
  { range: "35–39",  grade: "8", label: "LOWER"        },
  { range: "0–34",   grade: "9", label: "LOWEST"       },
];

export const GRADE_SCALE_B16 = [
  { range: "90–100", grade: "A",  label: "EXCELLENT"     },
  { range: "80–89",  grade: "B",  label: "VERY GOOD"     },
  { range: "60–79",  grade: "C",  label: "GOOD"          },
  { range: "55–59",  grade: "D",  label: "HIGH AVERAGE"  },
  { range: "45–49",  grade: "E2", label: "BELOW AVERAGE" },
  { range: "40–44",  grade: "E3", label: "LOW"           },
  { range: "35–39",  grade: "E4", label: "LOWER"         },
  { range: "0–34",   grade: "E5", label: "LOWEST"        },
];

export const CONDUCT_OPTIONS = ["Excellent", "Very Good", "Good", "Fair", "Poor"];

export const TABS = [
  { key: "Classes",       icon: "🏫", label: "Classes"       },
  { key: "Attendance",    icon: "📋", label: "Attendance"    },
  { key: "Results",       icon: "📊", label: "Results"       },
  { key: "Character",     icon: "🌟", label: "Character"     },
  { key: "Reports",       icon: "📄", label: "Reports"       },
  { key: "Announcements", icon: "📢", label: "Announcements" },
];

export const STATUS_CYCLE  = { present: "absent", absent: "late", late: "present" };
export const STATUS_CONFIG = {
  present: { dot: "bg-emerald-500", pill: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200", label: "Present" },
  absent:  { dot: "bg-red-500",     pill: "bg-red-50    text-red-700    ring-1 ring-red-200",        label: "Absent"  },
  late:    { dot: "bg-amber-400",   pill: "bg-amber-50  text-amber-700  ring-1 ring-amber-200",      label: "Late"    },
};

export const todayStr = new Date().toISOString().split("T")[0];

export const CHAR_AREAS = [
  { key: "punctuality",     label: "Punctuality",              guide: "How punctual was the student?"                            },
  { key: "comportment",     label: "Comportment in Class",     guide: "Behaviour and attitude in class"                          },
  { key: "neatness",        label: "Neatness & Dressing",      guide: "Proper dressing and hygiene"                              },
  { key: "studying_habits", label: "Studying Habits",          guide: "Study during free periods & consistent RDA completion"    },
  { key: "respect_friends", label: "Respect for Friends",      guide: "Respectful & friendly towards classmates; avoids insults" },
  { key: "respect_rules",   label: "Respect for School Rules", guide: "Follows school rules and instructions"                    },
];

export const CAREER_SKILL_DEFAULTS = [
  { key: "instrument",   label: "Instrument Skills",    exam: "Performance Test"    },
  { key: "graphic",      label: "Graphic Design",       exam: "Project Work"        },
  { key: "culinary",     label: "Culinary / Food Prep", exam: "Food Preparation"    },
  { key: "fashion",      label: "Fashion Design",       exam: "Sewing & Creativity" },
  { key: "hairdressing", label: "Hairdressing",         exam: "Practical Styling"   },
];

export const CHAR_SCORE_GRADES = [
  { min: 80, grade: "A", label: "Excellent",         color: "#16a34a", bg: "bg-emerald-100 text-emerald-800" },
  { min: 60, grade: "B", label: "Very Good",         color: "#0284c7", bg: "bg-blue-100 text-blue-800"       },
  { min: 50, grade: "C", label: "Good",              color: "#0891b2", bg: "bg-cyan-100 text-cyan-800"       },
  { min: 40, grade: "D", label: "Satisfactory",      color: "#ca8a04", bg: "bg-yellow-100 text-yellow-800"   },
  { min: 0,  grade: "E", label: "Needs Improvement", color: "#dc2626", bg: "bg-red-100 text-red-800"         },
];

export const COHORT_OPTIONS = [
  { value: "1st", label: "1st Cohort" },
  { value: "2nd", label: "2nd Cohort" },
  { value: "3rd", label: "3rd Cohort" },
];

export const MODAL_STYLES = `
  @keyframes tp-modal-fadein  { from{opacity:0} to{opacity:1} }
  @keyframes tp-modal-slideup { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
  @keyframes tp-spin          { to{transform:rotate(360deg)} }
  @keyframes tp-slide-up      { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }

  .tp-modal-backdrop {
    position:fixed; inset:0; background:rgba(15,23,42,.55); backdrop-filter:blur(4px);
    z-index:1000; display:flex; align-items:center; justify-content:center; padding:16px;
    animation:tp-modal-fadein .18s ease;
  }
  .tp-modal {
    background:#fff; border-radius:18px; width:100%; max-width:500px;
    box-shadow:0 24px 60px rgba(15,23,42,.25); animation:tp-modal-slideup .2s ease; overflow:hidden;
  }
  .tp-modal-header {
    padding:18px 22px 14px; border-bottom:1px solid #f1f5f9;
    display:flex; align-items:center; justify-content:space-between;
  }
  .tp-modal-title   { font-size:15px; font-weight:700; color:#0f172a; margin:0; }
  .tp-modal-subtitle{ font-size:12px; color:#94a3b8; margin:0; }
  .tp-modal-close   {
    width:30px; height:30px; border-radius:8px; border:none; background:#f1f5f9;
    color:#64748b; cursor:pointer; display:flex; align-items:center; justify-content:center;
    font-size:16px; transition:all .15s;
  }
  .tp-modal-close:hover { background:#e2e8f0; color:#1e293b; }
  .tp-modal-body { padding:20px 22px; display:flex; flex-direction:column; gap:18px; max-height:75vh; overflow-y:auto; }

  .tp-modal-preview {
    background:linear-gradient(135deg,#0f172a 0%,#1e293b 100%);
    border-radius:12px; padding:14px 18px;
    display:flex; align-items:center; justify-content:space-between; gap:12px; flex-wrap:wrap;
  }
  .tp-preview-item  { display:flex; flex-direction:column; align-items:center; gap:3px; }
  .tp-preview-val   { font-family:'DM Mono',monospace; font-size:20px; font-weight:700; color:#fff; line-height:1; }
  .tp-preview-lbl   { font-size:10px; color:#64748b; font-weight:500; text-transform:uppercase; letter-spacing:.5px; }
  .tp-preview-arrow { color:#475569; font-size:16px; }
  .tp-preview-final { font-family:'DM Mono',monospace; font-size:24px; font-weight:800; color:#3b82f6; line-height:1; }
  .tp-preview-max   { font-size:11px; color:#475569; font-weight:500; }

  .tp-modal-section { display:flex; flex-direction:column; gap:8px; }
  .tp-section-label {
    font-size:10.5px; font-weight:700; color:#64748b; text-transform:uppercase; letter-spacing:.7px;
    display:flex; align-items:center; justify-content:space-between;
  }
  .tp-section-label span { font-weight:400; color:#94a3b8; font-size:10px; letter-spacing:0; text-transform:none; }
  .tp-modal-inputs  { display:flex; gap:8px; flex-wrap:wrap; }
  .tp-modal-field   { display:flex; flex-direction:column; gap:4px; flex:1; min-width:70px; }
  .tp-modal-field label { font-size:11px; color:#64748b; font-weight:600; }
  .tp-modal-field input {
    border:1.5px solid #e2e8f0; border-radius:8px; padding:8px 10px;
    font-family:'DM Mono',monospace; font-size:14px; font-weight:600; color:#1e293b;
    text-align:center; outline:none; transition:all .15s; width:100%; box-sizing:border-box; background:#fafafa;
  }
  .tp-modal-field input:focus { border-color:#3b82f6; background:#fff; box-shadow:0 0 0 3px rgba(59,130,246,.1); }

  .tp-divider { height:1px; background:#f1f5f9; margin:0 -22px; }

  .tp-modal-footer { padding:14px 22px 20px; display:flex; gap:10px; justify-content:flex-end; }
  .tp-modal-btn-cancel {
    padding:9px 20px; border-radius:9px; border:1.5px solid #e2e8f0;
    background:#fff; color:#64748b; font-size:13.5px; font-weight:600; cursor:pointer; transition:all .15s;
  }
  .tp-modal-btn-cancel:hover { border-color:#94a3b8; color:#1e293b; }
  .tp-modal-btn-apply {
    padding:9px 22px; border-radius:9px; border:none;
    background:#0f172a; color:#fff; font-size:13.5px; font-weight:600; cursor:pointer; transition:all .15s;
    display:flex; align-items:center; gap:8px;
  }
  .tp-modal-btn-apply:hover { background:#1e293b; transform:translateY(-1px); box-shadow:0 4px 12px rgba(15,23,42,.2); }

  .tp-pill { display:inline-flex; align-items:center; padding:2px 8px; border-radius:20px; font-size:11px; font-weight:700; }
  .tp-pill-blue   { background:#eff6ff; color:#1d4ed8; }
  .tp-pill-purple { background:#f5f3ff; color:#6d28d9; }
  .tp-pill-green  { background:#f0fdf4; color:#166534; }

  .tp-score-cell { display:flex; flex-direction:column; align-items:center; gap:3px; }
  .tp-score-btn {
    min-width:72px; padding:6px 10px; border-radius:8px;
    font-size:13px; font-weight:600; cursor:pointer; border:1.5px solid #e2e8f0;
    background:#fff; color:#1e293b; transition:all .15s; text-align:center;
    display:flex; align-items:center; justify-content:center; gap:4px; font-family:'DM Mono',monospace;
  }
  .tp-score-btn:hover       { border-color:#3b82f6; background:#eff6ff; color:#1d4ed8; }
  .tp-score-btn-filled      { border-color:#93c5fd; background:#f0f7ff; color:#1d4ed8; }
  .tp-score-btn-max         { border-color:#86efac; background:#f0fdf4; color:#166534; }
  .tp-score-btn-empty       { border-color:#e2e8f0; color:#94a3b8; font-weight:400; }
  .tp-score-breakdown       { font-size:10px; color:#94a3b8; white-space:nowrap; font-family:'DM Mono',monospace; }
`;
