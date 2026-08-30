// src/pages/teacher/components/ElearningModals.jsx

import React, { useState, useRef } from "react";

const CheckIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const FileDrop = ({ file, onFile, existingUrl, accept }) => {
  const ref = useRef(null);
  return (
    <div>
      <label className="tp-file-drop">
        <input ref={ref} type="file" accept={accept} onChange={(e) => onFile(e.target.files?.[0] ?? null)} />
        📎 {file ? file.name : existingUrl ? "Replace attached file" : "Click to attach a file"}
      </label>
      {existingUrl && !file && (
        <a href={existingUrl} target="_blank" rel="noreferrer" style={{ fontSize: "11px", color: "#3b82f6", display: "inline-block", marginTop: "6px" }}>
          View current attachment ↗
        </a>
      )}
    </div>
  );
};

// ── LessonFormModal ─────────────────────────────────────────────────────

export function LessonFormModal({ initial, subjects, onSave, onClose }) {
  const [title, setTitle]           = useState(initial?.title ?? "");
  const [description, setDesc]      = useState(initial?.description ?? "");
  const [subjectId, setSubjectId]   = useState(initial?.subject ?? "");
  const [videoUrl, setVideoUrl]     = useState(initial?.video_url ?? "");
  const [file, setFile]             = useState(null);
  const [saving, setSaving]         = useState(false);
  const [error, setError]           = useState("");

  const handleSave = async () => {
    if (!title.trim()) { setError("Give this lesson a title."); return; }
    setSaving(true);
    setError("");
    try {
      await onSave(
        { title, description, subject: subjectId || undefined, video_url: videoUrl || undefined },
        file
      );
      onClose();
    } catch {
      setError("Failed to save lesson. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="tp-modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="tp-modal">
        <div className="tp-modal-header">
          <div>
            <p className="tp-modal-title">{initial ? "Edit Lesson" : "New Lesson"}</p>
            <p className="tp-modal-subtitle">Upload notes, slides, or link a video for your class</p>
          </div>
          <button className="tp-modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="tp-modal-body">
          <div className="tp-modal-section">
            <div className="tp-section-label">Subject</div>
            <select className="tp-modal-field" style={{ fontFamily: "inherit", fontWeight: 500 }} value={subjectId} onChange={(e) => setSubjectId(e.target.value)}>
              <option value="">General / All subjects</option>
              {subjects?.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div className="tp-modal-section">
            <div className="tp-section-label">Title</div>
            <input style={{ textAlign: "left", fontFamily: "inherit", fontWeight: 500 }} className="tp-modal-field-input" placeholder="e.g. Introduction to Fractions"
              value={title} onChange={(e) => setTitle(e.target.value)}
              onFocus={(e) => e.target.style.borderColor = "#3b82f6"}
            />
          </div>
          <div className="tp-modal-section">
            <div className="tp-section-label">Description</div>
            <textarea rows={3} style={{ width: "100%", border: "1.5px solid #e2e8f0", borderRadius: "8px", padding: "8px 10px", fontSize: "13px", fontFamily: "inherit", resize: "vertical" }}
              placeholder="What will students learn from this lesson?" value={description} onChange={(e) => setDesc(e.target.value)} />
          </div>
          <div className="tp-modal-section">
            <div className="tp-section-label">Video link (optional)</div>
            <input style={{ width: "100%", border: "1.5px solid #e2e8f0", borderRadius: "8px", padding: "8px 10px", fontSize: "13px", fontFamily: "inherit" }}
              placeholder="https://youtube.com/…" value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} />
          </div>
          <div className="tp-modal-section">
            <div className="tp-section-label">Attachment (optional)</div>
            <FileDrop file={file} onFile={setFile} existingUrl={initial?.attachment} />
          </div>
          {error && <div style={{ background: "#fef2f2", border: "1px solid #fecaca", color: "#b91c1c", borderRadius: "8px", padding: "8px 12px", fontSize: "13px" }}>{error}</div>}
        </div>
        <div className="tp-modal-footer">
          <button className="tp-modal-btn-cancel" onClick={onClose}>Cancel</button>
          <button className="tp-modal-btn-apply" onClick={handleSave} disabled={saving}>
            <CheckIcon /> {saving ? "Saving…" : initial ? "Save Changes" : "Publish Lesson"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── AssignmentFormModal ─────────────────────────────────────────────────

export function AssignmentFormModal({ initial, subjects, onSave, onClose }) {
  const [title, setTitle]             = useState(initial?.title ?? "");
  const [instructions, setInstructions] = useState(initial?.instructions ?? "");
  const [subjectId, setSubjectId]     = useState(initial?.subject ?? "");
  const [dueDate, setDueDate]         = useState(initial?.due_date ? initial.due_date.slice(0, 16) : "");
  const [maxScore, setMaxScore]       = useState(initial?.max_score ?? 100);
  const [file, setFile]               = useState(null);
  const [saving, setSaving]           = useState(false);
  const [error, setError]             = useState("");

  const handleSave = async () => {
    if (!title.trim()) { setError("Give this assignment a title."); return; }
    if (!dueDate)       { setError("Set a due date."); return; }
    setSaving(true);
    setError("");
    try {
      await onSave(
        {
          title, instructions,
          subject: subjectId || undefined,
          due_date: new Date(dueDate).toISOString(),
          max_score: Number(maxScore) || 100,
        },
        file
      );
      onClose();
    } catch {
      setError("Failed to save assignment. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="tp-modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="tp-modal">
        <div className="tp-modal-header">
          <div>
            <p className="tp-modal-title">{initial ? "Edit Assignment" : "New Assignment"}</p>
            <p className="tp-modal-subtitle">Students will see this on their portal and can submit work</p>
          </div>
          <button className="tp-modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="tp-modal-body">
          <div className="tp-modal-section">
            <div className="tp-section-label">Subject</div>
            <select style={{ width: "100%", border: "1.5px solid #e2e8f0", borderRadius: "8px", padding: "8px 10px", fontSize: "13px", fontFamily: "inherit" }}
              value={subjectId} onChange={(e) => setSubjectId(e.target.value)}>
              <option value="">General / All subjects</option>
              {subjects?.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div className="tp-modal-section">
            <div className="tp-section-label">Title</div>
            <input style={{ width: "100%", border: "1.5px solid #e2e8f0", borderRadius: "8px", padding: "8px 10px", fontSize: "13px", fontFamily: "inherit" }}
              placeholder="e.g. Worksheet 4 — Long Division" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="tp-modal-section">
            <div className="tp-section-label">Instructions</div>
            <textarea rows={3} style={{ width: "100%", border: "1.5px solid #e2e8f0", borderRadius: "8px", padding: "8px 10px", fontSize: "13px", fontFamily: "inherit", resize: "vertical" }}
              placeholder="What should students do?" value={instructions} onChange={(e) => setInstructions(e.target.value)} />
          </div>
          <div className="tp-modal-inputs">
            <div className="tp-modal-field">
              <label>Due date</label>
              <input type="datetime-local" style={{ textAlign: "left" }} value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
            <div className="tp-modal-field">
              <label>Max Score</label>
              <input type="number" min="1" value={maxScore} onChange={(e) => setMaxScore(e.target.value)} />
            </div>
          </div>
          <div className="tp-modal-section">
            <div className="tp-section-label">Attachment (optional)</div>
            <FileDrop file={file} onFile={setFile} existingUrl={initial?.attachment} />
          </div>
          {error && <div style={{ background: "#fef2f2", border: "1px solid #fecaca", color: "#b91c1c", borderRadius: "8px", padding: "8px 12px", fontSize: "13px" }}>{error}</div>}
        </div>
        <div className="tp-modal-footer">
          <button className="tp-modal-btn-cancel" onClick={onClose}>Cancel</button>
          <button className="tp-modal-btn-apply" onClick={handleSave} disabled={saving}>
            <CheckIcon /> {saving ? "Saving…" : initial ? "Save Changes" : "Publish Assignment"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── SubmissionsModal (view + grade all submissions for one assignment) ───

export function SubmissionsModal({ assignment, submissions, students, onGrade, onClose }) {
  const [scores, setScores]     = useState({});
  const [feedback, setFeedback] = useState({});
  const [savingId, setSavingId] = useState(null);

  const studentName = (id) => students.find((s) => String(s.id) === String(id))?.student_name ?? `Student #${id}`;

  const handleGrade = async (submission) => {
    setSavingId(submission.id);
    try {
      await onGrade(submission.id, Number(scores[submission.id] ?? submission.score ?? 0), feedback[submission.id] ?? submission.feedback ?? "");
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="tp-modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="tp-modal" style={{ maxWidth: "640px" }}>
        <div className="tp-modal-header">
          <div>
            <p className="tp-modal-title">Submissions — {assignment.title}</p>
            <p className="tp-modal-subtitle">{submissions.length} of {students.length} students submitted</p>
          </div>
          <button className="tp-modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="tp-modal-body">
          {submissions.length === 0 && (
            <p style={{ fontSize: "13px", color: "#94a3b8", textAlign: "center", padding: "20px 0" }}>No submissions yet.</p>
          )}
          {submissions.map((sub) => {
            const graded = sub.score !== null && sub.score !== undefined && sub.score !== "";
            return (
              <div key={sub.id} style={{ border: "1px solid #e2e8f0", borderRadius: "12px", padding: "14px 16px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
                  <div>
                    <p style={{ fontWeight: 700, fontSize: "13.5px", color: "#1e293b", margin: 0 }}>{studentName(sub.student)}</p>
                    <p style={{ fontSize: "11px", color: "#94a3b8", margin: "2px 0 0" }}>
                      Submitted {sub.submitted_at ? new Date(sub.submitted_at).toLocaleString() : "—"}
                      {sub.is_late && <span style={{ color: "#ea580c", fontWeight: 600 }}> · Late</span>}
                    </p>
                  </div>
                  {graded && <span className="tp-pill tp-pill-green">Graded {sub.score}/{assignment.max_score}</span>}
                </div>
                {sub.text_answer && <p style={{ fontSize: "13px", color: "#334155", background: "#f8fafc", borderRadius: "8px", padding: "8px 10px", marginBottom: "8px" }}>{sub.text_answer}</p>}
                {sub.file && <a href={sub.file} target="_blank" rel="noreferrer" style={{ fontSize: "12px", color: "#3b82f6", display: "inline-block", marginBottom: "8px" }}>📎 View submitted file ↗</a>}
                <div className="tp-modal-inputs">
                  <div className="tp-modal-field">
                    <label>Score / {assignment.max_score ?? 100}</label>
                    <input type="number" min="0" max={assignment.max_score ?? 100}
                      defaultValue={sub.score ?? ""}
                      onChange={(e) => setScores((p) => ({ ...p, [sub.id]: e.target.value }))} />
                  </div>
                  <div className="tp-modal-field" style={{ flex: 2 }}>
                    <label>Feedback</label>
                    <input style={{ textAlign: "left", fontWeight: 400 }} placeholder="Optional comment"
                      defaultValue={sub.feedback ?? ""}
                      onChange={(e) => setFeedback((p) => ({ ...p, [sub.id]: e.target.value }))} />
                  </div>
                  <div style={{ display: "flex", alignItems: "flex-end" }}>
                    <button className="tp-modal-btn-apply" style={{ padding: "8px 16px" }} onClick={() => handleGrade(sub)} disabled={savingId === sub.id}>
                      {savingId === sub.id ? "Saving…" : "Save"}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <div className="tp-modal-footer">
          <button className="tp-modal-btn-cancel" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}