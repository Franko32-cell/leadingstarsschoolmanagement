import { Link } from "react-router-dom";
import Container from "../common/Container";

const Footer = () => {
  return (
    <footer className="bg-[#060f1e] py-16 text-white/70">
      <Container>
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-4">
          <div>
            <div className="mb-4 flex items-center gap-3">
              <img
                src="/assets/logo.jpeg"
                alt="Leading Stars Academy"
                className="h-10 w-10 rounded-lg object-cover"
              />
              <p className="font-display text-lg font-bold text-white">
                Leading Stars Academy
              </p>
            </div>
            <p className="text-sm leading-7">
              Leading Stars Academy is a premium private school in Accra committed to academic excellence, leadership development, and whole-child education.
            </p>
            <div className="mt-4 space-y-2 text-sm">
              <p>Tettegu Junction, Behind Frimps Fueling Station, Accra</p>
              <p>0249 878 954 / 0547 014 953</p>
              <p>info@leadingstarsacademy.edu.gh</p>
            </div>
          </div>

          <div>
            <h3 className="mb-4 font-semibold text-white">School</h3>
            <div className="flex flex-col gap-2 text-sm">
              <Link to="/">Home</Link>
              <Link to="/about">About</Link>
              <Link to="/academics">Academics</Link>
              <Link to="/admissions">Admissions</Link>
              <Link to="/contact">Contact</Link>
            </div>
          </div>

          <div>
            <h3 className="mb-4 font-semibold text-white">Programmes</h3>
            <div className="flex flex-col gap-2 text-sm">
              <Link to="/academics/preschool">Preschool</Link>
              <Link to="/academics/nursery">Nursery</Link>
              <Link to="/academics/primary">Primary</Link>
              <Link to="/academics/junior-high">Junior High</Link>
            </div>
          </div>

          <div>
            <h3 className="mb-4 font-semibold text-white">Resources</h3>
            <div className="flex flex-col gap-2 text-sm">
              <Link to="/blog">Blog</Link>
              <Link to="/news">News</Link>
              <Link to="/privacy-policy">Privacy Policy</Link>
              <Link to="/terms">Terms of Use</Link>
              <Link to="/cookie-policy">Cookie Policy</Link>
            </div>
          </div>
        </div>

        <div className="mt-12 border-t border-white/10 pt-6 text-xs text-white/50">
          © {new Date().getFullYear()} Leading Stars Academy. All rights reserved.
        </div>
      </Container>
    </footer>
  );
};

export default Footer;