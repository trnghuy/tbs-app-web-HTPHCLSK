import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function Home() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }
  const role = (session.user as { role?: string } | undefined)?.role;
  if (role === "ADMIN") {
    redirect("/admin");
  }
  redirect("/portal");
}


