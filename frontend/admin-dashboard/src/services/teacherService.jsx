import API from "./api";

export const getTeachers = async () => {

  const res = await API.get("teachers/");

  return res.data;

};