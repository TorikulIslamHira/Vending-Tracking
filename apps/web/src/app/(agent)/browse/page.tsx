"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useMachines } from "@/hooks/useMachines";
import { useAllStores, StoreItem, StoreMachineItem } from "@/hooks/useStores";
import {
  ArrowLeft,
  Store,
  Search,
  ChevronDown,
  ChevronUp,
  MapPin,
  X,
  Boxes,
  KeyRound,
  Loader2,
  Building2,
  ArrowRight,
} from "lucide-react";

export default function BrowseMachinesDirectoryPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedStores, setExpandedStores] = useState<Record<string, boolean>>({});

  // Data queries
  const { data: machinesList = [], isLoading: isMachinesLoading } = useMachines();
  const { data: storesList = [], isLoading: isStoresLoading } = useAllStores();

  const toggleStoreExpand = (storeId: string) => {
    setExpandedStores((prev) => ({
      ...prev,
      [storeId]: !prev[storeId],
    }));
  };

  // Filter stores and their nested machines
  const searchLower = searchQuery.toLowerCase().trim();

  const filteredStoreHierarchy = storesList
    .map((store: StoreItem) => {
      const storeMachines: StoreMachineItem[] = store.machines || [];
      const storeMatches =
        !searchLower ||
        store.name.toLowerCase().includes(searchLower) ||
        (store.locationName && store.locationName.toLowerCase().includes(searchLower)) ||
        (store.category && store.category.toLowerCase().includes(searchLower));

      const matchingMachines = storeMachines.filter((m: StoreMachineItem) => {
        if (!searchLower || storeMatches) return true;
        return (
          m.serialNumber.toLowerCase().includes(searchLower) ||
          (m.keyNumber && m.keyNumber.toLowerCase().includes(searchLower)) ||
          (m.category && m.category.toLowerCase().includes(searchLower)) ||
          (m.type && m.type.toLowerCase().includes(searchLower))
        );
      });

      return {
        store,
        machines: matchingMachines,
        hasMatch: storeMatches || matchingMachines.length > 0,
      };
    })
    .filter((item) => item.hasMatch);

  // Unassigned fleet units
  const unassignedMachines = machinesList.filter((m) => !m.storeId);
  const matchingUnassigned = unassignedMachines.filter((m) => {
    if (!searchLower) return true;
    return (
      m.serialNumber.toLowerCase().includes(searchLower) ||
      (m.keyNumber && m.keyNumber.toLowerCase().includes(searchLower)) ||
      (m.location && m.location.toLowerCase().includes(searchLower))
    );
  });

  const totalVisibleMachines =
    filteredStoreHierarchy.reduce((acc, curr) => acc + curr.machines.length, 0) +
    matchingUnassigned.length;

  const isLoading = isMachinesLoading || isStoresLoading;

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
            <h1 className="text-base font-bold tracking-tight text-foreground truncate">
              Fleet Directory
            </h1>
            <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full shrink-0">
              {totalVisibleMachines} Units
            </span>
          </div>
          <p className="text-xs text-muted-foreground truncate">
            Browse all stores and select machines manually
          </p>
        </div>
      </div>

      {/* Search / Filter Bar */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input
          type="text"
          placeholder="Search store, venue, serial, or key number..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="h-11 rounded-2xl bg-card border-border/60 pl-10 pr-8 text-xs focus-visible:ring-primary shadow-xs"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground hover:text-foreground flex items-center justify-center rounded-full"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Directory Content List */}
      {isLoading ? (
        <div className="p-12 text-center border border-dashed border-border/60 rounded-2xl space-y-2 bg-card">
          <Loader2 className="h-6 w-6 animate-spin text-primary mx-auto" />
          <p className="text-xs text-muted-foreground">Loading fleet directory...</p>
        </div>
      ) : filteredStoreHierarchy.length > 0 || matchingUnassigned.length > 0 ? (
        <div className="space-y-3">
          {filteredStoreHierarchy.map(({ store, machines }) => {
            const isExpanded =
              searchQuery.trim().length > 0 || expandedStores[store.id] !== false;

            return (
              <Card
                key={store.id}
                className="border-border/60 bg-card overflow-hidden shadow-xs transition-all duration-200"
              >
                {/* Store Header Accordion Bar */}
                <div
                  onClick={() => toggleStoreExpand(store.id)}
                  className="p-3.5 flex items-center justify-between cursor-pointer hover:bg-accent/30 transition-colors select-none"
                >
                  <div className="flex items-center gap-2.5 min-w-0 pr-2">
                    <div className="h-9 w-9 rounded-xl bg-secondary/15 flex items-center justify-center text-secondary shrink-0">
                      <Store className="h-4.5 w-4.5" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-bold text-xs text-foreground truncate">
                        {store.name}
                      </h3>
                      <div className="flex items-center gap-1 text-[10px] text-muted-foreground truncate">
                        <MapPin className="h-3 w-3 shrink-0 text-primary" />
                        <span className="truncate">{store.locationName || "Venue Hub"}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                      {machines.length} {machines.length === 1 ? "Unit" : "Units"}
                    </span>
                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                </div>

                {/* Nested Machines List */}
                {isExpanded && (
                  <div className="px-3 pb-3 pt-1 border-t border-border/40 space-y-1.5 bg-muted/15">
                    {machines.length > 0 ? (
                      machines.map((m: StoreMachineItem) => {
                        const isLow = m.status === "LOW_STOCK";
                        const isOffline = m.status === "OFFLINE";

                        return (
                          <div
                            key={m.id}
                            onClick={() =>
                              router.push(`/machine/${encodeURIComponent(m.serialNumber || m.id)}`)
                            }
                            className="p-2.5 rounded-xl bg-background border border-border/60 hover:border-primary/60 active:scale-[0.99] transition-all cursor-pointer flex items-center justify-between gap-2 shadow-2xs"
                          >
                            <div className="min-w-0 space-y-0.5">
                              <div className="flex items-center gap-1.5">
                                <span className="font-mono font-bold text-xs text-foreground">
                                  {m.serialNumber}
                                </span>
                                {m.keyNumber && (
                                  <span className="inline-flex items-center gap-0.5 text-[9px] font-mono font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-1.5 py-0.2 rounded-md">
                                    <KeyRound className="h-2.5 w-2.5" />
                                    <span>Key: {m.keyNumber}</span>
                                  </span>
                                )}
                              </div>
                              <p className="text-[10px] text-muted-foreground truncate">
                                {m.category || "Standard"} • {m.type || "Spiral Chute"} (Cap:{" "}
                                {m.capacity || 100})
                              </p>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              <span
                                className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                                  isLow
                                    ? "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                                    : isOffline
                                    ? "bg-zinc-500/10 text-zinc-600 dark:text-zinc-400"
                                    : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                }`}
                              >
                                {isLow ? "Low Stock" : isOffline ? "Offline" : "Online"}
                              </span>
                              <div className="h-7 w-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                                <ArrowRight className="h-3.5 w-3.5" />
                              </div>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="py-3 text-center text-[11px] text-muted-foreground">
                        No machines assigned to this store yet.
                      </div>
                    )}
                  </div>
                )}
              </Card>
            );
          })}

          {/* Unassigned Machines if any */}
          {matchingUnassigned.length > 0 && (
            <Card className="border-border/60 bg-card overflow-hidden shadow-xs">
              <div className="p-3.5 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="h-9 w-9 rounded-xl bg-amber-500/15 flex items-center justify-center text-amber-600 shrink-0">
                    <Building2 className="h-4.5 w-4.5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-xs text-foreground">Unassigned Machines</h3>
                    <p className="text-[10px] text-muted-foreground">Fleet units without a store</p>
                  </div>
                </div>
                <span className="text-[10px] font-bold text-amber-600 bg-amber-500/10 px-2 py-0.5 rounded-full">
                  {matchingUnassigned.length} Units
                </span>
              </div>
              <div className="px-3 pb-3 pt-1 border-t border-border/40 space-y-1.5 bg-muted/15">
                {matchingUnassigned.map((m) => (
                  <div
                    key={m.id}
                    onClick={() =>
                      router.push(`/machine/${encodeURIComponent(m.serialNumber || m.id)}`)
                    }
                    className="p-2.5 rounded-xl bg-background border border-border/60 hover:border-primary/60 active:scale-[0.99] transition-all cursor-pointer flex items-center justify-between gap-2 shadow-2xs"
                  >
                    <div className="min-w-0 space-y-0.5">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-bold text-xs text-foreground">
                          {m.serialNumber}
                        </span>
                        {m.keyNumber && (
                          <span className="inline-flex items-center gap-0.5 text-[9px] font-mono font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-1.5 py-0.2 rounded-md">
                            <KeyRound className="h-2.5 w-2.5" />
                            <span>Key: {m.keyNumber}</span>
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-muted-foreground truncate">
                        {m.location || "General Fleet"}
                      </p>
                    </div>
                    <div className="h-7 w-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                      <ArrowRight className="h-3.5 w-3.5" />
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      ) : (
        <div className="p-8 text-center border border-dashed border-border/60 rounded-2xl space-y-2 bg-card">
          <Boxes className="h-7 w-7 text-muted-foreground/40 mx-auto" />
          <p className="text-xs font-semibold text-foreground">No Stores or Machines Found</p>
          <p className="text-[11px] text-muted-foreground max-w-xs mx-auto">
            {searchQuery
              ? `No fleet units matched "${searchQuery}".`
              : "Register stores and machines in the admin portal to view the directory here."}
          </p>
          {searchQuery && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSearchQuery("")}
              className="h-8 text-xs rounded-xl mt-1"
            >
              Clear Search Filter
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
