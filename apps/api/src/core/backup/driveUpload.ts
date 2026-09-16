import { Readable } from "stream";
import type { drive_v3 } from "googleapis";

export async function uploadFileToDrive(
  drive: drive_v3.Drive,
  folderId: string,
  filename: string,
  mimeType: string,
  content: Buffer | string
): Promise<string> {
  const body = Readable.from(typeof content === "string" ? Buffer.from(content) : content);

  const res = await drive.files.create({
    requestBody: {
      name: filename,
      parents: [folderId],
    },
    media: {
      mimeType,
      body,
    },
    fields: "id",
  });

  return res.data.id || "";
}

/**
 * Deletes files in a Drive folder older than `olderThanDays`, based on the
 * file's own createdTime — not when this job happens to run. Used to
 * implement the rolling retention windows (2-week raw dumps, 1-year CSVs)
 * without needing to track what was uploaded ourselves.
 */
export async function pruneOldFilesInFolder(
  drive: drive_v3.Drive,
  folderId: string,
  olderThanDays: number
): Promise<number> {
  const cutoff = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000);

  const res = await drive.files.list({
    q: `'${folderId}' in parents and trashed = false`,
    fields: "files(id, name, createdTime)",
    pageSize: 1000,
  });

  const files = res.data.files || [];
  let deletedCount = 0;

  for (const file of files) {
    if (!file.id || !file.createdTime) continue;
    if (new Date(file.createdTime) < cutoff) {
      await drive.files.delete({ fileId: file.id });
      deletedCount += 1;
    }
  }

  return deletedCount;
}
