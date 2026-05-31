import API from "./api";

export const login = async (username, password) => {
  const res  = await API.post("/auth/login/", { username, password });
  const data = res.data;
  localStorage.setItem("access",  data.access);
  localStorage.setItem("refresh", data.refresh);
  localStorage.setItem("user",    JSON.stringify(data.user));
  return data.user;
};

export const register = async (username, email, password) => {
  const res = await API.post("/auth/register/", { username, email, password });
  return res.data;
};

export const logout = () => {
  localStorage.removeItem("access");
  localStorage.removeItem("refresh");
  localStorage.removeItem("user");
  window.location.href = "/login";
};

export const getUser = () => {
  try {
    return JSON.parse(localStorage.getItem("user"));
  } catch {
    return null;
  }
};

export const isAuthenticated = () => !!localStorage.getItem("access");