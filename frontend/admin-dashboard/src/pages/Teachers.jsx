import { useEffect, useState, useCallback } from "react";
import API from "../services/api";

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

// Hash full name string to an index instead of only using charCodeAt(0),
// which caused frequent colour collisions for names sharing a first letter.
const AVATAR_COLORS = [
  "#4f46e5","#0891b2","#059669","#d97706","#dc2626","#7c3aed","#db2777","#0284c7",
];
const hashStr = (str = "") => {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
  return Math.abs(h);
};
const getColor    = (str) => AVATAR_COLORS[hashStr(str) % AVATAR_COLORS.length];
const getInitials = (name = "") =>
  name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) || "?";

const todayStr = new Date().toISOString().split("T")[0];

// ─────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────

const Teachers = () => {
  const [teachers, setTeachers] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [classes,  setClasses]  = useState([]);
  const [loading,  setLoading]  = useState(true);

  // FIX: split "create" and "delete" submitting so each has an independent
  // loading state and can't interfere with the other.
  const [creating,        setCreating]        = useState(false);
  const [deletingId,      setDeletingId]      = useState(null);   // id of the row being deleted
  const [toast,           setToast]           = useState(null);
  const [deleteConfirm,   setDeleteConfirm]   = useState(null);
  const [search,          setSearch]          = useState("");

  const [form, setForm] = useState({
    first_name:   "",
    last_name:    "",
    subject:      "",
    school_class: "",
    hire_date:    "",
  });

  // ── Data fetching ────────────────────────────────────────────────────────

  // FIX: wrap loaders in useCallback so they are stable references, avoiding
  // "react-hooks/exhaustive-deps" warnings and unnecessary re-renders.
  const loadTeachers = useCallback(async () => {
    try {
      const res = await API.get("/teachers/");
      // FIX: handle both paginated (DRF default) and flat array responses,
      // consistent with how TeacherPortal.jsx fetches the same resources.
      setTeachers(res.data.results ?? res.data);
    } catch (err) {
      console.error(err);
    }
  }, []);

  const loadSubjects = useCallback(async () => {
    try {
      const res = await API.get("/subjects/");
      setSubjects(res.data.results ?? res.data);
    } catch (err) {
      console.error(err);
    }
  }, []);

  const loadClasses = useCallback(async () => {
    try {
      const res = await API.get("/classes/");
      setClasses(res.data.results ?? res.data);
    } catch (err) {
      console.error(err);
    }
  }, []);

  useEffect(() => {
    Promise.all([loadTeachers(), loadSubjects(), loadClasses()]).finally(() =>
      setLoading(false)
    );
  }, [loadTeachers, loadSubjects, loadClasses]);

  // ── Toast ────────────────────────────────────────────────────────────────

  const showToast = useCallback((message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  }, []);

  // ── Handlers ─────────────────────────────────────────────────────────────

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const createTeacher = async (e) => {
    e.preventDefault();
    setCreating(true);
    try {
      const payload = {
        first_name:   form.first_name,
        last_name:    form.last_name,
        subject:      Number(form.subject),
        school_class: Number(form.school_class),
        hire_date:    form.hire_date,
      };
      await API.post("/teachers/", payload);
      showToast("Teacher created successfully");
      setForm({ first_name: "", last_name: "", subject: "", school_class: "", hire_date: "" });
      loadTeachers();
    } catch (err) {
      showToast(err.response?.data?.detail || "Failed to create teacher", "error");
      console.error(err.response?.data);
    } finally {
      setCreating(false);
    }
  };

  const deleteTeacher = async (id) => {
    // FIX: track which row is being deleted so the button is disabled while
    // the request is in-flight, preventing duplicate DELETE calls.
    setDeletingId(id);
    try {
      await API.delete(`/teachers/${id}/`);
      setDeleteConfirm(null);
      showToast("Teacher removed successfully");
      loadTeachers();
    } catch (err) {
      showToast("Failed to delete teacher", "error");
      console.error(err);
    } finally {
      setDeletingId(null);
    }
  };

  // ── Derived ──────────────────────────────────────────────────────────────

  const filtered = teachers.filter((t) => {
    const q = search.toLowerCase();
    return (
      t.teacher_name?.toLowerCase().includes(q) ||
      t.teacher_id?.toLowerCase().includes(q)   ||
      t.subject_name?.toLowerCase().includes(q) ||
      t.class_name?.toLowerCase().includes(q)
    );
  });

  // ─────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');

        .teachers-root * { box-sizing: border-box; margin: 0; padding: 0; }
        .teachers-root {
          font-family: 'Sora', sans-serif;
          background: #f0f2f8;
          min-height: 100vh;
          padding: 2rem;
          color: #1a1d2e;
        }

        /* Toast */
        .toast {
          position: fixed;
          top: 1.5rem; right: 1.5rem;
          z-index: 1000;
          display: flex; align-items: center; gap: 0.75rem;
          padding: 0.875rem 1.25rem;
          border-radius: 12px;
          font-size: 0.875rem; font-weight: 500;
          box-shadow: 0 8px 32px rgba(0,0,0,0.15);
          animation: slideIn 0.3s ease;
          max-width: 340px;
        }
        .toast.success { background: #ecfdf5; color: #065f46; border: 1px solid #6ee7b7; }
        .toast.error   { background: #fef2f2; color: #7f1d1d; border: 1px solid #fca5a5; }
        /* FIX: added a dismiss button style */
        .toast-dismiss {
          margin-left: auto; background: none; border: none;
          cursor: pointer; font-size: 1rem; opacity: 0.6; padding: 0 0.25rem;
          color: inherit;
        }
        .toast-dismiss:hover { opacity: 1; }
        @keyframes slideIn { from { opacity: 0; transform: translateX(20px); } to { opacity: 1; transform: translateX(0); } }

        /* Header */
        .page-header {
          display: flex; align-items: center; justify-content: space-between;
          margin-bottom: 2rem; flex-wrap: wrap; gap: 1rem;
        }
        .page-title {
          font-size: 1.75rem; font-weight: 700; color: #1a1d2e;
          display: flex; align-items: center; gap: 0.75rem;
        }
        .page-title-icon {
          width: 44px; height: 44px; background: #4f46e5;
          border-radius: 12px; display: flex; align-items: center; justify-content: center;
          color: white; font-size: 1.25rem;
        }
        .page-subtitle { font-size: 0.875rem; color: #64748b; margin-top: 0.125rem; }

        /* Stats */
        .stats-row {
          display: flex; gap: 1rem; margin-bottom: 2rem; flex-wrap: wrap;
        }
        .stat-card {
          background: white; border-radius: 14px; padding: 1.125rem 1.5rem;
          border: 1px solid #e2e8f0; flex: 1; min-width: 130px;
          display: flex; align-items: center; gap: 1rem;
        }
        .stat-icon {
          width: 42px; height: 42px; border-radius: 10px;
          display: flex; align-items: center; justify-content: center; font-size: 1.125rem; flex-shrink: 0;
        }
        .stat-label { font-size: 0.75rem; color: #64748b; font-weight: 500; text-transform: uppercase; letter-spacing: 0.05em; }
        .stat-value { font-size: 1.5rem; font-weight: 700; color: #1a1d2e; line-height: 1.2; }

        /* Card */
        .card {
          background: white; border-radius: 16px; border: 1px solid #e2e8f0;
          box-shadow: 0 1px 3px rgba(0,0,0,0.06); overflow: hidden; margin-bottom: 1.5rem;
        }
        .card-header {
          padding: 1.25rem 1.5rem; border-bottom: 1px solid #f1f5f9;
          display: flex; align-items: center; gap: 0.625rem;
        }
        .card-header-title { font-size: 1rem; font-weight: 600; color: #1a1d2e; }
        .card-header-icon { color: #4f46e5; font-size: 1rem; }

        /* Form */
        .form-body { padding: 1.5rem; }
        .form-grid {
          display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 1rem;
        }
        .field-group { display: flex; flex-direction: column; gap: 0.375rem; }
        .field-label { font-size: 0.75rem; font-weight: 600; color: #475569; text-transform: uppercase; letter-spacing: 0.05em; }
        .field-input, .field-select {
          padding: 0.625rem 0.875rem; border: 1.5px solid #e2e8f0;
          border-radius: 10px; font-size: 0.875rem; font-family: 'Sora', sans-serif;
          color: #1a1d2e; background: #f8fafc; transition: all 0.2s;
          outline: none;
        }
        .field-input:focus, .field-select:focus {
          border-color: #4f46e5; background: white; box-shadow: 0 0 0 3px rgba(79,70,229,0.1);
        }
        .field-input::placeholder { color: #94a3b8; }
        .form-footer { padding: 0 1.5rem 1.5rem; }
        .btn-submit {
          width: 100%; padding: 0.75rem; background: #4f46e5; color: white;
          border: none; border-radius: 10px; font-family: 'Sora', sans-serif;
          font-size: 0.9rem; font-weight: 600; cursor: pointer; transition: all 0.2s;
          display: flex; align-items: center; justify-content: center; gap: 0.5rem;
        }
        .btn-submit:hover:not(:disabled) { background: #4338ca; transform: translateY(-1px); box-shadow: 0 4px 12px rgba(79,70,229,0.35); }
        .btn-submit:disabled { opacity: 0.65; cursor: not-allowed; }

        /* Inline spinner — separate from the loading state spinner */
        .btn-spinner {
          width: 16px; height: 16px;
          border: 2px solid rgba(255,255,255,0.35);
          border-top-color: white;
          border-radius: 50%;
          animation: spin 0.65s linear infinite;
          flex-shrink: 0;
        }

        /* Table toolbar */
        .table-toolbar {
          padding: 1rem 1.5rem; border-bottom: 1px solid #f1f5f9;
          display: flex; align-items: center; justify-content: space-between; gap: 1rem; flex-wrap: wrap;
        }
        .search-wrap {
          position: relative; flex: 1; min-width: 180px; max-width: 320px;
        }
        .search-icon { position: absolute; left: 0.75rem; top: 50%; transform: translateY(-50%); color: #94a3b8; font-size: 0.875rem; pointer-events: none; }
        .search-input {
          width: 100%; padding: 0.5rem 0.75rem 0.5rem 2.25rem;
          border: 1.5px solid #e2e8f0; border-radius: 8px;
          font-family: 'Sora', sans-serif; font-size: 0.875rem; color: #1a1d2e;
          background: #f8fafc; outline: none; transition: all 0.2s;
        }
        .search-input:focus { border-color: #4f46e5; background: white; box-shadow: 0 0 0 3px rgba(79,70,229,0.1); }
        .count-badge {
          font-size: 0.75rem; font-weight: 600; color: #64748b;
          background: #f1f5f9; padding: 0.25rem 0.75rem; border-radius: 99px;
        }

        /* Table */
        .table-wrap { overflow-x: auto; }
        table { width: 100%; border-collapse: collapse; }
        thead tr { background: #f8fafc; }
        th {
          padding: 0.75rem 1.25rem; text-align: left;
          font-size: 0.7rem; font-weight: 700; color: #64748b;
          text-transform: uppercase; letter-spacing: 0.08em;
          border-bottom: 1px solid #e2e8f0; white-space: nowrap;
        }
        tbody tr { border-bottom: 1px solid #f1f5f9; transition: background 0.15s; }
        tbody tr:last-child { border-bottom: none; }
        tbody tr:hover { background: #f8fafc; }
        td { padding: 0.875rem 1.25rem; font-size: 0.875rem; vertical-align: middle; }

        /* Avatar */
        .avatar {
          width: 34px; height: 34px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          font-size: 0.7rem; font-weight: 700; color: white; flex-shrink: 0;
        }
        .teacher-cell { display: flex; align-items: center; gap: 0.75rem; }
        .teacher-name { font-weight: 600; color: #1a1d2e; }

        /* Badges */
        .id-badge {
          font-family: 'JetBrains Mono', monospace;
          font-size: 0.75rem; font-weight: 500;
          background: #eef2ff; color: #4f46e5;
          padding: 0.25rem 0.625rem; border-radius: 6px;
          letter-spacing: 0.03em;
        }
        .subject-badge {
          font-size: 0.75rem; font-weight: 600;
          background: #f0fdf4; color: #166534;
          padding: 0.25rem 0.625rem; border-radius: 6px;
        }
        .class-badge {
          font-size: 0.75rem; font-weight: 600;
          background: #fff7ed; color: #9a3412;
          padding: 0.25rem 0.625rem; border-radius: 6px;
        }
        .date-text { font-size: 0.8rem; color: #64748b; }

        /* Delete btn */
        .btn-delete {
          padding: 0.375rem 0.75rem; background: transparent;
          border: 1.5px solid #fca5a5; color: #dc2626;
          border-radius: 8px; font-size: 0.8rem; font-weight: 600;
          font-family: 'Sora', sans-serif; cursor: pointer; transition: all 0.2s;
          display: flex; align-items: center; gap: 0.375rem;
        }
        .btn-delete:hover:not(:disabled) { background: #fef2f2; border-color: #dc2626; transform: translateY(-1px); }
        .btn-delete:disabled { opacity: 0.5; cursor: not-allowed; }

        /* Empty */
        .empty-state {
          padding: 3.5rem 1.5rem; text-align: center; color: #94a3b8;
        }
        .empty-icon { font-size: 2.5rem; margin-bottom: 0.75rem; opacity: 0.5; }
        .empty-text { font-size: 0.9rem; font-weight: 500; }

        /* Loading */
        .loading-state { padding: 3rem; text-align: center; }
        .spinner {
          width: 36px; height: 36px; border: 3px solid #e2e8f0;
          border-top-color: #4f46e5; border-radius: 50%;
          animation: spin 0.75s linear infinite; margin: 0 auto 0.75rem;
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        /* Modal overlay */
        .overlay {
          position: fixed; inset: 0; background: rgba(15,23,42,0.5);
          display: flex; align-items: center; justify-content: center;
          z-index: 999; backdrop-filter: blur(4px);
          animation: fadeIn 0.2s ease;
        }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        .modal {
          background: white; border-radius: 16px; padding: 2rem;
          max-width: 380px; width: 90%; box-shadow: 0 20px 60px rgba(0,0,0,0.2);
          animation: popIn 0.2s ease;
        }
        @keyframes popIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
        .modal-icon { font-size: 2rem; margin-bottom: 0.75rem; }
        .modal-title { font-size: 1.1rem; font-weight: 700; color: #1a1d2e; margin-bottom: 0.5rem; }
        .modal-text { font-size: 0.875rem; color: #64748b; line-height: 1.5; margin-bottom: 1.5rem; }
        .modal-actions { display: flex; gap: 0.75rem; }
        .btn-cancel {
          flex: 1; padding: 0.625rem; border: 1.5px solid #e2e8f0; background: white;
          color: #475569; border-radius: 10px; font-family: 'Sora', sans-serif;
          font-size: 0.875rem; font-weight: 600; cursor: pointer; transition: all 0.2s;
        }
        .btn-cancel:hover { background: #f8fafc; }
        .btn-danger {
          flex: 1; padding: 0.625rem; border: none; background: #dc2626;
          color: white; border-radius: 10px; font-family: 'Sora', sans-serif;
          font-size: 0.875rem; font-weight: 600; cursor: pointer; transition: all 0.2s;
          display: flex; align-items: center; justify-content: center; gap: 0.5rem;
        }
        .btn-danger:hover:not(:disabled) { background: #b91c1c; }
        .btn-danger:disabled { opacity: 0.6; cursor: not-allowed; }
      `}</style>

      <div className="teachers-root">

        {/* ── Toast ── */}
        {toast && (
          <div className={`toast ${toast.type}`} role="alert">
            <span aria-hidden="true">{toast.type === "success" ? "✓" : "✕"}</span>
            {toast.message}
            {/* FIX: added manual dismiss so users aren't forced to wait 3.5 s */}
            <button className="toast-dismiss" onClick={() => setToast(null)} aria-label="Dismiss notification">×</button>
          </div>
        )}

        {/* ── Delete Confirmation Modal ── */}
        {deleteConfirm && (
          <div
            className="overlay"
            onClick={(e) => { if (e.target === e.currentTarget) setDeleteConfirm(null); }}
          >
            <div className="modal" role="dialog" aria-modal="true" aria-labelledby="del-modal-title">
              <div className="modal-icon" aria-hidden="true">🗑️</div>
              <div className="modal-title" id="del-modal-title">Remove Teacher?</div>
              <div className="modal-text">
                This will permanently delete <strong>{deleteConfirm.name}</strong> and all associated
                records. This action cannot be undone.
              </div>
              <div className="modal-actions">
                <button
                  className="btn-cancel"
                  onClick={() => setDeleteConfirm(null)}
                  disabled={deletingId === deleteConfirm.id}
                >
                  Cancel
                </button>
                <button
                  className="btn-danger"
                  onClick={() => deleteTeacher(deleteConfirm.id)}
                  disabled={deletingId === deleteConfirm.id}
                >
                  {deletingId === deleteConfirm.id ? (
                    <><span className="btn-spinner" /> Deleting…</>
                  ) : (
                    "Delete"
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Page Header ── */}
        <div className="page-header">
          <div>
            <div className="page-title">
              <div className="page-title-icon" aria-hidden="true">👨‍🏫</div>
              <div>
                Teachers
                <div className="page-subtitle">Manage staff, subjects and class assignments</div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Stats ── */}
        <div className="stats-row">
          <div className="stat-card">
            <div className="stat-icon" style={{ background: "#eef2ff" }} aria-hidden="true">👨‍🏫</div>
            <div>
              <div className="stat-label">Total Teachers</div>
              <div className="stat-value">{teachers.length}</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon" style={{ background: "#f0fdf4" }} aria-hidden="true">📚</div>
            <div>
              <div className="stat-label">Subjects</div>
              <div className="stat-value">{subjects.length}</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon" style={{ background: "#fff7ed" }} aria-hidden="true">🏫</div>
            <div>
              <div className="stat-label">Classes</div>
              <div className="stat-value">{classes.length}</div>
            </div>
          </div>
        </div>

        {/* ── Add Teacher Card ── */}
        <div className="card">
          <div className="card-header">
            <span className="card-header-icon" aria-hidden="true">➕</span>
            <span className="card-header-title">Add New Teacher</span>
          </div>
          <form onSubmit={createTeacher}>
            <div className="form-body">
              <div className="form-grid">
                <div className="field-group">
                  <label className="field-label" htmlFor="first_name">First Name</label>
                  <input
                    id="first_name"
                    className="field-input"
                    type="text"
                    name="first_name"
                    placeholder="e.g. Naomi"
                    value={form.first_name}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div className="field-group">
                  <label className="field-label" htmlFor="last_name">Last Name</label>
                  <input
                    id="last_name"
                    className="field-input"
                    type="text"
                    name="last_name"
                    placeholder="e.g. Obeng"
                    value={form.last_name}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div className="field-group">
                  <label className="field-label" htmlFor="hire_date">Hire Date</label>
                  {/* FIX: added max={todayStr} — future hire dates are not valid */}
                  <input
                    id="hire_date"
                    className="field-input"
                    type="date"
                    name="hire_date"
                    max={todayStr}
                    value={form.hire_date}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div className="field-group">
                  <label className="field-label" htmlFor="subject">Subject</label>
                  <select
                    id="subject"
                    className="field-select"
                    name="subject"
                    value={form.subject}
                    onChange={handleChange}
                    required
                  >
                    <option value="">Select Subject</option>
                    {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div className="field-group">
                  <label className="field-label" htmlFor="school_class">Class</label>
                  <select
                    id="school_class"
                    className="field-select"
                    name="school_class"
                    value={form.school_class}
                    onChange={handleChange}
                    required
                  >
                    <option value="">Select Class</option>
                    {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              </div>
            </div>
            <div className="form-footer">
              <button className="btn-submit" type="submit" disabled={creating}>
                {creating
                  ? <><span className="btn-spinner" /> Creating…</>
                  : <><span aria-hidden="true">+</span> Create Teacher</>
                }
              </button>
            </div>
          </form>
        </div>

        {/* ── Teachers Table Card ── */}
        <div className="card">
          <div className="table-toolbar">
            <div className="card-header-title" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <span style={{ color: "#4f46e5" }} aria-hidden="true">📋</span> All Teachers
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
              <div className="search-wrap">
                <span className="search-icon" aria-hidden="true">🔍</span>
                <input
                  className="search-input"
                  placeholder="Search teachers…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  aria-label="Search teachers"
                />
              </div>
              <span className="count-badge" aria-live="polite">
                {filtered.length} of {teachers.length}
              </span>
            </div>
          </div>

          {loading ? (
            <div className="loading-state" aria-label="Loading teachers">
              <div className="spinner" aria-hidden="true" />
              <div style={{ color: "#94a3b8", fontSize: "0.875rem" }}>Loading teachers…</div>
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Teacher</th>
                    <th>ID</th>
                    <th>Subject</th>
                    <th>Class</th>
                    <th>Hire Date</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={6}>
                        <div className="empty-state">
                          <div className="empty-icon" aria-hidden="true">👨‍🏫</div>
                          <div className="empty-text">
                            {search ? "No teachers match your search" : "No teachers yet — add one above"}
                          </div>
                        </div>
                      </td>
                    </tr>
                  ) : filtered.map((t) => (
                    <tr key={t.id}>
                      <td>
                        <div className="teacher-cell">
                          <div className="avatar" style={{ background: getColor(t.teacher_name) }} aria-hidden="true">
                            {getInitials(t.teacher_name)}
                          </div>
                          <span className="teacher-name">{t.teacher_name}</span>
                        </div>
                      </td>
                      <td><span className="id-badge">{t.teacher_id}</span></td>
                      <td><span className="subject-badge">{t.subject_name}</span></td>
                      <td><span className="class-badge">{t.class_name}</span></td>
                      <td><span className="date-text">{t.hire_date}</span></td>
                      <td>
                        <button
                          className="btn-delete"
                          onClick={() => setDeleteConfirm({ id: t.id, name: t.teacher_name })}
                          disabled={deletingId === t.id}
                          aria-label={`Remove ${t.teacher_name}`}
                        >
                          <span aria-hidden="true">🗑</span> Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default Teachers;
