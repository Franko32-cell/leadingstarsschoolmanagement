import { Outlet } from "react-router-dom";
import Navbar from "../components/layout/Navbar";
import Footer from "../components/layout/Footer";

const PublicSiteLayout = () => {
  return (
    <div className="min-h-screen bg-white text-slate-800">
      <Navbar />
      <main className="pt-[68px]">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
};

export default PublicSiteLayout;