"use client";

import React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuthStore } from "@/store/useAuthStore";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Store,
  BarChart3,
  MoreHorizontal,
} from "lucide-react";

interface TabItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

const tabs: TabItem[] = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    label: "Stores",
    href: "/stores",
    icon: Store,
  },
  {
    label: "Reports",
    href: "/reports",
    icon: BarChart3,
  },
  {
    label: "More",
    href: "/settings",
    icon: MoreHorizontal,
  },
];

export default function MobileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isAuthenticated, token } = useAuthStore();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const isAuthPage = pathname === "/login" || pathname === "/forgot-password";

  // Client-side authentication guard
  React.useEffect(() => {
    if (mounted && !isAuthPage && (!isAuthenticated || !token)) {
      const redirectUrl = encodeURIComponent(pathname);
      router.push(`/login?redirect=${redirectUrl}`);
    }
  }, [mounted, isAuthPage, isAuthenticated, token, pathname, router]);

  // RBAC guard: every page in this layout is admin-tooling (fleet, users,
  // reports, settings, ...) — a Field Agent has no legitimate reason to be
  // here even if they type the URL directly or tap a stale link. Redirect
  // them to their actual home instead of leaving the full admin nav/data
  // visible (this is the client-side half; middleware.ts also blocks these
  // paths at the edge so a direct navigation never even renders this far).
  React.useEffect(() => {
    if (mounted && !isAuthPage && isAuthenticated && user && user.role !== "ADMIN") {
      router.replace("/scan");
    }
  }, [mounted, isAuthPage, isAuthenticated, user, router]);

  // Which routes belong under each bottom-tab, kept as one explicit source
  // of truth (rather than duplicated ad-hoc conditions) so a route can't
  // silently drift out of sync with which tab it should highlight. Grouping
  // follows each page's own "back to" navigation target, not guesswork —
  // e.g. cash/page.tsx's back button goes to /settings ("Settings & More"),
  // so /cash belongs under the Settings tab, not Reports.
  const TAB_ROUTE_GROUPS: Record<string, string[]> = {
    "/dashboard": ["/dashboard", "/"],
    "/stores": ["/stores", "/machines"],
    "/reports": ["/reports"],
    "/settings": [
      "/settings",
      "/assignments",
      "/users",
      "/packets",
      "/cash",
      "/audit-log",
      "/inventory-logs",
    ],
  };

  const bottomNavRoutes = Object.values(TAB_ROUTE_GROUPS).flat();

  const showBottomNav =
    !isAuthPage &&
    bottomNavRoutes.some((route) => pathname === route || pathname.startsWith(`${route}/`));

  // Active tab determination — a route matches a tab if it's an exact
  // match or a nested sub-route of one of that tab's grouped routes (so a
  // page like /settings/anything still highlights "More" correctly).
  const getIsActiveTab = (tabHref: string) => {
    const groupRoutes = TAB_ROUTE_GROUPS[tabHref] ?? [tabHref];
    return groupRoutes.some(
      (route) => pathname === route || pathname.startsWith(`${route}/`)
    );
  };

  return (
    // Native app shell: h-[100dvh] + overflow-hidden here means this outer
    // box is the only thing that ever owns the full viewport height, and
    // <main> below is the only descendant with overflow-y-auto — so it's
    // the only thing that ever scrolls. The bottom nav is placed as a
    // plain flex-column sibling of <main>, not fixed: since the space
    // around <main> never scrolls in the first place, it doesn't need
    // viewport-relative positioning to "stay in place," which also
    // sidesteps the iOS Safari/Chrome bug where a fixed element's position
    // ends up stale (e.g. drifting under the address bar) after
    // backgrounding and restoring the tab — there's no such position math
    // to desync when the element is just sitting in normal document flow.
    <div className="w-full h-[100dvh] overflow-hidden bg-background font-sans antialiased flex flex-col items-center justify-start selection:bg-primary/30 print:bg-white print:h-auto print:overflow-visible print:p-0">
      {/* Mobile-Constrained 100% Single-Column Layout (Zero Desktop Sidebars) */}
      <div
        className={cn(
          "w-full max-w-md h-full overflow-hidden bg-card text-card-foreground flex flex-col relative shadow-md border-x border-border/40 print:max-w-none print:w-full print:h-auto print:border-none print:shadow-none print:p-0 print:bg-white"
        )}
      >
        {/* Main Content Area — the sole scroll container in this layout */}
        <main className="w-full flex-1 min-h-0 min-w-0 overflow-y-auto overscroll-contain print:overflow-visible print:p-0">
          {children}
        </main>

        {/* Bottom Navigation Bar — a plain flex sibling, never fixed. No
            content-padding compensation needed on <main> either: since
            this occupies real space in the flex column, <main> naturally
            ends right above it instead of sliding underneath it. */}
        {showBottomNav && (
          <nav className="shrink-0 w-full bg-card border-t border-border/60 px-3 pt-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] flex items-center justify-around print:hidden">
            {tabs.map((tab) => {
              const isActive = getIsActiveTab(tab.href);
              const Icon = tab.icon;

              return (
                <Link
                  key={tab.label}
                  href={tab.href}
                  className={cn(
                    "flex flex-col items-center justify-center min-w-[60px] min-h-[48px] rounded-2xl p-1 transition-[transform,color] duration-150 ease-out active:scale-95 select-none",
                    isActive
                      ? "text-primary"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <div
                    className={cn(
                      "flex items-center justify-center h-8 w-12 rounded-full transition-[background-color,transform] duration-200",
                      isActive
                        ? "bg-primary/20 text-primary shadow-xs scale-105"
                        : "bg-transparent text-muted-foreground"
                    )}
                  >
                    <Icon
                      className={cn(
                        "h-5 w-5 transition-transform duration-150",
                        isActive && "stroke-[2.5]"
                      )}
                    />
                  </div>
                  <span
                    className={cn(
                      "text-[10px] tracking-tight mt-0.5 transition-all duration-150",
                      isActive ? "font-bold text-foreground" : "font-medium"
                    )}
                  >
                    {tab.label}
                  </span>
                </Link>
              );
            })}
          </nav>
        )}
      </div>
    </div>
  );
}
