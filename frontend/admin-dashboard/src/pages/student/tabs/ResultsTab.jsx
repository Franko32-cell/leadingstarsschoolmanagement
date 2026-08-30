// src/pages/student/tabs/ResultsTab.jsx

import React from "react";
import { KpiCard, Empty, Loading, SubjectTable } from "../components/Ui";
import { TERMS } from "../constants";

const ResultsTab = ({ report, loading, selectedTerm }) => {
  if (loading) return <Loading text="Loading results…" />;
  if (!report) return <Empty icon="📭" title="No results found" sub="Results will appear here once your teacher has saved them." />;

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
      <div className="sp-card">
        <div className="sp-card-head">
          <span className="sp-card-title">{TERMS.find((t) => t.value === selectedTerm)?.label} — Subject Results</span>
          <span style={{ fontSize: "12px", color: "#94a3b8" }}>{report.subjects?.length ?? 0} subjects</span>
        </div>
      </div>
      <SubjectTable report={report} />
    </div>
  );
};

export default ResultsTab;