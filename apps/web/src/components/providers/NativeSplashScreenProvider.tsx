"use client";

import React, { useEffect } from "react";

/**
 * No visual output. Only matters inside the Capacitor native shell, where
 * capacitor.config.ts sets SplashScreen.launchAutoHide: false so the splash
 * stays up until this actually mounts — the live production page (loaded
 * over the network via server.url, not bundled) can take a moment to
 * arrive, and a fixed-timer splash would risk hiding before there's
 * anything to show. In an ordinary browser tab, @capacitor/core reports
 * isNativePlatform() === false and this is a complete no-op.
 */
export function NativeSplashScreenProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    let cancelled = false;

    import("@capacitor/core")
      .then(({ Capacitor }) => {
        if (cancelled || !Capacitor.isNativePlatform()) return;
        return import("@capacitor/splash-screen").then(({ SplashScreen }) => SplashScreen.hide());
      })
      .catch(() => {
        // Not running under Capacitor (or the plugin bridge isn't ready) —
        // nothing to hide, nothing to report.
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return <>{children}</>;
}

export default NativeSplashScreenProvider;
