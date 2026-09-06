"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { api } from "@/lib/api";

export interface AppUser {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "MANAGER" | "RESTOCKER" | "FIELD_AGENT";
  status: "ACTIVE" | "INACTIVE";
  assignedCount: number;
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
      role: "ADMIN" | "MANAGER" | "RESTOCKER" | "FIELD_AGENT";
    }) => {
      const res = await api.post("/users", {
        name: data.name,
        email: data.email,
        role: data.role === "ADMIN" ? "ADMIN" : "FIELD_AGENT",
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
