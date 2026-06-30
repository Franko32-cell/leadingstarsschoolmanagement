import SEO from "../../seo/SEO";
import PageHeader from "../../components/common/PageHeader";
import Container from "../../components/common/Container";
import Prose from "../../components/common/Prose";

const NurseryPage = () => {
  return (
    <>
      <SEO
        title="Nursery Programme"
        description="Explore the nursery curriculum, teaching style, learning goals, and FAQs at Leading Stars Academy."
        url="/academics/nursery"
      />
      <PageHeader
        eyebrow="Nursery"
        title="Strong foundations for confident learners"
        description="Our nursery programme helps children build literacy, numeracy, independence, communication, and school readiness."
      />
      <section className="py-16">
        <Container className="max-w-5xl">
          <Prose>
            <h2>Curriculum overview</h2>
            <p>
              Nursery learners begin to engage more intentionally with early letters, sounds, numbers, stories, classroom participation, and personal independence. This stage helps children move from broad early stimulation into stronger readiness for primary school.
            </p>
            <h2>Teaching approach</h2>
            <p>
              We combine structured routines with hands-on exploration, repetition, guided instruction, and creative learning activities. Learning is active, practical, and age-appropriate.
            </p>
            <h2>Learning outcomes</h2>
            <ul>
              <li>Improved early literacy awareness</li>
              <li>Foundational number understanding</li>
              <li>Better classroom behaviour and attention</li>
              <li>Growing independence in simple tasks</li>
            </ul>
            <h2>FAQs</h2>
            <h3>Do children begin reading in nursery?</h3>
            <p>Children begin pre-reading and early literacy development through sounds, vocabulary, stories, and recognition activities.</p>
            <h3>Why is nursery important?</h3>
            <p>Nursery lays the academic and behavioural foundation for confident entry into primary school.</p>
          </Prose>
        </Container>
      </section>
    </>
  );
};

export default NurseryPage;