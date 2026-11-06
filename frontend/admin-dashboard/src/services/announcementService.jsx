import API from "./api";

export const getAnnouncement = async () => {

  const res = await API.get("announcements/");

  return res.data;

};

export const createAnnouncement = async (data) => {

  const res = await API.post("announcements/", data);

  return res.data;

};