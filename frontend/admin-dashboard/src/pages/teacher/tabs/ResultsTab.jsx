import React from "react";
import { computeTotal, gradeFromTotal, getReopenBreakdown, getCABreakdown, getExamsBreakdown } from "../Helpers";

const AVATAR_COLORS = [
  "bg-blue-100 text-blue-700",
  "bg-emerald-100 text-emerald-700",
  "bg-violet-100 text-violet-700",
  "bg-amber-100 text-amber-700",
  "bg-rose-100 text-rose-700",
  "bg-cyan-100 text-cyan-700",
];

const getInitials = (name = "") =>
  name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();

const MiniBar = ({ value, max, color }) => {
  const pct = Math.min(100, Math.round((parseFloat(value) / max) * 100));
  return (
    <div className="mt-1 h-1 w-13 rounded-full bg-slate-100 overflow-hidden" style={{ width: "52px" }}>
      <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
    </div>
  );
};

const ResultsTab = ({
  students = [],
  selectedSubject = "",
  selectedClassLevel = "",
  scores = {},
  breakdowns = {},
  existingIds = {},
  saving = false,
  deleting = false,
  filledCount = 0,
  onOpenModal = () => {},
  onDelete = () => {},
  onSubmit = () => {},
}) => {
  const savedCount = Object.keys(existingIds).length;

  if (!selectedSubject) {
    return (
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-12 text-center">
        <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center mx-auto mb-4">
          <svg className="w-6 h-6 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
        </div>
        <p className="text-sm font-bold text-slate-800 mb-1">Pick a subject to get started</p>
        <p className="text-sm text-slate-400">Choose a subject from the filter above, then enter scores for each student.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-5">

      {/* ── Header ── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[10.5px] font-bold tracking-widest text-slate-400 uppercase mb-1">Results entry</p>
          <h3 className="text-xl font-extrabold text-slate-900 tracking-tight">{selectedSubject}</h3>
          <p className="text-sm text-slate-500 mt-0.5">{selectedClassLevel || "Class level"} · enter values for the selected term and year</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 112.828 2.828L11.828 15.828a4 4 0 01-1.414.914l-3.414.672.672-3.414A4 4 0 019 13z" />
            </svg>
            Filled: {filledCount}
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            Saved: {savedCount}
          </span>
          <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-bold bg-slate-100 text-slate-500">
            {students.length} students
          </span>
        </div>
      </div>

      {/* ── Score legend cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Re-open", max: "/ 20", color: "bg-slate-50 border-slate-200 text-slate-700" },
          { label: "CA / MGT", max: "/ 40", color: "bg-slate-50 border-slate-200 text-slate-700" },
          { label: "Exams", max: "/ 40", color: "bg-slate-50 border-slate-200 text-slate-700" },
          { label: "Total", max: "/ 100", color: "bg-blue-50 border-blue-200 text-blue-700" },
        ].map(({ label, max, color }) => (
          <div key={label} className={`rounded-xl border px-4 py-3 text-center ${color}`}>
            <p className="text-[10px] font-bold uppercase tracking-widest opacity-60 mb-1">{label}</p>
            <p className="text-lg font-black font-mono">{max}</p>
          </div>
        ))}
      </div>

      {/* ── Table ── */}
      {students.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-10 text-center text-sm text-slate-400">
          No students found for this class.
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm" style={{ minWidth: "640px" }}>
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="py-3 px-4 text-left text-[10.5px] font-bold uppercase tracking-widest text-slate-400">Student</th>
                  <th className="py-3 px-4 text-center text-[10.5px] font-bold uppercase tracking-widest text-slate-400">Re-open</th>
                  <th className="py-3 px-4 text-center text-[10.5px] font-bold uppercase tracking-widest text-slate-400">CA</th>
                  <th className="py-3 px-4 text-center text-[10.5px] font-bold uppercase tracking-widest text-slate-400">Exams</th>
                  <th className="py-3 px-4 text-center text-[10.5px] font-bold uppercase tracking-widest text-slate-400">Total</th>
                  <th className="py-3 px-4 text-center text-[10.5px] font-bold uppercase tracking-widest text-slate-400">Grade</th>
                  <th className="py-3 px-4 text-left text-[10.5px] font-bold uppercase tracking-widest text-slate-400">Actions</th>
                </tr>
              </thead>
              <tbody>
                {students.map((s, index) => {
                  const sc = scores?.[s.id] ?? {};
                  const rowFilled = sc.reopen !== "" || sc.ca !== "" || sc.exams !== "";
                  const saved = Boolean(existingIds[s.id]);
                  const total = computeTotal(sc.reopen, sc.ca, sc.exams);
                  const grade = rowFilled ? gradeFromTotal(total, selectedClassLevel) : null;
                  const reopenBreak = getReopenBreakdown(breakdowns, s.id);
                  const caBreak     = getCABreakdown(breakdowns, s.id);
                  const examsBreak  = getExamsBreakdown(breakdowns, s.id);
                  const avatarColor = AVATAR_COLORS[index % AVATAR_COLORS.length];
                  const barColor    = saved ? "bg-emerald-400" : rowFilled ? "bg-amber-400" : "bg-blue-400";

                  const gradeChip = rowFilled
                    ? saved
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                      : "bg-amber-50 text-amber-700 border border-amber-200"
                    : "bg-slate-100 text-slate-400";

                  return (
                    <tr
                      key={s.id}
                      className={`border-t border-slate-100 transition-colors hover:bg-slate-50 ${rowFilled && !saved ? "bg-amber-50/30" : ""}`}
                    >
                      {/* Student */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${avatarColor}`}>
                            {getInitials(s.student_name || s.name)}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-800 text-[13px]">{s.student_name || s.name}</p>
                            <p className={`text-[11px] font-semibold mt-0.5 ${saved ? "text-emerald-600" : rowFilled ? "text-amber-600" : "text-slate-400"}`}>
                              {saved ? "✓ Saved" : rowFilled ? "Draft" : "No entry yet"}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Scores */}
                      {[
                        { val: sc.reopen, brk: reopenBreak, max: 20 },
                        { val: sc.ca,     brk: caBreak,     max: 40 },
                        { val: sc.exams,  brk: examsBreak,  max: 40 },
                      ].map(({ val, brk, max }, i) => (
                        <td key={i} className="py-3.5 px-4 text-center">
                          {val !== "" && val != null ? (
                            <>
                              <p className="text-[15px] font-bold text-slate-800 font-mono">{val}</p>
                              <MiniBar value={val} max={max} color={barColor} />
                              {brk && <p className="text-[10px] text-slate-400 mt-1 font-mono">{brk}</p>}
                            </>
                          ) : (
                            <p className="text-slate-300 text-sm">—</p>
                          )}
                        </td>
                      ))}

                      {/* Total */}
                      <td className="py-3.5 px-4 text-center">
                        {rowFilled ? (
                          <span className="text-base font-black text-blue-600 font-mono">{total.toFixed(1)}</span>
                        ) : (
                          <span className="text-slate-300 text-sm">—</span>
                        )}
                      </td>

                      {/* Grade */}
                      <td className="py-3.5 px-4 text-center">
                        <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-bold ${gradeChip}`}>
                          {grade ?? "—"}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4">
                        <div className="flex flex-wrap gap-1.5">
                          {["reopen", "ca", "exams"].map((type) => (
                            <button
                              key={type}
                              onClick={() => onOpenModal({ type, studentId: s.id, studentName: s.student_name })}
                              className="px-2.5 py-1 rounded-lg text-[11px] font-semibold border border-slate-200 bg-slate-50 text-slate-600 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-700 transition-colors"
                            >
                              {type.charAt(0).toUpperCase() + type.slice(1)}
                            </button>
                          ))}
                          <button
                            onClick={() => onDelete(s.id)}
                            disabled={!saved || deleting}
                            className="px-2.5 py-1 rounded-lg text-[11px] font-semibold border border-red-200 bg-white text-red-500 hover:bg-red-50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Footer ── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pt-2 border-t border-slate-100">
        <p className="text-xs text-slate-400">
          Click any score button to edit the breakdown, then save when all entries are complete.
        </p>
        <button
          onClick={onSubmit}
          disabled={saving || filledCount === 0}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-emerald-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 3H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V7l-4-4z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 21v-8H7v8M7 3v4h8" />
          </svg>
          {saving ? "Saving…" : `Save ${filledCount} result${filledCount !== 1 ? "s" : ""}`}
        </button>
      </div>

    </div>
  );
};

export default ResultsTab;