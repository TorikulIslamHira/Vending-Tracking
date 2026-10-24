"use client";

import { WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";

// Reachable with no auth (see middleware.ts) so the service worker can
// precache it on install and serve it when a navigation fails offline —
// it never goes through AppShell (this route isn't under the (agent) or
// (mobile) groups), so there's no chrome/auth state to worry about here.
export default function OfflinePage() {
  return (
    <div className="h-[100dvh] w-full flex flex-col items-center justify-center gap-4 bg-background px-6 text-center pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/15 text-primary">
        <WifiOff className="h-8 w-8" />
      </div>
      <div className="space-y-1">
        <h1 className="text-xl font-black tracking-tight text-foreground">You&apos;re offline</h1>
        <p className="text-sm text-muted-foreground max-w-xs">
          Check your connection and try again.
        </p>
      </div>
      <Button
        onClick={() => window.location.reload()}
        className="rounded-2xl px-6 font-bold"
      >
        Retry
      </Button>
    </div>
  );
}
