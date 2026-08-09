import { getPrisma } from "@/lib/prisma";
import { requireMobileAuth } from "@/lib/require-mobile-auth";
import { sendPushToUsersByRoleInArea } from "@/lib/push";
import { NextResponse } from "next/server";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { payload, response } = requireMobileAuth(req);
  if (response) return response;
  const prisma = await getPrisma();
  const { id } = await params;

  if (payload.role !== "LINE_LEADER") {
    return NextResponse.json({ error: "Chỉ Trưởng line mới được chốt nguyên nhân gốc" }, { status: 403 });
  }

  const issue = await prisma.qualityIssue.findUnique({ where: { id } });
  if (!issue) return NextResponse.json({ error: "Không tìm thấy sự cố" }, { status: 404 });
  if (issue.status !== "INVESTIGATING") {
    return NextResponse.json({ error: "Sự cố này chưa sẵn sàng để chốt nguyên nhân" }, { status: 409 });
  }

  const { rootCause, solution } = await req.json();
  if (!rootCause) {
    return NextResponse.json({ error: "Vui lòng nhập nguyên nhân gốc" }, { status: 400 });
  }

  const updated = await prisma.qualityIssue.update({
    where: { id },
    data: {
      rootCause,
      solution: solution || null,
      rootCauseDecidedById: payload.userId,
      rootCauseDecidedAt: new Date(),
      status: "ROOT_CAUSE_FOUND",
    },
  });

  // 1. Ghi log Audit Trail
  const { logAuditEvent } = await import("@/lib/audit-logger");
  await logAuditEvent(prisma, {
    issueId: id,
    userId: payload.userId,
    action: "ROOT_CAUSE_DECIDED",
    oldStatus: issue.status,
    newStatus: "ROOT_CAUSE_FOUND",
    note: `${payload.name} chốt nguyên nhân gốc: ${rootCause}.${solution ? ` Đề xuất giải pháp: ${solution}` : ""}`,
  });

  // 2. Thông báo cho Trưởng phòng ban cùng khu vực
  const { dispatchRoleNotificationsInArea } = await import("@/lib/notifications-service");
  await dispatchRoleNotificationsInArea(prisma, ["DEPARTMENT_HEAD"], issue.areaId, {
    title: `Đã có nguyên nhân gốc — PO ${issue.poCode}`,
    message: rootCause,
    kind: "NEED_ASSIGN",
    issueId: id,
    data: { type: "NEED_ASSIGN", issueId: id },
  });

  return NextResponse.json(updated);
}

