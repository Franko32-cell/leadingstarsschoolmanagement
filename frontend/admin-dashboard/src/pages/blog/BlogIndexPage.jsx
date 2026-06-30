import SEO from "../../seo/SEO";
import PageHeader from "../../components/common/PageHeader";
import Container from "../../components/common/Container";
import { blogPosts } from "../../data/blogPosts";
import { Link } from "react-router-dom";

const BlogIndexPage = () => {
  return (
    <>
      <SEO
        title="Education Blog"
        description="Explore helpful articles for parents, students, and families on school readiness, study habits, STEM education, literacy, and child development in Ghana."
        url="/blog"
        keywords={["education blog Ghana", "parenting articles", "school advice", "study habits"]}
      />
      <PageHeader
        eyebrow="Educational Resources"
        title="Our Education Blog"
        description="Browse practical, research-informed articles designed to help parents support learning at home and make informed school decisions."
      />

      <section className="py-16">
        <Container>
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {blogPosts.map((post) => (
              <article key={post.slug} className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
                <img
                  src={post.image}
                  alt={post.title}
                  className="h-56 w-full object-cover"
                  loading="lazy"
                />
                <div className="p-6">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-gold">
                    {post.category}
                  </p>
                  <h2 className="font-display text-2xl font-bold text-navy">
                    <Link to={`/blog/${post.slug}`}>{post.title}</Link>
                  </h2>
                  <p className="mt-3 text-sm leading-7 text-slate-600">
                    {post.excerpt}
                  </p>
                  <div className="mt-4 flex items-center justify-between text-sm text-slate-500">
                    <span>{post.author}</span>
                    <span>{post.date}</span>
                  </div>
                  <Link
                    to={`/blog/${post.slug}`}
                    className="mt-5 inline-block font-semibold text-gold"
                  >
                    Read article →
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </Container>
      </section>
    </>
  );
};

export default BlogIndexPage;