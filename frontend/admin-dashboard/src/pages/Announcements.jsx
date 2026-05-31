import { useEffect, useState, useCallback } from "react";
import API from "../services/api";

// ─────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────

const PRIORITY_OPTIONS = [
  { value: "normal",   label: "Normal"   },
  { value: "urgent",   label: "Urgent"   },
  { value: "critical", label: "Critical" },
];

const AUDIENCE_OPTIONS = [
  { value: "all",      label: "Everyone"       },
  { value: "students", label: "Students Only"  },
  { value: "teachers", label: "Teachers Only"  },
  { value: "parents",  label: "Parents Only"   },
];

const PRIORITY_STYLES = {
  normal:   {
    pill:   "bg-gray-100    text-gray-600   ring-gray-200",
    border: "border-l-gray-300",
    icon:   "📢",
  },
  urgent:   {
    pill:   "bg-amber-50   text-amber-700  ring-amber-200",
    border: "border-l-amber-400",
    icon:   "⚠️",
  },
  critical: {
    pill:   "bg-red-50     text-red-700    ring-red-200",
    border: "border-l-red-500",
    icon:   "🚨",
  },
};

const AUDIENCE_STYLES = {
  all:      "bg-blue-50   text-blue-700   ring-blue-200",
  students: "bg-green-50  text-green-700  ring-green-200",
  teachers: "bg-violet-50 text-violet-700 ring-violet-200",
  parents:  "bg-orange-50 text-orange-700 ring-orange-200",
};

const EMPTY_FORM = {
  title:      "",
  message:    "",
  priority:   "normal",
  audience:   "all",
  is_pinned:  false,
  expires_at: "",
};

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

const formatDate = (iso) => {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric", month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
};

const timeAgo = (iso) => {
  const diff = Date.now() - new Date(iso).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(mins  / 60);
  const days  = Math.floor(hours / 24);
  if (mins  < 1)   return "just now";
  if (mins  < 60)  return `${mins}m ago`;
  if (hours < 24)  return `${hours}h ago`;
  if (days  < 30)  return `${days}d ago`;
  return formatDate(iso);
};

// ─────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────

const Toast = ({ message, type, onDismiss }) => {
  if (!message) return null;
  const s = type === "error"
    ? "bg-red-50 border-red-200 text-red-700"
    : "bg-emerald-50 border-emerald-200 text-emerald-700";
  return (
    <div className={`mb-4 flex items-center justify-between px-4 py-3 rounded-xl border text-sm ${s}`}>
      <span>{message}</span>
      <button onClick={onDismiss} className="ml-4 opacity-50 hover:opacity-100 text-lg leading-none">×</button>
    </div>
  );
};

const StatCard = ({ label, value, color = "text-blue-700" }) => (
  <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-5 py-4 text-center">
    <p className={`text-2xl font-bold ${color}`}>{value}</p>
    <p className="text-xs text-gray-400 mt-1">{label}</p>
  </div>
);

const PriorityPill = ({ priority }) => {
  const st = PRIORITY_STYLES[priority] || PRIORITY_STYLES.normal;
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ring-1 ${st.pill}`}>
      {st.icon} {priority.charAt(0).toUpperCase() + priority.slice(1)}
    </span>
  );
};

const AudiencePill = ({ audience, label }) => (
  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ring-1 ${AUDIENCE_STYLES[audience] || AUDIENCE_STYLES.all}`}>
    {label || audience}
  </span>
);

const Field = ({ label, required, children }) => (
  <div className="flex flex-col gap-1">
    <label className="text-xs font-medium text-gray-400">
      {label}{required && <span className="text-red-400 ml-0.5">*</span>}
    </label>
    {children}
  </div>
);

const inputCls =
  "border border-gray-200 bg-gray-50 px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:bg-white transition-colors placeholder-gray-300";

// ─────────────────────────────────────────────
// Announcement card
// ─────────────────────────────────────────────

