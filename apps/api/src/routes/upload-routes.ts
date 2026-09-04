import type { FastifyInstance } from "fastify";
import { AppError } from "../lib/errors.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import {
  isAllowedFileType,
  generateUploadKey,
  uploadFile,
  s3,
} from "../lib/upload.js";

const supplierOnly = requireRole("supplier");

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

export async function uploadRoutes(app: FastifyInstance): Promise<void> {
  app.post("/api/v1/uploads/image", {
    preHandler: [requireAuth, supplierOnly],
  }, async (req) => {
    if (!s3) {
      throw new AppError(503, "STORAGE_UNCONFIGURED", "File storage is not configured");
    }

    const data = await req.file();
    if (!data) {
      throw new AppError(400, "NO_FILE", "No file uploaded");
    }

    const contentType = data.mimetype;
    if (!isAllowedFileType(contentType)) {
      throw new AppError(
        400,
        "INVALID_FILE_TYPE",
        "Only JPEG, PNG, WebP, and AVIF images are accepted",
      );
    }

    const chunks: Buffer[] = [];
    let totalSize = 0;
    for await (const chunk of data.file) {
      totalSize += chunk.length;
      if (totalSize > MAX_FILE_SIZE) {
        throw new AppError(400, "FILE_TOO_LARGE", "File exceeds 5 MB limit");
      }
      chunks.push(chunk);
    }
    const buffer = Buffer.concat(chunks);
    const key = generateUploadKey(data.filename ?? "upload", contentType);
    const url = await uploadFile(buffer, key, contentType);

    return { url, key, contentType };
  });
}
