"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  RestockSchema,
  RestockInput,
  ManualEntrySchema,
  ManualEntryInput,
  CashCollectionSchema,
  CashCollectionInput,
} from "@vending/validation";
import { EntryType, IMachine, IPacketConfig } from "@vending/shared-types";
import { api as apiClient } from "@/lib/api";
import { useAuthStore } from "@/store/useAuthStore";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerClose,
} from "@/components/ui/drawer";
import {
  PackageOpen,
  Coins,
  ClipboardList,
  Layers,
  Sparkles,
  AlertTriangle,
  RotateCcw,
  ArrowLeft,
  Loader2,
  Clock,
  ShieldAlert,
  Lock,
} from "lucide-react";

export default function MachineOperationPage() {
  const params = useParams();
  const router = useRouter();
  const machineId = params.machineId as string;
  const queryClient = useQueryClient();
  const { user, token, isAuthenticated } = useAuthStore();
  const [hasCheckedAuth, setHasCheckedAuth] = useState(false);

  useEffect(() => {
    setHasCheckedAuth(true);
  }, []);

  const [activeTab, setActiveTab] = useState("restock");
  const [isManualRestock, setIsManualRestock] = useState(false);
  const [reversalTarget, setReversalTarget] = useState<any | null>(null);
  const [reversalRemarks, setReversalRemarks] = useState("");
  const [isReversing, setIsReversing] = useState(false);
  const [cashDropConfirmOpen, setCashDropConfirmOpen] = useState(false);
  const [pendingCashAmount, setPendingCashAmount] = useState<number | null>(null);

  // Unauthenticated Route Guard State (403 Forbidden)
  if (hasCheckedAuth && (!isAuthenticated || !token)) {
    return (
      <div className="w-full min-h-[520px] flex flex-col items-center justify-center text-center p-6 space-y-5">
        <div className="h-16 w-16 rounded-3xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center ring-8 ring-rose-500/10 shadow-lg">
          <ShieldAlert className="h-8 w-8" />
        </div>

        <div className="space-y-2 max-w-xs">
          <span className="text-[10px] font-black uppercase tracking-widest text-rose-500 bg-rose-500/10 px-2.5 py-1 rounded-full inline-block">
            403 • Restricted Route
          </span>
          <h1 className="text-xl font-black tracking-tight text-foreground">
            Technician Login Required
          </h1>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Machine <strong>#{machineId}</strong> telemetry & refill operations are restricted to authorized field technicians.
          </p>
        </div>

        <div className="w-full max-w-xs space-y-2.5 pt-2">
          <Button
            onClick={() =>
              router.push(`/login?redirect=/machine/${encodeURIComponent(machineId)}`)
            }
            className="w-full h-12 rounded-2xl bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 font-bold text-sm shadow-md active:scale-[0.98]"
          >
            Sign In as Field Agent
          </Button>

          <Button
            variant="outline"
            onClick={() => router.push("/")}
            className="w-full h-11 rounded-xl text-xs font-semibold"
          >
            Return to Home
          </Button>
        </div>
      </div>
    );
  }


  // 1. Query Machine Data
  const { data: machine } = useQuery<IMachine>({
    queryKey: ["machine", machineId],
    queryFn: async () => {
      try {
        const res = await apiClient.get(`/machines/${encodeURIComponent(machineId)}`);
        return res.data.data;
      } catch {
        // Fallback demo data
        return {
          id: machineId,
          tenantId: "tenant-demo",
          serialNumber: machineId.toUpperCase(),
          location: "Terminal Station - Platform 1",
          status: "ONLINE" as any,
          qrCode: `QR-${machineId}`,
          virtualCashBalance: 450.0,
          createdAt: new Date().toISOString(),
        };
      }
    },
  });

  // 2. Query Packets Master Data
  const { data: packets = [] } = useQuery<IPacketConfig[]>({
    queryKey: ["packets"],
    queryFn: async () => {
      try {
        const res = await apiClient.get("/packets");
        return res.data.data;
      } catch {
        return [
          {
            id: "pkt-1",
            tenantId: "tenant-demo",
            name: "Gumball 32mm Mega Bag",
            brand: "SweetBall Candy Co.",
            quantityPerPacket: 100,
            pricePerItem: 0.25,
            createdAt: new Date().toISOString(),
          },
          {
            id: "pkt-2",
            tenantId: "tenant-demo",
            name: "Sour Fizz Drops Standard",
            brand: "Novelty Confections",
            quantityPerPacket: 50,
            pricePerItem: 0.5,
            createdAt: new Date().toISOString(),
          },
        ];
      }
    },
  });

  // 3. Query Machine Inventory Logs
  const { data: machineLogs = [] } = useQuery<any[]>({
    queryKey: ["machine-logs", machineId],
    queryFn: async () => {
      try {
        const res = await apiClient.get(`/inventory/logs?machineId=${machine?.id || machineId}`);
        return res.data.data;
      } catch {
        return [];
      }
    },
    enabled: !!machine,
  });

  // Form: Standard Restock
  const standardForm = useForm<RestockInput>({
    resolver: zodResolver(RestockSchema),
    defaultValues: {
      machineId: machine?.id || machineId,
      packetId: packets[0]?.id || "pkt-1",
      quantity: 1,
      remarks: "",
    },
  });

  // Form: Manual Restock
  const manualForm = useForm<ManualEntryInput>({
    resolver: zodResolver(ManualEntrySchema),
    defaultValues: {
      machineId: machine?.id || machineId,
      quantityAdded: 50,
      entryType: EntryType.MANUAL,
      remarks: "",
      brandName: "",
    },
  });

  // Form: Cash Collection
  const cashForm = useForm<CashCollectionInput>({
    resolver: zodResolver(CashCollectionSchema),
    defaultValues: {
      machineId: machine?.id || machineId,
      collectedAmount: 0,
    },
  });

  // Selected Packet for piece calculation
  const selectedPacketId = standardForm.watch("packetId") || packets[0]?.id;
  const selectedPacket = packets.find((p) => p.id === selectedPacketId);
  const packetCount = Number(standardForm.watch("quantity") || 1);
  const totalCalculatedPieces = selectedPacket
    ? packetCount * selectedPacket.quantityPerPacket
    : 0;

  // Mutations
  const standardMutation = useMutation({
    mutationFn: async (payload: RestockInput) => {
      const res = await apiClient.post("/inventory/restock/standard", {
        ...payload,
        machineId: machine?.id || machineId,
      });
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(
        `Standard Restock Logged: +${data.data.totalPiecesAdded} items (${data.data.packetsAdded} packets)`
      );
      standardForm.reset();
      queryClient.invalidateQueries({ queryKey: ["machine-logs", machineId] });
      queryClient.invalidateQueries({ queryKey: ["inventory-logs"] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || "Standard restock failed");
    },
  });

  const manualMutation = useMutation({
    mutationFn: async (payload: ManualEntryInput) => {
      const res = await apiClient.post("/inventory/restock/manual", {
        ...payload,
        machineId: machine?.id || machineId,
      });
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(
        `Manual Entry Logged: ${data.data.quantityAdded > 0 ? "+" : ""}${data.data.quantityAdded} items`
      );
      manualForm.reset();
      queryClient.invalidateQueries({ queryKey: ["machine-logs", machineId] });
      queryClient.invalidateQueries({ queryKey: ["inventory-logs"] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || "Manual restock failed");
    },
  });

  const cashMutation = useMutation({
    mutationFn: async (payload: CashCollectionInput) => {
      const res = await apiClient.post("/inventory/cash-collection", {
        ...payload,
        machineId: machine?.id || machineId,
      });
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(
        `Cash Drop Processed: $${data.data.collectedAmount.toFixed(2)} collected. Virtual balance reset!`
      );
      cashForm.reset();
      setCashDropConfirmOpen(false);
      queryClient.invalidateQueries({ queryKey: ["machine", machineId] });
      queryClient.invalidateQueries({ queryKey: ["machines"] });
      queryClient.invalidateQueries({ queryKey: ["cash-logs"] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || "Cash drop failed");
    },
  });

  // Reversal Execution
  const handleExecuteReversal = async () => {
    if (!reversalTarget) return;
    if (!reversalRemarks.trim() || reversalRemarks.trim().length < 5) {
      toast.error("Reversal remarks are strictly mandatory (min 5 characters)");
      return;
    }

    try {
      setIsReversing(true);
      await apiClient.post("/inventory/restock/manual", {
        machineId: machine?.id || machineId,
        packetId: reversalTarget.packetId || null,
        entryType: EntryType.REVERSE,
        quantityAdded: -Math.abs(reversalTarget.quantityAdded),
        remarks: `Reversal of [Log #${reversalTarget.id.substring(0, 6)}]: ${reversalRemarks.trim()}`,
      });

      toast.success("Log successfully reversed with offset adjustment!");
      setReversalTarget(null);
      setReversalRemarks("");
      queryClient.invalidateQueries({ queryKey: ["machine-logs", machineId] });
      queryClient.invalidateQueries({ queryKey: ["inventory-logs"] });
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to reverse log entry");
    } finally {
      setIsReversing(false);
    }
  };

  const handleCashFormSubmit = (data: CashCollectionInput) => {
    setPendingCashAmount(data.collectedAmount);
    setCashDropConfirmOpen(true);
  };

  return (
    <div className="space-y-4 pb-4">
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
            <h1 className="text-base font-bold tracking-tight text-foreground font-mono truncate">
              {machine?.serialNumber || machineId}
            </h1>
            <span className="flex h-2 w-2 rounded-full bg-emerald-500 shrink-0 ring-4 ring-emerald-500/20" />
          </div>
          <p className="text-xs text-muted-foreground truncate">
            {machine?.location || "Physical Fleet Location"}
          </p>
        </div>
      </div>

      {/* Machine Status Snapshot */}
      <Card className="border-border/50 bg-gradient-to-br from-card via-card/90 to-card/60 shadow-xs">
        <CardContent className="p-3.5 grid grid-cols-2 gap-3 text-xs">
          <div className="flex flex-col space-y-0.5">
            <span className="text-[10px] text-muted-foreground uppercase font-semibold tracking-wider">
              QR Identifier
            </span>
            <span className="font-mono font-bold text-foreground text-xs truncate">
              {machine?.qrCode || `QR-${machineId}`}
            </span>
          </div>
          <div className="flex flex-col items-end space-y-0.5">
            <span className="text-[10px] text-muted-foreground uppercase font-semibold tracking-wider">
              Virtual Cash Balance
            </span>
            <span className="font-bold text-amber-500 text-sm">
              ${Number(machine?.virtualCashBalance || 0).toFixed(2)}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Operation Tabs */}
      <Tabs
        defaultValue="restock"
        value={activeTab}
        onValueChange={setActiveTab}
        className="w-full"
      >
        <TabsList className="grid w-full grid-cols-3 h-12 p-1 bg-muted/60 rounded-2xl border border-border/40">
          <TabsTrigger
            value="restock"
            className="rounded-xl text-xs font-semibold gap-1.5 data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-xs transition-[background-color,color,box-shadow] duration-200"
          >
            <PackageOpen className="h-4 w-4 text-primary" />
            <span>Restock</span>
          </TabsTrigger>
          <TabsTrigger
            value="cash"
            className="rounded-xl text-xs font-semibold gap-1.5 data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-xs transition-[background-color,color,box-shadow] duration-200"
          >
            <Coins className="h-4 w-4 text-amber-500" />
            <span>Cash Drop</span>
          </TabsTrigger>
          <TabsTrigger
            value="audit"
            className="rounded-xl text-xs font-semibold gap-1.5 data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-xs transition-[background-color,color,box-shadow] duration-200"
          >
            <ClipboardList className="h-4 w-4 text-secondary" />
            <span>Audit</span>
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: RESTOCK */}
        <TabsContent value="restock" className="mt-3.5 space-y-3.5 focus-visible:outline-none">
          {/* Mode Switcher */}
          <div className="flex items-center justify-between rounded-xl bg-accent/40 border border-border/40 p-2.5 text-xs">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="font-semibold text-foreground">
                {isManualRestock ? "Manual Item Count" : "Standard Master Packets"}
              </span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsManualRestock(!isManualRestock)}
              className="h-8 text-xs px-3 rounded-lg border-border/80"
            >
              {isManualRestock ? "Switch to Standard" : "Manual / Loose"}
            </Button>
          </div>

          {!isManualRestock ? (
            /* STANDARD PACKET RESTOCK FORM */
            <Card className="border-border/60">
              <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Layers className="h-4 w-4 text-primary" />
                  <span>Standard Packet Restock</span>
                </CardTitle>
                <CardDescription className="text-xs">
                  Fixed batch restocking. System calculates total pieces automatically.
                </CardDescription>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <form
                  onSubmit={standardForm.handleSubmit((d) =>
                    standardMutation.mutate(d)
                  )}
                  className="space-y-4"
                >
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground">
                      Select Master Packet *
                    </label>
                    <select
                      className="flex h-11 w-full rounded-xl border border-input bg-transparent px-3 py-2 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      {...standardForm.register("packetId")}
                    >
                      {packets.map((pkt) => (
                        <option key={pkt.id} value={pkt.id} className="bg-card">
                          {pkt.name} ({pkt.quantityPerPacket} pcs/pkt - ${Number(pkt.pricePerItem).toFixed(2)})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground">
                      Number of Packets *
                    </label>
                    <Input
                      type="number"
                      min={1}
                      placeholder="1"
                      className="h-11 text-base font-semibold rounded-xl"
                      {...standardForm.register("quantity", { valueAsNumber: true })}
                    />
                    {standardForm.formState.errors.quantity && (
                      <p className="text-xs text-destructive">
                        {standardForm.formState.errors.quantity.message}
                      </p>
                    )}
                  </div>

                  {/* Dynamic Calculation Banner */}
                  <div className="rounded-xl border border-primary/30 bg-primary/10 p-3.5 flex items-center justify-between">
                    <span className="text-xs font-medium text-foreground">
                      Calculated Total Units:
                    </span>
                    <span className="text-base font-black text-foreground">
                      +{totalCalculatedPieces} pieces
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">
                      Optional Field Remarks
                    </label>
                    <Input
                      placeholder="e.g. Full restock - verified coin chute"
                      className="h-10 rounded-xl text-xs"
                      {...standardForm.register("remarks")}
                    />
                  </div>

                  <Button
                    type="submit"
                    className="w-full h-12 text-sm font-bold shadow-md shadow-primary/20 rounded-xl"
                    disabled={standardMutation.isPending}
                  >
                    {standardMutation.isPending && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Confirm Standard Restock
                  </Button>
                </form>
              </CardContent>
            </Card>
          ) : (
            /* MANUAL / LOOSE ITEMS RESTOCK FORM */
            <Card className="border-amber-500/30">
              <CardHeader className="pb-2 pt-4 px-4 bg-amber-500/5 rounded-t-2xl">
                <CardTitle className="text-sm font-bold flex items-center gap-2 text-amber-600 dark:text-amber-400">
                  <AlertTriangle className="h-4 w-4" />
                  <span>Manual Item Adjustment</span>
                </CardTitle>
                <CardDescription className="text-xs">
                  For non-standard items or loose refills. Remarks are strictly mandatory (&ge; 5 characters).
                </CardDescription>
              </CardHeader>
              <CardContent className="px-4 py-4">
                <form
                  onSubmit={manualForm.handleSubmit((d) =>
                    manualMutation.mutate(d)
                  )}
                  className="space-y-4"
                >
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground">
                      Exact Piece Count Added *
                    </label>
                    <Input
                      type="number"
                      placeholder="50"
                      className="h-11 text-base font-semibold rounded-xl"
                      {...manualForm.register("quantityAdded", {
                        valueAsNumber: true,
                      })}
                    />
                    {manualForm.formState.errors.quantityAdded && (
                      <p className="text-xs text-destructive">
                        {manualForm.formState.errors.quantityAdded.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground">
                      Brand / Product Name (Optional)
                    </label>
                    <Input
                      placeholder="e.g. Wonka Assorted Loose Candies"
                      className="h-10 rounded-xl text-xs"
                      {...manualForm.register("brandName")}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground flex items-center gap-1 text-destructive">
                      <span>Mandatory Audit Remarks *</span>
                    </label>
                    <Textarea
                      placeholder="Explain reason for manual piece entry (min 5 characters)..."
                      {...manualForm.register("remarks")}
                      className="min-h-[85px] rounded-xl text-xs"
                    />
                    {manualForm.formState.errors.remarks && (
                      <p className="text-xs text-destructive font-medium">
                        {manualForm.formState.errors.remarks.message}
                      </p>
                    )}
                  </div>

                  <Button
                    type="submit"
                    className="w-full h-12 text-sm font-bold bg-amber-600 hover:bg-amber-700 text-white rounded-xl"
                    disabled={manualMutation.isPending}
                  >
                    {manualMutation.isPending && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Log Manual Inventory Entry
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* TAB 2: CASH DROP */}
        <TabsContent value="cash" className="mt-3.5 space-y-3.5 focus-visible:outline-none">
          <Card className="border-border/60">
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Coins className="h-4 w-4 text-amber-500" />
                <span>Physical Cash Collection</span>
              </CardTitle>
              <CardDescription className="text-xs">
                Record actual cash extracted from coin box. Resets virtual ledger balance.
              </CardDescription>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <form
                onSubmit={cashForm.handleSubmit(handleCashFormSubmit)}
                className="space-y-4"
              >
                <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 p-3.5 flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-xs font-medium text-foreground">
                      Expected System Balance:
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      Tracked from standard dispenses
                    </span>
                  </div>
                  <span className="text-lg font-bold text-amber-600 dark:text-amber-400">
                    ${Number(machine?.virtualCashBalance || 0).toFixed(2)}
                  </span>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    Physical Cash Collected ($) *
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    className="h-12 text-lg font-black rounded-xl"
                    {...cashForm.register("collectedAmount", {
                      valueAsNumber: true,
                    })}
                  />
                  {cashForm.formState.errors.collectedAmount && (
                    <p className="text-xs text-destructive">
                      {cashForm.formState.errors.collectedAmount.message}
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">
                    Optional Collection Notes
                  </label>
                  <Input
                    placeholder="e.g. Bag seal #8812 - clean coin chute"
                    className="h-10 rounded-xl text-xs"
                    {...cashForm.register("remarks")}
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full h-12 text-sm font-bold shadow-md shadow-primary/20 rounded-xl"
                  disabled={cashMutation.isPending}
                >
                  {cashMutation.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Submit Cash Drop
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 3: AUDIT & REVERSALS */}
        <TabsContent value="audit" className="mt-3.5 space-y-3.5 focus-visible:outline-none">
          <Card className="border-border/60">
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <ClipboardList className="h-4 w-4 text-secondary" />
                <span>Recent Machine Activity</span>
              </CardTitle>
              <CardDescription className="text-xs">
                Audit trail for this machine. Tap "Reverse" to offset mistaken entries.
              </CardDescription>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              {machineLogs.length === 0 ? (
                <div className="p-6 text-center text-xs text-muted-foreground">
                  No recent logs recorded for this machine yet.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {machineLogs.map((log: any) => {
                    const isStandard = log.entryType === EntryType.STANDARD;
                    const isReverse = log.entryType === EntryType.REVERSE;

                    return (
                      <div
                        key={log.id}
                        className="rounded-xl border border-border/50 p-3.5 text-xs space-y-1.5 bg-card/60 hover:border-border/80 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                              isStandard
                                ? "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                                : isReverse
                                ? "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                                : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                            }`}
                          >
                            {log.entryType}
                          </span>
                          <span
                            className={`font-mono font-black ${
                              log.quantityAdded > 0
                                ? "text-emerald-600 dark:text-emerald-400"
                                : "text-rose-600 dark:text-rose-400"
                            }`}
                          >
                            {log.quantityAdded > 0
                              ? `+${log.quantityAdded}`
                              : log.quantityAdded}{" "}
                            pcs
                          </span>
                        </div>

                        <p className="text-muted-foreground leading-snug">
                          {log.remarks}
                        </p>

                        <div className="flex items-center justify-between pt-1.5 border-t border-border/30 text-[10px] text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            <span>
                              {new Date(log.createdAt).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          </div>

                          {!isReverse && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setReversalTarget(log)}
                              className="h-7 text-[11px] px-2.5 text-rose-600 hover:text-rose-700 hover:bg-rose-500/10 rounded-lg font-semibold"
                            >
                              <RotateCcw className="h-3 w-3 mr-1" />
                              <span>Reverse</span>
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* BOTTOM DRAWER: CONFIRM CASH DROP */}
      <Drawer
        open={cashDropConfirmOpen}
        onOpenChange={setCashDropConfirmOpen}
      >
        <DrawerContent className="p-4 pt-0">
          <DrawerHeader className="text-left px-0 pb-2">
            <DrawerTitle className="flex items-center gap-2 text-base font-bold">
              <Coins className="h-5 w-5 text-amber-500" />
              <span>Confirm Cash Collection Drop</span>
            </DrawerTitle>
            <DrawerDescription className="text-xs">
              Please verify the physical currency counted. Finalizing will reset the machine's virtual ledger balance.
            </DrawerDescription>
          </DrawerHeader>

          <div className="py-3 space-y-2.5 text-xs">
            <div className="flex justify-between p-3 rounded-xl bg-muted/60 border border-border/40">
              <span className="font-medium">Expected Ledger Balance:</span>
              <span className="font-bold font-mono">
                ${Number(machine?.virtualCashBalance || 0).toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between p-3 rounded-xl bg-primary/10 border border-primary/30">
              <span className="font-semibold text-primary-foreground">Counted Cash:</span>
              <span className="font-bold font-mono text-primary-foreground">
                ${Number(pendingCashAmount || 0).toFixed(2)}
              </span>
            </div>
            {Number(machine?.virtualCashBalance || 0) !== Number(pendingCashAmount || 0) && (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-400 text-xs flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>
                  Discrepancy:{" "}
                  <strong>
                    ${(
                      Number(machine?.virtualCashBalance || 0) -
                      Number(pendingCashAmount || 0)
                    ).toFixed(2)}
                  </strong>
                </span>
              </div>
            )}
          </div>

          <DrawerFooter className="px-0 pt-2 flex flex-col gap-2">
            <Button
              className="w-full h-12 text-sm font-bold shadow-md shadow-primary/20 rounded-xl"
              onClick={() => {
                if (pendingCashAmount !== null) {
                  cashMutation.mutate({
                    machineId: machine?.id || machineId,
                    collectedAmount: pendingCashAmount,
                    remarks: cashForm.getValues("remarks"),
                  });
                }
              }}
              disabled={cashMutation.isPending}
            >
              {cashMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Confirm & Reset Ledger
            </Button>
            <DrawerClose asChild>
              <Button variant="outline" className="w-full h-11 rounded-xl">
                Cancel
              </Button>
            </DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      {/* BOTTOM DRAWER: ERROR REVERSAL */}
      <Drawer
        open={!!reversalTarget}
        onOpenChange={(open) => !open && setReversalTarget(null)}
      >
        <DrawerContent className="p-4 pt-0">
          <DrawerHeader className="text-left px-0 pb-2">
            <DrawerTitle className="flex items-center gap-2 text-base font-bold text-rose-600 dark:text-rose-400">
              <ShieldAlert className="h-5 w-5" />
              <span>Reverse Mistaken Log Entry</span>
            </DrawerTitle>
            <DrawerDescription className="text-xs">
              Creates an immutable offset reversal to adjust inventory counts without deleting audit trail history.
            </DrawerDescription>
          </DrawerHeader>

          {reversalTarget && (
            <div className="py-2 space-y-3">
              <div className="p-3 rounded-xl bg-muted/60 border border-border/40 text-xs space-y-1">
                <p className="font-semibold text-foreground">Original Entry:</p>
                <p className="text-muted-foreground">{reversalTarget.remarks}</p>
                <p className="font-bold text-rose-600 dark:text-rose-400 pt-1">
                  Offset adjustment: -{reversalTarget.quantityAdded} pieces
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Reason for Reversal (Mandatory &ge; 5 chars) *
                </label>
                <Textarea
                  placeholder="e.g. Mistakenly entered quantity from adjacent machine"
                  value={reversalRemarks}
                  onChange={(e) => setReversalRemarks(e.target.value)}
                  className="min-h-[85px] text-xs rounded-xl"
                />
              </div>
            </div>
          )}

          <DrawerFooter className="px-0 pt-2 flex flex-col gap-2">
            <Button
              variant="destructive"
              className="w-full h-12 text-sm font-bold shadow-md rounded-xl"
              onClick={handleExecuteReversal}
              disabled={isReversing}
            >
              {isReversing && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Confirm Reversal Entry
            </Button>
            <DrawerClose asChild>
              <Button variant="outline" className="w-full h-11 rounded-xl">
                Cancel
              </Button>
            </DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
