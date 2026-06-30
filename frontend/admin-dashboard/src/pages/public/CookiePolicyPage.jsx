import SEO from "../../seo/SEO";
import PageHeader from "../../components/common/PageHeader";
import Container from "../../components/common/Container";
import Prose from "../../components/common/Prose";

const CookiePolicyPage = () => (
  <>
    <SEO
      title="Cookie Policy"
      description="Read the cookie policy for the Leading Stars Academy website."
      url="/cookie-policy"
    />
    <PageHeader
      eyebrow="Legal"
      title="Cookie Policy"
      description="This page explains how cookies may be used on the Leading Stars Academy website."
    />
    <section className="py-16">
      <Container className="max-w-4xl">
        <Prose>
          <p>This website may use cookies or similar technologies to improve user experience, remember preferences, and understand site performance.</p>
          <h2>How cookies help</h2>
          <p>Cookies may assist with analytics, navigation, and user session management.</p>
          <h2>Your choices</h2>
          <p>You can manage or disable cookies through your browser settings, though some features may be affected.</p>
        </Prose>
      </Container>
    </section>
  </>
);

export default CookiePolicyPage;