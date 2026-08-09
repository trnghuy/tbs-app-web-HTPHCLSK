import { getPrisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-admin";
import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";

export interface ParsedEmployee {
  employeeCode: string;
  name: string;
  phone?: string | null;
  role:
    | "OPERATOR"
    | "QA"
    | "LINE_LEADER"
    | "TECHNOLOGY"
    | "DEPARTMENT_HEAD"
    | "MAINTENANCE"
    | "DIRECTOR"
    | "ADMIN";
  areaName?: string | null;
  departmentName?: string | null;
  departmentCode?: string | null;
  factoryCode?: string | null;
  factoryName?: string | null;
  status?: "NEW" | "UPDATE";
}

const ROLE_MAPPING: Record<string, ParsedEmployee["role"]> = {
  "van hanh": "OPERATOR",
  "vận hành": "OPERATOR",
  "cong nhan": "OPERATOR",
  "công nhân": "OPERATOR",
  "operator": "OPERATOR",
  "nv": "OPERATOR",
  "qa": "QA",
  "qc": "QA",
  "kiem soat": "QA",
  "kiểm tra": "QA",
  "truong line": "LINE_LEADER",
  "trưởng line": "LINE_LEADER",
  "to truong": "LINE_LEADER",
  "tổ trưởng": "LINE_LEADER",
  "line leader": "LINE_LEADER",
  "line_leader": "LINE_LEADER",
  "cong nghe": "TECHNOLOGY",
  "công nghệ": "TECHNOLOGY",
  "ky thuat": "TECHNOLOGY",
  "kỹ thuật": "TECHNOLOGY",
  "technology": "TECHNOLOGY",
  "truong phong": "DEPARTMENT_HEAD",
  "trưởng phòng": "DEPARTMENT_HEAD",
  "truong bo phan": "DEPARTMENT_HEAD",
  "trưởng bộ phận": "DEPARTMENT_HEAD",
  "department head": "DEPARTMENT_HEAD",
  "department_head": "DEPARTMENT_HEAD",
  "bao tri": "MAINTENANCE",
  "bảo trì": "MAINTENANCE",
  "ktv bao tri": "MAINTENANCE",
  "kỹ thuật bảo trì": "MAINTENANCE",
  "maintenance": "MAINTENANCE",
  "giam doc": "DIRECTOR",
  "giám đốc": "DIRECTOR",
  "director": "DIRECTOR",
  "admin": "ADMIN",
  "quan tri": "ADMIN",
  "quản trị": "ADMIN",
};

function normalizeRole(raw: string): ParsedEmployee["role"] {
  if (!raw) return "OPERATOR";
  const clean = raw.trim().toLowerCase();
  for (const [key, val] of Object.entries(ROLE_MAPPING)) {
    if (clean === key || clean.includes(key)) {
      return val;
    }
  }
  return "OPERATOR";
}

// Fallback smart parser for CSV, TSV, JSON, and delimited lines
function smartFallbackParser(rawContent: string): ParsedEmployee[] {
  const lines = rawContent
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !l.startsWith("#"));

  const results: ParsedEmployee[] = [];

  for (const line of lines) {
    let parts: string[] = [];
    if (line.includes("\t")) {
      parts = line.split("\t").map((p) => p.trim());
    } else if (line.includes(",")) {
      parts = line.split(",").map((p) => p.trim().replace(/^["']|["']$/g, ""));
    } else if (line.includes(";")) {
      parts = line.split(";").map((p) => p.trim());
    } else if (line.includes(" - ")) {
      parts = line.split(" - ").map((p) => p.trim());
    } else if (line.includes("|")) {
      parts = line.split("|").map((p) => p.trim());
    }

    if (parts.length >= 2) {
      const first = parts[0].toLowerCase();
      if (first.includes("mã") || first.includes("code") || first.includes("stt")) {
        continue;
      }

      const code = parts[0];
      const name = parts[1] || code;
      const roleRaw = parts[2] || "OPERATOR";
      const area = parts[3] || "Xưởng A";
      const dept = parts[4] || null;
      const phone = parts[5] || null;

      results.push({
        employeeCode: code.toUpperCase(),
        name,
        role: normalizeRole(roleRaw),
        areaName: area,
        departmentName: dept,
        departmentCode: dept ? dept.replace(/[^a-zA-Z0-9]/g, "").slice(0, 10).toUpperCase() : null,
        phone: phone ? phone.replace(/\D/g, "") : null,
        factoryCode: "KG1",
        factoryName: "TBS Kiên Giang 1",
      });
    }
  }

  return results;
}

export async function POST(req: Request) {
  const { response } = await requireAdmin();
  if (response) return response;
  const prisma = await getPrisma();

  const body = await req.json().catch(() => ({}));
  const { action, content, employees } = body;

  // ─── ACTION 1: PARSE (Phân tích file / văn bản bằng AI) ───────────────────
  if (action === "parse") {
    if (!content || typeof content !== "string" || !content.trim()) {
      return NextResponse.json({ error: "Nội dung trống. Vui lòng tải file hoặc nhập văn bản danh sách nhân sự." }, { status: 400 });
    }

    let parsedEmployees: ParsedEmployee[] = [];
    const apiKey = process.env.GROQ_API_KEY;

    if (apiKey) {
      const prompt = `Bạn là trợ lý AI quản trị nhân sự cho nhà máy sản xuất TBS Group.
Nhiệm vụ của bạn là đọc và phân tích toàn bộ văn bản/file danh sách nhân sự bên dưới và trích xuất thành danh sách JSON chuẩn.

Các vai trò hợp lệ trong hệ thống (role):
- "OPERATOR" (Nhân viên vận hành / Công nhân)
- "QA" (QA / Kiểm tra chất lượng)
- "LINE_LEADER" (Trưởng line / Tổ trưởng)
- "TECHNOLOGY" (Kỹ thuật / Công nghệ)
- "DEPARTMENT_HEAD" (Trưởng phòng ban)
- "MAINTENANCE" (Bảo trì / Kỹ thuật viên bảo trì)
- "DIRECTOR" (Giám đốc / Ban giám đốc)
- "ADMIN" (Quản trị viên hệ thống)

VĂN BẢN DANH SÁCH NHÂN SỰ ĐẦU VÀO:
"""
${content.slice(0, 15000)}
"""

Hãy trích xuất và trả về CHỈ MỘT MẢNG JSON HỢP LỆ theo cấu trúc:
[
  {
    "employeeCode": "NV001",
    "name": "Nguyễn Văn A",
    "role": "OPERATOR",
    "phone": "0912345678",
    "areaName": "Xưởng A",
    "departmentName": "Phòng Cơ điện",
    "departmentCode": "CD",
    "factoryCode": "KG1",
    "factoryName": "TBS Kiên Giang 1"
  }
]
Không thêm bất kỳ văn bản giải thích nào ngoài JSON.`;

      try {
        const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: "llama-3.3-70b-versatile",
            messages: [{ role: "user", content: prompt }],
            temperature: 0.2,
          }),
        });

        if (groqRes.ok) {
          const aiData = await groqRes.json();
          const aiText = aiData.choices?.[0]?.message?.content || "";
          const cleanJson = aiText.replace(/```json|```/g, "").trim();
          parsedEmployees = JSON.parse(cleanJson);
        }
      } catch (err) {
        console.error("AI parse failed, using smart fallback parser", err);
      }
    }

    if (!parsedEmployees || parsedEmployees.length === 0) {
      parsedEmployees = smartFallbackParser(content);
    }

    if (parsedEmployees.length === 0) {
      return NextResponse.json(
        {
          error: "Không nhận diện được danh sách nhân sự. Vui lòng kiểm tra lại định dạng file (CSV, Excel text, hoặc bảng danh sách).",
        },
        { status: 422 }
      );
    }

    const existingCodes = new Set(
      (await prisma.user.findMany({ select: { employeeCode: true } })).map((u) => u.employeeCode.toUpperCase())
    );

    const enriched = parsedEmployees.map((emp) => ({
      ...emp,
      employeeCode: emp.employeeCode.toUpperCase().trim(),
      role: normalizeRole(emp.role),
      status: existingCodes.has(emp.employeeCode.toUpperCase().trim()) ? ("UPDATE" as const) : ("NEW" as const),
    }));

    return NextResponse.json({
      success: true,
      count: enriched.length,
      employees: enriched,
    });
  }

  // ─── ACTION 2: COMMIT (Lưu danh sách đã xác nhận vào DB) ───────────────────
  if (action === "commit") {
    const list: ParsedEmployee[] = Array.isArray(employees) ? employees : [];
    if (list.length === 0) {
      return NextResponse.json({ error: "Không có danh sách nhân sự để lưu." }, { status: 400 });
    }

    const defaultPasswordHash = await bcrypt.hash("123456", 10);
    let createdCount = 0;
    let updatedCount = 0;

    const defaultFactory = await prisma.factory.upsert({
      where: { code: "KG1" },
      update: {},
      create: {
        code: "KG1",
        name: "Nhà máy TBS Kiên Giang 1",
        address: "Khu công nghiệp Thạnh Lộc, Châu Thành, Kiên Giang",
      },
    });

    for (const item of list) {
      const code = item.employeeCode.toUpperCase().trim();
      if (!code) continue;

      // 1. Resolve Factory
      let factoryId = defaultFactory.id;
      if (item.factoryCode && item.factoryCode !== "KG1") {
        const factory = await prisma.factory.upsert({
          where: { code: item.factoryCode.trim().toUpperCase() },
          update: { name: item.factoryName || item.factoryCode },
          create: {
            code: item.factoryCode.trim().toUpperCase(),
            name: item.factoryName || `Nhà máy ${item.factoryCode}`,
          },
        });
        factoryId = factory.id;
      }

      // 2. Resolve Area (Category type AREA)
      let areaId: string | null = null;
      if (item.areaName && item.areaName.trim()) {
        const areaName = item.areaName.trim();
        const area = await prisma.category.findFirst({
          where: { type: "AREA", name: areaName },
        });
        if (area) {
          areaId = area.id;
        } else {
          const newArea = await prisma.category.create({
            data: {
              type: "AREA",
              name: areaName,
              factoryId,
            },
          });
          areaId = newArea.id;
        }
      }

      // 3. Resolve Department if provided
      let departmentId: string | null = null;
      if (item.departmentName && item.departmentName.trim()) {
        const deptName = item.departmentName.trim();
        const deptCode = (item.departmentCode || deptName.replace(/[^a-zA-Z0-9]/g, "").slice(0, 10)).toUpperCase() || "DEPT";

        const dept = await prisma.department.findFirst({
          where: { name: deptName, factoryId },
        });
        if (dept) {
          departmentId = dept.id;
        } else {
          const newDept = await prisma.department.create({
            data: {
              factoryId,
              code: deptCode,
              name: deptName,
            },
          });
          departmentId = newDept.id;
        }
      }

      // 4. Upsert User
      const existingUser = await prisma.user.findUnique({
        where: { employeeCode: code },
      });

      let userId: string;

      if (existingUser) {
        const updated = await prisma.user.update({
          where: { id: existingUser.id },
          data: {
            name: item.name.trim(),
            role: item.role,
            phone: item.phone ? item.phone.trim() : existingUser.phone,
            areaId: areaId || existingUser.areaId,
            factoryId,
          },
        });
        userId = updated.id;
        updatedCount++;
      } else {
        const created = await prisma.user.create({
          data: {
            employeeCode: code,
            name: item.name.trim(),
            role: item.role,
            phone: item.phone ? item.phone.trim() : null,
            passwordHash: defaultPasswordHash,
            areaId,
            factoryId,
          },
        });
        userId = created.id;
        createdCount++;
      }

      // 5. Connect Department Member
      if (departmentId) {
        const isHead = item.role === "DEPARTMENT_HEAD";
        const existingMember = await prisma.departmentMember.findUnique({
          where: {
            departmentId_userId: {
              departmentId,
              userId,
            },
          },
        });

        if (!existingMember) {
          await prisma.departmentMember.create({
            data: {
              departmentId,
              userId,
              isHead,
            },
          });
        } else if (existingMember.isHead !== isHead) {
          await prisma.departmentMember.update({
            where: { id: existingMember.id },
            data: { isHead },
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Đã nhập dữ liệu thành công: Tạo mới ${createdCount} nhân sự, Cập nhật ${updatedCount} nhân sự.`,
      createdCount,
      updatedCount,
      totalCount: createdCount + updatedCount,
    });
  }

  return NextResponse.json({ error: "Hành động không hợp lệ" }, { status: 400 });
}
