import SidebarNav from "@/components/SidebarNav.js";

export default function DashboardLayout({ children }) {
  return (
    <div className="main-layout">
      <SidebarNav />
      <main className="main-content">
        {children}
      </main>
    </div>
  );
}
