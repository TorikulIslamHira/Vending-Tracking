"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { api } from "@/lib/api";

/**
 * The backend stores exactly three roles — ADMIN, FIELD_AGENT, and
 * PRESENTATION (see @vending/shared-types UserRole). "MANAGER"/"RESTOCKER"
 * used to exist only as dropdown labels on the frontend, mapped down to one
 * of ADMIN/FIELD_AGENT before ever reaching the API; that mapping silently
 * dropped "MANAGER" to FIELD_AGENT instead of ADMIN, so selecting "Store
 * Manager" never actually granted admin access. Fixed by dropping the extra
 * UI-only values entirely — see the Edit/Add User dropdown in
 * (mobile)/users/page.tsx.
 *
 * PRESENTATION is a strictly read-only, demo/investor-facing role: it sees
 * the exact same data as an Admin, but every financial figure is skewed by
 * `dataModifierPercentage` at the API response layer (never touching real
 * data), and every mutating request it sends is rejected with 403.
 */
export interface AppUser {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "FIELD_AGENT" | "PRESENTATION";
  status: "ACTIVE" | "INACTIVE";
  assignedCount: number;
  /** The single root Super Admin bootstrapped from SUPER_ADMIN_EMAIL — cannot be deactivated. */
  isRootAdmin?: boolean;
  /** Effective permission to delete machines — always true for the root Super Admin. */
  canDeleteMachines?: boolean;
  /** Only meaningful when role === "PRESENTATION"; 0 for every other role. */
  dataModifierPercentage?: number;
}

export function useUsers() {
  return useQuery<AppUser[]>({
    queryKey: ["users"],
    queryFn: async () => {
      try {
        const res = await api.get("/users");
        return res.data?.data || [];
      } catch {
        return [];
      }
    },
    staleTime: 1000 * 60,
  });
}

export function useCreateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      name: string;
      email: string;
      role: "ADMIN" | "FIELD_AGENT" | "PRESENTATION";
      password: string;
      /** Only sent when role === "PRESENTATION"; ignored server-side otherwise. */
      dataModifierPercentage?: number;
    }) => {
      const res = await api.post("/users", {
        name: data.name,
        email: data.email,
        role: data.role,
        password: data.password,
        dataModifierPercentage: data.dataModifierPercentage,
      });
      return res.data?.data;
    },
    onSuccess: (newUser) => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success(`User "${newUser?.name || "Member"}" onboarded successfully!`);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || err?.message || "Failed to add user");
    },
  });
}

export function useUpdateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      userId,
      ...data
    }: {
      userId: string;
      name?: string;
      email?: string;
      role?: "ADMIN" | "FIELD_AGENT" | "PRESENTATION";
      /** Omit (or leave blank) to keep the user's current password. */
      password?: string;
      /** Only honored when the (new or existing) role is "PRESENTATION". */
      dataModifierPercentage?: number;
    }) => {
      const payload: Record<string, string | number> = {};
      if (data.name !== undefined) payload.name = data.name;
      if (data.email !== undefined) payload.email = data.email;
      if (data.role !== undefined) payload.role = data.role;
      if (data.password) payload.password = data.password;
      if (data.dataModifierPercentage !== undefined) {
        payload.dataModifierPercentage = data.dataModifierPercentage;
      }

      const res = await api.patch(`/users/${userId}`, payload);
      return res.data?.data as AppUser;
    },
    onSuccess: (updatedUser) => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success(`"${updatedUser?.name || "User"}" updated successfully!`);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || err?.message || "Failed to update user");
    },
  });
}

export function useToggleUserStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userId: string) => {
      const res = await api.patch(`/users/${userId}/status`);
      return res.data?.data as AppUser;
    },
    onSuccess: (updatedUser) => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success(
        updatedUser?.status === "INACTIVE"
          ? "User deactivated"
          : "User reactivated"
      );
    },
    onError: (err: any) => {
      toast.error(
        err?.response?.data?.message || err?.message || "Failed to update user status"
      );
    },
  });
}

export function useToggleDeletePermission() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, canDeleteMachines }: { userId: string; canDeleteMachines: boolean }) => {
      const res = await api.patch(`/users/${userId}/delete-permission`, { canDeleteMachines });
      return res.data?.data as AppUser;
    },
    onSuccess: (updatedUser) => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success(
        updatedUser?.canDeleteMachines
          ? `Machine deletion permission granted to ${updatedUser.name}`
          : `Machine deletion permission revoked from ${updatedUser?.name}`
      );
    },
    onError: (err: any) => {
      toast.error(
        err?.response?.data?.message || err?.message || "Failed to update machine deletion permission"
      );
    },
  });
}
