import { useState } from "react";
import {
  FaHistory,
  FaUserGraduate,
  FaChalkboardTeacher,
  FaChartBar,
  FaBell,
  FaCog,
} from "react-icons/fa";
import AuditLogs from "./AuditLogs";

/**
 * Central shell for the School Administration & Audit Center.
 *
 * This is deliberately built as a tab container from day one so each
 * future module (Student Management, Teacher Management, Reports,
 * Notifications) is just another entry in TABS + its own component -
 * no restructuring needed later. Only "Audit Logs" is wired up so far;
 * the rest render a lightweight placeholder until built.
 */

const TABS = [
  { key: "audit", label: "Audit Logs", icon: <FaHistory />, ready: true },
  { key: "students", label: "Students", icon: <FaUserGraduate />, ready: false },
  { key: "teachers", label: "Teachers", icon: <FaChalkboardTeacher />, ready: false },
  { key: "reports", label: "Reports & Analytics", icon: <FaChartBar />, ready: false },
  { key: "notifications", label: "Notifications", icon: <FaBell />, ready: false },
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

const AdminSettings = () => {
  const [activeTab, setActiveTab] = useState("audit");

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
        <div className="flex gap-2 overflow-x-auto pb-1 border-b border-slate-200">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 whitespace-nowrap px-4 py-3 text-sm font-bold rounded-t-xl transition-colors ${
                activeTab === tab.key
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
          ))}
        </div>
      </div>

      <div className="mt-6 pb-8">
        {activeTab === "audit" && <AuditLogs />}
        {activeTab !== "audit" && (
          <ComingSoon label={TABS.find((t) => t.key === activeTab)?.label} />
        )}
      </div>
    </div>
  );
};

export default AdminSettings;