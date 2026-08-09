import { randomUUID } from "crypto";

// Cách Cloudflare khuyến nghị chính thức để nhận biết đang chạy trên Workers runtime —
// process.env.NEXT_RUNTIME luôn là "nodejs" ở cả 2 môi trường (OpenNext chạy Next.js theo
// chế độ tương thích Node trên workerd), nên không dùng được để phân biệt.
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


  if (isCloudflareWorkersRuntime()) {
    try {
      const { getCloudflareContext } = await import("@opennextjs/cloudflare");
      const context = await getCloudflareContext({ async: true });
      if (context.env.UPLOADS) {
        await context.env.UPLOADS.put(fileName, buffer, {
          httpMetadata: { contentType: mimeType || "image/jpeg" },
        });
        return `/api/files/${fileName}`;
      }
    } catch {
      // Không chạy trên Cloudflare (hoặc chưa cấu hình R2) → rơi xuống lưu đĩa cục bộ.
    }
  }

  const { mkdir, writeFile } = await import("fs/promises");
  const path = await import("path");
  const uploadDir = path.join(process.cwd(), "public", "uploads");
  await mkdir(uploadDir, { recursive: true });
  await writeFile(path.join(uploadDir, fileName), buffer);

  return `/uploads/${fileName}`;
}
