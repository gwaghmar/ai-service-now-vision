import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { approvalEmailNonce, request as requestTable } from "@/db/schema";
import { verifyEmailApprovalToken } from "@/lib/approval-email-token";
import { applyRequestDecision } from "@/server/request-decision";

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const token =
    typeof body === "object" &&
    body !== null &&
    "token" in body &&
    typeof (body as { token: unknown }).token === "string"
      ? (body as { token: string }).token
      : null;

  if (!token) {
    return NextResponse.json({ error: "Missing token" }, { status: 400 });
  }

  const verified = verifyEmailApprovalToken(token);
  if (!verified.ok) {
    return NextResponse.json({ error: verified.error }, { status: 400 });
  }

  const { jti, requestId, approverUserId, action } = verified.payload;

  try {
    await db.insert(approvalEmailNonce).values({ jti });
  } catch {
    return NextResponse.json(
      { error: "This link was already used." },
      { status: 409 },
    );
  }

  try {
    const [row] = await db
      .select()
      .from(requestTable)
      .where(eq(requestTable.id, requestId))
      .limit(1);

    if (!row) {
      throw new Error("Request not found.");
    }

    await applyRequestDecision({
      organizationId: row.organizationId,
      requestId,
      decision: action === "approve" ? "approved" : "denied",
      actorUserId: approverUserId,
      actorRole: "approver",
    });
  } catch (e) {
    await db.delete(approvalEmailNonce).where(eq(approvalEmailNonce.jti, jti));
    const message = e instanceof Error ? e.message : "Decision failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  await db
    .update(approvalEmailNonce)
    .set({ consumedAt: new Date() })
    .where(eq(approvalEmailNonce.jti, jti));

  revalidatePath("/");
  revalidatePath("/requests");
  revalidatePath("/approvals");
  revalidatePath(`/requests/${requestId}`);

  return NextResponse.json({
    ok: true as const,
    decision: action === "approve" ? "approved" : "denied",
  });
}
