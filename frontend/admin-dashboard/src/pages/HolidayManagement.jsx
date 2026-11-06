import React, { useEffect, useState } from "react";
import {
  getHolidays,
  createHoliday,
  updateHoliday,
  deleteHoliday,
} from "../services/schoolCalendarService";
import { apiError } from "../utils/apiError";

const EVENT_TYPES = [
  { value: "holiday",        label: "Holiday" },
  { value: "mid_term_break", label: "Mid-Term Break" },
  { value: "vacation",       label: "Vacation" },
  { value: "public_holiday", label: "Public Holiday" },
  { value: "school_closure", label: "School Closure" },
  { value: "staff_training", label: "Staff Training" },
  { value: "special_event",  label: "Special Event" },
  { value: "other",          label: "Other" },
];

const TERMS = [
  { value: "term1", label: "Term 1" },
  { value: "term2", label: "Term 2" },
  { value: "term3", label: "Term 3" },
];

const typeLabel = (v) => EVENT_TYPES.find((t) => t.value === v)?.label || v;
const termLabel = (v) => TERMS.find((t) => t.value === v)?.label || "";

const fmt = (iso) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, {
    weekday: "short", day: "numeric", month: "short", year: "numeric",
  });

const dayCount = (start, end) =>
  Math.round((new Date(`${end}T00:00:00`) - new Date(`${start}T00:00:00`)) / 86400000) + 1;

const academicYears = () => {
  const y = new Date().getFullYear();
  return Array.from({ length: 6 }, (_, i) => y + 1 - i);
};

const emptyForm = (year) => ({
  name: "", event_type: "holiday", mode: "single",
  start_date: "", end_date: "", year, term: "", description: "", is_school_day: false,
});

const input =
  "w-full border border-gray-200 bg-white text-gray-800 px-3 py-2 rounded-xl text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-300";
const label = "text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1 block";

