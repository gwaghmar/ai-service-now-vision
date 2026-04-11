import Link from "next/link";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { organization } from "@/db/schema";
import { requireRole } from "@/lib/session";
import { PLANS, isStripeConfigured, type PlanKey } from "@/lib/stripe";

export default async function BillingPage() {
  const session = await requireRole(["admin"]);
  const orgId = session.user.organizationId!;

  const [org] = await db
    .select({
      name: organization.name,
      stripeCustomerId: organization.stripeCustomerId,
      stripeSubscriptionStatus: organization.stripeSubscriptionStatus,
      stripePriceId: organization.stripePriceId,
    })
    .from(organization)
    .where(eq(organization.id, orgId))
    .limit(1);

  const stripeReady = isStripeConfigured();
  const currentPriceId = org?.stripePriceId;
  const status = org?.stripeSubscriptionStatus;

  function currentPlanKey(): PlanKey | null {
    if (!currentPriceId) return null;
    for (const [key, plan] of Object.entries(PLANS)) {
      if (plan.price_id && plan.price_id === currentPriceId) {
        return key as PlanKey;
      }
    }
    return null;
  }
  const activePlan = currentPlanKey();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Billing</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Manage your subscription and usage limits.
        </p>
      </div>

      {/* Current subscription */}
      {activePlan && status && (
        <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="text-sm font-semibold">Current subscription</h2>
          <div className="mt-3 flex items-center gap-3">
            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">
              {status}
            </span>
            <span className="font-medium">{PLANS[activePlan].name}</span>
            <span className="text-sm text-zinc-500">
              {PLANS[activePlan].price_display}
            </span>
          </div>
          {stripeReady && org?.stripeCustomerId && (
            <form
              action="/api/stripe/portal"
              method="POST"
              className="mt-4"
            >
              <input type="hidden" name="orgId" value={orgId} />
              <button
                type="submit"
                className="rounded-lg border border-zinc-200 px-3 py-1.5 text-sm hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
              >
                Manage subscription →
              </button>
            </form>
          )}
        </div>
      )}

      {/* Plan comparison */}
      <div className="grid gap-4 sm:grid-cols-3">
        {(Object.entries(PLANS) as [PlanKey, (typeof PLANS)[PlanKey]][]).map(
          ([key, plan]) => {
            const isCurrent = key === activePlan;
            return (
              <div
                key={key}
                className={`rounded-xl border p-5 ${
                  isCurrent
                    ? "border-violet-400 bg-violet-50 dark:border-violet-700 dark:bg-violet-950/30"
                    : "border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900"
                }`}
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">{plan.name}</h3>
                  {isCurrent && (
                    <span className="rounded-full bg-violet-100 px-2 py-0.5 text-xs text-violet-700 dark:bg-violet-900/60 dark:text-violet-300">
                      Current
                    </span>
                  )}
                </div>
                <p className="mt-1 text-2xl font-bold tabular-nums">
                  {plan.price_display}
                </p>
                <ul className="mt-4 space-y-1.5 text-sm text-zinc-600 dark:text-zinc-400">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-1.5">
                      <span className="text-emerald-500">✓</span> {f}
                    </li>
                  ))}
                </ul>
                {!isCurrent && stripeReady && plan.price_id && (
                  <form action="/api/stripe/checkout" method="POST" className="mt-4">
                    <input type="hidden" name="orgId" value={orgId} />
                    <input type="hidden" name="priceId" value={plan.price_id} />
                    <button
                      type="submit"
                      className="w-full rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
                    >
                      {activePlan ? "Switch to " : "Start "}
                      {plan.name}
                    </button>
                  </form>
                )}
                {!isCurrent && key === "enterprise" && (
                  <a
                    href="mailto:sales@example.com?subject=Enterprise+inquiry"
                    className="mt-4 block w-full rounded-lg border border-zinc-200 px-3 py-2 text-center text-sm font-medium hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
                  >
                    Contact sales →
                  </a>
                )}
              </div>
            );
          },
        )}
      </div>

      {!stripeReady && (
        <p className="text-sm text-zinc-400">
          Billing is not configured. Set{" "}
          <code className="rounded bg-zinc-100 px-1 dark:bg-zinc-800">
            STRIPE_SECRET_KEY
          </code>{" "}
          and{" "}
          <code className="rounded bg-zinc-100 px-1 dark:bg-zinc-800">
            STRIPE_*_PRICE_ID
          </code>{" "}
          environment variables to enable subscriptions.
        </p>
      )}
    </div>
  );
}
