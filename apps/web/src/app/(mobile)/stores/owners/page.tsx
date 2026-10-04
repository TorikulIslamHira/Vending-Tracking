"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useAllStores, useUpdateStore, StoreItem } from "@/hooks/useStores";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  Contact,
  User,
  Phone,
  Mail,
  Pencil,
  Loader2,
  Store,
  Download,
} from "lucide-react";

export default function StoreOwnersPage() {
  const router = useRouter();
  const { data: stores = [], isLoading } = useAllStores();
  const updateStoreMutation = useUpdateStore();

  const [editingStore, setEditingStore] = useState<StoreItem | null>(null);
  const [ownerName, setOwnerName] = useState("");
  const [ownerPhone, setOwnerPhone] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);

  // Same "go back to wherever I came from" logic used across the app's other
  // back buttons — falls back to Settings (where this page is only ever
  // linked from) rather than relying on history that might not exist.
  const handleBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push("/settings");
    }
  };

  const handleOpenEdit = (store: StoreItem) => {
    setEditingStore(store);
    setOwnerName(store.ownerName || "");
    setOwnerPhone(store.ownerPhone || "");
    setOwnerEmail(store.ownerEmail || "");
  };

  const handleCloseEdit = () => setEditingStore(null);

  const handleSaveOwnerInfo = async () => {
    if (!editingStore) return;
    await updateStoreMutation.mutateAsync({
      id: editingStore.id,
      ownerName: ownerName.trim() || null,
      ownerPhone: ownerPhone.trim() || null,
      ownerEmail: ownerEmail.trim() || null,
    });
    setEditingStore(null);
  };

  const handleExportPdf = async () => {
    if (stores.length === 0) {
      toast.error("No stores to include in the export.");
      return;
    }

    setIsDownloadingPdf(true);
    try {
      const { pdf } = await import("@react-pdf/renderer");
      const { StoreOwnersPdfDocument } = await import(
        "@/components/reports/StoreOwnersPdfDocument"
      );

      const logoSrc =
        typeof window !== "undefined" ? `${window.location.origin}/logo.png` : "/logo.png";

      const blob = await pdf(
        <StoreOwnersPdfDocument
          logoSrc={logoSrc}
          stores={stores}
          generatedAt={new Date().toLocaleString()}
        />
      ).toBlob();

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `store_owner_information_${new Date().toISOString().split("T")[0]}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Store owner PDF downloaded!");
    } catch {
      toast.error("Failed to generate store owner PDF");
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  return (
    <div className="w-full px-4 py-4 space-y-4 font-sans">
      {/* Header */}
      <div className="flex items-center gap-3 sticky top-0 z-20 -mx-4 px-4 pb-3 pt-[calc(0.75rem+env(safe-area-inset-top))] bg-card/95 backdrop-blur-md border-b border-border/40">
        <Button
          variant="outline"
          size="icon"
          onClick={handleBack}
          className="h-10 w-10 shrink-0 rounded-xl border-border/60 shadow-xs"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-base font-bold tracking-tight text-foreground truncate flex items-center gap-1.5">
            <Contact className="h-4 w-4 text-primary shrink-0" />
            <span>Store Owner Information</span>
          </h1>
          <p className="text-xs text-muted-foreground truncate">
            Contact details for every registered store, for auditing & communication
          </p>
        </div>
        <Button
          onClick={handleExportPdf}
          disabled={isDownloadingPdf || stores.length === 0}
          className="h-10 px-3 rounded-2xl bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 font-bold text-xs shadow-md active:scale-[0.97] transition-transform flex items-center gap-1.5 shrink-0"
        >
          {isDownloadingPdf ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Download className="h-4 w-4 text-primary" />
          )}
          <span>Export PDF</span>
        </Button>
      </div>

      {/* Store List */}
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className="h-24 w-full bg-card/60 border border-border/40 rounded-2xl p-4 animate-pulse"
            />
          ))}
        </div>
      ) : stores.length === 0 ? (
        <Card className="border-border/50 bg-card shadow-xs">
          <CardContent className="p-8 text-center space-y-2">
            <Store className="h-8 w-8 text-muted-foreground/40 mx-auto" />
            <h3 className="text-xs font-bold text-foreground">No Stores Registered</h3>
            <p className="text-[11px] text-muted-foreground max-w-xs mx-auto">
              Add stores from the Fleet Directory to track their owner contact details here.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {stores.map((store) => {
            const hasOwnerInfo = store.ownerName || store.ownerPhone || store.ownerEmail;
            return (
              <Card key={store.id} className="border-border/50 bg-card shadow-xs">
                <CardContent className="p-3.5 space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="font-bold text-xs text-foreground truncate">
                        {store.name}
                      </h3>
                      <p className="text-[10px] text-muted-foreground truncate">
                        {store.category}
                        {store.locationAddress ? ` • ${store.locationAddress}` : ""}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenEdit(store)}
                      className="h-8 px-2.5 rounded-xl text-[11px] font-semibold gap-1 shrink-0"
                    >
                      <Pencil className="h-3 w-3" />
                      <span>Edit</span>
                    </Button>
                  </div>

                  {hasOwnerInfo ? (
                    <div className="grid grid-cols-1 gap-1.5 pt-2 border-t border-border/40 text-xs">
                      <div className="flex items-center gap-1.5 text-foreground">
                        <User className="h-3.5 w-3.5 text-primary shrink-0" />
                        <span className="font-semibold truncate">
                          {store.ownerName || "—"}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Phone className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">{store.ownerPhone || "—"}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Mail className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">{store.ownerEmail || "—"}</span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-[11px] text-muted-foreground pt-2 border-t border-border/40">
                      No owner information on file yet.
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Edit Owner Info Modal */}
      <Dialog open={!!editingStore} onOpenChange={(open) => !open && handleCloseEdit()}>
        <DialogContent className="max-w-md w-[95vw] rounded-2xl p-5 bg-background border border-border/60 shadow-2xl z-50">
          <DialogHeader className="text-left space-y-1">
            <DialogTitle className="flex items-center gap-2 text-base font-bold">
              <Contact className="h-5 w-5 text-primary" />
              <span>Edit Owner Info</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              {editingStore?.name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 pt-2">
            <div className="space-y-1">
              <span className="text-[10px] font-semibold text-muted-foreground">Owner Name</span>
              <Input
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
                placeholder="e.g. John Murphy"
                className="h-11 rounded-xl text-sm"
              />
            </div>
            <div className="space-y-1">
              <span className="text-[10px] font-semibold text-muted-foreground">Phone</span>
              <Input
                type="tel"
                value={ownerPhone}
                onChange={(e) => setOwnerPhone(e.target.value)}
                placeholder="e.g. +353 85 123 4567"
                className="h-11 rounded-xl text-sm"
              />
            </div>
            <div className="space-y-1">
              <span className="text-[10px] font-semibold text-muted-foreground">Email</span>
              <Input
                type="email"
                value={ownerEmail}
                onChange={(e) => setOwnerEmail(e.target.value)}
                placeholder="e.g. owner@store.com"
                className="h-11 rounded-xl text-sm"
              />
            </div>
          </div>

          <DialogFooter className="pt-3 flex flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={handleCloseEdit}
              className="w-full h-11 rounded-xl text-xs font-semibold"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveOwnerInfo}
              disabled={updateStoreMutation.isPending}
              className="w-full h-11 rounded-xl text-xs font-bold shadow-md"
            >
              {updateStoreMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
              ) : null}
              {updateStoreMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
