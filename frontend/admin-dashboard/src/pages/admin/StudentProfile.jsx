import { useEffect, useState } from "react";
import API from "../../services/api";

const TERMS = [
  { value: "term1", label: "Term 1" },
  { value: "term2", label: "Term 2" },
  { value: "term3", label: "Term 3" },
];
const YEARS = [2026, 2025, 2024, 2023, 2022];
const TABS = ["Overview", "Fees & Payments", "Results"];

const fmtDate = (v) => (v ? v : "—");

const FeeBadge = ({ fee }) => {
  if (fee.balance <= 0)
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700">
        ✓ Paid
      </span>
    );
  if (fee.paid > 0)
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700">
        ◑ Partial
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-red-50 text-red-600">
      ✕ Unpaid
    </span>
  );
};

const Field = ({ label, value }) => (
  <div>
    <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">{label}</p>
    <p className="text-sm font-semibold text-slate-800 mt-0.5">{value || "—"}</p>
  </div>
);

const Section = ({ title, children }) => (
  <div>
    <p className="text-xs font-black uppercase tracking-wide text-slate-400 mb-3">{title}</p>
    <div className="grid grid-cols-2 gap-x-4 gap-y-3">{children}</div>
  </div>
);

const Overview = ({ student: s }) => (
  <div className="space-y-6">
    {s.photo_url && (
      <img
        src={s.photo_url}
        alt={s.student_name || s.username}
        className="w-24 h-24 rounded-2xl object-cover border border-slate-100 shadow-sm"
      />
    )}
    <Section title="Personal Information">
      <Field label="Full name" value={s.student_name || s.username} />
      <Field label="Admission number" value={s.admission_number} />
      <Field label="Username" value={s.username} />
      <Field label="Email" value={s.email} />
      <Field label="Gender" value={s.gender} />
      <Field label="Date of birth" value={s.date_of_birth} />
      <Field label="Phone" value={s.phone} />
      <Field label="Nationality" value={s.nationality} />
      <Field label="Religion" value={s.religion} />
    </Section>
    <Section title="Academic">
      <Field label="Class" value={s.class_name || "Unassigned"} />
      <Field label="Admission date" value={s.admission_date} />
      <Field label="Previous school" value={s.previous_school} />
    </Section>
    <Section title="Parent / Guardian">
      <Field label="Name" value={s.parent_name} />
      <Field label="Phone" value={s.parent_phone} />
    </Section>
    {s.address && (
      <Section title="Address">
        <div className="col-span-2">
          <p className="text-sm font-semibold text-slate-800">{s.address}</p>
        </div>
      </Section>
    )}
    {s.health_notes && (
      <Section title="Health Notes">
        <div className="col-span-2">
          <p className="text-sm font-semibold text-slate-800">{s.health_notes}</p>
        </div>
      </Section>
    )}
  </div>
);

