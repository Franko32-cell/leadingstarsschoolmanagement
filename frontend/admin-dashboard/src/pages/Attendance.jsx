// apps/attendance/components/Attendance.jsx
import {
  useEffect,
  useReducer,
  useCallback,
  useMemo,
  useRef,
  useState,
} from "react";
import API from "../services/api";

// ─── Config ───────────────────────────────────────────────────────────────────

// FIX: CURRENT_TERM and CURRENT_YEAR are no longer sent to the backend on
// writes — the backend (perform_create) stamps them authoritatively. These
// constants are kept only for the summary fetch filter, which is a reporting
// query where term-scoping is intentional. They are explicitly NOT used in
// fetchStudents or submitAttendance to avoid mismatches with settings values.
const CURRENT_TERM = import.meta?.env?.VITE_CURRENT_TERM ?? "term3";
const CURRENT_YEAR = Number(import.meta?.env?.VITE_CURRENT_YEAR ?? 2026);

const MAX_SUMMARY_PAGES = 20;

// ─── Constants ────────────────────────────────────────────────────────────────

const todayStr = () => new Date().toISOString().split("T")[0];

const STATUS_OPTIONS = [
  {
    value: "present",
    label: "Present",
    icon: "✓",
    active: "bg-emerald-600 text-white ring-2 ring-emerald-300 shadow-md",
    inactive:
      "bg-gray-100 text-gray-500 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200",
    row: "bg-emerald-50/60 border-l-4 border-emerald-400",
    count: "text-emerald-700 bg-emerald-100",
    dot: "bg-emerald-500",
  },
  {
    value: "absent",
    label: "Absent",
    icon: "✗",
    active: "bg-red-600 text-white ring-2 ring-red-300 shadow-md",
    inactive:
      "bg-gray-100 text-gray-500 hover:bg-red-50 hover:text-red-700 hover:border-red-200",
    row: "bg-red-50/60 border-l-4 border-red-400",
    count: "text-red-700 bg-red-100",
    dot: "bg-red-500",
  },
  {
    value: "late",
    label: "Late",
    icon: "⏱",
    active: "bg-amber-500 text-white ring-2 ring-amber-300 shadow-md",
    inactive:
      "bg-gray-100 text-gray-500 hover:bg-amber-50 hover:text-amber-700 hover:border-amber-200",
    row: "bg-amber-50/60 border-l-4 border-amber-400",
    count: "text-amber-700 bg-amber-100",
    dot: "bg-amber-400",
  },
];

const TABS = ["Mark Attendance", "Student Summary"];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const getStudentName = (student) =>
  student?.student_name ||
  [student?.first_name, student?.last_name].filter(Boolean).join(" ").trim() ||
  student?.username ||
  student?.admission_number ||
  "Unknown";

const getStatusMeta = (value) => STATUS_OPTIONS.find((s) => s.value === value);

const getRateMeta = (rate) => {
  if (rate === null)
    return { color: "text-gray-400", bar: "bg-gray-300", label: "—" };
  if (rate >= 80)
    return {
      color: "text-emerald-700 font-semibold",
      bar: "bg-emerald-500",
      label: `${rate}%`,
    };
  if (rate >= 60)
    return {
      color: "text-amber-600 font-semibold",
      bar: "bg-amber-400",
      label: `${rate}%`,
    };
  return {
    color: "text-red-600 font-semibold",
    bar: "bg-red-500",
    label: `${rate}%`,
  };
};

const isToday = (dateStr) => dateStr === todayStr();

const formatDate = (dateStr) =>
  new Date(dateStr + "T00:00:00").toLocaleDateString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

const extractPath = (url) => {
  try {
    const parsed = new URL(url);
    return parsed.pathname + parsed.search;
  } catch {
    return url;
  }
};

const fetchAllPages = async (url) => {
  const records = [];
  let nextUrl = url;
  let pageCount = 0;

  while (nextUrl) {
    if (pageCount >= MAX_SUMMARY_PAGES) {
      console.warn(
        `fetchAllPages: reached MAX_SUMMARY_PAGES (${MAX_SUMMARY_PAGES}). ` +
          "Stopping early — increase the limit or use server-side aggregation."
      );
      break;
    }
    const res = await API.get(nextUrl);
    const page = res.data;
    records.push(...(page.results ?? page));
    nextUrl = page.next ? extractPath(page.next) : null;
    pageCount++;
  }

  return records;
};

// ─── Reducer ──────────────────────────────────────────────────────────────────

const initialState = {
  students: [],
  classes: [],
  selectedClass: "",
  selectedDate: todayStr(),
  attendance: {},
  existingIds: {},
  summaryData: [],
  activeTab: TABS[0],
  loadingStudents: false,
  loadingSummary: false,
  saving: false,
  refreshing: false,
  deletingId: null,
  error: "",
  success: "",
};

