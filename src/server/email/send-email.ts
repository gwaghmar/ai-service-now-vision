import { eq } from "drizzle-orm";
import { db } from "@/db";
import { organizationEmailSettings } from "@/db/schema";

/**
 * Transactional email via Resend HTTP API, or console fallback in dev.
 * When `organizationId` is set, org-level `organization_email_settings` may
 * select a future provider (Microsoft Graph / Gmail); unimplemented providers
 * fall back to Resend/env with a console warning.
 */
export async function sendTransactionalEmail(input: {
  organizationId?: string | null;
  to: string;
  subject: string;
  html: string;
  text?: string;
}): Promise<{ ok: boolean; error?: string }> {
  if (input.organizationId) {
    const [row] = await db
      .select()
      .from(organizationEmailSettings)
      .where(
        eq(
          organizationEmailSettings.organizationId,
          input.organizationId,
        ),
      )
      .limit(1);
    if (row?.provider === "graph" || row?.provider === "gmail") {
      console.warn(
        `[email] Org ${input.organizationId} uses provider=${row.provider} — not implemented; using Resend/env fallback.`,
      );
    }
  }

  const key = process.env.RESEND_API_KEY?.trim();
  const from =
    process.env.EMAIL_FROM?.trim() || "Governance <onboarding@resend.dev>";

  if (!key) {
    console.info(
      "[email] RESEND_API_KEY not set — would send to",
      input.to,
      input.subject,
    );
    return { ok: true };
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [input.to],
      subject: input.subject,
      html: input.html,
      text: input.text ?? stripHtml(input.html),
    }),
  });

  if (!res.ok) {
    const t = await res.text();
    console.warn("[email] Resend error:", res.status, t);
    return { ok: false, error: t.slice(0, 200) };
  }

  return { ok: true };
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}
