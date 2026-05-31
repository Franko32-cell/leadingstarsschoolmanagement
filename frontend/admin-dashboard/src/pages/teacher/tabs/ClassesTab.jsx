import React from "react";

const ClassesTab = ({ students = [], loading = false, selectedClassName = "", selectedTerm = "" }) => {
  if (loading) return <div className="p-4 text-sm text-slate-500">Loading students…</div>;

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-5">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Class roster</p>
          <h3 className="mt-1 text-xl font-semibold text-slate-900">{selectedClassName || "Class"}</h3>
          <p className="text-sm text-slate-500">{selectedTerm || "Term"} overview</p>
        </div>
        <span className="inline-flex items-center rounded-full bg-blue-50 px-3 py-1 text-sm font-semibold text-blue-700">
          {students.length} {students.length === 1 ? "student" : "students"}
        </span>
      </div>

      {students.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-500">
          No students are assigned to this class yet.
        </div>
      ) : (
        <div className="divide-y divide-slate-100">
          {students.map((s, index) => {
            const studentId = s.admission_number || s.username || s.id;
            return (
              <div key={s.id} className={`flex flex-col gap-2 py-4 ${index !== 0 ? "border-t border-slate-100" : ""}`}>
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <span className="font-medium text-slate-800">{s.student_name || s.name || `Student ${s.id}`}</span>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">Student ID: {studentId}</span>
                </div>
                <p className="text-sm text-slate-500">{s.roll_number ? `Roll No: ${s.roll_number}` : "Student record"}</p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ClassesTab;
