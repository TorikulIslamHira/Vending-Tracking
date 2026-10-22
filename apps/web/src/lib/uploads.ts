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

const MAX_DIMENSION = 1600;
const JPEG_QUALITY = 0.75;

/**
 * Downscales + re-encodes a photo client-side before it ever hits the
 * network: longest side capped at 1600px, JPEG quality 0.75 (targets
 * ~200-500KB for a typical phone photo). Uses `createImageBitmap`'s
 * `imageOrientation: "from-image"` to apply EXIF rotation during decode —
 * no separate EXIF-parsing dependency needed.
 *
 * Falls back to the original file untouched whenever compression can't
 * happen (API unsupported, non-image file, decode failure — e.g. a HEIC
 * photo on a browser that can't decode HEIC into a bitmap). The upload
 * still goes through either way; apps/api's sharp-based safety net handles
 * what it can on the way in.
 */
export async function compressPhoto(file: File): Promise<File> {
  try {
    if (typeof createImageBitmap === "undefined" || !file.type.startsWith("image/")) {
      return file;
    }

    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      bitmap.close();
      return file;
    }
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY)
    );
    if (!blob) return file;

    const compressedName = file.name.replace(/\.[^.]+$/, "") + ".jpg";
    return new File([blob], compressedName, { type: "image/jpeg", lastModified: Date.now() });
  } catch {
    return file;
  }
}

/**
 * Uploads a single issue/repair photo and returns the relative path to store
 * alongside the cash-collection or resolve-issue request. Content-Type is
 * explicitly unset (not just left default) so the browser can set its own
 * multipart boundary — the `api` instance's blanket
 * "Content-Type: application/json" default would otherwise stick and break
 * the upload.
 *
 * Expects an already-compressed file (see `compressPhoto`) — callers run
 * that first so they can show a distinct "compressing..." state before the
 * "uploading..." one.
 */
export async function uploadIssuePhoto(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("photo", file);

  const res = await api.post("/uploads/issue-photo", formData, {
    headers: { "Content-Type": undefined },
  });

  return res.data?.data?.url as string;
}
