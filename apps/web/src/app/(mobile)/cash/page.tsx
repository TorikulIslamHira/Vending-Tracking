"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { Card, CardContent } from "@/components/ui/card";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
  DrawerClose,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ArrowLeft,
  Coins,
  Search,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Loader2,
  DollarSign,
  User,
  Boxes,
  MapPin,
  ChevronRight,
  TrendingDown,
  ShieldCheck,
} from "lucide-react";

interface PopulatedCashLog {
  id: string;
  tenantId: string;
  machineId: string;
  agentId: string;
  collectedAmount: number;
  expectedAmount: number;
  discrepancy: number;
  createdAt: string;
  machine?: {
    id: string;
    serialNumber: string;
    location: string;
  };
  agent?: {
    id: string;
    name: string;
    email: string;
  };
}

const fallbackCashLogs: PopulatedCashLog[] = [
  {
    id: "cash-1",
    tenantId: "tenant-demo",
    machineId: "m-1",
    agentId: "u-1",
    collectedAmount: 420.0,
    expectedAmount: 420.0,
    discrepancy: 0.0,
    createdAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    machine: {
      id: "m-1",
      serialNumber: "VM-NY-010",
      location: "Grand Central Terminal - Gate 4",
    },
    agent: {
      id: "u-1",
      name: "Sarah Jenkins",
      email: "sarah@vending.io",
    },
  },
  {
    id: "cash-2",
    tenantId: "tenant-demo",
    machineId: "m-2",
    agentId: "u-2",
    collectedAmount: 850.0,
    expectedAmount: 890.5,
    discrepancy: 40.5,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString(),
    machine: {
      id: "m-2",
      serialNumber: "VM-NY-014",
      location: "Times Square - Subway Concourse",
    },
    agent: {
      id: "u-2",
      name: "Marcus Vance",
      email: "marcus@vending.io",
    },
  },
  {
    id: "cash-3",
    tenantId: "tenant-demo",
    machineId: "m-3",
    agentId: "u-1",
    collectedAmount: 210.0,
    expectedAmount: 210.0,
    discrepancy: 0.0,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    machine: {
      id: "m-3",
      serialNumber: "VM-NJ-003",
      location: "Hoboken Terminal - Waiting Hall",
    },
    agent: {
      id: "u-1",
      name: "Sarah Jenkins",
      email: "sarah@vending.io",
    },
  },
];

