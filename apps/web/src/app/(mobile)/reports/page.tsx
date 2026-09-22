"use client";

import React, { useState, useRef, useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  BarChart3,
  Calendar,
  Filter,
  DollarSign,
  TrendingUp,
  Percent,
  FileSpreadsheet,
  Layers,
  MapPin,
  Store,
  Search,
  ChevronDown,
  Check,
  X,
  Loader2,
  Building2,
  Clock,
  User,
} from "lucide-react";

import { useAllStores, StoreItem } from "@/hooks/useStores";
import { useReconciliationReports, ReportRecord, DetailedCashLog } from "@/hooks/useInventory";
import { useCurrency } from "@/hooks/useTenantSettings";

export default function ReportsPage() {
  const [fromDate, setFromDate] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
  });
  const [toDate, setToDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [selectedStoreId, setSelectedStoreId] = useState<string>("ALL");
  const [isComboboxOpen, setIsComboboxOpen] = useState(false);
  const [storeSearchQuery, setStoreSearchQuery] = useState("");
  const [showDetailedLogs, setShowDetailedLogs] = useState(false);
  const comboboxRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const { data: stores = [], isLoading: isLoadingStores } = useAllStores();
  const { data: reportData, isLoading: isLoadingReports } = useReconciliationReports({
    fromDate,
    toDate,
    storeId: selectedStoreId,
  });
  const { format: formatMoney } = useCurrency();

  // Close combobox when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (comboboxRef.current && !comboboxRef.current.contains(event.target as Node)) {
        setIsComboboxOpen(false);
      }
    }
    if (isComboboxOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isComboboxOpen]);

  // Focus search input when combobox opens
  useEffect(() => {
    if (isComboboxOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isComboboxOpen]);

  const selectedStore = stores.find((s: StoreItem) => s.id === selectedStoreId);

  const filteredStores = stores.filter((st: StoreItem) => {
    const q = storeSearchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      st.name.toLowerCase().includes(q) ||
      (st.category && st.category.toLowerCase().includes(q))
    );
  });

  const records: ReportRecord[] = reportData?.records || [];
  const detailedLogs: DetailedCashLog[] = reportData?.detailedLogs || [];
  const summary = reportData?.summary || {
    totalCollected: 0,
    totalShopCut: 0,
    totalBusinessCut: 0,
    collectionsCount: 0,
    machinesCount: 0,
  };

  const totalCollected = summary.totalCollected;
  const totalShopCut = summary.totalShopCut;
  const totalBizCut = summary.totalBusinessCut;

  const handleExportCSV = () => {
    const headers = "Date,Machine ID,Store,Location,Total Cash,Shop Cut,Business Cut,Split Ratio,Collections Count\n";
    const rows = records
      .map(
        (r) =>
          `${r.date},${r.machineId},"${r.storeName}","${r.locationName}",${r.totalCash.toFixed(
            2
          )},${r.shopCut.toFixed(2)},${r.businessCut.toFixed(2)},${r.splitRatio},${r.collectionsCount}`
      )
      .join("\n");

    const blob = new Blob([headers + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const filterSuffix = selectedStore
      ? `_${selectedStore.name.replace(/\s+/g, "_")}`
      : "_all_stores";
    a.download = `reconciliation_report${filterSuffix}_${fromDate}_to_${toDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    toast.success("Reconciliation CSV exported successfully!");
  };

  return (
    <div className="w-full px-4 py-4 space-y-4">
      {/* Top Header — sticky against the scrollable <main>, not the page */}
      <div className="flex items-center justify-between sticky top-0 z-20 -mx-4 px-4 pb-3 pt-[calc(0.75rem+env(safe-area-inset-top))] bg-card/95 backdrop-blur-md border-b border-border/40">
        <div className="space-y-0.5">
          <h1 className="text-xl font-black tracking-tight text-foreground">
            Reports & Splits
          </h1>
          <p className="text-xs text-muted-foreground">
            Financial reconciliation & automated payouts
          </p>
        </div>

        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-secondary/15 text-secondary shadow-xs">
          <BarChart3 className="h-5 w-5" />
        </div>
      </div>

      {/* Screen 9: Date Range & Searchable Store Filters */}
      <Card className="border-border/50 bg-card shadow-xs">
        <CardContent className="p-3.5 space-y-3">
          <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
            <Calendar className="h-3.5 w-3.5 text-primary" />
            <span>Audit Date Range (Inclusive)</span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <span className="text-[10px] font-semibold text-muted-foreground">
                From Date
              </span>
              <Input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="h-10 rounded-xl bg-muted/40 border-border/50 text-xs px-2.5 shadow-xs"
              />
            </div>
            <div className="space-y-1">
              <span className="text-[10px] font-semibold text-muted-foreground">
                To Date (Full Day)
              </span>
              <Input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="h-10 rounded-xl bg-muted/40 border-border/50 text-xs px-2.5 shadow-xs"
              />
            </div>
          </div>

          {/* Searchable Store Filter Combobox */}
          <div className="space-y-1 relative" ref={comboboxRef}>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold text-muted-foreground flex items-center gap-1">
                <Store className="h-3 w-3 text-primary" />
                <span>Filter Store / Merchant</span>
              </span>
              {selectedStoreId !== "ALL" && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedStoreId("ALL");
                    setStoreSearchQuery("");
                  }}
                  className="text-[10px] font-semibold text-primary hover:underline flex items-center gap-0.5"
                >
                  <X className="h-3 w-3" />
                  <span>Show All Stores</span>
                </button>
              )}
            </div>

            {/* Combobox Trigger Button */}
            <button
              type="button"
              onClick={() => {
                setIsComboboxOpen((prev) => !prev);
                setStoreSearchQuery("");
              }}
              className="w-full h-11 rounded-xl bg-muted/40 border border-border/50 hover:border-border/80 px-3 text-xs font-medium text-foreground flex items-center justify-between gap-2 shadow-xs transition-colors focus:outline-hidden focus:ring-2 focus:ring-primary text-left"
            >
              <div className="flex items-center gap-2 min-w-0 truncate">
                <Building2 className="h-4 w-4 text-primary shrink-0" />
                {selectedStore ? (
                  <div className="min-w-0 truncate">
                    <span className="font-bold text-foreground">{selectedStore.name}</span>
                    <span className="text-muted-foreground text-[11px] ml-1.5 font-normal">
                      ({selectedStore.category})
                    </span>
                  </div>
                ) : (
                  <span className="text-foreground font-semibold">
                    All Active Stores ({stores.length} Configured)
                  </span>
                )}
              </div>
              <ChevronDown
                className={`h-4 w-4 text-muted-foreground shrink-0 transition-transform duration-200 ${
                  isComboboxOpen ? "rotate-180" : ""
                }`}
              />
            </button>

            {/* Searchable Dropdown Popover */}
            {isComboboxOpen && (
              <div className="absolute top-full left-0 right-0 mt-1.5 z-50 rounded-2xl bg-popover border border-border/70 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                {/* Search Header Input */}
                <div className="p-2 border-b border-border/50 bg-muted/30 relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                  <Input
                    ref={searchInputRef}
                    type="text"
                    placeholder="Search by store name, venue, or category..."
                    value={storeSearchQuery}
                    onChange={(e) => setStoreSearchQuery(e.target.value)}
                    className="h-9 rounded-xl bg-background border-border/60 pl-8 pr-8 text-xs focus-visible:ring-primary shadow-xs"
                  />
                  {storeSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setStoreSearchQuery("")}
                      className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground hover:text-foreground flex items-center justify-center"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>

                {/* Options List */}
                <div className="max-h-60 overflow-y-auto p-1.5 space-y-1">
                  {/* Option 1: All Stores */}
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedStoreId("ALL");
                      setIsComboboxOpen(false);
                      setStoreSearchQuery("");
                    }}
                    className={`w-full text-left p-2.5 rounded-xl text-xs flex items-center justify-between transition-colors ${
                      selectedStoreId === "ALL"
                        ? "bg-primary/10 text-primary font-bold"
                        : "hover:bg-accent/60 text-foreground"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Store className="h-4 w-4 text-primary shrink-0" />
                      <div>
                        <p className="font-bold">All Active Stores</p>
                        <p className="text-[10px] text-muted-foreground font-normal">
                          Fleet-wide aggregation across all venues
                        </p>
                      </div>
                    </div>
                    {selectedStoreId === "ALL" && (
                      <Check className="h-4 w-4 text-primary shrink-0" />
                    )}
                  </button>

                  {isLoadingStores ? (
                    <div className="p-4 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>Loading stores...</span>
                    </div>
                  ) : filteredStores.length > 0 ? (
                    filteredStores.map((st: StoreItem) => {
                      const isSelected = selectedStoreId === st.id;
                      return (
                        <button
                          key={st.id}
                          type="button"
                          onClick={() => {
                            setSelectedStoreId(st.id);
                            setIsComboboxOpen(false);
                            setStoreSearchQuery("");
                          }}
                          className={`w-full text-left p-2.5 rounded-xl text-xs flex items-center justify-between transition-colors ${
                            isSelected
                              ? "bg-primary/10 text-primary font-bold"
                              : "hover:bg-accent/60 text-foreground"
                          }`}
                        >
                          <div className="min-w-0 pr-2">
                            <p className="font-bold truncate">{st.name}</p>
                            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-normal mt-0.5">
                              <span className="truncate">{st.category}</span>
                              <span>•</span>
                              <span className="font-medium text-foreground">
                                {st.machineCount} {st.machineCount === 1 ? "machine" : "machines"}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-[10px] font-mono font-bold bg-muted/60 px-1.5 py-0.5 rounded-md text-muted-foreground">
                              {st.shopCutPercent}% / {st.businessCutPercent}%
                            </span>
                            {isSelected && <Check className="h-4 w-4 text-primary" />}
                          </div>
                        </button>
                      );
                    })
                  ) : (
                    <div className="p-4 text-center text-xs text-muted-foreground">
                      No stores found matching &quot;{storeSearchQuery}&quot;
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Aggregate Financial Summary Banner */}
      <div className="p-4 rounded-2xl bg-gradient-to-br from-primary/20 via-accent/25 to-card border border-primary/40 space-y-2.5 shadow-xs">
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold text-foreground">
            Total Cash Collected {selectedStore ? `(${selectedStore.name})` : "(All Stores)"}
          </span>
          <span className="text-xl font-black font-mono text-foreground">
            {formatMoney(totalCollected)}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2 pt-1 border-t border-border/40 text-xs">
          <div className="space-y-0.5">
            <span className="text-[10px] font-bold text-secondary flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-secondary" />
              <span>Shop Commission</span>
            </span>
            <div className="font-mono font-bold text-sm text-foreground">
              {formatMoney(totalShopCut)}
            </div>
          </div>

          <div className="space-y-0.5">
            <span className="text-[10px] font-bold text-primary flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              <span>My Profit</span>
            </span>
            <div className="font-mono font-bold text-sm text-foreground">
              {formatMoney(totalBizCut)}
            </div>
          </div>
        </div>

        {summary.collectionsCount > 0 && (
          <div className="flex items-center justify-between pt-1 border-t border-border/30 text-[10px] text-muted-foreground font-medium">
            <span>
              {summary.collectionsCount} {summary.collectionsCount === 1 ? "Cash Collection" : "Cash Collections"} logged in period
            </span>
            <button
              type="button"
              onClick={() => setShowDetailedLogs((p) => !p)}
              className="text-primary font-bold hover:underline"
            >
              {showDetailedLogs ? "Hide Activity Log" : "View Activity Log"}
            </button>
          </div>
        )}
      </div>

      {/* Detailed Cash Collections View (Collapsible) */}
      {showDetailedLogs && detailedLogs.length > 0 && (
        <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-primary" />
              <span>Individual Collections ({detailedLogs.length})</span>
            </h3>
          </div>

          <div className="space-y-1.5">
            {detailedLogs.map((log) => (
              <div
                key={log.id}
                className="p-2.5 rounded-xl bg-card border border-border/60 text-xs space-y-1 shadow-xs"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-foreground">{log.machineId}</span>
                  <span className="font-mono font-black text-secondary">
                    +{formatMoney(log.collectedAmount)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                  <span>{log.storeName} ({log.locationName})</span>
                  <span>{new Date(log.createdAt).toLocaleString()}</span>
                </div>
                {log.remarks && (
                  <p className="text-[10px] text-foreground/80 italic bg-muted/40 p-1 rounded-md">
                    &ldquo;{log.remarks}&rdquo;
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Reconciliation Records Table / Ledger */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Machine Payout Breakdown ({records.length})
          </h2>
          {selectedStore && (
            <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
              Filtered: {selectedStore.name}
            </span>
          )}
        </div>

        <div className="space-y-2">
          {isLoadingReports ? (
            <div className="space-y-2">
              {[1, 2].map((n) => (
                <div
                  key={n}
                  className="h-24 w-full bg-card/60 border border-border/40 rounded-2xl p-4 animate-pulse"
                />
              ))}
            </div>
          ) : records.length > 0 ? (
            records.map((rec) => (
              <Card key={rec.id} className="border-border/50 bg-card shadow-xs">
                <CardContent className="p-3.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-xs text-foreground">
                        {rec.machineId}
                      </span>
                      <span className="text-[10px] font-semibold text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-md">
                        {rec.splitRatio}
                      </span>
                    </div>
                    <span className="text-[10px] font-medium text-muted-foreground font-mono">
                      {rec.date}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                    <span className="font-medium text-foreground truncate">{rec.storeName}</span>
                    <span className="truncate font-normal">({rec.locationName})</span>
                  </div>

                  {/* 3-Column Split Visual */}
                  <div className="grid grid-cols-3 gap-2 pt-1 border-t border-border/40 text-center text-xs">
                    <div className="bg-muted/30 p-1.5 rounded-xl">
                      <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground block">
                        Cash
                      </span>
                      <span className="font-mono font-bold text-foreground">
                        {formatMoney(rec.totalCash)}
                      </span>
                    </div>
                    <div className="bg-secondary/10 p-1.5 rounded-xl">
                      <span className="text-[9px] font-bold uppercase tracking-wider text-secondary block leading-tight">
                        Shop Commission
                      </span>
                      <span className="font-mono font-bold text-secondary">
                        {formatMoney(rec.shopCut)}
                      </span>
                    </div>
                    <div className="bg-primary/15 p-1.5 rounded-xl">
                      <span className="text-[9px] font-bold uppercase tracking-wider text-foreground block leading-tight">
                        My Profit
                      </span>
                      <span className="font-mono font-bold text-foreground">
                        {formatMoney(rec.businessCut)}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card className="border-border/50 bg-card shadow-xs">
              <CardContent className="p-8 text-center space-y-2">
                <BarChart3 className="h-8 w-8 text-muted-foreground/40 mx-auto" />
                <h3 className="text-xs font-bold text-foreground">
                  {selectedStore
                    ? `No Machines Assigned to "${selectedStore.name}"`
                    : "No Reconciliation Logs Yet"}
                </h3>
                <p className="text-[11px] text-muted-foreground max-w-xs mx-auto">
                  {selectedStore
                    ? "Assign machines to this store to generate financial reconciliation data."
                    : "Register vending units and perform cash collections to view revenue splits."}
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Screen 9 Action: Full-width Dark EXPORT CSV Button */}
      <Button
        onClick={handleExportCSV}
        disabled={records.length === 0}
        className="w-full h-13 rounded-2xl bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 font-bold text-sm shadow-md active:scale-[0.97] transition-transform flex items-center justify-center gap-2 mt-2"
      >
        <FileSpreadsheet className="h-4 w-4 text-primary" />
        <span>EXPORT RECONCILIATION CSV</span>
      </Button>
    </div>
  );
}
