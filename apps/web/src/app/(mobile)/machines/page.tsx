"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { MachineCreateSchema, MachineCreateDto } from "@vending/validation";
import { IMachine, MachineStatus } from "@vending/shared-types";
import { apiClient } from "@/lib/api-client";
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
  Boxes,
  Plus,
  Server,
  QrCode,
  Loader2,
  Coins,
  Search,
  Filter,
  ChevronRight,
  Sparkles,
  MapPin,
  KeyRound,
} from "lucide-react";

const fallbackMachines: IMachine[] = [
  {
    id: "m-1",
    tenantId: "tenant-demo",
    serialNumber: "VM-NY-010",
    location: "Grand Central Terminal - Gate 4",
    status: MachineStatus.ONLINE,
    qrCode: "QR-NY-010",
    virtualCashBalance: 420.0,
    createdAt: new Date().toISOString(),
  },
  {
    id: "m-2",
    tenantId: "tenant-demo",
    serialNumber: "VM-NY-014",
    location: "Times Square - Subway Concourse",
    status: MachineStatus.ONLINE,
    qrCode: "QR-NY-014",
    virtualCashBalance: 890.5,
    createdAt: new Date().toISOString(),
  },
  {
    id: "m-3",
    tenantId: "tenant-demo",
    serialNumber: "VM-NJ-003",
    location: "Hoboken Terminal - Waiting Hall",
    status: MachineStatus.OFFLINE,
    qrCode: "QR-NJ-003",
    virtualCashBalance: 210.0,
    createdAt: new Date().toISOString(),
  },
];

