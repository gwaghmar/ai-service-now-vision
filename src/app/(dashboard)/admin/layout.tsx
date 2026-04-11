import type { ReactNode } from "react";
import { requireRole } from "@/lib/session";

export default async function AdminSectionLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  await requireRole(["admin"]);
  return children;
}
