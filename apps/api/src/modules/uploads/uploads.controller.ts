import { FastifyReply, FastifyRequest } from "fastify";
import { createWriteStream, mkdirSync } from "fs";
import { pipeline } from "stream/promises";
import path from "path";
import crypto from "crypto";

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

const MAX_FILE_SIZE_BYTES = 8 * 1024 * 1024; // 8MB — a phone camera photo comfortably fits

/**
 * Accepts a single multipart image upload (issue-report or proof-of-repair
 * photo) and saves it to local disk under apps/api/uploads/issues/<uuid>.
 * Returns a path relative to the API root (e.g. "/uploads/issues/xyz.jpg")
 * — the frontend prefixes this with its own API base URL when rendering an
 * <img>, the same way it already does for every other API call.
 *
 * Local-disk storage only (see the branch's storage-approach decision):
 * works with zero external credentials for local dev, but the container
 * filesystem is ephemeral — a persistent Docker volume must be added before
 * this ever ships to production, or uploaded photos won't survive a redeploy.
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

    mkdirSync(ISSUES_UPLOAD_DIR, { recursive: true });

    const filename = `${crypto.randomUUID()}${extension}`;
    const filePath = path.join(ISSUES_UPLOAD_DIR, filename);

    await pipeline(file.file, createWriteStream(filePath));

    // @fastify/multipart aborts the stream (file.file.truncated) rather than
    // throwing when a file exceeds the configured limit — check explicitly
    // so an oversized upload reports a clean 413, not a silently truncated photo.
    if (file.file.truncated) {
      return reply.status(413).send({
        statusCode: 413,
        error: "Payload Too Large",
        message: `Photo exceeds the ${MAX_FILE_SIZE_BYTES / (1024 * 1024)}MB limit.`,
      });
    }

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
