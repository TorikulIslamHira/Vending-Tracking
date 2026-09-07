"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export interface AuditLogItem {
  id: string;
  action: string;
  actorId: string;
  targetId?: string | null;
  details?: Record<string, any> | null;
  createdAt: string;
  actor?: {
    id: string;
    name: string;
    email: string;
  } | null;
}

/**
 * Only ever populated for the root Super Admin — the API returns 403 for
 * anyone else, so this hook simply surfaces an empty list on failure.
 */
export function useAuditLogs() {
  return useQuery<AuditLogItem[]>({
    queryKey: ["audit-logs"],
    queryFn: async () => {
      try {
        const res = await api.get("/audit-logs");
        return res.data?.data || [];
      } catch {
        return [];
      }
    },
    staleTime: 1000 * 30,
  });
}
