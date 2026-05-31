import API from "../services/api";

export const getDashboard = async () => {
  const response = await API.get("/dashboard/");
  return response.data;
};