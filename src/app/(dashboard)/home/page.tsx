import Link from "next/link";
import { eq } from "drizzle-orm";
import { ensureOrganizationOnboardingRow } from "@/app/actions/ai-org";
import { HomeCopilot } from "@/components/home-copilot";
import { CatalogGroupedTiles } from "@/components/catalog-grouped-tiles";
import { db } from "@/db";
import { organizationOnboarding } from "@/db/schema";
import { fetchOrgCatalogTiles } from "@/server/org-catalog";
import { getRecentUserTickets } from "@/server/recent-tickets";
import { requireSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const session = await requireSession();
  const orgId = session.user.organizationId;
  const role = session.user.role;
  const isAdmin = role === "admin";

  const catalog = orgId
    ? await fetchOrgCatalogTiles(orgId)
    : [];

  let onboardingIncomplete = false;
  let recentForCopilot: {
    kind: "request" | "change";
    id: string;
    title: string;
    status: string;
  }[] = [];

  if (orgId) {
    await ensureOrganizationOnboardingRow(orgId);
    const [onb] = await db
      .select({ wizardCompletedAt: organizationOnboarding.wizardCompletedAt })
      .from(organizationOnboarding)
      .where(eq(organizationOnboarding.organizationId, orgId))
      .limit(1);
    onboardingIncomplete = isAdmin && !onb?.wizardCompletedAt;

    const recent = await getRecentUserTickets(session.user.id, orgId, 3);
    recentForCopilot = recent.map((t) => ({
      kind: t.kind,
      id: t.id,
      title: t.title,
      status: t.status,
    }));
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Home</h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Welcome back, {session.user.name}. Browse by category below—each tile
          opens the right request form.
        </p>
      </div>

      {isAdmin && (
        <div className="rounded-lg border border-violet-200 bg-violet-50/80 px-4 py-3 text-sm text-violet-900 dark:border-violet-900/60 dark:bg-violet-950/30 dark:text-violet-200">
          <p className="font-medium">Seeing extra admin links?</p>
          <p className="mt-1 text-violet-800/90 dark:text-violet-300/90">
            That’s normal for an admin. To preview a regular user’s layout,
            sign in with a non-admin account—or a private window.
          </p>
        </div>
      )}

      {!orgId ? (
        <p className="text-red-600">Your account has no organization.</p>
      ) : (
        <>
          {onboardingIncomplete && (
            <div className="rounded-lg border border-amber-200 bg-amber-50/90 px-4 py-3 text-sm text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100">
              <p className="font-medium">Finish organization setup</p>
              <p className="mt-1 text-amber-900/90 dark:text-amber-200/90">
                Run the guided wizard to connect AI, seed your catalog, and
                invite your team.
              </p>
              <Link
                href="/onboarding"
                className="mt-2 inline-block font-medium text-amber-950 underline dark:text-amber-50"
              >
                Open onboarding
              </Link>
            </div>
          )}

          {catalog.length === 0 && isAdmin && (
            <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm dark:border-zinc-700 dark:bg-zinc-900/50">
              <p className="font-medium text-zinc-800 dark:text-zinc-100">
                No catalog yet
              </p>
              <p className="mt-1 text-zinc-600 dark:text-zinc-400">
                Use{" "}
                <Link href="/onboarding" className="underline">
                  onboarding
                </Link>{" "}
                to generate types with AI or apply a template, or add types in{" "}
                <Link href="/admin/types" className="underline">
                  Admin → Catalog
                </Link>
                .
              </p>
            </div>
          )}

          <section aria-label="Service catalog by category">
            <h2 className="sr-only">Service catalog by category</h2>
            <CatalogGroupedTiles catalog={catalog} />
          </section>

          <div className="flex flex-wrap gap-3 border-t border-zinc-200 pt-6 dark:border-zinc-800">
            <Link
              href="/requests"
              className="rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-900 shadow-sm transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800/80"
            >
              All my requests
            </Link>
            <Link
              href="/requests/new"
              className="rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-900 shadow-sm transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800/80"
            >
              New request (pick in form)
            </Link>
          </div>

          <HomeCopilot
            recentTickets={recentForCopilot}
            onboardingIncomplete={onboardingIncomplete}
          />
        </>
      )}
    </div>
  );
}
