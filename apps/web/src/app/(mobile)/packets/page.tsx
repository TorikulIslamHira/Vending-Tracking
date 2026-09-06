"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { PacketConfigCreateSchema, PacketConfigCreateDto } from "@vending/validation";
import { IPacketConfig } from "@vending/shared-types";
import { apiClient } from "@/lib/api-client";
import { useCurrency } from "@/hooks/useTenantSettings";
import { toast } from "sonner";
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
  Layers,
  Plus,
  PackageOpen,
  Loader2,
  Sparkles,
  DollarSign,
  Package,
  Boxes,
  CheckCircle2,
  TrendingUp,
  Tag,
  Receipt,
} from "lucide-react";

const fallbackPackets: IPacketConfig[] = [
  {
    id: "pkt-1",
    tenantId: "tenant-demo",
    name: "Gumball 32mm Mega Bag",
    brand: "SweetBall Candy Co.",
    quantityPerPacket: 100,
    pricePerItem: 0.25,
    packetCost: 12.5,
    createdAt: new Date().toISOString(),
  },
  {
    id: "pkt-2",
    tenantId: "tenant-demo",
    name: "Sour Fizz Drops Standard",
    brand: "Novelty Confections",
    quantityPerPacket: 50,
    pricePerItem: 0.5,
    packetCost: 10.0,
    createdAt: new Date().toISOString(),
  },
  {
    id: "pkt-3",
    tenantId: "tenant-demo",
    name: "Choco Crunch Bites Pack",
    brand: "ChocoKing Ltd.",
    quantityPerPacket: 75,
    pricePerItem: 0.75,
    packetCost: 25.0,
    createdAt: new Date().toISOString(),
  },
];

