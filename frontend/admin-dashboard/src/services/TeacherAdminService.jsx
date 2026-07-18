import API from "./api";

/**
 * Admin-only account management actions for teachers. Mirrors
 * studentAdminService.js exactly — same endpoint shape on
 * /api/teachers/{id}/... .
 *
 * NOTE: export names here must match the import in TeachersAdmin.jsx
 * exactly (getTeachersAdmin, not getTeachers) — a mismatch here causes
 * PersonAdminTable's fetchList(params) call to throw synchronously
 * before any network request is ever sent.
 */

export const getTeachersAdmin = async (params = {}) => {
  const res = await API.get("teachers/", { params });
  return res.data;
};

export const activateTeacher = async (id) => {
  const res = await API.post(`teachers/${id}/activate/`);
  return res.data;
};

export const deactivateTeacher = async (id) => {
  const res = await API.post(`teachers/${id}/deactivate/`);
  return res.data;
};

export const suspendTeacher = async (id) => {
  const res = await API.post(`teachers/${id}/suspend/`);
  return res.data;
};

export const reinstateTeacher = async (id) => {
  const res = await API.post(`teachers/${id}/reinstate/`);
  return res.data;
};

export const archiveTeacher = async (id) => {
  const res = await API.post(`teachers/${id}/archive/`);
  return res.data;
};

export const restoreTeacher = async (id) => {
  const res = await API.post(`teachers/${id}/restore/`);
  return res.data;
};

export const resetTeacherPassword = async (id) => {
  const res = await API.post(`teachers/${id}/reset-password/`);
  return res.data;
};