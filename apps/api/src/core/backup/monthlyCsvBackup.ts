import { db, cashLogs, machines, stores } from "../db";
import { getDriveClient } from "./driveClient";
import { uploadFileToDrive, pruneOldFilesInFolder } from "./driveUpload";
import { rowsToCsv } from "./csv";

const RETENTION_DAYS = 366; // "Retain these for 1 year"

export async function runMonthlyCsvBackup(): Promise<void> {
  const folderId = process.env.GDRIVE_BACKUP_FOLDER_ID_CSV;
  if (!folderId) {
    throw new Error("GDRIVE_BACKUP_FOLDER_ID_CSV is required for the monthly CSV backup.");
  }

  const [collectionRows, machineRows, storeRows] = await Promise.all([
    db.select().from(cashLogs),
    db.select().from(machines),
    db.select().from(stores),
  ]);

  const monthLabel = new Date().toISOString().slice(0, 7); // YYYY-MM
  const drive = getDriveClient();

  const exports: Array<[string, Record<string, unknown>[]]> = [
    [`${monthLabel}-collections.csv`, collectionRows],
    [`${monthLabel}-machines.csv`, machineRows],
    [`${monthLabel}-stores.csv`, storeRows],
  ];

  for (const [filename, rows] of exports) {
    await uploadFileToDrive(drive, folderId, filename, "text/csv", rowsToCsv(rows as any));
  }

  const deletedCount = await pruneOldFilesInFolder(drive, folderId, RETENTION_DAYS);

  // eslint-disable-next-line no-console
  console.log(
    `[backup:monthly] Uploaded ${exports.length} CSV exports for ${monthLabel}; pruned ${deletedCount} file(s) older than ${RETENTION_DAYS} days.`
  );
}
