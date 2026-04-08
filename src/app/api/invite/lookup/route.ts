import { createHash } from "crypto";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { organization, organizationInvite } from "@/db/schema";

function hashInviteToken(raw: string): string {
  return createHash("sha256").update(raw, "utf8").digest("hex");
}

/**
 * Public: resolve invite token to email + org name for sign-up prefill (no auth).
 */
export async function POST(req: Request) {
  let token: string;
  try {
    const b = (await req.json()) as { token?: string };
    token = typeof b.token === "string" ? b.token : "";
  } catch {
    return Response.json({ ok: false }, { status: 400 });
  }
  if (token.length < 8) {
    return Response.json({ ok: false }, { status: 400 });
  }

  let raw: string;
  try {
    raw = Buffer.from(token, "base64url").toString("utf8");
  } catch {
    return Response.json({ ok: false }, { status: 400 });
  }
  const colon = raw.indexOf(":");
  if (colon < 1) {
    return Response.json({ ok: false }, { status: 404 });
  }
  const id = raw.slice(0, colon);
  const tokenHash = hashInviteToken(raw);

  const [inv] = await db
    .select()
    .from(organizationInvite)
    .where(
      and(
        eq(organizationInvite.id, id),
        eq(organizationInvite.tokenHash, tokenHash),
      ),
    )
    .limit(1);

  if (!inv || inv.acceptedAt) {
    return Response.json({ ok: false }, { status: 404 });
  }
  if (new Date(inv.expiresAt) < new Date()) {
    return Response.json({ ok: false, expired: true }, { status: 410 });
  }

  const [org] = await db
    .select({ name: organization.name })
    .from(organization)
    .where(eq(organization.id, inv.organizationId))
    .limit(1);

  return Response.json({
    ok: true,
    email: inv.email,
    orgName: org?.name ?? "Organization",
  });
}
