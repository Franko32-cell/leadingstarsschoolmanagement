import { useEffect, useState, useCallback } from "react";
import API from "../services/api";

/* ─── Constants ─────────────────────────────────────────────────────────── */
const TERMS = [
  { value: "",      label: "All Terms" },
  { value: "term1", label: "Term 1"    },
  { value: "term2", label: "Term 2"    },
  { value: "term3", label: "Term 3"    },
];
const YEARS = [2026, 2025, 2024, 2023, 2022];
const TABS  = [
  { id: "Dashboard",         label: "Dashboard"         },
  { id: "Income Ledger",     label: "Income Ledger"     },
  { id: "Collection Report", label: "Collection"        },
  { id: "Defaulters",        label: "Defaulters"        },
  { id: "Unassigned Fees",   label: "Unassigned"        },
];

const fmt = (n) =>
  `GHS ${Number(n || 0).toLocaleString("en-GH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

/* ─── Small shared components ───────────────────────────────────────────── */

const Toast = ({ msg, type, onDismiss }) => {
  if (!msg) return null;
  const isErr = type === "error";
  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium shadow-sm mb-5 border ${
        isErr
          ? "bg-red-50 border-red-200 text-red-700"
          : "bg-emerald-50 border-emerald-200 text-emerald-700"
      }`}
    >
      <span className="text-base">{isErr ? "⚠" : "✓"}</span>
      <span className="flex-1">{msg}</span>
      <button
        onClick={onDismiss}
        className={`text-lg leading-none opacity-50 hover:opacity-100 transition-opacity ${
          isErr ? "text-red-600" : "text-emerald-600"
        }`}
        aria-label="Dismiss"
      >
        ×
      </button>
    </div>
  );
};

