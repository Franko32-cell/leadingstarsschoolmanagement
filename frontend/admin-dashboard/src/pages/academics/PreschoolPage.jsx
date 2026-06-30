import SEO from "../../seo/SEO";
import PageHeader from "../../components/common/PageHeader";
import Container from "../../components/common/Container";
import Prose from "../../components/common/Prose";

const PreschoolPage = () => {
  return (
    <>
      <SEO
        title="Preschool Programme"
        description="Learn about our preschool programme, curriculum, teaching approach, outcomes, and FAQs for early learners in Accra."
        url="/academics/preschool"
        keywords={["preschool in Accra", "early childhood education Ghana", "preschool curriculum"]}
      />
      <PageHeader
        eyebrow="Preschool"
        title="A joyful beginning to formal learning"
        description="Our preschool programme introduces children to school life through nurturing relationships, guided play, language development, and purposeful routines."
      />

      <section className="py-16">
        <Container className="max-w-5xl">
          <Prose>
            <h2>Curriculum overview</h2>
            <p>
              The preschool programme at Leading Stars Academy is designed for young learners who are beginning their educational journey. At this stage, children benefit most from environments that are safe, predictable, language-rich, and developmentally appropriate. Our curriculum supports early communication, fine and gross motor development, social interaction, self-expression, listening, and school readiness.
            </p>

            <p>
              Children are introduced to shapes, colours, sounds, stories, songs, movement, guided play, pre-literacy awareness, and early number experiences. These foundations matter because they shape later success in reading, writing, classroom participation, and confidence.
            </p>

            <h2>Teaching approach</h2>
            <p>
              Our approach is warm, responsive, and structured. Young children learn best when they feel secure. Teachers therefore build routines carefully and use a balance of play, song, conversation, visual materials, storytelling, movement, and teacher-guided discovery. Activities are short, varied, and engaging.
            </p>

            <h2>Learning outcomes</h2>
            <ul>
              <li>Increased comfort with classroom routines and group participation</li>
              <li>Growth in vocabulary, listening, and expressive communication</li>
              <li>Development of fine motor skills through drawing, tracing, and hands-on tasks</li>
              <li>Improved social skills such as sharing, waiting, and following directions</li>
              <li>Positive early attitudes toward school and learning</li>
            </ul>

            <h2>Why the preschool years matter</h2>
            <p>
              Early childhood is a period of rapid brain development. High-quality preschool experiences help children build emotional security, curiosity, language foundations, and social confidence. These outcomes are not “extra”; they are central to long-term educational success.
            </p>

            <h2>Frequently asked questions</h2>
            <h3>What age do children begin preschool?</h3>
            <p>
              Our preschool intake generally begins from the early years stage appropriate to age and developmental readiness. Parents are encouraged to contact the admissions office for current placement guidance.
            </p>

            <h3>Is the programme play-based?</h3>
            <p>
              Yes. We believe play is a powerful vehicle for early learning. However, our preschool is not unstructured. It combines purposeful play with carefully guided routines and developmental goals.
            </p>

            <h3>How do you help children settle in?</h3>
            <p>
              We support transition through calm routines, positive teacher-child relationships, orientation guidance for parents, and a classroom environment designed to help children feel secure.
            </p>

            <p>
              Families interested in the next step can also explore our <a href="/academics/nursery">Nursery Programme</a> or begin the process through our <a href="/admissions">Admissions Page</a>.
            </p>
          </Prose>
        </Container>
      </section>
    </>
  );
};

export default PreschoolPage;