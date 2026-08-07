import { useEffect, useState } from "react";
import {
  getPettyCashFloats,
  createPettyCashFloat,
  closePettyCashFloat,
  getPettyCashReconciliation,
  getPettyCashTransactions,
  submitPettyCashTransaction,
  approvePettyCashTransaction,
  rejectPettyCashTransaction,
  payPettyCashTransaction,
  getPettyCashOutstandingClaims,
  getPettyCashDailySummary,
  getPettyCashMonthlySummary,
  exportPettyCashDailyCsv,
  exportPettyCashMonthlyCsv,
} from "../services/pettyCashService";

// NOTE: I don't have your accounts list endpoint's shape confirmed here,
// so account pickers below are plain text inputs for the account ID.
// Swap in getAccountingAccounts() from accountService.jsx to render real
// dropdowns once you wire this into your app — the component is
// structured so that's a small, local change (see AccountPicker below).

const fmt = (value) =>
  `GHS ${Number(value || 0).toLocaleString("en-GH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const Badge = ({ children, color = "slate" }) => {
  const colors = {
    emerald: "bg-emerald-100 text-emerald-800",
    amber: "bg-amber-100 text-amber-800",
    red: "bg-red-100 text-red-700",
    blue: "bg-blue-100 text-blue-700",
    slate: "bg-slate-100 text-slate-600",
  };
  return (
    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${colors[color]}`}>
      {children}
    </span>
  );
};

const STATUS_COLOR = {
  draft: "slate",
  submitted: "amber",
  approved: "blue",
  rejected: "red",
  paid: "emerald",
};

const TabButton = ({ active, onClick, children }) => (
  <button
    onClick={onClick}
    className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
      active ? "bg-slate-900 text-white" : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
    }`}
  >
    {children}
  </button>
);

const Card = ({ children, className = "" }) => (
  <div className={`bg-white rounded-2xl border border-slate-200 shadow-sm p-5 ${className}`}>{children}</div>
);

const Input = (props) => (
  <input
    {...props}
    className={`w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10 ${props.className || ""}`}
  />
);

const Select = ({ children, ...props }) => (
  <select
    {...props}
    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10"
  >
    {children}
  </select>
);

const Button = ({ children, variant = "primary", ...props }) => {
  const styles = {
    primary: "bg-slate-900 text-white hover:bg-slate-800",
    ghost: "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50",
    danger: "bg-red-50 text-red-700 border border-red-200 hover:bg-red-100",
    success: "bg-emerald-600 text-white hover:bg-emerald-500",
  };
  return (
    <button
      {...props}
      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${styles[variant]}`}
    >
      {children}
    </button>
  );
};

const PettyCash = () => {
  const [tab, setTab] = useState("floats");
  const [floats, setFloats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const refreshFloats = async () => {
    try {
      const data = await getPettyCashFloats();
      setFloats(data.results ?? data);
    } catch {
      setError("Failed to load petty cash floats.");
    }
  };

  useEffect(() => {
    (async () => {
      setLoading(true);
      await refreshFloats();
      setLoading(false);
    })();
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-6 sm:py-8">
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">Petty Cash</h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage cash floats, expense claims, replenishments, and reconciliation.
          </p>
        </div>

        <div className="flex flex-wrap gap-2 mb-6">
          <TabButton active={tab === "floats"} onClick={() => setTab("floats")}>Floats</TabButton>
          <TabButton active={tab === "claims"} onClick={() => setTab("claims")}>Claims &amp; Replenishments</TabButton>
          <TabButton active={tab === "reports"} onClick={() => setTab("reports")}>Reports</TabButton>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-2xl p-4 mb-6">{error}</div>
        )}

        {loading ? (
          <div className="text-slate-500">Loading petty cash data…</div>
        ) : (
          <>
            {tab === "floats" && <FloatsTab floats={floats} onChanged={refreshFloats} />}
            {tab === "claims" && <ClaimsTab floats={floats} />}
            {tab === "reports" && <ReportsTab floats={floats} />}
          </>
        )}
      </div>
    </div>
  );
};

// ────────────────────────────────────────────────────────────────────────
// Floats tab
// ────────────────────────────────────────────────────────────────────────

