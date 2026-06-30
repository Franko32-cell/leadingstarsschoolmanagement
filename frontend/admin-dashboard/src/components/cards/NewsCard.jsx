import { Link } from 'react-router-dom';

const NewsCard = ({ post }) => (
  <article className='rounded-3xl border border-slate-200 bg-white p-6 transition hover:-translate-y-1 hover:shadow-lg'>
    <p className='text-xs font-semibold uppercase tracking-[0.2em] text-gold'>{post.category}</p>
    <h3 className='mt-3 font-display text-2xl font-bold text-navy'>
      <Link to={`/news/${post.slug}`}>{post.title}</Link>
    </h3>
    <p className='mt-4 text-sm leading-7 text-slate-600'>{post.excerpt}</p>
    <Link to={`/news/${post.slug}`} className='mt-5 inline-block font-semibold text-gold'>
      Read update →
    </Link>
  </article>
);

export default NewsCard;
