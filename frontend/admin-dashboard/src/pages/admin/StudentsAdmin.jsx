import React, { useCallback } from "react";
import PersonAdminTable from "../../components/common/PersonAdminTable";
import StudentProfile from "./StudentProfile";
import API from "../../services/api";
import {
  getStudentsAdmin,
  activateStudent,
  deactivateStudent,
  suspendStudent,
  reinstateStudent,
  archiveStudent,
  restoreStudent,
  resetStudentPassword,
  unlockStudentLogin,
} from "../../services/StudentAdminService";

const TranscriptDownloadButton = ({ student }) => {
  const [downloading, setDownloading] = React.useState(false);
  const [error, setError] = React.useState("");

  const downloadTranscript = async () => {
    setDownloading(true);
    setError("");
    try {
      const response = await API.get(
        `/students/${student.id}/transcript/pdf/`,
        { responseType: "blob" }
      );
      const url = window.URL.createObjectURL(response.data);
      const link = document.createElement("a");
      link.href = url;
      link.download = `transcript_${student.admission_number || student.id}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => window.URL.revokeObjectURL(url), 1000);
    } catch (err) {
      setError(
        err.response?.status === 404
          ? "No results"
          : "Download failed"
      );
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div>
      <button
        type="button"
        onClick={downloadTranscript}
        disabled={downloading}
        className="whitespace-nowrap rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-bold text-indigo-700 transition-colors hover:bg-indigo-100 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {downloading ? "Preparing…" : "Transcript"}
      </button>
      {error && <p className="mt-1 text-[10px] text-red-600">{error}</p>}
    </div>
  );
};
// ─── Types ──────────────────────────────────────────────────────────
// NOTE: This file is plain JSX, so type annotations are omitted here.
// ─── Static config (stable references) ──────────────────────────────
const STUDENT_ACTIONS = {
  activate: activateStudent,
  deactivate: deactivateStudent,
  suspend: suspendStudent,
  reinstate: reinstateStudent,
  archive: archiveStudent,
  restore: restoreStudent,
  resetPassword: resetStudentPassword,
  unlockLogin: unlockStudentLogin,
};
const STUDENT_ROW_CONFIG = {
  getId: (s) => s.id,
  getName: (s) => s.student_name?.trim() || s.username || "Unnamed",
  getSubtitle: (s) => s.admission_number || "",
  getStatus: (s) => s.account_status,
  getPhoto: (s) => s.photo_url,
};
const STUDENT_EXTRA_COLUMNS = [
  {
    key: "class",
    label: "Class",
    render: (s) => s.class_name || "—",
  },
  {
    key: "parent",
    label: "Parent / Guardian",
    render: (s) => s.parent_name || "—",
  },
  {
    key: "transcript",
    label: "Transcript",
    render: (student) => <TranscriptDownloadButton student={student} />,
  },
];
// ─── Component ──────────────────────────────────────────────────────
const StudentsAdmin = React.memo(() => {
  // Memoize profile renderer so PersonAdminTable can optimize list renders
  const renderProfile = useCallback(
    (student) => <StudentProfile student={student} />,
    []
  );
  // Optional: if you need to transform fetched data before passing it down
  // const transformData = useCallback((data) => data, []);
  return (
    <PersonAdminTable
      title="Students"
      subtitle="students in the school system"
      searchPlaceholder="Search by student name or admission number…"
      fetchList={getStudentsAdmin}
      actions={STUDENT_ACTIONS}
      rowConfig={STUDENT_ROW_CONFIG}
      extraColumns={STUDENT_EXTRA_COLUMNS}
      renderProfile={renderProfile}
      // transformData={transformData}
    />
  );
});
StudentsAdmin.displayName = "StudentsAdmin";
export default StudentsAdmin;
