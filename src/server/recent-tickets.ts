import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  changeTicket,
  changeTemplate,
  request as requestTable,
  requestType,
} from "@/db/schema";

export type RecentTicketRow =
  | {
      kind: "request";
      id: string;
      title: string;
      subtitle: string;
      status: string;
      updatedAt: Date;
    }
  | {
      kind: "change";
      id: string;
      title: string;
      subtitle: string;
      status: string;
      updatedAt: Date;
    };

/** Last few requests + change tickets by requester, merged by updatedAt. */
export async function getRecentUserTickets(
  userId: string,
  organizationId: string,
  limit = 3,
): Promise<RecentTicketRow[]> {
  const reqRows = await db
    .select({
      id: requestTable.id,
      status: requestTable.status,
      typeTitle: requestType.title,
      updatedAt: requestTable.updatedAt,
    })
    .from(requestTable)
    .innerJoin(requestType, eq(requestTable.requestTypeId, requestType.id))
    .where(
      and(
        eq(requestTable.requesterId, userId),
        eq(requestTable.organizationId, organizationId),
      ),
    )
    .orderBy(desc(requestTable.updatedAt))
    .limit(2);

  const chRows = await db
    .select({
      id: changeTicket.id,
      title: changeTicket.title,
      stage: changeTicket.stage,
      templateTitle: changeTemplate.title,
      updatedAt: changeTicket.updatedAt,
    })
    .from(changeTicket)
    .innerJoin(
      changeTemplate,
      eq(changeTicket.changeTemplateId, changeTemplate.id),
    )
    .where(
      and(
        eq(changeTicket.requesterId, userId),
        eq(changeTicket.organizationId, organizationId),
      ),
    )
    .orderBy(desc(changeTicket.updatedAt))
    .limit(2);

  const merged: RecentTicketRow[] = [
    ...reqRows.map((r) => ({
      kind: "request" as const,
      id: r.id,
      title: r.typeTitle,
      subtitle: "Access request",
      status: r.status,
      updatedAt: r.updatedAt!,
    })),
    ...chRows.map((r) => ({
      kind: "change" as const,
      id: r.id,
      title: r.title,
      subtitle: r.templateTitle,
      status: r.stage,
      updatedAt: r.updatedAt!,
    })),
  ];

  merged.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  return merged.slice(0, limit);
}
