"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { formatCurrency, getCurrencySymbol } from "@/lib/currency";

export interface TenantSettings {
  currency: string;
  defaultShopCut: number;
  defaultBizCut: number;
  lowStockAlerts: boolean;
  cashDropAlerts: boolean;
  dailyReports: boolean;
}

const defaultSettings: TenantSettings = {
  currency: "USD",
  defaultShopCut: 30,
  defaultBizCut: 70,
  lowStockAlerts: true,
  cashDropAlerts: true,
  dailyReports: false,
};

export function useTenantSettings() {
  const queryClient = useQueryClient();

  const query = useQuery<TenantSettings>({
    queryKey: ["tenant-settings"],
    queryFn: async () => {
      let local: Partial<TenantSettings> = {};
      if (typeof window !== "undefined") {
        const stored = localStorage.getItem("bee-tenant-settings");
        if (stored) {
          try {
            local = JSON.parse(stored);
          } catch {
            // parse error
          }
        }
      }

      try {
        const res = await api.get("/settings");
        if (res.data?.data) {
          const remote = res.data.data;
          const merged: TenantSettings = {
            ...defaultSettings,
            ...local,
            currency: remote.currency || local.currency || defaultSettings.currency,
          };
          if (typeof window !== "undefined") {
            localStorage.setItem("bee-tenant-settings", JSON.stringify(merged));
          }
          return merged;
        }
      } catch (err) {
        // Fallback to local if offline or unauthenticated
      }

      return {
        ...defaultSettings,
        ...local,
      };
    },
    initialData: () => {
      if (typeof window !== "undefined") {
        const stored = localStorage.getItem("bee-tenant-settings");
        if (stored) {
          try {
            return { ...defaultSettings, ...JSON.parse(stored) };
          } catch {}
        }
      }
      return defaultSettings;
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (newSettings: Partial<TenantSettings>) => {
      const current = query.data || defaultSettings;
      const updated = { ...current, ...newSettings };

      if (typeof window !== "undefined") {
        localStorage.setItem("bee-tenant-settings", JSON.stringify(updated));
      }

      try {
        await api.patch("/settings", {
          currency: updated.currency,
        });
      } catch (err) {
        console.warn("Failed to sync settings to API, kept locally:", err);
      }

      return updated;
    },
    onSuccess: (updated) => {
      queryClient.setQueryData(["tenant-settings"], updated);
      queryClient.invalidateQueries({ queryKey: ["tenant-settings"] });
      toast.success("Settings saved successfully!");
    },
    onError: () => {
      toast.error("Failed to save settings");
    },
  });

  return {
    settings: query.data || defaultSettings,
    isLoading: query.isLoading,
    updateSettings: updateMutation.mutate,
    isUpdating: updateMutation.isPending,
  };
}

export function useCurrency() {
  const { settings } = useTenantSettings();
  const currency = settings?.currency || "USD";
  const symbol = getCurrencySymbol(currency);

  const format = (amount: number | string | null | undefined) => {
    return formatCurrency(amount, currency);
  };

  return {
    currency,
    symbol,
    format,
  };
}

