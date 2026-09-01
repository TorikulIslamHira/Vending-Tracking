"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  useLocations,
  useCreateLocation,
  useUpdateLocation,
  LocationItem,
} from "@/hooks/useLocations";
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
  Search,
  MapPin,
  Store,
  ChevronRight,
  Plus,
  Edit2,
  Sparkles,
  Loader2,
  Boxes,
} from "lucide-react";

export default function LocationsPage() {
  const router = useRouter();
  const { data: locations = [], isLoading } = useLocations();
  const createLocationMutation = useCreateLocation();
  const updateLocationMutation = useUpdateLocation();

  const [searchTerm, setSearchTerm] = useState("");
  const [isAddDrawerOpen, setIsAddDrawerOpen] = useState(false);
  const [isEditingId, setIsEditingId] = useState<string | null>(null);

  // Form State
  const [newLocationName, setNewLocationName] = useState("");
  const [newLocationAddress, setNewLocationAddress] = useState("");

  const filteredLocations = locations.filter(
    (loc) =>
      loc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      loc.address.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleOpenAdd = () => {
    setIsEditingId(null);
    setNewLocationName("");
    setNewLocationAddress("");
    setIsAddDrawerOpen(true);
  };

  const handleOpenEdit = (loc: LocationItem, e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditingId(loc.id);
    setNewLocationName(loc.name);
    setNewLocationAddress(loc.address);
    setIsAddDrawerOpen(true);
  };

  const handleSaveLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLocationName.trim()) {
      toast.error("Please enter a valid location name");
      return;
    }

    if (isEditingId) {
      updateLocationMutation.mutate(
        {
          id: isEditingId,
          name: newLocationName.trim(),
          address: newLocationAddress.trim(),
        },
        {
          onSuccess: () => {
            setIsAddDrawerOpen(false);
            setIsEditingId(null);
          },
        }
      );
    } else {
      createLocationMutation.mutate(
        {
          name: newLocationName.trim(),
          address: newLocationAddress.trim(),
        },
        {
          onSuccess: () => {
            setIsAddDrawerOpen(false);
          },
        }
      );
    }
  };

  return (
    <div className="w-full px-4 py-4 space-y-4">
      {/* Top Header */}
      <div className="flex items-center justify-between pt-1">
        <div className="space-y-0.5">
          <h1 className="text-xl font-black tracking-tight text-foreground">
            Locations
          </h1>
          <p className="text-xs text-muted-foreground">
            {locations.length} Fleet Venues Configured
          </p>
        </div>

        <Button
          onClick={handleOpenAdd}
          className="h-10 px-3.5 rounded-2xl font-bold gap-1.5 shadow-sm shadow-primary/30 active:scale-95 transition-transform"
        >
          <Plus className="h-4 w-4" />
          <span>+ Add Location</span>
        </Button>
      </div>

      {/* Sleek Search Bar */}
      <div className="relative w-full">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input
          type="text"
          placeholder="Search locations or addresses..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="h-11 w-full rounded-2xl bg-muted/40 border-border/50 pl-10 pr-4 text-xs focus-visible:ring-primary shadow-xs"
        />
      </div>

      {/* Locations List (Screen 3) */}
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
        ) : filteredLocations.length > 0 ? (
          filteredLocations.map((location) => (
            <Card
              key={location.id}
              onClick={() => router.push(`/locations/${location.id}`)}
              className="border-border/50 bg-card hover:bg-accent/40 active:scale-[0.98] transition-all duration-150 cursor-pointer shadow-xs"
            >
              <CardContent className="p-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-10 w-10 rounded-2xl bg-primary/15 flex items-center justify-center text-primary shrink-0 shadow-xs">
                    <MapPin className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 space-y-0.5">
                    <h3 className="font-bold text-sm text-foreground truncate">
                      {location.name}
                    </h3>
                    <p className="text-[11px] text-muted-foreground truncate">
                      {location.address}
                    </p>
                    <div className="flex items-center gap-3 pt-1 text-[11px] font-semibold text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Store className="h-3.5 w-3.5 text-secondary" />
                        <span>{location.storeCount} Stores</span>
                      </span>
                      <span className="flex items-center gap-1">
                        <Boxes className="h-3.5 w-3.5 text-primary" />
                        <span>{location.machineCount} Machines</span>
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={(e) => handleOpenEdit(location, e)}
                    className="h-8 w-8 rounded-xl bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors"
                    title="Edit Location"
                  >
                    <Edit2 className="h-3.5 w-3.5" />
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
            <MapPin className="h-8 w-8 text-muted-foreground/40 mx-auto" />
            <p className="text-xs text-muted-foreground">
              No locations match &quot;{searchTerm}&quot;
            </p>
          </div>
        )}
      </div>

      {/* Vaul Bottom Drawer: Add / Edit Location */}
      <Drawer open={isAddDrawerOpen} onOpenChange={setIsAddDrawerOpen}>
        <DrawerContent className="max-w-md mx-auto rounded-t-[28px] p-6 space-y-4">
          <DrawerHeader className="p-0 text-left">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-xl bg-primary/20 flex items-center justify-center text-primary">
                <Sparkles className="h-4 w-4" />
              </div>
              <DrawerTitle className="text-lg font-bold text-foreground">
                {isEditingId ? "Edit Location" : "Add New Location"}
              </DrawerTitle>
            </div>
            <DrawerDescription className="text-xs text-muted-foreground">
              Configure a physical venue or shopping hub for your machines.
            </DrawerDescription>
          </DrawerHeader>

          <form onSubmit={handleSaveLocation} className="space-y-3.5 pt-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                Location / Venue Name
              </label>
              <Input
                placeholder="e.g. Grand Central Terminal"
                value={newLocationName}
                onChange={(e) => setNewLocationName(e.target.value)}
                className="h-11 rounded-xl bg-muted/40 border-border/60 text-xs focus-visible:ring-primary shadow-xs"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                Street Address / Zone
              </label>
              <Input
                placeholder="e.g. 89 E 42nd St, New York, NY"
                value={newLocationAddress}
                onChange={(e) => setNewLocationAddress(e.target.value)}
                className="h-11 rounded-xl bg-muted/40 border-border/60 text-xs focus-visible:ring-primary shadow-xs"
              />
            </div>

            <DrawerFooter className="p-0 pt-3 gap-2">
              <Button
                type="submit"
                className="w-full h-12 rounded-2xl bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 font-bold text-sm shadow-md active:scale-[0.97]"
                disabled={
                  createLocationMutation.isPending ||
                  updateLocationMutation.isPending
                }
              >
                {createLocationMutation.isPending ||
                updateLocationMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : isEditingId ? (
                  "Save Changes"
                ) : (
                  "Create Location"
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
