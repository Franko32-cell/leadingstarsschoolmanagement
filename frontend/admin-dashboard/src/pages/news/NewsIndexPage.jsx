import { Link } from "react-router-dom";
import SEO from "../../seo/SEO";
import PageHeader from "../../components/common/PageHeader";
import Container from "../../components/common/Container";
import { newsPosts } from "../../data/newsPosts";

const NewsIndexPage = () => {
  return (
    <>
      <SEO
        title="School News"
        description="Read the latest news, updates, achievements, and events from Leading Stars Academy."
        url="/news"
      />
      <PageHeader
        eyebrow="School News"
        title="News and updates from our school community"
        description="Keep up with recent achievements, school events, academic milestones, and important updates."
      />
      <section className="py-16">
        <Container>
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {newsPosts.map((post) => (
              <article key={post.slug} className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                <img src={post.image} alt={post.title} className="h-56 w-full object-cover" loading="lazy" />
                <div className="p-6">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-gold">
                    {post.category}
                  </p>
                  <h2 className="font-display text-2xl font-bold text-navy">
                    <Link to={`/news/${post.slug}`}>{post.title}</Link>
                  </h2>
                  <p className="mt-3 text-sm leading-7 text-slate-600">{post.excerpt}</p>
                  <div className="mt-4 text-sm text-slate-500">{post.date}</div>
                  <Link to={`/news/${post.slug}`} className="mt-5 inline-block font-semibold text-gold">
                    Read update →
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

export default NewsIndexPage;