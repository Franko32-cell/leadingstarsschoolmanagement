// src/pages/teacher/components/AuthModals.jsx

import React, { useState, useEffect } from "react";
import { pwStrength } from "./Helpers";
import { changePassword } from "./Teacherportalservice";
import { EyeIcon } from "./Ui";

// ── ChangePasswordModal ───────────────────────────────────────────────────

export const ChangePasswordModal = ({ onClose }) => {
  const [current, setCurrent] = useState("");
  const [next,    setNext]    = useState("");
  const [confirm, setConfirm] = useState("");
  const [showCur, setShowCur] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showCon, setShowCon] = useState(false);
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState("");
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
      await changePassword(current, next);
      setSuccess(true);
      setTimeout(onClose, 2200);
    } catch (e) {
      const d = e.response?.data;
      setError(
        d?.old_password?.[0] || d?.new_password?.[0] || d?.detail ||
        "Failed to change password."
      );
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  const fields = [
    { label: "Current Password",    value: current, set: setCurrent, show: showCur, setShow: setShowCur },
    { label: "New Password",         value: next,    set: setNext,    show: showNew, setShow: setShowNew },
    { label: "Confirm New Password", value: confirm, set: setConfirm, show: showCon, setShow: setShowCon },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.45)", backdropFilter: "blur(4px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-7"
        style={{ animation: "tp-slide-up .2s ease" }}
      >
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className="text-lg font-black text-slate-800">Change Password</h2>
            <p className="text-sm text-slate-400 mt-0.5">Keep your account secure with a strong password.</p>
          </div>
          <button onClick={onClose} className="text-slate-300 hover:text-slate-500 transition-colors text-2xl leading-none mt-0.5">
            ×
          </button>
        </div>

        {success ? (
          <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl p-4 text-sm font-medium">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
            Password changed successfully!
          </div>
        ) : (
          <>
            {fields.map(({ label, value, set, show, setShow }, i) => (
              <div key={i} className="mb-4">
                <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide block mb-1.5">
                  {label}
                </label>
                <div className="relative">
                  <input
                    type={show ? "text" : "password"}
                    value={value}
                    onChange={(e) => { set(e.target.value); setError(""); }}
                    placeholder={i === 0 ? "Enter current password" : i === 1 ? "Min. 8 characters" : "Repeat new password"}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-slate-50"
                    style={
                      i === 2
                        ? { borderColor: mismatch ? "#f87171" : confirm && !mismatch ? "#34d399" : "#e2e8f0" }
                        : {}
                    }
                  />
                  <button
                    type="button"
                    onClick={() => setShow((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <EyeIcon open={show} />
                  </button>
                </div>
                {i === 1 && next && (
                  <>
                    <div
                      className="h-1 rounded-full mt-2 transition-all duration-300"
                      style={{ background: strength.color, width: strength.w, maxWidth: "100%" }}
                    />
                    <p className="text-xs mt-1" style={{ color: strength.color }}>{strength.label}</p>
                  </>
                )}
                {i === 2 && mismatch && (
                  <p className="text-xs mt-1 text-red-400">Passwords don't match</p>
                )}
              </div>
            ))}

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm mb-4">
                {error}
              </div>
            )}

            <div className="flex gap-3 mt-6">
              <button
                type="button" onClick={onClose}
                className="flex-1 border border-slate-200 text-slate-600 hover:bg-slate-50 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors"
              >
                Cancel
              </button>
              <button
                type="button" onClick={handleSubmit} disabled={saving || !!mismatch}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
              >
                {saving ? (
                  <>
                    <div style={{ width: "14px", height: "14px", border: "2px solid rgba(255,255,255,.3)", borderTopColor: "#fff", borderRadius: "50%", animation: "tp-spin .6s linear infinite" }} />
                    Saving…
                  </>
                ) : "Update Password"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

// ── ConfirmModal ──────────────────────────────────────────────────────────

export const ConfirmModal = ({ title, body, confirmLabel, onConfirm, onCancel }) => {
  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") onCancel(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onCancel]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.45)", backdropFilter: "blur(4px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6"
        style={{ animation: "tp-slide-up .2s ease" }}
      >
        <h2 className="text-base font-black text-slate-800 mb-2">{title}</h2>
        <p className="text-sm text-slate-500 mb-6">{body}</p>
        <div className="flex gap-3">
          <button
            type="button" onClick={onCancel}
            className="flex-1 border border-slate-200 text-slate-600 hover:bg-slate-50 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors"
          >
            Cancel
          </button>
          <button
            type="button" onClick={onConfirm}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};