import API from "./api";
/**
 * Admin-only account management actions for students. These call the new
 * endpoints added to StudentViewSet — activate/deactivate/suspend/
 * reinstate/archive/restore/reset-password/unlock-login — all under
 * /api/students/{id}/...
 *
 * Separate from the existing studentService.jsx on purpose: this file is
 * only ever used from the Admin Settings > Students tab, so existing
 * student CRUD call sites elsewhere in the app are untouched.
 */
export const getStudentsAdmin = (params = {}) =>
  API.get("/students/", { params }).then((res) => res.data);
const post = (id, action) => API.post(`/students/${id}/${action}/`).then((res) => res.data);
export const activateStudent      = (id) => post(id, "activate");
export const deactivateStudent    = (id) => post(id, "deactivate");
export const suspendStudent       = (id) => post(id, "suspend");
export const reinstateStudent     = (id) => post(id, "reinstate");
export const archiveStudent       = (id) => post(id, "archive");
export const restoreStudent       = (id) => post(id, "restore");
export const resetStudentPassword = (id) => post(id, "reset-password");
export const unlockStudentLogin   = (id) => post(id, "unlock-login");
