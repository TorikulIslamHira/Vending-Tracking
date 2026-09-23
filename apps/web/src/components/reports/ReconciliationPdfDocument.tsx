import {
  Document,
  Page,
  View,
  Text,
  Image,
  StyleSheet,
} from "@react-pdf/renderer";
import type { ReportRecord } from "@/hooks/useInventory";

const styles = StyleSheet.create({
  page: {
    padding: 36,
    fontSize: 9,
    fontFamily: "Helvetica",
    color: "#1c1917",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottom: "2 solid #F59E0B",
    paddingBottom: 12,
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  logo: {
    width: 40,
    height: 40,
    borderRadius: 8,
  },
  brandName: {
    fontSize: 15,
    fontFamily: "Helvetica-Bold",
    color: "#1c1917",
  },
  brandSubtitle: {
    fontSize: 8,
    color: "#78716c",
    marginTop: 1,
  },
  headerRight: {
    alignItems: "flex-end",
  },
  reportTitle: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    color: "#1c1917",
  },
  reportMeta: {
    fontSize: 8,
    color: "#78716c",
    marginTop: 2,
  },
  summaryRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 18,
  },
  summaryCard: {
    flex: 1,
    padding: 10,
    borderRadius: 8,
    backgroundColor: "#f5f5f4",
  },
  summaryCardAccent: {
    backgroundColor: "#fef3c7",
  },
  summaryLabel: {
    fontSize: 7.5,
    fontFamily: "Helvetica-Bold",
    color: "#78716c",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 14,
    fontFamily: "Helvetica-Bold",
    color: "#1c1917",
    letterSpacing: 0.3,
  },
  sectionTitle: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    marginBottom: 8,
    color: "#1c1917",
  },
  table: {
    borderRadius: 6,
    overflow: "hidden",
    border: "1 solid #e7e5e4",
  },
  tableHeaderRow: {
    flexDirection: "row",
    backgroundColor: "#1c1917",
    paddingVertical: 7,
    paddingHorizontal: 8,
  },
  tableHeaderCell: {
    fontSize: 7.5,
    fontFamily: "Helvetica-Bold",
    color: "#ffffff",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 7,
    paddingHorizontal: 8,
    borderTop: "1 solid #e7e5e4",
  },
  tableRowAlt: {
    backgroundColor: "#fafaf9",
  },
  tableTotalRow: {
    flexDirection: "row",
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderTop: "2 solid #1c1917",
    backgroundColor: "#f5f5f4",
  },
  tableTotalCell: {
    fontSize: 8.5,
    fontFamily: "Helvetica-Bold",
    color: "#1c1917",
    letterSpacing: 0.2,
  },
  tableCell: {
    fontSize: 8,
    color: "#292524",
    letterSpacing: 0.2,
  },
  // Widths must sum to exactly 100 — react-pdf's Yoga layout doesn't clamp
  // row children to the parent's width, so an over-100 total (the bug here
  // previously) silently squeezes/wraps whichever column runs out of room.
  colMachine: { width: "16%" },
  colStore: { width: "21%" },
  colLocation: { width: "20%" },
  colSplit: { width: "9%", textAlign: "center" },
  colCash: { width: "11%", textAlign: "right", paddingRight: 8 },
  colShop: { width: "12%", textAlign: "right", paddingRight: 8, color: "#0f766e" },
  colProfit: {
    width: "11%",
    textAlign: "right",
    paddingRight: 4,
    color: "#1c1917",
    fontFamily: "Helvetica-Bold",
  },
  footer: {
    position: "absolute",
    bottom: 24,
    left: 36,
    right: 36,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 7,
    color: "#a8a29e",
    borderTop: "1 solid #e7e5e4",
    paddingTop: 8,
  },
  emptyState: {
    padding: 20,
    textAlign: "center",
    fontSize: 9,
    color: "#78716c",
  },
});

