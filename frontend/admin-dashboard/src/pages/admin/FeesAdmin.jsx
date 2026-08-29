import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  FaSearch,
  FaSync,
  FaEllipsisV,
  FaMoneyBillWave,
  FaPlusCircle,
  FaTimes,
  FaCheckCircle,
  FaExclamationTriangle,
  FaChevronLeft,
  FaChevronRight,
  FaReceipt,
} from "react-icons/fa";
import {
  getFeesAdmin,
  payFee,
  addArrears,
  getSchoolClasses,
  getStudentsByClass,
  sendBulkWhatsAppBills,
} from "../../services/feeAdminService";
import WhatsAppSendButton from "../../components/WhatsAppSendButton";

const ghs = (n) =>
  `GHS ${Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;

const fmtDate = (iso) =>
  iso ? new Date(iso).toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";

// ── Status derivation ────────────────────────────────────────────────────
const feeStatus = (fee) => {
  if (fee.is_fully_paid) return "paid";
  if (Number(fee.paid) > 0) return "partial";
  return "unpaid";
};

const STATUS_STYLES = {
  paid:    { bg: "bg-emerald-50", text: "text-emerald-700", dot: "#10b981", label: "Paid" },
  partial: { bg: "bg-amber-50",   text: "text-amber-700",   dot: "#f59e0b", label: "Partial" },
  unpaid:  { bg: "bg-red-50",     text: "text-red-600",     dot: "#ef4444", label: "Unpaid" },
};

const StatusBadge = ({ status }) => {
  const s = STATUS_STYLES[status];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold ${s.bg} ${s.text}`}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: s.dot }} />
      {s.label}
    </span>
  );
};

