import { getPrisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-admin";
import { NextResponse } from "next/server";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { response } = await requireAdmin();
  if (response) return response;
  const prisma = await getPrisma();
  const { id } = await params;

  const body = await req.json();
  const current = await prisma.category.findUnique({ where: { id } });
  if (!current) {
    return NextResponse.json({ error: "Không tìm thấy danh mục" }, { status: 404 });
  }

  const { name, colorHex, order, parentAreaId, parentLineId } = body;

  if (name && name !== current.name) {
    const existing = await prisma.category.findUnique({
      where: { type_name: { type: current.type, name } },
    });
    if (existing) {
      return NextResponse.json({ error: "Tên danh mục đã tồn tại" }, { status: 409 });
    }
  }

  let nextParentAreaId: string | null = current.parentAreaId;
  let nextParentLineId: string | null = current.parentLineId;

  if (current.type === "TEAM" || current.type === "PRODUCTION_LINE") {
    nextParentAreaId = parentAreaId !== undefined ? parentAreaId : current.parentAreaId;
    if (!nextParentAreaId) {
      return NextResponse.json({ error: "Vui lòng chọn Khu vực/Xưởng" }, { status: 400 });
    }
    const area = await prisma.category.findUnique({ where: { id: nextParentAreaId } });
    if (!area || area.type !== "AREA") {
      return NextResponse.json({ error: "Khu vực/Xưởng không hợp lệ" }, { status: 400 });
    }
  }

  if (current.type === "TEAM") {
    nextParentLineId = parentLineId !== undefined ? parentLineId : current.parentLineId;
    if (!nextParentLineId) {
      return NextResponse.json({ error: "Vui lòng chọn Chuyền" }, { status: 400 });
    }
    const line = await prisma.category.findUnique({ where: { id: nextParentLineId } });
    if (!line || line.type !== "PRODUCTION_LINE") {
      return NextResponse.json({ error: "Chuyền không hợp lệ" }, { status: 400 });
    }
    if (line.parentAreaId !== nextParentAreaId) {
      return NextResponse.json({ error: "Chuyền đã chọn không thuộc Khu vực/Xưởng đã chọn" }, { status: 400 });
    }
  }

  const category = await prisma.category.update({
    where: { id },
    data: {
      name,
      colorHex: colorHex ?? undefined,
      order,
      parentAreaId: current.type === "AREA" ? undefined : nextParentAreaId,
      parentLineId: current.type === "TEAM" ? nextParentLineId : undefined,
    },
    include: { parentArea: true, parentLine: true },
  });

  return NextResponse.json(category);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { response } = await requireAdmin();
  if (response) return response;
  const prisma = await getPrisma();
  const { id } = await params;

  const current = await prisma.category.findUnique({ where: { id } });
  if (!current) {
    return NextResponse.json({ error: "Không tìm thấy danh mục" }, { status: 404 });
  }

  try {
    await prisma.category.delete({ where: { id } });
  } catch {
    return NextResponse.json(
      { error: "Không thể xoá — danh mục này đang được sử dụng" },
      { status: 409 },
    );
  }

  return NextResponse.json({ ok: true });
}
