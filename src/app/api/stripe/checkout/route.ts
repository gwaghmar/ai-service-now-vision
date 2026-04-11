import { eq } from "drizzle-orm";
import { db } from "@/db";
import { organization } from "@/db/schema";
import { requireRole } from "@/lib/session";
import { getStripe } from "@/lib/stripe";
import { getPublicAppUrl } from "@/lib/env";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const session = await requireRole(["admin"]);
  const orgId = session.user.organizationId!;
  const base = getPublicAppUrl().replace(/\/$/, "");

  const body = await req.formData();
  const priceId = body.get("priceId") as string;
  if (!priceId) {
    return Response.json({ error: "Missing priceId" }, { status: 400 });
  }

  const [org] = await db
    .select({ stripeCustomerId: organization.stripeCustomerId, name: organization.name })
    .from(organization)
    .where(eq(organization.id, orgId))
    .limit(1);

  const stripe = getStripe();
  const sess = await stripe.checkout.sessions.create({
    mode: "subscription",
    payment_method_types: ["card"],
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${base}/admin/billing?success=1`,
    cancel_url: `${base}/admin/billing`,
    metadata: { organizationId: orgId },
    ...(org?.stripeCustomerId ? { customer: org.stripeCustomerId } : {}),
  });

  return Response.redirect(sess.url!, 303);
}
