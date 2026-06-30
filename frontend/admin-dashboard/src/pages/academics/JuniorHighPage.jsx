import SEO from "../../seo/SEO";
import PageHeader from "../../components/common/PageHeader";
import Container from "../../components/common/Container";
import Prose from "../../components/common/Prose";

const JuniorHighPage = () => {
  return (
    <>
      <SEO
        title="Junior High Programme"
        description="Explore the junior high programme at Leading Stars Academy, including curriculum, teaching philosophy, outcomes, and student preparation."
        url="/academics/junior-high"
      />
      <PageHeader
        eyebrow="Junior High"
        title="Preparation for excellence, maturity, and leadership"
        description="Our junior high programme combines academic rigour with confidence-building, responsibility, and future readiness."
      />
      <section className="py-16">
        <Container className="max-w-5xl">
          <Prose>
            <h2>Curriculum overview</h2>
            <p>
              Junior High School builds on prior learning and prepares students for greater academic complexity, examination readiness, and adolescent responsibility. The curriculum supports strong subject understanding while encouraging independence and maturity.
            </p>
            <h2>Teaching approach</h2>
            <p>
              Students are guided through structured teaching, independent work, practical tasks, revision strategies, and critical thinking activities. Teachers help students build both mastery and confidence.
            </p>
            <h2>Learning outcomes</h2>
            <ul>
              <li>Stronger analytical thinking</li>
              <li>Improved examination preparation</li>
              <li>Greater self-management and responsibility</li>
              <li>Confidence in communication and leadership</li>
            </ul>
            <h2>FAQs</h2>
            <h3>How are students prepared for exams?</h3>
            <p>We combine subject mastery, revision planning, assessment feedback, and confidence-building support.</p>
            <h3>Do students have leadership opportunities?</h3>
            <p>Yes. We encourage responsibility, public speaking, teamwork, and positive student leadership.</p>
          </Prose>
        </Container>
      </section>
    </>
  );
};

export default JuniorHighPage;