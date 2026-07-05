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
      description="This page explains how cookies are used on the Leading Stars Academy website, including cookies used for advertising."
    />
    <section className="py-16">
      <Container className="max-w-4xl">
        <Prose>
          <p>
            <strong>Last updated:</strong> July 2026
          </p>

          <p>
            This website uses cookies and similar technologies to keep the
            site working properly, remember your preferences, and, where you
            have given consent, to serve advertising. This policy explains
            what these cookies do and the choices available to you.
          </p>

          <h2>Strictly Necessary Cookies</h2>
          <p>
            These cookies are required for the website to function correctly
            — for example, remembering your cookie consent choice, and
            keeping you signed in to the Student, Teacher, or Admin portals.
            They do not require your consent and cannot be switched off, as
            the site cannot work properly without them.
          </p>

          <h2>Advertising Cookies (Google AdSense)</h2>
          <p>
            We use <strong>Google AdSense</strong>, a service provided by
            Google LLC, to display advertisements on this website. When
            enabled, Google AdSense may set cookies to serve ads, measure how
            ads perform, and, where permitted, personalise the ads shown to
            you based on your visits to this and other websites.
          </p>
          <p>
            These cookies are <strong>only set after you accept cookies</strong>{" "}
            using the consent banner shown on this site. If you select{" "}
            <strong>Decline</strong>, the advertising script does not load and
            no advertising cookies are set on your device.
          </p>
          <p>
            You can learn more about how Google uses information from sites
            that use its services at{" "}
            <a
              href="https://policies.google.com/technologies/partner-sites"
              target="_blank"
              rel="noopener noreferrer"
            >
              Google's Partner Sites policy
            </a>
            , and manage your ad personalisation settings directly at{" "}
            <a
              href="https://myadcenter.google.com"
              target="_blank"
              rel="noopener noreferrer"
            >
              Google Ad Settings
            </a>
            .
          </p>

          <h2>Your Choices</h2>
          <p>
            When you first visit this site, a banner gives you the option to{" "}
            <strong>Accept</strong> or <strong>Decline</strong> non-essential
            cookies. Your choice is saved on your device so you are not asked
            again on future visits. You can also manage or disable cookies at
            any time through your browser settings, though doing so may
            affect some site features.
          </p>

          <h2>Changes to This Policy</h2>
          <p>
            We may update this Cookie Policy from time to time to reflect
            changes in the technologies we use or in applicable law. We
            encourage you to review this page periodically.
          </p>

          <h2>Contact Us</h2>
          <p>
            If you have questions about this Cookie Policy, please{" "}
            <a href="/contact">contact us</a>.
          </p>
        </Prose>
      </Container>
    </section>
  </>
);

export default CookiePolicyPage;