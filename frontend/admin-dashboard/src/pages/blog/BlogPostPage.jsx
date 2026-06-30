import { useParams, Link, Navigate } from 'react-router-dom';
import { Clock, Calendar, ArrowLeft } from 'lucide-react';
import SEO from '../../seo/SEO';
import Breadcrumbs from '../../components/common/Breadcrumbs';
import { getPostBySlug, getRelatedPosts } from '../../data/blogPosts';
import { authors } from '../../data/authors';
import {
  articleSchema,
  breadcrumbSchema,
} from '../../seo/schemas';

export default function BlogPostPage() {
  const { slug } = useParams();
  const post = getPostBySlug(slug);

  if (!post) return <Navigate to="/blog" replace />;

  const author = authors[post.authorSlug];
  const related = getRelatedPosts(slug);
  const fullPost = { ...post, author };

  const schema = [
    articleSchema(fullPost),
    breadcrumbSchema([
      { name: 'Blog', path: '/blog' },
      { name: post.title, path: `/blog/${post.slug}` },
    ]),
  ];

  return (
    <>
      <SEO
        title={post.title}
        description={post.excerpt}
        image={post.image}
        type="article"
        publishedTime={post.publishedAt}
        author={author.name}
        keywords={post.tags}
        schema={schema}
      />

      <article className="max-w-3xl mx-auto px-6">
        <Breadcrumbs
          items={[
            { name: 'Blog', path: '/blog' },
            { name: post.title, path: `/blog/${post.slug}` },
          ]}
        />

        <header className="py-8">
          <Link
            to="/blog"
            className="inline-flex items-center gap-2 text-sm text-amber-700 hover:text-amber-800 mb-6"
          >
            <ArrowLeft size={16} aria-hidden="true" /> Back to all articles
          </Link>

          <span className="inline-block px-3 py-1 rounded-full bg-amber-50 text-amber-800 text-xs font-medium mb-4">
            {post.category}
          </span>

          <h1 className="text-3xl md:text-5xl font-serif font-bold text-slate-900 leading-tight mb-6">
            {post.title}
          </h1>

          <div className="flex flex-wrap items-center gap-6 text-sm text-slate-600">
            <div className="flex items-center gap-3">
              <img
                src={author.avatar}
                alt=""
                loading="lazy"
                className="w-10 h-10 rounded-full object-cover bg-slate-200"
              />
              <div>
                <div className="font-medium text-slate-900">{author.name}</div>
                <div className="text-xs">{author.role}</div>
              </div>
            </div>
            <span className="flex items-center gap-1">
              <Calendar size={14} aria-hidden="true" />
              <time dateTime={post.publishedAt}>
                {new Date(post.publishedAt).toLocaleDateString('en-GB', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </time>
            </span>
            <span className="flex items-center gap-1">
              <Clock size={14} aria-hidden="true" />
              {post.readingTime} min read
            </span>
          </div>
        </header>

        <figure className="rounded-2xl overflow-hidden mb-10 bg-slate-100">
          <img
            src={post.image}
            alt={post.title}
            className="w-full h-auto"
          />
        </figure>

        <div
          className="prose prose-lg prose-slate max-w-none prose-headings:font-serif prose-headings:text-slate-900 prose-a:text-amber-700 prose-a:no-underline hover:prose-a:underline"
          dangerouslySetInnerHTML={{ __html: post.content }}
        />

        <section className="mt-16 p-8 rounded-2xl bg-slate-50 border border-slate-200">
          <div className="flex flex-col sm:flex-row gap-6 items-start">
            <img
              src={author.avatar}
              alt=""
              loading="lazy"
              className="w-20 h-20 rounded-full object-cover bg-slate-200 flex-shrink-0"
            />
            <div>
              <div className="text-sm text-slate-500 mb-1">Written by</div>
              <h2 className="text-xl font-serif font-bold text-slate-900 mb-1">
                {author.name}
              </h2>
              <div className="text-sm text-amber-700 mb-3">{author.role}</div>
              <p className="text-slate-700 leading-relaxed">{author.bio}</p>
            </div>
          </div>
        </section>

        {related.length > 0 && (
          <section className="mt-16 pb-20" aria-labelledby="related-heading">
            <h2
              id="related-heading"
              className="text-2xl font-serif font-bold text-slate-900 mb-8"
            >
              Related articles
            </h2>
            <div className="grid sm:grid-cols-3 gap-6">
              {related.map((p) => (
                <Link
                  key={p.slug}
                  to={`/blog/${p.slug}`}
                  className="group block"
                >
                  <div className="aspect-[16/10] rounded-xl overflow-hidden bg-slate-100 mb-3">
                    <img
                      src={p.image}
                      alt={p.title}
                      loading="lazy"
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                    />
                  </div>
                  <div className="text-xs text-amber-700 mb-1">{p.category}</div>
                  <h3 className="font-serif font-bold text-slate-900 group-hover:text-amber-700 transition leading-snug">
                    {p.title}
                  </h3>
                </Link>
              ))}
            </div>
          </section>
        )}
      </article>
    </>
  );
}