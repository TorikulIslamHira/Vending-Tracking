import { spawn } from "child_process";
import { getDriveClient } from "./driveClient";
import { uploadFileToDrive, pruneOldFilesInFolder } from "./driveUpload";

const RETENTION_DAYS = 21; // "2-week rolling retention" with a grace window before deletion

function runPgDump(databaseUrl: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    const stderrChunks: Buffer[] = [];
    // --no-owner/--no-acl: a restore target's roles rarely match the source
    // server's, and those clauses would otherwise fail or require superuser.
    const child = spawn("pg_dump", ["--no-owner", "--no-acl", "--format=plain", databaseUrl]);

    child.stdout.on("data", (chunk) => chunks.push(chunk));
    child.stderr.on("data", (chunk) => stderrChunks.push(chunk));

    child.on("error", reject);
    child.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(`pg_dump exited with code ${code}: ${Buffer.concat(stderrChunks).toString("utf-8")}`));
        return;
      }
      resolve(Buffer.concat(chunks));
    });
  });
}

export async function runWeeklyRawBackup(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL;
  const folderId = process.env.GDRIVE_BACKUP_FOLDER_ID;

  if (!databaseUrl || !folderId) {
    throw new Error("DATABASE_URL and GDRIVE_BACKUP_FOLDER_ID are required for the weekly backup.");
  }

  const dump = await runPgDump(databaseUrl);
  const timestamp = new Date().toISOString().slice(0, 10);
  const filename = `vending-db-backup-${timestamp}.sql`;

  const drive = getDriveClient();
  await uploadFileToDrive(drive, folderId, filename, "application/sql", dump);
  const deletedCount = await pruneOldFilesInFolder(drive, folderId, RETENTION_DAYS);

  // eslint-disable-next-line no-console
  console.log(
    `[backup:weekly] Uploaded ${filename} (${dump.length} bytes); pruned ${deletedCount} backup(s) older than ${RETENTION_DAYS} days.`
  );
}
