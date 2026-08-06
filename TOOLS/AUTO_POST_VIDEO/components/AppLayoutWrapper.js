'use client';

import { usePathname } from 'next/navigation';
import SidebarNav from "@/components/SidebarNav.js";
import Heartbeat from "@/components/Heartbeat.js";

export default function AppLayoutWrapper({ children }) {
  const pathname = usePathname();
  const isHub = pathname === '/';

  if (isHub) {
    return (
      <>
        <Heartbeat />
        {children}
      </>
    );
  }

  return (
    <div className="main-layout">
      <SidebarNav />
      <main className="main-content">
        <Heartbeat />
        {children}
      </main>
    </div>
  );
}
