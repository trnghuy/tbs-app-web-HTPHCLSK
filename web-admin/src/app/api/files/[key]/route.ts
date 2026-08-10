import { NextResponse } from "next/server";

export async function GET(_req: Request, { params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;

  try {
    const { getCloudflareContext } = await import("@opennextjs/cloudflare");
    const context = await getCloudflareContext({ async: true });

    // 1. Thử R2 trước
    if (context.env.UPLOADS) {
      const object = await context.env.UPLOADS.get(key);
      if (object) {
        return new NextResponse(object.body as unknown as BodyInit, {
          headers: {
            "Content-Type": object.httpMetadata?.contentType || "application/octet-stream",
            "Cache-Control": "public, max-age=31536000, immutable",
          },
        });
      }
    }

    // 2. Fallback: đọc từ D1
    if (context.env.DB) {
      const stmt = context.env.DB.prepare("SELECT data, mimeType FROM file_uploads WHERE key = ?");
      const result = await stmt.bind(key).first<{ data: string; mimeType: string }>();
      if (result?.data) {
        const buffer = Buffer.from(result.data, "base64");
        return new NextResponse(buffer, {
          headers: {
            "Content-Type": result.mimeType || "image/jpeg",
            "Cache-Control": "public, max-age=31536000, immutable",
          },
        });
      }
    }

    return NextResponse.json({ error: "Không tìm thấy ảnh" }, { status: 404 });
  } catch {
    return NextResponse.json({ error: "Không tìm thấy ảnh" }, { status: 404 });
  }
}
