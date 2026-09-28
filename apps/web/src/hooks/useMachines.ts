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
  keyNumber?: string;
  status: "ONLINE" | "LOW_STOCK" | "OFFLINE";
  virtualCashBalance?: number;
  qrCode?: string;
  attentionNeeded?: boolean;
  attentionReason?: string | null;
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
            locationName: m.locationName || "Unassigned",
            location: m.location,
            category: m.category || "Standard Confectionery",
            type: m.type || "Spiral Chute",
            itemsRemaining: m.itemsRemaining ?? (m.status === "OFFLINE" ? 0 : 50),
            capacity: m.capacity || 100,
            keyNumber: m.keyNumber || "",
            status: m.status || "ONLINE",
            virtualCashBalance: Number(m.virtualCashBalance || 0),
            qrCode: m.qrCode || m.serialNumber,
            attentionNeeded: Boolean(m.attentionNeeded),
            attentionReason: m.attentionReason ?? null,
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
      keyNumber?: string;
    }) => {
      const response = await api.post("/machines", {
        serialNumber: payload.serialNumber,
        location: payload.location,
        storeId: payload.storeId || null,
        category: payload.category || "Standard Confectionery",
        type: payload.type || "Spiral Chute",
        capacity: payload.capacity || 100,
        keyNumber: payload.keyNumber || null,
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

export function useUpdateMachineKeyNumber() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ machineId, keyNumber }: { machineId: string; keyNumber: string }) => {
      const response = await api.put(`/machines/${encodeURIComponent(machineId)}`, {
        keyNumber: keyNumber.trim() || null,
      });
      return response.data?.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["machine"] });
      queryClient.invalidateQueries({ queryKey: ["machines"] });
      toast.success("Key number updated");
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || "Failed to update key number");
    },
  });
}

export function useResolveIssue() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      machineId,
      note,
      repairPhotoUrl,
    }: {
      machineId: string;
      note?: string;
      repairPhotoUrl?: string | null;
    }) => {
      const response = await api.patch(`/machines/${encodeURIComponent(machineId)}/resolve-issue`, {
        note,
        repairPhotoUrl,
      });
      return response.data?.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["machine"] });
      queryClient.invalidateQueries({ queryKey: ["machines"] });
      queryClient.invalidateQueries({ queryKey: ["machine-issues"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-metrics"] });
      toast.success("Issue resolved — machine is back to normal status");
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || "Failed to resolve issue");
    },
  });
}

export interface MachineIssueLogItem {
  id: string;
  reason: string;
  issuePhotoUrl: string | null;
  status: "OPEN" | "RESOLVED";
  reportedByAgentName: string;
  resolvedByAgentName: string | null;
  resolvedNote: string | null;
  repairPhotoUrl: string | null;
  resolvedAt: string | null;
  createdAt: string;
}

export function useMachineIssues(machineId: string) {
  return useQuery<MachineIssueLogItem[]>({
    queryKey: ["machine-issues", machineId],
    queryFn: async () => {
      try {
        const res = await api.get(`/machines/${encodeURIComponent(machineId)}/issues`);
        return Array.isArray(res.data?.data) ? res.data.data : [];
      } catch {
        return [];
      }
    },
    enabled: Boolean(machineId),
    staleTime: 1000 * 15,
  });
}