const FeesPayments = ({ studentId }) => {
  const [fees, setFees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState(null);
  const [downloading, setDownloading] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const r = await API.get(`/fees/?student=${studentId}`);
        if (!cancelled) setFees(r.data.results || r.data);
      } catch {
        if (!cancelled) setError("Failed to load fee records.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [studentId]);

  const downloadReceipt = async (txnId) => {
    setDownloading(txnId);
    try {
      const r = await API.get(`/fees/receipt/${txnId}/`, { responseType: "blob" });
      const link = document.createElement("a");
      link.href = window.URL.createObjectURL(new Blob([r.data]));
      link.setAttribute("download", `receipt_${txnId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch {
      setError("Receipt download failed.");
    } finally {
      setDownloading(null);
    }
  };

  if (loading) return <div className="text-center py-12 text-slate-400 text-sm">Loading fee records…</div>;
  if (error) return <div className="text-center py-12 text-red-500 text-sm">{error}</div>;
  if (!fees.length) return <div className="text-center py-12 text-slate-400 text-sm">No fee records for this student yet.</div>;

  const totalPaid = fees.reduce((sum, f) => sum + Number(f.paid || 0), 0);
  const totalBalance = fees.reduce((sum, f) => sum + Number(f.balance || 0), 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-emerald-50 rounded-xl p-3 text-center">
          <p className="text-lg font-black text-emerald-700">GHS {totalPaid.toLocaleString()}</p>
          <p className="text-[11px] font-bold text-emerald-600 mt-0.5">Total Paid</p>
        </div>
        <div className="bg-red-50 rounded-xl p-3 text-center">
          <p className="text-lg font-black text-red-600">GHS {totalBalance.toLocaleString()}</p>
          <p className="text-[11px] font-bold text-red-500 mt-0.5">Total Outstanding</p>
        </div>
      </div>

      <div className="space-y-2">
        {fees.map((fee) => {
          const isOpen = expanded === fee.id;
          const term = TERMS.find((t) => t.value === fee.term)?.label || fee.term;
          return (
            <div key={fee.id} className="border border-slate-100 rounded-xl overflow-hidden">
              <button
                onClick={() => setExpanded(isOpen ? null : fee.id)}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition-colors"
              >
                <div className="text-left">
                  <p className="text-sm font-bold text-slate-800">{term}</p>
                  <p className="text-xs text-slate-400">
                    Total GHS {Number(fee.total_amount).toLocaleString()} · Paid GHS {Number(fee.paid).toLocaleString()}
                  </p>
                </div>
                <FeeBadge fee={fee} />
              </button>

              {isOpen && (
                <div className="border-t border-slate-100 px-4 py-3 bg-slate-50/60">
                  <p className="text-[11px] font-black uppercase tracking-wide text-slate-400 mb-2">
                    Payment History ({fee.transactions?.length || 0})
                  </p>
                  {!fee.transactions?.length ? (
                    <p className="text-xs text-slate-400">No payments recorded yet.</p>
                  ) : (
                    <div className="space-y-2">
                      {fee.transactions.map((t) => (
                        <div key={t.id} className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-slate-100">
                          <div>
                            <p className="text-xs font-bold text-slate-700">GHS {Number(t.amount).toLocaleString()}</p>
                            <p className="text-[11px] text-slate-400">{t.created_at_display} · by {t.recorded_by_name || "System"}</p>
                            {t.note && <p className="text-[11px] text-slate-400 italic mt-0.5">"{t.note}"</p>}
                          </div>
                          <button
                            onClick={() => downloadReceipt(t.id)}
                            disabled={downloading === t.id}
                            className="text-[11px] font-bold text-blue-500 hover:text-blue-700 underline underline-offset-2 disabled:opacity-50"
                          >
                            {downloading === t.id ? "…" : "Receipt"}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

const Results = ({ studentId }) => {
  const [term, setTerm] = useState("term1");
  const [year, setYear] = useState(String(YEARS[0]));
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError("");
      setReport(null);
      try {
        const r = await API.get(`/report/student/${studentId}/?term=${term}&year=${year}`);
        if (!cancelled) setReport(r.data);
      } catch {
        if (!cancelled) setError("No results found for this term/year.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [studentId, term, year]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <select
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          className="border border-slate-200 p-2 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
        >
          {TERMS.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
        <select
          value={year}
          onChange={(e) => setYear(e.target.value)}
          className="border border-slate-200 p-2 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
        >
          {YEARS.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
      </div>

      {loading && <div className="text-center py-12 text-slate-400 text-sm">Loading results…</div>}
      {!loading && error && <div className="text-center py-12 text-slate-400 text-sm">{error}</div>}

      {!loading && report && (
        <>
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-indigo-50 rounded-xl p-3 text-center">
              <p className="text-lg font-black text-indigo-700">{report.average_score}</p>
              <p className="text-[11px] font-bold text-indigo-600 mt-0.5">Average</p>
            </div>
            <div className="bg-purple-50 rounded-xl p-3 text-center">
              <p className="text-lg font-black text-purple-700">{report.overall_grade}</p>
              <p className="text-[11px] font-bold text-purple-600 mt-0.5">Grade</p>
            </div>
            <div className="bg-blue-50 rounded-xl p-3 text-center">
              <p className="text-lg font-black text-blue-700">
                {report.show_position ? report.position_formatted : "—"}
              </p>
              <p className="text-[11px] font-bold text-blue-600 mt-0.5">
                Position {report.show_position && report.position_formatted !== "N/A" ? `/ ${report.out_of}` : ""}
              </p>
            </div>
          </div>

          <div className="border border-slate-100 rounded-xl overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  {['Subject', 'Score', 'Grade', 'Position'].map((h) => (
                    <th key={h} className="px-3 py-2 text-left font-bold text-slate-400 uppercase tracking-wide">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {report.subjects.map((sub, i) => (
                  <tr key={i}>
                    <td className="px-3 py-2 font-semibold text-slate-700">{sub.subject}</td>
                    <td className="px-3 py-2 text-slate-600">{sub.score}</td>
                    <td className="px-3 py-2 text-slate-600">{sub.grade}</td>
                    <td className="px-3 py-2 text-slate-600">{sub.subject_position ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {(report.attendance_percent != null || report.teacher_remark) && (
            <Section title="Term Report">
              <Field label="Attendance" value={report.attendance_percent != null ? `${report.attendance_percent}%` : null} />
              <Field label="Conduct" value={report.conduct} />
              <div className="col-span-2">
                <Field label="Teacher's Remark" value={report.teacher_remark} />
              </div>
            </Section>
          )}
        </>
      )}
    </div>
  );
};

const StudentProfile = ({ student }) => {
  const [tab, setTab] = useState("Overview");

  return (
    <div>
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl mb-5 w-fit">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-150 ${
              tab === t ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "Overview" && <Overview student={student} />}
      {tab === "Fees & Payments" && <FeesPayments studentId={student.id} />}
      {tab === "Results" && <Results studentId={student.id} />}
    </div>
  );
};

export default StudentProfile;
