import API from "./api";

export const getClasses = async () => {

  const res = await API.get("classes/");

  return res.data;

};