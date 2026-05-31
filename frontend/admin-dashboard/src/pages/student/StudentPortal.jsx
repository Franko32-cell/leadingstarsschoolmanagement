import { useEffect, useState, useCallback, useRef } from "react";
import { getUser, logout } from "../../services/auth";
import API from "../../services/api";
import AnnouncementsFeed from "../AnnouncementsFeed";

/* ─────────────────────────────────────────────
   Global styles (injected once)
───────────────────────────────────────────── */
const PORTAL_STYLES = `
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

  /* Header */
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

  /* Desktop nav */
  .sp-nav { display: flex; gap: 2px; }
  .sp-nav-btn { display: flex; align-items: center; gap: 6px; padding: 6px 13px; border-radius: 8px; font-size: 13px; font-weight: 500; border: none; background: transparent; color: rgba(255,255,255,.45); cursor: pointer; font-family: 'Outfit', sans-serif; transition: all .15s; white-space: nowrap; }
  .sp-nav-btn:hover { color: rgba(255,255,255,.8); background: rgba(255,255,255,.06); }
  .sp-nav-btn-active { background: rgba(255,255,255,.1); color: #fff; font-weight: 600; }

  /* Mobile nav */
  .sp-mobile-nav { display: none; background: var(--navy-2); border-top: 1px solid rgba(255,255,255,.06); overflow-x: auto; scrollbar-width: none; }
  .sp-mobile-nav::-webkit-scrollbar { display: none; }
  .sp-mobile-nav-inner { display: flex; padding: 4px 12px 8px; gap: 4px; }
  .sp-mobile-btn { flex-shrink: 0; display: flex; flex-direction: column; align-items: center; gap: 2px; padding: 6px 14px; border-radius: 8px; font-size: 10px; font-weight: 600; border: none; background: transparent; color: rgba(255,255,255,.4); cursor: pointer; font-family: 'Outfit', sans-serif; transition: all .15s; letter-spacing: .3px; text-transform: uppercase; }
  .sp-mobile-btn-active { background: rgba(255,255,255,.1); color: #fff; }

  @media (max-width: 700px) {
    .sp-nav { display: none; }
    .sp-mobile-nav { display: block; }
  }

  /* Body */
  .sp-body { max-width: 960px; margin: 0 auto; padding: 24px 20px 48px; }

  /* Term bar */
  .sp-term-bar { background: var(--surface); border-radius: 14px; border: 1px solid var(--line); padding: 14px 18px; margin-bottom: 20px; display: flex; align-items: flex-end; gap: 12px; flex-wrap: wrap; }
  .sp-field-label { font-size: 10.5px; font-weight: 700; color: var(--dim); text-transform: uppercase; letter-spacing: .6px; display: block; margin-bottom: 5px; }
  .sp-select { border: 1.5px solid var(--line); border-radius: 9px; padding: 8px 32px 8px 12px; font-size: 13.5px; font-family: 'Outfit', sans-serif; color: var(--navy-2); background: #fff url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2.5'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E") no-repeat right 10px center; appearance: none; outline: none; cursor: pointer; transition: border-color .15s; }
  .sp-select:focus { border-color: var(--blue); box-shadow: 0 0 0 3px rgba(37,99,235,.1); }
  .sp-btn-pdf { background: var(--red); color: #fff; border: none; border-radius: 9px; padding: 9px 18px; font-size: 13px; font-weight: 600; font-family: 'Outfit', sans-serif; cursor: pointer; transition: all .15s; display: flex; align-items: center; gap: 7px; }
  .sp-btn-pdf:hover { background: #b91c1c; transform: translateY(-1px); }

  /* Last updated banner */
  .sp-last-updated { font-size: 11px; color: var(--dim); display: flex; align-items: center; gap: 5px; margin-left: auto; white-space: nowrap; }
  .sp-last-updated-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--green); flex-shrink: 0; }

  /* KPI grid */
  .sp-kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 16px; }
  @media (max-width: 600px) { .sp-kpi-grid { grid-template-columns: repeat(2, 1fr); } }
  .sp-kpi { background: var(--surface); border: 1px solid var(--line); border-radius: 14px; padding: 16px 14px; text-align: center; }
  .sp-kpi-value { font-size: 26px; font-weight: 900; color: var(--blue); letter-spacing: -1px; line-height: 1; font-family: 'DM Mono', monospace; }
  .sp-kpi-sub   { font-size: 11px; color: var(--blue); font-weight: 500; margin-top: 2px; }
  .sp-kpi-label { font-size: 10px; font-weight: 700; color: var(--dim); text-transform: uppercase; letter-spacing: .7px; margin-top: 5px; }

  /* Card */
  .sp-card { background: var(--surface); border: 1px solid var(--line); border-radius: 14px; overflow: hidden; margin-bottom: 14px; }
  .sp-card-head { padding: 14px 18px; border-bottom: 1px solid var(--line); display: flex; justify-content: space-between; align-items: center; }
  .sp-card-title { font-weight: 700; font-size: 13.5px; color: var(--navy-2); }

  /* Table */
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

  /* Grade/remark badges */
  .sp-badge { display: inline-flex; align-items: center; padding: 2px 8px; border-radius: 20px; font-size: 11px; font-weight: 700; font-family: 'DM Mono', monospace; }

  /* Alert */
  .sp-alert { display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; border-radius: 11px; margin-bottom: 16px; font-size: 13.5px; border: 1px solid #fecaca; background: var(--red-l); color: var(--red); }

  /* Empty */
  .sp-empty { background: var(--surface); border: 1px solid var(--line); border-radius: 14px; padding: 64px 20px; text-align: center; }
  .sp-empty-icon { font-size: 42px; margin-bottom: 12px; }
  .sp-empty h3 { font-weight: 700; color: var(--navy-2); margin: 0 0 5px; font-size: 15px; }
  .sp-empty p  { color: var(--dim); font-size: 13px; margin: 0; }

  /* Loading */
  .sp-loading { text-align: center; padding: 64px 20px; color: var(--dim); font-size: 13.5px; }
  .sp-spinner { width: 24px; height: 24px; border: 2.5px solid var(--line); border-top-color: var(--blue); border-radius: 50%; animation: sp-spin .65s linear infinite; margin: 0 auto 12px; }
  @keyframes sp-spin { to { transform: rotate(360deg); } }

  /* Attendance styles */
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

  /* Attendance progress bar */
  .sp-progress-bar { height: 8px; border-radius: 99px; background: var(--line); overflow: hidden; margin-top: 6px; }
  .sp-progress-fill { height: 100%; border-radius: 99px; transition: width .5s ease; }

  /* ── Character assessment styles ── */
  .sp-char-section { background: var(--surface); border: 1px solid var(--line); border-radius: 14px; overflow: hidden; margin-bottom: 14px; }
  .sp-char-header { background: linear-gradient(135deg, var(--navy) 0%, var(--navy-3) 100%); padding: 16px 20px; color: #fff; }
  .sp-char-header-title { font-weight: 800; font-size: 14px; }
  .sp-char-header-sub { font-size: 12px; color: rgba(255,255,255,.45); margin-top: 2px; }
  .sp-char-score-chip { display:inline-flex; align-items:center; padding: 2px 9px; border-radius: 20px; font-size:11px; font-weight:700; }
  .sp-char-area-row { display:flex; align-items:center; justify-content:space-between; padding:10px 18px; border-bottom:1px solid #f8fafc; gap:12px; flex-wrap:wrap; }
  .sp-char-area-row:last-child { border-bottom: none; }
  .sp-char-area-name { font-size:13.5px; font-weight:600; color:var(--navy-2); }
  /* FIX: guide text shown under area name */
  .sp-char-area-guide { font-size: 11px; color: var(--dim); margin-top: 2px; }
  .sp-char-area-right { display:flex; align-items:center; gap:10px; flex-shrink:0; }
  .sp-char-score-bar-wrap { flex:1; min-width:80px; max-width:180px; }
  .sp-char-score-bar { height:6px; border-radius:99px; background:var(--line); overflow:hidden; }
  .sp-char-score-fill { height:100%; border-radius:99px; transition:width .5s ease; }
  .sp-char-remarks { font-size:12px; color:var(--muted); font-style:italic; max-width:220px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  /* FIX: area row mobile stacking without Tailwind */
  @media (max-width: 600px) {
    .sp-char-area-row { flex-wrap: wrap; }
    .sp-char-score-bar-wrap { width: 100%; order: 3; min-width: 100% !important; max-width: 100% !important; }
    .sp-char-remarks { max-width: 100%; white-space: normal; order: 4; }
  }
  /* FIX: sign-off grid using sp-* classes only — no Tailwind */
  .sp-char-signoff-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; padding: 14px 18px; }
  @media (max-width: 500px) { .sp-char-signoff-grid { grid-template-columns: 1fr; } }
  .sp-char-signoff-card { background: #f8fafc; border-radius: 10px; padding: 12px 14px; border: 1px solid var(--line); }
  .sp-char-signoff-role { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .6px; color: var(--dim); margin-bottom: 4px; }
  .sp-char-signoff-name { font-weight: 700; color: var(--navy-2); font-size: 14px; }
  .sp-char-signoff-meta { font-size: 11.5px; color: var(--dim); margin-top: 2px; }
  /* Completion progress */
  .sp-char-completion { display: flex; align-items: center; gap: 12px; padding: 8px 18px 14px; }
  .sp-char-completion-label { font-size: 12px; color: var(--dim); flex: 1; }
  .sp-char-completion-bar { flex: 2; height: 6px; border-radius: 99px; background: var(--line); overflow: hidden; }
  .sp-char-completion-fill { height: 100%; border-radius: 99px; transition: width .5s ease; }
  .sp-char-completion-pct { font-size: 12px; font-weight: 700; font-family: 'DM Mono', monospace; min-width: 36px; text-align: right; }
  /* Overall grade footer */
  .sp-char-grade-footer { padding: 12px 18px; border-top: 1px solid var(--line); display: flex; align-items: center; justify-content: space-between; background: #f8fafc; }

  /* Highlight cards */
  .sp-hl-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 14px; }
  @media (max-width: 500px) { .sp-hl-grid { grid-template-columns: 1fr; } }
  .sp-hl { border-radius: 14px; padding: 16px 18px; border: 1px solid; }
  .sp-hl-green { background: var(--green-l); border-color: #bbf7d0; }
  .sp-hl-red   { background: var(--red-l);   border-color: #fecaca; }
  .sp-hl-label { font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: .8px; margin-bottom: 4px; }
  .sp-hl-name  { font-weight: 700; font-size: 14px; color: var(--navy-2); }
  .sp-hl-delta { font-size: 13px; font-weight: 600; margin-top: 3px; }

  /* Subject chart card */
  .sp-chart-card { background: var(--surface); border: 1px solid var(--line); border-radius: 14px; padding: 14px 16px; }

  /* Extra mobile tweaks */
  @media (max-width: 700px) {
    .sp-body { padding: 12px 10px 40px; }
    .sp-card-head { flex-direction: column; align-items: flex-start; gap: 8px; }
    .sp-term-bar { flex-direction: column; align-items: stretch; }
    .sp-table thead th { font-size: 10px; }
    .sp-kpi-grid { grid-template-columns: repeat(2,1fr); }
  }

  /* Fees */
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

  /* Modal */
  .sp-modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,.5); backdrop-filter: blur(4px); z-index: 100; display: flex; align-items: center; justify-content: center; padding: 20px; animation: sp-fade-in .15s ease; }
  @keyframes sp-fade-in { from { opacity: 0; } to { opacity: 1; } }
  .sp-modal { background: #fff; border-radius: 18px; width: 100%; max-width: 440px; padding: 28px; box-shadow: 0 24px 64px rgba(0,0,0,.18); animation: sp-slide-up .2s ease; }
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

  /* Remarks section */
  .sp-remark-row { display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid #f8fafc; font-size: 13.5px; }
  .sp-remark-row:last-child { border-bottom: none; }
  .sp-remark-quote { background: #f8fafc; border-left: 3px solid var(--blue); border-radius: 0 8px 8px 0; padding: 10px 14px; font-style: italic; color: var(--slate); font-size: 13.5px; margin-top: 8px; }
`;

