import API from "./api";

const BASE = "/school-calendar/";

export const getHolidays = async (filters = {}) => {
  const { data } = await API.get(BASE, { params: filters });
  return data;
};

export const createHoliday = async (payload) => {
  const { data } = await API.post(BASE, payload);
  return data;
};

export const updateHoliday = async (id, payload) => {
  const { data } = await API.patch(`${BASE}${id}/`, payload);
  return data;
};

export const deleteHoliday = async (id) => {
  await API.delete(`${BASE}${id}/`);
};
