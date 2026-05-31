import React from "react";
import {
  CHAR_AREAS,
  CAREER_SKILL_DEFAULTS,
  CHAR_SCORE_GRADES,
  COHORT_OPTIONS,
} from "../constants";

const getScoreGrade = (score) => {
  if (score === "" || score === null || score === undefined) return null;
  const n = parseFloat(score);
  return CHAR_SCORE_GRADES.find((item) => n >= item.min) ?? null;
};

const CharacterTab = ({
  students = [],
  selectedClass = "",
  selectedClassName = "",
  selectedTerm = "",
  selectedYear = "",
  charAssess = {},
}) => {
  const {
    charStudentId,
    charForms,
    charExtraSkills,
    form,
    loading,
    saving,
    saved,
    updateArea,
    updateCareerSkill,
    updateField,
    addExtraSkill,
    updateExtraSkillLabel,
    removeExtraSkill,
    save,
  } = charAssess;

  const selectedStudent = students.find((s) => String(s.id) === String(charStudentId));
  const selectedName = selectedStudent?.student_name || selectedStudent?.name || "";
  const selectedId = selectedStudent?.admission_number || selectedStudent?.username || `ID: ${selectedStudent?.id}`;

  const studentProgress = students.map((s) => {
    const studentForm = charForms?.[s.id];
    const filled = studentForm
      ? Object.values(studentForm.areas ?? {}).filter((a) => a.score !== "").length
      : 0;
    return { id: s.id, name: s.student_name || s.name, filled };
  });

  const progressCounts = studentProgress.reduce(
    (acc, item) => {
      if (item.filled === 0) acc.notStarted += 1;
      else if (item.filled < CHAR_AREAS.length) acc.inProgress += 1;
      else acc.completed += 1;
      return acc;
    },
    { notStarted: 0, inProgress: 0, completed: 0 }
  );

  const charForm = form ?? { areas: {}, career: {}, cohort: COHORT_OPTIONS[0].value };
  const careerRows = [
    ...CAREER_SKILL_DEFAULTS,
    ...charExtraSkills.map((skill) => ({
      key: skill.key,
      label: skill.label || "New Skill",
      exam: skill.exam || "Exam",
      isExtra: true,
    })),
  ];

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between mb-5">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Character assessment</p>
          <h3 className="mt-1 text-xl font-semibold text-slate-900">{selectedClassName || "Class"}</h3>
          <p className="text-sm text-slate-500">{selectedTerm} · {selectedYear}</p>
        </div>
        <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
          <p className="font-semibold text-slate-900">{progressCounts.completed} completed</p>
          <p className="text-xs text-slate-500">{students.length ? `${progressCounts.notStarted} not started · ${progressCounts.inProgress} in progress` : "No students in this class."}</p>
        </div>
      </div>

      {!students.length ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-500">
          No students available for character assessment.
        </div>
      ) : !charStudentId ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-500">
          Select a student above to open the assessment form.
        </div>
      ) : (
        <div className="space-y-5">
          <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 text-sm text-slate-700">
            <p className="font-semibold text-slate-900">Selected student</p>
            <p>{selectedName} · {selectedId}</p>
            <p className="text-xs text-slate-500 mt-1">Use the student selector above to switch assessments.</p>
          </div>

          <div className="rounded-2xl border border-slate-100 overflow-hidden">
            <div className="bg-slate-50 px-5 py-4 border-b border-slate-100">
              <p className="text-sm font-semibold text-slate-700">Character Areas</p>
              <p className="text-xs text-slate-400">Enter score and remarks for each area.</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-100 text-slate-500 uppercase text-[11px] tracking-wide">
                    <th className="px-4 py-3 text-left">Area</th>
                    <th className="px-4 py-3 text-left hidden sm:table-cell">Guide</th>
                    <th className="px-4 py-3 text-center">Score</th>
                    <th className="px-4 py-3 text-center">Grade</th>
                    <th className="px-4 py-3 text-left">Remarks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {CHAR_AREAS.map((area) => {
                    const entry = charForm.areas?.[area.key] ?? { score: "", remarks: "" };
                    const grade = getScoreGrade(entry.score);
                    return (
                      <tr key={area.key} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3 font-medium text-slate-800">{area.label}</td>
                        <td className="px-4 py-3 text-slate-500 text-xs hidden sm:table-cell">{area.guide}</td>
                        <td className="px-4 py-3 text-center">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            step="1"
                            value={entry.score}
                            onChange={(e) => updateArea(area.key, "score", e.target.value === "" ? "" : Math.min(100, Math.max(0, parseInt(e.target.value, 10) || 0)))}
                            className="w-20 rounded-xl border border-slate-200 bg-slate-50 px-2 py-1 text-center text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                          />
                        </td>
                        <td className="px-4 py-3 text-center">
                          {grade ? (
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-[11px] font-semibold ${grade.bg}`}>{grade.grade}</span>
                          ) : (
                            <span className="text-slate-300 text-xs">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="text"
                            value={entry.remarks}
                            onChange={(e) => updateArea(area.key, "remarks", e.target.value)}
                            placeholder="Add remarks…"
                            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-100 overflow-hidden">
            <div className="bg-slate-50 px-5 py-4 border-b border-slate-100">
              <p className="text-sm font-semibold text-slate-700">Career Development</p>
              <p className="text-xs text-slate-400">Score practical skills and record training remarks.</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-100 text-slate-500 uppercase text-[11px] tracking-wide">
                    <th className="px-4 py-3 text-left">Skill</th>
                    <th className="px-4 py-3 text-left hidden sm:table-cell">Exam Type</th>
                    <th className="px-4 py-3 text-center">Score</th>
                    <th className="px-4 py-3 text-center">Grade</th>
                    <th className="px-4 py-3 text-left">Remarks</th>
                    <th className="px-4 py-3 text-center">Remove</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {careerRows.map((skill) => {
                    const entry = charForm.career?.[skill.key] ?? { score: "", remarks: "", exam: skill.exam };
                    const grade = getScoreGrade(entry.score);
                    return (
                      <tr key={skill.key} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3">
                          {skill.isExtra ? (
                            <input
                              type="text"
                              value={skill.label}
                              onChange={(e) => updateExtraSkillLabel(skill.key, e.target.value)}
                              placeholder="Skill name…"
                              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                            />
                          ) : (
                            <span className="font-medium text-slate-800">{skill.label}</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-slate-500 text-xs hidden sm:table-cell">
                          <input
                            type="text"
                            value={entry.exam ?? skill.exam}
                            onChange={(e) => updateCareerSkill(skill.key, "exam", e.target.value)}
                            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                          />
                        </td>
                        <td className="px-4 py-3 text-center">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            step="1"
                            value={entry.score}
                            onChange={(e) => updateCareerSkill(skill.key, "score", e.target.value === "" ? "" : Math.min(100, Math.max(0, parseInt(e.target.value, 10) || 0)))}
                            className="w-20 rounded-xl border border-slate-200 bg-slate-50 px-2 py-1 text-center text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                          />
                        </td>
                        <td className="px-4 py-3 text-center">
                          {grade ? (
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-[11px] font-semibold ${grade.bg}`}>{grade.grade}</span>
                          ) : (
                            <span className="text-slate-300 text-xs">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="text"
                            value={entry.remarks}
                            onChange={(e) => updateCareerSkill(skill.key, "remarks", e.target.value)}
                            placeholder="Remarks…"
                            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                          />
                        </td>
                        <td className="px-4 py-3 text-center">
                          {skill.isExtra ? (
                            <button
                              type="button"
                              onClick={() => removeExtraSkill(skill.key)}
                              className="text-slate-400 hover:text-red-600 transition-colors"
                            >
                              ×
                            </button>
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="px-5 py-4 border-t border-slate-100">
              <button
                type="button"
                onClick={addExtraSkill}
                className="inline-flex items-center gap-2 rounded-full border border-dashed border-slate-300 px-4 py-2 text-xs font-semibold text-slate-600 hover:border-blue-300 hover:text-blue-700 transition-colors"
              >
                + Add career skill
              </button>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-100 p-4 bg-slate-50">
            <p className="text-sm font-semibold text-slate-700 mb-3">Sign-off details</p>
            <div className="grid gap-4 sm:grid-cols-2">
              {[
                { label: "Class Teacher Name", field: "teacher_name" },
                { label: "Class Teacher Signature", field: "teacher_sig" },
                { label: "Class Teacher Date", field: "teacher_date", type: "date" },
                { label: "Trainer Name", field: "trainer_name" },
                { label: "Trainer Signature", field: "trainer_sig" },
                { label: "Trainer Date", field: "trainer_date", type: "date" },
              ].map((item) => (
                <label key={item.field} className="block text-sm text-slate-700">
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{item.label}</span>
                  <input
                    type={item.type ?? "text"}
                    value={charForm[item.field] ?? ""}
                    onChange={(e) => updateField(item.field, e.target.value)}
                    className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                </label>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-slate-500">
              {loading
                ? "Loading assessment…"
                : `${Object.values(charForm.areas ?? {}).filter((a) => a.score !== "").length} of ${CHAR_AREAS.length} character areas completed`}
            </p>
            <div className="flex items-center gap-3">
              {saved && <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">Saved</span>}
              <button
                type="button"
                onClick={() => save(selectedClass, selectedTerm, selectedYear)}
                disabled={saving || loading}
                className="rounded-2xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                {saving ? "Saving…" : "Save Assessment"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CharacterTab;
