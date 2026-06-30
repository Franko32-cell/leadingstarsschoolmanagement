import { Route } from "react-router-dom";
import PublicSiteLayout from "../layouts/PublicSiteLayout";

import HomePage from "../pages/public/HomePage";
import AboutPage from "../pages/public/AboutPage";
import AcademicsPage from "../pages/public/AcademicsPage";
import AdmissionsPage from "../pages/public/AdmissionsPage";
import ContactPage from "../pages/public/ContactPage";
import PrivacyPolicyPage from "../pages/public/PrivacyPolicyPage";
import TermsPage from "../pages/public/TermsPage";
import CookiePolicyPage from "../pages/public/CookiePolicyPage";

import PreschoolPage from "../pages/academics/PreschoolPage";
import NurseryPage from "../pages/academics/NurseryPage";
import PrimaryPage from "../pages/academics/PrimaryPage";
import JuniorHighPage from "../pages/academics/JuniorHighPage";

import BlogIndexPage from "../pages/blog/BlogIndexPage";
import BlogPostPage from "../pages/blog/BlogPostPage";

import NewsIndexPage from "../pages/news/NewsIndexPage";
import NewsPostPage from "../pages/news/NewsPostPage";

const PublicRoutes = (
  <Route element={<PublicSiteLayout />}>
    <Route path="/" element={<HomePage />} />
    <Route path="/about" element={<AboutPage />} />
    <Route path="/academics" element={<AcademicsPage />} />
    <Route path="/academics/preschool" element={<PreschoolPage />} />
    <Route path="/academics/nursery" element={<NurseryPage />} />
    <Route path="/academics/primary" element={<PrimaryPage />} />
    <Route path="/academics/junior-high" element={<JuniorHighPage />} />
    <Route path="/admissions" element={<AdmissionsPage />} />
    <Route path="/blog" element={<BlogIndexPage />} />
    <Route path="/blog/:slug" element={<BlogPostPage />} />
    <Route path="/news" element={<NewsIndexPage />} />
    <Route path="/news/:slug" element={<NewsPostPage />} />
    <Route path="/contact" element={<ContactPage />} />
    <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
    <Route path="/terms" element={<TermsPage />} />
    <Route path="/cookie-policy" element={<CookiePolicyPage />} />
  </Route>
);

export default PublicRoutes;