"use client";

import React, { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { useStores, useCreateStore, useUpdateStore, StoreItem } from "@/hooks/useStores";
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
  ArrowLeft,
  Store,
  Plus,
  Percent,
  Edit3,
  Sparkles,
  Loader2,
  MapPin,
  ChevronRight,
} from "lucide-react";

export default function LocationStoresPage() {
  const router = useRouter();
  const params = useParams();
  const locationId = (params?.locationId as string) || "";

  const { data: locationData, isLoading } = useStores(locationId);
  const createStoreMutation = useCreateStore(locationId);
  const updateStoreMutation = useUpdateStore(locationId);

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingStoreId, setEditingStoreId] = useState<string | null>(null);

  // Form Fields
  const [storeName, setStoreName] = useState("");
  const [storeCategory, setStoreCategory] = useState("");
  const [shopCut, setShopCut] = useState(30);

  const stores = locationData?.stores || [];

  const handleOpenAdd = () => {
    setEditingStoreId(null);
    setStoreName("");
    setStoreCategory("Confectionery & Toys");
    setShopCut(30);
    setIsDrawerOpen(true);
  };

  const handleOpenEdit = (st: StoreItem, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingStoreId(st.id);
    setStoreName(st.name);
    setStoreCategory(st.category);
    setShopCut(st.shopCutPercent);
    setIsDrawerOpen(true);
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
        },
        {
          onSuccess: () => {
            setIsDrawerOpen(false);
          },
        }
      );
    } else {
      createStoreMutation.mutate(
        {
          name: storeName.trim(),
          category: storeCategory.trim(),
          shopCutPercent: shopCut,
        },
        {
          onSuccess: () => {
            setIsDrawerOpen(false);
          },
        }
      );
    }
  };

  return (
    <div className="w-full px-4 py-4 space-y-4">
      {/* Top Bar with Back Button */}
      <div className="flex items-center justify-between pt-1">
        <button
          onClick={() => router.push("/locations")}
          className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground hover:text-foreground active:scale-95 transition-transform"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Locations</span>
        </button>

        <Button
          onClick={handleOpenAdd}
          className="h-9 px-3 rounded-2xl font-bold gap-1 shadow-xs shadow-primary/30 active:scale-95"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>+ Add Store</span>
        </Button>
      </div>

      {/* Location Context Banner */}
      <div className="p-4 rounded-2xl bg-muted/40 border border-border/50 space-y-1">
        <div className="flex items-center gap-2 text-primary font-bold text-xs">
          <MapPin className="h-3.5 w-3.5" />
          <span>Venue Hub</span>
        </div>
        <h1 className="text-xl font-black tracking-tight text-foreground">
          {locationData?.locationName || "Metropolitan Venue Hub"}
        </h1>
        <p className="text-xs text-muted-foreground">
          {locationData?.address || "Commercial Zone"}
        </p>
      </div>

      {/* Store List Header */}
      <div className="flex items-center justify-between pt-1">
        <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Assigned Stores ({stores.length})
        </h2>
      </div>

      {/* Screen 4: Stores List */}
      <div className="space-y-2.5">
        {isLoading ? (
          <div className="space-y-2.5">
            {[1, 2].map((n) => (
              <div
                key={n}
                className="h-24 w-full bg-card/60 border border-border/40 rounded-2xl p-4 animate-pulse"
              />
            ))}
          </div>
        ) : (
          stores.map((store: StoreItem) => (
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
                    <h3 className="font-bold text-sm text-foreground truncate">
                      {store.name}
                    </h3>
                    <p className="text-[11px] text-muted-foreground truncate">
                      {store.category}
                    </p>
                    <div className="flex items-center gap-2 pt-1">
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-foreground bg-accent/60 px-2 py-0.5 rounded-md">
                        <Percent className="h-3 w-3 text-primary" />
                        <span>
                          Split: {store.shopCutPercent}% shop /{" "}
                          {store.businessCutPercent}% biz
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
                    title="Edit Commission Split"
                  >
                    <Edit3 className="h-3.5 w-3.5" />
                  </button>
                  <div className="h-8 w-8 rounded-xl flex items-center justify-center text-muted-foreground">
                    <ChevronRight className="h-4 w-4" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Vaul Bottom Drawer: Add / Edit Store & Commission */}
      <Drawer open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
        <DrawerContent className="max-w-md mx-auto rounded-t-[28px] p-6 space-y-4">
          <DrawerHeader className="p-0 text-left">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-xl bg-secondary/20 flex items-center justify-center text-secondary">
                <Sparkles className="h-4 w-4" />
              </div>
              <DrawerTitle className="text-lg font-bold text-foreground">
                {editingStoreId ? "Edit Store & Split" : "Add Store to Venue"}
              </DrawerTitle>
            </div>
            <DrawerDescription className="text-xs text-muted-foreground">
              Define the store contract and automatic revenue split percentages.
            </DrawerDescription>
          </DrawerHeader>

          <form onSubmit={handleSaveStore} className="space-y-3.5 pt-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                Store Name
              </label>
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
                Store Category
              </label>
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

            <DrawerFooter className="p-0 pt-3 gap-2">
              <Button
                type="submit"
                className="w-full h-12 rounded-2xl bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 font-bold text-sm shadow-md active:scale-[0.97]"
                disabled={createStoreMutation.isPending || updateStoreMutation.isPending}
              >
                {createStoreMutation.isPending || updateStoreMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : editingStoreId ? (
                  "Save Split & Details"
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
    </div>
  );
}
