import { getPrisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-admin";
import { userPublicSelect } from "@/lib/selects";
import { NextResponse } from "next/server";

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { response } = await requireAdmin();
  if (response) return response;

  const { id } = await params;
  const prisma = await getPrisma();
  const { code, name } = await req.json();

  if (!code || !name) {
    return NextResponse.json({ error: "Mã phòng ban và tên phòng ban là bắt buộc" }, { status: 400 });
  }

  const department = await prisma.department.update({
    where: { id },
    data: {
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

  return NextResponse.json(department);
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { response } = await requireAdmin();
  if (response) return response;

  const { id } = await params;
  const prisma = await getPrisma();

  await prisma.department.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
