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
import { useCurrency } from "@/hooks/useTenantSettings";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
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
  Boxes,
  TrendingDown,
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
  const { format: formatMoney, symbol } = useCurrency();

  // 1. Query Machine Data
  const { data: machine, refetch: refetchMachine } = useQuery<IMachine>({
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
          virtualCashBalance: 0,
          currentEstimatedStock: 0,
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
  const { data: machineLogs = [], refetch: refetchLogs } = useQuery<any[]>({
    queryKey: ["machine-logs", machineId],
    queryFn: async () => {
      try {
        const res = await apiClient.get(`/inventory/logs?machineId=${machine?.id || machineId}`);
        return res.data.data;
      } catch {
        return [];
      }
    },
    enabled: !!machineId,
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

  // Machine Pricing & Dynamic Stock Values
  const machinePricePerPlay = Number(machine?.pricePerPlay || 1.00) || 1.00;

  // Single source of truth: read directly from the backend's unified calculation
  // (GET /machines/:id) instead of recomputing independently from machineLogs.
  // This is the exact same formula used by the fleet list and dashboard endpoints,
  // so this figure can never drift from what an admin sees for the same machine.
  // It still updates instantly after a mutation because invalidateAndRefetchAll()
  // invalidates and refetches the ["machine", machineId] query below.
  const currentEstimatedStock = machine?.currentEstimatedStock ?? 0;
  const virtualCashBalance = Number(machine?.virtualCashBalance ?? 0);

  // Cash Collect real-time calculation & overage guardrail
  const enteredCashAmount = Number(cashForm.watch("collectedAmount") || 0);
  const isCashOverage = enteredCashAmount > virtualCashBalance;
  const approxUnitsSold = Math.floor(enteredCashAmount / machinePricePerPlay);

  // Selected Packet for piece calculation
  const selectedPacketId = standardForm.watch("packetId") || packets[0]?.id;
  const selectedPacket = packets.find((p) => p.id === selectedPacketId);
  const packetCount = Number(standardForm.watch("quantity") || 1);
  const totalCalculatedPieces = selectedPacket
    ? packetCount * selectedPacket.quantityPerPacket
    : 0;

  // Invalidate and refetch all related machine and log queries
  const invalidateAndRefetchAll = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["machine"] }),
      queryClient.invalidateQueries({ queryKey: ["machine", machineId] }),
      queryClient.invalidateQueries({ queryKey: ["machines"] }),
      queryClient.invalidateQueries({ queryKey: ["machine-logs"] }),
      queryClient.invalidateQueries({ queryKey: ["machine-logs", machineId] }),
      queryClient.invalidateQueries({ queryKey: ["inventory-logs"] }),
      queryClient.invalidateQueries({ queryKey: ["cash-logs"] }),
      queryClient.invalidateQueries({ queryKey: ["reports"] }),
      queryClient.invalidateQueries({ queryKey: ["dashboard-metrics"] }),
    ]);
    refetchMachine();
    refetchLogs();
    router.refresh();
  };

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
      invalidateAndRefetchAll();
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
      invalidateAndRefetchAll();
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
        `Cash Collect Processed: ${formatMoney(data.data.collectedAmount)} collected. Virtual balance reset!`
      );
      cashForm.reset();
      setCashDropConfirmOpen(false);
      invalidateAndRefetchAll();
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || "Cash collect failed");
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
      await apiClient.post("/inventory/reverse", {
        logId: reversalTarget.id,
        remarks: reversalRemarks.trim(),
      });

      toast.success("Log successfully reversed with offset adjustment!");
      setReversalTarget(null);
      setReversalRemarks("");
      invalidateAndRefetchAll();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to reverse log entry");
    } finally {
      setIsReversing(false);
    }
  };

  const handleCashFormSubmit = (data: CashCollectionInput) => {
    if (isCashOverage && (!data.remarks || !data.remarks.trim())) {
      cashForm.setError("remarks", {
        type: "manual",
        message: `Reason required: Amount (${formatMoney(data.collectedAmount)}) exceeds virtual cash balance (${formatMoney(virtualCashBalance)}).`,
      });
      toast.error("A mandatory reason is required for cash collections exceeding the virtual balance.");
      return;
    }
    setPendingCashAmount(data.collectedAmount);
    setCashDropConfirmOpen(true);
  };

  // Unauthenticated Route Guard (403 Forbidden). Placed after every hook call
  // above — not before — so the set of hooks run is identical on every render
  // regardless of auth state. React Hooks must never be called conditionally.
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
            <span className="font-bold text-amber-500 text-sm font-mono">
              {formatMoney(virtualCashBalance)}
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
            <span>Cash Collect</span>
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
          {/* Prominent Current Estimated Stock Card */}
          <Card className="border-border/70 bg-gradient-to-br from-card via-card/95 to-primary/5 shadow-xs overflow-hidden">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    <Boxes className="h-3.5 w-3.5 text-primary" />
                    <span>Current Estimated Stock</span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-black tracking-tight text-foreground font-mono">
                      {currentEstimatedStock}
                    </span>
                    <span className="text-xs font-semibold text-muted-foreground">
                      pieces inside
                    </span>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-1">
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                      currentEstimatedStock === 0
                        ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20"
                        : currentEstimatedStock < 20
                        ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                        : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                    }`}
                  >
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${
                        currentEstimatedStock === 0
                          ? "bg-rose-500"
                          : currentEstimatedStock < 20
                          ? "bg-amber-500"
                          : "bg-emerald-500"
                      }`}
                    />
                    {currentEstimatedStock === 0
                      ? "Empty / Depleted"
                      : currentEstimatedStock < 20
                      ? "Low Stock"
                      : "Sufficient"}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    Cap: {machine?.capacity || 100} pcs • {formatMoney(machinePricePerPlay)}/play
                  </span>
                </div>
              </div>

              {/* Progress bar / Stock ratio */}
              <div className="space-y-1">
                <div className="w-full bg-muted/80 rounded-full h-2 overflow-hidden">
                  <div
                    className={`h-full transition-all duration-500 rounded-full ${
                      currentEstimatedStock < 20
                        ? "bg-amber-500"
                        : "bg-primary"
                    }`}
                    style={{
                      width: `${Math.min(
                        100,
                        Math.max(
                          0,
                          Math.round(
                            (currentEstimatedStock /
                              (machine?.capacity || 100)) *
                              100
                          )
                        )
                      )}%`,
                    }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-muted-foreground font-medium pt-0.5">
                  <span>
                    Refilled: +{(machine as any)?.totalRestockedUnits ?? currentEstimatedStock} pcs
                  </span>
                  <span>
                    Dispensed: -{(machine as any)?.totalUnitsSold ?? 0} pcs ({formatMoney((machine as any)?.totalCashCollected ?? 0)})
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

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
                          {pkt.name} ({pkt.quantityPerPacket} pcs/pkt - {formatMoney(pkt.pricePerItem)})
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

        {/* TAB 2: CASH COLLECT */}
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
                      {currentEstimatedStock} pcs @ {formatMoney(machinePricePerPlay)}/play
                    </span>
                  </div>
                  <span className="text-lg font-bold text-amber-600 dark:text-amber-400 font-mono">
                    {formatMoney(virtualCashBalance)}
                  </span>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-foreground">
                      Physical Cash Collected ({symbol}) *
                    </label>
                    <span className="text-[10px] text-muted-foreground">
                      Rate: {formatMoney(machinePricePerPlay)} / item
                    </span>
                  </div>
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
                  {enteredCashAmount > 0 && (
                    <div className="rounded-xl bg-muted/60 border border-border/50 p-2.5 flex items-center justify-between text-xs animate-in fade-in slide-in-from-top-1 duration-200">
                      <span className="text-muted-foreground flex items-center gap-1.5 font-medium">
                        <TrendingDown className="h-3.5 w-3.5 text-amber-500" />
                        <span>Depletion Feedback:</span>
                      </span>
                      <span className="font-bold text-foreground">
                        Equals approx.{" "}
                        <span className="text-amber-600 dark:text-amber-400 font-mono font-black">
                          {approxUnitsSold}
                        </span>{" "}
                        units sold
                      </span>
                    </div>
                  )}

                  {/* Overage Warning Badge */}
                  {isCashOverage && (
                    <div className="flex items-center gap-1.5 text-xs text-amber-700 dark:text-amber-400 font-semibold bg-amber-500/10 px-3 py-2 rounded-xl border border-amber-500/30 animate-in fade-in slide-in-from-top-1 duration-200">
                      <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
                      <span>Amount exceeds expected balance. Reason required.</span>
                    </div>
                  )}
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label
                      className={`text-xs font-semibold ${
                        isCashOverage
                          ? "text-amber-700 dark:text-amber-400 flex items-center gap-1"
                          : "text-muted-foreground"
                      }`}
                    >
                      {isCashOverage ? (
                        <>
                          <AlertTriangle className="h-3 w-3" />
                          <span>Mandatory Reason for Discrepancy *</span>
                        </>
                      ) : (
                        "Optional Collection Notes"
                      )}
                    </label>
                    {isCashOverage && (
                      <span className="text-[10px] font-bold text-amber-700 dark:text-amber-400 bg-amber-500/15 px-1.5 py-0.5 rounded">
                        Required (&gt; {formatMoney(virtualCashBalance)})
                      </span>
                    )}
                  </div>
                  <Input
                    placeholder={
                      isCashOverage
                        ? "State reason (e.g. Unjammed extra bills / customer overpay / testing)"
                        : "e.g. Bag seal #8812 - clean coin chute"
                    }
                    className={`h-10 rounded-xl text-xs ${
                      isCashOverage
                        ? "border-amber-500/50 bg-amber-500/5 focus-visible:ring-amber-500"
                        : ""
                    }`}
                    {...cashForm.register("remarks")}
                  />
                  {cashForm.formState.errors.remarks && (
                    <p className="text-xs text-destructive font-medium">
                      {cashForm.formState.errors.remarks.message}
                    </p>
                  )}
                </div>

                <Button
                  type="submit"
                  className="w-full h-12 text-sm font-bold shadow-md shadow-primary/20 rounded-xl"
                  disabled={cashMutation.isPending}
                >
                  {cashMutation.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Submit Cash Collect
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
                Chronological audit trail. Only the most recent restock entry can be reversed.
              </CardDescription>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              {machineLogs.length === 0 ? (
                <div className="p-6 text-center text-xs text-muted-foreground">
                  No recent activity recorded for this machine yet.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {machineLogs.map((log: any, index: number) => {
                    const isCash =
                      log.logType === "CASH" ||
                      log.entryType === "CASH_DROP" ||
                      log.entryType === "CASH_COLLECT";
                    const isStandard = log.entryType === EntryType.STANDARD;
                    const isReverse = log.entryType === EntryType.REVERSE;

                    // Condition 1: NEVER show Reverse for Cash Collect
                    // Condition 2: ONLY show Reverse for the MOST RECENT entry (index 0) if it is an Inventory Restock (Standard or Manual)
                    const canReverse = index === 0 && !isCash && !isReverse;

                    if (isCash) {
                      return (
                        <div
                          key={log.id}
                          className="rounded-xl border border-amber-500/30 p-3.5 text-xs space-y-2 bg-gradient-to-r from-amber-500/5 via-card to-card hover:border-amber-500/50 transition-colors shadow-xs"
                        >
                          <div className="flex items-center justify-between">
                            <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30">
                              <Coins className="h-3 w-3 text-amber-600 dark:text-amber-400" />
                              <span>CASH COLLECT</span>
                            </span>
                            <span className="font-mono font-black text-amber-600 dark:text-amber-400 text-sm">
                              {formatMoney(Number(log.collectedAmount || 0))}
                            </span>
                          </div>

                          <p className="text-foreground font-medium leading-snug">
                            {log.remarks || "Physical cash collection recorded from coin mechanism."}
                          </p>

                          {Number(log.discrepancy || 0) !== 0 && (
                            <div className="flex items-center gap-1 text-[10px] text-rose-600 dark:text-rose-400 font-semibold bg-rose-500/10 px-2 py-1 rounded-lg border border-rose-500/20">
                              <AlertTriangle className="h-3 w-3 shrink-0" />
                              <span>
                                Ledger Discrepancy: -{formatMoney(Math.abs(Number(log.discrepancy)))} (Expected: {formatMoney(Number(log.expectedAmount || 0))})
                              </span>
                            </div>
                          )}

                          <div className="flex items-center justify-between pt-1.5 border-t border-amber-500/20 text-[10px] text-muted-foreground">
                            <div className="flex items-center gap-1 font-mono">
                              <Clock className="h-3 w-3 text-muted-foreground/70" />
                              <span>
                                {new Date(log.createdAt).toLocaleTimeString([], {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}{" "}
                                •{" "}
                                {new Date(log.createdAt).toLocaleDateString([], {
                                  month: "short",
                                  day: "numeric",
                                })}
                              </span>
                            </div>
                            <span className="font-medium text-foreground/80">
                              {log.agent?.name || "Field Technician"}
                            </span>
                          </div>
                        </div>
                      );
                    }

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
                          <div className="flex items-center gap-1 font-mono">
                            <Clock className="h-3 w-3 text-muted-foreground/70" />
                            <span>
                              {new Date(log.createdAt).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}{" "}
                              •{" "}
                              {new Date(log.createdAt).toLocaleDateString([], {
                                month: "short",
                                day: "numeric",
                              })}
                            </span>
                          </div>

                          {canReverse && (
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

      {/* DIALOG: CONFIRM CASH COLLECT */}
      <Dialog
        open={cashDropConfirmOpen}
        onOpenChange={setCashDropConfirmOpen}
      >
        <DialogContent className="max-w-md w-[92vw] rounded-2xl p-6 bg-background border border-border/60 shadow-2xl z-50">
          <DialogHeader className="text-left pb-1 space-y-1">
            <DialogTitle className="flex items-center gap-2 text-base font-bold">
              <Coins className="h-5 w-5 text-amber-500" />
              <span>Confirm Cash Collection</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Please verify the physical currency counted. Finalizing will reset the machine&apos;s virtual ledger balance.
            </DialogDescription>
          </DialogHeader>

          <div className="py-3 space-y-2.5 text-xs">
            <div className="flex justify-between p-3 rounded-xl bg-muted/60 border border-border/40">
              <span className="font-medium">Expected Ledger Balance:</span>
              <span className="font-bold font-mono">
                {formatMoney(virtualCashBalance)}
              </span>
            </div>
            <div className="flex justify-between p-3 rounded-xl bg-primary/10 border border-primary/30">
              <span className="font-semibold text-primary">Counted Cash:</span>
              <span className="font-bold font-mono text-primary">
                {formatMoney(Number(pendingCashAmount || 0))}
              </span>
            </div>
            {virtualCashBalance !== Number(pendingCashAmount || 0) && (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-400 text-xs flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>
                  Discrepancy:{" "}
                  <strong>
                    {formatMoney(
                      virtualCashBalance -
                      Number(pendingCashAmount || 0)
                    )}
                  </strong>
                </span>
              </div>
            )}

            {cashForm.getValues("remarks") && (
              <div className="p-3 rounded-xl bg-muted/50 border border-border/50 text-xs space-y-0.5">
                <span className="font-semibold text-muted-foreground block text-[10px] uppercase tracking-wider">
                  {Number(pendingCashAmount || 0) > virtualCashBalance
                    ? "Mandatory Discrepancy Reason"
                    : "Collection Notes"}
                </span>
                <p className="text-foreground italic">&quot;{cashForm.getValues("remarks")}&quot;</p>
              </div>
            )}
          </div>

          <DialogFooter className="pt-2 flex flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => setCashDropConfirmOpen(false)}
              className="w-full sm:w-auto h-11 rounded-xl text-xs font-semibold"
            >
              Cancel
            </Button>
            <Button
              className="w-full sm:w-auto h-11 text-xs font-bold shadow-md shadow-primary/20 rounded-xl"
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
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIALOG: ERROR REVERSAL */}
      <Dialog
        open={!!reversalTarget}
        onOpenChange={(open) => !open && setReversalTarget(null)}
      >
        <DialogContent className="max-w-md w-[92vw] rounded-2xl p-6 bg-background border border-border/60 shadow-2xl z-50">
          <DialogHeader className="text-left pb-1 space-y-1">
            <DialogTitle className="flex items-center gap-2 text-base font-bold text-rose-600 dark:text-rose-400">
              <ShieldAlert className="h-5 w-5 shrink-0" />
              <span>Reverse Mistaken Log Entry</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Creates an immutable offset reversal to adjust inventory counts without deleting audit trail history.
            </DialogDescription>
          </DialogHeader>

          {reversalTarget && (
            <div className="py-2 space-y-3">
              <div className="p-3 rounded-xl bg-muted/60 border border-border/40 text-xs space-y-1.5">
                <p className="font-semibold text-foreground">Original Entry:</p>
                <p className="text-muted-foreground">{reversalTarget.remarks || "No remarks provided"}</p>
                <div className="flex items-center justify-between pt-1 border-t border-border/30">
                  <span className="text-muted-foreground">Offset adjustment:</span>
                  <span className="font-mono font-bold text-rose-600 dark:text-rose-400">
                    -{reversalTarget.quantityAdded} pieces
                  </span>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Reason for Reversal (Mandatory &ge; 5 chars) *
                </label>
                <Textarea
                  placeholder="e.g. Mistakenly entered quantity from adjacent machine"
                  value={reversalRemarks}
                  onChange={(e) => setReversalRemarks(e.target.value)}
                  className="min-h-[85px] text-xs rounded-xl bg-muted/20 border-border/60"
                />
              </div>
            </div>
          )}

          <DialogFooter className="pt-2 flex flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => setReversalTarget(null)}
              className="w-full sm:w-auto h-11 rounded-xl text-xs font-semibold"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              className="w-full sm:w-auto h-11 text-xs font-bold shadow-md rounded-xl"
              onClick={handleExecuteReversal}
              disabled={isReversing}
            >
              {isReversing && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Confirm Reversal Entry
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
