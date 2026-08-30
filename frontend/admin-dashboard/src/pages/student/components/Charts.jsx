// src/pages/student/components/Charts.jsx

import React from "react";
import { TERMS } from "../constants";

export const SubjectLineChart = ({ subject, data, color }) => {
  const W = 280, H = 90, PAD = 18;
  const scores = data.map((d) => d.score);
  const min    = Math.max(0,   Math.min(...scores) - 12);
  const max    = Math.min(100, Math.max(...scores) + 12);
  const range  = max - min || 1;
  const pts    = data.map((d, i) => ({
    x: PAD + (i / Math.max(data.length - 1, 1)) * (W - PAD * 2),
    y: PAD + (1 - (d.score - min) / range) * (H - PAD * 2),
    score: d.score, term: d.term,
  }));
  const pathD  = pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  const areaD  = pts.length > 0 ? `${pathD} L ${pts[pts.length - 1].x} ${H - PAD} L ${pts[0].x} ${H - PAD} Z` : "";
  const latest   = scores[scores.length - 1];
  const previous = scores.length > 1 ? scores[scores.length - 2] : null;
  const diff     = previous != null ? latest - previous : null;
  return (
    <div className="sp-chart-card">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
        <p style={{ fontWeight: "700", fontSize: "13px", color: "#1e293b", margin: 0 }}>{subject}</p>
        <div style={{ textAlign: "right" }}>
          <p style={{ fontFamily: "'DM Mono',monospace", fontWeight: "800", color, fontSize: "18px", margin: 0, lineHeight: 1 }}>{latest}</p>
          {diff != null && Math.abs(diff) >= 0.5 && (
            <p style={{ fontSize: "11px", fontWeight: "600", margin: 0, color: diff > 0 ? "#16a34a" : "#dc2626" }}>{diff > 0 ? `▲ +${diff.toFixed(1)}` : `▼ ${diff.toFixed(1)}`}</p>
          )}
        </div>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: 76 }}>
        {areaD && <path d={areaD} fill={color} fillOpacity="0.07" />}
        {[0, .5, 1].map((t) => <line key={t} x1={PAD} y1={PAD + t * (H - PAD * 2)} x2={W - PAD} y2={PAD + t * (H - PAD * 2)} stroke="#f1f5f9" strokeWidth="1" />)}
        {pts.length > 1 && <path d={pathD} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />}
        {pts.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r="4.5" fill="white" stroke={color} strokeWidth="2.5" />
            <text x={p.x} y={H - 2} textAnchor="middle" fontSize="9" fill="#94a3b8">{TERMS.find((t) => t.value === p.term)?.label.replace("Term ", "T")}</text>
            <text x={p.x} y={p.y - 8} textAnchor="middle" fontSize="9" fill={color} fontWeight="700">{p.score}</text>
          </g>
        ))}
      </svg>
    </div>
  );
};

export const OverallTrendChart = ({ termData }) => {
  const W = 480, H = 110, PAD = 24;
  const avgs  = termData.map((d) => parseFloat(d.average) || 0);
  const min   = Math.max(0,   Math.min(...avgs) - 15);
  const max   = Math.min(100, Math.max(...avgs) + 15);
  const range = max - min || 1;
  const pts   = termData.map((d, i) => ({
    x: PAD + (i / Math.max(termData.length - 1, 1)) * (W - PAD * 2),
    y: PAD + (1 - ((parseFloat(d.average) || 0) - min) / range) * (H - PAD * 2),
    ...d,
  }));
  const pathD = pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  const areaD = pts.length > 0 ? `${pathD} L ${pts[pts.length - 1].x} ${H - PAD} L ${pts[0].x} ${H - PAD} Z` : "";
  return (
    <div className="sp-card">
      <div className="sp-card-head"><span className="sp-card-title">Overall Average — All Terms</span></div>
      <div style={{ padding: "16px 18px 10px" }}>
        <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: 100 }}>
          <defs><linearGradient id="spGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#2563eb" stopOpacity="0.15" /><stop offset="100%" stopColor="#2563eb" stopOpacity="0" /></linearGradient></defs>
          {areaD && <path d={areaD} fill="url(#spGrad)" />}
          {[0, .5, 1].map((t) => <line key={t} x1={PAD} y1={PAD + t * (H - PAD * 2)} x2={W - PAD} y2={PAD + t * (H - PAD * 2)} stroke="#f1f5f9" strokeWidth="1" />)}
          {pts.length > 1 && <path d={pathD} fill="none" stroke="#2563eb" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />}
          {pts.map((p, i) => (
            <g key={i}>
              <circle cx={p.x} cy={p.y} r="6" fill="white" stroke="#2563eb" strokeWidth="3" />
              <text x={p.x} y={H - 3} textAnchor="middle" fontSize="10" fill="#94a3b8">{p.label}</text>
              <text x={p.x} y={p.y - 10} textAnchor="middle" fontSize="11" fill="#2563eb" fontWeight="700">{p.average}</text>
            </g>
          ))}
        </svg>
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${termData.length},1fr)`, gap: "10px", marginTop: "14px", paddingTop: "14px", borderTop: "1px solid var(--line)" }}>
          {termData.map((d) => (
            <div key={d.term} style={{ textAlign: "center", background: "#f8fafc", borderRadius: "10px", padding: "12px 8px", border: "1px solid var(--line)" }}>
              <p style={{ fontSize: "10px", fontWeight: "700", color: "#94a3b8", textTransform: "uppercase", letterSpacing: ".6px", margin: "0 0 4px" }}>{d.label}</p>
              <p style={{ fontFamily: "'DM Mono',monospace", fontWeight: "900", color: "#2563eb", fontSize: "22px", margin: "0 0 2px", lineHeight: 1 }}>{d.average ?? "—"}</p>
              <p style={{ fontSize: "11px", color: "#94a3b8", margin: 0 }}>avg · <b style={{ color: "#475569" }}>{d.total}</b> total</p>
              {d.position && <p style={{ fontSize: "11px", color: "#94a3b8", margin: "2px 0 0" }}>Pos: <b style={{ color: "#475569" }}>{d.position}</b></p>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};