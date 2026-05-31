// src/pages/teacher/components/ui.jsx
//
// Stateless display components shared across all teacher portal tabs.
// Import individually to keep bundle splits clean.

import React from "react";
import { GRADE_REMARK } from "./constants";

export const Badge = ({ grade }) => {
  const info = GRADE_REMARK[grade];
  if (!info) return <span className="text-slate-300 text-xs">—</span>;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold ${info.bg}`}>
      {grade}
    </span>
  );
};

export const RemarkBadge = ({ grade }) => {
  const info = GRADE_REMARK[grade];
  if (!info) return <span className="text-slate-300 text-xs">—</span>;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs ${info.bg}`}>
      {info.label}
    </span>
  );
};

export const StatusPill = ({ status }) => {
  const config = {
    present: { label: "Present", styles: "bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200" },
    absent:  { label: "Absent",  styles: "bg-red-100 text-red-700 ring-1 ring-red-200" },
    late:    { label: "Late",    styles: "bg-amber-100 text-amber-700 ring-1 ring-amber-200" },
  };
  const info = config[status] ?? { label: "Unknown", styles: "bg-slate-100 text-slate-600 ring-1 ring-slate-200" };
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold ${info.styles}`}>
      {info.label}
    </span>
  );
};

export const KpiCard = ({ label, value, color = "text-slate-800", sub }) => (
  <div className="bg-white rounded-2xl border border-slate-100 shadow-sm px-5 py-4">
    <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest mb-1">{label}</p>
    <p className={`text-2xl font-black ${color}`}>{value}</p>
    {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
  </div>
);

export const Alert = ({ message, type, onDismiss }) => {
  if (!message) return null;
  const s =
    type === "error"
      ? "bg-red-50 border-red-200 text-red-700"
      : "bg-emerald-50 border-emerald-200 text-emerald-700";
  return (
    <div
      role="alert"
      className={`mb-5 flex items-center justify-between px-4 py-3 rounded-xl border text-sm ${s}`}
    >
      <span>{type === "error" ? "⚠ " : "✓ "}{message}</span>
      <button onClick={onDismiss} className="ml-4 text-lg leading-none opacity-50 hover:opacity-100">
        ×
      </button>
    </div>
  );
};

export const EmptyState = ({ icon, title, sub }) => (
  <div className="text-center py-16 text-slate-400 bg-white rounded-2xl border border-slate-100 shadow-sm">
    <div className="text-5xl mb-3">{icon}</div>
    <p className="font-medium text-slate-500">{title}</p>
    {sub && <p className="text-xs mt-1">{sub}</p>}
  </div>
);

export const SectionHeader = ({ title, badge }) => (
  <div className="flex items-center justify-between mb-4">
    <h3 className="font-bold text-slate-700">{title}</h3>
    {badge && (
      <span className="text-xs text-slate-500 bg-white border border-slate-100 px-2.5 py-1 rounded-full shadow-sm">
        {badge}
      </span>
    )}
  </div>
);

export const Th = ({ children, center }) => (
  <th
    className={`px-4 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wide ${
      center ? "text-center" : "text-left"
    }`}
  >
    {children}
  </th>
);

export const ScoreDot = ({ score }) => {
  if (score === "" || score === null || score === undefined) return null;
  const n     = parseFloat(score);
  const color = n >= 70 ? "bg-emerald-500" : n >= 40 ? "bg-amber-400" : "bg-red-500";
  return <span className={`inline-block w-2 h-2 rounded-full ml-1 ${color}`} />;
};

export const EyeIcon = ({ open }) =>
  open ? (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ) : (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );