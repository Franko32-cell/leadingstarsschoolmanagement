import React, { useState } from "react";
import { AssignmentFormModal, LessonFormModal, SubmissionsModal } from "../ElearningModals";

const Empty = ({ children }) => (
  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-500">{children}</div>
);

const ActionButton = ({ children, onClick, variant = "secondary" }) => (
  <button type="button" onClick={onClick} className={variant === "primary"
    ? "rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
    : "rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600 transition hover:border-blue-300 hover:text-blue-600"}>
    {children}
  </button>
);

const dateLabel = (value) => value ? new Date(value).toLocaleString() : "No due date";

const ElearningTab = ({
  lessons, assignments, students, subjects, loading, saving, submissions,
  onSaveLesson, onDeleteLesson, onSaveAssignment, onDeleteAssignment,
  onLoadSubmissions, onGrade,
}) => {
  const [view, setView] = useState("assignments");
  const [lessonModal, setLessonModal] = useState(null);
  const [assignmentModal, setAssignmentModal] = useState(null);
  const [submissionAssignment, setSubmissionAssignment] = useState(null);

  const confirmDelete = (type, item) => {
    if (window.confirm(`Delete ${type.toLowerCase()} "${item.title}"? This cannot be undone.`)) {
      type === "Lesson" ? onDeleteLesson(item.id) : onDeleteAssignment(item.id);
    }
  };

  const openSubmissions = async (assignment) => {
    await onLoadSubmissions(assignment.id);
    setSubmissionAssignment(assignment);
  };

  return (
    <>
      {lessonModal && <LessonFormModal initial={lessonModal === "new" ? null : lessonModal} subjects={subjects}
        onSave={(payload, file) => onSaveLesson(lessonModal === "new" ? null : lessonModal.id, payload, file)} onClose={() => setLessonModal(null)} />}
      {assignmentModal && <AssignmentFormModal initial={assignmentModal === "new" ? null : assignmentModal} subjects={subjects}
        onSave={(payload, file) => onSaveAssignment(assignmentModal === "new" ? null : assignmentModal.id, payload, file)} onClose={() => setAssignmentModal(null)} />}
      {submissionAssignment && <SubmissionsModal assignment={submissionAssignment}
        submissions={submissions.filter((item) => String(item.assignment) === String(submissionAssignment.id))}
        students={students} onGrade={onGrade} onClose={() => setSubmissionAssignment(null)} />}

      <div className="mb-4 flex flex-col gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div><p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Teacher workspace</p><h3 className="mt-1 text-xl font-semibold text-slate-900">E-learning content</h3><p className="mt-1 text-sm text-slate-500">Publish materials, set assignments, and mark student work.</p></div>
        <div className="flex gap-2"><ActionButton onClick={() => setLessonModal("new")} variant="primary">+ New lesson</ActionButton><ActionButton onClick={() => setAssignmentModal("new")}>+ Assignment</ActionButton></div>
      </div>

      <div className="mb-4 flex gap-2 border-b border-slate-200">
        {["assignments", "lessons"].map((item) => <button key={item} type="button" onClick={() => setView(item)} className={`border-b-2 px-3 py-2 text-sm font-semibold capitalize ${view === item ? "border-blue-600 text-blue-600" : "border-transparent text-slate-500"}`}>{item} ({item === "assignments" ? assignments.length : lessons.length})</button>)}
      </div>

      {loading && <div className="rounded-2xl bg-white p-8 text-center text-sm text-slate-500">Loading e-learning content…</div>}
      {!loading && view === "lessons" && (lessons.length === 0 ? <Empty>No lessons published for this class and filter.</Empty> : <div className="space-y-3">{lessons.map((lesson) => <div key={lesson.id} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm"><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><h4 className="font-semibold text-slate-900">{lesson.title}</h4><p className="mt-1 text-sm text-slate-500">{lesson.description || "No description provided."}</p></div><div className="flex gap-2"><ActionButton onClick={() => setLessonModal(lesson)}>Edit</ActionButton><ActionButton onClick={() => confirmDelete("Lesson", lesson)}>Delete</ActionButton></div></div><div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">{lesson.attachment && <a className="font-semibold text-blue-600" href={lesson.attachment} target="_blank" rel="noreferrer">View attachment ↗</a>}{lesson.video_url && <a className="font-semibold text-blue-600" href={lesson.video_url} target="_blank" rel="noreferrer">Watch video ↗</a>}</div></div>)}</div>)}
      {!loading && view === "assignments" && (assignments.length === 0 ? <Empty>No assignments published for this class and filter.</Empty> : <div className="space-y-3">{assignments.map((assignment) => <div key={assignment.id} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm"><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><h4 className="font-semibold text-slate-900">{assignment.title}</h4><p className="mt-1 text-sm text-slate-500">{assignment.instructions || "No instructions provided."}</p><p className="mt-2 text-xs font-medium text-slate-400">Due {dateLabel(assignment.due_date)} · {assignment.max_score} marks</p></div><div className="flex flex-wrap gap-2"><ActionButton onClick={() => openSubmissions(assignment)} variant="primary">Check submissions</ActionButton><ActionButton onClick={() => setAssignmentModal(assignment)}>Edit</ActionButton><ActionButton onClick={() => confirmDelete("Assignment", assignment)}>Delete</ActionButton></div></div>{assignment.attachment && <a className="mt-3 inline-block text-xs font-semibold text-blue-600" href={assignment.attachment} target="_blank" rel="noreferrer">View assignment brief ↗</a>}</div>)}</div>)}
      {saving && <p className="mt-3 text-center text-xs text-slate-400">Saving…</p>}
    </>
  );
};

export default ElearningTab;