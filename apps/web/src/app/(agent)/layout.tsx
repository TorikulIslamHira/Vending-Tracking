"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/useAuthStore";
import { AppShell } from "@/components/layout/AppShell";

export default function AgentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { user } = useAuthStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // PRESENTATION never reaches this layout's pages at all — it's a
  // read-only demo role scoped to exactly /reports. middleware.ts also
  // blocks these paths at the edge, so a direct navigation never even
  // renders this far; this is just the client-side half of that guard.
  useEffect(() => {
    if (mounted && user?.role === "PRESENTATION") {
      router.replace("/reports");
    }
  }, [mounted, user, router]);

  return <AppShell>{children}</AppShell>;
}
