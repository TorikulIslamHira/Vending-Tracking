"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { LayoutDashboard, Store, BarChart3, MoreHorizontal } from "lucide-react";

interface TabItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

const TABS: TabItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Stores", href: "/stores", icon: Store },
  { label: "Reports", href: "/reports", icon: BarChart3 },
  { label: "More", href: "/settings", icon: MoreHorizontal },
];

// Which routes highlight each tab. Every authenticated page falls under
// exactly one of these — unlike the old per-role bottom nav, this is the
// same 4 tabs on every page now, so a page that isn't an obvious match
// (the old agent-only pages: scan/history/profile, and the drill-down
// pages: browse/machine/store) still needs a home. Scan/History/Profile
// go under More (they're account/workflow actions, not fleet data);
// Browse and the machine/store detail pages go under Stores (they're all
// fleet-directory views, same as /stores and /machines).
const TAB_ROUTE_GROUPS: Record<string, string[]> = {
  "/dashboard": ["/dashboard"],
  "/stores": ["/stores", "/machines", "/browse", "/machine", "/store"],
  "/reports": ["/reports"],
  "/settings": [
    "/settings",
    "/assignments",
    "/users",
    "/packets",
    "/cash",
    "/audit-log",
    "/inventory-logs",
    "/scan",
    "/history",
    "/profile",
  ],
};

function matchesGroup(pathname: string, groupRoutes: string[]) {
  return groupRoutes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );
}

export function BottomNav() {
  const pathname = usePathname();

  return (
    // Plain flex sibling of <main>, never fixed/sticky — same single-
    // scroll-container discipline as the rest of AppShell (see its own
    // comment for why: avoids the iOS fixed-position drift-on-restore bug).
    <nav className="md:hidden shrink-0 w-full bg-card border-t border-border/60 px-3 pt-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] flex items-center justify-around print:hidden">
      {TABS.map((tab) => {
        const groupRoutes = TAB_ROUTE_GROUPS[tab.href] ?? [tab.href];
        const isActive = matchesGroup(pathname, groupRoutes);
        const Icon = tab.icon;

        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "flex flex-col items-center justify-center min-w-[60px] min-h-[48px] rounded-2xl p-1 transition-[transform,color] duration-150 ease-out active:scale-95 select-none",
              isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <div
              className={cn(
                "flex items-center justify-center h-8 w-12 rounded-full transition-[background-color,transform] duration-200",
                isActive ? "bg-primary/20 text-primary shadow-xs scale-105" : "bg-transparent text-muted-foreground"
              )}
            >
              <Icon className={cn("h-5 w-5 transition-transform duration-150", isActive && "stroke-[2.5]")} />
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
  );
}

export default BottomNav;
