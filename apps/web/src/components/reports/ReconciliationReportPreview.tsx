"use client";

import type { ReportRecord } from "@/hooks/useInventory";

interface ReconciliationReportPreviewProps {
  storeLabel: string;
  fromDate: string;
  toDate: string;
  totalCollected: string;
  totalShopCut: string;
  totalBizCut: string;
  records: ReportRecord[];
  formatMoney: (amount: number) => string;
  generatedAt: string;
}

/**
 * Plain HTML/Tailwind mirror of ReconciliationPdfDocument, shown inside the
 * preview modal instead of embedding the actual PDF blob in an <iframe>.
 * Mobile Chrome/Safari don't reliably render a blob-URL PDF inline in an
 * iframe — it often kicks out to the OS-level PDF viewer at a zoomed-in,
 * non-fit-to-width A4 page instead. A normal responsive HTML element has
 * none of that inconsistency: it scrolls and reflows like every other part
 * of the app. The real PDF (via @react-pdf/renderer) is still generated on
 * demand, just only when the agent actually taps "Download PDF."
 */
export function ReconciliationReportPreview({
  storeLabel,
  fromDate,
  toDate,
  totalCollected,
  totalShopCut,
  totalBizCut,
  records,
  formatMoney,
  generatedAt,
}: ReconciliationReportPreviewProps) {
  return (
    <div className="bg-white text-stone-900 rounded-xl overflow-hidden border border-stone-200">
      <div className="p-4 sm:p-6 space-y-5">
        {/* Header: Brand + Report Title */}
        <div className="flex items-start justify-between gap-3 border-b-2 border-amber-500 pb-3">
          <div className="flex items-center gap-2.5 min-w-0">
            {/* eslint-disable-next-line @next/next/no-img-element -- plain
                <img> avoids next/image's remote-loader assumptions for a
                same-origin static asset rendered inside a non-page surface */}
            <img
              src="/logo.png"
              alt=""
              className="h-9 w-9 sm:h-10 sm:w-10 rounded-lg object-cover shrink-0"
            />
            <div className="min-w-0">
              <p className="font-bold text-sm sm:text-base leading-tight truncate">
                Bee Novelty Vending
              </p>
              <p className="text-[10px] sm:text-xs text-stone-500 leading-tight">
                Financial Reconciliation
              </p>
            </div>
          </div>
          <div className="text-right shrink-0">
            <p className="font-bold text-xs sm:text-sm">Reconciliation Report</p>
            <p className="text-[9px] sm:text-[11px] text-stone-500">
              {fromDate} — {toDate}
            </p>
            <p className="text-[9px] sm:text-[11px] text-stone-500 truncate max-w-[140px] sm:max-w-none">
              {storeLabel}
            </p>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-3 gap-2 sm:gap-2.5">
          <div className="rounded-lg bg-amber-100 p-2.5 sm:p-3">
            <p className="text-[8px] sm:text-[9px] font-bold uppercase tracking-wide text-stone-500">
              Total Cash Collected
            </p>
            <p className="font-bold text-sm sm:text-lg mt-0.5">{totalCollected}</p>
          </div>
          <div className="rounded-lg bg-stone-100 p-2.5 sm:p-3">
            <p className="text-[8px] sm:text-[9px] font-bold uppercase tracking-wide text-stone-500">
              Total Commission
            </p>
            <p className="font-bold text-sm sm:text-lg mt-0.5">{totalShopCut}</p>
          </div>
          <div className="rounded-lg bg-stone-100 p-2.5 sm:p-3">
            <p className="text-[8px] sm:text-[9px] font-bold uppercase tracking-wide text-stone-500">
              Total Profit
            </p>
            <p className="font-bold text-sm sm:text-lg mt-0.5">{totalBizCut}</p>
          </div>
        </div>

        {/* Machine Payout Breakdown Table */}
        <div>
          <p className="font-bold text-xs sm:text-sm mb-2">
            Machine Payout Breakdown ({records.length})
          </p>

          {records.length === 0 ? (
            <div className="rounded-lg border border-stone-200 p-5 text-center text-xs text-stone-500">
              No reconciliation records found for this period.
            </div>
          ) : (
            <div className="rounded-lg border border-stone-200 overflow-x-auto">
              <table className="w-full text-[10px] sm:text-xs border-collapse min-w-[560px]">
                <thead>
                  <tr className="bg-stone-900 text-white">
                    <th className="text-left font-bold uppercase tracking-wide px-2 py-2 whitespace-nowrap">
                      Machine
                    </th>
                    <th className="text-left font-bold uppercase tracking-wide px-2 py-2">
                      Store
                    </th>
                    <th className="text-left font-bold uppercase tracking-wide px-2 py-2">
                      Location
                    </th>
                    <th className="text-center font-bold uppercase tracking-wide px-2 py-2 whitespace-nowrap">
                      Split
                    </th>
                    <th className="text-right font-bold uppercase tracking-wide px-2 py-2 whitespace-nowrap">
                      Cash
                    </th>
                    <th className="text-right font-bold uppercase tracking-wide px-2 py-2 text-teal-300 whitespace-nowrap">
                      Commission
                    </th>
                    <th className="text-right font-bold uppercase tracking-wide px-2 py-2 whitespace-nowrap">
                      Profit
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((rec, index) => (
                    <tr
                      key={rec.id}
                      className={`border-t border-stone-200 ${
                        index % 2 === 1 ? "bg-stone-50" : ""
                      }`}
                    >
                      <td className="px-2 py-2 font-mono whitespace-nowrap">
                        {rec.machineId}
                      </td>
                      <td className="px-2 py-2">{rec.storeName}</td>
                      <td className="px-2 py-2">{rec.locationName}</td>
                      <td className="px-2 py-2 text-center whitespace-nowrap">
                        {rec.splitRatio}
                      </td>
                      <td className="px-2 py-2 text-right font-mono whitespace-nowrap">
                        {formatMoney(rec.totalCash)}
                      </td>
                      <td className="px-2 py-2 text-right font-mono text-teal-700 whitespace-nowrap">
                        {formatMoney(rec.shopCut)}
                      </td>
                      <td className="px-2 py-2 text-right font-mono font-bold whitespace-nowrap">
                        {formatMoney(rec.businessCut)}
                      </td>
                    </tr>
                  ))}
                  <tr className="border-t-2 border-stone-900 bg-stone-100 font-bold">
                    <td className="px-2 py-2.5" colSpan={3}>
                      TOTAL
                    </td>
                    <td className="px-2 py-2.5 text-center whitespace-nowrap">
                      {records.length}
                    </td>
                    <td className="px-2 py-2.5 text-right font-mono whitespace-nowrap">
                      {totalCollected}
                    </td>
                    <td className="px-2 py-2.5 text-right font-mono text-teal-700 whitespace-nowrap">
                      {totalShopCut}
                    </td>
                    <td className="px-2 py-2.5 text-right font-mono whitespace-nowrap">
                      {totalBizCut}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>

        <p className="text-[9px] text-stone-400 border-t border-stone-200 pt-2.5">
          Generated {generatedAt}
        </p>
      </div>
    </div>
  );
}
