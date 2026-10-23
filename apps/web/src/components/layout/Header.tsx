"use client";

import React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuthStore } from "@/store/useAuthStore";
import { defaultThemeConfig } from "@/config/theme";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { User, LogOut, Shield, Building2, LogIn, Sparkles } from "lucide-react";

export function Header() {
  const { user, isAuthenticated, logout } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  return (
    <header className="shrink-0 flex h-16 w-full items-center justify-between gap-3 border-b bg-card/80 px-4 sm:px-6 pt-[env(safe-area-inset-top)] print:hidden">
      <div className="flex items-center gap-2 min-w-0">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm shrink-0">
          <Sparkles className="h-4 w-4" />
        </div>
        <div className="hidden sm:flex items-center gap-2 rounded-md bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary min-w-0">
          <Building2 className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">
            {user?.tenantName || defaultThemeConfig.appName}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {!isAuthenticated ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push(`/login?redirect=${encodeURIComponent(pathname)}`)}
            className="h-8 px-2.5 rounded-xl text-xs font-semibold gap-1 text-primary hover:text-primary hover:bg-primary/10"
          >
            <LogIn className="h-3.5 w-3.5" />
            <span>Sign In</span>
          </Button>
        ) : user?.role === "PRESENTATION" ? (
          <span className="flex items-center gap-1.5 rounded-full bg-accent/80 px-2.5 py-1 text-[11px] font-medium text-foreground">
            <Shield className="h-3 w-3 text-primary" />
            Read-only demo
          </span>
        ) : (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="flex items-center gap-2 rounded-full border-border/80 px-3 py-1.5 shadow-sm"
              >
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/20 text-primary">
                  <User className="h-3.5 w-3.5" />
                </div>
                <div className="text-left text-xs font-medium max-w-[120px] truncate">
                  {user?.name || "Operator Account"}
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">
                    {user?.name || "Operator"}
                  </p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {user?.email || "operator@vending.io"}
                  </p>
                  <div className="mt-1 flex items-center gap-1 text-[10px] text-primary">
                    <Shield className="h-3 w-3" />
                    <span>Role: {user?.role || "ADMIN"}</span>
                  </div>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/profile" className="cursor-pointer">
                  <User className="mr-2 h-4 w-4" />
                  <span>Profile</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={handleLogout}
                className="cursor-pointer text-destructive focus:bg-destructive/10 focus:text-destructive"
              >
                <LogOut className="mr-2 h-4 w-4" />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </header>
  );
}

export default Header;
