import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  FaSearch,
  FaSync,
  FaEllipsisV,
  FaTimes,
  FaCheckCircle,
  FaBan,
  FaPauseCircle,
  FaPlayCircle,
  FaArchive,
  FaTrashRestore,
  FaKey,
  FaChevronLeft,
  FaChevronRight,
  FaExclamationTriangle,
  FaUserCircle,
} from "react-icons/fa";

// ── Status badge ─────────────────────────────────────────────────────────
const STATUS_STYLES = {
  active:    { bg: "bg-emerald-50", text: "text-emerald-700", dot: "#10b981", label: "Active" },
  inactive:  { bg: "bg-slate-100",  text: "text-slate-600",   dot: "#94a3b8", label: "Inactive" },
  suspended: { bg: "bg-amber-50",   text: "text-amber-700",   dot: "#f59e0b", label: "Suspended" },
  archived:  { bg: "bg-red-50",     text: "text-red-600",     dot: "#ef4444", label: "Archived" },
};

export const StatusBadge = ({ status }) => {
  const s = STATUS_STYLES[status] || STATUS_STYLES.inactive;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold ${s.bg} ${s.text}`}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: s.dot }} />
      {s.label}
    </span>
  );
};

// ── Toast ────────────────────────────────────────────────────────────────
const Toast = ({ toast, onDismiss }) => {
  useEffect(() => {
    const t = setTimeout(() => onDismiss(toast.id), 3500);
    return () => clearTimeout(t);
  }, [toast.id, onDismiss]);

  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg text-sm font-semibold animate-fade-in-up ${
        toast.type === "error" ? "bg-red-600 text-white" : "bg-slate-900 text-white"
      }`}
    >
      {toast.type === "error" ? <FaExclamationTriangle /> : <FaCheckCircle />}
      {toast.message}
      <button onClick={() => onDismiss(toast.id)} className="ml-2 opacity-70 hover:opacity-100">
        <FaTimes className="text-xs" />
      </button>
    </div>
  );
};

const ToastStack = ({ toasts, onDismiss }) => (
  <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 items-end">
    {toasts.map((t) => (
      <Toast key={t.id} toast={t} onDismiss={onDismiss} />
    ))}
  </div>
);

