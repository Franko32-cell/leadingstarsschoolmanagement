import { useEffect, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";

const links = [
  { label: "Home", to: "/" },
  { label: "About", to: "/about" },
  { label: "Academics", to: "/academics" },
  { label: "Admissions", to: "/admissions" },
  { label: "Blog", to: "/blog" },
  { label: "News", to: "/news" },
  { label: "Contact", to: "/contact" },
];

const Navbar = () => {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const isHome = location.pathname === "/";

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const solid = !isHome || scrolled;

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all ${
        solid ? "bg-white shadow-md" : "bg-transparent"
      }`}
    >
      <div className="mx-auto flex h-[68px] max-w-7xl items-center justify-between px-5 md:px-8 lg:px-10">
        <Link to="/" className="flex items-center gap-3">
          <img
            src="/assets/logo.jpeg"
            alt="Leading Stars Academy logo"
            className="h-10 w-10 rounded-lg object-cover shadow"
          />
          <div>
            <p className={`font-display text-sm font-bold ${solid ? "text-navy" : "text-white"}`}>
              Leading Stars
            </p>
            <p className={`text-[10px] font-semibold uppercase tracking-[0.2em] ${solid ? "text-gold" : "text-white/70"}`}>
              Academy
            </p>
          </div>
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                `${solid ? "text-navy hover:text-gold" : "text-white hover:text-yellow-300"} text-sm font-medium transition ${
                  isActive ? "underline underline-offset-4" : ""
                }`
              }
            >
              {link.label}
            </NavLink>
          ))}
          <Link
            to="/login"
            className="rounded-full bg-gradient-to-r from-gold to-yellow-400 px-5 py-2 text-sm font-bold text-navy shadow-lg"
          >
            Portal Login
          </Link>
        </nav>

        <button
          className="md:hidden"
          aria-label="Toggle menu"
          onClick={() => setOpen((v) => !v)}
        >
          <div className={`mb-1 h-0.5 w-6 ${solid ? "bg-navy" : "bg-white"}`} />
          <div className={`mb-1 h-0.5 w-6 ${solid ? "bg-navy" : "bg-white"}`} />
          <div className={`h-0.5 w-6 ${solid ? "bg-navy" : "bg-white"}`} />
        </button>
      </div>

      {open && (
        <div className="border-t bg-white px-5 py-4 shadow-md md:hidden">
          <div className="flex flex-col gap-4">
            {links.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                onClick={() => setOpen(false)}
                className="text-sm font-medium text-navy"
              >
                {link.label}
              </NavLink>
            ))}
            <Link
              to="/login"
              onClick={() => setOpen(false)}
              className="rounded-full bg-gold px-5 py-3 text-center font-bold text-white"
            >
              Portal Login
            </Link>
          </div>
        </div>
      )}
    </header>
  );
};

export default Navbar;