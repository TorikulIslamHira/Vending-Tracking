import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile, rm } from "fs/promises";
import path from "path";
import sharp from "sharp";
import { FastifyReply, FastifyRequest } from "fastify";
import { uploadIssuePhotoHandler } from "./uploads.controller";

const ISSUES_UPLOAD_DIR = path.join(__dirname, "../../../uploads/issues");

function mockReply() {
  const reply = {
    statusCode: 200,
    body: undefined as any,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    send(payload: any) {
      this.body = payload;
      return this;
    },
  };
  return reply as unknown as FastifyReply & typeof reply;
}

function mockRequest(mimetype: string, toBuffer: () => Promise<Buffer>) {
  return {
    file: async () => ({ mimetype, toBuffer }),
  } as unknown as FastifyRequest;
}

async function cleanupSavedFile(reply: ReturnType<typeof mockReply>) {
  const url = reply.body?.data?.url as string | undefined;
  if (!url) return;
  await rm(path.join(ISSUES_UPLOAD_DIR, path.basename(url)), { force: true });
}

test("downscales a large image and produces a smaller file", async () => {
  const original = await sharp({
    create: { width: 3000, height: 2000, channels: 3, background: { r: 10, g: 120, b: 200 } },
  })
    .png()
    .toBuffer();

  const reply = mockReply();
  await uploadIssuePhotoHandler(mockRequest("image/png", async () => original), reply);

  try {
    assert.equal(reply.statusCode, 200);
    const url = reply.body.data.url as string;
    assert.match(url, /^\/uploads\/issues\/.+\.jpg$/);

    const saved = await readFile(path.join(ISSUES_UPLOAD_DIR, path.basename(url)));
    assert.ok(saved.length < original.length, "resized/recompressed output should be smaller");

    const metadata = await sharp(saved).metadata();
    assert.ok((metadata.width ?? 0) <= 1600 && (metadata.height ?? 0) <= 1600);
  } finally {
    await cleanupSavedFile(reply);
  }
});

test("rejects an unsupported mime type with 400", async () => {
  const reply = mockReply();
  await uploadIssuePhotoHandler(
    mockRequest("application/pdf", async () => Buffer.from("not an image")),
    reply
  );

  assert.equal(reply.statusCode, 400);
  await cleanupSavedFile(reply);
});

test("rejects an oversized file with 413", async () => {
  const reply = mockReply();
  const tooLarge = Object.assign(new Error("request file too large"), {
    code: "FST_REQ_FILE_TOO_LARGE",
  });
  await uploadIssuePhotoHandler(
    mockRequest("image/jpeg", async () => {
      throw tooLarge;
    }),
    reply
  );

  assert.equal(reply.statusCode, 413);
  await cleanupSavedFile(reply);
});
