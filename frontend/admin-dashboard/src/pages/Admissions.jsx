import React, { useEffect, useState, useRef, useCallback, useMemo } from "react";
import API from "../services/api";

// ─────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────

const EMPTY_FORM = {
  first_name:      "",
  last_name:       "",
  gender:          "",
  date_of_birth:   "",
  nationality:     "",
  religion:        "",
  parent_name:     "",
  parent_gender:   "",
  relationship:    "",
  email:           "",
  phone:           "",
  alt_phone:       "",
  address:         "",
  applied_class:   "",
  previous_school: "",
  health_notes:    "",
  photo:           null,
};

const ADMISSION_FIELDS = [
  "first_name", "last_name", "gender", "date_of_birth",
  "nationality", "religion", "parent_name", "parent_gender",
  "relationship", "email", "phone", "alt_phone",
  "address", "applied_class", "previous_school", "health_notes",
];

const GENDERS       = ["Male", "Female"];
const RELATIONSHIPS = ["Father", "Mother", "Guardian", "Other"];
const RELIGIONS     = ["Christian", "Muslim", "Other", "Prefer not to say"];

const STATUS_STYLES = {
  pending:  { pill: "bg-amber-50  text-amber-700  ring-amber-200",  dot: "bg-amber-400",  label: "Pending"  },
  approved: { pill: "bg-green-50  text-green-700  ring-green-200",  dot: "bg-green-500",  label: "Approved" },
  rejected: { pill: "bg-red-50    text-red-700    ring-red-200",    dot: "bg-red-500",    label: "Rejected" },
};

// ─────────────────────────────────────────────
// Reusable photo-preview hook
// ─────────────────────────────────────────────

