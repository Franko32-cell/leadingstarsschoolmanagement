import { useEffect, useState } from "react";
import API from "../services/api";

const readList = (data) => data?.results ?? data ?? [];

const fetchAllPages = async (endpoint) => {
  const items = [];
  let next = endpoint;

  while (next) {
    const { data } = await API.get(next);
    if (Array.isArray(data)) {
      items.push(...data);
      break;
    }
    items.push(...readList(data));
    if (!data.next) break;
    next = `${endpoint}${new URL(data.next, window.location.origin).search}`;
  }

  return items;
};

const formatDate = (value) => {
  if (!value) return "Not set";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Not set" : date.toLocaleString();
};

const termLabel = (term) => ({
  term1: "Term 1",
  term2: "Term 2",
  term3: "Term 3",
}[term] || term || "Not set");

const Stat = ({ label, value, tone }) => (
  <div className={`rounded-lg border p-4 ${tone}`}>
    <p className="text-xs font-bold uppercase tracking-wide opacity-70">{label}</p>
    <p className="mt-2 text-3xl font-black">{value}</p>
  </div>
);

const Detail = ({ label, children }) => (
  <div>
    <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</dt>
    <dd className="mt-1 whitespace-pre-wrap text-sm text-slate-700">{children || "Not provided"}</dd>
  </div>
);

const FileLink = ({ href, label }) => href ? (
  <a className="text-sm font-semibold text-blue-700 underline underline-offset-2" href={href} target="_blank" rel="noreferrer">
    {label}
  </a>
) : null;

