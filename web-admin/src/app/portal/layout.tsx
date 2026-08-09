import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import PortalShell from "./portal-shell";
import { UserPublic } from "@/lib/portal-client";

export const metadata = {
  title: "TBS Portal — Hệ thống Quản lý Sự cố Chất lượng",
  description: "Cổng thông tin và xử lý sự cố chất lượng 5M+1E theo luồng nghiệp vụ TBS Group",
};

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const sessionUser = session.user as {
    id: string;
    employeeCode: string;
    name: string;
    role: UserPublic["role"];
    areaId?: string | null;
    areaName?: string | null;
  };


  const user: UserPublic = {
    id: sessionUser.id,
    employeeCode: sessionUser.employeeCode,
    name: sessionUser.name,
    role: sessionUser.role,
    areaId: sessionUser.areaId,
    area: sessionUser.areaName ? { id: sessionUser.areaId || "", type: "AREA", name: sessionUser.areaName } : null,
  };

  return <PortalShell user={user}>{children}</PortalShell>;
}
