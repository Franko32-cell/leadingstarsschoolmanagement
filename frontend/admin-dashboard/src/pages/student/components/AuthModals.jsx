// src/pages/student/components/AuthModals.jsx

import React, { useState } from "react";
import { pwStrength } from "../helpers";
import { changePassword } from "../studentPortalService";
import { EyeIcon } from "./Ui";

export const ChangePasswordModal = ({ onClose }) => {
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
    if (!current)        return setError("Enter your current password.");
    if (next.length < 8) return setError("New password must be at least 8 characters.");
    if (next !== confirm) return setError("New passwords do not match.");
    setSaving(true);
    try {
      await changePassword(current, next);
      setSuccess(true);
      setTimeout(onClose, 2200);
    } catch (e) {
      const data = e.response?.data;
      setError(data?.old_password?.[0] || data?.new_password?.[0] || data?.detail || "Failed to change password.");
    } finally {
      setSaving(false);
    }
  };

  const fields = [
    { label: "Current Password",    value: current, set: setCurrent, show: showCur, setShow: setShowCur, ph: "Enter current password" },
    { label: "New Password",         value: next,    set: setNext,    show: showNew, setShow: setShowNew, ph: "Min. 8 characters" },
    { label: "Confirm New Password", value: confirm, set: setConfirm, show: showCon, setShow: setShowCon, ph: "Repeat new password" },
  ];

  return (
    <div className="sp-modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="sp-modal">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "18px" }}>
          <div>
            <p className="sp-modal-title">Change Password</p>
            <p className="sp-modal-sub">Keep your account secure with a strong password.</p>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8", fontSize: "20px", padding: "2px", lineHeight: 1 }}>×</button>
        </div>
        {success ? (
          <div className="sp-pw-success">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M22 11.08V12a10 10 0 11-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
            Password changed successfully!
          </div>
        ) : (
          <>
            {fields.map(({ label, value, set, show, setShow, ph }, i) => (
              <div key={i} className="sp-modal-field">
                <label className="sp-field-label">{label}</label>
                <div className="sp-modal-input-wrap">
                  <input
                    type={show ? "text" : "password"} className="sp-modal-input"
                    style={i === 2 ? { borderColor: mismatch ? "#f87171" : confirm && !mismatch ? "#34d399" : undefined } : {}}
                    placeholder={ph} value={value}
                    onChange={(e) => { set(e.target.value); setError(""); }}
                  />
                  <button className="sp-modal-eye" onClick={() => setShow((v) => !v)}><EyeIcon open={show} /></button>
                </div>
                {i === 1 && next && (
                  <>
                    <div className="sp-pw-strength" style={{ background: strength.color, width: strength.w }} />
                    <p className="sp-pw-hint" style={{ color: strength.color }}>{strength.label}</p>
                  </>
                )}
                {i === 2 && mismatch && <p className="sp-pw-hint" style={{ color: "#f87171" }}>Passwords don't match</p>}
              </div>
            ))}
            {error && <div className="sp-pw-error">{error}</div>}
            <div className="sp-modal-actions">
              <button className="sp-btn-secondary" onClick={onClose}>Cancel</button>
              <button className="sp-btn-primary" onClick={handleSubmit} disabled={saving || !!mismatch}>
                {saving ? <><div style={{ width: "15px", height: "15px", border: "2px solid rgba(255,255,255,.3)", borderTopColor: "#fff", borderRadius: "50%", animation: "sp-spin .6s linear infinite" }} />Saving…</> : "Update Password"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};