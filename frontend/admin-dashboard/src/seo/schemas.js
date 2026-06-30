const SITE_URL = 'https://leadingstarsacademy.edu.gh';

export const organizationSchema = {
  '@context': 'https://schema.org',
  '@type': 'EducationalOrganization',
  name: 'Leading Stars Academy',
  url: SITE_URL,
  logo: `${SITE_URL}/logo.png`,
  description:
    'Leading Stars Academy is a premier educational institution in Ghana offering preschool, nursery, primary, and junior high education with a focus on academic excellence and character development.',
  address: {
    '@type': 'PostalAddress',
    streetAddress: '12 Independence Avenue',
    addressLocality: 'Accra',
    addressRegion: 'Greater Accra',
    postalCode: '00233',
    addressCountry: 'GH',
  },
  contactPoint: {
    '@type': 'ContactPoint',
    telephone: '+233-30-123-4567',
    contactType: 'Admissions',
    email: 'admissions@leadingstarsacademy.edu.gh',
    availableLanguage: ['English'],
  },
  sameAs: [
    'https://www.facebook.com/leadingstarsacademy',
    'https://www.instagram.com/leadingstarsacademy',
    'https://twitter.com/leadingstarsgh',
  ],
};

export const websiteSchema = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'Leading Stars Academy',
  url: SITE_URL,
  potentialAction: {
    '@type': 'SearchAction',
    target: `${SITE_URL}/blog?q={search_term_string}`,
    'query-input': 'required name=search_term_string',
  },
};

export const breadcrumbSchema = (items) => ({
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: items.map((item, i) => ({
    '@type': 'ListItem',
    position: i + 1,
    name: item.name,
    item: `${SITE_URL}${item.path}`,
  })),
});

export const articleSchema = (post) => ({
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: post.title,
  description: post.excerpt,
  image: post.image,
  datePublished: post.publishedAt,
  dateModified: post.updatedAt || post.publishedAt,
  author: {
    '@type': 'Person',
    name: post.author.name,
    jobTitle: post.author.role,
  },
  publisher: {
    '@type': 'Organization',
    name: 'Leading Stars Academy',
    logo: {
      '@type': 'ImageObject',
      url: `${SITE_URL}/logo.png`,
    },
  },
  mainEntityOfPage: {
    '@type': 'WebPage',
    '@id': `${SITE_URL}/blog/${post.slug}`,
  },
});

export const faqSchema = (faqs) => ({
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: faqs.map((f) => ({
    '@type': 'Question',
    name: f.question,
    acceptedAnswer: {
      '@type': 'Answer',
      text: f.answer,
    },
  })),
});

export const coursePeriodSchema = (program) => ({
  '@context': 'https://schema.org',
  '@type': 'Course',
  name: program.name,
  description: program.description,
  provider: {
    '@type': 'EducationalOrganization',
    name: 'Leading Stars Academy',
    sameAs: SITE_URL,
  },
});
export const schoolSchema = {
  "@context": "https://schema.org",
  "@type": "School",
  "name": "Leading Stars Academy",
  "description": "A premium private school in Accra offering preschool, nursery, primary, and junior high education.",
  "url": "https://leadingstarsacademy.com",
  "address": {
    "@type": "PostalAddress",
    "addressLocality": "Accra",
    "addressCountry": "GH"
  }
};
