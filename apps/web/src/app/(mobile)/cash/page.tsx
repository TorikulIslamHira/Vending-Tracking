"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { useCurrency } from "@/hooks/useTenantSettings";
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
  Clock,
  Loader2,
  DollarSign,
  User,
  Boxes,
  MapPin,
  ChevronRight,
  TrendingDown,
} from "lucide-react";

interface PopulatedCashLog {
  id: string;
  tenantId: string;
  machineId: string;
  agentId: string;
  collectedAmount: number;
  expectedAmount: number;
  discrepancy: number;
  isShortage?: boolean;
  stockCleared?: boolean;
  isPartial?: boolean;
  remarks?: string | null;
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
  const { format: formatMoney } = useCurrency();

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

  return (
    <div className="w-full px-4 py-4 space-y-4 font-sans">
      {/* 1. Top Navigation Bar with Back Button — sticky against <main> */}
      <div className="flex items-center justify-between sticky top-0 z-20 -mx-4 px-4 pb-3 pt-[calc(0.75rem+env(safe-area-inset-top))] bg-card/95 backdrop-blur-md border-b border-border/40">
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
          Physical coin collections logged by field agents.
        </p>
      </div>

      {/* 3. Mobile KPI Metric Card */}
      <Card className="border-border/50 bg-gradient-to-r from-card to-card/60 shadow-xs">
        <CardContent className="p-4 flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Total Cash Collected
            </span>
            <div className="text-3xl font-black font-mono text-foreground">
              {formatMoney(totalCollected)}
            </div>
            <span className="text-[10px] text-muted-foreground">
              {cashLogs.length} total agent collections
            </span>
          </div>
          <div className="h-12 w-12 rounded-2xl bg-emerald-500/15 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shadow-xs shrink-0">
            <DollarSign className="h-6 w-6" />
          </div>
        </CardContent>
      </Card>

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
          filteredLogs.map((log) => (
            <Card
              key={log.id}
              onClick={() => setSelectedLog(log)}
              className="border-border/50 bg-card shadow-xs hover:border-border/80 active:scale-[0.98] transition-all cursor-pointer overflow-hidden"
            >
              <CardContent className="p-4 space-y-3">
                {/* Top Row: Timestamp & Amount */}
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
                  <span className="font-mono font-black text-base text-foreground">
                    {formatMoney(Number(log.collectedAmount))}
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

                {log.remarks && (
                  <p className="text-[10px] text-foreground/80 italic bg-muted/40 p-1.5 rounded-lg truncate">
                    &ldquo;{log.remarks}&rdquo;
                  </p>
                )}

                {/* Agent row */}
                <div className="flex items-center justify-between text-[11px] pt-0.5 text-muted-foreground">
                  <div className="flex items-center gap-1.5 truncate">
                    <User className="h-3 w-3 text-muted-foreground/70 shrink-0" />
                    <span className="font-medium text-foreground truncate">
                      {log.agent?.name || "Field Agent"}
                    </span>
                  </div>

                  <div className="flex items-center gap-1 text-primary font-semibold shrink-0">
                    <span>View</span>
                    <ChevronRight className="h-3.5 w-3.5" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
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
                Cash Collect Audit Record
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
                  <span className="text-muted-foreground font-semibold">Cash Collected:</span>
                  <span className="font-mono font-black text-lg text-foreground">
                    {formatMoney(Number(selectedLog.collectedAmount))}
                  </span>
                </div>
              </div>

              {selectedLog.remarks && (
                <div className="p-4 rounded-2xl bg-card border border-border/50 space-y-0.5">
                  <span className="text-muted-foreground text-[10px] uppercase tracking-wider font-semibold block">
                    Agent&apos;s Note
                  </span>
                  <p className="text-foreground italic">&quot;{selectedLog.remarks}&quot;</p>
                </div>
              )}

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