export default function MobileCashTrackingPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLog, setSelectedLog] = useState<PopulatedCashLog | null>(null);

  const { data: cashLogs = fallbackCashLogs, isLoading } = useQuery<
    PopulatedCashLog[]
  >({
    queryKey: ["cash-logs"],
    queryFn: async () => {
      try {
        const response = await apiClient.get("/inventory/cash-logs");
        return response.data.data;
      } catch {
        return fallbackCashLogs;
      }
    },
  });

  const filteredLogs = cashLogs.filter((log) => {
    const q = searchQuery.toLowerCase();
    return (
      log.machine?.serialNumber?.toLowerCase().includes(q) ||
      log.machine?.location?.toLowerCase().includes(q) ||
      log.agent?.name?.toLowerCase().includes(q)
    );
  });

  // Calculate Aggregates
  const totalCollected = cashLogs.reduce(
    (sum, l) => sum + Number(l.collectedAmount),
    0
  );
  const totalExpected = cashLogs.reduce(
    (sum, l) => sum + Number(l.expectedAmount),
    0
  );
  const totalDiscrepancy = cashLogs.reduce(
    (sum, l) => sum + Number(l.discrepancy),
    0
  );

  return (
    <div className="w-full px-4 py-4 space-y-4 font-sans">
      {/* 1. Top Navigation Bar with Back Button */}
      <div className="flex items-center justify-between pt-1">
        <button
          onClick={() => router.push("/settings")}
          className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground hover:text-foreground active:scale-95 transition-transform"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Settings & More</span>
        </button>

        <div className="flex items-center gap-1 text-[11px] font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-full">
          <Coins className="h-3.5 w-3.5" />
          <span>Financial Audit</span>
        </div>
      </div>

      {/* 2. Header Title */}
      <div className="p-4 rounded-2xl bg-muted/40 border border-border/50 space-y-1 shadow-xs">
        <h1 className="text-xl font-black tracking-tight text-foreground">
          Cash Tracking & Drops
        </h1>
        <p className="text-xs text-muted-foreground">
          Physical coin collections, expected vs. collected cash & discrepancy alerts.
        </p>
      </div>

      {/* 3. Mobile KPI Metric Cards */}
      <div className="space-y-2.5">
        <Card className="border-border/50 bg-gradient-to-r from-card to-card/60 shadow-xs">
          <CardContent className="p-3.5 flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Total Cash Collected
              </span>
              <div className="text-2xl font-black font-mono text-foreground">
                ${totalCollected.toFixed(2)}
              </div>
              <span className="text-[10px] text-muted-foreground">
                {cashLogs.length} total agent collections
              </span>
            </div>
            <div className="h-10 w-10 rounded-2xl bg-emerald-500/15 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shadow-xs shrink-0">
              <DollarSign className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-2 gap-2.5">
          <Card className="border-border/50 bg-card shadow-xs">
            <CardContent className="p-3 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                Expected Total
              </span>
              <div className="text-lg font-black font-mono text-foreground">
                ${totalExpected.toFixed(2)}
              </div>
              <span className="text-[10px] text-muted-foreground block truncate">
                Dispense telemetry
              </span>
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-card shadow-xs">
            <CardContent className="p-3 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                Discrepancy
              </span>
              <div
                className={`text-lg font-black font-mono ${
                  totalDiscrepancy !== 0
                    ? "text-rose-600 dark:text-rose-400"
                    : "text-emerald-600 dark:text-emerald-400"
                }`}
              >
                ${totalDiscrepancy.toFixed(2)}
              </div>
              <span className="text-[10px] text-muted-foreground block truncate">
                {totalDiscrepancy !== 0 ? "Shortfall flagged" : "Zero shortfall"}
              </span>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* 4. Search Filter */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by serial, location, or agent..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 h-11 rounded-2xl bg-card border-border/50 text-xs shadow-xs"
        />
      </div>

      {/* 5. Mobile Ledger Cards (Replacing Wide Table) */}
      <div className="space-y-3 pt-1">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Collection History ({filteredLogs.length})
          </h2>
          <span className="text-[11px] text-muted-foreground">
            Tap for breakdown
          </span>
        </div>

        {isLoading ? (
          <div className="flex h-32 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="text-center py-12 space-y-2 bg-card rounded-2xl border border-border/50 p-6">
            <Coins className="h-8 w-8 text-muted-foreground mx-auto" />
            <p className="text-sm font-bold text-foreground">No cash logs found</p>
            <p className="text-xs text-muted-foreground">Try adjusting your search query.</p>
          </div>
        ) : (
          filteredLogs.map((log) => {
            const hasDiscrepancy = Number(log.discrepancy) !== 0;

            return (
              <Card
                key={log.id}
                onClick={() => setSelectedLog(log)}
                className={`border-border/50 shadow-xs hover:border-border/80 active:scale-[0.98] transition-all cursor-pointer overflow-hidden ${
                  hasDiscrepancy
                    ? "bg-rose-500/5 border-rose-500/30"
                    : "bg-card"
                }`}
              >
                <CardContent className="p-4 space-y-3">
                  {/* Top Row: Timestamp & Status Badge */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 font-mono text-[11px] text-muted-foreground">
                      <Clock className="h-3.5 w-3.5 text-muted-foreground/70" />
                      <span>
                        {new Date(log.createdAt).toLocaleString(undefined, {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>

                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                        hasDiscrepancy
                          ? "bg-rose-500/15 text-rose-600 dark:text-rose-400"
                          : "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                      }`}
                    >
                      {hasDiscrepancy ? (
                        <AlertTriangle className="h-3 w-3" />
                      ) : (
                        <CheckCircle2 className="h-3 w-3" />
                      )}
                      <span>{hasDiscrepancy ? "Discrepancy" : "Matched"}</span>
                    </span>
                  </div>

                  {/* Middle Row: Machine Details */}
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-1.5">
                      <Boxes className="h-3.5 w-3.5 text-primary shrink-0" />
                      <span className="font-mono font-bold text-xs text-foreground">
                        {log.machine?.serialNumber || log.machineId}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground truncate">
                      {log.machine?.location}
                    </p>
                  </div>

                  {/* Financial Breakdown Grid */}
                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-border/40 text-xs text-center">
                    <div className="bg-muted/30 p-2 rounded-xl">
                      <span className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground block">
                        Expected
                      </span>
                      <span className="font-mono font-bold text-muted-foreground">
                        ${Number(log.expectedAmount).toFixed(2)}
                      </span>
                    </div>

                    <div className="bg-muted/30 p-2 rounded-xl">
                      <span className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground block">
                        Collected
                      </span>
                      <span className="font-mono font-bold text-foreground">
                        ${Number(log.collectedAmount).toFixed(2)}
                      </span>
                    </div>

                    <div
                      className={`p-2 rounded-xl ${
                        hasDiscrepancy
                          ? "bg-rose-500/15 text-rose-600 dark:text-rose-400"
                          : "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                      }`}
                    >
                      <span className="text-[9px] font-bold uppercase tracking-wider block">
                        Diff
                      </span>
                      <span className="font-mono font-black">
                        {hasDiscrepancy
                          ? `-$${Math.abs(Number(log.discrepancy)).toFixed(2)}`
                          : "$0.00"}
                      </span>
                    </div>
                  </div>

                  {/* Agent row */}
                  <div className="flex items-center justify-between text-[11px] pt-0.5 text-muted-foreground">
                    <div className="flex items-center gap-1.5 truncate">
                      <User className="h-3 w-3 text-muted-foreground/70 shrink-0" />
                      <span className="font-medium text-foreground truncate">
                        {log.agent?.name || "Field Agent"}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 text-primary font-semibold shrink-0">
                      <span>Audit View</span>
                      <ChevronRight className="h-3.5 w-3.5" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* 6. Vaul Bottom Drawer: Full Collection Ledger Details */}
      <Drawer
        open={!!selectedLog}
        onOpenChange={(open) => !open && setSelectedLog(null)}
      >
        <DrawerContent className="max-w-md mx-auto rounded-t-[28px] p-6 space-y-4 max-h-[85vh] flex flex-col">
          <DrawerHeader className="p-0 text-left shrink-0">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-xl bg-amber-500/20 flex items-center justify-center text-amber-600">
                <Coins className="h-4 w-4" />
              </div>
              <DrawerTitle className="text-lg font-bold text-foreground">
                Cash Drop Audit Record
              </DrawerTitle>
            </div>
            <DrawerDescription className="text-xs text-muted-foreground">
              Comprehensive telemetry verification and agent collection details.
            </DrawerDescription>
          </DrawerHeader>

          {selectedLog && (
            <div className="space-y-3 overflow-y-auto flex-1 pr-1 text-xs">
              <div className="p-4 rounded-2xl bg-muted/40 border border-border/50 space-y-2.5">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Audit Record ID</span>
                  <span className="font-mono font-bold text-foreground">
                    {selectedLog.id}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Collection Date</span>
                  <span className="font-mono font-medium text-foreground">
                    {new Date(selectedLog.createdAt).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Machine</span>
                  <span className="font-mono font-bold text-primary">
                    {selectedLog.machine?.serialNumber || selectedLog.machineId}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Location</span>
                  <span className="font-medium text-foreground text-right">
                    {selectedLog.machine?.location}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Field Agent</span>
                  <span className="font-bold text-foreground">
                    {selectedLog.agent?.name || "Field Agent"} ({selectedLog.agent?.email})
                  </span>
                </div>
              </div>

              {/* Cash Numbers Card */}
              <div className="p-4 rounded-2xl bg-card border border-border/50 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Expected Dispense Cash:</span>
                  <span className="font-mono font-bold text-foreground">
                    ${Number(selectedLog.expectedAmount).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Actual Cash Collected:</span>
                  <span className="font-mono font-black text-sm text-foreground">
                    ${Number(selectedLog.collectedAmount).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-border/40">
                  <span className="text-muted-foreground font-semibold">Audit Discrepancy:</span>
                  <span
                    className={`font-mono font-black text-sm ${
                      Number(selectedLog.discrepancy) !== 0
                        ? "text-rose-600 dark:text-rose-400"
                        : "text-emerald-600 dark:text-emerald-400"
                    }`}
                  >
                    {Number(selectedLog.discrepancy) !== 0
                      ? `-$${Math.abs(Number(selectedLog.discrepancy)).toFixed(2)} (Shortfall)`
                      : "$0.00 (Matched)"}
                  </span>
                </div>
              </div>

              <DrawerFooter className="p-0 pt-2">
                <DrawerClose asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full h-11 rounded-2xl text-xs font-semibold"
                  >
                    Close
                  </Button>
                </DrawerClose>
              </DrawerFooter>
            </div>
          )}
        </DrawerContent>
      </Drawer>
    </div>
  );
}
