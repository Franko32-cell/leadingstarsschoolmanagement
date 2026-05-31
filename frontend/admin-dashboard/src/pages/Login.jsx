import { useState } from "react";
import {
  FaUser, FaLock, FaUserShield, FaChalkboardTeacher,
  FaUserGraduate, FaClock, FaEnvelope, FaPhone,
  FaChevronDown, FaChevronUp, FaEye, FaEyeSlash,
} from "react-icons/fa";
import { useNavigate, Link } from "react-router-dom";
import { login } from "../services/auth";

const ROLES = [
  { value: "admin",   label: "Admin",   icon: <FaUserShield />,        hint: "Use your username",         placeholder: "Username"         },
  { value: "teacher", label: "Teacher", icon: <FaChalkboardTeacher />, hint: "Use your Teacher ID",       placeholder: "Teacher ID"       },
  { value: "student", label: "Student", icon: <FaUserGraduate />,      hint: "Use your Admission Number", placeholder: "Admission Number" },
];

const FORGOT_CONTENT = {
  admin: {
    title: "Forgot your password?",
    body: "Admins can reset their password via the registration page, or contact your system administrator for assistance.",
    showContact: false,
  },
  teacher: {
    title: "Can't access your account?",
    body: "Teachers cannot reset passwords directly. Please contact the school administration office with your Teacher ID to have your password reset.",
    showContact: true,
  },
  student: {
    title: "Can't access your account?",
    body: "Students cannot reset passwords directly. Please visit the administration office with your admission number and a valid school ID to have your password reset.",
    showContact: true,
  },
};

