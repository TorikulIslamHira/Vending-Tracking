"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { EntryType } from "@vending/shared-types";
import { apiClient } from "@/lib/api-client";
import { useReverseLog } from "@/hooks/useInventory";
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
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowLeft,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  Loader2,
  Clock,
  Search,
  Filter,
  ShieldAlert,
  Boxes,
  User,
  ChevronRight,
  Package,
} from "lucide-react";

interface PopulatedInventoryLog {
  id: string;
  tenantId: string;
  machineId: string;
  agentId: string;
  packetId?: string | null;
  entryType: EntryType;
  quantityAdded: number;
  remarks: string;
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
  packet?: {
    id: string;
    name: string;
    brand: string;
  } | null;
}

const fallbackLogs: PopulatedInventoryLog[] = [
  {
    id: "log-1",
    tenantId: "tenant-demo",
    machineId: "m-1",
    agentId: "u-1",
    entryType: EntryType.STANDARD,
    quantityAdded: 200,
    remarks: "Standard restock: 2 packets Gumball 32mm Mega Bag",
    createdAt: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
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
    packet: {
      id: "pkt-1",
      name: "Gumball 32mm Mega Bag",
      brand: "SweetBall Candy Co.",
    },
  },
  {
    id: "log-2",
    tenantId: "tenant-demo",
    machineId: "m-2",
    agentId: "u-2",
    entryType: EntryType.MANUAL,
    quantityAdded: 50,
    remarks: "[Brand: Wonka Drops] Manual loose items refill from emergency field box",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
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
    packet: null,
  },
  {
    id: "log-3",
    tenantId: "tenant-demo",
    machineId: "m-3",
    agentId: "u-1",
    entryType: EntryType.REVERSE,
    quantityAdded: -100,
    remarks: "Error reversal: Operator mistakenly selected Sour Fizz instead of Gumball",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
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
    packet: null,
  },
];

