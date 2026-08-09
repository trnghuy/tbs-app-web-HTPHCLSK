import { getPrisma } from "@/lib/prisma";

type Prisma = Awaited<ReturnType<typeof getPrisma>>;

export type AuditActionType =
  | "REPORTED"
  | "INVESTIGATION_SUBMITTED"
  | "ROOT_CAUSE_DECIDED"
  | "SOS_SENT"
  | "TASK_ASSIGNED"
  | "TASK_ACCEPTED"
  | "REPAIR_COMPLETED"
  | "REPAIR_CONFIRMED"
  | "ISSUE_CLOSED"
  | "ISSUE_REOPENED";

export interface LogAuditParams {
  issueId: string;
  userId?: string | null;
  action: AuditActionType;
  oldStatus?: string | null;
  newStatus?: string | null;
  note?: string | null;
}

export async function logAuditEvent(prisma: Prisma, params: LogAuditParams) {
  try {
    return await prisma.auditLog.create({
      data: {
        issueId: params.issueId,
        userId: params.userId || null,
        action: params.action as never,
        oldStatus: (params.oldStatus as never) || null,
        newStatus: (params.newStatus as never) || null,
        note: params.note || null,
      },
    });
  } catch (err) {
    console.error("[AUDIT_LOG_ERROR] Could not write audit log", err);
    return null;
  }
}
