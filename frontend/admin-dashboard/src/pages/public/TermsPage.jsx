import SEO from "../../seo/SEO";
import PageHeader from "../../components/common/PageHeader";
import Container from "../../components/common/Container";
import Prose from "../../components/common/Prose";

const TermsPage = () => (
  <>
    <SEO
      title="Terms of Use"
      description="Read the terms of use for the Leading Stars Academy website."
      url="/terms"
    />
    <PageHeader
      eyebrow="Legal"
      title="Terms of Use"
      description="These terms govern the use of the Leading Stars Academy website."
    />
    <section className="py-16">
      <Container className="max-w-4xl">
        <Prose>
          <p>By using this website, you agree to use it lawfully and responsibly.</p>
          <h2>Website content</h2>
          <p>All content on this website is provided for general information about the school, its services, programmes, and educational resources.</p>
          <h2>Accuracy</h2>
          <p>We make reasonable efforts to keep content accurate and up to date, but details may change over time.</p>
          <h2>Intellectual property</h2>
          <p>School branding, written content, and media may not be reproduced without permission.</p>
        </Prose>
      </Container>
    </section>
  </>
);

export default TermsPage;