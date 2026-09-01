"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { defaultThemeConfig } from "@/config/theme";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Server,
  PackageOpen,
  ClipboardList,
  Coins,
  Settings,
  Sparkles,
} from "lucide-react";

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
}

const navItems: NavItem[] = [
  {
    title: "Overview",
    href: "/",
    icon: LayoutDashboard,
  },
  {
    title: "Vending Machines",
    href: "/machines",
    icon: Server,
  },
  {
    title: "Packet Master",
    href: "/packets",
    icon: PackageOpen,
  },
  {
    title: "Inventory Logs",
    href: "/inventory-logs",
    icon: ClipboardList,
  },
  {
    title: "Cash Tracking",
    href: "/cash",
    icon: Coins,
  },
  {
    title: "Settings & Branding",
    href: "/settings",
    icon: Settings,
  },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex h-screen w-64 flex-col border-r border-border/50 bg-card/70 backdrop-blur-xl shrink-0">
      {/* Brand / Logo Header */}
      <div className="flex h-16 items-center gap-3 border-b border-border/50 px-6">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm shadow-primary/30">
          <Sparkles className="h-5 w-5" />
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-bold tracking-tight text-foreground">
            {defaultThemeConfig.appName}
          </span>
          <span className="text-[10px] font-medium text-muted-foreground">
            Multi-Tenant Vending
          </span>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 space-y-1.5 p-4">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-[background-color,color,transform,box-shadow] duration-150 ease-out active:scale-[0.98]",
                isActive
                  ? "bg-primary text-primary-foreground font-semibold shadow-xs shadow-primary/20"
                  : "text-muted-foreground hover:bg-accent/60 hover:text-foreground"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span>{item.title}</span>
              {item.badge && (
                <span className="ml-auto rounded-full bg-primary/20 px-2 py-0.5 text-[10px] font-semibold text-primary">
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Tenant Status Footer */}
      <div className="border-t border-border/50 p-4">
        <div className="rounded-xl bg-accent/40 border border-border/40 p-3 text-xs">
          <p className="font-semibold text-foreground">SaaS Multi-Tenant Mode</p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            Data isolated by Tenant ID
          </p>
        </div>
      </div>
    </aside>
  );
}

export default Sidebar;
