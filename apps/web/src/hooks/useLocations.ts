"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { toast } from "sonner";

export interface LocationItem {
  id: string;
  name: string;
  address: string;
  storeCount: number;
  machineCount: number;
  status: "ACTIVE" | "INACTIVE";
}

export function useLocations() {
  return useQuery<LocationItem[]>({
    queryKey: ["locations"],
    queryFn: async () => {
      try {
        const res = await api.get("/locations");
        return res.data?.data || [];
      } catch {
        return [];
      }
    },
    staleTime: 1000 * 30,
  });
}

export function useCreateLocation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (newLocation: { name: string; address?: string }) => {
      const res = await api.post("/locations", {
        name: newLocation.name,
        address: newLocation.address || "",
      });
      return res.data?.data;
    },
    onSuccess: (newLoc) => {
      queryClient.invalidateQueries({ queryKey: ["locations"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-metrics"] });
      toast.success(`Location "${newLoc?.name || "Venue"}" added successfully!`);
    },
    onError: (err: any) => {
      const errMsg =
        err?.response?.data?.message ||
        err?.message ||
        "Failed to create location";
      toast.error(errMsg);
    },
  });
}

export function useUpdateLocation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: {
      id: string;
      name: string;
      address?: string;
    }) => {
      const res = await api.put(`/locations/${payload.id}`, {
        name: payload.name,
        address: payload.address || "",
      });
      return res.data?.data;
    },
    onSuccess: (updatedLoc) => {
      queryClient.invalidateQueries({ queryKey: ["locations"] });
      toast.success(`Location "${updatedLoc?.name || "Venue"}" updated successfully!`);
    },
    onError: (err: any) => {
      const errMsg =
        err?.response?.data?.message ||
        err?.message ||
        "Failed to update location";
      toast.error(errMsg);
    },
  });
}
