"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuthStore } from "@/store/useAuthStore";
import defaultThemeConfig from "@/config/theme";
import { cn } from "@/lib/utils";
import {
  QrCode,
  LayoutDashboard,
  ClipboardList,
  Sparkles,
  User,
  UserCircle,
  ShieldAlert,
  Loader2,
  LogIn,
  ArrowLeftRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AgentMobileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, token, isAuthenticated } = useAuthStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // The third tab depends on role: an Admin using the scan/history flow
  // still needs a way back to their dashboard, but a Field Agent has no
  // legitimate reason to see (or reach) admin-only pages — RBAC UI fix,
  // not just cosmetic, since /dashboard lives in the (mobile) route group
  // which used to have no role check of its own (see that layout's guard).
  const isAdmin = user?.role === "ADMIN";
  const navItems = [
    {
      label: "Scan QR",
      href: "/scan",
      icon: QrCode,
      active: pathname === "/scan",
    },
    {
      label: "History",
      href: "/history",
      icon: ClipboardList,
      active: pathname === "/history",
    },
    isAdmin
      ? {
          label: "Admin Portal",
          href: "/dashboard",
          icon: LayoutDashboard,
          active: pathname === "/dashboard",
        }
      : {
          label: "Profile",
          href: "/profile",
          icon: UserCircle,
          active: pathname === "/profile",
        },
  ];

  return (
    // Native app shell: h-[100dvh] + overflow-hidden here means this outer
    // box is the only thing that ever owns the full viewport height, and
    // <main> below is the only descendant with overflow-y-auto — so it's
    // the only thing that ever scrolls. Header and bottom nav are placed
    // as plain flex-column siblings of <main>, not fixed/sticky: since the
    // space around <main> never scrolls in the first place, they don't
    // need viewport-relative positioning to "stay in place," which also
    // sidesteps the iOS Safari/Chrome bug where a fixed/sticky element's
    // position ends up stale (e.g. drifting under the address bar) after
    // backgrounding and restoring the tab — there's no such position math
    // to desync when the element is just sitting in normal document flow.
    <div className="h-[100dvh] overflow-hidden bg-slate-950 font-sans antialiased text-slate-100 flex flex-col justify-between print:bg-white print:text-black print:h-auto print:overflow-visible">
      {/* Centered Mobile Container */}
      <div className="w-full max-w-md mx-auto h-full bg-card text-card-foreground flex flex-col border-x border-border/40 shadow-2xl relative print:max-w-none print:w-full print:h-auto print:border-none print:shadow-none print:p-0">
        {/* Top Agent Header — a plain flex sibling of <main>, never fixed/sticky.
            The app shell (outer div) is the only thing that owns the full
            viewport height, and only <main> scrolls, so the header simply
            sits at the top of the flex column and can never end up
            misplaced when iOS recalculates the viewport on tab restore. */}
        <header className="shrink-0 flex items-center justify-between border-b bg-card px-4 py-3 pt-[calc(0.75rem+env(safe-area-inset-top))] print:hidden">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <span className="text-xs font-bold tracking-tight block leading-tight">
                {defaultThemeConfig.appName}
              </span>
              {/* For an Admin, this label doubles as an explicit mode
                  switcher — a Field Agent never has anywhere else to switch
                  to (RBAC-blocked from every admin route), so it stays a
                  plain, non-interactive label for that role. Addresses the
                  UX audit's "implicit swap between two nav sets with no
                  visible toggle" finding. */}
              {mounted && isAdmin ? (
                <button
                  type="button"
                  onClick={() => router.push("/dashboard")}
                  className="flex items-center gap-1 text-[10px] text-primary font-semibold hover:underline"
                >
                  <span>Field Agent Mode</span>
                  <ArrowLeftRight className="h-2.5 w-2.5" />
                  <span>Switch to Admin</span>
                </button>
              ) : (
                <span className="text-[10px] text-muted-foreground block font-medium">
                  Field Agent Mode
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {mounted && isAuthenticated && user ? (
              <div className="flex items-center gap-1.5 rounded-full bg-accent/80 px-2.5 py-1 text-[11px] font-medium text-foreground">
                <User className="h-3 w-3 text-primary" />
                <span className="max-w-[100px] truncate">{user.name}</span>
              </div>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push(`/login?redirect=${encodeURIComponent(pathname)}`)}
                className="h-8 px-2.5 rounded-xl text-xs font-semibold gap-1 text-primary hover:text-primary hover:bg-primary/10"
              >
                <LogIn className="h-3.5 w-3.5" />
                <span>Sign In</span>
              </Button>
            )}
          </div>
        </header>

        {/* Dynamic Page Content — the sole scroll container in this layout */}
        <main className="flex-1 min-h-0 p-4 overflow-y-auto overscroll-contain print:overflow-visible print:p-0">
          {children}
        </main>

        {/* Bottom Navigation Bar — a plain flex sibling, never fixed. No
            more content-padding compensation needed either: since this
            occupies real space in the flex column, <main> naturally ends
            right above it instead of sliding underneath it. */}
        <nav className="shrink-0 border-t bg-card px-3 pt-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] flex items-center justify-around print:hidden">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 rounded-xl px-4 py-1.5 text-xs font-semibold transition-colors duration-150 min-w-[72px]",
                  item.active
                    ? "text-primary font-bold bg-primary/10"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon
                  className={cn(
                    "h-5 w-5",
                    item.active ? "text-primary" : "text-muted-foreground"
                  )}
                />
                <span className="text-[11px]">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