const AnnouncementCard = ({ ann, onEdit, onDelete, onTogglePin }) => {
  const [expanded, setExpanded] = useState(false);
  const st = PRIORITY_STYLES[ann.priority] || PRIORITY_STYLES.normal;
  const isLong = ann.message.length > 180;

  return (
    <div className={`bg-white rounded-xl border border-gray-100 shadow-sm border-l-4 ${st.border} transition-shadow hover:shadow-md ${ann.is_expired ? "opacity-60" : ""}`}>
      <div className="px-5 py-4">

        {/* Top row */}
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="flex items-center gap-2 flex-wrap">
            {ann.is_pinned && (
              <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full ring-1 ring-blue-200">
                📌 Pinned
              </span>
            )}
            <PriorityPill priority={ann.priority} />
            <AudiencePill audience={ann.audience} label={ann.audience_label} />
            {ann.is_expired && (
              <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                Expired
              </span>
            )}
          </div>
          <span className="text-xs text-gray-400 flex-shrink-0">{timeAgo(ann.created_at)}</span>
        </div>

        {/* Title */}
        <h3 className="font-semibold text-gray-800 text-base mb-1">{ann.title}</h3>

        {/* Message */}
        <p className={`text-sm text-gray-600 leading-relaxed ${!expanded && isLong ? "line-clamp-3" : ""}`}>
          {ann.message}
        </p>
        {isLong && (
          <button
            onClick={() => setExpanded((v) => !v)}
            className="text-xs text-blue-500 hover:text-blue-700 mt-1 font-medium"
          >
            {expanded ? "Show less" : "Read more"}
          </button>
        )}

        {/* Expiry */}
        {ann.expires_at && (
          <p className="text-xs text-gray-400 mt-2">
            Expires: {formatDate(ann.expires_at)}
          </p>
        )}

        {/* Updated indicator */}
        {ann.updated_at !== ann.created_at && (
          <p className="text-xs text-gray-300 mt-1">
            Edited {timeAgo(ann.updated_at)}
          </p>
        )}
      </div>

      {/* Action bar */}
      <div className="px-5 py-3 border-t border-gray-50 flex items-center gap-2 flex-wrap">
        <button
          onClick={() => onTogglePin(ann)}
          className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors border ${
            ann.is_pinned
              ? "bg-blue-50 text-blue-600 border-blue-100 hover:bg-blue-100"
              : "bg-gray-50 text-gray-500 border-gray-100 hover:bg-gray-100"
          }`}
        >
          {ann.is_pinned ? "📌 Unpin" : "📌 Pin"}
        </button>
        <button
          onClick={() => onEdit(ann)}
          className="text-xs px-3 py-1.5 rounded-lg font-medium bg-blue-50 text-blue-600 border border-blue-100 hover:bg-blue-600 hover:text-white transition-colors"
        >
          Edit
        </button>
        <button
          onClick={() => onDelete(ann.id)}
          className="text-xs px-3 py-1.5 rounded-lg font-medium bg-red-50 text-red-600 border border-red-100 hover:bg-red-600 hover:text-white transition-colors"
        >
          Delete
        </button>
        <span className="ml-auto text-xs text-gray-300">
          {formatDate(ann.created_at)}
        </span>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────
// Create / Edit modal
// ─────────────────────────────────────────────

const AnnouncementModal = ({ initial, onClose, onSaved, setError }) => {
  const isEdit = !!initial?.id;
  const [form, setForm]       = useState(
    initial
      ? {
          title:      initial.title,
          message:    initial.message,
          priority:   initial.priority,
          audience:   initial.audience,
          is_pinned:  initial.is_pinned,
          expires_at: initial.expires_at
            ? initial.expires_at.slice(0, 16)   // trim to datetime-local format
            : "",
        }
      : EMPTY_FORM
  );
  const [saving, setSaving] = useState(false);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((p) => ({ ...p, [name]: type === "checkbox" ? checked : value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    const payload = {
      ...form,
      expires_at: form.expires_at || null,
    };
    try {
      let saved;
      if (isEdit) {
        const res = await API.put(`/announcements/${initial.id}/`, payload);
        saved = res.data;
      } else {
        const res = await API.post("/announcements/", payload);
        saved = res.data;
      }
      onSaved(saved, isEdit);
      onClose();
    } catch (err) {
      const detail =
        err.response?.data?.detail ||
        Object.values(err.response?.data || {}).flat().join(" ") ||
        "Error saving announcement.";
      setError(detail);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
      <div
        className="relative z-50 bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center">
          <h3 className="font-bold text-gray-800">
            {isEdit ? "Edit Announcement" : "New Announcement"}
          </h3>
          <button onClick={onClose}
            className="w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 text-sm transition-colors">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">

          <Field label="Title" required>
            <input name="title" value={form.title} onChange={handleChange}
              required placeholder="Announcement title…" className={inputCls} />
          </Field>

          <Field label="Message" required>
            <textarea name="message" value={form.message} onChange={handleChange}
              required rows={5} placeholder="Write your announcement here…"
              className={inputCls + " resize-none"} />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Priority">
              <select name="priority" value={form.priority} onChange={handleChange} className={inputCls}>
                {PRIORITY_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </Field>

            <Field label="Audience">
              <select name="audience" value={form.audience} onChange={handleChange} className={inputCls}>
                {AUDIENCE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </Field>
          </div>

          <Field label="Expiry Date / Time (optional)">
            <input name="expires_at" type="datetime-local" value={form.expires_at}
              onChange={handleChange} className={inputCls} />
          </Field>

          <label className="flex items-center gap-3 cursor-pointer select-none">
            <div className={`w-10 h-5 rounded-full transition-colors relative ${form.is_pinned ? "bg-blue-600" : "bg-gray-200"}`}>
              <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${form.is_pinned ? "left-5" : "left-0.5"}`} />
            </div>
            <input type="checkbox" name="is_pinned" checked={form.is_pinned}
              onChange={handleChange} className="sr-only" />
            <span className="text-sm text-gray-600 font-medium">
              Pin this announcement
            </span>
          </label>

          <div className="flex gap-3 pt-2 border-t border-gray-100">
            <button type="submit" disabled={saving}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-xl text-sm font-medium disabled:opacity-50 transition-colors shadow-sm">
              {saving ? "Saving…" : isEdit ? "Save Changes" : "Post Announcement"}
            </button>
            <button type="button" onClick={onClose}
              className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-600 py-2.5 rounded-xl text-sm font-medium transition-colors">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────

const Announcements = () => {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading]             = useState(true);
  const [error, setError]                 = useState("");
  const [success, setSuccess]             = useState("");

  const [showModal, setShowModal]       = useState(false);
  const [editTarget, setEditTarget]     = useState(null);

  // Filters
  const [filterPriority, setFilterPriority] = useState("all");
  const [filterAudience, setFilterAudience] = useState("all");
  const [search, setSearch]                 = useState("");
  const [showExpired, setShowExpired]       = useState(false);

  // ── Data ──────────────────────────────────

  const loadAnnouncements = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (showExpired) params.set("include_expired", "true");
      const res = await API.get(`/announcements/?${params}`);
      setAnnouncements(res.data.results ?? res.data);
    } catch {
      setError("Failed to load announcements.");
    } finally {
      setLoading(false);
    }
  }, [showExpired]);

  useEffect(() => { loadAnnouncements(); }, [loadAnnouncements]);

  // ── Handlers ──────────────────────────────

  const handleSaved = (saved, isEdit) => {
    if (isEdit) {
      setAnnouncements((prev) => prev.map((a) => a.id === saved.id ? saved : a));
    } else {
      setAnnouncements((prev) => [saved, ...prev]);
    }
    setSuccess(isEdit ? "Announcement updated." : "Announcement posted.");
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this announcement?")) return;
    setError(""); setSuccess("");
    try {
      await API.delete(`/announcements/${id}/`);
      setAnnouncements((prev) => prev.filter((a) => a.id !== id));
      setSuccess("Announcement deleted.");
    } catch {
      setError("Error deleting announcement.");
    }
  };

  const handleTogglePin = async (ann) => {
    try {
      const res = await API.patch(`/announcements/${ann.id}/pin/`);
      setAnnouncements((prev) => prev.map((a) => a.id === ann.id ? res.data : a));
    } catch {
      setError("Error updating pin status.");
    }
  };

  // ── Derived ────────────────────────────────

  const filtered = announcements.filter((a) => {
    const matchSearch   = !search || a.title.toLowerCase().includes(search.toLowerCase()) ||
                          a.message.toLowerCase().includes(search.toLowerCase());
    const matchPriority = filterPriority === "all" || a.priority === filterPriority;
    const matchAudience = filterAudience === "all" || a.audience === filterAudience;
    return matchSearch && matchPriority && matchAudience;
  });

  const pinned   = filtered.filter((a) => a.is_pinned);
  const unpinned = filtered.filter((a) => !a.is_pinned);

  const stats = {
    total:    announcements.length,
    pinned:   announcements.filter((a) => a.is_pinned).length,
    urgent:   announcements.filter((a) => a.priority === "urgent").length,
    critical: announcements.filter((a) => a.priority === "critical").length,
  };

  // ─────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────

  return (
    <div className="p-6 max-w-4xl mx-auto">

      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Announcements</h2>
          <p className="text-sm text-gray-400 mt-0.5">Post and manage school-wide notices</p>
        </div>
        <button
          onClick={() => { setEditTarget(null); setShowModal(true); }}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-sm font-medium shadow-sm transition-colors"
        >
          + New Announcement
        </button>
      </div>

      <Toast message={error}   type="error"   onDismiss={() => setError("")}   />
      <Toast message={success} type="success" onDismiss={() => setSuccess("")} />

      {/* ── Stat cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <StatCard label="Total"    value={stats.total}    color="text-blue-700"  />
        <StatCard label="Pinned"   value={stats.pinned}   color="text-blue-500"  />
        <StatCard label="Urgent"   value={stats.urgent}   color="text-amber-600" />
        <StatCard label="Critical" value={stats.critical} color="text-red-600"   />
      </div>

      {/* ── Filters ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-3 mb-5 flex gap-3 flex-wrap items-end">
        <div className="flex-1 min-w-[160px]">
          <label className="text-xs font-medium text-gray-400 block mb-1">Search</label>
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search announcements…" className={inputCls + " w-full"} />
        </div>

        <div>
          <label className="text-xs font-medium text-gray-400 block mb-1">Priority</label>
          <select value={filterPriority} onChange={(e) => setFilterPriority(e.target.value)}
            className={inputCls}>
            <option value="all">All priorities</option>
            {PRIORITY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>

        <div>
          <label className="text-xs font-medium text-gray-400 block mb-1">Audience</label>
          <select value={filterAudience} onChange={(e) => setFilterAudience(e.target.value)}
            className={inputCls}>
            <option value="all">All audiences</option>
            {AUDIENCE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>

        <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-500 self-end pb-2">
          <input type="checkbox" checked={showExpired}
            onChange={(e) => setShowExpired(e.target.checked)}
            className="rounded border-gray-300 text-blue-600" />
          Show expired
        </label>

        {(search || filterPriority !== "all" || filterAudience !== "all") && (
          <button
            onClick={() => { setSearch(""); setFilterPriority("all"); setFilterAudience("all"); }}
            className="text-xs text-blue-500 hover:text-blue-700 px-3 py-2 rounded-lg hover:bg-blue-50 transition-colors self-end"
          >
            Clear
          </button>
        )}

        <span className="text-xs text-gray-400 ml-auto self-end pb-2">
          {filtered.length} shown
        </span>
      </div>

      {/* ── Content ── */}
      {loading ? (
        <div className="text-center py-14 text-gray-400">
          <p className="text-3xl mb-2">📢</p>
          <p className="text-sm">Loading announcements…</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-14 text-gray-400 bg-white rounded-2xl border border-gray-100 shadow-sm">
          <p className="text-3xl mb-2">📭</p>
          <p className="text-sm">No announcements match your filters.</p>
        </div>
      ) : (
        <div className="space-y-3">

          {/* Pinned section */}
          {pinned.length > 0 && (
            <>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest px-1">
                📌 Pinned
              </p>
              {pinned.map((ann) => (
                <AnnouncementCard
                  key={ann.id}
                  ann={ann}
                  onEdit={(a) => { setEditTarget(a); setShowModal(true); }}
                  onDelete={handleDelete}
                  onTogglePin={handleTogglePin}
                />
              ))}
              {unpinned.length > 0 && (
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest px-1 pt-2">
                  Recent
                </p>
              )}
            </>
          )}

          {/* Unpinned */}
          {unpinned.map((ann) => (
            <AnnouncementCard
              key={ann.id}
              ann={ann}
              onEdit={(a) => { setEditTarget(a); setShowModal(true); }}
              onDelete={handleDelete}
              onTogglePin={handleTogglePin}
            />
          ))}
        </div>
      )}

      {/* ── Modal ── */}
      {showModal && (
        <AnnouncementModal
          initial={editTarget}
          onClose={() => { setShowModal(false); setEditTarget(null); }}
          onSaved={handleSaved}
          setError={setError}
        />
      )}
    </div>
  );
};

export default Announcements;