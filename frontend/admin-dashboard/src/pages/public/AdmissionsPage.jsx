import SEO from "../../seo/SEO";
import PageHeader from "../../components/common/PageHeader";
import Container from "../../components/common/Container";
import Prose from "../../components/common/Prose";
import { Link } from "react-router-dom";

const AdmissionsPage = () => {
  return (
    <>
      <SEO
        title="Admissions"
        description="Learn about the admissions process, requirements, age guidance, fees, and enrolment steps for Leading Stars Academy."
        url="/admissions"
      />
      <PageHeader
        eyebrow="Admissions"
        title="Join the Leading Stars Academy community"
        description="We welcome families who value academic quality, discipline, leadership, and holistic student development."
      />

      <section className="py-16">
        <Container className="max-w-5xl">
          <Prose>
            <h2>Admissions process</h2>
            <p>
              Our admissions process is designed to be clear, supportive, and family-friendly. Parents may begin by contacting the school, visiting the campus, or starting the registration process online. Once an enquiry is made, our admissions team will guide families through the appropriate class placement, required documents, and any assessments that may apply.
            </p>

            <h2>Requirements</h2>
            <ul>
              <li>Completed application or registration form</li>
              <li>Passport photograph of the student</li>
              <li>Birth certificate or proof of age</li>
              <li>Previous academic records where applicable</li>
              <li>Parent or guardian contact information</li>
            </ul>

            <h2>Placement and readiness</h2>
            <p>
              Placement is based on age, prior schooling, and general readiness. For younger learners, we focus on developmental readiness. For older learners, placement may consider previous school records and class suitability.
            </p>

            <h2>Fees and payment information</h2>
            <p>
              School fees vary depending on class level and year group. Families are encouraged to contact the admissions office directly for the most current fee schedule. Where available, flexible payment arrangements may be discussed in line with school policy.
            </p>

            <h2>Frequently asked questions</h2>
            <h3>When can I apply?</h3>
            <p>Applications are accepted ahead of each academic intake, subject to available spaces.</p>

            <h3>Can I visit the school before applying?</h3>
            <p>Yes. We encourage families to visit the school and speak with the admissions team.</p>

            <h3>How do I get started?</h3>
            <p>
              You may begin by contacting us through the <Link to="/contact">Contact Page</Link> or using the registration route available on the portal.
            </p>
          </Prose>
        </Container>
      </section>
    </>
  );
};

export default AdmissionsPage;