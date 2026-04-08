import Link from "next/link";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  changeTicket,
  changeTemplate,
  user,
} from "@/db/schema";
import { requireSession } from "@/lib/session";
import {
  STAGE_LABELS,
  isChangeTicketStage,
} from "@/lib/change-ticket-stages";

export const dynamic = "force-dynamic";

type View = "mine" | "assigned" | "all";

function parseView(v: string | undefined): View {
  if (v === "assigned" || v === "all") return v;
  return "mine";
}

export default async function ChangesListPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const session = await requireSession();
  const orgId = session.user.organizationId;
  const uid = session.user.id;
  const role = (session.user as { role?: string }).role ?? "requester";
  const canSeeAll = role === "approver" || role === "admin";

  const { view: viewParam } = await searchParams;
  let view = parseView(viewParam);
  if (view === "all" && !canSeeAll) view = "mine";

  const conditions = [eq(changeTicket.organizationId, orgId ?? "")];
  if (!orgId) {
    return <p className="text-red-600">No organization.</p>;
  }

  if (view === "mine") {
    conditions.push(eq(changeTicket.requesterId, uid));
  } else if (view === "assigned") {
    conditions.push(eq(changeTicket.assignedUserId, uid));
  }

  const rows = await db
    .select({
      ticket: changeTicket,
      templateTitle: changeTemplate.title,
      assigneeEmail: user.email,
    })
    .from(changeTicket)
    .innerJoin(
      changeTemplate,
      eq(changeTicket.changeTemplateId, changeTemplate.id),
    )
    .leftJoin(user, eq(changeTicket.assignedUserId, user.id))
    .where(and(...conditions))
    .orderBy(desc(changeTicket.updatedAt));

  const linkCls =
    "rounded-lg border border-zinc-200 px-3 py-1.5 text-sm font-medium dark:border-zinc-700";
  const activeCls = "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900";
  const idleCls =
    "bg-white text-zinc-700 hover:bg-zinc-50 dark:bg-zinc-900 dark:text-zinc-200";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Change releases</h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Governed pipeline: On deck → Prelim UAT → Final UAT → Prod approval →
          Closed.
        </p>
      </div>

      <div className="flex flex-wrap gap-1.5">
        <Link
          href="/changes?view=mine"
          className={`${linkCls} ${view === "mine" ? activeCls : idleCls}`}
        >
          Mine
        </Link>
        <Link
          href="/changes?view=assigned"
          className={`${linkCls} ${view === "assigned" ? activeCls : idleCls}`}
        >
          Assigned to me
        </Link>
        {canSeeAll && (
          <Link
            href="/changes?view=all"
            className={`${linkCls} ${view === "all" ? activeCls : idleCls}`}
          >
            All
          </Link>
        )}
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-zinc-500">
          No tickets in this view.{" "}
          <Link href="/changes/new" className="font-medium underline">
            New change
          </Link>
        </p>
      ) : (
        <ul className="divide-y divide-zinc-200 rounded-xl border border-zinc-200 bg-white dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-900">
          {rows.map(({ ticket, templateTitle, assigneeEmail }) => {
            const stageLabel = isChangeTicketStage(ticket.stage)
              ? STAGE_LABELS[ticket.stage]
              : ticket.stage;
            return (
              <li key={ticket.id}>
                <Link
                  href={`/changes/${ticket.id}`}
                  className="block px-4 py-2.5 transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/80"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs dark:bg-zinc-800">
                      {stageLabel}
                    </span>
                    <span className="font-medium text-zinc-900 dark:text-zinc-100">
                      {ticket.title}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-zinc-500">
                    {templateTitle}
                    {assigneeEmail ? ` · Assignee: ${assigneeEmail}` : ""}
                    {ticket.updatedAt
                      ? ` · Updated ${ticket.updatedAt.toISOString().slice(0, 10)}`
                      : ""}
                  </p>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
