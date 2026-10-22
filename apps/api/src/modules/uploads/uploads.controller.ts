import { FastifyReply, FastifyRequest } from "fastify";
// Side-effect import: this is what actually declares `request.file()` on
// FastifyRequest's type. The main `tsc` build only gets away without it
// because server.ts (which does import this) happens to share the same
// compilation unit — a narrower one (e.g. this file's own test file,
// compiled in isolation by ts-node) would otherwise fail to typecheck
// `request.file()` below.
import "@fastify/multipart";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import crypto from "crypto";
import sharp from "sharp";

// Resolves to apps/api/uploads/issues regardless of whether this runs from
// src/modules/uploads (tsx/dev) or dist/modules/uploads (compiled) — both
// sit the same three directories below the apps/api root.
const ISSUES_UPLOAD_DIR = path.join(__dirname, "../../../uploads/issues");

const ALLOWED_MIME_TYPES = new Map([
  ["image/jpeg", ".jpg"],
  ["image/png", ".png"],
  ["image/webp", ".webp"],
  ["image/heic", ".heic"],
  ["image/heif", ".heif"],
]);

// sharp's bundled libvips can't decode HEIC/HEIF (the HEVC codec it'd need
// is patent-encumbered and excluded from sharp's prebuilt binaries), so
// those are stored as-is — same as before this controller started
// processing images at all. iOS Safari/WebKit decodes HEIC natively, so
// apps/web's client-side compression (lib/uploads.ts) already converts most
// of these to JPEG before they ever reach here.
const UNPROCESSABLE_MIME_TYPES = new Set(["image/heic", "image/heif"]);

const MAX_FILE_SIZE_BYTES = 8 * 1024 * 1024; // 8MB — a phone camera photo comfortably fits
const MAX_DIMENSION = 1600;
const JPEG_QUALITY = 80;

/**
 * Accepts a single multipart image upload (issue-report or proof-of-repair
 * photo) and saves it to local disk under apps/api/uploads/issues/<uuid>.
 * Returns a path relative to the API root (e.g. "/uploads/issues/xyz.jpg")
 * — the frontend prefixes this with its own API base URL when rendering an
 * <img>, the same way it already does for every other API call.
 *
 * Safety net behind the client-side compression apps/web already does:
 * auto-rotates, downscales to a 1600px box, strips metadata, and
 * re-encodes as JPEG. Resaved through sharp strips EXIF/ICC by default
 * (only `.withMetadata()` would keep it) — no separate strip step needed.
 * Falls back to saving the original bytes untouched whenever sharp can't
 * process the input (HEIC/HEIF, or any other decode failure) rather than
 * failing the upload.
 *
 * Persisted to the `uploads_data` Docker volume (docker-compose.yml) so
 * photos survive a container recreate — the path above must keep matching
 * that volume's mount point exactly.
 */
export async function uploadIssuePhotoHandler(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  try {
    const file = await request.file({
      limits: { fileSize: MAX_FILE_SIZE_BYTES },
    });

    if (!file) {
      return reply.status(400).send({
        statusCode: 400,
        error: "Bad Request",
        message: "No file was uploaded. Expected a multipart field named 'photo'.",
      });
    }

    const extension = ALLOWED_MIME_TYPES.get(file.mimetype);
    if (!extension) {
      return reply.status(400).send({
        statusCode: 400,
        error: "Bad Request",
        message: `Unsupported image type: ${file.mimetype}. Allowed: JPEG, PNG, WEBP, HEIC.`,
      });
    }

    let buffer: Buffer;
    try {
      buffer = await file.toBuffer();
    } catch (err: any) {
      if (err?.code === "FST_REQ_FILE_TOO_LARGE") {
        return reply.status(413).send({
          statusCode: 413,
          error: "Payload Too Large",
          message: `Photo exceeds the ${MAX_FILE_SIZE_BYTES / (1024 * 1024)}MB limit.`,
        });
      }
      throw err;
    }

    let outputBuffer = buffer;
    let outputExtension = extension;
    if (!UNPROCESSABLE_MIME_TYPES.has(file.mimetype)) {
      try {
        outputBuffer = await sharp(buffer)
          .rotate()
          .resize({
            width: MAX_DIMENSION,
            height: MAX_DIMENSION,
            fit: "inside",
            withoutEnlargement: true,
          })
          .jpeg({ quality: JPEG_QUALITY })
          .toBuffer();
        outputExtension = ".jpg";
      } catch {
        // Not a decodable image despite its declared mimetype — store the
        // original bytes rather than fail the upload.
      }
    }

    await mkdir(ISSUES_UPLOAD_DIR, { recursive: true });

    const filename = `${crypto.randomUUID()}${outputExtension}`;
    const filePath = path.join(ISSUES_UPLOAD_DIR, filename);
    await writeFile(filePath, outputBuffer);

    return reply.send({
      statusCode: 200,
      data: {
        url: `/uploads/issues/${filename}`,
      },
    });
  } catch (error: any) {
    return reply.status(500).send({
      statusCode: 500,
      error: "Internal Server Error",
      message: error.message || "Failed to upload photo",
    });
  }
}
