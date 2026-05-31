// src/pages/teacher/components/ScoreModals.jsx
//
// The three score-entry modals: ReopenModal, CAModal, ExamsModal.
// Each receives `initial` breakdown data, calls `onApply(score, breakdown)`
// and `onClose()` — no internal API calls.

import React, { useState } from "react";
import { calcReopenScore, calcCAonly, calcMGTScore, calcCAScore } from "./Helpers";

// ── Shared check icon ─────────────────────────────────────────────────────

const CheckIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

// ── ReopenModal ───────────────────────────────────────────────────────────

export function ReopenModal({ studentName, initial, onApply, onClose }) {
  const [vals, setVals] = useState({
    reopen_raw: initial?.reopen_raw ?? "",
    rda:        initial?.rda        ?? "",
  });

  const set   = (k, v) => setVals((p) => ({ ...p, [k]: v }));
  const reset = () => setVals({ reopen_raw: "", rda: "" });
  const score = calcReopenScore(vals);

  return (
    <div className="tp-modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="tp-modal">
        <div className="tp-modal-header">
          <div>
            <p className="tp-modal-title">Re-Open Score</p>
            <p className="tp-modal-subtitle">{studentName}</p>
          </div>
          <button className="tp-modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="tp-modal-body">
          <div className="tp-modal-preview">
            <div className="tp-preview-item">
              <span className="tp-preview-final">{score.toFixed(1)}</span>
              <span className="tp-preview-max">/ 20</span>
            </div>
            <div className="tp-preview-item" style={{ marginLeft: "auto", alignItems: "flex-end" }}>
              <span style={{ fontSize: "10px", color: "#475569" }}>Formula</span>
              <span style={{ fontSize: "11px", color: "#64748b", fontFamily: "'DM Mono',monospace" }}>
                Re-Open/10 + RDA/10
              </span>
            </div>
          </div>

          <div className="tp-modal-section">
            <div className="tp-section-label">
              Re-Open Assessment
              <span className="tp-pill tp-pill-blue">max 20 marks total</span>
            </div>
            <div className="tp-modal-inputs">
              <div className="tp-modal-field">
                <label>Re-Open <span style={{ color: "#94a3b8", fontWeight: 400 }}>/10</span></label>
                <input
                  type="number" inputMode="decimal" min="0" max="10" step="0.5" placeholder="0"
                  value={vals.reopen_raw}
                  onChange={(e) => set("reopen_raw", Math.min(10, Math.max(0, parseFloat(e.target.value) || 0)))}
                />
              </div>
              <div style={{ display: "flex", alignItems: "center", paddingTop: "18px", color: "#cbd5e1", fontWeight: "700" }}>+</div>
              <div className="tp-modal-field">
                <label>RDA <span style={{ color: "#94a3b8", fontWeight: 400 }}>/10</span></label>
                <input
                  type="number" inputMode="decimal" min="0" max="10" step="0.5" placeholder="0"
                  value={vals.rda}
                  onChange={(e) => set("rda", Math.min(10, Math.max(0, parseFloat(e.target.value) || 0)))}
                />
              </div>
              <div style={{ display: "flex", alignItems: "center", paddingTop: "18px", color: "#cbd5e1", fontWeight: "700" }}>=</div>
              <div className="tp-modal-field">
                <label style={{ color: "#3b82f6" }}>Total /20</label>
                <input
                  readOnly value={score.toFixed(1)}
                  style={{ background: "#f0f7ff", borderColor: "#93c5fd", color: "#1d4ed8", cursor: "default" }}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="tp-modal-footer">
          <button className="tp-modal-btn-cancel" onClick={reset}>Reset</button>
          <button className="tp-modal-btn-cancel" onClick={onClose}>Cancel</button>
          <button className="tp-modal-btn-apply" onClick={() => onApply(score, vals)}>
            <CheckIcon /> Apply {score.toFixed(1)} / 20
          </button>
        </div>
      </div>
    </div>
  );
}

