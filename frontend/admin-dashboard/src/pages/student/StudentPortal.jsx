// src/pages/student/StudentPortal.jsx
//
// Root component — orchestration only. No API calls, no calc logic here.
// All logic lives in hooks.js / studentPortalService.js / helpers.js.

import React, { useEffect, useState, useCallback, useRef } from "react";
import { getUser, logout } from "../../services/auth";
import AnnouncementsFeed from "../AnnouncementsFeed";

import { TERMS, TABS, PORTAL_STYLES, REFRESH_INTERVAL, NO_TERM_BAR_TABS } from "./constants";
import { loadPaystack } from "./paystack";
import { RefreshIcon } from "./components/Ui";
import { ChangePasswordModal } from "./components/AuthModals";
import { PaySuccessOverlay } from "./components/FeeComponents";

import {
  useReport,
  useAllReports,
  useStudentAttendance,
  useStudentCharAssessment,
  useStudentFees,
  useElearning,
} from "./hooks";

import ResultsTab     from "./tabs/ResultsTab";
import AttendanceTab  from "./tabs/AttendanceTab";
import CharacterTab   from "./tabs/CharacterTab";
import ProgressTab    from "./tabs/ProgressTab";
import ReportCardTab  from "./tabs/ReportCardTab";
import FeesTab        from "./tabs/FeesTab";
import ElearningTab   from "./tabs/ElearningTab";

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

  const [tab, setTab] = useState("Results");
  const [selectedTerm, setSelectedTerm] = useState("term1");
  const [showPwModal, setShowPwModal] = useState(false);
  const [successPayment, setSuccessPayment] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState(null);
  const autoRefreshTimer = useRef(null);

  // ── Domain hooks ──────────────────────────────────────────────────────
  const report        = useReport(user.student_id);
  const allReports     = useAllReports(user.student_id);
  const attendance    = useStudentAttendance(user.student_id);
  const charAssess    = useStudentCharAssessment(user.student_id, user.admission_number);
  const fees          = useStudentFees(user.student_id);
  const elearning     = useElearning(user);

  const error = attendance.error || fees.error || elearning.error;

  const refreshCurrentTab = useCallback(async (quiet = false) => {
    if (!quiet) setIsRefreshing(true);
    try {
      switch (tab) {
        case "Results":
        case "Report Card": await report.load(selectedTerm, quiet); break;
        case "Attendance":  await attendance.load(selectedTerm, quiet); break;
        case "Character":   await charAssess.load(selectedTerm, quiet); break;
        case "Progress":    await allReports.load(quiet); break;
        case "Fees":        await fees.load(quiet); break;
        case "E-Learning":  await elearning.load({ classId: user.class_id, term: selectedTerm, year: undefined }, quiet); break;
        default: break;
      }
      setLastRefreshed(new Date());
    } finally {
      if (!quiet) setIsRefreshing(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, selectedTerm]);

  useEffect(() => {
    switch (tab) {
      case "Results":
      case "Report Card": report.load(selectedTerm); break;
      case "Attendance":  attendance.load(selectedTerm); break;
      case "Character":   charAssess.load(selectedTerm); break;
      case "Progress":    allReports.load(); break;
      case "Fees":        fees.load(); break;
      case "E-Learning":  elearning.load({ classId: user.class_id, term: selectedTerm }); break;
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

  const handlePaymentSuccess = (amount, reference) => {
    setSuccessPayment({ amount, reference });
    setTimeout(() => fees.load(true), 3000);
  };

  const showTermBar = !NO_TERM_BAR_TABS.includes(tab);
  const lastRefreshedLabel = lastRefreshed
    ? lastRefreshed.toLocaleTimeString("en-GH", { hour: "2-digit", minute: "2-digit" })
    : null;

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
            ? <img src={user.photo} alt="avatar" className="sp-avatar" onError={(e) => { e.target.style.display = "none"; }} />
            : <div className="sp-avatar-fallback">{user.full_name?.[0] ?? "S"}</div>}
          <div>
            <div className="sp-header-name">{user.full_name}</div>
            <div className="sp-header-sub">{user.admission_number} · {user.class}</div>
          </div>
          <nav className="sp-nav" style={{ marginLeft: "auto", marginRight: "12px" }}>
            {TABS.map(({ key, icon, label }) => (
              <button key={key} onClick={() => setTab(key)} className={`sp-nav-btn ${tab === key ? "sp-nav-btn-active" : ""}`}>
                <span>{icon}</span><span>{label}</span>
              </button>
            ))}
          </nav>
          <div className="sp-header-actions">
            <button className={`sp-btn-refresh ${isRefreshing ? "spinning" : ""}`} onClick={() => refreshCurrentTab(false)} disabled={isRefreshing} title="Refresh data">
              <RefreshIcon /><span style={{ fontSize: "11px" }}>Refresh</span>
            </button>
            <button className="sp-btn-ghost" onClick={() => setShowPwModal(true)}>🔑 Password</button>
            <button className="sp-btn-danger" onClick={logout}>Sign out</button>
          </div>
        </div>
        <div className="sp-mobile-nav">
          <div className="sp-mobile-nav-inner">
            {TABS.map(({ key, icon, label }) => (
              <button key={key} onClick={() => setTab(key)} className={`sp-mobile-btn ${tab === key ? "sp-mobile-btn-active" : ""}`}>
                <span style={{ fontSize: "18px" }}>{icon}</span>{label}
              </button>
            ))}
          </div>
        </div>
      </header>

      <div className="sp-body">
        {showTermBar && (
          <div className="sp-term-bar">
            <div>
              <label className="sp-field-label">Term</label>
              <select className="sp-select" value={selectedTerm} onChange={(e) => setSelectedTerm(e.target.value)}>
                {TERMS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            {tab === "Report Card" && report.report && (
              <button className="sp-btn-pdf" onClick={async () => {
                const { downloadReportPDF } = await import("./studentPortalService");
                downloadReportPDF(user.student_id, selectedTerm).catch(() => attendance.setError("Failed to download report."));
              }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
                Download PDF
              </button>
            )}
            {lastRefreshedLabel && (
              <div className="sp-last-updated"><span className="sp-last-updated-dot" />Updated {lastRefreshedLabel}</div>
            )}
          </div>
        )}

        {error && (
          <div className="sp-alert">
            <span>⚠ {error}</span>
            <button onClick={() => { attendance.setError(""); fees.setError(""); elearning.setError(""); }} style={{ background: "none", border: "none", cursor: "pointer", color: "inherit", fontSize: "18px", opacity: .6, padding: "0 0 0 12px" }}>×</button>
          </div>
        )}

        {tab === "Results" && <ResultsTab report={report.report} loading={report.loading} selectedTerm={selectedTerm} />}

        {tab === "Attendance" && <AttendanceTab attendance={attendance.attendance} stats={attendance.stats} loading={attendance.loading} selectedTerm={selectedTerm} />}

        {tab === "Character" && <CharacterTab charAssessment={charAssess.charAssessment} loading={charAssess.loading} selectedTerm={selectedTerm} />}

        {tab === "Progress" && <ProgressTab allReports={allReports.allReports} loading={allReports.loading} />}

        {tab === "Report Card" && <ReportCardTab report={report.report} loading={report.loading} />}

        {tab === "E-Learning" && (
          <ElearningTab
            lessons={elearning.lessons}
            assignments={elearning.assignments}
            loading={elearning.loading}
            submitting={elearning.submitting}
            submissionFor={elearning.submissionFor}
            onSubmit={elearning.submit}
          />
        )}

        {tab === "Fees" && <FeesTab fees={fees.fees} loading={fees.loading} user={user} onPaymentSuccess={handlePaymentSuccess} />}

        {tab === "Announcements" && <AnnouncementsFeed audience="students" />}
      </div>
    </div>
  );
};

export default StudentPortal;