import SEO from "../../seo/SEO";
import PageHeader from "../../components/common/PageHeader";
import Container from "../../components/common/Container";
import { Link } from "react-router-dom";

const programmes = [
  {
    title: "Preschool",
    path: "/academics/preschool",
    desc: "Early school readiness through play, routine, language, movement, and emotional development.",
  },
  {
    title: "Nursery",
    path: "/academics/nursery",
    desc: "A structured foundation in literacy, numeracy, communication, and early independence.",
  },
  {
    title: "Primary",
    path: "/academics/primary",
    desc: "Broad academic development with emphasis on reading, mathematics, science, and problem-solving.",
  },
  {
    title: "Junior High",
    path: "/academics/junior-high",
    desc: "Rigorous preparation for higher academic demands, leadership, and responsible adolescence.",
  },
];

const AcademicsPage = () => {
  return (
    <>
      <SEO
        title="Academics"
        description="Explore preschool, nursery, primary, and junior high academic programmes at Leading Stars Academy."
        url="/academics"
      />
      <PageHeader
        eyebrow="Academic Programmes"
        title="Education for every stage of growth"
        description="Our academic programmes are designed to meet children where they are and guide them toward confidence, excellence, and long-term readiness."
      />

      <section className="py-16">
        <Container>
          <div className="max-w-4xl pb-10 text-base leading-8 text-slate-700">
            <p>
              At Leading Stars Academy, academics are not treated as a one-size-fits-all process. Children grow in stages, and each stage requires a thoughtful blend of challenge, support, structure, and encouragement. Our programmes are designed to reflect developmental realities while maintaining a consistent commitment to strong teaching and clear standards.
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-2">
            {programmes.map((item) => (
              <div key={item.path} className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
                <h2 className="font-display text-3xl font-bold text-navy">
                  {item.title}
                </h2>
                <p className="mt-4 text-base leading-8 text-slate-600">
                  {item.desc}
                </p>
                <Link to={item.path} className="mt-5 inline-block font-semibold text-gold">
                  Learn more →
                </Link>
              </div>
            ))}
          </div>
        </Container>
      </section>
    </>
  );
};

export default AcademicsPage;