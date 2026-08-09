import { getPrisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-admin";
import { NextResponse } from "next/server";

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { response } = await requireAdmin();
  if (response) return response;

  const { id } = await params;
  const prisma = await getPrisma();
  const { code, name, address } = await req.json();

  if (!code || !name) {
    return NextResponse.json({ error: "Mã nhà máy và tên nhà máy là bắt buộc" }, { status: 400 });
  }

  const factory = await prisma.factory.update({
    where: { id },
    data: {
      code: code.trim().toUpperCase(),
      name: name.trim(),
      address: address?.trim() || null,
    },
  });

  return NextResponse.json(factory);
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { response } = await requireAdmin();
  if (response) return response;

  const { id } = await params;
  const prisma = await getPrisma();

  await prisma.factory.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
