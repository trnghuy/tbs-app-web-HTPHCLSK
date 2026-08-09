import { getPrisma } from "@/lib/prisma";
import { requireMobileAuth } from "@/lib/require-mobile-auth";
import { userPublicSelect } from "@/lib/selects";
import { NextResponse } from "next/server";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { response } = requireMobileAuth(req);
  if (response) return response;
  const { id } = await params;
  const prisma = await getPrisma();

  const logs = await prisma.auditLog.findMany({
    where: { issueId: id },
    include: {
      user: { select: userPublicSelect },
    },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(logs);
}
