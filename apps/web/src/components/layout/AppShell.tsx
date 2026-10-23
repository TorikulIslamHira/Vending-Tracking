"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { useAuthStore } from "@/store/useAuthStore";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";

const AUTH_PAGES = ["/login", "/forgot-password"];

export interface AppShellProps {
  children: React.ReactNode;
}

// Replaces both (agent)/layout.tsx and (mobile)/layout.tsx's bottom-nav
// shells with one desktop-sidebar / mobile-hamburger shell for every role.
//
// h-[100dvh] overflow-hidden on the outer box + a single scrolling <main>
// is the same discipline the old layouts used: it's the only thing that
// ever scrolls, and Header/Sidebar are plain flex siblings (never fixed or
// sticky), which avoids the iOS Safari bug where a fixed/sticky element's
// position goes stale after the app backgrounds and restores.
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
        <Header showNav={showNav} />
        <main className="flex-1 overflow-y-auto overscroll-contain pb-[env(safe-area-inset-bottom)] print:overflow-visible">
          <div className="mx-auto w-full max-w-3xl">{children}</div>
        </main>
      </div>
    </div>
  );
}

export default AppShell;
