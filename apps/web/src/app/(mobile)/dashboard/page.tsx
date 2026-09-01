"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/useAuthStore";
import { useDashboardMetrics, AttentionMachineItem } from "@/hooks/useDashboardMetrics";
import defaultThemeConfig from "@/config/theme";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Sparkles,
  Boxes,
  Layers,
  Coins,
  AlertTriangle,
  ChevronRight,
  Plus,
  Check,
  MapPin,
  TrendingUp,
  Percent,
  CheckCircle2,
  QrCode,
  RotateCw,
} from "lucide-react";

export default function MobileDashboardPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { data: metrics, isLoading, isRefetching, refetch } = useDashboardMetrics();

  const [selectedMachineIds, setSelectedMachineIds] = useState<string[]>([]);

  const attentionList = metrics?.attentionMachines || [];

  const handleToggleSelect = (id: string) => {
    setSelectedMachineIds((prev) =>
      prev.includes(id) ? prev.filter((mId) => mId !== id) : [...prev, id]
    );
  };

  const selectedCount = selectedMachineIds.length;

  const handleBatchAction = () => {
    if (selectedCount === 0) return;
    toast.success(
      `Dispatched restock route for ${selectedCount} flagged machine${
        selectedCount > 1 ? "s" : ""
      }!`
    );
    setSelectedMachineIds([]);
  };

  // Metrics Data Calculations
  const totalMachines = metrics?.totalMachines ?? 0;
  const totalRestockedUnits = metrics?.totalRestocked ?? 0;
  const totalVirtualCash = metrics?.totalVirtualCash ?? 0;
  const shopCutPercent = metrics?.shopCutPercent ?? 30;
  const businessCutPercent = metrics?.businessCutPercent ?? 70;
  const shopCutAmount = (totalVirtualCash * (shopCutPercent / 100)).toFixed(2);
  const businessCutAmount = (
    totalVirtualCash *
    (businessCutPercent / 100)
  ).toFixed(2);
  const missedVisitsCount = metrics?.missedVisitsCount ?? 0;

  // True empty state when fleet is empty
  const isFleetEmpty = !isLoading && totalMachines === 0;

  return (
    <div className="w-full px-4 py-4 space-y-4 font-sans">
      {/* Top Bar Header */}
      <div className="w-full flex items-center justify-between pt-1">
        <div className="flex items-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm shadow-primary/30">
            <Sparkles className="h-5 w-5 text-foreground" />
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
            title="Scan QR Code"
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
              No Locations Configured Yet
            </h2>
            <p className="text-xs text-muted-foreground max-w-xs mx-auto">
              Get started by adding your first physical venue location and linking vending units.
            </p>
          </div>
          <Button
            onClick={() => router.push("/locations")}
            className="h-12 px-6 rounded-2xl font-bold shadow-md shadow-primary/20 gap-2 active:scale-[0.97]"
          >
            <Plus className="h-4 w-4" />
            <span>+ Add Your First Location</span>
          </Button>
        </div>
      ) : (
        /* SCREEN 2: MAIN DASHBOARD VIEW */
        <div className="w-full space-y-3.5">
          {/* 1. Stacked Metric Cards (Vertical Stack for Mobile Viewports) */}
          <div className="flex flex-col gap-2.5 w-full">
            {/* Metric Card 1: Total Machines */}
            <Card className="w-full border-border/50 bg-gradient-to-r from-card to-card/60 shadow-xs">
              <CardContent className="p-3.5 flex items-center justify-between">
                <div className="space-y-0.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Total Machines
                  </span>
                  {isLoading ? (
                    <div className="h-7 w-24 bg-muted/60 rounded-lg animate-pulse my-1" />
                  ) : (
                    <div className="text-2xl font-black text-foreground font-mono">
                      {totalMachines}{" "}
                      <span className="text-xs font-normal text-muted-foreground font-sans">
                        Units
                      </span>
                    </div>
                  )}
                  <div className="flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                    <TrendingUp className="h-3 w-3" />
                    <span>100% Online & Active</span>
                  </div>
                </div>
                <div className="h-10 w-10 rounded-2xl bg-primary/15 flex items-center justify-center text-primary shadow-xs shrink-0">
                  <Boxes className="h-5 w-5" />
                </div>
              </CardContent>
            </Card>

            {/* Metric Card 2: Restocked Inventory */}
            <Card className="w-full border-border/50 bg-gradient-to-r from-card to-card/60 shadow-xs">
              <CardContent className="p-3.5 flex items-center justify-between">
                <div className="space-y-0.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Inventory Restocked
                  </span>
                  {isLoading ? (
                    <div className="h-7 w-28 bg-muted/60 rounded-lg animate-pulse my-1" />
                  ) : (
                    <div className="text-2xl font-black text-foreground font-mono">
                      {totalRestockedUnits.toLocaleString()}{" "}
                      <span className="text-xs font-normal text-muted-foreground font-sans">
                        pcs
                      </span>
                    </div>
                  )}
                  <div className="flex items-center gap-1 text-[10px] text-blue-600 dark:text-blue-400 font-semibold">
                    <span>Active Telemetry Logs</span>
                  </div>
                </div>
                <div className="h-10 w-10 rounded-2xl bg-blue-500/15 flex items-center justify-center text-blue-600 dark:text-blue-400 shadow-xs shrink-0">
                  <Layers className="h-5 w-5" />
                </div>
              </CardContent>
            </Card>

            {/* Metric Card 3: Virtual Cash */}
            <Card className="w-full border-border/50 bg-gradient-to-r from-card to-card/60 shadow-xs">
              <CardContent className="p-3.5 flex items-center justify-between">
                <div className="space-y-0.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Virtual Cash Balance
                  </span>
                  {isLoading ? (
                    <div className="h-7 w-32 bg-muted/60 rounded-lg animate-pulse my-1" />
                  ) : (
                    <div className="text-2xl font-black text-foreground font-mono">
                      ${totalVirtualCash.toLocaleString()}
                    </div>
                  )}
                  <div className="flex items-center gap-1 text-[10px] text-amber-600 dark:text-amber-400 font-semibold">
                    <span>Ready for agent collection</span>
                  </div>
                </div>
                <div className="h-10 w-10 rounded-2xl bg-amber-500/15 flex items-center justify-center text-amber-600 dark:text-amber-400 shadow-xs shrink-0">
                  <Coins className="h-5 w-5" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 2. Custom Progress Bar: Shop Cut vs Business Cut */}
          <Card className="w-full border-border/50 bg-card shadow-xs">
            <CardContent className="p-3.5 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 font-bold text-foreground">
                  <Percent className="h-3.5 w-3.5 text-primary" />
                  <span>Revenue Split Allocation</span>
                </div>
                <span className="text-[10px] font-bold text-muted-foreground">
                  {shopCutPercent}% Shop / {businessCutPercent}% Business
                </span>
              </div>

              {/* Progress Bar Track */}
              <div className="h-3 w-full bg-slate-100 dark:bg-zinc-800 rounded-full overflow-hidden flex p-0.5 shadow-inner">
                {/* Shop Cut (Sky Blue) */}
                <div
                  className="h-full bg-secondary rounded-l-full transition-all duration-500 ease-out"
                  style={{ width: `${shopCutPercent}%` }}
                />
                {/* Business Cut (Vibrant Yellow) */}
                <div
                  className="h-full bg-primary rounded-r-full transition-all duration-500 ease-out"
                  style={{ width: `${businessCutPercent}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-[11px] pt-0.5">
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-secondary" />
                  <span className="text-muted-foreground">
                    Shop:{" "}
                    <strong className="text-foreground font-mono">
                      ${shopCutAmount}
                    </strong>
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-primary" />
                  <span className="text-muted-foreground">
                    Business:{" "}
                    <strong className="text-foreground font-mono">
                      ${businessCutAmount}
                    </strong>
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 3. Missed Visits Alert Banner */}
          <Link
            href="/inventory-logs"
            className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-800 dark:text-amber-300 active:scale-[0.98] transition-transform duration-150 shadow-xs"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="h-8 w-8 rounded-xl bg-amber-500/20 flex items-center justify-center text-amber-700 dark:text-amber-300 shrink-0">
                <AlertTriangle className="h-4 w-4" />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="font-bold text-foreground truncate">
                  {missedVisitsCount} Missed Visits Flagged
                </span>
                <span className="text-[11px] text-muted-foreground truncate">
                  Scheduled venue maintenance required
                </span>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 ml-2" />
          </Link>

          {/* 4. Checklist: Machines Needing Attention */}
          <div className="w-full space-y-2 pt-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <h2 className="text-xs font-bold uppercase tracking-wider text-foreground">
                  Machines Needing Attention
                </h2>
                <span className="rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 text-[10px] font-black px-2 py-0.5">
                  {attentionList.length}
                </span>
              </div>

              {selectedCount > 0 && (
                <button
                  onClick={handleBatchAction}
                  className="text-[11px] font-bold text-primary hover:underline flex items-center gap-1"
                >
                  <CheckCircle2 className="h-3 w-3" />
                  <span>Dispatch {selectedCount}</span>
                </button>
              )}
            </div>

            {/* Checklist items */}
            <div className="w-full space-y-2">
              {attentionList.map((m) => {
                const isSelected = selectedMachineIds.includes(m.id);
                const isLow = m.issue === "LOW_STOCK";
                const isOffline = m.issue === "OFFLINE";

                return (
                  <div
                    key={m.id}
                    onClick={() => handleToggleSelect(m.id)}
                    className={`w-full flex items-center gap-3 p-3.5 rounded-2xl border transition-all duration-150 cursor-pointer select-none active:scale-[0.98] ${
                      isSelected
                        ? "bg-primary/10 border-primary/50 shadow-xs"
                        : "bg-card border-border/50 hover:border-border/80 shadow-xs"
                    }`}
                  >
                    {/* Custom Animated Checkbox */}
                    <div
                      className={`h-6 w-6 rounded-lg flex items-center justify-center shrink-0 transition-[background-color,border-color,transform] duration-150 ${
                        isSelected
                          ? "bg-primary text-foreground scale-105 shadow-xs"
                          : "border border-muted-foreground/30 bg-muted/30"
                      }`}
                    >
                      {isSelected && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                    </div>

                    {/* Machine Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-bold text-xs font-mono text-foreground truncate">
                          {m.serialNumber}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                            isLow
                              ? "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                              : isOffline
                              ? "bg-zinc-500/10 text-zinc-600 dark:text-zinc-400"
                              : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                          }`}
                        >
                          {isLow
                            ? `${m.itemsRemaining} pcs left`
                            : isOffline
                            ? "Offline"
                            : "Coin Box Full"}
                        </span>
                      </div>
                      <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                        {m.location} • {m.storeName}
                      </p>
                    </div>

                    <Link
                      href={`/machine/${m.serialNumber}`}
                      onClick={(e) => e.stopPropagation()}
                      className="h-8 w-8 rounded-xl bg-muted/60 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors shrink-0"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Link>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
