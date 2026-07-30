import React, { useCallback, useMemo } from "react";
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
} from "../../services/StudentAdminService";

// ─── Types ──────────────────────────────────────────────────────────
interface Student {
  id: string | number;
  student_name?: string;
  username?: string;
  admission_number?: string;
  account_status: "active" | "inactive" | "suspended" | "archived" | string;
  photo_url?: string;
  class_name?: string;
  parent_name?: string;
}

// ─── Static config (stable references) ──────────────────────────────
const STUDENT_ACTIONS = {
  activate: activateStudent,
  deactivate: deactivateStudent,
  suspend: suspendStudent,
  reinstate: reinstateStudent,
  archive: archiveStudent,
  restore: restoreStudent,
  resetPassword: resetStudentPassword,
};

const STUDENT_ROW_CONFIG = {
  getId: (s: Student) => s.id,
  getName: (s: Student) => s.student_name?.trim() || s.username || "Unnamed",
  getSubtitle: (s: Student) => s.admission_number || "",
  getStatus: (s: Student) => s.account_status,
  getPhoto: (s: Student) => s.photo_url,
};

const STUDENT_EXTRA_COLUMNS = [
  {
    key: "class",
    label: "Class",
    render: (s: Student) => s.class_name || "—",
  },
  {
    key: "parent",
    label: "Parent / Guardian",
    render: (s: Student) => s.parent_name || "—",
  },
];

// ─── Component ──────────────────────────────────────────────────────
const StudentsAdmin: React.FC = React.memo(() => {
  // Memoize profile renderer so PersonAdminTable can optimize list renders
  const renderProfile = useCallback(
    (student: Student) => <StudentProfile student={student} />,
    []
  );

  // Optional: if you need to transform fetched data before passing it down
  // const transformData = useCallback((data: Student[]) => data, []);

  return (
    <PersonAdminTable<Student>
      title="Students"
      subtitle="students in the school system"
      searchPlaceholder="Search by name, admission number, or class…"
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
