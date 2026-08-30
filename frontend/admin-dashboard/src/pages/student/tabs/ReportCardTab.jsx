// src/pages/student/tabs/ReportCardTab.jsx

import React from "react";
import { KpiCard, Empty, Loading, SubjectTable } from "../components/Ui";

const ReportCardTab = ({ report, loading, onDownload }) => {
  if (loading) return <Loading text="Loading report card…" />;
  if (!report) return <Empty icon="📄" title="No report card found" sub="No data available for this term yet." />;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
      <div className="sp-kpi-grid">
        <KpiCard label="Total Marks" value={report.total_score} />
        <KpiCard label="Average" value={report.average_score} />
        <KpiCard
          label="Position"
          value={report.show_position ? report.position_formatted : "N/A"}
          sub={report.show_position && report.position_formatted !== "N/A" && report.out_of ? `out of ${report.out_of}` : null}
        />
        <KpiCard label="Overall Grade" value={report.overall_grade} />
      </div>

      {(report.attendance_total ?? 0) > 0 && (
        <div className="sp-card">
          <div className="sp-card-head"><span className="sp-card-title">Attendance</span></div>
          <div style={{ padding: "14px 18px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13.5px", marginBottom: "6px" }}>
              <span style={{ color: "#64748b" }}>Days Present</span>
              <span style={{ fontWeight: "700", color: "#1e293b", fontFamily: "'DM Mono',monospace" }}>{report.attendance} / {report.attendance_total}</span>
            </div>
            <div className="sp-progress-bar">
              <div className="sp-progress-fill" style={{ width: `${report.attendance_percent ?? 0}%`, background: (report.attendance_percent ?? 0) >= 80 ? "#16a34a" : (report.attendance_percent ?? 0) >= 60 ? "#d97706" : "#dc2626" }} />
            </div>
            <p style={{ fontSize: "11.5px", color: "#94a3b8", textAlign: "right", marginTop: "5px" }}>{report.attendance_percent}% attendance</p>
          </div>
        </div>
      )}

      {(report.conduct || report.interest || report.teacher_remark) && (
        <div className="sp-card">
          <div className="sp-card-head"><span className="sp-card-title">Teacher's Remarks</span></div>
          <div style={{ padding: "14px 18px" }}>
            {report.conduct && (
              <div className="sp-remark-row"><span style={{ color: "#64748b", fontSize: "13.5px" }}>Conduct</span><span style={{ fontWeight: "600", color: "#2563eb", fontSize: "13.5px" }}>{report.conduct}</span></div>
            )}
            {report.interest && (
              <div className="sp-remark-row"><span style={{ color: "#64748b", fontSize: "13.5px" }}>Interest</span><span style={{ fontWeight: "600", color: "#2563eb", fontSize: "13.5px" }}>{report.interest}</span></div>
            )}
            {report.teacher_remark && <div className="sp-remark-quote">"{report.teacher_remark}"</div>}
          </div>
        </div>
      )}

      <div className="sp-card">
        <div className="sp-card-head"><span className="sp-card-title">Subject Breakdown</span></div>
      </div>
      <SubjectTable report={report} />
    </div>
  );
};

export default ReportCardTab;