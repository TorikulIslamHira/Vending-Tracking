import {
  Document,
  Page,
  View,
  Text,
  Image,
  StyleSheet,
} from "@react-pdf/renderer";
import type { DetailedCashLog } from "@/hooks/useInventory";

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
  machineSection: {
    marginBottom: 16,
  },
  machineSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#f5f5f4",
    borderRadius: 6,
    paddingVertical: 6,
    paddingHorizontal: 8,
    marginBottom: 6,
  },
  machineTitle: {
    fontSize: 9.5,
    fontFamily: "Helvetica-Bold",
    color: "#1c1917",
  },
  machineSubtitle: {
    fontSize: 7.5,
    color: "#78716c",
    marginTop: 1,
  },
  machineEntryCount: {
    fontSize: 7.5,
    fontFamily: "Helvetica-Bold",
    color: "#92400e",
    backgroundColor: "#fef3c7",
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 4,
  },
  table: {
    borderRadius: 6,
    overflow: "hidden",
    border: "1 solid #e7e5e4",
  },
  tableHeaderRow: {
    flexDirection: "row",
    backgroundColor: "#1c1917",
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  tableHeaderCell: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    color: "#ffffff",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderTop: "1 solid #e7e5e4",
  },
  tableRowAlt: {
    backgroundColor: "#fafaf9",
  },
  tableCell: {
    fontSize: 7.5,
    color: "#292524",
    letterSpacing: 0.2,
  },
  // Widths must sum to exactly 100.
  colDate: { width: "14%" },
  colCollected: { width: "13%", textAlign: "right", paddingRight: 6 },
  colExpected: { width: "13%", textAlign: "right", paddingRight: 6 },
  colDiscrepancy: { width: "12%", textAlign: "right", paddingRight: 6 },
  colStatus: { width: "13%" },
  colAgent: { width: "15%" },
  colRemarks: { width: "20%" },
  statusShortage: { color: "#be123c", fontFamily: "Helvetica-Bold" },
  statusPartial: { color: "#b45309", fontFamily: "Helvetica-Bold" },
  statusClean: { color: "#15803d" },
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

function statusLabel(log: DetailedCashLog) {
  if (log.isShortage) return { text: "Shortage", style: styles.statusShortage };
  if (log.isPartial) return { text: "Partial", style: styles.statusPartial };
  return { text: "Clean", style: styles.statusClean };
}

interface MachineGroup {
  machineId: string;
  storeName: string;
  locationName: string;
  logs: DetailedCashLog[];
}

function groupLogsByMachine(logs: DetailedCashLog[]): MachineGroup[] {
  const map = new Map<string, MachineGroup>();
  for (const log of logs) {
    const existing = map.get(log.machineId);
    if (existing) {
      existing.logs.push(log);
    } else {
      map.set(log.machineId, {
        machineId: log.machineId,
        storeName: log.storeName,
        locationName: log.locationName,
        logs: [log],
      });
    }
  }
  // Chronological within each machine, most recent first — matches the
  // Reports page's own detailedLogs ordering.
  return Array.from(map.values()).sort((a, b) => a.machineId.localeCompare(b.machineId));
}

interface MachineAuditPdfDocumentProps {
  logoSrc: string;
  storeLabel: string;
  fromDate: string;
  toDate: string;
  detailedLogs: DetailedCashLog[];
  formatMoney: (amount: number) => string;
  generatedAt: string;
}

export function MachineAuditPdfDocument({
  logoSrc,
  storeLabel,
  fromDate,
  toDate,
  detailedLogs,
  formatMoney,
  generatedAt,
}: MachineAuditPdfDocumentProps) {
  const machineGroups = groupLogsByMachine(detailedLogs);

  return (
    <Document title="Machine Audit Logs">
      <Page size="A4" style={styles.page} wrap>
        {/* Header: Brand + Report Title */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Image src={logoSrc} style={styles.logo} />
            <View>
              <Text style={styles.brandName}>Bee Novelty Vending</Text>
              <Text style={styles.brandSubtitle}>Machine Audit Logs</Text>
            </View>
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.reportTitle}>Machine Audit Logs</Text>
            <Text style={styles.reportMeta}>
              {fromDate} — {toDate}
            </Text>
            <Text style={styles.reportMeta}>{storeLabel}</Text>
          </View>
        </View>

        {machineGroups.length === 0 ? (
          <View style={styles.table}>
            <Text style={styles.emptyState}>
              No cash-collection activity found for this period.
            </Text>
          </View>
        ) : (
          machineGroups.map((group) => (
            <View key={group.machineId} style={styles.machineSection} wrap={false}>
              <View style={styles.machineSectionHeader}>
                <View>
                  <Text style={styles.machineTitle}>{group.machineId}</Text>
                  <Text style={styles.machineSubtitle}>
                    {group.storeName} ({group.locationName})
                  </Text>
                </View>
                <Text style={styles.machineEntryCount}>
                  {group.logs.length} {group.logs.length === 1 ? "entry" : "entries"}
                </Text>
              </View>

              <View style={styles.table}>
                <View style={styles.tableHeaderRow}>
                  <Text style={[styles.tableHeaderCell, styles.colDate]}>Date</Text>
                  <Text style={[styles.tableHeaderCell, styles.colCollected]}>Collected</Text>
                  <Text style={[styles.tableHeaderCell, styles.colExpected]}>Expected</Text>
                  <Text style={[styles.tableHeaderCell, styles.colDiscrepancy]}>Discrep.</Text>
                  <Text style={[styles.tableHeaderCell, styles.colStatus]}>Status</Text>
                  <Text style={[styles.tableHeaderCell, styles.colAgent]}>Agent</Text>
                  <Text style={[styles.tableHeaderCell, styles.colRemarks]}>Remarks</Text>
                </View>
                {group.logs.map((log, index) => {
                  const status = statusLabel(log);
                  return (
                    <View
                      key={log.id}
                      style={[styles.tableRow, ...(index % 2 === 1 ? [styles.tableRowAlt] : [])]}
                    >
                      <Text style={[styles.tableCell, styles.colDate]}>{log.date}</Text>
                      <Text style={[styles.tableCell, styles.colCollected]}>
                        {formatMoney(log.collectedAmount)}
                      </Text>
                      <Text style={[styles.tableCell, styles.colExpected]}>
                        {formatMoney(log.expectedAmount)}
                      </Text>
                      <Text style={[styles.tableCell, styles.colDiscrepancy]}>
                        {formatMoney(log.discrepancy)}
                      </Text>
                      <Text style={[styles.tableCell, styles.colStatus, status.style]}>
                        {status.text}
                      </Text>
                      <Text style={[styles.tableCell, styles.colAgent]}>{log.agentName}</Text>
                      <Text style={[styles.tableCell, styles.colRemarks]}>
                        {log.remarks || "—"}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </View>
          ))
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