export default function MobileMachinesPage() {
  const router = useRouter();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<MachineCreateDto>({
    resolver: zodResolver(MachineCreateSchema),
    defaultValues: {
      serialNumber: "",
      location: "",
      status: MachineStatus.ONLINE,
      qrCode: "",
    },
  });

  // Query machines
  const { data: machines = fallbackMachines, isLoading } = useQuery<IMachine[]>({
    queryKey: ["machines"],
    queryFn: async () => {
      try {
        const response = await apiClient.get("/machines");
        return response.data.data;
      } catch {
        return fallbackMachines;
      }
    },
  });

  // Mutation to create machine
  const createMutation = useMutation({
    mutationFn: async (newMachine: MachineCreateDto) => {
      const response = await apiClient.post("/machines", newMachine);
      return response.data;
    },
    onSuccess: () => {
      toast.success("Machine registered successfully");
      queryClient.invalidateQueries({ queryKey: ["machines"] });
      reset();
      setIsDrawerOpen(false);
    },
    onError: (error: any) => {
      const msg = error.response?.data?.message || "Failed to register machine";
      toast.error(msg);
    },
  });

  const onSubmit = (data: MachineCreateDto) => {
    createMutation.mutate(data);
  };

  const filteredMachines = machines.filter((machine) => {
    const q = searchQuery.toLowerCase();
    const matchesQuery =
      machine.serialNumber.toLowerCase().includes(q) ||
      machine.location.toLowerCase().includes(q) ||
      machine.qrCode.toLowerCase().includes(q);

    const matchesStatus =
      statusFilter === "ALL" || machine.status === statusFilter;

    return matchesQuery && matchesStatus;
  });

  return (
    <div className="w-full px-4 py-4 space-y-4 font-sans">
      {/* 1. Top Navigation Bar with Back Button */}
      <div className="flex items-center justify-between pt-1">
        <button
          onClick={() => router.push("/locations")}
          className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground hover:text-foreground active:scale-95 transition-transform"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Locations & Stores</span>
        </button>

        <div className="flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full">
          <Boxes className="h-3.5 w-3.5" />
          <span>Fleet Admin</span>
        </div>
      </div>

      {/* 2. Header Title */}
      <div className="p-4 rounded-2xl bg-muted/40 border border-border/50 space-y-1 shadow-xs">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-black tracking-tight text-foreground">
              Vending Machine Fleet
            </h1>
            <p className="text-xs text-muted-foreground">
              All physical hardware units, QR identifiers, and live cash balances.
            </p>
          </div>
          <div className="h-10 w-10 rounded-2xl bg-emerald-500/20 flex items-center justify-center text-emerald-600 shrink-0">
            <Server className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* 3. Action: Register Machine Button */}
      <Button
        onClick={() => setIsDrawerOpen(true)}
        className="w-full h-12 rounded-2xl bg-primary text-primary-foreground font-bold text-xs gap-2 shadow-md shadow-primary/20 active:scale-[0.98] transition-transform"
      >
        <Plus className="h-4 w-4 stroke-[3]" />
        <span>+ REGISTER NEW MACHINE</span>
      </Button>

      {/* 4. Search & Filter Bar */}
      <div className="space-y-2">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search serial, location, or QR..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-11 rounded-2xl bg-card border-border/50 text-xs shadow-xs"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5">
          {[
            { id: "ALL", label: "All Units" },
            { id: MachineStatus.ONLINE, label: "Online" },
            { id: MachineStatus.OFFLINE, label: "Offline" },
          ].map((tab) => {
            const isActive = statusFilter === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id)}
                className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all active:scale-95 ${
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

      {/* 5. Mobile Compact Machine Cards (Screen 5 Style) */}
      <div className="space-y-3 pt-1">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Deployed Units ({filteredMachines.length})
          </h2>
          <span className="text-[11px] text-muted-foreground font-mono">
            {machines.filter((m) => m.status === MachineStatus.ONLINE).length} Online
          </span>
        </div>

        {isLoading ? (
          <div className="flex h-32 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : filteredMachines.length === 0 ? (
          <div className="text-center py-12 space-y-2 bg-card rounded-2xl border border-border/50 p-6">
            <Server className="h-8 w-8 text-muted-foreground mx-auto" />
            <p className="text-sm font-bold text-foreground">No machines found</p>
            <p className="text-xs text-muted-foreground">Try clearing filters or register a new unit.</p>
          </div>
        ) : (
          filteredMachines.map((machine) => {
            const isOnline = machine.status === MachineStatus.ONLINE;

            return (
              <Card
                key={machine.id}
                className="border-border/50 bg-card shadow-xs hover:border-border/80 active:scale-[0.98] transition-all overflow-hidden"
              >
                <CardContent className="p-4 space-y-3">
                  {/* Top Row: Serial & Status Pill */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="h-9 w-9 rounded-xl bg-muted/60 flex items-center justify-center text-primary shrink-0 shadow-xs">
                        <Boxes className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-bold text-sm text-foreground block">
                            {machine.serialNumber}
                          </span>
                          {machine.keyNumber && (
                            <span className="text-[10px] font-mono text-amber-600 dark:text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded font-semibold flex items-center gap-0.5">
                              <KeyRound className="h-2.5 w-2.5" />
                              <span>{machine.keyNumber}</span>
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-muted-foreground font-mono">
                          ID: {machine.id}
                        </span>
                      </div>
                    </div>

                    <div className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-bold bg-muted/50 border border-border/40">
                      <span
                        className={`h-2 w-2 rounded-full ${
                          isOnline ? "bg-emerald-500 animate-pulse" : "bg-rose-500"
                        }`}
                      />
                      <span
                        className={
                          isOnline
                            ? "text-emerald-700 dark:text-emerald-400 font-bold"
                            : "text-rose-700 dark:text-rose-400 font-bold"
                        }
                      >
                        {machine.status}
                      </span>
                    </div>
                  </div>

                  {/* Middle Row: Location */}
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground pt-0.5">
                    <MapPin className="h-3.5 w-3.5 text-muted-foreground/70 shrink-0" />
                    <span className="truncate">{machine.location}</span>
                  </div>

                  {/* Bottom Row: Cash Balance & Quick Action Links */}
                  <div className="flex items-center justify-between pt-2 border-t border-border/40 text-xs">
                    <div className="flex items-center gap-1.5 font-bold text-foreground">
                      <Coins className="h-4 w-4 text-amber-500" />
                      <span className="font-mono text-sm">
                        ${Number(machine.virtualCashBalance || 0).toFixed(2)}
                      </span>
                      <span className="text-[10px] font-normal text-muted-foreground">
                        cash
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Link
                        href={`/machines/${machine.id}/qr`}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-accent/60 hover:bg-accent text-foreground text-[11px] font-bold transition-colors shadow-xs"
                      >
                        <QrCode className="h-3 w-3 text-primary" />
                        <span>QR Code</span>
                      </Link>

                      <Link
                        href={`/machine/${machine.serialNumber}`}
                        className="h-8 w-8 rounded-xl bg-primary/15 hover:bg-primary/25 flex items-center justify-center text-primary transition-colors shadow-xs"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Link>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* 6. Vaul Bottom Drawer: Register Machine Form */}
      <Drawer open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
        <DrawerContent className="max-w-md mx-auto rounded-t-[28px] p-6 space-y-4 max-h-[85vh] flex flex-col">
          <DrawerHeader className="p-0 text-left shrink-0">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-xl bg-primary/20 flex items-center justify-center text-primary">
                <Server className="h-4 w-4" />
              </div>
              <DrawerTitle className="text-lg font-bold text-foreground">
                Register New Machine
              </DrawerTitle>
            </div>
            <DrawerDescription className="text-xs text-muted-foreground">
              Add a new physical unit to your fleet with a unique serial and QR code.
            </DrawerDescription>
          </DrawerHeader>

          <form
            onSubmit={handleSubmit(onSubmit)}
            className="space-y-3.5 overflow-y-auto flex-1 pr-1 pt-1"
          >
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                Serial Number *
              </label>
              <Input
                placeholder="e.g. VM-NY-015"
                className="h-11 rounded-xl text-xs bg-muted/30 border-border/60"
                {...register("serialNumber")}
              />
              {errors.serialNumber && (
                <p className="text-[11px] text-destructive font-medium">{errors.serialNumber.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                Physical Location *
              </label>
              <Input
                placeholder="e.g. JFK Terminal 4 - Gate B22"
                className="h-11 rounded-xl text-xs bg-muted/30 border-border/60"
                {...register("location")}
              />
              {errors.location && (
                <p className="text-[11px] text-destructive font-medium">{errors.location.message}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  QR Code Identifier *
                </label>
                <Input
                  placeholder="e.g. QR-NY-015"
                  className="h-11 rounded-xl text-xs bg-muted/30 border-border/60"
                  {...register("qrCode")}
                />
                {errors.qrCode && (
                  <p className="text-[11px] text-destructive font-medium">{errors.qrCode.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Key Number
                </label>
                <Input
                  placeholder="e.g. K-101"
                  className="h-11 rounded-xl text-xs bg-muted/30 border-border/60 font-mono"
                  {...register("keyNumber")}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                Initial Status
              </label>
              <select
                className="flex h-11 w-full rounded-xl border border-border/60 bg-muted/30 px-3 text-xs font-bold text-foreground shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                {...register("status")}
              >
                <option value={MachineStatus.ONLINE}>ONLINE</option>
                <option value={MachineStatus.OFFLINE}>OFFLINE</option>
              </select>
            </div>

            <DrawerFooter className="p-0 pt-4 gap-2">
              <Button
                type="submit"
                className="w-full h-12 rounded-2xl bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 font-bold text-sm shadow-md active:scale-[0.97]"
                disabled={createMutation.isPending}
              >
                {createMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Register Vending Machine"
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
