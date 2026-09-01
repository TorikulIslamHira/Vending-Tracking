"use client";

import React, { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Html5QrcodeScanner, Html5QrcodeSupportedFormats } from "html5-qrcode";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  QrCode,
  Camera,
  AlertCircle,
  Keyboard,
  ArrowRight,
  Sparkles,
  Server,
} from "lucide-react";

export default function QRScannerPage() {
  const router = useRouter();
  const [manualCode, setManualCode] = useState("");
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(true);
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  useEffect(() => {
    let isMounted = true;

    try {
      const scanner = new Html5QrcodeScanner(
        "qr-reader-container",
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
          rememberLastUsedCamera: true,
        },
        /* verbose= */ false
      );

      scannerRef.current = scanner;

      scanner.render(
        (decodedText) => {
          if (!isMounted) return;
          toast.success(`QR Code Detected: ${decodedText}`);
          // Stop scanner
          scanner.clear().catch(() => {});
          // Navigate to machine page
          const cleanCode = encodeURIComponent(decodedText.trim());
          router.push(`/machine/${cleanCode}`);
        },
        (error) => {
          // Ignored scanning frame error
        }
      );
    } catch (err: any) {
      if (isMounted) {
        setCameraError(
          err?.message || "Camera access was denied or is not supported on this device."
        );
      }
    }

    return () => {
      isMounted = false;
      if (scannerRef.current) {
        scannerRef.current.clear().catch(() => {});
      }
    };
  }, [router]);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim()) {
      toast.error("Please enter a Machine Serial or QR code identifier");
      return;
    }
    const cleanCode = encodeURIComponent(manualCode.trim());
    router.push(`/machine/${cleanCode}`);
  };

  return (
    <div className="space-y-4">
      {/* Title & Instructions */}
      <div>
        <div className="flex items-center gap-2">
          <QrCode className="h-5 w-5 text-primary" />
          <h1 className="text-xl font-bold tracking-tight text-foreground">
            Scan Machine QR
          </h1>
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">
          Align the machine's QR code within the frame to start restock or cash drop.
        </p>
      </div>

      {/* Camera Scanner View */}
      <Card className="border-border/60 overflow-hidden shadow-sm">
        <CardContent className="p-3">
          {cameraError ? (
            <div className="flex flex-col items-center justify-center p-6 text-center bg-destructive/10 rounded-lg text-destructive">
              <AlertCircle className="h-8 w-8 mb-2" />
              <p className="text-sm font-semibold">Camera Access Unavailable</p>
              <p className="text-xs text-muted-foreground mt-1 max-w-xs">
                {cameraError}
              </p>
            </div>
          ) : (
            <div className="relative rounded-lg overflow-hidden bg-slate-900 border border-slate-800">
              <div id="qr-reader-container" className="w-full" />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Manual Input Fallback */}
      <Card className="border-border/60">
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <Keyboard className="h-3.5 w-3.5" />
            <span>Manual Code Entry</span>
          </CardTitle>
          <CardDescription className="text-xs">
            Cannot scan? Type the machine serial or QR code directly.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <form onSubmit={handleManualSubmit} className="flex gap-2">
            <Input
              placeholder="e.g. VM-NY-010 or QR-NY-010"
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              className="h-10 text-sm font-mono"
            />
            <Button type="submit" className="shrink-0 gap-1.5 h-10 px-4">
              <span>Open</span>
              <ArrowRight className="h-4 w-4" />
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Demo Quick Shortcuts */}
      <div className="pt-2">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block mb-2 px-1">
          Quick Fleet Shortcuts (Demo)
        </span>
        <div className="grid grid-cols-2 gap-2">
          {[
            { id: "VM-NY-010", location: "Grand Central" },
            { id: "VM-NY-014", location: "Times Square" },
            { id: "VM-NJ-003", location: "Hoboken Terminal" },
            { id: "VM-NY-015", location: "JFK Airport" },
          ].map((item) => (
            <Button
              key={item.id}
              variant="outline"
              size="sm"
              onClick={() => router.push(`/machine/${item.id}`)}
              className="flex items-center justify-between text-xs h-11 px-3 border-border/80"
            >
              <div className="flex flex-col items-start truncate">
                <span className="font-semibold text-foreground font-mono">
                  {item.id}
                </span>
                <span className="text-[10px] text-muted-foreground truncate">
                  {item.location}
                </span>
              </div>
              <ArrowRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}