/* ─────────────────────────────────────────────
   Paystack loader
───────────────────────────────────────────── */
const loadPaystack = () =>
  new Promise((resolve, reject) => {
    if (window.PaystackPop) return resolve(window.PaystackPop);
    const existing = document.querySelector('script[src*="paystack"]');
    if (existing) {
      let attempts = 0;
      const poll = setInterval(() => {
        attempts++;
        if (window.PaystackPop) { clearInterval(poll); resolve(window.PaystackPop); }
        else if (attempts > 50) { clearInterval(poll); reject(new Error("Paystack SDK timed out.")); }
      }, 100);
      return;
    }
    const script = document.createElement("script");
    script.src = "https://js.paystack.co/v1/inline.js";
    script.async = true;
    script.onload = () => window.PaystackPop ? resolve(window.PaystackPop) : reject(new Error("Paystack loaded but PaystackPop unavailable."));
    script.onerror = () => reject(new Error("Failed to load Paystack script."));
    document.head.appendChild(script);
  });

/* ─────────────────────────────────────────────
   Constants
───────────────────────────────────────────── */
const TERMS = [
  { value: "term1", label: "Term 1", icon: "📘" },
  { value: "term2", label: "Term 2", icon: "📗" },
  { value: "term3", label: "Term 3", icon: "📙" },
];

const GRADE_REMARK = {
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

// FIX: Added `guide` field — synced with teacher portal's CHAR_AREAS
const CHAR_AREAS = [
  { key: "punctuality",     label: "Punctuality",              guide: "Arrives on time, meets deadlines"             },
  { key: "comportment",     label: "Comportment in Class",     guide: "Classroom behaviour and focus"                },
  { key: "neatness",        label: "Neatness & Dressing",      guide: "Appearance and uniform compliance"            },
  { key: "studying_habits", label: "Studying Habits",          guide: "Preparation, revision and homework effort"    },
  { key: "respect_friends", label: "Respect for Friends",      guide: "Positive interaction with peers"              },
  { key: "respect_rules",   label: "Respect for School Rules", guide: "Adherence to school policies and procedures"  },
];

// Mirrors CHAR_SCORE_GRADES in teacher portal exactly
const CHAR_SCORE_GRADES = [
  { min: 80, grade: "A", label: "Excellent",         color: "#16a34a", bg: "#dcfce7" },
  { min: 60, grade: "B", label: "Very Good",         color: "#0284c7", bg: "#dbeafe" },
  { min: 50, grade: "C", label: "Good",              color: "#0891b2", bg: "#cffafe" },
  { min: 40, grade: "D", label: "Satisfactory",      color: "#ca8a04", bg: "#fef9c3" },
  { min: 0,  grade: "E", label: "Needs Improvement", color: "#dc2626", bg: "#fee2e2" },
];

const SUBJECT_PALETTE = [
  "#2563eb","#16a34a","#d97706","#dc2626",
  "#7c3aed","#0891b2","#ea580c","#65a30d",
  "#db2777","#4f46e5",
];

const TABS = [
  { key: "Results",       icon: "📊", label: "Results"       },
  { key: "Attendance",    icon: "📋", label: "Attendance"    },
  { key: "Character",     icon: "🌟", label: "Character"     },
  { key: "Progress",      icon: "📈", label: "Progress"      },
  { key: "Report Card",   icon: "📄", label: "Report Card"   },
  { key: "Fees",          icon: "💳", label: "Fees"          },
  { key: "Announcements", icon: "📢", label: "Announcements" },
];

const REFRESH_INTERVAL = 60_000;

/* ─────────────────────────────────────────────
   Helpers
───────────────────────────────────────────── */
const fmt = (v) =>
  Number(v || 0).toLocaleString("en-GH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fmtDate = (iso) => {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GH", { day: "numeric", month: "short", year: "numeric" });
};

// FIX: unified grade function used by BOTH character areas AND career section
const charScoreGrade = (score) => {
  if (score === "" || score == null) return null;
  const n = parseFloat(score);
  return CHAR_SCORE_GRADES.find(g => n >= g.min) ?? CHAR_SCORE_GRADES[CHAR_SCORE_GRADES.length - 1];
};

// FIX: safe cohort label — prevents "Morning Cohort Cohort"
const formatCohort = (cohort) => {
  if (!cohort) return "—";
  return cohort.toLowerCase().includes("cohort") ? cohort : `${cohort} Cohort`;
};

function pwStrength(pw) {
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

/* ─────────────────────────────────────────────
   Icons
───────────────────────────────────────────── */
const EyeIcon = ({ open }) =>
  open ? (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  ) : (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/>
      <line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
  );

const RefreshIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
    <polyline points="23 4 23 10 17 10"/>
    <path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/>
  </svg>
);

