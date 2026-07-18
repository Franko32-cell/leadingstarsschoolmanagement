import { Suspense, lazy, useCallback, useMemo, useState } from "react";
import {
  FaHistory,
  FaUserGraduate,
  FaChalkboardTeacher,
  FaMoneyBillWave,
  FaChartBar,
  FaBell,
  FaCog,
} from "react-icons/fa";

// Code-split each tab's module so the initial bundle only pays for
// whichever tab is active first (Audit Logs by default).
const AuditLogs = lazy(() => import("./AuditLogs"));
const StudentsAdmin = lazy(() => import("./StudentsAdmin"));
const TeachersAdmin = lazy(() => import("./TeachersAdmin"));

/**
 * Central shell for the School Administration & Audit Center.
 *
 * Built as a tab container from day one so each future module is just
 * another entry in TABS + its own component. Audit Logs, Students,
 * Teachers are wired up; Fees, Reports & Notifications remain
 * "coming soon" placeholders until built.
 */

const TABS = [
  { key: "audit", label: "Audit Logs", icon: <FaHistory />, ready: true, Component: AuditLogs },
  { key: "students", label: "Students", icon: <FaUserGraduate />, ready: true, Component: StudentsAdmin },
  { key: "teachers", label: "Teachers", icon: <FaChalkboardTeacher />, ready: true, Component: TeachersAdmin },
  { key: "fees", label: "Fees", icon: <FaMoneyBillWave />, ready: false, Component: null },
  { key: "reports", label: "Reports & Analytics", icon: <FaChartBar />, ready: false, Component: null },
  { key: "notifications", label: "Notifications", icon: <FaBell />, ready: false, Component: null },
];

const ComingSoon = ({ label }) => (
  <div className="flex flex-col items-center justify-center py-24 text-center bg-white rounded-3xl border border-slate-100 shadow-sm mx-4 sm:mx-6">
    <FaCog className="text-4xl text-slate-300 mb-4" />
    <p className="text-lg font-black text-slate-700">{label} is coming soon</p>
    <p className="text-sm text-slate-400 font-medium mt-1 max-w-sm">
      This module will be added in a follow-up phase of the Admin Settings expansion.
    </p>
  </div>
);

const TabPanelFallback = () => (
  <div className="flex items-center justify-center py-24 text-slate-400 text-sm font-semibold">
    Loading…
  </div>
);

const AdminSettings = () => {
  const [activeTab, setActiveTab] = useState("audit");

  const activeIndex = useMemo(
    () => TABS.findIndex((t) => t.key === activeTab),
    [activeTab]
  );
  const active = TABS[activeIndex];

  // Arrow-key navigation between tabs, matching the WAI-ARIA tabs pattern.
  const handleKeyDown = useCallback(
    (e) => {
      if (!["ArrowRight", "ArrowLeft", "Home", "End"].includes(e.key)) return;
      e.preventDefault();
      let nextIndex = activeIndex;
      if (e.key === "ArrowRight") nextIndex = (activeIndex + 1) % TABS.length;
      if (e.key === "ArrowLeft") nextIndex = (activeIndex - 1 + TABS.length) % TABS.length;
      if (e.key === "Home") nextIndex = 0;
      if (e.key === "End") nextIndex = TABS.length - 1;
      setActiveTab(TABS[nextIndex].key);
      document.getElementById(`admin-tab-${TABS[nextIndex].key}`)?.focus();
    },
    [activeIndex]
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-2 h-8 bg-gradient-to-b from-indigo-500 to-purple-500 rounded-full" />
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Admin Settings
            </h1>
            <p className="text-sm text-slate-500 font-medium mt-0.5">
              School Administration &amp; Audit Center
            </p>
          </div>
        </div>

        {/* Tab bar */}
        <div
          role="tablist"
          aria-label="Admin Settings sections"
          className="flex gap-2 overflow-x-auto pb-1 border-b border-slate-200"
        >
          {TABS.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                id={`admin-tab-${tab.key}`}
                role="tab"
                aria-selected={isActive}
                aria-controls={`admin-panel-${tab.key}`}
                tabIndex={isActive ? 0 : -1}
                onClick={() => setActiveTab(tab.key)}
                onKeyDown={handleKeyDown}
                className={`flex items-center gap-2 whitespace-nowrap px-4 py-3 text-sm font-bold rounded-t-xl transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-500 ${
                  isActive
                    ? "text-indigo-600 border-b-2 border-indigo-600 bg-white"
                    : "text-slate-400 hover:text-slate-600"
                }`}
              >
                {tab.icon}
                {tab.label}
                {!tab.ready && (
                  <span className="ml-1 text-[9px] font-black uppercase bg-slate-100 text-slate-400 px-1.5 py-0.5 rounded">
                    soon
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div
        id={`admin-panel-${active.key}`}
        role="tabpanel"
        aria-labelledby={`admin-tab-${active.key}`}
        className="mt-6 pb-8"
      >
        {active.ready && active.Component ? (
          <Suspense fallback={<TabPanelFallback />}>
            <active.Component />
          </Suspense>
        ) : (
          <ComingSoon label={active.label} />
        )}
      </div>
    </div>
  );
};

export default AdminSettings;