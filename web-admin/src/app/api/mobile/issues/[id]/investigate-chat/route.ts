import { getPrisma } from "@/lib/prisma";
import { requireMobileAuth } from "@/lib/require-mobile-auth";
import { NextResponse } from "next/server";

const INVESTIGATOR_ROLES = ["QA", "LINE_LEADER", "TECHNOLOGY"];
const GROQ_MODEL = "llama-3.3-70b-versatile";
const MAX_QUESTIONS = 5;

type ChatTurn = { role: "user" | "model"; text: string };

type Conclusion = {
  type: "conclusion";
  rootCause: string;
  man: string;
  machine: string;
  material: string;
  method: string;
  measurement: string;
  environment: string;
};
type Question = { type: "question"; text: string };

function buildSystemInstruction(description: string, failureCategory: string | null) {
  return `Bạn là chuyên gia phân tích nguyên nhân gốc rễ (root cause analysis) theo phương pháp
"5 Whys", hỗ trợ điều tra sự cố chất lượng trong nhà máy sản xuất.

Vấn đề đang điều tra: "${description}"${failureCategory ? ` (danh mục lỗi: ${failureCategory})` : ""}.

Nhiệm vụ của bạn:
- Mỗi lượt, hỏi ĐÚNG 1 câu hỏi duy nhất, ngắn gọn, rõ ràng, bằng tiếng Việt, đào sâu kiểu "Tại sao"
  dựa trên câu trả lời gần nhất của người dùng, để lần theo chuỗi nhân quả tới nguyên nhân gốc rễ
  thực sự — không dừng lại ở nguyên nhân bề mặt.
- BẮT BUỘC phải hỏi đủ ĐÚNG ${MAX_QUESTIONS} câu hỏi (5 lượt "Tại sao" liên tiếp, mỗi câu đào sâu
  hơn câu trước) trước khi được phép chốt nguyên nhân gốc — KHÔNG được chốt sớm hơn dù cảm thấy đã
  đủ rõ. Chỉ trả lời dạng "conclusion" sau khi đã hỏi đủ ${MAX_QUESTIONS} câu và người dùng đã trả
  lời đủ ${MAX_QUESTIONS} lần.
- Khi đã chốt được nguyên nhân gốc rễ, hãy tổng hợp lại toàn bộ cuộc hội thoại và điền vào đúng
  mô hình 5M+1E (Man - con người, Machine - máy móc, Material - nguyên liệu, Method - phương pháp,
  Measurement - đo lường, Environment - môi trường): với mục nào liên quan trực tiếp tới nguyên nhân
  gốc thì viết rõ kết luận; với mục không liên quan thì ghi ngắn gọn "Không phải nguyên nhân chính"
  — KHÔNG được để trống bất kỳ mục nào trong 6 mục.

Luôn trả lời CHỈ bằng JSON hợp lệ theo đúng 1 trong 2 dạng sau, không kèm markdown, không thêm chữ nào khác:
- Còn cần hỏi thêm: {"type":"question","text":"<câu hỏi tiếp theo>"}
- Đã chốt nguyên nhân gốc: {"type":"conclusion","rootCause":"<mô tả đầy đủ nguyên nhân gốc rễ>","man":"...","machine":"...","material":"...","method":"...","measurement":"...","environment":"..."}`;
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { payload, response } = requireMobileAuth(req);
  if (response) return response;
  const { id } = await params;
  const prisma = await getPrisma();

  if (!INVESTIGATOR_ROLES.includes(payload.role)) {
    return NextResponse.json(
      { error: "Chỉ QA/Trưởng line/Công nghệ mới được điều tra" },
      { status: 403 },
    );
  }

  const issue = await prisma.qualityIssue.findUnique({
    where: { id },
    include: { failureCategory: true },
  });
  if (!issue) return NextResponse.json({ error: "Không tìm thấy sự cố" }, { status: 404 });

  const apiKey = process.env.GROQ_API_KEY;
  const { history } = (await req.json()) as { history?: ChatTurn[] };
  const turns = (history ?? []).length > 0 ? history! : [{ role: "user" as const, text: "Bắt đầu điều tra nguyên nhân." }];
  const questionsAskedSoFar = turns.filter((t) => t.role === "model").length;

  if (!apiKey) {
    // Smart local fallback for dev/offline testing when no remote Groq key is provided
    const SMART_QUESTIONS = [
      "Tại sao hiện tượng này lại xảy ra trong ca làm việc vừa qua?",
      "Nguyên nhân nào dẫn đến tình trạng thiết bị / thao tác bị sai lệch như trên?",
      "Tại sao quy trình kiểm tra định kỳ trước đó chưa phát hiện được điểm bất thường này?",
      "Yếu tố kỹ thuật hoặc con người nào là mắt xích chính gây ra sự cố?",
      "Tại sao chưa có cơ chế kiểm soát ngăn ngừa (Poka-yoke) cho công đoạn này?",
    ];

    if (questionsAskedSoFar < MAX_QUESTIONS) {
      return NextResponse.json({
        type: "question",
        text: SMART_QUESTIONS[questionsAskedSoFar] || "Tại sao vấn đề trên lại phát sinh ở công đoạn này?",
      });
    } else {
      const lastUserAnswer = turns.filter((t) => t.role === "user").pop()?.text || "";
      return NextResponse.json({
        type: "conclusion",
        rootCause: `Do ${lastUserAnswer.toLowerCase() || "sai lệch thông số kỹ thuật và hao mòn linh kiện trong quá trình vận hành liên tục"}.`,
        man: "Thao tác chưa đồng đều, cần tái đào tạo quy chuẩn thao tác",
        machine: "Độ rơ cơ khí và hao mòn chi tiết máy sau thời gian vận hành",
        material: "Vật tư đầu vào đạt chuẩn, không phải nguyên nhân chính",
        method: "Chưa cập nhật checklist kiểm tra nhanh đầu ca",
        measurement: "Dụng cụ đo kiểm cần được hiệu chuẩn lại định kỳ",
        environment: "Nhiệt độ và độ ẩm xưởng bình thường, không ảnh hưởng",
      });
    }
  }


  const baseMessages = [
    { role: "system", content: buildSystemInstruction(issue.description, issue.failureCategory?.name ?? null) },
    ...turns.map((h) => ({ role: h.role === "model" ? "assistant" : "user", content: h.text })),
  ];

  async function callGroq(messages: typeof baseMessages) {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages,
        response_format: { type: "json_object" },
        temperature: 0.4,
      }),
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      throw new Error(`Lỗi gọi AI: ${errText.slice(0, 300)}`);
    }
    const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const text = data.choices?.[0]?.message?.content;
    if (!text) throw new Error("AI không phản hồi được, thử lại");
    return JSON.parse(text) as Question | Conclusion;
  }

  // Câu hỏi dự phòng dùng khi AI vẫn cố chốt sớm dù đã nhắc — đảm bảo CHẮC CHẮN đủ MAX_QUESTIONS
  // câu, không phụ thuộc việc AI có tuân thủ prompt hay không.
  const FALLBACK_QUESTIONS = [
    "Bạn có thể giải thích rõ hơn nguyên nhân sâu xa hơn dẫn đến điều vừa nêu không?",
    "Vì sao tình trạng đó lại xảy ra — có yếu tố nào phía sau chưa được nhắc tới không?",
    "Nếu truy tiếp một bước nữa, điều gì là nguyên nhân gốc dẫn đến việc đó?",
  ];

  let parsed: Question | Conclusion;
  try {
    parsed = await callGroq(baseMessages);

    // Bảo hiểm: nếu AI chốt sớm khi chưa hỏi đủ MAX_QUESTIONS câu, ép hỏi tiếp — thử nhắc AI 1
    // lần, nếu AI vẫn không tuân thủ thì dùng câu hỏi dự phòng để đảm bảo đủ số lượng.
    if (parsed.type === "conclusion" && questionsAskedSoFar < MAX_QUESTIONS) {
      try {
        const retried = await callGroq([
          ...baseMessages,
          {
            role: "system",
            content: `Bạn mới chỉ hỏi ${questionsAskedSoFar}/${MAX_QUESTIONS} câu — CHƯA đủ. Hãy tiếp tục hỏi thêm 1 câu "Tại sao" đào sâu hơn dựa trên câu trả lời gần nhất, KHÔNG được chốt nguyên nhân lúc này. Trả lời đúng dạng {"type":"question","text":"..."}.`,
          },
        ]);
        parsed = retried.type === "question" ? retried : {
          type: "question",
          text: FALLBACK_QUESTIONS[questionsAskedSoFar % FALLBACK_QUESTIONS.length],
        };
      } catch {
        parsed = {
          type: "question",
          text: FALLBACK_QUESTIONS[questionsAskedSoFar % FALLBACK_QUESTIONS.length],
        };
      }
    }
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Không thể kết nối tới dịch vụ AI, thử lại sau" },
      { status: 502 },
    );
  }

  return NextResponse.json(parsed);
}
