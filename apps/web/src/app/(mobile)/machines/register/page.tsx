"use client";

import React, { useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { useCreateMachine } from "@/hooks/useMachines";
import { useAllStores } from "@/hooks/useStores";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ArrowLeft,
  QrCode,
  Store,
  Boxes,
  Layers,
  Loader2,
  Sparkles,
  RefreshCw,
} from "lucide-react";

interface MachineRegisterFormValues {
  storeId: string;
  machineId: string;
  categoryName: string;
  dispenserType: string;
  capacity: number;
}

/**
 * Extracts uppercase initials from the store name (e.g., "Grand Central" -> "GC")
 */
function extractStoreInitials(storeName: string): string {
  if (!storeName || !storeName.trim()) return "GEN";
  const clean = storeName.replace(/[^a-zA-Z0-9\s]/g, " ").trim();
  const words = clean.split(/\s+/).filter(Boolean);
  if (words.length === 0) return "GEN";
  if (words.length === 1) {
    return words[0].slice(0, 2).toUpperCase();
  }
  return words.map((w) => w[0]).join("").toUpperCase().slice(0, 4);
}

/**
 * Returns current year and month as YYMM (e.g., August 2026 -> "2608")
 */
function getCurrentYYMM(): string {
  const now = new Date();
  const yy = String(now.getFullYear()).slice(-2);
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  return `${yy}${mm}`;
}

/**
 * Generates smart format: VM-[PREFIX]-[YYMM]-[0001]
 */
function generateMachineId(store?: { name: string; machineCount?: number } | null): string {
  const prefix = store ? extractStoreInitials(store.name) : "GEN";
  const yymm = getCurrentYYMM();
  const sequence = ((store?.machineCount ?? 0) + 1).toString().padStart(4, "0");
  return `VM-${prefix}-${yymm}-${sequence}`;
}

function RegisterMachineForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const defaultStoreId = searchParams.get("storeId") || "";
  const createMachineMutation = useCreateMachine();
  const { data: storesList = [] } = useAllStores();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<MachineRegisterFormValues>({
    defaultValues: {
      storeId: defaultStoreId,
      machineId: "",
      categoryName: "Standard Confectionery",
      dispenserType: "Spiral Chute",
      capacity: 100,
    },
  });

  const watchedStoreId = watch("storeId");

  // Auto-select first store if none is selected
  useEffect(() => {
    if (storesList.length > 0 && !watchedStoreId) {
      setValue("storeId", storesList[0].id);
    }
  }, [storesList, watchedStoreId, setValue]);

  // Dynamic 4-Digit Machine ID Generation
  useEffect(() => {
    if (!watchedStoreId && storesList.length === 0) {
      const fallbackId = `VM-GEN-${getCurrentYYMM()}-0001`;
      setValue("machineId", fallbackId, { shouldValidate: true });
      return;
    }

    const selectedStoreObj = storesList.find((s) => s.id === watchedStoreId);
    if (selectedStoreObj) {
      const generated = generateMachineId(selectedStoreObj);
      setValue("machineId", generated, { shouldValidate: true });
    }
  }, [watchedStoreId, storesList, setValue]);

  const handleRegenerateId = () => {
    const selectedStoreObj = storesList.find((s) => s.id === watchedStoreId);
    const generated = generateMachineId(selectedStoreObj);
    setValue("machineId", generated, { shouldValidate: true });
    toast.info(`Generated smart sequence: ${generated}`);
  };

  const onSubmit = (data: MachineRegisterFormValues) => {
    if (!data.machineId.trim()) {
      toast.error("Please fill in the Machine Serial ID");
      return;
    }

    const assignedStore = storesList.find((s) => s.id === data.storeId);
    const storeLabel = assignedStore
      ? `${assignedStore.name} (${assignedStore.locationName})`
      : data.storeId || "Main Concourse";

    createMachineMutation.mutate(
      {
        serialNumber: data.machineId.trim().toUpperCase(),
        location: storeLabel,
        storeId: data.storeId || undefined,
        category: data.categoryName.trim(),
        type: data.dispenserType,
        capacity: Number(data.capacity) || 100,
      },
      {
        onSuccess: () => {
          router.push(`/machines/${encodeURIComponent(data.machineId.trim().toUpperCase())}/qr`);
        },
      }
    );
  };

  const currentStore = storesList.find((s) => s.id === watchedStoreId);

  return (
    <div className="w-full px-4 py-4 space-y-5">
      {/* Top Header with Back Navigation */}
      <div className="flex items-center gap-2 pt-1">
        <button
          onClick={() => router.back()}
          className="h-10 w-10 rounded-2xl bg-muted/50 flex items-center justify-center text-muted-foreground hover:text-foreground active:scale-95 transition-transform shrink-0"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div>
          <h1 className="text-lg font-black tracking-tight text-foreground">
            Register Machine
          </h1>
          <p className="text-[11px] text-muted-foreground">
            Add a vending unit & generate telemetry QR
          </p>
        </div>
      </div>

      {/* Hero Registration Card */}
      <div className="p-4 rounded-2xl bg-gradient-to-br from-primary/15 via-accent/20 to-transparent border border-primary/30 flex items-center gap-3.5">
        <div className="h-12 w-12 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center shadow-md shadow-primary/30 shrink-0">
          <Boxes className="h-6 w-6 text-foreground" />
        </div>
        <div>
          <h2 className="font-bold text-sm text-foreground">
            Fast Machine Pairing
          </h2>
          <p className="text-xs text-muted-foreground">
            Smart sequence IDs linked to stores for instant field agent routing.
          </p>
        </div>
      </div>

      {/* Screen 6: Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Store Assignment Dropdown */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <Store className="h-3.5 w-3.5 text-muted-foreground" />
              <span>Assigned Store & Venue *</span>
            </label>
            {currentStore && (
              <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                {currentStore.machineCount} {currentStore.machineCount === 1 ? "machine" : "machines"}
              </span>
            )}
          </div>
          <select
            {...register("storeId")}
            className="w-full h-12 rounded-2xl bg-slate-100 dark:bg-zinc-800/80 border-transparent text-xs font-medium px-4 text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary shadow-xs"
          >
            {storesList.length > 0 ? (
              storesList.map((st) => (
                <option key={st.id} value={st.id}>
                  {st.name} — {st.locationName}
                </option>
              ))
            ) : (
              <>
                <option value="">Select or Create Store First</option>
                <option value="store-gc-01">Grand Central - Plaza News & Sweets</option>
                <option value="store-ts-01">Times Square - Broadway Mini-Mart</option>
              </>
            )}
          </select>
        </div>

        {/* Machine ID with Dynamic Smart Auto-Generation */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <QrCode className="h-3.5 w-3.5 text-muted-foreground" />
              <span>Machine Serial ID (Auto-Generated) *</span>
            </label>
            <button
              type="button"
              onClick={handleRegenerateId}
              className="text-[11px] font-semibold text-primary hover:underline flex items-center gap-1 active:scale-95"
            >
              <RefreshCw className="h-3 w-3" />
              <span>Regenerate</span>
            </button>
          </div>
          <Input
            {...register("machineId")}
            placeholder="e.g. VM-GC-2608-0001"
            className="h-12 rounded-2xl bg-slate-100 dark:bg-zinc-800/80 border-transparent text-sm font-mono font-bold px-4 focus-visible:ring-primary shadow-xs uppercase tracking-wide"
            required
          />
          <p className="text-[10px] text-muted-foreground font-medium flex items-center gap-1">
            <Sparkles className="h-3 w-3 text-primary" />
            <span>Format: VM-[PREFIX]-[YYMM]-[SEQ] (Fully editable)</span>
          </p>
        </div>

        {/* Product Category */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
            <Layers className="h-3.5 w-3.5 text-muted-foreground" />
            <span>Product Name / Category</span>
          </label>
          <Input
            {...register("categoryName")}
            placeholder="e.g. Gumballs 32mm, Dragon Capsule Toys"
            className="h-12 rounded-2xl bg-slate-100 dark:bg-zinc-800/80 border-transparent text-xs px-4 focus-visible:ring-primary shadow-xs"
            required
          />
        </div>

        {/* Dispenser Type & Capacity Grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">
              Dispenser Type
            </label>
            <select
              {...register("dispenserType")}
              className="w-full h-12 rounded-2xl bg-slate-100 dark:bg-zinc-800/80 border-transparent text-xs font-medium px-3 text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary shadow-xs"
            >
              <option value="Spiral Chute">Spiral Chute</option>
              <option value="Rotary Wheel">Rotary Wheel</option>
              <option value="Dual Globe">Dual Globe</option>
              <option value="Tower Capsule">Tower Capsule</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">
              Max Capacity (pcs)
            </label>
            <Input
              type="number"
              {...register("capacity", { valueAsNumber: true })}
              className="h-12 rounded-2xl bg-slate-100 dark:bg-zinc-800/80 border-transparent text-xs font-mono font-bold px-3 focus-visible:ring-primary shadow-xs"
              required
            />
          </div>
        </div>

        {/* Full-width Solid Dark Action Button */}
        <Button
          type="submit"
          className="w-full h-13 rounded-2xl bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 font-bold text-sm shadow-lg active:scale-[0.97] transition-transform duration-150 gap-2 mt-4"
          disabled={createMachineMutation.isPending}
        >
          {createMachineMutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              <QrCode className="h-4 w-4 text-primary" />
              <span>REGISTER & GENERATE QR</span>
            </>
          )}
        </Button>
      </form>
    </div>
  );
}

export default function RegisterMachinePage() {
  return (
    <Suspense
      fallback={
        <div className="w-full min-h-[400px] flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      }
    >
      <RegisterMachineForm />
    </Suspense>
  );
}
