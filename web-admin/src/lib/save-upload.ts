import { randomUUID } from "crypto";

function isCloudflareWorkersRuntime() {
  return typeof navigator !== "undefined" && navigator.userAgent === "Cloudflare-Workers";
}

export async function saveBase64Image(base64: string, mimeType: string | undefined) {
  const ext = mimeType === "image/png" ? "png" : "jpg";
  const fileName = `${randomUUID()}.${ext}`;
  const buffer = Buffer.from(base64, "base64");

  const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5MB
  if (buffer.byteLength > MAX_SIZE_BYTES) {
    throw new Error("Kích thước ảnh vượt quá giới hạn cho phép (tối đa 5MB)");
  }

  // Cloudflare Workers: thử R2 trước, fallback D1
  if (isCloudflareWorkersRuntime()) {
    try {
      const { getCloudflareContext } = await import("@opennextjs/cloudflare");
      const context = await getCloudflareContext({ async: true });

      // 1. Ưu tiên R2 nếu được cấu hình
      if (context.env.UPLOADS) {
        await context.env.UPLOADS.put(fileName, buffer, {
          httpMetadata: { contentType: mimeType || "image/jpeg" },
        });
        return `/api/files/${fileName}`;
      }

      // 2. Fallback: lưu vào D1 (không cần R2)
      if (context.env.DB) {
        const stmt = context.env.DB.prepare(
          "INSERT OR REPLACE INTO file_uploads (key, data, mimeType, size) VALUES (?, ?, ?, ?)"
        );
        await stmt.bind(fileName, base64, mimeType || "image/jpeg", buffer.byteLength).run();
        return `/api/files/${fileName}`;
      }
    } catch {
      // Cả R2 lẫn D1 đều không dùng được → fallback xuống lưu local
    }
  }

  // Local dev: lưu vào public/uploads
  const { mkdir, writeFile } = await import("fs/promises");
  const path = await import("path");
  const uploadDir = path.join(process.cwd(), "public", "uploads");
  await mkdir(uploadDir, { recursive: true });
  await writeFile(path.join(uploadDir, fileName), buffer);

  return `/uploads/${fileName}`;
}
