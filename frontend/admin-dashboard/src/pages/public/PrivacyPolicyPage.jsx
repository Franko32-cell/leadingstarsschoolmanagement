import SEO from "../../seo/SEO";
import PageHeader from "../../components/common/PageHeader";
import Container from "../../components/common/Container";
import Prose from "../../components/common/Prose";

const PrivacyPolicyPage = () => (
  <>
    <SEO
      title="Privacy Policy"
      description="Read the privacy policy for Leading Stars Academy."
      url="/privacy-policy"
    />
    <PageHeader
      eyebrow="Legal"
      title="Privacy Policy"
      description="This page explains how Leading Stars Academy collects, uses, and protects personal information."
    />
    <section className="py-16">
      <Container className="max-w-4xl">
        <Prose>
          <p>Leading Stars Academy respects your privacy and is committed to protecting personal information shared through this website.</p>
          <h2>Information we collect</h2>
          <p>We may collect information submitted through contact forms, admissions forms, newsletter requests, or portal interactions.</p>
          <h2>How we use information</h2>
          <p>We use submitted information to respond to enquiries, provide admissions support, improve our services, and maintain school communications.</p>
          <h2>Data protection</h2>
          <p>We take reasonable steps to protect personal information from unauthorised access, misuse, or disclosure.</p>
          <h2>Third-party services</h2>
          <p>Some parts of the website may use trusted third-party tools such as maps, analytics, or form services.</p>
          <h2>Contact</h2>
          <p>If you have questions about this policy, please contact us through our <a href="/contact">Contact Page</a>.</p>
        </Prose>
      </Container>
    </section>
  </>
);

export default PrivacyPolicyPage;