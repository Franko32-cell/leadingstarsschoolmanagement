import API from "./api";

/**
 * Admin-only account management actions for teachers. Mirrors
 * studentAdminService.jsx exactly — same endpoint shape on
 * /api/teachers/{id}/... . Kept separate from any existing
 * teacherService.jsx so current call sites are untouched.
 */

export const getTeachersAdmin = (params = {}) =>
  API.get("/teachers/", { params }).then((res) => res.data);

const post = (id, action) => API.post(`/teachers/${id}/${action}/`).then((res) => res.data);

export const activateTeacher   = (id) => post(id, "activate");
export const deactivateTeacher = (id) => post(id, "deactivate");
export const suspendTeacher    = (id) => post(id, "suspend");
export const reinstateTeacher  = (id) => post(id, "reinstate");
export const archiveTeacher    = (id) => post(id, "archive");
export const restoreTeacher    = (id) => post(id, "restore");
export const resetTeacherPassword = (id) => post(id, "reset-password");