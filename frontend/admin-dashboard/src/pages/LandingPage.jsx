import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";


// ─────────────────────────────────────────────
// Google Fonts injection
// ─────────────────────────────────────────────
const FontLoader = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=DM+Sans:wght@300;400;500;600&display=swap');
    :root {
      --navy:   #0a1f44;
      --gold:   #c8962a;
      --gold-l: #e8b84b;
      --cream:  #faf8f3;
      --text:   #1a2740;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'DM Sans', sans-serif; color: var(--text); background: #fff; }
    .font-display { font-family: 'Playfair Display', serif; }
    @keyframes fadeUp   { from { opacity:0; transform:translateY(28px) } to { opacity:1; transform:translateY(0) } }
    @keyframes fadeIn   { from { opacity:0 } to { opacity:1 } }
    @keyframes scaleIn  { from { opacity:0; transform:scale(.95) } to { opacity:1; transform:scale(1) } }
    @keyframes slideRight { from { width:0 } to { width:100% } }
    .anim-fade-up   { animation: fadeUp   .8s ease both }
    .anim-fade-in   { animation: fadeIn   .6s ease both }
    .anim-scale-in  { animation: scaleIn  .7s ease both }
    .delay-1 { animation-delay:.15s }
    .delay-2 { animation-delay:.30s }
    .delay-3 { animation-delay:.45s }
    .delay-4 { animation-delay:.60s }
    .delay-5 { animation-delay:.75s }

    /* Nav */
    .nav-link { position:relative; font-size:.85rem; font-weight:500; color:#fff; text-decoration:none; padding:.25rem 0; transition:color .2s; }
    .nav-link::after { content:''; position:absolute; bottom:-2px; left:0; width:0; height:2px; background:var(--gold-l); transition:width .25s; }
    .nav-link:hover { color:var(--gold-l); }
    .nav-link:hover::after { width:100%; }
    .nav-link.scrolled { color:var(--navy); }
    .nav-link.scrolled:hover { color:var(--gold); }
    .nav-link.scrolled::after { background:var(--gold); }

    /* Stat counter */
    .stat-number { font-family:'Playfair Display',serif; font-size:3rem; font-weight:900; color:var(--navy); line-height:1; }

    /* Cards */
    .news-card:hover .news-img { transform:scale(1.05); }
    .news-img { transition:transform .4s ease; }

    /* Section divider */
    .gold-line { width:60px; height:3px; background:var(--gold); border-radius:2px; }
  `}</style>
);

// ─────────────────────────────────────────────
// Scroll-reveal hook
// ─────────────────────────────────────────────
const useReveal = () => {
  useEffect(() => {
    const els = document.querySelectorAll(".reveal");
    const io  = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("revealed"); io.unobserve(e.target); } }),
      { threshold: 0.12 }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
};

// ─────────────────────────────────────────────
// Animated counter
// ─────────────────────────────────────────────
const Counter = ({ end, suffix = "", duration = 1800 }) => {
  const [val, setVal]   = useState(0);
  const ref             = useRef(null);
  const started         = useRef(false);

  useEffect(() => {
    const el = ref.current;
    const io = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !started.current) {
        started.current = true;
        const start = performance.now();
        const tick  = (now) => {
          const p = Math.min((now - start) / duration, 1);
          setVal(Math.round(p * end));
          if (p < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      }
    }, { threshold: 0.5 });
    if (el) io.observe(el);
    return () => io.disconnect();
  }, [end, duration]);

  return <span ref={ref}>{val.toLocaleString()}{suffix}</span>;
};

// ─────────────────────────────────────────────
// Navbar
// ─────────────────────────────────────────────
const NAV_LINKS = [
  { label: "Home",         href: "#home"       },
  { label: "About",        href: "#about"      },
  { label: "Academics",    href: "#academics"  },
  { label: "Admissions",   href: "#admissions" },
  { label: "News",         href: "#news"       },
  { label: "Contact",      href: "#contact"    },
];

const Navbar = () => {
  const [scrolled, setScrolled]   = useState(false);
  const [menuOpen, setMenuOpen]   = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav style={{
      position:   "fixed", top: 0, left: 0, right: 0, zIndex: 100,
      padding:    "0 5vw",
      height:     "68px",
      display:    "flex", alignItems: "center", justifyContent: "space-between",
      transition: "background .3s, box-shadow .3s",
      background: scrolled ? "#fff" : "transparent",
      boxShadow:  scrolled ? "0 2px 20px rgba(0,0,0,.10)" : "none",
    }}>
      {/* Brand */}
      <a href="#home" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: "12px" }}>
        <img
          src="/assets/logo.jpeg"
          alt="Leading Stars Academy"
          style={{
            width: "42px", height: "42px", borderRadius: "10px",
            objectFit: "cover", boxShadow: "0 4px 12px rgba(10,31,68,.3)",
          }}
        />
        <div>
          <p style={{ fontFamily: "'Playfair Display',serif", fontWeight: 700, fontSize: "15px", color: scrolled ? "#0a1f44" : "#fff", lineHeight: 1.1 }}>Leading Stars</p>
          <p style={{ fontSize: "10px", color: scrolled ? "#c8962a" : "rgba(255,255,255,.7)", fontWeight: 500, letterSpacing: "1px", textTransform: "uppercase" }}>Academy</p>
        </div>
      </a>

      {/* Desktop links */}
      <div style={{ display: "flex", gap: "32px", alignItems: "center" }} className="hidden-mobile">
        {NAV_LINKS.map((l) => (
          <a key={l.href} href={l.href} className={`nav-link${scrolled ? " scrolled" : ""}`}>{l.label}</a>
        ))}
        <Link to="/login" style={{
          background: "linear-gradient(135deg,#c8962a,#e8b84b)",
          color: "#0a1f44", fontWeight: 700, fontSize: ".82rem",
          padding: "9px 22px", borderRadius: "50px", textDecoration: "none",
          boxShadow: "0 4px 12px rgba(200,150,42,.35)", transition: "transform .2s, box-shadow .2s",
          whiteSpace: "nowrap",
        }}
          onMouseEnter={e => { e.target.style.transform = "translateY(-2px)"; e.target.style.boxShadow = "0 6px 18px rgba(200,150,42,.45)"; }}
          onMouseLeave={e => { e.target.style.transform = ""; e.target.style.boxShadow = "0 4px 12px rgba(200,150,42,.35)"; }}
        >
          Portal Login
        </Link>
      </div>

      {/* Mobile hamburger */}
      <button onClick={() => setMenuOpen(v => !v)} style={{
        background: "none", border: "none", cursor: "pointer", padding: "8px",
        display: "none",
      }} className="mobile-menu-btn" aria-label="Menu">
        <div style={{ width: 22, height: 2, background: scrolled ? "#0a1f44" : "#fff", marginBottom: 5, transition: "all .2s", transform: menuOpen ? "rotate(45deg) translate(5px,5px)" : "" }} />
        <div style={{ width: 22, height: 2, background: scrolled ? "#0a1f44" : "#fff", marginBottom: 5, opacity: menuOpen ? 0 : 1 }} />
        <div style={{ width: 22, height: 2, background: scrolled ? "#0a1f44" : "#fff", transform: menuOpen ? "rotate(-45deg) translate(5px,-5px)" : "" }} />
      </button>

      <style>{`
        @media(max-width:768px){
          .hidden-mobile { display:none !important; }
          .mobile-menu-btn { display:block !important; }
        }
      `}</style>

      {/* Mobile menu */}
      {menuOpen && (
        <div style={{
          position: "fixed", top: 68, left: 0, right: 0, background: "#fff",
          padding: "16px 5vw 24px", boxShadow: "0 8px 24px rgba(0,0,0,.12)",
          display: "flex", flexDirection: "column", gap: "16px",
        }}>
          {NAV_LINKS.map((l) => (
            <a key={l.href} href={l.href} onClick={() => setMenuOpen(false)}
              style={{ color: "#0a1f44", fontWeight: 500, textDecoration: "none", fontSize: "15px" }}>
              {l.label}
            </a>
          ))}
          <Link to="/login" onClick={() => setMenuOpen(false)}
            style={{ background: "#c8962a", color: "#fff", fontWeight: 700, padding: "10px 20px", borderRadius: "50px", textDecoration: "none", textAlign: "center" }}>
            Portal Login
          </Link>
        </div>
      )}
    </nav>
  );
};

// ─────────────────────────────────────────────
// Hero
// ─────────────────────────────────────────────
const Hero = () => {
  const [slide, setSlide] = useState(0);
  const SLIDES = [
    { img: "/assets/hero.JPG",   tag: "Excellence in Education" },
    { img: "/assets/slide1.JPG", tag: "Nurturing Future Leaders" },
    { img: "/assets/slide2.JPG", tag: "Where Leaders Are Born"   },
  ];

  useEffect(() => {
    const t = setInterval(() => setSlide(v => (v + 1) % SLIDES.length), 5000);
    return () => clearInterval(t);
  }, []);

  return (
    <section id="home" style={{
      minHeight: "100vh", position: "relative", overflow: "hidden",
      display: "flex", alignItems: "center",
    }}>
      {/* Background image — crossfades between slides */}
      {SLIDES.map((s, i) => (
        <div key={i} style={{
          position: "absolute", inset: 0, zIndex: 0,
          backgroundImage: `url(${s.img})`,
          backgroundSize: "cover", backgroundPosition: "center",
          opacity: i === slide ? 1 : 0,
          transition: "opacity 1.2s ease",
        }} />
      ))}
      {/* Dark overlay so text stays readable */}
      <div style={{ position: "absolute", inset: 0, zIndex: 1, background: "linear-gradient(to right, rgba(5,15,35,.82) 0%, rgba(5,15,35,.55) 60%, rgba(5,15,35,.3) 100%)" }} />
      {/* Decorative shapes */}
      <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none", zIndex: 2 }}>
        <div style={{ position: "absolute", top: "-10%", right: "-5%", width: "50vw", height: "50vw", borderRadius: "50%", background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.08)" }} />
        <div style={{ position: "absolute", bottom: "-15%", left: "-8%", width: "40vw", height: "40vw", borderRadius: "50%", background: "rgba(200,150,42,.06)", border: "1px solid rgba(200,150,42,.12)" }} />

        {/* Gold accent bar */}
        <div style={{ position: "absolute", left: 0, top: "68px", bottom: 0, width: "4px", background: "linear-gradient(to bottom,transparent,#c8962a,transparent)" }} />
      </div>

      <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "120px 5vw 80px", width: "100%", position: "relative", zIndex: 3 }}>

        {/* Tag */}
        <div className="anim-fade-up" style={{
          display: "inline-flex", alignItems: "center", gap: "8px",
          background: "rgba(200,150,42,.15)", border: "1px solid rgba(200,150,42,.35)",
          padding: "6px 16px", borderRadius: "50px", marginBottom: "28px",
        }}>
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#c8962a" }} />
          <span style={{ color: "#e8b84b", fontSize: ".8rem", fontWeight: 600, letterSpacing: "1.5px", textTransform: "uppercase" }}>
            {SLIDES[slide].tag}
          </span>
        </div>

        {/* Headline */}
        <h1 className="anim-fade-up delay-1 font-display" style={{
          fontSize: "clamp(2.4rem,6vw,5rem)", fontWeight: 900, color: "#fff",
          lineHeight: 1.08, marginBottom: "24px", maxWidth: "720px",
        }}>
          Leading Stars<br />
          <span style={{ color: "#c8962a" }}>Academy</span>
        </h1>

        <p className="anim-fade-up delay-2" style={{
          fontSize: "clamp(1rem,2vw,1.15rem)", color: "rgba(255,255,255,.75)",
          maxWidth: "520px", lineHeight: 1.7, marginBottom: "44px",
        }}>
          Providing world-class education that nurtures academic excellence, character, and leadership in every student.
        </p>

        {/* CTAs */}
        <div className="anim-fade-up delay-3" style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
          <a href="#admissions" style={{
            background: "linear-gradient(135deg,#c8962a,#e8b84b)",
            color: "#0a1f44", fontWeight: 700, padding: "14px 32px",
            borderRadius: "50px", textDecoration: "none", fontSize: ".95rem",
            boxShadow: "0 6px 24px rgba(200,150,42,.4)", transition: "transform .2s",
          }}
            onMouseEnter={e => e.target.style.transform = "translateY(-3px)"}
            onMouseLeave={e => e.target.style.transform = ""}
          >Apply for Admission</a>
          <a href="#about" style={{
            color: "#fff", fontWeight: 600, padding: "14px 32px",
            borderRadius: "50px", textDecoration: "none", fontSize: ".95rem",
            border: "1.5px solid rgba(255,255,255,.35)", transition: "all .2s",
          }}
            onMouseEnter={e => { e.target.style.background = "rgba(255,255,255,.1)"; e.target.style.borderColor = "rgba(255,255,255,.6)"; }}
            onMouseLeave={e => { e.target.style.background = ""; e.target.style.borderColor = "rgba(255,255,255,.35)"; }}
          >Learn More</a>
        </div>

        {/* Slide dots */}
        <div style={{ display: "flex", gap: "8px", marginTop: "56px" }}>
          {SLIDES.map((_, i) => (
            <button key={i} onClick={() => setSlide(i)} style={{
              width: i === slide ? "28px" : "8px", height: "8px",
              borderRadius: "4px", border: "none", cursor: "pointer",
              background: i === slide ? "#c8962a" : "rgba(255,255,255,.3)",
              transition: "all .3s",
            }} />
          ))}
        </div>
      </div>

      {/* Scroll indicator */}
      <div style={{ position: "absolute", bottom: "32px", left: "50%", transform: "translateX(-50%)", display: "flex", flexDirection: "column", alignItems: "center", gap: "6px", zIndex: 3 }}>
        <span style={{ color: "rgba(255,255,255,.4)", fontSize: ".7rem", letterSpacing: "2px", textTransform: "uppercase" }}>Scroll</span>
        <div style={{ width: "1.5px", height: "40px", background: "linear-gradient(to bottom,rgba(255,255,255,.3),transparent)" }} />
      </div>
    </section>
  );
};

// ─────────────────────────────────────────────
// Stats bar
// ─────────────────────────────────────────────
const StatsBar = () => (
  <section style={{ background: "var(--navy)", padding: "52px 5vw" }}>
    <div style={{ maxWidth: "1200px", margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: "40px", textAlign: "center" }}>
      {[
        { n: 2013, label: "Year Established",        suffix: ""   },
        { n: 500,  label: "Students Enrolled",        suffix: "+"  },
        { n: 15,   label: "Qualified Teachers",       suffix: "+"  },
        { n: 4,    label: "Academic Programmes",      suffix: ""   },
        { n: 98,   label: "Pass Rate",                suffix: "%"  },
      ].map(({ n, label, suffix }) => (
        <div key={label}>
          <div className="stat-number"><Counter end={n} suffix={suffix} /></div>
          <p style={{ color: "rgba(255,255,255,.55)", fontSize: ".78rem", fontWeight: 500, marginTop: "8px", letterSpacing: ".5px" }}>{label}</p>
          <div style={{ width: "24px", height: "2px", background: "#c8962a", margin: "10px auto 0", borderRadius: "1px" }} />
        </div>
      ))}
    </div>
  </section>
);

// ─────────────────────────────────────────────
// About
// ─────────────────────────────────────────────
const About = () => {
  useReveal();
  return (
    <section id="about" style={{ padding: "100px 5vw", background: "var(--cream)" }}>
      <div style={{ maxWidth: "1200px", margin: "0 auto", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "72px", alignItems: "center" }}>

        {/* Visual side */}
        <div className="reveal" style={{ position: "relative" }}>
          {/* Main image placeholder — rich layered composition */}
          <div style={{
            width: "100%", paddingBottom: "115%", position: "relative", borderRadius: "16px",
            overflow: "hidden", boxShadow: "0 24px 64px rgba(0,0,0,.18)",
          }}>
            <img
              src="/assets/hero.JPG"
              alt="Leading Stars Academy campus"
              style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
            />
            {/* Subtle gradient overlay at bottom for the floating card */}
            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,0,0,.35) 0%, transparent 50%)" }} />
            {/* Floating card */}
            <div style={{
              position: "absolute", bottom: "28px", right: "-28px",
              background: "#fff", borderRadius: "16px", padding: "20px 24px",
              boxShadow: "0 20px 60px rgba(0,0,0,.15)", width: "180px",
            }}>
              <p style={{ fontFamily: "'Playfair Display',serif", fontSize: "2rem", fontWeight: 900, color: "#c8962a", lineHeight: 1 }}>10+</p>
              <p style={{ fontSize: ".78rem", color: "#666", marginTop: "6px", lineHeight: 1.4 }}>Years of academic excellence</p>
            </div>
          </div>

          {/* Gold accent block */}
          <div style={{
            position: "absolute", top: "-20px", left: "-20px",
            width: "120px", height: "120px", borderRadius: "4px",
            background: "linear-gradient(135deg,#c8962a,#e8b84b)", opacity: .15,
            zIndex: -1,
          }} />
        </div>

        {/* Text side */}
        <div className="reveal" style={{ opacity: 0, transform: "translateY(24px)", transition: "all .7s .2s" }}>
          <div className="gold-line" style={{ marginBottom: "16px" }} />
          <p style={{ color: "#c8962a", fontWeight: 600, fontSize: ".82rem", letterSpacing: "2px", textTransform: "uppercase", marginBottom: "12px" }}>About Our School</p>
          <h2 className="font-display" style={{ fontSize: "clamp(1.8rem,3.5vw,2.8rem)", fontWeight: 900, color: "var(--navy)", lineHeight: 1.15, marginBottom: "24px" }}>
            Shaping Tomorrow's Leaders Today
          </h2>
          <p style={{ color: "#555", lineHeight: 1.85, marginBottom: "20px", fontSize: ".95rem" }}>
            Leading Stars Academy is a premier educational institution committed to delivering world-class education in a nurturing and stimulating environment. Since 2013, we have empowered thousands of students to achieve academic excellence and personal growth.
          </p>
          <p style={{ color: "#555", lineHeight: 1.85, marginBottom: "36px", fontSize: ".95rem" }}>
            Our holistic approach to education balances rigorous academics with arts, sports, and character development — ensuring every student leaves as a confident, capable, and compassionate individual ready for the global stage.
          </p>

          {/* Feature chips */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", marginBottom: "36px" }}>
            {["Cambridge Curriculum", "Qualified Teachers", "Modern Facilities", "Sports & Arts", "Holistic Development"].map((f) => (
              <span key={f} style={{
                background: "#fff", border: "1.5px solid #e0d8c8", color: "#0a1f44",
                padding: "6px 14px", borderRadius: "50px", fontSize: ".78rem", fontWeight: 600,
              }}>{f}</span>
            ))}
          </div>

          <a href="#admissions" style={{
            display: "inline-flex", alignItems: "center", gap: "8px",
            background: "var(--navy)", color: "#fff", fontWeight: 600,
            padding: "13px 28px", borderRadius: "50px", textDecoration: "none", fontSize: ".9rem",
            transition: "background .2s",
          }}
            onMouseEnter={e => e.target.style.background = "#1a3a6a"}
            onMouseLeave={e => e.target.style.background = "var(--navy)"}
          >
            Discover More <span style={{ fontSize: "1rem" }}>→</span>
          </a>
        </div>
      </div>
    </section>
  );
};

// ─────────────────────────────────────────────
// Academics
// ─────────────────────────────────────────────
const LEVELS = [
  { icon: "🌸", title: "Preschool",   age: "Ages 2–3",  desc: "A warm, play-based introduction to school life that nurtures curiosity, social skills, and early language development." },
  { icon: "🌱", title: "Nursery & KG", age: "Ages 3–6", desc: "Building a love of learning through creative play, foundational literacy, numeracy, and structured discovery."         },
  { icon: "📖", title: "Primary",      age: "Ages 6–11", desc: "Developing critical thinking, collaboration, and curiosity across core subjects in a structured, supportive setting."  },
  { icon: "🎓", title: "Junior High",  age: "Ages 12–14",desc: "Rigorous academic preparation focused on STEM, humanities, and building confident, independent learners."             },
];

const Academics = () => (
  <section id="academics" style={{ padding: "100px 5vw", background: "#fff" }}>
    <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
      <div style={{ textAlign: "center", marginBottom: "60px" }}>
        <div className="gold-line" style={{ margin: "0 auto 16px" }} />
        <p style={{ color: "#c8962a", fontWeight: 600, fontSize: ".82rem", letterSpacing: "2px", textTransform: "uppercase", marginBottom: "12px" }}>Academic Programmes</p>
        <h2 className="font-display" style={{ fontSize: "clamp(1.8rem,3.5vw,2.6rem)", fontWeight: 900, color: "var(--navy)" }}>
          Education for Every Stage
        </h2>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: "28px" }}>
        {LEVELS.map((l, i) => (
          <div key={l.title} style={{
            border: "1.5px solid #eee", borderRadius: "20px", padding: "36px 28px",
            transition: "all .3s", cursor: "default",
            animationDelay: `${i * .12}s`,
          }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = "#c8962a"; e.currentTarget.style.boxShadow = "0 12px 40px rgba(200,150,42,.12)"; e.currentTarget.style.transform = "translateY(-6px)"; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = "#eee"; e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.transform = ""; }}
          >
            <div style={{ fontSize: "2.4rem", marginBottom: "16px" }}>{l.icon}</div>
            <p style={{ background: "rgba(200,150,42,.1)", color: "#c8962a", fontSize: ".72rem", fontWeight: 700, padding: "4px 12px", borderRadius: "50px", display: "inline-block", marginBottom: "12px", letterSpacing: ".5px" }}>{l.age}</p>
            <h3 className="font-display" style={{ fontSize: "1.2rem", fontWeight: 700, color: "var(--navy)", marginBottom: "12px" }}>{l.title}</h3>
            <p style={{ color: "#666", lineHeight: 1.7, fontSize: ".88rem" }}>{l.desc}</p>
          </div>
        ))}
      </div>
    </div>
  </section>
);

// ─────────────────────────────────────────────
// Why Choose Us
// ─────────────────────────────────────────────
const WHY = [
  { icon: "🏅", title: "Academic Excellence",    desc: "Consistently high pass rates with graduates admitted to top universities locally and abroad."       },
  { icon: "🌍", title: "Diverse Community",       desc: "A multicultural environment that celebrates diversity and prepares students for a globalised world." },
  { icon: "⚽", title: "Sports & Co-Curriculars", desc: "Extensive programmes in sports, arts, music, and debate that develop the whole child."               },
  { icon: "🔬", title: "Modern Facilities",       desc: "State-of-the-art science labs, ICT suites, library, and sports facilities."                         },
  { icon: "💡", title: "Innovative Teaching",     desc: "Our teachers use modern, evidence-based pedagogy to make learning engaging and effective."            },
  { icon: "🤝", title: "Strong Community",        desc: "An active PTA and alumni network that creates lasting bonds between school, parents, and graduates."  },
];

const WhyUs = () => (
  <section style={{ padding: "100px 5vw", background: "var(--cream)" }}>
    <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
      <div style={{ textAlign: "center", marginBottom: "60px" }}>
        <div className="gold-line" style={{ margin: "0 auto 16px" }} />
        <p style={{ color: "#c8962a", fontWeight: 600, fontSize: ".82rem", letterSpacing: "2px", textTransform: "uppercase", marginBottom: "12px" }}>Why Choose Us</p>
        <h2 className="font-display" style={{ fontSize: "clamp(1.8rem,3.5vw,2.6rem)", fontWeight: 900, color: "var(--navy)" }}>The Leading Stars Difference</h2>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: "24px" }}>
        {WHY.map((w) => (
          <div key={w.title} style={{ display: "flex", gap: "18px", padding: "28px", background: "#fff", borderRadius: "16px", border: "1.5px solid #eee", transition: "all .3s" }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = "#c8962a30"; e.currentTarget.style.boxShadow = "0 8px 32px rgba(200,150,42,.10)"; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = "#eee"; e.currentTarget.style.boxShadow = "none"; }}
          >
            <div style={{ fontSize: "1.8rem", flexShrink: 0 }}>{w.icon}</div>
            <div>
              <h3 style={{ fontWeight: 700, color: "var(--navy)", marginBottom: "8px", fontSize: ".95rem" }}>{w.title}</h3>
              <p style={{ color: "#666", lineHeight: 1.7, fontSize: ".85rem" }}>{w.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  </section>
);

// ─────────────────────────────────────────────
// Admissions CTA
// ─────────────────────────────────────────────
const AdmissionsCTA = () => (
  <section id="admissions" style={{
    padding: "100px 5vw", position: "relative", overflow: "hidden",
    background: "linear-gradient(135deg,#0a1f44 0%,#1a4080 60%,#0d3060 100%)",
  }}>
    {/* Decorative circles */}
    <div style={{ position: "absolute", top: "-60px", right: "-60px", width: "320px", height: "320px", borderRadius: "50%", background: "rgba(200,150,42,.08)", border: "1px solid rgba(200,150,42,.15)", pointerEvents: "none" }} />
    <div style={{ position: "absolute", bottom: "-80px", left: "-80px", width: "400px", height: "400px", borderRadius: "50%", background: "rgba(255,255,255,.03)", pointerEvents: "none" }} />

    <div style={{ maxWidth: "800px", margin: "0 auto", textAlign: "center", position: "relative", zIndex: 1 }}>
      <div className="gold-line" style={{ margin: "0 auto 20px" }} />
      <p style={{ color: "#e8b84b", fontWeight: 600, fontSize: ".82rem", letterSpacing: "2px", textTransform: "uppercase", marginBottom: "16px" }}>Enrolment Open</p>
      <h2 className="font-display" style={{ fontSize: "clamp(2rem,4vw,3.2rem)", fontWeight: 900, color: "#fff", lineHeight: 1.15, marginBottom: "20px" }}>
        Begin Your Journey<br />With Leading Stars
      </h2>
      <p style={{ color: "rgba(255,255,255,.7)", lineHeight: 1.8, marginBottom: "44px", fontSize: "1rem", maxWidth: "560px", margin: "0 auto 44px" }}>
        Applications are open for the upcoming academic year. Join our community of learners and take the first step toward a world-class education.
      </p>

      <div style={{ display: "flex", gap: "16px", justifyContent: "center", flexWrap: "wrap" }}>
        <Link to="/register" style={{
          background: "linear-gradient(135deg,#c8962a,#e8b84b)", color: "#0a1f44",
          fontWeight: 700, padding: "15px 36px", borderRadius: "50px", textDecoration: "none",
          fontSize: ".95rem", boxShadow: "0 8px 28px rgba(200,150,42,.35)", transition: "transform .2s",
        }}
          onMouseEnter={e => e.target.style.transform = "translateY(-3px)"}
          onMouseLeave={e => e.target.style.transform = ""}
        >Apply Now</Link>
        <a href="#contact" style={{
          color: "#fff", fontWeight: 600, padding: "15px 36px", borderRadius: "50px",
          textDecoration: "none", fontSize: ".95rem",
          border: "1.5px solid rgba(255,255,255,.35)", transition: "all .2s",
        }}
          onMouseEnter={e => { e.target.style.background = "rgba(255,255,255,.1)"; }}
          onMouseLeave={e => { e.target.style.background = ""; }}
        >Contact Admissions</a>
      </div>

      {/* Info chips */}
      <div style={{ display: "flex", gap: "24px", justifyContent: "center", flexWrap: "wrap", marginTop: "48px" }}>
        {["No Registration Fee", "Scholarship Available", "Flexible Payment Plans"].map((t) => (
          <div key={t} style={{ display: "flex", alignItems: "center", gap: "6px", color: "rgba(255,255,255,.65)", fontSize: ".82rem" }}>
            <span style={{ color: "#c8962a" }}>✓</span> {t}
          </div>
        ))}
      </div>
    </div>
  </section>
);

// ─────────────────────────────────────────────
// News
// ─────────────────────────────────────────────
const NEWS = [
  { tag: "Achievement", date: "December 2025",  title: "Students Place Top 5 in National Hour of Code Competition", excerpt: "A team of five students from Leading Stars Academy placed in the top 5 of the National Hour of Code Competition 2025, showcasing exceptional problem-solving skills." },
  { tag: "Event",       date: "Feb 28, 2026",   title: "Annual Cultural Day Celebrates Diversity",        excerpt: "Students, teachers and parents came together in a vibrant celebration of our diverse cultures through food, dance, music, and traditional dress." },
  { tag: "Academics",   date: "Feb 14, 2026",   title: "New STEM Laboratory Officially Opens",            excerpt: "Our brand-new, fully-equipped STEM laboratory was inaugurated, giving students cutting-edge facilities for science and technology exploration." },
];

const NewsSection = () => (
  <section id="news" style={{ padding: "100px 5vw", background: "#fff" }}>
    <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "52px", flexWrap: "wrap", gap: "16px" }}>
        <div>
          <div className="gold-line" style={{ marginBottom: "16px" }} />
          <p style={{ color: "#c8962a", fontWeight: 600, fontSize: ".82rem", letterSpacing: "2px", textTransform: "uppercase", marginBottom: "12px" }}>Latest News</p>
          <h2 className="font-display" style={{ fontSize: "clamp(1.8rem,3.5vw,2.6rem)", fontWeight: 900, color: "var(--navy)" }}>News & Updates</h2>
        </div>
        <a href="#" style={{ color: "var(--navy)", fontWeight: 600, textDecoration: "none", fontSize: ".88rem", borderBottom: "2px solid #c8962a", paddingBottom: "2px" }}>View All →</a>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: "28px" }}>
        {NEWS.map((n, i) => (
          <div key={i} className="news-card" style={{ borderRadius: "20px", overflow: "hidden", border: "1.5px solid #eee", transition: "all .3s", cursor: "pointer" }}
            onMouseEnter={e => { e.currentTarget.style.boxShadow = "0 16px 48px rgba(0,0,0,.10)"; e.currentTarget.style.transform = "translateY(-6px)"; }}
            onMouseLeave={e => { e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.transform = ""; }}
          >
            {/* Image */}
            <div style={{ height: "200px", overflow: "hidden", background: `hsl(${i * 60 + 200},40%,${20 + i * 8}%)`, position: "relative" }}>
              <div className="news-img" style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span style={{ fontSize: "3.5rem", opacity: .4 }}>{["🔬","🎉","🏗️"][i]}</span>
              </div>
              <span style={{ position: "absolute", top: "14px", left: "14px", background: "#c8962a", color: "#fff", fontSize: ".72rem", fontWeight: 700, padding: "4px 12px", borderRadius: "50px", letterSpacing: ".5px" }}>{n.tag}</span>
            </div>
            {/* Body */}
            <div style={{ padding: "24px" }}>
              <p style={{ color: "#999", fontSize: ".78rem", marginBottom: "10px" }}>{n.date}</p>
              <h3 style={{ fontFamily: "'Playfair Display',serif", fontWeight: 700, color: "var(--navy)", fontSize: "1.05rem", lineHeight: 1.35, marginBottom: "12px" }}>{n.title}</h3>
              <p style={{ color: "#666", fontSize: ".85rem", lineHeight: 1.7, marginBottom: "18px" }}>{n.excerpt}</p>
              <span style={{ color: "#c8962a", fontWeight: 700, fontSize: ".82rem" }}>Read More →</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  </section>
);

// ─────────────────────────────────────────────
// Contact
// ─────────────────────────────────────────────
const Contact = () => {
  const [form, setForm]       = useState({ name: "", email: "", message: "" });
  const [sent, setSent]       = useState(false);
  const handleChange = (e)    => setForm(p => ({ ...p, [e.target.name]: e.target.value }));
  const handleSubmit = (e)    => { e.preventDefault(); setSent(true); };

  return (
    <section id="contact" style={{ padding: "100px 5vw", background: "var(--cream)" }}>
      <div style={{ maxWidth: "1200px", margin: "0 auto", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "72px", alignItems: "start" }}>

        {/* Info */}
        <div>
          <div className="gold-line" style={{ marginBottom: "16px" }} />
          <p style={{ color: "#c8962a", fontWeight: 600, fontSize: ".82rem", letterSpacing: "2px", textTransform: "uppercase", marginBottom: "12px" }}>Get In Touch</p>
          <h2 className="font-display" style={{ fontSize: "clamp(1.8rem,3.5vw,2.6rem)", fontWeight: 900, color: "var(--navy)", marginBottom: "20px" }}>Contact Us</h2>
          <p style={{ color: "#555", lineHeight: 1.8, marginBottom: "40px", fontSize: ".95rem" }}>
            We'd love to hear from you. Whether you have questions about admissions, programmes, or anything else — our team is here to help.
          </p>

          {[
            { icon: "📍", label: "Address",  value: "Tettegu Junction, Behind Frimps Fueling Station, Accra" },
            { icon: "📞", label: "Phone",    value: "0249 878 954 / 0547 014 953"               },
            { icon: "✉️", label: "Email",    value: "info@leadingstarsacademy.edu.gh"           },
            { icon: "🕒", label: "Hours",    value: "Mon – Fri: 7:30 AM – 4:30 PM"             },
          ].map((c) => (
            <div key={c.label} style={{ display: "flex", gap: "16px", marginBottom: "20px", alignItems: "flex-start" }}>
              <div style={{ width: "40px", height: "40px", borderRadius: "10px", background: "rgba(200,150,42,.1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.1rem", flexShrink: 0 }}>{c.icon}</div>
              <div>
                <p style={{ fontWeight: 700, color: "var(--navy)", fontSize: ".82rem", textTransform: "uppercase", letterSpacing: ".5px", marginBottom: "3px" }}>{c.label}</p>
                <p style={{ color: "#555", fontSize: ".9rem" }}>{c.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Form */}
        <div style={{ background: "#fff", borderRadius: "24px", padding: "44px", boxShadow: "0 20px 60px rgba(0,0,0,.07)", border: "1.5px solid #eee" }}>
          {sent ? (
            <div style={{ textAlign: "center", padding: "40px 0" }}>
              <div style={{ fontSize: "3rem", marginBottom: "16px" }}>✅</div>
              <h3 className="font-display" style={{ fontSize: "1.5rem", color: "var(--navy)", marginBottom: "12px" }}>Message Sent!</h3>
              <p style={{ color: "#666", lineHeight: 1.7 }}>Thank you for reaching out. We'll get back to you within one business day.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
              <h3 className="font-display" style={{ fontSize: "1.4rem", color: "var(--navy)", marginBottom: "8px" }}>Send a Message</h3>
              {[
                { name: "name",    placeholder: "Your Full Name",     type: "text"  },
                { name: "email",   placeholder: "Your Email Address", type: "email" },
              ].map((f) => (
                <input key={f.name} name={f.name} type={f.type} placeholder={f.placeholder} required
                  value={form[f.name]} onChange={handleChange}
                  style={{ border: "1.5px solid #e0e0e0", borderRadius: "12px", padding: "13px 16px", fontSize: ".9rem", outline: "none", transition: "border-color .2s", fontFamily: "'DM Sans',sans-serif" }}
                  onFocus={e => e.target.style.borderColor = "#c8962a"}
                  onBlur={e => e.target.style.borderColor = "#e0e0e0"}
                />
              ))}
              <textarea name="message" placeholder="Your Message" required rows={5}
                value={form.message} onChange={handleChange}
                style={{ border: "1.5px solid #e0e0e0", borderRadius: "12px", padding: "13px 16px", fontSize: ".9rem", outline: "none", resize: "none", fontFamily: "'DM Sans',sans-serif", transition: "border-color .2s" }}
                onFocus={e => e.target.style.borderColor = "#c8962a"}
                onBlur={e => e.target.style.borderColor = "#e0e0e0"}
              />
              <button type="submit" style={{
                background: "linear-gradient(135deg,var(--navy),#1a4080)", color: "#fff",
                fontWeight: 700, padding: "14px", borderRadius: "12px",
                border: "none", cursor: "pointer", fontSize: ".95rem",
                fontFamily: "'DM Sans',sans-serif", transition: "opacity .2s",
              }}
                onMouseEnter={e => e.target.style.opacity = ".85"}
                onMouseLeave={e => e.target.style.opacity = "1"}
              >Send Message</button>
            </form>
          )}
        </div>
      </div>
    </section>
  );
};

// ─────────────────────────────────────────────
// Footer
// ─────────────────────────────────────────────
const Footer = () => (
  <footer style={{ background: "#060f1e", color: "rgba(255,255,255,.65)", padding: "72px 5vw 32px" }}>
    <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: "48px", marginBottom: "52px" }}>

        {/* Brand */}
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
            <img
              src="/assets/logo.jpeg"
              alt="Leading Stars Academy"
              style={{ width: "36px", height: "36px", borderRadius: "8px", objectFit: "cover" }}
            />
            <div>
              <p style={{ fontFamily: "'Playfair Display',serif", fontWeight: 700, color: "#fff", fontSize: "13px" }}>Leading Stars Academy</p>
            </div>
          </div>
          <p style={{ lineHeight: 1.8, fontSize: ".85rem", maxWidth: "280px", marginBottom: "24px" }}>
            Providing world-class education that nurtures academic excellence, character, and leadership since 1965.
          </p>
          <div style={{ display: "flex", gap: "10px" }}>
            {["f", "t", "in", "yt"].map((s) => (
              <a key={s} href="#" style={{
                width: "34px", height: "34px", borderRadius: "50%",
                border: "1px solid rgba(255,255,255,.15)",
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "rgba(255,255,255,.55)", fontSize: ".75rem", fontWeight: 700,
                textDecoration: "none", transition: "all .2s",
              }}
                onMouseEnter={e => { e.target.style.borderColor = "#c8962a"; e.target.style.color = "#c8962a"; }}
                onMouseLeave={e => { e.target.style.borderColor = "rgba(255,255,255,.15)"; e.target.style.color = "rgba(255,255,255,.55)"; }}
              >{s}</a>
            ))}
          </div>
        </div>

        {/* Quick links */}
        {[
          { title: "Quick Links",  links: ["Home","About","Academics","Admissions","News","Contact"] },
          { title: "Programmes",   links: ["Preschool","Nursery & KG","Primary","Junior High","Extra-Curricular"] },
          { title: "Information",  links: ["Fees & Bursaries","School Calendar","Parent Portal","Staff Portal","Student Portal"] },
        ].map((col) => (
          <div key={col.title}>
            <p style={{ color: "#fff", fontWeight: 700, fontSize: ".88rem", marginBottom: "20px", letterSpacing: ".5px" }}>{col.title}</p>
            <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "10px" }}>
              {col.links.map((l) => (
                <li key={l}>
                  <a href="#" style={{ color: "rgba(255,255,255,.55)", textDecoration: "none", fontSize: ".83rem", transition: "color .2s" }}
                    onMouseEnter={e => e.target.style.color = "#c8962a"}
                    onMouseLeave={e => e.target.style.color = "rgba(255,255,255,.55)"}
                  >{l}</a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* Bottom bar */}
      <div style={{ borderTop: "1px solid rgba(255,255,255,.08)", paddingTop: "28px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
        <p style={{ fontSize: ".78rem" }}>© {new Date().getFullYear()} Leading Stars Academy. All rights reserved.</p>
        <div style={{ display: "flex", gap: "20px" }}>
          {["Privacy Policy","Terms of Use","Accessibility"].map((l) => (
            <a key={l} href="#" style={{ color: "rgba(255,255,255,.4)", fontSize: ".78rem", textDecoration: "none", transition: "color .2s" }}
              onMouseEnter={e => e.target.style.color = "#c8962a"}
              onMouseLeave={e => e.target.style.color = "rgba(255,255,255,.4)"}
            >{l}</a>
          ))}
        </div>
      </div>
    </div>
  </footer>
);

// ─────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────
const LandingPage = () => {
  useReveal();
  return (
    <>
      <FontLoader />
      <Navbar />
      <Hero />
      <StatsBar />
      <About />
      <Academics />
      <WhyUs />
      <AdmissionsCTA />
      <NewsSection />
      <Contact />
      <Footer />
      <style>{`
        .reveal { opacity:0; transform:translateY(24px); transition:opacity .7s ease, transform .7s ease; }
        .reveal.revealed { opacity:1 !important; transform:translateY(0) !important; }
        @media(max-width:768px){
          section > div[style*="grid-template-columns: 1fr 1fr"] { grid-template-columns:1fr !important; }
          footer > div > div[style*="grid-template-columns"] { grid-template-columns:1fr 1fr !important; }
        }
      `}</style>
    </>
  );
};

export default LandingPage;