import API from "./api";

/**
 * Admin Settings > Fees tab service. Talks to the existing FeeViewSet
 * (apps/fees/views.py) — no new backend endpoints were needed here beyond
 * what item 4's audit-logging pass already added `log_action()` calls to.
 *
 * Note: FeeViewSet supports exact-match filters (student, term,
 * school_class, status) but no free-text `search` param, so text search in
 * the UI is applied client-side against whatever page is currently loaded.
 */

export const getFeesAdmin = (params = {}) =>
  API.get("/fees/", { params }).then((res) => res.data);

export const payFee = (id, { amount, note = "" }) =>
  API.post(`/fees/${id}/pay/`, { amount, note }).then((res) => res.data);

export const addArrears = (id, arrears) =>
  API.post(`/fees/${id}/add-arrears/`, { arrears }).then((res) => res.data);

export const getFeeTransactions = (id) =>
  API.get(`/fees/${id}/transactions/`).then((res) => res.data);

export const getFeeSummary = (schoolClass, term) =>
  API.get("/fees/summary/", { params: { school_class: schoolClass, term } }).then((res) => res.data);

export const getSchoolClasses = () =>
  API.get("/classes/").then((res) => res.data);

export const getStudentsByClass = (schoolClass) =>
  API.get("/students/", { params: { school_class: schoolClass } }).then((res) => res.data);

export const sendBulkWhatsAppBills = (schoolClass, term) =>
  API.post("/fees/send-whatsapp/bulk/", null, { params: { school_class: schoolClass, term } }).then(
    (res) => res.data
  );