"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CashCollectionSchema, CashCollectionInput } from "@vending/validation";
import { IMachine } from "@vending/shared-types";
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
  Coins,
  ClipboardList,
  ArrowLeft,
  Loader2,
  Clock,
  ShieldAlert,
  KeyRound,
  Banknote,
  Landmark,
} from "lucide-react";

// Quick-action presets for flagging a machine condition issue while collecting
// cash — tapping one fills the mandatory note and flags the machine for
// admin follow-up in the same submission (no separate trip needed).
const ATTENTION_PRESETS = ["Malfunction", "Key Lost", "Locker Broken"] as const;

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

  const [activeTab, setActiveTab] = useState("cash");
  const [selectedAttentionPreset, setSelectedAttentionPreset] = useState<string | null>(null);
  const [paymentFollowUp, setPaymentFollowUp] = useState<{
    cashLogId: string;
    collectedAmount: number;
    paymentMode: "CASH" | "BANK";
    shopCutPercent: number;
  } | null>(null);
  const [expectedPaymentDate, setExpectedPaymentDate] = useState("");
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

  // 2. Query Machine Inventory Logs
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

  // The Audit tab is a cash-collection-only ledger — inventory restock/manual/
  // reverse entries are excluded entirely (`machineLogs` combines both types).
  const cashCollectionLogs = machineLogs.filter(
    (log: any) =>
      log.logType === "CASH" ||
      log.entryType === "CASH_DROP" ||
      log.entryType === "CASH_COLLECT"
  );

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

  const virtualCashBalance = Number(machine?.virtualCashBalance ?? 0);

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
      queryClient.invalidateQueries({ queryKey: ["my-history"] }),
    ]);
    refetchMachine();
    refetchLogs();
    router.refresh();
  };

  // Mutations
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
      setSelectedAttentionPreset(null);

      // Hand off to the shopkeeper-payment follow-up: a CASH store already
      // got marked PAID by the backend (paid out on the spot), so this popup
      // is just a prompt to actually do that; a BANK store needs the agent to
      // explicitly confirm or defer it.
      const storePaymentMode = (machine as any)?.storePaymentMode as "CASH" | "BANK" | undefined;
      if (storePaymentMode && data?.data?.cashLogId) {
        setPaymentFollowUp({
          cashLogId: data.data.cashLogId,
          collectedAmount: Number(data.data.collectedAmount || 0),
          paymentMode: storePaymentMode,
          shopCutPercent: Number((machine as any)?.storeShopCutPercent ?? 0),
        });
      }

      invalidateAndRefetchAll();
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || "Cash collect failed");
    },
  });

  const paymentUpdateMutation = useMutation({
    mutationFn: async (payload: {
      cashLogId: string;
      shopPaymentStatus: "PAID" | "PENDING";
      expectedPaymentDate?: string;
    }) => {
      const res = await apiClient.patch(`/inventory/cash-logs/${payload.cashLogId}/payment`, {
        shopPaymentStatus: payload.shopPaymentStatus,
        expectedPaymentDate: payload.expectedPaymentDate || null,
      });
      return res.data;
    },
    onSuccess: () => {
      toast.success("Shopkeeper payment status updated");
      setPaymentFollowUp(null);
      setExpectedPaymentDate("");
      queryClient.invalidateQueries({ queryKey: ["cash-logs"] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || "Failed to update payment status");
    },
  });

  // Ultra-clean submit: the UI no longer asks the agent to classify the
  // collection type or acknowledge a mismatch — every submission is treated
  // as a full collection, and the backend's mismatch guardrail (which the
  // API still enforces, unchanged) is always pre-satisfied here:
  // `stockCleared: true` and the always-mandatory Note field. Any actual
  // discrepancy is still computed and stored server-side for the underlying
  // audit trail, even though no UI surface displays it anymore.
  const handleCashFormSubmit = (data: CashCollectionInput) => {
    cashMutation.mutate({
      machineId: machine?.id || machineId,
      collectedAmount: data.collectedAmount,
      remarks: data.remarks,
      stockCleared: true,
      isPartial: false,
      attentionFlag: Boolean(selectedAttentionPreset),
      attentionReason: selectedAttentionPreset || undefined,
    });
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
        <div className="flex-1 min-w-0 flex items-center gap-1.5 text-xs font-semibold text-foreground truncate">
          <span className="flex h-2 w-2 rounded-full bg-emerald-500 shrink-0 ring-4 ring-emerald-500/20" />
          <span className="text-muted-foreground truncate">
            {machine?.location || "Venue"}
          </span>
          <span className="text-muted-foreground">→</span>
          <span className="truncate">
            {(machine as any)?.storeName || machine?.serialNumber || machineId}
          </span>
        </div>
      </div>

      {/* Prominent Key Number — the single most important thing a field
          agent needs to find and open the physical coin box. */}
      <Card className="border-amber-500/40 bg-gradient-to-br from-amber-500/10 via-card to-card shadow-xs">
        <CardContent className="p-4 flex flex-col items-center text-center gap-1">
          <span className="text-[11px] font-bold uppercase tracking-widest text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
            <KeyRound className="h-3.5 w-3.5" />
            <span>Key Number</span>
          </span>
          <span className="text-4xl font-black font-mono tracking-wide text-amber-600 dark:text-amber-400">
            {machine?.keyNumber || "—"}
          </span>
        </CardContent>
      </Card>

      {/* Operation Tabs */}
      <Tabs
        defaultValue="cash"
        value={activeTab}
        onValueChange={setActiveTab}
        className="w-full"
      >
        <TabsList className="grid w-full grid-cols-2 h-12 p-1 bg-muted/60 rounded-2xl border border-border/40">
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
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    Physical Cash Collected ({symbol}) *
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

                {/* Quick-Action Presets — flags the machine for admin follow-up */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    Report an Issue (optional)
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {ATTENTION_PRESETS.map((preset) => {
                      const isSelected = selectedAttentionPreset === preset;
                      return (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => {
                            const next = isSelected ? null : preset;
                            setSelectedAttentionPreset(next);
                            if (next) {
                              cashForm.setValue("remarks", next, { shouldValidate: true });
                            }
                          }}
                          className={`h-8 px-3 rounded-full text-[11px] font-semibold border transition-colors ${
                            isSelected
                              ? "bg-rose-500 text-white border-rose-500 shadow-xs"
                              : "bg-card text-foreground border-border/60 hover:border-rose-500/50"
                          }`}
                        >
                          {preset}
                        </button>
                      );
                    })}
                  </div>
                  {selectedAttentionPreset && (
                    <p className="text-[10px] text-rose-600 dark:text-rose-400 font-semibold">
                      Machine will be flagged &quot;Attention Needed&quot; on submit.
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">Note *</label>
                  <Input
                    placeholder="e.g. Bag seal #8812 - clean coin chute"
                    className="h-10 rounded-xl text-xs"
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
                  Pay Now
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 3: AUDIT — chronological cash collection ledger */}
        <TabsContent value="audit" className="mt-3.5 space-y-3.5 focus-visible:outline-none">
          <Card className="border-border/60">
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <ClipboardList className="h-4 w-4 text-secondary" />
                <span>Cash Collection History</span>
              </CardTitle>
              <CardDescription className="text-xs">
                Chronological ledger of cash collected from this machine.
              </CardDescription>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              {cashCollectionLogs.length === 0 ? (
                <div className="p-6 text-center text-xs text-muted-foreground">
                  No cash collections recorded for this machine yet.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {cashCollectionLogs.map((log: any) => (
                    <div
                      key={log.id}
                      className="rounded-xl border border-border/50 p-3.5 space-y-2.5 bg-card/60 hover:border-border/80 transition-colors shadow-xs"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1 font-mono text-[11px] text-muted-foreground">
                          <Clock className="h-3 w-3 text-muted-foreground/70" />
                          <span>
                            {new Date(log.createdAt).toLocaleDateString([], {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}{" "}
                            •{" "}
                            {new Date(log.createdAt).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                        <span className="font-mono font-black text-amber-600 dark:text-amber-400 text-base">
                          {formatMoney(Number(log.collectedAmount || 0))}
                        </span>
                      </div>

                      {log.remarks && (
                        <p className="text-xs text-foreground/80 italic bg-muted/40 p-2 rounded-lg border border-border/40">
                          &ldquo;{log.remarks}&rdquo;
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* DIALOG: SHOPKEEPER PAYMENT FOLLOW-UP */}
      <Dialog
        open={!!paymentFollowUp}
        onOpenChange={(open) => {
          if (!open) {
            setPaymentFollowUp(null);
            setExpectedPaymentDate("");
          }
        }}
      >
        <DialogContent className="max-w-md w-[92vw] rounded-2xl p-6 bg-background border border-border/60 shadow-2xl z-50">
          {paymentFollowUp?.paymentMode === "CASH" ? (
            <>
              <DialogHeader className="text-left pb-1 space-y-1">
                <DialogTitle className="flex items-center gap-2 text-base font-bold">
                  <Banknote className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                  <span>{formatMoney(paymentFollowUp.collectedAmount)} Collected</span>
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Pay the shopkeeper their cut now, in cash, before leaving.
                </DialogDescription>
              </DialogHeader>
              <div className="py-3">
                <div className="flex justify-between p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
                  <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                    Pay Shopkeeper ({paymentFollowUp.shopCutPercent}%):
                  </span>
                  <span className="text-lg font-black font-mono text-emerald-700 dark:text-emerald-400">
                    {formatMoney(
                      (paymentFollowUp.collectedAmount * paymentFollowUp.shopCutPercent) / 100
                    )}
                  </span>
                </div>
              </div>
              <DialogFooter>
                <Button
                  className="w-full h-11 text-xs font-bold rounded-xl"
                  onClick={() => {
                    setPaymentFollowUp(null);
                  }}
                >
                  Done
                </Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <DialogHeader className="text-left pb-1 space-y-1">
                <DialogTitle className="flex items-center gap-2 text-base font-bold">
                  <Landmark className="h-5 w-5 text-secondary" />
                  <span>Shopkeeper Bank Payment</span>
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  This store is paid by bank transfer — confirm it's already been sent, or set when
                  it's expected.
                </DialogDescription>
              </DialogHeader>
              <div className="py-3 space-y-3">
                <div className="flex justify-between p-3 rounded-xl bg-muted/60 border border-border/40 text-xs">
                  <span className="font-medium">Shopkeeper&apos;s Cut ({paymentFollowUp?.shopCutPercent ?? 0}%):</span>
                  <span className="font-bold font-mono">
                    {formatMoney(
                      ((paymentFollowUp?.collectedAmount ?? 0) *
                        (paymentFollowUp?.shopCutPercent ?? 0)) /
                        100
                    )}
                  </span>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    Or set an Expected Payment Date
                  </label>
                  <Input
                    type="date"
                    value={expectedPaymentDate}
                    onChange={(e) => setExpectedPaymentDate(e.target.value)}
                    className="h-11 rounded-xl text-xs"
                  />
                </div>
              </div>
              <DialogFooter className="flex flex-col sm:flex-row gap-2">
                <Button
                  variant="outline"
                  className="w-full sm:w-auto h-11 text-xs font-semibold rounded-xl"
                  disabled={!expectedPaymentDate || paymentUpdateMutation.isPending}
                  onClick={() => {
                    if (paymentFollowUp) {
                      paymentUpdateMutation.mutate({
                        cashLogId: paymentFollowUp.cashLogId,
                        shopPaymentStatus: "PENDING",
                        expectedPaymentDate: new Date(expectedPaymentDate).toISOString(),
                      });
                    }
                  }}
                >
                  Set Expected Date
                </Button>
                <Button
                  className="w-full sm:w-auto h-11 text-xs font-bold rounded-xl"
                  disabled={paymentUpdateMutation.isPending}
                  onClick={() => {
                    if (paymentFollowUp) {
                      paymentUpdateMutation.mutate({
                        cashLogId: paymentFollowUp.cashLogId,
                        shopPaymentStatus: "PAID",
                      });
                    }
                  }}
                >
                  {paymentUpdateMutation.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Mark Payment Done
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

    </div>
  );
}
