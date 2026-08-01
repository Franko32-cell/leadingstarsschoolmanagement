import { useEffect, useMemo, useState } from "react";
import { getAccountingAccounts, getAccountingTrialBalance } from "../services/accountService";

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

const DataTable = ({ headers, children, empty }) => (
  <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
    <div className="overflow-x-auto -webkit-overflow-scrolling-touch">
      <table className="w-full text-sm min-w-[700px]">
        <thead>
          <tr className="bg-slate-50 border-b border-slate-200">
            {headers.map(({ label, align = "center" }) => (
              <th
                key={label}
                className={`px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-widest whitespace-nowrap ${
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

const Td = ({ children, align = "center" }) => (
  <td className={`px-4 py-3 ${align === "left" ? "text-left" : "text-center"}`}>
    {children}
  </td>
);

const Accounting = () => {
  const [accounts, setAccounts] = useState([]);
  const [trialBalance, setTrialBalance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadData = async () => {
      try {
        const [accountsData, trialBalanceData] = await Promise.all([
          getAccountingAccounts(),
          getAccountingTrialBalance(),
        ]);

        setAccounts(accountsData.results ?? accountsData);
        setTrialBalance(trialBalanceData);
      } catch (err) {
        setError("Failed to load accounting data. Please refresh the page.");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const totals = useMemo(() => trialBalance?.totals ?? {}, [trialBalance]);

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-6 sm:py-8">
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">Accounting</h1>
          <p className="text-sm text-slate-500 mt-1">
            Chart of accounts, trial balance totals, and ledger overview.
          </p>
        </div>

        {error ? (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-2xl p-4">
            {error}
          </div>
        ) : loading ? (
          <div className="text-slate-500">Loading accounting data…</div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Assets</p>
                <p className="mt-4 text-3xl font-bold text-emerald-600">{fmt(totals.asset)}</p>
              </div>
              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Liabilities</p>
                <p className="mt-4 text-3xl font-bold text-slate-700">{fmt(totals.liability)}</p>
              </div>
              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Equity</p>
                <p className="mt-4 text-3xl font-bold text-slate-700">{fmt(totals.equity)}</p>
              </div>
              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Income / Expense</p>
                <p className="mt-4 text-3xl font-bold text-slate-700">{fmt((Number(totals.income) || 0) - (Number(totals.expense) || 0))}</p>
              </div>
            </div>

            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-200">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900">Chart of Accounts</h2>
                    <p className="text-sm text-slate-500">Review the active account ledger structure.</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge color="emerald">Active</Badge>
                    <Badge color="slate">System</Badge>
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[780px]">
                  <thead className="bg-slate-50 text-slate-500 uppercase tracking-widest text-xs">
                    <tr>
                      <th className="px-4 py-3 text-left">Code</th>
                      <th className="px-4 py-3 text-left">Name</th>
                      <th className="px-4 py-3 text-center">Type</th>
                      <th className="px-4 py-3 text-right">Balance</th>
                      <th className="px-4 py-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {accounts.map((account) => (
                      <tr key={account.id} className="hover:bg-slate-50 transition-colors">
                        <Td align="left">{account.code}</Td>
                        <Td align="left">{account.name}</Td>
                        <Td>{account.account_type}</Td>
                        <Td align="right">{fmt(account.balance)}</Td>
                        <Td>{account.is_active ? "Active" : "Inactive"}</Td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Accounting;
