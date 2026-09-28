"use client";

import React, { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { QRCodeSVG } from "qrcode.react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useMachines } from "@/hooks/useMachines";
import { useAuthStore } from "@/store/useAuthStore";
import { api as apiClient } from "@/lib/api";
import { MachineScanner } from "@/components/scanner/MachineScanner";
import { toast } from "sonner";
import {
  QrCode,
  ArrowRight,
  ArrowLeft,
  Boxes,
  KeyRound,
  Loader2,
  MapPin,
  Camera,
  Search,
  Download,
  Printer,
  Sparkles,
  ShieldCheck,
} from "lucide-react";

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
        <MachineScanner />
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