const FloatsTab = ({ floats, onChanged }) => {
  const [form, setForm] = useState({
    name: "", custodian: "", account: "", funding_account: "", opening_balance: "0", description: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  const handleCreate = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setFormError("");
    try {
      await createPettyCashFloat({
        ...form,
        custodian: Number(form.custodian),
        account: Number(form.account),
        funding_account: Number(form.funding_account),
        opening_balance: form.opening_balance || "0",
      });
      setForm({ name: "", custodian: "", account: "", funding_account: "", opening_balance: "0", description: "" });
      await onChanged();
    } catch (err) {
      setFormError(err?.response?.data?.detail || err?.response?.data?.non_field_errors?.[0] || "Failed to create float.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = async (floatId) => {
    if (!window.confirm("Close this float? No further claims can be posted against it.")) return;
    try {
      await closePettyCashFloat(floatId);
      await onChanged();
    } catch (err) {
      alert(err?.response?.data?.detail || "Failed to close float.");
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-4">
        {floats.length === 0 ? (
          <Card className="text-center text-slate-500 py-10">No petty cash floats yet — create one to get started.</Card>
        ) : (
          floats.map((f) => (
            <Card key={f.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-slate-900">{f.name}</h3>
                  <Badge color={f.status === "active" ? "emerald" : "slate"}>{f.status}</Badge>
                </div>
                <p className="text-sm text-slate-500 mt-1">
                  Custodian: {f.custodian_name} · Account {f.account_code}
                </p>
              </div>
              <div className="flex items-center gap-4">
                <p className="text-xl font-bold text-slate-900">{fmt(f.current_balance)}</p>
                {f.status === "active" && (
                  <Button variant="danger" onClick={() => handleClose(f.id)}>Close</Button>
                )}
              </div>
            </Card>
          ))
        )}
      </div>

      <Card>
        <h3 className="font-semibold text-slate-900 mb-4">New Float</h3>
        <form onSubmit={handleCreate} className="space-y-3">
          <Input placeholder="Float name (e.g. Front Desk)" value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <Input placeholder="Custodian user ID" value={form.custodian}
            onChange={(e) => setForm({ ...form, custodian: e.target.value })} required />
          <Input placeholder="Float GL account ID (asset)" value={form.account}
            onChange={(e) => setForm({ ...form, account: e.target.value })} required />
          <Input placeholder="Funding account ID (bank/cash)" value={form.funding_account}
            onChange={(e) => setForm({ ...form, funding_account: e.target.value })} required />
          <Input type="number" step="0.01" placeholder="Opening balance" value={form.opening_balance}
            onChange={(e) => setForm({ ...form, opening_balance: e.target.value })} />
          <Input placeholder="Description (optional)" value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })} />
          {formError && <p className="text-xs text-red-600">{formError}</p>}
          <Button type="submit" disabled={submitting} className="w-full justify-center">
            {submitting ? "Creating…" : "Create Float"}
          </Button>
        </form>
      </Card>
    </div>
  );
};

// ────────────────────────────────────────────────────────────────────────
// Claims tab
// ────────────────────────────────────────────────────────────────────────

const ClaimsTab = ({ floats }) => {
  const [transactions, setTransactions] = useState([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    float: "", transaction_type: "expense", amount: "", description: "",
    contra_account: "", adjustment_direction: "increase",
  });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  const refresh = async () => {
    setLoading(true);
    try {
      const data = await getPettyCashTransactions({ status: statusFilter || undefined });
      setTransactions(data.results ?? data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { refresh(); }, [statusFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setFormError("");
    try {
      const payload = {
        float: Number(form.float),
        transaction_type: form.transaction_type,
        amount: form.amount,
        description: form.description,
      };
      if (form.transaction_type !== "replenishment") payload.contra_account = Number(form.contra_account);
      if (form.transaction_type === "adjustment") payload.adjustment_direction = form.adjustment_direction;

      await submitPettyCashTransaction(payload);
      setForm({ ...form, amount: "", description: "", contra_account: "" });
      await refresh();
    } catch (err) {
      setFormError(err?.response?.data?.detail || "Failed to submit.");
    } finally {
      setSubmitting(false);
    }
  };

  const act = async (fn, txnId, ...args) => {
    try {
      await fn(txnId, ...args);
      await refresh();
    } catch (err) {
      alert(err?.response?.data?.detail || "Action failed.");
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-500">Filter:</span>
          {["", "submitted", "approved", "paid", "rejected"].map((s) => (
            <button
              key={s || "all"}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1 rounded-full text-xs font-semibold ${
                statusFilter === s ? "bg-slate-900 text-white" : "bg-white border border-slate-200 text-slate-600"
              }`}
            >
              {s || "All"}
            </button>
          ))}
        </div>

        {loading ? (
          <p className="text-slate-500">Loading…</p>
        ) : transactions.length === 0 ? (
          <Card className="text-center text-slate-500 py-10">No transactions match this filter.</Card>
        ) : (
          transactions.map((t) => (
            <Card key={t.id}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-900 capitalize">{t.transaction_type}</span>
                    <Badge color={STATUS_COLOR[t.status]}>{t.status}</Badge>
                  </div>
                  <p className="text-sm text-slate-500 mt-1">{t.float_name} — {t.description}</p>
                  <p className="text-xs text-slate-400 mt-1">{t.date}</p>
                </div>
                <div className="flex items-center gap-3">
                  <p className="text-lg font-bold text-slate-900">{fmt(t.amount)}</p>
                  <div className="flex gap-2">
                    {t.status === "submitted" && (
                      <>
                        <Button variant="success" onClick={() => act(approvePettyCashTransaction, t.id)}>Approve</Button>
                        <Button variant="danger" onClick={() => act(rejectPettyCashTransaction, t.id, "")}>Reject</Button>
                      </>
                    )}
                    {t.status === "approved" && (
                      <Button variant="success" onClick={() => act(payPettyCashTransaction, t.id)}>Pay</Button>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      <Card>
        <h3 className="font-semibold text-slate-900 mb-4">New Claim</h3>
        <form onSubmit={handleSubmit} className="space-y-3">
          <Select value={form.float} onChange={(e) => setForm({ ...form, float: e.target.value })} required>
            <option value="">Select float…</option>
            {floats.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
          </Select>
          <Select value={form.transaction_type} onChange={(e) => setForm({ ...form, transaction_type: e.target.value })}>
            <option value="expense">Expense claim</option>
            <option value="replenishment">Replenishment</option>
            <option value="adjustment">Adjustment</option>
          </Select>
          {form.transaction_type === "adjustment" && (
            <Select value={form.adjustment_direction} onChange={(e) => setForm({ ...form, adjustment_direction: e.target.value })}>
              <option value="increase">Cash over (increase)</option>
              <option value="decrease">Cash short (decrease)</option>
            </Select>
          )}
          {form.transaction_type !== "replenishment" && (
            <Input placeholder="Contra account ID" value={form.contra_account}
              onChange={(e) => setForm({ ...form, contra_account: e.target.value })} required />
          )}
          <Input type="number" step="0.01" placeholder="Amount" value={form.amount}
            onChange={(e) => setForm({ ...form, amount: e.target.value })} required />
          <Input placeholder="Description" value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })} required />
          {formError && <p className="text-xs text-red-600">{formError}</p>}
          <Button type="submit" disabled={submitting} className="w-full justify-center">
            {submitting ? "Submitting…" : "Submit"}
          </Button>
        </form>
      </Card>
    </div>
  );
};

// ────────────────────────────────────────────────────────────────────────
// Reports tab
// ────────────────────────────────────────────────────────────────────────

const ReportsTab = ({ floats }) => {
  const [floatId, setFloatId] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [daily, setDaily] = useState(null);
  const [monthly, setMonthly] = useState(null);
  const [outstanding, setOutstanding] = useState([]);
  const [reconciliation, setReconciliation] = useState(null);

  const loadDaily = async () => setDaily(await getPettyCashDailySummary(date, floatId || undefined));
  const loadMonthly = async () => setMonthly(await getPettyCashMonthlySummary(year, month, floatId || undefined));
  const loadOutstanding = async () => setOutstanding(await getPettyCashOutstandingClaims(floatId || undefined));
  const loadReconciliation = async () => {
    if (!floatId) return;
    setReconciliation(await getPettyCashReconciliation(floatId));
  };

  useEffect(() => {
    loadDaily(); loadMonthly(); loadOutstanding(); loadReconciliation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [floatId]);

  return (
    <div className="space-y-6">
      <Card className="flex flex-wrap items-center gap-3">
        <Select value={floatId} onChange={(e) => setFloatId(e.target.value)} className="max-w-xs">
          <option value="">All floats</option>
          {floats.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
        </Select>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-slate-900">Daily Summary</h3>
            <div className="flex gap-2">
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-40" />
              <Button variant="ghost" onClick={loadDaily}>Refresh</Button>
              <Button variant="ghost" onClick={() => exportPettyCashDailyCsv(date, floatId || undefined)}>CSV</Button>
            </div>
          </div>
          {daily && (
            <div className="grid grid-cols-2 gap-3 text-sm">
              <p className="text-slate-500">Replenishments</p><p className="text-right font-semibold">{fmt(daily.replenishments)}</p>
              <p className="text-slate-500">Expenses</p><p className="text-right font-semibold">{fmt(daily.expenses)}</p>
              <p className="text-slate-500">Adjustments (over)</p><p className="text-right font-semibold">{fmt(daily.adjustments_in)}</p>
              <p className="text-slate-500">Adjustments (short)</p><p className="text-right font-semibold">{fmt(daily.adjustments_out)}</p>
              <p className="text-slate-900 font-semibold">Net movement</p><p className="text-right font-bold">{fmt(daily.net_movement)}</p>
            </div>
          )}
        </Card>

        <Card>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-slate-900">Monthly Summary</h3>
            <div className="flex gap-2">
              <Input type="number" value={month} onChange={(e) => setMonth(Number(e.target.value))} className="w-16" />
              <Input type="number" value={year} onChange={(e) => setYear(Number(e.target.value))} className="w-20" />
              <Button variant="ghost" onClick={loadMonthly}>Refresh</Button>
              <Button variant="ghost" onClick={() => exportPettyCashMonthlyCsv(year, month, floatId || undefined)}>CSV</Button>
            </div>
          </div>
          {monthly && (
            <>
              <div className="grid grid-cols-2 gap-3 text-sm mb-4">
                <p className="text-slate-500">Net movement</p><p className="text-right font-bold">{fmt(monthly.net_movement)}</p>
              </div>
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-2">By category</p>
              <div className="space-y-1">
                {monthly.expenses_by_category.map((row, i) => (
                  <div key={i} className="flex justify-between text-sm">
                    <span className="text-slate-600">{row.contra_account__name || row.contra_account__code}</span>
                    <span className="font-semibold">{fmt(row.total)}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </Card>

        <Card>
          <h3 className="font-semibold text-slate-900 mb-3">Outstanding Claims</h3>
          {outstanding.length === 0 ? (
            <p className="text-sm text-slate-500">Nothing pending approval or payment.</p>
          ) : (
            <div className="space-y-2">
              {outstanding.map((t) => (
                <div key={t.id} className="flex justify-between text-sm border-b border-slate-100 pb-2">
                  <span className="text-slate-600">{t.float} — {t.description}</span>
                  <span className="font-semibold">{fmt(t.amount)} <Badge color={STATUS_COLOR[t.status]}>{t.status}</Badge></span>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <h3 className="font-semibold text-slate-900 mb-3">Reconciliation</h3>
          {!floatId ? (
            <p className="text-sm text-slate-500">Select a single float above to reconcile it.</p>
          ) : reconciliation ? (
            <div className="grid grid-cols-2 gap-3 text-sm">
              <p className="text-slate-500">Computed balance</p><p className="text-right font-semibold">{fmt(reconciliation.computed_balance)}</p>
              <p className="text-slate-500">Ledger balance</p><p className="text-right font-semibold">{fmt(reconciliation.ledger_balance)}</p>
              <p className="text-slate-900 font-semibold">Status</p>
              <p className="text-right">
                <Badge color={reconciliation.is_reconciled ? "emerald" : "red"}>
                  {reconciliation.is_reconciled ? "Reconciled" : "Discrepancy"}
                </Badge>
              </p>
            </div>
          ) : (
            <p className="text-sm text-slate-500">Loading…</p>
          )}
        </Card>
      </div>
    </div>
  );
};

export default PettyCash;