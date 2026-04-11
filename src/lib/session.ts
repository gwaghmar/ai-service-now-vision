import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

export type AppRole = "requester" | "approver" | "admin";

export type AppSession = NonNullable<
  Awaited<ReturnType<typeof auth.api.getSession>>
>;

export type TypedSession = AppSession & {
  user: AppSession["user"] & { role: AppRole };
};

export async function getSession(): Promise<AppSession | null> {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  return session;
}

export async function requireSession(): Promise<TypedSession> {
  const session = await getSession();
  if (!session) redirect("/sign-in");
  const role = ((session.user as { role?: string }).role ?? "requester") as AppRole;
  return { ...session, user: { ...session.user, role } };
}

export async function requireRole(
  allowed: AppRole[],
): Promise<TypedSession> {
  const session = await requireSession();
  if (!allowed.includes(session.user.role)) {
    redirect("/");
  }
  return session;
}
