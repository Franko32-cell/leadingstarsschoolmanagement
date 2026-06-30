import SEO from "../../seo/SEO";
import PageHeader from "../../components/common/PageHeader";
import Container from "../../components/common/Container";
import Prose from "../../components/common/Prose";
import { breadcrumbSchema, schoolSchema } from "../../seo/schemas";

const AboutPage = () => {
  return (
    <>
      <SEO
        title="About Us"
        description="Learn about the history, mission, vision, leadership, facilities, and educational philosophy of Leading Stars Academy in Accra."
        url="/about"
        keywords={["about school Ghana", "school mission", "private school leadership"]}
        schema={[
          schoolSchema,
          breadcrumbSchema([
            { name: "Home", path: "/" },
            { name: "About", path: "/about" },
          ]),
        ]}
      />

      <PageHeader
        eyebrow="About Our School"
        title="A school built on excellence, care, and long-term student growth"
        description="Learn more about our story, mission, leadership, facilities, and the values that shape life at Leading Stars Academy."
      />

      <section className="py-16">
        <Container className="max-w-5xl">
          <Prose>
            <h2>Our history</h2>
            <p>
              Leading Stars Academy was founded with a clear purpose: to provide children in Ghana with an education that is academically strong, morally grounded, and future-oriented. From its early years, the school was designed to be more than a place of instruction. It was built to become a trusted learning community where children could be known personally, taught carefully, and prepared responsibly for life.
            </p>

            <p>
              Over the years, the school has grown steadily in both scope and reputation. What has remained constant is our commitment to quality, discipline, and holistic development. We continue to serve families who want a balanced education that values both performance and character.
            </p>

            <h2>Our mission</h2>
            <p>
              Our mission is to nurture learners who demonstrate academic excellence, integrity, confidence, curiosity, and leadership. We aim to provide a structured and inspiring learning environment where every child is encouraged to think deeply, communicate clearly, and act responsibly.
            </p>

            <h2>Our vision</h2>
            <p>
              Our vision is to be a leading educational institution in Ghana known for producing well-rounded learners who are prepared for lifelong learning, meaningful contribution, and ethical leadership in a changing world.
            </p>

            <h2>Our teaching philosophy</h2>
            <p>
              We believe children learn best when expectations are high, relationships are supportive, and teaching is intentional. Effective education should stretch students intellectually while also helping them feel safe, guided, and encouraged. Our classrooms combine structure with creativity, routine with inquiry, and accountability with care.
            </p>

            <p>
              We also believe education must be relevant. Learners should understand why their studies matter and how classroom learning connects to real life. That is why we place emphasis on literacy, numeracy, scientific thinking, communication, digital awareness, and values-based development from the earliest stages.
            </p>

            <h2>Leadership</h2>
            <p>
              Strong schools require strong leadership. Our leadership team is committed to clear standards, child safety, teacher development, and positive engagement with parents. We understand that trust is earned through consistency, transparency, and responsible decision-making.
            </p>

            <h2>Facilities</h2>
            <p>
              Leading Stars Academy continues to invest in facilities that support effective teaching and student wellbeing. These include age-appropriate classrooms, learning resources, technology-supported instruction, areas for practical science and discovery, and spaces that encourage both academic focus and healthy social interaction.
            </p>

            <h2>Achievements</h2>
            <p>
              Our students have continued to distinguish themselves in academic work, coding competitions, cultural activities, and character development. We are proud of every milestone, whether it is a formal award, a strong examination result, or the quiet growth of a child who gains confidence and begins to thrive.
            </p>

            <p>
              If you would like to see how our philosophy is applied in practice, we invite you to explore our <a href="/academics">academic programmes</a>, read our <a href="/blog">education blog</a>, or review our <a href="/admissions">admissions process</a>.
            </p>
          </Prose>
        </Container>
      </section>
    </>
  );
};

export default AboutPage;