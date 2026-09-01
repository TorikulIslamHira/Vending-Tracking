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
  ShieldAlert,
  Loader2,
  LogIn,
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

  const navItems = [
    {
      label: "Scan QR",
      href: "/scan",
      icon: QrCode,
      active: pathname === "/scan",
    },
    {
      label: "History",
      href: "/inventory-logs",
      icon: ClipboardList,
      active: pathname === "/inventory-logs",
    },
    {
      label: "Admin Portal",
      href: "/dashboard",
      icon: LayoutDashboard,
      active: pathname === "/dashboard",
    },
  ];

  return (
    <div className="min-h-screen bg-slate-950 font-sans antialiased text-slate-100 flex flex-col justify-between print:bg-white print:text-black print:min-h-0">
      {/* Centered Mobile Container */}
      <div className="w-full max-w-md mx-auto min-h-screen bg-card text-card-foreground flex flex-col border-x border-border/40 shadow-2xl relative pb-20 print:max-w-none print:w-full print:min-h-0 print:border-none print:shadow-none print:p-0">
        {/* Top Agent Header */}
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b bg-card/90 px-4 backdrop-blur-md print:hidden">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <span className="text-xs font-bold tracking-tight block leading-tight">
                {defaultThemeConfig.appName}
              </span>
              <span className="text-[10px] text-muted-foreground block font-medium">
                Field Agent Mode
              </span>
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

        {/* Dynamic Page Content */}
        <main className="flex-1 p-4 overflow-y-auto print:p-0">{children}</main>

        {/* Fixed Mobile Bottom Navigation Bar */}
        <nav className="fixed bottom-0 left-0 right-0 z-40 max-w-md mx-auto border-t bg-card/95 backdrop-blur-lg px-3 py-2 flex items-center justify-around shadow-lg print:hidden">
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
