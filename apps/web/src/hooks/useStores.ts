"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "@/lib/api";

export interface StoreItem {
  id: string;
  name: string;
  category: string;
  shopCutPercent: number;
  businessCutPercent: number;
  machineCount: number;
  createdAt?: string;
}

export function useStores(locationId: string) {
  return useQuery({
    queryKey: ["stores", locationId],
    queryFn: async () => {
      if (!locationId) {
        return {
          locationName: "Commercial Venue",
          address: "Commercial Zone",
          stores: [],
        };
      }

      try {
        const res = await api.get(`/locations/${locationId}/stores`);
        const data = res.data?.data;
        if (data) {
          return {
            locationName: data.locationName || "Commercial Venue",
            address: data.address || "Commercial Zone",
            stores: (data.stores || []).map((st: any) => ({
              id: st.id,
              name: st.name,
              category: st.category || "Novelty Vending",
              shopCutPercent: Number(st.shopCutPercent ?? 30),
              businessCutPercent: Number(st.businessCutPercent ?? 70),
              machineCount: Number(st.machineCount ?? 0),
              createdAt: st.createdAt,
            })),
          };
        }
      } catch {
        // Fallback: try fetching location directly
        try {
          const locRes = await api.get(`/locations/${locationId}`);
          const loc = locRes.data?.data;
          if (loc) {
            return {
              locationName: loc.name,
              address: loc.address || "Commercial Zone",
              stores: [],
            };
          }
        } catch {
          // silent fallback
        }
      }

      return {
        locationName: "Commercial Venue",
        address: "Commercial Zone",
        stores: [],
      };
    },
    staleTime: 1000 * 30,
    enabled: Boolean(locationId),
  });
}

export function useStore(storeId: string) {
  return useQuery({
    queryKey: ["store", storeId],
    queryFn: async () => {
      if (!storeId) return null;
      try {
        const res = await api.get(`/stores/${storeId}`);
        return res.data?.data || null;
      } catch {
        return null;
      }
    },
    staleTime: 1000 * 30,
    enabled: Boolean(storeId),
  });
}

export function useAllStores() {
  return useQuery({
    queryKey: ["all-stores"],
    queryFn: async () => {
      try {
        const res = await api.get("/stores");
        const data = res.data?.data;
        if (Array.isArray(data)) {
          return data.map((st: any) => ({
            id: st.id,
            name: st.name,
            category: st.category || "Novelty Vending",
            locationId: st.locationId,
            locationName: st.locationName || "Assigned Location",
            shopCutPercent: Number(st.shopCutPercent ?? 30),
            businessCutPercent: Number(st.businessCutPercent ?? 70),
            machineCount: Number(st.machineCount ?? 0),
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

export function useCreateStore(locationId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (newStore: {
      name: string;
      category?: string;
      shopCutPercent: number;
    }) => {
      const response = await api.post(`/locations/${locationId}/stores`, {
        name: newStore.name,
        category: newStore.category || "Novelty Vending",
        shopCutPercent: newStore.shopCutPercent,
      });
      return response.data?.data;
    },
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ["stores", locationId] });
      queryClient.invalidateQueries({ queryKey: ["locations"] });
      queryClient.invalidateQueries({ queryKey: ["all-stores"] });
      const storeName = created?.name || "Store";
      const cut = created?.shopCutPercent ?? 30;
      toast.success(`Store "${storeName}" created with ${cut}% split!`);
    },
    onError: (err: any) => {
      const errMsg =
        err?.response?.data?.message ||
        err?.message ||
        "Failed to create store";
      toast.error(errMsg);
    },
  });
}

export function useUpdateStore(locationId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (storeData: {
      id: string;
      name: string;
      category?: string;
      shopCutPercent: number;
    }) => {
      const response = await api.put(`/stores/${storeData.id}`, {
        name: storeData.name,
        category: storeData.category,
        shopCutPercent: storeData.shopCutPercent,
      });
      return response.data?.data;
    },
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ["stores", locationId] });
      queryClient.invalidateQueries({ queryKey: ["locations"] });
      queryClient.invalidateQueries({ queryKey: ["all-stores"] });
      const storeName = updated?.name || "Store";
      toast.success(`Store "${storeName}" updated successfully!`);
    },
    onError: (err: any) => {
      const errMsg =
        err?.response?.data?.message ||
        err?.message ||
        "Failed to update store";
      toast.error(errMsg);
    },
  });
}
