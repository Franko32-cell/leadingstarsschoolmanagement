// src/pages/student/components/FeeComponents.jsx

import React, { useState, useEffect } from "react";
import API from "../../../services/api";
import { loadPaystack } from "../paystack";
import { fmt } from "../helpers";
import { TERMS } from "../constants";

export const PaymentModal = ({ fee, user, onClose, onSuccess }) => {
  const termInfo  = TERMS.find((t) => t.value === fee.term) || { label: fee.term, icon: "💳" };
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
      if (!v || v <= 0) return "Enter a valid amount.";
      if (v > balance)  return `Amount cannot exceed balance of GHS ${fmt(balance)}.`;
      if (v < 1)        return "Minimum payment is GHS 1.00.";
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
    const email = `${admissionNumber.toLowerCase().replace(/[^a-z0-9]/g, "")}@student.school.com`;
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
        { display_name: "Student", variable_name: "student_name", value: user.full_name || admissionNumber },
        { display_name: "Admission No.", variable_name: "admission_number", value: admissionNumber },
        { display_name: "Term", variable_name: "term", value: termInfo.label },
        { display_name: "Fee ID", variable_name: "fee_id", value: String(fee.id) },
      ] },
      onClose: handleClose, callback: handleCallback,
    });
    handler.openIframe();
  };

  return (
    <div className="sp-modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="sp-modal sp-pay-modal">
        <div className="sp-pay-modal-header">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div className="sp-pay-modal-term">{termInfo.icon} {termInfo.label} — Fee Payment</div>
              <div className="sp-pay-modal-balance">GHS {fmt(balance)}</div>
              <div className="sp-pay-modal-balance-lbl">Outstanding balance</div>
            </div>
            <button onClick={onClose} style={{ background: "rgba(255,255,255,.1)", border: "none", cursor: "pointer", color: "rgba(255,255,255,.7)", fontSize: "18px", padding: "4px 8px", borderRadius: "6px", lineHeight: 1 }}>×</button>
          </div>
        </div>
        {keyMissing && <div className="sp-gateway-err" style={{ marginBottom: "14px" }}>⚠️ Payment gateway not configured.</div>}
        <div className="sp-modal-field">
          <label className="sp-field-label">Payment amount</label>
          <div className="sp-amount-options">
            <button className={`sp-amount-option ${mode === "full" ? "selected" : ""}`} onClick={() => { setMode("full"); setCustomErr(""); }}>
              <div className="sp-amount-option-label">Full balance</div>
              <div className="sp-amount-option-val">GHS {fmt(balance)}</div>
            </button>
            <button className={`sp-amount-option ${mode === "partial" ? "selected" : ""}`} onClick={() => { setMode("partial"); setCustomErr(""); }}>
              <div className="sp-amount-option-label">Partial amount</div>
              <div className="sp-amount-option-val" style={{ color: mode === "partial" && custom ? "#2563eb" : "#94a3b8" }}>
                {mode === "partial" && custom ? `GHS ${fmt(custom)}` : "Enter amount"}
              </div>
            </button>
          </div>
          {mode === "partial" && (
            <div className="sp-custom-amount-wrap">
              <div className="sp-custom-amount-input-row">
                <span className="sp-custom-amount-prefix">GHS</span>
                <input className="sp-custom-amount-input" type="number" min="1" step="0.01" max={balance}
                  placeholder="0.00" value={custom} onChange={(e) => { setCustom(e.target.value); setCustomErr(""); }} autoFocus />
              </div>
              {customErr && <div className="sp-amount-error">{customErr}</div>}
            </div>
          )}
        </div>
        {backendErr && <div className="sp-gateway-err">{backendErr}</div>}
        <button className="sp-pay-confirm-btn" onClick={handlePay} disabled={paying || keyMissing || (mode === "partial" && !custom)}>
          {paying
            ? <><div style={{ width: "16px", height: "16px", border: "2px solid rgba(255,255,255,.3)", borderTopColor: "#fff", borderRadius: "50%", animation: "sp-spin .6s linear infinite" }} />Opening Paystack…</>
            : <><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="1" y="4" width="22" height="16" rx="2" ry="2" /><line x1="1" y1="10" x2="23" y2="10" /></svg>Pay GHS {fmt(payAmount)}</>}
        </button>
        <div className="sp-paystack-badge">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0110 0v4" /></svg>
          Secured by Paystack · Mobile Money, Cards accepted
        </div>
      </div>
    </div>
  );
};

export const PaySuccessOverlay = ({ amount, reference, onClose }) => (
  <div className="sp-pay-success-overlay">
    <div className="sp-pay-success-box">
      <div className="sp-pay-success-icon">✅</div>
      <div className="sp-pay-success-title">Payment Successful!</div>
      <div className="sp-pay-success-amount">GHS {fmt(amount)}</div>
      <div className="sp-pay-success-sub">Your payment has been recorded.<br /><span style={{ fontFamily: "'DM Mono',monospace", fontSize: "11px", color: "#94a3b8" }}>Ref: {reference}</span></div>
      <button className="sp-pay-success-btn" onClick={onClose}>Done</button>
    </div>
  </div>
);