/* ─────────────────────────────────────────────
   Change Password Modal
───────────────────────────────────────────── */
const ChangePasswordModal = ({ onClose }) => {
  const [current, setCurrent] = useState("");
  const [next, setNext]       = useState("");
  const [confirm, setConfirm] = useState("");
  const [showCur, setShowCur] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showCon, setShowCon] = useState(false);
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState("");
  const [success, setSuccess] = useState(false);

  const strength = pwStrength(next);
  const mismatch = confirm && next !== confirm;

  const handleSubmit = async () => {
    setError("");
    if (!current)         return setError("Enter your current password.");
    if (next.length < 8)  return setError("New password must be at least 8 characters.");
    if (next !== confirm)  return setError("New passwords do not match.");
    setSaving(true);
    try {
      await API.post("/auth/change-password/", { old_password: current, new_password: next });
      setSuccess(true);
      setTimeout(onClose, 2200);
    } catch (e) {
      const data = e.response?.data;
      setError(data?.old_password?.[0] || data?.new_password?.[0] || data?.detail || "Failed to change password.");
    } finally { setSaving(false); }
  };

  return (
    <div className="sp-modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="sp-modal">
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:"18px" }}>
          <div>
            <p className="sp-modal-title">Change Password</p>
            <p className="sp-modal-sub">Keep your account secure with a strong password.</p>
          </div>
          <button onClick={onClose} style={{ background:"none", border:"none", cursor:"pointer", color:"#94a3b8", fontSize:"20px", padding:"2px", lineHeight:1 }}>×</button>
        </div>
        {success ? (
          <div className="sp-pw-success">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
            Password changed successfully!
          </div>
        ) : (
          <>
            {[
              { label:"Current Password",    value:current, set:setCurrent, show:showCur, setShow:setShowCur, ph:"Enter current password" },
              { label:"New Password",         value:next,    set:setNext,    show:showNew, setShow:setShowNew, ph:"Min. 8 characters" },
              { label:"Confirm New Password", value:confirm, set:setConfirm, show:showCon, setShow:setShowCon, ph:"Repeat new password" },
            ].map(({ label, value, set, show, setShow, ph }, i) => (
              <div key={i} className="sp-modal-field">
                <label className="sp-field-label">{label}</label>
                <div className="sp-modal-input-wrap">
                  <input type={show ? "text" : "password"} className="sp-modal-input"
                    style={i === 2 ? { borderColor: mismatch ? "#f87171" : confirm && !mismatch ? "#34d399" : undefined } : {}}
                    placeholder={ph} value={value}
                    onChange={e => { set(e.target.value); setError(""); }} />
                  <button className="sp-modal-eye" onClick={() => setShow(v => !v)}><EyeIcon open={show} /></button>
                </div>
                {i === 1 && next && (
                  <>
                    <div className="sp-pw-strength" style={{ background: strength.color, width: strength.w }} />
                    <p className="sp-pw-hint" style={{ color: strength.color }}>{strength.label}</p>
                  </>
                )}
                {i === 2 && mismatch && <p className="sp-pw-hint" style={{ color:"#f87171" }}>Passwords don't match</p>}
              </div>
            ))}
            {error && <div className="sp-pw-error">{error}</div>}
            <div className="sp-modal-actions">
              <button className="sp-btn-secondary" onClick={onClose}>Cancel</button>
              <button className="sp-btn-primary" onClick={handleSubmit} disabled={saving || !!mismatch}>
                {saving ? <><div style={{width:"15px",height:"15px",border:"2px solid rgba(255,255,255,.3)",borderTopColor:"#fff",borderRadius:"50%",animation:"sp-spin .6s linear infinite"}}/>Saving…</> : "Update Password"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────────
   Payment components
───────────────────────────────────────────── */
const PaymentModal = ({ fee, user, onClose, onSuccess }) => {
  const termInfo  = TERMS.find(t => t.value === fee.term) || { label: fee.term, icon: "💳" };
  const balance   = Number(fee.balance);
  const [mode, setMode]             = useState("full");
  const [custom, setCustom]         = useState("");
  const [customErr, setCustomErr]   = useState("");
  const [paying, setPaying]         = useState(false);
  const [backendErr, setBackendErr] = useState("");

  const paystackKey = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY;
  const keyMissing  = !paystackKey || paystackKey.trim() === "";
  const payAmount   = mode === "full" ? balance : parseFloat(custom) || 0;

  const validate = () => {
    if (payAmount <= 0) return "Payment amount must be greater than zero.";
    if (mode === "partial") {
      const v = parseFloat(custom);
      if (!v || v <= 0)  return "Enter a valid amount.";
      if (v > balance)   return `Amount cannot exceed balance of GHS ${fmt(balance)}.`;
      if (v < 1)         return "Minimum payment is GHS 1.00.";
    }
    return null;
  };

  const handlePay = async () => {
    if (keyMissing) { setBackendErr("Payment gateway is not configured."); return; }
    const err = validate();
    if (err) { setCustomErr(err); return; }
    setCustomErr(""); setBackendErr(""); setPaying(true);
    let PaystackPop;
    try { PaystackPop = await loadPaystack(); }
    catch (loadErr) { setBackendErr(loadErr.message); setPaying(false); return; }
    const admissionNumber = user.admission_number || user.username || "student";
    const email           = `${admissionNumber.toLowerCase().replace(/[^a-z0-9]/g, "")}@student.school.com`;
    function handleClose() { setPaying(false); }
    function handleCallback(response) {
      API.post(`/fees/${fee.id}/pay/`, { amount: payAmount, note: `Paystack ref: ${response.reference}` })
        .then(() => onSuccess(payAmount, response.reference))
        .catch((e) => {
          setBackendErr(e.response?.data?.error || e.response?.data?.detail || "Payment received but not saved. Ref: " + response.reference);
          setPaying(false);
        });
    }
    const handler = PaystackPop.setup({
      key: paystackKey, email, amount: Math.round(payAmount * 100), currency: "GHS",
      ref: `FEE-${fee.id}-${Date.now()}`,
      metadata: { custom_fields: [
        { display_name:"Student",       variable_name:"student_name",     value: user.full_name || admissionNumber },
        { display_name:"Admission No.", variable_name:"admission_number", value: admissionNumber },
        { display_name:"Term",          variable_name:"term",             value: termInfo.label },
        { display_name:"Fee ID",        variable_name:"fee_id",           value: String(fee.id) },
      ]},
      onClose: handleClose, callback: handleCallback,
    });
    handler.openIframe();
  };

  return (
    <div className="sp-modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="sp-modal sp-pay-modal">
        <div className="sp-pay-modal-header">
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
            <div>
              <div className="sp-pay-modal-term">{termInfo.icon} {termInfo.label} — Fee Payment</div>
              <div className="sp-pay-modal-balance">GHS {fmt(balance)}</div>
              <div className="sp-pay-modal-balance-lbl">Outstanding balance</div>
            </div>
            <button onClick={onClose} style={{ background:"rgba(255,255,255,.1)", border:"none", cursor:"pointer", color:"rgba(255,255,255,.7)", fontSize:"18px", padding:"4px 8px", borderRadius:"6px", lineHeight:1 }}>×</button>
          </div>
        </div>
        {keyMissing && <div className="sp-gateway-err" style={{marginBottom:"14px"}}>⚠️ Payment gateway not configured.</div>}
        <div className="sp-modal-field">
          <label className="sp-field-label">Payment amount</label>
          <div className="sp-amount-options">
            <button className={`sp-amount-option ${mode==="full"?"selected":""}`} onClick={() => { setMode("full"); setCustomErr(""); }}>
              <div className="sp-amount-option-label">Full balance</div>
              <div className="sp-amount-option-val">GHS {fmt(balance)}</div>
            </button>
            <button className={`sp-amount-option ${mode==="partial"?"selected":""}`} onClick={() => { setMode("partial"); setCustomErr(""); }}>
              <div className="sp-amount-option-label">Partial amount</div>
              <div className="sp-amount-option-val" style={{ color: mode==="partial" && custom ? "#2563eb" : "#94a3b8" }}>
                {mode==="partial" && custom ? `GHS ${fmt(custom)}` : "Enter amount"}
              </div>
            </button>
          </div>
          {mode === "partial" && (
            <div className="sp-custom-amount-wrap">
              <div className="sp-custom-amount-input-row">
                <span className="sp-custom-amount-prefix">GHS</span>
                <input className="sp-custom-amount-input" type="number" min="1" step="0.01" max={balance}
                  placeholder="0.00" value={custom} onChange={e => { setCustom(e.target.value); setCustomErr(""); }} autoFocus />
              </div>
              {customErr && <div className="sp-amount-error">{customErr}</div>}
            </div>
          )}
        </div>
        {backendErr && <div className="sp-gateway-err">{backendErr}</div>}
        <button className="sp-pay-confirm-btn" onClick={handlePay} disabled={paying || keyMissing || (mode==="partial" && !custom)}>
          {paying
            ? <><div style={{width:"16px",height:"16px",border:"2px solid rgba(255,255,255,.3)",borderTopColor:"#fff",borderRadius:"50%",animation:"sp-spin .6s linear infinite"}}/>Opening Paystack…</>
            : <><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>Pay GHS {fmt(payAmount)}</>}
        </button>
        <div className="sp-paystack-badge">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
          Secured by Paystack · Mobile Money, Cards accepted
        </div>
      </div>
    </div>
  );
};

const PaySuccessOverlay = ({ amount, reference, onClose }) => (
  <div className="sp-pay-success-overlay">
    <div className="sp-pay-success-box">
      <div className="sp-pay-success-icon">✅</div>
      <div className="sp-pay-success-title">Payment Successful!</div>
      <div className="sp-pay-success-amount">GHS {fmt(amount)}</div>
      <div className="sp-pay-success-sub">Your payment has been recorded.<br/><span style={{fontFamily:"'DM Mono',monospace",fontSize:"11px",color:"#94a3b8"}}>Ref: {reference}</span></div>
      <button className="sp-pay-success-btn" onClick={onClose}>Done</button>
    </div>
  </div>
);

const TransactionHistory = ({ transactions }) => (
  <div className="sp-txn-section">
    <div className="sp-txn-title">Payment history</div>
    {!transactions || transactions.length === 0
      ? <div className="sp-txn-empty">No payments recorded yet</div>
      : <div className="sp-txn-list">
          {transactions.map(txn => (
            <div key={txn.id} className="sp-txn-item">
              <div className="sp-txn-icon">💸</div>
              <div className="sp-txn-info">
                <div className="sp-txn-note">{txn.note || "Fee payment"}</div>
                <div className="sp-txn-date">{txn.created_at ? new Date(txn.created_at).toLocaleDateString("en-GH", {day:"numeric",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit"}) : "—"}</div>
              </div>
              <div style={{textAlign:"right"}}>
                <div className="sp-txn-amount">+GHS {fmt(txn.amount)}</div>
                {txn.recorded_by_name && <div className="sp-txn-by">{txn.recorded_by_name}</div>}
              </div>
            </div>
          ))}
        </div>
    }
  </div>
);

const FeeTermCard = ({ fee, user, onPaymentSuccess }) => {
  const [open, setOpen]                 = useState(false);
  const [showPayModal, setShowPayModal] = useState(false);
  const [localFee, setLocalFee]         = useState(fee);
  useEffect(() => { setLocalFee(fee); }, [fee]);

  const balance   = Number(localFee.balance);
  const paid      = Number(localFee.paid);
  const total     = Number(localFee.total_amount);
  const isPaid    = balance <= 0;
  const isPartial = !isPaid && paid > 0;
  const pct       = total > 0 ? Math.min(100, Math.round((paid / total) * 100)) : 0;
  const termInfo  = TERMS.find(t => t.value === localFee.term) || { label: localFee.term, icon: "💳" };
  const progressColor = isPaid ? "#16a34a" : isPartial ? "#d97706" : "#dc2626";
  const lineItems = [
    { label:"School Fees",   value: localFee.amount },
    { label:"Book User Fee", value: localFee.book_user_fee },
    { label:"Workbook Fee",  value: localFee.workbook_fee },
    { label:"Arrears",       value: localFee.arrears },
  ].filter(r => Number(r.value) > 0);

  const handleSuccess = (amount, reference) => {
    setShowPayModal(false);
    setLocalFee(prev => {
      const newPaid    = Number(prev.paid) + amount;
      const newBalance = Number(prev.total_amount) - newPaid;
      return { ...prev, paid: newPaid, balance: newBalance, transactions: [
        { id: Date.now(), amount, note: `Paystack ref: ${reference}`, recorded_by_name: "Online payment", created_at: new Date().toISOString() },
        ...(prev.transactions || []),
      ]};
    });
    onPaymentSuccess(amount, reference);
  };

  return (
    <>
      {showPayModal && <PaymentModal fee={localFee} user={user} onClose={() => setShowPayModal(false)} onSuccess={handleSuccess} />}
      <div className="sp-fee-card">
        <div className="sp-fee-card-header" onClick={() => setOpen(o => !o)}>
          <div className="sp-fee-card-left">
            <div className="sp-fee-term-icon" style={{ background: isPaid ? "#dcfce7" : isPartial ? "#fef9c3" : "#fee2e2" }}>{termInfo.icon}</div>
            <div>
              <div className="sp-fee-term-name">{termInfo.label}</div>
              <div className="sp-fee-term-meta">{isPaid ? "Fully paid" : `GHS ${fmt(balance)} remaining`}</div>
            </div>
          </div>
          <div className="sp-fee-card-right">
            {isPaid ? <span className="sp-status-paid">✓ PAID</span> : isPartial ? <span className="sp-status-partial">◑ PARTIAL</span> : <span className="sp-status-unpaid">✕ UNPAID</span>}
            <span className={`sp-fee-chevron ${open ? "open" : ""}`}>▾</span>
          </div>
        </div>
        <div className={`sp-fee-card-body ${open ? "open" : ""}`}>
          <div className="sp-fee-body-inner">
            {total > 0 && (
              <div className="sp-fee-progress-wrap">
                <div className="sp-fee-progress-label"><span>{pct}% paid</span><span>GHS {fmt(paid)} of GHS {fmt(total)}</span></div>
                <div className="sp-fee-progress-bar"><div className="sp-fee-progress-fill" style={{width:`${pct}%`,background:progressColor}}/></div>
              </div>
            )}
            <div className="sp-fee-lines">
              {lineItems.map(r => (
                <div key={r.label} className="sp-fee-line">
                  <span className="sp-fee-line-label">{r.label}</span>
                  <span className="sp-fee-line-val">GHS {fmt(r.value)}</span>
                </div>
              ))}
              <div className="sp-fee-line sp-fee-line-total"><span>Total</span><span className="sp-fee-line-val">GHS {fmt(total)}</span></div>
              <div className="sp-fee-line"><span className="sp-fee-line-label sp-fee-line-paid">Amount Paid</span><span className="sp-fee-line-val sp-fee-line-paid">GHS {fmt(paid)}</span></div>
              <div className="sp-fee-line"><span className="sp-fee-line-label sp-fee-line-balance">Balance Due</span><span className="sp-fee-line-val sp-fee-line-balance">GHS {fmt(balance)}</span></div>
            </div>
            {isPaid
              ? <div className="sp-pay-btn-paid"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>All fees paid — Thank you!</div>
              : <><button className="sp-pay-btn" onClick={() => setShowPayModal(true)}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>Pay Now — GHS {fmt(balance)}</button><div className="sp-paystack-badge"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>Secured by Paystack · Mobile Money, Cards accepted</div></>
            }
            <TransactionHistory transactions={localFee.transactions} />
          </div>
        </div>
      </div>
    </>
  );
};

const FeesOverview = ({ fees }) => {
  const totalBilled  = fees.reduce((s, f) => s + Number(f.total_amount || 0), 0);
  const totalPaid    = fees.reduce((s, f) => s + Number(f.paid || 0), 0);
  const totalBalance = fees.reduce((s, f) => s + Number(f.balance || 0), 0);
  const fullyPaid    = fees.filter(f => Number(f.balance) <= 0).length;
  const pct          = totalBilled > 0 ? Math.round((totalPaid / totalBilled) * 100) : 0;
  return (
    <div className="sp-fee-overview">
      <div className="sp-fee-overview-label">Total outstanding balance</div>
      <div className="sp-fee-overview-total">GHS {fmt(totalBalance)}</div>
      <div className="sp-fee-overview-sub">{pct}% of all fees paid · {fullyPaid}/{fees.length} terms cleared</div>
      <div style={{marginTop:"14px",height:"6px",borderRadius:"99px",background:"rgba(255,255,255,.12)",overflow:"hidden"}}>
        <div style={{height:"100%",borderRadius:"99px",width:`${pct}%`,background:"linear-gradient(90deg,#00c3f7,#00e676)",transition:"width .6s ease"}}/>
      </div>
      <div className="sp-fee-overview-stats">
        {[{val:`GHS ${fmt(totalBilled)}`,lbl:"Total Billed",color:"#fff"},{val:`GHS ${fmt(totalPaid)}`,lbl:"Total Paid",color:"#00e676"},{val:`GHS ${fmt(totalBalance)}`,lbl:"Balance Due",color:totalBalance>0?"#ff6b6b":"#00e676"}].map(s=>(
          <div key={s.lbl} className="sp-fee-overview-stat">
            <div className="sp-fee-overview-stat-val" style={{color:s.color}}>{s.val}</div>
            <div className="sp-fee-overview-stat-lbl">{s.lbl}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────────
   Shared display components
───────────────────────────────────────────── */
const GradeBadge = ({ grade }) => {
  const c = GRADE_REMARK[grade];
  return (
    <span className="sp-badge" style={c ? { background: c.bg, color: c.color } : { background:"#f1f5f9", color:"#64748b" }}>
      {grade ?? "—"}
    </span>
  );
};

const RemarkBadge = ({ grade }) => {
  const c = GRADE_REMARK[grade];
  return (
    <span className="sp-badge" style={c ? { background: c.bg, color: c.color, fontWeight:500, fontFamily:"'Outfit',sans-serif" } : { background:"#f1f5f9", color:"#94a3b8" }}>
      {c?.label ?? "—"}
    </span>
  );
};

const KpiCard = ({ label, value, sub }) => (
  <div className="sp-kpi">
    <div className="sp-kpi-value">{value ?? "—"}</div>
    {sub && <div className="sp-kpi-sub">{sub}</div>}
    <div className="sp-kpi-label">{label}</div>
  </div>
);

const Empty = ({ icon, title, sub }) => (
  <div className="sp-empty">
    <div className="sp-empty-icon">{icon}</div>
    <h3>{title}</h3>
    {sub && <p>{sub}</p>}
  </div>
);

const Loading = ({ text = "Loading…" }) => (
  <div className="sp-loading"><div className="sp-spinner"/>{text}</div>
);

/* ─────────────────────────────────────────────
   Subject results table
───────────────────────────────────────────── */
const SubjectTable = ({ report }) => (
  <div className="sp-card">
    <div className="sp-table-wrap">
      <table className="sp-table">
        <thead>
          <tr>
            <th style={{textAlign:"left",padding:"10px 14px"}}>Subject</th>
            <th className="c">Re-Open<br/><span style={{fontSize:"9px",fontWeight:400,textTransform:"none"}}>/ 20</span></th>
            <th className="c">CA / MGT<br/><span style={{fontSize:"9px",fontWeight:400,textTransform:"none"}}>/ 40</span></th>
            <th className="c">Exams<br/><span style={{fontSize:"9px",fontWeight:400,textTransform:"none"}}>/ 40</span></th>
            <th className="c">Total<br/><span style={{fontSize:"9px",fontWeight:400,textTransform:"none"}}>/ 100</span></th>
            {report.show_position && <th className="c">Pos</th>}
            <th className="c">Grade</th>
            <th className="c">Remark</th>
          </tr>
        </thead>
        <tbody>
          {report.subjects?.map((sub, i) => (
            <tr key={i}>
              <td style={{fontWeight:"600",color:"#1e293b"}}>{sub.subject}</td>
              <td className="c"><span className="sp-muted" style={{fontFamily:"'DM Mono',monospace"}}>{sub.reopen ?? "—"}</span></td>
              <td className="c"><span className="sp-muted" style={{fontFamily:"'DM Mono',monospace"}}>{sub.ca ?? "—"}</span></td>
              <td className="c"><span className="sp-muted" style={{fontFamily:"'DM Mono',monospace"}}>{sub.exams ?? "—"}</span></td>
              <td className="c sp-score">{sub.score}</td>
              {report.show_position && <td className="c" style={{fontWeight:"600",color:"#64748b"}}>{sub.subject_position ?? "—"}</td>}
              <td className="c"><GradeBadge grade={sub.grade}/></td>
              <td className="c"><RemarkBadge grade={sub.grade}/></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

/* ─────────────────────────────────────────────
   Progress charts
───────────────────────────────────────────── */
const SubjectLineChart = ({ subject, data, color }) => {
  const W = 280, H = 90, PAD = 18;
  const scores = data.map(d => d.score);
  const min    = Math.max(0,   Math.min(...scores) - 12);
  const max    = Math.min(100, Math.max(...scores) + 12);
  const range  = max - min || 1;
  const pts    = data.map((d, i) => ({
    x: PAD + (i / Math.max(data.length - 1, 1)) * (W - PAD * 2),
    y: PAD + (1 - (d.score - min) / range) * (H - PAD * 2),
    score: d.score, term: d.term,
  }));
  const pathD  = pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  const areaD  = pts.length > 0 ? `${pathD} L ${pts[pts.length-1].x} ${H-PAD} L ${pts[0].x} ${H-PAD} Z` : "";
  const latest   = scores[scores.length - 1];
  const previous = scores.length > 1 ? scores[scores.length - 2] : null;
  const diff     = previous != null ? latest - previous : null;
  return (
    <div className="sp-chart-card">
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:"8px"}}>
        <p style={{fontWeight:"700",fontSize:"13px",color:"#1e293b",margin:0}}>{subject}</p>
        <div style={{textAlign:"right"}}>
          <p style={{fontFamily:"'DM Mono',monospace",fontWeight:"800",color,fontSize:"18px",margin:0,lineHeight:1}}>{latest}</p>
          {diff != null && Math.abs(diff) >= 0.5 && (
            <p style={{fontSize:"11px",fontWeight:"600",margin:0,color:diff>0?"#16a34a":"#dc2626"}}>{diff>0?`▲ +${diff.toFixed(1)}`:`▼ ${diff.toFixed(1)}`}</p>
          )}
        </div>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{width:"100%",height:76}}>
        {areaD && <path d={areaD} fill={color} fillOpacity="0.07"/>}
        {[0,.5,1].map(t=><line key={t} x1={PAD} y1={PAD+t*(H-PAD*2)} x2={W-PAD} y2={PAD+t*(H-PAD*2)} stroke="#f1f5f9" strokeWidth="1"/>)}
        {pts.length > 1 && <path d={pathD} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>}
        {pts.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r="4.5" fill="white" stroke={color} strokeWidth="2.5"/>
            <text x={p.x} y={H-2} textAnchor="middle" fontSize="9" fill="#94a3b8">{TERMS.find(t=>t.value===p.term)?.label.replace("Term ","T")}</text>
            <text x={p.x} y={p.y-8} textAnchor="middle" fontSize="9" fill={color} fontWeight="700">{p.score}</text>
          </g>
        ))}
      </svg>
    </div>
  );
};

const OverallTrendChart = ({ termData }) => {
  const W = 480, H = 110, PAD = 24;
  const avgs  = termData.map(d => parseFloat(d.average) || 0);
  const min   = Math.max(0,   Math.min(...avgs) - 15);
  const max   = Math.min(100, Math.max(...avgs) + 15);
  const range = max - min || 1;
  const pts   = termData.map((d, i) => ({
    x: PAD + (i / Math.max(termData.length - 1, 1)) * (W - PAD * 2),
    y: PAD + (1 - ((parseFloat(d.average) || 0) - min) / range) * (H - PAD * 2),
    ...d,
  }));
  const pathD = pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  const areaD = pts.length > 0 ? `${pathD} L ${pts[pts.length-1].x} ${H-PAD} L ${pts[0].x} ${H-PAD} Z` : "";
  return (
    <div className="sp-card">
      <div className="sp-card-head"><span className="sp-card-title">Overall Average — All Terms</span></div>
      <div style={{padding:"16px 18px 10px"}}>
        <svg viewBox={`0 0 ${W} ${H}`} style={{width:"100%",height:100}}>
          <defs><linearGradient id="spGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#2563eb" stopOpacity="0.15"/><stop offset="100%" stopColor="#2563eb" stopOpacity="0"/></linearGradient></defs>
          {areaD && <path d={areaD} fill="url(#spGrad)"/>}
          {[0,.5,1].map(t=><line key={t} x1={PAD} y1={PAD+t*(H-PAD*2)} x2={W-PAD} y2={PAD+t*(H-PAD*2)} stroke="#f1f5f9" strokeWidth="1"/>)}
          {pts.length > 1 && <path d={pathD} fill="none" stroke="#2563eb" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>}
          {pts.map((p, i) => (
            <g key={i}>
              <circle cx={p.x} cy={p.y} r="6" fill="white" stroke="#2563eb" strokeWidth="3"/>
              <text x={p.x} y={H-3} textAnchor="middle" fontSize="10" fill="#94a3b8">{p.label}</text>
              <text x={p.x} y={p.y-10} textAnchor="middle" fontSize="11" fill="#2563eb" fontWeight="700">{p.average}</text>
            </g>
          ))}
        </svg>
        <div style={{display:"grid",gridTemplateColumns:`repeat(${termData.length},1fr)`,gap:"10px",marginTop:"14px",paddingTop:"14px",borderTop:"1px solid var(--line)"}}>
          {termData.map(d => (
            <div key={d.term} style={{textAlign:"center",background:"#f8fafc",borderRadius:"10px",padding:"12px 8px",border:"1px solid var(--line)"}}>
              <p style={{fontSize:"10px",fontWeight:"700",color:"#94a3b8",textTransform:"uppercase",letterSpacing:".6px",margin:"0 0 4px"}}>{d.label}</p>
              <p style={{fontFamily:"'DM Mono',monospace",fontWeight:"900",color:"#2563eb",fontSize:"22px",margin:"0 0 2px",lineHeight:1}}>{d.average ?? "—"}</p>
              <p style={{fontSize:"11px",color:"#94a3b8",margin:0}}>avg · <b style={{color:"#475569"}}>{d.total}</b> total</p>
              {d.position && <p style={{fontSize:"11px",color:"#94a3b8",margin:"2px 0 0"}}>Pos: <b style={{color:"#475569"}}>{d.position}</b></p>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────────
   Main StudentPortal
───────────────────────────────────────────── */
const StudentPortal = () => {
  useEffect(() => {
    if (document.getElementById("sp-styles")) return;
    const el = document.createElement("style");
    el.id = "sp-styles";
    el.textContent = PORTAL_STYLES;
    document.head.appendChild(el);
  }, []);

  useEffect(() => { loadPaystack().catch(() => {}); }, []);

  const user = getUser();

  const [tab, setTab]                   = useState("Results");
  const [selectedTerm, setSelectedTerm] = useState("term1");

  const [report, setReport]             = useState(null);
  const [loadingReport, setLoadingReport] = useState(false);

  const [allReports, setAllReports]         = useState({});
  const [loadingProgress, setLoadingProgress] = useState(false);

  const [attendance, setAttendance]     = useState([]);
  const [loadingAtt, setLoadingAtt]     = useState(false);
  const [attStats, setAttStats]         = useState({ present:0, absent:0, late:0, total:0 });

  const [charAssessment, setCharAssessment] = useState(null);
  const [loadingChar, setLoadingChar]       = useState(false);

  const [fees, setFees]               = useState([]);
  const [loadingFees, setLoadingFees] = useState(false);

  const [error, setError]                   = useState("");
  const [showPwModal, setShowPwModal]       = useState(false);
  const [successPayment, setSuccessPayment] = useState(null);
  const [isRefreshing, setIsRefreshing]     = useState(false);
  const [lastRefreshed, setLastRefreshed]   = useState(null);

  const autoRefreshTimer = useRef(null);

  /* ── Fetch functions ── */

  const fetchReport = useCallback(async (term, quiet = false) => {
    if (!quiet) setLoadingReport(true);
    setError("");
    try {
      const r = await API.get(`/report/student/${user.student_id}/?term=${term}`);
      setReport(r.data);
    } catch {
      if (!quiet) setError("No report found for this term.");
      setReport(null);
    } finally {
      if (!quiet) setLoadingReport(false);
    }
  }, [user.student_id]);

  const fetchAllReports = useCallback(async (quiet = false) => {
    if (!quiet) setLoadingProgress(true);
    const results = {};
    await Promise.all(TERMS.map(async ({ value }) => {
      try {
        const r = await API.get(`/report/student/${user.student_id}/?term=${value}`);
        results[value] = r.data;
      } catch {}
    }));
    setAllReports(results);
    if (!quiet) setLoadingProgress(false);
  }, [user.student_id]);

  const fetchAttendance = useCallback(async (quiet = false) => {
    if (!quiet) setLoadingAtt(true);
    try {
      const r = await API.get(`/attendance/?student=${user.student_id}&term=${selectedTerm}&ordering=date`);
      const records = r.data.results ?? r.data;
      setAttendance(records);
      const stats = records.reduce(
        (acc, rec) => {
          acc.total++;
          if (rec.status === "present") acc.present++;
          else if (rec.status === "absent") acc.absent++;
          else if (rec.status === "late") acc.late++;
          return acc;
        },
        { present:0, absent:0, late:0, total:0 }
      );
      setAttStats(stats);
    } catch {
      if (!quiet) setError("Could not load attendance records.");
    } finally {
      if (!quiet) setLoadingAtt(false);
    }
  }, [user.student_id, selectedTerm]);

  const fetchCharAssessment = useCallback(async (quiet = false) => {
  if (!quiet) setLoadingChar(true);
  try {
    let data = null;

    // Fetch without year filter — get all records for student+term, pick latest
    try {
      const r = await API.get(
        `/character-assessment/?student=${user.student_id}&term=${selectedTerm}`
      );
      const all = r.data?.results ?? (Array.isArray(r.data) ? r.data : []);
      if (all.length > 0) {
        all.sort((a, b) => {
          if (b.year !== a.year) return b.year - a.year;
          return new Date(b.created_at) - new Date(a.created_at);
        });
        data = all[0];
      }
    } catch {}

    // Fallback: try admission_number if numeric student_id returned nothing
    if (!data && user?.admission_number && String(user.admission_number) !== String(user.student_id)) {
      try {
        const r2 = await API.get(
          `/character-assessment/?student=${user.admission_number}&term=${selectedTerm}`
        );
        const all2 = r2.data?.results ?? (Array.isArray(r2.data) ? r2.data : []);
        if (all2.length > 0) {
          all2.sort((a, b) => {
            if (b.year !== a.year) return b.year - a.year;
            return new Date(b.created_at) - new Date(a.created_at);
          });
          data = all2[0];
        }
      } catch {}
    }

    setCharAssessment(data && (data.areas || data.career || data.cohort) ? data : null);
  } catch {
    setCharAssessment(null);
  } finally {
    if (!quiet) setLoadingChar(false);
  }
}, [user.student_id, user.admission_number, selectedTerm]);

  const fetchFees = useCallback(async (quiet = false) => {
    if (!quiet) setLoadingFees(true);
    try {
      const r = await API.get(`/fees/?student=${user.student_id}`);
      setFees(r.data.results ?? r.data);
    } catch {
      if (!quiet) setError("Failed to load fees.");
    } finally {
      if (!quiet) setLoadingFees(false);
    }
  }, [user.student_id]);

  const refreshCurrentTab = useCallback(async (quiet = false) => {
    if (!quiet) setIsRefreshing(true);
    try {
      switch (tab) {
        case "Results":
        case "Report Card": await fetchReport(selectedTerm, quiet); break;
        case "Attendance":  await fetchAttendance(quiet); break;
        case "Character":   await fetchCharAssessment(quiet); break;
        case "Progress":    await fetchAllReports(quiet); break;
        case "Fees":        await fetchFees(quiet); break;
        default: break;
      }
      setLastRefreshed(new Date());
    } finally {
      if (!quiet) setIsRefreshing(false);
    }
  }, [tab, selectedTerm, fetchReport, fetchAttendance, fetchCharAssessment, fetchAllReports, fetchFees]);

  useEffect(() => {
    setError("");
    switch (tab) {
      case "Results":
      case "Report Card": fetchReport(selectedTerm); break;
      case "Attendance":  fetchAttendance(); break;
      case "Character":   fetchCharAssessment(); break;
      case "Progress":    fetchAllReports(); break;
      case "Fees":        fetchFees(); break;
      default: break;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, selectedTerm]);

  useEffect(() => {
    autoRefreshTimer.current = setInterval(() => { refreshCurrentTab(true); }, REFRESH_INTERVAL);
    return () => clearInterval(autoRefreshTimer.current);
  }, [refreshCurrentTab]);

  useEffect(() => {
    const handleFocus = () => refreshCurrentTab(true);
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [refreshCurrentTab]);

  /* ── Progress derived data ── */
  const subjectTrends = (() => {
    const map = {};
    TERMS.forEach(({ value: term }) => {
      const rep = allReports[term];
      if (!rep?.subjects) return;
      rep.subjects.forEach(sub => {
        if (!map[sub.subject]) map[sub.subject] = [];
        map[sub.subject].push({ term, score: parseFloat(sub.score) || 0 });
      });
    });
    return map;
  })();

  const termSummary = TERMS
    .filter(({ value }) => allReports[value])
    .map(({ value, label }) => ({
      term: value, label,
      average:  allReports[value]?.average_score,
      total:    allReports[value]?.total_score,
      position: allReports[value]?.show_position ? allReports[value]?.position_formatted : null,
    }));

  const subjectNames = Object.keys(subjectTrends);

  const mostImproved = (() => {
    let best = null, bestDelta = -Infinity;
    Object.entries(subjectTrends).forEach(([name, pts]) => {
      if (pts.length < 2) return;
      const delta = pts[pts.length-1].score - pts[0].score;
      if (delta > bestDelta) { bestDelta = delta; best = { name, delta }; }
    });
    return best;
  })();

  const needsAttention = (() => {
    let worst = null, worstDelta = Infinity;
    Object.entries(subjectTrends).forEach(([name, pts]) => {
      if (pts.length < 2) return;
      const delta = pts[pts.length-1].score - pts[0].score;
      if (delta < worstDelta) { worstDelta = delta; worst = { name, delta }; }
    });
    return worst && worstDelta < 0 ? worst : null;
  })();

  const handlePaymentSuccess = (amount, reference) => {
    setSuccessPayment({ amount, reference });
    setTimeout(() => fetchFees(true), 3000);
  };

  const downloadReport = async () => {
    try {
      const r = await API.get(`/report/student/${user.student_id}/pdf/?term=${selectedTerm}`, { responseType:"blob" });
      const link = document.createElement("a");
      link.href  = window.URL.createObjectURL(new Blob([r.data]));
      link.setAttribute("download", `report_${selectedTerm}.pdf`);
      document.body.appendChild(link); link.click(); link.remove();
    } catch { setError("Failed to download report."); }
  };

  const showTermBar      = !["Progress", "Announcements", "Fees"].includes(tab);
  const lastRefreshedLabel = lastRefreshed
    ? lastRefreshed.toLocaleTimeString("en-GH", { hour:"2-digit", minute:"2-digit" })
    : null;

  /* ── Character tab derived values ── */
  const charFilledAreas = CHAR_AREAS.filter(
    a => charAssessment?.areas?.[a.key]?.score !== "" && charAssessment?.areas?.[a.key]?.score != null
  );
  const charScores  = charFilledAreas.map(a => parseFloat(charAssessment.areas[a.key].score));
  const charAvgScore = charScores.length
    ? Math.round(charScores.reduce((s, v) => s + v, 0) / charScores.length)
    : null;
  const charAvgGrade    = charAvgScore != null ? charScoreGrade(charAvgScore) : null;
  const charCompletePct = charAssessment
    ? Math.round((charFilledAreas.length / CHAR_AREAS.length) * 100)
    : 0;
  // FIX: career entries — only those with a score; used to conditionally show career section
  const careerEntries = charAssessment?.career
    ? Object.entries(charAssessment.career).filter(([, e]) => e?.score !== "" && e?.score != null)
    : [];

  return (
    <div className="sp-root">

      {successPayment && (
        <PaySuccessOverlay amount={successPayment.amount} reference={successPayment.reference} onClose={() => setSuccessPayment(null)} />
      )}
      {showPwModal && <ChangePasswordModal onClose={() => setShowPwModal(false)} />}

      {/* ── Header ── */}
      <header className="sp-header">
        <div className="sp-header-inner">
          {user.photo
            ? <img src={user.photo} alt="avatar" className="sp-avatar" onError={e => { e.target.style.display="none"; }}/>
            : <div className="sp-avatar-fallback">{user.full_name?.[0] ?? "S"}</div>
          }
          <div>
            <div className="sp-header-name">{user.full_name}</div>
            <div className="sp-header-sub">{user.admission_number} · {user.class}</div>
          </div>
          <nav className="sp-nav" style={{marginLeft:"auto",marginRight:"12px"}}>
            {TABS.map(({ key, icon, label }) => (
              <button key={key} onClick={() => setTab(key)}
                className={`sp-nav-btn ${tab===key?"sp-nav-btn-active":""}`}>
                <span>{icon}</span><span>{label}</span>
              </button>
            ))}
          </nav>
          <div className="sp-header-actions">
            <button
              className={`sp-btn-refresh ${isRefreshing ? "spinning" : ""}`}
              onClick={() => refreshCurrentTab(false)}
              disabled={isRefreshing}
              title="Refresh data"
            >
              <RefreshIcon />
              <span style={{fontSize:"11px"}}>Refresh</span>
            </button>
            <button className="sp-btn-ghost" onClick={() => setShowPwModal(true)}>🔑 Password</button>
            <button className="sp-btn-danger" onClick={logout}>Sign out</button>
          </div>
        </div>
        <div className="sp-mobile-nav">
          <div className="sp-mobile-nav-inner">
            {TABS.map(({ key, icon, label }) => (
              <button key={key} onClick={() => setTab(key)}
                className={`sp-mobile-btn ${tab===key?"sp-mobile-btn-active":""}`}>
                <span style={{fontSize:"18px"}}>{icon}</span>{label}
              </button>
            ))}
          </div>
        </div>
      </header>

      <div className="sp-body">

        {/* ── Term bar ── */}
        {showTermBar && (
          <div className="sp-term-bar">
            <div>
              <label className="sp-field-label">Term</label>
              <select className="sp-select" value={selectedTerm} onChange={e => setSelectedTerm(e.target.value)}>
                {TERMS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            {tab === "Report Card" && report && (
              <button className="sp-btn-pdf" onClick={downloadReport}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                Download PDF
              </button>
            )}
            {lastRefreshedLabel && (
              <div className="sp-last-updated">
                <span className="sp-last-updated-dot"/>
                Updated {lastRefreshedLabel}
              </div>
            )}
          </div>
        )}

        {/* ── Error ── */}
        {error && (
          <div className="sp-alert">
            <span>⚠ {error}</span>
            <button onClick={() => setError("")} style={{background:"none",border:"none",cursor:"pointer",color:"inherit",fontSize:"18px",opacity:.6,padding:"0 0 0 12px"}}>×</button>
          </div>
        )}

        {/* ════════════════════════════════════
            TAB: Results
        ════════════════════════════════════ */}
        {tab === "Results" && (
          <>
            {loadingReport && <Loading text="Loading results…"/>}
            {!loadingReport && !report && <Empty icon="📭" title="No results found" sub="Results will appear here once your teacher has saved them."/>}
            {!loadingReport && report && (
              <div style={{display:"flex",flexDirection:"column",gap:"14px"}}>
                <div className="sp-kpi-grid">
                  <KpiCard label="Total Marks" value={report.total_score}/>
                  <KpiCard label="Average"     value={report.average_score}/>
                  <KpiCard label="Position"
                    value={report.show_position ? report.position_formatted : "N/A"}
                    sub={report.show_position && report.out_of ? `out of ${report.out_of}` : null}
                  />
                  <KpiCard label="Overall Grade" value={report.overall_grade}/>
                </div>
                <div className="sp-card">
                  <div className="sp-card-head">
                    <span className="sp-card-title">{TERMS.find(t=>t.value===selectedTerm)?.label} — Subject Results</span>
                    <span style={{fontSize:"12px",color:"#94a3b8"}}>{report.subjects?.length ?? 0} subjects</span>
                  </div>
                </div>
                <SubjectTable report={report}/>
              </div>
            )}
          </>
        )}

        {/* ════════════════════════════════════
            TAB: Attendance
        ════════════════════════════════════ */}
        {tab === "Attendance" && (
          <>
            {loadingAtt && <Loading text="Loading attendance records…"/>}
            {!loadingAtt && (
              <>
                <div className="sp-att-grid">
                  <div className="sp-att-kpi sp-att-present">
                    <div className="sp-att-kpi-val">{attStats.present}</div>
                    <div className="sp-att-kpi-lbl">Present</div>
                  </div>
                  <div className="sp-att-kpi sp-att-absent">
                    <div className="sp-att-kpi-val">{attStats.absent}</div>
                    <div className="sp-att-kpi-lbl">Absent</div>
                  </div>
                  <div className="sp-att-kpi sp-att-late">
                    <div className="sp-att-kpi-val">{attStats.late}</div>
                    <div className="sp-att-kpi-lbl">Late</div>
                  </div>
                </div>

                {attStats.total > 0 && (
                  <div className="sp-card" style={{marginBottom:"14px"}}>
                    <div className="sp-card-head">
                      <span className="sp-card-title">Attendance Rate</span>
                      <span style={{fontFamily:"'DM Mono',monospace",fontWeight:"800",fontSize:"15px",
                        color: (attStats.present / attStats.total) >= 0.8 ? "#16a34a" : (attStats.present / attStats.total) >= 0.6 ? "#d97706" : "#dc2626"
                      }}>
                        {Math.round((attStats.present / attStats.total) * 100)}%
                      </span>
                    </div>
                    <div style={{padding:"12px 18px 16px"}}>
                      <div className="sp-progress-bar">
                        <div className="sp-progress-fill" style={{
                          width: `${Math.round((attStats.present / attStats.total) * 100)}%`,
                          background: (attStats.present / attStats.total) >= 0.8 ? "#16a34a" : (attStats.present / attStats.total) >= 0.6 ? "#d97706" : "#dc2626",
                        }}/>
                      </div>
                      <p style={{fontSize:"11.5px",color:"#94a3b8",marginTop:"5px"}}>
                        {attStats.present} of {attStats.total} school days marked present
                        {attStats.late > 0 ? ` · ${attStats.late} late` : ""}
                      </p>
                    </div>
                  </div>
                )}

                {attendance.length === 0
                  ? <Empty icon="📋" title="No attendance records yet" sub="Your teacher's attendance records will appear here."/>
                  : (
                    <div className="sp-card">
                      <div className="sp-card-head">
                        <span className="sp-card-title">Daily Attendance — {TERMS.find(t=>t.value===selectedTerm)?.label}</span>
                        <span style={{fontSize:"12px",color:"#94a3b8"}}>{attendance.length} days recorded</span>
                      </div>
                      <div className="sp-table-wrap">
                        <table className="sp-table">
                          <thead>
                            <tr>
                              <th style={{textAlign:"left",padding:"10px 14px"}}>#</th>
                              <th style={{textAlign:"left",padding:"10px 14px"}}>Date</th>
                              <th className="c">Day</th>
                              <th className="c">Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {attendance.map((rec, i) => {
                              const d = new Date(rec.date);
                              const day = d.toLocaleDateString("en-GH", { weekday:"short" });
                              const dateStr = d.toLocaleDateString("en-GH", { day:"numeric", month:"short", year:"numeric" });
                              const statusClass = rec.status === "present" ? "sp-att-present-pill" : rec.status === "absent" ? "sp-att-absent-pill" : "sp-att-late-pill";
                              const statusLabel = rec.status === "present" ? "✓ Present" : rec.status === "absent" ? "✕ Absent" : "⚠ Late";
                              return (
                                <tr key={rec.id ?? i}>
                                  <td style={{color:"#94a3b8",fontSize:"12px"}}>{i+1}</td>
                                  <td style={{fontWeight:"600",color:"#1e293b"}}>{dateStr}</td>
                                  <td className="c" style={{color:"#94a3b8",fontSize:"12px"}}>{day}</td>
                                  <td className="c"><span className={`sp-att-pill ${statusClass}`}>{statusLabel}</span></td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )
                }
              </>
            )}
          </>
        )}

        {/* ════════════════════════════════════
            TAB: Character Assessment
            All 6 bugs fixed + 4 UX improvements
        ════════════════════════════════════ */}
        {tab === "Character" && (
          <>
            {loadingChar && <Loading text="Loading character assessment…"/>}
            {!loadingChar && !charAssessment && (
              <Empty icon="🌟" title="No character assessment yet"
                sub="Your teacher's character assessment for this term will appear here."/>
            )}
            {!loadingChar && charAssessment && (
              <div style={{display:"flex",flexDirection:"column",gap:"14px"}}>

                {/* FIX 2: sp-kpi-grid only — no Tailwind hybrid */}
                {/* FIX 10: Date Assessed as KPI card instead of buried in header */}
                <div className="sp-kpi-grid">
                  <KpiCard label="Cohort"          value={formatCohort(charAssessment.cohort)} />
                  <KpiCard label="Areas Assessed"  value={`${charFilledAreas.length} / ${CHAR_AREAS.length}`} />
                  <KpiCard label="Avg Score"        value={charAvgScore ?? "—"} />
                  <KpiCard label="Date Assessed"
                    value={charAssessment.teacher_date ? fmtDate(charAssessment.teacher_date) : "—"}
                  />
                </div>

                {/* Character Areas */}
                <div className="sp-char-section">
                  <div className="sp-char-header">
                    <div className="sp-char-header-title">Character Assessment</div>
                    <div className="sp-char-header-sub">
                      {TERMS.find(t=>t.value===selectedTerm)?.label}
                      {charAssessment.cohort ? ` · ${formatCohort(charAssessment.cohort)}` : ""}
                      {charAssessment.teacher_name ? ` · ${charAssessment.teacher_name}` : ""}
                    </div>
                  </div>

                  {/* FIX 8: Completion progress bar */}
                  <div className="sp-char-completion">
                    <span className="sp-char-completion-label">
                      {charFilledAreas.length} of {CHAR_AREAS.length} areas assessed
                    </span>
                    <div className="sp-char-completion-bar">
                      <div className="sp-char-completion-fill" style={{
                        width: `${charCompletePct}%`,
                        background: charCompletePct === 100 ? "#16a34a" : charCompletePct >= 50 ? "#2563eb" : "#d97706",
                      }}/>
                    </div>
                    <span className="sp-char-completion-pct" style={{
                      color: charCompletePct === 100 ? "#16a34a" : charCompletePct >= 50 ? "#2563eb" : "#d97706",
                    }}>
                      {charCompletePct}%
                    </span>
                  </div>

                  {/* FIX 4: sp-char-area-row only — @media handles mobile stacking */}
                  {CHAR_AREAS.map(area => {
                    const entry     = charAssessment.areas?.[area.key];
                    const score     = entry?.score;
                    const remarks   = entry?.remarks;
                    const gradeInfo = charScoreGrade(score);
                    const pct       = score !== "" && score != null ? Math.min(100, parseFloat(score)) : 0;
                    const barColor  = gradeInfo?.color ?? "#e2e8f0";
                    return (
                      <div key={area.key} className="sp-char-area-row">
                        {/* FIX 9: Guide text shown under area label */}
                        <div style={{minWidth:"180px"}}>
                          <div className="sp-char-area-name">{area.label}</div>
                          <div className="sp-char-area-guide">{area.guide}</div>
                        </div>
                        {score !== "" && score != null ? (
                          <>
                            <div className="sp-char-score-bar-wrap">
                              <div className="sp-char-score-bar">
                                <div className="sp-char-score-fill" style={{width:`${pct}%`,background:barColor}}/>
                              </div>
                            </div>
                            <div className="sp-char-area-right">
                              <span style={{fontFamily:"'DM Mono',monospace",fontWeight:"800",color:barColor,fontSize:"15px",minWidth:"32px",textAlign:"right"}}>{score}</span>
                              {gradeInfo && (
                                <span className="sp-char-score-chip" style={{background:gradeInfo.bg,color:gradeInfo.color}}>
                                  {gradeInfo.grade} — {gradeInfo.label}
                                </span>
                              )}
                            </div>
                            {remarks && <div className="sp-char-remarks" title={remarks}>"{remarks}"</div>}
                          </>
                        ) : (
                          <span style={{color:"#cbd5e1",fontSize:"13px",marginLeft:"auto"}}>Not yet assessed</span>
                        )}
                      </div>
                    );
                  })}

                  {/* Overall grade footer */}
                  {charAvgGrade && (
                    <div className="sp-char-grade-footer">
                      <span style={{fontSize:"13px",fontWeight:"700",color:"var(--navy-2)"}}>Overall Grade</span>
                      <span className="sp-char-score-chip"
                        style={{background:charAvgGrade.bg,color:charAvgGrade.color,fontSize:"13px",fontWeight:"700",padding:"4px 14px"}}>
                        {charAvgGrade.grade} — {charAvgGrade.label} ({charAvgScore}/100)
                      </span>
                    </div>
                  )}
                </div>

                {/* Career Development */}
                {/* FIX 7: Only render when at least one entry has a score */}
                {careerEntries.length > 0 && (
                  <div className="sp-char-section">
                    <div className="sp-char-header">
                      <div className="sp-char-header-title">Career Development Assessment</div>
                      <div className="sp-char-header-sub">Practical skills training programmes</div>
                    </div>

                    {careerEntries.map(([key, entry]) => {
                      const score     = entry.score;
                      // FIX 1: Use charScoreGrade() — same thresholds as teacher portal (was 90/80/60/50)
                      const gradeInfo = charScoreGrade(score);
                      const pct       = score !== "" && score != null ? Math.min(100, parseFloat(score) || 0) : 0;
                      const barColor  = gradeInfo?.color ?? "#e2e8f0";
                      const label     = key.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase());
                      return (
                        <div key={key} className="sp-char-area-row">
                          <div style={{minWidth:"160px"}}>
                            <div className="sp-char-area-name">{label}</div>
                            {entry.exam && <div className="sp-char-area-guide">{entry.exam}</div>}
                          </div>
                          <div className="sp-char-score-bar-wrap">
                            <div className="sp-char-score-bar">
                              <div className="sp-char-score-fill" style={{width:`${pct}%`,background:barColor}}/>
                            </div>
                          </div>
                          <div className="sp-char-area-right">
                            <span style={{fontFamily:"'DM Mono',monospace",fontWeight:"800",color:barColor,fontSize:"15px",minWidth:"32px",textAlign:"right"}}>{score}</span>
                            {gradeInfo && (
                              <span className="sp-char-score-chip" style={{background:gradeInfo.bg,color:gradeInfo.color}}>
                                {gradeInfo.grade} — {gradeInfo.label}
                              </span>
                            )}
                          </div>
                          {entry.remarks && <div className="sp-char-remarks" title={entry.remarks}>"{entry.remarks}"</div>}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Sign-off */}
                {/* FIX 3: Replaced all Tailwind classes with sp-* CSS and inline styles */}
                {(charAssessment.teacher_name || charAssessment.trainer_name) && (
                  <div className="sp-char-section">
                    <div className="sp-card-head" style={{padding:"14px 18px"}}>
                      <span className="sp-card-title">Signed Off By</span>
                    </div>
                    <div className="sp-char-signoff-grid">
                      {[
                        { role:"Class Teacher",  name:charAssessment.teacher_name, date:charAssessment.teacher_date, signature:charAssessment.teacher_sig },
                        { role:"Skills Trainer", name:charAssessment.trainer_name, date:charAssessment.trainer_date, signature:charAssessment.trainer_sig  },
                      ].filter(s => s.name).map(s => (
                        <div key={s.role} className="sp-char-signoff-card">
                          <div className="sp-char-signoff-role">{s.role}</div>
                          <div className="sp-char-signoff-name">{s.name}</div>
                          {s.signature && <div className="sp-char-signoff-meta">Signature: {s.signature}</div>}
                          {s.date && <div className="sp-char-signoff-meta">{fmtDate(s.date)}</div>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              </div>
            )}
          </>
        )}

        {/* ════════════════════════════════════
            TAB: Progress
        ════════════════════════════════════ */}
        {tab === "Progress" && (
          <>
            {loadingProgress && <Loading text="Loading progress data…"/>}
            {!loadingProgress && subjectNames.length === 0 && (
              <Empty icon="📈" title="No results yet" sub="Progress data will appear once results are entered for at least one term."/>
            )}
            {!loadingProgress && subjectNames.length > 0 && (
              <div style={{display:"flex",flexDirection:"column",gap:"14px"}}>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"12px",marginBottom:"14px"}}>
                  {mostImproved && (
                    <div className="sp-hl sp-hl-green">
                      <p className="sp-hl-label" style={{color:"#16a34a"}}>Most Improved 🏆</p>
                      <p className="sp-hl-name">{mostImproved.name}</p>
                      <p className="sp-hl-delta" style={{color:"#16a34a"}}>▲ +{mostImproved.delta.toFixed(1)} pts across terms</p>
                    </div>
                  )}
                  {needsAttention && (
                    <div className="sp-hl sp-hl-red">
                      <p className="sp-hl-label" style={{color:"#dc2626"}}>Needs Attention ⚠️</p>
                      <p className="sp-hl-name">{needsAttention.name}</p>
                      <p className="sp-hl-delta" style={{color:"#dc2626"}}>▼ {needsAttention.delta.toFixed(1)} pts across terms</p>
                    </div>
                  )}
                </div>
                {termSummary.length > 0 && <OverallTrendChart termData={termSummary}/>}
                <div className="sp-card">
                  <div className="sp-card-head">
                    <span className="sp-card-title">Subject Comparison — All Terms</span>
                    <span style={{fontSize:"12px",color:"#94a3b8"}}>{subjectNames.length} subjects</span>
                  </div>
                  <div className="sp-table-wrap">
                    <table className="sp-table">
                      <thead>
                        <tr>
                          <th style={{textAlign:"left",padding:"10px 14px"}}>Subject</th>
                          {TERMS.filter(({value}) => allReports[value]).map(({value,label}) => (
                            <th key={value} className="c">{label}</th>
                          ))}
                          <th className="c">Trend</th>
                        </tr>
                      </thead>
                      <tbody>
                        {subjectNames.map((name, si) => {
                          const color    = SUBJECT_PALETTE[si % SUBJECT_PALETTE.length];
                          const pts      = subjectTrends[name];
                          const scoreMap = Object.fromEntries(pts.map(p => [p.term, p.score]));
                          const diff     = pts.length > 1 ? pts[pts.length-1].score - pts[pts.length-2].score : null;
                          return (
                            <tr key={name}>
                              <td>
                                <span style={{display:"inline-flex",alignItems:"center",gap:"8px",fontWeight:"600",color:"#1e293b"}}>
                                  <span style={{width:"8px",height:"8px",borderRadius:"50%",background:color,flexShrink:0}}/>
                                  {name}
                                </span>
                              </td>
                              {TERMS.filter(({value}) => allReports[value]).map(({value}) => {
                                const score = scoreMap[value];
                                return (
                                  <td key={value} className="c">
                                    {score != null
                                      ? <span style={{fontWeight:"700",color:"#2563eb",fontFamily:"'DM Mono',monospace"}}>{score}</span>
                                      : <span style={{color:"#e2e8f0"}}>—</span>}
                                  </td>
                                );
                              })}
                              <td className="c">
                                {diff == null || Math.abs(diff) < 0.5
                                  ? <span style={{color:"#94a3b8",fontSize:"12px"}}>→</span>
                                  : diff > 0
                                  ? <span style={{color:"#16a34a",fontSize:"12px",fontWeight:"600"}}>▲ +{diff.toFixed(1)}</span>
                                  : <span style={{color:"#dc2626",fontSize:"12px",fontWeight:"600"}}>▼ {diff.toFixed(1)}</span>
                                }
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
                <div>
                  <p style={{fontWeight:"700",color:"#1e293b",fontSize:"13.5px",marginBottom:"12px"}}>Subject Trends</p>
                  <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:"12px"}}>
                    {subjectNames.map((name, i) => (
                      <SubjectLineChart key={name} subject={name} data={subjectTrends[name]} color={SUBJECT_PALETTE[i % SUBJECT_PALETTE.length]}/>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* ════════════════════════════════════
            TAB: Report Card
        ════════════════════════════════════ */}
        {tab === "Report Card" && (
          <>
            {loadingReport && <Loading text="Loading report card…"/>}
            {!loadingReport && !report && <Empty icon="📄" title="No report card found" sub="No data available for this term yet."/>}
            {!loadingReport && report && (
              <div style={{display:"flex",flexDirection:"column",gap:"14px"}}>
                <div className="sp-kpi-grid">
                  <KpiCard label="Total Marks" value={report.total_score}/>
                  <KpiCard label="Average"     value={report.average_score}/>
                  <KpiCard label="Position"
                    value={report.show_position ? report.position_formatted : "N/A"}
                    sub={report.show_position && report.out_of ? `out of ${report.out_of}` : null}
                  />
                  <KpiCard label="Overall Grade" value={report.overall_grade}/>
                </div>
                {(report.attendance_total ?? 0) > 0 && (
                  <div className="sp-card">
                    <div className="sp-card-head"><span className="sp-card-title">Attendance</span></div>
                    <div style={{padding:"14px 18px"}}>
                      <div style={{display:"flex",justifyContent:"space-between",fontSize:"13.5px",marginBottom:"6px"}}>
                        <span style={{color:"#64748b"}}>Days Present</span>
                        <span style={{fontWeight:"700",color:"#1e293b",fontFamily:"'DM Mono',monospace"}}>{report.attendance} / {report.attendance_total}</span>
                      </div>
                      <div className="sp-progress-bar">
                        <div className="sp-progress-fill" style={{
                          width:`${report.attendance_percent ?? 0}%`,
                          background:(report.attendance_percent??0)>=80?"#16a34a":(report.attendance_percent??0)>=60?"#d97706":"#dc2626"
                        }}/>
                      </div>
                      <p style={{fontSize:"11.5px",color:"#94a3b8",textAlign:"right",marginTop:"5px"}}>{report.attendance_percent}% attendance</p>
                    </div>
                  </div>
                )}
                {(report.conduct || report.interest || report.teacher_remark) && (
                  <div className="sp-card">
                    <div className="sp-card-head"><span className="sp-card-title">Teacher's Remarks</span></div>
                    <div style={{padding:"14px 18px"}}>
                      {report.conduct && (
                        <div className="sp-remark-row">
                          <span style={{color:"#64748b",fontSize:"13.5px"}}>Conduct</span>
                          <span style={{fontWeight:"600",color:"#2563eb",fontSize:"13.5px"}}>{report.conduct}</span>
                        </div>
                      )}
                      {report.interest && (
                        <div className="sp-remark-row">
                          <span style={{color:"#64748b",fontSize:"13.5px"}}>Interest</span>
                          <span style={{fontWeight:"600",color:"#2563eb",fontSize:"13.5px"}}>{report.interest}</span>
                        </div>
                      )}
                      {report.teacher_remark && (
                        <div className="sp-remark-quote">"{report.teacher_remark}"</div>
                      )}
                    </div>
                  </div>
                )}
                <div className="sp-card">
                  <div className="sp-card-head"><span className="sp-card-title">Subject Breakdown</span></div>
                </div>
                <SubjectTable report={report}/>
              </div>
            )}
          </>
        )}

        {/* ════════════════════════════════════
            TAB: Fees
        ════════════════════════════════════ */}
        {tab === "Fees" && (
          <>
            {loadingFees && <Loading text="Loading fee records…"/>}
            {!loadingFees && fees.length === 0 && (
              <Empty icon="💳" title="No fee records found" sub="Your fee records will appear here once assigned by the school."/>
            )}
            {!loadingFees && fees.length > 0 && (
              <>
                <FeesOverview fees={fees}/>
                {fees.map(fee => (
                  <FeeTermCard key={fee.id} fee={fee} user={user} onPaymentSuccess={handlePaymentSuccess}/>
                ))}
              </>
            )}
          </>
        )}

        {/* ════════════════════════════════════
            TAB: Announcements
        ════════════════════════════════════ */}
        {tab === "Announcements" && <AnnouncementsFeed audience="students"/>}

      </div>
    </div>
  );
};

export default StudentPortal;
