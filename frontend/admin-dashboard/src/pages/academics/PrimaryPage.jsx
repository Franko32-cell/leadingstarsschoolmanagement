import SEO from "../../seo/SEO";
import PageHeader from "../../components/common/PageHeader";
import Container from "../../components/common/Container";
import Prose from "../../components/common/Prose";

const PrimaryPage = () => {
  return (
    <>
      <SEO
        title="Primary Programme"
        description="Learn about the primary school curriculum, teaching methods, learning outcomes, and student development at Leading Stars Academy."
        url="/academics/primary"
      />
      <PageHeader
        eyebrow="Primary"
        title="Academic growth with strong foundations"
        description="Our primary programme develops literacy, numeracy, scientific thinking, communication, and independent study habits."
      />
      <section className="py-16">
        <Container className="max-w-5xl">
          <Prose>
            <h2>Curriculum overview</h2>
            <p>
              Primary education at Leading Stars Academy focuses on broad academic development across literacy, mathematics, science, social studies, technology, creative learning, and character formation.
            </p>
            <h2>Teaching approach</h2>
            <p>
              We use clear instruction, guided practice, formative assessment, and practical learning experiences to ensure students understand concepts deeply rather than memorising them superficially.
            </p>
            <h2>Learning outcomes</h2>
            <ul>
              <li>Strong reading comprehension and written expression</li>
              <li>Improved mathematical reasoning</li>
              <li>Growing scientific curiosity</li>
              <li>Better study habits and responsibility</li>
            </ul>
            <h2>FAQs</h2>
            <h3>Do you support different learning styles?</h3>
            <p>Yes. We aim to provide varied teaching methods that support different learners while maintaining high expectations.</p>
            <h3>Is character development part of primary education?</h3>
            <p>Absolutely. Respect, discipline, responsibility, and integrity are intentionally cultivated alongside academics.</p>
          </Prose>
        </Container>
      </section>
    </>
  );
};

export default PrimaryPage;