// src/pages/student/tabs/ElearningTab.jsx

import React, { useState } from "react";
import { Empty, Loading } from "../components/Ui";
import { LessonCard, AssignmentCard, SubmitAssignmentModal } from "../components/Elearning";

const ElearningTab = ({ lessons, assignments, loading, submitting, submissionFor, onSubmit }) => {
  const [subTab, setSubTab] = useState("assignments"); // "lessons" | "assignments"
  const [openAssignment, setOpenAssignment] = useState(null);

  if (loading) return <Loading text="Loading lessons and assignments…" />;

  const pendingCount = assignments.filter((a) => {
    const s = submissionFor(a.id);
    return !s || (s.score === null || s.score === undefined || s.score === "");
  }).length;

  return (
    <>
      {openAssignment && (
        <SubmitAssignmentModal
          assignment={openAssignment}
          submission={submissionFor(openAssignment.id)}
          submitting={submitting}
          onClose={() => setOpenAssignment(null)}
          onSubmit={onSubmit}
        />
      )}

      <div className="sp-elearn-tabs">
        <button className={`sp-elearn-subtab ${subTab === "assignments" ? "sp-elearn-subtab-active" : ""}`} onClick={() => setSubTab("assignments")}>
          📝 Assignments {pendingCount > 0 && `(${pendingCount})`}
        </button>
        <button className={`sp-elearn-subtab ${subTab === "lessons" ? "sp-elearn-subtab-active" : ""}`} onClick={() => setSubTab("lessons")}>
          📚 Lessons
        </button>
      </div>

      {subTab === "lessons" && (
        lessons.length === 0
          ? <Empty icon="📚" title="No lessons uploaded yet" sub="Lesson notes and materials from your teacher will appear here." />
          : lessons.map((lesson) => <LessonCard key={lesson.id} lesson={lesson} />)
      )}

      {subTab === "assignments" && (
        assignments.length === 0
          ? <Empty icon="📝" title="No assignments yet" sub="Assignments from your teacher will appear here." />
          : assignments
              .slice()
              .sort((a, b) => new Date(a.due_date || 0) - new Date(b.due_date || 0))
              .map((assignment) => (
                <AssignmentCard
                  key={assignment.id}
                  assignment={assignment}
                  submission={submissionFor(assignment.id)}
                  onOpenSubmit={() => setOpenAssignment(assignment)}
                />
              ))
      )}
    </>
  );
};

export default ElearningTab;