"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useMachines } from "@/hooks/useMachines";
import { toast } from "sonner";
import {
  QrCode,
  AlertCircle,
  Keyboard,
  ArrowRight,
  Boxes,
  KeyRound,
  Loader2,
  Store,
  Camera,
  X,
} from "lucide-react";

const QR_READER_ELEMENT_ID = "qr-reader-container";

type ScannerStatus = "idle" | "starting" | "active" | "error";

function isIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    // iPadOS 13+ reports as "MacIntel" but exposes touch support
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

type ScanTarget = { type: "store" | "machine"; id: string };

/**
 * QR codes encode a full destination URL (e.g.
 * "https://app.example.com/machine/VM-NY-010" or ".../store/abc123"), not a
 * bare ID — a phone's native camera app resolves that URL itself and lets
 * Next.js routing pull the ID out of the path via useParams(). The in-app
 * scanner instead hands us that raw decoded string directly, so it must do
 * the same extraction itself: detect a URL, take the last pathname segment
 * as the ID, and check the segment before it ("store" vs "machine") to know
 * which picker to route to. Falls back to treating the scanned text as a
 * machine identifier if it isn't a URL at all (e.g. a plain serial number
 * printed on an older label).
 */
function resolveScanTarget(scannedText: string): ScanTarget {
  const trimmed = scannedText.trim();
  let rawId = trimmed;
  let type: ScanTarget["type"] = "machine";

  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const url = new URL(trimmed);
      const segments = url.pathname.split("/").filter(Boolean);
      rawId = segments.pop() || trimmed;
      if (segments[segments.length - 1] === "store") {
        type = "store";
      }
    } catch {
      // Looked like a URL but failed to parse — fall back to the raw scan.
      rawId = trimmed;
    }
  }

  try {
    return { type, id: decodeURIComponent(rawId) };
  } catch {
    // Not a valid percent-encoded sequence — use it verbatim.
    return { type, id: rawId };
  }
}

