import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { getPrisma } from "@/lib/prisma";
import { authConfig } from "@/lib/auth.config";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        employeeCode: { label: "Mã nhân viên", type: "text" },
        password: { label: "Mật khẩu", type: "password" },
      },
      authorize: async (credentials) => {
        const employeeCode = credentials?.employeeCode as string | undefined;
        const password = credentials?.password as string | undefined;
        if (!employeeCode || !password) return null;

        const prisma = await getPrisma();
        const user = await prisma.user.findUnique({
          where: { employeeCode },
          include: { area: true },
        });
        if (!user) return null;

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) return null;

        return {
          id: user.id,
          name: user.name,
          employeeCode: user.employeeCode,
          role: user.role,
          areaId: user.areaId ?? null,
          areaName: user.area?.name ?? null,
        };
      },
    }),
  ],
});

