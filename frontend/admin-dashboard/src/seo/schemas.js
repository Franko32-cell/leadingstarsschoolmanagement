import siteConfig from "./siteConfig";

export const schoolSchema = {
  "@context": "https://schema.org",
  "@type": "School",
  name: siteConfig.siteName,
  url: siteConfig.siteUrl,
  logo: `${siteConfig.siteUrl}/assets/logo.jpeg`,
  image: `${siteConfig.siteUrl}/assets/logo.jpeg`,
  telephone: siteConfig.phone,
  email: siteConfig.email,
  address: {
    "@type": "PostalAddress",
    streetAddress: "Tettegu Junction, Behind Frimps Fueling Station",
    addressLocality: "Accra",
    addressCountry: "GH",
  },
};

export const breadcrumbSchema = (items) => ({
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: items.map((item, index) => ({
    "@type": "ListItem",
    position: index + 1,
    name: item.name,
    item: `${siteConfig.siteUrl}${item.path}`,
  })),
});

export const articleSchema = (post) => ({
  "@context": "https://schema.org",
  "@type": "Article",
  headline: post.title,
  description: post.excerpt,
  image: `${siteConfig.siteUrl}${post.image}`,
  author: {
    "@type": "Person",
    name: post.author || "Leading Stars Editorial Team",
  },
  publisher: {
    "@type": "Organization",
    name: siteConfig.siteName,
    logo: {
      "@type": "ImageObject",
      url: `${siteConfig.siteUrl}/assets/logo.jpeg`,
    },
  },
  datePublished: post.date,
  dateModified: post.updatedAt || post.date,
  mainEntityOfPage: `${siteConfig.siteUrl}${post.path}`,
});