"use client";

import { useEffect } from "react";

/**
 * No visual output. Registers /sw.js in production browser contexts only —
 * skipped in dev (so a stale cached chunk never survives a hot reload) and
 * skipped entirely inside the Capacitor native shell: capacitor.config.ts
 * loads this same app as a Hosted Web App (server.url, not a bundled
 * build), so without this guard the native WebView would register the same
 * service worker as the browser PWA and intercept its own navigation/asset
 * requests for no benefit. Same isNativePlatform() detection pattern as
 * NativeSplashScreenProvider.
 */
export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;

    let cancelled = false;

    import("@capacitor/core")
      .then(({ Capacitor }) => {
        if (cancelled || Capacitor.isNativePlatform()) return;
        return navigator.serviceWorker.register("/sw.js");
      })
      .catch(() => {
        // Not running under Capacitor (expected in a plain browser tab —
        // @capacitor/core still resolves fine there) or registration
        // itself failed; either way there's nothing to report.
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}

export default ServiceWorkerRegistrar;