// ── CAModal ───────────────────────────────────────────────────────────────

export function CAModal({ studentName, initial, onApply, onClose }) {
  const [vals, setVals] = useState({
    hw1: initial?.hw1 ?? "", hw2: initial?.hw2 ?? "", hw3: initial?.hw3 ?? "", hw4: initial?.hw4 ?? "",
    cw1: initial?.cw1 ?? "", cw2: initial?.cw2 ?? "", cw3: initial?.cw3 ?? "", cw4: initial?.cw4 ?? "",
    ct1: initial?.ct1 ?? "", ct2: initial?.ct2 ?? "", ct3: initial?.ct3 ?? "", ct4: initial?.ct4 ?? "",
    mgt_raw: initial?.mgt_raw ?? "",
  });

  const set = (k, v) => setVals((p) => ({ ...p, [k]: v }));
  const reset = () => setVals({
    hw1: "", hw2: "", hw3: "", hw4: "",
    cw1: "", cw2: "", cw3: "", cw4: "",
    ct1: "", ct2: "", ct3: "", ct4: "",
    mgt_raw: "",
  });
  const num = (k)    => parseFloat(vals[k]) || 0;

  const hwTotal  = num("hw1") + num("hw2") + num("hw3") + num("hw4");
  const cwTotal  = num("cw1") + num("cw2") + num("cw3") + num("cw4");
  const ctTotal  = num("ct1") + num("ct2") + num("ct3") + num("ct4");
  const caOnly   = calcCAonly(vals);
  const mgtScore = calcMGTScore(vals);
  const combined = calcCAScore(vals);

  const TotalField = ({ val, max }) => (
    <div className="tp-modal-field">
      <input
        readOnly value={val.toFixed(1)}
        style={{ background: "#f0f7ff", borderColor: "#93c5fd", color: "#1d4ed8", cursor: "default", fontWeight: "700" }}
      />
      <label style={{ color: "#94a3b8", fontSize: "10px", textAlign: "center" }}>/{max}</label>
    </div>
  );

  return (
    <div className="tp-modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="tp-modal" style={{ maxWidth: "580px" }}>
        <div className="tp-modal-header">
          <div>
            <p className="tp-modal-title">CA / MGT Score</p>
            <p className="tp-modal-subtitle">{studentName} · CA (25%) + MGT Test (15%) = 40%</p>
          </div>
          <button className="tp-modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="tp-modal-body">
          <div className="tp-modal-preview">
            <div className="tp-preview-item">
              <span style={{ fontSize: "12px", color: "#64748b", fontFamily: "'DM Mono',monospace" }}>{caOnly.toFixed(1)}/25</span>
              <span className="tp-preview-lbl">CA</span>
            </div>
            <span className="tp-preview-arrow">+</span>
            <div className="tp-preview-item">
              <span style={{ fontSize: "12px", color: "#a78bfa", fontFamily: "'DM Mono',monospace" }}>{mgtScore.toFixed(1)}/15</span>
              <span className="tp-preview-lbl">MGT</span>
            </div>
            <span className="tp-preview-arrow">=</span>
            <div className="tp-preview-item">
              <span className="tp-preview-final">{combined.toFixed(1)}</span>
              <span className="tp-preview-max">/ 40</span>
            </div>
            <div style={{ marginLeft: "auto", display: "flex", gap: "10px" }}>
              {[["HW", hwTotal, 20], ["CW", cwTotal, 40], ["CT", ctTotal, 50]].map(([l, v, m]) => (
                <div key={l} className="tp-preview-item">
                  <span style={{ fontSize: "11px", color: "#64748b", fontFamily: "'DM Mono',monospace" }}>{v.toFixed(1)}/{m}</span>
                  <span className="tp-preview-lbl">{l}</span>
                </div>
              ))}
            </div>
          </div>

          {/* CA section */}
          <div className="tp-modal-section">
            <div className="tp-section-label">
              <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                Continuous Assessment (CA)
                <span className="tp-pill tp-pill-blue">scaled to /25</span>
              </span>
              <span>raw total /110</span>
            </div>

            {[
              { prefix: "hw", label: "Homework", max: 5,  keys: ["hw1","hw2","hw3","hw4"], rowMax: 20 },
              { prefix: "cw", label: "Classwork", max: 10, keys: ["cw1","cw2","cw3","cw4"], rowMax: 40 },
            ].map(({ prefix, label, max, keys, rowMax }) => (
              <div key={prefix} style={{ marginBottom: "6px" }}>
                <div style={{ fontSize: "10px", color: "#94a3b8", fontWeight: "600", marginBottom: "4px", textTransform: "uppercase", letterSpacing: ".5px" }}>
                  {label} — {keys.length} × {max} = /{rowMax}
                </div>
                <div className="tp-modal-inputs" style={{ alignItems: "flex-start" }}>
                  {keys.map((k) => (
                    <div className="tp-modal-field" key={k}>
                      <label>{k.slice(0, 2).toUpperCase()} {k.slice(2)}</label>
                      <input
                        type="number" min="0" max={max} step="0.5" placeholder="0" value={vals[k]}
                        onChange={(e) => set(k, Math.min(max, Math.max(0, parseFloat(e.target.value) || 0)))}
                      />
                    </div>
                  ))}
                  <div style={{ display: "flex", alignItems: "center", paddingTop: "18px", color: "#cbd5e1", fontWeight: "700" }}>=</div>
                  <TotalField val={prefix === "hw" ? hwTotal : cwTotal} max={rowMax} />
                </div>
              </div>
            ))}

            {/* Class tests — varying max per test */}
            <div>
              <div style={{ fontSize: "10px", color: "#94a3b8", fontWeight: "600", marginBottom: "4px", textTransform: "uppercase", letterSpacing: ".5px" }}>
                Class Test — 10+10+10+20 = /50
              </div>
              <div className="tp-modal-inputs" style={{ alignItems: "flex-start" }}>
                {[["ct1", 10], ["ct2", 10], ["ct3", 10], ["ct4", 20]].map(([k, max]) => (
                  <div className="tp-modal-field" key={k}>
                    <label>CT{k.slice(2)} /{max}</label>
                    <input
                      type="number" min="0" max={max} step="0.5" placeholder="0" value={vals[k]}
                      onChange={(e) => set(k, Math.min(max, Math.max(0, parseFloat(e.target.value) || 0)))}
                    />
                  </div>
                ))}
                <div style={{ display: "flex", alignItems: "center", paddingTop: "18px", color: "#cbd5e1", fontWeight: "700" }}>=</div>
                <TotalField val={ctTotal} max={50} />
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "4px", padding: "8px 12px", background: "#eff6ff", borderRadius: "8px", border: "1px solid #bfdbfe" }}>
              <span style={{ fontSize: "12px", color: "#64748b" }}>
                CA raw ({(hwTotal + cwTotal + ctTotal).toFixed(1)}/110) scaled to
              </span>
              <span style={{ fontFamily: "'DM Mono',monospace", fontWeight: "700", color: "#1d4ed8", fontSize: "15px" }}>{caOnly.toFixed(1)} / 25</span>
            </div>
          </div>

          <div className="tp-divider" />

          {/* MGT section */}
          <div className="tp-modal-section">
            <div className="tp-section-label">
              <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                MGT Test <span className="tp-pill tp-pill-purple">direct entry /15</span>
              </span>
            </div>
            <div className="tp-modal-inputs">
              <div className="tp-modal-field" style={{ flex: "none", width: "120px" }}>
                <label>MGT Score <span style={{ color: "#94a3b8", fontWeight: 400 }}>/15</span></label>
                <input
                  type="number" min="0" max="15" step="0.5" placeholder="0" value={vals.mgt_raw}
                  style={{ fontSize: "22px", padding: "10px" }} autoFocus
                  onChange={(e) => set("mgt_raw", Math.min(15, Math.max(0, parseFloat(e.target.value) || 0)))}
                />
              </div>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", background: "#f0fdf4", borderRadius: "10px", border: "1px solid #bbf7d0" }}>
            <span style={{ fontSize: "13px", color: "#166534", fontWeight: "600" }}>CA + MGT Combined Total</span>
            <span style={{ fontFamily: "'DM Mono',monospace", fontWeight: "800", color: "#166534", fontSize: "18px" }}>{combined.toFixed(1)} / 40</span>
          </div>
        </div>

        <div className="tp-modal-footer">
          <button className="tp-modal-btn-cancel" onClick={reset}>Reset</button>
          <button className="tp-modal-btn-cancel" onClick={onClose}>Cancel</button>
          <button className="tp-modal-btn-apply" onClick={() => onApply(combined, vals)}>
            <CheckIcon /> Apply {combined.toFixed(1)} / 40
          </button>
        </div>
      </div>
    </div>
  );
}

