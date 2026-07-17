import API from "./api";

export const getStudents = async (params = {}) => {
  const res = await API.get("students/", { params });
  return res.data;
};

export const activateStudent = async (id) => {
  const res = await API.post(`students/${id}/activate/`);
  return res.data;
};

export const deactivateStudent = async (id) => {
  const res = await API.post(`students/${id}/deactivate/`);
  return res.data;
};

export const suspendStudent = async (id) => {
  const res = await API.post(`students/${id}/suspend/`);
  return res.data;
};

export const reinstateStudent = async (id) => {
  const res = await API.post(`students/${id}/reinstate/`);
  return res.data;
};

export const archiveStudent = async (id) => {
  const res = await API.post(`students/${id}/archive/`);
  return res.data;
};

export const restoreStudent = async (id) => {
  const res = await API.post(`students/${id}/restore/`);
  return res.data;
};

export const resetStudentPassword = async (id) => {
  const res = await API.post(`students/${id}/reset-password/`);
  return res.data;
};

export const createStudent = async (data) => {
  const res = await API.post("students/", data);
  return res.data;
};

export const deleteStudent = async (id) => {
  const res = await API.delete(`students/${id}/`);
  return res.data;
};
