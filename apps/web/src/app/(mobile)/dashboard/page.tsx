"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/useAuthStore";
import { useDashboardMetrics } from "@/hooks/useDashboardMetrics";
import { useCurrency } from "@/hooks/useTenantSettings";
import defaultThemeConfig from "@/config/theme";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Boxes,
  Coins,
  AlertTriangle,
  ChevronRight,
  Plus,
  MapPin,
  TrendingUp,
  QrCode,
  RotateCw,
} from "lucide-react";

export default function MobileDashboardPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { data: metrics, isLoading, isRefetching, refetch } = useDashboardMetrics();
  const { format: formatMoney } = useCurrency();

  // Metrics Data Calculations — exactly the 3 streamlined dashboard metrics.
  const totalMachines = metrics?.totalMachines ?? 0;
  const totalCollection = metrics?.totalCollection ?? 0;
  const activeMachinesCount = metrics?.activeMachinesCount ?? 0;
  const attentionNeededCount = metrics?.attentionNeededCount ?? 0;

  // True empty state when fleet is empty
  const isFleetEmpty = !isLoading && totalMachines === 0;

  return (
    <div className="w-full px-4 py-4 space-y-4 font-sans">
      {/* Top Bar Header — sticky against the scrollable <main>, not the page */}
      <div className="w-full flex items-center justify-between sticky top-0 z-20 -mx-4 px-4 pb-3 pt-[calc(0.75rem+env(safe-area-inset-top))] bg-card/95 backdrop-blur-md border-b border-border/40">
        <div className="flex items-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl overflow-hidden shadow-sm shadow-primary/30 shrink-0">
            <Image src="/logo.png" alt="Bee Novelty Vending" width={40} height={40} className="h-full w-full object-cover" priority />
          </div>
          <div>
            <h1 className="text-sm font-black tracking-tight text-foreground">
              {defaultThemeConfig.appName}
            </h1>
            <p className="text-[11px] text-muted-foreground font-medium">
              Hello, {user?.name ? user.name.split(" ")[0] : "Super Admin"} 👋
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Refresh Action */}
          <Button
            variant="outline"
            size="icon"
            onClick={() => {
              refetch();
              toast.success("Refreshed telemetry data");
            }}
            className="h-10 w-10 rounded-2xl border-border/60 shadow-xs active:scale-95 shrink-0"
            title="Refresh Live Metrics"
          >
            <RotateCw
              className={`h-4 w-4 text-muted-foreground ${
                isRefetching ? "animate-spin text-primary" : ""
              }`}
            />
          </Button>

          {/* QR Scanner Trigger */}
          <Button
            variant="outline"
            size="icon"
            onClick={() => router.push("/scan")}
            className="h-10 w-10 rounded-2xl border-border/60 shadow-xs active:scale-95 shrink-0"
            title="Switch to Field Agent Mode (Scan QR)"
          >
            <QrCode className="h-4 w-4 text-primary" />
          </Button>
        </div>
      </div>

      {/* SCREEN 13: EMPTY STATE (FIRST TIME) */}
      {isFleetEmpty ? (
        <div className="w-full py-16 px-2 text-center space-y-4">
          <div className="h-20 w-20 rounded-full bg-primary/15 flex items-center justify-center mx-auto text-primary shadow-inner">
            <MapPin className="h-9 w-9" />
          </div>
          <div className="space-y-1">
            <h2 className="text-base font-bold text-foreground">
              No Stores Configured Yet
            </h2>
            <p className="text-xs text-muted-foreground max-w-xs mx-auto">
              Get started by adding your first store and linking vending units.
            </p>
          </div>
          <Button
            onClick={() => router.push("/stores")}
            className="h-12 px-6 rounded-2xl font-bold shadow-md shadow-primary/20 gap-2 active:scale-[0.97]"
          >
            <Plus className="h-4 w-4" />
            <span>+ Add Your First Store</span>
          </Button>
        </div>
      ) : (
        /* SCREEN 2: MAIN DASHBOARD VIEW — exactly 3 metric cards */
        <div className="w-full space-y-2.5">
          {/* Metric Card 1: Total Collection */}
          <Card className="w-full border-border/50 bg-gradient-to-r from-card to-card/60 shadow-xs">
            <CardContent className="p-3.5 flex items-center justify-between">
              <div className="space-y-0.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Total Collection
                </span>
                {isLoading ? (
                  <div className="h-7 w-32 bg-muted/60 rounded-lg animate-pulse my-1" />
                ) : (
                  <div className="text-2xl font-black text-foreground font-mono">
                    {formatMoney(totalCollection)}
                  </div>
                )}
                <div className="flex items-center gap-1 text-[10px] text-amber-600 dark:text-amber-400 font-semibold">
                  <span>All-time cash collected</span>
                </div>
              </div>
              <div className="h-10 w-10 rounded-2xl bg-amber-500/15 flex items-center justify-center text-amber-600 dark:text-amber-400 shadow-xs shrink-0">
                <Coins className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>

          {/* Metric Card 2: Active Machines */}
          <Card className="w-full border-border/50 bg-gradient-to-r from-card to-card/60 shadow-xs">
            <CardContent className="p-3.5 flex items-center justify-between">
              <div className="space-y-0.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Active Machines
                </span>
                {isLoading ? (
                  <div className="h-7 w-24 bg-muted/60 rounded-lg animate-pulse my-1" />
                ) : (
                  <div className="text-2xl font-black text-foreground font-mono">
                    {activeMachinesCount}{" "}
                    <span className="text-xs font-normal text-muted-foreground font-sans">
                      / {totalMachines}
                    </span>
                  </div>
                )}
                <div className="flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                  <TrendingUp className="h-3 w-3" />
                  <span>Online & not flagged</span>
                </div>
              </div>
              <div className="h-10 w-10 rounded-2xl bg-primary/15 flex items-center justify-center text-primary shadow-xs shrink-0">
                <Boxes className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>

          {/* Metric Card 3: Attention Needed */}
          <Link href="/browse?flagged=true" className="block">
            <Card className="w-full border-border/50 bg-gradient-to-r from-card to-card/60 shadow-xs hover:border-rose-500/40 active:scale-[0.99] transition-all">
              <CardContent className="p-3.5 flex items-center justify-between">
                <div className="space-y-0.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Attention Needed
                  </span>
                  {isLoading ? (
                    <div className="h-7 w-16 bg-muted/60 rounded-lg animate-pulse my-1" />
                  ) : (
                    <div className="text-2xl font-black text-foreground font-mono">
                      {attentionNeededCount}
                    </div>
                  )}
                  <div className="flex items-center gap-1 text-[10px] text-rose-600 dark:text-rose-400 font-semibold">
                    <AlertTriangle className="h-3 w-3" />
                    <span>Flagged via cash-collect reports</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <div className="h-10 w-10 rounded-2xl bg-rose-500/15 flex items-center justify-center text-rose-600 dark:text-rose-400 shadow-xs">
                    <AlertTriangle className="h-5 w-5" />
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>
      )}
    </div>
  );
}
