"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useMachines, MachineItem } from "@/hooks/useMachines";
import { useStore } from "@/hooks/useStores";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ArrowLeft,
  Search,
  Plus,
  QrCode,
  Check,
  Boxes,
  ChevronRight,
  Store as StoreIcon,
  Percent,
} from "lucide-react";

export default function StoreMachinesPage() {
  const router = useRouter();
  const params = useParams();
  const storeId = (params?.storeId as string) || "";

  const { data: storeData } = useStore(storeId);
  const { data: rawMachines = [], isLoading } = useMachines(storeId);

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  const toggleSelectMachine = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((mId) => mId !== id) : [...prev, id]
    );
  };

  const selectedCount = selectedIds.length;

  const filteredMachines = rawMachines.filter((m) => {
    const matchesSearch =
      m.serialNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (m.category || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (m.type || "").toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === "ALL" || m.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const handleGenerateBatchQR = () => {
    if (selectedCount === 0) return;
    const firstSelected = rawMachines.find((m) => m.id === selectedIds[0]);
    if (firstSelected) {
      router.push(`/machines/${firstSelected.serialNumber}/qr`);
    }
  };

  return (
    <div className="w-full px-4 py-4 space-y-4 relative min-h-[600px] pb-24">
      {/* Top Bar with Back Button */}
      <div className="flex items-center justify-between pt-1">
        <button
          onClick={() => {
            if (storeData?.locationId) {
              router.push(`/locations/${storeData.locationId}`);
            } else {
              router.push("/locations");
            }
          }}
          className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground hover:text-foreground active:scale-95 transition-transform"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>{storeData?.locationName || "Location"}</span>
        </button>

        <Button
          onClick={() => router.push(`/machines/register?storeId=${storeId}`)}
          className="h-9 px-3 rounded-2xl font-bold gap-1 shadow-xs shadow-primary/30 active:scale-95"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>+ Add Machine</span>
        </Button>
      </div>

      {/* Store Context Card */}
      <div className="p-4 rounded-2xl bg-muted/40 border border-border/50 space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-primary flex items-center gap-1">
            <StoreIcon className="h-3 w-3" />
            <span>{storeData?.locationName || "Venue Store"}</span>
          </span>
          {storeData && (
            <span className="text-[10px] font-bold text-muted-foreground bg-card border border-border/60 px-2 py-0.5 rounded-full flex items-center gap-1">
              <Percent className="h-2.5 w-2.5 text-secondary" />
              <span>
                {storeData.shopCutPercent}% / {storeData.businessCutPercent}%
              </span>
            </span>
          )}
        </div>
        <h1 className="text-xl font-black tracking-tight text-foreground">
          {storeData?.name || "Store Fleet Units"}
        </h1>
        <p className="text-xs text-muted-foreground">
          {rawMachines.length} {rawMachines.length === 1 ? "Machine" : "Machines"} Assigned to this Store
        </p>
      </div>

      {/* Search & Status Filters */}
      <div className="space-y-2">
        <div className="relative w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            type="text"
            placeholder="Search machine ID or category..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="h-11 w-full rounded-2xl bg-muted/40 border-border/50 pl-10 pr-4 text-xs focus-visible:ring-primary shadow-xs"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
          {["ALL", "ONLINE", "LOW_STOCK", "OFFLINE"].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-xl font-semibold transition-all whitespace-nowrap active:scale-95 ${
                statusFilter === st
                  ? "bg-primary text-primary-foreground shadow-xs font-bold"
                  : "bg-muted/50 text-muted-foreground hover:text-foreground"
              }`}
            >
              {st === "ALL"
                ? "All Status"
                : st === "LOW_STOCK"
                ? "Low Stock"
                : st.charAt(0) + st.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Screen 5: Machine List */}
      <div className="space-y-2.5">
        {isLoading ? (
          <div className="space-y-2.5">
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                className="h-20 w-full bg-card/60 border border-border/40 rounded-2xl p-4 animate-pulse"
              />
            ))}
          </div>
        ) : filteredMachines.length > 0 ? (
          filteredMachines.map((machine) => {
            const isSelected = selectedIds.includes(machine.id);
            const isLow = machine.status === "LOW_STOCK";
            const isOffline = machine.status === "OFFLINE";

            return (
              <div
                key={machine.id}
                onClick={() => toggleSelectMachine(machine.id)}
                className={`flex items-center gap-3 p-3.5 rounded-2xl border transition-all duration-150 cursor-pointer select-none active:scale-[0.98] ${
                  isSelected
                    ? "bg-primary/10 border-primary/60 shadow-xs"
                    : "bg-card border-border/50 hover:border-border/80 shadow-xs"
                }`}
              >
                {/* Custom Checkbox */}
                <div
                  className={`h-6 w-6 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                    isSelected
                      ? "bg-primary text-foreground font-bold shadow-xs"
                      : "border border-muted-foreground/30 bg-muted/30"
                  }`}
                >
                  {isSelected && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                </div>

                {/* QR Code Icon Thumbnail */}
                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    router.push(`/machines/${machine.serialNumber}/qr`);
                  }}
                  className="h-10 w-10 rounded-xl bg-accent/60 flex items-center justify-center text-primary hover:bg-primary hover:text-primary-foreground transition-colors shrink-0"
                  title="View QR Code"
                >
                  <QrCode className="h-5 w-5" />
                </div>

                {/* Machine Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-bold text-xs font-mono text-foreground">
                      {machine.serialNumber}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        isLow
                          ? "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                          : isOffline
                          ? "bg-zinc-500/10 text-zinc-600 dark:text-zinc-400"
                          : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                      }`}
                    >
                      {isLow
                        ? `${machine.itemsRemaining} left`
                        : isOffline
                        ? "Offline"
                        : "Online"}
                    </span>
                  </div>
                  <p className="text-[11px] font-medium text-foreground truncate mt-0.5">
                    {machine.category}
                  </p>
                  <p className="text-[10px] text-muted-foreground truncate">
                    {machine.type} • Cap: {machine.capacity}
                  </p>
                </div>

                {/* Action arrow to machine restock portal */}
                <Link
                  href={`/machine/${machine.serialNumber}`}
                  onClick={(e) => e.stopPropagation()}
                  className="h-8 w-8 rounded-xl bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors shrink-0"
                >
                  <ChevronRight className="h-4 w-4" />
                </Link>
              </div>
            );
          })
        ) : (
          <div className="py-12 text-center space-y-2">
            <Boxes className="h-8 w-8 text-muted-foreground/40 mx-auto" />
            <p className="text-xs text-muted-foreground">
              No machines found matching your criteria.
            </p>
          </div>
        )}
      </div>

      {/* Floating Bottom Sticky Action Button for Batch Selection */}
      {selectedCount > 0 && (
        <div className="fixed bottom-6 left-0 right-0 max-w-md mx-auto px-4 z-40 animate-in fade-in slide-in-from-bottom-4 duration-200">
          <Button
            onClick={handleGenerateBatchQR}
            className="w-full h-13 py-3.5 rounded-2xl bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 font-bold text-sm shadow-xl flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
          >
            <QrCode className="h-5 w-5 text-primary" />
            <span>Generate QR ({selectedCount} Selected)</span>
          </Button>
        </div>
      )}
    </div>
  );
}
