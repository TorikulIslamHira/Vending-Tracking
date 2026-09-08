import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toast";
import { QueryProvider } from "@/components/providers/QueryProvider";
import { KeyboardAvoidingProvider } from "@/components/providers/KeyboardAvoidingProvider";
import defaultThemeConfig from "@/config/theme";

const inter = Inter({ subsets: ["latin"] });

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
      <body className={inter.className}>
        <QueryProvider>
          <KeyboardAvoidingProvider>
            {children}
            <Toaster position="top-right" richColors />
          </KeyboardAvoidingProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
