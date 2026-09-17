"use client";

import React, { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { MapPin, Plus, X, Search } from "lucide-react";

export interface LocationComboboxValue {
  locationId: string | null;
  newLocationName: string | null;
}

interface LocationComboboxProps {
  locations: { id: string; name: string }[];
  value: LocationComboboxValue;
  onChange: (value: LocationComboboxValue) => void;
  placeholder?: string;
}

/**
 * Searchable + creatable location field: type to filter existing locations,
 * pick one, or create a brand-new one on the fly if nothing matches. Built
 * as a plain Tailwind popover rather than a shadcn Command+Popover pair —
 * this codebase doesn't have cmdk/Radix Popover installed anywhere else,
 * and every other custom dropdown/picker in the app (payment mode, quick
 * remark chips, etc.) is already a hand-rolled absolute-positioned panel
 * styled with the same CSS-variable tokens, so this matches the existing
 * pattern instead of introducing a new one.
 */
export function LocationCombobox({
  locations,
  value,
  onChange,
  placeholder = "Search or type a new location...",
}: LocationComboboxProps) {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Keep the input text in sync with the controlled value (e.g. when opening
  // the drawer to edit a store that already has a location).
  useEffect(() => {
    if (value.locationId) {
      const loc = locations.find((l) => l.id === value.locationId);
      setQuery(loc?.name || "");
    } else if (value.newLocationName) {
      setQuery(value.newLocationName);
    } else {
      setQuery("");
    }
    // Only re-sync when the drawer hands us a fresh value, not on every
    // keystroke (query has its own local state while typing).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value.locationId, value.newLocationName]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const trimmedQuery = query.trim();
  const filtered = trimmedQuery
    ? locations.filter((l) => l.name.toLowerCase().includes(trimmedQuery.toLowerCase()))
    : locations;
  const exactMatch = locations.find(
    (l) => l.name.toLowerCase() === trimmedQuery.toLowerCase()
  );

  const handleSelectExisting = (loc: { id: string; name: string }) => {
    setQuery(loc.name);
    setIsOpen(false);
    onChange({ locationId: loc.id, newLocationName: null });
  };

  const handleCreateNew = () => {
    if (!trimmedQuery) return;
    setIsOpen(false);
    onChange({ locationId: null, newLocationName: trimmedQuery });
  };

  const handleClear = () => {
    setQuery("");
    setIsOpen(false);
    onChange({ locationId: null, newLocationName: null });
  };

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
        <Input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
            // Typing invalidates whatever was previously selected/created
            // until the user re-picks or re-creates from the fresh list.
            if (value.locationId || value.newLocationName) {
              onChange({ locationId: null, newLocationName: null });
            }
          }}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          className="h-11 rounded-xl bg-muted/40 border-border/60 text-xs pl-8 pr-8 focus-visible:ring-primary shadow-xs"
        />
        {query && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 h-5 w-5 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {isOpen && (
        <div className="absolute z-30 mt-1.5 w-full rounded-xl border border-border/60 bg-card shadow-lg max-h-56 overflow-y-auto py-1">
          <button
            type="button"
            onClick={handleClear}
            className="w-full flex items-center gap-2 px-3 py-2 text-xs text-left text-muted-foreground hover:bg-accent/50 transition-colors"
          >
            <X className="h-3.5 w-3.5 shrink-0" />
            <span>No Location</span>
          </button>

          {filtered.map((loc) => (
            <button
              key={loc.id}
              type="button"
              onClick={() => handleSelectExisting(loc)}
              className={`w-full flex items-center gap-2 px-3 py-2 text-xs text-left transition-colors ${
                value.locationId === loc.id
                  ? "bg-primary/10 text-primary font-semibold"
                  : "text-foreground hover:bg-accent/50"
              }`}
            >
              <MapPin className="h-3.5 w-3.5 shrink-0 text-primary" />
              <span className="truncate">{loc.name}</span>
            </button>
          ))}

          {trimmedQuery && !exactMatch && (
            <button
              type="button"
              onClick={handleCreateNew}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs text-left font-semibold text-primary hover:bg-primary/10 transition-colors border-t border-border/40 mt-1 pt-2"
            >
              <Plus className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">Create &quot;{trimmedQuery}&quot;</span>
            </button>
          )}

          {filtered.length === 0 && !trimmedQuery && (
            <div className="px-3 py-2 text-[11px] text-muted-foreground">
              No locations yet — type to create one.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
