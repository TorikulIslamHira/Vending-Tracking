"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuthStore } from "@/store/useAuthStore";
import { useUsers } from "@/hooks/useUsers";
import { cn } from "@/lib/utils";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { NAV_ITEMS, getActiveNavHref } from "./navConfig";

export function MobileNavSheet() {
  const pathname = usePathname();
  const { user } = useAuthStore();
  const { data: appUsers = [] } = useUsers();
  const isRootAdmin = appUsers.find((u) => u.id === user?.id)?.isRootAdmin ?? false;
  const [open, setOpen] = React.useState(false);
  const activeHref = getActiveNavHref(pathname);
  const items = NAV_ITEMS.filter((item) => !item.rootOnly || isRootAdmin);

  // Radix's Dialog content lives inside this shared shell, not per-page, so
  // it survives client-side navigation instead of unmounting — close it
  // explicitly once the route actually changes.
  React.useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="md:hidden h-9 w-9 shrink-0"
          aria-label="Open navigation menu"
        >
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent
        side="left"
        className="w-[85vw] max-w-xs p-0 flex flex-col pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]"
      >
        <SheetTitle className="sr-only">Navigation</SheetTitle>
        <SheetDescription className="sr-only">
          App navigation menu
        </SheetDescription>
        <nav className="flex-1 overflow-y-auto p-4 space-y-1.5">
          {items.map((item) => {
            const isActive = item.href === activeHref;
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-3 min-h-[44px] text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground font-semibold"
                    : "text-muted-foreground hover:bg-accent/60 hover:text-foreground"
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </SheetContent>
    </Sheet>
  );
}

export default MobileNavSheet;
