import PersonAdminTable from "../../components/admin/PersonAdminTable";
import {
  getTeachersAdmin,
  activateTeacher,
  deactivateTeacher,
  suspendTeacher,
  reinstateTeacher,
  archiveTeacher,
  restoreTeacher,
  resetTeacherPassword,
} from "../../services/teacherAdminService";

const fmtDate = (iso) =>
  iso ? new Date(iso).toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "Never";

const TeachersAdmin = () => (
  <PersonAdminTable
    title="Teachers"
    subtitle="Manage teacher accounts, assignments, and access"
    searchPlaceholder="Search by name or teacher ID…"
    fetchFn={getTeachersAdmin}
    getLabel={(t) => `${t.teacher_name || t.username} (${t.teacher_id})`}
    actions={{
      activate: activateTeacher,
      deactivate: deactivateTeacher,
      suspend: suspendTeacher,
      reinstate: reinstateTeacher,
      archive: archiveTeacher,
      restore: restoreTeacher,
      reset_password: resetTeacherPassword,
    }}
    columns={[
      { key: "name", label: "Name", render: (t) => (
        <div>
          <p className="font-bold text-slate-800">{t.teacher_name || t.username}</p>
          <p className="text-xs text-slate-400">{t.teacher_id}</p>
        </div>
      )},
      { key: "subject", label: "Subject", render: (t) => t.subject_name || t.subject || "—" },
      { key: "class", label: "Class", render: (t) => t.school_class_name || t.school_class || "—" },
      { key: "last_login", label: "Last Login", render: (t) => fmtDate(t.last_login) },
    ]}
    drawerSections={(t) => [
      {
        title: "Personal Information",
        fields: [
          ["Full name", t.teacher_name || t.username],
          ["Teacher ID", t.teacher_id],
          ["Username", t.username],
          ["Email", t.email || "—"],
        ],
      },
      {
        title: "Assignments",
        fields: [
          ["Subject", t.subject_name || t.subject || "Unassigned"],
          ["Class", t.school_class_name || t.school_class || "Unassigned"],
          ["Hire date", t.hire_date || "—"],
        ],
      },
      {
        title: "Account",
        fields: [
          ["Account created", fmtDate(t.date_joined)],
          ["Last login", fmtDate(t.last_login)],
        ],
      },
    ]}
  />
);

export default TeachersAdmin;