import { getPrisma } from "@/lib/prisma";

type Prisma = Awaited<ReturnType<typeof getPrisma>>;

export interface NotificationPayload {
  title: string;
  message: string;
  kind: string; // NEED_INVESTIGATE, FYI_REPORTED, TASK_ASSIGNED, TASK_ACCEPTED, NEED_REPAIR_REVIEW, NEED_VERIFY, ISSUE_RESOLVED, SOS_ALERT
  issueId?: string;
  data?: Record<string, unknown>;
}

// ─── 1. Expo Push Notification Dispatcher ────────────────────────────────
const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";
const EXPO_PUSH_CHUNK_SIZE = 100;

async function sendExpoPush(tokens: string[], title: string, body: string, data?: Record<string, unknown>) {
  const messages = tokens.map((token) => ({
    to: token,
    title,
    body,
    data,
    sound: "default" as const,
  }));

  for (let i = 0; i < messages.length; i += EXPO_PUSH_CHUNK_SIZE) {
    const chunk = messages.slice(i, i + EXPO_PUSH_CHUNK_SIZE);
    try {
      await fetch(EXPO_PUSH_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(chunk),
      });
    } catch {
      // Best-effort push notification
    }
  }
}

// ─── 2. Zalo OA Notification Dispatcher (Zalo Official Account) ─────────
export async function sendZaloOaNotification(phones: string[], title: string, body: string) {
  const zaloOaApiKey = process.env.ZALO_OA_ACCESS_TOKEN;
  if (!zaloOaApiKey) {
    if (process.env.NODE_ENV !== "production") {
      console.log(`[ZALO_OA] Dispatching alert to ${phones.length} recipients: ${title} — ${body}`);
    }
    return;
  }

  for (const rawPhone of phones) {
    if (!rawPhone) continue;
    // Chuẩn hóa số điện thoại sang định dạng quốc tế 84...
    let cleanPhone = rawPhone.replace(/\D/g, "");
    if (cleanPhone.startsWith("0")) {
      cleanPhone = "84" + cleanPhone.slice(1);
    }

    try {
      const res = await fetch("https://business.openapi.zalo.me/message/template", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          access_token: zaloOaApiKey,
        },
        body: JSON.stringify({
          phone: cleanPhone,
          template_id: process.env.ZALO_OA_TEMPLATE_ID || "default",
          template_data: {
            title,
            content: body,
            date: new Date().toLocaleDateString("vi-VN"),
            time: new Date().toLocaleTimeString("vi-VN"),
          },
        }),
      });
      const data = await res.json().catch(() => null);
      console.log(`[ZALO_OA] Dispatch to ${cleanPhone}:`, data || `HTTP ${res.status}`);
    } catch (err) {
      console.error(`[ZALO_OA] Error sending to ${cleanPhone}:`, err);
    }
  }
}


// ─── 3. Email Notification Dispatcher (Placeholder / SMTP Ready) ────────
export async function sendEmailNotification(emails: string[], subject: string, content: string) {
  if (process.env.NODE_ENV !== "production") {
    console.log(`[EMAIL] Dispatching email to ${emails.length} recipients: ${subject}`);
  }
}

// ─── 4. Unified Notification Dispatcher (DB + Push + Zalo + Email) ──────
export async function createAndDispatchNotification(
  prisma: Prisma,
  userIds: string[],
  payload: NotificationPayload,
  excludeUserId?: string,
) {
  const targetUserIds = userIds.filter((id) => id && id !== excludeUserId);
  if (targetUserIds.length === 0) return;

  // 1. Fetch user metadata (push tokens, phones, emails)
  const users = await prisma.user.findMany({
    where: { id: { in: targetUserIds } },
    select: { id: true, phone: true, pushToken: true },
  });

  if (users.length === 0) return;

  // 2. Persist notifications in database
  await prisma.notification.createMany({
    data: users.map((u) => ({
      userId: u.id,
      issueId: payload.issueId || null,
      title: payload.title,
      message: payload.message,
      kind: payload.kind,
      isRead: false,
    })),
  });

  // 3. Multi-channel dispatch
  const pushTokens = users.map((u) => u.pushToken).filter((t): t is string => !!t);
  const phones = users.map((u) => u.phone).filter((p): p is string => !!p);

  await Promise.allSettled([
    pushTokens.length > 0 ? sendExpoPush(pushTokens, payload.title, payload.message, payload.data) : Promise.resolve(),
    phones.length > 0 ? sendZaloOaNotification(phones, payload.title, payload.message) : Promise.resolve(),
  ]);
}

// ─── 5. Dispatch by Roles, Area & Optional Operator FYI ─────────────────
export async function dispatchRoleNotificationsInArea(
  prisma: Prisma,
  roles: string[],
  areaId: string | null,
  payload: NotificationPayload,
  options?: {
    excludeUserId?: string;
    includeOperatorFyi?: boolean;
  },
) {
  const targetRoles = [...roles];
  if (options?.includeOperatorFyi && !targetRoles.includes("OPERATOR")) {
    targetRoles.push("OPERATOR");
  }

  const users = await prisma.user.findMany({
    where: {
      role: { in: targetRoles as never[] },
      ...(areaId ? { areaId } : {}),
    },
    select: { id: true, role: true },
  });

  const mainUserIds = users.filter((u) => u.role !== "OPERATOR").map((u) => u.id);
  const operatorIds = users.filter((u) => u.role === "OPERATOR").map((u) => u.id);

  // Dispatch main action alert to investigators / technicians
  if (mainUserIds.length > 0) {
    await createAndDispatchNotification(prisma, mainUserIds, payload, options?.excludeUserId);
  }

  // Dispatch FYI alert to Operators in the same area
  if (operatorIds.length > 0 && options?.includeOperatorFyi) {
    await createAndDispatchNotification(
      prisma,
      operatorIds,
      {
        ...payload,
        kind: "FYI_REPORTED",
        title: `[FYI] Sự cố mới tại phân xưởng: ${payload.title}`,
      },
      options?.excludeUserId,
    );
  }
}
