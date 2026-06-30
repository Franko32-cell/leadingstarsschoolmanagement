import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import prerender from "vite-plugin-prerender";
import fs from "fs";

const extractRoutes = (filePath, basePath) => {
  const content = fs.readFileSync(filePath, "utf-8");
  const regex = /slug:\s*"([^"]+)"/g;
  const routes = [];
  let match;

  while ((match = regex.exec(content)) !== null) {
    routes.push(`${basePath}/${match[1]}`);
  }

  return routes;
};

const blogRoutes = extractRoutes("./src/data/blogPosts.js", "/blog");
const newsRoutes = extractRoutes("./src/data/newsPosts.js", "/news");

const publicRoutes = [
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
  ...blogRoutes,
  ...newsRoutes,
];

export default defineConfig({
  plugins: [
    react(),
    prerender({
      staticDir: "dist",
      routes: publicRoutes,
    }),
  ],
});