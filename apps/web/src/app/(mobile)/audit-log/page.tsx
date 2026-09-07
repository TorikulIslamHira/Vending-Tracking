"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { useAuditLogs } from "@/hooks/useAuditLogs";
import { useUsers } from "@/hooks/useUsers";
import { useAuthStore } from "@/store/useAuthStore";
import { ArrowLeft, ShieldAlert, Trash2, Clock, User, Lock } from "lucide-react";

function getActionMeta(action: string) {
  switch (action) {
    case "MACHINE_DELETED":
      return {
        label: "Machine Deleted",
        icon: Trash2,
        badgeClass: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
      };
    default:
      return {
        label: action,
        icon: ShieldAlert,
        badgeClass: "bg-muted/60 text-foreground border-border/40",
      };
  }
}

export default function AuditLogPage() {
  const router = useRouter();
  const currentUser = useAuthStore((s) => s.user);
  const { data: appUsers = [] } = useUsers();
  const currentUserIsRoot =
    appUsers.find((u) => u.id === currentUser?.id)?.isRootAdmin ?? false;

  const { data: logs = [], isLoading } = useAuditLogs();

  if (!currentUserIsRoot) {
    return (
      <div className="w-full px-4 py-4 space-y-4 font-sans">
        <div className="flex items-center justify-between pt-1">
          <button
            onClick={() => router.push("/settings")}
            className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground hover:text-foreground active:scale-95 transition-transform"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>More & Settings</span>
          </button>
        </div>
        <div className="p-8 text-center border border-dashed border-border/60 rounded-2xl space-y-2 bg-card">
          <Lock className="h-7 w-7 text-muted-foreground/40 mx-auto" />
          <p className="text-xs font-semibold text-foreground">Access Restricted</p>
          <p className="text-[11px] text-muted-foreground max-w-xs mx-auto">
            The audit log is only visible to the root Super Admin.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full px-4 py-4 space-y-4 font-sans">
      {/* Header */}
      <div className="flex items-center justify-between pt-1">
        <button
          onClick={() => router.push("/settings")}
          className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground hover:text-foreground active:scale-95 transition-transform"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>More & Settings</span>
        </button>
      </div>

      <div className="p-4 rounded-2xl bg-muted/40 border border-border/50 space-y-1 shadow-xs">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-black tracking-tight text-foreground">
              Admin Audit Log
            </h1>
            <p className="text-xs text-muted-foreground">
              Sensitive administrative actions — visible only to you.
            </p>
          </div>
          <div className="h-10 w-10 rounded-2xl bg-rose-500/15 flex items-center justify-center text-rose-600 dark:text-rose-400 shrink-0">
            <ShieldAlert className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* Timeline */}
      {isLoading ? (
        <div className="space-y-2.5">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className="h-20 w-full bg-card/60 border border-border/40 rounded-2xl animate-pulse"
            />
          ))}
        </div>
      ) : logs.length === 0 ? (
        <div className="p-8 text-center border border-dashed border-border/60 rounded-2xl space-y-2 bg-card">
          <ShieldAlert className="h-7 w-7 text-muted-foreground/40 mx-auto" />
          <p className="text-xs font-semibold text-foreground">No Audit Events Yet</p>
          <p className="text-[11px] text-muted-foreground max-w-xs mx-auto">
            Sensitive actions like machine deletion will be recorded here.
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {logs.map((log) => {
            const { label, icon: Icon, badgeClass } = getActionMeta(log.action);
            const created = new Date(log.createdAt);

            return (
              <Card key={log.id} className="border-border/50 bg-card shadow-xs">
                <CardContent className="p-3.5 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-bold border ${badgeClass}`}
                    >
                      <Icon className="h-3 w-3" />
                      <span>{label}</span>
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                    <User className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <span>{log.actor?.name || "Unknown user"}</span>
                    <span className="text-muted-foreground font-normal truncate">
                      • {log.actor?.email}
                    </span>
                  </div>

                  {log.details && (
                    <p className="text-[11px] text-muted-foreground leading-snug">
                      {log.details.serialNumber && (
                        <span className="font-mono">{log.details.serialNumber}</span>
                      )}
                      {log.details.location && <span> — {log.details.location}</span>}
                    </p>
                  )}

                  <div className="flex items-center gap-1 pt-1 border-t border-border/30 text-[10px] text-muted-foreground">
                    <Clock className="h-3 w-3 text-muted-foreground/70 shrink-0" />
                    <span>
                      {created.toLocaleDateString([], {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                      {" • "}
                      {created.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
