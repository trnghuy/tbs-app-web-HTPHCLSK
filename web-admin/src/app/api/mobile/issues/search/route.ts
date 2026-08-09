import { getPrisma } from "@/lib/prisma";
import { requireMobileAuth } from "@/lib/require-mobile-auth";
import { userPublicSelect } from "@/lib/selects";
import { NextResponse } from "next/server";

// Tra cứu lỗi SP — bất kỳ ai cũng tìm được các phiếu đã báo cáo trước đó theo mã PO/SP (không
// giới hạn khu vực/vai trò), để biết và ngăn ngừa lặp lại lỗi cũ trên cùng 1 mã sản phẩm.
export async function GET(req: Request) {
  const { response } = requireMobileAuth(req);
  if (response) return response;
  const prisma = await getPrisma();

  const url = new URL(req.url);
  const poCode = url.searchParams.get("poCode")?.trim();
  if (!poCode) {
    return NextResponse.json({ error: "Vui lòng nhập mã PO/SP" }, { status: 400 });
  }

  const issues = await prisma.qualityIssue.findMany({
    where: { poCode: { contains: poCode } },
    include: {
      reporter: { select: userPublicSelect },
      area: true,
      team: true,
      productionLine: true,
      failureCategory: true,
    },
    orderBy: { createdAt: "desc" },
    take: 30,
  });

  return NextResponse.json(issues);
}
