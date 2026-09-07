"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useMyHistory, MyHistoryLogItem } from "@/hooks/useInventory";
import { useCurrency } from "@/hooks/useTenantSettings";
import {
  ArrowLeft,
  ClipboardList,
  PackageOpen,
  Sparkles,
  RotateCcw,
  Coins,
  Clock,
  Boxes,
} from "lucide-react";

function getActionMeta(log: MyHistoryLogItem) {
  if (log.logType === "CASH") {
    return {
      label: "Cash Collect",
      icon: Coins,
      badgeClass: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30",
    };
  }
  switch (log.entryType) {
    case "STANDARD":
      return {
        label: "Standard Restock",
        icon: PackageOpen,
        badgeClass: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
      };
    case "REVERSE":
      return {
        label: "Reversal",
        icon: RotateCcw,
        badgeClass: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
      };
    case "MANUAL":
    default:
      return {
        label: "Manual Entry",
        icon: Sparkles,
        badgeClass: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
      };
  }
}

export default function AgentHistoryPage() {
  const router = useRouter();
  const { data: logs = [], isLoading } = useMyHistory();
  const { format: formatMoney } = useCurrency();

  return (
    <div className="space-y-4 pb-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          size="icon"
          onClick={() => router.push("/scan")}
          className="h-10 w-10 shrink-0 rounded-xl border-border/60 shadow-xs"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-base font-bold tracking-tight text-foreground truncate">
            My Activity History
          </h1>
          <p className="text-xs text-muted-foreground truncate">
            Your recent restocks, cash collections &amp; reversals
          </p>
        </div>
      </div>

      {/* Timeline */}
      {isLoading ? (
        <div className="space-y-2.5">
          {[1, 2, 3, 4].map((n) => (
            <div
              key={n}
              className="h-20 w-full bg-card/60 border border-border/40 rounded-2xl animate-pulse"
            />
          ))}
        </div>
      ) : logs.length === 0 ? (
        <div className="p-8 text-center border border-dashed border-border/60 rounded-2xl space-y-2 bg-card">
          <ClipboardList className="h-7 w-7 text-muted-foreground/40 mx-auto" />
          <p className="text-xs font-semibold text-foreground">No Activity Yet</p>
          <p className="text-[11px] text-muted-foreground max-w-xs mx-auto">
            Restocks, cash collections, and reversals you perform will show up here.
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {logs.map((log) => {
            const { label, icon: Icon, badgeClass } = getActionMeta(log);
            const isCash = log.logType === "CASH";
            const created = new Date(log.createdAt);

            return (
              <Card key={log.id} className="border-border/50 bg-card shadow-xs">
                <CardContent className="p-3.5 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-bold border ${badgeClass}`}
                    >
                      <Icon className="h-3 w-3" />
                      <span>{label}</span>
                    </span>
                    <span
                      className={`font-mono font-black text-sm ${
                        isCash
                          ? "text-amber-600 dark:text-amber-400"
                          : (log.quantityAdded ?? 0) > 0
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-rose-600 dark:text-rose-400"
                      }`}
                    >
                      {isCash
                        ? formatMoney(log.collectedAmount ?? 0)
                        : `${(log.quantityAdded ?? 0) > 0 ? "+" : ""}${log.quantityAdded ?? 0} pcs`}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                    <Boxes className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <span className="font-mono">{log.machine?.serialNumber || log.machineId}</span>
                    {log.machine?.location && (
                      <span className="text-muted-foreground font-normal truncate">
                        • {log.machine.location}
                      </span>
                    )}
                  </div>

                  {log.remarks && (
                    <p className="text-[11px] text-muted-foreground leading-snug line-clamp-2">
                      {log.remarks}
                    </p>
                  )}

                  <div className="flex items-center gap-1 pt-1 border-t border-border/30 text-[10px] text-muted-foreground">
                    <Clock className="h-3 w-3 text-muted-foreground/70 shrink-0" />
                    <span>
                      {created.toLocaleDateString([], {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                      {" • "}
                      {created.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
