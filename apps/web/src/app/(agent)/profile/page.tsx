"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useAuthStore } from "@/store/useAuthStore";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { User, Mail, ShieldCheck, LogOut, Boxes } from "lucide-react";

export default function AgentProfilePage() {
  const router = useRouter();
  const { user, logout } = useAuthStore();

  const handleLogout = () => {
    logout();
    toast.success("Signed out");
    router.push("/login");
  };

  return (
    <div className="space-y-4 pb-4">
      <div>
        <div className="flex items-center gap-2">
          <User className="h-5 w-5 text-primary" />
          <h1 className="text-xl font-bold tracking-tight text-foreground">
            My Profile
          </h1>
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">
          Your account details for this organization.
        </p>
      </div>

      <Card className="border-border/60 shadow-sm">
        <CardContent className="p-5 flex flex-col items-center text-center gap-1 border-b border-border/40">
          <div className="h-16 w-16 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center font-black text-xl shadow-md shadow-primary/30">
            {(user?.name || "?")
              .split(" ")
              .map((n) => n[0])
              .join("")
              .slice(0, 2)
              .toUpperCase()}
          </div>
          <h2 className="font-bold text-base text-foreground mt-1">
            {user?.name || "Unknown User"}
          </h2>
          <span className="text-[10px] font-black uppercase tracking-wider bg-primary/20 text-foreground px-2 py-0.5 rounded-full">
            Field Agent
          </span>
        </CardContent>

        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-2.5 text-xs">
            <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="text-foreground font-medium truncate">
              {user?.email || "—"}
            </span>
          </div>
          <div className="flex items-center gap-2.5 text-xs">
            <Boxes className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="text-foreground font-medium truncate">
              {user?.tenantName || "—"}
            </span>
          </div>
          <div className="flex items-center gap-2.5 text-xs">
            <ShieldCheck className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="text-foreground font-medium">
              Restocker access — scan, restock &amp; collect
            </span>
          </div>
        </CardContent>
      </Card>

      <p className="text-[11px] text-muted-foreground text-center px-4">
        Need a password reset or a role change? Ask your organization&apos;s
        Admin — they can update it from User Management.
      </p>

      <Button
        type="button"
        variant="outline"
        onClick={handleLogout}
        className="w-full h-12 rounded-2xl text-rose-600 dark:text-rose-400 border-rose-500/30 hover:bg-rose-500/10 font-bold text-xs gap-2 active:scale-[0.98] transition-transform shadow-xs"
      >
        <LogOut className="h-4 w-4" />
        <span>Sign Out</span>
      </Button>
    </div>
  );
}
