import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Clock, Search } from 'lucide-react';
import SEO from '../../seo/SEO';
import Breadcrumbs from '../../components/common/Breadcrumbs';
import { blogPosts } from '../../data/blogPosts';
import { authors } from '../../data/authors';

const defaultAuthor = {
  name: 'Leading Stars Academy',
  role: 'Editorial',
  avatar: '/assets/logo.jpeg',
  bio: '',
};

export default function BlogIndexPage() {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All');

  const categories = ['All', ...new Set(blogPosts.map((p) => p.category))];

  const filtered = useMemo(() => {
    return blogPosts
      .filter((p) => category === 'All' || p.category === category)
      .filter(
        (p) =>
          p.title.toLowerCase().includes(query.toLowerCase()) ||
          p.excerpt.toLowerCase().includes(query.toLowerCase())
      )
      .sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
  }, [query, category]);

  return (
    <>
      <SEO
        title="Education Blog — Insights for Parents and Educators"
        description="Practical, thoughtful articles on parenting, literacy, STEM, study habits, and education in Ghana — written by the educators of Leading Stars Academy."
        keywords={['education blog', 'parenting Ghana', 'literacy', 'STEM education', 'study habits']}
      />

      <div className="max-w-7xl mx-auto px-6">
        <Breadcrumbs items={[{ name: 'Blog', path: '/blog' }]} />

        <header className="py-12 text-center max-w-3xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-serif font-bold text-slate-900 mb-4">
            The Leading Stars Journal
          </h1>
          <p className="text-lg text-slate-600 leading-relaxed">
            Thoughtful writing on parenting, learning, and raising children well —
            drawn from the daily work of our classrooms and the experience of our educators.
          </p>
        </header>

        <div className="flex flex-col md:flex-row gap-4 mb-10">
          <div className="relative flex-1">
            <Search
              size={18}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
              aria-hidden="true"
            />
            <input
              type="search"
              placeholder="Search articles..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Search articles"
              className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 focus:border-amber-500 focus:outline-none transition"
            />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {categories.map((c) => (
              <button
                key={c}
                onClick={() => setCategory(c)}
                className={`px-4 py-2 rounded-full whitespace-nowrap text-sm font-medium transition ${
                  category === c
                    ? 'bg-slate-900 text-white'
                    : 'bg-white text-slate-700 border border-slate-200 hover:border-slate-400'
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 pb-20">
          {filtered.map((post) => {
            const author = authors[post.authorSlug] || defaultAuthor;
            return (
              <article
                key={post.slug}
                className="group bg-white rounded-2xl overflow-hidden border border-slate-200 hover:shadow-xl transition"
              >
                <Link to={`/blog/${post.slug}`} className="block">
                  <div className="aspect-[16/10] bg-slate-100 overflow-hidden">
                    <img
                      src={post.image}
                      alt={post.title}
                      loading="lazy"
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                    />
                  </div>
                </Link>
                <div className="p-6">
                  <div className="flex items-center gap-3 text-xs text-slate-500 mb-3">
                    <span className="px-2 py-1 rounded bg-amber-50 text-amber-800 font-medium">
                      {post.category}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock size={12} aria-hidden="true" />
                      {post.readingTime} min read
                    </span>
                  </div>
                  <h2 className="text-xl font-serif font-bold text-slate-900 mb-2 group-hover:text-amber-700 transition">
                    <Link to={`/blog/${post.slug}`}>{post.title}</Link>
                  </h2>
                  <p className="text-slate-600 text-sm leading-relaxed mb-4">
                    {post.excerpt}
                  </p>
                  <div className="flex items-center gap-3 pt-4 border-t border-slate-100">
                    <div className="w-9 h-9 rounded-full bg-slate-200 overflow-hidden">
                      <img
                        src={author.avatar}
                        alt=""
                        loading="lazy"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="text-xs">
                      <div className="font-medium text-slate-900">{author.name}</div>
                      <div className="text-slate-500">{author.role}</div>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </>
  );
}