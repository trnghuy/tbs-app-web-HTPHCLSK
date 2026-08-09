import bcrypt from "bcryptjs";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

const adapter = new PrismaBetterSqlite3({ url: process.env.DATABASE_URL || "file:./dev.db" });
const prisma = new PrismaClient({ adapter });

async function main() {
  const password = await bcrypt.hash("123456", 10);

  // 1. Seed Factory gốc (Multi-tenant)
  const factoryKG1 = await prisma.factory.upsert({
    where: { code: "KG1" },
    update: {},
    create: {
      code: "KG1",
      name: "Nhà máy TBS Kiên Giang 1",
      address: "Khu Công nghiệp Thạnh Lộc, Châu Thành, Kiên Giang",
    },
  });

  // 2. Seed Departments
  const deptMaintenance = await prisma.department.upsert({
    where: { factoryId_code: { factoryId: factoryKG1.id, code: "DEPT_MAINTENANCE" } },
    update: {},
    create: {
      factoryId: factoryKG1.id,
      code: "DEPT_MAINTENANCE",
      name: "Phòng Cơ Điện - Bảo Trì",
    },
  });

  const deptQA = await prisma.department.upsert({
    where: { factoryId_code: { factoryId: factoryKG1.id, code: "DEPT_QA" } },
    update: {},
    create: {
      factoryId: factoryKG1.id,
      code: "DEPT_QA",
      name: "Phòng Quản Lý Chất Lượng (QA)",
    },
  });

  const deptTech = await prisma.department.upsert({
    where: { factoryId_code: { factoryId: factoryKG1.id, code: "DEPT_TECH" } },
    update: {},
    create: {
      factoryId: factoryKG1.id,
      code: "DEPT_TECH",
      name: "Phòng Công Nghệ Kỹ Thuật",
    },
  });

  // 3. Seed Hierarchy Categories (Xưởng -> Chuyền -> Tổ)
  const areaA = await prisma.category.upsert({
    where: { type_name: { type: "AREA", name: "Xưởng A" } },
    update: { factoryId: factoryKG1.id },
    create: { type: "AREA", name: "Xưởng A", order: 0, factoryId: factoryKG1.id },
  });

  const lineA1 = await prisma.category.upsert({
    where: { type_name: { type: "PRODUCTION_LINE", name: "Chuyền 1" } },
    update: { factoryId: factoryKG1.id, parentAreaId: areaA.id },
    create: { type: "PRODUCTION_LINE", name: "Chuyền 1", order: 0, factoryId: factoryKG1.id, parentAreaId: areaA.id },
  });

  const teamA1 = await prisma.category.upsert({
    where: { type_name: { type: "TEAM", name: "Tổ 1" } },
    update: { factoryId: factoryKG1.id, parentAreaId: areaA.id, parentLineId: lineA1.id },
    create: { type: "TEAM", name: "Tổ 1", order: 0, factoryId: factoryKG1.id, parentAreaId: areaA.id, parentLineId: lineA1.id },
  });

  // 4. Seed Failure & Part Categories
  await prisma.issueFailureCategory.upsert({
    where: { id: "fail-may" },
    update: {},
    create: { id: "fail-may", name: "Lỗi máy móc", order: 0 },
  });
  await prisma.issueFailureCategory.upsert({
    where: { id: "fail-nvl" },
    update: {},
    create: { id: "fail-nvl", name: "Lỗi nguyên vật liệu", order: 1 },
  });
  await prisma.issueFailureCategory.upsert({
    where: { id: "fail-thao-tac" },
    update: {},
    create: { id: "fail-thao-tac", name: "Lỗi thao tác", order: 2 },
  });

  await prisma.partCategory.upsert({
    where: { id: "part-vong-bi" },
    update: {},
    create: { id: "part-vong-bi", name: "Vòng bi", order: 0 },
  });
  await prisma.partCategory.upsert({
    where: { id: "part-day-curoa" },
    update: {},
    create: { id: "part-day-curoa", name: "Dây curoa", order: 1 },
  });

  // 5. Seed Users
  const users: { code: string; name: string; role: string; phone: string; areaId?: string; factoryId?: string }[] = [
    { code: "ADM001", name: "Quản trị viên", role: "ADMIN", phone: "0900000001", factoryId: factoryKG1.id },
    { code: "NV001", name: "Nguyễn Văn Vận Hành", role: "OPERATOR", phone: "0900000002", areaId: areaA.id, factoryId: factoryKG1.id },
    { code: "QA001", name: "Trần Thị QA", role: "QA", phone: "0900000003", areaId: areaA.id, factoryId: factoryKG1.id },
    { code: "LL001", name: "Lê Văn Trưởng Line", role: "LINE_LEADER", phone: "0900000004", areaId: areaA.id, factoryId: factoryKG1.id },
    { code: "CN001", name: "Phạm Văn Công Nghệ", role: "TECHNOLOGY", phone: "0900000005", areaId: areaA.id, factoryId: factoryKG1.id },
    { code: "TP001", name: "Hoàng Văn Trưởng Phòng", role: "DEPARTMENT_HEAD", phone: "0900000006", areaId: areaA.id, factoryId: factoryKG1.id },
    { code: "BT001", name: "Đỗ Văn Bảo Trì", role: "MAINTENANCE", phone: "0900000007", areaId: areaA.id, factoryId: factoryKG1.id },
    { code: "GD001", name: "Vũ Thị Giám Đốc", role: "DIRECTOR", phone: "0900000008", factoryId: factoryKG1.id },
  ];

  for (const u of users) {
    const createdUser = await prisma.user.upsert({
      where: { employeeCode: u.code },
      update: { factoryId: u.factoryId, areaId: u.areaId },
      create: {
        employeeCode: u.code,
        name: u.name,
        phone: u.phone,
        passwordHash: password,
        role: u.role as never,
        areaId: u.areaId,
        factoryId: u.factoryId,
      },
    });

    // 6. Gán thành viên phòng ban
    if (u.code === "TP001") {
      await prisma.departmentMember.upsert({
        where: { departmentId_userId: { departmentId: deptMaintenance.id, userId: createdUser.id } },
        update: { isHead: true },
        create: { departmentId: deptMaintenance.id, userId: createdUser.id, isHead: true },
      });
    } else if (u.code === "BT001") {
      await prisma.departmentMember.upsert({
        where: { departmentId_userId: { departmentId: deptMaintenance.id, userId: createdUser.id } },
        update: { isHead: false },
        create: { departmentId: deptMaintenance.id, userId: createdUser.id, isHead: false },
      });
    } else if (u.code === "QA001") {
      await prisma.departmentMember.upsert({
        where: { departmentId_userId: { departmentId: deptQA.id, userId: createdUser.id } },
        update: {},
        create: { departmentId: deptQA.id, userId: createdUser.id, isHead: false },
      });
    } else if (u.code === "CN001") {
      await prisma.departmentMember.upsert({
        where: { departmentId_userId: { departmentId: deptTech.id, userId: createdUser.id } },
        update: {},
        create: { departmentId: deptTech.id, userId: createdUser.id, isHead: false },
      });
    }
  }

  console.log("Seed done with Factories, Departments, Audit Logs & Notifications support.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
