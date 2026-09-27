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
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar
        collapsed={collapsed}
        onToggle={() => setCollapsed((v) => !v)}
      />

      <div className="flex flex-col flex-1 min-w-0">
        <Topbar
          onMenuToggle={() => setCollapsed((v) => !v)}
          sidebarOpen={!collapsed}
        />

        <main className="flex-1 p-6 overflow-auto bg-gradient-to-br from-slate-50 via-blue-50/40 to-indigo-50/30">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;