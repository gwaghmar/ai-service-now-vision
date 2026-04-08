import { count, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/db";
import {
  organization,
  organizationOnboarding,
  requestType,
} from "@/db/schema";
import { requireSession } from "@/lib/session";
import { getOrgAiCredentials } from "@/server/ai/client";
import { listCatalogTemplateOptions } from "@/server/catalog-templates";
import { ensureOrganizationOnboardingRow } from "@/app/actions/ai-org";
import { OnboardingWizard } from "./onboarding-wizard";

export const dynamic = "force-dynamic";

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ force?: string }>;
}) {
  const session = await requireSession();
  const role = (session.user as { role?: string }).role ?? "requester";
  if (role !== "admin") {
    redirect("/");
  }
  const orgId = session.user.organizationId;
  if (!orgId) {
    redirect("/sign-in");
  }

  const sp = await searchParams;
  const force = sp.force === "1";

  await ensureOrganizationOnboardingRow(orgId);
  const [onb] = await db
    .select()
    .from(organizationOnboarding)
    .where(eq(organizationOnboarding.organizationId, orgId))
    .limit(1);

  if (onb?.wizardCompletedAt && !force) {
    redirect("/");
  }

  const [org] = await db
    .select({ name: organization.name })
    .from(organization)
    .where(eq(organization.id, orgId))
    .limit(1);

  const [typeCount] = await db
    .select({ n: count() })
    .from(requestType)
    .where(eq(requestType.organizationId, orgId));

  let aiConfigured = false;
  try {
    await getOrgAiCredentials(orgId);
    aiConfigured = true;
  } catch {
    aiConfigured = false;
  }

  const templateOptions = listCatalogTemplateOptions();

  return (
    <OnboardingWizard
      orgName={org?.name ?? ""}
      aiConfigured={aiConfigured}
      templateOptions={templateOptions}
      existingTypeCount={Number(typeCount?.n ?? 0)}
    />
  );
}