const Spinner = ({ size = "md", className = "" }) => {
  const sizes = { sm: "h-4 w-4", md: "h-5 w-5", lg: "h-8 w-8" };
  return (
    <svg
      className={`animate-spin text-current ${sizes[size]} ${className}`}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
};

const EmptyState = ({ icon, title, subtitle }) => (
  <div className="flex flex-col items-center justify-center py-16 text-center px-4">
    <div className="text-5xl mb-4">{icon}</div>
    <p className="font-semibold text-slate-600 text-base">{title}</p>
    {subtitle && <p className="text-sm text-slate-400 mt-1 max-w-xs">{subtitle}</p>}
  </div>
);

const LoadingOverlay = () => (
  <div className="flex flex-col items-center justify-center py-24 gap-3 text-slate-400">
    <Spinner size="lg" />
    <span className="text-sm">Loading data…</span>
  </div>
);

const Badge = ({ children, color = "slate" }) => {
  const colors = {
    emerald: "bg-emerald-100 text-emerald-800",
    amber:   "bg-amber-100  text-amber-800",
    red:     "bg-red-100    text-red-700",
    blue:    "bg-blue-100   text-blue-700",
    slate:   "bg-slate-100  text-slate-600",
  };
  return (
    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${colors[color]}`}>
      {children}
    </span>
  );
};

const CollectionBar = ({ rate }) => {
  const color =
    rate >= 80 ? "bg-emerald-500" : rate >= 50 ? "bg-amber-400" : "bg-red-500";
  return (
    <div className="flex items-center gap-2 min-w-[100px]">
      <div className="flex-1 bg-slate-200 rounded-full h-2 overflow-hidden">
        <div
          className={`h-2 rounded-full transition-all duration-500 ${color}`}
          style={{ width: `${Math.min(100, rate)}%` }}
        />
      </div>
      <span className="text-xs font-semibold text-slate-600 w-9 text-right tabular-nums">
        {rate}%
      </span>
    </div>
  );
};

/* Stat card — stacks label above value */
const StatCard = ({ label, value, color = "text-slate-800", bg = "bg-white" }) => (
  <div className={`${bg} rounded-2xl border border-slate-200 p-4 shadow-sm`}>
    <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1 leading-tight">{label}</p>
    <p className={`text-xl sm:text-2xl font-bold tracking-tight break-all ${color}`}>{value}</p>
  </div>
);

/* Scrollable table wrapper — key fix for mobile */
const DataTable = ({ headers, children, empty }) => (
  <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
    <div className="overflow-x-auto -webkit-overflow-scrolling-touch">
      <table className="w-full text-sm" style={{ minWidth: "600px" }}>
        <thead>
          <tr className="bg-slate-50 border-b border-slate-200">
            {headers.map(({ label, align = "center" }) => (
              <th
                key={label}
                className={`px-3 py-3 text-xs font-semibold text-slate-400 uppercase tracking-widest whitespace-nowrap ${
                  align === "left" ? "text-left" : "text-center"
                }`}
              >
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">{children}</tbody>
      </table>
      {empty}
    </div>
  </div>
);

const Td = ({ children, align = "center", className = "" }) => (
  <td
    className={`px-3 py-3 ${
      align === "left" ? "text-left" : "text-center"
    } ${className}`}
  >
    {children}
  </td>
);

const StudentCell = ({ name, admissionNumber }) => (
  <Td align="left">
    <p className="font-semibold text-slate-800 leading-tight whitespace-nowrap">{name}</p>
    <p className="text-xs text-slate-400 font-mono mt-0.5">{admissionNumber}</p>
  </Td>
);

/* ─── Mobile-friendly stat row (replaces table rows on small screens) ────── */
const MobileCard = ({ children, highlighted = false }) => (
  <div className={`rounded-xl border p-4 space-y-2 ${highlighted ? "border-red-200 bg-red-50" : "border-slate-200 bg-white"}`}>
    {children}
  </div>
);

const MobileRow = ({ label, children }) => (
  <div className="flex items-center justify-between gap-2 text-sm">
    <span className="text-slate-400 shrink-0">{label}</span>
    <span className="text-right">{children}</span>
  </div>
);

/* ─── Delete Class Fees Modal ────────────────────────────────────────────── */
const DeleteClassFeesModal = ({ classes, onClose, onDeleted }) => {
  const [selectedClass, setSelectedClass] = useState("");
  const [selectedTerm,  setSelectedTerm]  = useState("");
  const [selectedYear,  setSelectedYear]  = useState(String(YEARS[0]));
  const [preview,       setPreview]       = useState(null);
  const [previewLoading,setPreviewLoading]= useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [error,         setError]         = useState("");

  const fetchPreview = async () => {
    if (!selectedClass) return;
    setPreviewLoading(true);
    setError("");
    setPreview(null);
    try {
      const params = [`school_class=${selectedClass}`];
      if (selectedTerm) params.push(`term=${selectedTerm}`);
      if (selectedYear) params.push(`year=${selectedYear}`);
      const r = await API.get(`/fees/delete-preview/?${params.join("&")}`);
      setPreview(r.data);
    } catch {
      setError("Failed to load preview. Please try again.");
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!preview || preview.count === 0) return;
    setDeleteLoading(true);
    setError("");
    try {
      const params = [`school_class=${selectedClass}`];
      if (selectedTerm) params.push(`term=${selectedTerm}`);
      if (selectedYear) params.push(`year=${selectedYear}`);
      const r = await API.delete(`/fees/delete-class-fees/?${params.join("&")}`);
      onDeleted(r.data?.detail || `Deleted ${preview.count} fee record(s).`);
      onClose();
    } catch {
      setError("Failed to delete fees. Please try again.");
    } finally {
      setDeleteLoading(false);
    }
  };

  const className = classes.find((c) => String(c.id) === String(selectedClass))?.name;

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-[2px]"
        onClick={onClose}
        aria-hidden
      />

      {/* Sheet — slides up on mobile, centered modal on desktop */}
      <div className="relative bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl w-full sm:max-w-md p-5 sm:p-7 space-y-5 z-10 max-h-[92dvh] overflow-y-auto">
        {/* Drag handle (mobile only) */}
        <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto sm:hidden" />

        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-slate-900 tracking-tight">Delete class fees</h2>
            <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
              Select filters, preview affected records, then confirm.
            </p>
          </div>
          <button
            onClick={onClose}
            className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 transition-colors text-base"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-medium">
            <span>⚠</span> {error}
          </div>
        )}

        {/* Selectors */}
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-widest mb-1.5">
              Class <span className="text-red-500">*</span>
            </label>
            <select
              value={selectedClass}
              onChange={(e) => { setSelectedClass(e.target.value); setPreview(null); }}
              className="w-full border border-slate-200 bg-slate-50 p-3 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-400 focus:bg-white transition-colors"
            >
              <option value="">— Select a class —</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Term", value: selectedTerm, onChange: (v) => { setSelectedTerm(v); setPreview(null); }, options: TERMS.map((t) => ({ v: t.value, l: t.label })) },
              { label: "Year", value: selectedYear, onChange: (v) => { setSelectedYear(v); setPreview(null); }, options: YEARS.map((y) => ({ v: String(y), l: y })) },
            ].map(({ label, value, onChange, options }) => (
              <div key={label}>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-widest mb-1.5">{label}</label>
                <select
                  value={value}
                  onChange={(e) => onChange(e.target.value)}
                  className="w-full border border-slate-200 bg-slate-50 p-3 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-400 focus:bg-white transition-colors"
                >
                  {options.map(({ v, l }) => <option key={v} value={v}>{l}</option>)}
                </select>
              </div>
            ))}
          </div>
        </div>

        {/* Preview button */}
        {!preview && (
          <button
            onClick={fetchPreview}
            disabled={!selectedClass || previewLoading}
            className="w-full py-3 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 text-sm font-semibold rounded-xl disabled:opacity-40 transition-colors flex items-center justify-center gap-2"
          >
            {previewLoading ? <><Spinner size="sm" /> Loading preview…</> : "Preview affected records"}
          </button>
        )}

        {/* Preview card */}
        {preview && (
          <div className="rounded-2xl border border-slate-200 overflow-hidden">
            <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-200 flex items-center justify-between">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Preview</p>
              <button
                onClick={() => setPreview(null)}
                className="text-xs text-slate-400 hover:text-slate-600 underline underline-offset-2"
              >
                ← Change
              </button>
            </div>

            <div className="p-4 space-y-2 text-sm">
              {[
                { label: "Class", value: className },
                { label: "Term",  value: selectedTerm ? TERMS.find(t => t.value === selectedTerm)?.label : "All Terms" },
                { label: "Year",  value: selectedYear },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between items-center">
                  <span className="text-slate-400">{label}</span>
                  <span className="font-semibold text-slate-800">{value}</span>
                </div>
              ))}

              <div className="border-t border-slate-100 pt-2.5 space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-400">Fee records</span>
                  <span className="font-bold text-red-600 text-base">{preview.count}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Total billed</span>
                  <span className="font-medium text-slate-700">{fmt(preview.total_billed)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Total paid</span>
                  <span className="font-semibold text-emerald-600">{fmt(preview.total_paid)}</span>
                </div>
              </div>

              {preview.count === 0 ? (
                <p className="text-center text-slate-400 py-2 text-xs bg-slate-50 rounded-lg">
                  No fee records found for these filters.
                </p>
              ) : (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-xs text-red-700 leading-relaxed">
                  ⚠ Permanently deletes <strong>{preview.count}</strong> fee record{preview.count !== 1 ? "s" : ""}
                  {preview.total_paid > 0 && (
                    <span>, including <strong>{fmt(preview.total_paid)}</strong> in recorded payments</span>
                  )}. This cannot be undone.
                </div>
              )}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-1">
          <button
            onClick={onClose}
            className="flex-1 py-3 border border-slate-200 text-slate-600 text-sm font-semibold rounded-xl hover:bg-slate-50 active:bg-slate-100 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleDelete}
            disabled={!preview || preview.count === 0 || deleteLoading}
            className="flex-1 py-3 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white text-sm font-semibold rounded-xl disabled:opacity-40 transition-colors flex items-center justify-center gap-2"
          >
            {deleteLoading ? <><Spinner size="sm" /> Deleting…</> : "Confirm delete"}
          </button>
        </div>
      </div>
    </div>
  );
};

/* ─── Main Component ─────────────────────────────────────────────────────── */
const Accounts = () => {
  const [tab, setTab]             = useState("Dashboard");
  const [classes, setClasses]     = useState([]);
  const [selectedTerm, setTerm]   = useState("");
  const [selectedYear, setYear]   = useState(String(YEARS[0]));
  const [selectedClass, setClass] = useState("");
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState("");
  const [success, setSuccess]     = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);

  const [dashboard,     setDashboard]     = useState(null);
  const [ledger,        setLedger]        = useState(null);
  const [collection,    setCollection]    = useState([]);
  const [defaulters,    setDefaulters]    = useState(null);
  const [unassigned,    setUnassigned]    = useState([]);

  const [actionLoading, setActionLoading]   = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteClass, setDeleteClass]       = useState("");

  const buildQuery = useCallback(() => {
    const p = [];
    if (selectedTerm)  p.push(`term=${selectedTerm}`);
    if (selectedYear)  p.push(`year=${selectedYear}`);
    if (selectedClass) p.push(`school_class=${selectedClass}`);
    return p.length ? `?${p.join("&")}` : "";
  }, [selectedTerm, selectedYear, selectedClass]);

  useEffect(() => {
    API.get("/classes/")
      .then((r) => setClasses(r.data.results || r.data))
      .catch(() => setError("Failed to load classes."));
  }, []);

  useEffect(() => {
    setError("");
    const q = buildQuery();

    const load = async (endpoint, setter) => {
      setLoading(true);
      try {
        const r = await API.get(`${endpoint}${q}`);
        setter(r.data);
      } catch {
        setError("Failed to load data. Please refresh.");
      } finally {
        setLoading(false);
      }
    };

    if (tab === "Dashboard")         load("/accounts/dashboard/", setDashboard);
    if (tab === "Income Ledger")     load("/accounts/ledger/",    setLedger);
    if (tab === "Collection Report") load("/accounts/collection/",setCollection);
    if (tab === "Defaulters")        load("/accounts/defaulters/",setDefaulters);
    if (tab === "Unassigned Fees") {
      setLoading(true);
      API.get("/fees/unassigned-fees/")
        .then((r) => setUnassigned(r.data))
        .catch(() => setError("Failed to load unassigned fees."))
        .finally(() => setLoading(false));
    }
  }, [tab, buildQuery]);

  /* ── Unassigned fee actions ── */
  const deleteOneFee = async (feeId) => {
    if (!window.confirm("Delete this fee record? This cannot be undone.")) return;
    setActionLoading(true);
    try {
      await API.delete(`/fees/unassigned-fees/delete/?fee_id=${feeId}`);
      setSuccess("Fee record deleted.");
      setUnassigned((prev) => prev.filter((f) => f.fee_id !== feeId));
    } catch {
      setError("Failed to delete fee.");
    } finally {
      setActionLoading(false);
    }
  };

  const deleteAllUnassigned = async () => {
    if (!window.confirm(`Permanently delete all ${unassigned.length} unassigned fee record(s)?`)) return;
    setActionLoading(true);
    try {
      const r = await API.delete("/fees/unassigned-fees/delete/");
      setSuccess(r.data.detail || "All unassigned fees deleted.");
      setUnassigned([]);
    } catch {
      setError("Failed to delete fees.");
    } finally {
      setActionLoading(false);
    }
  };

  const deleteByClass = async () => {
    if (!deleteClass) return;
    const name = classes.find((c) => String(c.id) === String(deleteClass))?.name || "selected class";
    const affected = unassigned.filter((f) => String(f.class_id) === String(deleteClass));
    if (affected.length === 0) { setError(`No unassigned records for ${name}.`); return; }
    if (!window.confirm(`Delete ${affected.length} record(s) for ${name}?`)) return;
    setActionLoading(true);
    try {
      const r = await API.delete(`/fees/unassigned-fees/delete/?school_class=${deleteClass}`);
      setSuccess(r.data?.detail || `Deleted ${affected.length} record(s) for ${name}.`);
      setUnassigned((prev) => prev.filter((f) => String(f.class_id) !== String(deleteClass)));
      setDeleteClass("");
    } catch {
      setError("Failed to delete fees for class.");
    } finally {
      setActionLoading(false);
    }
  };

  const classesWithUnassigned = classes.filter((c) =>
    unassigned.some((f) => String(f.class_id) === String(c.id))
  );
  const unassignedCount = unassigned.length;

  /* Active filter count for the toggle button */
  const activeFilterCount = [selectedTerm, selectedClass].filter(Boolean).length;

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      {showDeleteModal && (
        <DeleteClassFeesModal
          classes={classes}
          onClose={() => setShowDeleteModal(false)}
          onDeleted={(msg) => {
            setSuccess(msg);
            API.get(`/accounts/dashboard/${buildQuery()}`).then((r) => setDashboard(r.data)).catch(() => {});
          }}
        />
      )}

      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-6 sm:py-8">

        {/* ── Page header ── */}
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">Accounts</h1>
          <p className="text-sm text-slate-500 mt-1">Financial overview, income ledger and fee collection reports</p>
        </div>

        {/* ── Toasts ── */}
        <Toast msg={error}   type="error"   onDismiss={() => setError("")}   />
        <Toast msg={success} type="success" onDismiss={() => setSuccess("")} />

        {/* ── Filters — collapsible on mobile ── */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm mb-4 overflow-hidden">
          {/* Toggle button (mobile) / always-visible header (desktop) */}
          <button
            className="w-full flex items-center justify-between px-4 sm:px-5 py-3.5 sm:hidden"
            onClick={() => setFiltersOpen((v) => !v)}
          >
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-widest">
              Filters {activeFilterCount > 0 && <span className="ml-1 bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full text-[10px]">{activeFilterCount}</span>}
            </span>
            <span className="text-slate-400 text-lg leading-none">{filtersOpen ? "▲" : "▼"}</span>
          </button>

          {/* Filter controls */}
          <div className={`px-4 sm:px-5 pb-4 sm:py-4 ${filtersOpen ? "block" : "hidden sm:block"}`}>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3 hidden sm:block">Filters</p>
            <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-3">
              {[
                { value: selectedTerm,  setter: setTerm,  options: TERMS.map((t) => ({ v: t.value, l: t.label })),  placeholder: null,          label: "Term"  },
                { value: selectedYear,  setter: setYear,  options: YEARS.map((y) => ({ v: String(y), l: y })),      placeholder: null,          label: "Year"  },
                { value: selectedClass, setter: setClass, options: classes.map((c) => ({ v: c.id, l: c.name })),    placeholder: "All Classes", label: "Class" },
              ].map(({ value, setter, options, placeholder, label }, i) => (
                <div key={i} className={i === 2 ? "col-span-2 sm:col-span-1" : ""}>
                  <label className="block text-xs text-slate-400 mb-1 sm:hidden">{label}</label>
                  <select
                    value={value}
                    onChange={(e) => setter(e.target.value)}
                    className="w-full sm:w-auto border border-slate-200 bg-slate-50 hover:bg-white px-3 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:bg-white transition-colors sm:min-w-[130px]"
                  >
                    {placeholder && <option value="">{placeholder}</option>}
                    {options.map(({ v, l }) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Tab bar — horizontally scrollable on mobile ── */}
        <div className="mb-6 -mx-3 sm:mx-0">
          <div className="overflow-x-auto px-3 sm:px-0 scrollbar-hide">
            <div className="flex gap-1 bg-slate-100 p-1 rounded-2xl w-max sm:w-fit">
              {TABS.map(({ id, label }) => {
                const isActive  = tab === id;
                const isDanger  = id === "Unassigned Fees";
                const showBadge = isDanger && unassignedCount > 0;
                return (
                  <button
                    key={id}
                    onClick={() => setTab(id)}
                    className={`relative flex items-center gap-1.5 px-3.5 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-150 whitespace-nowrap ${
                      isActive
                        ? `bg-white shadow-sm ${isDanger ? "text-red-600" : "text-blue-600"}`
                        : "text-slate-500 hover:text-slate-700 hover:bg-white/50"
                    }`}
                  >
                    {label}
                    {showBadge && (
                      <span className="ml-0.5 min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center leading-none">
                        {unassignedCount > 99 ? "99+" : unassignedCount}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── Content ── */}
        {loading ? (
          <LoadingOverlay />
        ) : (
          <>
            {/* ════════════════ DASHBOARD ════════════════ */}
            {tab === "Dashboard" && dashboard && (
              <div className="space-y-6">

                {/* KPI row + action button */}
                <div className="space-y-3">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <StatCard label="Total Billed"    value={fmt(dashboard.total_billed)}     color="text-slate-800"   bg="bg-white"       />
                    <StatCard label="Collected"       value={fmt(dashboard.total_paid)}       color="text-emerald-600" bg="bg-emerald-50"  />
                    <StatCard label="Outstanding"     value={fmt(dashboard.total_balance)}    color="text-red-600"     bg="bg-red-50"      />
                    <StatCard label="Collection Rate" value={`${dashboard.collection_rate}%`} color="text-blue-600"    bg="bg-blue-50"     />
                  </div>
                  <button
                    onClick={() => setShowDeleteModal(true)}
                    className="flex items-center justify-center gap-2 w-full sm:w-auto px-5 py-3 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white text-sm font-semibold rounded-xl shadow-sm transition-colors"
                  >
                    <span className="text-base leading-none">🗑</span>
                    Delete class fees
                  </button>
                </div>

                {/* Status badges */}
                <div className="flex gap-2 flex-wrap">
                  <Badge color="emerald">{dashboard.fully_paid} Fully paid</Badge>
                  <Badge color="amber">{dashboard.partial} Partial</Badge>
                  <Badge color="red">{dashboard.unpaid} Unpaid</Badge>
                </div>

                {/* Term breakdown */}
                <div>
                  <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-3">Term breakdown</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {dashboard.term_breakdown.map((t) => {
                      const rate = t.billed > 0 ? Math.round((t.paid / t.billed) * 100) : 0;
                      return (
                        <div key={t.term} className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
                          <p className="font-bold text-blue-700 mb-3 text-sm">{t.label}</p>
                          <div className="space-y-2 text-sm">
                            {[
                              { l: "Billed",      v: fmt(t.billed),  c: "text-slate-700"   },
                              { l: "Collected",   v: fmt(t.paid),    c: "text-emerald-600" },
                              { l: "Outstanding", v: fmt(t.balance), c: "text-red-600"     },
                            ].map(({ l, v, c }) => (
                              <div key={l} className="flex justify-between">
                                <span className="text-slate-400">{l}</span>
                                <span className={`font-semibold ${c}`}>{v}</span>
                              </div>
                            ))}
                          </div>
                          <div className="mt-3">
                            <CollectionBar rate={rate} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Recent payments */}
                <div>
                  <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-3">Recent payments</h2>
                  {dashboard.recent_transactions.length === 0 ? (
                    <EmptyState icon="💳" title="No recent transactions" />
                  ) : (
                    <>
                      {/* Mobile: card list */}
                      <div className="space-y-3 sm:hidden">
                        {dashboard.recent_transactions.map((t) => (
                          <MobileCard key={t.id}>
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <p className="font-semibold text-slate-800 text-sm">{t.student_name}</p>
                                <p className="text-xs text-slate-400 font-mono">{t.admission_number}</p>
                              </div>
                              <span className="font-bold text-emerald-600 text-sm whitespace-nowrap">{fmt(t.amount)}</span>
                            </div>
                            <MobileRow label="Class"><span className="text-slate-600 text-sm">{t.class}</span></MobileRow>
                            <MobileRow label="Term"><Badge>{t.term}</Badge></MobileRow>
                            <MobileRow label="Note"><span className="text-slate-400 italic text-xs">{t.note || "—"}</span></MobileRow>
                            <MobileRow label="Date"><span className="text-slate-400 text-xs tabular-nums">{t.created_at}</span></MobileRow>
                          </MobileCard>
                        ))}
                      </div>
                      {/* Desktop: table */}
                      <div className="hidden sm:block">
                        <DataTable
                          headers={[
                            { label: "Student", align: "left" },
                            { label: "Class" }, { label: "Term" },
                            { label: "Amount" }, { label: "Note" },
                            { label: "Recorded by" }, { label: "Date" },
                          ]}
                        >
                          {dashboard.recent_transactions.map((t) => (
                            <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                              <StudentCell name={t.student_name} admissionNumber={t.admission_number} />
                              <Td><span className="text-slate-600">{t.class}</span></Td>
                              <Td><Badge>{t.term}</Badge></Td>
                              <Td><span className="font-bold text-emerald-600">{fmt(t.amount)}</span></Td>
                              <Td><span className="text-slate-400 italic text-xs">{t.note || "—"}</span></Td>
                              <Td><span className="text-slate-500 text-xs">{t.recorded_by}</span></Td>
                              <Td><span className="text-slate-400 text-xs tabular-nums">{t.created_at}</span></Td>
                            </tr>
                          ))}
                        </DataTable>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* ════════════════ INCOME LEDGER ════════════════ */}
            {tab === "Income Ledger" && ledger && (
              <div className="space-y-5">
                <div className="grid grid-cols-2 gap-3 max-w-xs">
                  <StatCard label="Collected"    value={fmt(ledger.total_collected)} color="text-emerald-600" bg="bg-emerald-50" />
                  <StatCard label="Transactions" value={ledger.count}                color="text-blue-600"    bg="bg-blue-50"    />
                </div>

                {ledger.transactions.length === 0 ? (
                  <EmptyState icon="📒" title="No transactions found" subtitle="Try adjusting the filters above." />
                ) : (
                  <>
                    {/* Mobile cards */}
                    <div className="space-y-3 sm:hidden">
                      {ledger.transactions.map((t) => (
                        <MobileCard key={t.id}>
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="font-semibold text-slate-800 text-sm">{t.student_name}</p>
                              <p className="text-xs text-slate-400 font-mono">{t.admission_number}</p>
                            </div>
                            <span className="font-bold text-emerald-600 text-sm whitespace-nowrap">{fmt(t.amount)}</span>
                          </div>
                          <MobileRow label="Class"><span className="text-slate-600 text-sm">{t.class}</span></MobileRow>
                          <MobileRow label="Term"><Badge>{t.term}</Badge></MobileRow>
                          <MobileRow label="Note"><span className="text-slate-400 italic text-xs">{t.note || "—"}</span></MobileRow>
                          <MobileRow label="By"><span className="text-slate-500 text-xs">{t.recorded_by}</span></MobileRow>
                          <MobileRow label="Date"><span className="text-slate-400 text-xs tabular-nums">{t.created_at}</span></MobileRow>
                        </MobileCard>
                      ))}
                    </div>
                    {/* Desktop table */}
                    <div className="hidden sm:block">
                      <DataTable
                        headers={[
                          { label: "Student", align: "left" },
                          { label: "Class" }, { label: "Term" },
                          { label: "Amount" }, { label: "Note" },
                          { label: "Recorded by" }, { label: "Date & time" },
                        ]}
                      >
                        {ledger.transactions.map((t, i) => (
                          <tr key={t.id} className={`hover:bg-slate-50 transition-colors ${i % 2 !== 0 ? "bg-slate-50/40" : ""}`}>
                            <StudentCell name={t.student_name} admissionNumber={t.admission_number} />
                            <Td><span className="text-slate-600">{t.class}</span></Td>
                            <Td><Badge>{t.term}</Badge></Td>
                            <Td><span className="font-bold text-emerald-600">{fmt(t.amount)}</span></Td>
                            <Td><span className="text-slate-400 italic text-xs">{t.note || "—"}</span></Td>
                            <Td><span className="text-slate-500 text-xs">{t.recorded_by}</span></Td>
                            <Td><span className="text-slate-400 text-xs tabular-nums">{t.created_at}</span></Td>
                          </tr>
                        ))}
                      </DataTable>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* ════════════════ COLLECTION REPORT ════════════════ */}
            {tab === "Collection Report" && (
              collection.length === 0 ? (
                <EmptyState icon="📊" title="No data for selected filters" subtitle="Try broadening your filters." />
              ) : (
                <>
                  {/* Mobile cards */}
                  <div className="space-y-3 sm:hidden">
                    {collection.map((row) => (
                      <MobileCard key={row.class_id}>
                        <div className="flex items-center justify-between">
                          <p className="font-semibold text-slate-800 text-sm">{row.class_name}</p>
                          <span className="text-xs text-slate-400">{row.total_students} students</span>
                        </div>
                        <MobileRow label="Billed"><span className="text-slate-700 text-sm">{fmt(row.total_billed)}</span></MobileRow>
                        <MobileRow label="Collected"><span className="font-semibold text-emerald-600 text-sm">{fmt(row.total_paid)}</span></MobileRow>
                        <MobileRow label="Outstanding"><span className="font-semibold text-red-500 text-sm">{fmt(row.total_balance)}</span></MobileRow>
                        <MobileRow label="Fully paid / Unpaid">
                          <span className="text-sm"><span className="text-emerald-600 font-medium">{row.fully_paid}</span> / <span className="text-red-500 font-medium">{row.unpaid}</span></span>
                        </MobileRow>
                        <div className="pt-1">
                          <CollectionBar rate={row.collection_rate} />
                        </div>
                      </MobileCard>
                    ))}
                  </div>
                  {/* Desktop table */}
                  <div className="hidden sm:block">
                    <DataTable
                      headers={[
                        { label: "Class", align: "left" },
                        { label: "Students" }, { label: "Billed" },
                        { label: "Collected" }, { label: "Outstanding" },
                        { label: "Fully paid" }, { label: "Unpaid" },
                        { label: "Collection rate" },
                      ]}
                    >
                      {collection.map((row, i) => (
                        <tr key={row.class_id} className={`hover:bg-slate-50 transition-colors ${i % 2 !== 0 ? "bg-slate-50/40" : ""}`}>
                          <Td align="left"><span className="font-semibold text-slate-800">{row.class_name}</span></Td>
                          <Td><span className="text-slate-600">{row.total_students}</span></Td>
                          <Td><span className="text-slate-700">{fmt(row.total_billed)}</span></Td>
                          <Td><span className="font-semibold text-emerald-600">{fmt(row.total_paid)}</span></Td>
                          <Td><span className="font-semibold text-red-500">{fmt(row.total_balance)}</span></Td>
                          <Td><span className="text-emerald-600 font-medium">{row.fully_paid}</span></Td>
                          <Td><span className="text-red-500 font-medium">{row.unpaid}</span></Td>
                          <Td><CollectionBar rate={row.collection_rate} /></Td>
                        </tr>
                      ))}
                    </DataTable>
                  </div>
                </>
              )
            )}

            {/* ════════════════ DEFAULTERS ════════════════ */}
            {tab === "Defaulters" && defaulters && (
              <div className="space-y-5">
                <div className="grid grid-cols-2 gap-3 max-w-xs">
                  <StatCard label="Outstanding"    value={fmt(defaulters.total_outstanding)} color="text-red-600"   bg="bg-red-50"   />
                  <StatCard label="With balance"   value={defaulters.count}                  color="text-amber-600" bg="bg-amber-50" />
                </div>

                {defaulters.defaulters.length === 0 ? (
                  <EmptyState icon="🎉" title="No defaulters found" subtitle="All students are up to date." />
                ) : (
                  <>
                    {/* Mobile cards */}
                    <div className="space-y-3 sm:hidden">
                      {defaulters.defaulters.map((d) => (
                        <MobileCard key={`${d.student_id}-${d.term}`} highlighted>
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="font-semibold text-slate-800 text-sm">{d.student_name}</p>
                              <p className="text-xs text-slate-400 font-mono">{d.admission_number}</p>
                            </div>
                            <span className="font-bold text-red-600 text-sm whitespace-nowrap">{fmt(d.balance)}</span>
                          </div>
                          <MobileRow label="Class"><span className="text-slate-600 text-sm">{d.class}</span></MobileRow>
                          <MobileRow label="Term"><Badge>{d.term}</Badge></MobileRow>
                          <MobileRow label="Total / Paid">
                            <span className="text-sm"><span className="text-slate-700">{fmt(d.total_amount)}</span> / <span className="text-emerald-600">{fmt(d.paid)}</span></span>
                          </MobileRow>
                          {Number(d.arrears) > 0 && (
                            <MobileRow label="Arrears"><span className="font-semibold text-amber-600 text-sm">{fmt(d.arrears)}</span></MobileRow>
                          )}
                        </MobileCard>
                      ))}
                    </div>
                    {/* Desktop table */}
                    <div className="hidden sm:block">
                      <DataTable
                        headers={[
                          { label: "Student", align: "left" },
                          { label: "Class" }, { label: "Term" },
                          { label: "Total" }, { label: "Paid" },
                          { label: "Balance" }, { label: "Arrears" },
                        ]}
                      >
                        {defaulters.defaulters.map((d, i) => (
                          <tr key={`${d.student_id}-${d.term}`} className={`hover:bg-red-50/30 transition-colors ${i % 2 !== 0 ? "bg-slate-50/40" : ""}`}>
                            <StudentCell name={d.student_name} admissionNumber={d.admission_number} />
                            <Td><span className="text-slate-600">{d.class}</span></Td>
                            <Td><Badge>{d.term}</Badge></Td>
                            <Td><span className="font-medium text-slate-700">{fmt(d.total_amount)}</span></Td>
                            <Td><span className="text-emerald-600">{fmt(d.paid)}</span></Td>
                            <Td><span className="font-bold text-red-600">{fmt(d.balance)}</span></Td>
                            <Td>
                              {Number(d.arrears) > 0
                                ? <span className="font-semibold text-amber-600">{fmt(d.arrears)}</span>
                                : <span className="text-slate-300">—</span>
                              }
                            </Td>
                          </tr>
                        ))}
                      </DataTable>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* ════════════════ UNASSIGNED FEES ════════════════ */}
            {tab === "Unassigned Fees" && (
              <div className="space-y-5">

                {/* Section header */}
                <div className="space-y-3 sm:space-y-0 sm:flex sm:items-start sm:justify-between sm:gap-4">
                  <div>
                    <h2 className="font-bold text-slate-800 text-base">Wrongly billed — unassigned students</h2>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Students billed but not assigned to any class.
                      {unassignedCount > 0 && (
                        <span className="ml-1 font-semibold text-red-500">{unassignedCount} record{unassignedCount !== 1 ? "s" : ""} found.</span>
                      )}
                    </p>
                  </div>
                  {unassignedCount > 0 && (
                    <button
                      onClick={deleteAllUnassigned}
                      disabled={actionLoading}
                      className="flex items-center justify-center gap-2 w-full sm:w-auto px-4 py-3 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-50"
                    >
                      {actionLoading ? <Spinner size="sm" /> : <span className="text-base leading-none">🗑</span>}
                      Delete all ({unassignedCount})
                    </button>
                  )}
                </div>

                {/* Delete by class */}
                {unassignedCount > 0 && (
                  <div className="bg-white rounded-2xl border border-red-200 p-4 sm:p-5">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-3">Delete bills by class</p>
                    <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-end gap-3">
                      <div className="flex-1 sm:min-w-[200px]">
                        <select
                          value={deleteClass}
                          onChange={(e) => setDeleteClass(e.target.value)}
                          className="w-full border border-slate-200 bg-slate-50 p-3 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-400 focus:bg-white transition-colors"
                        >
                          <option value="">— Select a class —</option>
                          {classesWithUnassigned.map((c) => {
                            const count = unassigned.filter((f) => String(f.class_id) === String(c.id)).length;
                            return (
                              <option key={c.id} value={c.id}>
                                {c.name} ({count} record{count !== 1 ? "s" : ""})
                              </option>
                            );
                          })}
                        </select>
                      </div>
                      <button
                        onClick={deleteByClass}
                        disabled={!deleteClass || actionLoading}
                        className="flex items-center justify-center gap-2 w-full sm:w-auto px-4 py-3 bg-red-100 hover:bg-red-200 active:bg-red-300 text-red-700 text-sm font-semibold rounded-xl disabled:opacity-40 transition-colors"
                      >
                        {actionLoading ? <Spinner size="sm" /> : <span className="text-sm">🗑</span>}
                        Delete class bills
                      </button>
                    </div>
                    {deleteClass && (() => {
                      const count = unassigned.filter((f) => String(f.class_id) === String(deleteClass)).length;
                      const name  = classes.find((c) => String(c.id) === String(deleteClass))?.name;
                      return (
                        <p className="text-xs text-red-500 mt-2.5">
                          ⚠ Permanently deletes {count} record{count !== 1 ? "s" : ""} for <strong>{name}</strong>.
                        </p>
                      );
                    })()}
                  </div>
                )}

                {unassignedCount === 0 ? (
                  <EmptyState
                    icon="✅"
                    title="No wrongly billed students"
                    subtitle="All billed students are assigned to a class."
                  />
                ) : (
                  <>
                    {/* Mobile cards */}
                    <div className="space-y-3 sm:hidden">
                      {unassigned.map((f) => {
                        const isHighlighted = deleteClass && String(f.class_id) === String(deleteClass);
                        return (
                          <MobileCard key={f.fee_id} highlighted={isHighlighted}>
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <p className="font-semibold text-slate-800 text-sm">{f.student_name}</p>
                                <p className="text-xs text-slate-400 font-mono">{f.admission_number}</p>
                              </div>
                              <button
                                onClick={() => deleteOneFee(f.fee_id)}
                                disabled={actionLoading}
                                className="px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-700 text-xs font-semibold rounded-lg disabled:opacity-50 transition-colors flex-shrink-0"
                              >
                                Delete
                              </button>
                            </div>
                            <MobileRow label="Class"><span className="text-slate-600 text-sm">{f.class_name || "—"}</span></MobileRow>
                            <MobileRow label="Term"><Badge>{f.term.replace("term", "Term ")}</Badge></MobileRow>
                            <MobileRow label="Billed / Paid">
                              <span className="text-sm"><span className="text-slate-700">{fmt(f.total_amount)}</span> / <span className="text-emerald-600">{fmt(f.paid)}</span></span>
                            </MobileRow>
                            <MobileRow label="Balance"><span className="font-bold text-red-500 text-sm">{fmt(f.balance)}</span></MobileRow>
                            <MobileRow label="Added"><span className="text-slate-400 text-xs tabular-nums">{f.created_at}</span></MobileRow>
                          </MobileCard>
                        );
                      })}
                    </div>
                    {/* Desktop table */}
                    <div className="hidden sm:block">
                      <DataTable
                        headers={[
                          { label: "Student", align: "left" },
                          { label: "Class" }, { label: "Term" },
                          { label: "Billed" }, { label: "Paid" },
                          { label: "Balance" }, { label: "Date added" },
                          { label: "Action" },
                        ]}
                      >
                        {unassigned.map((f, i) => {
                          const isHighlighted = deleteClass && String(f.class_id) === String(deleteClass);
                          return (
                            <tr
                              key={f.fee_id}
                              className={`transition-colors ${
                                isHighlighted
                                  ? "bg-red-50"
                                  : i % 2 !== 0 ? "bg-slate-50/40 hover:bg-red-50/30" : "hover:bg-red-50/30"
                              }`}
                            >
                              <StudentCell name={f.student_name} admissionNumber={f.admission_number} />
                              <Td><span className="text-slate-600">{f.class_name || "—"}</span></Td>
                              <Td><Badge>{f.term.replace("term", "Term ")}</Badge></Td>
                              <Td><span className="font-medium text-slate-700">{fmt(f.total_amount)}</span></Td>
                              <Td><span className="text-emerald-600">{fmt(f.paid)}</span></Td>
                              <Td><span className="font-bold text-red-500">{fmt(f.balance)}</span></Td>
                              <Td><span className="text-slate-400 text-xs tabular-nums">{f.created_at}</span></Td>
                              <Td>
                                <button
                                  onClick={() => deleteOneFee(f.fee_id)}
                                  disabled={actionLoading}
                                  className="px-3 py-1.5 bg-red-100 hover:bg-red-200 active:bg-red-300 text-red-700 text-xs font-semibold rounded-lg disabled:opacity-50 transition-colors"
                                >
                                  Delete
                                </button>
                              </Td>
                            </tr>
                          );
                        })}
                      </DataTable>
                    </div>
                  </>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Accounts;