const Elearning = () => {
  const [lessons, setLessons] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [classes, setClasses] = useState([]);
  const [view, setView] = useState("assignments");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const [lessonList, assignmentList, submissionList, classList] = await Promise.all([
          fetchAllPages("/lessons/"),
          fetchAllPages("/assignments/"),
          fetchAllPages("/submissions/"),
          fetchAllPages("/classes/"),
        ]);
        if (!cancelled) {
          setLessons(lessonList);
          setAssignments(assignmentList);
          setSubmissions(submissionList);
          setClasses(classList);
        }
      } catch {
        if (!cancelled) setError("Unable to load e-learning data.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const className = (id) => classes.find((item) => String(item.id) === String(id))?.name || `Class #${id}`;
  const visibleItems = view === "assignments" ? assignments : lessons;

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-700">Academic workspace</p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900">E-learning</h1>
          <p className="mt-1 text-sm text-slate-600">School-wide lessons, assignments, and student submissions.</p>
        </div>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          Refresh
        </button>
      </header>

      {error && <p className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">{error}</p>}

      {loading ? (
        <p className="py-10 text-center text-sm text-slate-500" role="status">Loading e-learning data…</p>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <Stat label="Lessons" value={lessons.length} tone="border-blue-200 bg-blue-50 text-blue-900" />
            <Stat label="Assignments" value={assignments.length} tone="border-amber-200 bg-amber-50 text-amber-900" />
            <Stat label="Submissions" value={submissions.length} tone="border-emerald-200 bg-emerald-50 text-emerald-900" />
          </div>

          <div className="flex gap-1 border-b border-slate-200" role="tablist" aria-label="E-learning content">
            {["assignments", "lessons"].map((item) => (
              <button
                key={item}
                type="button"
                role="tab"
                aria-selected={view === item}
                onClick={() => setView(item)}
                className={`border-b-2 px-4 py-2 text-sm font-semibold capitalize ${view === item ? "border-blue-700 text-blue-800" : "border-transparent text-slate-600 hover:text-slate-900"}`}
              >
                {item} ({item === "assignments" ? assignments.length : lessons.length})
              </button>
            ))}
          </div>

          {visibleItems.length === 0 ? (
            <p className="py-10 text-center text-sm text-slate-500">No {view} have been published.</p>
          ) : (
            <section className="space-y-3" aria-label={`All ${view}`}>
              {view === "assignments" ? assignments.map((assignment) => {
                const submissionCount = submissions.filter(
                  (item) => String(item.assignment) === String(assignment.id)
                ).length;
                return (
                  <article key={assignment.id} className="border-b border-slate-200 py-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <h2 className="text-lg font-semibold text-slate-900">{assignment.title}</h2>
                        <p className="mt-1 text-sm text-slate-600">{assignment.instructions || "No instructions provided."}</p>
                      </div>
                      <span className="shrink-0 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                        {submissionCount} submission{submissionCount === 1 ? "" : "s"}
                      </span>
                    </div>
                    <dl className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                      <Detail label="Class">{className(assignment.school_class)}</Detail>
                      <Detail label="Subject">{assignment.subject_name || "General"}</Detail>
                      <Detail label="Teacher">{assignment.teacher_name || "Not assigned"}</Detail>
                      <Detail label="Term / Year">{`${termLabel(assignment.term)} ${assignment.year || ""}`}</Detail>
                      <Detail label="Due">{formatDate(assignment.due_date)}</Detail>
                      <Detail label="Maximum score">{assignment.max_score ?? "Not set"}</Detail>
                      <Detail label="Published">{formatDate(assignment.created_at)}</Detail>
                    </dl>
                    {assignment.attachment && <div className="mt-3"><FileLink href={assignment.attachment} label="Open assignment attachment" /></div>}
                  </article>
                );
              }) : lessons.map((lesson) => (
                <article key={lesson.id} className="border-b border-slate-200 py-4">
                  <h2 className="text-lg font-semibold text-slate-900">{lesson.title}</h2>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-slate-600">{lesson.description || "No description provided."}</p>
                  <dl className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <Detail label="Class">{className(lesson.school_class)}</Detail>
                    <Detail label="Subject">{lesson.subject_name || "General"}</Detail>
                    <Detail label="Teacher">{lesson.teacher_name || "Not assigned"}</Detail>
                    <Detail label="Term / Year">{`${termLabel(lesson.term)} ${lesson.year || ""}`}</Detail>
                    <Detail label="Published">{formatDate(lesson.created_at)}</Detail>
                    <Detail label="Last updated">{formatDate(lesson.updated_at)}</Detail>
                  </dl>
                  <div className="mt-3 flex flex-wrap gap-4">
                    <FileLink href={lesson.attachment} label="Open lesson attachment" />
                    <FileLink href={lesson.video_url} label="Watch lesson video" />
                    {!lesson.attachment && !lesson.video_url && <span className="text-sm text-slate-500">No linked materials.</span>}
                  </div>
                </article>
              ))}
            </section>
          )}

          <section className="border-t border-slate-200 pt-5">
            <h2 className="text-lg font-semibold text-slate-900">Recent submissions</h2>
            <p className="mt-1 text-sm text-slate-600">Latest student work received by teachers.</p>
            {submissions.length === 0 ? (
              <p className="py-6 text-sm text-slate-500">No submissions received yet.</p>
            ) : (
              <div className="mt-3 divide-y divide-slate-100">
                {submissions.slice(0, 10).map((submission) => {
                  const assignment = assignments.find((item) => String(item.id) === String(submission.assignment));
                  return (
                    <div key={submission.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="font-medium text-slate-800">{assignment?.title || `Assignment #${submission.assignment}`}</p>
                        <p className="text-xs text-slate-500">Student #{submission.student} · Submitted {formatDate(submission.submitted_at)}</p>
                        {submission.text_answer && <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{submission.text_answer}</p>}
                        {submission.file && <div className="mt-2"><FileLink href={submission.file} label="Open submitted file" /></div>}
                        {submission.feedback && <p className="mt-2 text-sm text-slate-600">Feedback: {submission.feedback}</p>}
                      </div>
                      <span className={`text-sm font-semibold ${submission.score == null ? "text-amber-700" : "text-emerald-700"}`}>
                        {submission.score == null ? "Needs marking" : `${submission.score}/${assignment?.max_score ?? 100}`}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
};

export default Elearning;