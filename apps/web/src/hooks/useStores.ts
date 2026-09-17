"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "@/lib/api";

export interface StoreMachineItem {
  id: string;
  serialNumber: string;
  category?: string;
  type?: string;
  capacity?: number;
  status: "ONLINE" | "LOW_STOCK" | "OFFLINE";
  keyNumber?: string;
  qrCode?: string;
  virtualCashBalance?: number;
  createdAt?: string;
}

export interface StoreItem {
  id: string;
  name: string;
  category: string;
  locationId?: string;
  locationName?: string;
  shopCutPercent: number;
  businessCutPercent: number;
  eircode?: string | null;
  paymentMode?: "CASH" | "BANK";
  qrCode?: string | null;
  machineCount: number;
  machines?: StoreMachineItem[];
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
              machines: Array.isArray(st.machines)
                ? st.machines.map((m: any) => ({
                    id: m.id,
                    serialNumber: m.serialNumber,
                    category: m.category || "Standard Confectionery",
                    type: m.type || "Spiral Chute",
                    capacity: m.capacity || 100,
                    status: m.status || "ONLINE",
                    keyNumber: m.keyNumber || "",
                    qrCode: m.qrCode || m.serialNumber,
                    virtualCashBalance: Number(m.virtualCashBalance || 0),
                  }))
                : [],
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
            locationName: st.locationName || "Unassigned",
            shopCutPercent: Number(st.shopCutPercent ?? 30),
            businessCutPercent: Number(st.businessCutPercent ?? 70),
            eircode: st.eircode ?? null,
            paymentMode: st.paymentMode || "CASH",
            qrCode: st.qrCode ?? null,
            machineCount: Number(st.machineCount ?? 0),
            machines: Array.isArray(st.machines)
              ? st.machines.map((m: any) => ({
                  id: m.id,
                  serialNumber: m.serialNumber,
                  category: m.category || "Standard Confectionery",
                  type: m.type || "Spiral Chute",
                  capacity: m.capacity || 100,
                  status: m.status || "ONLINE",
                  keyNumber: m.keyNumber || "",
                  qrCode: m.qrCode || m.serialNumber,
                  virtualCashBalance: Number(m.virtualCashBalance || 0),
                }))
              : [],
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

/**
 * Creates a store. Location is entirely optional — a store is now the
 * primary entity, not something that must be nested under a venue. When
 * `boundLocationId` is passed (the per-location "Add Store" drawer), it's
 * used as the route; otherwise this posts straight to /stores and takes
 * whatever locationId (if any) is in the payload itself.
 */
export function useCreateStore(boundLocationId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (newStore: {
      name: string;
      locationId?: string | null;
      category?: string;
      shopCutPercent: number;
      eircode?: string;
      paymentMode?: "CASH" | "BANK";
    }) => {
      const url = boundLocationId ? `/locations/${boundLocationId}/stores` : "/stores";
      const response = await api.post(url, {
        name: newStore.name,
        locationId: boundLocationId || newStore.locationId || undefined,
        category: newStore.category || "Novelty Vending",
        shopCutPercent: newStore.shopCutPercent,
        eircode: newStore.eircode,
        paymentMode: newStore.paymentMode,
      });
      return response.data?.data;
    },
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ["stores"] });
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

export function useUpdateStore(boundLocationId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (storeData: {
      id: string;
      name: string;
      // undefined = leave unchanged; null = unassign; string = reassign
      locationId?: string | null;
      category?: string;
      shopCutPercent: number;
      eircode?: string;
      paymentMode?: "CASH" | "BANK";
    }) => {
      const response = await api.put(`/stores/${storeData.id}`, {
        name: storeData.name,
        locationId: storeData.locationId,
        category: storeData.category,
        shopCutPercent: storeData.shopCutPercent,
        eircode: storeData.eircode,
        paymentMode: storeData.paymentMode,
      });
      return response.data?.data;
    },
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ["stores"] });
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

export function useDeleteStore() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.delete(`/stores/${id}`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stores"] });
      queryClient.invalidateQueries({ queryKey: ["locations"] });
      queryClient.invalidateQueries({ queryKey: ["all-stores"] });
      toast.success("Store deleted successfully!");
    },
    onError: (err: any) => {
      const errMsg =
        err?.response?.data?.message ||
        err?.message ||
        "Failed to delete store";
      toast.error(errMsg);
    },
  });
}
