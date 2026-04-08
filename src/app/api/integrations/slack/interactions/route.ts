import { NextResponse } from "next/server";
import { verifySlackRequestSignature } from "@/lib/slack-signature";

/**
 * Slack Block Kit interactivity entrypoint.
 * Verifies signing secret; business logic (Block actions → governance) is still a stub.
 */
export async function POST(req: Request) {
  const secret = process.env.SLACK_SIGNING_SECRET?.trim();
  if (!secret) {
    return NextResponse.json(
      {
        error: "SLACK_SIGNING_SECRET is not configured",
        code: "disabled",
      },
      { status: 503 },
    );
  }

  const rawBody = await req.text();
  const timestamp = req.headers.get("x-slack-request-timestamp");
  const slackSignature = req.headers.get("x-slack-signature");
  if (
    !timestamp ||
    !slackSignature ||
    !verifySlackRequestSignature(
      secret,
      rawBody,
      timestamp,
      slackSignature,
    )
  ) {
    return NextResponse.json(
      { error: "Invalid or missing Slack signature", code: "unauthorized" },
      { status: 401 },
    );
  }

  return NextResponse.json(
    {
      error:
        "Slack interactivity is not implemented beyond signature verification. Subscribe to the governance webhook event request.submitted and post Block Kit from your own worker, or use Power Automate — see docs/INTEGRATIONS.md.",
      code: "not_implemented",
    },
    { status: 501 },
  );
}
