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
import { useResolveIssue, useUpdateMachineKeyNumber, useMachineIssues } from "@/hooks/useMachines";
import { uploadIssuePhoto, resolveUploadUrl } from "@/lib/uploads";
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
  Coins,
  ClipboardList,
  ArrowLeft,
  Loader2,
  Clock,
  ShieldAlert,
  KeyRound,
  Banknote,
  Landmark,
  Camera,
  X,
  Pencil,
  Check,
  Wrench,
  CheckCircle,
  AlertTriangle,
} from "lucide-react";

// Quick-action presets for flagging a machine condition issue while collecting
// cash — tapping one fills the mandatory note and flags the machine for
// admin follow-up in the same submission (no separate trip needed).
const ATTENTION_PRESETS = ["Malfunction", "Key Lost", "Locker Broken"] as const;

// Quick-select helpers for the mandatory Note field on a routine, no-issue
// collection — tapping one fills it instantly instead of typing the same
// few phrases out every visit.
const QUICK_NOTE_OPTIONS = ["All Ok", "Routine Collection", "Cleaned"] as const;

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

  // Task 1: Issue-report photo upload state
  const [issuePhotoPreviewUrl, setIssuePhotoPreviewUrl] = useState<string | null>(null);
  const [uploadedIssuePhotoUrl, setUploadedIssuePhotoUrl] = useState<string | null>(null);
  const [isUploadingIssuePhoto, setIsUploadingIssuePhoto] = useState(false);

  // Task 2: "Mark as Repaired" modal state
  const [isResolveModalOpen, setIsResolveModalOpen] = useState(false);
  const [resolveNote, setResolveNote] = useState("");
  const [repairPhotoPreviewUrl, setRepairPhotoPreviewUrl] = useState<string | null>(null);
  const [uploadedRepairPhotoUrl, setUploadedRepairPhotoUrl] = useState<string | null>(null);
  const [isUploadingRepairPhoto, setIsUploadingRepairPhoto] = useState(false);
  const resolveIssueMutation = useResolveIssue();

  // Task 3: Editable Key Number state
  const [isEditingKeyNumber, setIsEditingKeyNumber] = useState(false);
  const [keyNumberDraft, setKeyNumberDraft] = useState("");
  const updateKeyNumberMutation = useUpdateMachineKeyNumber();

  // Natural "go back to wherever I came from" navigation — a machine can be
  // opened from /scan, /browse, a Quick Fleet Shortcut, or straight from the
  // Dashboard's embedded scanner, so a hardcoded destination was always
  // wrong for at least one of those entry points. Falls back to "/" (which
  // resolves to each role's real home via middleware) only when there's no
  // history to go back to, e.g. a deep link opened in a fresh tab — and
  // never to a legacy /restock or /inventory route.
  const handleBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push("/");
    }
  };

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

  // 3. Query the machine's issue/repair lifecycle (Task 2) and merge it into
  // the same chronological Audit feed as the cash collections — a reported
  // issue and its later repair are audit events on this machine too, not
  // just a background flag.
  const { data: machineIssues = [] } = useMachineIssues(machine?.id || machineId);

  type AuditEntry =
    | { kind: "cash"; id: string; timestamp: string; amount: number; note?: string | null }
    | { kind: "issue-reported"; id: string; timestamp: string; reason: string; photoUrl: string | null; agentName: string }
    | {
        kind: "issue-resolved";
        id: string;
        timestamp: string;
        reason: string;
        note: string | null;
        photoUrl: string | null;
        agentName: string;
      };

  const auditEntries: AuditEntry[] = [
    ...cashCollectionLogs.map(
      (log: any): AuditEntry => ({
        kind: "cash",
        id: `cash-${log.id}`,
        timestamp: log.createdAt,
        amount: Number(log.collectedAmount || 0),
        note: log.remarks,
      })
    ),
    ...machineIssues.map(
      (i): AuditEntry => ({
        kind: "issue-reported",
        id: `issue-reported-${i.id}`,
        timestamp: i.createdAt,
        reason: i.reason,
        photoUrl: i.issuePhotoUrl,
        agentName: i.reportedByAgentName,
      })
    ),
    ...machineIssues
      .filter((i) => i.status === "RESOLVED" && i.resolvedAt)
      .map(
        (i): AuditEntry => ({
          kind: "issue-resolved",
          id: `issue-resolved-${i.id}`,
          timestamp: i.resolvedAt as string,
          reason: i.reason,
          note: i.resolvedNote,
          photoUrl: i.repairPhotoUrl,
          agentName: i.resolvedByAgentName || "Field Agent",
        })
      ),
  ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

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
      setIssuePhotoPreviewUrl(null);
      setUploadedIssuePhotoUrl(null);

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
      issuePhotoUrl: selectedAttentionPreset ? uploadedIssuePhotoUrl || undefined : undefined,
    });
  };

  // Shared upload flow for both the issue-report photo (Cash Collect form)
  // and the proof-of-repair photo (Mark as Repaired modal) — upload happens
  // immediately on file select so the eventual submit is instant, not
  // waiting on a multipart upload at the same moment.
  const handleIssuePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setIssuePhotoPreviewUrl(URL.createObjectURL(file));
    setIsUploadingIssuePhoto(true);
    try {
      const url = await uploadIssuePhoto(file);
      setUploadedIssuePhotoUrl(url);
    } catch {
      toast.error("Failed to upload photo");
      setIssuePhotoPreviewUrl(null);
    } finally {
      setIsUploadingIssuePhoto(false);
    }
  };

  const handleRemoveIssuePhoto = () => {
    setIssuePhotoPreviewUrl(null);
    setUploadedIssuePhotoUrl(null);
  };

  const handleRepairPhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setRepairPhotoPreviewUrl(URL.createObjectURL(file));
    setIsUploadingRepairPhoto(true);
    try {
      const url = await uploadIssuePhoto(file);
      setUploadedRepairPhotoUrl(url);
    } catch {
      toast.error("Failed to upload photo");
      setRepairPhotoPreviewUrl(null);
    } finally {
      setIsUploadingRepairPhoto(false);
    }
  };

  const handleRemoveRepairPhoto = () => {
    setRepairPhotoPreviewUrl(null);
    setUploadedRepairPhotoUrl(null);
  };

  const handleResolveIssue = () => {
    resolveIssueMutation.mutate(
      {
        machineId: machine?.id || machineId,
        note: resolveNote.trim() || undefined,
        repairPhotoUrl: uploadedRepairPhotoUrl,
      },
      {
        onSuccess: () => {
          setIsResolveModalOpen(false);
          setResolveNote("");
          setRepairPhotoPreviewUrl(null);
          setUploadedRepairPhotoUrl(null);
        },
      }
    );
  };

  const handleSaveKeyNumber = () => {
    updateKeyNumberMutation.mutate(
      { machineId: machine?.id || machineId, keyNumber: keyNumberDraft },
      { onSuccess: () => setIsEditingKeyNumber(false) }
    );
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
          onClick={handleBack}
          className="h-10 w-10 shrink-0 rounded-xl border-border/60 shadow-xs"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1 min-w-0 flex items-center gap-1.5 text-xs font-semibold text-foreground truncate">
          <span className="flex h-2 w-2 rounded-full bg-emerald-500 shrink-0 ring-4 ring-emerald-500/20" />
          <span className="truncate">
            {(machine as any)?.storeName || machine?.serialNumber || machineId}
          </span>
          {((machine as any)?.locationAddress || machine?.keyNumber) && (
            <>
              <span className="text-muted-foreground">•</span>
              <span className="text-muted-foreground truncate font-normal">
                {(machine as any)?.locationAddress || `Machine ${machine?.keyNumber}`}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Prominent Key Number — the single most important thing a field
          agent needs to find and open the physical coin box. Task 3:
          editable in place via the pencil icon, no separate page/nav away. */}
      <Card className="border-amber-500/40 bg-gradient-to-br from-amber-500/10 via-card to-card shadow-xs">
        <CardContent className="p-4 flex flex-col items-center text-center gap-1">
          <span className="text-[11px] font-bold uppercase tracking-widest text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
            <KeyRound className="h-3.5 w-3.5" />
            <span>Key Number</span>
          </span>
          {isEditingKeyNumber ? (
            <div className="flex items-center gap-1.5 w-full max-w-[240px] pt-1">
              <Input
                autoFocus
                value={keyNumberDraft}
                onChange={(e) => setKeyNumberDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSaveKeyNumber();
                  if (e.key === "Escape") setIsEditingKeyNumber(false);
                }}
                className="h-11 text-center text-lg font-black font-mono tracking-wide rounded-xl"
              />
              <Button
                size="icon"
                className="h-10 w-10 shrink-0 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white"
                disabled={updateKeyNumberMutation.isPending}
                onClick={handleSaveKeyNumber}
              >
                {updateKeyNumberMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Check className="h-4 w-4" />
                )}
              </Button>
              <Button
                size="icon"
                variant="outline"
                className="h-10 w-10 shrink-0 rounded-xl"
                onClick={() => setIsEditingKeyNumber(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-4xl font-black font-mono tracking-wide text-amber-600 dark:text-amber-400">
                {machine?.keyNumber || "—"}
              </span>
              <button
                type="button"
                onClick={() => {
                  setKeyNumberDraft(machine?.keyNumber || "");
                  setIsEditingKeyNumber(true);
                }}
                className="h-7 w-7 rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center hover:bg-amber-500/25 active:scale-95 transition-all shrink-0"
                title="Edit Key Number"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* "Mark as Repaired" banner (Task 2) — only shown when the machine is
          currently flagged. Visible right up front rather than buried in a
          tab, since resolving it is the most urgent thing to do here. */}
      {machine?.attentionNeeded && (
        <Card className="border-rose-500/40 bg-rose-500/5">
          <CardContent className="p-3.5 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <AlertTriangle className="h-4 w-4 text-rose-600 dark:text-rose-400 shrink-0" />
              <div className="min-w-0">
                <p className="text-xs font-bold text-rose-600 dark:text-rose-400 truncate">
                  Flagged: {machine.attentionReason || "Attention needed"}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  Resolve to return this machine to normal status
                </p>
              </div>
            </div>
            <Button
              size="sm"
              className="h-9 text-xs font-bold rounded-xl shrink-0 bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={() => setIsResolveModalOpen(true)}
            >
              <Wrench className="h-3.5 w-3.5 mr-1.5" />
              Mark as Repaired
            </Button>
          </CardContent>
        </Card>
      )}

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
                            } else {
                              handleRemoveIssuePhoto();
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
                    <>
                      <p className="text-[10px] text-rose-600 dark:text-rose-400 font-semibold">
                        Machine will be flagged &quot;Attention Needed&quot; on submit.
                      </p>

                      {/* Task 1: Optional issue photo — only shown once a
                          preset is selected, uploaded immediately on pick. */}
                      <div className="space-y-1.5 pt-1">
                        <label className="text-xs font-semibold text-foreground">
                          Upload Photo (Optional)
                        </label>
                        {issuePhotoPreviewUrl ? (
                          <div className="relative w-24 h-24 rounded-xl overflow-hidden border border-border/60">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={issuePhotoPreviewUrl}
                              alt="Issue photo preview"
                              className="w-full h-full object-cover"
                            />
                            {isUploadingIssuePhoto && (
                              <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                <Loader2 className="h-5 w-5 animate-spin text-white" />
                              </div>
                            )}
                            <button
                              type="button"
                              onClick={handleRemoveIssuePhoto}
                              className="absolute top-1 right-1 h-5 w-5 rounded-full bg-black/60 text-white flex items-center justify-center"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        ) : (
                          <label className="flex items-center justify-center gap-2 h-11 w-fit px-4 rounded-xl border border-dashed border-border/60 text-xs font-semibold text-muted-foreground cursor-pointer hover:border-primary/50 hover:text-foreground transition-colors">
                            <Camera className="h-4 w-4" />
                            <span>Upload Photo</span>
                            <input
                              type="file"
                              accept="image/*"
                              capture="environment"
                              className="hidden"
                              onChange={handleIssuePhotoSelect}
                            />
                          </label>
                        )}
                      </div>
                    </>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">Note *</label>

                  {/* Quick-select helpers — fills the mandatory note instantly
                      for a routine, no-issue collection. Small/outlined so
                      they read as secondary shortcuts, not the main action. */}
                  <div className="flex flex-wrap gap-1.5 pb-0.5">
                    {QUICK_NOTE_OPTIONS.map((note) => {
                      const isActive = cashForm.watch("remarks") === note;
                      return (
                        <button
                          key={note}
                          type="button"
                          onClick={() =>
                            cashForm.setValue("remarks", note, { shouldValidate: true })
                          }
                          className={`h-7 px-2.5 rounded-full text-[10.5px] font-medium border transition-colors ${
                            isActive
                              ? "bg-primary/15 border-primary/50 text-primary"
                              : "bg-muted/40 text-muted-foreground border-border/50 hover:border-primary/40 hover:text-foreground"
                          }`}
                        >
                          {note}
                        </button>
                      );
                    })}
                  </div>

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

        {/* TAB 3: AUDIT — chronological cash collections + issue/repair history */}
        <TabsContent value="audit" className="mt-3.5 space-y-3.5 focus-visible:outline-none">
          <Card className="border-border/60">
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <ClipboardList className="h-4 w-4 text-secondary" />
                <span>Machine History</span>
              </CardTitle>
              <CardDescription className="text-xs">
                Cash collections and reported/repaired issues, most recent first.
              </CardDescription>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              {auditEntries.length === 0 ? (
                <div className="p-6 text-center text-xs text-muted-foreground">
                  No activity recorded for this machine yet.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {auditEntries.map((entry) => {
                    const timestampLabel = (
                      <div className="flex items-center gap-1 font-mono text-[11px] text-muted-foreground">
                        <Clock className="h-3 w-3 text-muted-foreground/70" />
                        <span>
                          {new Date(entry.timestamp).toLocaleDateString([], {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}{" "}
                          •{" "}
                          {new Date(entry.timestamp).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                    );

                    if (entry.kind === "cash") {
                      return (
                        <div
                          key={entry.id}
                          className="rounded-xl border border-border/50 p-3.5 space-y-2.5 bg-card/60 hover:border-border/80 transition-colors shadow-xs"
                        >
                          <div className="flex items-center justify-between">
                            {timestampLabel}
                            <span className="font-mono font-black text-amber-600 dark:text-amber-400 text-base">
                              {formatMoney(entry.amount)}
                            </span>
                          </div>
                          {entry.note && (
                            <p className="text-xs text-foreground/80 italic bg-muted/40 p-2 rounded-lg border border-border/40">
                              &ldquo;{entry.note}&rdquo;
                            </p>
                          )}
                        </div>
                      );
                    }

                    const isReported = entry.kind === "issue-reported";
                    const photoUrl = resolveUploadUrl(entry.photoUrl);

                    return (
                      <div
                        key={entry.id}
                        className={`rounded-xl border p-3.5 space-y-2.5 shadow-xs transition-colors ${
                          isReported
                            ? "border-rose-500/30 bg-rose-500/5"
                            : "border-emerald-500/30 bg-emerald-500/5"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                              isReported
                                ? "bg-rose-500/15 text-rose-700 dark:text-rose-400"
                                : "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                            }`}
                          >
                            {isReported ? (
                              <AlertTriangle className="h-3 w-3" />
                            ) : (
                              <CheckCircle className="h-3 w-3" />
                            )}
                            <span>{isReported ? "ISSUE REPORTED" : "REPAIRED"}</span>
                          </span>
                          {timestampLabel}
                        </div>

                        <p className="text-xs font-semibold text-foreground">{entry.reason}</p>

                        {"note" in entry && entry.note && (
                          <p className="text-xs text-foreground/80 italic bg-muted/40 p-2 rounded-lg border border-border/40">
                            &ldquo;{entry.note}&rdquo;
                          </p>
                        )}

                        {photoUrl && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={photoUrl}
                            alt={isReported ? "Reported issue photo" : "Proof of repair photo"}
                            className="w-full max-w-[200px] rounded-lg border border-border/40 object-cover"
                          />
                        )}

                        <p className="text-[10px] text-muted-foreground font-medium">
                          {entry.agentName}
                        </p>
                      </div>
                    );
                  })}
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
              <DialogFooter className="flex flex-col sm:flex-row sm:justify-center gap-2">
                <Button
                  variant="outline"
                  className="w-full h-11 text-xs font-semibold rounded-xl"
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
                  className="w-full h-11 text-xs font-bold rounded-xl"
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

      {/* DIALOG: MARK AS REPAIRED (Task 2) */}
      <Dialog
        open={isResolveModalOpen}
        onOpenChange={(open) => {
          setIsResolveModalOpen(open);
          if (!open) {
            setResolveNote("");
            setRepairPhotoPreviewUrl(null);
            setUploadedRepairPhotoUrl(null);
          }
        }}
      >
        <DialogContent className="max-w-md w-[92vw] rounded-2xl p-6 bg-background border border-border/60 shadow-2xl z-50">
          <DialogHeader className="text-left pb-1 space-y-1">
            <DialogTitle className="flex items-center gap-2 text-base font-bold">
              <Wrench className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              <span>Mark as Repaired</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Confirms the issue is resolved and returns this machine to normal status. A
              photo and note are optional but recommended.
            </DialogDescription>
          </DialogHeader>

          <div className="py-3 space-y-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                Proof of Repair Photo (Optional)
              </label>
              {repairPhotoPreviewUrl ? (
                <div className="relative w-24 h-24 rounded-xl overflow-hidden border border-border/60">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={repairPhotoPreviewUrl}
                    alt="Proof of repair preview"
                    className="w-full h-full object-cover"
                  />
                  {isUploadingRepairPhoto && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <Loader2 className="h-5 w-5 animate-spin text-white" />
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={handleRemoveRepairPhoto}
                    className="absolute top-1 right-1 h-5 w-5 rounded-full bg-black/60 text-white flex items-center justify-center"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ) : (
                <label className="flex items-center justify-center gap-2 h-11 w-fit px-4 rounded-xl border border-dashed border-border/60 text-xs font-semibold text-muted-foreground cursor-pointer hover:border-primary/50 hover:text-foreground transition-colors">
                  <Camera className="h-4 w-4" />
                  <span>Upload Photo</span>
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={handleRepairPhotoSelect}
                  />
                </label>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Note (Optional)</label>
              <Textarea
                value={resolveNote}
                onChange={(e) => setResolveNote(e.target.value)}
                placeholder="e.g. Replaced jammed coin mechanism"
                className="min-h-[70px] text-xs rounded-xl bg-muted/20 border-border/60"
              />
            </div>
          </div>

          <DialogFooter className="flex flex-col sm:flex-row sm:justify-center gap-2">
            <Button
              variant="outline"
              className="w-full h-11 text-xs font-semibold rounded-xl"
              onClick={() => setIsResolveModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              className="w-full h-11 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white"
              disabled={resolveIssueMutation.isPending || isUploadingRepairPhoto}
              onClick={handleResolveIssue}
            >
              {resolveIssueMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
              ) : (
                <CheckCircle className="h-4 w-4 mr-1.5" />
              )}
              Confirm Repaired
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