// ── Confirm dialog ───────────────────────────────────────────────────────
const ConfirmDialog = ({ open, title, message, confirmLabel, danger, onConfirm, onCancel, busy }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 animate-fade-in-up">
        <div className="flex items-start gap-3 mb-4">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${danger ? "bg-red-50 text-red-600" : "bg-indigo-50 text-indigo-600"}`}>
            <FaExclamationTriangle />
          </div>
          <div>
            <p className="font-black text-slate-800">{title}</p>
            <p className="text-sm text-slate-500 mt-1">{message}</p>
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-2">
          <button
            onClick={onCancel}
            disabled={busy}
            className="px-4 py-2 text-sm font-bold text-slate-600 rounded-xl hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={busy}
            className={`px-4 py-2 text-sm font-bold text-white rounded-xl transition-colors disabled:opacity-50 ${
              danger ? "bg-red-600 hover:bg-red-700" : "bg-indigo-600 hover:bg-indigo-700"
            }`}
          >
            {busy ? "Working…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Row action menu ──────────────────────────────────────────────────────
const ACTION_DEFS = {
  activate:      { label: "Activate",       icon: <FaCheckCircle />,   danger: false },
  deactivate:    { label: "Deactivate",     icon: <FaBan />,           danger: false },
  suspend:       { label: "Suspend",        icon: <FaPauseCircle />,   danger: true  },
  reinstate:     { label: "Reinstate",      icon: <FaPlayCircle />,    danger: false },
  archive:       { label: "Archive",        icon: <FaArchive />,       danger: true  },
  restore:       { label: "Restore",        icon: <FaTrashRestore />,  danger: false },
  resetPassword: { label: "Reset Password", icon: <FaKey />,           danger: false },
};

// Which actions make sense given the person's current account_status.
const actionsForStatus = (status) => {
  switch (status) {
    case "archived":
      return ["restore"];
    case "suspended":
      return ["reinstate", "archive", "resetPassword"];
    case "inactive":
      return ["activate", "suspend", "archive", "resetPassword"];
    case "active":
    default:
      return ["deactivate", "suspend", "archive", "resetPassword"];
  }
};

const RowMenu = ({ status, onAction }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const onClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const available = actionsForStatus(status);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 transition-colors text-slate-500"
      >
        <FaEllipsisV className="text-xs" />
      </button>
      {open && (
        <div className="absolute right-0 mt-1 w-48 bg-white rounded-xl shadow-xl border border-slate-100 py-1.5 z-20 animate-fade-in">
          {available.map((key) => {
            const def = ACTION_DEFS[key];
            return (
              <button
                key={key}
                onClick={() => {
                  setOpen(false);
                  onAction(key);
                }}
                className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-sm font-semibold text-left hover:bg-slate-50 transition-colors ${
                  def.danger ? "text-red-600" : "text-slate-700"
                }`}
              >
                <span className="text-xs">{def.icon}</span>
                {def.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ── Drawer ───────────────────────────────────────────────────────────────
const Drawer = ({ open, onClose, person, rowConfig, renderProfile, onAction }) => {
  if (!open || !person) return null;
  const status = rowConfig.getStatus(person);

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white h-full shadow-2xl overflow-y-auto animate-fade-in-up">
        <div className="sticky top-0 bg-white border-b border-slate-100 px-6 py-5 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white">
              <FaUserCircle className="text-xl" />
            </div>
            <div>
              <p className="font-black text-slate-900">{rowConfig.getName(person)}</p>
              <p className="text-xs text-slate-400 font-semibold">{rowConfig.getSubtitle(person)}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-slate-100 transition-colors">
            <FaTimes className="text-slate-500" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-6">
          <div className="flex items-center justify-between">
            <StatusBadge status={status} />
            <RowMenu status={status} onAction={(key) => onAction(key, person)} />
          </div>

          {renderProfile(person)}
        </div>
      </div>
    </div>
  );
};

const RowSkeleton = ({ cols }) => (
  <tr className="animate-pulse">
    {Array.from({ length: cols }).map((_, i) => (
      <td key={i} className="px-4 py-4">
        <div className="h-3.5 bg-slate-100 rounded-full w-full max-w-[120px]" />
      </td>
    ))}
  </tr>
);

// ── Main shared component ────────────────────────────────────────────────

/**
 * Generic admin management table used by both StudentsAdmin and
 * TeachersAdmin — search, pagination, per-row action menu, detail drawer,
 * confirm dialogs, and toasts are all handled here so each concrete page
 * just supplies data-fetching + column/profile rendering.
 */
