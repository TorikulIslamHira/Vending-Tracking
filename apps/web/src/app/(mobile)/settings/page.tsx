"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/useAuthStore";
import { useUsers } from "@/hooks/useUsers";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { NAV_ITEMS } from "@/components/layout/navConfig";
import { Settings as SettingsIcon, LogOut, ChevronRight } from "lucide-react";

// Supplementary copy/color for the hub grid below — keyed by href, not a
// second nav list. navConfig.ts stays the only source of truth for which
// destinations exist and where they go; this only adds a description and
// an accent color for items that appear here.
const ITEM_META: Record<string, { description: string; color: string }> = {
  "/scan": {
    description: "Scan a machine QR to restock or collect cash",
    color: "bg-blue-500/15 text-blue-600 dark:text-blue-400",
  },
  "/stores": {
    description: "Browse stores & manage assigned machines",
    color: "bg-blue-500/15 text-blue-600 dark:text-blue-400",
  },
  "/stores/owners": {
    description: "Contact details for auditing & communication",
    color: "bg-violet-500/15 text-violet-600 dark:text-violet-400",
  },
  "/machines": {
    description: "View all hardware, status & balances",
    color: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  },
  "/browse": {
    description: "Explore stores & machines without a QR scan",
    color: "bg-sky-500/15 text-sky-600 dark:text-sky-400",
  },
  "/packets": {
    description: "Manage packet configurations & pricing",
    color: "bg-indigo-500/15 text-indigo-600 dark:text-indigo-400",
  },
  "/cash": {
    description: "Audit physical cash collections & discrepancies",
    color: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  },
  "/inventory-logs": {
    description: "Audit trail of inventory changes",
    color: "bg-cyan-500/15 text-cyan-600 dark:text-cyan-400",
  },
  "/history": {
    description: "Your recent scan & restock activity",
    color: "bg-teal-500/15 text-teal-600 dark:text-teal-400",
  },
  "/users": {
    description: "Roles, permissions & access control",
    color: "bg-secondary/15 text-secondary",
  },
  "/assignments": {
    description: "Assign machines to field staff",
    color: "bg-orange-500/15 text-orange-600 dark:text-orange-400",
  },
  "/audit-log": {
    description: "Sensitive actions — visible to you only",
    color: "bg-rose-500/15 text-rose-600 dark:text-rose-400",
  },
  "/profile": {
    description: "Your account details",
    color: "bg-slate-500/15 text-slate-600 dark:text-slate-400",
  },
};

export default function MobileSettingsPage() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const { data: appUsers = [] } = useUsers();
  const currentUserIsRoot =
    appUsers.find((u) => u.id === user?.id)?.isRootAdmin ?? false;

  const handleLogout = () => {
    logout();
    toast.success("Signed out of portal");
    router.push("/login");
  };

  return (
    <div className="w-full px-4 py-4 space-y-4 font-sans">
      {/* Top Header — sticky against the scrollable <main>, not the page */}
      <div className="flex items-center justify-between sticky top-0 z-20 -mx-4 px-4 pb-3 pt-[calc(0.75rem+env(safe-area-inset-top))] bg-card/95 backdrop-blur-md border-b border-border/40">
        <div className="space-y-0.5">
          <h1 className="text-xl font-black tracking-tight text-foreground">
            Settings & More
          </h1>
          <p className="text-xs text-muted-foreground">
            System configuration & team administration
          </p>
        </div>

        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/20 text-primary shadow-xs">
          <SettingsIcon className="h-5 w-5" />
        </div>
      </div>

      {/* User Profile Card */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-card to-card/60 border border-border/60 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center font-black text-base shadow-sm shadow-primary/30">
            {user?.name
              ? user.name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
              : "OP"}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-sm text-foreground">
                {user?.name || "Alex Rivera"}
              </h3>
              <span className="text-[9px] font-black uppercase tracking-wider bg-primary/20 text-foreground px-2 py-0.5 rounded-full">
                {user?.role || "ADMIN"}
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground">
              {user?.email || "admin@beenovelty.com"}
            </p>
          </div>
        </div>
      </div>

      {/* 1. Team & Operations Hub Links */}
      <div className="space-y-1.5">
        <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Operations & Fleet Hub
        </h2>

        <div className="space-y-2">
          {NAV_ITEMS.filter(
            (item) =>
              !["/dashboard", "/reports", "/settings"].includes(item.href) &&
              (!item.rootOnly || currentUserIsRoot)
          ).map((item) => {
            const Icon = item.icon;
            const meta = ITEM_META[item.href];
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center justify-between p-3.5 rounded-2xl bg-card border border-border/50 hover:bg-accent/40 active:scale-[0.98] transition-all shadow-xs"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      "h-9 w-9 rounded-xl flex items-center justify-center",
                      meta?.color ?? "bg-secondary/15 text-secondary"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <div>
                    <span className="font-bold text-xs text-foreground block">
                      {item.label}
                    </span>
                    {meta?.description && (
                      <span className="text-[11px] text-muted-foreground">
                        {meta.description}
                      </span>
                    )}
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </Link>
            );
          })}
        </div>
      </div>

      {/* 2. Action: Log Out */}
      <div className="pt-2 pb-6">
        <Button
          type="button"
          variant="outline"
          onClick={handleLogout}
          className="w-full h-12 rounded-2xl text-rose-600 dark:text-rose-400 border-rose-500/30 hover:bg-rose-500/10 font-bold text-xs gap-2 active:scale-[0.98] transition-transform shadow-xs"
        >
          <LogOut className="h-4 w-4" />
          <span>Log Out of Session</span>
        </Button>
      </div>
    </div>
  );
}
