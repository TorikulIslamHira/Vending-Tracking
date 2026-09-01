"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { toast } from "sonner";

export interface MachineItem {
  id: string;
  serialNumber: string;
  location: string;
  storeId?: string;
  storeName?: string;
  locationName?: string;
  category?: string;
  type?: string;
  itemsRemaining?: number;
  capacity?: number;
  status: "ONLINE" | "LOW_STOCK" | "OFFLINE";
  virtualCashBalance?: number;
  qrCode?: string;
}

export function useMachines(storeId?: string) {
  return useQuery<MachineItem[]>({
    queryKey: ["machines", storeId || "all"],
    queryFn: async () => {
      try {
        const url =
          storeId && storeId !== "all"
            ? `/machines?storeId=${encodeURIComponent(storeId)}`
            : "/machines";
        const res = await api.get(url);
        const apiData = res.data?.data;
        if (Array.isArray(apiData)) {
          return apiData.map((m: any) => ({
            id: m.id,
            serialNumber: m.serialNumber,
            storeId: m.storeId,
            storeName: m.storeName || m.location,
            locationName: m.locationName || "Venue",
            location: m.location,
            category: m.category || "Standard Confectionery",
            type: m.type || "Spiral Chute",
            itemsRemaining: m.itemsRemaining ?? (m.status === "OFFLINE" ? 0 : 50),
            capacity: m.capacity || 100,
            status: m.status || "ONLINE",
            virtualCashBalance: Number(m.virtualCashBalance || 0),
            qrCode: m.qrCode || m.serialNumber,
          }));
        }
        return [];
      } catch {
        return [];
      }
    },
    staleTime: 1000 * 30,
  });
}

export function useCreateMachine() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: {
      serialNumber: string;
      location: string;
      storeId?: string;
      category?: string;
      type?: string;
      capacity?: number;
    }) => {
      const response = await api.post("/machines", {
        serialNumber: payload.serialNumber,
        location: payload.location,
        storeId: payload.storeId || null,
        category: payload.category || "Standard Confectionery",
        type: payload.type || "Spiral Chute",
        capacity: payload.capacity || 100,
        status: "ONLINE",
        qrCode: payload.serialNumber,
      });
      return response.data?.data || payload;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["machines"] });
      queryClient.invalidateQueries({ queryKey: ["all-stores"] });
      queryClient.invalidateQueries({ queryKey: ["stores"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-metrics"] });
      toast.success(`Machine ${data.serialNumber} registered successfully!`);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || "Failed to register machine");
    },
  });
}
