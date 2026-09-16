import cron from "node-cron";
import { isBackupConfigured } from "./driveClient";
import { runWeeklyRawBackup } from "./weeklyRawBackup";
import { runMonthlyCsvBackup } from "./monthlyCsvBackup";

/**
 * Registers the two scheduled backup jobs on the running API process —
 * matches this project's existing Docker/VPS deployment (a single
 * long-lived container) rather than introducing separate infra. Both jobs
 * are entirely optional: without Google Drive credentials configured
 * (GOOGLE_SERVICE_ACCOUNT_JSON), this just logs once and does nothing.
 */
export function registerBackupSchedules(): void {
  if (!isBackupConfigured()) {
    console.log(
      "[backup] Google Drive credentials not configured (GOOGLE_SERVICE_ACCOUNT_JSON) — automated backups are disabled."
    );
    return;
  }

  // Every Sunday at 03:00 server time.
  cron.schedule("0 3 * * 0", () => {
    runWeeklyRawBackup().catch((err) => {
      console.error("[backup:weekly] Failed:", err);
    });
  });

  // 1st of every month at 04:00 server time.
  cron.schedule("0 4 1 * *", () => {
    runMonthlyCsvBackup().catch((err) => {
      console.error("[backup:monthly] Failed:", err);
    });
  });

  console.log("[backup] Weekly raw + monthly CSV backup schedules registered.");
}
