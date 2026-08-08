import { getPrisma } from "@/lib/prisma";
import { requireMobileAuth } from "@/lib/require-mobile-auth";
import { sendPushToUsersByRoleInArea } from "@/lib/push";
import { NextResponse } from "next/server";

const INVESTIGATOR_ROLES = ["QA", "LINE_LEADER", "TECHNOLOGY"];

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { payload, response } = requireMobileAuth(req);
  if (response) return response;
  const prisma = await getPrisma();
  const { id } = await params;

  if (!INVESTIGATOR_ROLES.includes(payload.role)) {
    return NextResponse.json(
      { error: "Chỉ QA/Trưởng line/Công nghệ mới được nộp 5M+1E" },
      { status: 403 },
    );
  }

  const issue = await prisma.qualityIssue.findUnique({ where: { id } });
  if (!issue) return NextResponse.json({ error: "Không tìm thấy sự cố" }, { status: 404 });
  if (!["REPORTED", "INVESTIGATING"].includes(issue.status)) {
    return NextResponse.json({ error: "Sự cố này không còn ở giai đoạn điều tra" }, { status: 409 });
  }

  // Nếu đã khoá hạn (hết 15 phút, đã có cron xử lý) thì chỉ cho phép nộp lại khi phiếu đã được
  // mở lại (investigationLocked=false, xảy ra khi Trưởng line bấm "Chưa hoàn thành").
  if (issue.investigationLocked) {
    return NextResponse.json(
      { error: "Đã hết hạn 15 phút điều tra — vui lòng liên hệ Trưởng phòng ban" },
      { status: 409 },
    );
  }

  const { poCode, images, man, machine, material, method, measurement, environment, rootCause } =
    await req.json();
  if (!poCode || !man || !machine || !material || !method || !measurement || !environment || !rootCause) {
    return NextResponse.json(
      { error: "Vui lòng điền đủ 6 mục 5M+1E, nguyên nhân gốc và mã PO" },
      { status: 400 },
    );
  }

  const submission = await prisma.fiveMOneESubmission.upsert({
    where: { issueId_submitterId: { issueId: id, submitterId: payload.userId } },
    update: {
      poCode,
      images: images ? JSON.stringify(images) : null,
      man,
      machine,
      material,
      method,
      measurement,
      environment,
      rootCause,
    },
    create: {
      issueId: id,
      submitterId: payload.userId,
      submitterRole: payload.role as never,
      poCode,
      images: images ? JSON.stringify(images) : null,
      man,
      machine,
      material,
      method,
      measurement,
      environment,
      rootCause,
    },
  });

  if (issue.status === "REPORTED") {
    await prisma.qualityIssue.update({ where: { id }, data: { status: "INVESTIGATING" } });
  }

  // Đủ cả 3 bản 5M+1E (QA + Trưởng line + Công nghệ) — báo cho Trưởng line vào tổng hợp nguyên
  // nhân + giải pháp.
  const submissionCount = await prisma.fiveMOneESubmission.count({ where: { issueId: id } });
  if (submissionCount >= 3) {
    await sendPushToUsersByRoleInArea(prisma, ["LINE_LEADER"], issue.areaId, {
      title: `Đủ 3 bản 5M+1E — PO ${issue.poCode}`,
      body: "Vào tổng hợp nguyên nhân gốc và giải pháp.",
      data: { type: "NEED_ROOT_CAUSE", issueId: id },
    });
  }

  return NextResponse.json(submission, { status: 201 });
}
