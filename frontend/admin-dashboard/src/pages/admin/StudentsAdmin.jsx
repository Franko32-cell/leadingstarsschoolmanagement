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
} from "../../services/studentAdminService";

const StudentsAdmin = () => (
  <PersonAdminTable
    title="Students"
    subtitle="students in the school system"
    searchPlaceholder="Search by name, admission number, or class…"
    fetchList={getStudentsAdmin}
    actions={{
      activate: activateStudent,
      deactivate: deactivateStudent,
      suspend: suspendStudent,
      reinstate: reinstateStudent,
      archive: archiveStudent,
      restore: restoreStudent,
      resetPassword: resetStudentPassword,
    }}
    rowConfig={{
      getId: (s) => s.id,
      getName: (s) => s.student_name || s.username,
      getSubtitle: (s) => s.admission_number,
      getStatus: (s) => s.account_status,
      getPhoto: (s) => s.photo_url,
    }}
    extraColumns={[
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
    ]}
    renderProfile={(student) => <StudentProfile student={student} />}
  />
);

export default StudentsAdmin;