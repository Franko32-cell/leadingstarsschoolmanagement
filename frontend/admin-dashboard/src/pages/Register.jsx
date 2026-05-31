import { useState } from "react";
import { FaUser, FaLock, FaEnvelope, FaUserShield, FaClock } from "react-icons/fa";
import { Link, useNavigate } from "react-router-dom";
import { register } from "../services/auth";

const Register = () => {
  const navigate                = useNavigate();
  const [username, setUsername] = useState("");
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm]   = useState("");
  const [error, setError]       = useState("");
  const [submitted, setSubmitted] = useState(false); // show pending state
  const [loading, setLoading]   = useState(false);

  const handleRegister = async (e) => {
    e.preventDefault();
    setError("");

    if (password !== confirm) { setError("Passwords do not match."); return; }
    if (password.length < 6)  { setError("Password must be at least 6 characters."); return; }

    setLoading(true);
    try {
      await register(username, email, password);
      setSubmitted(true); // show the pending approval screen
    } catch (err) {
      setError(err.response?.data?.error || "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // ── Pending approval confirmation screen ──
  if (submitted) {
    return (
      <div className="flex h-screen">
        <div className="hidden md:flex w-1/2 bg-gradient-to-br from-blue-800 to-blue-600 text-white items-center justify-center p-12">
          <div className="text-center">
            <div className="w-24 h-24 bg-white bg-opacity-20 rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="text-4xl font-extrabold text-white">LS</span>
            </div>
            <h1 className="text-4xl font-extrabold mb-3">Leading Stars Academy</h1>
            <p className="text-blue-200 text-lg">Where Leaders Are Born</p>
          </div>
        </div>

        <div className="flex w-full md:w-1/2 items-center justify-center bg-gray-50 p-6">
          <div className="bg-white rounded-2xl shadow-lg w-full max-w-md p-8 text-center">
            <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <FaClock className="text-amber-500 text-2xl" />
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Awaiting Approval</h2>
            <p className="text-gray-500 text-sm mb-6 leading-relaxed">
              Your admin account for <span className="font-semibold text-gray-700">{username}</span> has
              been created. An existing administrator must approve your account before you can log in.
            </p>

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-left mb-6 space-y-2 text-sm">
              <div className="flex items-center gap-2 text-amber-700">
                <span>⏳</span>
                <span>Your account is currently <b>pending review</b></span>
              </div>
              <div className="flex items-center gap-2 text-amber-700">
                <span>📧</span>
                <span>You'll be able to sign in once approved</span>
              </div>
              <div className="flex items-center gap-2 text-amber-700">
                <span>🔐</span>
                <span>Contact an existing admin if approval is urgent</span>
              </div>
            </div>

            <Link
              to="/login"
              className="w-full block bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl transition-colors text-sm"
            >
              Go to Login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ── Registration form ──
  return (
    <div className="flex h-screen">

      {/* Left branding panel */}
      <div className="hidden md:flex w-1/2 bg-gradient-to-br from-blue-800 to-blue-600 text-white items-center justify-center p-12">
        <div className="text-center">
          <div className="w-24 h-24 bg-white bg-opacity-20 rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="text-4xl font-extrabold text-white">LS</span>
          </div>
          <h1 className="text-4xl font-extrabold mb-3">Leading Stars Academy</h1>
          <p className="text-blue-200 text-lg">Where Leaders Are Born</p>
          <div className="mt-10 p-4 bg-white bg-opacity-10 rounded-xl text-left text-sm text-blue-100 space-y-2">
            <div className="flex items-center gap-2">
              <FaUserShield className="text-blue-300" />
              <span>Admin accounts require approval before use</span>
            </div>
            <p className="text-xs text-blue-300 mt-2">
              New admin accounts must be reviewed and approved by an existing administrator.
              Teachers and students are added through the admin dashboard.
            </p>
          </div>
        </div>
      </div>

      {/* Right register panel */}
      <div className="flex w-full md:w-1/2 items-center justify-center bg-gray-50 p-6">
        <div className="bg-white rounded-2xl shadow-lg w-full max-w-md p-8">

          <div className="text-center mb-6">
            <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-3">
              <FaUserShield className="text-white text-xl" />
            </div>
            <h2 className="text-2xl font-bold text-gray-800">Create Admin Account</h2>
            <p className="text-sm text-gray-400 mt-1">Leading Stars Academy</p>
          </div>

          {/* Approval notice banner */}
          <div className="mb-5 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-700 flex items-start gap-2">
            <FaClock className="flex-shrink-0 mt-0.5" />
            <span>
              New accounts require approval by an existing admin before you can log in.
            </span>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-600 border border-red-200 rounded-lg text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleRegister} className="space-y-4">
            <div className="flex items-center border border-gray-300 rounded-lg px-3 focus-within:ring-2 focus-within:ring-blue-500 transition">
              <FaUser className="text-gray-400 text-sm flex-shrink-0" />
              <input type="text" placeholder="Username" required
                className="w-full p-3 outline-none text-sm"
                value={username} onChange={(e) => setUsername(e.target.value)} />
            </div>

            <div className="flex items-center border border-gray-300 rounded-lg px-3 focus-within:ring-2 focus-within:ring-blue-500 transition">
              <FaEnvelope className="text-gray-400 text-sm flex-shrink-0" />
              <input type="email" placeholder="Email address"
                className="w-full p-3 outline-none text-sm"
                value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>

            <div className="flex items-center border border-gray-300 rounded-lg px-3 focus-within:ring-2 focus-within:ring-blue-500 transition">
              <FaLock className="text-gray-400 text-sm flex-shrink-0" />
              <input type="password" placeholder="Password (min. 6 characters)" required
                className="w-full p-3 outline-none text-sm"
                value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>

            <div className="flex items-center border border-gray-300 rounded-lg px-3 focus-within:ring-2 focus-within:ring-blue-500 transition">
              <FaLock className="text-gray-400 text-sm flex-shrink-0" />
              <input type="password" placeholder="Confirm password" required
                className="w-full p-3 outline-none text-sm"
                value={confirm} onChange={(e) => setConfirm(e.target.value)} />
            </div>

            <button type="submit" disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition-colors disabled:opacity-50 text-sm">
              {loading ? "Creating account…" : "Create Admin Account"}
            </button>
          </form>

          <p className="text-center text-xs text-gray-400 mt-6">
            Already have an account?{" "}
            <Link to="/login" className="text-blue-600 hover:underline font-medium">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;