"use client";

import React from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useMachines } from "@/hooks/useMachines";
import { useStore } from "@/hooks/useStores";
import {
  ArrowLeft,
  Store as StoreIcon,
  MapPin,
  KeyRound,
  ArrowRight,
  Boxes,
  Loader2,
} from "lucide-react";

/**
 * Agent-facing landing page for a scanned Store QR code. A store can have
 * more than one machine, so this shows a picker instead of jumping straight
 * to a machine — tapping one routes into the existing per-machine
 * restock/cash-collect page.
 */
export default function AgentStoreMachinePickerPage() {
  const router = useRouter();
  const params = useParams();
  const storeId = (params?.storeId as string) || "";

  const { data: storeData, isLoading: isStoreLoading } = useStore(storeId);
  const { data: machinesList = [], isLoading: isMachinesLoading } = useMachines(storeId);

  const isLoading = isStoreLoading || isMachinesLoading;

  return (
    <div className="space-y-4 pb-12 font-sans">
      {/* Top Header & Back Navigation */}
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
          <div className="flex items-center gap-2">
            <StoreIcon className="h-4 w-4 text-primary shrink-0" />
            <h1 className="text-base font-bold tracking-tight text-foreground truncate">
              {storeData?.name || "Store"}
            </h1>
          </div>
          {storeData?.eircode && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground truncate">
              <MapPin className="h-3 w-3 shrink-0 text-primary" />
              <span className="truncate">{storeData.eircode}</span>
            </div>
          )}
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        Select the machine you&apos;re servicing at this store.
      </p>

      {/* Machine List */}
      {isLoading ? (
        <div className="p-8 text-center border border-dashed border-border/60 rounded-2xl space-y-2 bg-card">
          <Loader2 className="h-6 w-6 animate-spin text-primary mx-auto" />
          <p className="text-xs text-muted-foreground">Loading machines...</p>
        </div>
      ) : machinesList.length > 0 ? (
        <div className="space-y-2">
          {machinesList.map((m) => {
            const isOffline = m.status === "OFFLINE";

            return (
              <div
                key={m.id}
                onClick={() =>
                  router.push(`/machine/${encodeURIComponent(m.serialNumber || m.id)}`)
                }
                className="p-3.5 rounded-2xl bg-card border border-border/60 hover:border-primary/60 active:scale-[0.99] transition-all cursor-pointer flex items-center justify-between gap-2 shadow-xs"
              >
                <div className="min-w-0 space-y-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-mono font-bold text-xs text-foreground">
                      {m.serialNumber}
                    </span>
                    {m.attentionNeeded && (
                      <span className="text-[9px] font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-1.5 py-0.2 rounded-md">
                        Needs Attention
                      </span>
                    )}
                    {m.keyNumber && (
                      <span className="inline-flex items-center gap-0.5 text-[9px] font-mono font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-1.5 py-0.2 rounded-md">
                        <KeyRound className="h-2.5 w-2.5" />
                        <span>Key: {m.keyNumber}</span>
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-muted-foreground truncate">
                    {m.category || "Standard"} • {m.type || "Spiral Chute"}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span
                    className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                      isOffline
                        ? "bg-zinc-500/10 text-zinc-600 dark:text-zinc-400"
                        : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                    }`}
                  >
                    {isOffline ? "Offline" : "Online"}
                  </span>
                  <div className="h-7 w-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                    <ArrowRight className="h-3.5 w-3.5" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="p-8 text-center border border-dashed border-border/60 rounded-2xl space-y-2 bg-card">
          <Boxes className="h-7 w-7 text-muted-foreground/40 mx-auto" />
          <p className="text-xs font-semibold text-foreground">No Machines at this Store</p>
          <p className="text-[11px] text-muted-foreground max-w-xs mx-auto">
            No fleet units are assigned to this store yet.
          </p>
        </div>
      )}
    </div>
  );
}
