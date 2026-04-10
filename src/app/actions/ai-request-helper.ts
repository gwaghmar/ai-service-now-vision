"use server";

import { and, eq, isNull } from "drizzle-orm";
import { generateObject } from "ai";
import { z } from "zod";
import { db } from "@/db";
import { requestType } from "@/db/schema";
import { recordAuditEvent } from "@/server/audit";
import {
  getOrgLanguageModel,
  AiNotConfiguredError,
  isTestAiMock,
} from "@/server/ai/client";
import {
  buildPayloadSchema,
  parseFieldSchema,
  type FieldDefinition,
} from "@/lib/request-schemas";
import { requireSession } from "@/lib/session";

function buildSuggestSchema(fields: FieldDefinition[]) {
  const shape: Record<string, z.ZodString> = {};
  for (const f of fields) {
    shape[f.key] = z.string();
  }
  return z.object(shape);
}

export async function suggestRequestPayloadAction(input: {
  requestTypeId: string;
  hint: string;
}): Promise<
  | { ok: true; values: Record<string, string>; usedPlatformFallback: boolean }
  | { ok: false; error: string }
> {
  const hint = input.hint.trim();
  if (hint.length < 3) {
    return { ok: false, error: "Describe your need in a few words or more." };
  }

  const session = await requireSession();
  const orgId = session.user.organizationId;
  if (!orgId) return { ok: false, error: "No organization." };

  const [row] = await db
    .select()
    .from(requestType)
    .where(
      and(
        eq(requestType.id, input.requestTypeId),
        eq(requestType.organizationId, orgId),
        isNull(requestType.archivedAt),
      ),
    )
    .limit(1);

  if (!row) return { ok: false, error: "Request type not found." };

  let schemaJson: ReturnType<typeof parseFieldSchema>;
  try {
    schemaJson = parseFieldSchema(row.fieldSchema);
  } catch {
    return { ok: false, error: "Invalid field schema for this type." };
  }

  const fields = schemaJson.fields;
  if (fields.length === 0) {
    return { ok: false, error: "No fields to fill." };
  }

  if (isTestAiMock()) {
    const values: Record<string, string> = {};
    for (const f of fields) {
      values[f.key] =
        f.type === "textarea"
          ? `(Test suggestion) ${hint.slice(0, 200)}`
          : hint.slice(0, 80) || "—";
    }
    return { ok: true, values, usedPlatformFallback: false };
  }

  try {
    const { model, usedPlatformFallback } = await getOrgLanguageModel(orgId);
    const objectSchema = buildSuggestSchema(fields);
    const fieldLines = fields
      .map(
        (f) =>
          `- ${f.key}: ${f.label} (${f.type}${f.required === false ? ", optional" : ", required"})`,
      )
      .join("\n");

    const { object } = await generateObject({
      model,
      schema: objectSchema,
      system: `You suggest values for a governed service request form. Output must use EXACTLY these JSON keys: ${fields.map((f) => f.key).join(", ")}. Values are plain strings. Be concise and realistic from the user's description. For optional fields with no signal, use a short placeholder or "N/A" rather than inventing sensitive data.`,
      prompt: `Request type title: ${row.title}
Description: ${row.description ?? "—"}

Fields:
${fieldLines}

User request (natural language):
${hint}`,
    });

    const parsed = buildPayloadSchema(fields).safeParse(object);
    if (!parsed.success) {
      return {
        ok: false,
        error:
          "Model output did not pass validation — try a clearer description or fill fields manually.",
      };
    }

    await recordAuditEvent({
      organizationId: orgId,
      actorId: session.user.id,
      entityType: "request_type",
      entityId: row.id,
      action: "ai_request_form_suggested",
      metadata: {
        usedPlatformFallback,
        slug: row.slug,
      },
    });

    return {
      ok: true,
      values: parsed.data as Record<string, string>,
      usedPlatformFallback,
    };
  } catch (e) {
    if (e instanceof AiNotConfiguredError) {
      return {
        ok: false,
        error: "AI is not configured. Ask an admin to set Admin → AI.",
      };
    }
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Suggestion failed.",
    };
  }
}
