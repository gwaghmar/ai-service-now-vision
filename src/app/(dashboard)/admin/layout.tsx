import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { requireSession } from "@/lib/session";

export default async function AdminSectionLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  const session = await requireSession();
  const role = (session.user as { role?: string }).role ?? "requester";
  if (role !== "admin") {
    redirect("/");
  }
  return children;
}
