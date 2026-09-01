"use client";

import React, { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  ArrowLeft,
  Download,
  Printer,
  CheckCircle,
  MapPin,
  Store,
  Sparkles,
  ShieldCheck,
} from "lucide-react";

export default function MachineQrDisplayPage() {
  const router = useRouter();
  const params = useParams();
  const machineId = (params?.machineId as string) || "VM-NY-010";
  const [origin, setOrigin] = useState("");
  const qrRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setOrigin(window.location.origin);
    }
  }, []);

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
      // Fallback SVG download
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

  const handleDone = () => {
    toast.success("Machine QR ready for field operations!");
    router.push("/dashboard");
  };

  return (
    <>
      {/* SCREEN VIEW ONLY (Completely hidden during print) */}
      <div className="w-full px-4 py-4 space-y-5 flex flex-col justify-between min-h-[780px] print:hidden">
        {/* Top Header */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={() => router.back()}
              className="h-10 w-10 rounded-2xl bg-muted/50 flex items-center justify-center text-muted-foreground hover:text-foreground active:scale-95 transition-transform shrink-0"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div>
              <h1 className="text-lg font-black tracking-tight text-foreground">
                Machine QR Code
              </h1>
              <p className="text-[11px] text-muted-foreground">
                Ready for field agent scan & restock
              </p>
            </div>
          </div>

          {/* Screen 7: QR Code Display Card */}
          <Card className="w-full border-border/60 bg-gradient-to-b from-card to-card/60 shadow-lg text-center overflow-hidden">
            <CardContent className="p-6 space-y-4 flex flex-col items-center">
              {/* Machine Badge */}
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/20 text-primary text-xs font-black font-mono">
                <Sparkles className="h-3.5 w-3.5" />
                <span>#{machineId}</span>
              </div>

              {/* High-Resolution SVG QR Visual Representation */}
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

              {/* Destination & Security Badge */}
              <div className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full">
                <ShieldCheck className="h-3.5 w-3.5" />
                <span>Protected Field Agent Route</span>
              </div>

              {/* Machine & Venue Details */}
              <div className="space-y-1 pt-1">
                <h2 className="font-black text-base text-foreground">
                  Gumball & Candy Dispenser
                </h2>
                <div className="flex items-center justify-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5 text-primary" />
                    <span>Venue Location</span>
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Store className="h-3.5 w-3.5 text-secondary" />
                    <span>Assigned Store</span>
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Action Buttons: Download, Print, Done */}
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

          <Button
            type="button"
            onClick={handleDone}
            className="w-full h-13 rounded-2xl bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 font-bold text-sm shadow-md active:scale-[0.97] transition-transform gap-2"
          >
            <CheckCircle className="h-4 w-4" />
            <span>Done & Return to Dashboard</span>
          </Button>
        </div>
      </div>

      {/* PRINT-ONLY LABEL STICKER (Visible only during printing: fits 50mm label sticker) */}
      <div className="hidden print:flex print:flex-col print:items-center print:justify-center print:w-[50mm] print:h-[50mm] print:m-0 print:p-2 print:border print:border-black print:rounded-md print:bg-white print:text-black print:box-border print:mx-auto">
        <span className="text-[10px] font-black uppercase tracking-wider text-center leading-tight text-black">
          Bee Novelty Vending
        </span>
        <div className="my-1.5 flex items-center justify-center">
          <QRCodeSVG
            value={destinationUrl}
            size={105}
            level="M"
            includeMargin={false}
          />
        </div>
        <span className="text-[12px] font-mono font-black tracking-widest text-center uppercase leading-none text-black">
          {machineId}
        </span>
        <span className="text-[7px] font-bold text-center uppercase tracking-wider text-zinc-700 mt-1">
          Authorized Field Agent Scan
        </span>
      </div>
    </>
  );
}
