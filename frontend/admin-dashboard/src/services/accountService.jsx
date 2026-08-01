import API from "./api";

export const getAccountingAccounts = async (params = {}) => {
  const res = await API.get("/accounting/accounts/", { params });
  return res.data;
};

export const getAccountingTrialBalance = async (params = {}) => {
  const res = await API.get("/accounting/trial-balance/", { params });
  return res.data;
};
