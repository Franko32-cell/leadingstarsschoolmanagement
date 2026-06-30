import { Link } from "react-router-dom";

export const PrimaryButton = ({ to, children, className = "" }) => (
  <Link
    to={to}
    className={`inline-flex items-center justify-center rounded-full bg-gradient-to-r from-gold to-yellow-400 px-6 py-3 text-sm font-bold text-navy shadow-lg shadow-yellow-700/20 transition hover:-translate-y-0.5 ${className}`}
  >
    {children}
  </Link>
);

export const SecondaryButton = ({ to, children, className = "" }) => (
  <Link
    to={to}
    className={`inline-flex items-center justify-center rounded-full border border-white/30 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10 ${className}`}
  >
    {children}
  </Link>
);