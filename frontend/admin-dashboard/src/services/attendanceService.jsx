import API from "./api";

export const getAttendance = async () => {

  const res = await API.get("attendance/");

  return res.data;

};