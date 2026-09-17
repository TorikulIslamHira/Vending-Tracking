"use client";

import React, { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useStore } from "@/hooks/useStores";
import {
  ArrowLeft,
  Download,
  Printer,
  CheckCircle,
  MapPin,
  Sparkles,
  ShieldCheck,
} from "lucide-react";

export default function StoreQrDisplayPage() {
  const router = useRouter();
  const params = useParams();
  const storeId = (params?.storeId as string) || "";
  const { data: storeData } = useStore(storeId);
  const [origin, setOrigin] = useState("");
  const qrRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setOrigin(window.location.origin);
    }
  }, []);

  const destinationUrl = `${
    process.env.NEXT_PUBLIC_APP_URL || origin || "http://localhost:3000"
  }/store/${encodeURIComponent(storeId)}`;

  const fileLabel = storeData?.name ? storeData.name.replace(/\s+/g, "-").toLowerCase() : storeId;

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
          downloadLink.download = `${fileLabel}-store-qr.png`;
          document.body.appendChild(downloadLink);
          downloadLink.click();
          document.body.removeChild(downloadLink);
          toast.success(`QR code image saved as ${fileLabel}-store-qr.png`);
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
      downloadLink.download = `${fileLabel}-store-qr.svg`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
      toast.success(`QR code saved as ${fileLabel}-store-qr.svg`);
    }
  };

  const handlePrint = () => {
    if (typeof window !== "undefined") {
      window.print();
    }
  };

  const handleDone = () => {
    toast.success("Store QR ready for field operations!");
    if (storeData?.locationId) {
      router.push(`/locations/${storeData.locationId}`);
    } else {
      router.push("/dashboard");
    }
  };

  return (
    <>
      {/* SCREEN VIEW ONLY (Completely hidden during print) */}
      <div className="w-full px-4 py-4 space-y-5 flex flex-col justify-between min-h-[780px] print:hidden">
        <div className="space-y-4">
          <div className="flex items-center gap-2 sticky top-0 z-20 -mx-4 px-4 pb-3 pt-[calc(0.75rem+env(safe-area-inset-top))] bg-card/95 backdrop-blur-md border-b border-border/40">
            <button
              onClick={() => router.back()}
              className="h-10 w-10 rounded-2xl bg-muted/50 flex items-center justify-center text-muted-foreground hover:text-foreground active:scale-95 transition-transform shrink-0"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div>
              <h1 className="text-lg font-black tracking-tight text-foreground">Store QR Code</h1>
              <p className="text-[11px] text-muted-foreground">
                Scan routes to a machine picker for this store
              </p>
            </div>
          </div>

          <Card className="w-full border-border/60 bg-gradient-to-b from-card to-card/60 shadow-lg text-center overflow-hidden">
            <CardContent className="p-6 space-y-4 flex flex-col items-center">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-secondary/20 text-secondary text-xs font-black">
                <Sparkles className="h-3.5 w-3.5" />
                <span>{storeData?.name || "Store"}</span>
              </div>

              <div className="p-4 rounded-3xl bg-white text-zinc-950 shadow-md border-4 border-secondary/40 inline-flex flex-col items-center">
                <QRCodeSVG
                  ref={qrRef}
                  value={destinationUrl}
                  size={190}
                  level="H"
                  includeMargin={false}
                  className="w-48 h-48"
                />
                <span className="text-[10px] font-black font-mono tracking-widest text-zinc-900 mt-2 uppercase">
                  {storeData?.name || storeId}
                </span>
              </div>

              <div className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full">
                <ShieldCheck className="h-3.5 w-3.5" />
                <span>Protected Field Agent Route</span>
              </div>

              <div className="space-y-1 pt-1">
                <h2 className="font-black text-base text-foreground">
                  {storeData?.name || "Store"}
                </h2>
                <div className="flex items-center justify-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5 text-primary" />
                    <span>{storeData?.locationName || "Unassigned"}</span>
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

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
            <span>Done</span>
          </Button>
        </div>
      </div>

      {/* PRINT-ONLY LABEL STICKER */}
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
            {storeData?.name || storeId}
          </span>
          <span className="text-[8px] font-bold text-center uppercase tracking-widest text-zinc-700 mt-1">
            Authorized Field Agent Scan
          </span>
        </div>
      </div>
    </>
  );
}
