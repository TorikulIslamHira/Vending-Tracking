import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toast";
import { QueryProvider } from "@/components/providers/QueryProvider";
import defaultThemeConfig from "@/config/theme";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: `${defaultThemeConfig.appName} - Operator & Admin Dashboard`,
  description: "Enterprise Multi-Tenant Vending Machine SaaS Management Platform",
};

// Deliberately no maximum-scale/user-scalable=no here: that would fix the
// iOS auto-zoom-on-focus symptom by disabling pinch-zoom entirely, which
// breaks zoom for low-vision users (WCAG 1.4.4/1.4.10) and isn't actually
// the fix — 16px input font-size is (see components/ui/input.tsx).
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
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
          {children}
          <Toaster position="top-right" richColors />
        </QueryProvider>
      </body>
    </html>
  );
}
