/**
 * Transactional email via Resend HTTP API, or console fallback in dev.
 */
export async function sendTransactionalEmail(input: {
  organizationId?: string | null;
  to: string;
  subject: string;
  html: string;
  text?: string;
}): Promise<{ ok: boolean; error?: string }> {
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
