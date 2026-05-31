import { useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { isAuthenticated, getUser } from "./services/auth";
import { wakeUpServer } from "./services/api";  // ← ADD

import LandingPage    from "./pages/LandingPage";
import Layout         from "./components/Layout";
import Login          from "./pages/Login";
import Register       from "./pages/Register";
import Dashboard      from "./pages/Dashboard";
import Students       from "./pages/Students";
import Teachers       from "./pages/Teachers";
import Classes        from "./pages/Classes";
import Results        from "./pages/Results";
import Attendance     from "./pages/Attendance";
import Announcements  from "./pages/Announcements";
import Fees           from "./pages/Fees";
import Accounts       from "./pages/Accounts";
import Admissions     from "./pages/Admissions";
import Subjects       from "./pages/Subjects";
import Reports        from "./pages/Reports";
import AdminApprovals from "./pages/AdminApprovals";
import StudentPortal  from "./pages/student/StudentPortal";
import TeacherPortal  from "./pages/teacher/TeacherPortal";

// ── Role-based route guard ─────────────────────────────────────
const ProtectedRoute = ({ children, allowedRoles }) => {
  if (!isAuthenticated()) return <Navigate to="/login" replace />;
  const user = getUser();
  if (allowedRoles && !allowedRoles.includes(user?.role)) {
    if (user?.role === "student") return <Navigate to="/student" replace />;
    if (user?.role === "teacher") return <Navigate to="/teacher" replace />;
    if (user?.role === "admin")   return <Navigate to="/admin"   replace />;
    return <Navigate to="/login" replace />;
  }
  return children;
};

// ── App ────────────────────────────────────────────────────────
function App() {

  // Wake up Render server on first load to prevent cold-start CORS errors
  useEffect(() => {
    wakeUpServer();
  }, []);

  return (
    <Router>
      <Routes>

        {/* ── Public ── */}
        <Route path="/"         element={<LandingPage />} />
        <Route path="/login"    element={<Login />}       />
        <Route path="/register" element={<Register />}    />

        {/* ── Student portal ── */}
        <Route path="/student" element={
          <ProtectedRoute allowedRoles={["student"]}>
            <StudentPortal />
          </ProtectedRoute>
        } />

        {/* ── Teacher portal ── */}
        <Route path="/teacher" element={
          <ProtectedRoute allowedRoles={["teacher"]}>
            <TeacherPortal />
          </ProtectedRoute>
        } />

        {/* ── Admin dashboard ── */}
        <Route path="/admin" element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <Layout />
          </ProtectedRoute>
        }>
          <Route index                  element={<Dashboard />}      />
          <Route path="students"        element={<Students />}       />
          <Route path="teachers"        element={<Teachers />}       />
          <Route path="classes"         element={<Classes />}        />
          <Route path="admissions"      element={<Admissions />}     />
          <Route path="results"         element={<Results />}        />
          <Route path="attendance"      element={<Attendance />}     />
          <Route path="subjects"        element={<Subjects />}       />
          <Route path="announcements"   element={<Announcements />}  />
          <Route path="fees"            element={<Fees />}           />
          <Route path="accounts"        element={<Accounts />}       />
          <Route path="reports"         element={<Reports />}        />
          <Route path="admin-approvals" element={<AdminApprovals />} />
        </Route>

        {/* ── Fallback ── */}
        <Route path="*" element={<Navigate to="/" replace />} />

      </Routes>
    </Router>
  );
}

export default App;
