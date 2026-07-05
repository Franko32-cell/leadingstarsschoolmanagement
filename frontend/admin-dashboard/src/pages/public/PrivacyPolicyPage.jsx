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
          <p>
            Leading Stars Academy respects your privacy and is committed to
            protecting personal information shared through this website.
          </p>

          <h2>Information we collect</h2>
          <p>
            We may collect information submitted through contact forms,
            admissions forms, newsletter requests, or portal interactions. We
            may also automatically collect limited technical information,
            such as your approximate location, browser type, and pages
            visited, through cookies as described in our{" "}
            <a href="/cookie-policy">Cookie Policy</a>.
          </p>

          <h2>How we use information</h2>
          <p>
            We use submitted information to respond to enquiries, provide
            admissions support, improve our services, and maintain school
            communications.
          </p>

          <h2>Data protection</h2>
          <p>
            We take reasonable steps to protect personal information from
            unauthorised access, misuse, or disclosure.
          </p>

          <h2>Third-party services</h2>
          <p>
            Some parts of the website may use trusted third-party tools such
            as maps, analytics, or form services. In particular, we use{" "}
            <strong>Google AdSense</strong> to display advertising on this
            website. Where you have accepted cookies via our consent banner,
            Google may set cookies on your device to serve ads and, where
            permitted, personalise the ads shown to you based on your visits
            to this and other websites. If you decline cookies, no
            advertising cookies are set and ads are not personalised.
          </p>
          <p>
            You can manage how Google personalises ads across the web at{" "}
            <a
              href="https://myadcenter.google.com"
              target="_blank"
              rel="noopener noreferrer"
            >
              Google Ad Settings
            </a>
            , and learn more about Google's approach to data from partner
            sites at{" "}
            <a
              href="https://policies.google.com/technologies/partner-sites"
              target="_blank"
              rel="noopener noreferrer"
            >
              Google's Partner Sites policy
            </a>
            . For more detail on how our advertising cookies work, see our{" "}
            <a href="/cookie-policy">Cookie Policy</a>.
          </p>

          <h2>Contact</h2>
          <p>
            If you have questions about this policy, please contact us
            through our <a href="/contact">Contact Page</a>.
          </p>
        </Prose>
      </Container>
    </section>
  </>
);

export default PrivacyPolicyPage;