import API from "./api";

/**
 * Fetch a page of audit logs.
 * @param {Object} params - action, module, status, user, role, date_from,
 *   date_to, search, ordering, page, page_size
 */
export const getAuditLogs = (params = {}) =>
  API.get("/audit-logs/", { params }).then((res) => res.data);

/**
 * Triggers a CSV download of every log matching the current filters
 * (ignores pagination - exports the full filtered set).
 */
export const exportAuditLogsCSV = async (params = {}) => {
  const res = await API.get("/audit-logs/export/", {
    params,
    responseType: "blob",
  });
  const url = window.URL.createObjectURL(new Blob([res.data]));
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", "audit_logs.csv");
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};