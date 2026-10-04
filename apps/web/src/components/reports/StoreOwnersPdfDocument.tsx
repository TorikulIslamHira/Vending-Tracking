import {
  Document,
  Page,
  View,
  Text,
  Image,
  StyleSheet,
} from "@react-pdf/renderer";
import type { StoreItem } from "@/hooks/useStores";

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
  tableCell: {
    fontSize: 8,
    color: "#292524",
    letterSpacing: 0.2,
  },
  cellMuted: {
    color: "#a8a29e",
    fontStyle: "italic",
  },
  // Widths must sum to exactly 100.
  colStore: { width: "28%" },
  colOwner: { width: "26%" },
  colPhone: { width: "22%" },
  colEmail: { width: "24%" },
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

interface StoreOwnersPdfDocumentProps {
  logoSrc: string;
  stores: StoreItem[];
  generatedAt: string;
}

export function StoreOwnersPdfDocument({
  logoSrc,
  stores,
  generatedAt,
}: StoreOwnersPdfDocumentProps) {
  return (
    <Document title="Store Owner Information">
      <Page size="A4" style={styles.page} wrap>
        {/* Header: Brand + Report Title */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Image src={logoSrc} style={styles.logo} />
            <View>
              <Text style={styles.brandName}>Bee Novelty Vending</Text>
              <Text style={styles.brandSubtitle}>Store Owner Directory</Text>
            </View>
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.reportTitle}>Store Owner Information</Text>
            <Text style={styles.reportMeta}>{stores.length} Stores</Text>
          </View>
        </View>

        {stores.length === 0 ? (
          <View style={styles.table}>
            <Text style={styles.emptyState}>No stores registered yet.</Text>
          </View>
        ) : (
          <View style={styles.table}>
            <View style={styles.tableHeaderRow}>
              <Text style={[styles.tableHeaderCell, styles.colStore]}>Store Name</Text>
              <Text style={[styles.tableHeaderCell, styles.colOwner]}>Owner Name</Text>
              <Text style={[styles.tableHeaderCell, styles.colPhone]}>Phone Number</Text>
              <Text style={[styles.tableHeaderCell, styles.colEmail]}>Email</Text>
            </View>
            {stores.map((store, index) => (
              <View
                key={store.id}
                style={[styles.tableRow, ...(index % 2 === 1 ? [styles.tableRowAlt] : [])]}
              >
                <Text style={[styles.tableCell, styles.colStore]}>{store.name}</Text>
                <Text
                  style={[
                    styles.tableCell,
                    styles.colOwner,
                    ...(store.ownerName ? [] : [styles.cellMuted]),
                  ]}
                >
                  {store.ownerName || "Not on file"}
                </Text>
                <Text
                  style={[
                    styles.tableCell,
                    styles.colPhone,
                    ...(store.ownerPhone ? [] : [styles.cellMuted]),
                  ]}
                >
                  {store.ownerPhone || "Not on file"}
                </Text>
                <Text
                  style={[
                    styles.tableCell,
                    styles.colEmail,
                    ...(store.ownerEmail ? [] : [styles.cellMuted]),
                  ]}
                >
                  {store.ownerEmail || "Not on file"}
                </Text>
              </View>
            ))}
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
