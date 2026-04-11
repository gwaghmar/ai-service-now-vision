import { headers } from "next/headers";
import Stripe from "stripe";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { organization } from "@/db/schema";
import { getStripe } from "@/lib/stripe";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const sig = (await headers()).get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!sig || !webhookSecret) {
    return Response.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  const rawBody = await req.text();
  try {
    event = getStripe().webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch {
    return Response.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        const customerId = sub.customer as string;
        const status = sub.status;
        const priceId = sub.items.data[0]?.price.id ?? null;

        await db
          .update(organization)
          .set({
            stripeCustomerId: customerId,
            stripeSubscriptionId: sub.id,
            stripeSubscriptionStatus: status,
            stripePriceId: priceId,
          })
          .where(eq(organization.stripeCustomerId, customerId));
        break;
      }
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const customerId = sub.customer as string;
        await db
          .update(organization)
          .set({
            stripeSubscriptionId: null,
            stripeSubscriptionStatus: "canceled",
            stripePriceId: null,
          })
          .where(eq(organization.stripeCustomerId, customerId));
        break;
      }
      case "checkout.session.completed": {
        const sess = event.data.object as Stripe.Checkout.Session;
        const customerId = sess.customer as string;
        const orgId = sess.metadata?.organizationId;
        if (orgId) {
          await db
            .update(organization)
            .set({ stripeCustomerId: customerId })
            .where(eq(organization.id, orgId));
        }
        break;
      }
    }
  } catch (err) {
    console.error("[stripe-webhook]", err);
    return Response.json({ error: "Handler failed" }, { status: 500 });
  }

  return Response.json({ received: true });
}
