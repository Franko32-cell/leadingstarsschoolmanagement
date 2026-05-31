// src/pages/teacher/TeacherPortal.jsx
//
// Root component — orchestration only.
// No API calls, no calc functions, no inline CSS strings here.
// All logic lives in hooks.js / teacherPortalService.js / helpers.js.

import React, { useEffect, useState, useMemo } from "react";
import { getUser, logout } from "../../services/auth";

// Constants & helpers
import {
  TABS, TERMS, YEARS, MODAL_STYLES, todayStr,
} from "./constants";

// Hooks
import {
  useTeacherData,
  useAttendance,
  useResults,
  useCharAssessment,
} from "./Hooks";

// Shared UI
import { Alert, EmptyState } from "./Ui";

// Modals
import { ReopenModal, CAModal, ExamsModal } from "./Scoremodals";
import { ChangePasswordModal, ConfirmModal } from "./Authmodals";

// Tabs (created in next step — stub imports for now)
import ClassesTab     from "./tabs/ClassesTab";
import AttendanceTab  from "./tabs/AttendanceTab";
import ResultsTab     from "./tabs/ResultsTab";
import CharacterTab   from "./tabs/CharacterTab";
import ReportsTab     from "./tabs/ReportsTab";
import AnnouncementsFeed from "../AnnouncementsFeed";

// ─────────────────────────────────────────────
// TeacherPortal
// ─────────────────────────────────────────────

