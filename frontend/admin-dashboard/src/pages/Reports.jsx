import { useEffect, useState } from "react";
import API from "../services/api";
import ReportsTab from "./teacher/tabs/ReportsTab";

const TERMS = [
  { value: "term1", label: "Term 1" },
  { value: "term2", label: "Term 2" },
  { value: "term3", label: "Term 3" },
];

const YEARS = [2026, 2025, 2024, 2023, 2022];

const listData = (data) => data.results ?? data;

const Reports = () => {
  const [classes, setClasses] = useState([]);
  const [students, setStudents] = useState([]);
  const [selectedClass, setSelectedClass] = useState("");
  const [selectedTerm, setSelectedTerm] = useState("term1");
  const [selectedYear, setSelectedYear] = useState("2026");
  const [loadingClasses, setLoadingClasses] = useState(true);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    API.get("/classes/")
      .then(({ data }) => {
        if (!cancelled) setClasses(listData(data));
      })
      .catch(() => {
        if (!cancelled) setError("Unable to load classes.");
      })
      .finally(() => {
        if (!cancelled) setLoadingClasses(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!selectedClass) {
      setStudents([]);
      return;
    }

    let cancelled = false;
    setLoadingStudents(true);
    setError("");
    API.get(`/students/?school_class=${selectedClass}`)
      .then(({ data }) => {
        if (!cancelled) setStudents(listData(data));
      })
      .catch(() => {
        if (!cancelled) {
          setStudents([]);
          setError("Unable to load students for this class.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingStudents(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedClass]);

  const selectedClassName = classes.find(
    (schoolClass) => String(schoolClass.id) === String(selectedClass)
  )?.name ?? "";

  return (
    <main className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6">
      <header>
        <h1 className="text-2xl font-bold text-slate-900">Student Reports</h1>
        <p className="mt-1 text-sm text-slate-500">Review term report cards and download PDFs.</p>
      </header>

      <section className="flex flex-wrap items-end gap-4 border-b border-slate-200 pb-5">
        <label className="grid gap-1 text-sm font-medium text-slate-700">
          Class
          <select
            value={selectedClass}
            onChange={(event) => setSelectedClass(event.target.value)}
            disabled={loadingClasses}
            className="min-w-52 rounded-md border border-slate-300 bg-white px-3 py-2"
          >
            <option value="">Select a class</option>
            {classes.map((schoolClass) => (
              <option key={schoolClass.id} value={schoolClass.id}>{schoolClass.name}</option>
            ))}
          </select>
        </label>

        <label className="grid gap-1 text-sm font-medium text-slate-700">
          Term
          <select
            value={selectedTerm}
            onChange={(event) => setSelectedTerm(event.target.value)}
            className="min-w-36 rounded-md border border-slate-300 bg-white px-3 py-2"
          >
            {TERMS.map((term) => <option key={term.value} value={term.value}>{term.label}</option>)}
          </select>
        </label>

        <label className="grid gap-1 text-sm font-medium text-slate-700">
          Year
          <select
            value={selectedYear}
            onChange={(event) => setSelectedYear(event.target.value)}
            className="min-w-28 rounded-md border border-slate-300 bg-white px-3 py-2"
          >
            {YEARS.map((year) => <option key={year} value={year}>{year}</option>)}
          </select>
        </label>

        {(loadingClasses || loadingStudents) && (
          <p className="pb-2 text-sm text-slate-500" role="status">
            {loadingClasses ? "Loading classes…" : "Loading students…"}
          </p>
        )}
      </section>

      {error && <p className="text-sm text-red-700" role="alert">{error}</p>}

      {selectedClass ? (
        <ReportsTab
          key={selectedClass}
          students={students}
          selectedClassName={selectedClassName}
          selectedTerm={selectedTerm}
          selectedYear={selectedYear}
        />
      ) : (
        <p className="py-10 text-center text-sm text-slate-500">Select a class to view term reports.</p>
      )}
    </main>
  );
};

export default Reports;