import { useState } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import Topbar  from "./Topbar";

/**
 * Layout
 * Base surface for the whole admin shell: a near-black void with a few
 * soft, low-opacity glow blobs behind everything. Sidebar/Topbar/cards
 * sit on top as frosted glass, so the glow is what gives them depth
 * instead of drop shadows.
 */
const Layout = () => {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="relative flex min-h-screen bg-[#05070D] text-slate-100 overflow-hidden">
      {/* ── Ambient glow field ── */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute -top-40 -left-32 w-[36rem] h-[36rem] rounded-full bg-[#5B7FFF] opacity-[0.14] blur-[140px]" />
        <div className="absolute top-1/3 -right-40 w-[32rem] h-[32rem] rounded-full bg-[#9B6BFF] opacity-[0.12] blur-[140px]" />
        <div className="absolute bottom-[-10rem] left-1/4 w-[30rem] h-[30rem] rounded-full bg-[#F2A93B] opacity-[0.06] blur-[150px]" />
      </div>

      <Sidebar
        collapsed={collapsed}
        onToggle={() => setCollapsed((v) => !v)}
      />

      <div className="relative z-10 flex flex-col flex-1 min-w-0">
        <Topbar
          onMenuToggle={() => setCollapsed((v) => !v)}
          sidebarOpen={!collapsed}
        />

        <main className="flex-1 p-6 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;