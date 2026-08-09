import { getPrisma } from "@/lib/prisma";
import { requireMobileAuth } from "@/lib/require-mobile-auth";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { payload, response } = requireMobileAuth(req);
  if (response) return response;
  const prisma = await getPrisma();

  const body = (await req.json().catch(() => ({}))) as {
    notificationIds?: string[];
    all?: boolean;
  };

  const now = new Date();

  if (body.all) {
    await prisma.notification.updateMany({
      where: { userId: payload.userId, isRead: false },
      data: { isRead: true, readAt: now },
    });
  } else if (body.notificationIds && body.notificationIds.length > 0) {
    await prisma.notification.updateMany({
      where: {
        userId: payload.userId,
        id: { in: body.notificationIds },
      },
      data: { isRead: true, readAt: now },
    });
  }

  return NextResponse.json({ success: true });
}
