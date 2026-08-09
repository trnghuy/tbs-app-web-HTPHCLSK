import { getPrisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-admin";
import { NextResponse } from "next/server";
import type { CategoryType } from "@/generated/prisma/enums";

const VALID_TYPES: CategoryType[] = ["AREA", "PRODUCTION_LINE", "TEAM"];

export async function GET(req: Request) {
  const { response } = await requireAdmin();
  if (response) return response;
  const prisma = await getPrisma();

  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type") as CategoryType | null;
  if (!type || !VALID_TYPES.includes(type)) {
    return NextResponse.json({ error: "Loại danh mục không hợp lệ" }, { status: 400 });
  }

  const categories = await prisma.category.findMany({
    where: { type },
    include: { parentArea: true, parentLine: true },
    orderBy: { order: "asc" },
  });
  return NextResponse.json(categories);
}

export async function POST(req: Request) {
  const { response } = await requireAdmin();
  if (response) return response;
  const prisma = await getPrisma();

  const body = await req.json();
  const { type, name, colorHex, order, parentAreaId, parentLineId } = body;

  if (!type || !VALID_TYPES.includes(type)) {
    return NextResponse.json({ error: "Loại danh mục không hợp lệ" }, { status: 400 });
  }
  if (!name) {
    return NextResponse.json({ error: "Thiếu tên danh mục" }, { status: 400 });
  }

  // Chuyền bắt buộc gắn với 1 Khu vực/Xưởng. Tổ bắt buộc gắn với cả Khu vực/Xưởng và Chuyền (vì
  // Tổ nằm trong Chuyền, Chuyền nằm trong Khu vực).
  if ((type === "TEAM" || type === "PRODUCTION_LINE") && !parentAreaId) {
    return NextResponse.json({ error: "Vui lòng chọn Khu vực/Xưởng" }, { status: 400 });
  }
  if (type === "TEAM" && !parentLineId) {
    return NextResponse.json({ error: "Vui lòng chọn Chuyền" }, { status: 400 });
  }
  if (parentAreaId) {
    const area = await prisma.category.findUnique({ where: { id: parentAreaId } });
    if (!area || area.type !== "AREA") {
      return NextResponse.json({ error: "Khu vực/Xưởng không hợp lệ" }, { status: 400 });
    }
  }
  if (parentLineId) {
    const line = await prisma.category.findUnique({ where: { id: parentLineId } });
    if (!line || line.type !== "PRODUCTION_LINE") {
      return NextResponse.json({ error: "Chuyền không hợp lệ" }, { status: 400 });
    }
    if (line.parentAreaId !== parentAreaId) {
      return NextResponse.json({ error: "Chuyền đã chọn không thuộc Khu vực/Xưởng đã chọn" }, { status: 400 });
    }
  }

  const existing = await prisma.category.findUnique({ where: { type_name: { type, name } } });
  if (existing) {
    return NextResponse.json({ error: "Tên danh mục đã tồn tại" }, { status: 409 });
  }

  const category = await prisma.category.create({
    data: {
      type,
      name,
      colorHex: colorHex || null,
      order: order ?? 0,
      parentAreaId: type === "AREA" ? null : parentAreaId,
      parentLineId: type === "TEAM" ? parentLineId : null,
    },
    include: { parentArea: true, parentLine: true },
  });

  return NextResponse.json(category, { status: 201 });
}
