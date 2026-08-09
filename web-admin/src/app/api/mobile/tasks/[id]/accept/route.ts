import { getPrisma } from "@/lib/prisma";
import { requireMobileAuth } from "@/lib/require-mobile-auth";
import { sendPushToUsersByRoleInArea, sendPushToUsers } from "@/lib/push";
import { NextResponse } from "next/server";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { payload, response } = requireMobileAuth(req);
  if (response) return response;
  const prisma = await getPrisma();
  const { id } = await params;

  if (payload.role !== "MAINTENANCE") {
    return NextResponse.json({ error: "Chỉ nhân viên bảo trì mới được nhận việc" }, { status: 403 });
  }

  const task = await prisma.maintenanceTask.findUnique({ where: { id }, include: { issue: true } });
  if (!task) return NextResponse.json({ error: "Không tìm thấy việc" }, { status: 404 });
  if (task.assigneeId !== payload.userId) {
    return NextResponse.json({ error: "Việc này không được giao cho bạn" }, { status: 403 });
  }
  if (task.status !== "PENDING") {
    return NextResponse.json({ error: "Việc này đã được nhận" }, { status: 409 });
  }

  const activeTask = await prisma.maintenanceTask.findFirst({
    where: { assigneeId: payload.userId, status: "ACCEPTED" },
    include: { issue: true },
  });
  if (activeTask) {
    return NextResponse.json(
      { error: `Bạn đang xử lý PO ${activeTask.issue.poCode} — vui lòng hoàn thành trước khi nhận việc khác` },
      { status: 409 },
    );
  }

  const now = new Date();
  const [updatedTask] = await prisma.$transaction([
    prisma.maintenanceTask.update({
      where: { id },
      data: { status: "ACCEPTED", acceptedAt: now },
    }),
    prisma.qualityIssue.update({ where: { id: task.issueId }, data: { status: "IN_PROGRESS" } }),
  ]);

  // 1. Ghi log Audit Trail
  const { logAuditEvent } = await import("@/lib/audit-logger");
  await logAuditEvent(prisma, {
    issueId: task.issueId,
    userId: payload.userId,
    action: "TASK_ACCEPTED",
    oldStatus: "ASSIGNED",
    newStatus: "IN_PROGRESS",
    note: `KTV ${payload.name} nhận việc lúc ${now.toLocaleTimeString("vi-VN")}`,
  });

  // 2. Dispatch thông báo tới Người báo cáo và Trưởng line
  const { createAndDispatchNotification, dispatchRoleNotificationsInArea } = await import("@/lib/notifications-service");
  await createAndDispatchNotification(prisma, [task.issue.reporterId], {
    title: `Đã nhận việc — PO ${task.issue.poCode}`,
    message: `${payload.name} đã nhận xử lý sự cố bạn báo lúc ${now.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}.`,
    kind: "TASK_ACCEPTED",
    issueId: task.issueId,
    data: { type: "TASK_ACCEPTED", issueId: task.issueId, taskId: id },
  });

  await dispatchRoleNotificationsInArea(
    prisma,
    ["LINE_LEADER"],
    task.issue.areaId,
    {
      title: `Đã nhận việc — PO ${task.issue.poCode}`,
      message: `${payload.name} đã nhận việc lúc ${now.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}.`,
      kind: "TASK_ACCEPTED",
      issueId: task.issueId,
      data: { type: "TASK_ACCEPTED", issueId: task.issueId, taskId: id },
    },
    { excludeUserId: payload.userId },
  );

  return NextResponse.json(updatedTask);
}

