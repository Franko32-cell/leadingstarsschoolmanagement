import API from "./api";

/**
 * Reports & Analytics tab service. Calls the AnalyticsDashboardView plus
 * the existing dashboardService.getDashboard() (already used by the main
 * Dashboard page) so counts aren't computed twice in two places.
 */

export const getAnalyticsDashboard = (params = {}) =>
  API.get("/analytics/dashboard/", { params }).then((res) => res.data);

/**
 * Attendance drill-down for a single class, for a standardized week
 * (Monday-Sunday) or calendar month containing `date` (defaults to today).
 */
export const getAttendanceDetail = (schoolClassId, { period = "week", date } = {}) =>
  API.get("/analytics/attendance-detail/", {
    params: { school_class: schoolClassId, period, ...(date ? { date } : {}) },
  }).then((res) => res.data);