const HolidayManagement = () => {
  const thisYear = new Date().getFullYear();
  const [year, setYear] = useState(thisYear);
  const [term, setTerm] = useState("");
  const [tick, setTick] = useState(0);   // bump to reload after a change
  const [data, setData] = useState({ key: null, items: [], error: "" });
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [form, setForm] = useState(null);     // null = closed
  const [editingId, setEditingId] = useState(null);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [toDelete, setToDelete] = useState(null);

  const key = `${year}|${term}|${tick}`;
  const loading = data.key !== key;
  const items = data.items;
  const load = () => setTick((t) => t + 1);
  const shownError = error || (loading ? "" : data.error);

  useEffect(() => {
    let cancelled = false;
    getHolidays({ year, term: term || undefined })
      .then((list) => !cancelled && setData({ key, items: list, error: "" }))
      .catch((e) => !cancelled && setData({
        key, items: [], error: apiError(e, "Failed to load the school calendar."),
      }));
    return () => { cancelled = true; };
  }, [year, term, key]);

  useEffect(() => {
    if (!notice) return undefined;
    const t = setTimeout(() => setNotice(""), 5000);
    return () => clearTimeout(t);
  }, [notice]);

  const openAdd = () => {
    setEditingId(null);
    setFormError("");
    setForm({ ...emptyForm(year), term });
  };

  const openEdit = (h) => {
    setEditingId(h.id);
    setFormError("");
    setForm({
      name: h.name, event_type: h.event_type,
      mode: h.start_date === h.end_date ? "single" : "range",
      start_date: h.start_date, end_date: h.end_date,
      year: h.year, term: h.term || "", description: h.description || "",
      is_school_day: h.is_school_day,
    });
  };

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return setFormError("Give the entry a name.");
    if (!form.start_date) return setFormError("Choose a date.");
    const end = form.mode === "single" ? form.start_date : form.end_date;
    if (!end) return setFormError("Choose an end date.");
    if (end < form.start_date) return setFormError("End date cannot be before the start date.");

    setSaving(true);
    setFormError("");
    const payload = {
      name: form.name.trim(), event_type: form.event_type,
      start_date: form.start_date, end_date: end,
      year: Number(form.year), term: form.term, description: form.description,
      is_school_day: form.is_school_day,
    };
    try {
      if (editingId) await updateHoliday(editingId, payload);
      else await createHoliday(payload);
      setForm(null);
      setNotice(editingId ? "Calendar entry updated." : "Calendar entry added.");
      load();
    } catch (err) {
      setFormError(apiError(err, "Could not save the entry."));
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    try {
      await deleteHoliday(toDelete.id);
      setToDelete(null);
      setNotice("Calendar entry deleted.");
      load();
    } catch (err) {
      setToDelete(null);
      setError(apiError(err, "Could not delete the entry."));
    }
  };

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 tracking-tight">School Calendar</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            Holidays and breaks are non-school days: teachers cannot mark attendance on them and
            they are left out of attendance percentages. Weekends are non-school days automatically.
          </p>
        </div>
        <button onClick={openAdd}
          className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-5 py-2.5 rounded-xl shadow-sm">
          + Add holiday
        </button>
      </div>

      <div className="flex flex-wrap gap-3 mb-5 items-end">
        <div>
          <label className={label} htmlFor="hm-year">Academic year</label>
          <select id="hm-year" className={`${input} min-w-[150px]`} value={year}
            onChange={(e) => setYear(Number(e.target.value))}>
            {academicYears().map((y) => <option key={y} value={y}>{y}/{y + 1}</option>)}
          </select>
        </div>
        <div>
          <label className={label} htmlFor="hm-term">Term</label>
          <select id="hm-term" className={`${input} min-w-[150px]`} value={term}
            onChange={(e) => setTerm(e.target.value)}>
            <option value="">All terms</option>
            {TERMS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
        <p className="text-xs text-gray-400 pb-2.5">
          {!loading && `${items.length} ${items.length === 1 ? "entry" : "entries"}`}
        </p>
      </div>

      {shownError && (
        <div role="alert" className="mb-4 px-4 py-3 rounded-xl text-sm font-medium bg-red-50 border border-red-200 text-red-700 flex justify-between gap-3">
          <span>{shownError}</span>
          <button onClick={() => { setError(""); setData((d) => ({ ...d, error: "" })); }} aria-label="Dismiss">✕</button>
        </div>
      )}
      {notice && (
        <div role="status" className="mb-4 px-4 py-3 rounded-xl text-sm font-medium bg-emerald-50 border border-emerald-200 text-emerald-700">
          {notice}
        </div>
      )}

      {loading ? (
        <div className="py-14 text-center text-sm text-gray-400" role="status">Loading calendar…</div>
      ) : items.length === 0 ? (
        <div className="text-center py-14 text-gray-400 rounded-2xl border border-dashed border-gray-200">
          <div className="text-4xl mb-3" aria-hidden="true">🏖</div>
          <p className="text-sm">No holidays or breaks recorded for {year}/{year + 1}.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {items.map((h) => {
            const single = h.start_date === h.end_date;
            const active = h.start_date <= today && today <= h.end_date;
            const past = h.end_date < today;
            return (
              <li key={h.id}
                className={`bg-white border rounded-2xl shadow-sm p-4 flex flex-wrap items-start justify-between gap-3 ${
                  active ? "border-sky-300 ring-1 ring-sky-100" : "border-gray-100"
                } ${past ? "opacity-70" : ""}`}>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold text-gray-800">{h.name}</h3>
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-sky-100 text-sky-700">
                      {typeLabel(h.event_type)}
                    </span>
                    {h.is_school_day && (
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                        School day (override)
                      </span>
                    )}
                    {active && <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">Happening now</span>}
                  </div>
                  <p className="text-sm text-gray-600 mt-1">
                    {single ? fmt(h.start_date) : `${fmt(h.start_date)} → ${fmt(h.end_date)}`}
                    {!single && <span className="text-gray-400"> · {dayCount(h.start_date, h.end_date)} days</span>}
                    {h.term && <span className="text-gray-400"> · {termLabel(h.term)}</span>}
                    <span className="text-gray-400"> · {h.year}/{h.year + 1}</span>
                  </p>
                  {h.description && <p className="text-sm text-gray-500 mt-1">{h.description}</p>}
                  <p className="text-[11px] text-gray-300 mt-1">
                    Added by {h.created_by_name || "—"}
                    {h.updated_by_name && h.updated_by_name !== h.created_by_name ? ` · edited by ${h.updated_by_name}` : ""}
                  </p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button onClick={() => openEdit(h)}
                    className="text-xs px-3 py-1.5 rounded-lg border border-blue-100 text-blue-600 hover:bg-blue-600 hover:text-white transition-colors">
                    Edit
                  </button>
                  <button onClick={() => setToDelete(h)}
                    className="text-xs px-3 py-1.5 rounded-lg border border-red-100 text-red-400 hover:bg-red-600 hover:text-white transition-colors">
                    Delete
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {/* Add / edit */}
      {form && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 overflow-y-auto" role="dialog" aria-modal="true" aria-label={editingId ? "Edit calendar entry" : "Add calendar entry"}>
          <form onSubmit={submit} className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 my-8">
            <h2 className="text-lg font-bold text-gray-800 mb-4">
              {editingId ? "Edit calendar entry" : "Add holiday / non-school day"}
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <label className={label} htmlFor="f-name">Name</label>
                <input id="f-name" className={input} value={form.name} placeholder="e.g. Mid-Term Break"
                  onChange={(e) => set("name", e.target.value)} autoFocus />
              </div>
              <div>
                <label className={label} htmlFor="f-type">Type</label>
                <select id="f-type" className={input} value={form.event_type} onChange={(e) => set("event_type", e.target.value)}>
                  {EVENT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div>
                <label className={label} htmlFor="f-mode">Dates</label>
                <select id="f-mode" className={input} value={form.mode} onChange={(e) => set("mode", e.target.value)}>
                  <option value="single">Single date</option>
                  <option value="range">Date range</option>
                </select>
              </div>
              <div>
                <label className={label} htmlFor="f-start">{form.mode === "range" ? "Start date" : "Date"}</label>
                <input id="f-start" type="date" className={input} value={form.start_date}
                  onChange={(e) => {
                    set("start_date", e.target.value);
                    if (e.target.value && !editingId) set("year", Number(e.target.value.slice(0, 4)));
                  }} />
              </div>
              {form.mode === "range" && (
                <div>
                  <label className={label} htmlFor="f-end">End date</label>
                  <input id="f-end" type="date" className={input} value={form.end_date} min={form.start_date || undefined}
                    onChange={(e) => set("end_date", e.target.value)} />
                </div>
              )}
              <div>
                <label className={label} htmlFor="f-year">Academic year</label>
                <select id="f-year" className={input} value={form.year} onChange={(e) => set("year", Number(e.target.value))}>
                  {academicYears().map((y) => <option key={y} value={y}>{y}/{y + 1}</option>)}
                </select>
              </div>
              <div>
                <label className={label} htmlFor="f-term">Term (optional)</label>
                <select id="f-term" className={input} value={form.term} onChange={(e) => set("term", e.target.value)}>
                  <option value="">Not specific</option>
                  {TERMS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className={label} htmlFor="f-desc">Description / reason</label>
                <textarea id="f-desc" rows={2} className={input} value={form.description}
                  onChange={(e) => set("description", e.target.value)} />
              </div>
              <label className="sm:col-span-2 flex items-start gap-2 text-sm text-gray-600 cursor-pointer">
                <input type="checkbox" className="mt-0.5" checked={form.is_school_day}
                  onChange={(e) => set("is_school_day", e.target.checked)} />
                <span>
                  This is a <b>school day</b> (override) — e.g. a Saturday make-up class.
                  Leave unticked for holidays and breaks.
                </span>
              </label>
            </div>

            {formError && <p role="alert" className="mt-3 text-sm text-red-600">{formError}</p>}

            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setForm(null)} disabled={saving}
                className="px-4 py-2 rounded-xl text-sm font-semibold border border-gray-200 text-gray-600 hover:bg-gray-50">
                Cancel
              </button>
              <button type="submit" disabled={saving}
                className="px-5 py-2 rounded-xl text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50">
                {saving ? "Saving…" : editingId ? "Save changes" : "Add entry"}
              </button>
            </div>
          </form>
        </div>
      )}

      {toDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true" aria-label="Confirm delete">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <p className="text-sm text-gray-700 leading-relaxed">
              Delete <b>{toDelete.name}</b>? Those dates will become school days again, and
              attendance for them can be recorded.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => setToDelete(null)} autoFocus
                className="px-4 py-2 rounded-xl text-sm font-semibold border border-gray-200 text-gray-600 hover:bg-gray-50">Cancel</button>
              <button onClick={confirmDelete}
                className="px-4 py-2 rounded-xl text-sm font-semibold bg-red-600 text-white hover:bg-red-700">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HolidayManagement;
