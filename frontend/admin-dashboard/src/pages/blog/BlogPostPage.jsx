import { useMemo } from "react";
import { Link, useParams, Navigate } from "react-router-dom";
import SEO from "../../seo/SEO";
import { articleSchema, breadcrumbSchema } from "../../seo/schemas";
import { blogPosts } from "../../data/blogPosts";
import PageHeader from "../../components/common/PageHeader";
import Container from "../../components/common/Container";
import Prose from "../../components/common/Prose";
import useReadingTime from "../../hooks/useReadingTime";

const BlogPostPage = () => {
  const { slug } = useParams();
  const post = blogPosts.find((item) => item.slug === slug);

  const related = useMemo(() => {
    if (!post) return [];
    return blogPosts
      .filter((item) => item.slug !== post.slug && item.category === post.category)
      .slice(0, 3);
  }, [post]);

  if (!post) return <Navigate to="/blog" replace />;

  const readingTime = useReadingTime(post.content);

  const schema = [
    articleSchema(post),
    breadcrumbSchema([
      { name: "Home", path: "/" },
      { name: "Blog", path: "/blog" },
      { name: post.title, path: `/blog/${post.slug}` },
    ]),
  ];

  return (
    <>
      <SEO
        title={post.title}
        description={post.excerpt}
        image={post.image}
        url={`/blog/${post.slug}`}
        type="article"
        keywords={post.keywords}
        schema={schema}
      />

      <PageHeader
        eyebrow={post.category}
        title={post.title}
        description={post.excerpt}
        bgClass="bg-cream"
      />

      <section className="py-16">
        <Container className="max-w-4xl">
          <img
            src={post.image}
            alt={post.title}
            className="mb-8 h-[420px] w-full rounded-3xl object-cover shadow-luxury"
          />

          <div className="mb-8 flex flex-wrap gap-4 text-sm text-slate-500">
            <span>By {post.author}</span>
            <span>{post.date}</span>
            <span>{readingTime} min read</span>
          </div>

          <Prose>
            <div dangerouslySetInnerHTML={{ __html: post.content }} />
          </Prose>

          {related.length > 0 && (
            <div className="mt-16 border-t pt-10">
              <h2 className="font-display text-3xl font-bold text-navy">
                Related Articles
              </h2>
              <div className="mt-6 grid gap-6 md:grid-cols-3">
                {related.map((item) => (
                  <div key={item.slug} className="rounded-2xl border p-5">
                    <h3 className="font-display text-xl font-bold text-navy">
                      <Link to={`/blog/${item.slug}`}>{item.title}</Link>
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      {item.excerpt}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Container>
      </section>
    </>
  );
};

export default BlogPostPage;