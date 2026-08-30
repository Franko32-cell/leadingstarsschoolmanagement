// src/pages/student/components/Elearning.jsx
//
// Student-facing lesson & assignment display + the submission modal.

import React, { useState, useRef } from "react";
import { fmtDate, fmtDateTime, submissionStatus, dueLabel, STATUS_LABELS } from "../helpers";

const PaperclipIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
    <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" />
  </svg>
);

const StatusPill = ({ status }) => (
  <span className={`sp-status-pill sp-status-${status.replace("_", "-")}`}>
    {STATUS_LABELS[status]}
  </span>
);

// ── Lesson card ─────────────────────────────────────────────────────────

export const LessonCard = ({ lesson }) => (
  <div className="sp-lesson-card">
    <div className="sp-lesson-top">
      <div style={{ flex: 1 }}>
        {lesson.subject_name && <span className="sp-lesson-subject-chip">{lesson.subject_name}</span>}
        <p className="sp-lesson-title">{lesson.title}</p>
        {lesson.description && <p className="sp-lesson-desc">{lesson.description}</p>}
        <div className="sp-lesson-meta">
          <span>👤 {lesson.teacher_name || "Teacher"}</span>
          <span>🗓 {fmtDate(lesson.created_at)}</span>
        </div>
      </div>
    </div>
    <div className="sp-lesson-actions">
      {lesson.attachment && (
        <a className="sp-btn-outline" href={lesson.attachment} target="_blank" rel="noreferrer">
          <PaperclipIcon /> View material
        </a>
      )}
      {lesson.video_url && (
        <a className="sp-btn-outline" href={lesson.video_url} target="_blank" rel="noreferrer">
          ▶ Watch video
        </a>
      )}
    </div>
  </div>
);

// ── Assignment card ─────────────────────────────────────────────────────

export const AssignmentCard = ({ assignment, submission, onOpenSubmit }) => {
  const status = submissionStatus(assignment, submission);
  const due    = dueLabel(assignment.due_date);

  return (
    <div className="sp-assign-card">
      <div className="sp-lesson-top">
        <div style={{ flex: 1 }}>
          {assignment.subject_name && <span className="sp-lesson-subject-chip">{assignment.subject_name}</span>}
          <p className="sp-lesson-title">{assignment.title}</p>
          {assignment.instructions && <p className="sp-lesson-desc">{assignment.instructions}</p>}
          <div className="sp-lesson-meta">
            <span className={`sp-assign-due sp-assign-due-${due.bucket}`}>⏰ {due.text}</span>
            {assignment.max_score != null && <span>🏆 {assignment.max_score} marks</span>}
          </div>
        </div>
        <StatusPill status={status} />
      </div>

      {status === "graded" && (
        <div className="sp-grade-box">
          <div>
            <div style={{ fontSize: "12px", color: "#166534", fontWeight: 600 }}>Your score</div>
            {submission.feedback && <div style={{ fontSize: "12px", color: "#166534", fontStyle: "italic", marginTop: "3px" }}>"{submission.feedback}"</div>}
          </div>
          <span className="sp-grade-score">{submission.score}/{assignment.max_score ?? 100}</span>
        </div>
      )}

      <div className="sp-lesson-actions">
        {assignment.attachment && (
          <a className="sp-btn-outline" href={assignment.attachment} target="_blank" rel="noreferrer">
            <PaperclipIcon /> Assignment brief
          </a>
        )}
        {submission?.file && (
          <a className="sp-btn-outline" href={submission.file} target="_blank" rel="noreferrer">
            📄 Your submission
          </a>
        )}
        <button className="sp-btn-outline" onClick={() => onOpenSubmit(assignment, submission)}>
          {status === "not_submitted" ? "✍️ Submit" : "✏️ Resubmit"}
        </button>
      </div>

      {submission?.submitted_at && (
        <div style={{ fontSize: "11px", color: "var(--dim)", marginTop: "8px" }}>
          Submitted {fmtDateTime(submission.submitted_at)}
        </div>
      )}
    </div>
  );
};

// ── Submission modal ─────────────────────────────────────────────────────

export const SubmitAssignmentModal = ({ assignment, submission, submitting, onClose, onSubmit }) => {
  const [text, setText] = useState(submission?.text_answer ?? "");
  const [file, setFile] = useState(null);
  const [error, setError] = useState("");
  const fileInputRef = useRef(null);
  const isOverdue = assignment.due_date && new Date(assignment.due_date).getTime() < Date.now();

  const handleFile = (e) => {
    const f = e.target.files?.[0];
    if (f) setFile(f);
  };

  const handleSubmit = async () => {
    setError("");
    if (!text.trim() && !file && !submission?.file) {
      setError("Add a text answer or attach a file before submitting.");
      return;
    }
    const ok = await onSubmit(assignment, { textAnswer: text, file });
    if (ok) onClose();
  };

  return (
    <div className="sp-modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="sp-modal" style={{ maxWidth: "480px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "14px" }}>
          <div>
            <p className="sp-modal-title">{assignment.title}</p>
            <p className="sp-modal-sub">{assignment.subject_name ? `${assignment.subject_name} · ` : ""}Due {fmtDate(assignment.due_date)}</p>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8", fontSize: "20px", padding: "2px", lineHeight: 1 }}>×</button>
        </div>

        {isOverdue && (
          <div className="sp-gateway-err" style={{ marginBottom: "14px" }}>
            ⚠️ This assignment is past its due date. Your submission will be marked late.
          </div>
        )}

        <div className="sp-modal-field">
          <label className="sp-field-label">Your answer</label>
          <textarea
            className="sp-textarea"
            placeholder="Type your answer here (optional if you're attaching a file)…"
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
        </div>

        <div className="sp-modal-field">
          <label className="sp-field-label">Attachment</label>
          <label className="sp-upload-dropzone">
            <input ref={fileInputRef} type="file" onChange={handleFile} />
            📎 Click to attach a file (PDF, image, doc)
          </label>
          {file && (
            <div className="sp-file-chip">
              {file.name}
              <button onClick={() => { setFile(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}>×</button>
            </div>
          )}
          {!file && submission?.file && (
            <div className="sp-file-chip">
              Previously submitted file kept unless you attach a new one
            </div>
          )}
        </div>

        {error && <div className="sp-pw-error">{error}</div>}

        <div className="sp-modal-actions">
          <button className="sp-btn-secondary" onClick={onClose}>Cancel</button>
          <button className="sp-btn-primary" onClick={handleSubmit} disabled={submitting === assignment.id}>
            {submitting === assignment.id
              ? <><div style={{ width: "15px", height: "15px", border: "2px solid rgba(255,255,255,.3)", borderTopColor: "#fff", borderRadius: "50%", animation: "sp-spin .6s linear infinite" }} />Submitting…</>
              : submission ? "Update Submission" : "Submit Assignment"}
          </button>
        </div>
      </div>
    </div>
  );
};