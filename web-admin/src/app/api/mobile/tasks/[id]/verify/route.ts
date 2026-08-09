import { getPrisma } from "@/lib/prisma";
import { requireMobileAuth } from "@/lib/require-mobile-auth";
import { sendPushToUsersByRoleInArea, sendPushToUsers } from "@/lib/push";
import { NextResponse } from "next/server";

const VERIFY_MIN_MS = 3 * 60 * 60 * 1000;

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { payload, response } = requireMobileAuth(req);
  if (response) return response;
  const prisma = await getPrisma();
  const { id } = await params;

  if (payload.role !== "LINE_LEADER") {
    return NextResponse.json({ error: "Chỉ Trưởng line mới được xác nhận" }, { status: 403 });
  }

  const task = await prisma.maintenanceTask.findUnique({ where: { id }, include: { issue: true } });
  if (!task) return NextResponse.json({ error: "Không tìm thấy việc" }, { status: 404 });
  if (task.issue.areaId && task.issue.areaId !== (await prisma.user.findUnique({ where: { id: payload.userId }, select: { areaId: true } }))?.areaId) {
    return NextResponse.json({ error: "Việc này không thuộc khu vực của bạn" }, { status: 403 });
  }
  if (task.status !== "DONE" || task.verifiedStatus !== "PENDING") {
    return NextResponse.json({ error: "Việc này không ở trạng thái chờ xác nhận" }, { status: 409 });
  }
  if (!task.monitoringStartedAt) {
    return NextResponse.json(
      { error: "Cần xác nhận sửa chữa đạt yêu cầu trước khi vào giai đoạn theo dõi" },
      { status: 409 },
    );
  }

  const now = Date.now();
  if (now < task.monitoringStartedAt.getTime() + VERIFY_MIN_MS) {
    return NextResponse.json(
      { error: "Chưa đủ 3 giờ theo dõi kể từ khi xác nhận sửa chữa — vui lòng chờ thêm" },
      { status: 409 },
    );
  }

  // confirmed=true → "Đóng vấn đề" (đóng hẳn phiếu). confirmed=false → "Kiểm tra lại" (sự cố
  // còn tái diễn trong lúc theo dõi, quay lại cho 3 role điều tra 5M+1E).
  const { confirmed } = await req.json();
  if (typeof confirmed !== "boolean") {
    return NextResponse.json({ error: "Thiếu giá trị xác nhận" }, { status: 400 });
  }

  if (confirmed) {
    const [updatedTask] = await prisma.$transaction([
      prisma.maintenanceTask.update({
        where: { id },
        data: { verifiedStatus: "CONFIRMED_DONE", verifiedAt: new Date(now), verifiedById: payload.userId },
      }),
      prisma.qualityIssue.update({ where: { id: task.issueId }, data: { status: "DONE" } }),
    ]);

    // 1. Ghi log Audit Trail
    const { logAuditEvent } = await import("@/lib/audit-logger");
    await logAuditEvent(prisma, {
      issueId: task.issueId,
      userId: payload.userId,
      action: "ISSUE_CLOSED",
      oldStatus: "IN_PROGRESS",
      newStatus: "DONE",
      note: `Trưởng line ${payload.name} xác nhận đóng sự cố thành công sau thời gian theo dõi.`,
    });

    // 2. Dispatch thông báo tới Người báo cáo & KTV
    const { createAndDispatchNotification, dispatchRoleNotificationsInArea } = await import("@/lib/notifications-service");
    await createAndDispatchNotification(prisma, [task.issue.reporterId, task.assigneeId], {
      title: `Đã đóng vấn đề — PO ${task.issue.poCode}`,
      message: "Trưởng line đã xác nhận đóng vấn đề sau thời gian theo dõi.",
      kind: "ISSUE_RESOLVED",
      issueId: task.issueId,
      data: { type: "TASK_VERIFIED", issueId: task.issueId, taskId: id },
    });

    // Giám đốc — phạm vi toàn nhà máy, không giới hạn khu vực — nhận thông báo khi 1 sự cố
    // hoàn tất toàn bộ luồng xử lý.
    await dispatchRoleNotificationsInArea(prisma, ["DIRECTOR"], null, {
      title: `Đã hoàn thành — PO ${task.issue.poCode}`,
      message: `Sự cố đã được xử lý xong: ${task.issue.description}`,
      kind: "ISSUE_RESOLVED",
      issueId: task.issueId,
      data: { type: "ISSUE_RESOLVED", issueId: task.issueId },
    });

    return NextResponse.json(updatedTask);
  }

  // Kiểm tra lại — sự cố còn tái diễn trong lúc theo dõi, giữ nguyên phiếu gốc, mở lại 5M+1E cho
  // 3 role điều tra tiếp.
  const [updatedTask] = await prisma.$transaction([
    prisma.maintenanceTask.update({
      where: { id },
      data: { verifiedStatus: "REJECTED", verifiedAt: new Date(now), verifiedById: payload.userId },
    }),
    prisma.qualityIssue.update({
      where: { id: task.issueId },
      data: { status: "INVESTIGATING", investigationLocked: false },
    }),
  ]);

  // 1. Ghi log Audit Trail
  const { logAuditEvent } = await import("@/lib/audit-logger");
  await logAuditEvent(prisma, {
    issueId: task.issueId,
    userId: payload.userId,
    action: "ISSUE_REOPENED",
    oldStatus: "DONE",
    newStatus: "INVESTIGATING",
    note: `Trưởng line ${payload.name} yêu cầu kiểm tra lại do sự cố tái diễn trong lúc theo dõi. Mở lại điều tra 5M+1E.`,
  });

  // 2. Dispatch thông báo mở lại cho QA, Trưởng line, Công nghệ
  const { dispatchRoleNotificationsInArea } = await import("@/lib/notifications-service");
  await dispatchRoleNotificationsInArea(prisma, ["QA", "LINE_LEADER", "TECHNOLOGY"], task.issue.areaId, {
    title: `Cần kiểm tra lại — PO ${task.issue.poCode}`,
    message: "Trưởng line yêu cầu kiểm tra lại — cần điều tra lại 5M+1E.",
    kind: "NEED_INVESTIGATE",
    issueId: task.issueId,
    data: { type: "REOPENED", issueId: task.issueId, taskId: id },
  });

  return NextResponse.json(updatedTask);
}

