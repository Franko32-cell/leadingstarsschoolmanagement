import { useEffect, useState } from "react";
import API from "../services/api";

const Subjects = () => {
  const [subjects, setSubjects] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [search, setSearch] = useState("");

  const [form, setForm] = useState({ name: "", school_class: "" });

  useEffect(() => {
    Promise.all([loadSubjects(), loadClasses()]).finally(() => setLoading(false));
  }, []);

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const loadSubjects = async () => {
    try {
      const res = await API.get("/subjects/");
      setSubjects(res.data);
    } catch (err) { console.error(err); }
  };

  const loadClasses = async () => {
    try {
      const res = await API.get("/classes/");
      setClasses(res.data);
    } catch (err) { console.error(err); }
  };

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const createSubject = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await API.post("/subjects/", form);
      setForm({ name: "", school_class: "" });
      showToast("Subject added successfully");
      loadSubjects();
    } catch (err) {
      showToast(err.response?.data?.detail || "Failed to create subject", "error");
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const deleteSubject = async (id) => {
    try {
      await API.delete(`/subjects/${id}/`);
      setDeleteConfirm(null);
      showToast("Subject removed successfully");
      loadSubjects();
    } catch (err) {
      showToast("Failed to delete subject", "error");
      console.error(err);
    }
  };

  const filtered = subjects.filter((s) => {
    const q = search.toLowerCase();
    return s.name?.toLowerCase().includes(q) || s.class_name?.toLowerCase().includes(q);
  });

  // Group subjects by class for the stats
  const uniqueClasses = [...new Set(subjects.map((s) => s.class_name).filter(Boolean))];

  const subjectColors = [
    "#4f46e5","#0891b2","#059669","#d97706","#dc2626","#7c3aed","#db2777","#0284c7",
    "#65a30d","#ea580c","#0d9488","#9333ea",
  ];
  const getColor = (str) => subjectColors[(str?.charCodeAt(0) || 0) % subjectColors.length];

  const getInitials = (name) => {
    if (!name) return "?";
    return name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');

        .subj-root * { box-sizing: border-box; margin: 0; padding: 0; }
        .subj-root {
          font-family: 'Sora', sans-serif;
          background: #f0f2f8;
          min-height: 100vh;
          padding: 2rem;
          color: #1a1d2e;
        }

        /* Toast */
        .subj-toast {
          position: fixed; top: 1.5rem; right: 1.5rem; z-index: 1000;
          display: flex; align-items: center; gap: 0.75rem;
          padding: 0.875rem 1.25rem; border-radius: 12px;
          font-size: 0.875rem; font-weight: 500;
          box-shadow: 0 8px 32px rgba(0,0,0,0.15);
          animation: subjSlideIn 0.3s ease; max-width: 340px;
        }
        .subj-toast.success { background: #ecfdf5; color: #065f46; border: 1px solid #6ee7b7; }
        .subj-toast.error   { background: #fef2f2; color: #7f1d1d; border: 1px solid #fca5a5; }
        @keyframes subjSlideIn { from { opacity: 0; transform: translateX(20px); } to { opacity: 1; transform: translateX(0); } }

        /* Header */
        .subj-page-header { display: flex; align-items: flex-start; margin-bottom: 2rem; }
        .subj-page-title {
          font-size: 1.75rem; font-weight: 700; color: #1a1d2e;
          display: flex; align-items: center; gap: 0.75rem;
        }
        .subj-title-icon {
          width: 44px; height: 44px; background: #0891b2;
          border-radius: 12px; display: flex; align-items: center; justify-content: center;
          color: white; font-size: 1.25rem; flex-shrink: 0;
        }
        .subj-page-subtitle { font-size: 0.875rem; color: #64748b; margin-top: 0.125rem; }

        /* Stats */
        .subj-stats-row { display: flex; gap: 1rem; margin-bottom: 2rem; flex-wrap: wrap; }
        .subj-stat-card {
          background: white; border-radius: 14px; padding: 1.125rem 1.5rem;
          border: 1px solid #e2e8f0; flex: 1; min-width: 130px;
          display: flex; align-items: center; gap: 1rem;
        }
        .subj-stat-icon {
          width: 42px; height: 42px; border-radius: 10px;
          display: flex; align-items: center; justify-content: center;
          font-size: 1.125rem; flex-shrink: 0;
        }
        .subj-stat-label { font-size: 0.75rem; color: #64748b; font-weight: 500; text-transform: uppercase; letter-spacing: 0.05em; }
        .subj-stat-value { font-size: 1.5rem; font-weight: 700; color: #1a1d2e; line-height: 1.2; }

        /* Card */
        .subj-card {
          background: white; border-radius: 16px; border: 1px solid #e2e8f0;
          box-shadow: 0 1px 3px rgba(0,0,0,0.06); overflow: hidden; margin-bottom: 1.5rem;
        }
        .subj-card-header {
          padding: 1.25rem 1.5rem; border-bottom: 1px solid #f1f5f9;
          display: flex; align-items: center; gap: 0.625rem;
        }
        .subj-card-title { font-size: 1rem; font-weight: 600; color: #1a1d2e; }
        .subj-card-icon { color: #0891b2; font-size: 1rem; }

        /* Form */
        .subj-form-body { padding: 1.5rem; }
        .subj-form-row { display: flex; gap: 1rem; flex-wrap: wrap; }
        .subj-field { display: flex; flex-direction: column; gap: 0.375rem; flex: 1; min-width: 160px; }
        .subj-label { font-size: 0.75rem; font-weight: 600; color: #475569; text-transform: uppercase; letter-spacing: 0.05em; }
        .subj-input, .subj-select {
          padding: 0.625rem 0.875rem; border: 1.5px solid #e2e8f0;
          border-radius: 10px; font-size: 0.875rem; font-family: 'Sora', sans-serif;
          color: #1a1d2e; background: #f8fafc; transition: all 0.2s; outline: none;
        }
        .subj-input:focus, .subj-select:focus {
          border-color: #0891b2; background: white; box-shadow: 0 0 0 3px rgba(8,145,178,0.1);
        }
        .subj-input::placeholder { color: #94a3b8; }
        .subj-btn-submit {
          padding: 0.625rem 1.5rem; background: #0891b2; color: white;
          border: none; border-radius: 10px; font-family: 'Sora', sans-serif;
          font-size: 0.875rem; font-weight: 600; cursor: pointer; transition: all 0.2s;
          display: flex; align-items: center; gap: 0.5rem; white-space: nowrap; align-self: flex-end;
          height: fit-content;
        }
        .subj-btn-submit:hover:not(:disabled) {
          background: #0e7490; transform: translateY(-1px); box-shadow: 0 4px 12px rgba(8,145,178,0.35);
        }
        .subj-btn-submit:disabled { opacity: 0.65; cursor: not-allowed; }

        /* Toolbar */
        .subj-toolbar {
          padding: 1rem 1.5rem; border-bottom: 1px solid #f1f5f9;
          display: flex; align-items: center; justify-content: space-between; gap: 1rem; flex-wrap: wrap;
        }
        .subj-search-wrap { position: relative; flex: 1; min-width: 160px; max-width: 300px; }
        .subj-search-icon {
          position: absolute; left: 0.75rem; top: 50%; transform: translateY(-50%);
          color: #94a3b8; font-size: 0.875rem; pointer-events: none;
        }
        .subj-search-input {
          width: 100%; padding: 0.5rem 0.75rem 0.5rem 2.25rem;
          border: 1.5px solid #e2e8f0; border-radius: 8px;
          font-family: 'Sora', sans-serif; font-size: 0.875rem;
          color: #1a1d2e; background: #f8fafc; outline: none; transition: all 0.2s;
        }
        .subj-search-input:focus { border-color: #0891b2; background: white; box-shadow: 0 0 0 3px rgba(8,145,178,0.1); }
        .subj-count-badge {
          font-size: 0.75rem; font-weight: 600; color: #64748b;
          background: #f1f5f9; padding: 0.25rem 0.75rem; border-radius: 99px;
        }

        /* Table */
        .subj-table-wrap { overflow-x: auto; }
        .subj-table { width: 100%; border-collapse: collapse; }
        .subj-table thead tr { background: #f8fafc; }
        .subj-table th {
          padding: 0.75rem 1.25rem; text-align: left;
          font-size: 0.7rem; font-weight: 700; color: #64748b;
          text-transform: uppercase; letter-spacing: 0.08em;
          border-bottom: 1px solid #e2e8f0; white-space: nowrap;
        }
        .subj-table tbody tr { border-bottom: 1px solid #f1f5f9; transition: background 0.15s; }
        .subj-table tbody tr:last-child { border-bottom: none; }
        .subj-table tbody tr:hover { background: #f8fafc; }
        .subj-table td { padding: 0.875rem 1.25rem; font-size: 0.875rem; vertical-align: middle; }

        /* Subject cell */
        .subj-cell { display: flex; align-items: center; gap: 0.75rem; }
        .subj-avatar {
          width: 34px; height: 34px; border-radius: 10px;
          display: flex; align-items: center; justify-content: center;
          font-size: 0.7rem; font-weight: 700; color: white; flex-shrink: 0;
        }
        .subj-name { font-weight: 600; color: #1a1d2e; }
        .subj-class-badge {
          font-size: 0.75rem; font-weight: 600;
          background: #ecfeff; color: #0e7490;
          padding: 0.25rem 0.625rem; border-radius: 6px; border: 1px solid #a5f3fc;
        }
        .subj-num-badge {
          font-family: 'JetBrains Mono', monospace;
          font-size: 0.75rem; font-weight: 500;
          background: #f0fdf4; color: #166534;
          padding: 0.25rem 0.625rem; border-radius: 6px;
        }

        /* Delete btn */
        .subj-btn-delete {
          padding: 0.375rem 0.75rem; background: transparent;
          border: 1.5px solid #fca5a5; color: #dc2626;
          border-radius: 8px; font-size: 0.8rem; font-weight: 600;
          font-family: 'Sora', sans-serif; cursor: pointer; transition: all 0.2s;
          display: flex; align-items: center; gap: 0.375rem;
        }
        .subj-btn-delete:hover { background: #fef2f2; border-color: #dc2626; transform: translateY(-1px); }

        /* Empty */
        .subj-empty { padding: 3.5rem 1.5rem; text-align: center; color: #94a3b8; }
        .subj-empty-icon { font-size: 2.5rem; margin-bottom: 0.75rem; opacity: 0.5; }
        .subj-empty-text { font-size: 0.9rem; font-weight: 500; }

        /* Loading */
        .subj-loading { padding: 3rem; text-align: center; }
        .subj-spinner {
          width: 36px; height: 36px; border: 3px solid #e2e8f0;
          border-top-color: #0891b2; border-radius: 50%;
          animation: subjSpin 0.75s linear infinite; margin: 0 auto 0.75rem;
        }
        @keyframes subjSpin { to { transform: rotate(360deg); } }

        /* Modal */
        .subj-overlay {
          position: fixed; inset: 0; background: rgba(15,23,42,0.5);
          display: flex; align-items: center; justify-content: center;
          z-index: 999; backdrop-filter: blur(4px);
          animation: subjFadeIn 0.2s ease;
        }
        @keyframes subjFadeIn { from { opacity: 0; } to { opacity: 1; } }
        .subj-modal {
          background: white; border-radius: 16px; padding: 2rem;
          max-width: 380px; width: 90%; box-shadow: 0 20px 60px rgba(0,0,0,0.2);
          animation: subjPopIn 0.2s ease;
        }
        @keyframes subjPopIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
        .subj-modal-icon { font-size: 2rem; margin-bottom: 0.75rem; }
        .subj-modal-title { font-size: 1.1rem; font-weight: 700; color: #1a1d2e; margin-bottom: 0.5rem; }
        .subj-modal-text { font-size: 0.875rem; color: #64748b; line-height: 1.5; margin-bottom: 1.5rem; }
        .subj-modal-actions { display: flex; gap: 0.75rem; }
        .subj-btn-cancel {
          flex: 1; padding: 0.625rem; border: 1.5px solid #e2e8f0; background: white;
          color: #475569; border-radius: 10px; font-family: 'Sora', sans-serif;
          font-size: 0.875rem; font-weight: 600; cursor: pointer; transition: all 0.2s;
        }
        .subj-btn-cancel:hover { background: #f8fafc; }
        .subj-btn-danger {
          flex: 1; padding: 0.625rem; border: none; background: #dc2626;
          color: white; border-radius: 10px; font-family: 'Sora', sans-serif;
          font-size: 0.875rem; font-weight: 600; cursor: pointer; transition: all 0.2s;
        }
        .subj-btn-danger:hover { background: #b91c1c; }
      `}</style>

      <div className="subj-root">

        {/* Toast */}
        {toast && (
          <div className={`subj-toast ${toast.type}`}>
            <span>{toast.type === "success" ? "✓" : "✕"}</span>
            {toast.message}
          </div>
        )}

        {/* Delete Modal */}
        {deleteConfirm && (
          <div className="subj-overlay">
            <div className="subj-modal">
              <div className="subj-modal-icon">🗑️</div>
              <div className="subj-modal-title">Remove Subject?</div>
              <div className="subj-modal-text">
                This will permanently delete <strong>{deleteConfirm.name}</strong>. Teachers assigned to this subject may be affected.
              </div>
              <div className="subj-modal-actions">
                <button className="subj-btn-cancel" onClick={() => setDeleteConfirm(null)}>Cancel</button>
                <button className="subj-btn-danger" onClick={() => deleteSubject(deleteConfirm.id)}>Delete</button>
              </div>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="subj-page-header">
          <div className="subj-page-title">
            <div className="subj-title-icon">📚</div>
            <div>
              Subjects
              <div className="subj-page-subtitle">Manage subjects and their class assignments</div>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="subj-stats-row">
          <div className="subj-stat-card">
            <div className="subj-stat-icon" style={{ background: "#ecfeff" }}>📚</div>
            <div>
              <div className="subj-stat-label">Total Subjects</div>
              <div className="subj-stat-value">{subjects.length}</div>
            </div>
          </div>
          <div className="subj-stat-card">
            <div className="subj-stat-icon" style={{ background: "#fff7ed" }}>🏫</div>
            <div>
              <div className="subj-stat-label">Classes Covered</div>
              <div className="subj-stat-value">{uniqueClasses.length}</div>
            </div>
          </div>
          <div className="subj-stat-card">
            <div className="subj-stat-icon" style={{ background: "#f0fdf4" }}>🗂️</div>
            <div>
              <div className="subj-stat-label">Available Classes</div>
              <div className="subj-stat-value">{classes.length}</div>
            </div>
          </div>
        </div>

        {/* Add Subject Card */}
        <div className="subj-card">
          <div className="subj-card-header">
            <span className="subj-card-icon">➕</span>
            <span className="subj-card-title">Add New Subject</span>
          </div>
          <div className="subj-form-body">
            <form onSubmit={createSubject}>
              <div className="subj-form-row">
                <div className="subj-field">
                  <label className="subj-label">Subject Name</label>
                  <input
                    className="subj-input"
                    name="name"
                    value={form.name}
                    onChange={handleChange}
                    placeholder="e.g. Mathematics"
                    required
                  />
                </div>
                <div className="subj-field">
                  <label className="subj-label">Class</label>
                  <select
                    className="subj-select"
                    name="school_class"
                    value={form.school_class}
                    onChange={handleChange}
                    required
                  >
                    <option value="">Select Class</option>
                    {classes.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <button className="subj-btn-submit" type="submit" disabled={submitting}>
                  {submitting
                    ? <><span className="subj-spinner" style={{ width: 16, height: 16, borderWidth: 2, margin: 0 }} /> Adding...</>
                    : <><span>+</span> Add Subject</>
                  }
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Subjects Table Card */}
        <div className="subj-card">
          <div className="subj-toolbar">
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <span style={{ color: "#0891b2" }}>📋</span>
              <span className="subj-card-title">All Subjects</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
              <div className="subj-search-wrap">
                <span className="subj-search-icon">🔍</span>
                <input
                  className="subj-search-input"
                  placeholder="Search subjects..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <span className="subj-count-badge">{filtered.length} of {subjects.length}</span>
            </div>
          </div>

          {loading ? (
            <div className="subj-loading">
              <div className="subj-spinner" />
              <div style={{ color: "#94a3b8", fontSize: "0.875rem" }}>Loading subjects...</div>
            </div>
          ) : (
            <div className="subj-table-wrap">
              <table className="subj-table">
                <thead>
                  <tr>
                    <th>Subject</th>
                    <th>Class</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={3}>
                        <div className="subj-empty">
                          <div className="subj-empty-icon">📚</div>
                          <div className="subj-empty-text">
                            {search ? "No subjects match your search" : "No subjects yet — add one above"}
                          </div>
                        </div>
                      </td>
                    </tr>
                  ) : filtered.map((s, i) => (
                    <tr key={s.id}>
                      <td>
                        <div className="subj-cell">
                          <div
                            className="subj-avatar"
                            style={{ background: getColor(s.name) }}
                          >
                            {getInitials(s.name)}
                          </div>
                          <span className="subj-name">{s.name}</span>
                        </div>
                      </td>
                      <td>
                        <span className="subj-class-badge">{s.class_name}</span>
                      </td>
                      <td>
                        <button
                          className="subj-btn-delete"
                          onClick={() => setDeleteConfirm({ id: s.id, name: s.name })}
                        >
                          🗑 Remove
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

export default Subjects;