export default function MobileInventoryLogsPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [entryTypeFilter, setEntryTypeFilter] = useState<string>("ALL");
  const [selectedLog, setSelectedLog] = useState<PopulatedInventoryLog | null>(null);
  const [reversalTarget, setReversalTarget] = useState<PopulatedInventoryLog | null>(null);
  const [reversalReason, setReversalReason] = useState("");

  const reverseLogMutation = useReverseLog();

  const { data: logs = fallbackLogs, isLoading } = useQuery<
    PopulatedInventoryLog[]
  >({
    queryKey: ["inventory-logs"],
    queryFn: async () => {
      try {
        const response = await apiClient.get("/inventory/logs");
        return response.data.data;
      } catch {
        return fallbackLogs;
      }
    },
  });

  const handleConfirmReversal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reversalTarget) return;

    reverseLogMutation.mutate(
      {
        logId: reversalTarget.id,
        remarks: reversalReason.trim(),
      },
      {
        onSuccess: () => {
          setReversalTarget(null);
          setSelectedLog(null);
          setReversalReason("");
        },
      }
    );
  };

  const filteredLogs = logs.filter((log) => {
    const q = searchQuery.toLowerCase();
    const matchesQuery =
      log.machine?.serialNumber?.toLowerCase().includes(q) ||
      log.machine?.location?.toLowerCase().includes(q) ||
      log.agent?.name?.toLowerCase().includes(q) ||
      log.remarks?.toLowerCase().includes(q) ||
      log.packet?.name?.toLowerCase().includes(q) ||
      log.packet?.brand?.toLowerCase().includes(q);

    const matchesType =
      entryTypeFilter === "ALL" || log.entryType === entryTypeFilter;

    return matchesQuery && matchesType;
  });

  return (
    <div className="w-full px-4 py-4 space-y-4 font-sans">
      {/* 1. Top Navigation Bar with Back Button */}
      <div className="flex items-center justify-between pt-1">
        <button
          onClick={() => router.push("/dashboard")}
          className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground hover:text-foreground active:scale-95 transition-transform"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Dashboard</span>
        </button>

        <div className="flex items-center gap-1 text-[11px] font-bold text-blue-600 dark:text-blue-400 bg-blue-500/10 px-2.5 py-1 rounded-full">
          <FileSpreadsheet className="h-3.5 w-3.5" />
          <span>Audit Trail</span>
        </div>
      </div>

      {/* 2. Header Title */}
      <div className="p-4 rounded-2xl bg-muted/40 border border-border/50 space-y-1 shadow-xs">
        <h1 className="text-xl font-black tracking-tight text-foreground">
          Inventory Restock Logs
        </h1>
        <p className="text-xs text-muted-foreground">
          Immutable audit trail of field refills, manual adjustments & error reversals.
        </p>
      </div>

      {/* 3. Search & Filter Bar */}
      <div className="space-y-2">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by serial, agent, remarks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-11 rounded-2xl bg-card border-border/50 text-xs shadow-xs"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          {[
            { id: "ALL", label: "All Logs" },
            { id: EntryType.STANDARD, label: "Packets" },
            { id: EntryType.MANUAL, label: "Manual" },
            { id: EntryType.REVERSE, label: "Reversals" },
          ].map((tab) => {
            const isActive = entryTypeFilter === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setEntryTypeFilter(tab.id)}
                className={`px-3 py-1.5 rounded-xl text-[11px] font-bold shrink-0 transition-all active:scale-95 ${
                  isActive
                    ? "bg-primary text-primary-foreground shadow-xs font-black"
                    : "bg-muted/50 text-muted-foreground hover:text-foreground border border-border/40"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. Vertical Stacked Card List (Mobile-Optimized) */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="flex h-40 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="text-center py-12 space-y-2 bg-card rounded-2xl border border-border/50 p-6">
            <Package className="h-8 w-8 text-muted-foreground mx-auto" />
            <p className="text-sm font-bold text-foreground">No restock logs found</p>
            <p className="text-xs text-muted-foreground">Try adjusting your search or filter</p>
          </div>
        ) : (
          filteredLogs.map((log) => {
            const isStandard = log.entryType === EntryType.STANDARD;
            const isManual = log.entryType === EntryType.MANUAL;
            const isReverse = log.entryType === EntryType.REVERSE;

            return (
              <Card
                key={log.id}
                onClick={() => setSelectedLog(log)}
                className="border-border/50 bg-card shadow-xs hover:border-border/80 active:scale-[0.98] transition-all cursor-pointer overflow-hidden"
              >
                <CardContent className="p-4 space-y-3">
                  {/* Top row: Timestamp & Entry Type Badge */}
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
                        isStandard
                          ? "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                          : isManual
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                          : "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                      }`}
                    >
                      {isStandard && <CheckCircle2 className="h-3 w-3" />}
                      {isManual && <AlertCircle className="h-3 w-3" />}
                      {isReverse && <RotateCcw className="h-3 w-3" />}
                      <span>{log.entryType}</span>
                    </span>
                  </div>

                  {/* Middle row: Machine & Quantity Added */}
                  <div className="flex items-start justify-between gap-2 pt-1 border-t border-border/40">
                    <div className="space-y-0.5 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <Boxes className="h-3.5 w-3.5 text-primary shrink-0" />
                        <span className="font-mono font-bold text-xs text-foreground truncate">
                          {log.machine?.serialNumber || log.machineId}
                        </span>
                      </div>
                      <p className="text-[11px] text-muted-foreground truncate">
                        {log.machine?.location}
                      </p>
                    </div>

                    {/* Quantity Pill */}
                    <div
                      className={`px-2.5 py-1 rounded-xl text-xs font-mono font-bold shrink-0 ${
                        log.quantityAdded > 0
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                          : "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                      }`}
                    >
                      {log.quantityAdded > 0
                        ? `+${log.quantityAdded} pcs`
                        : `${log.quantityAdded} pcs`}
                    </div>
                  </div>

                  {/* Bottom row: Agent & Remarks */}
                  <div className="flex items-center justify-between text-[11px] pt-1 text-muted-foreground">
                    <div className="flex items-center gap-1.5 truncate pr-2">
                      <User className="h-3 w-3 text-muted-foreground/70 shrink-0" />
                      <span className="font-medium text-foreground truncate">
                        {log.agent?.name || "Field Restocker"}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 text-primary font-semibold shrink-0">
                      <span>Details</span>
                      <ChevronRight className="h-3.5 w-3.5" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* 5. Vaul Bottom Drawer: Log Details & Action */}
      <Drawer
        open={!!selectedLog && !reversalTarget}
        onOpenChange={(open) => !open && setSelectedLog(null)}
      >
        <DrawerContent className="max-w-md mx-auto rounded-t-[28px] p-6 space-y-4 max-h-[85vh] flex flex-col">
          <DrawerHeader className="p-0 text-left shrink-0">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-xl bg-blue-500/20 flex items-center justify-center text-blue-600">
                <FileSpreadsheet className="h-4 w-4" />
              </div>
              <DrawerTitle className="text-lg font-bold text-foreground">
                Telemetry Log Details
              </DrawerTitle>
            </div>
            <DrawerDescription className="text-xs text-muted-foreground">
              Detailed breakdown of this field restock transaction.
            </DrawerDescription>
          </DrawerHeader>

          {selectedLog && (
            <div className="space-y-3 overflow-y-auto flex-1 pr-1 text-xs">
              <div className="p-4 rounded-2xl bg-muted/40 border border-border/50 space-y-2.5">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Log ID</span>
                  <span className="font-mono font-bold text-foreground">
                    {selectedLog.id}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Timestamp</span>
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
                  <span className="text-muted-foreground">Restocker Agent</span>
                  <span className="font-bold text-foreground">
                    {selectedLog.agent?.name || "Field Agent"} ({selectedLog.agent?.email})
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Net Quantity</span>
                  <span
                    className={`font-mono font-black text-sm ${
                      selectedLog.quantityAdded > 0
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-rose-600 dark:text-rose-400"
                    }`}
                  >
                    {selectedLog.quantityAdded > 0
                      ? `+${selectedLog.quantityAdded} pcs`
                      : `${selectedLog.quantityAdded} pcs`}
                  </span>
                </div>
              </div>

              {/* Remarks block */}
              <div className="p-3.5 rounded-2xl bg-card border border-border/50 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Audit Remarks
                </span>
                <p className="text-xs text-foreground font-medium leading-relaxed">
                  {selectedLog.remarks || "No remarks provided."}
                </p>
              </div>

              <DrawerFooter className="p-0 pt-2 gap-2">
                {selectedLog.entryType !== EntryType.REVERSE && (
                  <Button
                    type="button"
                    onClick={() => {
                      setReversalTarget(selectedLog);
                      setReversalReason(`Reversal of mistaken ${selectedLog.entryType.toLowerCase()} entry`);
                    }}
                    className="w-full h-12 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs gap-2 shadow-md active:scale-[0.97]"
                  >
                    <RotateCcw className="h-4 w-4" />
                    <span>Initiate Compensating Reversal</span>
                  </Button>
                )}
                <DrawerClose asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full h-10 rounded-xl text-xs font-semibold"
                  >
                    Close
                  </Button>
                </DrawerClose>
              </DrawerFooter>
            </div>
          )}
        </DrawerContent>
      </Drawer>

      {/* 6. Vaul Bottom Drawer: Reversal Confirmation Form */}
      <Drawer
        open={!!reversalTarget}
        onOpenChange={(open) => !open && setReversalTarget(null)}
      >
        <DrawerContent className="max-w-md mx-auto rounded-t-[28px] p-6 space-y-4 max-h-[85vh] flex flex-col">
          <DrawerHeader className="p-0 text-left shrink-0">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-xl bg-rose-500/20 flex items-center justify-center text-rose-600">
                <ShieldAlert className="h-4 w-4" />
              </div>
              <DrawerTitle className="text-lg font-bold text-foreground">
                Reverse Refill Entry
              </DrawerTitle>
            </div>
            <DrawerDescription className="text-xs text-muted-foreground">
              Creates an immutable compensating reversal entry to adjust the inventory count.
            </DrawerDescription>
          </DrawerHeader>

          {reversalTarget && (
            <form onSubmit={handleConfirmReversal} className="space-y-3.5 pt-1 flex-1 flex flex-col">
              <div className="p-3.5 rounded-2xl bg-muted/40 border border-border/50 space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Target Machine:</span>
                  <span className="font-mono font-bold text-foreground">
                    {reversalTarget.machine?.serialNumber || reversalTarget.machineId}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Offset Adjustment:</span>
                  <span className="font-mono font-bold text-rose-600 dark:text-rose-400">
                    -{Math.abs(reversalTarget.quantityAdded)} pieces
                  </span>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Mandatory Reversal Justification *
                </label>
                <Textarea
                  placeholder="Explain why this entry is being reversed (min 5 characters)..."
                  value={reversalReason}
                  onChange={(e) => setReversalReason(e.target.value)}
                  className="min-h-[85px] rounded-xl text-xs"
                  required
                />
              </div>

              <DrawerFooter className="p-0 pt-3 gap-2 mt-auto">
                <Button
                  type="submit"
                  className="w-full h-12 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-sm shadow-md active:scale-[0.97]"
                  disabled={reverseLogMutation.isPending || reversalReason.trim().length < 5}
                >
                  {reverseLogMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Confirm & Post Reversal Entry"
                  )}
                </Button>
                <DrawerClose asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full h-10 rounded-xl text-xs font-semibold"
                  >
                    Cancel
                  </Button>
                </DrawerClose>
              </DrawerFooter>
            </form>
          )}
        </DrawerContent>
      </Drawer>
    </div>
  );
}
