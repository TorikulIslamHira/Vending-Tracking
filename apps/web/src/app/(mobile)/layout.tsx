"use client";

import React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuthStore } from "@/store/useAuthStore";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  MapPin,
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
    label: "Locations",
    href: "/locations",
    icon: MapPin,
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
  const { isAuthenticated, token } = useAuthStore();
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

  // Bottom Navigation Bar is displayed on primary and secondary operational list views (never on auth pages)
  const bottomNavRoutes = [
    "/dashboard",
    "/locations",
    "/reports",
    "/settings",
    "/assignments",
    "/machines",
    "/inventory-logs",
    "/cash",
    "/packets",
    "/users",
  ];

  const showBottomNav = !isAuthPage && bottomNavRoutes.includes(pathname);

  // Active tab determination helper
  const getIsActiveTab = (tabHref: string) => {
    if (tabHref === "/dashboard") {
      return pathname === "/dashboard" || pathname === "/";
    }
    if (tabHref === "/locations") {
      return (
        pathname === "/locations" ||
        pathname === "/machines" ||
        pathname.startsWith("/stores") ||
        pathname.startsWith("/locations")
      );
    }
    if (tabHref === "/reports") {
      return (
        pathname === "/reports" ||
        pathname === "/cash" ||
        pathname === "/inventory-logs"
      );
    }
    if (tabHref === "/settings") {
      return (
        pathname === "/settings" ||
        pathname === "/assignments" ||
        pathname === "/users" ||
        pathname === "/packets"
      );
    }
    return pathname === tabHref;
  };

  return (
    <div className="w-full min-h-screen bg-background font-sans antialiased flex flex-col items-center justify-start selection:bg-primary/30 print:bg-white print:min-h-0 print:p-0">
      {/* Mobile-Constrained 100% Single-Column Layout (Zero Desktop Sidebars) */}
      <div
        className={cn(
          "w-full max-w-md min-h-screen bg-card text-card-foreground flex flex-col relative shadow-md overflow-x-hidden border-x border-border/40 print:max-w-none print:w-full print:min-h-0 print:border-none print:shadow-none print:p-0 print:bg-white",
          showBottomNav ? "pb-24 print:pb-0" : "pb-6 print:pb-0"
        )}
      >
        {/* Main Content Area */}
        <main className="w-full flex-1 min-w-0 print:p-0">{children}</main>

        {/* Fixed Mobile Bottom Navigation Bar */}
        {showBottomNav && (
          <nav className="fixed bottom-0 left-0 right-0 z-50 w-full max-w-md mx-auto bg-card/95 backdrop-blur-xl border-t border-border/60 px-3 py-2 flex items-center justify-around shadow-lg print:hidden">
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
