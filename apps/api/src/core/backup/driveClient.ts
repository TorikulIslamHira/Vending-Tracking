import { GoogleAuth } from "google-auth-library";
import { drive } from "@googleapis/drive";

/**
 * Reads the Google service-account credentials from either
 * GOOGLE_SERVICE_ACCOUNT_JSON (the raw JSON, or a base64-encoded copy of it —
 * handy for env vars that don't like embedded newlines/quotes) or
 * GOOGLE_SERVICE_ACCOUNT_JSON_PATH (a path to the JSON key file). Returns
 * null when neither is configured, so callers can skip the backup run
 * instead of crashing the whole process over an optional feature.
 */
function loadServiceAccountCredentials(): Record<string, any> | null {
  const inline = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (inline) {
    const raw = inline.trim().startsWith("{")
      ? inline
      : Buffer.from(inline, "base64").toString("utf-8");
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  const path = process.env.GOOGLE_SERVICE_ACCOUNT_JSON_PATH;
  if (path) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      return require(path);
    } catch {
      return null;
    }
  }

  return null;
}

export function isBackupConfigured(): boolean {
  return Boolean(loadServiceAccountCredentials());
}

export function getDriveClient() {
  const credentials = loadServiceAccountCredentials();
  if (!credentials) {
    throw new Error(
      "Google Drive backup is not configured — set GOOGLE_SERVICE_ACCOUNT_JSON (or _PATH)."
    );
  }

  const auth = new GoogleAuth({
    credentials,
    scopes: ["https://www.googleapis.com/auth/drive.file"],
  });

  return drive({ version: "v3", auth: auth as any });
}