const reducer = (state, action) => {
  switch (action.type) {
    case "SET_CLASSES":
      return { ...state, classes: action.payload };
    case "SET_ACTIVE_TAB":
      return { ...state, activeTab: action.payload, error: "", success: "" };
    case "SET_STATUS":
      return {
        ...state,
        attendance: { ...state.attendance, [action.studentId]: action.status },
      };
    case "MARK_ALL": {
      const attendance = {};
      state.students.forEach((s) => {
        attendance[s.id] = action.status;
      });
      return { ...state, attendance: { ...state.attendance, ...attendance } };
    }
    case "SET_CLASS":
      return {
        ...state,
        selectedClass: action.payload,
        students: [],
        attendance: {},
        existingIds: {},
        summaryData: [],
        error: "",
        success: "",
      };
    case "SET_DATE":
      return {
        ...state,
        selectedDate: action.payload,
        students: [],
        attendance: {},
        existingIds: {},
        error: "",
        success: "",
      };
    case "FETCH_STUDENTS_START":
      return { ...state, loadingStudents: true, error: "", success: "" };
    case "FETCH_STUDENTS_DONE":
      return {
        ...state,
        loadingStudents: false,
        students: action.students,
        attendance: action.attendance,
        existingIds: action.existingIds,
      };
    case "FETCH_SUMMARY_START":
      return { ...state, loadingSummary: true };
    case "FETCH_SUMMARY_DONE":
      return { ...state, loadingSummary: false, summaryData: action.payload };
    case "SAVING_START":
      return { ...state, saving: true, error: "", success: "" };
    case "SAVING_DONE":
      return {
        ...state,
        saving: false,
        success: action.payload || "Attendance saved successfully.",
      };
    case "SAVING_ERROR":
      return { ...state, saving: false, error: action.payload };
    case "REFRESHING_START":
      return { ...state, refreshing: true, error: "", success: "" };
    case "REFRESH_DONE": {
      const attendance = {};
      state.students.forEach((s) => {
        attendance[s.id] = "present";
      });
      return {
        ...state,
        refreshing: false,
        attendance,
        existingIds: {},
        success: "All students reset to Present. Review and save.",
      };
    }
    case "REFRESH_ERROR":
      return { ...state, refreshing: false, error: action.payload };
    case "DELETING_START":
      return { ...state, deletingId: action.payload };
    case "DELETING_DONE": {
      const attendance = { ...state.attendance };
      const existingIds = { ...state.existingIds };
      attendance[action.studentId] = null;
      delete existingIds[action.studentId];
      return {
        ...state,
        deletingId: null,
        attendance,
        existingIds,
        success: "Record deleted.",
      };
    }
    case "DELETING_ERROR":
      return { ...state, deletingId: null, error: action.payload };
    case "SET_ERROR":
      return {
        ...state,
        error: action.payload,
        saving: false,
        loadingStudents: false,
        refreshing: false,
      };
    case "SET_SUCCESS":
      return { ...state, success: action.payload };
    case "MERGE_IDS":
      return {
        ...state,
        existingIds: { ...state.existingIds, ...action.payload },
      };
    case "CLEAR_MESSAGES":
      return { ...state, success: "", error: "" };
    default:
      return state;
  }
};

// ─── Sub-components ───────────────────────────────────────────────────────────

const Alert = ({ type, message, onDismiss }) => {
  const styles =
    type === "error"
      ? "bg-red-50 border border-red-200 text-red-700"
      : "bg-emerald-50 border border-emerald-200 text-emerald-700";
  return (
    <div
      role="alert"
      className={`mb-5 px-4 py-3 rounded-xl text-sm font-medium flex items-start justify-between gap-3 ${styles}`}
    >
      <span>{message}</span>
      <button
        onClick={onDismiss}
        className="opacity-50 hover:opacity-100 transition-opacity shrink-0 mt-0.5"
        aria-label="Dismiss"
      >
        ✕
      </button>
    </div>
  );
};

const Spinner = ({ text = "Loading..." }) => (
  <div
    className="flex items-center gap-3 text-gray-400 py-10 text-sm justify-center"
    role="status"
    aria-live="polite"
  >
    <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24" aria-hidden="true">
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
    </svg>
    <span>{text}</span>
  </div>
);

const CountBadge = ({ opt, count, total }) => {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div
      className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold ${opt.count}`}
    >
      <span className={`w-2 h-2 rounded-full ${opt.dot}`} aria-hidden="true" />
      <span>{opt.label}</span>
      <span className="font-bold">{count}</span>
      {total > 0 && <span className="opacity-60 font-normal">{pct}%</span>}
    </div>
  );
};

const StatusToggle = ({ currentStatus, studentId, onStatusChange, disabled }) => (
  <div
    className="flex gap-1 justify-center flex-wrap"
    role="group"
    aria-label="Attendance status"
  >
    {STATUS_OPTIONS.map(({ value, label, icon, active, inactive }) => (
      <button
        key={value}
        onClick={() => !disabled && onStatusChange(studentId, value)}
        disabled={disabled}
        aria-pressed={currentStatus === value}
        aria-label={label}
        className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed ${
          currentStatus === value
            ? active
            : `border-transparent ${inactive}`
        }`}
      >
        {icon} {label}
      </button>
    ))}
  </div>
);

