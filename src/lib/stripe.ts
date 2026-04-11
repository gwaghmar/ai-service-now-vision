import Stripe from "stripe";

/** Lazily initialized Stripe client. Throws if STRIPE_SECRET_KEY is missing. */
let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!_stripe) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error("STRIPE_SECRET_KEY is not set");
    _stripe = new Stripe(key, { apiVersion: "2026-03-25.dahlia" });
  }
  return _stripe;
}

export function isStripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY?.trim());
}

/** Plans available for purchase. */
export const PLANS = {
  starter: {
    name: "Starter",
    requests_per_month: 500,
    price_id: process.env.STRIPE_STARTER_PRICE_ID ?? "",
    price_display: "$49/mo",
    features: [
      "500 requests/mo",
      "5 users",
      "AI triage",
      "Email approvals",
      "Audit trail (CSV)",
    ],
  },
  growth: {
    name: "Growth",
    requests_per_month: 5000,
    price_id: process.env.STRIPE_GROWTH_PRICE_ID ?? "",
    price_display: "$199/mo",
    features: [
      "5,000 requests/mo",
      "Unlimited users",
      "AI auto-approve",
      "BYOK AI",
      "Change control",
      "Webhook delivery",
      "Audit PDF export",
    ],
  },
  enterprise: {
    name: "Enterprise",
    requests_per_month: Infinity,
    price_id: process.env.STRIPE_ENTERPRISE_PRICE_ID ?? "",
    price_display: "Custom",
    features: [
      "Unlimited requests",
      "SSO / OAuth",
      "Slack bot",
      "SLA reporting",
      "Dedicated support",
    ],
  },
} as const;

export type PlanKey = keyof typeof PLANS;
