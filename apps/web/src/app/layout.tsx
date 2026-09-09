import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/toast";
import { QueryProvider } from "@/components/providers/QueryProvider";
import { KeyboardAvoidingProvider } from "@/components/providers/KeyboardAvoidingProvider";
import { NativeSplashScreenProvider } from "@/components/providers/NativeSplashScreenProvider";
import defaultThemeConfig from "@/config/theme";

export const metadata: Metadata = {
  title: `${defaultThemeConfig.appName} - Operator & Admin Dashboard`,
  description: "Enterprise Multi-Tenant Vending Machine SaaS Management Platform",
};

// maximumScale/userScalable=false, at the user's explicit request, disable
// pinch-zoom app-wide — this is a real accessibility tradeoff (WCAG
// 1.4.4/1.4.10 call for user-controlled zoom up to 200%+), not something the
// auto-zoom-on-focus fix requires; that's already solved by 16px input
// font-size (see components/ui/input.tsx), which works with zoom left on.
// interactiveWidget: "resizes-content" makes the on-screen keyboard shrink
// the layout viewport (like React Native's KeyboardAvoidingView) instead of
// overlaying content, so a focused input near the bottom of the screen
// isn't hidden behind the keyboard.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  interactiveWidget: "resizes-content",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/*
          next/font/google fetches and self-hosts font files at *build*
          time — on a VPS build container with restricted/unreliable
          outbound network access, that fetch can hang and fail the whole
          `next build` with ETIMEDOUT (exactly what happened in CI/CD).
          Loading Inter via a plain stylesheet link instead defers that
          fetch to each visitor's browser at page-load time, so it can
          never block a build again. preconnect warms up both origins
          (the stylesheet host and the actual font-file host) before the
          stylesheet request even resolves.
        */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font --
            this rule is warning as if this were a per-page <link> (which
            really would only load the font on one page); this is the App
            Router *root* layout, the direct equivalent of _document.js in
            the Pages Router that the rule expects font links to live in. */}
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased font-sans">
        <QueryProvider>
          <NativeSplashScreenProvider>
            <KeyboardAvoidingProvider>
              {children}
              <Toaster position="top-right" richColors />
            </KeyboardAvoidingProvider>
          </NativeSplashScreenProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
