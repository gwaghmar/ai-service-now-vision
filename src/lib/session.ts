import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

export type AppSession = NonNullable<
  Awaited<ReturnType<typeof auth.api.getSession>>
>;

export async function getSession(): Promise<AppSession | null> {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  return session;
}

export async function requireSession(): Promise<AppSession> {
  const session = await getSession();
  if (!session) redirect("/sign-in");
  return session;
}

export async function requireRole(
  allowed: ("requester" | "approver" | "admin")[],
): Promise<AppSession> {
  const session = await requireSession();
  const role = (session.user as { role?: string }).role ?? "requester";
  if (!allowed.includes(role as "requester" | "approver" | "admin")) {
    redirect("/");
  }
  return session;
}
