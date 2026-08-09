import { getPrisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-admin";
import { NextResponse } from "next/server";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { response } = await requireAdmin();
  if (response) return response;

  const { id: departmentId } = await params;
  const prisma = await getPrisma();
  const { userId, isHead } = await req.json();

  if (!userId) {
    return NextResponse.json({ error: "Vui lòng chọn nhân viên" }, { status: 400 });
  }

  const member = await prisma.departmentMember.upsert({
    where: { departmentId_userId: { departmentId, userId } },
    update: { isHead: Boolean(isHead) },
    create: { departmentId, userId, isHead: Boolean(isHead) },
  });

  return NextResponse.json(member, { status: 201 });
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { response } = await requireAdmin();
  if (response) return response;

  const { id: departmentId } = await params;
  const prisma = await getPrisma();
  const { userId } = await req.json();

  if (!userId) {
    return NextResponse.json({ error: "Vui lòng chọn nhân viên cần xóa" }, { status: 400 });
  }

  await prisma.departmentMember.delete({
    where: { departmentId_userId: { departmentId, userId } },
  });

  return NextResponse.json({ success: true });
}
