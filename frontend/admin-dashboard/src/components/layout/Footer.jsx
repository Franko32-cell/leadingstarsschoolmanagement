import { Link } from 'react-router-dom';
import { Mail, Phone, MapPin, Clock } from 'lucide-react';

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="bg-slate-900 text-slate-300" role="contentinfo">
      <div className="max-w-7xl mx-auto px-6 py-16 grid md:grid-cols-2 lg:grid-cols-4 gap-10">
        <div>
          <h2 className="text-white font-serif text-xl font-bold mb-4">
            Leading Stars Academy
          </h2>
          <p className="text-sm leading-relaxed text-slate-400">
            A premier educational institution in Accra, Ghana, committed to
            academic excellence and the development of character from preschool
            through Junior High.
          </p>
        </div>

        <nav aria-label="Academic programmes">
          <h3 className="text-white font-semibold mb-4">Academics</h3>
          <ul className="space-y-2 text-sm">
            <li><Link to="/academics/preschool" className="hover:text-amber-400">Preschool</Link></li>
            <li><Link to="/academics/nursery" className="hover:text-amber-400">Nursery</Link></li>
            <li><Link to="/academics/primary" className="hover:text-amber-400">Primary</Link></li>
            <li><Link to="/academics/junior-high" className="hover:text-amber-400">Junior High</Link></li>
            <li><Link to="/admissions" className="hover:text-amber-400">Admissions</Link></li>
          </ul>
        </nav>

        <nav aria-label="Explore">
          <h3 className="text-white font-semibold mb-4">Explore</h3>
          <ul className="space-y-2 text-sm">
            <li><Link to="/about" className="hover:text-amber-400">About Us</Link></li>
            <li><Link to="/blog" className="hover:text-amber-400">Blog</Link></li>
            <li><Link to="/news" className="hover:text-amber-400">News</Link></li>
            <li><Link to="/contact" className="hover:text-amber-400">Contact</Link></li>
            <li><Link to="/privacy-policy" className="hover:text-amber-400">Privacy Policy</Link></li>
            <li><Link to="/terms" className="hover:text-amber-400">Terms of Use</Link></li>
            <li><Link to="/cookie-policy" className="hover:text-amber-400">Cookie Policy</Link></li>
          </ul>
        </nav>

        <div>
          <h3 className="text-white font-semibold mb-4">Visit & Contact</h3>
          <address className="not-italic space-y-3 text-sm">
            <div className="flex gap-3">
              <MapPin size={16} className="flex-shrink-0 mt-1 text-amber-400" aria-hidden="true" />
              <span>12 Independence Avenue<br />Accra, Greater Accra<br />Ghana</span>
            </div>
            <div className="flex gap-3">
              <Phone size={16} className="flex-shrink-0 mt-1 text-amber-400" aria-hidden="true" />
              <a href="tel:+233301234567" className="hover:text-amber-400">+233 30 123 4567</a>
            </div>
            <div className="flex gap-3">
              <Mail size={16} className="flex-shrink-0 mt-1 text-amber-400" aria-hidden="true" />
              <a href="mailto:info@leadingstarsacademy.edu.gh" className="hover:text-amber-400">
                info@leadingstarsacademy.edu.gh
              </a>
            </div>
            <div className="flex gap-3">
              <Clock size={16} className="flex-shrink-0 mt-1 text-amber-400" aria-hidden="true" />
              <span>Mon–Fri: 7:30 AM – 4:30 PM<br />Sat: 9:00 AM – 1:00 PM</span>
            </div>
          </address>
        </div>
      </div>

      <div className="border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-6 py-6 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-slate-500">
          <p>© {year} Leading Stars Academy. All rights reserved.</p>
          <p>Registered with the Ghana Education Service.</p>
        </div>
      </div>
    </footer>
  );
}