const PersonAdminTable = ({
  title,
  subtitle,
  fetchList,
  actions,           // { activate, deactivate, suspend, reinstate, archive, restore, resetPassword }
  rowConfig,         // { getId, getName, getSubtitle, getStatus }
  extraColumns = [], // [{ key, label, render(row) }]
  renderProfile,     // (row) => JSX for the drawer body
  searchPlaceholder = "Search…",
}) => {
  const [rows, setRows] = useState([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [drawerPerson, setDrawerPerson] = useState(null);
  const [confirmState, setConfirmState] = useState(null); // { key, person }
  const [busy, setBusy] = useState(false);
  const [toasts, setToasts] = useState([]);
  const [newPasswordModal, setNewPasswordModal] = useState(null);

  const pushToast = (message, type = "success") => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, message, type }]);
  };
  const dismissToast = (id) => setToasts((t) => t.filter((x) => x.id !== id));

  const load = useCallback(
    async (targetPage = 1, isRefresh = false) => {
      isRefresh ? setRefreshing(true) : setLoading(true);
      setError("");
      try {
        const params = {
          page: targetPage,
          page_size: pageSize,
          search: search || undefined,
          include_archived: showArchived ? "true" : undefined,
        };
        const data = await fetchList(params);
        const results = data.results ?? data;
        setRows(results);
        setCount(data.count ?? results.length);
        setPage(targetPage);
      } catch {
        setError("Failed to load records.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [fetchList, search, showArchived]
  );

  useEffect(() => {
    load(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, showArchived]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setSearch(searchInput);
  };

  const requestAction = (key, person) => {
    if (key === "resetPassword") {
      setConfirmState({ key, person });
      return;
    }
    setConfirmState({ key, person });
  };

  const confirmMessages = {
    activate:      (n) => [`Activate ${n}?`, `${n} will regain access to their account.`],
    deactivate:    (n) => [`Deactivate ${n}?`, `${n} will no longer be able to log in.`],
    suspend:       (n) => [`Suspend ${n}?`, `${n}'s access will be temporarily blocked pending review.`],
    reinstate:     (n) => [`Reinstate ${n}?`, `${n} will regain access to their account.`],
    archive:       (n) => [`Archive ${n}?`, `${n} will be hidden from the default list and lose access. This can be undone via Restore.`],
    restore:       (n) => [`Restore ${n}?`, `${n} will reappear in the default list and regain access.`],
    resetPassword: (n) => [`Reset password for ${n}?`, `A new temporary password will be generated. You'll need to share it with them directly.`],
  };

  const runConfirmed = async () => {
    if (!confirmState) return;
    const { key, person } = confirmState;
    const id = rowConfig.getId(person);
    const name = rowConfig.getName(person);
    setBusy(true);
    try {
      const result = await actions[key](id);
      if (key === "resetPassword" && result?.new_password) {
        setNewPasswordModal({ name, password: result.new_password });
      } else {
        pushToast(result?.detail || `${name} updated successfully.`);
      }
      setConfirmState(null);
      setDrawerPerson(null);
      load(page, true);
    } catch (err) {
      pushToast(err?.response?.data?.detail || "Action failed. Please try again.", "error");
    } finally {
      setBusy(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil(count / pageSize));
  const confirmMsg = confirmState ? confirmMessages[confirmState.key](rowConfig.getName(confirmState.person)) : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-2 h-8 bg-gradient-to-b from-indigo-500 to-purple-500 rounded-full" />
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">{title}</h1>
              <p className="text-sm text-slate-500 font-medium mt-0.5">
                {count.toLocaleString()} {subtitle}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <label className="flex items-center gap-2 text-xs font-bold text-slate-500 bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 shadow-sm cursor-pointer">
              <input
                type="checkbox"
                checked={showArchived}
                onChange={(e) => setShowArchived(e.target.checked)}
                className="rounded accent-indigo-600"
              />
              Show archived
            </label>
            <button
              onClick={() => load(page, true)}
              disabled={refreshing}
              className="w-11 h-11 flex items-center justify-center bg-white border border-slate-200 rounded-xl shadow-sm hover:shadow-md transition-all disabled:opacity-50"
            >
              <FaSync className={`text-xs text-slate-600 ${refreshing ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        {/* Search */}
        <form onSubmit={handleSearchSubmit} className="relative">
          <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder={searchPlaceholder}
            className="w-full rounded-2xl border border-slate-200 bg-white pl-11 pr-24 py-3.5 text-sm font-medium shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500"
          />
          <button
            type="submit"
            className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-bold text-white bg-slate-900 rounded-xl px-4 py-2 hover:bg-slate-800 transition-colors"
          >
            Search
          </button>
        </form>

        {error && (
          <div className="flex items-center gap-3 bg-red-50 border border-red-100 text-red-700 rounded-2xl px-5 py-4 text-sm font-semibold">
            <FaExclamationTriangle /> {error}
          </div>
        )}

        {/* Table */}
        <div className="bg-white rounded-3xl border border-slate-100 shadow-lg shadow-slate-200/50 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/60">
                  <th className="px-4 py-3.5 text-left text-xs font-black text-slate-400 uppercase tracking-wider">Name</th>
                  {extraColumns.map((c) => (
                    <th key={c.key} className="px-4 py-3.5 text-left text-xs font-black text-slate-400 uppercase tracking-wider">
                      {c.label}
                    </th>
                  ))}
                  <th className="px-4 py-3.5 text-left text-xs font-black text-slate-400 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {loading ? (
                  Array.from({ length: 8 }).map((_, i) => <RowSkeleton key={i} cols={extraColumns.length + 3} />)
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan={extraColumns.length + 3} className="px-4 py-16 text-center text-slate-400 font-medium">
                      No records found.
                    </td>
                  </tr>
                ) : (
                  rows.map((row) => {
                    const id = rowConfig.getId(row);
                    return (
                      <tr key={id} className="hover:bg-slate-50/60 transition-colors">
                        <td
                          className="px-4 py-3.5 cursor-pointer"
                          onClick={() => setDrawerPerson(row)}
                        >
                          <p className="font-bold text-slate-800">{rowConfig.getName(row)}</p>
                          <p className="text-xs text-slate-400">{rowConfig.getSubtitle(row)}</p>
                        </td>
                        {extraColumns.map((c) => (
                          <td key={c.key} className="px-4 py-3.5 text-slate-600">
                            {c.render(row)}
                          </td>
                        ))}
                        <td className="px-4 py-3.5">
                          <StatusBadge status={rowConfig.getStatus(row)} />
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <RowMenu status={rowConfig.getStatus(row)} onAction={(key) => requestAction(key, row)} />
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between px-5 py-4 border-t border-slate-100">
            <p className="text-xs font-semibold text-slate-500">
              Page {page} of {totalPages}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => load(page - 1)}
                disabled={page <= 1 || loading}
                className="w-9 h-9 flex items-center justify-center rounded-xl border border-slate-200 disabled:opacity-30 hover:bg-slate-50 transition-colors"
              >
                <FaChevronLeft className="text-xs text-slate-600" />
              </button>
              <button
                onClick={() => load(page + 1)}
                disabled={page >= totalPages || loading}
                className="w-9 h-9 flex items-center justify-center rounded-xl border border-slate-200 disabled:opacity-30 hover:bg-slate-50 transition-colors"
              >
                <FaChevronRight className="text-xs text-slate-600" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Drawer */}
      <Drawer
        open={!!drawerPerson}
        onClose={() => setDrawerPerson(null)}
        person={drawerPerson}
        rowConfig={rowConfig}
        renderProfile={renderProfile}
        onAction={requestAction}
      />

      {/* Confirm dialog */}
      <ConfirmDialog
        open={!!confirmState}
        title={confirmMsg?.[0]}
        message={confirmMsg?.[1]}
        confirmLabel={confirmState ? ACTION_DEFS[confirmState.key].label : ""}
        danger={confirmState ? ACTION_DEFS[confirmState.key].danger : false}
        busy={busy}
        onConfirm={runConfirmed}
        onCancel={() => setConfirmState(null)}
      />

      {/* New password reveal modal */}
      {newPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 animate-fade-in-up">
            <p className="font-black text-slate-800 mb-1">Password reset for {newPasswordModal.name}</p>
            <p className="text-sm text-slate-500 mb-4">
              Share this temporary password with them directly — it will not be shown again.
            </p>
            <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-mono text-sm font-bold text-slate-800 select-all">
              {newPasswordModal.password}
            </div>
            <button
              onClick={() => setNewPasswordModal(null)}
              className="w-full mt-4 py-3 bg-slate-900 text-white text-sm font-bold rounded-xl hover:bg-slate-800 transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      )}

      <ToastStack toasts={toasts} onDismiss={dismissToast} />

      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fade-in { animation: fadeIn 0.2s ease both; }
        .animate-fade-in-up { animation: fadeInUp 0.25s ease both; }
      `}</style>
    </div>
  );
};

export default PersonAdminTable;