import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

const slides = [
  { img: "/assets/hero.JPG", tag: "Excellence in Education" },
  { img: "/assets/slide1.JPG", tag: "Nurturing Future Leaders" },
  { img: "/assets/slide2.JPG", tag: "Where Leaders Are Born" },
];

const Hero = () => {
  const [slide, setSlide] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setSlide((v) => (v + 1) % slides.length), 5000);
    return () => clearInterval(timer);
  }, []);

  return (
    <section className="relative flex min-h-[100vh] items-center overflow-hidden">
      {slides.map((s, i) => (
        <div
          key={s.img}
          className="absolute inset-0 transition-opacity duration-1000"
          style={{
            backgroundImage: `url(${s.img})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            opacity: i === slide ? 1 : 0,
          }}
        />
      ))}

      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(5,15,35,.84),rgba(5,15,35,.5),rgba(5,15,35,.25))]" />

      <div className="relative z-10 mx-auto w-full max-w-7xl px-5 py-24 md:px-8 lg:px-10">
        <div className="max-w-3xl">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-gold/30 bg-gold/10 px-4 py-2">
            <span className="h-2 w-2 rounded-full bg-gold" />
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-yellow-300">
              {slides[slide].tag}
            </span>
          </div>

          <h1 className="font-display text-5xl font-black leading-tight text-white md:text-7xl">
            Leading Stars <span className="text-gold">Academy</span>
          </h1>

          <p className="mt-6 max-w-2xl text-base leading-8 text-white/80 md:text-lg">
            A premium private school in Accra providing preschool, nursery, primary, and junior high education with a strong emphasis on academic excellence, leadership, discipline, and holistic development.
          </p>

          <div className="mt-10 flex flex-wrap gap-4">
            <Link
              to="/admissions"
              className="rounded-full bg-gradient-to-r from-gold to-yellow-400 px-7 py-3 font-bold text-navy shadow-lg"
            >
              Apply for Admission
            </Link>
            <Link
              to="/about"
              className="rounded-full border border-white/30 px-7 py-3 font-semibold text-white"
            >
              Learn More
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;