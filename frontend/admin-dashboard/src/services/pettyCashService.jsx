// I don't have your api.jsx, so this assumes the common pattern of a
// default-exported axios instance with baseURL already set to /api and
// auth headers already attached (matching how accountService.jsx calls
// getAccountingAccounts()/getAccountingTrialBalance()). If your api.jsx
// exports something else (named export, fetch wrapper, etc.) swap the
// import line below to match — everything after it stays the same.
import api from "./api";

const BASE = "/accounting/petty-cash";

// ---- Floats -----------------------------------------------------------

export const getPettyCashFloats = async () => {
  const { data } = await api.get(`${BASE}/floats/`);
  return data;
};

export const createPettyCashFloat = async (payload) => {
  const { data } = await api.post(`${BASE}/floats/`, payload);
  return data;
};

export const closePettyCashFloat = async (floatId) => {
  const { data } = await api.post(`${BASE}/floats/${floatId}/close/`);
  return data;
};

export const getPettyCashReconciliation = async (floatId, asOf) => {
  const { data } = await api.get(`${BASE}/floats/${floatId}/reconciliation/`, {
    params: asOf ? { as_of: asOf } : {},
  });
  return data;
};

// ---- Transactions -------------------------------------------------------

export const getPettyCashTransactions = async ({ float, status } = {}) => {
  const { data } = await api.get(`${BASE}/transactions/`, {
    params: { float, status },
  });
  return data;
};

export const submitPettyCashTransaction = async (payload) => {
  // payload: { float, transaction_type, amount, description, date?,
  //            contra_account?, adjustment_direction?, receipt? }
  // Use FormData when a receipt file is attached.
  const isFileUpload = payload.receipt instanceof File;
  if (!isFileUpload) {
    const { data } = await api.post(`${BASE}/transactions/`, payload);
    return data;
  }
  const formData = new FormData();
  Object.entries(payload).forEach(([key, value]) => {
    if (value !== undefined && value !== null) formData.append(key, value);
  });
  const { data } = await api.post(`${BASE}/transactions/`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
};

export const approvePettyCashTransaction = async (txnId) => {
  const { data } = await api.post(`${BASE}/transactions/${txnId}/approve/`);
  return data;
};

export const rejectPettyCashTransaction = async (txnId, reason = "") => {
  const { data } = await api.post(`${BASE}/transactions/${txnId}/reject/`, { reason });
  return data;
};

export const payPettyCashTransaction = async (txnId) => {
  const { data } = await api.post(`${BASE}/transactions/${txnId}/pay/`);
  return data;
};

// ---- Reports --------------------------------------------------------------

export const getPettyCashOutstandingClaims = async (floatId) => {
  const { data } = await api.get(`${BASE}/reports/outstanding/`, {
    params: floatId ? { float: floatId } : {},
  });
  return data;
};

export const getPettyCashDailySummary = async (date, floatId) => {
  const { data } = await api.get(`${BASE}/reports/daily/`, {
    params: { date, float: floatId },
  });
  return data;
};

export const getPettyCashMonthlySummary = async (year, month, floatId) => {
  const { data } = await api.get(`${BASE}/reports/monthly/`, {
    params: { year, month, float: floatId },
  });
  return data;
};

export const exportPettyCashDailyCsv = (date, floatId) =>
  api.get(`${BASE}/reports/daily/`, {
    params: { date, float: floatId, export: "csv" },
    responseType: "blob",
  });

export const exportPettyCashMonthlyCsv = (year, month, floatId) =>
  api.get(`${BASE}/reports/monthly/`, {
    params: { year, month, float: floatId, export: "csv" },
    responseType: "blob",
  });