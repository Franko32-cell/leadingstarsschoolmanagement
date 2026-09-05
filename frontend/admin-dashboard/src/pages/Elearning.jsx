import { useEffect, useState } from "react";
import API from "../services/api";

const readList = (data) => data?.results ?? data ?? [];
const formatDate = (value) => value ? new Date(value).toLocaleString() : "-";

const Stat = ({ label, value, tone }) => (
  <div className={`rounded-2xl border p-5 ${tone}`}>
    <p className="text-xs font-bold uppercase tracking-[0.2em] opacity-70">{label}</p>
    <p className="mt-2 text-3xl font-black">{value}</p>
  </div>
);

const Elearning = () => {
  const [lessons, setLessons] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const [lessonResponse, assignmentResponse, submissionResponse] = await Promise.all([
          API.get("/lessons/"),
          API.get("/assignments/"),
          API.get("/submissions/"),
        ]);
        setLessons(readList(lessonResponse.data));
        setAssignments(readList(assignmentResponse.data));
        setSubmissions(readList(submissionResponse.data));
      } catch {
        setError("Unable to load e-learning data.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-blue-600">Academic workspace</p>
          <h1 className="mt-1 text-3xl font-black tracking-tight text-slate-900">E-learning</h1>
          <p className="mt-1 text-sm text-slate-500">Monitor lessons, assignments, and student submissions across the school.</p>
        </div>
        <button type="button" onClick={() => window.location.reload()} className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 hover:border-blue-300 hover:text-blue-600">Refresh</button>
      </div>

      {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      {loading ? <div className="rounded-2xl bg-white p-10 text-center text-sm text-slate-500">Loading e-learning data…</div> : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <Stat label="Lessons" value={lessons.length} tone="border-blue-100 bg-blue-50 text-blue-800" />
            <Stat label="Assignments" value={assignments.length} tone="border-amber-100 bg-amber-50 text-amber-800" />
            <Stat label="Submissions" value={submissions.length} tone="border-emerald-100 bg-emerald-50 text-emerald-800" />
          </div>

          <section className="rounded-2xl border border-slate-100 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-5 py-4"><h2 className="font-bold text-slate-900">Assignments</h2><p className="text-sm text-slate-500">Published work and submission activity.</p></div>
            {assignments.length === 0 ? <p className="p-8 text-center text-sm text-slate-500">No assignments have been published.</p> : <div className="divide-y divide-slate-100">{assignments.map((assignment) => { const count = submissions.filter((item) => String(item.assignment) === String(assignment.id)).length; return <div key={assignment.id} className="flex flex-col gap-2 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-semibold text-slate-800">{assignment.title}</p><p className="text-xs text-slate-500">{assignment.subject_name || "General"} · Due {formatDate(assignment.due_date)}</p></div><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">{count} submission{count === 1 ? "" : "s"}</span></div>; })}</div>}
          </section>

          <section className="rounded-2xl border border-slate-100 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-5 py-4"><h2 className="font-bold text-slate-900">Recent submissions</h2><p className="text-sm text-slate-500">Latest student work received by teachers.</p></div>
            {submissions.length === 0 ? <p className="p-8 text-center text-sm text-slate-500">No submissions received yet.</p> : <div className="divide-y divide-slate-100">{submissions.slice(0, 10).map((submission) => { const assignment = assignments.find((item) => String(item.id) === String(submission.assignment)); return <div key={submission.id} className="flex flex-col gap-1 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-semibold text-slate-800">{assignment?.title || `Assignment #${submission.assignment}`}</p><p className="text-xs text-slate-500">Student #{submission.student} · Submitted {formatDate(submission.submitted_at)}</p></div><span className={`rounded-full px-3 py-1 text-xs font-bold ${submission.score == null ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700"}`}>{submission.score == null ? "Needs marking" : `${submission.score}/${assignment?.max_score ?? 100}`}</span></div>; })}</div>}
          </section>
        </>
      )}
    </div>
  );
};

export default Elearning;