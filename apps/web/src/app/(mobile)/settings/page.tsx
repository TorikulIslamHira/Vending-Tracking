"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/useAuthStore";
import { useTenantSettings } from "@/hooks/useTenantSettings";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import {
  Settings as SettingsIcon,
  DollarSign,
  Percent,
  Truck,
  Users,
  Coins,
  LogOut,
  ChevronRight,
} from "lucide-react";

export default function MobileSettingsPage() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const { settings, updateSettings } = useTenantSettings();

  const handleLogout = () => {
    logout();
    toast.success("Signed out of portal");
    router.push("/login");
  };

  return (
    <div className="w-full px-4 py-4 space-y-4 font-sans">
      {/* Top Header */}
      <div className="flex items-center justify-between pt-1">
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
          <Link
            href="/machines"
            className="flex items-center justify-between p-3.5 rounded-2xl bg-card border border-border/50 hover:bg-accent/40 active:scale-[0.98] transition-all shadow-xs"
          >
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-emerald-500/15 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                <Truck className="h-4 w-4" />
              </div>
              <div>
                <span className="font-bold text-xs text-foreground block">
                  Machine Fleet Master
                </span>
                <span className="text-[11px] text-muted-foreground">
                  View all hardware, status & balances
                </span>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </Link>

          <Link
            href="/packets"
            className="flex items-center justify-between p-3.5 rounded-2xl bg-card border border-border/50 hover:bg-accent/40 active:scale-[0.98] transition-all shadow-xs"
          >
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-primary/15 flex items-center justify-center text-primary">
                <Truck className="h-4 w-4" />
              </div>
              <div>
                <span className="font-bold text-xs text-foreground block">
                  Packet Master Config
                </span>
                <span className="text-[11px] text-muted-foreground">
                  Standardized refill bags & item pricing
                </span>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </Link>

          <Link
            href="/inventory-logs"
            className="flex items-center justify-between p-3.5 rounded-2xl bg-card border border-border/50 hover:bg-accent/40 active:scale-[0.98] transition-all shadow-xs"
          >
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-blue-500/15 flex items-center justify-center text-blue-600 dark:text-blue-400">
                <Coins className="h-4 w-4" />
              </div>
              <div>
                <span className="font-bold text-xs text-foreground block">
                  Inventory Restock Logs
                </span>
                <span className="text-[11px] text-muted-foreground">
                  Audit trail of refills & error reversals
                </span>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </Link>

          <Link
            href="/cash"
            className="flex items-center justify-between p-3.5 rounded-2xl bg-card border border-border/50 hover:bg-accent/40 active:scale-[0.98] transition-all shadow-xs"
          >
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-amber-500/15 flex items-center justify-center text-amber-600 dark:text-amber-400">
                <Coins className="h-4 w-4" />
              </div>
              <div>
                <span className="font-bold text-xs text-foreground block">
                  Cash Collection Ledger
                </span>
                <span className="text-[11px] text-muted-foreground">
                  Audit physical cash drops & discrepancies
                </span>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </Link>

          <Link
            href="/assignments"
            className="flex items-center justify-between p-3.5 rounded-2xl bg-card border border-border/50 hover:bg-accent/40 active:scale-[0.98] transition-all shadow-xs"
          >
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-primary/15 flex items-center justify-center text-primary">
                <Truck className="h-4 w-4" />
              </div>
              <div>
                <span className="font-bold text-xs text-foreground block">
                  Restocker Assignments
                </span>
                <span className="text-[11px] text-muted-foreground">
                  Allocate routes to field agents
                </span>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </Link>

          <Link
            href="/users"
            className="flex items-center justify-between p-3.5 rounded-2xl bg-card border border-border/50 hover:bg-accent/40 active:scale-[0.98] transition-all shadow-xs"
          >
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-secondary/15 flex items-center justify-center text-secondary">
                <Users className="h-4 w-4" />
              </div>
              <div>
                <span className="font-bold text-xs text-foreground block">
                  User Management
                </span>
                <span className="text-[11px] text-muted-foreground">
                  Roles, permissions & access control
                </span>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </Link>
        </div>
      </div>

      {/* 2. General Section (Screen 11) */}
      <div className="space-y-1.5">
        <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          General Fleet Configuration
        </h2>

        <Card className="border-border/50 bg-card shadow-xs">
          <CardContent className="p-4 space-y-3.5">
            {/* Currency Dropdown */}
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs font-semibold text-foreground">
                  Operating Currency
                </span>
              </div>
              <select
                value={settings.currency}
                onChange={(e) => {
                  updateSettings({ currency: e.target.value });
                }}
                className="h-9 rounded-xl bg-muted/50 border-border/60 text-xs font-bold px-3 text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary shadow-xs"
              >
                <option value="USD">USD ($)</option>
                <option value="BDT">BDT (৳)</option>
                <option value="EUR">EUR (€)</option>
                <option value="GBP">GBP (£)</option>
              </select>
            </div>

            {/* Default Split */}
            <div className="space-y-1.5 pt-2 border-t border-border/40">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <Percent className="h-4 w-4 text-muted-foreground" />
                  <span className="font-semibold text-foreground">
                    Default Commission Split
                  </span>
                </div>
                <span className="font-bold font-mono text-primary text-xs">
                  {settings.defaultShopCut}% Shop / {100 - settings.defaultShopCut}% Biz
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={settings.defaultShopCut}
                onChange={(e) => {
                  const cut = Number(e.target.value);
                  updateSettings({
                    defaultShopCut: cut,
                    defaultBizCut: 100 - cut,
                  });
                }}
                className="w-full accent-primary cursor-pointer"
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 3. Notifications Section (Screen 11 with Toggle Switches) */}
      <div className="space-y-1.5">
        <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Notifications & Alerts
        </h2>

        <Card className="border-border/50 bg-card shadow-xs">
          <CardContent className="p-4 space-y-3.5">
            {/* Low stock alerts */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <span className="text-xs font-semibold text-foreground block">
                  Low Stock Alerts
                </span>
                <span className="text-[11px] text-muted-foreground">
                  Notify when units drop below 20% capacity
                </span>
              </div>
              <Switch
                checked={settings.lowStockAlerts}
                onCheckedChange={(val) => {
                  updateSettings({ lowStockAlerts: val });
                }}
              />
            </div>

            {/* Cash drop alerts */}
            <div className="flex items-center justify-between pt-2 border-t border-border/40">
              <div className="space-y-0.5">
                <span className="text-xs font-semibold text-foreground block">
                  Cash Drop Collection Alerts
                </span>
                <span className="text-[11px] text-muted-foreground">
                  Immediate alerts on cash discrepancies
                </span>
              </div>
              <Switch
                checked={settings.cashDropAlerts}
                onCheckedChange={(val) => {
                  updateSettings({ cashDropAlerts: val });
                }}
              />
            </div>

            {/* Daily summary */}
            <div className="flex items-center justify-between pt-2 border-t border-border/40">
              <div className="space-y-0.5">
                <span className="text-xs font-semibold text-foreground block">
                  Daily Summary Email
                </span>
                <span className="text-[11px] text-muted-foreground">
                  End-of-day revenue and refill digest
                </span>
              </div>
              <Switch
                checked={settings.dailyReports}
                onCheckedChange={(val) => {
                  updateSettings({ dailyReports: val });
                }}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 4. Action: Log Out */}
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
