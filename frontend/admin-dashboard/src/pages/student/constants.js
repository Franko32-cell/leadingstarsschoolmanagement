// src/pages/student/constants.js

export const TERMS = [
  { value: "term1", label: "Term 1", icon: "📘" },
  { value: "term2", label: "Term 2", icon: "📗" },
  { value: "term3", label: "Term 3", icon: "📙" },
];

export const GRADE_REMARK = {
  "1":  { label: "HIGHEST",       bg: "#dcfce7", color: "#166534" },
  "2":  { label: "HIGHER",        bg: "#d1fae5", color: "#065f46" },
  "3":  { label: "HIGH",          bg: "#dbeafe", color: "#1e40af" },
  "4":  { label: "HIGH AVERAGE",  bg: "#cffafe", color: "#164e63" },
  "5":  { label: "AVERAGE",       bg: "#fef9c3", color: "#854d0e" },
  "6":  { label: "LOW AVERAGE",   bg: "#ffedd5", color: "#9a3412" },
  "7":  { label: "LOW",           bg: "#fee2e2", color: "#991b1b" },
  "8":  { label: "LOWER",         bg: "#fecaca", color: "#7f1d1d" },
  "9":  { label: "LOWEST",        bg: "#fca5a5", color: "#450a0a" },
  "A":  { label: "EXCELLENT",     bg: "#dcfce7", color: "#166534" },
  "B":  { label: "VERY GOOD",     bg: "#d1fae5", color: "#065f46" },
  "C":  { label: "GOOD",          bg: "#dbeafe", color: "#1e40af" },
  "D":  { label: "HIGH AVERAGE",  bg: "#cffafe", color: "#164e63" },
  "E2": { label: "BELOW AVERAGE", bg: "#ffedd5", color: "#9a3412" },
  "E3": { label: "LOW",           bg: "#fee2e2", color: "#991b1b" },
  "E4": { label: "LOWER",         bg: "#fecaca", color: "#7f1d1d" },
  "E5": { label: "LOWEST",        bg: "#fca5a5", color: "#450a0a" },
};

export const CHAR_AREAS = [
  { key: "punctuality",     label: "Punctuality",              guide: "Arrives on time, meets deadlines"             },
  { key: "comportment",     label: "Comportment in Class",     guide: "Classroom behaviour and focus"                },
  { key: "neatness",        label: "Neatness & Dressing",      guide: "Appearance and uniform compliance"            },
  { key: "studying_habits", label: "Studying Habits",          guide: "Preparation, revision and homework effort"    },
  { key: "respect_friends", label: "Respect for Friends",      guide: "Positive interaction with peers"              },
  { key: "respect_rules",   label: "Respect for School Rules", guide: "Adherence to school policies and procedures"  },
];

export const CHAR_SCORE_GRADES = [
  { min: 80, grade: "A", label: "Excellent",         color: "#16a34a", bg: "#dcfce7" },
  { min: 60, grade: "B", label: "Very Good",         color: "#0284c7", bg: "#dbeafe" },
  { min: 50, grade: "C", label: "Good",              color: "#0891b2", bg: "#cffafe" },
  { min: 40, grade: "D", label: "Satisfactory",      color: "#ca8a04", bg: "#fef9c3" },
  { min: 0,  grade: "E", label: "Needs Improvement", color: "#dc2626", bg: "#fee2e2" },
];

export const SUBJECT_PALETTE = [
  "#2563eb","#16a34a","#d97706","#dc2626",
  "#7c3aed","#0891b2","#ea580c","#65a30d",
  "#db2777","#4f46e5",
];

// NEW: E-Learning tab added
export const TABS = [
  { key: "Results",       icon: "📊", label: "Results"       },
  { key: "Attendance",    icon: "📋", label: "Attendance"    },
  { key: "Character",     icon: "🌟", label: "Character"     },
  { key: "Progress",      icon: "📈", label: "Progress"      },
  { key: "Report Card",   icon: "📄", label: "Report Card"   },
  { key: "E-Learning",    icon: "🎓", label: "E-Learning"    },
  { key: "Fees",          icon: "💳", label: "Fees"          },
  { key: "Announcements", icon: "📢", label: "Announcements" },
];

export const REFRESH_INTERVAL = 60_000;

// Tabs that don't show the shared term selector bar
export const NO_TERM_BAR_TABS = ["Progress", "Announcements", "Fees", "E-Learning"];

