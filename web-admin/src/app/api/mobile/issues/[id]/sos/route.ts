import { getPrisma } from "@/lib/prisma";
import { requireMobileAuth } from "@/lib/require-mobile-auth";
import { sendPushToUsersByRoleInArea } from "@/lib/push";
import { NextResponse } from "next/server";

// Trưởng line bấm nút SOS khi AI tổng hợp đánh giá sự cố vượt ngoài khả năng xử lý ở cấp
// xưởng/line (liên quan ngân sách, quyết định cấp quản lý, hoặc nằm ngoài phạm vi 5M+1E) — báo
// thẳng cho Giám đốc, không qua các bước phân việc bảo trì thông thường.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { payload, response } = requireMobileAuth(req);
  if (response) return response;
  const { id } = await params;
  const prisma = await getPrisma();

  if (payload.role !== "LINE_LEADER") {
    return NextResponse.json({ error: "Chỉ Trưởng line mới được gửi SOS" }, { status: 403 });
  }

  const issue = await prisma.qualityIssue.findUnique({ where: { id } });
  if (!issue) return NextResponse.json({ error: "Không tìm thấy sự cố" }, { status: 404 });

  const { reason } = (await req.json()) as { reason?: string };

  await sendPushToUsersByRoleInArea(prisma, ["DIRECTOR"], null, {
    title: `🆘 SOS — PO ${issue.poCode}`,
    body: reason?.trim() || `Trưởng line ${payload.name} cần hỗ trợ cho sự cố vượt ngoài khả năng xử lý.`,
    data: { type: "SOS", issueId: id },
  });

  return NextResponse.json({ ok: true });
}
