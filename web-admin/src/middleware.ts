import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";
import { NextResponse } from "next/server";

const { auth } = NextAuth(authConfig);

function withCors(res: NextResponse, req: Request) {
  const origin = req.headers.get("origin");
  res.headers.set("Access-Control-Allow-Origin", origin || "*");
  res.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.headers.set("Vary", "Origin");
  return res;
}

export default auth((req) => {
  const { pathname } = req.nextUrl;

  if (pathname.startsWith("/api/mobile")) {
    if (req.method === "OPTIONS") {
      return withCors(new NextResponse(null, { status: 204 }), req);
    }
    return withCors(NextResponse.next(), req);
  }

  const userRole = (req.auth?.user as { role?: string } | undefined)?.role;

  if (pathname === "/login") {
    if (req.auth) {
      const redirectTarget = userRole === "ADMIN" ? "/admin" : "/portal";
      return NextResponse.redirect(new URL(redirectTarget, req.nextUrl.origin));
    }
    return NextResponse.next();
  }

  const isAdminRoute = pathname.startsWith("/admin");
  if (isAdminRoute) {
    if (!req.auth) {
      const loginUrl = new URL("/login", req.nextUrl.origin);
      return NextResponse.redirect(loginUrl);
    }
    if (userRole !== "ADMIN") {
      return NextResponse.redirect(new URL("/portal", req.nextUrl.origin));
    }
    return NextResponse.next();
  }

  const isPortalRoute = pathname.startsWith("/portal");
  if (isPortalRoute) {
    if (!req.auth) {
      const loginUrl = new URL("/login", req.nextUrl.origin);
      return NextResponse.redirect(loginUrl);
    }
    return NextResponse.next();
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/admin/:path*", "/portal/:path*", "/login", "/api/mobile/:path*"],
};

