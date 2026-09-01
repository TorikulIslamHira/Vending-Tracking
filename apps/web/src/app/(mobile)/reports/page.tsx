"use client";

import React, { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  BarChart3,
  Calendar,
  Download,
  Filter,
  DollarSign,
  TrendingUp,
  Percent,
  FileSpreadsheet,
  Layers,
  MapPin,
} from "lucide-react";

import { useMachines } from "@/hooks/useMachines";

interface ReconciliationRecord {
  id: string;
  date: string;
  machineId: string;
  storeName: string;
  totalCash: number;
  shopCut: number;
  businessCut: number;
  splitRatio: string;
}

export default function ReportsPage() {
  const [fromDate, setFromDate] = useState("2026-08-01");
  const [toDate, setToDate] = useState("2026-08-26");
  const [selectedLocation, setSelectedLocation] = useState("ALL");
  const { data: machines = [], isLoading } = useMachines();

  const records: ReconciliationRecord[] = machines.map((m) => {
    const totalCash = Number(m.virtualCashBalance || 0);
    const shopCut = totalCash * 0.3;
    const businessCut = totalCash * 0.7;
    return {
      id: `rec-${m.id}`,
      date: new Date().toISOString().split("T")[0],
      machineId: m.serialNumber,
      storeName: m.location,
      totalCash,
      shopCut,
      businessCut,
      splitRatio: "30% / 70%",
    };
  });

  const totalCollected = records.reduce((acc, r) => acc + r.totalCash, 0);
  const totalShopCut = records.reduce((acc, r) => acc + r.shopCut, 0);
  const totalBizCut = records.reduce((acc, r) => acc + r.businessCut, 0);

  const handleExportCSV = () => {
    const headers = "Date,Machine ID,Store,Total Cash,Shop Cut,Business Cut,Split Ratio\n";
    const rows = records
      .map(
        (r) =>
          `${r.date},${r.machineId},"${r.storeName}",${r.totalCash},${r.shopCut},${r.businessCut},${r.splitRatio}`
      )
      .join("\n");

    const blob = new Blob([headers + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `reconciliation_report_${fromDate}_to_${toDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    toast.success("Reconciliation CSV exported successfully!");
  };

  return (
    <div className="w-full px-4 py-4 space-y-4">
      {/* Top Header */}
      <div className="flex items-center justify-between pt-1">
        <div className="space-y-0.5">
          <h1 className="text-xl font-black tracking-tight text-foreground">
            Reports & Splits
          </h1>
          <p className="text-xs text-muted-foreground">
            Financial reconciliation & automated payouts
          </p>
        </div>

        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-secondary/15 text-secondary shadow-xs">
          <BarChart3 className="h-5 w-5" />
        </div>
      </div>

      {/* Screen 9: Date Range & Location Filters */}
      <Card className="border-border/50 bg-card shadow-xs">
        <CardContent className="p-3.5 space-y-3">
          <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
            <Calendar className="h-3.5 w-3.5 text-primary" />
            <span>Audit Date Range</span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <span className="text-[10px] font-semibold text-muted-foreground">
                From
              </span>
              <Input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="h-10 rounded-xl bg-muted/40 border-border/50 text-xs px-2.5 shadow-xs"
              />
            </div>
            <div className="space-y-1">
              <span className="text-[10px] font-semibold text-muted-foreground">
                To
              </span>
              <Input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="h-10 rounded-xl bg-muted/40 border-border/50 text-xs px-2.5 shadow-xs"
              />
            </div>
          </div>

          {/* Location Filter Dropdown */}
          <div className="space-y-1">
            <span className="text-[10px] font-semibold text-muted-foreground">
              Filter Location / Venue
            </span>
            <select
              value={selectedLocation}
              onChange={(e) => setSelectedLocation(e.target.value)}
              className="w-full h-10 rounded-xl bg-muted/40 border-border/50 text-xs font-medium px-3 text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary shadow-xs"
            >
              <option value="ALL">All Fleet Locations</option>
              <option value="loc-ny-01">Grand Central Terminal</option>
              <option value="loc-ny-02">Times Square Concourse</option>
              <option value="loc-nj-01">Hoboken Ferry Terminal</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Aggregate Financial Summary Banner */}
      <div className="p-4 rounded-2xl bg-gradient-to-br from-primary/20 via-accent/25 to-card border border-primary/40 space-y-2.5 shadow-xs">
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold text-foreground">
            Total Reconciled Cash
          </span>
          <span className="text-xl font-black font-mono text-foreground">
            ${totalCollected.toFixed(2)}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2 pt-1 border-t border-border/40 text-xs">
          <div className="space-y-0.5">
            <span className="text-[10px] font-bold text-secondary flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-secondary" />
              <span>Shop Payout</span>
            </span>
            <div className="font-mono font-bold text-sm text-foreground">
              ${totalShopCut.toFixed(2)}
            </div>
          </div>

          <div className="space-y-0.5">
            <span className="text-[10px] font-bold text-primary flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              <span>Business Retained</span>
            </span>
            <div className="font-mono font-bold text-sm text-foreground">
              ${totalBizCut.toFixed(2)}
            </div>
          </div>
        </div>
      </div>

      {/* Reconciliation Records Table / Ledger */}
      <div className="space-y-2">
        <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Machine Payout Breakdown ({records.length})
        </h2>

        <div className="space-y-2">
          {records.length > 0 ? (
            records.map((rec) => (
              <Card key={rec.id} className="border-border/50 bg-card shadow-xs">
                <CardContent className="p-3.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-xs text-foreground">
                        {rec.machineId}
                      </span>
                      <span className="text-[10px] font-semibold text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-md">
                        {rec.splitRatio}
                      </span>
                    </div>
                    <span className="text-[10px] font-medium text-muted-foreground font-mono">
                      {rec.date}
                    </span>
                  </div>

                  <p className="text-[11px] text-muted-foreground truncate">
                    {rec.storeName}
                  </p>

                  {/* 3-Column Split Visual */}
                  <div className="grid grid-cols-3 gap-2 pt-1 border-t border-border/40 text-center text-xs">
                    <div className="bg-muted/30 p-1.5 rounded-xl">
                      <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground block">
                        Cash
                      </span>
                      <span className="font-mono font-bold text-foreground">
                        ${rec.totalCash.toFixed(2)}
                      </span>
                    </div>
                    <div className="bg-secondary/10 p-1.5 rounded-xl">
                      <span className="text-[9px] font-bold uppercase tracking-wider text-secondary block">
                        Shop
                      </span>
                      <span className="font-mono font-bold text-secondary">
                        ${rec.shopCut.toFixed(2)}
                      </span>
                    </div>
                    <div className="bg-primary/15 p-1.5 rounded-xl">
                      <span className="text-[9px] font-bold uppercase tracking-wider text-foreground block">
                        Biz
                      </span>
                      <span className="font-mono font-bold text-foreground">
                        ${rec.businessCut.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card className="border-border/50 bg-card shadow-xs">
              <CardContent className="p-8 text-center space-y-2">
                <BarChart3 className="h-8 w-8 text-muted-foreground/40 mx-auto" />
                <h3 className="text-xs font-bold text-foreground">
                  No Reconciliation Logs Yet
                </h3>
                <p className="text-[11px] text-muted-foreground max-w-xs mx-auto">
                  Register vending units and perform cash collections to view revenue splits.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Screen 9 Action: Full-width Dark EXPORT CSV Button */}
      <Button
        onClick={handleExportCSV}
        className="w-full h-13 rounded-2xl bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 font-bold text-sm shadow-md active:scale-[0.97] transition-transform flex items-center justify-center gap-2 mt-2"
      >
        <FileSpreadsheet className="h-4 w-4 text-primary" />
        <span>EXPORT RECONCILIATION CSV</span>
      </Button>
    </div>
  );
}
