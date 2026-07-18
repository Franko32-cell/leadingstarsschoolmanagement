import PersonAdminTable from "../../components/admin/PersonAdminTable";
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

const fmtDate = (iso) =>
  iso ? new Date(iso).toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "Never";

const StudentsAdmin = () => (
  <PersonAdminTable
    title="Students"
    subtitle="Manage student accounts, status, and access"
    searchPlaceholder="Search by name, admission number, or class…"
    fetchFn={getStudentsAdmin}
    getLabel={(s) => `${s.student_name || s.username} (${s.admission_number})`}
    actions={{
      activate: activateStudent,
      deactivate: deactivateStudent,
      suspend: suspendStudent,
      reinstate: reinstateStudent,
      archive: archiveStudent,
      restore: restoreStudent,
      reset_password: resetStudentPassword,
    }}
    columns={[
      { key: "name", label: "Name", render: (s) => (
        <div>
          <p className="font-bold text-slate-800">{s.student_name || s.username}</p>
          <p className="text-xs text-slate-400">{s.admission_number}</p>
        </div>
      )},
      { key: "class", label: "Class", render: (s) => s.class_name || "—" },
      { key: "parent", label: "Parent / Guardian", render: (s) => s.parent_name || "—" },
      { key: "last_login", label: "Last Login", render: (s) => fmtDate(s.last_login) },
    ]}
    drawerSections={(s) => [
      {
        title: "Personal Information",
        fields: [
          ["Full name", s.student_name || s.username],
          ["Admission number", s.admission_number],
          ["Username", s.username],
          ["Email", s.email || "—"],
          ["Gender", s.gender || "—"],
          ["Date of birth", s.date_of_birth || "—"],
          ["Phone", s.phone || "—"],
          ["Nationality", s.nationality || "—"],
        ],
      },
      {
        title: "Academic",
        fields: [
          ["Class", s.class_name || "Unassigned"],
          ["Admission date", s.admission_date || "—"],
          ["Previous school", s.previous_school || "—"],
        ],
      },
      {
        title: "Parent / Guardian",
        fields: [
          ["Name", s.parent_name || "—"],
          ["Phone", s.parent_phone || "—"],
        ],
      },
      {
        title: "Account",
        fields: [
          ["Account created", fmtDate(s.date_joined)],
          ["Last login", fmtDate(s.last_login)],
        ],
      },
    ]}
  />
);

export default StudentsAdmin;