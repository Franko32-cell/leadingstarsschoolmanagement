import fs from "fs";
import path from "path";

const siteUrl = "https://www.leadingstarsacademy.edu.gh";

const staticRoutes = [
  "/",
  "/about",
  "/academics",
  "/academics/preschool",
  "/academics/nursery",
  "/academics/primary",
  "/academics/junior-high",
  "/admissions",
  "/blog",
  "/news",
  "/contact",
  "/privacy-policy",
  "/terms",
  "/cookie-policy",
];

const blogPostsPath = path.resolve("src/data/blogPosts.js");
const newsPostsPath = path.resolve("src/data/newsPosts.js");

const extractSlugs = (fileContent, basePath) => {
  const regex = /slug:\s*"([^"]+)"/g;
  const slugs = [];
  let match;
  while ((match = regex.exec(fileContent)) !== null) {
    slugs.push(`${basePath}/${match[1]}`);
  }
  return slugs;
};

const blogContent = fs.readFileSync(blogPostsPath, "utf-8");
const newsContent = fs.readFileSync(newsPostsPath, "utf-8");

const blogRoutes = extractSlugs(blogContent, "/blog");
const newsRoutes = extractSlugs(newsContent, "/news");

const allRoutes = [...staticRoutes, ...blogRoutes, ...newsRoutes];

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${allRoutes
  .map(
    (route) => `  <url>
    <loc>${siteUrl}${route}</loc>
  </url>`
  )
  .join("\n")}
</urlset>
`;

fs.writeFileSync(path.resolve("public/sitemap.xml"), sitemap, "utf-8");
console.log("✅ sitemap.xml generated successfully");