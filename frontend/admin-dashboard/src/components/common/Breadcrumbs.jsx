import { Link } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';

export default function Breadcrumbs({ items }) {
  return (
    <nav
      aria-label="Breadcrumb"
      className="py-4 text-sm text-slate-600"
    >
      <ol className="flex flex-wrap items-center gap-1">
        <li>
          <Link
            to="/"
            className="flex items-center gap-1 hover:text-amber-700 transition"
          >
            <Home size={14} aria-hidden="true" />
            <span className="sr-only">Home</span>
          </Link>
        </li>
        {items.map((item, i) => (
          <li key={item.path} className="flex items-center gap-1">
            <ChevronRight size={14} className="text-slate-400" aria-hidden="true" />
            {i === items.length - 1 ? (
              <span aria-current="page" className="font-medium text-slate-900">
                {item.name}
              </span>
            ) : (
              <Link to={item.path} className="hover:text-amber-700 transition">
                {item.name}
              </Link>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}