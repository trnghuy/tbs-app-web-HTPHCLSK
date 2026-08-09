import jwt from "jsonwebtoken";

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === "production" && process.env.NEXT_PHASE !== "phase-production-build" && process.env.CI) {
      throw new Error("FATAL: JWT_SECRET environment variable is missing in production environment!");
    }
    return "dev-secret-change-me";
  }
  return secret;
}

export function getSecretKey() {
  return getJwtSecret();
}



export type MobileTokenPayload = {
  userId: string;
  employeeCode: string;
  role:
    | "ADMIN"
    | "OPERATOR"
    | "QA"
    | "LINE_LEADER"
    | "TECHNOLOGY"
    | "DEPARTMENT_HEAD"
    | "MAINTENANCE"
    | "DIRECTOR";
  name: string;
};

export function signMobileToken(payload: MobileTokenPayload) {
  return jwt.sign(payload, getJwtSecret(), { expiresIn: "30d" });
}

export function verifyMobileToken(token: string): MobileTokenPayload | null {
  try {
    return jwt.verify(token, getJwtSecret()) as MobileTokenPayload;
  } catch {
    return null;
  }
}


export function getBearerToken(req: Request): string | null {
  const header = req.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) return null;
  return header.slice("Bearer ".length);
}
