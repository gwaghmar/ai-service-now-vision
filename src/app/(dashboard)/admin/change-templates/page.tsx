import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { changeTemplate } from "@/db/schema";
import { requireSession } from "@/lib/session";
import { ChangeTemplateForm } from "./change-template-form";
import { DeleteChangeTemplateButton } from "./delete-change-template-button";

export default async function AdminChangeTemplatesPage() {
  const session = await requireSession();
  const role = (session.user as { role?: string }).role ?? "requester";
  if (role !== "admin") {
    return <p className="text-red-600">Admin only.</p>;
  }
  const orgId = session.user.organizationId;
  if (!orgId) return <p className="text-red-600">No organization.</p>;

  const templates = await db
    .select()
    .from(changeTemplate)
    .where(eq(changeTemplate.organizationId, orgId))
    .orderBy(desc(changeTemplate.createdAt));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Change templates
        </h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Define structured fields for report changes, ETL updates, and other
          release work. Slug must be unique per org.
        </p>
      </div>

      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
          New template
        </h2>
        <ChangeTemplateForm mode="create" />
      </section>

      <ul className="space-y-6">
        {templates.map((t) => (
          <li
            key={t.id}
            className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <span className="font-medium">{t.title}</span>
                <span className="ml-2 text-xs text-zinc-500">({t.slug})</span>
              </div>
              <DeleteChangeTemplateButton id={t.id} slug={t.slug} />
            </div>
            {t.description && (
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                {t.description}
              </p>
            )}
            <details className="mt-3">
              <summary className="cursor-pointer text-sm font-medium text-zinc-600">
                Edit
              </summary>
              <ChangeTemplateForm
                mode="edit"
                initial={{
                  id: t.id,
                  slug: t.slug,
                  title: t.title,
                  description: t.description,
                  fieldSchema: t.fieldSchema,
                }}
              />
            </details>
          </li>
        ))}
      </ul>
    </div>
  );
}
