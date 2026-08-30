// src/pages/student/tabs/ProgressTab.jsx

import React, { useMemo } from "react";
import { Empty, Loading } from "../components/Ui";
import { SubjectLineChart, OverallTrendChart } from "../components/Charts";
import { TERMS, SUBJECT_PALETTE } from "../constants";

const ProgressTab = ({ allReports, loading }) => {
  const subjectTrends = useMemo(() => {
    const map = {};
    TERMS.forEach(({ value: term }) => {
      const rep = allReports[term];
      if (!rep?.subjects) return;
      rep.subjects.forEach((sub) => {
        if (!map[sub.subject]) map[sub.subject] = [];
        map[sub.subject].push({ term, score: parseFloat(sub.score) || 0 });
      });
    });
    return map;
  }, [allReports]);

  const termSummary = TERMS
    .filter(({ value }) => allReports[value])
    .map(({ value, label }) => ({
      term: value, label,
      average: allReports[value]?.average_score,
      total: allReports[value]?.total_score,
      position: allReports[value]?.show_position ? allReports[value]?.position_formatted : null,
    }));

  const subjectNames = Object.keys(subjectTrends);

  const mostImproved = useMemo(() => {
    let best = null, bestDelta = -Infinity;
    Object.entries(subjectTrends).forEach(([name, pts]) => {
      if (pts.length < 2) return;
      const delta = pts[pts.length - 1].score - pts[0].score;
      if (delta > bestDelta) { bestDelta = delta; best = { name, delta }; }
    });
    return best;
  }, [subjectTrends]);

  const needsAttention = useMemo(() => {
    let worst = null, worstDelta = Infinity;
    Object.entries(subjectTrends).forEach(([name, pts]) => {
      if (pts.length < 2) return;
      const delta = pts[pts.length - 1].score - pts[0].score;
      if (delta < worstDelta) { worstDelta = delta; worst = { name, delta }; }
    });
    return worst && worstDelta < 0 ? worst : null;
  }, [subjectTrends]);

  if (loading) return <Loading text="Loading progress data…" />;
  if (subjectNames.length === 0) return <Empty icon="📈" title="No results yet" sub="Progress data will appear once results are entered for at least one term." />;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "14px" }}>
        {mostImproved && (
          <div className="sp-hl sp-hl-green">
            <p className="sp-hl-label" style={{ color: "#16a34a" }}>Most Improved 🏆</p>
            <p className="sp-hl-name">{mostImproved.name}</p>
            <p className="sp-hl-delta" style={{ color: "#16a34a" }}>▲ +{mostImproved.delta.toFixed(1)} pts across terms</p>
          </div>
        )}
        {needsAttention && (
          <div className="sp-hl sp-hl-red">
            <p className="sp-hl-label" style={{ color: "#dc2626" }}>Needs Attention ⚠️</p>
            <p className="sp-hl-name">{needsAttention.name}</p>
            <p className="sp-hl-delta" style={{ color: "#dc2626" }}>▼ {needsAttention.delta.toFixed(1)} pts across terms</p>
          </div>
        )}
      </div>

      {termSummary.length > 0 && <OverallTrendChart termData={termSummary} />}

      <div className="sp-card">
        <div className="sp-card-head">
          <span className="sp-card-title">Subject Comparison — All Terms</span>
          <span style={{ fontSize: "12px", color: "#94a3b8" }}>{subjectNames.length} subjects</span>
        </div>
        <div className="sp-table-wrap">
          <table className="sp-table">
            <thead>
              <tr>
                <th style={{ textAlign: "left", padding: "10px 14px" }}>Subject</th>
                {TERMS.filter(({ value }) => allReports[value]).map(({ value, label }) => <th key={value} className="c">{label}</th>)}
                <th className="c">Trend</th>
              </tr>
            </thead>
            <tbody>
              {subjectNames.map((name, si) => {
                const color    = SUBJECT_PALETTE[si % SUBJECT_PALETTE.length];
                const pts      = subjectTrends[name];
                const scoreMap = Object.fromEntries(pts.map((p) => [p.term, p.score]));
                const diff     = pts.length > 1 ? pts[pts.length - 1].score - pts[pts.length - 2].score : null;
                return (
                  <tr key={name}>
                    <td>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: "8px", fontWeight: "600", color: "#1e293b" }}>
                        <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: color, flexShrink: 0 }} />
                        {name}
                      </span>
                    </td>
                    {TERMS.filter(({ value }) => allReports[value]).map(({ value }) => {
                      const score = scoreMap[value];
                      return (
                        <td key={value} className="c">
                          {score != null ? <span style={{ fontWeight: "700", color: "#2563eb", fontFamily: "'DM Mono',monospace" }}>{score}</span> : <span style={{ color: "#e2e8f0" }}>—</span>}
                        </td>
                      );
                    })}
                    <td className="c">
                      {diff == null || Math.abs(diff) < 0.5
                        ? <span style={{ color: "#94a3b8", fontSize: "12px" }}>→</span>
                        : diff > 0
                        ? <span style={{ color: "#16a34a", fontSize: "12px", fontWeight: "600" }}>▲ +{diff.toFixed(1)}</span>
                        : <span style={{ color: "#dc2626", fontSize: "12px", fontWeight: "600" }}>▼ {diff.toFixed(1)}</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <p style={{ fontWeight: "700", color: "#1e293b", fontSize: "13.5px", marginBottom: "12px" }}>Subject Trends</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: "12px" }}>
          {subjectNames.map((name, i) => (
            <SubjectLineChart key={name} subject={name} data={subjectTrends[name]} color={SUBJECT_PALETTE[i % SUBJECT_PALETTE.length]} />
          ))}
        </div>
      </div>
    </div>
  );
};

export default ProgressTab;