interface ReconciliationPdfDocumentProps {
  logoSrc: string;
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

export function ReconciliationPdfDocument({
  logoSrc,
  storeLabel,
  fromDate,
  toDate,
  totalCollected,
  totalShopCut,
  totalBizCut,
  records,
  formatMoney,
  generatedAt,
}: ReconciliationPdfDocumentProps) {
  return (
    <Document title="Reconciliation Report">
      <Page size="A4" style={styles.page}>
        {/* Header: Brand + Report Title */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Image src={logoSrc} style={styles.logo} />
            <View>
              <Text style={styles.brandName}>Bee Novelty Vending</Text>
              <Text style={styles.brandSubtitle}>Financial Reconciliation</Text>
            </View>
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.reportTitle}>Reconciliation Report</Text>
            <Text style={styles.reportMeta}>
              {fromDate} — {toDate}
            </Text>
            <Text style={styles.reportMeta}>{storeLabel}</Text>
          </View>
        </View>

        {/* Summary Cards */}
        <View style={styles.summaryRow}>
          <View style={[styles.summaryCard, styles.summaryCardAccent]}>
            <Text style={styles.summaryLabel}>Total Cash Collected</Text>
            <Text style={styles.summaryValue}>{totalCollected}</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Total Commission</Text>
            <Text style={styles.summaryValue}>{totalShopCut}</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Total Profit</Text>
            <Text style={styles.summaryValue}>{totalBizCut}</Text>
          </View>
        </View>

        {/* Machine Payout Breakdown Table */}
        <Text style={styles.sectionTitle}>
          Machine Payout Breakdown ({records.length})
        </Text>

        {records.length === 0 ? (
          <View style={styles.table}>
            <Text style={styles.emptyState}>
              No reconciliation records found for this period.
            </Text>
          </View>
        ) : (
          <View style={styles.table}>
            <View style={styles.tableHeaderRow}>
              <Text style={[styles.tableHeaderCell, styles.colMachine]}>Machine</Text>
              <Text style={[styles.tableHeaderCell, styles.colStore]}>Store</Text>
              <Text style={[styles.tableHeaderCell, styles.colLocation]}>Location</Text>
              <Text style={[styles.tableHeaderCell, styles.colSplit]}>Split</Text>
              <Text style={[styles.tableHeaderCell, styles.colCash]}>Cash</Text>
              <Text style={[styles.tableHeaderCell, styles.colShop]}>Commission</Text>
              <Text style={[styles.tableHeaderCell, styles.colProfit]}>Profit</Text>
            </View>
            {records.map((rec, index) => (
              <View
                key={rec.id}
                style={[styles.tableRow, ...(index % 2 === 1 ? [styles.tableRowAlt] : [])]}
              >
                <Text style={[styles.tableCell, styles.colMachine]}>{rec.machineId}</Text>
                <Text style={[styles.tableCell, styles.colStore]}>{rec.storeName}</Text>
                <Text style={[styles.tableCell, styles.colLocation]}>{rec.locationName}</Text>
                <Text style={[styles.tableCell, styles.colSplit]}>{rec.splitRatio}</Text>
                <Text style={[styles.tableCell, styles.colCash]}>
                  {formatMoney(rec.totalCash)}
                </Text>
                <Text style={[styles.tableCell, styles.colShop]}>
                  {formatMoney(rec.shopCut)}
                </Text>
                <Text style={[styles.tableCell, styles.colProfit]}>
                  {formatMoney(rec.businessCut)}
                </Text>
              </View>
            ))}
            <View style={styles.tableTotalRow}>
              <Text style={[styles.tableTotalCell, styles.colMachine]}>TOTAL</Text>
              <Text style={[styles.tableTotalCell, styles.colStore]} />
              <Text style={[styles.tableTotalCell, styles.colLocation]} />
              <Text style={[styles.tableTotalCell, styles.colSplit]}>
                {records.length}
              </Text>
              <Text style={[styles.tableTotalCell, styles.colCash]}>
                {totalCollected}
              </Text>
              <Text style={[styles.tableTotalCell, styles.colShop]}>
                {totalShopCut}
              </Text>
              <Text style={[styles.tableTotalCell, styles.colProfit]}>
                {totalBizCut}
              </Text>
            </View>
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text>Generated {generatedAt}</Text>
          <Text render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}
