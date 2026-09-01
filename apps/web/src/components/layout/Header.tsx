"use client";

import React from "react";
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
import { User, LogOut, Shield, Building2 } from "lucide-react";

export function Header() {
  const { user, logout } = useAuthStore();

  return (
    <header className="sticky top-0 z-40 flex h-16 w-full items-center justify-between border-b bg-card/80 px-6 backdrop-blur-md">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 rounded-md bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
          <Building2 className="h-4 w-4" />
          <span>{user?.tenantName || defaultThemeConfig.appName}</span>
        </div>
      </div>

      <div className="flex items-center gap-4">
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
              <div className="text-left text-xs font-medium">
                <span>{user?.name || "Operator Account"}</span>
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
                  <span>Role: {user?.role || "FIELD_AGENT"}</span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => logout()}
              className="cursor-pointer text-destructive focus:bg-destructive/10 focus:text-destructive"
            >
              <LogOut className="mr-2 h-4 w-4" />
              <span>Log out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}

export default Header;
