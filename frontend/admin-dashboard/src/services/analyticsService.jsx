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

/**
 * Individual attendance records for a single class on a single day, via
 * the existing /attendance/ router endpoint (AttendanceViewSet) rather
 * than a new one-off endpoint. Normalizes DRF's paginated
 * {count, results: [...]} shape down to a plain array, since whether
 * pagination is enabled on this ViewSet may change independently of this
 * file.
 */
export const getAttendanceRecords = (schoolClassId, date) =>
  API.get("/attendance/", {
    params: { school_class: schoolClassId, date },
  }).then((res) => (Array.isArray(res.data) ? res.data : res.data?.results || []));

/**
 * Deletes a single attendance record (e.g. one marked wrong) via the same
 * /attendance/ router endpoint.
 */
export const deleteAttendanceRecord = (recordId) =>
  API.delete(`/attendance/${recordId}/`).then((res) => res.data);