export default function MobilePacketsPage() {
  const router = useRouter();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const queryClient = useQueryClient();
  const { format: formatMoney, symbol } = useCurrency();

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<PacketConfigCreateDto>({
    resolver: zodResolver(PacketConfigCreateSchema),
    defaultValues: {
      name: "",
      brand: "",
      quantityPerPacket: 100,
      pricePerItem: 0.25,
      packetCost: 12.5,
    },
  });

  const watchQty = Number(watch("quantityPerPacket") || 0);
  const watchPrice = Number(watch("pricePerItem") || 0);
  const watchCost = Number(watch("packetCost") || 0);
  const watchTotalRevenue = watchQty * watchPrice;
  const watchProfit = watchTotalRevenue - watchCost;
  const watchMargin =
    watchTotalRevenue > 0
      ? Math.round((watchProfit / watchTotalRevenue) * 100)
      : 0;

  // Query packets
  const { data: packets = fallbackPackets, isLoading } = useQuery<IPacketConfig[]>({
    queryKey: ["packets"],
    queryFn: async () => {
      try {
        const response = await apiClient.get("/packets");
        return response.data.data;
      } catch {
        return fallbackPackets;
      }
    },
  });

  // Mutation to create packet
  const createMutation = useMutation({
    mutationFn: async (newPacket: PacketConfigCreateDto) => {
      const response = await apiClient.post("/packets", newPacket);
      return response.data;
    },
    onSuccess: () => {
      toast.success("Packet configuration created successfully");
      queryClient.invalidateQueries({ queryKey: ["packets"] });
      reset();
      setIsDrawerOpen(false);
    },
    onError: (error: any) => {
      const msg = error.response?.data?.message || "Failed to create packet config";
      toast.error(msg);
    },
  });

  const onSubmit = (data: PacketConfigCreateDto) => {
    createMutation.mutate(data);
  };

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

        <div className="flex items-center gap-1 text-[11px] font-bold text-primary bg-primary/10 px-2.5 py-1 rounded-full">
          <Sparkles className="h-3.5 w-3.5" />
          <span>Master Data</span>
        </div>
      </div>

      {/* 2. Header & Action Title */}
      <div className="p-4 rounded-2xl bg-muted/40 border border-border/50 space-y-1 shadow-xs">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-black tracking-tight text-foreground">
              Packet Master Config
            </h1>
            <p className="text-xs text-muted-foreground">
              Standardized refill bags & wholesale unit cost tracking.
            </p>
          </div>
          <div className="h-10 w-10 rounded-2xl bg-primary/20 flex items-center justify-center text-primary shrink-0">
            <Layers className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* 3. Action: Add New Packet Button */}
      <Button
        onClick={() => setIsDrawerOpen(true)}
        className="w-full h-12 rounded-2xl bg-primary text-primary-foreground font-bold text-xs gap-2 shadow-md shadow-primary/20 active:scale-[0.98] transition-transform"
      >
        <Plus className="h-4 w-4 stroke-[3]" />
        <span>+ CREATE NEW PACKET CONFIG</span>
      </Button>

      {/* 4. Compact Card List (Mobile-Optimized) */}
      <div className="space-y-3 pt-1">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Configured Packets ({packets.length})
          </h2>
          <span className="text-[11px] text-muted-foreground">
            Fixed restock units & margins
          </span>
        </div>

        {isLoading ? (
          <div className="flex h-32 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : packets.length === 0 ? (
          <div className="text-center py-12 space-y-2 bg-card rounded-2xl border border-border/50 p-6">
            <Package className="h-8 w-8 text-muted-foreground mx-auto" />
            <p className="text-sm font-bold text-foreground">No packet configurations yet</p>
            <p className="text-xs text-muted-foreground">Tap &ldquo;+ Create New Packet Config&rdquo; above.</p>
          </div>
        ) : (
          packets.map((pkt) => {
            const qty = Number(pkt.quantityPerPacket || 0);
            const unitRetail = Number(pkt.pricePerItem || 0);
            const wholeCost = Number(pkt.packetCost || 0);
            const totalRetailValue = qty * unitRetail;
            const expectedProfit = totalRetailValue - wholeCost;
            const profitMargin =
              totalRetailValue > 0
                ? Math.round((expectedProfit / totalRetailValue) * 100)
                : 0;

            return (
              <Card
                key={pkt.id}
                className="border-border/50 bg-card shadow-xs hover:border-border/80 active:scale-[0.98] transition-all overflow-hidden"
              >
                <CardContent className="p-4 space-y-3">
                  {/* Top: Name and Brand */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-2xl bg-primary/15 flex items-center justify-center text-primary shrink-0 shadow-xs">
                        <PackageOpen className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-bold text-sm text-foreground truncate">
                          {pkt.name}
                        </h3>
                        <p className="text-[11px] text-muted-foreground truncate">
                          {pkt.brand}
                        </p>
                      </div>
                    </div>

                    <span className="rounded-xl bg-primary/20 text-foreground px-2.5 py-1 text-[11px] font-black shrink-0 font-mono">
                      {qty} pcs
                    </span>
                  </div>

                  {/* Pricing Breakdown Grid */}
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/40 text-xs">
                    <div className="bg-muted/40 p-2.5 rounded-xl space-y-0.5">
                      <span className="text-[10px] font-semibold text-muted-foreground flex items-center gap-1">
                        <Tag className="h-3 w-3 text-primary" />
                        <span>Unit Retail Price</span>
                      </span>
                      <span className="font-mono font-bold text-foreground block">
                        {formatMoney(unitRetail)} / pc
                      </span>
                    </div>

                    <div className="bg-muted/40 p-2.5 rounded-xl space-y-0.5">
                      <span className="text-[10px] font-semibold text-muted-foreground flex items-center gap-1">
                        <Receipt className="h-3 w-3 text-amber-500" />
                        <span>Whole Packet Cost</span>
                      </span>
                      <span className="font-mono font-bold text-foreground block">
                        {formatMoney(wholeCost)} / bag
                      </span>
                    </div>
                  </div>

                  {/* Profit & Margin Banner */}
                  <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-2.5 flex items-center justify-between text-xs">
                    <div className="space-y-0.5">
                      <span className="text-[10px] font-semibold text-muted-foreground">
                        Total Value: {formatMoney(totalRetailValue)}
                      </span>
                      <div className="flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                        <TrendingUp className="h-3.5 w-3.5" />
                        <span>Expected Gross Profit:</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="font-mono font-black text-sm text-emerald-600 dark:text-emerald-400 block">
                        +{formatMoney(expectedProfit)}
                      </span>
                      <span className="text-[10px] font-bold text-emerald-600/80 dark:text-emerald-400/80">
                        {profitMargin}% margin
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* 5. Vaul Bottom Drawer: Create Packet Configuration Form */}
      <Drawer open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
        <DrawerContent className="max-w-md mx-auto rounded-t-[28px] p-6 space-y-4 max-h-[88vh] flex flex-col">
          <DrawerHeader className="p-0 text-left shrink-0">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-xl bg-primary/20 flex items-center justify-center text-primary">
                <PackageOpen className="h-4 w-4" />
              </div>
              <DrawerTitle className="text-lg font-bold text-foreground">
                Define New Packet Config
              </DrawerTitle>
            </div>
            <DrawerDescription className="text-xs text-muted-foreground">
              Standardize packet sizes, retail prices, and wholesale purchase costs.
            </DrawerDescription>
          </DrawerHeader>

          <form
            onSubmit={handleSubmit(onSubmit)}
            className="space-y-3.5 overflow-y-auto flex-1 pr-1 pt-1"
          >
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                Packet Name *
              </label>
              <Input
                placeholder="e.g. Gumball 32mm Standard Bag"
                className="h-11 rounded-xl text-xs bg-muted/30 border-border/60"
                {...register("name")}
              />
              {errors.name && (
                <p className="text-[11px] text-destructive font-medium">{errors.name.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                Brand / Manufacturer *
              </label>
              <Input
                placeholder="e.g. SweetBall Candy Co."
                className="h-11 rounded-xl text-xs bg-muted/30 border-border/60"
                {...register("brand")}
              />
              {errors.brand && (
                <p className="text-[11px] text-destructive font-medium">{errors.brand.message}</p>
              )}
            </div>

            <div className="grid grid-cols-3 gap-2.5">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground truncate block">
                  Qty/Packet *
                </label>
                <Input
                  type="number"
                  placeholder="100"
                  className="h-11 rounded-xl text-xs bg-muted/30 border-border/60 px-2.5"
                  {...register("quantityPerPacket", { valueAsNumber: true })}
                />
                {errors.quantityPerPacket && (
                  <p className="text-[10px] text-destructive font-medium">
                    {errors.quantityPerPacket.message}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground truncate block">
                  Retail / Pc ({symbol}) *
                </label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.25"
                  className="h-11 rounded-xl text-xs bg-muted/30 border-border/60 px-2.5"
                  {...register("pricePerItem", { valueAsNumber: true })}
                />
                {errors.pricePerItem && (
                  <p className="text-[10px] text-destructive font-medium">
                    {errors.pricePerItem.message}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground truncate block">
                  Bag Cost ({symbol}) *
                </label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="12.50"
                  className="h-11 rounded-xl text-xs bg-muted/30 border-border/60 px-2.5"
                  {...register("packetCost", { valueAsNumber: true })}
                />
                {errors.packetCost && (
                  <p className="text-[10px] text-destructive font-medium">
                    {errors.packetCost.message}
                  </p>
                )}
              </div>
            </div>

            {/* Live Profit Margin Feedback in Drawer */}
            <div className="rounded-2xl bg-muted/50 border border-border/60 p-3 space-y-1.5 text-xs">
              <div className="flex justify-between items-center text-muted-foreground text-[11px]">
                <span>Total Retail Value ({watchQty} pcs @ {formatMoney(watchPrice)}):</span>
                <span className="font-mono font-bold text-foreground">{formatMoney(watchTotalRevenue)}</span>
              </div>
              <div className="flex justify-between items-center text-muted-foreground text-[11px]">
                <span>Whole Packet Cost:</span>
                <span className="font-mono font-bold text-foreground">-{formatMoney(watchCost)}</span>
              </div>
              <div className="flex justify-between items-center pt-1.5 border-t border-border/40 font-semibold">
                <span className="text-foreground">Projected Profit / Packet:</span>
                <span className="font-mono font-black text-emerald-600 dark:text-emerald-400">
                  +{formatMoney(watchProfit)}{" "}
                  <span className="text-[10px] font-bold text-emerald-600/80 dark:text-emerald-400/80">
                    ({watchMargin}% margin)
                  </span>
                </span>
              </div>
            </div>

            <DrawerFooter className="p-0 pt-2 gap-2">
              <Button
                type="submit"
                className="w-full h-12 rounded-2xl bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 font-bold text-sm shadow-md active:scale-[0.97]"
                disabled={createMutation.isPending}
              >
                {createMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Save Packet Configuration"
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
        </DrawerContent>
      </Drawer>
    </div>
  );
}
