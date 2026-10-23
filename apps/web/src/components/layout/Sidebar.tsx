"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuthStore } from "@/store/useAuthStore";
import { useUsers } from "@/hooks/useUsers";
import { defaultThemeConfig } from "@/config/theme";
import { cn } from "@/lib/utils";
import { Sparkles } from "lucide-react";
import { NAV_ITEMS, getActiveNavHref } from "./navConfig";

export function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuthStore();
  const { data: appUsers = [] } = useUsers();
  const isRootAdmin = appUsers.find((u) => u.id === user?.id)?.isRootAdmin ?? false;
  const activeHref = getActiveNavHref(pathname);
  const items = NAV_ITEMS.filter(
    (item) => (!item.rootOnly || isRootAdmin) && !item.moreOnly
  );

  return (
    <aside className="hidden md:flex h-full w-64 flex-col border-r border-border/50 bg-card/70 backdrop-blur-xl shrink-0">
      <div className="flex h-16 items-center gap-3 border-b border-border/50 px-6 shrink-0">
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

      <nav className="flex-1 overflow-y-auto space-y-1.5 p-4">
        {items.map((item) => {
          const isActive = item.href === activeHref;
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
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-border/50 p-4 shrink-0">
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
