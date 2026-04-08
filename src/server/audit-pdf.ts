import { StandardFonts, PDFDocument, rgb } from "pdf-lib";
import { queryAuditExportRows } from "@/server/audit-export";

export type AuditExportRow = Awaited<
  ReturnType<typeof queryAuditExportRows>
>[number];

/** Minimal SOC2-oriented evidence PDF (text lines; extend with branding later). */
export async function buildAuditEvidencePdf(rows: AuditExportRow[]) {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const titleFont = await doc.embedFont(StandardFonts.HelveticaBold);
  let page = doc.addPage([612, 792]);
  let y = 740;
  const left = 48;
  const bodySize = 8;
  const titleSize = 14;

  const draw = (text: string, size: number, bold = false) => {
    const f = bold ? titleFont : font;
    if (y < 56) {
      page = doc.addPage([612, 792]);
      y = 740;
    }
    page.drawText(text.slice(0, 140), {
      x: left,
      y,
      size,
      font: f,
      color: rgb(0.08, 0.08, 0.1),
    });
    y -= size + 3;
  };

  draw("Governance audit evidence pack", titleSize, true);
  draw(`Generated ${new Date().toISOString()} (UTC)`, bodySize);
  y -= 10;
  draw(
    "audit_id | created_at | action | entity | req_status | req_type | requester | change | chg_stage | chg_tpl | assignee",
    bodySize,
    true,
  );
  y -= 4;

  for (const r of rows) {
    const meta =
      r.metadata && typeof r.metadata === "object"
        ? JSON.stringify(r.metadata).slice(0, 400)
        : "";
    const line = [
      r.auditId.slice(0, 8),
      r.createdAt?.toISOString() ?? "",
      r.action,
      `${r.entityType}:${(r.entityId ?? "").slice(0, 8)}`,
      (r.requestStatus ?? "").slice(0, 12),
      (r.requestTypeTitle ?? "").slice(0, 16),
      (r.requesterEmail ?? "").slice(0, 20),
      (r.changeTicketTitle ?? "").slice(0, 14),
      (r.changeTicketStage ?? "").slice(0, 10),
      (r.changeTemplateTitle ?? "").slice(0, 12),
      (r.changeAssigneeEmail ?? "").slice(0, 18),
    ].join(" | ");
    draw(line, bodySize);
    if (meta) draw(`  meta: ${meta}`, 7);
  }

  return doc.save();
}