export default function QRScannerPage() {
  const router = useRouter();
  const [manualCode, setManualCode] = useState("");
  const [status, setStatus] = useState<ScannerStatus>("idle");
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);

  const { data: machinesList = [], isLoading: isMachinesLoading } = useMachines();

  const stopScanner = () => {
    const instance = html5QrCodeRef.current;
    if (instance && instance.isScanning) {
      instance.stop().catch(() => {});
    }
  };

  // Only ever tears the camera down — never starts it. iOS WebKit silently
  // refuses navigator.mediaDevices.getUserMedia() unless it's invoked as the
  // direct, synchronous result of a user gesture, so nothing here (mount,
  // effects, timers) may ever call .start() on its own.
  useEffect(() => {
    return () => {
      stopScanner();
    };
  }, []);

  const handleStartScanner = async () => {
    setCameraError(null);
    setPermissionDenied(false);
    setStatus("starting");

    try {
      if (!html5QrCodeRef.current) {
        html5QrCodeRef.current = new Html5Qrcode(QR_READER_ELEMENT_ID, {
          formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
          verbose: false,
        });
      }

      await html5QrCodeRef.current.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText) => {
          const { type, id } = resolveScanTarget(decodedText);
          toast.success(`QR Code Detected: ${id}`);
          stopScanner();
          setStatus("idle");
          router.push(
            type === "store"
              ? `/store/${encodeURIComponent(id)}`
              : `/machine/${encodeURIComponent(id)}`
          );
        },
        () => {
          // Ignored per-frame scan miss — expected while the camera hunts for a code.
        }
      );

      setStatus("active");
    } catch (err: any) {
      const name = err?.name || "";
      const message = String(err?.message || err || "");
      const deniedByUser =
        name === "NotAllowedError" ||
        name === "PermissionDeniedError" ||
        /permission/i.test(message);

      setStatus("error");
      if (deniedByUser) {
        setPermissionDenied(true);
        setCameraError("Camera access was denied.");
      } else if (name === "NotFoundError" || name === "OverconstrainedError") {
        setCameraError("No compatible camera was found on this device.");
      } else {
        setCameraError(message || "Camera access is unavailable on this device.");
      }
    }
  };

  const handleStopScanner = () => {
    stopScanner();
    setStatus("idle");
  };

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
    <div className="space-y-4 pb-12 font-sans">
      {/* Title & Instructions */}
      <div>
        <div className="flex items-center gap-2">
          <QrCode className="h-5 w-5 text-primary" />
          <h1 className="text-xl font-bold tracking-tight text-foreground">
            Scan Machine QR
          </h1>
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">
          Align the machine&apos;s QR code within the frame to start restock or cash collect.
        </p>
      </div>

      {/* Camera Scanner View */}
      <Card className="border-border/60 overflow-hidden shadow-sm">
        <CardContent className="p-3">
          <div className="rounded-lg overflow-hidden bg-slate-900 border border-slate-800">
            {/* Always present in the DOM (so html5-qrcode has an element to
                bind to the instant a user taps Start) but collapsed to zero
                height until scanning is actually active — no absolute
                overlay, so there's nothing that could ever sit on top of the
                Start button and swallow its click. */}
            <div
              id={QR_READER_ELEMENT_ID}
              className={status === "active" ? "w-full" : "w-full h-0 overflow-hidden"}
            />

            {status !== "active" && (
              <div className="flex flex-col items-center justify-center gap-3 p-8 text-center">
                {status === "error" ? (
                  <>
                    <AlertCircle className="h-8 w-8 text-destructive" />
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-white">
                        Camera Access Unavailable
                      </p>
                      <p className="text-xs text-slate-400 max-w-xs">{cameraError}</p>
                      {permissionDenied && (
                        <p className="text-xs text-slate-400 max-w-xs pt-1">
                          {isIOS()
                            ? "Enable it via Settings → Safari → Camera (or Settings → [Browser] → Camera), then reload this page and try again."
                            : "Enable camera access for this site in your browser settings, then reload this page and try again."}
                        </p>
                      )}
                    </div>
                  </>
                ) : (
                  <Camera className="h-8 w-8 text-slate-500" />
                )}

                <Button
                  type="button"
                  onClick={handleStartScanner}
                  disabled={status === "starting"}
                  className="gap-2 h-11 px-5 font-semibold"
                >
                  {status === "starting" ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Requesting Camera...</span>
                    </>
                  ) : status === "error" ? (
                    <>
                      <Camera className="h-4 w-4" />
                      <span>Try Again</span>
                    </>
                  ) : (
                    <>
                      <Camera className="h-4 w-4" />
                      <span>Tap to Start Scanner</span>
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>

          {status === "active" && (
            <button
              type="button"
              onClick={handleStopScanner}
              className="mt-2 w-full flex items-center justify-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground py-2 active:scale-[0.98] transition-transform"
            >
              <X className="h-3.5 w-3.5" />
              <span>Cancel Scan</span>
            </button>
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
              placeholder="e.g. VM-GC-2608-0001 or QR code"
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

      {/* Dedicated Browse All Machines Action Banner */}
      <Card
        onClick={() => router.push("/browse")}
        className="border-border/60 bg-gradient-to-r from-card via-card/95 to-primary/10 hover:border-primary/50 transition-all cursor-pointer shadow-xs active:scale-[0.99] p-4 flex items-center justify-between"
      >
        <div className="flex items-center gap-3 min-w-0 pr-2">
          <div className="h-10 w-10 rounded-2xl bg-primary/15 text-primary flex items-center justify-center shrink-0">
            <Store className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h3 className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <span>Browse All Machines</span>
              <span className="text-[9px] font-bold text-primary bg-primary/10 px-1.5 py-0.2 rounded-md">
                Directory
              </span>
            </h3>
            <p className="text-[11px] text-muted-foreground truncate">
              Explore stores and select units without scanning QR
            </p>
          </div>
        </div>
        <div className="h-8 w-8 rounded-xl bg-muted/60 flex items-center justify-center text-foreground shrink-0 border border-border/40">
          <ArrowRight className="h-4 w-4" />
        </div>
      </Card>

      {/* Real Dynamic Quick Fleet Shortcuts */}
      <div className="pt-2">
        <div className="flex items-center justify-between mb-2 px-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Quick Fleet Shortcuts
          </span>
          {machinesList.length > 0 && (
            <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
              {machinesList.length} Active {machinesList.length === 1 ? "Unit" : "Units"}
            </span>
          )}
        </div>

        {isMachinesLoading ? (
          <div className="flex items-center justify-center p-6 border border-dashed border-border/60 rounded-xl">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          </div>
        ) : machinesList.length > 0 ? (
          <div className="grid grid-cols-2 gap-2">
            {machinesList.slice(0, 6).map((item) => (
              <Button
                key={item.id}
                variant="outline"
                size="sm"
                onClick={() =>
                  router.push(`/machine/${encodeURIComponent(item.serialNumber || item.id)}`)
                }
                className="flex items-center justify-between text-xs h-13 px-3 border-border/80 text-left bg-card hover:border-primary/50 transition-colors shadow-2xs"
              >
                <div className="flex flex-col items-start truncate min-w-0 pr-1">
                  <span className="font-bold text-foreground font-mono truncate max-w-full">
                    {item.serialNumber || item.id}
                  </span>
                  <span className="text-[10px] text-muted-foreground truncate max-w-full">
                    {item.storeName || item.location}
                  </span>
                  {item.keyNumber && (
                    <span className="text-[9px] font-mono text-amber-600 dark:text-amber-400 font-semibold flex items-center gap-0.5 mt-0.5">
                      <KeyRound className="h-2.5 w-2.5 shrink-0" />
                      <span>{item.keyNumber}</span>
                    </span>
                  )}
                </div>
                <ArrowRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              </Button>
            ))}
          </div>
        ) : (
          <div className="p-4 border border-dashed border-border/60 rounded-xl text-center">
            <Boxes className="h-5 w-5 text-muted-foreground mx-auto mb-1.5" />
            <p className="text-xs font-medium text-foreground">No registered machines yet</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Machines registered by the admin will appear here for one-tap routing.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