export const PORTAL_STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&family=DM+Mono:wght@400;500&display=swap');

  :root {
    --navy:     #0a0f1e;
    --navy-2:   #111827;
    --navy-3:   #1e293b;
    --slate:    #334155;
    --muted:    #64748b;
    --dim:      #94a3b8;
    --line:     #e8ecf0;
    --surface:  #ffffff;
    --bg:       #f0f2f5;
    --blue:     #2563eb;
    --blue-l:   #eff6ff;
    --green:    #16a34a;
    --green-l:  #f0fdf4;
    --amber:    #d97706;
    --amber-l:  #fffbeb;
    --red:      #dc2626;
    --red-l:    #fef2f2;
    --paystack: #00c3f7;
  }

  .sp-root * { box-sizing: border-box; }
  .sp-root { font-family: 'Outfit', sans-serif; background: var(--bg); min-height: 100vh; color: var(--slate); }

  .sp-header { background: var(--navy); position: sticky; top: 0; z-index: 40; }
  .sp-header-inner { max-width: 960px; margin: 0 auto; padding: 0 20px; height: 58px; display: flex; align-items: center; gap: 14px; }
  .sp-avatar { width: 34px; height: 34px; border-radius: 50%; object-fit: cover; border: 2px solid rgba(255,255,255,.15); flex-shrink:0; }
  .sp-avatar-fallback { width:34px; height:34px; border-radius:50%; background:linear-gradient(135deg,#3b82f6,#6366f1); display:flex; align-items:center; justify-content:center; font-weight:800; font-size:13px; color:#fff; flex-shrink:0; }
  .sp-header-name { color: #fff; font-weight: 700; font-size: 14px; line-height: 1.2; }
  .sp-header-sub  { color: rgba(255,255,255,.4); font-size: 11.5px; font-family: 'DM Mono', monospace; }
  .sp-header-actions { margin-left: auto; display: flex; align-items: center; gap: 8px; }
  .sp-btn-ghost { background: rgba(255,255,255,.07); border: 1px solid rgba(255,255,255,.1); color: rgba(255,255,255,.6); border-radius: 8px; padding: 6px 12px; font-size: 12px; font-weight: 500; cursor: pointer; font-family: 'Outfit', sans-serif; transition: all .15s; white-space: nowrap; }
  .sp-btn-ghost:hover { background: rgba(255,255,255,.12); color: #fff; }
  .sp-btn-danger { background: rgba(220,38,38,.12); border: 1px solid rgba(220,38,38,.2); color: #f87171; border-radius: 8px; padding: 6px 12px; font-size: 12px; font-weight: 500; cursor: pointer; font-family: 'Outfit', sans-serif; transition: all .15s; }
  .sp-btn-danger:hover { background: rgba(220,38,38,.2); color: #fca5a5; }
  .sp-btn-refresh { background: rgba(255,255,255,.07); border: 1px solid rgba(255,255,255,.1); color: rgba(255,255,255,.5); border-radius: 8px; padding: 6px 10px; font-size: 12px; cursor: pointer; font-family: 'Outfit', sans-serif; transition: all .15s; display:flex; align-items:center; gap:5px; }
  .sp-btn-refresh:hover { background: rgba(255,255,255,.12); color: #fff; }
  .sp-btn-refresh.spinning svg { animation: sp-spin .7s linear infinite; }

  .sp-nav { display: flex; gap: 2px; }
  .sp-nav-btn { display: flex; align-items: center; gap: 6px; padding: 6px 13px; border-radius: 8px; font-size: 13px; font-weight: 500; border: none; background: transparent; color: rgba(255,255,255,.45); cursor: pointer; font-family: 'Outfit', sans-serif; transition: all .15s; white-space: nowrap; }
  .sp-nav-btn:hover { color: rgba(255,255,255,.8); background: rgba(255,255,255,.06); }
  .sp-nav-btn-active { background: rgba(255,255,255,.1); color: #fff; font-weight: 600; }

  .sp-mobile-nav { display: none; background: var(--navy-2); border-top: 1px solid rgba(255,255,255,.06); overflow-x: auto; scrollbar-width: none; }
  .sp-mobile-nav::-webkit-scrollbar { display: none; }
  .sp-mobile-nav-inner { display: flex; padding: 4px 12px 8px; gap: 4px; }
  .sp-mobile-btn { flex-shrink: 0; display: flex; flex-direction: column; align-items: center; gap: 2px; padding: 6px 14px; border-radius: 8px; font-size: 10px; font-weight: 600; border: none; background: transparent; color: rgba(255,255,255,.4); cursor: pointer; font-family: 'Outfit', sans-serif; transition: all .15s; letter-spacing: .3px; text-transform: uppercase; }
  .sp-mobile-btn-active { background: rgba(255,255,255,.1); color: #fff; }

  @media (max-width: 700px) {
    .sp-nav { display: none; }
    .sp-mobile-nav { display: block; }
  }

  .sp-body { max-width: 960px; margin: 0 auto; padding: 24px 20px 48px; }

  .sp-term-bar { background: var(--surface); border-radius: 14px; border: 1px solid var(--line); padding: 14px 18px; margin-bottom: 20px; display: flex; align-items: flex-end; gap: 12px; flex-wrap: wrap; }
  .sp-field-label { font-size: 10.5px; font-weight: 700; color: var(--dim); text-transform: uppercase; letter-spacing: .6px; display: block; margin-bottom: 5px; }
  .sp-select { border: 1.5px solid var(--line); border-radius: 9px; padding: 8px 32px 8px 12px; font-size: 13.5px; font-family: 'Outfit', sans-serif; color: var(--navy-2); background: #fff url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2.5'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E") no-repeat right 10px center; appearance: none; outline: none; cursor: pointer; transition: border-color .15s; }
  .sp-select:focus { border-color: var(--blue); box-shadow: 0 0 0 3px rgba(37,99,235,.1); }
  .sp-btn-pdf { background: var(--red); color: #fff; border: none; border-radius: 9px; padding: 9px 18px; font-size: 13px; font-weight: 600; font-family: 'Outfit', sans-serif; cursor: pointer; transition: all .15s; display: flex; align-items: center; gap: 7px; }
  .sp-btn-pdf:hover { background: #b91c1c; transform: translateY(-1px); }

  .sp-last-updated { font-size: 11px; color: var(--dim); display: flex; align-items: center; gap: 5px; margin-left: auto; white-space: nowrap; }
  .sp-last-updated-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--green); flex-shrink: 0; }

  .sp-kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 16px; }
  @media (max-width: 600px) { .sp-kpi-grid { grid-template-columns: repeat(2, 1fr); } }
  .sp-kpi { background: var(--surface); border: 1px solid var(--line); border-radius: 14px; padding: 16px 14px; text-align: center; }
  .sp-kpi-value { font-size: 26px; font-weight: 900; color: var(--blue); letter-spacing: -1px; line-height: 1; font-family: 'DM Mono', monospace; }
  .sp-kpi-sub   { font-size: 11px; color: var(--blue); font-weight: 500; margin-top: 2px; }
  .sp-kpi-label { font-size: 10px; font-weight: 700; color: var(--dim); text-transform: uppercase; letter-spacing: .7px; margin-top: 5px; }

  .sp-card { background: var(--surface); border: 1px solid var(--line); border-radius: 14px; overflow: hidden; margin-bottom: 14px; }
  .sp-card-head { padding: 14px 18px; border-bottom: 1px solid var(--line); display: flex; justify-content: space-between; align-items: center; }
  .sp-card-title { font-weight: 700; font-size: 13.5px; color: var(--navy-2); }

  .sp-table-wrap { overflow-x: auto; }
  .sp-table { width: 100%; border-collapse: collapse; font-size: 13.5px; }
  .sp-table thead tr { background: #f8fafc; }
  .sp-table thead th { padding: 10px 14px; font-size: 10.5px; font-weight: 700; color: var(--muted); text-transform: uppercase; letter-spacing: .6px; white-space: nowrap; }
  .sp-table thead th.c { text-align: center; }
  .sp-table tbody tr { border-top: 1px solid #f1f5f9; transition: background .1s; }
  .sp-table tbody tr:hover { background: #f8faff; }
  .sp-table td { padding: 10px 14px; color: var(--slate); }
  .sp-table td.c { text-align: center; }
  .sp-score { font-weight: 800; color: var(--blue); font-family: 'DM Mono', monospace; }
  .sp-muted { color: var(--dim); }

  .sp-badge { display: inline-flex; align-items: center; padding: 2px 8px; border-radius: 20px; font-size: 11px; font-weight: 700; font-family: 'DM Mono', monospace; }

  .sp-alert { display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; border-radius: 11px; margin-bottom: 16px; font-size: 13.5px; border: 1px solid #fecaca; background: var(--red-l); color: var(--red); }

  .sp-empty { background: var(--surface); border: 1px solid var(--line); border-radius: 14px; padding: 64px 20px; text-align: center; }
  .sp-empty-icon { font-size: 42px; margin-bottom: 12px; }
  .sp-empty h3 { font-weight: 700; color: var(--navy-2); margin: 0 0 5px; font-size: 15px; }
  .sp-empty p  { color: var(--dim); font-size: 13px; margin: 0; }

  .sp-loading { text-align: center; padding: 64px 20px; color: var(--dim); font-size: 13.5px; }
  .sp-spinner { width: 24px; height: 24px; border: 2.5px solid var(--line); border-top-color: var(--blue); border-radius: 50%; animation: sp-spin .65s linear infinite; margin: 0 auto 12px; }
  @keyframes sp-spin { to { transform: rotate(360deg); } }

  .sp-att-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 16px; }
  @media (max-width: 500px) { .sp-att-grid { grid-template-columns: repeat(3,1fr); gap:8px; } }
  .sp-att-kpi { border-radius: 14px; padding: 16px 14px; text-align: center; border: 1px solid; }
  .sp-att-kpi-val { font-size: 28px; font-weight: 900; font-family: 'DM Mono', monospace; line-height: 1; }
  .sp-att-kpi-lbl { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .7px; margin-top: 5px; }
  .sp-att-present { background: var(--green-l); border-color: #bbf7d0; }
  .sp-att-present .sp-att-kpi-val { color: var(--green); }
  .sp-att-present .sp-att-kpi-lbl { color: #166534; }
  .sp-att-absent  { background: var(--red-l);   border-color: #fecaca; }
  .sp-att-absent  .sp-att-kpi-val { color: var(--red); }
  .sp-att-absent  .sp-att-kpi-lbl { color: #991b1b; }
  .sp-att-late    { background: var(--amber-l); border-color: #fde68a; }
  .sp-att-late    .sp-att-kpi-val { color: var(--amber); }
  .sp-att-late    .sp-att-kpi-lbl { color: #92400e; }
  .sp-att-pill { display:inline-flex; align-items:center; gap:5px; padding:3px 10px; border-radius:99px; font-size:12px; font-weight:600; }
  .sp-att-present-pill { background:#dcfce7; color:#166534; }
  .sp-att-absent-pill  { background:#fee2e2; color:#991b1b; }
  .sp-att-late-pill    { background:#fef9c3; color:#92400e; }

  .sp-progress-bar { height: 8px; border-radius: 99px; background: var(--line); overflow: hidden; margin-top: 6px; }
  .sp-progress-fill { height: 100%; border-radius: 99px; transition: width .5s ease; }

  .sp-char-section { background: var(--surface); border: 1px solid var(--line); border-radius: 14px; overflow: hidden; margin-bottom: 14px; }
  .sp-char-header { background: linear-gradient(135deg, var(--navy) 0%, var(--navy-3) 100%); padding: 16px 20px; color: #fff; }
  .sp-char-header-title { font-weight: 800; font-size: 14px; }
  .sp-char-header-sub { font-size: 12px; color: rgba(255,255,255,.45); margin-top: 2px; }
  .sp-char-score-chip { display:inline-flex; align-items:center; padding: 2px 9px; border-radius: 20px; font-size:11px; font-weight:700; }
  .sp-char-area-row { display:flex; align-items:center; justify-content:space-between; padding:10px 18px; border-bottom:1px solid #f8fafc; gap:12px; flex-wrap:wrap; }
  .sp-char-area-row:last-child { border-bottom: none; }
  .sp-char-area-name { font-size:13.5px; font-weight:600; color:var(--navy-2); }
  .sp-char-area-guide { font-size: 11px; color: var(--dim); margin-top: 2px; }
  .sp-char-area-right { display:flex; align-items:center; gap:10px; flex-shrink:0; }
  .sp-char-score-bar-wrap { flex:1; min-width:80px; max-width:180px; }
  .sp-char-score-bar { height:6px; border-radius:99px; background:var(--line); overflow:hidden; }
  .sp-char-score-fill { height:100%; border-radius:99px; transition:width .5s ease; }
  .sp-char-remarks { font-size:12px; color:var(--muted); font-style:italic; max-width:220px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  @media (max-width: 600px) {
    .sp-char-area-row { flex-wrap: wrap; }
    .sp-char-score-bar-wrap { width: 100%; order: 3; min-width: 100% !important; max-width: 100% !important; }
    .sp-char-remarks { max-width: 100%; white-space: normal; order: 4; }
  }
  .sp-char-signoff-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; padding: 14px 18px; }
  @media (max-width: 500px) { .sp-char-signoff-grid { grid-template-columns: 1fr; } }
  .sp-char-signoff-card { background: #f8fafc; border-radius: 10px; padding: 12px 14px; border: 1px solid var(--line); }
  .sp-char-signoff-role { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .6px; color: var(--dim); margin-bottom: 4px; }
  .sp-char-signoff-name { font-weight: 700; color: var(--navy-2); font-size: 14px; }
  .sp-char-signoff-meta { font-size: 11.5px; color: var(--dim); margin-top: 2px; }
  .sp-char-completion { display: flex; align-items: center; gap: 12px; padding: 8px 18px 14px; }
  .sp-char-completion-label { font-size: 12px; color: var(--dim); flex: 1; }
  .sp-char-completion-bar { flex: 2; height: 6px; border-radius: 99px; background: var(--line); overflow: hidden; }
  .sp-char-completion-fill { height: 100%; border-radius: 99px; transition: width .5s ease; }
  .sp-char-completion-pct { font-size: 12px; font-weight: 700; font-family: 'DM Mono', monospace; min-width: 36px; text-align: right; }
  .sp-char-grade-footer { padding: 12px 18px; border-top: 1px solid var(--line); display: flex; align-items: center; justify-content: space-between; background: #f8fafc; }

  .sp-hl-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 14px; }
  @media (max-width: 500px) { .sp-hl-grid { grid-template-columns: 1fr; } }
  .sp-hl { border-radius: 14px; padding: 16px 18px; border: 1px solid; }
  .sp-hl-green { background: var(--green-l); border-color: #bbf7d0; }
  .sp-hl-red   { background: var(--red-l);   border-color: #fecaca; }
  .sp-hl-label { font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: .8px; margin-bottom: 4px; }
  .sp-hl-name  { font-weight: 700; font-size: 14px; color: var(--navy-2); }
  .sp-hl-delta { font-size: 13px; font-weight: 600; margin-top: 3px; }

  .sp-chart-card { background: var(--surface); border: 1px solid var(--line); border-radius: 14px; padding: 14px 16px; }

  @media (max-width: 700px) {
    .sp-body { padding: 12px 10px 40px; }
    .sp-card-head { flex-direction: column; align-items: flex-start; gap: 8px; }
    .sp-term-bar { flex-direction: column; align-items: stretch; }
    .sp-table thead th { font-size: 10px; }
    .sp-kpi-grid { grid-template-columns: repeat(2,1fr); }
  }

  .sp-status-paid    { background: #dcfce7; color: #166534; border-radius: 20px; padding: 3px 10px; font-size: 11px; font-weight: 700; }
  .sp-status-partial { background: #fef9c3; color: #854d0e; border-radius: 20px; padding: 3px 10px; font-size: 11px; font-weight: 700; }
  .sp-status-unpaid  { background: #fee2e2; color: #991b1b; border-radius: 20px; padding: 3px 10px; font-size: 11px; font-weight: 700; }
  .sp-fee-overview { background: linear-gradient(135deg, #0a0f1e 0%, #1e293b 100%); border-radius: 18px; padding: 24px 24px 20px; margin-bottom: 16px; color: #fff; position: relative; overflow: hidden; }
  .sp-fee-overview::before { content: ''; position: absolute; top: -40px; right: -40px; width: 180px; height: 180px; border-radius: 50%; background: rgba(37,99,235,.18); pointer-events: none; }
  .sp-fee-overview::after { content: ''; position: absolute; bottom: -30px; left: 60px; width: 120px; height: 120px; border-radius: 50%; background: rgba(22,163,74,.12); pointer-events: none; }
  .sp-fee-overview-label { font-size: 10.5px; font-weight: 700; text-transform: uppercase; letter-spacing: .8px; color: rgba(255,255,255,.45); margin-bottom: 6px; }
  .sp-fee-overview-total { font-size: 36px; font-weight: 900; letter-spacing: -2px; line-height: 1; font-family: 'DM Mono', monospace; color: #fff; }
  .sp-fee-overview-sub { font-size: 13px; color: rgba(255,255,255,.45); margin-top: 4px; }
  .sp-fee-overview-stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-top: 20px; }
  .sp-fee-overview-stat { background: rgba(255,255,255,.07); border: 1px solid rgba(255,255,255,.1); border-radius: 10px; padding: 10px 12px; }
  .sp-fee-overview-stat-val { font-size: 17px; font-weight: 800; font-family: 'DM Mono', monospace; color: #fff; line-height: 1; }
  .sp-fee-overview-stat-lbl { font-size: 10px; font-weight: 600; color: rgba(255,255,255,.4); text-transform: uppercase; letter-spacing: .5px; margin-top: 3px; }
  .sp-fee-card { background: var(--surface); border: 1px solid var(--line); border-radius: 16px; margin-bottom: 12px; overflow: hidden; transition: box-shadow .2s; }
  .sp-fee-card:hover { box-shadow: 0 4px 20px rgba(0,0,0,.07); }
  .sp-fee-card-header { padding: 16px 20px; display: flex; align-items: center; justify-content: space-between; cursor: pointer; user-select: none; }
  .sp-fee-card-header:hover { background: #fafbfc; }
  .sp-fee-card-left { display: flex; align-items: center; gap: 12px; }
  .sp-fee-term-icon { width: 40px; height: 40px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 18px; flex-shrink: 0; }
  .sp-fee-term-name { font-weight: 700; font-size: 14px; color: var(--navy-2); }
  .sp-fee-term-meta { font-size: 12px; color: var(--dim); margin-top: 1px; }
  .sp-fee-card-right { display: flex; align-items: center; gap: 10px; }
  .sp-fee-chevron { color: var(--dim); transition: transform .25s; font-size: 16px; line-height: 1; }
  .sp-fee-chevron.open { transform: rotate(180deg); }
  .sp-fee-card-body { border-top: 1px solid var(--line); overflow: hidden; transition: max-height .3s ease, opacity .3s ease; max-height: 0; opacity: 0; }
  .sp-fee-card-body.open { max-height: 1200px; opacity: 1; }
  .sp-fee-body-inner { padding: 16px 20px 20px; }
  .sp-fee-progress-wrap { margin-bottom: 16px; }
  .sp-fee-progress-label { display: flex; justify-content: space-between; font-size: 12px; color: var(--dim); margin-bottom: 5px; }
  .sp-fee-progress-bar { height: 10px; border-radius: 99px; background: var(--line); overflow: hidden; }
  .sp-fee-progress-fill { height: 100%; border-radius: 99px; transition: width .6s cubic-bezier(.4,0,.2,1); }
  .sp-fee-lines { border: 1px solid var(--line); border-radius: 10px; overflow: hidden; margin-bottom: 16px; }
  .sp-fee-line { display: flex; justify-content: space-between; padding: 9px 14px; font-size: 13.5px; border-bottom: 1px solid #f8fafc; }
  .sp-fee-line:last-child { border-bottom: none; }
  .sp-fee-line-label { color: var(--muted); }
  .sp-fee-line-val { font-weight: 600; color: var(--navy-3); font-family: 'DM Mono', monospace; font-size: 13px; }
  .sp-fee-line-total { background: #f8fafc; font-weight: 700; }
  .sp-fee-line-paid { color: var(--green); }
  .sp-fee-line-balance { color: var(--red); font-weight: 800; font-size: 14px; }
  .sp-pay-btn { width: 100%; background: linear-gradient(135deg, #00b8e6 0%, #0070f3 100%); color: #fff; border: none; border-radius: 12px; padding: 14px; font-size: 15px; font-weight: 700; font-family: 'Outfit', sans-serif; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 9px; transition: all .2s; letter-spacing: .2px; }
  .sp-pay-btn:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,112,243,.3); }
  .sp-pay-btn:disabled { opacity: .5; cursor: not-allowed; transform: none; }
  .sp-pay-btn-paid { width: 100%; background: var(--green-l); color: var(--green); border: 1.5px solid #bbf7d0; border-radius: 12px; padding: 14px; font-size: 14px; font-weight: 700; font-family: 'Outfit', sans-serif; display: flex; align-items: center; justify-content: center; gap: 8px; cursor: default; }
  .sp-paystack-badge { display: flex; align-items: center; justify-content: center; gap: 5px; font-size: 11px; color: var(--dim); margin-top: 8px; }
  .sp-pay-modal { max-width: 400px; }
  .sp-pay-modal-header { background: linear-gradient(135deg, #0a0f1e, #1e3a5f); margin: -28px -28px 20px; padding: 24px 28px 20px; border-radius: 18px 18px 0 0; color: #fff; }
  .sp-pay-modal-term { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .8px; color: rgba(255,255,255,.45); margin-bottom: 4px; }
  .sp-pay-modal-balance { font-size: 32px; font-weight: 900; font-family: 'DM Mono', monospace; letter-spacing: -1.5px; }
  .sp-pay-modal-balance-lbl { font-size: 12px; color: rgba(255,255,255,.45); margin-top: 2px; }
  .sp-amount-options { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 14px; }
  .sp-amount-option { border: 1.5px solid var(--line); border-radius: 10px; padding: 10px 12px; cursor: pointer; transition: all .15s; background: #fff; text-align: left; }
  .sp-amount-option:hover { border-color: var(--blue); background: var(--blue-l); }
  .sp-amount-option.selected { border-color: var(--blue); background: var(--blue-l); }
  .sp-amount-option-label { font-size: 10.5px; font-weight: 700; color: var(--dim); text-transform: uppercase; letter-spacing: .5px; margin-bottom: 3px; }
  .sp-amount-option-val { font-size: 16px; font-weight: 800; color: var(--navy-2); font-family: 'DM Mono', monospace; }
  .sp-custom-amount-wrap { margin-bottom: 14px; }
  .sp-custom-amount-input-row { display: flex; align-items: center; border: 1.5px solid var(--line); border-radius: 10px; overflow: hidden; transition: border-color .15s; background: #fff; }
  .sp-custom-amount-input-row:focus-within { border-color: var(--blue); box-shadow: 0 0 0 3px rgba(37,99,235,.1); }
  .sp-custom-amount-prefix { padding: 10px 14px; font-size: 14px; font-weight: 700; color: var(--muted); background: #f8fafc; border-right: 1.5px solid var(--line); font-family: 'DM Mono', monospace; }
  .sp-custom-amount-input { flex: 1; border: none; outline: none; padding: 10px 14px; font-size: 16px; font-weight: 700; font-family: 'DM Mono', monospace; color: var(--navy-2); background: transparent; }
  .sp-amount-error { font-size: 12px; color: var(--red); margin-top: 5px; }
  .sp-pay-confirm-btn { width: 100%; background: linear-gradient(135deg, #00b8e6 0%, #0070f3 100%); color: #fff; border: none; border-radius: 10px; padding: 13px; font-size: 14px; font-weight: 700; font-family: 'Outfit', sans-serif; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; transition: all .2s; margin-top: 4px; }
  .sp-pay-confirm-btn:hover:not(:disabled) { box-shadow: 0 6px 20px rgba(0,112,243,.3); }
  .sp-pay-confirm-btn:disabled { opacity: .5; cursor: not-allowed; }
  .sp-txn-section { margin-top: 16px; }
  .sp-txn-title { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .7px; color: var(--dim); margin-bottom: 10px; }
  .sp-txn-empty { text-align: center; padding: 20px; font-size: 13px; color: var(--dim); background: #f8fafc; border-radius: 10px; }
  .sp-txn-list { display: flex; flex-direction: column; gap: 6px; }
  .sp-txn-item { display: flex; align-items: center; gap: 12px; padding: 10px 14px; background: #f8fafc; border-radius: 10px; border: 1px solid var(--line); transition: background .15s; }
  .sp-txn-item:hover { background: var(--blue-l); border-color: #bfdbfe; }
  .sp-txn-icon { width: 34px; height: 34px; border-radius: 8px; background: #dcfce7; display: flex; align-items: center; justify-content: center; flex-shrink: 0; font-size: 15px; }
  .sp-txn-info { flex: 1; min-width: 0; }
  .sp-txn-amount { font-size: 14px; font-weight: 800; color: var(--green); font-family: 'DM Mono', monospace; white-space: nowrap; }
  .sp-txn-date { font-size: 11.5px; color: var(--dim); margin-top: 1px; }
  .sp-txn-note { font-size: 12px; color: var(--muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .sp-txn-by { font-size: 11px; color: var(--dim); white-space: nowrap; }
  .sp-pay-success-overlay { position: fixed; inset: 0; z-index: 200; background: rgba(0,0,0,.6); backdrop-filter: blur(6px); display: flex; align-items: center; justify-content: center; animation: sp-fade-in .2s ease; }
  .sp-pay-success-box { background: #fff; border-radius: 24px; padding: 40px 36px; text-align: center; max-width: 340px; width: 90%; animation: sp-slide-up .25s ease; }
  .sp-pay-success-icon { width: 72px; height: 72px; border-radius: 50%; background: var(--green-l); display: flex; align-items: center; justify-content: center; margin: 0 auto 18px; font-size: 32px; }
  .sp-pay-success-title { font-size: 22px; font-weight: 800; color: var(--navy); margin-bottom: 6px; }
  .sp-pay-success-amount { font-size: 32px; font-weight: 900; font-family: 'DM Mono', monospace; color: var(--green); letter-spacing: -1px; margin-bottom: 8px; }
  .sp-pay-success-sub { font-size: 13px; color: var(--dim); margin-bottom: 24px; line-height: 1.6; }
  .sp-pay-success-btn { width: 100%; background: var(--navy); color: #fff; border: none; border-radius: 10px; padding: 12px; font-size: 14px; font-weight: 700; font-family: 'Outfit', sans-serif; cursor: pointer; }
  .sp-gateway-err { background: #fff8f0; border: 1px solid #fed7aa; border-radius: 10px; padding: 12px 14px; font-size: 13px; color: #9a3412; margin-top: 8px; line-height: 1.5; }

  .sp-modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,.5); backdrop-filter: blur(4px); z-index: 100; display: flex; align-items: center; justify-content: center; padding: 20px; animation: sp-fade-in .15s ease; }
  @keyframes sp-fade-in { from { opacity: 0; } to { opacity: 1; } }
  .sp-modal { background: #fff; border-radius: 18px; width: 100%; max-width: 440px; padding: 28px; box-shadow: 0 24px 64px rgba(0,0,0,.18); animation: sp-slide-up .2s ease; max-height: 90vh; overflow-y: auto; }
  @keyframes sp-slide-up { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
  .sp-modal-title { font-size: 18px; font-weight: 800; color: var(--navy); margin: 0 0 4px; }
  .sp-modal-sub { font-size: 13px; color: var(--dim); margin: 0 0 22px; }
  .sp-modal-field { margin-bottom: 14px; }
  .sp-modal-input { width: 100%; border: 1.5px solid var(--line); border-radius: 9px; padding: 10px 40px 10px 13px; font-size: 14px; font-family: 'Outfit', sans-serif; color: var(--navy-2); outline: none; transition: border-color .15s; background: #fff; }
  .sp-modal-input:focus { border-color: var(--blue); box-shadow: 0 0 0 3px rgba(37,99,235,.1); }
  .sp-modal-input-wrap { position: relative; }
  .sp-modal-eye { position: absolute; right: 11px; top: 50%; transform: translateY(-50%); background: none; border: none; cursor: pointer; color: var(--dim); padding: 2px; display: flex; align-items: center; }
  .sp-modal-eye:hover { color: var(--slate); }
  .sp-pw-strength { height: 4px; border-radius: 99px; margin-top: 6px; transition: all .3s; }
  .sp-pw-hint { font-size: 11px; color: var(--dim); margin-top: 4px; }
  .sp-modal-actions { display: flex; gap: 10px; margin-top: 20px; }
  .sp-btn-primary { flex: 1; background: var(--navy); color: #fff; border: none; border-radius: 9px; padding: 11px; font-size: 14px; font-weight: 600; font-family: 'Outfit', sans-serif; cursor: pointer; transition: all .15s; display: flex; align-items: center; justify-content: center; gap: 8px; }
  .sp-btn-primary:hover:not(:disabled) { background: var(--navy-3); }
  .sp-btn-primary:disabled { opacity: .5; cursor: not-allowed; }
  .sp-btn-secondary { background: var(--bg); color: var(--slate); border: 1.5px solid var(--line); border-radius: 9px; padding: 11px 18px; font-size: 14px; font-weight: 600; font-family: 'Outfit', sans-serif; cursor: pointer; transition: all .15s; }
  .sp-btn-secondary:hover { background: var(--line); }
  .sp-pw-success { background: var(--green-l); border: 1px solid #bbf7d0; border-radius: 10px; padding: 12px 14px; display: flex; align-items: center; gap: 9px; font-size: 13.5px; color: var(--green); font-weight: 500; margin-top: 4px; }
  .sp-pw-error { background: var(--red-l); border: 1px solid #fecaca; border-radius: 10px; padding: 10px 14px; font-size: 13px; color: var(--red); margin-top: 8px; }

  .sp-remark-row { display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid #f8fafc; font-size: 13.5px; }
  .sp-remark-row:last-child { border-bottom: none; }
  .sp-remark-quote { background: #f8fafc; border-left: 3px solid var(--blue); border-radius: 0 8px 8px 0; padding: 10px 14px; font-style: italic; color: var(--slate); font-size: 13.5px; margin-top: 8px; }

  /* ── E-Learning ── */
  .sp-elearn-tabs { display: flex; gap: 6px; margin-bottom: 16px; background: var(--surface); border: 1px solid var(--line); border-radius: 12px; padding: 4px; width: fit-content; }
  .sp-elearn-subtab { border: none; background: transparent; padding: 8px 16px; border-radius: 8px; font-size: 13px; font-weight: 600; color: var(--dim); cursor: pointer; font-family: 'Outfit', sans-serif; transition: all .15s; }
  .sp-elearn-subtab-active { background: var(--navy); color: #fff; }
  .sp-lesson-card, .sp-assign-card { background: var(--surface); border: 1px solid var(--line); border-radius: 14px; padding: 16px 18px; margin-bottom: 12px; }
  .sp-lesson-top { display: flex; justify-content: space-between; align-items: flex-start; gap: 10px; }
  .sp-lesson-subject-chip { display: inline-block; font-size: 10.5px; font-weight: 700; text-transform: uppercase; letter-spacing: .5px; padding: 3px 9px; border-radius: 20px; background: var(--blue-l); color: var(--blue); margin-bottom: 6px; }
  .sp-lesson-title { font-weight: 700; font-size: 14.5px; color: var(--navy-2); margin: 0 0 4px; }
  .sp-lesson-desc { font-size: 13px; color: var(--muted); line-height: 1.5; margin: 0 0 10px; }
  .sp-lesson-meta { font-size: 11.5px; color: var(--dim); display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
  .sp-lesson-actions { display: flex; gap: 8px; margin-top: 12px; }
  .sp-btn-outline { border: 1.5px solid var(--line); background: #fff; color: var(--slate); border-radius: 8px; padding: 7px 14px; font-size: 12.5px; font-weight: 600; cursor: pointer; font-family: 'Outfit', sans-serif; display: inline-flex; align-items: center; gap: 6px; transition: all .15s; text-decoration: none; }
  .sp-btn-outline:hover { border-color: var(--blue); color: var(--blue); background: var(--blue-l); }
  .sp-status-pill { display: inline-flex; align-items: center; gap: 5px; padding: 3px 11px; border-radius: 99px; font-size: 11px; font-weight: 700; }
  .sp-status-not-submitted { background: #f1f5f9; color: #64748b; }
  .sp-status-submitted     { background: #dbeafe; color: #1e40af; }
  .sp-status-late          { background: #ffedd5; color: #9a3412; }
  .sp-status-graded        { background: #dcfce7; color: #166534; }
  .sp-assign-due { font-size: 12px; font-weight: 600; }
  .sp-assign-due-overdue { color: var(--red); }
  .sp-assign-due-soon { color: var(--amber); }
  .sp-assign-due-ok { color: var(--dim); }
  .sp-upload-dropzone { border: 2px dashed var(--line); border-radius: 12px; padding: 22px; text-align: center; cursor: pointer; transition: all .15s; background: #fafbfc; }
  .sp-upload-dropzone:hover { border-color: var(--blue); background: var(--blue-l); }
  .sp-upload-dropzone input { display: none; }
  .sp-file-chip { display: inline-flex; align-items: center; gap: 8px; background: var(--blue-l); border: 1px solid #bfdbfe; border-radius: 9px; padding: 8px 12px; font-size: 12.5px; color: var(--blue); font-weight: 600; margin-top: 10px; }
  .sp-file-chip button { background: none; border: none; color: var(--red); cursor: pointer; font-size: 15px; line-height: 1; padding: 0; }
  .sp-textarea { width: 100%; border: 1.5px solid var(--line); border-radius: 9px; padding: 10px 13px; font-size: 13.5px; font-family: 'Outfit', sans-serif; color: var(--navy-2); outline: none; resize: vertical; min-height: 90px; }
  .sp-textarea:focus { border-color: var(--blue); box-shadow: 0 0 0 3px rgba(37,99,235,.1); }
  .sp-grade-box { display: flex; align-items: center; justify-content: space-between; background: var(--green-l); border: 1px solid #bbf7d0; border-radius: 10px; padding: 12px 14px; margin-top: 10px; }
  .sp-grade-score { font-family: 'DM Mono', monospace; font-weight: 900; font-size: 20px; color: var(--green); }
`;