const Login = () => {
  const navigate                        = useNavigate();
  const [role, setRole]                 = useState("student");
  const [username, setUsername]         = useState("");
  const [password, setPassword]         = useState("");
  const [error, setError]               = useState("");
  const [pendingApproval, setPending]   = useState(false);
  const [loading, setLoading]           = useState(false);
  const [showForgot, setShowForgot]     = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const selectedRole  = ROLES.find((r) => r.value === role);
  const forgotContent = FORGOT_CONTENT[role];

  const handleRoleChange = (newRole) => {
    setRole(newRole);
    setUsername("");
    setError("");
    setPending(false);
    setShowForgot(false);
    setShowPassword(false);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setPending(false);
    setLoading(true);
    try {
      const user = await login(username, password);
      if      (user.role === "admin")   navigate("/admin");
      else if (user.role === "teacher") navigate("/teacher");
      else if (user.role === "student") navigate("/student");
      else navigate("/");
    } catch (err) {
      const errData = err.response?.data;
      if (errData?.error === "pending_approval") {
        setPending(true);
      } else {
        setError(errData?.error || errData?.message || "Invalid credentials. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen">

      {/* ── Left branding panel ── */}
      <div className="hidden md:flex w-5/12 bg-blue-700 text-white flex-col items-center justify-center p-10">
        <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mb-5">
          <span className="text-2xl font-medium text-white">LS</span>
        </div>
        <h1 className="text-3xl font-medium mb-1 text-center">Leading Stars Academy</h1>
        <p className="text-blue-300 text-sm mb-10">Where Leaders Are Born</p>
        <div className="space-y-3 w-full max-w-xs">
          {[
            { icon: <FaUserShield />,        text: "Admins — full system access"            },
            { icon: <FaChalkboardTeacher />, text: "Teachers — class, attendance & results" },
            { icon: <FaUserGraduate />,      text: "Students — results, reports & fees"     },
          ].map(({ icon, text }) => (
            <div key={text} className="flex items-center gap-3 text-blue-200 text-sm">
              <span className="text-blue-300 text-xs">{icon}</span>
              <span>{text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Right login panel ── */}
      <div className="flex flex-1 items-center justify-center bg-gray-50 p-6">
        <div className="bg-white rounded-2xl shadow-md w-full max-w-md p-8">

          <Link to="/" className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-blue-600 transition-colors mb-5">
            <span>←</span> Back to Home
          </Link>

          <h2 className="text-2xl font-semibold text-gray-800 text-center mb-1">Welcome Back</h2>
          <p className="text-sm text-gray-400 text-center mb-6">Sign in to your portal</p>

          {/* ── Role selector ── */}
          <div className="flex mb-5 border border-gray-200 rounded-xl overflow-hidden">
            {ROLES.map((r) => (
              <button
                key={r.value}
                type="button"
                onClick={() => handleRoleChange(r.value)}
                className={`flex-1 py-2.5 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors ${
                  role === r.value
                    ? "bg-blue-600 text-white"
                    : "bg-gray-50 text-gray-500 hover:bg-gray-100"
                }`}
              >
                {r.icon} {r.label}
              </button>
            ))}
          </div>

          {/* ── Role hint ── */}
          <div className="mb-4 p-2.5 bg-blue-50 text-blue-700 rounded-lg text-xs flex items-center gap-2">
            {selectedRole?.icon}
            <span>{selectedRole?.hint}</span>
          </div>

          {/* ── Pending approval ── */}
          {pendingApproval && (
            <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-xl">
              <div className="flex items-center gap-2 text-amber-700 font-semibold text-sm mb-1">
                <FaClock className="flex-shrink-0" /> Account Pending Approval
              </div>
              <p className="text-amber-600 text-xs leading-relaxed">
                Your admin account is awaiting approval. Please contact your system administrator or try again later.
              </p>
            </div>
          )}

          {/* ── Error ── */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-600 border border-red-200 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* ── Form ── */}
          <form onSubmit={handleLogin} className="space-y-3">

            {/* Username field */}
            <div className="flex items-center border border-gray-300 rounded-lg px-3 focus-within:ring-2 focus-within:ring-blue-500 transition">
              <FaUser className="text-gray-400 text-xs flex-shrink-0" />
              <input
                type="text"
                placeholder={selectedRole?.placeholder}
                className="w-full p-3 outline-none text-sm"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>

            {/* Password field */}
            <div className="flex items-center border border-gray-300 rounded-lg px-3 focus-within:ring-2 focus-within:ring-blue-500 transition">
              <FaLock className="text-gray-400 text-xs flex-shrink-0" />
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                className="w-full p-3 outline-none text-sm"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="text-gray-400 hover:text-blue-600 transition-colors ml-2 flex-shrink-0"
                tabIndex={-1}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <FaEyeSlash className="text-sm" /> : <FaEye className="text-sm" />}
              </button>
            </div>

            {/* Forgot password toggle */}
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setShowForgot((v) => !v)}
                className="text-xs text-blue-600 hover:underline flex items-center gap-1"
              >
                Forgot password?
                {showForgot
                  ? <FaChevronUp className="text-[10px]" />
                  : <FaChevronDown className="text-[10px]" />}
              </button>
            </div>

            {/* Forgot password notice */}
            {showForgot && (
              <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 leading-relaxed">
                <p className="font-semibold text-amber-900 mb-1">{forgotContent.title}</p>
                <p>{forgotContent.body}</p>
                {forgotContent.showContact && (
                  <div className="flex gap-2 mt-3">
                      <a href="mailto:admin@leadingstars.edu" className="flex-1 flex items-center justify-center gap-1.5 py-1.5 bg-white border border-amber-300 rounded-lg text-amber-800 hover:bg-amber-100 transition-colors">
                        <FaEnvelope className="text-[10px]" /> Email admin
                      </a>
                      <a href="tel:+000000000" className="flex-1 flex items-center justify-center gap-1.5 py-1.5 bg-white border border-amber-300 rounded-lg text-amber-800 hover:bg-amber-100 transition-colors">
                        <FaPhone className="text-[10px]" /> Call office
                      </a>
                    </div>
                )}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition-colors disabled:opacity-50 text-sm"
            >
              {loading ? "Signing in…" : `Sign in as ${selectedRole?.label}`}
            </button>

          </form>

          {role === "admin" && (
            <p className="text-center text-xs text-gray-400 mt-5">
              New admin?{" "}
              <Link to="/register" className="text-blue-600 hover:underline font-medium">
                Create an account
              </Link>
            </p>
          )}

        </div>
      </div>
    </div>
  );
};

export default Login;
