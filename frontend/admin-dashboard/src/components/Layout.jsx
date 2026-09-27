import { useState } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import Topbar  from "./Topbar";

/**
 * Layout
 * Chrome (Sidebar/Topbar) is dark frosted glass; the content area is a
 * consistent light surface, since every page except the Dashboard is
 * styled for a light background. Only the Dashboard adds its own photo
 * hero and accent color on top of this shared light base.
 */
const Layout = () => {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="flex min-h-screen bg-[#050b16] text-slate-100">
      <Sidebar
        collapsed={collapsed}
        onToggle={() => setCollapsed((v) => !v)}
      />

      <div className="flex flex-col flex-1 min-w-0">
        <Topbar
          onMenuToggle={() => setCollapsed((v) => !v)}
          sidebarOpen={!collapsed}
        />

        <main
          data-admin-shell="true"
          className="flex-1 overflow-auto bg-[radial-gradient(circle_at_top_left,_rgba(91,127,255,0.18),_transparent_30%),radial-gradient(circle_at_bottom_right,_rgba(155,107,255,0.16),_transparent_25%),linear-gradient(180deg,#070d18_0%,#0a1220_100%)] p-6"
        >
          <div className="mx-auto max-w-[1600px]">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;