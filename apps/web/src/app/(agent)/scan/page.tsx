"use client";

import React, { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";
import { QRCodeSVG } from "qrcode.react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useMachines } from "@/hooks/useMachines";
import { useAuthStore } from "@/store/useAuthStore";
import { api as apiClient } from "@/lib/api";
import { toast } from "sonner";
import {
  QrCode,
  AlertCircle,
  Keyboard,
  ArrowRight,
  ArrowLeft,
  Boxes,
  KeyRound,
  Loader2,
  Store,
  MapPin,
  Camera,
  Search,
  X,
  Download,
  Printer,
  Sparkles,
  ShieldCheck,
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

/** TAB 1: Scan a QR code (camera or manual entry) to jump straight to a machine/store. */
function ScanModeView() {
  const router = useRouter();
  const [manualCode, setManualCode] = useState("");
  const [status, setStatus] = useState<ScannerStatus>("idle");
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const manualEntryRef = useRef<HTMLDivElement | null>(null);
  const manualCodeInputRef = useRef<HTMLInputElement | null>(null);

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

      // The camera is a dead end on this device/browser — surface the
      // manual-entry fallback immediately instead of leaving the agent to
      // notice it further down the page (it was easy to miss, per the UX
      // audit's "no way forward from this screen" finding).
      requestAnimationFrame(() => {
        manualEntryRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
        manualCodeInputRef.current?.focus();
      });
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
                      <p className="text-xs font-semibold text-primary pt-1 flex items-center justify-center gap-1">
                        <Keyboard className="h-3.5 w-3.5" />
                        <span>Or enter the code manually below ↓</span>
                      </p>
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

      {/* Manual Input Fallback — ref + highlight so the camera-error state
          above can pull attention here instead of relying on the agent to
          scroll down and notice it on their own. */}
      <Card
        ref={manualEntryRef}
        className={
          status === "error"
            ? "border-primary/60 ring-2 ring-primary/30 shadow-md transition-all"
            : "border-border/60 transition-all"
        }
      >
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
              ref={manualCodeInputRef}
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

/** TAB 2 (Admin only): pick a machine and generate/print/download its QR sticker. */
function GenerateModeView({
  initialMachineId,
  onClearMachine,
}: {
  initialMachineId?: string;
  onClearMachine: () => void;
}) {
  const [selectedMachineId, setSelectedMachineId] = useState<string | undefined>(
    initialMachineId
  );
  const [pickerQuery, setPickerQuery] = useState("");
  const [origin, setOrigin] = useState("");
  const qrRef = useRef<SVGSVGElement | null>(null);

  const { data: machinesList = [], isLoading: isMachinesLoading } = useMachines();

  useEffect(() => {
    if (typeof window !== "undefined") {
      setOrigin(window.location.origin);
    }
  }, []);

  useEffect(() => {
    setSelectedMachineId(initialMachineId);
  }, [initialMachineId]);

  // Real machine + store/venue data for the printed sticker.
  const { data: machine } = useQuery<any>({
    queryKey: ["machine-qr", selectedMachineId],
    queryFn: async () => {
      try {
        const res = await apiClient.get(
          `/machines/${encodeURIComponent(selectedMachineId as string)}`
        );
        return res.data?.data ?? null;
      } catch {
        return null;
      }
    },
    enabled: Boolean(selectedMachineId),
  });

  const machineId = selectedMachineId || "";
  const storeName: string | null = machine?.storeName || null;
  const locationAddress: string | null =
    machine?.locationAddress || machine?.eircode || null;
  const keyNumber: string | null = machine?.keyNumber || null;

  const destinationUrl = `${
    process.env.NEXT_PUBLIC_APP_URL || origin || "http://localhost:3000"
  }/machine/${encodeURIComponent(machineId)}`;

  const handleDownload = () => {
    const svgElement = qrRef.current;
    if (!svgElement) {
      toast.error("QR Code element not found");
      return;
    }

    try {
      const svgData = new XMLSerializer().serializeToString(svgElement);
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      const img = new Image();

      canvas.width = 400;
      canvas.height = 400;

      img.onload = () => {
        if (ctx) {
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, 400, 400);
          ctx.drawImage(img, 20, 20, 360, 360);
          const pngUrl = canvas.toDataURL("image/png");
          const downloadLink = document.createElement("a");
          downloadLink.href = pngUrl;
          downloadLink.download = `${machineId}-qr.png`;
          document.body.appendChild(downloadLink);
          downloadLink.click();
          document.body.removeChild(downloadLink);
          toast.success(`QR code image saved as ${machineId}-qr.png`);
        }
      };

      img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgData)));
    } catch {
      const svgBlob = new Blob([new XMLSerializer().serializeToString(svgElement)], {
        type: "image/svg+xml;charset=utf-8",
      });
      const svgUrl = URL.createObjectURL(svgBlob);
      const downloadLink = document.createElement("a");
      downloadLink.href = svgUrl;
      downloadLink.download = `${machineId}-qr.svg`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
      toast.success(`QR code saved as ${machineId}-qr.svg`);
    }
  };

  const handlePrint = () => {
    if (typeof window !== "undefined") {
      window.print();
    }
  };

  const pickerLower = pickerQuery.toLowerCase().trim();
  const filteredMachines = machinesList.filter((m) => {
    if (!pickerLower) return true;
    return (
      m.serialNumber.toLowerCase().includes(pickerLower) ||
      (m.storeName && m.storeName.toLowerCase().includes(pickerLower)) ||
      (m.keyNumber && m.keyNumber.toLowerCase().includes(pickerLower))
    );
  });

  // No machine chosen yet — show the searchable picker.
  if (!selectedMachineId) {
    return (
      <div className="space-y-4">
        <div>
          <div className="flex items-center gap-2">
            <QrCode className="h-5 w-5 text-primary" />
            <h1 className="text-xl font-bold tracking-tight text-foreground">Generate QR Code</h1>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Pick a machine to view, download, or print its QR sticker.
          </p>
        </div>

        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            type="text"
            placeholder="Search serial, store, or key number..."
            value={pickerQuery}
            onChange={(e) => setPickerQuery(e.target.value)}
            className="h-11 rounded-2xl pl-10 pr-4 text-xs"
          />
        </div>

        {isMachinesLoading ? (
          <div className="flex items-center justify-center p-8 border border-dashed border-border/60 rounded-xl">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          </div>
        ) : filteredMachines.length > 0 ? (
          <div className="space-y-1.5">
            {filteredMachines.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setSelectedMachineId(m.serialNumber || m.id)}
                className="w-full p-3 rounded-xl bg-card border border-border/60 hover:border-primary/60 active:scale-[0.99] transition-all flex items-center justify-between gap-2 text-left shadow-2xs"
              >
                <div className="min-w-0 space-y-0.5">
                  <span className="font-mono font-bold text-xs text-foreground block truncate">
                    {m.serialNumber}
                  </span>
                  <span className="text-[10px] text-muted-foreground truncate block">
                    {m.storeName || m.location || "Unassigned"}
                  </span>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
              </button>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center border border-dashed border-border/60 rounded-2xl">
            <Boxes className="h-7 w-7 text-muted-foreground/40 mx-auto mb-2" />
            <p className="text-xs text-muted-foreground">
              {pickerQuery ? `No machines matched "${pickerQuery}".` : "No machines registered yet."}
            </p>
          </div>
        )}
      </div>
    );
  }

  return (
    <>
      <div className="space-y-5 print:hidden">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setSelectedMachineId(undefined);
              onClearMachine();
            }}
            className="h-9 w-9 rounded-2xl bg-muted/50 flex items-center justify-center text-muted-foreground hover:text-foreground active:scale-95 transition-transform shrink-0"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <h1 className="text-lg font-black tracking-tight text-foreground">Machine QR Code</h1>
            <p className="text-[11px] text-muted-foreground">
              Ready for field agent scan & restock
            </p>
          </div>
        </div>

        <Card className="w-full border-border/60 bg-gradient-to-b from-card to-card/60 shadow-lg text-center overflow-hidden">
          <CardContent className="p-6 space-y-4 flex flex-col items-center">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/20 text-primary text-xs font-black font-mono">
              <Sparkles className="h-3.5 w-3.5" />
              <span>#{machineId}</span>
            </div>

            <div className="p-4 rounded-3xl bg-white text-zinc-950 shadow-md border-4 border-primary/40 inline-flex flex-col items-center">
              <QRCodeSVG
                ref={qrRef}
                value={destinationUrl}
                size={190}
                level="H"
                includeMargin={false}
                className="w-48 h-48"
              />
              <span className="text-[10px] font-black font-mono tracking-widest text-zinc-900 mt-2 uppercase">
                {machineId}
              </span>
            </div>

            <div className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full">
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>Protected Field Agent Route</span>
            </div>

            <div className="space-y-1 pt-1">
              <h2 className="font-black text-base text-foreground">
                {storeName || "Unassigned Machine"}
              </h2>
              {(locationAddress || keyNumber) && (
                <div className="flex items-center justify-center gap-3 text-xs text-muted-foreground">
                  {locationAddress && (
                    <span className="flex items-center gap-1 truncate">
                      <MapPin className="h-3.5 w-3.5 text-primary shrink-0" />
                      <span className="truncate">{locationAddress}</span>
                    </span>
                  )}
                  {locationAddress && keyNumber && <span>•</span>}
                  {keyNumber && (
                    <span className="flex items-center gap-1">
                      <KeyRound className="h-3.5 w-3.5 text-secondary shrink-0" />
                      <span>Key: {keyNumber}</span>
                    </span>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-2.5 pb-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleDownload}
            className="w-full h-12 rounded-2xl text-xs font-bold gap-2 border-border/80 bg-card active:scale-[0.98] transition-transform shadow-xs"
          >
            <Download className="h-4 w-4 text-primary" />
            <span>Download QR Image</span>
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={handlePrint}
            className="w-full h-12 rounded-2xl text-xs font-bold gap-2 border-border/80 bg-card active:scale-[0.98] transition-transform shadow-xs"
          >
            <Printer className="h-4 w-4 text-secondary" />
            <span>Print Sticker Label (50mm)</span>
          </Button>
        </div>
      </div>

      {/* PRINT-ONLY LABEL STICKER (Dynamically adapts to POS thermal rolls, 50mm stickers, or A4 sheets) */}
      <div className="hidden print:flex print-qr-container">
        <div className="flex flex-col items-center justify-center w-full max-w-[80mm] p-2 text-center text-black bg-white">
          <span className="text-[12px] font-black uppercase tracking-wider text-black text-center leading-tight">
            Bee Novelty Vending
          </span>
          <div className="my-2 flex items-center justify-center w-full max-w-[220px] aspect-square">
            <QRCodeSVG
              value={destinationUrl}
              size={256}
              level="M"
              includeMargin={false}
              className="print-qr-svg"
              style={{ width: "100%", height: "auto", maxWidth: "100%" }}
            />
          </div>
          <span className="text-[14px] font-mono font-black tracking-widest text-center uppercase leading-none text-black">
            {machineId}
          </span>
          <span className="text-[8px] font-bold text-center uppercase tracking-widest text-zinc-700 mt-1">
            Authorized Field Agent Scan
          </span>
        </div>
      </div>
    </>
  );
}

function QRToolPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuthStore();
  const isAdmin = user?.role === "ADMIN";

  const initialTab = searchParams.get("tab") === "generate" ? "generate" : "scan";
  const initialMachineId = searchParams.get("machineId") || undefined;
  const [activeTab, setActiveTab] = useState<"scan" | "generate">(
    isAdmin ? initialTab : "scan"
  );

  // Field Agents have no legitimate reason to reach Generate (RBAC/scope,
  // not just cosmetic) — if a non-admin somehow lands here with ?tab=
  // generate in the URL, silently fall back to Scan.
  useEffect(() => {
    if (!isAdmin && activeTab === "generate") {
      setActiveTab("scan");
    }
  }, [isAdmin, activeTab]);

  const clearMachineFromUrl = () => {
    router.replace("/scan?tab=generate");
  };

  return (
    <div className="space-y-4 pb-12 font-sans">
      {/* One unified QR flow instead of two disconnected pages: a Field
          Agent only ever sees Scan (their sole reason to be here), while an
          Admin gets a mode switcher — the same "single flow" the Owner
          Requested Changes called for. Admin entry points that used to link
          to the standalone /machines/[id]/qr page now land here instead,
          on the Generate tab, with that machine pre-selected. */}
      {isAdmin && (
        <div className="grid grid-cols-2 gap-1 p-1 bg-muted/60 rounded-2xl">
          <button
            type="button"
            onClick={() => setActiveTab("scan")}
            className={`h-10 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors ${
              activeTab === "scan"
                ? "bg-card text-foreground shadow-xs"
                : "text-muted-foreground"
            }`}
          >
            <Camera className="h-3.5 w-3.5" />
            <span>Scan Code</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("generate")}
            className={`h-10 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors ${
              activeTab === "generate"
                ? "bg-card text-foreground shadow-xs"
                : "text-muted-foreground"
            }`}
          >
            <QrCode className="h-3.5 w-3.5" />
            <span>Generate QR</span>
          </button>
        </div>
      )}

      {activeTab === "scan" ? (
        <ScanModeView />
      ) : (
        <GenerateModeView
          initialMachineId={initialMachineId}
          onClearMachine={clearMachineFromUrl}
        />
      )}
    </div>
  );
}

export default function QRScannerPage() {
  return (
    <Suspense
      fallback={
        <div className="w-full min-h-[400px] flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      }
    >
      <QRToolPage />
    </Suspense>
  );
}
