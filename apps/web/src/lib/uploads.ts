import { api } from "@/lib/api";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api/v1";

/**
 * The API stores/returns upload paths relative to its own root (e.g.
 * "/uploads/issues/<uuid>.jpg"), not a full URL — this prepends the same
 * API_BASE_URL every other request already uses, so it resolves correctly
 * whether that's a full origin (local dev) or a same-origin path proxied by
 * nginx (production).
 */
export function resolveUploadUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path;
  return `${API_BASE_URL}${path}`;
}

/**
 * Uploads a single issue/repair photo and returns the relative path to store
 * alongside the cash-collection or resolve-issue request. Content-Type is
 * explicitly unset (not just left default) so the browser can set its own
 * multipart boundary — the `api` instance's blanket
 * "Content-Type: application/json" default would otherwise stick and break
 * the upload.
 */
export async function uploadIssuePhoto(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("photo", file);

  const res = await api.post("/uploads/issue-photo", formData, {
    headers: { "Content-Type": undefined },
  });

  return res.data?.data?.url as string;
}
