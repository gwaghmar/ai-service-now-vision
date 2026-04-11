import { eq } from "drizzle-orm";
import { db } from "@/db";
import { organization } from "@/db/schema";
import { requireRole } from "@/lib/session";
import { getStripe } from "@/lib/stripe";
import { getPublicAppUrl } from "@/lib/env";

export const runtime = "nodejs";

export async function POST(req: Request) {
  await requireRole(["admin"]);
  const body = await req.formData();
  const orgId = body.get("orgId") as string;
  if (!orgId) {
    return Response.json({ error: "Missing orgId" }, { status: 400 });
  }

  const [org] = await db
    .select({ stripeCustomerId: organization.stripeCustomerId })
    .from(organization)
    .where(eq(organization.id, orgId))
    .limit(1);

  if (!org?.stripeCustomerId) {
    return Response.json({ error: "No billing account found" }, { status: 404 });
  }

  const base = getPublicAppUrl().replace(/\/$/, "");
  const stripe = getStripe();
  const portal = await stripe.billingPortal.sessions.create({
    customer: org.stripeCustomerId,
    return_url: `${base}/admin/billing`,
  });

  return Response.redirect(portal.url, 303);
}
