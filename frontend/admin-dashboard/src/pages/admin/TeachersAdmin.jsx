import PersonAdminTable from "../../components/common/PersonAdminTable";
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

const Field = ({ label, value }) => (
  <div>
    <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">{label}</p>
    <p className="text-sm font-semibold text-slate-800 mt-0.5">{value || "—"}</p>
  </div>
);

const Section = ({ title, children }) => (
  <div>
    <p className="text-xs font-black uppercase tracking-wide text-slate-400 mb-3">{title}</p>
    <div className="grid grid-cols-2 gap-x-4 gap-y-3">{children}</div>
  </div>
);

const TeachersAdmin = () => (
  <PersonAdminTable
    title="Teachers"
    subtitle="teachers and faculty accounts"
    searchPlaceholder="Search by name or teacher ID…"
    fetchList={getTeachersAdmin}
    actions={{
      activate: activateTeacher,
      deactivate: deactivateTeacher,
      suspend: suspendTeacher,
      reinstate: reinstateTeacher,
      archive: archiveTeacher,
      restore: restoreTeacher,
      resetPassword: resetTeacherPassword,
    }}
    rowConfig={{
      getId: (t) => t.id,
      getName: (t) => t.teacher_name || t.username,
      getSubtitle: (t) => t.teacher_id,
      getStatus: (t) => t.account_status,
      getPhoto: (t) => t.photo_url,
    }}
    extraColumns={[
      {
        key: "subject",
        label: "Subject",
        render: (t) => t.subject_name || t.subject || "—",
      },
      {
        key: "class",
        label: "Class",
        render: (t) => t.school_class_name || t.school_class || "—",
      },
      {
        key: "last_login",
        label: "Last Login",
        render: (t) => fmtDate(t.last_login),
      },
    ]}
    renderProfile={(t) => (
      <div className="space-y-6">
        <Section title="Personal Information">
          <Field label="Full name" value={t.teacher_name || t.username} />
          <Field label="Teacher ID" value={t.teacher_id} />
          <Field label="Username" value={t.username} />
          <Field label="Email" value={t.email} />
        </Section>
        <Section title="Assignments">
          <Field label="Subject" value={t.subject_name || t.subject || "Unassigned"} />
          <Field label="Class" value={t.school_class_name || t.school_class || "Unassigned"} />
          <Field label="Hire date" value={t.hire_date} />
        </Section>
        <Section title="Account">
          <Field label="Account created" value={fmtDate(t.date_joined)} />
          <Field label="Last login" value={fmtDate(t.last_login)} />
        </Section>
      </div>
    )}
  />
);

export default TeachersAdmin;