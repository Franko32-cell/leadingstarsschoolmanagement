import { Link } from "react-router-dom";
import SEO from "../../seo/SEO";
import { schoolSchema, breadcrumbSchema } from "../../seo/schemas";
import Container from "../../components/common/Container";
import Hero from "../../components/sections/Hero";
import StatsBar from "../../components/sections/StatsBar";
import { blogPosts } from "../../data/blogPosts";
import { newsPosts } from "../../data/newsPosts";

const HomePage = () => {
  const featuredArticles = blogPosts.slice(0, 3);
  const latestNews = newsPosts.slice(0, 3);

  return (
    <>
      <SEO
        title="Premium Private School in Accra"
        description="Leading Stars Academy is a premium private school in Accra offering preschool, nursery, primary, and junior high education with strong academics, leadership training, and holistic student development."
        url="/"
        keywords={[
          "private school in Accra",
          "best school in Ghana",
          "preschool in Accra",
          "primary school in Ghana",
          "junior high school Accra",
          "private academy Ghana",
        ]}
        schema={[
          schoolSchema,
          breadcrumbSchema([{ name: "Home", path: "/" }]),
        ]}
      />

      <Hero />
      <StatsBar />

      <section className="bg-cream py-20">
        <Container>
          <div className="grid gap-12 lg:grid-cols-2">
            <div>
              <p className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-gold">
                Welcome to Leading Stars Academy
              </p>
              <h1 className="font-display text-4xl font-black leading-tight text-navy md:text-5xl">
                A premium educational environment for confident, curious, and capable learners
              </h1>
            </div>
            <div className="space-y-6 text-base leading-8 text-slate-700">
              <p>
                Leading Stars Academy is a private school in Accra dedicated to raising learners who are academically strong, morally grounded, and well prepared for the future. We serve families seeking a balanced education that combines excellent teaching, personal attention, structure, values, and opportunity. From the earliest years in preschool through the more rigorous demands of junior high, our goal is to help each child grow in confidence, knowledge, discipline, and leadership.
              </p>
              <p>
                We believe that excellent schooling should do more than help children pass examinations. It should shape the whole person. For that reason, our educational approach combines strong classroom instruction with social development, communication skills, digital awareness, creativity, sports, and character formation. We want every child to be known, guided, challenged, and encouraged.
              </p>
              <p>
                In today’s educational environment, parents are looking for more than attractive branding. They are looking for trust, consistency, and meaningful outcomes. They want to know that their children are being taught well, supervised carefully, and prepared for both academic success and responsible adulthood. At Leading Stars Academy, we understand that responsibility and treat it with seriousness.
              </p>
            </div>
          </div>

          <div className="mt-12 grid gap-8 md:grid-cols-2 lg:grid-cols-4">
            {[
              {
                title: "Preschool",
                desc: "A warm introduction to school life through play, routine, communication, and early discovery.",
                link: "/academics/preschool",
              },
              {
                title: "Nursery",
                desc: "Foundational literacy, numeracy, social confidence, and school readiness in a nurturing setting.",
                link: "/academics/nursery",
              },
              {
                title: "Primary",
                desc: "Strong academic grounding with attention to reading, mathematics, science, and independent learning habits.",
                link: "/academics/primary",
              },
              {
                title: "Junior High",
                desc: "Structured preparation for higher academic success, leadership, and responsible adolescence.",
                link: "/academics/junior-high",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
              >
                <h2 className="font-display text-2xl font-bold text-navy">{item.title}</h2>
                <p className="mt-3 text-sm leading-7 text-slate-600">{item.desc}</p>
                <Link to={item.link} className="mt-4 inline-block font-semibold text-gold">
                  Explore programme →
                </Link>
              </div>
            ))}
          </div>
        </Container>
      </section>

      <section className="py-20">
        <Container>
          <div className="grid gap-14 lg:grid-cols-2">
            <div className="space-y-6 text-base leading-8 text-slate-700">
              <h2 className="font-display text-4xl font-black text-navy">
                Why families choose our school
              </h2>
              <p>
                Parents choose Leading Stars Academy because they want a school that combines academic seriousness with genuine care for children. Our classrooms are designed to be purposeful, engaging, and supportive. We understand that every child develops at a different pace, which is why we place strong emphasis on responsive teaching, clear communication, and partnership with families.
              </p>
              <p>
                We also recognise the realities facing modern parents in Ghana: the need for trustworthy school leadership, safe learning spaces, disciplined routines, transparent communication, and meaningful preparation for the future. Families are not just looking for attractive buildings or slogans. They are looking for substance. They want to know that their children will learn well, be supervised properly, and grow into responsible young people.
              </p>
              <p>
                At Leading Stars Academy, academic excellence is supported by a broader philosophy of child development. Students are taught to think carefully, speak respectfully, work diligently, and act with integrity. These habits matter not only for school success, but for life. We also believe that students grow best in a culture where teachers are accessible, expectations are clear, and effort is consistently encouraged.
              </p>
              <p>
                Our school environment is designed to give children both support and challenge. Younger learners are guided gently into routines and language-rich learning. Older students are encouraged to think more independently, manage responsibility, and build confidence in academic and leadership tasks. Across every level, we want students to leave stronger than they came.
              </p>
            </div>

            <div className="rounded-[2rem] bg-navy p-8 text-white shadow-xl">
              <h2 className="font-display text-3xl font-bold">
                What makes our learning environment distinctive
              </h2>
              <ul className="mt-6 space-y-4 text-sm leading-7 text-white/80">
                <li>• Small enough to know students personally, structured enough to maintain high standards.</li>
                <li>• Strong literacy, numeracy, and foundational STEM teaching from the early years.</li>
                <li>• Emphasis on discipline, courtesy, leadership, and personal responsibility.</li>
                <li>• A balanced programme that values arts, sports, technology, and communication.</li>
                <li>• Ongoing partnership with parents through clear school-home communication.</li>
                <li>• A growing educational culture committed to long-term student success.</li>
              </ul>
              <div className="mt-8">
                <Link
                  to="/about"
                  className="inline-flex rounded-full bg-gold px-6 py-3 text-sm font-bold text-navy"
                >
                  Learn more about our school
                </Link>
              </div>
            </div>
          </div>
        </Container>
      </section>

      <section className="bg-cream py-20">
        <Container>
          <div className="mb-10 max-w-4xl">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-gold">
              Our Educational Philosophy
            </p>
            <h2 className="font-display text-4xl font-black text-navy">
              Holistic education with academic seriousness
            </h2>
            <div className="mt-6 space-y-6 text-base leading-8 text-slate-700">
              <p>
                We believe education should be holistic, not fragmented. Children are not simply preparing to pass tests; they are preparing to become thoughtful, capable, and responsible adults. That is why our educational model values intellectual growth, communication, emotional maturity, discipline, creativity, and ethical conduct together.
              </p>
              <p>
                In practical terms, this means we aim to teach children how to read with understanding, speak with clarity, solve problems carefully, work with others respectfully, and approach challenges with resilience. We value strong teaching, but we also value atmosphere. The emotional tone of a school matters. Children learn better in environments that are orderly, secure, respectful, and encouraging.
              </p>
              <p>
                We also recognise that school-home partnership is essential. Parents are not outside the learning process. When families and schools work together, children experience more consistency, stronger support, and clearer expectations. This is one of the reasons we value communication and trust so deeply.
              </p>
            </div>
          </div>
        </Container>
      </section>

      <section className="py-20">
        <Container>
          <div className="mb-10 flex items-end justify-between gap-6">
            <div>
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-gold">
                Featured Articles
              </p>
              <h2 className="font-display text-4xl font-black text-navy">
                Helpful reading for parents and learners
              </h2>
            </div>
            <Link to="/blog" className="font-semibold text-gold">
              Visit blog →
            </Link>
          </div>

          <div className="grid gap-8 lg:grid-cols-3">
            {featuredArticles.map((post) => (
              <article
                key={post.slug}
                className="rounded-3xl bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
              >
                <h3 className="font-display text-2xl font-bold text-navy">
                  <Link to={`/blog/${post.slug}`}>{post.title}</Link>
                </h3>
                <p className="mt-4 text-sm leading-7 text-slate-600">{post.excerpt}</p>
                <Link to={`/blog/${post.slug}`} className="mt-5 inline-block font-semibold text-gold">
                  Read article →
                </Link>
              </article>
            ))}
          </div>
        </Container>
      </section>

      <section className="bg-cream py-20">
        <Container>
          <div className="mb-10 flex items-end justify-between gap-6">
            <div>
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-gold">
                School News
              </p>
              <h2 className="font-display text-4xl font-black text-navy">
                Recent updates from our community
              </h2>
            </div>
            <Link to="/news" className="font-semibold text-gold">
              View all news →
            </Link>
          </div>

          <div className="grid gap-8 lg:grid-cols-3">
            {latestNews.map((post) => (
              <article
                key={post.slug}
                className="rounded-3xl border border-slate-200 bg-white p-6 transition hover:-translate-y-1 hover:shadow-lg"
              >
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold">
                  {post.category}
                </p>
                <h3 className="mt-3 font-display text-2xl font-bold text-navy">
                  <Link to={`/news/${post.slug}`}>{post.title}</Link>
                </h3>
                <p className="mt-4 text-sm leading-7 text-slate-600">{post.excerpt}</p>
                <Link to={`/news/${post.slug}`} className="mt-5 inline-block font-semibold text-gold">
                  Read update →
                </Link>
              </article>
            ))}
          </div>
        </Container>
      </section>

      <section className="py-20">
        <Container>
          <div className="grid gap-12 lg:grid-cols-2">
            <div>
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-gold">
                For Parents
              </p>
              <h2 className="font-display text-4xl font-black text-navy">
                Guidance, trust, and a clear path forward
              </h2>
              <div className="mt-6 space-y-6 text-base leading-8 text-slate-700">
                <p>
                  We understand that choosing and trusting a school is not a casual decision. Parents want to feel informed. They want to understand the academic environment, the expectations, the admissions process, and the values that shape daily life in the school. That is why we are committed not only to quality teaching, but also to transparency and accessibility.
                </p>
                <p>
                  Through our website, educational articles, programme pages, and admissions guidance, we aim to give parents useful information rather than empty promotion. We want families to make informed decisions about their children’s education. Whether you are exploring preschool options, preparing for primary admission, or evaluating junior high readiness, our goal is to be a trustworthy source of support and information.
                </p>
              </div>
            </div>

            <div className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm">
              <h3 className="font-display text-3xl font-bold text-navy">
                Explore the next step
              </h3>
              <div className="mt-6 flex flex-col gap-4">
                <Link to="/about" className="rounded-2xl border border-slate-200 px-5 py-4 font-semibold text-navy transition hover:border-gold hover:text-gold">
                  Learn about our history and philosophy
                </Link>
                <Link to="/academics" className="rounded-2xl border border-slate-200 px-5 py-4 font-semibold text-navy transition hover:border-gold hover:text-gold">
                  Explore our academic programmes
                </Link>
                <Link to="/admissions" className="rounded-2xl border border-slate-200 px-5 py-4 font-semibold text-navy transition hover:border-gold hover:text-gold">
                  Review admissions requirements
                </Link>
                <Link to="/contact" className="rounded-2xl border border-slate-200 px-5 py-4 font-semibold text-navy transition hover:border-gold hover:text-gold">
                  Speak with our school team
                </Link>
              </div>
            </div>
          </div>
        </Container>
      </section>

      <section className="bg-navy py-20 text-white">
        <Container className="text-center">
          <p className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-yellow-300">
            Admissions
          </p>
          <h2 className="font-display text-4xl font-black">
            Ready to begin your child’s journey with us?
          </h2>
          <p className="mx-auto mt-6 max-w-3xl text-base leading-8 text-white/75">
            We welcome families who value quality teaching, purposeful structure, and whole-child development. Learn more about our application process, age requirements, and admissions guidance on our dedicated admissions page.
          </p>
          <div className="mt-8 flex justify-center gap-4">
            <Link to="/admissions" className="rounded-full bg-gold px-6 py-3 font-bold text-navy">
              View admissions process
            </Link>
            <Link to="/contact" className="rounded-full border border-white/30 px-6 py-3 font-semibold text-white">
              Contact our admissions team
            </Link>
          </div>
        </Container>
      </section>
    </>
  );
};

export default HomePage;