function usePhotoPreview(initialUrl = null) {
  const [previewSrc, setPreviewSrc] = useState(initialUrl);

  useEffect(() => {
    return () => {
      if (previewSrc?.startsWith("blob:")) URL.revokeObjectURL(previewSrc);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handlePhotoFile = useCallback((file, fallbackUrl = null) => {
    setPreviewSrc((prev) => {
      if (prev?.startsWith("blob:")) URL.revokeObjectURL(prev);
      return file ? URL.createObjectURL(file) : fallbackUrl;
    });
  }, []);

  const resetPreview = useCallback((fallbackUrl = null) => {
    setPreviewSrc((prev) => {
      if (prev?.startsWith("blob:")) URL.revokeObjectURL(prev);
      return fallbackUrl;
    });
  }, []);

  return { previewSrc, handlePhotoFile, resetPreview };
}

// ─────────────────────────────────────────────
// FIX: parseBlobError
// The previous code called res.data.text() but didn't
// await it, so the raw Promise object became the error
// string — causing the giant HTML dump in the UI.
//
// This helper:
//   1. Awaits blob.text() correctly
//   2. Tries to parse JSON first (Django REST errors)
//   3. Falls back to stripping HTML tags from Django's
//      debug page so only readable text is shown
//   4. Caps the message at 200 chars so it fits the UI
// ─────────────────────────────────────────────

async function parseBlobError(blob, fallback = "An error occurred.") {
  try {
    const text = await blob.text();
    try {
      const json = JSON.parse(text);
      return json.detail || json.error || json.message || fallback;
    } catch {
      const stripped = text
        .replace(/<style[\s\S]*?<\/style>/gi, "")
        .replace(/<script[\s\S]*?<\/script>/gi, "")
        .replace(/<[^>]+>/g, " ")
        .replace(/&[a-z]+;/gi, " ")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 200);
      return stripped || fallback;
    }
  } catch {
    return fallback;
  }
}

function parseApiError(err, fallback = "An error occurred.") {
  const data = err.response?.data;
  if (!data) return fallback;
  if (typeof data === "string") return data;
  if (data.detail) return data.detail;
  if (data.error)  return data.error;
  const msgs = Object.values(data).flat().filter(Boolean);
  return msgs.length ? msgs.join(" ") : fallback;
}

// ─────────────────────────────────────────────
// Small helpers
// ─────────────────────────────────────────────

const Field = ({ label, required, children }) => (
  <div className="flex flex-col gap-1">
    <label className="text-xs font-medium text-gray-500">
      {label}{required && <span className="text-red-400 ml-0.5">*</span>}
    </label>
    {children}
  </div>
);

const inputCls =
  "border border-gray-200 bg-gray-50 px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:bg-white transition-colors placeholder-gray-300";

const Toast = ({ message, type, onDismiss }) => {
  if (!message) return null;
  const s = type === "error"
    ? "bg-red-50 border-red-200 text-red-700"
    : "bg-emerald-50 border-emerald-200 text-emerald-700";
  return (
    <div role="alert" className={`mb-4 flex items-center justify-between px-4 py-3 rounded-xl border text-sm ${s}`}>
      <span>{message}</span>
      <button onClick={onDismiss} aria-label="Dismiss notification"
        className="ml-4 opacity-50 hover:opacity-100 text-lg leading-none">×</button>
    </div>
  );
};

const StatusPill = ({ status }) => {
  const st = STATUS_STYLES[status] || STATUS_STYLES.pending;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ring-1 ${st.pill}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
      {st.label}
    </span>
  );
};

const SectionHeading = ({ icon, title }) => (
  <div className="flex items-center gap-2 col-span-full mt-2 mb-1">
    <span className="text-base" aria-hidden="true">{icon}</span>
    <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">{title}</p>
    <div className="flex-1 h-px bg-gray-100" />
  </div>
);

const StatCard = ({ label, value, color = "text-blue-700" }) => (
  <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-5 py-4 text-center">
    <p className={`text-2xl font-bold ${color}`}>{value}</p>
    <p className="text-xs text-gray-400 mt-1">{label}</p>
  </div>
);

const PhotoUploader = ({ previewSrc, fileInputRef, onChange }) => (
  <div className="col-span-full flex items-center gap-4">
    <div onClick={() => fileInputRef.current?.click()}
      className="w-20 h-20 rounded-xl border-2 border-dashed border-blue-200 bg-blue-50 flex items-center justify-center cursor-pointer overflow-hidden hover:border-blue-400 transition-colors flex-shrink-0">
      {previewSrc
        ? <img src={previewSrc} alt="Student photo preview" className="w-full h-full object-cover" />
        : <span className="text-blue-200 text-3xl" aria-hidden="true">👤</span>
      }
    </div>
    <div>
      <p className="text-xs font-medium text-gray-500 mb-1.5">Passport Photo</p>
      <button type="button" onClick={() => fileInputRef.current?.click()}
        className="text-xs bg-blue-50 text-blue-600 hover:bg-blue-100 px-3 py-1.5 rounded-lg font-medium transition-colors border border-blue-100">
        {previewSrc ? "Change Photo" : "Upload Photo"}
      </button>
      <input ref={fileInputRef} type="file" name="photo" accept="image/*"
        className="hidden" onChange={onChange} aria-label="Upload student photo" />
      <p className="text-xs text-gray-400 mt-1">JPG or PNG · max 5 MB</p>
    </div>
  </div>
);

const AdmissionFormFields = ({ form, onChange, classes, showStatus = false }) => (
  <>
    <SectionHeading icon="🎓" title="Student Information" />
    <Field label="First Name" required>
      <input name="first_name" value={form.first_name} onChange={onChange} placeholder="e.g. Kwame" className={inputCls} />
    </Field>
    <Field label="Last Name" required>
      <input name="last_name" value={form.last_name} onChange={onChange} placeholder="e.g. Mensah" className={inputCls} />
    </Field>
    <Field label="Gender" required>
      <select name="gender" value={form.gender} onChange={onChange} className={inputCls}>
        <option value="">Select gender</option>
        {GENDERS.map((g) => <option key={g} value={g}>{g}</option>)}
      </select>
    </Field>
    <Field label="Date of Birth" required>
      <input name="date_of_birth" type="date" value={form.date_of_birth} onChange={onChange} className={inputCls} />
    </Field>
    <Field label="Nationality">
      <input name="nationality" value={form.nationality} onChange={onChange} placeholder="e.g. Ghanaian" className={inputCls} />
    </Field>
    <Field label="Religion">
      <select name="religion" value={form.religion} onChange={onChange} className={inputCls}>
        <option value="">Select religion</option>
        {RELIGIONS.map((r) => <option key={r} value={r}>{r}</option>)}
      </select>
    </Field>
    <Field label="Applying for Class" required>
      <select name="applied_class" value={form.applied_class} onChange={onChange} className={inputCls}>
        <option value="">Select class</option>
        {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
      </select>
    </Field>
    <Field label="Previous School">
      <input name="previous_school" value={form.previous_school} onChange={onChange} placeholder="Previous school name" className={inputCls} />
    </Field>
    <Field label="Health / Medical Notes">
      <input name="health_notes" value={form.health_notes} onChange={onChange} placeholder="Allergies, conditions, etc." className={inputCls} />
    </Field>

    <SectionHeading icon="👨‍👩‍👧" title="Parent / Guardian" />
    <Field label="Parent / Guardian Name" required>
      <input name="parent_name" value={form.parent_name} onChange={onChange} placeholder="Full name" className={inputCls} />
    </Field>
    <Field label="Gender">
      <select name="parent_gender" value={form.parent_gender} onChange={onChange} className={inputCls}>
        <option value="">Select gender</option>
        {GENDERS.map((g) => <option key={g} value={g}>{g}</option>)}
      </select>
    </Field>
    <Field label="Relationship to Student">
      <select name="relationship" value={form.relationship} onChange={onChange} className={inputCls}>
        <option value="">Select relationship</option>
        {RELATIONSHIPS.map((r) => <option key={r} value={r}>{r}</option>)}
      </select>
    </Field>
    <Field label="Email Address" required>
      <input name="email" type="email" value={form.email} onChange={onChange} placeholder="parent@email.com" className={inputCls} />
    </Field>
    <Field label="Primary Phone" required>
      <input name="phone" type="tel" value={form.phone} onChange={onChange} placeholder="+233 xx xxx xxxx" className={inputCls} />
    </Field>
    <Field label="Alternative Phone">
      <input name="alt_phone" type="tel" value={form.alt_phone} onChange={onChange} placeholder="+233 xx xxx xxxx" className={inputCls} />
    </Field>
    <Field label="Residential Address" required>
      <input name="address" value={form.address} onChange={onChange} placeholder="House / street / area" className={inputCls} />
    </Field>

    {showStatus && (
      <>
        <SectionHeading icon="📋" title="Application Status" />
        <Field label="Status">
          <select name="status" value={form.status} onChange={onChange} className={inputCls}>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </Field>
      </>
    )}
  </>
);

// ─────────────────────────────────────────────
// Edit Modal
// ─────────────────────────────────────────────

const EditModal = ({ admission, classes, onClose, onSaved }) => {
  const [form, setForm] = useState({
    first_name:      admission.first_name      || "",
    last_name:       admission.last_name       || "",
    gender:          admission.gender          || "",
    date_of_birth:   admission.date_of_birth   || "",
    nationality:     admission.nationality     || "",
    religion:        admission.religion        || "",
    parent_name:     admission.parent_name     || "",
    parent_gender:   admission.parent_gender   || "",
    relationship:    admission.relationship    || "",
    email:           admission.email           || "",
    phone:           admission.phone           || "",
    alt_phone:       admission.alt_phone       || "",
    address:         admission.address         || "",
    applied_class:   admission.applied_class   || "",
    previous_school: admission.previous_school || "",
    health_notes:    admission.health_notes    || "",
    status:          admission.status          || "pending",
    photo:           null,
  });
  const [saving,     setSaving]     = useState(false);
  const [localError, setLocalError] = useState("");
  const fileInputRef    = useRef(null);
  const initialPhotoUrl = admission.photo_url || admission.photo || null;
  const { previewSrc, handlePhotoFile } = usePhotoPreview(initialPhotoUrl);

  const handleChange = useCallback((e) => {
    const { name, value, files } = e.target;
    if (name === "photo") {
      handlePhotoFile(files[0] ?? null, initialPhotoUrl);
      setForm((p) => ({ ...p, photo: files[0] ?? null }));
    } else {
      setForm((p) => ({ ...p, [name]: value }));
    }
  }, [handlePhotoFile, initialPhotoUrl]);

  const handleSave = async () => {
    setSaving(true); setLocalError("");
    try {
      const fd = new FormData();
      [...ADMISSION_FIELDS, "status"].forEach((f) => fd.append(f, form[f] ?? ""));
      fd.append("student_name", `${form.first_name.trim()} ${form.last_name.trim()}`);
      if (form.photo) fd.append("photo", form.photo);
      await API.put(`/admissions/${admission.id}/`, fd, { headers: { "Content-Type": "multipart/form-data" } });
      onSaved("Admission updated successfully.");
    } catch (err) {
      setLocalError(parseApiError(err, "Error saving changes."));
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 overflow-y-auto py-8 px-4"
      role="dialog" aria-modal="true" aria-labelledby="edit-modal-title">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl my-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h3 id="edit-modal-title" className="font-bold text-gray-800 text-base">Edit Admission</h3>
            {admission.admission_number && (
              <p className="text-xs text-gray-400 mt-0.5 font-mono">{admission.admission_number}</p>
            )}
          </div>
          <button onClick={onClose} aria-label="Close modal"
            className="text-gray-400 hover:text-gray-600 text-2xl leading-none transition-colors">×</button>
        </div>
        <div className="px-6 pb-6 pt-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <PhotoUploader previewSrc={previewSrc} fileInputRef={fileInputRef} onChange={handleChange} />
            <AdmissionFormFields form={form} onChange={handleChange} classes={classes} showStatus />
          </div>
          {localError && (
            <div role="alert" className="mt-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
              {localError}
            </div>
          )}
          <div className="flex gap-3 mt-6 pt-5 border-t border-gray-100">
            <button onClick={handleSave} disabled={saving}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl text-sm font-medium disabled:opacity-50 transition-colors shadow-sm">
              {saving ? "Saving…" : "Save Changes"}
            </button>
            <button onClick={onClose}
              className="bg-gray-100 hover:bg-gray-200 text-gray-600 px-6 py-2.5 rounded-xl text-sm font-medium transition-colors">
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────

const Admissions = () => {
  const [admissions,   setAdmissions]   = useState([]);
  const [classes,      setClasses]      = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [submitting,   setSubmitting]   = useState(false);
  const [error,        setError]        = useState("");
  const [success,      setSuccess]      = useState("");
  const [showForm,     setShowForm]     = useState(false);
  const [editingAdm,   setEditingAdm]   = useState(null);
  const [downloading,  setDownloading]  = useState(null);
  const [search,       setSearch]       = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterClass,  setFilterClass]  = useState("all");
  const [expandedId,   setExpandedId]   = useState(null);
  const [form,         setForm]         = useState(EMPTY_FORM);

  const fileInputRef = useRef(null);
  const { previewSrc, handlePhotoFile, resetPreview } = usePhotoPreview(null);

  const loadAdmissions = useCallback(async () => {
    try {
      const res = await API.get("/admissions/");
      setAdmissions(res.data.results ?? res.data);
    } catch {
      setError("Failed to load admissions.");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadClasses = useCallback(async () => {
    try {
      const res = await API.get("/classes/");
      setClasses(res.data.results ?? res.data);
    } catch {}
  }, []);

  useEffect(() => { loadAdmissions(); loadClasses(); }, [loadAdmissions, loadClasses]);

  const handleChange = useCallback((e) => {
    const { name, value, files } = e.target;
    if (name === "photo") {
      handlePhotoFile(files[0] ?? null);
      setForm((p) => ({ ...p, photo: files[0] ?? null }));
    } else {
      setForm((p) => ({ ...p, [name]: value }));
    }
  }, [handlePhotoFile]);

  const resetForm = useCallback(() => {
    resetPreview();
    setForm(EMPTY_FORM);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, [resetPreview]);

  const submitAdmission = async (e) => {
    e.preventDefault();
    setError(""); setSuccess(""); setSubmitting(true);
    try {
      const fd = new FormData();
      ADMISSION_FIELDS.forEach((f) => fd.append(f, form[f] ?? ""));
      fd.append("student_name", `${form.first_name.trim()} ${form.last_name.trim()}`);
      if (form.photo) fd.append("photo", form.photo);
      await API.post("/admissions/", fd, { headers: { "Content-Type": "multipart/form-data" } });
      setSuccess("Admission submitted successfully!");
      resetForm(); setShowForm(false); loadAdmissions();
    } catch (err) {
      setError(parseApiError(err, "Error submitting admission."));
    } finally {
      setSubmitting(false);
    }
  };

  const approveAdmission = async (admission) => {
    setError(""); setSuccess("");
    try {
      await API.patch(`/admissions/${admission.id}/`, { status: "approved" });
      setSuccess("Admission approved — student account created.");
      loadAdmissions();
    } catch { setError("Error approving admission."); }
  };

  const rejectAdmission = async (admission) => {
    setError("");
    try {
      await API.patch(`/admissions/${admission.id}/`, { status: "rejected" });
      loadAdmissions();
    } catch { setError("Error rejecting admission."); }
  };

  const deleteAdmission = async (id) => {
    if (!window.confirm("Permanently delete this application?")) return;
    setError(""); setSuccess("");
    try {
      await API.delete(`/admissions/${id}/`);
      setSuccess("Admission deleted.");
      if (expandedId === id) setExpandedId(null);
      loadAdmissions();
    } catch { setError("Error deleting admission."); }
  };

  // ── FIX: Clean download error handling ────
  //
  // Root cause of the "long error in the UI":
  //   validateStatus: (s) => s < 500  →  axios threw for 500+
  //   but for 404 it resolved, and the error body was Django's
  //   full HTML debug page. The old code called blob.text() but
  //   didn't await it, so [object Promise] was shown instead of
  //   actual text — and when it did show text it was raw HTML.
  //
  // Fix:
  //   1. validateStatus: () => true  so ALL responses resolve
  //   2. Check Content-Type header — only treat as PDF if correct
  //   3. For known status codes show a friendly hardcoded message
  //   4. For 400 use parseBlobError() which strips HTML properly

  const handleDownloadForm = async (adm) => {
    setDownloading(adm.id); setError("");
    try {
      const res = await API.get(`/admissions/${adm.id}/form/`, {
        responseType: "blob",
        validateStatus: () => true,  // resolve for ALL status codes
      });

      const contentType = res.headers?.["content-type"] || "";

      // ✅ Success — real PDF returned
      if (res.status === 200 && contentType.includes("application/pdf")) {
        const url  = URL.createObjectURL(new Blob([res.data], { type: "application/pdf" }));
        const link = document.createElement("a");
        link.href     = url;
        link.download = `admission_form_${adm.first_name}_${adm.last_name}.pdf`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
        return;
      }

      // ❌ Known error codes — show a clean friendly message
      const friendlyMessages = {
        404: "Download endpoint not found. Please ensure the backend is deployed with the latest code.",
        403: "You don't have permission to download this form.",
        401: "Your session has expired. Please log in again.",
        500: "Server error while generating the PDF. Please try again later.",
      };
      if (friendlyMessages[res.status]) {
        throw new Error(friendlyMessages[res.status]);
      }

      // ❌ 400 or other — parse the actual error from the blob cleanly
      const message = await parseBlobError(
        res.data,
        "Could not download admission form. Please try again.",
      );
      throw new Error(message);

    } catch (err) {
      setError(err.message || "Could not download admission form. Please try again.");
    } finally {
      setDownloading(null);
    }
  };

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return admissions.filter((a) => {
      const name = a.first_name && a.last_name ? `${a.first_name} ${a.last_name}` : a.student_name ?? "";
      const matchSearch = !q || name.toLowerCase().includes(q) ||
        (a.admission_number ?? "").toLowerCase().includes(q) ||
        (a.parent_name ?? "").toLowerCase().includes(q);
      const matchStatus = filterStatus === "all" || a.status === filterStatus;
      const matchClass  = filterClass  === "all" || String(a.applied_class) === String(filterClass);
      return matchSearch && matchStatus && matchClass;
    });
  }, [admissions, search, filterStatus, filterClass]);

  const stats = useMemo(() => ({
    total:    admissions.length,
    pending:  admissions.filter((a) => a.status === "pending").length,
    approved: admissions.filter((a) => a.status === "approved").length,
    rejected: admissions.filter((a) => a.status === "rejected").length,
  }), [admissions]);

  if (loading) return (
    <div className="p-8 text-center text-gray-400">
      <p className="text-3xl mb-2">📋</p>
      <p className="text-sm">Loading admissions…</p>
    </div>
  );

  return (
    <div className="p-6 max-w-7xl mx-auto">

      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Student Admissions</h2>
          <p className="text-sm text-gray-400 mt-0.5">Manage applications and enrolments</p>
        </div>
        <button
          onClick={() => { setShowForm((v) => !v); setError(""); setSuccess(""); }}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium shadow-sm transition-all ${
            showForm ? "bg-gray-100 text-gray-600 hover:bg-gray-200" : "bg-blue-600 hover:bg-blue-700 text-white"
          }`}
        >
          {showForm ? "✕ Cancel" : "+ New Application"}
        </button>
      </div>

      <Toast message={error}   type="error"   onDismiss={() => setError("")}   />
      <Toast message={success} type="success" onDismiss={() => setSuccess("")} />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <StatCard label="Total Applications" value={stats.total}    color="text-blue-700"  />
        <StatCard label="Pending"             value={stats.pending}  color="text-amber-600" />
        <StatCard label="Approved"            value={stats.approved} color="text-green-600" />
        <StatCard label="Rejected"            value={stats.rejected} color="text-red-600"   />
      </div>

      {showForm && (
        <form onSubmit={submitAdmission} encType="multipart/form-data"
          className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-6">
          <h3 className="font-bold text-gray-700 mb-5 text-base">New Application</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <SectionHeading icon="📷" title="Student Photo" />
            <PhotoUploader previewSrc={previewSrc} fileInputRef={fileInputRef} onChange={handleChange} />
            <AdmissionFormFields form={form} onChange={handleChange} classes={classes} showStatus={false} />
          </div>
          <div className="flex gap-3 mt-6 pt-5 border-t border-gray-100">
            <button type="submit" disabled={submitting}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl text-sm font-medium disabled:opacity-50 transition-colors shadow-sm">
              {submitting ? "Submitting…" : "Submit Application"}
            </button>
            <button type="button" onClick={() => { resetForm(); setShowForm(false); }}
              className="bg-gray-100 hover:bg-gray-200 text-gray-600 px-6 py-2.5 rounded-xl text-sm font-medium transition-colors">
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-3 mb-4 flex gap-3 flex-wrap items-end">
        <div className="flex-1 min-w-[180px]">
          <label className="text-xs font-medium text-gray-400 block mb-1">Search</label>
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Name, admission no., parent…" className={inputCls + " w-full"} />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-400 block mb-1">Status</label>
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className={inputCls}>
            <option value="all">All statuses</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-gray-400 block mb-1">Class</label>
          <select value={filterClass} onChange={(e) => setFilterClass(e.target.value)} className={inputCls}>
            <option value="all">All classes</option>
            {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        {(search || filterStatus !== "all" || filterClass !== "all") && (
          <button onClick={() => { setSearch(""); setFilterStatus("all"); setFilterClass("all"); }}
            className="text-xs text-blue-500 hover:text-blue-700 px-3 py-2 rounded-lg hover:bg-blue-50 transition-colors">
            Clear filters
          </button>
        )}
        <span className="text-xs text-gray-400 ml-auto self-center">
          {filtered.length} of {admissions.length} shown
        </span>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {filtered.length === 0 ? (
          <div className="text-center py-14 text-gray-400">
            <p className="text-3xl mb-2">📭</p>
            <p className="text-sm">No applications match your filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide border-b border-gray-100">
                  <th className="px-4 py-3 text-left font-medium">Admission ID</th>
                  <th className="px-4 py-3 text-left font-medium">Student</th>
                  <th className="px-4 py-3 text-left font-medium">Gender</th>
                  <th className="px-4 py-3 text-left font-medium">Parent / Guardian</th>
                  <th className="px-4 py-3 text-left font-medium">Class</th>
                  <th className="px-4 py-3 text-left font-medium">Phone</th>
                  <th className="px-4 py-3 text-left font-medium">Status</th>
                  <th className="px-4 py-3 text-left font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((a) => {
                  const studentName = a.first_name && a.last_name
                    ? `${a.first_name} ${a.last_name}` : a.student_name ?? "—";
                  const isExpanded = expandedId === a.id;

                  return (
                    // FIX: key on React.Fragment, not the inner <tr>
                    <React.Fragment key={a.id}>
                      <tr
                        className="hover:bg-blue-50/20 transition-colors cursor-pointer"
                        onClick={() => setExpandedId(isExpanded ? null : a.id)}
                        aria-expanded={isExpanded}
                      >
                        <td className="px-4 py-3 font-mono text-xs text-gray-500">{a.admission_number ?? "—"}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            {a.photo_url || a.photo ? (
                              <img src={a.photo_url || a.photo} alt={`${studentName} photo`}
                                className="w-8 h-8 rounded-full object-cover flex-shrink-0 border border-gray-100" />
                            ) : (
                              <div aria-hidden="true"
                                className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xs flex-shrink-0">
                                {studentName[0]}
                              </div>
                            )}
                            <span className="font-medium text-gray-800">{studentName}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-gray-600">{a.gender ?? "—"}</td>
                        <td className="px-4 py-3">
                          <p className="text-gray-800">{a.parent_name ?? "—"}</p>
                          {a.relationship && <p className="text-xs text-gray-400">{a.relationship}</p>}
                        </td>
                        <td className="px-4 py-3 text-gray-600">{a.applied_class_name ?? "—"}</td>
                        <td className="px-4 py-3 text-gray-600">{a.phone ?? "—"}</td>
                        <td className="px-4 py-3"><StatusPill status={a.status} /></td>
                        <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <button onClick={() => setEditingAdm(a)} aria-label={`Edit ${studentName}`}
                              className="bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-100 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors">
                              ✏️ Edit
                            </button>
                            {a.status === "pending" && (
                              <>
                                <button onClick={() => approveAdmission(a)} aria-label={`Approve ${studentName}`}
                                  className="bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-colors">
                                  Approve
                                </button>
                                <button onClick={() => rejectAdmission(a)} aria-label={`Reject ${studentName}`}
                                  className="bg-amber-500 hover:bg-amber-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-colors">
                                  Reject
                                </button>
                              </>
                            )}
                            {a.status === "approved" && (
                              <button onClick={() => handleDownloadForm(a)} disabled={downloading === a.id}
                                aria-label={`Download form for ${studentName}`}
                                className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-100 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-50 whitespace-nowrap">
                                {downloading === a.id ? "⏳ Downloading…" : "📄 Admission Form"}
                              </button>
                            )}
                            <button onClick={() => deleteAdmission(a.id)} aria-label={`Delete ${studentName}`}
                              className="bg-red-50 hover:bg-red-600 text-red-600 hover:text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border border-red-100 hover:border-red-600">
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>

                      {isExpanded && (
                        <tr className="bg-slate-50/60">
                          <td colSpan={8} className="px-6 py-5">
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 text-sm">
                              <div><p className="text-xs text-gray-400 mb-0.5">Date of Birth</p><p className="font-medium text-gray-700">{a.date_of_birth ?? "—"}</p></div>
                              <div><p className="text-xs text-gray-400 mb-0.5">Nationality</p><p className="font-medium text-gray-700">{a.nationality ?? "—"}</p></div>
                              <div><p className="text-xs text-gray-400 mb-0.5">Religion</p><p className="font-medium text-gray-700">{a.religion ?? "—"}</p></div>
                              <div><p className="text-xs text-gray-400 mb-0.5">Email</p><p className="font-medium text-gray-700 break-all">{a.email ?? "—"}</p></div>
                              <div><p className="text-xs text-gray-400 mb-0.5">Alt. Phone</p><p className="font-medium text-gray-700">{a.alt_phone ?? "—"}</p></div>
                              <div><p className="text-xs text-gray-400 mb-0.5">Address</p><p className="font-medium text-gray-700">{a.address ?? "—"}</p></div>
                              <div><p className="text-xs text-gray-400 mb-0.5">Previous School</p><p className="font-medium text-gray-700">{a.previous_school ?? "—"}</p></div>
                              {a.health_notes && (
                                <div className="col-span-2">
                                  <p className="text-xs text-gray-400 mb-0.5">Health / Medical Notes</p>
                                  <p className="font-medium text-gray-700">{a.health_notes}</p>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {editingAdm && (
        <EditModal
          admission={editingAdm}
          classes={classes}
          onClose={() => setEditingAdm(null)}
          onSaved={(msg) => { setEditingAdm(null); setSuccess(msg); loadAdmissions(); }}
        />
      )}
    </div>
  );
};

export default Admissions;