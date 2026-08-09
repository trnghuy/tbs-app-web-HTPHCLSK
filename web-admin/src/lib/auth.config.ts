import type { NextAuthConfig } from "next-auth";

export const authConfig = {
  trustHost: true,
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.role = (user as { role?: string }).role;
        token.employeeCode = (user as { employeeCode?: string }).employeeCode;
        token.id = user.id;
        token.name = user.name;
        token.areaId = (user as { areaId?: string | null }).areaId;
        token.areaName = (user as { areaName?: string | null }).areaName;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        const userObj = session.user as unknown as Record<string, unknown>;
        userObj.id = token.id as string;
        userObj.role = token.role as string;
        userObj.employeeCode = token.employeeCode as string;
        userObj.name = token.name as string;
        userObj.areaId = (token.areaId as string) || null;
        userObj.areaName = (token.areaName as string) || null;
      }
      return session;
    },

  },
} satisfies NextAuthConfig;