// ── Toast ─────────────────────────────────────────────────────────────────
const Toast = ({ toast, onClose }) => {
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(onClose, 3500);
    return () => clearTimeout(t);
  }, [toast, onClose]);
  if (!toast) return null;
  const isError = toast.type === "error";
  return (
    <div
      className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-2xl text-sm font-bold animate-fade-in ${
        isError ? "bg-red-600 text-white" : "bg-slate-900 text-white"
      }`}
    >
      {isError ? <FaExclamationTriangle /> : <FaCheckCircle className="text-emerald-400" />}
      {toast.message}
    </div>
  );
};

// ── Record Payment modal ────────────────────────────────────────────────
const PaymentModal = ({ fee, onClose, onSubmit, busy, error }) => {
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  if (!fee) return null;

  const submit = (e) => {
    e.preventDefault();
    onSubmit({ amount, note });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm px-4">
      <form onSubmit={submit} className="bg-white rounded-3xl shadow-2xl max-w-sm w-full p-6 animate-fade-in-up">
        <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center mb-4">
          <FaMoneyBillWave className="text-emerald-600 text-xl" />
        </div>
        <p className="text-lg font-black text-slate-800 mb-1">Record payment</p>
        <p className="text-sm text-slate-500 font-medium mb-5">
          {fee.student_name} — outstanding balance{" "}
          <span className="font-bold text-slate-700">{ghs(fee.balance)}</span>
        </p>

        {error && (
          <div className="flex items-center gap-2 bg-red-50 text-red-700 text-xs font-bold rounded-xl px-3.5 py-2.5 mb-4">
            <FaExclamationTriangle /> {error}
          </div>
        )}

        <label className="block text-xs font-bold text-slate-500 mb-1.5">Amount (GHS)</label>
        <input
          type="number"
          step="0.01"
          min="0"
          required
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold mb-4 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500"
          placeholder="0.00"
        />

        <label className="block text-xs font-bold text-slate-500 mb-1.5">Note (optional)</label>
        <input
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold mb-6 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500"
          placeholder="e.g. Cash payment at office"
        />

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={busy}
            className="flex-1 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-700 transition-colors disabled:opacity-50"
          >
            {busy ? "Recording…" : "Record Payment"}
          </button>
        </div>
      </form>
    </div>
  );
};

// ── Add Arrears modal ────────────────────────────────────────────────────
const ArrearsModal = ({ fee, onClose, onSubmit, busy, error }) => {
  const [arrears, setArrears] = useState(fee ? fee.arrears : "");
  if (!fee) return null;

  const submit = (e) => {
    e.preventDefault();
    onSubmit(arrears);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm px-4">
      <form onSubmit={submit} className="bg-white rounded-3xl shadow-2xl max-w-sm w-full p-6 animate-fade-in-up">
        <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center mb-4">
          <FaPlusCircle className="text-amber-600 text-xl" />
        </div>
        <p className="text-lg font-black text-slate-800 mb-1">Update arrears</p>
        <p className="text-sm text-slate-500 font-medium mb-5">
          {fee.student_name} — current arrears{" "}
          <span className="font-bold text-slate-700">{ghs(fee.arrears)}</span>
        </p>

        {error && (
          <div className="flex items-center gap-2 bg-red-50 text-red-700 text-xs font-bold rounded-xl px-3.5 py-2.5 mb-4">
            <FaExclamationTriangle /> {error}
          </div>
        )}

        <label className="block text-xs font-bold text-slate-500 mb-1.5">New arrears amount (GHS)</label>
        <input
          type="number"
          step="0.01"
          min="0"
          required
          value={arrears}
          onChange={(e) => setArrears(e.target.value)}
          className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold mb-6 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500"
        />

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={busy}
            className="flex-1 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-bold hover:bg-slate-800 transition-colors disabled:opacity-50"
          >
            {busy ? "Saving…" : "Save"}
          </button>
        </div>
      </form>
    </div>
  );
};

// ── Row action menu ───────────────────────────────────────────────────────
const RowMenu = ({ onPay, onArrears, onViewHistory }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className="relative" ref={ref} onClick={(e) => e.stopPropagation()}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 transition-colors text-slate-400 hover:text-slate-700"
      >
        <FaEllipsisV className="text-xs" />
      </button>
      {open && (
        <div className="absolute right-0 mt-1 w-48 bg-white rounded-xl shadow-xl border border-slate-100 py-1.5 z-20 animate-fade-in">
          <button onClick={() => { setOpen(false); onPay(); }} className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-bold text-emerald-600 hover:bg-slate-50 transition-colors">
            <FaMoneyBillWave /> Record Payment
          </button>
          <button onClick={() => { setOpen(false); onArrears(); }} className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-bold text-amber-600 hover:bg-slate-50 transition-colors">
            <FaPlusCircle /> Add Arrears
          </button>
          <button onClick={() => { setOpen(false); onViewHistory(); }} className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-bold text-indigo-600 hover:bg-slate-50 transition-colors">
            <FaReceipt /> View History
          </button>
        </div>
      )}
    </div>
  );
};

// ── Detail drawer ─────────────────────────────────────────────────────────
const Drawer = ({ fee, onClose, onPay, onArrears }) => {
  if (!fee) return null;
  const status = feeStatus(fee);

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white h-full shadow-2xl overflow-y-auto animate-slide-in">
        <div className="sticky top-0 bg-white/95 backdrop-blur-sm border-b border-slate-100 px-6 py-5 flex items-center justify-between z-10">
          <div>
            <p className="text-lg font-black text-slate-900">{fee.student_name}</p>
            <p className="text-xs text-slate-400 font-semibold">{fee.admission_number} · {fee.term}</p>
            <div className="mt-1.5"><StatusBadge status={status} /></div>
          </div>
          <button onClick={onClose} className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-slate-100 transition-colors">
            <FaTimes className="text-slate-400" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div>
            <p className="text-xs font-black text-slate-400 uppercase tracking-wider mb-2.5">Breakdown</p>
            <div className="bg-slate-50 rounded-2xl p-4 space-y-2.5 text-sm">
              {[
                ["Tuition", fee.amount],
                ["Books", fee.book_user_fee],
                ["Workbook", fee.workbook_fee],
                ["Arrears", fee.arrears],
              ].map(([label, val]) => (
                <div key={label} className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium">{label}</span>
                  <span className="text-slate-800 font-bold">{ghs(val)}</span>
                </div>
              ))}
              <div className="border-t border-slate-200 pt-2.5 flex items-center justify-between">
                <span className="text-slate-600 font-bold">Total</span>
                <span className="text-slate-900 font-black">{ghs(fee.total_amount)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-emerald-600 font-bold">Paid</span>
                <span className="text-emerald-700 font-black">{ghs(fee.paid)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-red-600 font-bold">Balance</span>
                <span className="text-red-700 font-black">{ghs(fee.balance)}</span>
              </div>
            </div>
          </div>

          <div>
            <p className="text-xs font-black text-slate-400 uppercase tracking-wider mb-2.5">
              Payment History
            </p>
            {fee.transactions?.length ? (
              <div className="space-y-2">
                {fee.transactions.map((t) => (
                  <div key={t.id} className="bg-slate-50 rounded-xl p-3.5 text-sm">
                    <div className="flex items-center justify-between mb-1 gap-2">
                      <span className="font-bold text-slate-800">{ghs(t.amount)}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-400">{t.created_at_display || fmtDate(t.created_at)}</span>
                        <WhatsAppSendButton endpoint={`/fees/receipts/${t.id}/send-whatsapp/`} />
                      </div>
                    </div>
                    <p className="text-xs text-slate-500">
                      {t.note || "No note"} · by {t.recorded_by_name || "System"}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-400 font-medium">No payments recorded yet.</p>
            )}
          </div>

          <div>
            <p className="text-xs font-black text-slate-400 uppercase tracking-wider mb-2.5">Actions</p>
            <div className="grid grid-cols-2 gap-2.5">
              <button onClick={onPay} className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-emerald-50 text-emerald-700 text-xs font-bold hover:bg-emerald-100 transition-colors">
                <FaMoneyBillWave /> Record Payment
              </button>
              <button onClick={onArrears} className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-amber-50 text-amber-700 text-xs font-bold hover:bg-amber-100 transition-colors">
                <FaPlusCircle /> Add Arrears
              </button>
            </div>
            <div className="mt-2.5">
              <WhatsAppSendButton
                endpoint={`/fees/${fee.id}/send-whatsapp/`}
                className="w-full py-2.5"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Main component ───────────────────────────────────────────────────────

const FeesAdmin = () => {
  const [rows, setRows] = useState([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const [statusFilter, setStatusFilter] = useState("");
  const [termFilter, setTermFilter] = useState("");
  const [classFilter, setClassFilter] = useState("");
  const [classes, setClasses] = useState([]);
  const [classStudents, setClassStudents] = useState([]);
  const [searchInput, setSearchInput] = useState("");

  const [selectedFee, setSelectedFee] = useState(null);
  const [payTarget, setPayTarget] = useState(null);
  const [arrearsTarget, setArrearsTarget] = useState(null);
  const [modalBusy, setModalBusy] = useState(false);
  const [modalError, setModalError] = useState("");
  const [toast, setToast] = useState(null);
  const [bulkSummary, setBulkSummary] = useState(null);

  const load = useCallback(
    async (targetPage = 1, isRefresh = false) => {
      isRefresh ? setRefreshing(true) : setLoading(true);
      setError("");
      try {
        const params = { page: targetPage, page_size: pageSize };
        if (statusFilter) params.status = statusFilter;
        if (termFilter) params.term = termFilter;
        if (classFilter) params.school_class = classFilter;
        const data = await getFeesAdmin(params);
        const results = data.results ?? data;
        setRows(results);
        setCount(data.count ?? results.length);
        setPage(targetPage);
      } catch {
        setError("Failed to load fee records. Please try again.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [statusFilter, termFilter, classFilter]
  );

  useEffect(() => {
    load(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, termFilter, classFilter]);

  useEffect(() => {
    getSchoolClasses()
      .then((data) => setClasses(data.results || data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!classFilter) {
      setClassStudents([]);
      return;
    }
    getStudentsByClass(classFilter)
      .then((data) => setClassStudents(data.results || data))
      .catch(() => setClassStudents([]));
  }, [classFilter]);

  const visibleRows = useMemo(() => {
    if (!searchInput) return rows;
    const q = searchInput.toLowerCase();
    return rows.filter(
      (r) =>
        r.student_name?.toLowerCase().includes(q) ||
        r.admission_number?.toLowerCase().includes(q)
    );
  }, [rows, searchInput]);

  const refreshAfterAction = () => load(page, true);

  const sendBulkBills = async () => {
    if (!classFilter || !termFilter || !classStudents.length) return;
    if (!window.confirm(`Send a WhatsApp bill to ${classStudents.length} student${classStudents.length === 1 ? "" : "s"}?`)) return;
    try {
      const data = await sendBulkWhatsAppBills(classFilter, termFilter);
      setBulkSummary(data);
    } catch {
      setToast({ type: "error", message: "Could not send WhatsApp bills. Please try again." });
    }
  };

  const submitPayment = async ({ amount, note }) => {
    setModalBusy(true);
    setModalError("");
    try {
      await payFee(payTarget.id, { amount, note });
      setToast({ type: "success", message: `Payment of ${ghs(amount)} recorded for ${payTarget.student_name}.` });
      setPayTarget(null);
      setSelectedFee(null);
      refreshAfterAction();
    } catch (err) {
      setModalError(err?.response?.data?.error || "Could not record payment.");
    } finally {
      setModalBusy(false);
    }
  };

  const submitArrears = async (arrears) => {
    setModalBusy(true);
    setModalError("");
    try {
      await addArrears(arrearsTarget.id, arrears);
      setToast({ type: "success", message: `Arrears updated for ${arrearsTarget.student_name}.` });
      setArrearsTarget(null);
      setSelectedFee(null);
      refreshAfterAction();
    } catch (err) {
      setModalError(err?.response?.data?.error || "Could not update arrears.");
    } finally {
      setModalBusy(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil(count / pageSize));

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Fees</h1>
            <p className="text-sm text-slate-500 font-medium mt-0.5">
              Record payments, manage arrears, and review payment history
            </p>
          </div>
          <button
            onClick={() => load(page, true)}
            disabled={refreshing}
            className="w-11 h-11 flex items-center justify-center bg-white border border-slate-200 rounded-xl shadow-sm hover:shadow-md transition-all disabled:opacity-50 self-start sm:self-auto"
          >
            <FaSync className={`text-xs text-slate-600 ${refreshing ? "animate-spin" : ""}`} />
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search this page by student name or admission number…"
              className="w-full rounded-2xl border border-slate-200 bg-white pl-11 pr-4 py-3 text-sm font-medium shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500"
            />
          </div>
          <input
            type="text"
            value={termFilter}
            onChange={(e) => setTermFilter(e.target.value)}
            placeholder="Term (e.g. term1)"
            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40 sm:w-44"
          />
          <select
            value={classFilter}
            onChange={(e) => setClassFilter(e.target.value)}
            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40 sm:w-44"
          >
            <option value="">All classes</option>
            {classes.map((schoolClass) => <option key={schoolClass.id} value={schoolClass.id}>{schoolClass.name}</option>)}
          </select>
          <button
            onClick={sendBulkBills}
            disabled={!classFilter || !termFilter || !classStudents.length}
            className="rounded-2xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700 hover:bg-emerald-100 disabled:opacity-40"
          >
            Send bills via WhatsApp
          </button>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40 sm:w-40"
          >
            <option value="">All statuses</option>
            <option value="paid">Paid</option>
            <option value="partial">Partial</option>
            <option value="unpaid">Unpaid</option>
          </select>
        </div>

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
                  {["Student", "Term", "Total", "Paid", "Balance", "Status"].map((h) => (
                    <th key={h} className="px-4 py-3.5 text-left text-xs font-black text-slate-400 uppercase tracking-wider">
                      {h}
                    </th>
                  ))}
                  <th className="w-12" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {loading ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      {Array.from({ length: 6 }).map((_, j) => (
                        <td key={j} className="px-4 py-4">
                          <div className="h-3.5 bg-slate-100 rounded-full w-full max-w-[100px]" />
                        </td>
                      ))}
                      <td />
                    </tr>
                  ))
                ) : visibleRows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-16 text-center text-slate-400 font-medium">
                      No fee records match these filters.
                    </td>
                  </tr>
                ) : (
                  visibleRows.map((fee) => (
                    <tr
                      key={fee.id}
                      onClick={() => setSelectedFee(fee)}
                      className="hover:bg-slate-50/60 transition-colors cursor-pointer"
                    >
                      <td className="px-4 py-3.5">
                        <p className="font-bold text-slate-800">{fee.student_name}</p>
                        <p className="text-xs text-slate-400">{fee.admission_number}</p>
                      </td>
                      <td className="px-4 py-3.5 text-slate-600 font-medium">{fee.term}</td>
                      <td className="px-4 py-3.5 text-slate-700 font-semibold">{ghs(fee.total_amount)}</td>
                      <td className="px-4 py-3.5 text-emerald-700 font-semibold">{ghs(fee.paid)}</td>
                      <td className="px-4 py-3.5 text-red-600 font-bold">{ghs(fee.balance)}</td>
                      <td className="px-4 py-3.5"><StatusBadge status={feeStatus(fee)} /></td>
                      <td className="px-2 py-3.5">
                        <WhatsAppSendButton
                          endpoint={`/fees/${fee.id}/send-whatsapp/`}
                          className="mr-1"
                        />
                        <RowMenu
                          onPay={() => setPayTarget(fee)}
                          onArrears={() => setArrearsTarget(fee)}
                          onViewHistory={() => setSelectedFee(fee)}
                        />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between px-5 py-4 border-t border-slate-100">
            <p className="text-xs font-semibold text-slate-500">
              Page {page} of {totalPages} · {count.toLocaleString()} total
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

      {selectedFee && (
        <Drawer
          fee={selectedFee}
          onClose={() => setSelectedFee(null)}
          onPay={() => setPayTarget(selectedFee)}
          onArrears={() => setArrearsTarget(selectedFee)}
        />
      )}

      <PaymentModal
        fee={payTarget}
        busy={modalBusy}
        error={modalError}
        onClose={() => { setPayTarget(null); setModalError(""); }}
        onSubmit={submitPayment}
      />

      <ArrearsModal
        fee={arrearsTarget}
        busy={modalBusy}
        error={modalError}
        onClose={() => { setArrearsTarget(null); setModalError(""); }}
        onSubmit={submitArrears}
      />

      <Toast toast={toast} onClose={() => setToast(null)} />

      {bulkSummary && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-slate-800">WhatsApp bill results</h2>
              <button onClick={() => setBulkSummary(null)} className="text-slate-400 hover:text-slate-700 text-xl" aria-label="Close">×</button>
            </div>
            {["sent", "skipped-no-phone", "skipped-invalid-phone", "failed"].map((key) => {
              const items = bulkSummary[key] || bulkSummary[key.replaceAll("-", "_")] || [];
              const label = key === "skipped-no-phone" ? "No phone number" : key === "skipped-invalid-phone" ? "Invalid phone number" : key[0].toUpperCase() + key.slice(1);
              return <div key={key} className="mb-3"><p className="text-xs font-bold uppercase text-slate-400">{label}</p><p className="text-sm text-slate-700">{items.map((item) => { const id = item.student_id || item; const student = classStudents.find((s) => String(s.id) === String(id)); return student?.student_name || `${student?.first_name || ""} ${student?.last_name || ""}`.trim() || id; }).join(", ") || "None"}</p></div>;
            })}
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes slideIn { from { transform: translateX(100%); } to { transform: translateX(0); } }
        .animate-fade-in { animation: fadeIn 0.2s ease both; }
        .animate-fade-in-up { animation: fadeInUp 0.25s ease both; }
        .animate-slide-in { animation: slideIn 0.25s ease both; }
      `}</style>
    </div>
  );
};

export default FeesAdmin;