// ── ExamsModal ────────────────────────────────────────────────────────────

export function ExamsModal({ studentName, initial, onApply, onClose }) {
  const [examRaw, setExamRaw] = useState(initial?.exam_raw ?? "");
  const reset = () => setExamRaw("");
  const raw   = parseFloat(examRaw) || 0;
  const score = Math.round((raw / 100) * 40 * 10) / 10;

  return (
    <div className="tp-modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="tp-modal" style={{ maxWidth: "380px" }}>
        <div className="tp-modal-header">
          <div>
            <p className="tp-modal-title">Examination Score</p>
            <p className="tp-modal-subtitle">{studentName}</p>
          </div>
          <button className="tp-modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="tp-modal-body">
          <div className="tp-modal-preview">
            <div className="tp-preview-item">
              <span className="tp-preview-val">{raw.toFixed(1)}</span>
              <span className="tp-preview-lbl">Raw /100</span>
            </div>
            <span className="tp-preview-arrow">→</span>
            <div className="tp-preview-item">
              <span className="tp-preview-final">{score.toFixed(1)}</span>
              <span className="tp-preview-max">/ 40</span>
            </div>
            <div className="tp-preview-item" style={{ marginLeft: "auto", alignItems: "flex-end" }}>
              <span style={{ fontSize: "10px", color: "#475569" }}>Formula</span>
              <span style={{ fontSize: "11px", color: "#64748b", fontFamily: "'DM Mono',monospace" }}>(raw/100)×40</span>
            </div>
          </div>

          <div className="tp-modal-section">
            <div className="tp-section-label">
              Exam Score <span>enter raw mark out of 100</span>
            </div>
            <div className="tp-modal-inputs">
              <div className="tp-modal-field" style={{ flex: "none", width: "120px" }}>
                <label>Raw Mark</label>
                <input
                  type="number" inputMode="decimal" min="0" max="100" step="0.5" placeholder="0" value={examRaw}
                  style={{ fontSize: "24px", padding: "12px 10px" }} autoFocus
                  onChange={(e) => setExamRaw(Math.min(100, Math.max(0, parseFloat(e.target.value) || 0)))}
                />
              </div>
              <div style={{ display: "flex", alignItems: "center", paddingTop: "18px", color: "#cbd5e1", fontWeight: "700", fontSize: "20px" }}>/</div>
              <div className="tp-modal-field" style={{ flex: "none", width: "60px" }}>
                <label>Max</label>
                <input readOnly value="100" style={{ background: "#f8fafc", color: "#94a3b8", cursor: "default", fontSize: "24px", padding: "12px 10px" }} />
              </div>
            </div>
          </div>
        </div>

        <div className="tp-modal-footer">
          <button className="tp-modal-btn-cancel" onClick={reset}>Reset</button>
          <button className="tp-modal-btn-cancel" onClick={onClose}>Cancel</button>
          <button className="tp-modal-btn-apply" onClick={() => onApply(score, { exam_raw: raw })}>
            <CheckIcon /> Apply {score.toFixed(1)} / 40
          </button>
        </div>
      </div>
    </div>
  );
}