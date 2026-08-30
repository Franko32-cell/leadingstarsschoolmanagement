// src/pages/student/tabs/CharacterTab.jsx

import React, { useMemo } from "react";
import { KpiCard, Empty, Loading } from "../components/Ui";
import { CHAR_AREAS, TERMS } from "../constants";
import { charScoreGrade, formatCohort, fmtDate } from "../helpers";

const CharacterTab = ({ charAssessment, loading, selectedTerm }) => {
  const charFilledAreas = useMemo(
    () => CHAR_AREAS.filter((a) => charAssessment?.areas?.[a.key]?.score !== "" && charAssessment?.areas?.[a.key]?.score != null),
    [charAssessment]
  );
  const charScores = charFilledAreas.map((a) => parseFloat(charAssessment.areas[a.key].score));
  const charAvgScore = charScores.length ? Math.round(charScores.reduce((s, v) => s + v, 0) / charScores.length) : null;
  const charAvgGrade = charAvgScore != null ? charScoreGrade(charAvgScore) : null;
  const charCompletePct = charAssessment ? Math.round((charFilledAreas.length / CHAR_AREAS.length) * 100) : 0;
  const careerEntries = charAssessment?.career
    ? Object.entries(charAssessment.career).filter(([, e]) => e?.score !== "" && e?.score != null)
    : [];

  if (loading) return <Loading text="Loading character assessment…" />;
  if (!charAssessment) return <Empty icon="🌟" title="No character assessment yet" sub="Your teacher's character assessment for this term will appear here." />;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
      <div className="sp-kpi-grid">
        <KpiCard label="Cohort" value={formatCohort(charAssessment.cohort)} />
        <KpiCard label="Areas Assessed" value={`${charFilledAreas.length} / ${CHAR_AREAS.length}`} />
        <KpiCard label="Avg Score" value={charAvgScore ?? "—"} />
        <KpiCard label="Date Assessed" value={charAssessment.teacher_date ? fmtDate(charAssessment.teacher_date) : "—"} />
      </div>

      <div className="sp-char-section">
        <div className="sp-char-header">
          <div className="sp-char-header-title">Character Assessment</div>
          <div className="sp-char-header-sub">
            {TERMS.find((t) => t.value === selectedTerm)?.label}
            {charAssessment.cohort ? ` · ${formatCohort(charAssessment.cohort)}` : ""}
            {charAssessment.teacher_name ? ` · ${charAssessment.teacher_name}` : ""}
          </div>
        </div>

        <div className="sp-char-completion">
          <span className="sp-char-completion-label">{charFilledAreas.length} of {CHAR_AREAS.length} areas assessed</span>
          <div className="sp-char-completion-bar">
            <div className="sp-char-completion-fill" style={{ width: `${charCompletePct}%`, background: charCompletePct === 100 ? "#16a34a" : charCompletePct >= 50 ? "#2563eb" : "#d97706" }} />
          </div>
          <span className="sp-char-completion-pct" style={{ color: charCompletePct === 100 ? "#16a34a" : charCompletePct >= 50 ? "#2563eb" : "#d97706" }}>{charCompletePct}%</span>
        </div>

        {CHAR_AREAS.map((area) => {
          const entry     = charAssessment.areas?.[area.key];
          const score     = entry?.score;
          const remarks   = entry?.remarks;
          const gradeInfo = charScoreGrade(score);
          const pct       = score !== "" && score != null ? Math.min(100, parseFloat(score)) : 0;
          const barColor  = gradeInfo?.color ?? "#e2e8f0";
          return (
            <div key={area.key} className="sp-char-area-row">
              <div style={{ minWidth: "180px" }}>
                <div className="sp-char-area-name">{area.label}</div>
                <div className="sp-char-area-guide">{area.guide}</div>
              </div>
              {score !== "" && score != null ? (
                <>
                  <div className="sp-char-score-bar-wrap">
                    <div className="sp-char-score-bar"><div className="sp-char-score-fill" style={{ width: `${pct}%`, background: barColor }} /></div>
                  </div>
                  <div className="sp-char-area-right">
                    <span style={{ fontFamily: "'DM Mono',monospace", fontWeight: "800", color: barColor, fontSize: "15px", minWidth: "32px", textAlign: "right" }}>{score}</span>
                    {gradeInfo && <span className="sp-char-score-chip" style={{ background: gradeInfo.bg, color: gradeInfo.color }}>{gradeInfo.grade} — {gradeInfo.label}</span>}
                  </div>
                  {remarks && <div className="sp-char-remarks" title={remarks}>"{remarks}"</div>}
                </>
              ) : (
                <span style={{ color: "#cbd5e1", fontSize: "13px", marginLeft: "auto" }}>Not yet assessed</span>
              )}
            </div>
          );
        })}

        {charAvgGrade && (
          <div className="sp-char-grade-footer">
            <span style={{ fontSize: "13px", fontWeight: "700", color: "var(--navy-2)" }}>Overall Grade</span>
            <span className="sp-char-score-chip" style={{ background: charAvgGrade.bg, color: charAvgGrade.color, fontSize: "13px", fontWeight: "700", padding: "4px 14px" }}>
              {charAvgGrade.grade} — {charAvgGrade.label} ({charAvgScore}/100)
            </span>
          </div>
        )}
      </div>

      {careerEntries.length > 0 && (
        <div className="sp-char-section">
          <div className="sp-char-header">
            <div className="sp-char-header-title">Career Development Assessment</div>
            <div className="sp-char-header-sub">Practical skills training programmes</div>
          </div>
          {careerEntries.map(([key, entry]) => {
            const score     = entry.score;
            const gradeInfo = charScoreGrade(score);
            const pct       = score !== "" && score != null ? Math.min(100, parseFloat(score) || 0) : 0;
            const barColor  = gradeInfo?.color ?? "#e2e8f0";
            const label     = key.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
            return (
              <div key={key} className="sp-char-area-row">
                <div style={{ minWidth: "160px" }}>
                  <div className="sp-char-area-name">{label}</div>
                  {entry.exam && <div className="sp-char-area-guide">{entry.exam}</div>}
                </div>
                <div className="sp-char-score-bar-wrap">
                  <div className="sp-char-score-bar"><div className="sp-char-score-fill" style={{ width: `${pct}%`, background: barColor }} /></div>
                </div>
                <div className="sp-char-area-right">
                  <span style={{ fontFamily: "'DM Mono',monospace", fontWeight: "800", color: barColor, fontSize: "15px", minWidth: "32px", textAlign: "right" }}>{score}</span>
                  {gradeInfo && <span className="sp-char-score-chip" style={{ background: gradeInfo.bg, color: gradeInfo.color }}>{gradeInfo.grade} — {gradeInfo.label}</span>}
                </div>
                {entry.remarks && <div className="sp-char-remarks" title={entry.remarks}>"{entry.remarks}"</div>}
              </div>
            );
          })}
        </div>
      )}

      {(charAssessment.teacher_name || charAssessment.trainer_name) && (
        <div className="sp-char-section">
          <div className="sp-card-head" style={{ padding: "14px 18px" }}><span className="sp-card-title">Signed Off By</span></div>
          <div className="sp-char-signoff-grid">
            {[
              { role: "Class Teacher", name: charAssessment.teacher_name, date: charAssessment.teacher_date, signature: charAssessment.teacher_sig },
              { role: "Skills Trainer", name: charAssessment.trainer_name, date: charAssessment.trainer_date, signature: charAssessment.trainer_sig },
            ].filter((s) => s.name).map((s) => (
              <div key={s.role} className="sp-char-signoff-card">
                <div className="sp-char-signoff-role">{s.role}</div>
                <div className="sp-char-signoff-name">{s.name}</div>
                {s.signature && <div className="sp-char-signoff-meta">Signature: {s.signature}</div>}
                {s.date && <div className="sp-char-signoff-meta">{fmtDate(s.date)}</div>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default CharacterTab;