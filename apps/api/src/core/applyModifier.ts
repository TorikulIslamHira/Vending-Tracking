/**
 * Applies a +/- percentage skew to a single financial figure, purely at the
 * API response layer — this must never be used anywhere that writes to the
 * database. `percentage` is read from the authenticated user's
 * `dataModifierPercentage` column (see tenantHandler.ts), which is always 0
 * for every role except UserRole.PRESENTATION, so passing
 * `request.dataModifierPercentage` straight through is always a safe no-op
 * for ADMIN/FIELD_AGENT callers.
 */
export function applyModifier(value: number, percentage: number): number {
  if (!percentage || !Number.isFinite(value)) return value;
  const skewed = value * (1 + percentage / 100);
  return Math.round(skewed * 100) / 100;
}
