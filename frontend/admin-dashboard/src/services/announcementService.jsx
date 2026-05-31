import API from "./api";

export const getAnnouncement = async () => {

  const res = await API.get("announcement/");

  return res.data;

};

export const createAnnouncement = async (data) => {

  const res = await API.post("announcement/", data);

  return res.data;

};