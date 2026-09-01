"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

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
      if (typeof window !== "undefined") {
        const stored = localStorage.getItem("bee-tenant-settings");
        if (stored) {
          try {
            return JSON.parse(stored);
          } catch {
            // parse error
          }
        }
      }
      return defaultSettings;
    },
    initialData: defaultSettings,
  });

  const updateMutation = useMutation({
    mutationFn: async (newSettings: Partial<TenantSettings>) => {
      const current = query.data || defaultSettings;
      const updated = { ...current, ...newSettings };
      if (typeof window !== "undefined") {
        localStorage.setItem("bee-tenant-settings", JSON.stringify(updated));
      }
      return updated;
    },
    onSuccess: (updated) => {
      queryClient.setQueryData(["tenant-settings"], updated);
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