export const TransactionHistory = ({ transactions }) => (
  <div className="sp-txn-section">
    <div className="sp-txn-title">Payment history</div>
    {!transactions || transactions.length === 0
      ? <div className="sp-txn-empty">No payments recorded yet</div>
      : <div className="sp-txn-list">
          {transactions.map((txn) => (
            <div key={txn.id} className="sp-txn-item">
              <div className="sp-txn-icon">💸</div>
              <div className="sp-txn-info">
                <div className="sp-txn-note">{txn.note || "Fee payment"}</div>
                <div className="sp-txn-date">{txn.created_at ? new Date(txn.created_at).toLocaleDateString("en-GH", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—"}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div className="sp-txn-amount">+GHS {fmt(txn.amount)}</div>
                {txn.recorded_by_name && <div className="sp-txn-by">{txn.recorded_by_name}</div>}
              </div>
            </div>
          ))}
        </div>}
  </div>
);

export const FeeTermCard = ({ fee, user, onPaymentSuccess }) => {
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
  const termInfo  = TERMS.find((t) => t.value === localFee.term) || { label: localFee.term, icon: "💳" };
  const progressColor = isPaid ? "#16a34a" : isPartial ? "#d97706" : "#dc2626";
  const lineItems = [
    { label: "School Fees", value: localFee.amount },
    { label: "Book User Fee", value: localFee.book_user_fee },
    { label: "Workbook Fee", value: localFee.workbook_fee },
    { label: "Arrears", value: localFee.arrears },
  ].filter((r) => Number(r.value) > 0);

  const handleSuccess = (amount, reference) => {
    setShowPayModal(false);
    setLocalFee((prev) => {
      const newPaid    = Number(prev.paid) + amount;
      const newBalance = Number(prev.total_amount) - newPaid;
      return { ...prev, paid: newPaid, balance: newBalance, transactions: [
        { id: Date.now(), amount, note: `Paystack ref: ${reference}`, recorded_by_name: "Online payment", created_at: new Date().toISOString() },
        ...(prev.transactions || []),
      ] };
    });
    onPaymentSuccess(amount, reference);
  };

  return (
    <>
      {showPayModal && <PaymentModal fee={localFee} user={user} onClose={() => setShowPayModal(false)} onSuccess={handleSuccess} />}
      <div className="sp-fee-card">
        <div className="sp-fee-card-header" onClick={() => setOpen((o) => !o)}>
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
                <div className="sp-fee-progress-bar"><div className="sp-fee-progress-fill" style={{ width: `${pct}%`, background: progressColor }} /></div>
              </div>
            )}
            <div className="sp-fee-lines">
              {lineItems.map((r) => (
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
              ? <div className="sp-pay-btn-paid"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M22 11.08V12a10 10 0 11-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>All fees paid — Thank you!</div>
              : <><button className="sp-pay-btn" onClick={() => setShowPayModal(true)}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="1" y="4" width="22" height="16" rx="2" ry="2" /><line x1="1" y1="10" x2="23" y2="10" /></svg>Pay Now — GHS {fmt(balance)}</button><div className="sp-paystack-badge"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0110 0v4" /></svg>Secured by Paystack · Mobile Money, Cards accepted</div></>}
            <TransactionHistory transactions={localFee.transactions} />
          </div>
        </div>
      </div>
    </>
  );
};

export const FeesOverview = ({ fees }) => {
  const totalBilled  = fees.reduce((s, f) => s + Number(f.total_amount || 0), 0);
  const totalPaid    = fees.reduce((s, f) => s + Number(f.paid || 0), 0);
  const totalBalance = fees.reduce((s, f) => s + Number(f.balance || 0), 0);
  const fullyPaid    = fees.filter((f) => Number(f.balance) <= 0).length;
  const pct          = totalBilled > 0 ? Math.round((totalPaid / totalBilled) * 100) : 0;
  return (
    <div className="sp-fee-overview">
      <div className="sp-fee-overview-label">Total outstanding balance</div>
      <div className="sp-fee-overview-total">GHS {fmt(totalBalance)}</div>
      <div className="sp-fee-overview-sub">{pct}% of all fees paid · {fullyPaid}/{fees.length} terms cleared</div>
      <div style={{ marginTop: "14px", height: "6px", borderRadius: "99px", background: "rgba(255,255,255,.12)", overflow: "hidden" }}>
        <div style={{ height: "100%", borderRadius: "99px", width: `${pct}%`, background: "linear-gradient(90deg,#00c3f7,#00e676)", transition: "width .6s ease" }} />
      </div>
      <div className="sp-fee-overview-stats">
        {[{ val: `GHS ${fmt(totalBilled)}`, lbl: "Total Billed", color: "#fff" }, { val: `GHS ${fmt(totalPaid)}`, lbl: "Total Paid", color: "#00e676" }, { val: `GHS ${fmt(totalBalance)}`, lbl: "Balance Due", color: totalBalance > 0 ? "#ff6b6b" : "#00e676" }].map((s) => (
          <div key={s.lbl} className="sp-fee-overview-stat">
            <div className="sp-fee-overview-stat-val" style={{ color: s.color }}>{s.val}</div>
            <div className="sp-fee-overview-stat-lbl">{s.lbl}</div>
          </div>
        ))}
      </div>
    </div>
  );
};