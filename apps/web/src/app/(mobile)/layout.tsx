"use client";

import React from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuthStore } from "@/store/useAuthStore";
import { AppShell } from "@/components/layout/AppShell";

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
  // PRESENTATION gets a narrower carve-out: it's a read-only demo role
  // scoped to exactly /reports (with percentage-skewed figures) — not
  // admin-equivalent, so every other page in this layout (Dashboard,
  // Stores, Machines, Settings, ...) bounces it back to /reports instead.
  React.useEffect(() => {
    if (!mounted || isAuthPage || !isAuthenticated || !user) return;
    if (user.role === "ADMIN") return;
    if (user.role === "PRESENTATION") {
      if (pathname !== "/reports" && !pathname.startsWith("/reports/")) {
        router.replace("/reports");
      }
      return;
    }
    router.replace("/scan");
  }, [mounted, isAuthPage, isAuthenticated, user, pathname, router]);

  return <AppShell>{children}</AppShell>;
}
