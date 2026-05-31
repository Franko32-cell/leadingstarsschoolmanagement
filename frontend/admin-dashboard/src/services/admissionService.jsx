import API from "./api";

export const getAdmissions = async () => {

  const res = await API.get("admissions/");

  return res.data;

};

export const createAdmission = async (data) => {

  const res = await API.post("admissions/", data);

  return res.data;

};