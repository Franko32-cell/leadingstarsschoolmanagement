import { Link } from 'react-router-dom';

const ArticleCard = ({ post }) => (
  <article className='rounded-3xl bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg'>
    <h3 className='font-display text-2xl font-bold text-navy'>
      <Link to={`/blog/${post.slug}`}>{post.title}</Link>
    </h3>
    <p className='mt-4 text-sm leading-7 text-slate-600'>{post.excerpt}</p>
    <Link to={`/blog/${post.slug}`} className='mt-5 inline-block font-semibold text-gold'>
      Read article →
    </Link>
  </article>
);

export default ArticleCard;
