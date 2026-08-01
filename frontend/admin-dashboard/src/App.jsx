import { useEffect, lazy, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { isAuthenticated, getUser } from "./services/auth";
import { wakeUpServer } from "./services/api";

import PublicRoutes from "./routes/PublicRoutes";
import ScrollToTop from "./components/common/ScrollToTop";
import PageLoader from "./components/common/PageLoader";

// Auth pages (kept eager – small and frequently accessed)
import Login from "./pages/Login";
import Register from "./pages/Register";

// Admin layout (eager – the shell loads instantly)
import Layout from "./components/Layout";

// Lazy-load admin pages to keep the public bundle lean
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Students = lazy(() => import("./pages/Students"));
const Teachers = lazy(() => import("./pages/Teachers"));
const Classes = lazy(() => import("./pages/Classes"));
const Results = lazy(() => import("./pages/Results"));
const Attendance = lazy(() => import("./pages/Attendance"));
const Announcements = lazy(() => import("./pages/Announcements"));
const Fees = lazy(() => import("./pages/Fees"));
const Accounts = lazy(() => import("./pages/Accounts"));
const Accounting = lazy(() => import("./pages/Accounting"));
const Admissions = lazy(() => import("./pages/Admissions"));
const Subjects = lazy(() => import("./pages/Subjects"));
const Reports = lazy(() => import("./pages/Reports"));
const AdminApprovals = lazy(() => import("./pages/AdminApprovals"));
const AdminSettings = lazy(() => import("./pages/admin/AdminSettings"));
const StudentPortal = lazy(() => import("./pages/student/StudentPortal"));
const TeacherPortal = lazy(() => import("./pages/teacher/TeacherPortal"));

const ProtectedRoute = ({ children, allowedRoles }) => {
  if (!isAuthenticated()) return <Navigate to="/login" replace />;
  const user = getUser();

  if (allowedRoles && !allowedRoles.includes(user?.role)) {
    if (user?.role === "student") return <Navigate to="/student" replace />;
    if (user?.role === "teacher") return <Navigate to="/teacher" replace />;
    if (user?.role === "admin") return <Navigate to="/admin" replace />;
    return <Navigate to="/login" replace />;
  }

  return children;
};

function App() {
  useEffect(() => {
    wakeUpServer();
  }, []);

  return (
    <HelmetProvider>

        <ScrollToTop />
        <Suspense fallback={<PageLoader />}>
          <Routes>
            {/* Public marketing site (Home, About, Academics, Blog, News, Legal, etc.) */}
            {PublicRoutes}

            {/* Authentication */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            {/* Student Portal */}
            <Route
              path="/student"
              element={
                <ProtectedRoute allowedRoles={["student"]}>
                  <StudentPortal />
                </ProtectedRoute>
              }
            />

            {/* Teacher Portal */}
            <Route
              path="/teacher"
              element={
                <ProtectedRoute allowedRoles={["teacher"]}>
                  <TeacherPortal />
                </ProtectedRoute>
              }
            />

            {/* Admin Portal */}
            <Route
              path="/admin"
              element={
                <ProtectedRoute allowedRoles={["admin"]}>
                  <Layout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Dashboard />} />
              <Route path="students" element={<Students />} />
              <Route path="teachers" element={<Teachers />} />
              <Route path="classes" element={<Classes />} />
              <Route path="admissions" element={<Admissions />} />
              <Route path="results" element={<Results />} />
              <Route path="attendance" element={<Attendance />} />
              <Route path="subjects" element={<Subjects />} />
              <Route path="announcements" element={<Announcements />} />
              <Route path="fees" element={<Fees />} />
              <Route path="accounts" element={<Accounts />} />
              <Route path="accounting" element={<Accounting />} />
              <Route path="reports" element={<Reports />} />
              <Route path="admin-approvals" element={<AdminApprovals />} />
              <Route path="settings" element={<AdminSettings />} />
            </Route>

            {/* Catch-all */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>

    </HelmetProvider>
  );
}

export default App;