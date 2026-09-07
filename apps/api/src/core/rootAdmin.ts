/**
 * The root Super Admin is identified by matching against `SUPER_ADMIN_EMAIL`
 * (the same env var the seed script bootstraps it from) rather than a stored
 * flag — there is exactly one of these per deployment, and it must remain
 * recoverable even if the database is wiped and re-seeded.
 */
export function isRootSuperAdminEmail(email: string): boolean {
  const rootEmail = process.env.SUPER_ADMIN_EMAIL;
  if (!rootEmail) return false;
  return email.trim().toLowerCase() === rootEmail.trim().toLowerCase();
}
