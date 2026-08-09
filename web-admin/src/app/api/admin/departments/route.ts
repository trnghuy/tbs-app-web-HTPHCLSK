import { getPrisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-admin";
import { userPublicSelect } from "@/lib/selects";
import { NextResponse } from "next/server";

export async function GET() {
  const { response } = await requireAdmin();
  if (response) return response;

  const prisma = await getPrisma();
  const departments = await prisma.department.findMany({
    include: {
      factory: true,
      members: {
        include: {
          user: { select: userPublicSelect },
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(departments);
}

export async function POST(req: Request) {
  const { response } = await requireAdmin();
  if (response) return response;

  const prisma = await getPrisma();
  const { factoryId, code, name } = await req.json();

  if (!factoryId || !code || !name) {
    return NextResponse.json({ error: "Nhà máy, mã phòng ban và tên phòng ban là bắt buộc" }, { status: 400 });
  }

  const existing = await prisma.department.findUnique({
    where: { factoryId_code: { factoryId, code } },
  });
  if (existing) {
    return NextResponse.json({ error: "Mã phòng ban này đã tồn tại trong nhà máy" }, { status: 409 });
  }

  const department = await prisma.department.create({
    data: {
      factoryId,
      code: code.trim().toUpperCase(),
      name: name.trim(),
    },
    include: {
      factory: true,
      members: {
        include: {
          user: { select: userPublicSelect },
        },
      },
    },
  });

  return NextResponse.json(department, { status: 201 });
}
