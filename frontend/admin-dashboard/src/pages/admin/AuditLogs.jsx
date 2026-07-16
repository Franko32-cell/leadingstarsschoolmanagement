import { useCallback, useEffect, useMemo, useState } from "react";
import {
  FaSearch,
  FaFileCsv,
  FaSync,
  FaChevronLeft,
  FaChevronRight,
  FaFilter,
  FaTimesCircle,
  FaExclamationTriangle,
} from "react-icons/fa";
import { getAuditLogs, exportAuditLogsCSV } from "../../services/auditService";

// ── Static option lists (mirror apps/audit/models.py choices) ──────────────
const ACTIONS = [
  ["", "All actions"],
  ["login", "Login"],
  ["logout", "Logout"],
  ["login_failed", "Failed Login"],
  ["create", "Record Created"],
  ["update", "Record Updated"],
  ["delete", "Record Deleted"],
  ["archive", "Record Archived"],
  ["restore", "Record Restored"],
  ["attendance_update", "Attendance Updated"],
  ["result_upload", "Result Uploaded"],
  ["fee_update", "Fee Updated"],
  ["payment_processed", "Payment Processed"],
  ["receipt_generated", "Receipt Generated"],
  ["announcement_created", "Announcement Created"],
  ["user_activated", "User Activated"],
  ["user_deactivated", "User Deactivated"],
  ["user_suspended", "User Suspended"],
  ["role_changed", "Role Changed"],
  ["password_reset", "Password Reset"],
];

const MODULES = [
  ["", "All modules"],
  ["auth", "Authentication"],
  ["students", "Students"],
  ["teachers", "Teachers"],
  ["classes", "Classes"],
  ["attendance", "Attendance"],
  ["results", "Results"],
  ["fees", "Fees"],
  ["admissions", "Admissions"],
  ["announcements", "Announcements"],
  ["accounts", "Accounts"],
  ["notifications", "Notifications"],
  ["system", "System"],
];

const STATUSES = [
  ["", "All statuses"],
  ["success", "Success"],
  ["failed", "Failed"],
];

const DEFAULT_FILTERS = {
  action: "",
  module: "",
  status: "",
  date_from: "",
  date_to: "",
  search: "",
};

// ── Sub-components ──────────────────────────────────────────────────────────

const StatusBadge = ({ status }) =>
  status === "failed" ? (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-red-50 text-red-600">
      <span className="w-1.5 h-1.5 rounded-full bg-red-500" /> Failed
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-600">
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Success
    </span>
  );

