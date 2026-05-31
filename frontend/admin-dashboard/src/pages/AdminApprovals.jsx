import { useEffect, useState, useCallback } from "react";
import API from "../services/api";

const formatDate = (iso) =>
  new Date(iso).toLocaleDateString("en-US", {
    year: "numeric", month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  });

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

const AdminApprovals = () => {
  const [pending, setPending]     = useState([]);
  const [allAdmins, setAllAdmins] = useState([]);
  const [tab, setTab]             = useState("pending"); // "pending" | "all"
  const [loading, setLoading]     = useState(true);
  const [acting, setActing]       = useState(null); // id being approved/rejected
  const [error, setError]         = useState("");
  const [success, setSuccess]     = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [pendingRes, allRes] = await Promise.all([
        API.get("/admin-approvals/"),
        API.get("/admin-approvals/all/"),
      ]);
      setPending(pendingRes.data);
      setAllAdmins(allRes.data);
    } catch {
      setError("Failed to load admin accounts.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const approve = async (id, username) => {
    if (!window.confirm(`Approve ${username}? They will be able to log in immediately.`)) return;
    setActing(id); setError(""); setSuccess("");
    try {
      const res = await API.post(`/admin-approvals/${id}/approve/`);
      setSuccess(res.data.message);
      load();
    } catch (err) {
      setError(err.response?.data?.error || "Failed to approve.");
    } finally {
      setActing(null);
    }
  };

  const reject = async (id, username) => {
    if (!window.confirm(`Reject and permanently delete ${username}'s account? This cannot be undone.`)) return;
    setActing(id); setError(""); setSuccess("");
    try {
      const res = await API.post(`/admin-approvals/${id}/reject/`);
      setSuccess(res.data.message);
      load();
    } catch (err) {
      setError(err.response?.data?.error || "Failed to reject.");
    } finally {
      setActing(null);
    }
  };

  const displayed = tab === "pending" ? pending : allAdmins;

  return (
    <div className="p-6 max-w-4xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Admin Approvals</h2>
          <p className="text-sm text-gray-400 mt-0.5">
            Review and approve new administrator account requests
          </p>
        </div>
        {pending.length > 0 && (
          <span className="inline-flex items-center gap-1.5 bg-amber-50 text-amber-700 text-sm font-semibold px-4 py-2 rounded-xl ring-1 ring-amber-200">
            ⏳ {pending.length} pending approval{pending.length !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      <Toast message={error}   type="error"   onDismiss={() => setError("")}   />
      <Toast message={success} type="success" onDismiss={() => setSuccess("")} />

      {/* Tabs */}
      <div className="flex border-b border-gray-200 mb-5 gap-1">
        {[
          { key: "pending", label: "Pending",   count: pending.length  },
          { key: "all",     label: "All Admins", count: allAdmins.length },
        ].map(({ key, label, count }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-t-lg border-b-2 transition-all ${
              tab === key
                ? "border-blue-600 text-blue-600 bg-blue-50/60"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50"
            }`}
          >
            {label}
            <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${
              tab === key ? "bg-blue-100 text-blue-600" : "bg-gray-100 text-gray-500"
            }`}>
              {count}
            </span>
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="text-center py-14 text-gray-400 bg-white rounded-2xl border border-gray-100 shadow-sm">
          <p className="text-3xl mb-2">⏳</p>
          <p className="text-sm">Loading admin accounts…</p>
        </div>
      ) : displayed.length === 0 ? (
        <div className="text-center py-14 text-gray-400 bg-white rounded-2xl border border-gray-100 shadow-sm">
          <p className="text-3xl mb-2">{tab === "pending" ? "✅" : "👤"}</p>
          <p className="text-sm">
            {tab === "pending"
              ? "No pending approvals. All admin accounts are up to date."
              : "No other admin accounts found."}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide border-b border-gray-100">
                  <th className="px-5 py-3 text-left font-medium">Admin</th>
                  <th className="px-5 py-3 text-left font-medium">Email</th>
                  <th className="px-5 py-3 text-left font-medium">Registered</th>
                  <th className="px-5 py-3 text-left font-medium">Status</th>
                  {tab === "pending" && (
                    <th className="px-5 py-3 text-left font-medium">Actions</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {displayed.map((admin) => (
                  <tr key={admin.id} className="hover:bg-gray-50/60 transition-colors">

                    {/* Avatar + name */}
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                          {admin.username[0].toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-800">{admin.username}</p>
                          <p className="text-xs text-gray-400">Administrator</p>
                        </div>
                      </div>
                    </td>

                    <td className="px-5 py-4 text-gray-600">
                      {admin.email || <span className="text-gray-300">—</span>}
                    </td>

                    <td className="px-5 py-4 text-gray-500 text-xs">
                      {formatDate(admin.date_joined)}
                    </td>

                    {/* Status pill */}
                    <td className="px-5 py-4">
                      {admin.is_approved ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-green-50 text-green-700 ring-1 ring-green-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                          Approved
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 ring-1 ring-amber-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                          Pending
                        </span>
                      )}
                    </td>

                    {/* Actions (pending tab only) */}
                    {tab === "pending" && (
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => approve(admin.id, admin.username)}
                            disabled={acting === admin.id}
                            className="bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-lg text-xs font-medium disabled:opacity-50 transition-colors"
                          >
                            {acting === admin.id ? "…" : "Approve"}
                          </button>
                          <button
                            onClick={() => reject(admin.id, admin.username)}
                            disabled={acting === admin.id}
                            className="bg-red-50 hover:bg-red-600 text-red-600 hover:text-white px-3 py-1.5 rounded-lg text-xs font-medium border border-red-100 hover:border-red-600 disabled:opacity-50 transition-colors"
                          >
                            {acting === admin.id ? "…" : "Reject"}
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminApprovals;