import { getPrisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-admin";
import { NextResponse } from "next/server";

export async function GET() {
  const { response } = await requireAdmin();
  if (response) return response;

  const prisma = await getPrisma();
  const factories = await prisma.factory.findMany({
    include: {
      _count: {
        select: {
          areas: true,
          departments: true,
          users: true,
          issues: true,
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(factories);
}

export async function POST(req: Request) {
  const { response } = await requireAdmin();
  if (response) return response;

  const prisma = await getPrisma();
  const { code, name, address } = await req.json();

  if (!code || !name) {
    return NextResponse.json({ error: "Mã nhà máy và tên nhà máy là bắt buộc" }, { status: 400 });
  }

  const existing = await prisma.factory.findUnique({ where: { code } });
  if (existing) {
    return NextResponse.json({ error: "Mã nhà máy này đã tồn tại" }, { status: 409 });
  }

  const factory = await prisma.factory.create({
    data: {
      code: code.trim().toUpperCase(),
      name: name.trim(),
      address: address?.trim() || null,
    },
  });

  return NextResponse.json(factory, { status: 201 });
}
