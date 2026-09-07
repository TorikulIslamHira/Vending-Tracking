"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { formatCurrency } from "@/lib/currency";
import { toast } from "sonner";

export interface InventoryLogItem {
  id: string;
  machineId: string;
  machine?: {
    id: string;
    serialNumber: string;
    location: string;
  };
  agent?: {
    id: string;
    name: string;
    email: string;
  };
  packet?: {
    id: string;
    name: string;
    brand: string;
  };
  entryType: "STANDARD" | "MANUAL" | "REVERSE" | "DAMAGED";
  quantityAdded: number;
  remarks: string;
  createdAt: string;
}

export interface PacketOption {
  id: string;
  name: string;
  brand: string;
  quantityPerPacket: number;
  costPerPacket: number;
}

export function usePackets() {
  return useQuery<PacketOption[]>({
    queryKey: ["packets"],
    queryFn: async () => {
      try {
        const res = await api.get("/packets");
        return res.data?.data || [];
      } catch {
        return [];
      }
    },
    staleTime: 1000 * 60,
  });
}

export function useInventoryLogs(machineId?: string) {
  return useQuery<InventoryLogItem[]>({
    queryKey: ["inventory-logs", machineId || "all"],
    queryFn: async () => {
      try {
        const res = await api.get("/inventory/logs", {
          params: machineId ? { machineId } : {},
        });
        return res.data?.data || [];
      } catch {
        return [];
      }
    },
    staleTime: 1000 * 15,
  });
}

export interface MyHistoryLogItem {
  id: string;
  logType: "INVENTORY" | "CASH";
  machineId: string;
  machine?: {
    id: string;
    serialNumber: string;
    location: string;
  } | null;
  packet?: {
    id: string;
    name: string;
    brand: string;
  } | null;
  entryType: "STANDARD" | "MANUAL" | "REVERSE" | "CASH_COLLECT";
  quantityAdded?: number | null;
  collectedAmount?: number | null;
  expectedAmount?: number | null;
  discrepancy?: number | null;
  isShortage?: boolean | null;
  stockCleared?: boolean | null;
  isPartial?: boolean | null;
  remarks?: string | null;
  createdAt: string;
}

/** The authenticated agent's own activity — restocks, manual entries, reversals,
 * and cash collections they personally performed, across every machine. */
export function useMyHistory() {
  return useQuery<MyHistoryLogItem[]>({
    queryKey: ["my-history"],
    queryFn: async () => {
      try {
        const res = await api.get("/inventory/logs/me");
        return res.data?.data || [];
      } catch {
        return [];
      }
    },
    staleTime: 1000 * 15,
  });
}

export function useStandardRestock() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      machineId: string;
      packetId: string;
      quantity: number;
      remarks?: string;
    }) => {
      const res = await api.post("/inventory/restock/standard", data);
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["inventory-logs"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-metrics"] });
      queryClient.invalidateQueries({ queryKey: ["machines"] });
      queryClient.invalidateQueries({ queryKey: ["my-history"] });
      toast.success(
        `Added ${data?.data?.totalPiecesAdded || "units"} items via standard packet refill!`
      );
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || "Failed to record restock");
    },
  });
}

export function useManualRestock() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      machineId: string;
      quantityAdded: number;
      entryType: "MANUAL" | "REVERSE" | "DAMAGED";
      remarks: string;
      packetId?: string;
      brandName?: string;
    }) => {
      const res = await api.post("/inventory/restock/manual", data);
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["inventory-logs"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-metrics"] });
      queryClient.invalidateQueries({ queryKey: ["machines"] });
      queryClient.invalidateQueries({ queryKey: ["my-history"] });
      toast.success(data?.message || "Manual inventory entry recorded");
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || "Failed to record entry");
    },
  });
}

export function useReverseLog() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      logId?: string;
      machineId?: string;
      quantity?: number;
      remarks: string;
    }) => {
      const res = await api.post("/inventory/reverse", data);
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["inventory-logs"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-metrics"] });
      queryClient.invalidateQueries({ queryKey: ["machines"] });
      queryClient.invalidateQueries({ queryKey: ["my-history"] });
      toast.success("Refill log successfully reversed and inventory adjusted!");
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || "Error reversing refill log");
    },
  });
}

export function useCashCollection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      machineId: string;
      collectedAmount: number;
      remarks?: string;
      stockCleared?: boolean;
      isPartial?: boolean;
    }) => {
      const res = await api.post("/inventory/cash-collection", data);
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["inventory-logs"] });
      queryClient.invalidateQueries({ queryKey: ["cash-logs"] });
      queryClient.invalidateQueries({ queryKey: ["reports"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-metrics"] });
      queryClient.invalidateQueries({ queryKey: ["machines"] });
      queryClient.invalidateQueries({ queryKey: ["my-history"] });
      const discrepancy = data?.data?.discrepancy;
      if (discrepancy !== 0 && discrepancy !== undefined) {
        toast.warning(
          `Cash collected: ${formatCurrency(data?.data?.collectedAmount)}. Discrepancy: ${formatCurrency(discrepancy)}`
        );
      } else {
        toast.success("Cash collected successfully with zero discrepancy!");
      }
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || "Failed to record cash collection");
    },
  });
}

export interface ReportSummary {
  totalCollected: number;
  totalShopCut: number;
  totalBusinessCut: number;
  collectionsCount: number;
  machinesCount: number;
  fromDate?: string | null;
  toDate?: string | null;
}

export interface ReportRecord {
  id: string;
  machineId: string;
  storeId?: string | null;
  storeName: string;
  locationName: string;
  date: string;
  totalCash: number;
  shopCut: number;
  businessCut: number;
  splitRatio: string;
  collectionsCount: number;
}

export interface DetailedCashLog {
  id: string;
  createdAt: string;
  date: string;
  machineId: string;
  storeName: string;
  locationName: string;
  collectedAmount: number;
  expectedAmount: number;
  discrepancy: number;
  isShortage?: boolean;
  stockCleared?: boolean;
  isPartial?: boolean;
  remarks?: string | null;
  agentName: string;
}

export interface ReportsResponse {
  summary: ReportSummary;
  records: ReportRecord[];
  detailedLogs: DetailedCashLog[];
}

export function useReconciliationReports(params?: {
  fromDate?: string;
  toDate?: string;
  storeId?: string;
  machineId?: string;
}) {
  return useQuery<ReportsResponse>({
    queryKey: ["reports", params?.fromDate, params?.toDate, params?.storeId, params?.machineId],
    queryFn: async () => {
      try {
        const res = await api.get("/inventory/reports", {
          params: {
            fromDate: params?.fromDate,
            toDate: params?.toDate,
            storeId: params?.storeId !== "ALL" ? params?.storeId : undefined,
            machineId: params?.machineId !== "ALL" ? params?.machineId : undefined,
          },
        });
        return res.data?.data || {
          summary: {
            totalCollected: 0,
            totalShopCut: 0,
            totalBusinessCut: 0,
            collectionsCount: 0,
            machinesCount: 0,
          },
          records: [],
          detailedLogs: [],
        };
      } catch {
        return {
          summary: {
            totalCollected: 0,
            totalShopCut: 0,
            totalBusinessCut: 0,
            collectionsCount: 0,
            machinesCount: 0,
          },
          records: [],
          detailedLogs: [],
        };
      }
    },
    staleTime: 1000 * 10,
  });
}

