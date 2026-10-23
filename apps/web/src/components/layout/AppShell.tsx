"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { useAuthStore } from "@/store/useAuthStore";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { BottomNav } from "./BottomNav";

const AUTH_PAGES = ["/login", "/forgot-password"];

export interface AppShellProps {
  children: React.ReactNode;
}

// One shell for every role: a fixed sidebar on desktop (md:+), a fixed
// 4-tab bottom nav on mobile — same tabs on every authenticated page now,
// not swapped per role or per route the way the old (agent)/(mobile)
// layouts each did it.
//
// h-[100dvh] overflow-hidden on the outer box + a single scrolling <main>
// is the same discipline the old layouts used: it's the only thing that
// ever scrolls, and Header/Sidebar/BottomNav are plain flex siblings
// (never fixed or sticky), which avoids the iOS Safari bug where a
// fixed/sticky element's position goes stale after the app backgrounds
// and restores.
export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const { isAuthenticated, user } = useAuthStore();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const isAuthPage = AUTH_PAGES.includes(pathname);
  const showNav = mounted && isAuthenticated && user?.role !== "PRESENTATION";

  if (isAuthPage) {
    return (
      <div className="h-[100dvh] overflow-hidden flex flex-col bg-background print:h-auto print:overflow-visible">
        <main className="flex-1 overflow-y-auto overscroll-contain print:overflow-visible">
          {children}
        </main>
      </div>
    );
  }

  return (
    <div className="h-[100dvh] overflow-hidden flex bg-background font-sans antialiased print:bg-white print:h-auto print:overflow-visible">
      {showNav && <Sidebar />}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden print:overflow-visible">
        <Header />
        <main className="flex-1 overflow-y-auto overscroll-contain pb-[env(safe-area-inset-bottom)] print:overflow-visible">
          <div className="mx-auto w-full max-w-3xl">{children}</div>
        </main>
        {showNav && <BottomNav />}
      </div>
    </div>
  );
}

export default AppShell;
