import { Helmet } from "react-helmet-async";
import siteConfig from "./siteConfig";

const SEO = ({
  title,
  description,
  image,
  url,
  type = "website",
  keywords = [],
  schema = null,
}) => {
  const fullTitle = title
    ? `${title} | ${siteConfig.siteName}`
    : siteConfig.defaultTitle;

  const metaDescription = description || siteConfig.defaultDescription;
  const metaImage = image || siteConfig.defaultImage;
  const canonical = url ? `${siteConfig.siteUrl}${url}` : siteConfig.siteUrl;

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={metaDescription} />
      <meta name="keywords" content={keywords.join(", ")} />
      <link rel="canonical" href={canonical} />

      <meta property="og:type" content={type} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={metaDescription} />
      <meta property="og:url" content={canonical} />
      <meta property="og:image" content={`${siteConfig.siteUrl}${metaImage}`} />
      <meta property="og:site_name" content={siteConfig.siteName} />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={metaDescription} />
      <meta name="twitter:image" content={`${siteConfig.siteUrl}${metaImage}`} />
      <meta name="twitter:site" content={siteConfig.twitterHandle} />

      {schema && (
        <script type="application/ld+json">
          {JSON.stringify(schema)}
        </script>
      )}
    </Helmet>
  );
};

export default SEO;