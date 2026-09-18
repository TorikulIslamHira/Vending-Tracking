"use client";

import React, { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  useAllStores,
  useCreateStore,
  useUpdateStore,
  useDeleteStore,
  StoreItem,
} from "@/hooks/useStores";
import { loadGooglePlacesScript, geocodeEircode } from "@/lib/googleMaps";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
  DrawerClose,
} from "@/components/ui/drawer";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Search,
  Store,
  Plus,
  Percent,
  Edit3,
  Trash2,
  Sparkles,
  Loader2,
  ChevronRight,
  Boxes,
  Banknote,
  Landmark,
  AlertTriangle,
} from "lucide-react";

const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

export default function StoresPage() {
  const router = useRouter();
  const { data: stores = [], isLoading } = useAllStores();
  const createStoreMutation = useCreateStore();
  const updateStoreMutation = useUpdateStore();
  const deleteStoreMutation = useDeleteStore();

  const [searchTerm, setSearchTerm] = useState("");
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingStoreId, setEditingStoreId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<StoreItem | null>(null);

  // Form Fields
  const [storeName, setStoreName] = useState("");
  const [storeCategory, setStoreCategory] = useState("");
  const [shopCut, setShopCut] = useState(30);
  const [eircode, setEircode] = useState("");
  const [paymentMode, setPaymentMode] = useState<"CASH" | "BANK">("CASH");
  const [locationAddress, setLocationAddress] = useState("");
  const [isGeocodingAddress, setIsGeocodingAddress] = useState(false);
  // Tracks the last value we auto-filled, so a subsequent Eircode edit only
  // overwrites the address if the agent hasn't since typed their own — never
  // stomps a manual correction.
  const lastAutoFilledAddressRef = useRef<string>("");

  const filteredStores = stores.filter((st) => {
    const q = searchTerm.toLowerCase();
    return (
      st.name.toLowerCase().includes(q) ||
      (st.category || "").toLowerCase().includes(q) ||
      (st.eircode || "").toLowerCase().includes(q)
    );
  });

  // Debounced Eircode → Location auto-fill. Only wired up when a Maps API
  // key is configured; the Location field always stays manually editable
  // since Google's Eircode coverage isn't complete for every Irish address.
  useEffect(() => {
    if (!GOOGLE_MAPS_API_KEY || !isDrawerOpen) return;
    const trimmed = eircode.trim();
    if (trimmed.length < 5) return;

    // Only auto-fill if the address field is empty or still holds our own
    // last auto-filled value — never overwrite something the agent typed.
    if (locationAddress && locationAddress !== lastAutoFilledAddressRef.current) return;

    let cancelled = false;
    const timer = setTimeout(() => {
      setIsGeocodingAddress(true);
      loadGooglePlacesScript(GOOGLE_MAPS_API_KEY)
        .then(() => geocodeEircode(trimmed))
        .then((formattedAddress) => {
          if (cancelled || !formattedAddress) return;
          lastAutoFilledAddressRef.current = formattedAddress;
          setLocationAddress(formattedAddress);
        })
        .catch(() => {
          // Silent — the field just stays whatever it already was.
        })
        .finally(() => {
          if (!cancelled) setIsGeocodingAddress(false);
        });
    }, 600);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [eircode, isDrawerOpen]);

  const handleOpenAdd = () => {
    setEditingStoreId(null);
    setStoreName("");
    setStoreCategory("Confectionery & Toys");
    setShopCut(30);
    setEircode("");
    setPaymentMode("CASH");
    setLocationAddress("");
    lastAutoFilledAddressRef.current = "";
    setIsDrawerOpen(true);
  };

  const handleOpenEdit = (st: StoreItem, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingStoreId(st.id);
    setStoreName(st.name);
    setStoreCategory(st.category);
    setShopCut(st.shopCutPercent);
    setEircode(st.eircode || "");
    setPaymentMode(st.paymentMode || "CASH");
    setLocationAddress(st.locationAddress || "");
    lastAutoFilledAddressRef.current = "";
    setIsDrawerOpen(true);
  };

  const handleOpenDelete = (st: StoreItem, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleteTarget(st);
  };

  const handleConfirmDelete = () => {
    if (!deleteTarget) return;
    deleteStoreMutation.mutate(deleteTarget.id, {
      onSuccess: () => setDeleteTarget(null),
    });
  };

  const handleSaveStore = (e: React.FormEvent) => {
    e.preventDefault();
    if (!storeName.trim()) {
      toast.error("Please enter a valid store name");
      return;
    }

    if (editingStoreId) {
      updateStoreMutation.mutate(
        {
          id: editingStoreId,
          name: storeName.trim(),
          category: storeCategory.trim(),
          shopCutPercent: shopCut,
          eircode: eircode.trim() || undefined,
          locationAddress: locationAddress.trim() || undefined,
          paymentMode,
        },
        {
          onSuccess: () => setIsDrawerOpen(false),
        }
      );
    } else {
      createStoreMutation.mutate(
        {
          name: storeName.trim(),
          category: storeCategory.trim(),
          shopCutPercent: shopCut,
          eircode: eircode.trim() || undefined,
          locationAddress: locationAddress.trim() || undefined,
          paymentMode,
        },
        {
          onSuccess: () => setIsDrawerOpen(false),
        }
      );
    }
  };

  return (
    <div className="w-full px-4 py-4 space-y-4">
      {/* Top Header — sticky against the scrollable <main>, not the page */}
      <div className="flex items-center justify-between sticky top-0 z-20 -mx-4 px-4 pb-3 pt-[calc(0.75rem+env(safe-area-inset-top))] bg-card/95 backdrop-blur-md border-b border-border/40">
        <div className="space-y-0.5">
          <h1 className="text-xl font-black tracking-tight text-foreground">Stores</h1>
          <p className="text-xs text-muted-foreground">{stores.length} Stores Configured</p>
        </div>

        <Button
          onClick={handleOpenAdd}
          className="h-10 px-3.5 rounded-2xl font-bold gap-1.5 shadow-sm shadow-primary/30 active:scale-95 transition-transform"
        >
          <Plus className="h-4 w-4" />
          <span>+ Add Store</span>
        </Button>
      </div>

      {/* Search Bar */}
      <div className="relative w-full">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input
          type="text"
          placeholder="Search stores, category, or eircode..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="h-11 w-full rounded-2xl bg-muted/40 border-border/50 pl-10 pr-4 text-xs focus-visible:ring-primary shadow-xs"
        />
      </div>

      {/* Stores List */}
      <div className="space-y-2.5">
        {isLoading ? (
          <div className="space-y-2.5">
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                className="h-24 w-full bg-card/60 border border-border/40 rounded-2xl p-4 animate-pulse"
              />
            ))}
          </div>
        ) : filteredStores.length > 0 ? (
          filteredStores.map((store) => (
            <Card
              key={store.id}
              onClick={() => router.push(`/stores/${store.id}`)}
              className="border-border/50 bg-card hover:bg-accent/40 active:scale-[0.98] transition-all duration-150 cursor-pointer shadow-xs"
            >
              <CardContent className="p-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-10 w-10 rounded-2xl bg-secondary/15 flex items-center justify-center text-secondary shrink-0 shadow-xs">
                    <Store className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 space-y-0.5">
                    <h3 className="font-bold text-sm text-foreground truncate">{store.name}</h3>
                    <p className="text-[11px] text-muted-foreground truncate">{store.category}</p>
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-foreground bg-accent/60 px-2 py-0.5 rounded-md">
                        <Boxes className="h-3 w-3 text-primary" />
                        <span>
                          {store.machineCount ?? 0}{" "}
                          {store.machineCount === 1 ? "machine" : "machines"}
                        </span>
                      </span>
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-foreground bg-accent/60 px-2 py-0.5 rounded-md">
                        <Percent className="h-3 w-3 text-emerald-500" />
                        <span>
                          {store.shopCutPercent}% / {store.businessCutPercent}%
                        </span>
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={(e) => handleOpenEdit(store, e)}
                    className="h-8 w-8 rounded-xl bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors"
                    title="Edit Store"
                  >
                    <Edit3 className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => handleOpenDelete(store, e)}
                    className="h-8 w-8 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center justify-center transition-colors"
                    title="Delete Store"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                  <div className="h-8 w-8 rounded-xl flex items-center justify-center text-muted-foreground">
                    <ChevronRight className="h-4 w-4" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <div className="py-12 text-center space-y-3">
            <Store className="h-8 w-8 text-muted-foreground/40 mx-auto" />
            <p className="text-xs text-muted-foreground">
              {searchTerm ? `No stores match "${searchTerm}"` : "No stores yet — add your first one."}
            </p>
          </div>
        )}
      </div>

      {/* Vaul Bottom Drawer: Add / Edit Store */}
      <Drawer open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
        <DrawerContent className="max-w-md mx-auto rounded-t-[28px] p-6 space-y-4">
          <DrawerHeader className="p-0 text-left">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-xl bg-secondary/20 flex items-center justify-center text-secondary">
                <Sparkles className="h-4 w-4" />
              </div>
              <DrawerTitle className="text-lg font-bold text-foreground">
                {editingStoreId ? "Edit Store" : "Add New Store"}
              </DrawerTitle>
            </div>
            <DrawerDescription className="text-xs text-muted-foreground">
              Define the store contract and revenue split.
            </DrawerDescription>
          </DrawerHeader>

          <form onSubmit={handleSaveStore} className="space-y-3.5 pt-2 max-h-[65vh] overflow-y-auto">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Store Name</label>
              <Input
                placeholder="e.g. Plaza News & Sweets"
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                className="h-11 rounded-xl bg-muted/40 border-border/60 text-xs focus-visible:ring-primary shadow-xs"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                Location / Full Address
              </label>
              <Input
                placeholder="Auto-fills from Eircode, or type manually"
                value={locationAddress}
                onChange={(e) => setLocationAddress(e.target.value)}
                className="h-11 rounded-xl bg-muted/40 border-border/60 text-xs focus-visible:ring-primary shadow-xs"
              />
              {isGeocodingAddress && (
                <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Looking up address for this Eircode…
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Store Category</label>
              <Input
                placeholder="e.g. Convenience, Sweets, Arcade"
                value={storeCategory}
                onChange={(e) => setStoreCategory(e.target.value)}
                className="h-11 rounded-xl bg-muted/40 border-border/60 text-xs focus-visible:ring-primary shadow-xs"
              />
            </div>

            {/* Commission Split Slider / Input */}
            <div className="p-3.5 rounded-2xl bg-muted/40 border border-border/50 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold">
                <span>Shop Commission Cut</span>
                <span className="text-primary font-mono">{shopCut}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={shopCut}
                onChange={(e) => setShopCut(Number(e.target.value))}
                className="w-full accent-primary cursor-pointer"
              />
              <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                <span>Store Cut: {shopCut}%</span>
                <span>Business Cut: {100 - shopCut}%</span>
              </div>
            </div>

            {/* Payment Mode */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Payment Mode</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setPaymentMode("CASH")}
                  className={`h-11 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-colors ${
                    paymentMode === "CASH"
                      ? "bg-primary/15 border-primary text-primary"
                      : "bg-muted/40 border-border/60 text-muted-foreground"
                  }`}
                >
                  <Banknote className="h-3.5 w-3.5" />
                  <span>Cash</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMode("BANK")}
                  className={`h-11 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-colors ${
                    paymentMode === "BANK"
                      ? "bg-primary/15 border-primary text-primary"
                      : "bg-muted/40 border-border/60 text-muted-foreground"
                  }`}
                >
                  <Landmark className="h-3.5 w-3.5" />
                  <span>Bank</span>
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Eircode</label>
              <Input
                placeholder="e.g. D02 AF30"
                value={eircode}
                onChange={(e) => setEircode(e.target.value.toUpperCase())}
                className="h-11 rounded-xl bg-muted/40 border-border/60 text-xs font-mono focus-visible:ring-primary shadow-xs"
              />
            </div>

            <DrawerFooter className="p-0 pt-3 gap-2">
              <Button
                type="submit"
                className="w-full h-12 rounded-2xl bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 font-bold text-sm shadow-md active:scale-[0.97]"
                disabled={createStoreMutation.isPending || updateStoreMutation.isPending}
              >
                {createStoreMutation.isPending || updateStoreMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : editingStoreId ? (
                  "Save Changes"
                ) : (
                  "Create Store"
                )}
              </Button>
              <DrawerClose asChild>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full h-10 rounded-xl text-xs font-semibold"
                >
                  Cancel
                </Button>
              </DrawerClose>
            </DrawerFooter>
          </form>
        </DrawerContent>
      </Drawer>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent className="max-w-md w-[92vw] rounded-2xl p-6 bg-background border border-border/60 shadow-2xl z-50">
          <DialogHeader className="text-left pb-1 space-y-1">
            <DialogTitle className="flex items-center gap-2 text-base font-bold text-rose-600 dark:text-rose-400">
              <AlertTriangle className="h-5 w-5 shrink-0" />
              <span>Delete Store</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Are you sure you want to delete{" "}
              <strong className="text-foreground">{deleteTarget?.name}</strong>? This cannot be
              undone
              {deleteTarget && deleteTarget.machineCount > 0 && (
                <>
                  {" "}
                  — its {deleteTarget.machineCount}{" "}
                  {deleteTarget.machineCount === 1 ? "machine" : "machines"} will remain in your
                  fleet but become unassigned.
                </>
              )}
              .
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="pt-2 flex flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => setDeleteTarget(null)}
              className="w-full sm:w-auto h-11 rounded-xl text-xs font-semibold"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              className="w-full sm:w-auto h-11 text-xs font-bold shadow-md rounded-xl"
              onClick={handleConfirmDelete}
              disabled={deleteStoreMutation.isPending}
            >
              {deleteStoreMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete Store
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