const ModuleBadge = ({ module, label }) => {
  const colors = {
    fees: "bg-amber-50 text-amber-700",
    students: "bg-indigo-50 text-indigo-700",
    teachers: "bg-blue-50 text-blue-700",
    attendance: "bg-rose-50 text-rose-700",
    results: "bg-purple-50 text-purple-700",
    auth: "bg-slate-100 text-slate-600",
    accounts: "bg-teal-50 text-teal-700",
  };
  return (
    <span
      className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
        colors[module] || "bg-slate-100 text-slate-600"
      }`}
    >
      {label}
    </span>
  );
};

const RowSkeleton = () => (
  <tr className="animate-pulse">
    {Array.from({ length: 6 }).map((_, i) => (
      <td key={i} className="px-4 py-4">
        <div className="h-3.5 bg-slate-100 rounded-full w-full max-w-[140px]" />
      </td>
    ))}
  </tr>
);

const FilterSelect = ({ label, value, onChange, options }) => (
  <label className="flex flex-col gap-1.5 text-xs font-bold text-slate-500">
    {label}
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500"
    >
      {options.map(([val, lbl]) => (
        <option key={val} value={val}>
          {lbl}
        </option>
      ))}
    </select>
  </label>
);

// ── Main component ───────────────────────────────────────────────────────────

const AuditLogs = () => {
  const [logs, setLogs] = useState([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(1);
  const pageSize = 25;
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [searchInput, setSearchInput] = useState("");

  const activeFilterCount = useMemo(
    () => Object.values(filters).filter(Boolean).length,
    [filters]
  );

  const buildParams = useCallback(
    (targetPage) => ({
      ...Object.fromEntries(Object.entries(filters).filter(([, v]) => v)),
      page: targetPage,
      page_size: pageSize,
      ordering: "-created_at",
    }),
    [filters]
  );

  const load = useCallback(
    async (targetPage = 1, isRefresh = false) => {
      isRefresh ? setRefreshing(true) : setLoading(true);
      setError("");
      try {
        const data = await getAuditLogs(buildParams(targetPage));
        setLogs(data.results ?? data);
        setCount(data.count ?? (data.results ?? data).length);
        setPage(targetPage);
      } catch {
        setError("Failed to load audit logs. Please try again.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [buildParams]
  );

  useEffect(() => {
    load(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setFilters((f) => ({ ...f, search: searchInput }));
  };

  const clearFilters = () => {
    setFilters(DEFAULT_FILTERS);
    setSearchInput("");
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      await exportAuditLogsCSV(buildParams(1));
    } catch {
      setError("Export failed. Please try again.");
    } finally {
      setExporting(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil(count / pageSize));

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-2 h-8 bg-gradient-to-b from-indigo-500 to-purple-500 rounded-full" />
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                Audit Logs
              </h1>
              <p className="text-sm text-slate-500 font-medium mt-0.5">
                {count.toLocaleString()} recorded actions across the system
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setShowFilters((s) => !s)}
              className="flex items-center gap-2 text-sm font-bold text-slate-700 bg-white border border-slate-200 rounded-xl px-4 py-2.5 shadow-sm hover:shadow-md transition-all"
            >
              <FaFilter className="text-xs" />
              Filters
              {activeFilterCount > 0 && (
                <span className="w-5 h-5 flex items-center justify-center rounded-full bg-indigo-600 text-white text-[10px]">
                  {activeFilterCount}
                </span>
              )}
            </button>
            <button
              onClick={handleExport}
              disabled={exporting}
              className="flex items-center gap-2 text-sm font-bold text-white bg-gradient-to-r from-emerald-600 to-emerald-500 rounded-xl px-4 py-2.5 shadow-sm hover:shadow-md transition-all disabled:opacity-50"
            >
              <FaFileCsv className="text-xs" />
              {exporting ? "Exporting…" : "Export CSV"}
            </button>
            <button
              onClick={() => load(page, true)}
              disabled={refreshing}
              className="w-11 h-11 flex items-center justify-center bg-white border border-slate-200 rounded-xl shadow-sm hover:shadow-md transition-all disabled:opacity-50"
            >
              <FaSync className={`text-xs text-slate-600 ${refreshing ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        {/* Search bar */}
        <form onSubmit={handleSearchSubmit} className="relative">
          <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search by user, resource, or description…"
            className="w-full rounded-2xl border border-slate-200 bg-white pl-11 pr-24 py-3.5 text-sm font-medium shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500"
          />
          <button
            type="submit"
            className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-bold text-white bg-slate-900 rounded-xl px-4 py-2 hover:bg-slate-800 transition-colors"
          >
            Search
          </button>
        </form>

        {/* Filter panel */}
        {showFilters && (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-md p-5 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 animate-fade-in">
            <FilterSelect
              label="Action"
              value={filters.action}
              onChange={(v) => setFilters((f) => ({ ...f, action: v }))}
              options={ACTIONS}
            />
            <FilterSelect
              label="Module"
              value={filters.module}
              onChange={(v) => setFilters((f) => ({ ...f, module: v }))}
              options={MODULES}
            />
            <FilterSelect
              label="Status"
              value={filters.status}
              onChange={(v) => setFilters((f) => ({ ...f, status: v }))}
              options={STATUSES}
            />
            <label className="flex flex-col gap-1.5 text-xs font-bold text-slate-500">
              From
              <input
                type="datetime-local"
                value={filters.date_from}
                onChange={(e) => setFilters((f) => ({ ...f, date_from: e.target.value }))}
                className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-semibold text-slate-700"
              />
            </label>
            <label className="flex flex-col gap-1.5 text-xs font-bold text-slate-500">
              To
              <input
                type="datetime-local"
                value={filters.date_to}
                onChange={(e) => setFilters((f) => ({ ...f, date_to: e.target.value }))}
                className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-semibold text-slate-700"
              />
            </label>

            {activeFilterCount > 0 && (
              <button
                onClick={clearFilters}
                className="col-span-2 sm:col-span-3 lg:col-span-5 flex items-center justify-center gap-2 text-xs font-bold text-slate-500 hover:text-red-600 transition-colors mt-1"
              >
                <FaTimesCircle className="text-xs" /> Clear all filters
              </button>
            )}
          </div>
        )}

        {/* Error state */}
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
                  {["Timestamp", "User", "Action", "Module", "Resource", "Status"].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-3.5 text-left text-xs font-black text-slate-400 uppercase tracking-wider"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {loading ? (
                  Array.from({ length: 8 }).map((_, i) => <RowSkeleton key={i} />)
                ) : logs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-16 text-center text-slate-400 font-medium">
                      No audit log entries match these filters.
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-4 py-3.5 whitespace-nowrap text-slate-600 font-medium">
                        {new Date(log.created_at).toLocaleString("en-GB", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td className="px-4 py-3.5">
                        <p className="font-bold text-slate-800">{log.actor_username || "System"}</p>
                        <p className="text-xs text-slate-400 capitalize">{log.actor_role}</p>
                      </td>
                      <td className="px-4 py-3.5 text-slate-700 font-medium">
                        {log.action_display}
                      </td>
                      <td className="px-4 py-3.5">
                        <ModuleBadge module={log.module} label={log.module_display} />
                      </td>
                      <td className="px-4 py-3.5 text-slate-600 max-w-xs truncate" title={log.resource_repr}>
                        {log.resource_repr || "—"}
                      </td>
                      <td className="px-4 py-3.5">
                        <StatusBadge status={log.status} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
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
    </div>
  );
};

export default AuditLogs;