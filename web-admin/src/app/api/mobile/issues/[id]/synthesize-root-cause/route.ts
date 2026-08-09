import { getPrisma } from "@/lib/prisma";
import { requireMobileAuth } from "@/lib/require-mobile-auth";
import { NextResponse } from "next/server";

const GROQ_MODEL = "llama-3.3-70b-versatile";

const submitterRoleLabel: Record<string, string> = {
  QA: "QA",
  LINE_LEADER: "Trưởng line",
  TECHNOLOGY: "Công nghệ",
};

// Trưởng line bấm "AI tổng hợp gợi ý" — gộp 3 nguyên nhân gốc (từ QA/Trưởng line/Công nghệ) +
// toàn bộ 5M+1E thành 1 kết luận chung, kèm đề xuất giải pháp, để Trưởng line xem lại/chỉnh sửa
// trước khi chốt chính thức (không tự động ghi vào phiếu).
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { payload, response } = requireMobileAuth(req);
  if (response) return response;
  const { id } = await params;
  const prisma = await getPrisma();

  if (payload.role !== "LINE_LEADER") {
    return NextResponse.json({ error: "Chỉ Trưởng line mới được dùng chức năng này" }, { status: 403 });
  }

  const issue = await prisma.qualityIssue.findUnique({
    where: { id },
    include: {
      failureCategory: true,
      submissions: { include: { submitter: true }, orderBy: { submittedAt: "asc" } },
    },
  });
  if (!issue) return NextResponse.json({ error: "Không tìm thấy sự cố" }, { status: 404 });
  if (issue.submissions.length === 0) {
    return NextResponse.json({ error: "Chưa có bản 5M+1E nào để tổng hợp" }, { status: 409 });
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Chưa cấu hình GROQ_API_KEY trên server. Vui lòng liên hệ Admin." },
      { status: 503 },
    );
  }

  const submissionsText = issue.submissions
    .map((s, i) => {
      const roleLabel = submitterRoleLabel[s.submitterRole] ?? s.submitterRole;
      return `--- Bản ${i + 1} (${roleLabel} — ${s.submitter.name}) ---
Nguyên nhân gốc theo người này: ${s.rootCause || "(chưa có)"}
Man: ${s.man}
Machine: ${s.machine}
Material: ${s.material}
Method: ${s.method}
Measurement: ${s.measurement}
Environment: ${s.environment}`;
    })
    .join("\n\n");

  const prompt = `Bạn là chuyên gia phân tích chất lượng trong nhà máy sản xuất. Dưới đây là ${issue.submissions.length}
bản điều tra 5M+1E độc lập (mỗi bản từ 1 vai trò khác nhau: QA, Trưởng line, Công nghệ) cho cùng
1 sự cố:

Vấn đề: "${issue.description}"${issue.failureCategory ? ` (danh mục lỗi: ${issue.failureCategory.name})` : ""}

${submissionsText}

Nhiệm vụ của bạn:
1. Đọc kỹ ${issue.submissions.length} bản trên, tổng hợp thành 1 NGUYÊN NHÂN GỐC RỄ chung, thống
   nhất, đầy đủ, phản ánh đúng các góc nhìn (nếu có mâu thuẫn giữa các bản, hãy chỉ ra và chọn
   nguyên nhân hợp lý nhất hoặc kết hợp cả hai).
2. Đề xuất 1 GIẢI PHÁP xử lý cụ thể, khả thi, ngắn gọn (2-4 câu) để khắc phục triệt để nguyên nhân
   gốc đó, không chỉ xử lý phần ngọn.
3. Đánh giá xem nguyên nhân/giải pháp này có VƯỢT NGOÀI KHẢ NĂNG xử lý ở cấp xưởng/line hay không —
   ví dụ: cần duyệt ngân sách lớn, cần đầu tư/mua sắm thiết bị mới, cần quyết định cấp quản lý cao
   hơn, hoặc nguyên nhân thực chất KHÔNG thuộc phạm vi 5M+1E (không phải do con người/máy móc/
   nguyên liệu/phương pháp/đo lường/môi trường tại xưởng, mà là vấn đề tài chính/chính sách/tổ
   chức). Nếu đúng như vậy, đặt "outOfScope": true và giải thích ngắn gọn lý do trong "sosReason".
   Nếu vấn đề vẫn xử lý được trong phạm vi thông thường, đặt "outOfScope": false và "sosReason": "".

Trả lời CHỈ bằng JSON hợp lệ, không kèm markdown, không thêm chữ nào khác:
{"rootCause":"<nguyên nhân gốc rễ tổng hợp>","solution":"<giải pháp đề xuất>","outOfScope":<true|false>,"sosReason":"<lý do nếu vượt ngoài khả năng, hoặc chuỗi rỗng>"}`;

  let groqRes: Response;
  try {
    groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        temperature: 0.4,
      }),
    });
  } catch {
    return NextResponse.json({ error: "Không thể kết nối tới dịch vụ AI, thử lại sau" }, { status: 502 });
  }

  if (!groqRes.ok) {
    const errText = await groqRes.text().catch(() => "");
    return NextResponse.json({ error: `Lỗi gọi AI: ${errText.slice(0, 300)}` }, { status: 502 });
  }

  const data = (await groqRes.json()) as { choices?: { message?: { content?: string } }[] };
  const text = data.choices?.[0]?.message?.content;
  if (!text) {
    return NextResponse.json({ error: "AI không phản hồi được, thử lại" }, { status: 502 });
  }

  let parsed: { rootCause: string; solution: string; outOfScope?: boolean; sosReason?: string };
  try {
    parsed = JSON.parse(text);
  } catch {
    return NextResponse.json({ error: "AI trả lời sai định dạng, thử lại" }, { status: 502 });
  }

  return NextResponse.json({
    rootCause: parsed.rootCause,
    solution: parsed.solution,
    outOfScope: !!parsed.outOfScope,
    sosReason: parsed.sosReason || "",
  });
}
