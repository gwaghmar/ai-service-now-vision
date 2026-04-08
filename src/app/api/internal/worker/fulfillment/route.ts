import { processStaleFulfillmentJobs } from "@/server/fulfillment-queue";

export const runtime = "nodejs";

/**
 * Worker hook for Vercel Cron, k8s CronJob, or systemd timer.
 * `Authorization: Bearer <CRON_SECRET>`
 */
export async function POST(req: Request) {
  const expected = process.env.CRON_SECRET?.trim();
  if (!expected) {
    return Response.json(
      { error: "CRON_SECRET is not configured", code: "disabled" },
      { status: 503 },
    );
  }
  const authz = req.headers.get("authorization");
  if (authz !== `Bearer ${expected}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { processed, errors } = await processStaleFulfillmentJobs(100);
  return Response.json({ ok: true, processed, errors });
}