const TeacherPortal = () => {
  const user = getUser();

  // Inject portal-specific CSS animations once
  useEffect(() => {
    if (document.getElementById("tp-modal-styles")) return;
    const el = document.createElement("style");
    el.id          = "tp-modal-styles";
    el.textContent = MODAL_STYLES;
    document.head.appendChild(el);
  }, []);

  // ── UI state ────────────────────────────────────────────────────────────
  const [tab,               setTab]               = useState("Classes");
  const [selectedTerm,      setSelectedTerm]       = useState("term1");
  const [selectedYear,      setSelectedYear]       = useState(YEARS[0]);
  const [selectedSubject,   setSelectedSubject]    = useState("");
  const [attDate,           setAttDate]            = useState(todayStr);
  const [scoreModal,        setScoreModal]         = useState(null);
  const [showPwModal,       setShowPwModal]        = useState(false);
  const [showSubmitConfirm, setShowSubmitConfirm]  = useState(false);

  // ── Domain hooks ────────────────────────────────────────────────────────
  const teacherData  = useTeacherData(
    user.class_id ? String(user.class_id) : "",
    user.class ?? ""
  );
  const attendance   = useAttendance();
  const results      = useResults();
  const charAssess   = useCharAssessment();

  // Unified error/success — each hook owns its own; we surface them here
  const error   = teacherData.error   || attendance.error   || results.error   || charAssess.error;
  const success = teacherData.success || attendance.success || results.success || charAssess.success;

  const clearError   = () => {
    teacherData.setError(""); attendance.setError(""); results.setError(""); charAssess.setError("");
  };
  const clearSuccess = () => {
    teacherData.setSuccess?.(""); attendance.setSuccess(""); results.setSuccess(""); charAssess.setSuccess("");
  };

  // ── Boot ────────────────────────────────────────────────────────────────
  useEffect(() => {
    teacherData.loadClasses();
    teacherData.loadSubjects();
  }, [teacherData.loadClasses, teacherData.loadSubjects]);

  useEffect(() => {
    if (teacherData.selectedClass) {
      teacherData.loadStudents(teacherData.selectedClass);
    } else {
      // class was cleared — also reset all derived state
      attendance.reset();
      results.reset();
      charAssess.resetForClass();
    }
  }, [teacherData.selectedClass]);

  // Tab-driven side effects
  useEffect(() => {
    if (
      tab === "Attendance" &&
      teacherData.selectedClass &&
      teacherData.students.length > 0
    ) {
      attendance.load(teacherData.selectedClass, attDate, teacherData.students);
    }
  }, [tab, attDate, teacherData.selectedClass, teacherData.students]);

  useEffect(() => {
    if (
      tab === "Results" &&
      teacherData.selectedClass &&
      selectedSubject &&
      selectedTerm &&
      teacherData.students.length > 0
    ) {
      results.load(
        teacherData.selectedClass,
        selectedTerm,
        selectedSubject,
        selectedYear,
        teacherData.students
      );
    }
  }, [tab, teacherData.selectedClass, selectedSubject, selectedTerm, selectedYear, teacherData.students]);

  useEffect(() => {
    if (tab === "Character" && charAssess.charStudentId) {
      charAssess.load(charAssess.charStudentId, selectedTerm, selectedYear);
    }
  }, [tab, charAssess.charStudentId, selectedTerm, selectedYear]);

  useEffect(() => {
    if (tab === "Character" && teacherData.students.length > 0 && !charAssess.charStudentId) {
      charAssess.selectStudent(String(teacherData.students[0].id));
    }
  }, [tab, teacherData.students]);

  useEffect(() => { clearError(); clearSuccess(); }, [tab]);

  // ── Derived ─────────────────────────────────────────────────────────────
  const selectedTabLabel = useMemo(
    () => TABS.find((item) => item.key === tab)?.label || tab,
    [tab]
  );

  const attendanceTotals = useMemo(() => {
    const values = Object.values(attendance.attendance || {});
    return {
      present: values.filter((status) => status === "present").length,
      absent:  values.filter((status) => status === "absent").length,
      late:    values.filter((status) => status === "late").length,
    };
  }, [attendance.attendance]);

  const filledCount = useMemo(
    () =>
      Object.values(results.scores).filter(
        (v) => v?.reopen !== "" || v?.ca !== "" || v?.exams !== ""
      ).length,
    [results.scores]
  );

  const selectedSubjectLabel = useMemo(
    () => {
      const subject = teacherData.subjects.find((item) => String(item.id) === String(selectedSubject));
      return subject?.name || selectedSubject;
    },
    [teacherData.subjects, selectedSubject]
  );

  const classSummary = useMemo(() => ({
    total: teacherData.students.length,
    hasClass: Boolean(teacherData.selectedClass),
    term: TERMS.find((item) => item.value === selectedTerm)?.label,
    year: selectedYear,
  }), [teacherData.selectedClass, teacherData.students.length, selectedTerm, selectedYear]);

  // ── Score modal handlers ─────────────────────────────────────────────────
  const applyReopen = (score, breakdown) => {
    results.applyScore(scoreModal.studentId, "reopen", score, breakdown);
    setScoreModal(null);
  };
  const applyCA = (score, breakdown) => {
    results.applyScore(scoreModal.studentId, "ca", score, breakdown);
    setScoreModal(null);
  };
  const applyExams = (score, breakdown) => {
    results.applyScore(scoreModal.studentId, "exams", score, breakdown);
    setScoreModal(null);
  };

  // ── Class change ─────────────────────────────────────────────────────────
  const handleClassChange = (classId) => {
    teacherData.changeClass(classId, teacherData.classes);
    setSelectedSubject("");
    results.reset();
    attendance.reset();
    charAssess.resetForClass();
  };

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-slate-50">

      {/* Score entry modals */}
      {scoreModal?.type === "reopen" && (
        <ReopenModal
          studentName={scoreModal.studentName}
          initial={results.breakdowns[scoreModal.studentId]?.reopen}
          onApply={applyReopen}
          onClose={() => setScoreModal(null)}
        />
      )}
      {scoreModal?.type === "ca" && (
        <CAModal
          studentName={scoreModal.studentName}
          initial={results.breakdowns[scoreModal.studentId]?.ca}
          onApply={applyCA}
          onClose={() => setScoreModal(null)}
        />
      )}
      {scoreModal?.type === "exams" && (
        <ExamsModal
          studentName={scoreModal.studentName}
          initial={results.breakdowns[scoreModal.studentId]?.exams}
          onApply={applyExams}
          onClose={() => setScoreModal(null)}
        />
      )}

      {showPwModal && <ChangePasswordModal onClose={() => setShowPwModal(false)} />}

      {showSubmitConfirm && (
        <ConfirmModal
          title="Save Results?"
          body={`You are about to save ${filledCount} result${filledCount !== 1 ? "s" : ""} for ${teacherData.selectedClassName}. This will overwrite any existing scores for the selected subject and term.`}
          confirmLabel={`Save ${filledCount} Result${filledCount !== 1 ? "s" : ""}`}
          onConfirm={() => {
            setShowSubmitConfirm(false);
            results.submitAll(
              teacherData.selectedClass,
              selectedTerm,
              selectedSubject,
              selectedYear,
              teacherData.students
            );
          }}
          onCancel={() => setShowSubmitConfirm(false)}
        />
      )}

      {/* ── Header ── */}
      <header className="bg-white border-b border-slate-100 shadow-sm sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-5 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
              {(user.full_name || user.username)?.[0]?.toUpperCase()}
            </div>
            <div>
              <p className="font-bold text-slate-800 text-sm leading-tight">{user.full_name || user.username}</p>
              <p className="text-slate-400 text-xs">
                {user.teacher_id || user.username}{user.subject ? ` · ${user.subject}` : ""}
              </p>
            </div>
          </div>

          <nav className="hidden sm:flex items-center gap-1">
            {TABS.map(({ key, icon, label }) => (
              <button key={key} onClick={() => setTab(key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  tab === key
                    ? "bg-blue-50 text-blue-600"
                    : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
                }`}>
                <span className="text-base">{icon}</span>
                <span className="hidden md:inline">{label}</span>
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowPwModal(true)}
              className="hidden sm:flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-blue-600 transition-colors border border-slate-200 hover:border-blue-200 hover:bg-blue-50 px-3 py-1.5 rounded-lg"
            >
              🔑 <span className="hidden md:inline">Password</span>
            </button>
            <button
              onClick={logout}
              className="text-xs font-medium text-slate-400 hover:text-red-500 transition-colors border border-slate-200 hover:border-red-200 px-3 py-1.5 rounded-lg"
            >
              Sign out
            </button>
          </div>
        </div>

        {/* Mobile tab bar */}
        <nav className="sm:hidden flex border-t border-slate-100 overflow-x-auto">
          {TABS.map(({ key, icon, label }) => (
            <button key={key} onClick={() => setTab(key)}
              className={`flex-1 flex flex-col items-center gap-0.5 py-2 text-[10px] font-medium border-b-2 transition-all min-w-[60px] ${
                tab === key ? "border-blue-600 text-blue-600" : "border-transparent text-slate-400"
              }`}>
              <span className="text-lg">{icon}</span>{label}
            </button>
          ))}
        </nav>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-6">

        {/* ── Global filters ── */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm px-5 py-4 mb-6">
          <div className="flex gap-3 flex-wrap items-end">
            <div>
              <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide block mb-1.5">Year</label>
              <select value={selectedYear} onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="border border-slate-200 bg-slate-50 px-3 py-2 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400">
                {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide block mb-1.5">Term</label>
              <select value={selectedTerm} onChange={(e) => setSelectedTerm(e.target.value)}
                className="border border-slate-200 bg-slate-50 px-3 py-2 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400">
                {TERMS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide block mb-1.5">Class</label>
              <select value={teacherData.selectedClass} onChange={(e) => handleClassChange(e.target.value)}
                className="border border-slate-200 bg-slate-50 px-3 py-2 rounded-xl text-sm min-w-[150px] focus:outline-none focus:ring-2 focus:ring-blue-400">
                <option value="">Select Class</option>
                {teacherData.classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>

            {tab === "Results" && (
              <div>
                <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide block mb-1.5">Subject</label>
                <select value={selectedSubject} onChange={(e) => setSelectedSubject(e.target.value)}
                  className="border border-slate-200 bg-slate-50 px-3 py-2 rounded-xl text-sm min-w-[160px] focus:outline-none focus:ring-2 focus:ring-blue-400">
                  <option value="">Select Subject</option>
                  {teacherData.subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
            )}

            {tab === "Attendance" && (
              <div>
                <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide block mb-1.5">Date</label>
                <input type="date" value={attDate} max={todayStr} onChange={(e) => setAttDate(e.target.value)}
                  className="border border-slate-200 bg-slate-50 px-3 py-2 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
              </div>
            )}

            {tab === "Character" && teacherData.selectedClass && (
              <div className="flex-1 min-w-[200px]">
                <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide block mb-1.5">Student</label>
                <select
                  value={charAssess.charStudentId}
                  onChange={(e) => {
                    const id = e.target.value;
                    charAssess.selectStudent(id);
                    if (id) charAssess.load(id, selectedTerm, selectedYear);
                  }}
                  className="w-full border border-slate-200 bg-slate-50 px-3 py-2 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                >
                  <option value="">— Select a student —</option>
                  {teacherData.students.map((s) => {
                    const filled = charAssess.charForms[s.id]
                      ? Object.values(charAssess.charForms[s.id].areas ?? {}).filter((a) => a.score !== "").length
                      : 0;
                    return (
                      <option key={s.id} value={s.id}>
                        {s.student_name}{filled > 0 ? ` ✓ (${filled}/6)` : ""}
                      </option>
                    );
                  })}
                </select>
              </div>
            )}

            {/* Mobile password button */}
            <div className="sm:hidden ml-auto">
              <button onClick={() => setShowPwModal(true)}
                className="flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-blue-600 border border-slate-200 hover:border-blue-200 px-3 py-2 rounded-xl transition-colors">
                🔑 Password
              </button>
            </div>
          </div>
        </div>

        {teacherData.selectedClass && (
          <div className="grid gap-4 mb-6 md:grid-cols-3">
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400 mb-3">Class overview</p>
              <p className="text-2xl font-bold text-slate-900">{teacherData.selectedClassName || "Class"}</p>
              <p className="text-sm text-slate-500 mt-1">{classSummary.term} · {classSummary.year}</p>
              <div className="mt-4 flex items-center gap-2 text-sm text-slate-600">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-700 font-bold">{classSummary.total}</span>
                <span>{classSummary.total === 1 ? "student" : "students"}</span>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400 mb-3">Attendance snapshot</p>
              <div className="grid grid-cols-3 gap-2 text-sm">
                <div className="rounded-2xl bg-emerald-50 px-3 py-3 text-emerald-700">
                  <p className="text-xs uppercase tracking-[0.2em]">Present</p>
                  <p className="text-xl font-bold">{attendanceTotals.present}</p>
                </div>
                <div className="rounded-2xl bg-red-50 px-3 py-3 text-red-700">
                  <p className="text-xs uppercase tracking-[0.2em]">Absent</p>
                  <p className="text-xl font-bold">{attendanceTotals.absent}</p>
                </div>
                <div className="rounded-2xl bg-amber-50 px-3 py-3 text-amber-700">
                  <p className="text-xs uppercase tracking-[0.2em]">Late</p>
                  <p className="text-xl font-bold">{attendanceTotals.late}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400 mb-3">This tab</p>
              <p className="text-xl font-bold text-slate-900">{selectedTabLabel}</p>
              <p className="text-sm text-slate-500 mt-1">Quick actions and data for the current workflow.</p>
              <div className="mt-4 text-sm text-slate-600">
                <p><span className="font-semibold">Term:</span> {classSummary.term}</p>
                <p><span className="font-semibold">Year:</span> {classSummary.year}</p>
                <p><span className="font-semibold">Subject:</span> {tab === "Results" ? (selectedSubject ? selectedSubjectLabel : "Choose subject") : "—"}</p>
              </div>
            </div>
          </div>
        )}

        {/* ── Alerts ── */}
        <Alert message={error}   type="error"   onDismiss={clearError}   />
        <Alert message={success} type="success" onDismiss={clearSuccess} />

        {!teacherData.selectedClass && (
          <EmptyState icon="🏫" title="Select a class to get started" sub="Use the dropdown above to choose your class" />
        )}

        {/* ── Tab content ── */}
        {teacherData.selectedClass && (
          <>
            {tab === "Classes" && (
              <ClassesTab
                students={teacherData.students}
                loading={teacherData.loadingStudents}
                selectedClassName={teacherData.selectedClassName}
                selectedTerm={selectedTerm}
              />
            )}

            {tab === "Attendance" && (
              <AttendanceTab
                students={teacherData.students}
                loading={teacherData.loadingStudents}
                selectedClassName={teacherData.selectedClassName}
                attDate={attDate}
                attendance={attendance.attendance}
                saving={attendance.saving}
                onToggle={attendance.toggle}
                onSave={() => attendance.save(
                  teacherData.selectedClass,
                  attDate,
                  teacherData.students,
                  todayStr
                )}
              />
            )}

            {tab === "Results" && (
              <ResultsTab
                students={teacherData.students}
                selectedSubject={selectedSubject}
                selectedClassLevel={teacherData.selectedClassLevel}
                scores={results.scores}
                breakdowns={results.breakdowns}
                existingIds={results.existingIds}
                saving={results.saving}
                deleting={results.deleting}
                filledCount={filledCount}
                onOpenModal={setScoreModal}
                onDelete={results.deleteOne}
                onSubmit={() => setShowSubmitConfirm(true)}
              />
            )}

            {tab === "Character" && (
              <CharacterTab
                students={teacherData.students}
                selectedClass={teacherData.selectedClass}
                selectedClassName={teacherData.selectedClassName}
                selectedTerm={selectedTerm}
                selectedYear={selectedYear}
                charAssess={charAssess}
              />
            )}

            {tab === "Reports" && (
              <ReportsTab
                students={teacherData.students}
                selectedClassName={teacherData.selectedClassName}
                selectedClass={teacherData.selectedClass}
                selectedTerm={selectedTerm}
                selectedYear={selectedYear}
              />
            )}

            {tab === "Announcements" && (
              <AnnouncementsFeed audience="teachers" />
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default TeacherPortal;