import { auth } from "@/lib/auth";
import { signMobileToken, MobileTokenPayload } from "@/lib/jwt";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  }

  const user = session.user as {
    id: string;
    employeeCode: string;
    role: MobileTokenPayload["role"];
    name: string;
    areaId?: string | null;
    areaName?: string | null;
  };

  const token = signMobileToken({
    userId: user.id,
    employeeCode: user.employeeCode,
    role: user.role,
    name: user.name,
  });

  const response = NextResponse.json({
    token,
    user: {
      id: user.id,
      employeeCode: user.employeeCode,
      name: user.name,
      role: user.role,
      areaId: user.areaId || null,
      areaName: user.areaName || null,
    },
  });

  // Set cookie for transparent SSR / fetch requests
  response.cookies.set("mobile_token", token, {
    path: "/",
    httpOnly: false,
    sameSite: "lax",
    maxAge: 30 * 24 * 60 * 60,
  });

  return response;
}
