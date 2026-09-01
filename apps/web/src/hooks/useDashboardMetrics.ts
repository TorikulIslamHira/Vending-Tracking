"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export interface AttentionMachineItem {
  id: string;
  serialNumber: string;
  location: string;
  storeName: string;
  issue: "LOW_STOCK" | "OFFLINE" | "CASH_LIMIT";
  itemsRemaining: number;
  selected?: boolean;
}

export interface DashboardMetricsData {
  totalMachines: number;
  totalRestocked: number;
  totalVirtualCash: number;
  shopCutPercent: number;
  businessCutPercent: number;
  missedVisitsCount: number;
  attentionMachines: AttentionMachineItem[];
}

const emptyDashboardMetrics: DashboardMetricsData = {
  totalMachines: 0,
  totalRestocked: 0,
  totalVirtualCash: 0,
  shopCutPercent: 30,
  businessCutPercent: 70,
  missedVisitsCount: 0,
  attentionMachines: [],
};

export function useDashboardMetrics() {
  return useQuery<DashboardMetricsData>({
    queryKey: ["dashboard-metrics"],
    queryFn: async () => {
      try {
        const response = await api.get("/machines/metrics");
        return response.data?.data || emptyDashboardMetrics;
      } catch {
        return emptyDashboardMetrics;
      }
    },
    staleTime: 1000 * 30, // 30s
    refetchOnWindowFocus: true,
  });
}

export default useDashboardMetrics;
