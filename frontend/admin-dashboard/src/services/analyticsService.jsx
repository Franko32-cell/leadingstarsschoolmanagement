import API from "./api";

/**
 * Reports & Analytics tab service. Calls the new AnalyticsDashboardView
 * plus the existing dashboardService.getDashboard() (already used by the
 * main Dashboard page) so counts aren't computed twice in two places.
 */

export const getAnalyticsDashboard = (params = {}) =>
  API.get("/analytics/dashboard/", { params }).then((res) => res.data);