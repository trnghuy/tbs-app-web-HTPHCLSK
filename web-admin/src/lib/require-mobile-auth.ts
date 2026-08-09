import { getBearerToken, verifyMobileToken, MobileTokenPayload } from "@/lib/jwt";
import { NextResponse } from "next/server";

export function parseCookies(req: Request): Record<string, string> {
  const cookieHeader = req.headers.get("cookie") || "";
  const list: Record<string, string> = {};
  cookieHeader.split(";").forEach((cookie) => {
    const parts = cookie.split("=");
    const name = parts.shift()?.trim();
    if (name) {
      list[name] = decodeURIComponent(parts.join("=").trim());
    }
  });
  return list;
}

export function requireMobileAuth(
  req: Request,
): { payload: MobileTokenPayload; response: null } | { payload: null; response: NextResponse } {
  let token = getBearerToken(req);
  if (!token) {
    const cookies = parseCookies(req);
    token = cookies["mobile_token"] || cookies["auth_token"] || null;
  }
  const payload = token ? verifyMobileToken(token) : null;

  if (!payload) {
    return {
      payload: null,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  return { payload, response: null };
}

