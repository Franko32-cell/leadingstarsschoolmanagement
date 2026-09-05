import React, { useCallback } from "react";
import PersonAdminTable from "../../components/common/PersonAdminTable";
import StudentProfile from "./StudentProfile";
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
