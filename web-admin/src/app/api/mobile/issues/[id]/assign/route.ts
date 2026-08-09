import { getPrisma } from "@/lib/prisma";
import { requireMobileAuth } from "@/lib/require-mobile-auth";
import { sendPushToUsers } from "@/lib/push";
import { NextResponse } from "next/server";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { payload, response } = requireMobileAuth(req);
  if (response) return response;
  const prisma = await getPrisma();
  const { id } = await params;

  if (payload.role !== "DEPARTMENT_HEAD") {
    return NextResponse.json({ error: "Chỉ Trưởng phòng ban mới được giao việc" }, { status: 403 });
  }

  const issue = await prisma.qualityIssue.findUnique({ where: { id }, include: { task: true } });
  if (!issue) return NextResponse.json({ error: "Không tìm thấy sự cố" }, { status: 404 });
  if (issue.status !== "ROOT_CAUSE_FOUND") {
    return NextResponse.json({ error: "Sự cố này chưa sẵn sàng để giao việc" }, { status: 409 });
  }
  if (issue.task) {
    return NextResponse.json({ error: "Sự cố này đã được giao việc" }, { status: 409 });
  }

  const { assigneeId } = await req.json();
  if (!assigneeId) return NextResponse.json({ error: "Vui lòng chọn nhân viên bảo trì" }, { status: 400 });

  const me = await prisma.user.findUnique({ where: { id: payload.userId }, select: { areaId: true } });
  const assignee = await prisma.user.findUnique({ where: { id: assigneeId } });
  if (!assignee || assignee.role !== "MAINTENANCE") {
    return NextResponse.json({ error: "Người được chọn không phải nhân viên bảo trì" }, { status: 400 });
  }
  if (!me?.areaId || assignee.areaId !== me.areaId) {
    return NextResponse.json(
      { error: "Chỉ được giao việc cho bảo trì cùng khu vực/xưởng" },
      { status: 400 },
    );
  }

  const [task] = await prisma.$transaction([
    prisma.maintenanceTask.create({
      data: { issueId: id, assignedById: payload.userId, assigneeId, status: "PENDING" },
    }),
    prisma.qualityIssue.update({ where: { id }, data: { status: "ASSIGNED" } }),
  ]);

  // 1. Ghi log Audit Trail
  const { logAuditEvent } = await import("@/lib/audit-logger");
  await logAuditEvent(prisma, {
    issueId: id,
    userId: payload.userId,
    action: "TASK_ASSIGNED",
    oldStatus: "ROOT_CAUSE_FOUND",
    newStatus: "ASSIGNED",
    note: `${payload.name} (Trưởng phòng) giao việc cho KTV ${assignee.name} (${assignee.employeeCode})`,
  });

  // 2. Dispatch thông báo tới Bảo trì
  const { createAndDispatchNotification } = await import("@/lib/notifications-service");
  await createAndDispatchNotification(prisma, [assigneeId], {
    title: "Có việc cần trợ giúp",
    message: `PO ${issue.poCode}: ${issue.description}`,
    kind: "TASK_ASSIGNED",
    issueId: id,
    data: { type: "TASK_ASSIGNED", issueId: id, taskId: task.id },
  });

  return NextResponse.json(task, { status: 201 });
}

