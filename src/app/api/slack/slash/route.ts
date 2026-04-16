import { createHmac, timingSafeEqual } from "node:crypto";
import { db } from "@/db";
import { requestType } from "@/db/schema";
import { eq } from "drizzle-orm";
import { resolveOrgForSlackTeamId } from "@/server/tenant-resolution";
import { getPublicAppUrl } from "@/lib/env";

export const runtime = "nodejs";

const MAX_SKEW_SEC = 5 * 60;

function verifySlackSignature(
  secret: string,
  body: string,
  ts: string,
  sig: string,
): boolean {
  const nowSec = Math.floor(Date.now() / 1000);
  if (Math.abs(nowSec - Number(ts)) > MAX_SKEW_SEC) return false;
  const base = `v0:${ts}:${body}`;
  const digest = `v0=${createHmac("sha256", secret).update(base, "utf8").digest("hex")}`;
  try {
    const a = Buffer.from(sig, "utf8");
    const b = Buffer.from(digest, "utf8");
    return a.length === b.length && timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

/**
 * Slack slash command handler for `/request`.
 * Responds with an ephemeral message listing available request types and a
 * deep-link button to open the new-request form.
 */
export async function POST(req: Request) {
  const slackSecret = process.env.SLACK_SIGNING_SECRET;
  const rawBody = await req.text();
  const ts = req.headers.get("x-slack-request-timestamp") ?? "";
  const sig = req.headers.get("x-slack-signature") ?? "";

  if (!slackSecret || !verifySlackSignature(slackSecret, rawBody, ts, sig)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const params = new URLSearchParams(rawBody);
  const text = (params.get("text") ?? "").trim();
  const teamId = params.get("team_id") ?? "";

  // Canonical tenant resolution — fail-closed before any org-scoped reads.
  const orgResult = await resolveOrgForSlackTeamId(teamId);
  if (!orgResult.ok) {
    return Response.json(
      { error: orgResult.message, code: orgResult.code },
      { status: orgResult.httpStatus },
    );
  }
  const org = { id: orgResult.organizationId, name: orgResult.name };

  const base = getPublicAppUrl().replace(/\/$/, "");

  // If subcommand is empty or "help", list request types
  if (!text || text === "help") {
    const types = await db
      .select({ slug: requestType.slug, title: requestType.title, description: requestType.description })
      .from(requestType)
      .where(eq(requestType.organizationId, org.id))
      .limit(10);

    if (types.length === 0) {
      return slackText("No request types configured yet. Ask your admin to set up the catalog.");
    }

    const blocks = [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*Available request types in ${org.name}:*`,
        },
      },
      ...types.map((t) => ({
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*${t.title}*${t.description ? `\n${t.description}` : ""}`,
        },
        accessory: {
          type: "button",
          text: { type: "plain_text", text: "Open form ↗" },
          url: `${base}/requests/new?typeId=${t.slug}`,
          action_id: `open_request_${t.slug}`,
        },
      })),
      {
        type: "context",
        elements: [
          {
            type: "mrkdwn",
            text: `Use \`/request <type-slug>\` to get a direct link. E.g. \`/request ${types[0]?.slug ?? "access-request"}\``,
          },
        ],
      },
    ];

    return Response.json({ response_type: "ephemeral", blocks });
  }

  // Specific type lookup by slug or partial title
  const [type] = await db
    .select({ id: requestType.id, slug: requestType.slug, title: requestType.title })
    .from(requestType)
    .where(eq(requestType.organizationId, org.id))
    .limit(20);

  const matched = (
    await db
      .select({ id: requestType.id, slug: requestType.slug, title: requestType.title })
      .from(requestType)
      .where(eq(requestType.organizationId, org.id))
  ).find(
    (t) =>
      t.slug === text ||
      t.title.toLowerCase().includes(text.toLowerCase()),
  );

  if (!matched) {
    return slackText(
      `No request type matching "*${text}*". Use \`/request help\` to see all types.`,
    );
  }

  const url = `${base}/requests/new?typeId=${matched.id}`;
  return Response.json({
    response_type: "ephemeral",
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `Submit a *${matched.title}* request:`,
        },
        accessory: {
          type: "button",
          text: { type: "plain_text", text: "Open form ↗" },
          url,
          action_id: "open_request_form",
        },
      },
    ],
  });
}

function slackText(text: string) {
  return Response.json({ response_type: "ephemeral", text });
}
