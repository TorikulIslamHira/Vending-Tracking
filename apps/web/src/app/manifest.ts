import type { MetadataRoute } from "next";
import defaultThemeConfig from "@/config/theme";

// Next's app/manifest.ts convention: auto-served at /manifest.webmanifest
// with the correct application/manifest+json content-type, and a
// <link rel="manifest"> is injected into <head> automatically — no public/
// file or manual <link> tag needed.
//
// start_url is "/dashboard" per spec, but that's just where the OS launches
// the installed app — middleware.ts already redirects any unauthenticated
// request there to /login (same as a normal browser visit), so there's
// nothing PWA-specific to wire up for that requirement.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: defaultThemeConfig.appName,
    short_name: "Bee Vending",
    description: "Enterprise Multi-Tenant Vending Machine SaaS Management Platform",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    // Matches the app's --background token / the Capacitor splash screen's
    // own backgroundColor (capacitor.config.ts) — same value, same source.
    background_color: "#F8FAFC",
    theme_color: defaultThemeConfig.primaryColor,
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
