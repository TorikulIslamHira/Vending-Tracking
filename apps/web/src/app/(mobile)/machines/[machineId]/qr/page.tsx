"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

/**
 * This standalone page was merged into the unified QR flow at /scan (see
 * the Owner Requested Changes item: "combine Scan Machine QR and Machine
 * QR Code into a single QR flow instead of living apart"). Kept as a thin
 * redirect — not deleted outright — so any bookmark or stale link to this
 * URL still lands somewhere useful instead of 404ing.
 */
export default function MachineQrRedirectPage() {
  const router = useRouter();
  const params = useParams();
  const machineId = (params?.machineId as string) || "";

  useEffect(() => {
    router.replace(`/scan?tab=generate&machineId=${encodeURIComponent(machineId)}`);
  }, [machineId, router]);

  return (
    <div className="w-full min-h-[400px] flex items-center justify-center">
      <Loader2 className="h-6 w-6 animate-spin text-primary" />
    </div>
  );
}