const RateBar = ({ rate }) => {
  const { color, bar, label } = getRateMeta(rate);
  if (rate === null)
    return <span className="text-gray-400 text-xs">No records</span>;
  return (
    <div className="flex items-center gap-2 justify-center">
      <div
        className="w-20 bg-gray-200 rounded-full h-1.5"
        role="progressbar"
        aria-valuenow={rate}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Attendance rate: ${label}`}
      >
        <div
          className={`h-1.5 rounded-full transition-all duration-500 ${bar}`}
          style={{ width: `${rate}%` }}
        />
      </div>
      <span className={`text-xs tabular-nums ${color}`}>{label}</span>
    </div>
  );
};

const DateModeBanner = ({ selectedDate, hasAnyRecord, studentCount }) => {
  const today = isToday(selectedDate);
  if (!selectedDate || studentCount === 0) return null;

  const configs = {
    todayNew: {
      bg: "bg-blue-50 border-blue-200 text-blue-800",
      icon: "📋",
      title: "Today's attendance",
      body: "No records yet. All students are pre-set to Present. Adjust and save.",
    },
    todayExisting: {
      bg: "bg-emerald-50 border-emerald-200 text-emerald-800",
      icon: "✅",
      title: "Attendance recorded for today.",
      body: "Edit any status and save, or use Reset All to Present to start over.",
    },
    pastExisting: {
      bg: "bg-amber-50 border-amber-200 text-amber-800",
      icon: "📅",
      title: "Editing past attendance",
      body: `${formatDate(selectedDate)}. Changes will update existing records.`,
    },
    pastNew: {
      bg: "bg-gray-50 border-gray-200 text-gray-600",
      icon: "🗓",
      title: "No records for this date.",
      body: `${formatDate(selectedDate)}. Assign statuses and save to create records.`,
    },
  };

  const key =
    today && !hasAnyRecord
      ? "todayNew"
      : today && hasAnyRecord
      ? "todayExisting"
      : !today && hasAnyRecord
      ? "pastExisting"
      : "pastNew";

  const { bg, icon, title, body } = configs[key];

  return (
    <div
      className={`mb-5 flex items-start gap-3 px-4 py-3 rounded-xl border text-sm ${bg}`}
    >
      <span className="text-base leading-none mt-0.5" aria-hidden="true">
        {icon}
      </span>
      <div>
        <span className="font-semibold">{title}</span>{" "}
        <span className="opacity-80">{body}</span>
      </div>
    </div>
  );
};

const QuickMarkBar = ({ onMarkAll, disabled }) => (
  <div className="flex items-center gap-2 mb-4">
    <span className="text-xs text-gray-400 font-medium mr-1">Mark all:</span>
    {STATUS_OPTIONS.map((opt) => (
      <button
        key={opt.value}
        onClick={() => onMarkAll(opt.value)}
        disabled={disabled}
        className={`px-3 py-1 rounded-lg text-xs font-semibold border transition-all disabled:opacity-40 ${opt.inactive} border-transparent`}
      >
        {opt.icon} All {opt.label}
      </button>
    ))}
  </div>
);

const SearchBar = ({ value, onChange, placeholder }) => (
  <div className="relative">
    <svg
      className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden="true"
    >
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.35-4.35" />
    </svg>
    <input
      type="search"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full border border-gray-200 bg-white text-gray-800 pl-9 pr-3 py-2 rounded-xl text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-300 placeholder-gray-300"
    />
    {value && (
      <button
        onClick={() => onChange("")}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500 text-xs"
        aria-label="Clear search"
      >
        ✕
      </button>
    )}
  </div>
);

const ProgressRing = ({ rate, size = 36, studentName = "" }) => {
  if (rate === null)
    return <span className="text-gray-300 text-xs">—</span>;
  const r = (size - 6) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (rate / 100) * circ;
  const color =
    rate >= 80 ? "#10b981" : rate >= 60 ? "#f59e0b" : "#ef4444";
  const label = studentName
    ? `${studentName}: ${rate}% attendance`
    : `${rate}% attendance`;

  return (
    <div
      className="relative inline-flex items-center justify-center"
      style={{ width: size, height: size }}
      role="img"
      aria-label={label}
    >
      <svg
        width={size}
        height={size}
        style={{ transform: "rotate(-90deg)" }}
        aria-hidden="true"
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="#e5e7eb"
          strokeWidth={3}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={3}
          strokeDasharray={circ}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 0.5s ease" }}
        />
      </svg>
      <span
        className="absolute text-[10px] font-semibold tabular-nums"
        style={{ color }}
        aria-hidden="true"
      >
        {rate}%
      </span>
    </div>
  );
};

const ConfirmDialog = ({ message, onConfirm, onCancel }) => (
  <div
    className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
    role="dialog"
    aria-modal="true"
    aria-label="Confirmation"
  >
    <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full mx-4 p-6">
      <p className="text-sm text-gray-700 mb-6 leading-relaxed">{message}</p>
      <div className="flex gap-3 justify-end">
        <button
          onClick={onCancel}
          autoFocus
          className="px-4 py-2 rounded-xl text-sm font-semibold border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={onConfirm}
          className="px-4 py-2 rounded-xl text-sm font-semibold bg-red-600 text-white hover:bg-red-700 transition-colors"
        >
          Confirm
        </button>
      </div>
    </div>
  </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────

const Attendance = () => {
  const [state, dispatch] = useReducer(reducer, initialState);
  const [searchQuery, setSearchQuery] = useState("");
  const [summarySearch, setSummarySearch] = useState("");
  const [confirmDialog, setConfirmDialog] = useState(null);

  const {
    students,
    classes,
    selectedClass,
    selectedDate,
    attendance,
    existingIds,
    summaryData,
    activeTab,
    loadingStudents,
    loadingSummary,
    saving,
    refreshing,
    deletingId,
    error,
    success,
  } = state;

  // ── Success auto-dismiss ───────────────────────────────────────────────────

  const successTimer = useRef(null);

  useEffect(() => {
    return () => {
      if (successTimer.current) clearTimeout(successTimer.current);
    };
  }, []);

  useEffect(() => {
    if (success) {
      if (successTimer.current) clearTimeout(successTimer.current);
      successTimer.current = setTimeout(
        () => dispatch({ type: "CLEAR_MESSAGES" }),
        5000
      );
    }
  }, [success]);

  // ── Data fetching ──────────────────────────────────────────────────────────

  const fetchClasses = useCallback(async () => {
    try {
      const res = await API.get("/classes/");
      dispatch({ type: "SET_CLASSES", payload: res.data.results ?? res.data });
    } catch {
      dispatch({ type: "SET_ERROR", payload: "Failed to load classes." });
    }
  }, []);

  const fetchStudents = useCallback(async (classId, date) => {
    if (!classId || !date) return;
    dispatch({ type: "FETCH_STUDENTS_START" });
    try {
      const [studRes, attRes] = await Promise.all([
        API.get(`/students/?school_class=${classId}`),
        // FIX: removed &term=...&year=... from this query.
        //
        // Previously the frontend filtered attendance by its own CURRENT_TERM
        // and CURRENT_YEAR env vars. If those differed from settings values on
        // the backend (which stamps term/year at save time), existing records
        // would not be found, existingIds would be empty, and every subsequent
        // save would attempt a POST instead of a PATCH — hitting unique_together
        // and returning 400.
        //
        // Querying by date+class alone finds records regardless of which
        // term/year they were stored under, which is the correct behaviour for
        // the mark-attendance flow.
        API.get(`/attendance/?date=${date}&school_class=${classId}`),
      ]);

      const studentList = studRes.data.results ?? studRes.data;
      const existing    = attRes.data.results ?? attRes.data;
      const isDateToday = isToday(date);
      const newAttendance = {};
      const newIds = {};

      studentList.forEach((s) => {
        const record = existing.find(
          (a) =>
            String(a.student) === String(s.id) ||
            String(a.student_id) === String(s.id)
        );
        if (record) {
          newAttendance[s.id] = record.status;
          newIds[s.id] = record.id;
        } else {
          newAttendance[s.id] = isDateToday ? "present" : null;
        }
      });

      dispatch({
        type: "FETCH_STUDENTS_DONE",
        students: studentList,
        attendance: newAttendance,
        existingIds: newIds,
      });
    } catch {
      dispatch({ type: "SET_ERROR", payload: "Failed to load students." });
    }
  }, []);

  const fetchSummary = useCallback(async (classId) => {
    if (!classId) return;
    dispatch({ type: "FETCH_SUMMARY_START" });
    try {
      const [classStudents, records] = await Promise.all([
        API.get(`/students/?school_class=${classId}`).then(
          (r) => r.data.results ?? r.data
        ),
        // Summary intentionally keeps term+year so it stays scoped to the
        // current academic term — this is a reporting view, not a live-edit
        // view, so term-scoping is correct here.
        fetchAllPages(
          `/attendance/?school_class=${classId}&term=${CURRENT_TERM}&year=${CURRENT_YEAR}&page_size=100`
        ),
      ]);

      const summary = classStudents.map((student) => {
        const sr = records.filter(
          (a) =>
            String(a.student) === String(student.id) ||
            String(a.student_id) === String(student.id)
        );
        const total   = sr.length;
        const present = sr.filter((a) => a.status === "present").length;
        const absent  = sr.filter((a) => a.status === "absent").length;
        const late    = sr.filter((a) => a.status === "late").length;
        // (present + late) / total: late counts as present per model semantics
        const rate =
          total > 0
            ? Math.round(((present + late) / total) * 100)
            : null;
        return { student, total, present, absent, late, rate };
      });

      summary.sort((a, b) => {
        if (a.rate === null && b.rate === null) return 0;
        if (a.rate === null) return 1;
        if (b.rate === null) return -1;
        return a.rate - b.rate;
      });

      dispatch({ type: "FETCH_SUMMARY_DONE", payload: summary });
    } catch {
      dispatch({
        type: "SET_ERROR",
        payload: "Failed to load attendance summary.",
      });
    }
  }, []);

  // ── Effects ────────────────────────────────────────────────────────────────

  useEffect(() => {
    fetchClasses();
  }, [fetchClasses]);

  useEffect(() => {
    if (selectedClass && selectedDate)
      fetchStudents(selectedClass, selectedDate);
  }, [selectedClass, selectedDate, fetchStudents]);

  useEffect(() => {
    if (activeTab === "Student Summary" && selectedClass)
      fetchSummary(selectedClass);
  }, [activeTab, selectedClass, fetchSummary]);

  // ── Handlers ───────────────────────────────────────────────────────────────

  const handleMarkAll = useCallback((status) => {
    dispatch({ type: "MARK_ALL", status });
  }, []);

  const handleRefreshAllPresent = () => {
    setConfirmDialog({
      message:
        "This will delete all recorded attendance for today and reset everyone to Present. This cannot be undone.",
      onConfirm: async () => {
        setConfirmDialog(null);
        dispatch({ type: "REFRESHING_START" });
        try {
          const ids = Object.values(existingIds);
          const results = await Promise.allSettled(
            ids.map((id) => API.delete(`/attendance/${id}/`))
          );
          const failed = results.filter((r) => r.status === "rejected").length;
          if (failed > 0) {
            await fetchStudents(selectedClass, selectedDate);
            dispatch({
              type: "REFRESH_ERROR",
              payload: `${failed} record(s) could not be deleted. The list has been refreshed — please try again.`,
            });
            return;
          }
          dispatch({ type: "REFRESH_DONE" });
        } catch {
          dispatch({
            type: "REFRESH_ERROR",
            payload: "Failed to reset attendance. Please try again.",
          });
        }
      },
    });
  };

  const handleDeleteAttendance = (studentId) => {
    const id = existingIds[studentId];
    if (!id) return;
    setConfirmDialog({
      message: "Delete this attendance record? This cannot be undone.",
      onConfirm: async () => {
        setConfirmDialog(null);
        dispatch({ type: "DELETING_START", payload: studentId });
        try {
          await API.delete(`/attendance/${id}/`);
          dispatch({ type: "DELETING_DONE", studentId });
        } catch {
          dispatch({
            type: "DELETING_ERROR",
            payload: "Failed to delete attendance record.",
          });
        }
      },
    });
  };

  const savingRef = useRef(false);

  const submitAttendance = async () => {
    if (savingRef.current) return;

    if (!selectedClass || !selectedDate) {
      dispatch({
        type: "SET_ERROR",
        payload: "Please select both a class and a date.",
      });
      return;
    }
    if (students.length === 0) {
      dispatch({
        type: "SET_ERROR",
        payload: "No students to save attendance for.",
      });
      return;
    }

    const studentsToSave = students.filter(
      (s) => attendance[s.id] !== null && attendance[s.id] !== undefined
    );
    const unsetCount = students.length - studentsToSave.length;

    if (studentsToSave.length === 0) {
      dispatch({
        type: "SET_ERROR",
        payload:
          "No statuses assigned. Please mark at least one student before saving.",
      });
      return;
    }

    savingRef.current = true;
    dispatch({ type: "SAVING_START" });

    const results = await Promise.allSettled(
      studentsToSave.map(async (student) => {
        const studentId  = student.id;
        const status     = attendance[studentId];
        const existingId = existingIds[studentId];

        if (existingId) {
          // PATCH — only send the changed field.
          // term and year are read-only on the backend and must not be sent;
          // sending them would be ignored anyway, but omitting keeps the
          // payload minimal and intentions clear.
          const res = await API.patch(`/attendance/${existingId}/`, { status });
          return { studentId, id: res.data.id };
        } else {
          // POST — send student, class, date, status only.
          // FIX: term and year removed from POST body. The backend's
          // perform_create stamps them from settings, which is the single
          // source of truth. Sending them from the frontend caused a mismatch
          // between validated values and saved values when env vars diverged
          // from settings, triggering unique_together violations (400).
          const res = await API.post("/attendance/", {
            student:      studentId,
            school_class: selectedClass,
            date:         selectedDate,
            status,
          });
          return { studentId, id: res.data.id };
        }
      })
    );

    savingRef.current = false;

    const succeeded   = results
      .filter((r) => r.status === "fulfilled")
      .map((r) => r.value);
    const failedCount = results.filter((r) => r.status === "rejected").length;

    const newIds = {};
    succeeded.forEach(({ studentId, id }) => {
      if (!existingIds[studentId]) newIds[studentId] = id;
    });
    if (Object.keys(newIds).length > 0) {
      dispatch({ type: "MERGE_IDS", payload: newIds });
    }

    if (failedCount > 0 && succeeded.length > 0) {
      dispatch({
        type: "SAVING_ERROR",
        payload: `${succeeded.length} record(s) saved. ${failedCount} failed — please retry.`,
      });
    } else if (failedCount > 0) {
      dispatch({
        type: "SAVING_ERROR",
        payload: "Failed to save attendance. Please try again.",
      });
    } else {
      const msg =
        unsetCount > 0
          ? `Attendance saved. ${unsetCount} student(s) with no status were skipped.`
          : "Attendance saved successfully.";
      dispatch({ type: "SAVING_DONE", payload: msg });
      if (activeTab === "Student Summary") fetchSummary(selectedClass);
    }
  };

  // ── Derived data ───────────────────────────────────────────────────────────

  const counts = useMemo(() => {
    const base = { present: 0, absent: 0, late: 0, unset: 0 };
    Object.values(attendance).forEach((s) => {
      if (s === null || s === undefined) base.unset++;
      else if (base[s] !== undefined) base[s]++;
    });
    return base;
  }, [attendance]);

  const hasAnyRecord  = useMemo(
    () => Object.keys(existingIds).length > 0,
    [existingIds]
  );
  const dateIsToday   = isToday(selectedDate);
  const maxDate       = todayStr();
  const savedCount    = Object.keys(existingIds).length;
  const totalStudents = students.length;

  const filteredStudents = useMemo(() => {
    if (!searchQuery.trim()) return students;
    const q = searchQuery.toLowerCase();
    return students.filter(
      (s) =>
        getStudentName(s).toLowerCase().includes(q) ||
        (s.admission_number || "").toLowerCase().includes(q)
    );
  }, [students, searchQuery]);

  const filteredSummary = useMemo(() => {
    if (!summarySearch.trim()) return summaryData;
    const q = summarySearch.toLowerCase();
    return summaryData.filter((row) =>
      getStudentName(row.student).toLowerCase().includes(q)
    );
  }, [summaryData, summarySearch]);

  const summaryStats = useMemo(() => {
    if (summaryData.length === 0) return null;
    const withRate = summaryData.filter((r) => r.rate !== null);
    const avgRate =
      withRate.length > 0
        ? Math.round(
            withRate.reduce((acc, r) => acc + r.rate, 0) / withRate.length
          )
        : null;
    const atRisk = summaryData.filter(
      (r) => r.rate !== null && r.rate < 60
    ).length;
    const totalDays =
      summaryData.length > 0
        ? Math.max(...summaryData.map((r) => r.total))
        : 0;
    return { avgRate, atRisk, totalDays };
  }, [summaryData]);

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {confirmDialog && (
        <ConfirmDialog
          message={confirmDialog.message}
          onConfirm={confirmDialog.onConfirm}
          onCancel={() => setConfirmDialog(null)}
        />
      )}

      {/* Header */}
      <div className="mb-7 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 tracking-tight">
            Attendance
          </h1>
          <p className="text-sm text-gray-400 mt-0.5">
            Mark and review student attendance by class and date.
          </p>
        </div>
        {selectedClass && totalStudents > 0 && activeTab === TABS[0] && (
          <div className="text-right shrink-0">
            <div className="text-xs text-gray-400 mb-0.5">Saved</div>
            <div className="text-lg font-bold text-gray-700 tabular-nums">
              {savedCount}
              <span className="text-sm font-normal text-gray-400">
                {" "}/ {totalStudents}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Alerts */}
      {error && (
        <Alert
          type="error"
          message={error}
          onDismiss={() => dispatch({ type: "CLEAR_MESSAGES" })}
        />
      )}
      {success && (
        <Alert
          type="success"
          message={success}
          onDismiss={() => dispatch({ type: "CLEAR_MESSAGES" })}
        />
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6 items-end">
        <div className="flex flex-col gap-1">
          <label
            htmlFor="class-select"
            className="text-xs font-semibold text-gray-400 uppercase tracking-wide"
          >
            Class
          </label>
          <select
            id="class-select"
            value={selectedClass}
            onChange={(e) =>
              dispatch({ type: "SET_CLASS", payload: e.target.value })
            }
            className="border border-gray-200 bg-white text-gray-800 px-3 py-2 rounded-xl text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-300 min-w-[160px]"
          >
            <option value="">Select a class</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label
            htmlFor="date-input"
            className="text-xs font-semibold text-gray-400 uppercase tracking-wide"
          >
            Date
          </label>
          <input
            id="date-input"
            type="date"
            value={selectedDate}
            max={maxDate}
            onChange={(e) =>
              dispatch({ type: "SET_DATE", payload: e.target.value })
            }
            className="border border-gray-200 bg-white text-gray-800 px-3 py-2 rounded-xl text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
          />
        </div>

        {selectedDate && (
          <span
            className={`px-3 py-2 rounded-xl text-xs font-semibold ${
              dateIsToday
                ? "bg-blue-100 text-blue-700"
                : "bg-gray-100 text-gray-500"
            }`}
          >
            {dateIsToday ? "Today" : "Past date"}
          </span>
        )}
      </div>

      {/* Tabs */}
      {selectedClass && (
        <div
          className="flex border-b border-gray-100 mb-6 gap-1"
          role="tablist"
        >
          {TABS.map((tab) => (
            <button
              key={tab}
              role="tab"
              aria-selected={activeTab === tab}
              onClick={() =>
                dispatch({ type: "SET_ACTIVE_TAB", payload: tab })
              }
              className={`px-5 py-2.5 text-sm font-semibold border-b-2 transition-colors ${
                activeTab === tab
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-400 hover:text-gray-600"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      )}

      {/* ── Tab: Mark Attendance ── */}
      {activeTab === "Mark Attendance" && (
        <>
          {loadingStudents && <Spinner text="Loading students..." />}

          {!loadingStudents && selectedClass && students.length === 0 && (
            <div className="text-center py-14 text-gray-400">
              <div className="text-4xl mb-3" aria-hidden="true">👥</div>
              <p className="text-sm">No students found for this class.</p>
            </div>
          )}

          {!selectedClass && (
            <div className="text-center py-14 text-gray-400">
              <div className="text-4xl mb-3" aria-hidden="true">📚</div>
              <p className="text-sm">Select a class and date to begin.</p>
            </div>
          )}

          {students.length > 0 && !loadingStudents && (
            <>
              <DateModeBanner
                selectedDate={selectedDate}
                hasAnyRecord={hasAnyRecord}
                studentCount={students.length}
              />

              {/* Stats row */}
              <div className="flex flex-wrap gap-2 mb-4 items-center">
                {STATUS_OPTIONS.map((opt) => (
                  <CountBadge
                    key={opt.value}
                    opt={opt}
                    count={counts[opt.value] || 0}
                    total={totalStudents}
                  />
                ))}
                {counts.unset > 0 && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-gray-100 text-gray-400">
                    <span className="w-2 h-2 rounded-full bg-gray-300" aria-hidden="true" />
                    Unset: {counts.unset}
                  </span>
                )}
                <span className="ml-auto text-xs text-gray-400 font-medium tabular-nums">
                  {totalStudents} students
                </span>
              </div>

              {/* Quick mark + search */}
              <div className="flex flex-wrap gap-3 mb-4 items-center justify-between">
                <QuickMarkBar
                  onMarkAll={handleMarkAll}
                  disabled={saving || refreshing}
                />
                <div className="w-52">
                  <SearchBar
                    value={searchQuery}
                    onChange={setSearchQuery}
                    placeholder="Search students…"
                  />
                </div>
              </div>

              {filteredStudents.length === 0 && searchQuery && (
                <p className="text-sm text-gray-400 py-4 text-center">
                  No students match "{searchQuery}".
                </p>
              )}

              {filteredStudents.length > 0 && (
                <div className="overflow-x-auto rounded-2xl border border-gray-100 shadow-sm">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50/80 text-gray-400 text-xs uppercase tracking-wider">
                        <th className="px-4 py-3 text-left w-8" scope="col">#</th>
                        <th className="px-4 py-3 text-left" scope="col">Student</th>
                        <th className="px-4 py-3 text-left hidden sm:table-cell" scope="col">
                          Adm. No.
                        </th>
                        <th className="px-4 py-3 text-center" scope="col">Status</th>
                        <th className="px-4 py-3 text-center w-20 sr-only" scope="col">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {filteredStudents.map((student, index) => {
                        const status     = attendance[student.id];
                        const statusMeta = status ? getStatusMeta(status) : null;
                        const isUnset    = status === null || status === undefined;
                        const isSaved    = !!existingIds[student.id];

                        return (
                          <tr
                            key={student.id}
                            className={`transition-colors ${
                              isUnset
                                ? "bg-white hover:bg-gray-50"
                                : statusMeta?.row || "hover:bg-gray-50"
                            }`}
                          >
                            <td className="px-4 py-3 text-gray-300 text-xs">
                              {index + 1}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <div
                                  className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-semibold shrink-0 ${
                                    isUnset
                                      ? "bg-gray-100 text-gray-400"
                                      : statusMeta
                                      ? `${statusMeta.count}`
                                      : "bg-gray-100 text-gray-400"
                                  }`}
                                  aria-hidden="true"
                                >
                                  {getStudentName(student)
                                    .charAt(0)
                                    .toUpperCase()}
                                </div>
                                <div>
                                  <div className="font-medium text-gray-800 leading-tight">
                                    {getStudentName(student)}
                                  </div>
                                  {isSaved && (
                                    <span className="text-[10px] text-emerald-600 font-semibold">
                                      ✓ saved
                                    </span>
                                  )}
                                  {isUnset && (
                                    <span className="text-[10px] text-gray-300 font-medium">
                                      not recorded
                                    </span>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-gray-400 text-xs hidden sm:table-cell">
                              {student.admission_number || "—"}
                            </td>
                            <td className="px-4 py-3">
                              <StatusToggle
                                currentStatus={status}
                                studentId={student.id}
                                onStatusChange={(id, s) =>
                                  dispatch({
                                    type: "SET_STATUS",
                                    studentId: id,
                                    status: s,
                                  })
                                }
                                disabled={saving || refreshing}
                              />
                            </td>
                            <td className="px-4 py-3 text-center">
                              {isSaved && (
                                <button
                                  onClick={() =>
                                    handleDeleteAttendance(student.id)
                                  }
                                  disabled={
                                    deletingId === student.id ||
                                    saving ||
                                    refreshing
                                  }
                                  aria-label={`Delete attendance record for ${getStudentName(student)}`}
                                  className="text-xs px-2.5 py-1 rounded-lg border border-red-100 text-red-400 hover:bg-red-600 hover:text-white hover:border-red-600 transition-colors disabled:opacity-40"
                                >
                                  {deletingId === student.id ? "…" : "Delete"}
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Action bar */}
              <div className="mt-5 flex flex-wrap items-center gap-3">
                <button
                  onClick={submitAttendance}
                  disabled={saving || refreshing}
                  className="bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-sm font-semibold px-6 py-2.5 rounded-xl shadow-sm disabled:opacity-50 transition-all flex items-center gap-2"
                >
                  {saving ? (
                    <>
                      <svg
                        className="animate-spin h-3.5 w-3.5"
                        fill="none"
                        viewBox="0 0 24 24"
                        aria-hidden="true"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8v8H4z"
                        />
                      </svg>
                      Saving…
                    </>
                  ) : (
                    "Save Attendance"
                  )}
                </button>

                {dateIsToday && (
                  <button
                    onClick={handleRefreshAllPresent}
                    disabled={saving || refreshing}
                    className="flex items-center gap-2 bg-white border border-gray-200 hover:border-amber-300 hover:bg-amber-50 text-gray-600 hover:text-amber-800 text-sm font-semibold px-5 py-2.5 rounded-xl shadow-sm disabled:opacity-50 transition-all"
                  >
                    {refreshing ? (
                      <>
                        <svg
                          className="animate-spin h-3.5 w-3.5"
                          fill="none"
                          viewBox="0 0 24 24"
                          aria-hidden="true"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          />
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8v8H4z"
                          />
                        </svg>
                        Resetting…
                      </>
                    ) : (
                      <>↺ Reset All to Present</>
                    )}
                  </button>
                )}
              </div>
            </>
          )}
        </>
      )}

      {/* ── Tab: Student Summary ── */}
      {activeTab === "Student Summary" && (
        <>
          {!selectedClass && (
            <div className="text-center py-14 text-gray-400">
              <div className="text-4xl mb-3" aria-hidden="true">📊</div>
              <p className="text-sm">
                Select a class to view the attendance summary.
              </p>
            </div>
          )}
          {loadingSummary && <Spinner text="Loading summary..." />}

          {!loadingSummary && selectedClass && summaryData.length === 0 && (
            <div className="text-center py-14 text-gray-400">
              <div className="text-4xl mb-3" aria-hidden="true">🗃️</div>
              <p className="text-sm">
                No attendance records found for this class yet.
              </p>
            </div>
          )}

          {!loadingSummary && summaryData.length > 0 && (
            <>
              {summaryStats && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                  <div className="bg-gray-50 rounded-xl p-4">
                    <div className="text-xs text-gray-400 mb-1">Students</div>
                    <div className="text-2xl font-bold text-gray-700">
                      {summaryData.length}
                    </div>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-4">
                    <div className="text-xs text-gray-400 mb-1">
                      Days recorded
                    </div>
                    <div className="text-2xl font-bold text-gray-700">
                      {summaryStats.totalDays}
                    </div>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-4">
                    <div className="text-xs text-gray-400 mb-1">
                      Avg attendance
                    </div>
                    <div
                      className={`text-2xl font-bold ${
                        summaryStats.avgRate >= 80
                          ? "text-emerald-600"
                          : summaryStats.avgRate >= 60
                          ? "text-amber-600"
                          : "text-red-600"
                      }`}
                    >
                      {summaryStats.avgRate !== null
                        ? `${summaryStats.avgRate}%`
                        : "—"}
                    </div>
                  </div>
                  <div className="bg-red-50 rounded-xl p-4">
                    <div className="text-xs text-red-400 mb-1">
                      At risk (&lt;60%)
                    </div>
                    <div className="text-2xl font-bold text-red-600">
                      {summaryStats.atRisk}
                    </div>
                  </div>
                </div>
              )}

              <div className="mb-4 w-64">
                <SearchBar
                  value={summarySearch}
                  onChange={setSummarySearch}
                  placeholder="Search students…"
                />
              </div>

              <div className="overflow-x-auto rounded-2xl border border-gray-100 shadow-sm">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50/80 text-gray-400 text-xs uppercase tracking-wider">
                      <th className="px-4 py-3 text-left w-8" scope="col">#</th>
                      <th className="px-4 py-3 text-left" scope="col">Student</th>
                      <th className="px-4 py-3 text-center text-emerald-600" scope="col">
                        Present
                      </th>
                      <th className="px-4 py-3 text-center text-red-500" scope="col">
                        Absent
                      </th>
                      <th className="px-4 py-3 text-center text-amber-500" scope="col">
                        Late
                      </th>
                      <th className="px-4 py-3 text-center" scope="col">Total</th>
                      <th className="px-4 py-3 text-center" scope="col">Rate</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filteredSummary.map(
                      ({ student, present, absent, late, total, rate }, index) => {
                        const isAtRisk = rate !== null && rate < 60;
                        return (
                          <tr
                            key={student.id}
                            className={`transition-colors ${
                              isAtRisk ? "bg-red-50/40" : "hover:bg-gray-50"
                            }`}
                          >
                            <td className="px-4 py-3 text-gray-300 text-xs">
                              {index + 1}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <div
                                  className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-semibold shrink-0 ${
                                    isAtRisk
                                      ? "bg-red-100 text-red-600"
                                      : "bg-gray-100 text-gray-500"
                                  }`}
                                  aria-hidden="true"
                                >
                                  {getStudentName(student)
                                    .charAt(0)
                                    .toUpperCase()}
                                </div>
                                <div>
                                  <div className="font-medium text-gray-800 leading-tight">
                                    {getStudentName(student)}
                                  </div>
                                  {isAtRisk && (
                                    <span className="text-[10px] text-red-500 font-semibold">
                                      at risk
                                    </span>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-center text-emerald-600 font-semibold">
                              {present}
                            </td>
                            <td className="px-4 py-3 text-center text-red-500 font-semibold">
                              {absent}
                            </td>
                            <td className="px-4 py-3 text-center text-amber-500 font-semibold">
                              {late}
                            </td>
                            <td className="px-4 py-3 text-center text-gray-400">
                              {total}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center justify-center">
                                <ProgressRing
                                  rate={rate}
                                  size={38}
                                  studentName={getStudentName(student)}
                                />
                              </div>
                            </td>
                          </tr>
                        );
                      }
                    )}
                  </tbody>
                </table>
              </div>

              {filteredSummary.length === 0 && summarySearch && (
                <p className="text-sm text-gray-400 py-4 text-center">
                  No students match "{summarySearch}".
                </p>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
};

export default Attendance;
